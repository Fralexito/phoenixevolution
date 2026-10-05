// Cloudflare Worker «phoenix-videos»: recibe los videos de la web y los guarda en el bucket R2.
// POR QUÉ EXISTE: la web (JavaScript en el navegador) no puede llevar claves de R2 (cualquiera las vería). El Worker es el portero:
//   1) comprueba con Supabase que quien sube tiene sesión iniciada (no hace falta ningún secreto: usa la clave pública),
//   2) fuerza los límites (tipo, peso, máx. de videos por persona) y la carpeta propia <uid>/,
//   3) escribe en R2 mediante el «binding» VIDEOS (sin claves S3).
// Rutas:  PUT /v/<nombre>  → sube (responde { url })     DELETE /v/<nombre> → borra uno propio (responde { ok })
// Se pega TAL CUAL en el editor del Worker (ver cloudflare/GUIA.md). No tiene dependencias.

const TIPOS = { 'video/mp4': 'mp4', 'video/webm': 'webm', 'video/quicktime': 'mov' };   // mismos tipos que el bucket de Supabase y la web
const NOMBRE = /^[A-Za-z0-9._-]{1,80}$/;
const UID = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/;

const cfg = (env) => ({
  supabaseUrl: String(env.SUPABASE_URL || '').replace(/\/+$/, ''),
  supabaseKey: String(env.SUPABASE_KEY || ''),
  publicBase: String(env.PUBLIC_BASE || '').replace(/\/+$/, ''),                                   // https://pub-xxxx.r2.dev
  origenes: String(env.ALLOWED_ORIGINS || '').split(',').map((s) => s.trim()).filter(Boolean),     // https://fralexito.github.io
  maxBytes: (Number(env.MAX_MB) || 10) * 1024 * 1024,
  maxVideos: Number(env.MAX_VIDEOS) || 3,
});

const json = (obj, status, extra = {}) => new Response(JSON.stringify(obj), { status, headers: { 'Content-Type': 'application/json', ...extra } });

/** Solo responde (CORS) a los orígenes permitidos; si no hay ninguno configurado, no autoriza a nadie (falla cerrado). */
function corsDe(origin, c) {
  if (!origin || !c.origenes.includes(origin)) return null;
  return { 'Access-Control-Allow-Origin': origin, 'Access-Control-Allow-Methods': 'PUT, DELETE, OPTIONS', 'Access-Control-Allow-Headers': 'Authorization, Content-Type', 'Access-Control-Max-Age': '86400', Vary: 'Origin' };
}

/** Pregunta a Supabase quién es el dueño del token. → uuid o null. */
async function usuarioDe(request, c) {
  const auth = request.headers.get('Authorization') ?? '';
  if (!/^Bearer [\w-]+\.[\w-]+\.[\w-]+$/.test(auth)) return null;
  const r = await fetch(`${c.supabaseUrl}/auth/v1/user`, { headers: { apikey: c.supabaseKey, Authorization: auth } });
  if (!r.ok) return null;
  const u = await r.json().catch(() => null);
  return UID.test(u?.id ?? '') ? u.id : null;
}

async function subir(request, env, c, uid, nombre, cors) {
  const tipo = (request.headers.get('Content-Type') ?? '').split(';')[0].trim().toLowerCase();
  const ext = TIPOS[tipo];
  if (!ext || !nombre.toLowerCase().endsWith(`.${ext}`)) return json({ error: 'Usa un video MP4, WebM o MOV.' }, 415, cors);
  const largo = Number(request.headers.get('Content-Length'));
  if (!Number.isInteger(largo) || largo <= 0) return json({ error: 'No pude saber el tamaño del archivo.' }, 411, cors);
  if (largo > c.maxBytes) return json({ error: `El video pesa más de ${Math.round(c.maxBytes / 1048576)} MB.` }, 413, cors);
  const propios = await env.VIDEOS.list({ prefix: `${uid}/`, limit: c.maxVideos + 1 });
  if (propios.objects.length >= c.maxVideos) return json({ error: `Ya tienes ${c.maxVideos} videos subidos. Borra alguno e intenta de nuevo.` }, 409, cors);
  const clave = `${uid}/${nombre}`;
  const res = await env.VIDEOS.put(clave, request.body, {
    httpMetadata: { contentType: tipo, cacheControl: 'public, max-age=31536000, immutable' },
    onlyIf: { etagDoesNotMatch: '*' },                                                              // jamás pisa un archivo existente
  });
  if (!res) return json({ error: 'Ese nombre de archivo ya existe. Intenta de nuevo.' }, 409, cors);
  return json({ url: `${c.publicBase}/${clave}` }, 201, cors);
}

async function manejar(request, env, c, cors) {
  const m = /^\/v\/([^/]+)$/.exec(new URL(request.url).pathname);
  const nombre = m ? decodeURIComponent(m[1]) : '';
  if (!NOMBRE.test(nombre)) return json({ error: 'Ruta no válida.' }, 404, cors);
  if (request.method !== 'PUT' && request.method !== 'DELETE') return json({ error: 'Método no permitido.' }, 405, cors);
  const uid = await usuarioDe(request, c);
  if (!uid) return json({ error: 'Inicia sesión para subir videos.' }, 401, cors);
  if (request.method === 'DELETE') { await env.VIDEOS.delete(`${uid}/${nombre}`); return json({ ok: true }, 200, cors); }   // solo toca SU carpeta: la clave se arma con el uid verificado
  return subir(request, env, c, uid, nombre, cors);
}

export default {
  async fetch(request, env) {
    const c = cfg(env);
    const origin = request.headers.get('Origin');
    const cors = corsDe(origin, c);
    if (request.method === 'OPTIONS') return new Response(null, { status: cors ? 204 : 403, headers: cors ?? {} });
    if (!cors) return json({ error: 'Origen no permitido.' }, 403);
    if (!c.supabaseUrl || !c.supabaseKey || !c.publicBase || !env.VIDEOS) { console.error('[videos] faltan variables o el binding VIDEOS'); return json({ error: 'El servicio de videos no está configurado.' }, 500, cors); }
    try { return await manejar(request, env, c, cors); }
    catch (e) { console.error('[videos] error inesperado:', e?.message ?? e); return json({ error: 'No se pudo completar la operación. Intenta de nuevo.' }, 500, cors); }
  },
};

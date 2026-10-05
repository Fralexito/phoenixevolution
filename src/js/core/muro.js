// Lógica PURA del muro de jugadores (sin DOM ni red → se prueba en tests/pure.test.mjs).
import { escapeHTML, safeUrl } from './dom.js';
import { BANNERS, BANNER_DEFECTO, ACENTOS, ACENTO_DEFECTO, MURO_MAX, LEMA_MAX, RESP_MAX, PALETA_EMOJIS, REACCION_ANTIGUA, SEGMENTOS } from '../../data/muroEstilo.js';

/** Valida el texto de una publicación. → { ok, texto, error }. La BD vuelve a validar: esto solo da el aviso rápido. */
export function validarTexto(t) {
  const texto = String(t ?? '').replace(/\r\n/g, '\n').replace(/\n{3,}/g, '\n\n').trim();
  if (!texto) return { ok: false, texto, error: 'Escribe algo para publicar.' };
  if (texto.length > MURO_MAX) return { ok: false, texto, error: `Máximo ${MURO_MAX} caracteres (llevas ${texto.length}).` };
  return { ok: true, texto, error: '' };
}

/** Texto del usuario → HTML seguro: se escapa TODO primero; después los https:// pasan a enlaces y los saltos de línea a <br>. */
export function textoAHTML(t) {
  return escapeHTML(t).replace(/https:\/\/[^\s<]+/gi, (u) => {
    const limpio = u.replace(/(&quot;|&#39;|[.,;:!?)\]])+$/g, '');   // la puntuación final no es parte del enlace
    const resto = u.slice(limpio.length);
    const url = safeUrl(limpio.replace(/&amp;/g, '&'));
    return url ? `<a href="${escapeHTML(url)}" target="_blank" rel="noopener noreferrer nofollow" class="text-galaxy-400 underline break-all">${limpio}</a>${resto}` : u;
  }).replace(/\n/g, '<br>');
}

/** «hace 5 min», «hace 3 h», «ayer», o la fecha. `now` inyectable para probar. */
export function tiempoRelativo(ts, now = Date.now()) {
  const t = new Date(ts).getTime(); if (!Number.isFinite(t)) return '';
  const s = Math.max(0, Math.round((now - t) / 1000));
  if (s < 45) return 'ahora';
  if (s < 3600) return `hace ${Math.max(1, Math.round(s / 60))} min`;
  if (s < 86400) return `hace ${Math.round(s / 3600)} h`;
  if (s < 172800) return 'ayer';
  if (s < 7 * 86400) return `hace ${Math.round(s / 86400)} días`;
  return new Date(t).toLocaleDateString('es-PE', { day: 'numeric', month: 'short', year: now - t > 300 * 86400000 ? 'numeric' : undefined });
}

/** Estilo guardado (puede venir vacío o con basura) → valores seguros para pintar. */
export function estiloDe(p) {
  const id = /^preset:([a-z0-9-]{1,30})$/.exec(String(p?.muro_banner ?? ''))?.[1];
  const banner = BANNERS.find((b) => b.id === id) ?? BANNERS.find((b) => b.id === BANNER_DEFECTO);
  const acento = /^#[0-9a-fA-F]{6}$/.test(String(p?.muro_acento ?? '')) ? p.muro_acento : ACENTO_DEFECTO;
  const lema = String(p?.muro_lema ?? '').replace(/[<>]/g, '').trim().slice(0, LEMA_MAX);
  const foto = /^https:\/\//i.test(String(p?.muro_banner ?? '')) ? String(p.muro_banner) : '';   // banner subido por la persona (bucket «muro»)
  return { banner, acento, lema, foto };
}

/** Valores del editor → argumentos de la RPC `muro_guardar_estilo`. */
export function estiloParaGuardar({ bannerId, foto, acento, lema }) {
  return {
    p_banner: /^https:\/\//i.test(String(foto ?? '')) ? String(foto) : (BANNERS.some((b) => b.id === bannerId) ? `preset:${bannerId}` : null),   // la foto, si hay, manda sobre el preset
    p_acento: ACENTOS.includes(acento) ? acento : null,
    p_lema: String(lema ?? '').replace(/[<>]/g, '').trim().slice(0, LEMA_MAX),
  };
}

/** `?u=fralex` → 'fralex' (solo a-z, 0-9 y _; como exige la BD). Vacío si no hay. */
export const usuarioDeURL = (search) => String(new URLSearchParams(search).get('u') ?? '').toLowerCase().replace(/[^a-z0-9_]/g, '').slice(0, 20);

/** Valida una respuesta (máx. RESP_MAX). Misma forma que validarTexto. */
export function validarRespuesta(t) {
  const texto = String(t ?? '').replace(/\r\n/g, '\n').replace(/\n{3,}/g, '\n\n').trim();
  if (!texto) return { ok: false, texto, error: 'Escribe tu respuesta.' };
  if (texto.length > RESP_MAX) return { ok: false, texto, error: `Máximo ${RESP_MAX} caracteres (llevas ${texto.length}).` };
  return { ok: true, texto, error: '' };
}

/** {'🔥': 3, '🤝': 1, fuego: 2, '<x>': 9, '😂': 0} → [{tipo, n}] ordenado de MÁS a MENOS votada (a igual conteo, el orden de la paleta). Las claves antiguas ('fuego'…) cuentan como su emoji;
 *  lo que no sea un emoji (letras, símbolos ASCII, > 16 caracteres) y los ceros se descartan. */
const ES_EMOJI = /^[^ -~]{1,16}$/u;
export function resumenReacciones(r) {
  const cuentas = new Map();
  for (const [k, v] of Object.entries(r ?? {})) {
    const tipo = REACCION_ANTIGUA[k] ?? k; const n = Math.max(0, Math.trunc(Number(v) || 0));
    if (n > 0 && ES_EMOJI.test(tipo)) cuentas.set(tipo, (cuentas.get(tipo) ?? 0) + n);
  }
  const orden = (t) => { const i = PALETA_EMOJIS.indexOf(t); return i < 0 ? 999 : i; };
  return [...cuentas].map(([tipo, n]) => ({ tipo, n })).sort((x, y) => y.n - x.n || orden(x.tipo) - orden(y.tipo));
}
/** ¿Es un emoji que la web ofrece (paleta)? */
export const esReaccionValida = (t) => PALETA_EMOJIS.includes(t);

/** Aplica LOCALMENTE el resultado de reaccionar (para pintar al instante, sin releer): `final` = mi reacción tras la RPC (null = la quité). No muta. */
export function aplicarReaccion(item, final) {
  const reacciones = { ...(item.reacciones ?? {}) };
  if (item.mia) reacciones[item.mia] = Math.max(0, (reacciones[item.mia] ?? 1) - 1);
  if (final) reacciones[final] = (reacciones[final] ?? 0) + 1;
  for (const k of Object.keys(reacciones)) if (!reacciones[k]) delete reacciones[k];
  return { ...item, reacciones, mia: final ?? null };
}

/** Enlace de video → { ok, proveedor, id, url, error }. Mismos proveedores que la BD (private.video_valido): YouTube, TikTok, Kick y Twitch (solo https). `id` solo en YouTube. */
const PROVEEDORES = [
  ['youtube', /^https:\/\/(?:www\.|m\.)?(?:youtube\.com\/(?:watch\?(?:[^#\s]*&)?v=|shorts\/|live\/)|youtu\.be\/)([A-Za-z0-9_-]{11})/i],
  ['tiktok', /^https:\/\/(?:www\.|m\.|vm\.)?tiktok\.com\/\S+/i],
  ['kick', /^https:\/\/(?:www\.)?kick\.com\/\S+/i],
  ['twitch', /^https:\/\/(?:www\.|clips\.)?twitch\.tv\/\S+/i],
  ['propio', /^https:\/\/(?:[a-z0-9]{8,40}\.supabase\.co\/storage\/v1\/object\/public\/muro-video|pub-[a-f0-9]{32}\.r2\.dev)\/[0-9a-f-]{36}\/[A-Za-z0-9._-]{1,80}$/i],   // video subido por el usuario (bucket muro-video de Supabase —migración 027— o bucket R2 de Cloudflare —migración 028—; la BD acepta solo SU host exacto)
];
export const PROVEEDOR_ETIQUETA = { youtube: 'YouTube', tiktok: 'TikTok', kick: 'Kick', twitch: 'Twitch', propio: 'Video' };
export function analizarVideo(texto) {
  const url = String(texto ?? '').trim();
  if (!url) return { ok: false, proveedor: '', id: '', url: '', error: '' };
  if (url.length > 300 || /[<>"'\s]/.test(url)) return { ok: false, proveedor: '', id: '', url, error: 'El enlace no es válido.' };
  for (const [proveedor, re] of PROVEEDORES) { const m = re.exec(url); if (m) return { ok: true, proveedor, id: m[1] ?? '', url, error: '' }; }
  return { ok: false, proveedor: '', id: '', url, error: 'Solo se aceptan enlaces https de YouTube, TikTok, Kick o Twitch.' };
}

/** Ruta del archivo dentro del bucket «muro»: `<uid>/<marca de tiempo>-<aleatorio>.jpg` (la BD exige que empiece por tu uid). */
export const rutaImagen = (uid, ts = Date.now(), azar = Math.random().toString(36).slice(2, 8)) => `${uid}/${ts}-${String(azar).replace(/[^a-z0-9]/gi, '').slice(0, 8) || 'x'}.jpg`;
/** URL pública del bucket «muro» → ruta del archivo (para borrarlo del Storage). '' si no es de ese bucket. */
export const rutaDeUrl = (url) => /\/storage\/v1\/object\/public\/muro\/([^?#]+)/.exec(String(url ?? ''))?.[1] ?? '';
/** URL pública de nuestro Storage → { bucket, ruta } (solo «muro» y «muro-video»). null si no es nuestra. Sirve para limpiar archivos al borrar. */
export function archivoDeUrl(url) {
  const r2 = /^https:\/\/pub-[a-f0-9]{32}\.r2\.dev\/([0-9a-f-]{36}\/[A-Za-z0-9._-]{1,80})$/i.exec(String(url ?? '')); if (r2) return { bucket: 'r2', ruta: r2[1] };   // video en Cloudflare R2
  const m = /\/storage\/v1\/object\/public\/(muro|muro-video)\/([^?#]+)/.exec(String(url ?? '')); return m ? { bucket: m[1], ruta: m[2] } : null;
}
/** Ruta de un video subido: `<uid>/<marca de tiempo>-<aleatorio>.<mp4|webm|mov>`. */
export const rutaVideo = (uid, ext = 'mp4', ts = Date.now(), azar = Math.random().toString(36).slice(2, 8)) => `${uid}/${ts}-${String(azar).replace(/[^a-z0-9]/gi, '').slice(0, 8) || 'x'}.${['mp4', 'webm', 'mov'].includes(ext) ? ext : 'mp4'}`;

/* ---- Segmentos por juego y enlaces para compartir ---- */
export const segmentoValido = (id) => SEGMENTOS.some((s) => s[0] === id);
export const etiquetaSegmento = (id) => SEGMENTOS.find((s) => s[0] === id)?.[1] ?? '';
/** Lo que se envía a la BD: un segmento conocido o null (general). */
export const segmentoParaGuardar = (id) => (segmentoValido(id) ? id : null);
/** Enlace compartible: `<base>perfil/?u=<usuario>#p-<id>` (publicación) o `#c-<id>` (clip). Sin id → el perfil. */
export function urlCompartir({ base, usuario, tipo = '', id = null }) {
  const u = String(usuario ?? '').toLowerCase().replace(/[^a-z0-9_]/g, '').slice(0, 20);
  const n = Number(id); const ancla = (tipo === 'p' || tipo === 'c') && Number.isFinite(n) && n > 0 ? `#${tipo}-${Math.trunc(n)}` : '';
  return `${base}perfil/?u=${u}${ancla}`;
}
/** '#p-12' → { tipo: 'p', id: 12 }; cualquier otra cosa → null. */
export function destinoDeHash(hash) { const m = /^#([pc])-(\d{1,12})$/.exec(String(hash ?? '')); return m ? { tipo: m[1], id: Number(m[2]) } : null; }

/** Duelo adjunto (tarjeta que arma el SERVIDOR) → datos listos para pintar. null si no es válido. Nunca lanza. */
const ETIQUETA_ESTADO = { ACEPTADO: 'Agendado', EN_JUEGO: 'En juego', FINALIZADO: 'Finalizado' };
export function resumenReto(r) {
  if (!r || !Number.isFinite(Number(r.id))) return null;
  const persona = (x) => (x ? { nombre: String(x.nombre ?? 'Jugador').slice(0, 40), username: /^[a-z0-9_]{1,20}$/.test(String(x.username ?? '')) ? x.username : '' } : null);
  const a = Math.max(1, Math.trunc(Number(r.tam_a) || 1)); const b = Math.max(1, Math.trunc(Number(r.tam_b) || 1));
  return {
    id: Number(r.id), estado: String(r.estado ?? ''), etiquetaEstado: ETIQUETA_ESTADO[r.estado] ?? 'Duelo', formato: `${a} vs ${b}`,
    plataforma: String(r.plataforma ?? '').slice(0, 30), fecha: r.fecha ?? null, retador: persona(r.retador), rival: persona(r.rival),
  };
}
/** Texto de una opción del selector «Adjuntar duelo»: «Fralex vs Jack · 1 vs 1 · Finalizado · 3 oct». */
export function etiquetaOpcionReto(r) {
  const x = resumenReto(r); if (!x) return '';
  const f = x.fecha ? new Date(x.fecha) : null;
  const fecha = f && !Number.isNaN(f.getTime()) ? f.toLocaleDateString('es-PE', { day: 'numeric', month: 'short' }) : '';
  return [`${x.retador?.nombre ?? 'Jugador'} vs ${x.rival?.nombre ?? 'por definir'}`, x.formato, x.etiquetaEstado, fecha].filter(Boolean).join(' · ');
}

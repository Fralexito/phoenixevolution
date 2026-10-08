// Edge Function «mercado» — API del programa de PC «Phoenix Mercado» (pruebas; luego se integra a Phoenix Link).
// URL base: https://fiibiyijojkxqlsrhcil.supabase.co/functions/v1/mercado/v1/<ruta>
// Desplegar con verify_jwt = false: el programa NO usa sesión de Supabase, usa su token (Authorization: Bearer pml_…).
// Contrato completo: docs/mercado-api.md
import { createClient } from "npm:@supabase/supabase-js@2";

const sb = createClient(Deno.env.get("SUPABASE_URL")!, Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!, { auth: { persistSession: false } });
const VERSION_API = "mercado-0.1.0";
const URL_FIRMADA_SEG = 300;

class ErrorApi extends Error { constructor(public codigo: string, public http = 400, public extra: Record<string, unknown> = {}) { super(codigo); } }
const HTTP: Record<string, number> = { TOKEN_FALTANTE: 401, TOKEN_INVALIDO: 401, TOKEN_REVOCADO: 401, CODIGO_NO_ENCONTRADO: 404, CODIGO_USADO: 409,
  CODIGO_VENCIDO: 410, SIN_OPTION_FILE: 404, DEMASIADOS_INTENTOS: 429, RUTA_NO_EXISTE: 404, METODO_NO_PERMITIDO: 405, DATOS_INVALIDOS: 422, ERROR_INTERNO: 500 };
const err = (codigo: string, extra: Record<string, unknown> = {}) => new ErrorApi(codigo, HTTP[codigo] ?? 400, extra);
const log = (nivel: string, evento: string, datos: Record<string, unknown> = {}) => console.log(JSON.stringify({ nivel, evento, ...datos, t: new Date().toISOString() }));

async function sha256(t: string) { const b = await crypto.subtle.digest("SHA-256", new TextEncoder().encode(t)); return [...new Uint8Array(b)].map((x) => x.toString(16).padStart(2, "0")).join(""); }
function tokenNuevo() { const b = crypto.getRandomValues(new Uint8Array(32)); return "pml_" + btoa(String.fromCharCode(...b)).replace(/\+/g, "-").replace(/\//g, "_").replace(/=+$/, ""); }
async function leerJson(req: Request): Promise<Record<string, unknown>> {
  const txt = await req.text(); if (txt.length > 300_000) throw err("DATOS_INVALIDOS", { campo: "cuerpo", detalle: "demasiado grande" });
  try { const j = JSON.parse(txt || "{}"); if (typeof j !== "object" || Array.isArray(j) || !j) throw 0; return j; } catch { throw err("DATOS_INVALIDOS", { campo: "cuerpo" }); }
}
const texto = (x: unknown, campo: string, max: number, opcional = true) => {
  if (x == null || x === "") { if (opcional) return null; throw err("DATOS_INVALIDOS", { campo }); }
  if (typeof x !== "string" || x.length > max) throw err("DATOS_INVALIDOS", { campo }); return x.trim();
};
const hash = (x: unknown, campo: string) => { if (x == null) return null; if (typeof x !== "string" || !/^[0-9a-f]{64}$/.test(x)) throw err("DATOS_INVALIDOS", { campo }); return x; };

// Freno simple en memoria (por instancia): suficiente para pruebas.
const golpes = new Map<string, number[]>();
function frenar(clave: string, max: number, ventanaMs: number) {
  const ahora = Date.now(); const l = (golpes.get(clave) ?? []).filter((t) => ahora - t < ventanaMs);
  if (l.length >= max) throw err("DEMASIADOS_INTENTOS", { reintentar_en: Math.ceil(ventanaMs / 1000) }); l.push(ahora); golpes.set(clave, l);
}

type Disp = { id: string; usuario: string };
async function autenticar(req: Request): Promise<Disp> {
  const m = /^Bearer\s+(pml_[A-Za-z0-9_-]{20,100})$/.exec(req.headers.get("authorization") ?? "");
  if (!m) throw err(req.headers.get("authorization") ? "TOKEN_INVALIDO" : "TOKEN_FALTANTE");
  const { data, error } = await sb.from("mercado_dispositivos").select("id, usuario, revocado").eq("huella_token", await sha256(m[1])).maybeSingle();
  if (error) { log("error", "autenticar", { m: error.message }); throw err("ERROR_INTERNO"); }
  if (!data) throw err("TOKEN_INVALIDO"); if (data.revocado) throw err("TOKEN_REVOCADO");
  frenar(`d:${data.id}`, 60, 60_000);
  const ver = req.headers.get("x-mercado-version")?.slice(0, 20);
  sb.from("mercado_dispositivos").update({ ultimo_uso: new Date().toISOString(), ...(ver ? { version_app: ver } : {}) }).eq("id", data.id).then(() => {});
  return { id: data.id, usuario: data.usuario };
}

/** POST /v1/vincular { codigo, nombre_pc? } → { token, usuario } — el código se genera en la web (Mercado → Vincular programa). */
async function vincular(req: Request) {
  const ip = req.headers.get("x-forwarded-for")?.split(",")[0]?.trim() ?? "?"; frenar(`ip:${ip}`, 10, 10 * 60_000);
  const b = await leerJson(req);
  const codigo = (texto(b.codigo, "codigo", 20, false) ?? "").toUpperCase().replace(/[\s-]/g, "");
  if (!/^[A-Z0-9]{8}$/.test(codigo)) throw err("DATOS_INVALIDOS", { campo: "codigo" });
  const nombre = texto(b.nombre_pc, "nombre_pc", 40) ?? "Mi PC";
  const { data: c, error } = await sb.from("mercado_codigos").select("id, usuario, expira, usado").eq("codigo_huella", await sha256(codigo)).maybeSingle();
  if (error) throw err("ERROR_INTERNO");
  if (!c) throw err("CODIGO_NO_ENCONTRADO"); if (c.usado) throw err("CODIGO_USADO"); if (Date.parse(c.expira) <= Date.now()) throw err("CODIGO_VENCIDO");
  const { data: marcado } = await sb.from("mercado_codigos").update({ usado: new Date().toISOString() }).eq("id", c.id).is("usado", null).select("id");
  if (!marcado?.length) throw err("CODIGO_USADO");
  const token = tokenNuevo();
  const { data: d, error: e2 } = await sb.from("mercado_dispositivos").insert({ usuario: c.usuario, huella_token: await sha256(token), nombre }).select("id").single();
  if (e2) { log("error", "vincular.insert", { m: e2.message }); throw err("ERROR_INTERNO"); }
  const { data: p } = await sb.from("perfiles").select("nombre_display, username").eq("id", c.usuario).maybeSingle();
  log("info", "vinculado", { dispositivo: d!.id });
  return { token, dispositivo_id: d!.id, usuario: { id: c.usuario, nombre: p?.nombre_display || p?.username || "Jugador" } };
}

/** GET /v1/yo — quién soy (para mostrar en el programa). */
async function yo(req: Request) {
  const d = await autenticar(req);
  const { data: p } = await sb.from("perfiles").select("nombre_display, username, avatar_url").eq("id", d.usuario).maybeSingle();
  return { usuario: { id: d.usuario, nombre: p?.nombre_display || p?.username || "Jugador", avatar_url: p?.avatar_url ?? null }, dispositivo_id: d.id };
}

/** GET /v1/option/actual — versión oficial vigente + URL firmada (5 min) para descargarla. Comparar sha256 al bajar. */
async function optionActual(req: Request) {
  await autenticar(req);
  const { data, error } = await sb.from("mercado_option_files").select("version, ruta, sha256, tamano, notas, created_at").eq("actual", true).maybeSingle();
  if (error) throw err("ERROR_INTERNO"); if (!data) throw err("SIN_OPTION_FILE");
  const { data: f, error: e2 } = await sb.storage.from("option-files").createSignedUrl(data.ruta, URL_FIRMADA_SEG, { download: "EDIT00000000" });
  if (e2 || !f?.signedUrl) { log("error", "option.firma", { m: e2?.message }); throw err("ERROR_INTERNO"); }
  return { version: data.version, sha256: data.sha256, tamano: data.tamano, notas: data.notas, publicado: data.created_at, url: f.signedUrl, expira_en_seg: URL_FIRMADA_SEG };
}

/** POST /v1/reportes { option_version?, hash_antes?, hash_despues?, resumen?, cambios: [...] } → { id, estado } */
async function crearReporte(req: Request) {
  const d = await autenticar(req); frenar(`rep:${d.id}`, 20, 60 * 60_000);
  const b = await leerJson(req);
  if (!Array.isArray(b.cambios) || b.cambios.length > 2000) throw err("DATOS_INVALIDOS", { campo: "cambios" });
  const fila = { usuario: d.usuario, dispositivo: d.id, option_version: texto(b.option_version, "option_version", 40), hash_antes: hash(b.hash_antes, "hash_antes"),
    hash_despues: hash(b.hash_despues, "hash_despues"), resumen: texto(b.resumen, "resumen", 500), cambios: b.cambios };
  const { data, error } = await sb.from("mercado_reportes").insert(fila).select("id, estado, created_at").single();
  if (error) { log("warn", "reporte.insert", { m: error.message }); throw err("DATOS_INVALIDOS", { detalle: error.message }); }
  return data;
}

/** GET /v1/reportes — mis últimos 20 reportes y su estado (pendiente / aprobado / rechazado + motivo). */
async function misReportes(req: Request) {
  const d = await autenticar(req);
  const { data, error } = await sb.from("mercado_reportes").select("id, option_version, resumen, estado, motivo, created_at, revisado_en").eq("usuario", d.usuario).order("created_at", { ascending: false }).limit(20);
  if (error) throw err("ERROR_INTERNO");
  return { reportes: data ?? [] };
}

const RUTAS: Record<string, Record<string, (r: Request) => Promise<unknown>>> = {
  "/v1/vincular": { POST: vincular }, "/v1/yo": { GET: yo }, "/v1/option/actual": { GET: optionActual },
  "/v1/reportes": { POST: crearReporte, GET: misReportes }, "/v1/eco": { GET: async () => ({ ok: true, version_api: VERSION_API, hora: new Date().toISOString() }) },
};

Deno.serve(async (req) => {
  const ruta = new URL(req.url).pathname.replace(/^.*?\/mercado(?=\/)/, "").replace(/\/+$/, "");
  const sid = crypto.randomUUID().slice(0, 8);
  const json = (cuerpo: unknown, status = 200) => new Response(JSON.stringify(cuerpo), { status, headers: { "content-type": "application/json; charset=utf-8", "x-solicitud-id": sid } });
  try {
    const r = RUTAS[ruta]; if (!r) throw err("RUTA_NO_EXISTE"); const fn = r[req.method]; if (!fn) throw err("METODO_NO_PERMITIDO");
    return json({ ok: true, version_api: VERSION_API, datos: await fn(req) });
  } catch (e) {
    const x = e instanceof ErrorApi ? e : err("ERROR_INTERNO");
    if (!(e instanceof ErrorApi)) log("error", "excepcion", { ruta, sid, m: String((e as Error)?.message ?? e) });
    return json({ ok: false, version_api: VERSION_API, error: { codigo: x.codigo, ...x.extra }, solicitud_id: sid }, x.http);
  }
});

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
  CODIGO_VENCIDO: 410, DISPOSITIVO_SUSPENDIDO: 403, CODIGO_MANAGER_REQUERIDO: 403, SIN_OPTION_FILE: 404, DEMASIADOS_INTENTOS: 429, RUTA_NO_EXISTE: 404, METODO_NO_PERMITIDO: 405, DATOS_INVALIDOS: 422, NO_AUTORIZADO: 403, ERROR_INTERNO: 500 };
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

type Disp = { id: string; usuario: string; origen: "manager" | "link" };
/**
 * Acepta dos tokens:
 *  · pml_… → «código manager» (mercado_dispositivos). Siempre válido para todo.
 *  · cualquier otro (p. ej. phx_… de Phoenix Link) → se busca por la MISMA huella SHA-256 en dispositivos_host,
 *    respetando revocado y suspendido. Si el usuario o el staff exigen código manager, las acciones del modo
 *    manager (`exigeManager`) responden CODIGO_MANAGER_REQUERIDO.
 */
async function autenticar(req: Request, { exigeManager = false } = {}): Promise<Disp> {
  const m = /^Bearer\s+([A-Za-z0-9_-]{20,120})$/.exec(req.headers.get("authorization") ?? "");
  if (!m) throw err(req.headers.get("authorization") ? "TOKEN_INVALIDO" : "TOKEN_FALTANTE");
  const huella = await sha256(m[1]);
  const ver = req.headers.get("x-mercado-version")?.slice(0, 20);
  if (m[1].startsWith("pml_")) {
    const { data, error } = await sb.from("mercado_dispositivos").select("id, usuario, revocado").eq("huella_token", huella).maybeSingle();
    if (error) { log("error", "autenticar", { m: error.message }); throw err("ERROR_INTERNO"); }
    if (!data) throw err("TOKEN_INVALIDO"); if (data.revocado) throw err("TOKEN_REVOCADO");
    frenar(`d:${data.id}`, 60, 60_000);
    sb.from("mercado_dispositivos").update({ ultimo_uso: new Date().toISOString(), ...(ver ? { version_app: ver } : {}) }).eq("id", data.id).then(() => {});
    return { id: data.id, usuario: data.usuario, origen: "manager" };
  }
  // Token de Phoenix Link
  const { data, error } = await sb.from("dispositivos_host").select("id, usuario, revocado, suspendido").eq("huella_token", huella).maybeSingle();
  if (error) { log("error", "autenticar.link", { m: error.message }); throw err("ERROR_INTERNO"); }
  if (!data) throw err("TOKEN_INVALIDO"); if (data.revocado) throw err("TOKEN_REVOCADO"); if (data.suspendido) throw err("DISPOSITIVO_SUSPENDIDO");
  frenar(`l:${data.id}`, 60, 60_000);
  if (exigeManager) {
    const [{ data: g }, { data: u }] = await Promise.all([
      sb.from("lm_config").select("exigir_codigo_manager").eq("liga", "galaxy").maybeSingle(),
      sb.from("mercado_ajustes").select("exigir_codigo").eq("usuario", data.usuario).maybeSingle(),
    ]);
    if (g?.exigir_codigo_manager || u?.exigir_codigo) throw err("CODIGO_MANAGER_REQUERIDO");
  }
  return { id: data.id, usuario: data.usuario, origen: "link" };
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
  await autenticar(req, { exigeManager: true });
  const { data, error } = await sb.from("mercado_option_files").select("version, ruta, sha256, tamano, notas, created_at").eq("actual", true).maybeSingle();
  if (error) throw err("ERROR_INTERNO"); if (!data) throw err("SIN_OPTION_FILE");
  const { data: f, error: e2 } = await sb.storage.from("option-files").createSignedUrl(data.ruta, URL_FIRMADA_SEG, { download: "EDIT00000000" });
  if (e2 || !f?.signedUrl) { log("error", "option.firma", { m: e2?.message }); throw err("ERROR_INTERNO"); }
  return { version: data.version, sha256: data.sha256, tamano: data.tamano, notas: data.notas, publicado: data.created_at, url: f.signedUrl, expira_en_seg: URL_FIRMADA_SEG };
}

/** POST /v1/reportes { option_version?, hash_antes?, hash_despues?, resumen?, cambios: [...] } → { id, estado } */
async function crearReporte(req: Request) {
  const d = await autenticar(req, { exigeManager: true }); frenar(`rep:${d.id}`, 20, 60 * 60_000);
  const b = await leerJson(req);
  if (!Array.isArray(b.cambios) || b.cambios.length > 2000) throw err("DATOS_INVALIDOS", { campo: "cambios" });
  const fila = { usuario: d.usuario, dispositivo: d.origen === "manager" ? d.id : null, dispositivo_link: d.origen === "link" ? d.id : null, origen: d.origen, option_version: texto(b.option_version, "option_version", 40), hash_antes: hash(b.hash_antes, "hash_antes"),
    hash_despues: hash(b.hash_despues, "hash_despues"), resumen: texto(b.resumen, "resumen", 500), cambios: b.cambios,
    huella_plantillas_antes: hash(b.huella_plantillas_antes, "huella_plantillas_antes"), huella_plantillas_despues: hash(b.huella_plantillas_despues, "huella_plantillas_despues"),
    huella_esperada: null as string | null };
  // Guardamos la huella esperada en ese momento para que el staff vea si el jugador tenía las plantillas oficiales.
  if (fila.huella_plantillas_antes || fila.huella_plantillas_despues) { const { data: h } = await sb.rpc("lm_huella", { p_liga: LIGA }); fila.huella_esperada = (h as { huella?: string })?.huella ?? null; }
  const { data, error } = await sb.from("mercado_reportes").insert(fila).select("id, estado, created_at").single();
  if (error) { log("warn", "reporte.insert", { m: error.message }); throw err("DATOS_INVALIDOS", { detalle: error.message }); }
  return data;
}

/** GET /v1/reportes — mis últimos 20 reportes y su estado (pendiente / aprobado / rechazado + motivo). */
async function misReportes(req: Request) {
  const d = await autenticar(req, { exigeManager: true });
  const { data, error } = await sb.from("mercado_reportes").select("id, option_version, resumen, estado, motivo, created_at, revisado_en").eq("usuario", d.usuario).order("created_at", { ascending: false }).limit(20);
  if (error) throw err("ERROR_INTERNO");
  return { reportes: data ?? [] };
}

// ───────── Modo Mánager (migración 081) ─────────
const ROLES_STAFF = ["moderador", "admin"];
async function exigirStaff(usuario: string) {
  const { data } = await sb.from("perfiles").select("rol").eq("id", usuario).maybeSingle();
  if (!data || !ROLES_STAFF.includes(data.rol)) throw err("NO_AUTORIZADO");
}
const LIGA = "galaxy";

/** POST /v1/catalogo (staff) { equipos:[{pes_team_id,nombre}], jugadores:[{pes_id,nombre,pes_team_id,posicion,media,edad,nacionalidad,fecha_nac,altura,dorsal,valor}] } → { equipos, jugadores } */
async function subirCatalogo(req: Request) {
  const d = await autenticar(req, { exigeManager: true }); await exigirStaff(d.usuario); frenar(`cat:${d.usuario}`, 10, 60 * 60_000);
  const txt = await req.text(); if (txt.length > 5_000_000) throw err("DATOS_INVALIDOS", { campo: "cuerpo", detalle: "máx. 5 MB" });
  let datos: Record<string, unknown>; try { datos = JSON.parse(txt); } catch { throw err("DATOS_INVALIDOS", { campo: "cuerpo" }); }
  if (!Array.isArray(datos.equipos) || !Array.isArray(datos.jugadores)) throw err("DATOS_INVALIDOS", { campo: "equipos/jugadores" });
  const { data, error } = await sb.rpc("sistema_lm_importar", { p_liga: LIGA, p_datos: datos });
  if (error) { log("warn", "catalogo", { m: error.message }); throw err("DATOS_INVALIDOS", { detalle: error.message }); }
  log("info", "catalogo_importado", { usuario: d.usuario, ...(data as object) });
  return data;
}

/** GET /v1/fichajes?todos=1 → { fichajes:[{ id, tipo, phoenix_id, pes_id, jugador, de_pes_team_id, a_pes_team_id (null = libre), a_club, monto, aplicado_en, fecha }] } (por defecto solo pendientes) */
async function fichajes(req: Request) {
  await autenticar(req, { exigeManager: true });
  const todos = new URL(req.url).searchParams.get("todos") === "1";
  const { data, error } = await sb.rpc("sistema_lm_fichajes", { p_liga: LIGA, p_pendientes: !todos });
  if (error) throw err("ERROR_INTERNO");
  return { fichajes: data ?? [] };
}

/** POST /v1/fichajes/aplicados (staff) { ids:[...] } → { marcados } — tras generar el option file oficial con esos fichajes. */
async function marcarAplicados(req: Request) {
  const d = await autenticar(req, { exigeManager: true }); await exigirStaff(d.usuario);
  const b = await leerJson(req);
  if (!Array.isArray(b.ids) || !b.ids.length || b.ids.length > 5000 || !b.ids.every((x) => Number.isInteger(x))) throw err("DATOS_INVALIDOS", { campo: "ids" });
  const { data, error } = await sb.rpc("sistema_lm_marcar_aplicados", { p_liga: LIGA, p_ids: b.ids });
  if (error) throw err("ERROR_INTERNO");
  return { marcados: data };
}

/** GET /v1/huella?liga=galaxy[&texto=1] → { liga, algoritmo, huella, clubes, jugadores, calculada[, texto] }
 *  Huella esperada de las plantillas (SHA-256 del texto canónico club→phoenix_ids; formato en docs/mercado-api.md). */
async function huella(req: Request) {
  await autenticar(req);
  const u = new URL(req.url); const liga = (u.searchParams.get("liga") || LIGA).slice(0, 40);
  const { data, error } = await sb.rpc("lm_huella", { p_liga: liga });
  if (error) throw err("ERROR_INTERNO");
  if (u.searchParams.get("texto") === "1") { const { data: t } = await sb.rpc("lm_huella_texto", { p_liga: liga }); return { ...(data as object), texto: t ?? "" }; }
  return data;
}

// ───────── Firma Ed25519 de la lista oficial (085) ─────────
const b64 = (u: Uint8Array) => btoa(String.fromCharCode(...u));
const desdeB64 = (t: string) => Uint8Array.from(atob(t), (c) => c.charCodeAt(0));
let claveCache: { id: string; privada: CryptoKey; publica: string } | null = null;
/** Clave activa: la lee de la BD; si no existe, la genera (una sola vez) y la guarda. La privada nunca sale del servidor. */
async function claveFirma() {
  if (claveCache) return claveCache;
  let { data } = await sb.rpc("sistema_mercado_clave");
  if (!data) {
    const par = await crypto.subtle.generateKey({ name: "Ed25519" }, true, ["sign", "verify"]) as CryptoKeyPair;
    const priv = new Uint8Array(await crypto.subtle.exportKey("pkcs8", par.privateKey));
    const pub = new Uint8Array(await crypto.subtle.exportKey("raw", par.publicKey));
    const id = "k" + (await sha256(b64(pub))).slice(0, 10);
    const r = await sb.rpc("sistema_mercado_guardar_clave", { p_id: id, p_privada: b64(priv), p_publica: b64(pub) });
    if (r.error) { log("error", "clave.guardar", { m: r.error.message }); throw err("ERROR_INTERNO"); }
    data = r.data; log("info", "clave_generada", { id });
  }
  const d = data as { id: string; privada: string; publica: string };
  const privada = await crypto.subtle.importKey("pkcs8", desdeB64(d.privada), { name: "Ed25519" }, false, ["sign"]);
  claveCache = { id: d.id, privada, publica: d.publica };
  return claveCache;
}

/** GET /v1/clave-publica → { clave_id, algoritmo: "Ed25519", publica (base64, 32 bytes) } — sin token. */
async function clavePublica() { const k = await claveFirma(); return { clave_id: k.id, algoritmo: "Ed25519", publica: k.publica }; }

/** GET /v1/plantillas?liga=galaxy → { contenido (texto JSON), firma (base64), clave_id, algoritmo }
 *  Se firma el texto EXACTO de «contenido» (UTF-8). Mercado verifica la firma con la pública y recién entonces hace JSON.parse(contenido).
 *  contenido = { liga, generado, huella, clubes:[{ clave, pes_team_id, club, jugadores:[{ phoenix_id, pes_id }] }] } */
async function plantillas(req: Request) {
  await autenticar(req);
  const liga = (new URL(req.url).searchParams.get("liga") || LIGA).slice(0, 40);
  const [{ data: clubes, error: e1 }, { data: h, error: e2 }] = await Promise.all([sb.rpc("lm_plantillas", { p_liga: liga }), sb.rpc("lm_huella", { p_liga: liga })]);
  if (e1 || e2) throw err("ERROR_INTERNO");
  const { data: v } = await sb.from("lm_config").select("version_liga").eq("liga", liga).maybeSingle();
  return firmar(JSON.stringify({ liga, generado: new Date().toISOString(), version_liga: Number(v?.version_liga ?? 0), huella: (h as { huella: string }).huella, clubes }));
}

// ───────── Correcciones automáticas y envíos atrasados (085) ─────────
const UUID = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;
const fechaValida = (t: unknown) => { if (typeof t !== "string" || t.length > 40) return null; const ms = Date.parse(t); return Number.isFinite(ms) && ms > Date.UTC(2020, 0) && ms < Date.now() + 86_400_000 ? new Date(ms).toISOString() : null; };

/** POST /v1/correcciones { correcciones:[{ id_cliente, phoenix_id?, pes_id?, jugador?, cambio:{...}, huella_antes?, huella_despues?, hora_local, atrasado? }] }
 *  Lote de 1–500. Idempotente por id_cliente (reenviar no duplica). → { recibidas, duplicadas, rechazadas:[{ indice, campo }] } */
async function correcciones(req: Request) {
  const d = await autenticar(req, { exigeManager: true }); frenar(`corr:${d.usuario}`, 60, 60 * 60_000);
  const b = await leerJson(req);
  if (!Array.isArray(b.correcciones) || !b.correcciones.length || b.correcciones.length > 500) throw err("DATOS_INVALIDOS", { campo: "correcciones" });
  const filas: Record<string, unknown>[] = []; const rechazadas: { indice: number; campo: string }[] = [];
  b.correcciones.forEach((c: Record<string, unknown>, i: number) => {
    try {
      if (!c || typeof c !== "object") throw "item";
      if (typeof c.id_cliente !== "string" || !UUID.test(c.id_cliente)) throw "id_cliente";
      if (!c.cambio || typeof c.cambio !== "object" || Array.isArray(c.cambio) || JSON.stringify(c.cambio).length > 1500) throw "cambio";
      const h = (v: unknown, n: string) => { try { return hash(v, n); } catch { throw n; } };
      filas.push({ usuario: d.usuario, origen: d.origen, dispositivo: d.id, id_cliente: c.id_cliente, liga: LIGA,
        phoenix_id: Number.isInteger(c.phoenix_id) ? c.phoenix_id : null, pes_id: Number.isInteger(c.pes_id) ? c.pes_id : null,
        jugador: typeof c.jugador === "string" ? c.jugador.slice(0, 80) : null, cambio: c.cambio,
        huella_antes: h(c.huella_antes, "huella_antes"), huella_despues: h(c.huella_despues, "huella_despues"),
        hora_local: typeof c.hora_local === "string" ? c.hora_local.slice(0, 40) : null, ocurrido: fechaValida(c.hora_local), atrasado: c.atrasado === true });
    } catch (campo) { rechazadas.push({ indice: i, campo: String(campo) }); }
  });
  let recibidas = 0;
  if (filas.length) {
    const { data, error } = await sb.from("mercado_correcciones").upsert(filas, { onConflict: "usuario,id_cliente", ignoreDuplicates: true }).select("id");
    if (error) { log("warn", "correcciones", { m: error.message }); throw err("DATOS_INVALIDOS", { detalle: error.message }); }
    recibidas = data?.length ?? 0;
  }
  return { recibidas, duplicadas: filas.length - recibidas, rechazadas };
}

/** POST /v1/reportes/lote { reportes:[{ id_cliente, ...mismos campos que /reportes, atrasado? }] } (1–100) — para enviar lo acumulado sin conexión.
 *  → { recibidos, duplicados, rechazados:[{ indice, campo }] } */
async function reportesLote(req: Request) {
  const d = await autenticar(req, { exigeManager: true }); frenar(`replote:${d.id}`, 20, 60 * 60_000);
  const b = await leerJson(req);
  if (!Array.isArray(b.reportes) || !b.reportes.length || b.reportes.length > 100) throw err("DATOS_INVALIDOS", { campo: "reportes" });
  let esperada: string | null = null;
  const filas: Record<string, unknown>[] = []; const rechazados: { indice: number; campo: string }[] = [];
  for (const [i, r] of (b.reportes as Record<string, unknown>[]).entries()) {
    try {
      if (typeof r?.id_cliente !== "string" || !UUID.test(r.id_cliente)) throw "id_cliente";
      if (!Array.isArray(r.cambios) || r.cambios.length > 2000) throw "cambios";
      const h = (v: unknown, n: string) => { try { return hash(v, n); } catch { throw n; } };
      const t = (v: unknown, n: string, m: number) => { try { return texto(v, n, m); } catch { throw n; } };
      const fila: Record<string, unknown> = { usuario: d.usuario, dispositivo: d.origen === "manager" ? d.id : null, dispositivo_link: d.origen === "link" ? d.id : null, origen: d.origen,
        id_cliente: r.id_cliente, atrasado: r.atrasado !== false, option_version: t(r.option_version, "option_version", 40), resumen: t(r.resumen, "resumen", 500), cambios: r.cambios,
        hash_antes: h(r.hash_antes, "hash_antes"), hash_despues: h(r.hash_despues, "hash_despues"),
        huella_plantillas_antes: h(r.huella_plantillas_antes, "huella_plantillas_antes"), huella_plantillas_despues: h(r.huella_plantillas_despues, "huella_plantillas_despues") };
      if (fila.huella_plantillas_antes || fila.huella_plantillas_despues) {
        if (esperada === null) { const { data: hh } = await sb.rpc("lm_huella", { p_liga: LIGA }); esperada = (hh as { huella?: string })?.huella ?? ""; }
        fila.huella_esperada = esperada || null;
      }
      filas.push(fila);
    } catch (campo) { rechazados.push({ indice: i, campo: String(campo) }); }
  }
  let recibidos = 0;
  if (filas.length) {
    const { data, error } = await sb.from("mercado_reportes").upsert(filas, { onConflict: "usuario,id_cliente", ignoreDuplicates: true }).select("id");
    if (error) { log("warn", "reportes.lote", { m: error.message }); throw err("DATOS_INVALIDOS", { detalle: error.message }); }
    recibidos = data?.length ?? 0;
  }
  return { recibidos, duplicados: filas.length - recibidos, rechazados };
}

// ───────── Versión de liga (086) ─────────
async function firmar(contenido: string) {
  const k = await claveFirma();
  const firma = new Uint8Array(await crypto.subtle.sign({ name: "Ed25519" }, k.privada, new TextEncoder().encode(contenido)));
  return { contenido, firma: b64(firma), clave_id: k.id, algoritmo: "Ed25519" };
}

/** GET /v1/liga/cambios?desde=<version>[&liga=galaxy] → firmado { contenido, firma, clave_id, algoritmo }
 *  contenido = { liga, desde, version_actual, cambios:[{ version, phoenix_id, pes_id, club_desde, club_hacia, club_desde_pes, club_hacia_pes, tipo, fecha }] }
 *  Máx. 1000 cambios por respuesta: si version_actual > último version recibido, volver a pedir con desde=<último>. */
async function ligaCambios(req: Request) {
  await autenticar(req, { exigeManager: true });
  const u = new URL(req.url); const liga = (u.searchParams.get("liga") || LIGA).slice(0, 40);
  const desde = Number(u.searchParams.get("desde") ?? "0");
  if (!Number.isInteger(desde) || desde < 0) throw err("DATOS_INVALIDOS", { campo: "desde" });
  const { data, error } = await sb.rpc("lm_cambios_desde", { p_liga: liga, p_desde: desde, p_limite: 1000 });
  if (error) throw err("ERROR_INTERNO");
  return firmar(JSON.stringify({ ...(data as object), generado: new Date().toISOString() }));
}

/** POST /v1/liga/aplicado { version, huella_plantillas, liga? } → { version_actual, al_dia, coincide }
 *  coincide: true/false si se aplicó la versión actual (se compara con la huella esperada); null si la versión ya es vieja. */
async function ligaAplicado(req: Request) {
  const d = await autenticar(req, { exigeManager: true }); frenar(`apl:${d.id}`, 60, 60 * 60_000);
  const b = await leerJson(req);
  const liga = (typeof b.liga === "string" ? b.liga : LIGA).slice(0, 40);
  if (!Number.isInteger(b.version) || (b.version as number) < 0) throw err("DATOS_INVALIDOS", { campo: "version" });
  const huellaRep = hash(b.huella_plantillas, "huella_plantillas");
  const { data: cfg, error } = await sb.from("lm_config").select("version_liga").eq("liga", liga).maybeSingle();
  if (error) throw err("ERROR_INTERNO"); if (!cfg) throw err("DATOS_INVALIDOS", { campo: "liga" });
  const actual = Number(cfg.version_liga); const alDia = b.version === actual;
  let esperada: string | null = null;
  if (alDia) { const { data: h } = await sb.rpc("lm_huella", { p_liga: liga }); esperada = (h as { huella?: string })?.huella ?? null; }
  const coincide = alDia && huellaRep && esperada ? huellaRep === esperada : null;
  const { error: e2 } = await sb.from("lm_aplicados").insert({ usuario: d.usuario, origen: d.origen, dispositivo: d.id, liga, version: b.version, huella_plantillas: huellaRep, huella_esperada: esperada, coincide });
  if (e2) { log("warn", "aplicado", { m: e2.message }); throw err("ERROR_INTERNO"); }
  return { version_actual: actual, al_dia: alDia, coincide };
}

/**
 * POST /v1/equivalencias (staff) — informe de emparejamiento de Phoenix Mercado.
 * { formato:"phoenix-mercado/emparejamiento@0.1", perfil_parche:"conmegol-26",
 *   jugadores:[{ phoenix_id, pes_id_local?, estado:"automatico"|"revisar"|"sin_candidato", puntaje?, metodo?, candidatos?:[{pes_id_local,...}] }],
 *   clubes:[ mismo formato; phoenix_id = lm_clubes.id ] }
 * Máx. 3000 filas por llamada (mandar en lotes). Campos desconocidos se ignoran. Idempotente: reenviar el mismo lote no duplica.
 */
async function equivalencias(req: Request) {
  const d = await autenticar(req, { exigeManager: true }); await exigirStaff(d.usuario); frenar(`eq:${d.usuario}`, 120, 60 * 60_000);
  const txt = await req.text(); if (txt.length > 4_000_000) throw err("DATOS_INVALIDOS", { campo: "cuerpo", detalle: "máx. 4 MB" });
  let b: Record<string, unknown>; try { b = JSON.parse(txt); } catch { throw err("DATOS_INVALIDOS", { campo: "cuerpo" }); }
  if (!/^phoenix-mercado\/emparejamiento@0\./.test(String(b.formato ?? ""))) throw err("DATOS_INVALIDOS", { campo: "formato", detalle: "se espera phoenix-mercado/emparejamiento@0.x" });
  const perfil = texto(b.perfil_parche ?? b.perfil, "perfil_parche", 60, false)!;
  if (!/^[A-Za-z0-9._-]{1,60}$/.test(perfil)) throw err("DATOS_INVALIDOS", { campo: "perfil_parche" });
  const jug = b.jugadores ?? [], clu = b.clubes ?? [];
  if (!Array.isArray(jug) || !Array.isArray(clu)) throw err("DATOS_INVALIDOS", { campo: "jugadores/clubes" });
  if (jug.length + clu.length === 0 || jug.length + clu.length > 3000) throw err("DATOS_INVALIDOS", { campo: "jugadores/clubes", detalle: "entre 1 y 3000 filas por llamada" });
  const res: Record<string, unknown> = { perfil_parche: perfil };
  for (const [tipo, items] of [["clubes", clu], ["jugadores", jug]] as const) {   // clubes primero
    if (!items.length) { res[tipo] = null; continue; }
    const { data, error } = await sb.rpc("sistema_mercado_equivalencias", { p_perfil: perfil, p_tipo: tipo, p_items: items });
    if (error) { log("warn", "equivalencias", { tipo, m: error.message }); throw err("DATOS_INVALIDOS", { tipo, detalle: error.message }); }
    res[tipo] = data;
  }
  log("info", "equivalencias", { usuario: d.usuario, perfil, jugadores: jug.length, clubes: clu.length });
  return res;
}

/** GET /v1/equivalencias?perfil_parche=…&tipo=jugadores|clubes&desde=<id> → { filas:[{id,phoenix_id,pes_id_local,estado}], siguiente } (solo automatico/confirmado; 5000 por página) */
async function leerEquivalencias(req: Request) {
  await autenticar(req, { exigeManager: true });
  const q = new URL(req.url).searchParams; const perfil = q.get("perfil_parche") ?? "";
  if (!/^[A-Za-z0-9._-]{1,60}$/.test(perfil)) throw err("DATOS_INVALIDOS", { campo: "perfil_parche" });
  const tabla = q.get("tipo") === "clubes" ? "mercado_equivalencias_clubes" : "mercado_equivalencias";
  const { data, error } = await sb.from(tabla).select("id, phoenix_id, pes_id_local, estado").eq("perfil_parche", perfil)
    .in("estado", ["automatico", "confirmado"]).gt("id", Math.max(0, Number(q.get("desde")) || 0)).order("id").limit(5000);
  if (error) { log("error", "leer_equivalencias", { m: error.message }); throw err("ERROR_INTERNO"); }
  return { filas: data ?? [], siguiente: data && data.length === 5000 ? data[data.length - 1].id : null };
}

const RUTAS: Record<string, Record<string, (r: Request) => Promise<unknown>>> = {
  "/v1/vincular": { POST: vincular }, "/v1/yo": { GET: yo }, "/v1/option/actual": { GET: optionActual },
  "/v1/reportes": { POST: crearReporte, GET: misReportes },
  "/v1/catalogo": { POST: subirCatalogo }, "/v1/fichajes": { GET: fichajes }, "/v1/fichajes/aplicados": { POST: marcarAplicados }, "/v1/huella": { GET: huella },
  "/v1/clave-publica": { GET: clavePublica }, "/v1/plantillas": { GET: plantillas }, "/v1/correcciones": { POST: correcciones }, "/v1/reportes/lote": { POST: reportesLote },
  "/v1/equivalencias": { POST: equivalencias, GET: leerEquivalencias },
  "/v1/liga/cambios": { GET: ligaCambios }, "/v1/liga/aplicado": { POST: ligaAplicado }, "/v1/eco": { GET: async () => ({ ok: true, version_api: VERSION_API, hora: new Date().toISOString() }) },
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

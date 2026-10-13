// Edge Function «traspasos» (1.0.0, migración 105) · Traspasos en vivo entre Phoenix Link (jugador→equipo hechos en Editar de PES).
// URL base: https://fiibiyijojkxqlsrhcil.supabase.co/functions/v1/traspasos/v1/<ruta>
// Desplegar con verify_jwt = false: Phoenix Link usa su token de dispositivo (Authorization: Bearer phx_…), igual que «liga» y «phoenix».
// Es una función APARTE de «liga» a propósito: así un fallo aquí nunca toca el marcador en vivo ni el campo 2D.
// Rutas (anfitrión = host aprobado; amigo = cualquier dispositivo vinculado):
//   POST /v1/traspasos            → (anfitrión) publica un lote «cambios» {jugador_id, jugador, desde_id, desde, hasta_id, hasta}; idempotente por id.
//   GET  /v1/traspasos?desde=<seq>&limite=<1-50> → (amigo) lotes nuevos de los anfitriones que sigue, en orden de seq.
//   POST /v1/traspasos/codigo     → (anfitrión) su código de enlace de 8 caracteres {rotar?}; devuelve también quién lo sigue.
//   POST /v1/traspasos/seguir     → (amigo) {codigo, prueba?}: pasa a seguir a ese anfitrión.
//   POST /v1/traspasos/dejar      → (amigo) {anfitrion_id}.
//   GET  /v1/traspasos/siguiendo  → {sigo, me_siguen}.
// Solo viajan ids y nombres de jugador/equipo: ningún dato personal ni ninguna base de datos. Tablas con RLS y sin permisos para anon/authenticated.
// Hecho por el chat LINK (Claude) con autorización de Fralex (12-oct-2026). Documento: docs/TRASPASOS-EN-VIVO.md.
import { createClient } from "npm:@supabase/supabase-js@2";

const sb = createClient(Deno.env.get("SUPABASE_URL")!, Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!, { auth: { persistSession: false } });
const ROLES_STAFF = ["ayudante", "moderador", "admin"];

const ERRORES: Record<string, { http: number; mensaje: string; reintentable: boolean }> = {
  TOKEN_FALTANTE: { http: 401, mensaje: "Falta el token de la PC (vincula Phoenix Link).", reintentable: false },
  TOKEN_INVALIDO: { http: 401, mensaje: "El token de esta PC no es válido.", reintentable: false },
  TOKEN_REVOCADO: { http: 401, mensaje: "La vinculación de esta PC fue revocada.", reintentable: false },
  DISPOSITIVO_SUSPENDIDO: { http: 403, mensaje: "Esta PC está suspendida por el staff.", reintentable: false },
  HOST_NO_AUTORIZADO: { http: 403, mensaje: "Tu cuenta no está aprobada como host.", reintentable: false },
  LIGA_PAUSADA: { http: 503, mensaje: "Los resultados de liga están en pausa por el staff.", reintentable: true },
  RUTA_NO_EXISTE: { http: 404, mensaje: "Ruta desconocida.", reintentable: false },
  METODO_NO_PERMITIDO: { http: 405, mensaje: "Método no permitido.", reintentable: false },
  JSON_INVALIDO: { http: 400, mensaje: "El cuerpo no es JSON válido.", reintentable: false },
  CAMPO_INVALIDO: { http: 400, mensaje: "Falta un dato o no es válido.", reintentable: false },
  PARTIDO_NO_ENCONTRADO: { http: 404, mensaje: "Ese partido oficial no existe.", reintentable: false },
  YA_CONFIRMADO: { http: 409, mensaje: "Ese partido ya tiene un resultado validado.", reintentable: false },
  PARTIDO_INCOMPLETO: { http: 409, mensaje: "El juego no confirmó que el partido llegara al final.", reintentable: false },
  CODIGO_INVALIDO: { http: 404, mensaje: "Ese código de enlace no existe o ya no vale.", reintentable: false },
  SEGUIR_A_UNO_MISMO: { http: 409, mensaje: "Ese código es tuyo: no puedes seguirte a ti mismo (solo en modo prueba).", reintentable: false },
  DEMASIADOS_INTENTOS: { http: 429, mensaje: "Demasiadas peticiones; espera un momento.", reintentable: true },
  ERROR_INTERNO: { http: 500, mensaje: "Error interno.", reintentable: true },
};
class ErrorApi extends Error {
  codigo: string; campo: string | null; reintentar_en: number | null;
  constructor(codigo: string, extra: { campo?: string; mensaje?: string; reintentar_en?: number } = {}) {
    super(extra.mensaje ?? (ERRORES[codigo] ?? ERRORES.ERROR_INTERNO).mensaje);
    this.codigo = ERRORES[codigo] ? codigo : "ERROR_INTERNO";
    this.campo = extra.campo ?? null; this.reintentar_en = extra.reintentar_en ?? null;
  }
}
const log = (nivel: "info" | "warn" | "error", evento: string, datos: Record<string, unknown>) =>
  console[nivel](JSON.stringify({ nivel, evento, ...datos, t: new Date().toISOString() }));
const db = (error: { message: string } | null, contexto: string) => {
  if (error) { log("error", "bd", { contexto, mensaje: error.message }); throw new ErrorApi("ERROR_INTERNO"); }
};
const hex = (b: ArrayBuffer) => [...new Uint8Array(b)].map((x) => x.toString(16).padStart(2, "0")).join("");
const sha256 = async (t: string) => hex(await crypto.subtle.digest("SHA-256", new TextEncoder().encode(t)));

const cubos = new Map<string, { n: number; desde: number }>();
function frenar(clave: string, max: number, ventanaMs: number) {
  const ahora = Date.now(); const c = cubos.get(clave);
  if (!c || ahora - c.desde > ventanaMs) { cubos.set(clave, { n: 1, desde: ahora }); if (cubos.size > 5000) cubos.clear(); return; }
  if (++c.n > max) throw new ErrorApi("DEMASIADOS_INTENTOS", { reintentar_en: Math.ceil((c.desde + ventanaMs - ahora) / 1000) });
}
async function leerJson(req: Request): Promise<Record<string, unknown>> {
  const t = await req.text();
  if (t.length > 32_000) throw new ErrorApi("CAMPO_INVALIDO", { campo: "cuerpo", mensaje: "Cuerpo demasiado grande (máx. 32 KB)." });
  try { const j = JSON.parse(t || "{}"); if (!j || typeof j !== "object" || Array.isArray(j)) throw 0; return j; }
  catch { throw new ErrorApi("JSON_INVALIDO"); }
}
const entero = (v: unknown, campo: string, min: number, max: number): number => {
  if (typeof v !== "number" || !Number.isInteger(v) || v < min || v > max) throw new ErrorApi("CAMPO_INVALIDO", { campo });
  return v;
};
const texto = (v: unknown, max: number) => (typeof v === "string" ? v.replace(/[\u0000-\u001f\u007f]/g, "").slice(0, max) : "");
const uuid = (v: unknown) => (typeof v === "string" && /^[0-9a-f-]{36}$/i.test(v) ? v : null);
type Dispositivo = { id: string; usuario: string };

let cacheInterruptor: { t: number; activo: boolean } | null = null;
async function ligaActiva(): Promise<boolean> {
  if (cacheInterruptor && Date.now() - cacheInterruptor.t < 60_000) return cacheInterruptor.activo;
  const { data, error } = await sb.from("phoenix_config").select("clave, valor").in("clave", ["integracion", "liga_resultados"]);
  if (error) { log("warn", "config", { mensaje: error.message }); return cacheInterruptor?.activo ?? true; }
  const activo = !(data ?? []).some((f) => f.valor === false);
  cacheInterruptor = { t: Date.now(), activo };
  return activo;
}

/** Token → dispositivo válido de un host aprobado (misma regla que la función «phoenix»). */
async function autenticar(req: Request, frenarDispositivo = true): Promise<Dispositivo> {
  const m = /^Bearer\s+(phx_[A-Za-z0-9_-]{20,100})$/.exec(req.headers.get("authorization") ?? "");
  if (!m) throw new ErrorApi(req.headers.get("authorization") ? "TOKEN_INVALIDO" : "TOKEN_FALTANTE");
  const { data, error } = await sb.from("dispositivos_host").select("id, usuario, revocado, suspendido").eq("huella_token", await sha256(m[1])).maybeSingle();
  db(error, "autenticar");
  if (!data) throw new ErrorApi("TOKEN_INVALIDO");
  if (data.revocado) throw new ErrorApi("TOKEN_REVOCADO");
  if (data.suspendido) throw new ErrorApi("DISPOSITIVO_SUSPENDIDO");
  if (frenarDispositivo) frenar(`d:${data.id}`, 60, 60_000);   // «campo» va aparte (1/s por sala): no gasta este cupo
  const { data: p, error: e2 } = await sb.from("perfiles").select("host_aprobado, rol").eq("id", data.usuario).maybeSingle();
  db(e2, "autenticar.perfil");
  if (!p || !(p.host_aprobado || ROLES_STAFF.includes(p.rol))) throw new ErrorApi("HOST_NO_AUTORIZADO");
  if (!(await ligaActiva())) throw new ErrorApi("LIGA_PAUSADA");
  return { id: data.id, usuario: data.usuario };
}


// ═══ TRASPASOS EN VIVO (migración 105) ═══════════════════════════════════════════════════════════════════════
// El anfitrión (host aprobado) publica lotes de cambios «jugador → equipo» que hizo en Editar de PES; los Link de los amigos que lo
// SIGUEN (con un código de 8 caracteres) los recogen y los aplican sobre SU base. Solo viajan ids y nombres de jugador/equipo.
const MAX_CAMBIOS = 60;
const ALFABETO_CODIGO = "ABCDEFGHJKLMNPQRSTUVWXYZ23456789";
const MAX_SEGUIDORES = 100;
const RETENCION_DIAS = 30;
const MAX_LOTES_POR_ANFITRION = 200;

/** Token → dispositivo vinculado de CUALQUIER usuario (no hace falta ser host): es lo que necesita un amigo que solo recibe. */
async function autenticarBasico(req: Request): Promise<Dispositivo> {
  const m = /^Bearer\s+(phx_[A-Za-z0-9_-]{20,100})$/.exec(req.headers.get("authorization") ?? "");
  if (!m) throw new ErrorApi(req.headers.get("authorization") ? "TOKEN_INVALIDO" : "TOKEN_FALTANTE");
  const { data, error } = await sb.from("dispositivos_host").select("id, usuario, revocado, suspendido").eq("huella_token", await sha256(m[1])).maybeSingle();
  db(error, "autenticarBasico");
  if (!data) throw new ErrorApi("TOKEN_INVALIDO");
  if (data.revocado) throw new ErrorApi("TOKEN_REVOCADO");
  if (data.suspendido) throw new ErrorApi("DISPOSITIVO_SUSPENDIDO");
  if (!(await ligaActiva())) throw new ErrorApi("LIGA_PAUSADA");
  return { id: data.id, usuario: data.usuario };
}

/** Nombre de jugador/equipo: sin controles y cortado por letras (nunca medio emoji: jsonb lo rechazaría). */
const nombreCorto = (v: unknown, max = 48) => (typeof v === "string" ? Array.from(v.replace(/[\u0000-\u001f\u007f]/g, "")).slice(0, max).join("").trim() : "");

type CambioTraspaso = { jugador_id: number; jugador: string; desde_id: number; desde: string; hasta_id: number; hasta: string };
function validarCambios(v: unknown): CambioTraspaso[] {
  if (!Array.isArray(v) || v.length < 1 || v.length > MAX_CAMBIOS) throw new ErrorApi("CAMPO_INVALIDO", { campo: "cambios" });
  return v.map((x, i) => {
    if (!x || typeof x !== "object") throw new ErrorApi("CAMPO_INVALIDO", { campo: `cambios[${i}]` });
    const c = x as Record<string, unknown>;
    return {
      jugador_id: entero(c.jugador_id, `cambios[${i}].jugador_id`, 1, 99_999_999),
      jugador: nombreCorto(c.jugador),
      desde_id: entero(c.desde_id ?? 0, `cambios[${i}].desde_id`, 0, 99_999_999),
      desde: nombreCorto(c.desde),
      hasta_id: entero(c.hasta_id, `cambios[${i}].hasta_id`, 1, 99_999_999),
      hasta: nombreCorto(c.hasta),
    };
  });
}

// ── POST /v1/traspasos ─────────────────────────────────────────────────────────────────
// El anfitrión publica un lote. Idempotente por (anfitrión, id del lote): repetirlo devuelve el mismo seq.
async function traspasosPublicar(req: Request) {
  const d = await autenticar(req);
  frenar(`trp:${d.id}`, 12, 60_000);
  const j = await leerJson(req);
  const lote = typeof j.id === "string" && /^[0-9a-f]{24}$/i.test(j.id) ? j.id.toLowerCase() : null;
  if (!lote) throw new ErrorApi("CAMPO_INVALIDO", { campo: "id" });
  const huella = typeof j.huella === "string" && /^[0-9a-f]{64}$/i.test(j.huella) ? j.huella.toLowerCase() : null;
  if (!huella) throw new ErrorApi("CAMPO_INVALIDO", { campo: "huella" });
  const creado = typeof j.creado === "string" ? new Date(j.creado) : null;
  if (!creado || isNaN(creado.getTime())) throw new ErrorApi("CAMPO_INVALIDO", { campo: "creado" });
  const cambios = validarCambios(j.cambios);
  const { data: previo, error: e0 } = await sb.from("liga_traspasos").select("seq").eq("anfitrion", d.usuario).eq("lote", lote).maybeSingle();
  db(e0, "traspasos.previo");
  if (previo) return { seq: previo.seq as number, repetido: true };
  const { data, error } = await sb.from("liga_traspasos").insert({
    anfitrion: d.usuario, lote, huella, creado: creado.toISOString(), autor: nombreCorto(j.autor, 40),
    parche: nombreCorto(j.parche, 60), base_huella: texto(j.base_huella, 64), cambios,
  }).select("seq").single();
  if (error) {
    if ((error as { code?: string }).code === "23505") {   // otro envío igual llegó a la vez
      const { data: ya } = await sb.from("liga_traspasos").select("seq").eq("anfitrion", d.usuario).eq("lote", lote).maybeSingle();
      if (ya) return { seq: ya.seq as number, repetido: true };
    }
    db(error, "traspasos.guardar");
  }
  // Limpieza barata: de vez en cuando se borra lo viejo (más de 30 días o por encima de los últimos 200 de este anfitrión).
  if (Math.random() < 0.1) {
    await sb.from("liga_traspasos").delete().lt("recibido", new Date(Date.now() - RETENCION_DIAS * 86_400_000).toISOString());
    const { data: tope } = await sb.from("liga_traspasos").select("seq").eq("anfitrion", d.usuario).order("seq", { ascending: false }).range(MAX_LOTES_POR_ANFITRION, MAX_LOTES_POR_ANFITRION);
    if (tope && tope[0]) await sb.from("liga_traspasos").delete().eq("anfitrion", d.usuario).lte("seq", tope[0].seq);
  }
  log("info", "traspasos.publicar", { dispositivo: d.id, lote, cambios: cambios.length });
  return { seq: data!.seq as number, repetido: false };
}

// ── GET /v1/traspasos?desde=<seq>&limite=<1-50> ─────────────────────────────────────────
// Un amigo (o el propio anfitrión en «prueba») recoge los lotes nuevos de los anfitriones que SIGUE, en orden de seq.
async function traspasosLeer(req: Request) {
  const d = await autenticarBasico(req);
  frenar(`trl:${d.id}`, 40, 60_000);
  const q = new URL(req.url).searchParams;
  const desde = Math.max(0, Number.parseInt(q.get("desde") ?? "0", 10) || 0);
  const limite = Math.min(50, Math.max(1, Number.parseInt(q.get("limite") ?? "30", 10) || 30));
  const { data: sig, error: e1 } = await sb.from("liga_traspasos_seguidores").select("anfitrion").eq("seguidor", d.usuario);
  db(e1, "traspasos.siguiendo");
  const anfitriones = [...new Set([...(sig ?? []).map((x) => x.anfitrion as string), d.usuario])];
  const { data, error } = await sb.from("liga_traspasos")
    .select("seq, anfitrion, lote, huella, creado, autor, parche, base_huella, cambios")
    .in("anfitrion", anfitriones).gt("seq", desde).order("seq", { ascending: true }).limit(limite);
  db(error, "traspasos.leer");
  const filas = data ?? [];
  const ids = [...new Set(filas.map((f) => f.anfitrion as string))];
  const nombres = new Map<string, string>();
  if (ids.length) {
    const { data: ps, error: e2 } = await sb.from("perfiles").select("id, nombre_display").in("id", ids);
    db(e2, "traspasos.nombres");
    for (const p of ps ?? []) nombres.set(p.id as string, texto(p.nombre_display, 40) || "Anfitrión");
  }
  const lotes = filas.map((f) => ({
    seq: f.seq as number, id: f.lote as string, anfitrion: nombres.get(f.anfitrion as string) ?? "Anfitrión", anfitrion_id: f.anfitrion as string,
    huella: f.huella as string, creado: f.creado as string, autor: f.autor as string, parche: f.parche as string, base_huella: f.base_huella as string,
    cambios: f.cambios,
  }));
  return { lotes, ultimo_seq: filas.length ? (filas[filas.length - 1].seq as number) : desde };
}

function codigoNuevo(): string {
  const b = crypto.getRandomValues(new Uint8Array(8));
  return Array.from(b, (x) => ALFABETO_CODIGO[x % ALFABETO_CODIGO.length]).join("");
}

// ── POST /v1/traspasos/codigo  {rotar?: boolean} ─────────────────────────────────────────
// El anfitrión pide su código de enlace (se crea la primera vez). «rotar» invalida el anterior; quien ya sigue, sigue.
async function traspasosCodigo(req: Request) {
  const d = await autenticar(req);
  frenar(`trc:${d.id}`, 20, 60_000);
  const j = await leerJson(req);
  const { data: actual, error } = await sb.from("liga_traspasos_codigos").select("codigo").eq("anfitrion", d.usuario).maybeSingle();
  db(error, "traspasos.codigo");
  let codigo = actual?.codigo as string | undefined;
  if (!codigo || j.rotar === true) {
    for (let i = 0; i < 5 && (!codigo || codigo === actual?.codigo); i++) {
      const nuevo = codigoNuevo();
      const { error: e2 } = await sb.from("liga_traspasos_codigos").upsert({ anfitrion: d.usuario, codigo: nuevo, creado: new Date().toISOString() }, { onConflict: "anfitrion" });
      if (!e2) { codigo = nuevo; break; }
      if ((e2 as { code?: string }).code !== "23505") db(e2, "traspasos.codigo.crear");   // 23505 = el código ya existía: se reintenta con otro
    }
    if (!codigo || codigo === actual?.codigo) throw new ErrorApi("ERROR_INTERNO");
  }
  const { data: seg, error: e3 } = await sb.from("liga_traspasos_seguidores").select("seguidor").eq("anfitrion", d.usuario).limit(MAX_SEGUIDORES);
  db(e3, "traspasos.seguidores");
  const ids = (seg ?? []).map((x) => x.seguidor as string);
  const nombres = new Map<string, string>();
  if (ids.length) {
    const { data: ps } = await sb.from("perfiles").select("id, nombre_display").in("id", ids);
    for (const p of ps ?? []) nombres.set(p.id as string, texto(p.nombre_display, 40) || "Jugador");
  }
  return { codigo, seguidores: ids.map((i) => ({ nombre: nombres.get(i) ?? "Jugador" })) };
}

// ── POST /v1/traspasos/seguir  {codigo, prueba?: boolean} ────────────────────────────────
async function traspasosSeguir(req: Request) {
  const d = await autenticarBasico(req);
  frenar(`trs:${d.id}`, 10, 60_000);   // frena también la adivinanza de códigos
  const j = await leerJson(req);
  const codigo = typeof j.codigo === "string" ? j.codigo.trim().toUpperCase() : "";
  if (!/^[A-Z2-9]{8}$/.test(codigo)) throw new ErrorApi("CODIGO_INVALIDO");
  const { data: c, error } = await sb.from("liga_traspasos_codigos").select("anfitrion").eq("codigo", codigo).maybeSingle();
  db(error, "traspasos.seguir.codigo");
  if (!c) throw new ErrorApi("CODIGO_INVALIDO");
  const anfitrion = c.anfitrion as string;
  if (anfitrion === d.usuario && j.prueba !== true) throw new ErrorApi("SEGUIR_A_UNO_MISMO");
  if (anfitrion !== d.usuario) {
    const { count, error: e1 } = await sb.from("liga_traspasos_seguidores").select("seguidor", { count: "exact", head: true }).eq("anfitrion", anfitrion);
    db(e1, "traspasos.seguir.cuenta");
    if ((count ?? 0) >= MAX_SEGUIDORES) throw new ErrorApi("CAMPO_INVALIDO", { campo: "codigo", mensaje: "Ese anfitrión ya tiene el máximo de seguidores." });
    const { error: e2 } = await sb.from("liga_traspasos_seguidores").upsert({ anfitrion, seguidor: d.usuario }, { onConflict: "anfitrion,seguidor", ignoreDuplicates: true });
    db(e2, "traspasos.seguir.guardar");
  }
  const { data: p, error: e3 } = await sb.from("perfiles").select("nombre_display").eq("id", anfitrion).maybeSingle();
  db(e3, "traspasos.seguir.nombre");
  log("info", "traspasos.seguir", { dispositivo: d.id });
  return { anfitrion: texto(p?.nombre_display, 40) || "Anfitrión", anfitrion_id: anfitrion };
}

// ── POST /v1/traspasos/dejar  {anfitrion_id} ─────────────────────────────────────────────
async function traspasosDejar(req: Request) {
  const d = await autenticarBasico(req);
  frenar(`trd:${d.id}`, 20, 60_000);
  const j = await leerJson(req);
  const anf = uuid(j.anfitrion_id);
  if (!anf) throw new ErrorApi("CAMPO_INVALIDO", { campo: "anfitrion_id" });
  const { error } = await sb.from("liga_traspasos_seguidores").delete().eq("anfitrion", anf).eq("seguidor", d.usuario);
  db(error, "traspasos.dejar");
  return {};
}

// ── GET /v1/traspasos/siguiendo ──────────────────────────────────────────────────────────
async function traspasosSiguiendo(req: Request) {
  const d = await autenticarBasico(req);
  frenar(`trg:${d.id}`, 30, 60_000);
  const { data: sigo, error } = await sb.from("liga_traspasos_seguidores").select("anfitrion").eq("seguidor", d.usuario).limit(MAX_SEGUIDORES);
  db(error, "traspasos.sigo");
  const { data: meSiguen, error: e2 } = await sb.from("liga_traspasos_seguidores").select("seguidor").eq("anfitrion", d.usuario).limit(MAX_SEGUIDORES);
  db(e2, "traspasos.mesiguen");
  const ids = [...new Set([...(sigo ?? []).map((x) => x.anfitrion as string), ...(meSiguen ?? []).map((x) => x.seguidor as string)])];
  const nombres = new Map<string, string>();
  if (ids.length) {
    const { data: ps } = await sb.from("perfiles").select("id, nombre_display").in("id", ids);
    for (const p of ps ?? []) nombres.set(p.id as string, texto(p.nombre_display, 40) || "Jugador");
  }
  return {
    sigo: (sigo ?? []).map((x) => ({ anfitrion_id: x.anfitrion as string, nombre: nombres.get(x.anfitrion as string) ?? "Anfitrión" })),
    me_siguen: (meSiguen ?? []).map((x) => ({ nombre: nombres.get(x.seguidor as string) ?? "Jugador" })),
  };
}

const RUTAS: Record<string, { metodo: string; fn: (r: Request) => Promise<Record<string, unknown>> }> = {
  "POST /v1/traspasos": { metodo: "POST", fn: traspasosPublicar },
  "GET /v1/traspasos": { metodo: "GET", fn: traspasosLeer },
  "POST /v1/traspasos/codigo": { metodo: "POST", fn: traspasosCodigo },
  "POST /v1/traspasos/seguir": { metodo: "POST", fn: traspasosSeguir },
  "POST /v1/traspasos/dejar": { metodo: "POST", fn: traspasosDejar },
  "GET /v1/traspasos/siguiendo": { metodo: "GET", fn: traspasosSiguiendo },
};

Deno.serve(async (req) => {
  const solicitudId = crypto.randomUUID();
  const ruta = new URL(req.url).pathname.replace(/^.*?\/traspasos(?=\/v1)/, "").replace(/\/+$/, "");
  const cab: Record<string, string> = { "content-type": "application/json; charset=utf-8", "x-request-id": solicitudId, "cache-control": "no-store" };
  try {
    const r = RUTAS[req.method + " " + ruta];
    if (!r) throw new ErrorApi(Object.keys(RUTAS).some((k) => k.endsWith(" " + ruta)) ? "METODO_NO_PERMITIDO" : "RUTA_NO_EXISTE");
    const datos = await r.fn(req);
    return new Response(JSON.stringify({ ok: true, ...datos, solicitud_id: solicitudId }), { status: 200, headers: cab });
  } catch (err) {
    const e = err instanceof ErrorApi ? err : new ErrorApi("ERROR_INTERNO");
    if (!(err instanceof ErrorApi)) log("error", "excepcion", { ruta, solicitudId, mensaje: String((err as Error)?.message ?? err) });
    const def = ERRORES[e.codigo];
    const cuerpo: Record<string, unknown> = { ok: false, codigo: e.codigo, mensaje: e.message, reintentable: def.reintentable, solicitud_id: solicitudId };
    if (e.campo) cuerpo.campo = e.campo;
    if (e.reintentar_en) cuerpo.reintentar_en = e.reintentar_en;
    const h = e.reintentar_en ? { ...cab, "retry-after": String(e.reintentar_en) } : cab;
    return new Response(JSON.stringify(cuerpo), { status: def.http, headers: h });
  }
});

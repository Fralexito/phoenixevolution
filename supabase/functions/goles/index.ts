// Edge Function «goles» (1.0.0) · Goles AUTOMÁTICOS de Phoenix Link en los duelos (migración 148, función nueva 5/8).
// URL base: https://fiibiyijojkxqlsrhcil.supabase.co/functions/v1/goles/v1/<ruta>
// Desplegar con verify_jwt = false: Phoenix Link usa su token de dispositivo (Authorization: Bearer phx_…), igual que «torneos».
// Ruta:  POST /v1/goles/duelo  { reto_id, goles: [{ lado:'A'|'B', goleador, minuto, asistente?, tipo? }], completo:true, version_link? }
//        → { guardados, cuadra, marcador_confirmado }. Reenviar reemplaza los goles anteriores de ese duelo (idempotente).
// Los goles solo SUMAN a la tabla si el marcador está confirmado por los dos líderes y cuadran con él (lo decide la BD).
// Interruptor del staff: phoenix_config clave «goles_link» = false → GOLES_PAUSADOS (503).
// Contrato: docs/web-pes-link/CONTRATO-GOLES-LINK.md. Hecho por la Cuenta 2 (Claude) a pedido de Fralex, 25-oct-2026.
import { createClient } from "npm:@supabase/supabase-js@2";

const sb = createClient(Deno.env.get("SUPABASE_URL")!, Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!, { auth: { persistSession: false } });
const ROLES_STAFF = ["ayudante", "moderador", "admin"];

const ERRORES: Record<string, { http: number; mensaje: string; reintentable: boolean }> = {
  TOKEN_FALTANTE: { http: 401, mensaje: "Falta el token de la PC (vincula Phoenix Link).", reintentable: false },
  TOKEN_INVALIDO: { http: 401, mensaje: "El token de esta PC no es válido.", reintentable: false },
  TOKEN_REVOCADO: { http: 401, mensaje: "La vinculación de esta PC fue revocada.", reintentable: false },
  DISPOSITIVO_SUSPENDIDO: { http: 403, mensaje: "Esta PC está suspendida por el staff.", reintentable: false },
  HOST_NO_AUTORIZADO: { http: 403, mensaje: "Tu cuenta no está aprobada como host.", reintentable: false },
  GOLES_PAUSADOS: { http: 503, mensaje: "Los goles automáticos están en pausa por el staff.", reintentable: true },
  RUTA_NO_EXISTE: { http: 404, mensaje: "Ruta desconocida.", reintentable: false },
  METODO_NO_PERMITIDO: { http: 405, mensaje: "Método no permitido.", reintentable: false },
  JSON_INVALIDO: { http: 400, mensaje: "El cuerpo no es JSON válido.", reintentable: false },
  CAMPO_INVALIDO: { http: 400, mensaje: "Falta un dato o no es válido.", reintentable: false },
  PARTIDO_INCOMPLETO: { http: 409, mensaje: "El juego no confirmó que el partido llegara al final.", reintentable: false },
  DUELO_NO_ENCONTRADO: { http: 404, mensaje: "Ese duelo no existe.", reintentable: false },
  DUELO_NO_ES_DE_ESTA_SALA: { http: 403, mensaje: "Ese duelo no se jugó en una sala de esta PC.", reintentable: false },
  DUELO_NO_JUGADO: { http: 409, mensaje: "Ese duelo no está en juego ni terminado.", reintentable: false },
  DEMASIADOS_INTENTOS: { http: 429, mensaje: "Demasiadas peticiones; espera un momento.", reintentable: true },
  ERROR_INTERNO: { http: 500, mensaje: "Error interno.", reintentable: true },
};
/** Errores que sistema_duelo_goles_link lanza con su código al inicio del mensaje. */
const CODIGOS_BD = ["DUELO_NO_ENCONTRADO", "DUELO_NO_ES_DE_ESTA_SALA", "DUELO_NO_JUGADO", "TOKEN_REVOCADO"];

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
  if (!error) return;
  const codigo = CODIGOS_BD.find((c) => error.message.startsWith(c));
  if (codigo) throw new ErrorApi(codigo);
  if (error.message.startsWith("CAMPO_INVALIDO")) throw new ErrorApi("CAMPO_INVALIDO", { campo: error.message.slice(15) || "goles" });
  log("error", "bd", { contexto, mensaje: error.message }); throw new ErrorApi("ERROR_INTERNO");
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
const texto = (v: unknown, max: number) => (typeof v === "string" ? Array.from(v.replace(/[\u0000-\u001f\u007f]/g, "")).slice(0, max).join("") : "");

type Dispositivo = { id: string; usuario: string };

let cacheInterruptor: { t: number; activo: boolean } | null = null;
async function golesActivos(): Promise<boolean> {
  if (cacheInterruptor && Date.now() - cacheInterruptor.t < 60_000) return cacheInterruptor.activo;
  const { data, error } = await sb.from("phoenix_config").select("clave, valor").in("clave", ["integracion", "goles_link"]);
  if (error) { log("warn", "config", { mensaje: error.message }); return cacheInterruptor?.activo ?? true; }
  const activo = !(data ?? []).some((f) => f.valor === false);
  cacheInterruptor = { t: Date.now(), activo };
  return activo;
}

/** Token → dispositivo válido de un host aprobado (misma regla que «liga» y «phoenix»). */
async function autenticar(req: Request): Promise<Dispositivo> {
  const m = /^Bearer\s+(phx_[A-Za-z0-9_-]{20,100})$/.exec(req.headers.get("authorization") ?? "");
  if (!m) throw new ErrorApi(req.headers.get("authorization") ? "TOKEN_INVALIDO" : "TOKEN_FALTANTE");
  const { data, error } = await sb.from("dispositivos_host").select("id, usuario, revocado, suspendido").eq("huella_token", await sha256(m[1])).maybeSingle();
  db(error, "autenticar");
  if (!data) throw new ErrorApi("TOKEN_INVALIDO");
  if (data.revocado) throw new ErrorApi("TOKEN_REVOCADO");
  if (data.suspendido) throw new ErrorApi("DISPOSITIVO_SUSPENDIDO");
  frenar(`d:${data.id}`, 60, 60_000);
  const { data: p, error: e2 } = await sb.from("perfiles").select("host_aprobado, rol").eq("id", data.usuario).maybeSingle();
  db(e2, "autenticar.perfil");
  if (!p || !(p.host_aprobado || ROLES_STAFF.includes(p.rol))) throw new ErrorApi("HOST_NO_AUTORIZADO");
  if (!(await golesActivos())) throw new ErrorApi("GOLES_PAUSADOS");
  return { id: data.id, usuario: data.usuario };
}

const LADOS = ["A", "B"]; const TIPOS = ["gol", "penal", "en_contra"];
const nombre = (v: unknown) => (typeof v === "string" ? v.replace(/\s+/g, " ").trim() : "");
/** Misma regla que core/competicion/goleadoresLink.js y que la BD (se valida 3 veces a propósito). */
function validarGoles(v: unknown) {
  if (!Array.isArray(v)) throw new ErrorApi("CAMPO_INVALIDO", { campo: "goles" });
  if (v.length > 40) throw new ErrorApi("CAMPO_INVALIDO", { campo: "goles", mensaje: "Demasiados goles (máx. 40)." });
  return v.map((g, i) => {
    if (!g || typeof g !== "object" || !LADOS.includes((g as Record<string, unknown>).lado as string)) throw new ErrorApi("CAMPO_INVALIDO", { campo: `goles[${i}].lado` });
    const x = g as Record<string, unknown>;
    const goleador = nombre(x.goleador);
    if (!goleador || goleador.length > 60 || /[<>]/.test(goleador)) throw new ErrorApi("CAMPO_INVALIDO", { campo: `goles[${i}].goleador` });
    const minuto = entero(x.minuto, `goles[${i}].minuto`, 0, 130);
    const tipo = (x.tipo ?? "gol") as string;
    if (!TIPOS.includes(tipo)) throw new ErrorApi("CAMPO_INVALIDO", { campo: `goles[${i}].tipo` });
    const asistente = nombre(x.asistente) || null;
    if (asistente && (tipo !== "gol" || asistente.length > 60 || /[<>]/.test(asistente))) throw new ErrorApi("CAMPO_INVALIDO", { campo: `goles[${i}].asistente` });
    return { lado: x.lado, goleador, minuto, tipo, asistente };
  });
}

// ── POST /v1/goles/duelo ───────────────────────────────────────────────────────────────────────────
async function duelo(req: Request) {
  const d = await autenticar(req);
  frenar(`gol:${d.id}`, 10, 60_000);
  const j = await leerJson(req);
  const reto = entero(j.reto_id, "reto_id", 1, 2_147_483_647);
  if (j.completo !== true) throw new ErrorApi("PARTIDO_INCOMPLETO");
  const goles = validarGoles(j.goles);
  const { data, error } = await sb.rpc("sistema_duelo_goles_link", { p_dispositivo: d.id, p_reto: reto, p_goles: goles });
  db(error, "duelo");
  const r = (data ?? {}) as { guardados?: number; cuadra?: boolean; marcador_confirmado?: boolean };
  log("info", "goles", { reto, guardados: r.guardados, cuadra: r.cuadra, dispositivo: d.id, version_link: texto(j.version_link, 20) });
  return { guardados: r.guardados ?? goles.length, cuadra: Boolean(r.cuadra), marcador_confirmado: Boolean(r.marcador_confirmado) };
}

const RUTAS: Record<string, { metodo: string; fn: (r: Request) => Promise<Record<string, unknown>> }> = {
  "/v1/goles/duelo": { metodo: "POST", fn: duelo },
};

Deno.serve(async (req) => {
  const solicitudId = crypto.randomUUID();
  const ruta = new URL(req.url).pathname.replace(/^.*?\/goles(?=\/v1)/, "").replace(/\/+$/, "");
  const cab: Record<string, string> = { "content-type": "application/json; charset=utf-8", "x-request-id": solicitudId, "cache-control": "no-store" };
  try {
    const r = RUTAS[ruta];
    if (!r) throw new ErrorApi("RUTA_NO_EXISTE");
    if (req.method !== r.metodo) throw new ErrorApi("METODO_NO_PERMITIDO");
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

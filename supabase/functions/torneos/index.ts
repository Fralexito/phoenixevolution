// Edge Function «torneos» (1.0.0) · Resultados AUTOMÁTICOS de Phoenix Link en los torneos de /torneos/ (migración 145).
// URL base: https://fiibiyijojkxqlsrhcil.supabase.co/functions/v1/torneos/v1/<ruta>
// Desplegar con verify_jwt = false: Phoenix Link usa su token de dispositivo (Authorization: Bearer phx_…), igual que «liga» y «phoenix».
// Rutas:
//   GET  /v1/torneos/partidos   → partidos por jugar de los torneos EN CURSO que son premium u oficiales, con los parsec_id de cada
//                                 jugador (como /v1/liga/partidos). «mio» = ese lado es la cuenta dueña de esta PC.
//   POST /v1/torneos/resultado  → marcador del juego para un partido: queda «propuesto» (o «disputa» si llega otro distinto) hasta que
//                                 lo confirme el organizador (premium) o el staff (oficial). Nunca lo confirma el host.
// Interruptor del staff: phoenix_config clave «torneos_resultados» = false → todo responde TORNEOS_PAUSADOS (503).
// Seguridad: service_role salta RLS → la autenticación del dispositivo se valida aquí; las reglas del torneo, en
// public.sistema_torneo_resultado_link (solo service_role puede llamarla).
// No toca la función «liga» (Liga oficial): Link elige a cuál llamar. Contrato completo: docs/web-pes-link/CONTRATO-TORNEOS-LINK.md.
// Hecho por la Cuenta 2 (Claude) a pedido de Fralex, 25-oct-2026.
import { createClient } from "npm:@supabase/supabase-js@2";

const sb = createClient(Deno.env.get("SUPABASE_URL")!, Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!, { auth: { persistSession: false } });
const ROLES_STAFF = ["ayudante", "moderador", "admin"];
const SALAS_VIVAS = ["preparando", "abierta", "en_partida"];

const ERRORES: Record<string, { http: number; mensaje: string; reintentable: boolean }> = {
  TOKEN_FALTANTE: { http: 401, mensaje: "Falta el token de la PC (vincula Phoenix Link).", reintentable: false },
  TOKEN_INVALIDO: { http: 401, mensaje: "El token de esta PC no es válido.", reintentable: false },
  TOKEN_REVOCADO: { http: 401, mensaje: "La vinculación de esta PC fue revocada.", reintentable: false },
  DISPOSITIVO_SUSPENDIDO: { http: 403, mensaje: "Esta PC está suspendida por el staff.", reintentable: false },
  HOST_NO_AUTORIZADO: { http: 403, mensaje: "Tu cuenta no está aprobada como host.", reintentable: false },
  TORNEOS_PAUSADOS: { http: 503, mensaje: "Los resultados de torneos están en pausa por el staff.", reintentable: true },
  RUTA_NO_EXISTE: { http: 404, mensaje: "Ruta desconocida.", reintentable: false },
  METODO_NO_PERMITIDO: { http: 405, mensaje: "Método no permitido.", reintentable: false },
  JSON_INVALIDO: { http: 400, mensaje: "El cuerpo no es JSON válido.", reintentable: false },
  CAMPO_INVALIDO: { http: 400, mensaje: "Falta un dato o no es válido.", reintentable: false },
  PARTIDO_INCOMPLETO: { http: 409, mensaje: "El juego no confirmó que el partido llegara al final.", reintentable: false },
  TORNEO_NO_ENCONTRADO: { http: 404, mensaje: "Ese torneo no existe.", reintentable: false },
  TORNEO_SIN_PERMISO: { http: 403, mensaje: "Ese torneo no es premium ni oficial: sus resultados se anotan a mano.", reintentable: false },
  FORMATO_NO_SOPORTADO: { http: 409, mensaje: "Ese formato de torneo aún no recibe resultados de Phoenix Link.", reintentable: false },
  TORNEO_NO_EN_CURSO: { http: 409, mensaje: "Ese torneo no está en curso.", reintentable: false },
  PARTIDO_NO_ENCONTRADO: { http: 404, mensaje: "Ese partido no existe en el torneo.", reintentable: false },
  CRUCE_SIN_DEFINIR: { http: 409, mensaje: "Ese cruce aún no tiene a los dos jugadores.", reintentable: false },
  YA_JUGADO: { http: 409, mensaje: "Ese partido ya tiene resultado.", reintentable: false },
  MARCADOR_INVALIDO: { http: 400, mensaje: "El marcador no es válido.", reintentable: false },
  DEMASIADOS_INTENTOS: { http: 429, mensaje: "Demasiadas peticiones; espera un momento.", reintentable: true },
  ERROR_INTERNO: { http: 500, mensaje: "Error interno.", reintentable: true },
};
/** Errores que sistema_torneo_resultado_link lanza con su código al inicio del mensaje. */
const CODIGOS_BD = ["TORNEO_NO_ENCONTRADO", "TORNEO_SIN_PERMISO", "FORMATO_NO_SOPORTADO", "TORNEO_NO_EN_CURSO", "PARTIDO_NO_ENCONTRADO",
  "CRUCE_SIN_DEFINIR", "YA_JUGADO", "MARCADOR_INVALIDO"];

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
const enteroOpcional = (v: unknown, campo: string, min: number, max: number): number | null => (v === undefined || v === null ? null : entero(v, campo, min, max));
const texto = (v: unknown, max: number) => (typeof v === "string" ? Array.from(v.replace(/[\u0000-\u001f\u007f]/g, "")).slice(0, max).join("") : "");
const uuid = (v: unknown) => (typeof v === "string" && /^[0-9a-f-]{36}$/i.test(v) ? v : null);
const clavePartido = (v: unknown) => {
  if (typeof v !== "string" || !/^[A-Za-z0-9_.:-]{1,40}$/.test(v)) throw new ErrorApi("CAMPO_INVALIDO", { campo: "clave" });
  return v;
};

type Dispositivo = { id: string; usuario: string };

let cacheInterruptor: { t: number; activo: boolean } | null = null;
async function torneosActivos(): Promise<boolean> {
  if (cacheInterruptor && Date.now() - cacheInterruptor.t < 60_000) return cacheInterruptor.activo;
  const { data, error } = await sb.from("phoenix_config").select("clave, valor").in("clave", ["integracion", "torneos_resultados"]);
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
  if (!(await torneosActivos())) throw new ErrorApi("TORNEOS_PAUSADOS");
  return { id: data.id, usuario: data.usuario };
}

/** La sala (opcional) debe ser de este dispositivo y estar viva; si no, se guarda sin sala. */
async function salaDe(d: Dispositivo, salaId: string | null): Promise<string | null> {
  if (!salaId) return null;
  const { data, error } = await sb.from("salas").select("id, estado").eq("id", salaId).eq("dispositivo", d.id).maybeSingle();
  if (error) { log("warn", "salaDe", { mensaje: error.message }); return null; }
  return data && SALAS_VIVAS.includes(data.estado) ? data.id : null;
}

// ── GET /v1/torneos/partidos ────────────────────────────────────────────────────────────────────────
async function partidos(req: Request) {
  const d = await autenticar(req);
  const { data, error } = await sb.rpc("sistema_torneo_partidos_link", { p_host: d.usuario });
  db(error, "partidos");
  return { partidos: (data as { partidos?: unknown[] } | null)?.partidos ?? [] };
}

// ── POST /v1/torneos/resultado ──────────────────────────────────────────────────────────────────────
async function resultado(req: Request) {
  const d = await autenticar(req);
  frenar(`res:${d.id}`, 10, 60_000);
  const j = await leerJson(req);
  const torneo = entero(j.torneo_id, "torneo_id", 1, Number.MAX_SAFE_INTEGER);
  const clave = clavePartido(j.clave);
  const ga = entero(j.goles_a, "goles_a", 0, 99);
  const gb = entero(j.goles_b, "goles_b", 0, 99);
  if (j.completo !== true) throw new ErrorApi("PARTIDO_INCOMPLETO");
  const juego = (j.juego && typeof j.juego === "object" && !Array.isArray(j.juego)) ? j.juego as Record<string, unknown> : {};
  const pkA = enteroOpcional(juego.pk_a, "juego.pk_a", 0, 99);
  const pkB = enteroOpcional(juego.pk_b, "juego.pk_b", 0, 99);
  const sala = await salaDe(d, uuid(j.sala_id));
  const detalle = {
    nombre_a: texto(juego.nombre_a, 48), nombre_b: texto(juego.nombre_b, 48),
    version_link: texto(j.version_link, 20), dispositivo: d.id,
  };
  const { data, error } = await sb.rpc("sistema_torneo_resultado_link", {
    p_dispositivo: d.id, p_host: d.usuario, p_torneo: torneo, p_clave: clave, p_ga: ga, p_gb: gb,
    p_pk_a: pkA, p_pk_b: pkB, p_sala: sala, p_detalle: detalle,
  });
  db(error, "resultado");
  const r = (data ?? {}) as { estado?: string; repetido?: boolean };
  log("info", "resultado", { torneo, clave, estado: r.estado, repetido: r.repetido, dispositivo: d.id });
  return { estado: r.estado ?? "propuesto", repetido: Boolean(r.repetido) };
}

const RUTAS: Record<string, { metodo: string; fn: (r: Request) => Promise<Record<string, unknown>> }> = {
  "/v1/torneos/partidos": { metodo: "GET", fn: partidos },
  "/v1/torneos/resultado": { metodo: "POST", fn: resultado },
};

Deno.serve(async (req) => {
  const solicitudId = crypto.randomUUID();
  const ruta = new URL(req.url).pathname.replace(/^.*?\/torneos(?=\/v1)/, "").replace(/\/+$/, "");
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

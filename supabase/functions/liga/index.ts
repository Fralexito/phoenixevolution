// Edge Function «liga» (1.3.1: colores de equipo en campo; 1.3.0: ruta campo; 1.2.0: goleador en los goles y pantalla del juego) · Partidos oficiales y marcador EN VIVO desde Phoenix Link.
// URL base: https://fiibiyijojkxqlsrhcil.supabase.co/functions/v1/liga/v1/<ruta>
// Desplegar con verify_jwt = false: Phoenix Link usa su token de dispositivo (Authorization: Bearer phx_…), igual que «phoenix».
// Rutas:
//   GET  /v1/liga/partidos   → partidos oficiales por jugar (fecha en curso + atrasados), con los parsec_id de cada DT si los hay.
//   POST /v1/liga/vivo       → marcador en vivo de la sala (upsert en liga_vivo; la web lo recibe por Realtime).
//   POST /v1/liga/campo      → campo 2D en vivo (posiciones): no escribe en la base, se reenvía por Realtime Broadcast a «campo:<sala_id>».
//   POST /v1/liga/resultado  → resultado del juego para un partido oficial: queda «propuesto» hasta que lo valide
//                              el staff o el árbitro designado (nunca el host). Borra el «en vivo» de la sala.
// Interruptor del staff: phoenix_config clave «liga_resultados» = false → todo responde LIGA_PAUSADA (503).
// Seguridad: service_role salta RLS → toda regla se valida aquí. Host = dispositivo vinculado de un perfil aprobado (como «phoenix»).
// Hecho por el chat LINK (Claude) con autorización de Fralex (11-oct-2026). Documento: docs/LIGA-AUTOMATICA.md.
import { createClient } from "npm:@supabase/supabase-js@2";

const sb = createClient(Deno.env.get("SUPABASE_URL")!, Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!, { auth: { persistSession: false } });
const ROLES_STAFF = ["ayudante", "moderador", "admin"];
const SALAS_VIVAS = ["preparando", "abierta", "en_partida"];
const FASES_VIVO = ["previa", "en_juego", "descanso", "pausado", "final"];
/** En qué parte del juego están (Phoenix Referee v1.2+, migración 103). Opcional: un Link viejo no la manda. */
const PANTALLAS = ["menu", "equipos", "ajustes", "cargando", "saliendo", "en_juego", "descanso", "pausa", "final"];

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
  SALA_NO_ENCONTRADA: { http: 404, mensaje: "La sala no es de esta PC o ya está cerrada.", reintentable: false },
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
/** Nombre del goleador: sin controles y cortado por letras (nunca medio emoji: jsonb lo rechazaría). */
const nombreGol = (v: unknown) => (typeof v === "string" ? Array.from(v.replace(/[\u0000-\u001f\u007f]/g, "")).slice(0, 32).join("").trim() : "");
/** Goles del juego [{m, l:"l"|"v", j?: goleador, pp?: en propia}] (máx. 60). «j» y «pp» llegan con Sider 7.3.4+. */
type GolEntrada = { m: unknown; l?: unknown; j?: unknown; pp?: unknown };
const golesJuego = (v: unknown) => (Array.isArray(v) ? v : []).slice(0, 60)
  .filter((g): g is GolEntrada => !!g && typeof g === "object" && Number.isInteger((g as GolEntrada).m))
  .map((g) => {
    const r: { m: number; l: "l" | "v"; j?: string; pp?: true } = { m: Math.max(0, Math.min(200, g.m as number)), l: g.l === "v" ? "v" : "l" };
    const j = nombreGol(g.j);
    if (j) r.j = j;
    if (g.pp === true) r.pp = true;
    return r;
  });

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

/** La sala debe ser de este dispositivo y estar viva. */
async function salaDe(d: Dispositivo, salaId: string | null): Promise<string | null> {
  if (!salaId) return null;
  const { data, error } = await sb.from("salas").select("id, estado").eq("id", salaId).eq("dispositivo", d.id).maybeSingle();
  db(error, "salaDe");
  if (!data || !SALAS_VIVAS.includes(data.estado)) throw new ErrorApi("SALA_NO_ENCONTRADA");
  return data.id;
}

// ── GET /v1/liga/partidos ───────────────────────────────────────────────────────────────────────────
async function partidos(req: Request) {
  const d = await autenticar(req);
  const { data: eds, error } = await sb.from("liga_ediciones").select("id, nombre").eq("estado", "en_curso");
  db(error, "ediciones");
  const salida: unknown[] = [];
  for (const ed of eds ?? []) {
    const { data: ps, error: e2 } = await sb.from("liga_partidos")
      .select("id, fecha, local, visitante, estado, goles_local, goles_visita").eq("edicion_id", ed.id).order("fecha").order("id");
    db(e2, "partidos");
    const lista = ps ?? [];
    const maxJugada = lista.filter((p) => p.estado === "confirmado").reduce((a, p) => Math.max(a, p.fecha), 0);
    const porJugar = lista.filter((p) => ["pendiente", "disputa", "propuesto"].includes(p.estado) && p.fecha <= maxJugada + 1);
    const { data: part, error: e3 } = await sb.from("liga_participantes").select("nombre, club, usuario").eq("edicion_id", ed.id);
    db(e3, "participantes");
    const usuarios = (part ?? []).map((x) => x.usuario).filter(Boolean) as string[];
    const parsec = new Map<string, string[]>();
    if (usuarios.length) {
      const { data: cp, error: e4 } = await sb.from("cuentas_parsec").select("usuario, parsec_id").in("usuario", usuarios);
      db(e4, "parsec");
      for (const c of cp ?? []) parsec.set(c.usuario, [...(parsec.get(c.usuario) ?? []), c.parsec_id]);
    }
    const info = new Map((part ?? []).map((x) => [x.nombre, x]));
    const dt = (nombre: string) => {
      const x = info.get(nombre);
      return { nombre, club: x?.club ?? "", parsec: x?.usuario ? (parsec.get(x.usuario) ?? []) : [], mio: x?.usuario === d.usuario };
    };
    for (const p of porJugar) {
      salida.push({ id: p.id, edicion: ed.id, edicion_nombre: ed.nombre, fecha: p.fecha, estado: p.estado,
        local: dt(p.local), visitante: dt(p.visitante) });
    }
  }
  return { partidos: salida };
}

// ── POST /v1/liga/vivo ──────────────────────────────────────────────────────────────────────────────
async function vivo(req: Request) {
  const d = await autenticar(req);
  frenar(`vivo:${d.id}`, 30, 60_000);   // como mucho 1 cada 2 s de media (Link manda solo en goles, fases y cada minuto)
  const j = await leerJson(req);
  const sala = await salaDe(d, uuid(j.sala_id));
  if (!sala) throw new ErrorApi("CAMPO_INVALIDO", { campo: "sala_id" });
  if (j.terminado === true) {
    const { error } = await sb.from("liga_vivo").delete().eq("sala_id", sala);
    db(error, "vivo.borrar");
    return { borrado: true };
  }
  const fase = typeof j.fase === "string" && FASES_VIVO.includes(j.fase) ? j.fase : "en_juego";
  let partidoId: number | null = null;
  if (j.partido_id !== undefined && j.partido_id !== null) {
    partidoId = entero(j.partido_id, "partido_id", 1, Number.MAX_SAFE_INTEGER);
    const { data, error } = await sb.from("liga_partidos").select("id").eq("id", partidoId).maybeSingle();
    db(error, "vivo.partido");
    if (!data) throw new ErrorApi("PARTIDO_NO_ENCONTRADO");
  }
  const fila = {
    sala_id: sala, partido_id: partidoId,
    local: texto(j.local, 40), visitante: texto(j.visitante, 40),
    goles_local: entero(j.goles_local, "goles_local", 0, 99), goles_visita: entero(j.goles_visita, "goles_visita", 0, 99),
    minuto: entero(j.minuto ?? 0, "minuto", 0, 200), periodo: entero(j.periodo ?? 0, "periodo", 0, 5),
    fase, goles: golesJuego(j.goles), actualizado: new Date().toISOString(),
    pantalla: typeof j.pantalla === "string" && PANTALLAS.includes(j.pantalla) ? j.pantalla : null,
  };
  const { error } = await sb.from("liga_vivo").upsert(fila, { onConflict: "sala_id" });
  db(error, "vivo.guardar");
  return { guardado: true };
}

// ── POST /v1/liga/campo ─────────────────────────────────────────────────────────────────────────────
// Campo 2D en vivo (Phoenix Link ≥ 0.2.21): posiciones de las fichitas y el balón. NO escribe en la base: se reenvía por Realtime
// Broadcast al canal público de solo lectura «campo:<sala_id>» (evento «campo»). Sin nombres de cuentas ni ids de Parsec.
const FASES_CAMPO = ["vivo", "repeticion", "otro", "pausa"];
const num = (v: unknown, min: number, max: number) => typeof v === "number" && Number.isFinite(v) && v >= min && v <= max;
async function campo(req: Request) {
  const d = await autenticar(req, false);
  const j = await leerJson(req);
  const sala = await salaDe(d, uuid(j.sala_id));
  if (!sala) throw new ErrorApi("CAMPO_INVALIDO", { campo: "sala_id" });
  frenar(`campo:${sala}`, 2, 1_000);   // 2 por segundo por sala
  if (!Array.isArray(j.j) || j.j.length > 30) throw new ErrorApi("CAMPO_INVALIDO", { campo: "j" });
  const fichas: number[][] = [];
  for (const p of j.j) {
    if (!Array.isArray(p) || p.length < 3 || !num(p[0], -80, 80) || !num(p[1], -60, 60) || !Number.isInteger(p[2]) || p[2] < -1 || p[2] > 2)
      throw new ErrorApi("CAMPO_INVALIDO", { campo: "j" });
    fichas.push([p[0], p[1], p[2]]);
  }
  let b: number[] | null = null;
  if (j.b !== null && j.b !== undefined) {
    if (!Array.isArray(j.b) || j.b.length < 3 || !num(j.b[0], -80, 80) || !num(j.b[1], -60, 60) || !num(j.b[2], -5, 60)) throw new ErrorApi("CAMPO_INVALIDO", { campo: "b" });
    b = [j.b[0], j.b[1], j.b[2]];
  }
  const carga: Record<string, unknown> = { v: 1, j: fichas, b, equipos: j.equipos === true, fase: typeof j.fase === "string" && FASES_CAMPO.includes(j.fase) ? j.fase : "vivo" };
  if (j.posesion !== undefined && j.posesion !== null) {
    if (!Array.isArray(j.posesion) || j.posesion.length !== 2 || !num(j.posesion[0], 0, 100) || !num(j.posesion[1], 0, 100)) throw new ErrorApi("CAMPO_INVALIDO", { campo: "posesion" });
    carga.posesion = [j.posesion[0], j.posesion[1]];
  }
  if (Array.isArray(j.c) && j.c.length === 2 && j.c.every((x) => typeof x === "string" && /^#[0-9a-fA-F]{6}$/.test(x))) carga.c = [j.c[0], j.c[1]];   // colores de camiseta de A y B (Link ≥ 0.2.30)
  const t = j.t as { l?: unknown; e?: unknown; listo?: unknown; vuelo?: unknown } | undefined;
  if (t && typeof t === "object") {
    const l = (Array.isArray(t.l) ? t.l : []).slice(0, 30).filter((x) => Array.isArray(x) && (x[0] === 0 || x[0] === 1)).map((x) => [x[0], x[1] === true || x[1] === 1 ? 1 : 0]);
    carga.t = { l, e: t.e === 1 ? 1 : 0, listo: t.listo === true, vuelo: t.vuelo === true };
  }
  const r = await fetch(`${Deno.env.get("SUPABASE_URL")}/realtime/v1/api/broadcast`, {
    method: "POST",
    headers: { "content-type": "application/json", apikey: Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!, authorization: `Bearer ${Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!}` },
    body: JSON.stringify({ messages: [{ topic: `campo:${sala}`, event: "campo", payload: carga, private: false }] }),
  });
  if (!r.ok) { log("warn", "campo.broadcast", { estado: r.status }); throw new ErrorApi("ERROR_INTERNO"); }
  return {};
}

// ── POST /v1/liga/resultado ─────────────────────────────────────────────────────────────────────────
async function resultado(req: Request) {
  const d = await autenticar(req);
  frenar(`res:${d.id}`, 10, 60_000);
  const j = await leerJson(req);
  const id = entero(j.partido_id, "partido_id", 1, Number.MAX_SAFE_INTEGER);
  const gl = entero(j.goles_local, "goles_local", 0, 99);
  const gv = entero(j.goles_visita, "goles_visita", 0, 99);
  if (j.completo !== true) throw new ErrorApi("PARTIDO_INCOMPLETO");
  let sala: string | null = null;
  try { sala = await salaDe(d, uuid(j.sala_id)); } catch { sala = null; }   // la sala puede haberse cerrado justo al terminar

  const { data: p, error } = await sb.from("liga_partidos").select("id, estado, goles_local, goles_visita, detalle").eq("id", id).maybeSingle();
  db(error, "resultado.partido");
  if (!p) throw new ErrorApi("PARTIDO_NO_ENCONTRADO");
  if (p.estado === "confirmado" || p.estado === "anulado") throw new ErrorApi("YA_CONFIRMADO");

  const juego = (j.juego && typeof j.juego === "object") ? j.juego as Record<string, unknown> : {};
  const detalle = {
    ...(p.detalle ?? {}),
    juego: {
      goles: golesJuego(juego.goles),
      pk_local: Number.isInteger(juego.pk_local) ? juego.pk_local : null,
      pk_visita: Number.isInteger(juego.pk_visita) ? juego.pk_visita : null,
      nombre_local: texto(juego.nombre_local, 48), nombre_visita: texto(juego.nombre_visita, 48),
      host: d.usuario, version_link: texto(j.version_link, 20),
    },
    doctor: (j.doctor && typeof j.doctor === "object") ? j.doctor : null,   // solo informativo hasta que exista el parche oficial
  };

  let estado = "propuesto";
  let repetido = false;
  if (p.estado === "propuesto") {
    if (p.goles_local === gl && p.goles_visita === gv) repetido = true;   // idempotente: la misma propuesta
    else estado = "disputa";                                              // dos propuestas distintas → decide el staff
  }
  if (!repetido) {
    const { error: e2 } = await sb.from("liga_partidos").update({
      goles_local: gl, goles_visita: gv, estado, origen: "link", detalle,
      sala_id: sala, dispositivo: d.id, propuesto_en: new Date().toISOString(),
    }).eq("id", id);
    db(e2, "resultado.guardar");
  }
  if (sala) {
    const { error: e3 } = await sb.from("liga_vivo").delete().eq("sala_id", sala);
    if (e3) log("warn", "resultado.vivo", { mensaje: e3.message });
  }
  log("info", "resultado", { partido: id, estado, repetido, dispositivo: d.id });
  return { estado: repetido ? "propuesto" : estado, repetido };
}

const RUTAS: Record<string, { metodo: string; fn: (r: Request) => Promise<Record<string, unknown>> }> = {
  "/v1/liga/partidos": { metodo: "GET", fn: partidos },
  "/v1/liga/vivo": { metodo: "POST", fn: vivo },
  "/v1/liga/campo": { metodo: "POST", fn: campo },
  "/v1/liga/resultado": { metodo: "POST", fn: resultado },
};

Deno.serve(async (req) => {
  const solicitudId = crypto.randomUUID();
  const ruta = new URL(req.url).pathname.replace(/^.*?\/liga(?=\/v1)/, "").replace(/\/+$/, "");
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

// Edge Function «phoenix» · API /v1 para Smash Soda (módulo 2, fase 2.2). Contrato: claude/contrato-v1.md.
// URL base: https://fiibiyijojkxqlsrhcil.supabase.co/functions/v1/phoenix/v1/<ruta>
// Desplegar con verify_jwt = false: la app NO usa sesión de Supabase, usa su token de dispositivo (Authorization: Bearer phx_…).
// Variables: SUPABASE_URL y SUPABASE_SERVICE_ROLE_KEY (las inyecta Supabase solas). Ninguna otra.
// Seguridad: el service_role salta RLS, así que TODA regla de negocio se valida aquí antes de escribir.
import { createClient } from "npm:@supabase/supabase-js@2";
import {
  CONFIG, ErrorApi, cuerpoError, compararVersion, v, ESTADOS_LATIDO, VISIBILIDADES_APP,
  limpiarInvitados, limpiarEventos, construirRoles, fusionarConfig, evaluarBuild,
} from "./_lib/nucleo.js";

const sb = createClient(Deno.env.get("SUPABASE_URL")!, Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!, { auth: { persistSession: false } });
const ROLES_STAFF = ["ayudante", "moderador", "admin"];
const VIVAS = ["preparando", "abierta", "en_partida"];

// ── Utilidades ───────────────────────────────────────────────────────────────────────────────────────────────────────────
const hex = (b: ArrayBuffer) => [...new Uint8Array(b)].map((x) => x.toString(16).padStart(2, "0")).join("");
const sha256 = async (t: string) => hex(await crypto.subtle.digest("SHA-256", new TextEncoder().encode(t)));
function tokenNuevo(): string {
  const b = crypto.getRandomValues(new Uint8Array(32));
  return "phx_" + btoa(String.fromCharCode(...b)).replace(/\+/g, "-").replace(/\//g, "_").replace(/=+$/, "");
}
const log = (nivel: "info" | "warn" | "error", evento: string, datos: Record<string, unknown>) =>
  console[nivel](JSON.stringify({ nivel, evento, ...datos, t: new Date().toISOString() }));

/** Límite de ritmo en memoria (por instancia). Es un freno de cortesía; el freno duro está en la BD (latido mínimo, intentos). */
const cubos = new Map<string, { n: number; desde: number }>();
function frenar(clave: string, max: number, ventanaMs: number) {
  const ahora = Date.now(); const c = cubos.get(clave);
  if (!c || ahora - c.desde > ventanaMs) { cubos.set(clave, { n: 1, desde: ahora }); if (cubos.size > 5000) cubos.clear(); return; }
  if (++c.n > max) throw new ErrorApi("DEMASIADOS_INTENTOS", { reintentar_en: Math.ceil((c.desde + ventanaMs - ahora) / 1000) });
}

async function leerJson(req: Request): Promise<Record<string, unknown>> {
  const t = await req.text();
  if (t.length > 64_000) throw new ErrorApi("CAMPO_INVALIDO", { campo: "cuerpo", mensaje: "Cuerpo demasiado grande (máx. 64 KB)." });
  try { const j = JSON.parse(t || "{}"); if (!j || typeof j !== "object" || Array.isArray(j)) throw 0; return j; }
  catch { throw new ErrorApi("JSON_INVALIDO"); }
}
const db = (error: { message: string } | null, contexto: string) => {
  if (error) { log("error", "bd", { contexto, mensaje: error.message }); throw new ErrorApi("ERROR_INTERNO"); }
};

type Dispositivo = { id: string; usuario: string; nombre: string };

/** Config efectiva = fija (nucleo.js) + phoenix_config (la cambia el staff desde la web). Caché 60 s por instancia. */
let cacheCfg: { t: number; cfg: ReturnType<typeof fusionarConfig>; builds: { huella_sha256: string; version: string; activo: boolean }[] } | null = null;
async function cfgVigente() {
  if (cacheCfg && Date.now() - cacheCfg.t < 60_000) return cacheCfg;
  try {
    const [{ data: filas, error: e1 }, { data: builds, error: e2 }] = await Promise.all([
      sb.from("phoenix_config").select("clave, valor"), sb.from("builds_oficiales").select("huella_sha256, version, activo"),
    ]);
    if (e1 || e2) throw new Error((e1 ?? e2)!.message);
    cacheCfg = { t: Date.now(), cfg: fusionarConfig(CONFIG, filas ?? []), builds: builds ?? [] };
  } catch (err) {
    log("error", "config_bd", { mensaje: String((err as Error).message) });
    if (!cacheCfg) cacheCfg = { t: Date.now() - 50_000, cfg: fusionarConfig(CONFIG, []), builds: [] };   // sin BD: config fija, reintenta en 10 s
  }
  return cacheCfg;
}

/** Versión + build de la app (cabeceras o cuerpo). Lanza APP_DESACTUALIZADA / BUILD_* / VERSION_DESACTIVADA. */
async function controlarApp(version: string | null, huellaCruda: unknown) {
  const { cfg, builds } = await cfgVigente();
  if (version && compararVersion(version, cfg.version_app_min) < 0) throw new ErrorApi("APP_DESACTUALIZADA");
  const fallo = evaluarBuild({ huella: v.huella(huellaCruda), version, builds, exigir: cfg.exigir_build });
  if (fallo) throw new ErrorApi(fallo);
}

/** Token → dispositivo válido de un host aprobado, con app al día. */
async function autenticar(req: Request): Promise<Dispositivo> {
  const m = /^Bearer\s+(phx_[A-Za-z0-9_-]{20,100})$/.exec(req.headers.get("authorization") ?? "");
  if (!m) throw new ErrorApi(req.headers.get("authorization") ? "TOKEN_INVALIDO" : "TOKEN_FALTANTE");
  const ver = req.headers.get("x-phoenix-version");
  await controlarApp(ver, req.headers.get("x-phoenix-build"));
  const { data, error } = await sb.from("dispositivos_host").select("id, usuario, nombre, revocado, suspendido").eq("huella_token", await sha256(m[1])).maybeSingle();
  db(error, "autenticar");
  if (!data) throw new ErrorApi("TOKEN_INVALIDO");
  if (data.revocado) throw new ErrorApi("TOKEN_REVOCADO");
  if (data.suspendido) throw new ErrorApi("DISPOSITIVO_SUSPENDIDO");
  frenar(`d:${data.id}`, 120, 60_000);
  const { data: p, error: e2 } = await sb.from("perfiles").select("host_aprobado, rol").eq("id", data.usuario).maybeSingle();
  db(e2, "autenticar.perfil");
  if (!p || !(p.host_aprobado || ROLES_STAFF.includes(p.rol))) throw new ErrorApi("HOST_NO_AUTORIZADO");
  sb.from("dispositivos_host").update({ ultimo_uso: new Date().toISOString(), ...(ver ? { version_app: ver.slice(0, 20) } : {}) }).eq("id", data.id)
    .then(({ error }) => error && log("warn", "ultimo_uso", { mensaje: error.message }));
  return { id: data.id, usuario: data.usuario, nombre: data.nombre };
}

async function salaPropia(d: Dispositivo, salaId: string) {
  const { data, error } = await sb.from("salas").select("id, estado, reto_id, region, host, latido").eq("id", salaId).eq("dispositivo", d.id).maybeSingle();
  db(error, "salaPropia");
  if (!data) throw new ErrorApi("SALA_NO_ENCONTRADA");
  return data;
}

async function registrarEvento(salaId: string, tipo: string, clave: string, datos: Record<string, unknown> = {}) {
  const { error } = await sb.from("eventos_sala").upsert({ sala_id: salaId, tipo, clave_idempotencia: clave, datos }, { onConflict: "clave_idempotencia", ignoreDuplicates: true });
  if (error) log("warn", "evento_sistema", { salaId, tipo, mensaje: error.message });
}

/** Mapa parsec_id → usuario (para atribuir muestras y eventos a perfiles). */
async function usuariosPorParsec(ids: string[]): Promise<Map<string, string>> {
  if (!ids.length) return new Map();
  const { data, error } = await sb.from("cuentas_parsec").select("usuario, parsec_id").in("parsec_id", ids);
  db(error, "usuariosPorParsec");
  return new Map((data ?? []).map((r) => [r.parsec_id, r.usuario]));
}

/** Roles de una sala: libre (sin reto) o la lista firmada del reto. */
async function rolesDe(retoId: number | null) {
  if (!retoId) return { modo: "libre", jugadores: [], espectadores: [] };
  const { data: r, error } = await sb.from("retos_matchmaking").select("retador_id, rival_id").eq("id", retoId).maybeSingle();
  db(error, "roles.reto");
  const { data: rp, error: e2 } = await sb.from("reto_participantes").select("usuario_id, equipo").eq("reto_id", retoId).eq("estado", "CONFIRMADO").in("equipo", ["A", "B"]).order("created_at");
  db(e2, "roles.participantes");
  const { data: esp, error: e3 } = await sb.from("reto_espectadores").select("usuario_id").eq("reto_id", retoId).eq("estado", "APROBADO");
  db(e3, "roles.espectadores");
  const { data: st, error: e4 } = await sb.from("perfiles").select("id").in("rol", ROLES_STAFF);
  db(e4, "roles.staff");
  const participantes = [
    ...(r?.retador_id ? [{ usuario_id: r.retador_id, lado: "A" }] : []),
    ...(r?.rival_id ? [{ usuario_id: r.rival_id, lado: "B" }] : []),
    ...(rp ?? []).map((x) => ({ usuario_id: x.usuario_id, lado: x.equipo })),
  ];
  const todos = [...new Set([...participantes.map((p) => p.usuario_id), ...(esp ?? []).map((e) => e.usuario_id), ...(st ?? []).map((s) => s.id)])];
  const [{ data: cp, error: e5 }, { data: pf, error: e6 }] = await Promise.all([
    sb.from("cuentas_parsec").select("usuario, parsec_id").in("usuario", todos),
    sb.from("perfiles").select("id, nombre_display, username").in("id", todos),
  ]);
  db(e5, "roles.parsec"); db(e6, "roles.nombres");
  return construirRoles({
    participantes,
    espectadores: (esp ?? []).map((e) => e.usuario_id),
    staff: (st ?? []).map((s) => s.id),
    parsec: new Map((cp ?? []).map((c) => [c.usuario, c.parsec_id])),
    nombres: new Map((pf ?? []).map((p) => [p.id, p.nombre_display || p.username])),
  });
}

// ── Rutas ────────────────────────────────────────────────────────────────────────────────────────────────────────────────
async function emparejar(req: Request) {
  const ip = req.headers.get("x-forwarded-for")?.split(",")[0]?.trim() ?? "?";
  frenar(`ip:${ip}`, 10, 10 * 60_000);
  const b = await leerJson(req);
  const codigo = v.codigo(b.codigo);
  const nombre = v.texto(b.nombre_pc, "nombre_pc", { max: CONFIG.limites.nombre_pc_max }) ?? "Mi PC";
  const version = v.texto(b.version_app, "version_app", { max: 20 });
  await controlarApp(version ?? req.headers.get("x-phoenix-version"), req.headers.get("x-phoenix-build"));
  const { data: c, error } = await sb.from("codigos_emparejamiento").select("id, usuario, expira, usado").eq("codigo_huella", await sha256(codigo)).maybeSingle();
  db(error, "emparejar.codigo");
  if (!c) { log("warn", "emparejar_fallido", { ip }); throw new ErrorApi("CODIGO_NO_ENCONTRADO"); }
  if (c.usado) throw new ErrorApi("CODIGO_USADO");
  if (Date.parse(c.expira) <= Date.now()) throw new ErrorApi("CODIGO_VENCIDO");
  // Marcar usado de forma atómica: si dos PCs mandan el mismo código a la vez, solo una gana.
  const { data: marcado, error: e2 } = await sb.from("codigos_emparejamiento").update({ usado: new Date().toISOString() }).eq("id", c.id).is("usado", null).select("id");
  db(e2, "emparejar.marcar");
  if (!marcado?.length) throw new ErrorApi("CODIGO_USADO");
  const { data: p, error: e3 } = await sb.from("perfiles").select("host_aprobado, rol, nombre_display, username").eq("id", c.usuario).maybeSingle();
  db(e3, "emparejar.perfil");
  if (!p || !(p.host_aprobado || ROLES_STAFF.includes(p.rol))) throw new ErrorApi("HOST_NO_AUTORIZADO");
  const token = tokenNuevo();
  const { data: d, error: e4 } = await sb.from("dispositivos_host").insert({ usuario: c.usuario, huella_token: await sha256(token), nombre, version_app: version }).select("id").single();
  db(e4, "emparejar.dispositivo");
  log("info", "emparejado", { dispositivo: d!.id, usuario: c.usuario });
  return { token, dispositivo_id: d!.id, usuario: { id: c.usuario, nombre: p.nombre_display || p.username } };
}

async function abrir(req: Request) {
  const d = await autenticar(req); const b = await leerJson(req);
  const fila = {
    juego: v.texto(b.juego, "juego"), parche: v.texto(b.parche, "parche"), region: v.texto(b.region, "region", { max: 40 }),
    plazas_total: v.entero(b.plazas_total, "plazas_total", { min: 1, max: 16, opcional: false }),
    visibilidad: v.enumerado(b.visibilidad, "visibilidad", VISIBILIDADES_APP) ?? "amigos",
    limite_espectadores: v.entero(b.limite_espectadores, "limite_espectadores", { min: 0, max: 16 }) ?? 4,
    publicar_en_pagina: v.booleano(b.publicar_en_pagina, "publicar_en_pagina", true),
    avisar_amigos_host: v.booleano(b.avisar_amigos_host, "avisar_amigos_host", false),
    avisar_amigos_jugadores: v.booleano(b.avisar_amigos_jugadores, "avisar_amigos_jugadores", false),
    anunciar_discord: v.booleano(b.anunciar_discord, "anunciar_discord", false),
  };
  const enlace = v.enlace(b.enlace, "enlace");
  const retoId = v.entero(b.reto_id, "reto_id", { min: 1 });
  if (retoId) {
    const { data: r, error } = await sb.from("retos_matchmaking").select("estado, host_id, retador_id, rival_id").eq("id", retoId).maybeSingle();
    db(error, "abrir.reto");
    const esJugador = r && [r.retador_id, r.rival_id].includes(d.usuario);
    const valido = r && ["ACEPTADO", "EN_JUEGO"].includes(r.estado) && (r.host_id ? r.host_id === d.usuario : esJugador);
    if (!valido) throw new ErrorApi("RETO_NO_VALIDO");
  }
  const ahora = new Date().toISOString();
  // ¿Esta PC ya tiene una sala viva? → se reabre la misma (la app pudo reiniciarse).
  const { data: viva, error: e1 } = await sb.from("salas").select("id").eq("dispositivo", d.id).in("estado", VIVAS).maybeSingle();
  db(e1, "abrir.viva");
  let salaId: string; let reabierta = false;
  const cambios = { ...fila, estado: "abierta", latido: ahora, plazas_libres: fila.plazas_total, reto_id: retoId ?? null };
  if (viva) {
    const { error } = await sb.from("salas").update(cambios).eq("id", viva.id); db(error, "abrir.reabrir");
    salaId = viva.id; reabierta = true;
  } else {
    const { data, error } = await sb.from("salas").insert({ ...cambios, host: d.usuario, dispositivo: d.id, abierta_en: ahora }).select("id").single();
    db(error, "abrir.crear"); salaId = data!.id;
  }
  if (enlace) { const { error } = await sb.from("salas_enlace").upsert({ sala_id: salaId, enlace, actualizado: ahora }); db(error, "abrir.enlace"); }
  await registrarEvento(salaId, "abrir", `abrir-${salaId}-${Date.now()}`, { reabierta, reto_id: retoId ?? null });
  // Avisos: una sola vez por sala (reabrir no vuelve a avisar). Un fallo aquí NUNCA impide abrir la sala.
  let avisos: Record<string, unknown> = { enviado: false, motivo: "ERROR" };
  try {
    const { data, error } = await sb.rpc("sistema_avisar_sala", { p_sala: salaId });
    if (error) throw new Error(error.message);
    avisos = data as Record<string, unknown>;
  } catch (err) { log("warn", "avisos_sala", { salaId, mensaje: String((err as Error).message) }); }
  log("info", "sala_abierta", { salaId, dispositivo: d.id, reabierta, retoId, avisos });
  const { cfg } = await cfgVigente();
  return { sala_id: salaId, reabierta, estado: "abierta", visibilidad: fila.visibilidad, limite_espectadores: fila.limite_espectadores,
           preferencias: { publicar_en_pagina: fila.publicar_en_pagina, avisar_amigos_host: fila.avisar_amigos_host,
                           avisar_amigos_jugadores: fila.avisar_amigos_jugadores, anunciar_discord: fila.anunciar_discord },
           avisos, latido_seg: cfg.intervalos.latido_seg, roles: await rolesDe(retoId) };
}

async function latido(req: Request) {
  const d = await autenticar(req); const b = await leerJson(req);
  const sala = await salaPropia(d, v.uuid(b.sala_id, "sala_id"));
  if (!VIVAS.includes(sala.estado)) throw new ErrorApi("SALA_CERRADA");
  const estado = v.enumerado(b.estado, "estado", ESTADOS_LATIDO, { opcional: false });
  const plazas_libres = v.entero(b.plazas_libres, "plazas_libres", { min: 0, max: 16, opcional: false });
  const invitados = limpiarInvitados(b.invitados);
  const enlace = v.enlace(b.enlace, "enlace");
  const { cfg } = await cfgVigente();
  const desde = Date.now() - Date.parse(sala.latido);
  if (desde < cfg.intervalos.latido_min_seg * 1000 && sala.estado !== "preparando") {
    throw new ErrorApi("DEMASIADOS_INTENTOS", { reintentar_en: Math.ceil((cfg.intervalos.latido_min_seg * 1000 - desde) / 1000) });
  }
  const ahora = new Date().toISOString();
  const { error } = await sb.from("salas").update({ estado, plazas_libres, latido: ahora }).eq("id", sala.id).in("estado", VIVAS);
  db(error, "latido.sala");
  if (enlace) { const { error: e } = await sb.from("salas_enlace").upsert({ sala_id: sala.id, enlace, actualizado: ahora }); db(e, "latido.enlace"); }
  if (cfg.interruptores.muestras_calidad && invitados.length) {
    const quien = await usuariosPorParsec(invitados.map((g) => g.parsec_id));
    const filas = invitados.filter((g) => g.ping_ms !== null).map((g) => ({
      sala_id: sala.id, host: sala.host, region: sala.region, actor_parsec: g.parsec_id, usuario: quien.get(g.parsec_id) ?? null,
      ping_ms: g.ping_ms, fast_rts: g.fast_rts, slow_rts: g.slow_rts, bitrate_kbps: g.bitrate_kbps, tomada: ahora,
    }));
    if (filas.length) { const { error: e } = await sb.from("muestras_calidad").insert(filas); if (e) log("warn", "muestras", { mensaje: e.message }); }
    // Verificación de cuenta Parsec: si el ID declarado entra a una sala de reto donde ese jugador tiene rol, queda «verificada».
    if (sala.reto_id && quien.size) {
      const roles = await rolesDe(sala.reto_id);
      const conRol = new Set([...roles.jugadores, ...roles.espectadores].map((r) => r.usuario_id));
      const verificar = [...quien.entries()].filter(([, u]) => conRol.has(u)).map(([pid]) => pid);
      if (verificar.length) {
        const { error: e } = await sb.from("cuentas_parsec").update({ estado: "verificada", verificada_en: ahora }).in("parsec_id", verificar).eq("estado", "declarada");
        if (e) log("warn", "verificar_parsec", { mensaje: e.message });
      }
    }
  }
  return { estado, latido_seg: cfg.intervalos.latido_seg, servidor_hora: ahora };
}

async function cerrar(req: Request) {
  const d = await autenticar(req); const b = await leerJson(req);
  const sala = await salaPropia(d, v.uuid(b.sala_id, "sala_id"));
  const motivo = v.texto(b.motivo, "motivo", { max: 120 });
  if (!VIVAS.includes(sala.estado)) return { ya_cerrada: true, estado: sala.estado };
  const { error } = await sb.from("salas").update({ estado: "cerrada", cerrada_en: new Date().toISOString() }).eq("id", sala.id);
  db(error, "cerrar");
  await registrarEvento(sala.id, "cerrar", `cerrar-${sala.id}`, { motivo });
  log("info", "sala_cerrada", { salaId: sala.id });
  return { ya_cerrada: false, estado: "cerrada" };
}

async function eventos(req: Request) {
  const d = await autenticar(req); const b = await leerJson(req);
  const sala = await salaPropia(d, v.uuid(b.sala_id, "sala_id"));
  const { cfg } = await cfgVigente();
  if (Array.isArray(b.eventos) && b.eventos.length > cfg.intervalos.eventos_lote_max) throw new ErrorApi("LOTE_DEMASIADO_GRANDE");
  const { validos, rechazados } = limpiarEventos(b.eventos);
  if (!validos.length) return { aceptados: 0, duplicados: 0, rechazados };
  const quien = await usuariosPorParsec([...new Set(validos.map((e) => e.actor_parsec).filter(Boolean))] as string[]);
  const filas = validos.map((e) => ({ sala_id: sala.id, tipo: e.tipo, actor_parsec: e.actor_parsec, usuario: e.actor_parsec ? quien.get(e.actor_parsec) ?? null : null,
                                      datos: e.datos, ocurrido: e.ocurrido, clave_idempotencia: e.clave }));
  const { data, error } = await sb.from("eventos_sala").upsert(filas, { onConflict: "clave_idempotencia", ignoreDuplicates: true }).select("id");
  db(error, "eventos");
  const aceptados = data?.length ?? 0;
  return { aceptados, duplicados: validos.length - aceptados, rechazados };
}

/** Config pública + (si viene token) estado de ESTA PC y de ESTE build. Nunca falla por el token: lo informa. */
async function config(req: Request) {
  const { cfg, builds } = await cfgVigente();
  const ver = req.headers.get("x-phoenix-version");
  let huella: string | null = null; let build = "sin_dato";
  try { huella = v.huella(req.headers.get("x-phoenix-build")); } catch { build = "huella_invalida"; }
  if (build !== "huella_invalida") {
    const fallo = evaluarBuild({ huella, version: ver, builds, exigir: cfg.exigir_build });
    build = fallo === "BUILD_DESACTIVADO" ? "desactivado" : fallo === "VERSION_DESACTIVADA" ? "version_desactivada"
          : fallo === "BUILD_NO_OFICIAL" ? "no_oficial" : huella && builds.some((x) => x.huella_sha256 === huella) ? "oficial" : "sin_verificar";
  }
  let dispositivo = "sin_token";
  const m = /^Bearer\s+(phx_[A-Za-z0-9_-]{20,100})$/.exec(req.headers.get("authorization") ?? "");
  if (m) {
    const { data, error } = await sb.from("dispositivos_host").select("revocado, suspendido").eq("huella_token", await sha256(m[1])).maybeSingle();
    db(error, "config.dispositivo");
    dispositivo = !data ? "desconocido" : data.revocado ? "revocado" : data.suspendido ? "suspendido" : "activo";
  }
  const app = !ver ? "sin_dato" : compararVersion(ver, cfg.version_app_min) < 0 ? "desactualizada"
            : compararVersion(ver, cfg.version_app_recomendada) < 0 ? "actualizable" : "al_dia";
  return { version_api: CONFIG.version_api, version_app_min: cfg.version_app_min, version_app_recomendada: cfg.version_app_recomendada,
           exigir_build: cfg.exigir_build, intervalos: cfg.intervalos, interruptores: cfg.interruptores, limites: CONFIG.limites,
           estado: { app, build, dispositivo }, servidor_hora: new Date().toISOString() };
}

const RUTAS: Record<string, { metodo: string; fn: (req: Request) => unknown }> = {
  "/v1/emparejar": { metodo: "POST", fn: emparejar },
  "/v1/sala/abrir": { metodo: "POST", fn: abrir },
  "/v1/sala/latido": { metodo: "POST", fn: latido },
  "/v1/sala/cerrar": { metodo: "POST", fn: cerrar },
  "/v1/eventos": { metodo: "POST", fn: eventos },
  "/v1/config": { metodo: "GET", fn: config },
};

Deno.serve(async (req) => {
  const solicitudId = crypto.randomUUID();
  const cab = { "content-type": "application/json; charset=utf-8", "x-request-id": solicitudId, "cache-control": "no-store" };
  const ruta = new URL(req.url).pathname.replace(/^.*?\/phoenix(?=\/)/, "").replace(/\/+$/, "");
  const t0 = Date.now();
  try {
    const r = RUTAS[ruta];
    if (!r) throw new ErrorApi("RUTA_NO_EXISTE");
    if (req.method !== r.metodo) throw new ErrorApi("METODO_NO_PERMITIDO");
    const datos = await r.fn(req);
    log("info", "ok", { ruta, ms: Date.now() - t0, solicitudId });
    return new Response(JSON.stringify({ ok: true, ...(datos as object), solicitud_id: solicitudId }), { status: 200, headers: cab });
  } catch (err) {
    const e = err instanceof ErrorApi ? err : new ErrorApi("ERROR_INTERNO");
    if (!(err instanceof ErrorApi)) log("error", "excepcion", { ruta, solicitudId, mensaje: String((err as Error)?.message ?? err) });
    else log(e.http >= 500 ? "error" : "warn", "rechazo", { ruta, codigo: e.codigo, campo: e.campo, solicitudId });
    const h = e.reintentar_en ? { ...cab, "retry-after": String(e.reintentar_en) } : cab;
    return new Response(JSON.stringify(cuerpoError(e, solicitudId)), { status: e.http, headers: h });
  }
});

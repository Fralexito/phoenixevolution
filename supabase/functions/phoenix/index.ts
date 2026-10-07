// Edge Function «phoenix» · API /v1 para Smash Soda (módulo 2, fase 2.2). Contrato: claude/contrato-v1.md.
// URL base: https://fiibiyijojkxqlsrhcil.supabase.co/functions/v1/phoenix/v1/<ruta>
// Desplegar con verify_jwt = false: la app NO usa sesión de Supabase, usa su token de dispositivo (Authorization: Bearer phx_…).
// Variables: SUPABASE_URL y SUPABASE_SERVICE_ROLE_KEY (las inyecta Supabase solas). Ninguna otra.
// Seguridad: el service_role salta RLS, así que TODA regla de negocio se valida aquí antes de escribir.
import { createClient } from "npm:@supabase/supabase-js@2";
import {
  CONFIG, ErrorApi, cuerpoError, compararVersion, v, ESTADOS_LATIDO, VISIBILIDADES_APP,
  limpiarInvitados, limpiarEventos, construirRoles, fusionarConfig, evaluarBuild, MODOS_SALA, marcaDe, sugerenciasHost, retrasoSugerido, ESTADOS_PRESENCIA_APP, huellaContenido, coincideEtag,
} from "./_lib/nucleo.js";

const sb = createClient(Deno.env.get("SUPABASE_URL")!, Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!, { auth: { persistSession: false } });
const ROLES_STAFF = ["ayudante", "moderador", "admin"];
const VIVAS = ["preparando", "abierta", "en_partida"];
const BUCKET_FUENTE = "fuente-phoenix";
const URL_FIRMADA_SEG = 900;     // 15 min para empezar la descarga

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
  const { data, error } = await sb.from("salas").select("id, estado, reto_id, region, host, latido, modo, reglas").eq("id", salaId).eq("dispositivo", d.id).maybeSingle();
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

type Org = { id: string; nombre: string; logo_url: string | null; color_primario: string; color_secundario: string; al_vencer: string };

/** Perfil global por clave (amistoso / torneo_privado / oficial). */
async function perfilGlobal(clave: string) {
  const { data, error } = await sb.from("perfiles_reglas").select("id, clave, nombre, version, reglas").eq("clave", clave).is("organizacion", null).maybeSingle();
  db(error, "perfilGlobal");
  if (!data) { log("error", "perfil_global_falta", { clave }); throw new ErrorApi("ERROR_INTERNO"); }
  return data;
}

/**
 * Decide modo efectivo, reglas, organización y marca de una sala. Reglas de negocio:
 *  · amistoso: perfil global.
 *  · torneo_privado: exige torneo_privado_id en curso; el host debe ser miembro (host/staff/dueño) de su organización;
 *    licencia vencida → «bloquear» = LICENCIA_VENCIDA, «amistoso» = degrada a amistoso sin organización.
 *  · oficial: exige reto_id y que el host NO sea jugador de ese reto (host neutral).
 */
async function resolverModo(usuario: string, modo: string, torneoId: number | null, retoId: number | null) {
  if (modo === "amistoso") {
    if (torneoId) throw new ErrorApi("MODO_NO_VALIDO", { campo: "torneo_privado_id", mensaje: "torneo_privado_id solo aplica al modo torneo_privado." });
    const p = await perfilGlobal("amistoso");
    return { modo, perfil: p, org: null as Org | null, torneo: null as number | null, aviso: null as string | null };
  }
  if (modo === "oficial") {
    if (!retoId) throw new ErrorApi("MODO_NO_VALIDO", { campo: "reto_id", mensaje: "Un partido oficial necesita reto_id." });
    const { data: j, error } = await sb.from("retos_matchmaking").select("retador_id, rival_id").eq("id", retoId).maybeSingle();
    db(error, "modo.oficial");
    const { data: rp, error: e2 } = await sb.from("reto_participantes").select("usuario_id").eq("reto_id", retoId).eq("estado", "CONFIRMADO");
    db(e2, "modo.oficial.participantes");
    if ([j?.retador_id, j?.rival_id, ...(rp ?? []).map((x) => x.usuario_id)].includes(usuario)) throw new ErrorApi("HOST_NO_NEUTRAL");
    return { modo, perfil: await perfilGlobal("oficial"), org: null, torneo: null, aviso: null };
  }
  // torneo_privado
  if (!torneoId) throw new ErrorApi("MODO_NO_VALIDO", { campo: "torneo_privado_id", mensaje: "El modo torneo_privado necesita torneo_privado_id." });
  const { data: t, error } = await sb.from("torneos_privados").select("id, organizacion, perfil_reglas, estado").eq("id", torneoId).maybeSingle();
  db(error, "modo.torneo");
  if (!t || t.estado !== "en_curso") throw new ErrorApi("TORNEO_NO_VALIDO");
  const { data: m, error: e2 } = await sb.from("org_miembros").select("rol").eq("organizacion", t.organizacion).eq("usuario", usuario).maybeSingle();
  db(e2, "modo.miembro");
  if (!m) throw new ErrorApi("ORG_NO_AUTORIZADO");
  const { data: o, error: e3 } = await sb.from("organizaciones").select("id, nombre, logo_url, color_primario, color_secundario, al_vencer").eq("id", t.organizacion).single();
  db(e3, "modo.org");
  const { data: vigente, error: e4 } = await sb.rpc("org_licencia_vigente", { p_org: t.organizacion });
  db(e4, "modo.licencia");
  if (!vigente) {
    if (o!.al_vencer === "bloquear") throw new ErrorApi("LICENCIA_VENCIDA");
    return { modo: "amistoso", perfil: await perfilGlobal("amistoso"), org: null, torneo: null, aviso: "licencia_vencida_degradada" };
  }
  let perfil;
  if (t.perfil_reglas) {
    const { data, error: e5 } = await sb.from("perfiles_reglas").select("id, clave, nombre, version, reglas").eq("id", t.perfil_reglas).maybeSingle();
    db(e5, "modo.perfil_org"); perfil = data;
  }
  return { modo, perfil: perfil ?? await perfilGlobal("torneo_privado"), org: o as Org, torneo: t.id as number, aviso: null };
}

/** Perfiles que esta app puede usar: los 3 globales + los de las organizaciones del usuario (si hay token). */
async function perfilesPara(usuario: string | null) {
  const { data: globales, error } = await sb.from("perfiles_reglas").select("id, clave, nombre, version, reglas").is("organizacion", null);
  db(error, "perfiles.globales");
  let deOrgs: unknown[] = []; let orgs: unknown[] = [];
  if (usuario) {
    const { data: mem, error: e1 } = await sb.from("org_miembros").select("organizacion, rol").eq("usuario", usuario);
    db(e1, "perfiles.miembro");
    const ids = (mem ?? []).map((x) => x.organizacion);
    if (ids.length) {
      const [{ data: ps, error: e2 }, { data: os, error: e3 }, { data: ts, error: e4 }] = await Promise.all([
        sb.from("perfiles_reglas").select("id, clave, nombre, version, reglas, organizacion").in("organizacion", ids),
        sb.from("organizaciones").select("id, nombre, logo_url, color_primario, color_secundario, al_vencer, activa").in("id", ids),
        sb.from("torneos_privados").select("id, organizacion, nombre, perfil_reglas").in("organizacion", ids).eq("estado", "en_curso"),
      ]);
      db(e2, "perfiles.org"); db(e3, "perfiles.orgs"); db(e4, "perfiles.torneos");
      deOrgs = (ps ?? []).map((x) => ({ ...x, organizacion_id: x.organizacion, organizacion: undefined }));
      orgs = await Promise.all((os ?? []).map(async (o) => {
        const { data: vig } = await sb.rpc("org_licencia_vigente", { p_org: o.id });
        return { id: o.id, nombre: o.nombre, rol: (mem ?? []).find((x) => x.organizacion === o.id)?.rol, licencia_vigente: !!vig, al_vencer: o.al_vencer,
                 marca: marcaDe({ marca: "organizacion" }, o), torneos_en_curso: (ts ?? []).filter((t) => t.organizacion === o.id).map((t) => ({ id: t.id, nombre: t.nombre, perfil_reglas_id: t.perfil_reglas })) };
      }));
    }
  }
  return { perfiles: [...(globales ?? []).map((x) => ({ ...x, organizacion_id: null })), ...deOrgs], organizaciones: orgs };
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
  const modoPedido = v.enumerado(b.modo, "modo", MODOS_SALA) ?? "amistoso";
  const torneoId = v.entero(b.torneo_privado_id, "torneo_privado_id", { min: 1 });
  if (retoId && modoPedido !== "oficial") {
    const { data: r, error } = await sb.from("retos_matchmaking").select("estado, host_id, retador_id, rival_id").eq("id", retoId).maybeSingle();
    db(error, "abrir.reto");
    const esJugador = r && [r.retador_id, r.rival_id].includes(d.usuario);
    const valido = r && ["ACEPTADO", "EN_JUEGO"].includes(r.estado) && (r.host_id ? r.host_id === d.usuario : esJugador);
    if (!valido) throw new ErrorApi("RETO_NO_VALIDO");
  }
  if (retoId && modoPedido === "oficial") {
    const { data: r, error } = await sb.from("retos_matchmaking").select("estado").eq("id", retoId).maybeSingle();
    db(error, "abrir.reto_oficial");
    if (!r || !["ACEPTADO", "EN_JUEGO"].includes(r.estado)) throw new ErrorApi("RETO_NO_VALIDO");
  }
  const m = await resolverModo(d.usuario, modoPedido, torneoId, retoId);
  const ahora = new Date().toISOString();
  // ¿Esta PC ya tiene una sala viva? → se reabre la misma (la app pudo reiniciarse).
  const { data: viva, error: e1 } = await sb.from("salas").select("id").eq("dispositivo", d.id).in("estado", VIVAS).maybeSingle();
  db(e1, "abrir.viva");
  let salaId: string; let reabierta = false;
  const cambios = { ...fila, estado: "abierta", latido: ahora, plazas_libres: fila.plazas_total, reto_id: retoId ?? null,
                    modo: m.modo, organizacion: m.org?.id ?? null, torneo_privado: m.torneo, perfil_reglas: m.perfil.id, reglas: m.perfil.reglas };
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
  const quienAvisa = (m.perfil.reglas as { notificaciones?: string })?.notificaciones;
  if (quienAvisa !== "host") avisos = { enviado: false, motivo: quienAvisa === "organizador" ? "LAS_DECIDE_ORGANIZADOR" : "AUTOMATICAS_DE_LIGA" };
  else try {
    const { data, error } = await sb.rpc("sistema_avisar_sala", { p_sala: salaId });
    if (error) throw new Error(error.message);
    avisos = data as Record<string, unknown>;
  } catch (err) { log("warn", "avisos_sala", { salaId, mensaje: String((err as Error).message) }); }
  log("info", "sala_abierta", { salaId, dispositivo: d.id, reabierta, retoId, avisos });
  const { cfg } = await cfgVigente();
  return { sala_id: salaId, reabierta, estado: "abierta", visibilidad: fila.visibilidad, limite_espectadores: fila.limite_espectadores,
           preferencias: { publicar_en_pagina: fila.publicar_en_pagina, avisar_amigos_host: fila.avisar_amigos_host,
                           avisar_amigos_jugadores: fila.avisar_amigos_jugadores, anunciar_discord: fila.anunciar_discord },
           avisos, latido_seg: cfg.intervalos.latido_seg, roles: await rolesDe(retoId),
           modo: m.modo, modo_pedido: modoPedido, aviso_modo: m.aviso,
           reglas: { perfil_id: m.perfil.id, nombre: m.perfil.nombre, version: m.perfil.version, ...(m.perfil.reglas as object) },
           marca: marcaDe(m.perfil.reglas, m.org), organizacion_id: m.org?.id ?? null, torneo_privado_id: m.torneo };
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
  // modo/reglas pueden cambiar en caliente (p. ej. licencia vencida → amistoso): la app aplica siempre lo último recibido.
  return { estado, latido_seg: cfg.intervalos.latido_seg, modo: sala.modo, reglas: sala.reglas, servidor_hora: ahora };
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

/** Semáforo con los umbrales de unas reglas (la regla vive en la BD: private.semaforo). */
async function semaforoDe(reglas: unknown, ping: number | null, jitter: number | null, perdida: number | null) {
  const { data, error } = await sb.rpc("sistema_semaforo", { p_reglas: reglas ?? null, p_ping: ping, p_jitter: jitter, p_perdida: perdida });
  db(error, "semaforo");
  return data as { semaforo: string; umbrales: Record<string, number> };
}

/** Eco para el pre-chequeo del navegador: respuesta mínima y SIN tocar la BD (cuanto menos trabajo, más honesta la medición). */
function eco(req: Request) {
  // Freno: es público y cada llamada gasta cuota de Edge Functions (plan FREE). Un pre-chequeo hace ~14 llamadas.
  frenar(`eco:${req.headers.get("x-forwarded-for")?.split(",")[0]?.trim() ?? "?"}`, 60, 60_000);
  return { t: Date.now() };
}

/** Autodiagnóstico del host (la app, antes de abrir sala): red del host contra servidores de referencia. */
async function diagnostico(req: Request) {
  const d = await autenticar(req); const b = await leerJson(req);
  const f = {
    latencia_ms: v.numero(b.latencia_ms, "latencia_ms", { max: 10000, opcional: false }),
    jitter_ms: v.numero(b.jitter_ms, "jitter_ms", { max: 5000 }),
    perdida_pct: v.numero(b.perdida_pct, "perdida_pct", { max: 100 }),
    subida_kbps: v.entero(b.subida_kbps, "subida_kbps", { max: 10_000_000, opcional: false }),
    bajada_kbps: v.entero(b.bajada_kbps, "bajada_kbps", { max: 10_000_000 }),
    muestras: v.entero(b.muestras, "muestras", { min: 1, max: 1000 }),
    duracion_seg: v.entero(b.duracion_seg, "duracion_seg", { min: 1, max: 600 }),
    referencia: v.texto(b.referencia, "referencia", { max: 80 }),
  };
  const jugadores = v.entero(b.jugadores_esperados, "jugadores_esperados", { min: 1, max: 8 }) ?? 2;
  const salaId = b.sala_id === undefined || b.sala_id === null ? null : v.uuid(b.sala_id, "sala_id");
  let reglas: unknown = null;
  if (salaId) reglas = (await salaPropia(d, salaId)).reglas;
  else reglas = (await perfilGlobal("amistoso")).reglas;
  const sem = await semaforoDe(reglas, f.latencia_ms, f.jitter_ms, f.perdida_pct);
  const sugerencias = sugerenciasHost(f.subida_kbps!, jugadores);
  const { data, error } = await sb.from("pruebas_conexion").insert({
    tipo: "autodiagnostico_host", usuario: d.usuario, host: d.usuario, sala_id: salaId, dispositivo: d.id, ...f, semaforo: sem.semaforo,
    detalles: { jugadores_esperados: jugadores, sugerencias },
  }).select("id").single();
  db(error, "diagnostico");
  return { id: data!.id, semaforo: sem.semaforo, umbrales: sem.umbrales, sugerencias };
}

/** Prueba real en sala: la app mide al jugador conectado por Parsec (~10 s) y la manda. El jugador la ve en vivo en la web. */
async function pruebaSala(req: Request) {
  const d = await autenticar(req); const b = await leerJson(req);
  const sala = await salaPropia(d, v.uuid(b.sala_id, "sala_id"));
  if (!VIVAS.includes(sala.estado)) throw new ErrorApi("SALA_CERRADA");
  const parsec = v.parsecId(b.parsec_id, "parsec_id");
  const f = {
    latencia_ms: v.numero(b.latencia_ms, "latencia_ms", { max: 10000, opcional: false }),
    p95_ms: v.numero(b.p95_ms, "p95_ms", { max: 10000 }),
    jitter_ms: v.numero(b.jitter_ms, "jitter_ms", { max: 5000 }),
    perdida_pct: v.numero(b.perdida_pct, "perdida_pct", { max: 100 }),
    bitrate_kbps: v.entero(b.bitrate_kbps, "bitrate_kbps", { max: 1_000_000 }),
    muestras: v.entero(b.muestras, "muestras", { min: 1, max: 1000 }),
    duracion_seg: v.entero(b.duracion_seg, "duracion_seg", { min: 1, max: 600 }),
  };
  const quien = await usuariosPorParsec([parsec]);
  const usuario = quien.get(parsec) ?? null;
  const sem = await semaforoDe(sala.reglas, f.latencia_ms, f.jitter_ms, f.perdida_pct);
  const retraso = retrasoSugerido(f.latencia_ms!, Number((sala.reglas as { retraso_host_ms?: number })?.retraso_host_ms ?? 0));
  const { data, error } = await sb.from("pruebas_conexion").insert({
    tipo: "prueba_sala", usuario, host: sala.host, sala_id: sala.id, dispositivo: d.id, actor_parsec: parsec, ...f, semaforo: sem.semaforo,
    referencia: "parsec", detalles: { retraso },
  }).select("id").single();
  db(error, "prueba_sala");
  return { id: data!.id, usuario_id: usuario, semaforo: sem.semaforo, umbrales: sem.umbrales, retraso };
}

// ── Sondeo barato (ETag) ─────────────────────────────────────────────────────────────────────────────────────────────
/** Marca de «no cambió nada»: el servidor responde 304 sin cuerpo (la app reutiliza lo que ya tenía). */
type NoModificado = { __noModificado: true; etag: string };
/** Si el ETag del cliente (If-None-Match o ?etag=) coincide → 304. Si no, devuelve los datos con su `etag`. */
function conEtag(req: Request, datos: Record<string, unknown>, volatiles: string[] = []): Record<string, unknown> | NoModificado {
  const etag = huellaContenido(datos, volatiles);
  const delCliente = req.headers.get("if-none-match") ?? new URL(req.url).searchParams.get("etag");
  if (coincideEtag(delCliente, etag)) return { __noModificado: true, etag };
  return { ...datos, etag };
}

/** GET /v1/salas — salas que el dueño de esta PC puede ver (mismas reglas que la web), con calidad y enlace si puede entrar. */
async function salas(req: Request) {
  const d = await autenticar(req);
  const { data, error } = await sb.rpc("sistema_salas_para", { p_usuario: d.usuario });
  db(error, "salas");
  const { cfg } = await cfgVigente();
  return conEtag(req, { salas: data ?? [], sondeo_seg: cfg.intervalos.sondeo_salas_seg });
}

/** POST /v1/presencia — latido de presencia de la app (cada `presencia_seg`). */
async function presencia(req: Request) {
  const d = await autenticar(req); const b = await leerJson(req);
  const estado = v.enumerado(b.estado, "estado", ESTADOS_PRESENCIA_APP, { opcional: false });
  let salaId: string | null = null;
  if (b.sala_id !== undefined && b.sala_id !== null) salaId = (await salaPropia(d, v.uuid(b.sala_id, "sala_id"))).id;
  const { error } = await sb.rpc("sistema_presencia", { p_usuario: d.usuario, p_estado: estado, p_sala: salaId, p_dispositivo: d.id });
  db(error, "presencia");
  const { cfg } = await cfgVigente();
  return { estado, siguiente_seg: cfg.intervalos.presencia_seg };
}

/** GET /v1/presencia/amigos — estado de cada amigo. «desde» no invalida el ETag (cambia a cada rato). */
async function presenciaAmigos(req: Request) {
  const d = await autenticar(req);
  const { data, error } = await sb.rpc("sistema_presencia_amigos_completa", { p_usuario: d.usuario });
  db(error, "presencia_amigos");
  const { cfg } = await cfgVigente();
  return conEtag(req, { amigos: data ?? [], sondeo_seg: cfg.intervalos.sondeo_amigos_seg }, ["desde"]);
}

/** POST /v1/invitar — el host invita a un amigo a SU sala: permiso de ver/entrar 2 h + aviso en la web. */
async function invitar(req: Request) {
  const d = await autenticar(req); const b = await leerJson(req);
  frenar(`inv:${d.id}`, 30, 10 * 60_000);
  const invitado = v.uuid(b.usuario_id, "usuario_id"); const sala = v.uuid(b.sala_id, "sala_id");
  const { data, error } = await sb.rpc("sistema_invitar", { p_host: d.usuario, p_dispositivo: d.id, p_sala: sala, p_invitado: invitado });
  db(error, "invitar");
  const r = data as { error?: string; invitacion_id?: number; notificado?: boolean; expira?: string };
  if (r.error) throw new ErrorApi(r.error, r.error === "DEMASIADOS_INTENTOS" ? { reintentar_en: 120 } : {});
  log("info", "invitacion", { sala, invitado, notificado: r.notificado });
  return { invitacion_id: r.invitacion_id, notificado: !!r.notificado, expira: r.expira };
}

/** Instalador: código de un solo uso → URL firmada temporal del ZIP del código fuente (bucket privado). Sin token. */
async function instalar(req: Request) {
  const ip = req.headers.get("x-forwarded-for")?.split(",")[0]?.trim() ?? "?";
  frenar(`inst:${ip}`, 5, 10 * 60_000);
  const b = await leerJson(req);
  const codigo = v.codigoInstalacion(b.codigo);
  const { data, error } = await sb.rpc("sistema_canjear_instalacion", { p_huella: await sha256(codigo), p_ip: ip });
  db(error, "instalar.canje");
  const r = data as { error?: string; usuario?: string; version?: string; ruta?: string; sha256?: string; notas?: string | null };
  if (r.error) { log("warn", "instalar_rechazo", { ip, codigo: r.error }); throw new ErrorApi(r.error); }
  const { data: firmada, error: e2 } = await sb.storage.from(BUCKET_FUENTE).createSignedUrl(r.ruta!, URL_FIRMADA_SEG, { download: `phoenix-soda-${r.version}.zip` });
  if (e2 || !firmada?.signedUrl) {
    // Sin URL no se consume el código: se libera para que el host pueda reintentar.
    log("error", "instalar_firma", { mensaje: e2?.message, ruta: r.ruta });
    await sb.from("codigos_instalacion").update({ usado: null, version_entregada: null, ip_canje: null }).eq("codigo_huella", await sha256(codigo));
    throw new ErrorApi("ERROR_INTERNO");
  }
  log("info", "instalacion_entregada", { usuario: r.usuario, version: r.version, ip });
  return { url: firmada.signedUrl, expira_en_seg: URL_FIRMADA_SEG, version: r.version, sha256: r.sha256, notas: r.notas ?? null,
           nombre_archivo: `phoenix-soda-${r.version}.zip` };
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
  let dispositivo = "sin_token"; let usuario: string | null = null;
  const m = /^Bearer\s+(phx_[A-Za-z0-9_-]{20,100})$/.exec(req.headers.get("authorization") ?? "");
  if (m) {
    const { data, error } = await sb.from("dispositivos_host").select("usuario, revocado, suspendido").eq("huella_token", await sha256(m[1])).maybeSingle();
    db(error, "config.dispositivo");
    dispositivo = !data ? "desconocido" : data.revocado ? "revocado" : data.suspendido ? "suspendido" : "activo";
    if (dispositivo === "activo") usuario = data!.usuario;
  }
  const app = !ver ? "sin_dato" : compararVersion(ver, cfg.version_app_min) < 0 ? "desactualizada"
            : compararVersion(ver, cfg.version_app_recomendada) < 0 ? "actualizable" : "al_dia";
  return { version_api: CONFIG.version_api, version_app_min: cfg.version_app_min, version_app_recomendada: cfg.version_app_recomendada,
           exigir_build: cfg.exigir_build, intervalos: cfg.intervalos, interruptores: cfg.interruptores, limites: CONFIG.limites,
           estado: { app, build, dispositivo }, ...(await perfilesPara(usuario)), servidor_hora: new Date().toISOString() };
}

const RUTAS: Record<string, { metodo: string; fn: (req: Request) => unknown }> = {
  "/v1/emparejar": { metodo: "POST", fn: emparejar },
  "/v1/sala/abrir": { metodo: "POST", fn: abrir },
  "/v1/sala/latido": { metodo: "POST", fn: latido },
  "/v1/sala/cerrar": { metodo: "POST", fn: cerrar },
  "/v1/eventos": { metodo: "POST", fn: eventos },
  "/v1/config": { metodo: "GET", fn: config },
  "/v1/instalar": { metodo: "POST", fn: instalar },
  "/v1/eco": { metodo: "GET", fn: eco },
  "/v1/diagnostico": { metodo: "POST", fn: diagnostico },
  "/v1/sala/prueba": { metodo: "POST", fn: pruebaSala },
  "/v1/salas": { metodo: "GET", fn: salas },
  "/v1/presencia": { metodo: "POST", fn: presencia },
  "/v1/presencia/amigos": { metodo: "GET", fn: presenciaAmigos },
  "/v1/invitar": { metodo: "POST", fn: invitar },
};

Deno.serve(async (req) => {
  const solicitudId = crypto.randomUUID();
  const ruta = new URL(req.url).pathname.replace(/^.*?\/phoenix(?=\/)/, "").replace(/\/+$/, "");
  // Solo /v1/eco se llama desde navegadores: CORS abierto + Timing-Allow-Origin (para medir con Resource Timing) y sin logs por petición.
  const navegador = ruta === "/v1/eco";
  const cab: Record<string, string> = { "content-type": "application/json; charset=utf-8", "x-request-id": solicitudId, "cache-control": "no-store",
    ...(navegador ? { "access-control-allow-origin": "*", "timing-allow-origin": "*", "access-control-allow-methods": "GET, OPTIONS" } : {}) };
  if (navegador && req.method === "OPTIONS") return new Response(null, { status: 204, headers: cab });
  const t0 = Date.now();
  try {
    const r = RUTAS[ruta];
    if (!r) throw new ErrorApi("RUTA_NO_EXISTE");
    if (req.method !== r.metodo) throw new ErrorApi("METODO_NO_PERMITIDO");
    const datos = await r.fn(req) as Record<string, unknown>;
    if (datos && (datos as NoModificado).__noModificado) {
      return new Response(null, { status: 304, headers: { ...cab, etag: (datos as NoModificado).etag } });
    }
    if (typeof datos?.etag === "string") cab.etag = datos.etag;
    if (!navegador) log("info", "ok", { ruta, ms: Date.now() - t0, solicitudId });
    return new Response(JSON.stringify({ ok: true, ...(datos as object), solicitud_id: solicitudId }), { status: 200, headers: cab });
  } catch (err) {
    const e = err instanceof ErrorApi ? err : new ErrorApi("ERROR_INTERNO");
    if (!(err instanceof ErrorApi)) log("error", "excepcion", { ruta, solicitudId, mensaje: String((err as Error)?.message ?? err) });
    else log(e.http >= 500 ? "error" : "warn", "rechazo", { ruta, codigo: e.codigo, campo: e.campo, solicitudId });
    const h = e.reintentar_en ? { ...cab, "retry-after": String(e.reintentar_en) } : cab;
    return new Response(JSON.stringify(cuerpoError(e, solicitudId)), { status: e.http, headers: h });
  }
});

// Salas Smash Soda · capa de datos de la web para JUGADORES y HOSTS (módulo 2). SIN interfaz: la conecta el rediseño.
// Esquema: páginas (futuras) → features/salas/api.js (red) → core/salas.js (reglas puras).
// Reglas en la BD (migraciones 058–063): la web solo LEE por RLS y ESCRIBE por RPC. Nunca toca tokens de PC.
import { supabase } from '../../core/supabase.js';
import { aplicarCambioSala, limpiarParsecId, ESTADOS_VIVOS } from '../../core/salas.js';

const COLUMNAS_SALA = 'id, host, estado, visibilidad, juego, parche, region, plazas_total, plazas_libres, limite_espectadores, latido, abierta_en, reto_id, modo, organizacion, torneo_privado';

/** Error legible + log. Detecta «falta la migración» para no mostrar mensajes crípticos. */
function fallo(nombre, e) {
  console.error(`[salas] ${nombre}:`, e?.code, e?.message);
  const sinMigracion = e?.code === 'PGRST202' || e?.code === '42P01' || /could not find|schema cache|does not exist/i.test(e?.message ?? '');
  return new Error(sinMigracion ? 'La base de datos aún no tiene activadas las salas (faltan migraciones 058–067).' : (e?.message || 'No se pudo completar la acción.'));
}

// ── Salas en vivo ────────────────────────────────────────────────────────────────────────────────────────────────────────
/** Salas vivas que puedo ver (RLS decide: visibilidad, amigos, reto, organización). Incluye nombre y avatar del host. */
export async function salasVivas() {
  const { data, error } = await supabase.from('salas').select(`${COLUMNAS_SALA}, perfil_host:perfiles!salas_host_fkey(username, nombre_display, avatar_url)`)
    .in('estado', ESTADOS_VIVOS).order('abierta_en', { ascending: false }).limit(60);
  if (error) throw fallo('salasVivas', error);
  return data ?? [];
}

/**
 * Lista viva: carga y luego aplica cada cambio de Realtime. `alCambiar(lista)` recibe la lista completa cada vez.
 * Devuelve una función para dejar de escuchar. Si Realtime falla, la lista sigue mostrando la última carga.
 */
export function escucharSalas(alCambiar) {
  let lista = []; let vivo = true;
  const emitir = () => { if (vivo) try { alCambiar(lista); } catch (e) { console.warn('[salas] alCambiar:', e); } };
  salasVivas().then((l) => { lista = l; emitir(); }).catch((e) => console.warn('[salas] carga inicial:', e.message));
  let canal = null;
  try {
    canal = supabase.channel('salas-vivas')
      .on('postgres_changes', { event: '*', schema: 'public', table: 'salas' }, (p) => { lista = aplicarCambioSala(lista, p); emitir(); })
      .subscribe();
  } catch (e) { console.warn('[salas] realtime:', e); }
  return () => { vivo = false; if (canal) supabase.removeChannel(canal); };
}

/** Enlace para entrar: desde 067 solo con rol (host, rival, espectador registrado, invitado, jugador del reto, staff).
 *  Quien solo «ve» la sala debe usar aceptarSala() o verSala(), que lo registran en la lista de roles. */
export async function enlaceSala(salaId) {
  const { data, error } = await supabase.from('salas_enlace').select('enlace').eq('sala_id', salaId).maybeSingle();
  if (error) throw fallo('enlaceSala', error);
  return data?.enlace ?? null;
}

// ── Radar y «En vivo» (067) ──────────────────────────────────────────────────────────────────────────────────────────
/** Salas públicas/amigos sin rival: tarjetas para «Retos en el radar». */
export async function radarSalas() {
  const { data, error } = await supabase.rpc('radar_salas');
  if (error) throw fallo('radarSalas', error);
  return Array.isArray(data) ? data : [];
}
/** Salas que admiten espectadores: tarjetas para «Salas en vivo». */
export async function salasEnVivo() {
  const { data, error } = await supabase.rpc('salas_en_vivo');
  if (error) throw fallo('salasEnVivo', error);
  return Array.isArray(data) ? data : [];
}
/** Aceptar el reto de una sala → quedo como rival (mando 2). → { rol, enlace } */
export async function aceptarSala(salaId) {
  const { data, error } = await supabase.rpc('aceptar_sala', { p_sala: salaId });
  if (error) throw fallo('aceptarSala', error);
  return data;
}
/** «Ver» → quedo registrado como espectador. → { rol, enlace } */
export async function verSala(salaId) {
  const { data, error } = await supabase.rpc('ver_sala', { p_sala: salaId });
  if (error) throw fallo('verSala', error);
  return data;
}
/** Me bajo como rival o espectador. */
export async function dejarSala(salaId) {
  const { error } = await supabase.rpc('dejar_sala', { p_sala: salaId });
  if (error) throw fallo('dejarSala', error);
}

/** Host: cambiar visibilidad y/o límite de espectadores de su sala viva. */
export async function configurarSala(salaId, { visibilidad = null, limite = null } = {}) {
  const { error } = await supabase.rpc('configurar_sala', { p_sala: salaId, p_visibilidad: visibilidad, p_limite: limite });
  if (error) throw fallo('configurarSala', error);
}

// ── Vincular PC (host) ───────────────────────────────────────────────────────────────────────────────────────────────────
/** → { codigo: '123456', expira } — 10 min, un uso. Solo hosts aprobados por staff. */
export async function generarCodigoPC() {
  const { data, error } = await supabase.rpc('generar_codigo_emparejamiento');
  if (error) throw fallo('generarCodigoPC', error);
  return data;
}

export async function misDispositivos() {
  const { data, error } = await supabase.from('dispositivos_host').select('id, nombre, version_app, creado, ultimo_uso, revocado, suspendido, motivo_suspension')
    .order('creado', { ascending: false });
  if (error) throw fallo('misDispositivos', error);
  return data ?? [];
}

export async function revocarDispositivo(id) {
  const { error } = await supabase.rpc('revocar_dispositivo', { p_dispositivo: id });
  if (error) throw fallo('revocarDispositivo', error);
}

export async function renombrarDispositivo(id, nombre) {
  const { error } = await supabase.rpc('renombrar_dispositivo', { p_dispositivo: id, p_nombre: nombre });
  if (error) throw fallo('renombrarDispositivo', error);
}

// ── Instalador Phoenix Soda (host) ───────────────────────────────────────────────────────────────────────────────────────
/** → { codigo: 'K7PQ-2ZXM', expira } — 24 h, un uso, máx. 3 por día. */
export async function generarCodigoInstalacion() {
  const { data, error } = await supabase.rpc('generar_codigo_instalacion');
  if (error) throw fallo('generarCodigoInstalacion', error);
  return data;
}

// ── Cuenta Parsec (jugador) ──────────────────────────────────────────────────────────────────────────────────────────────
export async function miParsec() {
  const { data: { user } = {} } = await supabase.auth.getUser();
  if (!user) return null;
  const { data, error } = await supabase.from('cuentas_parsec').select('parsec_id, nombre_parsec, estado, declarada_en, verificada_en').eq('usuario', user.id).maybeSingle();
  if (error) throw fallo('miParsec', error);
  return data;
}

/** → 'declarada' | 'verificada'. Valida el formato antes de llamar a la red. */
export async function vincularParsec(parsecId, nombre = null) {
  const pid = limpiarParsecId(parsecId);
  if (!pid) throw new Error('El ID de Parsec son solo números (lo ves en Parsec → Ajustes → Cuenta).');
  const { data, error } = await supabase.rpc('vincular_parsec', { p_parsec_id: pid, p_nombre: nombre });
  if (error) throw fallo('vincularParsec', error);
  return data;
}

export async function desvincularParsec() {
  const { error } = await supabase.rpc('desvincular_parsec');
  if (error) throw fallo('desvincularParsec', error);
}

// ── Justicia: mejor host para un par (usa muestras reales de 14 días) ────────────────────────────────────────────────────
export async function mejoresHosts(jugadorA, jugadorB, { neutral = false, perfil = 'amistoso', limite = 5 } = {}) {
  const { data, error } = await supabase.rpc('mejores_hosts', { p_jugador_a: jugadorA, p_jugador_b: jugadorB, p_neutral: neutral, p_perfil: perfil, p_limite: limite });
  if (error) throw fallo('mejoresHosts', error);
  return data;
}

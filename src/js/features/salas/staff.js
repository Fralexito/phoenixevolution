// Salas Smash Soda · capa de datos del PANEL DE STAFF (módulo 2). SIN interfaz: la conecta el rediseño.
// Todo pasa por RPC que comprueban `private.es_staff()` en la base y dejan rastro en la auditoría: aunque alguien llame a
// estas funciones sin ser staff, la base lo rechaza. Aquí no hay seguridad, solo comodidad.
import { supabase } from '../../core/supabase.js';

function fallo(nombre, e) {
  console.error(`[salas-staff] ${nombre}:`, e?.code, e?.message);
  return new Error(e?.message || 'No se pudo completar la acción.');
}
const rpc = async (nombre, args) => {
  const { data, error } = await supabase.rpc(nombre, args);
  if (error) throw fallo(nombre, error);
  return data;
};
const leer = async (nombre, consulta) => {
  const { data, error } = await consulta;
  if (error) throw fallo(nombre, error);
  return data ?? [];
};

// ── Hosts ────────────────────────────────────────────────────────────────────────────────────────────────────────────────
/** Candidatos: quienes activaron «Puedo ser host» (Duelos) y aún no están aprobados para salas; más los ya aprobados. */
export const hosts = () => leer('hosts', supabase.from('perfiles')
  .select('id, username, nombre_display, avatar_url, rol, puede_hostear, host_aprobado').or('puede_hostear.eq.true,host_aprobado.eq.true').order('nombre_display'));
export const aprobarHost = (usuario, aprobado, motivo = null) => rpc('staff_aprobar_host', { p_usuario: usuario, p_aprobado: aprobado, p_motivo: motivo });

// ── Salas y dispositivos ─────────────────────────────────────────────────────────────────────────────────────────────────
export const salasRecientes = (horas = 24) => leer('salasRecientes', supabase.from('salas')
  .select('id, host, estado, modo, visibilidad, juego, parche, region, plazas_total, plazas_libres, latido, abierta_en, cerrada_en, organizacion, perfil_host:perfiles!salas_host_fkey(nombre_display, username)')
  .gte('abierta_en', new Date(Date.now() - horas * 3600e3).toISOString()).order('abierta_en', { ascending: false }).limit(200));
export const cerrarSala = (sala, motivo = null) => rpc('staff_cerrar_sala', { p_sala: sala, p_motivo: motivo });
export const dispositivos = () => leer('dispositivos', supabase.from('dispositivos_host')
  .select('id, usuario, nombre, version_app, creado, ultimo_uso, revocado, suspendido, motivo_suspension').order('ultimo_uso', { ascending: false, nullsFirst: false }));
export const suspenderDispositivo = (id, suspender, motivo = null) => rpc('staff_suspender_dispositivo', { p_dispositivo: id, p_suspender: suspender, p_motivo: motivo });
export const revocarDispositivo = (id) => rpc('revocar_dispositivo', { p_dispositivo: id });
export const eventosDeSala = (sala) => leer('eventosDeSala', supabase.from('eventos_sala').select('id, tipo, actor_parsec, usuario, datos, ocurrido').eq('sala_id', sala).order('ocurrido'));
export const quitarParsec = (usuario, motivo = null) => rpc('staff_quitar_parsec', { p_usuario: usuario, p_motivo: motivo });

// ── Builds oficiales, configuración remota y código fuente ───────────────────────────────────────────────────────────────
export const builds = () => leer('builds', supabase.from('builds_oficiales').select('*').order('creado', { ascending: false }));
export const registrarBuild = (huella, version, nota = null) => rpc('staff_registrar_build', { p_huella: huella, p_version: version, p_nota: nota });
export const buildActivo = (activo, { id = null, version = null } = {}) => rpc('staff_build_activo', { p_activo: activo, p_id: id, p_version: version });
export const configPhoenix = () => leer('configPhoenix', supabase.from('phoenix_config').select('clave, valor, actualizado'));
export const guardarConfigPhoenix = (clave, valor) => rpc('staff_config_phoenix', { p_clave: clave, p_valor: valor });
export const fuentes = () => leer('fuentes', supabase.from('fuente_versiones').select('*').order('publicada', { ascending: false }));
/** El ZIP se sube antes al bucket privado «fuente-phoenix» desde el panel de Supabase; aquí solo se publica su ruta y SHA-256. */
export const publicarFuente = (version, ruta, sha256, notas = null) => rpc('staff_publicar_fuente', { p_version: version, p_ruta: ruta, p_sha256: sha256, p_notas: notas });
export const fuenteActiva = (version, activa) => rpc('staff_fuente_activa', { p_version: version, p_activa: activa });

// ── Perfiles de reglas y organizaciones ─────────────────────────────────────────────────────────────────────────────────
export const perfilesReglas = () => leer('perfilesReglas', supabase.from('perfiles_reglas').select('id, clave, organizacion, nombre, reglas, version, actualizado').order('id'));
export const guardarPerfilGlobal = (clave, reglas) => rpc('staff_guardar_perfil_global', { p_clave: clave, p_reglas: reglas });
export const organizaciones = () => leer('organizaciones', supabase.from('organizaciones').select('*, org_miembros(usuario, rol)').order('nombre'));
export const guardarOrg = ({ id = null, nombre, slug, dueno = null, desde = null, hasta = null, alVencer = 'amistoso', activa = true }) =>
  rpc('admin_guardar_org', { p_id: id, p_nombre: nombre, p_slug: slug, p_dueno: dueno, p_licencia_desde: desde, p_licencia_hasta: hasta, p_al_vencer: alVencer, p_activa: activa });

// ── Calidad ──────────────────────────────────────────────────────────────────────────────────────────────────────────────
export const calidadHosts = () => leer('calidadHosts', supabase.from('calidad_host_resumen').select('*').order('ping_mediana'));
export const pruebasRecientes = (limite = 100) => leer('pruebasRecientes', supabase.from('pruebas_conexion')
  .select('id, tipo, usuario, host, sala_id, latencia_ms, jitter_ms, perdida_pct, subida_kbps, semaforo, creada').order('creada', { ascending: false }).limit(limite));

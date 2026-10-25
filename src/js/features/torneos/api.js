// Acceso a datos de TORNEOS PROPIOS (migración 097). Lee por RLS; escribe solo por RPC. Los errores de la base llegan como «CODIGO: texto».
import { supabase } from '../../core/sistema/supabase.js';
import { normalizarTorneoPremium } from '../../core/economia/phoenix-pass.js';

const MENSAJES = {
  NO_AUTORIZADO: 'No tienes permiso para hacer eso en este torneo.',
  CUENTA_SANCIONADA: 'Tu cuenta está sancionada y no puede hacer esto ahora.',
  SOLO_STAFF: 'Por ahora solo el staff crea ligas desde «Crear mi liga».',
  TORNEOS_PAUSADOS: 'El staff pausó la creación de torneos por ahora.',
  DEMASIADOS_TORNEOS: 'Ya tienes demasiados torneos activos. Termina o cancela alguno.',
  CUPO_INVALIDO: 'Ese cupo supera el máximo permitido.',
  CONFIG_INVALIDA: 'Las opciones del torneo no son válidas.',
  TORNEO_NO_ENCONTRADO: 'No encontramos ese torneo.',
  INSCRIPCION_CERRADA: 'La inscripción de este torneo está cerrada.',
  TORNEO_LLENO: 'El torneo está lleno.',
  YA_INSCRITO: 'Ya estás inscrito.',
  TORNEO_YA_EMPEZO: 'El torneo ya empezó.',
  TORNEO_NO_EN_CURSO: 'El torneo no está en curso.',
  TORNEO_NO_EDITABLE: 'Este torneo ya no se puede cambiar.',
  FALTAN_JUGADORES: 'Hacen falta al menos 2 jugadores.',
  NOMBRE_INVALIDO: 'Escribe un nombre válido.',
  PARTIDO_NO_ENCONTRADO: 'No encontramos ese partido.',
  CRUCE_SIN_DEFINIR: 'Ese cruce todavía no tiene los dos jugadores.',
  MARCADOR_INVALIDO: 'Escribe un marcador válido (de 0 a 999).',
  EMPATE_SIN_GANADOR: 'Es una eliminatoria: elige quién pasa.',
  YA_AVANZO: 'El siguiente partido ya se jugó. Corrígelo primero.',
  ESTADO_GRANDE: 'El torneo es demasiado grande.',
  PARTIDOS_INVALIDOS: 'No se pudieron crear los partidos.',
};

/** Traduce el error de la base a una frase amable. */
export function mensajeError(e) {
  const t = String(e?.message ?? e ?? '');
  const codigo = (t.match(/[A-Z_]{6,}/) ?? [])[0];
  const extra = t.includes(':') ? t.split(':').slice(1).join(':').trim() : '';
  return MENSAJES[codigo] ? (codigo === 'DEMASIADOS_TORNEOS' && extra ? extra : MENSAJES[codigo]) : (t || 'Algo salió mal. Inténtalo otra vez.');
}

async function rpc(nombre, args) {
  const { data, error } = await supabase.rpc(nombre, args);
  if (error) throw new Error(mensajeError(error));
  return data;
}

const COLS = 'id, creador, nombre, descripcion, formato, config, estado, visibilidad, inscripcion_abierta, cupo, inicia, meta, estado_juego, campeon, oculto, motivo_oculto, creado_en, actualizado_en';

export async function listarTorneos({ limite = 60 } = {}) {
  const { data, error } = await supabase.from('torneos_libres').select(COLS).order('creado_en', { ascending: false }).limit(limite);
  if (error) throw new Error(mensajeError(error));
  return data ?? [];
}
export async function leerTorneo(id) {
  const { data, error } = await supabase.from('torneos_libres').select(COLS).eq('id', id).maybeSingle();
  if (error) throw new Error(mensajeError(error));
  return data;
}
export async function inscritosDe(ids) {
  if (!ids.length) return [];
  const { data, error } = await supabase.from('torneos_libres_inscritos').select('id, torneo_id, usuario, nombre, semilla, retirado').in('torneo_id', ids).eq('retirado', false).order('id');
  if (error) throw new Error(mensajeError(error));
  return data ?? [];
}
export async function partidosDe(id) {
  const { data, error } = await supabase.from('torneos_libres_partidos')
    .select('clave, ronda, grupo, orden, a_slot, b_slot, a_nombre, b_nombre, ga, gb, ganador, jugado, eliminatoria, jugado_en').eq('torneo_id', id).order('orden').limit(2500);
  if (error) throw new Error(mensajeError(error));
  return data ?? [];
}
export async function eventosDe(id) {
  const { data, error } = await supabase.from('torneos_libres_eventos').select('id, usuario, tipo, detalle, creado_en').eq('torneo_id', id).order('creado_en', { ascending: false }).limit(40);
  if (error) throw new Error(mensajeError(error));
  return data ?? [];
}
export async function nombresDe(ids) {
  const u = [...new Set(ids.filter(Boolean))];
  if (!u.length) return {};
  const { data } = await supabase.from('perfiles').select('id, nombre_display, username').in('id', u);
  return Object.fromEntries((data ?? []).map((p) => [p.id, p.nombre_display || p.username || 'Jugador']));
}
export async function leerTopes() {
  const { data } = await supabase.from('torneos_libres_config').select('habilitado, max_activos_por_usuario, max_jugadores').eq('id', 1).maybeSingle();
  return data ?? { habilitado: true, max_activos_por_usuario: 50, max_jugadores: 256 };
}

export const crear = (a) => rpc('torneo_crear', { p_nombre: a.nombre, p_formato: a.formato, p_config: a.config ?? {}, p_descripcion: a.descripcion ?? null, p_visibilidad: a.visibilidad ?? 'publico', p_cupo: a.cupo ?? null, p_inicia: a.inicia ?? null, p_juega: a.juega ?? true });
export const editar = (id, a) => rpc('torneo_editar', { p_id: id, p_nombre: a.nombre, p_descripcion: a.descripcion ?? null, p_config: a.config, p_visibilidad: a.visibilidad, p_cupo: a.cupo ?? null, p_inscripcion_abierta: a.inscripcion_abierta, p_inicia: a.inicia ?? null });
export const inscribirse = (id) => rpc('torneo_inscribirse', { p_id: id });
export const salir = (id) => rpc('torneo_salir', { p_id: id });
export const agregarJugador = (id, nombre, usuario = null) => rpc('torneo_agregar_jugador', { p_id: id, p_nombre: nombre, p_usuario: usuario });
export const quitarJugador = (id, inscrito) => rpc('torneo_quitar_jugador', { p_id: id, p_inscrito: inscrito });
export const iniciar = (id, plan) => rpc('torneo_iniciar', { p_id: id, p_partidos: plan.partidos, p_meta: plan.meta, p_estado: plan.estado });
export const agregarPartidos = (id, partidos) => rpc('torneo_agregar_partidos', { p_id: id, p_partidos: partidos });
export const fijarCruces = (id, cruces) => rpc('torneo_fijar_cruces', { p_id: id, p_cruces: cruces });
export const resultado = (id, clave, ga, gb, ganador = null) => rpc('torneo_resultado', { p_id: id, p_clave: clave, p_ga: ga, p_gb: gb, p_ganador: ganador });
export const quitarResultado = (id, clave) => rpc('torneo_resultado_quitar', { p_id: id, p_clave: clave });
export const guardarEstado = (id, estado, detalle = null) => rpc('torneo_estado_guardar', { p_id: id, p_estado: estado, p_detalle: detalle });
export const cerrar = (id, campeon) => rpc('torneo_cerrar', { p_id: id, p_campeon: campeon ?? null });
export const cancelar = (id) => rpc('torneo_cancelar', { p_id: id });
// Torneo premium (migración 123): marca que el organizador compra con gemas. Si la base aún no la tiene, la info llega como null y el botón no se muestra.
export const premiumInfo = async (id) => { try { return normalizarTorneoPremium(await rpc('torneo_premium_info', { p_torneo: id })); } catch { return null; } };
export const hacerPremium = (id) => rpc('torneo_hacer_premium', { p_torneo: id });
export const staffModerar = (id, accion, motivo = null) => rpc('staff_torneo_moderar', { p_id: id, p_accion: accion, p_motivo: motivo });
export const staffTopes = (t) => rpc('staff_torneos_config', { p_habilitado: t.habilitado, p_max_activos: t.max_activos, p_max_jugadores: t.max_jugadores });

/** Staff: convierte una liga todos contra todos (aún en inscripción) en OFICIAL (migración 143). Devuelve el id de la edición. */
export const hacerOficial = (id) => rpc('staff_torneo_hacer_oficial', { p_torneo: id });
// Pedidos para hacer oficial una liga casual (migración 144). El creador pide; el staff acepta (llama a la 143) o rechaza con motivo.
export const solicitarOficial = (id, nota = null) => rpc('torneo_solicitar_oficial', { p_torneo: id, p_nota: nota });
export const cancelarSolicitudOficial = (id) => rpc('torneo_cancelar_solicitud_oficial', { p_torneo: id });
/** Último pedido de la liga (o null). Solo lo devuelve al creador y al staff; si la 144 falta o falla, null (la página sigue igual). */
export const solicitudOficialDe = async (id) => { try { return (await rpc('torneo_solicitud_oficial_de', { p_torneo: id })) ?? null; } catch { return null; } };
export const staffSolicitudesOficial = async (estado = 'pendiente') => (await rpc('staff_solicitudes_oficial', { p_estado: estado, p_limite: 50 })) ?? [];
export const staffResolverSolicitud = (solicitud, aceptar, motivo = null) => rpc('staff_solicitud_oficial_resolver', { p_id: solicitud, p_aceptar: aceptar, p_motivo: motivo });
// Resultados automáticos de Phoenix Link (migración 145). Si la 145 falta o falla, la página sigue igual (sin permiso ni propuestas).
export const autoDe = async (id) => { try { return (await rpc('torneo_auto_de', { p_torneo: id })) ?? null; } catch { return null; } };
export const resultadosLinkDe = async (id) => { try { return (await rpc('torneo_resultados_link_de', { p_torneo: id })) ?? []; } catch { return []; } };
export const resolverResultadoLink = (propuesta, aceptar, ganador = null, motivo = null) => rpc('torneo_resultado_link_resolver', { p_id: propuesta, p_aceptar: aceptar, p_ganador: ganador, p_motivo: motivo });
export const staffResultadosAuto = (id, activar) => rpc('staff_torneo_resultados_auto', { p_torneo: id, p_activar: activar });

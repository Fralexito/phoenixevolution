// Acceso a reportes, moderación y sanciones: cada función llama a una RPC de Supabase (las reglas viven en la base de datos, migración 032).
// Esquema: pages/moderacion.js · features/moderacion/{acciones, aviso} → api (este archivo) + vista → core/moderacion (lógica pura).
import { supabase } from '../../core/supabase.js';
import { normalizarReporte, normalizarSancion } from '../../core/moderacion.js';

/** Error que sabe decir si la causa es «la migración 032 todavía no está aplicada» (la función no existe). */
export class ErrorModeracion extends Error {
  constructor(mensaje, { sinMigracion = false } = {}) { super(mensaje); this.name = 'ErrorModeracion'; this.sinMigracion = sinMigracion; }
}

async function rpc(nombre, args = {}) {
  const { data, error } = await supabase.rpc(nombre, args);
  if (error) {
    console.error(`[moderacion] ${nombre}:`, error.code, error.message);
    const sinMigracion = error.code === 'PGRST202' || /could not find the function|schema cache/i.test(error.message ?? '');
    throw new ErrorModeracion(sinMigracion ? 'La base de datos todavía no tiene activada la moderación (falta aplicar la migración 032).' : (error.message || 'No se pudo completar la acción.'), { sinMigracion });
  }
  return data;
}

/** Cualquier persona con sesión. `objetivo` = id de lo reportado (cuenta, publicación, respuesta, clip, historia o mensaje). */
export const reportar = (tipo, objetivo, motivo, detalle = '') => rpc('reportar', { p_tipo: tipo, p_objetivo: String(objetivo), p_motivo: motivo, p_detalle: detalle });

/** Staff (ayudante o superior). → lista ya normalizada, más nuevos primero. `antes` = id del último que ya tienes. */
export async function listarReportes({ estado = 'abierto', antes = null, limite = 30 } = {}) {
  const data = await rpc('reportes_listar', { p_estado: estado, p_antes: antes, p_limite: limite });
  return (Array.isArray(data) ? data : []).map(normalizarReporte).filter(Boolean);
}

/** Moderador o superior. Cierra TODOS los reportes abiertos sobre el mismo contenido. → cuántos cerró. */
export const resolverReporte = (id, estado, nota = '') => rpc('reporte_resolver', { p_id: id, p_estado: estado, p_resolucion: nota });
export const ocultarContenido = (tipo, id, ocultar, motivo) => rpc('moderar_ocultar', { p_tipo: tipo, p_id: Number(id), p_ocultar: !!ocultar, p_motivo: motivo });
export const sancionar = (usuario, tipo, dias, motivo, reporte = null) => rpc('sancionar', { p_usuario: usuario, p_tipo: tipo, p_dias: dias, p_motivo: motivo, p_reporte: reporte });
export const levantarSancion = (id, motivo) => rpc('sancion_levantar', { p_id: id, p_motivo: motivo });

/** Staff: historial de sanciones de una persona. */
export async function sancionesDe(usuario) { const d = await rpc('sanciones_de', { p_usuario: usuario }); return (Array.isArray(d) ? d : []).map(normalizarSancion).filter(Boolean); }

/** MI sanción vigente (o null). No lanza: si falla, la web sigue funcionando sin aviso. */
export async function miSancion() {
  try { const { data, error } = await supabase.rpc('mi_sancion'); if (error) { console.warn('[moderacion] mi_sancion:', error.message); return null; } return data ?? null; }
  catch (e) { console.warn('[moderacion] mi_sancion:', e?.message); return null; }
}

// Valoraciones y reputación: llama a las RPC de la migración 044 (las reglas viven en la BD).
import { supabase } from '../../core/supabase.js';
import { normalizarPendientes, normalizarReputacion } from '../../core/reputacion.js';

async function rpc(nombre, args = {}) {
  const { data, error } = await supabase.rpc(nombre, args);
  if (error) {
    console.error(`[valoraciones] ${nombre}:`, error.code, error.message);
    const sin = error.code === 'PGRST202' || /could not find the function|schema cache/i.test(error.message ?? '');
    throw new Error(sin ? 'La base de datos todavía no tiene activadas las valoraciones (falta aplicar la migración 044).' : (error.message || 'No se pudo completar la acción.'));
  }
  return data;
}
export const pendientes = async () => normalizarPendientes(await rpc('mis_valoraciones_pendientes'));
export const valorar = (reto, usuario, { estrellas, etiquetas }) => rpc('valorar_rival', { p_reto_id: Number(reto), p_usuario: usuario, p_estrellas: estrellas, p_etiquetas: etiquetas });
/** Nunca lanza: sin reputación el perfil se ve igual. → objeto normalizado o null. */
export async function reputacionDe(id) {
  try { const { data, error } = await supabase.rpc('reputacion_de', { p_usuario: id }); if (error) { console.warn('[valoraciones] reputacion_de:', error.message); return null; } return normalizarReputacion(data); }
  catch (e) { console.warn('[valoraciones] reputacion_de:', e); return null; }
}
/** Solo moderación (la BD vuelve a comprobar el rol). Lanzan Error legible. */
export const recibidasStaff = async (usuario) => { const d = await rpc('valoraciones_recibidas_staff', { p_usuario: usuario }); return Array.isArray(d) ? d : []; };
export const anular = (id, motivo) => rpc('anular_valoracion', { p_id: Number(id), p_motivo: motivo });

// Marcadores de duelos y estadísticas: llama a las RPC de la migración 036 (las reglas viven en la BD).
import { supabase } from '../../core/supabase.js';
import { normalizarEstadisticas } from '../../core/resultado.js';
import { normalizarEloDe } from '../../core/rankingComunidad.js';

async function rpc(nombre, args = {}) {
  const { data, error } = await supabase.rpc(nombre, args);
  if (error) {
    console.error(`[resultados] ${nombre}:`, error.code, error.message);
    const sin = error.code === 'PGRST202' || /could not find the function|schema cache/i.test(error.message ?? '');
    throw new Error(sin ? 'La base de datos todavía no tiene activados los marcadores (falta aplicar la migración 036).' : (error.message || 'No se pudo completar la acción.'));
  }
  return data;
}
export const proponer = (retoId, a, b) => rpc('proponer_resultado', { p_reto_id: Number(retoId), p_goles_a: a, p_goles_b: b });
export const responder = (retoId, confirmar) => rpc('responder_resultado', { p_reto_id: Number(retoId), p_confirmar: !!confirmar });
export const resolverStaff = (retoId, a, b, motivo) => rpc('resolver_resultado_staff', { p_reto_id: Number(retoId), p_goles_a: a, p_goles_b: b, p_motivo: motivo });
export const pendientes = async () => { const d = await rpc('mis_resultados_pendientes'); return Array.isArray(d) ? d : []; };
export const resultadoDe = (retoId) => rpc('resultado_de_reto', { p_reto_id: Number(retoId) });
/** Nunca lanza: sin estadísticas el perfil se ve igual. → objeto normalizado o null. */
export async function estadisticasDe(usuarioId) {
  try { const { data, error } = await supabase.rpc('estadisticas_de', { p_usuario: usuarioId }); if (error) { console.warn('[resultados] estadisticas_de:', error.message); return null; } return normalizarEstadisticas(data); }
  catch (e) { console.warn('[resultados] estadisticas_de:', e); return null; }
}
/** ELO de amistosos de una persona (migración 055). Nunca lanza: sin ELO el perfil se ve igual. → { elo, jugados, delta } o null. */
export async function eloDe(usuarioId) {
  try { const { data, error } = await supabase.rpc('elo_de', { p_usuario: usuarioId }); if (error) { console.warn('[resultados] elo_de:', error.message); return null; } return normalizarEloDe(data); }
  catch (e) { console.warn('[resultados] elo_de:', e); return null; }
}
/** Cola de marcadores en disputa (solo staff; la BD vuelve a comprobar el rol). Lanza Error legible. */
export const disputados = async () => { const d = await rpc('resultados_disputados'); return Array.isArray(d) ? d : []; };

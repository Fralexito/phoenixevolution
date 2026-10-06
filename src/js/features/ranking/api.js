// Ranking y retos semanales: llama a las RPC de la migración 045 (las reglas viven en la BD).
import { supabase } from '../../core/supabase.js';
import { normalizarCompetitivo, normalizarRetosRank, normalizarMisRetos, normalizarElo } from '../../core/rankingComunidad.js';

async function rpc(nombre, args = {}) {
  const { data, error } = await supabase.rpc(nombre, args);
  if (error) {
    console.error(`[ranking] ${nombre}:`, error.code, error.message);
    const sin = error.code === 'PGRST202' || /could not find the function|schema cache/i.test(error.message ?? '');
    throw new Error(sin ? 'La base de datos todavía no tiene activados los rankings (falta aplicar la migración 045 o la 055).' : (error.message || 'No se pudo completar la acción.'));
  }
  return data;
}
export const rankingCompetitivo = async (mes) => normalizarCompetitivo(await rpc('ranking_competitivo', { p_mes: mes, p_limite: 50 }));
export const rankingRetos = async (mes) => normalizarRetosRank(await rpc('ranking_retos', { p_mes: mes, p_limite: 50 }));
export const rankingElo = async () => normalizarElo(await rpc('ranking_elo', { p_limite: 50 }));
export const misRetos = async () => normalizarMisRetos(await rpc('mis_retos_semanales'));
export const cobrarReto = (clave) => rpc('cobrar_reto_semanal', { p_clave: clave });

// Encuestas: llama a las RPC de la migración 040 (las reglas viven en la BD).
import { supabase } from '../../core/supabase.js';
import { normalizarEncuestas } from '../../core/encuesta.js';

const sinMigracion = (e) => e.code === 'PGRST202' || /could not find the function|schema cache/i.test(e.message ?? '');
async function rpc(nombre, args) {
  const { data, error } = await supabase.rpc(nombre, args);
  if (error) {
    console.error(`[encuestas] ${nombre}:`, error.code, error.message);
    throw new Error(sinMigracion(error) ? 'La base de datos todavía no tiene activadas las encuestas (falta aplicar la migración 040).' : (error.message || 'No se pudo completar la acción.'));
  }
  return data;
}
/** → id de la publicación creada. */
export const crear = ({ pregunta, opciones, dias, juego = null }) => rpc('crear_encuesta', { p_pregunta: pregunta, p_opciones: opciones, p_dias: dias, p_juego: juego });
/** → encuesta saneada (con resultados visibles porque ya votaste). */
export async function votar(publicacionId, opcionId) {
  const d = await rpc('votar_encuesta', { p_publicacion: Number(publicacionId), p_opcion: Number(opcionId) });
  return normalizarEncuestas({ [publicacionId]: d }).get(Number(publicacionId)) ?? null;
}
/** Nunca lanza: sin la migración (o con la red caída) las publicaciones se ven igual, solo sin encuesta. → Map. */
export async function encuestasDe(ids) {
  const lista = [...new Set((ids ?? []).map(Number).filter(Number.isFinite))].slice(0, 100); if (!lista.length) return new Map();
  try { const { data, error } = await supabase.rpc('encuestas_de', { p_publicaciones: lista }); if (error) { console.warn('[encuestas] encuestas_de:', error.message); return new Map(); } return normalizarEncuestas(data); }
  catch (e) { console.warn('[encuestas] encuestas_de:', e); return new Map(); }
}

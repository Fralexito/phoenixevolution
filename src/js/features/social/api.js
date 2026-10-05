// Guardados, búsqueda y sugerencias: cada función llama a una RPC de Supabase (reglas en la base de datos, migración 034).
// Esquema: pages/{buscar,guardados,comunidad,perfil} → features/social/{api, guardados, mencionAuto} → core/social (lógica pura).
import { supabase } from '../../core/supabase.js';
import { normalizarPersona } from '../../core/social.js';

async function rpc(nombre, args = {}) {
  const { data, error } = await supabase.rpc(nombre, args);
  if (error) {
    console.error(`[social] ${nombre}:`, error.code, error.message);
    const sinMigracion = error.code === 'PGRST202' || /could not find the function|schema cache/i.test(error.message ?? '');
    throw new Error(sinMigracion ? 'La base de datos todavía no tiene activada esta función (falta aplicar la migración 034).' : (error.message || 'No se pudo completar la acción.'));
  }
  return data;
}

/** Guardar o quitar un marcador. → estado final (true = queda guardado). */
export const guardar = (tipo, id, guardado = true) => rpc('guardar_contenido', { p_tipo: tipo, p_id: Number(id), p_guardar: !!guardado }).then((v) => v === true);
/** De estos ids, ¿cuáles tengo guardados? → Set de números. Nunca lanza: sin marcadores la web sigue funcionando. */
export async function guardadosDe(tipo, ids) {
  const lista = [...new Set((ids ?? []).map(Number).filter(Number.isFinite))].slice(0, 100); if (!lista.length) return new Set();
  try { const d = await rpc('guardados_de', { p_tipo: tipo, p_ids: lista }); return new Set((Array.isArray(d) ? d : []).map(Number)); }
  catch (e) { console.warn('[social] marcadores no disponibles:', e.message); return new Set(); }
}
/** → { items: [{tipo, guardado_at, item}], hayMas, siguiente }. */
export async function listarGuardados({ antes = null, limite = 20 } = {}) {
  const d = await rpc('guardados_listar', { p_antes: antes, p_limite: limite });
  return { items: Array.isArray(d?.items) ? d.items : [], hayMas: !!d?.hay_mas, siguiente: d?.siguiente ?? null };
}

export async function buscarPersonas(q, limite = 20) { const d = await rpc('buscar_personas', { p_q: q, p_limite: limite }); return (Array.isArray(d) ? d : []).map(normalizarPersona).filter(Boolean); }
/** → { items (formato muro_comunidad), hayMas }. */
export async function buscarPublicaciones(q, desplazamiento = 0, limite = 20) {
  const d = await rpc('buscar_publicaciones', { p_q: q, p_desplazamiento: desplazamiento, p_limite: limite });
  return { items: (Array.isArray(d?.items) ? d.items : []).filter(Boolean), hayMas: !!d?.hay_mas };
}

export async function sugerencias(limite = 8) { const d = await rpc('sugerencias_seguir', { p_limite: limite }); return (Array.isArray(d) ? d : []).map(normalizarPersona).filter(Boolean); }
export const descartarSugerencia = (usuario) => rpc('sugerencia_descartar', { p_usuario: usuario });

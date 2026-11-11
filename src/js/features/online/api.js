// Phoenix Online · capa de red de la web. Solo usa RPC del servidor (migraciones 164 y 165).
import { supabase } from '../../core/sistema/supabase.js';

const fallo = (nombre, e) => {
  console.error(`[online] ${nombre}:`, e?.code, e?.message);
  const falta = e?.code === 'PGRST202' || /could not find|schema cache/i.test(e?.message ?? '');
  return new Error(falta ? 'El servidor online aún no tiene activada esta función.' : (e?.message || 'No se pudo completar la acción.'));
};

/** Vincula mi cuenta con el club de mi PES usando el código que muestra el juego. Devuelve el nombre del club. */
export async function vincularPES(codigo) {
  const { data, error } = await supabase.rpc('phoenix_vincular', { p_codigo: codigo });
  if (error) throw fallo('vincular', error);
  return data;
}

/** Ranking online (ya ordenado por rating). */
export async function rankingOnline(limite = 200) {
  const { data, error } = await supabase.rpc('phoenix_ranking_online', { p_limite: limite });
  if (error) throw fallo('ranking', error);
  return data ?? [];
}

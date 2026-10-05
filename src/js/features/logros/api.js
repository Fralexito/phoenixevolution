// Logros: llama a las RPC (reglas en la BD, migración 035). Nunca deja la página muda: la franja del perfil falla en silencio.
import { supabase } from '../../core/supabase.js';
import { normalizarMisLogros, normalizarLogrosDe } from '../../core/logros.js';

/** → { logros, obtenidos, total }. Lanza Error legible (la página «Logros» muestra el mensaje). */
export async function misLogros() {
  const { data, error } = await supabase.rpc('mis_logros');
  if (error) {
    console.error('[logros] mis_logros:', error.code, error.message);
    const sin = error.code === 'PGRST202' || /could not find the function|schema cache/i.test(error.message ?? '');
    throw new Error(sin ? 'La base de datos todavía no tiene activados los logros (falta aplicar la migración 035).' : (error.message || 'No se pudieron cargar tus logros.'));
  }
  return normalizarMisLogros(data);
}
/** Logros obtenidos de otra persona. Nunca lanza: si falla → { visible: false, logros: [] } y el perfil se muestra igual. */
export async function logrosDe(usuarioId) {
  try {
    const { data, error } = await supabase.rpc('logros_de', { p_usuario: usuarioId });
    if (error) { console.warn('[logros] logros_de:', error.message); return normalizarLogrosDe(null); }
    return normalizarLogrosDe(data);
  } catch (e) { console.warn('[logros] logros_de:', e); return normalizarLogrosDe(null); }
}

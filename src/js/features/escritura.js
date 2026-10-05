// Escrituras que NO mienten. Con RLS, un DELETE sin permiso no da error: devuelve «0 filas» y, sin esta comprobación, la pantalla
// diría «Borrado» aunque no se haya borrado nada. Aquí ese caso se convierte en un error claro.

/**
 * Borra filas y exige que se haya borrado al menos una.
 * @param {import('@supabase/supabase-js').SupabaseClient} supabase
 * @param {string} tabla
 * @param {Record<string, any>} igual  condiciones `columna = valor` (todas deben cumplirse)
 * @param {string} [columna]  columna a pedir de vuelta (basta cualquiera que exista)
 * @returns {Promise<number>} filas borradas (≥ 1)
 * @throws {Error} con mensaje legible si no hay permiso, ya no existe, o falla la red.
 */
export async function borrarFilas(supabase, tabla, igual, columna = 'id') {
  let q = supabase.from(tabla).delete();
  for (const [k, v] of Object.entries(igual)) q = q.eq(k, v);
  const { data, error } = await q.select(columna);
  if (error) throw error;
  if (!data?.length) throw new Error('No tienes permiso para borrar esto (borrar es solo de administradores) o ya no existe.');
  return data.length;
}

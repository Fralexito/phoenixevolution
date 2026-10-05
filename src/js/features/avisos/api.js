// Preferencias de avisos (qué categorías de notificación quiero recibir). Reglas en la BD (migración 033); aquí solo se llama a las RPC.
// Esquema: pages/amigos (pestaña «Avisos») → features/avisos/api → core/avisos (lógica pura).
import { supabase } from '../../core/supabase.js';
import { normalizarPreferencias, esCategoriaAviso } from '../../core/avisos.js';

function error(nombre, e) {
  console.error(`[avisos] ${nombre}:`, e.code, e.message);
  const sinMigracion = e.code === 'PGRST202' || /could not find the function|schema cache/i.test(e.message ?? '');
  return new Error(sinMigracion ? 'La base de datos todavía no tiene activadas las preferencias de avisos (falta aplicar la migración 033).' : (e.message || 'No se pudo completar la acción.'));
}

/** → { duelos, social, muro, menciones } (true = recibir). Lanza Error con texto legible si falla. */
export async function cargarPreferencias() {
  const { data, error: e } = await supabase.rpc('mis_preferencias_notif');
  if (e) throw error('cargar', e);
  return normalizarPreferencias(data);
}

export async function guardarPreferencia(categoria, activa) {
  if (!esCategoriaAviso(categoria)) throw new Error('Categoría de aviso no válida.');
  const { error: e } = await supabase.rpc('guardar_preferencia_notif', { p_categoria: categoria, p_activa: !!activa });
  if (e) throw error('guardar', e);
}

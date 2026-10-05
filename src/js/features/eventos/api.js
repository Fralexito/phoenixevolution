// Eventos: llama a las RPC (reglas en la BD, migración 042). Esquema: pages/eventos → features/eventos/api → core/evento (puro).
import { supabase } from '../../core/supabase.js';
import { normalizarEventos } from '../../core/evento.js';

const FALTA_042 = 'La base de datos todavía no tiene activados los eventos (falta aplicar la migración 042).';
/** Ejecuta una RPC; ante error deja un log descriptivo y lanza un Error con mensaje legible para la persona. */
async function rpc(nombre, args = {}) {
  const { data, error } = await supabase.rpc(nombre, args);
  if (error) {
    console.error(`[eventos] ${nombre}:`, error.code, error.message);
    const sin = error.code === 'PGRST202' || /could not find the function|schema cache/i.test(error.message ?? '');
    throw new Error(sin ? FALTA_042 : (error.message || 'No se pudo completar la acción.'));
  }
  return data;
}

export const listarEventos = async (pasados = false, limite = 30) => normalizarEventos(await rpc('eventos_lista', { p_pasados: pasados, p_limite: limite }));
export const marcarInteres = (id, interesa, recordar = true) => rpc('marcar_interes_evento', { p_id: id, p_interesa: interesa, p_recordar: recordar });   // → { interesados, mi_interes, mi_recordar }
export const crearEvento = ({ titulo, iso, juego, descripcion }) => rpc('crear_evento', { p_titulo: titulo, p_inicia_at: iso, p_juego: juego, p_descripcion: descripcion });
export const editarEvento = (id, { titulo, iso, juego, descripcion }) => rpc('editar_evento', { p_id: id, p_titulo: titulo, p_inicia_at: iso, p_juego: juego, p_descripcion: descripcion });
export const cancelarEvento = (id, motivo = null) => rpc('cancelar_evento', { p_id: id, p_motivo: motivo });

// Datos del CHAT GENERAL (migración 099). Todo por RPC: el servidor decide quién puede escribir y qué ve cada quien.
import { supabase } from '../../core/supabase.js';
import { mensajeError } from '../../core/chatGeneral.js';

async function rpc(nombre, args) {
  const { data, error } = await supabase.rpc(nombre, args);
  if (error) throw new Error(mensajeError(error));
  return data;
}
export const listar = (desde = 0, limite = 50) => rpc('chat_global_listar', { p_desde: desde, p_limite: limite });
export const enviar = (texto) => rpc('chat_global_enviar', { p_texto: texto });
export const borrar = (id, motivo = null) => rpc('chat_global_borrar', { p_id: id, p_motivo: motivo });

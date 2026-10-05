// Acceso al muro: cada función llama a una RPC de Supabase (las reglas viven en la base de datos, migración 021).
import { supabase } from '../../core/supabase.js';

async function rpc(nombre, args = {}) {
  const { data, error } = await supabase.rpc(nombre, args);
  if (error) { console.error(`[muro] ${nombre}:`, error.message); throw new Error(error.message || 'No se pudo completar la acción.'); }
  return data;
}

export const perfilPublico = (username) => rpc('perfil_publico', { p_usuario: username });
export const cargarMuro = (id, antes = null, limite = 20) => rpc('muro_de', { p_usuario: id, p_antes: antes, p_limite: limite });
export const publicar = (texto) => rpc('muro_publicar', { p_texto: texto });
export const editar = (id, texto) => rpc('muro_editar', { p_id: id, p_texto: texto });
export const borrar = (id) => rpc('muro_borrar', { p_id: id });
export const fijar = (id, fijada) => rpc('muro_fijar', { p_id: id, p_fijar: fijada });
export const guardarEstilo = (e) => rpc('muro_guardar_estilo', e);
export const guardarPrivacidadMuro = (ver, responder) => rpc('muro_guardar_privacidad', { p_ver: ver, p_responder: responder });

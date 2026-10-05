// Acceso al chat privado: RPC (reglas en la base, migración 018) + lecturas protegidas por RLS.
import { supabase } from '../../core/supabase.js';
import { normalizarConversaciones } from '../../core/chat.js';

async function rpc(nombre, args = {}) {
  const { data, error } = await supabase.rpc(nombre, args);
  if (error) { console.error(`[chat] ${nombre}:`, error.message); throw new Error(error.message || 'No se pudo completar la acción.'); }
  return data;
}

export const listarConversaciones = async () => normalizarConversaciones(await rpc('mis_conversaciones'));
export const abrirDirecto = (id) => rpc('abrir_directo', { p_otro: id });
export const crearGrupo = (nombre, miembros) => rpc('crear_grupo', { p_nombre: nombre, p_miembros: miembros });
export const agregarAGrupo = (conv, id) => rpc('agregar_a_grupo', { p_conv: conv, p_usuario: id });
export const expulsarDeGrupo = (conv, id) => rpc('expulsar_de_grupo', { p_conv: conv, p_usuario: id });
export const salir = (conv) => rpc('salir_de_conversacion', { p_conv: conv });
export const enviar = (conv, texto) => rpc('enviar_mensaje', { p_conv: conv, p_texto: texto });
export const borrar = (id) => rpc('borrar_mensaje', { p_id: id });
export const marcarLeido = (conv) => rpc('marcar_leido', { p_conv: conv });
export const silenciar = (conv, si) => rpc('silenciar_conversacion', { p_conv: conv, p_silenciar: si });

/** Últimos 60 mensajes de una conversación (la RLS ya limita a miembros). */
export async function cargarMensajes(conv) {
  const { data, error } = await supabase.from('mensajes_privados').select('id, autor_id, texto, eliminado, created_at')
    .eq('conversacion_id', conv).order('id', { ascending: false }).limit(60);
  if (error) { console.error('[chat] mensajes:', error.message); throw new Error('No se pudieron cargar los mensajes.'); }
  return data ?? [];
}
export async function cargarMiembros(conv) {
  const { data, error } = await supabase.from('conv_miembros').select('usuario_id, rol').eq('conversacion_id', conv);
  if (error) { console.error('[chat] miembros:', error.message); return []; }
  return data ?? [];
}

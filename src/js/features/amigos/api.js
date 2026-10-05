// Acceso a la red social: cada función llama a una RPC de Supabase (las reglas viven en la base de datos, migración 017).
import { supabase } from '../../core/supabase.js';
import { normalizarRed } from '../../core/red.js';

async function rpc(nombre, args = {}) {
  const { data, error } = await supabase.rpc(nombre, args);
  if (error) { console.error(`[amigos] ${nombre}:`, error.message); throw new Error(error.message || 'No se pudo completar la acción.'); }
  return data;
}

export const cargarRed = async () => normalizarRed(await rpc('mi_red'));
export const solicitar = (id) => rpc('solicitar_amistad', { p_destino: id });
export const responder = (id, acepta) => rpc('responder_amistad', { p_otro: id, p_acepta: acepta });
export const cancelarSolicitud = (id) => rpc('cancelar_solicitud', { p_otro: id });
export const eliminarAmigo = (id) => rpc('eliminar_amigo', { p_otro: id });
export const seguir = (id) => rpc('seguir', { p_otro: id });
export const dejarDeSeguir = (id) => rpc('dejar_de_seguir', { p_otro: id });
export const bloquear = (id) => rpc('bloquear', { p_otro: id });
export const desbloquear = (id) => rpc('desbloquear', { p_otro: id });
export const guardarPrivacidad = (p) => rpc('guardar_privacidad', { p_solicita: p.quien_solicita, p_escribe: p.quien_escribe, p_ver_amigos: p.ver_amigos, p_conexion: p.mostrar_conexion });

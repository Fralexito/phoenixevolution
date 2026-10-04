// Acciones del usuario sobre retos. Cada una es una llamada RPC: la base de datos valida TODO;
// aquí solo se envía y se muestra el resultado con un mensaje claro.
import { supabase } from '../../core/supabase.js';
import { toast } from '../../core/toast.js';
import { openAuthModal } from '../auth.js';
import { me } from './data.js';

let busy = false;
let refreshFn = async () => {};
export const setRefresh = (fn) => { refreshFn = fn; };
export const refresh = () => refreshFn();

export function needLogin() {
  if (me()) return true;
  toast('Debes iniciar sesión.', 'error', { key: 'login' }); openAuthModal('login');
  return false;
}

/** Evita doble clic y convierte cualquier error en un aviso (con log descriptivo). */
export async function guard(fn) {
  if (busy) return false; busy = true;
  try { await fn(); return true; }
  catch (e) { console.error('[duelos]', e); toast(e.message || 'Error inesperado.', 'error'); return false; }
  finally { busy = false; }
}

// Las reglas de negocio (P0001) ya vienen en español desde la BD; lo demás se resume.
export const friendly = (e) => (e.code === 'P0001' ? e.message : e.code === '23505' ? 'Ya tienes un reto abierto. Cancélalo antes de lanzar otro.' : 'No se pudo completar la acción.');

/** Llama a una función de la BD y refresca la pantalla. */
export async function callRpc(name, params, okMsg) {
  if (!needLogin()) return false;
  return guard(async () => {
    const { error } = await supabase.rpc(name, params);
    if (error) { console.error('[duelos]', name, error.message); throw new Error(friendly(error)); }
    if (okMsg) toast(okMsg, 'ok');
    await refreshFn();
  });
}

const byReto = (name, okMsg) => (id) => callRpc(name, { p_reto_id: id }, okMsg);
export const aceptar = byReto('aceptar_reto', '¡Desafío aceptado!');
export const rechazar = byReto('rechazar_reto', 'Reto rechazado.');
export const cancelar = byReto('cancelar_reto', 'Reto cancelado.');
export const finalizar = byReto('finalizar_reto', 'Partido finalizado.');
export const confirmar = byReto('confirmar_partido', '¡Confirmado! Nos vemos en la sala.');
export const salir = byReto('salir_de_reto', 'Saliste del partido. Tu cupo quedó libre.');
export const acordarCupos = byReto('acordar_cupos', 'Registrado: jugarás con los cupos actuales.');
export const responder = (id, acepta) => callRpc('responder_invitacion', { p_reto_id: id, p_acepta: acepta }, acepta ? '¡Te uniste al equipo!' : 'Invitación rechazada.');
export const expulsar = (id, uid) => callRpc('expulsar_de_reto', { p_reto_id: id, p_usuario: uid }, 'Jugador quitado del equipo.');
export const unirse = (id, equipo) => callRpc('unirse_a_reto', { p_reto_id: id, p_equipo: equipo }, '¡Te uniste al partido!');
export const invitar = (id, uid, equipo) => callRpc('invitar_a_reto', { p_reto_id: id, p_usuario: uid, p_equipo: equipo }, 'Invitación enviada.');
export const publicarEnlace = (id, link, detalle) => callRpc('publicar_enlace', { p_reto_id: id, p_link: link, p_detalle: detalle || null }, 'Enlace publicado. Tu equipo ya puede conectarse.');

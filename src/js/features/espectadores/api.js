// Acceso a espectadores: RPC (las reglas viven en la base de datos, migración 019).
import { supabase } from '../../core/supabase.js';
import { normalizarPartidos, normalizarSalas } from '../../core/espectadores.js';

async function rpc(nombre, args = {}) {
  const { data, error } = await supabase.rpc(nombre, args);
  if (error) { console.error(`[espectadores] ${nombre}:`, error.message); throw new Error(error.message || 'No se pudo completar la acción.'); }
  return data;
}
export const partidosEnVivo = async () => normalizarPartidos(await rpc('partidos_en_vivo'));
export const misSalas = async () => normalizarSalas(await rpc('mis_salas'));
export const configurar = (reto, modo, max) => rpc('configurar_espectadores', { p_reto: reto, p_modo: modo, p_max: max });
export const pedirVer = (reto) => rpc('pedir_ver', { p_reto: reto });
export const responder = (reto, usuario, acepta) => rpc('responder_espectador', { p_reto: reto, p_usuario: usuario, p_acepta: acepta });
export const quitar = (reto, usuario) => rpc('quitar_espectador', { p_reto: reto, p_usuario: usuario });
export const salir = (reto) => rpc('salir_espectador', { p_reto: reto });
export const enlace = (reto) => rpc('enlace_espectador', { p_reto: reto });

// Clanes: llama a las RPC (reglas en la BD, migración 043). Esquema: pages/clanes → features/clanes/api → core/clan (puro).
import { supabase } from '../../core/supabase.js';
import { normalizarClanLista, normalizarMiClan } from '../../core/clan.js';

const FALTA = 'La base de datos todavía no tiene activados los clanes (falta aplicar la migración 043).';
async function rpc(nombre, args = {}) {
  const { data, error } = await supabase.rpc(nombre, args);
  if (error) {
    console.error(`[clanes] ${nombre}:`, error.code, error.message);
    const sin = error.code === 'PGRST202' || /could not find the function|schema cache/i.test(error.message ?? '');
    throw new Error(sin ? FALTA : (error.message || 'No se pudo completar la acción.'));
  }
  return data;
}
export const miClan = async () => normalizarMiClan(await rpc('mi_clan'));
export const listarClanes = async (busqueda = '', limite = 30) => normalizarClanLista(await rpc('clanes_lista', { p_busqueda: busqueda || null, p_limite: limite }));
/** Etiqueta del clan de una persona (para su perfil). Falla en silencio: es un adorno, no debe romper el perfil. */
export async function clanDeUsuario(id) {
  try { const { data } = await supabase.rpc('clan_de_usuario', { p_usuario: id }); return data && data.etiqueta ? { id: data.id, nombre: String(data.nombre ?? ''), etiqueta: String(data.etiqueta) } : null; }
  catch (e) { console.warn('[clanes] clan_de_usuario:', e); return null; }
}
export const crearClan = ({ nombre, etiqueta, descripcion }) => rpc('crear_clan', { p_nombre: nombre, p_etiqueta: etiqueta, p_descripcion: descripcion });
export const editarClan = (descripcion) => rpc('editar_clan', { p_descripcion: descripcion });
export const invitar = (usuario) => rpc('invitar_a_clan', { p_usuario: usuario });
export const solicitarIngreso = (clan) => rpc('solicitar_ingreso_clan', { p_clan: clan });
export const responder = (id, acepta) => rpc('responder_solicitud_clan', { p_id: id, p_acepta: acepta });
export const salir = () => rpc('salir_del_clan');
export const expulsar = (usuario) => rpc('expulsar_de_clan', { p_usuario: usuario });
export const nombrarSubcapitan = (usuario) => rpc('nombrar_subcapitan', { p_usuario: usuario });
export const cederCapitania = (usuario) => rpc('ceder_capitania', { p_usuario: usuario });
export const pedirDestitucion = (pedir) => rpc('pedir_destitucion', { p_pedir: pedir });
export const votar = (candidato) => rpc('votar_clan', { p_candidato: candidato });
export const moderarClan = (clan, oculto, motivo) => rpc('moderar_clan', { p_clan: clan, p_oculto: oculto, p_motivo: motivo });
export const moderarExpulsar = (usuario, motivo) => rpc('moderar_expulsar_de_clan', { p_usuario: usuario, p_motivo: motivo });

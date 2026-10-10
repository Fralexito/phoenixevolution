// Acceso a datos de PHOENIX SYNC (migración 098). Lee por RLS; escribe solo por RPC (el servidor decide quién puede).
import { supabase } from '../../core/supabase.js';

const MENSAJES = {
  NO_AUTORIZADO: 'Solo el admin del grupo puede hacer eso.',
  SOLO_ADMIN: 'Solo el admin del sitio puede crear grupos.',
  CAMPO_INVALIDO: 'Ese valor no es válido.',
  GRUPO_NO_ENCONTRADO: 'No encontramos ese grupo.',
  USUARIO_NO_ENCONTRADO: 'No encontramos a esa persona.',
};
export function mensajeError(e) {
  const t = String(e?.message ?? e ?? '');
  const c = (t.match(/[A-Z_]{6,}/) ?? [])[0];
  return MENSAJES[c] ?? (t || 'Algo salió mal. Inténtalo otra vez.');
}
async function rpc(nombre, args) {
  const { data, error } = await supabase.rpc(nombre, args);
  if (error) throw new Error(mensajeError(error));
  return data;
}
const leer = async (q) => { const { data, error } = await q; if (error) throw new Error(mensajeError(error)); return data ?? []; };

export const misGrupos = () => leer(supabase.from('sync_grupos').select('id, nombre, ultimo_seq, creado_en').order('creado_en'));
export const miembrosDe = (g) => leer(supabase.from('sync_miembros').select('usuario_id, rol, puede_aplicar, activo').eq('grupo_id', g).order('creado_en'));
export const configDe = async (g) => (await leer(supabase.from('sync_config').select('modo, actualizado_por, actualizado_en').eq('grupo_id', g).limit(1)))[0] ?? null;
export const historialDe = (g) => leer(supabase.from('sync_config_historial').select('id, modo_anterior, modo_nuevo, por, en').eq('grupo_id', g).order('en', { ascending: false }).limit(6));
export const operacionesDe = (g, n = 12) => leer(supabase.from('sync_operaciones')
  .select('id, seq, jugador_id, equipo_origen, equipo_destino, autor_usuario_id, resumen, parche, huella_bd, creado_en').eq('grupo_id', g).order('seq', { ascending: false }).limit(n));
export const aplicacionesDe = (ids) => (ids.length ? leer(supabase.from('sync_aplicaciones').select('op_id, usuario_id, estado, motivo, actualizado_en').in('op_id', ids)) : Promise.resolve([]));
export async function nombresDe(ids) {
  const u = [...new Set(ids.filter(Boolean))];
  if (!u.length) return {};
  const { data } = await supabase.from('perfiles').select('id, nombre_display, username').in('id', u);
  return Object.fromEntries((data ?? []).map((p) => [p.id, p.nombre_display || p.username || 'Jugador']));
}
export async function buscarUsuario(username) {
  const { data, error } = await supabase.from('perfiles').select('id, nombre_display, username').ilike('username', username.replace(/^@/, '')).limit(1);
  if (error) throw new Error(mensajeError(error));
  if (!data?.[0]) throw new Error(MENSAJES.USUARIO_NO_ENCONTRADO);
  return data[0];
}
export const crearGrupo = (nombre) => rpc('sync_grupo_crear', { p_nombre: nombre });
export const cambiarModo = (g, modo) => rpc('sync_config_cambiar', { p_grupo: g, p_modo: modo });
export const ponerMiembro = (g, u, rol, puedeAplicar) => rpc('sync_miembro_poner', { p_grupo: g, p_usuario: u, p_rol: rol, p_puede_aplicar: puedeAplicar });
export const quitarMiembro = (g, u) => rpc('sync_miembro_quitar', { p_grupo: g, p_usuario: u });

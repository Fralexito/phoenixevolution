// Economía: llama a las RPC (reglas en la BD, migraciones 049-051). Esquema: pages/tienda → features/economia/api → core/economia (puro).
import { supabase } from '../../core/supabase.js';
import { normalizarEconomia, normalizarLista, normalizarMovimiento, normalizarRegla, normalizarPaquetes, normalizarEquipamiento } from '../../core/economia.js';

const FALTA = 'La base de datos todavía no tiene activada la economía (falta aplicar las migraciones 049, 050 y 051).';
async function rpc(nombre, args = {}) {
  const { data, error } = await supabase.rpc(nombre, args);
  if (error) {
    console.error(`[economia] ${nombre}:`, error.code, error.message);
    const sin = error.code === 'PGRST202' || /could not find the function|schema cache/i.test(error.message ?? '');
    throw new Error(sin ? FALTA : (error.message || 'No se pudo completar la acción.'));
  }
  return data;
}
export const miEconomia = async () => normalizarEconomia(await rpc('mi_economia'));
export const tienda = async () => normalizarLista(await rpc('tienda_lista'));
export const miInventario = async () => normalizarLista(await rpc('mi_inventario'));
export const movimientos = async (limite = 30, antes = null) => { const d = await rpc('mis_movimientos', { p_limite: limite, p_antes: antes }); return Array.isArray(d) ? d.map(normalizarMovimiento) : []; };
export const reglas = async () => { const d = await rpc('reglas_economia'); return Array.isArray(d) ? d.map(normalizarRegla) : []; };
export const comprar = (item) => rpc('comprar_item', { p_item: item });
export const equipar = (item, equipar) => rpc('equipar_item', { p_item: item, p_equipar: equipar });
export const paquetes = async () => normalizarPaquetes(await rpc('paquetes_lista'));
export const aceptarTerminos = () => rpc('aceptar_terminos_compra');
export const crearOrden = (paquete) => rpc('crear_orden', { p_paquete: paquete });
export const misOrdenes = () => rpc('mis_ordenes');
export const adminItems = async () => normalizarLista(await rpc('admin_tienda_items'));
export const adminGuardarItem = (v, id = null) => rpc('admin_guardar_item', { p_id: id, p_clave: v.clave, p_nombre: v.nombre, p_descripcion: v.descripcion, p_categoria: v.categoria, p_precio: v.precio, p_nivel_min: v.nivelMin, p_stock: v.stock, p_estilo: v.estilo, p_activo: v.activo });
export const adminResumen = () => rpc('admin_economia_resumen');
export const adminPagos = (activo) => rpc('admin_set_pagos_activos', { p_activo: activo });
export const adminAjustar = (usuario, delta, motivo) => rpc('admin_ajustar_tokens', { p_usuario: usuario, p_delta: delta, p_motivo: motivo });
export const adminRegla = (r) => rpc('admin_guardar_regla', { p_fuente: r.fuente, p_xp: r.xp, p_tokens: r.tokens, p_tope: r.topeDiario, p_activa: r.activa });
/** Lo que alguien lleva puesto (adorno del perfil): falla en silencio. */
export async function equipamientoDe(id) {
  try { const { data } = await supabase.rpc('equipamiento_de', { p_usuario: id }); return normalizarEquipamiento(data); }
  catch (e) { console.warn('[economia] equipamiento_de:', e); return {}; }
}
/** XP y nivel de otra persona (adorno): null si no se puede ver. */
export async function xpDe(id) {
  try { const { data } = await supabase.rpc('xp_de', { p_usuario: id }); return data && data.visible ? { nivel: Math.max(1, Math.trunc(Number(data.nivel)) || 1), xp: Math.max(0, Math.trunc(Number(data.xp)) || 0) } : null; }
  catch (e) { console.warn('[economia] xp_de:', e); return null; }
}

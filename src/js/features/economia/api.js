// Economía: llama a las RPC (reglas en la BD, migraciones 049-051). Esquema: pages/tienda → features/economia/api → core/economia (puro).
import { supabase } from '../../core/sistema/supabase.js';
import { normalizarPase } from '../../core/economia/phoenix-pass.js';
import { normalizarEconomia, normalizarLista, normalizarMovimiento, normalizarRegla, normalizarPaquetes, normalizarEquipamiento, normalizarEfectosCarta, normalizarMetodos, normalizarPagoManual } from '../../core/economia/economia.js';
import { normalizarGanar } from '../../core/economia/ganarAscuas.js';

// Modo demostración (SOLO en desarrollo: en la web publicada este código no existe). Se activa con ?demo en la dirección y usa datos de mentira.
const DEMO = import.meta.env.DEV && typeof location !== 'undefined' && new URLSearchParams(location.search).has('demo');
export const esDemo = () => DEMO;
let demo = null;

const FALTA = 'La base de datos todavía no tiene activada la economía (falta aplicar las migraciones 049, 050 y 051).';
async function rpc(nombre, args = {}) {
  if (DEMO) { demo ??= await import('./demo.js'); return demo.rpcDemo(nombre, args); }
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
export const comprar = (item, moneda = 'ascuas') => rpc('comprar_item', { p_item: item, p_moneda: moneda });
export const equipar = (item, equipar) => rpc('equipar_item', { p_item: item, p_equipar: equipar });
export const paquetes = async () => normalizarPaquetes(await rpc('paquetes_lista'));
export const aceptarTerminos = () => rpc('aceptar_terminos_compra');
// ── Fase B (migración 120): recompensa diaria con racha, misiones semanales y premios de logros ──
export const misAscuasExtra = async () => normalizarGanar(await rpc('mis_ascuas_extra'));
export const reclamarRachaDiaria = () => rpc('reclamar_racha_diaria');
export const reclamarMision = (clave) => rpc('reclamar_mision', { p_clave: clave });
export const reclamarLogro = (id) => rpc('reclamar_logro', { p_id: id });
export const crearOrden = (paquete) => rpc('crear_orden', { p_paquete: paquete });
export const misOrdenes = () => rpc('mis_ordenes');
export const adminItems = async () => normalizarLista(await rpc('admin_tienda_items'));
export const adminGuardarItem = (v, id = null) => rpc('admin_guardar_item', { p_id: id, p_clave: v.clave, p_nombre: v.nombre, p_descripcion: v.descripcion, p_categoria: v.categoria, p_precio: v.precio, p_nivel_min: v.nivelMin, p_stock: v.stock, p_estilo: v.estilo, p_activo: v.activo });
export const adminResumen = () => rpc('admin_economia_resumen');
export const adminPagos = (activo) => rpc('admin_set_pagos_activos', { p_activo: activo });
export const adminAjustar = (usuario, delta, motivo) => rpc('admin_ajustar_tokens', { p_usuario: usuario, p_delta: delta, p_motivo: motivo });
export const adminRegla = (r) => rpc('admin_guardar_regla', { p_fuente: r.fuente, p_xp: r.xp, p_tokens: r.tokens, p_tope: r.topeDiario, p_activa: r.activa });
// ── Recargas (migraciones 109 y 110): pago manual por Yape/Plin/transferencia con revisión del administrador ──
export const metodosPago = async () => normalizarMetodos(await rpc('pagos_metodos_lista'));
export const crearOrdenMetodo = (paquete, metodo) => rpc('crear_orden_metodo', { p_paquete: paquete, p_metodo: metodo });
/** Pasarela (Mercado Pago): pide a la Edge Function «pago-crear» el enlace de pago de TU orden. Monto y datos salen de la base. */
export async function enlacePasarela(orden) {
  if (DEMO) throw new Error('El pago con tarjeta no está disponible en la demostración.');
  const { data, error } = await supabase.functions.invoke('pago-crear', { body: { orden } });
  if (error || !data?.checkout_url) { console.error('[economia] pago-crear:', error?.message); throw new Error('No se pudo abrir la página de pago. Inténtalo de nuevo en un momento.'); }
  return String(data.checkout_url);
}
export const misPagosManuales = async () => { const d = await rpc('mis_pagos_manuales'); return Array.isArray(d) ? d.map(normalizarPagoManual) : []; };
export const enviarComprobante = (orden, referencia, ruta, nombrePagador) => rpc('enviar_comprobante_manual', { p_orden: orden, p_referencia: referencia, p_comprobante_path: ruta, p_nombre_pagador: nombrePagador });
/** Sube la captura al bucket privado «comprobantes-pago» (carpeta = tu id) y devuelve la ruta. */
export async function subirComprobante(uid, orden, archivo) {
  if (DEMO) return uid + '/' + orden + '.png';
  const ext = { 'image/jpeg': 'jpg', 'image/png': 'png', 'image/webp': 'webp' }[archivo.type];
  if (!ext) throw new Error('La captura debe ser una imagen JPG, PNG o WEBP.');
  if (archivo.size > 3 * 1024 * 1024) throw new Error('La captura pesa más de 3 MB.');
  const ruta = uid + '/' + orden + '-' + Date.now() + '.' + ext;
  const { error } = await supabase.storage.from('comprobantes-pago').upload(ruta, archivo, { contentType: archivo.type, upsert: false });
  if (error) { console.error('[economia] subir comprobante:', error.message); throw new Error('No se pudo subir la captura. Inténtalo de nuevo.'); }
  return ruta;
}
export const adminPagosManuales = (estado = 'en_revision') => rpc('admin_pagos_manuales', { p_estado: estado });
export const adminResolverPago = (orden, aprobar, nota = null, montoConfirmado = null) => rpc('admin_resolver_pago_manual', { p_orden: orden, p_aprobar: aprobar, p_nota: nota, p_monto_confirmado: montoConfirmado });
export const adminAlertas = (resueltas = false) => rpc('admin_alertas', { p_resueltas: resueltas });
export const adminResolverAlerta = (id, nota) => rpc('admin_resolver_alerta', { p_id: id, p_nota: nota });
export const adminRevisarYa = () => rpc('admin_economia_revisar_ya');
export const adminMetodos = () => rpc('admin_metodos_pago');
export const adminGuardarMetodo = (m) => rpc('admin_guardar_metodo', { p_clave: m.clave, p_nombre: m.nombre, p_tipo: m.tipo, p_activo: m.activo, p_orden: m.orden, p_minimo: m.minimo, p_maximo: m.maximo, p_instrucciones: m.instrucciones, p_datos: m.datos });
export const adminSetPrecios = (id, ascuas, gemas) => rpc('admin_set_precios_item', { p_id: id, p_precio_ascuas: ascuas, p_precio_gemas: gemas });
export const economiaAuditar = () => rpc('economia_auditar');
// ── Phoenix Pass (migración 123): pase de temporada, compra única con gemas y reclamo de premios ──
export const paseEstado = async () => normalizarPase(await rpc('pase_estado'));
export const paseComprar = () => rpc('pase_comprar');
export const paseReclamar = (nivel, pista) => rpc('pase_reclamar', { p_nivel: nivel, p_pista: pista });
/** Dirección temporal (5 minutos) para que el administrador vea una captura. */
export async function urlComprobante(ruta) {
  if (DEMO) return '';
  const { data, error } = await supabase.storage.from('comprobantes-pago').createSignedUrl(ruta, 300);
  if (error) throw new Error('No se pudo abrir la captura.');
  return data.signedUrl;
}

/** Lo que alguien lleva puesto (adorno del perfil): falla en silencio. */
export async function equipamientoDe(id) {
  try { const { data } = await supabase.rpc('equipamiento_de', { p_usuario: id }); return normalizarEquipamiento(data); }
  catch (e) { console.warn('[economia] equipamiento_de:', e); return {}; }
}
/** Efecto de carta equipado de varias personas a la vez (adorno de las cartas): {usuario_id: efecto}; falla en silencio. Sin demo: en ?demo no hay efectos ajenos. */
export async function efectosCartaDe(ids) {
  try {
    const lista = [...new Set((Array.isArray(ids) ? ids : []).filter((x) => /^[0-9a-f-]{36}$/i.test(String(x))))].slice(0, 100);
    if (!lista.length || DEMO) return {};
    const { data } = await supabase.rpc('efectos_carta_de', { p_usuarios: lista }); return normalizarEfectosCarta(data);
  } catch (e) { console.warn('[economia] efectos_carta_de:', e); return {}; }
}
/** XP y nivel de otra persona (adorno): null si no se puede ver. */
export async function xpDe(id) {
  try { const { data } = await supabase.rpc('xp_de', { p_usuario: id }); return data && data.visible ? { nivel: Math.max(1, Math.trunc(Number(data.nivel)) || 1), xp: Math.max(0, Math.trunc(Number(data.xp)) || 0) } : null; }
  catch (e) { console.warn('[economia] xp_de:', e); return null; }
}

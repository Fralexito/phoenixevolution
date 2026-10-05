// Interruptor «Opciones de staff» (puro, con almacén inyectado → probable). Solo cambia lo que se MUESTRA en este navegador:
// la base de datos sigue decidiendo qué puede hacer cada cuenta. Por defecto las opciones son visibles.
export const CLAVE_STAFF_UI = 'pes-staff-ui';

/** true = mostrar opciones de staff. Valor ausente, corrupto o sin almacén → true (nunca se oculta por accidente). */
export function leerStaffVisible(almacen) {
  try { return almacen?.getItem(CLAVE_STAFF_UI) !== 'oculto'; } catch { return true; }
}
/** @returns {boolean} true si se pudo guardar */
export function guardarStaffVisible(almacen, visible) {
  try { if (visible) almacen.removeItem(CLAVE_STAFF_UI); else almacen.setItem(CLAVE_STAFF_UI, 'oculto'); return true; }
  catch (e) { console.warn('[staff-ui] no se pudo guardar:', e); return false; }
}

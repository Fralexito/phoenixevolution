// Aplica los ajustes a TODA la web (atributos data-aj-* en <html>, que el CSS lee) y ofrece lectura/escritura a las demás piezas.
import { leerDecision, CLAVE_LIGERO } from '../core/sistema/rendimiento.js';
import { cargarAjustes, guardarAjustes, normalizarAjustes, atributosDe, movimientoReducido, opcionesRegion, CLAVE_AJUSTES } from '../core/sistema/ajustes.js';

const almacen = () => { try { return window.localStorage; } catch { return null; } };
const sistemaReduce = () => window.matchMedia?.('(prefers-reduced-motion: reduce)').matches ?? false;

/** ¿Hay modo ligero automático guardado y vigente? */
export function ligeroGuardado() { const s = almacen(); try { return leerDecision(s?.getItem(CLAVE_LIGERO)) === true; } catch { return false; } }
export function leerAjustes() { const s = almacen(); return s ? cargarAjustes(s) : normalizarAjustes(null); }
export function aplicarAjustes(a) {
  const r = document.documentElement;
  for (const [k, v] of Object.entries(atributosDe(a))) r.setAttribute(k, String(v));
  const lig = ligeroGuardado() && a.movimiento !== 'normal';   // «Siempre activas» manda sobre el modo ligero
  r.setAttribute('data-aj-mov-efectivo', movimientoReducido(a, sistemaReduce(), lig) ? 'reducido' : 'normal');
  if (lig) r.setAttribute('data-rend-ligero', '1'); else r.removeAttribute('data-rend-ligero');
  r.style.fontSize = a.escala === '100' ? '' : `${a.escala}%`;
}
/** Guarda UN cambio, lo aplica al instante y avisa a las demás piezas (evento «ajustes:cambio»). */
export function cambiarAjuste(clave, valor) { return reemplazarAjustes({ ...leerAjustes(), [clave]: valor }); }
export function reemplazarAjustes(nuevos) {
  const a = normalizarAjustes(nuevos); const s = almacen(); const guardado = s ? guardarAjustes(s, a) : false;
  aplicarAjustes(a); window.dispatchEvent(new CustomEvent('ajustes:cambio', { detail: a })); return { ajustes: a, guardado };
}
export const hayMovimientoReducido = () => { const a = leerAjustes(); return movimientoReducido(a, sistemaReduce(), ligeroGuardado() && a.movimiento !== 'normal'); };
/** Opciones de hora/zona para toLocale*String(). */
export const regionAhora = () => opcionesRegion(leerAjustes());
/** Borra TODO lo que esta web guardó en el navegador (claves «pes-*»). Devuelve cuántas borró. */
export function borrarDatosLocales() {
  const s = almacen(); if (!s) return 0; let n = 0;
  try { for (const k of Object.keys(s)) if (k.startsWith('pes-')) { s.removeItem(k); n += 1; } } catch (e) { console.warn('[ajustes] borrado parcial:', e); }
  return n;
}
export function initAjustes() {
  aplicarAjustes(leerAjustes());
  window.matchMedia?.('(prefers-reduced-motion: reduce)').addEventListener?.('change', () => aplicarAjustes(leerAjustes()));
  window.addEventListener('storage', (e) => { if (e.key === CLAVE_AJUSTES) aplicarAjustes(leerAjustes()); });   // otra pestaña cambió un ajuste
}

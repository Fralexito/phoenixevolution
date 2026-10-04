// AJUSTES DEL USUARIO (puro, sin DOM): validación, carga y guardado con un "almacén" inyectado (localStorage en el navegador, un objeto falso en los tests).
// Regla: un valor desconocido o corrupto NUNCA rompe la web: se descarta y se usa el valor por defecto.
import { SECCIONES } from '../../data/ajustes.js';

export const CLAVE_AJUSTES = 'pes-ajustes-v1';
export const LISTA = SECCIONES.flatMap((s) => s.ajustes);
const PERMITIDOS = Object.fromEntries(LISTA.map((a) => [a.clave, a.tipo === 'switch' ? [true, false] : a.opciones.map((o) => o.valor)]));
export const AJUSTES_DEFECTO = Object.fromEntries(LISTA.map((a) => [a.clave, a.defecto]));
export const kebab = (c) => c.replace(/[A-Z]/g, (m) => `-${m.toLowerCase()}`);

/** Deja solo claves conocidas con valores permitidos; todo lo demás vuelve al defecto. */
export function normalizarAjustes(crudo) {
  const o = crudo && typeof crudo === 'object' && !Array.isArray(crudo) ? crudo : {};
  return Object.fromEntries(LISTA.map((a) => [a.clave, PERMITIDOS[a.clave].includes(o[a.clave]) ? o[a.clave] : a.defecto]));
}
export function cargarAjustes(almacen) {
  try { const t = almacen?.getItem(CLAVE_AJUSTES); return normalizarAjustes(t ? JSON.parse(t) : null); }
  catch (e) { console.warn('[ajustes] lectura fallida, se usan los valores por defecto:', e); return { ...AJUSTES_DEFECTO }; }
}
/** @returns {boolean} true si se pudo guardar */
export function guardarAjustes(almacen, ajustes) {
  try { almacen.setItem(CLAVE_AJUSTES, JSON.stringify(normalizarAjustes(ajustes))); return true; }
  catch (e) { console.warn('[ajustes] no se pudo guardar:', e); return false; }
}
/** Atributos que se escriben en <html>: data-aj-<clave-kebab>. Los switches valen «si» / «no». */
export const atributosDe = (a) => Object.fromEntries(LISTA.map((x) => [`data-aj-${kebab(x.clave)}`, typeof a[x.clave] === 'boolean' ? (a[x.clave] ? 'si' : 'no') : a[x.clave]]));

/** ¿Hay que reducir animaciones? `sistemaReduce` = lo que dice el dispositivo (prefers-reduced-motion). */
export const movimientoReducido = (a, sistemaReduce) => a.movimiento === 'reducido' || (a.movimiento === 'sistema' && !!sistemaReduce);
/** Factor de velocidad de la barra de última hora. */
export const factorTicker = (v) => ({ lenta: 0.6, rapida: 1.6 })[v] ?? 1;
/** Opciones de Intl para horas según el ajuste de región (vacías = lo que haga el dispositivo). */
export const opcionesRegion = (a) => ({ ...(a.hora === '12' ? { hour12: true } : { hour12: false }), ...(a.zona && a.zona !== 'auto' ? { timeZone: a.zona } : {}) });

/** Exportación/importación: el archivo lleva versión; al importar se valida todo igual que al cargar. */
export const exportarAjustes = (a) => JSON.stringify({ app: 'phoenix-evolution', version: 1, ajustes: normalizarAjustes(a) }, null, 2);
export function importarAjustes(texto) {
  try { const d = JSON.parse(texto); if (d?.app !== 'phoenix-evolution' || !d.ajustes) return { ok: false, error: 'El archivo no es un respaldo de ajustes de Phoenix Evolution.' }; return { ok: true, ajustes: normalizarAjustes(d.ajustes) }; }
  catch { return { ok: false, error: 'El archivo no se pudo leer (no es JSON válido).' }; }
}

// Modo ligero automático (ronda 346). Lógica pura (sin DOM) → con test. Decide si el dispositivo va justo de rendimiento.
export const CLAVE_LIGERO = 'pes-rend-ligero';
export const CADUCA_MS = 14 * 24 * 3600 * 1000;   // pasadas 2 semanas se vuelve a medir (con los efectos puestos otra vez)
export const MIN_CUADROS = 50;                     // cuadros medidos MIENTRAS se desliza antes de opinar
export const CUADRO_LENTO_MS = 34;                 // un cuadro tarda más de esto (< 30 fps) = tirón
export const PROPORCION_TIRONES = 0.25;            // si 1 de cada 4 cuadros es un tirón, el dispositivo va justo

/** Señales fuertes que no hace falta medir: ahorro de datos activo, memoria ≤ 2 GB o red 2G. */
export function senalDebil({ saveData = false, memoria = null, tipoRed = '' } = {}) {
  return Boolean(saveData) || (Number.isFinite(memoria) && memoria > 0 && memoria <= 2) || /(^|-)2g$/.test(String(tipoRed));
}
/** Con los tiempos (ms) de los cuadros medidos al deslizar: ¿va lento? Ignora pausas largas (pestaña oculta: > 500 ms). */
export function vaLento(cuadros) {
  const c = (cuadros ?? []).filter((x) => Number.isFinite(x) && x > 0 && x < 500);
  if (c.length < MIN_CUADROS) return null;                       // aún no hay datos para opinar
  const tirones = c.filter((x) => x > CUADRO_LENTO_MS).length;
  return tirones / c.length >= PROPORCION_TIRONES;
}
/** Lee lo guardado: devuelve true/false si hay decisión vigente, o null si no hay o ya caducó. */
export function leerDecision(texto, ahora = Date.now()) {
  try { const o = JSON.parse(texto); if (!o || typeof o.t !== 'number' || ahora - o.t > CADUCA_MS || ahora < o.t - 60000) return null; return o.v === 1 ? true : o.v === 0 ? false : null; } catch { return null; }
}
export const guardarDecision = (ligero, ahora = Date.now()) => JSON.stringify({ v: ligero ? 1 : 0, t: ahora });

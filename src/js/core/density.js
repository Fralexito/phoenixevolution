// DENSIDAD de la lista de jugadores: cuántas tarjetas por fila (como el zoom del explorador de archivos). Sin DOM → probable.
// «movil» = pantallas < 640 px; en el resto (tablet/PC) hay más columnas posibles.
export const LIMITES = { movil: { min: 1, max: 4, def: 2 }, pc: { min: 2, max: 8, def: 4 } };
const lim = (movil) => (movil ? LIMITES.movil : LIMITES.pc);

/** Acota `n` al rango válido del dispositivo; si no es un número usa el valor por defecto (p. ej. dato corrupto en localStorage). */
export function columnasValidas(n, movil) {
  const l = lim(movil); const v = n == null || n === '' ? NaN : Math.round(Number(n));
  return Number.isFinite(v) ? Math.min(l.max, Math.max(l.min, v)) : l.def;
}
/** Una columna más o menos, sin salirse del rango. */
export const cambiarColumnas = (n, delta, movil) => columnasValidas(columnasValidas(n, movil) + delta, movil);
/** Separación entre tarjetas (rem): más apretada cuando hay más columnas. */
export function separacion(n, movil) {
  if (movil) return n >= 3 ? 0.4 : 0.65;
  return n <= 3 ? 1.5 : n <= 5 ? 1 : 0.6;
}

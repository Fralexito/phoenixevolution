// ZOOM de la lista de jugadores (como el de iconos del explorador de archivos). Sin DOM → probable.
// El usuario elige un TAMAÑO de tarjeta (ancho mínimo en px); la cuadrícula decide sola cuántas caben (auto-fill)
// y las reparte parejas. Nivel 0 = tarjetas más grandes … último nivel = más pequeñas (el límite).
export const NIVELES = {
  movil: { anchos: [340, 172, 112, 84], def: 1 },
  pc: { anchos: [360, 300, 250, 210, 180, 150, 125, 105], def: 2 },
};
const cfg = (movil) => (movil ? NIVELES.movil : NIVELES.pc);

/** Nivel dentro del rango; si no es un número (dato corrupto o ausente) usa el nivel por defecto. */
export function nivelValido(n, movil) {
  const c = cfg(movil); const v = n == null || n === '' ? NaN : Math.round(Number(n));
  return Number.isFinite(v) ? Math.min(c.anchos.length - 1, Math.max(0, v)) : c.def;
}
/** delta > 0 = alejar (tarjetas más pequeñas, caben más); delta < 0 = acercar. */
export const cambiarNivel = (n, delta, movil) => nivelValido(nivelValido(n, movil) + delta, movil);
export const anchoMinimo = (n, movil) => cfg(movil).anchos[nivelValido(n, movil)];
export const esUltimo = (n, movil) => nivelValido(n, movil) === cfg(movil).anchos.length - 1;
/** Separación entre tarjetas (rem): más apretada cuanto más pequeñas. */
export const separacion = (n, movil) => { const a = anchoMinimo(n, movil); return movil ? (a <= 112 ? 0.4 : 0.65) : (a >= 250 ? 1.5 : a >= 150 ? 1 : 0.6); };
/** ¿Tarjetas tan pequeñas que los botones de la esquina deben encogerse? */
export const esDenso = (n, movil) => anchoMinimo(n, movil) <= (movil ? 130 : 150);

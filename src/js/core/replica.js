// Geometría de la RÉPLICA de una carta de jugador (puro, sin DOM → probable). La réplica es la copia ampliada que se abre al tocar una carta.
// Problema que resuelve: en tarjetas muy pequeñas (zoom mínimo de «Jugadores», o el podio de «Destacados» en celular) el CSS oculta las estadísticas
// (@container ≤ 135 px) y, si la réplica solo escalara la carta pequeña, seguiría sin mostrarlas. Por eso la réplica se construye con un ANCHO BASE
// «normal» (el de la carta en tamaño predeterminado) y desde ahí crece: así se ve completa, igual que en el modo normal.

export const ANCHO_BASE = Object.freeze({ movil: 176, pc: 250 });     // ≈ tamaño predeterminado de la carta en cada pantalla (core/density.js)
export const ESCALA_MAX = Object.freeze({ movil: 1.25, pc: 1.6 });
export const ESCALA_MIN = 0.5;                                        // si ni así cabe en pantallas muy bajitas, se encoge en vez de salirse
const num = (v) => { const n = Number(v); return Number.isFinite(n) ? n : 0; };

/** Ancho con el que se construye la réplica: el de la carta original si ya es «normal» o mayor; si es más angosta, el ancho base. */
export const anchoBase = (anchoOrigen, movil) => Math.max(num(anchoOrigen), movil ? ANCHO_BASE.movil : ANCHO_BASE.pc);
/** ¿La carta es tan angosta (< ancho base de celular) que no se leen sus estadísticas? El podio de «Destacados» solo abre réplica en ese caso; en PC su zoom por CSS basta. */
export const esIlegible = (anchoOrigen) => num(anchoOrigen) > 0 && num(anchoOrigen) < ANCHO_BASE.movil;
/** Escala con la que la réplica «nace» para parecerse a la carta original (1 si ya tiene el tamaño base). */
export const escalaInicial = (anchoOrigen, base) => (num(base) > 0 && num(anchoOrigen) > 0 ? Math.min(1, num(anchoOrigen) / num(base)) : 1);
/** Rectángulo base (con ancho y alto base) centrado sobre el centro de la carta original. */
export function rectBase(origen, ancho, alto) {
  const cx = num(origen.left) + num(origen.width) / 2, cy = num(origen.top) + num(origen.height) / 2;
  return { left: cx - ancho / 2, top: cy - alto / 2, width: ancho, height: alto };
}
/** Escala final y desplazamiento para llevar la réplica al centro de la zona libre (bajo la barra y sobre el dock). null si no hay espacio. */
export function destino({ base, vw, vh, barra = 0, movil = false }) {
  const arriba = Math.min(160, Math.max(0, num(barra))) + 12, abajo = movil ? 64 : 16, libre = num(vh) - arriba - abajo;
  if (!base || !num(base.width) || !num(base.height) || libre <= 0) return null;
  const s = Math.max(ESCALA_MIN, Math.min(movil ? ESCALA_MAX.movil : ESCALA_MAX.pc, (libre * 0.98) / base.height, ((num(vw) - 16) * 0.98) / base.width));
  return { s, dx: num(vw) / 2 - (base.left + base.width / 2), dy: arriba + libre / 2 - (base.top + base.height / 2) };
}
/** Transformación de regreso: del centro de pantalla al centro actual de la carta original, con la escala con la que nació. */
export function regreso(base, origenActual, k0 = 1) {
  const cb = { x: base.left + base.width / 2, y: base.top + base.height / 2 };
  return { dx: num(origenActual.left) + num(origenActual.width) / 2 - cb.x, dy: num(origenActual.top) + num(origenActual.height) / 2 - cb.y, k: k0 };
}

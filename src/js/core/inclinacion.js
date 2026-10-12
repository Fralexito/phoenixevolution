// Inclinación 3D de la capa «prof3d» (ronda 242). Lógica pura, sin DOM. Pruebas: tests/inclinacion.test.mjs
// Cuanto más grande el elemento, menos se inclina: una tarjeta chica llega a ±8°, un panel ancho con tablas apenas ±1–2°
// (así leer o escribir en un panel grande no marea).

// Lo que tiene TABLAS (posiciones, estadísticas) va en modo «suave»: como máximo 0,8°, porque se lee con calma (pedido de Fralex, ronda 244).
export const MAX_SUAVE = 0.8;

/** Ángulo máximo según el lado más largo del elemento (px). `suave` = el elemento tiene una tabla. */
export function maxInclinacion(ancho, alto, { suave = false } = {}) {
  const lado = Math.max(Number(ancho) || 0, Number(alto) || 0);
  if (!lado) return 0;
  const max = Math.max(1, Math.min(8, 2600 / lado));
  return suave ? Math.min(MAX_SUAVE, max) : max;
}

/** Grados de giro según dónde está el mouse dentro del elemento. x/y en px relativos a la esquina superior izquierda.
 *  Devuelve { rx, ry }: rx = giro sobre el eje X (arriba/abajo), ry = sobre el eje Y (izquierda/derecha). El lado del mouse «se hunde». */
export function inclinacion(x, y, ancho, alto, opciones = {}) {
  const max = maxInclinacion(ancho, alto, opciones);
  if (!max) return { rx: 0, ry: 0 };
  const cx = Math.min(1, Math.max(0, x / ancho)) - 0.5;
  const cy = Math.min(1, Math.max(0, y / alto)) - 0.5;
  return { rx: +(-cy * 2 * max).toFixed(2), ry: +(cx * 2 * max).toFixed(2) };
}

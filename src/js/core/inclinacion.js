// Inclinación 3D de la capa «prof3d» (ronda 242). Lógica pura, sin DOM. Pruebas: tests/inclinacion.test.mjs
// Cuanto más grande el elemento, menos se inclina: una tarjeta chica llega a ±8°, un panel ancho con tablas apenas ±1–2°
// (así leer o escribir en un panel grande no marea).

/** Ángulo máximo según el lado más largo del elemento (px). */
export function maxInclinacion(ancho, alto) {
  const lado = Math.max(Number(ancho) || 0, Number(alto) || 0);
  if (!lado) return 0;
  return Math.max(1, Math.min(8, 2600 / lado));
}

/** Grados de giro según dónde está el mouse dentro del elemento. x/y en px relativos a la esquina superior izquierda.
 *  Devuelve { rx, ry }: rx = giro sobre el eje X (arriba/abajo), ry = sobre el eje Y (izquierda/derecha). El lado del mouse «se hunde». */
export function inclinacion(x, y, ancho, alto) {
  const max = maxInclinacion(ancho, alto);
  if (!max) return { rx: 0, ry: 0 };
  const cx = Math.min(1, Math.max(0, x / ancho)) - 0.5;
  const cy = Math.min(1, Math.max(0, y / alto)) - 0.5;
  return { rx: +(-cy * 2 * max).toFixed(2), ry: +(cx * 2 * max).toFixed(2) };
}

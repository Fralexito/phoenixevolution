// ANCLAJE del pulso en vivo: la barra de botones se puede dejar en CUALQUIER parte de la pantalla. Sin DOM → probable.
// Se guarda como «a qué lado está y a cuántos px de ese lado»: { h:'l'|'r', dx, v:'t'|'b', dy }.
// Así, si la ventana cambia de tamaño o se gira el celular, sigue pegado a su lado y solo se corrige para no salirse.
export const MARGEN = 8;

/** Convierte el rectángulo de la barra (coordenadas de ventana) en un anclaje al lado más cercano. */
export function dockDesdeRect(r, vw, vh) {
  const h = (r.left + r.right) / 2 < vw / 2 ? 'l' : 'r';
  const v = (r.top + r.bottom) / 2 < vh / 2 ? 't' : 'b';
  return { h, dx: h === 'l' ? r.left : vw - r.right, v, dy: v === 't' ? r.top : vh - r.bottom };
}
const acotar = (n, lo, hi) => Math.min(Math.max(n, lo), Math.max(lo, hi));
/** Anclaje válido para una ventana vw×vh y una barra rw×rh: la barra nunca se sale de la pantalla. */
export function dockAjustado(d, vw, vh, rw, rh) {
  return { h: d.h === 'r' ? 'r' : 'l', v: d.v === 't' ? 't' : 'b', dx: acotar(Number(d.dx) || 0, MARGEN, vw - rw - MARGEN), dy: acotar(Number(d.dy) || 0, MARGEN, vh - rh - MARGEN) };
}
/** Lee un anclaje guardado (JSON); null si falta o está corrupto. */
export function dockLeer(texto) {
  try { const d = JSON.parse(texto); return d && Number.isFinite(d.dx) && Number.isFinite(d.dy) && ['l', 'r'].includes(d.h) && ['t', 'b'].includes(d.v) ? d : null; } catch { return null; }
}

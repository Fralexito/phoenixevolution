// Lienzo libre de Noticias (puro → probable): cada tarjeta tiene {x,y,w,h} en una grilla de 12 columnas × filas de 90 px.
export const COLS = 12; export const FILA_PX = 90;
const ent = (v, min, max, def) => { const n = Math.trunc(Number(v)); return Number.isFinite(n) ? Math.min(max, Math.max(min, n)) : def; };
/** Limpia lo que venga de la BD; null si no sirve. */
export function limpiarLienzo(l) {
  if (!l || typeof l !== 'object') return null;
  const w = ent(l.w, 2, COLS, 4); const x = ent(l.x, 0, COLS - w, 0);
  return { x, y: ent(l.y, 0, 500, 0), w, h: ent(l.h, 2, 12, 4) };
}
/** true si el staff ya armó el lienzo (aunque sea una tarjeta). */
export const hayLienzo = (lista) => lista.some((n) => n.lienzo);
/** Tamaño por defecto según el diseño de la tarjeta (las que aún no se colocaron). */
export const tamanoBase = (cols) => (cols >= 3 ? { w: 12, h: 5 } : cols === 2 ? { w: 8, h: 4 } : { w: 4, h: 4 });
/** Orden de lectura en celular: de arriba a abajo, de izquierda a derecha; las no colocadas al final. */
export const ordenLectura = (lista) => [...lista].sort((a, b) => (!a.lienzo) - (!b.lienzo) || (a.lienzo?.y ?? 0) - (b.lienzo?.y ?? 0) || (a.lienzo?.x ?? 0) - (b.lienzo?.x ?? 0));

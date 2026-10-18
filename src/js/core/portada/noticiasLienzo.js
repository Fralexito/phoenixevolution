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

// ───────────── Propuestas de acomodo (plantillas que colocan todo de un clic) ─────────────
// items: [{ id, joda:boolean, imagen:boolean }] ya en orden de importancia (la 1.ª = la noticia principal).
const fila = (out, y, piezas) => { let x = 0; for (const [it, w, h] of piezas) { if (it) out.push({ id: it.id, x, y, w, h }); x += w; } };
/** Rellena lo que sobre en filas de 3 tarjetas 4×4. */
const resto = (out, items, y) => { for (let i = 0; i < items.length; i += 3) { fila(out, y, items.slice(i, i + 3).map((it) => [it, 4, 4])); y += 4; } return out; };
export const PROPUESTAS = [
  { id: 'portada', nombre: 'Portada épica', icono: 'fa-star', desc: 'Una noticia gigante a lo ancho y el resto en filas de 3.',
    armar: (it) => { const o = []; fila(o, 0, [[it[0], 12, 6]]); return resto(o, it.slice(1), 6); } },
  { id: 'revista', nombre: 'Revista', icono: 'fa-book-open', desc: 'Principal grande a la izquierda, dos titulares apilados a la derecha.',
    armar: (it) => { const o = []; fila(o, 0, [[it[0], 8, 6]]); if (it[1]) o.push({ id: it[1].id, x: 8, y: 0, w: 4, h: 3 }); if (it[2]) o.push({ id: it[2].id, x: 8, y: 3, w: 4, h: 3 }); return resto(o, it.slice(3), 6); } },
  { id: 'bento', nombre: 'Bento', icono: 'fa-table-cells-large', desc: 'Mosaico de tamaños distintos, estilo app moderna.',
    armar: (it) => { const T = [[0, 0, 6, 6], [6, 0, 6, 3], [6, 3, 3, 3], [9, 3, 3, 3], [0, 6, 4, 4], [4, 6, 8, 4]]; const o = it.slice(0, T.length).map((x, i) => ({ id: x.id, x: T[i][0], y: T[i][1], w: T[i][2], h: T[i][3] })); return resto(o, it.slice(T.length), 10); } },
  { id: 'duo', nombre: 'Cara a cara', icono: 'fa-code-compare', desc: 'Dos noticias grandes lado a lado y debajo el resto.',
    armar: (it) => { const o = []; fila(o, 0, [[it[0], 6, 6], [it[1], 6, 6]]); return resto(o, it.slice(2), 6); } },
  { id: 'serio-joda', nombre: 'Serio arriba, joda abajo', icono: 'fa-masks-theater', desc: 'Lo oficial manda arriba; la Tribuna se arma en un muro de memes al final.',
    armar: (it) => { const s = it.filter((x) => !x.joda); const j = it.filter((x) => x.joda); const o = []; fila(o, 0, [[s[0], 8, 5], [s[1], 4, 5]]); let y = 5; resto(o, s.slice(2), y); y += Math.ceil(Math.max(0, s.length - 2) / 3) * 4;
      for (let i = 0; i < j.length; i += 4) { fila(o, y, j.slice(i, i + 4).map((x) => [x, 3, 3])); y += 3; } return o; } },
  { id: 'lista', nombre: 'Columna de diario', icono: 'fa-newspaper', desc: 'Todo en tiras anchas, una debajo de otra. Ideal para leer de corrido.',
    armar: (it) => it.map((x, i) => ({ id: x.id, x: 0, y: i * 3, w: 12, h: 3 })) },
];

// ───────────── Corrector: detecta acomodos raros y propone el arreglo ─────────────
const choca = (a, b) => a.x < b.x + b.w && b.x < a.x + a.w && a.y < b.y + b.h && b.y < a.y + a.h;
/** Celdas vacías ENCERRADAS (con una tarjeta más abajo en la misma columna): los huecos que se ven feos. */
export function huecos(nodos) {
  const alto = Math.max(0, ...nodos.map((n) => n.y + n.h)); let vacias = 0;
  for (let y = 0; y < alto; y++) for (let x = 0; x < COLS; x++) {
    const c = { x, y, w: 1, h: 1 };
    if (!nodos.some((n) => choca(n, c)) && nodos.some((n) => n.y > y && n.x <= x && x < n.x + n.w)) vacias++;   // vacía y con una tarjeta debajo en esa columna
  }
  return vacias;
}
/**
 * @param {{id,x,y,w,h}[]} nodos  posición actual
 * @param {Map<string,{joda:boolean, imagen:boolean, titulo:string}>} info
 * @returns {{nivel:'mal'|'ojo'|'tip', texto:string, arreglo?:string, id?:string}[]}
 */
export function diagnosticar(nodos, info) {
  const out = []; if (!nodos.length) return out;
  const h = huecos(nodos);
  if (h >= 2) out.push({ nivel: 'mal', texto: `Hay ${h} espacios vacíos encima de otras noticias: se ve como si faltara algo.`, arreglo: 'compactar' });
  const cortas = nodos.filter((n) => n.w < 3 || (info.get(String(n.id))?.imagen && n.h < 3));
  cortas.forEach((n) => out.push({ nivel: 'mal', texto: `«${info.get(String(n.id))?.titulo ?? 'Una noticia'}» es tan chica que el texto o la foto se cortan.`, arreglo: 'agrandar', id: String(n.id) }));
  const laterales = huecosLaterales(nodos);
  if (laterales >= 2) out.push({ nivel: 'tip', texto: 'Alguna fila no llega al borde derecho y deja un vacío. Puedo estirar la última tarjeta de esa fila.', arreglo: 'rellenar' });
  const arriba = [...nodos].sort((a, b) => a.y - b.y || a.x - b.x)[0]; const mayor = [...nodos].sort((a, b) => b.w * b.h - a.w * a.h)[0];
  if (arriba && mayor && arriba !== mayor && mayor.w * mayor.h > arriba.w * arriba.h * 1.5) out.push({ nivel: 'tip', texto: 'La noticia más grande no está arriba. Lo primero que se ve debería ser lo más importante.', arreglo: 'subirMayor', id: String(mayor.id) });
  if (arriba && info.get(String(arriba.id))?.joda && nodos.some((n) => !info.get(String(n.id))?.joda)) out.push({ nivel: 'ojo', texto: 'La portada es de Tribuna (joda). Si hoy hay un anuncio serio, quedará opacado.', arreglo: 'subirSerio' });
  if (nodos.every((n) => n.w === nodos[0].w && n.h === nodos[0].h) && nodos.length > 3) out.push({ nivel: 'tip', texto: 'Todas miden igual: la página se ve plana. Agranda la principal para dar jerarquía.', arreglo: 'jerarquia' });
  return out;
}

/** Vacíos a la derecha de una fila (con más contenido debajo): la fila queda «coja». */
export function huecosLaterales(nodos) {
  const alto = Math.max(0, ...nodos.map((n) => n.y + n.h)); let v = 0;
  for (let y = 0; y < alto; y++) for (let x = 0; x < COLS; x++) {
    const c = { x, y, w: 1, h: 1 };
    if (!nodos.some((n) => choca(n, c)) && nodos.some((n) => n.y > y) && !nodos.some((n) => n.y > y && n.x <= x && x < n.x + n.w)) v++;
  }
  return v;
}
/** Aplica un arreglo y devuelve nodos nuevos (no toca los originales). */
export function arreglar(nodos, arreglo, { id, info } = {}) {
  let n = nodos.map((x) => ({ ...x }));
  const porLectura = () => n.sort((a, b) => a.y - b.y || a.x - b.x);
  if (arreglo === 'compactar') { // sube cada tarjeta hasta donde pueda sin chocar
    // Cada tarjeta (en orden de lectura) va al primer lugar libre, de arriba a abajo y de izquierda a derecha: rellena huecos sin cambiar tamaños.
    porLectura(); const puestos = [];
    for (const t of n) {
      busca: for (let y = 0; y <= t.y; y++) for (let x = 0; x + t.w <= COLS; x++) { if (!puestos.some((p) => choca(p, { ...t, x, y }))) { t.x = x; t.y = y; break busca; } }
      puestos.push(t);
    }
  } else if (arreglo === 'igualar') {
    const filas = new Map(); n.forEach((t) => filas.set(t.y, Math.max(filas.get(t.y) ?? 0, t.h))); n.forEach((t) => { t.h = filas.get(t.y); });
    n = arreglar(n, 'compactar');
  } else if (arreglo === 'agrandar') { const t = n.find((x) => String(x.id) === id); if (t) { t.w = Math.max(t.w, 4); t.h = Math.max(t.h, 4); t.x = Math.min(t.x, COLS - t.w); } n = separar(n, id);
  } else if (arreglo === 'rellenar') {
    for (const t of porLectura()) while (t.x + t.w < COLS && !n.some((o) => o !== t && choca(o, { ...t, w: t.w + 1 }))) t.w++;   // cada tarjeta se estira a la derecha mientras haya vacío
  } else if (arreglo === 'subirMayor') {   // la tarjeta más grande sube a la cabecera; el resto se reacomoda debajo
    const m = n.find((x) => String(x.id) === id); if (m) { m.x = 0; m.y = 0; n = arreglar(separar(n, id), 'compactar'); }
  } else if (arreglo === 'subirSerio') {     // la primera noticia seria toma el lugar de portada (se intercambian)
    porLectura(); const p = n[0]; const s = n.find((x) => !info?.get(String(x.id))?.joda);
    if (s && s !== p) { const a = p.id; p.id = s.id; s.id = a; }
  } else if (arreglo === 'jerarquia') { porLectura(); n[0].w = 12; n[0].h = 6; n[0].x = 0; n = separar(n, String(n[0].id)); }
  return n;
}
/** Empuja hacia abajo lo que choque con la tarjeta `id` (después de agrandarla). */
function separar(n, id) {
  const fija = n.find((x) => String(x.id) === id); if (!fija) return n;
  const orden = n.filter((x) => x !== fija).sort((a, b) => a.y - b.y || a.x - b.x); const puestos = [fija];
  for (const t of orden) { while (puestos.some((p) => choca(p, t))) t.y++; puestos.push(t); }
  return n;
}

/** «Arreglar todo»: aplica cada tipo de arreglo una vez, en un orden que no se pisa (primero tamaños, luego huecos, luego jerarquía). */
export function arreglarTodo(nodos, info) {
  let n = nodos.map((x) => ({ ...x }));
  for (const d of diagnosticar(n, info).filter((x) => x.arreglo === 'agrandar')) n = arreglar(n, 'agrandar', { id: d.id });
  n = arreglar(arreglar(arreglar(n, 'compactar'), 'rellenar'), 'compactar');
  for (const tipo of ['subirSerio', 'subirMayor']) { const d = diagnosticar(n, info).find((x) => x.arreglo === tipo); if (d) n = arreglar(n, tipo, { id: d.id, info }); }   // intercambia rectángulos: nunca se solapan
  return n;
}

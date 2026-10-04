// Geometría pura del recortador de fotos (sin DOM → probable con `npm test`).
// Estado = { x, y, s }: la imagen se dibuja con su esquina superior izquierda en (x, y) del marco y escalada `s` (px del marco por px de la imagen).
// Regla de oro: la imagen SIEMPRE cubre el marco (nunca quedan bordes vacíos).
// Proporciones disponibles (ancho/alto). Deben coincidir con perfiles `jugadores_foto_aspecto_ok` en la BD [BD].
export const ASPECTOS = { '5/4': { ratio: 5 / 4, nombre: 'Horizontal' }, '1/1': { ratio: 1, nombre: 'Cuadrada' }, '4/5': { ratio: 4 / 5, nombre: 'Alta' } };
export const ASPECTO_DEF = '5/4';
/** Valor guardado → proporción válida (si es nulo o desconocido, la de siempre). */
export const aspectoValido = (a) => (Object.hasOwn(ASPECTOS, a) ? a : ASPECTO_DEF);
export const ratioDe = (a) => ASPECTOS[aspectoValido(a)].ratio;
export const OUT_W = 800;             // ancho de la imagen guardada (alto = 640)
export const MAX_ZOOM = 4;            // hasta 4 veces el tamaño mínimo que cubre el marco

/** Escala mínima para que la imagen cubra todo el marco. */
export const coverScale = (nw, nh, fw, fh) => Math.max(fw / nw, fh / nh);

/** Limita la posición para que no se vea fuera de la imagen. */
export function clampPos(x, y, s, nw, nh, fw, fh) {
  return { x: Math.min(0, Math.max(fw - nw * s, x)), y: Math.min(0, Math.max(fh - nh * s, y)) };
}

/** Estado inicial: cubre el marco, centrada en horizontal y un poco hacia arriba (donde suele estar la cara). */
export function initialState(nw, nh, fw, fh) {
  const s = coverScale(nw, nh, fw, fh);
  return { s, ...clampPos((fw - nw * s) / 2, (fh - nh * s) * 0.3, s, nw, nh, fw, fh) };
}

/** Multiplica el zoom por `factor` manteniendo quieto el punto (cx, cy) del marco. Respeta el mínimo (cubrir) y el máximo. */
export function zoomAt(st, factor, cx, cy, { nw, nh, fw, fh }) {
  const s0 = coverScale(nw, nh, fw, fh);
  const s = Math.min(s0 * MAX_ZOOM, Math.max(s0, st.s * factor));
  const px = (cx - st.x) / st.s; const py = (cy - st.y) / st.s;       // punto de la imagen que está bajo (cx, cy)
  return { s, ...clampPos(cx - px * s, cy - py * s, s, nw, nh, fw, fh) };
}

/** Si el marco cambia de ancho (girar el celular), todo se reescala proporcionalmente. */
export const rescale = (st, k) => ({ s: st.s * k, x: st.x * k, y: st.y * k });

/** Zona de la imagen ORIGINAL que queda dentro del marco (para recortar de verdad). */
export const sourceRect = (st, fw, fh) => ({ sx: -st.x / st.s, sy: -st.y / st.s, sw: fw / st.s, sh: fh / st.s });

/** Tamaño de salida: hasta OUT_W de ancho, sin agrandar más de lo que da la zona recortada (mínimo 320). El alto sale de la proporción. */
export function outSize(sw, aspecto = ASPECTO_DEF) {
  const w = Math.max(320, Math.min(OUT_W, Math.round(sw)));
  return { w, h: Math.round(w / ratioDe(aspecto)) };
}

// FÍSICA DE MOVIMIENTO (Apple design, 27-oct-2026: «Designing Fluid Interfaces», WWDC 2018). Lógica pura, sin DOM.
//  · resorte: se mueve desde donde ESTÁ con la velocidad que TRAE (se puede interrumpir y redirigir en cualquier momento).
//    Se piensa con dos números, como Apple: amortiguación (1 = sin rebote · 0.8 = un poco de rebote) y respuesta (segundos, menor = más ágil).
//  · proyectar: dónde terminaría un gesto lanzado con cierta velocidad (la misma fórmula que el desplazamiento del iPhone).
//  · elastico: al pasar un borde, se resiste cada vez más en vez de frenar en seco.
// Pruebas: tests/resorte.test.mjs

/** Constantes de un resorte a partir de amortiguación y respuesta (masa 1). */
export function constantes({ amortiguacion = 1, respuesta = 0.35 } = {}) {
  const w = (2 * Math.PI) / Math.max(0.05, respuesta);
  return { rigidez: w * w, friccion: 2 * Math.max(0, amortiguacion) * w };
}

/** Un paso de `dt` segundos: {x, v} → {x, v} hacia `destino`. Semi-implícito (estable con dt de pantalla). */
export function paso(estado, destino, dt, k) {
  const sub = Math.max(1, Math.ceil(dt / (1 / 240))); const h = dt / sub; let { x, v } = estado;
  for (let i = 0; i < sub; i++) { const a = -k.rigidez * (x - destino) - k.friccion * v; v += a * h; x += v * h; }
  return { x, v };
}

/** ¿Ya se quedó quieto? */
export const quieto = ({ x, v }, destino, tolX = 0.5, tolV = 8) => Math.abs(x - destino) < tolX && Math.abs(v) < tolV;

/** Simula un resorte completo (para pruebas y para saber cuánto tarda): devuelve los cuadros hasta quedarse quieto. */
export function simular(desde, destino, { velocidad = 0, ...op } = {}, fps = 60, max = 600) {
  const k = constantes(op); let s = { x: desde, v: velocidad }; const out = [s.x];
  for (let i = 0; i < max && !quieto(s, destino); i++) { s = paso(s, destino, 1 / fps, k); out.push(s.x); }
  return out;
}

/** Dónde terminaría un gesto con velocidad `v` (px/s). Fórmula de Apple; 0.998 = como el desplazamiento normal. */
export const proyectar = (v, desaceleracion = 0.998) => ((v / 1000) * desaceleracion) / (1 - desaceleracion);

/** Resistencia elástica al pasar un borde: cuánto se mueve de verdad si el dedo se pasó `exceso` px de un largo `dim`. */
export const elastico = (exceso, dim, c = 0.55) => (exceso * dim * c) / (dim + c * Math.abs(exceso));

/** Velocidad (px/s) a partir de las últimas muestras [{t (ms), x}], mirando solo los últimos `ventana` ms. */
export function velocidad(muestras, ventana = 100) {
  if (!muestras?.length) return 0;
  const fin = muestras[muestras.length - 1]; let ini = fin;
  for (let i = muestras.length - 1; i >= 0 && fin.t - muestras[i].t <= ventana; i--) ini = muestras[i];
  const dt = (fin.t - ini.t) / 1000; return dt > 0 ? (fin.x - ini.x) / dt : 0;
}

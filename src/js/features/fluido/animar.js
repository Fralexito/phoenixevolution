// Animador de RESORTES para el navegador (Apple design, 27-oct-2026). Usa la física pura de core/sistema/resorte.js.
// Regla de Apple: toda animación arranca desde donde la cosa ESTÁ y con la velocidad que TRAE, y se puede interrumpir:
// si llega otra orden a mitad de camino, la nueva sigue desde ahí sin saltos («nunca un muro de ladrillo»).
import { constantes, paso, quieto } from '../../core/sistema/resorte.js';

const vivos = new WeakMap();   // elemento → {x, v, raf}

/**
 * Lleva el valor de `el` (leído/escrito con `leer`/`poner`) hasta `destino` con un resorte.
 * @param {Element} el
 * @param {number} destino
 * @param {{velocidad?:number, amortiguacion?:number, respuesta?:number, leer?:()=>number, poner:(x:number)=>void, alTerminar?:()=>void}} op
 * @returns {() => void} cancelar
 */
export function resorte(el, destino, op) {
  const previo = vivos.get(el); if (previo) cancelAnimationFrame(previo.raf);
  const k = constantes(op);
  let s = { x: previo ? previo.x : (op.leer?.() ?? 0), v: op.velocidad ?? (previo ? previo.v : 0) };
  if (op.velocidad !== undefined) s.v = op.velocidad;
  let t0 = performance.now(); const yo = { x: s.x, v: s.v, raf: 0 }; vivos.set(el, yo);
  const cuadro = (t) => {
    const dt = Math.min(0.064, (t - t0) / 1000); t0 = t;
    s = paso(s, destino, dt, k); yo.x = s.x; yo.v = s.v;
    if (quieto(s, destino)) { op.poner(destino); vivos.delete(el); op.alTerminar?.(); return; }
    op.poner(s.x); yo.raf = requestAnimationFrame(cuadro);
  };
  yo.raf = requestAnimationFrame(cuadro);
  return () => { cancelAnimationFrame(yo.raf); vivos.delete(el); };
}
/** Valor y velocidad actuales de un resorte en marcha (o null). Sirve para «agarrarlo» a mitad de camino. */
export const enMarcha = (el) => vivos.get(el) ?? null;
/** Detiene el resorte de `el` donde esté y devuelve su posición actual. */
export function agarrar(el) { const r = vivos.get(el); if (!r) return null; cancelAnimationFrame(r.raf); vivos.delete(el); return r.x; }

/** Vibración corta para momentos que importan (Android). Nada si el sistema pide menos movimiento. */
export function vibrar(ms = 8) {
  try { if (document.documentElement.getAttribute('data-aj-mov-efectivo') === 'reducido') return; navigator.vibrate?.(ms); } catch { /* sin vibración */ }
}

// Confeti de celebración (librería canvas-confetti, se carga solo cuando se usa). Respeta «Ajustes → Animaciones».
import { hayMovimientoReducido } from './ajustes.js';
const COLORES = ['#00e5ff', '#7c3aed', '#fbbf24', '#ffffff'];
/** origen: elemento o {x,y} en 0..1 (por defecto abajo al centro). Devuelve true si lanzó confeti. */
export async function celebrar(origen = null, { fuerte = false } = {}) {
  if (hayMovimientoReducido()) return false;
  try {
    const { default: confetti } = await import('canvas-confetti');
    let o = { x: 0.5, y: 0.85 };
    if (origen?.getBoundingClientRect) { const r = origen.getBoundingClientRect(); o = { x: (r.left + r.width / 2) / innerWidth, y: (r.top + r.height / 2) / innerHeight }; }
    else if (origen) o = origen;
    confetti({ particleCount: fuerte ? 140 : 60, spread: fuerte ? 90 : 60, startVelocity: 38, origin: o, colors: COLORES, scalar: 0.9, disableForReducedMotion: true, ticks: 160 });
    return true;
  } catch (e) { console.warn('[celebrar]', e); return false; }
}

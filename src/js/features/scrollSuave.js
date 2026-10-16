// Scroll suave (Lenis). Solo con mouse, y se apaga con «Animaciones → Reducidas». Flag FX.scrollSuave (empieza en false: pruébalo en la vista previa).
import { hayMovimientoReducido } from './ajustes.js';
export async function initScrollSuave() {
  if (hayMovimientoReducido() || !matchMedia('(hover: hover) and (pointer: fine)').matches) return;
  const { default: Lenis } = await import('lenis');
  const l = new Lenis({ duration: 1.05, easing: (t) => 1 - Math.pow(1 - t, 3), prevent: (n) => n.closest?.('[data-lenis-prevent], dialog, .modal, [role=dialog], textarea, select') });
  const tick = (t) => { l.raf(t); requestAnimationFrame(tick); };
  requestAnimationFrame(tick);
}

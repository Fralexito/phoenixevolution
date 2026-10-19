// Scroll suave (Lenis). Solo con mouse, y se apaga con «Animaciones → Reducidas». Flag FX.scrollSuave (empieza en false: pruébalo en la vista previa).
// RENDIMIENTO (19-oct-2026, Fralex: «siento la web más pesada»): antes el bucle de Lenis corría 60 veces por segundo SIEMPRE, aunque no movieras
// la página, y frenaba en 1,05 s (se sentía «pesado»). Ahora el bucle solo corre mientras hay desplazamiento y frena en 0,7 s.
import { hayMovimientoReducido } from './ajustes.js';
export async function initScrollSuave() {
  if (hayMovimientoReducido() || !matchMedia('(hover: hover) and (pointer: fine)').matches) return;
  const { default: Lenis } = await import('lenis');
  const l = new Lenis({ duration: 0.7, easing: (t) => 1 - Math.pow(1 - t, 3), prevent: (n) => n.closest?.('[data-lenis-prevent], dialog, .modal, [role=dialog], textarea, select') });
  let raf = 0; let quietos = 0;
  const tick = (t) => {
    l.raf(t);
    quietos = l.isScrolling ? 0 : quietos + 1;
    raf = quietos > 10 ? 0 : requestAnimationFrame(tick);   // ~10 cuadros sin movimiento: se duerme hasta el próximo gesto
  };
  const despertar = () => { quietos = 0; if (!raf) raf = requestAnimationFrame(tick); };
  for (const ev of ['wheel', 'keydown', 'pointerdown', 'touchstart']) addEventListener(ev, despertar, { passive: true, capture: true });
  const irA = l.scrollTo.bind(l); l.scrollTo = (...a) => { despertar(); return irA(...a); };   // también cuando el código pide desplazar (anclas, «volver arriba»)
  despertar();
}

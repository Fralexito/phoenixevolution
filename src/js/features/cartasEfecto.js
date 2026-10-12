// Posición del mouse dentro de cada carta (--mx / --my en %), para los efectos «Luz que sigue al mouse» y «Tornasol» (ronda 254).
// Un solo listener para toda la página, como máximo un cálculo por cuadro. Solo con mouse.
export function initCartasEfecto() {
  try {
    let pend = null; let raf = 0;
    const cuadro = () => {
      raf = 0; const e = pend; if (!e) return;
      const c = e.target.closest?.('.pc'); if (!c) return;
      const r = c.getBoundingClientRect(); if (!r.width) return;
      c.style.setProperty('--mx', `${Math.round(((e.clientX - r.left) / r.width) * 100)}%`);
      c.style.setProperty('--my', `${Math.round(((e.clientY - r.top) / r.height) * 100)}%`);
    };
    document.addEventListener('pointermove', (e) => { if (e.pointerType !== 'mouse') return; pend = e; if (!raf) raf = requestAnimationFrame(cuadro); }, { passive: true });
  } catch (e) { console.warn('[cartasEfecto] desactivado:', e); }
}

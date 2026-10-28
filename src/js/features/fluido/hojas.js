// HOJAS QUE SE ARRASTRAN (Apple design, 27-oct-2026). Las hojas que suben desde abajo en el celular (lista Phoenix y calendario Phoenix)
// se pueden BAJAR CON EL DEDO para cerrarlas, como en el iPhone:
//   · la hoja sigue al dedo 1:1 (desde donde la agarraste); hacia arriba se resiste como un elástico;
//   · al soltar, mira hacia dónde iba el gesto (velocidad + impulso): si iba a cerrarse, se cierra siguiendo la misma velocidad;
//     si no, vuelve a su lugar con un pequeño rebote (porque el gesto traía impulso);
//   · si la lista está desplazada, primero se desplaza la lista; el arrastre empieza solo cuando está arriba del todo.
// Funciona con cualquier hoja .sx-velo.sx-hoja (escucha a todo el documento).
import { resorte, agarrar, vibrar } from './animar.js';
import { velocidad, proyectar, elastico } from '../../core/sistema/resorte.js';

const UMBRAL = 10;   // px antes de decidir que es un arrastre (para no confundir con un toque)

function partes(velo) { return [velo.querySelector('.sx-cab'), velo.querySelector('.sx-panel')].filter(Boolean); }
function mover(velo, y) {
  for (const p of partes(velo)) p.style.translate = `0 ${y}px`;
  const alto = velo.querySelector('.sx-panel')?.offsetHeight || 400;
  velo.style.setProperty('--sx-velo-op', String(Math.max(0, 1 - Math.max(0, y) / (alto * 1.2))));
}

export function initHojasArrastrables() {
  if (window.__hojasPhoenix) return; window.__hojasPhoenix = true;
  let g = null;   // gesto en curso
  document.addEventListener('touchstart', (e) => {
    const velo = e.target.closest?.('.sx-velo.sx-hoja'); if (!velo || e.touches.length > 1) { g = null; return; }
    const scroller = e.target.closest('.sx-lista, .cal-cuerpo, .cal-anios, .cal-col');
    const desde = agarrar(velo);   // si la hoja venía volviendo, se agarra a mitad de camino
    const t = e.touches[0];
    g = { velo, scroller, x0: t.clientX, y0: t.clientY - (desde ?? 0), base: desde ?? 0, decidido: desde !== null, muestras: [{ t: e.timeStamp, x: desde ?? 0 }] };
    if (desde !== null) velo.classList.add('sx-arrastrando');
  }, { capture: true, passive: true });
  document.addEventListener('touchmove', (e) => {
    if (!g) return; const t = e.touches[0];
    const dy = t.clientY - g.y0, dx = t.clientX - g.x0;
    if (!g.decidido) {
      if (Math.abs(dy) < UMBRAL && Math.abs(dx) < UMBRAL) return;
      const arribaDelTodo = !g.scroller || g.scroller.scrollTop <= 0 || g.scroller.classList.contains('cal-col');
      // Solo hacia abajo, más vertical que horizontal, y con la lista arriba del todo (si no, se desplaza la lista)
      if (dy <= 0 || Math.abs(dx) > Math.abs(dy) || !arribaDelTodo || (g.scroller?.classList.contains('cal-col'))) { g = null; return; }
      g.decidido = true; g.y0 += Math.sign(dy) * UMBRAL; g.velo.classList.add('sx-arrastrando');
    }
    e.preventDefault();
    const crudo = t.clientY - g.y0; const alto = g.velo.querySelector('.sx-panel')?.offsetHeight || 400;
    const y = crudo < 0 ? elastico(crudo, alto) : crudo;   // hacia arriba: elástico (no hay más hoja)
    mover(g.velo, y); g.muestras.push({ t: e.timeStamp, x: y }); if (g.muestras.length > 12) g.muestras.shift();
  }, { capture: true, passive: false });
  const soltar = (e) => {
    if (!g) return; const { velo, decidido, muestras } = g; g = null; if (!decidido) return;
    e.preventDefault?.();
    const y = muestras.at(-1).x; const v = velocidad(muestras);
    const panel = velo.querySelector('.sx-panel'); const alto = (panel?.offsetHeight || 400) + (velo.querySelector('.sx-cab')?.offsetHeight || 0);
    const destinoProyectado = y + proyectar(v, 0.99);
    // Un clic «fantasma» al soltar no debe elegir una opción
    const tapa = (ev) => { ev.stopPropagation(); ev.preventDefault(); }; window.addEventListener('click', tapa, { capture: true, once: true }); setTimeout(() => window.removeEventListener('click', tapa, true), 350);
    if (destinoProyectado > alto * 0.45 || v > 900) {
      vibrar(6);
      resorte(velo, alto + 40, { velocidad: Math.max(v, 600), amortiguacion: 1, respuesta: 0.28, poner: (x) => mover(velo, x),
        alTerminar: () => { window.removeEventListener('click', tapa, true); velo.setAttribute('data-arrastrada', ''); velo.querySelector('.sx-x')?.click(); } });
    } else {
      resorte(velo, 0, { velocidad: v, amortiguacion: 0.8, respuesta: 0.3, poner: (x) => mover(velo, x), alTerminar: () => velo.classList.remove('sx-arrastrando') });
    }
  };
  document.addEventListener('touchend', soltar, { capture: true, passive: false });
  document.addEventListener('touchcancel', soltar, { capture: true, passive: false });
}

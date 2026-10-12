// Capa 3D de TODA la web (FX.prof3d, ronda 242). Pedido de Fralex: «movimiento 3D en todos lados», fuerte pero ordenado.
// Esta parte (JS) solo hace la inclinación con el mouse; lo demás (aparición 3D al bajar, inclinación al salir, presión y
// cambio de página) es CSS en styles/prof3d.css.
//  · Un solo listener para toda la página y como máximo un cálculo por cuadro (requestAnimationFrame).
//  · Solo dentro de <main>: así nunca toca la cabecera, el ticker, las barras laterales ni los botones flotantes (protegidos).
//  · Fuera: las 4 ventanas de la portada (tienen su propio 3D), las pestañas cápsula, ventanas emergentes y [data-no3d].
//  · Si estás escribiendo dentro de un panel, ese panel no se inclina.
//  · Solo con mouse de verdad y sin «menos movimiento».
import { FX } from '../../data/experimento.js';
import { hayMovimientoReducido } from './ajustes.js';
import { inclinacion } from '../core/inclinacion.js';

const OBJETIVOS = '.glass-panel, .liga-card, .player-card, .match-card, .pulse-tile, a.slide-card, .liga-org, .item-tienda, .liga-partido, .accion, .campeones, .cierre, [data-pub], .cat-item, .lanza';
const FUERA = '.vt, .pilar-tabs, .mundos-tabs, [data-no3d], [role="dialog"], dialog, .modal';

export function initProf3d() {
  try {
    if (!FX.prof3d || hayMovimientoReducido()) return;
    if (!window.matchMedia('(hover: hover) and (pointer: fine)').matches) return;
    const main = document.querySelector('main');
    if (!main) return;
    let actual = null; let pend = null; let raf = 0;
    const soltar = (el) => { el.removeAttribute('data-p3'); el.style.removeProperty('--p3x'); el.style.removeProperty('--p3y'); };
    const escribiendo = (el) => { const a = document.activeElement; return Boolean(a && el.contains(a) && a.matches('input, textarea, select, [contenteditable="true"]')); };
    const cuadro = () => {
      raf = 0;
      const e = pend; if (!e) return;
      let t = e.target.closest?.(OBJETIVOS) ?? null;
      if (t && (!main.contains(t) || t.closest(FUERA) || escribiendo(t))) t = null;
      if (actual && actual !== t) soltar(actual);
      actual = t;
      if (!t) return;
      const r = t.getBoundingClientRect();
      const { rx, ry } = inclinacion(e.clientX - r.left, e.clientY - r.top, r.width, r.height);
      t.setAttribute('data-p3', '');
      t.style.setProperty('--p3x', `${rx}deg`); t.style.setProperty('--p3y', `${ry}deg`);
    };
    document.addEventListener('pointermove', (e) => { if (e.pointerType !== 'mouse') return; pend = e; if (!raf) raf = requestAnimationFrame(cuadro); }, { passive: true });
    document.addEventListener('mouseout', (e) => { if (!e.relatedTarget && actual) { soltar(actual); actual = null; } });
    document.addEventListener('focusin', () => { if (actual && escribiendo(actual)) { soltar(actual); actual = null; } });
  } catch (e) { console.warn('[prof3d] desactivado:', e); }
}

// Hace MOVIBLE el pulso en vivo: se arrastra desde el asa (⋮⋮) y queda donde lo sueltes; doble clic en el asa lo devuelve a su sitio.
// También con teclado (flechas, con el asa enfocada). Los mensajes crecen hacia el lado con más espacio.
import { dockDesdeRect, dockAjustado, dockLeer, MARGEN } from '../core/dock.js';

const KEY = 'pes-live-dock';
const leer = () => { try { return localStorage.getItem(KEY); } catch { return null; } };
const guardar = (v) => { try { v ? localStorage.setItem(KEY, JSON.stringify(v)) : localStorage.removeItem(KEY); } catch { /* sin almacenamiento: no se recuerda */ } };

export function initLiveDock() {
  const wrap = document.getElementById('live-wrap'); const row = document.getElementById('live-row'); const grip = document.getElementById('live-grip');
  if (!wrap || !row || !grip) { console.warn('[dock] faltan elementos'); return; }
  let dock = dockLeer(leer());

  const limpiar = () => { wrap.removeAttribute('data-movido'); wrap.removeAttribute('data-h'); wrap.removeAttribute('data-v'); ['left', 'right', 'top', 'bottom', 'width', 'flexDirection'].forEach((p) => { wrap.style[p] = ''; }); wrap.style.removeProperty('--live-room'); };
  const aplicar = () => {
    if (!dock) { limpiar(); return; }
    const vw = window.innerWidth; const vh = window.innerHeight; const r = row.getBoundingClientRect();
    dock = dockAjustado(dock, vw, vh, r.width, r.height);
    wrap.dataset.movido = '1'; wrap.dataset.h = dock.h; wrap.dataset.v = dock.v;
    Object.assign(wrap.style, {
      left: dock.h === 'l' ? `${dock.dx}px` : 'auto', right: dock.h === 'r' ? `${dock.dx}px` : 'auto',
      top: dock.v === 't' ? `${dock.dy}px` : 'auto', bottom: dock.v === 'b' ? `${dock.dy}px` : 'auto',
      width: `min(22rem, calc(100vw - ${dock.dx + MARGEN}px))`, flexDirection: dock.v === 't' ? 'column-reverse' : 'column',
    });
    wrap.style.setProperty('--live-room', `${Math.max(120, vh - dock.dy - r.height - 16)}px`);   // alto disponible para el historial
  };
  const mover = (dx, dy, base) => { dock = dockDesdeRect({ left: base.left + dx, right: base.right + dx, top: base.top + dy, bottom: base.bottom + dy }, window.innerWidth, window.innerHeight); aplicar(); };

  let ini = null;
  grip.addEventListener('pointerdown', (e) => { grip.setPointerCapture(e.pointerId); const r = row.getBoundingClientRect(); ini = { x: e.clientX, y: e.clientY, r: { left: r.left, right: r.right, top: r.top, bottom: r.bottom } }; grip.classList.add('live-grab'); });
  grip.addEventListener('pointermove', (e) => { if (ini) mover(e.clientX - ini.x, e.clientY - ini.y, ini.r); });
  const soltar = () => { if (!ini) return; ini = null; grip.classList.remove('live-grab'); guardar(dock); };
  ['pointerup', 'pointercancel'].forEach((ev) => grip.addEventListener(ev, soltar));
  grip.addEventListener('dblclick', () => { dock = null; guardar(null); aplicar(); });
  grip.addEventListener('keydown', (e) => {
    const d = { ArrowLeft: [-16, 0], ArrowRight: [16, 0], ArrowUp: [0, -16], ArrowDown: [0, 16] }[e.key];
    if (e.key === 'Escape' || e.key === 'Home') { dock = null; guardar(null); aplicar(); return; }
    if (!d) return; e.preventDefault(); const r = row.getBoundingClientRect(); mover(d[0], d[1], { left: r.left, right: r.right, top: r.top, bottom: r.bottom }); guardar(dock);
  });
  window.addEventListener('resize', aplicar);
  aplicar();
}

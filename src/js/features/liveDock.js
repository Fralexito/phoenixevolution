// Hace MOVIBLE el pulso en vivo SIN asa aparte: se MANTIENE PULSADO el propio botón «En vivo» y se arrastra; queda donde lo sueltes.
// Táctil/lápiz: hay que mantener ~0,35 s quieto (así un dedo que solo hace scroll no lo mueve). Ratón: basta mantener y mover unos píxeles.
// Un clic corto sigue siendo «silenciar». Teclado: con el botón enfocado, Alt+flechas lo mueve y Alt+Home lo devuelve. Restablecer: Ajustes → Privacidad.
// Los mensajes crecen hacia el lado con más espacio.
import { dockDesdeRect, dockAjustado, dockLeer, MARGEN } from '../core/dock.js';

const KEY = 'pes-live-dock';
const leer = () => { try { return localStorage.getItem(KEY); } catch { return null; } };
const guardar = (v) => { try { v ? localStorage.setItem(KEY, JSON.stringify(v)) : localStorage.removeItem(KEY); } catch { /* sin almacenamiento: no se recuerda */ } };

export function initLiveDock() {
  const wrap = document.getElementById('live-wrap'); const row = document.getElementById('live-row'); const grip = document.getElementById('live-toggle');
  if (!wrap || !row || !grip) { console.warn('[dock] faltan elementos'); return; }
  const HOLD_MS = 350; const UMBRAL = 6;
  let dock = dockLeer(leer());

  const limpiar = () => { wrap.removeAttribute('data-movido'); wrap.removeAttribute('data-h'); wrap.removeAttribute('data-v'); ['left', 'right', 'top', 'bottom', 'width', 'flexDirection'].forEach((p) => { wrap.style[p] = ''; }); };
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
  };
  const mover = (dx, dy, base) => { dock = dockDesdeRect({ left: base.left + dx, right: base.right + dx, top: base.top + dy, bottom: base.bottom + dy }, window.innerWidth, window.innerHeight); aplicar(); };

  // Estados: null → esperando → arrastrando. `ini` guarda dónde empezó el gesto; `arrastrado` evita que el clic final silencie el botón.
  let ini = null; let timer = null; let arrastrando = false; let arrastrado = false;
  const rectDe = () => { const r = row.getBoundingClientRect(); return { left: r.left, right: r.right, top: r.top, bottom: r.bottom }; };
  const empezar = () => { if (!ini) return; arrastrando = true; ini.r = rectDe(); ini.x = ini.ult.x; ini.y = ini.ult.y; grip.classList.add('live-grab'); navigator.vibrate?.(15); };
  grip.addEventListener('pointerdown', (e) => {
    if (e.button !== 0 && e.pointerType === 'mouse') return;
    grip.setPointerCapture(e.pointerId);
    ini = { x: e.clientX, y: e.clientY, ult: { x: e.clientX, y: e.clientY }, mouse: e.pointerType === 'mouse', r: rectDe() };
    arrastrando = false; arrastrado = false;
    timer = setTimeout(empezar, HOLD_MS);
  });
  grip.addEventListener('pointermove', (e) => {
    if (!ini) return;
    ini.ult = { x: e.clientX, y: e.clientY };
    if (!arrastrando) {
      const lejos = Math.hypot(e.clientX - ini.x, e.clientY - ini.y) > UMBRAL;
      if (!lejos) return;
      if (ini.mouse) { clearTimeout(timer); empezar(); } else { clearTimeout(timer); ini = null; return; }   // dedo que se mueve antes de tiempo = scroll: se cancela
    }
    arrastrado = true; mover(e.clientX - ini.x, e.clientY - ini.y, ini.r);
  });
  const soltar = () => { clearTimeout(timer); if (!ini) return; const fue = arrastrando; ini = null; arrastrando = false; grip.classList.remove('live-grab'); if (fue) { arrastrado = true; guardar(dock); setTimeout(() => { arrastrado = false; }, 0); } };
  ['pointerup', 'pointercancel'].forEach((ev) => grip.addEventListener(ev, soltar));
  wrap.addEventListener('click', (e) => { if (arrastrado && e.target.closest('#live-toggle')) { e.stopPropagation(); e.preventDefault(); arrastrado = false; } }, true);   // el soltar de un arrastre no es un clic
  document.addEventListener('dragstart', (e) => { if (ini) e.preventDefault(); }, true);   // mientras dura el gesto, ningún enlace/imagen de debajo puede iniciar un «arrastrar y soltar» nativo (cancelaría el gesto)
  grip.addEventListener('contextmenu', (e) => e.preventDefault());   // en móvil, mantener pulsado abriría el menú del sistema
  grip.addEventListener('keydown', (e) => {
    if (!e.altKey) return;
    if (e.key === 'Home') { dock = null; guardar(null); aplicar(); return; }
    const d = { ArrowLeft: [-16, 0], ArrowRight: [16, 0], ArrowUp: [0, -16], ArrowDown: [0, 16] }[e.key];
    if (!d) return; e.preventDefault(); mover(d[0], d[1], rectDe()); guardar(dock);
  });
  window.addEventListener('resize', aplicar);
  aplicar();
}

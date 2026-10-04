// Barra "Última hora": (1) se esconde al bajar la página y vuelve al subir (patrón "headroom"),
// (2) muestra UNA noticia a la vez, a velocidad fija en px/s (más lenta en celular), con una pausa antes de la siguiente.
const EL_ID = 'ticker';
const ARRIBA = 80;   // por encima de esta posición (px) siempre se ve
const UMBRAL = 8;    // movimiento mínimo (px) para reaccionar; evita parpadeos por el "temblor" del scroll

const VEL_PC = 75;        // px por segundo en pantallas ≥ 640px
const VEL_MOVIL = 32;    // px por segundo en celular (más lento: da tiempo a leer)
const PAUSA_PC = 2500;   // ms de barra vacía entre una noticia y la siguiente
const PAUSA_MOVIL = 2000;

/** Segundos que tarda una noticia de ancho `w` en cruzar una zona de ancho `vw` a `vel` px/s (entra por la derecha y sale por la izquierda). */
export const duracionMs = (vw, w, vel) => Math.round(((vw + w) / vel) * 1000);

/** Muestra UNA noticia a la vez: cruza la barra, pausa, y sigue con la siguiente (en bucle). */
function initMarquee() {
  const view = document.getElementById('ticker-view'); const item = document.getElementById('ticker-item');
  if (!view || !item || !item.animate) return;                              // sin Web Animations: queda la primera noticia estática
  let items; try { items = JSON.parse(view.dataset.items ?? '[]'); } catch { items = []; }
  if (!items.length) return;
  let i = 0; let anim = null; let timer = null;
  const movil = () => window.matchMedia('(max-width: 639px)').matches;

  const mostrar = () => {
    clearTimeout(timer);
    const diamante = document.createElement('span'); diamante.className = 'text-galaxy-400 mr-2'; diamante.textContent = '◆';
    item.replaceChildren(diamante, document.createTextNode(items[i % items.length])); i += 1;
    const vw = view.clientWidth; const w = item.offsetWidth;
    if (!vw || !w) { timer = setTimeout(mostrar, 300); i -= 1; return; }  // aún sin medidas (fuentes cargando): reintenta
    anim = item.animate([{ transform: `translateX(${vw}px)` }, { transform: `translateX(${-w}px)` }], { duration: duracionMs(vw, w, movil() ? VEL_MOVIL : VEL_PC), easing: 'linear', fill: 'forwards' });
    anim.onfinish = () => { timer = setTimeout(mostrar, movil() ? PAUSA_MOVIL : PAUSA_PC); };
  };
  mostrar();
  // Pausa al pasar el mouse o tocar para poder leer; sigue al soltar.
  view.addEventListener('pointerenter', () => anim?.pause());
  view.addEventListener('pointerleave', () => anim?.play());
  // Al cambiar el tamaño de la ventana se reinicia la noticia actual con las medidas nuevas.
  let t; window.addEventListener('resize', () => { clearTimeout(t); t = setTimeout(() => { anim?.cancel(); i = Math.max(0, i - 1); mostrar(); }, 250); });
}

export function initTicker() {
  initMarquee();
  const el = document.getElementById(EL_ID);
  if (!el) { console.warn('[ticker] no se encontró #ticker'); return; }
  let last = window.scrollY;
  let pendiente = false;
  const poner = (oculto) => { if (el.dataset.oculto !== String(oculto)) el.dataset.oculto = String(oculto); };

  const revisar = () => {
    pendiente = false;
    const y = window.scrollY;
    if (y < ARRIBA) poner(false);
    else if (y - last > UMBRAL) poner(true);
    else if (last - y > UMBRAL) poner(false);
    else return;               // movimiento diminuto: no actualizamos "last" para acumular
    last = y;
  };
  window.addEventListener('scroll', () => { if (!pendiente) { pendiente = true; requestAnimationFrame(revisar); } }, { passive: true });
}

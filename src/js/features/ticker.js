// Barra "Última hora": (1) se esconde al bajar la página y vuelve al subir (patrón "headroom"),
// (2) el texto avanza a una velocidad fija en píxeles por segundo (más lenta en celular para poder leer).
const EL_ID = 'ticker';
const ARRIBA = 80;   // por encima de esta posición (px) siempre se ve
const UMBRAL = 8;    // movimiento mínimo (px) para reaccionar; evita parpadeos por el "temblor" del scroll

const VEL_PC = 110;      // px por segundo en pantallas ≥ 640px
const VEL_MOVIL = 40;    // px por segundo en celular (más lento que en PC: da tiempo a leer)

/** Calcula cuántas copias del texto hacen falta para cubrir el ancho y fija velocidad y desplazamiento. */
function ajustarMarquee() {
  const track = document.getElementById('ticker-track'); const view = document.getElementById('ticker-view');
  if (!track || !view) return;
  while (track.children.length > 2) track.lastElementChild.remove();      // vuelve a 2 copias antes de medir
  const grupo = track.firstElementChild; const ancho = grupo?.getBoundingClientRect().width;
  if (!ancho) return;                                                      // aún sin medidas (fuentes cargando): se reintenta
  const copias = Math.max(2, Math.ceil(view.clientWidth / ancho) + 1);
  while (track.children.length < copias) { const c = grupo.cloneNode(true); c.setAttribute('aria-hidden', 'true'); track.appendChild(c); }
  const vel = window.matchMedia('(max-width: 639px)').matches ? VEL_MOVIL : VEL_PC;
  track.style.setProperty('--ticker-shift', `${ancho}px`);
  track.style.setProperty('--ticker-dur', `${(ancho / vel).toFixed(1)}s`);
}

function initMarquee() {
  ajustarMarquee();
  document.fonts?.ready.then(ajustarMarquee);                              // las fuentes cambian los anchos
  let t; window.addEventListener('resize', () => { clearTimeout(t); t = setTimeout(ajustarMarquee, 200); });
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

// Esconde la barra "Última hora" al bajar la página y la devuelve al subir (patrón "headroom").
const EL_ID = 'ticker';
const ARRIBA = 80;   // por encima de esta posición (px) siempre se ve
const UMBRAL = 8;    // movimiento mínimo (px) para reaccionar; evita parpadeos por el "temblor" del scroll

export function initTicker() {
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

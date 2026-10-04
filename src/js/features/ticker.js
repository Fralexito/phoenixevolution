// Barra "Última hora": (1) se esconde al bajar la página y vuelve al subir (patrón "headroom"),
// (2) las noticias fluyen a velocidad fija en px/s (más lenta en celular) con un hueco mínimo entre ellas; pueden coincidir varias.
const EL_ID = 'ticker';
const ARRIBA = 80;   // por encima de esta posición (px) siempre se ve
const UMBRAL = 8;    // movimiento mínimo (px) para reaccionar; evita parpadeos por el "temblor" del scroll

const VEL_PC = 75;       // px por segundo en pantallas ≥ 640px
const VEL_MOVIL = 32;    // px por segundo en celular (más lento: da tiempo a leer)
const HUECO_PC = 90;     // px mínimos entre el final de una noticia y el inicio de la siguiente
const HUECO_MOVIL = 56;

/** ¿Ya puede entrar la siguiente noticia? Sí cuando la última dejó libre su hueco: borde derecho + hueco ≤ ancho visible. */
export const puedeEntrar = (ultimoX, ultimoAncho, vw, hueco) => ultimoX == null || ultimoX + ultimoAncho + hueco <= vw;

/** Flujo continuo: las noticias entran una tras otra con un hueco mínimo, y varias pueden verse a la vez. */
function initMarquee() {
  const view = document.getElementById('ticker-view'); const base = document.getElementById('ticker-item');
  if (!view || !base) return;
  let items; try { items = JSON.parse(view.dataset.items ?? '[]'); } catch { items = []; }
  if (!items.length) return;
  const movil = () => window.matchMedia('(max-width: 639px)').matches;
  const vivas = []; let i = 0; let pausa = false; let previo = 0; let vw = view.clientWidth;
  base.remove();                                                          // la noticia estática de respaldo (sin JS) ya no hace falta

  const crear = () => {
    const el = document.createElement('span'); el.className = 'ticker-item font-sans text-xs sm:text-sm text-galaxy-50';
    const d = document.createElement('span'); d.className = 'text-galaxy-400 mr-2'; d.textContent = '◆';
    el.append(d, document.createTextNode(items[i % items.length])); i += 1;
    view.append(el); const w = el.offsetWidth;
    if (!w) { el.remove(); i -= 1; return; }                              // aún sin medidas (fuentes cargando): reintenta en el siguiente cuadro
    vivas.push({ el, x: vw, w });
  };
  const cuadro = (t) => {
    const dt = Math.min((t - previo) / 1000, 0.1); previo = t;
    if (!pausa && vw) {
      const vel = movil() ? VEL_MOVIL : VEL_PC;
      for (const n of vivas) { n.x -= vel * dt; n.el.style.transform = `translateX(${n.x}px)`; }
      while (vivas.length && vivas[0].x + vivas[0].w < 0) vivas.shift().el.remove();
      const u = vivas[vivas.length - 1];
      if (puedeEntrar(u?.x, u?.w, vw, movil() ? HUECO_MOVIL : HUECO_PC)) crear();
    }
    requestAnimationFrame(cuadro);
  };
  requestAnimationFrame((t) => { previo = t; cuadro(t); });
  // Pausa al pasar el mouse o tocar para poder leer; sigue al soltar.
  view.addEventListener('pointerenter', () => { pausa = true; });
  view.addEventListener('pointerleave', () => { pausa = false; });
  window.addEventListener('resize', () => { vw = view.clientWidth; });
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

// Barra "Última hora": (1) solo se ve en la parte superior de la página (al bajar se esconde y NO reaparece hasta volver arriba;
// en celular, al bajar queda una versión sutil y compacta justo debajo de la cabecera),
// (2) las noticias fluyen a velocidad fija en px/s (más lenta en celular) con un hueco IRREGULAR entre ellas (no simétrico); pueden coincidir varias.
import { factorTicker } from '../core/ajustes.js';

const EL_ID = 'ticker';
const ARRIBA = 80;   // por encima de esta posición (px) se ve completa; por debajo se esconde (PC) o pasa a versión sutil (celular)

const VEL_PC = 75;       // px por segundo en pantallas ≥ 640px
const VEL_MOVIL = 32;    // px por segundo en celular (más lento: da tiempo a leer)
const HUECO_PC = 90;     // px mínimos entre el final de una noticia y el inicio de la siguiente
const HUECO_MOVIL = 56;
const MARGEN_ATRAS = 900;  // px de noticias ya pasadas que se conservan fuera de la pantalla (para poder retroceder)

/** ¿Ya puede entrar la siguiente noticia? Sí cuando la última dejó libre su hueco: borde derecho + hueco ≤ ancho visible. */
/** Hueco IRREGULAR tras una noticia: entre 0.5× y 2.5× el hueco base (`azar` en [0,1)), para que la barra no se vea simétrica. */
export const huecoIrregular = (base, azar) => Math.round(base * (0.5 + 2 * Math.min(0.999, Math.max(0, azar))));
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
    vivas.push({ el, x: vw, w, hueco: huecoIrregular(movil() ? HUECO_MOVIL : HUECO_PC, Math.random()) });   // cada noticia trae su propio hueco de salida
  };
  const pintar = () => { for (const n of vivas) n.el.style.transform = `translateX(${n.x}px)`; };
  /** Mueve todas las noticias `dx` px (dx > 0 = retroceder). Al retroceder no deja un hueco vacío a la izquierda: se frena en la noticia más antigua conservada. */
  const desplazar = (dx) => {
    if (!vivas.length || !dx) return 0;
    const d = dx > 0 ? Math.min(dx, Math.max(0, 24 - vivas[0].x)) : dx;
    for (const n of vivas) n.x += d; pintar(); return d;
  };
  let restante = 0;                                                       // empuje de los botones ‹ ›, repartido en varios cuadros para que sea suave
  const cuadro = (t) => {
    const dt = Math.min((t - previo) / 1000, 0.1); previo = t;
    if (!pausa && vw) {
      const vel = (movil() ? VEL_MOVIL : VEL_PC) * factorTicker(document.documentElement.getAttribute('data-aj-ticker-vel'));
      for (const n of vivas) { n.x -= vel * dt; n.el.style.transform = `translateX(${n.x}px)`; }
      while (vivas.length && vivas[0].x + vivas[0].w < -MARGEN_ATRAS) vivas.shift().el.remove();   // se conserva un tramo ya pasado para poder retroceder
      const u = vivas[vivas.length - 1];
      if (puedeEntrar(u?.x, u?.w, vw, u?.hueco ?? (movil() ? HUECO_MOVIL : HUECO_PC))) crear();
    }
    if (Math.abs(restante) > 0.5) { const paso = restante * 0.2; const hecho = desplazar(paso); restante = hecho === paso ? restante - paso : 0; } else restante = 0;
    requestAnimationFrame(cuadro);
  };
  requestAnimationFrame((t) => { previo = t; cuadro(t); });
  // Pausa al pasar el mouse o tocar para poder leer; sigue al soltar.
  let arrastre = null;                                                    // { x: última posición del mouse } mientras se arrastra con el botón pulsado
  view.addEventListener('pointerenter', () => { pausa = true; });
  view.addEventListener('pointerleave', () => { if (!arrastre) pausa = false; });
  // PC: arrastra con el mouse para retroceder o avanzar; al soltar y sacar el mouse, sigue solo. (En táctil, el toque solo pausa como antes.)
  // (los botones ‹ › no inician un arrastre: se excluyen con closest('.ticker-ctl'))
  view.addEventListener('pointerdown', (e) => { if (e.pointerType !== 'mouse' || e.button !== 0 || e.target.closest('.ticker-ctl')) return;  arrastre = { x: e.clientX }; pausa = true; restante = 0; try { view.setPointerCapture(e.pointerId); } catch { /* sin captura: el arrastre igual funciona dentro de la barra */ } view.classList.add('ticker-arrastrando'); });
  view.addEventListener('pointermove', (e) => { if (!arrastre) return; desplazar(e.clientX - arrastre.x); arrastre.x = e.clientX; });
  const soltar = () => { if (!arrastre) return; arrastre = null; view.classList.remove('ticker-arrastrando'); pausa = view.matches(':hover'); };   // sigue pausado solo si el mouse aún está encima
  view.addEventListener('pointerup', soltar); view.addEventListener('pointercancel', soltar);
  // Botones ‹ › (solo PC, aparecen al pasar el mouse): retroceden o adelantan un tramo.
  document.querySelectorAll('[data-ticker-paso]').forEach((b) => b.addEventListener('click', () => { restante += Number(b.dataset.tickerPaso) * 260; }));
  new ResizeObserver(() => { vw = view.clientWidth; }).observe(view);     // también cuando el ticker cambia a su versión sutil (la etiqueta desaparece y la zona se ensancha)
}

export function initTicker() {
  initMarquee();
  const el = document.getElementById(EL_ID);
  if (!el) { console.warn('[ticker] no se encontró #ticker'); return; }
  let pendiente = false;
  const revisar = () => {
    pendiente = false;
    const oculto = window.scrollY >= ARRIBA;
    if (el.dataset.oculto !== String(oculto)) el.dataset.oculto = String(oculto);
  };
  revisar();                                                                // por si la página se abre ya desplazada (recarga a mitad de página)
  window.addEventListener('scroll', () => { if (!pendiente) { pendiente = true; requestAnimationFrame(revisar); } }, { passive: true });
}

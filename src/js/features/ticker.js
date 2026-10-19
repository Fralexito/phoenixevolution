// Barra "Última hora": (1) solo se ve en la parte superior de la página (al bajar se esconde y NO reaparece hasta volver arriba;
// en celular, al bajar queda una versión sutil y compacta justo debajo de la cabecera),
// (2) las noticias fluyen a velocidad fija en px/s (más lenta en celular) con un hueco IRREGULAR entre ellas (no simétrico); pueden coincidir varias.
import { factorTicker } from '../core/sistema/ajustes.js';
import { FX } from '../../data/experimento.js';
import { piezasTicker, piezasCreadores } from '../core/portada/tickerVivo.js';

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
  const mqMovil = window.matchMedia('(max-width: 639px)');   // una sola consulta (antes se creaba una nueva en cada cuadro)
  const movil = () => mqMovil.matches;
  const leerFactor = () => factorTicker(document.documentElement.getAttribute('data-aj-ticker-vel'));
  let factor = leerFactor();
  // RENDIMIENTO (19-oct-2026, Fralex: «siento la web más pesada»): antes JavaScript movía CADA noticia 60 veces por segundo en todas las
  // páginas (era lo que más gastaba con la página quieta). Ahora las noticias quedan QUIETAS dentro de una «pista» y lo que avanza es la pista,
  // con Web Animations: la mueve la tarjeta gráfica y el procesador solo revisa 4 veces por segundo si cabe otra noticia.
  // La animación avanza 1 px por cada segundo de su reloj; playbackRate = velocidad en px/s (así pausar, retroceder y cambiar la velocidad es directo).
  let vw = view.clientWidth; let i = 0; const vivas = [];
  base.remove();                                                          // la noticia estática de respaldo (sin JS) ya no hace falta
  const pista = document.createElement('div'); pista.className = 'ticker-pista'; view.prepend(pista);
  const LARGO = 1e6;                                                      // px que puede recorrer antes de «rebobinar» (ver revisar): a 75 px/s, casi 4 horas
  const anim = pista.animate([{ transform: 'translateX(0)' }, { transform: `translateX(-${LARGO}px)` }], { duration: LARGO * 1000, fill: 'forwards' });
  const ajustarVel = () => { anim.playbackRate = (movil() ? VEL_MOVIL : VEL_PC) * factor; };
  ajustarVel(); mqMovil.addEventListener?.('change', ajustarVel);
  new MutationObserver(() => { factor = leerFactor(); ajustarVel(); }).observe(document.documentElement, { attributes: true, attributeFilter: ['data-aj-ticker-vel'] });
  const avance = () => (Number(anim.currentTime) || 0) / 1000;           // px que ya recorrió la pista
  const xDe = (n) => n.tx - avance();                                     // posición en pantalla de una noticia
  // Actividad real de la comunidad (FX.tickerVivo): se mezcla con las noticias fijas y se renueva cada 60 s. Si falla, quedan solo las noticias.
  if (FX.tickerVivo) {
    const fijas = [...items];
    const vivo = async () => {
      if (document.hidden) return;
      try {
        const { supabase } = await import('../core/sistema/supabase.js');   // import diferido: este módulo también se prueba en Node
        const { data, error } = await supabase.rpc('ticker_comunidad'); if (error) throw error;
        const extra = [...piezasCreadores(data?.creadores_en_vivo).map((p) => ({ texto: p.texto, url: p.url })),
          ...piezasTicker(data).map((p) => (p.tipo === 'vivo' ? `🔴 EN VIVO · ${p.texto}` : `⚽ ${p.texto}`))];
        items.splice(0, items.length, ...extra, ...fijas);
      } catch (e) { console.warn('[ticker] actividad:', e.message); }
    };
    vivo(); setInterval(vivo, 60_000);
  }

  const crear = () => {
    const el = document.createElement('span'); el.className = 'ticker-item font-sans text-xs sm:text-sm text-galaxy-50';
    const d = document.createElement('span'); d.className = 'text-galaxy-400 mr-2'; d.textContent = '◆';
    const it = items[i % items.length]; i += 1;
    if (it && typeof it === 'object' && /^https:\/\//.test(it.url ?? '')) {      // creador en vivo: se puede pulsar para ir a su directo
      const a = document.createElement('a'); a.href = it.url; a.target = '_blank'; a.rel = 'noopener';
      a.className = 'underline decoration-rose-400/60 hover:text-white pointer-events-auto'; a.textContent = it.texto;
      el.append(d, a);
    } else el.append(d, document.createTextNode(typeof it === 'object' ? String(it?.texto ?? '') : it));
    pista.append(el); const w = el.offsetWidth;
    if (!w) { el.remove(); i -= 1; return false; }                        // aún sin medidas (fuentes cargando): reintenta en la siguiente revisión
    const n = { el, tx: vw + avance(), w, hueco: huecoIrregular(movil() ? HUECO_MOVIL : HUECO_PC, Math.random()) };   // cada noticia trae su propio hueco de salida
    el.style.transform = `translateX(${n.tx}px)`; vivas.push(n); return true;
  };
  const revisar = () => {
    if (document.hidden) return;
    if (avance() > LARGO / 2) { const a = avance(); for (const n of vivas) { n.tx -= a; n.el.style.transform = `translateX(${n.tx}px)`; } anim.currentTime = 0; }   // rebobina sin que se note
    while (vivas.length && xDe(vivas[0]) + vivas[0].w < -MARGEN_ATRAS) vivas.shift().el.remove();   // se conserva un tramo ya pasado para poder retroceder
    for (let k = 0; k < 4; k += 1) {
      const u = vivas[vivas.length - 1];
      if (!puedeEntrar(u ? xDe(u) : null, u?.w, vw, u?.hueco ?? (movil() ? HUECO_MOVIL : HUECO_PC)) || !crear()) break;
    }
  };
  revisar(); setInterval(revisar, 250);
  /** Mueve todas las noticias `dx` px (dx > 0 = retroceder). Al retroceder no deja un hueco vacío a la izquierda: se frena en la noticia más antigua conservada. */
  const desplazar = (dx) => {
    if (!vivas.length || !dx) return 0;
    const d = dx > 0 ? Math.min(dx, Math.max(0, 24 - xDe(vivas[0])), avance()) : dx;
    anim.currentTime = (avance() - d) * 1000; return d;
  };
  let restante = 0; let rafBoton = 0;                                     // empuje de los botones ‹ ›: un bucle corto que SOLO corre mientras empuja
  const empujar = () => {
    rafBoton = 0; if (Math.abs(restante) <= 0.5) { restante = 0; return; }
    const paso = restante * 0.2; const hecho = desplazar(paso); restante = hecho === paso ? restante - paso : 0;
    rafBoton = requestAnimationFrame(empujar);
  };
  // Pausa al pasar el mouse o tocar para poder leer; sigue al soltar.
  let arrastre = null;                                                    // { x: última posición del mouse } mientras se arrastra con el botón pulsado
  view.addEventListener('pointerenter', () => anim.pause());
  view.addEventListener('pointerleave', () => { if (!arrastre) anim.play(); });
  // PC: arrastra con el mouse para retroceder o avanzar; al soltar y sacar el mouse, sigue solo. (En táctil, el toque solo pausa como antes.)
  // (los botones ‹ › no inician un arrastre: se excluyen con closest('.ticker-ctl'))
  view.addEventListener('pointerdown', (e) => { if (e.pointerType !== 'mouse' || e.button !== 0 || e.target.closest('.ticker-ctl')) return; arrastre = { x: e.clientX }; anim.pause(); restante = 0; try { view.setPointerCapture(e.pointerId); } catch { /* sin captura: igual funciona dentro de la barra */ } view.classList.add('ticker-arrastrando'); });
  view.addEventListener('pointermove', (e) => { if (!arrastre) return; desplazar(e.clientX - arrastre.x); arrastre.x = e.clientX; });
  const soltar = () => { if (!arrastre) return; arrastre = null; view.classList.remove('ticker-arrastrando'); if (!view.matches(':hover')) anim.play(); revisar(); };   // sigue pausado solo si el mouse aún está encima
  view.addEventListener('pointerup', soltar); view.addEventListener('pointercancel', soltar);
  // Botones ‹ › (solo PC, aparecen al pasar el mouse): retroceden o adelantan un tramo.
  document.querySelectorAll('[data-ticker-paso]').forEach((b) => b.addEventListener('click', () => { restante += Number(b.dataset.tickerPaso) * 260; if (!rafBoton) rafBoton = requestAnimationFrame(empujar); }));
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
    if (el.dataset.oculto !== String(oculto)) { el.dataset.oculto = String(oculto); document.documentElement.toggleAttribute('data-ticker-oculto', oculto); }   // en <html> para el CSS (sin :has)
  };
  revisar();                                                                // por si la página se abre ya desplazada (recarga a mitad de página)
  window.addEventListener('scroll', () => { if (!pendiente) { pendiente = true; requestAnimationFrame(revisar); } }, { passive: true });
}

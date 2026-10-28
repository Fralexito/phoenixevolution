// CARRUSELES (FX.carruseles, ronda 252). Regla de Fralex: nada se mueve solo; se mueve con las flechas, deslizando el dedo,
// arrastrando con el mouse o con las teclas ← →. Uso: cualquier lista con [data-carrusel] (sus hijos son las tarjetas).
//   data-carrusel="3d" → las tarjetas de los costados se ven inclinadas y la del centro de frente (lo hace el CSS, styles/carrusel.css).
// Se monta solo al cargar la página (boot.js) y también se puede montar a mano con montarCarrusel(lista).
import { FX } from '../../data/experimento.js';
import { resorte, agarrar } from './fluido/animar.js';
import { velocidad, proyectar, elastico } from '../core/sistema/resorte.js';

const MOVIMIENTO_MIN = 6;   // px: si arrastras menos que esto, cuenta como clic normal

export function montarCarrusel(pista) {
  if (!pista || pista.dataset.carruMontado) return;
  pista.dataset.carruMontado = '1';
  const caja = document.createElement('div');
  caja.className = `carru${pista.dataset.carrusel === '3d' ? ' carru-3d' : ''}`;
  caja.setAttribute('data-no3d', '');   // la capa 3D general no inclina estas tarjetas (ya tienen su propio 3D)
  pista.before(caja);
  caja.append(pista);
  pista.classList.add('carru-pista');
  pista.tabIndex = 0;
  if (!pista.hasAttribute('aria-label')) pista.setAttribute('aria-label', 'Carrusel: usa las flechas para moverte');

  const flecha = (dir) => {
    const b = document.createElement('button');
    b.type = 'button'; b.className = `carru-flecha carru-${dir}`;
    b.setAttribute('aria-label', dir === 'ant' ? 'Anterior' : 'Siguiente');
    b.innerHTML = `<i class="fa-solid fa-chevron-${dir === 'ant' ? 'left' : 'right'}" aria-hidden="true"></i>`;
    b.addEventListener('click', () => mover(dir === 'ant' ? -1 : 1));
    caja.append(b);
    return b;
  };
  const ant = flecha('ant'); const sig = flecha('sig');

  // Mueve de a «una tarjeta» (o casi una pantalla si las tarjetas son chicas)
  function mover(sentido) {
    const t = pista.firstElementChild; const paso = t ? Math.max(t.getBoundingClientRect().width + 12, pista.clientWidth * 0.6) : pista.clientWidth * 0.8;
    pista.scrollBy({ left: sentido * paso, behavior: document.documentElement.dataset.ajMovEfectivo === 'reducido' ? 'auto' : 'smooth' });
  }
  let raf = 0;
  const estado = () => {
    raf = 0;
    const max = pista.scrollWidth - pista.clientWidth - 2;
    ant.disabled = pista.scrollLeft <= 2; sig.disabled = pista.scrollLeft >= max;
    caja.toggleAttribute('data-sin-scroll', max <= 0);
  };
  pista.addEventListener('scroll', () => { if (!raf) raf = requestAnimationFrame(estado); }, { passive: true });
  new ResizeObserver(estado).observe(pista);
  new MutationObserver(estado).observe(pista, { childList: true });
  estado();

  pista.addEventListener('keydown', (e) => {
    if (e.target !== pista) return;
    if (e.key === 'ArrowRight') { e.preventDefault(); mover(1); }
    if (e.key === 'ArrowLeft') { e.preventDefault(); mover(-1); }
  });

  // Arrastrar con el mouse (con el dedo ya funciona solo, es scroll normal).
  // Apple design (FX.fluido, 28-oct-2026): la pista sigue al mouse 1:1; en los bordes se resiste como un elástico; al soltar sigue con
  // el IMPULSO que traía (misma velocidad) y frena con un resorte justo en la tarjeta más cercana a donde iba. Agarrarla la detiene.
  let x0 = 0; let s0 = 0; let arrastrando = false; let movio = false; let muestras = []; let estiro = 0;
  const ponEstiro = (x) => { estiro = x; pista.style.translate = x ? `${x}px 0` : ''; };
  pista.addEventListener('pointerdown', (e) => {
    if (e.pointerType !== 'mouse' || e.button !== 0) return;
    if (FX.fluido) { agarrar(pista); agarrar(caja); }
    arrastrando = true; movio = false; x0 = e.clientX; s0 = pista.scrollLeft; muestras = [{ t: e.timeStamp, x: e.clientX }];
  });
  window.addEventListener('pointermove', (e) => {
    if (!arrastrando) return;
    const dx = e.clientX - x0;
    if (!movio && Math.abs(dx) > MOVIMIENTO_MIN) { movio = true; caja.setAttribute('data-arrastrando', ''); }
    if (!movio) return;
    const max = Math.max(0, pista.scrollWidth - pista.clientWidth); const quiere = s0 - dx;
    pista.scrollLeft = Math.min(max, Math.max(0, quiere));
    if (FX.fluido) {
      const fuera = quiere < 0 ? quiere : quiere > max ? quiere - max : 0;
      ponEstiro(fuera ? -elastico(fuera, pista.clientWidth) : 0);
      muestras.push({ t: e.timeStamp, x: e.clientX }); if (muestras.length > 12) muestras.shift();
    }
  });
  window.addEventListener('pointerup', () => {
    if (!arrastrando) return;
    arrastrando = false;
    if (!movio) return;
    if (!FX.fluido || document.documentElement.dataset.ajMovEfectivo === 'reducido') { ponEstiro(0); caja.removeAttribute('data-arrastrando'); return; }
    const v = -velocidad(muestras);   // velocidad del desplazamiento (px/s): contraria a la del mouse
    if (estiro) resorte(caja, 0, { leer: () => estiro, velocidad: 0, amortiguacion: 0.8, respuesta: 0.35, poner: ponEstiro });
    // Dónde terminaría el impulso → la tarjeta cuyo centro queda más cerca de ese punto
    const max = Math.max(0, pista.scrollWidth - pista.clientWidth); const lejos = pista.scrollLeft + proyectar(v, 0.995);
    const pr = pista.getBoundingClientRect(); const centro = pr.left + pr.width / 2;
    let destino = Math.min(max, Math.max(0, lejos)); let mejor = Infinity;
    for (const t of pista.children) { const r = t.getBoundingClientRect(); const pos = pista.scrollLeft + (r.left + r.width / 2 - centro); const d = Math.abs(pos - lejos); if (d < mejor) { mejor = d; destino = Math.min(max, Math.max(0, pos)); } }
    resorte(pista, destino, { leer: () => pista.scrollLeft, velocidad: v, amortiguacion: 1, respuesta: 0.45, poner: (x) => { pista.scrollLeft = x; }, alTerminar: () => caja.removeAttribute('data-arrastrando') });
  });
  // Si arrastraste, ese «soltar» no debe abrir la tarjeta
  pista.addEventListener('click', (e) => { if (movio) { e.preventDefault(); e.stopPropagation(); movio = false; } }, true);
  pista.addEventListener('dragstart', (e) => e.preventDefault());
}

export function initCarruseles(raiz = document) {
  if (!FX.carruseles) return;
  try {
    raiz.querySelectorAll('[data-carrusel]').forEach(montarCarrusel);
    // Listas que se pintan después (perfil de jugador, etc.): se montan solas al aparecer
    let pend = 0;
    new MutationObserver(() => { if (!pend) pend = requestAnimationFrame(() => { pend = 0; document.querySelectorAll('[data-carrusel]:not([data-carru-montado])').forEach(montarCarrusel); }); })
      .observe(document.body, { childList: true, subtree: true });
  }
  catch (e) { console.warn('[carrusel] desactivado:', e); }
}

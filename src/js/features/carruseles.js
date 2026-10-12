// CARRUSELES (FX.carruseles, ronda 252). Regla de Fralex: nada se mueve solo; se mueve con las flechas, deslizando el dedo,
// arrastrando con el mouse o con las teclas ← →. Uso: cualquier lista con [data-carrusel] (sus hijos son las tarjetas).
//   data-carrusel="3d" → las tarjetas de los costados se ven inclinadas y la del centro de frente (lo hace el CSS, styles/carrusel.css).
// Se monta solo al cargar la página (boot.js) y también se puede montar a mano con montarCarrusel(lista).
import { FX } from '../../data/experimento.js';

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

  // Arrastrar con el mouse (con el dedo ya funciona solo, es scroll normal)
  let x0 = 0; let s0 = 0; let arrastrando = false; let movio = false;
  pista.addEventListener('pointerdown', (e) => {
    if (e.pointerType !== 'mouse' || e.button !== 0) return;
    arrastrando = true; movio = false; x0 = e.clientX; s0 = pista.scrollLeft;
  });
  window.addEventListener('pointermove', (e) => {
    if (!arrastrando) return;
    const dx = e.clientX - x0;
    if (!movio && Math.abs(dx) > MOVIMIENTO_MIN) { movio = true; caja.setAttribute('data-arrastrando', ''); }
    if (movio) pista.scrollLeft = s0 - dx;
  });
  window.addEventListener('pointerup', () => {
    if (!arrastrando) return;
    arrastrando = false;
    if (movio) { caja.removeAttribute('data-arrastrando'); }
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

// Portada «un solo escenario» (FX.escenario, ronda 231). Todo suave y con una sola curva de movimiento:
//  · rota los titulares reales (vienen en el HTML); la línea fina de abajo marca el tiempo y, al llenarse, pasa al siguiente;
//  · la luz de fondo toma los 2 colores del club del titular (variables --esc-c1/--esc-c2, que el CSS anima);
//  · se pausa con el mouse encima, con el teclado dentro, con la pestaña oculta o tocando la línea; flechas ← → y deslizar en celular;
//  · los 4 mundos se despliegan en el mismo lugar (un «cajón» que se abre suave);
//  · con sesión, la bienvenida dice «Hola de nuevo, <nombre>»;
//  · con «menos movimiento» nada rota solo.
import { onSession } from '../core/sistema/session.js';
import { hayMovimientoReducido } from './ajustes.js';
import { pestanaSegunTecla } from '../core/sistema/pestanas.js';

function palabrasHTML(contenedor, texto, desde) {
  contenedor.replaceChildren();
  String(texto).split(' ').filter(Boolean).forEach((w, k) => {
    const s = document.createElement('span'); s.className = 'esc-w'; s.style.setProperty('--i', String(desde + k)); s.textContent = w;
    contenedor.append(s, ' ');
  });
}

function saludo(slide) {
  if (!slide) return;
  const original = [slide.querySelector('.esc-l1').innerHTML, slide.querySelector('.esc-l2').innerHTML];
  let ultimo;
  onSession((st) => {
    const nombre = st.session && st.profile ? (st.profile.nombre_display || st.profile.username || '') : '';
    if (nombre === ultimo) return; ultimo = nombre;
    const l1 = slide.querySelector('.esc-l1'); const l2 = slide.querySelector('.esc-l2');
    if (nombre) { palabrasHTML(l1, 'Hola de nuevo,', 0); palabrasHTML(l2, nombre, 3); }
    else { l1.innerHTML = original[0]; l2.innerHTML = original[1]; }
  });
}

function mundos(root) {
  const botones = [...root.querySelectorAll('[data-esc-mundo]')];
  const cajon = root.querySelector('[data-esc-cajon]');
  if (!botones.length || !cajon) return;
  const paneles = new Map([...cajon.querySelectorAll('[data-esc-panel]')].map((p) => [p.dataset.escPanel, p]));
  let abierto = null;
  const abrir = (id) => {
    abierto = id;
    botones.forEach((b) => b.setAttribute('aria-expanded', String(b.dataset.escMundo === id)));
    paneles.forEach((p, k) => { p.hidden = k !== id; });
    if (id) cajon.setAttribute('data-abierto', ''); else cajon.removeAttribute('data-abierto');
  };
  botones.forEach((b, i) => {
    b.addEventListener('click', () => abrir(abierto === b.dataset.escMundo ? null : b.dataset.escMundo));
    b.addEventListener('keydown', (e) => {
      const n = pestanaSegunTecla(i, botones.length, e.key);
      if (n !== null) { e.preventDefault(); botones[n].focus(); }
    });
  });
  root.addEventListener('keydown', (e) => { if (e.key === 'Escape' && abierto) { const b = botones.find((x) => x.dataset.escMundo === abierto); abrir(null); b?.focus(); } });
}

function video(header) {
  const v = header.querySelector('[data-tx-video]');
  if (!v || hayMovimientoReducido() || !window.matchMedia('(min-width: 768px)').matches) return;
  v.preload = 'auto';
  const play = () => v.play().catch(() => {});
  play();
  document.addEventListener('visibilitychange', () => (document.hidden ? v.pause() : play()));
}

export function montarEscenario() {
  const root = document.querySelector('[data-esc]');
  const header = root?.closest('[data-portada]');
  if (!root || !header) return;
  const slides = [...root.querySelectorAll('[data-esc-slide]')];
  const marcadores = [...root.querySelectorAll('[data-esc-marcador]')];
  const linea = root.querySelector('[data-esc-pausa]');
  const quieto = hayMovimientoReducido();
  if (quieto) root.setAttribute('data-quieto', '');
  saludo(slides[0]);
  mundos(root);
  video(header);

  let i = 0;
  const colores = (n) => { const s = slides[n]; if (!s) return; header.style.setProperty('--esc-c1', s.dataset.c1); header.style.setProperty('--esc-c2', s.dataset.c2); };
  colores(0);
  if (slides.length < 2) return;

  const mostrar = (n) => {
    n = (n + slides.length) % slides.length;
    if (n === i) return;
    const sale = slides[i];
    sale.setAttribute('data-sale', '');
    setTimeout(() => sale.removeAttribute('data-sale'), 700);
    [slides, marcadores].forEach((g) => g.forEach((el, k) => {
      if (k === n) { el.setAttribute('data-on', ''); el.removeAttribute('aria-hidden'); } else { el.removeAttribute('data-on'); el.setAttribute('aria-hidden', 'true'); }
    }));
    i = n;
    colores(n);
    // Reinicia la línea de tiempo (la animación vuelve a empezar al quitar y poner el atributo).
    if (linea) { linea.removeAttribute('data-corre'); void linea.offsetWidth; linea.setAttribute('data-corre', ''); }
  };
  linea?.setAttribute('data-corre', '');
  root.addEventListener('animationend', (e) => { if (e.animationName === 'esc-llena') mostrar(i + 1); });

  // Pausas (motivos que se suman)
  const motivos = new Set();
  const poner = (m, si) => { si ? motivos.add(m) : motivos.delete(m); motivos.size ? root.setAttribute('data-pausa', '') : root.removeAttribute('data-pausa'); };
  linea?.addEventListener('click', () => {
    const p = linea.getAttribute('aria-pressed') !== 'true';
    linea.setAttribute('aria-pressed', String(p));
    linea.setAttribute('aria-label', p ? 'Seguir con los titulares' : 'Pausar los titulares (también puedes usar las flechas)');
    poner('boton', p);
  });
  linea?.addEventListener('keydown', (e) => { if (e.key === 'ArrowRight') { e.preventDefault(); mostrar(i + 1); } if (e.key === 'ArrowLeft') { e.preventDefault(); mostrar(i - 1); } });
  const tit = root.querySelector('[data-esc-tit]');
  if (window.matchMedia('(hover: hover)').matches) { tit?.addEventListener('pointerenter', () => poner('mouse', true)); tit?.addEventListener('pointerleave', () => poner('mouse', false)); }
  root.addEventListener('focusin', (e) => { if (e.target.matches?.(':focus-visible')) poner('foco', true); });
  root.addEventListener('focusout', (e) => { if (!root.contains(e.relatedTarget)) poner('foco', false); });
  document.addEventListener('visibilitychange', () => poner('oculta', document.hidden));

  // Deslizar con el dedo sobre el titular: izquierda = siguiente, derecha = anterior.
  let x0 = null;
  tit?.addEventListener('pointerdown', (e) => { if (e.pointerType !== 'mouse') x0 = e.clientX; });
  tit?.addEventListener('pointerup', (e) => { if (x0 === null) return; const d = e.clientX - x0; x0 = null; if (Math.abs(d) > 45) mostrar(i + (d < 0 ? 1 : -1)); });
}

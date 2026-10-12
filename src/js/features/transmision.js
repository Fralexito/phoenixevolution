// Portada «transmisión» (FX.transmision, ronda 229).
//  · Rota los titulares reales (vienen todos en el HTML) junto con su marcador. El cambio lo marca la barrita de progreso:
//    cuando termina de llenarse (CSS, --tx-seg), pasa al siguiente. Así pausar = congelar la barrita.
//  · Se pausa: con el botón, con el mouse encima, con el foco del teclado dentro y con la pestaña oculta.
//  · Con «menos movimiento» las barritas no se llenan solas: no rota (se puede elegir a mano).
//  · Con sesión, la línea de estado saluda: «Hola, Fralex · 10.º · próximo: Morgado».
//  · Si hay video de fondo (data/portada.js), solo se reproduce en pantallas medianas o grandes y sin «menos movimiento».
import { onSession } from '../core/session.js';
import { hayMovimientoReducido } from './ajustes.js';
import { EDICIONES } from '../../data/ligaResultados.js';
import { calcularTabla } from '../core/tabla.js';
import { puestoDe, proximoPartido, nombreEnLiga } from '../core/pase.js';

const ed = EDICIONES.galaxy.find((e) => e.estado === 'en_curso') ?? null;
const fechas = ed?.fechas ?? [];
const tabla = calcularTabla(fechas.flatMap((f) => f.partidos)).tabla;
const nombresLiga = [...new Set([...Object.keys(ed?.clubes ?? {}), ...tabla.map((f) => f.nombre)])];

function saludo(estado) {
  const original = estado.textContent;
  onSession((st) => {
    const p = st.profile;
    if (!st.session || !p) { estado.textContent = original; return; }
    const visible = p.nombre_display || p.username || 'crack';
    const cand = [p.nombre_display, p.username];
    const enLiga = nombreEnLiga(nombresLiga, cand);
    const pos = puestoDe(tabla, cand);
    const prox = enLiga ? proximoPartido(fechas, enLiga) : null;
    estado.textContent = [`Hola, ${visible}`, pos && `${pos.puesto}.º`, prox && `próximo: ${prox.rival}`].filter(Boolean).join(' · ');
  });
}

function video(root) {
  const v = root.closest('[data-portada]')?.querySelector('[data-tx-video]');
  if (!v || hayMovimientoReducido() || !window.matchMedia('(min-width: 768px)').matches) return;
  v.preload = 'auto';
  const play = () => v.play().catch(() => {});
  play();
  document.addEventListener('visibilitychange', () => (document.hidden ? v.pause() : play()));
}

export function montarTransmision() {
  const root = document.querySelector('[data-tx]');
  if (!root) return;
  const estado = root.querySelector('[data-tx-estado]');
  if (estado) saludo(estado);
  video(root);

  const slides = [...root.querySelectorAll('[data-tx-slide]')];
  const marcadores = [...root.querySelectorAll('[data-tx-marcador]')];
  const segs = [...root.querySelectorAll('[data-tx-seg]')];
  const btn = root.querySelector('[data-tx-pausa]');
  if (slides.length < 2) return;
  let i = 0;

  const mostrar = (n) => {
    if (n === i) return;
    const sale = slides[i];
    sale.setAttribute('data-sale', '');
    setTimeout(() => sale.removeAttribute('data-sale'), 650);
    [slides, marcadores].forEach((grupo) => grupo.forEach((el, k) => {
      if (k === n) { el.setAttribute('data-on', ''); el.removeAttribute('aria-hidden'); } else { el.removeAttribute('data-on'); el.setAttribute('aria-hidden', 'true'); }
    }));
    segs.forEach((s, k) => {
      k === n ? s.setAttribute('aria-current', 'true') : s.removeAttribute('aria-current');
      k < n ? s.setAttribute('data-hecho', '') : s.removeAttribute('data-hecho');
    });
    i = n;
  };

  // La barrita activa terminó de llenarse → siguiente titular.
  root.addEventListener('animationend', (e) => { if (e.animationName === 'tx-llena') mostrar((i + 1) % slides.length); });
  segs.forEach((s, k) => s.addEventListener('click', () => mostrar(k)));

  // Pausas: motivos que se suman (botón, mouse, foco, pestaña oculta).
  const motivos = new Set();
  const aplicar = () => (motivos.size ? root.setAttribute('data-pausa', '') : root.removeAttribute('data-pausa'));
  const poner = (m, si) => { si ? motivos.add(m) : motivos.delete(m); aplicar(); };
  btn?.addEventListener('click', () => {
    const p = btn.getAttribute('aria-pressed') !== 'true';
    btn.setAttribute('aria-pressed', String(p));
    btn.setAttribute('aria-label', p ? 'Seguir con los titulares' : 'Pausar titulares');
    btn.innerHTML = `<i class="fa-solid ${p ? 'fa-play' : 'fa-pause'}"></i>`;
    poner('boton', p);
  });
  if (window.matchMedia('(hover: hover)').matches) {
    root.addEventListener('pointerenter', () => poner('mouse', true));
    root.addEventListener('pointerleave', () => poner('mouse', false));
  }
  // Solo el foco del TECLADO pausa (un clic con el mouse en una barrita no debe dejarla quieta para siempre).
  root.addEventListener('focusin', (e) => { if (e.target.matches?.(':focus-visible')) poner('foco', true); });
  root.addEventListener('focusout', (e) => { if (!root.contains(e.relatedTarget)) poner('foco', false); });
  document.addEventListener('visibilitychange', () => poner('oculta', document.hidden));
  if (hayMovimientoReducido()) root.setAttribute('data-quieto', '');
}

// Animaciones de entrada y cifras que «cuentan». Respetan «reducir movimiento» (ajuste del sitio o del sistema): sin animar, todo aparece de golpe.
import { hayMovimientoReducido } from './ajustes.js';
import { pasoCuenta } from '../core/central.js';

/** Los elementos [data-reveal] aparecen (fundido + subida) al entrar en pantalla; --i (en el estilo) escalona los hermanos. */
export function activarReveal(raiz = document) {
  const els = [...raiz.querySelectorAll('[data-reveal]:not(.is-in)')];
  if (!els.length) return;
  if (hayMovimientoReducido() || !('IntersectionObserver' in window)) { els.forEach((e) => e.classList.add('is-in')); return; }
  const io = new IntersectionObserver((ents) => { for (const en of ents) if (en.isIntersecting) { en.target.classList.add('is-in'); io.unobserve(en.target); } }, { threshold: 0.12, rootMargin: '0px 0px -6% 0px' });
  els.forEach((e) => io.observe(e));
}

/** Escalona la entrada de los hijos directos de un contenedor recién pintado (cada uno 60 ms después del anterior). */
export function escalonar(cont) {
  [...(cont?.children ?? [])].forEach((c, i) => { c.style.setProperty('--i', String(Math.min(i, 12))); c.setAttribute('data-reveal', ''); });
  activarReveal(cont);
}

/** Cuenta de 0 al destino en ~900 ms. Si no hay animación, escribe el valor final. */
export function contarHasta(el, destino, ms = 900) {
  const fin = String(Math.trunc(Number(destino)));
  if (!el || !Number.isFinite(Number(destino)) || hayMovimientoReducido()) { if (el) el.textContent = Number.isFinite(Number(destino)) ? fin : '—'; return; }
  const t0 = performance.now();
  const paso = (t) => { const p = (t - t0) / ms; el.textContent = String(pasoCuenta(destino, p)); if (p < 1) requestAnimationFrame(paso); else el.textContent = fin; };
  requestAnimationFrame(paso);
}

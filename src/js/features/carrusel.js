// Carrusel genérico: pistas con scroll-snap (el dedo y la rueda funcionan solos), flechas, puntos, teclado y avance automático opcional.
// El avance se detiene con el mouse encima, con el foco dentro, con la pestaña oculta, fuera de pantalla o con «reducir movimiento».
// Estructura: <div class="car" data-auto="6000"><div class="car-track"><div class="car-slide">…</div>…</div></div>
import { hayMovimientoReducido } from './ajustes.js';

export function montarCarrusel(el, { auto = Number(el?.dataset.auto) || 0, puntos = true } = {}) {
  const pista = el?.querySelector('.car-track'); if (!pista) return null;
  const diapo = () => [...pista.querySelectorAll('.car-slide')];
  let i = 0, timer = null, encima = false, visible = true;
  const ir = (n, suave = true) => {
    const l = diapo(); if (!l.length) return; i = (n + l.length) % l.length;
    pista.scrollTo({ left: l[i].offsetLeft - pista.offsetLeft, behavior: suave && !hayMovimientoReducido() ? 'smooth' : 'auto' }); marcar();
  };
  const marcar = () => { diapo().forEach((s, k) => s.toggleAttribute('data-activa', k === i)); el.querySelectorAll('.car-dot').forEach((d, k) => d.setAttribute('aria-current', String(k === i))); reiniciarBarra(); };
  const reiniciarBarra = () => { const b = el.querySelector('.car-barra'); if (!b) return; b.classList.remove('corre'); void b.offsetWidth; if (auto && puede()) b.classList.add('corre'); };
  const puede = () => auto > 0 && !encima && visible && !document.hidden && !hayMovimientoReducido() && diapo().length > 1;
  const programar = () => { clearTimeout(timer); if (puede()) timer = setTimeout(() => { ir(i + 1); programar(); }, auto); reiniciarBarra(); };
  // Dibujo de controles
  const n = diapo().length;
  if (n > 1) {
    el.insertAdjacentHTML('beforeend', `${puntos ? `<div class="car-dots" role="tablist" aria-label="Diapositivas">${diapo().map((_, k) => `<button type="button" class="car-dot" role="tab" aria-label="Diapositiva ${k + 1}" aria-current="${k === 0}" data-i="${k}"></button>`).join('')}</div>` : ''}
      <button type="button" class="car-flecha izq" aria-label="Anterior"><i class="fa-solid fa-chevron-left"></i></button><button type="button" class="car-flecha der" aria-label="Siguiente"><i class="fa-solid fa-chevron-right"></i></button>${auto ? '<span class="car-barra" style="--t:' + auto + 'ms"></span>' : ''}`);
  }
  el.addEventListener('click', (e) => { const b = e.target.closest('.car-flecha, .car-dot'); if (!b) return; ir(b.dataset.i != null ? Number(b.dataset.i) : i + (b.classList.contains('izq') ? -1 : 1)); programar(); });
  el.addEventListener('mouseenter', () => { encima = true; programar(); }); el.addEventListener('mouseleave', () => { encima = false; programar(); });
  el.addEventListener('focusin', () => { encima = true; programar(); }); el.addEventListener('focusout', () => { encima = false; programar(); });
  el.addEventListener('keydown', (e) => { if (e.key === 'ArrowRight') { ir(i + 1); programar(); } else if (e.key === 'ArrowLeft') { ir(i - 1); programar(); } });
  // El arrastre/rueda mueve la pista: se detecta cuál diapositiva quedó al centro.
  let raf = 0;
  pista.addEventListener('scroll', () => { cancelAnimationFrame(raf); raf = requestAnimationFrame(() => { const l = diapo(), x = pista.scrollLeft + pista.offsetLeft; let m = 0, d = Infinity; l.forEach((s, k) => { const dd = Math.abs(s.offsetLeft - x); if (dd < d) { d = dd; m = k; } }); if (m !== i) { i = m; marcar(); } }); }, { passive: true });
  if ('IntersectionObserver' in window) new IntersectionObserver((en) => { visible = en[0]?.isIntersecting ?? true; programar(); }, { threshold: 0.25 }).observe(el);
  document.addEventListener('visibilitychange', programar);
  marcar(); programar();
  return { ir, destruir: () => clearTimeout(timer) };
}

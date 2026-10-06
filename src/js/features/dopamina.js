// Capa «dopamina» (ronda 178): micro-efectos de DOM que el CSS solo no puede hacer. Todo cuelga de FX.dopamina y se apaga con prefers-reduced-motion.
//   · initDopamina()  → luz que sigue al cursor en tarjetas ([data-spot]) y ondulación al pulsar el botón principal.
//   · rafaga(origen, emojis, {n}) → pequeñas partículas que salen de un elemento (reaccionar, publicar).
//   · salto(el)       → el emoji «salta» una vez.
// Solo se anima transform/opacity con WAAPI (acelerado por GPU, interrumpible). Si algo falla, la web sigue funcionando sin el efecto.
import { FX } from '../../data/experimento.js';

const reducido = () => window.matchMedia?.('(prefers-reduced-motion: reduce)').matches ?? false;
const activo = () => FX.dopamina && !reducido();
const EASE = 'cubic-bezier(.22, 1, .36, 1)';
const POP = 'cubic-bezier(.34, 1.56, .64, 1)';

/** Tarjetas que reciben la luz que sigue al cursor (solo con mouse). */
const SELECTOR_LUZ = '.match-card, .pulse-tile, a.slide-card, .liga-org, .item-tienda, .cat-item, .liga-partido, [data-pub]';

/** Suelta partículas desde el centro de `origen`. `emojis`: texto o lista; `n`: cuántas (máx. 18). Devuelve la cantidad creada. */
export function rafaga(origen, emojis = '🔥', { n = 8 } = {}) {
  try {
    if (!activo() || !origen?.getBoundingClientRect) return 0;
    const lista = Array.isArray(emojis) ? emojis : [emojis]; const r = origen.getBoundingClientRect();
    const cx = r.left + r.width / 2; const cy = r.top + r.height / 2; const total = Math.min(Math.max(1, n), 18);
    for (let i = 0; i < total; i++) {
      const p = document.createElement('span'); p.className = 'dp-chispa'; p.setAttribute('aria-hidden', 'true'); p.textContent = lista[i % lista.length];
      document.body.appendChild(p);
      const ang = (-Math.PI / 2) + (Math.random() - 0.5) * Math.PI * 1.15; const dist = 44 + Math.random() * 56; const giro = (Math.random() - 0.5) * 120;
      const dx = Math.cos(ang) * dist; const dy = Math.sin(ang) * dist;
      const a = p.animate([
        { transform: `translate(${cx}px, ${cy}px) scale(.4) rotate(0deg)`, opacity: 1 },
        { transform: `translate(${cx + dx}px, ${cy + dy}px) scale(${0.9 + Math.random() * 0.5}) rotate(${giro}deg)`, opacity: 1, offset: 0.55 },
        { transform: `translate(${cx + dx * 1.15}px, ${cy + dy + 26}px) scale(.7) rotate(${giro * 1.3}deg)`, opacity: 0 },
      ], { duration: 620 + Math.random() * 240, easing: EASE, delay: i * 14, fill: 'both' });
      a.onfinish = () => p.remove(); a.oncancel = () => p.remove();
    }
    return total;
  } catch (e) { console.warn('[dopamina] ráfaga:', e); return 0; }
}

/** El elemento da un saltito elástico (para el emoji de una reacción recién puesta). */
export function salto(el) {
  try {
    if (!activo() || !el?.animate) return;
    el.animate([{ transform: 'scale(1) rotate(0deg)' }, { transform: 'scale(1.55) rotate(-10deg)', offset: 0.4 }, { transform: 'scale(1) rotate(0deg)' }], { duration: 420, easing: POP });
  } catch (e) { console.warn('[dopamina] salto:', e); }
}

/** Marca a los hijos recién pintados para que entren escalonados (máx. 8 con retraso; el resto aparece sin retraso). */
export function entrada(contenedor, desde = 0) {
  try {
    if (!activo() || !contenedor) return;
    [...contenedor.children].slice(desde).forEach((el, i) => { el.style.setProperty('--i', String(Math.min(i, 8))); el.classList.add('dp-entra'); el.addEventListener('animationend', () => el.classList.remove('dp-entra'), { once: true }); });
  } catch (e) { console.warn('[dopamina] entrada:', e); }
}

function ondaEn(btn, ev) {
  const r = btn.getBoundingClientRect(); const d = Math.max(r.width, r.height) * 2.2;
  const o = document.createElement('span'); o.className = 'dp-onda'; o.style.cssText = `width:${d}px;height:${d}px;left:${ev.clientX - r.left - d / 2}px;top:${ev.clientY - r.top - d / 2}px`;
  btn.appendChild(o);
  const a = o.animate([{ transform: 'scale(0)', opacity: 0.9 }, { transform: 'scale(1)', opacity: 0 }], { duration: 520, easing: EASE });
  a.onfinish = () => o.remove(); a.oncancel = () => o.remove();
}

export function initDopamina() {
  if (!FX.dopamina) return;
  const fino = window.matchMedia?.('(hover: hover) and (pointer: fine)').matches ?? false;
  let cuadro = 0; let ultimo = null;
  // Luz que sigue al cursor: un solo listener delegado, limitado a un cuadro de animación.
  if (fino && !reducido()) {
    document.addEventListener('pointermove', (e) => {
      if (e.pointerType !== 'mouse') return;
      const t = e.target.closest?.(SELECTOR_LUZ); if (!t) return;
      ultimo = { t, x: e.clientX, y: e.clientY };
      if (cuadro) return;
      cuadro = requestAnimationFrame(() => { cuadro = 0; const { t: el, x, y } = ultimo; const r = el.getBoundingClientRect(); el.dataset.spot = ''; el.style.setProperty('--mx', `${x - r.left}px`); el.style.setProperty('--my', `${y - r.top}px`); });
    }, { passive: true });
  }
  // Ondulación al pulsar el botón principal.
  document.addEventListener('pointerdown', (e) => {
    if (reducido()) return; const b = e.target.closest?.('.btn-primary'); if (!b || b.disabled) return;
    try { ondaEn(b, e); } catch (err) { console.warn('[dopamina] onda:', err); }
  }, { passive: true });
}

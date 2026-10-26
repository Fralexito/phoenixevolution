// PRUEBA «botones y cartas de juego» (ronda 391, experimental). Estilos en styles/pruebaJuego.css; HTML de la carta en core/sistema/cartaJuego.js.
// Aquí: la carta se inclina en 3D hacia el mouse/dedo con un brillo que lo sigue.
// Desde la 392 viene encendido; ?prueba=no lo apaga y ?prueba=juego lo vuelve a encender (el script de la cabecera de Layout.astro pone <html data-prueba-juego>).
const quieto = () => matchMedia('(prefers-reduced-motion: reduce)').matches || document.documentElement.getAttribute('data-aj-mov-efectivo') === 'reducido';

function inclinar() {
  let raf = 0; let ev = null; let actual = null;
  const soltar = () => { if (actual) { actual.style.setProperty('--rx', '0deg'); actual.style.setProperty('--ry', '0deg'); actual = null; } };
  document.addEventListener('pointermove', (e) => {
    if (quieto()) return;
    ev = e;
    if (raf) return;
    raf = requestAnimationFrame(() => {
      raf = 0;
      const zona = ev.target instanceof Element ? ev.target.closest('.cj-zona') : null;
      const c = zona?.querySelector('[data-cj]');
      if (c !== actual) soltar();
      if (!c) return;
      actual = c;
      const r = c.getBoundingClientRect();
      const px = Math.min(1, Math.max(0, (ev.clientX - r.left) / r.width)); const py = Math.min(1, Math.max(0, (ev.clientY - r.top) / r.height));
      c.style.setProperty('--rx', `${((0.5 - py) * 14).toFixed(2)}deg`); c.style.setProperty('--ry', `${((px - 0.5) * 18).toFixed(2)}deg`);
      c.style.setProperty('--hx', `${Math.round(px * 100)}%`); c.style.setProperty('--hy', `${Math.round(py * 100)}%`);
    });
  }, { passive: true });
  document.addEventListener('pointerleave', soltar);
  document.addEventListener('pointercancel', soltar, { passive: true });
}

export function initPruebaJuego() {
  try {
    try { localStorage.removeItem('pes-tema'); localStorage.removeItem('pes-tema-probar'); } catch {}   // 1.38.0: los 4 estilos se quitaron; borra lo que quedó guardado
    if (!document.documentElement.hasAttribute('data-prueba-juego')) return;
    inclinar();   // (el aviso «Quitar prueba» se quitó en la 392: ahora viene encendido; para apagarlo: ?prueba=no)
  } catch (e) { console.warn('[prueba juego]', e?.message ?? e); }
}

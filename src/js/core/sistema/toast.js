// Avisos flotantes. Con `key` se evitan duplicados mientras el aviso sigue visible.
const active = new Set();

function stack() {
  let el = document.getElementById('toast-stack');
  if (!el) {
    el = document.createElement('div');
    el.id = 'toast-stack';
    el.className = 'toast-stack';
    el.setAttribute('aria-live', 'polite');
    document.body.appendChild(el);
  }
  return el;
}

export function toast(message, kind = 'info', { key = null, ms = 4500 } = {}) {
  if (key && active.has(key)) return;
  if (key) active.add(key);
  const t = document.createElement('div');
  t.className = 'toast';
  t.dataset.kind = kind;
  t.textContent = message; // textContent: nunca interpreta HTML
  stack().appendChild(t);
  setTimeout(() => { t.remove(); if (key) active.delete(key); }, ms);
}

/** Sonido corto de notificación; falla en silencio si el navegador lo bloquea. */
export function beep() {
  try {
    const Ctx = window.AudioContext || window.webkitAudioContext;
    const ctx = new Ctx();
    const o = ctx.createOscillator(); const g = ctx.createGain();
    o.connect(g); g.connect(ctx.destination);
    o.frequency.value = 880; g.gain.value = 0.05;
    o.start(); o.stop(ctx.currentTime + 0.15);
    o.onended = () => ctx.close();
  } catch (e) { console.warn('[beep] no disponible:', e); }
}

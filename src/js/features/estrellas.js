// Cielo de estrellas en 3D de la portada (FX.interactivo, ronda 234). Pensado para NO marear:
//  · pocas estrellas (90 en PC, 45 en celular) en 3 capas de profundidad; se mueven MUY lento;
//  · con el mouse, las capas cercanas se desplazan más que las lejanas (paralaje) → sensación de profundidad;
//  · al bajar con la rueda, las cercanas suben más rápido que las lejanas;
//  · cada ~14 s cruza una estrella fugaz (solo una a la vez);
//  · se detiene si la portada no se ve o la pestaña está oculta; con «menos movimiento» se dibuja una sola vez, quieta.
// Colores: blanco, cian y púrpura de la identidad (tokens.css).
import { hayMovimientoReducido } from './ajustes.js';

const COLORES = ['255,255,255', '0,229,255', '128,0,255'];

export function montarEstrellas(canvas = document.querySelector('[data-vt-estrellas]')) {
  if (!canvas) return;
  const ctx = canvas.getContext('2d');
  if (!ctx) return;
  const header = canvas.closest('[data-portada]') ?? canvas.parentElement;
  const quieto = hayMovimientoReducido();
  let w = 0, h = 0, dpr = 1, estrellas = [], fugaz = null, proximaFugaz = performance.now() + 6000;
  const mouse = { x: 0, y: 0, tx: 0, ty: 0 };
  let espera = 0;
  let corriendo = false, visible = true, raf = 0, ultimo = 0, arribaHeader = 0;   // arribaHeader: posición de la portada en la página (se mide al cambiar el tamaño, no en cada cuadro)
  const mqMovil = window.matchMedia('(max-width: 767px)'); const movil = () => mqMovil.matches;   // una sola consulta (no una nueva en cada cuadro)

  const crear = () => {
    const n = window.matchMedia('(max-width: 767px)').matches ? 45 : 90;
    estrellas = Array.from({ length: n }, () => {
      const z = Math.random() < .55 ? 0 : Math.random() < .7 ? 1 : 2;           // 0 lejos · 1 medio · 2 cerca
      return { x: Math.random() * w, y: Math.random() * h, z, r: [.6, 1, 1.6][z] * (0.7 + Math.random() * .6),
        a: [.35, .55, .8][z] * (0.6 + Math.random() * .4), c: COLORES[Math.random() < .7 ? 0 : Math.random() < .6 ? 1 : 2],
        tw: Math.random() * Math.PI * 2, tv: .6 + Math.random() * 1.2 };
    });
  };
  const medir = () => {
    const r = header.getBoundingClientRect();
    dpr = Math.min(movil() ? 1 : 2, window.devicePixelRatio || 1);   // en celular 1: son puntitos, no se nota y dibuja la mitad
    arribaHeader = r.top + window.scrollY;
    w = Math.max(1, r.width); h = Math.max(1, r.height);
    canvas.width = Math.round(w * dpr); canvas.height = Math.round(h * dpr);
    ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
    crear();
  };

  const dibujar = (t, dt) => {
    ctx.clearRect(0, 0, w, h);
    mouse.x += (mouse.tx - mouse.x) * .05; mouse.y += (mouse.ty - mouse.y) * .05;   // el paralaje llega suave, no de golpe
    const scroll = Math.min(h, Math.max(0, window.scrollY - arribaHeader));   // rendimiento (19-oct-2026): antes getBoundingClientRect en cada cuadro forzaba recalcular la página
    for (const s of estrellas) {
      const prof = [6, 16, 34][s.z];
      if (!quieto) { s.y -= [2, 4, 7][s.z] * dt; s.x += [1, 2, 3][s.z] * dt; s.tw += s.tv * dt; }
      if (s.y < -4) { s.y = h + 4; s.x = Math.random() * w; }
      if (s.x > w + 4) { s.x = -4; }
      const x = s.x + mouse.x * prof; const y = s.y + mouse.y * prof - scroll * [.05, .15, .3][s.z];
      const brillo = s.a * (quieto ? 1 : .75 + Math.sin(s.tw) * .25);
      ctx.beginPath(); ctx.fillStyle = `rgba(${s.c},${brillo.toFixed(3)})`; ctx.arc(x, ((y % (h + 8)) + h + 8) % (h + 8) - 4, s.r, 0, Math.PI * 2); ctx.fill();
    }
    if (quieto) return;
    if (!fugaz && t > proximaFugaz) {
      fugaz = { x: Math.random() * w * .6, y: Math.random() * h * .35, vx: 520 + Math.random() * 200, vy: 170 + Math.random() * 80, vida: 0 };
      proximaFugaz = t + 12000 + Math.random() * 6000;
    }
    if (fugaz) {
      fugaz.vida += dt; fugaz.x += fugaz.vx * dt; fugaz.y += fugaz.vy * dt;
      const a = Math.max(0, 1 - fugaz.vida / 1.1);
      const g = ctx.createLinearGradient(fugaz.x, fugaz.y, fugaz.x - fugaz.vx * .18, fugaz.y - fugaz.vy * .18);
      g.addColorStop(0, `rgba(255,255,255,${(.85 * a).toFixed(3)})`); g.addColorStop(1, 'rgba(0,229,255,0)');
      ctx.strokeStyle = g; ctx.lineWidth = 1.4; ctx.beginPath(); ctx.moveTo(fugaz.x, fugaz.y); ctx.lineTo(fugaz.x - fugaz.vx * .18, fugaz.y - fugaz.vy * .18); ctx.stroke();
      if (a <= 0 || fugaz.x > w + 60) fugaz = null;
    }
  };

  const cuadro = (t) => {
    if (!corriendo) return;
    const dt = Math.min(.05, (t - (ultimo || t)) / 1000); ultimo = t;
    dibujar(t, dt);
    // ~30 fps en PC y ~24 en celular (todo es lento: se ve igual de suave). Rendimiento (19-oct-2026): se ESPERA con un temporizador y solo entonces
    // se pide el cuadro; antes se pedía un cuadro en cada refresco (60+/s) y se saltaba, y cada uno obligaba a revisar toda la portada.
    espera = setTimeout(() => { raf = requestAnimationFrame(cuadro); }, movil() ? 34 : 24);
  };
  const arrancar = () => { if (corriendo || quieto || !visible || document.hidden) return; corriendo = true; ultimo = 0; raf = requestAnimationFrame(cuadro); };
  const parar = () => { corriendo = false; cancelAnimationFrame(raf); clearTimeout(espera); };

  medir();
  dibujar(performance.now(), 0);
  if (quieto) { window.addEventListener('resize', () => { medir(); dibujar(performance.now(), 0); }); return; }

  let rz = 0;
  window.addEventListener('resize', () => { clearTimeout(rz); rz = setTimeout(medir, 150); });
  header.addEventListener('pointermove', (e) => {
    if (e.pointerType !== 'mouse') return;
    const r = header.getBoundingClientRect();
    mouse.tx = ((e.clientX - r.left) / r.width - .5) * -1; mouse.ty = ((e.clientY - r.top) / r.height - .5) * -1;
  });
  header.addEventListener('pointerleave', () => { mouse.tx = 0; mouse.ty = 0; });
  document.addEventListener('visibilitychange', () => (document.hidden ? parar() : arrancar()));
  if ('IntersectionObserver' in window) {
    new IntersectionObserver(([e]) => { visible = e.isIntersecting; visible ? arrancar() : parar(); }).observe(header);
  }
  arrancar();
}

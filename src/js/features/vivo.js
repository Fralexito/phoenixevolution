// VIVO (ronda 388): efectos dinámicos con un estilo elegido (?estilo=…). Estilos en styles/vivo.css.
//   1) Entrada «de transmisión»: barra de luz que barre la cabecera de la página (solo CSS, en styles/vivo.css).
//   2) Números que cuentan: puntos, ELO, marcadores y cifras suben desde 0 al aparecer y «golpean» cuando cambian.
//   3) Celebración a pantalla completa: escucha el evento «pes:logro» ({ titulo, sub }) → destello, texto grande, sacudida y confeti.
//   4) ¡GOL! en el marcador en vivo (evento «pes:gol» con el elemento de la tarjeta).
//   5) Brillo holográfico en tarjetas que sigue al puntero.
//   6) Sonidos opcionales (apagados por defecto; se encienden en el probador): clic, gol y logro, sintetizados (sin archivos).
// Seguridad: todo es «extra». El contenido ya está visible antes; las animaciones usan Web Animations y se cancelan solas.
// Con animaciones reducidas no se hace nada (ni sonidos de movimiento, ni contadores: se ve el número final).
import { celebrar } from './celebrar.js';

const h = document.documentElement;
const activo = () => h.hasAttribute('data-estilo');
const quieto = () => h.getAttribute('data-aj-mov-efectivo') === 'reducido' || matchMedia('(prefers-reduced-motion: reduce)').matches;

/* ───────────── Sonidos (Web Audio, sin archivos) ───────────── */
const CLAVE_SONIDO = 'pes-sonido';
export const sonidoEncendido = () => { try { return localStorage.getItem(CLAVE_SONIDO) === '1'; } catch { return false; } };
export function ponerSonido(si) { try { if (si) localStorage.setItem(CLAVE_SONIDO, '1'); else localStorage.removeItem(CLAVE_SONIDO); } catch { /* sin almacenamiento */ } }
let audio = null;
function tono(notas, { tipo = 'sine', vol = 0.06 } = {}) {
  if (!sonidoEncendido() || !activo()) return;
  try {
    audio ??= new (window.AudioContext || window.webkitAudioContext)();
    if (audio.state === 'suspended') audio.resume();
    const t0 = audio.currentTime;
    for (const [f, ini, dur] of notas) {
      const o = audio.createOscillator(); const g = audio.createGain();
      o.type = tipo; o.frequency.setValueAtTime(f, t0 + ini);
      g.gain.setValueAtTime(0, t0 + ini); g.gain.linearRampToValueAtTime(vol, t0 + ini + 0.012); g.gain.exponentialRampToValueAtTime(0.0001, t0 + ini + dur);
      o.connect(g).connect(audio.destination); o.start(t0 + ini); o.stop(t0 + ini + dur + 0.02);
    }
  } catch { /* el navegador no deja sonar: se ignora */ }
}
export const sonar = {
  clic: () => tono([[880, 0, 0.05]], { tipo: 'triangle', vol: 0.025 }),
  gol: () => tono([[523, 0, 0.12], [659, 0.1, 0.12], [784, 0.2, 0.32]], { tipo: 'square', vol: 0.035 }),
  logro: () => tono([[392, 0, 0.14], [523, 0.12, 0.14], [659, 0.24, 0.14], [1046, 0.36, 0.5]], { tipo: 'triangle', vol: 0.05 }),
};

/* ───────────── 2 · Números que cuentan y golpean ───────────── */
// El marcador en vivo NO cuenta (se repinta con cada gol): su efecto es el «¡GOL!» del evento pes:gol.
const SEL_NUM = ':is(.font-display, .tabular-nums, [data-contar], .stat-num, .pulse-tile b):not(.vivo-marcador *)';
const ENTERO = /^\s*\d{1,5}\s*$/;
const vistos = new WeakSet();
const valores = new WeakMap();
const animando = new WeakSet();
function textoNumerico(el) {   // primer nodo de texto propio que sea solo un entero (p. ej. «1240» en «1240 ELO»)
  for (const n of el.childNodes) if (n.nodeType === 3 && ENTERO.test(n.nodeValue)) return n;
  return null;
}
function contar(nodo) {
  const fin = Number(nodo.nodeValue.trim()); if (!Number.isFinite(fin) || fin < 2) return;
  const anio = fin >= 1990 && fin <= 2100; if (anio) return;   // años: no se cuentan
  const dur = Math.min(1100, 450 + fin * 6); const t0 = performance.now(); const pre = nodo.nodeValue.match(/^\s*/)[0];
  animando.add(nodo);
  const paso = (t) => {
    const k = Math.min(1, (t - t0) / dur); const e = 1 - Math.pow(1 - k, 4);
    nodo.nodeValue = pre + String(Math.round(fin * e));
    if (k < 1 && nodo.isConnected) requestAnimationFrame(paso); else { nodo.nodeValue = pre + String(fin); animando.delete(nodo); valores.set(nodo.parentElement, fin); }
  };
  requestAnimationFrame(paso);
}
function golpe(el) {
  el.classList.remove('v-golpe'); void el.offsetWidth; el.classList.add('v-golpe');
  setTimeout(() => el.classList.remove('v-golpe'), 600);
}
let io = null;
function vigilarNumeros(raiz) {
  if (quieto()) return;
  io ??= new IntersectionObserver((es) => {
    for (const e of es) {
      if (!e.isIntersecting) continue;
      io.unobserve(e.target);
      const n = textoNumerico(e.target); if (n) contar(n);
    }
  }, { threshold: 0.6 });
  raiz.querySelectorAll?.(SEL_NUM).forEach((el) => {
    if (vistos.has(el)) return;
    const n = textoNumerico(el); if (!n) return;
    vistos.add(el); valores.set(el, Number(n.nodeValue.trim()));
    io.observe(el);
  });
}
function cambioDeNumero(el) {   // el número de un elemento ya visto cambió (llegó un gol, sumaste puntos) → golpe
  const n = textoNumerico(el); if (!n || animando.has(n)) return;
  const v = Number(n.nodeValue.trim()); const antes = valores.get(el);
  if (antes !== undefined && v !== antes && !quieto()) golpe(el);
  valores.set(el, v);
}

/* ───────────── 3 · Celebración ───────────── */
let celebrando = false;
export function logro({ titulo = '¡Bien!', sub = '' } = {}) {
  if (!activo() || celebrando) return;
  sonar.logro();
  if (quieto()) return;
  celebrando = true;
  const capa = document.createElement('div');
  capa.className = 'v-celebra'; capa.setAttribute('aria-hidden', 'true');
  capa.innerHTML = '<div class="v-celebra-c"><b></b><small></small></div>';
  capa.querySelector('b').textContent = String(titulo).slice(0, 40);
  capa.querySelector('small').textContent = String(sub).slice(0, 90);
  document.body.appendChild(capa);
  document.body.classList.add('v-sacude');
  celebrar({ x: 0.5, y: 0.55 }, { fuerte: true });
  setTimeout(() => document.body.classList.remove('v-sacude'), 450);
  setTimeout(() => { capa.remove(); celebrando = false; }, 1950);
}

/* ───────────── 4 · ¡GOL! en la tarjeta en vivo ───────────── */
function gol(card) {
  if (!activo() || !card) return;
  sonar.gol();
  if (quieto()) return;
  card.classList.remove('v-gol'); void card.offsetWidth; card.classList.add('v-gol');
  setTimeout(() => card.classList.remove('v-gol'), 1550);
}

/* ───────────── 5 · Brillo holográfico ───────────── */
const SEL_HOLO = '.player-card, .item-tienda, .match-card, [data-reto-card]';
function holo() {
  if (!matchMedia('(hover: hover) and (pointer: fine)').matches) return;
  let raf = 0; let ev = null;
  document.addEventListener('pointermove', (e) => {
    if (!activo()) return;
    ev = e;
    if (raf) return;
    raf = requestAnimationFrame(() => {
      raf = 0;
      const c = ev.target instanceof Element ? ev.target.closest(SEL_HOLO) : null; if (!c) return;
      const r = c.getBoundingClientRect();
      c.style.setProperty('--mx', `${Math.round(ev.clientX - r.left)}px`);
      c.style.setProperty('--my', `${Math.round(ev.clientY - r.top)}px`);
    });
  }, { passive: true });
}

/* ───────────── Arranque ───────────── */
let iniciado = false;
export function initVivo() {
  if (iniciado) return; iniciado = true;
  try {
    // (La entrada en cascada se probó y se quitó: el JS llega cuando la página ya se ve y producía un parpadeo. La entrada la dan la barra de luz
    //  de la cabecera (CSS) y las capas «reveal»/«prof3d» al bajar.)
    if (activo()) vigilarNumeros(document);
    // Nodos nuevos (listas que llegan después) y números que cambian
    let pend = new Set(); let prog = false;
    new MutationObserver((ms) => {
      if (!activo()) return;
      for (const m of ms) {
        if (m.type === 'characterData') { const el = m.target.parentElement; if (el?.matches?.(SEL_NUM)) cambioDeNumero(el); continue; }
        for (const n of m.addedNodes) if (n.nodeType === 1) pend.add(n); else if (n.nodeType === 3 && n.parentElement?.matches?.(SEL_NUM)) cambioDeNumero(n.parentElement);
      }
      if (!prog && pend.size) { prog = true; requestAnimationFrame(() => { prog = false; const l = pend; pend = new Set(); l.forEach((n) => { if (n.isConnected) { if (n.matches?.(SEL_NUM) && vistos.has(n)) cambioDeNumero(n); vigilarNumeros(n.parentElement ?? n); } }); }); }
    }).observe(document.body, { childList: true, subtree: true, characterData: true });
    addEventListener('pes:logro', (e) => logro(e.detail ?? {}));
    addEventListener('pes:gol', (e) => gol(e.detail?.card));
    document.addEventListener('pointerdown', (e) => { if (e.target instanceof Element && e.target.closest('.btn, .adv-chip, .chip, [role="tab"]')) sonar.clic(); }, { passive: true });
    holo();
    addEventListener('tema:cambio', () => { if (activo()) vigilarNumeros(document); });
  } catch (e) { console.warn('[vivo]', e?.message ?? e); }
}

// PULSO EN VIVO: mensajitos sutiles («X aceptó el reto de Y», «Z activó el radar»).
// Fuente de eventos: cualquier parte de la web puede avisar con  window.dispatchEvent(new CustomEvent('live:evento', { detail: {...} })).
// Mientras LIVE_DEMO sea true, además se SIMULAN eventos con nombres ficticios (y se rotula «DEMO»).
// PC: hasta 3 mensajes apilados abajo a la izquierda. Móvil: 1 mensaje a la vez, en una sola línea. Se puede silenciar.
import { formatEvento, demoDelay } from '../core/live.js';
import { DEMO_NOMBRES, DEMO_FORMATOS, DEMO_JUEGOS } from '../../data/liveDemo.js';

const LIVE_DEMO = true;          // ← poner en false cuando haya actividad real
const VISIBLE_MS = 7000;
const MAX_PC = 3;
const KEY = 'pes-live-off';

const pick = (a) => a[Math.floor(Math.random() * a.length)];
const guardado = () => { try { return localStorage.getItem(KEY) === '1'; } catch { return false; } };
const guardar = (off) => { try { localStorage.setItem(KEY, off ? '1' : '0'); } catch { /* sin almacenamiento: no pasa nada */ } };

function eventoDemo() {
  const quien = pick(DEMO_NOMBRES);
  if (Math.random() < 0.45) return { tipo: 'radar_on', quien };
  let rival = pick(DEMO_NOMBRES); while (rival === quien) rival = pick(DEMO_NOMBRES);
  return { tipo: 'reto_aceptado', quien, rival, formato: pick(DEMO_FORMATOS), juego: pick(DEMO_JUEGOS) };
}

export function initLiveFeed() {
  const box = document.getElementById('live-feed');
  const btn = document.getElementById('live-toggle');
  if (!box || !btn) { console.warn('[live] faltan elementos'); return; }
  let off = guardado();

  const pintarBoton = () => {
    btn.setAttribute('aria-pressed', String(!off));
    btn.setAttribute('aria-label', off ? 'Activar el pulso en vivo' : 'Silenciar el pulso en vivo');
    btn.classList.toggle('live-off', off);
    if (off) box.replaceChildren();
  };

  function mostrar(ev) {
    if (off) return;
    const f = formatEvento(ev); if (!f) return;
    const el = document.createElement('div');
    el.className = `live-msg live-${f.tone}`;
    el.innerHTML = `<i class="fa-solid ${f.icon} live-ico"></i><span class="live-txt">${f.html}</span>${LIVE_DEMO ? '<em class="live-demo">demo</em>' : ''}`;
    box.appendChild(el);
    while (box.children.length > MAX_PC) box.firstElementChild.remove();
    requestAnimationFrame(() => el.classList.add('live-in'));
    setTimeout(() => { el.classList.remove('live-in'); setTimeout(() => el.remove(), 450); }, VISIBLE_MS);
  }

  btn.addEventListener('click', () => { off = !off; guardar(off); pintarBoton(); });
  window.addEventListener('live:evento', (e) => mostrar(e.detail));
  pintarBoton();

  if (LIVE_DEMO) {
    const siguiente = (ms) => setTimeout(() => { if (!document.hidden) mostrar(eventoDemo()); siguiente(demoDelay()); }, ms);
    siguiente(2500);
  }
}

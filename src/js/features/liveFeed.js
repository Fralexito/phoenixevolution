// PULSO EN VIVO: mensajitos de actividad («X aceptó el reto de Y», «Z activó el radar»), cada uno con su hora exacta,
// y un HISTORIAL de las últimas 2 horas (se guarda en el navegador, así sobrevive al cambiar de página).
// Fuente de eventos: cualquier parte de la web puede avisar con  window.dispatchEvent(new CustomEvent('live:evento', { detail: {...} })).
// Mientras LIVE_DEMO sea true, además se SIMULAN eventos con nombres reales de los jugadores de la liga (y se rotula «demo» porque los eventos son inventados).
// PC: hasta 5 mensajes a la vez abajo a la derecha. Móvil: hasta 2. Botón «En vivo» = silenciar; botón reloj = historial.
import { formatEvento, demoDelay, horaExacta, mismoDia, podarHistorial } from '../core/live.js';
import { leerAjustes, regionAhora } from './ajustes.js';
import { DEMO_NOMBRES, DEMO_FORMATOS, DEMO_JUEGOS } from '../../data/liveDemo.js';

const LIVE_DEMO = true;          // ← poner en false cuando haya actividad real
const MAX_VISIBLES = 5;
const KEY_OFF = 'pes-live-off';
const KEY_HIST = 'pes-live-hist';

const pick = (a) => a[Math.floor(Math.random() * a.length)];
const leer = (k) => { try { return localStorage.getItem(k); } catch { return null; } };
const escribir = (k, v) => { try { localStorage.setItem(k, v); } catch { /* sin almacenamiento: el historial vive solo en esta página */ } };

function eventoDemo() {
  const quien = pick(DEMO_NOMBRES);
  if (Math.random() < 0.45) return { tipo: 'radar_on', quien };
  let rival = pick(DEMO_NOMBRES); while (rival === quien) rival = pick(DEMO_NOMBRES);
  return { tipo: 'reto_aceptado', quien, rival, formato: pick(DEMO_FORMATOS), ...pick(DEMO_JUEGOS) };
}

export function initLiveFeed() {
  const box = document.getElementById('live-feed');
  const btn = document.getElementById('live-toggle');
  const btnHist = document.getElementById('live-hist-btn');
  const panel = document.getElementById('live-hist');
  const lista = document.getElementById('live-hist-list');
  if (!box || !btn || !btnHist || !panel || !lista) { console.warn('[live] faltan elementos'); return; }
  let off = leer(KEY_OFF) === '1';
  let hist = (() => { try { return podarHistorial(JSON.parse(leer(KEY_HIST) ?? '[]')); } catch { return []; } })();

  const filaHTML = (ev, f, { fecha = false } = {}) => {
    const d = fecha && !mismoDia(ev.ts, Date.now()) ? `${new Date(ev.ts).toLocaleDateString('es-PE', { day: '2-digit', month: '2-digit', ...(regionAhora().timeZone ? { timeZone: regionAhora().timeZone } : {}) })} ` : '';
    return `<i class="fa-solid ${f.icon} live-ico"></i><span class="live-txt">${f.html}</span><time class="live-time" datetime="${new Date(ev.ts).toISOString()}">${d}${horaExacta(ev.ts, regionAhora())}</time>${ev.demo ? '<em class="live-demo">demo</em>' : ''}`;
  };
  const pintarHist = () => {
    hist = podarHistorial(hist);
    lista.innerHTML = hist.length
      ? hist.map((ev) => `<li class="live-row live-${formatEvento(ev).tone}">${filaHTML(ev, formatEvento(ev), { fecha: true })}</li>`).join('')
      : '<li class="live-empty">Aún no hay actividad en las últimas 2 horas.</li>';
    document.getElementById('live-hist-count').textContent = String(hist.length);
  };
  const pintarBoton = () => {
    btn.setAttribute('aria-pressed', String(!off));
    btn.setAttribute('aria-label', off ? 'Activar el pulso en vivo' : 'Silenciar el pulso en vivo');
    btn.classList.toggle('live-off', off);
    if (off) box.replaceChildren();
  };

  function registrar(ev) {
    const f = formatEvento(ev); if (!f) return null;
    const e = { ...ev, ts: Number.isFinite(ev.ts) ? ev.ts : Date.now(), demo: LIVE_DEMO && ev.demo !== false };
    hist = podarHistorial([e, ...hist]);
    if (leerAjustes().vivoHistorial) escribir(KEY_HIST, JSON.stringify(hist));   // ajuste de privacidad
    if (!panel.hidden) pintarHist();
    return { e, f };
  }
  function mostrar(ev) {
    const aj = leerAjustes();
    const r = registrar(ev); if (!r || off) return;
    if ((ev.tipo === 'reto_aceptado' && !aj.vivoRetos) || (ev.tipo === 'radar_on' && !aj.vivoRadar)) return;   // tipo silenciado por el usuario (el historial sí lo guarda)      // aunque esté silenciado, el historial se sigue llenando
    const el = document.createElement('div');
    el.className = `live-msg live-${r.f.tone}`;
    el.innerHTML = filaHTML(r.e, r.f);
    box.appendChild(el);
    while (box.children.length > MAX_VISIBLES) box.firstElementChild.remove();
    requestAnimationFrame(() => el.classList.add('live-in'));
    setTimeout(() => { el.classList.remove('live-in'); setTimeout(() => el.remove(), 450); }, Number(aj.vivoDuracion) * 1000);
  }

  btn.addEventListener('click', () => { off = !off; escribir(KEY_OFF, off ? '1' : '0'); pintarBoton(); });
  btnHist.addEventListener('click', () => { panel.hidden = !panel.hidden; btnHist.setAttribute('aria-expanded', String(!panel.hidden)); if (!panel.hidden) pintarHist(); });
  document.getElementById('live-hist-close').addEventListener('click', () => { panel.hidden = true; btnHist.setAttribute('aria-expanded', 'false'); });
  window.addEventListener('live:evento', (e) => mostrar(e.detail));
  pintarBoton(); pintarHist();

  if (LIVE_DEMO) {
    const siguiente = (ms) => setTimeout(() => { if (!document.hidden) mostrar(eventoDemo()); siguiente(demoDelay()); }, ms);
    siguiente(2500);
  }
}

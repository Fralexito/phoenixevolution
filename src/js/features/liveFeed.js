// PULSO EN VIVO: mensajitos de actividad («X aceptó el reto de Y», «Z activó el radar»), cada uno con su hora exacta,
// y un HISTORIAL SOLO DEL DÍA (se guarda en el navegador; al cambiar de día se vacía solo). Se ve en otra pestaña: pages/historialVivo.js.
// Fuente de eventos: cualquier parte de la web puede avisar con  window.dispatchEvent(new CustomEvent('live:evento', { detail: {...} })).
// Mientras LIVE_DEMO sea true, además se SIMULAN eventos con nombres reales de los jugadores de la liga (y se rotula «demo» porque los eventos son inventados).
// PC: hasta 5 mensajes a la vez abajo a la derecha. Móvil: hasta 2. Botón «En vivo» = silenciar (y se mueve manteniéndolo pulsado, ver liveDock.js); «Historial» = abre la otra pestaña.
import { formatEvento, demoDelay, horaExacta, podarHistorialHoy } from '../core/live.js';
import { leerAjustes, regionAhora } from './ajustes.js';
import { DEMO_NOMBRES, DEMO_FORMATOS, DEMO_JUEGOS } from '../../data/liveDemo.js';

const LIVE_DEMO = false;         // apagado: ya no se inventan eventos; el pulso solo muestra actividad real
const MAX_VISIBLES = 5;
const KEY_OFF = 'pes-live-off';
export const KEY_HIST = 'pes-live-hist';

const pick = (a) => a[Math.floor(Math.random() * a.length)];
export const leer = (k) => { try { return localStorage.getItem(k); } catch { return null; } };
const escribir = (k, v) => { try { localStorage.setItem(k, v); } catch { /* sin almacenamiento: el historial vive solo en esta página */ } };

function eventoDemo() {
  const quien = pick(DEMO_NOMBRES);
  if (Math.random() < 0.45) return { tipo: 'radar_on', quien };
  let rival = pick(DEMO_NOMBRES); while (rival === quien) rival = pick(DEMO_NOMBRES);
  return { tipo: 'reto_aceptado', quien, rival, formato: pick(DEMO_FORMATOS), ...pick(DEMO_JUEGOS) };
}

/** Historial de HOY leído del almacenamiento (siempre fresco: varias pestañas escriben en él). */
export function leerHistorialHoy() {
  try { return podarHistorialHoy(JSON.parse(leer(KEY_HIST) ?? '[]'), Date.now(), { timeZone: regionAhora().timeZone }); } catch { return []; }
}

export function initLiveFeed() {
  const box = document.getElementById('live-feed');
  const btn = document.getElementById('live-toggle');
  if (!box || !btn) { console.warn('[live] faltan elementos'); return; }
  let off = leer(KEY_OFF) === '1';

  const filaHTML = (ev, f) => `<i class="fa-solid ${f.icon} live-ico"></i><span class="live-txt">${f.html}</span><time class="live-time" datetime="${new Date(ev.ts).toISOString()}">${horaExacta(ev.ts, regionAhora())}</time>${ev.demo ? '<em class="live-demo">demo</em>' : ''}`;
  const pintarBoton = () => {
    btn.setAttribute('aria-pressed', String(!off));
    btn.setAttribute('aria-label', off ? 'Activar el pulso en vivo' : 'Silenciar el pulso en vivo');
    btn.classList.toggle('live-off', off);
    if (off) box.replaceChildren();
  };

  function registrar(ev) {
    const f = formatEvento(ev); if (!f) return null;
    const e = { ...ev, ts: Number.isFinite(ev.ts) ? ev.ts : Date.now(), demo: LIVE_DEMO && ev.demo !== false };
    if (leerAjustes().vivoHistorial) {   // ajuste de privacidad. Se relee antes de escribir para no pisar lo que otra pestaña haya guardado
      const hist = podarHistorialHoy([e, ...leerHistorialHoy()], Date.now(), { timeZone: regionAhora().timeZone });
      escribir(KEY_HIST, JSON.stringify(hist));
    }
    return { e, f };
  }
  function mostrar(ev) {
    const aj = leerAjustes();
    const r = registrar(ev); if (!r || off) return;   // aunque esté silenciado, el historial se sigue llenando
    if ((ev.tipo === 'reto_aceptado' && !aj.vivoRetos) || (ev.tipo === 'radar_on' && !aj.vivoRadar)) return;   // tipo silenciado por el usuario (el historial sí lo guarda)
    const el = document.createElement('div');
    el.className = `live-msg live-${r.f.tone}`;
    el.innerHTML = filaHTML(r.e, r.f);
    box.appendChild(el);
    while (box.children.length > MAX_VISIBLES) box.firstElementChild.remove();
    requestAnimationFrame(() => el.classList.add('live-in'));
    setTimeout(() => { el.classList.remove('live-in'); setTimeout(() => el.remove(), 450); }, Number(aj.vivoDuracion) * 1000);
  }

  // Un clic corto en «En vivo» silencia/activa. (Si el gesto fue un arrastre, liveDock.js se traga ese clic antes de llegar aquí.)
  btn.addEventListener('click', () => { off = !off; escribir(KEY_OFF, off ? '1' : '0'); pintarBoton(); });
  window.addEventListener('live:evento', (e) => mostrar(e.detail));
  pintarBoton();

  if (LIVE_DEMO) {
    const siguiente = (ms) => setTimeout(() => { if (!document.hidden) mostrar(eventoDemo()); siguiente(demoDelay()); }, ms);
    siguiente(2500);
  }
}

// Pulso en vivo — parte pura (sin DOM): convierte un evento en texto y calcula pausas. Probable con `npm test`.
import { escapeHTML } from './dom.js';
import { etiquetaJuego } from './rules.js';

/**
 * Evento = { tipo, quien, rival?, formato?, juego?, parche?, version? }  (juego + parche/versión se muestran como «PES 21 (Dream Patch)» o «SP Football Life 26»). Tipos:
 *  - 'reto_aceptado': «quien» aceptó el reto de «rival».
 *  - 'radar_on': «quien» activó el radar.
 * Devuelve { icon, tone, html } (html ya escapado) o null si el evento no es válido.
 */
export function formatEvento(ev) {
  const q = String(ev?.quien ?? '').trim().slice(0, 30);
  if (!q) return null;
  const n = (s) => `<b>${escapeHTML(s)}</b>`;
  if (ev.tipo === 'reto_aceptado') {
    const r = String(ev.rival ?? '').trim().slice(0, 30);
    if (!r) return null;
    const extra = [ev.formato, etiquetaJuego(ev)].filter(Boolean).map((x) => escapeHTML(String(x).slice(0, 48))).join(' · ');
    return { icon: 'fa-bolt', tone: 'ok', html: `${n(q)} aceptó el reto de ${n(r)}${extra ? ` <span class="live-dim">· ${extra}</span>` : ''}` };
  }
  if (ev.tipo === 'radar_on') return { icon: 'fa-tower-broadcast', tone: 'cyan', html: `${n(q)} activó el radar` };
  return null;
}

/** Pausa (ms) hasta el siguiente evento simulado; `rnd` es una función 0..1 (se inyecta para poder probarla). */
export const demoDelay = (rnd = Math.random, min = 5000, max = 11000) => Math.round(min + rnd() * (max - min));

// ---- Hora e historial ----
export const HIST_MAX_MS = 2 * 60 * 60 * 1000;   // el historial guarda las últimas 2 horas
export const HIST_MAX_N = 200;                   // y como máximo 200 eventos
const p2 = (n) => String(n).padStart(2, '0');

/**
 * Hora exacta «HH:MM:SS». Sin opciones usa la hora local del dispositivo en 24 h.
 * `{ hour12, timeZone }` (de core/ajustes.js → opcionesRegion) la convierte a otra zona o a 12 horas.
 */
export function horaExacta(ts, { hour12 = false, timeZone } = {}) {
  const d = new Date(ts);
  if (Number.isNaN(d.getTime())) return '--:--:--';
  if (!hour12 && !timeZone) return `${p2(d.getHours())}:${p2(d.getMinutes())}:${p2(d.getSeconds())}`;
  try { return new Intl.DateTimeFormat('es', { hour: '2-digit', minute: '2-digit', second: '2-digit', hour12, ...(timeZone ? { timeZone } : {}) }).format(d); }
  catch { return `${p2(d.getHours())}:${p2(d.getMinutes())}:${p2(d.getSeconds())}`; }   // zona desconocida: se vuelve a la hora local
}
/** ¿Es el mismo día local? (para mostrar la fecha solo cuando el evento no es de hoy). */
export const mismoDia = (a, b) => new Date(a).toDateString() === new Date(b).toDateString();

/** Devuelve el historial limpio: solo eventos válidos, dentro de la ventana de tiempo, más nuevo primero, con tope de cantidad. No muta. */
export function podarHistorial(hist, now = Date.now(), { maxMs = HIST_MAX_MS, maxN = HIST_MAX_N } = {}) {
  return (Array.isArray(hist) ? hist : [])
    .filter((e) => e && Number.isFinite(e.ts) && e.ts <= now + 60_000 && now - e.ts <= maxMs && formatEvento(e))
    .sort((a, b) => b.ts - a.ts)
    .slice(0, maxN);
}

/** Clave de día «AAAA-MM-DD» en la zona indicada (o la local del dispositivo). Sirve para saber «¿es de hoy?» sin depender de horas sueltas. */
export function diaClave(ts, timeZone) {
  const d = new Date(ts); if (Number.isNaN(d.getTime())) return '';
  try { return new Intl.DateTimeFormat('en-CA', { year: 'numeric', month: '2-digit', day: '2-digit', ...(timeZone ? { timeZone } : {}) }).format(d); }
  catch { return `${d.getFullYear()}-${p2(d.getMonth() + 1)}-${p2(d.getDate())}`; }   // zona desconocida: día local
}
/** Historial SOLO DEL DÍA de `now`: cuando cambia el día, lo anterior desaparece solo. Válidos, más nuevo primero, con tope. No muta. */
export function podarHistorialHoy(hist, now = Date.now(), { timeZone, maxN = HIST_MAX_N } = {}) {
  const hoy = diaClave(now, timeZone);
  return (Array.isArray(hist) ? hist : [])
    .filter((e) => e && Number.isFinite(e.ts) && e.ts <= now + 60_000 && diaClave(e.ts, timeZone) === hoy && formatEvento(e))
    .sort((a, b) => b.ts - a.ts)
    .slice(0, maxN);
}

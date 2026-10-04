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

/** Hora exacta local «HH:MM:SS» (24 h) de un timestamp en ms. */
export function horaExacta(ts) {
  const d = new Date(ts);
  return Number.isNaN(d.getTime()) ? '--:--:--' : `${p2(d.getHours())}:${p2(d.getMinutes())}:${p2(d.getSeconds())}`;
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

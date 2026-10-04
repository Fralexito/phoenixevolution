// Pulso en vivo — parte pura (sin DOM): convierte un evento en texto y calcula pausas. Probable con `npm test`.
import { escapeHTML } from './dom.js';

/**
 * Evento = { tipo, quien, rival?, formato?, juego? }. Tipos:
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
    const extra = [ev.formato, ev.juego].filter(Boolean).map((x) => escapeHTML(String(x).slice(0, 24))).join(' · ');
    return { icon: 'fa-bolt', tone: 'ok', html: `${n(q)} aceptó el reto de ${n(r)}${extra ? ` <span class="live-dim">· ${extra}</span>` : ''}` };
  }
  if (ev.tipo === 'radar_on') return { icon: 'fa-tower-broadcast', tone: 'cyan', html: `${n(q)} activó el radar` };
  return null;
}

/** Pausa (ms) hasta el siguiente evento simulado; `rnd` es una función 0..1 (se inyecta para poder probarla). */
export const demoDelay = (rnd = Math.random, min = 5000, max = 11000) => Math.round(min + rnd() * (max - min));

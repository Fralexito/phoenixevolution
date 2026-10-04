// Lógica PURA de fechas para los duelos (sin DOM → se prueba con `npm test`).

export const SLOT_HOURS = ['14:00', '15:00', '16:00', '17:00', '18:00', '19:00', '20:00', '21:00', '22:00', '23:00', '00:00', '01:00'];
import { MIN_LEAD_MIN, CONFIRM_OPEN_MIN, CONFIRM_CLOSE_MIN } from './rules.js';
const MIN = 60_000;

/**
 * Fecha elegida con "Hoy/Mañana" + hora de slot.
 * Los slots de madrugada (00:00, 01:00) pertenecen a la noche del día elegido, o sea al día calendario siguiente.
 */
export function slotToDate(dayOffset, hhmm, now = new Date()) {
  const [h, m] = hhmm.split(':').map(Number);
  const d = new Date(now);
  d.setHours(h, m, 0, 0);
  d.setDate(d.getDate() + dayOffset + (h < 14 ? 1 : 0));
  return d;
}

/** Fecha manual con validación real (rechaza 31 de febrero y fechas pasadas). */
export function manualToDate({ day, month, hhmm }, now = new Date()) {
  const [h, m] = hhmm.split(':').map(Number);
  const year = now.getFullYear();
  let d = new Date(year, month, day, h, m, 0, 0);
  if (d.getMonth() !== month || d.getDate() !== day) return { ok: false, error: 'Esa fecha no existe (revisa el día y el mes).' };
  if (d.getTime() < now.getTime()) {
    // Un mes anterior al actual se entiende como el año siguiente (p. ej. enero elegido en diciembre).
    if (month < now.getMonth()) {
      d = new Date(year + 1, month, day, h, m, 0, 0);
      if (d.getMonth() !== month || d.getDate() !== day) return { ok: false, error: 'Esa fecha no existe (revisa el día y el mes).' };
    } else return { ok: false, error: 'Esa fecha y hora ya pasaron.' };
  }
  return { ok: true, date: d };
}

/** Un reto PROGRAMADO exige MIN_LEAD_MIN de antelación (ver rules.js). */
export const isFuture = (date, now = new Date()) => date.getTime() - now.getTime() >= MIN_LEAD_MIN * MIN;

/**
 * Atajos de tiempo → campos del reto.
 *  - ya      : AHORA, sin hora.
 *  - 15 / 30 : AHORA con hora orientativa (la BD la acepta hasta 2 h).
 *  - 60      : PROGRAMADO (≥ 30 min, así que requiere confirmación).
 */
export function presetToReto(kind, now = new Date()) {
  const at = (min) => new Date(now.getTime() + min * MIN).toISOString();
  switch (String(kind)) {
    case 'ya': return { modalidad: 'AHORA', fecha_programada: null };
    case '15': return { modalidad: 'AHORA', fecha_programada: at(15) };
    case '30': return { modalidad: 'AHORA', fecha_programada: at(30) };
    case '60': return { modalidad: 'PROGRAMADO', fecha_programada: at(60) };
    default: return null;
  }
}

/**
 * Fase de confirmación de un PROGRAMADO (misma regla que la BD):
 *  'pronto' (> 30 min) · 'abierta' (30 → 10 min) · 'cerrada' (< 10 min).
 */
export function confirmPhase(fecha, now = new Date()) {
  const left = (new Date(fecha).getTime() - now.getTime()) / MIN;
  if (left > CONFIRM_OPEN_MIN) return 'pronto';
  if (left >= CONFIRM_CLOSE_MIN) return 'abierta';
  return 'cerrada';
}

/** ¿Un reto ya no merece mostrarse a otros jugadores? */
export function isStale(reto, now = new Date()) {
  const t = now.getTime();
  const created = new Date(reto.created_at).getTime();
  const sched = reto.fecha_programada ? new Date(reto.fecha_programada).getTime() : null;
  if (reto.estado === 'BUSCANDO') return sched ? sched < t - 120 * MIN : created < t - 60 * MIN;
  return (sched ?? created) < t - 8 * 60 * MIN;
}

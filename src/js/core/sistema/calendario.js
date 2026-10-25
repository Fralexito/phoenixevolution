// Calendario personal — lógica PURA (sin DOM → `npm test`): arma archivos .ics (RFC 5545) y enlaces de Google Calendar.
// La pantalla (botones y descarga) vive en js/features/calendario.js. Pedido de Fralex (25-oct-2026): «que nadie olvide su partido».
// Blindaje: horas en UTC (Z) → valen en cualquier zona horaria; UID fijo por partido → importar dos veces ACTUALIZA, no duplica;
// textos escapados (\ ; , y saltos de línea) y líneas plegadas a 75 bytes UTF-8 (sin partir un carácter); fechas inválidas o pasadas fuera.

export const DOMINIO_UID = 'phoenixevolution';
export const DURACION_MIN = 30;   // un partido de PES con previa, por defecto
export const AVISO_MIN = 30;      // aviso del calendario antes de empezar

const pad = (n) => String(n).padStart(2, '0');
/** Fecha → formato UTC del .ics: 20261025T183000Z. null si no es válida. */
export function fechaIcs(x) {
  const d = x instanceof Date ? x : new Date(x ?? NaN);
  if (Number.isNaN(d.getTime())) return null;
  return `${d.getUTCFullYear()}${pad(d.getUTCMonth() + 1)}${pad(d.getUTCDate())}T${pad(d.getUTCHours())}${pad(d.getUTCMinutes())}${pad(d.getUTCSeconds())}Z`;
}

/** Escapa un texto para el .ics (RFC 5545 §3.3.11) y quita caracteres de control. */
export function escaparIcs(t) {
  return String(t ?? '').replace(/[\u0000-\u0008\u000b\u000c\u000e-\u001f\u007f]/g, '')
    .replace(/\\/g, '\\\\').replace(/;/g, '\\;').replace(/,/g, '\\,').replace(/\r\n|\r|\n/g, '\\n');
}

/** Pliega una línea a 75 bytes UTF-8 sin partir un carácter (las siguientes empiezan con un espacio). */
export function plegar(linea) {
  const enc = new TextEncoder(); const out = []; let actual = ''; let bytes = 0; let limite = 75;
  for (const ch of linea) {
    const b = enc.encode(ch).length;
    if (bytes + b > limite) { out.push(actual); actual = ' '; bytes = 1; limite = 75; }
    actual += ch; bytes += b;
  }
  out.push(actual);
  return out.join('\r\n');
}

/**
 * Normaliza los eventos: descarta los que no tienen hora válida o ya terminaron; quita duplicados por uid.
 * @param {{ uid:string, titulo:string, inicio:string|Date, minutos?:number, descripcion?:string, url?:string, lugar?:string }[]} eventos
 * @param {Date} [ahora]
 * @returns {{ validos: object[], sinHora: number, pasados: number }}
 */
export function prepararEventos(eventos, ahora = new Date()) {
  const vistos = new Set(); const validos = []; let sinHora = 0; let pasados = 0;
  for (const e of eventos ?? []) {
    if (!e || !e.uid) continue;
    const ini = new Date(e.inicio ?? NaN);
    if (Number.isNaN(ini.getTime())) { sinHora++; continue; }
    const min = Number.isFinite(e.minutos) && e.minutos > 0 ? Math.min(e.minutos, 24 * 60) : DURACION_MIN;
    const fin = new Date(ini.getTime() + min * 60e3);
    if (fin.getTime() < new Date(ahora).getTime()) { pasados++; continue; }
    if (vistos.has(e.uid)) continue;
    vistos.add(e.uid);
    validos.push({ ...e, inicio: ini, fin, titulo: String(e.titulo ?? 'Partido').slice(0, 200), descripcion: String(e.descripcion ?? '').slice(0, 1000) });
  }
  validos.sort((a, b) => a.inicio - b.inicio);
  return { validos, sinHora, pasados };
}

/** Arma el .ics completo (con aviso antes de cada evento). Devuelve null si no hay nada válido. */
export function crearIcs(eventos, { nombre = 'Phoenix Evolution', ahora = new Date(), avisoMin = AVISO_MIN } = {}) {
  const { validos } = prepararEventos(eventos, ahora);
  if (!validos.length) return null;
  const stamp = fechaIcs(ahora);
  const L = ['BEGIN:VCALENDAR', 'VERSION:2.0', 'PRODID:-//Phoenix Evolution Series//Calendario//ES', 'CALSCALE:GREGORIAN', 'METHOD:PUBLISH',
    `X-WR-CALNAME:${escaparIcs(nombre)}`];
  for (const e of validos) {
    L.push('BEGIN:VEVENT', `UID:${escaparIcs(e.uid)}@${DOMINIO_UID}`, `DTSTAMP:${stamp}`, `DTSTART:${fechaIcs(e.inicio)}`, `DTEND:${fechaIcs(e.fin)}`,
      `SUMMARY:${escaparIcs(e.titulo)}`);
    if (e.descripcion) L.push(`DESCRIPTION:${escaparIcs(e.descripcion)}`);
    if (e.lugar) L.push(`LOCATION:${escaparIcs(e.lugar)}`);
    if (e.url && /^https:\/\//.test(e.url)) L.push(`URL:${escaparIcs(e.url)}`);
    if (avisoMin > 0) L.push('BEGIN:VALARM', 'ACTION:DISPLAY', `DESCRIPTION:${escaparIcs(e.titulo)}`, `TRIGGER:-PT${Math.round(avisoMin)}M`, 'END:VALARM');
    L.push('END:VEVENT');
  }
  L.push('END:VCALENDAR');
  return L.map(plegar).join('\r\n') + '\r\n';
}

/** Enlace «Añadir a Google Calendar» de un evento (null si la hora no vale). */
export function enlaceGoogle(e) {
  const ini = fechaIcs(e?.inicio); if (!ini) return null;
  const min = Number.isFinite(e.minutos) && e.minutos > 0 ? e.minutos : DURACION_MIN;
  const fin = fechaIcs(new Date(new Date(e.inicio).getTime() + min * 60e3));
  const q = new URLSearchParams({ action: 'TEMPLATE', text: String(e.titulo ?? 'Partido').slice(0, 200), dates: `${ini}/${fin}`,
    details: [e.descripcion, e.url].filter(Boolean).join('\n').slice(0, 1500) });
  if (e.lugar) q.set('location', String(e.lugar).slice(0, 200));
  return `https://calendar.google.com/calendar/render?${q.toString()}`;
}

/** Frase para la persona sobre lo que NO se pudo añadir. */
export function avisoOmitidos({ sinHora, pasados }) {
  const partes = [];
  if (sinHora) partes.push(`${sinHora} sin hora fija`);
  if (pasados) partes.push(`${pasados} ya ${pasados === 1 ? 'pasó' : 'pasaron'}`);
  return partes.length ? `No se añadieron: ${partes.join(' y ')}.` : '';
}

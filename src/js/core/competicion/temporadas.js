// Temporadas con premios — lógica PURA (sin DOM → `npm test`). Espejo de la migración 154 (premios y textos).
export const PREMIOS = [300, 200, 100, 30, 30, 30, 30, 30, 30, 30];   // ascuas del 1.º al 10.º
export const MIN_DUELOS = 3;
export const MIN_PARTICIPANTES = 4;
export const premioDe = (puesto) => (Number.isInteger(puesto) && puesto >= 1 && puesto <= 10 ? PREMIOS[puesto - 1] : 0);
export const insigniaDe = (puesto) => (puesto === 1 ? 'Campeón' : puesto === 2 ? 'Subcampeón' : puesto === 3 ? 'Tercero' : puesto >= 4 && puesto <= 10 ? 'Top 10' : '');
const MESES = ['enero', 'febrero', 'marzo', 'abril', 'mayo', 'junio', 'julio', 'agosto', 'septiembre', 'octubre', 'noviembre', 'diciembre'];
/** '2026-09-01' → 'septiembre 2026' (sin depender de la zona horaria del aparato). */
export function nombreMes(iso) {
  const m = /^(\d{4})-(\d{2})/.exec(String(iso ?? ''));
  if (!m) return '';
  const i = Number(m[2]) - 1; return i >= 0 && i < 12 ? `${MESES[i]} ${m[1]}` : '';
}
/** Días (enteros, hora de Lima) que faltan para el cierre de la temporada actual. */
export function diasParaCierre(ahora = new Date()) {
  const lima = new Date(new Date(ahora).getTime() - 5 * 3600e3);              // Lima = UTC−5 todo el año
  const finUtc = Date.UTC(lima.getUTCFullYear(), lima.getUTCMonth() + 1, 1, 5, 0, 0);
  return Math.max(0, Math.ceil((finUtc - new Date(ahora).getTime()) / 86400e3));
}
export const ICONO = { 1: '🥇', 2: '🥈', 3: '🥉' };

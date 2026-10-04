// Lógica PURA de equipos y cupos (se prueba con `npm test`). Sin DOM, sin red.
import { MAX_PLAYERS, MAX_TEAM } from './rules.js';

export const clampTeam = (n) => Math.min(MAX_TEAM, Math.max(1, Math.trunc(Number(n)) || 1));

/** Máximo que puede tener un equipo dado el tamaño del otro. */
export const maxFor = (otherSize) => Math.min(MAX_TEAM, MAX_PLAYERS - clampTeam(otherSize));

export const validTeams = (a, b) =>
  Number.isInteger(a) && Number.isInteger(b) && a >= 1 && b >= 1 && a <= MAX_TEAM && b <= MAX_TEAM && a + b <= MAX_PLAYERS;

/** Cambia un lado ('a' | 'b') sin romper el límite de 8 en total. Devuelve siempre un par válido. */
export function setTeamSize({ a, b }, side, value) {
  const cur = { a: clampTeam(a), b: clampTeam(b) };
  const other = side === 'a' ? cur.b : cur.a;
  cur[side] = Math.min(clampTeam(value), maxFor(other));
  return cur;
}

/** Cupos de un equipo. `parts` = filas de reto_participantes de ese reto (sin las que salieron). */
export function seats(tam, parts, equipo) {
  const mine = parts.filter((p) => p.equipo === equipo && p.estado !== 'SALIO');
  const confirmed = mine.filter((p) => p.estado === 'CONFIRMADO').length;
  const invited = mine.length - confirmed;
  return { tam, confirmed, invited, free: Math.max(0, tam - confirmed - invited), missing: Math.max(0, tam - confirmed) };
}

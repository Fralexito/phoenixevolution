// Panel lateral de Jugadores (FX.jugadoresRiel, ronda 362): cuentas por posición y por equipo, y filtro por grupo de posición.
// Puro (sin DOM): lo usa js/features/jugadoresRiel.js y pages/database.js.
import { GRUPOS, posInfo } from '../../../data/posiciones.js';

export const ORDEN_GRUPOS = ['portero', 'defensa', 'medio', 'delantero'];
/** Nombre en plural de cada grupo para el panel. */
export const PLURAL = { portero: 'Porteros', defensa: 'Defensas', medio: 'Medios', delantero: 'Delanteros' };

const grupoDe = (p) => posInfo(p?.posicion).grupo;
const clubDe = (p) => String(p?.club ?? '').trim().toUpperCase();

/** Deja solo los del grupo pedido ('' o desconocido = todos). */
export function filtrarGrupo(lista, grupo) {
  if (!Array.isArray(lista)) return [];
  if (!grupo || !GRUPOS[grupo]) return lista;
  return lista.filter((p) => grupoDe(p) === grupo);
}

/** [{ grupo, nombre, color, n }] en orden portero → delantero, con el total en `total`. */
export function contarPorGrupo(lista) {
  const arr = Array.isArray(lista) ? lista : [];
  const n = Object.fromEntries(ORDEN_GRUPOS.map((g) => [g, 0]));
  for (const p of arr) { const g = grupoDe(p); if (g in n) n[g]++; }
  return { total: arr.length, grupos: ORDEN_GRUPOS.map((g) => ({ grupo: g, nombre: PLURAL[g], color: GRUPOS[g].color, n: n[g] })) };
}

/** [{ club, n }] de mayor a menor (empate: por nombre). Sin club no cuenta. */
export function contarPorClub(lista) {
  const m = new Map();
  for (const p of Array.isArray(lista) ? lista : []) { const c = clubDe(p); if (c) m.set(c, (m.get(c) ?? 0) + 1); }
  return [...m].map(([club, n]) => ({ club, n })).sort((a, b) => b.n - a.n || a.club.localeCompare(b.club));
}

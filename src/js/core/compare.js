// Cálculos puros para comparar dos jugadores (sin DOM → probables).
import { stat } from './dom.js';

/** Compara dos fichas stat por stat. rows[i] = { k, a, b, diff (a-b), win: 'a'|'b'|'tie' }; wins = cuántas gana cada uno. */
export function compareStats(a, b, keys) {
  const rows = keys.map((k) => {
    const va = stat(a?.[k]); const vb = stat(b?.[k]);
    return { k, a: va, b: vb, diff: va - vb, win: va > vb ? 'a' : vb > va ? 'b' : 'tie' };
  });
  const wins = { a: 0, b: 0, tie: 0 };
  rows.forEach((r) => { wins[r.win] += 1; });
  const oa = stat(a?.ovr, 0); const ob = stat(b?.ovr, 0);
  return { rows, wins, ovr: { a: oa, b: ob, diff: oa - ob } };
}

/** Punto (x,y) del eje i de n en un radar centrado en (cx,cy) con radio `rad`; el eje 0 apunta hacia arriba. */
export function axisPoint(i, n, cx, cy, rad) {
  const ang = (Math.PI * 2 * i) / n - Math.PI / 2;
  return [cx + rad * Math.cos(ang), cy + rad * Math.sin(ang)];
}

/** Polígono del radar para una ficha: cada stat se mapea de [min,max] a [0,r]. Devuelve "x,y x,y …". */
export function radarPoints(player, keys, { cx, cy, r, min = 40, max = 99 }) {
  return keys.map((k, i) => {
    const n = Number(player?.[k]); const v = Number.isFinite(n) ? n : min;   // sin redondear: sirve también para promedios de equipo
    const t = Math.min(1, Math.max(0, (v - min) / (max - min)));
    const [x, y] = axisPoint(i, keys.length, cx, cy, r * t);
    return `${x.toFixed(1)},${y.toFixed(1)}`;
  }).join(' ');
}

// ---- Comparación por equipos (hasta 8 jugadores: A y B con máx. 4 cada uno) ----
export const MAX_COMPARE = 8;
export const MAX_TEAM = 4;
const r1 = (n) => Math.round(n * 10) / 10;

/** Reparte ids alternando A, B, A, B… (con 3 jugadores queda 2 vs 1). Máx. MAX_TEAM por equipo; los que sobren se ignoran. */
export function autoTeams(ids) {
  const t = { a: [], b: [] };
  ids.forEach((id, i) => { const k = i % 2 === 0 ? 'a' : 'b'; if (t[k].length < MAX_TEAM) t[k].push(id); });
  return t;
}
/** Mueve un id al equipo `to` ('a'|'b'). Si ese equipo ya está lleno, no cambia nada. Devuelve equipos nuevos (no muta). */
export function moveToTeam(teams, id, to) {
  const from = to === 'a' ? 'b' : 'a';
  if (!teams[from].includes(id) || teams[to].length >= MAX_TEAM) return teams;
  return { [from]: teams[from].filter((x) => x !== id), [to]: [...teams[to], id] };
}
/** Perfil promedio de un equipo: { n, ovr, atq, fin… } con 1 decimal. Equipo vacío → n = 0. */
export function teamProfile(players, keys) {
  const out = { n: players.length };
  if (!players.length) return out;
  const avg = (get) => r1(players.reduce((s, p) => s + get(p), 0) / players.length);
  keys.forEach((k) => { out[k] = avg((p) => stat(p?.[k])); });
  out.ovr = avg((p) => stat(p?.ovr, 0));
  return out;
}
/** Compara dos perfiles de equipo. diff = a − b (1 decimal); diferencias menores a 0.05 cuentan como empate. */
export function compareTeams(pa, pb, keys) {
  const rows = keys.map((k) => {
    const diff = r1(pa[k] - pb[k]);
    return { k, a: pa[k], b: pb[k], diff, win: diff > 0.049 ? 'a' : diff < -0.049 ? 'b' : 'tie' };
  });
  const wins = { a: 0, b: 0, tie: 0 };
  rows.forEach((x) => { wins[x.win] += 1; });
  return { rows, wins, ovr: { a: pa.ovr, b: pb.ovr, diff: r1(pa.ovr - pb.ovr) } };
}

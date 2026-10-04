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
    const t = Math.min(1, Math.max(0, (stat(player?.[k]) - min) / (max - min)));
    const [x, y] = axisPoint(i, keys.length, cx, cy, r * t);
    return `${x.toFixed(1)},${y.toFixed(1)}`;
  }).join(' ');
}

// BÚSQUEDA AVANZADA: ordena jugadores por una o varias stats a la vez. Sin DOM → probable.
// Puntaje = promedio de las stats elegidas. `min` exige que CADA stat elegida llegue al menos a ese valor.
// Ranking de competición: empatados comparten puesto (1, 1, 3…).
export function rankPlayers(players, keys, { min = 0, top = null } = {}) {
  if (!keys?.length) return [];
  const num = (p, k) => Number(p[k]) || 0;
  const filas = players.map((p) => { const vals = Object.fromEntries(keys.map((k) => [k, num(p, k)])); return { p, vals, score: keys.reduce((s, k) => s + vals[k], 0) / keys.length }; })
    .filter((f) => keys.every((k) => f.vals[k] >= min));
  filas.sort((a, b) => b.score - a.score || num(b.p, 'ovr') - num(a.p, 'ovr') || String(a.p.nombre).localeCompare(String(b.p.nombre)));
  filas.forEach((f, i) => { f.rank = i > 0 && f.score === filas[i - 1].score ? filas[i - 1].rank : i + 1; });
  return top ? filas.slice(0, top) : filas;
}

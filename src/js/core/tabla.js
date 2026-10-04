// Tabla de posiciones a partir de resultados (sin DOM → probable con `npm test`).
// Puntos: victoria 3, empate 1, derrota 0.
// Orden: puntos → ENFRENTAMIENTO DIRECTO entre los empatados (puntos, dif. de goles y goles a favor en los partidos entre ellos)
//        → diferencia de goles total → goles a favor total → nombre (A-Z).
// El enfrentamiento directo se dedujo comparando con la tabla real de CopaFácil: Fralex (6 pts, dif. −13) queda sobre Hugo (6 pts, dif. −8) porque le ganó 5-1.
const entero = (n) => Number.isInteger(n) && n >= 0;

/**
 * @param {{l:string, v:string, gl:number, gv:number}[]} partidos  l = local, v = visitante, gl/gv = goles.
 * @returns {{tabla: object[], descartados: object[], pendientes: number}} `descartados` = partidos con dato inválido (se ignoran y se avisan, no rompen la tabla);
 *   `pendientes` = partidos aún sin jugar (gl y gv en null): no suman nada.
 */
export function calcularTabla(partidos) {
  const filas = new Map(); const descartados = []; let pendientes = 0;
  const fila = (n) => { if (!filas.has(n)) filas.set(n, { nombre: n, pj: 0, g: 0, e: 0, p: 0, gf: 0, gc: 0, dg: 0, pts: 0 }); return filas.get(n); };
  for (const m of Array.isArray(partidos) ? partidos : []) {
    if (m && m.l && m.v && m.gl === null && m.gv === null) { pendientes += 1; continue; }   // programado, todavía sin marcador
    if (!m || !m.l || !m.v || m.l === m.v || !entero(m.gl) || !entero(m.gv)) { descartados.push(m); continue; }
    const a = fila(m.l); const b = fila(m.v);
    a.pj += 1; b.pj += 1; a.gf += m.gl; a.gc += m.gv; b.gf += m.gv; b.gc += m.gl;
    if (m.gl > m.gv) { a.g += 1; a.pts += 3; b.p += 1; } else if (m.gl < m.gv) { b.g += 1; b.pts += 3; a.p += 1; } else { a.e += 1; b.e += 1; a.pts += 1; b.pts += 1; }
  }
  const jugados = (Array.isArray(partidos) ? partidos : []).filter((m) => m && m.l && m.v && m.l !== m.v && entero(m.gl) && entero(m.gv));
  // Mini-tabla solo con los partidos entre `nombres` (los empatados a puntos).
  const directo = (nombres) => {
    const mini = new Map(nombres.map((n) => [n, { pts: 0, gf: 0, gc: 0 }]));
    for (const m of jugados) {
      const a = mini.get(m.l); const b = mini.get(m.v); if (!a || !b) continue;
      a.gf += m.gl; a.gc += m.gv; b.gf += m.gv; b.gc += m.gl;
      if (m.gl > m.gv) a.pts += 3; else if (m.gl < m.gv) b.pts += 3; else { a.pts += 1; b.pts += 1; }
    }
    return mini;
  };
  const todas = [...filas.values()].map((f) => ({ ...f, dg: f.gf - f.gc }));
  // Agrupa por una clave (mayor primero): devuelve los grupos de iguales, ya ordenados.
  const partir = (g, clave) => { const m = new Map(); for (const f of g) m.set(clave(f), [...(m.get(clave(f)) ?? []), f]); return [...m.keys()].sort((x, y) => y - x).map((k) => m.get(k)); };
  // Resuelve un grupo empatado a puntos. Criterios del enfrentamiento directo, uno a uno; en cuanto un criterio separa a alguien, los que siguen
  // empatados se vuelven a resolver SOLO entre ellos (regla habitual de UEFA). Si ninguno separa, manda la dif. de goles total, luego goles a favor, luego nombre.
  const resolver = (g) => {
    if (g.length <= 1) return g;
    const mini = directo(g.map((f) => f.nombre));
    for (const clave of [(f) => mini.get(f.nombre).pts, (f) => mini.get(f.nombre).gf - mini.get(f.nombre).gc, (f) => mini.get(f.nombre).gf]) {
      const grupos = partir(g, clave);
      if (grupos.length > 1) return grupos.flatMap(resolver);
    }
    return [...g].sort((x, y) => y.dg - x.dg || y.gf - x.gf || x.nombre.localeCompare(y.nombre, 'es'));
  };
  const tabla = partir(todas, (f) => f.pts).flatMap(resolver);
  return { tabla, descartados, pendientes };
}

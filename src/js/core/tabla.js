// Tabla de posiciones a partir de resultados (sin DOM → probable con `npm test`).
// Puntos: victoria 3, empate 1, derrota 0. Orden: puntos → diferencia de goles → goles a favor → nombre (A-Z).
// Pendiente de confirmar con la liga: ¿el enfrentamiento directo entra antes que la diferencia de goles?
const entero = (n) => Number.isInteger(n) && n >= 0;

/**
 * @param {{l:string, v:string, gl:number, gv:number}[]} partidos  l = local, v = visitante, gl/gv = goles.
 * @returns {{tabla: object[], descartados: object[]}} `descartados` = partidos con dato inválido (se ignoran y se avisan, no rompen la tabla).
 */
export function calcularTabla(partidos) {
  const filas = new Map(); const descartados = [];
  const fila = (n) => { if (!filas.has(n)) filas.set(n, { nombre: n, pj: 0, g: 0, e: 0, p: 0, gf: 0, gc: 0, dg: 0, pts: 0 }); return filas.get(n); };
  for (const m of Array.isArray(partidos) ? partidos : []) {
    if (!m || !m.l || !m.v || m.l === m.v || !entero(m.gl) || !entero(m.gv)) { descartados.push(m); continue; }
    const a = fila(m.l); const b = fila(m.v);
    a.pj += 1; b.pj += 1; a.gf += m.gl; a.gc += m.gv; b.gf += m.gv; b.gc += m.gl;
    if (m.gl > m.gv) { a.g += 1; a.pts += 3; b.p += 1; } else if (m.gl < m.gv) { b.g += 1; b.pts += 3; a.p += 1; } else { a.e += 1; b.e += 1; a.pts += 1; b.pts += 1; }
  }
  const tabla = [...filas.values()].map((f) => ({ ...f, dg: f.gf - f.gc }))
    .sort((x, y) => y.pts - x.pts || y.dg - x.dg || y.gf - x.gf || x.nombre.localeCompare(y.nombre, 'es'));
  return { tabla, descartados };
}

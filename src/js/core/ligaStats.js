// Estadísticas derivadas de los resultados de una edición (sin DOM → probables con `npm test`).
// Una «fecha» es { n, partidos: [{ l, v, gl, gv }] }; gl/gv en null = partido aún sin jugar.
const jugado = (m) => Number.isInteger(m?.gl) && Number.isInteger(m?.gv);
const redondear = (n) => Math.round(n * 10) / 10;

/** Conteos de una fecha: partidos, jugados, pendientes, empates, goles y promedio (null si aún no hay partidos jugados). */
export function resumenFecha(fecha) {
  const ps = fecha?.partidos ?? []; const js = ps.filter(jugado);
  const goles = js.reduce((a, m) => a + m.gl + m.gv, 0);
  return { total: ps.length, jugados: js.length, pendientes: ps.length - js.length, empates: js.filter((m) => m.gl === m.gv).length, goles, promedio: js.length ? redondear(goles / js.length) : null };
}
/** Suma de todas las fechas. */
export function resumenEdicion(fechas) {
  const r = (fechas ?? []).map(resumenFecha);
  const suma = (k) => r.reduce((a, x) => a + x[k], 0);
  const jugados = suma('jugados'); const goles = suma('goles');
  return { total: suma('total'), jugados, pendientes: suma('pendientes'), empates: suma('empates'), goles, promedio: jugados ? redondear(goles / jugados) : null };
}
/** 'jugada' (todo jugado) · 'en_juego' (algo jugado, algo no) · 'pendiente' (nada jugado). */
export function estadoFecha(fecha) {
  const { total, jugados } = resumenFecha(fecha);
  return total > 0 && jugados === total ? 'jugada' : jugados > 0 ? 'en_juego' : 'pendiente';
}
/** Fecha «actual»: la primera que no está del todo jugada; si todas lo están, la última. null si no hay fechas. */
export function fechaActual(fechas) {
  const l = fechas ?? []; if (!l.length) return null;
  return (l.find((f) => estadoFecha(f) !== 'jugada') ?? l[l.length - 1]).n;
}
/** Últimos `n` resultados de un jugador, de más antiguo a más reciente: 'G' ganó · 'E' empató · 'P' perdió. */
export function forma(fechas, nombre, n = 5) {
  const r = [];
  for (const f of fechas ?? []) for (const m of f.partidos ?? []) {
    if (!jugado(m) || (m.l !== nombre && m.v !== nombre)) continue;
    const propios = m.l === nombre ? m.gl : m.gv; const rival = m.l === nombre ? m.gv : m.gl;
    r.push(propios > rival ? 'G' : propios < rival ? 'P' : 'E');
  }
  return r.slice(-n);
}
/** Los `n` partidos con más diferencia de goles (a igual diferencia, más goles en total). Incluye el número de fecha. */
export function mayoresGoleadas(fechas, n = 3) {
  return (fechas ?? []).flatMap((f) => (f.partidos ?? []).filter(jugado).map((m) => ({ ...m, fecha: f.n, dif: Math.abs(m.gl - m.gv) })))
    .sort((a, b) => b.dif - a.dif || (b.gl + b.gv) - (a.gl + a.gv) || a.fecha - b.fecha).slice(0, n);
}
/** Ranking de la tabla por un campo ('gf', 'gc'…). `asc` = menor es mejor (defensa). Desempata por nombre. */
export function ranking(tabla, campo, asc = false) {
  return [...(tabla ?? [])].map((f) => ({ nombre: f.nombre, valor: f[campo] }))
    .sort((a, b) => (asc ? a.valor - b.valor : b.valor - a.valor) || a.nombre.localeCompare(b.nombre, 'es'));
}

/** Todos los partidos jugados de un jugador, de más antiguo a más reciente: { r: 'G'|'E'|'P', n: fecha, rival, gf, gc, local }. Sirve para «recorrer» la racha hacia atrás. */
export function historial(fechas, nombre) {
  const h = [];
  for (const f of fechas ?? []) for (const m of f.partidos ?? []) {
    if (!jugado(m) || (m.l !== nombre && m.v !== nombre)) continue;
    const local = m.l === nombre, gf = local ? m.gl : m.gv, gc = local ? m.gv : m.gl;
    h.push({ r: gf > gc ? 'G' : gf < gc ? 'P' : 'E', n: f.n, rival: local ? m.v : m.l, gf, gc, local });
  }
  return h;
}

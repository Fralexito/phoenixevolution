// Datos de las 3 portadas de muestra (ronda 389: /demo/juego/, /demo/tv/, /demo/app/). Lógica pura, sin DOM: tests/demoDatos.test.mjs.
// Todo sale de los datos reales que ya tiene la web (data/ligaResultados.js): tabla, última fecha jugada, próximos partidos y cifras.
import { tablaEdicion } from '../competicion/tabla.js';

const jugado = (m) => Number.isInteger(m?.gl) && Number.isInteger(m?.gv);

/** Resumen de una edición: tabla, última fecha con resultados, próxima fecha con partidos pendientes y cifras de la temporada. */
export function resumenEdicion(ed) {
  const fechas = Array.isArray(ed?.fechas) ? ed.fechas : [];
  const clubes = ed?.clubes ?? {};
  const tabla = tablaEdicion(ed).map((f, i) => ({ ...f, pos: i + 1, club: clubes[f.nombre] ?? '' }));
  const conJugados = fechas.filter((f) => (f.partidos ?? []).some(jugado));
  const ultima = conJugados.at(-1) ?? null;
  const conPend = (f) => (f.partidos ?? []).some((m) => m && m.gl === null && m.gv === null);
  // Próxima = la primera fecha DESPUÉS de la última jugada que tenga partidos pendientes (los atrasados de fechas viejas no cuentan aquí).
  const proxima = fechas.find((f) => conPend(f) && (!ultima || f.n > ultima.n)) ?? fechas.find(conPend) ?? null;
  const resultados = (ultima?.partidos ?? []).filter(jugado).map((m) => ({ ...m, cl: clubes[m.l] ?? '', cv: clubes[m.v] ?? '' }));
  const pendientes = fechas.flatMap((f) => (f.partidos ?? []).filter((m) => m && m.gl === null && m.gv === null).map((m) => ({ ...m, fecha: f.n, cl: clubes[m.l] ?? '', cv: clubes[m.v] ?? '' })));
  const todos = fechas.flatMap((f) => (f.partidos ?? []).filter(jugado).map((m) => ({ ...m, fecha: f.n })));
  const goles = todos.reduce((s, m) => s + m.gl + m.gv, 0);
  const goleada = [...todos].sort((a, b) => Math.abs(b.gl - b.gv) - Math.abs(a.gl - a.gv) || (b.gl + b.gv) - (a.gl + a.gv))[0] ?? null;
  const masGoles = [...tabla].sort((a, b) => b.gf - a.gf)[0] ?? null;
  const muro = [...tabla].sort((a, b) => a.gc / Math.max(1, a.pj) - b.gc / Math.max(1, b.pj))[0] ?? null;
  return {
    tabla, ultima: ultima ? { n: ultima.n, resultados } : null, proxima: proxima ? proxima.n : null, pendientes,
    partidosProxima: proxima ? pendientes.filter((m) => m.fecha === proxima.n) : [],
    cifras: { partidos: todos.length, goles, promedio: todos.length ? Math.round((goles / todos.length) * 10) / 10 : 0, fechas: conJugados.length, totalFechas: fechas.length },
    goleada: goleada ? { ...goleada, cl: clubes[goleada.l] ?? '', cv: clubes[goleada.v] ?? '' } : null,
    lider: tabla[0] ?? null, masGoles, muro,
  };
}

/** «FALLLL» → iniciales para el monograma: «Fralex» → «FR», «José Reyes» → «JR». */
export function iniciales(nombre) {
  const p = String(nombre ?? '').trim().split(/\s+/).filter(Boolean);
  if (!p.length) return '?';
  return (p.length > 1 ? p[0][0] + p[1][0] : p[0].slice(0, 2)).toUpperCase();
}

/** Forma de un jugador en sus últimos n partidos: ['V','E','D',…] del más viejo al más nuevo. */
export function forma(ed, nombre, n = 5) {
  const out = [];
  for (const f of ed?.fechas ?? []) for (const m of f.partidos ?? []) {
    if (!jugado(m) || (m.l !== nombre && m.v !== nombre)) continue;
    const a = m.l === nombre ? m.gl : m.gv; const b = m.l === nombre ? m.gv : m.gl;
    out.push(a > b ? 'V' : a < b ? 'D' : 'E');
  }
  return out.slice(-n);
}

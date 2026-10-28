// «LO DESTACADO DE LA LIGA» (página Liga, rediseño 27-oct-2026). Lógica pura, sin DOM: saca de la tabla y los partidos
// las cartas de datos (como las «estadísticas» de la Champions): mejor ataque, mejor defensa, en racha, invicto, mayor goleada y goles.
// Pruebas: tests/destacadosLiga.test.mjs
import { historial, mayoresGoleadas } from './ligaStats.js';

/** Racha actual de un historial (de más antiguo a más reciente): cuántos seguidos cumplen `ok` contando desde el final. */
export function rachaActual(h, ok) {
  let n = 0; for (let i = (h?.length ?? 0) - 1; i >= 0 && ok(h[i]); i--) n++; return n;
}

/**
 * @param {Array<{nombre:string,pj:number,gf:number,gc:number}>} tabla  tabla ya ordenada
 * @param {Array} fechas  fechas de la edición ({n, partidos:[{l,v,gl,gv}]})
 * @returns {Array<{id:string, titulo:string, nombre?:string, cifra:string|number, detalle:string}>}
 */
export function destacadosLiga(tabla = [], fechas = []) {
  const con = (tabla ?? []).filter((f) => f?.pj > 0);
  if (!con.length) return [];
  const out = [];
  const porNombre = (a, b) => a.nombre.localeCompare(b.nombre, 'es');
  const ataque = [...con].sort((a, b) => b.gf - a.gf || a.pj - b.pj || porNombre(a, b))[0];
  out.push({ id: 'ataque', titulo: 'Mejor ataque', nombre: ataque.nombre, cifra: ataque.gf, detalle: `goles en ${ataque.pj} PJ` });
  const prom = (f) => f.gc / f.pj;
  const defensa = [...con].sort((a, b) => prom(a) - prom(b) || b.pj - a.pj || porNombre(a, b))[0];
  out.push({ id: 'defensa', titulo: 'Mejor defensa', nombre: defensa.nombre, cifra: defensa.gc, detalle: `goles recibidos en ${defensa.pj} PJ` });
  const hs = con.map((f) => ({ nombre: f.nombre, h: historial(fechas, f.nombre) }));
  const mejor = (ok) => hs.map((x) => ({ nombre: x.nombre, n: rachaActual(x.h, ok) })).sort((a, b) => b.n - a.n || porNombre(a, b))[0];
  const racha = mejor((p) => p.r === 'G');
  if (racha?.n >= 2) out.push({ id: 'racha', titulo: 'En racha', nombre: racha.nombre, cifra: racha.n, detalle: 'victorias seguidas' });
  const invicto = mejor((p) => p.r !== 'P');
  if (invicto?.n >= 3) out.push({ id: 'invicto', titulo: 'Invicto', nombre: invicto.nombre, cifra: invicto.n, detalle: 'partidos sin perder' });
  const [g] = mayoresGoleadas(fechas, 1);
  if (g && g.dif >= 3) {
    const gana = g.gl > g.gv ? g.l : g.v, pierde = g.gl > g.gv ? g.v : g.l;
    out.push({ id: 'goleada', titulo: 'Mayor goleada', nombre: gana, cifra: `${Math.max(g.gl, g.gv)}-${Math.min(g.gl, g.gv)}`, detalle: `a ${pierde} · fecha ${g.fecha}` });
  }
  const jugados = (fechas ?? []).flatMap((f) => (f.partidos ?? []).filter((m) => Number.isInteger(m.gl) && Number.isInteger(m.gv)));
  const goles = jugados.reduce((s, m) => s + m.gl + m.gv, 0);
  if (jugados.length) out.push({ id: 'goles', titulo: 'Goles de la liga', cifra: goles, detalle: `${(goles / jugados.length).toFixed(1).replace('.', ',')} por partido · ${jugados.length} jugados` });
  return out;
}

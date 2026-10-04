// Formas de agrupar, ordenar y reconocer jugadores en la sección Jugadores (puro, sin DOM → probable).
// Idea: que la media no sea la única forma de aparecer. Todo sale de la ficha y de los resultados reales de la liga.
import { stat } from './dom.js';
import { norm } from './search.js';
import { EJES, ejesEstilo } from './estilo.js';
import { nombreEnEdicion, campana } from './perfil.js';

// ---- 4. Niveles con nombres positivos ----
export const NIVELES = [
  { id: 'elite', nombre: 'Élite', min: 88, icono: 'fa-crown' },
  { id: 'estrellas', nombre: 'Estrellas', min: 83, icono: 'fa-star' },
  { id: 'titulares', nombre: 'Titulares', min: 77, icono: 'fa-shield-halved' },
  { id: 'promesas', nombre: 'Promesas', min: 0, icono: 'fa-seedling' },
];
export const nivelDe = (ovr) => NIVELES.find((n) => stat(ovr, 0) >= n.min) ?? NIVELES.at(-1);
/** Grupos [{id,nombre,icono,jugadores}] de mayor a menor nivel; los vacíos no aparecen. Dentro de cada grupo, por media y luego A-Z. */
export function agruparPorNivel(lista) {
  return NIVELES.map((n) => ({ ...n, jugadores: lista.filter((p) => nivelDe(p.ovr).id === n.id).sort((a, b) => stat(b.ovr, 0) - stat(a.ovr, 0) || String(a.nombre).localeCompare(String(b.nombre), 'es')) })).filter((g) => g.jugadores.length);
}

// ---- 1. Grupos por estilo ----
export const ESTILOS = {
  ataque: { nombre: 'Los finalizadores', icono: 'fa-bullseye' }, creacion: { nombre: 'Los cerebros', icono: 'fa-lightbulb' }, tecnica: { nombre: 'Los regateadores', icono: 'fa-wand-magic-sparkles' },
  defensa: { nombre: 'Los muros', icono: 'fa-shield' }, presion: { nombre: 'Los presionadores', icono: 'fa-bolt' }, mentalidad: { nombre: 'Las mentes frías', icono: 'fa-snowflake' },
};
/** Eje más alto de la ficha (en empate, el primero de EJES). */
export const ejeDominante = (p) => ejesEstilo(p).reduce((m, e) => (e.valor > m.valor ? e : m)).id;
/** Grupos por eje dominante, en el orden de EJES; dentro, por el valor de ese eje. Sin grupos vacíos. */
export function agruparPorEstilo(lista) {
  return EJES.map((e) => ({ id: e.id, ...ESTILOS[e.id], jugadores: lista.filter((p) => ejeDominante(p) === e.id).sort((a, b) => valorEje(b, e.id) - valorEje(a, e.id) || String(a.nombre).localeCompare(String(b.nombre), 'es')) })).filter((g) => g.jugadores.length);
}
const valorEje = (p, id) => ejesEstilo(p).find((x) => x.id === id).valor;

// ---- Datos reales de liga por jugador ----
/** Mapa id → { nombre, fila, forma:['G'|'E'|'P'…últimos 5], formaPts, pj } para los jugadores que figuran en la edición. */
export function statsLiga(jugadores, edicion) {
  const m = new Map();
  for (const p of jugadores) {
    const nombre = nombreEnEdicion(p, edicion); if (!nombre) continue;
    const c = campana(edicion, nombre); if (!c?.fila || !c.jugados.length) continue;
    const ult = c.jugados.slice(-5);
    m.set(p.id, { nombre, fila: c.fila, forma: ult.map((x) => x.res), formaPts: ult.reduce((s, x) => s + (x.res === 'G' ? 3 : x.res === 'E' ? 1 : 0), 0), jugados: c.jugados, pj: c.fila.pj });
  }
  return m;
}

// ---- 2. Ordenar por otras cosas ----
export const CRITERIOS = [
  ['media', 'Media'], ['forma', 'Mejor forma'], ['goleador', 'Más goleador'], ['antiguedad', 'Antigüedad'], ['az', 'A–Z'], ['azar', 'Aleatorio'],
];
/** Mezcla determinista (misma semilla → mismo orden), para que «Aleatorio» no cambie al repintar. */
export function mezclar(lista, semilla = 1) {
  let s = (semilla >>> 0) || 1; const r = () => { s = (Math.imul(s, 1664525) + 1013904223) >>> 0; return s / 4294967296; };
  const a = [...lista]; for (let i = a.length - 1; i > 0; i -= 1) { const j = Math.floor(r() * (i + 1)); [a[i], a[j]] = [a[j], a[i]]; }
  return a;
}
const nom = (a, b) => String(a.nombre).localeCompare(String(b.nombre), 'es');
/** Ordena sin modificar la lista. `liga` = resultado de statsLiga. Los que no tienen el dato van al final, y entre iguales manda la media. */
export function ordenar(lista, criterio, { liga = new Map(), semilla = 1 } = {}) {
  const media = (a, b) => stat(b.ovr, 0) - stat(a.ovr, 0) || nom(a, b);
  const por = (valor) => [...lista].sort((a, b) => { const x = valor(a); const y = valor(b); if (x == null && y == null) return media(a, b); if (x == null) return 1; if (y == null) return -1; return y - x || media(a, b); });
  switch (criterio) {
    case 'forma': return por((p) => (liga.has(p.id) ? liga.get(p.id).formaPts * 100 + liga.get(p.id).fila.dg : null));
    case 'goleador': return por((p) => (liga.has(p.id) ? liga.get(p.id).fila.gf : null));
    case 'antiguedad': return [...lista].sort((a, b) => { const x = a.miembro_desde || '9999'; const y = b.miembro_desde || '9999'; return x < y ? -1 : x > y ? 1 : media(a, b); });
    case 'az': return [...lista].sort((a, b) => nom(a, b));
    case 'azar': return mezclar(lista, semilla);
    default: return [...lista].sort(media);
  }
}

// ---- 3. Reconocimientos (se recalculan solos con cada fecha jugada) ----
/**
 * @returns {{fecha:?{p,detalle,n}, forma:?{p,detalle}, revelacion:?{p,detalle}}}
 *  · Jugador de la fecha: la mayor victoria (por diferencia de goles; luego goles marcados) de la última fecha con resultados.
 *  · Más en forma: más puntos en sus últimos 5 partidos (mínimo 3 jugados).
 *  · Revelación: mejor % de puntos por encima de lo esperado por su media (mínimo 3 jugados).
 */
export function reconocimientos(jugadores, edicion) {
  const out = { fecha: null, forma: null, revelacion: null }; if (!edicion) return out;
  const liga = statsLiga(jugadores, edicion); if (!liga.size) return out;
  const porNombre = new Map([...liga].map(([id, v]) => [v.nombre, jugadores.find((p) => p.id === id)]));
  const jugada = (f) => f.partidos.some((m) => Number.isInteger(m.gl) && Number.isInteger(m.gv));
  const ult = [...edicion.fechas].reverse().find(jugada);
  if (ult) {
    let mejor = null;
    for (const m of ult.partidos) {
      if (!Number.isInteger(m.gl) || !Number.isInteger(m.gv) || m.gl === m.gv) continue;
      const [g, per, gf, gc] = m.gl > m.gv ? [m.l, m.v, m.gl, m.gv] : [m.v, m.l, m.gv, m.gl];
      const p = porNombre.get(g); if (!p) continue;
      if (!mejor || gf - gc > mejor.dif || (gf - gc === mejor.dif && gf > mejor.gf)) mejor = { p, dif: gf - gc, gf, gc, per };
    }
    if (mejor) out.fecha = { p: mejor.p, n: ult.n, detalle: `Ganó ${mejor.gf}–${mejor.gc} a ${mejor.per} en la fecha ${ult.n}` };
  }
  const aptos = [...liga].filter(([, v]) => v.pj >= 3);
  const f = [...aptos].sort((a, b) => b[1].formaPts - a[1].formaPts || b[1].fila.dg - a[1].fila.dg)[0];
  if (f) out.forma = { p: jugadores.find((p) => p.id === f[0]), detalle: `${f[1].formaPts} pts en sus últimos ${f[1].forma.length} partidos (${f[1].forma.join(' ')})` };
  const esperado = (p) => Math.min(100, Math.max(0, ((stat(p.ovr, 70) - 60) / 40) * 100));
  const r = aptos.map(([id, v]) => { const p = jugadores.find((x) => x.id === id); const real = Math.round((v.fila.pts / (v.fila.pj * 3)) * 100); return { p, real, extra: real - esperado(p) }; }).sort((a, b) => b.extra - a.extra || b.real - a.real)[0];
  if (r) out.revelacion = { p: r.p, detalle: `Consigue el ${r.real}% de los puntos posibles, por encima de lo que dice su media` };
  return out;
}

// ---- 5. Semana de votación ----
/** Lunes de la semana actual en hora de Lima (UTC−5, sin horario de verano), «AAAA-MM-DD». Debe coincidir con la regla de la BD. */
export function semanaActual(ahora = new Date()) {
  const l = new Date(ahora.getTime() - 5 * 3600 * 1000); const dia = (l.getUTCDay() + 6) % 7;     // lunes = 0
  const lunes = new Date(Date.UTC(l.getUTCFullYear(), l.getUTCMonth(), l.getUTCDate() - dia));
  return lunes.toISOString().slice(0, 10);
}
export { norm };

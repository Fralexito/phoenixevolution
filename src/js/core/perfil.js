// Lógica pura del perfil público de un jugador (sin DOM → probable): lo busca dentro de una edición de liga y resume su campaña.
import { norm } from './search.js';
import { calcularTabla } from './tabla.js';

const jugado = (m) => Number.isInteger(m.gl) && Number.isInteger(m.gv);

/** ¿El nombre usado en la liga («Fralex») corresponde a este jugador? Compara nombre y apodo sin tildes ni mayúsculas. */
export function coincide(jugador, nombreLiga) {
  const n = norm(nombreLiga ?? ''); if (!n) return false;
  return [jugador?.nombre, jugador?.apodo].some((x) => x && norm(x) === n);
}

/** Nombre con el que el jugador aparece en la edición (o null si no participa). */
export function nombreEnEdicion(jugador, edicion) {
  const nombres = new Set((edicion?.fechas ?? []).flatMap((f) => f.partidos.flatMap((m) => [m.l, m.v])));
  return [...nombres].find((n) => coincide(jugador, n)) ?? null;
}

/**
 * Campaña de `nombre` en `edicion`.
 * @returns {{puesto:number, fila:object, club:string, jugados:object[], proximos:object[], total:number}|null}
 *  jugados: [{n, rival, local, gf, gc, res:'G'|'E'|'P'}] en orden · proximos: [{n, rival, local}] · puesto 1-N en la tabla actual.
 */
export function campana(edicion, nombre) {
  if (!edicion || !nombre) return null;
  const { tabla } = calcularTabla(edicion.fechas.flatMap((f) => f.partidos));
  const i = tabla.findIndex((f) => f.nombre === nombre);
  const jugados = []; const proximos = [];
  for (const f of edicion.fechas) for (const m of f.partidos) {
    if (m.l !== nombre && m.v !== nombre) continue;
    const local = m.l === nombre; const rival = local ? m.v : m.l;
    if (!jugado(m)) { proximos.push({ n: f.n, rival, local }); continue; }
    const gf = local ? m.gl : m.gv; const gc = local ? m.gv : m.gl;
    jugados.push({ n: f.n, rival, local, gf, gc, res: gf > gc ? 'G' : gf < gc ? 'P' : 'E' });
  }
  if (i < 0 && !jugados.length && !proximos.length) return null;
  return { puesto: i + 1, fila: tabla[i] ?? null, club: edicion.clubes?.[nombre] ?? '', jugados, proximos, total: tabla.length };
}

/** Rendimiento contra cada rival ya enfrentado (para ver «a quién le gana»). Ordenado por rival. */
export function contraRivales(jugados) {
  const m = new Map();
  for (const p of jugados) { const r = m.get(p.rival) ?? { rival: p.rival, g: 0, e: 0, p: 0, gf: 0, gc: 0 }; r[p.res.toLowerCase()] += 1; r.gf += p.gf; r.gc += p.gc; m.set(p.rival, r); }
  return [...m.values()].sort((a, b) => a.rival.localeCompare(b.rival, 'es'));
}

// «LO MÁS IMPORTANTE AHORA» (portada viva, 27-oct-2026). Lógica pura, sin DOM: elige y ordena las escenas del escenario
// según lo que importa en este momento (idea de Fralex: «hay tantas cosas que necesitan relevancia» → cada una tiene su turno).
// Prioridad (más alto = antes): en vivo 100 (lo pone el navegador si hay salas en juego) · partido grande de la fecha 90 ·
// noticia oficial 80 · líder de la tabla 75 · otro partido 70 · último resultado 60 · campeón vigente 40. Pruebas: tests/relevancia.test.mjs
export const PRIORIDAD = { vivo: 100, partido: 90, noticia: 80, lider: 75, partido2: 70, resultado: 60, campeon: 40 };

/**
 * @param {{proximos?:Array, resultados?:Array, tabla?:Array, noticias?:Array, campeones?:Array}} d
 *   proximos/resultados: filas de tira.js · tabla: [{nombre, pts, pj, …}] ordenada · noticias: data/noticias.js · campeones: [{copa, dt, club, oro}]
 * @param {number} [max]
 * @returns {Array<{tipo:string, prioridad:number, dato:any}>}
 */
export function escenasPortada(d = {}, max = 6) {
  const out = [];
  const pos = new Map((d.tabla ?? []).map((t, i) => [t.nombre, i + 1]));
  const peso = (p) => (pos.get(p.l) ?? 99) + (pos.get(p.v) ?? 99);
  const prox = [...(d.proximos ?? [])].filter((p) => p?.l && p?.v);
  // Solo la fecha más cercana con partidos pendientes cuenta como «la fecha»
  const fechaAct = prox.length ? Math.min(...prox.map((p) => p.fecha)) : null;
  const deLaFecha = prox.filter((p) => p.fecha === fechaAct).sort((a, b) => peso(a) - peso(b));
  if (deLaFecha[0]) out.push({ tipo: 'partido', prioridad: PRIORIDAD.partido, dato: deLaFecha[0] });
  const oficial = (d.noticias ?? []).find((n) => String(n?.categoria).toUpperCase() === 'OFICIAL');
  if (oficial) out.push({ tipo: 'noticia', prioridad: PRIORIDAD.noticia, dato: oficial });
  const t = d.tabla ?? [];
  if (t[0]) out.push({ tipo: 'lider', prioridad: PRIORIDAD.lider, dato: { ...t[0], ventaja: t[1] ? t[0].pts - t[1].pts : null, segundo: t[1]?.nombre ?? null } });
  const otro = deLaFecha[1] ?? prox.filter((p) => p !== deLaFecha[0]).sort((a, b) => peso(a) - peso(b))[0];
  if (otro) out.push({ tipo: 'partido', prioridad: PRIORIDAD.partido2, dato: otro });
  const res = (d.resultados ?? []).find((r) => Number.isInteger(r?.gl) && Number.isInteger(r?.gv));
  if (res) out.push({ tipo: 'resultado', prioridad: PRIORIDAD.resultado, dato: res });
  const campeon = (d.campeones ?? []).find((c) => c?.oro) ?? (d.campeones ?? [])[0];
  if (campeon) out.push({ tipo: 'campeon', prioridad: PRIORIDAD.campeon, dato: campeon });
  return out.sort((a, b) => b.prioridad - a.prioridad).slice(0, Math.max(1, max));
}

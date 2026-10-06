// «Pulso de la liga» — lógica PURA (sin DOM → probable con `npm test`): estado en vivo, ELO, clubes más usados y búsqueda dentro de la liga.
// Entrada común: `fechas` = [{ n, partidos: [{ l, v, gl, gv }] }]; un partido SIN jugar lleva gl y gv en null (igual que data/ligaResultados.js).

const jugado = (m) => Number.isInteger(m?.gl) && Number.isInteger(m?.gv);
const norm = (s) => String(s ?? '').normalize('NFD').replace(/[̀-ͯ]/g, '').toLowerCase().trim();

/**
 * Estado de la liga para la franja de la portada.
 *  · `estado`: 'sin_datos' (no hay fechas) · 'por_empezar' (nada jugado) · 'en_juego' (algo jugado y algo pendiente) · 'terminada' (todo jugado)
 *  · `actual`: la fecha «en juego» = la primera que aún tiene partidos pendientes (si todo está jugado, la última)
 *  · `pct`: avance de la temporada (partidos jugados / total, entero 0–100)
 * @returns {{estado:string, actual:number|null, jugadosActual:number, totalActual:number, jugados:number, total:number, pct:number, restantes:number}}
 */
export function estadoLiga(fechas) {
  const f = (Array.isArray(fechas) ? fechas : []).filter((x) => Array.isArray(x?.partidos));
  const todos = f.flatMap((x) => x.partidos);
  const jugados = todos.filter(jugado).length, total = todos.length;
  if (!total) return { estado: 'sin_datos', actual: null, jugadosActual: 0, totalActual: 0, jugados: 0, total: 0, pct: 0, restantes: 0 };
  const act = f.find((x) => x.partidos.some((m) => !jugado(m))) ?? f[f.length - 1];
  const jugadosActual = act.partidos.filter(jugado).length;
  return {
    estado: jugados === total ? 'terminada' : jugados === 0 ? 'por_empezar' : 'en_juego',
    actual: act.n, jugadosActual, totalActual: act.partidos.length,
    jugados, total, pct: Math.round((jugados / total) * 100), restantes: total - jugados,
  };
}

/** Sello de un partido: 'oficial' si tiene marcador (los resultados se copian de CopaFácil), 'pendiente' si aún no se juega. */
export const selloPartido = (m) => (jugado(m) ? 'oficial' : 'pendiente');

/** Factor por diferencia de goles (el del Elo de selecciones): 1 gol → 1, 2 → 1.5, 3 → 1.75, 4+ → 1.75 + (d−3)/8. */
export const factorGoles = (d) => { const a = Math.abs(d); return a <= 1 ? 1 : a === 2 ? 1.5 : 1.75 + (a - 3) / 8; };

/**
 * Ranking ELO. Todos parten de `base`; fecha a fecha (en orden de `n`) cada partido jugado mueve a los dos rivales según lo esperado:
 * ganar a alguien más fuerte da más puntos que ganar a alguien más débil, y las goleadas pesan más.
 * Dentro de una misma fecha, los cambios se calculan con los puntos que cada uno tenía AL EMPEZAR la fecha (así el orden de los partidos no altera nada).
 * `delta` = lo que subió o bajó en su última fecha jugada. Orden: más ELO primero (empate → más partidos → nombre).
 * @param {object[]} fechas  @param {string[]} jugadores nombres a incluir aunque no hayan jugado
 * @returns {{nombre:string, elo:number, pj:number, delta:number}[]}
 */
export function calcularElo(fechas, jugadores = [], { base = 1000, k = 32 } = {}) {
  const elo = new Map(), pj = new Map(), delta = new Map();
  const valor = (n) => elo.get(n) ?? base;
  for (const n of jugadores ?? []) { elo.set(n, valor(n)); pj.set(n, 0); delta.set(n, 0); }
  const ordenadas = [...(Array.isArray(fechas) ? fechas : [])].sort((a, b) => a.n - b.n);
  for (const f of ordenadas) {
    const cambios = new Map();
    for (const m of f.partidos ?? []) {
      if (!jugado(m) || !m.l || !m.v || m.l === m.v) continue;
      const ra = valor(m.l), rb = valor(m.v);
      const esperadoA = 1 / (1 + 10 ** ((rb - ra) / 400));
      const real = m.gl > m.gv ? 1 : m.gl < m.gv ? 0 : 0.5;
      const d = k * factorGoles(m.gl - m.gv) * (real - esperadoA);
      cambios.set(m.l, (cambios.get(m.l) ?? 0) + d); cambios.set(m.v, (cambios.get(m.v) ?? 0) - d);
      pj.set(m.l, (pj.get(m.l) ?? 0) + 1); pj.set(m.v, (pj.get(m.v) ?? 0) + 1);
    }
    for (const [n, d] of cambios) { elo.set(n, valor(n) + d); delta.set(n, d); }
  }
  return [...elo.keys()].map((nombre) => ({ nombre, elo: Math.round(elo.get(nombre)), pj: pj.get(nombre) ?? 0, delta: Math.round(delta.get(nombre) ?? 0) }))
    .sort((a, b) => b.elo - a.elo || b.pj - a.pj || a.nombre.localeCompare(b.nombre, 'es'));
}

/**
 * Clubes más usados: cuenta los partidos JUGADOS por club (`clubes` = { jugador: club }). Si dos jugadores usan el mismo club se suman y se listan en `dts`.
 * Orden: más partidos → más victorias → nombre.
 * @returns {{club:string, pj:number, g:number, e:number, p:number, gf:number, gc:number, dts:string[]}[]}
 */
export function clubesMasUsados(fechas, clubes = {}) {
  const por = new Map();
  const fila = (club) => { if (!por.has(club)) por.set(club, { club, pj: 0, g: 0, e: 0, p: 0, gf: 0, gc: 0, dts: [] }); return por.get(club); };
  const lado = (nombre, a, b) => {
    const club = clubes?.[nombre]; if (!club) return;
    const x = fila(club); x.pj += 1; x.gf += a; x.gc += b; if (a > b) x.g += 1; else if (a < b) x.p += 1; else x.e += 1;
    if (!x.dts.includes(nombre)) x.dts.push(nombre);
  };
  for (const f of fechas ?? []) for (const m of f.partidos ?? []) { if (!jugado(m)) continue; lado(m.l, m.gl, m.gv); lado(m.v, m.gv, m.gl); }
  return [...por.values()].sort((a, b) => b.pj - a.pj || b.g - a.g || a.club.localeCompare(b.club, 'es'));
}

/**
 * Índice de búsqueda DENTRO de la liga: cada liga, sus fechas y los DT/clubes de su edición en curso. Todos llevan a la página «Liga» de esa competición.
 * @param {{id:string, titulo:string[], juego?:string}[]} ligas  @param {Record<string, object[]>} ediciones  (data/ligaResultados.js → EDICIONES)
 * @returns {{tipo:'liga'|'fecha'|'dt'|'club', label:string, info:string, path:string, icon:string, _t:string, _l:string}[]}
 */
export function indiceLiga(ligas, ediciones) {
  const out = [];
  const meter = (e) => out.push({ ...e, _l: norm(e.label), _t: norm(`${e.label} ${e.info}`) });
  for (const l of ligas ?? []) {
    const titulo = (l.titulo ?? []).join(' ').trim(); const path = `liga/#liga-${l.id}`;
    meter({ tipo: 'liga', label: titulo, info: l.juego ?? 'Liga', path, icon: 'fa-crown' });
    const ed = (ediciones?.[l.id] ?? []).find((e) => e.estado === 'en_curso') ?? (ediciones?.[l.id] ?? [])[0]; if (!ed) continue;
    for (const f of ed.fechas ?? []) {
      const js = (f.partidos ?? []).filter(jugado).length;
      meter({ tipo: 'fecha', label: `Fecha ${f.n}`, info: `${titulo} · ${js ? `${js} de ${(f.partidos ?? []).length} jugados` : 'por jugar'}`, path, icon: 'fa-calendar-day' });
    }
    const nombres = new Set([...(ed.jugadores ?? []), ...Object.keys(ed.clubes ?? {})]);
    for (const n of nombres) {
      meter({ tipo: 'dt', label: n, info: `${ed.clubes?.[n] ? `${ed.clubes[n]} · ` : ''}${titulo}`, path, icon: 'fa-user' });
    }
  }
  return out;
}

/** Entradas del índice que contienen TODAS las palabras de `q` (sin tildes ni mayúsculas); mejor coincidencia primero. */
export function buscarEnLiga(q, indice, max = 6) {
  const ps = norm(q).split(/\s+/).filter(Boolean); if (!ps.length) return [];
  return (indice ?? []).map((e) => {
    if (!ps.every((w) => e._t.includes(w))) return null;
    let pts = 0; for (const w of ps) pts += e._l === w ? 10 : e._l.startsWith(w) ? 7 : e._l.includes(w) ? 5 : 2;
    return { e, pts };
  }).filter(Boolean).sort((a, b) => b.pts - a.pts || a.e.label.localeCompare(b.e.label, 'es')).slice(0, max).map((x) => x.e);
}

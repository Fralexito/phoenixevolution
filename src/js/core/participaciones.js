// PARTICIPACIONES: en qué liga, torneo y temporada jugó cada jugador y con qué club (puro, sin DOM → probable con `npm test`).
// Una «participación» = un jugador en una edición. Tres ejes para filtrar: LIGA (Galaxy League, Segunda División…), TORNEO (Apertura, Clausura, Copa…)
// y TEMPORADA (2026…). Dos fuentes: (1) la tabla `participaciones` (ediciones pasadas, las carga el admin) y (2) las ediciones de data/ligaResultados.js
// (el jugador se enlaza por nombre/apodo, como en el perfil). Un mismo club puede repetirse en muchas participaciones: por eso cada coincidencia
// lleva su etiqueta «club · liga · torneo · temporada».
import { norm } from './search.js';
import { nombreEnEdicion } from './perfil.js';

const limpio = (v) => String(v ?? '').replace(/[<>]/g, '').trim();
const ANIO = /\b(?:19|20)\d{2}\b/;
const anioDe = (s) => ANIO.exec(String(s ?? ''))?.[0] ?? '';
/** «GALAXY LEAGUE» → «Galaxy League» (los nombres de liga se guardan en mayúsculas en data/ligas.js). */
export const tituloCaso = (s) => String(s ?? '').toLowerCase().replace(/(^|\s)(\p{L})/gu, (_, a, b) => a + b.toUpperCase());

/** Fila de la base (o de una edición) → participación limpia. Si faltan temporada/torneo, se deducen de «Apertura 2025» o del periodo. */
export function normalizarParticipacion(r) {
  const edicion = limpio(r?.edicion);
  const temporada = limpio(r?.temporada) || anioDe(edicion) || anioDe(r?.periodo);
  const torneo = limpio(r?.torneo) || edicion.replace(new RegExp(ANIO.source, 'g'), '').replace(/^[\s\-–/·]+|[\s\-–/·]+$/g, '').trim();
  return {
    jugadorId: r?.jugador_id ?? r?.jugadorId ?? null, liga: limpio(r?.liga), torneo, temporada, edicion,
    club: limpio(r?.club).toUpperCase(), titulo: limpio(r?.titulo), puesto: Number.isInteger(r?.puesto) ? r.puesto : null, periodo: r?.periodo ?? null,
  };
}
const clave = (x) => `${norm(x.liga)}|${norm(x.edicion)}`;

/**
 * Índice jugadorId → participaciones (más reciente primero). Mezcla las filas de la base con las ediciones de la web; si la misma liga+edición está
 * en ambas, gana la de la base (el admin pudo corregir el club).
 * @param {object[]} jugadores @param {object[]} filasDB @param {{id:string,titulo:string[]}[]} ligas @param {Record<string,object[]>} ediciones
 * @returns {Map<string, ReturnType<typeof normalizarParticipacion>[]>}
 */
export function construirIndice(jugadores, filasDB = [], ligas = [], ediciones = {}) {
  const idx = new Map((jugadores ?? []).map((j) => [j.id, []]));
  for (const f of filasDB ?? []) { const p = normalizarParticipacion(f); if (idx.has(p.jugadorId) && p.liga) idx.get(p.jugadorId).push(p); }
  for (const l of ligas ?? []) for (const ed of ediciones?.[l.id] ?? []) for (const j of jugadores ?? []) {
    const nombre = nombreEnEdicion(j, ed); if (!nombre) continue;
    const p = normalizarParticipacion({ jugador_id: j.id, liga: tituloCaso((l.titulo ?? []).join(' ')), edicion: ed.nombre, temporada: ed.temporada, torneo: ed.torneo, club: ed.clubes?.[nombre] ?? '', periodo: ed.periodo });
    if (!idx.get(j.id).some((x) => clave(x) === clave(p))) idx.get(j.id).push(p);
  }
  for (const [id, l] of idx) idx.set(id, l.sort((a, b) => b.temporada.localeCompare(a.temporada) || String(b.periodo ?? '').localeCompare(String(a.periodo ?? '')) || a.torneo.localeCompare(b.torneo, 'es')));
  return idx;
}

/** Opciones de los tres filtros (y los clubes de toda la historia) a partir del índice. Temporadas: la más reciente primero. */
export function opcionesFiltro(indice) {
  const todas = [...indice.values()].flat(); const u = (f) => [...new Set(todas.map(f).filter(Boolean))];
  return {
    ligas: u((p) => p.liga).sort((a, b) => a.localeCompare(b, 'es')), torneos: u((p) => p.torneo).sort((a, b) => a.localeCompare(b, 'es')),
    temporadas: u((p) => p.temporada).sort((a, b) => b.localeCompare(a)), clubes: u((p) => p.club).sort((a, b) => a.localeCompare(b, 'es')),
  };
}

const igual = (a, b) => norm(a) === norm(b);
/** Participaciones que cumplen TODOS los criterios no vacíos (la misma participación debe cumplirlos a la vez). */
export const coincidencias = (partes, { liga = '', torneo = '', temporada = '', club = '' } = {}) =>
  (partes ?? []).filter((p) => (!liga || igual(p.liga, liga)) && (!torneo || igual(p.torneo, torneo)) && (!temporada || p.temporada === temporada) && (!club || igual(p.club, club)));

/**
 * Filtra jugadores. Devuelve [{ p, hits }]: `hits` = participaciones que explican por qué aparece (para mostrar su etiqueta); [] si aparece por su club/nombre actual.
 *  · Con liga/torneo/temporada elegidos: solo quien tenga una participación que cumpla todo (y el club, si se eligió, es el de ESA participación).
 *  · Solo con club (o texto): coincide si es su club actual o lo eligió alguna vez en cualquier liga/torneo/temporada.
 */
export function filtrarJugadores(jugadores, indice, { liga = '', torneo = '', temporada = '', club = '', term = '' } = {}) {
  const hayPart = !!(liga || torneo || temporada); const t = norm(term); const out = [];
  for (const p of jugadores ?? []) {
    const partes = indice.get(p.id) ?? []; let hits = [];
    if (hayPart) { hits = coincidencias(partes, { liga, torneo, temporada, club }); if (!hits.length) continue; }
    else if (club) { hits = coincidencias(partes, { club }); if (!hits.length && !igual(p.club, club)) continue; }
    if (t) {
      const porNombre = norm(p.nombre).includes(t) || norm(p.apodo).includes(t);
      if (!porNombre) { const porClub = (hayPart ? hits : partes).filter((x) => norm(x.club).includes(t)); if (!porClub.length && !norm(p.club).includes(t)) continue; if (!hayPart && !club) hits = porClub; else if (!porClub.length) continue; }
    }
    out.push({ p, hits });
  }
  return out;
}

/** Etiqueta corta de una participación: «Galaxy League · Apertura · 2026». */
export const etiquetaParticipacion = (x) => [x.liga, x.torneo, x.temporada].filter(Boolean).join(' · ');

/**
 * División actual de un jugador: la de su participación más reciente en una liga que sea división.
 * @param {ReturnType<typeof normalizarParticipacion>[]} partes (ya ordenadas, la más reciente primero)
 * @param {{nivel:number, liga:string}[]} divisiones  p. ej. [{nivel:1, liga:'Galaxy League'}, {nivel:2, liga:'Segunda División'}]
 * @returns {number|null} 1, 2… o null si no juega en ninguna división
 */
export function divisionActual(partes, divisiones) {
  for (const x of partes ?? []) { const d = (divisiones ?? []).find((v) => igual(v.liga, x.liga)); if (d) return d.nivel; }
  return null;
}

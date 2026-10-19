// Búsqueda de clubes del catálogo PES (src/data/clubesPes.js) para el formulario de fichajes. Función pura: sin DOM.
import { CLUBES_PES } from '../../../data/clubesPes.js';

const norm = (s) => String(s ?? '').normalize('NFD').replace(/[̀-ͯ]/g, '').toLowerCase().replace(/[^a-z0-9 ]+/g, ' ').replace(/\s+/g, ' ').trim();

/** Clubes que encajan con el texto (nombre o alias, sin tildes ni mayúsculas). Los que empiezan por el texto van primero. */
export function buscarClubes(texto, { lista = CLUBES_PES, max = 8 } = {}) {
  const q = norm(texto);
  if (q.length < 2) return [];
  const pts = [];
  for (const c of lista) {
    const claves = [c.nombre, ...(c.alias ?? [])].map(norm);
    let p = 0;
    for (const k of claves) {
      if (k === q) p = Math.max(p, 4);
      else if (k.startsWith(q)) p = Math.max(p, 3);
      else if (k.split(' ').some((w) => w.startsWith(q))) p = Math.max(p, 2);
      else if (k.includes(q)) p = Math.max(p, 1);
    }
    if (p) pts.push([p, c]);
  }
  return pts.sort((a, b) => b[0] - a[0] || a[1].nombre.localeCompare(b[1].nombre, 'es')).slice(0, max).map(([, c]) => c);
}

/** Club cuyo nombre exacto (o alias) coincide con el texto; sirve para rellenar el id de PES al escribir a mano. */
export function clubExacto(texto, lista = CLUBES_PES) {
  const q = norm(texto);
  return q ? lista.find((c) => norm(c.nombre) === q) ?? null : null;
}

const PAIS = { 'Premier League': 'Inglaterra', LaLiga: 'España', 'Serie A': 'Italia', Bundesliga: 'Alemania', 'Ligue 1': 'Francia' };
/** País de la liga del club (para la línea de información breve). */
export const paisDe = (club) => PAIS[club?.liga] ?? '';
/** Escudo del club tal como lo trae el parche (public/escudos-pes/<id PES>.webp, 128 px, versión para fondo oscuro). */
export const escudoUrl = (club) => (club?.id ? `${import.meta.env?.BASE_URL ?? '/'}escudos-pes/${club.id}.webp` : null);
/** <img> del escudo, o nada si el club no está en el catálogo. */
export const escudoImg = (club, px = 28) => (club ? `<img src="${escudoUrl(club)}" alt="" width="${px}" height="${px}" loading="lazy" decoding="async" class="cfx-esc" style="width:${px}px;height:${px}px">` : '');

// ── Sala de fichajes (features/cambios/salaFichajes.js): funciones puras, sin DOM ni red ──
/** Línea del campo a la que pertenece una posición registrada (para agrupar la plantilla). */
export const LINEAS = [
  { id: 'porteros', nombre: 'Porteros', posiciones: ['PT'] },
  { id: 'defensas', nombre: 'Defensas', posiciones: ['DFC', 'LI', 'LD'] },
  { id: 'medios', nombre: 'Mediocampistas', posiciones: ['MCD', 'MC', 'MI', 'MD', 'MO'] },
  { id: 'delanteros', nombre: 'Delanteros', posiciones: ['EI', 'ED', 'SD', 'DC'] },
];
export const lineaDe = (pos) => LINEAS.find((l) => l.posiciones.includes(pos))?.id ?? 'otros';
/** Plantilla [[pid, nombre, pos], …] → [{ linea, nombre, jugadores: [{pid, nombre, pos}] }] en el orden del campo. */
export function agruparPlantilla(plantilla = []) {
  const jugadores = plantilla.map(([pid, nombre, pos]) => ({ pid, nombre, pos }));
  const grupos = LINEAS.map((l) => ({ linea: l.id, nombre: l.nombre, jugadores: jugadores.filter((j) => l.posiciones.includes(j.pos)) }));
  const otros = jugadores.filter((j) => lineaDe(j.pos) === 'otros');
  if (otros.length) grupos.push({ linea: 'otros', nombre: 'Otros', jugadores: otros });
  return grupos.filter((g) => g.jugadores.length);
}
/** Jugadores de TODAS las plantillas cuyo nombre encaja con el texto (sin tildes). Los que empiezan por el texto o por su apellido van primero. */
export function buscarJugadoresPes(texto, plantillas, { max = 24 } = {}) {
  const q = norm(texto);
  if (q.length < 2) return [];
  const hits = [];
  for (const [clubId, lista] of Object.entries(plantillas ?? {})) {
    for (const [pid, nombre, pos] of lista) {
      const n = norm(nombre);
      const i = n.indexOf(q);
      if (i < 0) continue;
      const palabra = i === 0 || n[i - 1] === ' ';
      hits.push({ pid, nombre, pos, clubId: Number(clubId), puntos: (n === q ? 3 : 0) + (i === 0 ? 2 : palabra ? 1 : 0) });
    }
  }
  return hits.sort((a, b) => b.puntos - a.puntos || a.nombre.localeCompare(b.nombre, 'es')).slice(0, max);
}
/** Une cada club de la Liga Máster de la web con su club del catálogo por las palabras del nombre («Inter» ↔ «FC Inter de Milán»). Devuelve Map<id del catálogo, club LM>. */
export function emparejarClubesLm(clubesLm, lista = CLUBES_PES) {
  const palabras = (s) => norm(s).split(' ').filter(Boolean);
  const r = new Map();
  for (const lm of clubesLm ?? []) {
    const w = palabras(lm.nombre); if (!w.length) continue;
    const c = lista.find((x) => !r.has(x.id) && w.every((p) => palabras(x.nombre).includes(p)));
    if (c) r.set(c.id, lm);
  }
  return r;
}

// Los «grandes» de cada liga primero (Fralex, 19-oct-2026: «que los clubes más tops de cada liga aparezcan primero»). Orden por
// peso deportivo reciente (títulos y Champions); el resto va detrás en orden alfabético. Ids del catálogo src/data/clubesPes.js.
const GRANDES = [
  173, 101, 103, 102, 100, 179, 106, 107,             // Premier: City, Arsenal, Liverpool, Chelsea, United, Tottenham, Newcastle, Villa
  109, 108, 172, 258, 267, 196, 194, 265, 110,        // LaLiga: Madrid, Barça, Atleti, Athletic, Villarreal, Real Sociedad, Betis, Sevilla, Valencia
  119, 327, 120, 121, 234, 125, 122, 124, 186,        // Serie A: Inter, Napoli, Juve, Milan, Atalanta, Roma, Lazio, Fiorentina, Bologna
  127, 126, 128, 226,                                 // Bundesliga: Bayern, Dortmund, Leverkusen, Frankfurt
  114, 113, 112, 213, 181, 217, 182, 218,             // Ligue 1: PSG, Marsella, Mónaco, Lille, Lyon, Niza, Lens, Rennes
];
const PUESTO = new Map(GRANDES.map((id, i) => [id, i]));
/** Copia de la lista con los grandes primero (en su orden) y el resto alfabético. */
export const ordenarPorPrestigio = (lista = []) => [...lista].sort((a, b) =>
  (PUESTO.get(a.id) ?? 1e9) - (PUESTO.get(b.id) ?? 1e9) || String(a.nombre).localeCompare(String(b.nombre), 'es'));

// Logos ACTUALES de las ligas, guardados en public/ligas/ (revisado 19-oct-2026): LaLiga (doble L, 2023), Serie A (la «A» azul, 2019; el patrocinador
// cambia, el emblema no) y Ligue 1 (2024) de Wikimedia Commons (dominio público); Premier (león, 2016) y Bundesliga (2017) de crests.football-data.org.
// Si una liga cambia de logo, sustituye su PNG con el mismo nombre. Liga Máster = logo de Phoenix.
const LOGO_LIGA = { 'Premier League': 'ligas/PL.png', LaLiga: 'ligas/PD.png', 'Serie A': 'ligas/SA.png', Bundesliga: 'ligas/BL1.png', 'Ligue 1': 'ligas/FL1.png', 'Liga Máster': 'logo.webp' };
export const logoLigaUrl = (liga) => (LOGO_LIGA[liga] ? `${import.meta.env?.BASE_URL ?? '/'}${LOGO_LIGA[liga]}` : null);

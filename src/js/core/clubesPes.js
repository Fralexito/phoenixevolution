// Búsqueda de clubes del catálogo PES (src/data/clubesPes.js) para el formulario de fichajes. Función pura: sin DOM.
import { CLUBES_PES } from '../../data/clubesPes.js';

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

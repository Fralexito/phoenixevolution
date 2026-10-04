// Búsqueda de jugadores por nombre (sin DOM → probable). Ignora mayúsculas y acentos: «titan» encuentra «Titán».
export const norm = (s) => String(s ?? '').normalize('NFD').replace(/[̀-ͯ]/g, '').toLowerCase().trim();

/** Filtra `players` cuyo nombre contenga `term` (vacío = todos), sin los ids en `exclude`. Los que EMPIEZAN con el texto salen primero. */
export function filterPlayers(players, term, exclude = [], limit = 50) {
  const t = norm(term); const out = new Set(exclude);
  const ok = players.filter((p) => !out.has(p.id) && (!t || norm(p.nombre).includes(t)));
  if (t) ok.sort((a, b) => Number(norm(b.nombre).startsWith(t)) - Number(norm(a.nombre).startsWith(t)));
  return ok.slice(0, limit);
}

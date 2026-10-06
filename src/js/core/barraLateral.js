// Barra lateral izquierda (experimento FX.barraLateral) — lógica PURA, sin DOM → probable con `npm test`.

/** Amigos ordenados: primero los que están en línea; dentro de cada grupo, por nombre (sin distinguir tildes/mayúsculas). No modifica la lista original. */
export function ordenarAmigos(amigos, enLinea = new Set()) {
  const nom = (a) => String(a?.nombre ?? '');
  return (Array.isArray(amigos) ? amigos : []).filter((a) => a?.id).slice()
    .sort((a, b) => (enLinea.has(b.id) ? 1 : 0) - (enLinea.has(a.id) ? 1 : 0) || nom(a).localeCompare(nom(b), 'es', { sensitivity: 'base' }));
}

/** Recorta la lista para la barra: { visibles (hasta `max`), ocultos (cuántos quedan fuera), enLinea (cuántos amigos en línea hay en total) }. */
export function resumenAmigos(amigos, enLinea = new Set(), max = 8) {
  const l = ordenarAmigos(amigos, enLinea); const n = Math.max(0, Math.trunc(max) || 0);
  return { visibles: l.slice(0, n), ocultos: Math.max(0, l.length - n), enLinea: l.filter((a) => enLinea.has(a.id)).length };
}

/** Une los ids de amistad con los perfiles leídos de la base: conserva solo los ids que tienen perfil y descarta datos incompletos. */
export function unirPerfiles(ids, perfiles) {
  const por = new Map((Array.isArray(perfiles) ? perfiles : []).filter((p) => p?.id).map((p) => [p.id, p]));
  return (Array.isArray(ids) ? ids : []).map((id) => por.get(id)).filter(Boolean)
    .map((p) => ({ id: p.id, nombre: String(p.nombre_display || p.username || 'Jugador').replace(/[<>]/g, '').slice(0, 40), username: String(p.username ?? '').replace(/[^\w.-]/g, '').slice(0, 40), avatar: p.avatar_url ?? '' }));
}

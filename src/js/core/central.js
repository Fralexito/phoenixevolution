// Lógica pura de la página Central (sin DOM → probable con `npm test`).

/** Cifra para mostrar en las tarjetas del pulso: número entero ≥ 0 → texto; cualquier otra cosa (error, null) → «—». */
export const cifra = (n) => (Number.isFinite(n) && n >= 0 ? String(Math.trunc(n)) : '—');

/** Separa los partidos en próximos (llevan una nota de hora, p. ej. «HOY 22:00», o aún no tienen marcador) y resultados (con marcador). */
export function partirPartidos(partidos) {
  const lista = Array.isArray(partidos) ? partidos : [];
  const jugado = (m) => !m.nota && m.gl !== '-' && m.gv !== '-' && m.gl != null && m.gv != null;
  return { proximos: lista.filter((m) => !jugado(m)), resultados: lista.filter(jugado) };
}

/**
 * Orden de podio: recibe los jugadores ya ordenados de mejor a peor y devuelve [{ jugador, puesto }]
 * con el 2.º a la izquierda, el 1.º en el centro y el 3.º a la derecha. Con menos de 3 jugadores no deja huecos.
 */
export function ordenPodio(ordenados) {
  const l = (Array.isArray(ordenados) ? ordenados : []).slice(0, 3).map((jugador, i) => ({ jugador, puesto: i + 1 }));
  const [a, b, c] = l;
  return [b, a, c].filter(Boolean);
}

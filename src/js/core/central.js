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

const jugado = (m) => Number.isInteger(m?.gl) && Number.isInteger(m?.gv);
const pendiente = (m) => m && m.gl == null && m.gv == null;

/**
 * Qué mostrar en «Central de Partidos» a partir de las fechas de la edición en curso:
 *  · resultados = hasta las 2 ÚLTIMAS fechas con algún partido jugado (la más reciente primero; solo los jugados). Así una fecha recién empezada no deja la lista casi vacía
 *  · proximos   = la PRIMERA fecha que tenga algún partido sin jugar (solo los pendientes)
 * Una fecha a medias aparece en las dos pestañas, cada una con su parte. Sin fechas → [] y null.
 * @returns {{resultados:{n:number,partidos:object[]}[], proximos:{n:number,partidos:object[]}|null}}
 */
export function jornadasCentral(fechas) {
  const f = Array.isArray(fechas) ? fechas : [];
  const ult = [...f].reverse().filter((x) => x.partidos?.some(jugado)).slice(0, 2);
  const sig = f.find((x) => x.partidos?.some(pendiente));
  return {
    resultados: ult.map((x) => ({ n: x.n, partidos: x.partidos.filter(jugado) })),
    proximos: sig ? { n: sig.n, partidos: sig.partidos.filter(pendiente) } : null,
  };
}

/** Partido destacado: de los pendientes, el que enfrenta a los mejor ubicados de la tabla (menor suma de puestos; a igualdad, el primero listado). */
export function partidoDestacado(pendientes, tabla) {
  const pos = new Map((Array.isArray(tabla) ? tabla : []).map((t, i) => [t.nombre, i + 1]));
  const peso = (m) => (pos.get(m.l) ?? 99) + (pos.get(m.v) ?? 99);
  return (Array.isArray(pendientes) ? pendientes : []).reduce((mejor, m) => (!mejor || peso(m) < peso(mejor) ? m : mejor), null);
}

/** Escudo-monograma de un club; los desconocidos reciben uno neutro con sus 3 primeras letras. */
export function visualClub(club, mapa = {}) {
  const v = mapa[club]; if (v) return v;
  return { sigla: String(club ?? '?').replace(/[^A-Za-zÁÉÍÓÚÑáéíóúñ]/g, '').slice(0, 3).toUpperCase() || '?', a: '#6b7280', b: '#1f2937' };
}

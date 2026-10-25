// Prode — lógica PURA (sin DOM → `npm test`). Misma regla que la BD (migración 149): exacto 10, ganador/empate 3, tope 100/semana.
export const PUNTOS = { exacto: 10, ganador: 3 };
export const TOPE_SEMANA = 100;

/** Puntos de un pronóstico frente al resultado. null si falta algún dato. */
export function puntosProde(pa, pb, ra, rb) {
  if (![pa, pb, ra, rb].every(Number.isInteger)) return null;
  if (pa === ra && pb === rb) return PUNTOS.exacto;
  return Math.sign(pa - pb) === Math.sign(ra - rb) ? PUNTOS.ganador : 0;
}

/** Ascuas que de verdad se dan con el tope. */
export const ascuasConTope = (puntos, yaGanado, tope = TOPE_SEMANA) => Math.max(0, Math.min(Number(puntos) || 0, tope - (Number(yaGanado) || 0)));

/** Valida lo que escribe la persona. → { ok, a, b } o { ok:false, error }. */
export function validarPronostico(a, b) {
  const n = (x) => (typeof x === 'string' ? x.trim() : x);
  const A = n(a), B = n(b);
  if (A === '' || B === '' || A == null || B == null) return { ok: false, error: 'Escribe los goles de los dos.' };
  if (!/^\d{1,2}$/.test(String(A)) || !/^\d{1,2}$/.test(String(B))) return { ok: false, error: 'Solo números enteros.' };
  const x = Number(A), y = Number(B);
  if (x > 30 || y > 30) return { ok: false, error: 'Máximo 30 goles.' };
  return { ok: true, a: x, b: y };
}

/** Texto del resultado de un pronóstico ya liquidado. */
export function textoResultado(m) {
  if (!m || m.liquidado == null) return m?.estado === 'CANCELADO' ? 'Duelo cancelado' : 'Esperando el marcador confirmado';
  if (m.puntos === 10) return `¡Exacto! +${m.ascuas ?? 0} ascuas`;
  if (m.puntos === 3) return `Acertaste el ganador · +${m.ascuas ?? 0} ascuas`;
  return 'Sin puntos';
}

/** Barra del tope semanal. */
export function progresoSemana(ganado, tope = TOPE_SEMANA) {
  const g = Math.max(0, Math.min(Number(ganado) || 0, tope));
  return { ganado: g, tope, pct: Math.round((g * 100) / tope), lleno: g >= tope };
}

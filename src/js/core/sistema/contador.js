// Count-up (ronda 182) — lógica PURA (sin DOM → probable con `npm test`).
// Dado el valor final, la duración y el instante t (ms), devuelve el número entero a mostrar.
// La curva es «ease-out» fuerte (arranca rápido, frena al final): se siente responsiva y el último dígito se asienta sin prisa.

/** Ease-out exponencial: 0 → 0, 1 → 1, siempre creciente. */
export const suavizar = (p) => (p >= 1 ? 1 : 1 - Math.pow(2, -10 * Math.max(0, p)));

/** Duración recomendada: más cifras → un poco más de tiempo, pero siempre entre 600 y 1400 ms. */
export const duracionPara = (hasta) => {
  const n = Number.isFinite(hasta) ? Math.abs(Math.trunc(hasta)) : 0;
  return Math.min(1400, 600 + String(n).length * 160);
};

/**
 * Valor entero a mostrar en el instante `t` (ms desde que empezó).
 * · Si `hasta` no es un entero ≥ 0 devuelve null (el llamador deja el texto como está: «—»).
 * · t ≤ 0 → 0; t ≥ duración → `hasta` exacto (nunca se queda a medias).
 */
export function valorEn(hasta, t, duracion = duracionPara(hasta)) {
  if (!Number.isFinite(hasta) || hasta < 0) return null;
  const fin = Math.trunc(hasta);
  if (!(t > 0)) return 0;
  if (t >= duracion || duracion <= 0) return fin;
  return Math.min(fin, Math.round(fin * suavizar(t / duracion)));
}

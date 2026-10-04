// Cálculos puros de estadísticas de jugador (sin DOM → probables).
/** Fuerza un número a entero 1-99; si no es número, devuelve `def`. */
export const clampStat = (v, def = 75) => { const n = Math.round(Number(v)); return Number.isFinite(n) ? Math.min(99, Math.max(1, n)) : def; };
/** Media (OVR) = promedio redondeado de los valores dados, entre 1 y 99. */
export const calcOvr = (values) => (values.length ? clampStat(values.reduce((s, v) => s + clampStat(v), 0) / values.length) : 75);

const lim = (v) => Math.min(99, Math.max(1, v));

/**
 * Reparte una media objetivo entre las stats conservando las diferencias entre ellas:
 * devuelve enteros 1-99 cuyo `calcOvr` es EXACTAMENTE `objetivo`. (Un desplazamiento común que se busca por bisección, porque
 * al topar con 1 o 99 el resto debe compensar; luego se corrige el residuo del redondeo de a ±1.)
 */
export function distribuirMedia(objetivo, valores) {
  const n = valores?.length ?? 0; if (!n) return [];
  const T = clampStat(objetivo) * n;                                   // suma que da exactamente esa media
  const base = valores.map((v) => clampStat(v));
  const suma = (s) => base.reduce((a, v) => a + lim(v + s), 0);
  let lo = -98; let hi = 98;
  for (let i = 0; i < 40; i += 1) { const mid = (lo + hi) / 2; if (suma(mid) < T) lo = mid; else hi = mid; }
  const real = base.map((v) => lim(v + hi));
  const out = real.map((r) => Math.round(r));
  let falta = T - out.reduce((a, b) => a + b, 0);
  while (falta !== 0) {                                                // el redondeo pudo dejar la suma corta o larga
    const sube = falta > 0;
    let mejor = -1; let puntaje = -Infinity;
    out.forEach((v, i) => {
      if (sube ? v >= 99 : v <= 1) return;
      const p = sube ? real[i] - v : v - real[i];                      // a quién le "debemos" más
      if (p > puntaje) { puntaje = p; mejor = i; }
    });
    if (mejor < 0) break;                                              // no debería pasar: T siempre es alcanzable
    out[mejor] += sube ? 1 : -1; falta += sube ? -1 : 1;
  }
  return out;
}

/** `n` stats al azar que justifican la media `objetivo` (su `calcOvr` es exactamente `objetivo`). `rnd` se inyecta para probar. */
export function aleatorias(objetivo, n = 14, rnd = Math.random, amplitud = 10) {
  const o = clampStat(objetivo);
  const crudas = Array.from({ length: n }, () => o + Math.round((rnd() * 2 - 1) * amplitud));
  return distribuirMedia(o, crudas);
}

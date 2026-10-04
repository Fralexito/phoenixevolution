// Cálculos puros de estadísticas de jugador (sin DOM → probables).
/** Fuerza un número a entero 1-99; si no es número, devuelve `def`. */
export const clampStat = (v, def = 75) => { const n = Math.round(Number(v)); return Number.isFinite(n) ? Math.min(99, Math.max(1, n)) : def; };
/** Media (OVR) = promedio redondeado de los valores dados, entre 1 y 99. */
export const calcOvr = (values) => (values.length ? clampStat(values.reduce((s, v) => s + clampStat(v), 0) / values.length) : 75);

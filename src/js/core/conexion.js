// Pruebas de conexión (módulo 2 · justicia antes del partido). Lógica PURA, sin red ni DOM → se prueba con `npm test`.
// El semáforo «oficial» lo calcula la base de datos (private.semaforo) con los umbrales del perfil de reglas; aquí se replica
// la MISMA regla solo para pintar en vivo mientras se mide. Si algún día difieren, manda lo que devuelve la base.

/** Umbrales por defecto (= private.umbrales de la migración 061). */
export const UMBRALES_DEFECTO = Object.freeze({
  ping_verde_ms: 60, ping_ambar_ms: 100, jitter_verde_ms: 10, jitter_ambar_ms: 25, perdida_verde_pct: 1, perdida_ambar_pct: 3,
});

const redondear = (x, d = 1) => (x === null || !Number.isFinite(x) ? null : Math.round(x * 10 ** d) / 10 ** d);

/** Percentil por interpolación lineal (igual que percentile_cont de Postgres). `ordenados` ya en orden ascendente. */
export function percentil(ordenados, p) {
  if (!ordenados.length) return null;
  const pos = (ordenados.length - 1) * p; const bajo = Math.floor(pos); const alto = Math.ceil(pos);
  return ordenados[bajo] + (ordenados[alto] - ordenados[bajo]) * (pos - bajo);
}

/**
 * Muestras de ida y vuelta (ms, en el orden en que se tomaron; `null` = se perdió por timeout) → estadísticas.
 * jitter = media de |diferencia entre muestras consecutivas válidas| (la idea de RFC 3550, simplificada).
 */
export function estadisticas(muestras) {
  const lista = Array.isArray(muestras) ? muestras : [];
  const validas = lista.filter((x) => typeof x === 'number' && Number.isFinite(x) && x >= 0);
  const enviadas = lista.length;
  if (!validas.length) return { n: 0, enviadas, mediana_ms: null, p95_ms: null, jitter_ms: null, perdida_pct: enviadas ? 100 : null };
  const ord = [...validas].sort((a, b) => a - b);
  let suma = 0; for (let i = 1; i < validas.length; i++) suma += Math.abs(validas[i] - validas[i - 1]);
  return {
    n: validas.length, enviadas,
    mediana_ms: redondear(percentil(ord, 0.5)), p95_ms: redondear(percentil(ord, 0.95)),
    jitter_ms: validas.length > 1 ? redondear(suma / (validas.length - 1)) : 0,
    perdida_pct: redondear((100 * (enviadas - validas.length)) / enviadas, 2),
  };
}

/** Umbrales efectivos de unas reglas (si el perfil no trae `semaforo` válido → los por defecto). */
export function umbralesDe(reglas) {
  const s = reglas?.semaforo;
  const claves = Object.keys(UMBRALES_DEFECTO);
  if (!s || typeof s !== 'object' || !claves.every((k) => typeof s[k] === 'number')) return { ...UMBRALES_DEFECTO };
  return Object.fromEntries(claves.map((k) => [k, s[k]]));
}

/** verde | ambar | rojo | sin_datos. Cada métrica presente contra su umbral; manda la peor (misma regla que la BD). */
export function semaforo(u, { ping = null, jitter = null, perdida = null } = {}) {
  const pares = [[ping, u.ping_verde_ms, u.ping_ambar_ms], [jitter, u.jitter_verde_ms, u.jitter_ambar_ms], [perdida, u.perdida_verde_pct, u.perdida_ambar_pct]]
    .filter(([x]) => typeof x === 'number' && Number.isFinite(x));
  if (!pares.length) return 'sin_datos';
  if (pares.some(([x, , ambar]) => x > ambar)) return 'rojo';
  if (pares.some(([x, verde]) => x > verde)) return 'ambar';
  return 'verde';
}

/** Texto corto y honesto para cada color (la web lo muestra junto al semáforo). */
export const TEXTO_SEMAFORO = Object.freeze({
  verde: 'Conexión buena para jugar.',
  ambar: 'Se puede jugar, con algo de retraso o tirones.',
  rojo: 'Conexión mala para este host: conviene otro host o uno neutral.',
  sin_datos: 'Sin datos suficientes todavía.',
});

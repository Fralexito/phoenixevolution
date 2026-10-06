// Pruebas de core/conexion.js (estadísticas del pre-chequeo y semáforo; misma regla que private.semaforo de la 061).
import { test } from 'node:test';
import assert from 'node:assert/strict';
import { estadisticas, percentil, umbralesDe, semaforo, UMBRALES_DEFECTO } from '../src/js/core/conexion.js';

test('percentil como percentile_cont', () => {
  assert.equal(percentil([10, 20, 30, 40], 0.5), 25);
  assert.equal(percentil([10], 0.95), 10);
  assert.equal(percentil([], 0.5), null);
});

test('estadisticas: mediana, p95, jitter y pérdida con muestras perdidas', () => {
  const e = estadisticas([40, 42, null, 38, 60, 41]);
  assert.equal(e.n, 5); assert.equal(e.enviadas, 6);
  assert.equal(e.mediana_ms, 41);
  assert.equal(e.perdida_pct, 16.67);
  assert.equal(e.jitter_ms, 11.8);              // (2+4+22+19)/4 = 11.75 → 11.8
  assert.ok(e.p95_ms > 50 && e.p95_ms <= 60);
});

test('estadisticas: casos borde', () => {
  assert.deepEqual(estadisticas([]), { n: 0, enviadas: 0, mediana_ms: null, p95_ms: null, jitter_ms: null, perdida_pct: null });
  assert.equal(estadisticas([null, null]).perdida_pct, 100);
  assert.equal(estadisticas([33]).jitter_ms, 0);
  assert.equal(estadisticas(['x', -1, NaN, 20]).n, 1);
});

test('umbralesDe: usa los del perfil si están completos; si no, los por defecto', () => {
  const s = { ping_verde_ms: 40, ping_ambar_ms: 80, jitter_verde_ms: 6, jitter_ambar_ms: 15, perdida_verde_pct: 0.5, perdida_ambar_pct: 1.5 };
  assert.deepEqual(umbralesDe({ semaforo: s }), s);
  assert.deepEqual(umbralesDe({ semaforo: { ping_verde_ms: 40 } }), UMBRALES_DEFECTO);
  assert.deepEqual(umbralesDe(null), UMBRALES_DEFECTO);
});

test('semaforo: manda la peor métrica; ignora las ausentes', () => {
  const u = UMBRALES_DEFECTO;
  assert.equal(semaforo(u, { ping: 30, jitter: 5, perdida: 0 }), 'verde');
  assert.equal(semaforo(u, { ping: 61 }), 'ambar');
  assert.equal(semaforo(u, { ping: 30, perdida: 3.5 }), 'rojo');
  assert.equal(semaforo(u, { ping: 100, jitter: 25, perdida: 3 }), 'ambar');   // en el límite exacto aún no pasa de color
  assert.equal(semaforo(u, {}), 'sin_datos');
});

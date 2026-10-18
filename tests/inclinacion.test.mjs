import { test } from 'node:test';
import assert from 'node:assert/strict';
import { maxInclinacion, inclinacion } from '../src/js/core/sistema/inclinacion.js';

test('inclinación: lo chico se inclina más que lo grande (8° máx, 1° mín)', () => {
  assert.equal(maxInclinacion(300, 200), 8);
  assert.equal(maxInclinacion(1300, 400), 2);
  assert.equal(maxInclinacion(5000, 100), 1);
  assert.equal(maxInclinacion(0, 0), 0);
});

test('inclinación: centro = plano; esquinas = ±máximo', () => {
  assert.deepEqual(inclinacion(150, 100, 300, 200), { rx: 0, ry: 0 });
  assert.deepEqual(inclinacion(300, 0, 300, 200), { rx: 8, ry: 8 });
  assert.deepEqual(inclinacion(0, 200, 300, 200), { rx: -8, ry: -8 });
  assert.deepEqual(inclinacion(-50, 999, 300, 200), { rx: -8, ry: -8 });   // fuera del elemento: se limita
});

test('inclinación: lo que tiene tablas se mueve suave (máx. 0,8°)', () => {
  assert.equal(maxInclinacion(920, 600, { suave: true }), 0.8);
  assert.equal(maxInclinacion(300, 200, { suave: true }), 0.8);
  assert.deepEqual(inclinacion(920, 0, 920, 600, { suave: true }), { rx: 0.8, ry: 0.8 });
});

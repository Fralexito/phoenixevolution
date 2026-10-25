import { test } from 'node:test';
import assert from 'node:assert/strict';
import { premioDe, insigniaDe, nombreMes, diasParaCierre } from '../src/js/core/competicion/temporadas.js';

test('premios e insignias', () => {
  assert.equal(premioDe(1), 300); assert.equal(premioDe(3), 100); assert.equal(premioDe(10), 30); assert.equal(premioDe(11), 0);
  assert.equal(insigniaDe(2), 'Subcampeón'); assert.equal(insigniaDe(7), 'Top 10'); assert.equal(insigniaDe(0), '');
});
test('nombreMes y días para el cierre (hora de Lima)', () => {
  assert.equal(nombreMes('2026-09-01'), 'septiembre 2026'); assert.equal(nombreMes('x'), '');
  assert.equal(diasParaCierre(new Date('2026-10-25T12:00:00Z')), 7);
  assert.equal(diasParaCierre(new Date('2026-11-01T04:30:00Z')), 1);     // 31-oct 23:30 en Lima → cierra en media hora
});

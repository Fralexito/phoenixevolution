import test from 'node:test';
import assert from 'node:assert/strict';
import { diaPeru, retoDelDia, retoSemanal, girarRuleta, nocheTematica } from '../src/js/core/retos.js';
import { RETOS_DIARIOS, REGLAS_RULETA, NOCHES_TEMATICAS, MODALIDADES } from '../src/data/modalidades.js';

test('el día cambia a medianoche de Perú, no de UTC', () => {
  assert.equal(diaPeru(new Date('2026-10-09T04:59:00Z')), diaPeru(new Date('2026-10-08T12:00:00Z')));
  assert.equal(diaPeru(new Date('2026-10-09T05:00:00Z')), diaPeru(new Date('2026-10-08T12:00:00Z')) + 1);
});
test('reto del día: igual durante el día y distinto al siguiente', () => {
  const a = retoDelDia(RETOS_DIARIOS, new Date('2026-10-09T15:00:00Z'));
  assert.deepEqual(a, retoDelDia(RETOS_DIARIOS, new Date('2026-10-09T23:00:00Z')));
  assert.notDeepEqual(a, retoDelDia(RETOS_DIARIOS, new Date('2026-10-10T15:00:00Z')));
  assert.equal(retoDelDia([]), null);
});
test('reto semanal y noche temática: estables dentro de la semana', () => {
  const lun = new Date('2026-10-12T15:00:00Z'); const dom = new Date('2026-10-18T15:00:00Z');
  assert.deepEqual(retoSemanal(RETOS_DIARIOS, lun), retoSemanal(RETOS_DIARIOS, dom));
  assert.deepEqual(nocheTematica(NOCHES_TEMATICAS, lun), nocheTematica(NOCHES_TEMATICAS, dom));
});
test('ruleta: reglas distintas y reproducibles', () => {
  const r = girarRuleta(REGLAS_RULETA, 5, 3);
  assert.equal(new Set(r).size, 3); assert.deepEqual(r, girarRuleta(REGLAS_RULETA, 5, 3));
  assert.equal(girarRuleta([], 1).length, 0);
});
test('catálogos con ids únicos y textos', () => {
  assert.equal(new Set(MODALIDADES.map((m) => m.id)).size, MODALIDADES.length);
  for (const x of [...MODALIDADES, ...NOCHES_TEMATICAS]) assert.ok(x.nombre && x.texto);
});

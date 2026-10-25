import { test } from 'node:test';
import assert from 'node:assert/strict';
import { porcentajes, unirMensajes, ultimoId } from '../src/js/core/competicion/salaVivo.js';

test('porcentajes suman 100', () => {
  assert.deepEqual(porcentajes({ a: 1, b: 1, e: 1 }), { a: 33, b: 33, e: 34, total: 3 });
  assert.deepEqual(porcentajes({}), { a: 0, b: 0, e: 0, total: 0 });
  assert.equal(porcentajes({ a: 3, b: 1, e: 0 }).a, 75);
});
test('unirMensajes', () => {
  const r = unirMensajes([{ id: 1 }, { id: 2 }], [{ id: 2 }, { id: 3 }, null], [1]);
  assert.deepEqual(r.map((x) => x.id), [2, 3]);
  assert.equal(ultimoId(r), 3); assert.equal(ultimoId([]), 0);
  assert.equal(unirMensajes([], Array.from({ length: 250 }, (_, i) => ({ id: i + 1 }))).length, 200);
});

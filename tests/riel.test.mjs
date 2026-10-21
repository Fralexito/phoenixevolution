import { test } from 'node:test';
import assert from 'node:assert/strict';
import { filtrarGrupo, contarPorGrupo, contarPorClub, ORDEN_GRUPOS } from '../src/js/core/jugadores/riel.js';

const J = [
  { id: 1, posicion: 'PO', club: 'Arsenal' }, { id: 2, posicion: 'DFC', club: 'arsenal' }, { id: 3, posicion: 'LI', club: 'Chelsea' },
  { id: 4, posicion: 'MC', club: 'Chelsea' }, { id: 5, posicion: 'DC', club: 'PSG' }, { id: 6, posicion: 'XX', club: '' },
];

test('filtrarGrupo: por grupo de posición; vacío o desconocido devuelve todos', () => {
  assert.deepEqual(filtrarGrupo(J, 'defensa').map((p) => p.id), [2, 3]);
  assert.deepEqual(filtrarGrupo(J, 'portero').map((p) => p.id), [1]);
  assert.equal(filtrarGrupo(J, '').length, 6); assert.equal(filtrarGrupo(J, 'nada').length, 6);
  assert.deepEqual(filtrarGrupo(null, 'medio'), []);
});
test('contarPorGrupo: los 4 grupos en orden, posición rara solo suma al total', () => {
  const r = contarPorGrupo(J);
  assert.equal(r.total, 6);
  assert.deepEqual(r.grupos.map((g) => g.grupo), ORDEN_GRUPOS);
  assert.deepEqual(r.grupos.map((g) => g.n), [1, 2, 1, 1]);
  assert.equal(r.grupos[0].nombre, 'Porteros'); assert.match(r.grupos[0].color, /^#/);
  assert.equal(contarPorGrupo(undefined).total, 0);
});
test('contarPorClub: une mayúsculas, ignora vacíos, ordena por cantidad y luego nombre', () => {
  assert.deepEqual(contarPorClub(J), [{ club: 'ARSENAL', n: 2 }, { club: 'CHELSEA', n: 2 }, { club: 'PSG', n: 1 }]);
  assert.deepEqual(contarPorClub(null), []);
});

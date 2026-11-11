import test from 'node:test';
import assert from 'node:assert/strict';
import { DIVISIONES, numDivision, agruparPorDivision, limpiarCodigo } from '../src/js/core/online/divisiones.js';

test('DIVISIONES va de D12 a D1', () => { assert.equal(DIVISIONES.length, 12); assert.equal(DIVISIONES[0], 'D12'); assert.equal(DIVISIONES.at(-1), 'D1'); });
test('numDivision', () => { assert.equal(numDivision('D3'), 3); assert.equal(numDivision(null), 99); });
test('agruparPorDivision ordena de D1 a D12 y conserva el orden interno', () => {
  const g = agruparPorDivision([{ division: 'D10', n: 'a' }, { division: 'D2', n: 'b' }, { division: 'D10', n: 'c' }]);
  assert.deepEqual(g.map((x) => x.division), ['D2', 'D10']);
  assert.deepEqual(g[1].jugadores.map((x) => x.n), ['a', 'c']);
});
test('limpiarCodigo', () => { assert.equal(limpiarCodigo(' ab12 cd '), 'AB12CD'); assert.equal(limpiarCodigo('x'), ''); assert.equal(limpiarCodigo("a'b;--"), ''); });

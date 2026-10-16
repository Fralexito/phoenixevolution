import test from 'node:test';
import assert from 'node:assert/strict';
import { evolucionPuntos } from '../src/js/core/ligaStats.js';

const F = [
  { n: 2, partidos: [{ l: 'A', v: 'C', gl: 1, gv: 1 }, { l: 'B', v: 'D', gl: null, gv: null }] },
  { n: 1, partidos: [{ l: 'A', v: 'B', gl: 2, gv: 0 }, { l: 'C', v: 'D', gl: 0, gv: 3 }] },
  { n: 3, partidos: [{ l: 'A', v: 'B', gl: null, gv: null }] },
];
test('acumula por fecha, ordena por n y salta fechas sin partidos jugados', () => {
  const r = evolucionPuntos(F, ['A', 'B', 'C']);
  assert.deepEqual(r.x, [1, 2]);
  assert.deepEqual(r.series.find((s) => s.nombre === 'A').datos, [3, 4]);
  assert.deepEqual(r.series.find((s) => s.nombre === 'B').datos, [0, 0]);
  assert.deepEqual(r.series.find((s) => s.nombre === 'C').datos, [0, 1]);
});
test('sin datos no rompe', () => { assert.deepEqual(evolucionPuntos(null, ['A']), { x: [], series: [{ nombre: 'A', datos: [] }] }); });

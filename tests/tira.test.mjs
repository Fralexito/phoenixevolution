import test from 'node:test';
import assert from 'node:assert/strict';
import { tiraPartidos, sigla } from '../src/js/core/portada/tira.js';

const F = [
  { n: 1, partidos: [{ l: 'A', v: 'B', gl: 1, gv: 0 }, { l: 'C', v: 'D', gl: 2, gv: 2 }] },
  { n: 2, partidos: [{ l: 'A', v: 'C', gl: 0, gv: 3 }, { l: 'B', v: 'D', gl: null, gv: null }] },
  { n: 3, partidos: [{ l: 'D', v: 'A', gl: null, gv: null }] },
];

test('tira: resultados en orden de fecha y luego pendientes', () => {
  const t = tiraPartidos(F, { A: 'Inter' });
  assert.deepEqual(t.map((x) => `${x.fecha}${x.l}${x.v}${x.estado[0]}`), ['1ABf', '1CDf', '2ACf', '2BDp', '3DAp']);
  assert.equal(t[0].clubL, 'Inter'); assert.equal(t[3].gl, null);
});

test('tira: respeta los topes y tolera datos raros', () => {
  assert.equal(tiraPartidos(F, {}, { jugados: 1, pendientes: 1 }).length, 2);
  assert.equal(tiraPartidos(F, {}, { jugados: 1 }).at(0).l, 'A');   // el último jugado es A–C (fecha 2)
  assert.deepEqual(tiraPartidos(null), []);
  assert.deepEqual(tiraPartidos([{ n: 1 }, { partidos: [] }]), []);
});

test('sigla', () => { assert.equal(sigla('Maurisgame'), 'MAU'); assert.equal(sigla('José Reyes'), 'JOS'); assert.equal(sigla(''), '—'); });

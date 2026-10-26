import test from 'node:test';
import assert from 'node:assert/strict';
import { resumenEdicion, iniciales, forma } from '../src/js/core/portada/demoDatos.js';

const ed = {
  clubes: { A: 'Arsenal', B: 'Chelsea', C: 'Inter' },
  fechas: [
    { n: 1, partidos: [{ l: 'A', v: 'B', gl: 3, gv: 0 }, { l: 'C', v: 'A', gl: 1, gv: 1 }] },
    { n: 2, partidos: [{ l: 'B', v: 'C', gl: 2, gv: 2 }, { l: 'A', v: 'C', gl: null, gv: null }] },
    { n: 3, partidos: [{ l: 'B', v: 'A', gl: null, gv: null }] },
  ],
};

test('demo: resumen de la edición', () => {
  const r = resumenEdicion(ed);
  assert.equal(r.lider.nombre, 'A'); assert.equal(r.lider.pts, 4); assert.equal(r.lider.club, 'Arsenal'); assert.equal(r.lider.pos, 1);
  assert.equal(r.ultima.n, 2); assert.equal(r.ultima.resultados.length, 1);            // solo lo jugado
  assert.equal(r.proxima, 3);                                                            // la primera fecha con pendientes después de la última jugada
  assert.equal(r.partidosProxima.length, 1);
  assert.equal(r.pendientes.length, 2); assert.equal(r.pendientes[1].fecha, 3);
  assert.deepEqual(r.cifras, { partidos: 3, goles: 9, promedio: 3, fechas: 2, totalFechas: 3 });
  assert.equal(r.goleada.l, 'A'); assert.equal(r.goleada.gl, 3);
  assert.equal(r.masGoles.nombre, 'A');
});

test('demo: sin datos no se rompe', () => {
  const r = resumenEdicion(null);
  assert.equal(r.lider, null); assert.equal(r.ultima, null); assert.equal(r.proxima, null);
  assert.deepEqual(r.cifras, { partidos: 0, goles: 0, promedio: 0, fechas: 0, totalFechas: 0 });
});

test('demo: iniciales y forma', () => {
  assert.equal(iniciales('Fralex'), 'FR'); assert.equal(iniciales('José Reyes'), 'JR'); assert.equal(iniciales(''), '?');
  assert.deepEqual(forma(ed, 'A'), ['V', 'E']); assert.deepEqual(forma(ed, 'B', 1), ['E']);
});

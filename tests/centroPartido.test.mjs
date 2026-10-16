import test from 'node:test';
import assert from 'node:assert/strict';
import { marcadorAl, eventosHasta, estadisticasAl } from '../src/js/core/centroPartido.js';
const ev = [{ min: 10, lado: 'local', tipo: 'gol' }, { min: 20, lado: 'visita', tipo: 'amarilla' }, { min: 30, lado: 'visita', tipo: 'gol' }];
test('marcador al minuto', () => { assert.deepEqual(marcadorAl(ev, 9), { local: 0, visita: 0 }); assert.deepEqual(marcadorAl(ev, 25), { local: 1, visita: 0 }); assert.deepEqual(marcadorAl(ev, 90), { local: 1, visita: 1 }); assert.deepEqual(marcadorAl(null, 5), { local: 0, visita: 0 }); });
test('eventos hasta el minuto, el más reciente primero', () => { assert.deepEqual(eventosHasta(ev, 25).map((e) => e.min), [20, 10]); });
test('estadísticas proporcionales; el % no se reparte', () => {
  const r = estadisticasAl([{ id: 't', local: 10, visita: 4 }, { id: 'p', local: 54, visita: 46, sufijo: '%' }], 45, 90);
  assert.equal(r[0].local, 5); assert.equal(r[0].visita, 2); assert.equal(r[1].local, 54);
  assert.equal(estadisticasAl([{ id: 't', local: 10, visita: 4 }], 500, 90)[0].local, 10);
});

import test from 'node:test';
import assert from 'node:assert/strict';
import { datosRincon } from '../src/js/core/portada/rincon.js';

const ed = { clubes: { Fralex: 'FC Barcelona', Axel: 'Real Madrid', Beto: 'Liverpool' }, fechas: [
  { n: 1, partidos: [{ l: 'Fralex', v: 'Axel', gl: 2, gv: 1 }, { l: 'Beto', v: 'Axel', gl: 0, gv: 0 }] },
  { n: 2, partidos: [{ l: 'Beto', v: 'Fralex' }] },
] };
test('rincón: encuentra tu nombre sin importar mayúsculas, tu puesto y tu próximo partido', () => {
  const r = datosRincon(['fralexito', 'FRALEX'], ed);
  assert.equal(r.enLiga, true); assert.equal(r.nombre, 'Fralex'); assert.equal(r.club, 'FC Barcelona');
  assert.equal(r.puesto.puesto, 1);
  assert.deepEqual(r.proximo, { fecha: 2, rival: 'Beto', local: false, clubRival: 'Liverpool' });
});
test('rincón: si no juegas la liga o no hay edición', () => {
  assert.deepEqual(datosRincon(['nadie'], ed), { enLiga: false });
  assert.deepEqual(datosRincon(['Fralex'], null), { enLiga: false });
  assert.equal(datosRincon(['Axel'], ed).proximo, null);
});

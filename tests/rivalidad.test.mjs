import { test } from 'node:test';
import assert from 'node:assert/strict';
import { resumenRivalidad, letraDe, idsDeUrl } from '../src/js/core/competicion/rivalidad.js';

const U1 = '11111111-1111-1111-1111-111111111111', U2 = '22222222-2222-2222-2222-222222222222';

test('resumenRivalidad', () => {
  const r = resumenRivalidad({ visible: true, a: { nombre: 'Ana' }, b: { nombre: 'Beto' }, jugados: 4, gana_a: 2, empates: 1, gana_b: 1, goles_a: 5, goles_b: 3, racha: { quien: 'a', largo: 2 } });
  assert.equal(r.domina, 'Domina Ana'); assert.equal(r.pa, 50); assert.equal(r.racha, 'Ana ganó los últimos 2');
  assert.equal(resumenRivalidad({ visible: true, jugados: 0 }).domina, 'Aún no se han enfrentado');
  assert.equal(resumenRivalidad({ visible: true, jugados: 2, gana_a: 1, gana_b: 1, racha: { quien: 'empate', largo: 1 } }).racha, '1 empate seguido');
  assert.equal(resumenRivalidad({ visible: false, motivo: 'privado' }).motivo, 'privado');
  assert.equal(resumenRivalidad(null).visible, false);
});
test('letraDe', () => { assert.equal(letraDe({ ga: 2, gb: 1 }), 'G'); assert.equal(letraDe({ ga: 1, gb: 1 }), 'E'); assert.equal(letraDe({ ga: 0, gb: 3 }), 'P'); });
test('idsDeUrl', () => {
  assert.deepEqual(idsDeUrl(`?a=${U1}&b=${U2}`), { a: U1, b: U2 });
  assert.equal(idsDeUrl(`?a=${U1}&b=${U1}`), null);
  assert.equal(idsDeUrl('?a=x&b=y'), null);
  assert.equal(idsDeUrl(''), null);
});

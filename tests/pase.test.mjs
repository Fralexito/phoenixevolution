import { test } from 'node:test';
import assert from 'node:assert/strict';
import { liderDe, puestoDe, proximoPartido, nombreEnLiga, numeroMiembro, tocaIntro } from '../src/js/core/portada/pase.js';

const tabla = [{ nombre: 'Victor', pj: 9, pts: 27 }, { nombre: 'Beto', pj: 9, pts: 20 }, { nombre: 'Fralex', pj: 8, pts: 15 }];
const fechas = [
  { n: 9, partidos: [{ l: 'Victor', v: 'Beto', gl: 2, gv: 1 }, { l: 'Fralex', v: 'Morgado', gl: null, gv: null }] },
  { n: 10, partidos: [{ l: 'Beto', v: 'Fralex', gl: null, gv: null }] },
];

test('pase: líder solo si ya hay partidos jugados', () => {
  assert.equal(liderDe(tabla).nombre, 'Victor');
  assert.equal(liderDe([{ nombre: 'X', pj: 0, pts: 0 }]), null);
  assert.equal(liderDe([]), null);
});

test('pase: puesto sin importar mayúsculas', () => {
  assert.deepEqual(puestoDe(tabla, ['FRALEX', 'fralexito']).puesto, 3);
  assert.equal(puestoDe(tabla, ['nadie']), null);
});

test('pase: próximo partido (local o visita) y nombre en la liga', () => {
  assert.deepEqual(proximoPartido(fechas, 'fralex'), { fecha: 9, rival: 'Morgado', local: true });
  assert.deepEqual(proximoPartido(fechas, 'Beto'), { fecha: 10, rival: 'Fralex', local: true });
  assert.equal(proximoPartido(fechas, 'Victor'), null);
  assert.equal(nombreEnLiga(['Victor', 'Fralex'], ['fralex']), 'Fralex');
});

test('pase: número de miembro y entrada una vez al día', () => {
  assert.equal(numeroMiembro(7), 'N.º 007');
  assert.equal(numeroMiembro(1234), 'N.º 1234');
  assert.equal(numeroMiembro(null), 'N.º —');
  assert.equal(tocaIntro('2026-10-11', '2026-10-12'), true);
  assert.equal(tocaIntro('2026-10-12', '2026-10-12'), false);
});

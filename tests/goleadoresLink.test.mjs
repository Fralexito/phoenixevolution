import { test } from 'node:test';
import assert from 'node:assert/strict';
import { prepararGoleadores, validarGolesLink, nombreFutbolista } from '../src/js/core/competicion/goleadoresLink.js';

test('prepararGoleadores: filtra basura y empates comparten puesto', () => {
  const r = prepararGoleadores({ goleadores: [{ nombre: 'Messi', goles: 5 }, { nombre: 'Kane', goles: 5 }, { nombre: 'Son', goles: 2 }, { nombre: 'x', goles: 0 }, null, { goles: 3 }],
    asistentes: [{ nombre: 'De Bruyne', asistencias: 3 }], duelos: '4' });
  assert.deepEqual(r.goleadores.map((x) => [x.nombre, x.puesto]), [['Messi', 1], ['Kane', 1], ['Son', 3]]);
  assert.equal(r.asistentes[0].n, 3); assert.equal(r.duelos, 4);
  assert.deepEqual(prepararGoleadores(null), { goleadores: [], asistentes: [], duelos: 0 });
});

test('nombreFutbolista', () => { assert.equal(nombreFutbolista('  Lionel   Messi '), 'Lionel Messi'); assert.equal(nombreFutbolista(3), ''); });

test('validarGolesLink: casos', () => {
  const ok = validarGolesLink([{ lado: 'A', goleador: ' Messi ', minuto: 10, asistente: 'Di María' }, { lado: 'B', goleador: 'Kane', minuto: 90, tipo: 'penal' }]);
  assert.equal(ok.ok, true); assert.equal(ok.goles[0].goleador, 'Messi'); assert.equal(ok.goles[1].asistente, null);
  assert.equal(validarGolesLink([]).ok, true);
  assert.equal(validarGolesLink('x').ok, false);
  assert.equal(validarGolesLink([{ lado: 'C', goleador: 'a', minuto: 1 }]).error, 'lado');
  assert.equal(validarGolesLink([{ lado: 'A', goleador: '<b>', minuto: 1 }]).error, 'goleador');
  assert.equal(validarGolesLink([{ lado: 'A', goleador: 'a', minuto: 131 }]).error, 'minuto');
  assert.equal(validarGolesLink([{ lado: 'A', goleador: 'a', minuto: 1.5 }]).error, 'minuto');
  assert.equal(validarGolesLink([{ lado: 'A', goleador: 'a', minuto: 1, tipo: 'penal', asistente: 'b' }]).error, 'asistente');
  assert.equal(validarGolesLink(Array.from({ length: 41 }, () => ({ lado: 'A', goleador: 'a', minuto: 1 }))).ok, false);
});

import { test } from 'node:test';
import assert from 'node:assert/strict';
import { PORTADAS } from '../src/data/portadas.js';
import { limpiarPortada, edicionesPublicadas, etiquetaEdicion, rangoSemana, cuponesSeguidos } from '../src/js/core/portadas.js';

test('todas las portadas de data/portadas.js son válidas', () => {
  for (const p of PORTADAS) assert.ok(limpiarPortada(p), `inválida: ${p.id}`);
});

test('limpiarPortada descarta lo roto y rellena lo que falta', () => {
  assert.equal(limpiarPortada({ id: 'x', fecha: 'mañana', titular: ['Hola'] }), null);
  assert.equal(limpiarPortada({ id: 'x', fecha: '2026-10-13', titular: [] }), null);
  const p = limpiarPortada({ id: 'x', fecha: '2026-10-13', titular: ['¡Hola!'], tema: 'morado', patch: [{ tipo: 'raro', t: 'x' }] });
  assert.equal(p.tema, 'amarillo'); assert.deepEqual(p.patch, []); assert.equal(p.titular[1], '');
});

test('edicionesPublicadas: solo lo ya salido, lo más nuevo primero', () => {
  const l = edicionesPublicadas(PORTADAS, '2026-10-17');
  assert.deepEqual(l.map((p) => p.id), ['2026-10-16-extra', '2026-s42', '2026-s41']);
  assert.deepEqual(edicionesPublicadas(PORTADAS, '2026-10-14').map((p) => p.id), ['2026-s42', '2026-s41']);
});

test('etiquetas y rango de la semana', () => {
  assert.equal(rangoSemana('2026-10-13'), '13 al 19 oct');
  assert.equal(rangoSemana('2026-09-28'), '28 sep al 4 oct');
  const l = edicionesPublicadas(PORTADAS, '2026-10-17');
  assert.equal(etiquetaEdicion(l[0], 0).nombre, '¡Edición extra!');
  assert.equal(etiquetaEdicion(l[1], 1, l).nombre, 'Esta semana');
  assert.equal(etiquetaEdicion(l[2], 2, l).nombre, 'Semana 41');
});

test('cupones: solo cuentan semanas seguidas', () => {
  const l = edicionesPublicadas(PORTADAS, '2026-10-17');
  assert.equal(cuponesSeguidos(l, ['2026-s42', '2026-s41']), 2);
  assert.equal(cuponesSeguidos(l, ['2026-s41']), 0);
});

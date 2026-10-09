import test from 'node:test';
import assert from 'node:assert/strict';
import { validarTraspaso, describirMovimiento } from '../src/js/core/traspasosReales.js';

const base = { pes_id: '1234', jugador: ' Jugador Prueba ', tipo: 'traspaso', de: '10', a: '20', nota: '' };

test('traspasos reales: fila válida se limpia y vacíos pasan a null', () => {
  const r = validarTraspaso(base);
  assert.equal(r.ok, true);
  assert.deepEqual(r.datos, { pes_id: 1234, jugador: 'Jugador Prueba', tipo: 'traspaso', de_pes_team_id: 10, a_pes_team_id: 20, nota: null });
});

test('traspasos reales: rechaza ID de jugador inválido o nombre vacío', () => {
  for (const pes_id of ['', '0', '-5', '12a', '1.5']) assert.equal(validarTraspaso({ ...base, pes_id }).ok, false, `pes_id ${pes_id}`);
  assert.equal(validarTraspaso({ ...base, jugador: '   ' }).ok, false);
  assert.equal(validarTraspaso({ ...base, jugador: 'x'.repeat(81) }).ok, false);
});

test('traspasos reales: traspaso y cesión piden origen y destino distintos', () => {
  assert.equal(validarTraspaso({ ...base, de: '' }).ok, false);
  assert.equal(validarTraspaso({ ...base, a: '' }).ok, false);
  assert.equal(validarTraspaso({ ...base, a: '10' }).ok, false);
  assert.equal(validarTraspaso({ ...base, tipo: 'cesion' }).ok, true);
});

test('traspasos reales: llega libre y retiro', () => {
  assert.equal(validarTraspaso({ ...base, tipo: 'libre', de: '', a: '20' }).ok, true);
  assert.equal(validarTraspaso({ ...base, tipo: 'retiro', a: '' }).ok, true);
  assert.equal(validarTraspaso({ ...base, tipo: 'retiro', a: '20' }).ok, false);
  assert.equal(validarTraspaso({ ...base, tipo: 'inventado' }).ok, false);
});

test('traspasos reales: nota larga y IDs de equipo raros se rechazan', () => {
  assert.equal(validarTraspaso({ ...base, nota: 'n'.repeat(201) }).ok, false);
  assert.equal(validarTraspaso({ ...base, de: 'abc' }).ok, false);
});

test('traspasos reales: describe el movimiento con nombres o con el ID', () => {
  const nombres = (id) => ({ 10: 'Club A' }[id] ?? null);
  assert.equal(describirMovimiento({ tipo: 'traspaso', de_pes_team_id: 10, a_pes_team_id: 20 }, nombres), 'Traspasado de Club A a equipo 20');
  assert.equal(describirMovimiento({ tipo: 'libre', de_pes_team_id: null, a_pes_team_id: 10 }, nombres), 'Llega libre a Club A');
  assert.equal(describirMovimiento({ tipo: 'retiro', de_pes_team_id: 10, a_pes_team_id: null }, nombres), 'Se retira (Club A)');
});

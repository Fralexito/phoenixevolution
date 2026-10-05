import test from 'node:test';
import assert from 'node:assert/strict';
import { validarMarcador, marcadorDesdeMiLado, veredicto, accionDeResultado, normalizarEstadisticas, vistaPendiente } from '../src/js/core/resultado.js';

test('marcador: solo enteros 0-30', () => {
  assert.deepEqual(validarMarcador('3', ' 1 '), { ok: true, a: 3, b: 1, error: '' });
  assert.equal(validarMarcador(0, 0).ok, true);
  for (const [a, b] of [['31', '1'], ['-1', '2'], ['1.5', '2'], ['', '2'], ['a', '1'], [null, 1], ['1e1', '1'], ['100', '1']]) assert.equal(validarMarcador(a, b).ok, false, `${a},${b}`);
});
test('marcador desde mi lado y veredicto', () => {
  assert.equal(marcadorDesdeMiLado(3, 1, 'A'), '3 - 1'); assert.equal(marcadorDesdeMiLado(3, 1, 'B'), '1 - 3');
  assert.equal(veredicto(3, 1, 'A'), 'victoria'); assert.equal(veredicto(3, 1, 'B'), 'derrota'); assert.equal(veredicto(2, 2, 'B'), 'empate');
  assert.equal(veredicto(2, 2, null), null); assert.equal(veredicto('2', 1, 'A'), null);
});
test('acción según el estado del resultado', () => {
  assert.equal(accionDeResultado(null), 'ninguna'); assert.equal(accionDeResultado({ finalizado: false }), 'ninguna');
  assert.equal(accionDeResultado({ finalizado: true, estado: 'CONFIRMADO' }), 'confirmado');
  assert.equal(accionDeResultado({ finalizado: true, estado: 'PROPUESTO', puedo_responder: true }), 'responder');
  assert.equal(accionDeResultado({ finalizado: true, estado: 'PROPUESTO' }), 'esperando');
  assert.equal(accionDeResultado({ finalizado: true, puedo_proponer: true }), 'proponer');
  assert.equal(accionDeResultado({ finalizado: true, estado: 'DISPUTADO', agotado: true }), 'moderacion');
});
test('pendientes: vista por estado', () => {
  const yo = 'u1';
  assert.equal(vistaPendiente({ estado: 'SIN_MARCADOR' }, yo).tipo, 'proponer');
  assert.equal(vistaPendiente({ estado: 'PROPUESTO', propuesto_por: yo }, yo).tipo, 'esperando');
  assert.equal(vistaPendiente({ estado: 'PROPUESTO', propuesto_por: 'u2' }, yo).tipo, 'responder');
  assert.deepEqual(vistaPendiente({ estado: 'DISPUTADO', propuesto_por: 'u2', intentos: 1 }, yo), { tipo: 'proponer', contra: true });
  assert.equal(vistaPendiente({ estado: 'DISPUTADO', propuesto_por: yo, intentos: 1 }, yo).tipo, 'esperando_contra');
  assert.equal(vistaPendiente({ estado: 'DISPUTADO', propuesto_por: yo, intentos: 3 }, yo).tipo, 'moderacion');
  assert.equal(vistaPendiente(null, yo).tipo, 'ninguna');
});
test('estadísticas: basura → seguro', () => {
  assert.equal(normalizarEstadisticas({ visible: false }), null); assert.equal(normalizarEstadisticas(null), null);
  assert.deepEqual(normalizarEstadisticas({ visible: true, jugados: 3, victorias: 2, empates: 'x', derrotas: -4, gf: 5, gc: 2, efectividad: 150 }),
    { jugados: 3, victorias: 2, empates: 0, derrotas: 0, gf: 5, gc: 2, efectividad: 100 });
  assert.equal(normalizarEstadisticas({ visible: true, jugados: 0 }).efectividad, null);
});

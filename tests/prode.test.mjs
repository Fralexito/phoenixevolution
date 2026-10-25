import { test } from 'node:test';
import assert from 'node:assert/strict';
import { puntosProde, ascuasConTope, validarPronostico, textoResultado, progresoSemana } from '../src/js/core/competicion/prode.js';

test('puntosProde', () => {
  assert.equal(puntosProde(2, 1, 2, 1), 10);
  assert.equal(puntosProde(3, 0, 2, 1), 3);
  assert.equal(puntosProde(1, 1, 0, 0), 3);
  assert.equal(puntosProde(0, 1, 2, 1), 0);
  assert.equal(puntosProde(1, null, 1, 1), null);
});
test('ascuasConTope', () => {
  assert.equal(ascuasConTope(10, 0), 10); assert.equal(ascuasConTope(10, 95), 5); assert.equal(ascuasConTope(3, 100), 0); assert.equal(ascuasConTope(3, 120), 0);
});
test('validarPronostico', () => {
  assert.deepEqual(validarPronostico('2', ' 1 '), { ok: true, a: 2, b: 1 });
  assert.equal(validarPronostico('', '1').ok, false);
  assert.equal(validarPronostico('-1', '1').ok, false);
  assert.equal(validarPronostico('1.5', '1').ok, false);
  assert.equal(validarPronostico('31', '1').ok, false);
});
test('textoResultado y progreso', () => {
  assert.equal(textoResultado({ liquidado: 'x', puntos: 10, ascuas: 10 }), '¡Exacto! +10 ascuas');
  assert.equal(textoResultado({ liquidado: 'x', puntos: 3, ascuas: 0 }), 'Acertaste el ganador · +0 ascuas');
  assert.equal(textoResultado({ liquidado: null }), 'Esperando el marcador confirmado');
  assert.equal(textoResultado({ liquidado: null, estado: 'CANCELADO' }), 'Duelo cancelado');
  assert.deepEqual(progresoSemana(120), { ganado: 100, tope: 100, pct: 100, lleno: true });
});

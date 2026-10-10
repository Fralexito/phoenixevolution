// Pruebas de la lógica pura del chat general (src/js/core/chatGeneral.js).
import { test } from 'node:test';
import assert from 'node:assert/strict';
import { MAX_TEXTO, limpiarTexto, estadoEscritura, insignia, fusionar, horaCorta, mensajeError, esperaValida } from '../src/js/core/chatGeneral.js';

test('limpiarTexto y estadoEscritura: juntan espacios y cuentan el máximo', () => {
  assert.equal(limpiarTexto('  hola \n  mundo\t '), 'hola mundo');
  assert.deepEqual(estadoEscritura('   '), { restan: MAX_TEXTO, puede: false, limpio: '' });
  assert.equal(estadoEscritura('hola').puede, true); assert.equal(estadoEscritura('hola').restan, 296);
  assert.equal(estadoEscritura('x'.repeat(300)).puede, true);
  const largo = estadoEscritura('x'.repeat(301)); assert.equal(largo.puede, false); assert.equal(largo.restan, -1);
});
test('insignia: solo para el staff', () => {
  assert.equal(insignia('admin').texto, 'Admin'); assert.equal(insignia('moderador').tono, 'mod'); assert.equal(insignia('comisario').texto, 'Árbitro');
  assert.equal(insignia('jugador'), null); assert.equal(insignia(null), null);
});
test('fusionar: añade nuevos sin repetir, quita borrados y recorta', () => {
  const a = [{ id: 1, texto: 'a' }, { id: 2, texto: 'b' }];
  const r = fusionar(a, { mensajes: [{ id: 2, texto: 'b' }, { id: 3, texto: 'c' }], borrados: [1] });
  assert.deepEqual(r.lista.map((m) => m.id), [2, 3]); assert.equal(r.ultimoId, 3); assert.equal(r.hayNuevos, true);
  const igual = fusionar(r.lista, { mensajes: [], borrados: [] }); assert.equal(igual.hayNuevos, false); assert.equal(igual.ultimoId, 3);
  const muchos = fusionar([], { mensajes: Array.from({ length: 10 }, (_, i) => ({ id: i + 1 })), borrados: [] }, 4);
  assert.deepEqual(muchos.lista.map((m) => m.id), [7, 8, 9, 10]); assert.equal(muchos.ultimoId, 10);
  assert.deepEqual(fusionar([], null).lista, []);
});
test('fusionar: un borrado de un mensaje que aún no teníamos no lo deja entrar', () => {
  const r = fusionar([], { mensajes: [{ id: 5 }], borrados: [5] }); assert.deepEqual(r.lista, []);
});
test('horaCorta: hora de Lima', () => {
  assert.equal(horaCorta('2026-10-10T03:05:00Z'), '22:05'); assert.equal(horaCorta('basura'), '');
});
test('mensajeError: frases amables y texto del servidor', () => {
  assert.match(mensajeError(new Error('LIMITE_EXCEDIDO: LIMITE_EXCEDIDO')), /Anti-spam/);
  assert.equal(mensajeError(new Error('CUENTA_SANCIONADA: Tu cuenta está suspendida hasta mañana.')), 'Tu cuenta está suspendida hasta mañana.');
  assert.equal(mensajeError(new Error('MENSAJE_INVALIDO: Escribe algo antes de enviar.')), 'Escribe algo antes de enviar.');
  assert.match(mensajeError(new Error('NO_AUTORIZADO')), /Inicia sesión/);
  assert.equal(mensajeError(new Error('algo raro')), 'algo raro');
});

test('esperaValida: entero de 0 a 60 o null', () => {
  assert.equal(esperaValida('3'), 3); assert.equal(esperaValida(' 0 '), 0); assert.equal(esperaValida('60'), 60);
  for (const mal of ['61', '-1', '2.5', 'abc', '', null, '100']) assert.equal(esperaValida(mal), null);
});

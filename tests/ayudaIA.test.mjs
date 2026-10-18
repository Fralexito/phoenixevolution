import { test } from 'node:test';
import assert from 'node:assert/strict';
import { prepararMensajes, mensajeError, MAX_HISTORIAL, MAX_PREGUNTA } from '../src/js/core/comunidad/ayudaIA.js';

test('ayuda IA: solo se mandan los últimos mensajes válidos, empezando por el usuario', () => {
  const h = [{ rol: 'assistant', texto: '¡Hola!' }, { rol: 'user', texto: ' hola ' }, { rol: 'sistema', texto: 'x' }, { rol: 'user', texto: '' }];
  assert.deepEqual(prepararMensajes(h), [{ rol: 'user', texto: 'hola' }]);
  const largo = Array.from({ length: 20 }, (_, i) => ({ rol: i % 2 ? 'assistant' : 'user', texto: `m${i}` }));
  const r = prepararMensajes(largo);
  assert.ok(r.length <= MAX_HISTORIAL); assert.equal(r[0].rol, 'user');
  assert.equal(prepararMensajes([{ rol: 'user', texto: 'a'.repeat(900) }])[0].texto.length, MAX_PREGUNTA);
  assert.deepEqual(prepararMensajes(null), []);
});

test('ayuda IA: errores en palabras simples', () => {
  assert.match(mensajeError('NO_CONFIGURADO'), /todavía no está activa/);
  assert.match(mensajeError('LIMITE_USUARIO', { max: 15 }), /15 preguntas/);
  assert.match(mensajeError('SIN_SESION'), /Inicia sesión/);
  assert.match(mensajeError('???'), /No se pudo/);
});

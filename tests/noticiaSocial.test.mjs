import { test } from 'node:test';
import assert from 'node:assert/strict';
import { EMOJIS, normalizarSocial, totalReacciones, alternarReaccion, porcentajes, validarComentario, limpiarOpciones, mensajeErrorSocial } from '../src/js/core/noticiaSocial.js';

test('5 emojis acordados, en orden', () => {
  assert.deepEqual(EMOJIS.map((e) => e.id), ['fuego', 'risa', 'sorpresa', 'aplauso', 'calavera']);
});

test('normalizarSocial rellena huecos y descarta basura', () => {
  const s = normalizarSocial({ reacciones: { fuego: 3, raro: 9 }, mi_reaccion: 'raro', comentarios: null, encuesta: { opciones: 'x' } });
  assert.equal(s.reacciones.fuego, 3); assert.equal(s.reacciones.risa, 0); assert.equal(s.reacciones.raro, undefined);
  assert.equal(s.mi_reaccion, null); assert.deepEqual(s.comentarios, []); assert.equal(s.encuesta, null);
  assert.deepEqual(normalizarSocial(null).comentarios, []);
});

test('alternarReaccion: poner, cambiar y quitar (igual que la base)', () => {
  let s = normalizarSocial({ reacciones: { fuego: 2 } });
  s = alternarReaccion(s, 'fuego'); assert.equal(s.reacciones.fuego, 3); assert.equal(s.mi_reaccion, 'fuego');
  s = alternarReaccion(s, 'risa'); assert.equal(s.reacciones.fuego, 2); assert.equal(s.reacciones.risa, 1); assert.equal(s.mi_reaccion, 'risa');
  s = alternarReaccion(s, 'risa'); assert.equal(s.reacciones.risa, 0); assert.equal(s.mi_reaccion, null);
  assert.equal(totalReacciones(s), 2);
  assert.equal(alternarReaccion(s, 'pulgar'), s);
});

test('porcentajes siempre suman 100', () => {
  assert.deepEqual(porcentajes([1, 1, 1]), [34, 33, 33]);
  assert.deepEqual(porcentajes([0, 0]), [0, 0]);
  assert.deepEqual(porcentajes([3, 1]), [75, 25]);
  assert.equal(porcentajes([7, 5, 2, 1]).reduce((a, n) => a + n, 0), 100);
});

test('validarComentario', () => {
  assert.equal(validarComentario('   ').ok, false);
  assert.equal(validarComentario('  hola ').texto, 'hola');
  assert.equal(validarComentario('x'.repeat(501)).ok, false);
});

test('limpiarOpciones', () => {
  assert.deepEqual(limpiarOpciones(['A', ' ', 'B', 'C', 'D', 'E']).opciones, ['A', 'B', 'C', 'D']);
  assert.equal(limpiarOpciones(['A', '']).ok, false);
});

test('mensajeErrorSocial', () => {
  assert.match(mensajeErrorSocial({ message: 'NO_AUTORIZADO' }), /permiso/);
  assert.match(mensajeErrorSocial({ message: 'Could not find the function public.noticia_social' }), /124/);
  assert.equal(mensajeErrorSocial({ message: 'Ya votaste en esta encuesta.' }), 'Ya votaste en esta encuesta.');
});

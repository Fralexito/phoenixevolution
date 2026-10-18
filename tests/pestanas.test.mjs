import { test } from 'node:test';
import assert from 'node:assert/strict';
import { pestanaSegunTecla } from '../src/js/core/sistema/pestanas.js';

test('pestañas: flechas avanzan y retroceden dando la vuelta', () => {
  assert.equal(pestanaSegunTecla(0, 4, 'ArrowRight'), 1);
  assert.equal(pestanaSegunTecla(3, 4, 'ArrowRight'), 0);
  assert.equal(pestanaSegunTecla(0, 4, 'ArrowLeft'), 3);
});

test('pestañas: Inicio y Fin; otra tecla no hace nada', () => {
  assert.equal(pestanaSegunTecla(2, 4, 'Home'), 0);
  assert.equal(pestanaSegunTecla(1, 4, 'End'), 3);
  assert.equal(pestanaSegunTecla(1, 4, 'a'), null);
  assert.equal(pestanaSegunTecla(0, 0, 'ArrowRight'), null);
});

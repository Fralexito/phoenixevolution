import test from 'node:test';
import assert from 'node:assert/strict';
import { suavizar, duracionPara, valorEn } from '../src/js/core/contador.js';

test('contador: la curva va de 0 a 1 y solo crece', () => {
  assert.equal(suavizar(0), 0);
  assert.equal(suavizar(1), 1);
  assert.equal(suavizar(2), 1);
  let ant = -1;
  for (let i = 0; i <= 20; i++) { const v = suavizar(i / 20); assert.ok(v >= ant); ant = v; }
  assert.ok(suavizar(0.5) > 0.9, 'ease-out: a mitad de tiempo ya casi llegó');
});

test('contador: duración acotada entre 600 y 1400 ms', () => {
  assert.equal(duracionPara(0), 760);
  assert.ok(duracionPara(5) >= 600);
  assert.equal(duracionPara(10 ** 12), 1400);
  assert.equal(duracionPara(NaN), 760);
});

test('contador: valor en el tiempo', () => {
  assert.equal(valorEn(120, 0), 0);
  assert.equal(valorEn(120, -5), 0);
  assert.equal(valorEn(120, 99999), 120);
  assert.equal(valorEn(120, duracionPara(120)), 120);
  const medio = valorEn(120, 300); assert.ok(medio > 0 && medio <= 120);
  assert.equal(valorEn(0, 500), 0);
  assert.equal(valorEn(7.9, 99999), 7, 'se trunca a entero como cifra()');
});

test('contador: valores inválidos devuelven null (el texto se queda en «—»)', () => {
  assert.equal(valorEn(NaN, 100), null);
  assert.equal(valorEn(-3, 100), null);
  assert.equal(valorEn(undefined, 100), null);
  assert.equal(valorEn(Infinity, 100), null);
});

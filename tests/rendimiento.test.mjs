import test from 'node:test';
import assert from 'node:assert/strict';
import { senalDebil, vaLento, leerDecision, guardarDecision, CADUCA_MS, MIN_CUADROS } from '../src/js/core/rendimiento.js';
import { movimientoReducido } from '../src/js/core/ajustes.js';
test('señales débiles: ahorro de datos, ≤2 GB, red 2G', () => {
  assert.equal(senalDebil({ saveData: true }), true); assert.equal(senalDebil({ memoria: 2 }), true); assert.equal(senalDebil({ memoria: 0.5 }), true);
  assert.equal(senalDebil({ tipoRed: '2g' }), true); assert.equal(senalDebil({ tipoRed: 'slow-2g' }), true);
  assert.equal(senalDebil({ memoria: 4, tipoRed: '4g' }), false); assert.equal(senalDebil({}), false); assert.equal(senalDebil(), false); assert.equal(senalDebil({ memoria: null }), false);
});
test('vaLento: sin datos suficientes no opina; con tirones sí', () => {
  assert.equal(vaLento([16, 16]), null); assert.equal(vaLento(null), null);
  assert.equal(vaLento(Array(MIN_CUADROS).fill(16.7)), false);
  assert.equal(vaLento(Array(MIN_CUADROS).fill(50)), true);
  const mix = [...Array(40).fill(16), ...Array(10).fill(60)]; assert.equal(vaLento(mix), false);          // 20 % de tirones: aún bien
  const mix2 = [...Array(37).fill(16), ...Array(13).fill(60)]; assert.equal(vaLento(mix2), true);         // 26 %: va justo
});
test('vaLento ignora pausas largas (pestaña oculta)', () => { const c = [...Array(MIN_CUADROS).fill(16), 5000, 8000]; assert.equal(vaLento(c), false); });
test('decisión guardada: vigente, caducada, rota, hora rara', () => {
  const ahora = 1_000_000_000_000;
  assert.equal(leerDecision(guardarDecision(true, ahora), ahora + 1000), true);
  assert.equal(leerDecision(guardarDecision(false, ahora), ahora + 1000), false);
  assert.equal(leerDecision(guardarDecision(true, ahora), ahora + CADUCA_MS + 1), null);
  assert.equal(leerDecision(guardarDecision(true, ahora), ahora - 3600_000), null);
  assert.equal(leerDecision('basura'), null); assert.equal(leerDecision(null), null); assert.equal(leerDecision('{"v":7,"t":1}', 2), null);
});
test('modo ligero cuenta como «menos movimiento» solo si el ajuste es «sistema»', () => {
  assert.equal(movimientoReducido({ movimiento: 'sistema' }, false, true), true);
  assert.equal(movimientoReducido({ movimiento: 'sistema' }, false, false), false);
  assert.equal(movimientoReducido({ movimiento: 'normal' }, true, true), false);     // «Siempre activas» manda
  assert.equal(movimientoReducido({ movimiento: 'reducido' }, false, false), true);
});

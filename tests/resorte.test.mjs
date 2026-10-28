import test from 'node:test';
import assert from 'node:assert/strict';
import { simular, proyectar, elastico, velocidad, constantes } from '../src/js/core/sistema/resorte.js';

test('resorte: sin rebote llega sin pasarse; con rebote se pasa un poco y vuelve', () => {
  const a = simular(0, 100, { amortiguacion: 1, respuesta: 0.35 });
  assert.ok(Math.max(...a) <= 100.5, 'no se pasa'); assert.ok(Math.abs(a.at(-1) - 100) < 0.5);
  assert.ok(a.length < 60, `se queda quieto en menos de 1 s (${a.length} cuadros)`);
  const b = simular(0, 100, { amortiguacion: 0.8, respuesta: 0.3 });
  assert.ok(Math.max(...b) > 100.5, 'rebota'); assert.ok(Math.abs(b.at(-1) - 100) < 0.5);
});
test('resorte: hereda la velocidad (un lanzamiento hacia afuera se aleja antes de volver)', () => {
  const c = simular(0, 0, { velocidad: 2000, amortiguacion: 1, respuesta: 0.3 });
  assert.ok(Math.max(...c) > 20); assert.ok(Math.abs(c.at(-1)) < 0.5);
});
test('proyectar, elástico y velocidad', () => {
  assert.equal(Math.round(proyectar(1000)), 499);
  assert.equal(proyectar(0), 0);
  assert.ok(elastico(100, 400) < 100 && elastico(100, 400) > 0);
  assert.ok(elastico(1000, 400) < 400 && elastico(5000, 400) < 400);   // nunca pasa el largo del borde
  assert.equal(elastico(-50, 400), -elastico(50, 400));
  assert.equal(velocidad([{ t: 0, x: 0 }, { t: 50, x: 50 }, { t: 100, x: 100 }]), 1000);
  assert.equal(velocidad([{ t: 0, x: 0 }, { t: 500, x: 10 }, { t: 600, x: 110 }]), 1000);
  assert.equal(velocidad([]), 0);
  assert.ok(constantes({ respuesta: 0.3 }).rigidez > constantes({ respuesta: 0.6 }).rigidez);
});

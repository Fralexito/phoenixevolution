import test from 'node:test';
import assert from 'node:assert/strict';
import { deISO, aISO, cuadricula, moverMes, fueraDeRango, deHora, minutos, diasEnMes, fechaCorta } from '../src/js/core/sistema/cuadriculaFechas.js';

test('calendario: leer y escribir fechas', () => {
  assert.deepEqual(deISO('2026-10-27'), { y: 2026, m: 10, d: 27 });
  assert.deepEqual(deISO('2026-10-27T21:30'), { y: 2026, m: 10, d: 27 });
  assert.deepEqual(deISO('2026-02'), { y: 2026, m: 2, d: 1 });
  assert.equal(deISO('2026-02-30'), null); assert.equal(deISO(''), null); assert.equal(deISO('hola'), null);
  assert.equal(aISO(2026, 3, 5), '2026-03-05');
  assert.equal(diasEnMes(2028, 2), 29); assert.equal(diasEnMes(2026, 2), 28);
  assert.equal(fechaCorta({ y: 2026, m: 10, d: 27 }), '27 oct 2026');
});
test('calendario: cuadrícula de 42 casillas que empieza el lunes', () => {
  const c = cuadricula(2026, 10);   // 1-oct-2026 es jueves
  assert.equal(c.length, 42);
  assert.deepEqual(c[0], { y: 2026, m: 9, d: 28, fuera: true });
  assert.deepEqual(c[3], { y: 2026, m: 10, d: 1, fuera: false });
  assert.equal(c.filter((x) => !x.fuera).length, 31);
  assert.deepEqual(c[41].fuera, true);
  assert.deepEqual(cuadricula(2026, 6)[0], { y: 2026, m: 6, d: 1, fuera: false });   // 1-jun-2026 es lunes
});
test('calendario: mover mes, rango y horas', () => {
  assert.deepEqual(moverMes(2026, 12, 1), { y: 2027, m: 1 });
  assert.deepEqual(moverMes(2026, 1, -1), { y: 2025, m: 12 });
  assert.equal(fueraDeRango('2026-10-27', '2026-11-01', ''), true);
  assert.equal(fueraDeRango('2026-10-27', '2026-10-01T10:00', '2026-12-31'), false);
  assert.equal(fueraDeRango('2026-10', '', '2026-09-30'), true);
  assert.deepEqual(deHora('09:05'), { h: 9, mi: 5 }); assert.equal(deHora('25:00'), null);
  assert.equal(minutos().length, 60); assert.deepEqual(minutos(900), [0, 15, 30, 45]);
});

import { test } from 'node:test';
import assert from 'node:assert/strict';
import { ordenDe, segundosRestantes, reloj, tablero, parsearOpciones } from '../src/js/core/competicion/draft.js';

test('ordenDe: normal y serpiente', () => {
  assert.deepEqual([0, 1, 2, 3, 4, 5].map((n) => ordenDe(n, 3, false)), [0, 1, 2, 0, 1, 2]);
  assert.deepEqual([0, 1, 2, 3, 4, 5, 6].map((n) => ordenDe(n, 3, true)), [0, 1, 2, 2, 1, 0, 0]);
  assert.equal(ordenDe(0, 0, true), null); assert.equal(ordenDe(-1, 3, true), null);
});

test('segundosRestantes corrige el reloj del celular', () => {
  const d = { estado: 'en_vivo', ahora: '2026-10-25T12:00:00Z', vence: '2026-10-25T12:00:30Z' };
  const recibido = new Date('2026-10-25T11:59:00Z').getTime();          // el celular va 60 s atrasado
  assert.equal(segundosRestantes(d, recibido, recibido + 10_000), 20);
  assert.equal(segundosRestantes(d, recibido, recibido + 99_000), 0);
  assert.equal(segundosRestantes({ estado: 'pausado', restante_pausa: 42 }), 42);
  assert.equal(segundosRestantes({ estado: 'terminado' }), null);
  assert.equal(reloj(75), '1:15'); assert.equal(reloj(null), '—');
});

test('tablero: celdas en el orden de cada ronda', () => {
  const d = { rondas: 2, serpiente: true, turno: 2, estado: 'en_vivo', participantes: [{ orden: 0 }, { orden: 1 }],
    picks: [{ n: 0, nombre: 'Messi' }, { n: 1, nombre: 'Kane' }] };
  const t = tablero(d);
  assert.equal(t[0][0].pick.nombre, 'Messi'); assert.equal(t[0][1].pick.nombre, 'Kane');
  assert.equal(t[1][1].n, 2); assert.ok(t[1][1].actual);        // serpiente: la ronda 2 empieza el segundo
  assert.equal(t[1][0].n, 3);
  assert.deepEqual(tablero({}), []);
});

test('parsearOpciones', () => {
  assert.deepEqual(parsearOpciones('Perú\n brasil , Brasil;<b>x</b>\n\n  Argentina  '), ['Perú', 'brasil', 'Argentina']);
  assert.deepEqual(parsearOpciones(null), []);
});

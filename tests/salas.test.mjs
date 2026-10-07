// Pruebas de core/salas.js (reglas puras de «Salas en vivo»).
import { test } from 'node:test';
import assert from 'node:assert/strict';
import { saludSala, ordenarSalas, aplicarCambioSala, mostrarCodigoPC, limpiarParsecId, segundosRestantes } from '../src/js/core/salas.js';

const AHORA = Date.parse('2026-10-06T20:00:00Z');
const hace = (s) => new Date(AHORA - s * 1000).toISOString();

test('saludSala: viva, en partido, inestable (>90 s), cerrada y caída', () => {
  assert.equal(saludSala({ estado: 'abierta', latido: hace(20) }, AHORA), 'viva');
  assert.equal(saludSala({ estado: 'en_partida', latido: hace(20) }, AHORA), 'en_partida');
  assert.equal(saludSala({ estado: 'abierta', latido: hace(95) }, AHORA), 'inestable');
  assert.equal(saludSala({ estado: 'cerrada' }, AHORA), 'cerrada');
  assert.equal(saludSala({ estado: 'caida' }, AHORA), 'caida');
  assert.equal(saludSala(null, AHORA), 'cerrada');
});

test('ordenarSalas: con plazas primero, inestables al fondo, luego las más nuevas', () => {
  const l = ordenarSalas([
    { id: 'llena', estado: 'abierta', plazas_libres: 0, latido: hace(5), abierta_en: hace(10) },
    { id: 'inestable', estado: 'abierta', plazas_libres: 2, latido: hace(200), abierta_en: hace(5) },
    { id: 'vieja', estado: 'abierta', plazas_libres: 1, latido: hace(5), abierta_en: hace(500) },
    { id: 'nueva', estado: 'abierta', plazas_libres: 1, latido: hace(5), abierta_en: hace(30) },
  ], AHORA);
  assert.deepEqual(l.map((s) => s.id), ['nueva', 'vieja', 'llena', 'inestable']);
});

test('aplicarCambioSala: inserta, actualiza conservando campos y quita las que se cierran', () => {
  let l = aplicarCambioSala([], { eventType: 'INSERT', new: { id: 'a', estado: 'abierta', plazas_libres: 2 } });
  l = aplicarCambioSala(l, { eventType: 'UPDATE', new: { id: 'a', estado: 'en_partida' } });
  assert.deepEqual(l, [{ id: 'a', estado: 'en_partida', plazas_libres: 2 }]);
  l = aplicarCambioSala(l, { eventType: 'UPDATE', new: { id: 'a', estado: 'cerrada' } });
  assert.deepEqual(l, []);
  assert.deepEqual(aplicarCambioSala([{ id: 'b', estado: 'abierta' }], { eventType: 'DELETE', old: { id: 'b' } }), []);
});

test('utilidades de códigos y Parsec', () => {
  assert.equal(mostrarCodigoPC('482915'), '482 915');
  assert.equal(mostrarCodigoPC('48291'), '');
  assert.equal(limpiarParsecId(' 1234 5678 '), '12345678');
  assert.equal(limpiarParsecId('abc'), null);
  assert.equal(segundosRestantes(new Date(AHORA + 90_500).toISOString(), AHORA), 90);
  assert.equal(segundosRestantes(hace(10), AHORA), 0);
});

import { pildoraSemaforo, textoErrorUnirse } from '../src/js/core/salas.js';
test('pildoraSemaforo y textoErrorUnirse (067)', () => {
  assert.equal(pildoraSemaforo({ color: 'verde', ping_ms: 41.6, fuente: 'par' }).texto, '42 ms');
  assert.match(pildoraSemaforo({ color: 'rojo', ping_ms: 140 }).clase, /rose/);
  assert.equal(pildoraSemaforo(null).texto, 'Ping ?');
  assert.equal(pildoraSemaforo({ fuente: 'sin_datos', ping_ms: null }).texto, 'Ping ?');
  assert.match(textoErrorUnirse('SALA_OCUPADA'), /antes que tú/);
  assert.match(textoErrorUnirse('algo raro'), /Reintenta/);
});

import { test } from 'node:test';
import assert from 'node:assert/strict';
import { estadoDe, nivelPing, haceCuanto, prepararHosts, resumenTexto } from '../src/js/core/comunidad/estadoHosts.js';

const AHORA = new Date('2026-10-25T12:00:00Z');

test('estadoDe: desconocido → apagado', () => {
  assert.equal(estadoDe('sala_abierta').texto, 'Sala abierta');
  assert.equal(estadoDe('raro').texto, 'Apagado');
});

test('nivelPing: cortes y sin datos', () => {
  assert.equal(nivelPing(30).nivel, 'bien');
  assert.equal(nivelPing(80).nivel, 'regular');
  assert.equal(nivelPing(200).nivel, 'malo');
  assert.equal(nivelPing(null).nivel, 'sin');
  assert.equal(nivelPing(NaN).nivel, 'sin');
});

test('haceCuanto', () => {
  assert.equal(haceCuanto('2026-10-25T11:58:00Z', AHORA), 'hace un momento');
  assert.equal(haceCuanto('2026-10-25T11:40:00Z', AHORA), 'hace 20 min');
  assert.equal(haceCuanto('2026-10-25T09:00:00Z', AHORA), 'hace 3 h');
  assert.equal(haceCuanto('2026-10-24T12:00:00Z', AHORA), 'hace 1 día');
  assert.equal(haceCuanto('mal', AHORA), 'sin datos');
  assert.equal(haceCuanto('2026-10-25T13:00:00Z', AHORA), 'hace un momento');
});

test('prepararHosts: filtra basura, ordena, resume', () => {
  const r = prepararHosts({ hosts: [
    { host: { id: 'a' }, estado: 'desconectado', visto: '2026-10-20T00:00:00Z' },
    { host: { id: 'b' }, estado: 'sala_abierta', ping_ms: 40 },
    { host: { id: 'c' }, estado: '???', ping_ms: 'x' },
    { host: { id: 'd' }, estado: 'conectado' },
    null, { estado: 'conectado' },
  ] });
  assert.deepEqual(r.lista.map((h) => h.host.id), ['b', 'd', 'a', 'c']);
  assert.equal(r.lista.at(-1).ping_ms, null);
  assert.equal(r.encendidos, 2); assert.equal(r.conSala, 1); assert.equal(r.total, 4);
  assert.equal(resumenTexto(r), '2 de 4 encendidos · 1 con sala abierta.');
  assert.equal(resumenTexto(prepararHosts(null)), 'Aún no hay hosts con Phoenix Link.');
  assert.equal(resumenTexto({ encendidos: 0, conSala: 0, total: 3 }), 'Ningún host encendido ahora (3 en total).');
});

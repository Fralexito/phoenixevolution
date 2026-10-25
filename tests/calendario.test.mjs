import { test } from 'node:test';
import assert from 'node:assert/strict';
import { fechaIcs, escaparIcs, plegar, prepararEventos, crearIcs, enlaceGoogle, avisoOmitidos } from '../src/js/core/sistema/calendario.js';

const AHORA = new Date('2026-10-25T12:00:00Z');

test('fechaIcs: UTC con Z; inválida → null', () => {
  assert.equal(fechaIcs('2026-10-25T18:30:00-05:00'), '20261025T233000Z');
  assert.equal(fechaIcs('no es fecha'), null);
  assert.equal(fechaIcs(null), null);
});

test('escaparIcs y plegar: comas, punto y coma, saltos y emojis sin romper', () => {
  assert.equal(escaparIcs('a,b;c\\d\ne'), 'a\\,b\\;c\\\\d\\ne');
  assert.equal(escaparIcs('ok\u0007'), 'ok');
  const larga = 'SUMMARY:' + '⚽'.repeat(40);
  const p = plegar(larga);
  for (const l of p.split('\r\n')) assert.ok(new TextEncoder().encode(l).length <= 75);
  assert.equal(p.replace(/\r\n /g, ''), larga);
});

test('prepararEventos: fuera los sin hora, los pasados y los repetidos; ordena', () => {
  const r = prepararEventos([
    { uid: 'b', titulo: 'B', inicio: '2026-10-27T00:00:00Z' },
    { uid: 'a', titulo: 'A', inicio: '2026-10-26T00:00:00Z' },
    { uid: 'a', titulo: 'A otra vez', inicio: '2026-10-26T00:00:00Z' },
    { uid: 'c', titulo: 'Sin hora', inicio: null },
    { uid: 'd', titulo: 'Viejo', inicio: '2026-10-20T00:00:00Z' },
    { titulo: 'sin uid', inicio: '2026-10-28T00:00:00Z' },
    null,
  ], AHORA);
  assert.deepEqual(r.validos.map((e) => e.uid), ['a', 'b']);
  assert.equal(r.sinHora, 1);
  assert.equal(r.pasados, 1);
  assert.equal(avisoOmitidos(r), 'No se añadieron: 1 sin hora fija y 1 ya pasó.');
  assert.equal(avisoOmitidos({ sinHora: 0, pasados: 0 }), '');
});

test('prepararEventos: un partido que empezó hace 10 min (aún no termina) se queda', () => {
  const r = prepararEventos([{ uid: 'x', titulo: 'X', inicio: '2026-10-25T11:50:00Z' }], AHORA);
  assert.equal(r.validos.length, 1);
});

test('crearIcs: estructura válida, UID fijo, aviso 30 min, URL solo https', () => {
  const ics = crearIcs([{ uid: 'duelo-7', titulo: 'Duelo: Ana vs Beto', inicio: '2026-10-26T01:00:00Z', descripcion: 'PES 2021, 1v1', url: 'https://x.y/z' },
    { uid: 'ev-1', titulo: 'Evento', inicio: '2026-10-27T01:00:00Z', url: 'javascript:alert(1)' }], { ahora: AHORA });
  assert.ok(ics.startsWith('BEGIN:VCALENDAR\r\n'));
  assert.ok(ics.endsWith('END:VCALENDAR\r\n'));
  assert.equal((ics.match(/BEGIN:VEVENT/g) ?? []).length, 2);
  assert.match(ics, /UID:duelo-7@phoenixevolution/);
  assert.match(ics, /DTSTART:20261026T010000Z/);
  assert.match(ics, /DTEND:20261026T013000Z/);
  assert.match(ics, /TRIGGER:-PT30M/);
  assert.match(ics, /DESCRIPTION:PES 2021\\, 1v1/);
  assert.equal((ics.match(/URL:/g) ?? []).length, 1);
  assert.equal(crearIcs([{ uid: 'v', inicio: '2020-01-01' }], { ahora: AHORA }), null);
});

test('enlaceGoogle: fechas y textos codificados; null sin hora', () => {
  const u = enlaceGoogle({ titulo: 'Duelo & más', inicio: '2026-10-26T01:00:00Z', minutos: 45 });
  assert.ok(u.startsWith('https://calendar.google.com/calendar/render?'));
  const q = new URL(u).searchParams;
  assert.equal(q.get('dates'), '20261026T010000Z/20261026T014500Z');
  assert.equal(q.get('text'), 'Duelo & más');
  assert.equal(enlaceGoogle({ titulo: 'x', inicio: 'mal' }), null);
});

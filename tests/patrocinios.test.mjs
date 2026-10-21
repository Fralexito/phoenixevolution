import { test } from 'node:test';
import assert from 'node:assert/strict';
import { validarPatrocinio, vigente, patrociniosDe } from '../src/js/core/economia/patrocinios.js';

const ok = { tipo: 'torneo', objetivo: 12, nombre: 'Tienda Gamer', logo: 'https://x.com/l.png', enlace: '', desde: '2026-10-21', hasta: '' };
test('validarPatrocinio: acepta lo correcto y explica cada error', () => {
  assert.equal(validarPatrocinio(ok), null);
  assert.match(validarPatrocinio({ ...ok, tipo: 'sitio' }), /torneo o un clan/);
  assert.match(validarPatrocinio({ ...ok, objetivo: 'abc' }), /número del torneo/);
  assert.match(validarPatrocinio({ ...ok, tipo: 'clan', objetivo: 0 }), /número del clan/);
  assert.match(validarPatrocinio({ ...ok, nombre: '  ' }), /nombre/);
  assert.match(validarPatrocinio({ ...ok, logo: 'http://x.com/l.png' }), /https/);
  assert.match(validarPatrocinio({ ...ok, enlace: 'javascript:alert(1)' }), /https/);
  assert.match(validarPatrocinio({ ...ok, hasta: '2026-10-01' }), /antes/);
  assert.match(validarPatrocinio(null), /torneo o un clan/);
});
test('vigente: activo y dentro de las fechas', () => {
  assert.equal(vigente({ activo: true, desde: '2026-10-01', hasta: null }, '2026-10-21'), true);
  assert.equal(vigente({ activo: true, desde: '2026-11-01' }, '2026-10-21'), false);
  assert.equal(vigente({ activo: true, desde: '2026-10-01', hasta: '2026-10-20' }, '2026-10-21'), false);
  assert.equal(vigente({ activo: false, desde: '2026-10-01' }, '2026-10-21'), false);
});
test('patrociniosDe: solo los de ese torneo o clan, recientes primero, máx. 3', () => {
  const l = [1, 2, 3, 4].map((i) => ({ id: i, tipo: 'torneo', objetivo_id: 5, desde: `2026-10-0${i}` })).concat([{ id: 9, tipo: 'clan', objetivo_id: 5, desde: '2026-10-09' }]);
  assert.deepEqual(patrociniosDe(l, 'torneo', '5').map((p) => p.id), [4, 3, 2]);
  assert.deepEqual(patrociniosDe(l, 'clan', 5).map((p) => p.id), [9]);
  assert.deepEqual(patrociniosDe(null, 'clan', 5), []);
});

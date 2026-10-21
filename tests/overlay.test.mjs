import { test } from 'node:test';
import assert from 'node:assert/strict';
import { resumenOverlay, marcadorTexto } from '../src/js/core/competicion/overlay.js';

const P = [
  { clave: 'r1-1', orden: 1, a_nombre: 'Ana', b_nombre: 'Beto', ga: 2, gb: 1, ganador: 'a', jugado: true, jugado_en: '2026-10-21T10:00:00Z' },
  { clave: 'r1-2', orden: 2, a_nombre: 'Caro', b_nombre: 'Dani', ga: 0, gb: 3, ganador: 'b', jugado: true, jugado_en: '2026-10-21T11:00:00Z' },
  { clave: 'r2-1', orden: 3, a_nombre: 'Ana', b_nombre: 'Dani', jugado: false },
  { clave: 'r3-1', orden: 4, a_nombre: null, b_nombre: null, jugado: false },
];
test('resumenOverlay: último resultado, próximos con los dos jugadores y progreso', () => {
  const r = resumenOverlay({ estado: 'en_curso', formato: 'eliminacion' }, P);
  assert.equal(r.fase, 'en_curso');
  assert.equal(r.ultimo.clave, 'r1-2');
  assert.deepEqual(r.recientes.map((p) => p.clave), ['r1-1']);
  assert.deepEqual(r.proximos.map((p) => p.clave), ['r2-1']);
  assert.deepEqual(r.progreso, { jugados: 2, total: 4, pct: 50 });
  assert.equal(r.campeon, null);
});
test('resumenOverlay: terminado muestra el campeón guardado; sin datos no rompe', () => {
  assert.equal(resumenOverlay({ estado: 'terminado', campeon: 'Dani' }, P).campeon, 'Dani');
  const v = resumenOverlay(null, null);
  assert.equal(v.fase, 'otro'); assert.equal(v.ultimo, null); assert.deepEqual(v.proximos, []);
});
test('marcadorTexto: jugado, por jugar y empate con quien pasa', () => {
  assert.equal(marcadorTexto(P[0]), 'Ana 2 – 1 Beto');
  assert.equal(marcadorTexto(P[2]), 'Ana vs Dani');
  assert.equal(marcadorTexto({ a_nombre: 'X', b_nombre: 'Y', ga: 1, gb: 1, ganador: 'b', jugado: true }), 'X 1 – 1 Y (pasa Y)');
  assert.equal(marcadorTexto(null), '');
});

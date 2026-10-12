import test from 'node:test';
import assert from 'node:assert/strict';
import { normalizarCampo, etiquetaFase, textoPosesion, resumenTanda, faltaCampo, pasoInterpolado, SIN_CAMPO_MS } from '../src/js/core/campoVivo.js';

const base = { v: 1, j: [[0, 0, 0], [10.5, -3, 1], [-52, 35, 2]], b: [1, 2, 0.4], equipos: true, posesion: [56, 44] };

test('campoVivo: mensaje bueno se normaliza', () => {
  const n = normalizarCampo(base);
  assert.equal(n.j.length, 3);
  assert.deepEqual(n.b, [1, 2, 0.4]);
  assert.deepEqual(n.posesion, [56, 44]);
  assert.equal(n.fase, 'vivo');
  assert.equal(n.equipos, true);
});

test('campoVivo: basura se rechaza sin lanzar', () => {
  assert.equal(normalizarCampo(null), null);
  assert.equal(normalizarCampo({ j: 'x' }), null);
  assert.equal(normalizarCampo({ j: [[999, 0, 0]] }), null);
  assert.equal(normalizarCampo({ j: Array(31).fill([0, 0, 0]) }), null);
  assert.equal(normalizarCampo({ j: [[NaN, 0, 0]] }), null);
});

test('campoVivo: equipo raro = -1, balón nulo, fase y tanda', () => {
  const n = normalizarCampo({ j: [[1, 1, 9]], b: null, fase: 'repeticion', t: { l: [[0, true], [1, 0], [2, 1]], e: 1, listo: true } });
  assert.equal(n.j[0][2], -1);
  assert.equal(n.b, null);
  assert.equal(n.fase, 'repeticion');
  assert.deepEqual(n.t.l, [[0, 1], [1, 0]]);
  assert.equal(n.t.e, 1);
  assert.equal(normalizarCampo({ j: [], fase: 'rara' }).fase, 'vivo');
  assert.equal(normalizarCampo({ j: [], posesion: [50, 200] }).posesion, null);
});

test('campoVivo: etiquetas y textos', () => {
  assert.equal(etiquetaFase('repeticion'), 'REPETICIÓN');
  assert.equal(etiquetaFase('pausa'), 'PAUSA');
  assert.equal(etiquetaFase('vivo'), '');
  assert.equal(textoPosesion(null), 'calculando…');
  assert.equal(textoPosesion([55.3, 44.7]), '55 % · 45 %');
  assert.deepEqual(resumenTanda({ l: [[0, 1], [1, 0], [0, 0]] }), { 0: [true, false], 1: [false] });
  assert.deepEqual(resumenTanda(null), { 0: [], 1: [] });
});

test('campoVivo: aviso de campo ausente y interpolación', () => {
  assert.equal(faltaCampo(0, 0, SIN_CAMPO_MS - 1), false);
  assert.equal(faltaCampo(0, 0, SIN_CAMPO_MS), true);
  assert.equal(faltaCampo(0, 100, SIN_CAMPO_MS * 3), false);
  assert.deepEqual(pasoInterpolado(null, [3, 4], 0.016), [3, 4]);
  assert.deepEqual(pasoInterpolado([0, 0], [40, 0], 0.016), [40, 0]);   // salto grande: directo
  const p = pasoInterpolado([0, 0], [2, 0], 0.3);
  assert.ok(p[0] > 1.2 && p[0] < 1.4);
});

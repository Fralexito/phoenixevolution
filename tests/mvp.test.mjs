import { test } from 'node:test';
import assert from 'node:assert/strict';
import { cierreTexto, vistaMvp, mvpPerfil } from '../src/js/core/competicion/mvp.js';

const AHORA = new Date('2026-10-25T12:00:00Z');
const base = { candidatos: [{ id: 'a', nombre: 'Ana' }, { id: 'b', nombre: 'Beto' }, null], votos_total: 1, votantes_total: 3 };

test('cierreTexto', () => {
  assert.equal(cierreTexto('2026-10-25T17:00:00Z', AHORA), 'Cierra en 5 h');
  assert.equal(cierreTexto('2026-10-25T12:40:00Z', AHORA), 'Cierra en 40 min');
  assert.equal(cierreTexto('2026-10-25T11:00:00Z', AHORA), 'Votación cerrada');
  assert.equal(cierreTexto('x', AHORA), '');
});

test('vistaMvp: abierta', () => {
  const v = vistaMvp({ ...base, abierta: true, puedo_votar: true, mi_voto: 'b' }, 'a');
  assert.equal(v.tipo, 'votar'); assert.equal(v.candidatos.length, 2);
  assert.ok(v.candidatos[0].soyYo); assert.ok(v.candidatos[1].elegido); assert.ok(v.yaVote);
  assert.equal(v.progreso, '1 de 3 votaron');
  assert.equal(vistaMvp({ ...base, abierta: true, puedo_votar: false }, 'z').tipo, 'mirar');
});

test('vistaMvp: cerrada', () => {
  assert.equal(vistaMvp({ ...base, abierta: false, mvp: { id: 'a' } }, 'a').soyMvp, true);
  assert.equal(vistaMvp({ ...base, abierta: false, mvp: null }, 'a').tipo, 'empate');
  assert.equal(vistaMvp({ ...base, abierta: false, votos_total: 0 }, 'a').tipo, 'sin_votos');
  assert.equal(vistaMvp(null).tipo, 'nada');
});

test('mvpPerfil', () => {
  assert.equal(mvpPerfil(3), 'MVP ×3'); assert.equal(mvpPerfil(0), ''); assert.equal(mvpPerfil(null), '');
});

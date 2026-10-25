import { test } from 'node:test';
import assert from 'node:assert/strict';
import { vistaSerie, validarReto, puedeRetar, estadoSerie } from '../src/js/core/comunidad/clanSeries.js';

const s = { id: 1, a: { id: 10, nombre: 'Fénix' }, b: { id: 20, nombre: 'Lobos' }, puntos_a: 2, puntos_b: 1, jugados: 3, mejor_de: 3, mayoria: 2 };

test('vistaSerie: ganador desde cada lado', () => {
  assert.equal(vistaSerie({ ...s, estado: 'terminada', ganador: 10 }, 10).resultado, '¡Ganó tu clan!');
  assert.equal(vistaSerie({ ...s, estado: 'terminada', ganador: 10 }, 20).resultado, 'Perdió tu clan');
  assert.equal(vistaSerie({ ...s, estado: 'terminada', ganador: 10 }, null).resultado, 'Ganó Fénix');
  assert.equal(vistaSerie({ ...s, estado: 'terminada', ganador: null }, 10).resultado, 'Empate');
  assert.equal(vistaSerie({ ...s, estado: 'en_juego' }, 10).meta, 'Al mejor de 3 · gana con 2 · 3 jugados');
  assert.equal(vistaSerie(null), null);
});
test('validarReto', () => {
  assert.equal(validarReto({ rival: '20', mejorDe: '3', plazo: '14' }, 10).ok, true);
  assert.equal(validarReto({ rival: '10', mejorDe: '3', plazo: '14' }, 10).ok, false);
  assert.equal(validarReto({ rival: '20', mejorDe: '4', plazo: '14' }, 10).ok, false);
  assert.equal(validarReto({ rival: '20', mejorDe: '3', plazo: '9' }, 10).ok, false);
  assert.equal(validarReto({ rival: '20', mejorDe: '3', plazo: '14', mensaje: '<b>' }, 10).ok, false);
  assert.equal(validarReto({ rival: '', mejorDe: '3', plazo: '14' }, 10).ok, false);
});
test('puedeRetar y estado desconocido', () => {
  assert.equal(puedeRetar('subcapitan'), true); assert.equal(puedeRetar('miembro'), false);
  assert.equal(estadoSerie('raro').texto, 'Cancelada');
});

import test from 'node:test';
import assert from 'node:assert/strict';
import { siguienteHabilitada, primeraHabilitada, ultimaHabilitada, buscarPorTexto } from '../src/js/core/sistema/listaOpciones.js';

const ops = [{ texto: 'Fecha 1', desactivada: true }, { texto: 'Fecha 2' }, { texto: 'Árbitro' }, { texto: 'Fecha 3', desactivada: true }, { texto: 'Final' }];
test('selector: saltar opciones desactivadas', () => {
  assert.equal(siguienteHabilitada(ops, 1, 1), 2);
  assert.equal(siguienteHabilitada(ops, 2, 1), 4);
  assert.equal(siguienteHabilitada(ops, 4, 1), 4);
  assert.equal(siguienteHabilitada(ops, 1, -1), 1);
  assert.equal(primeraHabilitada(ops), 1); assert.equal(ultimaHabilitada(ops), 4);
  assert.equal(primeraHabilitada([{ desactivada: true }]), -1);
});
test('selector: buscar al teclear (sin tildes, da la vuelta)', () => {
  assert.equal(buscarPorTexto(ops, 'a'), 2);
  assert.equal(buscarPorTexto(ops, 'f', 1), 4);
  assert.equal(buscarPorTexto(ops, 'f', 4), 1);
  assert.equal(buscarPorTexto(ops, 'zz'), -1);
  assert.equal(buscarPorTexto([], 'a'), -1);
});

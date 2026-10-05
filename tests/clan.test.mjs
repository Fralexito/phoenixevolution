import test from 'node:test';
import assert from 'node:assert/strict';
import { validarClan, votosNecesarios, normalizarMiClan, normalizarClanLista, puede, restante, textoMotivo, LIMITES } from '../src/js/core/clan.js';

test('validarClan: acepta datos correctos y pasa la etiqueta a mayúsculas', () => {
  const r = validarClan({ nombre: ' Phoenix ', etiqueta: 'phx', descripcion: 'hola' });
  assert.deepEqual(r, { ok: true, valores: { nombre: 'Phoenix', etiqueta: 'PHX', descripcion: 'hola' } });
});
test('validarClan: rechaza nombre corto, etiqueta inválida y descripción larga', () => {
  assert.equal(validarClan({ nombre: 'ab', etiqueta: 'ABC' }).ok, false);
  assert.equal(validarClan({ nombre: 'Clan', etiqueta: 'A' }).ok, false);
  assert.equal(validarClan({ nombre: 'Clan', etiqueta: 'A B' }).ok, false);
  assert.equal(validarClan({ nombre: 'Clan', etiqueta: 'ABCDEF' }).ok, false);
  assert.equal(validarClan({ nombre: 'Clan', etiqueta: 'ABC', descripcion: 'x'.repeat(LIMITES.descripcionMax + 1) }).ok, false);
  assert.equal(validarClan().ok, false);
});
test('votosNecesarios coincide con la BD (más del 70 %)', () => {
  assert.deepEqual([1, 2, 3, 4, 5, 10].map(votosNecesarios), [1, 2, 3, 3, 4, 8]);
});
test('normalizarMiClan: sin clan y con clan, sin lanzar con datos raros', () => {
  assert.equal(normalizarMiClan(null).enClan, false);
  assert.deepEqual(normalizarMiClan({ clan: null, invitaciones: [{ id: 1, clan_id: 2, nombre: 'A<b>', etiqueta: 'AB', miembros: 3 }] }).invitaciones[0], { id: 1, clan: 2, nombre: 'Ab', etiqueta: 'AB', miembros: 3 });
  const m = normalizarMiClan({ clan: { id: 1, nombre: 'X', etiqueta: 'XX' }, mi_rol: 'raro', miembros: [{ usuario_id: 'u', username: 'a', rol: 'capitan', adulto: true }], votacion: { id: 1, motivo: 'otro', candidatos: [] } });
  assert.equal(m.rol, 'miembro'); assert.equal(m.miembros[0].rol, 'capitan'); assert.equal(m.votacion.motivo, 'vacante'); assert.equal(m.destitucion.pedidos, 0);
});
test('normalizarClanLista descarta basura', () => { assert.deepEqual(normalizarClanLista([null, {}, { id: 3, nombre: 'N', etiqueta: 'NN', miembros: '4' }]).map((c) => [c.id, c.miembros]), [[3, 4]]); assert.deepEqual(normalizarClanLista(null), []); });
test('puede: permisos de interfaz por rol', () => {
  assert.deepEqual(puede('capitan'), { invitar: true, responder: true, editar: true, nombrar: true, ceder: true, expulsar: true });
  assert.equal(puede('subcapitan').nombrar, false); assert.equal(puede('subcapitan').expulsar, true); assert.equal(puede('miembro').invitar, false);
});
test('restante y textoMotivo', () => {
  const t = Date.parse('2026-01-01T12:00:00Z');
  assert.equal(restante('2026-01-02T12:05:00Z', t), '24 h 5 min'); assert.equal(restante('2026-01-01T12:30:00Z', t), '30 min'); assert.equal(restante('2026-01-01T11:00:00Z', t), 'cerrando…'); assert.equal(restante('x', t), '');
  assert.match(textoMotivo('destitucion'), /destitución/i);
});

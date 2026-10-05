import test from 'node:test';
import assert from 'node:assert/strict';
import { validarValoracion, etiquetasPara, normalizarReputacion, normalizarPendientes, textoSello } from '../src/js/core/reputacion.js';

test('validarValoracion: reglas de estrellas y etiquetas (igual que la BD)', () => {
  assert.equal(validarValoracion({ estrellas: 5, etiquetas: ['puntual', 'deportivo'] }).ok, true);
  assert.equal(validarValoracion({ estrellas: 3 }).ok, true);
  assert.equal(validarValoracion({ estrellas: 0 }).ok, false);
  assert.equal(validarValoracion({ estrellas: 6 }).ok, false);
  assert.equal(validarValoracion({ estrellas: 2 }).ok, false);                           // exige etiqueta negativa
  assert.equal(validarValoracion({ estrellas: 1, etiquetas: ['insultos'] }).ok, true);
  assert.equal(validarValoracion({ estrellas: 1, etiquetas: ['insultos', 'puntual'] }).ok, false);
  assert.equal(validarValoracion({ estrellas: 5, etiquetas: ['lag'] }).ok, false);
  assert.equal(validarValoracion({ estrellas: 5, etiquetas: ['genial'] }).ok, false);
  assert.deepEqual(validarValoracion({ estrellas: 5, etiquetas: ['puntual', 'puntual'] }).valores.etiquetas, ['puntual']);
});
test('etiquetasPara según estrellas', () => {
  assert.deepEqual(etiquetasPara(0), []); assert.deepEqual(etiquetasPara(3), []);
  assert.equal(etiquetasPara(1)[0][0], 'lag'); assert.equal(etiquetasPara(5)[0][0], 'puntual');
});
test('normalizarReputacion: oculta si no es visible y no lanza con datos raros', () => {
  assert.equal(normalizarReputacion(null), null); assert.equal(normalizarReputacion({ visible: false }), null);
  const r = normalizarReputacion({ visible: true, valoraciones: '8', nivel: 'confiable', puntaje: 4.35, positivas: { puntual: 3, raro: 9 }, negativas: null });
  assert.equal(r.nivel, 'confiable'); assert.deepEqual(r.positivas.map((x) => x.id), ['puntual']); assert.deepEqual(r.negativas, []);
  assert.equal(normalizarReputacion({ visible: true, nivel: 'inventado' }).nivel, 'nuevo');
});
test('textoSello: «Nuevo» sin número; con puntaje, «4.4 ★ · Confiable»', () => {
  assert.equal(textoSello(normalizarReputacion({ visible: true, nivel: 'nuevo', puntaje: null })), 'Nuevo');
  assert.equal(textoSello(normalizarReputacion({ visible: true, nivel: 'confiable', puntaje: 4.35, valoraciones: 8 })), '4.3 ★ · Confiable'.replace('4.3', (4.35).toFixed(1)));
  assert.equal(textoSello(null), '');
});
test('normalizarPendientes descarta basura', () => { assert.deepEqual(normalizarPendientes([null, {}, { reto_id: 7, usuario_id: 'u', username: 'a<b>', nombre: 'N' }]), [{ reto: 7, usuario: 'u', username: 'ab', nombre: 'N', avatar: '' }]); assert.deepEqual(normalizarPendientes(undefined), []); });

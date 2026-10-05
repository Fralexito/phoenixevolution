import test from 'node:test';
import assert from 'node:assert/strict';
import { edadCumplida, categoriaDeEdad, validarNacimiento, debePedirFecha } from '../src/js/core/edad.js';

const hoy = new Date(2026, 9, 5);   // 5 oct 2026 (hora local)
test('edad cumplida: bordes de cumpleaños', () => {
  assert.equal(edadCumplida('2013-10-05', hoy), 13);   // hoy cumple 13
  assert.equal(edadCumplida('2013-10-06', hoy), 12);   // mañana cumple 13
  assert.equal(edadCumplida('2008-10-05', hoy), 18);
  assert.equal(edadCumplida('2008-10-06', hoy), 17);
  assert.equal(edadCumplida('2000-02-29', hoy), 26);   // bisiesto
  assert.equal(edadCumplida('2026-10-05', hoy), 0);
});
test('edad cumplida: fechas imposibles → NaN', () => {
  for (const f of ['2001-02-30', '2001-13-01', '2001-00-10', '', null, undefined, '05/10/2001', '2001-1-1', 'hoy']) assert.ok(Number.isNaN(edadCumplida(f, hoy)), String(f));
});
test('categorías', () => {
  assert.equal(categoriaDeEdad(12), 'bloqueado'); assert.equal(categoriaDeEdad(13), 'menor'); assert.equal(categoriaDeEdad(17), 'menor'); assert.equal(categoriaDeEdad(18), 'adulto');
});
test('validación del formulario', () => {
  assert.deepEqual(validarNacimiento('2000-05-01', hoy), { ok: true, iso: '2000-05-01', edad: 26, categoria: 'adulto', error: '' });
  assert.equal(validarNacimiento('2014-01-01', hoy).categoria, 'bloqueado');
  assert.equal(validarNacimiento('2010-01-01', hoy).categoria, 'menor');
  assert.equal(validarNacimiento('', hoy).ok, false);
  assert.equal(validarNacimiento('2027-01-01', hoy).ok, false);          // futura
  assert.equal(validarNacimiento('1900-01-01', hoy).ok, false);          // >100 años
});
test('solo se pide la fecha si el servidor dice claramente «no declarada»', () => {
  assert.equal(debePedirFecha({ declarada: false }), true);
  for (const r of [null, undefined, {}, { declarada: true }, { declarada: 'no' }]) assert.equal(debePedirFecha(r), false);
});

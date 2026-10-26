import test from 'node:test';
import assert from 'node:assert/strict';
import { datosFicha, lineaFicha, frasesRevisar, minutoConAnadido, textoPenales, leerReglas, reglasAFormulario } from '../src/js/core/competicion/fichaPartido.js';

test('ficha: códigos de Sider a texto', () => {
  assert.equal(lineaFicha({ estadio: 12, clima: 1, hora: 1, estacion: 1, duracion: 10 }), 'Estadio n.º 12 · Lluvia · De noche · Invierno · 10 min');
  assert.equal(lineaFicha({ estadio: 3, estadio_nombre: ' Monumental ', clima: 0, hora: 0 }), 'Monumental · Despejado · De día');
  assert.equal(lineaFicha({ clima: 7 }), 'código 7');                                       // código desconocido: no se inventa
  assert.equal(lineaFicha(null), '');
  assert.equal(lineaFicha([1]), '');
  assert.equal(lineaFicha({ clima: '1', duracion: 0 }), '');                                // texto o cero: se ignora
  assert.equal(datosFicha({ clima: 2 })[0].icono, 'fa-snowflake');
});

test('ficha: diferencias con las reglas', () => {
  assert.deepEqual(frasesRevisar([
    { campo: 'duracion', regla: 8, partido: 10 },
    { campo: 'prorroga', regla: true, partido: 0 },
    { campo: 'raro', regla: 1, partido: 2 }, null,
  ]), ['Duración: se jugó con 10 min; la edición pide 8 min.', 'Prórroga: se jugó con no; la edición pide sí.']);
  assert.deepEqual(frasesRevisar(undefined), []);
});

test('ficha: minuto con añadido y penales', () => {
  assert.equal(minutoConAnadido(47, 1, 3), '45+2′');
  assert.equal(minutoConAnadido(44, 1, 3), '44′');
  assert.equal(minutoConAnadido(93, 2, 4), '90+3′');
  assert.equal(minutoConAnadido(93, 2, 0), '93′');          // sin dato de añadido: como antes
  assert.equal(minutoConAnadido(50, 5, 2), '50′');           // penales: sin «+»
  assert.equal(textoPenales(4, 3), 'Penales 4-3');
  assert.equal(textoPenales(0, 0), '');
  assert.equal(textoPenales(null, 2), '');
});

test('ficha: formulario de reglas del staff', () => {
  assert.deepEqual(leerReglas({ duracion: '10', prorroga: 'no', penales: 'si' }), { ok: true, reglas: { duracion: 10, prorroga: false, penales: true } });
  assert.deepEqual(leerReglas({}), { ok: true, reglas: {} });
  assert.equal(leerReglas({ duracion: '0' }).ok, false);
  assert.equal(leerReglas({ cambios: '13' }).ok, false);
  assert.equal(leerReglas({ dificultad: 'x' }).ok, false);
  assert.deepEqual(reglasAFormulario({ duracion: 10, penales: false }), { duracion: '10', dificultad: '', cambios: '', prorroga: '', penales: 'no' });
  assert.deepEqual(leerReglas(reglasAFormulario({ duracion: 8, cambios: 5, prorroga: true })).reglas, { duracion: 8, cambios: 5, prorroga: true });
});

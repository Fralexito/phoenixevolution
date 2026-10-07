// Pruebas de core/chatFlotante.js (qué ventanas hay, cuántas caben, qué se recuerda entre páginas y orden de contactos).
import { test } from 'node:test';
import assert from 'node:assert/strict';
import { ventanasQueCaben, abrirVentana, cerrarVentana, minimizarVentana, ajustarACaben, leerEstado, ordenarContactos,
  noLeidosPorUsuario, debeAparecer, insignia, MAX_RECORDADAS } from '../src/js/core/chatFlotante.js';

const id = (n) => `00000000-0000-0000-0000-${String(n).padStart(12, '0')}`;

test('ventanasQueCaben: 1 en móvil, hasta 3 en pantallas anchas', () => {
  assert.equal(ventanasQueCaben(360), 1);
  assert.equal(ventanasQueCaben(700), 2);
  assert.equal(ventanasQueCaben(2000), 3);
  assert.equal(ventanasQueCaben(NaN), 1);
});

test('abrirVentana: al pasar el límite minimiza la abierta más antigua (no la cierra)', () => {
  let e = [];
  e = abrirVentana(e, id(1), 2); e = abrirVentana(e, id(2), 2); e = abrirVentana(e, id(3), 2);
  assert.deepEqual(e, [{ conv: id(1), min: true }, { conv: id(2), min: false }, { conv: id(3), min: false }]);
  e = abrirVentana(e, id(1), 2);                         // reabrir la minimizada: pasa al final y minimiza la siguiente más antigua
  assert.deepEqual(e.map((v) => [v.conv, v.min]), [[id(2), true], [id(3), false], [id(1), false]]);
});

test('abrir minimizada no desplaza a nadie; cerrar y minimizar', () => {
  let e = abrirVentana([], id(1), 1);
  e = abrirVentana(e, id(2), 1, { minimizada: true });
  assert.deepEqual(e, [{ conv: id(1), min: false }, { conv: id(2), min: true }]);
  assert.deepEqual(minimizarVentana(e, id(1))[0], { conv: id(1), min: true });
  assert.deepEqual(cerrarVentana(e, id(1)), [{ conv: id(2), min: true }]);
});

test('se recuerdan como mucho MAX_RECORDADAS', () => {
  let e = [];
  for (let i = 1; i <= MAX_RECORDADAS + 3; i++) e = abrirVentana(e, id(i), 3);
  assert.equal(e.length, MAX_RECORDADAS);
  assert.equal(e.at(-1).conv, id(MAX_RECORDADAS + 3));
  assert.equal(e.filter((v) => !v.min).length, 3);
});

test('ajustarACaben minimiza las sobrantes más antiguas', () => {
  const e = [{ conv: id(1), min: false }, { conv: id(2), min: false }, { conv: id(3), min: false }];
  assert.deepEqual(ajustarACaben(e, 1).map((v) => v.min), [true, true, false]);
});

test('leerEstado: tolera basura y duplicados', () => {
  assert.deepEqual(leerEstado('no json'), []);
  assert.deepEqual(leerEstado(JSON.stringify([{ conv: id(1), min: 1 }, { conv: id(1) }, { conv: 'x' }, null])), [{ conv: id(1), min: true }]);
});

test('ordenarContactos: en línea primero, luego con no leídos, luego por nombre', () => {
  const perfiles = new Map([['a', { nombre_display: 'Zeta' }], ['b', { nombre_display: 'Ana' }], ['c', { nombre_display: 'Beto' }], ['d', { nombre_display: 'Ñandú' }]]);
  const l = ordenarContactos(['a', 'b', 'c', 'd'], perfiles, new Set(['a', 'c']), new Map([['d', 2]]));
  assert.deepEqual(l.map((x) => x.id), ['c', 'a', 'd', 'b']);
  assert.equal(l[2].noLeidos, 2);
});

test('noLeidosPorUsuario y debeAparecer', () => {
  const convs = [{ id: id(1), tipo: 'DIRECTO', otro_id: 'u1', no_leidos: 3 }, { id: id(2), tipo: 'GRUPO', no_leidos: 5 },
    { id: id(3), tipo: 'DIRECTO', otro_id: 'u3', no_leidos: 1, silenciado: true }];
  assert.deepEqual([...noLeidosPorUsuario(convs)], [['u1', 3]]);
  const msg = { autor_id: 'u1', conversacion_id: id(1) };
  assert.equal(debeAparecer(msg, 'yo', convs[0], []), true);
  assert.equal(debeAparecer(msg, 'yo', convs[0], [{ conv: id(1), min: true }]), false);
  assert.equal(debeAparecer({ ...msg, autor_id: 'yo' }, 'yo', convs[0], []), false);
  assert.equal(debeAparecer(msg, 'yo', { ...convs[0], silenciado: true }, []), false);
  assert.equal(insignia(12), '9+'); assert.equal(insignia(0), '');
});

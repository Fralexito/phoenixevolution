import { test } from 'node:test';
import assert from 'node:assert/strict';
import { PASOS, pasosDisponibles, posicionTarjeta, leerEstado, debeArrancar, progresoTexto } from '../src/js/core/sistema/tutorial.js';

test('pasosDisponibles: elige el primer selector visible (PC o celular) y salta lo que no existe', () => {
  const visibles = new Set(['.barra-inf .bi-joya', '[data-abrir-buscador]']);
  const r = pasosDisponibles(PASOS, (s) => visibles.has(s));
  assert.deepEqual(r.map((x) => x.paso.id), ['hola', 'miclub', 'buscar', 'fin']);
  assert.equal(r[1].selector, '.barra-inf .bi-joya');
  assert.equal(r[0].selector, null);
});

test('pasosDisponibles: un selector que revienta no rompe el recorrido', () => {
  const r = pasosDisponibles(PASOS, (s) => { if (s === '.nav-joya') throw new Error('boom'); return s === '.barra-inf .bi-joya'; });
  assert.ok(r.some((x) => x.paso.id === 'miclub' && x.selector === '.barra-inf .bi-joya'));
  assert.deepEqual(pasosDisponibles(null, () => true), []);
});

test('posicionTarjeta: abajo si cabe, arriba si no, centrada si nada; nunca se sale de la pantalla', () => {
  const vista = { width: 390, height: 800 }; const t = { width: 320, height: 200 };
  const abajo = posicionTarjeta({ top: 10, left: 300, width: 40, height: 40 }, t, vista);
  assert.equal(abajo.lado, 'abajo');
  assert.ok(abajo.left >= 12 && abajo.left + 320 <= 390 - 12 + 0.001);
  const arriba = posicionTarjeta({ top: 740, left: 10, width: 50, height: 50 }, t, vista);
  assert.equal(arriba.lado, 'arriba');
  assert.equal(posicionTarjeta(null, t, vista).lado, 'centro');
  assert.equal(posicionTarjeta({ top: 0, left: 0, width: 0, height: 0 }, t, vista).lado, 'centro');
  assert.equal(posicionTarjeta({ top: 100, left: 0, width: 50, height: 50 }, t, { width: 390, height: 300 }).lado, 'centro');
  const angosta = posicionTarjeta({ top: 10, left: 0, width: 40, height: 40 }, { width: 500, height: 100 }, { width: 320, height: 600 });
  assert.equal(angosta.left, 12);
});

test('estado y arranque: solo la primera vez, en la portada y sin ventanas abiertas', () => {
  assert.equal(leerEstado('visto'), 'visto');
  assert.equal(leerEstado('{basura'), null);
  assert.equal(debeArrancar({ estado: null, esPortada: true, hayModal: false }), true);
  assert.equal(debeArrancar({ estado: 'saltado', esPortada: true, hayModal: false }), false);
  assert.equal(debeArrancar({ estado: null, esPortada: false, hayModal: false }), false);
  assert.equal(debeArrancar({ estado: null, esPortada: true, hayModal: true }), false);
  assert.equal(debeArrancar({ estado: 'visto', esPortada: false, hayModal: true, forzado: true }), true);
  assert.equal(progresoTexto(1, 7), 'Paso 2 de 7');
});

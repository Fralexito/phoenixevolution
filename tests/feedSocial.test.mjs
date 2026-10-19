import test from 'node:test';
import assert from 'node:assert/strict';
import { circulosHistorias, mapaMisReacciones, conMisReacciones, totalReacciones, textoRespuestas, REACCION_RAPIDA } from '../src/js/core/comunidad/feedSocial.js';
import { PALETA_EMOJIS } from '../src/data/muroEstilo.js';

const h = (id) => ({ id, texto: 'hola', imagen_url: null, video_url: null, created_at: '2026-10-05T10:00:00Z' });
const aut = (id, n) => ({ id, username: n, nombre_display: n, avatar_url: null });

test('la reacción rápida existe en la paleta del muro', () => assert.ok(PALETA_EMOJIS.includes(REACCION_RAPIDA)));

test('círculos: mía primero, luego sin ver, luego vistas; descarta vacíos y entradas rotas', () => {
  const items = [
    { autor: aut('a', 'Ana'), ultima: 5, historias: [h(5)] },
    { autor: aut('yo', 'Yo'), ultima: 2, historias: [h(2)] },
    { autor: aut('b', 'Beto'), ultima: 9, historias: [h(9)] },
    { autor: aut('c', 'Cris'), ultima: 7, historias: [] },
    null, { historias: [h(1)] },
  ];
  const c = circulosHistorias(items, { yo: 'yo', vistas: { 9: 1 } });
  assert.deepEqual(c.map((x) => x.autor.id), ['yo', 'a', 'b']);
  assert.equal(c[0].mia, true); assert.equal(c[1].nuevas, true); assert.equal(c[2].nuevas, false);
});

test('círculos: entrada inválida no lanza', () => { assert.deepEqual(circulosHistorias(null), []); assert.deepEqual(circulosHistorias(undefined, { yo: 'x' }), []); });

test('mis reacciones: sanea el mapa y lo aplica sin mutar', () => {
  const m = mapaMisReacciones({ 10: '🔥', x: '❤️', 11: '', '-3': '👏', 12: 5 });
  assert.deepEqual([...m], [[10, '🔥']]);
  const lista = [{ id: 10, reacciones: {} }, { id: 11, reacciones: {} }];
  const r = conMisReacciones(lista, m);
  assert.equal(r[0].mia, '🔥'); assert.equal(r[1].mia, null); assert.equal(lista[0].mia, undefined);
  assert.deepEqual(mapaMisReacciones(null), new Map());
});

test('totales y textos', () => {
  assert.equal(totalReacciones({ reacciones: { '🔥': 3, '❤️': 2, abc: 9 } }), 5);
  assert.equal(totalReacciones({}), 0);
  assert.equal(textoRespuestas(0), 'Responder'); assert.equal(textoRespuestas(1), '1 respuesta'); assert.equal(textoRespuestas(4), '4 respuestas'); assert.equal(textoRespuestas('x'), 'Responder');
});

import { ordenarFeed, ordenValido, contarNuevas, esLargo } from '../src/js/core/comunidad/feedSocial.js';
test('social: ordenar lo cargado, contar nuevas y plegar textos largos', () => {
  const a = { id: 1, created_at: '2026-10-18T10:00:00Z', reacciones: { '🔥': 5 }, respuestas: 0 };
  const b = { id: 2, created_at: '2026-10-19T10:00:00Z', reacciones: { '🔥': 1 }, respuestas: 9 };
  const c = { id: 3, created_at: '2026-10-19T12:00:00Z', reacciones: {}, respuestas: 2 };
  assert.deepEqual(ordenarFeed([a, b, c], 'nuevos').map((x) => x.id), [3, 2, 1]);
  assert.deepEqual(ordenarFeed([a, b, c], 'reacciones').map((x) => x.id), [1, 2, 3]);
  assert.deepEqual(ordenarFeed([a, b, c], 'comentados').map((x) => x.id), [2, 3, 1]);
  assert.equal(ordenValido('raro'), 'nuevos');
  const lista = [a, b]; assert.deepEqual(ordenarFeed(lista, 'reacciones').length, 2); assert.equal(lista[0], a);   // no muta
  assert.equal(contarNuevas([{ id: 5 }, { id: 4 }, { id: 2 }], [1, 2, 3]), 2);
  assert.equal(contarNuevas([{ id: 2 }], []), 1);
  assert.equal(contarNuevas([], [1]), 0);
  assert.equal(esLargo('hola'), false); assert.equal(esLargo('x'.repeat(600)), true); assert.equal(esLargo('a\nb\nc\nd\ne\nf\ng\nh\ni'), true);
});

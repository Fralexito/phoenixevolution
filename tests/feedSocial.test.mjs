import test from 'node:test';
import assert from 'node:assert/strict';
import { circulosHistorias, mapaMisReacciones, conMisReacciones, totalReacciones, textoRespuestas, REACCION_RAPIDA } from '../src/js/core/feedSocial.js';
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

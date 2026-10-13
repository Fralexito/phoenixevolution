import { test } from 'node:test';
import assert from 'node:assert/strict';

test('fotos: busca en Wikipedia y devuelve la miniatura (y no revienta sin localStorage)', async () => {
  globalThis.fetch = async () => ({ ok: true, json: async () => ({ query: { pages: { 7: { index: 1, title: 'Lamine Yamal', thumbnail: { source: 'https://upload.wikimedia.org/wikipedia/commons/thumb/a/ab/LY.jpg/330px-LY.jpg' } } } } }) });
  const { fotoFutbolista, tamano } = await import('../src/js/features/fotoFutbolista.js');
  const f = await fotoFutbolista('Lamine Yamal', 'FC Barcelona');
  assert.equal(f.titulo, 'Lamine Yamal');
  assert.match(f.url, /upload\.wikimedia\.org/);
  assert.equal(tamano('https://upload.wikimedia.org/x/thumb/a/ab/LY.jpg/320px-LY.jpg', 500), 'https://upload.wikimedia.org/x/thumb/a/ab/LY.jpg/500px-LY.jpg');
});

test('fotos: acepta las dos direcciones de Wikimedia (upload y thumb) y rechaza otras (ronda 284g)', async () => {
  const { esWikimedia } = await import('../src/js/features/fotoFutbolista.js');
  assert.equal(esWikimedia('https://upload.wikimedia.org/wikipedia/commons/a.jpg'), true);
  assert.equal(esWikimedia('https://thumb.wikimedia.org/wikipedia/commons/a.jpg'), true);
  assert.equal(esWikimedia('https://ejemplo.com/a.jpg'), false);
  assert.equal(esWikimedia(null), false);
});

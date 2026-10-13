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

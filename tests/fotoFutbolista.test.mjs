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

test('carrusel: solo fotos JPG con el nombre del jugador, sin logos ni la foto principal repetida (ronda 285)', async () => {
  const { esFotoDe, archivoDe, fotosExtra } = await import('../src/js/features/fotoFutbolista.js');
  assert.equal(esFotoDe('File:Lamine Yamal 2024 (cropped).jpg', 'Lamine Yamal'), true);
  assert.equal(esFotoDe('File:FC Barcelona logo.jpg', 'Lamine Yamal'), false);
  assert.equal(esFotoDe('File:Yamal signature.jpg', 'Lamine Yamal'), false);
  assert.equal(esFotoDe('File:Camp Nou.jpg', 'Lamine Yamal'), false);
  assert.equal(archivoDe('File:LY 2024.jpg'), 'ly_2024.jpg');
  assert.equal(archivoDe('https://thumb.wikimedia.org/wikipedia/commons/a/ab/LY_2024.jpg/330px-LY_2024.jpg'), 'ly_2024.jpg');
  const info = (t, url) => ({ title: t, imageinfo: [{ mime: 'image/jpeg', thumburl: url }] });
  globalThis.fetch = async () => ({ ok: true, json: async () => ({ query: { pages: {
    1: info('File:Lamine Yamal 2024.jpg', 'https://upload.wikimedia.org/a/Lamine_Yamal_2024.jpg/500px-Lamine_Yamal_2024.jpg'),
    2: info('File:Lamine Yamal Euro.jpg', 'https://upload.wikimedia.org/a/Lamine_Yamal_Euro.jpg/500px-Lamine_Yamal_Euro.jpg'),
    3: info('File:Escudo Barça.jpg', 'https://upload.wikimedia.org/a/E.jpg/500px-E.jpg'),
  } } }) });
  const f = await fotosExtra('Lamine Yamal (test)', 'Lamine Yamal', 'https://upload.wikimedia.org/a/Lamine_Yamal_2024.jpg/330px-Lamine_Yamal_2024.jpg');
  assert.deepEqual(f.map((x) => x.url), ['https://upload.wikimedia.org/a/Lamine_Yamal_Euro.jpg/500px-Lamine_Yamal_Euro.jpg']);
});

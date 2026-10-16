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

test('carrusel: junta varias fuentes, sin repetir, máx. 4 extra; Commons exige el nombre completo (ronda 289)', async () => {
  const { juntarFotos, esFotoDe } = await import('../src/js/features/fotoFutbolista.js');
  assert.equal(esFotoDe('File:Rodrigo Moreno 2022.jpg', 'Rodri Hernández', true), false);
  assert.equal(esFotoDe('File:Lamine Yamal Euro 2024.jpg', 'Lamine Yamal', true), true);
  const f = (t) => ({ title: `File:${t}.jpg`, imageinfo: [{ mime: 'image/jpeg', thumburl: `https://upload.wikimedia.org/a/${t}.jpg/500px-${t}.jpg` }] });
  const r = juntarFotos([
    { pags: [f('Lamine Yamal 1'), f('Yamal 2')] },
    { pags: [f('Lamine Yamal 1'), f('Yamal 3')] },
    { pags: [f('Yamal 4'), f('Lamine Yamal 5'), f('Lamine Yamal 6'), f('Lamine Yamal 7')], estricto: true },
  ], 'Lamine Yamal', 'https://upload.wikimedia.org/a/Yamal_2.jpg/330px-Yamal_2.jpg');
  assert.deepEqual(r.map((x) => x.url.split('/').pop()), ['500px-Lamine Yamal 1.jpg', '500px-Yamal 3.jpg', '500px-Lamine Yamal 5.jpg', '500px-Lamine Yamal 6.jpg']);
});

test('minifaces del juego: URL solo si el jugador tiene su cara del parche (ronda 338)', async () => {
  const { minifaceUrl } = await import('../src/js/features/fotoFutbolista.js');
  const { MINIFACES } = await import('../src/data/minifaces.js');
  const una = [...MINIFACES][0];
  assert.match(minifaceUrl(una), new RegExp(`minifaces/${una}\\.webp$`));
  assert.match(minifaceUrl(String(una)), /\.webp$/);   // llega como texto desde data-pes
  assert.equal(minifaceUrl(''), null);
  assert.equal(minifaceUrl(null), null);
  assert.equal(minifaceUrl(999999999), null);
});

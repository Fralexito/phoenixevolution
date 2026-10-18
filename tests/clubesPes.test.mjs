import test from 'node:test';
import assert from 'node:assert/strict';
import { buscarClubes, clubExacto } from '../src/js/core/clubesPes.js';
import { CLUBES_PES } from '../src/data/clubesPes.js';

test('catálogo: 5 ligas, ids únicos, sin nombres vacíos', () => {
  assert.equal(new Set(CLUBES_PES.map((c) => c.id)).size, CLUBES_PES.length);
  assert.deepEqual([...new Set(CLUBES_PES.map((c) => c.liga))].sort(), ['Bundesliga', 'LaLiga', 'Ligue 1', 'Premier League', 'Serie A']);
  assert.ok(CLUBES_PES.every((c) => c.nombre && c.id > 0));
});
test('alias y tildes: «barca» → FC Barcelona, «atletico» → Atlético de Madrid', () => {
  assert.equal(buscarClubes('barca')[0].nombre, 'FC Barcelona');
  assert.equal(buscarClubes('atletico')[0].nombre, 'Atlético de Madrid');
  assert.equal(buscarClubes('PSG')[0].id, 114);
});
test('texto corto o sin resultados da lista vacía', () => {
  assert.deepEqual(buscarClubes('a'), []);
  assert.deepEqual(buscarClubes('zzzzqq'), []);
});
test('clubExacto devuelve el id de PES', () => {
  assert.equal(clubExacto('real madrid cf')?.id, 109);
  assert.equal(clubExacto('Real'), null);
});

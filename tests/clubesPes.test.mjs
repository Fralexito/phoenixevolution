import test from 'node:test';
import assert from 'node:assert/strict';
import { buscarClubes, clubExacto } from '../src/js/core/pes/clubesPes.js';
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
import { paisDe, escudoUrl, escudoImg } from '../src/js/core/pes/clubesPes.js';
import { existsSync } from 'node:fs';
test('país, escudo e imagen del club', () => {
  const c = clubExacto('FC Barcelona');
  assert.equal(paisDe(c), 'España');
  assert.equal(paisDe(null), '');
  assert.match(escudoUrl(c), /escudos-pes\/108\.webp$/);
  assert.equal(escudoImg(null), '');
  assert.match(escudoImg(c, 30), /width="30"/);
});
test('cada club del catálogo tiene su escudo en public/escudos-pes', () => {
  const faltan = CLUBES_PES.filter((c) => !existsSync(new URL(`../public/escudos-pes/${c.id}.webp`, import.meta.url)));
  assert.deepEqual(faltan.map((c) => c.nombre), []);
});

import { LINEAS, lineaDe, agruparPlantilla, buscarJugadoresPes, emparejarClubesLm } from '../src/js/core/pes/clubesPes.js';
import { PLANTILLAS } from '../src/data/plantillasPes.js';
test('plantillas: todos los clubes del catálogo tienen jugadores y posiciones válidas', () => {
  const pos = new Set(LINEAS.flatMap((l) => l.posiciones));
  for (const c of CLUBES_PES) {
    const l = PLANTILLAS[c.id];
    assert.ok(l && l.length >= 15, `${c.nombre} sin plantilla`);
    for (const [pid, nombre, p] of l) { assert.ok(pid > 0 && nombre, c.nombre); assert.ok(pos.has(p), `${nombre}: posición ${p}`); }
  }
});
test('agruparPlantilla ordena por líneas del campo', () => {
  const g = agruparPlantilla([[1, 'A', 'DC'], [2, 'B', 'PT'], [3, 'C', 'MC'], [4, 'D', 'DFC']]);
  assert.deepEqual(g.map((x) => x.linea), ['porteros', 'defensas', 'medios', 'delanteros']);
  assert.equal(lineaDe('LI'), 'defensas'); assert.equal(lineaDe('xx'), 'otros');
});
test('buscarJugadoresPes: sin tildes, mínimo 2 letras, primero los que empiezan', () => {
  const p = { 1: [[10, 'Pedri', 'MC'], [11, 'Alejandro Pedrinho', 'MD']], 2: [[20, 'Rodri', 'MCD']] };
  assert.deepEqual(buscarJugadoresPes('p', p), []);
  assert.deepEqual(buscarJugadoresPes('pedri', p).map((x) => x.pid), [10, 11]);
  assert.equal(buscarJugadoresPes('RODRI', p)[0].clubId, 2);
});
test('emparejarClubesLm: los 12 clubes de la Liga Máster encuentran su club del catálogo', () => {
  const lm = ['AC Milan', 'Arsenal', 'Atlético de Madrid', 'Bayern Múnich', 'Chelsea', 'FC Barcelona', 'Inter', 'Liverpool', 'Manchester City', 'Manchester United', 'Paris Saint-Germain', 'Real Madrid']
    .map((nombre, i) => ({ id: 700 + i, nombre }));
  const r = emparejarClubesLm(lm);
  assert.equal(r.size, 12);
  assert.equal(r.get(119).nombre, 'Inter'); assert.equal(r.get(101).nombre, 'Arsenal'); assert.equal(r.get(114).nombre, 'Paris Saint-Germain'); assert.equal(r.get(108).nombre, 'FC Barcelona');
});

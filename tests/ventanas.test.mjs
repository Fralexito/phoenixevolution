import { test } from 'node:test';
import assert from 'node:assert/strict';
import { recortar, itemsCompetencia, itemDuelo, itemSocial, itemFichaje } from '../src/js/core/ventanas.js';

test('ventanas: recortar sin partir palabras', () => {
  assert.equal(recortar('hola mundo', 20), 'hola mundo');
  assert.equal(recortar('uno dos tres cuatro cinco seis', 14), 'uno dos tres…');
  assert.equal(recortar(null), '');
});

test('ventanas: competencia = todos los resultados de la última fecha + lo que falta', () => {
  const fechas = [
    { n: 1, partidos: [{ l: 'A', v: 'B', gl: 1, gv: 0 }] },
    { n: 2, partidos: [{ l: 'A', v: 'C', gl: 2, gv: 2 }, { l: 'B', v: 'D', gl: null, gv: null }] },
  ];
  const it = itemsCompetencia(fechas, { A: 'Arsenal' });
  assert.equal(it.length, 2);
  assert.equal(it[0].titulo, 'A 2 – 2 C');
  assert.equal(it[0].meta, 'Fecha 2 · Final');
  assert.deepEqual(it[0].escudos, ['Arsenal', '']);
  assert.equal(it[1].titulo, 'B vs D');
  assert.equal(itemsCompetencia([]).length, 0);
});

test('ventanas: duelo, social y fichaje', () => {
  assert.deepEqual(itemDuelo({ modalidad: 'amistoso', plataforma: 'PC' }, { nombre_display: 'Fralex' }).titulo, 'Fralex busca rival');
  assert.equal(itemDuelo({}, null).meta, 'Reto abierto');
  assert.equal(itemSocial({ texto: '', imagen_url: 'x', autor: { username: 'beto' } }, 'hace 2 h').titulo, 'Compartió una foto');
  assert.equal(itemSocial({ texto: 'golazo', autor: { username: 'beto' } }, 'hace 2 h').meta, 'beto · hace 2 h');
  assert.equal(itemFichaje({ tipo: 'compra' }, 'Pedri', 'PSG', 'FC Barcelona').titulo, 'Pedri → PSG');
  assert.equal(itemFichaje({ tipo: 'compra' }, 'Pedri', 'PSG', 'FC Barcelona').meta, 'Traspaso · desde FC Barcelona');
  assert.equal(itemFichaje({ tipo: 'liberado' }, 'Pedri').titulo, 'Pedri queda libre');
});

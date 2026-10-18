import test from 'node:test';
import assert from 'node:assert/strict';
import { ejesFifa, mediaEjes, extremos, geometria, nivel, aPuntos } from '../src/js/core/jugadores/radarFifa.js';
const p = { atq: 90, fin: 90, pot: 90, cre: 80, pas: 80, efe: 80, reg: 70, cor: 70, def: 60, pos: 60, ant: 60, pre: 50, rit: 70, men: 99 };
test('nivel por tramos', () => { assert.equal(nivel(95), 'elite'); assert.equal(nivel(80), 'alto'); assert.equal(nivel(70), 'medio'); assert.equal(nivel(69), 'bajo'); });
test('6 ejes con promedio de sus stats', () => {
  const e = ejesFifa(p, { atq: { nombre: 'Ataque' } });
  assert.equal(e.length, 6); assert.equal(e[0].id, 'ataque'); assert.equal(e[0].valor, 90); assert.equal(e[0].partes[0].nombre, 'Ataque');
  assert.equal(e.find((x) => x.id === 'presion').valor, 60); assert.equal(e.find((x) => x.id === 'mentalidad').valor, 99);
});
test('una stat vacía cuenta como 75; ficha vacía no rompe', () => { assert.equal(ejesFifa({}, {})[0].valor, 75); assert.equal(ejesFifa(null, {}).length, 6); });
test('media y extremos', () => { const e = ejesFifa(p, {}); assert.equal(mediaEjes(e), Math.round(e.reduce((s, x) => s + x.valor, 0) / 6)); const x = extremos(e); assert.equal(x.fuerte.id, 'mentalidad'); assert.equal(x.flojo.id, 'defensa'); assert.deepEqual(extremos([]), { fuerte: null, flojo: null }); assert.equal(mediaEjes([]), 0); });
test('geometría: el eje 0 apunta arriba y el 99 llega al borde', () => {
  const e = ejesFifa({ atq: 99, fin: 99, pot: 99 }, {}); const g = geometria(e, { cx: 150, cy: 150, r: 100 });
  assert.deepEqual(g.borde[0], [150, 50]); assert.deepEqual(g.jugador[0], [150, 50]); assert.equal(g.anillos.length, 3); assert.equal(g.etiquetas.length, 6);
  assert.match(aPuntos(g.borde), /^150,50 /);
});

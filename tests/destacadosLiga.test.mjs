import test from 'node:test';
import assert from 'node:assert/strict';
import { destacadosLiga, rachaActual } from '../src/js/core/competicion/destacadosLiga.js';

const fechas = [
  { n: 1, partidos: [{ l: 'A', v: 'B', gl: 5, gv: 0 }, { l: 'C', v: 'D', gl: 1, gv: 1 }] },
  { n: 2, partidos: [{ l: 'A', v: 'C', gl: 2, gv: 1 }, { l: 'B', v: 'D', gl: 0, gv: 0 }] },
  { n: 3, partidos: [{ l: 'A', v: 'D', gl: 1, gv: 0 }, { l: 'B', v: 'C' }] },
];
const tabla = [
  { nombre: 'A', pj: 3, gf: 8, gc: 1 }, { nombre: 'D', pj: 3, gf: 1, gc: 2 },
  { nombre: 'C', pj: 2, gf: 2, gc: 3 }, { nombre: 'B', pj: 2, gf: 0, gc: 5 }, { nombre: 'E', pj: 0, gf: 0, gc: 0 },
];

test('destacados: ataque, defensa, racha, invicto, goleada y goles', () => {
  const d = Object.fromEntries(destacadosLiga(tabla, fechas).map((x) => [x.id, x]));
  assert.equal(d.ataque.nombre, 'A'); assert.equal(d.ataque.cifra, 8);
  assert.equal(d.defensa.nombre, 'A');                   // 1 recibido en 3 PJ
  assert.equal(d.racha.nombre, 'A'); assert.equal(d.racha.cifra, 3);
  assert.equal(d.invicto.nombre, 'A'); assert.equal(d.invicto.cifra, 3);
  assert.equal(d.goleada.cifra, '5-0'); assert.match(d.goleada.detalle, /a B · fecha 1/);
  assert.equal(d.goles.cifra, 11); assert.match(d.goles.detalle, /2,2 por partido · 5 jugados/);
});

test('destacados: sin partidos no hay cartas; racha corta no sale', () => {
  assert.deepEqual(destacadosLiga([{ nombre: 'A', pj: 0, gf: 0, gc: 0 }], []), []);
  const f = [{ n: 1, partidos: [{ l: 'A', v: 'B', gl: 1, gv: 0 }] }];
  const ids = destacadosLiga([{ nombre: 'A', pj: 1, gf: 1, gc: 0 }, { nombre: 'B', pj: 1, gf: 0, gc: 1 }], f).map((x) => x.id);
  assert.deepEqual(ids, ['ataque', 'defensa', 'goles']);
  assert.equal(rachaActual([{ r: 'P' }, { r: 'G' }, { r: 'G' }], (p) => p.r === 'G'), 2);
});

import test from 'node:test';
import assert from 'node:assert/strict';
import { FICHAS_JUEGO } from '../src/data/fichasJuego.js';
import { decodificarFicha, esPortero, posicionRegistrada, nivelesPosicion, perfilEjes, puntosRadar, HABILIDADES, GRUPOS_STATS, CLAVES_PORTERO } from '../src/js/core/pes/fichaJuego.js';
import { CAMPOS } from '../src/js/core/pes/fichasCampos.js';

test('todas las fichas del juego se pueden decodificar y sus valores están en rango', () => {
  const rangos = Object.fromEntries(CAMPOS.map((c) => [c.clave, c]));
  for (const [pid, t] of Object.entries(FICHAS_JUEGO)) {
    const f = decodificarFicha(t); assert.ok(f, `jugador ${pid}`);
    for (const c of CAMPOS.filter((x) => x.maximo === 99 || x.grupo === 'posicion' || x.grupo === 'pie_malo' || x.grupo === 'estado')) {
      assert.ok(f.valores[c.clave] >= rangos[c.clave].minimo && f.valores[c.clave] <= Math.max(rangos[c.clave].maximo, 99), `${pid} ${c.clave}=${f.valores[c.clave]}`);
    }
  }
});
test('Raphinha (110644): extremo izquierdo, 176 cm, con habilidades', () => {
  const f = decodificarFicha(FICHAS_JUEGO[110644]);
  assert.equal(posicionRegistrada(f.valores), 'EI'); assert.equal(f.valores.altura, 176);
  assert.ok(nivelesPosicion(f.valores).find((p) => p.pos === 'EI').nivel === 'A');
  assert.ok(f.habilidades.length > 0);
});
test('decodificarFicha rechaza textos que no son de una ficha', () => {
  assert.equal(decodificarFicha('zz'), null); assert.equal(decodificarFicha(null), null); assert.equal(decodificarFicha('00'.repeat(10)), null);
});
test('porteros: perfil con sus 5 estadísticas; jugadores de campo: 6 ejes', () => {
  const todos = Object.values(FICHAS_JUEGO).map(decodificarFicha);
  const pt = todos.find((f) => esPortero(f.valores)); assert.ok(pt, 'hay algún portero');
  assert.equal(perfilEjes(pt.valores).length, CLAVES_PORTERO.length);
  const campo = todos.find((f) => !esPortero(f.valores)); assert.equal(perfilEjes(campo.valores).length, 6);
});
test('puntosRadar: el valor máximo toca el borde y el mínimo queda cerca del centro', () => {
  const [p] = puntosRadar([{ valor: 99 }, { valor: 40 }, { valor: 70 }], 100, 110);
  assert.deepEqual(p, [110, 10]);
  const q = puntosRadar([{ valor: 40 }, { valor: 40 }, { valor: 40 }], 100, 110)[0];
  assert.ok(Math.abs(110 - q[1]) < 15);
});
test('tablas: cada habilidad tiene nombre y los grupos de estadísticas existen en el catálogo', () => {
  for (const [bit, h] of Object.entries(HABILIDADES)) { assert.ok(bit >= 480 && bit <= 531); assert.ok(h[0]); }
  const claves = new Set(CAMPOS.map((c) => c.clave));
  for (const g of GRUPOS_STATS) for (const k of g.claves) assert.ok(claves.has(k), k);
});

import { NOMBRE_POSICION, TEXTO_NIVEL } from '../src/js/core/pes/fichaJuego.js';
import { POS_CAMPO } from '../src/js/core/pes/fichasCampos.js';
test('cada posición del campo tiene nombre y el campo las coloca como en el juego (centrales al centro, bandas a los lados, sin amontonarse)', () => {
  const letras = Object.keys(POS_CAMPO).map((k) => k.slice(4).toUpperCase()).sort();
  assert.deepEqual(Object.keys(NOMBRE_POSICION).sort(), letras);
  assert.deepEqual(Object.keys(TEXTO_NIVEL), ['A', 'B', 'C']);
  const x = (p) => POS_CAMPO[`pos_${p}`][0], y = (p) => POS_CAMPO[`pos_${p}`][1];
  for (const p of ['pt', 'dfc', 'mcd', 'mc', 'mo', 'sd', 'dc']) assert.equal(x(p), 50, p);
  for (const [i, d] of [['li', 'ld'], ['mi', 'md'], ['ei', 'ed']]) { assert.ok(x(i) < 50 && x(d) > 50 && x(i) + x(d) === 100 && y(i) === y(d), `${i}/${d}`); }
  assert.ok(y('dc') < y('sd') && y('sd') < y('mo') && y('mo') < y('mc') && y('mc') < y('mcd') && y('mcd') < y('dfc') && y('dfc') < y('pt'));
  const todos = Object.values(POS_CAMPO);
  for (let a = 0; a < todos.length; a++) for (let b = a + 1; b < todos.length; b++) assert.ok(Math.hypot(todos[a][0] - todos[b][0], (todos[a][1] - todos[b][1]) * 1.3) > 11, `se pisan ${a}-${b}`);
});

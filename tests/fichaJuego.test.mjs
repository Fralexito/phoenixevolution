import test from 'node:test';
import assert from 'node:assert/strict';
import { FICHAS_JUEGO } from '../src/data/fichasJuego.js';
import { decodificarFicha, esPortero, posicionRegistrada, nivelesPosicion, perfilEjes, puntosRadar, HABILIDADES, GRUPOS_STATS, CLAVES_PORTERO } from '../src/js/core/fichaJuego.js';
import { CAMPOS } from '../src/js/core/fichasCampos.js';

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

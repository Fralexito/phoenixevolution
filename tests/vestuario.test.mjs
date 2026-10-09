import test from 'node:test';
import assert from 'node:assert/strict';
import { validarValor, cambiosDe, fijar, siguientePosicion, agruparPlantilla, bloqueado, leer, valorActual, mensajeError } from '../src/js/core/vestuario.js';

const ficha = { posicion: 'MO', dorsal: 10, habilidades: { velocidad: 80 }, posiciones: { MO: 2 }, liga_master: { sueldo: 500 }, bloqueados: ['habilidades.potencia_tiro'] };

test('validarValor respeta los rangos del servidor', () => {
  assert.equal(validarValor('dorsal', '100').ok, false);
  assert.deepEqual(validarValor('dorsal', '7'), { ok: true, valor: 7 });
  assert.equal(validarValor('habilidades.velocidad', '39').ok, false);
  assert.equal(validarValor('habilidades.velocidad', '99').ok, true);
  assert.equal(validarValor('posiciones.MO', '3').ok, false);
  assert.equal(validarValor('liga_master.sueldo', '400000001').ok, false);
  assert.equal(validarValor('dorsal', '').ok, false);
  assert.equal(validarValor('dorsal', '7.5').ok, false);
  assert.equal(validarValor('nacionalidad', 'Peru').ok, false);
  assert.equal(validarValor('posicion', 'DC').ok, true);
});
test('siguientePosicion cicla 0→1→2→0', () => { assert.deepEqual([0, 1, 2].map(siguientePosicion), [1, 2, 0]); });
test('fijar y cambiosDe: volver al original quita el cambio', () => {
  let b = fijar(ficha, {}, 'dorsal', 7); assert.deepEqual(cambiosDe(ficha, b), [{ campo: 'dorsal', valor: 7 }]);
  b = fijar(ficha, b, 'dorsal', 10); assert.deepEqual(cambiosDe(ficha, b), []);
  assert.equal(valorActual(ficha, { dorsal: 7 }, 'dorsal'), 7);
  assert.equal(leer(ficha, 'habilidades.velocidad'), 80);
});
test('bloqueado lee ficha.bloqueados', () => { assert.equal(bloqueado(ficha, 'habilidades.potencia_tiro'), true); assert.equal(bloqueado(ficha, 'dorsal'), false); });
test('agruparPlantilla ordena por línea y dorsal', () => {
  const js = [{ orden: 1, ficha: { posicion: 'DC', dorsal: 9 } }, { orden: 2, ficha: { posicion: 'PT', dorsal: 1 } }, { orden: 3, ficha: { posicion: 'MC', dorsal: 8 } }, { orden: 4, ficha: { posicion: 'MO', dorsal: 6 } }];
  const g = agruparPlantilla(js);
  assert.deepEqual(g.map((x) => x.titulo), ['Porteros', 'Centrocampistas', 'Delanteros']);
  assert.deepEqual(g[1].jugadores.map((j) => j.ficha.dorsal), [6, 8]);
});
test('mensajeError traduce códigos del servidor', () => {
  assert.match(mensajeError({ message: 'CAMPO_BLOQUEADO:dorsal' }), /bloqueado/);
  assert.match(mensajeError({ message: 'VALOR_INVALIDO:dorsal' }), /rango/);
  assert.equal(mensajeError({}), 'No se pudo guardar.');
});

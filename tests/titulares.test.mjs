import { test } from 'node:test';
import assert from 'node:assert/strict';
import { titularesPortada, rachaVictorias, lineaEstado } from '../src/js/core/portada/titulares.js';

const fechas = [
  { n: 1, partidos: [{ l: 'Victor', v: 'Beto', gl: 2, gv: 0 }, { l: 'Hugo', v: 'Jack', gl: 1, gv: 1 }] },
  { n: 2, partidos: [{ l: 'Beto', v: 'Hugo', gl: 3, gv: 0 }, { l: 'Jack', v: 'Victor', gl: 0, gv: 1 }] },
  { n: 3, partidos: [{ l: 'Victor', v: 'Hugo', gl: 2, gv: 1 }, { l: 'Jack', v: 'Beto', gl: 0, gv: 6 }] },
  { n: 4, partidos: [{ l: 'Beto', v: 'Victor', gl: null, gv: null }, { l: 'Hugo', v: 'Jack', gl: null, gv: null }] },
];

test('titulares: racha de victorias contando desde el último partido', () => {
  const r = rachaVictorias(fechas);
  assert.equal(r.get('Victor'), 3);
  assert.equal(r.get('Beto'), 2);
  assert.equal(r.get('Jack'), 0);
});

test('titulares: bienvenida, líder invicto, goleada y sin partidos repetidos', () => {
  const t = titularesPortada(fechas);
  assert.equal(t[0].id, 'bienvenida');
  assert.deepEqual(t[0].lineas, ['Bienvenido a la', 'Galaxy']);
  assert.equal(t[0].partido.etiqueta, 'Próximo');
  assert.equal(t[0].partido.l, 'Beto');                       // Beto vs Victor: los dos en el top 4
  const lider = t.find((x) => x.id === 'lider');
  assert.deepEqual(lider.lineas, ['Victor sigue invicto.', '¿Quién lo baja?']);
  const gol = t.find((x) => x.id === 'goleada');
  assert.deepEqual(gol.lineas, ['Beto le metió 6 a Jack.', 'Goleada en la fecha 3.']);
  const claves = t.filter((x) => x.partido).map((x) => `${x.partido.fecha}${x.partido.l}${x.partido.v}`);
  assert.equal(new Set(claves).size, claves.length);
});

test('titulares: sin datos solo queda la bienvenida; línea de estado', () => {
  const t = titularesPortada([]);
  assert.equal(t.length, 1);
  assert.equal(t[0].partido, null);
  assert.deepEqual(lineaEstado({ estado: 'en_juego', actual: 9 }), { texto: 'Galaxy League · fecha 9 en juego', vivo: true });
  assert.equal(lineaEstado(null).vivo, false);
});

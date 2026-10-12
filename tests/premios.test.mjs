import { test } from 'node:test';
import assert from 'node:assert/strict';
import { premiosEdicion } from '../src/js/core/premios.js';

const ed = { fechas: [
  { n: 1, partidos: [{ l: 'Ana', v: 'Beto', gl: 1, gv: 0 }, { l: 'Caro', v: 'Dani', gl: 2, gv: 2 }, { l: 'Eli', v: 'Fede', gl: 3, gv: 0 }] },
  { n: 2, partidos: [{ l: 'Beto', v: 'Caro', gl: 0, gv: 0 }, { l: 'Dani', v: 'Eli', gl: 1, gv: 2 }, { l: 'Fede', v: 'Ana', gl: 0, gv: 1 }] },
  { n: 3, partidos: [{ l: 'Ana', v: 'Caro', gl: 2, gv: 0 }, { l: 'Dani', v: 'Beto', gl: 1, gv: 1 }, { l: 'Fede', v: 'Eli', gl: 7, gv: 1 }] },
  { n: 4, partidos: [{ l: 'Ana', v: 'Dani', gl: null, gv: null }] },
] };

const por = (r, id) => r.premios.find((p) => p.id === id);

test('premios: usa la última fecha con resultados (no la que está por jugar)', () => {
  assert.equal(premiosEdicion(ed).fecha, 3);
});

test('premios: La Paliza y el Matagigantes salen de la última fecha', () => {
  const r = premiosEdicion(ed);
  assert.equal(por(r, 'paliza').nombre, 'Fede');
  assert.equal(por(r, 'paliza').valor, '7-1');
  const m = por(r, 'matagigantes');
  assert.equal(m.nombre, 'Fede');           // era 6.º y le ganó a Eli, que era 1.º
  assert.ok(m.peso > 70);
});

test('premios: de la edición (líder, muralla, en llamas, cerrojo)', () => {
  const r = premiosEdicion(ed);
  assert.equal(por(r, 'lider').nombre, 'Ana');
  assert.equal(por(r, 'muralla').nombre, 'Ana');          // 0 goles en contra
  assert.equal(por(r, 'enllamas').nombre, 'Ana');         // 3 victorias seguidas
  assert.equal(por(r, 'cerrojo').valor, '3');
});

test('premios: sin historia no hay premio (sin goleadas grandes no sale La Paliza)', () => {
  const tranquilo = { fechas: [{ n: 1, partidos: [{ l: 'A', v: 'B', gl: 1, gv: 0 }, { l: 'C', v: 'D', gl: 0, gv: 0 }] }] };
  const r = premiosEdicion(tranquilo);
  assert.equal(por(r, 'paliza'), undefined);
  assert.equal(por(r, 'lider'), undefined);              // nadie llega a 3 partidos
});

test('premios: edición vacía no rompe', () => {
  assert.deepEqual(premiosEdicion(null), { fecha: null, premios: [] });
  assert.deepEqual(premiosEdicion({ fechas: [] }), { fecha: null, premios: [] });
});

test('premios: vienen ordenados del más llamativo al menos', () => {
  const pesos = premiosEdicion(ed).premios.map((p) => p.peso);
  assert.deepEqual(pesos, [...pesos].sort((a, b) => b - a));
});

import { tamanosMuro, CELDAS } from '../src/js/core/premios.js';
test('muro: cada cantidad de premios llena filas completas de 4 (sin huecos)', () => {
  for (let n = 1; n <= 20; n++) {
    const t = tamanosMuro(n);
    assert.equal(t.length, n);
    assert.equal(t.reduce((s, x) => s + CELDAS[x], 0) % 4, 0, `n=${n}`);
  }
  assert.equal(tamanosMuro(8)[0], 'g');           // el más importante va grande
});

import { historialJugador, puestosPorFecha } from '../src/js/core/premios.js';
test('gráficos: historial y puestos de un jugador', () => {
  const h = historialJugador(ed, 'Ana');
  assert.deepEqual(h.map((x) => x.res), ['G', 'G', 'G']);           // la fecha 4 sin marcador no cuenta
  assert.deepEqual(h[1], { fecha: 2, rival: 'Fede', gf: 1, gc: 0, res: 'G' });
  const p = puestosPorFecha(ed, 'Ana');
  assert.equal(p.length, 3);
  assert.equal(p.at(-1).pos, 1);
});

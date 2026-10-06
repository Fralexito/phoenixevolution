import test from 'node:test';
import assert from 'node:assert/strict';
import { estadoLiga, selloPartido, factorGoles, calcularElo, clubesMasUsados, indiceLiga, buscarEnLiga } from '../src/js/core/pulso.js';
import { EDICIONES } from '../src/data/ligaResultados.js';
import { LIGAS } from '../src/data/ligas.js';

const P = (l, v, gl = null, gv = null) => ({ l, v, gl, gv });

test('pulso: estado de la liga', () => {
  assert.equal(estadoLiga([]).estado, 'sin_datos');
  assert.equal(estadoLiga(null).estado, 'sin_datos');
  const f = [{ n: 1, partidos: [P('A', 'B', 1, 0), P('C', 'D', 2, 2)] }, { n: 2, partidos: [P('A', 'C', 1, 1), P('B', 'D')] }, { n: 3, partidos: [P('A', 'D'), P('B', 'C')] }];
  const e = estadoLiga(f);
  assert.equal(e.estado, 'en_juego'); assert.equal(e.actual, 2); assert.equal(e.jugadosActual, 1); assert.equal(e.totalActual, 2);
  assert.equal(e.jugados, 3); assert.equal(e.total, 6); assert.equal(e.pct, 50); assert.equal(e.restantes, 3);
  assert.equal(estadoLiga([{ n: 1, partidos: [P('A', 'B')] }]).estado, 'por_empezar');
  const t = estadoLiga([{ n: 1, partidos: [P('A', 'B', 0, 0)] }, { n: 2, partidos: [P('A', 'B', 1, 0)] }]);
  assert.equal(t.estado, 'terminada'); assert.equal(t.actual, 2); assert.equal(t.pct, 100);
});

test('pulso: sello del partido', () => {
  assert.equal(selloPartido(P('A', 'B', 0, 0)), 'oficial');
  assert.equal(selloPartido(P('A', 'B')), 'pendiente');
});

test('pulso: factor de goles', () => {
  assert.equal(factorGoles(0), 1); assert.equal(factorGoles(1), 1); assert.equal(factorGoles(-2), 1.5); assert.equal(factorGoles(3), 1.75); assert.equal(factorGoles(5), 2);
});

test('pulso: ELO — suma cero, premia ganar y no depende del orden dentro de la fecha', () => {
  const f = [{ n: 1, partidos: [P('A', 'B', 2, 0), P('C', 'D', 1, 1)] }];
  const r = calcularElo(f, ['A', 'B', 'C', 'D', 'E']);
  const por = Object.fromEntries(r.map((x) => [x.nombre, x]));
  assert.equal(por.A.elo, 1024); assert.equal(por.B.elo, 976);            // 32 · 1.5 · (1 − 0.5) = 24
  assert.equal(por.C.elo, 1000); assert.equal(por.D.elo, 1000);           // empate entre iguales: nada cambia
  assert.equal(por.E.elo, 1000); assert.equal(por.E.pj, 0);               // incluido aunque no jugó
  assert.equal(por.A.delta, 24); assert.equal(por.B.delta, -24);
  assert.equal(r[0].nombre, 'A'); assert.equal(r[r.length - 1].nombre, 'B');
  assert.equal(r.reduce((s, x) => s + x.elo, 0), 5000);                  // el ELO ni se crea ni se destruye
  // mismo resultado con los partidos de la fecha en otro orden
  const f2 = [{ n: 1, partidos: [P('C', 'D', 1, 1), P('A', 'B', 2, 0)] }];
  assert.deepEqual(calcularElo(f2, ['A', 'B', 'C', 'D', 'E']), r);
});

test('pulso: ELO — vencer a un fuerte da más que vencer a un débil', () => {
  const f = [{ n: 1, partidos: [P('A', 'B', 1, 0)] }, { n: 2, partidos: [P('C', 'A', 1, 0), P('D', 'B', 1, 0)] }];
  const r = Object.fromEntries(calcularElo(f, ['A', 'B', 'C', 'D']).map((x) => [x.nombre, x]));
  assert.ok(r.C.delta > r.D.delta, `C (venció al fuerte) ${r.C.delta} > D (venció al débil) ${r.D.delta}`);
});

test('pulso: ELO — ignora partidos sin jugar y datos raros', () => {
  assert.deepEqual(calcularElo(null, ['A']), [{ nombre: 'A', elo: 1000, pj: 0, delta: 0 }]);
  const r = calcularElo([{ n: 1, partidos: [P('A', 'B'), P('A', 'A', 1, 0), { l: 'A', gl: 1, gv: 0 }] }], ['A', 'B']);
  assert.ok(r.every((x) => x.elo === 1000 && x.pj === 0));
});

test('pulso: clubes más usados', () => {
  const f = [{ n: 1, partidos: [P('A', 'B', 2, 1), P('C', 'D')] }, { n: 2, partidos: [P('B', 'C', 0, 0), P('A', 'D', 3, 0)] }];
  const r = clubesMasUsados(f, { A: 'Real', B: 'Barça', C: 'Real', D: 'Inter' });
  assert.deepEqual(r.map((x) => [x.club, x.pj, x.g, x.e, x.p]), [['Real', 3, 2, 1, 0], ['Barça', 2, 0, 1, 1], ['Inter', 1, 0, 0, 1]]);
  assert.deepEqual(r[0].dts, ['A', 'C']); assert.equal(r[0].gf, 5);
  assert.deepEqual(clubesMasUsados(null, null), []);
});

test('pulso: búsqueda dentro de la liga', () => {
  const idx = indiceLiga(LIGAS, EDICIONES);
  assert.ok(idx.some((e) => e.tipo === 'liga' && /galaxy/i.test(e.label)));
  assert.ok(idx.some((e) => e.tipo === 'fecha' && e.label === 'Fecha 1'));
  assert.ok(idx.every((e) => /^liga\/#liga-/.test(e.path)));
  const h = buscarEnLiga('hugo', idx); assert.ok(h.length && h[0].label === 'Hugo' && /Arsenal/.test(h[0].info));
  assert.ok(buscarEnLiga('ARSENAL', idx).some((e) => e.label === 'Hugo'));          // sin importar mayúsculas
  assert.ok(buscarEnLiga('fecha 8', idx).some((e) => e.label === 'Fecha 8'));
  assert.deepEqual(buscarEnLiga('', idx), []); assert.deepEqual(buscarEnLiga('zzzzzz', idx), []);
  assert.deepEqual(indiceLiga(null, null), []);
});

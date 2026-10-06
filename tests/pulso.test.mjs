import test from 'node:test';
import assert from 'node:assert/strict';
import { estadoLiga, selloPartido, rangoElo, progresoRango, RANGOS, factorGoles, calcularElo, clubesMasUsados, indiceLiga, buscarEnLiga } from '../src/js/core/pulso.js';
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

test('pulso: estados especiales de partido', () => {
  assert.equal(selloPartido({ l: 'A', v: 'B', gl: null, gv: null, estado: 'aplazado' }), 'aplazado');
  assert.equal(selloPartido({ l: 'A', v: 'B', gl: 3, gv: 0, estado: 'wo' }), 'wo');
  assert.equal(selloPartido({ l: 'A', v: 'B', gl: 1, gv: 1, estado: 'incidencia' }), 'incidencia');
  // un estado que contradice los datos se ignora
  assert.equal(selloPartido({ l: 'A', v: 'B', gl: 2, gv: 1, estado: 'aplazado' }), 'oficial');
  assert.equal(selloPartido({ l: 'A', v: 'B', gl: null, gv: null, estado: 'wo' }), 'pendiente');
  assert.equal(selloPartido({ l: 'A', v: 'B', gl: 2, gv: 1, estado: 'inventado' }), 'oficial');
  const e = estadoLiga([{ n: 1, partidos: [{ l: 'A', v: 'B', gl: 1, gv: 0 }, { l: 'C', v: 'D', gl: null, gv: null, estado: 'aplazado' }] }]);
  assert.equal(e.aplazados, 1); assert.equal(e.jugados, 1); assert.equal(e.estado, 'en_juego');
});

test('pulso: rangos por ELO', () => {
  assert.equal(rangoElo(1000).id, 'plata'); assert.equal(rangoElo(924).id, 'bronce'); assert.equal(rangoElo(925).id, 'plata');
  assert.equal(rangoElo(1025).id, 'oro'); assert.equal(rangoElo(1100).id, 'platino'); assert.equal(rangoElo(1175).id, 'diamante'); assert.equal(rangoElo(2000).id, 'diamante');
  assert.equal(rangoElo(1200, 0), null); assert.equal(rangoElo(NaN), null);
  assert.deepEqual(RANGOS.map((r) => r.id), ['bronce', 'plata', 'oro', 'platino', 'diamante']);
  const p = progresoRango(1000); assert.equal(p.siguiente.id, 'oro'); assert.equal(p.faltan, 25); assert.equal(p.pct, 75);   // (1000−925)/(1025−925)
  assert.equal(progresoRango(1300).siguiente, null); assert.equal(progresoRango(1300).pct, 100);
  assert.equal(progresoRango(800).siguiente.id, 'plata'); assert.ok(progresoRango(800).pct >= 0);
  assert.equal(progresoRango(900, 0), null);
});

import { aplanarPartidos, filtrarPartidos, paginar, leerFiltros } from '../src/js/core/partidosGlobal.js';
test('historial global: aplanar, filtrar, paginar', () => {
  const lista = aplanarPartidos(LIGAS, EDICIONES);
  assert.ok(lista.length > 60);
  assert.ok(lista.every((m) => m.liga && m.edicion && Number.isInteger(m.fecha) && typeof m.jugado === 'boolean'));
  for (let i = 1; i < lista.length; i++) assert.ok(lista[i - 1].fecha >= lista[i].fecha, 'más reciente primero');
  assert.equal(new Set(lista.map((m) => m.clave)).size, lista.length, 'claves únicas');
  const g = filtrarPartidos(lista, { liga: 'galaxy', estado: 'jugados' }); assert.ok(g.length && g.every((m) => m.liga === 'galaxy' && m.jugado));
  const h = filtrarPartidos(lista, { liga: 'galaxy', q: 'HUGO arsenal' }); assert.ok(h.length && h.every((m) => m.l === 'Hugo' || m.v === 'Hugo'));
  assert.ok(filtrarPartidos(lista, { q: 'fecha 8' }).every((m) => m.fecha === 8));
  assert.ok(filtrarPartidos(lista, { estado: 'pendientes' }).every((m) => m.sello === 'pendiente'));
  assert.deepEqual(filtrarPartidos(lista, { q: 'zzzzzzz' }), []); assert.deepEqual(filtrarPartidos(null), []);
  const p = paginar(lista, 2, 10); assert.equal(p.items.length, 10); assert.equal(p.pagina, 2); assert.equal(p.paginas, Math.ceil(lista.length / 10));
  assert.equal(paginar(lista, 9999, 10).pagina, p.paginas); assert.equal(paginar(lista, -3, 10).pagina, 1); assert.equal(paginar([], 1).paginas, 1);
  const f = leerFiltros('?liga=galaxy&estado=raro&q=hugo&p=3', ['galaxy', 'sudario']);
  assert.deepEqual(f, { liga: 'galaxy', estado: 'jugados', q: 'hugo', pagina: 3 });
  assert.equal(leerFiltros('?liga=xx', ['galaxy']).liga, ''); assert.equal(leerFiltros('', []).pagina, 1);
  const esp = aplanarPartidos([{ id: 'x', titulo: ['X'] }], { x: [{ id: 'e', nombre: 'E', clubes: {}, fechas: [{ n: 1, partidos: [{ l: 'A', v: 'B', gl: null, gv: null, estado: 'aplazado' }, { l: 'C', v: 'D', gl: 3, gv: 0, estado: 'wo' }] }] }] });
  assert.deepEqual(esp.map((m) => [m.sello, m.jugado]), [['aplazado', false], ['wo', true]]);
});

import { validarGol, ordenarGoles, marcadorDeGoles, revisarMarcador, topGoleadores, topAsistentes } from '../src/js/core/golesPartido.js';
test('goles del partido: validar, ordenar, revisar y rankings', () => {
  const ok = validarGol({ lado: 'l', goleador: '  Hugo  ', minuto: '23', asistente: ' Fralex ', tipo: 'gol' });
  assert.deepEqual(ok, { ok: true, errores: [], gol: { lado: 'l', goleador: 'Hugo', minuto: 23, asistente: 'Fralex', tipo: 'gol' } });
  assert.equal(validarGol({ lado: 'v', goleador: 'A', minuto: 0 }).gol.tipo, 'gol');
  assert.equal(validarGol({ lado: 'v', goleador: 'A', minuto: 130 }).ok, true);
  for (const mal of [{ goleador: 'A', minuto: 5 }, { lado: 'l', goleador: '', minuto: 5 }, { lado: 'l', goleador: 'A', minuto: 131 }, { lado: 'l', goleador: 'A', minuto: -1 }, { lado: 'l', goleador: 'A', minuto: 'x' }, { lado: 'l', goleador: 'A', minuto: 4.5 },
    { lado: 'l', goleador: '<b>', minuto: 5 }, { lado: 'l', goleador: 'A', minuto: 5, asistente: 'a' }, { lado: 'l', goleador: 'A', minuto: 5, tipo: 'penal', asistente: 'B' }, { lado: 'l', goleador: 'A'.repeat(61), minuto: 5 }]) assert.equal(validarGol(mal).ok, false, JSON.stringify(mal));
  assert.equal(validarGol({ lado: 'l', goleador: 'A', minuto: 5, tipo: 'raro' }).gol.tipo, 'gol');
  const gs = [{ lado: 'v', goleador: 'B', minuto: 70 }, { lado: 'l', goleador: 'A', minuto: 10, asistente: 'C' }, { lado: 'l', goleador: 'A', minuto: 70, tipo: 'penal' }, { lado: 'l', goleador: 'X', minuto: 80, tipo: 'en_contra' }];
  assert.deepEqual(ordenarGoles(gs).map((g) => g.minuto), [10, 70, 70, 80]); assert.equal(gs[0].minuto, 70);
  assert.deepEqual(marcadorDeGoles(gs), { l: 3, v: 1 });
  assert.equal(revisarMarcador(gs, { gl: 3, gv: 1 }).estado, 'completo');
  assert.equal(revisarMarcador(gs, { gl: 4, gv: 1 }).estado, 'faltan'); assert.equal(revisarMarcador(gs, { gl: 2, gv: 1 }).estado, 'sobran');
  assert.equal(revisarMarcador(gs, { gl: 4, gv: 0 }).estado, 'sobran');
  assert.equal(revisarMarcador([], { gl: 1, gv: 0 }).estado, 'sin_detalle'); assert.equal(revisarMarcador(gs, { gl: null, gv: null }).estado, 'sin_marcador'); assert.equal(revisarMarcador(null, null).estado, 'sin_marcador');
  assert.deepEqual(topGoleadores(gs), [{ nombre: 'A', total: 2 }, { nombre: 'B', total: 1 }]);   // el autogol de X no cuenta
  assert.deepEqual(topAsistentes(gs), [{ nombre: 'C', total: 1 }]); assert.deepEqual(topGoleadores(null), []);
});

import { normalizarElo, normalizarEloDe } from '../src/js/core/rankingComunidad.js';
test('ELO de amistosos: normalizar filas del servidor', () => {
  const l = normalizarElo([{ pos: 1, usuario_id: 'u1', username: 'a', nombre: 'Ana', avatar_url: null, elo: 1180.4, jugados: 6, delta: 12 }, { usuario_id: 'u2', username: 'b', nombre: '<b>', elo: 900, jugados: 2, delta: -9 }, null, { elo: 1000 }]);
  assert.equal(l.length, 2); assert.equal(l[0].rango.id, 'diamante'); assert.equal(l[0].elo, 1180); assert.equal(l[1].rango.id, 'bronce'); assert.equal(l[1].delta, -9); assert.ok(!/[<>]/.test(l[1].nombre));
  assert.deepEqual(normalizarElo(null), []);
  assert.deepEqual(normalizarEloDe({ visible: true, elo: 1010.6, jugados: 3, delta: 7 }), { elo: 1011, jugados: 3, delta: 7 });
  assert.equal(normalizarEloDe({ visible: false }), null); assert.equal(normalizarEloDe({ visible: true, elo: null, jugados: 0 }), null); assert.equal(normalizarEloDe(null), null); assert.equal(normalizarEloDe({ visible: true, elo: 'x' }), null);
});

import { ordenarAmigos, resumenAmigos, unirPerfiles } from '../src/js/core/barraLateral.js';
test('barra lateral: ordenar, recortar y unir amigos', () => {
  const a = [{ id: '3', nombre: 'Óscar' }, { id: '1', nombre: 'beto' }, { id: '2', nombre: 'Ana' }, { id: '4', nombre: 'Zeta' }, { nombre: 'sin id' }];
  assert.deepEqual(ordenarAmigos(a).map((x) => x.id), ['2', '1', '3', '4']);
  assert.deepEqual(ordenarAmigos(a, new Set(['4', '1'])).map((x) => x.id), ['1', '4', '2', '3']);   // en línea primero
  assert.equal(a.length, 5);                                                                          // no muta
  const r = resumenAmigos(a, new Set(['4']), 2); assert.deepEqual([r.visibles.map((x) => x.id), r.ocultos, r.enLinea], [['4', '2'], 2, 1]);
  assert.deepEqual(resumenAmigos(null), { visibles: [], ocultos: 0, enLinea: 0 }); assert.equal(resumenAmigos(a, new Set(), 0).ocultos, 4);
  const u = unirPerfiles(['1', '9', '2'], [{ id: '2', username: 'a<b>', nombre_display: '<i>Ana</i>', avatar_url: 'x' }, { id: '1', username: 'beto' }, null]);
  assert.deepEqual(u.map((x) => x.id), ['1', '2']); assert.equal(u[0].nombre, 'beto'); assert.ok(!/[<>]/.test(u[1].nombre) && !/[<>]/.test(u[1].username));
  assert.deepEqual(unirPerfiles(null, null), []);
});

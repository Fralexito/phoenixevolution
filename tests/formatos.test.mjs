import test from 'node:test';
import assert from 'node:assert/strict';
import { ordenSemillas, limpiarJugadores, mezclar, eliminacionSimple, dobleEliminacion, liguilla, repartirGrupos, gruposPlayoffs, emparejarSuizo, primeraRondaSuizo, rondasSuizo, crearColina, jugarColina, retarEscalera, acumularCircuito, validarFormato, generar, etiquetaSlot } from '../src/js/core/formatos.js';

const nombres = (n) => Array.from({ length: n }, (_, i) => `J${i + 1}`);
const jugables = (rondas) => rondas.flatMap((r) => r.partidos).filter((m) => !m.bye);

test('ordenSemillas: clásico 1v8, 4v5, 2v7, 3v6', () => {
  assert.deepEqual(ordenSemillas(8), [1, 8, 4, 5, 2, 7, 3, 6]);
  assert.deepEqual(ordenSemillas(4), [1, 4, 2, 3]);
});
test('limpiarJugadores quita vacíos y repetidos sin distinguir mayúsculas', () => {
  assert.deepEqual(limpiarJugadores([' Ana ', 'ana', '', null, 'Luis  Paz']), ['Ana', 'Luis Paz']);
});
test('mezclar es reproducible y conserva a todos', () => {
  const a = mezclar(nombres(10), 7); const b = mezclar(nombres(10), 7);
  assert.deepEqual(a, b); assert.deepEqual([...a].sort(), nombres(10).sort());
});
test('eliminación: 8 jugadores = 3 rondas y 7 partidos; 6 jugadores = 5 partidos con byes a los mejores', () => {
  const r8 = eliminacionSimple(nombres(8));
  assert.deepEqual(r8.map((r) => r.nombre), ['Cuartos de final', 'Semifinales', 'Final']);
  assert.equal(jugables(r8).length, 7);
  const r6 = eliminacionSimple(nombres(6));
  assert.equal(jugables(r6).length, 5);
  const byes = r6[0].partidos.filter((m) => m.bye).map((m) => m.a ?? m.b).sort();
  assert.deepEqual(byes, ['J1', 'J2']);
});
test('eliminación: cada jugador aparece una vez en la primera ronda y el tercer puesto sale de las semis', () => {
  const r = eliminacionSimple(nombres(8), { tercerPuesto: true });
  const vistos = r[0].partidos.flatMap((m) => [m.a, m.b]).sort();
  assert.deepEqual(vistos, nombres(8).sort());
  const tp = r[2].partidos.find((m) => m.tercerPuesto);
  assert.deepEqual(tp.a, { perdedorDe: 'E2-1' });
});
test('doble eliminación: 8 jugadores = 14 partidos (2N-2) y termina en Gran Final', () => {
  const r = dobleEliminacion(nombres(8));
  assert.equal(jugables(r).length, 14);
  assert.equal(r.at(-1).nombre, 'Gran Final');
  assert.equal(jugables(dobleEliminacion(nombres(4))).length, 6);
});
test('liguilla par: N-1 fechas y todos juegan contra todos una vez', () => {
  const f = liguilla(nombres(6));
  assert.equal(f.length, 5); assert.equal(jugables(f).length, 15);
  const pares = new Set(jugables(f).map((m) => [m.a, m.b].sort().join('|')));
  assert.equal(pares.size, 15);
});
test('liguilla impar: cada jugador descansa una vez', () => {
  const f = liguilla(nombres(5));
  assert.equal(f.length, 5); assert.equal(jugables(f).length, 10);
  assert.deepEqual(f.map((x) => x.descansa).sort(), nombres(5).sort());
});
test('liguilla ida y vuelta: duplica y la vuelta invierte el local', () => {
  const f = liguilla(nombres(4), { idaVuelta: true });
  assert.equal(f.length, 6); assert.equal(jugables(f).length, 12);
  assert.deepEqual([f[3].partidos[0].a, f[3].partidos[0].b], [f[0].partidos[0].b, f[0].partidos[0].a]);
});
test('repartirGrupos en serpiente equilibra', () => {
  const g = repartirGrupos(nombres(8), 2);
  assert.deepEqual(g[0].jugadores, ['J1', 'J4', 'J5', 'J8']);
  assert.deepEqual(g[1].jugadores, ['J2', 'J3', 'J6', 'J7']);
});
test('grupos + playoffs: 8 jugadores → 2 grupos, semifinales A1-B2 y B1-A2', () => {
  const g = gruposPlayoffs(nombres(8));
  assert.equal(g.grupos.length, 2);
  assert.equal(g.playoffs[0].nombre, 'Semifinales');
  assert.equal(etiquetaSlot(g.playoffs[0].partidos[0].a), '1.º del Grupo A');
  assert.equal(etiquetaSlot(g.playoffs[0].partidos[0].b), '2.º del Grupo B');
  assert.equal(etiquetaSlot(g.playoffs[0].partidos[1].a), '1.º del Grupo B');
});
test('suizo: rondas, primera ronda y no repetir rival', () => {
  assert.equal(rondasSuizo(8), 3); assert.equal(rondasSuizo(9), 4);
  const r1 = primeraRondaSuizo(nombres(8));
  assert.deepEqual([r1.partidos[0].a, r1.partidos[0].b], ['J1', 'J5']);
  const jugados = r1.partidos.map((m) => [m.a, m.b]);
  const puntos = { J1: 3, J2: 3, J3: 3, J4: 3, J5: 0, J6: 0, J7: 0, J8: 0 };
  const r2 = emparejarSuizo({ jugadores: nombres(8), puntos, jugados });
  assert.equal(r2.repetidos, false);
  assert.equal(r2.partidos.length, 4);
  const ya = new Set(jugados.map(([a, b]) => [a, b].sort().join('|')));
  for (const m of r2.partidos) assert.equal(ya.has([m.a, m.b].sort().join('|')), false);
});
test('suizo impar: el descanso va al último sin bye previo', () => {
  const r = emparejarSuizo({ jugadores: nombres(5), puntos: { J1: 3, J2: 3, J3: 0, J4: 0, J5: 0 }, conBye: ['J5'] });
  assert.equal(r.bye, 'J4'); assert.equal(r.partidos.length, 2);
});
test('rey de la colina: el ganador se queda, el perdedor va al final y la racha corona', () => {
  let e = crearColina(['A', 'B', 'C', 'D'], { maxRacha: 2 });
  e = jugarColina(e, 'A'); assert.deepEqual([e.campeon, e.cola, e.racha], ['A', ['C', 'D', 'B'], 1]);
  e = jugarColina(e, 'C'); assert.deepEqual([e.campeon, e.racha], ['C', 1]);
  e = jugarColina(e, 'C'); assert.equal(e.coronas.C, 1); assert.equal(e.racha, 0); assert.notEqual(e.campeon, 'C');
  assert.equal(jugarColina(e, 'Z'), e);
});
test('escalera: alcance, intercambio y errores', () => {
  const o = ['A', 'B', 'C', 'D', 'E'];
  assert.deepEqual(retarEscalera(o, 'D', 'B', 'D').orden, ['A', 'D', 'C', 'B', 'E']);
  assert.deepEqual(retarEscalera(o, 'D', 'B', 'B').orden, o);
  assert.equal(retarEscalera(o, 'E', 'A', 'E', { alcance: 3 }).ok, false);
  assert.equal(retarEscalera(o, 'A', 'C', 'A').ok, false);
});
test('circuito por puntos: suma baremo y desempata por primeros puestos', () => {
  const t = acumularCircuito([{ puestos: ['A', 'B', 'C'] }, { puestos: ['B', 'A', 'C'] }]);
  assert.deepEqual(t.map((x) => [x.nombre, x.pts]), [['A', 43], ['B', 43], ['C', 30]]);
  assert.equal(t[0].nombre, 'A');
});
test('validarFormato y generar', () => {
  assert.equal(validarFormato('doble', 6).ok, false);
  assert.equal(validarFormato('eliminacion', 1).ok, false);
  assert.equal(validarFormato('nada', 8).ok, false);
  const g = generar('grupos', nombres(12));
  assert.equal(g.ok, true); assert.equal(g.grupos.length, 4); assert.ok(g.totalPartidos > 0);
  assert.equal(generar('suizo', nombres(8)).totalPartidos, 12);
  assert.equal(generar('colina', nombres(5)).estado.campeon, 'J1');
});

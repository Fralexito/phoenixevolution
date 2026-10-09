import test from 'node:test';
import assert from 'node:assert/strict';
import { generar } from '../src/js/core/formatos.js';
import { construirPlan, tablaTorneo, crucesDePuestos, grupoCompleto, siguienteRondaSuizo, estadoSuizo, campeonSugerido, agregarFechaCircuito, tablaCircuito, porRonda, etiquetaLado, leerMarcador, progreso } from '../src/js/core/torneos.js';
import { nombreEpico, reglaDelPartido, castigoDelPartido, hashTexto } from '../src/js/core/diversion.js';
import { REGLAS_RULETA } from '../src/data/modalidades.js';
import { DINAMICAS, GUIAS_FORMATOS } from '../src/data/dinamicas.js';
import { FORMATOS } from '../src/js/core/formatos.js';

const nombres = (n) => Array.from({ length: n }, (_, i) => `J${i + 1}`);
// Simula lo que hace la base: rellena fila con nombres y resultados.
const filas = (plan) => plan.partidos.map((p) => ({ clave: p.clave, ronda: p.ronda, grupo: p.grupo, orden: p.orden, a_slot: p.a, b_slot: p.b, a_nombre: typeof p.a === 'string' ? p.a : null, b_nombre: typeof p.b === 'string' ? p.b : null, ga: null, gb: null, ganador: null, jugado: false, eliminatoria: p.eliminatoria }));
const jugar = (f, ga, gb) => { f.ga = ga; f.gb = gb; f.ganador = ga > gb ? 'a' : gb > ga ? 'b' : null; f.jugado = true; };

test('plan de eliminatoria de 5: sin descansos como partido', () => {
  const plan = construirPlan(generar('eliminacion', nombres(5)));
  assert.equal(plan.ok, true);
  assert.equal(plan.partidos.length, 4);
  assert.ok(plan.partidos.every((p) => p.eliminatoria));
  assert.ok(plan.partidos.every((p) => p.a && p.b));
});

test('plan de liguilla de 4: 6 partidos sin eliminatoria', () => {
  const plan = construirPlan(generar('liguilla', nombres(4)));
  assert.equal(plan.partidos.length, 6);
  assert.ok(plan.partidos.every((p) => !p.eliminatoria));
});

test('plan de grupos: claves únicas y playoffs con puestos', () => {
  const plan = construirPlan(generar('grupos', nombres(8)));
  assert.equal(new Set(plan.partidos.map((p) => p.clave)).size, plan.partidos.length);
  assert.ok(plan.partidos.some((p) => p.a?.puesto));
  assert.equal(plan.meta.grupos.length, 2);
});

test('cerrar grupos llena los cruces de playoffs', () => {
  const plan = construirPlan(generar('grupos', nombres(8)));
  const f = filas(plan);
  assert.equal(crucesDePuestos(f).length, 0);
  f.filter((p) => p.grupo).forEach((p) => jugar(p, 2, 0));
  assert.equal(grupoCompleto(f, 'A'), true);
  const c = crucesDePuestos(f);
  assert.ok(c.length >= 2);
  assert.ok(c.every((x) => x.a && x.b));
});

test('suizo: ronda 2 con resultados reales y descanso con impares', () => {
  const js = nombres(5);
  const plan = construirPlan(generar('suizo', js));
  const f = filas(plan);
  assert.equal(estadoSuizo(f).ronda, 1);
  assert.equal(siguienteRondaSuizo(f, js, plan.estado).ok, false);
  f.forEach((p) => jugar(p, 1, 0));
  const r = siguienteRondaSuizo(f, js, plan.estado);
  assert.equal(r.ok, true);
  assert.equal(r.ronda, 2);
  assert.equal(r.partidos.length, 2);
  assert.notEqual(r.bye, plan.estado.descansos[0]);
});

test('suizo termina al llegar al total de rondas', () => {
  const js = nombres(4);
  const plan = construirPlan(generar('suizo', js));
  let f = filas(plan); let est = plan.estado;
  for (let i = 0; i < 5; i += 1) {
    f.filter((p) => !p.jugado).forEach((p) => jugar(p, 1, 0));
    const r = siguienteRondaSuizo(f, js, est, plan.meta.totalRondas);
    if (!r.ok) { assert.equal(r.terminado, true); return; }
    f = [...f, ...r.partidos.map((p) => ({ ...p, a_slot: p.a, b_slot: p.b, a_nombre: p.a, b_nombre: p.b, ga: null, gb: null, ganador: null, jugado: false }))]; est = r.estado;
  }
  assert.fail('el suizo no terminó');
});

test('campeón sugerido: final de eliminatoria y tabla de liguilla', () => {
  const plan = construirPlan(generar('eliminacion', nombres(2)));
  const f = filas(plan);
  assert.equal(campeonSugerido({ formato: 'eliminacion' }, f), null);
  jugar(f[0], 0, 3);
  assert.deepEqual(campeonSugerido({ formato: 'eliminacion' }, f), { nombre: 'J2', definitivo: true });
  const li = filas(construirPlan(generar('liguilla', nombres(3))));
  li.forEach((p) => jugar(p, p.a_nombre === 'J1' ? 2 : 0, p.a_nombre === 'J1' ? 0 : 1));
  const c = campeonSugerido({ formato: 'liguilla' }, li);
  assert.equal(c.definitivo, true);
});

test('tabla de torneo ignora partidos sin jugar y suma el descanso del suizo', () => {
  const f = [{ a_nombre: 'A', b_nombre: 'B', ga: 2, gb: 0, jugado: true, eliminatoria: false }, { a_nombre: 'A', b_nombre: 'C', ga: null, gb: null, jugado: false, eliminatoria: false }];
  const t = tablaTorneo(f, { descansos: ['C'] });
  assert.equal(t.find((x) => x.nombre === 'A').pts, 3);
  assert.equal(t.find((x) => x.nombre === 'C').pts, 3);
});

test('circuito: suma por baremo', () => {
  const r = agregarFechaCircuito({ fechas: [] }, 'Fecha 1', ['Ana', 'Beto', 'Caro']);
  assert.equal(r.ok, true);
  assert.equal(tablaCircuito(r.estado)[0].pts, 25);
  assert.equal(agregarFechaCircuito({}, 'x', ['solo']).ok, false);
});

test('utilidades de lectura', () => {
  assert.deepEqual(leerMarcador('3-1'), { ga: 3, gb: 1 });
  assert.deepEqual(leerMarcador('2 : 2'), { ga: 2, gb: 2 });
  assert.equal(leerMarcador('abc'), null);
  assert.equal(etiquetaLado(null, { ganadorDe: 'E1-1' }), 'Ganador E1-1');
  assert.equal(etiquetaLado(null, null), 'Por definir');
  assert.equal(progreso([{ jugado: true }, { jugado: false }]).pct, 50);
  assert.equal(porRonda([{ ronda: 'A', orden: 2 }, { ronda: 'B', orden: 1 }])[0].nombre, 'B');
});

test('sinTope permite una liguilla grande y el plan avisa si pasa de 2000 partidos', () => {
  assert.equal(generar('liguilla', nombres(20)).ok, false);
  assert.equal(generar('liguilla', nombres(20), { sinTope: true }).ok, true);
  const grande = construirPlan(generar('liguilla', nombres(80), { sinTope: true }));
  assert.equal(grande.ok, false);
});

test('diversión: determinista y con catálogo completo', () => {
  assert.equal(nombreEpico(7), nombreEpico(7));
  assert.equal(reglaDelPartido(5, 'E1-1', REGLAS_RULETA), reglaDelPartido(5, 'E1-1', REGLAS_RULETA));
  assert.ok(castigoDelPartido(1, 'x').length > 5);
  assert.equal(hashTexto('a'), hashTexto('a'));
  assert.ok(DINAMICAS.length >= 40);
  assert.equal(new Set(DINAMICAS.map((d) => d.id)).size, DINAMICAS.length);
  assert.ok(DINAMICAS.every((d) => d.guia && d.texto && d.icono));
  for (const f of FORMATOS) assert.ok(GUIAS_FORMATOS[f.id]?.pasos.length >= 3, f.id);
  assert.ok(GUIAS_FORMATOS.libre);
});

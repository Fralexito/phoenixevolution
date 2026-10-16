import test from 'node:test';
import assert from 'node:assert/strict';
import * as G from '../src/js/core/ganarAscuas.js';

test('racha: +5 por día, día 3 +10 extra, día 7 +40 extra y el ciclo se repite', () => {
  assert.deepEqual([1, 2, 3, 4, 5, 6, 7, 8, 10, 14].map(G.ascuasRacha), [5, 5, 15, 5, 5, 5, 45, 5, 15, 45]);
  assert.equal(G.cicloRacha(8), 1);
  assert.equal(G.bonoRacha(3), 10);
  assert.equal(G.bonoRacha(7), 40);
  assert.equal(G.bonoRacha(0), 0);   // basura => día 1
});

test('normalizarGanar tolera null y basura', () => {
  const g = G.normalizarGanar(null);
  assert.equal(g.racha.actual, 0);
  assert.equal(g.racha.siguiente, 1);
  assert.equal(g.racha.ascuasSiguiente, 5);
  assert.deepEqual(g.misiones.items, []);
  assert.deepEqual(g.logros.items, []);
  assert.equal(g.logros.topeDia, 200);
  assert.equal(G.normalizarGanar('x').racha.reclamadaHoy, false);
});

test('normalizarGanar limpia misiones y logros', () => {
  const g = G.normalizarGanar({
    racha: { actual: 2, mejor: 9, reclamada_hoy: true, siguiente: 3 },
    primer_partido: { ascuas: 5, ganado_hoy: true },
    misiones: { semana_fin: '2026-10-19T05:00:00Z', items: [
      { clave: 'm_rivales3', titulo: ' Tres rivales ', meta: 3, progreso: 99, ascuas: 60, cobrable: true },
      { clave: '<script>', titulo: 'malo', meta: 1 },
      { clave: 'm_x', meta: 0, progreso: -4, cobrado: true, cobrable: true } ] },
    logros: { tope_dia: 200, usado_hoy: 20, items: [{ clave: 'fundador', titulo: 'Un año', icono: 'fa-x"onload', nivel: 'diamante', meta: 365, progreso: 10, ascuas: 200, obtenido: false }] },
  });
  assert.equal(g.racha.reclamadaHoy, true);
  assert.equal(g.racha.ascuasSiguiente, 15);
  assert.equal(g.primerPartido.ganadoHoy, true);
  assert.equal(g.misiones.items.length, 2);                       // la clave peligrosa se descarta
  assert.equal(g.misiones.items[0].titulo, 'Tres rivales');
  assert.equal(g.misiones.items[0].progreso, 3);                  // no pasa de la meta
  assert.equal(g.misiones.items[0].cobrable, true);
  assert.equal(g.misiones.items[1].meta, 1);
  assert.equal(g.misiones.items[1].progreso, 0);
  assert.equal(g.misiones.items[1].cobrable, false);              // ya cobrada => no se puede cobrar otra vez
  assert.equal(g.logros.items[0].icono, 'fa-trophy');             // icono inválido => por defecto
  assert.equal(g.logros.items[0].nivel, 'bronce');
});

test('pendientesPorReclamar suma la recompensa de hoy, misiones y logros listos', () => {
  const g = G.normalizarGanar({ racha: { reclamada_hoy: false, siguiente: 1 }, misiones: { items: [{ clave: 'm_a1', meta: 1, progreso: 1, cobrable: true }, { clave: 'm_b1', meta: 5, progreso: 1 }] }, logros: { items: [{ clave: 'lg1', meta: 1, progreso: 1, cobrable: true, ascuas: 20 }] } });
  assert.equal(G.pendientesPorReclamar(g), 3);
  assert.equal(G.pendientesPorReclamar(null), 0);
});

test('porcentaje y textoTermina', () => {
  assert.equal(G.porcentaje(2, 3), 67);
  assert.equal(G.porcentaje(9, 3), 100);
  assert.equal(G.porcentaje(1, 0), 0);
  const ahora = Date.parse('2026-10-16T12:00:00Z');
  assert.equal(G.textoTermina('2026-10-16T20:00:00Z', ahora), 'Termina hoy');
  assert.equal(G.textoTermina('2026-10-17T20:00:00Z', ahora), 'Termina mañana');
  assert.equal(G.textoTermina('2026-10-19T05:00:00Z', ahora), 'Termina en 3 días');
  assert.equal(G.textoTermina('2026-10-10T00:00:00Z', ahora), 'Terminó');
  assert.equal(G.textoTermina(null, ahora), '');
});

test('diasHechosCiclo: cuántos de los 7 días se pintan como cumplidos', () => {
  assert.equal(G.diasHechosCiclo({ actual: 0, reclamadaHoy: false }), 0);
  assert.equal(G.diasHechosCiclo({ actual: 3, reclamadaHoy: true }), 3);
  assert.equal(G.diasHechosCiclo({ actual: 3, reclamadaHoy: false }), 3);   // reclamaste ayer, hoy toca el 4
  assert.equal(G.diasHechosCiclo({ actual: 7, reclamadaHoy: true }), 7);
  assert.equal(G.diasHechosCiclo({ actual: 7, reclamadaHoy: false }), 0);   // ciclo completo: empieza otro
  assert.equal(G.diasHechosCiclo({ actual: 9, reclamadaHoy: true }), 2);
});

test('textoRachaDiaria', () => {
  const nueva = G.normalizarGanar(null).racha;
  assert.match(G.textoRachaDiaria(nueva), /Empieza tu racha.*\+5/);
  assert.match(G.textoRachaDiaria({ actual: 2, reclamadaHoy: false, ascuasSiguiente: 15 }), /Racha de 2 días.*\+15/);
  assert.match(G.textoRachaDiaria({ actual: 1, reclamadaHoy: true, ascuasSiguiente: 5 }), /Racha de 1 día!.*Mañana: \+5/);
});

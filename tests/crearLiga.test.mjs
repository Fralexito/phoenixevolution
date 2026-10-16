import test from 'node:test';
import assert from 'node:assert/strict';
import { PLANTILLAS, plantillaPorId, formatoDe, limitesDe, ajustarJugadores, resumenPartidos, construirTorneo } from '../src/js/core/crearLiga.js';
import { formatoPorId } from '../src/js/core/formatos.js';

test('las 4 plantillas apuntan a formatos que existen y sus límites son coherentes', () => {
  assert.equal(PLANTILLAS.length, 4);
  for (const p of PLANTILLAS) {
    const f = formatoPorId(p.formato);
    assert.ok(f, `${p.id} → formato ${p.formato}`);
    assert.ok(p.min >= f.min && p.max <= f.max, `${p.id} límites dentro del formato`);
    assert.ok(p.defecto >= p.min && p.defecto <= p.max, `${p.id} defecto en rango`);
  }
});

test('la Liga con ida y vuelta usa el formato idavuelta y baja el máximo a 10', () => {
  assert.equal(formatoDe('liga'), 'liguilla');
  assert.equal(formatoDe('liga', { idaVuelta: true }), 'idavuelta');
  assert.equal(formatoDe('copa', { idaVuelta: true }), 'eliminacion');
  assert.deepEqual(limitesDe('liga'), { min: 3, max: 12 });
  assert.deepEqual(limitesDe('liga', { idaVuelta: true }), { min: 3, max: 10 });
});

test('ajustarJugadores recorta a los límites y redondea', () => {
  assert.equal(ajustarJugadores('liga', 99), 12);
  assert.equal(ajustarJugadores('liga', 1), 3);
  assert.equal(ajustarJugadores('copa', 7.6), 8);
  assert.equal(ajustarJugadores('copa', 'x'), 2);
  assert.equal(ajustarJugadores('liga', 11, { idaVuelta: true }), 10);
});

test('resumenPartidos cuenta bien: liga de 8 = 28 partidos; copa de 8 = 7; ida y vuelta de 4 = 12', () => {
  assert.equal(resumenPartidos('liga', 8).partidos, 28);
  assert.equal(resumenPartidos('copa', 8).partidos, 7);
  assert.equal(resumenPartidos('liga', 4, { idaVuelta: true }).partidos, 12);
  assert.equal(resumenPartidos('liga', 2), null);
});

test('construirTorneo: caso feliz con valores por defecto sanos', () => {
  const r = construirTorneo({ plantilla: 'liga', nombre: '  Liga   del Pollo ', jugadores: 8 });
  assert.equal(r.ok, true);
  assert.equal(r.args.nombre, 'Liga del Pollo');
  assert.equal(r.args.formato, 'liguilla');
  assert.equal(r.args.cupo, 8);
  assert.equal(r.args.visibilidad, 'publico');
  assert.equal(r.args.juega, true);
  assert.equal(r.args.config.origen, 'crear-liga');
  assert.equal(r.args.config.plantilla, 'liga');
  assert.equal(r.args.inicia, null);
});

test('construirTorneo: rechaza nombre corto o largo, tipo desconocido y jugadores fuera de rango', () => {
  assert.equal(construirTorneo({ plantilla: 'liga', nombre: 'ab', jugadores: 8 }).ok, false);
  assert.equal(construirTorneo({ plantilla: 'liga', nombre: 'x'.repeat(81), jugadores: 8 }).ok, false);
  assert.equal(construirTorneo({ plantilla: 'inventada', nombre: 'Hola', jugadores: 8 }).ok, false);
  assert.equal(construirTorneo({ plantilla: 'liga', nombre: 'Hola', jugadores: 2 }).ok, false);
  assert.equal(construirTorneo({ plantilla: 'liga', nombre: 'Hola', jugadores: 13 }).ok, false);
  assert.equal(construirTorneo({ plantilla: 'liga', nombre: 'Hola', jugadores: 'ocho' }).ok, false);
  assert.equal(construirTorneo({ plantilla: 'mundial', nombre: 'Hola', jugadores: 5 }).ok, false);
});

test('construirTorneo: las opciones solo aplican a la plantilla que corresponde', () => {
  const copa = construirTorneo({ plantilla: 'copa', nombre: 'Copa X', jugadores: 16, opciones: { tercerPuesto: true, grupos: 4 } });
  assert.equal(copa.args.config.tercerPuesto, true);
  assert.equal(copa.args.config.grupos, null);
  const liga = construirTorneo({ plantilla: 'liga', nombre: 'Liga X', jugadores: 6, opciones: { tercerPuesto: true } });
  assert.equal(liga.args.config.tercerPuesto, false);
  const mundial = construirTorneo({ plantilla: 'mundial', nombre: 'Mundial X', jugadores: 16, opciones: { grupos: 4 } });
  assert.equal(mundial.args.config.grupos, 4);
  const iv = construirTorneo({ plantilla: 'liga', nombre: 'Liga IV', jugadores: 10, opciones: { idaVuelta: true } });
  assert.equal(iv.args.formato, 'idavuelta');
  assert.equal(construirTorneo({ plantilla: 'liga', nombre: 'Liga IV', jugadores: 11, opciones: { idaVuelta: true } }).ok, false);
});

test('construirTorneo: visibilidad, enlace y fecha se validan', () => {
  const base = { plantilla: 'copa', nombre: 'Copa Z', jugadores: 8 };
  assert.equal(construirTorneo({ ...base, opciones: { visibilidad: 'raro' } }).args.visibilidad, 'publico');
  assert.equal(construirTorneo({ ...base, opciones: { visibilidad: 'privado' } }).args.visibilidad, 'privado');
  assert.equal(construirTorneo({ ...base, opciones: { enlace: 'http://malo' } }).ok, false);
  assert.equal(construirTorneo({ ...base, opciones: { enlace: 'https://discord.gg/x' } }).ok, true);
  assert.equal(construirTorneo({ ...base, opciones: { inicia: 'no-es-fecha' } }).ok, false);
  assert.match(construirTorneo({ ...base, opciones: { inicia: '2026-12-01T20:00' } }).args.inicia, /^2026-12-0[12]T/);
  assert.equal(construirTorneo({ ...base, opciones: { juega: false } }).args.juega, false);
});

test('plantillaPorId devuelve null si no existe', () => { assert.equal(plantillaPorId('x'), null); });

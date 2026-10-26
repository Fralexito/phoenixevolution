import test from 'node:test';
import assert from 'node:assert/strict';
import {
  golesVivo, textoGol, normalizarVivo, aplicarCambioVivo, limpiarVivos, ordenarVivos, huboGol,
  validarMarcador, colaValidacion, puedeReclamar, resumenDoctor, FINAL_MS,
} from '../src/js/core/competicion/ligaVivo.js';

const fila = (x = {}) => ({ sala_id: 's1', partido_id: null, local: 'Fralex', visitante: 'Mirko', goles_local: 0, goles_visita: 0,
  minuto: 10, periodo: 1, fase: 'en_juego', goles: [], actualizado: '2026-10-11T10:00:00Z', ...x });

test('ligaVivo: goles con y sin goleador', () => {
  const g = golesVivo([{ m: 12, l: 'l', j: 'MESSI' }, { m: 80, l: 'v', j: 'ARAUJO', pp: true }, { m: 5 }, { m: 'x' }, null, { m: 300, l: 'z' }]);
  assert.deepEqual(g, [
    { m: 12, l: 'l', j: 'MESSI', pp: false },
    { m: 80, l: 'v', j: 'ARAUJO', pp: true },
    { m: 5, l: 'l', j: '', pp: false },
    { m: 200, l: 'l', j: '', pp: false },
  ]);
  assert.equal(textoGol(g[0]), '12′ MESSI');
  assert.equal(textoGol(g[1]), '80′ ARAUJO (p.p.)');
  assert.equal(textoGol(g[2]), '5′');
  assert.equal(textoGol(null), '');
  assert.deepEqual(golesVivo('nada'), []);
});

test('ligaVivo: fila rara se normaliza', () => {
  const n = normalizarVivo({ sala_id: 'a', goles_local: 120, goles_visita: -3, minuto: 'x', fase: 'raro', local: '  ' });
  assert.equal(n.goles_local, 99);
  assert.equal(n.goles_visita, 0);
  assert.equal(n.minuto, 0);
  assert.equal(n.fase, 'en_juego');
  assert.equal(n.local, 'Local');
  assert.equal(normalizarVivo({}), null);
  assert.equal(normalizarVivo(null), null);
});

test('ligaVivo: insert, update y delete con «Final» de 30 s', () => {
  let l = aplicarCambioVivo([], { eventType: 'INSERT', new: fila() }, 1000);
  assert.equal(l.length, 1);
  l = aplicarCambioVivo(l, { eventType: 'UPDATE', new: fila({ goles_local: 1, goles: [{ m: 12, l: 'l', j: 'MESSI' }] }) }, 2000);
  assert.equal(l.length, 1);
  assert.equal(l[0].goles_local, 1);
  assert.equal(l[0].goles[0].j, 'MESSI');
  // DELETE solo trae la clave primaria
  l = aplicarCambioVivo(l, { eventType: 'DELETE', old: { sala_id: 's1' } }, 5000);
  assert.equal(l.length, 1);
  assert.equal(l[0].fase, 'final');
  assert.equal(l[0].terminado, true);
  assert.equal(l[0].goles_local, 1);                      // conserva el marcador
  assert.equal(limpiarVivos(l, 5000 + FINAL_MS - 1).length, 1);
  assert.equal(limpiarVivos(l, 5000 + FINAL_MS).length, 0);
  // DELETE de algo desconocido: nada
  assert.deepEqual(aplicarCambioVivo([], { eventType: 'DELETE', old: { sala_id: 'zz' } }, 1), []);
  // La misma sala vuelve a jugar: deja de estar terminada
  l = aplicarCambioVivo(l, { eventType: 'INSERT', new: fila({ minuto: 1 }) }, 6000);
  assert.equal(l[0].terminado, false);
  assert.equal(l[0].quitarEn, null);
  // Cambio sin clave: ignorado
  assert.deepEqual(aplicarCambioVivo([], { eventType: 'INSERT', new: {} }, 1), []);
  assert.deepEqual(aplicarCambioVivo([], undefined, 1), []);
});

test('ligaVivo: orden, gol y marcador del staff', () => {
  const a = normalizarVivo(fila({ sala_id: 'a', actualizado: '2026-10-11T10:00:00Z' }));
  const b = normalizarVivo(fila({ sala_id: 'b', partido_id: 9, actualizado: '2026-10-11T09:00:00Z' }));
  const c = normalizarVivo(fila({ sala_id: 'c', actualizado: '2026-10-11T11:00:00Z' }));
  assert.deepEqual(ordenarVivos([a, b, c]).map((x) => x.sala_id), ['b', 'c', 'a']);
  assert.equal(huboGol(a, { ...a, goles_visita: 1 }), true);
  assert.equal(huboGol(a, { ...a, minuto: 50 }), false);
  assert.equal(huboGol(null, a), false);
  assert.deepEqual(validarMarcador('2', ' 1 '), { ok: true, gl: 2, gv: 1 });
  assert.equal(validarMarcador('', '1').ok, false);
  assert.equal(validarMarcador('100', '1').ok, false);
  assert.equal(validarMarcador('-1', '1').ok, false);
  assert.equal(validarMarcador('1.5', '1').ok, false);
});

test('ligaVivo: cola del staff, reclamar y doctor', () => {
  const ps = [
    { id: 1, estado: 'propuesto', propuesto_en: '2026-10-11T10:00:00Z' },
    { id: 2, estado: 'confirmado' },
    { id: 3, estado: 'disputa', propuesto_en: '2026-10-10T10:00:00Z' },
    { id: 4, estado: 'propuesto', propuesto_en: '2026-10-11T12:00:00Z' },
    { id: 5, estado: 'pendiente' },
  ];
  assert.deepEqual(colaValidacion(ps).map((p) => p.id), [3, 4, 1]);
  assert.deepEqual(colaValidacion(null), []);
  assert.equal(puedeReclamar({ estado: 'propuesto', detalle: {} }), true);
  assert.equal(puedeReclamar({ estado: 'confirmado' }), true);
  assert.equal(puedeReclamar({ estado: 'confirmado', detalle: { reclamo: { motivo: 'x' } } }), false);
  assert.equal(puedeReclamar({ estado: 'disputa' }), false);
  assert.equal(puedeReclamar(null), false);
  assert.deepEqual(resumenDoctor({ doctor: { parche: 'ConmeGOL Patch 26', huella: 'abcdef0123456789zz', avisos: ['a', 3] } }),
    { parche: 'ConmeGOL Patch 26', huella: 'abcdef0123456789', avisos: ['a'] });
  assert.equal(resumenDoctor({}), null);
  assert.equal(resumenDoctor(null), null);
});

test('ligaVivo: resultados confirmados de la base sobre las fechas de la web', async () => {
  const { fusionarConfirmados } = await import('../src/js/core/competicion/ligaVivo.js');
  const { calcularTabla } = await import('../src/js/core/competicion/tabla.js');
  const { EDICIONES } = await import('../src/data/ligaResultados.js');
  const fechas = [
    { n: 1, partidos: [{ l: 'A', v: 'B', gl: 1, gv: 0 }, { l: 'C', v: 'D', gl: null, gv: null, estado: 'aplazado' }] },
    { n: 2, partidos: [{ l: 'A', v: 'C', gl: null, gv: null }] },
  ];
  const bd = [
    { fecha: 1, local: 'C', visitante: 'D', goles_local: 2, goles_visita: 2, estado: 'confirmado' },
    { fecha: 1, local: 'A', visitante: 'B', goles_local: 1, goles_visita: 0, estado: 'confirmado' },   // ya igual
    { fecha: 2, local: 'A', visitante: 'C', goles_local: 3, goles_visita: 0, estado: 'propuesto' },    // aún no validado
    { fecha: 9, local: 'X', visitante: 'Y', goles_local: 1, goles_visita: 0, estado: 'confirmado' },   // no existe en la web
  ];
  const r = fusionarConfirmados(fechas, bd);
  assert.equal(r.cambios, 1);
  assert.deepEqual(r.fechas[0].partidos[1], { l: 'C', v: 'D', gl: 2, gv: 2 });
  assert.equal(fechas[0].partidos[1].gl, null);                       // no toca el original
  assert.equal(r.fechas[1].partidos[0].gl, null);
  const t = calcularTabla(r.fechas.flatMap((f) => f.partidos)).tabla;
  assert.equal(t.find((f) => f.nombre === 'C').pts, 1);
  assert.equal(fusionarConfirmados(null, null).cambios, 0);
  // Con los datos reales: si la base confirma lo mismo que la web, no cambia nada
  const ed = EDICIONES.galaxy[0];
  const espejo = ed.fechas.flatMap((f) => f.partidos.filter((m) => Number.isInteger(m.gl)).map((m) => ({ fecha: f.n, local: m.l, visitante: m.v, goles_local: m.gl, goles_visita: m.gv, estado: 'confirmado' })));
  assert.equal(fusionarConfirmados(ed.fechas, espejo).cambios, 0);
});

test('ligaVivo: pantalla del juego y texto del estado (Phoenix Referee v1.2)', async () => {
  const { textoEstado, normalizarVivo, PANTALLAS } = await import('../src/js/core/competicion/ligaVivo.js');
  const base = { sala_id: 's', local: 'A', visitante: 'B', goles_local: 0, goles_visita: 0, minuto: 0, periodo: 0 };
  assert.equal(textoEstado(normalizarVivo({ ...base, fase: 'previa', pantalla: 'equipos' })), 'Eligiendo equipos');
  assert.equal(textoEstado(normalizarVivo({ ...base, fase: 'previa', pantalla: 'saliendo' })), 'Saliendo al campo');
  assert.equal(textoEstado(normalizarVivo({ ...base, fase: 'previa', pantalla: 'cargando' })), 'Cargando el partido');
  assert.equal(textoEstado(normalizarVivo({ ...base, fase: 'previa' })), 'Previa');                       // Link viejo: sin pantalla
  assert.equal(normalizarVivo({ ...base, fase: 'previa', pantalla: 'raro' }).pantalla, null);
  assert.equal(textoEstado(normalizarVivo({ ...base, fase: 'en_juego', minuto: 34, periodo: 2 })), '34′ · 2.º tiempo');
  assert.equal(textoEstado(normalizarVivo({ ...base, fase: 'pausado', minuto: 67, periodo: 2, pantalla: 'pausa' })), '67′ · En pausa');
  assert.equal(textoEstado(normalizarVivo({ ...base, fase: 'descanso', minuto: 45, periodo: 1 })), 'Descanso');
  assert.equal(textoEstado({ ...normalizarVivo({ ...base, fase: 'en_juego' }), terminado: true }), 'Final');
  assert.equal(textoEstado(null), '');
  for (const p of ['menu', 'equipos', 'ajustes', 'cargando', 'saliendo', 'en_juego', 'descanso', 'pausa', 'final']) assert.ok(PANTALLAS[p]);
});

test('ligaVivo: añadido, penales y ficha de Link 0.3.51', async () => {
  const { textoEstado, normalizarVivo } = await import('../src/js/core/competicion/ligaVivo.js');
  const n = normalizarVivo({ sala_id: 's', minuto: 47, periodo: 1, fase: 'en_juego', anadido: 3, pk_local: 4, pk_visita: 3, ficha: { clima: 1 } });
  assert.equal(textoEstado(n), '45+2′ · 1.er tiempo');
  assert.equal(n.pk_local, 4); assert.equal(n.pk_visita, 3); assert.deepEqual(n.ficha, { clima: 1 });
  const viejo = normalizarVivo({ sala_id: 's', minuto: 47, periodo: 1, fase: 'en_juego' });   // Link viejo: como antes
  assert.equal(textoEstado(viejo), '47′ · 1.er tiempo');
  assert.equal(viejo.anadido, 0); assert.equal(viejo.pk_local, null); assert.equal(viejo.ficha, null);
  assert.equal(normalizarVivo({ sala_id: 's', ficha: [1] }).ficha, null);
});

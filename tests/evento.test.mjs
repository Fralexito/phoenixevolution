import { test } from 'node:test';
import assert from 'node:assert/strict';
import { limaAISO, isoALima, formatoLima, estadoEvento, cuentaRegresiva, normalizarEventos, validarFormulario, nombreJuego, textoVacio, JUEGOS_EVENTO, LIMITES } from '../src/js/core/evento.js';
import { puede } from '../src/js/core/roles.js';

const T0 = Date.parse('2026-10-05T12:00:00-05:00');          // lunes 5 oct 2026, 12:00 Lima
const ev = (o = {}) => ({ id: 1, titulo: 'Copa', descripcion: '', juego: 'pes', inicia_at: '2026-10-05T19:00:00-05:00', cancelado: false, interesados: 0, mi_interes: false, mi_recordar: false, ...o });

test('limaAISO: hora de Lima fija (-05:00) y rechaza fechas imposibles', () => {
  assert.equal(limaAISO('2026-10-11', '19:00'), '2026-10-11T19:00:00-05:00');
  for (const [f, h] of [['2026-02-31', '10:00'], ['2026-13-01', '10:00'], ['2026-10-11', '25:00'], ['2026-10-11', '10:60'], ['11/10/2026', '10:00'], ['', ''], [null, undefined], ['2026-10-11', '7:00']]) assert.equal(limaAISO(f, h), null, `${f} ${h}`);
  assert.equal(limaAISO('2028-02-29', '00:00'), '2028-02-29T00:00:00-05:00');   // bisiesto válido
  assert.equal(limaAISO('2027-02-29', '00:00'), null);
});
test('isoALima y formatoLima: independientes de la zona del navegador', () => {
  assert.deepEqual(isoALima('2026-10-12T00:00:00Z'), { fecha: '2026-10-11', hora: '19:00' });
  assert.deepEqual(isoALima('2026-01-01T03:30:00Z'), { fecha: '2025-12-31', hora: '22:30' });   // cruza de año hacia atrás
  assert.equal(isoALima('basura'), null); assert.equal(isoALima(null), null);
  assert.equal(formatoLima('2026-10-12T00:00:00Z'), 'dom 11 oct · 19:00');
  assert.equal(formatoLima('nope'), '');
  assert.equal(isoALima(limaAISO('2026-10-11', '19:05')).hora, '19:05');                    // ida y vuelta
});
test('estadoEvento: cancelado, próximo, hoy, pronto, en curso, pasado', () => {
  assert.equal(estadoEvento(ev({ cancelado: true }), T0), 'cancelado');
  assert.equal(estadoEvento(ev({ inicia_at: '2026-10-08T19:00:00-05:00' }), T0), 'proximo');
  assert.equal(estadoEvento(ev(), T0), 'hoy');
  assert.equal(estadoEvento(ev({ inicia_at: '2026-10-05T12:45:00-05:00' }), T0), 'pronto');
  assert.equal(estadoEvento(ev({ inicia_at: '2026-10-05T13:00:00-05:00' }), T0), 'pronto');         // justo 1 h
  assert.equal(estadoEvento(ev({ inicia_at: '2026-10-05T13:00:01-05:00' }), T0), 'hoy');
  assert.equal(estadoEvento(ev({ inicia_at: '2026-10-05T11:00:00-05:00' }), T0), 'en_curso');
  assert.equal(estadoEvento(ev({ inicia_at: '2026-10-05T08:59:00-05:00' }), T0), 'pasado');         // hace más de 3 h
  assert.equal(estadoEvento(ev({ inicia_at: 'basura' }), T0), 'pasado');
  assert.equal(estadoEvento(null, T0), 'pasado');
  // «hoy» se decide por el día de LIMA, no por el UTC: 23:30 Lima = 04:30 UTC del día siguiente
  assert.equal(estadoEvento(ev({ inicia_at: '2026-10-05T23:30:00-05:00' }), T0), 'hoy');
});
test('cuentaRegresiva', () => {
  const en = (ms) => new Date(T0 + ms).toISOString();
  assert.equal(cuentaRegresiva(en(-1), T0), 'ya empezó');
  assert.equal(cuentaRegresiva(en(30 * 1000), T0), 'en menos de 1 min');
  assert.equal(cuentaRegresiva(en(45 * 60000), T0), 'en 45 min');
  assert.equal(cuentaRegresiva(en(2 * 3600000), T0), 'en 2 h');
  assert.equal(cuentaRegresiva(en(2 * 3600000 + 5 * 60000), T0), 'en 2 h 5 min');
  assert.equal(cuentaRegresiva(en(50 * 3600000), T0), 'en 2 d 2 h');
  assert.equal(cuentaRegresiva(en(48 * 3600000), T0), 'en 2 d');
  assert.equal(cuentaRegresiva('x', T0), '');
});
test('normalizarEventos tolera basura y limpia campos', () => {
  assert.deepEqual(normalizarEventos(null), []); assert.deepEqual(normalizarEventos({}), []);
  const r = normalizarEventos([null, 5, { id: 'x', titulo: 'a', inicia_at: '2026-10-05T00:00:00Z' }, { id: 2, titulo: 3, inicia_at: '2026-10-05T00:00:00Z' }, { id: 3, titulo: 'ok', inicia_at: 'mal' },
    { id: 4, titulo: 'Bien', inicia_at: '2026-10-05T00:00:00Z', juego: 'hack', interesados: -5, mi_interes: false, mi_recordar: true, cancelado: 'si', descripcion: 9 }]);
  assert.equal(r.length, 1);
  assert.deepEqual(r[0], { id: 4, titulo: 'Bien', descripcion: '', juego: null, inicia_at: '2026-10-05T00:00:00Z', cancelado: false, motivo: '', interesados: 0, mi_interes: false, mi_recordar: false });
  assert.equal(normalizarEventos([{ id: 1, titulo: 'x', inicia_at: '2026-10-05T00:00:00Z', mi_interes: true, mi_recordar: true, interesados: '7' }])[0].interesados, 7);
});
test('validarFormulario: reglas espejo de la BD', () => {
  const base = { titulo: 'Copa Phoenix', fecha: '2026-10-11', hora: '19:00', juego: 'pes', descripcion: 'Fase 1' };
  const v = validarFormulario(base, T0);
  assert.equal(v.ok, true); assert.deepEqual(v.valores, { titulo: 'Copa Phoenix', iso: '2026-10-11T19:00:00-05:00', juego: 'pes', descripcion: 'Fase 1' });
  assert.equal(validarFormulario({ ...base, juego: '' }, T0).valores.juego, null);
  assert.equal(validarFormulario({ ...base, titulo: '<<>>ab' }, T0).ok, false);                     // al quitar < > quedan 2 caracteres
  assert.equal(validarFormulario({ ...base, titulo: 'x'.repeat(81) }, T0).ok, false);
  assert.equal(validarFormulario({ ...base, titulo: 'x'.repeat(80) }, T0).ok, true);
  assert.match(validarFormulario({ ...base, descripcion: 'a'.repeat(501) }, T0).error, /500/);
  assert.match(validarFormulario({ ...base, juego: 'xx' }, T0).error, /juego/i);
  assert.match(validarFormulario({ ...base, hora: '' }, T0).error, /válidas/);
  assert.match(validarFormulario({ ...base, fecha: '2026-10-05', hora: '11:00' }, T0).error, /futura/);
  assert.equal(validarFormulario({ ...base, fecha: '2026-10-05', hora: '11:00', permitirPasada: true }, T0).ok, true);   // editar solo el texto de uno en curso
  assert.match(validarFormulario({ ...base, fecha: '2028-10-11' }, T0).error, /1 año/);
  assert.equal(validarFormulario(null, T0).ok, false);
  assert.equal(validarFormulario({ ...base, titulo: '  Copa  ' }, T0).valores.titulo, 'Copa');
});
test('catálogo de juegos igual al de la BD y utilidades', () => {
  assert.deepEqual(JUEGOS_EVENTO.map((j) => j[0]), ['pes', 'sp', 'fifa', 'eafc', 'efootball']);
  assert.equal(nombreJuego('sp'), 'SP Football Life'); assert.equal(nombreJuego('x'), '');
  assert.notEqual(textoVacio(true), textoVacio(false));
  assert.equal(LIMITES.tituloMax, 80);
});
test('permiso gestionarEventos: solo moderador y admin (como la BD)', () => {
  for (const r of ['moderador', 'admin']) assert.equal(puede(r, 'gestionarEventos'), true);
  for (const r of ['jugador', 'arbitro', 'ayudante', 'comisario', undefined]) assert.equal(puede(r, 'gestionarEventos'), false);
});

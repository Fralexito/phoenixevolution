// Pruebas del núcleo puro de la API /v1 (supabase/functions/phoenix/_lib/nucleo.js). El contrato vive en claude/contrato-v1.md.
import { test } from 'node:test';
import assert from 'node:assert/strict';
import { CONFIG, ERRORES, ErrorApi, cuerpoError, compararVersion, v, limpiarInvitados, limpiarEventos, construirRoles } from '../supabase/functions/phoenix/_lib/nucleo.js';

test('catálogo de errores: todos con http, reintentable y mensaje', () => {
  for (const [k, e] of Object.entries(ERRORES)) {
    assert.match(k, /^[A-Z_]+$/); assert.ok(e.http >= 400 && e.http < 600); assert.equal(typeof e.reintentable, 'boolean'); assert.ok(e.mensaje);
  }
});

test('cuerpoError: sobre fijo y código desconocido → ERROR_INTERNO', () => {
  const c = cuerpoError(new ErrorApi('CAMPO_INVALIDO', { campo: 'juego' }), 'x');
  assert.deepEqual(Object.keys(c).sort(), ['campo', 'codigo', 'mensaje', 'ok', 'reintentable', 'solicitud_id']);
  assert.equal(c.ok, false); assert.equal(c.campo, 'juego');
  assert.equal(cuerpoError(new Error('boom'), 'y').codigo, 'ERROR_INTERNO');
  assert.equal(new ErrorApi('NO_EXISTE').codigo, 'ERROR_INTERNO');
});

test('compararVersion', () => {
  assert.equal(compararVersion('7.0.4', '7.0.4'), 0);
  assert.equal(compararVersion('7.0.10', '7.0.4'), 1);
  assert.equal(compararVersion('7.0', '7.0.1'), -1);
  assert.equal(compararVersion('basura', '7.0.4'), -1);
});

test('código de emparejamiento: 6 dígitos, tolera espacios y guiones', () => {
  assert.equal(v.codigo('123 456'), '123456');
  assert.equal(v.codigo('123-456'), '123456');
  assert.throws(() => v.codigo('12345'), (e) => e.codigo === 'CODIGO_INVALIDO');
  assert.throws(() => v.codigo(123456), (e) => e.codigo === 'CODIGO_INVALIDO');
});

test('validadores marcan el campo que falla', () => {
  assert.throws(() => v.entero(0, 'plazas_total', { min: 1, max: 16 }), (e) => e.codigo === 'CAMPO_INVALIDO' && e.campo === 'plazas_total');
  assert.throws(() => v.enlace('http://x', 'enlace'), (e) => e.campo === 'enlace');
  assert.equal(v.enlace('https://parsec.gg/g/abc', 'enlace'), 'https://parsec.gg/g/abc');
  assert.equal(v.parsecId(1234, 'p'), '1234');
  assert.throws(() => v.uuid('nope', 'sala_id'), (e) => e.campo === 'sala_id');
});

test('limpiarInvitados: deduplica y respeta el máximo', () => {
  const r = limpiarInvitados([{ parsec_id: '1', ping_ms: 40 }, { parsec_id: '1', ping_ms: 99 }, { parsec_id: '2' }]);
  assert.equal(r.length, 2); assert.equal(r[0].ping_ms, 40); assert.equal(r[1].ping_ms, null);
  assert.deepEqual(limpiarInvitados(undefined), []);
  assert.throws(() => limpiarInvitados(Array.from({ length: CONFIG.limites.invitados_max + 1 }, (_, i) => ({ parsec_id: String(i) }))), (e) => e.campo === 'invitados');
});

test('limpiarEventos: un evento malo no tumba el lote; fecha absurda → hora del servidor', () => {
  const ahora = Date.parse('2026-10-06T19:00:00Z');
  const { validos, rechazados } = limpiarEventos([
    { clave: 'k-00000001', tipo: 'entra', actor_parsec: '55', ocurrido: '2026-10-06T18:59:00Z' },
    { clave: 'k-00000001', tipo: 'entra' },
    { clave: 'k-00000002', tipo: 'caida' },
    { clave: 'corta', tipo: 'sale' },
    { clave: 'k-00000003', tipo: 'sale', ocurrido: '1999-01-01T00:00:00Z' },
  ], ahora);
  assert.equal(validos.length, 2);
  assert.equal(validos[1].ocurrido, new Date(ahora).toISOString());
  assert.equal(rechazados.length, 2);
  assert.ok(rechazados.every((r) => r.codigo === 'CAMPO_INVALIDO'));
  assert.throws(() => limpiarEventos(Array.from({ length: 51 }, (_, i) => ({ clave: `k-${i}xxxxxx`, tipo: 'entra' }))), (e) => e.codigo === 'LOTE_DEMASIADO_GRANDE');
});

test('construirRoles: lado A primero, mandos correlativos, espectadores sin mando y sin duplicados', () => {
  const r = construirRoles({
    participantes: [{ usuario_id: 'b1', lado: 'B' }, { usuario_id: 'a1', lado: 'A' }, { usuario_id: 'a2', lado: 'A' }],
    espectadores: ['e1', 'a1'], staff: ['s1', 'e1'],
    parsec: new Map([['a1', '111']]), nombres: new Map([['a1', 'Kaiser']]),
  });
  assert.deepEqual(r.jugadores.map((j) => [j.usuario_id, j.mando]), [['a1', 1], ['a2', 2], ['b1', 3]]);
  assert.equal(r.jugadores[0].parsec_id, '111'); assert.equal(r.jugadores[0].nombre, 'Kaiser');
  assert.deepEqual(r.espectadores.map((e) => [e.usuario_id, e.rol, e.pad_limit]), [['e1', 'espectador', 0], ['s1', 'staff', 0]]);
});

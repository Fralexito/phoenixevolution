// Pruebas del núcleo puro de la API /v1 (supabase/functions/phoenix/_lib/nucleo.js). El contrato vive en claude/contrato-v1.md.
import { test } from 'node:test';
import assert from 'node:assert/strict';
import { CONFIG, ERRORES, ErrorApi, cuerpoError, compararVersion, v, limpiarInvitados, limpiarEventos, construirRoles, fusionarConfig, evaluarBuild, marcaDe, sugerenciasHost, retrasoSugerido } from '../supabase/functions/phoenix/_lib/nucleo.js';

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

test('fusionarConfig: aplica valores válidos, ignora basura y respeta frenos', () => {
  const c = fusionarConfig(CONFIG, [
    { clave: 'version_app_min', valor: '7.1.0' }, { clave: 'version_app_recomendada', valor: 'malo' },
    { clave: 'exigir_build', valor: true }, { clave: 'intervalos', valor: { latido_seg: 3, inventado: 9, eventos_lote_max: '50' } },
    { clave: 'interruptores', valor: { integracion: false } },
  ]);
  assert.equal(c.version_app_min, '7.1.0'); assert.equal(c.version_app_recomendada, CONFIG.version_app_recomendada);
  assert.equal(c.exigir_build, true); assert.equal(c.intervalos.latido_seg, 10); assert.equal(c.intervalos.eventos_lote_max, 50);
  assert.ok(!('inventado' in c.intervalos)); assert.equal(c.interruptores.integracion, false);
  assert.equal(CONFIG.interruptores.integracion, true);                        // no muta la base
});

test('evaluarBuild: desactivado > versión desactivada > exigencia', () => {
  const h1 = 'a'.repeat(64); const h2 = 'b'.repeat(64);
  const builds = [{ huella_sha256: h1, version: '7.0.4', activo: false }, { huella_sha256: h2, version: '7.0.5', activo: true }];
  assert.equal(evaluarBuild({ huella: h1, version: '7.0.4', builds }), 'BUILD_DESACTIVADO');
  assert.equal(evaluarBuild({ huella: null, version: '7.0.4', builds }), 'VERSION_DESACTIVADA');
  assert.equal(evaluarBuild({ huella: null, version: '7.0.5', builds }), null);
  assert.equal(evaluarBuild({ huella: null, version: '7.0.5', builds, exigir: true }), 'BUILD_NO_OFICIAL');
  assert.equal(evaluarBuild({ huella: h2, version: '7.0.5', builds, exigir: true }), null);
  assert.equal(evaluarBuild({ huella: 'c'.repeat(64), version: '9.9.9', builds: [], exigir: false }), null);
  assert.equal(v.huella('A'.repeat(64)), 'a'.repeat(64)); assert.equal(v.huella(undefined), null);
  assert.throws(() => v.huella('xyz'), (e) => e.campo === 'x-phoenix-build');
});

test('código de instalación: XXXX-XXXX sin letras confusas', () => {
  assert.equal(v.codigoInstalacion('abcd efgh'), 'ABCD-EFGH');
  assert.equal(v.codigoInstalacion('K7PQ-2ZXM'), 'K7PQ-2ZXM');
  for (const malo of ['ABCD-EFG', 'ABCD-EFGI', 'O0O0-1111', 123]) assert.throws(() => v.codigoInstalacion(malo), (e) => e.codigo === 'CODIGO_INVALIDO');
});

test('marcaDe: organización con su marca, liga con tema, y caída a Phoenix', () => {
  const org = { nombre: 'Copa Andina', logo_url: 'https://x/l.png', color_primario: '#112233', color_secundario: '#445566' };
  assert.deepEqual(marcaDe({ marca: 'organizacion' }, org), { tipo: 'organizacion', nombre: 'Copa Andina', logo_url: 'https://x/l.png', color_primario: '#112233', color_secundario: '#445566' });
  assert.equal(marcaDe({ marca: 'organizacion' }, null).tipo, 'phoenix');
  assert.equal(marcaDe({ marca: 'liga' }, org).tema, 'galaxy');
  assert.equal(marcaDe(null, null).tipo, 'phoenix');
});

test('sugerenciasHost: 70 % de la subida, 8 Mbps por jugador, 3 Mbps por espectador', () => {
  assert.deepEqual(sugerenciasHost(30000, 2), { bitrate_total_kbps: 21000, limite_espectadores: 1, alcanza_para_jugadores: true });
  assert.deepEqual(sugerenciasHost(100000, 2), { bitrate_total_kbps: 50000, limite_espectadores: 11, alcanza_para_jugadores: true });
  assert.equal(sugerenciasHost(15000, 2).alcanza_para_jugadores, false);
  assert.equal(sugerenciasHost(0).bitrate_total_kbps, null);
});

test('retrasoSugerido: mitad del RTT, recortado por lo que permite el perfil', () => {
  assert.deepEqual(retrasoSugerido(60, 0), { sugerido_ms: 30, permitido_ms: 0, aplicar_ms: 0 });
  assert.deepEqual(retrasoSugerido(60, 20), { sugerido_ms: 30, permitido_ms: 20, aplicar_ms: 20 });
  assert.equal(retrasoSugerido(900, 500).sugerido_ms, 250);
  assert.equal(retrasoSugerido(null, 50).aplicar_ms, 0);
});

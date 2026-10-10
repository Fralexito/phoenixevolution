// Pruebas del núcleo puro de la API /v1 (supabase/functions/phoenix/_lib/nucleo.js). El contrato vive en claude/contrato-v1.md.
import { test } from 'node:test';
import assert from 'node:assert/strict';
import { CONFIG, ERRORES, ErrorApi, cuerpoError, compararVersion, v, limpiarInvitados, limpiarEventos, construirRoles, fusionarConfig, evaluarBuild, marcaDe, sugerenciasHost, retrasoSugerido, huellaContenido, coincideEtag } from '../supabase/functions/phoenix/_lib/nucleo.js';

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

test('huellaContenido: estable, sensible al contenido e ignora campos volátiles', () => {
  const a = [{ sala_id: 'x', plazas_libres: 2, desde: '2026-10-06T20:00:00Z' }];
  const b = [{ sala_id: 'x', plazas_libres: 2, desde: '2026-10-06T20:00:30Z' }];
  assert.match(huellaContenido(a), /^W\/"[0-9a-f]{16}"$/);
  assert.equal(huellaContenido(a), huellaContenido(JSON.parse(JSON.stringify(a))));
  assert.notEqual(huellaContenido(a), huellaContenido(b));
  assert.equal(huellaContenido(a, ['desde']), huellaContenido(b, ['desde']));
  assert.notEqual(huellaContenido(a, ['desde']), huellaContenido([{ ...a[0], plazas_libres: 1 }], ['desde']));
});

test('coincideEtag: débil/fuerte, listas y comodín', () => {
  const e = 'W/"00000000000000ab"';
  assert.equal(coincideEtag(e, e), true);
  assert.equal(coincideEtag('"00000000000000ab"', e), true);
  assert.equal(coincideEtag('"zz", W/"00000000000000ab"', e), true);
  assert.equal(coincideEtag('*', e), true);
  assert.equal(coincideEtag('"otro"', e), false);
  assert.equal(coincideEtag(null, e), false);
});

// ── Phoenix Sync compartido (1.8.0) ──────────────────────────────────────────────────────────────────────────────────
import { modoSeguro, limpiarOperacion, limpiarResultados, limpiarOption } from '../supabase/functions/phoenix/_lib/nucleo.js';
const G = '11111111-1111-4111-8111-111111111111'; const OP = '22222222-2222-4222-8222-222222222222';

test('sync: versión 1.8.0, interruptor, sondeo mínimo 5 s y errores nuevos', () => {
  assert.ok(CONFIG.version_api >= '1.8.0');
  assert.equal(CONFIG.interruptores.sync_compartido, true);
  assert.equal(fusionarConfig(CONFIG, [{ clave: 'intervalos', valor: { sondeo_sync_seg: 1 } }]).intervalos.sondeo_sync_seg, 5);
  for (const c of ['SIN_PERMISO', 'GRUPO_NO_ENCONTRADO', 'OPERACION_INVALIDA', 'OPERACION_NO_ENCONTRADA', 'OPTION_INVALIDA', 'OPTION_NO_ENCONTRADA', 'LIMITE_EXCEDIDO', 'SYNC_PAUSADO']) assert.ok(ERRORES[c], c);
  assert.equal(ERRORES.SIN_PERMISO.http, 403); assert.equal(ERRORES.LIMITE_EXCEDIDO.http, 429);
});

test('sync: modoSeguro asume «autorizacion» ante cualquier duda', () => {
  assert.equal(modoSeguro('automatico'), 'automatico'); assert.equal(modoSeguro('autorizacion'), 'autorizacion');
  for (const x of [undefined, null, '', 'AUTOMATICO', 'auto', 1, {}]) assert.equal(modoSeguro(x), 'autorizacion');
});

test('sync: limpiarOperacion valida y normaliza', () => {
  const ok = limpiarOperacion({ grupo_id: G, op_id: OP.toUpperCase(), jugador_id: 1234, equipo_origen: 5, equipo_destino: 6, resumen: ' Messi → Inter ', parche: 'Conmegol', huella_bd: 'abc', formato: 1, sha256_resultado: 'A'.repeat(64) });
  assert.equal(ok.grupo_id, G); assert.equal(ok.op.op_id, OP); assert.equal(ok.op.tipo, 'fichaje'); assert.equal(ok.op.resumen, 'Messi → Inter');
  assert.equal(ok.op.base_seq, 0); assert.equal(ok.op.sha256_resultado, 'a'.repeat(64));
  const base = { grupo_id: G, op_id: OP, jugador_id: 1, equipo_origen: 2, equipo_destino: 3 };
  const mal = (cambio, campo) => assert.throws(() => limpiarOperacion({ ...base, ...cambio }), (e) => e.codigo === 'CAMPO_INVALIDO' && e.campo === campo);
  mal({ op_id: 'x' }, 'op_id'); mal({ grupo_id: undefined }, 'grupo_id'); mal({ jugador_id: -1 }, 'jugador_id'); mal({ jugador_id: 1.5 }, 'jugador_id');
  mal({ equipo_destino: '3' }, 'equipo_destino'); mal({ equipo_origen: undefined }, 'equipo_origen'); mal({ tipo: 'venta' }, 'tipo');
  mal({ resumen: 'x'.repeat(201) }, 'resumen'); mal({ parche: 'x'.repeat(61) }, 'parche'); mal({ huella_bd: 'x'.repeat(129) }, 'huella_bd');
  mal({ sha256_resultado: 'zz' }, 'sha256_resultado'); mal({ base_seq: -2 }, 'base_seq'); mal({ jugador_id: 2147483648 }, 'jugador_id');
});

test('sync: limpiarResultados acepta uno o un lote, con estados cerrados', () => {
  const uno = limpiarResultados({ op_id: OP, estado: 'conflicto', motivo: ' ya existía ' });
  assert.equal(uno.unico, true); assert.deepEqual(uno.resultados, [{ op_id: OP, estado: 'conflicto', motivo: 'ya existía' }]);
  const lote = limpiarResultados({ resultados: [{ op_id: OP, estado: 'aplicada' }, { op_id: OP, estado: 'omitida' }] });
  assert.equal(lote.unico, false); assert.equal(lote.resultados.length, 2);
  for (const est of ['pendiente', 'otra', undefined]) assert.throws(() => limpiarResultados({ op_id: OP, estado: est }), (e) => e.codigo === 'CAMPO_INVALIDO');
  assert.throws(() => limpiarResultados({ resultados: [] }), (e) => e.codigo === 'CAMPO_INVALIDO');
  assert.throws(() => limpiarResultados({ resultados: Array(51).fill({ op_id: OP, estado: 'aplicada' }) }), (e) => e.codigo === 'CAMPO_INVALIDO');
  assert.throws(() => limpiarResultados({ resultados: 'x' }), (e) => e.codigo === 'CAMPO_INVALIDO');
});

test('sync: limpiarOption exige sha256, tamaño dentro del tope', () => {
  const ok = limpiarOption({ grupo_id: G, sha256: 'B'.repeat(64), tamano: 1048576, parche: 'Conmegol' });
  assert.equal(ok.d.sha256, 'b'.repeat(64)); assert.equal(ok.d.tamano, 1048576);
  assert.throws(() => limpiarOption({ grupo_id: G, sha256: 'b'.repeat(64), tamano: 0 }), (e) => e.campo === 'tamano');
  assert.throws(() => limpiarOption({ grupo_id: G, sha256: 'b'.repeat(64), tamano: CONFIG.limites.sync_option_bytes_max + 1 }), (e) => e.campo === 'tamano');
  assert.throws(() => limpiarOption({ grupo_id: G, sha256: 'nope', tamano: 5 }), (e) => e.campo === 'sha256');
});

// ── Chat general (1.9.0) ─────────────────────────────────────────────────────────────────────────────────────────────
import { limpiarMensajeChat, limpiarConsultaChat } from '../supabase/functions/phoenix/_lib/nucleo.js';

test('chat: versión 1.9.0, interruptor, sondeo mínimo 3 s y errores nuevos', () => {
  assert.equal(CONFIG.version_api, '1.9.0'); assert.equal(CONFIG.interruptores.chat_global, true);
  assert.equal(fusionarConfig(CONFIG, [{ clave: 'intervalos', valor: { sondeo_chat_seg: 1 } }]).intervalos.sondeo_chat_seg, 3);
  assert.equal(ERRORES.MENSAJE_INVALIDO.http, 400); assert.equal(ERRORES.CUENTA_SANCIONADA.http, 403); assert.equal(ERRORES.CHAT_PAUSADO.http, 503);
});
test('chat: limpiarMensajeChat junta espacios, rechaza vacío y > 300', () => {
  assert.equal(limpiarMensajeChat({ texto: '  hola \n  mundo\t!  ' }), 'hola mundo !');
  assert.equal(limpiarMensajeChat({ texto: 'x'.repeat(300) }).length, 300);
  for (const b of [{}, { texto: '' }, { texto: '   \n ' }, { texto: 5 }, { texto: 'x'.repeat(301) }, null]) {
    assert.throws(() => limpiarMensajeChat(b), (e) => e.codigo === 'MENSAJE_INVALIDO' && e.http === 400 && e.campo === 'texto');
  }
});
test('chat: limpiarConsultaChat (desde y limite)', () => {
  const q = (s) => new URLSearchParams(s);
  assert.deepEqual(limpiarConsultaChat(q('')), { desde: 0, limite: 50 });
  assert.deepEqual(limpiarConsultaChat(q('desde=12&limite=100')), { desde: 12, limite: 100 });
  for (const s of ['desde=-1', 'desde=abc', 'desde=1.5', 'limite=0', 'limite=101']) assert.throws(() => limpiarConsultaChat(q(s)), (e) => e.codigo === 'CAMPO_INVALIDO');
});

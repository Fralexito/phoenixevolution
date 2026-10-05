import { test } from 'node:test';
import assert from 'node:assert/strict';
import {
  MOTIVOS, TIPOS, validarReporte, validarNota, validarSancion, puedeActuar, puedeLevantar, quedaTiempo, describirMiSancion, normalizarReporte, normalizarSancion, esOcultable, DETALLE_MAX,
} from '../src/js/core/moderacion.js';
import { reportarHTML, ocultarHTML, sancionarHTML, notaHTML, avisoSancionHTML, reporteHTML, listaReportesHTML, historialHTML } from '../src/js/features/moderacion/vista.js';

const MALO = '<img src=x onerror=window.__xss=1>';
const rep = (o = {}) => normalizarReporte({
  id: 7, tipo: 'publicacion', objetivo_id: '12', motivo: 'spam', detalle: MALO, contenido: { texto: MALO, imagen_url: 'javascript:alert(1)', video_url: MALO }, estado: 'abierto', created_at: new Date().toISOString(),
  reportante: { id: 'r', username: 'rep', nombre_display: MALO }, acusado: { id: 'a', username: 'acu', nombre_display: MALO, rol: 'jugador' }, mismos: 3, oculto: false, ...o,
});

test('motivos y tipos: los ids coinciden con el CHECK de la migración 032', () => {
  assert.deepEqual(MOTIVOS.map((m) => m.id), ['spam', 'acoso', 'inapropiado', 'suplantacion', 'trampas', 'otro']);
  assert.deepEqual(Object.keys(TIPOS), ['usuario', 'publicacion', 'respuesta', 'clip', 'historia', 'mensaje']);
  assert.equal(esOcultable('publicacion'), true); assert.equal(esOcultable('mensaje'), false); assert.equal(esOcultable('usuario'), false);
});

test('validarReporte: exige tipo, objetivo y motivo; limpia el detalle', () => {
  assert.equal(validarReporte({ tipo: 'hack', objetivo: '1', motivo: 'spam' }).ok, false);
  assert.equal(validarReporte({ tipo: 'clip', objetivo: '', motivo: 'spam' }).ok, false);
  assert.equal(validarReporte({ tipo: 'clip', objetivo: '1', motivo: 'xx' }).ok, false);
  assert.equal(validarReporte({ tipo: 'clip', objetivo: '1', motivo: 'spam', detalle: 'x'.repeat(DETALLE_MAX + 1) }).ok, false);
  const v = validarReporte({ tipo: 'clip', objetivo: 5, motivo: 'acoso', detalle: '  <b>hola</b>  ' });
  assert.deepEqual([v.ok, v.objetivo, v.detalle], [true, '5', 'bhola/b']);
});

test('validarNota: mínimo 3, máximo según la acción, opcional si se pide', () => {
  assert.equal(validarNota('ab').ok, false);
  assert.equal(validarNota('abc').ok, true);
  assert.equal(validarNota('x'.repeat(301)).ok, false);
  assert.equal(validarNota('x'.repeat(301), { max: 500 }).ok, true);
  assert.deepEqual(validarNota('', { obligatoria: false }), { ok: true, valor: '' });
});

test('validarSancion: suspensión pide 1-30 días; advertencia y baneo no llevan días', () => {
  assert.equal(validarSancion({ tipo: 'suspension', dias: 0, motivo: 'abuso' }).ok, false);
  assert.equal(validarSancion({ tipo: 'suspension', dias: 31, motivo: 'abuso' }).ok, false);
  assert.equal(validarSancion({ tipo: 'suspension', dias: '3', motivo: 'abuso' }).dias, 3);
  assert.equal(validarSancion({ tipo: 'baneo', dias: 9, motivo: 'abuso' }).dias, null);
  assert.equal(validarSancion({ tipo: 'advertencia', motivo: 'ab' }).ok, false);
  assert.equal(validarSancion({ tipo: 'otra', motivo: 'abuso' }).ok, false);
});

test('rangos: solo hacia abajo; el baneo solo lo levanta un admin', () => {
  assert.equal(puedeActuar('moderador', 'jugador'), true);
  assert.equal(puedeActuar('moderador', 'moderador'), false);
  assert.equal(puedeActuar('moderador', 'admin'), false);
  assert.equal(puedeActuar('ayudante', 'jugador'), false);
  assert.equal(puedeActuar('admin', 'moderador'), true);
  assert.equal(puedeLevantar('moderador', 'jugador', 'suspension'), true);
  assert.equal(puedeLevantar('moderador', 'jugador', 'baneo'), false);
  assert.equal(puedeLevantar('admin', 'jugador', 'baneo'), true);
});

test('quedaTiempo y describirMiSancion', () => {
  const t0 = Date.parse('2026-10-05T12:00:00Z');
  assert.equal(quedaTiempo('2026-10-05T12:30:00Z', t0), '30 min');
  assert.equal(quedaTiempo('2026-10-05T17:00:00Z', t0), '5 h');
  assert.equal(quedaTiempo('2026-10-08T12:00:00Z', t0), '3 días');
  assert.equal(quedaTiempo('2026-10-05T11:00:00Z', t0), '');
  assert.equal(describirMiSancion(null), null);
  assert.equal(describirMiSancion({ tipo: 'advertencia', motivo: 'x' }), null);
  assert.equal(describirMiSancion({ tipo: 'suspension', hasta: '2026-10-05T11:00:00Z', motivo: 'x' }, t0), null, 'una suspensión vencida no muestra aviso');
  const s = describirMiSancion({ tipo: 'suspension', hasta: '2026-10-06T12:00:00Z', motivo: 'spam' }, t0);
  assert.equal(s.tipo, 'suspension'); assert.equal(s.quedan, '1 día'); assert.match(s.texto, /hora de Lima/);
  assert.equal(describirMiSancion({ tipo: 'baneo', motivo: 'trampas' }).titulo, 'Tu cuenta está baneada');
});

test('normalizarReporte / normalizarSancion: valores raros no rompen ni dan poder', () => {
  assert.equal(normalizarReporte(null), null); assert.equal(normalizarSancion({}), null);
  const r = normalizarReporte({ id: 1, tipo: 'raro', motivo: 'raro', estado: 'raro', acusado: null, reportante: null });
  assert.deepEqual([r.tipo, r.motivo, r.estado, r.acusado.rol, r.mismos], ['usuario', 'otro', 'abierto', 'jugador', 1]);
  assert.equal(normalizarReporte({ id: 1, tipo: 'clip', acusado: { rol: 'comisario' } }).acusado.rol, 'arbitro');
  assert.equal(normalizarSancion({ id: 2, tipo: 'rara' }).tipo, 'advertencia');
});

test('vista: modales tienen formulario, motivos y mensaje de confidencialidad', () => {
  const r = reportarHTML({ tipo: 'clip', titulo: MALO });
  assert.equal((r.match(/name="motivo"/g) ?? []).length, 6);
  assert.match(r, /confidencial/); assert.ok(!r.includes(MALO), 'el título se escapa');
  assert.match(ocultarHTML({ tipo: 'publicacion' }), /Ocultar publicación/);
  assert.match(ocultarHTML({ tipo: 'publicacion', ocultar: false }), /Volver a mostrar/);
  const s = sancionarHTML({ nombre: MALO, rol: 'jugador' });
  assert.equal((s.match(/name="tipo"/g) ?? []).length, 3); assert.ok(!s.includes(MALO));
  assert.equal((sancionarHTML({ baneoPermitido: false }).match(/name="tipo"/g) ?? []).length, 2);
  assert.match(notaHTML({ titulo: 'T', accion: 'Hacer', obligatoria: false }), /opcional/);
});

test('vista: aviso de sanción (suspensión y baneo) y XSS escapado', () => {
  assert.equal(avisoSancionHTML(null), '');
  const a = avisoSancionHTML({ tipo: 'suspension', titulo: 'Tu cuenta está suspendida', texto: 'hasta pronto', motivo: MALO, quedan: '2 h' });
  assert.match(a, /quedan 2 h/); assert.ok(!a.includes(MALO));
  assert.match(avisoSancionHTML({ tipo: 'baneo', titulo: 'Baneada', texto: 't', motivo: '' }), /fa-ban/);
});

test('vista: tarjeta de reporte — XSS escapado, URL peligrosa descartada, botones según el rol', () => {
  const mod = { rol: 'moderador', puedeModerar: true }; const ay = { rol: 'ayudante', puedeModerar: false };
  const h = reporteHTML(rep(), mod);
  assert.ok(!h.includes(MALO), 'ningún texto de usuario sin escapar');
  assert.ok(!h.includes('javascript:'), 'la imagen con esquema peligroso se descarta');
  assert.match(h, /3 reportes sobre esto/);
  for (const a of ['data-act="sancionar"', 'data-act="ocultar"', 'data-estado="resuelto"', 'data-estado="descartado"', 'data-act="historial"']) assert.ok(h.includes(a), `falta ${a}`);
  const hAy = reporteHTML(rep(), ay);
  for (const a of ['data-act="sancionar"', 'data-act="ocultar"', 'data-act="resolver"']) assert.ok(!hAy.includes(a), `el ayudante no debe ver ${a}`);
  assert.ok(hAy.includes('data-act="historial"'), 'el ayudante sí puede ver el historial');
  // un moderador no puede sancionar ni ocultar lo de otro moderador/admin
  const hMod2 = reporteHTML(rep({ acusado: { id: 'a', username: 'm2', nombre_display: 'M2', rol: 'moderador' } }), mod);
  assert.ok(!hMod2.includes('data-act="sancionar"') && !hMod2.includes('data-act="ocultar"'));
  // reporte cerrado: sin botón de sancionar ni resolver
  const hCerrado = reporteHTML(rep({ estado: 'resuelto', resolucion: 'ok', resuelto_por: { nombre_display: 'Mod' } }), mod);
  assert.ok(!hCerrado.includes('data-act="sancionar"') && !hCerrado.includes('data-act="resolver"')); assert.match(hCerrado, /Resuelto/);
  // oculto → ofrece «Mostrar de nuevo»
  assert.match(reporteHTML(rep({ oculto: true }), mod), /Mostrar de nuevo/);
  // mensajes y cuentas no se pueden ocultar
  assert.ok(!reporteHTML(rep({ tipo: 'mensaje', oculto: null }), mod).includes('data-act="ocultar"'));
});

test('vista: lista vacía y historial de sanciones', () => {
  assert.match(listaReportesHTML([], {}), /Todo tranquilo/);
  const lista = [normalizarSancion({ id: 1, tipo: 'baneo', motivo: MALO, created_at: new Date().toISOString(), vigente: true, creada_por: 'Mod' }), normalizarSancion({ id: 2, tipo: 'advertencia', motivo: 'ok', vigente: false })];
  const h = historialHTML(lista, { rol: 'moderador', puedeModerar: true, rolObjetivo: 'jugador' });
  assert.ok(!h.includes(MALO)); assert.ok(!h.includes('data-act="levantar"'), 'moderador no levanta baneos');
  assert.match(historialHTML(lista, { rol: 'admin', puedeModerar: true, rolObjetivo: 'jugador' }), /data-act="levantar"/);
  assert.match(historialHTML([], {}), /no tiene sanciones/);
});

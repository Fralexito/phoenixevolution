import test from 'node:test';
import assert from 'node:assert/strict';
import { validarTexto, estadoAviso, etiquetaEstado, mensajeError, MAX_TEXTO } from '../src/js/core/buzon.js';

test('validarTexto: vacío, largo y demasiadas líneas', () => {
  assert.equal(validarTexto('   ').ok, false);
  assert.equal(validarTexto('a'.repeat(MAX_TEXTO + 1)).ok, false);
  assert.equal(validarTexto('a'.repeat(MAX_TEXTO)).ok, true);
  assert.equal(validarTexto(Array(9).fill('x').join('\n')).ok, false);
  assert.equal(validarTexto(Array(8).fill('x').join('\n')).ok, true);
});
test('validarTexto limpia controles y conserva tildes, ñ y saltos', () => {
  assert.deepEqual(validarTexto(' hola\u0007 señor\r\nñandú '), { ok: true, texto: 'hola señor\nñandú' });
});
test('estadoAviso', () => {
  const ahora = Date.parse('2026-10-09T12:00:00Z');
  assert.equal(estadoAviso({ entregado_en: '2026-10-09T11:00:00Z', expira_en: '2026-10-09T10:00:00Z' }, ahora), 'entregado');
  assert.equal(estadoAviso({ entregado_en: null, expira_en: '2026-10-09T10:00:00Z' }, ahora), 'expirado');
  assert.equal(estadoAviso({ entregado_en: null, expira_en: '2026-10-10T10:00:00Z' }, ahora), 'esperando');
});
test('etiquetaEstado trae icono y texto', () => {
  assert.equal(etiquetaEstado({ entregado_en: null, expira_en: '2999-01-01T00:00:00Z' }).icono, '⏳');
  assert.match(etiquetaEstado({ entregado_en: '2026-10-09T05:07:00' }).texto, /^entregado al juego \d\d:\d\d$/);
});
test('mensajeError traduce códigos', () => {
  assert.match(mensajeError({ message: 'DEMASIADOS_AVISOS: máximo 20 por hora' }), /20 avisos/);
  assert.match(mensajeError({ message: 'DISPOSITIVO_NO_ENCONTRADO' }), /PC/);
  assert.equal(mensajeError({}), 'No se pudo enviar el aviso.');
});

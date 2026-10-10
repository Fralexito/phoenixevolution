import test from 'node:test';
import assert from 'node:assert/strict';
import { limpiarLinea, validarNoticia, estadoNoticia, venceEn, contarVigentes, mensajeError, MAX_TEXTO } from '../src/js/core/ultimaHora.js';

test('limpiarLinea: una sola línea', () => { assert.equal(limpiarLinea('  hola \n\n mundo\t!'), 'hola mundo !'); });
test('validarNoticia: acepta lo bueno y explica lo malo', () => {
  assert.deepEqual(validarNoticia({ texto: ' Final  hoy ', nivel: 'urgente', enlace: ' https://a.com/x ', horas: '6' }), { ok: true, texto: 'Final hoy', nivel: 'urgente', enlace: 'https://a.com/x', horas: 6 });
  assert.equal(validarNoticia({ texto: 'x' }).enlace, null);
  assert.equal(validarNoticia({ texto: '   ' }).ok, false);
  assert.equal(validarNoticia({ texto: 'a'.repeat(MAX_TEXTO + 1) }).ok, false);
  assert.equal(validarNoticia({ texto: 'a'.repeat(MAX_TEXTO) }).ok, true);
  assert.equal(validarNoticia({ texto: 'x', nivel: 'raro' }).ok, false);
  assert.equal(validarNoticia({ texto: 'x', enlace: 'http://a.com' }).ok, false);
  assert.equal(validarNoticia({ texto: 'x', enlace: 'https://a b.com' }).ok, false);
  for (const h of [0, 169, 2.5, 'abc']) assert.equal(validarNoticia({ texto: 'x', horas: h }).ok, false);
});
test('estadoNoticia, venceEn y contarVigentes', () => {
  const ahora = Date.parse('2026-10-10T10:00:00Z');
  const v = { publicada: true, expira_en: '2026-10-10T13:00:00Z' }; const x = { publicada: true, expira_en: '2026-10-10T09:00:00Z' }; const r = { publicada: false, expira_en: '2026-10-11T09:00:00Z' };
  assert.deepEqual([v, x, r].map((n) => estadoNoticia(n, ahora)), ['vigente', 'expirada', 'retirada']);
  assert.equal(contarVigentes([v, x, r, v], ahora), 2);
  assert.equal(venceEn('2026-10-10T10:12:00Z', ahora), 'vence en 12 min'); assert.equal(venceEn(v.expira_en, ahora), 'vence en 3 h');
  assert.equal(venceEn('2026-10-14T10:00:00Z', ahora), 'vence en 4 días'); assert.equal(venceEn(x.expira_en, ahora), 'venció');
});
test('mensajeError: frases amables', () => {
  assert.match(mensajeError(new Error('LIMITE_VIGENTES: ya hay 5')), /5 noticias vigentes/);
  assert.equal(mensajeError({ message: 'TEXTO_INVALIDO: el texto va de 1 a 200' }), 'el texto va de 1 a 200');
  assert.match(mensajeError(null), /No se pudo/);
});

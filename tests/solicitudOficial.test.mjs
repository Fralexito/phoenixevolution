import { test } from 'node:test';
import assert from 'node:assert/strict';
import { ligaApta, horasParaVolver, vistaCreador, staffVePedido, validarMotivo, limpiarNota, nombreFormato } from '../src/js/core/competicion/solicitudOficial.js';

const YO = 'u1';
const liga = (x = {}) => ({ id: 1, creador: YO, formato: 'liguilla', estado: 'inscripcion', oculto: false, meta: {}, ...x });
const AHORA = new Date('2026-10-25T12:00:00Z');

test('ligaApta: formatos automáticos (145), en inscripción, visibles y aún no oficiales', () => {
  assert.equal(ligaApta(liga()), true);
  assert.equal(ligaApta(liga({ formato: 'idavuelta' })), true);
  assert.equal(ligaApta(liga({ formato: 'eliminacion' })), true);
  assert.equal(ligaApta(liga({ formato: 'colina' })), false);
  assert.equal(ligaApta(liga({ formato: 'grupos' }), 'oficial'), false);
  assert.equal(ligaApta(liga({ formato: 'grupos' }), 'premium'), true);
  assert.equal(ligaApta(liga({ estado: 'en_curso' })), false);
  assert.equal(ligaApta(liga({ oculto: true })), false);
  assert.equal(ligaApta(liga({ meta: { oficial: 'amigos:x' } })), false);
  assert.equal(ligaApta(null), false);
});

test('horasParaVolver: 24 h tras un rechazo; 0 si no hay rechazo o ya pasó', () => {
  assert.equal(horasParaVolver(null, AHORA), 0);
  assert.equal(horasParaVolver({ estado: 'cancelada', resuelto_en: '2026-10-25T11:00:00Z' }, AHORA), 0);
  assert.equal(horasParaVolver({ estado: 'rechazada', resuelto_en: '2026-10-25T11:00:00Z' }, AHORA), 23);
  assert.equal(horasParaVolver({ estado: 'rechazada', resuelto_en: '2026-10-24T11:00:00Z' }, AHORA), 0);
});

test('vistaCreador: cada estado muestra lo suyo y solo al creador', () => {
  assert.equal(vistaCreador({ t: liga(), yo: 'otro', solicitud: null }).modo, 'nada');
  assert.equal(vistaCreador({ t: liga(), yo: null, solicitud: null }).modo, 'nada');
  assert.equal(vistaCreador({ t: liga({ formato: 'colina' }), yo: YO, solicitud: null }).modo, 'nada');
  assert.match(vistaCreador({ t: liga({ formato: 'eliminacion' }), yo: YO, solicitud: null }).texto, /el staff los confirma/);
  assert.equal(vistaCreador({ t: liga(), yo: YO, solicitud: null }).modo, 'pedir');
  assert.equal(vistaCreador({ t: liga(), yo: YO, solicitud: { estado: 'pendiente' } }).modo, 'pendiente');
  assert.equal(vistaCreador({ t: liga(), yo: YO, solicitud: { estado: 'cancelada' } }).modo, 'pedir');
  const esp = vistaCreador({ t: liga(), yo: YO, solicitud: { estado: 'rechazada', motivo: 'Faltan reglas', resuelto_en: '2026-10-25T11:00:00Z' }, ahora: AHORA });
  assert.equal(esp.modo, 'esperar');
  assert.match(esp.texto, /Faltan reglas/);
  assert.match(esp.texto, /23 horas/);
  const otra = vistaCreador({ t: liga(), yo: YO, solicitud: { estado: 'rechazada', resuelto_en: '2026-10-23T11:00:00Z' }, ahora: AHORA });
  assert.equal(otra.modo, 'rechazada');
});

test('staffVePedido: solo staff y solo con un pedido pendiente', () => {
  assert.equal(staffVePedido({ estado: 'pendiente' }, true), true);
  assert.equal(staffVePedido({ estado: 'pendiente' }, false), false);
  assert.equal(staffVePedido({ estado: 'rechazada' }, true), false);
  assert.equal(staffVePedido(null, true), false);
});

test('validarMotivo y limpiarNota: límites de la base (5 a 300 letras)', () => {
  assert.throws(() => validarMotivo('no'), /mínimo 5/);
  assert.throws(() => validarMotivo('x'.repeat(301)), /300/);
  assert.equal(validarMotivo('  Faltan reglas  '), 'Faltan reglas');
  assert.equal(limpiarNota('   '), null);
  assert.equal(limpiarNota(' Somos 6 '), 'Somos 6');
  assert.throws(() => limpiarNota('x'.repeat(301)), /300/);
  assert.equal(nombreFormato('idavuelta'), 'Ida y vuelta');
});

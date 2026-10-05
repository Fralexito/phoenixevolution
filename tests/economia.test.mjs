import test from 'node:test';
import assert from 'node:assert/strict';
import * as E from '../src/js/core/economia.js';

test('estiloSeguro descarta todo lo que no sea color/texto/icono válido', () => {
  assert.deepEqual(E.estiloSeguro({ color: 'red', color2: '#00ff88', texto: '<b>', icono: 'fa-x"onload', css: 'x' }), { color: null, color2: '#00ff88', texto: null, icono: null });
  assert.deepEqual(E.estiloSeguro(null), { color: null, color2: null, texto: null, icono: null });
});
test('normalizarEconomia calcula el progreso y tolera basura', () => {
  const e = E.normalizarEconomia({ saldo: '120', xp: 75, nivel: 2, xp_nivel: 100, xp_siguiente: 300 });
  assert.equal(e.saldo, 120);
  const f = E.normalizarEconomia({ saldo: 5, xp: 150, nivel: 2, xp_nivel: 100, xp_siguiente: 300 });
  assert.equal(f.progreso, 0.25);
  assert.equal(E.normalizarEconomia(null).nivel, 1);
});
test('normalizarItem y motivoNoComprable', () => {
  const eco = { nivel: 2, saldo: 100 };
  const base = { id: 1, clave: 'a', nombre: 'A', categoria: 'marco', precio: 80, nivel_min: 1, estilo: { color: '#ff0000' } };
  assert.equal(E.motivoNoComprable(E.normalizarItem(base), eco), '');
  assert.equal(E.motivoNoComprable(E.normalizarItem({ ...base, precio: 500 }), eco), 'Tokens insuficientes');
  assert.equal(E.motivoNoComprable(E.normalizarItem({ ...base, nivel_min: 5 }), eco), 'Nivel 5');
  assert.equal(E.motivoNoComprable(E.normalizarItem({ ...base, tengo: true }), eco), 'Ya lo tienes');
  assert.equal(E.motivoNoComprable(E.normalizarItem({ ...base, agotado: true }), eco), 'Agotado');
  assert.equal(E.motivoNoComprable(E.normalizarItem(base), { nivel: 2, saldo: -5 }), 'Saldo negativo');
  assert.equal(E.normalizarItem({ ...base, categoria: 'raro' }).categoria, 'insignia');
});
test('formatos de precio', () => {
  assert.equal(E.formatoPrecio(500), 'S/ 5.00');
  assert.equal(E.formatoPrecio(1999, 'USD'), '19.99 USD');
  assert.equal(E.formatoPrecio(-4), 'S/ 0.00');
});
test('vistaPrevia escapa y nunca mete CSS libre', () => {
  const i = E.normalizarItem({ id: 1, categoria: 'titulo', estilo: { texto: 'Rey', color: '#00e5ff' } });
  assert.match(E.vistaPrevia(i), /Rey/);
  const mal = E.normalizarItem({ id: 2, categoria: 'marco', estilo: { color: '#ff0000; background:url(x)' } });
  assert.equal(E.estiloMarco(mal.estilo), '');
});
test('normalizarEquipamiento', () => {
  const q = E.normalizarEquipamiento({ marco: { clave: 'm', nombre: 'M', estilo: { color: '#ff6a00' } }, hack: { x: 1 } });
  assert.deepEqual(Object.keys(q), ['marco']);
});
test('normalizarPaquetes y normalizarMovimiento', () => {
  const p = E.normalizarPaquetes({ pagos_activos: true, paquetes: [{ id: 1, nombre: 'P', tokens: 100, precio_centimos: 500, moneda: 'PEN' }] });
  assert.equal(p.pagosActivos, true); assert.equal(p.paquetes[0].precioCentimos, 500);
  assert.equal(E.normalizarPaquetes(null).pagosActivos, false);
  assert.equal(E.normalizarMovimiento({ id: 1, delta: -5, tipo: 'compra_tienda', saldo: 20, cuando: 'x' }).saldoDespues, 20);
  assert.equal(E.textoTipo('zzz'), 'Movimiento');
});
test('validarItemAdmin', () => {
  const ok = E.validarItemAdmin({ clave: 'marco_x', nombre: 'Marco X', categoria: 'marco', precio: 50, color: '#ff0000', color2: '#00ff00' });
  assert.equal(ok.ok, true); assert.deepEqual(ok.valores.estilo, { color: '#ff0000', color2: '#00ff00' }); assert.equal(ok.valores.stock, null);
  assert.equal(E.validarItemAdmin({ clave: 'X', nombre: 'Marco X', categoria: 'marco', precio: 50, color: '#ff0000' }).ok, false);
  assert.equal(E.validarItemAdmin({ clave: 'marco_x', nombre: 'Marco X', categoria: 'marco', precio: -1, color: '#ff0000' }).ok, false);
  assert.equal(E.validarItemAdmin({ clave: 'tit_x', nombre: 'Título X', categoria: 'titulo', precio: 5, texto: '<script>' }).ok, false);
  assert.equal(E.validarItemAdmin({ clave: 'ins_x', nombre: 'Insignia X', categoria: 'insignia', precio: 5, icono: 'crown' }).ok, false);
  assert.equal(E.validarItemAdmin({ clave: 'tit_x', nombre: 'Título X', categoria: 'titulo', precio: 5, texto: 'Rey', stock: '3' }).valores.stock, 3);
});

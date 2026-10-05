import test from 'node:test';
import assert from 'node:assert/strict';
import { leerStaffVisible, guardarStaffVisible, CLAVE_STAFF_UI } from '../src/js/core/staffUi.js';

const almacen = () => { const m = new Map(); return { getItem: (k) => (m.has(k) ? m.get(k) : null), setItem: (k, v) => m.set(k, String(v)), removeItem: (k) => m.delete(k), m }; };
test('por defecto las opciones de staff son visibles', () => { assert.equal(leerStaffVisible(almacen()), true); assert.equal(leerStaffVisible(null), true); });
test('ocultar y volver a mostrar', () => {
  const a = almacen();
  assert.equal(guardarStaffVisible(a, false), true); assert.equal(a.m.get(CLAVE_STAFF_UI), 'oculto'); assert.equal(leerStaffVisible(a), false);
  assert.equal(guardarStaffVisible(a, true), true); assert.equal(a.m.has(CLAVE_STAFF_UI), false); assert.equal(leerStaffVisible(a), true);
});
test('valor corrupto → visibles; almacén que falla → no rompe', () => {
  const a = almacen(); a.setItem(CLAVE_STAFF_UI, '{basura'); assert.equal(leerStaffVisible(a), true);
  const roto = { getItem() { throw new Error('x'); }, setItem() { throw new Error('x'); }, removeItem() { throw new Error('x'); } };
  assert.equal(leerStaffVisible(roto), true); assert.equal(guardarStaffVisible(roto, false), false);
});

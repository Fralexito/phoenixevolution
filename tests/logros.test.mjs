import test from 'node:test';
import assert from 'node:assert/strict';
import { porcentaje, iconoSeguro, nivelDe, normalizarMisLogros, normalizarLogrosDe, NIVELES } from '../src/js/core/logros.js';
import { enlaceAvisoSeguro } from '../src/js/core/avisos.js';

test('porcentaje: acotado y tolerante', () => {
  assert.equal(porcentaje(5, 10), 50); assert.equal(porcentaje(20, 10), 100); assert.equal(porcentaje(-3, 10), 0);
  assert.equal(porcentaje(1, 0), 0); assert.equal(porcentaje('x', 10), 0); assert.equal(porcentaje(null, null), 0);
});
test('icono: solo clases fa-xxx (nada de HTML)', () => {
  assert.equal(iconoSeguro('fa-trophy'), 'fa-trophy');
  for (const malo of ['" onload="x', 'fa-x"><script>', '', null, 5, 'trophy']) assert.equal(iconoSeguro(malo), 'fa-medal');
});
test('nivel desconocido → bronce', () => { assert.equal(nivelDe('diamante'), NIVELES.bronce); assert.equal(nivelDe('oro'), NIVELES.oro); });
test('mis logros: obtenido ⇒ 100 %, progreso parcial, basura ignorada', () => {
  const r = normalizarMisLogros({ logros: [
    { id: 'a', icono: 'fa-bolt', obtenido_at: '2026-01-01T00:00:00Z', progreso: 1, objetivo: 1 },
    { id: 'b', icono: 'x"y', obtenido_at: null, progreso: 3, objetivo: 12 }, null, { sinid: 1 }] });
  assert.equal(r.total, 2); assert.equal(r.obtenidos, 1);
  assert.deepEqual(r.logros.map((l) => [l.id, l.obtenido, l.pct, l.icono]), [['a', true, 100, 'fa-bolt'], ['b', false, 25, 'fa-medal']]);
  assert.deepEqual(normalizarMisLogros(null), { logros: [], obtenidos: 0, total: 0 });
});
test('logros de otra persona: oro primero; sin visible → vacío', () => {
  const r = normalizarLogrosDe({ visible: true, logros: [{ id: 'x', nivel: 'bronce' }, { id: 'y', nivel: 'oro' }, { id: 'z', nivel: 'plata' }] });
  assert.deepEqual(r.logros.map((l) => l.id), ['y', 'z', 'x']); assert.equal(r.obtenidos, 3);
  assert.deepEqual(normalizarLogrosDe(undefined), { visible: false, logros: [], obtenidos: 0 });
});
test('el enlace del aviso de logro es válido', () => { assert.equal(enlaceAvisoSeguro('logros/'), 'logros/'); });

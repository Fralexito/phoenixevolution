import test from 'node:test';
import assert from 'node:assert/strict';
import { normalizar, mover, alternar, hrefValido, esBase, iguales, VENTANAS } from '../src/js/core/sitio.js';

test('normalizar: basura → config completa y segura', () => {
  const c = normalizar(null);
  assert.deepEqual(c.portada.orden, VENTANAS);
  assert.equal(c.portada.ventanas.social.on, true);
  assert.ok(esBase(c));
  assert.ok(esBase(normalizar({ portada: 5, menu: 'x' })));
});
test('normalizar: orden sin repetidos ni ids raros y completa los que faltan', () => {
  assert.deepEqual(normalizar({ portada: { orden: ['duelos', 'duelos', 'xx', 'social'] } }).portada.orden, ['duelos', 'social', 'competencia', 'club']);
});
test('normalizar: vista inválida se ignora y los extras se limitan', () => {
  const c = normalizar({ portada: { ventanas: { social: { vista: 'raro', on: false, extra: [1, 2, 3, 4].map((n) => ({ titulo: 'T' + n, href: 'liga/' })) } } } });
  assert.equal(c.portada.ventanas.social.vista, '');
  assert.equal(c.portada.ventanas.social.on, false);
  assert.equal(c.portada.ventanas.social.extra.length, 3);
});
test('hrefValido: rutas internas y https; nada de javascript:', () => {
  assert.ok(hrefValido('liga/')); assert.ok(hrefValido('liga/#tabla')); assert.ok(hrefValido('https://x.com/a'));
  assert.ok(!hrefValido('javascript:alert(1)')); assert.ok(!hrefValido('//x.com')); assert.ok(!hrefValido('data:text/html,hola')); assert.ok(!hrefValido(''));
});
test('principal con enlace malo se descarta', () => {
  assert.equal(normalizar({ portada: { ventanas: { club: { principal: { titulo: 'Hola', href: 'javascript:1' } } } } }).portada.ventanas.club.principal, null);
});
test('mover y alternar', () => {
  assert.deepEqual(mover(['a', 'b', 'c'], 'b', -1), ['b', 'a', 'c']);
  assert.deepEqual(mover(['a', 'b', 'c'], 'a', -1), ['a', 'b', 'c']);
  assert.deepEqual(alternar(['a'], 'b'), ['a', 'b']); assert.deepEqual(alternar(['a', 'b'], 'a'), ['b']);
});
test('iguales ignora campos de más', () => {
  assert.ok(iguales({}, { portada: { titulo: ' ' }, extra: 1 }));
  assert.ok(!iguales({}, { menu: { ocultos: ['x'] } }));
});

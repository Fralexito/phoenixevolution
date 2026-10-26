import test from 'node:test';
import assert from 'node:assert/strict';
import { cartaJuegoHTML, pruebaJuego } from '../src/js/core/sistema/cartaJuego.js';

test('carta: datos completos', () => {
  const h = cartaJuegoHTML({ etiqueta: 'Líder', nombre: 'Victor', sub: 'Bayern', cifra: 29, cifraEt: 'PTS', puesto: '1°', escudo: '/escudos/5.png',
    colores: { a: '#dc2626', b: '#1e3a8a' }, stats: [['PJ', 11], ['G', 9]], forma: ['V', 'E', 'X'], href: '/liga/' });
  assert.match(h, /^<a class="cj-zona" href="\/liga\/"/);
  assert.match(h, /--cj-a:#dc2626;--cj-b:#1e3a8a/);
  assert.match(h, /<span class="cj-cifra">29<span class="cj-cifra-et">PTS<\/span>/);
  assert.match(h, /<i class="cj-fV">V<\/i><i class="cj-fE">E<\/i><\/b>/);   // «X» se descarta
  assert.match(h, /aria-label="Líder: Victor: 29 PTS"/);
});

test('carta: escapa todo y rechaza lo raro', () => {
  const h = cartaJuegoHTML({ nombre: '<b>x</b>', escudo: 'javascript:alert(1)', colores: { a: 'red;x', b: '#000' }, href: 'javascript:1', externo: true });
  assert.doesNotMatch(h, /<b>x<\/b>/); assert.match(h, /&lt;b&gt;/);
  assert.doesNotMatch(h, /javascript:/);
  assert.doesNotMatch(h, /--cj-a/);
  assert.match(h, /^<div class="cj-zona" role="group"/);
  assert.match(h, /<span class="cj-ini">&lt;B<\/span>/);   // sin imagen válida: iniciales (escapadas)
});

test('carta: chica, sin cifra y prueba fuera del navegador', () => {
  const h = cartaJuegoHTML({ nombre: 'Hugo', chica: true });
  assert.match(h, /class="cj cj-chica"/); assert.doesNotMatch(h, /cj-cifra/); assert.match(h, /<span class="cj-ini">HU<\/span>/);
  assert.equal(pruebaJuego(), false);
});

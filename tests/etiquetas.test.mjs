// #etiquetas en las publicaciones (19-oct-2026): textoAHTML las convierte en enlaces a Social y etiquetasDe las cuenta para «Tendencias».
import { test } from 'node:test';
import assert from 'node:assert/strict';

const { textoAHTML, etiquetasDe } = await import('../src/js/core/comunidad/muro.js');
const h = (t) => textoAHTML(t, { urlPerfil: (u) => `/p/${u}`, urlTag: (x) => `/t/${x}` });

test('una #etiqueta pasa a enlace con su data-tag', () => {
  assert.equal(h('vamos #Liga'), 'vamos <a href="/t/Liga" class="tx-tag" data-tag="Liga">#Liga</a>');
  assert.equal(h('#Golazo al inicio'), '<a href="/t/Golazo" class="tx-tag" data-tag="Golazo">#Golazo</a> al inicio');
  assert.match(h('#PES2021'), /data-tag="PES2021"/);
  assert.match(h('final de la #CopaÑandú'), /data-tag="CopaÑandú"/);
});

test('lo que NO es etiqueta queda igual', () => {
  assert.equal(h('el #1 de la tabla'), 'el #1 de la tabla');              // sin letra
  assert.equal(h('C#sharp'), 'C#sharp');                                   // pegada a una letra
  assert.equal(h("it's"), 'it&#39;s');                                     // el apóstrofo escapado no se rompe
  assert.match(h('mira https://x.com/a#b'), /href="https:\/\/x\.com\/a#b"/); // el # de una URL es parte de la URL
  assert.doesNotMatch(h('mira https://x.com/a#b'), /tx-tag/);
});

test('menciones y etiquetas juntas', () => {
  assert.equal(h('@ana #Liga'), '<a href="/p/ana" class="text-galaxy-400 font-bold hover:underline">@ana</a> <a href="/t/Liga" class="tx-tag" data-tag="Liga">#Liga</a>');
});

test('etiquetasDe: sin repetir (sin importar mayúsculas) y con la primera forma escrita', () => {
  assert.deepEqual(etiquetasDe('#Liga y #liga y #Golazo, el #1'), ['Liga', 'Golazo']);
  assert.deepEqual(etiquetasDe(''), []);
  assert.deepEqual(etiquetasDe(null), []);
});

import test from 'node:test';
import assert from 'node:assert/strict';

test('menciones: @usuario se enlaza al perfil, con el formato del servidor', async () => {
  const { textoAHTML } = await import('../src/js/core/muro.js');
  const url = (u) => `/p/?u=${u}`;
  const h = (t) => textoAHTML(t, { urlPerfil: url });
  assert.match(h('hola @jug2 mira'), /^hola <a href="\/p\/\?u=jug2" class="[^"]*">@jug2<\/a> mira$/);
  assert.match(h('@ana al inicio'), /^<a href="\/p\/\?u=ana"[^>]*>@ana<\/a> al inicio$/);
  assert.match(h('línea\n@ana'), /<br><a href="\/p\/\?u=ana"/);                       // tras un salto de línea también cuenta
  assert.match(h('(@ana)'), /\(<a href="\/p\/\?u=ana"[^>]*>@ana<\/a>\)/);             // entre paréntesis
  assert.match(h('@ana, @bob.'), /@ana<\/a>, <a[^>]*>@bob<\/a>\.$/);                  // la puntuación queda fuera
  assert.equal((h('@a1 @b2 @c3').match(/<a /g) ?? []).length, 3);
});

test('menciones: lo que NO es una mención no se enlaza', async () => {
  const { textoAHTML } = await import('../src/js/core/muro.js');
  assert.equal(textoAHTML('escríbeme a ana@correo.com'), 'escríbeme a ana@correo.com');   // correo: el @ va pegado a una letra
  assert.equal(textoAHTML('@@ana'), '@@ana');                                              // doble @
  assert.equal(textoAHTML('solo @'), 'solo @');
  assert.equal(textoAHTML('x@y'), 'x@y');
  assert.match(textoAHTML('@' + 'a'.repeat(21)), /^<a [^>]*>@a{20}<\/a>a$/);                 // pasa los 20 caracteres: se enlaza solo hasta 20 (igual que el servidor)
});

test('menciones: una @ dentro de una URL es parte de la URL, no una mención', async () => {
  const { textoAHTML } = await import('../src/js/core/muro.js');
  const h = textoAHTML('mira https://www.youtube.com/@canal y a @ana');
  assert.equal((h.match(/<a /g) ?? []).length, 2);                                         // 1 enlace externo + 1 mención
  assert.match(h, /href="https:\/\/www\.youtube\.com\/@canal"/);
  assert.match(h, /href="\.\.\/perfil\/\?u=ana"/);                                         // URL por defecto relativa
});

test('menciones: nada del usuario se convierte en HTML (XSS)', async () => {
  const { textoAHTML } = await import('../src/js/core/muro.js');
  const h = textoAHTML('<img src=x onerror=alert(1)> @ana"onmouseover="x <script>@bob</script>', { urlPerfil: (u) => `/p/?u=${u}` });
  assert.doesNotMatch(h, /<img|<script/i);
  assert.doesNotMatch(h, /\sonmouseover=/);
  assert.match(h, /&lt;img src=x onerror=alert\(1\)&gt;/);
  // un urlPerfil malicioso inyectado se escapa
  assert.doesNotMatch(textoAHTML('@ana', { urlPerfil: () => '"><script>x</script>' }), /<script>/);
});

test('avisos: categorías y normalización (lo desconocido cuenta como activado)', async () => {
  const { CATEGORIAS_AVISO, normalizarPreferencias, esCategoriaAviso } = await import('../src/js/core/avisos.js');
  assert.deepEqual(CATEGORIAS_AVISO.map((c) => c.id), ['duelos', 'social', 'muro', 'menciones', 'logros']);
  assert.deepEqual(normalizarPreferencias(null), { duelos: true, social: true, muro: true, menciones: true, logros: true });
  assert.deepEqual(normalizarPreferencias({ muro: false, basura: false, social: 'no' }), { duelos: true, social: true, muro: false, menciones: true, logros: true });
  assert.equal(esCategoriaAviso('menciones'), true);
  assert.equal(esCategoriaAviso('moderacion'), false);                                      // el sistema no se puede apagar
  assert.equal(esCategoriaAviso('sistema'), false);
});

test('avisos: enlace seguro (solo rutas relativas de la propia web)', async () => {
  const { enlaceAvisoSeguro } = await import('../src/js/core/avisos.js');
  assert.equal(enlaceAvisoSeguro('perfil/?u=ana#p-5'), 'perfil/?u=ana#p-5');
  assert.equal(enlaceAvisoSeguro('duelos/'), 'duelos/');
  for (const mal of ['https://evil.com', 'http://x', '//evil.com', 'javascript:alert(1)', '/perfil/', '../x', 'perfil/?u=<b>', 'perfil/ ?u=a', null, undefined, 5, '', 'a'.repeat(201)])
    assert.equal(enlaceAvisoSeguro(mal), null, `debería rechazar ${String(mal).slice(0, 30)}`);
});

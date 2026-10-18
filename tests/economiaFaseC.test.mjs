import test from 'node:test';
import assert from 'node:assert/strict';
import * as E from '../src/js/core/economia/economia.js';
import * as S from '../src/js/core/comunidad/sonidosChat.js';

test('Fase C: las tres categorías nuevas existen y las de antes siguen primero', () => {
  assert.deepEqual(E.ORDEN_CATEGORIAS.slice(0, 5), ['marco', 'titulo', 'fondo', 'color_clan', 'insignia']);
  for (const c of ['efecto_carta', 'banner', 'sonido_chat']) { assert.ok(E.ORDEN_CATEGORIAS.includes(c)); assert.ok(E.CATEGORIAS[c].etiqueta && E.CATEGORIAS[c].icono); }
  assert.equal(E.normalizarItem({ id: 1, categoria: 'banner', estilo: { patron: 'rejilla', color: '#0a0f2c' } }).categoria, 'banner');
});

test('estiloSeguro: efecto/patrón/sonido solo de la lista blanca; el resto se descarta', () => {
  assert.deepEqual(E.estiloSeguro({ efecto: 'dorado' }), { color: null, color2: null, texto: null, icono: null, efecto: 'dorado' });
  const mal = E.estiloSeguro({ efecto: 'fuego', patron: 'url(x)', sonido: 'https://x.com/a.mp3', css: 'x' });
  assert.deepEqual(mal, { color: null, color2: null, texto: null, icono: null });
  assert.equal(E.estiloSeguro({ sonido: 'snd_pop_burbuja' }).sonido, 'snd_pop_burbuja');
  assert.equal(E.estiloSeguro({ efecto: '__proto__' }).efecto, undefined);
  assert.equal(E.estiloSeguro({ patron: 'toString' }).patron, undefined);
});

test('estiloBanner: un CSS por patrón, solo con colores validados', () => {
  for (const patron of Object.keys(E.PATRONES_BANNER)) assert.match(E.estiloBanner({ patron, color: '#112233', color2: '#aabbcc' }), /^background:.*#112233/);
  assert.match(E.estiloBanner({ patron: 'diagonal', color: '#112233', color2: '#aabbcc' }), /repeating-linear-gradient/);
  assert.equal(E.estiloBanner({ patron: 'degradado' }), '');                                   // falta el color
  assert.equal(E.estiloBanner({ patron: 'rejilla', color: 'red' }), '');                       // color no válido
  assert.equal(E.estiloBanner({ patron: 'zigzag', color: '#112233' }), '');                    // patrón fuera de la lista
  assert.ok(!E.estiloBanner({ patron: 'puntos', color: '#112233; background:url(x)', color2: '#fff' }).includes('url('));
});

test('vistaPrevia de las categorías nuevas: HTML escapado y sin autoplay', () => {
  const ef = E.vistaPrevia({ categoria: 'efecto_carta', estilo: E.estiloSeguro({ efecto: 'aurora' }) });
  assert.match(ef, /data-efecto-carta="aurora"/);
  assert.match(E.vistaPrevia({ categoria: 'efecto_carta', estilo: E.estiloSeguro({ efecto: '"><img>' }) }), /data-efecto-carta="holografico"/);
  assert.match(E.vistaPrevia({ categoria: 'banner', estilo: E.estiloSeguro({ patron: 'puntos', color: '#05040f', color2: '#ffc828' }) }), /radial-gradient/);
  const so = E.vistaPrevia({ categoria: 'sonido_chat', estilo: E.estiloSeguro({ sonido: 'snd_gol_estadio' }) });
  assert.match(so, /<button type="button" data-sonido="snd_gol_estadio"/); assert.ok(!/<audio|autoplay/i.test(so));
  assert.match(E.vistaPrevia({ categoria: 'sonido_chat', estilo: E.estiloSeguro({ sonido: 'otro' }) }), /data-sonido=""/);
});

test('normalizarEfectosCarta: solo uuid y efectos de la lista', () => {
  const id = '3f2b8c1e-aaaa-4bbb-8ccc-1234567890ab';
  assert.deepEqual(E.normalizarEfectosCarta({ [id.toUpperCase()]: 'dorado', 'no-es-uuid': 'aurora', [id.replace('3f', '4f')]: 'fuego' }), { [id]: 'dorado' });
  assert.deepEqual(E.normalizarEfectosCarta(null), {}); assert.deepEqual(E.normalizarEfectosCarta([1, 2]), {});
});

test('validarItemAdmin: reglas de las categorías nuevas', () => {
  const base = { clave: 'efecto_x', nombre: 'Efecto X', precio: 10 };
  assert.equal(E.validarItemAdmin({ ...base, categoria: 'efecto_carta', efecto: 'aurora' }).ok, true);
  assert.deepEqual(E.validarItemAdmin({ ...base, categoria: 'efecto_carta', efecto: 'aurora' }).valores.estilo, { efecto: 'aurora' });
  assert.equal(E.validarItemAdmin({ ...base, categoria: 'efecto_carta', efecto: 'fuego' }).ok, false);
  assert.equal(E.validarItemAdmin({ ...base, categoria: 'sonido_chat', sonido: 'snd_pop_burbuja' }).ok, true);
  assert.equal(E.validarItemAdmin({ ...base, categoria: 'sonido_chat', sonido: 'http://x/a.mp3' }).ok, false);
  const b = E.validarItemAdmin({ ...base, categoria: 'banner', patron: 'rejilla', color: '#0a0f2c', color2: '#00e5ff' });
  assert.equal(b.ok, true); assert.deepEqual(b.valores.estilo, { patron: 'rejilla', color: '#0a0f2c', color2: '#00e5ff' });
  assert.equal(E.validarItemAdmin({ ...base, categoria: 'banner', patron: 'rejilla' }).ok, false);
  assert.equal(E.validarItemAdmin({ ...base, categoria: 'banner', patron: 'x', color: '#0a0f2c' }).ok, false);
  assert.equal(E.validarItemAdmin({ ...base, categoria: 'marco', color: '#ff0000' }).ok, true);   // lo de antes sigue igual
});

test('sonidosChat: catálogo, metadatos y límites', () => {
  assert.deepEqual(S.CLAVES_SONIDO, ['snd_campana_cristal', 'snd_pop_burbuja', 'snd_moneda_dorada', 'snd_gol_estadio']);
  for (const c of S.CLAVES_SONIDO) {
    const m = S.metadatosDe(c);
    assert.equal(m.clave, c); assert.equal(m.archivo, `${c}.wav`); assert.ok(m.etiqueta);
    assert.ok(m.duracionMs > 0 && m.duracionMs <= S.MAX_DURACION_MS, `${c} dura ${m.duracionMs}`);
    assert.ok(m.cooldownS >= 1 && m.volumen > 0 && m.volumen <= 1);
    for (const n of S.partituraDe(c)) { assert.ok(n.f >= 50 && n.f <= 8000 && n.f2 >= 50 && n.f2 <= 8000); assert.ok(n.vol > 0 && n.vol <= 1); assert.ok(n.t + n.dur <= S.MAX_DURACION_MS); }
  }
  assert.equal(S.catalogoSonidos().length, 4);
});

test('sonidosChat: claves desconocidas o peligrosas no valen', () => {
  for (const x of ['', 'snd_otro', '__proto__', 'constructor', 'https://x.com/a.mp3', '../x', null, undefined, 5]) { assert.equal(S.esSonidoChat(x), false); assert.equal(S.metadatosDe(x), null); assert.deepEqual(S.partituraDe(x), []); assert.equal(S.duracionDe(x), 0); }
});

test('la lista blanca de la web coincide con la de la migración 121', async () => {
  const { readFileSync } = await import('node:fs');
  const sql = readFileSync(new URL('../supabase/migrations/121_economia_fase_c_efectos_banners_sonidos.sql', import.meta.url), 'utf8');
  const lista = (clave) => [...sql.match(new RegExp(`k = '${clave}' and \\(v #>> '\\{\\}'\\) not in \\(([^)]*)\\)`))[1].matchAll(/'([^']+)'/g)].map((m) => m[1]);
  assert.deepEqual(lista('efecto'), Object.keys(E.EFECTOS_CARTA));
  assert.deepEqual(lista('patron'), Object.keys(E.PATRONES_BANNER));
  assert.deepEqual(lista('sonido'), S.CLAVES_SONIDO);
});

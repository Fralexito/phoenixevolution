import test from 'node:test';
import assert from 'node:assert/strict';
import { VISTAS, vistaInfo, vistaValida, paginaSiguiente, textoVacio } from '../src/js/core/feed.js';

test('vistas: ids y valor por defecto', () => {
  assert.deepEqual(VISTAS.map((v) => v.id), ['recientes', 'siguiendo', 'destacado']);
  for (const malo of [null, undefined, '', 'x', 'SIGUIENDO', '__proto__', 5]) assert.equal(vistaValida(malo), 'recientes', String(malo));
  assert.equal(vistaValida('destacado'), 'destacado'); assert.equal(vistaInfo('siguiendo').requiereSesion, true); assert.equal(vistaInfo('x').id, 'recientes');
});
test('el filtro por juego solo existe en «recientes»', () => { assert.deepEqual(VISTAS.filter((v) => v.filtraJuego).map((v) => v.id), ['recientes']); });
test('siguiente página: por id (recientes/siguiendo) y por cantidad (destacado)', () => {
  const items = [{ id: 9 }, { id: 7 }, { id: 4 }];
  assert.deepEqual(paginaSiguiente('recientes', items), { antes: 4 }); assert.deepEqual(paginaSiguiente('siguiendo', items), { antes: 4 });
  assert.deepEqual(paginaSiguiente('destacado', items), { desplazamiento: 3 });
  assert.deepEqual(paginaSiguiente('recientes', []), { antes: null }); assert.deepEqual(paginaSiguiente('destacado', null), { desplazamiento: 0 });
});
test('textos de feed vacío', () => {
  assert.match(textoVacio('siguiendo', { conSesion: false }), /Inicia sesión/); assert.match(textoVacio('siguiendo', { conSesion: true }), /Buscar/);
  assert.match(textoVacio('destacado'), /reacciones/); assert.match(textoVacio('recientes', { juego: 'pes' }), /ese juego/); assert.equal(textoVacio('recientes'), 'Todavía no hay publicaciones.');
});

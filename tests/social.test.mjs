import test from 'node:test';
import assert from 'node:assert/strict';
import { validarBusqueda, mencionEnCursor, insertarMencion, normalizarPersona, esTipoBusqueda } from '../src/js/core/social.js';

test('búsqueda: validación por tipo', () => {
  assert.deepEqual(validarBusqueda('  ana  ', 'personas'), { ok: true, q: 'ana', error: '' });
  assert.equal(validarBusqueda('@ana', 'personas').q, 'ana');                       // la @ se admite al buscar personas
  assert.equal(validarBusqueda('@ana', 'publicaciones').q, '@ana');                 // en publicaciones se busca el texto tal cual
  assert.equal(validarBusqueda('a', 'personas').ok, false);
  assert.equal(validarBusqueda('@a', 'personas').ok, false);                        // tras quitar la @ queda 1 letra
  assert.equal(validarBusqueda('x'.repeat(41), 'personas').ok, false);
  assert.equal(validarBusqueda('x'.repeat(41), 'publicaciones').ok, true);
  assert.equal(validarBusqueda('x'.repeat(81), 'publicaciones').ok, false);
  assert.equal(validarBusqueda('hola   mundo', 'publicaciones').q, 'hola mundo');   // espacios colapsados
  assert.equal(validarBusqueda('ana', 'usuarios').ok, false);
  assert.equal(validarBusqueda(null, 'personas').ok, false);
  assert.equal(esTipoBusqueda('personas') && esTipoBusqueda('publicaciones') && !esTipoBusqueda('x'), true);
});

test('autocompletado: detecta @ en el cursor', () => {
  assert.deepEqual(mencionEnCursor('hola @an', 8), { inicio: 5, fin: 8, consulta: 'an' });
  assert.deepEqual(mencionEnCursor('@', 1), { inicio: 0, fin: 1, consulta: '' });
  assert.deepEqual(mencionEnCursor('x\n@bo', 5), { inicio: 2, fin: 5, consulta: 'bo' });
  assert.equal(mencionEnCursor('correo@sitio', 12), null);                          // pegada a una letra: no es mención
  assert.equal(mencionEnCursor('@@ana', 5), null);
  assert.equal(mencionEnCursor('hola @ana y más', 15), null);                       // el cursor ya salió de la mención
  assert.deepEqual(mencionEnCursor('hola @ana y más', 9), { inicio: 5, fin: 9, consulta: 'ana' });   // cursor en medio del texto
  assert.equal(mencionEnCursor('', 0), null);
  assert.equal(mencionEnCursor(null, 3), null);
  assert.deepEqual(mencionEnCursor('hola @an', 99), { inicio: 5, fin: 8, consulta: 'an' });          // cursor fuera de rango se acota
});

test('autocompletado: insertar mención deja el texto y el cursor bien', () => {
  const m = mencionEnCursor('hola @an', 8);
  assert.deepEqual(insertarMencion('hola @an', m, 'ana_9'), { texto: 'hola @ana_9 ', pos: 12 });
  const m2 = mencionEnCursor('hola @an y más', 8);
  assert.deepEqual(insertarMencion('hola @an y más', m2, 'ana'), { texto: 'hola @ana y más', pos: 10 });   // ya había espacio: no se duplica
  assert.equal(insertarMencion('hola @an', m, '<b>x</b>').texto, 'hola @bxb ');                          // caracteres raros se descartan
  assert.deepEqual(insertarMencion('hola', null, 'ana'), { texto: 'hola', pos: 4 });
  assert.deepEqual(insertarMencion('hola @an', m, ''), { texto: 'hola @an', pos: 8 });
});

test('personas: normalización segura', () => {
  assert.equal(normalizarPersona(null), null);
  assert.equal(normalizarPersona({ id: 'x' }), null);
  const p = normalizarPersona({ id: 'u1', username: 'ana', nombre_display: '<b>Ana</b>', avatar_url: 'https://x/y.png', rol: 'jugador', motivo: 'Mismo club favorito' });
  assert.equal(p.nombre, '<b>Ana</b>');                                              // se escapa al pintar (escapeHTML), no aquí: el dato no se altera
  assert.equal(p.motivo, 'Mismo club favorito');
  assert.equal(normalizarPersona({ id: 'u', username: 'a'.repeat(100) }).username.length, 40);
});

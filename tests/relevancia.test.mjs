import test from 'node:test';
import assert from 'node:assert/strict';
import { escenasPortada, PRIORIDAD } from '../src/js/core/portada/relevancia.js';

const tabla = [{ nombre: 'A', pts: 20, pj: 8 }, { nombre: 'B', pts: 17, pj: 8 }, { nombre: 'C', pts: 9, pj: 8 }, { nombre: 'D', pts: 3, pj: 8 }];
const proximos = [{ fecha: 9, l: 'C', v: 'D' }, { fecha: 9, l: 'A', v: 'B' }, { fecha: 10, l: 'A', v: 'C' }];
const resultados = [{ fecha: 8, l: 'B', v: 'D', gl: 2, gv: 0 }];
const noticias = [{ id: 2, categoria: 'TRIBUNAL' }, { id: 1, categoria: 'OFICIAL' }];
const campeones = [{ copa: 'Copa', dt: 'X' }, { copa: 'Liga', dt: 'Y', oro: true }];

test('relevancia: orden por prioridad y el partido grande primero', () => {
  const e = escenasPortada({ proximos, resultados, tabla, noticias, campeones });
  assert.deepEqual(e.map((x) => x.tipo), ['partido', 'noticia', 'lider', 'partido', 'resultado', 'campeon']);
  assert.equal(e[0].dato.l, 'A');                       // A vs B (1.º y 2.º) antes que C vs D
  assert.equal(e[1].dato.id, 1);                        // la noticia OFICIAL, no la primera de la lista
  assert.equal(e[2].dato.ventaja, 3); assert.equal(e[2].dato.segundo, 'B');
  assert.equal(e[3].dato.l, 'C');                       // el otro partido de la misma fecha
  assert.equal(e[5].dato.dt, 'Y');                      // el campeón de oro
  assert.equal(e[0].prioridad, PRIORIDAD.partido);
});

test('relevancia: tope y datos vacíos', () => {
  assert.equal(escenasPortada({ proximos, resultados, tabla, noticias, campeones }, 3).length, 3);
  assert.deepEqual(escenasPortada({}), []);
  assert.deepEqual(escenasPortada({ tabla: [{ nombre: 'A', pts: 3, pj: 1 }] }).map((x) => [x.tipo, x.dato.ventaja]), [['lider', null]]);
});

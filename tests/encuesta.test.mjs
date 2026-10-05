import test from 'node:test';
import assert from 'node:assert/strict';
import { validarEncuesta, porcentajes, textoCierre, normalizarEncuestas } from '../src/js/core/encuesta.js';

test('formulario: casos válidos y espacios', () => {
  const v = validarEncuesta({ pregunta: '  ¿Qué   parche usamos? ', opciones: [' PES 21 ', 'SP  2026', '', '   '], dias: '3' });
  assert.deepEqual(v, { ok: true, pregunta: '¿Qué parche usamos?', opciones: ['PES 21', 'SP 2026'], dias: 3, error: '' });
});
test('formulario: rechazos', () => {
  const base = { pregunta: 'Pregunta válida', opciones: ['a', 'b'], dias: 3 };
  assert.equal(validarEncuesta({ ...base, pregunta: 'ab' }).ok, false);
  assert.equal(validarEncuesta({ ...base, pregunta: 'x'.repeat(281) }).ok, false);
  assert.equal(validarEncuesta({ ...base, opciones: ['solo'] }).ok, false);
  assert.equal(validarEncuesta({ ...base, opciones: ['a', 'b', 'c', 'd', 'e'] }).ok, false);
  assert.equal(validarEncuesta({ ...base, opciones: ['Si', 'si'] }).ok, false);
  assert.equal(validarEncuesta({ ...base, opciones: ['x'.repeat(41), 'b'] }).ok, false);
  for (const d of [0, 8, 1.5, 'x', null]) assert.equal(validarEncuesta({ ...base, dias: d }).ok, false, String(d));
  assert.equal(validarEncuesta().ok, false);
});
test('porcentajes: ocultos → null; total 0 → 0', () => {
  assert.deepEqual(porcentajes([{ votos: 3 }, { votos: 1 }], 4), [75, 25]);
  assert.deepEqual(porcentajes([{ votos: null }, { votos: null }], 4), [null, null]);
  assert.deepEqual(porcentajes([{ votos: 0 }, { votos: 0 }], 0), [0, 0]);
  assert.deepEqual(porcentajes(null, 0), []);
});
test('texto de cierre', () => {
  const ahora = Date.parse('2026-10-05T12:00:00Z');
  assert.equal(textoCierre('2026-10-08T15:00:00Z', ahora), 'Cierra en 3 d 3 h');
  assert.equal(textoCierre('2026-10-06T12:00:00Z', ahora), 'Cierra en 1 d');
  assert.equal(textoCierre('2026-10-05T17:00:00Z', ahora), 'Cierra en 5 h');
  assert.equal(textoCierre('2026-10-05T12:00:20Z', ahora), 'Cierra en 1 min');
  assert.equal(textoCierre('2026-10-05T11:00:00Z', ahora), 'Cerrada');
  assert.equal(textoCierre('basura', ahora), '');
});
test('normalizar respuesta del servidor', () => {
  const m = normalizarEncuestas({ 7: { id: 1, cierra_at: 'x', cerrada: false, soy_autor: false, mi_voto: null, total: 2, resultados_visibles: false, opciones: [{ id: 1, texto: 'A', votos: null }, { id: 2, texto: 'B', votos: null }] },
    8: { id: 2, opciones: [{ id: 1 }] }, abc: { opciones: [1, 2] } });
  assert.deepEqual([...m.keys()], [7]); assert.equal(m.get(7).miVoto, null); assert.equal(m.get(7).opciones[0].votos, null);
  assert.equal(normalizarEncuestas(null).size, 0);
});

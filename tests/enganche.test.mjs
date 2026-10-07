import { test } from 'node:test';
import assert from 'node:assert/strict';
import { textoRacha, formaValida, textoFalta } from '../src/js/core/enganche.js';
test('enganche', () => {
  assert.equal(textoRacha({ dias: 3, jugo_hoy: true }).hecho, true);
  assert.match(textoRacha({ dias: 2, jugo_hoy: false }).meta, /no perderla/);
  assert.equal(textoRacha(null).titulo, 'Empieza tu racha');
  assert.deepEqual(formaValida(['G', 'X', 'P']), ['G', 'P']);
  assert.equal(textoFalta(90061), '1 d 1 h');
});

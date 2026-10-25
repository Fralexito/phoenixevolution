import { test } from 'node:test';
import assert from 'node:assert/strict';
import { categoriaDe } from '../src/js/core/sistema/notifs.js';

test('tipos nuevos de la 152 caen en su categoría (espejo de private.categoria_notif)', () => {
  assert.equal(categoriaDe('MVP'), 'logros');
  assert.equal(categoriaDe('PRODE'), 'logros');
  assert.equal(categoriaDe('DRAFT'), 'duelos');
  assert.equal(categoriaDe('CLAN'), 'social');
});

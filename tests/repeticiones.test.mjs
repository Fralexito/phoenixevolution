import { test } from 'node:test';
import assert from 'node:assert/strict';
import { validarUrlVideo, sitioDe } from '../src/js/core/competicion/repeticiones.js';

test('validarUrlVideo', () => {
  assert.equal(validarUrlVideo('https://www.youtube.com/watch?v=abc').sitio, 'YouTube');
  assert.equal(validarUrlVideo('https://clips.twitch.tv/Golazo').sitio, 'Twitch');
  assert.equal(validarUrlVideo('http://youtube.com/x').ok, false);
  assert.equal(validarUrlVideo('javascript:alert(1)').ok, false);
  assert.equal(validarUrlVideo('https://youtube.com.malo.com/x').ok, false);
  assert.equal(validarUrlVideo('https://malyoutube.com/x').ok, false);
  assert.equal(validarUrlVideo('https://youtube.com/x"onerror').ok, false);
  assert.equal(validarUrlVideo('').ok, false);
  assert.equal(sitioDe('https://kick.com/a').nombre, 'Kick');
});

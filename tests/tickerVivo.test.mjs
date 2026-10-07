import { test } from 'node:test';
import assert from 'node:assert/strict';
import { piezasTicker } from '../src/js/core/tickerVivo.js';
test('piezasTicker', () => {
  const p = piezasTicker({ en_juego: 1, salas_vivas: 0, retos_abiertos: 3, resultados: [{ a: 'Kaiser', b: 'Mirko', ga: 3, gb: 1 }, { a: 'X' }] });
  assert.deepEqual(p.map((x) => x.texto), ['1 partido en juego', '3 retos esperando rival', 'Kaiser 3 – 1 Mirko']);
  assert.deepEqual(piezasTicker(null), []);
});
import { plataformaDe, piezasCreadores } from '../src/js/core/tickerVivo.js';
test('creadores en el ticker', () => {
  assert.equal(plataformaDe('https://www.tiktok.com/@x/live'), 'TikTok');
  assert.equal(plataformaDe('https://kick.com/x'), 'Kick');
  assert.deepEqual(piezasCreadores([{ nombre: 'Kaiser', url: 'https://twitch.tv/k', titulo: 'Liga' }, { nombre: 'X', url: 'javascript:1' }]).map((p) => p.texto), ['🔴 Kaiser está en vivo en Twitch · Liga']);
});

import test from 'node:test';
import assert from 'node:assert/strict';
import { escapeHTML, safeUrl, safeImg, toUsername, statColor, stat } from '../src/js/core/dom.js';
import { PRESETS, presetId, presetValue, providerAvatar, avatarHTML } from '../src/js/core/avatar.js';
import { cooldownInfo, USERNAME_COOLDOWN_DAYS, speedBucket, SPEED_BUCKETS } from '../src/js/core/rules.js';
import { clampStat, calcOvr } from '../src/js/core/stats.js';
import { STAT_INFO } from '../src/data/stats.js';
import { STAT_KEYS } from '../src/js/features/playerCard.js';
import { compareStats, radarPoints, axisPoint } from '../src/js/core/compare.js';
import { formatEvento, demoDelay } from '../src/js/core/live.js';
import { setTeamSize, seats, validTeams, clampTeam, maxFor } from '../src/js/core/teams.js';
import { slotToDate, manualToDate, isFuture, isStale, presetToReto, confirmPhase } from '../src/js/core/schedule.js';

test('escapeHTML neutraliza HTML', () => {
  assert.equal(escapeHTML('<img src=x onerror="a()">'), '&lt;img src=x onerror=&quot;a()&quot;&gt;');
  assert.equal(escapeHTML(null), '');
});
test('safeUrl solo https (y parsec si se permite)', () => {
  assert.equal(safeUrl('javascript:alert(1)'), '');
  assert.equal(safeUrl('http://x.com'), '');
  assert.equal(safeUrl('https://x.com'), 'https://x.com');
  assert.equal(safeUrl('parsec://a'), '');
  assert.equal(safeUrl('parsec://a', { allowParsec: true }), 'parsec://a');
  assert.equal(safeUrl('steam://connect/1', { allowParsec: true }), 'steam://connect/1');
  assert.equal(safeUrl('steam://connect/1'), '');
});
test('safeImg acepta https y data:image, rechaza el resto', () => {
  assert.equal(safeImg('data:image/jpeg;base64,AAAA'), 'data:image/jpeg;base64,AAAA');
  assert.equal(safeImg('data:text/html;base64,AAAA'), '');
  assert.equal(safeImg('javascript:x'), '');
});
test('toUsername cumple ^[a-z0-9_]{1,20}$', () => {
  assert.match(toUsername('Fralex FC!! ÁÉ'), /^[a-z0-9_]{1,20}$/);
  assert.equal(toUsername('A'.repeat(40)).length, 20);
});
test('stat y statColor', () => {
  assert.equal(stat(null), 75); assert.equal(stat(120), 99); assert.equal(stat('88'), 88);
  assert.equal(statColor(95), '#00e5ff'); assert.equal(statColor(60), '#ff4444');
});
const now = new Date(2026, 9, 3, 20, 0, 0); // 3 oct 2026 20:00
test('slots de madrugada caen en el día calendario siguiente', () => {
  assert.equal(slotToDate(0, '22:00', now).getDate(), 3);
  assert.equal(slotToDate(0, '00:00', now).getDate(), 4);
  assert.equal(slotToDate(1, '01:00', now).getDate(), 5);
});
test('isFuture exige 30 min de margen (igual que la BD)', () => {
  assert.equal(isFuture(slotToDate(0, '14:00', now), now), false);
  assert.equal(isFuture(new Date(now.getTime() + 29 * 60e3), now), false);
  assert.equal(isFuture(new Date(now.getTime() + 30 * 60e3), now), true);
  assert.equal(isFuture(slotToDate(0, '22:00', now), now), true);
});
test('presetToReto: ya / 15 / 30 son AHORA, 60 es PROGRAMADO', () => {
  assert.deepEqual(presetToReto('ya', now), { modalidad: 'AHORA', fecha_programada: null });
  assert.equal(presetToReto('15', now).modalidad, 'AHORA');
  assert.equal(new Date(presetToReto('15', now).fecha_programada).getTime() - now.getTime(), 15 * 60e3);
  assert.equal(presetToReto('60', now).modalidad, 'PROGRAMADO');
  assert.equal(presetToReto('x', now), null);
});
test('confirmPhase: pronto > 30, abierta 30..10, cerrada < 10', () => {
  const f = (m) => new Date(now.getTime() + m * 60e3);
  assert.equal(confirmPhase(f(45), now), 'pronto');
  assert.equal(confirmPhase(f(30), now), 'abierta');
  assert.equal(confirmPhase(f(10), now), 'abierta');
  assert.equal(confirmPhase(f(9), now), 'cerrada');
});
test('manualToDate rechaza 31 de febrero y fechas pasadas', () => {
  assert.equal(manualToDate({ day: 31, month: 1, hhmm: '21:00' }, now).ok, false);
  assert.equal(manualToDate({ day: 3, month: 9, hhmm: '10:00' }, now).ok, false);
  assert.equal(manualToDate({ day: 10, month: 9, hhmm: '21:00' }, now).ok, true);
});
test('manualToDate: mes anterior se entiende como año siguiente', () => {
  const r = manualToDate({ day: 15, month: 0, hhmm: '21:00' }, now);
  assert.ok(r.ok); assert.equal(r.date.getFullYear(), 2027);
});
test('isStale', () => {
  const old = new Date(now.getTime() - 3 * 3600e3).toISOString();
  assert.equal(isStale({ estado: 'BUSCANDO', created_at: old, fecha_programada: null }, now), true);
  assert.equal(isStale({ estado: 'BUSCANDO', created_at: now.toISOString(), fecha_programada: null }, now), false);
});

test('equipos: máximo 8 en total y cada lado entre 1 y 7', () => {
  assert.equal(validTeams(4, 4), true); assert.equal(validTeams(5, 4), false); assert.equal(validTeams(0, 1), false); assert.equal(validTeams(7, 1), true); assert.equal(validTeams(8, 1), false);
  assert.equal(clampTeam('x'), 1); assert.equal(clampTeam(99), 7); assert.equal(maxFor(4), 4); assert.equal(maxFor(1), 7);
});
test('setTeamSize nunca produce un par inválido', () => {
  assert.deepEqual(setTeamSize({ a: 4, b: 4 }, 'a', 6), { a: 4, b: 4 });
  assert.deepEqual(setTeamSize({ a: 2, b: 3 }, 'b', 6), { a: 2, b: 6 });
  assert.deepEqual(setTeamSize({ a: 2, b: 3 }, 'a', 0), { a: 1, b: 3 });
  for (let a = 0; a < 12; a++) for (let b = 0; b < 12; b++) { const r = setTeamSize({ a: 3, b: 3 }, 'a', a); assert.ok(validTeams(r.a, r.b)); const q = setTeamSize(r, 'b', b); assert.ok(validTeams(q.a, q.b)); }
});
test('seats: cuenta confirmados, invitados y libres; ignora a quien salió', () => {
  const parts = [{ equipo: 'A', estado: 'CONFIRMADO' }, { equipo: 'A', estado: 'INVITADO' }, { equipo: 'A', estado: 'SALIO' }, { equipo: 'B', estado: 'CONFIRMADO' }];
  assert.deepEqual(seats(3, parts, 'A'), { tam: 3, confirmed: 1, invited: 1, free: 1, missing: 2 });
  assert.deepEqual(seats(1, parts, 'B'), { tam: 1, confirmed: 1, invited: 0, free: 0, missing: 0 });
});

test('avatares: solo se aceptan presets conocidos y fotos https', () => {
  assert.equal(presetId('preset:fenix'), 'fenix');
  assert.equal(presetId('preset:no-existe'), '');
  assert.equal(presetId('javascript:alert(1)'), '');
  assert.equal(presetValue('fenix'), 'preset:fenix');
  assert.ok(PRESETS.every((p) => /^[a-z0-9-]{1,30}$/.test(p.id)), 'ids válidos para la restricción de la BD');
});
test('avatares: foto del proveedor (Discord/Google) y límite de 300 caracteres', () => {
  assert.equal(providerAvatar({ user_metadata: { avatar_url: 'https://cdn.discordapp.com/a.png' } }), 'https://cdn.discordapp.com/a.png');
  assert.equal(providerAvatar({ user_metadata: { picture: 'https://lh3.googleusercontent.com/x' } }), 'https://lh3.googleusercontent.com/x');
  assert.equal(providerAvatar({ user_metadata: { avatar_url: 'http://inseguro.test/x.png' } }), '');
  assert.equal(providerAvatar({ user_metadata: { avatar_url: 'https://a.test/' + 'x'.repeat(300) } }), '');
  assert.equal(providerAvatar(null), '');
});
test('avatares: el HTML escapa la inicial y no interpreta datos', () => {
  const h = avatarHTML('', '<img src=x onerror=alert(1)>', 36);
  assert.ok(!h.includes('<img'), 'la inicial no debe abrir etiquetas');
  assert.ok(avatarHTML('preset:fenix', 'X', 40).includes('fa-dragon'));
  assert.ok(avatarHTML('https://a.test/f.png', 'ñ', 40).includes('data-av-inicial'));
});

test('cooldown del @usuario: libre sin completar perfil, bloqueado 14 días tras un cambio', () => {
  const now = new Date('2026-10-04T12:00:00Z');
  assert.equal(USERNAME_COOLDOWN_DAYS, 14);
  assert.deepEqual(cooldownInfo(null, now), { blocked: false, until: null });
  assert.equal(cooldownInfo({ perfil_completo: false, username_changed_at: '2026-10-03T00:00:00Z' }, now).blocked, false);
  assert.equal(cooldownInfo({ perfil_completo: true, username_changed_at: null }, now).blocked, false);
  const r = cooldownInfo({ perfil_completo: true, username_changed_at: '2026-10-04T00:00:00Z' }, now);
  assert.equal(r.blocked, true); assert.equal(r.until.toISOString(), '2026-10-18T00:00:00.000Z');
  assert.equal(cooldownInfo({ perfil_completo: true, username_changed_at: '2026-09-20T00:00:00Z' }, now).blocked, false);
  assert.equal(cooldownInfo({ perfil_completo: true, username_changed_at: 'basura' }, now).blocked, false);
});

test('velocidad: valores antiguos caen en el grupo correcto', () => {
  assert.deepEqual([null, 0, 5, 50, 99, 100, 250, 300, 499, 500, 501, 900].map(speedBucket), [null, null, 25, 25, 25, 100, 100, 300, 300, 500, 1000, 1000]);
  assert.ok(SPEED_BUCKETS.every((b) => b.v >= 1 && b.v <= 10000), 'dentro de perfiles_ancho_ok');
});

test('media del jugador: promedio redondeado y limitado a 1-99', () => {
  assert.equal(calcOvr([75, 75, 76]), 75); assert.equal(calcOvr([80, 90]), 85); assert.equal(calcOvr([]), 75);
  assert.equal(calcOvr([200, 200]), 99); assert.equal(calcOvr([-5, 0]), 1);
  assert.equal(clampStat('abc', 60), 60); assert.equal(clampStat(120), 99); assert.equal(clampStat(0), 1);
});
test('leyenda: todas las estadísticas (y OVR) tienen nombre y explicación breve', () => {
  for (const k of [...STAT_KEYS, 'ovr']) { assert.ok(STAT_INFO[k]?.nombre, k); assert.ok(STAT_INFO[k].texto.length > 20 && STAT_INFO[k].texto.length < 200, `${k}: texto breve`); }
});

test('comparar: gana quien tiene más y se cuentan empates', () => {
  const keys = ['atq', 'fin', 'pas'];
  const c = compareStats({ atq: 80, fin: 70, pas: 75, ovr: 77 }, { atq: 70, fin: 70, pas: 90, ovr: 80 }, keys);
  assert.deepEqual(c.wins, { a: 1, b: 1, tie: 1 });
  assert.deepEqual(c.rows.map((r) => r.win), ['a', 'tie', 'b']);
  assert.equal(c.rows[2].diff, -15); assert.equal(c.ovr.diff, -3);
});
test('radar: el eje 0 apunta arriba, el valor mínimo cae en el centro y el máximo en el borde', () => {
  const [x, y] = axisPoint(0, 4, 150, 150, 100); assert.equal(Math.round(x), 150); assert.equal(Math.round(y), 50);
  const o = { cx: 150, cy: 150, r: 100, min: 40, max: 99 };
  assert.equal(radarPoints({ atq: 40 }, ['atq'], o), '150.0,150.0');
  assert.equal(radarPoints({ atq: 99 }, ['atq'], o), '150.0,50.0');
});
test('pulso en vivo: escapa nombres, rechaza eventos inválidos y la pausa queda en rango', () => {
  const f = formatEvento({ tipo: 'reto_aceptado', quien: '<b>x</b>', rival: 'Neo', formato: '2v2' });
  assert.ok(f.html.includes('&lt;b&gt;') && !f.html.includes('<b>x'));
  assert.equal(formatEvento({ tipo: 'reto_aceptado', quien: 'A' }), null);
  assert.equal(formatEvento({ tipo: 'otro', quien: 'A' }), null);
  assert.equal(formatEvento({ tipo: 'radar_on', quien: 'Neo' }).tone, 'cyan');
  assert.equal(demoDelay(() => 0), 5000); assert.equal(demoDelay(() => 1), 11000);
});

import test from 'node:test';
import assert from 'node:assert/strict';
import { escapeHTML, safeUrl, safeImg, toUsername, statColor, stat } from '../src/js/core/dom.js';
import { PRESETS, presetId, presetValue, providerAvatar, avatarHTML } from '../src/js/core/avatar.js';
import { cooldownInfo, USERNAME_COOLDOWN_DAYS, speedBucket, SPEED_BUCKETS } from '../src/js/core/rules.js';
import { clampStat, calcOvr, distribuirMedia, aleatorias } from '../src/js/core/stats.js';
import { coverScale, clampPos, initialState, zoomAt, rescale, sourceRect, outSize, MAX_ZOOM, aspectoValido, ratioDe, ASPECTOS } from '../src/js/core/crop.js';
import { filterPlayers, norm } from '../src/js/core/search.js';
import { posInfo, POSICIONES } from '../src/data/posiciones.js';
import { STAT_INFO } from '../src/data/stats.js';
import { STAT_KEYS } from '../src/js/features/playerCard.js';
import { compareStats, radarPoints, axisPoint, autoTeams, moveToTeam, teamProfile, compareTeams, MAX_TEAM } from '../src/js/core/compare.js';
import { formatEvento, demoDelay, horaExacta, podarHistorial, mismoDia, HIST_MAX_MS } from '../src/js/core/live.js';
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

test('equipos: se reparten alternando, máx. 4 por equipo, y mover respeta el límite', () => {
  assert.deepEqual(autoTeams(['1', '2', '3']), { a: ['1', '3'], b: ['2'] });
  assert.deepEqual(autoTeams(['1', '2', '3', '4', '5', '6', '7', '8', '9']), { a: ['1', '3', '5', '7'], b: ['2', '4', '6', '8'] });
  assert.deepEqual(moveToTeam({ a: ['1', '3'], b: ['2'] }, '3', 'b'), { a: ['1'], b: ['2', '3'] });
  const lleno = { a: ['1'], b: ['2', '3', '4', '5'] }; assert.equal(moveToTeam(lleno, '1', 'b'), lleno);
  assert.equal(MAX_TEAM, 4);
});
test('equipos: promedio por jugador permite comparar 3 vs 2 de forma justa', () => {
  const k = ['atq', 'fin'];
  const A = [{ atq: 90, fin: 80, ovr: 85 }, { atq: 80, fin: 70, ovr: 75 }, { atq: 70, fin: 60, ovr: 65 }];
  const B = [{ atq: 80, fin: 90, ovr: 85 }, { atq: 80, fin: 80, ovr: 80 }];
  const pa = teamProfile(A, k); const pb = teamProfile(B, k);
  assert.deepEqual([pa.n, pa.atq, pa.fin, pa.ovr], [3, 80, 70, 75]); assert.deepEqual([pb.n, pb.atq, pb.fin, pb.ovr], [2, 80, 85, 82.5]);
  const c = compareTeams(pa, pb, k);
  assert.deepEqual(c.rows.map((r) => r.win), ['tie', 'b']); assert.equal(c.ovr.diff, -7.5); assert.equal(teamProfile([], k).n, 0);
});
test('posiciones: 11 posiciones, 4 grupos con color y nombre completo; código desconocido no rompe', () => {
  assert.equal(POSICIONES.length, 11);
  assert.equal(posInfo('DC').grupo, 'delantero'); assert.equal(posInfo('PO').nombre, 'Portero'); assert.equal(posInfo('DFC').grupoNombre, 'Defensa');
  assert.ok(POSICIONES.every((p) => /^#[0-9a-f]{6}$/.test(posInfo(p.cod).color)));
  assert.equal(posInfo('ZZ').cod, 'ZZ'); assert.equal(posInfo(null).color, '#9ca3af');
});

test('búsqueda de jugadores: sin acentos ni mayúsculas, empieza-con primero, y excluye ids', () => {
  const L = [{ id: '1', nombre: 'Titán' }, { id: '2', nombre: 'Mirko' }, { id: '3', nombre: 'Kaiser Titanio' }, { id: '4', nombre: 'Neo' }];
  assert.equal(norm('  ÁÉÍ '), 'aei');
  assert.deepEqual(filterPlayers(L, 'TITAN').map((p) => p.id), ['1', '3']);
  assert.deepEqual(filterPlayers(L, 'tan').map((p) => p.id), ['1', '3']);
  assert.equal(filterPlayers(L, '').length, 4);
  assert.deepEqual(filterPlayers(L, '', ['2', '4']).map((p) => p.id), ['1', '3']);
  assert.equal(filterPlayers(L, 'zzz').length, 0); assert.equal(filterPlayers(L, '', [], 2).length, 2);
});

test('historial en vivo: hora exacta, ventana de 2 horas, orden y tope', () => {
  const t0 = new Date(2026, 9, 4, 4, 5, 9).getTime();
  assert.equal(horaExacta(t0), '04:05:09'); assert.equal(horaExacta('x'), '--:--:--');
  assert.equal(mismoDia(t0, t0 + 1000), true); assert.equal(mismoDia(t0, t0 + 86_400_000 * 2), false);
  const ev = (ts, quien = 'A') => ({ tipo: 'radar_on', quien, ts });
  const now = t0 + HIST_MAX_MS;
  const h = podarHistorial([ev(t0 + 1), ev(t0 - 1), ev(now - 10, 'Nuevo'), ev(now + 3_600_000), { tipo: 'x', quien: 'A', ts: now - 5 }, null, ev(NaN)], now);
  assert.deepEqual(h.map((e) => e.quien), ['Nuevo', 'A']);              // fuera de ventana, futuro, inválidos y vacíos descartados; más nuevo primero
  assert.equal(podarHistorial(Array.from({ length: 300 }, (_, i) => ev(now - i * 1000)), now).length, 200);
  assert.deepEqual(podarHistorial('basura', now), []);
});

test('recorte: la imagen siempre cubre el marco, el zoom respeta límites y el recorte sale en 5:4', () => {
  const D = { nw: 2000, nh: 1000, fw: 500, fh: 400 };           // foto panorámica en un marco 5:4
  assert.equal(coverScale(2000, 1000, 500, 400), 0.4);          // limita el alto: 1000*0.4 = 400
  const st = initialState(D.nw, D.nh, D.fw, D.fh);
  assert.equal(st.s, 0.4); assert.equal(st.y, 0); assert.equal(st.x, -150);   // centrada en horizontal (2000*0.4=800 → sobran 300)
  assert.deepEqual(clampPos(50, 50, 0.4, 2000, 1000, 500, 400), { x: 0, y: 0 });          // no se puede dejar hueco
  assert.deepEqual(clampPos(-9999, -9999, 0.4, 2000, 1000, 500, 400), { x: -300, y: 0 });
  // zoom: nunca baja del mínimo ni pasa del máximo
  assert.equal(zoomAt(st, 0.1, 250, 200, D).s, 0.4); assert.equal(zoomAt(st, 1000, 250, 200, D).s, 0.4 * MAX_ZOOM);
  // el punto bajo el cursor se queda quieto al acercar
  const z = zoomAt(st, 2, 250, 200, D); const antes = (250 - st.x) / st.s; const despues = (250 - z.x) / z.s;
  assert.ok(Math.abs(antes - despues) < 1e-9);
  // el recorte real es la parte visible de la ORIGINAL y mantiene el 5:4
  const r = sourceRect(z, D.fw, D.fh); assert.ok(Math.abs(r.sw / r.sh - 1.25) < 1e-9); assert.ok(r.sx >= 0 && r.sy >= 0 && r.sx + r.sw <= 2000 + 1e-6 && r.sy + r.sh <= 1000 + 1e-6);
  assert.deepEqual(outSize(5000), { w: 800, h: 640 }); assert.deepEqual(outSize(100), { w: 320, h: 256 }); assert.deepEqual(rescale({ s: 1, x: -10, y: -4 }, 2), { s: 2, x: -20, y: -8 });
});

test('proporciones de foto: solo 5/4, 1/1 y 4/5; lo desconocido cae en 5/4; la salida respeta la proporción', () => {
  assert.deepEqual(Object.keys(ASPECTOS), ['5/4', '1/1', '4/5']);
  assert.equal(aspectoValido('4/5'), '4/5'); assert.equal(aspectoValido(null), '5/4'); assert.equal(aspectoValido('<x>'), '5/4'); assert.equal(aspectoValido('toString'), '5/4');
  assert.equal(ratioDe('1/1'), 1); assert.equal(ratioDe(undefined), 1.25);
  assert.deepEqual(outSize(5000, '4/5'), { w: 800, h: 1000 }); assert.deepEqual(outSize(5000, '1/1'), { w: 800, h: 800 }); assert.deepEqual(outSize(5000), { w: 800, h: 640 });
});

import { nivelValido, cambiarNivel, anchoMinimo, separacion, esDenso, esUltimo, NIVELES } from '../src/js/core/density.js';
import { rankPlayers } from '../src/js/core/ranking.js';
import { leerMedida, fisicoTexto, fisicoPartes, ALTURA } from '../src/js/core/fisico.js';
import { puedeEntrar } from '../src/js/features/ticker.js';
test('zoom: niveles válidos, límites y tamaño', () => {
  assert.equal(nivelValido(99, true), 3); assert.equal(nivelValido(-5, false), 0); assert.equal(nivelValido('x', true), NIVELES.movil.def); assert.equal(nivelValido(null, false), NIVELES.pc.def);
  assert.equal(cambiarNivel(3, 1, true), 3); assert.equal(cambiarNivel(0, -1, false), 0); assert.equal(cambiarNivel(2, 1, false), 3);
  assert.ok(anchoMinimo(7, false) < anchoMinimo(0, false)); assert.equal(esUltimo(7, false), true); assert.equal(esUltimo(0, false), false);
  assert.ok(separacion(7, false) < separacion(0, false)); assert.equal(esDenso(3, true), true); assert.equal(esDenso(0, false), false);
});
test('ranking: promedio de varias stats, mínimo, top y empates', () => {
  const P = [{ nombre: 'A', ovr: 80, men: 90, pot: 60 }, { nombre: 'B', ovr: 85, men: 70, pot: 90 }, { nombre: 'C', ovr: 70, men: 95, pot: 40 }, { nombre: 'D', ovr: 60, men: 70, pot: 90 }];
  assert.deepEqual(rankPlayers(P, ['men']).map((f) => f.p.nombre), ['C', 'A', 'B', 'D']);
  assert.deepEqual(rankPlayers(P, ['men', 'pot']).map((f) => f.p.nombre), ['B', 'D', 'A', 'C']);        // B y D empatan en promedio (80); B gana por media general
  assert.deepEqual(rankPlayers(P, ['men', 'pot']).map((f) => f.rank), [1, 1, 3, 4]);
  assert.deepEqual(rankPlayers(P, ['men', 'pot'], { min: 65 }).map((f) => f.p.nombre), ['B', 'D']);
  assert.equal(rankPlayers(P, ['men'], { top: 2 }).length, 2); assert.deepEqual(rankPlayers(P, []), []);
  assert.equal(rankPlayers([{ nombre: 'X' }], ['men'])[0].score, 0);                                   // stat ausente = 0, sin romper
});
test('físico: medidas opcionales y texto', () => {
  assert.deepEqual(leerMedida('', ALTURA), { valor: null, error: false }); assert.deepEqual(leerMedida(' 182 ', ALTURA), { valor: 182, error: false });
  assert.equal(leerMedida('50', ALTURA).error, true); assert.equal(leerMedida('abc', ALTURA).error, true); assert.equal(leerMedida('180,5', ALTURA).valor, 181);
  assert.equal(fisicoTexto({ altura_cm: 182, peso_kg: 78, pie: 'Izquierdo' }), '182 cm · Pie izq.'); assert.equal(fisicoTexto({}), '');
});
test('ticker: la siguiente noticia entra cuando queda libre el hueco', () => {
  assert.equal(puedeEntrar(undefined, 0, 800, 90), true);
  assert.equal(puedeEntrar(500, 300, 800, 90), false);   // borde derecho 800 + hueco > 800
  assert.equal(puedeEntrar(400, 300, 800, 90), true);    // 790 ≤ 800
});

import { dockDesdeRect, dockAjustado, dockLeer, MARGEN } from '../src/js/core/dock.js';
test('dock: lado más cercano, ajuste a la pantalla y lectura segura', () => {
  assert.deepEqual(dockDesdeRect({ left: 20, right: 120, top: 30, bottom: 66 }, 400, 800), { h: 'l', dx: 20, v: 't', dy: 30 });
  assert.deepEqual(dockDesdeRect({ left: 280, right: 380, top: 700, bottom: 736 }, 400, 800), { h: 'r', dx: 20, v: 'b', dy: 64 });
  const a = dockAjustado({ h: 'l', dx: 900, v: 'b', dy: -50 }, 400, 800, 100, 36);   // se salía por la derecha y por abajo
  assert.equal(a.dx, 400 - 100 - MARGEN); assert.equal(a.dy, MARGEN);
  assert.equal(dockLeer('basura'), null); assert.equal(dockLeer('{"h":"x","dx":1,"dy":1,"v":"t"}'), null); assert.deepEqual(dockLeer('{"h":"r","dx":5,"dy":9,"v":"t"}'), { h: 'r', dx: 5, v: 't', dy: 9 });
});

import { etiquetaJuego } from '../src/js/core/rules.js';
test('etiqueta de juego: PES 21 con parche y SP con versión', () => {
  assert.equal(etiquetaJuego({ juego: 'PES 2021', parche: 'Dream Patch' }), 'PES 21 (Dream Patch)');
  assert.equal(etiquetaJuego({ juego: 'PES 2021' }), 'PES 21');
  assert.equal(etiquetaJuego({ juego: 'SP Football Life', version: '26' }), 'SP Football Life 26');
  assert.equal(etiquetaJuego({ juego: 'SP Football Life' }), 'SP Football Life');
  assert.equal(etiquetaJuego({}), ''); assert.equal(etiquetaJuego({ juego: 'PES 2021', parche: '<b>X</b>' }), 'PES 21 (bX/b)');
  const ev = formatEvento({ tipo: 'reto_aceptado', quien: 'A', rival: 'B', formato: '1v1', juego: 'PES 2021', parche: 'Gogosz Patch' });
  assert.ok(ev.html.includes('1v1 · PES 21 (Gogosz Patch)'));
});
test('físico: piezas para dibujar', () => {
  assert.deepEqual(fisicoPartes({ altura_cm: 180, pie: 'Izquierdo' }).map((x) => [x.k, x.texto]), [['altura', '180 cm'], ['pie', 'Izq.']]); assert.deepEqual(fisicoPartes({}), []);
});

import { cifra, partirPartidos, ordenPodio } from '../src/js/core/central.js';
test('central: cifras del pulso y partidos próximos/resultados', () => {
  assert.equal(cifra(12), '12'); assert.equal(cifra(0), '0'); assert.equal(cifra(null), '—'); assert.equal(cifra(NaN), '—'); assert.equal(cifra(-3), '—');
  const r = partirPartidos([{ gl: '3', gv: '2' }, { gl: '-', gv: '-', nota: 'HOY 22:00' }, { gl: '1', gv: '1' }]);
  assert.equal(r.proximos.length, 1); assert.equal(r.resultados.length, 2); assert.deepEqual(partirPartidos(null), { proximos: [], resultados: [] });
});

test('distribuir media: siempre da exactamente la media pedida, dentro de 1-99', () => {
  let s = 12345; const rnd = () => { s = (s * 1103515245 + 12345) % 2147483648; return s / 2147483648; };
  for (let objetivo = 1; objetivo <= 99; objetivo += 1) {
    for (const inicial of [Array(14).fill(75), Array.from({ length: 14 }, () => 1 + Math.floor(rnd() * 99)), Array(14).fill(99), Array(14).fill(1)]) {
      const r = distribuirMedia(objetivo, inicial);
      assert.equal(r.length, 14); assert.equal(calcOvr(r), objetivo, `objetivo ${objetivo}`); assert.ok(r.every((v) => Number.isInteger(v) && v >= 1 && v <= 99));
    }
  }
});
test('distribuir media: conserva la forma cuando no se topa con los límites', () => {
  const base = [70, 80, 60, 75, 65, 85, 72, 78, 68, 74, 66, 82, 71, 79];
  const r = distribuirMedia(60, base);
  const d0 = base[1] - base[2]; const d1 = r[1] - r[2];
  assert.ok(Math.abs(d0 - d1) <= 1); assert.equal(calcOvr(r), 60); assert.deepEqual(distribuirMedia(50, []), []);
});
test('stats al azar: justifican la media y varían', () => {
  for (const o of [1, 30, 74, 91, 99]) for (let i = 0; i < 20; i += 1) { const r = aleatorias(o); assert.equal(calcOvr(r), o); assert.ok(r.every((v) => v >= 1 && v <= 99)); }
  const a = aleatorias(80); const b = aleatorias(80); assert.notDeepEqual(a, b);
  assert.deepEqual(aleatorias(80, 14, () => 0.5), Array(14).fill(80));        // sin ruido, todas iguales a la media
});

test('central: podio = 2.º izquierda, 1.º centro, 3.º derecha, sin huecos', () => {
  const r = ordenPodio(['a', 'b', 'c', 'd']);
  assert.deepEqual(r.map((x) => x.jugador), ['b', 'a', 'c']);
  assert.deepEqual(r.map((x) => x.puesto), [2, 1, 3]);
  assert.deepEqual(ordenPodio(['a', 'b']).map((x) => x.puesto), [2, 1]);
  assert.deepEqual(ordenPodio(['a']).map((x) => x.puesto), [1]);
  assert.deepEqual(ordenPodio(null), []);
});

import { calcularTabla } from '../src/js/core/tabla.js';
import { FECHAS } from '../src/data/ligaResultados.js';
test('tabla: puntos 3-1-0, desempate por diferencia y goles a favor, y datos inválidos se descartan', () => {
  const { tabla, descartados } = calcularTabla(FECHAS.slice(0, 1).flatMap((f) => f.partidos));   // solo la fecha 1
  assert.equal(descartados.length, 0);
  assert.deepEqual(tabla.map((f) => f.nombre), ['Victor', 'Degox', 'Jeremi', 'Morgado', 'Axel', 'Arens', 'Hugo', 'Jack', 'Roberto', 'Camilo', 'Beto', 'Fralex']);
  assert.deepEqual([tabla[0].pts, tabla[0].dg, tabla[0].gf], [3, 9, 9]);
  const emp = calcularTabla([{ l: 'A', v: 'B', gl: 1, gv: 1 }]);
  assert.deepEqual(emp.tabla.map((f) => f.pts), [1, 1]);
  const malo = calcularTabla([{ l: 'A', v: 'A', gl: 1, gv: 0 }, { l: 'A', v: 'B', gl: -1, gv: 0 }, { l: 'A', v: 'B', gl: 'x', gv: 0 }, null]);
  assert.equal(malo.descartados.length, 4); assert.equal(malo.tabla.length, 0);
});

test('liga: cada fecha cargada tiene 6 partidos y los 12 jugadores aparecen una sola vez; goles de las fechas con total conocido', () => {
  const goles = (f) => f.partidos.reduce((a, m) => a + m.gl + m.gv, 0);
  for (const f of FECHAS) {
    const nombres = f.partidos.flatMap((m) => [m.l, m.v]);
    assert.equal(new Set(nombres).size, nombres.length, `fecha ${f.n}: un jugador repetido`);
    assert.equal(f.partidos.length, 6, `fecha ${f.n}`); assert.equal(new Set(nombres).size, 12, `fecha ${f.n}`);
  }
  // Totales que muestra CopaFácil en «Estadísticas de la fecha»: fecha 4 = 46 goles, 0 empates; fecha 5 = 37 goles, 1 empate.
  assert.equal(goles(FECHAS[3]), 46); assert.equal(goles(FECHAS[4]), 37);
  assert.equal(FECHAS[3].partidos.filter((m) => m.gl === m.gv).length, 0); assert.equal(FECHAS[4].partidos.filter((m) => m.gl === m.gv).length, 1);
});

test('tabla: un partido sin jugar (gl y gv null) no suma ni se descarta; solo se cuenta como pendiente', () => {
  const r = calcularTabla([{ l: 'A', v: 'B', gl: null, gv: null }, { l: 'A', v: 'B', gl: 2, gv: 0 }]);
  assert.equal(r.pendientes, 1); assert.equal(r.descartados.length, 0); assert.equal(r.tabla.find((f) => f.nombre === 'A').pj, 1);
  assert.equal(calcularTabla([{ l: 'A', v: 'B', gl: 1, gv: null }]).descartados.length, 1);   // medio marcador = dato inválido
});

test('tabla: coincide fila por fila con la tabla real de CopaFácil (fechas 1-9 parciales, 4 oct 2026), incluido el desempate por enfrentamiento directo', () => {
  const esperado = [ // nombre, pts, j, g, e, p, gf, gc
    ['Victor', 24, 8, 8, 0, 0, 57, 4], ['Degox', 21, 7, 7, 0, 0, 36, 6], ['Beto', 18, 7, 6, 0, 1, 37, 14], ['Axel', 13, 8, 4, 1, 3, 22, 25],
    ['Roberto', 10, 8, 3, 1, 4, 9, 22], ['Morgado', 9, 7, 3, 0, 4, 14, 14], ['Arens', 9, 8, 3, 0, 5, 17, 27], ['Camilo', 9, 9, 3, 0, 6, 11, 39],
    ['Jeremi', 8, 7, 2, 2, 3, 14, 16], ['Fralex', 6, 8, 2, 0, 6, 20, 33], ['Hugo', 6, 8, 1, 3, 4, 11, 19], ['Jack', 4, 9, 1, 1, 7, 9, 38],
  ];
  const { tabla } = calcularTabla(FECHAS.flatMap((f) => f.partidos));
  assert.deepEqual(tabla.map((f) => [f.nombre, f.pts, f.pj, f.g, f.e, f.p, f.gf, f.gc]), esperado);
});

import { resumenFecha, resumenEdicion, estadoFecha, fechaActual, forma, mayoresGoleadas, ranking } from '../src/js/core/ligaStats.js';
import { EDICIONES } from '../src/data/ligaResultados.js';
test('ligaStats: resúmenes, estado de fecha, forma, goleadas y rankings', () => {
  const fe = EDICIONES.galaxy[0].fechas;
  assert.deepEqual(resumenFecha(fe[3]), { total: 6, jugados: 6, pendientes: 0, empates: 0, goles: 46, promedio: 7.7 });   // CopaFácil: 46 goles, 7.7 de promedio
  assert.deepEqual(resumenFecha(fe[4]), { total: 6, jugados: 6, pendientes: 0, empates: 1, goles: 37, promedio: 6.2 });   // CopaFácil: 37 goles, 6.2
  assert.equal(estadoFecha(fe[0]), 'jugada'); assert.equal(estadoFecha(fe[7]), 'en_juego'); assert.equal(estadoFecha({ partidos: [{ l: 'A', v: 'B', gl: null, gv: null }] }), 'pendiente');
  assert.equal(fechaActual(fe), 8); assert.equal(fechaActual([]), null);
  assert.deepEqual(forma(fe, 'Victor'), ['G', 'G', 'G', 'G', 'G']); assert.deepEqual(forma(fe, 'Hugo'), ['P', 'E', 'E', 'E', 'P']);   // fechas 4 a 8
  assert.deepEqual(forma(fe, 'Hugo', 2), ['E', 'P']);
  const g = mayoresGoleadas(fe, 1)[0]; assert.deepEqual([g.l, g.v, g.gl, g.gv, g.fecha], ['Victor', 'Camilo', 10, 0, 3]);
  const tot = resumenEdicion(fe); assert.equal(tot.jugados + tot.pendientes, tot.total);
  const { tabla } = calcularTabla(fe.flatMap((f) => f.partidos));
  assert.deepEqual(ranking(tabla, 'gf')[0], { nombre: 'Victor', valor: 57 }); assert.deepEqual(ranking(tabla, 'gc', true)[0], { nombre: 'Victor', valor: 4 });
});

import { slugify, slugUnico, partirCuerpo, fechaRelativa, normalizar, validar, ordenar, elegirDestacada, ligasPresentes, filtrar } from '../src/js/core/noticias.js';
import { generarCronica } from '../src/js/core/cronica.js';
test('noticias: slug, párrafos, fecha relativa y validación', () => {
  assert.equal(slugify('¡Auditoría Antifraude: Actas Nº 3!'), 'auditoria-antifraude-actas-n-3'); assert.equal(slugify('###'), 'noticia'); assert.ok(slugify('a'.repeat(200)).length <= 70);
  assert.equal(slugUnico('x', []), 'x'); assert.equal(slugUnico('x', ['x']), 'x-2'); assert.equal(slugUnico('x', ['x', 'x-2']), 'x-3');
  assert.deepEqual(partirCuerpo('uno\n\n  dos \n\n\n tres'), ['uno', 'dos', 'tres']); assert.deepEqual(partirCuerpo(''), []);
  const ahora = new Date(2026, 9, 4, 8, 0);
  assert.equal(fechaRelativa(new Date(2026, 9, 4, 1, 0).toISOString(), ahora), 'Hoy'); assert.equal(fechaRelativa(new Date(2026, 9, 3, 23, 0).toISOString(), ahora), 'Ayer');
  assert.equal(fechaRelativa(new Date(2026, 9, 1, 12, 0).toISOString(), ahora), 'Hace 3 días'); assert.equal(fechaRelativa(new Date(2026, 8, 12, 12, 0).toISOString(), ahora), '12 sep 2026'); assert.equal(fechaRelativa('basura', ahora), '');
  const bien = { titulo: 'Título ok', resumen: 'Resumen ok', cuerpo: 'Texto ok', categoria: 'OFICIAL', tag: '', imagen: 'https://x.com/a.jpg', liga: 'galaxy' };
  assert.equal(validar(bien).ok, true);
  assert.equal(validar({ ...bien, titulo: 'ab' }).ok, false); assert.equal(validar({ ...bien, imagen: 'http://x.com/a.jpg' }).ok, false); assert.equal(validar({ ...bien, categoria: 'X' }).ok, false);
  assert.equal(validar({ ...bien, resumen: 'r'.repeat(401) }).errores.length, 1); assert.equal(validar({ ...bien, liga: 'Mal Id' }).ok, false);
});
test('noticias: orden, destacada, filtros y ligas', () => {
  const mk = (id, extra) => normalizar({ id, slug: `s${id}`, titulo: `T${id} luna`, resumen: 'r', cuerpo: 'a\n\nb', categoria: 'OFICIAL', tag: 'Mercado', publicada_en: `2026-10-0${id}T10:00:00Z`, ...extra });
  const l = ordenar([mk(1), mk(3, { liga: 'otra' }), mk(2, { categoria: 'JORNADA', destacada: true })]);
  assert.deepEqual(l.map((n) => n.id), [3, 2, 1]); assert.equal(elegirDestacada(l).id, 2); assert.equal(elegirDestacada(ordenar([mk(1), mk(3)])).id, 3); assert.equal(elegirDestacada([]), null);
  assert.deepEqual(ligasPresentes(l), ['otra', 'galaxy']); assert.deepEqual(l[0].cuerpo.length, 2);
  assert.deepEqual(filtrar(l, { cat: 'JORNADA' }).map((n) => n.id), [2]); assert.deepEqual(filtrar(l, { liga: 'otra' }).map((n) => n.id), [3]);
  assert.deepEqual(filtrar(l, { term: ' LUNA ' }).length, 3); assert.deepEqual(filtrar(l, { term: 'nada' }), []);
});
test('crónica: borrador de la fecha 8 (victor golea) y casos límite', () => {
  const ed = EDICIONES.galaxy[0]; const c = generarCronica({ fechas: ed.fechas, n: 8, clubes: ed.clubes, nombreLiga: 'Galaxy League', nombreEdicion: 'Apertura 2026' });
  assert.equal(c.titulo, 'Fecha 8: Victor golea a Roberto 9-0'); assert.equal(c.categoria, 'JORNADA'); assert.equal(c.tag, 'Fecha 8');
  assert.match(c.resumen, /4 partidos y 25 goles/); assert.match(c.cuerpo, /Quedan por jugarse de esta fecha: Degox – Jeremi; Beto – Morgado/); assert.match(c.cuerpo, /Victor \(Bayern Múnich\) ante Roberto/);
  assert.equal(validar({ ...c, imagen: '', liga: 'galaxy' }).ok, true);   // lo generado cumple los límites de la base
  assert.equal(generarCronica({ fechas: ed.fechas, n: 99 }), null); assert.equal(generarCronica({ fechas: [{ n: 1, partidos: [{ l: 'A', v: 'B', gl: null, gv: null }] }], n: 1 }), null);
  const empate = generarCronica({ fechas: [{ n: 1, partidos: [{ l: 'A', v: 'B', gl: 1, gv: 1 }] }], n: 1, nombreLiga: 'X' }); assert.match(empate.titulo, /reparto de puntos/);
  const c4 = generarCronica({ fechas: ed.fechas, n: 1 }); assert.equal(c4.titulo, 'Fecha 1: Victor golea a Fralex 9-0');   // fecha 1: sin tabla previa, no hay «cambio de líder»
});

// ---- Perfil público de jugador ----
import { coincide, nombreEnEdicion, campana, contraRivales } from '../src/js/core/perfil.js';
const EDP = { clubes: { Ana: 'Club A' }, fechas: [
  { n: 1, partidos: [{ l: 'Ana', v: 'Beto', gl: 3, gv: 1 }, { l: 'Cris', v: 'Dani', gl: 0, gv: 0 }] },
  { n: 2, partidos: [{ l: 'Beto', v: 'Ana', gl: 2, gv: 2 }, { l: 'Dani', v: 'Cris', gl: null, gv: null }] },
  { n: 3, partidos: [{ l: 'Ana', v: 'Cris', gl: null, gv: null }, { l: 'Beto', v: 'Dani', gl: null, gv: null }] },
] };
test('perfil: coincide por nombre o apodo, sin tildes ni mayúsculas', () => {
  assert.equal(coincide({ nombre: 'Ana' }, 'ANA'), true);
  assert.equal(coincide({ nombre: 'José', apodo: 'Pepe' }, 'pepe'), true);
  assert.equal(coincide({ nombre: 'José' }, 'jose'), true);
  assert.equal(coincide({ nombre: 'Ana' }, 'Beto'), false);
  assert.equal(coincide({}, ''), false);
  assert.equal(nombreEnEdicion({ nombre: 'Cris' }, EDP), 'Cris');
  assert.equal(nombreEnEdicion({ nombre: 'Zed' }, EDP), null);
});
test('perfil: campaña con jugados, próximos, puesto y club', () => {
  const c = campana(EDP, 'Ana');
  assert.deepEqual(c.jugados.map((x) => [x.n, x.rival, x.local, x.gf, x.gc, x.res]), [[1, 'Beto', true, 3, 1, 'G'], [2, 'Beto', false, 2, 2, 'E']]);
  assert.deepEqual(c.proximos, [{ n: 3, rival: 'Cris', local: true }]);
  assert.equal(c.puesto, 1); assert.equal(c.fila.pts, 4); assert.equal(c.club, 'Club A'); assert.equal(c.total, 4);
  assert.equal(campana(EDP, 'Zed'), null); assert.equal(campana(null, 'Ana'), null);
});
test('perfil: contra cada rival', () => {
  assert.deepEqual(contraRivales(campana(EDP, 'Ana').jugados), [{ rival: 'Beto', g: 1, e: 1, p: 0, gf: 5, gc: 3 }]);
});

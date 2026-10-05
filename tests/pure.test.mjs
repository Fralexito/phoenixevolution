import test from 'node:test';
import { normalizarParticipacion, construirIndice, opcionesFiltro, coincidencias, filtrarJugadores, divisionActual, tituloCaso } from '../src/js/core/participaciones.js';
import { validarResultadoCopa, resultadosDesdeFilas, zonasDivision, resolverAscensos, clasificadosCopa, ordenCuadro, construirCopa, ganadorDe, normalizarConfig } from '../src/js/core/temporada.js';
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
import { puedeEntrar, huecoIrregular } from '../src/js/features/ticker.js';
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
  assert.match(c.resumen, /4 partidos y 25 goles/); assert.match(c.cuerpo, /Quedan por jugarse de esta fecha: Degox – Jeremi; Beto – Morgado/); assert.match(c.cuerpo, /Victor \(BAYERN MÚNICH\) ante Roberto/);
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
import { limpiarRed, limpiarRedes, enlaceRed, partirLogros, mesAnio } from '../src/js/core/perfil.js';
test('perfil: redes válidas, enlaces seguros', () => {
  assert.equal(limpiarRed('youtube', '@Fralex'), 'Fralex');
  assert.equal(limpiarRed('youtube', 'https://youtube.com/@x'), 'https://youtube.com/@x');
  assert.equal(limpiarRed('youtube', 'javascript:alert(1)'), '');
  assert.equal(limpiarRed('youtube', 'http://youtube.com/x'), '');
  assert.equal(limpiarRed('discord', 'https://discord.gg/x'), '');     // Discord no tiene enlace
  assert.equal(limpiarRed('kick', 'a b'), ''); assert.equal(limpiarRed('nada', 'x'), '');
  assert.deepEqual(limpiarRedes({ kick: 'fralex', tiktok: '<b>', x: 'y' }), { kick: 'fralex' });
  assert.equal(enlaceRed('kick', 'fralex'), 'https://kick.com/fralex');
  assert.equal(enlaceRed('tiktok', 'fralex'), 'https://www.tiktok.com/@fralex');
  assert.equal(enlaceRed('instagram', 'https://instagram.com/f'), 'https://instagram.com/f');
  assert.equal(enlaceRed('discord', 'fralex'), null);
});
test('perfil: logros y fecha', () => {
  assert.deepEqual(partirLogros('- Campeón 2025\n\n• Goleador  \nTercero'), ['Campeón 2025', 'Goleador', 'Tercero']);
  assert.equal(partirLogros(null).length, 0); assert.equal(partirLogros(Array(30).fill('x').join('\n')).length, 12);
  assert.equal(mesAnio('2024-03-15'), 'marzo de 2024'); assert.equal(mesAnio('basura'), ''); assert.equal(mesAnio('2024-13-01'), '');
});
import { ejesEstilo, arquetipos, fortalezasDebilidades, estiloTexto, mapaCalor, EJES } from '../src/js/core/estilo.js';
import { puntosAcumulados, rendimiento } from '../src/js/core/perfil.js';
const FICHA = (o = {}) => ({ posicion: 'DC', atq: 90, fin: 92, pot: 85, efe: 70, reg: 80, cor: 80, cre: 70, def: 50, pre: 60, pos: 55, ant: 50, pas: 70, rit: 80, men: 85, ...o });
test('estilo: ejes, etiquetas y fortalezas', () => {
  const e = Object.fromEntries(ejesEstilo(FICHA()).map((x) => [x.id, x.valor]));
  assert.equal(e.ataque, 89); assert.equal(e.defensa, 52); assert.equal(e.mentalidad, 85); assert.equal(EJES.length, 6);
  assert.deepEqual(arquetipos(FICHA()), ['Finalizador', 'Mente fría']);
  assert.equal(arquetipos(FICHA(Object.fromEntries(['atq','fin','pot','efe','reg','cor','cre','def','pre','pos','ant','pas','rit','men'].map((k) => [k, 80]))))[0], 'Completo');
  const fd = fortalezasDebilidades(FICHA(), ['atq', 'fin', 'def', 'ant']); assert.equal(fd.fuertes[0].k, 'fin'); assert.equal(fd.flojas[0].v, 50);
  assert.match(estiloTexto(FICHA()), /Ofensivo/); assert.match(estiloTexto(FICHA({ atq: 50, fin: 50, pot: 50, def: 90, pos: 90, ant: 90 })), /Conservador/);
  assert.equal(ejesEstilo({}).every((x) => x.valor === 75), true);                         // ficha vacía → 75, nunca NaN
});
test('mapa de calor: depende de la posición y de las stats; los tercios suman 100', () => {
  const dc = mapaCalor(FICHA()); const dfc = mapaCalor(FICHA({ posicion: 'DFC' })); const po = mapaCalor(FICHA({ posicion: 'PO' }));
  for (const m of [dc, dfc, po]) assert.equal(m.tercios.defensa + m.tercios.medio + m.tercios.ataque, 100);
  assert.ok(dc.tercios.ataque > dfc.tercios.ataque); assert.ok(po.tercios.defensa > 60); assert.ok(dc.tercios.ataque > 55);
  const ofensivo = mapaCalor(FICHA({ posicion: 'MC', atq: 95, fin: 95, pot: 95, def: 40, pos: 40, ant: 40 })); const defensivo = mapaCalor(FICHA({ posicion: 'MC', atq: 40, fin: 40, pot: 40, def: 95, pos: 95, ant: 95 }));
  assert.ok(ofensivo.zonas[0].x > defensivo.zonas[0].x);                                    // mismo puesto, otro estilo → zona distinta
  assert.ok(mapaCalor({ posicion: 'XX' }).zonas.length > 0);                                // posición desconocida → mediocentro
  assert.ok(mapaCalor(FICHA()).zonas.every((z) => z.x >= 4 && z.x <= 96));
});
test('perfil: puntos acumulados y rendimiento', () => {
  assert.deepEqual(puntosAcumulados(EDP, 'Ana'), [{ n: 1, pts: 3 }, { n: 2, pts: 4 }]);
  assert.deepEqual(puntosAcumulados(EDP, 'Cris'), [{ n: 1, pts: 1 }]); assert.deepEqual(puntosAcumulados(null, 'Ana'), []);
  assert.deepEqual(rendimiento({ pj: 4, g: 2, gf: 10, gc: 6, pts: 7 }), { gfPorPartido: 2.5, gcPorPartido: 1.5, victorias: 50, puntos: 58 });
  assert.equal(rendimiento({ pj: 0 }), null); assert.equal(rendimiento(null), null);
});
import { nivelDe, agruparPorNivel, agruparPorEstilo, ejeDominante, statsLiga, ordenar as ordenarJug, mezclar, reconocimientos, semanaActual } from '../src/js/core/destacados.js';
const J = (id, nombre, ovr, extra = {}) => ({ id, nombre, ovr, posicion: 'DC', atq: 75, fin: 75, pot: 75, efe: 75, reg: 75, cor: 75, cre: 75, def: 75, pre: 75, pos: 75, ant: 75, pas: 75, rit: 75, men: 75, ...extra });
const EDR = { fechas: [
  { n: 1, partidos: [{ l: 'Ana', v: 'Beto', gl: 5, gv: 1 }, { l: 'Cris', v: 'Dani', gl: 2, gv: 2 }] },
  { n: 2, partidos: [{ l: 'Beto', v: 'Cris', gl: 0, gv: 1 }, { l: 'Dani', v: 'Ana', gl: 0, gv: 2 }] },
  { n: 3, partidos: [{ l: 'Ana', v: 'Cris', gl: 3, gv: 0 }, { l: 'Beto', v: 'Dani', gl: 1, gv: 0 }] },
  { n: 4, partidos: [{ l: 'Ana', v: 'Dani', gl: null, gv: null }, { l: 'Beto', v: 'Cris', gl: null, gv: null }] },
] };
const JS = [J('1', 'Ana', 90), J('2', 'Beto', 80, { miembro_desde: '2022-01-01' }), J('3', 'Cris', 70, { miembro_desde: '2021-05-01' }), J('4', 'Dani', 76), J('5', 'Eva', 85, { def: 99, pos: 99, ant: 99 })];
test('destacados: niveles y estilos', () => {
  assert.equal(nivelDe(90).id, 'elite'); assert.equal(nivelDe(88).id, 'elite'); assert.equal(nivelDe(87).id, 'estrellas'); assert.equal(nivelDe(77).id, 'titulares'); assert.equal(nivelDe(60).id, 'promesas'); assert.equal(nivelDe(undefined).id, 'promesas');
  assert.deepEqual(agruparPorNivel(JS).map((g) => [g.id, g.jugadores.map((p) => p.nombre)]), [['elite', ['Ana']], ['estrellas', ['Eva']], ['titulares', ['Beto']], ['promesas', ['Dani', 'Cris']]]);
  assert.equal(ejeDominante(JS[4]), 'defensa'); assert.equal(agruparPorEstilo(JS).find((g) => g.id === 'defensa').jugadores[0].nombre, 'Eva');
  assert.equal(agruparPorEstilo(JS).reduce((s, g) => s + g.jugadores.length, 0), JS.length);       // nadie queda fuera
});
test('destacados: ordenar por criterios, datos de liga y mezcla estable', () => {
  const liga = statsLiga(JS, EDR); assert.equal(liga.size, 4);      // Eva no está en la liga
  assert.deepEqual(ordenarJug(JS, 'media').map((p) => p.nombre), ['Ana', 'Eva', 'Beto', 'Dani', 'Cris']);
  assert.deepEqual(ordenarJug(JS, 'az').map((p) => p.nombre), ['Ana', 'Beto', 'Cris', 'Dani', 'Eva']);
  assert.deepEqual(ordenarJug(JS, 'goleador', { liga }).map((p) => p.nombre).slice(0, 2), ['Ana', 'Cris']);
  assert.equal(ordenarJug(JS, 'goleador', { liga }).at(-1).nombre, 'Eva');                              // sin datos → al final
  assert.equal(ordenarJug(JS, 'forma', { liga })[0].nombre, 'Ana');
  assert.deepEqual(ordenarJug(JS, 'antiguedad').map((p) => p.nombre).slice(0, 2), ['Cris', 'Beto']);
  assert.deepEqual(mezclar([1, 2, 3, 4, 5, 6], 7), mezclar([1, 2, 3, 4, 5, 6], 7)); assert.deepEqual([...mezclar([1, 2, 3, 4], 3)].sort(), [1, 2, 3, 4]);
  const antes = JS.map((p) => p.nombre); ordenarJug(JS, 'azar'); assert.deepEqual(JS.map((p) => p.nombre), antes);   // no modifica la lista original
});
test('destacados: reconocimientos y semana', () => {
  const r = reconocimientos(JS, EDR);
  assert.equal(r.fecha.p.nombre, 'Ana'); assert.match(r.fecha.detalle, /3–0 a Cris en la fecha 3/);
  assert.equal(r.forma.p.nombre, 'Ana'); assert.ok(r.revelacion.p);
  assert.deepEqual(reconocimientos(JS, null), { fecha: null, forma: null, revelacion: null }); assert.deepEqual(reconocimientos([], EDR), { fecha: null, forma: null, revelacion: null });
  assert.equal(semanaActual(new Date('2026-10-04T21:00:00Z')), '2026-09-28');       // domingo 4 oct (Lima) → lunes 28 sep
  assert.equal(semanaActual(new Date('2026-10-05T04:30:00Z')), '2026-09-28');       // lunes 5 oct 04:30 UTC = domingo 23:30 en Lima
  assert.equal(semanaActual(new Date('2026-10-05T05:00:00Z')), '2026-10-05');       // lunes 00:00 en Lima
});
import { esCampeon, partirPremios, ordenarHistorial, periodoCorto, medalla, resumenHistorial, validarParticipacion } from '../src/js/core/historial.js';
test('historial: títulos, medallas y resumen', () => {
  assert.equal(esCampeon('Campeón'), true); assert.equal(esCampeon('Campeón de Copa'), true); assert.equal(esCampeon('Subcampeón'), false); assert.equal(esCampeon(null), false);
  assert.equal(medalla({ titulo: 'Campeón' }), 'oro'); assert.equal(medalla({ titulo: 'Subcampeón' }), 'plata'); assert.equal(medalla({ titulo: 'Tercer lugar' }), 'bronce');
  assert.equal(medalla({ puesto: 3 }), 'bronce'); assert.equal(medalla({ puesto: 9 }), null); assert.equal(medalla({ titulo: 'Subcampeón', puesto: 1 }), 'plata');
  const f = [{ titulo: 'Campeón', premios: 'MVP\nGoleador' }, { puesto: 2 }, { puesto: 7 }];
  assert.deepEqual(resumenHistorial(f), { ediciones: 3, titulos: 1, podios: 2, premios: 2 }); assert.deepEqual(resumenHistorial(null), { ediciones: 0, titulos: 0, podios: 0, premios: 0 });
});
test('historial: orden, periodo, premios y validación', () => {
  assert.deepEqual(ordenarHistorial([{ periodo: '2024-01-01', e: 1 }, { periodo: '2025-06-01', e: 2 }, { e: 3 }]).map((x) => x.e), [2, 1, 3]);
  assert.equal(periodoCorto('2025-03-01'), 'mar 2025'); assert.equal(periodoCorto('x'), ''); assert.deepEqual(partirPremios('- MVP\n\n• Goleador'), ['MVP', 'Goleador']);
  const ok = validarParticipacion({ liga: ' Galaxy <b>League', edicion: 'Apertura 2025', periodo: '2025-03', puesto: '2', club: '', titulo: 'Subcampeón', premios: 'MVP' });
  assert.equal(ok.ok, true); assert.equal(ok.fila.liga, 'Galaxy bLeague'); assert.equal(ok.fila.periodo, '2025-03-01'); assert.equal(ok.fila.club, null); assert.equal(ok.fila.puesto, 2);
  assert.equal(validarParticipacion({ liga: '', edicion: '' }).errores.length, 2); assert.equal(validarParticipacion({ liga: 'a', edicion: 'b', puesto: '0' }).ok, false); assert.equal(validarParticipacion({ liga: 'a', edicion: 'b', puesto: '2.5' }).ok, false);
  assert.equal(validarParticipacion({ liga: 'a', edicion: 'b', periodo: 'ayer' }).ok, false);
});

test('temporada: zonas de copa, ascenso y descenso', () => {
  const d1 = ['A', 'B', 'C', 'D', 'E', 'F']; const z1 = zonasDivision(d1, 1, { suben: 2, copa1: 3, copa2: 2 });
  assert.deepEqual(z1.get('A'), ['copa']); assert.deepEqual(z1.get('D'), []); assert.deepEqual(z1.get('F'), ['baja']); assert.deepEqual(z1.get('E'), ['baja']);
  const z2 = zonasDivision(['X', 'Y', 'Z'], 2, { suben: 2, copa1: 3, copa2: 1 }); assert.deepEqual(z2.get('X'), ['copa', 'sube']); assert.deepEqual(z2.get('Y'), ['sube']); assert.deepEqual(z2.get('Z'), []);
  assert.deepEqual(zonasDivision(['A', 'B'], 1, { suben: 9, copa1: 0 }).get('B'), ['baja']);   // máximo la mitad de la tabla
  assert.deepEqual(zonasDivision([], 1, {}).size, 0);
});
test('temporada: ascensos y descensos intercambian el mismo número', () => {
  const r = resolverAscensos(['A', 'B', 'C', 'D', 'E', 'F'], ['X', 'Y', 'Z'], 2);
  assert.equal(r.k, 2); assert.deepEqual(r.suben, ['X', 'Y']); assert.deepEqual(r.bajan, ['E', 'F']); assert.deepEqual(r.div1, ['A', 'B', 'C', 'D', 'X', 'Y']); assert.deepEqual(r.div2, ['E', 'F', 'Z']); assert.equal(r.avisos.length, 0);
  const t = resolverAscensos(['A', 'B', 'C', 'D'], ['X'], 3); assert.equal(t.k, 1); assert.equal(t.avisos.length, 1); assert.equal(t.div1.length + t.div2.length, 5);
  const v = resolverAscensos([], [], 2); assert.equal(v.k, 0); assert.deepEqual(v.div1, []);
  assert.equal(resolverAscensos(['A', 'B'], ['X'], 0).k, 0);
});
test('temporada: clasificados, orden del cuadro y copa con byes', () => {
  assert.deepEqual(ordenCuadro(4), [1, 4, 2, 3]); assert.deepEqual(ordenCuadro(8), [1, 8, 4, 5, 2, 7, 3, 6]);
  const c = clasificadosCopa(['A', 'B', 'C'], ['X', 'Y'], 2, 2); assert.deepEqual(c.map((t) => t.nombre), ['A', 'X', 'B', 'Y']); assert.deepEqual(c.map((t) => t.seed), [1, 2, 3, 4]);
  const k = construirCopa(c); assert.deepEqual(k.rondas.map((r) => r.nombre), ['Semifinales', 'Final']);
  assert.deepEqual([k.rondas[0].partidos[0].a.nombre, k.rondas[0].partidos[0].b.nombre], ['A', 'Y']); assert.deepEqual([k.rondas[0].partidos[1].a.nombre, k.rondas[0].partidos[1].b.nombre], ['X', 'B']); assert.equal(k.campeon, null);
  const j = construirCopa(c, { 'R1-P1': { ga: 3, gb: 1 }, 'R1-P2': { ga: 1, gb: 1, pa: 4, pb: 5 }, 'R2-P1': { ga: 0, gb: 2 } });
  assert.equal(j.rondas[0].partidos[1].ganador.nombre, 'B'); assert.equal(j.rondas[1].partidos[0].a.nombre, 'A'); assert.equal(j.campeon.nombre, 'B');
  const impar = construirCopa(clasificadosCopa(['A', 'B', 'C'], [], 3, 0)); assert.equal(impar.rondas[0].partidos[0].libre, true); assert.equal(impar.rondas[0].partidos[0].ganador.nombre, 'A'); assert.equal(impar.rondas[1].partidos[0].a.nombre, 'A');
  assert.equal(construirCopa(clasificadosCopa(['A'], [], 1, 0)).rondas.length, 0); assert.equal(construirCopa([]).avisos.length, 1);
  assert.equal(ganadorDe({ a: { nombre: 'a' }, b: { nombre: 'b' }, ga: 1, gb: 1 }), null); assert.equal(ganadorDe({ a: null, b: { nombre: 'b' }, ga: 1, gb: 0 }), null);
  const ocho = construirCopa(clasificadosCopa(['A', 'B', 'C', 'D'], ['W', 'X', 'Y', 'Z'], 4, 4)); assert.deepEqual(ocho.rondas.map((r) => r.partidos.length), [4, 2, 1]); assert.equal(ocho.rondas[0].nombre, 'Cuartos de final');
});
test('temporada: la configuración se corrige y se explica', () => {
  const n = normalizarConfig({ suben: 5, copa1: 20, copa2: 20 }, 6, 3); assert.deepEqual(n.cfg, { suben: 3, copa1: 6, copa2: 3 }); assert.equal(n.avisos.length, 1);
  assert.equal(normalizarConfig({ copa1: 1, copa2: 0 }, 6, 3).avisos.length, 1); assert.deepEqual(normalizarConfig({}, 12, 8).cfg, { suben: 2, copa1: 4, copa2: 4 });
});

test('participaciones: se normalizan y deducen torneo y temporada', () => {
  const n = normalizarParticipacion({ jugador_id: 'a', liga: ' Galaxy League ', edicion: 'Apertura 2025', club: 'fc barcelona' });
  assert.equal(n.temporada, '2025'); assert.equal(n.torneo, 'Apertura'); assert.equal(n.club, 'FC BARCELONA'); assert.equal(n.jugadorId, 'a');
  assert.equal(normalizarParticipacion({ edicion: 'Copa', periodo: '2024-03-01' }).temporada, '2024');
  assert.equal(normalizarParticipacion({ edicion: 'X', torneo: 'Clausura', temporada: '2023' }).torneo, 'Clausura'); assert.equal(normalizarParticipacion(null).liga, '');
  assert.equal(tituloCaso('GALAXY LEAGUE'), 'Galaxy League');
});
const JPART = [{ id: '1', nombre: 'Fralex', apodo: null, club: 'FC BARCELONA' }, { id: '2', nombre: 'Axel', apodo: 'Axelito', club: 'REAL MADRID' }, { id: '3', nombre: 'Nuevo', apodo: null, club: 'PSG' }];
const FILASP = [
  { jugador_id: '2', liga: 'Galaxy League', edicion: 'Clausura 2025', club: 'Fc Barcelona', titulo: 'Campeón' },
  { jugador_id: '2', liga: 'Segunda División', edicion: 'Apertura 2024', club: 'PSG' },
  { jugador_id: '9', liga: 'Galaxy League', edicion: 'Apertura 2024', club: 'Inter' },   // jugador que ya no existe: se ignora
];
const LGP = [{ id: 'galaxy', titulo: ['GALAXY', 'LEAGUE'] }];
const EDSP = { galaxy: [{ id: 'a26', nombre: 'Apertura 2026', torneo: 'Apertura', temporada: '2026', clubes: { Fralex: 'FC Barcelona', Axel: 'Real Madrid' }, fechas: [{ n: 1, partidos: [{ l: 'Fralex', v: 'Axel', gl: 1, gv: 0 }] }] }] };
test('participaciones: el índice mezcla base y ediciones, sin duplicar ni perder', () => {
  const idx = construirIndice(JPART, FILASP, LGP, EDSP);
  assert.deepEqual(idx.get('2').map((p) => `${p.temporada}|${p.torneo}|${p.club}|${p.liga}`), ['2026|Apertura|REAL MADRID|Galaxy League', '2025|Clausura|FC BARCELONA|Galaxy League', '2024|Apertura|PSG|Segunda División']);
  assert.equal(idx.get('1').length, 1); assert.equal(idx.get('3').length, 0); assert.equal(idx.has('9'), false);
  const o = opcionesFiltro(idx); assert.deepEqual(o.temporadas, ['2026', '2025', '2024']); assert.deepEqual(o.ligas, ['Galaxy League', 'Segunda División']); assert.deepEqual(o.torneos, ['Apertura', 'Clausura']); assert.ok(o.clubes.includes('PSG'));
  const dup = construirIndice(JPART, [{ jugador_id: '1', liga: 'Galaxy League', edicion: 'Apertura 2026', club: 'Chelsea' }], LGP, EDSP); assert.equal(dup.get('1').length, 1); assert.equal(dup.get('1')[0].club, 'CHELSEA');   // gana la base
});
test('participaciones: filtros por liga, torneo, temporada y club histórico', () => {
  const idx = construirIndice(JPART, FILASP, LGP, EDSP); const nombres = (r) => r.map((x) => x.p.nombre);
  assert.deepEqual(nombres(filtrarJugadores(JPART, idx, {})), ['Fralex', 'Axel', 'Nuevo']);
  assert.deepEqual(nombres(filtrarJugadores(JPART, idx, { temporada: '2024' })), ['Axel']); assert.deepEqual(nombres(filtrarJugadores(JPART, idx, { liga: 'segunda division' })), ['Axel']);
  assert.deepEqual(nombres(filtrarJugadores(JPART, idx, { torneo: 'Apertura', temporada: '2026' })), ['Fralex', 'Axel']); assert.deepEqual(nombres(filtrarJugadores(JPART, idx, { torneo: 'Clausura', temporada: '2026' })), []);
  // Club con historia: Axel jugó con Barcelona en 2025 aunque hoy use Real Madrid → sale con su etiqueta; Fralex también (club actual y 2026).
  const bar = filtrarJugadores(JPART, idx, { club: 'FC BARCELONA' }); assert.deepEqual(nombres(bar), ['Fralex', 'Axel']);
  assert.deepEqual(bar[1].hits.map((h) => `${h.liga}|${h.torneo}|${h.temporada}`), ['Galaxy League|Clausura|2025']);
  assert.deepEqual(nombres(filtrarJugadores(JPART, idx, { club: 'FC BARCELONA', temporada: '2025' })), ['Axel']);   // con temporada, cuenta el club DE ESA temporada
  assert.deepEqual(nombres(filtrarJugadores(JPART, idx, { club: 'PSG' })), ['Axel', 'Nuevo']);                       // Nuevo: club actual sin historial
  assert.deepEqual(nombres(filtrarJugadores(JPART, idx, { term: 'psg' })), ['Axel', 'Nuevo']); assert.deepEqual(nombres(filtrarJugadores(JPART, idx, { term: 'axelito' })), ['Axel']); assert.deepEqual(filtrarJugadores(JPART, idx, { term: 'zzz' }), []);
  assert.equal(coincidencias(idx.get('2'), { club: 'real madrid' }).length, 1); assert.deepEqual(filtrarJugadores([], idx, { club: 'X' }), []);
});
test('participaciones: división actual del jugador', () => {
  const idx = construirIndice(JPART, FILASP, LGP, EDSP); const dv = [{ nivel: 1, liga: 'Galaxy League' }, { nivel: 2, liga: 'Segunda División' }];
  assert.equal(divisionActual(idx.get('2'), dv), 1); assert.equal(divisionActual(idx.get('3'), dv), null);
  assert.equal(divisionActual([{ liga: 'Segunda División' }], dv), 2); assert.equal(divisionActual(undefined, dv), null);
});
test('historial: la participación guarda torneo y temporada válidos', () => {
  const v = validarParticipacion({ liga: 'G', edicion: 'Apertura 2025', torneo: ' Apertura ', temporada: '2025' }); assert.equal(v.ok, true); assert.equal(v.fila.torneo, 'Apertura'); assert.equal(v.fila.temporada, '2025');
  assert.equal(validarParticipacion({ liga: 'G', edicion: 'E', temporada: '25' }).ok, false); assert.equal(validarParticipacion({ liga: 'G', edicion: 'E' }).fila.temporada, null);
});

test('copa: validación de resultados y lectura de filas', () => {
  assert.deepEqual(validarResultadoCopa({ ga: '2', gb: '1' }).fila, { ga: 2, gb: 1, pa: null, pb: null });
  assert.deepEqual(validarResultadoCopa({ ga: '', gb: '' }), { ok: true, errores: [], fila: { ga: null, gb: null, pa: null, pb: null } });
  assert.equal(validarResultadoCopa({ ga: '2' }).ok, false); assert.equal(validarResultadoCopa({ ga: '-1', gb: '0' }).ok, false); assert.equal(validarResultadoCopa({ ga: '1.5', gb: '0' }).ok, false);
  assert.equal(validarResultadoCopa({ ga: '1', gb: '1', pa: '4', pb: '3' }).ok, true); assert.equal(validarResultadoCopa({ ga: '2', gb: '1', pa: '4', pb: '3' }).ok, false);
  assert.equal(validarResultadoCopa({ ga: '1', gb: '1', pa: '3', pb: '3' }).ok, false); assert.equal(validarResultadoCopa({ ga: '1', gb: '1', pa: '3' }).ok, false);
  assert.deepEqual(resultadosDesdeFilas([{ cruce: 'R1-P1', ga: 2, gb: 1, pa: null, pb: null }, { cruce: 'R1-P2', ga: null, gb: null }, null]), { 'R1-P1': { ga: 2, gb: 1 } }); assert.deepEqual(resultadosDesdeFilas(undefined), {});
});

test('zoom: el tamaño predeterminado es el nivel por defecto de cada pantalla', async () => {
  const d = await import('../src/js/core/density.js');
  assert.equal(d.nivelPorDefecto(false), 2); assert.equal(d.nivelPorDefecto(true), 1);
  assert.equal(d.cambiarNivel(d.cambiarNivel(2, 3, false), -3, false), 2); assert.equal(d.nivelValido(d.nivelPorDefecto(false), false), 2);
});

test('ticker: el hueco entre noticias es irregular pero acotado', () => {
  assert.equal(huecoIrregular(90, 0), 45); assert.equal(huecoIrregular(90, 0.5), 135); assert.ok(huecoIrregular(90, 0.999) <= 225); assert.equal(huecoIrregular(90, 5), huecoIrregular(90, 0.999)); assert.equal(huecoIrregular(90, -1), 45);
  assert.notEqual(huecoIrregular(90, 0.1), huecoIrregular(90, 0.8));
});

// ---- ajustes
import { normalizarAjustes, cargarAjustes, guardarAjustes, AJUSTES_DEFECTO, atributosDe, movimientoReducido, factorTicker, opcionesRegion, exportarAjustes, importarAjustes } from '../src/js/core/ajustes.js';
import { SECCIONES } from '../src/data/ajustes.js';
test('ajustes: catálogo coherente (claves únicas, defecto dentro de lo permitido)', () => {
  const l = SECCIONES.flatMap((x) => x.ajustes); assert.equal(new Set(l.map((a) => a.clave)).size, l.length);
  for (const a of l) assert.ok(a.tipo === 'switch' ? typeof a.defecto === 'boolean' : a.opciones.some((o) => o.valor === a.defecto), a.clave);
  assert.deepEqual(normalizarAjustes(AJUSTES_DEFECTO), AJUSTES_DEFECTO);
});
test('ajustes: valores raros vuelven al defecto', () => {
  assert.deepEqual(normalizarAjustes(null), AJUSTES_DEFECTO); assert.deepEqual(normalizarAjustes([1]), AJUSTES_DEFECTO);
  assert.deepEqual(normalizarAjustes({ acento: 'fucsia', vivo: 'x', otro: 1, escala: 500 }), AJUSTES_DEFECTO);
  assert.equal(normalizarAjustes({ acento: 'rojo' }).acento, 'rojo');
});
test('ajustes: guardar/cargar y almacén roto', () => {
  const m = new Map(); const alm = { getItem: (k) => m.get(k) ?? null, setItem: (k, v) => m.set(k, v) };
  assert.equal(guardarAjustes(alm, { vivo: false }), true); assert.equal(cargarAjustes(alm).vivo, false);
  m.set('pes-ajustes-v1', '{corrupto'); assert.deepEqual(cargarAjustes(alm), AJUSTES_DEFECTO);
  assert.equal(guardarAjustes({ setItem() { throw new Error('lleno'); } }, {}), false);
});
test('ajustes: atributos, movimiento, ticker y región', () => {
  const at = atributosDe({ ...AJUSTES_DEFECTO, vivo: false, ligaCompacta: true });
  assert.equal(at['data-aj-vivo'], 'no'); assert.equal(at['data-aj-liga-compacta'], 'si'); assert.equal(at['data-aj-acento'], 'cian');
  assert.equal(movimientoReducido({ movimiento: 'sistema' }, true), true); assert.equal(movimientoReducido({ movimiento: 'normal' }, true), false); assert.equal(movimientoReducido({ movimiento: 'reducido' }, false), true);
  assert.ok(factorTicker('lenta') < 1 && factorTicker('rapida') > 1 && factorTicker('x') === 1);
  assert.deepEqual(opcionesRegion({ hora: '12', zona: 'America/Lima' }), { hour12: true, timeZone: 'America/Lima' }); assert.deepEqual(opcionesRegion({ hora: '24', zona: 'auto' }), { hour12: false });
});
test('ajustes: exportar/importar y archivo inválido', () => {
  const r = importarAjustes(exportarAjustes({ ...AJUSTES_DEFECTO, acento: 'verde' })); assert.equal(r.ok, true); assert.equal(r.ajustes.acento, 'verde');
  assert.equal(importarAjustes('no json').ok, false); assert.equal(importarAjustes('{"a":1}').ok, false);
});
test('horaExacta con zona y 12 h', () => {
  const t = Date.UTC(2026, 0, 1, 23, 30, 5);
  assert.match(horaExacta(t, { timeZone: 'America/Lima' }), /^18:30:05$/); assert.match(horaExacta(t, { hour12: true, timeZone: 'America/Lima' }), /^0?6:30:05/); assert.equal(horaExacta(t, { timeZone: 'Zona/Falsa' }), horaExacta(t));
});

// ---- mis partidos
import { ordenarAgendados, ordenarPartidosJugados, pendientes, rivalesDeDuelos } from '../src/js/core/misPartidos.js';
test('mis partidos: agendados, historial y pendientes', () => {
  const rs = [{ id: 1, estado: 'BUSCANDO' }, { id: 2, estado: 'ACEPTADO', fecha_programada: '2026-10-06T20:00:00Z' }, { id: 3, estado: 'EN_JUEGO' }, { id: 4, estado: 'ACEPTADO', fecha_programada: '2026-10-05T20:00:00Z' },
    { id: 5, estado: 'FINALIZADO', cerrado_at: '2026-10-01T10:00:00Z' }, { id: 6, estado: 'FINALIZADO', cerrado_at: '2026-10-03T10:00:00Z' }, { id: 7, estado: 'CANCELADO' }];
  assert.deepEqual(ordenarAgendados(rs).map((r) => r.id), [3, 4, 2]);      // «ya» primero, luego por fecha
  assert.deepEqual(ordenarPartidosJugados(rs).map((r) => r.id), [6, 5]);          // más reciente primero
  assert.deepEqual(pendientes(rs).map((r) => r.id), [1]);                   // cancelados no aparecen en ningún grupo
});

// ---- central de partidos
import { jornadasCentral, partidoDestacado, visualClub } from '../src/js/core/central.js';
test('central: jornadas, destacado y escudo', () => {
  const F = [{ n: 1, partidos: [{ l: 'A', v: 'B', gl: 1, gv: 0 }] }, { n: 2, partidos: [{ l: 'C', v: 'D', gl: 2, gv: 2 }, { l: 'A', v: 'C', gl: null, gv: null }] }, { n: 3, partidos: [{ l: 'B', v: 'D', gl: null, gv: null }, { l: 'A', v: 'D', gl: null, gv: null }] }];
  const j = jornadasCentral(F);
  assert.deepEqual(j.resultados.map((r) => [r.n, r.partidos.length]), [[2, 1], [1, 1]]);       // las 2 últimas fechas con algo jugado, la más reciente primero, solo lo jugado
  assert.equal(j.proximos.n, 2); assert.deepEqual(j.proximos.partidos.map((m) => m.v), ['C']);   // primera fecha con pendientes
  assert.deepEqual(jornadasCentral([]), { resultados: [], proximos: null }); assert.deepEqual(jornadasCentral(null), { resultados: [], proximos: null });
  const tabla = [{ nombre: 'A' }, { nombre: 'B' }, { nombre: 'C' }, { nombre: 'D' }];
  assert.deepEqual(partidoDestacado(F[2].partidos, tabla), { l: 'A', v: 'D', gl: null, gv: null });   // A(1)+D(4)=5 < B(2)+D(4)=6
  assert.equal(partidoDestacado([], tabla), null);
  assert.equal(visualClub('Club Raro').sigla, 'CLU'); assert.equal(visualClub('Arsenal', { Arsenal: { sigla: 'ARS' } }).sigla, 'ARS');
});

test('rivalesDeDuelos: cuenta partidos terminados contra cada rival (1v1 y equipos)', () => {
  const retos = [
    { id: 1, estado: 'FINALIZADO', retador_id: 'yo', rival_id: 'ana', cerrado_at: '2026-01-01T00:00:00Z' },
    { id: 2, estado: 'FINALIZADO', retador_id: 'luis', rival_id: 'yo', cerrado_at: '2026-02-01T00:00:00Z' },
    { id: 3, estado: 'FINALIZADO', retador_id: 'yo', rival_id: null, cerrado_at: '2026-03-01T00:00:00Z' },
    { id: 4, estado: 'BUSCANDO', retador_id: 'yo', rival_id: 'ana' },
    { id: 5, estado: 'FINALIZADO', retador_id: 'x', rival_id: 'y' },
  ];
  const parts = { 3: [{ usuario_id: 'yo', equipo: 'A' }, { usuario_id: 'ana', equipo: 'B' }, { usuario_id: 'zed', equipo: 'B' }] };
  const r = rivalesDeDuelos(retos, (id) => parts[id] ?? [], 'yo');
  assert.deepEqual(r.map((x) => [x.id, x.partidos]), [['ana', 2], ['zed', 1], ['luis', 1]]);
  assert.equal(r[0].ultimo, '2026-03-01T00:00:00Z');
  assert.deepEqual(rivalesDeDuelos([], () => [], 'yo'), []);
});

import { normalizarRed, relacion, buscarPerfiles, contadores, PRIVACIDAD_DEFECTO } from '../src/js/core/red.js';
test('red: normalizarRed completa datos faltantes y descarta valores inválidos', () => {
  assert.deepEqual(normalizarRed(null).amigos, []);
  assert.deepEqual(normalizarRed(undefined).privacidad, PRIVACIDAD_DEFECTO);
  const r = normalizarRed({ amigos: ['a', 3, null, 'b'], privacidad: { quien_escribe: 'hackeado', ver_amigos: 'todos', mostrar_conexion: false } });
  assert.deepEqual(r.amigos, ['a', 'b']);
  assert.equal(r.privacidad.quien_escribe, 'amigos');   // valor inválido → defecto
  assert.equal(r.privacidad.ver_amigos, 'todos'); assert.equal(r.privacidad.mostrar_conexion, false);
});
test('red: relacion prioriza yo > bloqueado > amigos > enviada > recibida', () => {
  const red = normalizarRed({ amigos: ['a'], enviadas: ['b'], recibidas: ['c'], bloqueados: ['d', 'a'] });
  assert.equal(relacion(red, 'u1', 'u1'), 'yo'); assert.equal(relacion(red, 'a', 'u1'), 'bloqueado');
  assert.equal(relacion(red, 'b', 'u1'), 'enviada'); assert.equal(relacion(red, 'c', 'u1'), 'recibida'); assert.equal(relacion(red, 'z', 'u1'), 'ninguna');
  assert.equal(relacion(normalizarRed({ amigos: ['q'] }), 'q', 'u1'), 'amigos');
});
test('red: buscarPerfiles ignora tildes, excluye a yo y bloqueados, y exige 2 letras', () => {
  const ps = [{ id: '1', nombre_display: 'Titán' }, { id: '2', nombre_display: 'Matías', username: 'titanio' }, { id: '3', nombre_display: 'Neo' }, { id: 'yo', nombre_display: 'Tito' }];
  const red = normalizarRed({ bloqueados: ['3'] });
  assert.deepEqual(buscarPerfiles(ps, 'tit', red, 'yo').map((p) => p.id), ['1', '2']);   // empieza-con primero; «Tito» (yo) fuera
  assert.deepEqual(buscarPerfiles(ps, 't', red, 'yo'), []); assert.deepEqual(buscarPerfiles(ps, 'neo', red, 'yo'), []);
});
test('red: contadores', () => { assert.deepEqual(contadores(normalizarRed({ amigos: ['a'], recibidas: ['b', 'c'] })), { amigos: 1, solicitudes: 2, seguidores: 0, siguiendo: 0, bloqueados: 0 }); });

import { validarTexto, normalizarConversaciones, totalNoLeidos, vistaPrevia, agruparMensajes, etiquetaDia, hoyClave } from '../src/js/core/chat.js';
test('chat: validarTexto recorta, rechaza vacío y > 1000', () => {
  assert.equal(validarTexto('  hola \r\n  ').texto, 'hola'); assert.equal(validarTexto('   ').ok, false); assert.equal(validarTexto(null).ok, false);
  assert.equal(validarTexto('x'.repeat(1000)).ok, true); assert.equal(validarTexto('x'.repeat(1001)).ok, false);
});
test('chat: normalizarConversaciones descarta basura, ordena y cuenta no leídos (sin silenciadas)', () => {
  const l = normalizarConversaciones([null, { id: 'a', tipo: 'DIRECTO', ultimo_at: '2026-01-01T00:00:00Z', no_leidos: 2 }, { id: 'b', tipo: 'GRUPO', nombre: 'G', ultimo_at: '2026-02-01T00:00:00Z', no_leidos: 3, silenciado: true }, { id: 'x', tipo: 'OTRO' }, { tipo: 'GRUPO' }]);
  assert.deepEqual(l.map((c) => c.id), ['b', 'a']); assert.equal(totalNoLeidos(l), 2); assert.deepEqual(normalizarConversaciones(undefined), []);
});
test('chat: vistaPrevia', () => {
  const n = (id) => ({ u1: 'Yo', u2: 'Axel' }[id]);
  assert.equal(vistaPrevia({ tipo: 'DIRECTO', ultimo: null }, 'u1', n), 'Sin mensajes todavía');
  assert.equal(vistaPrevia({ tipo: 'GRUPO', ultimo: { autor: 'u2', texto: 'hola' } }, 'u1', n), 'Axel: hola');
  assert.equal(vistaPrevia({ tipo: 'DIRECTO', ultimo: { autor: 'u1', texto: 'hey' } }, 'u1', n), 'Tú: hey');
  assert.equal(vistaPrevia({ tipo: 'DIRECTO', ultimo: { autor: 'u2', texto: null } }, 'u1', n), 'Mensaje eliminado');
});
test('chat: agruparMensajes junta por autor (<5 min) y separa por día (zona Lima)', () => {
  const m = [{ id: 3, autor_id: 'b', created_at: '2026-10-04T15:10:00Z' }, { id: 1, autor_id: 'a', created_at: '2026-10-04T15:00:00Z' }, { id: 2, autor_id: 'a', created_at: '2026-10-04T15:02:00Z' }, { id: 4, autor_id: 'a', created_at: '2026-10-05T12:00:00Z' }];
  const g = agruparMensajes(m, 'a');
  assert.equal(g.length, 2); assert.deepEqual(g[0].items.map((i) => [i.autor, i.mensajes.length, i.mios]), [['a', 2, true], ['b', 1, false]]);
  assert.equal(agruparMensajes([{ id: 1, autor_id: 'a', created_at: '2026-10-05T03:00:00Z' }], 'a')[0].dia, '2026-10-04');   // 03:00 UTC = 22:00 del día anterior en Lima
});
test('chat: etiquetaDia y hoyClave', () => {
  assert.equal(etiquetaDia('2026-10-04', '2026-10-04'), 'Hoy'); assert.equal(etiquetaDia('2026-10-03', '2026-10-04'), 'Ayer');
  assert.match(etiquetaDia('2026-09-20', '2026-10-04'), /20/); assert.equal(hoyClave('America/Lima', new Date('2026-10-05T03:00:00Z')), '2026-10-04');
});

import { MODOS, modoValido, clampMax, normalizarPartidos, normalizarSalas, accionPara } from '../src/js/core/espectadores.js';
test('espectadores: modos válidos y límites de cupos', () => {
  assert.deepEqual(MODOS.map((m) => m.id), ['APAGADO', 'APROBACION', 'AMIGOS', 'CUALQUIERA']);
  assert.equal(modoValido('HACK'), 'APAGADO'); assert.equal(modoValido('AMIGOS'), 'AMIGOS');
  assert.equal(clampMax(0), 1); assert.equal(clampMax(99), 20); assert.equal(clampMax('x'), 4); assert.equal(clampMax(7.4), 7);
});
test('espectadores: normalizar partidos y salas descarta basura', () => {
  const p = normalizarPartidos([null, { id: 'x' }, { id: 5, modo: 'AMIGOS', max: 3, aprobados: '2', mi_estado: 'APROBADO', jugadores: ['a', 3] }]);
  assert.equal(p.length, 1); assert.deepEqual([p[0].modo, p[0].max, p[0].aprobados, p[0].mi_estado, p[0].jugadores], ['AMIGOS', 3, 2, 'APROBADO', ['a']]);
  assert.deepEqual(normalizarPartidos(undefined), []);
  const s = normalizarSalas([{ id: 1, modo: 'APROBACION', espectadores: [{ usuario_id: 'a', estado: 'PENDIENTE' }, { usuario_id: 'b', estado: 'APROBADO' }, { estado: 'APROBADO' }] }]);
  assert.deepEqual([s[0].pendientes, s[0].aprobados], [['a'], ['b']]);
});
test('espectadores: accionPara decide el botón', () => {
  const base = { modo: 'APROBACION', max: 2, aprobados: 0, mi_estado: null, motivo: '' };
  assert.equal(accionPara({ ...base, mi_estado: 'APROBADO' }).tipo, 'ver'); assert.equal(accionPara({ ...base, mi_estado: 'PENDIENTE' }).tipo, 'pendiente');
  assert.equal(accionPara({ ...base, motivo: 'Inicia sesión para pedir entrar.' }).tipo, 'no'); assert.equal(accionPara({ ...base, aprobados: 2 }).tipo, 'lleno');
  assert.equal(accionPara(base).tipo, 'pedir'); assert.equal(accionPara({ ...base, modo: 'CUALQUIERA' }).tipo, 'entrar');
  assert.equal(accionPara({ ...base, modo: 'AMIGOS' }).activo, true);
});

import { sanitizarExtras, resumenExtra, EXTRAS_JUEGOS } from '../src/js/core/hostExtras.js';
test('hostExtras: solo juegos del catálogo, sin duplicados, sin < >, con límites', () => {
  assert.deepEqual(EXTRAS_JUEGOS.map((j) => j.id), ['eFootball', 'FIFA']);
  assert.deepEqual(sanitizarExtras(null), []); assert.deepEqual(sanitizarExtras('hola'), []);
  const r = sanitizarExtras([{ juego: 'eFootball', version: ' 2025 <b> ', mod: 'x'.repeat(100) }, { juego: 'eFootball', version: 'otra' }, { juego: 'PES 2021' }, { juego: 'FIFA' }, null]);
  assert.equal(r.length, 2); assert.equal(r[0].version, '2025 b'); assert.equal(r[0].mod.length, 60); assert.deepEqual(r[1], { juego: 'FIFA', version: '', mod: '' });
  assert.equal(sanitizarExtras([{ juego: 'FIFA', version: 'x'.repeat(50) }])[0].version.length, 20);
});
test('hostExtras: resumenExtra', () => {
  assert.equal(resumenExtra({ juego: 'FIFA', version: '23', mod: 'Realism' }), 'FIFA 23 · Realism'); assert.equal(resumenExtra({ juego: 'eFootball', version: '', mod: '' }), 'eFootball');
});

test('etiquetaJuego: FIFA / EA FC / eFootball con mod entre paréntesis', async () => {
  const { etiquetaJuego } = await import('../src/js/core/rules.js');
  assert.equal(etiquetaJuego({ juego: 'FIFA', version: '23', parche: 'Realism Mod' }), 'FIFA 23 (Realism Mod)');
  assert.equal(etiquetaJuego({ juego: 'EA FC', version: '27' }), 'EA FC 27');
  assert.equal(etiquetaJuego({ juego: 'eFootball', version: '2027', parche: 'Option File' }), 'eFootball 2027 (Option File)');
});

test('historial en vivo: solo el día actual; al cambiar de día lo anterior desaparece', async () => {
  const { podarHistorialHoy, diaClave } = await import('../src/js/core/live.js');
  const ev = (ts, quien) => ({ tipo: 'radar_on', quien, ts });
  const lunes = new Date(2026, 9, 5, 10, 0, 0).getTime();       // lunes 5 oct 2026, 10:00 local
  const tarde = new Date(2026, 9, 5, 23, 59, 0).getTime();
  const martes = new Date(2026, 9, 6, 0, 1, 0).getTime();
  const h = [ev(lunes, 'A'), ev(tarde, 'B')];
  assert.deepEqual(podarHistorialHoy(h, tarde).map((e) => e.quien), ['B', 'A']);   // mismo día: se ven ambos, el más nuevo primero
  assert.deepEqual(podarHistorialHoy(h, martes), []);                                // pasó la medianoche: se vacía
  assert.deepEqual(podarHistorialHoy([...h, ev(martes, 'C')], martes).map((e) => e.quien), ['C']);
  assert.equal(diaClave(new Date(2026, 9, 5, 12).getTime()).length, 10);   // formato AAAA-MM-DD
  assert.deepEqual(podarHistorialHoy('basura', lunes), []);
});

test('muro: validar texto, enlaces seguros, tiempo relativo y estilo', async () => {
  const { validarTexto, textoAHTML, tiempoRelativo, estiloDe, estiloParaGuardar, usuarioDeURL } = await import('../src/js/core/muro.js');
  assert.equal(validarTexto('   ').ok, false);
  assert.equal(validarTexto('x'.repeat(1001)).ok, false);
  assert.deepEqual(validarTexto('  hola\r\n\r\n\r\n\r\nmundo '), { ok: true, texto: 'hola\n\nmundo', error: '' });
  assert.equal(textoAHTML('<img src=x onerror=a()>'), '&lt;img src=x onerror=a()&gt;');                       // nada de HTML del usuario
  assert.match(textoAHTML('mira https://youtu.be/abc?x=1&y=2.'), /<a href="https:\/\/youtu\.be\/abc\?x=1&amp;y=2" [^>]*>https:\/\/youtu\.be\/abc\?x=1&amp;y=2<\/a>\.$/);
  assert.equal(textoAHTML('javascript:alert(1)'), 'javascript:alert(1)');                                      // sin enlace
  assert.equal(textoAHTML('a\nb'), 'a<br>b');
  const now = 1_000_000_000_000;
  assert.equal(tiempoRelativo(now - 10_000, now), 'ahora');
  assert.equal(tiempoRelativo(now - 5 * 60_000, now), 'hace 5 min');
  assert.equal(tiempoRelativo(now - 3 * 3_600_000, now), 'hace 3 h');
  assert.equal(tiempoRelativo(now - 30 * 3_600_000, now), 'ayer');
  assert.equal(tiempoRelativo('basura', now), '');
  assert.equal(estiloDe({ muro_banner: 'preset:inexistente', muro_acento: 'rojo' }).banner.id, 'nebulosa');
  assert.equal(estiloDe({ muro_banner: 'preset:fuego', muro_acento: '#ff0000', muro_lema: '<b>GG</b>' }).lema, 'bGG/b');
  assert.deepEqual(estiloParaGuardar({ bannerId: 'x', acento: 'y', lema: ' hola ' }), { p_banner: null, p_acento: null, p_lema: 'hola' });
  assert.equal(usuarioDeURL('?u=Fra<lex>_9'), 'fralex_9');
});

test('muro fase 2: respuestas, resumen y reacción local', async () => {
  const { validarRespuesta, resumenReacciones, aplicarReaccion } = await import('../src/js/core/muro.js');
  assert.equal(validarRespuesta(' ').ok, false);
  assert.equal(validarRespuesta('x'.repeat(501)).ok, false);
  assert.equal(validarRespuesta(' GG ').texto, 'GG');
  assert.deepEqual(resumenReacciones({ gg: 2, fuego: 1, basura: 9, risa: 0 }).map((x) => `${x.tipo}:${x.n}`), ['fuego:1', 'gg:2']);   // orden del catálogo, sin desconocidas ni ceros
  assert.deepEqual(resumenReacciones(null), []);
  const it = { id: 1, reacciones: { fuego: 1 }, mia: null };
  const a = aplicarReaccion(it, 'fuego');   // reacciono 🔥
  assert.deepEqual([a.reacciones, a.mia], [{ fuego: 2 }, 'fuego']);
  const b = aplicarReaccion(a, 'gg');       // cambio a GG: baja 🔥, sube GG
  assert.deepEqual([b.reacciones, b.mia], [{ fuego: 1, gg: 1 }, 'gg']);
  const c = aplicarReaccion({ ...b, reacciones: { gg: 1 } }, null);   // la quito: el conteo desaparece
  assert.deepEqual([c.reacciones, c.mia], [{}, null]);
  assert.deepEqual(it, { id: 1, reacciones: { fuego: 1 }, mia: null });   // no muta
});

test('muro fase 3: enlaces de video, rutas de imagen y banner con foto', async () => {
  const { analizarVideo, rutaImagen, rutaDeUrl, estiloDe, estiloParaGuardar } = await import('../src/js/core/muro.js');
  assert.deepEqual([analizarVideo('https://www.youtube.com/watch?v=dQw4w9WgXcQ').proveedor, analizarVideo('https://www.youtube.com/watch?v=dQw4w9WgXcQ').id], ['youtube', 'dQw4w9WgXcQ']);
  assert.equal(analizarVideo('https://youtu.be/dQw4w9WgXcQ?t=5').id, 'dQw4w9WgXcQ');
  assert.equal(analizarVideo('https://www.youtube.com/shorts/dQw4w9WgXcQ').ok, true);
  assert.equal(analizarVideo('https://www.tiktok.com/@user/video/123').proveedor, 'tiktok');
  assert.equal(analizarVideo('https://kick.com/fralex').proveedor, 'kick');
  assert.equal(analizarVideo('https://clips.twitch.tv/AbcDef').proveedor, 'twitch');
  assert.equal(analizarVideo('http://youtu.be/dQw4w9WgXcQ').ok, false);                 // solo https
  assert.equal(analizarVideo('https://evil.com/?u=https://youtu.be/dQw4w9WgXcQ').ok, false);
  assert.equal(analizarVideo('https://youtu.be/dQw4w9WgXcQ"><script>').ok, false);       // sin comillas ni etiquetas
  assert.equal(analizarVideo('').error, '');
  assert.equal(rutaImagen('u-1', 123, 'ab!cd'), 'u-1/123-abcd.jpg');
  assert.equal(rutaDeUrl('https://x.supabase.co/storage/v1/object/public/muro/u-1/123-abcd.jpg'), 'u-1/123-abcd.jpg');
  assert.equal(rutaDeUrl('https://otro.com/foto.jpg'), '');
  assert.equal(estiloDe({ muro_banner: 'https://x.supabase.co/storage/v1/object/public/muro/u/1.jpg' }).foto.startsWith('https://'), true);
  assert.equal(estiloDe({ muro_banner: 'preset:oro' }).foto, '');
  assert.equal(estiloParaGuardar({ bannerId: 'oro', foto: 'https://x/y.jpg', acento: '#00e5ff', lema: '' }).p_banner, 'https://x/y.jpg');   // la foto manda sobre el preset
  assert.equal(estiloParaGuardar({ bannerId: 'oro', foto: '', acento: '#00e5ff', lema: '' }).p_banner, 'preset:oro');
});

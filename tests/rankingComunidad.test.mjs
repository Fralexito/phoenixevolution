import test from 'node:test';
import assert from 'node:assert/strict';
import { mesesDisponibles, mesValido, normalizarCompetitivo, normalizarRetosRank, normalizarMisRetos, diferencia, textoFinSemana } from '../src/js/core/rankingComunidad.js';

test('mesesDisponibles: usa la hora de Lima (el 1.º a las 02:00 UTC aún es el mes anterior) y cruza de año', () => {
  assert.deepEqual(mesesDisponibles(Date.parse('2026-10-15T12:00:00Z'), 3).map((m) => m.valor), ['2026-10-01', '2026-09-01', '2026-08-01']);
  assert.equal(mesesDisponibles(Date.parse('2026-10-01T02:00:00Z'), 1)[0].valor, '2026-09-01');
  assert.deepEqual(mesesDisponibles(Date.parse('2026-01-10T12:00:00Z'), 3).map((m) => m.etiqueta), ['Enero 2026', 'Diciembre 2025', 'Noviembre 2025']);
});
test('mesValido: acepta los de la lista y si no, el actual', () => {
  const ahora = Date.parse('2026-10-15T12:00:00Z');
  assert.equal(mesValido('2026-09-01', ahora), '2026-09-01'); assert.equal(mesValido('2999-01-01', ahora), '2026-10-01'); assert.equal(mesValido(null, ahora), '2026-10-01');
});
test('normalizar filas descarta basura y limpia texto', () => {
  assert.deepEqual(normalizarCompetitivo([null, {}, { usuario_id: 'u', pos: '1', username: 'a<b>', nombre: 'N', puntos: '7', gf: 3, gc: 1 }]).map((r) => [r.pos, r.username, r.puntos, r.gf]), [[1, 'ab', 7, 3]]);
  assert.deepEqual(normalizarRetosRank(undefined), []); assert.equal(normalizarRetosRank([{ usuario_id: 'u', retos: 2, puntos: 50 }])[0].retos, 2);
});
test('normalizarMisRetos: porcentaje acotado y sin lanzar', () => {
  const r = normalizarMisRetos({ puntos_temporada: 50, retos: [{ clave: 'a', titulo: 'T', meta: 3, progreso: 5, puntos: 30, cobrable: true }, { clave: 'b', meta: 0, progreso: -2 }, {}] });
  assert.deepEqual(r.retos.map((x) => [x.progreso, x.pct, x.cobrable]), [[3, 100, true], [0, 0, false]]); assert.equal(r.puntosTemporada, 50);
  assert.deepEqual(normalizarMisRetos(null), { retos: [], puntosTemporada: 0, semanaFin: null });
});
test('diferencia y textoFinSemana', () => {
  assert.deepEqual([diferencia({ gf: 5, gc: 3 }), diferencia({ gf: 1, gc: 1 }), diferencia({ gf: 0, gc: 4 })], ['+2', '0', '-4']);
  const t = Date.parse('2026-10-05T00:00:00Z'); assert.equal(textoFinSemana('2026-10-08T04:00:00Z', t), 'Termina en 3 d 4 h'); assert.equal(textoFinSemana('2026-10-05T05:00:00Z', t), 'Termina en 5 h'); assert.equal(textoFinSemana('2026-10-04T00:00:00Z', t), 'Termina ahora'); assert.equal(textoFinSemana('x', t), '');
});

import { test } from 'node:test';
import assert from 'node:assert/strict';
import { estadoDe, vencidos, sinArbitroProximaFecha, resumen, tareasDeHoy, diaLima, fechaLima } from '../src/js/core/sistema/centroControl.js';

test('centro de control: estado de cada tarjeta', () => {
  assert.equal(estadoDe({ n: 0 }), 'ok');
  assert.equal(estadoDe({ n: 3 }), 'atencion');
  assert.equal(estadoDe({ n: 3, vencidos: 1 }), 'urgente');
  assert.equal(estadoDe({ n: null }), 'sin-dato');
  assert.equal(estadoDe(null), 'sin-dato');
});

test('centro de control: vencidos según el plazo en horas', () => {
  const ahora = new Date('2026-10-19T12:00:00Z');
  const f = ['2026-10-17T11:00:00Z', '2026-10-18T12:00:00Z', null, 'basura'];
  assert.equal(vencidos(f, 48, ahora), 1);   // solo el de hace 49 h
  assert.equal(vencidos(f, 12, ahora), 2);
  assert.equal(vencidos([], 24, ahora), 0);
});

test('centro de control: partidos sin árbitro de la próxima fecha de cada edición', () => {
  const ps = [
    { edicion_id: 'galaxy:1', fecha: 5, estado: 'confirmado', arbitro: null },   // ya jugado: no cuenta
    { edicion_id: 'galaxy:1', fecha: 6, estado: 'pendiente', arbitro: null },
    { edicion_id: 'galaxy:1', fecha: 6, estado: 'pendiente', arbitro: 'u1' },
    { edicion_id: 'galaxy:1', fecha: 7, estado: 'pendiente', arbitro: null },    // fecha siguiente: aún no
    { edicion_id: 'copa:1', fecha: 2, estado: 'pendiente', arbitro: 'u2' },      // completa: no aparece
  ];
  assert.deepEqual(sinArbitroProximaFecha(ps), [{ edicion_id: 'galaxy:1', fecha: 6, faltan: 1 }]);
  assert.deepEqual(sinArbitroProximaFecha([]), []);
});

test('centro de control: resumen de la cabecera', () => {
  assert.equal(resumen(['ok', 'ok']).nivel, 'ok');
  assert.match(resumen(['ok', 'ok']).frase, /Todo en orden/);
  assert.equal(resumen(['ok', 'atencion']).nivel, 'atencion');
  const r = resumen(['urgente', 'atencion', 'ok']);
  assert.equal(r.nivel, 'urgente'); assert.equal(r.urgentes, 1); assert.match(r.frase, /1 cosa pasó su plazo/);
  assert.match(resumen(['sin-dato']).frase, /No se pudo leer/);
  assert.match(resumen([]).frase, /no tiene tareas/);
});

test('centro de control: semana tipo y fecha en Lima', () => {
  assert.equal(diaLima(new Date('2026-10-19T04:00:00Z')), 0);   // 23:00 del domingo en Lima
  assert.equal(diaLima(new Date('2026-10-19T06:00:00Z')), 1);   // 01:00 del lunes en Lima
  assert.equal(fechaLima(new Date('2026-10-19T04:00:00Z')), '2026-10-18');
  assert.ok(tareasDeHoy(2).some((t) => /árbitro/.test(t)));      // martes: asignar árbitros
  assert.ok(tareasDeHoy(0).some((t) => /Copia de seguridad/.test(t)));
  assert.ok(tareasDeHoy(9).length >= 2);                         // día inválido: solo las fijas
});

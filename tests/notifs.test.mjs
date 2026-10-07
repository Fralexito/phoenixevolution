// Pruebas de core/notifs.js (campana: categorías, filtros, grupos por día y tiempo relativo).
import { test } from 'node:test';
import assert from 'node:assert/strict';
import { categoriaDe, filtrar, conteoPorFiltro, grupoTiempo, agruparPorTiempo, haceCuanto, esUrgente, alcanzaDescartar } from '../src/js/core/notifs.js';

const AHORA = new Date('2026-10-07T01:30:00Z');       // 6 oct 20:30 en Lima
const hace = (min) => new Date(AHORA.getTime() - min * 60000).toISOString();

test('categoriaDe = espejo de private.categoria_notif', () => {
  assert.equal(categoriaDe('RETO_DIRECTO'), 'duelos');
  assert.equal(categoriaDe('CLAN'), 'social');
  assert.equal(categoriaDe('SALA_ABIERTA'), 'salas');
  assert.equal(categoriaDe('MODERACION'), 'sistema');
  assert.equal(categoriaDe('DESCONOCIDO'), 'duelos');
});

test('filtrar y conteoPorFiltro', () => {
  const items = [{ tipo: 'RETO_DIRECTO', leida: false }, { tipo: 'MENCION', leida: true }, { tipo: 'LOGRO', leida: false }, { tipo: 'SALA_ABIERTA', leida: false }];
  assert.equal(filtrar(items, 'todas').length, 4);
  assert.equal(filtrar(items, 'no_leidas').length, 3);
  assert.equal(filtrar(items, 'duelos').length, 2);
  assert.equal(filtrar(items, 'social').length, 1);
  assert.equal(filtrar(items, 'inventado').length, 4);
  assert.deepEqual(conteoPorFiltro(items), { todas: 3, no_leidas: 3, duelos: 2, social: 0, otros: 1 });
});

test('grupoTiempo respeta la zona horaria (Lima)', () => {
  assert.equal(grupoTiempo(hace(10), AHORA), 'hoy');
  assert.equal(grupoTiempo('2026-10-06T06:00:00Z', AHORA), 'hoy');       // 6 oct 01:00 en Lima: mismo día aunque en UTC sea «otro»
});

test('grupoTiempo: ayer, semana y antes', () => {
  assert.equal(grupoTiempo('2026-10-06T04:00:00Z', AHORA), 'ayer');      // 5 oct 23:00 en Lima
  assert.equal(grupoTiempo(hace(3 * 1440), AHORA), 'semana');
  assert.equal(grupoTiempo(hace(10 * 1440), AHORA), 'antes');
  assert.equal(grupoTiempo('basura', AHORA), 'antes');
});

test('agruparPorTiempo: orden fijo y sin grupos vacíos', () => {
  const g = agruparPorTiempo([{ created_at: hace(5) }, { created_at: hace(10 * 1440) }, { created_at: hace(6) }], AHORA);
  assert.deepEqual(g.map((x) => [x.grupo, x.items.length]), [['hoy', 2], ['antes', 1]]);
});

test('haceCuanto', () => {
  assert.equal(haceCuanto(hace(0.2), AHORA), 'ahora');
  assert.equal(haceCuanto(hace(5), AHORA), 'hace 5 min');
  assert.equal(haceCuanto(hace(180), AHORA), 'hace 3 h');
  assert.equal(haceCuanto(hace(2 * 1440), AHORA), 'hace 2 d');
  assert.equal(haceCuanto(hace(9 * 1440), AHORA), null);
});

test('esUrgente y alcanzaDescartar', () => {
  assert.equal(esUrgente('RETO_DIRECTO'), true); assert.equal(esUrgente('LOGRO'), false);
  assert.equal(alcanzaDescartar(120, 300), true);           // umbral = 35 % del ancho (105 px)
  assert.equal(alcanzaDescartar(100, 300), false);
  assert.equal(alcanzaDescartar(40, 300, 0.1), false);
  assert.equal(alcanzaDescartar(-40, 300, -0.9), true);
});

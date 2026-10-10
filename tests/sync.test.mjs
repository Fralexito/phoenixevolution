// Pruebas de la lógica pura de la pantalla Phoenix Sync (src/js/core/sync.js).
import { test } from 'node:test';
import assert from 'node:assert/strict';
import { MODOS, ESTADOS, modoSeguro, estadoDe, estadosDeOperacion, hace, lineaHistorial, terminoValido, LEYENDA_MODO, AVISO_AUTOMATICO } from '../src/js/core/sync.js';

test('modoSeguro: cualquier valor raro es «autorizacion»', () => {
  assert.equal(modoSeguro('automatico'), 'automatico');
  for (const x of [undefined, null, '', 'AUTO', 3]) assert.equal(modoSeguro(x), 'autorizacion');
  assert.deepEqual(Object.keys(MODOS).sort(), ['automatico', 'autorizacion']);
});
test('estados: icono, nombre y ayuda en todos; desconocido = pendiente', () => {
  for (const e of Object.values(ESTADOS)) { assert.ok(e.icono && e.nombre && e.ayuda && e.tono); }
  assert.equal(estadoDe('xx').nombre, 'Pendiente');
  for (const k of ['aplicada', 'pendiente', 'conflicto', 'incompatible', 'omitida']) assert.ok(ESTADOS[k], k);
});
test('estadosDeOperacion: un estado por quien aplica; sin fila = pendiente', () => {
  const miembros = [
    { usuario_id: 'a', rol: 'admin', puede_aplicar: true, activo: true },
    { usuario_id: 'b', rol: 'miembro', puede_aplicar: true, activo: true },
    { usuario_id: 'c', rol: 'miembro', puede_aplicar: false, activo: true },
    { usuario_id: 'd', rol: 'miembro', puede_aplicar: true, activo: false },
  ];
  const r = estadosDeOperacion({ id: 'o1' }, [{ op_id: 'o1', usuario_id: 'a', estado: 'aplicada' }, { op_id: 'o2', usuario_id: 'b', estado: 'conflicto' }], miembros);
  assert.deepEqual(r.filas.map((f) => [f.usuario_id, f.estado]), [['a', 'aplicada'], ['b', 'pendiente']]);
  assert.deepEqual(r.conteo, { aplicada: 1, pendiente: 1 });
});
test('hace: tramos', () => {
  const t = Date.parse('2026-10-09T12:00:00Z');
  assert.equal(hace('2026-10-09T11:59:50Z', t), 'hace un momento');
  assert.equal(hace('2026-10-09T11:55:00Z', t), 'hace 5 min');
  assert.equal(hace('2026-10-09T09:00:00Z', t), 'hace 3 h');
  assert.equal(hace('2026-10-06T12:00:00Z', t), 'hace 3 d');
  assert.equal(hace('basura', t), '');
});
test('lineaHistorial y textos de ayuda', () => {
  assert.equal(lineaHistorial({ por: 'a', modo_anterior: 'autorizacion', modo_nuevo: 'automatico' }, { a: 'Ana' }), 'Ana: Con autorización → Automático');
  assert.match(lineaHistorial({ por: 'z', modo_anterior: null, modo_nuevo: 'autorizacion' }), /creó el grupo/);
  assert.match(LEYENDA_MODO, /Automático.*Con autorización/); assert.match(AVISO_AUTOMATICO, /respaldo/);
});
test('terminoValido: pedazos de nombre, con tildes y espacios', () => {
  assert.equal(terminoValido('@juan.perez'), true); assert.equal(terminoValido('Ñandú Gómez'), true); assert.equal(terminoValido('a'), false);
  assert.equal(terminoValido('a,b'), false); assert.equal(terminoValido('x)'), false);
});

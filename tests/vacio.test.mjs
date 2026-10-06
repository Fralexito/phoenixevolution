import test from 'node:test';
import assert from 'node:assert/strict';
import { vacioHTML } from '../src/js/core/vacio.js';

test('vacío: escapa el texto y usa icono por defecto', () => {
  const h = vacioHTML('<img src=x onerror=1>');
  assert.ok(!h.includes('<img'), 'no deja pasar HTML');
  assert.ok(h.includes('fa-ghost'));
  assert.ok(h.includes('role="status"'));
});

test('vacío: icono inválido cae al de por defecto (no inyecta clases)', () => {
  assert.ok(vacioHTML('x', { icono: 'fa-trophy' }).includes('fa-trophy'));
  assert.ok(!vacioHTML('x', { icono: 'x" onclick="1' }).includes('onclick'));
});

test('vacío: botón de acción (enlace o botón) y tono de error', () => {
  const a = vacioHTML('x', { accion: { texto: 'Ir', href: '/liga/' } });
  assert.ok(a.includes('<a ') && a.includes('href="/liga/"'));
  const b = vacioHTML('x', { accion: { texto: 'Reintentar', id: 'rei' } });
  assert.ok(b.includes('<button') && b.includes('id="rei"'));
  const e = vacioHTML('falló', { error: true });
  assert.ok(e.includes('vacio-error') && e.includes('role="alert"') && e.includes('fa-triangle-exclamation'));
});

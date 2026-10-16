import { test } from 'node:test';
import assert from 'node:assert/strict';
import { textoSeguro, contar, mensajeError } from '../src/js/core/bandejaIA.js';

test('bandeja IA: el texto de la IA se muestra seguro (sin HTML inyectado) con párrafos, viñetas y negrita', () => {
  assert.equal(textoSeguro('Hola **mundo**\n\n- uno\n- dos'), '<p>Hola <b>mundo</b></p><ul><li>uno</li><li>dos</li></ul>');
  assert.equal(textoSeguro('<script>alert(1)</script>'), '<p>&lt;script&gt;alert(1)&lt;/script&gt;</p>');
  assert.equal(textoSeguro(''), '');
  assert.equal(textoSeguro('a\nb'), '<p>a<br>b</p>');
});

test('bandeja IA: cuenta solo lo pendiente', () => {
  const c = contar([{ estado: 'pendiente', prioridad: 1, tipo: 'noticia' }, { estado: 'pendiente', prioridad: 2, tipo: 'aviso' }, { estado: 'aprobada', prioridad: 1, tipo: 'noticia' }]);
  assert.deepEqual(c, { total: 2, urgentes: 1, noticias: 1 });
  assert.deepEqual(contar(null), { total: 0, urgentes: 0, noticias: 0 });
});

test('bandeja IA: errores en palabras simples', () => {
  assert.match(mensajeError({ message: 'NO_AUTORIZADO' }), /moderador/);
  assert.match(mensajeError({ message: 'NO_PENDIENTE' }), /ya fue revisada/);
  assert.match(mensajeError({ message: 'Could not find the function public.ia_bandeja' }), /migración 117/);
});

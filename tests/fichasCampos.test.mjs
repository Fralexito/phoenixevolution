import test from 'node:test';
import assert from 'node:assert/strict';
import { CAMPOS, camposDe, construirDatos, textoCambio, mostrarValor, vigentesPlanos, resumenPcs } from '../src/js/core/fichasCampos.js';

test('catálogo: 46 campos, 25 stats y 21 info, claves únicas', () => {
  assert.equal(CAMPOS.length, 46);
  assert.equal(camposDe('stats').length, 25);
  assert.equal(camposDe('info').length, 21);
  assert.equal(new Set(CAMPOS.map((c) => c.clave)).size, 46);
});

test('construirDatos: solo lo rellenado y distinto de lo vigente, con antes', () => {
  const d = construirDatos({ tipo: 'stats', jugador: ' Lamine Yamal ', jugadorId: 162114, valores: { velocidad: '95', finalizacion: 88, regate: '' }, vigentes: { velocidad: 90, finalizacion: 88 } });
  assert.deepEqual(d, { jugador: 'Lamine Yamal', jugador_id: 162114, valores: { velocidad: 95 }, antes: { velocidad: 90 } });
});

test('construirDatos: sin vigente no hay antes (es el de la base); lm opcional', () => {
  const d = construirDatos({ tipo: 'info', jugador: 'Pedri', valores: { pos_dc: 2, altura: 174 }, lmJugadorId: '57' });
  assert.deepEqual(d, { jugador: 'Pedri', valores: { pos_dc: 2, altura: 174 }, lm: { jugador_id: 57 } });
});

test('construirDatos: errores claros', () => {
  assert.throws(() => construirDatos({ tipo: 'stats', jugador: '', valores: { velocidad: 90 } }), /Elige un jugador/);
  assert.throws(() => construirDatos({ tipo: 'stats', jugador: 'X', valores: { velocidad: 100 } }), /entre 40 y 99/);
  assert.throws(() => construirDatos({ tipo: 'stats', jugador: 'X', valores: { velocidad: 90.5 } }), /entero/);
  assert.throws(() => construirDatos({ tipo: 'stats', jugador: 'X', valores: {} }), /No cambiaste/);
  assert.throws(() => construirDatos({ tipo: 'stats', jugador: 'X', valores: { velocidad: 90 }, vigentes: { velocidad: 90 } }), /No cambiaste/);
  assert.throws(() => construirDatos({ tipo: 'stats', jugador: 'Ñ'.repeat(25), valores: { velocidad: 90 } }), /demasiado largo/);
  assert.throws(() => construirDatos({ tipo: 'stats', jugador: 'X', jugadorId: 'abc', valores: { velocidad: 90 } }), /id de PES/);
  assert.throws(() => construirDatos({ tipo: 'otro', jugador: 'X', valores: {} }), /Tipo/);
  // un campo de «info» en un cambio de «stats» no cuenta
  assert.throws(() => construirDatos({ tipo: 'stats', jugador: 'X', valores: { pos_dc: 2 } }), /No cambiaste/);
});

test('textos para el historial', () => {
  assert.equal(mostrarValor('pos_dc', 2), 'A');
  assert.equal(mostrarValor('posicion_registrada', 12), 'DC');
  assert.equal(mostrarValor('velocidad', null), 'el de la base');
  assert.equal(textoCambio({ valores: { velocidad: 95, pos_dc: null }, antes: { velocidad: 90, pos_dc: 2 } }), 'Velocidad 90 → 95 · Posición DC A → el de la base');
  assert.equal(textoCambio({ valores: { altura: 181 } }), 'Altura (cm) → 181');
});

test('vigentes y resumen de PCs', () => {
  const v = { base: { velocidad: { valor: 95 }, pos_dc: { valor: null } }, lm: { altura: { valor: 181 } } };
  assert.deepEqual(vigentesPlanos(v, 'base'), { velocidad: 95, pos_dc: null });
  assert.deepEqual(vigentesPlanos(v, 'ambos'), { velocidad: 95, pos_dc: null });
  assert.deepEqual(vigentesPlanos(v, 'lm'), { altura: 181 });
  assert.deepEqual(resumenPcs([{ resultado: 'aplicado' }, { resultado: 'aplicado' }, { resultado: 'saltado' }]), { aplicado: 2, saltado: 1 });
});

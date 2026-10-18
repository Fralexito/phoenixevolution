import test from 'node:test';
import assert from 'node:assert/strict';
import { eurosDe, textoEuros, destinoLm, datosDinero, datosValor, lmDeFichaje, textoResultado, PARTIDA_RE } from '../src/js/core/pes/ligaMasterPc.js';

const U = '00000000-0000-0000-0000-00000000000b';

test('eurosDe entiende cómo escribe una persona y respeta las reglas del juego', () => {
  assert.equal(eurosDe(''), null);
  assert.equal(eurosDe('25 M'), 25_000_000);
  assert.equal(eurosDe('2,5m'), 2_500_000);
  assert.equal(eurosDe('800k'), 800_000);
  assert.equal(eurosDe('1.500.000'), 1_500_000);
  assert.equal(eurosDe('1.500.000 €'), 1_500_000);
  assert.throws(() => eurosDe('150'), /múltiplos de 100/);
  assert.throws(() => eurosDe('50'), /mínimo/);
  assert.throws(() => eurosDe('50000 M'), /máximo/);
  assert.throws(() => eurosDe('mucho'), /solo números/);
  assert.equal(textoEuros(null), '—');
});

test('destinoLm: la partida exige usuario y formato', () => {
  assert.deepEqual(destinoLm({}), {});
  assert.deepEqual(destinoLm({ usuario: U.toUpperCase(), partida: 'ML0000000B:101' }), { usuario: U, partida: 'ML0000000B:101' });
  assert.throws(() => destinoLm({ partida: 'ML0000000B:101' }), /usuario/);
  assert.throws(() => destinoLm({ usuario: U, partida: 'ranura 1' }), /Partida/);
  assert.throws(() => destinoLm({ usuario: 'pepe' }), /Usuario/);
  assert.ok(PARTIDA_RE.test('MLABCDEF01:7') && !PARTIDA_RE.test('ML0000000B'));
});

test('datosDinero: usuario obligatorio y al menos un importe', () => {
  assert.throws(() => datosDinero({ presupuesto: '10 M' }), /usuario/);
  assert.throws(() => datosDinero({ usuario: U }), /presupuesto/);
  assert.deepEqual(datosDinero({ usuario: U, presupuesto: '250 M' }), { usuario: U, presupuesto: 250_000_000 });
  assert.deepEqual(datosDinero({ usuario: U, tope: '90 M', partida: 'ML0000000B:101' }), { usuario: U, partida: 'ML0000000B:101', tope_salarial: 90_000_000 });
});

test('datosValor: id real de PES (no sintético) y valor', () => {
  assert.throws(() => datosValor({ jugador: 'X', valor: '1 M' }), /id de PES/);
  assert.throws(() => datosValor({ jugador: 'X', jugadorId: 90000001, valor: '1 M' }), /id de PES/);
  assert.throws(() => datosValor({ jugador: 'X', jugadorId: 5 }), /valor/);
  assert.deepEqual(datosValor({ jugador: 'Lamine Yamal', jugadorId: '162114', valor: '180 M' }), { jugador: 'Lamine Yamal', jugador_id: 162114, valor: 180_000_000 });
});

test('lmDeFichaje: vacío = null; con condiciones las valida', () => {
  assert.equal(lmDeFichaje({}), null);
  assert.deepEqual(lmDeFichaje({ usuario: U, monto: '25 M', dorsal: '19', finContrato: '2028-06-30' }), { usuario: U, monto: 25_000_000, fin_contrato: '2028-06-30', dorsal: 19 });
  assert.throws(() => lmDeFichaje({ dorsal: '120' }), /Dorsal/);
  assert.throws(() => lmDeFichaje({ finContrato: '30/06/2028' }), /AAAA-MM-DD/);
});

test('textoResultado resume cada fila del historial', () => {
  const f = textoResultado({ estado: 'aplicado', tipo_lm: 'traspaso', club_nombre: 'Mi Club', partida: 'ML0000000B:101', usuario_nombre: 'Ana',
    cambio: { tipo: 'fichaje', seq: 4, datos: { jugador: 'Lamine Yamal', desde: 'FC Barcelona', hasta: 'Arsenal FC' } } });
  assert.equal(f.que, 'Lamine Yamal: FC Barcelona → Arsenal FC');
  assert.equal(f.estado, 'Aplicado');
  assert.equal(f.partida, 'Mi Club (ML0000000B:101)');
  assert.match(textoResultado({ estado: 'rechazado', tipo_lm: 'dinero', cambio: { tipo: 'dinero', datos: { presupuesto: 1000 } } }).que, /^Dinero: fichajes 1/);
  assert.match(textoResultado({ estado: 'aplicado', tipo_lm: 'deshacer', cambio: { tipo: 'valor', seq: 9, datos: {} } }).que, /Deshacer: valor #9/);
  assert.equal(textoResultado({ estado: 'sin_efecto', cambio: {} }).estado, 'Ya estaba');
});

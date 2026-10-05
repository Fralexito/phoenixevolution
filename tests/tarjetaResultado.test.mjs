import test from 'node:test';
import assert from 'node:assert/strict';
import { datosTarjeta, lineaBando, recortar } from '../src/js/core/tarjetaResultado.js';

test('lineaBando: 1, 2 y varios jugadores; recorta y limpia', () => {
  assert.equal(lineaBando(['Ana']), 'Ana'); assert.equal(lineaBando(['Ana', 'Luis']), 'Ana y Luis'); assert.equal(lineaBando(['A', 'B', 'C', 'D']), 'A, B y 2 más');
  assert.equal(lineaBando([]), '—'); assert.equal(lineaBando(['<b>Hola</b>']), 'bHola/b'); assert.ok(lineaBando(['x'.repeat(60)]).length <= 26);
  assert.equal(recortar('abcdef', 4), 'abc…');
});
test('datosTarjeta: mi bando a la izquierda y veredicto', () => {
  const d = datosTarjeta({ bandoA: ['Ana'], bandoB: ['Luis'], golesA: 1, golesB: 3, miLado: 'B', plataforma: 'Parsec', formato: '1 vs 1', fecha: '5 oct 2026' });
  assert.deepEqual([d.veredicto, d.titulo, d.marcador, d.izquierda.nombre, d.derecha.nombre], ['victoria', 'VICTORIA', '3 - 1', 'Luis', 'Ana']);
  assert.equal(d.detalle, '1 vs 1 · Parsec · 5 oct 2026'); assert.equal(d.archivo, 'resultado-3-1.png');
  assert.equal(datosTarjeta({ bandoA: ['A'], bandoB: ['B'], golesA: 2, golesB: 2, miLado: 'A' }).titulo, 'EMPATE');
  assert.equal(datosTarjeta({ bandoA: ['A'], bandoB: ['B'], golesA: 0, golesB: 2, miLado: 'A' }).veredicto, 'derrota');
});
test('datosTarjeta: sin lado es neutro (orden A–B) y rechaza marcadores inválidos', () => {
  const d = datosTarjeta({ bandoA: ['A'], bandoB: ['B'], golesA: 4, golesB: 0 }); assert.deepEqual([d.veredicto, d.titulo, d.marcador], ['neutro', 'RESULTADO', '4 - 0']);
  assert.equal(datosTarjeta({ golesA: 'x', golesB: 1 }), null); assert.equal(datosTarjeta({ golesA: -1, golesB: 1 }), null); assert.equal(datosTarjeta(), null);
});

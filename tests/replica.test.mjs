import { test } from 'node:test';
import assert from 'node:assert/strict';
import { ANCHO_BASE, ESCALA_MAX, ESCALA_MIN, anchoBase, esIlegible, escalaInicial, rectBase, destino, regreso } from '../src/js/core/replica.js';

test('anchoBase: las cartas angostas se reconstruyen con ancho normal; las normales o grandes se respetan', () => {
  assert.equal(anchoBase(84, true), ANCHO_BASE.movil);      // zoom mínimo en celular
  assert.equal(anchoBase(105, false), ANCHO_BASE.pc);       // zoom mínimo en PC
  assert.equal(anchoBase(105, true), ANCHO_BASE.movil);     // podio en celular
  assert.equal(anchoBase(300, false), 300); assert.equal(anchoBase(200, true), 200);
  for (const malo of [null, undefined, 'x', NaN, -5]) assert.equal(anchoBase(malo, false), ANCHO_BASE.pc, String(malo));
});
test('esIlegible: solo por debajo del ancho base de celular (donde el CSS oculta las stats)', () => {
  assert.equal(esIlegible(105), true); assert.equal(esIlegible(135), true); assert.equal(esIlegible(175), true);
  assert.equal(esIlegible(176), false); assert.equal(esIlegible(248), false);                // el podio de PC (15,5 rem ≈ 248 px) NO abre réplica
  for (const x of [0, null, undefined, 'x', NaN]) assert.equal(esIlegible(x), false);
});
test('escalaInicial: la réplica nace con el tamaño de la carta original (nunca mayor que 1)', () => {
  assert.equal(escalaInicial(88, 176), 0.5); assert.equal(escalaInicial(176, 176), 1); assert.equal(escalaInicial(300, 250), 1);
  assert.equal(escalaInicial(0, 176), 1); assert.equal(escalaInicial(50, 0), 1); assert.equal(escalaInicial(null, null), 1);
});
test('rectBase: queda centrado sobre la carta original', () => {
  assert.deepEqual(rectBase({ left: 100, top: 200, width: 80, height: 120 }, 176, 260), { left: 52, top: 130, width: 176, height: 260 });
  const o = { left: 10, top: 20, width: 100, height: 100 }, b = rectBase(o, 100, 100); assert.deepEqual(b, o);
});
test('destino: escala acotada y centrado en la zona libre', () => {
  const base = { left: 100, top: 300, width: 176, height: 260 };
  const d = destino({ base, vw: 390, vh: 800, barra: 56, movil: true });
  assert.equal(d.s, ESCALA_MAX.movil);                                   // sobra espacio: llega al máximo de celular
  const arriba = 56 + 12, libre = 800 - arriba - 64;
  assert.ok(Math.abs((base.left + base.width / 2 + d.dx) - 195) < 1e-9);           // centro horizontal = vw/2
  assert.ok(Math.abs((base.top + base.height / 2 + d.dy) - (arriba + libre / 2)) < 1e-9);   // centro vertical = centro de la zona libre
  assert.equal(destino({ base: { ...base, left: 400, top: 100, width: 250, height: 330 }, vw: 1280, vh: 900, barra: 64, movil: false }).s, ESCALA_MAX.pc);
});
test('destino: si no cabe se encoge (hasta ESCALA_MIN) y sin espacio devuelve null', () => {
  const base = { left: 0, top: 0, width: 176, height: 600 };
  const d = destino({ base, vw: 390, vh: 560, barra: 56, movil: true });                      // libre = 560-68-64 = 428 → s ≈ 0.70
  assert.ok(d.s < 1 && d.s > ESCALA_MIN, String(d.s));
  assert.equal(destino({ base: { ...base, height: 5000 }, vw: 390, vh: 560, barra: 56, movil: true }).s, ESCALA_MIN);
  assert.equal(destino({ base, vw: 390, vh: 100, barra: 56, movil: true }), null);            // sin zona libre
  for (const b of [null, undefined, { left: 0, top: 0, width: 0, height: 10 }, { left: 0, top: 0, width: 10, height: 0 }]) assert.equal(destino({ base: b, vw: 390, vh: 800, movil: true }), null);
  assert.equal(destino({ base, vw: NaN, vh: 800, barra: 0, movil: false }).s, ESCALA_MIN);   // dato corrupto: no explota
});
test('destino: la barra superior se limita a 160 px', () => {
  const base = { left: 0, top: 0, width: 200, height: 200 };
  assert.deepEqual(destino({ base, vw: 400, vh: 900, barra: 9999, movil: false }), destino({ base, vw: 400, vh: 900, barra: 160, movil: false }));
});
test('regreso: vuelve al centro actual de la carta con la escala de nacimiento', () => {
  const base = { left: 52, top: 130, width: 176, height: 260 }, ahora = { left: 60, top: 150, width: 80, height: 120 };
  assert.deepEqual(regreso(base, ahora, 0.45), { dx: 100 - 140, dy: 210 - 260, k: 0.45 });
  assert.equal(regreso(base, ahora).k, 1);
});

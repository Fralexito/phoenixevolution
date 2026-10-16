import test from 'node:test';
import assert from 'node:assert/strict';
import * as E from '../src/js/core/economia.js';

test('estiloSeguro descarta todo lo que no sea color/texto/icono válido', () => {
  assert.deepEqual(E.estiloSeguro({ color: 'red', color2: '#00ff88', texto: '<b>', icono: 'fa-x"onload', css: 'x' }), { color: null, color2: '#00ff88', texto: null, icono: null });
  assert.deepEqual(E.estiloSeguro(null), { color: null, color2: null, texto: null, icono: null });
});
test('normalizarEconomia calcula el progreso y tolera basura', () => {
  const e = E.normalizarEconomia({ saldo: '120', xp: 75, nivel: 2, xp_nivel: 100, xp_siguiente: 300 });
  assert.equal(e.saldo, 120);
  const f = E.normalizarEconomia({ saldo: 5, xp: 150, nivel: 2, xp_nivel: 100, xp_siguiente: 300 });
  assert.equal(f.progreso, 0.25);
  assert.equal(E.normalizarEconomia(null).nivel, 1);
});
test('normalizarItem y motivoNoComprable', () => {
  const eco = { nivel: 2, saldo: 100 };
  const base = { id: 1, clave: 'a', nombre: 'A', categoria: 'marco', precio: 80, nivel_min: 1, estilo: { color: '#ff0000' } };
  assert.equal(E.motivoNoComprable(E.normalizarItem(base), eco), '');
  assert.equal(E.motivoNoComprable(E.normalizarItem({ ...base, precio: 500 }), eco), 'Ascuas insuficientes');
  assert.equal(E.motivoNoComprable(E.normalizarItem({ ...base, nivel_min: 5 }), eco), 'Nivel 5');
  assert.equal(E.motivoNoComprable(E.normalizarItem({ ...base, tengo: true }), eco), 'Ya lo tienes');
  assert.equal(E.motivoNoComprable(E.normalizarItem({ ...base, agotado: true }), eco), 'Agotado');
  assert.equal(E.motivoNoComprable(E.normalizarItem(base), { nivel: 2, saldo: -5 }), 'Saldo negativo');
  assert.equal(E.normalizarItem({ ...base, categoria: 'raro' }).categoria, 'insignia');
});
test('formatos de precio', () => {
  assert.equal(E.formatoPrecio(500), 'S/ 5.00');
  assert.equal(E.formatoPrecio(1999, 'USD'), '19.99 USD');
  assert.equal(E.formatoPrecio(-4), 'S/ 0.00');
});
test('vistaPrevia escapa y nunca mete CSS libre', () => {
  const i = E.normalizarItem({ id: 1, categoria: 'titulo', estilo: { texto: 'Rey', color: '#00e5ff' } });
  assert.match(E.vistaPrevia(i), /Rey/);
  const mal = E.normalizarItem({ id: 2, categoria: 'marco', estilo: { color: '#ff0000; background:url(x)' } });
  assert.equal(E.estiloMarco(mal.estilo), '');
});
test('normalizarEquipamiento', () => {
  const q = E.normalizarEquipamiento({ marco: { clave: 'm', nombre: 'M', estilo: { color: '#ff6a00' } }, hack: { x: 1 } });
  assert.deepEqual(Object.keys(q), ['marco']);
});
test('normalizarPaquetes y normalizarMovimiento', () => {
  const p = E.normalizarPaquetes({ pagos_activos: true, paquetes: [{ id: 1, nombre: 'P', tokens: 100, precio_centimos: 500, moneda: 'PEN' }] });
  assert.equal(p.pagosActivos, true); assert.equal(p.paquetes[0].precioCentimos, 500);
  assert.equal(E.normalizarPaquetes(null).pagosActivos, false);
  assert.equal(E.normalizarMovimiento({ id: 1, delta: -5, tipo: 'compra_tienda', saldo: 20, cuando: 'x' }).saldoDespues, 20);
  assert.equal(E.textoTipo('zzz'), 'Movimiento');
});
test('validarItemAdmin', () => {
  const ok = E.validarItemAdmin({ clave: 'marco_x', nombre: 'Marco X', categoria: 'marco', precio: 50, color: '#ff0000', color2: '#00ff00' });
  assert.equal(ok.ok, true); assert.deepEqual(ok.valores.estilo, { color: '#ff0000', color2: '#00ff00' }); assert.equal(ok.valores.stock, null);
  assert.equal(E.validarItemAdmin({ clave: 'X', nombre: 'Marco X', categoria: 'marco', precio: 50, color: '#ff0000' }).ok, false);
  assert.equal(E.validarItemAdmin({ clave: 'marco_x', nombre: 'Marco X', categoria: 'marco', precio: -1, color: '#ff0000' }).ok, false);
  assert.equal(E.validarItemAdmin({ clave: 'tit_x', nombre: 'Título X', categoria: 'titulo', precio: 5, texto: '<script>' }).ok, false);
  assert.equal(E.validarItemAdmin({ clave: 'ins_x', nombre: 'Insignia X', categoria: 'insignia', precio: 5, icono: 'crown' }).ok, false);
  assert.equal(E.validarItemAdmin({ clave: 'tit_x', nombre: 'Título X', categoria: 'titulo', precio: 5, texto: 'Rey', stock: '3' }).valores.stock, 3);
});
test('precios por moneda: ascuas y gemas se leen aparte y motivoNoComprable las distingue', () => {
  const eco = { nivel: 2, saldo: 100, gemas: 10 };
  const base = { id: 1, clave: 'a', nombre: 'A', categoria: 'marco', precio: 80, precio_ascuas: 80, precio_gemas: 16, nivel_min: 1, estilo: {} };
  const i = E.normalizarItem(base);
  assert.equal(i.precioAscuas, 80); assert.equal(i.precioGemas, 16);
  assert.equal(E.motivoNoComprable(i, eco, 'ascuas'), '');
  assert.equal(E.motivoNoComprable(i, eco, 'gemas'), 'Gemas insuficientes');
  assert.equal(E.motivoNoComprable(i, { ...eco, gemas: 16 }, 'gemas'), '');
  assert.equal(E.motivoNoComprable(E.normalizarItem({ ...base, precio_ascuas: null }), eco, 'ascuas'), 'Solo con gemas');
  assert.equal(E.motivoNoComprable(E.normalizarItem({ ...base, precio_gemas: null }), eco, 'gemas'), 'Solo con ascuas');
  assert.equal(E.motivoNoComprable(i, { nivel: 2, saldo: 5, gemas: -3 }, 'gemas'), 'Saldo negativo');
  // una base vieja (sin precio_ascuas) sigue funcionando con el precio de siempre
  const viejo = E.normalizarItem({ id: 2, clave: 'b', nombre: 'B', categoria: 'marco', precio: 120, nivel_min: 1 });
  assert.equal(viejo.precioAscuas, 120); assert.equal(viejo.precioGemas, null);
});
test('normalizarMetodos conserva solo datos cortos y tipos conocidos', () => {
  const m = E.normalizarMetodos([{ clave: 'manual_yape', nombre: 'Yape', tipo: 'manual', minimo_centimos: 500, instrucciones: 'Paga', datos: { yape: '999 999 999', '<x>': 'mal', largo: 'a'.repeat(300), obj: { a: 1 } } }, { nombre: 'sin clave' }, null]);
  assert.equal(m.length, 1);
  assert.equal(m[0].tipo, 'manual'); assert.equal(m[0].minimoCentimos, 500);
  assert.deepEqual(Object.keys(m[0].datos).sort(), ['largo', 'yape']);
  assert.equal(m[0].datos.largo.length, 120);
  assert.equal(E.normalizarMetodos({ no: 'lista' }).length, 0);
  assert.equal(E.normalizarMetodos([{ clave: 'x1', tipo: 'inventado' }])[0].tipo, 'manual');
});
test('textoEstadoRecarga explica cada estado de una recarga manual', () => {
  const p = (o) => E.normalizarPagoManual({ orden: 'o', monto_centimos: 1000, gemas: 100, ...o });
  assert.deepEqual(E.textoEstadoRecarga(p({ estado_orden: 'PAGADA', comprobante: 'aprobado' })), { texto: 'Acreditada', tono: 'ok' });
  assert.equal(E.textoEstadoRecarga(p({ estado_orden: 'PENDIENTE', comprobante: 'en_revision' })).tono, 'espera');
  assert.equal(E.textoEstadoRecarga(p({ estado_orden: 'PENDIENTE' })).tono, 'falta');
  assert.equal(E.textoEstadoRecarga(p({ estado_orden: 'EXPIRADA' })).tono, 'mal');
  assert.match(E.textoEstadoRecarga(p({ estado_orden: 'FALLIDA', comprobante: 'rechazado', nota: 'No llegó' })).texto, /No llegó/);
});
test('gemasPorSol y textos nuevos', () => {
  assert.equal(E.gemasPorSol(100, 1000), 10);
  assert.equal(E.gemasPorSol(300, 2700), 11.1);
  assert.equal(E.gemasPorSol(5, 0), 0);
  assert.equal(E.textoTipo('compra_dinero'), 'Compra de gemas');
});

test('resumenMfa: sin factor, con factor y sesión normal, con factor y sesión verificada', () => {
  assert.equal(E.resumenMfa([], 'aal1').estado, 'sin_activar');
  assert.equal(E.resumenMfa(null, undefined).estado, 'sin_activar');
  assert.equal(E.resumenMfa([{ id: 'a', factor_type: 'totp', status: 'unverified' }], 'aal1').estado, 'sin_activar');
  assert.deepEqual(E.resumenMfa([{ id: 'a', factor_type: 'totp', status: 'unverified' }], 'aal1').pendientes, ['a']);
  assert.equal(E.resumenMfa([{ id: 'b', factor_type: 'totp', status: 'verified' }], 'aal1').estado, 'falta_codigo');
  const r = E.resumenMfa([{ id: 'b', factor_type: 'totp', status: 'verified' }], 'aal2');
  assert.equal(r.estado, 'activa'); assert.equal(r.factorId, 'b');
});

test('rarezas y ediciones limitadas: se normalizan y el texto de cuenta atrás es claro', () => {
  const i = E.normalizarItem({ id: 1, clave: 'a', nombre: 'Aaa', categoria: 'marco', rareza: 'legendario', limitada_hasta: '2026-11-30T23:59:59-05:00', precio_gemas: 400, precio_ascuas: null });
  assert.equal(i.rareza, 'legendario'); assert.equal(i.limitadaHasta, '2026-11-30T23:59:59-05:00');
  assert.equal(E.normalizarItem({ id: 2, clave: 'b', nombre: 'Bbb', rareza: 'inventada' }).rareza, 'comun');
  const t0 = Date.parse('2026-11-01T12:00:00Z');
  assert.equal(E.textoLimitada('2026-11-01T12:00:00Z', t0), 'Terminó');
  assert.equal(E.textoLimitada('2026-11-01T12:30:00Z', t0), 'Termina en menos de 1 hora');
  assert.equal(E.textoLimitada('2026-11-01T17:00:00Z', t0), 'Termina en 5 horas');
  assert.equal(E.textoLimitada('2026-11-02T12:00:00Z', t0), 'Termina mañana');
  assert.equal(E.textoLimitada('2026-11-05T10:00:00Z', t0), 'Termina en 4 días');
  assert.equal(E.textoLimitada('no-es-fecha', t0), '');
});

test('paquetes: bono de primera compra', () => {
  const p = E.normalizarPaquetes({ pagos_activos: false, bono_primera_pct: 50, bono_disponible: true, paquetes: [{ id: 1, nombre: 'Chispa', tokens: 50, precio_centimos: 500, moneda: 'PEN' }] });
  assert.equal(p.bonoPct, 50); assert.equal(p.bonoDisponible, true); assert.equal(p.paquetes.length, 1);
  assert.equal(E.normalizarPaquetes({}).bonoDisponible, false);
  assert.equal(E.textoTipo('bono_primera_compra'), 'Bono de primera compra');
});

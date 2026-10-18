import test from 'node:test';
import assert from 'node:assert/strict';
import * as P from '../src/js/core/economia/phoenix-pass.js';

const crudo = (extra = {}) => ({
  temporada: { id: 't1', clave: 'despegue', nombre: 'Temporada 1', inicia: '2026-10-17T05:00:00Z', termina: '2026-12-16T05:00:00Z', niveles: 4, xp_por_nivel: 100, precio_gemas: 150, en_gracia: false, gracia_dias: 7 },
  recompensas: [
    { nivel: 1, pista: 'gratis', tipo: 'ascuas', cantidad: 40, item: null, reclamada: false },
    { nivel: 1, pista: 'premium', tipo: 'ascuas', cantidad: 60, item: null, reclamada: false },
    { nivel: 2, pista: 'gratis', tipo: 'ascuas', cantidad: 40, item: null, reclamada: true },
    { nivel: 3, pista: 'premium', tipo: 'gemas', cantidad: 10, item: null, reclamada: false },
    { nivel: 4, pista: 'premium', tipo: 'item', cantidad: null, item: { id: 9, clave: 'marco_x', nombre: 'Marco X', categoria: 'marco', rareza: 'legendario', estilo: { color: '#ffc828', color2: 'rojo' } }, reclamada: false },
  ],
  yo: { xp: 250, nivel: 2, xp_en_nivel: 50, tengo_premium: false },
  proxima: null,
  ...extra,
});

test('normalizarPase arma una fila por nivel con las dos pistas', () => {
  const p = P.normalizarPase(crudo());
  assert.equal(p.activo, true);
  assert.equal(p.niveles.length, 4);
  assert.equal(p.niveles[0].gratis.cantidad, 40);
  assert.equal(p.niveles[0].premium.cantidad, 60);
  assert.equal(p.niveles[1].premium, null);
  assert.equal(p.yo.progreso, 0.5);
  assert.equal(p.yo.xpFaltante, 50);
});

test('normalizarPase sin temporada o con basura devuelve «inactivo» sin romper', () => {
  assert.equal(P.normalizarPase(null).activo, false);
  assert.equal(P.normalizarPase({ temporada: null, proxima: { nombre: 'T2', inicia: '2027-01-01' } }).proxima.nombre, 'T2');
  assert.equal(P.normalizarPase('x').niveles.length, 0);
});

test('el estilo del objeto se sanea (un color inválido se descarta) y la rareza desconocida pasa a común', () => {
  const p = P.normalizarPase(crudo());
  assert.equal(p.niveles[3].premium.item.estilo.color, '#ffc828');
  assert.equal(p.niveles[3].premium.item.estilo.color2, null);
  const q = P.normalizarPremio({ tipo: 'item', item: { id: 1, nombre: 'A', rareza: 'mitico', estilo: {} } });
  assert.equal(q.item.rareza, 'comun');
});

test('un premio de objeto sin objeto, o de tipo raro, se descarta', () => {
  assert.equal(P.normalizarPremio({ tipo: 'item', item: null }), null);
  assert.equal(P.normalizarPremio({ tipo: 'dinero', cantidad: 5 }), null);
  assert.equal(P.normalizarPremio(undefined), null);
});

test('niveles y premios fuera de rango se ignoran', () => {
  const p = P.normalizarPase(crudo({ recompensas: [{ nivel: 99, pista: 'gratis', tipo: 'ascuas', cantidad: 5 }, { nivel: 1, pista: 'vip', tipo: 'ascuas', cantidad: 5 }] }));
  assert.ok(p.niveles.every((f) => f.gratis === null && f.premium === null));
});

test('estadoPremio: reclamada, bloqueado, requiere premium y reclamable', () => {
  const p = P.normalizarPase(crudo());
  const [f1, f2, f3] = p.niveles;
  assert.equal(P.estadoPremio(f2, 'gratis', p.yo), 'reclamada');
  assert.equal(P.estadoPremio(f1, 'gratis', p.yo), 'reclamable');
  assert.equal(P.estadoPremio(f1, 'premium', p.yo), 'requiere_premium');
  assert.equal(P.estadoPremio(f3, 'premium', p.yo), 'bloqueado');
  assert.equal(P.estadoPremio(f2, 'premium', p.yo), 'vacio');
  assert.equal(P.estadoPremio(f1, 'gratis', null), 'bloqueado');
  assert.equal(P.estadoPremio(f1, 'premium', { ...p.yo, tengoPremium: true }), 'reclamable');
});

test('reclamablesYa cuenta lo que se puede cobrar hoy', () => {
  const p = P.normalizarPase(crudo());
  assert.equal(P.reclamablesYa(p.niveles, p.yo), 1);
  assert.equal(P.reclamablesYa(p.niveles, { ...p.yo, tengoPremium: true }), 2);
  assert.equal(P.reclamablesYa(p.niveles, null), 0);
});

test('resumenPase suma ascuas, gemas y objetos por pista', () => {
  const r = P.resumenPase(P.normalizarPase(crudo()).niveles);
  assert.deepEqual(r.gratis, { ascuas: 80, gemas: 0, objetos: 0 });
  assert.deepEqual(r.premium, { ascuas: 60, gemas: 10, objetos: 1 });
});

test('costeNeto nunca baja de 0 y solesAprox es orientativo', () => {
  assert.equal(P.costeNeto(150, 60), 90);
  assert.equal(P.costeNeto(50, 80), 0);
  assert.equal(P.solesAprox(150), 13.6);
  assert.equal(P.solesAprox(0), 0);
});

test('textoPremio', () => {
  assert.equal(P.textoPremio({ tipo: 'gemas', cantidad: 10 }), '+10 gemas');
  assert.equal(P.textoPremio({ tipo: 'ascuas', cantidad: 40 }), '+40 ascuas');
  assert.equal(P.textoPremio({ tipo: 'item', item: { nombre: 'Marco X' } }), 'Marco X');
  assert.equal(P.textoPremio(null), '—');
});

test('textoTiempo: quedan días, hoy, gracia y terminado', () => {
  const t = { termina: '2026-12-16T05:00:00Z', graciaDias: 7 };
  const base = Date.parse('2026-12-16T05:00:00Z');
  assert.equal(P.textoTiempo(t, base - 12 * 3600e3), 'Termina hoy');
  assert.equal(P.textoTiempo(t, base - 30 * 3600e3), 'Termina mañana');
  assert.equal(P.textoTiempo(t, base - 10 * 86400e3), 'Quedan 10 días');
  assert.equal(P.textoTiempo(t, base + 2 * 86400e3), 'Terminó: te quedan 5 días para reclamar');
  assert.equal(P.textoTiempo(t, base + 9 * 86400e3), 'Terminó');
  assert.equal(P.textoTiempo(null), '');
});

test('normalizarTorneoPremium', () => {
  assert.equal(P.normalizarTorneoPremium({ existe: false }), null);
  assert.deepEqual(P.normalizarTorneoPremium({ existe: true, premium: false, precio_gemas: 300, puede: true, motivo: null }), { premium: false, precioGemas: 300, puede: true, motivo: '' });
  assert.equal(P.normalizarTorneoPremium({ existe: true, premium: true, puede: false, motivo: 'Este torneo ya es premium.' }).premium, true);
});

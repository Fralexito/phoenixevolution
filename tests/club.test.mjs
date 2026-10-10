import test from 'node:test';
import assert from 'node:assert/strict';
import { pasosClub, porcentajeClub, siguienteClub, faltanClub, miLigaClub, tituloClub } from '../src/js/core/club.js';

test('pasosClub: cuenta nueva tiene 1 de 5 hecho (la cuenta) y el siguiente es el perfil', () => {
  const p = pasosClub({});
  assert.equal(p.length, 5);
  assert.equal(p[0].hecho, true);
  assert.equal(porcentajeClub(p), 20);
  assert.equal(siguienteClub(p).id, 'perfil');
  assert.equal(faltanClub(p), 4);
});
test('pasosClub: perfil completo exige apodo/país Y foto', () => {
  assert.equal(pasosClub({ perfilCompleto: true }).find((x) => x.id === 'perfil').hecho, false);
  assert.equal(pasosClub({ perfilCompleto: true, avatar: true }).find((x) => x.id === 'perfil').hecho, true);
});
test('pasosClub: todo hecho = 100 % y sin siguiente', () => {
  const p = pasosClub({ perfilCompleto: true, avatar: true, ficha: true, pc: true, jugo: true });
  assert.equal(porcentajeClub(p), 100); assert.equal(siguienteClub(p), null); assert.equal(faltanClub(p), 0);
});
test('porcentajeClub tolera basura', () => { assert.equal(porcentajeClub(null), 0); assert.equal(porcentajeClub([]), 0); });

const ed = { id: 'e1', estado: 'en_curso', clubes: { Ana: 'Boca', Beto: 'River', Caro: 'Inter' }, fechas: [
  { n: 1, partidos: [{ l: 'Ana', v: 'Beto', gl: 2, gv: 1 }] },
  { n: 2, partidos: [{ l: 'Caro', v: 'Ana' }] },
] };
test('miLigaClub: encuentra mi campaña por nombre visible y el próximo partido', () => {
  const m = miLigaClub([ed], 'ana');
  assert.ok(m); assert.equal(m.nombre, 'Ana'); assert.equal(m.puesto, 1); assert.equal(m.jugados, 1);
  assert.deepEqual(m.proximo, { n: 2, rival: 'Caro', local: false }); assert.equal(m.club, 'Boca');
});
test('miLigaClub: null si no juego o sin datos', () => {
  assert.equal(miLigaClub([ed], 'Zoe'), null); assert.equal(miLigaClub([], 'Ana'), null); assert.equal(miLigaClub([ed], ''), null);
});
test('tituloClub cambia según lo que falte', () => {
  assert.equal(tituloClub({ faltan: 3 }).a, 'Te faltan 3 pasos');
  assert.equal(tituloClub({ faltan: 1 }).b, 'para estar listo');
  assert.equal(tituloClub({ faltan: 0, proximo: { rival: 'Caro' } }).b, 'es contra Caro');
  assert.equal(tituloClub({}).a, 'Todo listo');
});

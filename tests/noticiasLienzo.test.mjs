import { test } from 'node:test'; import assert from 'node:assert/strict';
import { PROPUESTAS, diagnosticar, arreglar, huecos } from '../src/js/core/noticiasLienzo.js';
const items = Array.from({ length: 7 }, (_, i) => ({ id: String(i), joda: i > 4, imagen: true, titulo: `N${i}` }));
const info = new Map(items.map((i) => [i.id, i]));
const choca = (a, b) => a.x < b.x + b.w && b.x < a.x + a.w && a.y < b.y + b.h && b.y < a.y + a.h;
test('propuestas: colocan todas sin solaparse y dentro de 12 columnas', () => {
  for (const p of PROPUESTAS) { const n = p.armar(items);
    assert.equal(n.length, items.length, p.id);
    n.forEach((a, i) => { assert.ok(a.x >= 0 && a.x + a.w <= 12, p.id); n.slice(i + 1).forEach((b) => assert.ok(!choca(a, b), `${p.id} ${a.id}/${b.id}`)); }); }
});
test('corrector: detecta huecos y compactar los elimina', () => {
  const n = [{ id: '0', x: 0, y: 0, w: 4, h: 4 }, { id: '1', x: 0, y: 10, w: 4, h: 4 }];
  assert.ok(diagnosticar(n, info).some((d) => d.arreglo === 'compactar'));
  assert.equal(huecos(arreglar(n, 'compactar')), 0);
});
test('corrector: tarjeta diminuta → agrandar sin solapar', () => {
  const n = [{ id: '0', x: 0, y: 0, w: 2, h: 2 }, { id: '1', x: 2, y: 0, w: 4, h: 4 }];
  const d = diagnosticar(n, info).find((x) => x.arreglo === 'agrandar'); assert.ok(d);
  const r = arreglar(n, 'agrandar', { id: d.id }); assert.ok(!choca(r[0], r[1]));
});
test('corrector: portada de joda → subirSerio la cambia', () => {
  const n = [{ id: '6', x: 0, y: 0, w: 12, h: 6 }, { id: '0', x: 0, y: 6, w: 4, h: 4 }];
  const r = arreglar(n, 'subirSerio', { info }); assert.equal(r.find((x) => x.id === '0').y, 0);
});
test('propuestas: salen limpias en el corrector (sin errores graves)', () => {
  for (const p of PROPUESTAS) assert.ok(!diagnosticar(arreglar(p.armar(items), 'compactar'), info).some((d) => d.nivel === 'mal'), p.id);
});
import { arreglarTodo } from '../src/js/core/noticiasLienzo.js';
test('arreglarTodo deja el caso feo sin errores graves', () => {
  const feo = [{ id: '1', x: 0, y: 12, w: 2, h: 2 }, ...['6', '5', '4', '3', '2', '0'].map((id, i) => ({ id, x: 0, y: 14 + i * 4, w: 4, h: 4 }))];
  const r = arreglarTodo(feo, info);
  assert.equal(diagnosticar(r, info).length, 0, JSON.stringify(diagnosticar(r, info)));
});

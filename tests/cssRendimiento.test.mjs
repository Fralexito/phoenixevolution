// Reglas de CSS que hunden la velocidad de TODA la web (medido el 19-oct-2026 con trazas del navegador).
// «html:has(…)» / «body:has(…)» (o «html[…]:has(…)») obligan al navegador a recalcular el estilo de la página entera
// con cualquier cambio del DOM: Inicio lo hacía ~15 veces al cargar. En su lugar, el JS pone una marca en <html>
// (p. ej. data-ticker-oculto) y el CSS usa esa marca.
import { test } from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import path from 'node:path';

const recorrer = (d, out = []) => {
  for (const e of fs.readdirSync(d, { withFileTypes: true })) {
    const p = path.join(d, e.name);
    if (e.isDirectory()) recorrer(p, out); else if (/\.(css|astro)$/.test(e.name)) out.push(p);
  }
  return out;
};

test('ningún CSS usa :has() sobre html, body o :root', () => {
  const malos = [];
  for (const f of recorrer('src')) {
    fs.readFileSync(f, 'utf8').split('\n').forEach((l, i) => {
      if (/(^|[\s,}>])(html|body|:root)(\[[^\]]*\]|\.[\w-]+|:not\([^)]*\))*:has\(/.test(l)) malos.push(`${f}:${i + 1}`);
    });
  }
  assert.deepEqual(malos, [], `Usa una marca en <html> puesta desde el JS en vez de :has() en html/body:\n${malos.join('\n')}`);
});

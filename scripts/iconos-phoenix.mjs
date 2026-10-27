// Genera src/styles/iconos/phoenix.css a partir de src/data/iconosPhoenix.js (una máscara SVG por icono).
// Uso: node scripts/iconos-phoenix.mjs   ·   El icono toma el color del texto (currentColor) y mide 1em.
import fs from 'node:fs';
import { ICONOS } from '../src/data/iconosPhoenix.js';
const svg = (cuerpo) => `<svg xmlns='http://www.w3.org/2000/svg' viewBox='0 0 24 24' fill='none' stroke='black' stroke-width='2' stroke-linecap='square' stroke-linejoin='miter'>${cuerpo.replace(/"/g, "'")}</svg>`;
const url = (cuerpo) => `url("data:image/svg+xml,${encodeURIComponent(svg(cuerpo)).replace(/'/g, '%27')}")`;
let css = `/* GENERADO por scripts/iconos-phoenix.mjs desde src/data/iconosPhoenix.js. No editar a mano. */
.pxi { display: inline-block; width: 1em; height: 1em; flex-shrink: 0; vertical-align: -0.125em; background-color: currentColor;
  -webkit-mask: var(--pxi) center / contain no-repeat; mask: var(--pxi) center / contain no-repeat; }
.pxi::before { content: none !important; }
`;
for (const [n, c] of Object.entries(ICONOS)) css += `.pxi-${n} { --pxi: ${url(c)}; }\n`;
fs.writeFileSync(new URL('../src/styles/iconos/phoenix.css', import.meta.url), css);
console.log(`${Object.keys(ICONOS).length} iconos → src/styles/iconos/phoenix.css`);

import { test } from 'node:test';
import assert from 'node:assert/strict';
import postcss from 'postcss';
import movimientoSegunAjustes, { tipoMedia, conCondicion } from '../tools/movimiento-postcss.mjs';

const C = "[data-aj-mov-efectivo='reducido']";

test('movimiento: reconoce solo las preguntas de movimiento exactas', () => {
  assert.equal(tipoMedia('(prefers-reduced-motion: reduce)'), 'reduce');
  assert.equal(tipoMedia(' ( prefers-reduced-motion:no-preference ) '), 'no-preference');
  assert.equal(tipoMedia('(max-width: 640px)'), null);
});

test('movimiento: antepone la condición respetando html, :root, .js y ::view-transition', () => {
  assert.equal(conCondicion('.vt-item', 'reduce'), `:root${C} .vt-item`);
  assert.equal(conCondicion('html[data-fx-3d] main', 'reduce'), `html${C}[data-fx-3d] main`);
  assert.equal(conCondicion(':root[data-fx-3d]::view-transition-old(root)', 'reduce'), `:root${C}[data-fx-3d]::view-transition-old(root)`);
  assert.equal(conCondicion('.js [data-reveal]', 'reduce'), `:root${C}.js [data-reveal]`);
  assert.equal(conCondicion('.vt-v', 'no-preference'), `:root:not(${C}) .vt-v`);
  assert.equal(conCondicion('.htmlish', 'reduce'), `:root${C} .htmlish`);
});

test('movimiento: el plugin desarma el @media y deja las keyframes igual', async () => {
  const css = '@media (prefers-reduced-motion: no-preference) { .a { animation: x 1s; } @supports (top:0) { .b { color: red; } } @keyframes x { to { opacity: 0; } } }\n@media (max-width: 1px) { .c { color: blue; } }';
  const r = (await postcss([movimientoSegunAjustes()]).process(css, { from: undefined })).css;
  assert.match(r, new RegExp(`:root:not\\(\\[data-aj-mov-efectivo='reducido'\\]\\) \\.a`));
  assert.match(r, /@supports \(top:0\) \{ :root:not\(.*\) \.b/);
  assert.match(r, /@keyframes x \{ to \{ opacity: 0; \} \}/);
  assert.match(r, /@media \(max-width: 1px\)/);
  assert.doesNotMatch(r, /prefers-reduced-motion/);
});

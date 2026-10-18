import { test } from 'node:test';
import assert from 'node:assert/strict';
import { compararVersion, estadoVersion, normalizarPanel, partesVersion, tamanoTexto } from '../src/js/core/linkVersiones.js';

test('las versiones se comparan como números', () => {
  assert.ok(compararVersion('0.3.9', '0.3.16') < 0);
  assert.ok(compararVersion('1.0.0', '0.99.99') > 0);
  assert.equal(compararVersion('0.3.16', '0.3.16'), 0);
  assert.equal(partesVersion('0.3'), null);
  assert.equal(partesVersion('0.3.16-beta'), null);
});

test('estado de cada versión', () => {
  assert.equal(estadoVersion({ subida: false, publicada: false }).clave, 'sin_zip');
  assert.equal(estadoVersion({ subida: true, publicada: false }).clave, 'lista');
  assert.equal(estadoVersion({ subida: true, publicada: true }).clave, 'publicada');
  assert.equal(estadoVersion({ subida: true, publicada: false, retirada_en: '2026-10-17T10:00:00Z' }).clave, 'retirada');
});

test('el panel ordena, calcula la última publicada y quién está al día', () => {
  const p = normalizarPanel({
    es_admin: true,
    versiones: [
      { id: 1, version: '0.3.9', subida: true, publicada: true, tamano: 6579072 },
      { id: 2, version: '0.3.16', subida: true, publicada: true },
      { id: 3, version: '0.3.17', subida: true, publicada: false },
      { id: 4, version: 'basura' },
    ],
    pcs: [
      { dispositivo: 'a', version: '0.3.16', usuario: 'Fralex' },
      { dispositivo: 'b', version: '0.3.9', intento_estado: 'restaurada', intento_version: '0.3.16' },
      { pc: 'sin id' },
    ],
  });
  assert.deepEqual(p.versiones.map((v) => v.version), ['0.3.17', '0.3.16', '0.3.9']);
  assert.equal(p.ultima.version, '0.3.16');
  assert.deepEqual(p.pcs.map((x) => x.alDia), [true, false]);
  assert.equal(p.pcs[1].intento.estado, 'Volvió a la anterior');
  assert.deepEqual(p.resumen, { total: 2, alDia: 1, conProblema: 1 });
  assert.equal(tamanoTexto(6579072), '6.3 MB');
});

test('panel vacío o roto no revienta', () => {
  const p = normalizarPanel(null);
  assert.deepEqual(p.versiones, []);
  assert.equal(p.ultima, null);
  assert.equal(p.esAdmin, false);
});

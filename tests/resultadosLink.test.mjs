import { test } from 'node:test';
import assert from 'node:assert/strict';
import { formatoAuto, esLiga, etiquetaPermiso, quienConfirma, puedeConfirmar, vistaPropuesta, porClave } from '../src/js/core/competicion/resultadosLink.js';

test('formatos: los que tienen partidos fijos sí; colina, escalera, circuito y libre no', () => {
  for (const f of ['eliminacion', 'doble', 'liguilla', 'idavuelta', 'grupos', 'suizo']) assert.equal(formatoAuto(f), true, f);
  for (const f of ['colina', 'escalera', 'circuito', 'libre', undefined]) assert.equal(formatoAuto(f), false, String(f));
  assert.equal(esLiga('liguilla'), true);
  assert.equal(esLiga('eliminacion'), false);
});

test('permiso: oficial confirma el staff; premium el organizador (o un moderador); sin permiso nadie', () => {
  assert.equal(quienConfirma('oficial'), 'staff');
  assert.equal(quienConfirma('premium'), 'organizador');
  assert.equal(quienConfirma(null), null);
  assert.equal(puedeConfirmar({ origen: 'oficial', esOrganizador: true, esStaff: false }), false);
  assert.equal(puedeConfirmar({ origen: 'oficial', esStaff: true }), true);
  assert.equal(puedeConfirmar({ origen: 'premium', esOrganizador: true }), true);
  assert.equal(puedeConfirmar({ origen: 'premium', esModerador: true }), true);
  assert.equal(puedeConfirmar({ origen: 'premium', esStaff: true }), false);
  assert.equal(puedeConfirmar({ origen: null, esStaff: true, esOrganizador: true }), false);
  assert.match(etiquetaPermiso('oficial'), /Oficial/);
  assert.equal(etiquetaPermiso(null), '');
});

test('vistaPropuesta: penales, disputa y empate de llaves sin ganador', () => {
  const p = { a_nombre: 'Ana', b_nombre: 'Beto', eliminatoria: true };
  const v1 = vistaPropuesta({ ga: 1, gb: 1, ganador: 'a', estado: 'propuesto', pk_a: 4, pk_b: 3 }, p);
  assert.equal(v1.marcador, '1 – 1 (pen. 4–3)');
  assert.match(v1.texto, /pasa Ana/);
  assert.equal(v1.faltaGanador, false);
  const v2 = vistaPropuesta({ ga: 2, gb: 2, ganador: null, estado: 'disputa' }, p);
  assert.equal(v2.disputa, true);
  assert.equal(v2.faltaGanador, true);
  const v3 = vistaPropuesta({ ga: 0, gb: 0, ganador: null, estado: 'propuesto' }, { ...p, eliminatoria: false });
  assert.equal(v3.faltaGanador, false);
  assert.equal(porClave([{ clave: 'f1', ga: 1 }]).get('f1').ga, 1);
});

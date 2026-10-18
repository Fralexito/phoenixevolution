import { test } from 'node:test';
import assert from 'node:assert/strict';
import { DESTINOS, incluyeBase, incluyeLm, registrarTipo, tiposDisponibles, validarFichaje, resumenFichaje, resumenResultados, frescura, compararVersion, versionMasNueva, lineaEvento, mensajeError } from '../src/js/core/cambiosOficiales.js';

test('tres casillas: Base normal, Liga Máster, Las dos', () => {
  assert.deepEqual(DESTINOS.map((d) => d.id), ['base', 'lm', 'ambos']);
  assert.ok(incluyeBase('ambos') && incluyeLm('ambos') && incluyeBase('base') && !incluyeLm('base') && !incluyeBase('lm'));
});

test('enchufes: solo salen los tipos registrados Y encendidos en la base, con los destinos que permitan los dos', () => {
  const nada = () => {};
  registrarTipo({ tipo: 'prueba_a', etiqueta: 'A', destinos: ['base', 'lm', 'ambos'], pintar: nada, leer: nada });
  registrarTipo({ tipo: 'prueba_b', etiqueta: 'B', pintar: nada, leer: nada });
  const t = tiposDisponibles([
    { tipo: 'prueba_a', etiqueta: 'A de la base', destinos: ['lm'], activo: true },
    { tipo: 'prueba_b', activo: false },
    { tipo: 'no_registrado', activo: true, destinos: ['base'] },
  ]);
  assert.deepEqual(t.map((x) => x.tipo), ['prueba_a']);
  assert.deepEqual(t[0].destinos, ['lm']);
  assert.equal(t[0].etiqueta, 'A de la base');
  assert.throws(() => registrarTipo({ tipo: 'X!', pintar: nada, leer: nada }));
  assert.throws(() => registrarTipo({ tipo: 'sin_leer', pintar: nada }));
});

test('validarFichaje: nombres obligatorios, origen obligatorio salvo agente libre, mismo equipo, 48 bytes', () => {
  assert.deepEqual(validarFichaje({ jugador: ' Lamine Yamal ', desde: 'FC Barcelona', hasta: 'Arsenal FC' }), { jugador: 'Lamine Yamal', desde: 'FC Barcelona', hasta: 'Arsenal FC' });
  assert.throws(() => validarFichaje({ desde: 'A', hasta: 'B' }), /nombre del jugador/);
  assert.throws(() => validarFichaje({ jugador: 'X', desde: 'A' }), /equipo al que va/);
  assert.throws(() => validarFichaje({ jugador: 'X', hasta: 'B' }), /Agente libre/);
  assert.deepEqual(validarFichaje({ jugador: 'X', desde: 'ignorado', hasta: 'B', libre: true }), { jugador: 'X', desde: '', hasta: 'B' });
  assert.throws(() => validarFichaje({ jugador: 'X', desde: 'Arsenal FC', hasta: 'arsenal fc' }), /mismo/);
  assert.throws(() => validarFichaje({ jugador: 'Ñ'.repeat(25), desde: 'A', hasta: 'B' }), /largo/);   // 50 bytes
  assert.ok(validarFichaje({ jugador: 'Ñ'.repeat(24), desde: 'A', hasta: 'B' }));                     // 48 bytes
});

test('validarFichaje: ids opcionales y datos de Liga Máster', () => {
  const d = validarFichaje({ jugador: 'Kai Havertz', desde: 'Chelsea', hasta: 'Arsenal', jugador_id: '162114', desde_id: '', hasta_id: '102', lm_jugador_id: '57', lm_club_id: '3' });
  assert.deepEqual(d, { jugador: 'Kai Havertz', desde: 'Chelsea', hasta: 'Arsenal', jugador_id: 162114, hasta_id: 102, lm: { jugador_id: 57, club_id: 3 } });
  assert.throws(() => validarFichaje({ jugador: 'X', desde: 'A', hasta: 'B', jugador_id: 'abc' }), /número de PES/);
  assert.throws(() => validarFichaje({ jugador: 'X', desde: 'A', hasta: 'B', desde_id: '5', hasta_id: '5' }), /mismo/);
  assert.equal(resumenFichaje({ jugador: 'X', desde: '', hasta: 'B' }), 'X: agente libre → B');
});

test('resumenResultados agrupa por lado y ordena bien → mal; descarta basura', () => {
  const r = resumenResultados({ 'base:saltado': 1, 'base:aplicado': 3, 'lm:pendiente': 2, 'raro:aplicado': 9, 'base:inventado': 1, 'base:error': 0 });
  assert.deepEqual(r.base.map((x) => [x.resultado, x.n]), [['aplicado', 3], ['saltado', 1]]);
  assert.deepEqual(r.lm.map((x) => x.resultado), ['pendiente']);
  assert.deepEqual(resumenResultados(null), { base: [], lm: [] });
});

test('frescura del último contacto', () => {
  const ahora = Date.parse('2026-10-17T20:00:00Z');
  assert.equal(frescura('2026-10-17T19:55:00Z', ahora).texto, 'Conectado ahora');
  assert.equal(frescura('2026-10-17T19:30:00Z', ahora).texto, 'Hace 30 min');
  assert.equal(frescura('2026-10-17T15:00:00Z', ahora).texto, 'Hace 5 h');
  assert.equal(frescura('2026-10-16T20:00:00Z', ahora).texto, 'Hace 1 día');
  assert.equal(frescura('2026-10-01T20:00:00Z', ahora).tono, 'mal');
  assert.equal(frescura(null, ahora).texto, 'Nunca');
});

test('versiones de Link', () => {
  assert.equal(compararVersion('0.3.17', '0.3.9'), 1);
  assert.equal(compararVersion('0.3.16', '0.3.16'), 0);
  assert.equal(versionMasNueva([{ link_version: '0.3.9' }, { link_version: '0.3.17' }, { link_version: '' }]), '0.3.17');
});

test('líneas del historial de un PC', () => {
  assert.match(lineaEvento({ tipo: 'contacto', detalle: { link_version: '0.3.17', parche: 'ConmeGOL 26' } }), /Primer contacto · Link 0.3.17 · ConmeGOL 26/);
  assert.match(lineaEvento({ tipo: 'contacto', detalle: { link_version: '0.3.18', parche: 'P', base_huella: 'b', antes: { link_version: '0.3.17', parche: 'P', base_huella: 'a' } } }), /Link 0.3.17 → 0.3.18 · cambió su base/);
  assert.equal(lineaEvento({ tipo: 'resultado', resultado: 'saltado', destino: 'base', motivo: 'no está', cambio: { tipo: 'fichaje', datos: { jugador: 'X', desde: 'A', hasta: 'B' } } }), 'Saltado · Base normal · X: A → B — no está');
});

test('mensajes de error en español', () => {
  assert.match(mensajeError({ message: 'NO_AUTORIZADO' }), /Solo el admin/);
  assert.match(mensajeError({ message: 'DATOS_NO_VALIDOS:mismo_equipo' }), /mismo/);
  assert.match(mensajeError({ message: 'DATOS_NO_VALIDOS:otra_cosa' }), /no es válido/);
  assert.match(mensajeError({ message: 'Could not find the function public.pes_cambio_crear in the schema cache' }), /migración 125/);
});

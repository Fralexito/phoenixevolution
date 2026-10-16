import { test } from 'node:test'; import assert from 'node:assert/strict';
import { DEPARTAMENTOS, departamentoDe, departamento, departamentosPresentes, esJoda } from '../src/js/core/departamentos.js';
import { ordenDelDia, armarPortada, frescura, claveDia } from '../src/js/core/diario.js';
import { marcadorDe, tipoAfiche, grito, lineas, datosAfiche } from '../src/js/core/afiche.js';

const HOY = new Date('2026-10-16T12:00:00');
const n = (o) => ({ slug: o.slug ?? o.titulo.toLowerCase().replace(/\W+/g, '-'), titulo: o.titulo, resumen: o.resumen ?? 'Resumen de prueba.', categoria: o.categoria ?? 'JORNADA', tag: o.tag ?? '', liga: o.liga ?? 'galaxy', publicadaEn: o.publicadaEn ?? '2026-10-16T10:00:00Z', destacada: !!o.destacada, orden: o.orden ?? null, cuerpo: [], estilo: {}, plantilla: 'auto' });

const LISTA = [
  n({ titulo: 'Victor le metió 9-0 a Roberto', tag: 'Fecha 9 · Crónica' }),
  n({ titulo: 'El Analista: 5,3 goles por partido', tag: 'Datos' }),
  n({ titulo: 'Ranking de poder tras la fecha 8', tag: 'Ranking de poder' }),
  n({ titulo: 'Se abre el mercado: ventana de fichajes', categoria: 'OFICIAL', tag: 'Comunicado' }),
  n({ titulo: 'Faltan dos resultados: plazo hasta el domingo', categoria: 'TRIBUNAL', tag: 'Aviso', publicadaEn: '2026-10-10T10:00:00Z' }),
  n({ titulo: 'La Tribuna no perdona el 9-0', categoria: 'TRIBUNA', tag: 'Joda' }),
  n({ titulo: 'Degox recibe a Victor en la fecha 10', tag: 'Fecha 10 · Previa' }),
  n({ titulo: 'Camilo 4-1 Jack', tag: 'Fecha 9' }),
];

test('departamentos: catálogo sano (ids únicos, color y peso)', () => {
  const ids = DEPARTAMENTOS.map((d) => d.id);
  assert.equal(new Set(ids).size, ids.length);
  for (const d of DEPARTAMENTOS) {
    assert.match(d.color, /^#[0-9a-f]{6}$/i, d.id);
    assert.ok(d.peso > 0 && d.nombre && d.firma && d.cubre && d.fuente, d.id);
    assert.ok(['serio', 'urgente', 'joda'].includes(d.tono), d.id);
  }
});

test('departamentoDe: detecta por etiqueta, categoría y liga', () => {
  assert.equal(departamentoDe(LISTA[0]), 'cronica');
  assert.equal(departamentoDe(LISTA[1]), 'analista');
  assert.equal(departamentoDe(LISTA[2]), 'mesa');
  assert.equal(departamentoDe(LISTA[3]), 'mercado');
  assert.equal(departamentoDe(LISTA[4]), 'tribunal');
  assert.equal(departamentoDe(LISTA[5]), 'tribuna');
  assert.equal(departamentoDe(LISTA[6]), 'previa');
  assert.equal(departamentoDe(n({ titulo: 'Fecha 3 de la Sudario', liga: 'sudario' })), 'sudario');
  assert.equal(departamentoDe({ ...LISTA[0], departamento: 'clanes' }), 'clanes');
  assert.equal(departamentoDe({ titulo: 'Algo sin pistas', categoria: 'OFICIAL' }), 'direccion');
  // la etiqueta manda sobre el título: «el muro aguantó» no debe llevarse la crónica a La Plaza
  assert.equal(departamentoDe(n({ titulo: '¡El muro aguantó! Degox le sacó un 0-0 a Victor', tag: 'Fecha 10 · Crónica' })), 'cronica');
  assert.equal(departamentoDe(n({ titulo: 'Se abre el chat general de la comunidad', tag: '' , categoria: 'OFICIAL' })), 'plaza');
  assert.ok(departamentosPresentes(LISTA).length >= 6);
  assert.ok(esJoda('tribuna') && !esJoda('cronica'));
  assert.equal(departamento('no-existe').id, 'cronica');
});

test('orden del día: la joda siempre va después de lo serio', () => {
  const orden = ordenDelDia(LISTA, { hoy: HOY });
  assert.equal(orden.length, LISTA.length);
  const primerJoda = orden.findIndex((i) => esJoda(i.dep));
  assert.ok(orden.slice(primerJoda).every((i) => esJoda(i.dep)));
});

test('orden del día: lo urgente nunca queda al final', () => {
  const orden = ordenDelDia(LISTA, { hoy: HOY });
  const iTribunal = orden.findIndex((i) => i.dep === 'tribunal');
  assert.ok(iTribunal >= 0 && iTribunal < 4, `tribunal en ${iTribunal}`);
});

test('orden del día: no deja dos del mismo departamento pegadas', () => {
  const lista = [...LISTA, n({ titulo: 'Otra crónica de la fecha 9', tag: 'Fecha 9 · Crónica' }), n({ titulo: 'Tercera crónica de la fecha 9', tag: 'Fecha 9 · Crónica' })];
  const serios = ordenDelDia(lista, { hoy: HOY }).filter((i) => !esJoda(i.dep));
  serios.forEach((it, i) => { if (i) assert.notEqual(it.dep, serios[i - 1].dep, `${it.dep} repetido en ${i}`); });
});

test('orden del día: cambia con la fecha pero es el mismo durante todo el día', () => {
  const sl = (d) => ordenDelDia(LISTA, { hoy: d }).map((i) => i.noticia.slug).join('|');
  assert.equal(sl(new Date('2026-10-16T08:00:00')), sl(new Date('2026-10-16T23:00:00')));
  const dias = new Set([16, 17, 18, 19, 20, 21].map((d) => sl(new Date(`2026-10-${d}T12:00:00`))));
  assert.ok(dias.size >= 3, 'la portada debería variar entre días');
});

test('orden del día: si el staff acomodó a mano, manda su orden', () => {
  const manual = LISTA.map((x, i) => ({ ...x, orden: i }));
  assert.deepEqual(ordenDelDia(manual, { hoy: HOY }).map((i) => i.noticia.slug), manual.map((x) => x.slug));
});

test('portada: poco scroll — afiche, primera plana y una fila de lo demás', () => {
  const p = armarPortada(LISTA, { hoy: HOY, max: 6 });
  assert.ok(p.afiche && p.hero && p.afiche.noticia.slug !== p.hero.noticia.slug);
  assert.ok(!esJoda(p.afiche.dep), 'el afiche nunca es de joda si hay noticias serias');
  assert.ok(p.resto.length <= 6);
  assert.ok(p.ultimas.length <= 5);
  assert.ok(p.joda.length <= 3 && p.joda.every((i) => esJoda(i.dep)));
  assert.equal(p.sobran, Math.max(0, LISTA.filter((x) => !esJoda(departamentoDe(x))).length - 8));
});

test('portada: con una sola noticia no se rompe', () => {
  const p = armarPortada([LISTA[0]], { hoy: HOY });
  assert.ok(p.afiche); assert.equal(p.hero, null); assert.equal(p.resto.length, 0);
  assert.deepEqual(armarPortada([], { hoy: HOY }).afiche, null);
});

test('frescura: hoy vale más que la semana pasada', () => {
  assert.ok(frescura({ publicadaEn: '2026-10-16T09:00:00Z' }, HOY) > frescura({ publicadaEn: '2026-10-01T09:00:00Z' }, HOY));
  assert.equal(frescura({ publicadaEn: 'nada' }, HOY), 10);
  assert.equal(claveDia(HOY), '2026-10-16');
});

test('afiche: saca el marcador del texto', () => {
  assert.deepEqual(marcadorDe('Camilo 4-1 Jack'), { gl: 4, gv: 1, texto: '4-1' });
  assert.equal(marcadorDe('5,3 goles por partido'), null);
  assert.equal(marcadorDe('sin números'), null);
  assert.equal(marcadorDe('ganó 99-99'), null);
});

test('afiche: elige el tipo según lo que pasó', () => {
  assert.equal(tipoAfiche(LISTA[0]), 'goleada');
  assert.equal(tipoAfiche(LISTA[4]), 'tribunal');
  assert.equal(tipoAfiche(LISTA[5]), 'joda');
  assert.equal(tipoAfiche(LISTA[6]), 'previa');
  assert.equal(tipoAfiche(n({ titulo: 'Beto suma 8 victorias seguidas', tag: 'Racha' })), 'racha');
  assert.equal(tipoAfiche(n({ titulo: 'Hoy no se jugó nada', tag: 'Tranquilo' })), 'tranquilo');
});

const COLGADA = /\s(Y|O|DE|DEL|AL|A|EN|CON|QUE|POR|PARA|UN|UNA|EL|LA|LOS|LAS|SU|SE|LO|NO|ES|TRAS|SIN|SOBRE)$/;
test('afiche: el grito es corto y en mayúsculas', () => {
  const g = grito('¡NADIE PUEDE CON ÉL! Victor ya va 9 de 9 y la Galaxy entera tiembla');
  assert.ok(g.length <= 38 && g === g.toUpperCase());
  assert.equal(grito('[EJEMPLO] Se abre el mercado'), 'SE ABRE EL MERCADO');
  assert.ok(!/\s$/.test(grito('Fecha 9: Camilo golea a Jack 4-1')));
  // se queda con el grito de adelante y nunca corta a media frase
  assert.equal(grito('¡Otro frenazo! Victor y Beto firman un 0-0 y la cima se congela'), '¡OTRO FRENAZO!');
  assert.equal(grito('¡El muro aguantó! Degox le sacó un 0-0 a Victor y la fecha 10 se llenó de ceros'), '¡EL MURO AGUANTÓ!');
  assert.equal(grito('Aviso del Tribunal: cuatro partidos siguen sin resultado'), 'AVISO DEL TRIBUNAL');
  assert.equal(grito('El Archivo: el 10-0 de Victor a Camilo sigue siendo la goleada'), 'EL 10-0 DE VICTOR A CAMILO SIGUE');
  assert.ok(!COLGADA.test(grito('El Analista: la liga pasó de 5,4 goles por partido a 1,9 en dos fechas')));
});

test('afiche: parte el grito en líneas sin cortar palabras', () => {
  const ls = lineas('NADIE PUEDE CON EL BAYERN DE VICTOR', 14);
  assert.ok(ls.length >= 2 && ls.every((l) => l.length <= 14 || !l.includes(' ')));
  assert.equal(ls.join(' '), 'NADIE PUEDE CON EL BAYERN DE VICTOR');
});

test('afiche: datos completos y color del día', () => {
  const d = datosAfiche(LISTA[0], { hoy: HOY });
  assert.equal(d.tipo, 'goleada');
  assert.deepEqual(d.marcador, { gl: 9, gv: 0, texto: '9-0' });
  assert.match(d.acento, /^#[0-9a-f]{6}$/i);
  assert.ok(d.lineas.length >= 1 && d.firma && d.kicker);
  // hasta un grito corto se parte en dos, para que siempre haya palabra resaltada
  const corto = datosAfiche(n({ titulo: '¡Otro frenazo! Victor y Beto firman un 0-0', tag: 'Fecha 11 · Crónica' }), { hoy: HOY });
  assert.equal(corto.lineas.length, 2);
  assert.ok(corto.resaltado);
  assert.equal(datosAfiche(LISTA[4], { hoy: HOY }).acento, '#e23b2e');
  assert.equal(datosAfiche(LISTA[5], { hoy: HOY }).acento, '#f97316');
  const otros = new Set([16, 17, 18, 19, 20, 21].map((x) => datosAfiche(LISTA[0], { hoy: new Date(`2026-10-${x}T12:00:00`) }).acento));
  assert.ok(otros.size >= 3, 'el color debería rotar con los días');
});

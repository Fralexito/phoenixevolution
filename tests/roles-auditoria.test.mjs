import test from 'node:test';
import assert from 'node:assert/strict';
import { ROLES, ROL_INFO, normalizarRol, etiquetaRol, puede, puedeSancionar, esStaff, PERMISOS } from '../src/js/core/roles.js';
import { entradaHTML, lineaHTML, resumenHTML, filtrosHTML, equipoHTML, resultadosHTML, modalRolHTML, rolBadge } from '../src/js/features/auditoria/vista.js';
import { describirEntrada, normalizarEntrada, resumenCambios, formatearValor, frase, agruparPorDia, normalizarResumen, desdeRango, FILTRO_SECCIONES, FILTRO_ACCIONES, TABLAS } from '../src/js/core/auditoria.js';

// ───────── ROLES ─────────
test('roles: valores antiguos o raros nunca dan poder de más', () => {
  assert.equal(normalizarRol('comisario'), 'arbitro');
  assert.equal(normalizarRol('ADMIN'), 'admin');
  for (const raro of [null, undefined, '', 'superadmin', 'root', 42, {}]) assert.equal(normalizarRol(raro), 'jugador');
  assert.equal(etiquetaRol('arbitro'), 'Árbitro');
  assert.ok(ROLES.every((r) => ROL_INFO[r]?.etiqueta && ROL_INFO[r]?.icono));
});

test('permisos: el moderador edita pero NO borra; solo el admin borra, da roles y ve toda la auditoría', () => {
  assert.equal(puede('moderador', 'editarLiga'), true);
  assert.equal(puede('moderador', 'borrarLiga'), false);
  assert.equal(puede('admin', 'borrarLiga'), true);
  assert.equal(puede('moderador', 'darRoles'), false);
  assert.equal(puede('admin', 'darRoles'), true);
  assert.equal(puede('moderador', 'verAuditoriaCompleta'), false);
  assert.equal(puede('admin', 'verAuditoriaCompleta'), true);
  assert.equal(puede('moderador', 'crearLigaTemporada'), false);
});

test('permisos: el ayudante solo mira reportes; el jugador y el árbitro no tocan la liga', () => {
  assert.equal(puede('ayudante', 'verReportes'), true);
  assert.equal(puede('ayudante', 'resolverReportes'), false);
  assert.equal(puede('ayudante', 'editarLiga'), false);
  assert.equal(puede('ayudante', 'verAuditoria'), false);
  assert.equal(puede('jugador', 'verReportes'), false);
  assert.equal(puede('arbitro', 'editarLiga'), false);
  assert.equal(puede('arbitro', 'arbitrar'), true);
  assert.equal(puede('moderador', 'arbitrar'), false, 'comisario/árbitro es un rol aparte');
  assert.equal(puede('jugador', 'permisoInventado'), false);
});

test('sanciones: solo a alguien de rango MENOR (un moderador jamás toca a otro moderador ni a un admin)', () => {
  assert.equal(puedeSancionar('moderador', 'jugador'), true);
  assert.equal(puedeSancionar('moderador', 'ayudante'), true);
  assert.equal(puedeSancionar('moderador', 'arbitro'), true);
  assert.equal(puedeSancionar('moderador', 'moderador'), false);
  assert.equal(puedeSancionar('moderador', 'admin'), false);
  assert.equal(puedeSancionar('admin', 'moderador'), true);
  assert.equal(puedeSancionar('admin', 'admin'), false);
  assert.equal(puedeSancionar('ayudante', 'jugador'), false);
  assert.equal(puedeSancionar('jugador', 'jugador'), false);
});

test('esStaff y que todo permiso apunte a roles reales', () => {
  assert.deepEqual(ROLES.filter(esStaff), ['ayudante', 'moderador', 'admin']);
  for (const [permiso, roles] of Object.entries(PERMISOS)) for (const r of roles) assert.ok(ROLES.includes(r), `${permiso} → rol desconocido ${r}`);
});

// ───────── AUDITORÍA ─────────
const fila = (extra) => ({ id: 1, momento: '2026-10-04T20:00:00Z', actor_id: 'u1', actor_nombre: 'Carlos', actor_username: 'carlos', actor_rol: 'moderador', accion: 'editar', tabla: 'jugadores', registro_id: 'x', titulo: 'Messi', cambios: { club: [null, 'Club X'] }, ...extra });

test('auditoría: una edición se cuenta con una frase humana y el antes → después', () => {
  const d = describirEntrada(fila());
  assert.equal(frase(d), 'Carlos (Moderador) editó la ficha del jugador «Messi»');
  assert.equal(d.corto, 'Club: — → Club X');
  assert.equal(d.tono, 'warn');
  assert.equal(d.seccion, 'Jugadores');
});

test('auditoría: crear, borrar, ocultar, rol y acciones del sistema', () => {
  assert.equal(describirEntrada(fila({ accion: 'crear', cambios: { nombre: [null, 'Ana'], club: [null, 'X'] } })).corto, '2 datos guardados');
  assert.equal(describirEntrada(fila({ accion: 'crear', cambios: { nombre: [null, 'Ana'] } })).corto, '1 dato guardado');
  assert.match(describirEntrada(fila({ accion: 'borrar' })).corto, /copia de sus datos/);
  const oculta = describirEntrada(fila({ tabla: 'noticias', titulo: 'Gran fichaje', accion: 'ocultar', cambios: { publicada: [true, false] } }));
  assert.equal(frase(oculta), 'Carlos (Moderador) ocultó la noticia «Gran fichaje»');
  assert.equal(oculta.corto, 'Publicada: Sí → No');
  const rol = describirEntrada(fila({ accion: 'rol', tabla: 'perfiles', titulo: 'Hugo', actor_rol: 'admin', actor_nombre: 'Fralex', cambios: { rol: ['jugador', 'moderador'] }, motivo: 'Colaborará con la liga' }));
  assert.equal(frase(rol), 'Fralex (Administrador) cambió el rol de la cuenta de «Hugo»');
  assert.equal(rol.corto, 'Jugador → Moderador');
  assert.equal(rol.motivo, 'Colaborará con la liga');
  const sis = describirEntrada(fila({ actor_id: null, actor_nombre: null, actor_username: null, actor_rol: null }));
  assert.match(sis.actor, /Sistema/);
  assert.equal(sis.rolActor, '');
});

test('auditoría: ediciones con muchos cambios se resumen y datos raros no rompen nada', () => {
  const muchos = describirEntrada(fila({ cambios: { ovr: [80, 82], pac: [70, 71], sho: [60, 61] } }));
  assert.equal(muchos.corto, '3 datos modificados');
  assert.equal(describirEntrada(null), null);
  assert.equal(describirEntrada({}), null);
  assert.equal(normalizarEntrada('hola'), null);
  const raro = describirEntrada({ id: 5, momento: 'no es fecha', accion: 'inventada', tabla: 'tabla_nueva', cambios: 'texto' });
  assert.equal(raro.accion, 'sistema');
  assert.deepEqual(raro.cambios, []);
  assert.match(raro.objeto, /tabla_nueva/);
  assert.equal(raro.momento, 0);
});

test('auditoría: formato de valores (nulos, sí/no, vacío, textos largos, roles)', () => {
  assert.equal(formatearValor(null), '—');
  assert.equal(formatearValor(true), 'Sí');
  assert.equal(formatearValor(false), 'No');
  assert.equal(formatearValor(82), '82');
  assert.equal(formatearValor('   '), '(vacío)');
  assert.equal(formatearValor('a'.repeat(200)).length, 81);
  assert.equal(formatearValor('moderador', 'rol'), 'Moderador');
  assert.equal(formatearValor('comisario', 'rol'), 'Árbitro');
  assert.equal(formatearValor({ a: 1 }), '{"a":1}');
});

test('auditoría: los cambios se ordenan (nombre/título primero) y se clasifican', () => {
  const r = resumenCambios({ club: ['A', 'B'], titulo: ['viejo', 'nuevo'], foto: ['x', null], pie: [null, 'izq'] });
  assert.deepEqual(r.map((c) => c.campo), ['titulo', 'club', 'foto', 'pie']);
  assert.deepEqual(r.map((c) => c.tipo), ['cambio', 'cambio', 'quitado', 'nuevo']);
  assert.equal(r[0].etiqueta, 'Título');
  assert.deepEqual(resumenCambios(null), []);
  assert.deepEqual(resumenCambios([1, 2]), []);
  assert.deepEqual(resumenCambios({ mal: 'no es par' }), []);
  assert.equal(resumenCambios({ campo_nuevo_raro: [1, 2] })[0].etiqueta, 'Campo nuevo raro');
});

test('auditoría: agrupar por día usa la hora de Lima (Hoy, Ayer, fecha)', () => {
  const ahora = Date.parse('2026-10-05T03:00:00Z'); // 4-oct 22:00 en Lima
  const e = (iso, id) => describirEntrada(fila({ id, momento: iso }));
  const g = agruparPorDia([e('2026-10-05T02:30:00Z', 4), e('2026-10-04T20:00:00Z', 3), e('2026-10-03T20:00:00Z', 2), e('2026-10-01T20:00:00Z', 1)], ahora);
  assert.deepEqual(g.map((x) => x.etiqueta).slice(0, 2), ['Hoy', 'Ayer']);
  assert.equal(g[0].entradas.length, 2);
  assert.match(g[2].etiqueta, /1 de octubre/);
  // Medianoche: las 04:30 UTC del 5-oct son las 23:30 del 4-oct en Lima → siguen siendo «Hoy» del 4.
  assert.equal(agruparPorDia([e('2026-10-05T04:30:00Z', 9)], ahora)[0].etiqueta, 'Hoy');
});

test('auditoría: el resumen rellena los días sin actividad con 0 y suma por persona', () => {
  const ahora = Date.parse('2026-10-05T03:00:00Z');
  const r = normalizarResumen({ dias: 3, personas: [{ actor_id: 'a', username: 'hugo', nombre_display: 'Hugo', rol: 'moderador', total: 5, creadas: 2, editadas: 3, ultima: '2026-10-04T20:00:00Z' }, { actor_id: null, total: 2 }],
    por_dia: [{ dia: '2026-10-04', total: 7 }] }, ahora);
  assert.deepEqual(r.serie.map((s) => s.clave), ['2026-10-02', '2026-10-03', '2026-10-04']);
  assert.deepEqual(r.serie.map((s) => s.total), [0, 0, 7]);
  assert.equal(r.maximo, 7);
  assert.equal(r.total, 7);
  assert.equal(r.personas[0].nombre, 'Hugo');
  assert.equal(r.personas[0].rol, 'moderador');
  assert.equal(r.personas[1].nombre, 'Sistema');
  const vacio = normalizarResumen(null, ahora);
  assert.equal(vacio.serie.length, 7);
  assert.equal(vacio.maximo, 1);
  assert.deepEqual(vacio.personas, []);
});

test('auditoría: los filtros cubren todas las secciones y acciones que escribe la BD', () => {
  const triggers = ['jugadores', 'equipos', 'eventos_partido', 'grupos_divisiones', 'partidos', 'partidos_torneo', 'participaciones', 'transferencias', 'copa_resultados', 'contratos_plantilla', 'noticias', 'ligas', 'temporadas', 'perfiles'];
  for (const t of triggers) assert.ok(TABLAS[t], `falta la tabla ${t} en TABLAS`);
  assert.equal(FILTRO_SECCIONES.length, Object.keys(TABLAS).length);
  assert.deepEqual(FILTRO_ACCIONES.map((a) => a.accion), ['crear', 'editar', 'ocultar', 'borrar', 'rol', 'sancion']);
});

test('auditoría: el filtro «Hoy» empieza a medianoche de Lima; 7 y 30 días restan días; «todo» no filtra', () => {
  const ahora = Date.parse('2026-10-05T03:00:00Z'); // 4-oct 22:00 Lima
  assert.equal(desdeRango('hoy', ahora), '2026-10-04T05:00:00.000Z');
  assert.equal(desdeRango('7', ahora), '2026-09-28T03:00:00.000Z');
  assert.equal(desdeRango('30', ahora), '2026-09-05T03:00:00.000Z');
  assert.equal(desdeRango('todo', ahora), null);
  assert.equal(desdeRango('loquesea', ahora), null);
  // Justo pasada la medianoche UTC sigue siendo el mismo día de Lima.
  assert.equal(desdeRango('hoy', Date.parse('2026-10-05T04:59:00Z')), '2026-10-04T05:00:00.000Z');
});

// ───────── VISTA (HTML) ─────────
const MALO = '<img src=x onerror=alert(1)>';
test('vista: nada de la BD llega sin escapar (nombre, título, motivo, cambios, avatar)', () => {
  const d = describirEntrada(fila({ actor_nombre: MALO, titulo: MALO, motivo: MALO, actor_avatar: 'javascript:alert(1)', cambios: { club: [MALO, MALO] } }));
  const html = entradaHTML(d);
  assert.ok(!html.includes('<img src=x'), 'el HTML inyectado debe quedar escapado');
  assert.ok(html.includes('&lt;img src=x onerror=alert(1)&gt;'));
  assert.ok(!/<img[^>]+javascript:/i.test(html));
});

test('vista: la línea de tiempo agrupa por día y avisa cuando no hay nada', () => {
  const ahora = Date.parse('2026-10-05T03:00:00Z');
  assert.match(lineaHTML([], ahora), /No hay acciones/);
  const html = lineaHTML([describirEntrada(fila({ id: 2 })), describirEntrada(fila({ id: 1 }))], ahora);
  assert.match(html, /Hoy/);
  assert.equal((html.match(/data-aud-id=/g) || []).length, 2);
  assert.match(html, /Ver detalle \(1\)/);
});

test('vista: crear muestra solo «Valor guardado», borrar solo «Valor que tenía», editar ambos', () => {
  const crear = entradaHTML(describirEntrada(fila({ accion: 'crear', cambios: { nombre: [null, 'Ana'] } })));
  assert.match(crear, /Valor guardado/); assert.ok(!crear.includes('>Antes<'));
  const borrar = entradaHTML(describirEntrada(fila({ accion: 'borrar', cambios: { nombre: ['Ana', null] } })));
  assert.match(borrar, /Valor que tenía/); assert.ok(!borrar.includes('>Después<'));
  const editar = entradaHTML(describirEntrada(fila()));
  assert.match(editar, />Antes</); assert.match(editar, />Después</);
});

test('vista: el resumen dibuja una tarjeta por persona y solo el admin ve «Ver sus acciones»', () => {
  const r = normalizarResumen({ dias: 7, personas: [{ actor_id: 'a1', username: 'hugo', nombre_display: 'Hugo', rol: 'moderador', total: 4, creadas: 1, editadas: 3 }], por_dia: [] });
  assert.match(resumenHTML(r, { dias: 7, esAdmin: true }), /data-actor="a1"/);
  assert.ok(!resumenHTML(r, { dias: 7, esAdmin: false }).includes('data-actor='));
  assert.match(resumenHTML(normalizarResumen(null), { dias: 7 }), /Aún no hay actividad/);
});

test('vista: filtros marcan lo elegido; el selector de persona es solo del admin', () => {
  const f = { accion: 'editar', tabla: 'noticias', actor: '', rango: '7' };
  const html = filtrosHTML(f, [{ actorId: 'a1', nombre: 'Hugo' }], true);
  assert.match(html, /data-accion="editar" aria-pressed="true"/);
  assert.match(html, /<option value="noticias" selected>/);
  assert.match(html, /id="aud-persona"/);
  assert.ok(!filtrosHTML(f, [], false).includes('aud-persona'));
});

test('vista: equipo y roles — no se puede cambiar el rol propio y el modal exige motivo', () => {
  const eq = [{ id: 'yo', nombre: 'Fralex', username: 'fralex', avatar: '', rol: 'admin' }, { id: 'h', nombre: 'Hugo', username: 'hugo', avatar: '', rol: 'moderador' }];
  const html = equipoHTML(eq, 'yo');
  assert.match(html, /No puedes cambiar tu propio rol/);
  assert.match(html, /data-rol-cuenta="h"/);
  assert.ok(!html.includes('data-rol-cuenta="yo"'));
  assert.match(resultadosHTML([], 'yo'), /No encontré/);
  assert.equal(resultadosHTML(null), '');
  const modal = modalRolHTML(eq[1]);
  assert.match(modal, /rol-motivo/);
  for (const r of ['jugador', 'arbitro', 'ayudante', 'moderador', 'admin']) assert.ok(modal.includes(`value="${r}"`), r);
  assert.match(modal, /value="moderador" class="mt-1 accent-cyan-400" checked/);
  assert.match(rolBadge('comisario'), /Árbitro/);
});

// Página de UN torneo propio: inscripción, empezar, resultados con avance automático, tablas, suizo/grupos/colina/escalera/circuito, cierre.
// La lógica pura está en core/competicion/torneos.js y core/competicion/formatos.js; los datos en features/torneos/api.js (migración 097).
import { onSession, can } from '../core/sistema/session.js';
import { toast } from '../core/sistema/toast.js';
import { confirmar, pedirTexto } from '../core/sistema/dialogo.js';
import { escapeHTML as esc, safeUrl } from '../core/sistema/dom.js';
import { href } from '../core/sistema/config.js';
import { generar, mezclar, validarFormato, jugarColina, retarEscalera, limpiarJugadores } from '../core/competicion/formatos.js';
import { construirPlan, tablaTorneo, crucesDePuestos, estadoSuizo, siguienteRondaSuizo, campeonSugerido, agregarFechaCircuito, tablaCircuito, porRonda, etiquetaLado, progreso } from '../core/competicion/torneos.js';
import { reglaDelPartido, castigoDelPartido } from '../core/competicion/diversion.js';
import { REGLAS_RULETA } from '../../data/modalidades.js';
import * as api from '../features/torneos/api.js';
import { rellenarPatrocinios } from '../features/patrocinios.js';
import { abrirCalendario } from '../features/calendario.js';
import { formatoFicha, guiaFormatoHTML, dinamicasActivasHTML, leyendaHTML, ESTADO_TXT } from '../features/torneos/guia.js';
import { rafaga } from '../features/dopamina.js';
import { ligaApta, vistaCreador, staffVePedido, validarMotivo, limpiarNota, MAX_TEXTO } from '../core/competicion/solicitudOficial.js';
import { etiquetaPermiso, puedeConfirmar, vistaPropuesta, porClave, formatoAuto, esLiga, quienConfirma } from '../core/competicion/resultadosLink.js';

const raiz = document.getElementById('to-raiz');
const id = Number(new URLSearchParams(location.search).get('id'));
const st = { yo: null, t: null, insc: [], partidos: [], nombres: {}, eventos: [], prem: null, sol: null, auto: null, link: [], cargando: false };

const nombresEq = (a, b) => String(a ?? '').toLowerCase() === String(b ?? '').toLowerCase();
const dins = () => st.t?.config?.dinamicas ?? [];
const gestiona = () => Boolean(st.yo) && (st.t.creador === st.yo || can('gestionarTorneos'));
const miNombre = () => st.insc.find((i) => i.usuario === st.yo)?.nombre ?? null;
const yoDentro = () => st.insc.some((i) => i.usuario === st.yo);
const plegable = (titulo, icono, resumen, html, abierto = false) => `<details class="plegable"${abierto ? ' open' : ''}><summary><span class="plegable-ico"><i class="fa-solid ${icono}"></i></span><span class="plegable-t"><b>${esc(titulo)}</b>${resumen ? `<small>${esc(resumen)}</small>` : ''}</span><i class="fa-solid fa-chevron-down plegable-flecha" aria-hidden="true"></i></summary><div class="plegable-cuerpo">${html}</div></details>`;

function puedeAnotar(p) {
  if (!st.yo || st.t.estado !== 'en_curso' || !p.a_nombre || !p.b_nombre) return false;
  if (gestiona()) return true;
  const yoN = miNombre();
  return st.t.config?.reportan_jugadores !== false && yoN && (nombresEq(yoN, p.a_nombre) || nombresEq(yoN, p.b_nombre));
}

// ── Partidos ───────────────────────────────────────────────────────────────────────────────────────────────────────────
function filaPartido(p) {
  const a = etiquetaLado(p.a_nombre, p.a_slot); const b = etiquetaLado(p.b_nombre, p.b_slot);
  const gano = (lado) => p.jugado && p.ganador === lado;
  const marcador = p.jugado ? `<b class="to-marcador">${p.ga} – ${p.gb}</b>` : '<em class="to-vs">vs</em>';
  const extras = [];
  if (dins().includes('ruleta-partido') && !p.jugado && p.a_nombre && p.b_nombre) extras.push(`<span class="to-extra"><i class="fa-solid fa-dice" aria-hidden="true"></i> Regla: ${esc(reglaDelPartido(st.t.id, p.clave, REGLAS_RULETA))}</span>`);
  if (dins().includes('castigo') && p.jugado && p.ganador) extras.push(`<span class="to-extra"><i class="fa-solid fa-skull" aria-hidden="true"></i> Castigo para ${esc(p.ganador === 'a' ? p.b_nombre : p.a_nombre)}: ${esc(castigoDelPartido(st.t.id, p.clave))}</span>`);
  if (p.jugado && !p.ganador) extras.push('<span class="to-extra">Empate</span>');
  const prop = !p.jugado ? propuestas().get(p.clave) : null;
  if (prop) extras.push(`<span class="to-extra to-extra-link${prop.estado === 'disputa' ? ' to-disputa' : ''}"><i class="fa-solid fa-satellite-dish" aria-hidden="true"></i> Link: ${esc(vistaPropuesta(prop, p).marcador)} · por confirmar</span>`);
  const botones = puedeAnotar(p)
    ? `<button type="button" class="btn btn-ghost to-btn" data-anotar="${esc(p.clave)}">${p.jugado ? 'Editar' : 'Anotar resultado'}</button>${p.jugado && gestiona() ? `<button type="button" class="btn btn-ghost to-btn" data-quitar="${esc(p.clave)}" aria-label="Quitar resultado"><i class="fa-solid fa-rotate-left"></i></button>` : ''}` : '';
  return `<li class="to-partido${p.jugado ? ' to-hecho' : ''}" data-clave="${esc(p.clave)}"><span class="to-id">${esc(p.clave)}</span>
    <span class="to-lado${gano('a') ? ' to-gana' : ''}${p.a_nombre ? '' : ' to-pend'}">${esc(a)}</span>${marcador}<span class="to-lado${gano('b') ? ' to-gana' : ''}${p.b_nombre ? '' : ' to-pend'}">${esc(b)}</span>
    <span class="to-botones">${botones}</span>${extras.length ? `<span class="to-extras">${extras.join('')}</span>` : ''}<span class="to-ctl"></span></li>`;
}
function listaRondas(lista) {
  return porRonda(lista).map((r) => `<section class="to-ronda"><h3>${esc(r.nombre)}</h3><ul>${r.partidos.map(filaPartido).join('')}</ul></section>`).join('');
}
function formularioResultado(p) {
  const eli = p.eliminatoria;
  return `<form class="to-form" data-form-res="${esc(p.clave)}"><label>${esc(p.a_nombre)} <input name="ga" type="number" min="0" max="999" required value="${p.jugado ? p.ga : ''}" inputmode="numeric"></label>
    <span>–</span><label><input name="gb" type="number" min="0" max="999" required value="${p.jugado ? p.gb : ''}" inputmode="numeric"> ${esc(p.b_nombre)}</label>
    ${eli ? `<label class="to-si-empate">Si empatan pasa: <select name="ganador"><option value="a">${esc(p.a_nombre)}</option><option value="b">${esc(p.b_nombre)}</option></select></label>` : ''}
    <button class="btn btn-primary to-btn">Guardar</button><button type="button" class="btn btn-ghost to-btn" data-cancelar-res>Cancelar</button></form>`;
}

// ── Tablas ─────────────────────────────────────────────────────────────────────────────────────────────────────────────
function tablaHTML(filas, titulo = '') {
  if (!filas.length) return '<p class="tn-vacio">La tabla aparecerá cuando haya resultados.</p>';
  return `${titulo ? `<h3 class="to-sub">${esc(titulo)}</h3>` : ''}<div class="to-tabla-caja"><table class="to-tabla"><thead><tr><th>#</th><th>Jugador</th><th>PJ</th><th>G</th><th>E</th><th>P</th><th>GF</th><th>GC</th><th>DG</th><th>Pts</th></tr></thead><tbody>
    ${filas.map((f, i) => `<tr><td>${i + 1}</td><td>${esc(f.nombre)}</td><td>${f.pj}</td><td>${f.g}</td><td>${f.e}</td><td>${f.p}</td><td>${f.gf}</td><td>${f.gc}</td><td>${f.dg}</td><td><b>${f.pts}</b></td></tr>`).join('')}</tbody></table></div>`;
}

// ── Cuerpo según el formato ──────────────────────────────────────────────────────────────────────────────────────────
function cuerpoLlave() { return `<div class="to-llave">${listaRondas(st.partidos)}</div>`; }
function cuerpoLiga() {
  return `${tablaHTML(tablaTorneo(st.partidos, { descansos: st.t.estado_juego?.descansos ?? [] }), 'Tabla')}${plegable('Partidos', 'fa-futbol', `${progreso(st.partidos).jugados} de ${st.partidos.length} jugados`, listaRondas(st.partidos), true)}`;
}
function cuerpoGrupos() {
  const grupos = st.t.meta?.grupos ?? [];
  const pend = crucesDePuestos(st.partidos);
  const tablas = grupos.map((g) => tablaHTML(tablaTorneo(st.partidos, { grupo: g.grupo }), `Grupo ${g.grupo}`)).join('');
  const jug = st.partidos.filter((p) => p.grupo); const play = st.partidos.filter((p) => !p.grupo);
  const cerrar = gestiona() && pend.length ? `<div class="to-aviso"><i class="fa-solid fa-circle-check"></i> Hay grupos terminados. <button type="button" class="btn btn-primary to-btn" data-cerrar-grupos>Cerrar grupos y llenar cruces</button></div>` : '';
  return `<div class="to-grupos">${tablas}</div>${cerrar}${plegable('Partidos de grupos', 'fa-table-list', `${progreso(jug).jugados} de ${jug.length}`, listaRondas(jug))}<h3 class="to-sub">Playoffs</h3><div class="to-llave">${listaRondas(play)}</div>`;
}
function cuerpoSuizo() {
  const es = estadoSuizo(st.partidos); const total = st.t.meta?.totalRondas ?? 1;
  const bye = st.t.estado_juego?.descansos ?? [];
  const sig = gestiona() && es.completa && es.ronda < total ? `<div class="to-aviso"><i class="fa-solid fa-forward"></i> Ronda ${es.ronda} terminada. <button type="button" class="btn btn-primary to-btn" data-sig-suizo>Armar ronda ${es.ronda + 1}</button></div>` : '';
  return `<p class="tn-ayuda">Ronda ${es.ronda} de ${total}. ${bye.length ? `Descansaron: ${esc(bye.join(', '))}.` : ''}</p>${sig}${tablaHTML(tablaTorneo(st.partidos, { descansos: bye }), 'Tabla')}${plegable('Partidos por ronda', 'fa-scale-balanced', '', listaRondas(st.partidos), true)}`;
}
function cuerpoLibre() {
  const nombres = st.insc.map((i) => i.nombre);
  const form = gestiona() ? `<form id="to-libre" class="to-form to-form-libre"><input name="ronda" class="field" maxlength="60" placeholder="Ronda o fecha (opcional)">
    <input name="a" class="field" list="to-nombres" required maxlength="60" placeholder="Local"><input name="b" class="field" list="to-nombres" required maxlength="60" placeholder="Visitante">
    <datalist id="to-nombres">${nombres.map((n) => `<option value="${esc(n)}">`).join('')}</datalist><button class="btn btn-primary to-btn">Añadir partido</button></form>` : '';
  return `${form}${tablaHTML(tablaTorneo(st.partidos), 'Tabla')}${plegable('Partidos', 'fa-futbol', `${progreso(st.partidos).jugados} de ${st.partidos.length} jugados`, listaRondas(st.partidos), true)}`;
}
function puedeJugarEstado() { return gestiona() || (st.t.config?.reportan_jugadores !== false && yoDentro()); }
function cuerpoColina() {
  const e = st.t.estado_juego; if (!e?.campeon) return '<p class="tn-vacio">Sin datos.</p>';
  const retador = e.cola[0];
  const coronas = Object.entries(e.coronas ?? {}).sort((a, b) => b[1] - a[1]).map(([n, c]) => `<li>${esc(n)} <b>${c}</b></li>`).join('') || '<li>Aún nadie.</li>';
  const ctl = puedeJugarEstado() ? `<div class="to-botones-fila"><button type="button" class="btn btn-primary" data-colina="${esc(e.campeon)}">Gana ${esc(e.campeon)}</button><button type="button" class="btn btn-ghost" data-colina="${esc(retador)}">Gana ${esc(retador)}</button></div>` : '';
  return `<div class="fm-colina"><div class="fm-trono"><span class="fm-etiqueta">Campeón del trono</span><b>${esc(e.campeon)}</b><small>Racha ${e.racha} de ${e.maxRacha}</small></div><div class="fm-vs">vs</div>
    <div class="fm-trono fm-retador"><span class="fm-etiqueta">Retador</span><b>${esc(retador)}</b><small>Siguen: ${esc(e.cola.slice(1).join(', ') || '—')}</small></div></div>${ctl}
    <h3 class="to-sub">Coronas</h3><ul class="fm-coronas">${coronas}</ul>${plegable('Últimos duelos', 'fa-clock-rotate-left', '', `<ul class="to-hist">${(e.historial ?? []).slice(-12).reverse().map((h) => `<li>${esc(h.campeon)} vs ${esc(h.retador)} → <b>${esc(h.ganador)}</b></li>`).join('') || '<li>Sin duelos.</li>'}</ul>`)}`;
}
function cuerpoEscalera() {
  const o = st.t.estado_juego?.orden ?? []; const yoN = miNombre();
  const opts = (sel) => o.map((n) => `<option${n === sel ? ' selected' : ''}>${esc(n)}</option>`).join('');
  const form = puedeJugarEstado() ? `<form id="to-escalera" class="to-form"><label>Retador <select name="a">${opts(yoN)}</select></label><label>Retado <select name="b">${opts(null)}</select></label>
    <label>Ganó <select name="g"><option value="a">el retador</option><option value="b">el retado</option></select></label><button class="btn btn-primary to-btn">Anotar reto</button></form>` : '';
  const retos = (st.t.estado_juego?.retos ?? []).slice(-10).reverse().map((r) => `<li>${esc(r.retador)} retó a ${esc(r.retado)} → ${esc(r.ganador)}${r.cambio ? ' (sube)' : ''}</li>`).join('') || '<li>Sin retos.</li>';
  return `<ol class="fm-escalera">${o.map((n, i) => `<li><span class="fm-pos">${i + 1}</span>${esc(n)}</li>`).join('')}</ol>${form}${plegable('Últimos retos', 'fa-clock-rotate-left', '', `<ul class="to-hist">${retos}</ul>`)}`;
}
function cuerpoCircuito() {
  const fechas = st.t.estado_juego?.fechas ?? [];
  const form = gestiona() ? `<form id="to-circuito" class="to-form to-form-col"><input name="nombre" class="field" maxlength="40" placeholder="Nombre de la fecha (ej.: Fecha ${fechas.length + 1})">
    <label class="tn-campo" for="to-puestos">Orden de llegada (uno por línea, el 1.º arriba)</label><textarea id="to-puestos" name="puestos" rows="5" class="field">${esc(st.insc.map((i) => i.nombre).join('\n'))}</textarea><button class="btn btn-primary to-btn">Añadir fecha</button></form>` : '';
  return `${form}${(() => { const t = tablaCircuito(st.t.estado_juego); return t.length ? `<div class="to-tabla-caja"><table class="to-tabla"><thead><tr><th>#</th><th>Jugador</th><th>Fechas</th><th>1.º</th><th>Pts</th></tr></thead><tbody>${t.map((f, i) => `<tr><td>${i + 1}</td><td>${esc(f.nombre)}</td><td>${f.fechas}</td><td>${f.primeros}</td><td><b>${f.pts}</b></td></tr>`).join('')}</tbody></table></div>` : '<p class="tn-vacio">Aún no hay fechas anotadas.</p>'; })()}
    ${plegable('Fechas jugadas', 'fa-flag-checkered', `${fechas.length}`, `<ul class="to-hist">${fechas.map((f) => `<li><b>${esc(f.nombre)}</b>: ${f.puestos.map(esc).join(' › ')}</li>`).join('') || '<li>Ninguna.</li>'}</ul>`)}`;
}
function cuerpoEnCurso() {
  switch (st.t.formato) {
    case 'eliminacion': case 'doble': return cuerpoLlave();
    case 'liguilla': case 'idavuelta': return cuerpoLiga();
    case 'grupos': return cuerpoGrupos();
    case 'suizo': return cuerpoSuizo();
    case 'colina': return cuerpoColina();
    case 'escalera': return cuerpoEscalera();
    case 'circuito': return cuerpoCircuito();
    default: return cuerpoLibre();
  }
}

// ── Inscripción ────────────────────────────────────────────────────────────────────────────────────────────────────────
function cuerpoInscripcion() {
  if (oficialId()) return '';
  const t = st.t; const cupo = t.cupo;
  const lista = st.insc.map((i) => `<li><i class="fa-solid ${i.usuario ? 'fa-user' : 'fa-user-pen'}" aria-hidden="true"></i>${esc(i.nombre)}${gestiona() ? `<button type="button" class="to-x" data-quitar-j="${i.id}" aria-label="Quitar a ${esc(i.nombre)}"><i class="fa-solid fa-xmark"></i></button>` : ''}</li>`).join('') || '<li class="tn-vacio">Todavía no hay nadie.</li>';
  let accion = '';
  if (!st.yo) accion = '<p class="tn-ayuda">Inicia sesión para apuntarte.</p>';
  else if (yoDentro()) accion = '<button type="button" class="btn btn-ghost" data-salir><i class="fa-solid fa-door-open"></i> Salirme</button>';
  else if (t.inscripcion_abierta && (!cupo || st.insc.length < cupo)) accion = '<button type="button" class="btn btn-primary" data-unirme><i class="fa-solid fa-hand"></i> Apuntarme</button>';
  else accion = '<p class="tn-ayuda">La inscripción está cerrada o el torneo está lleno.</p>';
  const org = gestiona() ? `<form id="to-agregar" class="to-form"><input name="nombre" class="field" maxlength="40" required placeholder="Añadir un jugador por nombre"><button class="btn btn-ghost to-btn"><i class="fa-solid fa-plus"></i> Añadir</button></form>
    <p class="tn-ayuda">Los jugadores añadidos por nombre no necesitan cuenta; tú anotas sus resultados.</p>
    <button type="button" class="btn btn-primary" data-empezar><i class="fa-solid fa-play"></i> Empezar torneo</button>` : '<p class="tn-ayuda">El organizador empezará el torneo cuando haya suficientes jugadores.</p>';
  return `<section class="glass-panel to-panel"><h2 class="tn-titulo"><i class="fa-solid fa-users"></i> Inscritos (${st.insc.length}${cupo ? `/${cupo}` : ''})</h2><ul class="to-insc">${lista}</ul><div class="to-fila">${accion}</div>${org}</section>`;
}

// ── Cabecera y secciones fijas ───────────────────────────────────────────────────────────────────────────────────────
function cabecera() {
  const t = st.t; const f = formatoFicha(t.formato); const e = ESTADO_TXT[t.estado];
  const enlace = safeUrl(t.config?.enlace ?? '');
  return `<header class="glass-panel to-cab"><div class="to-cab-top"><span class="tn-pill"><i class="fa-solid ${esc(e?.icono ?? 'fa-circle')}" aria-hidden="true"></i> ${esc(e?.nombre ?? t.estado)}</span>
    <span class="tn-pill"><i class="fa-solid ${esc(f?.icono ?? 'fa-trophy')}" aria-hidden="true"></i> ${esc(f?.nombre ?? t.formato)}</span>${t.oculto ? '<span class="tn-pill tn-alerta">Oculto por el staff</span>' : ''}${st.prem?.premium ? '<span class="tn-pill" title="Torneo premium"><i class="fa-solid fa-crown" aria-hidden="true"></i> Premium</span>' : ''}${etiquetaPermiso(origenAuto()) ? `<span class="tn-pill to-pill-auto" title="Los resultados los manda Phoenix Link y se confirman aquí"><i class="fa-solid fa-satellite-dish" aria-hidden="true"></i> ${esc(etiquetaPermiso(origenAuto()))}</span>` : ''}</div>
    <h1>${esc(t.nombre)}</h1><p class="to-por">Organiza <b>${esc(st.nombres[t.creador] ?? 'un jugador')}</b>${t.inicia ? ` · Empieza ${esc(new Date(t.inicia).toLocaleString('es-PE', { dateStyle: 'medium', timeStyle: 'short' }))}` : ''}</p>
    ${t.descripcion ? `<p class="to-desc">${esc(t.descripcion)}</p>` : ''}
    ${t.config?.premio ? `<p class="to-premio"><i class="fa-solid fa-gift" aria-hidden="true"></i> Premio: ${esc(t.config.premio)}</p>` : ''}
    <div data-patro="torneo:${t.id}"></div>
    ${oficialHTML()}
    <div class="to-cab-acc"><button type="button" class="btn btn-ghost" data-copiar><i class="fa-solid fa-link"></i> Copiar enlace</button>${t.inicia && ['inscripcion', 'en_curso'].includes(t.estado) && new Date(t.inicia).getTime() > Date.now() ? '<button type="button" class="btn btn-ghost" data-cal-torneo><i class="fa-solid fa-calendar-plus"></i> Añadir a mi calendario</button>' : ''}${enlace ? `<a class="btn btn-ghost" href="${esc(enlace)}" target="_blank" rel="noopener noreferrer"><i class="fa-solid fa-video"></i> Sala / transmisión</a>` : ''}</div></header>`;
}
// Un solo creador (migración 143): el staff hace OFICIAL una liga todos contra todos; desde ahí la inscripción, el calendario y
// los resultados (que manda Phoenix Link) viven en «Liga oficial» (/liga-amigos/). Las casuales siguen aquí con resultados a mano.
// Desde la 144 el creador puede PEDIRLO y el staff lo acepta o rechaza (core/competicion/solicitudOficial.js).
const oficialId = () => st.t?.meta?.oficial ?? null;
function oficialHTML() {
  const ed = oficialId();
  if (ed) return `<p class="to-premio"><i class="fa-solid fa-shield-halved" aria-hidden="true"></i> <b>Liga oficial:</b> Phoenix Link manda los resultados solos. Inscripción, calendario y tabla en <a class="underline" href="${esc(href(`liga-amigos/?liga=${encodeURIComponent(ed)}`))}">Liga oficial</a>.</p>`;
  return pedidoStaffHTML() + pedidoCreadorHTML() + botonStaffHTML();
}
const esStaffLiga = () => Boolean(st.yo) && can('editarLiga');
// Resultados automáticos de Phoenix Link (migración 145).
const origenAuto = () => st.auto?.origen ?? null;
const propuestas = () => porClave(st.link);
const confirmoYo = () => puedeConfirmar({ origen: origenAuto(), esOrganizador: Boolean(st.yo) && st.t?.creador === st.yo, esStaff: esStaffLiga(), esModerador: Boolean(st.yo) && can('gestionarTorneos') });
/** Caja «Resultados de Phoenix Link por confirmar» (#res-link: ahí lleva el aviso de la campana). */
function resultadosLinkHTML() {
  if (!st.link.length || !origenAuto()) return '';
  const puedo = confirmoYo();
  const quien = quienConfirma(origenAuto()) === 'staff' ? 'el staff' : 'el organizador';
  const filas = st.link.map((r) => {
    const p = st.partidos.find((x) => x.clave === r.clave); if (!p) return '';
    const v = vistaPropuesta(r, p);
    const elegir = v.faltaGanador && puedo ? `<label class="to-si-empate">Pasa: <select data-ganador-link="${r.id}"><option value="a">${esc(p.a_nombre)}</option><option value="b">${esc(p.b_nombre)}</option></select></label>` : '';
    const botones = puedo ? `<div class="to-cab-acc">${elegir}<button type="button" class="btn btn-primary to-btn" data-link-ok="${r.id}"><i class="fa-solid fa-check"></i> Confirmar</button><button type="button" class="btn btn-ghost to-btn" data-link-no="${r.id}"><i class="fa-solid fa-xmark"></i> Rechazar</button></div>` : '';
    return `<li class="to-link${v.disputa ? ' to-disputa' : ''}"><p><b>${esc(p.a_nombre)} ${esc(v.marcador)} ${esc(p.b_nombre)}</b> <span class="tn-ayuda">${esc(p.ronda ?? '')}</span></p><p class="tn-ayuda">${esc(v.texto)}</p>${botones}</li>`;
  }).join('');
  return `<section class="glass-panel to-panel" id="res-link"><h2 class="to-h2"><i class="fa-solid fa-satellite-dish" aria-hidden="true"></i> Resultados de Phoenix Link por confirmar</h2>
    <p class="tn-ayuda">Los mandó el juego al terminar cada partido. No cuentan hasta que ${quien} los confirme. ${puedo ? 'Si uno está mal, recházalo y anótalo a mano.' : ''}</p><ul class="to-links">${filas}</ul></section>`;
}
/** Staff: hacer oficial (o quitarlo) un torneo que NO es liga, sin pedido (145). Las ligas siguen con «Hacer oficial» → Liga oficial. */
function botonStaffAutoHTML() {
  if (!st.auto) return '';   // sin la migración 145 no existe el permiso oficial dentro de Torneos
  if (!esStaffLiga() || !st.t || st.t.oculto || esLiga(st.t.formato) || !formatoAuto(st.t.formato) || ['terminado', 'cancelado'].includes(st.t.estado)) return '';
  if (origenAuto() === 'oficial') return '<p class="tn-ayuda"><button type="button" class="btn btn-ghost" data-auto-staff="no"><i class="fa-solid fa-shield-halved"></i> Quitar oficial</button></p>';
  if (staffVePedido(st.sol, true)) return '';
  return '<p class="tn-ayuda"><button type="button" class="btn btn-ghost" data-auto-staff="si"><i class="fa-solid fa-shield-halved"></i> Hacer oficial (resultados por Phoenix Link)</button></p>';
}
function botonStaffHTML() {
  if (!esStaffLiga() || !esLiga(st.t.formato)) return botonStaffAutoHTML();
  if (!ligaApta(st.t, origenAuto()) || staffVePedido(st.sol, true)) return '';
  return '<p class="tn-ayuda"><button type="button" class="btn btn-ghost" data-hacer-oficial><i class="fa-solid fa-shield-halved"></i> Hacer oficial (resultados por Phoenix Link)</button></p>';
}
// Pedido para hacer oficial (migración 144). El creador lo pide; el staff lo acepta o rechaza aquí mismo o desde Moderación.
function pedidoCreadorHTML() {
  if (esStaffLiga()) return '';   // el staff no necesita pedir: tiene el botón directo
  if (!st.auto && !esLiga(st.t.formato)) return '';   // sin la migración 145 solo las ligas pueden pedirlo (como en la 144)
  const v = vistaCreador({ t: st.t, yo: st.yo, solicitud: st.sol, autoOrigen: origenAuto() });
  if (v.modo === 'nada') return '';
  const icono = v.modo === 'pendiente' ? 'fa-hourglass-half' : v.modo === 'pedir' ? 'fa-shield-halved' : 'fa-circle-info';
  const boton = v.modo === 'pedir' || v.modo === 'rechazada'
    ? '<button type="button" class="btn btn-ghost" data-pedir-oficial><i class="fa-solid fa-paper-plane"></i> Pedir que sea oficial</button>'
    : v.modo === 'pendiente' ? '<button type="button" class="btn btn-ghost" data-retirar-pedido><i class="fa-solid fa-xmark"></i> Retirar el pedido</button>' : '';
  return `<div class="to-premio to-oficial-pedido" data-modo="${esc(v.modo)}"><p><i class="fa-solid ${icono}" aria-hidden="true"></i> <b>${esLiga(st.t.formato) ? 'Liga casual' : 'Torneo casual'}.</b> ${esc(v.texto)}</p>${boton}</div>`;
}
function pedidoStaffHTML() {
  if (!staffVePedido(st.sol, esStaffLiga())) return '';
  const quien = st.nombres[st.sol.solicitante] ?? 'El organizador';
  return `<div class="to-premio to-oficial-pedido" data-modo="staff"><p><i class="fa-solid fa-inbox" aria-hidden="true"></i> <b>${esc(quien)} pide que sea oficial.</b>${st.sol.nota ? ` «${esc(st.sol.nota)}»` : ''}</p>
    <p class="tn-ayuda">Al aceptar, pasa a Liga oficial con sus inscritos y Phoenix Link sube los resultados solo.</p>
    <div class="to-cab-acc"><button type="button" class="btn btn-primary" data-resolver-pedido="si"><i class="fa-solid fa-check"></i> Aceptar</button>
    <button type="button" class="btn btn-ghost" data-resolver-pedido="no"><i class="fa-solid fa-xmark"></i> Rechazar</button></div></div>`;
}
function bloqueCampeon() {
  const t = st.t; const s = campeonSugerido(t, st.partidos);
  if (t.estado === 'terminado' && t.campeon) return `<section class="glass-panel to-campeon" id="to-campeon"><i class="fa-solid fa-crown" aria-hidden="true"></i><div><span class="fm-etiqueta">Campeón</span><b>${esc(t.campeon)}</b></div></section>`;
  if (t.estado === 'en_curso' && s) return `<p class="to-sugerido"><i class="fa-solid fa-crown" aria-hidden="true"></i> ${s.definitivo ? 'Campeón' : 'Va ganando'}: <b>${esc(s.nombre)}</b></p>`;
  return '';
}
/** Bloque «Torneo premium» del panel del organizador: botón «Hacer premium» (gemas, una vez por torneo) o la lista de lo que ya tiene. */
function premiumHTML() {
  const p = st.prem; if (!p) return '';
  if (p.premium) {
    const ov = new URL(href(`overlay-torneo/?id=${st.t.id}`), location.href).href;
    return `<div class="to-premium"><b><i class="fa-solid fa-crown" aria-hidden="true"></i> Torneo premium</b>
    <p class="tn-ayuda"><b>Overlay de transmisión:</b> en OBS o TikTok LIVE Studio añade una «fuente de navegador» de 1080 × 1920 con este enlace. Se actualiza solo cada 15 segundos con el último resultado, los próximos partidos y el campeón.</p>
    <div class="to-fila"><input class="field" readonly value="${esc(ov)}" aria-label="Enlace del overlay"><button type="button" class="btn btn-ghost" data-copiar-overlay="${esc(ov)}"><i class="fa-solid fa-copy"></i> Copiar</button><a class="btn btn-ghost" href="${esc(ov)}" target="_blank" rel="noopener">Ver</a></div>
    <p class="tn-ayuda"><b>Resultados automáticos:</b> cuando el host juega con Phoenix Link, el marcador llega solo aquí y tú solo lo confirmas${formatoAuto(st.t.formato) ? '' : ' (este formato todavía no: solo llaves, doble eliminación, todos contra todos, ida y vuelta, grupos y suizo)'}.</p>
    <p class="tn-ayuda">Llaves de pantalla completa, estadísticas y página propia llegan después.</p></div>`;
  }
  if (!p.puede) return '';
  return `<div class="to-premium"><b><i class="fa-solid fa-crown" aria-hidden="true"></i> Torneo premium</b>
    <p class="tn-ayuda">Una sola vez por torneo, con gemas. Desbloquea los <b>resultados automáticos con Phoenix Link</b> (el marcador llega solo y tú lo confirmas), el overlay de transmisión, las llaves de pantalla completa, las estadísticas y una página propia. No cambia las reglas ni da ventajas en el juego.</p>
    <button type="button" class="btn btn-primary" data-hacer-premium><i class="fa-solid fa-gem" aria-hidden="true"></i> Hacer premium · ${p.precioGemas.toLocaleString('es-PE')} gemas</button></div>`;
}
function panelOrganizador() {
  if (!gestiona() || ['terminado', 'cancelado'].includes(st.t.estado)) return '';
  const t = st.t; const c = t.config ?? {};
  const cerrar = t.estado === 'en_curso' ? '<button type="button" class="btn btn-primary" data-cerrar-torneo><i class="fa-solid fa-flag-checkered"></i> Cerrar torneo y coronar</button>' : '';
  return plegable('Opciones del organizador', 'fa-sliders', 'Editar, cerrar o cancelar', `${premiumHTML()}<form id="to-editar" class="space-y-3">
    <label class="tn-campo" for="te-nombre">Nombre</label><input id="te-nombre" name="nombre" class="field" maxlength="80" required value="${esc(t.nombre)}">
    <label class="tn-campo" for="te-desc">Descripción</label><textarea id="te-desc" name="descripcion" rows="3" maxlength="2000" class="field">${esc(t.descripcion ?? '')}</textarea>
    <div class="tn-rejilla"><div><label class="tn-campo" for="te-vis">Quién lo ve</label><select id="te-vis" name="visibilidad" class="field">${['publico', 'enlace', 'privado'].map((v) => `<option value="${v}"${t.visibilidad === v ? ' selected' : ''}>${{ publico: 'Público', enlace: 'Solo con enlace', privado: 'Privado' }[v]}</option>`).join('')}</select></div>
    <div><label class="tn-campo" for="te-cupo">Cupo</label><input id="te-cupo" name="cupo" type="number" min="2" max="2048" class="field" value="${t.cupo ?? ''}"></div></div>
    <label class="tn-check"><input type="checkbox" name="abierta"${t.inscripcion_abierta ? ' checked' : ''}> Inscripción abierta</label>
    <label class="tn-check"><input type="checkbox" name="reportan"${c.reportan_jugadores !== false ? ' checked' : ''}> Los jugadores anotan sus resultados</label>
    <label class="tn-campo" for="te-premio">Premio</label><input id="te-premio" name="premio" class="field" maxlength="120" value="${esc(c.premio ?? '')}">
    <label class="tn-campo" for="te-reglas">Reglas propias</label><textarea id="te-reglas" name="reglas" rows="3" maxlength="1500" class="field">${esc(c.reglas_extra ?? '')}</textarea>
    <label class="tn-campo" for="te-enlace">Enlace de sala o transmisión</label><input id="te-enlace" name="enlace" class="field" maxlength="300" value="${esc(c.enlace ?? '')}">
    <div class="to-fila"><button class="btn btn-primary">Guardar cambios</button>${cerrar}<button type="button" class="btn btn-ghost to-peligro" data-cancelar-torneo><i class="fa-solid fa-ban"></i> Cancelar torneo</button></div></form>`);
}

function pintar() {
  const t = st.t;
  if (!t) { raiz.innerHTML = '<p class="tn-vacio">No encontramos ese torneo. Puede que sea privado o que ya no exista.</p>'; return; }
  const prog = t.estado === 'en_curso' && st.partidos.length ? `<div class="to-barra" role="progressbar" aria-valuenow="${progreso(st.partidos).pct}" aria-valuemin="0" aria-valuemax="100"><span style="width:${progreso(st.partidos).pct}%"></span></div><p class="tn-ayuda">${progreso(st.partidos).jugados} de ${st.partidos.length} partidos jugados</p>` : '';
  const cuerpo = t.estado === 'inscripcion' ? cuerpoInscripcion() : (t.estado === 'cancelado' ? '<p class="tn-vacio">Este torneo fue cancelado.</p>' : `<section class="glass-panel to-panel">${prog}${cuerpoEnCurso()}</section>`);
  const reglas = t.config?.reglas_extra ? plegable('Reglas del organizador', 'fa-scroll', '', `<p class="to-reglas">${esc(t.config.reglas_extra)}</p>`) : '';
  const bit = (gestiona() && st.eventos.length) ? plegable('Bitácora', 'fa-clock-rotate-left', 'Quién hizo qué', `<ul class="to-hist">${st.eventos.map((e) => `<li>${esc(new Date(e.creado_en).toLocaleString('es-PE', { dateStyle: 'short', timeStyle: 'short' }))} · ${esc(st.nombres[e.usuario] ?? '—')} · ${esc(e.tipo)}</li>`).join('')}</ul>`) : '';
  raiz.innerHTML = `${cabecera()}${bloqueCampeon()}${resultadosLinkHTML()}${cuerpo}
    ${plegable('¿Cómo funciona este formato?', 'fa-circle-question', formatoFicha(t.formato)?.nombre ?? '', guiaFormatoHTML(t.formato))}
    ${plegable('Dinámicas de este torneo', 'fa-face-grin-squint-tears', `${dins().length} activas`, dinamicasActivasHTML(dins()))}
    ${reglas}${panelOrganizador()}${bit}${plegable('Leyenda', 'fa-book', 'Estados y visibilidad', leyendaHTML())}`;
  rellenarPatrocinios(raiz);
}

// ── Carga ──────────────────────────────────────────────────────────────────────────────────────────────────────────────
async function cargar({ silencioso = false } = {}) {
  if (st.cargando) return; st.cargando = true;
  try {
    st.t = await api.leerTorneo(id);
    if (st.t) {
      [st.insc, st.partidos] = await Promise.all([api.inscritosDe([id]), api.partidosDe(id)]);
      st.prem = await api.premiumInfo(id);
      st.eventos = (st.yo && (st.t.creador === st.yo || can('gestionarTorneos'))) ? await api.eventosDe(id).catch(() => []) : [];
      [st.auto, st.link] = await Promise.all([api.autoDe(id), api.resultadosLinkDe(id)]);
      st.sol = (st.yo && ligaApta(st.t, st.auto?.origen ?? null) && (st.t.creador === st.yo || can('editarLiga'))) ? await api.solicitudOficialDe(id) : null;
      st.nombres = await api.nombresDe([st.t.creador, ...st.eventos.map((e) => e.usuario), ...(st.sol?.solicitante ? [st.sol.solicitante] : [])]);
    }
    const abiertos = [...raiz.querySelectorAll('details[open]')].map((d) => d.querySelector('summary b')?.textContent);
    pintar();
    raiz.querySelectorAll('details.plegable').forEach((d) => { if (abiertos.includes(d.querySelector('summary b')?.textContent)) d.open = true; });
    if (st.t) document.title = `${st.t.nombre} · Torneos`;
  } catch (err) { if (!silencioso) raiz.innerHTML = `<p class="tn-vacio">${esc(err.message)}</p>`; } finally { st.cargando = false; }
}
async function hacer(fn, ok) {
  try { await fn(); if (ok) toast(ok, 'ok'); } catch (err) { toast(err.message, 'error'); }
  await cargar({ silencioso: true });
}

// ── Acciones ───────────────────────────────────────────────────────────────────────────────────────────────────────────
async function empezar() {
  const t = st.t; let nombres = limpiarJugadores(st.insc.map((i) => i.nombre), 256);
  if (t.config?.sortear) nombres = mezclar(nombres, Date.now() % 1e6);
  let plan;
  if (t.formato === 'libre') plan = { ok: true, partidos: [], meta: { tipo: 'libre', formato: 'libre' }, estado: {} };
  else {
    const op = { tercerPuesto: Boolean(t.config?.tercerPuesto), grupos: t.config?.grupos || undefined, maxRacha: t.config?.maxRacha || 3, sinTope: Boolean(t.config?.sinTope) };
    const v = validarFormato(t.formato, nombres.length, { sinTope: op.sinTope });
    if (!v.ok) { toast(v.motivo, 'warn'); return; }
    plan = construirPlan(generar(t.formato, nombres, op));
    if (plan.ok && t.formato === 'escalera') plan.estado.alcance = t.config?.alcance || 3;
  }
  if (!plan.ok) { toast(plan.motivo, 'warn'); return; }
  const ok = await confirmar(`Se cerrará la inscripción y se armarán ${plan.partidos.length} partidos con ${nombres.length} jugadores. ¿Empezar?`, { titulo: 'Empezar torneo', aceptar: 'Empezar' });
  if (!ok) return;
  await hacer(() => api.iniciar(id, plan), '¡Torneo en marcha!');
}
async function guardarResultado(form) {
  const clave = form.dataset.formRes; const p = st.partidos.find((x) => x.clave === clave); const d = new FormData(form);
  const ga = Number(d.get('ga')); const gb = Number(d.get('gb'));
  await hacer(() => api.resultado(id, clave, ga, gb, ga === gb ? (d.get('ganador') ?? null) : null), p?.jugado ? 'Resultado corregido.' : 'Resultado guardado.');
}
async function accionColina(ganador) {
  const nuevo = jugarColina(st.t.estado_juego, ganador);
  await hacer(() => api.guardarEstado(id, nuevo, `Gana ${ganador}`));
}
async function accionEscalera(form) {
  const d = new FormData(form); const e = st.t.estado_juego; const a = d.get('a'); const b = d.get('b'); const g = d.get('g') === 'a' ? a : b;
  const r = retarEscalera(e.orden, a, b, g, { alcance: e.alcance ?? 3 });
  if (!r.ok) { toast(r.motivo, 'warn'); return; }
  const nuevo = { ...e, orden: r.orden, retos: [...(e.retos ?? []), { retador: a, retado: b, ganador: g, cambio: r.cambio }] };
  await hacer(() => api.guardarEstado(id, nuevo, `Reto ${a} vs ${b}`), r.cambio ? '¡Sube en la escalera!' : 'Reto anotado.');
}
async function accionCircuito(form) {
  const d = new FormData(form);
  const r = agregarFechaCircuito(st.t.estado_juego, String(d.get('nombre') ?? '').trim(), String(d.get('puestos') ?? '').split('\n'));
  if (!r.ok) { toast(r.motivo, 'warn'); return; }
  await hacer(() => api.guardarEstado(id, r.estado, 'Nueva fecha'), 'Fecha añadida.');
}
async function accionLibre(form) {
  const d = new FormData(form); const a = String(d.get('a')).trim(); const b = String(d.get('b')).trim();
  if (!a || !b || nombresEq(a, b)) { toast('Elige dos nombres distintos.', 'warn'); return; }
  const clave = `L${Date.now().toString(36)}`; const orden = Math.max(0, ...st.partidos.map((p) => p.orden)) + 1;
  await hacer(() => api.agregarPartidos(id, [{ clave, ronda: String(d.get('ronda') ?? '').trim() || 'Partidos', orden, a, b, eliminatoria: false }]), 'Partido añadido.');
}
async function cerrarGrupos() {
  const c = crucesDePuestos(st.partidos);
  await hacer(() => api.fijarCruces(id, c), 'Cruces de playoffs listos.');
}
async function siguienteSuizo() {
  const nombres = st.insc.map((i) => i.nombre);
  const r = siguienteRondaSuizo(st.partidos, nombres, st.t.estado_juego, st.t.meta?.totalRondas);
  if (!r.ok) { toast(r.motivo, 'warn'); return; }
  if (r.repetidos) toast('Aviso: en esta ronda alguien repite rival (no había otra opción).', 'info');
  await hacer(async () => { await api.agregarPartidos(id, r.partidos); await api.guardarEstado(id, r.estado, `Ronda ${r.ronda}`); }, `Ronda ${r.ronda} lista.`);
}
async function cerrarTorneo() {
  const s = campeonSugerido(st.t, st.partidos);
  const nombre = await pedirTexto('¿Quién es el campeón? Puedes cambiar el nombre.', { titulo: 'Cerrar torneo', valor: s?.nombre ?? '', maximo: 60, obligatorio: false, aceptar: 'Coronar' });
  if (nombre === null) return;
  await hacer(() => api.cerrar(id, nombre), '¡Torneo terminado!');
  const el = document.getElementById('to-campeon'); if (el) { try { rafaga(el, '🏆', { n: 14 }); } catch { /* sin efectos */ } }
}
async function guardarEdicion(form) {
  const d = new FormData(form); const t = st.t;
  const config = { ...(t.config ?? {}), reportan_jugadores: d.has('reportan'), premio: String(d.get('premio') ?? '').trim() || null, reglas_extra: String(d.get('reglas') ?? '').trim() || null, enlace: String(d.get('enlace') ?? '').trim() || null };
  await hacer(() => api.editar(id, { nombre: String(d.get('nombre')).trim(), descripcion: String(d.get('descripcion') ?? '').trim() || null, config, visibilidad: String(d.get('visibilidad')), cupo: d.get('cupo') ? Number(d.get('cupo')) : null, inscripcion_abierta: d.has('abierta'), inicia: t.inicia }), 'Cambios guardados.');
}

raiz.addEventListener('click', async (e) => {
  const b = e.target.closest('button'); if (!b) return;
  if (b.dataset.unirme !== undefined) await hacer(() => api.inscribirse(id), '¡Estás dentro!');
  else if (b.dataset.salir !== undefined) await hacer(() => api.salir(id), 'Saliste del torneo.');
  else if (b.dataset.quitarJ) { if (await confirmar('¿Quitar a este jugador?', { aceptar: 'Quitar', peligro: true })) await hacer(() => api.quitarJugador(id, Number(b.dataset.quitarJ))); }
  else if (b.dataset.empezar !== undefined) await empezar();
  else if (b.dataset.anotar) { const p = st.partidos.find((x) => x.clave === b.dataset.anotar); const li = b.closest('.to-partido'); if (p && li) { li.querySelector('.to-ctl').innerHTML = formularioResultado(p); li.querySelector('input')?.focus(); } }
  else if (b.dataset.cancelarRes !== undefined) b.closest('.to-ctl').innerHTML = '';
  else if (b.dataset.quitar) { if (await confirmar('¿Quitar este resultado? El cruce vuelve a quedar pendiente.', { aceptar: 'Quitar', peligro: true })) await hacer(() => api.quitarResultado(id, b.dataset.quitar), 'Resultado quitado.'); }
  else if (b.dataset.colina) await accionColina(b.dataset.colina);
  else if (b.dataset.cerrarGrupos !== undefined) await cerrarGrupos();
  else if (b.dataset.sigSuizo !== undefined) await siguienteSuizo();
  else if (b.dataset.cerrarTorneo !== undefined) await cerrarTorneo();
  else if (b.dataset.copiarOverlay) { try { await navigator.clipboard.writeText(b.dataset.copiarOverlay); toast('Enlace del overlay copiado.', 'ok'); } catch { toast('No se pudo copiar: selecciónalo y cópialo a mano.', 'info'); } }
  else if (b.dataset.hacerPremium !== undefined) { if (await confirmar(`¿Hacer premium este torneo por ${st.prem?.precioGemas ?? ''} gemas? Se paga una sola vez y no se devuelve automáticamente.`, { aceptar: 'Hacer premium', cancelar: 'Volver' })) await hacer(() => api.hacerPremium(id), '¡Tu torneo ahora es premium!'); }
  else if (b.dataset.cancelarTorneo !== undefined) { if (await confirmar('¿Cancelar el torneo? Ya no se podrá seguir jugando.', { aceptar: 'Cancelar torneo', cancelar: 'Volver', peligro: true })) await hacer(() => api.cancelar(id), 'Torneo cancelado.'); }
  else if (b.dataset.hacerOficial !== undefined) { if (await confirmar('Se pasa a la liga oficial con sus inscritos. Desde ahí sigue la inscripción, se genera el calendario y Phoenix Link manda los resultados (los valida el staff). Aquí ya no se podrá empezar ni anotar.', { titulo: 'Hacer oficial', aceptar: 'Hacer oficial' })) await hacer(() => api.hacerOficial(id), 'Ahora es oficial. Sigue en Liga oficial.'); }
  else if (b.dataset.pedirOficial !== undefined) await pedirOficial();
  else if (b.dataset.retirarPedido !== undefined) { if (await confirmar('¿Retirar el pedido? La liga sigue casual y podrás volver a pedirlo cuando quieras.', { aceptar: 'Retirar', cancelar: 'Volver' })) await hacer(() => api.cancelarSolicitudOficial(id), 'Pedido retirado.'); }
  else if (b.dataset.resolverPedido) await resolverPedido(b.dataset.resolverPedido === 'si');
  else if (b.dataset.linkOk) await confirmarLink(Number(b.dataset.linkOk));
  else if (b.dataset.linkNo) await rechazarLink(Number(b.dataset.linkNo));
  else if (b.dataset.autoStaff) await autoStaff(b.dataset.autoStaff === 'si');
  else if (b.dataset.calTorneo !== undefined) abrirCalendario([{ uid: `torneo-${st.t.id}`, titulo: `Torneo: ${st.t.nombre}`, inicio: st.t.inicia, minutos: 120,
    descripcion: st.t.descripcion ?? '', url: location.href.split('#')[0] }], { titulo: 'Añadir el torneo a mi calendario', archivo: `torneo-${st.t.id}` });
  else if (b.dataset.copiar !== undefined) { try { await navigator.clipboard.writeText(location.href); toast('Enlace copiado.', 'ok'); } catch { toast('No se pudo copiar. Copia la dirección de la barra.', 'warn'); } }
});
// ── Resultados de Phoenix Link (migración 145) ─────────────────────────────────────────────────────────────────────────
async function confirmarLink(propId) {
  const r = st.link.find((x) => x.id === propId); const p = r && st.partidos.find((x) => x.clave === r.clave); if (!r || !p) return;
  const sel = raiz.querySelector(`[data-ganador-link="${propId}"]`);
  const v = vistaPropuesta(r, p);
  if (!(await confirmar(`¿Confirmar ${p.a_nombre} ${v.marcador} ${p.b_nombre}? Se guarda en el cuadro como si lo hubieras anotado tú.`, { titulo: 'Confirmar resultado', aceptar: 'Confirmar' }))) return;
  await hacer(() => api.resolverResultadoLink(propId, true, sel ? sel.value : null), 'Resultado confirmado.');
}
async function rechazarLink(propId) {
  const m = await pedirTexto('¿Por qué no vale? (opcional). Luego puedes anotar el resultado correcto a mano.', { titulo: 'Rechazar resultado de Link', maximo: MAX_TEXTO, obligatorio: false, aceptar: 'Rechazar' });
  if (m === null) return;
  await hacer(() => api.resolverResultadoLink(propId, false, null, m.trim() || null), 'Resultado rechazado. Anótalo a mano si hace falta.');
}
async function autoStaff(activar) {
  const texto = activar
    ? 'El torneo queda OFICIAL: Phoenix Link manda los resultados y el staff los confirma. Sigue en esta página.'
    : '¿Quitar el carácter oficial? Los resultados vuelven a anotarse a mano (lo ya jugado no cambia).';
  if (!(await confirmar(texto, { titulo: activar ? 'Hacer oficial' : 'Quitar oficial', aceptar: activar ? 'Hacer oficial' : 'Quitar', peligro: !activar }))) return;
  await hacer(() => api.staffResultadosAuto(id, activar), activar ? 'Ahora es oficial.' : 'Ya no es oficial.');
}
// ── Pedido para hacer oficial (migración 144) ──────────────────────────────────────────────────────────────────────────
async function pedirOficial() {
  const nota = await pedirTexto('Si quieres, cuéntale al staff algo de tu liga (cuántos son, cuándo juegan). Puedes dejarlo vacío.', { titulo: 'Pedir que sea oficial', maximo: MAX_TEXTO, obligatorio: false, aceptar: 'Enviar pedido' });
  if (nota === null) return;
  try { await hacer(() => api.solicitarOficial(id, limpiarNota(nota)), 'Pedido enviado. Te llegará un aviso cuando el staff responda.'); } catch (err) { toast(err.message, 'error'); }
}
async function resolverPedido(aceptar) {
  const sol = st.sol; if (!sol) return;
  if (aceptar) {
    if (!(await confirmar('Se pasa a Liga oficial con sus inscritos. Desde ahí sigue la inscripción, se genera el calendario y Phoenix Link manda los resultados. Aquí ya no se podrá empezar ni anotar.', { titulo: 'Aceptar el pedido', aceptar: 'Hacerla oficial' }))) return;
    await hacer(() => api.staffResolverSolicitud(sol.id, true), 'Ahora es oficial. Sigue en Liga oficial.');
    return;
  }
  const motivo = await pedirTexto('¿Por qué no? Lo leerá quien lo pidió (por ejemplo: faltan reglas, pocos inscritos).', { titulo: 'Rechazar el pedido', maximo: MAX_TEXTO, aceptar: 'Rechazar' });
  if (motivo === null) return;
  let limpio; try { limpio = validarMotivo(motivo); } catch (err) { toast(err.message, 'warn'); return; }
  await hacer(() => api.staffResolverSolicitud(sol.id, false, limpio), 'Pedido rechazado. Se le avisó con tu motivo.');
}

raiz.addEventListener('submit', async (e) => {
  e.preventDefault(); const f = e.target;
  if (f.dataset.formRes) await guardarResultado(f);
  else if (f.id === 'to-agregar') { const n = String(new FormData(f).get('nombre')).trim(); if (n) await hacer(() => api.agregarJugador(id, n), 'Jugador añadido.'); }
  else if (f.id === 'to-escalera') await accionEscalera(f);
  else if (f.id === 'to-circuito') await accionCircuito(f);
  else if (f.id === 'to-libre') await accionLibre(f);
  else if (f.id === 'to-editar') await guardarEdicion(f);
});

onSession((s) => { const nuevo = s.session?.user?.id ?? null; if (nuevo !== st.yo || !st.t) { st.yo = nuevo; if (Number.isFinite(id) && id > 0) cargar(); else pintar(); } });
setInterval(() => { if (document.hidden || !st.t || st.t.estado === 'terminado' || raiz.querySelector('.to-ctl form, input:focus, textarea:focus, select:focus')) return; cargar({ silencioso: true }); }, 30000);

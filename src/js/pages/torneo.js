// Página de UN torneo propio: inscripción, empezar, resultados con avance automático, tablas, suizo/grupos/colina/escalera/circuito, cierre.
// La lógica pura está en core/torneos.js y core/formatos.js; los datos en features/torneos/api.js (migración 097).
import { onSession, can } from '../core/session.js';
import { toast } from '../core/toast.js';
import { confirmar, pedirTexto } from '../core/dialogo.js';
import { escapeHTML as esc, safeUrl } from '../core/dom.js';
import { href } from '../core/config.js';
import { generar, mezclar, validarFormato, jugarColina, retarEscalera, limpiarJugadores } from '../core/formatos.js';
import { construirPlan, tablaTorneo, crucesDePuestos, estadoSuizo, siguienteRondaSuizo, campeonSugerido, agregarFechaCircuito, tablaCircuito, porRonda, etiquetaLado, progreso } from '../core/torneos.js';
import { reglaDelPartido, castigoDelPartido } from '../core/diversion.js';
import { REGLAS_RULETA } from '../../data/modalidades.js';
import * as api from '../features/torneos/api.js';
import { formatoFicha, guiaFormatoHTML, dinamicasActivasHTML, leyendaHTML, ESTADO_TXT } from '../features/torneos/guia.js';
import { rafaga } from '../features/dopamina.js';

const raiz = document.getElementById('to-raiz');
const id = Number(new URLSearchParams(location.search).get('id'));
const st = { yo: null, t: null, insc: [], partidos: [], nombres: {}, eventos: [], cargando: false };

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
    <span class="tn-pill"><i class="fa-solid ${esc(f?.icono ?? 'fa-trophy')}" aria-hidden="true"></i> ${esc(f?.nombre ?? t.formato)}</span>${t.oculto ? '<span class="tn-pill tn-alerta">Oculto por el staff</span>' : ''}</div>
    <h1>${esc(t.nombre)}</h1><p class="to-por">Organiza <b>${esc(st.nombres[t.creador] ?? 'un jugador')}</b>${t.inicia ? ` · Empieza ${esc(new Date(t.inicia).toLocaleString('es-PE', { dateStyle: 'medium', timeStyle: 'short' }))}` : ''}</p>
    ${t.descripcion ? `<p class="to-desc">${esc(t.descripcion)}</p>` : ''}
    ${t.config?.premio ? `<p class="to-premio"><i class="fa-solid fa-gift" aria-hidden="true"></i> Premio: ${esc(t.config.premio)}</p>` : ''}
    <div class="to-cab-acc"><button type="button" class="btn btn-ghost" data-copiar><i class="fa-solid fa-link"></i> Copiar enlace</button>${enlace ? `<a class="btn btn-ghost" href="${esc(enlace)}" target="_blank" rel="noopener noreferrer"><i class="fa-solid fa-video"></i> Sala / transmisión</a>` : ''}</div></header>`;
}
function bloqueCampeon() {
  const t = st.t; const s = campeonSugerido(t, st.partidos);
  if (t.estado === 'terminado' && t.campeon) return `<section class="glass-panel to-campeon" id="to-campeon"><i class="fa-solid fa-crown" aria-hidden="true"></i><div><span class="fm-etiqueta">Campeón</span><b>${esc(t.campeon)}</b></div></section>`;
  if (t.estado === 'en_curso' && s) return `<p class="to-sugerido"><i class="fa-solid fa-crown" aria-hidden="true"></i> ${s.definitivo ? 'Campeón' : 'Va ganando'}: <b>${esc(s.nombre)}</b></p>`;
  return '';
}
function panelOrganizador() {
  if (!gestiona() || ['terminado', 'cancelado'].includes(st.t.estado)) return '';
  const t = st.t; const c = t.config ?? {};
  const cerrar = t.estado === 'en_curso' ? '<button type="button" class="btn btn-primary" data-cerrar-torneo><i class="fa-solid fa-flag-checkered"></i> Cerrar torneo y coronar</button>' : '';
  return plegable('Opciones del organizador', 'fa-sliders', 'Editar, cerrar o cancelar', `<form id="to-editar" class="space-y-3">
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
  raiz.innerHTML = `${cabecera()}${bloqueCampeon()}${cuerpo}
    ${plegable('¿Cómo funciona este formato?', 'fa-circle-question', formatoFicha(t.formato)?.nombre ?? '', guiaFormatoHTML(t.formato))}
    ${plegable('Dinámicas de este torneo', 'fa-face-grin-squint-tears', `${dins().length} activas`, dinamicasActivasHTML(dins()))}
    ${reglas}${panelOrganizador()}${bit}${plegable('Leyenda', 'fa-book', 'Estados y visibilidad', leyendaHTML())}`;
}

// ── Carga ──────────────────────────────────────────────────────────────────────────────────────────────────────────────
async function cargar({ silencioso = false } = {}) {
  if (st.cargando) return; st.cargando = true;
  try {
    st.t = await api.leerTorneo(id);
    if (st.t) {
      [st.insc, st.partidos] = await Promise.all([api.inscritosDe([id]), api.partidosDe(id)]);
      st.eventos = (st.yo && (st.t.creador === st.yo || can('gestionarTorneos'))) ? await api.eventosDe(id).catch(() => []) : [];
      st.nombres = await api.nombresDe([st.t.creador, ...st.eventos.map((e) => e.usuario)]);
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
  else if (b.dataset.cancelarTorneo !== undefined) { if (await confirmar('¿Cancelar el torneo? Ya no se podrá seguir jugando.', { aceptar: 'Cancelar torneo', cancelar: 'Volver', peligro: true })) await hacer(() => api.cancelar(id), 'Torneo cancelado.'); }
  else if (b.dataset.copiar !== undefined) { try { await navigator.clipboard.writeText(location.href); toast('Enlace copiado.', 'ok'); } catch { toast('No se pudo copiar. Copia la dirección de la barra.', 'warn'); } }
});
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

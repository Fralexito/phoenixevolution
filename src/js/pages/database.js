// Base de Datos Global: lista, filtro por club, búsqueda; admin puede añadir/editar/borrar.
import { supabase } from '../core/supabase.js';
import { onSession, isAdmin } from '../core/session.js';
import { escapeHTML } from '../core/dom.js';
import { posInfo } from '../../data/posiciones.js';
import { href } from '../core/config.js';
import { leerAjustes, hayMovimientoReducido } from '../features/ajustes.js';
import { toast } from '../core/toast.js';
import { playerCardHTML } from '../features/playerCard.js';
import { openPlayerForm } from '../features/playerForm.js';
import { openCompare } from '../features/compare.js';
import { MAX_COMPARE } from '../core/compare.js';
import { norm } from '../core/search.js';
import { nivelPorDefecto, nivelValido, cambiarNivel, anchoMinimo, separacion, esDenso, esUltimo } from '../core/density.js';
import { rankPlayers } from '../core/ranking.js';
import { agruparPorEstilo, agruparPorNivel, ordenar, statsLiga, CRITERIOS } from '../core/destacados.js';
import { montarReconocimientos } from '../features/reconocimientos.js';
import { EDICIONES } from '../../data/ligaResultados.js';
import { LIGAS } from '../../data/ligas.js';
import { mountAdvanced } from '../features/advancedSearch.js';
import { openStatLegend } from '../features/statLegend.js';
import { construirIndice, opcionesFiltro, filtrarJugadores, divisionActual } from '../core/participaciones.js';
import { SISTEMA } from '../../data/temporada.js';

const $ = (id) => document.getElementById(id);
let all = [];
let club = 'ALL';
let fLiga = ''; let fTorneo = ''; let fTemp = '';   // filtros de participación (liga, torneo, temporada)
let indice = new Map();                           // jugadorId → participaciones (core/participaciones.js)
let hitsPorId = new Map(); let divPorId = new Map();
let term = '';
let vista = 'plano';      // 'plano' | 'estilo' | 'nivel'
let orden = 'media';      // criterio del orden «Todos» (ver CRITERIOS)
const semilla = Math.floor(Math.random() * 1e9);   // «Aleatorio» se mantiene estable mientras no recargues
let ligaStats = new Map();
const edicionActual = () => (EDICIONES[LIGAS[0]?.id] ?? []).at(-1) ?? null;
const encabezado = (g) => `<div class="col-span-full flex items-center gap-3 pt-3"><i class="fa-solid ${g.icono} text-galaxy-400"></i><h2 class="font-display font-bold text-lg text-white uppercase tracking-widest">${escapeHTML(g.nombre)}</h2><span class="text-xs text-gray-400">${g.jugadores.length}</span><span class="flex-1 h-px bg-galaxy-line"></span></div>`;
const sel = []; // ids marcados para comparar (máx. 8; en el comparador se reparten en equipos A y B)

let adv = null;   // búsqueda avanzada activa: { keys, min, top } o null

/** Etiquetas «club · liga · torneo · temporada» de las participaciones que hicieron aparecer al jugador (para distinguir a quien eligió el mismo equipo en otra temporada). */
function tirasHist(p) {
  const hits = hitsPorId.get(p.id) ?? []; if (!hits.length) return '';
  const una = (h) => `<li><b>${escapeHTML(h.club || '—')}</b><span>${escapeHTML(h.liga)}</span>${h.torneo ? `<span>${escapeHTML(h.torneo)}</span>` : ''}${h.temporada ? `<span class="hist-anio">${escapeHTML(h.temporada)}</span>` : ''}</li>`;
  return `<ul class="hist-tiras" aria-label="Participaciones que coinciden">${hits.slice(0, 3).map(una).join('')}${hits.length > 3 ? `<li class="hist-mas">+${hits.length - 3} más</li>` : ''}</ul>`;
}
function tarjeta(p, i, extra = '') {
  const admin = isAdmin(); const niv = divPorId.get(p.id); const dv = SISTEMA.divisiones.find((d) => d.nivel === niv);
  const insignia = dv ? `<span class="div-badge div-${niv} ${admin ? 'div-admin' : ''}" title="${escapeHTML(dv.nombre)}"><b>L${niv}</b><span>${escapeHTML(dv.nombre)}</span></span>` : '';
  return `<div data-pcw="${escapeHTML(p.id)}" style="--aura:${posInfo(p.posicion).color}" class="pcw relative group/card ${sel.includes(p.id) ? 'cmp-sel' : ''}">${playerCardHTML(p, i)}${insignia}${tirasHist(p)}${extra}
        <button type="button" data-cmp="${escapeHTML(p.id)}" aria-pressed="${sel.includes(p.id)}" aria-label="Comparar a ${escapeHTML(p.nombre)}" title="Comparar" class="cmp-btn"><i class="fa-solid fa-scale-balanced"></i></button>
        <a href="${href(`jugador/?id=${encodeURIComponent(p.id)}`)}" aria-label="Ver perfil de ${escapeHTML(p.nombre)}" title="Ver perfil" class="cmp-btn perfil-btn"><i class="fa-solid fa-id-card"></i></a>${admin ? `
        <button type="button" data-menu="${escapeHTML(p.id)}" aria-label="Opciones de la ficha" aria-haspopup="true" class="card-menu-btn"><i class="fa-solid fa-ellipsis"></i></button>
        <div class="card-menu" data-menu-for="${escapeHTML(p.id)}" hidden>
          <button type="button" data-edit="${escapeHTML(p.id)}"><i class="fa-solid fa-pen mr-2"></i>Editar</button>
          <button type="button" data-del="${escapeHTML(p.id)}" class="text-bad"><i class="fa-solid fa-trash mr-2"></i>Borrar</button>
        </div>` : ''}</div>`;
}

function paint() {
  try { fijarFoco(null); } catch { $('players-container').dataset.foco = 'false'; }   // al repintar (filtros, orden…) se quita el foco y la réplica
  const res = filtrarJugadores(all, indice, { liga: fLiga, torneo: fTorneo, temporada: fTemp, club: club === 'ALL' ? '' : club, term });
  hitsPorId = new Map(res.map((r) => [r.p.id, r.hits])); const list = res.map((r) => r.p);
  paintResumenHist();
  const box = $('players-container');
  if (adv) {
    // Modo ranking: mismos filtros (equipo y nombre), ordenados por el promedio de las stats elegidas.
    const r = rankPlayers(list, adv.keys, { min: adv.min, top: adv.top });
    box.innerHTML = r.length ? r.map((f, i) => tarjeta(f.p, i, `<span class="rank-badge" title="Puesto ${f.rank}">#${f.rank}</span>`)
      .replace(/<\/div>$/, `<div class="adv-strip">${adv.keys.map((k) => `<span>${k === 'ovr' ? 'MEDIA' : k.toUpperCase()} <b>${f.vals[k]}</b></span>`).join('')}${adv.keys.length > 1 ? `<span class="adv-prom">prom <b>${Math.round(f.score * 10) / 10}</b></span>` : ''}</div></div>`)).join('')
      : `<div class="col-span-full text-center py-10 text-gray-500 text-sm">Ningún jugador cumple ese mínimo en todas las stats elegidas.</div>`;
  } else {
    let n = 0;
    const grupos = vista === 'estilo' ? agruparPorEstilo(list) : vista === 'nivel' ? agruparPorNivel(list) : null;
    box.innerHTML = !list.length ? `<div class="col-span-full text-center py-10 text-gray-500 text-sm">No hay jugadores que coincidan.</div>`
      : grupos ? grupos.map((g) => encabezado(g) + g.jugadores.map((p) => tarjeta(p, n++)).join('')).join('')
        : ordenar(list, orden, { liga: ligaStats, semilla }).map((p, i) => tarjeta(p, i)).join('');
  }
  paintBar();
}

function paintResumenHist() {
  const act = [fLiga, fTorneo, fTemp].filter(Boolean); $('hist-resumen').textContent = act.length ? `· ${act.join(' · ')}` : ''; $('hist-limpiar').hidden = !act.length;
}
/** Rellena los desplegables de liga, torneo y temporada (y los clubes de TODA la historia) a partir de las participaciones. */
function fillHist() {
  const o = opcionesFiltro(indice); const lleno = (id, vacio, vals, cur) => { const s = $(id); s.innerHTML = `<option value="">${vacio}</option>` + vals.map((v) => `<option value="${escapeHTML(v)}">${escapeHTML(v)}</option>`).join(''); s.value = vals.includes(cur) ? cur : ''; return s.value; };
  fLiga = lleno('f-liga-h', 'Todas', o.ligas, fLiga); fTorneo = lleno('f-torneo-h', 'Todos', o.torneos, fTorneo); fTemp = lleno('f-temp-h', 'Todas', o.temporadas, fTemp);
  divPorId = new Map(all.map((p) => [p.id, divisionActual(indice.get(p.id), SISTEMA.divisiones)]).filter(([, d]) => d));
  return o.clubes;
}
function paintBar() {
  const bar = $('cmp-bar'); bar.hidden = !sel.length;
  $('cmp-bar-txt').textContent = sel.length === 1 ? `${all.find((p) => p.id === sel[0])?.nombre ?? ''} · elige al menos otro` : `${sel.length} jugadores seleccionados`;
  $('cmp-go').disabled = sel.length < 2;        // un solo botón: con 2 abre 1 vs 1; con 3 o más, la masiva (se puede cambiar dentro)
}

function fillClubs(historicos = []) {
  const sel = $('player-filter-select');
  const clubs = [...new Set([...all.map((p) => String(p.club ?? '').toUpperCase()), ...historicos])].filter(Boolean).sort((a, b) => a.localeCompare(b));
  sel.innerHTML = `<option value="ALL">Todos los Equipos</option>` + clubs.map((c) => `<option value="${escapeHTML(c)}">${escapeHTML(c)}</option>`).join('');
  sel.value = clubs.includes(club) ? club : 'ALL'; club = sel.value;
}

let reconMontado = false;
async function load() {
  try {
    const { data, error } = await supabase.from('jugadores').select('*').order('ovr', { ascending: false });
    if (error) throw error;
    all = data ?? []; ligaStats = statsLiga(all, edicionActual());
    let filas = [];
    try {                                          // participaciones de todos (lectura pública); si falla, el filtro sigue con las ediciones de la web
      const r = await supabase.from('participaciones').select('jugador_id, liga, edicion, torneo, temporada, club, periodo'); if (r.error) throw r.error; filas = r.data ?? [];
    } catch (e1) { console.warn('[database] participaciones no disponibles, se usan solo las ediciones de la web:', e1); }
    indice = construirIndice(all, filas, LIGAS, EDICIONES); fillClubs(fillHist()); paint();
    if (!reconMontado) { reconMontado = true; montarReconocimientos($('reconocimientos'), all, edicionActual()); }
  } catch (e) {
    console.error('[database] cargar:', e);
    $('players-container').innerHTML = `<div class="col-span-full text-center py-10 text-bad text-sm"><i class="fa-solid fa-triangle-exclamation mr-2"></i>No se pudo cargar la base de datos. Reintenta en unos segundos.</div>`;
  }
}

$('player-filter-select').addEventListener('change', (e) => { club = e.target.value; paint(); });
for (const [id, set] of [['f-liga-h', (v) => { fLiga = v; }], ['f-torneo-h', (v) => { fTorneo = v; }], ['f-temp-h', (v) => { fTemp = v; }]]) $(id).addEventListener('change', (e) => { set(e.target.value); paint(); });
$('hist-limpiar').addEventListener('click', () => { fLiga = ''; fTorneo = ''; fTemp = ''; ['f-liga-h', 'f-torneo-h', 'f-temp-h'].forEach((id) => { $(id).value = ''; }); paint(); });
$('player-search-input').addEventListener('input', (e) => { term = e.target.value; paint(); });
$('btn-compare').addEventListener('click', () => (all.length < 2 ? toast('Aún no hay suficientes jugadores para comparar.', 'info') : openCompare(all, sel[0], sel[1])));
$('cmp-go').addEventListener('click', () => openCompare(all, sel[0], sel[1], sel.length > 2 ? sel : null));
$('btn-leyenda').addEventListener('click', openStatLegend);
// Vista (Todos / Por estilo / Por nivel) y orden de la vista «Todos».
$('orden-select').innerHTML = CRITERIOS.map(([k, n]) => `<option value="${k}">${n}</option>`).join('');
$('orden-select').addEventListener('change', (e) => { orden = e.target.value; paint(); });
$('vista-seg').addEventListener('click', (e) => {
  const b = e.target.closest('[data-vista]'); if (!b) return; vista = b.dataset.vista;
  $('vista-seg').querySelectorAll('[data-vista]').forEach((x) => x.setAttribute('aria-pressed', String(x === b)));
  $('orden-wrap').hidden = vista !== 'plano'; paint();
});

// ---- Zoom: el usuario elige el TAMAÑO de tarjeta; la cuadrícula (auto-fill) decide cuántas caben y las reparte parejas. ----
// Se recuerda por tipo de pantalla (celular / PC) en este navegador.
const esMovil = () => window.matchMedia('(max-width: 639px)').matches;
const claveZoom = () => (esMovil() ? 'pes-zoom-movil' : 'pes-zoom-pc');
const leerZoom = () => { try { if (!leerAjustes().recordarZoom) return nivelValido(null, esMovil()); return nivelValido(localStorage.getItem(claveZoom()), esMovil()); } catch { return nivelValido(null, esMovil()); } };
let nivel = leerZoom();
function aplicarZoom() {
  const m = esMovil(); nivel = nivelValido(nivel, m);
  const box = $('players-container');
  box.style.gridTemplateColumns = `repeat(auto-fill, minmax(${anchoMinimo(nivel, m)}px, 1fr))`; box.style.gap = `${separacion(nivel, m)}rem`; box.dataset.denso = String(esDenso(nivel, m));
  $('dens-mas').disabled = nivel === 0; $('dens-menos').disabled = esUltimo(nivel, m);
  $('dens-reset').disabled = nivel === nivelPorDefecto(m);          // ya está en el tamaño predeterminado: nada que restablecer
}
const moverZoom = (d) => { nivel = cambiarNivel(nivel, d, esMovil()); if (leerAjustes().recordarZoom) { try { localStorage.setItem(claveZoom(), String(nivel)); } catch { /* sin almacenamiento: solo no se recuerda */ } } aplicarZoom(); };
const restablecerZoom = () => { nivel = nivelPorDefecto(esMovil()); try { localStorage.removeItem(claveZoom()); } catch { /* sin almacenamiento */ } aplicarZoom(); };
$('dens-reset').addEventListener('click', restablecerZoom);
// Sin atajos de teclado ni de rueda: Ctrl + rueda / Ctrl + 0 son del navegador (zoom normal de la página) y NO se tocan. El tamaño de las cartas se cambia solo con los botones − / + / Predeterminado.
$('dens-menos').addEventListener('click', () => moverZoom(1));    // alejar: tarjetas más pequeñas
$('dens-mas').addEventListener('click', () => moverZoom(-1));     // acercar: tarjetas más grandes
window.matchMedia('(max-width: 639px)').addEventListener('change', () => { nivel = leerZoom(); aplicarZoom(); });
aplicarZoom();

// ---- Búsqueda avanzada (panel plegable) ----
mountAdvanced($('adv-panel'), (estado) => { adv = estado; paint(); });
$('btn-avanzada').addEventListener('click', () => { const abrir = $('adv-panel').hidden; $('adv-panel').hidden = !abrir; $('btn-avanzada').setAttribute('aria-expanded', String(abrir)); });
$('cmp-clear').addEventListener('click', () => { sel.length = 0; paint(); });
$('btn-add-player').addEventListener('click', () => openPlayerForm(null, load));
// Menú sutil «⋯» de cada ficha (solo admin): se abre al tocarlo y se cierra al tocar fuera.
const cerrarMenus = () => document.querySelectorAll('.card-menu').forEach((x) => { x.hidden = true; });
document.addEventListener('click', (e) => { if (!e.target.closest('[data-menu], .card-menu')) cerrarMenus(); });
// Foco con RÉPLICA: al hacer clic, la carta ORIGINAL se queda en su lugar (atenuada) y una réplica fija viaja desde ella hasta el
// centro de la zona visible (debajo de la barra superior y encima del dock inferior), crece hasta 1.6× (1.25× en celular) sin
// superar nunca el alto ni el ancho disponibles, y con el mouse se inclina en 3D. Al cerrar, la réplica vuelve a su carta.
// escala = min(máximo, alto libre / alto, ancho libre / ancho). No se mueve el scroll de la página.
let focoId = null;
let replica = null;                       // { capa, origen, dx, dy, s }
const sinMovimiento = () => hayMovimientoReducido();   // ajuste «Animaciones» (por defecto: lo que diga el sistema)
function destinoReplica(r) {
  const vw = window.innerWidth; const vh = window.innerHeight; const movil = esMovil();
  const barra = Math.min(160, Math.max(0, document.querySelector('body > .sticky')?.getBoundingClientRect().bottom ?? 0));
  const arriba = barra + 12; const abajo = movil ? 64 : 16; const libre = vh - arriba - abajo;
  if (!r.width || !r.height || libre <= 0) return null;
  const s = Math.max(1, Math.min(movil ? 1.25 : 1.6, (libre * 0.98) / r.height, ((vw - 16) * 0.98) / r.width));
  return { s, dx: vw / 2 - (r.left + r.width / 2), dy: arriba + libre / 2 - (r.top + r.height / 2) };
}
const transformaDe = (d) => `translate(${d.dx}px, ${d.dy}px) scale(${d.s})`;
function cerrarReplica(inmediato = false) {
  const rp = replica; if (!rp) return; replica = null;
  const quitar = () => rp.capa.remove();
  if (inmediato || sinMovimiento() || !rp.capa.animate) { quitar(); return; }
  try {
    const r0 = rp.rect; const r1 = rp.origen.isConnected ? rp.origen.getBoundingClientRect() : r0;
    const vuelta = `translate(${r1.left - r0.left}px, ${r1.top - r0.top}px) scale(1)`;
    rp.capa.classList.add('pcw-replica-sale');
    const an = rp.capa.animate([{ transform: transformaDe(rp) }, { transform: vuelta, opacity: 1 }], { duration: 520, easing: 'cubic-bezier(.5, 0, .2, 1)', fill: 'forwards' });
    an.onfinish = quitar; an.oncancel = quitar;
  } catch (err) { console.warn('[jugadores] no se pudo animar el cierre de la réplica:', err); quitar(); }
}
function abrirReplica(origen) {
  try {
    const r = origen.getBoundingClientRect(); const d = destinoReplica(r); if (!d) return;
    const capa = document.createElement('div'); capa.className = 'pcw-replica'; capa.setAttribute('role', 'dialog'); capa.setAttribute('aria-label', 'Jugador destacado');
    Object.assign(capa.style, { left: `${r.left}px`, top: `${r.top}px`, width: `${r.width}px`, height: `${r.height}px` });
    capa.style.setProperty('--aura', origen.style.getPropertyValue('--aura') || '#00e5ff');
    const copia = origen.cloneNode(true); copia.classList.remove('pcw', 'pcw-origen', 'cmp-sel'); copia.classList.add('pcw-replica-in');
    copia.querySelectorAll('[data-cmp], [data-menu], .card-menu, .rank-badge').forEach((x) => x.remove());   // la réplica solo muestra la carta y el acceso al perfil
    copia.removeAttribute('data-pcw'); capa.append(copia); document.body.append(capa);
    replica = { capa, origen, rect: r, ...d };
    capa.style.transform = transformaDe(d);
    if (!sinMovimiento() && capa.animate) {          // viaja, pasa un poco de largo y se asienta
      const t = (k) => `translate(${d.dx}px, ${d.dy}px) scale(${(d.s * k).toFixed(3)})`;
      capa.animate([{ transform: 'translate(0, 0) scale(1)', offset: 0 }, { transform: t(1.07), offset: 0.55 }, { transform: t(0.985), offset: 0.78 }, { transform: t(1), offset: 1 }],
        { duration: 900, easing: 'cubic-bezier(.22, 1, .36, 1)' });
    }
    if (window.matchMedia('(hover: hover) and (pointer: fine)').matches && !sinMovimiento() && leerAjustes().cartasInclinacion) {   // inclinación 3D siguiendo el mouse
      capa.addEventListener('pointermove', (e) => { const b = capa.getBoundingClientRect(); const x = (e.clientX - b.left) / b.width - 0.5; const y = (e.clientY - b.top) / b.height - 0.5; copia.style.setProperty('--ry', `${(x * 10).toFixed(2)}deg`); copia.style.setProperty('--rx', `${(-y * 10).toFixed(2)}deg`); });
      capa.addEventListener('pointerleave', () => { copia.style.setProperty('--ry', '0deg'); copia.style.setProperty('--rx', '0deg'); });
    }
    capa.addEventListener('click', (e) => { if (!e.target.closest('a, button')) fijarFoco(null); });
  } catch (err) { console.error('[jugadores] no se pudo abrir la réplica de la carta:', err); fijarFoco(null); }
}
function fijarFoco(id) {
  const box = $('players-container');
  box.querySelectorAll('.pcw-origen').forEach((el) => el.classList.remove('pcw-origen'));
  const w = id ? box.querySelector(`.pcw[data-pcw="${CSS.escape(id)}"]`) : null;
  if (!w) { focoId = null; box.dataset.foco = 'false'; cerrarReplica(); return; }
  cerrarReplica(true); focoId = id; box.dataset.foco = 'true'; w.classList.add('pcw-origen'); abrirReplica(w);
}
let ajuste = 0;
window.addEventListener('resize', () => { clearTimeout(ajuste); ajuste = setTimeout(() => { if (!replica) return; const d = destinoReplica(replica.rect); if (d) { Object.assign(replica, d); replica.capa.style.transform = transformaDe(d); } }, 120); });
document.addEventListener('keydown', (e) => { if (e.key === 'Escape') fijarFoco(null); });
document.addEventListener('click', (e) => { if (!e.target.closest('#players-container, .pcw-replica, .modal-card, #cmp-bar')) fijarFoco(null); });
$('players-container').addEventListener('click', async (e) => {
  const w = e.target.closest('.pcw');
  // Con una carta ampliada, cualquier clic en OTRA carta solo la minimiza (no abre la nueva): hace falta un segundo clic para ampliar.
  if (w && !e.target.closest('button, a, .card-menu')) { fijarFoco(focoId === null ? w.dataset.pcw : null); return; }
  const menu = e.target.closest('[data-menu]')?.dataset.menu;
  if (menu) { const el = document.querySelector(`.card-menu[data-menu-for="${menu}"]`); const abrir = el.hidden; cerrarMenus(); el.hidden = !abrir; return; }
  const cmp = e.target.closest('[data-cmp]')?.dataset.cmp;
  if (cmp) { const i = sel.indexOf(cmp); if (i >= 0) sel.splice(i, 1); else if (sel.length >= MAX_COMPARE) { toast(`Puedes comparar hasta ${MAX_COMPARE} jugadores a la vez.`, 'info', { key: 'cmp-max' }); return; } else sel.push(cmp); paint(); return; }
  const edit = e.target.closest('[data-edit]')?.dataset.edit;
  const del = e.target.closest('[data-del]')?.dataset.del;
  if (edit) openPlayerForm(all.find((p) => p.id === edit), load);
  if (del) {
    const p = all.find((x) => x.id === del);
    if (!p || !confirm(`¿Borrar la ficha de ${p.nombre}? No se puede deshacer.`)) return;
    const { error } = await supabase.from('jugadores').delete().eq('id', del);
    if (error) { console.error('[database] borrar:', error); toast('No se pudo borrar.', 'error'); return; }
    toast('Ficha borrada.', 'ok'); load();
  }
});

// El botón "Añadir" y los controles de edición solo existen para admin.
onSession(() => { $('btn-add-player').hidden = !isAdmin(); if (all.length) paint(); });
load();

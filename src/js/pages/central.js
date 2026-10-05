// Página Central: partidos, posiciones y partido destacado REALES (edición en curso de data/ligaResultados.js), XI ideal (demo) y Top 3 REAL desde `jugadores`.
import { supabase } from '../core/supabase.js';
import { escapeHTML } from '../core/dom.js';
import { escudoDe, escudoHTML } from '../core/escudos.js';
import { playerCardHTML } from '../features/playerCard.js';
import { crearReplica } from '../features/replicaCarta.js';
import { esIlegible } from '../core/replica.js';
import { leerAjustes, hayMovimientoReducido } from '../features/ajustes.js';
import { DEMO_XI } from '../../data/demo.js';
import { EDICIONES } from '../../data/ligaResultados.js';
import { FX } from '../../data/experimento.js';
import { LIGAS } from '../../data/ligas.js';
import { CLUBES_VISUAL } from '../../data/clubesVisual.js';
import { calcularTabla } from '../core/tabla.js';
import { openAuthModal } from '../features/auth.js';
import { onSession, can } from '../core/session.js';
import { openModal, closeModal } from '../core/modal.js';
import { toast } from '../core/toast.js';
import { borrarFilas } from '../features/escritura.js';
import { cifra, ordenPodio, jornadasCentral, visualClub, rachas, resultadosNuevos, tablaTrasFecha, movimientosTabla, estadisticasFecha, destacadoFinal } from '../core/central.js';

const $ = (id) => document.getElementById(id);

// Edición en curso de la Galaxy League (la misma fuente que la página Liga). Si no hay ninguna en curso, se muestran estados vacíos.
const edicion = EDICIONES.galaxy.find((e) => e.estado === 'en_curso') ?? null;
const fechas = edicion?.fechas ?? [];
const clubDe = (n) => edicion?.clubes?.[n] ?? '';
const jornadas = jornadasCentral(fechas);
const tabla = calcularTabla(fechas.flatMap((f) => f.partidos)).tabla;
const club = (n) => escapeHTML(clubDe(n).toUpperCase());

let pestana = 'proximos';
const jug = (m) => Number.isInteger(m?.gl) && Number.isInteger(m?.gv);
const jugadoresEd = edicion?.jugadores ?? [];
const fechaObj = (n) => fechas.find((f) => f.n === n) ?? null;
const ultimaJugada = [...fechas].reverse().find((f) => f.partidos?.some(jug))?.n ?? fechas[0]?.n ?? null;
let fechaSel = ultimaJugada;                                   // fecha elegida en la pestaña «Por fecha»
const manuales = new Map();                                    // fecha → elección manual del partido destacado (tabla partido_destacado)
const nFechaDestacado = () => (pestana === 'porfecha' ? fechaSel : pestana === 'resultados' ? (jornadas.resultados[0]?.n ?? ultimaJugada) : (jornadas.proximos?.n ?? ultimaJugada));

const ladoFila = (n, gana, der) => `<span class="min-w-0 flex items-center gap-2.5 ${der ? 'flex-row-reverse text-right' : ''}"><span class="shrink-0 grid place-items-center w-9 h-9 sm:w-11 sm:h-11 rounded-full bg-black/40 border border-galaxy-border/60">${escudoHTML(clubDe(n), 26)}</span><span class="min-w-0"><span class="block truncate text-sm sm:text-base ${gana ? 'font-bold text-white' : 'font-semibold text-gray-300'}">${escapeHTML(n)}</span><span class="block truncate text-[10px] text-gray-500 tracking-wider">${club(n)}</span></span></span>`;
const filaPartido = (m) => {
  const jugado = jug(m);
  return `<div class="glass-panel rounded-xl p-3 sm:p-4 grid grid-cols-[minmax(0,1fr)_auto_minmax(0,1fr)] gap-2 items-center text-white">
    ${ladoFila(m.l, jugado && m.gl > m.gv)}
    <span class="text-center font-display font-bold text-lg sm:text-2xl bg-black/50 py-1 px-3 rounded border border-galaxy-border whitespace-nowrap">${jugado ? `${m.gl} - ${m.gv}` : 'VS'}</span>
    ${ladoFila(m.v, jugado && m.gv > m.gl, true)}
  </div>`;
};
const ico = { goles: 'fa-futbol', prom: 'fa-chart-simple', emp: 'fa-equals', gol: 'fa-fire' };
const chipStat = (i, t) => `<span class="pc-chip"><i class="fa-solid ${i}"></i>${t}</span>`;

function pintarNavFecha() {
  const nav = $('fecha-nav'); nav.hidden = pestana !== 'porfecha'; if (nav.hidden) return;
  if (!fechas.length) { nav.innerHTML = '<p class="text-xs text-gray-500">Aún no hay fechas cargadas.</p>'; return; }
  const idx = fechas.findIndex((f) => f.n === fechaSel);
  const f = fechas[idx]; const ok = f?.partidos?.some(jug);
  nav.innerHTML = `<div class="liga-sel !flex items-center justify-between w-full" role="group" aria-label="Elegir fecha">
    <button type="button" class="forma-flecha !w-8 !h-8 shrink-0" data-fnav="-1" aria-label="Fecha anterior" ${idx <= 0 ? 'disabled' : ''}><i class="fa-solid fa-chevron-left"></i></button>
    <span class="flex-1 text-center leading-tight" aria-live="polite"><span class="block font-display font-bold text-sm text-white uppercase tracking-widest">Fecha ${f?.n ?? '—'}</span><span class="block text-[10px] ${ok ? 'text-emerald-400' : 'text-gray-500'} uppercase tracking-wider">${ok ? 'jugada' : 'por jugar'} · ${idx + 1} de ${fechas.length}</span></span>
    <button type="button" class="forma-flecha !w-8 !h-8 shrink-0" data-fnav="1" aria-label="Fecha siguiente" ${idx >= fechas.length - 1 ? 'disabled' : ''}><i class="fa-solid fa-chevron-right"></i></button></div>`;
}

function pintarPartidos() {
  pintarNavFecha();
  if (pestana === 'porfecha') {
    const f = fechaObj(fechaSel);
    if (!f) { $('matches-container').innerHTML = '<div class="text-center text-gray-500 text-sm py-6 glass-panel rounded-xl">No hay fechas para mostrar.</div>'; return; }
    const e = estadisticasFecha(f);
    const stats = e.jugados ? `<div class="flex flex-wrap gap-2">${chipStat(ico.goles, `${e.goles} goles`)}${chipStat(ico.prom, `${e.promedio} por partido`)}${chipStat(ico.emp, `${e.empates} empate${e.empates === 1 ? '' : 's'}`)}${e.goleada ? chipStat(ico.gol, `Mayor goleada: ${escapeHTML(e.goleada.l)} ${e.goleada.gl}-${e.goleada.gv} ${escapeHTML(e.goleada.v)}`) : ''}<span class="pc-chip"><i class="fa-solid fa-house"></i>${e.local} local · ${e.visita} visita</span></div>` : `<p class="text-xs text-gray-500">Esta fecha todavía no se juega (${e.total} partidos programados).</p>`;
    const boton = FX.compartir ? `<button type="button" data-compartir-fecha class="btn btn-ghost !px-3 !py-1.5 text-xs"><i class="fa-solid fa-share-nodes"></i> Compartir fecha</button>` : '';
    $('matches-container').innerHTML = `<div class="flex items-center justify-between gap-2"><div class="text-[11px] font-display font-bold text-galaxy-400 uppercase tracking-[0.2em]">Fecha ${f.n}${edicion ? ` · ${escapeHTML(edicion.nombre)}` : ''}</div>${boton}</div>${stats}${f.partidos.map(filaPartido).join('')}`;
    return;
  }
  const grupos = pestana === 'proximos' ? (jornadas.proximos ? [jornadas.proximos] : []) : jornadas.resultados;
  if (!grupos.length) { $('matches-container').innerHTML = `<div class="text-center text-gray-500 text-sm py-6 glass-panel rounded-xl">${pestana === 'proximos' ? 'No hay partidos por jugar por ahora.' : 'Aún no hay resultados.'}</div>`; return; }
  $('matches-container').innerHTML = grupos.map((j) => `<div class="text-[11px] font-display font-bold text-galaxy-400 uppercase tracking-[0.2em]">Fecha ${j.n}${edicion ? ` · ${escapeHTML(edicion.nombre)}` : ''}</div>${j.partidos.map(filaPartido).join('')}`).join('');
}

/** Tabla de posiciones (derecha). Con `mov` (modo «Por fecha») muestra cómo se movió cada jugador en esa fecha. */
function pintarTabla(t, mov = null) {
  $('mini-table-container').innerHTML = t.length ? t.map((x, i) => {
    const m = mov?.get(x.nombre); const d = m?.delta ?? 0;
    const flecha = !mov ? '' : m?.antes === null || m === undefined ? '' : d > 0 ? `<span class="block text-[10px] font-bold text-emerald-400">▲${d}</span>` : d < 0 ? `<span class="block text-[10px] font-bold text-rose-400">▼${-d}</span>` : '<span class="block text-[10px] text-gray-600">＝</span>';
    return `<tr class="border-b border-galaxy-border/30 text-gray-300 text-sm">
      <td class="py-2 pl-1 leading-tight">${i + 1}${flecha}</td><td class="pr-2 max-w-[10rem]"><span class="flex items-center gap-2"><span class="shrink-0 w-6 grid place-items-center">${escudoHTML(clubDe(x.nombre), 22)}</span><span class="min-w-0"><span class="block truncate">${escapeHTML(x.nombre)}</span><span class="block truncate text-[10px] text-gray-500 tracking-wider">${club(x.nombre)}</span></span></span></td><td class="text-center text-gray-400">${x.pj}</td><td class="text-center font-bold text-white">${x.pts}</td>
    </tr>`; }).join('') : '<tr><td colspan="4" class="py-4 text-center text-gray-500 text-xs">Aún no hay partidos jugados.</td></tr>';
}
function pintarPosiciones() {
  const tit = $('pos-titulo'); const sub = $('pos-sub');
  if (pestana === 'porfecha' && fechaSel) {
    pintarTabla(tablaTrasFecha(fechas, fechaSel, calcularTabla, jugadoresEd), movimientosTabla(fechas, fechaSel, calcularTabla, jugadoresEd));
    if (tit) tit.textContent = `Tras la fecha ${fechaSel}`; if (sub) { sub.hidden = false; sub.textContent = '▲▼ = puestos que subió o bajó en esa fecha'; }
  } else { pintarTabla(tabla); if (tit) tit.textContent = 'Posiciones'; if (sub) sub.hidden = true; }
}

function pintarDestacado() {
  const box = $('destacado'); const n = nFechaDestacado(); const f = n == null ? null : fechaObj(n);
  const previa = f ? tablaTrasFecha(fechas, n - 1, calcularTabla, jugadoresEd) : [];
  let d = f ? destacadoFinal(f, previa, manuales.get(n)) : null;
  if (pestana === 'proximos' && d && !d.manual && jug(d.partido)) {   // en «Próximos» el automático debe ser un partido POR JUGAR si queda alguno en esa fecha
    const pend = f.partidos.filter((x) => !jug(x)); if (pend.length) d = destacadoFinal({ ...f, partidos: pend }, previa, null);
  }
  const puedeEditar = can('editarLiga') && !!f;
  const editar = puedeEditar ? `<button type="button" data-edit-destacado class="absolute top-2 left-2 z-20 px-2.5 py-1 rounded-lg border border-galaxy-400/40 bg-black/50 text-[10px] font-display font-bold uppercase tracking-wider text-galaxy-400 hover:text-white hover:border-galaxy-400"><i class="fa-solid fa-pen mr-1"></i>Editar</button>` : '';
  if (!d) { box.innerHTML = `${editar}<div class="p-6 text-center text-gray-500 text-xs">Aún no hay un partido destacado.</div>`; return; }
  const m = d.partido; const jugado = jug(m); const hayPrevia = previa.some((t) => t.pj > 0);
  const pos = (x) => (hayPrevia ? previa.findIndex((t) => t.nombre === x) + 1 : 0);
  const lado = (x, der) => {
    const v = visualClub(clubDe(x), CLUBES_VISUAL); const real = escudoDe(clubDe(x));
    const escudo = real ? `<div class="w-14 h-14 sm:w-20 sm:h-20 shrink-0 rounded-full border-2 grid place-items-center bg-black/40" style="border-color:${v.a};box-shadow:0 0 20px ${v.a}66">${escudoHTML(clubDe(x), 44)}</div>` : `<div class="w-14 h-14 sm:w-20 sm:h-20 shrink-0 rounded-full border-2 flex items-center justify-center font-display font-bold text-lg sm:text-2xl ${v.oscuro ? 'text-black' : 'text-white'}" style="border-color:${v.a};background:linear-gradient(135deg,${v.a},${v.b});box-shadow:0 0 20px ${v.a}66">${escapeHTML(v.sigla)}</div>`;
    const txt = `<div class="min-w-0">${pos(x) ? `<div class="inline-flex items-center gap-1.5 px-2 py-0.5 whitespace-nowrap rounded bg-galaxy-600/25 border border-galaxy-400/30 text-[10px] text-galaxy-400 font-bold mb-1">${pos(x)}.º en la tabla</div>` : ''}
      <h3 class="font-display font-bold text-xl sm:text-3xl text-white text-shadow-glow truncate uppercase">${escapeHTML(x)}</h3><p class="text-[11px] sm:text-sm text-galaxy-400 uppercase tracking-widest font-bold truncate">${club(x)}</p></div>`;
    return `<div class="flex flex-col-reverse ${der ? 'sm:flex-row-reverse sm:justify-end text-center sm:text-left' : 'sm:flex-row sm:justify-end text-center sm:text-right'} items-center gap-2 sm:gap-4 min-w-0">${txt}${escudo}</div>`;
  };
  const centro = jugado ? `<span class="font-display font-extrabold text-3xl sm:text-5xl text-white drop-shadow-[0_0_10px_rgba(0,229,255,0.8)] tabular-nums">${m.gl}<span class="text-galaxy-400 mx-1">-</span>${m.gv}</span>` : '<span class="font-display font-bold text-2xl sm:text-4xl text-galaxy-400 italic drop-shadow-[0_0_10px_rgba(0,229,255,0.8)]">VS</span>';
  box.innerHTML = `${editar}<div class="absolute top-0 right-0 bg-galaxy-600 text-white text-[10px] font-bold px-3 py-1 rounded-bl-lg uppercase tracking-widest z-10"><i class="fa-solid fa-fire mr-1"></i> Partido Destacado${d.manual ? ' · elegido' : ''}</div>
    <div class="absolute inset-0 bg-gradient-to-r from-blue-900/20 via-transparent to-white/10"></div>
    <div class="relative z-10 p-4 sm:p-6 pt-9 sm:pt-8 grid grid-cols-[minmax(0,1fr)_auto_minmax(0,1fr)] items-center gap-2 sm:gap-4">${lado(m.l, false)}
      <div class="flex flex-col items-center">${centro}<span class="text-[9px] sm:text-[10px] text-gray-500 uppercase tracking-widest mt-1 text-center">Fecha ${n} · ${jugado ? 'Final' : 'Parsec'}</span></div>${lado(m.v, true)}</div>
    ${d.nota ? `<p class="relative z-10 px-4 sm:px-6 pb-4 -mt-1 text-center text-xs sm:text-sm text-gray-300 italic">“${escapeHTML(d.nota)}”</p>` : ''}`;
}

/** Editor del partido destacado (solo staff): elegir el cruce de la fecha + una nota corta, o volver al automático. */
function abrirEditorDestacado() {
  const n = nFechaDestacado(); const f = n == null ? null : fechaObj(n); if (!f || !edicion) return;
  const actual = manuales.get(n); const sel = actual ? `${actual.local}|${actual.visitante}` : '';
  const m = openModal(`<form id="pd-form" class="p-5 sm:p-6 space-y-4" novalidate><h3 class="font-display font-bold text-lg text-white uppercase">Partido destacado · Fecha ${n}</h3>
    <p class="text-xs text-gray-400">Sin elección manual, la web usa el automático (si ya se jugó: el de más goles; si no: el de los mejor ubicados).</p>
    <label class="block text-xs text-gray-300 space-y-1">Partido<select id="pd-cruce" class="field">${f.partidos.map((x) => `<option value="${escapeHTML(`${x.l}|${x.v}`)}" ${`${x.l}|${x.v}` === sel ? 'selected' : ''}>${escapeHTML(x.l)} vs ${escapeHTML(x.v)}${jug(x) ? ` (${x.gl}-${x.gv})` : ''}</option>`).join('')}</select></label>
    <label class="block text-xs text-gray-300 space-y-1">Nota (opcional, máx. 140)<input id="pd-nota" class="field" maxlength="140" value="${escapeHTML(actual?.nota ?? '')}" placeholder="Ej.: el clásico de la liga"></label>
    <ul id="pd-err" class="text-xs text-rose-400" role="alert"></ul>
    <div class="flex flex-wrap gap-2 justify-end"><button type="button" data-close class="btn btn-ghost">Cancelar</button>${actual ? '<button type="button" id="pd-auto" class="btn btn-ghost">Volver al automático</button>' : ''}<button type="submit" id="pd-guardar" class="btn btn-primary">Guardar</button></div></form>`, { id: 'pd-modal' });
  const q = (x) => m.querySelector(x); const err = (t) => { q('#pd-err').innerHTML = `<li>${escapeHTML(t)}</li>`; };
  q('#pd-form').addEventListener('submit', async (ev) => {
    ev.preventDefault(); const [local, visitante] = q('#pd-cruce').value.split('|'); const nota = q('#pd-nota').value.trim() || null;
    if (!local || !visitante) { err('Elige un partido.'); return; }
    const btn = q('#pd-guardar'); btn.disabled = true;
    try {
      const fila = { edicion: edicion.id, fecha: n, local, visitante, nota, updated_at: new Date().toISOString() };
      const { error } = await supabase.from('partido_destacado').upsert(fila, { onConflict: 'edicion,fecha' }); if (error) throw error;
      manuales.set(n, fila); toast('Partido destacado guardado.', 'ok'); closeModal('pd-modal'); pintarDestacado();
    } catch (e) { console.error('[central] guardar destacado:', e); err(/row-level security|policy/i.test(e.message) ? 'No tienes permiso para editarlo.' : (e.message || 'No se pudo guardar.')); } finally { btn.disabled = false; }
  });
  q('#pd-auto')?.addEventListener('click', async () => {
    try { await borrarFilas(supabase, 'partido_destacado', { edicion: edicion.id, fecha: n }, 'fecha'); manuales.delete(n); toast('Vuelve el automático.', 'ok'); closeModal('pd-modal'); pintarDestacado(); }
    catch (e) { console.error('[central] borrar destacado:', e); err(e.message || 'No se pudo borrar.'); }
  });
}
$('destacado').addEventListener('click', (e) => { if (e.target.closest('[data-edit-destacado]')) abrirEditorDestacado(); });
async function cargarManuales() {
  if (!edicion) return;
  try {
    const { data, error } = await supabase.from('partido_destacado').select('fecha, local, visitante, nota').eq('edicion', edicion.id); if (error) throw error;
    for (const r of data ?? []) manuales.set(r.fecha, r);
    pintarDestacado();
  } catch (e) { console.warn('[central] no se pudieron leer los destacados elegidos (se usa el automático):', e); }
}

function renderDemo() {
  pintarPartidos(); pintarDestacado();
  pintarPosiciones();
  const slot = (p) => `<div class="text-center"><div class="w-8 h-8 rounded-full ${p.cls} border border-white mx-auto text-xs font-bold flex items-center justify-center">${p.pos}</div><span class="text-[11px] font-bold text-white uppercase tracking-wider block mt-1">${p.nombre}</span></div>`;
  const [dc, ei, mco, ed, mcd] = DEMO_XI;
  if (!$('xi-container')) return;   // el XI está oculto por ahora
  $('xi-container').innerHTML = `
    <div class="flex justify-center relative z-10 pt-2">${slot(dc)}</div>
    <div class="flex justify-between px-6 relative z-10 my-auto">${slot(ei)}${slot(mco)}${slot(ed)}</div>
    <div class="flex justify-center relative z-10 pb-2">${slot(mcd)}</div>`;
}

async function renderFeatured() {
  const box = $('featured-players-container');
  try {
    const { data, error } = await supabase.from('jugadores').select('*').order('ovr', { ascending: false }).limit(3);
    if (error) throw error;
    if (!data?.length) throw new Error('vacío');
    // Podio: 2.º izquierda, 1.º centro, 3.º derecha. El número de puesto sigue al jugador (no a la posición en pantalla).
    box.dataset.n = String(data.length);
    box.innerHTML = ordenPodio(data).map(({ jugador, puesto }) => `
      <div class="podio-slot" data-puesto="${puesto}" tabindex="0" role="button" aria-pressed="false" aria-label="${escapeHTML(jugador.nombre)}, puesto ${puesto}">
        <div class="podio-in">${playerCardHTML(jugador, puesto - 1, { sizeClass: 'w-full' })}</div>
      </div>`).join('');
    const c = box.querySelector('[data-puesto="1"]'); if (c) box.scrollLeft = c.offsetLeft - (box.clientWidth - c.offsetWidth) / 2;
  } catch (e) {
    console.error('[central] jugadores destacados:', e);
    box.innerHTML = `<div class="text-center text-gray-500 w-full py-6"><i class="fa-solid fa-users-slash text-2xl mb-2 block text-galaxy-600"></i>Aún no hay jugadores destacados para mostrar.</div>`;
  }
}

// ---- «En racha» + «novedades desde tu última visita» (interruptores FX.rachas / FX.visita en data/experimento.js; si el bloque no está, no se hace nada) ----
function pintarRachas() {
  const box = $('rachas'); if (!box || !fechas.length) return;
  const r = rachas(fechas, [...new Set([...jugadoresEd, ...tabla.map((t) => t.nombre)])]);
  const fila = (x, tono, icono, txt) => `<div class="racha-fila"><span class="racha-n ${tono}">${x.n}</span><span class="shrink-0 grid place-items-center w-6">${escudoHTML(clubDe(x.nombre), 20)}</span><span class="min-w-0 flex-1"><span class="block truncate text-white font-semibold">${escapeHTML(x.nombre)}</span><span class="block text-[10px] text-gray-500 uppercase tracking-wider"><i class="fa-solid ${icono} mr-1"></i>${txt}</span></span></div>`;
  const filas = [...r.victorias.slice(0, 3).map((x) => fila(x, 'text-emerald-400', 'fa-trophy', 'victorias seguidas')), ...r.invicto.slice(0, 2).map((x) => fila(x, 'text-galaxy-400', 'fa-shield', 'sin perder')), ...r.derrotas.slice(0, 2).map((x) => fila(x, 'text-rose-400', 'fa-arrow-trend-down', 'derrotas seguidas'))];
  if (!filas.length) return;
  $('rachas-lista').innerHTML = filas.join(''); box.hidden = false;
}
function avisoVisita() {
  const box = $('novedad'); if (!box || !edicion) return;
  const KEY = `pes-visita-${edicion.id}`; const ahora = fechas.flatMap((f) => f.partidos ?? []).filter(jug).length;
  try {
    const antes = Number(localStorage.getItem(KEY)); const nuevos = resultadosNuevos(ahora, localStorage.getItem(KEY) === null ? undefined : antes);
    if (nuevos) { box.innerHTML = `<i class="fa-solid fa-bell text-galaxy-400"></i><span><b class="text-white">${nuevos} resultado${nuevos === 1 ? '' : 's'} nuevo${nuevos === 1 ? '' : 's'}</b> desde tu última visita. Mira la pestaña <b class="text-white">Por fecha</b> para ver cómo se movió la tabla.</span>`; box.hidden = false; }
    localStorage.setItem(KEY, String(ahora));
  } catch { /* sin almacenamiento: simplemente no hay aviso */ }
}
renderDemo();
pintarRachas(); avisoVisita();
renderFeatured();
// Podio: el pase del mouse agranda por CSS; en celular (sin mouse) el toque agranda/encoge la carta. Un solo jugador agrandado a la vez.
// En celular las tres cartas miden ≈ 105 px y el CSS oculta sus estadísticas (< 135 px): ahí el toque abre la RÉPLICA completa (features/replicaCarta.js),
// con el ancho de una carta «normal», igual que en «Jugadores». Si las cartas son anchas (PC), se conserva el zoom por CSS de siempre.
const podio = $('featured-players-container');
const AURA = { 1: '#ffc828', 2: '#00e5ff', 3: '#ff3dc8' };           // mismos colores que --glow de cada puesto en components.css
const esMovil = () => window.matchMedia('(max-width: 639px)').matches;
const quitarMarcas = () => podio.querySelectorAll('.podio-up, .podio-origen').forEach((x) => { x.classList.remove('podio-up', 'podio-origen'); x.setAttribute('aria-pressed', 'false'); });
const replicaPodio = crearReplica({ esMovil, sinMovimiento: hayMovimientoReducido, inclinacion: () => leerAjustes().cartasInclinacion, alClicCapa: cerrarPodio });
function cerrarPodio() { replicaPodio.cerrar(); quitarMarcas(); }
function alternarPodio(slot) {
  const carta = slot.querySelector('article');
  if (carta && esIlegible(slot.getBoundingClientRect().width)) {
    const abrir = !slot.classList.contains('podio-origen');
    cerrarPodio();
    if (abrir && replicaPodio.abrir(carta, { aura: AURA[slot.dataset.puesto] ?? '#00e5ff' })) { slot.classList.add('podio-origen'); slot.setAttribute('aria-pressed', 'true'); }
    return;
  }
  const abrir = !slot.classList.contains('podio-up');
  cerrarPodio();
  if (abrir) { slot.classList.add('podio-up'); slot.setAttribute('aria-pressed', 'true'); }
}
podio.addEventListener('click', (e) => { const s = e.target.closest('.podio-slot'); if (s) alternarPodio(s); });
podio.addEventListener('keydown', (e) => { const s = e.target.closest('.podio-slot'); if (s && (e.key === 'Enter' || e.key === ' ')) { e.preventDefault(); alternarPodio(s); } });
document.addEventListener('keydown', (e) => { if (e.key === 'Escape') cerrarPodio(); });
document.addEventListener('click', (e) => { if (!e.target.closest('#featured-players-container, .pcw-replica')) cerrarPodio(); });
window.addEventListener('resize', () => replicaPodio.reposicionar());
$('btn-hero-register')?.addEventListener('click', () => openAuthModal('register'));
// Si ya hay sesión, el botón de "Crear Cuenta" sobra.
onSession(({ session }) => { const b = $('btn-hero-register'); if (b) b.hidden = !!session; });

// ---- Pestañas Próximos / Resultados ----
$('seg-partidos').addEventListener('click', (e) => {
  const b = e.target.closest('button[data-v]'); if (!b || b.dataset.v === pestana) return;
  pestana = b.dataset.v; $('seg-partidos').querySelectorAll('button').forEach((x) => x.setAttribute('aria-pressed', String(x === b))); refrescar();
});
$('matches-container').addEventListener('click', async (e) => {   // «Compartir fecha» → tarjeta-imagen (carga el dibujo solo cuando se pide)
  if (!e.target.closest('[data-compartir-fecha]')) return;
  try {
    const [{ datosFecha }, { abrirTarjeta }] = await Promise.all([import('../core/compartir.js'), import('../features/compartir.js')]);
    const liga = LIGAS.find((l) => l.id === 'galaxy');
    abrirTarjeta(datosFecha({ liga: liga ? liga.titulo.join(' ') : 'Galaxy League', edicion: edicion?.nombre ?? '', fecha: fechaObj(fechaSel), clubes: edicion?.clubes ?? {} }), 'galaxy');
  } catch (err) { console.error('[central] compartir:', err); toast('No se pudo preparar la tarjeta.', 'error'); }
});
function refrescar() { pintarPartidos(); pintarDestacado(); pintarPosiciones(); }
$('fecha-nav').addEventListener('click', (e) => {
  const f = e.target.closest('[data-fecha]'); const p = e.target.closest('[data-fnav]');
  if (f) fechaSel = Number(f.dataset.fecha);
  else if (p) { const i = fechas.findIndex((x) => x.n === fechaSel) + Number(p.dataset.fnav); if (fechas[i]) fechaSel = fechas[i].n; } else return;
  refrescar();
});
onSession(() => pintarDestacado());   // al iniciar/cerrar sesión aparece o se oculta «Editar»
cargarManuales();
// ---- XI plegado en celular, abierto en PC ----
if ($('xi-det')) $('xi-det').open = window.matchMedia('(min-width: 1024px)').matches;

// ---- Pulso de la comunidad: cuatro conteos reales (head:true no descarga filas, solo el número). Si uno falla se queda en «—». ----
async function contar(consulta, id) {
  try { const { count, error } = await consulta; if (error) throw error; $(`pulso-${id}`).textContent = cifra(count); }
  catch (e) { console.error(`[central] pulso ${id}:`, e?.message ?? e); }
}
const head = { count: 'exact', head: true };
contar(supabase.from('jugadores').select('id', head), 'jugadores');
contar(supabase.from('perfiles').select('id', head), 'comunidad');
contar(supabase.from('perfiles').select('id', head).eq('puede_hostear', true), 'hosts');
contar(supabase.from('retos_matchmaking').select('id', head).eq('estado', 'BUSCANDO'), 'retos');

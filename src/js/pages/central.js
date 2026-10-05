// Página Central: partidos, posiciones y partido destacado REALES (edición en curso de data/ligaResultados.js), XI ideal (demo) y Top 3 REAL desde `jugadores`.
import { supabase } from '../core/supabase.js';
import { escapeHTML } from '../core/dom.js';
import { playerCardHTML } from '../features/playerCard.js';
import { crearReplica } from '../features/replicaCarta.js';
import { esIlegible } from '../core/replica.js';
import { leerAjustes, hayMovimientoReducido } from '../features/ajustes.js';
import { DEMO_XI } from '../../data/demo.js';
import { EDICIONES } from '../../data/ligaResultados.js';
import { CLUBES_VISUAL } from '../../data/clubesVisual.js';
import { calcularTabla } from '../core/tabla.js';
import { openAuthModal } from '../features/auth.js';
import { onSession } from '../core/session.js';
import { cifra, ordenPodio, jornadasCentral, partidoDestacado, visualClub, partidoDe, recorteTabla } from '../core/central.js';
import { activarReveal, escalonar, contarHasta } from '../features/reveal.js';
import { href } from '../core/config.js';

const $ = (id) => document.getElementById(id);

// Edición en curso de la Galaxy League (la misma fuente que la página Liga). Si no hay ninguna en curso, se muestran estados vacíos.
const edicion = EDICIONES.galaxy.find((e) => e.estado === 'en_curso') ?? null;
const fechas = edicion?.fechas ?? [];
const clubDe = (n) => edicion?.clubes?.[n] ?? '';
const jornadas = jornadasCentral(fechas);
const tabla = calcularTabla(fechas.flatMap((f) => f.partidos)).tabla;
const club = (n) => escapeHTML(clubDe(n).toUpperCase());

let pestana = 'proximos';
let misNombres = [];   // nombre de usuario y nombre visible de quien está conectado: sirven para reconocer «su» partido en la edición
const mini = (n) => { const v = visualClub(clubDe(n), CLUBES_VISUAL); return `<span class="mini-escudo ${v.oscuro ? 'text-black' : 'text-white'}" style="background:linear-gradient(135deg,${v.a},${v.b})" aria-hidden="true">${escapeHTML(v.sigla)}</span>`; };

function pintarPartidos() {
  const grupos = pestana === 'proximos' ? (jornadas.proximos ? [jornadas.proximos] : []) : jornadas.resultados;
  $('fecha-etiqueta').textContent = grupos.length ? `Fecha ${grupos.map((j) => j.n).join(' y ')}${edicion ? ` · ${edicion.nombre}` : ''}` : (edicion?.nombre ?? '');
  const caja = $('matches-container');
  if (!grupos.length) { caja.innerHTML = `<div class="sm:col-span-2 text-center text-gray-500 text-sm py-8 glass-panel rounded-2xl"><i class="fa-regular fa-calendar text-2xl block mb-2 text-galaxy-600"></i>${pestana === 'proximos' ? 'No hay partidos por jugar por ahora.' : 'Aún no hay resultados.'}</div>`; return; }
  const lado = (n, gana, der) => `<span class="flex items-center gap-2 min-w-0 ${der ? 'flex-row-reverse text-right' : ''}">${mini(n)}<span class="min-w-0"><span class="block truncate text-sm ${gana ? 'font-bold text-white' : 'font-semibold text-gray-200'}">${escapeHTML(n)}</span><span class="block truncate text-[10px] text-gray-500 tracking-wider">${club(n)}</span></span></span>`;
  const fila = (m) => {
    const jugado = Number.isInteger(m.gl), mio = !!partidoDe([m], misNombres);
    return `<div class="match-card glass-panel text-white ${mio ? 'mio' : ''}">
      ${lado(m.l, jugado && m.gl > m.gv)}
      <span class="flex flex-col items-center gap-1"><span class="font-display font-bold text-lg whitespace-nowrap ${jugado ? 'text-white' : 'text-galaxy-400'}">${jugado ? `${m.gl} - ${m.gv}` : 'VS'}</span><span class="estado-chip ${jugado ? 'fin' : 'pend'}">${jugado ? 'Final' : (m.nota ? escapeHTML(m.nota) : 'Por jugar')}</span></span>
      ${lado(m.v, jugado && m.gv > m.gl, true)}
    </div>`;
  };
  caja.innerHTML = grupos.flatMap((j) => j.partidos).map(fila).join('');
  escalonar(caja);
}

/** «Tu partido»: solo si hay sesión y la persona juega en la próxima fecha. Es lo más personal de la página, por eso va primero. */
function pintarTuPartido() {
  const box = $('tu-partido'); const m = partidoDe(jornadas.proximos?.partidos, misNombres);
  if (!m) { box.hidden = true; box.innerHTML = ''; return; }
  const yo = misNombres.map((x) => x.toLowerCase()).includes(String(m.l).toLowerCase()) ? m.l : m.v, rival = yo === m.l ? m.v : m.l;
  box.hidden = false; box.className = 'tu-partido rounded-2xl p-4 flex flex-wrap items-center gap-3';
  box.innerHTML = `<span class="w-11 h-11 rounded-xl bg-galaxy-600/40 border border-galaxy-400/50 flex items-center justify-center text-galaxy-400 shrink-0"><i class="fa-solid fa-star"></i></span>
    <div class="min-w-0 flex-1"><p class="text-[10px] font-display font-bold text-galaxy-400 uppercase tracking-[0.2em]">Tu próximo partido · Fecha ${jornadas.proximos.n}</p>
      <p class="font-display font-bold text-white text-lg truncate">${escapeHTML(yo)} <span class="text-galaxy-400 italic">vs</span> ${escapeHTML(rival)}</p></div>
    <a href="${href('duelos/')}" class="cta-pulso btn btn-primary !min-h-10 !px-4 !text-xs"><i class="fa-solid fa-gamepad"></i> Ir a la sala</a>`;
}

function pintarDestacado() {
  const box = $('destacado'); const m = partidoDestacado(jornadas.proximos?.partidos, tabla);
  if (!m) { box.innerHTML = '<div class="p-6 text-center text-gray-500 text-xs">Aún no hay un partido destacado: no quedan cruces por jugar.</div>'; return; }
  const pos = (n) => tabla.findIndex((t) => t.nombre === n) + 1;
  const lado = (n, der) => {
    const v = visualClub(clubDe(n), CLUBES_VISUAL);
    const escudo = `<div class="escudo ${der ? 'der' : ''} w-16 h-16 sm:w-24 sm:h-24 shrink-0 rounded-full border-2 flex items-center justify-center font-display font-bold text-xl sm:text-3xl ${v.oscuro ? 'text-black' : 'text-white'}" style="border-color:${v.a};background:linear-gradient(135deg,${v.a},${v.b});box-shadow:0 0 28px ${v.a}77">${escapeHTML(v.sigla)}</div>`;
    const txt = `<div class="min-w-0"><div class="inline-flex items-center px-2 py-0.5 whitespace-nowrap rounded-full bg-galaxy-600/25 border border-galaxy-400/30 text-[10px] text-galaxy-400 font-bold mb-1">${pos(n) ? `${pos(n)}.º en la tabla` : 'Sin puesto'}</div>
      <h3 class="font-display font-bold text-lg sm:text-3xl text-white text-shadow-glow truncate uppercase">${escapeHTML(n)}</h3><p class="text-[11px] sm:text-sm text-galaxy-400 uppercase tracking-widest font-bold truncate">${club(n)}</p></div>`;
    return `<div class="flex flex-col-reverse ${der ? 'sm:flex-row-reverse text-center sm:text-left' : 'sm:flex-row sm:justify-end text-center sm:text-right'} items-center gap-2 sm:gap-4 min-w-0">${txt}${escudo}</div>`;
  };
  box.innerHTML = `<div class="absolute top-0 right-0 bg-galaxy-600 text-white text-[10px] font-bold px-3 py-1 rounded-bl-lg uppercase tracking-widest z-10"><i class="fa-solid fa-fire mr-1"></i> Partido destacado</div>
    <div class="absolute inset-0 bg-gradient-to-r from-blue-900/25 via-transparent to-fuchsia-900/20"></div>
    <div class="relative z-10 p-4 sm:p-7 pt-9 grid grid-cols-[minmax(0,1fr)_auto_minmax(0,1fr)] items-center gap-2 sm:gap-4">${lado(m.l, false)}
      <div class="flex flex-col items-center"><span class="vs-latido font-display font-bold text-3xl sm:text-5xl text-galaxy-400 italic drop-shadow-[0_0_12px_rgba(0,229,255,0.85)]">VS</span><span class="text-[9px] sm:text-[10px] text-gray-400 uppercase tracking-widest mt-1 text-center">Fecha ${jornadas.proximos.n} · Parsec</span></div>${lado(m.v, true)}</div>
    <div class="relative z-10 pb-4 flex justify-center"><a href="${href('duelos/')}" class="btn btn-ghost !min-h-9 !px-4 !text-[11px]"><i class="fa-solid fa-gamepad"></i> Pactar en la Sala de Duelos</a></div>`;
}

function pintarTabla() {
  const cont = $('mini-table-container');
  if (!tabla.length) { cont.innerHTML = '<p class="py-4 text-center text-gray-500 text-xs">Aún no hay partidos jugados.</p>'; return; }
  const max = Math.max(1, ...tabla.map((t) => t.pts));
  cont.innerHTML = recorteTabla(tabla, misNombres, 5).map(({ fila: t, puesto, mio }) => `<div class="fila-tabla ${mio ? 'mio' : ''}">
      <span class="font-display font-bold ${puesto === 1 ? 'text-amber-300' : 'text-gray-400'} text-sm">${puesto}</span>
      <span class="min-w-0"><span class="block truncate text-sm ${mio ? 'text-white font-bold' : 'text-gray-100'}">${escapeHTML(t.nombre)}${mio ? ' <span class="text-[9px] text-galaxy-400 uppercase tracking-wider">tú</span>' : ''}</span><span class="block truncate text-[10px] text-gray-500 tracking-wider">${club(t.nombre)}</span><span class="barra-pts block mt-1"><i style="--w:${Math.round((t.pts / max) * 100)}%"></i></span></span>
      <span class="text-xs text-gray-400 tabular-nums">${t.pj}</span><span class="text-right font-display font-bold text-white tabular-nums">${t.pts}</span></div>`).join('');
  escalonar(cont);
}

function renderDemo() {
  pintarPartidos(); pintarTuPartido(); pintarDestacado();
  pintarTabla();
  const slot = (p) => `<div class="text-center"><div class="w-8 h-8 rounded-full ${p.cls} border border-white mx-auto text-xs font-bold flex items-center justify-center">${p.pos}</div><span class="text-[11px] font-bold text-white uppercase tracking-wider block mt-1">${p.nombre}</span></div>`;
  const [dc, ei, mco, ed, mcd] = DEMO_XI;
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

renderDemo();
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
onSession(({ session, profile }) => {
  const b = $('btn-hero-register'); if (b) b.hidden = !!session;
  const n = session ? [profile?.username, profile?.nombre_display].filter(Boolean) : [];
  if (n.join('|') === misNombres.join('|')) return;
  misNombres = n; pintarPartidos(); pintarTuPartido(); pintarTabla();   // «tu partido» y «tú» en la tabla dependen de quién eres
});

// ---- Pestañas Próximos / Resultados ----
$('seg-partidos').addEventListener('click', (e) => {
  const b = e.target.closest('button[data-v]'); if (!b || b.dataset.v === pestana) return;
  pestana = b.dataset.v; $('seg-partidos').querySelectorAll('button').forEach((x) => x.setAttribute('aria-pressed', String(x === b))); pintarPartidos();
});
// ---- XI plegado en celular, abierto en PC ----
$('seg-mejor').addEventListener('click', (e) => {
  const b = e.target.closest('button[data-m]'); if (!b) return; const xi = b.dataset.m === 'xi';
  $('seg-mejor').querySelectorAll('button').forEach((x) => x.setAttribute('aria-pressed', String(x === b)));
  $('featured-players-container').hidden = xi; $('xi-wrap').hidden = !xi;
  if (xi) { const w = $('xi-wrap'); w.classList.remove('xi-entra'); void w.offsetWidth; w.classList.add('xi-entra'); } else cerrarPodio();
});

// ---- Pulso de la comunidad: cuatro conteos reales (head:true no descarga filas, solo el número). Si uno falla se queda en «—». ----
async function contar(consulta, id) {
  try { const { count, error } = await consulta; if (error) throw error; const el = $(`pulso-${id}`); if (cifra(count) === '—') el.textContent = '—'; else contarHasta(el, count); }
  catch (e) { console.error(`[central] pulso ${id}:`, e?.message ?? e); }
}
const head = { count: 'exact', head: true };
contar(supabase.from('jugadores').select('id', head), 'jugadores');
contar(supabase.from('perfiles').select('id', head), 'comunidad');
contar(supabase.from('perfiles').select('id', head).eq('puede_hostear', true), 'hosts');
contar(supabase.from('retos_matchmaking').select('id', head).eq('estado', 'BUSCANDO'), 'retos');

activarReveal();

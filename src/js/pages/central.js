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
import { cifra, ordenPodio, jornadasCentral, partidoDestacado, visualClub } from '../core/central.js';

const $ = (id) => document.getElementById(id);

// Edición en curso de la Galaxy League (la misma fuente que la página Liga). Si no hay ninguna en curso, se muestran estados vacíos.
const edicion = EDICIONES.galaxy.find((e) => e.estado === 'en_curso') ?? null;
const fechas = edicion?.fechas ?? [];
const clubDe = (n) => edicion?.clubes?.[n] ?? '';
const jornadas = jornadasCentral(fechas);
const tabla = calcularTabla(fechas.flatMap((f) => f.partidos)).tabla;
const club = (n) => escapeHTML(clubDe(n).toUpperCase());

let pestana = 'proximos';
function pintarPartidos() {
  const grupos = pestana === 'proximos' ? (jornadas.proximos ? [jornadas.proximos] : []) : jornadas.resultados;
  if (!grupos.length) { $('matches-container').innerHTML = `<div class="text-center text-gray-500 text-sm py-6 glass-panel rounded-xl">${pestana === 'proximos' ? 'No hay partidos por jugar por ahora.' : 'Aún no hay resultados.'}</div>`; return; }
  const lado = (n, gana, der) => `<span class="min-w-0 ${der ? 'text-right' : ''}"><span class="block truncate text-sm sm:text-base ${gana ? 'font-bold text-white' : 'font-semibold text-gray-300'}">${escapeHTML(n)}</span><span class="block truncate text-[10px] text-gray-500 tracking-wider">${club(n)}</span></span>`;
  const fila = (m) => {
    const jugado = Number.isInteger(m.gl);
    return `<div class="glass-panel rounded-xl p-3 sm:p-4 grid grid-cols-[minmax(0,1fr)_auto_minmax(0,1fr)] gap-2 items-center text-white">
      ${lado(m.l, jugado && m.gl > m.gv)}
      <span class="text-center font-display font-bold text-lg sm:text-2xl bg-black/50 py-1 px-3 rounded border border-galaxy-border whitespace-nowrap">${jugado ? `${m.gl} - ${m.gv}` : 'VS'}</span>
      ${lado(m.v, jugado && m.gv > m.gl, true)}
    </div>`;
  };
  $('matches-container').innerHTML = grupos.map((j) => `<div class="text-[11px] font-display font-bold text-galaxy-400 uppercase tracking-[0.2em]">Fecha ${j.n}${edicion ? ` · ${escapeHTML(edicion.nombre)}` : ''}</div>${j.partidos.map(fila).join('')}`).join('');
}

function pintarDestacado() {
  const box = $('destacado'); const m = partidoDestacado(jornadas.proximos?.partidos, tabla);
  if (!m) { box.innerHTML = '<div class="p-6 text-center text-gray-500 text-xs">Aún no hay un partido destacado: no quedan cruces por jugar.</div>'; return; }
  const pos = (n) => tabla.findIndex((t) => t.nombre === n) + 1;
  const lado = (n, der) => {
    const v = visualClub(clubDe(n), CLUBES_VISUAL);
    const escudo = `<div class="w-14 h-14 sm:w-20 sm:h-20 shrink-0 rounded-full border-2 flex items-center justify-center font-display font-bold text-lg sm:text-2xl ${v.oscuro ? 'text-black' : 'text-white'}" style="border-color:${v.a};background:linear-gradient(135deg,${v.a},${v.b});box-shadow:0 0 20px ${v.a}66">${escapeHTML(v.sigla)}</div>`;
    const txt = `<div class="min-w-0"><div class="inline-flex items-center gap-1.5 px-2 py-0.5 whitespace-nowrap rounded bg-galaxy-600/25 border border-galaxy-400/30 text-[10px] text-galaxy-400 font-bold mb-1">${pos(n) ? `${pos(n)}.º en la tabla` : 'Sin puesto'}</div>
      <h3 class="font-display font-bold text-xl sm:text-3xl text-white text-shadow-glow truncate uppercase">${escapeHTML(n)}</h3><p class="text-[11px] sm:text-sm text-galaxy-400 uppercase tracking-widest font-bold truncate">${club(n)}</p></div>`;
    return `<div class="flex flex-col-reverse ${der ? 'sm:flex-row-reverse sm:justify-end text-center sm:text-left' : 'sm:flex-row sm:justify-end text-center sm:text-right'} items-center gap-2 sm:gap-4 min-w-0">${txt}${escudo}</div>`;
  };
  box.innerHTML = `<div class="absolute top-0 right-0 bg-galaxy-600 text-white text-[10px] font-bold px-3 py-1 rounded-bl-lg uppercase tracking-widest z-10"><i class="fa-solid fa-fire mr-1"></i> Partido Destacado</div>
    <div class="absolute inset-0 bg-gradient-to-r from-blue-900/20 via-transparent to-white/10"></div>
    <div class="relative z-10 p-4 sm:p-6 pt-9 sm:pt-8 grid grid-cols-[minmax(0,1fr)_auto_minmax(0,1fr)] items-center gap-2 sm:gap-4">${lado(m.l, false)}
      <div class="flex flex-col items-center"><span class="font-display font-bold text-2xl sm:text-4xl text-galaxy-400 italic drop-shadow-[0_0_10px_rgba(0,229,255,0.8)]">VS</span><span class="text-[9px] sm:text-[10px] text-gray-500 uppercase tracking-widest mt-1 text-center">Fecha ${jornadas.proximos.n} · Parsec</span></div>${lado(m.v, true)}</div>`;
}

function renderDemo() {
  pintarPartidos(); pintarDestacado();
  $('mini-table-container').innerHTML = tabla.length ? tabla.map((t, i) => `
    <tr class="border-b border-galaxy-border/30 text-gray-300 text-sm">
      <td class="py-2 pl-1">${i + 1}</td><td class="pr-2 max-w-[9rem]"><span class="block truncate">${escapeHTML(t.nombre)}</span><span class="block truncate text-[10px] text-gray-500 tracking-wider">${club(t.nombre)}</span></td><td class="text-center text-gray-400">${t.pj}</td><td class="text-center font-bold text-white">${t.pts}</td>
    </tr>`).join('') : '<tr><td colspan="4" class="py-4 text-center text-gray-500 text-xs">Aún no hay partidos jugados.</td></tr>';
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
onSession(({ session }) => { const b = $('btn-hero-register'); if (b) b.hidden = !!session; });

// ---- Pestañas Próximos / Resultados ----
$('seg-partidos').addEventListener('click', (e) => {
  const b = e.target.closest('button[data-v]'); if (!b || b.dataset.v === pestana) return;
  pestana = b.dataset.v; $('seg-partidos').querySelectorAll('button').forEach((x) => x.setAttribute('aria-pressed', String(x === b))); pintarPartidos();
});
// ---- XI plegado en celular, abierto en PC ----
$('xi-det').open = window.matchMedia('(min-width: 1024px)').matches;

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

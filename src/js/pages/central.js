// Página Central: partidos y tabla (demo), XI ideal (demo) y Top 3 REAL desde `jugadores`.
import { supabase } from '../core/supabase.js';
import { escapeHTML } from '../core/dom.js';
import { playerCardHTML } from '../features/playerCard.js';
import { DEMO_MATCHES, DEMO_TABLE, DEMO_XI } from '../../data/demo.js';
import { openAuthModal } from '../features/auth.js';
import { onSession } from '../core/session.js';
import { cifra, partirPartidos, ordenPodio } from '../core/central.js';

const $ = (id) => document.getElementById(id);

let pestana = 'proximos';
function pintarPartidos() {
  const grupos = partirPartidos(DEMO_MATCHES);
  const lista = grupos[pestana];
  $('matches-container').innerHTML = lista.length ? lista.map((m) => `
    <div class="glass-panel rounded-xl p-3 sm:p-4 grid grid-cols-[minmax(0,1fr)_auto_minmax(0,1fr)] gap-2 items-center text-white">
      <span class="truncate font-semibold text-sm sm:text-base">${escapeHTML(m.local)}</span>
      <span class="text-center font-display font-bold text-lg sm:text-2xl bg-black/50 py-1 px-3 rounded border border-galaxy-border whitespace-nowrap">${escapeHTML(m.nota || `${m.gl} - ${m.gv}`)}</span>
      <span class="text-right truncate font-semibold text-sm sm:text-base">${escapeHTML(m.visita)}</span>
    </div>`).join('') : `<div class="text-center text-gray-500 text-sm py-6 glass-panel rounded-xl">${pestana === 'proximos' ? 'No hay partidos programados todavía.' : 'Aún no hay resultados.'}</div>`;
}

function renderDemo() {
  pintarPartidos();
  $('mini-table-container').innerHTML = DEMO_TABLE.map((t, i) => `
    <tr class="border-b border-galaxy-border/30 text-gray-300 text-sm">
      <td class="py-2 pl-1">${i + 1}</td><td class="truncate pr-2">${escapeHTML(t.nombre)}</td><td class="text-center font-bold text-white">${t.pts}</td>
    </tr>`).join('');
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
const podio = $('featured-players-container');
function alternarPodio(slot) {
  const abrir = !slot.classList.contains('podio-up');
  podio.querySelectorAll('.podio-slot').forEach((x) => { x.classList.remove('podio-up'); x.setAttribute('aria-pressed', 'false'); });
  if (abrir) { slot.classList.add('podio-up'); slot.setAttribute('aria-pressed', 'true'); }
}
podio.addEventListener('click', (e) => { const s = e.target.closest('.podio-slot'); if (s) alternarPodio(s); });
podio.addEventListener('keydown', (e) => { const s = e.target.closest('.podio-slot'); if (s && (e.key === 'Enter' || e.key === ' ')) { e.preventDefault(); alternarPodio(s); } });
document.addEventListener('click', (e) => { if (!e.target.closest('#featured-players-container')) podio.querySelectorAll('.podio-up').forEach((x) => { x.classList.remove('podio-up'); x.setAttribute('aria-pressed', 'false'); }); });
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

// Página Central: partidos y tabla (demo), XI ideal (demo) y Top 3 REAL desde `jugadores`.
import { supabase } from '../core/supabase.js';
import { escapeHTML } from '../core/dom.js';
import { playerCardHTML } from '../features/playerCard.js';
import { DEMO_MATCHES, DEMO_TABLE, DEMO_XI } from '../../data/demo.js';
import { openAuthModal } from '../features/auth.js';
import { onSession } from '../core/session.js';

const $ = (id) => document.getElementById(id);

function renderDemo() {
  $('matches-container').innerHTML = DEMO_MATCHES.map((m) => `
    <div class="glass-panel rounded-xl p-4 grid grid-cols-[minmax(0,1fr)_auto_minmax(0,1fr)] gap-2 items-center text-white">
      <span class="truncate font-semibold">${escapeHTML(m.local)}</span>
      <span class="text-center font-display font-bold text-xl sm:text-2xl bg-black/50 py-1 px-3 rounded border border-galaxy-border whitespace-nowrap">${escapeHTML(m.nota || `${m.gl} - ${m.gv}`)}</span>
      <span class="text-right truncate font-semibold">${escapeHTML(m.visita)}</span>
    </div>`).join('');
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
    box.innerHTML = data.map((p, i) => playerCardHTML(p, i, { wide: true })).join('');
  } catch (e) {
    console.error('[central] jugadores destacados:', e);
    box.innerHTML = `<div class="text-center text-gray-500 w-full py-6"><i class="fa-solid fa-users-slash text-2xl mb-2 block text-galaxy-600"></i>Aún no hay jugadores destacados para mostrar.</div>`;
  }
}

renderDemo();
renderFeatured();
$('btn-hero-register')?.addEventListener('click', () => openAuthModal('register'));
// Si ya hay sesión, el botón de "Crear Cuenta" sobra.
onSession(({ session }) => { const b = $('btn-hero-register'); if (b) b.hidden = !!session; });

// Base de Datos Global: lista, filtro por club, búsqueda; admin puede añadir/editar/borrar.
import { supabase } from '../core/supabase.js';
import { onSession, isAdmin } from '../core/session.js';
import { escapeHTML } from '../core/dom.js';
import { toast } from '../core/toast.js';
import { playerCardHTML } from '../features/playerCard.js';
import { openPlayerForm } from '../features/playerForm.js';
import { openCompare } from '../features/compare.js';
import { MAX_COMPARE } from '../core/compare.js';

const $ = (id) => document.getElementById(id);
let all = [];
let club = 'ALL';
let term = '';
const sel = []; // ids marcados para comparar (máx. 8; en el comparador se reparten en equipos A y B)

function paint() {
  const t = term.trim().toLowerCase();
  const list = all.filter((p) => (club === 'ALL' || p.club === club) && (!t || p.nombre.toLowerCase().includes(t)));
  const admin = isAdmin();
  $('players-container').innerHTML = list.length
    ? list.map((p, i) => `<div class="relative group/card ${sel.includes(p.id) ? 'cmp-sel' : ''}">${playerCardHTML(p, i)}
        <button type="button" data-cmp="${escapeHTML(p.id)}" aria-pressed="${sel.includes(p.id)}" aria-label="Comparar a ${escapeHTML(p.nombre)}" title="Comparar" class="cmp-btn"><i class="fa-solid fa-scale-balanced"></i></button>${admin ? `
        <div class="absolute top-2 right-2 flex gap-1 z-10">
          <button type="button" data-edit="${escapeHTML(p.id)}" aria-label="Editar" class="w-7 h-7 rounded bg-black/70 text-galaxy-400 hover:bg-galaxy-600 hover:text-white text-xs"><i class="fa-solid fa-pen"></i></button>
          <button type="button" data-del="${escapeHTML(p.id)}" aria-label="Borrar" class="w-7 h-7 rounded bg-black/70 text-bad hover:bg-bad hover:text-white text-xs"><i class="fa-solid fa-trash"></i></button>
        </div>` : ''}</div>`).join('')
    : `<div class="col-span-full text-center py-10 text-gray-500 text-sm">No hay jugadores que coincidan.</div>`;
  paintBar();
}

function paintBar() {
  const bar = $('cmp-bar'); bar.hidden = !sel.length;
  $('cmp-bar-txt').textContent = sel.length === 1 ? `${all.find((p) => p.id === sel[0])?.nombre ?? ''} · elige al menos otro` : `${sel.length} jugadores seleccionados`;
  $('cmp-go').disabled = sel.length < 2;
}

function fillClubs() {
  const sel = $('player-filter-select');
  const clubs = [...new Set(all.map((p) => p.club))].sort((a, b) => a.localeCompare(b));
  sel.innerHTML = `<option value="ALL">Todos los Equipos</option>` + clubs.map((c) => `<option value="${escapeHTML(c)}">${escapeHTML(c)}</option>`).join('');
  sel.value = clubs.includes(club) ? club : 'ALL'; club = sel.value;
}

async function load() {
  try {
    const { data, error } = await supabase.from('jugadores').select('*').order('ovr', { ascending: false });
    if (error) throw error;
    all = data ?? []; fillClubs(); paint();
  } catch (e) {
    console.error('[database] cargar:', e);
    $('players-container').innerHTML = `<div class="col-span-full text-center py-10 text-bad text-sm"><i class="fa-solid fa-triangle-exclamation mr-2"></i>No se pudo cargar la base de datos. Reintenta en unos segundos.</div>`;
  }
}

$('player-filter-select').addEventListener('change', (e) => { club = e.target.value; paint(); });
$('player-search-input').addEventListener('input', (e) => { term = e.target.value; paint(); });
$('btn-compare').addEventListener('click', () => (all.length < 2 ? toast('Aún no hay suficientes jugadores para comparar.', 'info') : openCompare(all, sel)));
$('cmp-go').addEventListener('click', () => openCompare(all, sel));
$('cmp-clear').addEventListener('click', () => { sel.length = 0; paint(); });
$('btn-add-player').addEventListener('click', () => openPlayerForm(null, load));
$('players-container').addEventListener('click', async (e) => {
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

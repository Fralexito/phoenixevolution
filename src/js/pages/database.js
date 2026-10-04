// Base de Datos Global: lista, filtro por club, búsqueda; admin puede añadir/editar/borrar.
import { supabase } from '../core/supabase.js';
import { onSession, isAdmin } from '../core/session.js';
import { escapeHTML } from '../core/dom.js';
import { href } from '../core/config.js';
import { toast } from '../core/toast.js';
import { playerCardHTML } from '../features/playerCard.js';
import { openPlayerForm } from '../features/playerForm.js';
import { openCompare } from '../features/compare.js';
import { MAX_COMPARE } from '../core/compare.js';
import { norm } from '../core/search.js';
import { nivelValido, cambiarNivel, anchoMinimo, separacion, esDenso, esUltimo } from '../core/density.js';
import { rankPlayers } from '../core/ranking.js';
import { mountAdvanced } from '../features/advancedSearch.js';
import { openStatLegend } from '../features/statLegend.js';

const $ = (id) => document.getElementById(id);
let all = [];
let club = 'ALL';
let term = '';
const sel = []; // ids marcados para comparar (máx. 8; en el comparador se reparten en equipos A y B)

let adv = null;   // búsqueda avanzada activa: { keys, min, top } o null

function tarjeta(p, i, extra = '') {
  const admin = isAdmin();
  return `<div class="relative group/card ${sel.includes(p.id) ? 'cmp-sel' : ''}">${playerCardHTML(p, i)}${extra}
        <button type="button" data-cmp="${escapeHTML(p.id)}" aria-pressed="${sel.includes(p.id)}" aria-label="Comparar a ${escapeHTML(p.nombre)}" title="Comparar" class="cmp-btn"><i class="fa-solid fa-scale-balanced"></i></button>
        <a href="${href(`jugador/?id=${encodeURIComponent(p.id)}`)}" aria-label="Ver perfil de ${escapeHTML(p.nombre)}" title="Ver perfil" class="cmp-btn perfil-btn"><i class="fa-solid fa-id-card"></i></a>${admin ? `
        <button type="button" data-menu="${escapeHTML(p.id)}" aria-label="Opciones de la ficha" aria-haspopup="true" class="card-menu-btn"><i class="fa-solid fa-ellipsis"></i></button>
        <div class="card-menu" data-menu-for="${escapeHTML(p.id)}" hidden>
          <button type="button" data-edit="${escapeHTML(p.id)}"><i class="fa-solid fa-pen mr-2"></i>Editar</button>
          <button type="button" data-del="${escapeHTML(p.id)}" class="text-bad"><i class="fa-solid fa-trash mr-2"></i>Borrar</button>
        </div>` : ''}</div>`;
}

function paint() {
  const t = norm(term);
  const list = all.filter((p) => (club === 'ALL' || p.club === club) && (!t || norm(p.nombre).includes(t) || norm(p.apodo).includes(t)));
  const box = $('players-container');
  if (adv) {
    // Modo ranking: mismos filtros (equipo y nombre), ordenados por el promedio de las stats elegidas.
    const r = rankPlayers(list, adv.keys, { min: adv.min, top: adv.top });
    box.innerHTML = r.length ? r.map((f, i) => tarjeta(f.p, i, `<span class="rank-badge" title="Puesto ${f.rank}">#${f.rank}</span>`)
      .replace(/<\/div>$/, `<div class="adv-strip">${adv.keys.map((k) => `<span>${k === 'ovr' ? 'MEDIA' : k.toUpperCase()} <b>${f.vals[k]}</b></span>`).join('')}${adv.keys.length > 1 ? `<span class="adv-prom">prom <b>${Math.round(f.score * 10) / 10}</b></span>` : ''}</div></div>`)).join('')
      : `<div class="col-span-full text-center py-10 text-gray-500 text-sm">Ningún jugador cumple ese mínimo en todas las stats elegidas.</div>`;
  } else {
    box.innerHTML = list.length ? list.map((p, i) => tarjeta(p, i)).join('') : `<div class="col-span-full text-center py-10 text-gray-500 text-sm">No hay jugadores que coincidan.</div>`;
  }
  paintBar();
}

function paintBar() {
  const bar = $('cmp-bar'); bar.hidden = !sel.length;
  $('cmp-bar-txt').textContent = sel.length === 1 ? `${all.find((p) => p.id === sel[0])?.nombre ?? ''} · elige al menos otro` : `${sel.length} jugadores seleccionados`;
  $('cmp-go').disabled = sel.length < 2;        // un solo botón: con 2 abre 1 vs 1; con 3 o más, la masiva (se puede cambiar dentro)
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
$('btn-compare').addEventListener('click', () => (all.length < 2 ? toast('Aún no hay suficientes jugadores para comparar.', 'info') : openCompare(all, sel[0], sel[1])));
$('cmp-go').addEventListener('click', () => openCompare(all, sel[0], sel[1], sel.length > 2 ? sel : null));
$('btn-leyenda').addEventListener('click', openStatLegend);

// ---- Zoom: el usuario elige el TAMAÑO de tarjeta; la cuadrícula (auto-fill) decide cuántas caben y las reparte parejas. ----
// Se recuerda por tipo de pantalla (celular / PC) en este navegador.
const esMovil = () => window.matchMedia('(max-width: 639px)').matches;
const claveZoom = () => (esMovil() ? 'pes-zoom-movil' : 'pes-zoom-pc');
const leerZoom = () => { try { return nivelValido(localStorage.getItem(claveZoom()), esMovil()); } catch { return nivelValido(null, esMovil()); } };
let nivel = leerZoom();
function aplicarZoom() {
  const m = esMovil(); nivel = nivelValido(nivel, m);
  const box = $('players-container');
  box.style.gridTemplateColumns = `repeat(auto-fill, minmax(${anchoMinimo(nivel, m)}px, 1fr))`; box.style.gap = `${separacion(nivel, m)}rem`; box.dataset.denso = String(esDenso(nivel, m));
  $('dens-mas').disabled = nivel === 0; $('dens-menos').disabled = esUltimo(nivel, m);
}
const moverZoom = (d) => { nivel = cambiarNivel(nivel, d, esMovil()); try { localStorage.setItem(claveZoom(), String(nivel)); } catch { /* sin almacenamiento: solo no se recuerda */ } aplicarZoom(); };
$('dens-menos').addEventListener('click', () => moverZoom(1));    // alejar: tarjetas más pequeñas
$('dens-mas').addEventListener('click', () => moverZoom(-1));     // acercar: tarjetas más grandes
// Ctrl + rueda sobre la lista (PC): acerca/aleja igual que en el explorador de archivos.
let ultimaRueda = 0;
$('players-container').addEventListener('wheel', (e) => { if (!e.ctrlKey) return; e.preventDefault(); const t = Date.now(); if (t - ultimaRueda < 140) return; ultimaRueda = t; moverZoom(e.deltaY > 0 ? 1 : -1); }, { passive: false });
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
$('players-container').addEventListener('click', async (e) => {
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

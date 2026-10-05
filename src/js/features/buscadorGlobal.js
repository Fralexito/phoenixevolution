// Buscador global (lupa de la cabecera, tecla «/» o Ctrl+K): páginas al instante y personas al escribir 2+ letras.
import { openModal, closeModal } from '../core/modal.js';
import { escapeHTML } from '../core/dom.js';
import { href } from '../core/config.js';
import { can } from '../core/session.js';
import { indicePaginas, buscarPaginas } from '../core/buscador.js';
import { buscarPersonas } from './social/api.js';
import { avatarHTML } from '../core/avatar.js';

const ID = 'buscador-global';
let indice = null, req = 0, timer = 0;
const SUGERIDAS = ['duelos', 'liga', 'tienda', 'eventos', 'clanes', 'ranking'];

const filaPagina = (p, i) => `<a href="${escapeHTML(href(p.path))}" role="option" data-i="${i}" class="bg-fila"><span class="nav-item-ico"><i class="fa-solid ${escapeHTML(p.icon)}"></i></span><span class="min-w-0 flex-1"><b class="block truncate text-white">${escapeHTML(p.label)}</b><small class="block truncate text-gray-400">${escapeHTML(p.seccion)} · ${escapeHTML(p.info ?? '')}</small></span><i class="fa-solid fa-arrow-right text-xs text-gray-600"></i></a>`;
const filaPersona = (u, i) => `<a href="${escapeHTML(href(`perfil/?u=${encodeURIComponent(u.username)}`))}" role="option" data-i="${i}" class="bg-fila"><span class="shrink-0">${avatarHTML(u.avatar, u.nombre, 32)}</span><span class="min-w-0 flex-1"><b class="block truncate text-white">${escapeHTML(u.nombre)}</b><small class="block truncate text-gray-400">@${escapeHTML(u.username)} · Persona</small></span><i class="fa-solid fa-arrow-right text-xs text-gray-600"></i></a>`;

function pintar(m, q, personas = []) {
  const todas = indice.filter((p) => !p.staff || can(p.staff));
  const l = q.trim() ? buscarPaginas(q, todas) : SUGERIDAS.map((id) => todas.find((p) => p.id === id)).filter(Boolean);
  let i = 0;
  m.querySelector('#bg-res').innerHTML = `${l.length ? `<p class="bg-et">${q.trim() ? 'Páginas' : 'Atajos'}</p>${l.map((p) => filaPagina(p, i++)).join('')}` : ''}
    ${personas.length ? `<p class="bg-et">Personas</p>${personas.map((u) => filaPersona(u, i++)).join('')}` : ''}
    ${!l.length && !personas.length ? `<p class="text-center text-xs text-gray-500 py-8">${q.trim().length >= 2 ? 'No encontré nada con eso. Prueba con otra palabra.' : 'Escribe para buscar.'}</p>` : ''}`;
  mover(m, 0);
}
function mover(m, n) { const f = [...m.querySelectorAll('.bg-fila')]; if (!f.length) return; const k = (n + f.length) % f.length; f.forEach((x, j) => x.toggleAttribute('data-sel', j === k)); f[k].scrollIntoView({ block: 'nearest' }); m.dataset.k = String(k); }

export function abrirBuscador() {
  indice ??= indicePaginas();
  const m = openModal(`<div class="p-4 sm:p-5 space-y-3">
    <div class="flex items-center gap-3 rounded-xl border border-galaxy-400/40 bg-black/40 px-3"><i class="fa-solid fa-magnifying-glass text-galaxy-400"></i>
      <input id="bg-q" type="search" autocomplete="off" maxlength="40" class="flex-1 bg-transparent py-3 text-white outline-none placeholder:text-gray-500" placeholder="¿Qué buscas? Página, función o persona…" aria-label="Buscar en el sitio">
      <kbd class="hidden sm:inline text-[10px] text-gray-500 border border-galaxy-border rounded px-1.5 py-0.5">Esc</kbd></div>
    <div id="bg-res" role="listbox" class="max-h-[55vh] overflow-y-auto space-y-0.5" aria-live="polite"></div>
    <p class="text-[10px] text-gray-600 text-center hidden sm:block">↑ ↓ para moverte · Enter para ir · / o Ctrl+K para abrir en cualquier momento</p></div>`, { id: ID });
  const inp = m.querySelector('#bg-q'); inp.focus(); pintar(m, '');
  inp.addEventListener('input', () => {
    const q = inp.value; pintar(m, q); clearTimeout(timer); const mi = ++req;
    if (q.trim().length < 2) return;
    timer = setTimeout(async () => { try { const p = await buscarPersonas(q.trim(), 5); if (mi === req && document.getElementById(ID)) pintar(m, inp.value, p); } catch (e) { console.warn('[buscador] personas:', e?.message ?? e); } }, 250);
  });
  inp.addEventListener('keydown', (e) => {
    const k = Number(m.dataset.k || 0);
    if (e.key === 'ArrowDown') { e.preventDefault(); mover(m, k + 1); } else if (e.key === 'ArrowUp') { e.preventDefault(); mover(m, k - 1); }
    else if (e.key === 'Enter') { e.preventDefault(); m.querySelector('.bg-fila[data-sel]')?.click(); }
  });
}

export function initBuscadorGlobal() {
  document.addEventListener('click', (e) => { if (e.target.closest('[data-abrir-buscador]')) { e.preventDefault(); abrirBuscador(); } });
  document.addEventListener('keydown', (e) => {
    const tag = (e.target?.tagName ?? '').toLowerCase(), escribiendo = tag === 'input' || tag === 'textarea' || tag === 'select' || e.target?.isContentEditable;
    if ((e.key === 'k' && (e.ctrlKey || e.metaKey)) || (e.key === '/' && !escribiendo && !e.ctrlKey && !e.metaKey)) { e.preventDefault(); document.getElementById(ID) ? closeModal(ID) : abrirBuscador(); }
  });
}

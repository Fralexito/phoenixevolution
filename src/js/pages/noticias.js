// Noticias: destacada + grilla, búsqueda, filtros por categoría y modal de lectura.
import { NOTICIAS } from '../../data/noticias.js';
import { escapeHTML, safeImg } from '../core/dom.js';
import { openModal } from '../core/modal.js';

const $ = (id) => document.getElementById(id);
let cat = 'TODOS';
let term = '';

const img = (n, cls) => `<img src="${escapeHTML(safeImg(n.imagen))}" alt="" loading="lazy" class="${cls}">`;

function featured(n) {
  return `<button type="button" data-id="${n.id}" class="block w-full text-left rounded-2xl overflow-hidden glass-panel group shadow-[0_0_35px_rgba(128,0,255,0.25)]">
    <div class="grid grid-cols-1 lg:grid-cols-2">
      <div class="h-64 lg:h-auto overflow-hidden relative">${img(n, 'w-full h-full object-cover group-hover:scale-105 transition-transform duration-700')}
        <div class="absolute inset-0 bg-gradient-to-t lg:bg-gradient-to-r from-transparent via-galaxy-dark/40 to-galaxy-panel"></div></div>
      <div class="p-8 flex flex-col justify-between">
        <div>
          <div class="inline-flex items-center gap-2 px-2.5 py-1 rounded bg-galaxy-600 text-[10px] font-bold text-white uppercase tracking-widest mb-3"><i class="fa-solid fa-bullhorn text-[9px]"></i> ${escapeHTML(n.tag)}</div>
          <h3 class="text-2xl md:text-3xl font-display font-bold text-white uppercase leading-tight group-hover:text-galaxy-400 transition-colors">${escapeHTML(n.titulo)}</h3>
          <p class="text-gray-300 text-sm mt-3 leading-relaxed line-clamp-3">${escapeHTML(n.resumen)}</p>
        </div>
        <div class="flex items-center justify-between pt-6 border-t border-white/10 text-xs text-gray-400">
          <span><i class="fa-regular fa-clock mr-1 text-galaxy-400"></i> ${escapeHTML(n.fecha)}</span>
          <span class="text-galaxy-400 font-bold uppercase tracking-wider">Leer comunicado completo →</span>
        </div>
      </div>
    </div></button>`;
}

function small(n) {
  return `<button type="button" data-id="${n.id}" class="text-left rounded-xl overflow-hidden border border-galaxy-line bg-galaxy-panel group flex flex-col justify-between hover:border-galaxy-400/50 transition-colors">
    <div>
      <div class="h-44 overflow-hidden relative">${img(n, 'w-full h-full object-cover group-hover:scale-110 transition-transform duration-500')}
        <span class="absolute top-2.5 left-2.5 px-2 py-0.5 rounded bg-black/80 border border-galaxy-border text-[9px] font-bold text-galaxy-400 uppercase tracking-wider">${escapeHTML(n.tag)}</span></div>
      <div class="p-5">
        <h4 class="font-display font-bold text-lg text-white group-hover:text-galaxy-400 transition-colors uppercase leading-snug">${escapeHTML(n.titulo)}</h4>
        <p class="text-xs text-gray-400 mt-2 line-clamp-3 leading-relaxed">${escapeHTML(n.resumen)}</p>
      </div>
    </div>
    <div class="p-5 pt-3 text-[11px] text-gray-500 border-t border-white/5 flex justify-between items-center">
      <span><i class="fa-regular fa-calendar mr-1"></i> ${escapeHTML(n.fecha)}</span><span class="text-galaxy-400 font-semibold uppercase">Leer más →</span>
    </div></button>`;
}

function paint() {
  const q = term.trim().toLowerCase();
  const list = NOTICIAS.filter((n) => (cat === 'TODOS' || n.categoria === cat) && (!q || [n.titulo, n.resumen, n.tag].some((s) => s.toLowerCase().includes(q))));
  $('news-featured').innerHTML = list.length ? featured(list[0]) : '';
  $('news-grid').innerHTML = !list.length
    ? `<div class="col-span-full text-center py-16 text-gray-500 text-sm">No hay noticias que coincidan con la búsqueda.</div>`
    : list.slice(1).map(small).join('');
}

function read(id) {
  const n = NOTICIAS.find((x) => x.id === id); if (!n) return;
  openModal(`<div class="p-6 md:p-8">
    <div class="flex justify-between items-start mb-4 border-b border-galaxy-border pb-3">
      <div><span class="px-2 py-0.5 rounded bg-galaxy-600 text-white font-bold text-[10px] uppercase tracking-wider inline-block">${escapeHTML(n.tag)}</span>
        <span class="text-xs text-gray-400 ml-2">• Publicado: ${escapeHTML(n.fecha)}</span>
        <h3 class="font-display font-bold text-2xl text-white uppercase mt-1 leading-snug">${escapeHTML(n.titulo)}</h3></div>
      <button type="button" data-close aria-label="Cerrar" class="text-gray-400 hover:text-white text-xl p-1"><i class="fa-solid fa-xmark"></i></button>
    </div>
    <div class="rounded-xl overflow-hidden mb-5 border border-galaxy-border max-h-72">${img(n, 'w-full h-full object-cover')}</div>
    <div class="text-gray-300 text-sm leading-relaxed space-y-3">${n.cuerpo.map((p) => `<p>${escapeHTML(p)}</p>`).join('')}</div>
    <div class="mt-6 pt-4 border-t border-galaxy-border/50 flex justify-end"><button type="button" data-close class="btn btn-primary">Cerrar comunicado</button></div>
  </div>`, { id: 'news-modal' });
}

$('news-search').addEventListener('input', (e) => { term = e.target.value; paint(); });
$('news-filters').addEventListener('click', (e) => {
  const b = e.target.closest('[data-cat]'); if (!b) return;
  cat = b.dataset.cat;
  document.querySelectorAll('#news-filters [data-cat]').forEach((x) => x.setAttribute('aria-pressed', String(x === b)));
  paint();
});
document.getElementById('news-root').addEventListener('click', (e) => { const b = e.target.closest('[data-id]'); if (b) read(Number(b.dataset.id)); });
paint();

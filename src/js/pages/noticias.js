// Noticias: destacada + grilla, búsqueda, filtros (categoría y liga), lector en modal con enlace propio y editor para admins.
// Fuente: tabla `noticias` de Supabase. Si falla o viene vacía, se usan las noticias estáticas de data/noticias.js (sin controles de edición).
import { NOTICIAS } from '../../data/noticias.js';
import { LIGAS } from '../../data/ligas.js';
import { escapeHTML, safeImg } from '../core/dom.js';
import { openModal, closeModal } from '../core/modal.js';
import { supabase } from '../core/supabase.js';
import { toast } from '../core/toast.js';
import { onSession, isAdmin } from '../core/session.js';
import { normalizar, ordenar, elegirDestacada, ligasPresentes, filtrar, fechaRelativa } from '../core/noticias.js';
import { abrirEditor, borrarNoticia } from '../features/noticiasAdmin.js';

const $ = (id) => document.getElementById(id);
const state = { lista: [], cat: 'TODOS', liga: 'TODAS', term: '' };
const nombreLiga = (id) => LIGAS.find((l) => l.id === id)?.titulo.join(' ') ?? id;
const cuando = (n) => (n.publicadaEn ? fechaRelativa(n.publicadaEn) : (n.fecha ?? ''));

const img = (n, cls) => (safeImg(n.imagen)
  ? `<img src="${escapeHTML(safeImg(n.imagen))}" alt="" loading="lazy" class="${cls}">`
  : `<div class="${cls} bg-gradient-to-br from-galaxy-600/40 to-black grid place-items-center text-galaxy-400/40 text-4xl"><i class="fa-solid fa-newspaper"></i></div>`);
const borrador = (n) => (n.publicada ? '' : '<span class="ml-2 px-1.5 py-0.5 rounded bg-amber-500/20 border border-amber-400/40 text-amber-300 text-[9px] font-bold uppercase tracking-wider">Borrador</span>');

function featured(n) {
  return `<button type="button" data-slug="${escapeHTML(n.slug)}" class="block w-full text-left rounded-2xl overflow-hidden glass-panel group shadow-[0_0_35px_rgba(128,0,255,0.25)]">
    <div class="grid grid-cols-1 lg:grid-cols-2">
      <div class="h-64 lg:h-auto overflow-hidden relative">${img(n, 'w-full h-full object-cover group-hover:scale-105 transition-transform duration-700')}
        <div class="absolute inset-0 bg-gradient-to-t lg:bg-gradient-to-r from-transparent via-galaxy-dark/40 to-galaxy-panel"></div></div>
      <div class="p-8 flex flex-col justify-between">
        <div>
          <div class="inline-flex items-center gap-2 px-2.5 py-1 rounded bg-galaxy-600 text-[10px] font-bold text-white uppercase tracking-widest mb-3"><i class="fa-solid fa-bullhorn text-[9px]"></i> ${escapeHTML(n.tag || n.categoria)}</div>${borrador(n)}
          <h3 class="text-2xl md:text-3xl font-display font-bold text-white uppercase leading-tight group-hover:text-galaxy-400 transition-colors">${escapeHTML(n.titulo)}</h3>
          <p class="text-gray-300 text-sm mt-3 leading-relaxed line-clamp-3">${escapeHTML(n.resumen)}</p>
        </div>
        <div class="flex items-center justify-between pt-6 border-t border-white/10 text-xs text-gray-400">
          <span><i class="fa-regular fa-clock mr-1 text-galaxy-400"></i> ${escapeHTML(cuando(n))}</span>
          <span class="text-galaxy-400 font-bold uppercase tracking-wider">Leer comunicado completo →</span>
        </div>
      </div>
    </div></button>`;
}

function small(n) {
  return `<button type="button" data-slug="${escapeHTML(n.slug)}" class="text-left rounded-xl overflow-hidden border border-galaxy-line bg-galaxy-panel group flex flex-col justify-between hover:border-galaxy-400/50 transition-colors">
    <div>
      <div class="h-44 overflow-hidden relative">${img(n, 'w-full h-full object-cover group-hover:scale-110 transition-transform duration-500')}
        <span class="absolute top-2.5 left-2.5 px-2 py-0.5 rounded bg-black/80 border border-galaxy-border text-[9px] font-bold text-galaxy-400 uppercase tracking-wider">${escapeHTML(n.tag || n.categoria)}</span></div>
      <div class="p-5">
        <h4 class="font-display font-bold text-lg text-white group-hover:text-galaxy-400 transition-colors uppercase leading-snug">${escapeHTML(n.titulo)}${borrador(n)}</h4>
        <p class="text-xs text-gray-400 mt-2 line-clamp-3 leading-relaxed">${escapeHTML(n.resumen)}</p>
      </div>
    </div>
    <div class="p-5 pt-3 text-[11px] text-gray-500 border-t border-white/5 flex justify-between items-center">
      <span><i class="fa-regular fa-calendar mr-1"></i> ${escapeHTML(cuando(n))}</span><span class="text-galaxy-400 font-semibold uppercase">Leer más →</span>
    </div></button>`;
}

function paintLigas() {
  const ids = ligasPresentes(state.lista); const box = $('news-ligas');
  box.hidden = ids.length < 2;
  if (state.liga !== 'TODAS' && !ids.includes(state.liga)) state.liga = 'TODAS';
  box.innerHTML = ids.length < 2 ? '' : ['TODAS', ...ids].map((id) => `<button type="button" data-liga="${escapeHTML(id)}" aria-pressed="${String(id === state.liga)}" class="toggle-btn px-3 py-1.5 rounded text-gray-400 hover:text-white transition-colors">${id === 'TODAS' ? 'Todas las ligas' : escapeHTML(nombreLiga(id))}</button>`).join('');
}

function paint() {
  const list = filtrar(state.lista, state);
  const dest = elegirDestacada(list);
  $('news-featured').innerHTML = dest ? featured(dest) : '';
  $('news-grid').innerHTML = !list.length
    ? `<div class="col-span-full text-center py-16 text-gray-500 text-sm">No hay noticias que coincidan con la búsqueda.</div>`
    : list.filter((n) => n !== dest).map(small).join('');
}

/** Mantiene ?n=<slug> en la URL mientras el lector está abierto (para compartir/copiar). */
function url(slug) { const u = new URL(location.href); if (slug) u.searchParams.set('n', slug); else u.searchParams.delete('n'); return u.toString(); }
const setUrl = (slug) => { try { history.replaceState(null, '', url(slug)); } catch (e) { console.warn('[noticias] url:', e); } };

function read(slug) {
  const n = state.lista.find((x) => x.slug === slug); if (!n) return;
  const admin = isAdmin() && n.editable;
  const wrap = openModal(`<div class="p-6 md:p-8">
    <div class="flex justify-between items-start mb-4 border-b border-galaxy-border pb-3">
      <div><span class="px-2 py-0.5 rounded bg-galaxy-600 text-white font-bold text-[10px] uppercase tracking-wider inline-block">${escapeHTML(n.tag || n.categoria)}</span>
        <span class="text-xs text-gray-400 ml-2">• Publicado: ${escapeHTML(cuando(n))}</span>${borrador(n)}
        <h3 class="font-display font-bold text-2xl text-white uppercase mt-1 leading-snug">${escapeHTML(n.titulo)}</h3></div>
      <button type="button" data-close aria-label="Cerrar" class="text-gray-400 hover:text-white text-xl p-1"><i class="fa-solid fa-xmark"></i></button>
    </div>
    <div class="rounded-xl overflow-hidden mb-5 border border-galaxy-border max-h-72">${img(n, 'w-full h-full object-cover')}</div>
    <div class="text-gray-300 text-sm leading-relaxed space-y-3">${n.cuerpo.map((p) => `<p>${escapeHTML(p)}</p>`).join('')}</div>
    <div class="mt-6 pt-4 border-t border-galaxy-border/50 flex flex-wrap gap-2 justify-between">
      <div class="flex gap-2">
        <button type="button" data-copiar class="btn btn-ghost"><i class="fa-solid fa-link"></i> Copiar enlace</button>
        ${admin ? `<button type="button" data-editar class="btn btn-ghost"><i class="fa-solid fa-pen"></i> Editar</button><button type="button" data-borrar class="btn btn-ghost !text-rose-400">Eliminar</button>` : ''}
      </div>
      <button type="button" data-close class="btn btn-primary">Cerrar comunicado</button>
    </div>
  </div>`, { id: 'news-modal', onClose: () => setUrl(null) });
  setUrl(slug);
  wrap.querySelector('[data-copiar]').addEventListener('click', async () => {
    try { await navigator.clipboard.writeText(url(slug)); toast('Enlace copiado.', 'ok'); }
    catch (e) { console.warn('[noticias] copiar:', e); toast('No se pudo copiar; copia la dirección del navegador.', 'warn'); }
  });
  wrap.querySelector('[data-editar]')?.addEventListener('click', () => { closeModal('news-modal'); abrirEditor({ noticia: n, slugsUsados: state.lista.map((x) => x.slug), onGuardada: cargar }); });
  const del = wrap.querySelector('[data-borrar]');
  del?.addEventListener('click', async () => {
    if (del.dataset.seguro !== '1') { del.dataset.seguro = '1'; del.textContent = '¿Seguro? Pulsa de nuevo'; return; }
    if (await borrarNoticia(n)) { closeModal('news-modal'); cargar(); }
  });
}

async function cargar() {
  let filas = null;
  try {
    const { data, error } = await supabase.from('noticias').select('*').order('publicada_en', { ascending: false });
    if (error) throw error;
    filas = (data ?? []).map((f) => normalizar({ ...f, editable: true }));
  } catch (e) { console.error('[noticias] cargar:', e); }
  state.lista = ordenar(filas?.length ? filas : NOTICIAS.map((n) => normalizar({ ...n, slug: `demo-${n.id}`, cuerpo: n.cuerpo.join('\n\n'), publicadaEn: '', editable: false })));
  paintLigas(); paint();
}

$('news-search').addEventListener('input', (e) => { state.term = e.target.value; paint(); });
const pulsar = (cont, attr, clave) => (e) => {
  const b = e.target.closest(`[${attr}]`); if (!b) return;
  state[clave] = b.getAttribute(attr);
  cont.querySelectorAll(`[${attr}]`).forEach((x) => x.setAttribute('aria-pressed', String(x === b)));
  paint();
};
$('news-filters').addEventListener('click', pulsar($('news-filters'), 'data-cat', 'cat'));
$('news-ligas').addEventListener('click', pulsar($('news-ligas'), 'data-liga', 'liga'));
$('news-root').addEventListener('click', (e) => { const b = e.target.closest('[data-slug]'); if (b) read(b.dataset.slug); });
$('news-nueva').addEventListener('click', () => abrirEditor({ slugsUsados: state.lista.map((x) => x.slug), onGuardada: cargar }));
// Los admins ven el botón «Nueva noticia» y los borradores (la BD solo se los entrega a ellos).
onSession(() => { $('news-nueva').hidden = !isAdmin(); cargar().then(() => { const s = new URLSearchParams(location.search).get('n'); if (s && !document.getElementById('news-modal')) read(s); }); });

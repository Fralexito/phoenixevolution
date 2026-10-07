// Noticias: destacada + grilla, búsqueda, filtros (categoría y liga), lector en modal con enlace propio y editor para admins.
// Fuente: tabla `noticias` de Supabase. Si falla o viene vacía, se usan las noticias estáticas de data/noticias.js (sin controles de edición).
import { NOTICIAS } from '../../data/noticias.js';
import { LIGAS } from '../../data/ligas.js';
import { escapeHTML, safeImg } from '../core/dom.js';
import { openModal, closeModal } from '../core/modal.js';
import { supabase } from '../core/supabase.js';
import { toast } from '../core/toast.js';
import { onSession, can } from '../core/session.js';
import { normalizar, ordenar, elegirDestacada, ligasPresentes, filtrar, fechaRelativa } from '../core/noticias.js';
import { abrirEditor, borrarNoticia, ocultarNoticia, guardarDiseno } from '../features/noticiasAdmin.js';
import { tarjetaHTML, lecturaHTML } from '../features/noticias/tarjetas.js';
import { abrirCatalogo } from '../features/noticias/catalogo.js';
import { entrarAcomodar } from '../features/noticias/acomodar.js';
import { asignarDiseno, plantillaDe } from '../core/noticiasPlantillas.js';
import { hayLienzo, ordenLectura, FILA_PX } from '../core/noticiasLienzo.js';

const $ = (id) => document.getElementById(id);
const state = { lista: [], cat: 'TODOS', liga: 'TODAS', term: '' };
const nombreLiga = (id) => LIGAS.find((l) => l.id === id)?.titulo.join(' ') ?? id;
const cuando = (n) => (n.publicadaEn ? fechaRelativa(n.publicadaEn) : (n.fecha ?? ''));

const borrador = (n) => (n.publicada ? '' : '<span class="ml-2 px-1.5 py-0.5 rounded bg-amber-500/20 border border-amber-400/40 text-amber-300 text-[12px] font-bold uppercase tracking-wider">Borrador</span>');
const ctx = { cuando, ligaNombre: nombreLiga, borrador };
const disenos = new Map();   // slug → { plantilla, estilo } tal como se ve ahora (el lector usa el mismo)

function paintLigas() {
  const ids = ligasPresentes(state.lista); const box = $('news-ligas');
  box.hidden = ids.length < 2;
  if (state.liga !== 'TODAS' && !ids.includes(state.liga)) state.liga = 'TODAS';
  box.innerHTML = ids.length < 2 ? '' : ['TODAS', ...ids].map((id) => `<button type="button" data-liga="${escapeHTML(id)}" aria-pressed="${String(id === state.liga)}" class="toggle-btn px-3 py-1.5 rounded text-gray-400 hover:text-white transition-colors">${id === 'TODAS' ? 'Todas las ligas' : escapeHTML(nombreLiga(id))}</button>`).join('');
}

let acomodo = null;   // modo «Acomodar» activo
function paint() {
  const list = filtrar(state.lista, state);
  if (acomodo) return;   // GridStack es dueño de la grilla mientras se acomoda
  if (hayLienzo(state.lista)) return paintLienzo(list);
  const dest = elegirDestacada(list); const resto = list.filter((n) => n !== dest);
  const orden = dest ? [dest, ...resto] : resto;
  disenos.clear(); asignarDiseno(orden, { heroIdx: dest ? 0 : -1 }).forEach((d, i) => disenos.set(orden[i].slug, d));
  $('news-featured').innerHTML = dest ? tarjetaHTML(dest, disenos.get(dest.slug).plantilla, disenos.get(dest.slug).estilo, ctx) : '';
  $('news-grid').className = '';
  $('news-grid').innerHTML = !list.length
    ? `<div class="col-span-full text-center py-16 text-gray-500 text-sm">No hay noticias que coincidan con la búsqueda.</div>`
    : resto.map((n) => tarjetaHTML(n, disenos.get(n.slug).plantilla, disenos.get(n.slug).estilo, ctx)).join('');
}

const tarjetaDe = (n) => { const d = disenos.get(n.slug); return tarjetaHTML(n, d.plantilla, d.estilo, ctx); };
/** Lienzo libre: cada tarjeta en la posición y tamaño que eligió el staff (en PC). En celular, una columna en orden de lectura. */
function paintLienzo(list) {
  const orden = ordenLectura(list);
  disenos.clear(); asignarDiseno(orden, { heroIdx: -1 }).forEach((d, i) => disenos.set(orden[i].slug, d));
  $('news-featured').innerHTML = '';
  const g = $('news-grid'); g.className = 'nt-lienzo'; g.style.setProperty('--fila', `${FILA_PX}px`);
  g.innerHTML = !list.length ? '<div class="text-center py-16 text-gray-500 text-sm">No hay noticias que coincidan con la búsqueda.</div>'
    : orden.map((n) => { const l = n.lienzo; return `<div class="nt-celda" style="${l ? `--x:${l.x + 1};--y:${l.y + 1};--w:${l.w};--h:${l.h}` : '--w:4;--h:4'}">${tarjetaDe(n)}</div>`; }).join('');
}

/** Mantiene ?n=<slug> en la URL mientras el lector está abierto (para compartir/copiar). */
function url(slug) { const u = new URL(location.href); if (slug) u.searchParams.set('n', slug); else u.searchParams.delete('n'); return u.toString(); }
const setUrl = (slug) => { try { history.replaceState(null, '', url(slug)); } catch (e) { console.warn('[noticias] url:', e); } };

function read(slug) {
  const n = state.lista.find((x) => x.slug === slug); if (!n) return;
  const puedeEditar = can('editarLiga') && n.editable; const puedeBorrar = can('borrarLiga') && n.editable;   // el moderador edita y oculta; borrar es solo del admin
  const d = disenos.get(n.slug) ?? asignarDiseno([n])[0];
  const acciones = `<div class="flex flex-wrap gap-2 justify-between">
      <div class="flex flex-wrap gap-2">
        <button type="button" data-copiar class="btn btn-ghost"><i class="fa-solid fa-link"></i> Copiar enlace</button>
        ${puedeEditar ? `<button type="button" data-editar class="btn btn-ghost"><i class="fa-solid fa-pen"></i> Editar</button><button type="button" data-redisenar class="btn btn-ghost"><i class="fa-solid fa-palette"></i> Rediseñar</button>` : ''}${puedeEditar && n.publicada ? `<button type="button" data-ocultar class="btn btn-ghost"><i class="fa-solid fa-eye-slash"></i> Ocultar</button>` : ''}${puedeBorrar ? `<button type="button" data-borrar class="btn btn-ghost !text-rose-400">Eliminar</button>` : ''}
      </div>
      <button type="button" data-close class="btn btn-primary">Cerrar</button></div>`;
  const wrap = openModal(lecturaHTML(n, d.estilo, ctx, acciones), { id: 'news-modal', onClose: () => setUrl(null) });
  setUrl(slug);
  wrap.querySelector('[data-copiar]').addEventListener('click', async () => {
    try { await navigator.clipboard.writeText(url(slug)); toast('Enlace copiado.', 'ok'); }
    catch (e) { console.warn('[noticias] copiar:', e); toast('No se pudo copiar; copia la dirección del navegador.', 'warn'); }
  });
  wrap.querySelector('[data-redisenar]')?.addEventListener('click', () => { closeModal('news-modal'); abrirDisenos(n.id); });
  wrap.querySelector('[data-editar]')?.addEventListener('click', () => { closeModal('news-modal'); abrirEditor({ noticia: n, slugsUsados: state.lista.map((x) => x.slug), onGuardada: cargar }); });
  wrap.querySelector('[data-ocultar]')?.addEventListener('click', async () => { if (await ocultarNoticia(n)) { closeModal('news-modal'); cargar(); } });
  const del = wrap.querySelector('[data-borrar]');
  del?.addEventListener('click', async () => {
    if (del.dataset.seguro !== '1') { del.dataset.seguro = '1'; del.textContent = '¿Seguro? Pulsa de nuevo'; return; }
    if (await borrarNoticia(n)) { closeModal('news-modal'); cargar(); }
  });
}

/** Catálogo de diseños (admins): elegir una noticia y aplicarle plantilla + estilo. */
function abrirDisenos(id = null) {
  const lista = state.lista.filter((n) => n.editable); if (!lista.length) { toast('Aún no hay noticias reales para rediseñar.', 'warn'); return; }
  const n0 = lista.find((n) => n.id === id) ?? lista[0];
  abrirCatalogo({ noticias: lista, noticiaId: n0.id, inicial: { plantilla: n0.plantilla, estilo: n0.estilo }, ctx, onAplicar: async ({ noticia, plantilla, estilo }) => {
    if (!noticia) return; if (!(await guardarDiseno(noticia, plantilla, estilo))) throw new Error('no guardado'); await cargar();
  } });
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
$('news-root').addEventListener('click', (e) => { if (acomodo) return; const b = e.target.closest('[data-slug]'); if (b) read(b.dataset.slug); });
$('news-disenos').addEventListener('click', () => abrirDisenos());
const barraAcomodo = (on) => { $('news-acomodar').hidden = on; $('news-acomodar-barra').hidden = !on; $('news-disenos').hidden = on; $('news-filters').classList.toggle('opacity-40', on); $('news-filters').classList.toggle('pointer-events-none', on); };
$('news-acomodar').addEventListener('click', async () => {
  if (!state.lista.some((n) => n.editable)) { toast('Aún no hay noticias reales para acomodar.', 'warn'); return; }
  state.cat = 'TODOS'; state.liga = 'TODAS'; state.term = ''; $('news-search').value = '';
  barraAcomodo(true); paintLienzo(state.lista);   // asegura diseños asignados para todas
  const items = ordenLectura(state.lista).map((n) => { const d = disenos.get(n.slug); return { id: n.id, html: tarjetaDe(n), lienzo: n.lienzo, cols: plantillaDe(d.plantilla)?.cols ?? 1 }; });
  acomodo = true;
  try { acomodo = await entrarAcomodar({ grid: $('news-grid'), items, alSalir: async (ok) => { acomodo = null; barraAcomodo(false); if (ok) await cargar(); else paint(); } }); }
  catch (e) { console.error('[noticias] gridstack:', e); toast('No se pudo activar el modo acomodar.', 'error'); acomodo = null; barraAcomodo(false); paint(); }
});
$('news-acomodar-ok').addEventListener('click', () => acomodo?.guardar?.());
$('news-acomodar-no').addEventListener('click', () => acomodo?.cancelar?.());
$('news-nueva').addEventListener('click', () => abrirEditor({ slugsUsados: state.lista.map((x) => x.slug), onGuardada: cargar }));
// Los admins ven el botón «Nueva noticia» y los borradores (la BD solo se los entrega a ellos).
onSession(() => { $('news-nueva').hidden = !can('editarLiga'); $('news-disenos').hidden = !can('editarLiga'); $('news-acomodar').hidden = !can('editarLiga'); cargar().then(() => { const s = new URLSearchParams(location.search).get('n'); if (s && !document.getElementById('news-modal')) read(s); }); });

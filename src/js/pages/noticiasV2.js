// NOTICIAS v2 (ronda 351, FX.noticiasV2): arriba EL FÉNIX (diario chicha, una portada por semana) y abajo la zona seria.
// Al tocar una noticia se abre el LECTOR de página completa (?n=<slug>, se puede compartir). Lo anterior sigue en
// pages/noticias.js y se ve con ?clasica=1 (ahí está «Acomodar» y el catálogo de diseños para el staff).
import { NOTICIAS } from '../../data/noticias.js';
import { LIGAS } from '../../data/ligas.js';
import { supabase } from '../core/supabase.js';
import { toast } from '../core/toast.js';
import { onSession, can } from '../core/session.js';
import { normalizar, ordenar, fechaRelativa, ligasPresentes } from '../core/noticias.js';
import { armarPortada } from '../core/diario.js';
import { departamento } from '../core/departamentos.js';
import { escapeHTML as esc } from '../core/dom.js';
import { abrirEditor, borrarNoticia, ocultarNoticia } from '../features/noticiasAdmin.js';
import { montarFenix } from '../features/noticias/fenix.js';
import { zonaSeriaHTML, contarBloques } from '../features/noticias/zonaSeria.js';
import { pintarLector } from '../features/noticias/lector.js';

const $ = (id) => document.getElementById(id);
const state = { lista: [], liga: 'galaxy', bloque: 'TODOS', term: '' };
const cuando = (n) => (n.publicadaEn ? fechaRelativa(n.publicadaEn) : (n.fecha ?? ''));
const borrador = (n) => (n.publicada ? '' : ' <span class="nv-borrador">Borrador</span>');
const nombreLiga = (id) => LIGAS.find((l) => l.id === id)?.titulo?.join(' ') ?? id;

function filtrada() {
  const t = state.term.trim().toLowerCase();
  return state.lista.filter((n) => n.liga === state.liga && (!t || `${n.titulo} ${n.resumen} ${n.tag}`.toLowerCase().includes(t)));
}

function pintarSeria() {
  try {
    const base = filtrada();
    const todo = armarPortada(base, { max: 50 });
    const conteos = contarBloques(todo.orden);
    const items = state.bloque === 'TODOS' ? base : todo.orden.filter((it) => departamento(it.dep).bloque === state.bloque).map((it) => it.noticia);
    const portada = armarPortada(items, { max: 8 });
    $('nv-seria').innerHTML = zonaSeriaHTML({ portada, bloque: state.bloque, conteos, total: todo.orden.length, cuando, ligaId: state.liga, borrador });
  } catch (e) {
    console.error('[noticias-v2] zona seria:', e);
    $('nv-seria').innerHTML = '<p class="nv-vacio">No se pudieron ordenar las noticias. Recarga la página.</p>';
  }
}

function pintarLigas() {
  const ligas = ligasPresentes(state.lista);
  if (!ligas.includes(state.liga) && ligas.length) state.liga = ligas[0];
  $('nv-ligas').innerHTML = ligas.length > 1 ? ligas.map((id) => `<button type="button" data-liga="${esc(id)}" aria-pressed="${id === state.liga}">${esc(nombreLiga(id))}</button>`).join('') : '';
}

// ─── Lector (página completa) ─────────────────────────────────────────────────────────────────────────────────────
function urlCon(slug) { const u = new URL(location.href); if (slug) u.searchParams.set('n', slug); else u.searchParams.delete('n'); return u.toString(); }
function abrir(slug, { empujar = true } = {}) {
  const n = state.lista.find((x) => x.slug === slug);
  if (!n) { if (slug) toast('Esa noticia ya no está disponible.', 'warn'); cerrar({ empujar: false }); return; }
  try { if (empujar) history.pushState({ n: slug }, '', urlCon(slug)); } catch (e) { console.warn('[noticias-v2] url:', e); }
  $('nv-portada').hidden = true; $('nv-lector').hidden = false;
  pintarLector($('nv-lector'), n, {
    lista: state.lista, cuando,
    alVolver: () => cerrar(),
    alAbrir: (s) => abrir(s),
    acciones: {
      editar: (x) => abrirEditor({ noticia: x, slugsUsados: state.lista.map((y) => y.slug), onGuardada: () => cargar().then(() => abrir(x.slug, { empujar: false })) }),
      ocultar: async (x) => { if (await ocultarNoticia(x)) { await cargar(); cerrar(); } },
      borrar: async (x) => { if (await borrarNoticia(x)) { await cargar(); cerrar(); } },
    },
  });
  document.title = `${n.titulo} · Noticias`;
  window.scrollTo({ top: 0 });
}
function cerrar({ empujar = true } = {}) {
  try { if (empujar) history.pushState({}, '', urlCon(null)); } catch (e) { console.warn('[noticias-v2] url:', e); }
  $('nv-lector').hidden = true; $('nv-lector').innerHTML = ''; $('nv-portada').hidden = false;
  document.title = 'Noticias';
}
window.addEventListener('popstate', () => { const s = new URLSearchParams(location.search).get('n'); if (s) abrir(s, { empujar: false }); else cerrar({ empujar: false }); });

// ─── Datos ────────────────────────────────────────────────────────────────────────────────────────────────────────
async function cargar() {
  let filas = null;
  try {
    const { data, error } = await supabase.from('noticias').select('*').order('publicada_en', { ascending: false });
    if (error) throw error;
    filas = (data ?? []).map((f) => normalizar({ ...f, editable: true }));
  } catch (e) { console.error('[noticias-v2] cargar:', e); }
  state.lista = ordenar(filas?.length ? filas : NOTICIAS.map((n) => normalizar({ ...n, slug: `demo-${n.id}`, cuerpo: n.cuerpo.join('\n\n'), publicadaEn: '', editable: false })));
  pintarLigas(); pintarSeria();
}

// ─── Eventos ──────────────────────────────────────────────────────────────────────────────────────────────────────
$('nv-seria').addEventListener('click', (e) => {
  const s = e.target.closest('[data-slug]'); if (s) { abrir(s.dataset.slug); return; }
  const b = e.target.closest('[data-bloque]'); if (b) { state.bloque = b.dataset.bloque; pintarSeria(); }
});
$('nv-ligas').addEventListener('click', (e) => { const b = e.target.closest('[data-liga]'); if (!b) return; state.liga = b.dataset.liga; state.bloque = 'TODOS'; pintarLigas(); pintarSeria(); });
$('nv-buscar-btn').addEventListener('click', () => { const c = $('nv-buscar'); c.hidden = !c.hidden; if (!c.hidden) c.querySelector('input').focus(); });
$('nv-buscar').querySelector('input').addEventListener('input', (e) => { state.term = e.target.value; state.bloque = 'TODOS'; pintarSeria(); });
$('nv-nueva').addEventListener('click', () => abrirEditor({ slugsUsados: state.lista.map((x) => x.slug), onGuardada: cargar }));

try { montarFenix($('nv-fenix'), { alLeer: (slug) => abrir(slug) }); }
catch (e) { console.error('[noticias-v2] fénix:', e); $('nv-fenix').hidden = true; }

onSession(() => {
  const staff = can('editarLiga');
  $('nv-nueva').hidden = !staff; $('nv-clasica').hidden = !staff;
  cargar().then(() => { const s = new URLSearchParams(location.search).get('n'); if (s) abrir(s, { empujar: false }); });
});

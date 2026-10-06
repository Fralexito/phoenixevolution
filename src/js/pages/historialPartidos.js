// Historial global de partidos: filtros (liga, estado, texto) y paginación. Los filtros viven en la URL (?liga=&estado=&q=&p=) para poder compartir o recargar.
import { escapeHTML } from '../core/dom.js';
import { escudoHTML } from '../core/escudos.js';
import { toast } from '../core/toast.js';
import { LIGAS } from '../../data/ligas.js';
import { EDICIONES } from '../../data/ligaResultados.js';
import { aplanarPartidos, filtrarPartidos, paginar, leerFiltros } from '../core/partidosGlobal.js';

const $ = (id) => document.getElementById(id);
const TAM = 15;
const NOMBRE = { oficial: 'Oficial', pendiente: 'Pendiente', aplazado: 'Aplazado', wo: 'WO', incidencia: 'En revisión' };
const todos = aplanarPartidos(LIGAS, EDICIONES);
const porClave = new Map(todos.map((m) => [m.clave, m]));
let f = leerFiltros(location.search, LIGAS.map((l) => l.id));

const lado = (n, club, der) => `<span class="min-w-0 flex items-center gap-2 ${der ? 'flex-row-reverse text-right' : ''}"><span class="shrink-0 grid place-items-center w-9 h-9 rounded-full bg-black/40 border border-galaxy-border/60">${escudoHTML(club, 26)}</span><span class="min-w-0"><b class="block font-display text-white truncate">${escapeHTML(n)}</b><small class="block text-[12px] uppercase text-gray-400 truncate">${escapeHTML(club)}</small></span></span>`;
const tarjeta = (m) => `<div data-clave="${escapeHTML(m.clave)}" role="button" tabindex="0" aria-label="Ver detalle: ${escapeHTML(m.l)} contra ${escapeHTML(m.v)}" class="glass-panel rounded-xl p-3 cursor-pointer hover:border-galaxy-400/60 transition-colors">
  <div class="flex items-center justify-between gap-2 text-[12px] font-display font-bold uppercase tracking-[0.15em] text-galaxy-400 mb-2"><span class="truncate">${escapeHTML(m.ligaTitulo)} · Fecha ${m.fecha}</span><span class="sello-partido ${m.sello}">${NOMBRE[m.sello]}</span></div>
  <div class="grid grid-cols-[minmax(0,1fr)_auto_minmax(0,1fr)] gap-2 items-center text-white">${lado(m.l, m.clubL)}<span class="text-center font-display font-bold text-lg bg-black/50 py-1 px-3 rounded border border-galaxy-border whitespace-nowrap">${m.jugado ? `${m.gl} - ${m.gv}` : 'VS'}</span>${lado(m.v, m.clubV, true)}</div></div>`;

function guardarUrl() {
  const u = new URLSearchParams(); if (f.liga) u.set('liga', f.liga); if (f.estado !== 'jugados') u.set('estado', f.estado); if (f.q) u.set('q', f.q); if (f.pagina > 1) u.set('p', String(f.pagina));
  try { history.replaceState(null, '', `${location.pathname}${u.size ? `?${u}` : ''}`); } catch { /* sin historial: no pasa nada */ }
}

function pintar() {
  try {
    const lista = filtrarPartidos(todos, f); const pg = paginar(lista, f.pagina, TAM); f.pagina = pg.pagina; guardarUrl();
    $('hp-resumen').textContent = pg.total ? `${pg.total} partido${pg.total === 1 ? '' : 's'} · página ${pg.pagina} de ${pg.paginas}` : '';
    $('hp-lista').innerHTML = pg.items.length ? pg.items.map(tarjeta).join('') : '<div class="text-center text-gray-500 text-sm py-10 glass-panel rounded-xl">No hay partidos con esos filtros. Prueba con otra búsqueda.</div>';
    const btn = (txt, p, dis, icono, izq) => `<button type="button" class="btn btn-ghost !py-1.5 text-xs" data-pag="${p}" ${dis ? 'disabled' : ''}>${izq ? `<i class="fa-solid ${icono}"></i> ${txt}` : `${txt} <i class="fa-solid ${icono}"></i>`}</button>`;
    $('hp-paginas').innerHTML = pg.paginas > 1 ? `${btn('Más recientes', pg.pagina - 1, pg.pagina <= 1, 'fa-arrow-left', true)}<span class="text-xs text-gray-400 tabular-nums">Página ${pg.pagina} de ${pg.paginas}</span>${btn('Más antiguos', pg.pagina + 1, pg.pagina >= pg.paginas, 'fa-arrow-right', false)}` : '';
  } catch (e) { console.error('[historial] pintar:', e); $('hp-lista').innerHTML = '<div class="text-center text-rose-300 text-sm py-10 glass-panel rounded-xl" role="alert">No se pudo mostrar el historial.</div>'; }
}

async function abrir(el) {
  const m = porClave.get(el.dataset.clave); if (!m) return;
  const ed = (EDICIONES[m.liga] ?? []).find((x) => x.id === m.edicion); const partido = ed?.fechas.find((x) => x.n === m.fecha)?.partidos.find((x) => x.l === m.l && x.v === m.v); if (!partido) return;
  try { const { abrirDetalle } = await import('../features/detallePartido.js'); abrirDetalle({ liga: m.liga, ligaTitulo: m.ligaTitulo, edicion: m.edicion, edicionNombre: m.edicionNombre, fecha: m.fecha, partido, clubes: ed.clubes ?? {} }); }
  catch (e) { console.error('[historial] detalle:', e); toast('No se pudo abrir el detalle.', 'error'); }
}

$('hp-q').value = f.q; $('hp-liga').value = f.liga; $('hp-estado').value = f.estado;
let t = 0;
$('hp-q').addEventListener('input', () => { clearTimeout(t); t = setTimeout(() => { f = { ...f, q: $('hp-q').value.slice(0, 40), pagina: 1 }; pintar(); }, 200); });
$('hp-liga').addEventListener('change', () => { f = { ...f, liga: $('hp-liga').value, pagina: 1 }; pintar(); });
$('hp-estado').addEventListener('change', () => { f = { ...f, estado: $('hp-estado').value, pagina: 1 }; pintar(); });
$('hp-filtros').addEventListener('submit', (e) => e.preventDefault());
$('hp-paginas').addEventListener('click', (e) => { const b = e.target.closest('[data-pag]'); if (!b || b.disabled) return; f = { ...f, pagina: Number(b.dataset.pag) }; pintar(); scrollTo({ top: 0 }); });
$('hp-lista').addEventListener('click', (e) => { const el = e.target.closest('[data-clave]'); if (el) abrir(el); });
$('hp-lista').addEventListener('keydown', (e) => { if (e.key !== 'Enter' && e.key !== ' ') return; const el = e.target.closest('[data-clave]'); if (el && el === e.target) { e.preventDefault(); abrir(el); } });
pintar();

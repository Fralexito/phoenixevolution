// Perfil público de un jugador: ?id=<id de la ficha>. Carta + datos + campaña en cada edición de liga donde participa + títulos.
import { supabase } from '../core/supabase.js';
import { escapeHTML } from '../core/dom.js';
import { playerCardHTML } from '../features/playerCard.js';
import { LIGAS } from '../../data/ligas.js';
import { EDICIONES } from '../../data/ligaResultados.js';
import { nombreEnEdicion, campana, contraRivales, REDES, limpiarRedes, enlaceRed, partirLogros, mesAnio } from '../core/perfil.js';
import { forma } from '../core/ligaStats.js';
import { posInfo } from '../../data/posiciones.js';

const $ = (id) => document.getElementById(id);
const COLOR = { G: 'bg-emerald-500/20 text-emerald-300 border-emerald-400/40', E: 'bg-amber-500/20 text-amber-300 border-amber-400/40', P: 'bg-rose-500/20 text-rose-300 border-rose-400/40' };
const caja = (html) => { $('perfil-contenido').innerHTML = html; };
const aviso = (t, sub = '') => caja(`<div class="text-center py-16"><p class="text-gray-200 font-display font-bold uppercase tracking-wider">${escapeHTML(t)}</p>${sub ? `<p class="text-gray-400 text-sm mt-2">${escapeHTML(sub)}</p>` : ''}</div>`);
const kpi = (v, l) => `<div class="rounded-xl border border-galaxy-border/60 bg-black/25 px-3 py-3 text-center"><div class="font-display font-bold text-2xl text-white">${escapeHTML(v)}</div><div class="text-[10px] uppercase tracking-widest text-gray-400 mt-0.5">${escapeHTML(l)}</div></div>`;
const chip = (r) => `<span class="inline-grid place-items-center w-6 h-6 rounded border text-[10px] font-bold ${COLOR[r]}">${r}</span>`;

function seccionEdicion(liga, ed, nombre) {
  const c = campana(ed, nombre); if (!c) return '';
  const f = c.fila; const rivales = contraRivales(c.jugados);
  const ult = forma(ed.fechas, nombre, 5);
  return `<section class="rounded-2xl border border-galaxy-border/60 bg-black/20 p-5 space-y-4">
    <div class="flex flex-wrap items-center justify-between gap-2">
      <div><span class="text-[10px] font-display font-bold text-galaxy-400 uppercase tracking-widest">${escapeHTML(liga.titulo.join(' '))}</span>
        <h2 class="font-display font-bold text-xl text-white uppercase">${escapeHTML(ed.nombre)}${c.club ? ` <span class="text-sm text-gray-400 normal-case font-normal">· ${escapeHTML(c.club)}</span>` : ''}</h2></div>
      <div class="flex gap-1">${ult.map(chip).join('')}</div>
    </div>
    ${f ? `<div class="grid grid-cols-3 sm:grid-cols-6 gap-2">${kpi(`${c.puesto}º`, `de ${c.total}`)}${kpi(f.pts, 'Puntos')}${kpi(f.pj, 'Jugados')}${kpi(`${f.g}-${f.e}-${f.p}`, 'G-E-P')}${kpi(`${f.gf}:${f.gc}`, 'Goles')}${kpi(f.dg > 0 ? `+${f.dg}` : f.dg, 'Dif.')}</div>` : '<p class="text-sm text-gray-400">Aún no tiene partidos jugados en esta edición.</p>'}
    <div class="grid md:grid-cols-2 gap-4">
      <div><h3 class="text-xs font-display font-bold uppercase tracking-widest text-gray-300 mb-2">Resultados</h3>
        ${c.jugados.length ? `<ul class="space-y-1.5">${[...c.jugados].reverse().map((p) => `<li class="flex items-center gap-3 text-sm rounded-lg bg-black/25 border border-galaxy-border/40 px-3 py-2">${chip(p.res)}<span class="text-gray-400 text-xs w-14 shrink-0">Fecha ${p.n}</span><span class="flex-1 min-w-0 truncate text-gray-100">${p.local ? 'vs' : '@'} ${escapeHTML(p.rival)}</span><b class="text-white tabular-nums">${p.gf} : ${p.gc}</b></li>`).join('')}</ul>` : '<p class="text-sm text-gray-500">Sin resultados todavía.</p>'}</div>
      <div><h3 class="text-xs font-display font-bold uppercase tracking-widest text-gray-300 mb-2">Próximos partidos</h3>
        ${c.proximos.length ? `<ul class="space-y-1.5">${c.proximos.slice(0, 5).map((p) => `<li class="flex items-center gap-3 text-sm rounded-lg bg-black/25 border border-galaxy-border/40 px-3 py-2"><span class="text-gray-400 text-xs w-14 shrink-0">Fecha ${p.n}</span><span class="flex-1 min-w-0 truncate text-gray-100">${p.local ? 'vs' : '@'} ${escapeHTML(p.rival)}</span><span class="text-[10px] uppercase text-amber-300">Pendiente</span></li>`).join('')}</ul>` : '<p class="text-sm text-gray-500">No quedan partidos pendientes.</p>'}</div>
    </div>
    ${rivales.length ? `<div><h3 class="text-xs font-display font-bold uppercase tracking-widest text-gray-300 mb-2">Contra cada rival</h3><div class="flex flex-wrap gap-2">${rivales.map((r) => `<span class="text-xs rounded-lg border border-galaxy-border/50 bg-black/25 px-3 py-1.5 text-gray-200"><b class="text-white">${escapeHTML(r.rival)}</b> · ${r.g}G ${r.e}E ${r.p}P · ${r.gf}:${r.gc}</span>`).join('')}</div></div>` : ''}
  </section>`;
}

function datosPerfil(p) {
  const redes = limpiarRedes(p.redes); const logros = partirLogros(p.logros);
  const datos = [['fa-location-dot', 'Ciudad', p.ciudad], ['fa-calendar-check', 'Miembro desde', mesAnio(p.miembro_desde)], ['fa-chess-board', 'Estilo de juego', p.estilo_juego]].filter((d) => d[2]);
  const botones = REDES.filter((r) => redes[r.id]).map((r) => {
    const url = enlaceRed(r.id, redes[r.id]);
    const cuerpo = `<i class="${r.icono}"></i><span>${escapeHTML(r.nombre)}${url ? '' : `: ${escapeHTML(redes[r.id])}`}</span>`;
    return url ? `<a href="${escapeHTML(url)}" target="_blank" rel="noopener noreferrer" class="adv-chip !min-h-9 !px-3 inline-flex items-center gap-2">${cuerpo}</a>` : `<span class="adv-chip !min-h-9 !px-3 inline-flex items-center gap-2 cursor-default">${cuerpo}</span>`;
  });
  return `${p.biografia ? `<section class="rounded-2xl border border-galaxy-border/60 bg-black/20 p-5"><h2 class="text-xs font-display font-bold uppercase tracking-widest text-gray-300 mb-3"><i class="fa-solid fa-book-open text-galaxy-400 mr-1"></i> Biografía</h2><p class="text-gray-200 text-sm leading-relaxed whitespace-pre-line max-w-prose">${escapeHTML(p.biografia)}</p></section>` : ''}
  ${datos.length || logros.length || botones.length ? `<section class="rounded-2xl border border-galaxy-border/60 bg-black/20 p-5 space-y-4">
    ${datos.length ? `<dl class="grid sm:grid-cols-3 gap-3">${datos.map(([ic, l, v]) => `<div class="rounded-xl bg-black/25 border border-galaxy-border/40 px-3 py-2.5"><dt class="text-[10px] uppercase tracking-widest text-gray-400"><i class="fa-solid ${ic} text-galaxy-400 mr-1"></i>${l}</dt><dd class="text-sm text-white mt-0.5">${escapeHTML(v)}</dd></div>`).join('')}</dl>` : ''}
    ${logros.length ? `<div><h2 class="text-xs font-display font-bold uppercase tracking-widest text-gray-300 mb-2"><i class="fa-solid fa-medal text-amber-300 mr-1"></i> Logros</h2><ul class="space-y-1.5">${logros.map((l) => `<li class="text-sm text-gray-200 flex gap-2"><i class="fa-solid fa-star text-[9px] text-amber-300 mt-1.5"></i><span>${escapeHTML(l)}</span></li>`).join('')}</ul></div>` : ''}
    ${botones.length ? `<div class="flex flex-wrap gap-2">${botones.join('')}</div>` : ''}
  </section>` : ''}`;
}

function render(p) {
  const pos = posInfo(p.posicion);
  const campanas = LIGAS.flatMap((l) => (EDICIONES[l.id] ?? []).map((ed) => ({ l, ed, nombre: nombreEnEdicion(p, ed) })).filter((x) => x.nombre))
    .map((x) => seccionEdicion(x.l, x.ed, x.nombre)).filter(Boolean);
  document.title = `${p.nombre} · Perfil · Phoenix Evolution Series`;
  caja(`<div class="grid lg:grid-cols-[minmax(0,320px)_minmax(0,1fr)] gap-8 items-start">
    <div class="w-full max-w-[320px] mx-auto lg:mx-0 lg:sticky lg:top-20">${playerCardHTML(p, 0)}</div>
    <div class="space-y-5 min-w-0">
      <header><span class="text-xs font-display font-bold text-galaxy-400 uppercase tracking-widest bg-galaxy-600/20 px-2.5 py-1 rounded border border-galaxy-400/30 inline-block mb-2">PERFIL DE JUGADOR</span>
        <h1 class="text-3xl font-display font-bold text-white uppercase tracking-widest text-shadow-glow">${escapeHTML(p.nombre)}${p.apodo ? ` <span class="text-lg text-gray-400">«${escapeHTML(p.apodo)}»</span>` : ''}</h1>
        <p class="text-gray-400 text-sm mt-1">${escapeHTML(p.club || 'Sin club')} · <span style="color:${pos.color}">${escapeHTML(pos.nombre)}</span> · Media ${escapeHTML(p.ovr ?? '--')}</p>
        ${p.descripcion ? `<p class="text-gray-300 text-sm mt-3 leading-relaxed max-w-prose">${escapeHTML(p.descripcion)}</p>` : ''}</header>
      ${datosPerfil(p)}
      ${campanas.join('') || '<section class="rounded-2xl border border-galaxy-border/60 bg-black/20 p-5 text-sm text-gray-400">Este jugador todavía no figura en ninguna edición de liga.</section>'}
    </div></div>`);
}

async function init() {
  const id = new URLSearchParams(location.search).get('id');
  if (!id) { aviso('Jugador no especificado', 'Entra desde la sección Jugadores.'); return; }
  try {
    const { data, error } = await supabase.from('jugadores').select('*').eq('id', id).maybeSingle();
    if (error && error.code !== 'PGRST116') throw error;
    if (!data) { aviso('No encontramos a ese jugador', 'Puede que su ficha se haya borrado.'); return; }
    render(data);
  } catch (e) { console.error('[perfil] cargar:', e); aviso('No se pudo cargar el perfil', 'Revisa tu conexión e intenta de nuevo.'); }
}
init();

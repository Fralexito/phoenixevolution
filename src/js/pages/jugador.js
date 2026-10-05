// Perfil público de un jugador: ?id=<id de la ficha>. Carta + datos + campaña en cada edición de liga donde participa + títulos.
import { supabase } from '../core/supabase.js';
import { escapeHTML } from '../core/dom.js';
import { playerCardHTML } from '../features/playerCard.js';
import { LIGAS } from '../../data/ligas.js';
import { EDICIONES } from '../../data/ligaResultados.js';
import { nombreEnEdicion, campana, contraRivales, REDES, limpiarRedes, enlaceRed, partirLogros, mesAnio } from '../core/perfil.js';
import { forma } from '../core/ligaStats.js';
import { onSession, isAdmin } from '../core/session.js';
import { openPlayerForm } from '../features/playerForm.js';
import { abrirEditorPerfil } from '../features/perfilEditor.js';
import { abrirEditorHistorial } from '../features/historialEditor.js';
import { ordenarHistorial, periodoCorto, medalla, resumenHistorial, partirPremios } from '../core/historial.js';
import { ejesEstilo, arquetipos, fortalezasDebilidades, estiloTexto, mapaCalor, EJES } from '../core/estilo.js';
import { radarPoints, axisPoint } from '../core/compare.js';
import { STAT_INFO } from '../../data/stats.js';
import { STAT_KEYS } from '../features/playerCard.js';
import { puntosAcumulados, rendimiento } from '../core/perfil.js';
import { posInfo } from '../../data/posiciones.js';
import { cargarMuro } from '../features/muro/api.js';
import { muroCompactoHTML, reproductorYT } from '../features/muro/render.js';
import { href } from '../core/config.js';

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
        <h2 class="font-display font-bold text-xl text-white uppercase">${escapeHTML(ed.nombre)}${c.club ? ` <span class="text-sm text-gray-400 uppercase font-normal">· ${escapeHTML(c.club)}</span>` : ''}</h2></div>
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

// ---- Análisis de juego (se muestra al pulsar el botón) ----
const NOTA_APROX = '<p class="text-[11px] text-gray-500 mt-3"><i class="fa-solid fa-circle-info mr-1"></i>Aproximado: se calcula con la posición y las stats de la ficha. No es un seguimiento real de partidos.</p>';
function canchaSVG({ zonas }) {
  const blobs = zonas.map((z) => `<ellipse cx="${(z.x * 1.05).toFixed(1)}" cy="${(z.y * 0.68).toFixed(1)}" rx="${(z.rx * 1.3).toFixed(1)}" ry="${(z.ry * 0.85).toFixed(1)}" fill="url(#calor)" opacity="${Math.min(1, 0.45 + z.peso * 0.55).toFixed(2)}"/>`).join('');
  const l = 'fill="none" stroke="rgba(255,255,255,.35)" stroke-width=".4"';
  return `<svg viewBox="0 0 105 68" class="w-full rounded-xl border border-galaxy-border/60" role="img" aria-label="Mapa de calor aproximado">
    <defs><radialGradient id="calor"><stop offset="0" stop-color="#ff3b30" stop-opacity=".95"/><stop offset=".45" stop-color="#ffb300" stop-opacity=".55"/><stop offset="1" stop-color="#00e5ff" stop-opacity="0"/></radialGradient>
    <filter id="difuso" x="-20%" y="-20%" width="140%" height="140%"><feGaussianBlur stdDeviation="1.6"/></filter></defs>
    <rect width="105" height="68" fill="#0b3d2a"/>${[0, 1, 2, 3, 4, 5, 6].map((i) => `<rect x="${i * 15}" width="15" height="68" fill="${i % 2 ? 'rgba(255,255,255,.035)' : 'transparent'}"/>`).join('')}
    <g ${l}><rect x="1" y="1" width="103" height="66"/><line x1="52.5" y1="1" x2="52.5" y2="67"/><circle cx="52.5" cy="34" r="9"/>
      <rect x="1" y="14" width="16" height="40"/><rect x="1" y="24" width="6" height="20"/><rect x="88" y="14" width="16" height="40"/><rect x="98" y="24" width="6" height="20"/></g>
    <g filter="url(#difuso)" style="mix-blend-mode:screen">${blobs}</g>
    <text x="4" y="65" font-size="3" fill="rgba(255,255,255,.55)">Arco propio</text><text x="101" y="65" font-size="3" text-anchor="end" fill="rgba(255,255,255,.55)">Ataque →</text></svg>`;
}
function radarSVG(ejes) {
  const cx = 110; const cy = 105; const r = 70; const o = Object.fromEntries(ejes.map((e) => [e.id, e.valor])); const ids = EJES.map((e) => e.id);
  const anillos = [0.25, 0.5, 0.75, 1].map((t) => `<polygon points="${ids.map((_, i) => axisPoint(i, ids.length, cx, cy, r * t).map((n) => n.toFixed(1)).join(',')).join(' ')}" fill="none" stroke="rgba(255,255,255,.12)"/>`).join('');
  const etiquetas = ejes.map((e, i) => { const [x, y] = axisPoint(i, ids.length, cx, cy, r + 18); return `<text x="${x.toFixed(1)}" y="${y.toFixed(1)}" font-size="9" text-anchor="middle" dominant-baseline="middle" fill="#cbd5e1">${escapeHTML(e.nombre)} <tspan fill="#00e5ff" font-weight="700">${e.valor}</tspan></text>`; }).join('');
  return `<svg viewBox="0 0 220 210" class="w-full max-w-[340px] mx-auto" role="img" aria-label="Radar de estilo">${anillos}<polygon points="${radarPoints(o, ids, { cx, cy, r })}" fill="rgba(128,0,255,.35)" stroke="#00e5ff" stroke-width="1.6"/>${etiquetas}</svg>`;
}
function curvaSVG(pts) {
  if (pts.length < 2) return '<p class="text-sm text-gray-500">Se necesitan al menos 2 partidos jugados para dibujar la tendencia.</p>';
  const W = 320; const H = 110; const max = Math.max(3, pts[pts.length - 1].pts); const x = (i) => 12 + (i * (W - 24)) / (pts.length - 1); const y = (v) => H - 14 - (v / max) * (H - 28);
  const linea = pts.map((p, i) => `${x(i).toFixed(1)},${y(p.pts).toFixed(1)}`).join(' ');
  return `<svg viewBox="0 0 ${W} ${H}" class="w-full" role="img" aria-label="Puntos acumulados por fecha"><polyline points="${linea}" fill="none" stroke="#00e5ff" stroke-width="2"/>${pts.map((p, i) => `<circle cx="${x(i).toFixed(1)}" cy="${y(p.pts).toFixed(1)}" r="2.6" fill="#a855f7"/>`).join('')}
    <text x="12" y="${H - 2}" font-size="8" fill="#9ca3af">Fecha ${pts[0].n}</text><text x="${W - 12}" y="${H - 2}" font-size="8" text-anchor="end" fill="#9ca3af">Fecha ${pts[pts.length - 1].n}</text>
    <text x="${W - 12}" y="10" font-size="9" text-anchor="end" fill="#e5e7eb">${pts[pts.length - 1].pts} pts</text></svg>`;
}
function tabCalor(p) {
  const m = mapaCalor(p); const t = m.tercios;
  const barra = (n, v, c) => `<div><div class="flex justify-between text-xs text-gray-300"><span>${n}</span><b class="text-white">${v}%</b></div><div class="h-2 rounded bg-black/40 overflow-hidden"><div class="h-full rounded" style="width:${v}%;background:${c}"></div></div></div>`;
  return `<div class="grid md:grid-cols-[minmax(0,1.6fr)_minmax(0,1fr)] gap-5 items-start">${canchaSVG(m)}
    <div class="space-y-3"><h3 class="text-xs font-display font-bold uppercase tracking-widest text-gray-300">Dónde actúa más</h3>${barra('Zona defensiva', t.defensa, '#3b82f6')}${barra('Zona media', t.medio, '#22c55e')}${barra('Zona de ataque', t.ataque, '#ef4444')}${NOTA_APROX}</div></div>`;
}
function tabEstilo(p) {
  const ej = ejesEstilo(p); const fd = fortalezasDebilidades(p, STAT_KEYS);
  const fila = (x, c) => `<li class="flex justify-between text-sm"><span class="text-gray-200">${escapeHTML(STAT_INFO[x.k]?.nombre ?? x.k)}</span><b style="color:${c}">${x.v}</b></li>`;
  return `<div class="grid md:grid-cols-2 gap-5 items-start">${radarSVG(ej)}
    <div class="space-y-4"><div><h3 class="text-xs font-display font-bold uppercase tracking-widest text-gray-300 mb-2">Perfil</h3><div class="flex flex-wrap gap-2">${arquetipos(p).map((a) => `<span class="text-xs rounded-lg border border-galaxy-400/40 bg-galaxy-600/20 text-galaxy-400 px-3 py-1.5 font-bold">${escapeHTML(a)}</span>`).join('')}</div><p class="text-sm text-gray-300 mt-2">${escapeHTML(estiloTexto(p))}</p></div>
      <div class="grid grid-cols-2 gap-4"><div><h3 class="text-xs font-display font-bold uppercase tracking-widest text-emerald-300 mb-2">Fortalezas</h3><ul class="space-y-1">${fd.fuertes.map((x) => fila(x, '#34d399')).join('')}</ul></div>
        <div><h3 class="text-xs font-display font-bold uppercase tracking-widest text-rose-300 mb-2">A mejorar</h3><ul class="space-y-1">${fd.flojas.map((x) => fila(x, '#fb7185')).join('')}</ul></div></div>${NOTA_APROX}</div></div>`;
}
function tabLiga(p) {
  const x = LIGAS.flatMap((l) => (EJES_ED(l.id)).map((ed) => ({ l, ed, nombre: nombreEnEdicion(p, ed) })).filter((q) => q.nombre)).at(-1);
  if (!x) return '<p class="text-sm text-gray-400">Todavía no hay partidos de liga para analizar.</p>';
  const c = campana(x.ed, x.nombre); const r = rendimiento(c?.fila); const pts = puntosAcumulados(x.ed, x.nombre);
  const k = (v, l) => `<div class="rounded-xl border border-galaxy-border/60 bg-black/25 px-3 py-3 text-center"><div class="font-display font-bold text-xl text-white">${escapeHTML(v)}</div><div class="text-[10px] uppercase tracking-widest text-gray-400 mt-0.5">${escapeHTML(l)}</div></div>`;
  return `<p class="text-xs text-gray-400 mb-3">${escapeHTML(x.l.titulo.join(' '))} · ${escapeHTML(x.ed.nombre)} · datos reales de los resultados</p>
    ${r ? `<div class="grid grid-cols-2 sm:grid-cols-4 gap-2 mb-4">${k(r.gfPorPartido, 'Goles a favor / partido')}${k(r.gcPorPartido, 'Goles en contra / partido')}${k(`${r.victorias}%`, 'Victorias')}${k(`${r.puntos}%`, 'Puntos posibles')}</div>` : ''}
    <h3 class="text-xs font-display font-bold uppercase tracking-widest text-gray-300 mb-2">Puntos acumulados por fecha</h3>${curvaSVG(pts)}`;
}
const EJES_ED = (id) => EDICIONES[id] ?? [];
/** Pestaña «Muro»: solo si la ficha está vinculada a una cuenta (perfil_id). Carga aparte (red) y se pinta en el contenedor. */
function tabMuro(p) { return `<div id="jug-muro" data-perfil="${escapeHTML(p.perfil_id)}"><p class="text-sm text-gray-400">Cargando el muro…</p></div>`; }
async function cargarMuroTab(p) {
  const cont = $('jug-muro'); if (!cont) return;
  try {
    const [m, u] = await Promise.all([cargarMuro(p.perfil_id, null, 5), supabase.from('perfiles').select('username').eq('id', p.perfil_id).maybeSingle()]);
    const urlMuro = u.data?.username ? `${href('perfil/')}?u=${encodeURIComponent(u.data.username)}` : '';
    cont.innerHTML = m.visible ? muroCompactoHTML(m.items ?? [], { urlMuro, nombre: p.apodo || p.nombre }) : '<p class="text-sm text-gray-400"><i class="fa-solid fa-lock mr-1"></i>Este jugador comparte su muro solo con sus amigos.</p>';
  } catch (e) { console.error('[perfil] muro:', e); cont.innerHTML = '<p class="text-sm text-bad">No se pudo cargar el muro. Intenta de nuevo en un momento.</p>'; }
}
const TABS_BASE = [['calor', 'fa-fire', 'Mapa de calor', tabCalor], ['estilo', 'fa-chart-pie', 'Estilo de juego', tabEstilo], ['liga', 'fa-chart-line', 'Rendimiento', tabLiga]];
const tabsDe = (p) => (p.perfil_id ? [...TABS_BASE, ['muro', 'fa-newspaper', 'Muro', tabMuro]] : TABS_BASE);
function montarAnalisis(p) {
  const btn = $('perfil-analisis-btn'); const panel = $('perfil-analisis'); if (!btn || !panel) return;
  const pintar = (id) => {
    const TABS = tabsDe(p); const t = TABS.find((x) => x[0] === id) ?? TABS[0];
    panel.innerHTML = `<div class="flex flex-wrap gap-2 mb-4" role="tablist">${TABS.map(([i, ic, n]) => `<button type="button" role="tab" data-tab="${i}" aria-pressed="${i === t[0]}" class="adv-chip !min-h-9 !px-3"><i class="fa-solid ${ic} mr-1.5"></i>${n}</button>`).join('')}</div><div>${t[3](p)}</div>`;
    if (t[0] === 'muro') cargarMuroTab(p);
  };
  panel.addEventListener('click', (e) => { const yt = e.target.closest('[data-act=video-yt]'); if (yt) { reproductorYT(yt); return; } const b = e.target.closest('[data-tab]'); if (b) pintar(b.dataset.tab); });
  btn.addEventListener('click', () => {
    const abrir = panel.hidden; panel.hidden = !abrir; btn.setAttribute('aria-expanded', String(abrir));
    btn.querySelector('span').textContent = abrir ? 'Ocultar análisis de juego' : (p.perfil_id ? 'Ver análisis y muro' : 'Ver análisis de juego');
    if (abrir && !panel.innerHTML.trim()) pintar('calor');
  });
}

// ---- Historial de participación y títulos (filas de la tabla `participaciones` + la edición en curso) ----
const MEDALLA = { oro: ['#fbbf24', 'Oro'], plata: ['#cbd5e1', 'Plata'], bronce: ['#d97706', 'Bronce'] };
function seccionHistorial(filas, enCurso) {
  const l = ordenarHistorial(filas); const r = resumenHistorial(l);
  const tarjetaFila = (f) => { const md = MEDALLA[medalla(f)]; const prem = partirPremios(f.premios);
    return `<li class="flex gap-3 rounded-xl border border-galaxy-border/50 bg-black/25 p-3.5">
      <span class="w-10 h-10 shrink-0 rounded-full grid place-items-center border" style="${md ? `color:${md[0]};border-color:${md[0]}88;background:${md[0]}1f` : 'color:#9ca3af;border-color:#374151;background:#11111a'}" title="${md ? md[1] : 'Participación'}"><i class="fa-solid ${md ? 'fa-trophy' : 'fa-futbol'}"></i></span>
      <div class="min-w-0 flex-1"><div class="flex flex-wrap items-baseline gap-x-2"><b class="text-white font-display uppercase tracking-wide">${escapeHTML(f.liga)}</b><span class="text-sm text-gray-300">${escapeHTML(f.edicion)}</span>${f.periodo ? `<span class="text-xs text-gray-500">${escapeHTML(periodoCorto(f.periodo))}</span>` : ''}</div>
        <div class="flex flex-wrap gap-1.5 mt-1.5 text-xs">${f.club ? `<span class="rounded-md border border-galaxy-border/50 px-2 py-0.5 text-gray-200"><i class="fa-solid fa-shield-halved text-galaxy-400 mr-1"></i><span class="uppercase">${escapeHTML(f.club)}</span></span>` : ''}${f.puesto ? `<span class="rounded-md border border-galaxy-border/50 px-2 py-0.5 text-gray-200">${escapeHTML(f.puesto)}º puesto</span>` : ''}${f.titulo ? `<span class="rounded-md border px-2 py-0.5 font-bold" style="${md ? `color:${md[0]};border-color:${md[0]}88;background:${md[0]}1a` : 'color:#e5e7eb;border-color:#4b5563'}">${escapeHTML(f.titulo)}</span>` : ''}${prem.map((x) => `<span class="rounded-md border border-emerald-400/40 bg-emerald-500/10 px-2 py-0.5 text-emerald-200"><i class="fa-solid fa-award mr-1"></i>${escapeHTML(x)}</span>`).join('')}</div></div></li>`; };
  const actual = enCurso ? `<li class="flex gap-3 rounded-xl border border-galaxy-400/50 bg-galaxy-600/10 p-3.5"><span class="w-10 h-10 shrink-0 rounded-full grid place-items-center border border-galaxy-400/60 text-galaxy-400"><i class="fa-solid fa-circle-play"></i></span><div class="min-w-0"><div class="flex flex-wrap items-baseline gap-x-2"><b class="text-white font-display uppercase tracking-wide">${escapeHTML(enCurso.liga)}</b><span class="text-sm text-gray-300">${escapeHTML(enCurso.edicion)}</span><span class="text-[10px] font-bold uppercase tracking-widest text-galaxy-400">En curso</span></div><p class="text-xs text-gray-400 mt-1">${enCurso.puesto ? `Va ${escapeHTML(enCurso.puesto)}º en la tabla` : 'Participando'}</p></div></li>` : '';
  const kpis = [[r.ediciones + (enCurso ? 1 : 0), 'Ediciones'], [r.titulos, 'Títulos'], [r.podios, 'Podios'], [r.premios, 'Premios']].map(([v, n]) => `<div class="rounded-xl border border-galaxy-border/60 bg-black/25 px-3 py-3 text-center"><div class="font-display font-bold text-2xl text-white">${v}</div><div class="text-[10px] uppercase tracking-widest text-gray-400 mt-0.5">${n}</div></div>`).join('');
  return `<section class="rounded-2xl border border-amber-400/30 bg-black/20 p-5 space-y-4"><h2 class="text-xs font-display font-bold uppercase tracking-widest text-gray-300"><i class="fa-solid fa-trophy text-amber-300 mr-1"></i> Historial y títulos</h2>
    <div class="grid grid-cols-4 gap-2">${kpis}</div>
    ${l.length || enCurso ? `<ul class="space-y-2">${actual}${l.map(tarjetaFila).join('')}</ul>` : '<p class="text-sm text-gray-400">Todavía no hay participaciones registradas.</p>'}</section>`;
}

let actual = null;
let historial = [];
function render(p, filasHistorial = []) {
  actual = p; historial = filasHistorial;
  const pos = posInfo(p.posicion);
  const campanas = LIGAS.flatMap((l) => (EDICIONES[l.id] ?? []).map((ed) => ({ l, ed, nombre: nombreEnEdicion(p, ed) })).filter((x) => x.nombre))
    .map((x) => seccionEdicion(x.l, x.ed, x.nombre)).filter(Boolean);
  const primera = LIGAS.flatMap((l) => (EDICIONES[l.id] ?? []).map((ed) => ({ l, ed, nombre: nombreEnEdicion(p, ed) })).filter((x) => x.nombre && x.ed.estado === 'en_curso'))[0];
  const cc = primera ? campana(primera.ed, primera.nombre) : null;
  const enCurso = primera ? { liga: primera.l.titulo.join(' '), edicion: primera.ed.nombre, puesto: cc?.fila ? cc.puesto : 0 } : null;
  document.title = `${p.nombre} · Perfil · Phoenix Evolution Series`;
  caja(`<div class="grid lg:grid-cols-[minmax(0,320px)_minmax(0,1fr)] gap-8 items-start">
    <div class="w-full max-w-[320px] mx-auto lg:mx-0 lg:sticky lg:top-20">${playerCardHTML(p, 0, { largo: true })}</div>
    <div class="space-y-5 min-w-0">
      <header><span class="text-xs font-display font-bold text-galaxy-400 uppercase tracking-widest bg-galaxy-600/20 px-2.5 py-1 rounded border border-galaxy-400/30 inline-block mb-2">PERFIL DE JUGADOR</span>
        <h1 class="text-4xl sm:text-5xl font-display font-bold text-white uppercase tracking-widest text-shadow-glow leading-tight">${escapeHTML(p.nombre)}</h1>
        ${p.apodo ? `<p class="mt-2"><span class="inline-block px-4 py-1.5 rounded-full text-lg sm:text-xl font-display font-bold text-white border border-galaxy-400/70 shadow-[0_0_18px_rgba(0,229,255,.35)] bg-gradient-to-r from-galaxy-600/70 to-galaxy-400/40">«${escapeHTML(p.apodo)}»</span></p>` : ''}
        <ul class="flex flex-wrap gap-2 mt-4">
          <li class="px-3.5 py-2 rounded-xl border border-galaxy-400/50 bg-galaxy-600/15 text-white font-display font-bold text-sm uppercase tracking-wider inline-flex items-center gap-2"><i class="fa-solid fa-shield-halved text-galaxy-400"></i>${escapeHTML(p.club || 'Sin club')}</li>
          <li class="px-3.5 py-2 rounded-xl border font-display font-bold text-sm uppercase tracking-wider inline-flex items-center gap-2" style="color:${pos.color};border-color:${pos.color}88;background:${pos.color}22"><i class="fa-solid fa-location-crosshairs"></i>${escapeHTML(p.posicion ?? '')} · ${escapeHTML(pos.nombre)}</li>
          ${(p.altura_cm ? [`<li class="px-3.5 py-2 rounded-xl border border-amber-400/50 bg-amber-500/10 text-amber-100 font-display font-bold text-sm inline-flex items-center gap-2"><i class="fa-solid fa-ruler-vertical text-amber-300"></i>${escapeHTML(p.altura_cm)} cm</li>`] : []).join('')}
          ${(p.pie ? [`<li class="px-3.5 py-2 rounded-xl border border-pink-400/50 bg-pink-500/10 text-pink-100 font-display font-bold text-sm inline-flex items-center gap-2"><i class="fa-solid fa-shoe-prints text-pink-300"></i>Pie ${p.pie === 'Izquierdo' ? 'izquierdo' : 'derecho'}</li>`] : []).join('')}
          <li class="px-3.5 py-2 rounded-xl border border-emerald-400/50 bg-emerald-500/10 text-emerald-100 font-display font-bold text-sm inline-flex items-center gap-2"><i class="fa-solid fa-star text-emerald-300"></i>Media ${escapeHTML(p.ovr ?? '--')}</li>
        </ul>
        ${p.descripcion ? `<p class="text-gray-300 text-sm mt-3 leading-relaxed max-w-prose">${escapeHTML(p.descripcion)}</p>` : ''}</header>
      <div><button type="button" id="perfil-analisis-btn" aria-expanded="false" aria-controls="perfil-analisis" class="btn btn-primary"><i class="fa-solid fa-chart-pie"></i> <span>${p.perfil_id ? 'Ver análisis y muro' : 'Ver análisis de juego'}</span></button>
        <button type="button" id="perfil-editar" hidden class="btn btn-ghost ml-2"><i class="fa-solid fa-pen"></i> Editar ficha</button>
        <button type="button" id="perfil-editar-bio" hidden class="btn btn-ghost ml-2"><i class="fa-solid fa-book-open"></i> Editar biografía</button>
        <button type="button" id="perfil-editar-hist" hidden class="btn btn-ghost ml-2"><i class="fa-solid fa-trophy"></i> Editar historial</button></div>
      <section id="perfil-analisis" hidden class="rounded-2xl border border-galaxy-400/30 bg-black/20 p-5"></section>
      ${datosPerfil(p)}
      ${seccionHistorial(filasHistorial, enCurso)}
      ${campanas.join('') || '<section class="rounded-2xl border border-galaxy-border/60 bg-black/20 p-5 text-sm text-gray-400">Este jugador todavía no figura en ninguna edición de liga.</section>'}
    </div></div>`);
  montarAnalisis(p); mostrarEditar();
}
function mostrarEditar() {
  const b = $('perfil-editar'); if (!b) return;
  b.hidden = !isAdmin(); b.onclick = () => openPlayerForm(actual, init);
  const hist = $('perfil-editar-hist'); if (hist) { hist.hidden = !isAdmin(); hist.onclick = () => abrirEditorHistorial(actual, historial, init); }
  const bio = $('perfil-editar-bio'); if (bio) { bio.hidden = !isAdmin(); bio.onclick = () => abrirEditorPerfil(actual, init); }
}

async function init() {
  const id = new URLSearchParams(location.search).get('id');
  if (!id) { aviso('Jugador no especificado', 'Entra desde la sección Jugadores.'); return; }
  try {
    const { data, error } = await supabase.from('jugadores').select('*').eq('id', id).maybeSingle();
    if (error && error.code !== 'PGRST116') throw error;
    if (!data) { aviso('No encontramos a ese jugador', 'Puede que su ficha se haya borrado.'); return; }
    let filas = [];
    try { const h = await supabase.from('participaciones').select('*').eq('jugador_id', id); if (h.error) throw h.error; filas = h.data ?? []; } catch (e2) { console.error('[perfil] historial:', e2); }
    render(data, filas);
  } catch (e) { console.error('[perfil] cargar:', e); aviso('No se pudo cargar el perfil', 'Revisa tu conexión e intenta de nuevo.'); }
}
init();
onSession(mostrarEditar);

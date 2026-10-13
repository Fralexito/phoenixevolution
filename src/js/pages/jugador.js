// Perfil público de un jugador: ?id=<id de la ficha>. Carta + datos + campaña en cada edición de liga donde participa + títulos.
import { supabase } from '../core/supabase.js';
import { escapeHTML } from '../core/dom.js';
import { escudoHTML } from '../core/escudos.js';
import { playerCardHTML } from '../features/playerCard.js';
import { LIGAS } from '../../data/ligas.js';
import { SISTEMAS_LIGA } from '../../data/temporada.js';
import { FX } from '../../data/experimento.js';
import { EDICIONES } from '../../data/ligaResultados.js';
import { nombreEnEdicion, campana, contraRivales, REDES, limpiarRedes, enlaceRed, partirLogros, mesAnio } from '../core/perfil.js';
import { forma } from '../core/ligaStats.js';
import { onSession, can } from '../core/session.js';
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
import { hayMovimientoReducido } from '../features/ajustes.js';

const $ = (id) => document.getElementById(id);
const COLOR = { G: 'bg-emerald-500/20 text-emerald-300 border-emerald-400/40', E: 'bg-amber-500/20 text-amber-300 border-amber-400/40', P: 'bg-rose-500/20 text-rose-300 border-rose-400/40' };
const caja = (html) => { $('perfil-contenido').innerHTML = html; };
const aviso = (t, sub = '') => caja(`<div class="text-center py-16"><p class="text-gray-200 font-display font-bold uppercase tracking-wider">${escapeHTML(t)}</p>${sub ? `<p class="text-gray-400 text-sm mt-2">${escapeHTML(sub)}</p>` : ''}</div>`);
const kpi = (v, l) => `<div class="rounded-xl border border-galaxy-border/60 bg-black/25 px-3 py-3 text-center"><div class="font-display font-bold text-2xl text-white">${escapeHTML(v)}</div><div class="text-[12px] uppercase tracking-widest text-gray-400 mt-0.5">${escapeHTML(l)}</div></div>`;
const chip = (r) => `<span class="inline-grid place-items-center w-6 h-6 rounded border text-[12px] font-bold ${COLOR[r]}">${r}</span>`;

const tit = (ic, t, extra = '') => `<h3 class="flex items-center gap-2 text-xs font-display font-bold uppercase tracking-widest text-gray-200 mb-3"><i class="fa-solid ${ic} text-galaxy-400"></i>${t}${extra}</h3>`;
const TONO = { G: 'text-emerald-300', E: 'text-amber-300', P: 'text-rose-300' };
const BORDE = { G: 'border-l-emerald-400', E: 'border-l-amber-400', P: 'border-l-rose-400' };
const TXT_RES = { G: 'Victoria', E: 'Empate', P: 'Derrota' };
const pct = (n, t) => (t > 0 ? Math.round((n / t) * 100) : 0);
const kpiV = (ic, v, l, tono) => `<div class="rounded-xl border border-galaxy-border/60 bg-gradient-to-b from-white/[.06] to-black/30 px-3 py-3 text-center"><i class="fa-solid ${ic} ${tono} text-sm"></i><div class="font-display font-bold text-2xl text-white leading-tight mt-1">${escapeHTML(v)}</div><div class="text-[12px] uppercase tracking-widest text-gray-400 mt-0.5">${escapeHTML(l)}</div></div>`;
const rival = (ed, n) => `<span class="inline-flex items-center gap-2 min-w-0">${escudoHTML(ed.clubes?.[n], 22)}<span class="min-w-0"><span class="block truncate text-gray-100 font-semibold leading-tight">${escapeHTML(n)}</span>${ed.clubes?.[n] ? `<span class="block truncate text-[12px] uppercase text-gray-500 leading-tight">${escapeHTML(ed.clubes[n])}</span>` : ''}</span></span>`;
function zonaBadge(liga, puesto, total) {
  const z = SISTEMAS_LIGA[liga.id]; if (!z || !puesto || !total) return '';
  const k = Math.min(z.suben, Math.floor(total / 2)); const b = Math.min(z.bajan, Math.floor(total / 2));
  if (puesto <= k) return '<span class="px-2.5 py-1 rounded-full border border-emerald-400/50 bg-emerald-500/15 text-emerald-200 text-[12px] font-bold uppercase"><i class="fa-solid fa-arrow-up mr-1"></i>Zona de ascenso</span>';
  if (b && puesto > total - b) return '<span class="px-2.5 py-1 rounded-full border border-rose-400/50 bg-rose-500/15 text-rose-200 text-[12px] font-bold uppercase"><i class="fa-solid fa-arrow-down mr-1"></i>Zona de descenso</span>';
  return '<span class="px-2.5 py-1 rounded-full border border-galaxy-border/60 bg-black/30 text-gray-300 text-[12px] font-bold uppercase"><i class="fa-solid fa-minus mr-1"></i>Zona media</span>';
}

function seccionEdicion(liga, ed, nombre) {
  const c = campana(ed, nombre); if (!c) return '';
  const f = c.fila; const rivales = contraRivales(c.jugados);
  const ult = forma(ed.fechas, nombre, 5);
  const avance = c.total ? pct(c.jugados.length, c.jugados.length + c.proximos.length) : 0;
  const barra = f ? `<div><div class="flex h-3 rounded-full overflow-hidden bg-black/40 border border-galaxy-border/40" role="img" aria-label="${f.g} ganados, ${f.e} empatados, ${f.p} perdidos"><span class="bg-emerald-400" style="width:${pct(f.g, f.pj)}%"></span><span class="bg-amber-400" style="width:${pct(f.e, f.pj)}%"></span><span class="bg-rose-400" style="width:${pct(f.p, f.pj)}%"></span></div>
      <div class="flex justify-between text-[12px] mt-1.5"><span class="text-emerald-300">${f.g} ganados</span><span class="text-amber-300">${f.e} empates</span><span class="text-rose-300">${f.p} perdidos</span></div></div>` : '';
  const goles = f && (f.gf + f.gc) > 0 ? `<div><div class="flex h-3 rounded-full overflow-hidden bg-black/40 border border-galaxy-border/40"><span class="bg-galaxy-400" style="width:${pct(f.gf, f.gf + f.gc)}%"></span><span class="bg-fuchsia-500/80" style="width:${pct(f.gc, f.gf + f.gc)}%"></span></div>
      <div class="flex justify-between text-[12px] mt-1.5"><span class="text-galaxy-400">${f.gf} a favor</span><span class="text-fuchsia-300">${f.gc} en contra</span></div></div>` : '';
  const fila = (p) => `<li class="flex items-center gap-3 text-sm rounded-xl bg-black/25 border border-galaxy-border/40 border-l-4 ${BORDE[p.res]} px-3 py-2">
      <span class="w-12 shrink-0 text-center"><span class="block text-[12px] uppercase text-gray-500 leading-none">Fecha</span><b class="font-display text-white">${p.n}</b></span>
      <span class="flex-1 min-w-0">${rival(ed, p.rival)}</span>
      <span class="shrink-0 text-right"><b class="block text-white tabular-nums text-base leading-tight">${p.gf} : ${p.gc}</b><span class="block text-[12px] uppercase ${TONO[p.res]} font-bold leading-tight">${TXT_RES[p.res]} · ${p.local ? 'local' : 'visita'}</span></span></li>`;
  return `<section class="rounded-2xl border border-galaxy-border/60 bg-gradient-to-br from-galaxy-600/10 via-black/20 to-black/30 p-5 space-y-5">
    <div class="flex flex-wrap items-center justify-between gap-3">
      <div class="flex items-center gap-3 min-w-0">
        <span class="shrink-0 grid place-items-center w-14 h-14 rounded-2xl border border-galaxy-400/40 bg-black/40 shadow-[0_0_18px_rgba(0,229,255,.2)]">${escudoHTML(c.club, 40)}</span>
        <div class="min-w-0"><span class="text-[12px] font-display font-bold text-galaxy-400 uppercase tracking-widest">${escapeHTML(liga.titulo.join(' '))}</span>
          <h2 class="font-display font-bold text-xl text-white uppercase leading-tight">${escapeHTML(ed.nombre)}</h2>
          ${c.club ? `<p class="text-sm text-gray-300 uppercase">${escapeHTML(c.club)}</p>` : ''}</div></div>
      <div class="text-right">${ult.length ? `<span class="block text-[12px] uppercase tracking-widest text-gray-400 mb-1">Racha reciente</span><div class="flex gap-1 justify-end">${ult.map(chip).join('')}</div>` : ''}
        ${FX.compartir && f ? `<button type="button" data-compartir-camp="${escapeHTML(`${liga.id}|${ed.id}`)}" class="btn btn-ghost !px-3 !py-1.5 text-xs mt-2"><i class="fa-solid fa-share-nodes"></i> Compartir mi campaña</button>` : ''}</div>
    </div>
    ${f ? `<div class="rounded-xl border border-galaxy-400/30 bg-black/30 p-4 flex flex-wrap items-center gap-x-6 gap-y-3">
        <div><span class="text-[12px] uppercase tracking-widest text-gray-400">Posición</span><div class="font-display font-extrabold text-4xl text-white leading-none">${c.puesto}º <span class="text-sm font-normal text-gray-400">de ${c.total}</span></div></div>
        <div class="flex-1 min-w-[180px]"><div class="flex justify-between text-[12px] text-gray-400 mb-1"><span>Avance de la edición</span><span>${c.jugados.length} de ${c.jugados.length + c.proximos.length} partidos</span></div><div class="h-2 rounded-full bg-black/50 overflow-hidden"><div class="h-full rounded-full bg-gradient-to-r from-galaxy-600 to-galaxy-400" style="width:${avance}%"></div></div></div>
        ${zonaBadge(liga, c.puesto, c.total)}</div>
      <div class="grid grid-cols-2 sm:grid-cols-4 gap-2">${kpiV('fa-bolt', f.pts, 'Puntos', 'text-amber-300')}${kpiV('fa-futbol', f.pj, 'Jugados', 'text-galaxy-400')}${kpiV('fa-bullseye', f.gf, 'Goles a favor', 'text-emerald-300')}${kpiV('fa-scale-balanced', f.dg > 0 ? `+${f.dg}` : f.dg, 'Diferencia', f.dg < 0 ? 'text-rose-300' : 'text-emerald-300')}</div>
      <div class="grid sm:grid-cols-2 gap-4">${barra}${goles}</div>` : '<p class="text-sm text-gray-400">Aún no tiene partidos jugados en esta edición.</p>'}
    <div class="grid md:grid-cols-2 gap-5">
      <div>${tit('fa-clock-rotate-left', 'Resultados', ' <span class="text-gray-500 normal-case font-normal tracking-normal">· del más reciente</span>')}
        ${c.jugados.length ? `<ul class="${FX.carruseles ? 'res-carru' : 'space-y-2'}" ${FX.carruseles ? 'data-carrusel aria-label="Resultados, del más reciente"' : ''}>${[...c.jugados].reverse().map(fila).join('')}</ul>` : '<p class="text-sm text-gray-500">Sin resultados todavía.</p>'}</div>
      <div>${tit('fa-calendar-days', 'Próximos partidos')}
        ${c.proximos.length ? `<ul class="space-y-2">${c.proximos.slice(0, 5).map((p) => `<li class="flex items-center gap-3 text-sm rounded-xl bg-black/25 border border-dashed border-amber-400/30 px-3 py-2"><span class="w-12 shrink-0 text-center"><span class="block text-[12px] uppercase text-gray-500 leading-none">Fecha</span><b class="font-display text-white">${p.n}</b></span><span class="flex-1 min-w-0">${rival(ed, p.rival)}</span><span class="shrink-0 text-[12px] uppercase text-amber-300 font-bold">${p.local ? 'Local' : 'Visita'}</span></li>`).join('')}</ul>` : '<p class="text-sm text-gray-500">No quedan partidos pendientes o el calendario aún no está confirmado.</p>'}</div>
    </div>
    ${rivales.length ? `<div>${tit('fa-people-arrows', 'Contra cada rival')}<div class="grid sm:grid-cols-2 xl:grid-cols-3 gap-2">${rivales.map((r) => { const t = r.g + r.e + r.p; return `<div class="rounded-xl border border-galaxy-border/50 bg-black/25 p-3"><div class="flex items-center justify-between gap-2 text-sm">${rival(ed, r.rival)}<b class="text-white tabular-nums shrink-0">${r.gf}:${r.gc}</b></div><div class="flex h-1.5 rounded-full overflow-hidden bg-black/40 mt-2"><span class="bg-emerald-400" style="width:${pct(r.g, t)}%"></span><span class="bg-amber-400" style="width:${pct(r.e, t)}%"></span><span class="bg-rose-400" style="width:${pct(r.p, t)}%"></span></div><div class="text-[12px] text-gray-400 mt-1">${r.g}G · ${r.e}E · ${r.p}P</div></div>`; }).join('')}</div></div>` : ''}
  </section>`;
}

document.addEventListener('click', async (e) => {   // «Compartir mi campaña» → tarjeta-imagen
  const b = e.target.closest('[data-compartir-camp]'); if (!b || !actual) return;
  const [lid, eid] = b.dataset.compartirCamp.split('|'); const liga = LIGAS.find((l) => l.id === lid); const ed = (EDICIONES[lid] ?? []).find((x) => x.id === eid); if (!liga || !ed) return;
  try {
    const nombre = nombreEnEdicion(actual, ed); const [{ datosJugador }, { abrirTarjeta }] = await Promise.all([import('../core/compartir.js'), import('../features/compartir.js')]);
    abrirTarjeta(datosJugador({ liga: liga.titulo.join(' '), edicion: ed.nombre, nombre: actual.apodo || actual.nombre, campana: campana(ed, nombre), forma: forma(ed.fechas, nombre, 5) }), lid === 'sudario' ? 'sudario' : 'galaxy');
  } catch (err) { console.error('[perfil] compartir:', err); }
});

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
    ${datos.length ? `<dl class="grid sm:grid-cols-3 gap-3">${datos.map(([ic, l, v]) => `<div class="rounded-xl bg-black/25 border border-galaxy-border/40 px-3 py-2.5"><dt class="text-[12px] uppercase tracking-widest text-gray-400"><i class="fa-solid ${ic} text-galaxy-400 mr-1"></i>${l}</dt><dd class="text-sm text-white mt-0.5">${escapeHTML(v)}</dd></div>`).join('')}</dl>` : ''}
    ${logros.length ? `<div><h2 class="text-xs font-display font-bold uppercase tracking-widest text-gray-300 mb-2"><i class="fa-solid fa-medal text-amber-300 mr-1"></i> Logros</h2><ul class="space-y-1.5">${logros.map((l) => `<li class="text-sm text-gray-200 flex gap-2"><i class="fa-solid fa-star text-[12px] text-amber-300 mt-1.5"></i><span>${escapeHTML(l)}</span></li>`).join('')}</ul></div>` : ''}
    ${botones.length ? `<div class="flex flex-wrap gap-2">${botones.join('')}</div>` : ''}
  </section>` : ''}`;
}

// ---- Análisis de juego (se muestra al pulsar el botón) ----
const NOTA_APROX = '<p class="text-[12px] text-gray-500 mt-3"><i class="fa-solid fa-circle-info mr-1"></i>Aproximado: se calcula con la posición y las stats de la ficha. No es un seguimiento real de partidos.</p>';
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
  const k = (v, l) => `<div class="rounded-xl border border-galaxy-border/60 bg-black/25 px-3 py-3 text-center"><div class="font-display font-bold text-xl text-white">${escapeHTML(v)}</div><div class="text-[12px] uppercase tracking-widest text-gray-400 mt-0.5">${escapeHTML(l)}</div></div>`;
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
    panel.innerHTML = `<div class="flex flex-wrap gap-2 mb-4" role="tablist">${TABS.map(([i, ic, n]) => `<button type="button" role="tab" data-tab="${i}" aria-selected="${i === t[0]}" class="adv-chip !min-h-9 !px-3"><i class="fa-solid ${ic} mr-1.5"></i>${n}</button>`).join('')}</div><div>${t[3](p)}</div>`;
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
        <div class="flex flex-wrap gap-1.5 mt-1.5 text-xs">${f.club ? `<span class="rounded-md border border-galaxy-border/50 px-2 py-0.5 text-gray-200"><span class="mr-1">${escudoHTML(f.club, 16)}</span><span class="uppercase">${escapeHTML(f.club)}</span></span>` : ''}${f.puesto ? `<span class="rounded-md border border-galaxy-border/50 px-2 py-0.5 text-gray-200">${escapeHTML(f.puesto)}º puesto</span>` : ''}${f.titulo ? `<span class="rounded-md border px-2 py-0.5 font-bold" style="${md ? `color:${md[0]};border-color:${md[0]}88;background:${md[0]}1a` : 'color:#e5e7eb;border-color:#4b5563'}">${escapeHTML(f.titulo)}</span>` : ''}${prem.map((x) => `<span class="rounded-md border border-emerald-400/40 bg-emerald-500/10 px-2 py-0.5 text-emerald-200"><i class="fa-solid fa-award mr-1"></i>${escapeHTML(x)}</span>`).join('')}</div></div></li>`; };
  const actual = enCurso ? `<li class="flex gap-3 rounded-xl border border-galaxy-400/50 bg-galaxy-600/10 p-3.5"><span class="w-10 h-10 shrink-0 rounded-full grid place-items-center border border-galaxy-400/60 text-galaxy-400"><i class="fa-solid fa-circle-play"></i></span><div class="min-w-0"><div class="flex flex-wrap items-baseline gap-x-2"><b class="text-white font-display uppercase tracking-wide">${escapeHTML(enCurso.liga)}</b><span class="text-sm text-gray-300">${escapeHTML(enCurso.edicion)}</span><span class="text-[12px] font-bold uppercase tracking-widest text-galaxy-400">En curso</span></div><p class="text-xs text-gray-400 mt-1">${enCurso.puesto ? `Va ${escapeHTML(enCurso.puesto)}º en la tabla` : 'Participando'}</p></div></li>` : '';
  const kpis = [[r.ediciones + (enCurso ? 1 : 0), 'Ediciones'], [r.titulos, 'Títulos'], [r.podios, 'Podios'], [r.premios, 'Premios']].map(([v, n]) => `<div class="rounded-xl border border-galaxy-border/60 bg-black/25 px-3 py-3 text-center"><div class="font-display font-bold text-2xl text-white">${v}</div><div class="text-[12px] uppercase tracking-widest text-gray-400 mt-0.5">${n}</div></div>`).join('');
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
    .map((x) => (FX.perfilJugadorPro ? seccionEdicion2 : seccionEdicion)(x.l, x.ed, x.nombre)).filter(Boolean);
  const primera = LIGAS.flatMap((l) => (EDICIONES[l.id] ?? []).map((ed) => ({ l, ed, nombre: nombreEnEdicion(p, ed) })).filter((x) => x.nombre && x.ed.estado === 'en_curso'))[0];
  const cc = primera ? campana(primera.ed, primera.nombre) : null;
  const enCurso = primera ? { liga: primera.l.titulo.join(' '), edicion: primera.ed.nombre, puesto: cc?.fila ? cc.puesto : 0 } : null;
  document.title = `${p.nombre} · Perfil · Phoenix Evolution Series`;
  if (FX.perfilJugadorPro) { render2(p, filasHistorial, campanas, enCurso, cc); return; }
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
// Campaña de una edición, versión ordenada (ronda 275): todo lo importante en una «ficha» de una línea, una sola barra de
// resultados, y lo secundario (más próximos partidos, contra cada rival) plegado.
function seccionEdicion2(liga, ed, nombre) {
  const c = campana(ed, nombre); if (!c) return '';
  const f = c.fila; const rivales = contraRivales(c.jugados); const ult = forma(ed.fechas, nombre, 5);
  const total = c.jugados.length + c.proximos.length; const avance = total ? pct(c.jugados.length, total) : 0;
  const celda = (dt, dd, cls = '') => `<div class="${cls}"><dt>${dt}</dt><dd>${dd}</dd></div>`;
  const fila = (p) => `<li class="pj-res" data-res="${p.res}"><span class="pj-res-f">F${p.n}</span><span class="flex-1 min-w-0">${rival(ed, p.rival)}</span><span class="pj-res-m"><b>${p.gf}–${p.gc}</b><small>${TXT_RES[p.res]} · ${p.local ? 'local' : 'visita'}</small></span></li>`;
  const prox = (p) => `<li class="pj-res pj-prox"><span class="pj-res-f">F${p.n}</span><span class="flex-1 min-w-0">${rival(ed, p.rival)}</span><span class="pj-res-m"><small>${p.local ? 'Local' : 'Visita'}</small></span></li>`;
  return `<section class="pj-camp">
    <header class="pj-camp-cab">
      <span class="pj-camp-esc">${escudoHTML(c.club, 34)}</span>
      <div class="min-w-0 flex-1"><p class="pj-camp-liga">${escapeHTML(liga.titulo.join(' '))}</p><h2 class="pj-camp-ed">${escapeHTML(ed.nombre)}${c.club ? ` <span>· ${escapeHTML(c.club)}</span>` : ''}</h2></div>
      ${ult.length ? `<div class="pj-forma" aria-label="Últimos resultados">${ult.map((r) => `<span data-res="${r}" title="${TXT_RES[r]}">${r}</span>`).join('')}</div>` : ''}
      ${FX.compartir && f ? `<button type="button" data-compartir-camp="${escapeHTML(`${liga.id}|${ed.id}`)}" class="pj-icono" aria-label="Compartir mi campaña" title="Compartir mi campaña"><i class="fa-solid fa-share-nodes"></i></button>` : ''}
    </header>
    ${f ? `<dl class="pj-ficha pj-ficha-camp">${celda('Puesto', `${c.puesto}.º<small>de ${c.total}</small>`, 'pj-media')}${celda('Puntos', f.pts)}${celda('Jugados', f.pj)}${celda('Goles', `${f.gf}<small>–</small>${f.gc}`)}${celda('Diferencia', f.dg > 0 ? `+${f.dg}` : f.dg)}</dl>
      <div class="pj-avance"><div class="pj-avance-t"><span>${zonaBadge(liga, c.puesto, c.total)}</span><span>${c.jugados.length} de ${total} partidos jugados</span></div><div class="pj-avance-b"><i style="width:${avance}%"></i></div></div>
      <div class="pj-gep" role="img" aria-label="${f.g} ganados, ${f.e} empatados, ${f.p} perdidos"><span data-res="G" style="flex:${f.g || 0}"></span><span data-res="E" style="flex:${f.e || 0}"></span><span data-res="P" style="flex:${f.p || 0}"></span></div>
      <p class="pj-gep-l"><span data-res="G">${f.g} ganados</span><span data-res="E">${f.e} empates</span><span data-res="P">${f.p} perdidos</span></p>`
    : '<p class="text-sm text-gray-400">Aún no tiene partidos jugados en esta edición.</p>'}
    <div class="grid md:grid-cols-2 gap-5">
      <div><h3 class="pj-sub">Resultados <span>· del más reciente</span></h3>
        ${c.jugados.length ? `<ul class="pj-lista">${[...c.jugados].reverse().slice(0, 4).map(fila).join('')}</ul>${c.jugados.length > 4 ? `<details class="pj-mas"><summary>Ver ${c.jugados.length - 4} más</summary><ul class="pj-lista">${[...c.jugados].reverse().slice(4).map(fila).join('')}</ul></details>` : ''}` : '<p class="text-sm text-gray-500">Sin resultados todavía.</p>'}</div>
      <div><h3 class="pj-sub">Próximos partidos</h3>
        ${c.proximos.length ? `<ul class="pj-lista">${c.proximos.slice(0, 4).map(prox).join('')}</ul>${c.proximos.length > 4 ? `<details class="pj-mas"><summary>Ver ${c.proximos.length - 4} más</summary><ul class="pj-lista">${c.proximos.slice(4).map(prox).join('')}</ul></details>` : ''}` : '<p class="text-sm text-gray-500">No quedan partidos pendientes o el calendario aún no está confirmado.</p>'}</div>
    </div>
    ${rivales.length ? `<details class="pj-mas pj-rivales"><summary>Contra cada rival <span>(${rivales.length})</span></summary><div class="grid sm:grid-cols-2 xl:grid-cols-3 gap-2 mt-3">${rivales.map((r) => { const t = r.g + r.e + r.p; return `<div class="pj-rival"><div class="flex items-center justify-between gap-2 text-sm">${rival(ed, r.rival)}<b class="text-white tabular-nums shrink-0">${r.gf}–${r.gc}</b></div><div class="pj-gep pj-gep-fino"><span data-res="G" style="flex:${r.g}"></span><span data-res="E" style="flex:${r.e}"></span><span data-res="P" style="flex:${r.p}"></span></div><p class="text-[12px] text-gray-400 mt-1">${r.g} G · ${r.e} E · ${r.p} P${t ? '' : ''}</p></div>`; }).join('')}</div></details>` : ''}
  </section>`;
}

// ── PERFIL VIVO (ronda 276, FX.perfilJugadorVivo) ───────────────────────────────────────────────────────────
// Pedido de Fralex: «más técnico, más vivo y más futbolístico, muy dinámico». Un bloque «scouting» bajo la cabecera:
//   · En la cancha: mini cancha (SVG) con sus zonas de calor y el punto de su posición; al pasar el mouse por cada tercio
//     dice cuánto juega ahí.
//   · Atributos: los 6 ejes (Ataque, Creación, Técnica, Defensa, Presión, Mentalidad) en barras con el color de nivel tipo FC;
//     al pasar el mouse, de qué stats sale cada número.
//   · Forma: los últimos 5 resultados como bolitas y una palabra («En racha», «Irregular», «Mala racha»).
// Las barras se llenan y los números suben una sola vez al cargar (respeta «Animaciones reducidas»). Nada se mueve solo después.
const NIVEL = (v) => (v >= 85 ? '#22d3ee' : v >= 78 ? '#34d399' : v >= 70 ? '#a3e635' : v >= 62 ? '#fbbf24' : '#fb923c');
function momento(ult) {
  if (!ult.length) return null;
  const g = ult.filter((r) => r === 'G').length; const pp = ult.filter((r) => r === 'P').length;
  if (g >= 3) return ['En racha', '#34d399', 'fa-fire'];
  if (pp >= 3) return ['Mala racha', '#fb7185', 'fa-arrow-trend-down'];
  if (ult.slice(-2).every((r) => r === 'G')) return ['Al alza', '#a3e635', 'fa-arrow-trend-up'];
  return ['Irregular', '#fbbf24', 'fa-wave-square'];
}
function miniCancha(p) {
  const m = mapaCalor(p); const t = m.tercios; const z0 = [...m.zonas].sort((a, b) => b.peso - a.peso)[0];
  const W = 105; const H = 68; const X = (x) => (x * 1.05).toFixed(1); const Y = (y) => (y * 0.68).toFixed(1);
  const blobs = m.zonas.map((z, i) => `<ellipse class="pj-blob" style="--k:${i}" cx="${X(z.x)}" cy="${Y(z.y)}" rx="${(z.rx * 1.3).toFixed(1)}" ry="${(z.ry * 0.85).toFixed(1)}" fill="url(#pjcalor)" opacity="${Math.min(1, 0.45 + z.peso * 0.55).toFixed(2)}"/>`).join('');
  const l = 'fill="none" stroke="rgba(255,255,255,.28)" stroke-width=".45"';
  const tercio = (i, n, v) => `<rect class="pj-tercio" x="${(i * 35).toFixed(1)}" y="0" width="35" height="${H}" data-tip="${n}: ${v}% del juego"/>`;
  return `<svg viewBox="0 0 ${W} ${H}" class="pj-cancha" role="img" aria-label="Zonas donde más juega: defensa ${t.defensa}%, medio ${t.medio}%, ataque ${t.ataque}%">
    <defs><radialGradient id="pjcalor"><stop offset="0" stop-color="#ff3b30" stop-opacity=".9"/><stop offset=".45" stop-color="#ffb300" stop-opacity=".5"/><stop offset="1" stop-color="#00e5ff" stop-opacity="0"/></radialGradient>
      <filter id="pjdifuso" x="-20%" y="-20%" width="140%" height="140%"><feGaussianBlur stdDeviation="1.8"/></filter>
      <linearGradient id="pjcesped" x1="0" x2="1"><stop offset="0" stop-color="#0d4a30"/><stop offset="1" stop-color="#0a3a27"/></linearGradient></defs>
    <rect width="${W}" height="${H}" rx="3" fill="url(#pjcesped)"/>${[0, 1, 2, 3, 4, 5, 6].map((i) => (i % 2 ? `<rect x="${i * 15}" width="15" height="${H}" fill="rgba(255,255,255,.035)"/>` : '')).join('')}
    <g ${l}><rect x="1.5" y="1.5" width="102" height="65" rx="1"/><line x1="52.5" y1="1.5" x2="52.5" y2="66.5"/><circle cx="52.5" cy="34" r="9"/><circle cx="52.5" cy="34" r=".6" fill="rgba(255,255,255,.35)"/>
      <rect x="1.5" y="14" width="16" height="40"/><rect x="1.5" y="24" width="6" height="20"/><rect x="87.5" y="14" width="16" height="40"/><rect x="97.5" y="24" width="6" height="20"/>
      <path d="M17.5 27a8 8 0 0 1 0 14M87.5 27a8 8 0 0 0 0 14"/></g>
    <g filter="url(#pjdifuso)" style="mix-blend-mode:screen">${blobs}</g>
    <g class="pj-marca" transform="translate(${X(z0.x)} ${Y(z0.y)})"><circle r="4.2" fill="rgba(0,0,0,.45)"/><circle r="3" fill="#fff"/><text y="1.1" text-anchor="middle" font-size="2.6" font-weight="800" fill="#0b0d1c">${escapeHTML(p.posicion ?? '')}</text></g>
    ${tercio(0, 'Zona defensiva', t.defensa)}${tercio(1, 'Zona media', t.medio)}${tercio(2, 'Zona de ataque', t.ataque)}
  </svg>
  <div class="pj-tercios"><span><b>${t.defensa}%</b> defensa</span><span><b>${t.medio}%</b> medio</span><span><b>${t.ataque}%</b> ataque</span></div>`;
}
function scoutingHTML(p, ult) {
  const ej = ejesEstilo(p); const mo = momento(ult);
  const barras = ej.map((e, i) => {
    const def = EJES.find((x) => x.id === e.id); const tip = def.keys.map((k) => `${STAT_INFO[k]?.nombre ?? k} ${p?.[k] ?? '—'}`).join(' · ');
    return `<li class="pj-attr" style="--v:${e.valor};--n:${NIVEL(e.valor)};--k:${i}" data-tip="${escapeHTML(tip)}" tabindex="0"><span class="pj-attr-n">${escapeHTML(e.nombre)}</span><span class="pj-attr-b"><i></i></span><b class="pj-cuenta" data-to="${e.valor}">${e.valor}</b></li>`;
  }).join('');
  return `<section class="pj-scout" aria-label="Perfil técnico">
    <div class="pj-scout-cancha"><h3 class="pj-sub">En la cancha</h3>${miniCancha(p)}</div>
    <div class="pj-scout-attr"><div class="pj-scout-t"><h3 class="pj-sub">Atributos</h3><div class="pj-arq">${arquetipos(p).map((a) => `<span>${escapeHTML(a)}</span>`).join('')}</div></div>
      <ul class="pj-attrs">${barras}</ul>
      ${ult.length ? `<div class="pj-momento"><span class="pj-sub">Forma</span><span class="pj-bolas">${ult.map((r) => `<i data-res="${r}" title="${TXT_RES[r]}"></i>`).join('')}</span>${mo ? `<b style="--m:${mo[1]}"><i class="fa-solid ${mo[2]}"></i>${mo[0]}</b>` : ''}</div>` : ''}
    </div>
  </section>`;
}
/** Números que suben y barras que se llenan, una vez. Globito al pasar el mouse por los tercios y atributos. */
function animarScout(root) {
  if (!root) return;
  const reducido = hayMovimientoReducido();
  root.querySelectorAll('.pj-cuenta[data-to]').forEach((el) => {
    const fin = Number(el.dataset.to); if (reducido || !Number.isFinite(fin)) return;
    const t0 = performance.now(); const dur = 700;
    const paso = (t) => { const k = Math.min(1, (t - t0) / dur); el.textContent = Math.round(fin * (1 - (1 - k) ** 3)); if (k < 1) requestAnimationFrame(paso); };
    el.textContent = '0'; requestAnimationFrame(paso);
  });
  requestAnimationFrame(() => root.classList.add('pj-listo'));
  let globo = document.querySelector('.pj-globo');
  if (!globo) { globo = document.createElement('div'); globo.className = 'pj-globo'; globo.hidden = true; document.body.append(globo); }
  const ver = (el, x, y) => { globo.textContent = el.dataset.tip; globo.hidden = false; const r = globo.getBoundingClientRect(); globo.style.transform = `translate(${Math.min(Math.max(8, x - r.width / 2), innerWidth - r.width - 8)}px, ${Math.max(8, y - r.height - 12)}px)`; };
  root.addEventListener('pointermove', (e) => { const el = e.target.closest('[data-tip]'); if (el) ver(el, e.clientX, e.clientY); else globo.hidden = true; });
  root.addEventListener('pointerleave', () => { globo.hidden = true; });
  root.addEventListener('focusin', (e) => { const el = e.target.closest('[data-tip]'); if (el) { const r = el.getBoundingClientRect(); ver(el, r.left + r.width / 2, r.top); } });
  root.addEventListener('focusout', () => { globo.hidden = true; });
  addEventListener('scroll', () => { globo.hidden = true; }, { passive: true });
}

// ── PERFIL PRO (ronda 275, FX.perfilJugadorPro) ─────────────────────────────────────────────────────────────
// Pedido de Fralex: orden visual, elegancia y sensación premium en el perfil de jugador. Mismos datos y mismas acciones:
//   · cabecera: club y posición en una línea fina, nombre grande, apodo como firma (sin píldora), y una «ficha técnica»
//     de un solo estilo (Media · Posición · Altura · Pie · Puesto) en vez de 5 etiquetas de colores distintos;
//   · los 3 botones de edición (solo staff) van juntos en un menú «Editar»;
//   · el contenido largo se reparte en 3 pestañas cápsula: Temporada · Análisis · Trayectoria (menos scroll).
const PESTANAS = [['temporada', 'fa-futbol', 'Temporada'], ['analisis', 'fa-chart-pie', 'Análisis'], ['trayectoria', 'fa-trophy', 'Trayectoria']];
function render2(p, filasHistorial, campanas, enCurso, cc) {
  const pos = posInfo(p.posicion);
  const celda = (dt, dd, cls = '') => `<div class="${cls}"><dt>${dt}</dt><dd>${dd}</dd></div>`;
  const ficha = [
    celda('Media', escapeHTML(p.ovr ?? '--'), 'pj-media'),
    p.posicion ? celda('Posición', `<span class="pj-punto" style="background:${pos.color}"></span>${escapeHTML(p.posicion)}`) : '',
    p.altura_cm ? celda('Altura', `${escapeHTML(p.altura_cm)}<small>cm</small>`) : '',
    p.pie ? celda('Pie', p.pie === 'Izquierdo' ? 'Izquierdo' : 'Derecho') : '',
    cc?.fila ? celda('En la tabla', `${cc.puesto}.º<small>de ${cc.total}</small>`) : '',
  ].join('');
  const trayectoria = `${seccionHistorial(filasHistorial, enCurso)}${datosPerfil(p)}`;
  const prim = LIGAS.flatMap((l) => (EDICIONES[l.id] ?? []).map((ed) => ({ ed, nombre: nombreEnEdicion(p, ed) })).filter((x) => x.nombre)).at(-1);
  const ultForma = prim ? forma(prim.ed.fechas, prim.nombre, 5) : [];
  const inicial = PESTANAS.some((t) => t[0] === location.hash.slice(1)) ? location.hash.slice(1) : 'temporada';
  caja(`<div class="pj2 grid lg:grid-cols-[minmax(0,320px)_minmax(0,1fr)] gap-8 items-start">
    <div class="w-full max-w-[320px] mx-auto lg:mx-0 lg:sticky lg:top-24">${playerCardHTML(p, 0, { largo: true })}</div>
    <div class="space-y-6 min-w-0">
      <header class="pj-cab">
        <p class="pj-kicker">${p.club ? `${escudoHTML(p.club, 20)}<span>${escapeHTML(p.club)}</span><i aria-hidden="true">·</i>` : ''}<span>${escapeHTML(pos.nombre || p.posicion || '')}</span></p>
        <h1 class="pj-nombre">${escapeHTML(p.nombre)}</h1>
        ${p.apodo ? `<p class="pj-apodo">«${escapeHTML(p.apodo)}»</p>` : ''}
        <dl class="pj-ficha">${ficha}</dl>
        ${p.descripcion ? `<p class="pj-desc">${escapeHTML(p.descripcion)}</p>` : ''}
      </header>
      ${FX.perfilJugadorVivo ? scoutingHTML(p, ultForma) : ''}
      <div class="pj-barra">
        <div class="pilar-tabs-lista pj-tabs" role="tablist" aria-label="Secciones del perfil">${PESTANAS.map(([id, ic, n]) => `<button type="button" role="tab" id="pj-tab-${id}" aria-controls="pj-${id}" aria-selected="${id === inicial}" data-pj-tab="${id}"><i class="fa-solid ${ic}"></i>${n}</button>`).join('')}</div>
        <details class="pj-editar" id="pj-editar-menu" hidden><summary class="btn btn-ghost"><i class="fa-solid fa-pen"></i> Editar <i class="fa-solid fa-chevron-down text-[11px]"></i></summary>
          <div class="pj-editar-lista" role="menu">
            <button type="button" id="perfil-editar" role="menuitem"><i class="fa-solid fa-id-card"></i>Ficha y stats</button>
            <button type="button" id="perfil-editar-bio" role="menuitem"><i class="fa-solid fa-book-open"></i>Biografía y redes</button>
            <button type="button" id="perfil-editar-hist" role="menuitem"><i class="fa-solid fa-trophy"></i>Historial y títulos</button>
          </div></details>
      </div>
      <div id="pj-temporada" role="tabpanel" aria-labelledby="pj-tab-temporada" class="space-y-5" ${inicial === 'temporada' ? '' : 'hidden'}>${campanas.join('') || '<section class="pj-vacio">Este jugador todavía no figura en ninguna edición de liga.</section>'}</div>
      <div id="pj-analisis" role="tabpanel" aria-labelledby="pj-tab-analisis" ${inicial === 'analisis' ? '' : 'hidden'}><section id="perfil-analisis" class="pj-panel"></section></div>
      <div id="pj-trayectoria" role="tabpanel" aria-labelledby="pj-tab-trayectoria" class="space-y-5" ${inicial === 'trayectoria' ? '' : 'hidden'}>${trayectoria}</div>
    </div></div>`);
  const panel = $('perfil-analisis');
  const pintarA = (id) => {
    const TABS = tabsDe(p); const t = TABS.find((x) => x[0] === id) ?? TABS[0];
    panel.innerHTML = `<div class="flex flex-wrap gap-2 mb-4" role="tablist">${TABS.map(([i, ic, n]) => `<button type="button" role="tab" data-tab="${i}" aria-selected="${i === t[0]}" class="adv-chip !min-h-9 !px-3"><i class="fa-solid ${ic} mr-1.5"></i>${n}</button>`).join('')}</div><div>${t[3](p)}</div>`;
    if (t[0] === 'muro') cargarMuroTab(p);
  };
  panel.addEventListener('click', (e) => { const yt = e.target.closest('[data-act=video-yt]'); if (yt) { reproductorYT(yt); return; } const b = e.target.closest('[data-tab]'); if (b) pintarA(b.dataset.tab); });
  const abrir = (id) => {
    document.querySelectorAll('[data-pj-tab]').forEach((b) => b.setAttribute('aria-selected', String(b.dataset.pjTab === id)));
    PESTANAS.forEach(([t]) => { $(`pj-${t}`).hidden = t !== id; });
    if (id === 'analisis' && !panel.innerHTML.trim()) pintarA('calor');
    history.replaceState(null, '', id === 'temporada' ? location.pathname + location.search : `#${id}`);
  };
  document.querySelector('.pj-tabs').addEventListener('click', (e) => { const b = e.target.closest('[data-pj-tab]'); if (b) abrir(b.dataset.pjTab); });
  document.querySelector('.pj-tabs').addEventListener('keydown', (e) => {
    if (!['ArrowRight', 'ArrowLeft'].includes(e.key)) return;
    const ids = PESTANAS.map((t) => t[0]); const i = ids.indexOf(document.querySelector('[data-pj-tab][aria-selected="true"]').dataset.pjTab);
    const n = ids[(i + (e.key === 'ArrowRight' ? 1 : -1) + ids.length) % ids.length]; abrir(n); $(`pj-tab-${n}`).focus();
  });
  if (inicial === 'analisis') pintarA('calor');
  // Contadores del historial en cero: apagados, para que resalte lo que sí hay
  document.querySelectorAll('#pj-trayectoria .grid-cols-4 > div').forEach((k) => { if (k.firstElementChild?.textContent.trim() === '0') k.classList.add('pj-cero'); });
  const menu = $('pj-editar-menu');
  menu.addEventListener('click', (e) => { if (e.target.closest('[role=menuitem]')) menu.open = false; });
  document.addEventListener('click', (e) => { if (menu.open && !menu.contains(e.target)) menu.open = false; });
  mostrarEditar();
  if (FX.perfilJugadorVivo) animarScout(document.querySelector('.pj-scout'));
}

function mostrarEditar() {
  const menu = $('pj-editar-menu'); if (menu) menu.hidden = !can('editarLiga');
  const b = $('perfil-editar'); if (!b) return;
  b.hidden = !can('editarLiga'); b.onclick = () => openPlayerForm(actual, init);
  const hist = $('perfil-editar-hist'); if (hist) { hist.hidden = !can('editarLiga'); hist.onclick = () => abrirEditorHistorial(actual, historial, init, { puedeBorrar: can('borrarLiga') }); }
  const bio = $('perfil-editar-bio'); if (bio) { bio.hidden = !can('editarLiga'); bio.onclick = () => abrirEditorPerfil(actual, init); }
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

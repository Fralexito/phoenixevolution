// Comparador de dos jugadores: radar superpuesto de las 14 estadísticas + barras enfrentadas + resumen.
import { openModal } from '../core/modal.js';
import { escapeHTML, safeImg, statColor } from '../core/dom.js';
import { compareStats, axisPoint, radarPoints } from '../core/compare.js';
import { STAT_INFO } from '../../data/stats.js';
import { STAT_KEYS } from './playerCard.js';

const CA = '#00e5ff'; const CB = '#ff2d95';   // colores fijos: jugador A (cian) y jugador B (magenta)
const RADAR = { cx: 150, cy: 150, r: 100, min: 40, max: 99 };

function radarSVG(a, b) {
  const rings = [60, 80, 99].map((v) => {
    const t = (v - RADAR.min) / (RADAR.max - RADAR.min);
    const pts = STAT_KEYS.map((_, i) => axisPoint(i, STAT_KEYS.length, RADAR.cx, RADAR.cy, RADAR.r * t).map((n) => n.toFixed(1)).join(',')).join(' ');
    return `<polygon points="${pts}" fill="none" stroke="rgba(167,139,250,.22)" stroke-width="1"/>`;
  }).join('');
  const spokes = STAT_KEYS.map((k, i) => {
    const [x, y] = axisPoint(i, STAT_KEYS.length, RADAR.cx, RADAR.cy, RADAR.r);
    const [lx, ly] = axisPoint(i, STAT_KEYS.length, RADAR.cx, RADAR.cy, RADAR.r + 16);
    return `<line x1="${RADAR.cx}" y1="${RADAR.cy}" x2="${x.toFixed(1)}" y2="${y.toFixed(1)}" stroke="rgba(167,139,250,.18)"/>
      <text x="${lx.toFixed(1)}" y="${ly.toFixed(1)}" fill="#9ca3af" font-size="10" font-family="Rajdhani,sans-serif" font-weight="700" text-anchor="middle" dominant-baseline="middle">${k.toUpperCase()}</text>`;
  }).join('');
  const poly = (p, c) => p ? `<polygon points="${radarPoints(p, STAT_KEYS, RADAR)}" fill="${c}" fill-opacity=".18" stroke="${c}" stroke-width="2" stroke-linejoin="round"/>` : '';
  return `<svg viewBox="0 0 300 300" role="img" aria-label="Radar comparativo de las 14 estadísticas" class="w-full max-w-[22rem] mx-auto">${rings}${spokes}${poly(a, CA)}${poly(b, CB)}</svg>
    <p class="text-[10px] text-gray-500 text-center -mt-1">Escala del radar: 40 a 99</p>`;
}

function headCard(p, color, side) {
  if (!p) return `<div class="flex-1 text-center text-xs text-gray-500 py-4">Elige un jugador</div>`;
  const img = safeImg(p.foto_url) || safeImg(p.foto);
  return `<div class="flex-1 min-w-0 flex flex-col items-center text-center gap-1">
    <span class="w-14 h-14 rounded-full overflow-hidden border-2 bg-galaxy-card grid place-items-center" style="border-color:${color}">${img ? `<img src="${escapeHTML(img)}" alt="" class="w-full h-full object-cover">` : `<i class="fa-solid fa-user-astronaut text-xl" style="color:${color}"></i>`}</span>
    <b class="font-display uppercase tracking-wider text-white text-sm truncate max-w-full">${escapeHTML(p.nombre)}</b>
    <span class="text-[11px] text-gray-400 truncate max-w-full">${escapeHTML(p.club)} · ${escapeHTML(p.posicion)}</span>
    <span class="font-display font-extrabold text-3xl" style="color:${color}" data-side="${side}">${escapeHTML(p.ovr ?? '--')}</span>
  </div>`;
}

function rowHTML(r) {
  const info = STAT_INFO[r.k];
  const w = (v) => `${Math.round((v / 99) * 100)}%`;
  const cls = (me) => (r.win === me ? 'font-extrabold' : 'opacity-70');
  return `<div class="py-1.5">
    <div class="text-center text-[10px] text-gray-500 uppercase tracking-wider font-display" title="${escapeHTML(info.texto)}"><b class="text-gray-300">${r.k.toUpperCase()}</b> · ${escapeHTML(info.nombre)}${r.diff ? ` <span style="color:${r.diff > 0 ? CA : CB}">(${r.diff > 0 ? '+' : ''}${r.diff})</span>` : ''}</div>
    <div class="flex items-center gap-2 mt-0.5">
      <span class="w-7 text-right font-display text-sm ${cls('a')}" style="color:${statColor(r.a)}">${r.a}</span>
      <div class="flex-1 h-2 rounded-full bg-[#1a1033] overflow-hidden flex justify-end"><div style="width:${w(r.a)};background:${CA};opacity:${r.win === 'b' ? .45 : 1}" class="h-full rounded-full"></div></div>
      <div class="flex-1 h-2 rounded-full bg-[#1a1033] overflow-hidden"><div style="width:${w(r.b)};background:${CB};opacity:${r.win === 'a' ? .45 : 1}" class="h-full rounded-full"></div></div>
      <span class="w-7 font-display text-sm ${cls('b')}" style="color:${statColor(r.b)}">${r.b}</span>
    </div></div>`;
}

const textoJugador = (p, color) => p && (p.descripcion || p.quote) ? `<div class="flex-1 min-w-0 rounded-lg border bg-black/30 p-3" style="border-color:${color}55">
  <b class="font-display text-xs uppercase tracking-wider" style="color:${color}">${escapeHTML(p.nombre)}</b>
  ${p.quote ? `<p class="text-[12px] text-[#a78bfa] italic mt-1">"${escapeHTML(p.quote)}"</p>` : ''}
  ${p.descripcion ? `<p class="text-[12px] text-gray-300 leading-relaxed mt-1 whitespace-pre-line">${escapeHTML(p.descripcion)}</p>` : ''}</div>` : '';

/** Abre el comparador. `players` = lista completa; `idA`/`idB` = jugadores preseleccionados (pueden faltar). */
export function openCompare(players, idA = null, idB = null) {
  let a = players.find((p) => p.id === idA) ?? null;
  let b = players.find((p) => p.id === idB) ?? null;
  const opts = (sel) => `<option value="">— Elegir —</option>${players.map((p) => `<option value="${escapeHTML(p.id)}" ${p.id === sel?.id ? 'selected' : ''}>${escapeHTML(p.nombre)} (${escapeHTML(p.ovr)})</option>`).join('')}`;

  const m = openModal(`
    <div class="p-5 sm:p-6 space-y-4">
      <div class="flex justify-between items-center">
        <h2 class="font-display font-bold text-2xl text-white uppercase tracking-widest"><i class="fa-solid fa-scale-balanced text-galaxy-400 mr-2"></i>Comparar</h2>
        <button type="button" data-close aria-label="Cerrar" class="text-gray-500 hover:text-white"><i class="fa-solid fa-xmark text-xl"></i></button>
      </div>
      <div class="grid grid-cols-2 gap-2">
        <div><label class="label" for="cmp-a" style="color:${CA}">Jugador A</label><select id="cmp-a" class="field">${opts(a)}</select></div>
        <div><label class="label" for="cmp-b" style="color:${CB}">Jugador B</label><select id="cmp-b" class="field">${opts(b)}</select></div>
      </div>
      <div id="cmp-body" aria-live="polite"></div>
    </div>`, { id: 'compare-modal', wide: true });

  const body = m.querySelector('#cmp-body');
  const paint = () => {
    if (!a || !b) { body.innerHTML = `<p class="text-center text-sm text-gray-400 py-10">Elige dos jugadores para compararlos.</p>`; return; }
    if (a.id === b.id) { body.innerHTML = `<p class="text-center text-sm text-warn py-10">Elige dos jugadores distintos.</p>`; return; }
    const c = compareStats(a, b, STAT_KEYS);
    const lider = c.wins.a === c.wins.b ? 'Igualados' : c.wins.a > c.wins.b ? `${escapeHTML(a.nombre)} lidera` : `${escapeHTML(b.nombre)} lidera`;
    body.innerHTML = `
      <div class="flex items-start gap-3">${headCard(a, CA, 'a')}<span class="font-display text-gray-500 pt-6">VS</span>${headCard(b, CB, 'b')}</div>
      <div class="mt-3 text-center text-[12px] text-gray-300 rounded-lg bg-black/30 border border-galaxy-border py-2">
        <b style="color:${CA}">${c.wins.a}</b> a favor de A · <b style="color:${CB}">${c.wins.b}</b> a favor de B · ${c.wins.tie} empates — <b class="text-white">${lider}</b>
        ${c.ovr.diff ? `<span class="block text-[11px] text-gray-400">Media general: ${c.ovr.diff > 0 ? escapeHTML(a.nombre) : escapeHTML(b.nombre)} por ${Math.abs(c.ovr.diff)} punto${Math.abs(c.ovr.diff) === 1 ? '' : 's'}</span>` : ''}
      </div>
      <div class="mt-3">${radarSVG(a, b)}</div>
      <div class="mt-2 divide-y divide-galaxy-border/40">${c.rows.map(rowHTML).join('')}</div>
      <div class="mt-3 flex flex-col sm:flex-row gap-2">${textoJugador(a, CA)}${textoJugador(b, CB)}</div>`;
  };
  m.querySelector('#cmp-a').addEventListener('change', (e) => { a = players.find((p) => p.id === e.target.value) ?? null; paint(); });
  m.querySelector('#cmp-b').addEventListener('change', (e) => { b = players.find((p) => p.id === e.target.value) ?? null; paint(); });
  paint();
}

// Comparación MASIVA: de 2 a 8 jugadores repartidos en dos equipos (A y B, máx. 4 cada uno; admite 3 vs 2, 4 vs 3…).
// Se compara el PROMEDIO de cada equipo. Para no tener que bajar tanto, el resultado se divide en mini secciones
// (Resumen · Radar · Barras · Tabla) y solo una está abierta a la vez.
import { openModal } from '../core/modal.js';
import { escapeHTML, safeImg, statColor } from '../core/dom.js';
import { compareTeams, teamProfile, axisPoint, radarPoints, autoTeams, moveToTeam, MAX_COMPARE, MAX_TEAM } from '../core/compare.js';
import { posInfo } from '../../data/posiciones.js';
import { STAT_INFO } from '../../data/stats.js';
import { STAT_KEYS } from './playerCard.js';
import { mountPicker } from './playerPicker.js';

const COL = { a: '#00e5ff', b: '#ff2d95' };   // colores fijos: equipo A (cian) y equipo B (magenta)
const RADAR = { cx: 150, cy: 150, r: 100, min: 40, max: 99 };

function radarSVG(pa, pb) {
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
  const poly = (p, c) => `<polygon points="${radarPoints(p, STAT_KEYS, RADAR)}" fill="${c}" fill-opacity=".18" stroke="${c}" stroke-width="2" stroke-linejoin="round"/>`;
  return `<svg viewBox="0 0 300 300" role="img" aria-label="Radar comparativo de los promedios de cada equipo" class="w-full max-w-[22rem] mx-auto">${rings}${spokes}${poly(pa, COL.a)}${poly(pb, COL.b)}</svg>
    <p class="text-[10px] text-gray-500 text-center -mt-1">Escala del radar: 40 a 99</p>`;
}

const mini = (p, c) => {
  const img = safeImg(p.foto_url) || safeImg(p.foto);
  return `<span title="${escapeHTML(p.nombre)}" class="w-9 h-9 rounded-full overflow-hidden border-2 bg-galaxy-card grid place-items-center shrink-0" style="border-color:${c}">${img ? `<img src="${escapeHTML(img)}" alt="" class="w-full h-full object-cover">` : `<i class="fa-solid fa-user-astronaut text-sm" style="color:${c}"></i>`}</span>`;
};

function teamHead(side, players, prof) {
  const c = COL[side];
  return `<div class="flex-1 min-w-0 rounded-xl border p-3" style="border-color:${c}66;background:${c}0d">
    <div class="flex items-baseline justify-between gap-2"><b class="font-display uppercase tracking-wider text-sm" style="color:${c}">Equipo ${side.toUpperCase()}</b><span class="text-[11px] text-gray-400">${players.length} jugador${players.length === 1 ? '' : 'es'}</span></div>
    <div class="font-display font-extrabold text-3xl leading-none mt-1" style="color:${c}">${prof.ovr ?? '--'}<span class="text-[10px] text-gray-500 font-bold tracking-wider ml-1">MEDIA</span></div>
    <div class="flex flex-wrap gap-1 mt-2">${players.map((p) => mini(p, c)).join('')}</div>
  </div>`;
}

function rowHTML(r) {
  const info = STAT_INFO[r.k]; const w = (v) => `${Math.round((v / 99) * 100)}%`;
  const cls = (me) => (r.win === me ? 'font-extrabold' : 'opacity-70');
  return `<div class="py-1.5">
    <div class="text-center text-[10px] text-gray-500 uppercase tracking-wider font-display" title="${escapeHTML(info.texto)}"><b class="text-gray-300">${r.k.toUpperCase()}</b> · ${escapeHTML(info.nombre)}${r.diff ? ` <span style="color:${r.diff > 0 ? COL.a : COL.b}">(${r.diff > 0 ? '+' : ''}${r.diff})</span>` : ''}</div>
    <div class="flex items-center gap-2 mt-0.5">
      <span class="w-9 text-right font-display text-sm ${cls('a')}" style="color:${statColor(r.a)}">${r.a}</span>
      <div class="flex-1 h-2 rounded-full bg-[#1a1033] overflow-hidden flex justify-end"><div style="width:${w(r.a)};background:${COL.a};opacity:${r.win === 'b' ? .45 : 1}" class="h-full rounded-full"></div></div>
      <div class="flex-1 h-2 rounded-full bg-[#1a1033] overflow-hidden"><div style="width:${w(r.b)};background:${COL.b};opacity:${r.win === 'a' ? .45 : 1}" class="h-full rounded-full"></div></div>
      <span class="w-9 font-display text-sm ${cls('b')}" style="color:${statColor(r.b)}">${r.b}</span>
    </div></div>`;
}

/** Tabla «Todos»: una columna por jugador (A y luego B); en cada fila se marca el mejor valor. */
function matrixHTML(cols) {
  const rows = [{ k: 'ovr', nombre: 'Media' }, ...STAT_KEYS.map((k) => ({ k, nombre: STAT_INFO[k].nombre }))];
  const val = (p, k) => Number(p[k]) || 0;
  const head = cols.map(({ p, side }) => { const i = posInfo(p.posicion); return `<th class="px-1.5 pb-1.5 font-normal align-bottom" style="min-width:4.2rem"><div class="border-b-2 pb-1" style="border-color:${COL[side]}"><div class="font-display font-bold uppercase text-[11px] text-white truncate max-w-[4.6rem]" title="${escapeHTML(p.nombre)}">${escapeHTML(p.nombre)}</div><div class="text-[10px]" style="color:${i.color}">${escapeHTML(p.posicion)}</div></div></th>`; }).join('');
  const body = rows.map(({ k, nombre }) => {
    const best = Math.max(...cols.map(({ p }) => val(p, k)));
    return `<tr class="border-t border-galaxy-border/40"><th class="sticky left-0 bg-galaxy-panel text-left pr-2 py-1 font-display text-[10px] uppercase tracking-wider text-gray-400 whitespace-nowrap z-[1]"><b class="text-gray-200">${k === 'ovr' ? 'OVR' : k}</b> <span class="hidden sm:inline">${escapeHTML(nombre)}</span></th>${cols.map(({ p }) => { const v = val(p, k); return `<td class="text-center font-display text-sm py-1 ${v === best ? 'font-extrabold underline decoration-2 underline-offset-2' : ''}" style="color:${statColor(v)}">${v || '–'}</td>`; }).join('')}</tr>`;
  }).join('');
  return `<div class="overflow-x-auto -mx-1 px-1"><table class="w-full border-collapse"><thead><tr><th class="sticky left-0 bg-galaxy-panel z-[1]"></th>${head}</tr></thead><tbody>${body}</tbody></table></div>
    <p class="text-[10px] text-gray-500 mt-1">Subrayado = mejor valor de la fila entre todos los jugadores. Desliza para ver más columnas.</p>`;
}

/** Abre el comparador con los ids preseleccionados (reparte A/B alternando). `players` = lista completa. */
export function openCompareMasivo(players, ids = []) {
  const byId = new Map(players.map((p) => [p.id, p]));
  let teams = autoTeams(ids.filter((id) => byId.has(id)).slice(0, MAX_COMPARE));
  let sec = 'resumen';   // mini sección abierta
  const all = () => [...teams.a, ...teams.b];

  const m = openModal(`
    <div class="p-5 sm:p-6 space-y-4">
      <div class="flex justify-between items-center">
        <h2 class="font-display font-bold text-xl sm:text-2xl text-white uppercase tracking-wider"><i class="fa-solid fa-people-group text-galaxy-400 mr-2"></i>Comparación masiva</h2>
        <button type="button" data-close aria-label="Cerrar" class="text-gray-500 hover:text-white"><i class="fa-solid fa-xmark text-xl"></i></button>
      </div>
      <div id="cmp-teams" class="grid grid-cols-2 gap-2"></div>
      <div class="flex items-center gap-2">
        <div id="cmp-add" class="flex-1"></div>
        <span id="cmp-count" class="text-[11px] text-gray-400 font-display uppercase tracking-wider shrink-0"></span>
      </div>
      <div id="cmp-body" aria-live="polite"></div>
    </div>`, { id: 'compare-modal', wide: true });
  const $ = (s) => m.querySelector(s);

  const chip = (id, side) => { const p = byId.get(id); const c = COL[side]; const otro = side === 'a' ? 'b' : 'a';
    const lleno = teams[otro].length >= MAX_TEAM;
    return `<li class="flex items-center gap-1 rounded-lg border px-2 py-1" style="border-color:${c}55">
      <span class="flex-1 min-w-0 truncate text-[12px] text-white font-display uppercase tracking-wide">${escapeHTML(p.nombre)} <b class="text-gray-400">${escapeHTML(p.ovr)}</b></span>
      <button type="button" data-mover="${escapeHTML(id)}" data-a="${otro}" ${lleno ? 'disabled' : ''} class="cmp-mini" aria-label="Pasar ${escapeHTML(p.nombre)} al equipo ${otro.toUpperCase()}" title="${lleno ? 'El otro equipo está lleno' : `Pasar al equipo ${otro.toUpperCase()}`}"><i class="fa-solid fa-right-left"></i></button>
      <button type="button" data-quitar="${escapeHTML(id)}" class="cmp-mini" aria-label="Quitar a ${escapeHTML(p.nombre)}"><i class="fa-solid fa-xmark"></i></button></li>`; };
  const col = (side) => `<div><div class="label !mb-1" style="color:${COL[side]}">Equipo ${side.toUpperCase()} <span class="text-gray-500">(${teams[side].length}/${MAX_TEAM})</span></div>
    <ul class="space-y-1 min-h-[2rem]">${teams[side].map((id) => chip(id, side)).join('') || '<li class="text-[11px] text-gray-500 py-1">Vacío</li>'}</ul></div>`;

  function paint() {
    $('#cmp-teams').innerHTML = col('a') + col('b');
    const lleno = all().length >= MAX_COMPARE;
    addPicker.setDisabled(lleno, lleno ? 'Máximo 8 jugadores' : '+ Añadir jugador (escribe para buscar)…');
    $('#cmp-count').textContent = `${all().length}/${MAX_COMPARE}`;
    const body = $('#cmp-body');
    if (!all().length) { body.innerHTML = '<p class="text-center text-sm text-gray-400 py-8">Añade jugadores para compararlos.</p>'; return; }
    const A = teams.a.map((id) => byId.get(id)); const B = teams.b.map((id) => byId.get(id));
    const cols = [...A.map((p) => ({ p, side: 'a' })), ...B.map((p) => ({ p, side: 'b' }))];
    const listos = A.length && B.length;
    let resumen = '', radar = '', barras = '';
    if (listos) {
      const pa = teamProfile(A, STAT_KEYS); const pb = teamProfile(B, STAT_KEYS);
      const c = compareTeams(pa, pb, STAT_KEYS);
      const lider = c.wins.a === c.wins.b ? 'Igualados' : `Equipo ${c.wins.a > c.wins.b ? 'A' : 'B'} lidera`;
      resumen = `<div class="flex items-stretch gap-2">${teamHead('a', A, pa)}<span class="font-display text-gray-500 self-center">VS</span>${teamHead('b', B, pb)}</div>
        <div class="mt-3 text-center text-[12px] text-gray-300 rounded-lg bg-black/30 border border-galaxy-border py-2 px-2">
          <b style="color:${COL.a}">${c.wins.a}</b> a favor de A · <b style="color:${COL.b}">${c.wins.b}</b> a favor de B · ${c.wins.tie} empates — <b class="text-white">${lider}</b>
          ${c.ovr.diff ? `<span class="block text-[11px] text-gray-400">Media general: Equipo ${c.ovr.diff > 0 ? 'A' : 'B'} por ${Math.abs(c.ovr.diff)}</span>` : ''}
          ${A.length !== B.length ? `<span class="block text-[11px] text-gray-500">${A.length} vs ${B.length}: se comparan promedios por jugador, así es justo aunque no sean los mismos.</span>` : ''}
        </div>`;
      radar = radarSVG(pa, pb);
      barras = `<div class="divide-y divide-galaxy-border/40">${c.rows.map(rowHTML).join('')}</div>`;
    }
    const pendiente = '<p class="text-center text-sm text-gray-400 py-6">Pon al menos un jugador en cada equipo.</p>';
    const SECS = [
      { k: 'resumen', ico: 'fa-flag-checkered', t: 'Resumen', html: listos ? resumen : pendiente },
      { k: 'radar', ico: 'fa-bullseye', t: 'Radar', html: listos ? radar : pendiente },
      { k: 'barras', ico: 'fa-chart-simple', t: 'Estadísticas', html: listos ? barras : pendiente },
      { k: 'tabla', ico: 'fa-table', t: 'Tabla por jugador', html: matrixHTML(cols) },
    ];
    body.innerHTML = SECS.map((x) => `<section class="cmp-sec ${sec === x.k ? 'cmp-sec-on' : ''}">
        <button type="button" class="cmp-sec-h" data-sec="${x.k}" aria-expanded="${sec === x.k}"><span><i class="fa-solid ${x.ico} mr-2 text-galaxy-400"></i>${x.t}</span><i class="fa-solid fa-chevron-down cmp-chev"></i></button>
        ${sec === x.k ? `<div class="cmp-sec-b">${x.html}</div>` : ''}</section>`).join('');
  }

  // Buscador para añadir: escribe parte del nombre y elige; el jugador entra al equipo con menos integrantes.
  const addPicker = mountPicker($('#cmp-add'), { players, exclude: all, clearOnPick: true, placeholder: '+ Añadir jugador (escribe para buscar)…', onPick: (p) => {
    if (!p || all().length >= MAX_COMPARE) return;
    const side = teams.a.length <= teams.b.length ? 'a' : 'b';
    const dest = teams[side].length < MAX_TEAM ? side : (side === 'a' ? 'b' : 'a');
    teams = { ...teams, [dest]: [...teams[dest], p.id] }; paint();
  } });
  $('#cmp-teams').addEventListener('click', (e) => {
    const mv = e.target.closest('[data-mover]'); const q = e.target.closest('[data-quitar]');
    if (mv) teams = { ...teams, ...moveToTeam(teams, mv.dataset.mover, mv.dataset.a) };
    else if (q) teams = { a: teams.a.filter((x) => x !== q.dataset.quitar), b: teams.b.filter((x) => x !== q.dataset.quitar) };
    else return;
    paint();
  });
  $('#cmp-body').addEventListener('click', (e) => { const b = e.target.closest('[data-sec]'); if (b) { sec = sec === b.dataset.sec ? '' : b.dataset.sec; paint(); } });
  paint();
}

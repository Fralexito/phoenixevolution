// Comparador 1 vs 1: cabecera y resumen siempre visibles; radar, barras y perfil en pestañas (menos scroll).
// (La comparación de varios jugadores por equipos vive en compareMasivo.js.)
import { openModal, closeModal } from '../core/modal.js';
import { openCompareMasivo } from './compareMasivo.js';
import { escapeHTML, safeImg, statColor } from '../core/dom.js';
import { compareStats, axisPoint, radarPoints } from '../core/compare.js';
import { STAT_INFO } from '../../data/stats.js';
import { STAT_KEYS } from './playerCard.js';
import { mountPicker } from './playerPicker.js';
import { hayMovimientoReducido } from './ajustes.js';

const CA = '#00e5ff'; const CB = '#ff2d95';   // colores fijos: jugador A (cian) y jugador B (magenta)
const RADAR = { cx: 150, cy: 150, r: 100, min: 40, max: 99 };

function radarSVG(a, b, rows) {
  const n = STAT_KEYS.length;
  const rings = [60, 80, 99].map((v) => {
    const t = (v - RADAR.min) / (RADAR.max - RADAR.min);
    const pts = STAT_KEYS.map((_, i) => axisPoint(i, n, RADAR.cx, RADAR.cy, RADAR.r * t).map((x) => x.toFixed(1)).join(',')).join(' ');
    return `<polygon points="${pts}" fill="${v === 99 ? 'rgba(167,139,250,.05)' : 'none'}" stroke="rgba(167,139,250,${v === 99 ? .38 : .2})" stroke-width="1" ${v === 99 ? '' : 'stroke-dasharray="2 3"'}/>`;
  }).join('');
  const ganador = Object.fromEntries((rows ?? []).map((r) => [r.k, r.win]));
  const spokes = STAT_KEYS.map((k, i) => {
    const [x, y] = axisPoint(i, n, RADAR.cx, RADAR.cy, RADAR.r);
    const [lx, ly] = axisPoint(i, n, RADAR.cx, RADAR.cy, RADAR.r + 16);
    const col = ganador[k] === 'a' ? CA : ganador[k] === 'b' ? CB : '#9ca3af';   // la etiqueta toma el color de quien gana esa estadística
    return `<line x1="${RADAR.cx}" y1="${RADAR.cy}" x2="${x.toFixed(1)}" y2="${y.toFixed(1)}" stroke="rgba(167,139,250,.16)"/>
      <text x="${lx.toFixed(1)}" y="${ly.toFixed(1)}" fill="${col}" font-size="10" font-family="Rajdhani,sans-serif" font-weight="800" text-anchor="middle" dominant-baseline="middle">${k.toUpperCase()}</text>`;
  }).join('');
  const poly = (p, c, cls) => p ? `<polygon class="cmp-poly ${cls}" points="${radarPoints(p, STAT_KEYS, RADAR)}" fill="${c}" fill-opacity=".2" stroke="${c}" stroke-width="2.2" stroke-linejoin="round" style="color:${c}"/>` : '';
  const dots = (p, c, otro, lado) => !p ? '' : STAT_KEYS.map((k, i) => {
    const t = (Math.min(RADAR.max, Math.max(RADAR.min, Number(p[k]) || RADAR.min)) - RADAR.min) / (RADAR.max - RADAR.min);
    const [x, y] = axisPoint(i, n, RADAR.cx, RADAR.cy, RADAR.r * t); const gana = ganador[k] === lado;
    return `<circle class="cmp-dot" cx="${x.toFixed(1)}" cy="${y.toFixed(1)}" r="${gana ? 3.6 : 2.2}" fill="${c}" stroke="#05020f" stroke-width="1" style="animation-delay:${0.5 + i * 0.03}s"><title>${k.toUpperCase()}: ${escapeHTML(p.nombre)} ${Number(p[k]) || '—'} · ${escapeHTML(otro.nombre)} ${Number(otro[k]) || '—'}</title></circle>`;
  }).join('');
  return `<svg viewBox="0 0 300 300" role="img" aria-label="Radar comparativo de las 14 estadísticas" class="cmp-radar w-full max-w-[24rem] mx-auto">${rings}${spokes}${poly(a, CA, 'cmp-poly-a')}${poly(b, CB, 'cmp-poly-b')}${dots(a, CA, b, 'a')}${dots(b, CB, a, 'b')}</svg>
    <div class="flex justify-center gap-4 text-[11px] font-display font-bold uppercase tracking-wider"><span style="color:${CA}">● ${escapeHTML(a.nombre)}</span><span style="color:${CB}">● ${escapeHTML(b.nombre)}</span></div>
    <p class="text-[10px] text-gray-500 text-center mt-1">Escala 40–99 · el color de cada sigla indica quién gana esa estadística</p>`;
}

/** Tarjeta de «luchador»: foto con aura, media general grande, club/posición y su mejor estadística. `lider` la resalta con corona. */
function headCard(p, color, side, lider) {
  if (!p) return `<div class="flex-1 text-center text-xs text-gray-500 py-4">Elige un jugador</div>`;
  const img = safeImg(p.foto_url) || safeImg(p.foto);
  const mejor = STAT_KEYS.map((k) => [k, Number(p[k]) || 0]).sort((x, y) => y[1] - x[1])[0];
  return `<div class="cmp-fighter ${lider ? 'cmp-lider' : ''}" style="--c:${color}" data-side="${side}">
    ${lider ? '<span class="cmp-crown" title="Lidera el duelo"><i class="fa-solid fa-crown"></i></span>' : ''}
    <span class="cmp-photo">${img ? `<img src="${escapeHTML(img)}" alt="" class="w-full h-full object-cover object-top">` : `<i class="fa-solid fa-user-astronaut text-xl" style="color:${color}"></i>`}</span>
    <span class="cmp-ovr" data-count="${Number(p.ovr) || 0}">${escapeHTML(p.ovr ?? '--')}</span>
    <b class="cmp-name">${escapeHTML(p.nombre)}</b>
    <span class="cmp-sub">${escapeHTML(String(p.club ?? '').toUpperCase())} · ${escapeHTML(p.posicion)}</span>
    <span class="cmp-best" title="Su mejor estadística"><i class="fa-solid fa-bolt"></i> ${mejor[0].toUpperCase()} ${mejor[1]}</span>
  </div>`;
}

/** Marcador del duelo: cuántas estadísticas gana cada uno, como una tira que se reparte (cian · empates · magenta). */
function marcadorHTML(c, a, b, lider) {
  const total = Math.max(1, c.wins.a + c.wins.b + c.wins.tie); const pc = (v) => `${((v / total) * 100).toFixed(1)}%`;
  const ganador = c.wins.a === c.wins.b ? null : c.wins.a > c.wins.b ? { p: a, c: CA } : { p: b, c: CB };
  return `<div class="cmp-score">
    <div class="flex items-end justify-between gap-2">
      <span class="cmp-big" style="color:${CA}" data-count="${c.wins.a}">${c.wins.a}</span>
      <span class="text-[10px] text-gray-400 uppercase tracking-[0.25em] font-display pb-1 text-center">Duelo · ${total} estadísticas${c.wins.tie ? ` · ${c.wins.tie} empate${c.wins.tie === 1 ? '' : 's'}` : ''}</span>
      <span class="cmp-big" style="color:${CB}" data-count="${c.wins.b}">${c.wins.b}</span>
    </div>
    <div class="cmp-meter" role="img" aria-label="${c.wins.a} estadísticas a favor de ${escapeHTML(a.nombre)} y ${c.wins.b} a favor de ${escapeHTML(b.nombre)}"><i class="cmp-m-a" style="--w:${pc(c.wins.a)};--c:${CA}"></i><i class="cmp-m-t" style="--w:${pc(c.wins.tie)}"></i><i class="cmp-m-b" style="--w:${pc(c.wins.b)};--c:${CB}"></i><span class="cmp-m-spark"></span></div>
    <div class="cmp-verdict">${ganador ? `<i class="fa-solid fa-crown" style="color:${ganador.c}"></i> <b style="color:${ganador.c}">${escapeHTML(ganador.p.nombre)}</b> lidera el duelo` : '<i class="fa-solid fa-equals text-gray-400"></i> <b class="text-white">Duelo igualado</b>'}
      ${c.ovr.diff ? `<span class="block text-[11px] text-gray-400 font-normal mt-0.5">Media general: ${c.ovr.diff > 0 ? escapeHTML(a.nombre) : escapeHTML(b.nombre)} por ${Math.abs(c.ovr.diff)} punto${Math.abs(c.ovr.diff) === 1 ? '' : 's'}</span>` : ''}</div>
  </div>`;
}

function rowHTML(r, i = 0) {
  const info = STAT_INFO[r.k];
  const w = (v) => `${Math.round((v / 99) * 100)}%`;
  const cls = (me) => (r.win === me ? 'font-extrabold' : 'opacity-70');
  const barra = (v, c, gana, der) => `<div class="cmp-bar ${der ? '' : 'justify-end'}"><div class="cmp-fill ${gana ? 'cmp-gana' : ''}" style="--w:${w(v)};--c:${c};animation-delay:${i * 40}ms;opacity:${r.win && !gana ? .45 : 1}"></div></div>`;
  return `<div class="py-1.5">
    <div class="text-center text-[10px] text-gray-500 uppercase tracking-wider font-display" title="${escapeHTML(info.texto)}"><b class="text-gray-300">${r.k.toUpperCase()}</b> · ${escapeHTML(info.nombre)}${r.diff ? ` <span class="cmp-chip" style="color:${r.diff > 0 ? CA : CB};border-color:${r.diff > 0 ? CA : CB}66">${r.diff > 0 ? '◀' : ''} +${Math.abs(r.diff)} ${r.diff < 0 ? '▶' : ''}</span>` : ''}</div>
    <div class="flex items-center gap-2 mt-0.5">
      <span class="w-7 text-right font-display text-sm ${cls('a')}" style="color:${statColor(r.a)}">${r.a}</span>
      ${barra(r.a, CA, r.win === 'a', false)}${barra(r.b, CB, r.win === 'b', true)}
      <span class="w-7 font-display text-sm ${cls('b')}" style="color:${statColor(r.b)}">${r.b}</span>
    </div></div>`;
}

const textoJugador = (p, color) => p && (p.descripcion || p.quote) ? `<div class="flex-1 min-w-0 rounded-lg border bg-black/30 p-3" style="border-color:${color}55">
  <b class="font-display text-xs uppercase tracking-wider" style="color:${color}">${escapeHTML(p.nombre)}</b>
  ${p.quote ? `<p class="text-[12px] text-[#a78bfa] italic mt-1">"${escapeHTML(p.quote)}"</p>` : ''}
  ${p.descripcion ? `<p class="text-[12px] text-gray-300 leading-relaxed mt-1 whitespace-pre-line">${escapeHTML(p.descripcion)}</p>` : ''}</div>` : '';

/** Conteo animado de 0 al valor final en los números marcados con data-count (instantáneo si el usuario redujo las animaciones). */
function contar(raiz) {
  const els = [...raiz.querySelectorAll('[data-count]')];
  if (hayMovimientoReducido() || !window.requestAnimationFrame) return;
  const t0 = performance.now(); const DUR = 800;
  const paso = (t) => {
    const k = Math.min(1, (t - t0) / DUR); const e = 1 - (1 - k) ** 3;
    els.forEach((el) => { el.textContent = String(Math.round(Number(el.dataset.count) * e)); });
    if (k < 1 && els[0]?.isConnected) requestAnimationFrame(paso);
  };
  els.forEach((el) => { el.textContent = '0'; }); requestAnimationFrame(paso);
}

/** Abre el comparador. `players` = lista completa; `idA`/`idB` = jugadores preseleccionados (pueden faltar). */
export function openCompare(players, idA = null, idB = null, masivoIds = null) {
  if (masivoIds?.length > 2) { openCompareMasivo(players, masivoIds); return; }   // 3 o más marcados: directo a la masiva
  let a = players.find((p) => p.id === idA) ?? null;
  let b = players.find((p) => p.id === idB) ?? null;
  let tab = 'radar';   // 'radar' | 'barras' | 'perfil'
  let intro = true;    // la entrada animada (conteo, tira) solo corre cuando cambia la pareja, no al cambiar de pestaña

  const m = openModal(`
    <div class="p-5 sm:p-6 space-y-4">
      <div class="flex justify-between items-center">
        <h2 class="font-display font-bold text-2xl text-white uppercase tracking-widest"><i class="fa-solid fa-scale-balanced text-galaxy-400 mr-2"></i>Comparar</h2>
        <div class="flex items-center gap-3">
          <button type="button" id="cmp-ir-masivo" class="text-[11px] text-gray-400 hover:text-white font-display font-bold uppercase tracking-wider" title="Comparar hasta 8 jugadores en dos equipos"><i class="fa-solid fa-people-group mr-1"></i>Masiva</button>
        <button type="button" data-close aria-label="Cerrar" class="text-gray-500 hover:text-white"><i class="fa-solid fa-xmark text-xl"></i></button>
        </div>
      </div>
      <div class="grid grid-cols-2 gap-2">
        <div><label class="label" for="cmp-a-in" style="color:${CA}">Jugador A</label><div id="cmp-a"></div></div>
        <div><label class="label" for="cmp-b-in" style="color:${CB}">Jugador B</label><div id="cmp-b"></div></div>
      </div>
      <div id="cmp-body" aria-live="polite"></div>
    </div>`, { id: 'compare-modal', wide: true });

  m.querySelector('#cmp-ir-masivo').addEventListener('click', () => { closeModal('compare-modal'); openCompareMasivo(players, [a?.id, b?.id].filter(Boolean)); });
  const body = m.querySelector('#cmp-body');
  const paint = () => {
    if (!a || !b) { body.innerHTML = `<p class="text-center text-sm text-gray-400 py-10">Elige dos jugadores para compararlos.</p>`; return; }
    if (a.id === b.id) { body.innerHTML = `<p class="text-center text-sm text-warn py-10">Elige dos jugadores distintos.</p>`; return; }
    const c = compareStats(a, b, STAT_KEYS);
    const perfil = [a, b].some((p) => p.descripcion || p.quote);
    if (tab === 'perfil' && !perfil) tab = 'radar';
    const lider = c.wins.a === c.wins.b ? 'Igualados' : c.wins.a > c.wins.b ? `${escapeHTML(a.nombre)} lidera` : `${escapeHTML(b.nombre)} lidera`;
    const lA = c.wins.a > c.wins.b; const lB = c.wins.b > c.wins.a;
    body.innerHTML = `
      <div class="cmp-intro${intro ? ' cmp-anim' : ''}">
        <div class="grid grid-cols-[minmax(0,1fr)_auto_minmax(0,1fr)] items-stretch gap-1.5 sm:gap-3">${headCard(a, CA, 'a', lA)}<div class="cmp-vs-wrap"><span class="cmp-vs">VS</span></div>${headCard(b, CB, 'b', lB)}</div>
        ${marcadorHTML(c, a, b)}
      </div>
      <div class="seg mt-3" id="cmp-tabs" role="group" aria-label="Vista">
        <button type="button" data-t="radar" aria-pressed="${tab === 'radar'}">Radar</button>
        <button type="button" data-t="barras" aria-pressed="${tab === 'barras'}">Estadísticas</button>
        ${perfil ? `<button type="button" data-t="perfil" aria-pressed="${tab === 'perfil'}">Perfil</button>` : ''}
      </div>
      <div class="mt-3 cmp-tab-in">${tab === 'radar' ? radarSVG(a, b, c.rows) : tab === 'barras' ? `<div class="divide-y divide-galaxy-border/40">${c.rows.map(rowHTML).join('')}</div>` : `<div class="flex flex-col sm:flex-row gap-2">${textoJugador(a, CA)}${textoJugador(b, CB)}</div>`}</div>`;
    body.querySelectorAll('#cmp-tabs button').forEach((x) => x.addEventListener('click', () => { tab = x.dataset.t; intro = false; paint(); }));
    if (intro) contar(body);
    intro = false;
  };
  // Cada selector se puede escribir para buscar por nombre; no ofrece al jugador que ya está en el otro lado.
  mountPicker(m.querySelector('#cmp-a'), { players, selected: a, exclude: () => (b ? [b.id] : []), color: CA, placeholder: 'Buscar por nombre…', onPick: (p) => { a = p; intro = true; paint(); } });
  mountPicker(m.querySelector('#cmp-b'), { players, selected: b, exclude: () => (a ? [a.id] : []), color: CB, placeholder: 'Buscar por nombre…', onPick: (p) => { b = p; intro = true; paint(); } });
  paint();
}

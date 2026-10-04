// Panel de BÚSQUEDA AVANZADA (dinámica): eliges una o varias stats y la lista se reordena al instante por su promedio.
// Estado: { keys: ['men','pot'], min: 0, top: 10 }. El cálculo está en core/ranking.js; aquí solo se dibuja y se avisa con onChange(estado).
import { escapeHTML } from '../core/dom.js';
import { STAT_INFO } from '../../data/stats.js';
import { STAT_KEYS } from './playerCard.js';

const TOPS = [3, 5, 10, null];   // null = todos
export const estadoVacio = () => ({ keys: [], min: 0, top: 10 });
const nombre = (k) => (k === 'ovr' ? 'Media general' : STAT_INFO[k].nombre);

export function mountAdvanced(box, onChange) {
  const st = estadoVacio();
  box.innerHTML = `
    <div class="glass-panel rounded-xl p-2.5 sm:p-3 space-y-2 max-w-xl ml-auto">
      <div class="flex items-center justify-between gap-2">
        <h2 class="font-display font-bold text-xs text-white uppercase tracking-widest" title="Toca una o varias stats: la lista se ordena por el promedio de las elegidas."><i class="fa-solid fa-sliders text-galaxy-400 mr-1.5"></i>Búsqueda avanzada</h2>
        <button type="button" id="adv-limpiar" class="text-[10px] text-gray-400 hover:text-white font-bold uppercase px-1 min-h-7">Limpiar</button>
      </div>
      <div id="adv-chips" class="flex flex-wrap gap-1" role="group" aria-label="Stats a buscar">
        ${['ovr', ...STAT_KEYS].map((k) => `<button type="button" data-k="${k}" aria-pressed="false" title="${escapeHTML(nombre(k))}" class="adv-chip">${k === 'ovr' ? 'MEDIA' : k.toUpperCase()}</button>`).join('')}
      </div>
      <div class="flex items-center gap-2.5">
        <label class="text-[10px] font-display font-bold uppercase tracking-wider text-gray-400 shrink-0" for="adv-min">Mín. <b id="adv-min-v" class="text-white">0</b></label>
        <input id="adv-min" type="range" class="stat-range flex-1 min-w-0" min="0" max="99" step="1" value="0" style="--p:0%;--c:#00e5ff" aria-label="Mínimo en cada stat">
        <div class="seg adv-seg shrink-0" id="adv-top" role="group" aria-label="Cuántos mostrar">${TOPS.map((t) => `<button type="button" data-t="${t ?? ''}" aria-pressed="${t === st.top}">${t ? t : 'Todos'}</button>`).join('')}</div>
      </div>
      <p id="adv-sum" class="text-[11px] text-galaxy-400 leading-snug"></p>
    </div>`;
  const $ = (s) => box.querySelector(s);
  const sumar = () => { $('#adv-sum').textContent = st.keys.length ? `Ordenando por: ${st.keys.map(nombre).join(' + ')}${st.min ? ` · cada una ≥ ${st.min}` : ''}` : 'Elige una o más stats (promedio de las elegidas).'; };
  const avisar = () => { sumar(); onChange(st.keys.length ? { ...st, keys: [...st.keys] } : null); };

  $('#adv-chips').addEventListener('click', (e) => {
    const b = e.target.closest('button[data-k]'); if (!b) return;
    const k = b.dataset.k; const i = st.keys.indexOf(k); if (i >= 0) st.keys.splice(i, 1); else st.keys.push(k);
    b.setAttribute('aria-pressed', String(i < 0)); avisar();
  });
  $('#adv-min').addEventListener('input', (e) => { st.min = Number(e.target.value); $('#adv-min-v').textContent = String(st.min); e.target.style.setProperty('--p', `${Math.round(st.min / 99 * 100)}%`); avisar(); });
  $('#adv-top').addEventListener('click', (e) => {
    const b = e.target.closest('button[data-t]'); if (!b) return;
    st.top = b.dataset.t ? Number(b.dataset.t) : null; $('#adv-top').querySelectorAll('button').forEach((x) => x.setAttribute('aria-pressed', String(x === b))); avisar();
  });
  $('#adv-limpiar').addEventListener('click', () => {
    Object.assign(st, estadoVacio(), { keys: [] });
    box.querySelectorAll('#adv-chips button').forEach((x) => x.setAttribute('aria-pressed', 'false'));
    $('#adv-min').value = '0'; $('#adv-min').style.setProperty('--p', '0%'); $('#adv-min-v').textContent = '0';
    $('#adv-top').querySelectorAll('button').forEach((x) => x.setAttribute('aria-pressed', String(x.dataset.t === String(st.top)))); avisar();
  });
  sumar();
}

// Leyenda de estadísticas: ventana con el nombre completo y el significado de cada stat (lee de data/stats.js).
import { openModal, closeModal } from '../core/modal.js';
import { escapeHTML } from '../core/dom.js';
import { STAT_INFO } from '../../data/stats.js';

const ID = 'stat-legend';
export function openStatLegend() {
  const filas = Object.entries(STAT_INFO).map(([k, i]) => `
    <div class="px-3 py-2"><b class="font-display text-xs uppercase tracking-wider text-galaxy-400">${k === 'ovr' ? 'OVR' : k} · ${escapeHTML(i.nombre)}</b><span class="block text-[12px] text-gray-300 leading-snug">${escapeHTML(i.texto)}</span></div>`).join('');
  openModal(`
    <div class="p-5 space-y-3">
      <div class="flex justify-between items-center">
        <h2 class="font-display font-bold text-xl text-white uppercase tracking-wider"><i class="fa-solid fa-circle-info text-galaxy-400 mr-2"></i>Leyenda de stats</h2>
        <button type="button" data-close aria-label="Cerrar" class="text-gray-500 hover:text-white"><i class="fa-solid fa-xmark text-xl"></i></button>
      </div>
      <div class="rounded-lg border border-galaxy-border bg-black/30 divide-y divide-galaxy-border/60 max-h-[65vh] overflow-y-auto">${filas}</div>
    </div>`, { id: ID });
}
export const closeStatLegend = () => closeModal(ID);

// Tarjeta de jugador estilo FUT, compartida por Central y Base de Datos.
import { escapeHTML, safeImg, stat, statColor } from '../core/dom.js';
import { posInfo } from '../../data/posiciones.js';
import { ratioDe } from '../core/crop.js';

export const STAT_KEYS = ['atq', 'fin', 'pot', 'efe', 'reg', 'cor', 'cre', 'def', 'pre', 'pos', 'ant', 'pas', 'rit', 'men'];
const GLOWS = [
  'hover:shadow-[0_0_35px_rgba(255,215,0,0.5)] hover:border-[#ffd700]/70',
  'hover:shadow-[0_0_35px_rgba(0,229,255,0.5)] hover:border-[#00e5ff]/70',
  'hover:shadow-[0_0_35px_rgba(255,0,128,0.5)] hover:border-[#ff0080]/70',
];

export function playerCardHTML(p, index = 0, { wide = false } = {}) {
  const img = safeImg(p.foto_url) || safeImg(p.foto);
  // La foto ocupa la parte alta de la tarjeta (formato 5:4, enfocada arriba para que se vea la cara).
  const foto = img
    ? `<img src="${escapeHTML(img)}" alt="${escapeHTML(p.nombre)}" loading="lazy" class="w-full h-full object-cover object-top">`
    : `<div class="w-full h-full flex items-center justify-center bg-gradient-to-br from-galaxy-600/30 via-galaxy-900 to-galaxy-deep"><i class="fa-solid fa-user-astronaut text-6xl text-galaxy-400/40"></i></div>`;
  const pos = posInfo(p.posicion);
  const stats = STAT_KEYS.map((k) => {
    const v = stat(p[k]);
    return `<div class="flex justify-between items-center"><span class="text-gray-400 font-bold uppercase text-[10px]">${k.toUpperCase()}</span><span style="color:${statColor(v)}" class="font-bold">${v}</span></div>`;
  }).join('');
  const size = wide ? 'w-full sm:w-[calc(50%-12px)] lg:w-[calc(33.333%-16px)] xl:w-[calc(25%-18px)]' : 'w-full';
  return `
  <article class="${size} relative rounded-xl overflow-hidden bg-gradient-to-b from-galaxy-900/90 via-galaxy-panel to-galaxy-deep border border-galaxy-600/40 shadow-[0_0_25px_rgba(128,0,255,0.25)] ${GLOWS[index % GLOWS.length]} transition-all duration-300 flex flex-col justify-between">
    <div>
      <div data-foto-caja style="aspect-ratio:${ratioDe(p.foto_aspecto)}" class="relative bg-black/40 overflow-hidden">
        ${foto}
        <div class="absolute inset-x-0 bottom-0 h-2/3 bg-gradient-to-t from-galaxy-deep via-galaxy-deep/60 to-transparent pointer-events-none"></div>
        <div class="absolute top-0 left-0 right-0 h-[2px] bg-gradient-to-r from-transparent via-galaxy-400 to-transparent opacity-60"></div>
        <div class="absolute left-4 bottom-2 flex items-end gap-2.5">
          <span class="text-4xl font-display font-extrabold text-white tracking-tighter text-shadow-glow leading-none">${stat(p.ovr, 0) || '--'}</span>
          <span title="${escapeHTML(pos.nombre)}" style="color:${pos.color};border-color:${pos.color}66;background:${pos.color}26" class="text-[11px] font-display font-bold uppercase tracking-widest px-2 py-0.5 rounded border mb-0.5">${escapeHTML(p.posicion)}</span>
        </div>
      </div>
      <div class="px-4 pt-2 pb-4">
        <div class="border-b border-galaxy-border/80 pb-3">
          <h3 class="text-lg font-display font-bold text-white uppercase tracking-wider truncate">${escapeHTML(p.nombre)}</h3>
          <div class="flex items-center gap-1.5 text-[11px] text-gray-300 mt-1"><i class="fa-solid fa-shield-halved text-galaxy-400 text-[10px]"></i><span class="truncate">${escapeHTML(p.club)}</span></div>
        </div>
        <div class="mt-3 grid grid-cols-2 gap-x-4 gap-y-2 bg-black/40 p-3 rounded-lg border border-galaxy-border/60 text-xs">${stats}</div>
      </div>
    </div>
    ${p.quote ? `<div class="border-t border-galaxy-border mx-4 mb-4 pt-2.5"><p class="text-[11px] text-[#a78bfa] italic leading-relaxed line-clamp-2">"${escapeHTML(p.quote)}"</p></div>` : ''}
  </article>`;
}

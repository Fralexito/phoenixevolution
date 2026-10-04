// Tarjeta de jugador estilo FUT, compartida por Central y Base de Datos.
import { escapeHTML, safeImg, stat, statColor } from '../core/dom.js';
import { posInfo } from '../../data/posiciones.js';
import { ratioDe } from '../core/crop.js';
import { fisicoPartes } from '../core/fisico.js';

export const STAT_KEYS = ['atq', 'fin', 'pot', 'efe', 'reg', 'cor', 'cre', 'def', 'pre', 'pos', 'ant', 'pas', 'rit', 'men'];
const GLOWS = [
  'hover:shadow-[0_0_35px_rgba(255,215,0,0.5)] hover:border-[#ffd700]/70',
  'hover:shadow-[0_0_35px_rgba(0,229,255,0.5)] hover:border-[#00e5ff]/70',
  'hover:shadow-[0_0_35px_rgba(255,0,128,0.5)] hover:border-[#ff0080]/70',
];

/** Fila visible con altura y pie dominante (solo lo que exista). */
function fisicoHTML(p) {
  const x = fisicoPartes(p); if (!x.length) return '';
  const ico = { altura: 'fa-ruler-vertical', pie: 'fa-shoe-prints' };
  return `<div class="pc-fis">${x.map((i) => `<span class="pc-chip" title="${escapeHTML(i.titulo)}"><i class="fa-solid ${ico[i.k]}"></i>${escapeHTML(i.texto)}</span>`).join('')}</div>`;
}

export function playerCardHTML(p, index = 0, { wide = false, sizeClass = '' } = {}) {
  const img = safeImg(p.foto_url) || safeImg(p.foto);
  // La foto ocupa la parte alta de la tarjeta (formato 5:4, enfocada arriba para que se vea la cara).
  const foto = img
    ? `<img src="${escapeHTML(img)}" alt="${escapeHTML(p.nombre)}" loading="lazy" class="w-full h-full object-cover object-top">`
    : `<div class="w-full h-full flex items-center justify-center bg-gradient-to-br from-galaxy-600/30 via-galaxy-900 to-galaxy-deep"><i class="fa-solid fa-user-astronaut text-6xl text-galaxy-400/40"></i></div>`;
  const pos = posInfo(p.posicion);
  const stats = STAT_KEYS.map((k) => {
    const v = stat(p[k]);
    return `<div class="flex justify-between items-center"><span class="pc-k">${k.toUpperCase()}</span><span style="color:${statColor(v)}" class="font-bold">${v}</span></div>`;
  }).join('');
  const size = sizeClass || (wide ? 'w-[calc(50%-6px)] sm:w-[calc(50%-12px)] lg:w-[calc(33.333%-16px)] xl:w-[calc(25%-18px)]' : 'w-full');
  // La foto es una CAPA detrás de todo (proporción elegida). Un separador 5:4 reserva la zona de la foto y el contenido va encima:
  // con proporción «larga» la foto baja por detrás del nombre y las estadísticas sin agrandar la tarjeta.
  return `
  <article class="${size} relative rounded-xl overflow-hidden bg-gradient-to-b from-galaxy-900/90 via-galaxy-panel to-galaxy-deep border border-galaxy-600/40 shadow-[0_0_25px_rgba(128,0,255,0.25)] ${GLOWS[index % GLOWS.length]} transition-all duration-300 flex flex-col justify-between pc">
    <div data-foto-caja style="aspect-ratio:${ratioDe(p.foto_aspecto)}" class="absolute inset-x-0 top-0 bg-black/40 overflow-hidden">
      ${foto}
      <div class="absolute inset-x-0 bottom-0 h-[62%] bg-gradient-to-t from-galaxy-deep via-galaxy-deep/70 to-transparent pointer-events-none"></div>
    </div>
    <div class="absolute top-0 left-0 right-0 h-[2px] bg-gradient-to-r from-transparent via-galaxy-400 to-transparent opacity-60 z-10"></div>
    <div class="pc-in relative z-10">
      <div class="relative" style="aspect-ratio:1.25">
        <div class="pc-badges">
          <span class="pc-ovr text-shadow-glow">${stat(p.ovr, 0) || '--'}</span>
          <span title="${escapeHTML(pos.nombre)}" style="color:${pos.color};border-color:${pos.color}66;background:${pos.color}26" class="pc-pos">${escapeHTML(p.posicion)}</span>
        </div>
      </div>
      <div class="pc-info">
        <div class="pc-head">
          <h3 class="pc-name">${escapeHTML(p.nombre)}${p.apodo ? ` <span class="pc-apodo">«${escapeHTML(p.apodo)}»</span>` : ''}</h3>
          <div class="pc-club"><i class="fa-solid fa-shield-halved text-galaxy-400"></i><span class="truncate">${escapeHTML(p.club)}</span></div>
        </div>
        ${fisicoHTML(p)}
        <div class="pc-stats">${stats}</div>
      </div>
      ${p.quote ? `<div class="pc-quote"><p>"${escapeHTML(p.quote)}"</p></div>` : ''}
    </div>
  </article>`;
}

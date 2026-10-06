// Pie de acciones de una publicación en el feed de /social/: reaccionar (un toque + paleta), responder (lleva al hilo) y compartir.
// Se pasa a `tarjetaComunidadHTML(it, { pie })`. Solo HTML: los clics los reparte pages/social.js mediante `data-sx`.
import { escapeHTML } from '../../core/dom.js';
import { href } from '../../core/config.js';
import { resumenReacciones } from '../../core/muro.js';
import { PALETA_EMOJIS } from '../../../data/muroEstilo.js';
import { REACCION_RAPIDA, totalReacciones, textoRespuestas } from '../../core/feedSocial.js';

const PALETA_RAPIDA = PALETA_EMOJIS.slice(0, 16);

/** @param {object} it publicación (con `mia` si ya se cruzó con mis reacciones) @param {{paleta?: boolean}} o `paleta`: ¿está abierta la paleta de esta publicación? */
export function pieSocialHTML(it, { paleta = false } = {}) {
  const id = Number(it.id); const mia = it.mia ?? null; const total = totalReacciones(it);
  const resumen = resumenReacciones(it.reacciones).slice(0, 4).map((x) => `<span class="rx"><span>${escapeHTML(x.tipo)}</span></span>`).join('');
  const usuario = String(it.autor?.username ?? '');
  const hilo = `${href('perfil/')}?u=${encodeURIComponent(usuario)}#p-${id}`;
  return `<div class="mt-3" role="group" aria-label="Acciones de la publicación" data-pie="${id}">
    ${total ? `<p class="flex items-center gap-1.5 text-[11px] text-gray-400 pb-2 border-b border-galaxy-border/60">${resumen}<b class="text-gray-300">${total}</b></p>` : '<div class="border-t border-galaxy-border/60"></div>'}
    <div class="grid grid-cols-3 gap-1 pt-1.5">
      <button type="button" data-sx="reaccionar" data-id="${id}" aria-pressed="${mia ? 'true' : 'false'}" aria-label="${mia ? 'Quitar mi reacción' : 'Reaccionar con fuego'}" class="sx-btn ${mia ? 'is-on' : ''}"><span aria-hidden="true">${escapeHTML(mia ?? REACCION_RAPIDA)}</span><span>${mia ? 'Reaccionaste' : 'Reaccionar'}</span></button>
      <a href="${escapeHTML(hilo)}" class="sx-btn"><i class="fa-regular fa-comment" aria-hidden="true"></i><span>${textoRespuestas(it.respuestas)}</span></a>
      <button type="button" data-sx="compartir" data-id="${id}" data-user="${escapeHTML(usuario)}" class="sx-btn"><i class="fa-solid fa-share-nodes" aria-hidden="true"></i><span>Compartir</span></button>
    </div>
    <div class="flex items-center justify-end pt-0.5"><button type="button" data-sx="paleta" data-id="${id}" aria-expanded="${paleta}" class="text-[11px] text-gray-500 hover:text-galaxy-400 px-1.5 min-h-8">${paleta ? 'Cerrar emojis' : 'Más emojis'} <i class="fa-solid fa-face-smile ml-0.5" aria-hidden="true"></i></button></div>
    ${paleta ? `<div class="p-2 rounded-xl border border-galaxy-border bg-black/40 grid grid-cols-8 gap-1" role="group" aria-label="Elige un emoji">${PALETA_RAPIDA.map((e) => `<button type="button" data-sx="emoji" data-id="${id}" data-tipo="${escapeHTML(e)}" aria-pressed="${e === mia}" class="h-9 rounded-lg text-lg hover:bg-galaxy-600/30 aria-pressed:bg-galaxy-600/40">${escapeHTML(e)}</button>`).join('')}</div>` : ''}
  </div>`;
}

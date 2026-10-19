// Pie de acciones de una publicación en el feed de /social/: reaccionar (un toque + paleta), responder (lleva al hilo) y compartir.
// Se pasa a `tarjetaComunidadHTML(it, { pie })`. Solo HTML: los clics los reparte pages/social.js mediante `data-sx`.
// 19-oct-2026 (Fralex: «que el muro no se vea tan cargado… minimalista pero completo»): UNA sola fila — reaccionar · más emojis ·
// respuestas · compartir y, a la derecha, el resumen de reacciones. Antes eran tres filas (resumen, botones y «Más emojis»).
import { escapeHTML } from '../../core/sistema/dom.js';
import { href } from '../../core/sistema/config.js';
import { resumenReacciones } from '../../core/comunidad/muro.js';
import { PALETA_EMOJIS } from '../../../data/muroEstilo.js';
import { REACCION_RAPIDA, totalReacciones, textoRespuestas } from '../../core/comunidad/feedSocial.js';

// Reacciones con identidad Phoenix (19-oct-2026): van primero y con su nombre; debajo, el resto de emojis. La BD acepta cualquier emoji.
export const REACCIONES_PHX = [['🔥', 'Fuego'], ['⚽', 'Golazo'], ['🧤', 'Atajada'], ['🤝', 'GG'], ['🐐', 'Crack'], ['😂', 'Risa']];
const PALETA_RAPIDA = PALETA_EMOJIS.filter((e) => !REACCIONES_PHX.some(([x]) => x === e)).slice(0, 16);

/** @param {object} it publicación (con `mia` si ya se cruzó con mis reacciones) @param {{paleta?: boolean}} o `paleta`: ¿está abierta la paleta de esta publicación? */
export function pieSocialHTML(it, { paleta = false } = {}) {
  const id = Number(it.id); const mia = it.mia ?? null; const total = totalReacciones(it); const n = Math.max(0, Math.trunc(Number(it.respuestas) || 0));
  const resumen = resumenReacciones(it.reacciones).slice(0, 3).map((x) => `<span>${escapeHTML(x.tipo)}</span>`).join('');
  const usuario = String(it.autor?.username ?? '');
  const hilo = `${href('perfil/')}?u=${encodeURIComponent(usuario)}#p-${id}`;
  return `<div class="sx-pie" role="group" aria-label="Acciones de la publicación" data-pie="${id}">
    <div class="sx-pie-fila">
      <button type="button" data-sx="reaccionar" data-id="${id}" aria-pressed="${mia ? 'true' : 'false'}" aria-label="${mia ? 'Quitar mi reacción' : 'Reaccionar con fuego'}" class="sx-btn sx-rx ${mia ? 'is-on' : ''}"><span aria-hidden="true">${escapeHTML(mia ?? REACCION_RAPIDA)}</span><span class="sx-btn-tx">${mia ? 'Reaccionaste' : 'Reaccionar'}</span></button>
      <button type="button" data-sx="paleta" data-id="${id}" aria-expanded="${paleta}" aria-label="${paleta ? 'Cerrar reacciones' : 'Más reacciones (o mantén pulsado Reaccionar)'}" title="${paleta ? 'Cerrar reacciones' : 'Más reacciones (o mantén pulsado Reaccionar)'}" class="sx-btn sx-ico"><i class="fa-solid ${paleta ? 'fa-xmark' : 'fa-face-smile'}" aria-hidden="true"></i></button>
      <a href="${escapeHTML(hilo)}" class="sx-btn" aria-label="${escapeHTML(textoRespuestas(n))}" title="${escapeHTML(textoRespuestas(n))}"><i class="fa-regular fa-comment" aria-hidden="true"></i>${n ? `<span>${n}</span>` : ''}</a>
      <button type="button" data-sx="compartir" data-id="${id}" data-user="${escapeHTML(usuario)}" aria-label="Compartir" title="Compartir" class="sx-btn sx-ico"><i class="fa-solid fa-share-nodes" aria-hidden="true"></i></button>
      ${total ? `<span class="sx-pie-total" aria-label="${total} reacciones"><span class="sx-pie-emojis" aria-hidden="true">${resumen}</span><b>${total}</b></span>` : ''}
    </div>
    ${paleta ? `<div class="sx-paleta" role="group" aria-label="Elige cómo reaccionar"><div class="sx-rx-phx">${REACCIONES_PHX.map(([e, n], k) => `<button type="button" data-sx="emoji" data-id="${id}" data-tipo="${e}" aria-pressed="${e === mia}" style="--k:${k}"><span aria-hidden="true">${e}</span><small>${n}</small></button>`).join('')}</div><div class="sx-rx-mas">${PALETA_RAPIDA.map((e) => `<button type="button" data-sx="emoji" data-id="${id}" data-tipo="${escapeHTML(e)}" aria-pressed="${e === mia}">${escapeHTML(e)}</button>`).join('')}</div></div>` : ''}
  </div>`;
}

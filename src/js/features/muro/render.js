// HTML compartido del muro (lo usan /perfil/ y la pestaña «Muro» de la ficha del jugador): fotos, video y tarjeta de duelo.
// Todo dato del usuario o de la BD pasa por escapeHTML / safeImg / analizarVideo. Sin acceso a red.
import { escapeHTML, safeImg } from '../../core/dom.js';
import { href } from '../../core/config.js';
import { analizarVideo, PROVEEDOR_ETIQUETA, resumenReto, tiempoRelativo, textoAHTML } from '../../core/muro.js';

const nombreLink = (p) => (p?.username ? `<a href="${escapeHTML(href('perfil/'))}?u=${escapeHTML(p.username)}" class="font-bold text-white hover:text-galaxy-400">${escapeHTML(p.nombre)}</a>` : `<b class="text-white">${escapeHTML(p?.nombre ?? 'Por definir')}</b>`);

/** Tarjeta del duelo adjunto: «A vs B», formato, plataforma, estado y fecha. Es información verificada por el servidor (no la escribe el autor). */
export function retoHTML(reto) {
  const r = resumenReto(reto); if (!r) return '';
  const f = r.fecha ? new Date(r.fecha) : null;
  const cuando = f && !Number.isNaN(f.getTime()) ? f.toLocaleDateString('es-PE', { day: 'numeric', month: 'short', year: 'numeric' }) : '';
  const tono = r.estado === 'FINALIZADO' ? 'text-gray-300 border-galaxy-border' : 'text-ok border-ok/40 bg-ok/10';
  return `<div class="mt-2 rounded-xl border border-galaxy-400/30 bg-galaxy-600/10 p-3">
    <p class="text-[10px] uppercase tracking-widest text-galaxy-400 font-display font-bold mb-1.5"><i class="fa-solid fa-circle-check mr-1"></i>Duelo verificado</p>
    <p class="text-sm flex flex-wrap items-center gap-x-2"><i class="fa-solid fa-gamepad text-galaxy-400"></i>${nombreLink(r.retador)}<span class="text-gray-500 text-xs">vs</span>${nombreLink(r.rival)}</p>
    <div class="mt-2 flex flex-wrap gap-1.5 text-[11px]">
      <span class="rounded-full border border-amber-400/40 bg-amber-400/10 text-amber-300 px-2 py-0.5">${escapeHTML(r.formato)}</span>
      ${r.plataforma ? `<span class="rounded-full border border-galaxy-border text-gray-300 px-2 py-0.5">${escapeHTML(r.plataforma)}</span>` : ''}
      <span class="rounded-full border px-2 py-0.5 ${tono}">${escapeHTML(r.etiquetaEstado)}</span>
      ${cuando ? `<span class="text-gray-500 px-1 py-0.5">${escapeHTML(cuando)}</span>` : ''}</div></div>`;
}

/** Foto y/o video de una publicación. YouTube: miniatura que carga el reproductor al tocarla (no se carga nada de YouTube hasta que quieras). Resto: tarjeta con enlace. */
export function mediosHTML(it) {
  const img = safeImg(it.imagen_url) ? `<a href="${escapeHTML(safeImg(it.imagen_url))}" target="_blank" rel="noopener noreferrer" class="block mt-2"><img src="${escapeHTML(safeImg(it.imagen_url))}" alt="Foto de la publicación" loading="lazy" referrerpolicy="no-referrer" class="rounded-xl w-full max-h-[28rem] object-cover border border-galaxy-border"></a>` : '';
  const v = it.video_url ? analizarVideo(it.video_url) : null;
  let vid = '';
  if (v?.ok && v.proveedor === 'youtube') {
    vid = `<button type="button" data-act="video-yt" data-yt="${escapeHTML(v.id)}" aria-label="Reproducir video de YouTube" class="relative block w-full mt-2 rounded-xl overflow-hidden border border-galaxy-border aspect-video bg-black group">
      <img src="https://i.ytimg.com/vi/${escapeHTML(v.id)}/hqdefault.jpg" alt="" loading="lazy" referrerpolicy="no-referrer" class="w-full h-full object-cover opacity-80 group-hover:opacity-100">
      <span class="absolute inset-0 flex items-center justify-center"><i class="fa-solid fa-circle-play text-5xl text-white drop-shadow"></i></span></button>`;
  } else if (v?.ok) {
    const ico = { tiktok: 'fa-brands fa-tiktok', twitch: 'fa-brands fa-twitch', kick: 'fa-solid fa-play' }[v.proveedor];
    vid = `<a href="${escapeHTML(v.url)}" target="_blank" rel="noopener noreferrer nofollow" class="mt-2 flex items-center gap-3 rounded-xl border border-galaxy-border bg-black/30 px-3 py-3 hover:border-galaxy-400"><i class="${ico} text-xl text-galaxy-400"></i><span class="text-sm text-white">Ver en ${PROVEEDOR_ETIQUETA[v.proveedor]}</span><i class="fa-solid fa-arrow-up-right-from-square ml-auto text-xs text-gray-500"></i></a>`;
  }
  return img + vid;
}

/** Todo el contenido de una publicación (texto + foto + video + duelo). */
export const contenidoHTML = (it) => `${it.texto ? `<p class="text-sm text-gray-100 leading-relaxed">${textoAHTML(it.texto)}</p>` : ''}${mediosHTML(it)}${retoHTML(it.reto)}`;

/** Reproductor de YouTube que reemplaza a la miniatura (solo ids válidos de 11 caracteres). */
export function reproductorYT(el) {
  const id = /^[A-Za-z0-9_-]{11}$/.test(el.dataset.yt) ? el.dataset.yt : ''; if (!id) return;
  el.outerHTML = `<div class="mt-2 rounded-xl overflow-hidden border border-galaxy-border aspect-video"><iframe src="https://www.youtube-nocookie.com/embed/${id}?autoplay=1" title="Video de YouTube" allow="autoplay; encrypted-media; picture-in-picture" allowfullscreen referrerpolicy="strict-origin-when-cross-origin" class="w-full h-full"></iframe></div>`;
}

/** Versión compacta para la ficha del jugador: últimas publicaciones, solo lectura (reacciones/respuestas están en el muro completo). */
export function muroCompactoHTML(items, { urlMuro = '', nombre = 'este jugador' } = {}) {
  const lista = items.length
    ? items.map((it) => `<article class="rounded-xl border border-galaxy-border/60 bg-black/25 p-3"><p class="text-[11px] text-gray-500 mb-1">${it.fijada ? '<i class="fa-solid fa-thumbtack text-galaxy-400 mr-1"></i>' : ''}${tiempoRelativo(it.created_at)}</p>${contenidoHTML(it)}</article>`).join('')
    : `<p class="text-sm text-gray-500">${escapeHTML(nombre)} todavía no ha publicado nada.</p>`;
  return `<div class="space-y-3">${lista}${urlMuro ? `<a href="${escapeHTML(urlMuro)}" class="btn btn-ghost w-full !text-xs"><i class="fa-solid fa-newspaper"></i><span>Ver el muro completo</span></a>` : ''}</div>`;
}

// Tarjeta de publicación «de comunidad» (autor + contenido + reacciones + enlace a su muro). La usan /comunidad/, /guardados/ y /buscar/.
// Recibe un ítem con el formato de `muro_comunidad` (también lo devuelven `guardados_listar` y `buscar_publicaciones`).
// Los botones llevan data-atributos; cada página reparte los clics (guardar → features/social/guardados.js, reportar/ocultar → features/moderacion/acciones.js).
import { escapeHTML } from '../../core/dom.js';
import { href } from '../../core/config.js';
import { avatarHTML } from '../../core/avatar.js';
import { tiempoRelativo, resumenReacciones } from '../../core/muro.js';
import { contenidoHTML, segmentoChipHTML } from './render.js';
import { botonGuardarHTML } from '../social/guardados.js';
import { encuestaHTML } from '../encuestas/estado.js';

/** Reportar (cualquiera con sesión, salvo lo propio), ocultar (solo moderación) y guardar (con sesión). La base de datos vuelve a comprobar todo. */
function botonesHTML(it, { yo, puedeOcultar }) {
  if (!yo) return '';
  const mia = it.autor?.id === yo;
  return botonGuardarHTML('publicacion', it.id)
    + (mia ? '' : `<button type="button" data-reportar="${Number(it.id)}" title="Reportar" aria-label="Reportar publicación" class="w-8 h-8 rounded-lg text-gray-400 hover:text-amber-300 shrink-0"><i class="fa-regular fa-flag"></i></button>`)
    + (!mia && puedeOcultar ? `<button type="button" data-ocultar="${Number(it.id)}" title="Ocultar (moderación)" aria-label="Ocultar publicación (moderación)" class="w-8 h-8 rounded-lg text-gray-400 hover:text-orange-300 shrink-0"><i class="fa-solid fa-eye-slash"></i></button>` : '');
}

/** `opciones`: { yo: id de quien mira | null, puedeOcultar: boolean, extra: HTML opcional bajo el contenido }. */
export function tarjetaComunidadHTML(it, opciones = {}) {
  const a = it.autor ?? {}; const perfil = `${href('perfil/')}?u=${encodeURIComponent(a.username ?? '')}`; const urlMuro = `${perfil}#p-${Number(it.id)}`;
  const rx = resumenReacciones(it.reacciones).map((x) => `<span class="rx"><span>${escapeHTML(x.tipo)}</span><b>${x.n}</b></span>`).join('');
  const n = Number(it.respuestas) || 0;
  return `<article class="glass-panel rounded-2xl p-3 sm:p-4" data-pub="${Number(it.id)}">
    <header class="flex items-center gap-2.5 mb-2">
      <a href="${escapeHTML(perfil)}" class="w-9 h-9 rounded-full overflow-hidden flex items-center justify-center bg-galaxy-card border border-galaxy-border shrink-0">${avatarHTML(a.avatar_url, a.nombre_display, 36)}</a>
      <div class="min-w-0 flex-1"><a href="${escapeHTML(perfil)}" class="font-display font-bold text-white text-sm truncate block hover:text-galaxy-400">${escapeHTML(a.nombre_display ?? 'Jugador')}</a>
        <p class="text-[11px] text-gray-500">${tiempoRelativo(it.created_at)} ${segmentoChipHTML(it.juego)}</p></div>${botonesHTML(it, opciones)}</header>
    ${contenidoHTML(it)}${encuestaHTML(it.id)}${opciones.extra ?? ''}
    <footer class="mt-3 pt-2 border-t border-galaxy-border/60 flex flex-wrap items-center gap-1.5">${rx}
      <a href="${escapeHTML(urlMuro)}" class="ml-auto text-[11px] text-gray-400 hover:text-galaxy-400"><i class="fa-regular fa-comment mr-1"></i>${n ? `${n} respuesta${n === 1 ? '' : 's'} · ` : ''}Ver en su muro</a></footer></article>`;
}

// Tarjeta de publicación «de comunidad» (autor + contenido + reacciones + enlace a su muro). La usan /comunidad/, /guardados/ y /buscar/.
// Recibe un ítem con el formato de `muro_comunidad` (también lo devuelven `guardados_listar` y `buscar_publicaciones`).
// Los botones llevan data-atributos; cada página reparte los clics (guardar → features/social/guardados.js, reportar/ocultar → features/moderacion/acciones.js).
import { escapeHTML } from '../../core/sistema/dom.js';
import { href } from '../../core/sistema/config.js';
import { avatarHTML } from '../../core/sistema/avatar.js';
import { tiempoRelativo, resumenReacciones } from '../../core/comunidad/muro.js';
import { contenidoHTML, segmentoChipHTML } from './render.js';
import { botonGuardarHTML } from '../social/guardados.js';
import { encuestaHTML } from '../encuestas/estado.js';
import { esLargo } from '../../core/comunidad/feedSocial.js';

/** Reportar (cualquiera con sesión, salvo lo propio), ocultar (solo moderación), guardar (con sesión) y eliminar (lo tuyo, o el admin con `puedeBorrar`).
 *  La base de datos vuelve a comprobar todo (muro_borrar: autor o admin). */
function botonesHTML(it, { yo, puedeOcultar, puedeBorrar }) {
  if (!yo) return '';
  const mia = it.autor?.id === yo;
  // «Retar a duelo» (19-oct-2026): de una publicación al asistente de Duelos con ese rival ya elegido (/duelos/?retar=<id>).
  const uuid = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(String(it.autor?.id ?? '')) && !String(it.autor?.id).startsWith('00000000-0000-4000-8000-9000');   // los de la demostración no se pueden retar
  return botonGuardarHTML('publicacion', it.id)
    + (!mia && uuid ? `<a href="${escapeHTML(`${href('duelos/')}?retar=${encodeURIComponent(it.autor.id)}`)}" title="Retar a duelo" aria-label="Retar a duelo a ${escapeHTML(it.autor?.nombre_display ?? 'este jugador')}" class="w-8 h-8 rounded-lg text-gray-400 hover:text-galaxy-400 shrink-0 inline-grid place-items-center"><i class="fa-solid fa-bolt"></i></a>` : '')
    + (mia ? '' : `<button type="button" data-reportar="${Number(it.id)}" title="Reportar" aria-label="Reportar publicación" class="w-8 h-8 rounded-lg text-gray-400 hover:text-amber-300 shrink-0"><i class="fa-regular fa-flag"></i></button>`)
    + (mia || puedeBorrar ? `<button type="button" data-borrar-pub="${Number(it.id)}" title="Eliminar" aria-label="Eliminar publicación" class="w-8 h-8 rounded-lg text-gray-400 hover:text-rose-400 shrink-0"><i class="fa-solid fa-trash-can"></i></button>` : '')
    + (!mia && puedeOcultar ? `<button type="button" data-ocultar="${Number(it.id)}" title="Ocultar (moderación)" aria-label="Ocultar publicación (moderación)" class="w-8 h-8 rounded-lg text-gray-400 hover:text-orange-300 shrink-0"><i class="fa-solid fa-eye-slash"></i></button>` : '');
}

/** `opciones`: { yo: id de quien mira | null, puedeOcultar: boolean, extra: HTML opcional bajo el contenido, variante: 'hilo' (estilo foro de /social/) }. */
export function tarjetaComunidadHTML(it, opciones = {}) {
  const a = it.autor ?? {}; const perfil = `${href('perfil/')}?u=${encodeURIComponent(a.username ?? '')}`; const urlMuro = `${perfil}#p-${Number(it.id)}`;
  const rx = resumenReacciones(it.reacciones).map((x) => `<span class="rx"><span>${escapeHTML(x.tipo)}</span><b>${x.n}</b></span>`).join('');
  const n = Number(it.respuestas) || 0;
  // Variante «hilo» (solo /social/, 19-oct-2026, estilo foro tipo Reddit): cabecera en una línea (cara · nombre · hace cuánto · juego),
  // sin caja de cristal: las publicaciones van separadas por una línea y se iluminan al pasar el mouse. Los estilos están en socialHilo.css.
  if (opciones.variante === 'hilo') {
    // 19-oct-2026 (Fralex: «que el muro no se vea tan cargado… minimalista pero completo»): cara más grande con nombre y «hace cuánto · juego»
    // en dos líneas, y guardar/reportar/ocultar dentro de un solo menú «⋯» (antes eran tres iconos sueltos en cada publicación).
    const acc = botonesHTML(it, opciones);
    return `<article class="sx-post" data-pub="${Number(it.id)}">
    <header class="sx-post-cab">
      <a href="${escapeHTML(perfil)}" class="sx-post-av" tabindex="-1" aria-hidden="true">${avatarHTML(a.avatar_url, a.nombre_display, 36)}</a>
      <span class="sx-post-id"><a href="${escapeHTML(perfil)}" class="sx-post-autor">${escapeHTML(a.nombre_display ?? 'Jugador')}</a>
        <span class="sx-post-meta"><time class="sx-post-hace" datetime="${escapeHTML(it.created_at ?? '')}" data-t="${escapeHTML(it.created_at ?? '')}">${tiempoRelativo(it.created_at)}</time>${segmentoChipHTML(it.juego)}</span></span>
      ${acc ? `<details class="sx-post-menu" name="sx-menu"><summary aria-label="Más opciones" title="Más opciones"><i class="fa-solid fa-ellipsis" aria-hidden="true"></i></summary><div class="sx-post-menu-lista">${acc}</div></details>` : ''}</header>
    <div class="sx-post-cuerpo"${esLargo(it.texto) ? ' data-largo="1"' : ''}>${contenidoHTML(it)}${encuestaHTML(it.id)}${opciones.extra ?? ''}</div>
    ${esLargo(it.texto) ? `<button type="button" class="sx-post-mas" data-leer-mas="${Number(it.id)}" aria-expanded="false">Leer más</button>` : ''}
    ${opciones.pie ?? ''}<div class="sx-post-hilo" data-hilo="${Number(it.id)}" hidden></div></article>`;
  }
  return `<article class="glass-panel rounded-2xl p-3 sm:p-4" data-pub="${Number(it.id)}">
    <header class="flex items-center gap-2.5 mb-2">
      <a href="${escapeHTML(perfil)}" class="w-9 h-9 rounded-full overflow-hidden flex items-center justify-center bg-galaxy-card border border-galaxy-border shrink-0">${avatarHTML(a.avatar_url, a.nombre_display, 36)}</a>
      <div class="min-w-0 flex-1"><a href="${escapeHTML(perfil)}" class="font-display font-bold text-white text-sm truncate block hover:text-galaxy-400">${escapeHTML(a.nombre_display ?? 'Jugador')}</a>
        <p class="text-[12px] text-gray-500">${tiempoRelativo(it.created_at)} ${segmentoChipHTML(it.juego)}</p></div>${botonesHTML(it, opciones)}</header>
    ${contenidoHTML(it)}${encuestaHTML(it.id)}${opciones.extra ?? ''}
    ${opciones.pie ?? `<footer class="mt-3 pt-2 border-t border-galaxy-border/60 flex flex-wrap items-center gap-1.5">${rx}
      <a href="${escapeHTML(urlMuro)}" class="ml-auto text-[12px] text-gray-400 hover:text-galaxy-400"><i class="fa-regular fa-comment mr-1"></i>${n ? `${n} respuesta${n === 1 ? '' : 's'} · ` : ''}Ver en su muro</a></footer>`}</article>`;
}

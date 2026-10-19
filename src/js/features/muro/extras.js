// EXTRAS de las publicaciones (19-oct-2026, migración 133): fondo de color, «cómo te sientes» y varias fotos.
// Igual que las encuestas: cada página pide los extras de lo que muestra (cargarExtras, lo llama cargarEncuestas) y render.js los dibuja.
// Todo lo que viene de la BD pasa por las listas de data/muroEstilo.js (un id desconocido no se dibuja) y por safeImg.
import { escapeHTML, safeImg } from '../../core/sistema/dom.js';
import { FONDOS_POST, SENTIMIENTOS, FONDO_MAX_TEXTO } from '../../../data/muroEstilo.js';
import { extrasDe } from './api.js';

const cache = new Map();   // id de publicación → { fondo, sentimiento, fotos }
export const extraDe = (id) => cache.get(Number(id)) ?? null;
/** Pide los extras de estas publicaciones (se suman a lo conocido). Nunca lanza. */
export async function cargarExtras(ids) { const d = await extrasDe(ids); for (const [k, v] of Object.entries(d ?? {})) if (v && typeof v === 'object') cache.set(Number(k), v); }
/** Para que una publicación recién hecha se vea completa sin volver a pedirla. */
export const recordarExtra = (id, extra) => { if (id && extra) cache.set(Number(id), extra); };

export const fondoPorId = (id) => FONDOS_POST.find((f) => f.id === id) ?? null;
export const sentimientoPorId = (id) => SENTIMIENTOS.find((s) => s.id === id) ?? null;
/** ¿Este texto va sobre fondo? Solo si es corto y la publicación no lleva foto ni video. */
export const llevaFondo = (it, ex) => !!(ex?.fondo && fondoPorId(ex.fondo) && it.texto && it.texto.length <= FONDO_MAX_TEXTO && !it.imagen_url && !it.video_url);

/** «está emocionado 🤩» / «está jugando 🎮», bajo el nombre. */
export function sentimientoHTML(ex) {
  const s = sentimientoPorId(ex?.sentimiento); if (!s) return '';
  return `<p class="px-siente"><span class="px-siente-e" aria-hidden="true">${s.emoji}</span>${s.actividad ? 'está' : 'se siente'} <b>${escapeHTML(s.t)}</b></p>`;
}
/** Texto grande y centrado sobre su fondo. */
export const textoConFondoHTML = (htmlTexto, ex) => `<div class="px-fondo" style="background:${fondoPorId(ex.fondo).css}"><p>${htmlTexto}</p></div>`;
/** Galería de 2 a 4 fotos (la principal + las extra), como Instagram/Facebook. */
export function galeriaHTML(principal, ex) {
  const fotos = [principal, ...((Array.isArray(ex?.fotos) ? ex.fotos : []).slice(0, 3))].map((u) => safeImg(u)).filter(Boolean);
  if (fotos.length < 2) return '';
  return `<div class="px-galeria" data-n="${fotos.length}">${fotos.map((u, i) => `<a href="${escapeHTML(u)}" target="_blank" rel="noopener noreferrer"><img src="${escapeHTML(u)}" alt="Foto ${i + 1} de ${fotos.length}" loading="lazy" referrerpolicy="no-referrer"></a>`).join('')}</div>`;
}

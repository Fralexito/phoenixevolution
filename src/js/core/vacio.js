// Estado vacío con personalidad (ronda 182) — HTML PURO (sin DOM → probable con `npm test`).
// Un estado vacío es una oportunidad: icono + frase + (opcional) un botón que dice qué hacer ahora.
// Reemplaza a los «vacio()» sueltos de cada página. El estilo vive en styles/components.css (.vacio-vivo).
import { escapeHTML } from './dom.js';

const ICONO_OK = /^fa-[a-z0-9-]+$/;

/**
 * @param {string} texto  frase principal (se escapa)
 * @param {{icono?:string, titulo?:string, accion?:{texto:string, href?:string, id?:string}, error?:boolean}} [o]
 *   icono: clase Font Awesome (p. ej. 'fa-trophy'); si no es válida se usa 'fa-ghost'. error: tono rojo para fallos de carga.
 */
export function vacioHTML(texto, o = {}) {
  const icono = ICONO_OK.test(o.icono ?? '') ? o.icono : (o.error ? 'fa-triangle-exclamation' : 'fa-ghost');
  const titulo = o.titulo ? `<b class="vacio-tit">${escapeHTML(o.titulo)}</b>` : '';
  const a = o.accion?.texto ? (o.accion.href
    ? `<a class="btn btn-primary vacio-acc" href="${escapeHTML(o.accion.href)}">${escapeHTML(o.accion.texto)}</a>`
    : `<button type="button" class="btn btn-primary vacio-acc"${o.accion.id ? ` id="${escapeHTML(o.accion.id)}"` : ''}>${escapeHTML(o.accion.texto)}</button>`) : '';
  return `<div class="vacio-vivo glass-panel${o.error ? ' vacio-error' : ''}" role="${o.error ? 'alert' : 'status'}"><span class="vacio-ico" aria-hidden="true"><i class="fa-solid ${icono}"></i></span>${titulo}<p class="vacio-txt">${escapeHTML(texto)}</p>${a}</div>`;
}

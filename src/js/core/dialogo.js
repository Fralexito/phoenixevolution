// Diálogos propios del sitio: reemplazan confirm()/prompt() del navegador. Ambos devuelven una promesa.
//   await confirmar('¿Borrar esto?', { aceptar: 'Borrar', peligro: true })  → true | false
//   await pedirTexto('Motivo:', { valor: '', maximo: 200, obligatorio: true }) → string | null (cancelado)
import { openModal, closeModal } from './modal.js';
import { escapeHTML } from './dom.js';

const ID = 'dialogo-modal';
const cabecera = (t) => `<div class="flex items-start justify-between border-b border-galaxy-border pb-3"><h3 class="font-display font-bold text-lg text-white uppercase">${escapeHTML(t)}</h3><button type="button" data-close aria-label="Cerrar" class="text-gray-400 hover:text-white text-xl p-1"><i class="fa-solid fa-xmark"></i></button></div>`;

export function confirmar(texto, { titulo = 'Confirmar', aceptar = 'Aceptar', cancelar = 'Cancelar', peligro = false } = {}) {
  return new Promise((resolve) => {
    let hecho = false; const fin = (v) => { if (!hecho) { hecho = true; resolve(v); } };
    const m = openModal(`<div class="p-5 sm:p-6 space-y-4">${cabecera(titulo)}<p class="text-sm text-gray-200 whitespace-pre-line">${escapeHTML(texto)}</p>
      <div class="flex gap-2 justify-end"><button type="button" data-close class="btn btn-ghost">${escapeHTML(cancelar)}</button><button type="button" id="dlg-ok" class="btn ${peligro ? 'btn-ghost !text-rose-300 !border-rose-400/50' : 'btn-primary'}">${escapeHTML(aceptar)}</button></div></div>`, { id: ID, onClose: () => fin(false) });
    const ok = m.querySelector('#dlg-ok'); ok.addEventListener('click', () => { fin(true); closeModal(ID); }); ok.focus();
  });
}

export function pedirTexto(texto, { titulo = 'Escribe aquí', valor = '', placeholder = '', maximo = 200, obligatorio = true, aceptar = 'Aceptar' } = {}) {
  return new Promise((resolve) => {
    let hecho = false; const fin = (v) => { if (!hecho) { hecho = true; resolve(v); } };
    const m = openModal(`<form id="dlg-form" class="p-5 sm:p-6 space-y-4" novalidate>${cabecera(titulo)}<label class="label" for="dlg-txt">${escapeHTML(texto)}</label>
      <input id="dlg-txt" class="field" maxlength="${Number(maximo) || 200}" value="${escapeHTML(valor)}" placeholder="${escapeHTML(placeholder)}" autocomplete="off">
      <p id="dlg-err" hidden role="alert" class="text-xs text-rose-400"></p>
      <div class="flex gap-2 justify-end"><button type="button" data-close class="btn btn-ghost">Cancelar</button><button type="submit" class="btn btn-primary">${escapeHTML(aceptar)}</button></div></form>`, { id: ID, onClose: () => fin(null) });
    const i = m.querySelector('#dlg-txt'); i.focus(); i.select();
    m.querySelector('#dlg-form').addEventListener('submit', (ev) => {
      ev.preventDefault(); const v = i.value.trim();
      if (obligatorio && !v) { const e = m.querySelector('#dlg-err'); e.textContent = 'Este campo es obligatorio.'; e.hidden = false; return; }
      fin(v); closeModal(ID);
    });
  });
}

/** Elegir una opción de una lista (con buscador si hay más de 6).
 *  await elegir('¿A qué club?', [{ valor: 3, texto: 'Club A', detalle: '25 jugadores' }]) → valor | null (cancelado) */
export function elegir(texto, opciones, { titulo = 'Elige una opción' } = {}) {
  return new Promise((resolve) => {
    let hecho = false; const fin = (v) => { if (!hecho) { hecho = true; resolve(v); } };
    const fila = (o, i) => `<li><button type="button" data-i="${i}" class="w-full text-left px-3 py-2.5 rounded-lg border border-galaxy-border/60 hover:border-galaxy-400 hover:bg-galaxy-400/10 focus-visible:border-galaxy-400 transition-colors"><b class="text-white text-sm">${escapeHTML(o.texto)}</b>${o.detalle ? `<span class="block text-[12px] text-gray-400">${escapeHTML(o.detalle)}</span>` : ''}</button></li>`;
    const m = openModal(`<div class="p-5 sm:p-6 space-y-3">${cabecera(titulo)}<p class="text-sm text-gray-200">${escapeHTML(texto)}</p>
      ${opciones.length > 6 ? '<input id="dlg-buscar" type="search" class="field" placeholder="Buscar…" autocomplete="off">' : ''}
      <ul id="dlg-lista" class="space-y-1.5 max-h-[55vh] overflow-y-auto pr-1">${opciones.map(fila).join('')}</ul>
      <div class="flex justify-end"><button type="button" data-close class="btn btn-ghost">Cancelar</button></div></div>`, { id: ID, onClose: () => fin(null) });
    m.querySelector('#dlg-lista').addEventListener('click', (e) => { const b = e.target.closest('[data-i]'); if (!b) return; fin(opciones[Number(b.dataset.i)].valor); closeModal(ID); });
    const q = m.querySelector('#dlg-buscar');
    if (q) { q.focus(); q.addEventListener('input', () => { const t = q.value.trim().toLowerCase(); m.querySelectorAll('#dlg-lista li').forEach((li, i) => { li.hidden = !!t && !opciones[i].texto.toLowerCase().includes(t); }); }); }
    else m.querySelector('[data-i]')?.focus();
  });
}

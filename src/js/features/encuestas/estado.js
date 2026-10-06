// Estado de las encuestas visibles en la página + su dibujo + el clic de votar (un solo oyente global; cada página solo pide los datos y pone `encuestaHTML(id)`).
import { escapeHTML } from '../../core/dom.js';
import { toast } from '../../core/toast.js';
import { porcentajes, textoCierre } from '../../core/encuesta.js';
import { onSession } from '../../core/session.js';
import * as api from './api.js';

const cache = new Map();            // id de publicación → encuesta
let hayVoto = false;                // ¿hay sesión? (sin sesión se muestran las opciones sin poder votar)
onSession(({ session }) => { hayVoto = !!session; });

export const encuestaDe = (postId) => cache.get(Number(postId)) ?? null;
/** Pide el estado de estas publicaciones (se suma a lo conocido). Nunca lanza. */
export async function cargarEncuestas(ids) { const m = await api.encuestasDe(ids); for (const [k, v] of m) cache.set(k, v); }

/** HTML de la encuesta de esa publicación ('' si no tiene). */
export function encuestaHTML(postId) {
  const e = encuestaDe(postId); if (!e) return '';
  const pct = porcentajes(e.opciones, e.total); const puedeVotar = hayVoto && !e.cerrada;
  const filas = e.opciones.map((o, i) => {
    const mio = e.miVoto === o.id; const p = pct[i];
    const base = 'relative w-full text-left rounded-lg border px-3 py-2 text-sm overflow-hidden ' + (mio ? 'border-galaxy-400 text-white' : 'border-galaxy-border/70 text-gray-200');
    const barra = p == null ? '' : `<span class="absolute inset-y-0 left-0 bg-galaxy-600/25" style="width:${p}%" aria-hidden="true"></span>`;
    const cifra = p == null ? '' : `<b class="relative ml-auto pl-3 text-xs ${mio ? 'text-galaxy-400' : 'text-gray-300'}">${p}% <span class="text-gray-500 font-normal">(${o.votos})</span></b>`;
    const dentro = `${barra}<span class="relative flex items-center gap-2">${mio ? '<i class="fa-solid fa-circle-check text-galaxy-400 text-xs"></i>' : ''}<span class="truncate">${escapeHTML(o.texto)}</span>${cifra}</span>`;
    return puedeVotar ? `<button type="button" data-voto="${o.id}" data-pub="${Number(postId)}" aria-pressed="${mio}" class="${base} hover:border-galaxy-400">${dentro}</button>` : `<div class="${base}">${dentro}</div>`;
  }).join('');
  const aviso = e.cerrada ? 'Encuesta cerrada' : (!hayVoto ? 'Inicia sesión para votar' : e.miVoto != null ? 'Puedes cambiar tu voto' : e.soyAutor ? 'Los demás verán los resultados al votar' : 'Vota para ver los resultados');
  return `<div class="mt-2 space-y-1.5" data-encuesta="${Number(postId)}" role="group" aria-label="Encuesta">${filas}
    <p class="text-[12px] text-gray-500"><i class="fa-solid fa-chart-simple mr-1"></i>${e.total} voto${e.total === 1 ? '' : 's'}${e.visibles || e.cerrada ? '' : ' (ocultos hasta que votes)'} · ${escapeHTML(textoCierre(e.cierra_at))} · ${escapeHTML(aviso)}</p></div>`;
}

/** Repinta solo el bloque de esa encuesta (en todas las copias que haya en la página). */
function repintar(postId) { document.querySelectorAll(`[data-encuesta="${Number(postId)}"]`).forEach((n) => { n.outerHTML = encuestaHTML(postId); }); }

document.addEventListener('click', async (ev) => {
  const b = ev.target.closest('[data-voto]'); if (!b || b.disabled) return;
  const pub = Number(b.dataset.pub), op = Number(b.dataset.voto); const e = encuestaDe(pub);
  if (!e || e.miVoto === op) return;
  document.querySelectorAll(`[data-encuesta="${pub}"] [data-voto]`).forEach((x) => { x.disabled = true; });
  try { const nueva = await api.votar(pub, op); if (nueva) cache.set(pub, nueva); }
  catch (err) { toast(err.message || 'No se pudo registrar tu voto.', 'error'); }
  finally { repintar(pub); }
});

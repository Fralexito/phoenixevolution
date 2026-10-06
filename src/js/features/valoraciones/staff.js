// Moderación de valoraciones: lista las recibidas por una persona (con su autor) y permite anular una con motivo (queda en la auditoría).
import { openModal } from '../../core/modal.js';
import { escapeHTML } from '../../core/dom.js';
import { toast } from '../../core/toast.js';
import { nombreEtiqueta } from '../../core/reputacion.js';
import { abrirNota } from '../moderacion/acciones.js';
import * as api from './api.js';

const ID = 'modal';
export async function abrirValoracionesStaff({ usuario } = {}) {
  if (!usuario?.id) return;
  let lista;
  try { lista = await api.recibidasStaff(usuario.id); }
  catch (e) { console.error('[valoraciones] staff:', e); toast(e?.message || 'No se pudieron cargar las valoraciones.', 'error'); return; }
  const filas = lista.map((v) => `<li class="flex flex-wrap items-center gap-2 py-2 text-sm"><span class="text-amber-300">${'★'.repeat(Number(v.estrellas) || 0)}</span>
      <span class="text-gray-200">de ${escapeHTML(v.de ?? '—')}</span><span class="text-[12px] text-gray-500">duelo #${Number(v.reto_id)}</span>
      <span class="text-[12px] text-gray-400 flex-1 min-w-0">${(v.etiquetas ?? []).map((t) => escapeHTML(nombreEtiqueta(t))).join(', ')}</span>
      <button type="button" data-anular="${Number(v.id)}" class="btn btn-ghost !min-h-7 !px-2 !text-[12px] !text-rose-300">Anular</button></li>`).join('');
  const m = openModal(`<h3 class="font-display font-bold text-white uppercase tracking-wider text-sm">Valoraciones de ${escapeHTML(usuario.nombre ?? '')}</h3>
    <p class="text-[12px] text-gray-400 mt-1">Últimas 50. Anula las que sean granjas de estrellas o venganzas; queda registrado en la auditoría.</p>
    <ul class="divide-y divide-galaxy-border/40 mt-2 max-h-[50vh] overflow-auto">${filas || '<li class="text-xs text-gray-500 py-3">Esta persona no ha recibido valoraciones.</li>'}</ul>
    <div class="mt-3 flex justify-end"><button type="button" data-close class="btn btn-ghost !min-h-9 !px-4 !text-xs">Cerrar</button></div>`, { id: ID });
  m.addEventListener('click', (ev) => {
    const b = ev.target.closest('[data-anular]'); if (!b) return;
    abrirNota({ titulo: 'Anular valoración', sub: 'Escribe el motivo (mínimo 5 letras).', accion: 'Anular', hacer: (nota) => api.anular(b.dataset.anular, nota), ok: 'Valoración anulada.', onListo: () => abrirValoracionesStaff({ usuario }) });
  });
}

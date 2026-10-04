// Ventana para invitar jugadores a un equipo (solo el líder de ese equipo; la BD lo vuelve a validar).
import { openModal, closeModal } from '../../core/modal.js';
import { escapeHTML } from '../../core/dom.js';
import { data, me, partsOf } from './data.js';
import { invitar } from './actions.js';
import { seats } from '../../core/teams.js';

export function openInviteModal(reto, equipo) {
  const wrap = openModal(`
    <div class="p-5 space-y-4">
      <div class="flex items-center justify-between"><h3 class="font-display font-extrabold text-xl text-white uppercase">Invitar al equipo ${escapeHTML(equipo)}</h3>
        <button type="button" data-close aria-label="Cerrar" class="text-gray-400 hover:text-white min-w-11 min-h-11"><i class="fa-solid fa-xmark text-xl"></i></button></div>
      <p id="inv-hint" class="text-xs text-gray-400"></p>
      <input id="inv-q" class="field" type="search" placeholder="Buscar jugador…" autocomplete="off" maxlength="40">
      <ul id="inv-list" class="max-h-72 overflow-y-auto space-y-1"></ul>
    </div>`, { id: 'invite-modal' });

  const paint = () => {
    const q = wrap.querySelector('#inv-q').value.trim().toLowerCase();
    const taken = new Set(partsOf(reto.id).map((p) => p.usuario_id));
    const free = seats(equipo === 'A' ? reto.tam_a : reto.tam_b, partsOf(reto.id), equipo).free;
    wrap.querySelector('#inv-hint').textContent = free ? `Quedan ${free} cupo${free > 1 ? 's' : ''}. Los que no invites quedarán abiertos si el reto es público.` : 'Ya no quedan cupos libres.';
    const list = [...data.perfiles.values()].filter((p) => p.id !== me() && !taken.has(p.id) && p.id !== reto.destinatario_id && (!q || (p.nombre_display ?? '').toLowerCase().includes(q)))
      .sort((a, b) => (data.online.has(b.id) - data.online.has(a.id)) || (a.nombre_display ?? '').localeCompare(b.nombre_display ?? '')).slice(0, 40);
    wrap.querySelector('#inv-list').innerHTML = list.length
      ? list.map((p) => `<li class="flex items-center justify-between gap-2 p-2 rounded-lg bg-galaxy-900 border border-galaxy-border">
          <span class="truncate text-sm text-white">${data.online.has(p.id) ? '<span class="text-emerald-400">● </span>' : ''}${escapeHTML(p.nombre_display ?? 'Jugador')}</span>
          <button type="button" data-uid="${escapeHTML(p.id)}" ${free ? '' : 'disabled'} class="btn btn-primary !min-h-11 !text-xs">Invitar</button></li>`).join('')
      : '<li class="text-xs text-gray-500 text-center py-4">Sin resultados.</li>';
  };
  wrap.querySelector('#inv-q').addEventListener('input', paint);
  wrap.querySelector('#inv-list').addEventListener('click', async (e) => {
    const uid = e.target.closest('[data-uid]')?.dataset.uid; if (!uid) return;
    if (await invitar(reto.id, uid, equipo)) { paint(); if (!seats(equipo === 'A' ? reto.tam_a : reto.tam_b, partsOf(reto.id), equipo).free) closeModal('invite-modal'); }
  });
  paint();
}

// Modal para crear/editar una ficha de jugador (solo admin; la BD lo refuerza con RLS).
import { supabase } from '../core/supabase.js';
import { openModal, closeModal } from '../core/modal.js';
import { escapeHTML } from '../core/dom.js';
import { cropSquareJpeg } from '../core/image.js';
import { toast } from '../core/toast.js';
import { STAT_KEYS } from './playerCard.js';

const POSICIONES = ['PO', 'DFC', 'LD', 'LI', 'MCD', 'MC', 'MCO', 'EI', 'ED', 'SD', 'DC'];
const clamp = (v, d = 75) => { const n = Math.round(Number(v)); return Number.isFinite(n) ? Math.min(99, Math.max(1, n)) : d; };

export function openPlayerForm(player = null, onSaved = () => {}) {
  const p = player ?? {};
  let photo = null;
  const m = openModal(`
    <form id="pf" class="p-6 space-y-4" novalidate>
      <div class="flex justify-between items-center">
        <h2 class="font-display font-bold text-2xl text-white uppercase tracking-widest">${player ? 'Editar' : 'Añadir'} jugador</h2>
        <button type="button" data-close aria-label="Cerrar" class="text-gray-500 hover:text-white"><i class="fa-solid fa-xmark text-xl"></i></button>
      </div>
      <div class="grid grid-cols-2 gap-3">
        <div class="col-span-2"><label class="label" for="f-nombre">Nombre</label><input id="f-nombre" class="field" maxlength="40" value="${escapeHTML(p.nombre)}"></div>
        <div><label class="label" for="f-club">Club</label><input id="f-club" class="field" maxlength="60" value="${escapeHTML(p.club ?? 'Agente Libre')}"></div>
        <div><label class="label" for="f-pos">Posición</label><select id="f-pos" class="field">${POSICIONES.map((x) => `<option ${x === (p.posicion ?? 'DC') ? 'selected' : ''}>${x}</option>`).join('')}</select></div>
        <div class="col-span-2"><label class="label" for="f-ovr">OVR (vacío = promedio de las 14 estadísticas)</label><input id="f-ovr" type="number" min="1" max="99" class="field" value="${escapeHTML(p.ovr ?? '')}"></div>
      </div>
      <div class="grid grid-cols-4 gap-2">
        ${STAT_KEYS.map((k) => `<div><label class="label" for="s-${k}">${k.toUpperCase()}</label><input id="s-${k}" data-stat="${k}" type="number" min="1" max="99" class="field !px-2" value="${escapeHTML(p[k] ?? 75)}"></div>`).join('')}
      </div>
      <div><label class="label" for="f-quote">Frase</label><input id="f-quote" class="field" maxlength="140" value="${escapeHTML(p.quote)}"></div>
      <label class="btn btn-ghost cursor-pointer w-full"><i class="fa-solid fa-camera"></i> Foto (opcional)<input id="f-foto" type="file" accept="image/*" hidden></label>
      <p id="f-err" class="text-xs text-bad min-h-4" role="alert"></p>
      <button class="btn btn-primary w-full" type="submit">Guardar ficha</button>
    </form>`, { id: 'player-modal' });

  const $ = (s) => m.querySelector(s);
  const err = $('#f-err');
  $('#f-foto').addEventListener('change', async (e) => {
    try { photo = await cropSquareJpeg(e.target.files[0], 256, 0.82); } catch (ex) { err.textContent = ex.message; photo = null; }
  });

  $('#pf').addEventListener('submit', async (ev) => {
    ev.preventDefault(); err.textContent = '';
    const btn = ev.target.querySelector('button[type=submit]');
    const nombre = $('#f-nombre').value.trim().replace(/[<>]/g, '');
    if (!nombre) { err.textContent = 'Escribe el nombre.'; return; }
    const row = { nombre, club: $('#f-club').value.trim().replace(/[<>]/g, '') || 'Agente Libre', posicion: $('#f-pos').value, quote: $('#f-quote').value.trim() };
    STAT_KEYS.forEach((k) => { row[k] = clamp($(`[data-stat="${k}"]`).value); });
    row.ovr = $('#f-ovr').value === '' ? clamp(STAT_KEYS.reduce((s, k) => s + row[k], 0) / STAT_KEYS.length) : clamp($('#f-ovr').value);

    btn.disabled = true;
    try {
      const id = player?.id ?? crypto.randomUUID();
      if (photo) {
        const path = `${id}.jpg`;
        const up = await supabase.storage.from('fichas').upload(path, photo, { upsert: true, contentType: 'image/jpeg' });
        if (up.error) throw up.error;
        row.foto_url = `${supabase.storage.from('fichas').getPublicUrl(path).data.publicUrl}?v=${Date.now()}`;
      }
      const q = player ? supabase.from('jugadores').update(row).eq('id', id) : supabase.from('jugadores').insert({ id, ...row });
      const { error } = await q;
      if (error) throw error;
      closeModal('player-modal'); toast('Ficha guardada.', 'ok'); onSaved();
    } catch (ex) {
      console.error('[ficha] guardar:', ex);
      err.textContent = /row-level security|policy/i.test(ex.message) ? 'No tienes permiso (solo administradores).' : ex.message;
    } finally { btn.disabled = false; }
  });
}

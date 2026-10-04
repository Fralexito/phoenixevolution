// Modal de perfil con 3 pestañas (Identidad / Social / Sistema Host) sobre la tabla `perfiles`.
import { supabase } from '../core/supabase.js';
import { getState, refreshProfile } from '../core/session.js';
import { openModal, closeModal } from '../core/modal.js';
import { escapeHTML, safeUrl, toUsername } from '../core/dom.js';
import { cropSquareJpeg } from '../core/image.js';
import { toast } from '../core/toast.js';

const opt = (list, cur) => list.map((v) => `<option ${v === cur ? 'selected' : ''}>${escapeHTML(v)}</option>`).join('');

export function openProfileModal() {
  const { session, profile: p } = getState();
  if (!session) return;
  const prof = p ?? {};
  const uid = session.user.id;
  let newAvatar = null; // Blob pendiente de subir

  const m = openModal(`
    <form id="prof-form" class="p-6 space-y-5" novalidate>
      <div class="flex justify-between items-center">
        <h2 class="font-display font-bold text-2xl text-white uppercase tracking-widest">Mi perfil</h2>
        <button type="button" data-close aria-label="Cerrar" class="text-gray-500 hover:text-white"><i class="fa-solid fa-xmark text-xl"></i></button>
      </div>
      <div class="flex items-center gap-4">
        <img id="p-prev" alt="" class="w-16 h-16 rounded-full object-cover border border-galaxy-400/50 bg-galaxy-card" src="${escapeHTML(safeUrl(prof.avatar_url))}" onerror="this.style.visibility='hidden'">
        <label class="btn btn-ghost cursor-pointer"><i class="fa-solid fa-camera"></i> Cambiar foto<input id="p-file" type="file" accept="image/*" hidden></label>
      </div>
      <div role="tablist" class="flex gap-1 border-b border-galaxy-border font-display text-sm uppercase tracking-wider">
        ${['identidad:Identidad', 'social:Social', 'host:Sistema Host'].map((t, i) => { const [k, l] = t.split(':'); return `<button type="button" role="tab" data-tab="${k}" aria-selected="${i === 0}" class="px-3 py-2 text-gray-400 aria-selected:text-galaxy-400 aria-selected:border-b-2 aria-selected:border-galaxy-400">${l}</button>`; }).join('')}
      </div>

      <div data-pane="identidad" class="space-y-4">
        <div><label class="label" for="p-name">Nombre de usuario / apodo (visible)</label><input id="p-name" class="field" maxlength="30" value="${escapeHTML(prof.nombre_display)}"></div>
        <div><label class="label" for="p-user">Usuario (@)</label><input id="p-user" class="field" maxlength="20" value="${escapeHTML(prof.username)}"><p class="text-[10px] text-gray-500 mt-1">Solo minúsculas, números y _ (máx. 20). Es público.</p></div>
        <div><label class="label" for="p-club">Club favorito</label><input id="p-club" class="field" maxlength="60" value="${escapeHTML(prof.club_favorito)}"></div>
      </div>
      <div data-pane="social" hidden class="space-y-4">
        <div><label class="label" for="p-bio">Biografía táctica</label><textarea id="p-bio" class="field" rows="3" maxlength="280">${escapeHTML(prof.bio)}</textarea></div>
        <div><label class="label" for="p-disc">Discord</label><input id="p-disc" class="field" maxlength="40" value="${escapeHTML(prof.discord_tag)}"></div>
        <div><label class="label" for="p-stream">Enlace de stream (https://…)</label><input id="p-stream" class="field" maxlength="200" value="${escapeHTML(prof.stream_url)}"></div>
      </div>
      <div data-pane="host" hidden class="space-y-4">
        <label class="flex items-center gap-3 text-sm text-gray-300"><input id="p-host" type="checkbox" class="w-4 h-4 accent-[#8000ff]" ${prof.puede_hostear ? 'checked' : ''}> Puedo ser Host de partidas</label>
        <div id="host-fields" class="space-y-4">
          <div><label class="label" for="p-speed">Velocidad de subida (Mbps)</label><input id="p-speed" type="number" min="1" max="10000" class="field" value="${escapeHTML(prof.ancho_banda_mbps ?? '')}"></div>
          <div><label class="label" for="p-soft">Plataforma</label><select id="p-soft" class="field">${opt(['Ambos', 'Smash Soda', 'Parsec'], prof.software_host)}</select></div>
          <div><label class="label" for="p-game">Juego</label><select id="p-game" class="field">${opt(['PES 2021', 'SP Football Life 2026'], prof.host_juego)}</select></div>
          <div><label class="label" for="p-patch">Parche / Option File</label><input id="p-patch" class="field" maxlength="80" value="${escapeHTML(prof.host_parche)}"></div>
        </div>
      </div>
      <p id="p-err" class="text-xs text-bad min-h-4" role="alert"></p>
      <button class="btn btn-primary w-full" type="submit">Guardar cambios</button>
    </form>`, { id: 'profile-modal' });

  const $ = (s) => m.querySelector(s);
  const err = $('#p-err');
  const hostFields = $('#host-fields');
  const syncHost = () => { hostFields.style.opacity = $('#p-host').checked ? '1' : '.4'; hostFields.inert = !$('#p-host').checked; };
  syncHost(); $('#p-host').addEventListener('change', syncHost);

  m.querySelectorAll('[data-tab]').forEach((b) => b.addEventListener('click', () => {
    m.querySelectorAll('[data-tab]').forEach((x) => x.setAttribute('aria-selected', String(x === b)));
    m.querySelectorAll('[data-pane]').forEach((x) => { x.hidden = x.dataset.pane !== b.dataset.tab; });
  }));

  $('#p-file').addEventListener('change', async (e) => {
    try {
      newAvatar = await cropSquareJpeg(e.target.files[0]);
      const prev = $('#p-prev'); prev.style.visibility = 'visible'; prev.src = URL.createObjectURL(newAvatar);
    } catch (ex) { console.error('[perfil] imagen:', ex); err.textContent = ex.message; newAvatar = null; }
  });

  $('#prof-form').addEventListener('submit', async (ev) => {
    ev.preventDefault(); err.textContent = '';
    const btn = ev.target.querySelector('button[type=submit]');
    const username = toUsername($('#p-user').value);
    const nombre = $('#p-name').value.trim().replace(/[<>]/g, '');
    const stream = $('#p-stream').value.trim();
    const speed = $('#p-speed').value === '' ? null : Number($('#p-speed').value);
    if (!username) { err.textContent = 'El usuario solo admite a-z, 0-9 y _.'; return; }
    if (!nombre) { err.textContent = 'Escribe tu nombre de usuario o apodo.'; return; }
    if (stream && !safeUrl(stream)) { err.textContent = 'El enlace de stream debe empezar con https://'; return; }
    if (speed !== null && !(speed >= 1 && speed <= 10000)) { err.textContent = 'La velocidad debe estar entre 1 y 10000 Mbps.'; return; }

    btn.disabled = true;
    try {
      const patch = {
        username, nombre_display: nombre,
        club_favorito: $('#p-club').value.trim().replace(/[<>]/g, ''),
        bio: $('#p-bio').value.trim(), discord_tag: $('#p-disc').value.trim(), stream_url: stream,
        puede_hostear: $('#p-host').checked, ancho_banda_mbps: speed,
        software_host: $('#p-soft').value, host_juego: $('#p-game').value, host_parche: $('#p-patch').value.trim(),
      };
      if (newAvatar) {
        const path = `${uid}/avatar.jpg`;
        const up = await supabase.storage.from('avatars').upload(path, newAvatar, { upsert: true, contentType: 'image/jpeg', cacheControl: '3600' });
        if (up.error) throw up.error;
        patch.avatar_url = `${supabase.storage.from('avatars').getPublicUrl(path).data.publicUrl}?v=${Date.now()}`;
      }
      const { error } = await supabase.from('perfiles').update(patch).eq('id', uid);
      if (error) throw error;
      await refreshProfile();
      closeModal('profile-modal');
      toast('Perfil actualizado.', 'ok');
    } catch (ex) {
      console.error('[perfil] guardar:', ex);
      err.textContent = ex.code === '23505' ? 'Ese usuario ya está en uso. Elige otro.' : (ex.message || 'No se pudo guardar.');
    } finally { btn.disabled = false; }
  });
}

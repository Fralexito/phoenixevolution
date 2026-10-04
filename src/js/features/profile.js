// Modal de perfil con 3 pestañas (Identidad / Social / Sistema Host) sobre la tabla `perfiles`.
// Identidad = foto + apodo (nombre visible) + @usuario (único y público, como en TikTok).
import { supabase } from '../core/supabase.js';
import { getState, refreshProfile } from '../core/session.js';
import { openModal, closeModal } from '../core/modal.js';
import { escapeHTML, safeUrl, toUsername } from '../core/dom.js';
import { cropSquareJpeg } from '../core/image.js';
import { PRESETS, presetId, presetValue, avatarHTML, providerAvatar, providerName } from '../core/avatar.js';
import { toast } from '../core/toast.js';
import { switchHTML, segHTML, bindSeg } from './formControls.js';
import { bindHandle } from './handleCheck.js';

const SPEEDS = [5, 10, 25, 50, 100, 300];                       // Mbps de subida (atajos)
const PLATAFORMAS = ['Ambos', 'Smash Soda', 'Parsec'];
const JUEGOS = ['PES 2021', 'SP Football Life 2026'];

export function openProfileModal() {
  const { session, profile: p } = getState();
  if (!session) return;
  const prof = p ?? {};
  const uid = session.user.id;
  const nombreProv = providerName(session.user);
  const fotoProv = providerAvatar(session.user);

  // Estado local del formulario (se guarda todo junto al pulsar "Guardar").
  let avatar = { kind: 'keep' };                                 // keep | preset | provider | file
  let speed = prof.ancho_banda_mbps ?? null;
  let soft = PLATAFORMAS.includes(prof.software_host) ? prof.software_host : 'Ambos';
  let game = JUEGOS.includes(prof.host_juego) ? prof.host_juego : JUEGOS[0];
  const speeds = [...new Set([...SPEEDS, ...(speed ? [speed] : [])])].sort((a, b) => a - b);

  const m = openModal(`
    <form id="prof-form" class="p-6 space-y-5" novalidate>
      <div class="flex justify-between items-center">
        <h2 class="font-display font-bold text-2xl text-white uppercase tracking-widest">Mi perfil</h2>
        <button type="button" data-close aria-label="Cerrar" class="text-gray-500 hover:text-white"><i class="fa-solid fa-xmark text-xl"></i></button>
      </div>

      <div class="flex items-center gap-4">
        <span id="p-prev" class="w-16 h-16 shrink-0 rounded-full overflow-hidden border border-galaxy-400/50 bg-galaxy-card flex items-center justify-center">${avatarHTML(prof.avatar_url, prof.nombre_display, 64)}</span>
        <div class="flex flex-wrap gap-2">
          <label class="btn btn-ghost cursor-pointer !px-3 !py-2"><i class="fa-solid fa-camera"></i> Subir foto<input id="p-file" type="file" accept="image/*" hidden></label>
          <button type="button" id="p-btn-gal" class="btn btn-ghost !px-3 !py-2" aria-expanded="false"><i class="fa-solid fa-masks-theater"></i> Avatares</button>
          ${fotoProv ? `<button type="button" id="p-btn-prov" class="btn btn-ghost !px-3 !py-2"><i class="fa-brands ${nombreProv === 'Discord' ? 'fa-discord' : 'fa-google'}"></i> Usar la de ${escapeHTML(nombreProv)}</button>` : ''}
        </div>
      </div>
      <div id="p-gal" hidden class="grid grid-cols-6 gap-2" role="group" aria-label="Avatares disponibles">
        ${PRESETS.map((a) => `<button type="button" data-preset="${a.id}" aria-label="${escapeHTML(a.label)}" title="${escapeHTML(a.label)}" class="aspect-square rounded-full overflow-hidden border-2 border-transparent hover:border-galaxy-400 aria-pressed:border-white transition-colors" aria-pressed="false">${avatarHTML(presetValue(a.id), '', 44)}</button>`).join('')}
      </div>

      <div role="tablist" class="flex gap-1 border-b border-galaxy-border font-display text-sm uppercase tracking-wider">
        ${['identidad:Identidad', 'social:Social', 'host:Sistema Host'].map((t, i) => { const [k, l] = t.split(':'); return `<button type="button" role="tab" data-tab="${k}" aria-selected="${i === 0}" class="px-3 py-2 text-gray-400 aria-selected:text-galaxy-400 aria-selected:border-b-2 aria-selected:border-galaxy-400">${l}</button>`; }).join('')}
      </div>

      <div data-pane="identidad" class="space-y-4">
        <div><label class="label" for="p-name">Apodo (nombre visible)</label><input id="p-name" class="field" maxlength="30" value="${escapeHTML(prof.nombre_display)}"><p class="text-[11px] text-gray-500 mt-1">Es como te ven en tus partidos. Puedes poner lo que quieras.</p></div>
        <div>
          <label class="label" for="p-user">Usuario único</label>
          <div class="relative"><span class="absolute left-3 top-1/2 -translate-y-1/2 text-gray-500 font-display font-bold">@</span><input id="p-user" class="field !pl-7" maxlength="20" autocomplete="off" autocapitalize="none" spellcheck="false" value="${escapeHTML(prof.username)}"></div>
          <p id="p-user-st" class="text-[11px] mt-1 min-h-4"></p>
        </div>
        <div><label class="label" for="p-club">Club favorito</label><input id="p-club" class="field" maxlength="60" value="${escapeHTML(prof.club_favorito)}"></div>
      </div>

      <div data-pane="social" hidden class="space-y-4">
        <div><label class="label" for="p-bio">Biografía táctica</label><textarea id="p-bio" class="field" rows="3" maxlength="280">${escapeHTML(prof.bio)}</textarea></div>
        <div><label class="label" for="p-disc">Discord</label><input id="p-disc" class="field" maxlength="40" value="${escapeHTML(prof.discord_tag)}"></div>
        <div><label class="label" for="p-stream">Enlace de stream (https://…)</label><input id="p-stream" class="field" maxlength="200" value="${escapeHTML(prof.stream_url)}"></div>
      </div>

      <div data-pane="host" hidden class="space-y-4">
        ${switchHTML({ id: 'p-host', checked: !!prof.puede_hostear, title: 'Puedo ser host', hint: 'Te avisamos cuando alguien necesite que le hosteen una partida.' })}
        <div id="host-fields" class="space-y-4">
          <div>
            <span class="label">Velocidad de subida (Mbps)</span>
            <div class="seg" id="p-speed" role="group" aria-label="Velocidad de subida en Mbps">
              ${speeds.map((v) => `<button type="button" data-v="${v}" aria-pressed="${v === speed}">${v}</button>`).join('')}
            </div>
          </div>
          <div><span class="label">Plataforma</span>${segHTML({ id: 'p-soft', options: PLATAFORMAS.map((v) => ({ v, label: v })), current: soft, label: 'Plataforma' })}</div>
          <div><span class="label">Juego</span>${segHTML({ id: 'p-game', options: JUEGOS.map((v) => ({ v, label: v })), current: game, label: 'Juego' })}</div>
          <div><label class="label" for="p-patch">Parche / Option File</label><input id="p-patch" class="field" maxlength="80" value="${escapeHTML(prof.host_parche)}"></div>
        </div>
      </div>

      <p id="p-err" class="text-xs text-bad min-h-4" role="alert"></p>
      <button class="btn btn-primary w-full" type="submit">Guardar cambios</button>
    </form>`, { id: 'profile-modal' });

  const $ = (s) => m.querySelector(s);
  const err = $('#p-err');
  const prev = (url) => { $('#p-prev').innerHTML = avatarHTML(url, $('#p-name').value || prof.nombre_display, 64); };

  /* ---- Foto: subir / avatares predefinidos / la del proveedor ---- */
  $('#p-file').addEventListener('change', async (e) => {
    try {
      const blob = await cropSquareJpeg(e.target.files[0]);
      avatar = { kind: 'file', blob }; prev(URL.createObjectURL(blob));
      m.querySelectorAll('[data-preset]').forEach((b) => b.setAttribute('aria-pressed', 'false'));
    } catch (ex) { console.error('[perfil] imagen:', ex); err.textContent = ex.message; }
  });
  $('#p-btn-gal').addEventListener('click', () => {
    const g = $('#p-gal'); g.hidden = !g.hidden; $('#p-btn-gal').setAttribute('aria-expanded', String(!g.hidden));
  });
  $('#p-gal').addEventListener('click', (e) => {
    const b = e.target.closest('[data-preset]'); if (!b) return;
    avatar = { kind: 'preset', id: b.dataset.preset }; prev(presetValue(b.dataset.preset));
    m.querySelectorAll('[data-preset]').forEach((x) => x.setAttribute('aria-pressed', String(x === b)));
  });
  $('#p-btn-prov')?.addEventListener('click', () => {
    avatar = { kind: 'provider', url: fotoProv }; prev(fotoProv);
    m.querySelectorAll('[data-preset]').forEach((x) => x.setAttribute('aria-pressed', 'false'));
  });

  /* ---- Pestañas ---- */
  m.querySelectorAll('[data-tab]').forEach((b) => b.addEventListener('click', () => {
    m.querySelectorAll('[data-tab]').forEach((x) => x.setAttribute('aria-selected', String(x === b)));
    m.querySelectorAll('[data-pane]').forEach((x) => { x.hidden = x.dataset.pane !== b.dataset.tab; });
  }));

  /* ---- @usuario con verificación en vivo ---- */
  const handle = bindHandle($('#p-user'), $('#p-user-st'), { exceptId: uid });

  /* ---- Host: interruptor + selectores segmentados ---- */
  const hostFields = $('#host-fields');
  const syncHost = () => { hostFields.style.opacity = $('#p-host').checked ? '1' : '.4'; hostFields.inert = !$('#p-host').checked; };
  syncHost(); $('#p-host').addEventListener('change', syncHost);
  bindSeg($('#p-speed'), (v) => { speed = Number(v); });
  bindSeg($('#p-soft'), (v) => { soft = v; });
  bindSeg($('#p-game'), (v) => { game = v; });

  /* ---- Guardar ---- */
  $('#prof-form').addEventListener('submit', async (ev) => {
    ev.preventDefault(); err.textContent = '';
    const btn = ev.target.querySelector('button[type=submit]');
    const username = toUsername($('#p-user').value);
    const nombre = $('#p-name').value.trim().replace(/[<>]/g, '');
    const stream = $('#p-stream').value.trim();
    if (username.length < 3) { err.textContent = 'Tu usuario debe tener al menos 3 caracteres (a-z, 0-9 y _).'; return; }
    if (!nombre) { err.textContent = 'Escribe tu apodo.'; return; }
    if (stream && !safeUrl(stream)) { err.textContent = 'El enlace de stream debe empezar con https://'; return; }

    btn.disabled = true;
    try {
      const estado = await handle.comprobar();
      if (estado === 'ocupado') { err.textContent = 'Ese usuario ya está en uso. Elige otro.'; return; }
      if (estado === 'reservado') { err.textContent = 'Ese usuario está reservado. Elige otro.'; return; }
      const patch = {
        username, nombre_display: nombre,
        club_favorito: $('#p-club').value.trim().replace(/[<>]/g, ''),
        bio: $('#p-bio').value.trim(), discord_tag: $('#p-disc').value.trim(), stream_url: stream,
        puede_hostear: $('#p-host').checked, ancho_banda_mbps: speed,
        software_host: soft, host_juego: game, host_parche: $('#p-patch').value.trim(),
      };
      if (avatar.kind === 'preset' && presetId(presetValue(avatar.id))) patch.avatar_url = presetValue(avatar.id);
      else if (avatar.kind === 'provider') patch.avatar_url = avatar.url;
      else if (avatar.kind === 'file') {
        const path = `${uid}/avatar.jpg`;
        const up = await supabase.storage.from('avatars').upload(path, avatar.blob, { upsert: true, contentType: 'image/jpeg', cacheControl: '3600' });
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

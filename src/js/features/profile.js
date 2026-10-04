// Modal de perfil con 3 pestañas (Identidad / Social / Sistema Host) sobre la tabla `perfiles`.
// Identidad = foto + apodo (nombre visible) + @usuario (único y público, como en TikTok).
import { supabase } from '../core/supabase.js';
import { getState, refreshProfile } from '../core/session.js';
import { openModal, closeModal } from '../core/modal.js';
import { escapeHTML, safeUrl, toUsername } from '../core/dom.js';
import { cooldownInfo, USERNAME_COOLDOWN_DAYS, SPEED_BUCKETS, speedBucket, JUEGOS, SP_VERSIONES, PARCHES_PES } from '../core/rules.js';
import { PAISES } from '../../data/paises.js';
import { avatarPickerHTML, bindAvatarPicker, resolveAvatar, identityError } from './avatarPicker.js';
import { toast } from '../core/toast.js';
import { switchHTML, segHTML, bindSeg } from './formControls.js';
import { bindHandle } from './handleCheck.js';

const PLATAFORMAS = ['Ambos', 'Smash Soda', 'Parsec'];

export function openProfileModal() {
  const { session, profile: p } = getState();
  if (!session) return;
  const prof = p ?? {};
  const uid = session.user.id;
  const cd = cooldownInfo(prof);
  const fechaCd = cd.until?.toLocaleDateString('es-PE', { day: 'numeric', month: 'long', year: 'numeric' });

  // Estado local del formulario (se guarda todo junto al pulsar "Guardar").
  let speed = speedBucket(prof.ancho_banda_mbps);
  let soft = PLATAFORMAS.includes(prof.software_host) ? prof.software_host : 'Ambos';
  let game = JUEGOS.includes(prof.host_juego) ? prof.host_juego : JUEGOS[0];
  // Versión de SP Football Life (opcional): '' = sin indicar · '25'/'26'/'27' · 'otra' (texto libre).
  const verGuardada = prof.host_sp_version || '';
  let ver = !verGuardada ? '' : SP_VERSIONES.includes(verGuardada) ? verGuardada : 'otra';

  // Parche de PES 2021 (opcional): '' = sin indicar · uno de la lista · 'otro' (texto libre).
  const parcheGuardado = prof.host_parche || '';
  let parche = !parcheGuardado ? '' : PARCHES_PES.includes(parcheGuardado) ? parcheGuardado : 'otro';

  const m = openModal(`
    <form id="prof-form" class="p-6 space-y-5" novalidate>
      <div class="flex justify-between items-center">
        <h2 class="font-display font-bold text-2xl text-white uppercase tracking-widest">Mi perfil</h2>
        <button type="button" data-close aria-label="Cerrar" class="text-gray-500 hover:text-white"><i class="fa-solid fa-xmark text-xl"></i></button>
      </div>

      ${avatarPickerHTML({ avatarUrl: prof.avatar_url, name: prof.nombre_display, user: session.user })}

      <div role="tablist" class="flex gap-1 border-b border-galaxy-border font-display text-sm uppercase tracking-wider">
        ${['identidad:Identidad', 'social:Social', 'host:Sistema Host'].map((t, i) => { const [k, l] = t.split(':'); return `<button type="button" role="tab" data-tab="${k}" aria-selected="${i === 0}" class="px-3 py-2 text-gray-400 aria-selected:text-galaxy-400 aria-selected:border-b-2 aria-selected:border-galaxy-400">${l}</button>`; }).join('')}
      </div>

      <div data-pane="identidad" class="space-y-4">
        <div><label class="label" for="p-name">Apodo (nombre visible)</label><input id="p-name" class="field" maxlength="30" value="${escapeHTML(prof.nombre_display)}"><p class="text-[11px] text-gray-500 mt-1">Es como te ven en tus partidos. Puedes poner lo que quieras.</p></div>
        <div>
          <label class="label" for="p-user">Usuario único</label>
          <div class="relative"><span class="absolute left-3 top-1/2 -translate-y-1/2 text-gray-500 font-display font-bold">@</span><input id="p-user" class="field !pl-7" maxlength="20" autocomplete="off" autocapitalize="none" spellcheck="false" value="${escapeHTML(prof.username)}" ${cd.blocked ? 'disabled' : ''}></div>
          <p id="p-user-st" class="text-[11px] mt-1 min-h-4"></p>
          ${cd.blocked ? '' : prof.perfil_completo ? `<p class="text-[11px] text-gray-500">Ojo: después de cambiarlo, no podrás volver a hacerlo hasta pasados ${USERNAME_COOLDOWN_DAYS} días.</p>` : ''}
        </div>
        <div><label class="label" for="p-pais">País</label><select id="p-pais" class="field">${PAISES.map(([c, n]) => `<option value="${c}" ${c === (prof.pais_codigo || 'PE') ? 'selected' : ''}>${escapeHTML(n)}</option>`).join('')}</select></div>
        <div><label class="label" for="p-club">Club favorito</label><input id="p-club" class="field uppercase" maxlength="60" value="${escapeHTML(prof.club_favorito)}"></div>
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
              ${SPEED_BUCKETS.map((b) => `<button type="button" data-v="${b.v}" aria-pressed="${b.v === speed}">${b.label}</button>`).join('')}
            </div>
          </div>
          <div><span class="label">Plataforma</span>${segHTML({ id: 'p-soft', options: PLATAFORMAS.map((v) => ({ v, label: v })), current: soft, label: 'Plataforma' })}</div>
          <div><span class="label">Juego</span>${segHTML({ id: 'p-game', options: JUEGOS.map((v) => ({ v, label: v })), current: game, label: 'Juego' })}</div>
          <div id="f-patch">
            <span class="label">Parche <span class="text-gray-500 normal-case">(opcional)</span></span>
            <div class="seg seg-wrap" id="p-parche" role="group" aria-label="Parche de PES 2021">
              ${PARCHES_PES.map((v) => `<button type="button" data-v="${v}" aria-pressed="${v === parche}">${v}</button>`).join('')}
              <button type="button" data-v="otro" aria-pressed="${parche === 'otro'}">Otro</button>
            </div>
            <input id="p-patch" class="field mt-2" maxlength="80" placeholder="¿Cuál parche?" value="${parche === 'otro' ? escapeHTML(parcheGuardado) : ''}" ${parche === 'otro' ? '' : 'hidden'}>
            <p class="text-[11px] text-gray-500 mt-1">Toca de nuevo el parche elegido para quitarlo.</p>
          </div>
          <div id="f-ver" hidden>
            <span class="label">Versión <span class="text-gray-500 normal-case">(opcional)</span></span>
            <div class="seg" id="p-ver" role="group" aria-label="Versión de SP Football Life">
              ${SP_VERSIONES.map((v) => `<button type="button" data-v="${v}" aria-pressed="${v === ver}">${v}</button>`).join('')}
              <button type="button" data-v="otra" aria-pressed="${ver === 'otra'}">Otra</button>
            </div>
            <input id="p-ver-otra" class="field mt-2" maxlength="20" placeholder="¿Cuál? (ej. 24)" value="${ver === 'otra' ? escapeHTML(verGuardada) : ''}" ${ver === 'otra' ? '' : 'hidden'}>
            <p class="text-[11px] text-gray-500 mt-1">Toca de nuevo la versión elegida para quitarla.</p>
          </div>
          <div><label class="label" for="p-hnotas">Aclaraciones sobre tu host <span class="text-gray-500 normal-case">(opcional)</span></label><textarea id="p-hnotas" class="field" rows="3" maxlength="300" placeholder="Horarios, ping, reglas de tu sala…">${escapeHTML(prof.host_notas)}</textarea></div>
        </div>
      </div>

      <p id="p-err" class="text-xs text-bad min-h-4" role="alert"></p>
      <button class="btn btn-primary w-full" type="submit">Guardar cambios</button>
    </form>`, { id: 'profile-modal' });

  const $ = (s) => m.querySelector(s);
  const err = $('#p-err');
  const picker = bindAvatarPicker(m, { user: session.user, getName: () => $('#p-name').value || prof.nombre_display, onError: (t) => { err.textContent = t; }, currentUrl: prof.avatar_url });
  $('#p-name').addEventListener('input', () => picker.repaint());

  /* ---- Pestañas ---- */
  m.querySelectorAll('[data-tab]').forEach((b) => b.addEventListener('click', () => {
    m.querySelectorAll('[data-tab]').forEach((x) => x.setAttribute('aria-selected', String(x === b)));
    m.querySelectorAll('[data-pane]').forEach((x) => { x.hidden = x.dataset.pane !== b.dataset.tab; });
  }));

  /* ---- @usuario con verificación en vivo ---- */
  let handle = null;
  if (cd.blocked) { $('#p-user-st').className = 'text-[11px] mt-1 text-warn'; $('#p-user-st').innerHTML = `<i class="fa-solid fa-lock mr-1"></i>Podrás cambiarlo de nuevo el ${escapeHTML(fechaCd)}.`; }
  else handle = bindHandle($('#p-user'), $('#p-user-st'), { exceptId: uid });

  /* ---- Host: interruptor + selectores segmentados ---- */
  const hostFields = $('#host-fields');
  const syncHost = () => { hostFields.style.opacity = $('#p-host').checked ? '1' : '.4'; hostFields.inert = !$('#p-host').checked; };
  syncHost(); $('#p-host').addEventListener('change', syncHost);
  bindSeg($('#p-speed'), (v) => { speed = Number(v); });
  bindSeg($('#p-soft'), (v) => { soft = v; });
  const syncJuego = () => { $('#f-patch').hidden = game !== 'PES 2021'; $('#f-ver').hidden = game === 'PES 2021'; };
  bindSeg($('#p-game'), (v) => { game = v; syncJuego(); });
  syncJuego();
  // Parche opcional: tocar el elegido otra vez lo quita.
  const pintarParche = () => { m.querySelectorAll('#p-parche button').forEach((b) => b.setAttribute('aria-pressed', String(b.dataset.v === parche))); $('#p-patch').hidden = parche !== 'otro'; };
  $('#p-parche').addEventListener('click', (e) => { const b = e.target.closest('button[data-v]'); if (!b) return; parche = parche === b.dataset.v ? '' : b.dataset.v; pintarParche(); if (parche === 'otro') $('#p-patch').focus(); });
  // Versión opcional: tocar la elegida otra vez la quita.
  const pintarVer = () => { m.querySelectorAll('#p-ver button').forEach((b) => b.setAttribute('aria-pressed', String(b.dataset.v === ver))); $('#p-ver-otra').hidden = ver !== 'otra'; };
  $('#p-ver').addEventListener('click', (e) => { const b = e.target.closest('button[data-v]'); if (!b) return; ver = ver === b.dataset.v ? '' : b.dataset.v; pintarVer(); if (ver === 'otra') $('#p-ver-otra').focus(); });

  /* ---- Guardar ---- */
  $('#prof-form').addEventListener('submit', async (ev) => {
    ev.preventDefault(); err.textContent = '';
    const btn = ev.target.querySelector('button[type=submit]');
    const username = toUsername($('#p-user').value);
    const nombre = $('#p-name').value.trim().replace(/[<>]/g, '');
    const stream = $('#p-stream').value.trim();
    if (!cd.blocked && username.length < 3) { err.textContent = 'Tu usuario debe tener al menos 3 caracteres (a-z, 0-9 y _).'; return; }
    if (!nombre) { err.textContent = 'Escribe tu apodo.'; return; }
    if (stream && !safeUrl(stream)) { err.textContent = 'El enlace de stream debe empezar con https://'; return; }

    btn.disabled = true;
    try {
      const cambia = !cd.blocked && username !== prof.username;
      const estado = cambia ? await handle.comprobar() : 'libre';
      if (estado === 'ocupado') { err.textContent = 'Ese usuario ya está en uso. Elige otro.'; return; }
      if (estado === 'reservado') { err.textContent = 'Ese usuario está reservado. Elige otro.'; return; }
      const patch = {
        nombre_display: nombre, pais_codigo: $('#p-pais').value,
        club_favorito: $('#p-club').value.trim().replace(/[<>]/g, '').toUpperCase(),
        bio: $('#p-bio').value.trim(), discord_tag: $('#p-disc').value.trim(), stream_url: stream,
        puede_hostear: $('#p-host').checked, ancho_banda_mbps: speed,
        software_host: soft, host_juego: game,
        host_parche: parche === 'otro' ? $('#p-patch').value.trim().replace(/[<>]/g, '').slice(0, 80) : parche,
        host_sp_version: game === 'PES 2021' || !ver ? null : (ver === 'otra' ? $('#p-ver-otra').value.trim().replace(/[<>]/g, '').slice(0, 20) || null : ver),
        host_notas: $('#p-hnotas').value.trim().replace(/[<>]/g, ''),
      };
      if (cambia) patch.username = username;
      const nuevaFoto = await resolveAvatar(picker.get(), uid);
      if (nuevaFoto !== undefined) patch.avatar_url = nuevaFoto;
      const { error } = await supabase.from('perfiles').update(patch).eq('id', uid);
      if (error) throw error;
      await refreshProfile();
      closeModal('profile-modal');
      toast('Perfil actualizado.', 'ok');
    } catch (ex) {
      console.error('[perfil] guardar:', ex);
      err.textContent = identityError(ex);
    } finally { btn.disabled = false; }
  });
}

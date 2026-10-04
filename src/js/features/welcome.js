// Formulario de bienvenida: se muestra a quien aún no completó su perfil (perfiles.perfil_completo = false):
// todos los que entran con Discord o Google, y quien se registró con correo sin pasar por el formulario.
// Aquí el @usuario se elige LIBRE (el límite de 14 días empieza a contar después, ver trigger de la BD).
import { supabase } from '../core/supabase.js';
import { onSession, refreshProfile } from '../core/session.js';
import { openModal, closeModal } from '../core/modal.js';
import { escapeHTML, toUsername } from '../core/dom.js';
import { providerName } from '../core/avatar.js';
import { toast } from '../core/toast.js';
import { PAISES } from '../../data/paises.js';
import { avatarPickerHTML, bindAvatarPicker, resolveAvatar, identityError } from './avatarPicker.js';
import { bindHandle } from './handleCheck.js';

const SKIP_KEY = 'pes-welcome-skip';
const skipped = (uid) => { try { return sessionStorage.getItem(SKIP_KEY) === uid; } catch { return false; } };
const markSkipped = (uid) => { try { sessionStorage.setItem(SKIP_KEY, uid); } catch { /* sin almacenamiento: se volverá a mostrar, no pasa nada */ } };

let open = false;

function show(session, prof) {
  open = true;
  const uid = session.user.id;
  const prov = providerName(session.user);
  const m = openModal(`
    <form id="w-form" class="p-6 space-y-5" novalidate>
      <div>
        <h2 class="font-display font-bold text-2xl text-white uppercase tracking-widest">¡Bienvenido${prov ? ` desde ${escapeHTML(prov)}` : ''}!</h2>
        <p class="text-sm text-gray-400 mt-1">Arma tu perfil en 30 segundos. Podrás cambiar casi todo después en «Mi perfil».</p>
      </div>
      ${avatarPickerHTML({ avatarUrl: prof.avatar_url, name: prof.nombre_display, user: session.user, ns: 'w' })}
      <div><label class="label" for="w-name">Apodo (nombre visible)</label><input id="w-name" class="field" maxlength="30" value="${escapeHTML(prof.nombre_display)}"><p class="text-[11px] text-gray-500 mt-1">Es como te ven en tus partidos.</p></div>
      <div>
        <label class="label" for="w-user">Usuario único</label>
        <div class="relative"><span class="absolute left-3 top-1/2 -translate-y-1/2 text-gray-500 font-display font-bold">@</span><input id="w-user" class="field !pl-7" maxlength="20" autocomplete="off" autocapitalize="none" spellcheck="false" value="${escapeHTML(prof.username)}"></div>
        <p id="w-user-st" class="text-[11px] mt-1 min-h-4"></p>
        <p class="text-[11px] text-gray-500">Elígelo bien: después de guardar solo podrás cambiarlo cada 14 días.</p>
      </div>
      <div class="grid grid-cols-2 gap-3">
        <div><label class="label" for="w-pais">País</label><select id="w-pais" class="field">${PAISES.map(([c, n]) => `<option value="${c}" ${c === (prof.pais_codigo || 'PE') ? 'selected' : ''}>${escapeHTML(n)}</option>`).join('')}</select></div>
        <div><label class="label" for="w-club">Club favorito <span class="text-gray-500 normal-case">(opcional)</span></label><input id="w-club" class="field" maxlength="60" value="${escapeHTML(prof.club_favorito)}"></div>
      </div>
      <p id="w-err" class="text-xs text-bad min-h-4" role="alert"></p>
      <div class="flex flex-col-reverse sm:flex-row gap-2">
        <button type="button" data-close class="btn btn-ghost sm:flex-1">Lo haré después</button>
        <button type="submit" class="btn btn-primary sm:flex-1">Guardar y entrar</button>
      </div>
    </form>`, { id: 'welcome-modal', persistent: true, onClose: () => { open = false; markSkipped(uid); } });

  const $ = (s) => m.querySelector(s); const err = $('#w-err');
  const picker = bindAvatarPicker(m, { user: session.user, getName: () => $('#w-name').value || prof.nombre_display, onError: (t) => { err.textContent = t; }, currentUrl: prof.avatar_url, ns: 'w' });
  $('#w-name').addEventListener('input', () => picker.repaint());
  const handle = bindHandle($('#w-user'), $('#w-user-st'), { exceptId: uid });

  $('#w-form').addEventListener('submit', async (ev) => {
    ev.preventDefault(); err.textContent = '';
    const btn = ev.target.querySelector('button[type=submit]');
    const username = toUsername($('#w-user').value);
    const nombre = $('#w-name').value.trim().replace(/[<>]/g, '');
    if (username.length < 3) { err.textContent = 'Tu usuario debe tener al menos 3 caracteres (a-z, 0-9 y _).'; return; }
    if (!nombre) { err.textContent = 'Escribe tu apodo.'; return; }
    btn.disabled = true;
    try {
      const estado = await handle.comprobar();
      if (estado === 'ocupado') { err.textContent = 'Ese usuario ya está en uso. Elige otro.'; return; }
      if (estado === 'reservado') { err.textContent = 'Ese usuario está reservado. Elige otro.'; return; }
      const patch = { username, nombre_display: nombre, pais_codigo: $('#w-pais').value, club_favorito: $('#w-club').value.trim().replace(/[<>]/g, '').toUpperCase(), perfil_completo: true };
      const foto = await resolveAvatar(picker.get(), uid);
      if (foto !== undefined) patch.avatar_url = foto;
      const { error } = await supabase.from('perfiles').update(patch).eq('id', uid);
      if (error) throw error;
      await refreshProfile();
      closeModal('welcome-modal');
      toast('¡Perfil listo! Ya eres parte de la red.', 'ok');
    } catch (ex) {
      console.error('[bienvenida] guardar:', ex);
      err.textContent = identityError(ex);
    } finally { btn.disabled = false; }
  });
}

export function initWelcome() {
  onSession(({ session, profile }) => {
    if (!session || !profile || profile.perfil_completo !== false) return;
    if (open || skipped(session.user.id) || document.querySelector('.modal-backdrop')) return;
    show(session, profile);
  });
}

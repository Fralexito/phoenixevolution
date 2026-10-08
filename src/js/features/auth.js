// Login, registro y OAuth (Discord / Google).
import { supabase } from '../core/supabase.js';
import { siteHome, href } from '../core/config.js';
import { openModal, closeModal } from '../core/modal.js';
import { escapeHTML } from '../core/dom.js';
import { toast } from '../core/toast.js';
import { bindHandle, MIN_HANDLE } from './handleCheck.js';

const ERRORS = {
  'Invalid login credentials': 'Correo o contraseña incorrectos.',
  'Email not confirmed': 'Debes confirmar tu correo antes de entrar. Revisa tu bandeja.',
  'User already registered': 'Ese correo ya está registrado. Intenta iniciar sesión.',
};
const friendly = (e) => ERRORS[e?.message] || (/password/i.test(e?.message || '') ? 'La contraseña debe tener al menos 8 caracteres.' : e?.message || 'Error inesperado.');

export function openAuthModal(mode = 'login') {
  const isReg = mode === 'register';
  const m = openModal(`
    <div class="p-6 space-y-5">
      <div class="flex justify-between items-center">
        <h2 class="font-display font-bold text-2xl text-white uppercase tracking-widest">${isReg ? 'Crear cuenta' : 'Iniciar sesión'}</h2>
        <button type="button" data-close aria-label="Cerrar" class="text-gray-500 hover:text-white"><i class="fa-solid fa-xmark text-xl"></i></button>
      </div>
      <div class="grid grid-cols-2 gap-3">
        <button type="button" data-oauth="discord" class="btn btn-ghost"><i class="fa-brands fa-discord text-[#5865F2]"></i> Discord</button>
        <button type="button" data-oauth="google" class="btn btn-ghost"><svg viewBox="0 0 48 48" class="w-4 h-4" aria-hidden="true"><path fill="#4285F4" d="M45.12 24.5c0-1.56-.14-3.06-.4-4.5H24v8.51h11.84c-.51 2.75-2.06 5.08-4.39 6.64v5.52h7.11c4.16-3.83 6.56-9.47 6.56-16.17z"/><path fill="#34A853" d="M24 46c5.94 0 10.92-1.97 14.56-5.33l-7.11-5.52c-1.97 1.32-4.49 2.1-7.45 2.1-5.73 0-10.58-3.87-12.31-9.07H4.34v5.7C7.96 41.07 15.4 46 24 46z"/><path fill="#FBBC05" d="M11.69 28.18C11.25 26.86 11 25.45 11 24s.25-2.86.69-4.18v-5.7H4.34C2.85 17.09 2 20.45 2 24c0 3.55.85 6.91 2.34 9.88l7.35-5.7z"/><path fill="#EA4335" d="M24 10.75c3.23 0 6.13 1.11 8.41 3.29l6.31-6.31C34.91 4.18 29.93 2 24 2 15.4 2 7.96 6.93 4.34 14.12l7.35 5.7c1.73-5.2 6.58-9.07 12.31-9.07z"/></svg> Google</button>
      </div>
      <div class="flex items-center gap-3 text-[12px] text-gray-500 uppercase tracking-widest"><span class="flex-1 h-px bg-galaxy-border"></span>o con correo<span class="flex-1 h-px bg-galaxy-border"></span></div>
      <form id="auth-form" class="space-y-4" novalidate>
        ${isReg ? `
        <div>
          <label class="label" for="a-user">Usuario único</label>
          <div class="relative"><span class="absolute left-3 top-1/2 -translate-y-1/2 text-gray-500 font-display font-bold">@</span><input id="a-user" class="field !pl-7" maxlength="20" required autocomplete="off" autocapitalize="none" spellcheck="false" placeholder="fralex10"></div>
          <p id="a-user-st" class="text-[12px] mt-1 min-h-4"></p>
        </div>
        <div><label class="label" for="a-tag">Apodo (nombre visible)</label><input id="a-tag" class="field" maxlength="30" required autocomplete="nickname" placeholder="Ej: El Fénix"><p class="text-[12px] text-gray-500 mt-1">El @ es único y es tu identidad (como en TikTok). El apodo es el nombre que verán en tus partidos. Puedes cambiar ambos después.</p></div>` : ''}
        <div><label class="label" for="a-mail">Correo</label><input id="a-mail" type="email" class="field" required autocomplete="email"></div>
        <div><label class="label" for="a-pass">Contraseña</label><input id="a-pass" type="password" class="field" required minlength="8" autocomplete="${isReg ? 'new-password' : 'current-password'}"></div>
        ${isReg ? `<label class="flex items-start gap-2 text-[12px] text-gray-400"><input id="a-legal" type="checkbox" required class="mt-0.5 w-4 h-4 shrink-0 accent-cyan-400"><span>Tengo 13 años o más y acepto los <a href="${escapeHTML(href('legal/terminos/'))}" target="_blank" class="text-galaxy-400 hover:underline">Términos</a>, el <a href="${escapeHTML(href('legal/reglamento/'))}" target="_blank" class="text-galaxy-400 hover:underline">Reglamento</a> y la <a href="${escapeHTML(href('legal/privacidad/'))}" target="_blank" class="text-galaxy-400 hover:underline">Política de privacidad</a>.</span></label>` : ''}
        <p id="a-err" class="text-xs text-bad min-h-4" role="alert"></p>
        <button class="btn btn-primary w-full" type="submit">${isReg ? 'Registrarme' : 'Entrar'}</button>
      </form>
      <button type="button" data-switch class="w-full text-xs text-gray-400 hover:text-galaxy-400">${isReg ? '¿Ya tienes cuenta? Inicia sesión' : '¿No tienes cuenta? Regístrate'}</button>
    </div>`, { id: 'auth-modal' });

  const err = m.querySelector('#a-err');
  const handle = isReg ? bindHandle(m.querySelector('#a-user'), m.querySelector('#a-user-st')) : null;
  m.querySelector('[data-switch]').addEventListener('click', () => openAuthModal(isReg ? 'login' : 'register'));
  m.querySelectorAll('[data-oauth]').forEach((b) => b.addEventListener('click', () => loginSocial(b.dataset.oauth)));

  m.querySelector('#auth-form').addEventListener('submit', async (ev) => {
    ev.preventDefault();
    err.textContent = '';
    if (m.querySelector('#a-legal') && !m.querySelector('#a-legal').checked) { err.textContent = 'Para crear tu cuenta debes aceptar los Términos, el Reglamento y la Política de privacidad.'; return; }
    const btn = ev.target.querySelector('button[type=submit]');
    const email = m.querySelector('#a-mail').value.trim();
    const password = m.querySelector('#a-pass').value;
    const apodo = isReg ? m.querySelector('#a-tag').value.trim().replace(/[<>]/g, '') : '';
    const usuario = isReg ? m.querySelector('#a-user').value.trim() : '';
    if (!email || password.length < 8) { err.textContent = 'Escribe tu correo y una contraseña de 8+ caracteres.'; return; }
    if (isReg && usuario.length < MIN_HANDLE) { err.textContent = 'Elige tu @usuario (mínimo 3 caracteres: a-z, 0-9 o _).'; return; }
    if (isReg && apodo.length < 2) { err.textContent = 'Escribe tu apodo (mínimo 2 caracteres).'; return; }
    btn.disabled = true;
    try {
      if (isReg) {
        const estado = await handle.comprobar();
        if (estado === 'ocupado') throw new Error('Ese @usuario ya está en uso. Elige otro.');
        if (estado === 'reservado') throw new Error('Ese @usuario está reservado. Elige otro.');
        // El trigger handle_new_user (BD) lee 'usuario' (@) y 'apodo'. 'gamertag' se envía también por compatibilidad.
        const { data, error } = await supabase.auth.signUp({ email, password, options: { data: { usuario, apodo, gamertag: apodo }, emailRedirectTo: siteHome() } });
        if (error) throw error;
        closeModal('auth-modal');
        toast(data.session ? '¡Cuenta creada! Bienvenido.' : 'Cuenta creada. Revisa tu correo para confirmarla.', 'ok');
      } else {
        const { error } = await supabase.auth.signInWithPassword({ email, password });
        if (error) throw error;
        closeModal('auth-modal');
        toast('Sesión iniciada.', 'ok');
      }
    } catch (e) {
      console.error('[auth]', e);
      err.innerHTML = escapeHTML(friendly(e));
    } finally { btn.disabled = false; }
  });
}

export async function loginSocial(provider) {
  const { error } = await supabase.auth.signInWithOAuth({ provider, options: { redirectTo: siteHome() } });
  if (error) { console.error('[oauth]', error); toast(`No se pudo iniciar con ${provider}: ${error.message}`, 'error'); }
}

export async function logout() {
  const { error } = await supabase.auth.signOut();
  if (error) { console.error('[logout]', error); toast('No se pudo cerrar sesión.', 'error'); return; }
  toast('Sesión cerrada.', 'info');
}

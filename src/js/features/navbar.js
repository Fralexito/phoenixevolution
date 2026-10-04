// Pinta la zona de usuario de la cabecera según la sesión (único lugar que lo hace).
import { onSession } from '../core/session.js';
import { escapeHTML, safeUrl } from '../core/dom.js';
import { href } from '../core/config.js';
import { openAuthModal, logout } from './auth.js';
import { openProfileModal } from './profile.js';
import { initNotifications } from './notifications.js';

let stopNotif = null;

function avatarHTML(p, session) {
  const name = p?.nombre_display || session.user.email || '?';
  const url = safeUrl(p?.avatar_url);
  return url
    ? `<img src="${escapeHTML(url)}" alt="" class="w-full h-full object-cover">`
    : `<span class="font-display font-bold text-galaxy-400">${escapeHTML(name.slice(0, 1).toUpperCase())}</span>`;
}

function render({ session, profile }) {
  const box = document.getElementById('nav-auth');
  if (!box) return;
  stopNotif?.(); stopNotif = null;

  if (!session) {
    box.innerHTML = `
      <button type="button" data-act="login" class="text-xs font-display font-bold uppercase tracking-wider text-gray-300 hover:text-galaxy-400">Entrar</button>
      <button type="button" data-act="register" class="btn btn-primary !py-1.5 !px-3 !text-xs">Registrarse</button>`;
  } else {
    const name = profile?.nombre_display || 'Jugador';
    box.innerHTML = `
      <div class="relative"><button type="button" id="btn-notif" aria-label="Notificaciones" class="relative text-gray-400 hover:text-galaxy-400">
        <i class="fa-solid fa-bell text-lg"></i><span id="notif-dot" hidden class="absolute -top-2 -right-2 min-w-4 h-4 px-1 rounded-full bg-bad text-white text-[9px] font-bold leading-4 text-center"></span></button>
        <div id="dropdown-notif" hidden class="fixed left-2 right-2 top-16 sm:absolute sm:left-auto sm:right-0 sm:top-auto sm:mt-3 sm:w-80 bg-galaxy-panel border border-galaxy-border rounded-xl shadow-2xl z-[300] overflow-hidden"></div></div>
      <div class="relative">
        <button type="button" data-act="menu" aria-haspopup="true" class="flex items-center gap-2">
          <span class="w-9 h-9 rounded-full overflow-hidden border border-galaxy-400/50 bg-galaxy-card flex items-center justify-center">${avatarHTML(profile, session)}</span>
          <span class="hidden md:block font-display font-bold text-sm text-white max-w-28 truncate">${escapeHTML(name)}</span>
        </button>
        <div id="user-menu" hidden class="absolute right-0 mt-3 w-52 bg-galaxy-panel border border-galaxy-border rounded-xl shadow-2xl z-[300] py-1 font-display text-sm uppercase tracking-wider">
          <a href="${escapeHTML(href('duelos/#mis-partidos'))}" class="block px-4 py-2.5 text-gray-300 hover:bg-white/5 hover:text-galaxy-400"><i class="fa-solid fa-gamepad mr-2"></i>Mis partidos</a>
          <button type="button" data-act="profile" class="w-full text-left px-4 py-2.5 text-gray-300 hover:bg-white/5 hover:text-galaxy-400"><i class="fa-solid fa-user mr-2"></i>Mi perfil</button>
          <button type="button" data-act="logout" class="w-full text-left px-4 py-2.5 text-gray-300 hover:bg-white/5 hover:text-bad"><i class="fa-solid fa-right-from-bracket mr-2"></i>Salir</button>
        </div>
      </div>`;
    stopNotif = initNotifications(session.user.id);
  }
}

export function initNavbar() {
  const box = document.getElementById('nav-auth');
  if (!box) return;
  box.addEventListener('click', (e) => {
    const act = e.target.closest('[data-act]')?.dataset.act;
    const menu = document.getElementById('user-menu');
    if (act === 'login') openAuthModal('login');
    else if (act === 'register') openAuthModal('register');
    else if (act === 'menu') menu.hidden = !menu.hidden;
    else if (act === 'profile') { menu.hidden = true; openProfileModal(); }
    else if (act === 'logout') { menu.hidden = true; logout(); }
  });
  document.addEventListener('click', (e) => {
    if (!e.target.closest('#nav-auth')) document.getElementById('user-menu')?.setAttribute('hidden', '');
  });
  onSession(render);
}

// Pinta la zona de usuario de la cabecera según la sesión (único lugar que lo hace).
import { onSession, can, tieneRolStaff, staffVisible_, setStaffVisible } from '../core/session.js';
import { ROL_INFO, normalizarRol, esStaff } from '../core/roles.js';
import { escapeHTML } from '../core/dom.js';
import { toast } from '../core/toast.js';
import { avatarHTML } from '../core/avatar.js';
import { href } from '../core/config.js';
import { openAuthModal, logout } from './auth.js';
import { openProfileModal } from './profile.js';
import { initNotifications } from './notifications.js';
import { iniciarPendientes } from './pendientes.js';
import { ACCOUNT_NAV } from '../../data/site.js';

let stopNotif = null;
let stopPend = null;

/** Filas «pendientes» del menú: solo aparecen si hay algo que atender; el punto rojo del avatar avisa sin abrir el menú. */
function pintarPendientes({ mensajes, solicitudes }) {
  const caja = document.getElementById('menu-pendientes'); const punto = document.getElementById('avatar-dot');
  if (!caja || !punto) return;
  const fila = (ruta, icono, texto, n) => `<a href="${escapeHTML(href(ruta))}" class="flex items-center gap-2 px-4 py-2.5 text-gray-200 hover:bg-white/5 hover:text-galaxy-400"><i class="fa-solid ${icono} w-4 text-center text-galaxy-400"></i><span class="flex-1 truncate">${texto}</span><b class="min-w-5 h-5 px-1 rounded-full bg-bad text-white text-[12px] leading-5 text-center">${n > 9 ? '9+' : n}</b></a>`;
  caja.innerHTML = (mensajes ? fila('mensajes/', 'fa-comments', 'Sin leer', mensajes) : '') + (solicitudes ? fila('amigos/', 'fa-user-plus', 'Solicitudes', solicitudes) : '');
  caja.hidden = !(mensajes || solicitudes); punto.hidden = !(mensajes || solicitudes);
}

/** Atajos de «Mi cuenta» para móvil (en PC ya están en la barra lateral): cuadrícula 2x2 pequeña y discreta dentro del menú de la foto. */
const ATAJOS_MOVIL = ACCOUNT_NAV.filter((n) => n.path && !n.abajo)
  .map((n) => `<a href="${escapeHTML(href(n.path))}" ${n.staff ? `data-solo-staff="${escapeHTML(n.staff)}" hidden` : ''} class="flex items-center gap-2 px-3 py-2 text-[12px] text-gray-400 hover:text-galaxy-400"><i class="fa-solid ${n.icon} w-4 text-center text-gray-500"></i><span class="truncate">${escapeHTML(n.label)}</span></a>`).join('');

function render({ session, profile }) {
  const box = document.getElementById('nav-auth');
  if (!box) return;
  // CSS (components.css) usa esto: en PC el botón de 3 rayas solo existe con sesión.
  document.documentElement.dataset.sesion = session ? 'si' : 'no';
  stopNotif?.(); stopNotif = null;
  stopPend?.(); stopPend = null;

  if (!session) {
    box.innerHTML = `
      <button type="button" data-act="login" class="text-xs font-display font-bold uppercase tracking-wider text-gray-300 hover:text-galaxy-400">Entrar</button>
      <button type="button" data-act="register" class="btn btn-primary !py-1.5 !px-3 !text-xs">Registrarse</button>`;
  } else {
    const name = profile?.nombre_display || 'Jugador';
    box.innerHTML = `
      <div class="relative mr-2 sm:mr-3"><button type="button" id="btn-notif" aria-label="Notificaciones" class="relative text-gray-400 hover:text-galaxy-400">
        <i class="fa-solid fa-bell text-lg"></i><span id="notif-dot" hidden class="absolute -top-2 -right-2 min-w-4 h-4 px-1 rounded-full bg-bad text-white text-[12px] font-bold leading-4 text-center"></span></button>
        <div id="dropdown-notif" hidden class="fixed left-2 right-2 top-16 sm:absolute sm:left-auto sm:right-0 sm:top-auto sm:mt-3 sm:w-80 bg-galaxy-panel border border-galaxy-border rounded-xl shadow-2xl z-[300] overflow-hidden"></div></div>
      <div class="relative">
        <button type="button" data-act="menu" aria-haspopup="true" class="flex items-center gap-2">
          <span class="relative w-9 h-9 rounded-full border border-galaxy-400/50 bg-galaxy-card flex items-center justify-center"><i id="avatar-dot" hidden class="absolute -top-0.5 -right-0.5 w-3 h-3 rounded-full bg-bad border-2 border-galaxy-panel z-10"></i><span class="w-full h-full rounded-full overflow-hidden flex items-center justify-center">${avatarHTML(profile?.avatar_url, profile?.nombre_display || session.user.email, 36)}</span></span>
          <span class="hidden md:block font-display font-bold text-sm text-white max-w-28 truncate">${escapeHTML(name)}</span>
        </button>
        <div id="user-menu" hidden class="absolute right-0 mt-3 w-60 bg-galaxy-panel border border-galaxy-border rounded-xl shadow-2xl z-[300] overflow-hidden font-display text-sm uppercase tracking-wider">
          <div class="px-4 py-3 border-b border-galaxy-border/70"><p class="text-white font-bold truncate">${escapeHTML(name)}</p>${profile?.username ? `<p class="text-[12px] text-gray-400 normal-case tracking-normal truncate">@${escapeHTML(profile.username)}</p>` : ''}${esStaff(profile?.rol) ? `<p class="mt-1 text-[12px] text-galaxy-400 normal-case tracking-normal"><i class="fa-solid ${ROL_INFO[normalizarRol(profile.rol)].icono} mr-1"></i>${escapeHTML(ROL_INFO[normalizarRol(profile.rol)].etiqueta)}</p>` : ''}</div>
          <div id="menu-pendientes" hidden class="border-b border-galaxy-border/70 py-1"></div>
          <div class="lg:hidden grid grid-cols-2 border-b border-galaxy-border/70 py-1 normal-case tracking-normal">${ATAJOS_MOVIL}</div>
          <div class="py-1">
            <button type="button" data-act="profile" class="w-full text-left px-4 py-2.5 text-gray-300 hover:bg-white/5 hover:text-galaxy-400 uppercase tracking-wider"><i class="fa-solid fa-user mr-2"></i>Mi perfil</button>
            <a href="${escapeHTML(href('ajustes/'))}" class="block px-4 py-2.5 text-gray-300 hover:bg-white/5 hover:text-galaxy-400"><i class="fa-solid fa-gear mr-2"></i>Configuración</a>
            ${tieneRolStaff() ? `<button type="button" data-act="staff-ui" role="switch" aria-checked="${staffVisible_()}" class="w-full text-left px-4 py-2.5 text-gray-300 hover:bg-white/5 hover:text-galaxy-400 uppercase tracking-wider"><i class="fa-solid ${staffVisible_() ? 'fa-eye' : 'fa-eye-slash'} mr-2"></i>Opciones de staff: <b class="${staffVisible_() ? 'text-ok' : 'text-gray-500'}">${staffVisible_() ? 'visibles' : 'ocultas'}</b></button>` : ''}
            <button type="button" data-act="logout" class="w-full text-left px-4 py-2.5 text-gray-300 hover:bg-white/5 hover:text-bad uppercase tracking-wider"><i class="fa-solid fa-right-from-bracket mr-2"></i>Salir</button>
          </div>
        </div>
      </div>`;
    stopNotif = initNotifications(session.user.id);
    stopPend = iniciarPendientes(pintarPendientes);
    document.querySelectorAll('#user-menu [data-solo-staff]').forEach((el) => { el.hidden = !can(el.dataset.soloStaff || 'verAuditoria'); });
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
    else if (act === 'staff-ui') { setStaffVisible(!staffVisible_()); toast(staffVisible_() ? 'Opciones de staff visibles.' : 'Opciones de staff ocultas: ves la web como un jugador.', 'info'); }
  });
  document.addEventListener('click', (e) => {
    if (!e.target.closest('#nav-auth')) document.getElementById('user-menu')?.setAttribute('hidden', '');
  });
  onSession(render);
}

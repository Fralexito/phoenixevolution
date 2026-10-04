// Menú lateral: abrir/cerrar, Escape, clic en el fondo, foco accesible (inert) y grupo «Mi cuenta» según la sesión.
import { onSession } from '../core/session.js';
import { openProfileModal } from './profile.js';
import { logout } from './auth.js';

export function initSidebar() {
  const menu = document.getElementById('sidebar-menu');
  const overlay = document.getElementById('sidebar-overlay');
  const openBtn = document.getElementById('btn-menu');
  const closeBtn = document.getElementById('btn-menu-close');
  if (!menu || !overlay || !openBtn) { console.warn('[sidebar] faltan elementos'); return; }

  let timer;
  const open = () => {
    clearTimeout(timer);
    overlay.hidden = false; menu.inert = false;
    requestAnimationFrame(() => menu.classList.remove('translate-x-full'));
    openBtn.setAttribute('aria-expanded', 'true');
    closeBtn?.focus();
  };
  const close = () => {
    menu.classList.add('translate-x-full'); menu.inert = true;
    openBtn.setAttribute('aria-expanded', 'false');
    timer = setTimeout(() => { overlay.hidden = true; }, 300);
    openBtn.focus();
  };
  const account = document.getElementById('sidebar-account');
  onSession(({ session }) => { if (account) account.hidden = !session; });
  menu.addEventListener('click', (e) => {
    const act = e.target.closest('[data-action]')?.dataset.action;
    const link = e.target.closest('a[href]');
    if (act === 'profile') { close(); openProfileModal(); }
    else if (act === 'logout') { close(); logout(); }
    else if (link) close();   // los enlaces dentro de la misma página (#mis-partidos) también cierran el menú
  });
  openBtn.addEventListener('click', open);
  closeBtn?.addEventListener('click', close);
  overlay.addEventListener('click', close);
  document.addEventListener('keydown', (e) => { if (e.key === 'Escape' && !menu.inert) close(); });
}

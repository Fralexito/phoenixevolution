// Menú lateral: abrir/cerrar, Escape, clic en el fondo, foco accesible (inert) y grupo «Mi cuenta» según la sesión.
import { onSession, can } from '../core/sistema/session.js';
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
  onSession(({ session }) => {
    if (account) account.hidden = !session;
    // Enlaces solo para el staff (p. ej. Auditoría, Moderación): cada uno declara su permiso en data-solo-staff. La página y la BD vuelven a comprobarlo.
    menu.querySelectorAll('[data-solo-staff]').forEach((el) => { el.hidden = !can(el.dataset.soloStaff || 'verAuditoria'); });
    // …y su contrario: lo que el staff NO necesita ver (p. ej. «Crear» de torneos, porque el staff tiene «Crear» de ligas). Antes salían los dos.
    menu.querySelectorAll('[data-no-staff]').forEach((el) => { el.hidden = can(el.dataset.noStaff); });
    // Red de enlaces: si a un grupo le queda un número impar de cuadros visibles, el último ocupa el ancho entero (nada queda «cojo»).
    menu.querySelectorAll('.red-items').forEach((g) => {
      const conBarra = matchMedia('(max-width: 767.98px)').matches;   // ahí se esconden los que ya están en la barra de abajo
      const vis = [...g.children].filter((a) => !a.hidden && !(conBarra && a.hasAttribute('data-en-barra'))); g.querySelectorAll('[data-ancho]').forEach((a) => a.removeAttribute('data-ancho'));
      if (vis.length % 2) vis.at(-1).dataset.ancho = '';
    });
  });
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

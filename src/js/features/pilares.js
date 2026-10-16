import { onSession, can } from '../core/session.js';
// Pilares del menú de arriba: el desplegable se abre con hover/teclado por CSS; aquí solo el clic (pantallas táctiles),
// Escape y clic afuera para cerrar, y aria-expanded para lectores de pantalla.
export function montarPilares() {
  const pilares = [...document.querySelectorAll('.pilar')]; if (!pilares.length) return;
  // Entradas solo para staff (p. ej. «Crear mi liga»): se muestran si la persona tiene ese permiso.
  onSession(() => { document.querySelectorAll('.pilar [data-solo-staff], .pilar-tabs [data-solo-staff]').forEach((el) => { el.hidden = !can(el.dataset.soloStaff); });
    document.querySelectorAll('.pilar [data-no-staff], .pilar-tabs [data-no-staff]').forEach((el) => { el.hidden = can(el.dataset.noStaff); }); });
  const cerrar = (salvo) => pilares.forEach((p) => { if (p !== salvo) { p.removeAttribute('data-abierto'); p.removeAttribute('data-cerrado'); p.querySelector('.pilar-btn')?.setAttribute('aria-expanded', 'false'); } });
  let tactil = false;   // el último toque fue con el dedo: ahí el «hover» es un reflejo del toque y no cuenta como abierto
  document.addEventListener('pointerdown', (e) => { tactil = e.pointerType === 'touch' || e.pointerType === 'pen'; }, true);
  pilares.forEach((p) => {
    const b = p.querySelector('.pilar-btn'); const panel = p.querySelector('.pilar-panel');
    // Si el panel se saldría de la pantalla (ventana angosta), se corre lo justo hacia adentro.
    const encajar = () => { if (!panel) return; panel.style.setProperty('--desp', '0px'); const r = panel.getBoundingClientRect(); const m = 8; const w = document.documentElement.clientWidth;
      const dx = r.left < m ? m - r.left : (r.right > w - m ? w - m - r.right : 0); panel.style.setProperty('--desp', `${Math.round(dx)}px`); };
    ['mouseenter', 'focusin', 'click'].forEach((ev) => p.addEventListener(ev, encajar)); window.addEventListener('resize', encajar);
    // Un clic ALTERNA: si el panel se ve (por hover, foco o clic) lo cierra y suelta el foco; si no, lo abre.
    b?.addEventListener('click', () => {
      const visible = tactil ? p.hasAttribute('data-abierto') : (p.hasAttribute('data-abierto') || (panel && getComputedStyle(panel).visibility === 'visible'));
      cerrar(p);
      if (visible) { p.removeAttribute('data-abierto'); p.setAttribute('data-cerrado', ''); b.setAttribute('aria-expanded', 'false'); b.blur(); }
      else { p.removeAttribute('data-cerrado'); p.setAttribute('data-abierto', ''); b.setAttribute('aria-expanded', 'true'); }
    });
    p.addEventListener('mouseenter', () => { if (!tactil) b?.setAttribute('aria-expanded', p.hasAttribute('data-cerrado') ? 'false' : 'true'); });
    p.addEventListener('mouseleave', () => { p.removeAttribute('data-cerrado'); if (!p.hasAttribute('data-abierto')) b?.setAttribute('aria-expanded', 'false'); });
  });
  document.addEventListener('click', (e) => { if (!e.target.closest('.pilar')) cerrar(); });
  document.addEventListener('keydown', (e) => { if (e.key === 'Escape') { cerrar(); document.activeElement?.closest?.('.pilar')?.querySelector('.pilar-btn')?.blur(); } });
}

// «Empieza en 3 pasos» (patrón de bienvenida guiada de FACEIT/PlayVS): solo en la portada y solo para quien NO tiene sesión.
import { onSession } from '../core/session.js';
import { href } from '../core/config.js';

let caja = null;
export function montarPrimerosPasos() {
  const ancla = document.querySelector('[data-vt-grid]')?.closest('.vt-escena'); if (!ancla) return;
  onSession(({ session }) => {
    if (session) { caja?.remove(); caja = null; return; }
    if (caja) return;
    caja = document.createElement('section'); caja.className = 'pasos3'; caja.setAttribute('aria-label', 'Empieza en 3 pasos');
    caja.innerHTML = `<h2 class="pasos3-t">Empieza en 3 pasos</h2><ol class="pasos3-l">
      <li><button type="button" class="paso3" data-paso-registro><b class="paso3-n">1</b><span><b>Crea tu cuenta</b><small>Gratis, con Discord, Google o correo</small></span></button></li>
      <li><a class="paso3" href="${href('liga/')}"><b class="paso3-n">2</b><span><b>Mira la liga</b><small>Tabla, resultados y tu club</small></span></a></li>
      <li><a class="paso3" href="${href('duelos/')}"><b class="paso3-n">3</b><span><b>Juega tu primer duelo</b><small>Rétalo y sube en el ranking</small></span></a></li></ol>`;
    ancla.insertAdjacentElement('afterend', caja);
    caja.querySelector('[data-paso-registro]').addEventListener('click', () => import('./auth.js').then((m) => m.openAuthModal('register')));
  });
}

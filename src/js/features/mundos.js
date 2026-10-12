// «¿Qué quieres hacer?» de la portada (FX.portada): pestañas cápsula de los 4 mundos.
// Al tocar una pestaña se muestra su panel; con el teclado se mueve con flechas, Inicio y Fin.
import { pestanaSegunTecla } from '../core/pestanas.js';

export function montarMundos(raiz = document.querySelector('[data-mundos]')) {
  if (!raiz) return;
  const tabs = [...raiz.querySelectorAll('[role="tab"]')];
  const elegir = (i, enfocar = false) => {
    tabs.forEach((t, j) => {
      const si = j === i;
      t.setAttribute('aria-selected', si ? 'true' : 'false');
      t.tabIndex = si ? 0 : -1;
      const panel = document.getElementById(t.getAttribute('aria-controls'));
      if (panel) panel.hidden = !si;
    });
    if (enfocar) tabs[i].focus();
    tabs[i].scrollIntoView({ block: 'nearest', inline: 'nearest' });
  };
  tabs.forEach((t, i) => {
    t.addEventListener('click', () => elegir(i));
    t.addEventListener('keydown', (e) => {
      const n = pestanaSegunTecla(i, tabs.length, e.key);
      if (n === null) return;
      e.preventDefault();
      elegir(n, true);
    });
  });
}

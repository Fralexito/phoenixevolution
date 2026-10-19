// Sala de Duelos «pro» (FX.duelosPro, ronda 259). Fralex: misma distribución y diseño, pero sin tanto scroll y más premium.
// Las dos listas de la derecha («Retos en el radar» y «Retos que lanzaste») ya no van una debajo de otra:
// se eligen con dos pestañas cápsula (con su contador). Así se ve una lista a la vez y la página mide la mitad.
import { FX } from '../../data/experimento.js';
import { simplificarFormReto } from './formRetoSimple.js';

export function montarDuelosPro() {
  if (!FX.duelosPro) return;
  simplificarFormReto();
  // Ronda 261 (Fralex): «Lanzar reto» siempre empieza plegado y se despliega solo cuando quieres emitir uno
  // (botón grande «Lanzar reto»). Después de emitirlo, se vuelve a plegar. En celular ya funcionaba así (botón de la cabecera).
  const grid = document.getElementById('duelos-grid');
  grid?.setAttribute('data-plegado', '');
  // Copia «plegado» a <html> para duelosPro.css (sin :has, que hacía recalcular toda la página). duelos.js lo cambia en varios sitios: se sigue con un observador.
  const copiar = () => document.documentElement.toggleAttribute('data-duelos-plegado', !!grid?.hasAttribute('data-plegado'));
  if (grid) { copiar(); new MutationObserver(copiar).observe(grid, { attributes: true, attributeFilter: ['data-plegado'] }); }
  // Ronda 262 (Fralex: «todo ese espacio se podría aprovechar mejor»): la racha y el botón «Lanzar reto» entran en la cabecera
  // (racha como píldora bajo la descripción; «Lanzar reto» bajo «Tu estado»). Se ahorran dos filas completas.
  const cab = document.querySelector('main section.glass-panel:has(> div > h1)');
  if (cab) {
    cab.classList.add('dp-cab');
    const [izq, der] = cab.children;
    const racha = document.getElementById('racha-diaria'); if (racha && izq) izq.append(racha);
    const lanzar = document.getElementById('btn-abrir-form'); if (lanzar && der) { lanzar.classList.add('dp-lanzar'); der.append(lanzar); }
    const segVista = document.getElementById('seg-vista'); if (segVista && der) der.append(segVista);
  }
  window.addEventListener('duelos:creado', () => grid?.setAttribute('data-plegado', ''));
  const col = document.getElementById('col-partidos'); if (!col) return;
  try {
    const tabs = document.createElement('div');
    tabs.className = 'pilar-tabs-lista dp-tabs'; tabs.setAttribute('role', 'tablist'); tabs.setAttribute('aria-label', 'Listas de retos');
    tabs.innerHTML = `<button type="button" role="tab" data-dp="radar" aria-selected="true" aria-controls="col-radar"><i class="fa-solid fa-tower-broadcast"></i>En el radar <b data-dp-n="radar"></b></button>
      <button type="button" role="tab" data-dp="lanzados" aria-selected="false" aria-controls="col-lanzados"><i class="fa-solid fa-paper-plane"></i>Que lanzaste <b data-dp-n="lanzados"></b></button>`;
    const radar = document.getElementById('col-radar');
    // Una sola fila: pestañas a la izquierda, «Alquilar host» y «Actualizar» a la derecha (antes eran dos filas)
    const barra = document.createElement('div'); barra.className = 'dp-barra';
    barra.append(tabs);
    const acciones = radar.querySelector(':scope > div:first-child > div');
    if (acciones) barra.append(acciones);
    col.insertBefore(barra, radar);
    const elegir = (cual) => {
      col.dataset.dp = cual;
      tabs.querySelectorAll('[data-dp]').forEach((b) => b.setAttribute('aria-selected', String(b.dataset.dp === cual)));
    };
    tabs.addEventListener('click', (e) => { const b = e.target.closest('[data-dp]'); if (b) elegir(b.dataset.dp); });
    tabs.addEventListener('keydown', (e) => {
      if (!['ArrowLeft', 'ArrowRight'].includes(e.key)) return;
      e.preventDefault(); const sig = col.dataset.dp === 'radar' ? 'lanzados' : 'radar'; elegir(sig); tabs.querySelector(`[data-dp="${sig}"]`)?.focus();
    });
    // Contadores: copian los que ya pinta duelos.js («(3)») a las pestañas
    const copiar = () => {
      const n = (id) => (document.getElementById(id)?.textContent ?? '').replace(/[()\s]/g, '');
      tabs.querySelector('[data-dp-n="radar"]').textContent = n('cnt-radar');
      tabs.querySelector('[data-dp-n="lanzados"]').textContent = n('cnt-pend');
    };
    ['cnt-radar', 'cnt-pend'].forEach((id) => { const el = document.getElementById(id); if (el) new MutationObserver(copiar).observe(el, { childList: true, characterData: true, subtree: true }); });
    copiar(); elegir('radar');
    // Si alguien llega con #col-lanzados (enlace directo), abre esa pestaña
    if (location.hash === '#col-lanzados') elegir('lanzados');
    // Al emitir un reto, duelos.js baja hasta «Retos que lanzaste»: primero se abre esa pestaña
    window.addEventListener('duelos:creado', () => elegir('lanzados'));
  } catch (e) { console.warn('[duelosPro] desactivado:', e); }
}

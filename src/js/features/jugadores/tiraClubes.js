// JUGADORES · rediseño (27-oct-2026): «tira de clubes» con sus ESCUDOS, como la fila de clubes de la Champions.
// Tocar un escudo filtra las cartas por ese club (usa el mismo desplegable «Filtrar por equipo» de siempre, así todo queda
// sincronizado con el panel lateral y la búsqueda). Se arma sola cuando la página termina de llenar ese desplegable.
import '../../../styles/tiraClubes.css';
import { escudoDe } from '../../core/sistema/escudos.js';

const esc = (s) => String(s ?? '').replace(/[&<>"']/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]));

export function montarTiraClubes(caja, select) {
  if (!caja || !select) return;
  const pintar = () => {
    const ops = [...select.options].filter((o) => o.value && o.value !== 'ALL');
    if (!ops.length) { caja.hidden = true; return; }
    caja.hidden = false;
    caja.innerHTML = `<button type="button" class="tc-club tc-todos" data-tc="ALL" aria-pressed="${select.value === 'ALL'}"><span class="tc-esc"><i class="fa-solid fa-earth-americas" aria-hidden="true"></i></span><span class="tc-n">Todos</span></button>`
      + ops.map((o) => { const e = escudoDe(o.value); return `<button type="button" class="tc-club" data-tc="${esc(o.value)}" aria-pressed="${select.value === o.value}" title="${esc(o.textContent)}"><span class="tc-esc">${e ? `<img src="${esc(e)}" alt="" width="40" height="40" loading="lazy">` : '<i class="fa-solid fa-shield-halved" aria-hidden="true"></i>'}</span><span class="tc-n">${esc(o.textContent)}</span></button>`; }).join('');
  };
  const marcar = () => caja.querySelectorAll('[data-tc]').forEach((b) => b.setAttribute('aria-pressed', String(b.dataset.tc === select.value)));
  caja.addEventListener('click', (e) => {
    const b = e.target.closest('[data-tc]'); if (!b) return;
    select.value = b.dataset.tc; select.dispatchEvent(new Event('change', { bubbles: true })); marcar();
  });
  select.addEventListener('change', marcar);
  new MutationObserver(pintar).observe(select, { childList: true });
  pintar();
}

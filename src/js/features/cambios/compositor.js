// Piezas visuales del compositor de Cambios oficiales (control segmentado + vista previa en vivo). Solo tocan el DOM que se les pasa.
import { tipoRegistrado, incluyeBase, incluyeLm } from '../../core/cambiosOficiales.js';
import { clubExacto } from '../../core/clubesPes.js';
import { escapeHTML as esc } from '../../core/dom.js';

/** Control segmentado: los botones se crean una vez (así el «pulgar» se desliza de uno a otro) y luego solo cambia cuál está activo. */
export function segmentado(cont, items, activo, attr) {
  const firma = items.map((i) => i.id).join('|');
  if (cont.dataset.firma !== firma) {
    cont.dataset.firma = firma;
    cont.innerHTML = `<span class="cfx-pulgar" aria-hidden="true"></span>${items.map((i) => `<button type="button" role="radio" class="cfx-op" ${attr}="${esc(i.id)}"><span>${esc(i.nombre)}</span></button>`).join('')}`;
  }
  const botones = [...cont.querySelectorAll('.cfx-op')];
  botones.forEach((b, i) => { const on = items[i].id === activo; b.setAttribute('aria-checked', String(on)); b.tabIndex = on ? 0 : -1; });
  const on = botones.find((b) => b.getAttribute('aria-checked') === 'true');
  if (on) { cont.style.setProperty('--x', `${on.offsetLeft}px`); cont.style.setProperty('--w', `${on.offsetWidth}px`); cont.style.setProperty('--y', `${on.offsetTop}px`); cont.style.setProperty('--h', `${on.offsetHeight}px`); cont.dataset.listo = '1'; }
}

const valor = (id) => document.getElementById(`cf-${id}`)?.value.trim() ?? '';
const lugar = (club) => { const c = clubExacto(club); return c ? c.liga : ''; };
/** Vista previa en vivo de lo que se va a mandar (solo lee lo escrito en el formulario; no valida). El esqueleto se crea una vez y luego se actualiza el texto, para que la flecha no se reinicie con cada tecla. */
export function pintarVista(caja, st) {
  if (!caja) return;
  const t = tipoRegistrado(st.tipo);
  if (!t) { caja.innerHTML = ''; return; }
  if (!caja.querySelector('.cfx-ticket')) {
    caja.innerHTML = `<div class="cfx-ticket">
      <p class="cfx-tk-jug" data-f="jug"></p>
      <div class="cfx-tk-ruta" data-f="ruta">
        <div class="cfx-tk-club" data-f="desde"><b></b><small></small></div>
        <svg class="cfx-tk-flecha" viewBox="0 0 48 12" aria-hidden="true"><path d="M1 6h44M40 1l5 5-5 5" fill="none" stroke="currentColor" stroke-width="1.6" stroke-linecap="round" stroke-linejoin="round" pathLength="1"/></svg>
        <div class="cfx-tk-club" data-f="hasta"><b></b><small></small></div>
      </div>
      <ul class="cfx-tk-dest"><li data-f="base">Base normal</li><li data-f="lm">Liga Máster</li></ul>
      <p class="cfx-tk-nota" data-f="nota"></p>
    </div>`;
  }
  const q = (k) => caja.querySelector(`[data-f="${k}"]`);
  const club = (k, nombre, vacio, sub) => { const el = q(k); el.dataset.vacio = String(vacio); el.querySelector('b').textContent = nombre; el.querySelector('small').textContent = sub; };
  q('base').dataset.on = String(incluyeBase(st.destino)); q('lm').dataset.on = String(incluyeLm(st.destino));
  const tk = caja.querySelector('.cfx-ticket');
  if (st.tipo !== 'fichaje') {
    q('ruta').hidden = true; q('jug').dataset.vacio = 'false'; q('jug').textContent = t.etiqueta;
    q('nota').textContent = 'Completa los datos y se resumirá aquí.'; tk.dataset.listo = 'false'; return;
  }
  q('ruta').hidden = false;
  const jug = valor('jugador'), libre = document.getElementById('cf-libre')?.checked, desde = libre ? '' : valor('desde'), hasta = valor('hasta');
  const listo = Boolean(jug && hasta);
  q('jug').dataset.vacio = String(!jug); q('jug').textContent = jug || 'Jugador sin elegir';
  club('desde', libre ? 'Agente libre' : desde || 'Club de origen', !libre && !desde, libre ? 'Sin club' : lugar(desde));
  club('hasta', hasta || 'Club de destino', !hasta, lugar(hasta));
  q('nota').textContent = listo ? 'Llegará a todos los PCs con Phoenix Link.' : 'Falta el jugador o el club de destino.';
  tk.dataset.listo = String(listo);
}


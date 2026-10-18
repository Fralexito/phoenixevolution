// Piezas visuales del compositor de Cambios oficiales (control segmentado + vista previa en vivo). Solo tocan el DOM que se les pasa.
import { tipoRegistrado, incluyeBase, incluyeLm } from '../../core/pes/cambiosOficiales.js';
import { clubExacto, escudoImg, paisDe } from '../../core/pes/clubesPes.js';
import { escapeHTML as esc } from '../../core/sistema/dom.js';
import { escudoHTML } from '../../core/sistema/escudos.js';
import { montarFotos } from '../fotoFutbolista.js';
import { lmDeClubPorNombre } from './datosSala.js';

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

/** Quién es el usuario (DT) del club en la Liga Máster: «Pierde al jugador: Fralex». Solo si el cambio va a la Liga Máster y el club está en ella. */
const dtTexto = (club, rol, st) => {
  if (!club || !incluyeLm(st.destino)) return '';
  const lm = lmDeClubPorNombre(club);
  return lm === undefined ? '' : `${rol}: ${lm.dt ? lm.dt.nombre : 'la IA (sin DT)'}`;
};
const valor = (id) => document.getElementById(`cf-${id}`)?.value.trim() ?? '';
let relojCara = null;
/** Cara del jugador: la del juego si tiene id de PES con minicara; si no, foto libre de Wikipedia. Con id elegido se busca ya; si solo hay nombre escrito, se espera a que deje de teclear.
 *  Cada cambio crea un elemento nuevo, así una respuesta tardía del jugador anterior no pisa al actual. */
export function caraJugador(el, nombre, pes, club) {
  const clave = pes ? `p:${pes}` : nombre.length >= 4 ? `n:${nombre}` : '';
  if (el.dataset.k === clave) return;
  clearTimeout(relojCara);
  const nuevo = el.cloneNode(false); for (const a of ['foto', 'fotoListo', 'pes', 'club']) delete nuevo.dataset[a];
  nuevo.dataset.k = clave; nuevo.className = 'cfx-tk-cara'; nuevo.innerHTML = '<i class="fa-solid fa-user" aria-hidden="true"></i>';
  el.replaceWith(nuevo);
  if (!clave) return;
  const buscar = () => { nuevo.dataset.foto = nombre; nuevo.dataset.pes = pes; nuevo.dataset.club = club; montarFotos(nuevo.parentElement); };
  if (pes) buscar(); else relojCara = setTimeout(buscar, 700);
}
/** Línea breve de información del club: liga, país e id de PES (vacía si el club no está en el catálogo). */
const lugar = (club) => { const c = clubExacto(club); return c ? `${c.liga} · ${paisDe(c)} · id PES ${c.id}` : ''; };
/** Vista previa en vivo de lo que se va a mandar (solo lee lo escrito en el formulario; no valida). El esqueleto se crea una vez y luego se actualiza el texto, para que la flecha no se reinicie con cada tecla. */
export function pintarVista(caja, st) {
  if (!caja) return;
  const t = tipoRegistrado(st.tipo);
  if (!t) { caja.innerHTML = ''; return; }
  if (typeof t.vista === 'function') { t.vista(caja, st); return; }   // el tipo dibuja su propia vista previa (estadísticas, información)
  if (!caja.querySelector('.cfx-ticket')) {
    caja.innerHTML = `<div class="cfx-ticket">
      <div class="cfx-tk-cabeza">
        <span class="cfx-tk-cara" data-f="cara"><i class="fa-solid fa-user" aria-hidden="true"></i></span>
        <div><p class="cfx-tk-jug" data-f="jug"></p><p class="cfx-tk-sub" data-f="sub"></p></div>
      </div>
      <div class="cfx-tk-ruta" data-f="ruta">
        <div class="cfx-tk-club" data-f="desde"><span class="cfx-tk-esc" data-f="esc-desde"></span><b></b><small></small><small class="cfx-tk-dt"></small></div>
        <svg class="cfx-tk-flecha" viewBox="0 0 48 12" aria-hidden="true"><path d="M1 6h44M40 1l5 5-5 5" fill="none" stroke="currentColor" stroke-width="1.6" stroke-linecap="round" stroke-linejoin="round" pathLength="1"/></svg>
        <div class="cfx-tk-club" data-f="hasta"><span class="cfx-tk-esc" data-f="esc-hasta"></span><b></b><small></small><small class="cfx-tk-dt"></small></div>
      </div>
      <ul class="cfx-tk-dest"><li data-f="base">Base normal</li><li data-f="lm">Liga Máster</li></ul>
      <p class="cfx-tk-nota" data-f="nota"></p>
    </div>`;
  }
  const q = (k) => caja.querySelector(`[data-f="${k}"]`);
  const club = (k, nombre, vacio, sub, dt = '') => {
    const el = q(k); el.dataset.vacio = String(vacio); el.querySelector('b').textContent = nombre; el.querySelector('small').textContent = sub; el.querySelector('.cfx-tk-dt').textContent = dt;
    const esc_ = q(`esc-${k}`), clave = vacio ? '' : nombre;   // el escudo solo se vuelve a pintar si cambia el club (evita parpadeos al teclear)
    if (esc_.dataset.k !== clave) { esc_.dataset.k = clave; esc_.innerHTML = vacio ? '' : (escudoImg(clubExacto(nombre), 36) || escudoHTML(nombre, 36)); }
  };
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
  const pes = valor('jugador_id');
  q('sub').textContent = pes ? `id PES ${pes}` : jug ? 'Sin id de PES: cada PC lo busca por el nombre' : '';
  caraJugador(q('cara'), jug, pes, desde);
  club('desde', libre ? 'Agente libre' : desde || 'Club de origen', !libre && !desde, libre ? 'Sin club' : lugar(desde), libre ? '' : dtTexto(desde, 'Pierde al jugador', st));
  club('hasta', hasta || 'Club de destino', !hasta, lugar(hasta), dtTexto(hasta, 'Lo recibe', st));
  q('nota').textContent = listo ? 'Llegará a todos los PCs con Phoenix Link.' : 'Falta el jugador o el club de destino.';
  tk.dataset.listo = String(listo);
}


// Tipo «fichaje» del formulario único (migración 125). Campos: jugador, equipo de origen, equipo de destino (+ ids de PES opcionales);
// si el destino incluye Liga Máster, además el club de Liga Máster. Los nombres son lo que de verdad usa cada PC (cada uno puede tener otro parche).
import { registrarTipo, validarFichaje, incluyeLm } from '../../core/cambiosOficiales.js';
import { escapeHTML as esc } from '../../core/dom.js';
import { buscarJugadores, clubesLm } from './api.js';
import { buscarClubes, clubExacto, escudoImg, paisDe } from '../../core/clubesPes.js';
import { CLUBES_PES } from '../../../data/clubesPes.js';
import { abrirSala } from './salaFichajes.js';
import { cargarLm } from './datosSala.js';

let raiz = null;
let clubes = null;
const v = (id) => raiz?.querySelector(`#cf-${id}`);

/** Campo de texto. Con `lista`, la lista de sugerencias (id cf-<lista>) cuelga justo debajo del cuadro, antes de la ayuda. */
function campo(id, etiqueta, { ayuda = '', max = 48, ph = '', modo = 'text', lista = '', ancho = false } = {}) {
  return `<div class="cf-campo${ancho ? ' cf-ancho' : ''}"><label for="cf-${id}"><span>${esc(etiqueta)}</span></label>
    <div class="cf-ent"><input id="cf-${id}" class="field" ${modo === 'numeric' ? 'inputmode="numeric" pattern="[0-9]*"' : ''} maxlength="${max}" placeholder="${esc(ph)}" autocomplete="off">
    ${lista ? `<ul id="cf-${lista}" class="cf-sugerencias" aria-live="polite"></ul>` : ''}</div>
    ${ayuda ? `<small>${esc(ayuda)}</small>` : ''}</div>`;
}

async function sugerir() {
  const t = v('jugador').value.trim();
  const lista = v('sugerencias');
  if (t.length < 3) { lista.innerHTML = ''; return; }
  try {
    const js = await buscarJugadores(t);
    lista.innerHTML = js.map((j) => `<li><button type="button" class="cf-sug" data-id="${j.id}" data-pes="${j.pes_id ?? ''}" data-nombre="${esc(j.nombre)}"
      data-club="${esc(j.lm_clubes?.nombre ?? '')}" data-club-pes="${j.lm_clubes?.pes_team_id ?? ''}" data-club-id="${j.club_id ?? ''}">
      ${esc(j.nombre)}${j.pes_id ? ` <small>· id PES ${j.pes_id}</small>` : ''}${j.lm_clubes?.nombre ? ` <small>· ${esc(j.lm_clubes.nombre)}</small>` : ''}</button></li>`).join('');
  } catch { lista.innerHTML = ''; }
}

let destinoActual = 'base';
/** Rellena los campos del formulario con lo elegido en la sala de fichajes (jugador, club de origen, club destino y, si hay, sus ids de la Liga Máster). */
function aplicarSala(r) {
  v('jugador').value = r.jugador.nombre; v('jugador_id').value = r.jugador.pid; v('jugador_id').dataset.auto = '1';
  v('libre').checked = false; v('desde').disabled = false; v('desde_id').disabled = false;
  v('desde').value = r.jugador.clubNombre; v('desde_id').value = r.jugador.clubId;
  v('hasta').value = r.destino.nombre; v('hasta_id').value = r.destino.clubId;
  v('lm_jugador_id').value = r.lm.jugadorId ?? '';
  if (r.lm.clubId) v('lm_club_id').value = String(r.lm.clubId);
  for (const id of ['sugerencias', 'clubes-desde', 'clubes-hasta']) v(id).innerHTML = '';
  raiz.dispatchEvent(new Event('change', { bubbles: true }));
}

registrarTipo({
  tipo: 'fichaje',
  etiqueta: 'Fichaje (jugador → equipo)',
  destinos: ['base', 'lm', 'ambos'],
  async pintar(contenedor, ctx) {
    raiz = contenedor;
    destinoActual = ctx.destino;
    contenedor.innerHTML = `
      <button type="button" class="cfx-sala" id="cf-abrir-sala">
        <span class="cfx-sala-escudos" aria-hidden="true">${[108, 101, 109, 114].map((id) => escudoImg(CLUBES_PES.find((c) => c.id === id), 34)).join('')}</span>
        <span class="cfx-sala-texto"><b>Abrir la sala de fichajes</b><small>Elige el club, el jugador y su destino mirando escudos y plantillas.</small></span>
        <i class="fa-solid fa-arrow-right" aria-hidden="true"></i>
      </button>
      <div class="cf-rejilla">
        ${campo('jugador', 'Jugador', { ph: 'Ej.: Lamine Yamal', ayuda: 'Escríbelo como sale en el PES. Si está en la Liga Máster de la web, elígelo de la lista.', lista: 'sugerencias', ancho: true })}
        ${campo('desde', 'Sale de (equipo)', { ph: 'Ej.: FC Barcelona', ayuda: 'Su club, no su selección. Escribe y elige de la lista (5 grandes ligas).', lista: 'clubes-desde' })}
        ${campo('hasta', 'Va a (equipo)', { ph: 'Ej.: Arsenal FC', lista: 'clubes-hasta' })}
        <label class="cf-check"><input type="checkbox" id="cf-libre"> Agente libre (no sale de ningún equipo)</label>
      </div>
      <details class="cf-avanzado"><summary>Ids de PES (opcional)</summary>
        <p class="cf-ayuda">Si no los sabes, déjalos vacíos: cada PC lo busca por el nombre en su propia base.</p>
        <div class="cf-rejilla">${campo('jugador_id', 'Id del jugador', { modo: 'numeric', max: 8 })}${campo('desde_id', 'Id del equipo de origen', { modo: 'numeric', max: 8 })}${campo('hasta_id', 'Id del equipo de destino', { modo: 'numeric', max: 8 })}</div>
      </details>
      <div id="cf-lm" class="cf-lm" ${incluyeLm(ctx.destino) ? '' : 'hidden'}>
        <p class="cf-subtitulo">Liga Máster</p>
        <div class="cf-rejilla">
          <label class="cf-campo" for="cf-lm_club_id"><span>Club de Liga Máster al que va</span><select id="cf-lm_club_id" class="field"><option value="">— Elige —</option></select></label>
          <input type="hidden" id="cf-lm_jugador_id">
        </div>
      </div>`;
    v('abrir-sala').addEventListener('click', async () => {
      const r = await abrirSala({ soloLm: incluyeLm(destinoActual) });
      if (r) aplicarSala(r);
    });
    cargarLm().then(() => raiz?.dispatchEvent(new Event('change', { bubbles: true })));   // los DT llegan después: la vista previa se repinta
    let espera = null;
    v('jugador').addEventListener('input', () => {
      v('lm_jugador_id').value = '';
      if (v('jugador_id').dataset.auto) { v('jugador_id').value = ''; delete v('jugador_id').dataset.auto; }   // el id puesto al elegir de la lista ya no corresponde al nombre editado
      clearTimeout(espera); espera = setTimeout(sugerir, 300); });
    for (const lado of ['desde', 'hasta']) {
      const lista = v('clubes-' + lado);
      v(lado).addEventListener('input', () => {
        const t = v(lado).value;
        v(lado + '_id').value = clubExacto(t)?.id ?? '';
        lista.innerHTML = buscarClubes(t).map((c) => `<li><button type="button" class="cf-sug cf-sug-club" data-id="${c.id}" data-nombre="${esc(c.nombre)}">${escudoImg(c, 28)}<span><b>${esc(c.nombre)}</b><small>${esc(c.liga)} · ${esc(paisDe(c))}</small></span></button></li>`).join('');
      });
      lista.addEventListener('click', (ev) => {
        const b = ev.target.closest('.cf-sug'); if (!b) return;
        v(lado).value = b.dataset.nombre; v(lado + '_id').value = b.dataset.id; lista.innerHTML = '';
      });
    }
    v('libre').addEventListener('change', () => { v('desde').disabled = v('libre').checked; v('desde_id').disabled = v('libre').checked; });
    v('sugerencias').addEventListener('click', (ev) => {
      const b = ev.target.closest('.cf-sug'); if (!b) return;
      v('jugador').value = b.dataset.nombre; v('jugador_id').value = b.dataset.pes; v('jugador_id').dataset.auto = '1'; v('lm_jugador_id').value = b.dataset.id;
      if (b.dataset.club && !v('desde').value) { v('desde').value = b.dataset.club; v('desde_id').value = b.dataset.clubPes; }
      v('sugerencias').innerHTML = '';
    });
    v('lm_club_id').addEventListener('change', () => {
      const o = v('lm_club_id').selectedOptions[0];
      if (o?.value && !v('hasta').value) { v('hasta').value = o.dataset.nombre; v('hasta_id').value = o.dataset.pes ?? ''; }
    });
    try {
      clubes ??= await clubesLm();
      v('lm_club_id').insertAdjacentHTML('beforeend', clubes.map((c) => `<option value="${c.id}" data-nombre="${esc(c.nombre)}" data-pes="${c.pes_team_id ?? ''}">${esc(c.nombre)}</option>`).join(''));
    } catch { /* sin clubes de LM: el resto del formulario sigue sirviendo */ }
  },
  cambiarDestino(destino) { destinoActual = destino; const lm = v('lm'); if (lm) lm.hidden = !incluyeLm(destino); },
  leer(ctx) {
    const lm = incluyeLm(ctx.destino);
    if (lm && !v('lm_club_id').value) throw new Error('Elige el club de Liga Máster al que va.');
    return validarFichaje({
      jugador: v('jugador').value, desde: v('desde').value, hasta: v('hasta').value, libre: v('libre').checked,
      jugador_id: v('jugador_id').value, desde_id: v('desde_id').value, hasta_id: v('hasta_id').value,
      lm_jugador_id: lm ? v('lm_jugador_id').value : '', lm_club_id: lm ? v('lm_club_id').value : '',
    });
  },
  limpiar() { if (!raiz) return; for (const el of raiz.querySelectorAll('input:not([type=checkbox]), select')) el.value = ''; v('libre').checked = false; v('desde').disabled = false; v('desde_id').disabled = false; },
});

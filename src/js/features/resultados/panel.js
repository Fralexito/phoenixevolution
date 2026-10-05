// Panel «Marcadores» de /mis-partidos/: duelos terminados cuyo marcador aún no está confirmado por los dos líderes.
// Esquema: pages/misPartidos → este panel → features/resultados/api → core/resultado (puro). Sin dependencias de Duelos: recibe funciones.
import { escapeHTML } from '../../core/dom.js';
import { toast } from '../../core/toast.js';
import { validarMarcador, marcadorDesdeMiLado, vistaPendiente } from '../../core/resultado.js';
import * as api from './api.js';

/**
 * @param {HTMLElement} el contenedor
 * @param {{ yo: () => string|null, reto: (id:number)=>object|undefined, nombre: (id:string)=>string }} ctx
 */
export function crearPanelMarcadores(el, ctx) {
  let lista = [];
  const ladoDe = (r, yo) => (r?.retador_id === yo ? 'A' : r?.rival_id === yo ? 'B' : null);

  function tarjeta(p) {
    const yo = ctx.yo(), r = ctx.reto(p.reto_id); const lado = ladoDe(r, yo);
    if (!r || !lado) return '';                                   // sin datos del duelo no se ofrece nada (evita marcadores del lado equivocado)
    const rival = ctx.nombre(lado === 'A' ? r.rival_id : r.retador_id); const v = vistaPendiente(p, yo);
    const marcador = p.goles_a != null ? marcadorDesdeMiLado(p.goles_a, p.goles_b, lado) : '';
    const cab = `<p class="text-sm text-white font-display font-bold uppercase">Duelo #${Number(p.reto_id)} vs ${escapeHTML(rival)}</p>`;
    const form = `<form data-form-marcador="${Number(p.reto_id)}" data-lado="${lado}" class="flex flex-wrap items-end gap-2 mt-2">
        <label class="text-[11px] text-gray-400">Tus goles<input name="mio" inputmode="numeric" maxlength="2" class="block w-16 rounded-lg bg-black/30 border border-galaxy-border px-2 py-1.5 text-sm text-white text-center" required></label>
        <label class="text-[11px] text-gray-400">Goles de ${escapeHTML(rival)}<input name="rival" inputmode="numeric" maxlength="2" class="block w-16 rounded-lg bg-black/30 border border-galaxy-border px-2 py-1.5 text-sm text-white text-center" required></label>
        <button class="btn btn-primary !min-h-9 !text-xs">${v.contra ? 'Proponer otro marcador' : 'Proponer marcador'}</button></form>`;
    const cuerpo = {
      proponer: `<p class="text-[11px] text-gray-400 mt-1">${v.contra ? 'El marcador fue disputado. Propón el que crees correcto.' : 'Propón el marcador final. El otro líder deberá confirmarlo.'}</p>${form}`,
      responder: `<p class="text-sm text-gray-200 mt-1">${escapeHTML(rival)} propone <b class="text-galaxy-400">${escapeHTML(marcador)}</b> <span class="text-[11px] text-gray-500">(tus goles primero)</span></p>
        <div class="flex gap-2 mt-2"><button type="button" data-resp="si" data-reto="${Number(p.reto_id)}" class="btn btn-primary !min-h-9 !text-xs">Confirmar</button>
        <button type="button" data-resp="no" data-reto="${Number(p.reto_id)}" class="btn btn-ghost !min-h-9 !text-xs">No estoy de acuerdo</button></div>`,
      esperando: `<p class="text-[11px] text-gray-400 mt-1">Propusiste <b class="text-white">${escapeHTML(marcador)}</b>. Esperando a ${escapeHTML(rival)}…</p>`,
      esperando_contra: `<p class="text-[11px] text-gray-400 mt-1">${escapeHTML(rival)} disputó tu marcador. Esperando su propuesta…</p>`,
      moderacion: '<p class="text-[11px] text-amber-300 mt-1"><i class="fa-solid fa-gavel"></i> No hubo acuerdo tras 3 intentos: un moderador decidirá el resultado.</p>',
    }[v.tipo] ?? '';
    return cuerpo ? `<article class="glass-panel rounded-2xl p-3" data-marcador="${Number(p.reto_id)}">${cab}${cuerpo}</article>` : '';
  }

  function pintar() {
    const html = lista.map(tarjeta).filter(Boolean).join('');
    el.hidden = !html; el.querySelector('[data-lista]').innerHTML = html;
  }
  async function cargar() {
    if (!ctx.yo()) { lista = []; pintar(); return; }
    try { lista = await api.pendientes(); } catch (e) { console.warn('[marcadores] carga:', e.message); lista = []; }   // sin migración: el panel simplemente no aparece
    pintar();
  }
  async function accion(fn) { try { await fn(); await cargar(); } catch (e) { toast(e.message || 'No se pudo completar la acción.', 'error'); } }

  el.addEventListener('submit', (e) => {
    const f = e.target.closest('[data-form-marcador]'); if (!f) return; e.preventDefault();
    const fd = new FormData(f); const mio = fd.get('mio'), rival = fd.get('rival');
    const v = f.dataset.lado === 'A' ? validarMarcador(mio, rival) : validarMarcador(rival, mio);   // la BD guarda goles_a = lado del retador
    if (!v.ok) { toast(v.error, 'error'); return; }
    accion(async () => { await api.proponer(f.dataset.formMarcador, v.a, v.b); toast('Marcador propuesto. Esperando al otro líder.', 'ok'); });
  });
  el.addEventListener('click', (e) => {
    const b = e.target.closest('[data-resp]'); if (!b) return;
    const si = b.dataset.resp === 'si';
    accion(async () => { await api.responder(b.dataset.reto, si); toast(si ? 'Marcador confirmado.' : 'Marcador disputado.', si ? 'ok' : 'info'); });
  });
  return { cargar };
}

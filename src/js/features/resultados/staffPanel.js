// Cola de «Marcadores en disputa» dentro de /moderacion/ (migración 039). El moderador ve ambos nombres y decide el marcador con un motivo (queda en la Auditoría).
import { escapeHTML } from '../../core/dom.js';
import { toast } from '../../core/toast.js';
import { openModal, closeModal } from '../../core/modal.js';
import { validarMarcador } from '../../core/resultado.js';
import * as api from './api.js';

const ID = 'res-modal';
const MOTIVO_MIN = 5;

export function crearColaMarcadores(el, { puedeResolver }) {
  let lista = [];
  const nom = (p) => escapeHTML(p?.nombre || 'Jugador');

  function tarjeta(x) {
    return `<article class="glass-panel rounded-2xl p-3" data-disputa="${Number(x.reto_id)}">
      <p class="text-sm text-white font-display font-bold uppercase">Duelo #${Number(x.reto_id)} · ${nom(x.retador)} vs ${nom(x.rival)}
        ${x.agotado ? '<span class="ml-1 text-[10px] text-amber-300 normal-case tracking-normal"><i class="fa-solid fa-gavel"></i> sin más intentos</span>' : ''}</p>
      <p class="text-[11px] text-gray-400 mt-0.5">Último marcador propuesto: <b class="text-white">${Number(x.goles_a)} - ${Number(x.goles_b)}</b> (retador - rival) · intento ${Number(x.intentos)} de 3</p>
      ${puedeResolver ? `<button type="button" data-resolver="${Number(x.reto_id)}" class="btn btn-primary !min-h-8 !text-xs mt-2">Decidir marcador</button>` : '<p class="text-[11px] text-gray-500 mt-1">Tu rol puede ver, no decidir.</p>'}</article>`;
  }
  function pintar() {
    el.hidden = !lista.length;
    el.querySelector('[data-lista]').innerHTML = lista.map(tarjeta).join('');
    const c = el.querySelector('[data-cuenta]'); if (c) c.textContent = lista.length ? `(${lista.length})` : '';
  }
  async function cargar() {
    try { lista = await api.disputados(); }
    catch (e) { console.warn('[marcadores-staff] carga:', e.message); lista = []; }       // sin migración o sin permiso: la sección simplemente no aparece
    pintar();
  }
  function abrir(x) {
    const m = openModal(`<form id="res-form" class="p-6 space-y-4" novalidate>
      <div class="flex justify-between items-start gap-3"><div><h2 class="font-display font-bold text-xl text-white uppercase tracking-widest">Decidir marcador</h2>
        <p class="text-xs text-gray-400 mt-0.5">Duelo #${Number(x.reto_id)} · ${nom(x.retador)} vs ${nom(x.rival)}</p></div>
        <button type="button" data-close aria-label="Cerrar" class="text-gray-500 hover:text-white"><i class="fa-solid fa-xmark text-xl"></i></button></div>
      <div class="flex items-end gap-3"><label class="text-[11px] text-gray-400 flex-1">Goles de ${nom(x.retador)}<input name="a" inputmode="numeric" maxlength="2" value="${Number(x.goles_a)}" class="field !text-center" required></label>
        <span class="pb-2 text-gray-500">-</span>
        <label class="text-[11px] text-gray-400 flex-1">Goles de ${nom(x.rival)}<input name="b" inputmode="numeric" maxlength="2" value="${Number(x.goles_b)}" class="field !text-center" required></label></div>
      <div><label class="label" for="res-motivo">Motivo de tu decisión <span class="text-gray-500 normal-case">(lo verán los jugadores y queda en la Auditoría)</span></label><textarea id="res-motivo" name="motivo" rows="2" maxlength="300" class="field" required></textarea></div>
      <p id="res-err" class="text-xs text-bad min-h-4" role="alert"></p>
      <button type="submit" class="btn btn-primary w-full">Confirmar decisión</button></form>`, { id: ID });
    m.querySelector('#res-form').addEventListener('submit', async (ev) => {
      ev.preventDefault(); const err = m.querySelector('#res-err'); err.textContent = '';
      const fd = new FormData(ev.target); const v = validarMarcador(fd.get('a'), fd.get('b')); const motivo = String(fd.get('motivo') ?? '').trim();
      if (!v.ok) { err.textContent = v.error; return; }
      if (motivo.length < MOTIVO_MIN) { err.textContent = `Escribe el motivo de tu decisión (mínimo ${MOTIVO_MIN} letras).`; return; }
      const btn = ev.target.querySelector('button[type=submit]'); btn.disabled = true;
      try { await api.resolverStaff(x.reto_id, v.a, v.b, motivo); toast('Marcador resuelto.', 'ok'); closeModal(ID); await cargar(); }
      catch (e) { err.textContent = e?.message || 'No se pudo completar la acción.'; }
      finally { btn.disabled = false; }
    });
  }
  el.addEventListener('click', (e) => {
    const b = e.target.closest('[data-resolver]'); if (!b) return;
    const x = lista.find((r) => r.reto_id === Number(b.dataset.resolver)); if (x) abrir(x);
  });
  return { cargar };
}

// Panel «Valora a tus rivales» de /mis-partidos/: rivales de duelos con marcador confirmado a quienes aún no has valorado.
// Esquema: pages/misPartidos → este panel → features/valoraciones/api → core/reputacion (puro).
import { escapeHTML } from '../../core/dom.js';
import { toast } from '../../core/toast.js';
import { avatarHTML } from '../../core/avatar.js';
import { validarValoracion, etiquetasPara } from '../../core/reputacion.js';
import * as api from './api.js';

export function crearPanelValoraciones(el) {
  let lista = [], sel = new Map(), ocupado = false;   // sel: «reto:usuario» → { estrellas, etiquetas:Set }
  const clave = (p) => `${p.reto}:${p.usuario}`;
  const estado = (p) => { if (!sel.has(clave(p))) sel.set(clave(p), { estrellas: 0, etiquetas: new Set() }); return sel.get(clave(p)); };

  function tarjeta(p) {
    const s = estado(p), k = clave(p);
    const estrellas = [1, 2, 3, 4, 5].map((n) => `<button type="button" data-estrella="${n}" data-k="${k}" aria-label="${n} estrella${n === 1 ? '' : 's'}" aria-pressed="${s.estrellas >= n}" class="text-xl leading-none ${s.estrellas >= n ? 'text-amber-300' : 'text-gray-600'} hover:text-amber-200"><i class="fa-solid fa-star"></i></button>`).join('');
    const tags = etiquetasPara(s.estrellas).map(([id, n]) => `<button type="button" data-etiqueta="${id}" data-k="${k}" aria-pressed="${s.etiquetas.has(id)}" class="adv-chip !min-h-8">${escapeHTML(n)}</button>`).join('');
    return `<article class="glass-panel rounded-xl p-3" data-val="${k}"><div class="flex items-center gap-2"><span class="shrink-0">${avatarHTML(p.avatar, p.nombre, 32)}</span>
      <p class="text-sm text-white font-display font-bold uppercase min-w-0 truncate">${escapeHTML(p.nombre)} <span class="text-[10px] text-gray-500 normal-case">· duelo #${p.reto}</span></p></div>
      <div class="flex gap-1 mt-2" role="group" aria-label="Estrellas">${estrellas}</div>
      ${tags ? `<div class="flex flex-wrap gap-1.5 mt-2">${tags}</div>` : ''}
      <button type="button" data-enviar="${k}" ${s.estrellas && !ocupado ? '' : 'disabled'} class="btn btn-primary !min-h-8 !px-3 !text-[11px] mt-2">Enviar valoración</button></article>`;
  }
  function pintar() {
    el.hidden = !lista.length;
    const cont = el.querySelector('[data-lista]'); if (cont) cont.innerHTML = lista.map(tarjeta).join('');
  }
  async function cargar() {
    try { lista = await api.pendientes(); pintar(); }
    catch (e) { console.warn('[valoraciones] panel:', e); lista = []; pintar(); }   // adorno: nunca rompe «Mis partidos»
  }
  el.addEventListener('click', async (ev) => {
    const b = ev.target.closest('[data-estrella],[data-etiqueta],[data-enviar]'); if (!b) return;
    const k = b.dataset.k ?? b.dataset.enviar, p = lista.find((x) => clave(x) === k); if (!p) return;
    const s = estado(p);
    if (b.dataset.estrella) { s.estrellas = Number(b.dataset.estrella); s.etiquetas = new Set([...s.etiquetas].filter((t) => etiquetasPara(s.estrellas).some(([id]) => id === t))); pintar(); }
    else if (b.dataset.etiqueta) { s.etiquetas.has(b.dataset.etiqueta) ? s.etiquetas.delete(b.dataset.etiqueta) : s.etiquetas.add(b.dataset.etiqueta); pintar(); }
    else {
      const v = validarValoracion({ estrellas: s.estrellas, etiquetas: [...s.etiquetas] });
      if (!v.ok) { toast(v.error, 'error'); return; }
      if (ocupado) return; ocupado = true; pintar();
      try { await api.valorar(p.reto, p.usuario, v.valores); sel.delete(k); toast('Valoración enviada. Cuenta cuando tu rival también valore, o a los 3 días.', 'ok'); await cargar(); }
      catch (e) { console.error('[valoraciones] enviar:', e); toast(e?.message || 'No se pudo enviar la valoración.', 'error'); }
      finally { ocupado = false; pintar(); }
    }
  });
  return { cargar };
}

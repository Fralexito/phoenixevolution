// Editor de biografía y datos públicos del jugador (botón propio en el perfil). Solo admin (la BD lo refuerza con RLS).
// Guarda ÚNICAMENTE estas columnas: biografia, ciudad, miembro_desde, estilo_juego, logros, redes.
import { supabase } from '../core/supabase.js';
import { openModal, closeModal } from '../core/modal.js';
import { escapeHTML } from '../core/dom.js';
import { toast } from '../core/toast.js';
import { REDES, limpiarRed, limpiarRedes } from '../core/perfil.js';

const ID = 'perfil-editor';
const limpio = (v, max) => String(v ?? '').trim().replace(/[<>]/g, '').slice(0, max) || null;

export function abrirEditorPerfil(p, onSaved = () => {}) {
  const m = openModal(`<form id="pe-form" class="p-5 sm:p-6 space-y-4" novalidate>
    <div class="flex justify-between items-start border-b border-galaxy-border pb-3">
      <div><span class="text-[12px] font-display font-bold text-galaxy-400 uppercase tracking-widest">Perfil público</span>
        <h3 class="font-display font-bold text-xl text-white uppercase">Biografía de ${escapeHTML(p.nombre)}</h3></div>
      <button type="button" data-close aria-label="Cerrar" class="text-gray-400 hover:text-white text-xl p-1"><i class="fa-solid fa-xmark"></i></button>
    </div>
    <div><label class="label" for="pe-bio">Biografía</label><textarea id="pe-bio" class="field" rows="7" maxlength="2000" placeholder="Su historia en la comunidad, cómo empezó, qué lo define…">${escapeHTML(p.biografia)}</textarea><p class="text-[12px] text-gray-500 mt-1 text-right"><span id="pe-bio-n">0</span>/2000</p></div>
    <div class="grid sm:grid-cols-2 gap-3">
      <div><label class="label" for="pe-ciudad">Ciudad / país</label><input id="pe-ciudad" class="field" maxlength="60" placeholder="Lima, Perú" value="${escapeHTML(p.ciudad)}"></div>
      <div><label class="label" for="pe-desde">Miembro desde</label><input id="pe-desde" type="date" class="field" value="${escapeHTML(p.miembro_desde)}"></div>
    </div>
    <div><label class="label" for="pe-estilo">Estilo de juego</label><input id="pe-estilo" class="field" maxlength="120" placeholder="Ej: 4-3-3 · presión alta y contragolpe" value="${escapeHTML(p.estilo_juego)}"></div>
    <div><label class="label" for="pe-logros">Logros <span class="text-gray-500 normal-case">(uno por línea, máx. 12)</span></label><textarea id="pe-logros" class="field" rows="3" maxlength="800" placeholder="Campeón Apertura 2026&#10;Máximo goleador">${escapeHTML(p.logros)}</textarea></div>
    <div><span class="label">Redes <span class="text-gray-500 normal-case">(usuario o enlace https://)</span></span>
      <div class="grid sm:grid-cols-2 gap-2">${REDES.map((r) => `<div class="flex items-center gap-2"><i class="${r.icono} w-5 text-center text-gray-400" title="${r.nombre}"></i><input data-red="${r.id}" class="field" maxlength="200" aria-label="${r.nombre}" placeholder="${r.ayuda}" value="${escapeHTML(p.redes?.[r.id])}"></div>`).join('')}</div></div>
    <p id="pe-err" class="text-xs text-bad min-h-4" role="alert"></p>
    <div class="flex gap-2 justify-end"><button type="button" data-close class="btn btn-ghost">Cancelar</button><button type="submit" class="btn btn-primary">Guardar biografía</button></div>
  </form>`, { id: ID, persistent: true, wide: true });
  const $ = (s) => m.querySelector(s);
  const contar = () => { $('#pe-bio-n').textContent = $('#pe-bio').value.length; };
  $('#pe-bio').addEventListener('input', contar); contar();
  $('#pe-form').addEventListener('submit', async (ev) => {
    ev.preventDefault(); const err = $('#pe-err'); err.textContent = '';
    const campos = [...m.querySelectorAll('[data-red]')];
    const malas = campos.filter((i) => i.value.trim() && !limpiarRed(i.dataset.red, i.value)).map((i) => i.getAttribute('aria-label'));
    if (malas.length) { err.textContent = `Revisa estas redes (usuario sin espacios o enlace https://): ${malas.join(', ')}.`; return; }
    const fila = {
      biografia: limpio($('#pe-bio').value, 2000), ciudad: limpio($('#pe-ciudad').value, 60), miembro_desde: $('#pe-desde').value || null,
      estilo_juego: limpio($('#pe-estilo').value, 120), logros: limpio($('#pe-logros').value, 800),
      redes: limpiarRedes(Object.fromEntries(campos.map((i) => [i.dataset.red, i.value]))),
    };
    const btn = ev.target.querySelector('button[type=submit]'); btn.disabled = true;
    try {
      const { error } = await supabase.from('jugadores').update(fila).eq('id', p.id);
      if (error) throw error;
      closeModal(ID); toast('Biografía guardada.', 'ok'); onSaved();
    } catch (ex) {
      console.error('[perfil] guardar biografía:', ex);
      err.textContent = /row-level security|policy/i.test(ex.message) ? 'No tienes permiso (solo administradores).' : (ex.message || 'No se pudo guardar.');
    } finally { btn.disabled = false; }
  });
}

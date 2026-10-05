// Ventana «Crear encuesta». Validación en core/encuesta.js (la BD repite todas las reglas).
import { openModal, closeModal } from '../../core/modal.js';
import { toast } from '../../core/toast.js';
import { validarEncuesta, PREGUNTA_MAX, OPCION_MAX } from '../../core/encuesta.js';
import * as api from './api.js';

const ID = 'encuesta-modal';
export function abrirCrearEncuesta({ onListo } = {}) {
  const m = openModal(`<form id="enc-form" class="p-6 space-y-4" novalidate>
    <div class="flex justify-between items-start"><h2 class="font-display font-bold text-xl text-white uppercase tracking-widest"><i class="fa-solid fa-square-poll-vertical text-galaxy-400 mr-2"></i>Nueva encuesta</h2>
      <button type="button" data-close aria-label="Cerrar" class="text-gray-500 hover:text-white"><i class="fa-solid fa-xmark text-xl"></i></button></div>
    <div><label class="label" for="enc-preg">Pregunta</label><textarea id="enc-preg" rows="2" maxlength="${PREGUNTA_MAX}" class="field" placeholder="¿Qué parche usamos en la próxima temporada?" required></textarea></div>
    <div class="space-y-2"><span class="label">Opciones (2 a 4)</span>
      ${[1, 2, 3, 4].map((i) => `<input name="op" maxlength="${OPCION_MAX}" class="field" placeholder="Opción ${i}${i > 2 ? ' (opcional)' : ''}" aria-label="Opción ${i}">`).join('')}</div>
    <div><label class="label" for="enc-dias">Dura</label><select id="enc-dias" class="field">${[1, 2, 3, 5, 7].map((d) => `<option value="${d}" ${d === 3 ? 'selected' : ''}>${d} día${d > 1 ? 's' : ''}</option>`).join('')}</select>
      <p class="text-[11px] text-gray-500 mt-1">Cada persona vota una vez y puede cambiar su voto mientras siga abierta. Los resultados se ven al votar.</p></div>
    <p id="enc-err" class="text-xs text-bad min-h-4" role="alert"></p>
    <button type="submit" class="btn btn-primary w-full">Publicar encuesta</button></form>`, { id: ID });
  m.querySelector('#enc-form').addEventListener('submit', async (ev) => {
    ev.preventDefault(); const err = m.querySelector('#enc-err'); err.textContent = '';
    const v = validarEncuesta({ pregunta: m.querySelector('#enc-preg').value, opciones: [...m.querySelectorAll('[name=op]')].map((i) => i.value), dias: m.querySelector('#enc-dias').value });
    if (!v.ok) { err.textContent = v.error; return; }
    const btn = ev.target.querySelector('button[type=submit]'); btn.disabled = true;
    try { await api.crear(v); toast('Encuesta publicada.', 'ok'); closeModal(ID); await onListo?.(); }
    catch (e) { err.textContent = e?.message || 'No se pudo publicar la encuesta.'; }
    finally { btn.disabled = false; }
  });
  return m;
}

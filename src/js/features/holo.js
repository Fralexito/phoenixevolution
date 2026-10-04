// Modal holográfico flotante: aparece cuando te llega un desafío (en cualquier página).
import { supabase } from '../core/supabase.js';
import { escapeHTML } from '../core/dom.js';
import { toast, beep } from '../core/toast.js';
import { href } from '../core/config.js';

let current = null;
const queue = [];

function close() {
  current?.remove(); current = null;
  if (queue.length) show(queue.shift());
}

async function act(n, rpc, okMsg, extra = {}) {
  const { error } = await supabase.rpc(rpc, { p_reto_id: n.reto_id, ...extra });
  if (error) { toast(error.code === 'P0001' ? error.message : 'No se pudo completar la acción.', 'error'); console.error('[holo]', rpc, error.message); }
  else toast(okMsg, 'ok');
  window.dispatchEvent(new CustomEvent('duelos:refresh'));
  close();
}

function show(n) {
  const invite = n.tipo === 'INVITACION_RETO';
  const direct = n.tipo === 'RETO_DIRECTO' || invite;               // los dos se responden con Aceptar / Rechazar
  const el = document.createElement('div');
  el.className = 'holo-wrap';
  el.setAttribute('role', 'alertdialog');
  el.setAttribute('aria-label', 'Desafío recibido');
  el.innerHTML = `
    <div class="holo-card">
      <div class="holo-scan" aria-hidden="true"></div>
      <div class="text-[10px] font-display font-bold uppercase tracking-[0.3em] text-galaxy-400 mb-1">${invite ? 'Invitación a un equipo' : direct ? 'Desafío directo' : 'Se busca host'}</div>
      <h3 class="font-display font-extrabold text-xl text-white uppercase text-shadow-glow">${escapeHTML(n.titulo)}</h3>
      <p class="text-sm text-gray-300 mt-2">${escapeHTML(n.mensaje)}</p>
      <div class="flex gap-2 mt-5">
        <button type="button" data-h="ok" class="btn btn-primary flex-1 !min-h-11">${direct ? 'Aceptar' : 'Ser el host'}</button>
        ${direct ? '<button type="button" data-h="no" class="btn btn-ghost flex-1 !min-h-11">Rechazar</button>' : `<a href="${escapeHTML(href('duelos/'))}" class="btn btn-ghost flex-1 !min-h-11">Ver</a>`}
        <button type="button" data-h="later" aria-label="Cerrar" class="btn btn-ghost !min-h-11 !px-3"><i class="fa-solid fa-xmark"></i></button>
      </div>
    </div>`;
  el.addEventListener('click', (e) => {
    const k = e.target.closest('[data-h]')?.dataset.h;
    if (k === 'ok') invite ? act(n, 'responder_invitacion', '¡Te uniste al equipo!', { p_acepta: true }) : act(n, 'aceptar_reto', '¡Desafío aceptado!');
    else if (k === 'no') invite ? act(n, 'responder_invitacion', 'Invitación rechazada.', { p_acepta: false }) : act(n, 'rechazar_reto', 'Reto rechazado.');
    else if (k === 'later') close();
  });
  document.body.appendChild(el);
  current = el;
  beep();
}

/** Muestra el desafío; si ya hay uno en pantalla, se encola. */
export function showHolo(n) { if (current) queue.push(n); else show(n); }

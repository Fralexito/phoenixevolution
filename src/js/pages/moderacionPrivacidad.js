// Moderación · solicitudes de privacidad (RPC existentes: staff_solicitudes_privacidad, staff_resolver_solicitud_privacidad).
// Módulo aparte de moderacion.js: no comparte estado. Solo aparece si el RPC responde (es_staff en la base).
import { supabase } from '../core/supabase.js';
import { onSession } from '../core/session.js';
import { toast } from '../core/toast.js';
import { pedirTexto } from '../core/dialogo.js';
import { escapeHTML as esc } from '../core/dom.js';

const sec = document.getElementById('mod-privacidad');
const TIPO = { acceso: 'Acceso', rectificacion: 'Corregir dato', eliminacion: 'Eliminar cuenta', oposicion: 'Oposición', baja: 'Baja de avisos' };
const dias = (d) => Math.floor((Date.now() - new Date(d)) / 864e5);

async function cargar() {
  const [{ data: abiertas, error }, { data: proc }] = await Promise.all([
    supabase.rpc('staff_solicitudes_privacidad', { p_estado: 'pendiente' }),
    supabase.rpc('staff_solicitudes_privacidad', { p_estado: 'en_proceso' }),
  ]);
  if (error) { sec.hidden = true; return; }   // no es staff
  const lista = [...(abiertas ?? []), ...(proc ?? [])];
  sec.hidden = false; sec.querySelector('[data-pv-cuenta]').textContent = lista.length ? `(${lista.length})` : '';
  const ids = [...new Set(lista.map((s) => s.usuario))];
  const { data: perfiles } = ids.length ? await supabase.from('perfiles').select('id, username, nombre_display').in('id', ids) : { data: [] };
  const quien = new Map((perfiles ?? []).map((p) => [p.id, p]));
  sec.querySelector('[data-pv-lista]').innerHTML = !lista.length ? '<p class="text-xs text-gray-500">Sin solicitudes abiertas.</p>' : lista.map((s) => {
    const p = quien.get(s.usuario); const d = dias(s.creada);
    return `<article class="glass-panel rounded-xl p-3 text-sm space-y-1.5">
      <div class="flex flex-wrap gap-2 items-baseline"><b class="text-white">${esc(TIPO[s.tipo] ?? s.tipo)}</b>
        <span class="text-gray-400">${esc(p?.nombre_display ?? 'Usuario')} ${p?.username ? '@' + esc(p.username) : ''}</span>
        <span class="text-[11px] ${d >= 25 ? 'text-bad' : 'text-gray-500'}">hace ${d} día(s)</span><span class="text-[11px] text-galaxy-400">${s.estado === 'en_proceso' ? 'En proceso' : 'Pendiente'}</span>
        <code class="text-[10px] text-gray-600 select-all">${esc(s.usuario)}</code></div>
      ${s.detalle ? `<p class="text-xs text-gray-300">${esc(s.detalle)}</p>` : ''}
      <div class="flex flex-wrap gap-1.5">${s.estado === 'pendiente' ? `<button type="button" class="btn btn-ghost !min-h-8 !text-xs" data-pv="${s.id}" data-estado="en_proceso">En proceso</button>` : ''}
        <button type="button" class="btn btn-ghost !min-h-8 !text-xs" data-pv="${s.id}" data-estado="resuelta">Resuelta</button>
        <button type="button" class="btn btn-ghost !min-h-8 !text-xs !text-bad" data-pv="${s.id}" data-estado="rechazada">Rechazar</button></div></article>`;
  }).join('');
}

sec?.addEventListener('click', async (e) => {
  const b = e.target.closest('[data-pv]'); if (!b) return;
  const nota = await pedirTexto('Nota para el usuario (la verá en su Configuración):', { titulo: 'Responder solicitud', maximo: 1000, obligatorio: b.dataset.estado === 'rechazada', aceptar: 'Guardar' });
  if (nota === null) return;
  const { error } = await supabase.rpc('staff_resolver_solicitud_privacidad', { p_id: Number(b.dataset.pv), p_estado: b.dataset.estado, p_nota: String(nota) });
  if (error) { toast(error.message || 'No se pudo guardar.', 'error'); return; }
  toast('Solicitud actualizada.', 'ok'); cargar();
});

let hecho = false;
onSession(({ session }) => { if (!sec || hecho || !session) return; hecho = true; cargar().catch((e) => console.error('[privacidad]', e)); });

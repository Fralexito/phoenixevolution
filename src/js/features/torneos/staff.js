// Sección «Torneos propios» de Moderación: topes globales y ocultar/mostrar/cancelar torneos (migración 097).
import { onSession, can } from '../../core/session.js';
import { toast } from '../../core/toast.js';
import { pedirTexto, confirmar } from '../../core/dialogo.js';
import { escapeHTML as esc } from '../../core/dom.js';
import { href } from '../../core/config.js';
import * as api from './api.js';
import { ESTADO_TXT } from './guia.js';

const $ = (id) => document.getElementById(id);

async function pintar() {
  const lista = $('tls-lista'); if (!lista) return;
  try {
    const [topes, torneos] = await Promise.all([api.leerTopes(), api.listarTorneos({ limite: 40 })]);
    $('tls-hab').checked = topes.habilitado; $('tls-act').value = topes.max_activos_por_usuario; $('tls-jug').value = topes.max_jugadores;
    const nombres = await api.nombresDe(torneos.map((t) => t.creador));
    lista.innerHTML = torneos.map((t) => `<div class="flex flex-wrap items-center gap-2 rounded-lg border border-white/10 bg-white/5 p-2">
      <a class="min-w-0 flex-1 text-sm text-white font-bold break-words hover:underline" href="${href('torneo/')}?id=${t.id}">${esc(t.nombre)}</a>
      <span class="text-xs text-gray-400">${esc(nombres[t.creador] ?? '—')} · ${esc(ESTADO_TXT[t.estado]?.nombre ?? t.estado)}${t.oculto ? ' · OCULTO' : ''}</span>
      <button type="button" class="btn btn-ghost !min-h-9 !text-xs" data-tls="${t.oculto ? 'mostrar' : 'ocultar'}" data-id="${t.id}">${t.oculto ? 'Mostrar' : 'Ocultar'}</button>
      ${['inscripcion', 'en_curso'].includes(t.estado) ? `<button type="button" class="btn btn-ghost !min-h-9 !text-xs" data-tls="cancelar" data-id="${t.id}">Cancelar</button>` : ''}</div>`).join('') || '<p class="text-xs text-gray-400">Todavía no hay torneos.</p>';
  } catch (e) { lista.textContent = e.message; }
}

document.addEventListener('submit', async (e) => {
  if (e.target.id !== 'tls-topes') return; e.preventDefault();
  try { await api.staffTopes({ habilitado: $('tls-hab').checked, max_activos: Number($('tls-act').value), max_jugadores: Number($('tls-jug').value) }); toast('Topes guardados.', 'ok'); } catch (err) { toast(err.message, 'error'); }
});
document.addEventListener('click', async (e) => {
  const b = e.target.closest('[data-tls]'); if (!b) return;
  const accion = b.dataset.tls; const id = Number(b.dataset.id); let motivo = null;
  if (accion === 'ocultar') { motivo = await pedirTexto('Motivo para ocultarlo (lo verá el staff):', { titulo: 'Ocultar torneo', maximo: 300 }); if (motivo === null) return; }
  if (accion === 'cancelar' && !(await confirmar('¿Cancelar este torneo? Nadie podrá seguir jugándolo.', { aceptar: 'Cancelar torneo', peligro: true }))) return;
  try { await api.staffModerar(id, accion, motivo); toast('Hecho.', 'ok'); await pintar(); } catch (err) { toast(err.message, 'error'); }
});
onSession(() => { const c = $('tls-card'); if (!c) return; c.hidden = !can('gestionarTorneos'); if (!c.hidden) pintar(); });

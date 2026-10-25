// Sección «Torneos propios» de Moderación: topes globales y ocultar/mostrar/cancelar torneos (migración 097)
// + «Pedidos para hacer oficial» (migración 144): aceptar o rechazar con motivo.
import { onSession, can } from '../../core/sistema/session.js';
import { toast } from '../../core/sistema/toast.js';
import { pedirTexto, confirmar } from '../../core/sistema/dialogo.js';
import { escapeHTML as esc } from '../../core/sistema/dom.js';
import { href } from '../../core/sistema/config.js';
import * as api from './api.js';
import { ESTADO_TXT } from './guia.js';
import { validarMotivo, nombreFormato, MAX_TEXTO } from '../../core/competicion/solicitudOficial.js';

const $ = (id) => document.getElementById(id);

async function pintar() {
  pintarPedidos();
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

// Pedidos para hacer oficial (migración 144). Los más viejos primero. Si la 144 no está, la caja lo dice y lo demás sigue igual.
async function pintarPedidos() {
  const caja = $('tls-oficial-lista'); if (!caja) return;
  try {
    const ps = await api.staffSolicitudesOficial('pendiente');
    $('tls-oficial-n').textContent = ps.length ? `(${ps.length})` : '';
    caja.innerHTML = ps.map((p) => `<div class="flex flex-wrap items-center gap-2 rounded-lg border border-white/10 bg-white/5 p-2">
      <div class="min-w-0 flex-1"><a class="text-sm text-white font-bold break-words hover:underline" href="${href('torneo/')}?id=${p.torneo_id}">${esc(p.torneo)}</a>
        <p class="text-xs text-gray-400">${esc(p.solicitante_nombre)} · ${esc(nombreFormato(p.formato))} · ${p.inscritos} inscritos · ${esc(new Date(p.creado_en).toLocaleString('es-PE', { dateStyle: 'short', timeStyle: 'short' }))}</p>
        ${p.nota ? `<p class="text-xs text-gray-300 break-words">«${esc(p.nota)}»</p>` : ''}</div>
      <button type="button" class="btn btn-primary !min-h-9 !text-xs" data-tls-pedido="si" data-id="${p.id}" data-nombre="${esc(p.torneo)}">Aceptar</button>
      <button type="button" class="btn btn-ghost !min-h-9 !text-xs" data-tls-pedido="no" data-id="${p.id}">Rechazar</button></div>`).join('')
      || '<p class="text-xs text-gray-400">No hay pedidos pendientes.</p>';
  } catch (e) { caja.textContent = e.message; }
}
document.addEventListener('click', async (e) => {
  const b = e.target.closest('[data-tls-pedido]'); if (!b) return;
  const id = Number(b.dataset.id); const aceptar = b.dataset.tlsPedido === 'si';
  try {
    if (aceptar) {
      if (!(await confirmar(`¿Hacer oficial «${b.dataset.nombre}»? Pasa a Liga oficial con sus inscritos y Phoenix Link sube los resultados solo.`, { aceptar: 'Hacerla oficial' }))) return;
      await api.staffResolverSolicitud(id, true); toast('Ahora es oficial. Se le avisó al organizador.', 'ok');
    } else {
      const m = await pedirTexto('¿Por qué no? Lo leerá quien lo pidió.', { titulo: 'Rechazar el pedido', maximo: MAX_TEXTO, aceptar: 'Rechazar' }); if (m === null) return;
      await api.staffResolverSolicitud(id, false, validarMotivo(m)); toast('Pedido rechazado. Se le avisó con tu motivo.', 'ok');
    }
  } catch (err) { toast(err.message, 'error'); }
  await pintar();
});

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

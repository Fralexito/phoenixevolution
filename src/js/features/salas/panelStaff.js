// Panel staff «Hosts Phoenix Soda» (en Moderación): aprobar/quitar hosts (host_aprobado) y suspender/reactivar/revocar PCs.
// Las reglas viven en la BD (staff_aprobar_host, staff_suspender_dispositivo): si el rol no alcanza, la RPC lo rechaza.
import { toast } from '../../core/toast.js';
import { confirmar, pedirTexto } from '../../core/dialogo.js';
import { escapeHTML } from '../../core/dom.js';
import * as staff from './staff.js';
import { supabase } from '../../core/supabase.js';

const btn = (attrs, html, extra = '') => `<button type="button" class="btn !min-h-8 !px-2.5 !text-[11px] ${extra}" ${attrs}>${html}</button>`;
const nombre = (p) => escapeHTML(p?.nombre_display || p?.username || 'Jugador');

export function montarPanelHosts(caja) {
  if (!caja) return;
  let filtro = 'pendientes';
  const pintar = async () => {
    try {
      const [hs, pcs] = await Promise.all([staff.hosts(), staff.dispositivos()]);
      const lista = hs.filter((h) => (filtro === 'pendientes' ? !h.host_aprobado : h.host_aprobado));
      const pcsDe = (id) => pcs.filter((d) => d.usuario === id && !d.revocado);
      caja.querySelector('[data-hp-lista]').innerHTML = lista.map((h) => `<article class="bg-galaxy-panel rounded-xl border border-galaxy-border p-3 space-y-2">
        <div class="flex items-center gap-2"><b class="text-white flex-1 min-w-0 truncate">${nombre(h)}</b>
          ${h.host_aprobado ? btn(`data-hp="quitar" data-id="${h.id}"`, '<i class="fa-solid fa-ban"></i> Quitar host') : btn(`data-hp="aprobar" data-id="${h.id}"`, '<i class="fa-solid fa-check"></i> Aprobar host', 'btn-primary')}</div>
        <p class="text-[11px] text-gray-400">${h.puede_hostear ? '«Puedo ser host» activado' : '«Puedo ser host» apagado'} · ${pcsDe(h.id).length} PC(s)</p>
        ${pcsDe(h.id).map((d) => `<div class="flex flex-wrap items-center gap-2 text-xs border-t border-galaxy-border/40 pt-2">
          <span class="flex-1 min-w-0">${escapeHTML(d.nombre)} <span class="text-gray-500">v${escapeHTML(d.version_app ?? '?')}</span>${d.suspendido ? ` <b class="text-rose-300">suspendida</b>${d.motivo_suspension ? ` · ${escapeHTML(d.motivo_suspension)}` : ''}` : ''}</span>
          ${btn(`data-hp="${d.suspendido ? 'reactivar' : 'suspender'}" data-id="${d.id}"`, d.suspendido ? 'Reactivar' : 'Suspender')}
          ${btn(`data-hp="revocar" data-id="${d.id}"`, 'Revocar')}</div>`).join('')}
      </article>`).join('') || `<p class="text-xs text-gray-400 col-span-full">${filtro === 'pendientes' ? 'No hay jugadores esperando aprobación.' : 'Aún no hay hosts aprobados.'}</p>`;
      caja.querySelector('[data-hp-cuenta]').textContent = `(${hs.filter((h) => !h.host_aprobado).length} pendientes)`;
    } catch (e) { caja.querySelector('[data-hp-lista]').textContent = e.message; }
  };
  caja.addEventListener('click', async (ev) => {
    const f = ev.target.closest('[data-hp-filtro]');
    if (f) { filtro = f.dataset.hpFiltro; caja.querySelectorAll('[data-hp-filtro]').forEach((x) => x.setAttribute('aria-pressed', String(x === f))); return pintar(); }
    const b = ev.target.closest('[data-hp]'); if (!b || b.disabled) return;
    b.disabled = true;
    try {
      const { hp, id } = b.dataset;
      if (hp === 'aprobar') { await staff.aprobarHost(id, true); toast('Host aprobado: ya puede vincular su PC.', 'ok'); }
      if (hp === 'quitar') { const m = await pedirTexto('Motivo (lo verá en el registro):', { maximo: 200, obligatorio: true }); if (!m) return; await staff.aprobarHost(id, false, m); toast('Permiso de host retirado.', 'ok'); }
      if (hp === 'suspender') { const m = await pedirTexto('Motivo de la suspensión:', { maximo: 200, obligatorio: true }); if (!m) return; await staff.suspenderDispositivo(id, true, m); toast('PC suspendida.', 'ok'); }
      if (hp === 'reactivar') { await staff.suspenderDispositivo(id, false); toast('PC reactivada.', 'ok'); }
      if (hp === 'revocar') { if (!(await confirmar('Revocar es definitivo: el dueño tendrá que vincular la PC de nuevo. ¿Seguir?', { aceptar: 'Revocar', peligro: true }))) return; await staff.revocarDispositivo(id); toast('PC revocada.', 'ok'); }
      await pintar();
    } catch (e) { toast(e.message, 'error'); } finally { b.disabled = false; }
  });
  pintar();
}

/** Panel staff «Creadores»: solicitudes pendientes y verificados (verificar / retirar). */
export function montarPanelCreadores(caja) {
  if (!caja) return;
  const lista = caja.querySelector('[data-cr-lista]');
  const pintar = async () => {
    try {
      const { data, error } = await supabase.from('creadores').select('usuario, verificado, plataformas, juegos, descripcion, solicitado_at').order('verificado').order('solicitado_at', { ascending: false });
      if (error) throw error;
      const ids = data.map((c) => c.usuario);
      const { data: pf } = ids.length ? await supabase.from('perfiles').select('id, nombre_display, username').in('id', ids) : { data: [] };
      const nom = (id) => nombre((pf ?? []).find((p) => p.id === id));
      lista.innerHTML = data.map((c) => `<article class="bg-galaxy-panel rounded-xl border border-galaxy-border p-3 space-y-1 text-xs">
        <div class="flex items-center gap-2"><b class="text-white flex-1">${nom(c.usuario)}</b>
          ${c.verificado ? btn(`data-cr="quitar" data-id="${c.usuario}"`, 'Retirar') : btn(`data-cr="verificar" data-id="${c.usuario}"`, '<i class="fa-solid fa-check"></i> Verificar', 'btn-primary')}</div>
        <p class="text-gray-400">${c.verificado ? 'Verificado' : 'Pendiente'} · ${escapeHTML((c.juegos ?? []).join(', '))}</p>
        <p class="break-all">${Object.entries(c.plataformas ?? {}).map(([k, u]) => `<a class="text-galaxy-400 underline mr-2" href="${escapeHTML(u)}" target="_blank" rel="noopener">${escapeHTML(k)}</a>`).join('')}</p>
      </article>`).join('') || '<p class="text-xs text-gray-400">No hay solicitudes de creadores.</p>';
    } catch (e) { lista.textContent = e.message; }
  };
  caja.addEventListener('click', async (ev) => {
    const b = ev.target.closest('[data-cr]'); if (!b || b.disabled) return; b.disabled = true;
    try {
      const ok = b.dataset.cr === 'verificar';
      const m = ok ? null : await pedirTexto('Motivo:', { maximo: 200, obligatorio: true }); if (!ok && !m) return;
      const { error } = await supabase.rpc('staff_verificar_creador', { p_usuario: b.dataset.id, p_verificado: ok, p_motivo: m }); if (error) throw error;
      toast(ok ? 'Creador verificado.' : 'Verificación retirada.', 'ok'); pintar();
    } catch (e) { toast(e.message, 'error'); } finally { b.disabled = false; }
  });
  pintar();
}

// «Clan contra clan» en /clanes/ (función nueva 7/8). RPC de la migración 150 · lógica pura en core/comunidad/clanSeries.js.
// La serie se cuenta SOLA con los duelos 1v1 confirmados entre miembros de los dos clanes (lo calcula la BD).
// Blindaje: sin migración → la sección no aparece; acciones con bloqueo anti doble clic y confirmación; la BD revalida permisos.
import { supabase } from '../../core/sistema/supabase.js';
import { escapeHTML as esc } from '../../core/sistema/dom.js';
import { toast } from '../../core/sistema/toast.js';
import { confirmar } from '../../core/sistema/dialogo.js';
import { MEJOR_DE, PLAZOS, vistaSerie, puedeRetar, validarReto, estadoSerie } from '../../core/comunidad/clanSeries.js';

const sinFuncion = (e) => e?.code === 'PGRST202' || /could not find the function|schema cache/i.test(e?.message ?? '');
const tag = (c) => `<span class="text-galaxy-400 font-bold">[${esc(c?.etiqueta ?? '')}]</span> ${esc(c?.nombre ?? '')}`;

function tarjeta(v) {
  const e = estadoSerie(v.estado);
  const acciones = [
    v.puedoResponder ? `<button type="button" data-serie-resp="${Number(v.id)}" data-ok="1" class="btn btn-primary !min-h-8 !px-3 !text-[12px]">Aceptar</button><button type="button" data-serie-resp="${Number(v.id)}" data-ok="0" class="btn btn-ghost !min-h-8 !px-3 !text-[12px]">Rechazar</button>` : '',
    v.puedoCancelar ? `<button type="button" data-serie-cancelar="${Number(v.id)}" class="btn btn-ghost !min-h-8 !px-3 !text-[12px] !text-rose-300">Cancelar</button>` : '',
  ].join('');
  return `<article class="glass-panel rounded-2xl p-3 space-y-1">
    <div class="flex flex-wrap items-center gap-2"><span class="px-2 py-0.5 rounded border text-[12px] font-display font-bold uppercase ${e.clase}">${e.texto}</span>
      ${v.resultado ? `<span class="text-[12px] text-amber-300 font-bold">${esc(v.resultado)}</span>` : ''}<span class="text-[12px] text-gray-400 ml-auto">${esc(v.meta)}</span></div>
    <div class="flex items-center gap-3 text-sm"><span class="flex-1 min-w-0 truncate text-white text-right">${tag(v.a)}</span>
      <b class="font-display text-lg text-white tabular-nums">${v.pa} – ${v.pb}</b><span class="flex-1 min-w-0 truncate text-white">${tag(v.b)}</span></div>
    ${acciones ? `<div class="flex flex-wrap gap-2 justify-end">${acciones}</div>` : ''}</article>`;
}

function formulario(clanes, miId) {
  const opciones = clanes.filter((c) => Number(c.id) !== Number(miId) && !c.oculto).map((c) => `<option value="${Number(c.id)}">[${esc(c.etiqueta)}] ${esc(c.nombre)}</option>`).join('');
  if (!opciones) return '<p class="text-[12px] text-gray-400">No hay otros clanes para retar todavía.</p>';
  return `<form id="cl-serie-form" class="grid grid-cols-2 sm:grid-cols-4 gap-2 items-end">
    <label class="col-span-2 text-[12px] text-gray-400">Clan rival<select name="rival" class="field mt-1 w-full" required><option value="">Elige…</option>${opciones}</select></label>
    <label class="text-[12px] text-gray-400">Al mejor de<select name="mejorDe" class="field mt-1 w-full">${MEJOR_DE.map((n) => `<option value="${n}" ${n === 3 ? 'selected' : ''}>${n}</option>`).join('')}</select></label>
    <label class="text-[12px] text-gray-400">Plazo<select name="plazo" class="field mt-1 w-full">${PLAZOS.map((n) => `<option value="${n}" ${n === 14 ? 'selected' : ''}>${n} días</option>`).join('')}</select></label>
    <label class="col-span-2 sm:col-span-3 text-[12px] text-gray-400">Mensaje (opcional)<input name="mensaje" maxlength="140" class="field mt-1 w-full" autocomplete="off"></label>
    <button class="btn btn-primary !min-h-9 !text-xs col-span-2 sm:col-span-1">Retar</button></form>`;
}

/** @param {HTMLElement} seccion */
export function montarSeries(seccion) {
  if (!seccion) return { cargar: () => {} };
  let ctx = { mi: null, clanes: [] }; let ocupado = false; let pedido = 0;
  async function cargar(mi = ctx.mi, clanes = ctx.clanes) {
    ctx = { mi, clanes: clanes ?? [] };
    const miId = mi?.enClan ? mi.clan?.id : null; const yo = ++pedido;
    try {
      const { data, error } = await supabase.rpc('clan_series_de', { p_clan: miId ?? null, p_limite: 20 });
      if (yo !== pedido) return;
      if (error) { if (sinFuncion(error)) { seccion.hidden = true; return; } throw error; }
      const lista = (Array.isArray(data) ? data : []).map((s) => vistaSerie(s, miId)).filter(Boolean);
      const retar = miId && puedeRetar(mi.rol);
      seccion.hidden = false;
      seccion.innerHTML = `<h2 class="text-base font-display font-bold text-white uppercase tracking-wider border-b border-galaxy-border pb-2"><i class="fa-solid fa-shield-halved text-galaxy-400 mr-2"></i>${miId ? 'Clan contra clan' : 'Series entre clanes'}</h2>
        <p class="text-[12px] text-gray-400">Series «al mejor de N». Se cuentan solas: valen los duelos 1v1 con marcador confirmado entre miembros de los dos clanes, jugados después de aceptar y antes del plazo. Solo cuentan quienes ya estaban en el clan al crearse el duelo.</p>
        ${retar ? `<div class="glass-panel rounded-2xl p-3">${formulario(ctx.clanes, miId)}</div>` : ''}
        <div class="grid gap-2">${lista.length ? lista.map(tarjeta).join('') : `<p class="text-center py-6 text-gray-400 text-xs bg-galaxy-panel rounded-xl border border-galaxy-border">${miId ? 'Tu clan aún no tiene series.' : 'Aún no hay series entre clanes.'}</p>`}</div>`;
    } catch (e) {
      if (yo !== pedido) return;
      console.error('[clanes] series:', e);
      seccion.hidden = false;
      seccion.innerHTML = '<p class="text-[12px] text-gray-300">No se pudieron cargar las series. <button type="button" data-serie-reintentar class="btn btn-ghost !min-h-8 ml-1">Reintentar</button></p>';
    }
  }
  async function hacer(fn, ok) {
    if (ocupado) return; ocupado = true;
    try { await fn(); if (ok) toast(ok, 'ok'); } catch (e) { toast(e?.message || 'No se pudo completar la acción.', 'error'); }
    finally { ocupado = false; await cargar(); }
  }
  seccion.addEventListener('click', async (e) => {
    const t = e.target.closest('[data-serie-resp],[data-serie-cancelar],[data-serie-reintentar]'); if (!t) return;
    if (t.hasAttribute('data-serie-reintentar')) { cargar(); return; }
    if (t.dataset.serieResp) {
      const si = t.dataset.ok === '1';
      if (si && !(await confirmar('Desde ahora, los duelos 1v1 confirmados entre miembros de los dos clanes contarán para la serie.', { titulo: 'Aceptar la serie', aceptar: 'Aceptar' }))) return;
      hacer(async () => { const { error } = await supabase.rpc('clan_serie_responder', { p_serie: Number(t.dataset.serieResp), p_aceptar: si }); if (error) throw error; }, si ? '¡Serie aceptada!' : 'Serie rechazada.');
    } else if (t.dataset.serieCancelar) {
      if (!(await confirmar('¿Cancelar este reto?', { titulo: 'Cancelar serie', aceptar: 'Cancelar reto', peligro: true }))) return;
      hacer(async () => { const { error } = await supabase.rpc('clan_serie_cancelar', { p_serie: Number(t.dataset.serieCancelar) }); if (error) throw error; }, 'Reto cancelado.');
    }
  });
  seccion.addEventListener('submit', (e) => {
    const f = e.target.closest('#cl-serie-form'); if (!f) return; e.preventDefault();
    const fd = new FormData(f); const v = validarReto({ rival: fd.get('rival'), mejorDe: fd.get('mejorDe'), plazo: fd.get('plazo'), mensaje: fd.get('mensaje') }, ctx.mi?.clan?.id);
    if (!v.ok) { toast(v.error, 'error'); return; }
    hacer(async () => { const { error } = await supabase.rpc('clan_serie_proponer', { p_rival: v.rival, p_mejor_de: v.mejorDe, p_plazo_dias: v.plazo, p_mensaje: v.mensaje }); if (error) throw error; }, 'Reto enviado. El otro clan tiene 7 días para responder.');
  });
  return { cargar };
}

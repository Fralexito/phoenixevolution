// Alquiler de host verificado (migración 071): buscar host, solicitar (pago por fuera o con gemas en garantía) y gestionar mis alquileres.
import { supabase } from '../core/supabase.js';
import { openModal } from '../core/modal.js';
import { toast } from '../core/toast.js';
import { confirmar } from '../core/dialogo.js';
import { escapeHTML, safeUrl } from '../core/dom.js';
import { formatoPrecio } from '../core/economia.js';

const rpc = async (n, a) => { const { data, error } = await supabase.rpc(n, a); if (error) throw new Error(error.message); return data; };
const ESTADO = { SOLICITADO: ['Pendiente', 'text-amber-300'], ACEPTADO: ['Aceptado', 'text-emerald-300'], RECHAZADO: ['Rechazado', 'text-gray-400'], CANCELADO: ['Cancelado', 'text-gray-400'], COMPLETADO: ['Completado', 'text-galaxy-300'] };
const precios = (h) => [
  h.precio_hora_centimos != null && `${formatoPrecio(h.precio_hora_centimos)}/hora`, h.precio_partido_centimos != null && `${formatoPrecio(h.precio_partido_centimos)}/partido`,
  h.acepta_gemas && h.gemas_hora && `💎 ${h.gemas_hora}/hora`, h.acepta_gemas && h.gemas_partido && `💎 ${h.gemas_partido}/partido`,
].filter(Boolean).join(' · ');
const juegos = (h) => (Array.isArray(h.juegos) ? h.juegos.map((j) => j.juego).join(', ') : '');

function hostHTML(h) {
  return `<article class="rounded-xl border border-galaxy-border p-3 space-y-2">
    <div class="flex items-center gap-2">${safeUrl(h.avatar_url) ? `<img src="${escapeHTML(h.avatar_url)}" alt="" class="w-9 h-9 rounded-full object-cover">` : '<span class="w-9 h-9 rounded-full bg-galaxy-800"></span>'}
      <div class="min-w-0 flex-1"><b class="text-white">${escapeHTML(h.nombre)} <i class="fa-solid fa-circle-check text-galaxy-400 text-xs" title="Host verificado"></i></b>
        <p class="text-[11px] text-gray-400 truncate">${escapeHTML(juegos(h) || 'Juegos sin indicar')}${h.ping_ms != null ? ` · ping medio ${Math.round(h.ping_ms)} ms` : ''}${h.completados ? ` · ${h.completados} alquileres` : ''}</p></div></div>
    <p class="text-xs text-white">${escapeHTML(precios(h))}</p>${h.notas ? `<p class="text-[11px] text-gray-400">${escapeHTML(h.notas)}</p>` : ''}
    <form data-alq="${escapeHTML(h.host)}" class="grid grid-cols-2 gap-1.5 text-xs">
      <select name="modo" class="field !py-1.5"><option value="partidos">Partidos</option><option value="horas">Horas</option></select>
      <input name="cant" type="number" min="1" max="24" value="1" class="field !py-1.5" aria-label="Cantidad">
      <input name="fecha" type="datetime-local" required class="field !py-1.5 col-span-2" aria-label="Fecha y hora">
      <select name="pago" class="field !py-1.5 col-span-2"><option value="externo">Pago por fuera (Yape, etc.)</option>${h.acepta_gemas ? '<option value="gemas">Con gemas (se guardan hasta que confirmes)</option>' : ''}</select>
      <input name="msg" maxlength="300" placeholder="Mensaje para el host (opcional)" class="field !py-1.5 col-span-2">
      <button class="btn btn-primary !min-h-9 !text-xs col-span-2"><i class="fa-solid fa-handshake"></i> Solicitar alquiler</button></form></article>`;
}

function alquilerHTML(a) {
  const [t, c] = ESTADO[a.estado] ?? [a.estado, ''];
  const monto = a.pago === 'gemas' ? `💎 ${a.monto_gemas}` : `${formatoPrecio(a.monto_centimos)} por fuera`;
  const acc = [];
  if (a.soy_host && a.estado === 'SOLICITADO') acc.push(`<button data-r="aceptar" data-id="${a.id}" class="btn btn-primary !min-h-8 !text-[11px]">Aceptar</button>`, `<button data-r="rechazar" data-id="${a.id}" class="btn !min-h-8 !text-[11px]">Rechazar</button>`);
  if (!a.soy_host && a.estado === 'ACEPTADO') acc.push(`<button data-r="completar" data-id="${a.id}" class="btn btn-primary !min-h-8 !text-[11px]">Confirmar que se cumplió</button>`);
  if (['SOLICITADO', 'ACEPTADO'].includes(a.estado)) acc.push(`<button data-r="cancelar" data-id="${a.id}" class="btn !min-h-8 !text-[11px]">Cancelar</button>`);
  return `<li class="py-2 border-b border-galaxy-border/40 text-xs space-y-1">
    <p><b class="text-white">${a.soy_host ? 'Te alquila' : 'Alquilas a'} ${escapeHTML(a.otro)}</b> · ${a.cantidad} ${a.modalidad} · ${new Date(a.fecha).toLocaleString('es-PE', { dateStyle: 'short', timeStyle: 'short' })} · ${escapeHTML(monto)} <b class="${c}">${t}</b></p>
    ${a.mensaje ? `<p class="text-gray-400">«${escapeHTML(a.mensaje)}»</p>` : ''}${acc.length ? `<div class="flex flex-wrap gap-1.5">${acc.join('')}</div>` : ''}</li>`;
}

export async function abrirAlquiler() {
  const m = openModal(`<div class="p-5 space-y-3"><div class="flex justify-between items-center"><h2 class="font-display font-bold text-xl text-white uppercase tracking-widest"><i class="fa-solid fa-server text-galaxy-400 mr-2"></i>Alquilar host</h2>
      <button type="button" data-close aria-label="Cerrar" class="text-gray-500 hover:text-white"><i class="fa-solid fa-xmark text-xl"></i></button></div>
    <div class="flex gap-1.5"><button type="button" data-t="buscar" aria-pressed="true" class="adv-chip !min-h-8 !px-3 !text-[12px]">Hosts verificados</button><button type="button" data-t="mios" aria-pressed="false" class="adv-chip !min-h-8 !px-3 !text-[12px]">Mis alquileres</button></div>
    <div data-cuerpo class="space-y-2 text-sm text-gray-300">Cargando…</div></div>`, { id: 'alquiler-modal', wide: true });
  const cuerpo = m.querySelector('[data-cuerpo]'); let tab = 'buscar';
  const pintar = async () => {
    cuerpo.textContent = 'Cargando…';
    try {
      if (tab === 'buscar') { const l = await rpc('hosts_en_alquiler'); cuerpo.innerHTML = l.length ? `<div class="grid md:grid-cols-2 gap-2">${l.map(hostHTML).join('')}</div>` : '<p class="text-xs text-gray-400">Todavía no hay hosts ofreciendo alquiler.</p>'; }
      else { const l = await rpc('mis_alquileres'); cuerpo.innerHTML = l.length ? `<ul>${l.map(alquilerHTML).join('')}</ul>` : '<p class="text-xs text-gray-400">No tienes alquileres.</p>'; }
    } catch (e) { cuerpo.textContent = e.message; }
  };
  m.addEventListener('click', async (ev) => {
    const t = ev.target.closest('[data-t]'); if (t) { tab = t.dataset.t; m.querySelectorAll('[data-t]').forEach((x) => x.setAttribute('aria-pressed', String(x === t))); return pintar(); }
    const b = ev.target.closest('[data-r]'); if (!b || b.disabled) return; b.disabled = true;
    try {
      const id = Number(b.dataset.id); const r = b.dataset.r;
      if (r === 'aceptar' || r === 'rechazar') await rpc('responder_alquiler', { p_id: id, p_aceptar: r === 'aceptar' });
      if (r === 'cancelar') { if (!(await confirmar('¿Cancelar este alquiler? Si se pagó con gemas, vuelven al cliente.', { peligro: true }))) return; await rpc('cancelar_alquiler', { p_id: id }); }
      if (r === 'completar') { if (!(await confirmar('¿El host cumplió? Si pagaste con gemas, se le entregan ahora.'))) return; await rpc('completar_alquiler', { p_id: id }); }
      toast('Listo.', 'ok'); pintar();
    } catch (e) { toast(e.message, 'error'); } finally { b.disabled = false; }
  });
  m.addEventListener('submit', async (ev) => {
    const f = ev.target.closest('[data-alq]'); if (!f) return; ev.preventDefault();
    const d = new FormData(f);
    try {
      const r = await rpc('solicitar_alquiler', { p_host: f.dataset.alq, p_modalidad: d.get('modo'), p_cantidad: Number(d.get('cant')), p_fecha: new Date(String(d.get('fecha'))).toISOString(), p_pago: d.get('pago'), p_mensaje: d.get('msg') });
      toast(r.monto_gemas ? `Solicitud enviada. ${r.monto_gemas} gemas quedan en garantía.` : 'Solicitud enviada. Coordinen el pago por fuera.', 'ok');
      tab = 'mios'; m.querySelectorAll('[data-t]').forEach((x) => x.setAttribute('aria-pressed', String(x.dataset.t === 'mios'))); pintar();
    } catch (e) { toast(e.message, 'error'); }
  });
  pintar();
}

/** Formulario «Mi oferta de alquiler» (para hosts aprobados). */
export async function montarOfertaHost(caja) {
  if (!caja) return;
  const { data: { user } = {} } = await supabase.auth.getUser(); if (!user) return;
  const { data: o } = await supabase.from('ofertas_host').select('*').eq('host', user.id).maybeSingle();
  const soles = (c) => (c == null ? '' : (c / 100).toFixed(2));
  caja.innerHTML = `<form id="f-oferta" class="grid sm:grid-cols-2 gap-2 text-xs">
    <label class="flex items-center gap-2 sm:col-span-2 text-sm text-white"><input type="checkbox" name="activa" ${o?.activa !== false ? 'checked' : ''} class="w-4 h-4 accent-cyan-400"> Ofrecer mi host en alquiler</label>
    <input name="ph" inputmode="decimal" class="field" placeholder="S/ por hora" value="${soles(o?.precio_hora_centimos)}"><input name="pp" inputmode="decimal" class="field" placeholder="S/ por partido" value="${soles(o?.precio_partido_centimos)}">
    <label class="flex items-center gap-2 sm:col-span-2 text-white"><input type="checkbox" name="gemas" ${o?.acepta_gemas ? 'checked' : ''} class="w-4 h-4 accent-cyan-400"> También acepto gemas</label>
    <input name="gh" type="number" min="1" class="field" placeholder="💎 por hora" value="${o?.gemas_hora ?? ''}"><input name="gp" type="number" min="1" class="field" placeholder="💎 por partido" value="${o?.gemas_partido ?? ''}">
    <input name="notas" maxlength="300" class="field sm:col-span-2" placeholder="Notas (horarios, reglas…)" value="${escapeHTML(o?.notas ?? '')}">
    <button class="btn btn-primary sm:col-span-2 !min-h-9 !text-xs">Guardar oferta</button></form>`;
  caja.querySelector('#f-oferta').addEventListener('submit', async (ev) => {
    ev.preventDefault(); const d = new FormData(ev.target);
    const cent = (v) => { const n = parseFloat(String(v).replace(',', '.')); return Number.isFinite(n) && n >= 0 ? Math.round(n * 100) : null; };
    const ent = (v) => { const n = parseInt(String(v), 10); return Number.isFinite(n) && n > 0 ? n : null; };
    try {
      await rpc('guardar_oferta_host', { p_activa: !!d.get('activa'), p_precio_hora: cent(d.get('ph')), p_precio_partido: cent(d.get('pp')), p_acepta_gemas: !!d.get('gemas'),
        p_gemas_hora: ent(d.get('gh')), p_gemas_partido: ent(d.get('gp')), p_contacto: null, p_notas: d.get('notas') });
      toast('Oferta guardada.', 'ok');
    } catch (e) { toast(e.message, 'error'); }
  });
}

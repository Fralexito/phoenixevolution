// Página /alquilar-host/: catálogo de hosts con filtros, precios, ping y contacto + mis alquileres + mi oferta.
// La lógica de alquiler (solicitar, aceptar, cancelar) vive en features/alquiler.js; aquí solo se arma la página.
import { supabase } from '../core/supabase.js';
import { onSession } from '../core/session.js';
import { escapeHTML, safeUrl } from '../core/dom.js';
import { toast } from '../core/toast.js';
import { openAuthModal } from '../features/auth.js';
import { rpc, precios, juegos, alquilerHTML, formSolicitud, accionAlquiler, enviarSolicitud, montarOfertaHost } from '../features/alquiler.js';
import { filtrarHosts, calidadPing, calcularTotal, marcarChoques } from '../core/hostsCatalogo.js';
import { formatoPrecio } from '../core/economia.js';

const $ = (id) => document.getElementById(id);
const S = { hosts: [], sesion: null, tab: 'catalogo', cargado: false };
const TONO = { bueno: 'text-emerald-300 border-emerald-400/40', medio: 'text-amber-300 border-amber-400/40', malo: 'text-red-300 border-red-400/40', nd: 'text-gray-400 border-galaxy-border' };

function tarjeta(h) {
  const c = calidadPing(h.ping_ms);
  const lista = Array.isArray(h.juegos) ? h.juegos : [];
  return `<article class="glass-panel rounded-2xl p-3.5 space-y-2.5 flex flex-col" data-host="${escapeHTML(h.host)}">
    <div class="flex items-center gap-2.5">
      ${safeUrl(h.avatar_url) ? `<img src="${escapeHTML(h.avatar_url)}" alt="" class="w-11 h-11 shrink-0 rounded-full object-cover">` : `<span class="w-11 h-11 shrink-0 rounded-full grid place-items-center font-display font-bold text-black bg-gradient-to-br from-cyan-300 to-purple-500">${escapeHTML(String(h.nombre ?? '?').trim().charAt(0).toUpperCase())}</span>`}
      <div class="min-w-0 flex-1"><b class="text-white font-display uppercase tracking-wide truncate block">${escapeHTML(h.nombre)} <i class="ph-bold ph-seal-check text-galaxy-400" title="Host verificado"></i></b>
        <span class="text-[12px] text-gray-400">${h.username ? `@${escapeHTML(h.username)} · ` : ''}${h.completados ? `${h.completados} alquiler${h.completados === 1 ? '' : 'es'}` : 'Nuevo en alquileres'}</span></div>
      <span class="shrink-0 rounded-md border px-2 py-1 text-[12px] font-display font-bold uppercase ${TONO[c.nivel]}" title="Ping medio hasta el host">${c.texto}</span>
    </div>
    <div class="flex flex-wrap gap-1.5">${lista.length ? lista.map((j) => `<span class="rounded-md bg-galaxy-600/20 border border-galaxy-border px-2 py-0.5 text-[12px] text-gray-200">${escapeHTML(j.juego)}</span>`).join('') : '<span class="text-[12px] text-gray-500">Juegos sin indicar</span>'}
      ${h.software ? `<span class="rounded-md border border-galaxy-border px-2 py-0.5 text-[12px] text-gray-400">${escapeHTML(h.software)}</span>` : ''}${h.ancho_banda_mbps ? `<span class="rounded-md border border-galaxy-border px-2 py-0.5 text-[12px] text-gray-400">${Math.round(h.ancho_banda_mbps)} Mbps</span>` : ''}</div>
    <p class="text-sm font-display font-bold text-galaxy-400">${escapeHTML(precios(h) || 'Precio a convenir')}</p>
    ${h.notas ? `<p class="text-[12px] text-gray-400 leading-snug">${escapeHTML(h.notas)}</p>` : ''}
    <p class="text-[12px] text-gray-500 flex items-center gap-1.5"><i class="ph-bold ph-lock-simple"></i> El contacto se muestra cuando el host acepta tu solicitud.</p>
    <details class="mt-auto"><summary class="btn btn-primary !min-h-10 w-full cursor-pointer justify-center"><i class="ph-bold ph-handshake"></i> Solicitar alquiler</summary><div class="pt-2">${formSolicitud(h)}</div></details>
  </article>`;
}

function pintarCatalogo() {
  const f = { q: $('ah-q').value, juego: $('ah-juego').value, gemas: $('ah-gemas').checked, orden: $('ah-orden').value };
  const l = filtrarHosts(S.hosts, f);
  $('ah-cuenta').textContent = S.hosts.length ? `${l.length} de ${S.hosts.length} host${S.hosts.length === 1 ? '' : 's'}` : '';
  $('ah-lista').innerHTML = !S.sesion ? '<div class="col-span-full text-center py-10 text-gray-300 text-sm glass-panel rounded-2xl"><p class="mb-3">Inicia sesión para ver los hosts, sus precios y su contacto.</p><button type="button" data-entrar class="btn btn-primary !min-h-10">Entrar</button></div>'
    : l.length ? l.map(tarjeta).join('')
    : `<div class="col-span-full text-center py-10 text-gray-400 text-sm glass-panel rounded-2xl">${S.hosts.length ? 'Ningún host coincide con tu búsqueda.' : 'Todavía no hay hosts en alquiler. ¿Tienes un buen PC e internet? Ve a «Ofrecer mi host».'}</div>`;
}

async function cargarCatalogo() {
  if (!S.sesion) { S.hosts = []; return pintarCatalogo(); }
  try {
    S.hosts = (await rpc('hosts_en_alquiler')) ?? [];
    const juegosUnicos = [...new Set(S.hosts.flatMap((h) => (Array.isArray(h.juegos) ? h.juegos.map((j) => j.juego) : [])))].sort();
    $('ah-juego').innerHTML = '<option value="">Todos</option>' + juegosUnicos.map((j) => `<option>${escapeHTML(j)}</option>`).join('');
  } catch (e) { console.error('[hosts]', e); $('ah-lista').innerHTML = `<p class="col-span-full text-center py-10 text-bad text-xs">${escapeHTML(e.message || 'No se pudo cargar el catálogo.')}</p>`; return; }
  pintarCatalogo();
}

async function cargarMios() {
  const ul = $('ah-mios-lista');
  if (!S.sesion) { ul.innerHTML = '<li class="text-xs text-gray-400">Inicia sesión para ver tus alquileres.</li>'; return; }
  try { const l = await rpc('mis_alquileres'); ul.innerHTML = l.length ? l.map(alquilerHTML).join('') : '<li class="text-xs text-gray-400">Todavía no tienes alquileres.</li>';
    for (const id of marcarChoques(l)) ul.querySelector(`[data-alq-id="${id}"] p`)?.insertAdjacentHTML('beforeend', ' <span class="text-red-300 font-bold">· Choca con otro alquiler tuyo</span>'); }
  catch (e) { ul.textContent = e.message; }
}

async function mostrarOferta() {
  const caja = $('ah-oferta-caja');
  if (!S.sesion) { caja.innerHTML = '<p class="text-xs text-gray-400">Inicia sesión para ofrecer tu host.</p>'; return; }
  let ok = false;
  try { const r = await supabase.from('perfiles').select('host_aprobado').eq('id', S.sesion).maybeSingle(); ok = !!r.data?.host_aprobado; } catch { /* se trata como no aprobado */ }
  $('ah-oferta-aviso').textContent = ok ? 'Pon tus precios y cómo contactarte. Tu contacto solo lo recibe quien alquile contigo, cuando aceptes su solicitud.' : 'Aún no eres host aprobado. Para ofrecer tu host, el staff debe verificarte primero: vincula tu PC en Phoenix Link y pídelo en el Discord.';
  caja.innerHTML = ''; if (ok) montarOfertaHost(caja);
}

function irA(tab) {
  S.tab = tab;
  document.querySelectorAll('#ah-tabs button').forEach((b) => { const on = b.dataset.tab === tab; b.setAttribute('aria-selected', String(on)); b.setAttribute('aria-pressed', String(on)); });
  $('ah-catalogo').hidden = tab !== 'catalogo'; $('ah-mios').hidden = tab !== 'mios'; $('ah-oferta').hidden = tab !== 'oferta';
  if (tab === 'mios') cargarMios();
  if (tab === 'oferta') mostrarOferta();
}

$('ah-tabs').addEventListener('click', (e) => { const b = e.target.closest('button[data-tab]'); if (b) irA(b.dataset.tab); });
['ah-q', 'ah-juego', 'ah-orden', 'ah-gemas'].forEach((id) => $(id).addEventListener(id === 'ah-q' ? 'input' : 'change', pintarCatalogo));
document.addEventListener('click', async (e) => {
  if (e.target.closest('[data-entrar]')) return openAuthModal('login');
  const cp = e.target.closest('[data-copiar]');
  if (cp) { try { await navigator.clipboard.writeText(cp.dataset.copiar); toast('Contacto copiado.', 'ok'); } catch { toast('No se pudo copiar. Selecciónalo a mano.', 'error'); } return; }
  const b = e.target.closest('#ah-mios [data-r]'); if (!b || b.disabled) return; b.disabled = true;
  try { if (await accionAlquiler(b)) { toast('Listo.', 'ok'); cargarMios(); } } catch (err) { toast(err.message, 'error'); } finally { b.disabled = false; }
});
const pintarTotal = (f) => {
  const d = new FormData(f); const t = calcularTotal({ ph: f.dataset.ph, pp: f.dataset.pp, gh: f.dataset.gh, gp: f.dataset.gp }, d.get('modo'), d.get('cant'), d.get('pago'));
  f.querySelector('[data-total]').textContent = t ? `Total estimado: ${t.unidad === 'gemas' ? `💎 ${t.valor}` : formatoPrecio(t.valor)}` : 'Este host no tiene precio para esa opción.';
};
document.addEventListener('input', (e) => { const f = e.target.closest('form[data-alq]'); if (f) pintarTotal(f); });
document.addEventListener('change', (e) => { const f = e.target.closest('form[data-alq]'); if (f) pintarTotal(f); });
document.addEventListener('toggle', (e) => { const f = e.target.querySelector?.('form[data-alq]'); if (f && e.target.open) pintarTotal(f); }, true);
document.addEventListener('submit', async (e) => {
  const f = e.target.closest('[data-alq]'); if (!f) return; e.preventDefault();
  const btn = f.querySelector('button'); if (btn) btn.disabled = true;
  try { await enviarSolicitud(f); irA('mios'); } catch (err) { toast(err.message, 'error'); } finally { if (btn) btn.disabled = false; }
});
onSession(({ session }) => { const nuevo = session?.user?.id ?? null; if (S.cargado && nuevo === S.sesion) return; S.cargado = true; S.sesion = nuevo; cargarCatalogo(); if (S.tab !== 'catalogo') irA(S.tab); });
if (location.hash === '#mis-alquileres') irA('mios'); else if (location.hash === '#ofrecer') irA('oferta');

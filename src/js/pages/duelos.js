// Sala de Duelos — orquestador. La lógica vive en features/duelos/* (datos, tarjetas, formulario, acciones).
// Esquema: pages → features → core.
import { supabase } from '../core/supabase.js';
import { onSession, refreshProfile } from '../core/session.js';
import { toast } from '../core/toast.js';
import { escapeHTML } from '../core/dom.js';
import { setRadar, isRadarOn } from '../features/radar.js';
import { startPresence, stopPresence, setEstado, onPresence, ESTADOS } from '../features/presence.js';
import { openAuthModal } from '../features/auth.js';
import { data, me, myProfile, myPart, isMine, isActive, loadPerfiles, loadRetos, visibleRetos } from '../features/duelos/data.js';
import { card } from '../features/duelos/cards.js';
import { pendientes } from '../core/misPartidos.js';
import * as act from '../features/duelos/actions.js';
import { initForm, refreshForm, submitReto, targetRival, paintRivales } from '../features/duelos/form.js';
import { openInviteModal } from '../features/duelos/invite.js';

const $ = (id) => document.getElementById(id);

/* ---------- Vistas ----------
   PC: todo a la vista. Móvil: «Lanzar reto» se abre/cierra con su botón; «Retos en el radar» está siempre visible debajo.
   data-vista = 'ninguna' | 'lanzar'. («Mis partidos» ahora es la página /mis-partidos/.) */
function setVista(v) {
  $('duelos-grid').dataset.vista = v;
  $('seg-vista').querySelectorAll('button').forEach((b) => b.setAttribute('aria-pressed', String(b.dataset.v === v)));
}

/* ---------- Pintado ---------- */
function renderAll() {
  // No repintar mientras el usuario escribe dentro de una tarjeta (perdería lo tecleado).
  if (document.activeElement?.closest?.('#lista-retos, #lista-pend') && document.activeElement.matches('input, textarea, select')) return;
  const id = me();
  const visible = visibleRetos();
  const mine = id ? visible.filter((r) => isMine(r, id)) : [];
  const rest = visible.filter((r) => !isMine(r, id));
  const pend = pendientes(mine);
  const vacio = (t, py = 'py-8') => `<div class="col-span-full text-center ${py} text-gray-400 text-xs bg-galaxy-panel rounded-xl border border-galaxy-border">${t}</div>`;
  $('lista-pend').innerHTML = !id ? vacio('Inicia sesión para ver los retos que lanzaste.', 'py-10') : pend.length ? pend.map((r) => card(r, id)).join('') : vacio('No tienes retos pendientes. Lanza uno desde el formulario.', 'py-10');
  $('lista-retos').innerHTML = rest.length ? rest.map((r) => card(r, id)).join('') : vacio('No hay retos públicos activos en este momento.', 'py-10');
  $('cnt-pend').textContent = pend.length ? `(${pend.length})` : '';
  $('cnt-radar').textContent = rest.length ? `(${rest.length})` : '';
}

async function fetchAll() {
  try { await loadRetos(); renderAll(); updateEstado(); }
  catch (e) { console.error('[duelos] retos:', e); $('lista-retos').innerHTML = '<div class="col-span-full text-center py-6 text-bad text-xs">No se pudo cargar la sala. Reintenta con «Actualizar».</div>'; }
}
act.setRefresh(fetchAll);

/* ---------- Estado unificado: Inactivo · Activo · Radar ----------
   Es UNA sola escala de disponibilidad (cada nivel incluye al anterior):
   Inactivo = no recibes ni aceptas retos al azar (perfiles.acepta_retos_azar = false)
   Activo   = recibes y aceptas retos al azar     (acepta_retos_azar = true)
   Radar    = Activo + apareces en línea y recibes alertas con sonido (Presence, solo en esta sesión) */
const ESTADO_HINT = {
  none: 'Inicia sesión para elegir tu estado.',
  off: 'No recibes ni aceptas retos al azar. Los retos directos sí te llegan.',
  on: 'Recibes y aceptas retos al azar. Te avisamos por la campana.',
  radar: 'Apareces en línea en el radar y recibes alertas con sonido al instante.',
};
const nivelActual = () => {
  const p = myProfile(); if (!p) return 'none';
  if (isRadarOn()) return 'radar';
  return p.acepta_retos_azar !== false ? 'on' : 'off';
};
function paintEstado() {
  const n = nivelActual();
  $('seg-estado').querySelectorAll('button').forEach((b) => b.setAttribute('aria-pressed', String(b.dataset.v === n)));
  $('estado-hint').textContent = ESTADO_HINT[n];
}
function applyRadar(on) {
  setRadar(on); $('radar-panel').hidden = !on;
  if (on) { startPresence({ id: me(), name: myProfile()?.nombre_display || 'Jugador' }); updateEstado(); }
  else stopPresence();
}
async function setNivel(v) {
  if (!me()) { toast('Inicia sesión para elegir tu estado.', 'error', { key: 'estado' }); openAuthModal('login'); return; }
  if (v === nivelActual()) return;
  await act.guard(async () => {
    const quiereAzar = v !== 'off';
    if (quiereAzar !== (myProfile()?.acepta_retos_azar !== false)) {
      const { error } = await supabase.from('perfiles').update({ acepta_retos_azar: quiereAzar }).eq('id', me());
      if (error) throw new Error('No se pudo cambiar tu estado.');
      await refreshProfile();
    }
    applyRadar(v === 'radar'); paintEstado();
    toast({ off: 'Estás Inactivo: no recibirás retos al azar. Los directos sí te llegan.', on: 'Estás Activo: recibes y aceptas retos al azar.', radar: 'Radar activado: apareces en línea y recibirás alertas.' }[v], 'info', { key: 'estado' });
  });
}

/* ---------- Radar ---------- */
function updateEstado() {
  const id = me(); if (!id) return;
  const mine = data.retos.filter((r) => isMine(r, id) && isActive(r) && myPart(r, id)?.estado !== 'INVITADO');
  setEstado(mine.some((r) => ['ACEPTADO', 'EN_JUEGO'].includes(r.estado)) ? 'ocupado' : mine.some((r) => r.estado === 'BUSCANDO') ? 'esperando' : 'libre');
}

function initRadar() {
  onPresence((players) => {
    data.online = new Set(players.map((p) => p.id));
    $('radar-list').innerHTML = players.length
      ? players.map((p) => `<span class="inline-flex items-center gap-2 pl-3 pr-1 py-1 rounded-full bg-galaxy-900 border border-galaxy-border text-xs text-white">
          <span class="w-2 h-2 rounded-full ${ESTADOS[p.estado].dot}"></span><b class="font-display uppercase">${escapeHTML(p.name)}</b>
          <span class="text-gray-400">${ESTADOS[p.estado].label}</span>
          ${p.id !== me() ? `<button type="button" data-retar="${escapeHTML(p.id)}" class="ml-1 px-3 min-h-9 rounded-full bg-galaxy-600 text-[12px] font-bold uppercase">Retar</button>` : '<span class="px-2 text-galaxy-400 text-[12px]">(tú)</span>'}</span>`).join('')
      : '<span class="text-xs text-gray-500">Nadie en el radar todavía.</span>';
    paintRivales();
  });
  $('radar-list').addEventListener('click', (e) => {
    const id = e.target.closest('[data-retar]')?.dataset.retar; if (!id) return;
    setVista('lanzar'); targetRival(id); $('form-crear-reto').scrollIntoView({ behavior: 'smooth', block: 'start' });
  });
  $('seg-estado').addEventListener('click', (e) => { const b = e.target.closest('button[data-v]'); if (b) setNivel(b.dataset.v); });
}

/* ---------- Clics sobre las tarjetas ---------- */
function onCardClick(e) {
  const b = e.target.closest('[data-act]'); if (!b) return;
  const id = Number(b.dataset.id);
  if (!act.needLogin()) return;
  const reto = data.retos.find((r) => r.id === id);
  ({
    accept: () => act.aceptar(id), reject: () => act.rechazar(id), cancel: () => act.cancelar(id), finish: () => act.finalizar(id),
    confirm: () => act.confirmar(id), leave: () => act.salir(id), agree: () => act.acordarCupos(id),
    'inv-yes': () => act.responder(id, true), 'inv-no': () => act.responder(id, false),
    join: () => act.unirse(id, b.dataset.team), kick: () => act.expulsar(id, b.dataset.uid),
    invite: () => reto && openInviteModal(reto, b.dataset.team),
  })[b.dataset.act]?.();
}

/* ---------- Arranque ---------- */
function syncAuthUI({ session }) {
  $('btn-emitir-reto').disabled = !session;
  if (!session && isRadarOn()) applyRadar(false);
  paintEstado(); refreshForm(); fetchAll();
}

initForm(); initRadar(); refreshForm();
/** Enlace «Retar a duelo» desde un perfil: /duelos/?retar=<id>. Cuando cargan los perfiles se abre «Lanzar reto» con ese rival ya elegido. Un id inválido se ignora. */
function retoDesdeEnlace() {
  const id = new URLSearchParams(location.search).get('retar') ?? '';
  if (!/^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(id) || id === me()) return;
  if (!data.perfiles.has(id)) { if (me()) toast('No encontré a ese jugador para retarlo.', 'error', { key: 'retar-enlace' }); return; }
  setVista('lanzar'); targetRival(id); $('form-crear-reto').scrollIntoView({ behavior: 'smooth', block: 'start' });
}
loadPerfiles().then(refreshForm).then(retoDesdeEnlace).catch((e) => console.error('[duelos] perfiles:', e));
$('form-crear-reto').addEventListener('submit', submitReto);
$('btn-refrescar').addEventListener('click', fetchAll);
// Tocar el botón abierto lo cierra (en móvil).
$('seg-vista').addEventListener('click', (e) => { const b = e.target.closest('button[data-v]'); if (b) setVista($('duelos-grid').dataset.vista === b.dataset.v ? 'ninguna' : b.dataset.v); });
// Un reto recién emitido aún no es un «partido» (nadie lo aceptó): se lleva al usuario a «Tus retos pendientes».
window.addEventListener('duelos:creado', () => { setVista('ninguna'); setTimeout(() => $('col-lanzados').scrollIntoView({ behavior: 'smooth', block: 'start' }), 800); });
['lista-retos', 'lista-pend'].forEach((id) => {
  $(id).addEventListener('click', onCardClick);
  $(id).addEventListener('submit', (e) => {
    const f = e.target.closest('[data-form="link"]'); if (!f) return;
    e.preventDefault(); const fd = new FormData(f);
    act.publicarEnlace(Number(f.dataset.id), String(fd.get('link') ?? '').trim(), String(fd.get('detalle') ?? '').trim());
  });
});
onSession(syncAuthUI);

// Refresco: Realtime (con antirrebote), evento interno de notificaciones y respaldo cada 60 s (Realtime cubre lo urgente).
let t; const soon = () => { clearTimeout(t); t = setTimeout(fetchAll, 300); };
supabase.channel('sala-duelos')
  .on('postgres_changes', { event: '*', schema: 'public', table: 'retos_matchmaking' }, soon)
  .on('postgres_changes', { event: '*', schema: 'public', table: 'reto_participantes' }, soon)
  .subscribe();
window.addEventListener('duelos:refresh', soon);
setInterval(() => { if (!document.hidden) fetchAll(); }, 60000);
// Cada 20 s se repinta (sin red) para que los botones de confirmar aparezcan a su hora exacta.
setInterval(() => { if (!document.hidden) renderAll(); }, 20000);

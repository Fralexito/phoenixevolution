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
import * as act from '../features/duelos/actions.js';
import { initForm, refreshForm, submitReto, targetRival, paintRivales } from '../features/duelos/form.js';
import { openInviteModal } from '../features/duelos/invite.js';

const $ = (id) => document.getElementById(id);

/* ---------- Pintado ---------- */
function renderAll() {
  // No repintar mientras el usuario escribe dentro de una tarjeta (perdería lo tecleado).
  if (document.activeElement?.closest?.('#lista-mis, #lista-retos') && document.activeElement.matches('input, textarea, select')) return;
  const id = me();
  const visible = visibleRetos();
  const mine = visible.filter((r) => isMine(r, id));
  const rest = visible.filter((r) => !isMine(r, id));
  $('mis-partidos').hidden = !id;
  $('lista-mis').innerHTML = mine.length ? mine.map((r) => card(r, id)).join('')
    : '<div class="col-span-full text-center py-8 text-gray-500 text-xs bg-galaxy-panel rounded-xl border border-galaxy-border">No tienes partidos activos. ¡Lanza un reto!</div>';
  $('lista-retos').innerHTML = rest.length ? rest.map((r) => card(r, id)).join('')
    : '<div class="col-span-full text-center py-10 text-gray-500 text-xs bg-galaxy-panel rounded-xl border border-galaxy-border">No hay retos públicos activos en este momento.</div>';
}

async function fetchAll() {
  try { await loadRetos(); renderAll(); updateEstado(); }
  catch (e) { console.error('[duelos] retos:', e); $('lista-retos').innerHTML = '<div class="col-span-full text-center py-6 text-bad text-xs">No se pudo cargar la sala. Reintenta con «Actualizar».</div>'; }
}
act.setRefresh(fetchAll);

/* ---------- Interruptor Activo / Inactivo (retos al azar) ---------- */
function paintAzar() {
  const p = myProfile(); const btn = $('azar-toggle');
  btn.disabled = !p;
  const on = p ? p.acepta_retos_azar !== false : true;
  btn.setAttribute('aria-checked', String(on));
  $('azar-text').textContent = !p ? 'Retos al azar: Inicia sesión' : on ? 'Retos al azar: Activo' : 'Retos al azar: Inactivo';
}
async function toggleAzar() {
  const p = myProfile(); if (!p) return;
  const next = !(p.acepta_retos_azar !== false);
  await act.guard(async () => {
    const { error } = await supabase.from('perfiles').update({ acepta_retos_azar: next }).eq('id', me());
    if (error) throw new Error('No se pudo cambiar tu estado.');
    await refreshProfile();
    toast(next ? 'Estás Activo: recibes y aceptas retos al azar.' : 'Estás Inactivo: no recibirás retos al azar. Los directos sí te llegan.', 'info', { key: 'azar' });
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
          ${p.id !== me() ? `<button type="button" data-retar="${escapeHTML(p.id)}" class="ml-1 px-3 min-h-9 rounded-full bg-galaxy-600 text-[11px] font-bold uppercase">Retar</button>` : '<span class="px-2 text-galaxy-400 text-[10px]">(tú)</span>'}</span>`).join('')
      : '<span class="text-xs text-gray-500">Nadie en el radar todavía.</span>';
    paintRivales();
  });
  $('radar-list').addEventListener('click', (e) => {
    const id = e.target.closest('[data-retar]')?.dataset.retar; if (!id) return;
    targetRival(id); $('form-crear-reto').scrollIntoView({ behavior: 'smooth', block: 'start' });
  });
  $('radar-toggle').addEventListener('click', () => {
    const turnOn = !isRadarOn();
    if (turnOn && !me()) { toast('Inicia sesión para activar el radar.', 'error', { key: 'radar' }); openAuthModal('login'); return; }
    setRadar(turnOn);
    $('radar-toggle').setAttribute('aria-checked', String(turnOn));
    $('radar-status-text').textContent = turnOn ? 'Radar Activo (En línea)' : 'Radar Desactivado';
    $('radar-panel').hidden = !turnOn;
    if (turnOn) { startPresence({ id: me(), name: myProfile()?.nombre_display || 'Jugador' }); updateEstado(); toast('Radar activado: apareces en línea y recibirás alertas.', 'info', { key: 'radar' }); }
    else stopPresence();
  });
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
  if (!session && isRadarOn()) { setRadar(false); stopPresence(); $('radar-toggle').setAttribute('aria-checked', 'false'); $('radar-panel').hidden = true; $('radar-status-text').textContent = 'Radar Desactivado'; }
  paintAzar(); refreshForm(); fetchAll();
}

initForm(); initRadar(); refreshForm(); loadPerfiles().then(refreshForm);
$('form-crear-reto').addEventListener('submit', submitReto);
$('btn-refrescar').addEventListener('click', fetchAll);
$('azar-toggle').addEventListener('click', toggleAzar);
['lista-retos', 'lista-mis'].forEach((id) => {
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

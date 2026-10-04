// Campana con historial PERSISTENTE (tabla `notificaciones`) + aviso en tiempo real.
// Las crea la BD (triggers y tareas programadas); el cliente solo lee y marca como leídas.
import { supabase } from '../core/supabase.js';
import { escapeHTML } from '../core/dom.js';
import { toast, beep } from '../core/toast.js';
import { href } from '../core/config.js';
import { isRadarOn } from './radar.js';
import { showHolo } from './holo.js';

const ICON = {
  RETO_DIRECTO: 'fa-bolt', RETO_HOST: 'fa-server', RETO_ACEPTADO: 'fa-handshake', RETO_RECHAZADO: 'fa-ban',
  SALA_LISTA: 'fa-door-open', CONFIRMAR_PARTIDO: 'fa-clock', AVISO_FINAL: 'fa-triangle-exclamation',
  PARTIDO_CONFIRMADO: 'fa-circle-check', PARTIDO_CANCELADO: 'fa-circle-xmark', RETO_EXPIRADO: 'fa-hourglass-end',
  INVITACION_RETO: 'fa-user-plus', UNION_RETO: 'fa-users', SALIO_RETO: 'fa-user-minus',
};
const fmt = (iso) => new Date(iso).toLocaleString('es', { day: 'numeric', month: 'short', hour: '2-digit', minute: '2-digit' });
const LIMIT = 30;

export function initNotifications(userId) {
  const btn = document.getElementById('btn-notif');
  const panel = document.getElementById('dropdown-notif');
  const dot = document.getElementById('notif-dot');
  if (!btn || !panel || !dot) return () => {};
  let items = [];

  const unread = () => items.filter((n) => !n.leida).length;

  const paint = () => {
    const u = unread();
    dot.hidden = u === 0; dot.textContent = u > 9 ? '9+' : String(u || '');
    panel.innerHTML = `
      <div class="px-4 py-3 border-b border-galaxy-border flex items-center justify-between">
        <span class="font-display font-bold text-xs uppercase tracking-widest text-gray-400">Notificaciones</span>
        ${u ? '<button type="button" data-n="all" class="text-[11px] text-galaxy-400 hover:text-white font-bold uppercase">Marcar leídas</button>' : ''}
      </div>
      <div class="max-h-[60vh] overflow-y-auto">${items.length ? items.map((n) => `
        <a href="${escapeHTML(href('duelos/'))}" data-n="${n.id}" class="notif-item ${n.leida ? '' : 'is-new'}">
          <i class="fa-solid ${ICON[n.tipo] ?? 'fa-bell'} text-galaxy-400 mt-0.5 w-4 text-center"></i>
          <span class="min-w-0 flex-1"><b class="block text-white text-xs font-display uppercase tracking-wide">${escapeHTML(n.titulo)}</b>
            <span class="block text-xs text-gray-300">${escapeHTML(n.mensaje)}</span>
            <span class="block text-[10px] text-gray-500 mt-0.5">${escapeHTML(fmt(n.created_at))}${n.fecha_ref ? ` · partido ${escapeHTML(fmt(n.fecha_ref))}` : ''}</span></span>
        </a>`).join('') : '<div class="px-4 py-8 text-xs text-gray-500 text-center">Sin novedades por ahora.</div>'}</div>`;
  };

  async function load() {
    const { data, error } = await supabase.from('notificaciones').select('id, tipo, titulo, mensaje, reto_id, fecha_ref, leida, created_at')
      .eq('usuario_id', userId).order('created_at', { ascending: false }).limit(LIMIT);
    if (error) { console.error('[notif] carga:', error.message); return; }
    items = data ?? []; paint();
  }

  async function markRead(ids) {
    if (!ids.length) return;
    items.forEach((n) => { if (ids.includes(n.id)) n.leida = true; });
    paint();
    const { error } = await supabase.from('notificaciones').update({ leida: true }).in('id', ids);
    if (error) console.error('[notif] marcar leída:', error.message);
  }

  const onBtn = (e) => { e.stopPropagation(); panel.hidden = !panel.hidden; };
  const onPanel = (e) => {
    const t = e.target.closest('[data-n]'); if (!t) return;
    if (t.dataset.n === 'all') { e.preventDefault(); markRead(items.filter((n) => !n.leida).map((n) => n.id)); }
    else markRead([Number(t.dataset.n)]);
  };
  const onDoc = (e) => { if (!e.target.closest('#btn-notif, #dropdown-notif')) panel.hidden = true; };
  btn.addEventListener('click', onBtn); panel.addEventListener('click', onPanel); document.addEventListener('click', onDoc);

  paint(); load();

  const channel = supabase.channel(`notif-${userId}`)
    .on('postgres_changes', { event: 'INSERT', schema: 'public', table: 'notificaciones', filter: `usuario_id=eq.${userId}` }, (p) => {
      const n = p.new;
      items.unshift(n); items.length = Math.min(items.length, LIMIT); paint();
      window.dispatchEvent(new CustomEvent('duelos:refresh'));
      // Directo o invitación → siempre holograma + sonido. Petición de host a todos → solo con el radar activo (evita spam).
      if (n.tipo === 'RETO_DIRECTO' || n.tipo === 'INVITACION_RETO' || (n.tipo === 'RETO_HOST' && isRadarOn())) showHolo(n);
      else { toast(`${n.titulo}: ${n.mensaje}`, 'info', { key: `n${n.id}` }); beep(); }
    })
    .subscribe((s) => { if (s === 'CHANNEL_ERROR') console.error('[notif] canal Realtime con error'); });

  return () => {
    supabase.removeChannel(channel);
    btn.removeEventListener('click', onBtn); panel.removeEventListener('click', onPanel); document.removeEventListener('click', onDoc);
  };
}

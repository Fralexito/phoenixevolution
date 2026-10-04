// Pinta las tarjetas de reto. Solo devuelve HTML (no toca la red); todo dato de la BD pasa por escapeHTML.
import { escapeHTML, safeUrl } from '../../core/dom.js';
import { regionAhora } from '../ajustes.js';
import { confirmPhase } from '../../core/schedule.js';
import { CONFIRM_OPEN_MIN, CONFIRM_CLOSE_MIN } from '../../core/rules.js';
import { seats } from '../../core/teams.js';
import { data, nm, partsOf, myPart, isLeader, isActive, myProfile } from './data.js';

const fmt = (d) => new Date(d).toLocaleString('es', { weekday: 'short', day: 'numeric', month: 'short', hour: '2-digit', minute: '2-digit', ...regionAhora() });
const hm = (ms) => new Date(ms).toLocaleTimeString('es', { hour: '2-digit', minute: '2-digit', ...regionAhora() });
const badge = (t, cls = 'text-galaxy-400 border-galaxy-400/30 bg-galaxy-600/20') => `<span class="px-2 py-0.5 rounded border text-[10px] font-bold uppercase ${cls}">${t}</span>`;
const NEUTRAL = 'text-gray-300 border-gray-600/50 bg-black/30';

/* ---------- Equipos y cupos ---------- */
const canJoin = (r, equipo, id) => {
  if (!isActive(r) || (r.destinatario_id && !r.directo_publico)) return false;       // privado → solo invitados
  if (id && (myPart(r, id) || r.retador_id === id)) return false;
  if (id && myProfile() && myProfile().acepta_retos_azar === false) return false;   // modo Inactivo
  if (equipo === 'B' && !r.rival_id) return false;                                  // B se abre cuando alguien acepta
  if (r.requiere_host && !r.rival_id) return false;
  return seats(equipo === 'A' ? r.tam_a : r.tam_b, partsOf(r.id), equipo).free > 0;
};

function teamColumn(r, equipo, id) {
  const tam = equipo === 'A' ? r.tam_a : r.tam_b;
  const parts = partsOf(r.id);
  const s = seats(tam, parts, equipo);
  const lider = equipo === 'A' ? r.retador_id : r.rival_id;
  const iLead = isLeader(r, id) && lider === id;
  const rows = parts.filter((p) => p.equipo === equipo)
    .sort((a, b) => (b.usuario_id === lider) - (a.usuario_id === lider))
    .map((p) => `<li class="flex items-center justify-between gap-1 ${p.estado === 'INVITADO' ? 'text-gray-500 italic' : 'text-gray-200'}">
        <span class="truncate">${p.usuario_id === lider ? '<i class="fa-solid fa-crown text-amber-400 mr-1"></i>' : ''}${escapeHTML(nm(p.usuario_id))}${p.estado === 'INVITADO' ? ' (invitado)' : ''}</span>
        ${iLead && p.usuario_id !== lider && isActive(r) ? `<button type="button" data-act="kick" data-id="${r.id}" data-uid="${escapeHTML(p.usuario_id)}" aria-label="Quitar a ${escapeHTML(nm(p.usuario_id))}" class="text-gray-500 hover:text-bad min-w-10 min-h-10"><i class="fa-solid fa-xmark"></i></button>` : ''}</li>`).join('');
  const libres = Array.from({ length: s.free }, () => '<li class="text-gray-600 border border-dashed border-gray-700 rounded px-1.5 py-0.5">cupo libre</li>').join('');
  const aviso = equipo === 'B' && !r.rival_id ? '<li class="text-gray-500">Lo lidera quien acepte el reto</li>' : '';
  const join = canJoin(r, equipo, id) ? `<button type="button" data-act="join" data-id="${r.id}" data-team="${equipo}" class="btn btn-cyan w-full !min-h-11 mt-2 !text-xs">Unirme al equipo ${equipo}</button>` : '';
  const inv = iLead && isActive(r) && s.free > 0 ? `<button type="button" data-act="invite" data-id="${r.id}" data-team="${equipo}" class="btn btn-ghost w-full !min-h-11 mt-2 !text-xs"><i class="fa-solid fa-user-plus"></i> Invitar</button>` : '';
  return `<div class="rounded-lg bg-black/40 border border-galaxy-border/70 p-2.5">
    <div class="flex justify-between text-[10px] font-display font-bold uppercase tracking-wider mb-1.5"><span class="text-galaxy-400">Equipo ${equipo}</span><span class="text-gray-400">${s.confirmed}/${tam}</span></div>
    <ul class="space-y-1 text-[11px]">${rows}${aviso}${libres}</ul>${join}${inv}</div>`;
}

function inviteBanner(r, id) {
  const p = myPart(r, id);
  if (!p || p.estado !== 'INVITADO' || !isActive(r)) return '';
  return `<div class="mt-3 p-3 rounded-lg border border-galaxy-400/50 bg-galaxy-600/10 space-y-2">
    <p class="text-xs text-white"><i class="fa-solid fa-envelope-open-text text-galaxy-400 mr-1"></i>Te invitaron al equipo ${escapeHTML(p.equipo)}.</p>
    <div class="flex gap-2"><button type="button" data-act="inv-yes" data-id="${r.id}" class="btn btn-primary flex-1 !min-h-11">Aceptar</button><button type="button" data-act="inv-no" data-id="${r.id}" class="btn btn-ghost flex-1 !min-h-11">Rechazar</button></div></div>`;
}

/** Los dos líderes deben aceptar jugar si faltan jugadores. */
function agreementBlock(r, id) {
  if (!['ACEPTADO', 'EN_JUEGO'].includes(r.estado) || !isLeader(r, id)) return '';
  const parts = partsOf(r.id);
  const missing = seats(r.tam_a, parts, 'A').missing + seats(r.tam_b, parts, 'B').missing;
  if (!missing) return '';
  const mineAt = id === r.retador_id ? r.acuerdo_retador_at : r.acuerdo_rival_at;
  const chip = (who, at) => `<span class="text-[11px] ${at ? 'text-emerald-400' : 'text-gray-400'}"><i class="fa-solid ${at ? 'fa-circle-check' : 'fa-circle-notch'} mr-1"></i>${escapeHTML(who)}</span>`;
  return `<div class="mt-3 p-3 rounded-lg bg-black/40 border border-warn/40 space-y-2">
    <p class="text-[11px] text-warn"><i class="fa-solid fa-users-slash mr-1"></i>Faltan ${missing} jugador${missing > 1 ? 'es' : ''}. Para publicar la sala sin completar los equipos, los dos líderes deben aceptar.</p>
    <div class="flex flex-wrap gap-x-4">${chip(nm(r.retador_id), r.acuerdo_retador_at)}${chip(nm(r.rival_id), r.acuerdo_rival_at)}</div>
    ${mineAt ? '' : `<button type="button" data-act="agree" data-id="${r.id}" class="btn btn-cyan w-full !min-h-11">Jugar con los cupos actuales</button>`}</div>`;
}

/* ---------- Confirmación de hora, enlace y botones ---------- */
function confirmBlock(r, id) {
  if (r.modalidad !== 'PROGRAMADO' || r.estado !== 'ACEPTADO' || !r.fecha_programada || !isLeader(r, id)) return '';
  const phase = confirmPhase(r.fecha_programada);
  const t = new Date(r.fecha_programada).getTime();
  const mineAt = id === r.retador_id ? r.confirmo_retador_at : r.confirmo_rival_at;
  const chip = (who, at) => `<span class="text-[11px] ${at ? 'text-emerald-400' : 'text-gray-400'}"><i class="fa-solid ${at ? 'fa-circle-check' : 'fa-circle-notch'} mr-1"></i>${escapeHTML(who)}</span>`;
  let body;
  if (mineAt) body = '<p class="text-[11px] text-emerald-400">Ya confirmaste. Esperando al otro líder.</p>';
  else if (phase === 'pronto') body = `<p class="text-[11px] text-gray-300"><i class="fa-regular fa-clock mr-1"></i>Podrás confirmar desde las ${escapeHTML(hm(t - CONFIRM_OPEN_MIN * 60e3))}.</p>`;
  else if (phase === 'abierta') body = `<button type="button" data-act="confirm" data-id="${r.id}" class="btn btn-primary w-full !min-h-11">Confirmar que sigo en pie</button><p class="text-[10px] text-warn mt-1">Si no confirmas antes de las ${escapeHTML(hm(t - CONFIRM_CLOSE_MIN * 60e3))}, el partido se cancela.</p>`;
  else body = '<p class="text-[11px] text-bad">Se cerró la confirmación: el sistema cancelará el partido.</p>';
  return `<div class="mt-3 p-3 rounded-lg bg-black/40 border border-galaxy-border/70 space-y-2"><div class="flex flex-wrap gap-x-4 gap-y-1">${chip(nm(r.retador_id), r.confirmo_retador_at)}${chip(nm(r.rival_id), r.confirmo_rival_at)}</div>${body}</div>`;
}

function linkBlock(r, id) {
  const p = myPart(r, id);
  if (!['ACEPTADO', 'EN_JUEGO'].includes(r.estado) || !p || p.estado !== 'CONFIRMADO') return '';
  const c = data.conexion.get(r.id);
  if (r.host_id === id) {
    return `<form data-form="link" data-id="${r.id}" class="mt-3 space-y-2">
      <label class="label" for="lk${r.id}">Enlace / ID / token de tu sala (${escapeHTML(r.plataforma)})</label>
      <input id="lk${r.id}" class="field" name="link" required maxlength="300" placeholder="https://… · parsec://… · steam://…" value="${escapeHTML(c?.link ?? '')}">
      <input class="field" name="detalle" maxlength="120" placeholder="Código, contraseña o nota (opcional)" value="${escapeHTML(c?.detalle ?? '')}">
      <button class="btn btn-cyan w-full !min-h-11" type="submit">${c ? 'Actualizar enlace' : 'Publicar enlace'}</button></form>`;
  }
  const url = safeUrl(c?.link, { allowParsec: true });
  return c && url
    ? `<div class="mt-3 space-y-2"><a href="${escapeHTML(url)}" target="_blank" rel="noopener" class="btn btn-primary w-full !min-h-11">Conectar a ${escapeHTML(nm(r.host_id))}</a>${c.detalle ? `<p class="text-xs text-gray-300"><i class="fa-solid fa-key mr-1 text-galaxy-400"></i>${escapeHTML(c.detalle)}</p>` : ''}</div>`
    : `<p class="mt-3 text-[11px] text-gray-400"><i class="fa-solid fa-hourglass-half mr-1"></i>Esperando el enlace del host (${escapeHTML(nm(r.host_id))})…</p>`;
}

function mainActions(r, id) {
  const btn = (act, label, cls) => `<button type="button" data-act="${act}" data-id="${r.id}" class="btn ${cls} flex-1 !min-h-11">${label}</button>`;
  if (!id) return r.estado === 'BUSCANDO' && !r.destinatario_id ? btn('accept', 'Aceptar Reto', 'btn-primary') : '';
  if (r.estado === 'BUSCANDO') {
    if (r.retador_id === id) return btn('cancel', 'Cancelar', 'btn-ghost');
    if (r.destinatario_id === id) return btn('accept', 'Aceptar', 'btn-primary') + btn('reject', 'Rechazar', 'btn-ghost');
    if (r.destinatario_id) return '';                                   // reto directo público: solo se mira
    return myPart(r, id) ? '' : btn('accept', r.requiere_host ? 'Ser el host y aceptar' : 'Aceptar y liderar equipo B', 'btn-primary');
  }
  if (isLeader(r, id)) return btn('cancel', 'Cancelar', 'btn-ghost') + btn('finish', '<i class="fa-solid fa-flag-checkered"></i> Finalizar', 'btn-ghost');
  const p = myPart(r, id);
  return p && p.estado === 'CONFIRMADO' ? btn('leave', 'Salir del partido', 'btn-ghost') : '';
}

export function card(r, id) {
  const when = r.fecha_programada ? fmt(r.fecha_programada) : 'Inmediato';
  const open = r.estado !== 'BUSCANDO';
  const direct = !!r.destinatario_id;
  const title = direct
    ? `${escapeHTML(nm(r.retador_id))} <i class="fa-solid fa-arrow-right text-galaxy-400 mx-1 text-sm"></i> ${escapeHTML(nm(r.destinatario_id))}`
    : escapeHTML(nm(r.retador_id));
  const hostTxt = r.host_id ? `Host: ${escapeHTML(nm(r.host_id))}` : r.requiere_host ? 'Busca host' : `Host: ${escapeHTML(nm(r.retador_id))}`;
  const actions = mainActions(r, id);
  return `
  <article class="relative rounded-xl p-4 sm:p-5 bg-gradient-to-b from-galaxy-900/90 via-galaxy-panel to-galaxy-deep border ${open ? 'border-emerald-500/60 shadow-[0_0_25px_rgba(16,185,129,0.3)]' : 'border-galaxy-600/40 shadow-[0_0_20px_rgba(128,0,255,0.2)]'}">
    <div class="flex flex-wrap items-center gap-1.5 mb-2">
      ${badge(escapeHTML(r.plataforma))}
      ${badge(`${r.tam_a} vs ${r.tam_b}`, 'text-amber-300 border-amber-400/40 bg-amber-400/10')}
      ${direct ? badge(r.directo_publico ? '<i class="fa-solid fa-eye mr-1"></i>Público' : '<i class="fa-solid fa-lock mr-1"></i>Privado', NEUTRAL) : badge('Abierto', NEUTRAL)}
      ${open ? badge('● Aceptado', 'text-emerald-400 border-emerald-500/40 bg-emerald-500/10') : ''}
    </div>
    <h3 class="text-lg font-display font-bold text-white uppercase leading-tight">${title}${r.retador_id === id ? ' <span class="text-[10px] text-galaxy-400">(tú)</span>' : ''}</h3>
    <p class="text-[11px] text-gray-300 mt-1.5"><i class="fa-regular fa-clock mr-1"></i>${escapeHTML(when)} · ${r.modalidad === 'PROGRAMADO' ? 'con confirmación' : 'sin confirmación'}</p>
    <p class="text-[11px] text-gray-400 mb-3"><i class="fa-solid fa-server mr-1"></i>${hostTxt}</p>
    <div class="grid grid-cols-2 gap-2">${teamColumn(r, 'A', id)}${teamColumn(r, 'B', id)}</div>
    ${id ? inviteBanner(r, id) + agreementBlock(r, id) + confirmBlock(r, id) + linkBlock(r, id) : ''}
    ${actions ? `<div class="mt-4 pt-3 border-t border-galaxy-border/60 flex gap-2">${actions}</div>` : ''}
  </article>`;
}

/** Fila compacta del historial: quién jugó contra quién, formato, plataforma y cuándo terminó. */
export function cardHistorial(r, id) {
  const lado = (eq) => { const ps = partsOf(r.id).filter((p) => p.equipo === eq); const lider = eq === 'A' ? r.retador_id : r.rival_id; const nombres = ps.length ? ps.map((p) => nm(p.usuario_id)) : [lider ? nm(lider) : '—']; return escapeHTML(nombres.join(' + ')); };
  const cuando = r.cerrado_at ? fmt(r.cerrado_at) : r.fecha_programada ? fmt(r.fecha_programada) : '';
  return `<article class="rounded-xl px-4 py-3 bg-galaxy-panel border border-galaxy-border/80">
    <div class="flex flex-wrap items-center gap-1.5 mb-1.5">${badge('Finalizado', NEUTRAL)}${badge(escapeHTML(r.plataforma))}${badge(`${r.tam_a} vs ${r.tam_b}`, 'text-amber-300 border-amber-400/40 bg-amber-400/10')}</div>
    <p class="font-display font-bold text-white uppercase leading-tight text-sm">${lado('A')} <span class="text-galaxy-400 mx-1">vs</span> ${lado('B')}</p>
    ${cuando ? `<p class="text-[11px] text-gray-400 mt-1"><i class="fa-regular fa-calendar-check mr-1"></i>${escapeHTML(cuando)}</p>` : ''}
  </article>`;
}

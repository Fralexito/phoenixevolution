// Formulario "Lanzar reto": destino, tamaño de equipos, amigos, host, plataforma y hora.
import { supabase } from '../../core/supabase.js';
import { toast } from '../../core/toast.js';
import { escapeHTML } from '../../core/dom.js';
import { regionAhora } from '../ajustes.js';
import { SLOT_HOURS, slotToDate, manualToDate, isFuture, presetToReto } from '../../core/schedule.js';
import { MAX_PLAYERS } from '../../core/rules.js';
import { setTeamSize, maxFor } from '../../core/teams.js';
import { data, me, myProfile, nm } from './data.js';
import { needLogin, guard, friendly, refresh, invitar } from './actions.js';

const $ = (id) => document.getElementById(id);
const MESES = ['Enero', 'Febrero', 'Marzo', 'Abril', 'Mayo', 'Junio', 'Julio', 'Agosto', 'Septiembre', 'Octubre', 'Noviembre', 'Diciembre'];
const fmt = (d) => new Date(d).toLocaleString('es', { weekday: 'short', day: 'numeric', month: 'short', hour: '2-digit', minute: '2-digit', ...regionAhora() });
const pressed = (btns, pred) => btns.forEach((b) => b.setAttribute('aria-pressed', String(pred(b))));
const all = (sel) => [...document.querySelectorAll(sel)];

export const ui = { destino: 'abierto', vis: 'privado', host: 'yo', preset: 'ya', mode: 'rapido', dayOffset: 0, slot: null, rival: null, a: 1, b: 1, amigos: new Set() };

/* ---------- Cuándo ---------- */
function chosenWhen() {
  if (ui.preset !== 'manual') return { ok: true, ...presetToReto(ui.preset) };
  const r = ui.mode === 'rapido'
    ? (ui.slot ? { ok: true, date: slotToDate(ui.dayOffset, ui.slot) } : { ok: false, error: 'Elige una hora.' })
    : manualToDate({ day: +$('manual-dia').value, month: +$('manual-mes').value, hhmm: $('manual-hora').value });
  if (!r.ok) return r;
  if (!isFuture(r.date)) return { ok: false, error: 'Mínimo 30 minutos de antelación.' };
  return { ok: true, modalidad: 'PROGRAMADO', fecha_programada: r.date.toISOString() };
}

/* ---------- Listas de jugadores ---------- */
export function paintRivales() {
  const q = $('buscar-rival').value.trim().toLowerCase();
  const needHost = ui.host === 'otro';
  const list = [...data.perfiles.values()]
    .filter((p) => p.id !== me() && (!needHost || p.puede_hostear) && (!q || (p.nombre_display ?? '').toLowerCase().includes(q)))
    .sort((a, b) => (data.online.has(b.id) - data.online.has(a.id)) || (a.nombre_display ?? '').localeCompare(b.nombre_display ?? ''));
  $('select-rival').innerHTML = list.length
    ? list.map((p) => `<option value="${escapeHTML(p.id)}" ${p.id === ui.rival ? 'selected' : ''}>${data.online.has(p.id) ? '● ' : ''}${escapeHTML(p.nombre_display ?? 'Jugador')}${p.puede_hostear ? ' · host' : ''}</option>`).join('')
    : `<option disabled>${needHost ? 'Nadie con host coincide' : 'Sin resultados'}</option>`;
}

function paintAmigos() {
  const cupo = ui.a - 1;                                            // yo ocupo uno
  $('bloque-amigos').hidden = cupo < 1;
  if (cupo < 1) { ui.amigos.clear(); return; }
  while (ui.amigos.size > cupo) ui.amigos.delete([...ui.amigos].pop());
  const q = $('buscar-amigo').value.trim().toLowerCase();
  const list = [...data.perfiles.values()].filter((p) => p.id !== me() && p.id !== (ui.destino === 'directo' ? ui.rival : null) && (ui.amigos.has(p.id) || !q || (p.nombre_display ?? '').toLowerCase().includes(q)))
    .sort((a, b) => (ui.amigos.has(b.id) - ui.amigos.has(a.id)) || (data.online.has(b.id) - data.online.has(a.id)) || (a.nombre_display ?? '').localeCompare(b.nombre_display ?? '')).slice(0, 30);
  $('hint-amigos').textContent = `Elegidos ${ui.amigos.size} de ${cupo}. Los cupos que no invites ${ui.destino === 'directo' && ui.vis === 'privado' ? 'quedarán vacíos (el reto es privado)' : 'quedarán abiertos'}.`;
  $('lista-amigos').innerHTML = list.map((p) => {
    const on = ui.amigos.has(p.id); const full = !on && ui.amigos.size >= cupo;
    return `<li><button type="button" data-amigo="${escapeHTML(p.id)}" aria-pressed="${on}" ${full ? 'disabled' : ''} class="chip w-full !justify-start text-left truncate">${on ? '<i class="fa-solid fa-check mr-1"></i>' : ''}${data.online.has(p.id) ? '● ' : ''}${escapeHTML(p.nombre_display ?? 'Jugador')}</button></li>`;
  }).join('') || '<li class="text-xs text-gray-500 py-2">Sin resultados.</li>';
}

/* ---------- Pintado general ---------- */
export function refreshForm() {
  // Solo se fuerza "Necesito host" cuando el perfil YA cargó; antes no se sabe si el usuario tiene host.
  const known = !!myProfile();
  const canHost = !!myProfile()?.puede_hostear;
  if (known && !canHost && ui.host === 'yo') ui.host = 'otro';
  document.querySelector('#seg-host [data-v="yo"]').disabled = known && !canHost;
  pressed(all('#seg-host button'), (b) => b.dataset.v === ui.host);
  $('hint-host').textContent = !known ? ''
    : !canHost ? 'No tienes "Soy Host" activado en tu perfil: avisaremos a los jugadores que sí hostean (y estén activos).'
    : ui.host === 'yo' ? 'Tú creas la sala y compartes el enlace.' : 'Avisaremos a los jugadores con host; quien acepte hostea.';

  $('bloque-directo').hidden = ui.destino !== 'directo';
  pressed(all('#seg-destino button'), (b) => b.dataset.v === ui.destino);
  pressed(all('#seg-vis button'), (b) => b.dataset.v === ui.vis);
  $('hint-vis').textContent = ui.vis === 'publico' ? 'Todos verán quién retó a quién y podrán unirse a cupos libres.' : 'Solo tu rival y los invitados verán este reto.';

  // Tamaño de equipos
  $('tam-a').textContent = ui.a; $('tam-b').textContent = ui.b;
  $('tam-total').textContent = `${ui.a + ui.b}/${MAX_PLAYERS}`;
  $('tam-a-menos').disabled = ui.a <= 1; $('tam-a-mas').disabled = ui.a >= maxFor(ui.b);
  $('tam-b-menos').disabled = ui.b <= 1; $('tam-b-mas').disabled = ui.b >= maxFor(ui.a);
  pressed(all('#tam-presets [data-t]'), (b) => b.dataset.t === `${ui.a}-${ui.b}`);
  $('tam-reset').hidden = ui.a === 1 && ui.b === 1;
  $('tam-personal').setAttribute('aria-pressed', String(!all('#tam-presets [data-t]').some((b) => b.dataset.t === `${ui.a}-${ui.b}`) && !(ui.a === 1 && ui.b === 1)));
  $('hint-equipos').textContent = ui.destino === 'directo'
    ? `Tu rival lidera el equipo B (${ui.b} cupo${ui.b > 1 ? 's' : ''}).`
    : `Quien acepte lidera el equipo B (${ui.b} cupo${ui.b > 1 ? 's' : ''}).`;

  paintRivales(); paintAmigos();

  pressed(all('#presets .chip'), (b) => b.dataset.p === ui.preset);
  $('campo-fecha').hidden = ui.preset !== 'manual';
  all('.hour-btn').forEach((b) => { b.disabled = !isFuture(slotToDate(ui.dayOffset, b.dataset.h)); });
  const w = chosenWhen();
  $('hint-when').textContent = ui.preset === 'ya' ? 'Sin hora: se vence si nadie responde en 60 min.'
    : ui.preset === '15' || ui.preset === '30' ? 'Hora orientativa: no requiere confirmación.'
    : 'Requiere que los dos líderes confirmen entre 30 y 10 min antes; si alguno no confirma, se cancela solo.';
  const quien = ui.destino === 'directo' ? (ui.rival ? nm(ui.rival) : 'elige rival') : 'toda la red';
  $('resumen').textContent = w.ok ? `${ui.a} vs ${ui.b} · ${quien} · ${w.fecha_programada ? fmt(w.fecha_programada) : 'ahora'}` : (w.error ?? '—');
}

/* ---------- Eventos ---------- */
export function initForm() {
  $('grid-horas').innerHTML = SLOT_HOURS.map((h) => `<button type="button" class="hour-btn chip !px-0" data-h="${h}" aria-pressed="false">${h}</button>`).join('');
  $('manual-dia').innerHTML = Array.from({ length: 31 }, (_, i) => `<option value="${i + 1}">${i + 1}</option>`).join('');
  $('manual-mes').innerHTML = MESES.map((m, i) => `<option value="${i}">${m}</option>`).join('');
  $('manual-hora').innerHTML = Array.from({ length: 48 }, (_, i) => { const t = `${String(Math.floor(i / 2)).padStart(2, '0')}:${i % 2 ? '30' : '00'}`; return `<option value="${t}">${t} HRS</option>`; }).join('');
  const now = new Date();
  $('manual-dia').value = now.getDate(); $('manual-mes').value = now.getMonth(); $('manual-hora').value = '21:00';

  const seg = (id, key) => $(id).addEventListener('click', (e) => { const b = e.target.closest('button[data-v]'); if (!b || b.disabled) return; ui[key] = b.dataset.v; refreshForm(); });
  seg('seg-destino', 'destino'); seg('seg-vis', 'vis'); seg('seg-host', 'host');
  $('presets').addEventListener('click', (e) => { const b = e.target.closest('[data-p]'); if (b) { ui.preset = b.dataset.p; refreshForm(); } });

  const size = (side, d) => { const t = setTeamSize(ui, side, ui[side] + d); ui.a = t.a; ui.b = t.b; refreshForm(); };
  $('tam-reset').addEventListener('click', () => { ui.a = 1; ui.b = 1; refreshForm(); });
  $('tam-personal').addEventListener('click', () => { if (ui.a === ui.b || ui.a + ui.b < 2) { ui.a = 1; ui.b = 2; } refreshForm(); $('tam-b-mas').focus({ preventScroll: true }); });
  $('tam-a-menos').addEventListener('click', () => size('a', -1)); $('tam-a-mas').addEventListener('click', () => size('a', 1));
  $('tam-b-menos').addEventListener('click', () => size('b', -1)); $('tam-b-mas').addEventListener('click', () => size('b', 1));
  $('tam-presets').addEventListener('click', (e) => { const t = e.target.closest('[data-t]')?.dataset.t; if (!t) return; const [a, b] = t.split('-').map(Number); const igual = ui.a === a && ui.b === b; ui.a = igual ? 1 : a; ui.b = igual ? 1 : b; refreshForm(); });

  $('buscar-rival').addEventListener('input', paintRivales);
  $('buscar-amigo').addEventListener('input', paintAmigos);
  $('select-rival').addEventListener('change', () => { ui.rival = $('select-rival').value || null; ui.amigos.delete(ui.rival); refreshForm(); });
  $('lista-amigos').addEventListener('click', (e) => {
    const id = e.target.closest('[data-amigo]')?.dataset.amigo; if (!id) return;
    ui.amigos.has(id) ? ui.amigos.delete(id) : ui.amigos.add(id); paintAmigos();
  });

  $('grid-horas').addEventListener('click', (e) => {
    const b = e.target.closest('.hour-btn'); if (!b || b.disabled) return;
    ui.slot = b.dataset.h; pressed(all('.hour-btn'), (x) => x === b); refreshForm();
  });
  const setDay = (off) => {
    ui.dayOffset = off;
    $('btn-dia-hoy').setAttribute('aria-pressed', String(off === 0)); $('btn-dia-manana').setAttribute('aria-pressed', String(off === 1));
    if (ui.slot && !isFuture(slotToDate(off, ui.slot))) ui.slot = null;
    pressed(all('.hour-btn'), (x) => x.dataset.h === ui.slot); refreshForm();
  };
  $('btn-dia-hoy').addEventListener('click', () => setDay(0)); $('btn-dia-manana').addEventListener('click', () => setDay(1));
  [['tab-modo-rapido', 'rapido'], ['tab-modo-manual', 'manual']].forEach(([id, mode]) => $(id).addEventListener('click', () => {
    ui.mode = mode;
    $('tab-modo-rapido').setAttribute('aria-pressed', String(mode === 'rapido')); $('tab-modo-manual').setAttribute('aria-pressed', String(mode === 'manual'));
    $('panel-horario-rapido').hidden = mode !== 'rapido'; $('panel-horario-manual').hidden = mode !== 'manual'; refreshForm();
  }));
  ['manual-dia', 'manual-mes', 'manual-hora'].forEach((id) => $(id).addEventListener('change', refreshForm));
}

/** Apunta a un rival concreto (lo usa el radar). */
export function targetRival(id) { ui.destino = 'directo'; ui.rival = id; ui.amigos.delete(id); $('buscar-rival').value = ''; refreshForm(); }

/* ---------- Envío ---------- */
export async function submitReto(ev) {
  ev.preventDefault();
  if (!needLogin()) return;
  const w = chosenWhen();
  if (!w.ok) { toast(w.error ?? 'Revisa la hora.', 'error', { key: 'fecha' }); return; }
  const direct = ui.destino === 'directo';
  if (direct && !ui.rival) { toast('Elige a qué jugador retas.', 'error', { key: 'rival' }); return; }
  const row = {
    retador_id: me(), plataforma: $('select-plataforma').value, estado: 'BUSCANDO',
    requiere_host: ui.host === 'otro', destinatario_id: direct ? ui.rival : null,
    directo_publico: direct && ui.vis === 'publico', modalidad: w.modalidad, fecha_programada: w.fecha_programada,
    tam_a: ui.a, tam_b: ui.b,
  };
  // 1) Crear el reto (protegido contra doble clic). 2) Invitar fuera de ese bloque: cada invitación usa su propia protección.
  let createdId = null;
  const ok = await guard(async () => {
    const { data: created, error } = await supabase.from('retos_matchmaking').insert(row).select('id').single();
    if (error) { console.error('[duelos] insert:', error.message); throw new Error(friendly(error)); }
    createdId = created.id;
  });
  if (!ok) return;
  let fallidas = 0;
  for (const uid of ui.amigos) { if (!(await invitar(createdId, uid, 'A'))) fallidas += 1; }   // si alguna falla, el reto ya existe: se avisa sin deshacerlo
  ui.amigos.clear();
  toast(fallidas ? `Reto emitido, pero ${fallidas} invitación(es) fallaron.` : direct ? `Reto ${ui.a} vs ${ui.b} enviado a ${nm(ui.rival)}.` : '¡Reto emitido a la red!', fallidas ? 'error' : 'ok');
  window.dispatchEvent(new CustomEvent('duelos:creado'));
  await refresh();
}

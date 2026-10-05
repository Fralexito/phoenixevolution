// «Mis partidos» — página propia: agendados, historial y récord contra cada rival (duelos + liga).
// Esquema: pages → features → core. Reutiliza las tarjetas y acciones de Duelos (nada se duplica).
import { supabase } from '../core/supabase.js';
import { onSession } from '../core/session.js';
import { escapeHTML } from '../core/dom.js';
import { data, me, myProfile, isMine, partsOf, nm, loadPerfiles, loadRetos, visibleRetos } from '../features/duelos/data.js';
import { card, cardHistorial } from '../features/duelos/cards.js';
import { ordenarAgendados, ordenarPartidosJugados, rivalesDeDuelos } from '../core/misPartidos.js';
import { coincide, campana, contraRivales } from '../core/perfil.js';
import { EDICIONES } from '../../data/ligaResultados.js';
import * as act from '../features/duelos/actions.js';
import { openInviteModal } from '../features/duelos/invite.js';
import { crearPanelMarcadores } from '../features/resultados/panel.js';
import { crearPanelValoraciones } from '../features/valoraciones/panel.js';

const $ = (id) => document.getElementById(id);
const marcadores = crearPanelMarcadores($('bloque-marcadores'), { yo: me, reto: (id) => data.historial.find((r) => r.id === id) ?? data.retos.find((r) => r.id === id), nombre: nm });
const valoraciones = crearPanelValoraciones($('bloque-valoraciones'));
const vacio = (t) => `<div class="text-center py-6 text-gray-500 text-xs bg-galaxy-panel rounded-xl border border-galaxy-border">${t}</div>`;

/** Mi campaña en la edición en curso de Galaxy (por nombre visible); null si no aparezco. */
function miLiga() {
  const nombre = myProfile()?.nombre_display; if (!nombre) return null;
  const ed = (EDICIONES.galaxy ?? []).find((e) => e.estado === 'en_curso') ?? EDICIONES.galaxy?.[0]; if (!ed) return null;
  const nombres = new Set(ed.fechas.flatMap((f) => f.partidos.flatMap((m) => [m.l, m.v])));
  const propio = [...nombres].find((n) => coincide({ nombre }, n)); if (!propio) return null;
  const c = campana(ed, propio); return c ? { ed, c } : null;
}

const filaRival = (nombre, sub, derecha) => `<div class="flex items-center justify-between gap-3 rounded-xl px-4 py-2.5 bg-galaxy-panel border border-galaxy-border/80">
  <div class="min-w-0"><p class="font-display font-bold text-white uppercase text-sm truncate">${escapeHTML(nombre)}</p>${sub ? `<p class="text-[11px] text-gray-400">${sub}</p>` : ''}</div>
  <div class="shrink-0 text-right">${derecha}</div></div>`;

function renderRivales(id) {
  const duelos = id ? rivalesDeDuelos(data.historial, partsOf, id) : [];
  $('lista-rivales-duelos').innerHTML = !id ? vacio('Inicia sesión para ver tus rivales.')
    : duelos.length ? duelos.map((x) => filaRival(nm(x.id), '', `<b class="font-display text-galaxy-400 text-lg">${x.partidos}</b><span class="text-[10px] text-gray-400 block uppercase">${x.partidos === 1 ? 'partido' : 'partidos'}</span>`)).join('')
      : vacio('Aún no has terminado duelos contra nadie.');
  const liga = id ? miLiga() : null;
  $('bloque-liga').hidden = !liga;
  if (!liga) return;
  $('liga-ed').textContent = `· ${liga.ed.nombre}`;
  const filas = contraRivales(liga.c.jugados);
  $('lista-rivales-liga').innerHTML = filas.length ? filas.map((r) => filaRival(r.rival, `${r.gf} GF · ${r.gc} GC`,
    `<span class="font-display font-bold text-sm"><span class="text-ok">${r.g}G</span> <span class="text-gray-300">${r.e}E</span> <span class="text-bad">${r.p}P</span></span>`)).join('')
    : vacio('Aún no has jugado fechas de liga.');
}

function renderAll() {
  if (document.activeElement?.closest?.('#lista-agendados') && document.activeElement.matches('input, textarea, select')) return;
  const id = me();
  const mine = id ? visibleRetos().filter((r) => isMine(r, id)) : [];
  const agendados = ordenarAgendados(mine); const hist = id ? ordenarPartidosJugados(data.historial) : [];
  $('lista-agendados').innerHTML = !id ? vacio('Inicia sesión para ver tus partidos.') : agendados.length ? agendados.map((r) => card(r, id)).join('') : vacio('No tienes partidos agendados.');
  $('lista-historial').innerHTML = !id ? '' : hist.length ? hist.map((r) => cardHistorial(r, id)).join('') : vacio('Aún no has terminado ningún partido.');
  $('cnt-agendados').textContent = agendados.length ? `(${agendados.length})` : '';
  $('cnt-historial').textContent = hist.length ? `(${hist.length})` : '';
  renderRivales(id);
}

async function fetchAll() {
  try { await Promise.all([loadPerfiles(), loadRetos()]); renderAll(); marcadores.cargar(); if (me()) valoraciones.cargar(); }
  catch (e) { console.error('[mis-partidos] carga:', e); $('lista-agendados').innerHTML = '<div class="text-center py-6 text-bad text-xs">No se pudieron cargar tus partidos. Recarga la página.</div>'; }
}
act.setRefresh(fetchAll);

function onCardClick(e) {
  const b = e.target.closest('[data-act]'); if (!b) return;
  const id = Number(b.dataset.id); if (!act.needLogin()) return;
  const reto = data.retos.find((r) => r.id === id);
  ({
    accept: () => act.aceptar(id), reject: () => act.rechazar(id), cancel: () => act.cancelar(id), finish: () => act.finalizar(id),
    confirm: () => act.confirmar(id), leave: () => act.salir(id), agree: () => act.acordarCupos(id),
    'inv-yes': () => act.responder(id, true), 'inv-no': () => act.responder(id, false),
    join: () => act.unirse(id, b.dataset.team), kick: () => act.expulsar(id, b.dataset.uid),
    invite: () => reto && openInviteModal(reto, b.dataset.team),
  })[b.dataset.act]?.();
}
$('lista-agendados').addEventListener('click', onCardClick);
$('lista-agendados').addEventListener('submit', (e) => {
  const f = e.target.closest('[data-form="link"]'); if (!f) return;
  e.preventDefault(); const fd = new FormData(f);
  act.publicarEnlace(Number(f.dataset.id), String(fd.get('link') ?? '').trim(), String(fd.get('detalle') ?? '').trim());
});

onSession(() => fetchAll());
let t; const soon = () => { clearTimeout(t); t = setTimeout(fetchAll, 300); };
supabase.channel('mis-partidos')
  .on('postgres_changes', { event: '*', schema: 'public', table: 'retos_matchmaking' }, soon)
  .on('postgres_changes', { event: '*', schema: 'public', table: 'reto_participantes' }, soon)
  .subscribe();
window.addEventListener('duelos:refresh', soon);
setInterval(() => { if (!document.hidden) renderAll(); }, 20000);

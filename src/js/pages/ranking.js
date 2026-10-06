// Página /ranking/: ranking competitivo y de retos por temporada mensual + retos semanales. Esquema: pages/ranking → features/ranking/api → core/rankingComunidad (puro).
import { onSession } from '../core/session.js';
import { escapeHTML } from '../core/dom.js';
import { href } from '../core/config.js';
import { avatarHTML } from '../core/avatar.js';
import { toast } from '../core/toast.js';
import * as api from '../features/ranking/api.js';
import { rangoChip } from '../features/rango.js';
import { mesesDisponibles, mesValido, diferencia, textoFinSemana } from '../core/rankingComunidad.js';

const $ = (id) => document.getElementById(id);
// S.req = «versión» de la última carga (descarta respuestas viejas); S.busy = cobro en curso.
const S = { tab: 'competitivo', mes: mesValido(null), filas: [], retos: null, yo: null, listo: false, req: 0, busy: false };
const avisoError = (m) => { $('rk-error-txt').textContent = m; $('rk-error').hidden = !m; };
const medalla = (p) => (p === 1 ? '🥇' : p === 2 ? '🥈' : p === 3 ? '🥉' : String(p));

function fila(r, extra) {
  const yo = r.id === S.yo;
  return `<a href="${href(`perfil/?u=${encodeURIComponent(r.username)}`)}" class="glass-panel rounded-xl px-3 py-2 flex items-center gap-3 ${yo ? 'ring-1 ring-galaxy-400' : ''} hover:bg-white/5">
    <span class="w-7 text-center font-display font-extrabold text-sm ${r.pos <= 3 ? 'text-amber-300' : 'text-gray-400'}">${medalla(r.pos)}</span><span class="shrink-0">${avatarHTML(r.avatar, r.nombre, 32)}</span>
    <span class="flex-1 min-w-0"><b class="font-display uppercase text-white text-sm truncate block">${escapeHTML(r.nombre)}${yo ? ' <span class="text-galaxy-400 text-[10px]">(tú)</span>' : ''}</b><span class="text-[11px] text-gray-400">${extra}</span></span>
    ${r.elo !== undefined ? `<span class="flex flex-col items-end gap-0.5">${rangoChip(r.rango)}<b class="font-display text-galaxy-400 text-lg leading-none">${r.elo}<span class="text-[10px] text-gray-400 ml-0.5">ELO</span></b></span>` : `<b class="font-display text-galaxy-400 text-lg">${r.puntos}<span class="text-[10px] text-gray-400 ml-0.5">pts</span></b>`}</a>`;
}
function pintarLista() {
  const l = S.filas;
  $('rk-lista').innerHTML = l.length ? l.map((r) => (S.tab === 'competitivo'
      ? fila(r, `${r.jugados} PJ · ${r.victorias}G ${r.empates}E ${r.derrotas}P · ${r.gf}-${r.gc} (${diferencia(r)})`)
      : S.tab === 'elo' ? fila(r, `${r.jugados} amistoso${r.jugados === 1 ? '' : 's'} 1v1${r.delta ? ` · ${r.delta > 0 ? '▲' : '▼'}${Math.abs(r.delta)} en el último` : ''}`)
      : fila(r, `${r.retos} reto${r.retos === 1 ? '' : 's'} cobrado${r.retos === 1 ? '' : 's'}`))).join('')
    : `<div class="glass-panel rounded-2xl p-8 text-center text-gray-500 text-xs">${S.tab === 'competitivo' ? 'Nadie tiene partidos confirmados en esta temporada todavía.' : S.tab === 'elo' ? 'Aún no hay amistosos 1v1 confirmados para calcular el ELO.' : 'Nadie ha cobrado retos en esta temporada todavía.'}</div>`;
  for (const b of document.querySelectorAll('#rk-tabs [data-tab]')) b.setAttribute('aria-pressed', String(b.dataset.tab === S.tab));
}
function pintarRetos() {
  const sec = $('rk-retos'); sec.hidden = !S.yo || !S.retos;
  if (sec.hidden) return;
  $('rk-retos-fin').textContent = textoFinSemana(S.retos.semanaFin); $('rk-retos-pts').textContent = `${S.retos.puntosTemporada} pts este mes`;
  $('rk-retos-lista').innerHTML = S.retos.retos.map((r) => `<article class="rounded-xl border border-galaxy-border bg-galaxy-900/60 p-3 ${r.cobrado ? 'opacity-70' : ''}">
      <div class="flex items-center gap-2"><b class="font-display uppercase text-white text-xs flex-1 min-w-0 truncate">${escapeHTML(r.titulo)}</b><span class="text-[11px] text-amber-300">+${r.puntos}</span></div>
      <p class="text-[11px] text-gray-400 mt-0.5">${escapeHTML(r.descripcion)}</p>
      <div class="h-1.5 rounded bg-black/40 mt-2 overflow-hidden" role="progressbar" aria-valuemin="0" aria-valuemax="${r.meta}" aria-valuenow="${r.progreso}"><div class="h-full bg-galaxy-400" style="width:${r.pct}%"></div></div>
      <div class="flex items-center gap-2 mt-2"><span class="text-[11px] text-gray-300">${r.progreso}/${r.meta}</span>
        ${r.cobrado ? '<span class="ml-auto text-[11px] text-emerald-300"><i class="fa-solid fa-check"></i> Cobrado</span>' : `<button type="button" data-cobrar="${escapeHTML(r.clave)}" ${r.cobrable && !S.busy ? '' : 'disabled'} class="btn btn-primary !min-h-8 !px-3 !text-[11px] ml-auto">Cobrar</button>`}</div></article>`).join('');
}
async function cargar() {
  const mia = ++S.req;
  try {
    const [filas, retos] = await Promise.all([S.tab === 'competitivo' ? api.rankingCompetitivo(S.mes) : S.tab === 'elo' ? api.rankingElo() : api.rankingRetos(S.mes), S.yo ? api.misRetos() : Promise.resolve(null)]);
    if (mia !== S.req) return;
    S.filas = filas; S.retos = retos; avisoError(''); pintarLista(); pintarRetos();
  } catch (e) { if (mia !== S.req) return; console.error('[ranking] página:', e); S.filas = []; pintarLista(); avisoError(e?.message || 'Algo salió mal. Inténtalo de nuevo.'); }
}
$('rk-mes').innerHTML = mesesDisponibles().map((m) => `<option value="${m.valor}">${escapeHTML(m.etiqueta)}</option>`).join('');
$('rk-mes').addEventListener('change', (e) => { S.mes = mesValido(e.target.value); S.filas = []; $('rk-lista').innerHTML = '<p class="text-gray-400 text-sm py-12 text-center">Cargando…</p>'; cargar(); });
$('rk-tabs').addEventListener('click', (e) => { const b = e.target.closest('[data-tab]'); if (!b || b.dataset.tab === S.tab) return; S.tab = ['retos', 'elo'].includes(b.dataset.tab) ? b.dataset.tab : 'competitivo'; $('rk-mes-wrap').hidden = S.tab === 'elo'; $('rk-elo-info').hidden = S.tab !== 'elo'; S.filas = []; $('rk-lista').innerHTML = '<p class="text-gray-400 text-sm py-12 text-center">Cargando…</p>'; cargar(); });
$('rk-retos-lista').addEventListener('click', async (e) => {
  const b = e.target.closest('[data-cobrar]'); if (!b || S.busy) return;
  S.busy = true; pintarRetos();
  try { const p = await api.cobrarReto(b.dataset.cobrar); toast(`¡Reto cobrado! +${p} puntos.`, 'ok'); S.busy = false; await cargar(); }
  catch (err) { console.error('[ranking] cobrar:', err); toast(err?.message || 'No se pudo cobrar el reto.', 'error'); }
  finally { S.busy = false; pintarRetos(); }
});
$('rk-reintentar').addEventListener('click', cargar);
onSession(({ session }) => { const id = session?.user?.id ?? null; if (S.listo && id === S.yo) return; S.listo = true; S.yo = id; cargar(); });

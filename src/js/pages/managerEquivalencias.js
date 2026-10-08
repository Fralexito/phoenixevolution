// Staff · Equivalencias Phoenix ID ↔ ID local por parche (migración 089). Módulo aparte de manager.js: no comparte estado.
// Lee mercado_equivalencias(_clubes) (RLS: solo staff) y escribe solo por RPC (mercado_eq_confirmar / mercado_eq_sin_candidato).
import { supabase } from '../core/supabase.js';
import { onSession, can } from '../core/session.js';
import { toast } from '../core/toast.js';
import { escapeHTML as esc } from '../core/dom.js';

const $ = (id) => document.getElementById(id);
const POR_PAGINA = 40;
const ESTADOS = [['revisar', 'A revisar', 'fa-circle-question'], ['automatico', 'Automáticos', 'fa-robot'], ['confirmado', 'Confirmados', 'fa-circle-check'], ['sin_candidato', 'Sin equivalente', 'fa-ban']];
const ERR = { PES_ID_YA_CONFIRMADO: 'Ese ID local ya está confirmado para otro. Reábrelo primero.', NO_AUTORIZADO: 'Solo staff.', NO_EXISTE: 'Ya no existe. Recarga.' };
const msg = (e) => { const k = Object.keys(ERR).find((x) => String(e?.message).includes(x)); return k ? ERR[k] : (e?.message || 'Error'); };
const st = { tipo: 'jugadores', perfil: null, estado: 'revisar', q: '', desde: 0, resumen: [], iniciado: false };

const tabla = () => (st.tipo === 'clubes' ? 'mercado_equivalencias_clubes' : 'mercado_equivalencias');
const embed = () => (st.tipo === 'clubes' ? 'ref:lm_clubes!inner(nombre, pes_team_id)' : 'ref:lm_jugadores!inner(nombre, posicion, media, edad)');

async function cargarResumen() {
  const { data, error } = await supabase.rpc('mercado_eq_resumen');
  if (error) { console.warn('[equivalencias] resumen', error); $('eq-lista').innerHTML = '<p class="text-xs text-gray-500">Aún no está activa la tabla de equivalencias (falta la migración 089).</p>'; return false; }
  st.resumen = data ?? [];
  const perfiles = [...new Set(st.resumen.map((r) => r.perfil_parche))].sort();
  if (!st.perfil || !perfiles.includes(st.perfil)) st.perfil = perfiles[0] ?? null;
  $('eq-perfil').innerHTML = perfiles.length ? perfiles.map((p) => `<option ${p === st.perfil ? 'selected' : ''}>${esc(p)}</option>`).join('') : '<option value="">Sin informes</option>';
  return true;
}

function pintarConteo() {
  const n = (e) => st.resumen.find((r) => r.tipo === st.tipo && r.perfil_parche === st.perfil && r.estado === e)?.total ?? 0;
  $('eq-conteo').innerHTML = ESTADOS.map(([e, t, ic]) => `<button type="button" class="mg-chip" data-eq-estado="${e}" aria-pressed="${st.estado === e}"><i class="fa-solid ${ic}"></i> ${t} <b>${Number(n(e)).toLocaleString('es-PE')}</b></button>`).join('');
}

const chipCand = (c, id) => {
  if (c?.pes_id_local == null) return '';
  const extra = [c.nombre, c.equipo, c.posicion, c.puntaje != null ? `${c.puntaje} pts` : null, c.conflicto_con ? `choca con #${c.conflicto_con}` : null, c.sugerido ? 'sugerido' : null].filter(Boolean).map(esc).join(' · ');
  return `<button type="button" class="mg-chip" data-eq-confirmar="${id}" data-pes="${Number(c.pes_id_local)}" title="Confirmar este ID local"><b>ID ${Number(c.pes_id_local)}</b>${extra ? ` <span class="text-gray-400">${extra}</span>` : ''}</button>`;
};

function fila(r) {
  const ref = r.ref ?? {};
  const meta = st.tipo === 'clubes' ? `PES team ${ref.pes_team_id ?? '—'}` : [ref.posicion, ref.media && `media ${ref.media}`, ref.edad && `${ref.edad} años`].filter(Boolean).join(' · ');
  const cands = Array.isArray(r.candidatos) ? r.candidatos : [];
  const acciones = r.estado === 'revisar'
    ? `${cands.map((c) => chipCand(c, r.id)).join('')}
       <form class="inline-flex gap-1" data-eq-manual="${r.id}"><input name="pes" type="number" min="0" inputmode="numeric" placeholder="ID local" class="field !min-h-8 !py-1 !text-xs w-24" required><button class="mg-chip">Confirmar</button></form>
       <button type="button" class="mg-chip" data-eq-sin="${r.id}">Sin equivalente</button>`
    : `${r.pes_id_local != null ? `<span class="mg-chip">ID ${r.pes_id_local}</span>` : ''}<button type="button" class="mg-chip" data-eq-reabrir="${r.id}">Reabrir</button>`;
  return `<article class="mg-caja !p-3 space-y-2">
    <div class="flex flex-wrap items-baseline gap-2"><b>${esc(ref.nombre ?? '¿?')}</b><span class="text-xs text-gray-400">Phoenix #${r.phoenix_id}${meta ? ' · ' + esc(meta) : ''}</span>
      ${r.puntaje != null ? `<span class="text-[11px] text-gray-500">${r.puntaje} pts${r.metodo ? ' · ' + esc(r.metodo) : ''}</span>` : ''}</div>
    <div class="flex flex-wrap items-center gap-1.5">${acciones}</div></article>`;
}

async function cargarLista(append = false) {
  if (!append) st.desde = 0;
  if (!st.perfil) { $('eq-lista').innerHTML = '<p class="text-xs text-gray-500">Todavía no llegó ningún informe de Phoenix Mercado.</p>'; $('eq-mas').hidden = true; return; }
  let q = supabase.from(tabla()).select(`id, phoenix_id, pes_id_local, estado, puntaje, metodo, candidatos, ${embed()}`)
    .eq('perfil_parche', st.perfil).eq('estado', st.estado).order('puntaje', { ascending: false, nullsFirst: false }).order('id').range(st.desde, st.desde + POR_PAGINA - 1);
  if (st.q) q = q.ilike('ref.nombre', `%${st.q.replace(/[%_]/g, '')}%`);
  const { data, error } = await q;
  if (error) { console.error('[equivalencias] lista', error); toast('No se pudo cargar la lista.', 'error'); return; }
  const html = (data ?? []).map(fila).join('');
  $('eq-lista').innerHTML = append ? $('eq-lista').innerHTML + html : (html || '<p class="text-xs text-gray-500">Nada en este estado. 🎉</p>');
  st.desde += data?.length ?? 0; $('eq-mas').hidden = (data?.length ?? 0) < POR_PAGINA;
}

async function refrescar() { if (await cargarResumen()) { pintarConteo(); await cargarLista(); } }

async function accion(fn, args, ok) {
  const { error } = await supabase.rpc(fn, args);
  if (error) { toast(msg(error), 'error'); return; }
  toast(ok, 'ok'); await refrescar();
}

$('eq')?.addEventListener('click', (ev) => {
  const b = ev.target.closest('button'); if (!b) return;
  if (b.dataset.eqTipo) { st.tipo = b.dataset.eqTipo; document.querySelectorAll('[data-eq-tipo]').forEach((x) => x.setAttribute('aria-pressed', String(x === b))); pintarConteo(); cargarLista(); }
  else if (b.dataset.eqEstado) { st.estado = b.dataset.eqEstado; pintarConteo(); cargarLista(); }
  else if (b.dataset.eqConfirmar) accion('mercado_eq_confirmar', { p_tipo: st.tipo, p_id: Number(b.dataset.eqConfirmar), p_pes_id_local: Number(b.dataset.pes) }, 'Equivalencia confirmada.');
  else if (b.dataset.eqSin) accion('mercado_eq_sin_candidato', { p_tipo: st.tipo, p_id: Number(b.dataset.eqSin) }, 'Marcado sin equivalente.');
  else if (b.dataset.eqReabrir) accion('mercado_eq_sin_candidato', { p_tipo: st.tipo, p_id: Number(b.dataset.eqReabrir), p_reabrir: true }, 'Reabierto para revisión.');
  else if (b.id === 'eq-mas') cargarLista(true);
});
$('eq')?.addEventListener('submit', (ev) => {
  const f = ev.target.closest('[data-eq-manual]'); if (!f) return; ev.preventDefault();
  const pes = Number(new FormData(f).get('pes')); if (!Number.isInteger(pes) || pes < 0) return toast('ID local inválido.', 'error');
  accion('mercado_eq_confirmar', { p_tipo: st.tipo, p_id: Number(f.dataset.eqManual), p_pes_id_local: pes }, 'Equivalencia confirmada.');
});
$('eq-perfil')?.addEventListener('change', (e) => { st.perfil = e.target.value || null; pintarConteo(); cargarLista(); });
let tBuscar; $('eq-buscar')?.addEventListener('input', (e) => { clearTimeout(tBuscar); tBuscar = setTimeout(() => { st.q = e.target.value.trim(); cargarLista(); }, 250); });

onSession((s) => {
  if (st.iniciado || !s?.session?.user ||!can('resolverReportes') || !$('eq')) return;
  st.iniciado = true; refrescar();
});

// Página «Phoenix Soda» (/mis-salas/): cuenta Parsec (todos), mis salas abiertas y mis PCs (solo hosts aprobados o staff).
import { onSession } from '../core/session.js';
import { toast } from '../core/toast.js';
import { confirmar } from '../core/dialogo.js';
import { escapeHTML } from '../core/dom.js';
import { supabase } from '../core/supabase.js';
import { SALUD_TXT, saludSala } from '../core/salas.js';
import * as api from '../features/salas/api.js';
import { montarVincularPC } from '../features/salas/vincularPC.js';

const $ = (id) => document.getElementById(id);
const btn = (attrs, html, extra = '') => `<button type="button" class="btn !min-h-9 !text-xs ${extra}" ${attrs}>${html}</button>`;
let yo = null; let esHost = false;

// ── Parsec ───────────────────────────────────────────────────────────────────────────────────────────────────────────
async function pintarParsec() {
  try {
    const p = await api.miParsec();
    $('ms-parsec').innerHTML = p
      ? `<p>ID <b class="text-white">${escapeHTML(p.parsec_id)}</b>${p.nombre_parsec ? ` · ${escapeHTML(p.nombre_parsec)}` : ''}
           <span class="ml-2 text-[11px] font-bold ${p.estado === 'verificada' ? 'text-emerald-300' : 'text-amber-300'}">${p.estado === 'verificada' ? '✔ Verificada' : 'Declarada (se verifica al entrar a una sala de reto)'}</span></p>
         <div class="mt-2">${btn('data-acc="parsec-quitar"', '<i class="fa-solid fa-link-slash"></i> Desvincular')}</div>`
      : `<p class="text-xs text-gray-400">Así el host te reconoce y te reserva tu mando. Tu ID está en Parsec → Ajustes → Cuenta.</p>
         <form id="f-parsec" class="flex flex-wrap gap-2 mt-2">
           <input name="pid" inputmode="numeric" required placeholder="ID de Parsec (solo números)" class="field flex-1 min-w-40" maxlength="20">
           <input name="nom" placeholder="Nombre en Parsec (opcional)" class="field flex-1 min-w-40" maxlength="40">
           <button class="btn btn-primary !min-h-10"><i class="fa-solid fa-link"></i> Vincular</button>
         </form>`;
  } catch (e) { $('ms-parsec').textContent = e.message; }
}

// ── Mis salas ────────────────────────────────────────────────────────────────────────────────────────────────────────
async function pintarSalas() {
  try {
    const { data, error } = await supabase.from('salas').select('id, estado, visibilidad, juego, parche, region, latido, rival, limite_espectadores, acepta_espectadores, abierta_en')
      .eq('host', yo).in('estado', ['preparando', 'abierta', 'en_partida']).order('abierta_en', { ascending: false });
    if (error) throw error;
    if (!data.length) { $('ms-salas').innerHTML = '<p class="text-xs text-gray-400">No tienes salas abiertas. Ábrela desde Phoenix Soda en tu PC.</p>'; return; }
    const ids = data.map((s) => s.id);
    const { data: esp } = await supabase.from('salas_espectadores').select('sala_id, usuario').in('sala_id', ids);
    const gente = [...new Set([...data.map((s) => s.rival).filter(Boolean), ...(esp ?? []).map((e) => e.usuario)])];
    const { data: perf } = gente.length ? await supabase.from('perfiles').select('id, nombre_display, username').in('id', gente) : { data: [] };
    const nom = (id) => { const p = (perf ?? []).find((x) => x.id === id); return p?.nombre_display || p?.username || 'Jugador'; };
    $('ms-salas').innerHTML = data.map((s) => {
      const mira = (esp ?? []).filter((e) => e.sala_id === s.id);
      return `<article class="rounded-lg border border-galaxy-border p-3">
        <p class="text-white font-bold">${escapeHTML([s.juego, s.parche && `(${s.parche})`].filter(Boolean).join(' ') || 'Sala')}
          <span class="text-[11px] text-galaxy-400 ml-1">${escapeHTML(SALUD_TXT[saludSala(s)] ?? s.estado)} · ${escapeHTML(s.visibilidad)}</span></p>
        <p class="text-xs mt-1">Rival: <b class="text-white">${s.rival ? escapeHTML(nom(s.rival)) : 'esperando (sale en el radar si es pública o de amigos)'}</b></p>
        <p class="text-xs">Espectadores: ${s.acepta_espectadores ? `${mira.length}/${s.limite_espectadores}${mira.length ? ' · ' + mira.map((e) => escapeHTML(nom(e.usuario))).join(', ') : ''}` : 'no admite'}</p>
      </article>`;
    }).join('');
  } catch (e) { $('ms-salas').textContent = 'No se pudieron cargar tus salas.'; console.warn('[mis-salas]', e); }
}

// ── PCs (host): bloque compartido con Mi perfil ──
const pintarHost = () => montarVincularPC($('ms-host'), { esHost });

// ── Acciones ─────────────────────────────────────────────────────────────────────────────────────────────────────────
async function accion(acc, el) {
  if (acc === 'parsec-quitar') { if (!(await confirmar('¿Desvincular tu cuenta de Parsec?', { peligro: true }))) return; await api.desvincularParsec(); toast('Parsec desvinculado.', 'ok'); return pintarParsec(); }
}

document.addEventListener('click', async (ev) => {
  const el = ev.target.closest('#ms-contenido [data-acc]'); if (!el || el.disabled) return;
  el.disabled = true;
  try { await accion(el.dataset.acc, el); } catch (e) { toast(e.message, 'error'); } finally { el.disabled = false; }
});
document.addEventListener('submit', async (ev) => {
  if (ev.target.id !== 'f-parsec') return; ev.preventDefault();
  const f = new FormData(ev.target);
  try { await api.vincularParsec(f.get('pid'), String(f.get('nom') || '').trim() || null); toast('Parsec vinculado.', 'ok'); pintarParsec(); }
  catch (e) { toast(e.message, 'error'); }
});

onSession((st) => {
  yo = st?.session?.user?.id ?? null;
  $('ms-sin-sesion').hidden = !!yo; $('ms-contenido').hidden = !yo;
  if (!yo) return;
  esHost = !!st.profile?.host_aprobado || ['ayudante', 'moderador', 'admin'].includes(st.profile?.rol);
  pintarParsec(); pintarSalas(); pintarHost();
});
setInterval(() => { if (yo && !document.hidden) pintarSalas(); }, 30_000);

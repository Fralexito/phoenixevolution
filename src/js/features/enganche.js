// Bloques de enganche reutilizables: racha diaria, historia del perfil y ranking semanal (migración 070).
// Si la migración falta o algo falla, el bloque se oculta sin romper la página.
import { supabase } from '../core/supabase.js';
import { escapeHTML, safeUrl } from '../core/dom.js';
import { href } from '../core/config.js';
import { textoRacha, CLASE_FORMA, formaValida, faltaReinicio, textoFalta } from '../core/enganche.js';

const rpc = async (n, a) => { const { data, error } = await supabase.rpc(n, a); if (error) throw error; return data; };
const ocultar = (el, e, n) => { console.warn(`[enganche] ${n}:`, e?.message); el.hidden = true; };

export async function montarRacha(el) {
  if (!el) return;
  try {
    const t = textoRacha(await rpc('mi_racha'));
    el.className = `glass-panel rounded-2xl px-4 py-3 flex items-center gap-3 ${t.hecho ? 'border border-emerald-400/30' : 'border border-amber-400/30'}`;
    el.innerHTML = `<span class="text-2xl" aria-hidden="true">${t.hecho ? '🏆' : '🎯'}</span>
      <div class="min-w-0 flex-1"><p class="font-display font-bold text-white uppercase tracking-wider text-sm">${escapeHTML(t.titulo)}</p>
      <p class="text-xs ${t.hecho ? 'text-emerald-300' : 'text-amber-200'}">${escapeHTML(t.meta)}</p></div>`;
    el.hidden = false;
  } catch (e) { ocultar(el, e, 'racha'); }
}

export async function montarHistoria(el, usuarioId) {
  if (!el || !usuarioId) return;
  try {
    const h = await rpc('perfil_historia', { p_usuario: usuarioId });
    if (!h || !h.jugados) { el.hidden = true; return; }
    const forma = formaValida(h.forma);
    el.className = 'glass-panel rounded-2xl p-4 space-y-3';
    el.innerHTML = `<h2 class="font-display font-bold text-white uppercase text-sm tracking-wider"><i class="fa-solid fa-chart-line text-galaxy-400 mr-2"></i>Historia</h2>
      <div class="flex flex-wrap items-center gap-3 text-xs text-gray-300">
        <span><b class="text-white text-base">${h.jugados}</b> jugados</span><span class="text-emerald-300"><b>${h.ganados}</b> G</span>
        <span class="text-gray-300"><b>${h.empatados}</b> E</span><span class="text-rose-300"><b>${h.perdidos}</b> P</span></div>
      ${forma.length ? `<div><p class="text-[11px] text-gray-400 mb-1">Forma reciente (más nuevo a la izquierda)</p><div class="flex gap-1">${forma.map((f) => `<span class="w-6 h-6 rounded grid place-items-center text-[11px] font-bold ${CLASE_FORMA[f]}">${f}</span>`).join('')}</div></div>` : ''}
      <div class="grid sm:grid-cols-2 gap-2 text-xs">
        ${h.rival_frecuente ? `<div class="rounded-lg border border-galaxy-border p-2"><p class="text-gray-400">Rival más frecuente</p><p class="text-white font-bold">${escapeHTML(h.rival_frecuente.nombre)}</p><p class="text-gray-400">${h.rival_frecuente.partidos} partidos · ${h.rival_frecuente.ganados}G ${h.rival_frecuente.perdidos}P</p></div>` : ''}
        ${h.mejor_victoria ? `<div class="rounded-lg border border-galaxy-border p-2"><p class="text-gray-400">Mejor victoria</p><p class="text-white font-bold">${h.mejor_victoria.gf}–${h.mejor_victoria.gc} vs ${escapeHTML(h.mejor_victoria.rival)}</p></div>` : ''}
      </div>`;
    el.hidden = false;
  } catch (e) { ocultar(el, e, 'historia'); }
}

export async function montarRankingSemanal(el, { limite = 10 } = {}) {
  if (!el) return;
  try {
    const r = await rpc('ranking_semanal', { p_limite: limite });
    const filas = Array.isArray(r?.tabla) ? r.tabla : [];
    el.className = 'glass-panel rounded-2xl p-4 space-y-2';
    el.innerHTML = `<div class="flex items-center gap-2"><h2 class="font-display font-bold text-white uppercase text-sm tracking-wider flex-1"><i class="fa-solid fa-ranking-star text-galaxy-400 mr-2"></i>Ranking de la semana</h2>
        <span class="text-[11px] text-amber-200"><i class="fa-regular fa-clock"></i> se reinicia en ${textoFalta(faltaReinicio(r?.hasta))}</span></div>
      ${filas.length ? `<ol class="space-y-1">${filas.map((f, i) => `<li class="flex items-center gap-2 text-sm"><span class="w-6 text-center font-display font-bold ${i < 3 ? 'text-amber-300' : 'text-gray-500'}">${i + 1}</span>
          ${safeUrl(f.avatar_url) ? `<img src="${escapeHTML(f.avatar_url)}" alt="" class="w-6 h-6 rounded-full object-cover" loading="lazy">` : '<span class="w-6 h-6 rounded-full bg-galaxy-800"></span>'}
          <span class="flex-1 min-w-0 truncate text-white">${escapeHTML(f.nombre)}</span><span class="text-[11px] text-gray-400">${f.pj} PJ</span><b class="text-galaxy-300 w-10 text-right">${f.pts} pts</b></li>`).join('')}</ol>`
        : `<p class="text-xs text-gray-400">Nadie ha sumado esta semana todavía. <a class="text-galaxy-400 underline" href="${href('duelos/')}">Lanza un reto</a> y encabeza la tabla.</p>`}`;
    el.hidden = false;
  } catch (e) { ocultar(el, e, 'ranking'); }
}

/** Creadores verificados en vivo ahora (se oculta si no hay ninguno). */
export async function montarCreadoresVivo(el) {
  if (!el) return;
  try {
    const vivos = ((await rpc('creadores_lista')) ?? []).filter((c) => c.en_vivo).slice(0, 4);
    if (!vivos.length) { el.hidden = true; return; }
    el.className = 'glass-panel rounded-xl p-4 space-y-2 border border-rose-400/30';
    el.innerHTML = `<h3 class="font-display font-bold uppercase tracking-wider text-white text-sm flex items-center gap-2"><i class="fa-solid fa-circle text-[8px] text-rose-400 animate-pulse"></i>Creadores en vivo</h3>
      ${vivos.map((c) => { const url = safeUrl(c.enlace_live) || Object.values(c.plataformas ?? {}).map((u) => safeUrl(u)).find(Boolean) || href('creadores/');
        return `<a href="${escapeHTML(url)}" target="_blank" rel="noopener" class="flex items-center gap-2 text-sm hover:bg-white/5 rounded-lg p-1">
          ${safeUrl(c.avatar_url) ? `<img src="${escapeHTML(c.avatar_url)}" alt="" class="w-8 h-8 rounded-full object-cover ring-2 ring-rose-400" loading="lazy">` : '<span class="w-8 h-8 rounded-full bg-galaxy-800"></span>'}
          <span class="min-w-0"><b class="text-white block truncate">${escapeHTML(c.nombre)}</b><span class="text-[11px] text-gray-400 truncate block">${escapeHTML(c.titulo_live ?? 'En vivo')}</span></span></a>`; }).join('')}
      <a href="${href('creadores/')}" class="text-[11px] text-galaxy-400 underline">Ver todos los creadores</a>`;
    el.hidden = false;
  } catch (e) { ocultar(el, e, 'creadores'); }
}

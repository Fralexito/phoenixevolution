// Página /comunidad/: publicaciones recientes de TODOS los muros (los que quien mira puede ver), con filtro opcional por juego.
// Esquema: este archivo (pinta y reparte eventos) → features/muro/api.comunidad (RPC muro_comunidad, migración 027) → core/muro (lógica pura).
import { escapeHTML } from '../core/dom.js';
import { href } from '../core/config.js';
import { avatarHTML } from '../core/avatar.js';
import { toast } from '../core/toast.js';
import { onSession, can } from '../core/session.js';
import { abrirReportar, abrirOcultar } from '../features/moderacion/acciones.js';
import { tiempoRelativo, resumenReacciones, segmentoParaGuardar } from '../core/muro.js';
import { SEGMENTOS } from '../../data/muroEstilo.js';
import * as api from '../features/muro/api.js';
import { contenidoHTML, reproductorYT, segmentoChipHTML } from '../features/muro/render.js';

const feedEl = document.getElementById('com-feed'); const filtroEl = document.getElementById('com-filtro');
const S = { yo: null, juego: segmentoParaGuardar(new URLSearchParams(location.search).get('j')) ?? '', items: [], hayMas: false, cargando: false };

function pintarFiltro() {
  filtroEl.innerHTML = `<i class="fa-solid fa-tag text-gray-600"></i>${[['', 'Todo'], ...SEGMENTOS].map(([id, n]) =>
    `<button type="button" data-j="${id}" aria-pressed="${S.juego === id}" class="rounded-full border border-galaxy-border/70 px-2.5 py-1 text-gray-400 aria-pressed:text-white aria-pressed:border-galaxy-400 aria-pressed:bg-galaxy-600/20">${escapeHTML(n)}</button>`).join('')}`;
}
/** Reportar (cualquiera con sesión, salvo lo propio) y ocultar (solo moderación). La base de datos vuelve a comprobar rol y rango. */
const moderarBtns = (it) => (!S.yo || it.autor?.id === S.yo ? '' : `<button type="button" data-reportar="${Number(it.id)}" title="Reportar" aria-label="Reportar publicación" class="w-8 h-8 rounded-lg text-gray-400 hover:text-amber-300 shrink-0"><i class="fa-regular fa-flag"></i></button>${can('resolverReportes') ? `<button type="button" data-ocultar="${Number(it.id)}" title="Ocultar (moderación)" aria-label="Ocultar publicación (moderación)" class="w-8 h-8 rounded-lg text-gray-400 hover:text-orange-300 shrink-0"><i class="fa-solid fa-eye-slash"></i></button>` : ''}`);
function tarjeta(it) {
  const a = it.autor ?? {}; const urlMuro = `${href('perfil/')}?u=${encodeURIComponent(a.username ?? '')}#p-${Number(it.id)}`;
  const rx = resumenReacciones(it.reacciones).map((x) => `<span class="rx"><span>${escapeHTML(x.tipo)}</span><b>${x.n}</b></span>`).join('');
  const n = Number(it.respuestas) || 0;
  return `<article class="glass-panel rounded-2xl p-3 sm:p-4">
    <header class="flex items-center gap-2.5 mb-2">
      <a href="${escapeHTML(`${href('perfil/')}?u=${encodeURIComponent(a.username ?? '')}`)}" class="w-9 h-9 rounded-full overflow-hidden flex items-center justify-center bg-galaxy-card border border-galaxy-border shrink-0">${avatarHTML(a.avatar_url, a.nombre_display, 36)}</a>
      <div class="min-w-0 flex-1"><a href="${escapeHTML(`${href('perfil/')}?u=${encodeURIComponent(a.username ?? '')}`)}" class="font-display font-bold text-white text-sm truncate block hover:text-galaxy-400">${escapeHTML(a.nombre_display ?? 'Jugador')}</a>
        <p class="text-[11px] text-gray-500">${tiempoRelativo(it.created_at)} ${segmentoChipHTML(it.juego)}</p></div>${moderarBtns(it)}</header>
    ${contenidoHTML(it)}
    <footer class="mt-3 pt-2 border-t border-galaxy-border/60 flex flex-wrap items-center gap-1.5">${rx}
      <a href="${escapeHTML(urlMuro)}" class="ml-auto text-[11px] text-gray-400 hover:text-galaxy-400"><i class="fa-regular fa-comment mr-1"></i>${n ? `${n} respuesta${n === 1 ? '' : 's'} · ` : ''}Ver en su muro</a></footer></article>`;
}
function pintar() {
  feedEl.innerHTML = S.items.length
    ? S.items.map(tarjeta).join('') + (S.hayMas ? '<button type="button" data-mas class="btn btn-ghost w-full !text-xs">Cargar más</button>' : '')
    : `<div class="glass-panel rounded-2xl p-8 text-center text-gray-500 text-xs">${S.juego ? 'Todavía no hay publicaciones de ese juego.' : 'Todavía no hay publicaciones.'}</div>`;
}
async function cargar({ mas = false } = {}) {
  if (S.cargando) return; S.cargando = true;
  try {
    const m = await api.comunidad(S.juego || null, mas ? S.items[S.items.length - 1]?.id : null);
    S.items = mas ? [...S.items, ...(m.items ?? [])] : (m.items ?? []); S.hayMas = !!m.hay_mas; pintar();
  } catch (e) {
    console.error('[comunidad] carga:', e);
    if (mas) toast('No se pudo cargar más. Intenta de nuevo.', 'error'); else feedEl.innerHTML = '<div class="glass-panel rounded-2xl p-8 text-center text-bad text-sm">No se pudo cargar la comunidad. Intenta de nuevo en un momento.</div>';
  } finally { S.cargando = false; }
}
filtroEl.addEventListener('click', (e) => {
  const b = e.target.closest('[data-j]'); if (!b) return;
  S.juego = b.dataset.j; pintarFiltro(); history.replaceState(null, '', S.juego ? `?j=${S.juego}` : location.pathname); feedEl.innerHTML = '<p class="text-gray-400 text-sm py-12 text-center">Cargando…</p>'; cargar();
});
feedEl.addEventListener('click', (e) => {
  const yt = e.target.closest('[data-act=video-yt]'); if (yt) { reproductorYT(yt); return; }
  if (e.target.closest('[data-mas]')) { cargar({ mas: true }); return; }
  const rp = e.target.closest('[data-reportar]'); if (rp) { abrirReportar({ tipo: 'publicacion', objetivo: rp.dataset.reportar, titulo: 'Publicación en la comunidad' }); return; }
  const oc = e.target.closest('[data-ocultar]');
  if (oc) { const id = Number(oc.dataset.ocultar); abrirOcultar({ tipo: 'publicacion', id, titulo: 'Publicación en la comunidad', onListo: () => { S.items = S.items.filter((x) => Number(x.id) !== id); pintar(); } }); }
});
pintarFiltro(); cargar();
onSession(({ session }) => { const id = session?.user?.id ?? null; if (id !== S.yo) { S.yo = id; if (S.items.length) pintar(); } });   // al conocer la sesión se pintan los botones de reportar

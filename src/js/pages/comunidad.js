// Página /comunidad/: publicaciones recientes de TODOS los muros (los que quien mira puede ver), con filtro opcional por juego.
// Esquema: este archivo (pinta y reparte eventos) → features/muro/api.comunidad (RPC muro_comunidad, migración 027) → core/muro (lógica pura).
import { escapeHTML } from '../core/dom.js';
import { toast } from '../core/toast.js';
import { onSession, can } from '../core/session.js';
import { abrirReportar, abrirOcultar } from '../features/moderacion/acciones.js';
import { segmentoParaGuardar } from '../core/muro.js';
import { VISTAS, vistaInfo, vistaValida, paginaSiguiente, textoVacio } from '../core/feed.js';
import { SEGMENTOS } from '../../data/muroEstilo.js';
import * as api from '../features/muro/api.js';
import { reproductorYT } from '../features/muro/render.js';
import { tarjetaComunidadHTML } from '../features/muro/tarjeta.js';
import { alternar, cargarEstado } from '../features/social/guardados.js';
import { cargarEncuestas } from '../features/encuestas/estado.js';

const feedEl = document.getElementById('com-feed'); const filtroEl = document.getElementById('com-filtro'); const vistasEl = document.getElementById('com-vistas');
const q = new URLSearchParams(location.search);
const S = { yo: null, vista: vistaValida(q.get('v')), juego: segmentoParaGuardar(q.get('j')) ?? '', items: [], hayMas: false, cargando: false, req: 0 };
const urlActual = () => { const p = new URLSearchParams(); if (S.vista !== 'recientes') p.set('v', S.vista); if (S.vista === 'recientes' && S.juego) p.set('j', S.juego); const t = p.toString(); return t ? `?${t}` : location.pathname; };
function pintarVistas() {
  vistasEl.innerHTML = VISTAS.map((v) => `<button type="button" data-v="${v.id}" aria-pressed="${S.vista === v.id}" class="adv-chip !min-h-9 ${S.vista === v.id ? '!border-galaxy-400 !text-galaxy-400' : ''}"><i class="fa-solid ${v.icono} mr-1.5"></i>${escapeHTML(v.texto)}</button>`).join('');
  filtroEl.hidden = !vistaInfo(S.vista).filtraJuego;
}

function pintarFiltro() {
  filtroEl.innerHTML = `<i class="fa-solid fa-tag text-gray-600"></i>${[['', 'Todo'], ...SEGMENTOS].map(([id, n]) =>
    `<button type="button" data-j="${id}" aria-pressed="${S.juego === id}" class="rounded-full border border-galaxy-border/70 px-2.5 py-1 text-gray-400 aria-pressed:text-white aria-pressed:border-galaxy-400 aria-pressed:bg-galaxy-600/20">${escapeHTML(n)}</button>`).join('')}`;
}
const tarjeta = (it) => tarjetaComunidadHTML(it, { yo: S.yo, puedeOcultar: can('resolverReportes') });
function pintar() {
  feedEl.innerHTML = S.items.length
    ? S.items.map(tarjeta).join('') + (S.hayMas ? '<button type="button" data-mas class="btn btn-ghost w-full !text-xs">Cargar más</button>' : '')
    : `<div class="glass-panel rounded-2xl p-8 text-center text-gray-500 text-xs">${escapeHTML(textoVacio(S.vista, { juego: S.juego, conSesion: !!S.yo }))}</div>`;
}
/** Pide una página de la vista actual. Si la persona cambia de vista mientras carga, la respuesta vieja se descarta (S.req). */
async function pedir(mas) {
  const pag = mas ? paginaSiguiente(S.vista, S.items) : { antes: null, desplazamiento: 0 };
  if (S.vista === 'siguiendo') return api.siguiendo(pag.antes ?? null);
  if (S.vista === 'destacado') return api.destacado(pag.desplazamiento ?? 0);
  return api.comunidad(S.juego || null, pag.antes ?? null);
}
async function cargar({ mas = false } = {}) {
  if (S.cargando) return;
  if (vistaInfo(S.vista).requiereSesion && !S.yo) { S.items = []; S.hayMas = false; pintar(); return; }
  S.cargando = true; const req = ++S.req;
  try {
    const m = await pedir(mas); if (req !== S.req) return;
    S.items = mas ? [...S.items, ...(m.items ?? [])] : (m.items ?? []); S.hayMas = !!m.hay_mas;
    await cargarEncuestas(S.items.map((x) => x.id));
    if (S.yo) await cargarEstado('publicacion', S.items.map((x) => x.id));   // marcadores (si falla, la lista se pinta igual)
    if (req === S.req) pintar();
  } catch (e) {
    console.error('[comunidad] carga:', e);
    if (mas) toast('No se pudo cargar más. Intenta de nuevo.', 'error'); else feedEl.innerHTML = '<div class="glass-panel rounded-2xl p-8 text-center text-bad text-sm">No se pudo cargar la comunidad. Intenta de nuevo en un momento.</div>';
  } finally { S.cargando = false; }
}
filtroEl.addEventListener('click', (e) => {
  const b = e.target.closest('[data-j]'); if (!b) return;
  S.juego = b.dataset.j; pintarFiltro(); history.replaceState(null, '', urlActual()); feedEl.innerHTML = '<p class="text-gray-400 text-sm py-12 text-center">Cargando…</p>'; cargar();
});
vistasEl.addEventListener('click', (e) => {
  const b = e.target.closest('[data-v]'); if (!b || b.dataset.v === S.vista) return;
  S.vista = vistaValida(b.dataset.v); S.items = []; S.hayMas = false; S.cargando = false; pintarVistas(); history.replaceState(null, '', urlActual());
  feedEl.innerHTML = '<p class="text-gray-400 text-sm py-12 text-center">Cargando…</p>'; cargar();
});
feedEl.addEventListener('click', (e) => {
  const yt = e.target.closest('[data-act=video-yt]'); if (yt) { reproductorYT(yt); return; }
  if (e.target.closest('[data-mas]')) { cargar({ mas: true }); return; }
  const gu = e.target.closest('[data-guardar]'); if (gu) { alternar(gu); return; }
  const rp = e.target.closest('[data-reportar]'); if (rp) { abrirReportar({ tipo: 'publicacion', objetivo: rp.dataset.reportar, titulo: 'Publicación en la comunidad' }); return; }
  const oc = e.target.closest('[data-ocultar]');
  if (oc) { const id = Number(oc.dataset.ocultar); abrirOcultar({ tipo: 'publicacion', id, titulo: 'Publicación en la comunidad', onListo: () => { S.items = S.items.filter((x) => Number(x.id) !== id); pintar(); } }); }
});
pintarVistas(); pintarFiltro(); cargar();
onSession(async ({ session }) => { const id = session?.user?.id ?? null; if (id !== S.yo) { S.yo = id; if (vistaInfo(S.vista).requiereSesion) { cargar(); return; } if (S.items.length) { if (id) await cargarEstado('publicacion', S.items.map((x) => x.id)); pintar(); } } });   // al conocer la sesión se pintan los botones de reportar

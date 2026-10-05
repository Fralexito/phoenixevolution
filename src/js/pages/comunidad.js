// Página /comunidad/: publicaciones recientes de TODOS los muros (los que quien mira puede ver), con filtro opcional por juego.
// Esquema: este archivo (pinta y reparte eventos) → features/muro/api.comunidad (RPC muro_comunidad, migración 027) → core/muro (lógica pura).
import { escapeHTML } from '../core/dom.js';
import { toast } from '../core/toast.js';
import { onSession, can } from '../core/session.js';
import { abrirReportar, abrirOcultar } from '../features/moderacion/acciones.js';
import { segmentoParaGuardar } from '../core/muro.js';
import { SEGMENTOS } from '../../data/muroEstilo.js';
import * as api from '../features/muro/api.js';
import { reproductorYT } from '../features/muro/render.js';
import { tarjetaComunidadHTML } from '../features/muro/tarjeta.js';
import { alternar, cargarEstado } from '../features/social/guardados.js';
import { cargarEncuestas } from '../features/encuestas/estado.js';

const feedEl = document.getElementById('com-feed'); const filtroEl = document.getElementById('com-filtro');
const S = { yo: null, juego: segmentoParaGuardar(new URLSearchParams(location.search).get('j')) ?? '', items: [], hayMas: false, cargando: false };

function pintarFiltro() {
  filtroEl.innerHTML = `<i class="fa-solid fa-tag text-gray-600"></i>${[['', 'Todo'], ...SEGMENTOS].map(([id, n]) =>
    `<button type="button" data-j="${id}" aria-pressed="${S.juego === id}" class="rounded-full border border-galaxy-border/70 px-2.5 py-1 text-gray-400 aria-pressed:text-white aria-pressed:border-galaxy-400 aria-pressed:bg-galaxy-600/20">${escapeHTML(n)}</button>`).join('')}`;
}
const tarjeta = (it) => tarjetaComunidadHTML(it, { yo: S.yo, puedeOcultar: can('resolverReportes') });
function pintar() {
  feedEl.innerHTML = S.items.length
    ? S.items.map(tarjeta).join('') + (S.hayMas ? '<button type="button" data-mas class="btn btn-ghost w-full !text-xs">Cargar más</button>' : '')
    : `<div class="glass-panel rounded-2xl p-8 text-center text-gray-500 text-xs">${S.juego ? 'Todavía no hay publicaciones de ese juego.' : 'Todavía no hay publicaciones.'}</div>`;
}
async function cargar({ mas = false } = {}) {
  if (S.cargando) return; S.cargando = true;
  try {
    const m = await api.comunidad(S.juego || null, mas ? S.items[S.items.length - 1]?.id : null);
    S.items = mas ? [...S.items, ...(m.items ?? [])] : (m.items ?? []); S.hayMas = !!m.hay_mas;
    await cargarEncuestas(S.items.map((x) => x.id));
    if (S.yo) await cargarEstado('publicacion', S.items.map((x) => x.id));   // marcadores (si falla, la lista se pinta igual)
    pintar();
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
  const gu = e.target.closest('[data-guardar]'); if (gu) { alternar(gu); return; }
  const rp = e.target.closest('[data-reportar]'); if (rp) { abrirReportar({ tipo: 'publicacion', objetivo: rp.dataset.reportar, titulo: 'Publicación en la comunidad' }); return; }
  const oc = e.target.closest('[data-ocultar]');
  if (oc) { const id = Number(oc.dataset.ocultar); abrirOcultar({ tipo: 'publicacion', id, titulo: 'Publicación en la comunidad', onListo: () => { S.items = S.items.filter((x) => Number(x.id) !== id); pintar(); } }); }
});
pintarFiltro(); cargar();
onSession(async ({ session }) => { const id = session?.user?.id ?? null; if (id !== S.yo) { S.yo = id; if (S.items.length) { if (id) await cargarEstado('publicacion', S.items.map((x) => x.id)); pintar(); } } });   // al conocer la sesión se pintan los botones de reportar

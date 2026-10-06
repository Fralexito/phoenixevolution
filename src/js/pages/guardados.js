// Página /guardados/: mis marcadores (publicaciones y clips), del más reciente al más antiguo.
// Esquema: pages/guardados → features/social/{api, guardados} + features/muro/tarjeta → core/social (lógica pura).
import { onSession, can } from '../core/session.js';
import { escapeHTML } from '../core/dom.js';
import { href } from '../core/config.js';
import { avatarHTML } from '../core/avatar.js';
import { tiempoRelativo } from '../core/muro.js';
import * as api from '../features/social/api.js';
import { botonGuardarHTML, alternar, cargarEstado } from '../features/social/guardados.js';
import { cargarEncuestas } from '../features/encuestas/estado.js';
import { tarjetaComunidadHTML } from '../features/muro/tarjeta.js';
import { segmentoChipHTML, reproductorYT } from '../features/muro/render.js';
import { abrirReportar, abrirOcultar } from '../features/moderacion/acciones.js';

const $ = (id) => document.getElementById(id);
const S = { yo: null, items: [], siguiente: null, hayMas: false, cargando: false, iniciado: false };

function mostrarError(err) { console.error('[guardados] página:', err); $('gu-error-txt').textContent = err?.message || 'Algo salió mal. Inténtalo de nuevo.'; $('gu-error').hidden = false; }

function tarjetaClip(c) {
  const a = c.autor ?? {}; const perfil = `${href('perfil/')}?u=${encodeURIComponent(a.username ?? '')}`;
  return `<article class="glass-panel rounded-2xl p-3 sm:p-4" data-clip-card="${Number(c.id)}">
    <header class="flex items-center gap-2.5 mb-2">
      <a href="${escapeHTML(perfil)}" class="w-9 h-9 rounded-full overflow-hidden flex items-center justify-center bg-galaxy-card border border-galaxy-border shrink-0">${avatarHTML(a.avatar_url, a.nombre_display, 36)}</a>
      <div class="min-w-0 flex-1"><a href="${escapeHTML(perfil)}" class="font-display font-bold text-white text-sm truncate block hover:text-galaxy-400">${escapeHTML(a.nombre_display ?? 'Jugador')}</a>
        <p class="text-[12px] text-gray-500">Clip · ${tiempoRelativo(c.created_at)} ${segmentoChipHTML(c.juego)}</p></div>${botonGuardarHTML('clip', c.id)}</header>
    <p class="text-sm text-gray-100"><i class="fa-solid fa-film text-galaxy-400 mr-1.5"></i>${escapeHTML(c.titulo || 'Clip sin título')}</p>
    <a href="${escapeHTML(`${perfil}#c-${Number(c.id)}`)}" class="btn btn-ghost !min-h-8 !text-xs mt-2"><i class="fa-solid fa-play"></i><span>Ver clip</span></a></article>`;
}
const pintarItem = (g) => (g.tipo === 'clip' ? tarjetaClip(g.item) : tarjetaComunidadHTML(g.item, { yo: S.yo, puedeOcultar: can('resolverReportes') }));
function pintar() {
  $('gu-lista').innerHTML = S.items.length ? S.items.map(pintarItem).join('')
    : '<div class="glass-panel rounded-2xl p-8 text-center text-gray-500 text-xs"><i class="fa-regular fa-bookmark text-2xl text-galaxy-400/60 block mb-2"></i>Todavía no guardaste nada. Toca el marcador en una publicación o en un clip para guardarlo aquí.</div>';
  $('gu-mas').hidden = !S.hayMas;
}

async function cargar({ mas = false } = {}) {
  if (S.cargando) return; S.cargando = true; $('gu-mas').disabled = true;
  try {
    const r = await api.listarGuardados({ antes: mas ? S.siguiente : null, limite: 20 });
    S.items = mas ? [...S.items, ...r.items] : r.items; S.siguiente = r.siguiente; S.hayMas = r.hayMas && !!r.siguiente;
    // Todo lo listado está guardado: se marca (la tarjeta compartida pinta el marcador según este estado).
    await cargarEncuestas(S.items.filter((g) => g.tipo === 'publicacion').map((g) => g.item.id));
    await Promise.all([cargarEstado('publicacion', S.items.filter((g) => g.tipo === 'publicacion').map((g) => g.item.id)), cargarEstado('clip', S.items.filter((g) => g.tipo === 'clip').map((g) => g.item.id))]);
    $('gu-error').hidden = true; pintar();
  } catch (e) { mostrarError(e); }
  finally { S.cargando = false; $('gu-mas').disabled = false; }
}

$('gu-lista').addEventListener('click', (e) => {
  const yt = e.target.closest('[data-act=video-yt]'); if (yt) { reproductorYT(yt); return; }
  const gu = e.target.closest('[data-guardar]');
  if (gu) {                                            // al quitar un guardado, la tarjeta desaparece de la lista
    const tarjeta = gu.closest('article');
    alternar(gu, { onCambio: (tipo, id, ahora) => { if (!ahora) { S.items = S.items.filter((g) => !(g.tipo === tipo && Number(g.item.id) === id)); tarjeta?.remove(); if (!S.items.length) pintar(); } } });
    return;
  }
  const rp = e.target.closest('[data-reportar]'); if (rp) { abrirReportar({ tipo: 'publicacion', objetivo: rp.dataset.reportar, titulo: 'Publicación guardada' }); return; }
  const oc = e.target.closest('[data-ocultar]');
  if (oc) { const id = Number(oc.dataset.ocultar); abrirOcultar({ tipo: 'publicacion', id, titulo: 'Publicación guardada', onListo: () => { S.items = S.items.filter((g) => !(g.tipo === 'publicacion' && Number(g.item.id) === id)); pintar(); } }); }
});
$('gu-mas').addEventListener('click', () => cargar({ mas: true }));
$('gu-reintentar').addEventListener('click', () => { $('gu-error').hidden = true; cargar(); });

onSession(({ session }) => {
  S.yo = session?.user?.id ?? null;
  $('gu-sinsesion').hidden = !!session; $('gu-app').hidden = !session;
  if (session && !S.iniciado) { S.iniciado = true; cargar(); }
});

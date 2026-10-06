// Página /buscar/: personas y publicaciones; si no hay texto, «A quién seguir». Requiere sesión (la BD lo exige).
// Esquema: pages/buscar → features/social/{api, guardados} + features/amigos/api (seguir) + features/muro/tarjeta → core/social (lógica pura).
import { vacioHTML } from '../core/vacio.js';
import { onSession, can } from '../core/session.js';
import { escapeHTML } from '../core/dom.js';
import { href } from '../core/config.js';
import { avatarHTML } from '../core/avatar.js';
import { toast } from '../core/toast.js';
import { TIPOS_BUSQUEDA, esTipoBusqueda, validarBusqueda } from '../core/social.js';
import * as api from '../features/social/api.js';
import * as amigosApi from '../features/amigos/api.js';
import { alternar, cargarEstado } from '../features/social/guardados.js';
import { cargarEncuestas } from '../features/encuestas/estado.js';
import { tarjetaComunidadHTML } from '../features/muro/tarjeta.js';
import { reproductorYT } from '../features/muro/render.js';
import { abrirReportar, abrirOcultar } from '../features/moderacion/acciones.js';

const $ = (id) => document.getElementById(id);
const PAGINA = 20, DESPL_MAX = 100;     // la BD acepta desplazamientos hasta 100: más allá se pide afinar la búsqueda
const params = new URLSearchParams(location.search);
const S = { yo: null, tipo: esTipoBusqueda(params.get('t')) ? params.get('t') : 'personas', q: params.get('q') ?? '', personas: [], pubs: [], desp: 0, hayMas: false, sugs: [], cargando: false, req: 0, iniciado: false };
let temporizador = null;

const avisar = (t) => { $('bu-aviso').textContent = t || ''; $('bu-aviso').hidden = !t; };
const perfilURL = (u) => `${href('perfil/')}?u=${encodeURIComponent(u)}`;

function filaPersona(p, { sugerencia = false } = {}) {
  return `<article class="glass-panel rounded-2xl p-3 flex items-center gap-3" data-persona="${escapeHTML(p.id)}">
    <a href="${escapeHTML(perfilURL(p.username))}" class="w-11 h-11 rounded-full overflow-hidden flex items-center justify-center bg-galaxy-card border border-galaxy-border shrink-0">${avatarHTML(p.avatar, p.nombre, 44)}</a>
    <div class="min-w-0 flex-1"><a href="${escapeHTML(perfilURL(p.username))}" class="font-display font-bold text-white text-sm truncate block hover:text-galaxy-400">${escapeHTML(p.nombre)}</a>
      <p class="text-[12px] text-gray-400 truncate">@${escapeHTML(p.username)}${p.club ? ` · ${escapeHTML(p.club)}` : ''}</p>
      ${sugerencia && p.motivo ? `<p class="text-[12px] text-galaxy-400 truncate"><i class="fa-solid fa-lightbulb mr-1"></i>${escapeHTML(p.motivo)}</p>` : ''}</div>
    ${sugerencia ? `<button type="button" data-act="seguir" data-id="${escapeHTML(p.id)}" class="btn btn-primary !min-h-9 !px-3 !text-[12px]"><i class="fa-solid fa-heart"></i><span>Seguir</span></button>
      <button type="button" data-act="descartar" data-id="${escapeHTML(p.id)}" title="No me interesa" aria-label="No me interesa" class="w-8 h-8 rounded-lg text-gray-500 hover:text-bad shrink-0"><i class="fa-solid fa-xmark"></i></button>`
      : `<a href="${escapeHTML(perfilURL(p.username))}" class="btn btn-ghost !min-h-9 !px-3 !text-[12px]"><i class="fa-solid fa-user"></i><span>Ver perfil</span></a>`}</article>`;
}
const vacio = (t) => vacioHTML(t, { icono: 'fa-magnifying-glass' });
const tarjeta = (it) => tarjetaComunidadHTML(it, { yo: S.yo, puedeOcultar: can('resolverReportes') });

function pintarTabs() {
  $('bu-tabs').innerHTML = TIPOS_BUSQUEDA.map((t) => `<button type="button" data-tipo="${t.id}" aria-pressed="${S.tipo === t.id}" class="adv-chip !min-h-9 ${S.tipo === t.id ? '!border-galaxy-400' : ''}"><i class="fa-solid ${t.icono} mr-1.5"></i>${t.etiqueta}</button>`).join('');
}
function pintar(estado = 'resultados') {
  const el = $('bu-res'); $('bu-mas').hidden = true;
  if (estado === 'cargando') { el.innerHTML = '<p class="text-gray-400 text-sm py-8 text-center">Buscando…</p>'; return; }
  if (estado === 'inicio') {
    el.innerHTML = `<h2 class="font-display font-bold text-white text-xs uppercase tracking-widest"><i class="fa-solid fa-lightbulb text-galaxy-400 mr-1.5"></i>A quién seguir</h2>`
      + (S.sugs.length ? S.sugs.map((p) => filaPersona(p, { sugerencia: true })).join('') : vacio('Por ahora no tenemos sugerencias. Escribe un nombre arriba para buscar jugadores.'))
      + '<p class="text-[12px] text-gray-500">Sugerimos según amigos en común, a quién siguen tus seguidos, tu club favorito, tu país y la actividad reciente. «✕» oculta una sugerencia.</p>';
    return;
  }
  if (S.tipo === 'personas') { el.innerHTML = S.personas.length ? S.personas.map((p) => filaPersona(p)).join('') : vacio('No encontramos a nadie con ese nombre.'); return; }
  el.innerHTML = S.pubs.length ? S.pubs.map(tarjeta).join('') : vacio('No encontramos publicaciones con esas palabras.');
  const mas = S.hayMas && S.desp + PAGINA <= DESPL_MAX;
  $('bu-mas').hidden = !mas;
  if (S.hayMas && !mas) el.insertAdjacentHTML('beforeend', '<p class="text-[12px] text-gray-500 text-center">Hay más coincidencias: afina las palabras para verlas.</p>');
}

function sincronizarURL() {
  const u = new URL(location.href); u.searchParams.delete('q'); u.searchParams.delete('t');
  if (S.q.trim()) { u.searchParams.set('q', S.q.trim()); u.searchParams.set('t', S.tipo); }
  history.replaceState(null, '', u);
}

/** Lanza la búsqueda con el texto actual. `mas` = siguiente página de publicaciones. Una respuesta vieja nunca pisa a una más reciente (req). */
async function buscar({ mas = false } = {}) {
  const v = validarBusqueda(S.q, S.tipo);
  sincronizarURL();
  if (!S.q.trim()) { avisar(''); pintar('inicio'); return; }
  if (!v.ok) { avisar(v.error); return; }
  avisar(''); const req = ++S.req; if (!mas) pintar('cargando');
  try {
    if (S.tipo === 'personas') { const r = await api.buscarPersonas(v.q); if (req !== S.req) return; S.personas = r; pintar(); return; }
    const desp = mas ? S.desp + PAGINA : 0;
    const r = await api.buscarPublicaciones(v.q, desp, PAGINA); if (req !== S.req) return;
    S.desp = desp; S.pubs = mas ? [...S.pubs, ...r.items] : r.items; S.hayMas = r.hayMas;
    await Promise.all([cargarEstado('publicacion', S.pubs.map((x) => x.id)), cargarEncuestas(S.pubs.map((x) => x.id))]); if (req !== S.req) return;
    pintar();
  } catch (e) { if (req !== S.req) return; console.error('[buscar]', e); avisar(e.message || 'No se pudo buscar. Inténtalo de nuevo.'); $('bu-res').innerHTML = ''; }
}

async function cargarSugerencias() {
  try { S.sugs = await api.sugerencias(8); } catch (e) { console.warn('[buscar] sugerencias:', e.message); S.sugs = []; if (!S.q.trim()) avisar(e.message); }
  if (!S.q.trim()) pintar('inicio');
}

$('bu-q').addEventListener('input', (e) => { S.q = e.target.value; clearTimeout(temporizador); temporizador = setTimeout(() => buscar(), 350); });
$('bu-q').addEventListener('keydown', (e) => { if (e.key === 'Enter') { clearTimeout(temporizador); buscar(); } });
$('bu-tabs').addEventListener('click', (e) => { const t = e.target.closest('[data-tipo]')?.dataset.tipo; if (t && t !== S.tipo) { S.tipo = t; pintarTabs(); clearTimeout(temporizador); buscar(); } });
$('bu-mas').addEventListener('click', () => buscar({ mas: true }));

$('bu-res').addEventListener('click', async (e) => {
  const yt = e.target.closest('[data-act=video-yt]'); if (yt) { reproductorYT(yt); return; }
  const gu = e.target.closest('[data-guardar]'); if (gu) { alternar(gu); return; }
  const rp = e.target.closest('[data-reportar]'); if (rp) { abrirReportar({ tipo: 'publicacion', objetivo: rp.dataset.reportar, titulo: 'Publicación encontrada en la búsqueda' }); return; }
  const oc = e.target.closest('[data-ocultar]');
  if (oc) { const id = Number(oc.dataset.ocultar); abrirOcultar({ tipo: 'publicacion', id, titulo: 'Publicación encontrada en la búsqueda', onListo: () => { S.pubs = S.pubs.filter((x) => Number(x.id) !== id); pintar(); } }); return; }
  const b = e.target.closest('[data-act]'); if (!b || b.disabled) return;
  const id = b.dataset.id; b.disabled = true;
  try {
    if (b.dataset.act === 'seguir') { await amigosApi.seguir(id); toast('Ahora sigues a esta persona.', 'ok', { key: 'seguir' }); }
    else if (b.dataset.act === 'descartar') await api.descartarSugerencia(id);
    S.sugs = S.sugs.filter((p) => p.id !== id); if (!S.q.trim()) pintar('inicio');
  } catch (err) { b.disabled = false; toast(err.message || 'No se pudo completar la acción.', 'error'); }
});

onSession(({ session }) => {
  S.yo = session?.user?.id ?? null;
  $('bu-sinsesion').hidden = !!session; $('bu-app').hidden = !session;
  if (!session || S.iniciado) return;
  S.iniciado = true; $('bu-q').value = S.q; pintarTabs();
  if (S.q.trim()) buscar(); else { pintar('cargando'); cargarSugerencias(); }
});

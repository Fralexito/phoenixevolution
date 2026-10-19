// Página /social/: la «portada social» de la comunidad. Esquema:
//   fila de historias (RPC historias_recientes, 056) → compositor (features/muro/compositor.js) → feed (muro_comunidad / siguiendo / destacado, ya existentes)
//   → pie de acciones (features/muro/pieSocial.js; reacciones con mis_reacciones, 057). La lógica pura vive en core/comunidad/feedSocial.js y core/comunidad/feed.js.
// Todo lo que se pinta de otros usuarios pasa por escapeHTML en los módulos que generan el HTML (tarjeta.js, render.js, pieSocial.js).
import { vacioHTML } from '../core/sistema/vacio.js';
import { escapeHTML } from '../core/sistema/dom.js';
import { toast } from '../core/sistema/toast.js';
import { onSession, can, getState } from '../core/sistema/session.js';
import { avatarHTML } from '../core/sistema/avatar.js';
import { href } from '../core/sistema/config.js';
import { segmentoParaGuardar, urlCompartir, aplicarReaccion } from '../core/comunidad/muro.js';
import { marcarVistas, indiceInicial } from '../core/comunidad/historias.js';
import { VISTAS, vistaInfo, vistaValida, paginaSiguiente, textoVacio } from '../core/comunidad/feed.js';
import { REACCION_RAPIDA, circulosHistorias, mapaMisReacciones, conMisReacciones, totalReacciones } from '../core/comunidad/feedSocial.js';
import { SEGMENTOS } from '../../data/muroEstilo.js';
import * as api from '../features/muro/api.js';
import { reproductorYT } from '../features/muro/render.js';
import { tarjetaComunidadHTML } from '../features/muro/tarjeta.js';
import { pieSocialHTML } from '../features/muro/pieSocial.js';
import { montarCompositor } from '../features/muro/compositor.js';
import { rafaga, salto, entrada } from '../features/dopamina.js';
import { abrirNuevaHistoria } from '../features/muro/historiasUI.js';
import { abrirHistorias } from '../features/muro/visor.js';
import { compartir } from '../features/muro/compartir.js';
import { abrirReportar, abrirOcultar } from '../features/moderacion/acciones.js';
import { alternar, cargarEstado } from '../features/social/guardados.js';
import { cargarEncuestas } from '../features/encuestas/estado.js';
import { initMencionAuto } from '../features/social/mencionAuto.js';
import { openAuthModal } from '../features/auth.js';

const $ = (id) => document.getElementById(id);
const feedEl = $('sx-feed'); const histEl = $('sx-hist'); const vistasEl = $('sx-vistas'); const filtroEl = $('sx-filtro'); const compEl = $('sx-compositor'); const finEl = $('sx-fin');
const KEY_VISTAS = 'pes-historias-vistas';   // la misma clave que usa /perfil/: «ya vista» se comparte entre las dos páginas
const q = new URLSearchParams(location.search);
const S = { yo: null, perfil: null, vista: vistaValida(q.get('v')), juego: segmentoParaGuardar(q.get('j')) ?? '', items: [], hayMas: false, cargando: false, req: 0, paleta: null, crudos: [], circulos: [], vistas: leerVistas(), compositor: null };

function leerVistas() { try { const o = JSON.parse(localStorage.getItem(KEY_VISTAS) ?? '{}'); return o && typeof o === 'object' ? o : {}; } catch { return {}; } }
function guardarVistas(ids) { S.vistas = marcarVistas(S.vistas, ids); try { localStorage.setItem(KEY_VISTAS, JSON.stringify(S.vistas)); } catch { /* sin almacenamiento: solo se pierde el «ya vista» */ } }
const cargandoHTML = '<p class="text-gray-400 text-sm py-12 text-center">Cargando…</p>';
const urlActual = () => { const p = new URLSearchParams(); if (S.vista !== 'recientes') p.set('v', S.vista); if (S.vista === 'recientes' && S.juego) p.set('j', S.juego); const t = p.toString(); return `${location.pathname}${t ? `?${t}` : ''}`; };

/* ---------- Historias ---------- */
function circuloHTML(c, i) {
  const a = c.autor; const nombre = c.mia ? 'Tu historia' : (a.nombre_display || a.username || 'Jugador');
  return `<button type="button" data-hist="${i}" class="sx-hist-item" aria-label="Ver historias de ${escapeHTML(a.nombre_display || a.username || 'jugador')}${c.nuevas ? ' (sin ver)' : ''}">
    <span class="sx-anillo ${c.nuevas ? 'is-nueva' : ''}"><span class="sx-anillo-in">${avatarHTML(a.avatar_url, a.nombre_display, 56)}</span></span>
    <span class="sx-hist-nombre">${escapeHTML(nombre)}</span></button>`;
}
function pintarHistorias() {
  S.circulos = circulosHistorias(S.crudos, { yo: S.yo, vistas: S.vistas });   // se recalcula siempre: «ya vista» y la sesión cambian el orden
  const mio = S.yo ? S.circulos.some((c) => c.mia) : false;
  const nueva = S.yo && !mio ? `<button type="button" data-hist-nueva class="sx-hist-item" aria-label="Crear una historia"><span class="sx-anillo sx-anillo-nuevo"><span class="sx-anillo-in"><i class="fa-solid fa-plus text-galaxy-400 text-xl" aria-hidden="true"></i></span></span><span class="sx-hist-nombre">Tu historia</span></button>` : '';
  const crear = S.yo && mio ? `<button type="button" data-hist-nueva class="sx-hist-item" aria-label="Añadir otra historia"><span class="sx-anillo sx-anillo-nuevo"><span class="sx-anillo-in"><i class="fa-solid fa-plus text-galaxy-400 text-xl" aria-hidden="true"></i></span></span><span class="sx-hist-nombre">Añadir</span></button>` : '';
  const lista = S.circulos.map(circuloHTML).join('');
  histEl.hidden = !(nueva || crear || lista);
  histEl.innerHTML = `<div class="sx-hist-fila" role="list" aria-label="Historias de las últimas 24 horas">${nueva}${crear}${lista}</div>`;
  pintarLado();
}
async function cargarHistorias() {
  try {
    const r = await api.historiasRecientes(24);
    S.crudos = Array.isArray(r?.items) ? r.items : [];
  } catch (e) { console.warn('[social] historias:', e?.message); S.crudos = []; }   // la fila es un extra: si falla, el feed sigue
  pintarHistorias();
}
function abrirCirculo(i) {
  const c = S.circulos[i]; if (!c) return; const a = c.autor; const nombre = a.nombre_display || a.username || 'Jugador';
  abrirHistorias({
    historias: c.historias, nombre, avatar: avatarHTML(a.avatar_url, a.nombre_display, 32), inicio: indiceInicial(c.historias, S.vistas),
    onVistas: (ids) => { guardarVistas(ids); pintarHistorias(); },
    onBorrar: c.mia ? async (id) => { try { await api.borrarHistoria(id); } catch (e) { toast(String(e?.message ?? e), 'error'); return false; } cargarHistorias(); return true; } : undefined,
    onReportar: S.yo && !c.mia ? (h) => abrirReportar({ tipo: 'historia', objetivo: h.id, titulo: `Historia de ${nombre}` }) : undefined,
    onModerar: S.yo && !c.mia && can('resolverReportes') ? (h) => abrirOcultar({ tipo: 'historia', id: h.id, titulo: `Historia de ${nombre}`, onListo: cargarHistorias }) : undefined,
  });
}

/* ---------- Feed ---------- */
function pintarVistas() {
  vistasEl.innerHTML = VISTAS.map((v) => `<button type="button" data-v="${v.id}" role="tab" aria-selected="${S.vista === v.id}" class="sx-tab ${S.vista === v.id ? 'is-on' : ''}"><i class="fa-solid ${v.icono}" aria-hidden="true"></i>${escapeHTML(v.texto)}</button>`).join('');
  $('sx-filtro-wrap').hidden = !vistaInfo(S.vista).filtraJuego;
  pintarNav();
}
function pintarFiltro() {
  filtroEl.innerHTML = [['', 'Todo'], ...SEGMENTOS].map(([id, n]) => `<button type="button" data-j="${id}" aria-pressed="${S.juego === id}" class="rounded-full border border-galaxy-border/70 px-2.5 py-1 text-gray-400 aria-pressed:text-white aria-pressed:border-galaxy-400 aria-pressed:bg-galaxy-600/25">${escapeHTML(n)}</button>`).join('');
  const r = $('sx-filtro-res'); if (r) r.textContent = S.juego ? (SEGMENTOS.find((s) => s[0] === S.juego)?.[1] ?? '') : 'Todos los juegos';
  pintarNav();
}
const tarjeta = (it) => tarjetaComunidadHTML(it, { variante: 'hilo', yo: S.yo, puedeOcultar: can('resolverReportes'), pie: pieSocialHTML(it, { paleta: S.paleta === Number(it.id) }) });
let pintados = 0; let primero = null;   // cuántas tarjetas hay en pantalla y cuál va primera: sirve para animar SOLO las nuevas al cargar más
function pintar() {
  feedEl.innerHTML = S.items.length ? S.items.map(tarjeta).join('')
    : `<div class="glass-panel rounded-2xl p-8 text-center text-gray-500 text-xs">${escapeHTML(textoVacio(S.vista, { juego: S.juego, conSesion: !!S.yo }))}</div>`;
  finEl.hidden = !S.hayMas;
  const idPrimero = S.items[0]?.id ?? null; const continuacion = pintados > 0 && idPrimero !== null && idPrimero === primero && S.items.length > pintados;
  if (S.items.length) entrada(feedEl, continuacion ? pintados : 0);
  pintados = S.items.length; primero = idPrimero;
  pintarLado();
}
/** Repinta SOLO una tarjeta (reaccionar no debe reiniciar los videos ni mover el scroll de las demás). */
function repintar(id) {
  const it = S.items.find((x) => Number(x.id) === Number(id)); const el = feedEl.querySelector(`[data-pub="${Number(id)}"]`); if (!it || !el) return;
  const t = document.createElement('div'); t.innerHTML = tarjeta(it); const nuevo = t.firstElementChild;
  const pieNuevo = nuevo.querySelector('[data-pie]'); const pieViejo = el.querySelector('[data-pie]');
  if (pieNuevo && pieViejo) pieViejo.replaceWith(pieNuevo); else el.replaceWith(nuevo);   // solo se cambia el pie: el contenido (video, foto) queda intacto
}
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
    let nuevos = m.items ?? [];
    if (S.yo && nuevos.length) { try { nuevos = conMisReacciones(nuevos, mapaMisReacciones(await api.misReacciones(nuevos.map((x) => x.id)))); } catch (e) { console.warn('[social] mis reacciones:', e?.message); } }   // sin esto solo se pierde el resaltado
    S.items = mas ? [...S.items, ...nuevos] : nuevos; S.hayMas = !!m.hay_mas;
    await cargarEncuestas(S.items.map((x) => x.id));
    if (S.yo) await cargarEstado('publicacion', S.items.map((x) => x.id));
    if (req === S.req) pintar();
  } catch (e) {
    console.error('[social] carga:', e);
    if (mas) toast('No se pudo cargar más. Intenta de nuevo.', 'error'); else feedEl.innerHTML = vacioHTML('No se pudo cargar el feed. Intenta de nuevo en un momento.', { error: true });
  } finally { S.cargando = false; }
}
function reiniciarFeed() { S.items = []; S.hayMas = false; S.cargando = false; S.paleta = null; S.req += 1; feedEl.innerHTML = cargandoHTML; finEl.hidden = true; cargar(); }

/* ---------- Eventos ---------- */
async function reaccionar(id, tipo) {
  if (!S.yo) { toast('Inicia sesión para reaccionar.', 'info'); openAuthModal('login'); return; }
  let final; try { final = await api.reaccionar(id, tipo); } catch (e) { toast(String(e?.message ?? 'No se pudo reaccionar.'), 'error'); return; }   // null = quité mi reacción
  S.paleta = null; S.items = S.items.map((x) => (Number(x.id) === Number(id) ? aplicarReaccion(x, final) : x)); repintar(id);
  if (final) { const b = feedEl.querySelector(`[data-pie="${Number(id)}"] [data-sx="reaccionar"]`); if (b) { salto(b.querySelector('span')); rafaga(b, [final, '✨'], { n: 7 }); } }   // pequeña celebración al reaccionar (no al quitar)
}
const baseAbsoluta = () => new URL(href(''), location.href).href;
feedEl.addEventListener('click', (e) => {
  const sx = e.target.closest('[data-sx]');
  if (sx) {
    const id = Number(sx.dataset.id);
    if (sx.dataset.sx === 'reaccionar') { const it = S.items.find((x) => Number(x.id) === id); reaccionar(id, it?.mia || REACCION_RAPIDA); }   // si ya reaccioné, repetir mi emoji lo quita (así lo resuelve la BD)
    else if (sx.dataset.sx === 'emoji') reaccionar(id, sx.dataset.tipo);
    else if (sx.dataset.sx === 'paleta') { const antes = S.paleta; S.paleta = antes === id ? null : id; if (antes) repintar(antes); repintar(id); }
    else if (sx.dataset.sx === 'compartir') compartir({ url: urlCompartir({ base: baseAbsoluta(), usuario: sx.dataset.user, tipo: 'p', id }), titulo: 'Publicación en Phoenix Evolution Series' });
    return;
  }
  const yt = e.target.closest('[data-act=video-yt]'); if (yt) { reproductorYT(yt); return; }
  const gu = e.target.closest('[data-guardar]'); if (gu) { alternar(gu); return; }
  const rp = e.target.closest('[data-reportar]'); if (rp) { abrirReportar({ tipo: 'publicacion', objetivo: rp.dataset.reportar, titulo: 'Publicación en la comunidad' }); return; }
  const oc = e.target.closest('[data-ocultar]');
  if (oc) { const id = Number(oc.dataset.ocultar); abrirOcultar({ tipo: 'publicacion', id, titulo: 'Publicación en la comunidad', onListo: () => { S.items = S.items.filter((x) => Number(x.id) !== id); pintar(); } }); }
});
histEl.addEventListener('click', (e) => {
  if (e.target.closest('[data-hist-nueva]')) { if (S.yo) abrirNuevaHistoria({ uid: S.yo, onListo: cargarHistorias }); return; }
  const b = e.target.closest('[data-hist]'); if (b) abrirCirculo(Number(b.dataset.hist));
});
vistasEl.addEventListener('click', (e) => {
  const b = e.target.closest('[data-v]'); if (!b || b.dataset.v === S.vista) return;
  S.vista = vistaValida(b.dataset.v); pintarVistas(); history.replaceState(null, '', urlActual()); reiniciarFeed();
});
filtroEl.addEventListener('click', (e) => {
  const b = e.target.closest('[data-j]'); if (!b) return;
  S.juego = b.dataset.j; pintarFiltro(); history.replaceState(null, '', urlActual()); reiniciarFeed();
});
$('sx-mas')?.addEventListener('click', () => cargar({ mas: true }));
// Scroll infinito: cuando el aviso del final entra en pantalla se pide la siguiente página (el botón «Cargar más» queda como respaldo).
if ('IntersectionObserver' in window) new IntersectionObserver((es) => { if (es.some((x) => x.isIntersecting) && S.hayMas && !S.cargando) cargar({ mas: true }); }, { rootMargin: '600px 0px' }).observe(finEl);

/* ---------- Columnas de foro (19-oct-2026): navegación a la izquierda, la comunidad a la derecha ---------- */
const navFeeds = document.querySelector('[data-sxr-feeds]'); const navJuegos = document.querySelector('[data-sxr-juegos]');
const LETRA = { pes: 'P', sp: 'SP', fifa: 'F', eafc: 'FC', efootball: 'eF' };
function pintarNav() {
  const tit = document.querySelector('[data-sxr-titulo]');   // en PC el feed se elige a la izquierda; aquí solo se nombra
  if (tit) tit.innerHTML = `<b>${escapeHTML(vistaInfo(S.vista).texto)}</b>${S.vista === 'recientes' ? ` · ${escapeHTML(S.juego ? nombreJuego(S.juego) ?? 'Todos los juegos' : 'Todos los juegos')}` : ''}`;
  if (navFeeds) navFeeds.innerHTML = VISTAS.map((v) => `<button type="button" class="sxr-item" data-v="${v.id}" aria-current="${S.vista === v.id ? 'page' : 'false'}"><span class="sxr-ic"><i class="fa-solid ${v.icono}" aria-hidden="true"></i></span><span>${escapeHTML(v.texto)}</span></button>`).join('');
  if (navJuegos) navJuegos.innerHTML = [['', 'Todos los juegos'], ...SEGMENTOS].map(([id, n]) => `<button type="button" class="sxr-item" data-j="${id}" aria-current="${S.vista === 'recientes' && S.juego === id ? 'true' : 'false'}"><span class="sxr-ic sxr-ic-juego">${id ? escapeHTML(LETRA[id] ?? n[0]) : '<i class="fa-solid fa-gamepad" aria-hidden="true"></i>'}</span><span>${escapeHTML(n)}</span></button>`).join('');
}
const nombreJuego = (id) => SEGMENTOS.find((s) => s[0] === id)?.[1] ?? null;
function pintarLado() {
  const cifras = document.querySelector('[data-sxr-cifras]'); const activos = document.querySelector('[data-sxr-activos]'); const top = document.querySelector('[data-sxr-top]');
  if (!cifras) return;
  const autores = new Set(S.items.map((x) => x.autor?.id).filter(Boolean)).size;
  cifras.innerHTML = `<div><b>${S.circulos.length}</b><small>historias hoy</small></div><div><b>${autores}</b><small>autores en el feed</small></div>`;
  const porJuego = new Map(); for (const it of S.items) if (nombreJuego(it.juego)) porJuego.set(it.juego, (porJuego.get(it.juego) || 0) + 1);
  const lista = [...porJuego].sort((a, b) => b[1] - a[1]).slice(0, 5);
  activos.innerHTML = lista.length ? lista.map(([id, n]) => `<button type="button" class="sxr-fila" data-j="${id}"><span class="sxr-ic sxr-ic-juego">${escapeHTML(LETRA[id] ?? '?')}</span><span class="sxr-fila-tx"><b>${escapeHTML(nombreJuego(id))}</b><small>${n} publicaci${n === 1 ? 'ón' : 'ones'} en el feed</small></span></button>`).join('')
    : '<p class="sxr-nada">Cuando haya publicaciones con juego, aparecen aquí.</p>';
  const mejores = [...S.items].filter((x) => totalReacciones(x) > 0).sort((a, b) => totalReacciones(b) - totalReacciones(a)).slice(0, 4);
  top.innerHTML = mejores.length ? mejores.map((it) => { const a = it.autor ?? {}; const txt = String(it.texto ?? '').replace(/\s+/g, ' ').trim();
    return `<a class="sxr-fila" href="#" data-sxr-ir="${Number(it.id)}"><span class="sxr-fila-av">${avatarHTML(a.avatar_url, a.nombre_display, 28)}</span><span class="sxr-fila-tx"><b>${escapeHTML(txt ? (txt.length > 70 ? txt.slice(0, 70) + '…' : txt) : 'Publicación con foto o video')}</b><small>${escapeHTML(a.nombre_display ?? 'Jugador')} · ${totalReacciones(it)} reacciones</small></span></a>`; }).join('')
    : '<p class="sxr-nada">Aún nadie ha reaccionado a lo que hay en el feed.</p>';
}
// Clics de las columnas: cambiar de feed, filtrar por juego, ir a una publicación, crear publicación.
function irAVista(v, juego) {
  const cambia = v !== S.vista || (juego !== undefined && juego !== S.juego); if (!cambia) return;
  S.vista = vistaValida(v); if (juego !== undefined) S.juego = juego;
  pintarVistas(); pintarFiltro(); history.replaceState(null, '', urlActual()); reiniciarFeed();
}
document.querySelector('.sxr')?.addEventListener('click', (e) => {
  if (e.target.closest('#sx-feed, #sx-vistas, #sx-filtro, #sx-hist, #sx-compositor')) return;   // esas zonas tienen su propio manejador
  const v = e.target.closest('[data-v]'); if (v) { irAVista(v.dataset.v); return; }
  const j = e.target.closest('[data-j]'); if (j) { irAVista('recientes', j.dataset.j); return; }
  const ir = e.target.closest('[data-sxr-ir]');
  if (ir) { e.preventDefault(); const el = feedEl.querySelector(`[data-pub="${Number(ir.dataset.sxrIr)}"]`); if (el) { el.scrollIntoView({ behavior: 'smooth', block: 'center' }); el.classList.add('sxr-resalta'); setTimeout(() => el.classList.remove('sxr-resalta'), 1600); } return; }
  if (e.target.closest('[data-sxr-crear]')) { compEl.scrollIntoView({ behavior: 'smooth', block: 'center' }); setTimeout(() => compEl.querySelector('textarea, [contenteditable], input, button')?.focus({ preventScroll: true }), 400); }
});
// Vista «Tarjetas» o «Compacta» (como el selector de vista de los foros); se recuerda en este navegador.
const KEY_MODO = 'pes-social-modo';
function aplicarModo(m) {
  const modo = m === 'compacta' ? 'compacta' : 'tarjeta'; feedEl.dataset.modo = modo;
  document.querySelectorAll('[data-sxr-modo]').forEach((b) => b.setAttribute('aria-pressed', String(b.dataset.sxrModo === modo)));
  try { localStorage.setItem(KEY_MODO, modo); } catch { /* sin almacenamiento: solo no se recuerda */ }
}
document.querySelectorAll('[data-sxr-modo]').forEach((b) => b.addEventListener('click', () => aplicarModo(b.dataset.sxrModo)));
try { aplicarModo(localStorage.getItem(KEY_MODO)); } catch { aplicarModo('tarjeta'); }

/* ---------- Arranque ---------- */
initMencionAuto();
pintarVistas(); pintarFiltro(); feedEl.innerHTML = cargandoHTML; cargar(); cargarHistorias();
onSession(({ session, profile }) => {
  const id = session?.user?.id ?? null; const cambio = id !== S.yo; S.yo = id; S.perfil = profile ?? getState().profile ?? null;
  if (cambio || !S.compositor) {   // solo se monta de nuevo si cambió la persona: un refresco de sesión no debe borrar lo que está escribiendo
    S.compositor?.destruir(); S.compositor = montarCompositor(compEl, { yo: S.yo, perfil: S.perfil, onLogin: () => openAuthModal('login'), onPublicado: () => { if (S.vista !== 'recientes') { S.vista = 'recientes'; pintarVistas(); history.replaceState(null, '', urlActual()); } reiniciarFeed(); rafaga(compEl, ['🔥', '✨', '⚽', '🏆'], { n: 14 }); } });
  }
  if (!cambio) return;
  cargarHistorias(); if (vistaInfo(S.vista).requiereSesion || S.items.length) reiniciarFeed();
});

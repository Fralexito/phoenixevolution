// Página /social/: la «portada social» de la comunidad. Esquema:
//   fila de historias (RPC historias_recientes, 056) → compositor (features/muro/compositor.js) → feed (muro_comunidad / siguiendo / destacado, ya existentes)
//   → pie de acciones (features/muro/pieSocial.js; reacciones con mis_reacciones, 057). La lógica pura vive en core/comunidad/feedSocial.js y core/comunidad/feed.js.
// Todo lo que se pinta de otros usuarios pasa por escapeHTML en los módulos que generan el HTML (tarjeta.js, render.js, pieSocial.js).
import { escapeHTML } from '../core/sistema/dom.js';
import { toast } from '../core/sistema/toast.js';
import { onSession, can, getState, isAdmin } from '../core/sistema/session.js';
import { confirmar } from '../core/sistema/dialogo.js';
import { avatarHTML } from '../core/sistema/avatar.js';
import { href } from '../core/sistema/config.js';
import { segmentoParaGuardar, urlCompartir, aplicarReaccion, tiempoRelativo, validarRespuesta, textoAHTML, etiquetasDe } from '../core/comunidad/muro.js';
import * as socialApi from '../features/social/api.js';
import * as amigosApi from '../features/amigos/api.js';
import { marcarVistas, indiceInicial } from '../core/comunidad/historias.js';
import { VISTAS, vistaInfo, vistaValida, paginaSiguiente, textoVacio } from '../core/comunidad/feed.js';
import { REACCION_RAPIDA, circulosHistorias, mapaMisReacciones, conMisReacciones, totalReacciones, ORDENES, ordenValido, ordenarFeed, contarNuevas } from '../core/comunidad/feedSocial.js';
import { SEGMENTOS, LOGOS_JUEGO } from '../../data/muroEstilo.js';
import * as api from '../features/muro/api.js';
import { reproductorYT } from '../features/muro/render.js';
import { tarjetaComunidadHTML } from '../features/muro/tarjeta.js';
import { pieSocialHTML } from '../features/muro/pieSocial.js';
import { montarCompositor } from '../features/muro/compositor.js';
import { rafaga, salto, entrada } from '../features/dopamina.js';
// Ventanas de historias: se descargan al primer toque (no hacen falta para pintar el feed; ronda 386).
const abrirNuevaHistoria = (o) => import('../features/muro/historiasUI.js').then((m) => m.abrirNuevaHistoria(o)).catch((e) => { console.error('[social] historias:', e); toast('No se pudo abrir. Revisa tu conexión.', 'error'); });
const abrirHistorias = (o) => import('../features/muro/visor.js').then((m) => m.abrirHistorias(o)).catch((e) => { console.error('[social] visor:', e); toast('No se pudo abrir. Revisa tu conexión.', 'error'); });
import { abrirReportar, abrirOcultar } from '../features/moderacion/acciones.js';
import { alternar, cargarEstado } from '../features/social/guardados.js';
import { cargarEncuestas } from '../features/encuestas/estado.js';
import { initMencionAuto } from '../features/social/mencionAuto.js';
import { montarVisorFotos } from '../features/social/visorFotos.js';
import { montarDobleToque, montarTirarParaRecargar, montarDeslizarA, marcarDesliza } from '../features/social/gestos.js';
import { originalHTML, abrirCompartir, abrirQuienReacciono, abrirTarjetaPerfil, vigilarVistas } from '../features/social/fase2.js';
import { openAuthModal } from '../features/auth.js';
import { stickerHTML, abrirSelectorStickers } from '../features/social/stickers.js';

const $ = (id) => document.getElementById(id);
const feedEl = $('sx-feed'); const histEl = $('sx-hist'); const vistasEl = $('sx-vistas'); const filtroEl = $('sx-filtro'); const compEl = $('sx-compositor'); const finEl = $('sx-fin');
const KEY_VISTAS = 'pes-historias-vistas';   // la misma clave que usa /perfil/: «ya vista» se comparte entre las dos páginas
const q = new URLSearchParams(location.search);
// «Ordenar»: «Más reacciones» repetía la pestaña «Destacado» (mismo concepto, mismo icono) → en Social solo Nuevos · Más comentados (auditoría 19-oct).
const ORDENES_SOCIAL = ORDENES.filter((o) => o.id !== 'reacciones');
const ordenSocial = (v) => { const o = ordenValido(v); return ORDENES_SOCIAL.some((x) => x.id === o) ? o : 'nuevos'; };
const S = { yo: null, perfil: null, vista: vistaValida(q.get('v')), juego: segmentoParaGuardar(q.get('j')) ?? '', items: [], hayMas: false, cargando: false, req: 0, paleta: null, crudos: [], circulos: [], vistas: leerVistas(), compositor: null, orden: ordenSocial(q.get('o')), abiertas: new Set(), resp: new Map(), foco: null, tag: tagValido(q.get('tag')), social: {}, likesResp: new Map() };
// #etiqueta elegida (?tag=Liga): el feed muestra solo las publicaciones con ella (buscar_publicaciones). Letras, números y _ (máx. 30).
function tagValido(t) { const s = String(t ?? '').replace(/^#/, '').trim(); return /^[0-9]*[A-Za-zÀ-ÿ][A-Za-zÀ-ÿ0-9_]{0,29}$/.test(s) ? s : ''; }

function leerVistas() { try { const o = JSON.parse(localStorage.getItem(KEY_VISTAS) ?? '{}'); return o && typeof o === 'object' ? o : {}; } catch { return {}; } }
function guardarVistas(ids) { S.vistas = marcarVistas(S.vistas, ids); try { localStorage.setItem(KEY_VISTAS, JSON.stringify(S.vistas)); } catch { /* sin almacenamiento: solo se pierde el «ya vista» */ } }
const esqueleto = '<div class="sxr-esq" aria-hidden="true"><span class="sxr-esq-cab"></span><span class="sxr-esq-l"></span><span class="sxr-esq-l sxr-esq-c"></span><span class="sxr-esq-pie"></span></div>';
const cargandoHTML = `<div role="status" aria-label="Cargando publicaciones">${esqueleto.repeat(3)}</div>`;
const urlActual = () => { const p = new URLSearchParams(); if (S.vista !== 'recientes') p.set('v', S.vista); if (S.vista === 'recientes' && S.juego) p.set('j', S.juego); if (S.orden !== 'nuevos') p.set('o', S.orden); if (S.tag) p.set('tag', S.tag); const t = p.toString(); return `${location.pathname}${t ? `?${t}` : ''}`; };

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
  histEl.innerHTML = `<div class="sx-hist-fila" role="group" aria-label="Historias de las últimas 24 horas">${nueva}${crear}${lista}</div>`;
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
  vistasEl.innerHTML = `<span class="sxr-vistas-pastilla" aria-hidden="true"></span>${VISTAS.map((v) => `<button type="button" data-v="${v.id}" role="tab" aria-selected="${S.vista === v.id}" class="sx-tab ${S.vista === v.id ? 'is-on' : ''}"><i class="fa-solid ${v.icono}" aria-hidden="true"></i>${escapeHTML(v.texto)}</button>`).join('')}`;
  requestAnimationFrame(moverPastilla);   // la pastilla se desliza desde la pestaña anterior hasta la nueva
  $('sx-filtro-wrap').hidden = !vistaInfo(S.vista).filtraJuego;
  pintarNav(); marcarFiltros();
}
/** Pastilla de las pestañas (celular): se coloca bajo la elegida; el CSS la desliza. */
function moverPastilla() {
  const b = vistasEl.querySelector('[aria-selected="true"]'); if (!b) return;
  vistasEl.style.setProperty('--x', `${b.offsetLeft}px`); vistasEl.style.setProperty('--w', `${b.offsetWidth}px`);
}
/** Punto en el botón «Ordenar y filtrar» si algo no está como viene (orden, juego o vista compacta): se sabe sin abrirlo. */
function marcarFiltros() {
  const p = document.querySelector('[data-sxr-punto]'); if (!p) return;
  p.hidden = !(S.orden !== 'nuevos' || (S.vista === 'recientes' && S.juego) || feedEl.dataset.modo === 'compacta');
}
function pintarFiltro() {
  filtroEl.innerHTML = [['', 'Todos los juegos'], ...SEGMENTOS].map(([id, n]) => `<button type="button" data-j="${id}" aria-pressed="${S.juego === id}" class="sxr-chip">${escapeHTML(n)}</button>`).join('');
  pintarNav(); marcarFiltros();
}
const tarjeta = (it) => { const so = S.social[String(it.id)] ?? null;   // fase 2: la publicación original dentro de una compartida, vistas y veces compartida
  return tarjetaComunidadHTML(it, { variante: 'hilo', yo: S.yo, puedeOcultar: can('resolverReportes'), puedeBorrar: isAdmin(), extra: originalHTML(so?.original), pie: pieSocialHTML(it, { paleta: S.paleta === Number(it.id), social: so }) }); };
let pintados = 0; let primero = null;   // cuántas tarjetas hay en pantalla y cuál va primera: sirve para animar SOLO las nuevas al cargar más
function pintar() {
  feedEl.innerHTML = S.items.length ? ordenarFeed(S.items, S.orden).map(tarjeta).join('') + (S.hayMas ? '' : finalHTML())
    : vacioSocialHTML();
  for (const id of S.abiertas) pintarHilo(id);
  finEl.hidden = !S.hayMas;
  const idPrimero = S.items[0]?.id ?? null; const continuacion = pintados > 0 && idPrimero !== null && idPrimero === primero && S.items.length > pintados;
  if (S.items.length) entrada(feedEl, continuacion ? pintados : 0);
  pintados = S.items.length; primero = idPrimero;
  pintarLado();
}
// Botón de acción según la situación: sin sesión → Entrar; «Siguiendo» → Buscar jugadores; si no → Crear publicación (auditoría 19-oct).
function accionHTML(clase) {
  if (!S.yo) return `<button type="button" class="${clase}" data-sxr-entrar><i class="fa-solid fa-right-to-bracket" aria-hidden="true"></i> Entrar</button>`;
  if (S.vista === 'siguiendo' && !S.tag) return `<a class="${clase}" href="${escapeHTML(href('buscar/'))}"><i class="fa-solid fa-magnifying-glass" aria-hidden="true"></i> Buscar jugadores</a>`;
  return `<button type="button" class="${clase}" data-sxr-crear><i class="fa-solid fa-plus" aria-hidden="true"></i> Crear publicación</button>`;
}
function vacioSocialHTML() {
  const titulo = S.tag ? `Aún no hay publicaciones con #${S.tag}` : textoVacio(S.vista, { juego: S.juego, conSesion: !!S.yo });
  const texto = S.vista === 'siguiendo' && S.yo && !S.tag ? 'Sigue a jugadores para ver aquí lo que publican.' : 'Sé quien abre la conversación: una foto de tu último partido, un golazo o una pregunta para la comunidad.';
  return `<div class="sxr-vacio"><span class="sxr-vacio-ic" aria-hidden="true"><i class="fa-solid fa-fire"></i></span><b>${escapeHTML(titulo)}</b><p>${escapeHTML(texto)}</p>${accionHTML('sxr-crear')}</div>`;
}
// Final del feed (19-oct-2026, más personalidad): en vez de cortarse en seco, el logo de Phoenix; el texto depende de lo que se está viendo.
function finalHTML() {
  const texto = S.tag ? `No hay más publicaciones con #${S.tag}.` : S.vista === 'destacado' ? 'Eso es todo lo destacado de la semana.' : S.vista === 'siguiendo' ? 'Ya viste todo lo nuevo de quienes sigues.' : 'Ya viste todo lo nuevo de la comunidad. Vuelve en un rato o enciende tú la conversación.';
  return `<div class="sxr-final"><img src="${escapeHTML(href('logo.webp'))}" alt="" width="44" height="44" loading="lazy" decoding="async"><b>Estás al día 🔥</b><p>${escapeHTML(texto)}</p><div class="sxr-final-acc">${accionHTML('sxr-final-b is-fuego')}</div></div>`;
}
/** Repinta SOLO una tarjeta (reaccionar no debe reiniciar los videos ni mover el scroll de las demás). */
function repintar(id) {
  const it = S.items.find((x) => Number(x.id) === Number(id)); const el = feedEl.querySelector(`[data-pub="${Number(id)}"]`); if (!it || !el) return;
  const t = document.createElement('div'); t.innerHTML = tarjeta(it); const nuevo = t.firstElementChild;
  const pieNuevo = nuevo.querySelector('[data-pie]'); const pieViejo = el.querySelector('[data-pie]');
  if (pieNuevo && pieViejo) pieViejo.replaceWith(pieNuevo); else el.replaceWith(nuevo);   // solo se cambia el pie: el contenido (video, foto) queda intacto
}
async function pedir(mas) {
  if (S.tag) { const r = await socialApi.buscarPublicaciones(`#${S.tag}`, mas ? S.items.length : 0); return { items: r.items, hay_mas: r.hayMas }; }
  const pag = mas ? paginaSiguiente(S.vista, S.items) : { antes: null, desplazamiento: 0 };
  if (S.vista === 'siguiendo') return api.siguiendo(pag.antes ?? null);
  if (S.vista === 'destacado') return api.destacado(pag.desplazamiento ?? 0);
  return api.comunidad(S.juego || null, pag.antes ?? null);
}
async function cargar({ mas = false } = {}) {
  if (S.cargando) return;
  if (vistaInfo(S.vista).requiereSesion && !S.yo) { S.items = []; S.hayMas = false; pintar(); return; }
  S.cargando = true; const req = ++S.req; feedEl.setAttribute('aria-busy', 'true');
  try {
    const m = await pedir(mas); if (req !== S.req) return;
    let nuevos = m.items ?? [];
    // Rendimiento (ronda 386): los 4 extras del feed van EN PARALELO (antes, uno tras otro: 4 viajes a la base antes de pintar).
    // Cada uno falla por su cuenta: sin él solo se pierde un detalle (resaltado, encuestas, vistas o guardados), nunca el feed.
    const ids = [...(mas ? S.items : []), ...nuevos].map((x) => x.id);
    const [mias, , social] = await Promise.all([
      S.yo && nuevos.length ? api.misReacciones(nuevos.map((x) => x.id)).catch((e) => { console.warn('[social] mis reacciones:', e?.message); return null; }) : null,
      Promise.resolve().then(() => cargarEncuestas(ids)).catch((e) => console.warn('[social] encuestas:', e?.message)),
      Promise.resolve().then(() => api.socialDe(ids)).catch((e) => { console.warn('[social] datos sociales:', e?.message); return null; }),
      S.yo ? Promise.resolve().then(() => cargarEstado('publicacion', ids)).catch((e) => console.warn('[social] guardados:', e?.message)) : null,
    ]);
    if (req !== S.req) return;
    if (mias) nuevos = conMisReacciones(nuevos, mapaMisReacciones(mias));
    S.items = mas ? [...S.items, ...nuevos] : nuevos; S.hayMas = !!m.hay_mas;
    Object.assign(S.social, social ?? {});
    pintar();
  } catch (e) {
    console.error('[social] carga:', e);
    if (mas) toast('No se pudo cargar más. Intenta de nuevo.', 'error'); else feedEl.innerHTML = '<div class="sxr-vacio"><span class="sxr-vacio-ic is-error" aria-hidden="true"><i class="fa-solid fa-triangle-exclamation"></i></span><b>No se pudo cargar el feed</b><p>Revisa tu conexión e inténtalo de nuevo.</p><button type="button" class="sxr-crear" data-sxr-recargar><i class="fa-solid fa-rotate-right" aria-hidden="true"></i> Reintentar</button></div>';
  } finally { if (req === S.req) { S.cargando = false; feedEl.removeAttribute('aria-busy'); } }   // una carga vieja no apaga «cargando» de la nueva
}
function reiniciarFeed() { S.items = []; S.hayMas = false; S.cargando = false; S.paleta = null; S.req += 1; S.abiertas.clear(); S.resp.clear(); S.likesResp.clear(); S.foco = null; feedEl.innerHTML = cargandoHTML; finEl.hidden = true; cargar(); }

/* ---------- Eventos ---------- */
async function reaccionar(id, tipo) {
  if (!S.yo) { toast('Inicia sesión para reaccionar.', 'info'); openAuthModal('login'); return; }
  let final; try { final = await api.reaccionar(id, tipo); } catch (e) { toast(String(e?.message ?? 'No se pudo reaccionar.'), 'error'); return; }   // null = quité mi reacción
  const antes = S.paleta; S.paleta = null; S.items = S.items.map((x) => (Number(x.id) === Number(id) ? aplicarReaccion(x, final) : x)); repintar(id); if (antes && antes !== Number(id)) repintar(antes); window.dispatchEvent(new Event('social:actividad'));
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
    else if (sx.dataset.sx === 'compartir') { const it = S.items.find((x) => Number(x.id) === id); if (it) abrirCompartir({ it, url: urlCompartir({ base: baseAbsoluta(), usuario: sx.dataset.user, tipo: 'p', id }), conSesion: !!S.yo, alCompartir: () => { reiniciarFeed(); pintarRacha(); } }); }
    else if (sx.dataset.sx === 'quien') abrirQuienReacciono(id);
    return;
  }
  const yt = e.target.closest('[data-act=video-yt]'); if (yt) { reproductorYT(yt); return; }
  const gu = e.target.closest('[data-guardar]'); if (gu) { alternar(gu); return; }
  const bp = e.target.closest('[data-borrar-pub]'); if (bp) { borrarPublicacion(Number(bp.dataset.borrarPub)); return; }
  const br = e.target.closest('[data-borrar-resp]'); if (br) { borrarRespuesta(Number(br.dataset.borrarResp), Number(br.dataset.pub)); return; }
  const rp = e.target.closest('[data-reportar]'); if (rp) { abrirReportar({ tipo: 'publicacion', objetivo: rp.dataset.reportar, titulo: 'Publicación en la comunidad' }); return; }
  const oc = e.target.closest('[data-ocultar]');
  if (oc) { const id = Number(oc.dataset.ocultar); abrirOcultar({ tipo: 'publicacion', id, titulo: 'Publicación en la comunidad', onListo: () => { S.items = S.items.filter((x) => Number(x.id) !== id); pintar(); } }); }
});
// Eliminar (19-oct-2026): tu publicación (o cualquiera si eres admin) y las respuestas que la base marca con puedo_borrar
// (la tuya, o cualquiera bajo TU publicación, o el admin). Siempre se pregunta antes: no se puede deshacer.
async function borrarPublicacion(id) {
  feedEl.querySelector(`[data-pub="${id}"] .sx-post-menu`)?.removeAttribute('open');
  if (!(await confirmar('¿Eliminar esta publicación? Se borra para todos, con sus respuestas y reacciones. No se puede deshacer.', { titulo: 'Eliminar publicación', aceptar: 'Eliminar', peligro: true }))) return;
  try { await api.borrar(id); } catch (e) { toast(String(e?.message ?? 'No se pudo eliminar.'), 'error'); return; }
  S.items = S.items.filter((x) => Number(x.id) !== id); S.abiertas.delete(id); S.resp.delete(id); pintar(); toast('Publicación eliminada.', 'ok');
}
async function borrarRespuesta(idResp, idPub) {
  if (!(await confirmar('¿Eliminar esta respuesta? No se puede deshacer.', { titulo: 'Eliminar respuesta', aceptar: 'Eliminar', peligro: true }))) return;
  try { await api.borrarRespuesta(idResp); } catch (e) { toast(String(e?.message ?? 'No se pudo eliminar.'), 'error'); return; }
  const lista = (await api.respuestasDe(idPub).catch(() => null)) ?? (S.resp.get(idPub) ?? []).filter((r) => Number(r.id) !== idResp);
  S.resp.set(idPub, lista); S.items = S.items.map((x) => (Number(x.id) === idPub ? { ...x, respuestas: lista.length } : x));
  repintar(idPub); pintarHilo(idPub); toast('Respuesta eliminada.', 'ok');
}
histEl.addEventListener('click', (e) => {
  if (e.target.closest('[data-hist-nueva]')) { if (S.yo) abrirNuevaHistoria({ uid: S.yo, onListo: cargarHistorias }); return; }
  const b = e.target.closest('[data-hist]'); if (b) abrirCirculo(Number(b.dataset.hist));
});
vistasEl.addEventListener('click', (e) => {
  const b = e.target.closest('[data-v]'); if (!b || b.dataset.v === S.vista) return;
  S.vista = vistaValida(b.dataset.v); S.tag = ''; pintarTag(); pintarVistas(); history.replaceState(null, '', urlActual()); reiniciarFeed();
});
filtroEl.addEventListener('click', (e) => {
  const b = e.target.closest('[data-j]'); if (!b) return;
  S.juego = b.dataset.j; S.tag = ''; pintarTag(); pintarFiltro(); history.replaceState(null, '', urlActual()); reiniciarFeed();
});
$('sx-mas')?.addEventListener('click', () => cargar({ mas: true }));
// Scroll infinito: cuando el aviso del final entra en pantalla se pide la siguiente página (el botón «Cargar más» queda como respaldo).
if ('IntersectionObserver' in window) new IntersectionObserver((es) => { if (es.some((x) => x.isIntersecting) && S.hayMas && !S.cargando) cargar({ mas: true }); }, { rootMargin: '600px 0px' }).observe(finEl);

/* ---------- Columnas de foro (19-oct-2026): navegación a la izquierda, la comunidad a la derecha ---------- */
const navFeeds = document.querySelector('[data-sxr-feeds]'); const navJuegos = document.querySelector('[data-sxr-juegos]');
const LETRA = { pes: 'P', sp: 'SP', fifa: 'F', eafc: 'FC', efootball: 'eF' };
// Icono de un juego: su logo (data/muroEstilo.js → LOGOS_JUEGO) sobre la letra; si el logo no carga, se quita y queda la letra.
const icJuegoHTML = (id) => `<span class="sxr-ic sxr-ic-juego${LOGOS_JUEGO[id] ? ' con-logo' : ''}" data-logo="${escapeHTML(id)}">${escapeHTML(LETRA[id] ?? '?')}${LOGOS_JUEGO[id] ? `<img src="${escapeHTML(href(LOGOS_JUEGO[id]))}" alt="" loading="lazy" decoding="async" data-logo-juego>` : ''}</span>`;
document.addEventListener('error', (e) => { const im = e.target; if (im instanceof HTMLImageElement && im.hasAttribute('data-logo-juego')) { im.parentElement?.classList.remove('con-logo'); im.remove(); } }, true);
function pintarNav() {
  const tit = document.querySelector('[data-sxr-titulo]');   // en PC el feed se elige a la izquierda; aquí solo se nombra
  if (tit) tit.innerHTML = S.tag ? `<b>#${escapeHTML(S.tag)}</b> · Etiqueta` : `<b>${escapeHTML(vistaInfo(S.vista).texto)}</b>${S.vista === 'recientes' ? ` · ${escapeHTML(S.juego ? nombreJuego(S.juego) ?? 'Todos los juegos' : 'Todos los juegos')}` : ''}`;
  if (navFeeds) navFeeds.innerHTML = VISTAS.map((v) => `<button type="button" class="sxr-item" data-v="${v.id}" aria-current="${S.vista === v.id && !S.tag ? 'true' : 'false'}"><span class="sxr-ic"><i class="fa-solid ${v.icono}" aria-hidden="true"></i></span><span>${escapeHTML(v.texto)}</span></button>`).join('');
  if (navJuegos) navJuegos.innerHTML = [['', 'Todos los juegos'], ...SEGMENTOS].map(([id, n]) => `<button type="button" class="sxr-item" data-j="${id}" aria-current="${S.vista === 'recientes' && !S.tag && S.juego === id ? 'true' : 'false'}">${id ? icJuegoHTML(id) : '<span class="sxr-ic sxr-ic-juego sxr-ic-todos"><i class="fa-solid fa-gamepad" aria-hidden="true"></i></span>'}<span>${escapeHTML(n)}</span></button>`).join('');
}
const nombreJuego = (id) => SEGMENTOS.find((s) => s[0] === id)?.[1] ?? null;
// Cabecera del muro (19-oct-2026): una frase Phoenix del día y el pulso de la comunidad. Sin «Buenas tardes, nombre» ni los días de racha
// (Fralex: «ponle lo que ya estaba menos lo de buenas DT y los días»).
const FRASES_DIA = ['La cancha está caliente', 'Hoy se juega, hoy se publica', '¿Quién se anima a un reto?', 'Aquí se viene a ganar', 'El balón no descansa', 'Golazos, revanchas y buena onda', 'Que hable el marcador'];
function pintarSaludo() {
  const el = document.querySelector('[data-sxr-saludo]'); if (!el) return;
  if (S.vista === 'recientes' && !S.juego && !S.tag && S.items.length) { const hoy = new Date().toDateString(); const de = S.items.filter((x) => new Date(x.created_at).toDateString() === hoy); S.pulso = { n: de.length, gente: new Set(de.map((x) => x.autor?.id).filter(Boolean)).size }; }
  const deHoy = { length: S.pulso?.n ?? 0 }; const gente = S.pulso?.gente ?? 0;   // el pulso es de toda la comunidad: no cambia al filtrar ni al cambiar de pestaña
  const frase = FRASES_DIA[Math.floor(Date.now() / 864e5) % FRASES_DIA.length];
  const pulso = deHoy.length ? `<span class="sxr-saludo-pulso"><i aria-hidden="true"></i>${deHoy.length} publicaci${deHoy.length === 1 ? 'ón' : 'ones'} hoy · ${gente} jugador${gente === 1 ? '' : 'es'} activo${gente === 1 ? '' : 's'}</span>` : '';
  el.innerHTML = `<p class="sxr-saludo-frase">${escapeHTML(frase)}${S.yo ? '' : ' · Bienvenido a Phoenix Social'}</p>${pulso ? `<div class="sxr-saludo-fila">${pulso}</div>` : ''}`;
  el.hidden = false;
}
function pintarLado() {
  // Auditoría 19-oct: se quitaron las cifras de la tarjeta («historias hoy» contaba personas, y «autores» repetía el pulso del saludo)
  // y «Juegos con más movimiento» (repetía la lista de juegos de la izquierda y con un juego elegido solo mostraba ese).
  const top = document.querySelector('[data-sxr-top]');
  pintarSaludo();
  pintarTendencias();
  if (!top) return;
  const mejores = [...S.items].filter((x) => totalReacciones(x) > 0).sort((a, b) => totalReacciones(b) - totalReacciones(a)).slice(0, 4);
  top.innerHTML = mejores.length ? mejores.map((it) => { const a = it.autor ?? {}; const txt = String(it.texto ?? '').replace(/\s+/g, ' ').trim();
    const n = totalReacciones(it); return `<button type="button" class="sxr-fila" data-sxr-ir="${Number(it.id)}"><span class="sxr-fila-av">${avatarHTML(a.avatar_url, a.nombre_display, 28)}</span><span class="sxr-fila-tx"><b>${escapeHTML(txt ? (txt.length > 70 ? txt.slice(0, 70) + '…' : txt) : 'Publicación con foto o video')}</b><small>${escapeHTML(a.nombre_display || a.username || 'Jugador')} · ${n} reacci${n === 1 ? 'ón' : 'ones'}</small></span></button>`; }).join('')
    : '<p class="sxr-nada">Aún nadie ha reaccionado a lo que hay en el feed.</p>';
}
// Clics de las columnas: cambiar de feed, filtrar por juego, ir a una publicación, crear publicación.
function irAVista(v, juego) {
  const cambia = v !== S.vista || (juego !== undefined && juego !== S.juego) || !!S.tag; if (!cambia) return;
  S.vista = vistaValida(v); if (juego !== undefined) S.juego = juego; S.tag = ''; pintarTag();
  pintarVistas(); pintarFiltro(); history.replaceState(null, '', urlActual()); reiniciarFeed();
}
document.querySelector('.sxr')?.addEventListener('click', (e) => {
  if (e.target.closest('#sx-feed, #sx-vistas, #sx-filtro, #sx-hist, #sx-compositor')) return;   // esas zonas tienen su propio manejador
  const v = e.target.closest('[data-v]'); if (v) { irAVista(v.dataset.v); return; }
  const j = e.target.closest('[data-j]'); if (j) { irAVista('recientes', j.dataset.j); return; }
  const ir = e.target.closest('[data-sxr-ir]');
  if (ir) { e.preventDefault(); const el = feedEl.querySelector(`[data-pub="${Number(ir.dataset.sxrIr)}"]`); if (el) { el.scrollIntoView({ behavior: 'smooth', block: 'center' }); el.classList.add('sxr-resalta'); setTimeout(() => el.classList.remove('sxr-resalta'), 1600); } return; }
  if (e.target.closest('[data-sxr-crear]')) { S.compositor?.abrir?.(); }
});
// Vista «Tarjetas» o «Compacta» (como el selector de vista de los foros); se recuerda en este navegador.
const KEY_MODO = 'pes-social-modo';
function aplicarModo(m) {
  const modo = m === 'compacta' ? 'compacta' : 'tarjeta'; feedEl.dataset.modo = modo;
  document.querySelectorAll('[data-sxr-modo]').forEach((b) => b.setAttribute('aria-pressed', String(b.dataset.sxrModo === modo)));
  try { localStorage.setItem(KEY_MODO, modo); } catch { /* sin almacenamiento: solo no se recuerda */ }
  marcarFiltros();
}
document.querySelectorAll('[data-sxr-modo]').forEach((b) => b.addEventListener('click', () => aplicarModo(b.dataset.sxrModo)));
try { aplicarModo(localStorage.getItem(KEY_MODO)); } catch { aplicarModo('tarjeta'); }

/* ---------- Más vida (19-oct-2026): ordenar, respuestas en el feed, nuevas en vivo, a quién seguir, atajos ---------- */
// Ordenar lo cargado (Nuevos · Más reacciones · Más comentados): no pide nada a la base, solo reordena.
const ordenesEl = document.querySelector('[data-sxr-ordenes]');
function pintarOrdenes() { marcarFiltros(); if (ordenesEl) ordenesEl.innerHTML = ORDENES_SOCIAL.map((o) => `<button type="button" data-sxr-orden="${o.id}" aria-pressed="${S.orden === o.id}" title="Ordenar: ${escapeHTML(o.texto)}"><i class="fa-solid ${o.icono}" aria-hidden="true"></i><span>${escapeHTML(o.texto)}</span></button>`).join(''); }
ordenesEl?.addEventListener('click', (e) => {
  const b = e.target.closest('[data-sxr-orden]'); if (!b || b.dataset.sxrOrden === S.orden) return;
  S.orden = ordenSocial(b.dataset.sxrOrden); pintarOrdenes(); history.replaceState(null, '', urlActual()); pintados = 0; pintar();
});

// Respuestas dentro del feed (como los comentarios de un foro): se abren bajo la publicación, sin ir al perfil.
function pintarHilo(id) {
  const caja = feedEl.querySelector(`[data-hilo="${Number(id)}"]`); if (!caja) return;
  const abierto = S.abiertas.has(Number(id)); caja.hidden = !abierto;
  const enlace = feedEl.querySelector(`[data-pie="${Number(id)}"] a.sx-btn`); if (enlace) enlace.setAttribute('aria-expanded', String(abierto));
  if (!abierto) { caja.innerHTML = ''; return; }
  const lista = S.resp.get(Number(id));
  const filas = lista === undefined ? '<p class="sxr-hilo-nota">Cargando respuestas…</p>'
    : lista.length ? lista.map((r) => `<div class="sxr-resp"><span class="sxr-resp-av">${avatarHTML(r.avatar_url, r.nombre_display, 28)}</span><div class="sxr-resp-cuerpo"><p class="sxr-resp-cab"><a href="${escapeHTML(href('perfil/'))}?u=${encodeURIComponent(r.username ?? '')}">${escapeHTML(r.nombre_display ?? 'Jugador')}</a> <time data-t="${escapeHTML(r.created_at ?? '')}">${tiempoRelativo(r.created_at)}</time></p>${r.texto ? `<p class="sxr-resp-tx">${textoAHTML(r.texto)}</p>` : ''}${r.sticker ? `<div class="sxr-resp-stk">${stickerHTML(r.sticker, { guardable: !!S.yo && r.autor_id !== S.yo })}</div>` : ''}${likeRespHTML(r.id)}${r.puedo_borrar ? `<button type="button" class="sxr-resp-borrar" data-borrar-resp="${Number(r.id)}" data-pub="${Number(id)}" aria-label="Eliminar esta respuesta"><i class="fa-solid fa-trash-can" aria-hidden="true"></i> Eliminar</button>` : ''}</div></div>`).join('')
      : '<p class="sxr-hilo-nota">Aún no hay respuestas. Sé el primero.</p>';
  const form = S.yo ? `<form class="sxr-responder" data-responder="${Number(id)}"><input data-menciones maxlength="600" placeholder="Escribe una respuesta…" aria-label="Escribe una respuesta" autocomplete="off"><button type="button" class="stk-btn" data-sxr-sticker="${Number(id)}" aria-label="Enviar un sticker" title="Stickers"><i class="fa-solid fa-note-sticky" aria-hidden="true"></i></button><button type="submit" aria-label="Enviar respuesta"><i class="fa-solid fa-paper-plane" aria-hidden="true"></i></button></form>`
    : '<button type="button" class="sxr-hilo-nota sxr-hilo-entrar" data-sxr-entrar>Inicia sesión para responder.</button>';
  caja.innerHTML = `<div class="sxr-hilo-lista">${filas}</div>${form}`;
}
// «Me gusta» en respuestas (fase 2): corazón con su número; se alterna al tocarlo.
function likeRespHTML(idResp) {
  const l = S.likesResp.get(Number(idResp)) ?? { n: 0, mio: false };
  return `<button type="button" class="sxr-like${l.mio ? ' is-on' : ''}" data-sxr-like="${Number(idResp)}" aria-pressed="${l.mio}" aria-label="${l.mio ? 'Quitar me gusta' : 'Me gusta'}${l.n ? ` (${l.n})` : ''}"><i class="fa-${l.mio ? 'solid' : 'regular'} fa-heart" aria-hidden="true"></i>${l.n ? `<span>${l.n}</span>` : ''}</button>`;
}
async function cargarLikes(idPost) {
  const lista = S.resp.get(Number(idPost)) ?? []; if (!lista.length) return;
  try { const m = (await api.likesRespuestas(lista.map((r) => r.id))) ?? {}; for (const [k, v] of Object.entries(m)) S.likesResp.set(Number(k), { n: Number(v.n) || 0, mio: !!v.mio }); pintarHilo(idPost); } catch { /* sin «me gusta» se ve igual */ }
}
async function alternarHilo(id) {
  id = Number(id);
  if (S.abiertas.has(id)) { S.abiertas.delete(id); pintarHilo(id); return; }
  S.abiertas.add(id); pintarHilo(id);
  if (!S.resp.has(id)) { try { S.resp.set(id, (await api.respuestasDe(id)) ?? []); } catch { S.resp.set(id, []); toast('No se pudieron cargar las respuestas.', 'error'); } pintarHilo(id); cargarLikes(id); }
  feedEl.querySelector(`[data-hilo="${id}"] input`)?.focus({ preventScroll: true });
}
async function enviarRespuesta(form) {
  const id = Number(form.dataset.responder); const input = form.querySelector('input'); const v = validarRespuesta(input?.value);
  if (!v.ok) { toast(v.error, 'error'); return; }
  const boton = form.querySelector('button'); boton.disabled = true;
  try {
    await api.responder(id, v.texto);
    S.resp.set(id, (await api.respuestasDe(id).catch(() => S.resp.get(id))) ?? []);
    S.items = S.items.map((x) => (Number(x.id) === id ? { ...x, respuestas: (S.resp.get(id) ?? []).length } : x));
    repintar(id); pintarHilo(id); cargarLikes(id); toast('Respuesta publicada.', 'ok'); window.dispatchEvent(new Event('social:actividad'));
  } catch (e) { toast(String(e?.message ?? 'No se pudo responder.'), 'error'); boton.disabled = false; }
}
async function enviarSticker(id, sticker) {
  try {
    await api.responder(id, '', sticker);
    if (!S.abiertas.has(id)) S.abiertas.add(id);
    S.resp.set(id, (await api.respuestasDe(id).catch(() => S.resp.get(id))) ?? []);
    S.items = S.items.map((x) => (Number(x.id) === id ? { ...x, respuestas: (S.resp.get(id) ?? []).length } : x));
    repintar(id); pintarHilo(id); cargarLikes(id); window.dispatchEvent(new Event('social:actividad'));
  } catch (e) { toast(String(e?.message ?? 'No se pudo enviar el sticker.'), 'error'); }
}
// Estos clics se atienden ANTES que el manejador general del feed (fase de captura).
feedEl.addEventListener('click', (e) => {
  const enlace = e.target.closest('[data-pie] a.sx-btn'); if (enlace && !e.ctrlKey && !e.metaKey) { e.preventDefault(); e.stopPropagation(); alternarHilo(enlace.closest('[data-pie]').dataset.pie); return; }
  const mas = e.target.closest('[data-leer-mas]');
  if (mas) { e.stopPropagation(); const cuerpo = mas.parentElement.querySelector('.sx-post-cuerpo'); const abierto = cuerpo.dataset.largo === 'abierto'; cuerpo.dataset.largo = abierto ? '1' : 'abierto'; mas.setAttribute('aria-expanded', String(!abierto)); mas.textContent = abierto ? 'Leer más' : 'Leer menos'; return; }
  const stk = e.target.closest('[data-sxr-sticker]');   // stickers (migración 137): se envían solos, como en WhatsApp; lo escrito queda en la caja
  if (stk) { e.stopPropagation(); if (!S.yo) { openAuthModal('login'); return; } abrirSelectorStickers({ ancla: stk, uid: S.yo, alElegir: (v) => enviarSticker(Number(stk.dataset.sxrSticker), v) }); return; }
  if (e.target.closest('[data-sxr-entrar]')) { e.stopPropagation(); openAuthModal('login'); return; }
  if (e.target.closest('[data-sxr-crear]')) { e.stopPropagation(); S.compositor?.abrir?.(); }
}, true);
feedEl.addEventListener('submit', (e) => { const form = e.target.closest('[data-responder]'); if (form) { e.preventDefault(); enviarRespuesta(form); } });

// Publicaciones nuevas en vivo: cada minuto (con la pestaña visible y en «Recientes») se mira si hay algo más nuevo; si lo hay, aparece el aviso.
const nuevasEl = document.querySelector('[data-sxr-nuevas]');
async function mirarNuevas() {
  if (document.visibilityState !== 'visible' || S.vista !== 'recientes' || S.tag || S.cargando || !S.items.length || !nuevasEl) return;
  try {
    const m = await api.comunidad(S.juego || null, null, 20);
    const n = contarNuevas(m?.items ?? [], S.items.map((x) => x.id));
    nuevasEl.hidden = !n; if (n) nuevasEl.querySelector('span').textContent = `${n} publicaci${n === 1 ? 'ón nueva' : 'ones nuevas'}`;
  } catch { /* sin red: se vuelve a mirar en el siguiente minuto */ }
}
setInterval(mirarNuevas, 60000);
nuevasEl?.addEventListener('click', () => refrescar());

// «hace 2 min» se mantiene al día sin repintar (los videos no se reinician).
setInterval(() => { for (const el of document.querySelectorAll('.sxr [data-t]')) { const v = tiempoRelativo(el.dataset.t); if (el.textContent !== v) el.textContent = v; } }, 60000);

// A quién seguir (columna derecha): sugerencias de la base; «Seguir» y «Descartar» actúan al momento.
const seguirCaja = document.querySelector('[data-sxr-seguir-caja]'); const seguirEl = document.querySelector('[data-sxr-seguir]');
async function cargarSugerencias() {
  if (!seguirCaja) return;
  if (!S.yo) { seguirCaja.hidden = true; return; }
  let lista = []; try { lista = await socialApi.sugerencias(5); } catch { lista = []; }
  seguirCaja.hidden = !lista.length;
  seguirEl.innerHTML = lista.map((p) => `<div class="sxr-fila sxr-sug" data-sug="${escapeHTML(p.id)}"><a class="sxr-fila-av" href="${escapeHTML(href('perfil/'))}?u=${encodeURIComponent(p.username)}" tabindex="-1">${avatarHTML(p.avatar, p.nombre, 28)}</a><a class="sxr-fila-tx" href="${escapeHTML(href('perfil/'))}?u=${encodeURIComponent(p.username)}"><b>${escapeHTML(p.nombre)}</b><small>${escapeHTML(p.motivo || (p.club ? `Hincha de ${p.club}` : `@${p.username}`))}</small></a><button type="button" class="sxr-seguir" data-seguir="${escapeHTML(p.id)}">Seguir</button><button type="button" class="sxr-descartar" data-descartar="${escapeHTML(p.username)}" aria-label="No me interesa ${escapeHTML(p.nombre)}" title="No me interesa"><i class="fa-solid fa-xmark" aria-hidden="true"></i></button></div>`).join('');
}
seguirEl?.addEventListener('click', async (e) => {
  const s = e.target.closest('[data-seguir]'); const d = e.target.closest('[data-descartar]');
  if (s && !s.disabled) { s.disabled = true; try { await amigosApi.seguir(s.dataset.seguir); s.innerHTML = '<i class="fa-solid fa-check" aria-hidden="true"></i> Siguiendo'; s.classList.add('is-on'); rafaga(s, ['💜', '✨'], { n: 6 }); } catch (err) { s.disabled = false; toast(String(err?.message ?? 'No se pudo seguir.'), 'error'); } }
  if (d) { const fila = d.closest('[data-sug]'); fila.classList.add('sxr-sale'); try { await socialApi.descartarSugerencia(d.dataset.descartar); } catch { /* si falla, solo vuelve a salir la próxima vez */ } setTimeout(() => { fila.remove(); if (!seguirEl.children.length) seguirCaja.hidden = true; }, 250); }
});

// Atajos de teclado como en los foros: J/K moverse, R reaccionar, C respuestas, N crear publicación.
const posts = () => [...feedEl.querySelectorAll('.sx-post')];
function enfocar(el) { if (!el) return; posts().forEach((p) => p.classList.toggle('sxr-foco', p === el)); S.foco = Number(el.dataset.pub); el.scrollIntoView({ behavior: 'smooth', block: 'center' }); }
document.addEventListener('keydown', (e) => {
  if (e.ctrlKey || e.metaKey || e.altKey || e.target.closest('input, textarea, select, [contenteditable="true"], [role="dialog"]') || document.querySelector('dialog[open]')) return;
  const k = e.key.toLowerCase(); const lista = posts(); const i = lista.findIndex((p) => Number(p.dataset.pub) === S.foco);
  if (k === 'j') { e.preventDefault(); enfocar(lista[Math.min(lista.length - 1, i + 1)]); }
  else if (k === 'k') { e.preventDefault(); enfocar(lista[Math.max(0, i - 1)]); }
  else if (k === 'r' && S.foco) { e.preventDefault(); feedEl.querySelector(`[data-pie="${S.foco}"] [data-sx="reaccionar"]`)?.click(); }
  else if (k === 'c' && S.foco) { e.preventDefault(); alternarHilo(S.foco); }
  else if (k === 'n' && S.yo) { e.preventDefault(); S.compositor?.abrir?.(); }
});

// RECARGAR (19-oct-2026, Fralex: «un botón de recargar sutil tanto para recargar las publicaciones y también para subir hasta arriba rápidamente»):
// el ↻ de la barra pegada, el del final del feed y el botón flotante (aparece al bajar un poco) hacen lo mismo: suben arriba y traen lo nuevo.
// Mientras carga, el icono gira; al terminar se pone verde un momento.
const arribaEl = document.querySelector('[data-sxr-arriba]'); let arribaPend = false; let refrescando = false;
window.addEventListener('scroll', () => { if (arribaPend) return; arribaPend = true; requestAnimationFrame(() => { arribaPend = false; if (arribaEl) arribaEl.hidden = window.scrollY < 500; }); }, { passive: true });
const esperar = (ms) => new Promise((r) => setTimeout(r, ms));
async function refrescar() {
  if (refrescando) return; refrescando = true;
  const botones = () => document.querySelectorAll('[data-sxr-recargar], [data-sxr-arriba]');
  botones().forEach((b) => { b.classList.remove('is-listo'); b.classList.add('is-girando'); });
  if (nuevasEl) nuevasEl.hidden = true;
  window.scrollTo({ top: 0, behavior: matchMedia('(prefers-reduced-motion: reduce)').matches ? 'auto' : 'smooth' });
  const t0 = performance.now(); reiniciarFeed(); cargarHistorias().catch(() => {});
  while (S.cargando && performance.now() - t0 < 10000) await esperar(120);
  await esperar(Math.max(0, 550 - (performance.now() - t0)));   // un giro mínimo: que se note que pasó algo
  botones().forEach((b) => { b.classList.remove('is-girando'); b.classList.add('is-listo'); });
  setTimeout(() => botones().forEach((b) => b.classList.remove('is-listo')), 1100);
  refrescando = false;
}
arribaEl?.addEventListener('click', refrescar);
document.addEventListener('click', (e) => { if (e.target.closest('[data-sxr-recargar]')) refrescar(); });
pintarOrdenes();

// «Ordenar y filtrar» (19-oct-2026): orden, juego y vista viven en un panel que se abre con un botón; se cierra al tocar fuera o con Esc.
const filtrosBtn = document.querySelector('[data-sxr-filtros]'); const popEl = $('sx-pop');
function abrirFiltros(abrir) { if (!popEl || !filtrosBtn) return; popEl.hidden = !abrir; filtrosBtn.setAttribute('aria-expanded', String(abrir)); }
filtrosBtn?.addEventListener('click', (e) => { e.stopPropagation(); abrirFiltros(popEl.hidden); });
document.addEventListener('click', (e) => { if (popEl && !popEl.hidden && !e.composedPath().some((n) => n === popEl || n === filtrosBtn)) abrirFiltros(false); });   // por el recorrido del clic: elegir un juego repinta los botones y antes el panel se cerraba solo
document.addEventListener('keydown', (e) => { if (e.key === 'Escape' && popEl && !popEl.hidden) { abrirFiltros(false); filtrosBtn?.focus(); } });
window.addEventListener('resize', () => requestAnimationFrame(moverPastilla), { passive: true });

/* ---------- Red social completa, fase 1 (19-oct-2026, Fralex: «métele todo lo que tiene una red social… dopamínica, dinámica, inmersiva») ---------- */
// #Etiquetas: tocar una abre el feed de esa etiqueta (sin recargar la página); arriba aparece su cabecera con «Quitar».
const tagEl = document.createElement('div'); tagEl.className = 'sxr-tag'; tagEl.hidden = true; feedEl.before(tagEl);
function pintarTag() {
  tagEl.hidden = !S.tag;
  tagEl.innerHTML = S.tag ? `<span class="sxr-tag-ic" aria-hidden="true">#</span><div><b>#${escapeHTML(S.tag)}</b><small>Publicaciones con esta etiqueta</small></div><button type="button" data-sxr-sin-tag>Quitar <i class="fa-solid fa-xmark" aria-hidden="true"></i></button>` : '';
}
function irATag(tag) {
  S.tag = tagValido(tag); if (S.tag && S.vista !== 'recientes') S.vista = 'recientes';
  pintarTag(); pintarVistas(); history.replaceState(null, '', urlActual()); window.scrollTo({ top: 0, behavior: 'smooth' }); reiniciarFeed();
}
tagEl.addEventListener('click', (e) => { if (e.target.closest('[data-sxr-sin-tag]')) irATag(''); });
document.querySelector('.sxr')?.addEventListener('click', (e) => {
  const t = e.target.closest('a.tx-tag, [data-sxr-tag]'); if (!t || e.ctrlKey || e.metaKey) return;
  e.preventDefault(); e.stopPropagation(); irATag(t.dataset.tag ?? t.dataset.sxrTag);
}, true);
// Tendencias: las etiquetas más usadas en lo cargado (columna derecha en PC; fila de cápsulas bajo la barra en el celular).
const tendMovil = document.createElement('div'); tendMovil.className = 'sxr-tend-movil'; tendMovil.hidden = true; document.querySelector('.sxr-orden')?.after(tendMovil);
function pintarTendencias() {
  const cuenta = new Map(); const forma = new Map();   // se cuenta sin mayúsculas, se muestra como la escribió la primera persona
  for (const it of S.items) for (const t of etiquetasDe(it.texto)) { const k = t.toLowerCase(); if (!forma.has(k)) forma.set(k, t); cuenta.set(k, (cuenta.get(k) || 0) + 1); }
  const top = [...cuenta].sort((a, b) => b[1] - a[1]).slice(0, 6).map(([k, n]) => [forma.get(k), n]);
  const caja = document.querySelector('[data-sxr-tend]'); const lista = document.querySelector('[data-sxr-tend-lista]');
  if (caja && lista) { caja.hidden = !top.length; lista.innerHTML = top.map(([t, n], i) => `<button type="button" class="sxr-fila sxr-tend" data-sxr-tag="${escapeHTML(t)}"><span class="sxr-tend-n">${i + 1}</span><span class="sxr-fila-tx"><b>#${escapeHTML(t)}</b><small>${n} publicaci${n === 1 ? 'ón' : 'ones'}</small></span>${i === 0 ? '<i class="fa-solid fa-fire sxr-tend-fuego" aria-hidden="true"></i>' : ''}</button>`).join(''); }
  tendMovil.hidden = !top.length || !!S.tag;
  tendMovil.innerHTML = top.length ? `<span class="sxr-tend-t"><i class="fa-solid fa-arrow-trend-up" aria-hidden="true"></i> Tendencias</span>${top.map(([t]) => `<button type="button" data-sxr-tag="${escapeHTML(t)}">#${escapeHTML(t)}</button>`).join('')}` : '';
}
// Gestos: visor de fotos, doble toque = 🔥 (si ya reaccionaste no lo quita: solo celebra) y tirar hacia abajo para recargar.
// Visor de fotos con dos estilos (Instagram / Facebook, botón para cambiar). Reaccionar y responder desde el visor actualizan el feed.
montarVisorFotos(feedEl, {
  datos: (id) => S.items.find((x) => Number(x.id) === Number(id)) ?? null,
  respuestas: (id) => api.respuestasDe(id),
  responder: (id, texto) => api.responder(id, texto),
  reaccionar: async (id) => { const it = S.items.find((x) => Number(x.id) === Number(id)); await reaccionar(id, it?.mia || REACCION_RAPIDA); },
  yo: () => S.yo,
  alCambiar: async (id) => {
    S.resp.set(id, (await api.respuestasDe(id).catch(() => S.resp.get(id))) ?? []);
    S.items = S.items.map((x) => (Number(x.id) === id ? { ...x, respuestas: (S.resp.get(id) ?? []).length } : x));
    repintar(id); pintarHilo(id); window.dispatchEvent(new Event('social:actividad'));
  },
});
montarDobleToque(feedEl, (id) => { const it = S.items.find((x) => Number(x.id) === id); if (!it?.mia) reaccionar(id, REACCION_RAPIDA); });
montarTirarParaRecargar(document.querySelector('.sxr-centro') ?? feedEl, () => refrescar());
// Jugadas como los Reels de Instagram (19-oct-2026): el botón de la barra o deslizar hacia la izquierda en cualquier parte del muro
montarDeslizarA(document.querySelector('.sxr-centro') ?? document.body, { lado: 'izq', url: href('jugadas/'), etiqueta: 'Jugadas' });
document.querySelector('[data-sxr-reels]')?.addEventListener('click', () => marcarDesliza('izq'));
// Mantener pulsado «Reaccionar» medio segundo abre las reacciones Phoenix (como en Facebook).
{
  let t = 0; let abrio = false;
  const abrir = (b) => { const id = Number(b.dataset.id); if (S.paleta === id) return; const antes = S.paleta; S.paleta = id; if (antes) repintar(antes); repintar(id); abrio = true; try { navigator.vibrate?.(10); } catch { /* sin vibración */ } };
  feedEl.addEventListener('pointerdown', (e) => { const b = e.target.closest('[data-sx="reaccionar"]'); if (!b) return; abrio = false; clearTimeout(t); t = setTimeout(() => abrir(b), 450); });
  ['pointerup', 'pointercancel', 'pointerleave'].forEach((ev) => feedEl.addEventListener(ev, () => clearTimeout(t), true));
  feedEl.addEventListener('click', (e) => { if (abrio && e.target.closest('[data-sx="reaccionar"]')) { e.stopPropagation(); e.preventDefault(); abrio = false; } }, true);
  feedEl.addEventListener('contextmenu', (e) => { if (e.target.closest('[data-sx="reaccionar"]')) e.preventDefault(); });
}

/* ---------- Social, fase 2 (19-oct-2026; migraciones 135 y 135b) ---------- */
// «Me gusta» en una respuesta
feedEl.addEventListener('click', async (e) => {
  const b = e.target.closest('[data-sxr-like]'); if (!b) return;
  e.stopPropagation();
  if (!S.yo) { toast('Inicia sesión para dar «me gusta».', 'info'); openAuthModal('login'); return; }
  const idResp = Number(b.dataset.sxrLike); b.disabled = true;
  try { const r = await api.likeRespuesta(idResp); S.likesResp.set(idResp, { n: Number(r?.total) || 0, mio: !!r?.mio }); if (r?.mio) { salto(b.querySelector('i')); rafaga(b, ['❤️'], { n: 5 }); } }
  catch (err) { toast(String(err?.message ?? 'No se pudo.'), 'error'); }
  const post = b.closest('[data-hilo]')?.dataset.hilo; if (post) pintarHilo(post);
}, true);
// Tarjeta rápida al tocar la cara o el nombre (Ctrl/⌘ + clic sigue abriendo el perfil)
feedEl.addEventListener('click', (e) => {
  const a = e.target.closest('a.sx-post-av, a.sx-post-autor, .sxr-resp-cab a'); if (!a || e.ctrlKey || e.metaKey) return;
  const u = new URL(a.href, location.href).searchParams.get('u'); if (!u) return;
  e.preventDefault(); e.stopPropagation(); abrirTarjetaPerfil({ username: u, ancla: a, yo: S.yo });
}, true);
// Vistas: cuenta una por persona cuando la publicación se ve 1 segundo
vigilarVistas(feedEl, { conSesion: () => !!S.yo });
// Racha de actividad: 🔥 N días seguidos (en la barra de arriba); se pone al día al reaccionar, responder o publicar
const rachaEl = document.createElement('span'); rachaEl.className = 'sxr-racha'; rachaEl.hidden = true;   // ya no se muestra (Fralex: «menos… los días»); se deja el cálculo por si vuelve
async function pintarRacha() {
  if (!S.yo) { rachaEl.hidden = true; return; }
  let r = null; try { r = await api.rachaSocial(); } catch { r = null; }
  const n = Number(r?.dias) || 0; const antes = Number(rachaEl.dataset.n) || 0;
  rachaEl.hidden = n < 1; rachaEl.dataset.n = String(n); rachaEl.dataset.hoy = String(!!r?.hoy);  rachaEl.title = r?.hoy ? `${n} día${n === 1 ? '' : 's'} seguidos con actividad en Social` : `Racha de ${n} día${n === 1 ? '' : 's'}: reacciona, responde o publica hoy para no perderla`;
  rachaEl.innerHTML = `<span aria-hidden="true">🔥</span><b>${n}</b><small>${r?.hoy ? 'días' : '¡hoy!'}</small>`;
  if (n > antes && antes > 0) { rachaEl.classList.remove('sxr-racha-sube'); void rachaEl.offsetWidth; rachaEl.classList.add('sxr-racha-sube'); }
}
window.addEventListener('social:actividad', () => setTimeout(pintarRacha, 600));

/* ---------- Arranque ---------- */
initMencionAuto();
pintarVistas(); pintarFiltro(); pintarTag(); feedEl.innerHTML = cargandoHTML; cargar(); cargarHistorias();
onSession(({ session, profile }) => {
  const id = session?.user?.id ?? null; const cambio = id !== S.yo; S.yo = id; S.perfil = profile ?? getState().profile ?? null;
  if (cambio || !S.compositor) {   // solo se monta de nuevo si cambió la persona: un refresco de sesión no debe borrar lo que está escribiendo
    S.compositor?.destruir(); S.compositor = montarCompositor(compEl, { yo: S.yo, perfil: S.perfil, onLogin: () => openAuthModal('login'), onHistoria: () => abrirNuevaHistoria({ uid: S.yo, onListo: cargarHistorias }), onPublicado: () => { if (S.vista !== 'recientes') { S.vista = 'recientes'; pintarVistas(); history.replaceState(null, '', urlActual()); } reiniciarFeed(); rafaga(compEl, ['🔥', '✨', '⚽', '🏆'], { n: 14 }); window.dispatchEvent(new Event('social:actividad')); } });
  }
  const espacio = document.querySelector('[data-sxr-espacio]'); if (espacio) espacio.hidden = !S.yo;   // «Tu espacio» solo con sesión
  if (!cambio) return;
  cargarSugerencias(); cargarHistorias(); pintarRacha(); if (vistaInfo(S.vista).requiereSesion || S.items.length) reiniciarFeed();
});

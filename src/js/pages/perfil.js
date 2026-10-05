// Página /perfil/?u=<usuario>: perfil público + MURO de un jugador (sin ?u= abre el tuyo).
// Esquema: pages (este archivo, pinta y reparte eventos) → features/muro/api (RPC, migración 021) → core/muro (lógica pura) + data/muroEstilo.
import { onSession, isAdmin, refreshProfile, can } from '../core/session.js';
import { botonGuardarHTML, alternar as alternarGuardado, cargarEstado as cargarGuardados } from '../features/social/guardados.js';
import { initMencionAuto } from '../features/social/mencionAuto.js';
import { supabase } from '../core/supabase.js';
import { openModal, closeModal } from '../core/modal.js';
import { avatarPickerHTML, bindAvatarPicker, resolveAvatar } from '../features/avatarPicker.js';
import { HOST_JUEGOS, HOST_MAX_TEXTO, limpiarOpcion, catalogoDe, alternarJuego, alternarOpcion, lineasHost } from '../core/hostCatalogo.js';
import { toast } from '../core/toast.js';
import { escapeHTML, safeUrl, safeImg } from '../core/dom.js';
import { href, siteHome } from '../core/config.js';
import { avatarHTML } from '../core/avatar.js';
import { analizarVideo, segmentoParaGuardar, urlCompartir, destinoDeHash, etiquetaOpcionReto, validarTexto, validarRespuesta, resumenReacciones, aplicarReaccion, textoAHTML, tiempoRelativo, estiloDe, estiloParaGuardar, usuarioDeURL } from '../core/muro.js';
import { BANNERS, ACENTOS, MURO_MAX, LEMA_MAX, MURO_VER, MURO_RESPONDER, RESP_MAX, REACCIONES, PALETA_EMOJIS, SEGMENTOS } from '../../data/muroEstilo.js';
import * as api from '../features/muro/api.js';
import { logrosDe } from '../features/logros/api.js';
import { nivelDe } from '../core/logros.js';
import { contenidoHTML, reproductorYT, segmentoChipHTML } from '../features/muro/render.js';
import * as amigosApi from '../features/amigos/api.js';
import { relacion, accionesSociales } from '../core/red.js';
import { normalizarHistorias, validarClip, infoClip, hayNuevas, marcarVistas, indiceInicial, CLIP_TITULO_MAX } from '../core/historias.js';
import { abrirHistorias, abrirClips } from '../features/muro/visor.js';
import { abrirNuevaHistoria, abrirDestacadas } from '../features/muro/historiasUI.js';
import { prepararVideo } from '../features/muro/media.js';
import { compartir } from '../features/muro/compartir.js';
import { abrirReportar, abrirOcultar, abrirSancionar } from '../features/moderacion/acciones.js';
import { VIDEO_MAX_MB, VIDEO_MAX_SEG } from '../core/videoSubida.js';

initMencionAuto();
const root = document.getElementById('muro-root');
const S = { host: null, sesion: null, usuario: '', p: null, items: [], hayMas: false, visible: true, cargando: false, editando: null, abiertas: new Set(), resp: new Map(),
  red: null, hist: null, paleta: null, juego: '', juegos: [], clipJuegos: [], vfile: null, cfile: null, clips: [], hayMasClips: false, tab: 'pub', vistas: {} };   // hist = null → la migración 025 aún no está aplicada: la web oculta historias y clips en vez de romperse

/* «Ya vista» de las historias: solo en este navegador. */
const KEY_VISTAS = 'pes-historias-vistas';
function leerVistas() { try { const o = JSON.parse(localStorage.getItem(KEY_VISTAS) ?? '{}'); return o && typeof o === 'object' ? o : {}; } catch { return {}; } }
function guardarVistas(ids) { S.vistas = marcarVistas(S.vistas, ids); try { localStorage.setItem(KEY_VISTAS, JSON.stringify(S.vistas)); } catch { /* sin almacenamiento: solo se pierde el «ya vista» */ } }

const msgErr = (e) => String(e?.message ?? e ?? 'Algo salió mal.').replace(/^.*?:\s*/, (m) => (m.length > 40 ? '' : m));
async function seguro(fn, ok) {
  try { const r = await fn(); if (ok) toast(ok, 'ok'); return r; } catch (e) { toast(msgErr(e), 'error'); return undefined; }
}

/* ---------- Pintado ---------- */
const urlCarta = (p) => `${href('jugador/')}?id=${encodeURIComponent(p.ficha_id)}`;
/** «Ver carta» (si su cuenta está vinculada a una ficha) y «Retar a duelo» (si no soy yo; exige sesión para enviarse). */
function botonesCartaReto(p, conReto = true) {
  const carta = p.ficha_id ? `<a href="${escapeHTML(urlCarta(p))}" class="btn btn-ghost !min-h-9 !px-3 !text-[11px] !text-amber-300 !border-amber-400/50"><i class="fa-solid fa-id-card"></i><span>${p.soy_yo ? 'Ver mi carta' : 'Ver su carta'}</span></a>` : '';
  const reto = conReto && !p.soy_yo ? `<a href="${escapeHTML(href('duelos/'))}?retar=${escapeHTML(p.id)}" class="btn btn-primary !min-h-9 !px-3 !text-[11px]"><i class="fa-solid fa-gamepad"></i><span>Retar a duelo</span></a>` : '';
  return carta + reto;
}
const vigentes = () => S.hist?.historias ?? [];
/** Avatar del perfil: con anillo de color si hay historias vigentes (acento si hay nuevas, gris si ya las viste); al tocarlo se abren. */
function avatarConAnillo(p, acento) {
  const base = `w-20 h-20 sm:w-24 sm:h-24 rounded-full overflow-hidden flex items-center justify-center bg-galaxy-card border-4 border-galaxy-panel shrink-0`;
  const cam = p.soy_yo ? `<button type="button" data-act="cambiar-foto" aria-label="Cambiar foto de perfil" title="Cambiar foto de perfil" class="absolute -bottom-0.5 -right-0.5 z-10 w-8 h-8 rounded-full bg-galaxy-600 hover:bg-galaxy-400 border-2 border-galaxy-panel text-white text-xs grid place-items-center"><i class="fa-solid fa-camera"></i></button>` : '';
  const envolver = (x) => `<span class="relative shrink-0">${x}${cam}</span>`;
  if (!vigentes().length || !S.visible) return envolver(`<span class="${base}" style="box-shadow:0 0 0 2px ${acento}">${avatarHTML(p.avatar_url, p.nombre_display, 96)}</span>`);
  const nuevo = hayNuevas(vigentes(), S.vistas);
  return envolver(`<button type="button" data-act="ver-historias" aria-label="Ver historias de ${escapeHTML(p.nombre_display)}" class="${base} cursor-pointer" style="box-shadow:0 0 0 3px ${nuevo ? acento : '#6b7280'}">${avatarHTML(p.avatar_url, p.nombre_display, 96)}</button>`);
}

/* ---------- Relación social con ESTA persona (amigos, solicitudes, seguir) ---------- */
/** Rol de otra cuenta (la lectura de perfiles es pública). Solo informa en el modal: el rango que cuenta lo decide la BD. */
async function rolDe(id) { try { const { data } = await supabase.from('perfiles').select('rol').eq('id', id).maybeSingle(); return data?.rol ?? 'jugador'; } catch { return 'jugador'; } }
const BTN_SOC = 'btn btn-ghost !min-h-9 !px-3 !text-[11px]';
const yoId = () => S.sesion?.user?.id ?? null;
const relacionCon = (p) => (S.red ? relacion(S.red, p.id, yoId()) : null);
function botonSocial(act, icono, texto, extra = '', etiqueta = '') {
  return `<button type="button" data-act="${act}" ${etiqueta ? `aria-label="${etiqueta}" title="${etiqueta}"` : ''} class="${BTN_SOC} ${extra}"><i class="fa-solid ${icono}"></i>${texto ? `<span>${texto}</span>` : ''}</button>`;
}
/** Botones de amistad/mensaje según MI relación con la persona (lógica en core/red.accionesSociales). Sin la red cargada: Mensaje + Agregar, como antes. */
/** Reportar esta cuenta (cualquiera con sesión) y, si el rol lo permite, sancionarla (la BD exige además rango mayor). */
const botonesModeracion = (p) => `<button type="button" data-act="reportar" data-tipo="usuario" data-id="${escapeHTML(p.id)}" data-titulo="${escapeHTML(p.nombre_display || p.username)}" class="${BTN_SOC}" aria-label="Reportar cuenta" title="Reportar cuenta"><i class="fa-regular fa-flag"></i></button>${can('sancionar') ? `<button type="button" data-act="mod-sancionar" class="${BTN_SOC} !text-amber-300 !border-amber-400/50" title="Sancionar (moderación)"><i class="fa-solid fa-gavel"></i><span>Sancionar</span></button>` : ''}`;
function botonesSociales(p) {
  const msg = `<a href="${escapeHTML(href('mensajes/'))}?con=${escapeHTML(p.id)}" class="${BTN_SOC} !text-galaxy-400 !border-galaxy-400/50"><i class="fa-solid fa-comment-dots"></i><span>Mensaje</span></a>`;
  if (!S.red) return msg + botonSocial('solicitar', 'fa-user-plus', 'Agregar amigo');
  const rel = relacionCon(p); const sigo = S.red.siguiendo.includes(p.id);
  const MAPA = {
    mensaje: msg,
    solicitar: botonSocial('solicitar', 'fa-user-plus', 'Agregar amigo', '!text-galaxy-400 !border-galaxy-400/50'),
    cancelar: botonSocial('cancelar-solicitud', 'fa-clock', 'Solicitud enviada · cancelar'),
    aceptar: botonSocial('aceptar-amistad', 'fa-check', 'Aceptar solicitud', '!text-ok !border-ok/50'),
    rechazar: botonSocial('rechazar-amistad', 'fa-xmark', 'Rechazar'),
    amigos: '<span class="inline-flex items-center gap-1.5 text-[11px] text-ok border border-ok/40 rounded-lg px-2.5 min-h-9"><i class="fa-solid fa-user-check"></i>Amigos</span>',
    seguir: botonSocial('seguir', 'fa-heart', 'Seguir'), dejar: botonSocial('dejar-seguir', 'fa-check', 'Siguiendo'),
    bloquear: botonSocial('bloquear', 'fa-ban', '', '!text-bad !border-bad/50', 'Bloquear a esta persona'),
    desbloquear: botonSocial('desbloquear', 'fa-lock-open', 'Desbloquear'),
  };
  return accionesSociales(rel, sigo).map((k) => MAPA[k] ?? '').join('');
}
/** Tarjeta de «muro privado»: explica por qué no se ve y ofrece el siguiente paso según la relación (antes solo mostraba un candado). */
function candadoMuro(p) {
  const rel = relacionCon(p);
  const paso = !S.sesion ? 'Inicia sesión y envíale una solicitud de amistad para poder ver su muro.'
    : rel === 'enviada' ? 'Tu solicitud de amistad está pendiente: cuando la acepte podrás ver su muro.'
    : rel === 'recibida' ? 'Esta persona te envió una solicitud: acéptala para ver su muro.'
    : rel === 'ninguna' || rel === null ? 'Envíale una solicitud de amistad; cuando la acepte podrás ver su muro.' : '';
  const boton = !S.sesion ? '' : rel === 'recibida' ? botonSocial('aceptar-amistad', 'fa-check', 'Aceptar solicitud', '!text-ok !border-ok/50')
    : (rel === 'ninguna' || rel === null) ? botonSocial('solicitar', 'fa-user-plus', 'Agregar amigo', '!text-galaxy-400 !border-galaxy-400/50') : '';
  return `<div class="glass-panel rounded-2xl p-8 text-center text-gray-400 text-sm space-y-3"><i class="fa-solid fa-lock text-2xl text-gray-500 block"></i>
    <p>Este jugador comparte su muro solo con sus amigos.</p><p class="text-xs text-gray-500">${paso}</p>${boton ? `<div class="flex justify-center">${boton}</div>` : ''}</div>`;
}

function cabecera(p) {
  const { banner, acento, lema, foto } = estiloDe(p);
  const fondo = safeImg(foto) ? `url(&quot;${escapeHTML(safeImg(foto))}&quot;) center/cover no-repeat` : banner.css;
  const chips = [
    p.club_favorito && ['fa-shield-halved', p.club_favorito], p.posicion_preferida && ['fa-location-crosshairs', p.posicion_preferida],
    p.pais_codigo && ['fa-flag', p.pais_codigo], `${p.partidos_jugados ?? 0}` !== '' && ['fa-gamepad', `${p.partidos_jugados ?? 0} partidos`],
    p.rango_fairplay && ['fa-handshake', p.rango_fairplay],
  ].filter(Boolean).map(([i, t]) => `<span class="inline-flex items-center gap-1.5 text-[11px] text-gray-300 bg-black/30 border border-galaxy-border/70 rounded-full px-2.5 py-1"><i class="fa-solid ${i}" style="color:${acento}"></i>${escapeHTML(t)}</span>`).join('');
  const lineas = p.puede_hostear ? lineasHost(catalogoDe(p)) : [];
  const detalleHost = lineas.length ? lineas.map((l) => `<b class="text-white">${escapeHTML(l.juego)}</b>${l.detalle ? ` <span class="text-gray-400">(${escapeHTML(l.detalle)})</span>` : ''}`).join(' · ') : '<b class="text-white">PES 2021</b>';
  const host = p.puede_hostear ? `<p class="text-xs text-gray-300"><i class="fa-solid fa-server mr-1.5" style="color:${acento}"></i>Hostea ${detalleHost} · ${escapeHTML(p.software_host || 'Parsec')}${p.soy_yo && p.host_visible === false ? ' <em class="text-amber-300 not-italic">· oculto para los demás</em>' : ''}</p>` : '';
  const stream = safeUrl(p.stream_url) ? `<a href="${escapeHTML(safeUrl(p.stream_url))}" target="_blank" rel="noopener noreferrer" class="text-xs text-galaxy-400 underline"><i class="fa-solid fa-tower-broadcast mr-1"></i>Ver su canal</a>` : '';
  const acciones = p.soy_yo
    ? `${botonesCartaReto(p)}<button type="button" data-act="panel" data-panel="estilo" class="btn btn-ghost !min-h-9 !px-3 !text-[11px]"><i class="fa-solid fa-palette"></i><span>Estilo</span></button>
       <button type="button" data-act="panel" data-panel="host" class="btn btn-ghost !min-h-9 !px-3 !text-[11px]"><i class="fa-solid fa-server"></i><span>Hosting</span></button>
       <button type="button" data-act="panel" data-panel="privacidad" class="btn btn-ghost !min-h-9 !px-3 !text-[11px]"><i class="fa-solid fa-shield-halved"></i><span>Privacidad</span></button>`
    : (S.sesion ? `${botonesCartaReto(p)}${botonesSociales(p)}${botonesModeracion(p)}`
      : `${botonesCartaReto(p)}<span class="text-[11px] text-gray-400"><i class="fa-solid fa-circle-info mr-1"></i>Inicia sesión (botón «Entrar», arriba) para escribirle, agregarlo o retarlo.</span>`);
  return `<section class="rounded-2xl overflow-hidden border border-galaxy-border bg-galaxy-panel" style="--acento:${acento}">
    <div class="h-36 sm:h-52 relative" style="background:${fondo}"><div class="absolute inset-0 bg-gradient-to-t from-galaxy-panel/80 to-transparent"></div>
      ${p.soy_yo ? `<input type="file" id="bn-file" accept="image/jpeg,image/png,image/webp" hidden><button type="button" data-act="cambiar-banner" aria-label="Cambiar banner" title="Cambiar banner" class="absolute top-2 right-2 z-10 h-9 px-3 rounded-full bg-black/60 hover:bg-black/80 text-white text-[11px] font-bold inline-flex items-center gap-1.5"><i class="fa-solid fa-camera"></i><span class="max-sm:hidden">Cambiar banner</span></button>` : ''}</div>
    <div class="px-4 sm:px-6 pb-5 -mt-10 sm:-mt-12 relative">
      <div class="flex flex-wrap items-end gap-3 sm:gap-4">
        ${avatarConAnillo(p, acento)}
        <div class="min-w-0 flex-1 pt-10 sm:pt-12">
          <h1 class="font-display font-extrabold text-white uppercase tracking-wider text-xl sm:text-2xl truncate">${escapeHTML(p.nombre_display || 'Jugador')}</h1>
          <p class="text-xs text-gray-400">@${escapeHTML(p.username)}</p></div>
        <div class="flex flex-wrap gap-1.5 w-full sm:w-auto sm:pt-12">${acciones}<button type="button" data-act="compartir" data-tipo="" aria-label="Compartir perfil" title="Compartir perfil" class="btn btn-ghost !min-h-9 !px-3 !text-[11px]"><i class="fa-solid fa-share-nodes"></i></button></div>
      </div>
      ${lema ? `<p class="mt-3 text-sm italic" style="color:${acento}">«${escapeHTML(lema)}»</p>` : ''}
      ${p.bio ? `<p class="mt-2 text-sm text-gray-300 whitespace-pre-line">${escapeHTML(p.bio)}</p>` : ''}
      <div class="mt-3 flex flex-wrap gap-1.5">${chips}</div>
      <div class="mt-3 space-y-1.5">${host}${stream}</div>
    </div></section>`;
}

const opcionesSel = (lista, actual) => lista.map(([v, t]) => `<option value="${v}" ${v === actual ? 'selected' : ''}>${t}</option>`).join('');
function franjaLogros(p) {
  const l = S.logros; if (!l?.visible || !l.logros.length) return '';
  const max = 8, ver = l.logros.slice(0, max);
  return `<section class="glass-panel rounded-2xl px-3 py-2.5 flex items-center gap-2 flex-wrap" aria-label="Logros">
    <span class="text-[10px] font-display font-bold uppercase tracking-widest text-gray-400 mr-1"><i class="fa-solid fa-medal text-galaxy-400"></i> Logros ${l.obtenidos}</span>
    ${ver.map((x) => `<span title="${escapeHTML(x.nombre + ' — ' + x.descripcion)}" class="w-8 h-8 rounded-lg border flex items-center justify-center ${nivelDe(x.nivel).clase}"><i class="fa-solid ${x.icono} text-sm" aria-hidden="true"></i><span class="sr-only">${escapeHTML(x.nombre)}</span></span>`).join('')}
    ${l.obtenidos > max ? `<span class="text-[11px] text-gray-500">+${l.obtenidos - max}</span>` : ''}
    ${p.soy_yo ? `<a href="${escapeHTML(href('logros/'))}" class="ml-auto text-[11px] text-galaxy-400 hover:text-white font-bold">Ver todos</a>` : ''}</section>`;
}
function panelEstilo(p) {
  const { banner, acento, lema, foto } = estiloDe(p);
  return `<section id="panel-estilo" hidden class="glass-panel rounded-2xl p-4 space-y-3">
    <h2 class="font-display font-bold text-white uppercase text-sm tracking-wider"><i class="fa-solid fa-palette text-galaxy-400 mr-2"></i>Estilo de tu perfil</h2>
    <div><p class="text-[11px] text-gray-400 mb-1.5">Banner</p><div class="grid grid-cols-4 gap-2" id="est-banners" data-foto="${escapeHTML(foto)}">${BANNERS.map((b) => `<button type="button" data-banner="${b.id}" aria-pressed="${!foto && b.id === banner.id}" title="${b.label}" class="h-12 rounded-lg border-2 border-transparent aria-pressed:border-white text-[10px] font-bold text-white/90 flex items-end justify-center pb-0.5" style="background:${b.css}">${b.label}</button>`).join('')}</div>
      <div class="mt-2 flex flex-wrap items-center gap-2"><input type="file" id="est-file" accept="image/jpeg,image/png,image/webp" hidden>
        <button type="button" data-act="subir-banner" class="btn btn-ghost !min-h-8 !px-3 !text-[11px]"><i class="fa-solid fa-image"></i><span>Subir mi foto de banner</span></button>
        <button type="button" data-act="quitar-banner" id="est-quitar" ${foto ? '' : 'hidden'} class="btn btn-ghost !min-h-8 !px-3 !text-[11px]"><i class="fa-solid fa-xmark"></i><span>Quitar foto</span></button>
        <span id="est-foto-estado" class="text-[11px] text-gray-500">${foto ? 'Usando tu foto de banner.' : 'JPG, PNG o WebP; se reduce sola a 1600 px.'}</span></div></div>
    <div><p class="text-[11px] text-gray-400 mb-1.5">Color de acento</p><div class="flex flex-wrap gap-2" id="est-acentos">${ACENTOS.map((c) => `<button type="button" data-acento="${c}" aria-pressed="${c.toLowerCase() === acento.toLowerCase()}" aria-label="Color ${c}" class="w-8 h-8 rounded-full border-2 border-transparent aria-pressed:border-white" style="background:${c}"></button>`).join('')}</div></div>
    <label class="block"><span class="text-[11px] text-gray-400">Tu lema (máx. ${LEMA_MAX})</span><input id="est-lema" maxlength="${LEMA_MAX}" value="${escapeHTML(lema)}" class="mt-1 w-full rounded-lg bg-black/30 border border-galaxy-border px-3 py-2 text-sm text-white" placeholder="Ej.: Juego limpio, remontada segura"></label>
    <p class="text-[11px] text-gray-500">Tu bio y tu club se editan en «Mi perfil».</p>
    <div class="flex gap-2"><button type="button" data-act="guardar-estilo" class="btn btn-primary !min-h-9 !text-xs">Guardar estilo</button><button type="button" data-act="cerrar-panel" class="btn btn-ghost !min-h-9 !text-xs">Cerrar</button></div></section>`;
}
function panelPrivacidad(p) {
  return `<section id="panel-privacidad" hidden class="glass-panel rounded-2xl p-4 space-y-3">
    <h2 class="font-display font-bold text-white uppercase text-sm tracking-wider"><i class="fa-solid fa-shield-halved text-galaxy-400 mr-2"></i>Privacidad de tu muro</h2>
    <label class="block"><span class="text-[11px] text-gray-400">¿Quién puede ver mi muro?</span><select id="pr-ver" class="mt-1 w-full rounded-lg bg-black/30 border border-galaxy-border px-3 py-2 text-sm text-white">${opcionesSel(MURO_VER, p.muro_ver)}</select></label>
    <label class="block"><span class="text-[11px] text-gray-400">¿Quién podrá responder? <em class="not-italic text-gray-500">(responder y reaccionar)</em></span><select id="pr-resp" class="mt-1 w-full rounded-lg bg-black/30 border border-galaxy-border px-3 py-2 text-sm text-white">${opcionesSel(MURO_RESPONDER, p.muro_responder)}</select></label>
    <p class="text-[11px] text-gray-500">Los jugadores que bloqueaste nunca ven tu muro, sea cual sea esta opción.</p>
    <div class="flex gap-2"><button type="button" data-act="guardar-priv" class="btn btn-primary !min-h-9 !text-xs">Guardar</button><button type="button" data-act="cerrar-panel" class="btn btn-ghost !min-h-9 !text-xs">Cerrar</button></div></section>`;
}
const selectSegmento = (id) => `<select id="${id}" aria-label="Juego de la publicación (opcional)" class="rounded-lg bg-black/30 border border-galaxy-border px-2 py-1.5 text-[11px] text-gray-300 max-w-[9.5rem]"><option value="">General (sin juego)</option>${SEGMENTOS.map(([id, n]) => `<option value="${id}">${n}</option>`).join('')}</select>`;
const composer = () => `<section class="glass-panel rounded-2xl p-3 space-y-2">
  <textarea id="mu-texto" data-menciones rows="3" maxlength="${MURO_MAX + 200}" placeholder="¿Qué quieres contar? Un resultado, una búsqueda de rivales, un enlace de tu clip…" class="w-full rounded-lg bg-black/30 border border-galaxy-border px-3 py-2 text-sm text-white resize-y"></textarea>
  <div id="mu-prev" hidden class="relative inline-block"><img id="mu-prev-img" alt="Vista previa de tu foto" class="max-h-40 rounded-lg border border-galaxy-border" hidden><video id="mu-prev-vid" muted playsinline controls class="max-h-48 rounded-lg border border-galaxy-border" hidden></video><button type="button" data-act="quitar-foto" aria-label="Quitar adjunto" class="absolute top-1 right-1 w-7 h-7 rounded-full bg-black/70 text-white text-xs"><i class="fa-solid fa-xmark"></i></button></div>
  <input id="mu-video" hidden maxlength="300" placeholder="Pega un enlace de YouTube, TikTok, Kick o Twitch" class="w-full rounded-lg bg-black/30 border border-galaxy-border px-3 py-2 text-xs text-white">
  <select id="mu-reto" hidden aria-label="Duelo a adjuntar" class="w-full rounded-lg bg-black/30 border border-galaxy-border px-3 py-2 text-xs text-white"></select>
  <input type="file" id="mu-file" accept="image/jpeg,image/png,image/webp" hidden><input type="file" id="mu-vfile" accept="video/mp4,video/webm,video/quicktime" hidden>
  <div class="flex items-center gap-1.5 sm:gap-2">
    <button type="button" data-act="elegir-foto" aria-label="Foto" title="Foto" class="btn btn-ghost !min-h-9 !px-3 !text-xs"><i class="fa-solid fa-image"></i><span class="max-sm:hidden">Foto</span></button>
    <button type="button" data-act="elegir-video" aria-label="Subir video" title="Subir video (hasta ${VIDEO_MAX_SEG} s y ${VIDEO_MAX_MB} MB)" class="btn btn-ghost !min-h-9 !px-3 !text-xs"><i class="fa-solid fa-film"></i><span class="max-sm:hidden">Video</span></button>
    <button type="button" data-act="alternar-video" aria-label="Enlace de video" title="Enlace de YouTube, TikTok, Kick o Twitch" class="btn btn-ghost !min-h-9 !px-3 !text-xs"><i class="fa-solid fa-link"></i><span class="max-sm:hidden">Enlace</span></button>
    <button type="button" data-act="alternar-reto" aria-label="Duelo" title="Adjuntar duelo" class="btn btn-ghost !min-h-9 !px-3 !text-xs"><i class="fa-solid fa-gamepad"></i><span class="max-sm:hidden">Duelo</span></button>
    <span id="mu-cuenta" class="ml-auto text-[11px] text-gray-500 whitespace-nowrap">0 / ${MURO_MAX}</span><button type="button" data-act="publicar" aria-label="Publicar" title="Publicar" class="btn btn-primary !min-h-9 !text-xs shrink-0 max-sm:!px-3"><i class="fa-solid fa-paper-plane"></i><span class="max-sm:hidden">Publicar</span></button></div>
  <div class="flex items-center gap-2 text-[11px] text-gray-500"><i class="fa-solid fa-tag"></i><span>Juego (opcional):</span>${selectSegmento('mu-juego')}</div></section>`;

/** Reacciones: las que ya tiene la publicación, de MÁS a MENOS votada (la más popular va primero); con permiso son botones (la mía resaltada) y hay un «+» que abre
 *  la paleta de emojis. Sin ninguna reacción todavía, se ofrecen las 5 rápidas para no dejar la fila vacía. */
function barraReacciones(it, p) {
  const resumen = resumenReacciones(it.reacciones); const abierta = S.paleta === it.id;
  const chip = (tipo, n, activo) => p.puede_responder
    ? `<button type="button" data-act="reaccion" data-id="${it.id}" data-tipo="${escapeHTML(tipo)}" aria-pressed="${activo}" class="rx"><span>${escapeHTML(tipo)}</span>${n ? `<b>${n}</b>` : ''}</button>`
    : `<span class="rx"><span>${escapeHTML(tipo)}</span><b>${n}</b></span>`;
  const rapidas = !resumen.length && p.puede_responder ? REACCIONES.map(([t]) => chip(t, 0, false)).join('') : '';
  const mas = p.puede_responder ? `<button type="button" data-act="paleta" data-id="${it.id}" aria-expanded="${abierta}" aria-label="Más emojis" title="Más emojis" class="rx !px-2"><i class="fa-regular fa-face-smile"></i><i class="fa-solid fa-plus text-[9px]"></i></button>` : '';
  const n = Number(it.respuestas) || 0;
  const paleta = abierta ? `<div class="mt-2 p-2 rounded-xl border border-galaxy-border bg-black/40 grid grid-cols-8 gap-1" role="group" aria-label="Elige un emoji">${PALETA_EMOJIS.map((e) => `<button type="button" data-act="reaccion" data-id="${it.id}" data-tipo="${e}" aria-pressed="${it.mia === e}" class="h-9 rounded-lg text-lg hover:bg-white/10 aria-pressed:bg-white/15">${e}</button>`).join('')}</div>` : '';
  return `<div class="flex flex-wrap items-center gap-1.5">${resumen.map((x) => chip(x.tipo, x.n, it.mia === x.tipo)).join('')}${rapidas}${mas}<button type="button" data-act="respuestas" data-id="${it.id}" aria-expanded="${S.abiertas.has(it.id)}" class="ml-auto text-[11px] text-gray-400 hover:text-galaxy-400"><i class="fa-regular fa-comment mr-1"></i>${n ? `${n} respuesta${n === 1 ? '' : 's'}` : (p.puede_responder ? 'Responder' : 'Sin respuestas')}</button></div>${paleta}`;
}
function seccionRespuestas(it, p) {
  const lista = S.resp.get(it.id);
  const filas = lista === undefined ? '<p class="text-[11px] text-gray-500 py-2">Cargando respuestas…</p>'
    : lista.map((r) => `<div class="flex gap-2 py-1.5"><span class="w-7 h-7 rounded-full overflow-hidden flex items-center justify-center bg-galaxy-card border border-galaxy-border shrink-0">${avatarHTML(r.avatar_url, r.nombre_display, 28)}</span>
        <div class="min-w-0 flex-1 rounded-xl bg-white/[0.03] px-2.5 py-1.5"><p class="text-[11px]"><a href="${escapeHTML(href('perfil/'))}?u=${escapeHTML(r.username)}" class="font-display font-bold text-white hover:text-galaxy-400">${escapeHTML(r.nombre_display)}</a> <span class="text-gray-500">· ${tiempoRelativo(r.created_at)}</span>${S.sesion && r.autor_id !== yoId() ? ` <button type="button" data-act="reportar" data-tipo="respuesta" data-id="${r.id}" title="Reportar respuesta" aria-label="Reportar respuesta" class="text-gray-500 hover:text-amber-300 ml-1"><i class="fa-regular fa-flag text-[10px]"></i></button>${can('resolverReportes') ? ` <button type="button" data-act="mod-ocultar" data-tipo="respuesta" data-id="${r.id}" data-pub="${it.id}" title="Ocultar (moderación)" aria-label="Ocultar respuesta (moderación)" class="text-gray-500 hover:text-orange-300 ml-1"><i class="fa-solid fa-eye-slash text-[10px]"></i></button>` : ''}` : ''}${r.puedo_borrar ? ` <button type="button" data-act="borrar-resp" data-id="${r.id}" data-pub="${it.id}" title="Borrar respuesta" class="text-gray-500 hover:text-bad ml-1"><i class="fa-solid fa-trash text-[10px]"></i></button>` : ''}</p>
          <p class="text-xs text-gray-200 leading-snug">${textoAHTML(r.texto)}</p></div></div>`).join('');
  const form = p.puede_responder
    ? `<div class="flex gap-2 mt-1"><input data-resp-input="${it.id}" data-menciones maxlength="${RESP_MAX + 100}" placeholder="Escribe una respuesta…" class="flex-1 min-w-0 rounded-lg bg-black/30 border border-galaxy-border px-3 py-2 text-xs text-white"><button type="button" data-act="enviar-resp" data-id="${it.id}" class="btn btn-primary !min-h-9 !px-3 !text-xs" aria-label="Enviar respuesta"><i class="fa-solid fa-paper-plane"></i></button></div>`
    : `<p class="text-[11px] text-gray-500 mt-1">${S.sesion ? 'Este jugador limita quién puede responder.' : 'Inicia sesión para responder.'}</p>`;
  return `<div class="mt-2">${filas}${form}</div>`;
}
/** Reportar (cualquiera con sesión, salvo en lo propio) y ocultar (solo moderación). La base de datos vuelve a comprobar rol y rango. */
const moderarBtns = (tipo, id, { pub = '', propio = !!S.p?.soy_yo } = {}) => (!S.sesion || propio ? '' : `<button type="button" data-act="reportar" data-tipo="${tipo}" data-id="${id}" title="Reportar" aria-label="Reportar" class="w-8 h-8 rounded-lg text-gray-400 hover:text-amber-300 shrink-0"><i class="fa-regular fa-flag"></i></button>${can('resolverReportes') ? `<button type="button" data-act="mod-ocultar" data-tipo="${tipo}" data-id="${id}" ${pub ? `data-pub="${pub}"` : ''} title="Ocultar (moderación)" aria-label="Ocultar (moderación)" class="w-8 h-8 rounded-lg text-gray-400 hover:text-orange-300 shrink-0"><i class="fa-solid fa-eye-slash"></i></button>` : ''}`);
const compartirBtn = (tipo, id) => `<button type="button" data-act="compartir" data-tipo="${tipo}" data-id="${id}" aria-label="Compartir" title="Compartir" class="w-8 h-8 rounded-lg text-gray-400 hover:text-galaxy-400 shrink-0"><i class="fa-solid fa-share-nodes"></i></button>`;
function tarjeta(it, p) {
  const mia = p.soy_yo; const puedeBorrar = mia || isAdmin();
  const menu = (mia || puedeBorrar) ? `<div class="flex gap-1 shrink-0">
    ${mia ? `<button type="button" data-act="fijar" data-id="${it.id}" title="${it.fijada ? 'Quitar de fijada' : 'Fijar arriba'}" class="w-8 h-8 rounded-lg text-gray-400 hover:text-galaxy-400"><i class="fa-solid fa-thumbtack"></i></button>
    <button type="button" data-act="editar" data-id="${it.id}" title="Editar" class="w-8 h-8 rounded-lg text-gray-400 hover:text-galaxy-400"><i class="fa-solid fa-pen"></i></button>` : ''}
    <button type="button" data-act="borrar" data-id="${it.id}" title="Borrar" class="w-8 h-8 rounded-lg text-gray-400 hover:text-bad"><i class="fa-solid fa-trash"></i></button></div>` : '';
  const cuerpo = S.editando === it.id
    ? `<textarea id="mu-edit" rows="3" class="w-full rounded-lg bg-black/30 border border-galaxy-border px-3 py-2 text-sm text-white">${escapeHTML(it.texto)}</textarea>
       <div class="flex gap-2 mt-2"><button type="button" data-act="guardar-edicion" data-id="${it.id}" class="btn btn-primary !min-h-8 !text-xs">Guardar</button><button type="button" data-act="cancelar-edicion" class="btn btn-ghost !min-h-8 !text-xs">Cancelar</button></div>`
    : contenidoHTML(it);
  const pie = `<footer class="mt-3 pt-2 border-t border-galaxy-border/60">${barraReacciones(it, p)}${S.abiertas.has(it.id) ? seccionRespuestas(it, p) : ''}</footer>`;
  return `<article id="p-${it.id}" class="glass-panel rounded-2xl p-3 sm:p-4 scroll-mt-24 ${it.fijada ? 'border border-galaxy-400/40' : ''}">
    <header class="flex items-center gap-2.5 mb-2">
      <span class="w-9 h-9 rounded-full overflow-hidden flex items-center justify-center bg-galaxy-card border border-galaxy-border shrink-0">${avatarHTML(p.avatar_url, p.nombre_display, 36)}</span>
      <div class="min-w-0 flex-1"><p class="font-display font-bold text-white text-sm truncate">${escapeHTML(p.nombre_display)}</p>
        <p class="text-[11px] text-gray-500">${it.fijada ? '<i class="fa-solid fa-thumbtack text-galaxy-400 mr-1"></i>Fijada · ' : ''}${tiempoRelativo(it.created_at)}${it.editada_at ? ' · editada' : ''} ${segmentoChipHTML(it.juego)}</p></div>${S.sesion ? botonGuardarHTML('publicacion', it.id) : ''}${compartirBtn('p', it.id)}${moderarBtns('publicacion', it.id)}${menu}</header>${cuerpo}${S.editando === it.id ? '' : pie}</article>`;
}
function feed(p) {
  if (!S.visible) return candadoMuro(p);
  if (!S.items.length) return `<div class="glass-panel rounded-2xl p-8 text-center text-gray-500 text-xs">${p.soy_yo ? 'Tu muro está vacío. ¡Publica lo primero!' : 'Aún no ha publicado nada.'}</div>`;
  return S.items.map((it) => tarjeta(it, p)).join('') + (S.hayMas ? `<button type="button" data-act="mas" class="btn btn-ghost w-full !text-xs">Cargar más</button>` : '');
}
/* ---------- Historias, destacadas y clips ---------- */
const bolita = (inner, etiqueta, acc, extra = '') => `<button type="button" ${acc} class="flex flex-col items-center gap-1 w-16 shrink-0 group" aria-label="${escapeHTML(etiqueta)}"><span class="w-14 h-14 rounded-full grid place-items-center overflow-hidden bg-galaxy-card ${extra}">${inner}</span><span class="text-[10px] text-gray-300 truncate w-full text-center group-hover:text-white">${escapeHTML(etiqueta)}</span></button>`;
function barraHistorias(p) {
  if (!S.hist || (!S.visible && !p.soy_yo)) return '';
  const { historias, destacadas, archivo } = S.hist; const acento = estiloDe(p).acento;
  const mias = p.soy_yo
    ? bolita('<i class="fa-solid fa-plus text-galaxy-400 text-lg"></i>', 'Nueva historia', 'data-act="panel-historia"', 'border-2 border-dashed border-galaxy-400/60')
      + (historias.length ? bolita(avatarHTML(p.avatar_url, p.nombre_display, 56), 'Mi historia', 'data-act="ver-historias"', 'ring-2 ring-offset-2 ring-offset-galaxy-panel') : '')
      + bolita('<i class="fa-solid fa-star text-amber-300 text-lg"></i>', 'Destacada', 'data-act="panel-destacada"', 'border-2 border-dashed border-amber-400/50')
    : '';
  const dest = destacadas.map((d) => {
    const hs = normalizarHistorias(d.historias); const portada = safeImg(hs.find((h) => h.imagen)?.imagen);
    const cuerpo = portada ? `<img src="${escapeHTML(portada)}" alt="" loading="lazy" referrerpolicy="no-referrer" class="w-full h-full object-cover">` : '<i class="fa-solid fa-star text-amber-300"></i>';
    return bolita(cuerpo, d.titulo, `data-act="ver-destacada" data-id="${Number(d.id)}"`, 'border-2 border-amber-400/70');
  }).join('');
  if (!mias && !dest) return '';
  const ayuda = p.soy_yo && !archivo.length && !historias.length && !destacadas.length ? '<p class="text-[11px] text-gray-500 mt-1">Las historias duran 24 h. Luego las encuentras en tu archivo para guardarlas como destacadas.</p>' : '';
  return `<section class="glass-panel rounded-2xl p-3" aria-label="Historias y destacadas" style="--acento:${acento}"><div class="flex gap-3 overflow-x-auto pb-1">${mias}${dest}</div>${ayuda}</section>`;
}
const pestanas = () => `<div class="flex gap-2" role="tablist" aria-label="Secciones del perfil">${[['pub', 'fa-newspaper', 'Publicaciones'], ['clips', 'fa-clapperboard', `Clips${S.clips.length ? ` · ${S.clips.length}${S.hayMasClips ? '+' : ''}` : ''}`]].map(([id, ic, t]) =>
  `<button type="button" role="tab" data-act="tab" data-tab="${id}" aria-pressed="${S.tab === id}" class="adv-chip !min-h-9 !px-3"><i class="fa-solid ${ic} mr-1.5"></i>${t}</button>`).join('')}</div>`;
/** Segmentos (juegos) que este perfil usa en publicaciones o clips. */
const juegosUsados = () => SEGMENTOS.filter(([id]) => S.juegos.includes(id) || S.clipJuegos.includes(id));
/** Filtro sutil por juego: solo aparece si el perfil usó al menos un segmento. */
function filtroHTML() {
  const usados = juegosUsados(); if (!usados.length) return '';
  return `<div id="filtro-juego" class="flex flex-wrap items-center gap-1.5 text-[11px]" role="group" aria-label="Filtrar por juego"><i class="fa-solid fa-tag text-gray-600"></i>${[['', 'Todo'], ...usados].map(([id, n]) =>
    `<button type="button" data-act="filtro-juego" data-j="${id}" aria-pressed="${S.juego === id}" class="rounded-full border border-galaxy-border/70 px-2.5 py-1 text-gray-400 aria-pressed:text-white aria-pressed:border-galaxy-400 aria-pressed:bg-galaxy-600/20">${escapeHTML(n)}</button>`).join('')}</div>`;
}
const pintarFiltro = () => { const f = document.getElementById('filtro-juego'); if (f) f.outerHTML = filtroHTML() || '<span id="filtro-juego" hidden></span>'; };
const clipsVisibles = () => S.clips.map(infoClip).filter(Boolean).filter((c) => !S.juego || c.juego === S.juego);
function seccionClips(p) {
  const ccc = clipsVisibles();
  const form = p.soy_yo ? `<section class="glass-panel rounded-2xl p-3 space-y-2">
      <div class="flex gap-2"><input id="cl-video" maxlength="300" placeholder="Enlace de tu clip (YouTube, Shorts, TikTok, Kick o Twitch)" class="flex-1 min-w-0 rounded-lg bg-black/30 border border-galaxy-border px-3 py-2 text-xs text-white">
        <input type="file" id="cl-vfile" accept="video/mp4,video/webm,video/quicktime" hidden><button type="button" data-act="elegir-video-clip" aria-label="Subir video" title="Subir video (hasta ${VIDEO_MAX_SEG} s y ${VIDEO_MAX_MB} MB)" class="btn btn-ghost !min-h-9 !px-3 !text-xs shrink-0"><i class="fa-solid fa-film"></i><span class="max-sm:hidden">Subir</span></button></div>
      <p id="cl-vinfo" class="text-[11px] text-gray-400" ${S.cfile ? '' : 'hidden'}>${S.cfile ? `<i class="fa-solid fa-film mr-1"></i>${escapeHTML(S.cfile.file.name)} <button type="button" data-act="quitar-video-clip" class="text-gray-500 hover:text-bad ml-1" aria-label="Quitar video"><i class="fa-solid fa-xmark"></i></button>` : ''}</p>
      <div class="flex gap-2"><input id="cl-titulo" maxlength="${CLIP_TITULO_MAX + 10}" placeholder="Título (opcional)" class="flex-1 min-w-0 rounded-lg bg-black/30 border border-galaxy-border px-3 py-2 text-xs text-white">${selectSegmento('cl-juego')}
        <button type="button" data-act="publicar-clip" aria-label="Añadir clip" class="btn btn-primary !min-h-9 !text-xs shrink-0"><i class="fa-solid fa-plus"></i><span class="max-sm:hidden">Añadir</span></button></div></section>` : '';
  if (!S.visible) return `${form}${candadoMuro(p)}`;
  const miniatura = (c) => c.ytId ? `<img src="https://i.ytimg.com/vi/${escapeHTML(c.ytId)}/hqdefault.jpg" alt="" loading="lazy" referrerpolicy="no-referrer" class="absolute inset-0 w-full h-full object-cover opacity-80 group-hover:opacity-100">`
    : c.propio ? `<video src="${escapeHTML(c.url)}#t=0.1" preload="metadata" muted playsinline class="absolute inset-0 w-full h-full object-cover pointer-events-none opacity-80"></video>` : '<div class="absolute inset-0 bg-gradient-to-br from-galaxy-600/50 to-black"></div>';
  const grilla = ccc.length ? `<div class="grid grid-cols-3 gap-1.5 sm:gap-2">${ccc.map((c, i) => `<button type="button" data-act="ver-clip" data-i="${i}" aria-label="Ver clip: ${escapeHTML(c.titulo || 'Clip')}" class="relative aspect-[9/16] rounded-lg overflow-hidden border border-galaxy-border bg-galaxy-900 group text-left">
      ${miniatura(c)}
      <i class="${escapeHTML(c.icono)} absolute top-1.5 right-1.5 text-white/90 text-sm drop-shadow"></i><i class="fa-solid fa-play absolute inset-0 m-auto w-fit h-fit text-white/90 text-2xl drop-shadow opacity-80"></i>
      <span class="absolute inset-x-0 bottom-0 p-1.5 pt-6 bg-gradient-to-t from-black/85 to-transparent text-[10px] text-white leading-tight line-clamp-2">${escapeHTML(c.titulo)}</span></button>`).join('')}</div>${S.hayMasClips ? '<button type="button" data-act="mas-clips" class="btn btn-ghost w-full !text-xs mt-2">Cargar más</button>' : ''}`
    : `<div class="glass-panel rounded-2xl p-8 text-center text-gray-500 text-xs">${S.juego ? 'No hay clips de ese juego.' : p.soy_yo ? 'Todavía no tienes clips. Sube un video o pega el enlace de tu mejor jugada.' : 'Aún no ha subido clips.'}</div>`;
  return `<div class="space-y-3">${form}${grilla}</div>`;
}

function pintar() {
  const p = S.p;
  const conExtras = !!S.hist;   // sin la migración 025 no hay pestañas ni historias: el muro sigue funcionando igual que antes
  root.innerHTML = `<div class="space-y-4">${cabecera(p)}${franjaLogros(p)}${p.soy_yo ? panelEstilo(p) + panelHostHTML() + panelPrivacidad(p) : ''}${barraHistorias(p)}
    <div class="space-y-3 max-w-2xl mx-auto w-full">${conExtras ? pestanas() : ''}${conExtras ? (filtroHTML() || '<span id="filtro-juego" hidden></span>') : ''}
      <div id="tab-pub" class="space-y-3" ${S.tab === 'pub' || !conExtras ? '' : 'hidden'}>${p.soy_yo ? composer() : ''}<div id="mu-feed" class="space-y-3">${feed(p)}</div></div>
      ${conExtras ? `<div id="tab-clips" ${S.tab === 'clips' ? '' : 'hidden'}>${seccionClips(p)}</div>` : ''}</div></div>`;
}
const pintarFeed = () => { const f = document.getElementById('mu-feed'); if (f) f.innerHTML = feed(S.p); };

/* ---------- Carga ---------- */
async function cargar() {
  if (!S.usuario) { root.innerHTML = `<div class="glass-panel rounded-2xl p-8 text-center text-gray-400 text-sm">${S.sesion ? 'No encuentro tu @usuario.' : 'Inicia sesión para ver tu muro, o abre el de otro jugador.'}</div>`; return; }
  root.innerHTML = '<p class="text-gray-400 text-sm py-16 text-center">Cargando perfil…</p>';
  try {
    const p = await api.perfilPublico(S.usuario);
    if (!p) { root.innerHTML = '<div class="glass-panel rounded-2xl p-8 text-center text-gray-400 text-sm">No encontré a ese jugador.</div>'; return; }
    S.p = p; S.items = []; S.editando = null; S.abiertas.clear(); S.resp.clear();
    const m = p.puede_ver_muro ? await api.cargarMuro(p.id) : { visible: false, items: [], hay_mas: false };
    S.visible = m.visible; S.items = m.items ?? []; S.hayMas = !!m.hay_mas; S.juegos = m.juegos ?? []; S.juego = '';
    await marcadoresMuro();
    S.logros = await logrosDe(p.id);                 // nunca lanza: sin logros el perfil se ve igual
    S.red = S.sesion && !p.soy_yo ? await cargarRedSegura() : null;
    await cargarExtras(p); await marcadoresMuro();     // clips ya cargados: marcadores de todo lo visible
    document.title = `${p.nombre_display} · Muro`;
    pintar(); irADestino();
  } catch (e) { console.error('[perfil] carga:', e); root.innerHTML = '<div class="glass-panel rounded-2xl p-8 text-center text-bad text-sm">No se pudo cargar el perfil. Intenta de nuevo en un momento.</div>'; }
}
/** Mi red (amigos, solicitudes, seguidos). Si falla, devuelve null: el perfil sigue funcionando con los botones básicos. */
async function cargarRedSegura() {
  try { return await amigosApi.cargarRed(); } catch (e) { console.warn('[perfil] red no disponible:', e?.message); return null; }
}
/** Historias y clips: si fallan (p. ej. la migración 025 aún no se ejecutó) NO rompen el perfil: simplemente no se muestran. */
async function cargarExtras(p) {
  S.vistas = leerVistas(); S.hist = null; S.clips = []; S.hayMasClips = false;
  if (!p.puede_ver_muro) return;
  const [h, c] = await Promise.allSettled([api.historiasDe(p.id), api.clipsDe(p.id)]);
  if (h.status === 'fulfilled' && h.value) S.hist = { historias: h.value.historias ?? [], destacadas: h.value.destacadas ?? [], archivo: h.value.archivo ?? [] };   // datos crudos: se normalizan al usarlos
  else if (h.status === 'rejected') console.warn('[perfil] historias no disponibles:', h.reason?.message);
  if (c.status === 'fulfilled' && c.value) { S.clips = c.value.items ?? []; S.hayMasClips = !!c.value.hay_mas; S.clipJuegos = c.value.juegos ?? []; }
  else if (c.status === 'rejected') console.warn('[perfil] clips no disponibles:', c.reason?.message);
  if (!S.hist && c.status === 'fulfilled') S.hist = { historias: [], destacadas: [], archivo: [] };
}
/** Marcadores (guardados) de lo que se ve ahora: publicaciones del muro y clips. Si falla, no se muestran marcados y todo sigue funcionando. */
async function marcadoresMuro() { if (!S.sesion) return; await Promise.all([cargarGuardados('publicacion', S.items.map((x) => x.id)), cargarGuardados('clip', (S.clips ?? []).map((c) => c.id))]); }
/** Enlace compartido (#p-<id> publicación, #c-<id> clip): al abrir el perfil se lleva a ese contenido. Solo una vez por visita. */
let destinoUsado = false;
function irADestino() {
  const d = destinoDeHash(location.hash); if (destinoUsado || !d) return; destinoUsado = true;
  if (d.tipo === 'p') {
    const el = document.getElementById(`p-${d.id}`);
    if (!el) { toast('Esa publicación no está entre las más recientes de este muro.', 'info'); return; }
    el.scrollIntoView({ block: 'center' }); el.classList.add('ring-2', 'ring-galaxy-400'); setTimeout(() => el.classList.remove('ring-2', 'ring-galaxy-400'), 2500);
  } else {
    const i = clipsVisibles().findIndex((c) => c.id === d.id); if (i < 0) { toast('No encontré ese clip.', 'info'); return; }
    ACCIONES.tab({ dataset: { tab: 'clips' } }); ACCIONES['ver-clip']({ dataset: { i: String(i) } });
  }
}
async function recargarExtras() { await cargarExtras(S.p); await marcadoresMuro(); pintar(); }
async function refrescarMuro() { const m = await api.cargarMuro(S.p.id, null, 20, S.juego); S.items = m.items ?? []; S.hayMas = !!m.hay_mas; S.visible = m.visible; await marcadoresMuro(); if (!S.juego) S.juegos = m.juegos ?? S.juegos; pintarFeed(); pintarFiltro(); }

/* ---------- Ayudantes de fotos ---------- */
function limpiarFoto() {
  for (const id of ['mu-file', 'mu-vfile']) { const f = document.getElementById(id); if (f) f.value = ''; }
  S.vfile = null;
  for (const id of ['mu-prev-img', 'mu-prev-vid']) { const el = document.getElementById(id); if (!el) continue; if (el.src?.startsWith('blob:')) URL.revokeObjectURL(el.src); el.removeAttribute('src'); el.hidden = true; }
  const box = document.getElementById('mu-prev'); if (box) box.hidden = true;
}
/** Marca (o quita) la foto de banner pendiente del editor de estilo: se apagan los presets y se actualiza el texto de estado. */
function fijarBannerFoto(url) {
  const cont = document.getElementById('est-banners'); cont.dataset.foto = url;
  cont.querySelectorAll('button').forEach((b) => b.setAttribute('aria-pressed', 'false'));
  if (!url) cont.querySelector('button')?.setAttribute('aria-pressed', 'true');   // sin foto vuelve a quedar un preset marcado (el primero)
  document.getElementById('est-quitar').hidden = !url;
  document.getElementById('est-foto-estado').textContent = url ? 'Foto lista: pulsa «Guardar estilo».' : 'JPG, PNG o WebP; se reduce sola a 1600 px.';
}

/* ---------- Panel «Hosting» (varios juegos y parches + mostrar/ocultar) ---------- */
const panelHostHTML = () => '<section id="panel-host" hidden class="glass-panel rounded-2xl p-4 space-y-3"></section>';
function pintarPanelHost() {
  const box = document.getElementById('panel-host'); const h = S.host; if (!box || !h) return;
  const juegos = HOST_JUEGOS.map((j) => {
    const e = h.cat.find((x) => x.juego === j.id); const id = escapeHTML(j.id);
    const opciones = e ? [...new Set([...j.sugeridas, ...e.opciones])] : [];
    return `<div class="rounded-xl border ${e ? 'border-galaxy-400/50 bg-galaxy-600/10' : 'border-galaxy-border/60 bg-black/20'} p-2.5">
      <button type="button" data-act="host-juego" data-juego="${id}" aria-pressed="${!!e}" class="flex items-center gap-2 text-sm text-white font-display font-bold uppercase tracking-wide w-full text-left"><i class="fa-regular ${e ? 'fa-square-check text-galaxy-400' : 'fa-square'}"></i>${id}</button>
      ${e ? `<p class="text-[11px] text-gray-400 mt-2 mb-1">${escapeHTML(j.opcion)} (puedes elegir varios)</p>
        <div class="flex flex-wrap gap-1.5">${opciones.map((o) => `<button type="button" data-act="host-opcion" data-juego="${id}" data-o="${escapeHTML(o)}" aria-pressed="${e.opciones.includes(o)}" class="adv-chip !min-h-8 !px-2.5 !text-[11px]">${escapeHTML(o)}</button>`).join('')}</div>
        <div class="flex gap-1.5 mt-2"><input data-host-otro="${id}" maxlength="${HOST_MAX_TEXTO}" placeholder="Otro (escríbelo)" class="flex-1 min-w-0 rounded-lg bg-black/30 border border-galaxy-border px-2.5 py-1.5 text-xs text-white">
          <button type="button" data-act="host-agregar" data-juego="${id}" aria-label="Añadir" class="btn btn-ghost !min-h-8 !px-3 !text-xs"><i class="fa-solid fa-plus"></i></button></div>` : ''}</div>`;
  }).join('');
  box.innerHTML = `<h2 class="font-display font-bold text-white uppercase text-sm tracking-wider"><i class="fa-solid fa-server text-galaxy-400 mr-2"></i>Mi hosting</h2>
    <label class="flex items-center gap-2.5 text-sm text-white cursor-pointer"><input type="checkbox" data-act="host-visible" ${h.visible ? 'checked' : ''} class="w-4 h-4 accent-[#8000ff]">Mostrar mi hosting en mi perfil</label>
    ${S.p.puede_hostear ? '' : '<p class="text-[11px] text-amber-300"><i class="fa-solid fa-triangle-exclamation mr-1"></i>Aún no tienes activado «Puedo ser host» en Mi perfil → Sistema Host: mientras tanto no se mostrará.</p>'}
    <div><p class="text-[11px] text-gray-400 mb-1.5">Plataforma</p><div class="flex gap-1.5">${['Ambos', 'Smash Soda', 'Parsec'].map((v) => `<button type="button" data-act="host-soft" data-v="${v}" aria-pressed="${h.soft === v}" class="adv-chip !min-h-8 !px-3 !text-[11px]">${v}</button>`).join('')}</div></div>
    <div class="space-y-2">${juegos}</div>
    <p class="text-[11px] text-gray-500">Marca todos los juegos que hosteas y, en cada uno, todos los parches o versiones que ofreces. La velocidad, las aclaraciones y «Puedo ser host» siguen en Mi perfil.</p>
    <div class="flex gap-2"><button type="button" data-act="guardar-host" class="btn btn-primary !min-h-9 !text-xs">Guardar hosting</button><button type="button" data-act="cerrar-panel" class="btn btn-ghost !min-h-9 !text-xs">Cerrar</button></div>`;
}

/** Ventana «Foto de perfil»: la misma de Mi perfil (subir, galería de avatares, la de Discord/Google), pero abierta desde el muro. */
function abrirFoto() {
  const user = S.sesion?.user; if (!user) return;
  const m = openModal(`<div class="p-6 space-y-4"><div class="flex justify-between items-center"><h2 class="font-display font-bold text-xl text-white uppercase tracking-widest">Foto de perfil</h2>
    <button type="button" data-close aria-label="Cerrar" class="text-gray-500 hover:text-white"><i class="fa-solid fa-xmark text-xl"></i></button></div>
    ${avatarPickerHTML({ avatarUrl: S.p.avatar_url, name: S.p.nombre_display, user, ns: 'mf' })}
    <p id="mf-err" class="text-xs text-bad min-h-4" role="alert"></p><button type="button" id="mf-ok" class="btn btn-primary w-full">Guardar foto</button></div>`, { id: 'foto-modal' });
  const err = m.querySelector('#mf-err');
  const picker = bindAvatarPicker(m, { user, getName: () => S.p.nombre_display, onError: (t) => { err.textContent = t; }, currentUrl: S.p.avatar_url, ns: 'mf' });
  const ok = m.querySelector('#mf-ok');
  ok.addEventListener('click', async () => {
    ok.disabled = true; err.textContent = '';
    try {
      const url = await resolveAvatar(picker.get(), S.p.id);
      if (url === undefined) { closeModal('foto-modal'); return; }   // no eligió nada nuevo
      const { error } = await supabase.from('perfiles').update({ avatar_url: url }).eq('id', S.p.id); if (error) throw error;
      await refreshProfile(); closeModal('foto-modal'); toast('Foto actualizada.', 'ok'); await cargar();
    } catch (ex) { console.error('[perfil] foto:', ex); err.textContent = 'No se pudo guardar la foto. Intenta de nuevo.'; }
    finally { ok.disabled = false; }
  });
}

/* ---------- Visores y paneles ---------- */
const PANELES = ['estilo', 'privacidad', 'host'];
function abrirPanel(nombre) {
  if (nombre === 'host' && document.getElementById('panel-host')?.hidden) {   // al abrirlo se precarga con lo que ya tengo (o con mis datos antiguos de un solo juego)
    S.host = { cat: catalogoDe(S.p), soft: ['Ambos', 'Smash Soda', 'Parsec'].includes(S.p.software_host) ? S.p.software_host : 'Ambos', visible: S.p.host_visible !== false }; pintarPanelHost();
  }
  PANELES.forEach((n) => { const x = document.getElementById(`panel-${n}`); if (x) x.hidden = n !== nombre ? true : !x.hidden; }); }
/** Abre el visor. `vigentes` = las historias de las últimas 24 h (empieza por la primera no vista y las marca como vistas al cerrar). El dueño puede borrarlas. */
function verHistorias(lista, titulo, { vigentes: sonVigentes = false } = {}) {
  if (!lista.length) { toast('No hay historias para mostrar.', 'info'); return; }
  const p = S.p; const duenyo = p.soy_yo;
  abrirHistorias({
    historias: lista, nombre: p.nombre_display || 'Jugador', avatar: avatarHTML(p.avatar_url, p.nombre_display, 32), titulo,
    inicio: sonVigentes ? indiceInicial(lista, S.vistas) : 0,
    onVistas: (ids) => { if (!sonVigentes) return; guardarVistas(ids); const av = document.querySelector('[data-act=ver-historias][aria-label^="Ver historias"]'); if (av) av.style.boxShadow = '0 0 0 3px #6b7280'; },
    onBorrar: duenyo ? async (id) => { try { await api.borrarHistoria(id); } catch (e) { toast(msgErr(e), 'error'); return false; } await recargarExtras(); return true; } : undefined,
    onReportar: S.sesion && !duenyo ? (h) => abrirReportar({ tipo: 'historia', objetivo: h.id, titulo: `Historia de ${p.nombre_display || p.username}` }) : undefined,
    onModerar: S.sesion && !duenyo && can('resolverReportes') ? (h) => abrirOcultar({ tipo: 'historia', id: h.id, titulo: `Historia de ${p.nombre_display || p.username}`, onListo: recargarExtras }) : undefined,
  });
}

/* ---------- Eventos ---------- */
/** Ejecuta un cambio de amistad/seguimiento, refresca MI red y repinta. Con `recargarTodo` se vuelve a pedir el perfil (p. ej. al ser amigos el muro puede abrirse). */
async function cambioSocial(fn, ok, { recargarTodo = false } = {}) {
  if (S.ocupadoSocial) return; S.ocupadoSocial = true;
  try {
    const r = await seguro(fn, ok); if (r === undefined) return;   // seguro() devuelve undefined solo si hubo error (ya avisado)
    window.dispatchEvent(new CustomEvent('pendientes:refresh'));   // actualiza los números del menú del avatar
    if (recargarTodo) await cargar(); else { S.red = await cargarRedSegura(); pintar(); }
  } finally { S.ocupadoSocial = false; }
}

const ACCIONES = {
  panel: (el) => abrirPanel(el.dataset.panel),
  'panel-historia': () => abrirNuevaHistoria({ uid: S.p.id, onListo: recargarExtras }),
  'panel-destacada': () => abrirDestacadas({ hist: S.hist, onListo: recargarExtras }),
  'cerrar-panel': () => PANELES.forEach((n) => { const x = document.getElementById(`panel-${n}`); if (x) x.hidden = true; }),
  tab: (el) => { S.tab = el.dataset.tab === 'clips' ? 'clips' : 'pub'; document.getElementById('tab-pub').hidden = S.tab !== 'pub'; document.getElementById('tab-clips').hidden = S.tab !== 'clips';
    document.querySelectorAll('[data-act=tab]').forEach((b) => b.setAttribute('aria-pressed', String(b.dataset.tab === S.tab))); },
  'ver-historias': () => verHistorias(normalizarHistorias(S.hist?.historias), '', { vigentes: true }),
  'ver-destacada': (el) => { const d = S.hist?.destacadas.find((x) => x.id === Number(el.dataset.id)); if (d) verHistorias(normalizarHistorias(d.historias), d.titulo); },
  'elegir-video-clip': () => document.getElementById('cl-vfile').click(),
  'quitar-video-clip': () => { S.cfile = null; const i = document.getElementById('cl-vinfo'); if (i) { i.hidden = true; i.innerHTML = ''; } document.getElementById('cl-vfile').value = ''; },
  'publicar-clip': async () => {
    const btn = document.querySelector('[data-act=publicar-clip]'); const juego = segmentoParaGuardar(document.getElementById('cl-juego').value);
    let url = null;
    try {
      btn.disabled = true;
      if (S.cfile) url = await api.subirVideo(S.cfile.file, S.p.id, S.cfile.ext, S.cfile.mime);
      const v = validarClip({ titulo: document.getElementById('cl-titulo').value, video: url ?? document.getElementById('cl-video').value }); if (!v.ok) { toast(v.error, 'error'); if (url) api.quitarArchivo(url); return; }
      await api.publicarClip(v.titulo, v.video, juego); toast('Clip añadido.', 'ok'); S.cfile = null; await recargarExtras();
    } catch (e) { toast(msgErr(e), 'error'); if (url) api.quitarArchivo(url); }
    finally { btn.disabled = false; }
  },
  'ver-clip': (el) => abrirClips({ clips: clipsVisibles(), inicio: Number(el.dataset.i) || 0,
    onCompartir: (c) => compartir({ url: urlCompartir({ base: siteHome(), usuario: S.p.username, tipo: 'c', id: c.id }), titulo: `${S.p.nombre_display} · clip`, texto: c.titulo }),
    onBorrar: S.p.soy_yo || isAdmin() ? async (id) => { try { await api.borrarClip(id); } catch (e) { toast(msgErr(e), 'error'); return false; } S.clips = S.clips.filter((c) => Number(c.id) !== id); pintar(); return true; } : undefined,
    onReportar: S.sesion && !S.p.soy_yo ? (c) => abrirReportar({ tipo: 'clip', objetivo: c.id, titulo: c.titulo || 'Clip' }) : undefined,
    onModerar: S.sesion && !S.p.soy_yo && can('resolverReportes') ? (c) => abrirOcultar({ tipo: 'clip', id: c.id, titulo: c.titulo || 'Clip', onListo: async () => { S.clips = S.clips.filter((x) => Number(x.id) !== Number(c.id)); pintar(); } }) : undefined,
    guardarHTML: S.sesion ? (c) => botonGuardarHTML('clip', c.id, { clase: 'w-10 h-10 rounded-full bg-black/60 grid place-items-center' }) : null, onGuardar: S.sesion ? (b) => alternarGuardado(b) : null }),
  'mas-clips': async (el) => {
    el.disabled = true;
    try { const m = await api.clipsDe(S.p.id, S.clips[S.clips.length - 1]?.id); S.clips = [...S.clips, ...(m.items ?? [])]; S.hayMasClips = !!m.hay_mas; await marcadoresMuro(); pintar(); }
    catch (e) { toast(msgErr(e), 'error'); el.disabled = false; }
  },
  amistad: () => ACCIONES.solicitar(),   // nombre anterior del botón
  solicitar: () => cambioSocial(() => amigosApi.solicitar(S.p.id), 'Solicitud enviada.', { recargarTodo: true }),
  'cancelar-solicitud': () => cambioSocial(() => amigosApi.cancelarSolicitud(S.p.id), 'Solicitud cancelada.'),
  'aceptar-amistad': () => cambioSocial(() => amigosApi.responder(S.p.id, true), '¡Ahora son amigos!', { recargarTodo: true }),   // puede abrir su muro: se recarga todo
  'rechazar-amistad': () => cambioSocial(() => amigosApi.responder(S.p.id, false), 'Solicitud rechazada.'),
  seguir: () => cambioSocial(() => amigosApi.seguir(S.p.id), 'Ahora lo sigues.', { recargarTodo: true }),   // seguir puede ampliar lo que ves (p. ej. chat de «amigos y seguidores»)
  'dejar-seguir': () => cambioSocial(() => amigosApi.dejarDeSeguir(S.p.id), 'Dejaste de seguirlo.'),
  bloquear: () => { if (confirm(`¿Bloquear a ${S.p.nombre_display}? No podrán verse ni escribirse. Podrás desbloquearlo en Amigos → Bloqueados.`)) return cambioSocial(() => amigosApi.bloquear(S.p.id), 'Persona bloqueada.', { recargarTodo: true }); },
  desbloquear: () => cambioSocial(() => amigosApi.desbloquear(S.p.id), 'Desbloqueada.', { recargarTodo: true }),
  'elegir-foto': () => document.getElementById('mu-file').click(),
  'filtro-juego': async (el) => {
    S.juego = el.dataset.j || ''; pintarFiltro();
    const c = document.getElementById('tab-clips'); if (c) c.innerHTML = seccionClips(S.p);
    await seguro(() => refrescarMuro());
  },
  compartir: (el) => {
    const tipo = el.dataset.tipo || ''; const id = el.dataset.id ? Number(el.dataset.id) : null;
    return compartir({ url: urlCompartir({ base: siteHome(), usuario: S.p.username, tipo, id }), titulo: tipo ? `${S.p.nombre_display} en Phoenix Evolution Series` : `Perfil de ${S.p.nombre_display}`,
      texto: tipo === 'p' ? (S.items.find((x) => x.id === id)?.texto ?? '').slice(0, 120) : '' });
  },
  'elegir-video': () => document.getElementById('mu-vfile').click(),
  'alternar-video': () => { const i = document.getElementById('mu-video'); i.hidden = !i.hidden; if (!i.hidden) i.focus(); else i.value = ''; },
  'quitar-foto': () => limpiarFoto(),
  'alternar-reto': async () => {
    const sel = document.getElementById('mu-reto'); sel.hidden = !sel.hidden;
    if (sel.hidden) { sel.value = ''; return; }
    if (S.misRetos === undefined) {   // se cargan una sola vez, la primera que abres el selector
      sel.innerHTML = '<option value="">Cargando tus duelos…</option>';
      S.misRetos = (await seguro(() => api.misPartidos())) ?? [];
    }
    sel.innerHTML = S.misRetos.length
      ? `<option value="">— Elige el duelo a adjuntar —</option>${S.misRetos.map((r) => `<option value="${Number(r.id)}">${escapeHTML(etiquetaOpcionReto(r))}</option>`).join('')}`
      : '<option value="">Aún no tienes duelos aceptados o finalizados para adjuntar.</option>';
  },
  'video-yt': (el) => reproductorYT(el),
  'subir-banner': () => document.getElementById('est-file').click(),
  'quitar-banner': () => { fijarBannerFoto(''); },
  publicar: async () => {
    const crudo = document.getElementById('mu-texto').value; const file = document.getElementById('mu-file').files?.[0] ?? null;
    const vTxt = document.getElementById('mu-video').value.trim(); const vid = vTxt ? analizarVideo(vTxt) : null;
    if (vid && !vid.ok) { toast(vid.error, 'error'); return; }
    const reto = Number(document.getElementById('mu-reto').value) || null; const juego = segmentoParaGuardar(document.getElementById('mu-juego').value);
    const hayMedios = !!file || !!vid || !!reto || !!S.vfile;
    const v = crudo.trim() ? validarTexto(crudo) : { ok: hayMedios, texto: '', error: 'Escribe algo, sube una foto, pega un enlace de video o adjunta un duelo.' };
    if (!v.ok) { toast(v.error, 'error'); return; }
    const btn = document.querySelector('[data-act=publicar]'); btn.disabled = true;
    let urlFoto = null; let urlVideo = null;
    try {
      if (file) urlFoto = await api.subirImagen(file, S.p.id);
      if (S.vfile) urlVideo = await api.subirVideo(S.vfile.file, S.p.id, S.vfile.ext, S.vfile.mime);
      await api.publicar(v.texto, urlFoto, urlVideo ?? vid?.url ?? null, reto, juego);
      toast('Publicado.', 'ok');
      document.getElementById('mu-texto').value = ''; document.getElementById('mu-cuenta').textContent = `0 / ${MURO_MAX}`; limpiarFoto();
      const iv = document.getElementById('mu-video'); iv.value = ''; iv.hidden = true; document.getElementById('mu-juego').value = ''; const sr = document.getElementById('mu-reto'); sr.value = ''; sr.hidden = true;
      await refrescarMuro();
    } catch (e) {
      toast(msgErr(e), 'error');
      if (urlFoto) api.quitarArchivo(urlFoto); if (urlVideo) api.quitarArchivo(urlVideo);   // la publicación falló: no dejar archivos huérfanos en el Storage
    } finally { btn.disabled = false; }
  },
  fijar: async (el) => { const id = Number(el.dataset.id); const it = S.items.find((x) => x.id === id); if (await seguro(() => api.fijar(id, !it?.fijada)) !== undefined) await refrescarMuro(); },
  editar: (el) => { S.editando = Number(el.dataset.id); pintarFeed(); },
  'cancelar-edicion': () => { S.editando = null; pintarFeed(); },
  'guardar-edicion': async (el) => {
    const it = S.items.find((x) => x.id === Number(el.dataset.id)); const crudo = document.getElementById('mu-edit').value;
    const v = crudo.trim() ? validarTexto(crudo) : { ok: !!(it?.imagen_url || it?.video_url), texto: '', error: 'El texto no puede quedar vacío si no hay foto ni video.' };
    if (!v.ok) { toast(v.error, 'error'); return; }
    if (await seguro(() => api.editar(Number(el.dataset.id), v.texto), 'Cambios guardados.') !== undefined) { S.editando = null; await refrescarMuro(); }
  },
  borrar: async (el) => { if (!window.confirm('¿Borrar esta publicación? No se puede deshacer.')) return; if (await seguro(() => api.borrar(Number(el.dataset.id)), 'Publicación borrada.') !== undefined) await refrescarMuro(); },
  'cambiar-foto': () => abrirFoto(),
  'cambiar-banner': () => document.getElementById('bn-file').click(),
  'host-juego': (el) => { S.host.cat = alternarJuego(S.host.cat, el.dataset.juego); pintarPanelHost(); },
  'host-opcion': (el) => { S.host.cat = alternarOpcion(S.host.cat, el.dataset.juego, el.dataset.o); pintarPanelHost(); },
  'host-agregar': (el) => {
    const inp = [...document.querySelectorAll('[data-host-otro]')].find((x) => x.dataset.hostOtro === el.dataset.juego); const antes = S.host.cat;
    if (S.host.cat.find((x) => x.juego === el.dataset.juego)?.opciones.includes(limpiarOpcion(inp?.value))) { toast('Esa opción ya está marcada.', 'info'); return; }
    S.host.cat = alternarOpcion(S.host.cat, el.dataset.juego, inp?.value); if (S.host.cat === antes) { toast('Escribe el nombre o ya tienes el máximo de opciones.', 'info'); return; }
    pintarPanelHost();
  },
  'host-soft': (el) => { S.host.soft = el.dataset.v; pintarPanelHost(); },
  'host-visible': (el) => { S.host.visible = el.checked; },
  'guardar-host': async () => {
    if (!S.host.cat.length) { toast('Elige al menos un juego (o desmarca «Mostrar mi hosting en mi perfil»).', 'error'); return; }
    if (await seguro(() => api.guardarHost(S.host.soft, S.host.cat, S.host.visible), 'Hosting guardado.') !== undefined) await cargar();
  },
  paleta: (el) => { const id = Number(el.dataset.id); S.paleta = S.paleta === id ? null : id; pintarFeed(); },
  reaccion: async (el) => {
    const id = Number(el.dataset.id); const it = S.items.find((x) => x.id === id); if (!it) return;
    const final = await seguro(() => api.reaccionar(id, el.dataset.tipo)); if (final === undefined) return;   // undefined = falló (ya se avisó); null = quité mi reacción
    S.paleta = null; S.items = S.items.map((x) => (x.id === id ? aplicarReaccion(x, final) : x)); pintarFeed();
  },
  respuestas: async (el) => {
    const id = Number(el.dataset.id);
    if (S.abiertas.has(id)) { S.abiertas.delete(id); pintarFeed(); return; }
    S.abiertas.add(id); pintarFeed();
    if (!S.resp.has(id)) { const r = await seguro(() => api.respuestasDe(id)); S.resp.set(id, r ?? []); pintarFeed(); }
  },
  'enviar-resp': async (el) => {
    const id = Number(el.dataset.id); const input = document.querySelector(`[data-resp-input="${id}"]`);
    const v = validarRespuesta(input?.value); if (!v.ok) { toast(v.error, 'error'); return; }
    if (await seguro(() => api.responder(id, v.texto)) === undefined) return;
    S.resp.set(id, await api.respuestasDe(id).catch(() => S.resp.get(id) ?? []));
    S.items = S.items.map((x) => (x.id === id ? { ...x, respuestas: (S.resp.get(id) ?? []).length } : x)); pintarFeed();
  },
  reportar: (el) => {
    if (!S.sesion) { toast('Inicia sesión para reportar.', 'info'); return; }
    abrirReportar({ tipo: el.dataset.tipo, objetivo: el.dataset.id, titulo: el.dataset.titulo || '' });
  },
  'mod-ocultar': (el) => {
    const tipo = el.dataset.tipo; const id = Number(el.dataset.id); const pub = Number(el.dataset.pub);
    abrirOcultar({ tipo, id, titulo: `${{ publicacion: 'Publicación', respuesta: 'Respuesta', clip: 'Clip', historia: 'Historia' }[tipo] ?? 'Contenido'} de ${S.p.nombre_display || S.p.username}`, onListo: async () => {
      if (tipo === 'respuesta' && pub) { S.resp.set(pub, await api.respuestasDe(pub).catch(() => [])); S.items = S.items.map((x) => (x.id === pub ? { ...x, respuestas: (S.resp.get(pub) ?? []).length } : x)); pintarFeed(); }
      else if (tipo === 'publicacion') await refrescarMuro();
      else await recargarExtras();
    } });
  },
  'mod-sancionar': async () => { abrirSancionar({ usuario: { id: S.p.id, nombre: S.p.nombre_display || S.p.username, rol: await rolDe(S.p.id) } }); },
  'borrar-resp': async (el) => {
    if (!window.confirm('¿Borrar esta respuesta?')) return;
    const id = Number(el.dataset.pub);
    if (await seguro(() => api.borrarRespuesta(Number(el.dataset.id)), 'Respuesta borrada.') === undefined) return;
    S.resp.set(id, await api.respuestasDe(id).catch(() => []));
    S.items = S.items.map((x) => (x.id === id ? { ...x, respuestas: (S.resp.get(id) ?? []).length } : x)); pintarFeed();
  },
  mas: async (el) => {
    el.disabled = true;
    try { const m = await api.cargarMuro(S.p.id, S.items[S.items.length - 1]?.id, 20, S.juego); S.items = [...S.items, ...(m.items ?? [])]; S.hayMas = !!m.hay_mas; await marcadoresMuro(); pintarFeed(); }
    catch (e) { toast(msgErr(e), 'error'); el.disabled = false; }
  },
  'guardar-estilo': async () => {
    const b = document.querySelector('#est-banners [aria-pressed="true"]')?.dataset.banner; const a = document.querySelector('#est-acentos [aria-pressed="true"]')?.dataset.acento;
    const foto = document.getElementById('est-banners').dataset.foto || '';
    if (await seguro(() => api.guardarEstilo(estiloParaGuardar({ bannerId: b, foto, acento: a, lema: document.getElementById('est-lema').value })), 'Estilo guardado.') === undefined) return;
    const anterior = estiloDe(S.p).foto; if (anterior && anterior !== foto) api.quitarImagen(anterior);   // el banner viejo ya no se usa: limpiar el archivo
    await cargar();
  },
  'guardar-priv': async () => {
    if (await seguro(() => api.guardarPrivacidadMuro(document.getElementById('pr-ver').value, document.getElementById('pr-resp').value), 'Privacidad guardada.') !== undefined) await cargar();
  },
};
root.addEventListener('click', (e) => {
  const gu = e.target.closest('[data-guardar]'); if (gu) { alternarGuardado(gu); return; }
  const sw = e.target.closest('[data-banner],[data-acento]');
  if (sw) {
    const grupo = sw.parentElement; grupo.querySelectorAll('button').forEach((b) => b.setAttribute('aria-pressed', String(b === sw)));
    if (sw.dataset.banner && grupo.id === 'est-banners') { grupo.dataset.foto = ''; document.getElementById('est-quitar').hidden = true; document.getElementById('est-foto-estado').textContent = 'JPG, PNG o WebP; se reduce sola a 1600 px.'; }   // elegir un preset descarta la foto
    return;
  }
  const el = e.target.closest('[data-act]'); if (!el) return;
  try { const r = ACCIONES[el.dataset.act]?.(el); if (r?.catch) r.catch((err) => console.error('[perfil] acción:', err)); } catch (err) { console.error('[perfil] acción:', err); toast('No se pudo completar la acción.', 'error'); }
});
root.addEventListener('change', async (e) => {
  const t = e.target;
  if (t.id === 'mu-file') {   // foto del compositor: solo vista previa; se sube al pulsar «Publicar»
    const f = t.files?.[0]; if (!f) return;
    if (!/^image\/(jpeg|png|webp)$/.test(f.type)) { toast('Usa una foto JPG, PNG o WebP.', 'error'); t.value = ''; return; }
    S.vfile = null; const vv = document.getElementById('mu-prev-vid'); if (vv.src?.startsWith('blob:')) URL.revokeObjectURL(vv.src); vv.removeAttribute('src'); vv.hidden = true; document.getElementById('mu-vfile').value = '';   // foto y video son excluyentes
    const img = document.getElementById('mu-prev-img'); if (img.src?.startsWith('blob:')) URL.revokeObjectURL(img.src); img.src = URL.createObjectURL(f); img.hidden = false; document.getElementById('mu-prev').hidden = false;
  } else if (t.id === 'mu-vfile') {   // video del compositor: se valida (tipo, peso y duración) al elegirlo; se sube al pulsar «Publicar»
    const f = t.files?.[0]; if (!f) return;
    const r = await prepararVideo(f); if (!r.ok) { toast(r.error, 'error'); t.value = ''; return; }
    limpiarFoto(); const dt = new DataTransfer(); dt.items.add(f); t.files = dt.files;   // limpiarFoto() también vacía este campo: se vuelve a poner el archivo
    S.vfile = { file: f, ext: r.ext, mime: r.tipo }; const v = document.getElementById('mu-prev-vid'); v.src = URL.createObjectURL(f); v.hidden = false; document.getElementById('mu-prev').hidden = false;
    const link = document.getElementById('mu-video'); link.value = ''; link.hidden = true;   // un video subido reemplaza al enlace
  } else if (t.id === 'cl-vfile') {   // video del clip
    const f = t.files?.[0]; if (!f) return;
    const r = await prepararVideo(f); if (!r.ok) { toast(r.error, 'error'); t.value = ''; return; }
    S.cfile = { file: f, ext: r.ext, mime: r.tipo }; document.getElementById('cl-video').value = '';
    const i = document.getElementById('cl-vinfo'); i.hidden = false; i.innerHTML = `<i class="fa-solid fa-film mr-1"></i>${escapeHTML(f.name)} <button type="button" data-act="quitar-video-clip" class="text-gray-500 hover:text-bad ml-1" aria-label="Quitar video"><i class="fa-solid fa-xmark"></i></button>`;
  } else if (t.id === 'bn-file') {   // banner desde el propio muro: se sube y se guarda al instante (conserva preset, color y lema)
    const f = t.files?.[0]; t.value = ''; if (!f) return;
    if (!/^image\/(jpeg|png|webp)$/.test(f.type)) { toast('Usa una foto JPG, PNG o WebP.', 'error'); return; }
    let url = null;
    try {
      const e = estiloDe(S.p); toast('Subiendo banner…', 'info', { key: 'banner' });
      url = await api.subirImagen(f, S.p.id, 1600);
      await api.guardarEstilo(estiloParaGuardar({ bannerId: e.banner.id, foto: url, acento: e.acento, lema: e.lema }));
      if (e.foto) api.quitarImagen(e.foto);   // el banner anterior ya no se usa
      toast('Banner actualizado.', 'ok'); await cargar();
    } catch (err) { toast(msgErr(err), 'error'); if (url) api.quitarImagen(url); }
  } else if (t.id === 'est-file') {   // foto de banner: se sube ya (para poder previsualizar) y se guarda con «Guardar estilo»
    const f = t.files?.[0]; t.value = ''; if (!f) return;
    if (!/^image\/(jpeg|png|webp)$/.test(f.type)) { toast('Usa una foto JPG, PNG o WebP.', 'error'); return; }
    const estado = document.getElementById('est-foto-estado'); estado.textContent = 'Subiendo…';
    try {
      const pendiente = document.getElementById('est-banners').dataset.foto; const guardada = estiloDe(S.p).foto;
      const url = await api.subirImagen(f, S.p.id, 1600);
      if (pendiente && pendiente !== guardada) api.quitarImagen(pendiente);   // reemplazó una foto que ni se llegó a guardar
      fijarBannerFoto(url);
    } catch (err) { toast(msgErr(err), 'error'); estado.textContent = 'No se pudo subir.'; }
  }
});
root.addEventListener('keydown', (e) => { if (e.key === 'Enter' && e.target.matches('[data-resp-input]')) { e.preventDefault(); e.target.nextElementSibling?.click(); } });
root.addEventListener('input', (e) => { if (e.target.id === 'mu-texto') { const n = e.target.value.trim().length; const c = document.getElementById('mu-cuenta'); c.textContent = `${n} / ${MURO_MAX}`; c.classList.toggle('text-bad', n > MURO_MAX); } });

let clave = null;   // usuario + sesión: si cambia cualquiera de los dos, se vuelve a cargar (p. ej. «soy yo» depende de la sesión)
onSession(({ session, profile }) => {
  S.sesion = session;
  S.usuario = usuarioDeURL(location.search) || (profile?.username ?? '');
  const k = `${S.usuario}|${session?.user?.id ?? ''}`;
  if (k !== clave) { clave = k; cargar(); }
});

// Página /perfil/?u=<usuario>: perfil público + MURO de un jugador (sin ?u= abre el tuyo).
// Esquema: pages (este archivo, pinta y reparte eventos) → features/muro/api (RPC, migración 021) → core/muro (lógica pura) + data/muroEstilo.
import { onSession, isAdmin } from '../core/session.js';
import { toast } from '../core/toast.js';
import { escapeHTML, safeUrl } from '../core/dom.js';
import { href } from '../core/config.js';
import { avatarHTML } from '../core/avatar.js';
import { sanitizarExtras, resumenExtra } from '../core/hostExtras.js';
import { validarTexto, validarRespuesta, resumenReacciones, aplicarReaccion, textoAHTML, tiempoRelativo, estiloDe, estiloParaGuardar, usuarioDeURL } from '../core/muro.js';
import { BANNERS, ACENTOS, MURO_MAX, LEMA_MAX, MURO_VER, MURO_RESPONDER, RESP_MAX, REACCIONES } from '../../data/muroEstilo.js';
import * as api from '../features/muro/api.js';
import { solicitar } from '../features/amigos/api.js';

const root = document.getElementById('muro-root');
const S = { sesion: null, usuario: '', p: null, items: [], hayMas: false, visible: true, cargando: false, editando: null, abiertas: new Set(), resp: new Map() };

const msgErr = (e) => String(e?.message ?? e ?? 'Algo salió mal.').replace(/^.*?:\s*/, (m) => (m.length > 40 ? '' : m));
async function seguro(fn, ok) {
  try { const r = await fn(); if (ok) toast(ok, 'ok'); return r; } catch (e) { toast(msgErr(e), 'error'); return undefined; }
}

/* ---------- Pintado ---------- */
function cabecera(p) {
  const { banner, acento, lema } = estiloDe(p);
  const extras = sanitizarExtras(p.host_extras).map(resumenExtra);
  const chips = [
    p.club_favorito && ['fa-shield-halved', p.club_favorito], p.posicion_preferida && ['fa-location-crosshairs', p.posicion_preferida],
    p.pais_codigo && ['fa-flag', p.pais_codigo], `${p.partidos_jugados ?? 0}` !== '' && ['fa-gamepad', `${p.partidos_jugados ?? 0} partidos`],
    p.rango_fairplay && ['fa-handshake', p.rango_fairplay],
  ].filter(Boolean).map(([i, t]) => `<span class="inline-flex items-center gap-1.5 text-[11px] text-gray-300 bg-black/30 border border-galaxy-border/70 rounded-full px-2.5 py-1"><i class="fa-solid ${i}" style="color:${acento}"></i>${escapeHTML(t)}</span>`).join('');
  const host = p.puede_hostear ? `<p class="text-xs text-gray-300"><i class="fa-solid fa-server mr-1.5" style="color:${acento}"></i>Hostea <b class="text-white">${escapeHTML(p.host_juego || 'PES 2021')}</b>${p.host_parche ? ` (${escapeHTML(p.host_parche)})` : ''}${p.host_sp_version ? ` v${escapeHTML(p.host_sp_version)}` : ''} · ${escapeHTML(p.software_host || 'Parsec')}${extras.length ? ` · extras: ${extras.map(escapeHTML).join(', ')}` : ''}</p>` : '';
  const stream = safeUrl(p.stream_url) ? `<a href="${escapeHTML(safeUrl(p.stream_url))}" target="_blank" rel="noopener noreferrer" class="text-xs text-galaxy-400 underline"><i class="fa-solid fa-tower-broadcast mr-1"></i>Ver su canal</a>` : '';
  const acciones = p.soy_yo
    ? `<button type="button" data-act="panel" data-panel="estilo" class="btn btn-ghost !min-h-9 !px-3 !text-[11px]"><i class="fa-solid fa-palette"></i><span>Estilo</span></button>
       <button type="button" data-act="panel" data-panel="privacidad" class="btn btn-ghost !min-h-9 !px-3 !text-[11px]"><i class="fa-solid fa-shield-halved"></i><span>Privacidad</span></button>`
    : (S.sesion ? `<a href="${escapeHTML(href('mensajes/'))}?con=${escapeHTML(p.id)}" class="btn btn-ghost !min-h-9 !px-3 !text-[11px] !text-galaxy-400 !border-galaxy-400/50"><i class="fa-solid fa-comment-dots"></i><span>Mensaje</span></a>
       <button type="button" data-act="amistad" class="btn btn-ghost !min-h-9 !px-3 !text-[11px]"><i class="fa-solid fa-user-plus"></i><span>Agregar</span></button>`
      : `<span class="text-[11px] text-gray-500">Inicia sesión para escribirle.</span>`);
  return `<section class="rounded-2xl overflow-hidden border border-galaxy-border bg-galaxy-panel" style="--acento:${acento}">
    <div class="h-36 sm:h-52 relative" style="background:${banner.css}"><div class="absolute inset-0 bg-gradient-to-t from-galaxy-panel/80 to-transparent"></div></div>
    <div class="px-4 sm:px-6 pb-5 -mt-10 sm:-mt-12 relative">
      <div class="flex flex-wrap items-end gap-3 sm:gap-4">
        <span class="w-20 h-20 sm:w-24 sm:h-24 rounded-full overflow-hidden flex items-center justify-center bg-galaxy-card border-4 border-galaxy-panel shrink-0" style="box-shadow:0 0 0 2px ${acento}">${avatarHTML(p.avatar_url, p.nombre_display, 96)}</span>
        <div class="min-w-0 flex-1 pt-10 sm:pt-12">
          <h1 class="font-display font-extrabold text-white uppercase tracking-wider text-xl sm:text-2xl truncate">${escapeHTML(p.nombre_display || 'Jugador')}</h1>
          <p class="text-xs text-gray-400">@${escapeHTML(p.username)}</p></div>
        <div class="flex flex-wrap gap-1.5 w-full sm:w-auto sm:pt-12">${acciones}</div>
      </div>
      ${lema ? `<p class="mt-3 text-sm italic" style="color:${acento}">«${escapeHTML(lema)}»</p>` : ''}
      ${p.bio ? `<p class="mt-2 text-sm text-gray-300 whitespace-pre-line">${escapeHTML(p.bio)}</p>` : ''}
      <div class="mt-3 flex flex-wrap gap-1.5">${chips}</div>
      <div class="mt-3 space-y-1.5">${host}${stream}</div>
    </div></section>`;
}

const opcionesSel = (lista, actual) => lista.map(([v, t]) => `<option value="${v}" ${v === actual ? 'selected' : ''}>${t}</option>`).join('');
function panelEstilo(p) {
  const { banner, acento, lema } = estiloDe(p);
  return `<section id="panel-estilo" hidden class="glass-panel rounded-2xl p-4 space-y-3">
    <h2 class="font-display font-bold text-white uppercase text-sm tracking-wider"><i class="fa-solid fa-palette text-galaxy-400 mr-2"></i>Estilo de tu perfil</h2>
    <div><p class="text-[11px] text-gray-400 mb-1.5">Banner</p><div class="grid grid-cols-4 gap-2" id="est-banners">${BANNERS.map((b) => `<button type="button" data-banner="${b.id}" aria-pressed="${b.id === banner.id}" title="${b.label}" class="h-12 rounded-lg border-2 border-transparent aria-pressed:border-white text-[10px] font-bold text-white/90 flex items-end justify-center pb-0.5" style="background:${b.css}">${b.label}</button>`).join('')}</div></div>
    <div><p class="text-[11px] text-gray-400 mb-1.5">Color de acento</p><div class="flex flex-wrap gap-2" id="est-acentos">${ACENTOS.map((c) => `<button type="button" data-acento="${c}" aria-pressed="${c.toLowerCase() === acento.toLowerCase()}" aria-label="Color ${c}" class="w-8 h-8 rounded-full border-2 border-transparent aria-pressed:border-white" style="background:${c}"></button>`).join('')}</div></div>
    <label class="block"><span class="text-[11px] text-gray-400">Tu lema (máx. ${LEMA_MAX})</span><input id="est-lema" maxlength="${LEMA_MAX}" value="${escapeHTML(lema)}" class="mt-1 w-full rounded-lg bg-black/30 border border-galaxy-border px-3 py-2 text-sm text-white" placeholder="Ej.: Juego limpio, remontada segura"></label>
    <p class="text-[11px] text-gray-500">Tu bio y tu club se editan en «Mi perfil». Las fotos de banner llegan en la fase 3.</p>
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
const composer = () => `<section class="glass-panel rounded-2xl p-3 space-y-2">
  <textarea id="mu-texto" rows="3" maxlength="${MURO_MAX + 200}" placeholder="¿Qué quieres contar? Un resultado, una búsqueda de rivales, un enlace de tu clip…" class="w-full rounded-lg bg-black/30 border border-galaxy-border px-3 py-2 text-sm text-white resize-y"></textarea>
  <div class="flex items-center justify-between gap-2"><span id="mu-cuenta" class="text-[11px] text-gray-500">0 / ${MURO_MAX}</span><button type="button" data-act="publicar" class="btn btn-primary !min-h-9 !text-xs"><i class="fa-solid fa-paper-plane"></i><span>Publicar</span></button></div></section>`;

/** Reacciones: con permiso, los 5 botones (el tuyo resaltado, con su conteo); sin permiso, solo los conteos. Más el botón de respuestas. */
function barraReacciones(it, p) {
  const cuentas = new Map(resumenReacciones(it.reacciones).map((x) => [x.tipo, x.n]));
  const botones = p.puede_responder
    ? REACCIONES.map(([t, emoji, tit]) => `<button type="button" data-act="reaccion" data-id="${it.id}" data-tipo="${t}" aria-pressed="${it.mia === t}" title="${tit}" class="rx"><span>${emoji}</span>${cuentas.get(t) ? `<b>${cuentas.get(t)}</b>` : ''}</button>`).join('')
    : [...cuentas].map(([t, n]) => `<span class="rx" title="${REACCIONES.find((r) => r[0] === t)[2]}"><span>${REACCIONES.find((r) => r[0] === t)[1]}</span><b>${n}</b></span>`).join('');
  const n = Number(it.respuestas) || 0;
  return `<div class="flex flex-wrap items-center gap-1.5">${botones}<button type="button" data-act="respuestas" data-id="${it.id}" aria-expanded="${S.abiertas.has(it.id)}" class="ml-auto text-[11px] text-gray-400 hover:text-galaxy-400"><i class="fa-regular fa-comment mr-1"></i>${n ? `${n} respuesta${n === 1 ? '' : 's'}` : (p.puede_responder ? 'Responder' : 'Sin respuestas')}</button></div>`;
}
function seccionRespuestas(it, p) {
  const lista = S.resp.get(it.id);
  const filas = lista === undefined ? '<p class="text-[11px] text-gray-500 py-2">Cargando respuestas…</p>'
    : lista.map((r) => `<div class="flex gap-2 py-1.5"><span class="w-7 h-7 rounded-full overflow-hidden flex items-center justify-center bg-galaxy-card border border-galaxy-border shrink-0">${avatarHTML(r.avatar_url, r.nombre_display, 28)}</span>
        <div class="min-w-0 flex-1 rounded-xl bg-white/[0.03] px-2.5 py-1.5"><p class="text-[11px]"><a href="${escapeHTML(href('perfil/'))}?u=${escapeHTML(r.username)}" class="font-display font-bold text-white hover:text-galaxy-400">${escapeHTML(r.nombre_display)}</a> <span class="text-gray-500">· ${tiempoRelativo(r.created_at)}</span>${r.puedo_borrar ? ` <button type="button" data-act="borrar-resp" data-id="${r.id}" data-pub="${it.id}" title="Borrar respuesta" class="text-gray-500 hover:text-bad ml-1"><i class="fa-solid fa-trash text-[10px]"></i></button>` : ''}</p>
          <p class="text-xs text-gray-200 leading-snug">${textoAHTML(r.texto)}</p></div></div>`).join('');
  const form = p.puede_responder
    ? `<div class="flex gap-2 mt-1"><input data-resp-input="${it.id}" maxlength="${RESP_MAX + 100}" placeholder="Escribe una respuesta…" class="flex-1 min-w-0 rounded-lg bg-black/30 border border-galaxy-border px-3 py-2 text-xs text-white"><button type="button" data-act="enviar-resp" data-id="${it.id}" class="btn btn-primary !min-h-9 !px-3 !text-xs" aria-label="Enviar respuesta"><i class="fa-solid fa-paper-plane"></i></button></div>`
    : `<p class="text-[11px] text-gray-500 mt-1">${S.sesion ? 'Este jugador limita quién puede responder.' : 'Inicia sesión para responder.'}</p>`;
  return `<div class="mt-2">${filas}${form}</div>`;
}
function tarjeta(it, p) {
  const mia = p.soy_yo; const puedeBorrar = mia || isAdmin();
  const menu = (mia || puedeBorrar) ? `<div class="flex gap-1 shrink-0">
    ${mia ? `<button type="button" data-act="fijar" data-id="${it.id}" title="${it.fijada ? 'Quitar de fijada' : 'Fijar arriba'}" class="w-8 h-8 rounded-lg text-gray-400 hover:text-galaxy-400"><i class="fa-solid fa-thumbtack"></i></button>
    <button type="button" data-act="editar" data-id="${it.id}" title="Editar" class="w-8 h-8 rounded-lg text-gray-400 hover:text-galaxy-400"><i class="fa-solid fa-pen"></i></button>` : ''}
    <button type="button" data-act="borrar" data-id="${it.id}" title="Borrar" class="w-8 h-8 rounded-lg text-gray-400 hover:text-bad"><i class="fa-solid fa-trash"></i></button></div>` : '';
  const cuerpo = S.editando === it.id
    ? `<textarea id="mu-edit" rows="3" class="w-full rounded-lg bg-black/30 border border-galaxy-border px-3 py-2 text-sm text-white">${escapeHTML(it.texto)}</textarea>
       <div class="flex gap-2 mt-2"><button type="button" data-act="guardar-edicion" data-id="${it.id}" class="btn btn-primary !min-h-8 !text-xs">Guardar</button><button type="button" data-act="cancelar-edicion" class="btn btn-ghost !min-h-8 !text-xs">Cancelar</button></div>`
    : `<p class="text-sm text-gray-100 leading-relaxed">${textoAHTML(it.texto)}</p>`;
  const pie = `<footer class="mt-3 pt-2 border-t border-galaxy-border/60">${barraReacciones(it, p)}${S.abiertas.has(it.id) ? seccionRespuestas(it, p) : ''}</footer>`;
  return `<article class="glass-panel rounded-2xl p-3 sm:p-4 ${it.fijada ? 'border border-galaxy-400/40' : ''}">
    <header class="flex items-center gap-2.5 mb-2">
      <span class="w-9 h-9 rounded-full overflow-hidden flex items-center justify-center bg-galaxy-card border border-galaxy-border shrink-0">${avatarHTML(p.avatar_url, p.nombre_display, 36)}</span>
      <div class="min-w-0 flex-1"><p class="font-display font-bold text-white text-sm truncate">${escapeHTML(p.nombre_display)}</p>
        <p class="text-[11px] text-gray-500">${it.fijada ? '<i class="fa-solid fa-thumbtack text-galaxy-400 mr-1"></i>Fijada · ' : ''}${tiempoRelativo(it.created_at)}${it.editada_at ? ' · editada' : ''}</p></div>${menu}</header>${cuerpo}${S.editando === it.id ? '' : pie}</article>`;
}
function feed(p) {
  if (!S.visible) return `<div class="glass-panel rounded-2xl p-8 text-center text-gray-400 text-sm"><i class="fa-solid fa-lock text-2xl text-gray-500 mb-2 block"></i>Este jugador comparte su muro solo con sus amigos.</div>`;
  if (!S.items.length) return `<div class="glass-panel rounded-2xl p-8 text-center text-gray-500 text-xs">${p.soy_yo ? 'Tu muro está vacío. ¡Publica lo primero!' : 'Aún no ha publicado nada.'}</div>`;
  return S.items.map((it) => tarjeta(it, p)).join('') + (S.hayMas ? `<button type="button" data-act="mas" class="btn btn-ghost w-full !text-xs">Cargar más</button>` : '');
}
function pintar() {
  const p = S.p;
  root.innerHTML = `<div class="space-y-4">${cabecera(p)}${p.soy_yo ? panelEstilo(p) + panelPrivacidad(p) : ''}
    <div class="space-y-3 max-w-2xl mx-auto w-full">${p.soy_yo ? composer() : ''}<div id="mu-feed" class="space-y-3">${feed(p)}</div></div></div>`;
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
    S.visible = m.visible; S.items = m.items ?? []; S.hayMas = !!m.hay_mas;
    document.title = `${p.nombre_display} · Muro`;
    pintar();
  } catch (e) { console.error('[perfil] carga:', e); root.innerHTML = '<div class="glass-panel rounded-2xl p-8 text-center text-bad text-sm">No se pudo cargar el perfil. Intenta de nuevo en un momento.</div>'; }
}
async function refrescarMuro() { const m = await api.cargarMuro(S.p.id); S.items = m.items ?? []; S.hayMas = !!m.hay_mas; S.visible = m.visible; pintarFeed(); }

/* ---------- Eventos ---------- */
const ACCIONES = {
  panel: (el) => { ['estilo', 'privacidad'].forEach((n) => { const x = document.getElementById(`panel-${n}`); if (x) x.hidden = n !== el.dataset.panel ? true : !x.hidden; }); },
  'cerrar-panel': () => { document.getElementById('panel-estilo').hidden = true; document.getElementById('panel-privacidad').hidden = true; },
  amistad: () => seguro(() => solicitar(S.p.id), 'Solicitud enviada.'),
  publicar: async () => {
    const v = validarTexto(document.getElementById('mu-texto').value);
    if (!v.ok) { toast(v.error, 'error'); return; }
    if (await seguro(() => api.publicar(v.texto), 'Publicado.') !== undefined) { document.getElementById('mu-texto').value = ''; document.getElementById('mu-cuenta').textContent = `0 / ${MURO_MAX}`; await refrescarMuro(); }
  },
  fijar: async (el) => { const id = Number(el.dataset.id); const it = S.items.find((x) => x.id === id); if (await seguro(() => api.fijar(id, !it?.fijada)) !== undefined) await refrescarMuro(); },
  editar: (el) => { S.editando = Number(el.dataset.id); pintarFeed(); },
  'cancelar-edicion': () => { S.editando = null; pintarFeed(); },
  'guardar-edicion': async (el) => {
    const v = validarTexto(document.getElementById('mu-edit').value); if (!v.ok) { toast(v.error, 'error'); return; }
    if (await seguro(() => api.editar(Number(el.dataset.id), v.texto), 'Cambios guardados.') !== undefined) { S.editando = null; await refrescarMuro(); }
  },
  borrar: async (el) => { if (!window.confirm('¿Borrar esta publicación? No se puede deshacer.')) return; if (await seguro(() => api.borrar(Number(el.dataset.id)), 'Publicación borrada.') !== undefined) await refrescarMuro(); },
  reaccion: async (el) => {
    const id = Number(el.dataset.id); const it = S.items.find((x) => x.id === id); if (!it) return;
    const final = await seguro(() => api.reaccionar(id, el.dataset.tipo)); if (final === undefined) return;   // undefined = falló (ya se avisó); null = quité mi reacción
    S.items = S.items.map((x) => (x.id === id ? aplicarReaccion(x, final) : x)); pintarFeed();
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
  'borrar-resp': async (el) => {
    if (!window.confirm('¿Borrar esta respuesta?')) return;
    const id = Number(el.dataset.pub);
    if (await seguro(() => api.borrarRespuesta(Number(el.dataset.id)), 'Respuesta borrada.') === undefined) return;
    S.resp.set(id, await api.respuestasDe(id).catch(() => []));
    S.items = S.items.map((x) => (x.id === id ? { ...x, respuestas: (S.resp.get(id) ?? []).length } : x)); pintarFeed();
  },
  mas: async (el) => {
    el.disabled = true;
    try { const m = await api.cargarMuro(S.p.id, S.items[S.items.length - 1]?.id); S.items = [...S.items, ...(m.items ?? [])]; S.hayMas = !!m.hay_mas; pintarFeed(); }
    catch (e) { toast(msgErr(e), 'error'); el.disabled = false; }
  },
  'guardar-estilo': async () => {
    const b = document.querySelector('#est-banners [aria-pressed="true"]')?.dataset.banner; const a = document.querySelector('#est-acentos [aria-pressed="true"]')?.dataset.acento;
    if (await seguro(() => api.guardarEstilo(estiloParaGuardar({ bannerId: b, acento: a, lema: document.getElementById('est-lema').value })), 'Estilo guardado.') !== undefined) await cargar();
  },
  'guardar-priv': async () => {
    if (await seguro(() => api.guardarPrivacidadMuro(document.getElementById('pr-ver').value, document.getElementById('pr-resp').value), 'Privacidad guardada.') !== undefined) await cargar();
  },
};
root.addEventListener('click', (e) => {
  const sw = e.target.closest('[data-banner],[data-acento]');
  if (sw) { const grupo = sw.parentElement; grupo.querySelectorAll('button').forEach((b) => b.setAttribute('aria-pressed', String(b === sw))); return; }
  const el = e.target.closest('[data-act]'); if (!el) return;
  try { const r = ACCIONES[el.dataset.act]?.(el); if (r?.catch) r.catch((err) => console.error('[perfil] acción:', err)); } catch (err) { console.error('[perfil] acción:', err); toast('No se pudo completar la acción.', 'error'); }
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

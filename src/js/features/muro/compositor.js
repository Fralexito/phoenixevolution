// COMPOSITOR de /social/ (19-oct-2026, Fralex: «que la sección para publicar se vea más personalizable y con más libertad… super dinámico,
// visual, ordenado y muy gráfico… que se sienta como una red social; agarra todas las características de otras redes sociales»).
//   · En el feed: barra «¿Qué está pasando?» + accesos rápidos (Foto/video · Encuesta · Cómo te sientes · Fondo).
//   · Al tocar: ventana «Crear publicación» (como Facebook; en el celular, pantalla completa) con:
//       fondos de color para textos cortos (Facebook) · «cómo te sientes / qué haces» (Facebook) · hasta 4 fotos en galería (Instagram)
//       o 1 video · enlace de YouTube/TikTok/Kick/Twitch · encuesta (X/Twitter) · adjuntar un duelo verificado · juego · emojis ·
//       @menciones y #etiquetas · contador circular (X) · borrador que se guarda solo (X/LinkedIn) · pegar o arrastrar fotos · Ctrl+Enter.
// Reglas: las mismas de siempre en la BD (muro_publicar vía muro_publicar_completo, migración 133; encuestas con crear_encuesta, 040).
// Capa DOM: valida con core/comunidad/muro.js y videoSubida.js (vía prepararVideo), sube con api.js y avisa con `onPublicado()`.
import { escapeHTML } from '../../core/sistema/dom.js';
import { toast } from '../../core/sistema/toast.js';
import { avatarHTML } from '../../core/sistema/avatar.js';
import { validarTexto, analizarVideo, segmentoParaGuardar, etiquetaOpcionReto, etiquetaSegmento } from '../../core/comunidad/muro.js';
import { VIDEO_MAX_SEG } from '../../core/comunidad/videoSubida.js';
import { MURO_MAX, SEGMENTOS, FONDOS_POST, FONDO_MAX_TEXTO, SENTIMIENTOS, FOTOS_MAX, PALETA_EMOJIS } from '../../../data/muroEstilo.js';
import * as api from './api.js';
import * as encuestas from '../encuestas/api.js';
import { prepararVideo } from './media.js';
import { recordarExtra, fondoPorId, sentimientoPorId } from './extras.js';

const msgErr = (e) => String(e?.message ?? e ?? 'Algo salió mal.');
const CLAVE_BORRADOR = 'pes-borrador-publicacion';
const FOTO_OK = /^image\/(jpeg|png|webp)$/;
const leerBorrador = () => { try { return JSON.parse(localStorage.getItem(CLAVE_BORRADOR) || 'null'); } catch { return null; } };
const guardarBorrador = (b) => { try { if (b) localStorage.setItem(CLAVE_BORRADOR, JSON.stringify(b)); else localStorage.removeItem(CLAVE_BORRADOR); } catch { /* sin almacenamiento */ } };

// Herramientas de «Añade a tu publicación» (cada una con su color, como en Facebook).
const HERRAMIENTAS = [
  ['foto', 'fa-photo-film', 'Foto o video', '#34d399'], ['encuesta', 'fa-chart-simple', 'Encuesta', '#fb923c'], ['sentimiento', 'fa-face-smile', 'Cómo te sientes', '#fbbf24'],
  ['fondo', 'fa-palette', 'Fondo', '#f472b6'], ['enlace', 'fa-link', 'Enlace', '#60a5fa'], ['duelo', 'fa-gamepad', 'Duelo', '#a78bfa'],
  ['juego', 'fa-futbol', 'Juego', '#22d3ee'], ['emoji', 'fa-icons', 'Emojis', '#facc15'],
];

/**
 * Pinta el compositor dentro de `host`. Devuelve { destruir, abrir }.
 * @param {HTMLElement} host
 * @param {{ yo: string|null, perfil: object|null, onLogin: () => void, onPublicado: () => void }} cfg
 */
export function montarCompositor(host, { yo, perfil, onLogin, onPublicado }) {
  if (!yo) {
    host.innerHTML = `<div class="px-disparador px-invita"><span class="px-av px-av-vacio" aria-hidden="true"><i class="fa-solid fa-pen"></i></span>
      <p class="flex-1">Entra para publicar fotos, videos, encuestas y tus resultados.</p><button type="button" data-sx-login class="btn btn-primary !min-h-9 !text-xs">Entrar</button></div>`;
    const b = host.querySelector('[data-sx-login]'); const h = () => onLogin?.(); b.addEventListener('click', h);
    return { destruir: () => b.removeEventListener('click', h), abrir: () => onLogin?.() };
  }
  const nombre = perfil?.nombre_display || perfil?.username || 'jugador';
  const primer = escapeHTML(String(nombre).split(/\s+/)[0]);
  const av = avatarHTML(perfil?.avatar_url, nombre, 44);

  // ── Disparador en el feed ──
  host.innerHTML = `<div class="px-disparador">
    <span class="px-av" aria-hidden="true">${av}</span>
    <button type="button" class="px-abrir" data-px-abrir="">¿Qué está pasando, ${primer}?</button>
    <div class="px-rapidos">${HERRAMIENTAS.slice(0, 4).map(([id, ic, t, c]) => `<button type="button" data-px-abrir="${id}" style="--c:${c}" title="${t}"><i class="fa-solid ${ic}" aria-hidden="true"></i><span>${t}</span></button>`).join('')}</div>
  </div>`;

  // ── Ventana «Crear publicación» ──
  const dlg = document.createElement('dialog'); dlg.className = 'px-modal'; dlg.setAttribute('aria-labelledby', 'px-titulo');
  dlg.innerHTML = `<div class="px-caja">
    <header class="px-cab"><h2 id="px-titulo">Crear publicación</h2><button type="button" class="px-x" data-px-cerrar aria-label="Cerrar"><i class="fa-solid fa-xmark" aria-hidden="true"></i></button></header>
    <div class="px-cuerpo">
      <div class="px-autor"><span class="px-av" aria-hidden="true">${av}</span>
        <div class="min-w-0"><p class="px-nombre"><b>${escapeHTML(nombre)}</b><span id="px-siente"></span></p>
          <div class="px-pills"><button type="button" class="px-pill" data-px-panel="juego"><i class="fa-solid fa-futbol" aria-hidden="true"></i><span id="px-juego-t">Todos los juegos</span><i class="fa-solid fa-chevron-down px-pill-v" aria-hidden="true"></i></button>
            <span class="px-pill px-pill-info"><i class="fa-solid fa-earth-americas" aria-hidden="true"></i>Social y tu muro</span></div></div></div>
      <p class="px-borrador" id="px-borrador" hidden><i class="fa-solid fa-clock-rotate-left" aria-hidden="true"></i> Recuperamos tu borrador. <button type="button" data-px-descartar>Descartar</button></p>
      <div class="px-lienzo" id="px-lienzo">
        <textarea id="px-texto" data-menciones rows="3" maxlength="${MURO_MAX + 200}" aria-label="Escribe tu publicación" placeholder="¿Qué está pasando, ${primer}?"></textarea>
      </div>
      <div class="px-panel" id="px-p-fondo" hidden><div class="px-fondos" role="radiogroup" aria-label="Fondo del texto">
        <button type="button" class="px-fondo-op px-fondo-no" data-px-fondo="" role="radio" aria-label="Sin fondo" title="Sin fondo"><i class="fa-solid fa-ban" aria-hidden="true"></i></button>
        ${FONDOS_POST.map((f) => `<button type="button" class="px-fondo-op" data-px-fondo="${f.id}" role="radio" aria-label="${escapeHTML(f.label)}" title="${escapeHTML(f.label)}" style="background:${f.css}"></button>`).join('')}</div>
        <p class="px-nota">El fondo se usa con textos de hasta ${FONDO_MAX_TEXTO} letras y sin foto ni video.</p></div>
      <div class="px-adjuntos" id="px-adjuntos"></div>
      <div class="px-panel" id="px-p-enlace" hidden><label class="px-campo"><i class="fa-solid fa-link" aria-hidden="true"></i><input id="px-link" maxlength="300" placeholder="Pega un enlace de YouTube, TikTok, Kick o Twitch" autocomplete="off"></label></div>
      <div class="px-panel" id="px-p-encuesta" hidden>
        <p class="px-panel-t"><i class="fa-solid fa-chart-simple" aria-hidden="true"></i> Encuesta <small>Tu texto de arriba es la pregunta</small></p>
        <div class="px-opciones" id="px-opciones"></div>
        <button type="button" class="px-mas-op" data-px-mas-op><i class="fa-solid fa-circle-plus" aria-hidden="true"></i> Añadir opción</button>
        <div class="px-dias" role="radiogroup" aria-label="Duración"><span>Dura</span>${[1, 3, 7].map((d) => `<button type="button" role="radio" data-px-dias="${d}">${d} día${d === 1 ? '' : 's'}</button>`).join('')}</div>
        <button type="button" class="px-quitar-panel" data-px-quitar="encuesta">Quitar encuesta</button></div>
      <div class="px-panel" id="px-p-sentimiento" hidden>
        <p class="px-panel-t">¿Cómo te sientes?</p><div class="px-sents">${SENTIMIENTOS.filter((s) => !s.actividad).map((s) => `<button type="button" data-px-sent="${s.id}"><span aria-hidden="true">${s.emoji}</span>${escapeHTML(s.t)}</button>`).join('')}</div>
        <p class="px-panel-t">¿Qué estás haciendo?</p><div class="px-sents">${SENTIMIENTOS.filter((s) => s.actividad).map((s) => `<button type="button" data-px-sent="${s.id}"><span aria-hidden="true">${s.emoji}</span>${escapeHTML(s.t)}</button>`).join('')}</div></div>
      <div class="px-panel" id="px-p-juego" hidden><p class="px-panel-t">¿De qué juego es?</p><div class="px-sents">
        <button type="button" data-px-juego="">🌐 Todos los juegos</button>${SEGMENTOS.map(([id, n]) => `<button type="button" data-px-juego="${id}">🎮 ${escapeHTML(n)}</button>`).join('')}</div></div>
      <div class="px-panel" id="px-p-duelo" hidden><p class="px-panel-t">Adjunta un duelo tuyo <small>Se muestra como «Duelo verificado»</small></p><div class="px-duelos" id="px-duelos"><p class="px-nota">Cargando tus duelos…</p></div></div>
      <div class="px-panel" id="px-p-emoji" hidden><div class="px-emojis">${PALETA_EMOJIS.map((e) => `<button type="button" data-px-emoji="${e}" aria-label="Insertar ${e}">${e}</button>`).join('')}</div></div>
      <div class="px-anadir">
        <p>Añade a tu publicación</p>
        <div class="px-herr">${HERRAMIENTAS.map(([id, ic, t, c]) => `<button type="button" data-px-herr="${id}" style="--c:${c}" title="${t}" aria-label="${t}" aria-pressed="false"><i class="fa-solid ${ic}" aria-hidden="true"></i></button>`).join('')}
          <button type="button" data-px-insertar="@" style="--c:#38bdf8" title="Mencionar a alguien" aria-label="Mencionar a alguien"><b aria-hidden="true">@</b></button>
          <button type="button" data-px-insertar="#" style="--c:#c084fc" title="Etiqueta (#)" aria-label="Añadir una etiqueta"><b aria-hidden="true">#</b></button></div>
      </div>
      <input type="file" id="px-file" accept="image/jpeg,image/png,image/webp,video/mp4,video/webm,video/quicktime" multiple hidden>
    </div>
    <div class="px-pie">
      <span class="px-anillo" id="px-anillo" aria-hidden="true"><svg viewBox="0 0 36 36"><circle cx="18" cy="18" r="15" class="px-anillo-f"/><circle cx="18" cy="18" r="15" class="px-anillo-v" id="px-anillo-v"/></svg><b id="px-restan"></b></span>
      <span class="px-ayuda">Ctrl + Enter para publicar</span>
      <button type="button" class="px-publicar" id="px-ok" disabled><span>Publicar</span><i class="fa-solid fa-paper-plane" aria-hidden="true"></i></button>
    </div>
  </div>`;
  document.body.append(dlg);

  const $ = (s) => dlg.querySelector(s); const texto = $('#px-texto');
  const S = { fotos: [], video: null, fondo: null, sentimiento: null, juego: '', reto: null, encuesta: null, panel: null, enlaceAbierto: false, misRetos: null, publicando: false };

  // ── Pintar ──
  const hayMedios = () => S.fotos.length > 0 || !!S.video;
  const fondoActivo = () => !!(S.fondo && !hayMedios() && !S.encuesta && !S.reto && !$('#px-link').value.trim() && texto.value.trim().length <= FONDO_MAX_TEXTO);
  function pintarAdjuntos() {
    const cont = $('#px-adjuntos'); let html = '';
    if (S.fotos.length) html += `<div class="px-fotos" data-n="${S.fotos.length}">${S.fotos.map((f, i) => `<figure><img src="${f.url}" alt="Foto ${i + 1}"><button type="button" data-px-quitar-foto="${i}" aria-label="Quitar foto ${i + 1}"><i class="fa-solid fa-xmark" aria-hidden="true"></i></button>${i === 0 ? '<span>Principal</span>' : ''}</figure>`).join('')}
      ${S.fotos.length < FOTOS_MAX ? `<button type="button" class="px-foto-mas" data-px-herr="foto"><i class="fa-solid fa-circle-plus" aria-hidden="true"></i><span>${FOTOS_MAX - S.fotos.length} más</span></button>` : ''}</div>`;
    if (S.video) html += `<div class="px-video"><video src="${S.video.url}" muted playsinline controls></video><button type="button" data-px-quitar-video aria-label="Quitar video"><i class="fa-solid fa-xmark" aria-hidden="true"></i></button></div>`;
    if (S.reto) html += `<div class="px-chip-adj"><i class="fa-solid fa-gamepad" aria-hidden="true"></i><span>${escapeHTML(etiquetaOpcionReto(S.reto))}</span><button type="button" data-px-quitar="duelo" aria-label="Quitar duelo"><i class="fa-solid fa-xmark" aria-hidden="true"></i></button></div>`;
    if (!hayMedios() && !S.reto && !S.encuesta && !S.enlaceAbierto && !S.fondo) html += `<button type="button" class="px-soltar" data-px-herr="foto"><i class="fa-solid fa-photo-film" aria-hidden="true"></i><b>Añade fotos o un video</b><small>Toca, arrastra aquí o pega con Ctrl+V · hasta ${FOTOS_MAX} fotos o 1 video de ${VIDEO_MAX_SEG} s</small></button>`;
    cont.innerHTML = html;
  }
  function pintarOpciones() {
    if (!S.encuesta) return;
    $('#px-opciones').innerHTML = S.encuesta.opciones.map((o, i) => `<label class="px-op"><span>${i + 1}</span><input data-px-op="${i}" maxlength="40" value="${escapeHTML(o)}" placeholder="Opción ${i + 1}">${i > 1 ? `<button type="button" data-px-quitar-op="${i}" aria-label="Quitar opción ${i + 1}"><i class="fa-solid fa-xmark" aria-hidden="true"></i></button>` : ''}</label>`).join('');
    $('[data-px-mas-op]').hidden = S.encuesta.opciones.length >= 4;
    dlg.querySelectorAll('[data-px-dias]').forEach((b) => b.setAttribute('aria-checked', String(Number(b.dataset.pxDias) === S.encuesta.dias)));
  }
  function pintar() {
    const n = texto.value.length; const f = fondoActivo() ? fondoPorId(S.fondo) : null;
    const lienzo = $('#px-lienzo'); lienzo.classList.toggle('con-fondo', !!f); lienzo.style.background = f ? f.css : '';
    texto.classList.toggle('px-grande', !f && !hayMedios() && !S.encuesta && n > 0 && n < 90);
    texto.placeholder = S.encuesta ? 'Escribe tu pregunta…' : `¿Qué está pasando, ${String(nombre).split(/\s+/)[0]}?`;
    const s = sentimientoPorId(S.sentimiento);
    $('#px-siente').innerHTML = s ? ` <span class="px-siente-chip">${s.actividad ? 'está' : 'se siente'} <b>${escapeHTML(s.t)}</b> ${s.emoji}<button type="button" data-px-quitar="sentimiento" aria-label="Quitar">×</button></span>` : '';
    $('#px-juego-t').textContent = S.juego ? etiquetaSegmento(S.juego) : 'Todos los juegos';
    dlg.querySelectorAll('[data-px-fondo]').forEach((b) => b.setAttribute('aria-checked', String((b.dataset.pxFondo || null) === S.fondo)));
    dlg.querySelectorAll('[data-px-sent]').forEach((b) => b.setAttribute('aria-pressed', String(b.dataset.pxSent === S.sentimiento)));
    dlg.querySelectorAll('[data-px-juego]').forEach((b) => b.setAttribute('aria-pressed', String(b.dataset.pxJuego === S.juego)));
    // Qué herramientas tienen sentido ahora (como en Facebook: con encuesta no hay fotos ni fondo; con video no hay más fotos…)
    const off = { foto: !!S.encuesta || !!S.video || S.fotos.length >= FOTOS_MAX, fondo: !!S.encuesta || hayMedios() || !!S.reto, encuesta: hayMedios() || !!S.reto || !!S.fondo,
      enlace: !!S.encuesta || !!S.video, duelo: !!S.encuesta, sentimiento: !!S.encuesta };
    const activo = { foto: hayMedios(), encuesta: !!S.encuesta, sentimiento: !!S.sentimiento, fondo: !!S.fondo, enlace: S.enlaceAbierto, duelo: !!S.reto, juego: !!S.juego };
    dlg.querySelectorAll('.px-herr [data-px-herr]').forEach((b) => { const id = b.dataset.pxHerr; b.disabled = !!off[id]; b.setAttribute('aria-pressed', String(!!activo[id] || S.panel === id)); });
    for (const p of ['fondo', 'sentimiento', 'juego', 'duelo', 'emoji']) $(`#px-p-${p}`).hidden = S.panel !== p;
    $('#px-p-encuesta').hidden = !S.encuesta; $('#px-p-enlace').hidden = !S.enlaceAbierto;
    // Anillo de caracteres (como X): se llena y cambia de color al acercarse al máximo.
    const lim = f ? FONDO_MAX_TEXTO : MURO_MAX; const p = Math.min(1, n / lim);
    $('#px-anillo-v').style.strokeDashoffset = String(94.25 * (1 - p)); $('#px-anillo').dataset.estado = n > lim ? 'pasado' : p > 0.9 ? 'cerca' : '';
    $('#px-restan').textContent = p > 0.8 ? String(lim - n) : '';
    $('#px-ok').disabled = S.publicando || !(texto.value.trim() || hayMedios() || S.reto || $('#px-link').value.trim());
    pintarAdjuntos();
  }

  // ── Borrador (se guarda solo) ──
  let tBorr = 0;
  const guardarPronto = () => { clearTimeout(tBorr); tBorr = setTimeout(() => guardarBorrador(texto.value.trim() || S.fondo || S.sentimiento ? { texto: texto.value, fondo: S.fondo, sentimiento: S.sentimiento, juego: S.juego } : null), 400); };

  // ── Texto ──
  const autoAltura = () => { texto.style.height = 'auto'; texto.style.height = `${Math.min(texto.scrollHeight, window.innerHeight * 0.42)}px`; };

  // ── Abrir / cerrar ──
  function abrir(herr = '') {
    const b = leerBorrador();
    if (b && !texto.value) {
      texto.value = String(b.texto ?? '').slice(0, MURO_MAX + 200); S.fondo = fondoPorId(b.fondo) ? b.fondo : null; S.sentimiento = sentimientoPorId(b.sentimiento) ? b.sentimiento : null;
      S.juego = SEGMENTOS.some(([id]) => id === b.juego) ? b.juego : ''; $('#px-borrador').hidden = !texto.value.trim();
    }
    if (!dlg.open) dlg.showModal();
    pintar(); autoAltura();
    if (herr) usarHerramienta(herr); else requestAnimationFrame(() => texto.focus());
  }
  const cerrar = () => { guardarPronto(); dlg.close(); };
  const alAbrir = (e) => { const b = e.target.closest('[data-px-abrir]'); if (b) abrir(b.dataset.pxAbrir); };
  host.addEventListener('click', alAbrir);
  dlg.addEventListener('click', (e) => { if (e.target === dlg) cerrar(); });   // tocar fuera de la caja cierra (el borrador queda guardado)
  dlg.addEventListener('cancel', () => guardarPronto());

  // ── Herramientas ──
  function usarHerramienta(id) {
    if (id === 'foto') { $('#px-file').click(); return; }
    if (id === 'encuesta') {
      if (S.encuesta) S.encuesta = null;
      else { S.encuesta = { opciones: ['', ''], dias: 3 }; S.panel = null; S.fondo = null; S.enlaceAbierto = false; S.sentimiento = null; pintarOpciones(); setTimeout(() => (texto.value.trim() ? $('[data-px-op="0"]') : texto)?.focus(), 30); }
      pintar(); return;
    }
    if (id === 'enlace') { S.enlaceAbierto = !S.enlaceAbierto; if (!S.enlaceAbierto) $('#px-link').value = ''; pintar(); if (S.enlaceAbierto) $('#px-link').focus(); return; }
    S.panel = S.panel === id ? null : id; pintar();
    if (id === 'duelo' && S.panel === 'duelo') cargarDuelos();
  }
  async function cargarDuelos() {
    const caja = $('#px-duelos');
    if (!S.misRetos) { try { S.misRetos = (await api.misPartidos()) ?? []; } catch (e) { caja.innerHTML = `<p class="px-nota">${escapeHTML(msgErr(e))}</p>`; return; } }
    caja.innerHTML = S.misRetos.length ? S.misRetos.slice(0, 12).map((r, i) => `<button type="button" data-px-reto="${i}"><i class="fa-solid fa-gamepad" aria-hidden="true"></i><span>${escapeHTML(etiquetaOpcionReto(r))}</span></button>`).join('')
      : '<p class="px-nota">Aún no tienes duelos aceptados o terminados para adjuntar.</p>';
  }
  function insertar(t) {
    const a = texto.selectionStart ?? texto.value.length; const b = texto.selectionEnd ?? a;
    const antes = texto.value.slice(0, a); const sep = (t === '@' || t === '#') && antes && !/\s$/.test(antes) ? ' ' : '';
    texto.setRangeText(sep + t, a, b, 'end'); texto.focus(); texto.dispatchEvent(new Event('input', { bubbles: true }));
  }
  dlg.addEventListener('click', (e) => {
    const t = e.target.closest('button'); if (!t || !dlg.contains(t)) return;
    const d = t.dataset;
    if ('pxCerrar' in d) cerrar();
    else if (d.pxHerr) usarHerramienta(d.pxHerr);
    else if (d.pxPanel) { S.panel = S.panel === d.pxPanel ? null : d.pxPanel; pintar(); }
    else if ('pxFondo' in d) { S.fondo = d.pxFondo || null; pintar(); guardarPronto(); texto.focus(); }
    else if (d.pxSent) { S.sentimiento = S.sentimiento === d.pxSent ? null : d.pxSent; S.panel = null; pintar(); guardarPronto(); }
    else if ('pxJuego' in d) { S.juego = d.pxJuego; S.panel = null; pintar(); guardarPronto(); }
    else if (d.pxReto) { S.reto = S.misRetos?.[Number(d.pxReto)] ?? null; S.panel = null; pintar(); }
    else if (d.pxEmoji) insertar(d.pxEmoji);
    else if (d.pxInsertar) insertar(d.pxInsertar);
    else if (d.pxQuitar === 'sentimiento') { S.sentimiento = null; pintar(); guardarPronto(); }
    else if (d.pxQuitar === 'duelo') { S.reto = null; pintar(); }
    else if (d.pxQuitar === 'encuesta') usarHerramienta('encuesta');
    else if (d.pxQuitarFoto) { const [f] = S.fotos.splice(Number(d.pxQuitarFoto), 1); if (f) URL.revokeObjectURL(f.url); pintar(); }
    else if ('pxQuitarVideo' in d) { if (S.video) URL.revokeObjectURL(S.video.url); S.video = null; pintar(); }
    else if ('pxMasOp' in d) { if (S.encuesta && S.encuesta.opciones.length < 4) { S.encuesta.opciones.push(''); pintarOpciones(); $(`[data-px-op="${S.encuesta.opciones.length - 1}"]`)?.focus(); } }
    else if (d.pxQuitarOp) { S.encuesta?.opciones.splice(Number(d.pxQuitarOp), 1); pintarOpciones(); }
    else if (d.pxDias) { if (S.encuesta) { S.encuesta.dias = Number(d.pxDias); pintarOpciones(); } }
    else if ('pxDescartar' in d) { texto.value = ''; S.fondo = null; S.sentimiento = null; S.juego = ''; guardarBorrador(null); $('#px-borrador').hidden = true; pintar(); autoAltura(); texto.focus(); }
  });
  dlg.addEventListener('input', (e) => { if (e.target.dataset?.pxOp != null && S.encuesta) S.encuesta.opciones[Number(e.target.dataset.pxOp)] = e.target.value; if (e.target.id === 'px-link') pintar(); });
  texto.addEventListener('input', () => { pintar(); autoAltura(); guardarPronto(); });
  texto.addEventListener('keydown', (e) => { if ((e.ctrlKey || e.metaKey) && e.key === 'Enter') { e.preventDefault(); publicar(); } });

  // ── Fotos y video: elegir, pegar o arrastrar ──
  async function agregarArchivos(lista) {
    const files = [...(lista ?? [])]; if (!files.length) return;
    const vid = files.find((f) => !FOTO_OK.test(f.type));
    if (vid) {
      if (S.fotos.length) { toast('Elige fotos o un video, no los dos a la vez.', 'warn'); return; }
      const r = await prepararVideo(vid); if (!r.ok) { toast(r.error, 'error'); return; }
      if (S.video) URL.revokeObjectURL(S.video.url);
      S.video = { file: vid, ext: r.ext, mime: r.tipo, url: URL.createObjectURL(vid) }; S.fondo = null; S.enlaceAbierto = false; $('#px-link').value = ''; pintar(); return;
    }
    if (S.video) { toast('Quita el video para subir fotos.', 'warn'); return; }
    const libres = FOTOS_MAX - S.fotos.length; const fotos = files.filter((f) => FOTO_OK.test(f.type));
    if (fotos.length > libres) toast(`Máximo ${FOTOS_MAX} fotos por publicación.`, 'warn');
    for (const f of fotos.slice(0, libres)) S.fotos.push({ file: f, url: URL.createObjectURL(f) });
    if (S.fotos.length) S.fondo = null;
    pintar();
  }
  $('#px-file').addEventListener('change', (e) => { agregarArchivos(e.target.files); e.target.value = ''; });
  texto.addEventListener('paste', (e) => { const fs = [...(e.clipboardData?.files ?? [])]; if (fs.length) { e.preventDefault(); agregarArchivos(fs); } });
  const caja = $('.px-caja');
  caja.addEventListener('dragover', (e) => { if (e.dataTransfer?.types?.includes('Files')) { e.preventDefault(); caja.classList.add('px-soltando'); } });
  caja.addEventListener('dragleave', (e) => { if (!caja.contains(e.relatedTarget)) caja.classList.remove('px-soltando'); });
  caja.addEventListener('drop', (e) => { if (!e.dataTransfer?.files?.length) return; e.preventDefault(); caja.classList.remove('px-soltando'); agregarArchivos(e.dataTransfer.files); });

  // ── Publicar ──
  function reiniciar() {
    for (const f of S.fotos) URL.revokeObjectURL(f.url); if (S.video) URL.revokeObjectURL(S.video.url);
    Object.assign(S, { fotos: [], video: null, fondo: null, sentimiento: null, juego: '', reto: null, encuesta: null, panel: null, enlaceAbierto: false });
    texto.value = ''; $('#px-link').value = ''; $('#px-borrador').hidden = true; guardarBorrador(null); pintar(); autoAltura();
  }
  function exito() { toast('¡Publicado!', 'ok'); reiniciar(); dlg.close(); onPublicado?.(); }
  async function publicar() {
    if (S.publicando || $('#px-ok').disabled) return;
    const ok = $('#px-ok'); const etiqueta = ok.querySelector('span');
    // Encuesta: la pregunta es el texto (reglas de crear_encuesta: 3–280 letras, 2–4 opciones de hasta 40, 1–7 días).
    if (S.encuesta) {
      const pregunta = texto.value.trim(); const opciones = S.encuesta.opciones.map((o) => o.trim()).filter(Boolean);
      if (pregunta.length < 3 || pregunta.length > 280) { toast('La pregunta debe tener entre 3 y 280 letras.', 'error'); return; }
      if (opciones.length < 2) { toast('Pon al menos 2 opciones.', 'error'); return; }
      S.publicando = true; ok.disabled = true; etiqueta.textContent = 'Publicando…';
      try { await encuestas.crear({ pregunta, opciones, dias: S.encuesta.dias, juego: segmentoParaGuardar(S.juego) }); exito(); }
      catch (e) { console.error('[social] encuesta:', e); toast(msgErr(e), 'error'); }
      finally { S.publicando = false; etiqueta.textContent = 'Publicar'; pintar(); }
      return;
    }
    const enlace = $('#px-link').value.trim(); const vid = enlace ? analizarVideo(enlace) : null;
    if (vid && !vid.ok) { toast(vid.error, 'error'); return; }
    const conAlgo = hayMedios() || !!vid || !!S.reto;
    const v = texto.value.trim() ? validarTexto(texto.value) : { ok: conAlgo, texto: '', error: 'Escribe algo, sube una foto o un video, o pega un enlace.' };
    if (!v.ok) { toast(v.error, 'error'); return; }
    S.publicando = true; ok.disabled = true; const subidas = [];
    try {
      for (let i = 0; i < S.fotos.length; i += 1) { etiqueta.textContent = S.fotos.length > 1 ? `Subiendo foto ${i + 1} de ${S.fotos.length}…` : 'Subiendo foto…'; subidas.push(await api.subirImagen(S.fotos[i].file, yo)); }
      let urlVideo = null;
      if (S.video) { etiqueta.textContent = 'Subiendo video…'; urlVideo = await api.subirVideo(S.video.file, yo, S.video.ext, S.video.mime); subidas.push(urlVideo); }
      etiqueta.textContent = 'Publicando…';
      const extra = {}; if (fondoActivo()) extra.fondo = S.fondo; if (S.sentimiento) extra.sentimiento = S.sentimiento; if (S.fotos.length > 1) extra.fotos = subidas.slice(1, S.fotos.length);
      const conExtra = Object.keys(extra).length ? extra : null;
      const id = await api.publicarCompleto({ texto: v.texto, imagen: S.fotos.length ? subidas[0] : null, video: urlVideo ?? vid?.url ?? null, reto: S.reto ? Number(S.reto.id) : null,
        juego: segmentoParaGuardar(S.juego), extra: conExtra });
      recordarExtra(id, conExtra);
      exito();
    } catch (e) {
      console.error('[social] publicar:', e); toast(msgErr(e), 'error');
      for (const u of subidas) api.quitarArchivo(u);   // falló: no dejar archivos huérfanos en el Storage
    } finally { S.publicando = false; etiqueta.textContent = 'Publicar'; pintar(); }
  }
  $('#px-ok').addEventListener('click', publicar);

  pintar();
  return { abrir, destruir: () => { reiniciar(); dlg.remove(); host.removeEventListener('click', alAbrir); host.innerHTML = ''; } };
}

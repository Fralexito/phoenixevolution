// Compositor de /social/: caja «¿Qué quieres compartir?» con texto + foto o video (archivo o enlace) + juego. Se pliega hasta que la persona toca.
// Capa DOM: valida con core/muro.js y core/videoSubida.js (vía prepararVideo), sube archivos con api.js y avisa con `onPublicado()`.
// Sin sesión muestra una invitación a entrar (la BD igual rechaza cualquier intento: las reglas viven en muro_publicar).
import { escapeHTML } from '../../core/dom.js';
import { toast } from '../../core/toast.js';
import { avatarHTML } from '../../core/avatar.js';
import { validarTexto, analizarVideo, segmentoParaGuardar } from '../../core/muro.js';
import { VIDEO_MAX_MB, VIDEO_MAX_SEG } from '../../core/videoSubida.js';
import { MURO_MAX, SEGMENTOS } from '../../../data/muroEstilo.js';
import * as api from './api.js';
import { prepararVideo } from './media.js';

const msgErr = (e) => String(e?.message ?? e ?? 'Algo salió mal.');

/**
 * Pinta el compositor dentro de `host`. Devuelve { destruir } (quita listeners y libera vistas previas).
 * @param {HTMLElement} host
 * @param {{ yo: string|null, perfil: object|null, onLogin: () => void, onPublicado: () => void }} cfg
 */
export function montarCompositor(host, { yo, perfil, onLogin, onPublicado }) {
  if (!yo) {
    host.innerHTML = `<div class="glass-panel rounded-2xl p-4 flex items-center gap-3"><span class="w-10 h-10 rounded-full grid place-items-center bg-galaxy-600/25 border border-galaxy-400/40 text-galaxy-400 shrink-0"><i class="fa-solid fa-pen" aria-hidden="true"></i></span>
      <p class="flex-1 text-sm text-gray-300">Inicia sesión para publicar fotos, videos y resultados.</p><button type="button" data-sx-login class="btn btn-primary !min-h-9 !text-xs">Entrar</button></div>`;
    const b = host.querySelector('[data-sx-login]'); const h = () => onLogin?.(); b.addEventListener('click', h);
    return { destruir: () => b.removeEventListener('click', h) };
  }
  const nombre = perfil?.nombre_display || perfil?.username || 'jugador';
  host.innerHTML = `<div class="glass-panel rounded-2xl p-3 sm:p-4 space-y-3">
    <div class="flex items-start gap-2.5">
      <span class="w-10 h-10 rounded-full overflow-hidden flex items-center justify-center bg-galaxy-card border border-galaxy-border shrink-0">${avatarHTML(perfil?.avatar_url, nombre, 40)}</span>
      <textarea id="cp-texto" data-menciones rows="1" maxlength="${MURO_MAX + 200}" aria-label="Escribe tu publicación" placeholder="¿Qué quieres compartir, ${escapeHTML(nombre)}?" class="field flex-1 resize-none min-h-10"></textarea>
    </div>
    <div id="cp-prev" hidden class="relative inline-block"><img id="cp-img" alt="Vista previa de tu foto" class="max-h-48 rounded-lg border border-galaxy-border" hidden><video id="cp-vid" muted playsinline controls class="max-h-48 rounded-lg border border-galaxy-border" hidden></video>
      <button type="button" id="cp-quitar" aria-label="Quitar archivo" class="absolute top-1 right-1 w-7 h-7 rounded-full bg-black/70 text-white text-xs"><i class="fa-solid fa-xmark"></i></button></div>
    <input id="cp-link" hidden maxlength="300" placeholder="Pega un enlace de YouTube, TikTok, Kick o Twitch" class="field w-full !text-xs">
    <input type="file" id="cp-file" accept="image/jpeg,image/png,image/webp,video/mp4,video/webm,video/quicktime" hidden>
    <div id="cp-barra" hidden class="flex flex-wrap items-center gap-1.5 pt-2 border-t border-galaxy-border/60">
      <button type="button" id="cp-elegir" class="sx-chip"><i class="fa-solid fa-photo-film text-galaxy-400" aria-hidden="true"></i>Foto o video</button>
      <button type="button" id="cp-enlace" class="sx-chip" aria-expanded="false"><i class="fa-solid fa-link text-galaxy-400" aria-hidden="true"></i>Enlace</button>
      <select id="cp-juego" aria-label="Juego de la publicación" class="field !min-h-9 !py-1 !text-xs !w-auto"><option value="">Todos los juegos</option>${SEGMENTOS.map(([id, n]) => `<option value="${id}">${escapeHTML(n)}</option>`).join('')}</select>
      <span id="cp-cuenta" class="ml-auto text-[11px] text-gray-500 whitespace-nowrap">0 / ${MURO_MAX}</span>
      <button type="button" id="cp-ok" class="btn btn-primary !min-h-9 !text-xs"><i class="fa-solid fa-paper-plane"></i><span>Publicar</span></button>
    </div>
    <p id="cp-ayuda" hidden class="text-[10px] text-gray-500">Foto JPG/PNG/WebP · Video MP4/WebM/MOV de hasta ${VIDEO_MAX_SEG} s y ${VIDEO_MAX_MB} MB.</p>
  </div>`;
  const $ = (s) => host.querySelector(s); const texto = $('#cp-texto');
  let elegido = null;   // { tipo: 'foto' | 'video', file, ext?, mime? }
  const abrir = () => { $('#cp-barra').hidden = false; $('#cp-ayuda').hidden = false; texto.rows = 3; };
  const soltarVista = () => { for (const id of ['#cp-img', '#cp-vid']) { const el = $(id); if (el.src?.startsWith('blob:')) URL.revokeObjectURL(el.src); el.removeAttribute('src'); el.hidden = true; } $('#cp-prev').hidden = true; };
  const quitar = () => { elegido = null; $('#cp-file').value = ''; soltarVista(); };
  const reiniciar = () => { quitar(); texto.value = ''; texto.rows = 1; $('#cp-cuenta').textContent = `0 / ${MURO_MAX}`; $('#cp-link').value = ''; $('#cp-link').hidden = true; $('#cp-enlace').setAttribute('aria-expanded', 'false'); $('#cp-juego').value = ''; $('#cp-barra').hidden = true; $('#cp-ayuda').hidden = true; };

  texto.addEventListener('focus', abrir);
  texto.addEventListener('input', () => { $('#cp-cuenta').textContent = `${texto.value.length} / ${MURO_MAX}`; });
  $('#cp-elegir').addEventListener('click', () => $('#cp-file').click());
  $('#cp-quitar').addEventListener('click', quitar);
  $('#cp-enlace').addEventListener('click', () => { const l = $('#cp-link'); l.hidden = !l.hidden; $('#cp-enlace').setAttribute('aria-expanded', String(!l.hidden)); if (!l.hidden) l.focus(); });
  $('#cp-file').addEventListener('change', async (e) => {
    const f = e.target.files?.[0]; if (!f) return;
    if (/^image\/(jpeg|png|webp)$/.test(f.type)) { quitar(); elegido = { tipo: 'foto', file: f }; const i = $('#cp-img'); i.src = URL.createObjectURL(f); i.hidden = false; $('#cp-prev').hidden = false; return; }
    $('#cp-elegir').disabled = true; const r = await prepararVideo(f); $('#cp-elegir').disabled = false;
    if (!r.ok) { toast(r.error, 'error'); e.target.value = ''; return; }
    quitar(); elegido = { tipo: 'video', file: f, ext: r.ext, mime: r.tipo }; const v = $('#cp-vid'); v.src = URL.createObjectURL(f); v.hidden = false; $('#cp-prev').hidden = false;
    $('#cp-link').value = ''; $('#cp-link').hidden = true;
  });
  const ok = $('#cp-ok');
  ok.addEventListener('click', async () => {
    const enlace = $('#cp-link').value.trim(); const vid = enlace ? analizarVideo(enlace) : null;
    if (vid && !vid.ok) { toast(vid.error, 'error'); return; }
    const hayMedios = !!elegido || !!vid;
    const v = texto.value.trim() ? validarTexto(texto.value) : { ok: hayMedios, texto: '', error: 'Escribe algo, sube una foto o un video, o pega un enlace.' };
    if (!v.ok) { toast(v.error, 'error'); return; }
    ok.disabled = true; const etiqueta = ok.querySelector('span'); let urlFoto = null; let urlVideo = null;
    try {
      if (elegido?.tipo === 'foto') urlFoto = await api.subirImagen(elegido.file, yo);
      if (elegido?.tipo === 'video') { etiqueta.textContent = 'Subiendo video…'; urlVideo = await api.subirVideo(elegido.file, yo, elegido.ext, elegido.mime); }
      await api.publicar(v.texto, urlFoto, urlVideo ?? vid?.url ?? null, null, segmentoParaGuardar($('#cp-juego').value));
      toast('Publicado.', 'ok'); reiniciar(); onPublicado?.();
    } catch (e) {
      console.error('[social] publicar:', e); toast(msgErr(e), 'error');
      if (urlFoto) api.quitarArchivo(urlFoto); if (urlVideo) api.quitarArchivo(urlVideo);   // falló: no dejar archivos huérfanos en el Storage
    } finally { ok.disabled = false; etiqueta.textContent = 'Publicar'; }
  });
  return { destruir: () => { soltarVista(); host.innerHTML = ''; } };
}

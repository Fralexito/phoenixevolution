// Ventanas flotantes para crear HISTORIAS y gestionar DESTACADAS (se abren sobre el perfil; en celular ocupan casi toda la pantalla).
// Capa DOM: valida con core/historias.js y core/videoSubida.js, sube archivos y llama a api.js. Cada ventana avisa con `onListo()` al terminar para que el perfil se recargue.
import { openModal, closeModal } from '../../core/modal.js';
import { toast } from '../../core/toast.js';
import { escapeHTML, safeImg } from '../../core/dom.js';
import { validarHistoria, validarTituloDestacada, normalizarHistorias, HISTORIA_MAX, DESTACADA_TITULO_MAX, MAX_DESTACADAS } from '../../core/historias.js';
import { VIDEO_MAX_MB, VIDEO_MAX_SEG } from '../../core/videoSubida.js';
import * as api from './api.js';
import { prepararVideo } from './media.js';

const msgErr = (e) => String(e?.message ?? e ?? 'Algo salió mal.');
const cabecera = (titulo, icono) => `<div class="flex justify-between items-center"><h2 class="font-display font-bold text-xl text-white uppercase tracking-widest"><i class="fa-solid ${icono} text-galaxy-400 mr-2"></i>${titulo}</h2>
  <button type="button" data-close aria-label="Cerrar" class="text-gray-500 hover:text-white"><i class="fa-solid fa-xmark text-xl"></i></button></div>`;

/** Ventana «Nueva historia»: foto o video (archivo), enlace de video y/o texto. Dura 24 horas. */
export function abrirNuevaHistoria({ uid, onListo }) {
  const m = openModal(`<div class="p-5 sm:p-6 space-y-3">${cabecera('Nueva historia', 'fa-circle-plus')}
    <p class="text-[11px] text-gray-400">Se ve durante 24 horas. Después queda en tu archivo para que la guardes como destacada.</p>
    <div id="nh-prev" hidden class="relative inline-block"><img id="nh-img" alt="Vista previa" class="max-h-56 rounded-lg border border-galaxy-border" hidden><video id="nh-vid" muted playsinline controls class="max-h-56 rounded-lg border border-galaxy-border" hidden></video>
      <button type="button" id="nh-quitar" aria-label="Quitar" class="absolute top-1 right-1 w-7 h-7 rounded-full bg-black/70 text-white text-xs"><i class="fa-solid fa-xmark"></i></button></div>
    <input type="file" id="nh-file" accept="image/jpeg,image/png,image/webp,video/mp4,video/webm,video/quicktime" hidden>
    <button type="button" id="nh-elegir" class="btn btn-ghost !min-h-10 w-full"><i class="fa-solid fa-photo-film"></i><span>Elegir foto o video</span></button>
    <p class="text-[10px] text-gray-500 -mt-1">Foto JPG/PNG/WebP · Video MP4/WebM/MOV de hasta ${VIDEO_MAX_SEG} s y ${VIDEO_MAX_MB} MB.</p>
    <textarea id="nh-texto" rows="2" maxlength="${HISTORIA_MAX + 40}" placeholder="Texto (opcional si subes foto o video)" class="field w-full resize-y"></textarea>
    <input id="nh-link" maxlength="300" placeholder="…o un enlace de video (YouTube, TikTok, Kick o Twitch)" class="field w-full !text-xs">
    <p id="nh-err" class="text-xs text-bad min-h-4" role="alert"></p>
    <button type="button" id="nh-ok" class="btn btn-primary w-full"><i class="fa-solid fa-paper-plane"></i><span>Publicar historia</span></button></div>`, { id: 'historia-modal' });
  const $ = (s) => m.querySelector(s); const err = $('#nh-err');
  let elegido = null;   // { tipo: 'foto' | 'video', file, ext?, mime? }
  const limpiar = () => {
    elegido = null; $('#nh-file').value = ''; $('#nh-prev').hidden = true;
    for (const id of ['#nh-img', '#nh-vid']) { const el = $(id); if (el.src?.startsWith('blob:')) URL.revokeObjectURL(el.src); el.removeAttribute('src'); el.hidden = true; }
  };
  $('#nh-elegir').addEventListener('click', () => $('#nh-file').click());
  $('#nh-quitar').addEventListener('click', limpiar);
  $('#nh-file').addEventListener('change', async (e) => {
    const f = e.target.files?.[0]; if (!f) return; err.textContent = '';
    if (/^image\/(jpeg|png|webp)$/.test(f.type)) {
      limpiar(); elegido = { tipo: 'foto', file: f }; const img = $('#nh-img'); img.src = URL.createObjectURL(f); img.hidden = false; $('#nh-prev').hidden = false; return;
    }
    $('#nh-elegir').disabled = true; const r = await prepararVideo(f); $('#nh-elegir').disabled = false;
    if (!r.ok) { err.textContent = r.error; e.target.value = ''; return; }
    limpiar(); elegido = { tipo: 'video', file: f, ext: r.ext, mime: r.tipo }; const v = $('#nh-vid'); v.src = URL.createObjectURL(f); v.hidden = false; $('#nh-prev').hidden = false;
    $('#nh-link').value = '';
  });
  const ok = $('#nh-ok');
  ok.addEventListener('click', async () => {
    err.textContent = '';
    const v = validarHistoria({ texto: $('#nh-texto').value, hayFoto: !!elegido, video: elegido?.tipo === 'video' ? '' : $('#nh-link').value });
    if (!v.ok) { err.textContent = v.error; return; }
    ok.disabled = true; let urlFoto = null; let urlVideo = null;
    try {
      if (elegido?.tipo === 'foto') urlFoto = await api.subirImagen(elegido.file, uid, 1080);
      if (elegido?.tipo === 'video') { ok.querySelector('span').textContent = 'Subiendo video…'; urlVideo = await api.subirVideo(elegido.file, uid, elegido.ext, elegido.mime); }
      await api.publicarHistoria(v.texto, urlFoto, urlVideo ?? (v.video || null));
      toast('Historia publicada: se ve durante 24 horas.', 'ok'); limpiar(); closeModal('historia-modal'); onListo?.();
    } catch (e) {
      console.error('[historias] publicar:', e); err.textContent = msgErr(e);
      if (urlFoto) api.quitarArchivo(urlFoto); if (urlVideo) api.quitarArchivo(urlVideo);   // falló la publicación: no dejar archivos huérfanos
    } finally { ok.disabled = false; ok.querySelector('span').textContent = 'Publicar historia'; }
  });
}

/** Ventana «Destacadas»: las que ya tengo (renombrar/borrar) y crear una nueva con historias de las últimas 24 h o de mi archivo. */
export function abrirDestacadas({ hist, onListo }) {
  const cand = [...normalizarHistorias(hist.historias).filter((h) => !h.destacada), ...normalizarHistorias(hist.archivo)];
  const celda = (h) => `<label class="relative block w-20 h-28 rounded-lg overflow-hidden border border-galaxy-border cursor-pointer bg-black/40"><input type="checkbox" data-sel value="${h.id}" class="absolute top-1 left-1 z-10 w-4 h-4 accent-amber-400">
    ${safeImg(h.imagen) ? `<img src="${escapeHTML(safeImg(h.imagen))}" alt="" loading="lazy" referrerpolicy="no-referrer" class="w-full h-full object-cover">` : `<span class="absolute inset-0 grid place-items-center p-1 text-[10px] text-gray-300 text-center bg-galaxy-900">${h.video ? '<i class="fa-solid fa-circle-play text-lg"></i>' : escapeHTML(h.texto.slice(0, 40))}</span>`}</label>`;
  const existentes = hist.destacadas.map((d) => `<li class="flex items-center gap-2 text-xs text-gray-200 rounded-lg bg-black/25 px-2.5 py-2"><i class="fa-solid fa-star text-amber-300"></i><span class="flex-1 truncate">${escapeHTML(d.titulo)} <span class="text-gray-500">· ${(d.historias ?? []).length}</span></span>
    <button type="button" data-ren="${Number(d.id)}" title="Cambiar título" class="text-gray-400 hover:text-galaxy-400 w-8 h-8"><i class="fa-solid fa-pen"></i></button>
    <button type="button" data-del="${Number(d.id)}" title="Borrar destacada (sus historias vuelven al archivo)" class="text-gray-400 hover:text-bad w-8 h-8"><i class="fa-solid fa-trash"></i></button></li>`).join('');
  const m = openModal(`<div class="p-5 sm:p-6 space-y-3">${cabecera('Destacadas', 'fa-star')}
    ${existentes ? `<ul class="space-y-1.5">${existentes}</ul>` : ''}
    ${hist.destacadas.length >= MAX_DESTACADAS ? `<p class="text-[11px] text-gray-500">Llegaste al máximo de ${MAX_DESTACADAS} destacadas: borra alguna para crear otra.</p>`
      : cand.length ? `<p class="text-[11px] text-gray-400">Elige las historias (activas o de tu archivo) que quieres guardar para siempre:</p><div class="flex flex-wrap gap-2 max-h-64 overflow-y-auto">${cand.map(celda).join('')}</div>
        <label class="block"><span class="text-[11px] text-gray-400">Título (máx. ${DESTACADA_TITULO_MAX})</span><input id="de-titulo" maxlength="${DESTACADA_TITULO_MAX + 10}" class="field w-full mt-1" placeholder="Ej.: Mejores goles"></label>
        <button type="button" id="de-ok" class="btn btn-primary w-full"><i class="fa-solid fa-star"></i><span>Crear destacada</span></button>`
      : '<p class="text-[11px] text-gray-500">Aún no tienes historias para destacar. Publica una y vuelve aquí.</p>'}
    <p id="de-err" class="text-xs text-bad min-h-4" role="alert"></p></div>`, { id: 'destacadas-modal' });
  const err = m.querySelector('#de-err');
  const hacer = async (fn, ok) => { try { await fn(); toast(ok, 'ok'); closeModal('destacadas-modal'); onListo?.(); } catch (e) { console.error('[destacadas]', e); err.textContent = msgErr(e); } };
  m.querySelector('#de-ok')?.addEventListener('click', () => {
    const t = validarTituloDestacada(m.querySelector('#de-titulo').value); if (!t.ok) { err.textContent = t.error; return; }
    const ids = [...m.querySelectorAll('[data-sel]:checked')].map((x) => Number(x.value)); if (!ids.length) { err.textContent = 'Elige al menos una historia.'; return; }
    hacer(() => api.crearDestacada(t.titulo, ids), 'Destacada creada.');
  });
  m.addEventListener('click', (e) => {
    const ren = e.target.closest('[data-ren]'); const del = e.target.closest('[data-del]');
    if (ren) {
      const d = hist.destacadas.find((x) => x.id === Number(ren.dataset.ren)); const nuevo = window.prompt('Nuevo título de la destacada:', d?.titulo ?? ''); if (nuevo === null) return;
      const t = validarTituloDestacada(nuevo); if (!t.ok) { err.textContent = t.error; return; }
      hacer(() => api.renombrarDestacada(Number(ren.dataset.ren), t.titulo), 'Título cambiado.');
    } else if (del && window.confirm('¿Borrar esta destacada? Sus historias no se pierden: vuelven a tu archivo.')) hacer(() => api.borrarDestacada(Number(del.dataset.del)), 'Destacada borrada.');
  });
}

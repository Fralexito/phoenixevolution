// Visores a pantalla completa del muro: HISTORIAS (barras de progreso, toque izq./der., mantener = pausa) y CLIPS (estilo reels: desliza arriba/abajo).
// Solo DOM: recibe datos ya normalizados (core/historias.js). Todo texto pasa por escapeHTML; los enlaces ya fueron validados por analizarVideo.
// Privacidad: nada de YouTube se carga hasta que la historia/clip activo lo necesita (y con el dominio «nocookie»).
import { confirmar, pedirTexto } from '../../core/dialogo.js';
import { escapeHTML, safeImg } from '../../core/dom.js';
import { HISTORIA_MS, caducaEn } from '../../core/historias.js';
import { tiempoRelativo, textoAHTML, PROVEEDOR_ETIQUETA } from '../../core/muro.js';

let cierreActual = null;   // solo un visor abierto a la vez

function crearOverlay(etiqueta, html) {
  cierreActual?.();
  const previo = document.activeElement;
  const el = document.createElement('div');
  el.className = 'fixed inset-0 z-[9999] bg-black/95 flex items-center justify-center';
  el.setAttribute('role', 'dialog'); el.setAttribute('aria-modal', 'true'); el.setAttribute('aria-label', etiqueta);
  el.innerHTML = html;
  document.body.appendChild(el); document.body.style.overflow = 'hidden';
  const cerrar = () => {
    el.dispatchEvent(new Event('visor-cierra'));
    el.remove(); document.body.style.overflow = ''; if (cierreActual === cerrar) cierreActual = null;
    if (previo?.focus) try { previo.focus(); } catch { /* el elemento pudo desaparecer */ }
  };
  cierreActual = cerrar;
  el.querySelector('[data-cerrar]')?.addEventListener('click', cerrar);
  el.querySelector('[data-cerrar]')?.focus();
  return { el, cerrar };
}

const ytEmbed = (id) => `https://www.youtube-nocookie.com/embed/${id}?autoplay=1&playsinline=1&rel=0`;

/* ================= HISTORIAS ================= */
/**
 * @param {object} o
 * @param {Array}  o.historias  normalizadas (normalizarHistorias)
 * @param {string} o.nombre     nombre de quien publicó
 * @param {string} o.avatar     HTML del avatar (ya escapado por avatarHTML)
 * @param {string} [o.titulo]   p. ej. el título de la destacada
 * @param {number} [o.inicio]   índice por el que empezar
 * @param {(ids:number[])=>void} [o.onVistas]  se llama con los ids vistos al cerrar
 * @param {(id:number)=>Promise<boolean>} [o.onBorrar]  si existe, muestra el basurero (solo el dueño); true = borrada
 */
export function abrirHistorias({ historias, nombre, avatar, titulo = '', inicio = 0, onVistas, onBorrar, onReportar, onModerar }) {
  if (!historias?.length) return;
  let lista = [...historias]; let i = Math.min(Math.max(0, inicio), lista.length - 1);
  let pausa = false; let transcurrido = 0; let ultimo = 0; let raf = 0; let dur = HISTORIA_MS; const vistas = new Set();
  const { el, cerrar } = crearOverlay(`Historias de ${nombre}`, `
    <div class="relative w-full h-full sm:h-[min(92vh,820px)] sm:w-[min(92vw,460px)] sm:rounded-2xl overflow-hidden bg-galaxy-panel flex flex-col select-none" data-caja>
      <div class="absolute top-0 inset-x-0 z-10 p-2 pt-3 bg-gradient-to-b from-black/70 to-transparent">
        <div class="flex gap-1" data-barras></div>
        <div class="mt-2 flex items-center gap-2">
          <span class="w-8 h-8 rounded-full overflow-hidden flex items-center justify-center bg-galaxy-card border border-white/40 shrink-0">${avatar}</span>
          <div class="min-w-0 flex-1 leading-tight"><p class="text-white text-sm font-display font-bold truncate">${escapeHTML(nombre)}${titulo ? ` <span class="text-galaxy-400">· ${escapeHTML(titulo)}</span>` : ''}</p><p class="text-[11px] text-gray-300" data-meta></p></div>
          ${onBorrar ? '<button type="button" data-borrar aria-label="Borrar esta historia" class="w-9 h-9 rounded-full text-white/80 hover:text-bad"><i class="fa-solid fa-trash"></i></button>' : ''}
          ${onReportar ? '<button type="button" data-reportar aria-label="Reportar esta historia" title="Reportar" class="w-9 h-9 rounded-full text-white/80 hover:text-amber-300"><i class="fa-regular fa-flag"></i></button>' : ''}
          ${onModerar ? '<button type="button" data-moderar aria-label="Ocultar esta historia (moderación)" title="Ocultar (moderación)" class="w-9 h-9 rounded-full text-white/80 hover:text-orange-300"><i class="fa-solid fa-eye-slash"></i></button>' : ''}
          <button type="button" data-cerrar aria-label="Cerrar historias" class="w-9 h-9 rounded-full text-white hover:bg-white/10"><i class="fa-solid fa-xmark text-lg"></i></button></div></div>
      <div class="flex-1 relative min-h-0" data-escena></div>
      <button type="button" data-ant aria-label="Historia anterior" class="absolute left-0 top-16 bottom-0 w-1/3 z-[5]"></button>
      <button type="button" data-sig aria-label="Historia siguiente" class="absolute right-0 top-16 bottom-0 w-1/3 z-[5]"></button></div>`);
  const barras = el.querySelector('[data-barras]'); const escena = el.querySelector('[data-escena]'); const meta = el.querySelector('[data-meta]');

  function pintarBarras(frac = 0) {
    barras.innerHTML = lista.map((_, k) => `<span class="h-[3px] flex-1 rounded-full bg-white/30 overflow-hidden"><span class="block h-full bg-white" style="width:${k < i ? 100 : k === i ? Math.round(frac * 100) : 0}%"></span></span>`).join('');
  }
  function mostrar() {
    const h = lista[i]; vistas.add(h.id); transcurrido = 0; ultimo = 0; pintarBarras(0);
    meta.textContent = [h.creada ? tiempoRelativo(h.creada) : '', h.expira && onBorrar ? caducaEn(h.expira) : ''].filter(Boolean).join(' · ');
    const foto = safeImg(h.imagen);
    const texto = h.texto ? `<p class="absolute inset-x-0 bottom-0 z-[6] px-5 pb-8 pt-16 bg-gradient-to-t from-black/85 to-transparent text-white text-base leading-snug text-center pointer-events-none">${textoAHTML(h.texto)}</p>` : '';
    let medio = '';
    dur = HISTORIA_MS;
    if (foto) medio = `<img src="${escapeHTML(foto)}" alt="Historia de ${escapeHTML(nombre)}" referrerpolicy="no-referrer" draggable="false" class="absolute inset-0 w-full h-full object-contain bg-black">`;
    else if (h.video?.proveedor === 'youtube') { medio = `<iframe src="${ytEmbed(h.video.id)}" title="Video de la historia" allow="autoplay; encrypted-media; picture-in-picture" allowfullscreen referrerpolicy="strict-origin-when-cross-origin" class="absolute inset-0 w-full h-full border-0 bg-black"></iframe>`; dur = 0; }
    else if (h.video?.proveedor === 'propio') { medio = `<video src="${escapeHTML(h.video.url)}" playsinline autoplay class="absolute inset-0 w-full h-full object-contain bg-black"></video>`; dur = 0; }
    else if (h.video) { medio = `<a href="${escapeHTML(h.video.url)}" target="_blank" rel="noopener noreferrer nofollow" class="absolute inset-0 z-[7] flex flex-col items-center justify-center gap-3 text-white"><i class="fa-solid fa-arrow-up-right-from-square text-4xl text-galaxy-400"></i><span class="text-sm">Ver en ${escapeHTML(PROVEEDOR_ETIQUETA[h.video.proveedor] ?? 'el enlace')}</span></a>`; dur = 0; }
    else medio = '<div class="absolute inset-0 bg-gradient-to-br from-galaxy-600 via-galaxy-900 to-black"></div>';   // historia solo de texto
    escena.innerHTML = medio + texto;
    if (h.video?.proveedor === 'propio') enlazarVideo(escena.querySelector('video'));   // video propio: la barra sigue al video y al terminar pasa a la siguiente
    else if (dur === 0) pintarBarras(1);   // los enlaces externos no avanzan solos: la barra queda llena
  }
  /** Video subido: intenta reproducir con sonido (el clic que abrió el visor lo permite); si el navegador lo impide, lo reproduce sin sonido. */
  function enlazarVideo(v) {
    if (!v) return;
    const barra = () => barras.children[i]?.firstElementChild;
    v.addEventListener('timeupdate', () => { const b = barra(); if (b && v.duration) b.style.width = `${Math.round((v.currentTime / v.duration) * 100)}%`; });
    v.addEventListener('ended', () => ir(i + 1));
    v.play().catch(() => { v.muted = true; v.play().catch((e) => console.warn('[visor] video:', e?.message)); });
  }
  const ir = (n) => {
    if (n < 0) { transcurrido = 0; ultimo = 0; pintarBarras(0); return; }
    if (n >= lista.length) { cerrar(); return; }
    i = n; mostrar();
  };
  function tick(t) {
    raf = requestAnimationFrame(tick);
    if (!dur || pausa || document.hidden) { ultimo = t; return; }
    if (!ultimo) ultimo = t;
    transcurrido += t - ultimo; ultimo = t;
    const frac = Math.min(1, transcurrido / dur);
    const actual = barras.children[i]?.firstElementChild; if (actual) actual.style.width = `${Math.round(frac * 100)}%`;
    if (frac >= 1) ir(i + 1);
  }
  const caja = el.querySelector('[data-caja]');
  const video = () => escena.querySelector('video');
  caja.addEventListener('pointerdown', () => { pausa = true; video()?.pause(); }); ['pointerup', 'pointercancel', 'pointerleave'].forEach((e) => caja.addEventListener(e, () => { if (pausa) video()?.play().catch(() => {}); pausa = false; }));
  el.querySelector('[data-ant]').addEventListener('click', () => ir(i - 1));
  el.querySelector('[data-sig]').addEventListener('click', () => ir(i + 1));
  el.addEventListener('click', (e) => { if (e.target === el) cerrar(); });
  const teclas = (e) => {
    if (!document.body.contains(el)) { document.removeEventListener('keydown', teclas); return; }
    if (e.key === 'Escape') cerrar(); else if (e.key === 'ArrowRight') ir(i + 1); else if (e.key === 'ArrowLeft') ir(i - 1);
  };
  document.addEventListener('keydown', teclas);
  el.querySelector('[data-borrar]')?.addEventListener('click', async () => {
    if (!(await confirmar('¿Borrar esta historia?', { titulo: 'Borrar historia', aceptar: 'Borrar', peligro: true }))) return;
    pausa = true;
    let ok = false; try { ok = await onBorrar(lista[i].id); } catch (e) { console.error('[visor] borrar historia:', e); }
    pausa = false; if (!ok) return;
    vistas.delete(lista[i].id); lista = lista.filter((_, k) => k !== i);
    if (!lista.length) { cerrar(); return; }
    i = Math.min(i, lista.length - 1); mostrar();
  });
  // Reportar / ocultar: se cierra el visor y se abre la ventana (así no se superponen).
  el.querySelector('[data-reportar]')?.addEventListener('click', () => { const h = lista[i]; cerrar(); if (h) onReportar(h); });
  el.querySelector('[data-moderar]')?.addEventListener('click', () => { const h = lista[i]; cerrar(); if (h) onModerar(h); });
  el.addEventListener('visor-cierra', () => { cancelAnimationFrame(raf); document.removeEventListener('keydown', teclas); try { onVistas?.([...vistas]); } catch (e) { console.error('[visor] onVistas:', e); } });
  mostrar(); raf = requestAnimationFrame(tick);
}

/* ================= CLIPS (reels) ================= */
/** @param {{clips:Array, inicio?:number, onBorrar?:(id:number)=>Promise<boolean>}} o  clips = infoClip(...) */
export function abrirClips({ clips, inicio = 0, onBorrar, onCompartir, onReportar, onModerar, guardarHTML = null, onGuardar = null }) {
  if (!clips?.length) return;
  let lista = [...clips]; let activo = -1;
  const { el, cerrar } = crearOverlay('Clips', `
    <button type="button" data-cerrar aria-label="Cerrar clips" class="absolute top-3 right-3 z-20 w-10 h-10 rounded-full bg-black/60 text-white hover:bg-white/20"><i class="fa-solid fa-xmark text-lg"></i></button>
    <div class="relative w-full h-full sm:h-[min(94vh,860px)] sm:w-[min(92vw,420px)] sm:rounded-2xl overflow-y-auto snap-y snap-mandatory bg-black" data-pista tabindex="0" style="scrollbar-width:none;overscroll-behavior:contain"></div>`);
  const pista = el.querySelector('[data-pista]');

  function slide(c, k) {
    const miniatura = c.ytId ? `<img src="https://i.ytimg.com/vi/${escapeHTML(c.ytId)}/hqdefault.jpg" alt="" referrerpolicy="no-referrer" class="absolute inset-0 w-full h-full object-cover opacity-60">` : '<div class="absolute inset-0 bg-gradient-to-br from-galaxy-600/60 via-galaxy-900 to-black"></div>';
    return `<section data-k="${k}" class="relative h-full w-full snap-start snap-always flex-none overflow-hidden">
      <div data-medio class="absolute inset-0">${miniatura}<div class="absolute inset-0 flex items-center justify-center"><i class="${escapeHTML(c.icono)} text-6xl text-white/80"></i></div></div>
      <div class="absolute inset-x-0 bottom-0 z-10 p-4 pt-20 bg-gradient-to-t from-black/90 to-transparent pointer-events-none">
        <p class="text-white font-display font-bold text-base leading-tight">${escapeHTML(c.titulo || 'Clip')}</p>
        <p class="text-[11px] text-gray-300 mt-1">${escapeHTML(PROVEEDOR_ETIQUETA[c.proveedor] ?? '')}${c.creado ? ` · ${escapeHTML(tiempoRelativo(c.creado))}` : ''} · ${k + 1} / ${lista.length}</p></div>
      <div class="absolute right-3 bottom-20 z-10 flex flex-col gap-2">
        <a href="${escapeHTML(c.url)}" target="_blank" rel="noopener noreferrer nofollow" aria-label="Abrir en ${escapeHTML(PROVEEDOR_ETIQUETA[c.proveedor] ?? 'su página')}" class="w-10 h-10 rounded-full bg-black/60 text-white grid place-items-center hover:bg-galaxy-600"><i class="fa-solid fa-arrow-up-right-from-square"></i></a>
        ${onCompartir ? `<button type="button" data-compartir="${c.id}" aria-label="Compartir" class="w-10 h-10 rounded-full bg-black/60 text-white grid place-items-center hover:bg-galaxy-600"><i class="fa-solid fa-share-nodes"></i></button>` : ''}
        ${guardarHTML ? guardarHTML(c) : ''}
        ${onReportar ? `<button type="button" data-reportar="${c.id}" aria-label="Reportar clip" title="Reportar" class="w-10 h-10 rounded-full bg-black/60 text-white grid place-items-center hover:text-amber-300"><i class="fa-regular fa-flag"></i></button>` : ''}
        ${onModerar ? `<button type="button" data-moderar="${c.id}" aria-label="Ocultar clip (moderación)" title="Ocultar (moderación)" class="w-10 h-10 rounded-full bg-black/60 text-white grid place-items-center hover:text-orange-300"><i class="fa-solid fa-eye-slash"></i></button>` : ''}
        ${onBorrar ? `<button type="button" data-borrar="${c.id}" aria-label="Borrar clip" class="w-10 h-10 rounded-full bg-black/60 text-white grid place-items-center hover:text-bad"><i class="fa-solid fa-trash"></i></button>` : ''}</div></section>`;
  }
  function pintar() { pista.innerHTML = lista.map(slide).join(''); activo = -1; }
  function activar(k) {
    if (k === activo) return; activo = k;
    pista.querySelectorAll('[data-k]').forEach((s) => {
      const c = lista[Number(s.dataset.k)]; const medio = s.querySelector('[data-medio]'); if (!c || !medio) return;
      const esta = Number(s.dataset.k) === k; const tieneIframe = !!medio.querySelector('iframe');
      const tieneVideo = !!medio.querySelector('video');
      if (esta && c.propio && !tieneVideo) medio.insertAdjacentHTML('beforeend', `<video src="${escapeHTML(c.url)}" loop autoplay playsinline controls class="absolute inset-0 w-full h-full object-contain bg-black"></video>`);
      else if (!esta && tieneVideo) medio.querySelector('video').remove();
      if (esta && c.ytId && !tieneIframe) medio.insertAdjacentHTML('beforeend', `<iframe src="${ytEmbed(c.ytId)}" title="${escapeHTML(c.titulo || 'Clip')}" allow="autoplay; encrypted-media; picture-in-picture" allowfullscreen referrerpolicy="strict-origin-when-cross-origin" class="absolute inset-0 w-full h-full border-0 bg-black"></iframe>`);
      else if (!esta && tieneIframe) medio.querySelector('iframe').remove();   // los demás se descargan: solo suena el activo
    });
  }
  const obs = 'IntersectionObserver' in window ? new IntersectionObserver((es) => { es.forEach((e) => { if (e.isIntersecting && e.intersectionRatio >= 0.6) activar(Number(e.target.dataset.k)); }); }, { root: pista, threshold: [0.6] }) : null;
  function montar(k) {
    pintar();
    const s = pista.querySelectorAll('[data-k]'); s.forEach((x) => obs?.observe(x));
    s[k]?.scrollIntoView({ block: 'start' }); if (!obs) activar(k);
  }
  const mover = (d) => { const k = Math.min(Math.max(0, (activo < 0 ? 0 : activo) + d), lista.length - 1); pista.querySelector(`[data-k="${k}"]`)?.scrollIntoView({ block: 'start', behavior: 'smooth' }); };
  const teclas = (e) => {
    if (!document.body.contains(el)) { document.removeEventListener('keydown', teclas); return; }
    if (e.key === 'Escape') cerrar(); else if (e.key === 'ArrowDown') { e.preventDefault(); mover(1); } else if (e.key === 'ArrowUp') { e.preventDefault(); mover(-1); }
  };
  document.addEventListener('keydown', teclas);
  el.addEventListener('visor-cierra', () => { obs?.disconnect(); document.removeEventListener('keydown', teclas); });
  el.addEventListener('click', async (e) => {
    const sh = e.target.closest('[data-compartir]');
    if (sh) { const c = lista.find((x) => x.id === Number(sh.dataset.compartir)); if (c) onCompartir?.(c); return; }
    const gu = e.target.closest('[data-guardar]'); if (gu) { onGuardar?.(gu); return; }
    const rp = e.target.closest('[data-reportar]'); const md = e.target.closest('[data-moderar]');
    if (rp || md) { const c = lista.find((x) => x.id === Number((rp ?? md).dataset[rp ? 'reportar' : 'moderar'])); cerrar(); if (c) (rp ? onReportar : onModerar)(c); return; }
    const b = e.target.closest('[data-borrar]');
    if (!b) { if (e.target === el) cerrar(); return; }
    if (!(await confirmar('¿Borrar este clip?', { titulo: 'Borrar clip', aceptar: 'Borrar', peligro: true }))) return;
    let ok = false; try { ok = await onBorrar(Number(b.dataset.borrar)); } catch (err) { console.error('[visor] borrar clip:', err); }
    if (!ok) return;
    const k = Math.max(0, activo); lista = lista.filter((c) => c.id !== Number(b.dataset.borrar));
    if (!lista.length) { cerrar(); return; }
    obs?.disconnect(); montar(Math.min(k, lista.length - 1));
  });
  montar(Math.min(Math.max(0, inicio), lista.length - 1)); pista.focus({ preventScroll: true });
}

// GESTOS de /social/ (19-oct-2026, Fralex: «métele todo lo que tiene una red social… la máxima experiencia dopamínica, dinámica, inmersiva»).
//   · Visor de fotos: tocar una foto la abre a pantalla completa (deslizar o flechas para pasar; Esc o tocar fuera cierra).
//   · Doble toque / doble clic en una publicación: reacciona con 🔥 y suelta una llamarada donde tocaste (como el corazón de Instagram).
//   · Tirar hacia abajo en lo alto del feed (celular): recarga con un aro que gira.
// Solo DOM: las acciones (reaccionar, recargar) las pasa pages/social.js.

const quieto = () => matchMedia('(prefers-reduced-motion: reduce)').matches || document.documentElement.dataset.ajMovEfectivo === 'reducido';
const vibrar = (ms) => { try { navigator.vibrate?.(ms); } catch { /* sin vibración */ } };

/* ---------- Visor de fotos ---------- */
export function montarVisorFotos(feed) {
  const dlg = document.createElement('dialog'); dlg.className = 'gx-visor'; dlg.setAttribute('aria-label', 'Foto a pantalla completa');
  dlg.innerHTML = `<button type="button" class="gx-x" data-gx-cerrar aria-label="Cerrar"><i class="fa-solid fa-xmark" aria-hidden="true"></i></button>
    <button type="button" class="gx-flecha gx-ant" data-gx-paso="-1" aria-label="Foto anterior"><i class="fa-solid fa-chevron-left" aria-hidden="true"></i></button>
    <div class="gx-pista"></div>
    <button type="button" class="gx-flecha gx-sig" data-gx-paso="1" aria-label="Foto siguiente"><i class="fa-solid fa-chevron-right" aria-hidden="true"></i></button>
    <p class="gx-cuenta" aria-live="polite"></p>`;
  document.body.append(dlg);
  const pista = dlg.querySelector('.gx-pista'); let fotos = []; let i = 0;
  const pintar = () => {
    pista.innerHTML = `<img src="${fotos[i].src}" alt="${fotos[i].alt}" class="gx-foto">`;
    dlg.querySelector('.gx-cuenta').textContent = fotos.length > 1 ? `${i + 1} / ${fotos.length}` : '';
    dlg.querySelectorAll('.gx-flecha').forEach((b) => { b.hidden = fotos.length < 2; });
  };
  const pasar = (d) => { if (fotos.length < 2) return; i = (i + d + fotos.length) % fotos.length; pista.dataset.dir = d > 0 ? 'sig' : 'ant'; pintar(); };
  feed.addEventListener('click', (e) => {
    const a = e.target.closest('.sx-post-cuerpo a'); const img = a?.querySelector(':scope > img'); if (!img || e.ctrlKey || e.metaKey) return;
    e.preventDefault();
    const todas = [...a.closest('.sx-post-cuerpo').querySelectorAll('a > img')];
    fotos = todas.map((x) => ({ src: x.closest('a').getAttribute('href'), alt: x.getAttribute('alt') || 'Foto' })); i = Math.max(0, todas.indexOf(img));
    delete pista.dataset.dir; pintar(); dlg.showModal();
  });
  dlg.addEventListener('click', (e) => {
    const p = e.target.closest('[data-gx-paso]'); if (p) { pasar(Number(p.dataset.gxPaso)); return; }
    if (e.target.closest('[data-gx-cerrar]') || e.target === dlg || e.target === pista) dlg.close();
  });
  dlg.addEventListener('keydown', (e) => { if (e.key === 'ArrowRight') pasar(1); if (e.key === 'ArrowLeft') pasar(-1); });
  let x0 = null;
  dlg.addEventListener('pointerdown', (e) => { x0 = e.clientX; });
  dlg.addEventListener('pointerup', (e) => { if (x0 == null) return; const dx = e.clientX - x0; x0 = null; if (Math.abs(dx) > 50) pasar(dx < 0 ? 1 : -1); });
}

/* ---------- Doble toque para reaccionar ---------- */
export function montarDobleToque(feed, alReaccionar) {
  let ultimo = { t: 0, id: null };
  const llamarada = (x, y) => {
    if (quieto()) return;
    const f = document.createElement('span'); f.className = 'gx-llama'; f.textContent = '🔥'; f.setAttribute('aria-hidden', 'true');
    f.style.left = `${x}px`; f.style.top = `${y}px`; document.body.append(f);
    f.addEventListener('animationend', () => f.remove(), { once: true });
  };
  const disparar = (post, x, y) => {
    const id = Number(post.dataset.pub); if (!id) return;
    llamarada(x, y); vibrar(18);
    alReaccionar(id);
  };
  // Táctil: dos toques en < 300 ms sobre la misma publicación (fuera de botones, enlaces y videos)
  feed.addEventListener('pointerup', (e) => {
    if (e.pointerType === 'mouse') return;
    const post = e.target.closest('.sx-post'); if (!post || e.target.closest('a, button, video, iframe, input, textarea, [data-pie], .sx-post-hilo')) return;
    const ahora = performance.now();
    if (ultimo.id === post.dataset.pub && ahora - ultimo.t < 300) { ultimo = { t: 0, id: null }; disparar(post, e.clientX, e.clientY); return; }
    ultimo = { t: ahora, id: post.dataset.pub };
  });
  // Mouse: doble clic
  feed.addEventListener('dblclick', (e) => {
    const post = e.target.closest('.sx-post'); if (!post || e.target.closest('a, button, video, iframe, input, textarea, [data-pie], .sx-post-hilo')) return;
    window.getSelection?.()?.removeAllRanges(); disparar(post, e.clientX, e.clientY);
  });
}

/* ---------- Tirar para recargar (solo táctil, solo arriba del todo) ---------- */
export function montarTirarParaRecargar(zona, alRecargar) {
  const aro = document.createElement('div'); aro.className = 'gx-aro'; aro.setAttribute('aria-hidden', 'true'); aro.innerHTML = '<i class="fa-solid fa-arrows-rotate"></i>';
  document.body.append(aro);
  let y0 = null; let d = 0; let cargando = false;
  const UMBRAL = 80;
  zona.addEventListener('touchstart', (e) => { if (window.scrollY > 2 || cargando) { y0 = null; return; } y0 = e.touches[0].clientY; d = 0; }, { passive: true });
  zona.addEventListener('touchmove', (e) => {
    if (y0 == null) return; d = Math.max(0, e.touches[0].clientY - y0);
    if (d < 6) return;
    const k = Math.min(1, d / UMBRAL); aro.style.setProperty('--k', String(k)); aro.dataset.listo = String(k >= 1); aro.classList.add('gx-ve');
  }, { passive: true });
  zona.addEventListener('touchend', async () => {
    if (y0 == null) return; y0 = null;
    if (d < UMBRAL) { aro.classList.remove('gx-ve'); return; }
    cargando = true; aro.classList.add('gx-girando'); vibrar(12);
    try { await alRecargar(); } finally { setTimeout(() => { aro.classList.remove('gx-ve', 'gx-girando'); cargando = false; }, 400); }
  });
}

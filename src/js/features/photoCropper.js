// RECORTADOR DE FOTO: arrastra para mover, desliza/rueda/pellizca para el zoom, y mira cómo quedará la tarjeta ANTES de guardar.
// openPhotoCropper(file, { getPlayer, aspecto }) → Promise<{ blob, aspecto }|null>  (null = canceló).
// Largo de la foto: Normal 5:4 (solo la zona superior), Media 1:1 (llega al nombre) o Larga 4:5 (llega a las estadísticas).
// La tarjeta NO cambia de tamaño: la foto es una capa detrás del contenido.
import { openModal, closeModal } from '../core/modal.js';
import { initialState, zoomAt, clampPos, rescale, sourceRect, outSize, coverScale, ASPECTOS, ASPECTO_NUEVA, aspectoValido, ratioDe, MAX_ZOOM } from '../core/crop.js';
import { playerCardHTML } from './playerCard.js';

const ID = 'crop-modal';

export async function openPhotoCropper(file, { getPlayer = () => ({}), aspecto: aspecto0 = null } = {}) {
  if (!file?.type?.startsWith('image/')) throw new Error('El archivo no es una imagen.');
  if (file.size > 12 * 1024 * 1024) throw new Error('La imagen supera 12 MB.');
  const bmp = await createImageBitmap(file);                        // respeta la orientación EXIF de los celulares
  const nw = bmp.width; const nh = bmp.height;
  const url = URL.createObjectURL(file);

  return new Promise((resolve) => {
    let hecho = false; let aspecto = aspecto0 ? aspectoValido(aspecto0) : ASPECTO_NUEVA;
    const fin = (res) => { if (hecho) return; hecho = true; document.removeEventListener('keydown', onKey, true); ro?.disconnect(); URL.revokeObjectURL(url); bmp.close?.(); closeModal(ID); resolve(res); };
    // Esc cierra SOLO este recortador (captura: llega antes que el Esc del formulario que está debajo).
    const onKey = (e) => { if (e.key === 'Escape') { e.stopPropagation(); fin(null); } };
    document.addEventListener('keydown', onKey, true);

    const m = openModal(`
      <div class="p-5 sm:p-6 space-y-4">
        <div class="flex justify-between items-center">
          <h2 class="font-display font-bold text-xl sm:text-2xl text-white uppercase tracking-wider"><i class="fa-solid fa-crop-simple text-galaxy-400 mr-2"></i>Ajustar foto</h2>
          <button type="button" id="cr-x" aria-label="Cancelar" class="text-gray-500 hover:text-white"><i class="fa-solid fa-xmark text-xl"></i></button>
        </div>
        <div class="flex flex-col sm:flex-row gap-4">
          <div class="flex-1 min-w-0 space-y-3">
            <div class="seg" id="cr-asp" role="group" aria-label="Hasta dónde llega la foto en la tarjeta">${Object.entries(ASPECTOS).map(([k, a]) => `<button type="button" data-v="${k}" aria-pressed="${k === aspecto}">${a.nombre} </button>`).join('')}</div>
            <div id="cr-frame" class="cr-frame" tabindex="0" role="application" aria-label="Zona de recorte. Arrastra para mover, usa el zoom para acercar. Con teclado: flechas para mover, más y menos para el zoom.">
              <img id="cr-img" src="${url}" alt="" draggable="false">
              <div class="cr-grid" aria-hidden="true"></div>
            </div>
            <div class="flex items-center gap-2">
              <button type="button" id="cr-menos" class="step" aria-label="Alejar">−</button>
              <input id="cr-zoom" type="range" class="stat-range flex-1" min="0" max="100" step="1" value="0" aria-label="Zoom" style="--p:0%;--c:#00e5ff">
              <button type="button" id="cr-mas" class="step" aria-label="Acercar">+</button>
              <button type="button" id="cr-reset" class="text-[11px] text-galaxy-400 hover:text-white font-bold uppercase px-2 min-h-9">Ajustar</button>
            </div>
            <p class="text-[11px] text-gray-500">Arrastra la foto para moverla. Tu foto se guarda con el encuadre que ves aquí.</p>
          </div>
          <div class="sm:w-[15rem] shrink-0 mx-auto sm:mx-0">
            <span class="label">Vista previa de la tarjeta</span>
            <div id="cr-prev" class="cr-prev"></div>
          </div>
        </div>
        <div class="flex flex-col-reverse sm:flex-row gap-2">
          <button type="button" id="cr-cancel" class="btn btn-ghost sm:flex-1">Cancelar</button>
          <button type="button" id="cr-ok" class="btn btn-primary sm:flex-1"><i class="fa-solid fa-check"></i> Usar esta foto</button>
        </div>
      </div>`, { id: ID, wide: true, persistent: true });

    const $ = (s) => m.querySelector(s);
    const frame = $('#cr-frame'); const img = $('#cr-img'); const zoom = $('#cr-zoom');
    let fw = 0; let fh = 0; let st = null;
    // El marco toma la proporción elegida; en celular se limita el alto para que no ocupe toda la pantalla.
    const ponerMarco = () => { const r = ratioDe(aspecto); frame.style.aspectRatio = String(r); frame.style.width = `min(100%, calc(52vh * ${r}))`; frame.style.marginInline = 'auto'; };
    ponerMarco();
    const dim = () => ({ nw, nh, fw, fh });

    // ---- Vista previa: la tarjeta real con la misma foto y el mismo encuadre ----
    const prev = $('#cr-prev');
    const dibujarPrev = () => {
      if (!st || !fw) return;
      const base = getPlayer() ?? {};
      prev.innerHTML = playerCardHTML({ nombre: 'Nombre', club: 'Club', posicion: 'DC', ovr: 75, ...Object.fromEntries(Object.entries(base).filter(([, v]) => v !== '' && v != null)), foto_url: 'https://x.invalid/placeholder.jpg', foto_aspecto: aspecto });
      const caja = prev.querySelector('[data-foto-caja]'); const pimg = caja?.querySelector('img');
      if (!pimg) return;
      const k = caja.clientWidth / fw;   // misma escala horizontal; la caja de la tarjeta tiene la misma proporción                                // el mismo encuadre, a escala de la tarjeta de muestra
      pimg.removeAttribute('loading'); pimg.src = url;
      pimg.className = '';
      Object.assign(pimg.style, { position: 'absolute', left: '0', top: '0', maxWidth: 'none', width: `${nw * st.s * k}px`, height: `${nh * st.s * k}px`, transform: `translate(${st.x * k}px, ${st.y * k}px)` });
    };
    const pintar = () => {
      img.style.width = `${nw * st.s}px`; img.style.height = `${nh * st.s}px`; img.style.transform = `translate(${st.x}px, ${st.y}px)`;
      const s0 = coverScale(nw, nh, fw, fh); const t = ((st.s / s0) - 1) / (MAX_ZOOM - 1);
      zoom.value = String(Math.round(t * 100)); zoom.style.setProperty('--p', `${Math.round(t * 100)}%`);
      dibujarPrev();
    };
    const medir = () => {
      const r = frame.getBoundingClientRect(); if (!r.width) return;
      const nuevoW = r.width; const nuevoH = nuevoW / ratioDe(aspecto);
      if (!st) { fw = nuevoW; fh = nuevoH; st = initialState(nw, nh, fw, fh); }
      else if (Math.abs(nuevoW - fw) > 0.5) { st = rescale(st, nuevoW / fw); fw = nuevoW; fh = nuevoH; }
      pintar();
    };
    const ro = typeof ResizeObserver !== 'undefined' ? new ResizeObserver(medir) : null; ro?.observe(frame);
    requestAnimationFrame(medir);

    // ---- Mover (un dedo / mouse) y pellizcar (dos dedos) ----
    const punteros = new Map(); let ultimaDist = 0;
    frame.addEventListener('pointerdown', (e) => { frame.setPointerCapture(e.pointerId); punteros.set(e.pointerId, { x: e.clientX, y: e.clientY }); ultimaDist = 0; frame.classList.add('cr-grab'); });
    frame.addEventListener('pointermove', (e) => {
      const p = punteros.get(e.pointerId); if (!p || !st) return;
      if (punteros.size === 1) {
        const c = clampPos(st.x + (e.clientX - p.x), st.y + (e.clientY - p.y), st.s, nw, nh, fw, fh); st = { ...st, ...c };
      } else if (punteros.size === 2) {
        punteros.set(e.pointerId, { x: e.clientX, y: e.clientY });
        const [a, b] = [...punteros.values()]; const dist = Math.hypot(a.x - b.x, a.y - b.y);
        if (ultimaDist) { const r = frame.getBoundingClientRect(); st = zoomAt(st, dist / ultimaDist, (a.x + b.x) / 2 - r.left, (a.y + b.y) / 2 - r.top, dim()); }
        ultimaDist = dist; pintar(); return;
      }
      punteros.set(e.pointerId, { x: e.clientX, y: e.clientY }); pintar();
    });
    const soltar = (e) => { punteros.delete(e.pointerId); ultimaDist = 0; if (!punteros.size) frame.classList.remove('cr-grab'); };
    ['pointerup', 'pointercancel'].forEach((ev) => frame.addEventListener(ev, soltar));
    frame.addEventListener('wheel', (e) => { e.preventDefault(); const r = frame.getBoundingClientRect(); st = zoomAt(st, e.deltaY < 0 ? 1.1 : 1 / 1.1, e.clientX - r.left, e.clientY - r.top, dim()); pintar(); }, { passive: false });

    // ---- Zoom con botones, deslizador y teclado ----
    const zoomCentro = (f) => { st = zoomAt(st, f, fw / 2, fh / 2, dim()); pintar(); };
    $('#cr-mas').addEventListener('click', () => zoomCentro(1.15));
    $('#cr-menos').addEventListener('click', () => zoomCentro(1 / 1.15));
    zoom.addEventListener('input', () => { const s0 = coverScale(nw, nh, fw, fh); const objetivo = s0 * (1 + (Number(zoom.value) / 100) * (MAX_ZOOM - 1)); st = zoomAt(st, objetivo / st.s, fw / 2, fh / 2, dim()); pintar(); });
    // Cambiar la proporción: el marco se rehace con el alto nuevo y se vuelve a encuadrar (la foto sigue siendo la misma).
    $('#cr-asp').addEventListener('click', (e) => {
      const b = e.target.closest('button[data-v]'); if (!b || b.dataset.v === aspecto) return;
      aspecto = b.dataset.v; $('#cr-asp').querySelectorAll('button').forEach((x) => x.setAttribute('aria-pressed', String(x === b)));
      ponerMarco(); fw = 0; st = null; requestAnimationFrame(medir);
    });
    $('#cr-reset').addEventListener('click', () => { st = initialState(nw, nh, fw, fh); pintar(); });
    frame.addEventListener('keydown', (e) => {
      const paso = 12; const mv = { ArrowLeft: [paso, 0], ArrowRight: [-paso, 0], ArrowUp: [0, paso], ArrowDown: [0, -paso] }[e.key];
      if (mv) { e.preventDefault(); st = { ...st, ...clampPos(st.x + mv[0], st.y + mv[1], st.s, nw, nh, fw, fh) }; pintar(); }
      else if (e.key === '+' || e.key === '=') zoomCentro(1.15); else if (e.key === '-') zoomCentro(1 / 1.15);
    });

    // ---- Confirmar: recorta de verdad la imagen ORIGINAL (no la pantalla) ----
    $('#cr-ok').addEventListener('click', async () => {
      try {
        const { sx, sy, sw, sh } = sourceRect(st, fw, fh); const { w, h } = outSize(sw, aspecto);
        const cv = document.createElement('canvas'); cv.width = w; cv.height = h;
        const ctx = cv.getContext('2d'); ctx.imageSmoothingQuality = 'high';
        ctx.drawImage(bmp, sx, sy, sw, sh, 0, 0, w, h);
        const blob = await new Promise((res) => cv.toBlob(res, 'image/jpeg', 0.86));
        if (!blob) throw new Error('No se pudo procesar la imagen.');
        fin({ blob, aspecto });
      } catch (ex) { console.error('[recorte] confirmar:', ex); $('#cr-ok').textContent = 'No se pudo recortar. Reintenta.'; }
    });
    $('#cr-cancel').addEventListener('click', () => fin(null));
    $('#cr-x').addEventListener('click', () => fin(null));
  });
}

// Página /stickers-recibir/ (19-oct-2026): guarda en «Mis stickers» lo que llega compartido desde otras apps (share_target + public/sw.js,
// que deja los archivos en la caché «px-compartidos») o lo que la persona elige a mano. Paquetes .wastickers/.zip: se abren y se suben todos.
import { escapeHTML } from '../core/sistema/dom.js';
import { toast } from '../core/sistema/toast.js';
import { onSession } from '../core/sistema/session.js';
import { href } from '../core/sistema/config.js';
import { openAuthModal } from '../features/auth.js';
import { ACEPTA, importarArchivosSticker } from '../features/social/stickers.js';
import { tipoSticker, esPaqueteStickers } from '../features/muro/api.js';

const CACHE = 'px-compartidos';
const caja = document.querySelector('[data-stkr-recibidos]'); const rejilla = document.querySelector('[data-stkr-rejilla]');
const boton = document.querySelector('[data-stkr-guardar]'); const nota = document.querySelector('[data-stkr-nota]'); const titulo = document.querySelector('[data-stkr-titulo]');
const S = { yo: null, archivos: [], urls: [] };
document.querySelector('[data-stkr-archivo]')?.setAttribute('accept', ACEPTA);

function pintar() {
  caja.hidden = !S.archivos.length; if (!S.archivos.length) return;
  S.urls.forEach((u) => URL.revokeObjectURL(u)); S.urls = [];
  titulo.textContent = S.archivos.length === 1 ? '1 archivo recibido' : `${S.archivos.length} archivos recibidos`;
  rejilla.innerHTML = S.archivos.map((f) => {
    if (esPaqueteStickers(f)) return `<span class="stkr-item stkr-paquete"><i class="fa-solid fa-box-open" aria-hidden="true"></i><small>${escapeHTML(f.name)}</small></span>`;
    const tipo = tipoSticker(f); if (!tipo) return `<span class="stkr-item stkr-malo" title="Este archivo no es un sticker"><i class="fa-solid fa-ban" aria-hidden="true"></i><small>${escapeHTML(f.name)}</small></span>`;
    const u = URL.createObjectURL(f); S.urls.push(u);
    return `<span class="stkr-item">${tipo === 'video/webm' ? `<video src="${u}" autoplay loop muted playsinline></video>` : `<img src="${u}" alt="">`}</span>`;
  }).join('');
  boton.disabled = false; nota.textContent = S.yo ? '' : 'Inicia sesión para guardarlos.';
}
// Lo que dejó el service worker al compartir desde otra app
async function leerCompartidos() {
  if (!('caches' in window)) return;
  try {
    const c = await caches.open(CACHE); const ks = await c.keys(); const fs = [];
    for (const k of ks) { const r = await c.match(k); if (!r) continue; const blob = await r.blob(); fs.push(new File([blob], decodeURIComponent(r.headers.get('x-nombre') || 'sticker'), { type: blob.type || r.headers.get('content-type') || '' })); }
    if (fs.length) { S.archivos = fs; pintar(); }
  } catch (e) { console.warn('[stickers] compartidos:', e?.message); }
}
async function vaciarCompartidos() { try { await caches.delete(CACHE); } catch { /* nada que borrar */ } }

document.querySelector('[data-stkr-archivo]')?.addEventListener('change', (e) => { const fs = [...(e.target.files ?? [])]; if (fs.length) { S.archivos = fs; pintar(); caja.scrollIntoView({ behavior: 'smooth', block: 'start' }); } });
boton.addEventListener('click', async () => {
  if (!S.yo) { openAuthModal('login'); return; }
  boton.disabled = true; const tx = boton.querySelector('span');
  try {
    const r = await importarArchivosSticker(S.archivos, S.yo, (hechos, total) => { tx.textContent = `Guardando ${Math.min(hechos + 1, total)}/${total}…`; });
    tx.textContent = 'Guardar en Mis stickers';
    if (r.urls.length) {
      toast(`${r.urls.length === 1 ? '1 sticker guardado' : `${r.urls.length} stickers guardados`} en «Mis stickers».${r.fallidos ? ` ${r.fallidos} no se pudieron.` : ''}`, 'ok');
      nota.innerHTML = `Listo. Úsalos desde el botón de stickers al responder. <a href="${escapeHTML(href('social/'))}">Ir a Social</a>`;
      S.archivos = []; await vaciarCompartidos(); rejilla.innerHTML = ''; titulo.textContent = '¡Guardados!';
    } else { toast(r.error || 'No se pudo guardar ninguno.', 'error'); boton.disabled = false; }
  } catch (e) { toast(String(e?.message ?? 'No se pudo guardar.'), 'error'); tx.textContent = 'Guardar en Mis stickers'; boton.disabled = false; }
});

onSession(({ session }) => { S.yo = session?.user?.id ?? null; if (S.archivos.length) pintar(); });
leerCompartidos();

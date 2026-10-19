// STICKERS en los comentarios (19-oct-2026, Fralex: «haz todos los comentarios que tengan stickers, e incluso pueda subir stickers de WhatsApp y TikTok»).
//   stickerHTML(valor, { guardable }) → cómo se ve un sticker en un comentario (pack Phoenix dibujado o la imagen subida, animada si lo era);
//   abrirSelectorStickers({ ancla, uid, alElegir }) → panel «Phoenix» | «Mis stickers», subir (.webp de WhatsApp, GIF/PNG de TikTok) o pegar con Ctrl+V.
//   Tocar el ＋ de un sticker ajeno lo guarda en «Mis stickers» (como en WhatsApp).
// Base: migración 137 (bucket «stickers», muro_respuestas.sticker, stickers_usuario). Lo usan pages/social.js y pages/perfil.js; estilos en styles/stickers.css.
import { escapeHTML } from '../../core/sistema/dom.js';
import { toast } from '../../core/sistema/toast.js';
import { STICKERS_PHX, stickerPhx } from '../../../data/stickers.js';
import * as api from '../muro/api.js';

const URL_STICKER = /^https:\/\/fiibiyijojkxqlsrhcil\.supabase\.co\/storage\/v1\/object\/public\/stickers\/[0-9a-f-]{36}\/[A-Za-z0-9._-]{1,80}$/;   // la misma regla que private.sticker_valido
export const esStickerSubido = (v) => URL_STICKER.test(String(v ?? ''));

/** HTML de un sticker. `guardable`: muestra el ＋ para guardarlo en «Mis stickers» (solo en los subidos por otra persona). '' si el valor no es válido. */
export function stickerHTML(valor, { guardable = false } = {}) {
  const p = stickerPhx(valor);
  if (p) return `<span class="stk stk-phx" style="--c:${p.color}" role="img" aria-label="Sticker: ${escapeHTML(p.texto)}"><span class="stk-emo" aria-hidden="true">${p.emoji}</span><b>${escapeHTML(p.texto)}</b></span>`;
  if (!esStickerSubido(valor)) return '';
  return `<span class="stk stk-img"><img src="${escapeHTML(valor)}" alt="Sticker" loading="lazy" decoding="async">${guardable ? `<button type="button" class="stk-guardar" data-stk-guardar="${escapeHTML(valor)}" aria-label="Guardar en mis stickers" title="Guardar en mis stickers"><i class="fa-solid fa-plus" aria-hidden="true"></i></button>` : ''}</span>`;
}

// «Guardar en mis stickers» (el ＋ sobre un sticker ajeno), en cualquier página que muestre stickers
document.addEventListener('click', async (e) => {
  const b = e.target.closest('[data-stk-guardar]'); if (!b) return;
  e.preventDefault(); e.stopPropagation(); if (b.disabled) return; b.disabled = true;
  try { await api.guardarSticker(b.dataset.stkGuardar); toast('Sticker guardado en «Mis stickers».', 'ok'); b.classList.add('is-ok'); b.innerHTML = '<i class="fa-solid fa-check" aria-hidden="true"></i>'; }
  catch (err) { toast(/sesi/i.test(String(err?.message)) ? 'Inicia sesión para guardar stickers.' : String(err?.message ?? 'No se pudo guardar.'), 'error'); b.disabled = false; }
}, true);

let abierto = null;
export function cerrarSelectorStickers() { abierto?.(); }

/** Abre el selector junto a `ancla` (en celular, como hoja desde abajo). `alElegir(valor)` recibe 'phx:<id>' o la URL del sticker. */
export function abrirSelectorStickers({ ancla, uid, alElegir }) {
  cerrarSelectorStickers();
  const panel = document.createElement('div'); panel.className = 'stk-panel'; panel.setAttribute('role', 'dialog'); panel.setAttribute('aria-label', 'Elegir un sticker');
  let pestana = 'phx'; let mios = null; let subiendo = false;
  const pintar = () => {
    const rejilla = pestana === 'phx'
      ? STICKERS_PHX.map((s) => `<button type="button" class="stk-op" data-stk-valor="phx:${s.id}" title="${escapeHTML(s.texto)}">${stickerHTML(`phx:${s.id}`)}</button>`).join('')
      : !uid ? '<p class="stk-nota">Inicia sesión para tener tus propios stickers.</p>'
        : mios === null ? '<p class="stk-nota">Cargando tus stickers…</p>'
          : mios.length ? mios.map((m) => `<span class="stk-op-caja"><button type="button" class="stk-op" data-stk-valor="${escapeHTML(m.url)}" aria-label="Enviar este sticker">${stickerHTML(m.url)}</button>${m.id ? `<button type="button" class="stk-quitar" data-stk-quitar="${Number(m.id)}" aria-label="Quitar de mis stickers" title="Quitar de mis stickers"><i class="fa-solid fa-xmark" aria-hidden="true"></i></button>` : ''}</span>`).join('')
            : '<p class="stk-nota">Aún no tienes stickers. Sube uno de WhatsApp o TikTok, o guarda los que te gusten con el ＋ que aparece sobre ellos en los comentarios.</p>';
    panel.innerHTML = `<div class="stk-cab"><div class="stk-tabs" role="tablist" aria-label="Paquetes de stickers"><button type="button" role="tab" data-stk-tab="phx" aria-selected="${pestana === 'phx'}">🔥 Phoenix</button><button type="button" role="tab" data-stk-tab="mios" aria-selected="${pestana === 'mios'}">⭐ Mis stickers</button></div><button type="button" class="stk-x" data-stk-cerrar aria-label="Cerrar"><i class="fa-solid fa-xmark" aria-hidden="true"></i></button></div>
      <div class="stk-rejilla${pestana === 'phx' ? ' es-phx' : ''}">${rejilla}</div>
      <label class="stk-subir${subiendo ? ' is-subiendo' : ''}"><input type="file" accept="image/webp,image/png,image/gif,.webp,.png,.gif" hidden data-stk-archivo ${subiendo ? 'disabled' : ''}><i class="fa-solid ${subiendo ? 'fa-spinner fa-spin' : 'fa-upload'}" aria-hidden="true"></i><span><b>${subiendo ? 'Subiendo…' : 'Subir sticker'}</b><small>WhatsApp (.webp) · TikTok (GIF o PNG) · máx. 1 MB · o pégalo con Ctrl+V</small></span></label>`;
  };
  const cargarMios = async () => { if (!uid) return; try { mios = (await api.misStickers()) ?? []; } catch { mios = []; } if (pestana === 'mios') pintar(); };
  const subir = async (file) => {
    if (!uid) { toast('Inicia sesión para subir stickers.', 'info'); return; }
    if (subiendo || !file) return;
    subiendo = true; pintar();
    try { const url = await api.subirSticker(file, uid); mios = [{ id: 0, url }, ...(mios ?? [])]; pestana = 'mios'; toast('Sticker subido: tócalo para enviarlo.', 'ok'); cargarMios(); }
    catch (err) { toast(String(err?.message ?? 'No se pudo subir el sticker.'), 'error'); }
    subiendo = false; pintar();
  };
  const colocar = () => {
    if (innerWidth <= 560) { panel.classList.add('es-hoja'); return; }
    const r = ancla.getBoundingClientRect(); const w = panel.offsetWidth; const h = panel.offsetHeight;
    panel.style.left = `${Math.max(8, Math.min(innerWidth - w - 8, r.right - w))}px`;
    const top = r.top - h - 8 >= 8 ? r.top - h - 8 : r.bottom + 8;
    panel.style.top = `${Math.max(8, Math.min(innerHeight - h - 8, top))}px`;   // siempre dentro de la pantalla
  };
  panel.addEventListener('click', async (e) => {
    const tab = e.target.closest('[data-stk-tab]'); if (tab) { pestana = tab.dataset.stkTab; pintar(); if (pestana === 'mios' && mios === null) cargarMios(); return; }
    if (e.target.closest('[data-stk-cerrar]')) { cerrar(); return; }
    const q = e.target.closest('[data-stk-quitar]');
    if (q) { try { await api.quitarSticker(Number(q.dataset.stkQuitar)); mios = (mios ?? []).filter((m) => m.id !== Number(q.dataset.stkQuitar)); pintar(); } catch (err) { toast(String(err?.message ?? 'No se pudo quitar.'), 'error'); } return; }
    const op = e.target.closest('[data-stk-valor]'); if (op) { const v = op.dataset.stkValor; cerrar(); alElegir?.(v); }
  });
  panel.addEventListener('change', (e) => { const inp = e.target.closest('[data-stk-archivo]'); if (inp?.files?.[0]) subir(inp.files[0]); });
  const alPegar = (e) => { const f = [...(e.clipboardData?.files ?? [])].find((x) => api.tipoSticker(x)); if (f) { e.preventDefault(); subir(f); } };
  const fuera = (e) => { if (!panel.contains(e.target) && !ancla.contains(e.target)) cerrar(); };
  const teclas = (e) => { if (e.key === 'Escape') { e.preventDefault(); cerrar(); ancla.focus?.(); } };
  function cerrar() {
    panel.remove(); abierto = null;
    document.removeEventListener('paste', alPegar); document.removeEventListener('pointerdown', fuera, true); document.removeEventListener('keydown', teclas, true); removeEventListener('resize', cerrar);
  }
  pintar(); document.body.append(panel); colocar(); requestAnimationFrame(colocar);   // otra vez cuando ya cargaron las letras y los emojis
  document.addEventListener('paste', alPegar); document.addEventListener('pointerdown', fuera, true); document.addEventListener('keydown', teclas, true); addEventListener('resize', cerrar);
  panel.querySelector('[data-stk-tab="phx"]')?.focus({ preventScroll: true });
  abierto = cerrar;
  cargarMios();
}

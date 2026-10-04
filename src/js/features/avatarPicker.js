// Selector de foto de perfil COMPARTIDO por «Mi perfil» y el formulario de bienvenida:
// subir foto · galería de avatares · usar la de Discord/Google. Guarda la elección en un objeto
// { kind: 'keep'|'preset'|'provider'|'file', ... } que luego se convierte en `avatar_url` con resolveAvatar().
import { supabase } from '../core/supabase.js';
import { escapeHTML } from '../core/dom.js';
import { cropSquareJpeg } from '../core/image.js';
import { PRESETS, presetId, presetValue, avatarHTML, providerAvatar, providerName } from '../core/avatar.js';

/** HTML del selector. `ns` evita ids repetidos si hubiera dos a la vez. */
export function avatarPickerHTML({ avatarUrl, name, user, ns = 'p' }) {
  const prov = providerName(user); const foto = providerAvatar(user);
  return `
    <div class="flex items-center gap-4">
      <span id="${ns}-prev" class="w-16 h-16 shrink-0 rounded-full overflow-hidden border border-galaxy-400/50 bg-galaxy-card flex items-center justify-center">${avatarHTML(avatarUrl, name, 64)}</span>
      <div class="flex flex-wrap gap-2">
        <label class="btn btn-ghost cursor-pointer !px-3 !py-2"><i class="fa-solid fa-camera"></i> Subir foto<input id="${ns}-file" type="file" accept="image/*" hidden></label>
        <button type="button" id="${ns}-btn-gal" class="btn btn-ghost !px-3 !py-2" aria-expanded="false"><i class="fa-solid fa-masks-theater"></i> Avatares</button>
        ${foto ? `<button type="button" id="${ns}-btn-prov" class="btn btn-ghost !px-3 !py-2"><i class="fa-brands ${prov === 'Discord' ? 'fa-discord' : 'fa-google'}"></i> Usar la de ${escapeHTML(prov)}</button>` : ''}
      </div>
    </div>
    <div id="${ns}-gal" hidden class="grid grid-cols-6 gap-2" role="group" aria-label="Avatares disponibles">
      ${PRESETS.map((a) => `<button type="button" data-preset="${a.id}" aria-label="${escapeHTML(a.label)}" title="${escapeHTML(a.label)}" class="aspect-square rounded-full overflow-hidden border-2 border-transparent hover:border-galaxy-400 aria-pressed:border-white transition-colors" aria-pressed="false">${avatarHTML(presetValue(a.id), '', 44)}</button>`).join('')}
    </div>`;
}

/**
 * Conecta el selector. Devuelve { get(): elección actual, repaint(): redibuja la vista previa (p. ej. si cambió el apodo) }.
 * `initial` permite preseleccionar algo (p. ej. { kind:'provider', url }).
 */
export function bindAvatarPicker(root, { user, getName, onError, initial = { kind: 'keep' }, currentUrl = '', ns = 'p' }) {
  const $ = (s) => root.querySelector(s);
  const foto = providerAvatar(user);
  let choice = initial; let shown = initial.kind === 'provider' ? initial.url : currentUrl;
  const prev = (url) => { shown = url; $(`#${ns}-prev`).innerHTML = avatarHTML(url, getName(), 64); };
  const clearPresets = (except = null) => root.querySelectorAll('[data-preset]').forEach((b) => b.setAttribute('aria-pressed', String(b === except)));
  if (initial.kind === 'provider') prev(initial.url);

  $(`#${ns}-file`).addEventListener('change', async (e) => {
    try { const blob = await cropSquareJpeg(e.target.files[0]); choice = { kind: 'file', blob }; prev(URL.createObjectURL(blob)); clearPresets(); }
    catch (ex) { console.error('[avatar] imagen:', ex); onError?.(ex.message); }
  });
  $(`#${ns}-btn-gal`).addEventListener('click', () => {
    const g = $(`#${ns}-gal`); g.hidden = !g.hidden; $(`#${ns}-btn-gal`).setAttribute('aria-expanded', String(!g.hidden));
  });
  $(`#${ns}-gal`).addEventListener('click', (e) => {
    const b = e.target.closest('[data-preset]'); if (!b) return;
    choice = { kind: 'preset', id: b.dataset.preset }; prev(presetValue(b.dataset.preset)); clearPresets(b);
  });
  $(`#${ns}-btn-prov`)?.addEventListener('click', () => { choice = { kind: 'provider', url: foto }; prev(foto); clearPresets(); });
  return { get: () => choice, repaint: () => prev(shown) };
}

/** Convierte la elección en el valor de `perfiles.avatar_url` (sube la foto si hace falta). Devuelve undefined si no cambia. */
export async function resolveAvatar(choice, uid) {
  if (choice.kind === 'preset' && presetId(presetValue(choice.id))) return presetValue(choice.id);
  if (choice.kind === 'provider') return choice.url;
  if (choice.kind === 'file') {
    const path = `${uid}/avatar.jpg`;
    const up = await supabase.storage.from('avatars').upload(path, choice.blob, { upsert: true, contentType: 'image/jpeg', cacheControl: '3600' });
    if (up.error) throw up.error;
    return `${supabase.storage.from('avatars').getPublicUrl(path).data.publicUrl}?v=${Date.now()}`;
  }
  return undefined;
}

/** Mensaje amable para los errores de guardado de identidad (cooldown del @, @ repetido…). */
export function identityError(ex) {
  const msg = String(ex?.message ?? '');
  const c = /USERNAME_COOLDOWN:(\S+)/.exec(msg);
  if (c) { const d = new Date(c[1]); return `Solo puedes cambiar tu @usuario cada 14 días. Podrás volver a hacerlo el ${Number.isNaN(d.getTime()) ? c[1] : d.toLocaleDateString('es-PE', { day: 'numeric', month: 'long', year: 'numeric' })}.`; }
  if (ex?.code === '23505') return 'Ese usuario ya está en uso. Elige otro.';
  return msg || 'No se pudo guardar.';
}

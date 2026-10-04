// AVATARES — único lugar que decide cómo se dibuja la foto de un jugador.
// perfiles.avatar_url puede ser: una foto "https://…" (subida o de Discord/Google), un avatar predefinido
// "preset:<id>" (se dibuja aquí, sin imagen) o vacío (se muestra la inicial). Sin dependencias del navegador
// en las funciones puras, para poder probarlas.
import { escapeHTML, safeUrl } from './dom.js';

/** Avatares predefinidos (para quien se registra con correo y no tiene foto). Para añadir uno: una línea aquí. */
export const PRESETS = [
  { id: 'fenix',     label: 'Fénix',     icon: 'fa-dragon',         a: '#8000ff', b: '#00e5ff' },
  { id: 'cometa',    label: 'Cometa',    icon: 'fa-meteor',         a: '#ff6a00', b: '#ee0979' },
  { id: 'rayo',      label: 'Rayo',      icon: 'fa-bolt',           a: '#f7b500', b: '#ff5e00' },
  { id: 'astronauta',label: 'Astronauta',icon: 'fa-user-astronaut', a: '#1d4ed8', b: '#00e5ff' },
  { id: 'balon',     label: 'Balón',     icon: 'fa-futbol',         a: '#059669', b: '#00e5ff' },
  { id: 'corona',    label: 'Corona',    icon: 'fa-crown',          a: '#b45309', b: '#fcd34d' },
  { id: 'escudo',    label: 'Escudo',    icon: 'fa-shield-halved',  a: '#1e3a8a', b: '#8000ff' },
  { id: 'fuego',     label: 'Fuego',     icon: 'fa-fire',           a: '#dc2626', b: '#fb923c' },
  { id: 'fantasma',  label: 'Fantasma',  icon: 'fa-ghost',          a: '#475569', b: '#a78bfa' },
  { id: 'robot',     label: 'Robot',     icon: 'fa-robot',          a: '#0e7490', b: '#38bdf8' },
  { id: 'calavera',  label: 'Calavera',  icon: 'fa-skull',          a: '#111827', b: '#7c3aed' },
  { id: 'mago',      label: 'Mago',      icon: 'fa-hat-wizard',     a: '#6d28d9', b: '#f472b6' },
];

/** "preset:fenix" → "fenix" si existe en PRESETS; si no, ''. */
export const presetId = (value) => {
  const m = /^preset:([a-z0-9-]{1,30})$/.exec(String(value ?? ''));
  return m && PRESETS.some((p) => p.id === m[1]) ? m[1] : '';
};
export const presetValue = (id) => `preset:${id}`;

/** Foto que trae el proveedor de login (Discord/Google) en los metadatos del usuario; '' si no hay. */
export function providerAvatar(user) {
  const meta = user?.user_metadata ?? {};
  const url = safeUrl(meta.avatar_url || meta.picture);
  return url && url.length <= 300 ? url : '';
}

/** Nombre del proveedor con el que inició sesión ("Discord", "Google") o ''. */
export const providerName = (user) => ({ discord: 'Discord', google: 'Google' }[user?.app_metadata?.provider] ?? '');

/**
 * HTML interior de un avatar (el contenedor — círculo, tamaño, borde — lo pone quien lo usa).
 * `size` (px) solo sirve para escalar el ícono de los avatares predefinidos.
 */
export function avatarHTML(avatarUrl, name = '?', size = 36) {
  const id = presetId(avatarUrl);
  if (id) {
    const p = PRESETS.find((x) => x.id === id);
    return `<span class="w-full h-full flex items-center justify-center text-white" style="background:linear-gradient(135deg,${p.a},${p.b})"><i class="fa-solid ${p.icon}" style="font-size:${Math.round(size * 0.5)}px"></i></span>`;
  }
  const initial = escapeHTML(String(name ?? '').trim().slice(0, 1).toUpperCase() || '?');
  const url = safeUrl(avatarUrl);
  return url
    ? `<img src="${escapeHTML(url)}" alt="" referrerpolicy="no-referrer" loading="lazy" data-av-inicial="${initial}" class="w-full h-full object-cover">`
    : `<span class="font-display font-bold text-galaxy-400" style="font-size:${Math.round(size * 0.45)}px">${initial}</span>`;
}

/** Si una foto no carga (enlace roto o caducado), la cambia por la inicial. Una sola vez, para toda la página. */
export function initAvatarFallback() {
  document.addEventListener('error', (e) => {
    const img = e.target;
    if (!(img instanceof HTMLImageElement) || !('avInicial' in img.dataset)) return;
    const span = document.createElement('span');
    span.className = 'font-display font-bold text-galaxy-400';
    span.textContent = img.dataset.avInicial || '?';   // textContent: nunca interpreta HTML
    img.replaceWith(span);
  }, true);
}

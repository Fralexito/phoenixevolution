// Utilidades de DOM puras (sin dependencias del entorno → fáciles de probar).

const ENTITIES = { '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;', '`': '&#96;' };

/** Escapa texto para insertarlo en innerHTML. Úsalo con TODO dato que venga de la BD o del usuario. */
export const escapeHTML = (value) => String(value ?? '').replace(/[&<>"'`]/g, (c) => ENTITIES[c]);

/** Devuelve la URL solo si es https:// (o parsec:// / steam:// si se permite); si no, ''. Evita javascript: y data:. */
export function safeUrl(value, { allowParsec = false } = {}) {
  const v = String(value ?? '').trim();
  if (/^https:\/\//i.test(v)) return v;
  if (allowParsec && /^(parsec|steam):\/\//i.test(v)) return v;
  return '';
}

export const $ = (sel, root = document) => root.querySelector(sel);
export const $$ = (sel, root = document) => [...root.querySelectorAll(sel)];

/** Normaliza un gamertag a username válido: ^[a-z0-9_]{1,20}$ */
export const toUsername = (s) =>
  String(s ?? '').toLowerCase().replace(/[^a-z0-9_]/g, '').slice(0, 20);

/** Color de una estadística 0-99 (umbrales del diseño original). */
export const statColor = (v) => (v >= 90 ? '#00e5ff' : v >= 80 ? '#00ff88' : v >= 70 ? '#ffb700' : '#ff4444');

/** Imagen segura: https:// o data:image (fotos antiguas en base64). Cualquier otra cosa → ''. */
export function safeImg(value) {
  const v = String(value ?? '').trim();
  if (/^https:\/\//i.test(v)) return v;
  if (/^data:image\/(jpeg|png|webp|gif);base64,[A-Za-z0-9+/=]+$/.test(v)) return v;
  return '';
}

/** Convierte a entero 0-99 con valor por defecto. */
export const stat = (v, def = 75) => { const n = Math.round(Number(v)); return Number.isFinite(n) && n > 0 ? Math.min(n, 99) : def; };

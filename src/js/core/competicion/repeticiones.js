// Repeticiones del partido — lógica PURA (sin DOM → `npm test`). Misma lista de sitios que private.url_video_ok (migración 155).
const SITIOS = [
  ['youtube.com', 'YouTube', 'fa-play'], ['youtu.be', 'YouTube', 'fa-play'], ['twitch.tv', 'Twitch', 'fa-video'], ['kick.com', 'Kick', 'fa-video'],
  ['streamable.com', 'Streamable', 'fa-film'], ['medal.tv', 'Medal', 'fa-film'], ['drive.google.com', 'Google Drive', 'fa-film'],
  ['facebook.com', 'Facebook', 'fa-film'], ['fb.watch', 'Facebook', 'fa-film'], ['tiktok.com', 'TikTok', 'fa-film'], ['fiibiyijojkxqlsrhcil.supabase.co', 'Phoenix', 'fa-film'],
];
/** Valida el enlace. → { ok, url, sitio } o { ok:false, error }. */
export function validarUrlVideo(texto) {
  const t = String(texto ?? '').trim();
  if (!t) return { ok: false, error: 'Pega el enlace del video.' };
  if (t.length > 300) return { ok: false, error: 'El enlace es demasiado largo.' };
  let u; try { u = new URL(t); } catch { return { ok: false, error: 'Eso no parece un enlace.' }; }
  if (u.protocol !== 'https:') return { ok: false, error: 'El enlace debe empezar con https://' };
  if (/[\s<>"']/.test(t)) return { ok: false, error: 'El enlace tiene caracteres raros.' };
  const host = u.hostname.toLowerCase();
  const s = SITIOS.find(([d]) => host === d || host.endsWith(`.${d}`));
  if (!s) return { ok: false, error: 'Usa YouTube, Twitch, Kick, Streamable, Medal, Google Drive, Facebook o TikTok.' };
  return { ok: true, url: t, sitio: s[1], icono: s[2] };
}
export const sitioDe = (url) => { const v = validarUrlVideo(url); return v.ok ? { nombre: v.sitio, icono: v.icono } : { nombre: 'Video', icono: 'fa-film' }; };

// Clips de la portada: YouTube (id del video), Twitch (slug del clip) y Kick (nombre del canal). Lógica pura, con test.
export const FUENTES = { youtube: 'YouTube', twitch: 'Twitch', kick: 'Kick' };
export const fuenteDe = (c) => (c && FUENTES[c.fuente] ? c.fuente : 'youtube');
export function urlEmbed(c, host = 'localhost') {
  const id = encodeURIComponent(c.id);
  const f = fuenteDe(c);
  if (f === 'twitch') return `https://clips.twitch.tv/embed?clip=${id}&parent=${encodeURIComponent(host)}&autoplay=true`;
  if (f === 'kick') return `https://player.kick.com/${id}?autoplay=true`;
  return `https://www.youtube-nocookie.com/embed/${id}?autoplay=1&rel=0`;
}
// Solo YouTube tiene miniatura automática; Twitch y Kick devuelven null (se dibuja un fondo con el nombre de la plataforma).
export const miniatura = (c, tam = 'hqdefault') => (fuenteDe(c) === 'youtube' ? `https://i.ytimg.com/vi/${encodeURIComponent(c.id)}/${tam}.jpg` : null);
export const etiquetaFuente = (c) => FUENTES[fuenteDe(c)];

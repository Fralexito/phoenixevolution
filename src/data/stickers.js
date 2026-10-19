// STICKERS PHOENIX (19-oct-2026, Fralex: «haz todos los comentarios que tengan stickers»). Pack incorporado: no son imágenes, se dibujan en la web
// (features/social/stickers.js + styles/stickers.css), así pesan cero y se ven nítidos en cualquier pantalla.
// En la base se guardan como 'phx:<id>' (migración 137, private.sticker_valido: id de 2 a 24 letras minúsculas, números o guiones).
// Para AÑADIR uno: agrega una línea aquí (id nuevo). Para cambiar texto, emoji o color: edítalo aquí (los ya enviados se ven con lo nuevo).
export const STICKERS_PHX = [
  { id: 'golazo', emoji: '⚽', texto: '¡GOLAZO!', color: '#fb923c' },
  { id: 'atajada', emoji: '🧤', texto: '¡QUÉ ATAJADA!', color: '#22d3ee' },
  { id: 'gg', emoji: '🤝', texto: 'GG', color: '#34d399' },
  { id: 'revancha', emoji: '⚔️', texto: '¿REVANCHA?', color: '#f43f5e' },
  { id: 'crack', emoji: '🐐', texto: 'CRACK', color: '#fbbf24' },
  { id: 'var', emoji: '📺', texto: '¡VAR!', color: '#a78bfa' },
  { id: 'robado', emoji: '😤', texto: '¡ROBADO!', color: '#ef4444' },
  { id: 'penal', emoji: '🎯', texto: '¡ERA PENAL!', color: '#60a5fa' },
  { id: 'lag', emoji: '🐌', texto: '¡LAG!', color: '#94a3b8' },
  { id: 'fuego', emoji: '🔥', texto: 'EN LLAMAS', color: '#fb7185' },
  { id: 'calle', emoji: '🏚️', texto: 'TE FALTA CALLE', color: '#f97316' },
  { id: 'jaja', emoji: '😂', texto: 'JAJAJA', color: '#facc15' },
];
export const stickerPhx = (valor) => STICKERS_PHX.find((s) => `phx:${s.id}` === valor) ?? null;

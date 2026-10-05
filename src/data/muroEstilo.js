// Opciones de estilo del muro (datos puros). Para añadir un banner: una línea en BANNERS (el id solo admite a-z, 0-9 y guion: lo exige la BD).
export const BANNERS = [
  { id: 'nebulosa',   label: 'Nebulosa',   css: 'radial-gradient(120% 140% at 15% 0%, #8000ff 0%, #2a0a5e 45%, #070314 100%)' },
  { id: 'estadio',    label: 'Estadio',    css: 'linear-gradient(180deg, #052e1b 0%, #0b5a35 55%, #0f7a47 100%)' },
  { id: 'fuego',      label: 'Fuego',      css: 'linear-gradient(135deg, #7f1d1d 0%, #ea580c 55%, #fbbf24 100%)' },
  { id: 'hielo',      label: 'Hielo',      css: 'linear-gradient(135deg, #0c4a6e 0%, #0ea5e9 60%, #e0f2fe 100%)' },
  { id: 'oro',        label: 'Oro',        css: 'linear-gradient(135deg, #451a03 0%, #b45309 55%, #fcd34d 100%)' },
  { id: 'aurora',     label: 'Aurora',     css: 'linear-gradient(120deg, #022c22 0%, #0d9488 40%, #7c3aed 100%)' },
  { id: 'medianoche', label: 'Medianoche', css: 'linear-gradient(160deg, #020617 0%, #1e1b4b 60%, #312e81 100%)' },
  { id: 'carmesi',    label: 'Carmesí',    css: 'linear-gradient(135deg, #1c0a14 0%, #9f1239 60%, #f43f5e 100%)' },
];
export const BANNER_DEFECTO = 'nebulosa';
export const ACENTOS = ['#00e5ff', '#a78bfa', '#00ff88', '#fbbf24', '#fb7185', '#f97316', '#38bdf8', '#e879f9'];
export const ACENTO_DEFECTO = '#00e5ff';
export const MURO_MAX = 1000;
export const LEMA_MAX = 80;
export const MURO_VER = [['PUBLICO', 'Público', 'Cualquiera puede ver mi muro, tenga o no cuenta.'], ['AMIGOS', 'Solo amigos', 'Solo mis amigos (y yo) vemos mis publicaciones.']];
export const MURO_RESPONDER = [['TODOS', 'Todos', 'Cualquiera con sesión podrá responder y reaccionar.'], ['AMIGOS', 'Solo amigos', 'Solo mis amigos podrán responder.'], ['NADIE', 'Nadie', 'Mi muro será de solo lectura: nadie podrá responder ni reaccionar.']];
export const RESP_MAX = 500;
/** Reacciones rápidas (las que se ofrecen cuando una publicación aún no tiene ninguna). En la BD el `tipo` ES el emoji (migración 026). */
export const REACCIONES = [['🔥', 'Fuego'], ['🤝', 'GG'], ['👏', 'Aplauso'], ['😂', 'Risa'], ['❤️', 'Me encanta']];
/** Paleta completa del botón «+». La BD acepta cualquier emoji (no ASCII, ≤ 16 caracteres); el cliente solo ofrece estos. */
export const PALETA_EMOJIS = ['🔥', '🤝', '👏', '😂', '❤️', '😮', '😎', '🤩', '😭', '😡', '🤯', '🥶', '🥵', '💀', '🫡', '🙏', '💪', '👑', '🏆', '⚽', '🎯', '🧤', '🥅', '🚀', '💯', '✅', '❌', '👀', '🤡', '😴', '🫶', '👍', '👎', '🍿', '⭐', '💥', '🧠', '🐐', '🔝', '🎮'];
/** Claves antiguas (antes de la migración 026) → emoji. Solo para leer datos viejos sin romper nada. */
export const REACCION_ANTIGUA = { fuego: '🔥', gg: '🤝', aplauso: '👏', risa: '😂', corazon: '❤️' };

/** Segmentos por juego (opcionales). El id lo valida la BD (muro_publicaciones.juego / muro_clips.juego, migración 027). Sin segmento = «general». */
export const SEGMENTOS = [['pes', 'PES 2021'], ['sp', 'SP Football Life'], ['fifa', 'FIFA'], ['eafc', 'EA FC'], ['efootball', 'eFootball']];

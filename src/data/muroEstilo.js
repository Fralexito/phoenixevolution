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
// Logo de cada juego (19-oct-2026): archivo dentro de public/juegos/. Si el archivo no está, la web muestra la letra (P, SP, F, FC, eF).
// Para cambiar un logo: reemplaza el archivo (mismo nombre) o cambia aquí la ruta. Mejor PNG/WebP/SVG con fondo transparente.
// Las versiones más recientes (19-oct-2026, Fralex: «los más recientes»): PES 2021 Season Update, FIFA 23 (el último FIFA), FC 26 y eFootball 2026,
// de Wikimedia Commons (dominio público), recortados a 64 px de alto; Football Life: la placa «FL26» que dio Fralex.
export const LOGOS_JUEGO = { pes: 'juegos/pes2021.png', sp: 'juegos/sp-football-life.png', fifa: 'juegos/fifa23.png', eafc: 'juegos/ea-sports-fc-26.png', efootball: 'juegos/efootball-2026.png' };

// ── Publicar como en una red social (19-oct-2026, migración 133: muro_publicaciones.extra) ──
/** Fondos para textos cortos (como los de Facebook). El id lo guarda la BD (solo a-z, 0-9 y guion); el dibujo vive aquí. */
export const FONDOS_POST = [
  { id: 'galaxia', label: 'Galaxia', css: 'radial-gradient(120% 120% at 20% 10%, #7c3aed 0%, #2a0a5e 50%, #070314 100%)' },
  { id: 'neon', label: 'Neón', css: 'linear-gradient(135deg, #00e5ff 0%, #7c3aed 100%)' },
  { id: 'atardecer', label: 'Atardecer', css: 'linear-gradient(135deg, #f97316 0%, #db2777 55%, #7c3aed 100%)' },
  { id: 'cesped', label: 'Césped', css: 'repeating-linear-gradient(90deg, #15803d 0 34px, #166534 34px 68px)' },
  { id: 'estadio', label: 'Estadio de noche', css: 'radial-gradient(90% 70% at 50% 0%, #fef9c3 0%, #0f766e 30%, #022c22 100%)' },
  { id: 'fuego', label: 'Fuego', css: 'linear-gradient(135deg, #7f1d1d 0%, #ea580c 55%, #fbbf24 100%)' },
  { id: 'hielo', label: 'Hielo', css: 'linear-gradient(135deg, #0c4a6e 0%, #0ea5e9 60%, #bae6fd 100%)' },
  { id: 'oro', label: 'Trofeo', css: 'linear-gradient(135deg, #451a03 0%, #b45309 50%, #fcd34d 100%)' },
  { id: 'carmesi', label: 'Carmesí', css: 'linear-gradient(135deg, #1c0a14 0%, #9f1239 60%, #f43f5e 100%)' },
  { id: 'medianoche', label: 'Medianoche', css: 'linear-gradient(160deg, #020617 0%, #1e1b4b 60%, #4338ca 100%)' },
];
/** Con fondo, el texto va grande y centrado: solo para textos cortos (como en Facebook). */
export const FONDO_MAX_TEXTO = 200;
/** «¿Cómo te sientes / qué estás haciendo?» (Facebook). `t` = cómo se lee: «Ana está emocionado/a 🤩». */
export const SENTIMIENTOS = [
  { id: 'emocionado', emoji: '🤩', t: 'emocionado' }, { id: 'feliz', emoji: '😄', t: 'feliz' }, { id: 'motivado', emoji: '💪', t: 'motivado' },
  { id: 'orgulloso', emoji: '😎', t: 'orgulloso' }, { id: 'nervioso', emoji: '😬', t: 'nervioso' }, { id: 'picado', emoji: '😤', t: 'picado' },
  { id: 'triste', emoji: '😢', t: 'triste' }, { id: 'agradecido', emoji: '🙏', t: 'agradecido' },
  { id: 'jugando', emoji: '🎮', t: 'jugando', actividad: true }, { id: 'celebrando', emoji: '🏆', t: 'celebrando un triunfo', actividad: true },
  { id: 'entrenando', emoji: '⚽', t: 'entrenando', actividad: true }, { id: 'viendo', emoji: '📺', t: 'viendo un partido', actividad: true },
  { id: 'buscando-rival', emoji: '🎯', t: 'buscando rival', actividad: true }, { id: 'fichando', emoji: '✍️', t: 'fichando jugadores', actividad: true },
];
/** Fotos por publicación: la primera es la principal (imagen_url) y hasta 3 más van en extra.fotos. */
export const FOTOS_MAX = 4;

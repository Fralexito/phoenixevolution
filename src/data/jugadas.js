// JUGADAS (19-oct-2026): categorías del feed vertical de videos. Los ids son los que acepta la base (migración 136, check de muro_clips.categoria).
// Para cambiar el nombre, el emoji o el color de una categoría: edita aquí. Para AÑADIR una categoría hay que ampliar también el check en la base.
export const CATEGORIAS_JUGADA = [
  { id: 'golazo', nombre: 'Golazos', corto: 'Golazo', emoji: '⚽', color: '#fb923c' },
  { id: 'atajada', nombre: 'Atajadas', corto: 'Atajada', emoji: '🧤', color: '#22d3ee' },
  { id: 'skill', nombre: 'Skills', corto: 'Skill', emoji: '✨', color: '#c084fc' },
  { id: 'remontada', nombre: 'Remontadas', corto: 'Remontada', emoji: '🔁', color: '#34d399' },
  { id: 'fail', nombre: 'Fails', corto: 'Fail', emoji: '😂', color: '#fb7185' },
  { id: 'otro', nombre: 'Otras', corto: 'Jugada', emoji: '🎮', color: '#94a3b8' },
];
export const categoriaJugada = (id) => CATEGORIAS_JUGADA.find((c) => c.id === id) ?? null;
// Pestañas de arriba: «Para ti» (lo más nuevo), «Top de la semana» (más reacciones en 7 días) y una por categoría.
export const PESTANAS_JUGADAS = [
  { id: 'para-ti', nombre: 'Para ti', emoji: '▶', orden: 'recientes', categoria: null },
  { id: 'top', nombre: 'Top semana', emoji: '🔥', orden: 'top', categoria: null },
  ...CATEGORIAS_JUGADA.filter((c) => c.id !== 'otro').map((c) => ({ id: c.id, nombre: c.nombre, emoji: c.emoji, orden: 'recientes', categoria: c.id })),
];

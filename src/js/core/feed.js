// Vistas de la página Comunidad (puro, sin DOM ni red → probable). Las reglas de qué se ve las pone la BD (migración 041 y 027).
export const VISTAS = Object.freeze([
  { id: 'recientes', texto: 'Recientes', icono: 'fa-clock', filtraJuego: true, requiereSesion: false },
  { id: 'siguiendo', texto: 'Siguiendo', icono: 'fa-user-group', filtraJuego: false, requiereSesion: true },
  { id: 'destacado', texto: 'Destacado', icono: 'fa-fire', filtraJuego: false, requiereSesion: false },
]);
export const vistaInfo = (id) => VISTAS.find((v) => v.id === id) ?? VISTAS[0];
/** Cualquier valor (p. ej. de la URL) → id de vista válido; lo desconocido es «recientes». */
export const vistaValida = (v) => vistaInfo(v).id;

/** Cómo pedir la siguiente página: recientes y siguiendo usan el id de la última publicación; destacado usa cuántas ya hay (orden por puntaje, sin cursor). */
export function paginaSiguiente(vista, items) {
  const n = Array.isArray(items) ? items.length : 0;
  if (vista === 'destacado') return { desplazamiento: n };
  return { antes: n ? items[n - 1]?.id ?? null : null };
}
/** Texto de «no hay nada» según la vista. `conSesion` = hay una persona conectada. */
export function textoVacio(vista, { juego = '', conSesion = false } = {}) {
  if (vista === 'siguiendo') return conSesion ? 'Todavía no hay publicaciones de la gente que sigues. Busca jugadores en «Buscar» y empieza a seguirlos.' : 'Inicia sesión para ver lo que publica la gente que sigues.';
  if (vista === 'destacado') return 'Todavía no hay publicaciones destacadas. Aparecen cuando reciben reacciones y respuestas.';
  return juego ? 'Todavía no hay publicaciones de ese juego.' : 'Todavía no hay publicaciones.';
}

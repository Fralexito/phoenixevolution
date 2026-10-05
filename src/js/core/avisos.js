// Reglas de los AVISOS (campana): categorías que cada persona puede apagar + comprobación del enlace de un aviso (puro, sin DOM → probable).
// ESPEJO de la migración 033: `private.categoria_notif` y la restricción `notificaciones_enlace_ok`. La base de datos es la que manda;
// aquí solo se decide qué mostrar. Los avisos de moderación («sistema») no se pueden apagar y por eso no aparecen en la lista.

export const CATEGORIAS_AVISO = Object.freeze([
  { id: 'duelos',    titulo: 'Duelos y partidos',      icono: 'fa-bolt',       texto: 'Retos, invitaciones, salas listas, confirmaciones y avisos finales. Si lo apagas, podrías perderte una confirmación a tiempo.' },
  { id: 'social',    titulo: 'Amigos y seguidores',    icono: 'fa-user-group', texto: 'Solicitudes de amistad, amistades aceptadas y nuevos seguidores.' },
  { id: 'muro',      titulo: 'Respuestas en tu muro',  icono: 'fa-comment',    texto: 'Cuando alguien responde a una de tus publicaciones.' },
  { id: 'menciones', titulo: 'Menciones',              icono: 'fa-at',         texto: 'Cuando alguien escribe tu @usuario en una publicación o respuesta.' },
]);
export const NOTA_SISTEMA = 'Los avisos del equipo de moderación (por ejemplo, una sanción) siempre te llegan: no se pueden apagar.';

/** Respuesta de `mis_preferencias_notif` (o null) → { duelos, social, muro, menciones } con true/false. Todo lo desconocido cuenta como ACTIVADO. */
export const normalizarPreferencias = (obj) => Object.fromEntries(CATEGORIAS_AVISO.map((c) => [c.id, obj?.[c.id] !== false]));

export const esCategoriaAviso = (id) => CATEGORIAS_AVISO.some((c) => c.id === id);

const ENLACE = /^[a-z0-9][a-z0-9_/.-]*(\?[A-Za-z0-9_=&.-]*)?(#[A-Za-z0-9_-]*)?$/;
/** Enlace relativo de un aviso → el mismo texto si es seguro; si no, null (nunca http(s)://, javascript:, ni //). */
export const enlaceAvisoSeguro = (e) => (typeof e === 'string' && e.length <= 200 && ENLACE.test(e) ? e : null);

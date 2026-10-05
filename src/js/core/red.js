// Red social (puro, sin DOM → probable): normaliza lo que devuelve `mi_red()`, calcula la relación con cada persona y busca jugadores.
import { norm } from './search.js';

export const PRIVACIDAD_DEFECTO = Object.freeze({ quien_solicita: 'todos', quien_escribe: 'amigos', ver_amigos: 'amigos', mostrar_conexion: true });

/** Opciones de privacidad: única fuente para la pantalla (etiqueta, explicación y valores permitidos). */
export const PRIVACIDAD_OPCIONES = [
  { clave: 'quien_solicita', titulo: 'Quién puede enviarte solicitudes de amistad', icono: 'fa-user-plus',
    opciones: [['todos', 'Cualquier jugador'], ['nadie', 'Nadie (solo tú envías)']] },
  { clave: 'quien_escribe', titulo: 'Quién puede escribirte en privado', icono: 'fa-comment-dots',
    opciones: [['nadie', 'Nadie'], ['amigos', 'Solo mis amigos'], ['amigos_y_seguidores', 'Amigos y seguidores'], ['todos', 'Cualquier jugador']] },
  { clave: 'ver_amigos', titulo: 'Quién puede ver tu lista de amigos', icono: 'fa-eye',
    opciones: [['nadie', 'Nadie'], ['amigos', 'Solo mis amigos'], ['todos', 'Cualquier jugador']] },
];

const lista = (x) => (Array.isArray(x) ? x.filter((v) => typeof v === 'string') : []);

/** Respuesta de `mi_red()` (posiblemente incompleta o nula) → objeto siempre completo. Nunca lanza. */
export function normalizarRed(raw) {
  const r = raw && typeof raw === 'object' ? raw : {};
  const p = r.privacidad && typeof r.privacidad === 'object' ? r.privacidad : {};
  const valida = (clave, valor) => (PRIVACIDAD_OPCIONES.find((o) => o.clave === clave)?.opciones.some(([v]) => v === valor) ? valor : PRIVACIDAD_DEFECTO[clave]);
  return {
    amigos: lista(r.amigos), recibidas: lista(r.recibidas), enviadas: lista(r.enviadas),
    siguiendo: lista(r.siguiendo), seguidores: lista(r.seguidores), bloqueados: lista(r.bloqueados),
    privacidad: { quien_solicita: valida('quien_solicita', p.quien_solicita), quien_escribe: valida('quien_escribe', p.quien_escribe),
      ver_amigos: valida('ver_amigos', p.ver_amigos), mostrar_conexion: p.mostrar_conexion !== false },
  };
}

/** Relación mía con `id`: 'yo' | 'bloqueado' | 'amigos' | 'enviada' | 'recibida' | 'ninguna'. (Las acciones de seguir van aparte.) */
export function relacion(red, id, yo = null) {
  if (id && id === yo) return 'yo';
  if (red.bloqueados.includes(id)) return 'bloqueado';
  if (red.amigos.includes(id)) return 'amigos';
  if (red.enviadas.includes(id)) return 'enviada';
  if (red.recibidas.includes(id)) return 'recibida';
  return 'ninguna';
}

/** Busca perfiles por nombre visible o usuario (sin tildes ni mayúsculas). Excluye a `yo` y a quienes bloqueé; empiezan-con primero. */
export function buscarPerfiles(perfiles, texto, red, yo, limite = 20) {
  const t = norm(texto); if (t.length < 2) return [];
  const fuera = new Set([yo, ...red.bloqueados]);
  return [...perfiles].filter((p) => p?.id && !fuera.has(p.id) && (norm(p.nombre_display).includes(t) || norm(p.username).includes(t)))
    .sort((a, b) => Number(norm(b.nombre_display).startsWith(t)) - Number(norm(a.nombre_display).startsWith(t)) || norm(a.nombre_display).localeCompare(norm(b.nombre_display)))
    .slice(0, limite);
}

/** Contadores para las pestañas. */
export const contadores = (red) => ({ amigos: red.amigos.length, solicitudes: red.recibidas.length, seguidores: red.seguidores.length, siguiendo: red.siguiendo.length, bloqueados: red.bloqueados.length });

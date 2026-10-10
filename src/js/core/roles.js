// Roles del staff (puro, sin DOM → probable). ESPEJO de la base de datos (migración 030).
// IMPORTANTE: la BD es la que manda (RLS). Esto solo decide qué botones y secciones se MUESTRAN; aunque alguien lo manipulara en el
// navegador, la base de datos rechaza lo que su rol no permite.

export const ROLES = Object.freeze(['jugador', 'arbitro', 'ayudante', 'moderador', 'admin']);

/** Etiqueta, icono y tono de cada rol (única fuente para todas las pantallas). */
export const ROL_INFO = Object.freeze({
  jugador:   { etiqueta: 'Jugador',       icono: 'fa-gamepad',       tono: 'neutro', descripcion: 'Participa en la liga y la comunidad.' },
  arbitro:   { etiqueta: 'Árbitro',       icono: 'fa-scale-balanced', tono: 'info',  descripcion: 'Resuelve las disputas de partidos del Tribunal.' },
  ayudante:  { etiqueta: 'Ayudante',      icono: 'fa-life-ring',     tono: 'ok',     descripcion: 'Ve los reportes y avisa al staff. No modifica nada.' },
  moderador: { etiqueta: 'Moderador',     icono: 'fa-shield-halved', tono: 'warn',   descripcion: 'Crea y edita la liga, oculta contenido y suspende jugadores. No borra.' },
  admin:     { etiqueta: 'Administrador', icono: 'fa-crown',         tono: 'rol',    descripcion: 'Control total: roles, borrado y auditoría completa.' },
});

/** Cualquier valor → un rol válido. Los valores antiguos («comisario») y los desconocidos nunca dan poder de más. */
export function normalizarRol(rol) {
  const r = String(rol ?? '').toLowerCase();
  if (r === 'comisario') return 'arbitro';
  return ROLES.includes(r) ? r : 'jugador';
}

export const etiquetaRol = (rol) => ROL_INFO[normalizarRol(rol)].etiqueta;

/** Qué roles pueden hacer cada cosa. Si añades un permiso, añádelo también en la BD (política RLS o función). */
export const PERMISOS = Object.freeze({
  editarLiga:           ['moderador', 'admin'],   // crear y editar jugadores, equipos, partidos, estadísticas, noticias…
  borrarLiga:           ['admin'],                // borrar de verdad: solo el admin (el moderador oculta o despublica)
  crearLigaTemporada:   ['admin'],                // crear ligas y temporadas
  verAuditoria:         ['moderador', 'admin'],
  verAuditoriaCompleta: ['admin'],                // el moderador solo ve sus propias acciones
  darRoles:             ['admin'],
  sancionar:            ['moderador', 'admin'],   // suspender o banear (siempre a alguien de menor rango, ver puedeSancionar)
  verReportes:          ['ayudante', 'moderador', 'admin'],
  resolverReportes:     ['moderador', 'admin'],
  arbitrar:             ['arbitro', 'admin'],     // resolver disputas del Tribunal
  moderarValoraciones:  ['moderador', 'admin'],   // ver y anular valoraciones post-partido (migración 044)
  gestionarClanes:      ['moderador', 'admin'],   // ocultar clanes y sacar gente de un clan (migración 043)
  administrarTienda:    ['admin'],                // catálogo, reglas, ajustes de tokens y pagos (migraciones 049-051)
  avisarJuego:          ['moderador', 'admin'],   // aviso global a todos los juegos (migración 096)
  moderarChat:          ['moderador', 'admin'],   // borrar mensajes del chat general (migración 099; la BD lo exige igual)
  gestionarTorneos:     ['moderador', 'admin'],   // ocultar/cancelar torneos propios y ajustar topes (migración 097)
  gestionarEventos:     ['moderador', 'admin'],   // crear, editar y cancelar eventos de la comunidad (migración 042)
});

export const puede = (rol, permiso) => (PERMISOS[permiso] ?? []).includes(normalizarRol(rol));

/** Rango para decidir quién puede sancionar a quién. Árbitro y ayudante valen lo mismo: están por encima del jugador y por debajo del moderador. */
const RANGO = Object.freeze({ jugador: 0, arbitro: 1, ayudante: 1, moderador: 2, admin: 3 });

/** Regla de oro: solo se sanciona a alguien de RANGO MENOR. Un moderador no toca a otro moderador ni a un admin; un admin no sanciona a otro admin (los roles se cambian con asignar_rol). */
export const puedeSancionar = (rolActor, rolObjetivo) => puede(rolActor, 'sancionar') && RANGO[normalizarRol(rolActor)] > RANGO[normalizarRol(rolObjetivo)];

export const esStaff = (rol) => ['ayudante', 'moderador', 'admin'].includes(normalizarRol(rol));

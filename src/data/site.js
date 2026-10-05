// Datos globales del sitio: UNA sola estructura de navegación para cabecera, menú móvil y pestañas de sección.
// Se organiza por lo que la persona quiere HACER (5 secciones). Para añadir una página: UNA línea en `items` de su sección
// (`id` = el `active` de la página; `path` relativo a la base; `info` = frase corta que se ve en el desplegable).
export const SECCIONES = [
  { id: 'inicio', label: 'Inicio', icon: 'fa-house', path: '', items: [] },
  { id: 'jugar', label: 'Jugar', icon: 'fa-gamepad', items: [
    { id: 'duelos', label: 'Sala de duelos', path: 'duelos/', icon: 'fa-gamepad', info: 'Busca rival y juega ahora' },
    { id: 'partidos', label: 'Mis partidos', path: 'mis-partidos/', icon: 'fa-clipboard-check', info: 'Tus partidos, resultados y valoraciones' },
    { id: 'envivo', label: 'Salas en vivo', path: 'en-vivo/', icon: 'fa-tower-broadcast', info: 'Mira o transmite partidas' },
    { id: 'eventos', label: 'Eventos', path: 'eventos/', icon: 'fa-calendar-day', info: 'Torneos y quedadas de la comunidad' },
  ] },
  { id: 'liga', label: 'Liga', icon: 'fa-crown', items: [
    { id: 'liga', label: 'Liga', path: 'liga/', icon: 'fa-crown', info: 'Tabla, calendario y resultados' },
    { id: 'palmares', label: 'Palmarés', path: 'palmares/', icon: 'fa-trophy', info: 'Campeones y títulos' },
    { id: 'mercado', label: 'Mercado', path: 'mercado/', icon: 'fa-handshake', info: 'Fichajes y transferencias' },
    { id: 'database', label: 'Jugadores', path: 'database/', icon: 'fa-id-card', info: 'Fichas y comparador' },
  ] },
  { id: 'comunidad', label: 'Comunidad', icon: 'fa-people-group', items: [
    { id: 'comunidad', label: 'Comunidad', path: 'comunidad/', icon: 'fa-people-group', info: 'Quién está conectado y qué se cuece' },
    { id: 'noticias', label: 'Noticias', path: 'noticias/', icon: 'fa-newspaper', info: 'Lo último de la liga' },
    { id: 'clanes', label: 'Clanes', path: 'clanes/', icon: 'fa-shield-halved', info: 'Juega en equipo' },
    { id: 'ranking', label: 'Ranking', path: 'ranking/', icon: 'fa-ranking-star', info: 'Mejores del mes y retos semanales' },
    { id: 'amigos', label: 'Amigos', path: 'amigos/', icon: 'fa-user-group', info: 'Tu red y solicitudes' },
    { id: 'mensajes', label: 'Mensajes', path: 'mensajes/', icon: 'fa-comments', info: 'Chats y grupos' },
    { id: 'buscar', label: 'Buscar', path: 'buscar/', icon: 'fa-magnifying-glass', info: 'Encuentra personas y publicaciones' },
  ] },
  { id: 'tienda', label: 'Tienda', icon: 'fa-store', path: 'tienda/', items: [] },
];

/** Sección a la que pertenece una página (por su `active`). Devuelve la sección completa o null si no pertenece a ninguna (perfil, ajustes, staff…). */
export function seccionDe(activo) {
  if (activo === 'central') return SECCIONES[0];
  if (activo === 'tienda') return SECCIONES.find((x) => x.id === 'tienda');
  return SECCIONES.find((x) => x.items.some((i) => i.id === activo)) ?? null;
}
/** Dirección principal de una sección: la suya si es un enlace directo, o la de su primera página. */
export const rutaDeSeccion = (sec) => (typeof sec.path === 'string' ? sec.path : sec.items[0]?.path ?? '');

// Compatibilidad: lista plana de las páginas principales (por si algo antiguo la pide).
export const NAV = SECCIONES.map((x) => ({ id: x.id, label: x.label, path: rutaDeSeccion(x), icon: x.icon }));

// Menú lateral, grupo "Mi cuenta": solo se muestra con sesión iniciada.
// Para añadir una sección futura, agrega UNA línea aquí (con `path` para una página o `action` para algo del sistema).
export const ACCOUNT_NAV = [
  { id: 'perfil',   label: 'Mi perfil',   action: 'profile',              icon: 'fa-user' },
  { id: 'muro',     label: 'Mi muro',      path: 'perfil/',        icon: 'fa-newspaper' },
  { id: 'logros',   label: 'Mis logros',   path: 'logros/',        icon: 'fa-medal' },
  { id: 'guardados', label: 'Guardados',   path: 'guardados/',     icon: 'fa-bookmark' },
  // `staff: '<permiso>'` = solo lo ve quien tenga ese permiso (ver PERMISOS en core/roles.js); se muestra u oculta al iniciar sesión.
  { id: 'moderacion', label: 'Moderación', path: 'moderacion/',    icon: 'fa-shield-halved',  staff: 'verReportes' },
  { id: 'auditoria', label: 'Auditoría',   path: 'auditoria/',     icon: 'fa-clipboard-list', staff: 'verAuditoria' },
  // `abajo: true` = va en el bloque inferior del menú, pegado al fondo del panel.
  { id: 'ajustes',  label: 'Configuración', path: 'ajustes/',            icon: 'fa-gear',  abajo: true },
  { id: 'salir',    label: 'Salir',        action: 'logout',               icon: 'fa-right-from-bracket', abajo: true },
];

// Font Awesome gratis no trae el logo de Kick, así que usamos su trazo oficial de Simple Icons (licencia CC0).
const KICK_PATH = 'M1.333 0h8v5.333H12V2.667h2.667V0h8v8H20v2.667h-2.667v2.666H20V16h2.667v8h-8v-2.667H12v-2.666H9.333V24h-8Z';

// Redes: reemplaza los "#" por los enlaces reales de la comunidad.
export const SOCIALS = [
  { label: 'Discord', href: 'https://discord.gg/jsxZ3mtfwe', icon: 'fa-brands fa-discord', hover: 'hover:text-[#5865F2]' },
  { label: 'Kick',    href: '#', svg: KICK_PATH,            hover: 'hover:text-[#53FC18]' },
  { label: 'YouTube', href: '#', icon: 'fa-brands fa-youtube', hover: 'hover:text-[#FF0000]' },
  { label: 'TikTok',  href: 'https://www.tiktok.com/@phoenix_evolution', icon: 'fa-brands fa-tiktok',  hover: 'hover:text-white' },
];

export const TICKER = [
  'SALA DE DUELOS: Matchmaking activo con salas dedicadas de Parsec y Smash Soda.',
  'NOTICIAS: Cobertura editorial oficial de la 1° Edición en marcha.',
  'FAIR PLAY: Fralex lidera la tabla de reputación con Rango S (100 pts).',
  'MERCADO: Sistema de pases en pausa reglamentaria hasta nuevo aviso.',
];

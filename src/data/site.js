// Datos globales del sitio: UNA sola lista de navegación para cabecera y menú lateral.
export const NAV = [
  { id: 'central',   label: 'Central',       path: '',           icon: 'fa-house' },
  { id: 'liga',      label: 'Liga',          path: 'liga/',      icon: 'fa-crown' },
  { id: 'noticias',  label: 'Noticias',      path: 'noticias/',  icon: 'fa-newspaper' },
  { id: 'database',  label: 'Jugadores', path: 'database/',  icon: 'fa-database' },
  { id: 'duelos',    label: 'Duelos',        path: 'duelos/',    icon: 'fa-gamepad' },
  { id: 'mercado',   label: 'Mercado',       path: 'mercado/',   icon: 'fa-handshake' },
  { id: 'palmares',  label: 'Palmarés',      path: 'palmares/',  icon: 'fa-trophy' },
];

// Enlaces secundarios (no saturan la cabecera de PC): aparecen en el menú de celular y en el pie de página.
export const NAV_EXTRA = [
  { id: 'comunidad', label: 'Comunidad', path: 'comunidad/', icon: 'fa-people-group' },
  { id: 'organizadores', label: 'Quiénes somos', path: 'organizadores/', icon: 'fa-users' },
];

// Menú lateral, grupo "Mi cuenta": solo se muestra con sesión iniciada.
// Para añadir una sección futura, agrega UNA línea aquí (con `path` para una página o `action` para algo del sistema).
export const ACCOUNT_NAV = [
  { id: 'perfil',   label: 'Mi perfil',   action: 'profile',              icon: 'fa-user' },
  { id: 'muro',     label: 'Mi muro',      path: 'perfil/',        icon: 'fa-newspaper' },
  { id: 'partidos', label: 'Mis partidos', path: 'mis-partidos/',  icon: 'fa-gamepad' },
  { id: 'envivo',   label: 'Salas en vivo', path: 'en-vivo/',      icon: 'fa-tower-broadcast' },
  { id: 'mensajes', label: 'Mensajes',     path: 'mensajes/',      icon: 'fa-comments' },
  { id: 'amigos',   label: 'Amigos',       path: 'amigos/',        icon: 'fa-user-group' },
  // `staff: true` = solo lo ve quien tenga permiso de auditoría (moderador/admin); se muestra u oculta al iniciar sesión.
  { id: 'auditoria', label: 'Auditoría',   path: 'auditoria/',     icon: 'fa-clipboard-list', staff: true },
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

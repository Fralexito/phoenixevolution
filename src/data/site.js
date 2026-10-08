// Datos globales del sitio: UNA sola lista de navegación para cabecera y menú lateral.
import { FX } from './experimento.js';

export const NAV = [
  { id: 'central',   label: 'Central',       path: '',           icon: 'fa-house' },
  // «Social» va en la zona principal, justo después de Central. FX.social = false la quita del menú.
  ...(FX.social ? [{ id: 'social', label: 'Social', path: 'social/', icon: 'fa-earth-americas' }] : []),
  { id: 'liga',      label: 'Liga',          path: 'liga/',      icon: 'fa-crown' },
  { id: 'noticias',  label: 'Noticias',      path: 'noticias/',  icon: 'fa-newspaper' },
  { id: 'database',  label: 'Jugadores', path: 'database/',  icon: 'fa-database' },
  { id: 'duelos',    label: 'Duelos',        path: 'duelos/',    icon: 'fa-gamepad' },
  { id: 'creadores', label: 'Creadores',     path: 'creadores/', icon: 'fa-video' },
  { id: 'mercado',   label: 'Mercado',       path: 'mercado/',   icon: 'fa-handshake' },
  { id: 'palmares',  label: 'Palmarés',      path: 'palmares/',  icon: 'fa-trophy' },
];

// Enlaces secundarios (no saturan la cabecera de PC): aparecen en el menú de celular y en el pie de página.
export const NAV_EXTRA = [
  { id: 'eventos', label: 'Eventos', path: 'eventos/', icon: 'fa-calendar-day' },
  { id: 'clanes', label: 'Clanes', path: 'clanes/', icon: 'fa-shield-halved' },
  { id: 'ranking', label: 'Ranking', path: 'ranking/', icon: 'fa-ranking-star' },
  { id: 'tienda', label: 'Tienda', path: 'tienda/', icon: 'fa-store' },
  { id: 'organizadores', label: 'Quiénes somos', path: 'organizadores/', icon: 'fa-users' },
  { id: 'competiciones', label: 'Competiciones', path: 'competiciones/', icon: 'fa-trophy' },
  { id: 'historial', label: 'Historial', path: 'historial/', icon: 'fa-clock-rotate-left' },
  { id: 'unirme', label: 'Unirme a la liga', path: 'unirme/', icon: 'fa-door-open' },
];

// Apoyo voluntario a la comunidad (tipo «invítanos un café»). Vacío = no se muestra el botón. Pon aquí el enlace cuando lo tengas (solo https).
export const APOYO = { href: '', texto: 'Apoya la comunidad' };

// Menú lateral, grupo "Mi cuenta": solo se muestra con sesión iniciada.
// Para añadir una sección futura, agrega UNA línea aquí (con `path` para una página o `action` para algo del sistema).
export const ACCOUNT_NAV = [
  { id: 'perfil',   label: 'Mi perfil',   action: 'profile',              icon: 'fa-user', grupo: 'tu' },
  { id: 'muro',     label: 'Mi muro',      path: 'perfil/',        icon: 'fa-newspaper', grupo: 'tu' },
  { id: 'partidos', label: 'Mis partidos', path: 'mis-partidos/',  icon: 'fa-gamepad', grupo: 'tu' },
  { id: 'ahora',    label: 'Ahora mismo', path: 'ahora/',        icon: 'fa-satellite-dish', grupo: 'jugar' },
  { id: 'envivo',   label: 'Salas en vivo', path: 'en-vivo/',      icon: 'fa-tower-broadcast', grupo: 'jugar' },
  { id: 'missalas', label: 'Phoenix Link', path: 'mis-salas/',    icon: 'fa-desktop', grupo: 'jugar' },
  { id: 'mensajes', label: 'Mensajes',     path: 'mensajes/',      icon: 'fa-comments', grupo: 'social' },
  { id: 'amigos',   label: 'Amigos',       path: 'amigos/',        icon: 'fa-user-group', grupo: 'social' },
  { id: 'buscar',   label: 'Buscar',       path: 'buscar/',        icon: 'fa-magnifying-glass', grupo: 'social', menu: false },
  { id: 'guardados', label: 'Guardados',   path: 'guardados/',     icon: 'fa-bookmark', grupo: 'tu' },
  { id: 'logros',   label: 'Logros',       path: 'logros/',        icon: 'fa-medal', grupo: 'tu' },
  { id: 'eventos',  label: 'Eventos',      path: 'eventos/',       icon: 'fa-calendar-day', grupo: 'comunidad' },
  { id: 'clanes',   label: 'Clanes',       path: 'clanes/',        icon: 'fa-shield-halved', grupo: 'social' },
  { id: 'ranking',  label: 'Ranking',      path: 'ranking/',       icon: 'fa-ranking-star', grupo: 'comunidad' },
  { id: 'tienda',   label: 'Tienda',       path: 'tienda/',        icon: 'fa-store', grupo: 'comunidad' },
  { id: 'manager',  label: 'Liga Máster', path: 'manager/',       icon: 'fa-user-tie', grupo: 'jugar' },
  // `staff: '<permiso>'` = solo lo ve quien tenga ese permiso (ver PERMISOS en core/roles.js); se muestra u oculta al iniciar sesión.
  { id: 'moderacion', label: 'Moderación', path: 'moderacion/',    icon: 'fa-shield-halved',  staff: 'verReportes', grupo: 'staff' },
  { id: 'auditoria', label: 'Auditoría',   path: 'auditoria/',     icon: 'fa-clipboard-list', staff: 'verAuditoria', grupo: 'staff' },
  // `grupo` = bloque del panel «Mi cuenta» (ver GRUPOS_CUENTA). `menu: false` = no sale en el panel (ya está a la vista: la lupa del header), pero sí en el buscador.
  // `abajo: true` = va en el bloque inferior del menú, pegado al fondo del panel.
  { id: 'ajustes',  label: 'Configuración', path: 'ajustes/',            icon: 'fa-gear',  abajo: true },
  { id: 'salir',    label: 'Salir',        action: 'logout',               icon: 'fa-right-from-bracket', abajo: true },
];

// Bloques del panel «Mi cuenta», en este orden.
export const GRUPOS_CUENTA = [
  { id: 'tu', label: 'Tú' }, { id: 'jugar', label: 'Jugar' }, { id: 'social', label: 'Social' },
  { id: 'comunidad', label: 'Comunidad' }, { id: 'staff', label: 'Staff' },
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

// Nombre visible de la app de salas (cámbialo aquí y se actualiza en toda la web).
export const NOMBRE_APP = 'Phoenix Soda';

// ───────── Mapa del sitio en PILARES (FX.pilares) ─────────
// Cada sección vive en UN solo pilar. El menú de arriba muestra los pilares (desplegable con descripción) y cada página
// muestra las pestañas de su pilar para saltar entre hermanas. Para mover una sección de pilar, cambia su id de lista aquí.
const TODAS = () => [...NAV, ...NAV_EXTRA, ...ACCOUNT_NAV];
const DESC = {
  liga: 'Tabla, fechas y resultados de cada división', competiciones: 'Copas y torneos especiales', historial: 'Todos los partidos jugados',
  palmares: 'Campeones y vitrina de trofeos', ranking: 'Los mejores de la semana y de siempre',
  duelos: 'Reta a alguien y juega ya', envivo: 'Salas abiertas para entrar o mirar', ahora: 'Retos esperando rival y partidos para mirar',
  missalas: 'Vincula tu PC y abre salas', mercado: 'Conecta tu juego con la web', manager: 'Tu club, tu presupuesto, tus fichajes',
  noticias: 'Comunicados oficiales y la Tribuna', social: 'El muro de la comunidad', creadores: 'Streamers y directos verificados',
  clanes: 'Únete o arma tu clan', eventos: 'Lo que se viene en el calendario', database: 'Fichas de todos los jugadores',
  tienda: 'Estética y mejoras para tu perfil',
};
// En `ids`, 'x>y,z' = la sección x también «adopta» las páginas y,z (sus pestañas se iluminan allí). `RENOMBRE` cambia el texto solo en los pilares.
const RENOMBRE = { ahora: 'En vivo' };
const pilar = (id, label, icon, ids, extra = {}) => ({ id, label, icon, ...extra,
  items: ids.map((spec) => { const [i, otras] = spec.split('>'); const n = TODAS().find((x) => x.id === i && x.path != null);
    return n && { ...n, label: RENOMBRE[i] ?? n.label, desc: DESC[i] ?? '', tambien: otras ? otras.split(',') : [] }; }).filter(Boolean) });
export const PILARES = [
  pilar('competir', 'Competir', 'fa-trophy', ['liga', 'competiciones', 'historial', 'palmares', 'ranking', 'database'], { lema: 'La liga y sus jugadores' }),
  pilar('jugar', 'Jugar', 'fa-gamepad', ['duelos', 'ahora>envivo', 'manager>mercado'], { lema: 'Del clic al partido' }),
  pilar('comunidad', 'Comunidad', 'fa-people-group', ['noticias', 'social', 'creadores', 'clanes', 'eventos'], { lema: 'Lo que se dice y quién lo dice' }),
  pilar('tienda', 'Tienda', 'fa-store', ['tienda'], { lema: 'Tu estilo en la liga' }),
];
/** Pilar al que pertenece una página (por su `active`), o null (Central, cuenta, etc.). */
export const esDe = (n, active) => n.id === active || n.tambien?.includes(active);
export const pilarDe = (active) => PILARES.find((p) => p.items.some((n) => esDe(n, active))) ?? null;

// Datos globales del sitio: UNA sola lista de navegación para cabecera y menú lateral.
import { FX } from './experimento.js';

export const NAV = [
  { id: 'central',   label: 'Inicio',        path: '',           icon: 'fa-house' },
  // «Social» va en la zona principal, justo después de Central. FX.social = false la quita del menú.
  ...(FX.social ? [{ id: 'social', label: 'Social', path: 'social/', icon: 'fa-earth-americas' }] : []),
  { id: 'liga',      label: 'Liga',          path: 'liga/',      icon: 'fa-crown' },
  { id: 'noticias',  label: 'Noticias',      path: 'noticias/',  icon: 'fa-newspaper' },
  { id: 'database',  label: 'Jugadores', path: 'database/',  icon: 'fa-database' },
  { id: 'duelos',    label: 'Duelos',        path: 'duelos/',    icon: 'fa-gamepad' },
  { id: 'creadores', label: 'Creadores',     path: 'creadores/', icon: 'fa-video' },
  { id: 'mercado',   label: 'Conectar juego', path: 'mercado/',  icon: 'fa-plug' },
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
  { id: 'premios', label: 'Premios', path: 'premios/', icon: 'fa-award' },
  { id: 'unirme', label: 'Unirme a la liga', path: 'unirme/', icon: 'fa-door-open' },
  { id: 'hosts', label: 'Alquilar host', path: 'alquilar-host/', icon: 'fa-server' },
];

// Apoyo voluntario a la comunidad (tipo «invítanos un café»). Vacío = no se muestra el botón. Pon aquí el enlace cuando lo tengas (solo https).
export const APOYO = { href: '', texto: 'Apoya la comunidad' };

// Menú lateral, grupo "Mi cuenta": solo se muestra con sesión iniciada.
// Para añadir una sección futura, agrega UNA línea aquí (con `path` para una página o `action` para algo del sistema).
const ACCOUNT_NAV_BASE = [
  { id: 'perfil',   label: 'Mi perfil',   action: 'profile',              icon: 'fa-user', grupo: 'tu' },
  { id: 'muro',     label: 'Mi muro',      path: 'perfil/',        icon: 'fa-newspaper', grupo: 'tu' },
  { id: 'partidos', label: 'Mis partidos', path: 'mis-partidos/',  icon: 'fa-gamepad', grupo: 'tu' },
  { id: 'ahora',    label: 'Ahora mismo', path: 'ahora/',        icon: 'fa-satellite-dish', grupo: 'jugar' },
  { id: 'envivo',   label: 'Salas en vivo', path: 'en-vivo/',      icon: 'fa-tower-broadcast', grupo: 'jugar' },
  { id: 'missalas', label: 'Phoenix Link', path: 'mis-salas/',    icon: 'fa-desktop', grupo: 'jugar' },
  { id: 'mensajes', label: 'Mensajes',     path: 'mensajes/',      icon: 'fa-comments', grupo: 'social' },
  { id: 'chatgeneral', label: 'Chat general', path: 'chat-general/', icon: 'fa-comments', grupo: 'social' },
  { id: 'amigos',   label: 'Amigos',       path: 'amigos/',        icon: 'fa-user-group', grupo: 'social' },
  { id: 'buscar',   label: 'Buscar',       path: 'buscar/',        icon: 'fa-magnifying-glass', grupo: 'social', menu: false },
  { id: 'guardados', label: 'Guardados',   path: 'guardados/',     icon: 'fa-bookmark', grupo: 'tu' },
  { id: 'logros',   label: 'Logros',       path: 'logros/',        icon: 'fa-medal', grupo: 'tu' },
  { id: 'eventos',  label: 'Eventos',      path: 'eventos/',       icon: 'fa-calendar-day', grupo: 'comunidad' },
  { id: 'clanes',   label: 'Clanes',       path: 'clanes/',        icon: 'fa-shield-halved', grupo: 'social' },
  { id: 'ranking',  label: 'Ranking',      path: 'ranking/',       icon: 'fa-ranking-star', grupo: 'comunidad' },
  { id: 'tienda',   label: 'Tienda',       path: 'tienda/',        icon: 'fa-store', grupo: 'comunidad' },
  { id: 'manager',  label: FX.clubUnificado ? 'Mi club' : 'Liga Máster', path: 'manager/',       icon: 'fa-user-tie', grupo: 'jugar' },
  { id: 'formatos', label: 'Formatos',     path: 'formatos/',      icon: 'fa-sitemap', grupo: 'comunidad' },
  { id: 'torneos',  label: 'Torneos',      path: 'torneos/',       icon: 'fa-trophy', grupo: 'comunidad' },
  { id: 'miclub',   label: 'Mi club',      path: 'mi-club/',       icon: 'fa-shirt', grupo: 'jugar', ...(FX.clubUnificado ? { menu: false } : {}) },
  // `staff: '<permiso>'` = solo lo ve quien tenga ese permiso (ver PERMISOS en core/sistema/roles.js); se muestra u oculta al iniciar sesión.
  { id: 'control', label: 'Centro de control', path: 'control/', icon: 'fa-gauge-high', staff: 'verReportes', grupo: 'staff' },   // 19-oct-2026: lo pendiente del staff de un vistazo (js/pages/control.js)
  { id: 'moderacion', label: 'Moderación', path: 'moderacion/',    icon: 'fa-shield-halved',  staff: 'verReportes', grupo: 'staff' },
  { id: 'panel', label: 'Panel del sitio', path: 'panel/', icon: 'fa-sliders', staff: 'verAuditoriaCompleta', grupo: 'staff' },
  { id: 'auditoria', label: 'Auditoría',   path: 'auditoria/',     icon: 'fa-clipboard-list', staff: 'verAuditoria', grupo: 'staff' },
  { id: 'linkversiones', label: 'Versiones de Link', path: 'link-versiones/', icon: 'fa-download', staff: 'verAuditoriaCompleta', grupo: 'staff' },
  { id: 'cambiosoficiales', label: 'Cambios oficiales', path: 'cambios-oficiales/', icon: 'fa-arrows-rotate', staff: 'verAuditoriaCompleta', grupo: 'staff' },
  { id: 'usuariospes', label: 'Usuarios en PES', path: 'usuarios-pes/', icon: 'fa-computer', staff: 'verAuditoriaCompleta', grupo: 'staff' },
  { id: 'ayudaia',  label: 'Ayuda con IA', path: 'ayuda-ia/',     icon: 'fa-robot', grupo: 'comunidad' },
  { id: 'bandejaia', label: 'Bandeja IA',  path: 'bandeja-ia/',    icon: 'fa-inbox',          staff: 'bandejaIA',    grupo: 'staff' },
  // `grupo` = bloque del panel «Mi cuenta» (ver GRUPOS_CUENTA). `menu: false` = no sale en el panel (ya está a la vista: la lupa del header), pero sí en el buscador.
  // `abajo: true` = va en el bloque inferior del menú, pegado al fondo del panel.
  { id: 'ajustes',  label: 'Configuración', path: 'ajustes/',            icon: 'fa-gear',  abajo: true },
  { id: 'salir',    label: 'Salir',        action: 'logout',               icon: 'fa-right-from-bracket', abajo: true },
];

// REPARTO (FX.reparto, ronda 248): el panel «Red de enlaces» queda SOLO con lo tuyo, en 2 grupos (+ Staff).
// Lo público (En vivo, Salas, Chat, Clanes, Eventos, Ranking, Tienda, Torneos, Formatos) ya vive en los 3 grupos del menú
// (arriba en PC, al inicio del panel en celular): aquí se ocultaba duplicado. Siguen en el buscador (`menu: false`).
const ORDEN_CUENTA = { perfil: ['tu', 1], muro: ['tu', 2], logros: ['tu', 3], guardados: ['tu', 4], mensajes: ['tu', 5], amigos: ['tu', 6],
  partidos: ['juego', 1], moderacion: ['staff', 1], bandejaia: ['staff', 2], auditoria: ['staff', 3], panel: ['staff', 4],
  cambiosoficiales: ['staff', 5], usuariospes: ['staff', 6], linkversiones: ['staff', 7] };
const repartirCuenta = (lista) => {
  const pos = (n) => (ORDEN_CUENTA[n.id]?.[1] ?? 99);
  return lista.map((n) => n.abajo ? n : ORDEN_CUENTA[n.id] ? { ...n, grupo: ORDEN_CUENTA[n.id][0] } : { ...n, menu: false })
    .sort((a, b) => (a.abajo ? 1 : 0) - (b.abajo ? 1 : 0) || pos(a) - pos(b));
};
export const ACCOUNT_NAV = FX.reparto ? repartirCuenta(ACCOUNT_NAV_BASE) : ACCOUNT_NAV_BASE;

// Bloques del panel «Mi cuenta», en este orden.
const GRUPOS_CUENTA_REPARTO = [{ id: 'tu', label: 'Tú' }, { id: 'juego', label: 'Tu juego' }, { id: 'staff', label: 'Staff' }];
export const GRUPOS_CUENTA = FX.reparto ? GRUPOS_CUENTA_REPARTO : [
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
export const NOMBRE_APP = 'Phoenix Link';   // antes «Phoenix Soda» (renombrada, ronda 251)

// ───────── Mapa del sitio en PILARES (FX.pilares) ─────────
// Cada sección vive en UN solo pilar. El menú de arriba muestra los pilares (desplegable con descripción) y cada página
// muestra las pestañas de su pilar para saltar entre hermanas. Para mover una sección de pilar, cambia su id de lista aquí.
const TODAS = () => [...NAV, ...NAV_EXTRA, ...ACCOUNT_NAV];
const DESC = {
  liga: FX.reparto ? 'Tabla, fechas y resultados de cada liga' : 'Tabla, fechas y resultados de cada división', competiciones: FX.reparto ? 'Todas las ligas en tarjetas: sede, organizador y accesos' : 'Copas y torneos especiales', historial: 'Todos los partidos jugados',
  palmares: 'Campeones y vitrina de trofeos', ranking: 'Los mejores de la semana y de siempre',
  duelos: 'Reta a alguien y juega ya', envivo: 'Salas abiertas para entrar o mirar', ahora: 'Retos esperando rival y partidos para mirar',
  missalas: 'Vincula tu PC y abre salas', mercado: 'Conecta tu juego con la web', manager: FX.clubUnificado ? 'Tu club: carrera de DT, fichajes y vestuario del juego' : 'Tu club, tu presupuesto, tus fichajes', miclub: 'Edita la ficha de tus jugadores', formatos: 'Arma torneos, gira la ruleta y mira el reto del día', chatgeneral: 'El chat de todos, también dentro del juego con Phoenix Link', torneos: 'Crea tu torneo con el formato que quieras o apúntate a uno',
  noticias: 'Comunicados oficiales y la Tribuna', social: 'El muro de la comunidad', creadores: 'Streamers y directos verificados',
  clanes: 'Únete o arma tu clan', eventos: 'Lo que se viene en el calendario', database: 'Fichas de todos los jugadores', premios: 'La Paliza, Matagigantes, La Muralla y más, con cada resultado',
  tienda: 'Estética y mejoras para tu perfil', hosts: 'Catálogo de hosts: precios, ping y contacto',
  unirme: 'Guía en 5 pasos para tu primer partido', organizadores: 'Quiénes organizan la liga y por qué',   // 19-oct-2026: salían sin descripción en la Red de enlaces
};
// En `ids`, 'x>y,z' = la sección x también «adopta» las páginas y,z (sus pestañas se iluminan allí). `RENOMBRE` cambia el texto solo en los pilares.
const RENOMBRE = { ahora: 'En vivo', ...(FX.reparto ? { liga: 'Ligas', competiciones: 'Todas las ligas' } : {}) };
const pilar = (id, label, icon, ids, extra = {}) => ({ id, label, icon, ...extra,
  items: ids.map((spec) => { if (typeof spec === 'object') return { tambien: [], ...spec }; const [i, otras] = spec.split('>'); const n = TODAS().find((x) => x.id === i && x.path != null);
    return n && { ...n, label: RENOMBRE[i] ?? n.label, desc: DESC[i] ?? '', tambien: otras ? otras.split(',') : [] }; }).filter(Boolean) });
// REPARTO EN 3 GRUPOS (FX.reparto, ronda 247). Pedido de Fralex: cada sección en el grupo de su TIPO, y orden visual primero.
//   Competir = la liga organizada y sus récords · Jugar = lo que haces tú ahora (partidos y tu club) · Comunidad = la gente y lo que se dice.
//   Dentro de cada grupo, bloques pequeños (máx. 4) del más usado al menos usado. Las direcciones de las páginas NO cambian.
//   Lo personal (perfil, mensajes, amigos, guardados, logros, ajustes) sigue en «Mi cuenta». false = vuelve el menú de 4 pilares.
const conBloques = (id, label, icon, bloques, extra = {}) => {
  const bs = bloques.map(([titulo, ids, opc = {}]) => ({ titulo, ...opc, items: pilar(id, label, icon, ids).items }));
  return { id, label, icon, ...extra, bloques: bs, items: bs.flatMap((b) => b.items) };
};
const PILARES_REPARTO = [
  // 19-oct-2026 (Fralex): orden del menú por lo que más importa en la web. Primero MI CLUB (gestionar a los jugadores de tu PES desde la web:
  // «lo más exclusivo que tengo»), destacado con su propio estilo (`destacado`); luego la red social, jugar en vivo y las competiciones.
  // «Competiciones» queda organizada igual (le gusta así). Mi club tiene su propio ecosistema (manager.astro) con su navegación interna.
  pilar('miclub', 'Mi club', 'fa-futbol', FX.clubUnificado ? ['manager>miclub', 'mercado'] : ['manager', 'miclub', 'mercado'], { lema: 'Tu club, tus fichajes, tu vestuario', destacado: true }),
  conBloques('comunidad', 'Comunidad', 'fa-people-group', [
    ['Conversar', ['social', 'chatgeneral', 'noticias']],
    ['Grupos y extras', ['clanes', 'creadores', 'eventos', 'tienda', 'organizadores']],
  ], { lema: 'La gente y lo que se dice' }),
  conBloques('jugar', 'Jugar', 'fa-gamepad', [
    ['Partidos', ['duelos', 'ahora>envivo', 'hosts', 'missalas']],
  ], { lema: 'Lo que haces tú, ahora' }),
  // Ronda 250 (pedido de Fralex): UNA sola sección «Competiciones» con Ligas, Torneos, Palmarés, Formatos y Crear.
  // «Ligas» abarca la página de Liga y la de copas oficiales (competiciones). Debajo, las estadísticas.
  // Ronda 302: el menú muestra solo 3 entradas (cada una abre un GRUPO) y las pestañas de abajo enseñan las páginas de ese grupo.
  conBloques('competir', 'Competiciones', 'fa-trophy', [
    ['Ligas', ['liga', 'competiciones', 'unirme'], { compacto: true, icon: 'fa-crown', desc: 'Tablas, todas las ligas y cómo unirte' }],
    ['Torneos', ['torneos>formatos',
      { id: 'crearliga', label: 'Crear', path: 'crear-liga/', icon: 'fa-circle-plus', desc: 'Tu liga lista en 30 segundos', staff: 'editarLiga' },
      { id: 'crear', label: 'Crear', path: 'torneos/#crear', icon: 'fa-circle-plus', desc: 'Arma tu propia competición en minutos', noStaff: 'editarLiga' }], { compacto: true, icon: 'fa-sitemap', desc: 'Juega uno, crea el tuyo o mira los formatos' }],
    ['Campeones', ['palmares', ...(FX.premios ? ['premios'] : []), 'historial', 'ranking', ...(FX.carruseles ? [] : ['database'])], { compacto: true, icon: 'fa-medal', desc: 'Palmarés, premios, historial y ranking' }],
  ], { lema: 'Ligas, torneos y campeones' }),
  // Ronda 252: «Jugadores» (las cartas y estadísticas de todos) sube a botón propio del menú: es de lo más visitado.
  ...(FX.carruseles ? [pilar('jugadores', 'Jugadores', 'fa-id-card', ['database'], { lema: 'Las cartas de todos los jugadores' })] : []),
];
const PILARES_ANTES = [
  pilar('competir', 'Competir', 'fa-trophy', ['liga', 'competiciones', 'torneos', 'formatos', 'historial', 'palmares', 'ranking', 'database'], { lema: 'La liga y sus jugadores' }),
  pilar('jugar', 'Jugar', 'fa-gamepad', ['duelos', 'ahora>envivo', 'hosts', ...(FX.clubUnificado ? ['manager>mercado,miclub'] : ['manager>mercado', 'miclub'])], { lema: 'Del clic al partido' }),
  pilar('comunidad', 'Comunidad', 'fa-people-group', ['noticias', 'social', 'chatgeneral', 'creadores', 'clanes', 'eventos'], { lema: 'Lo que se dice y quién lo dice' }),
  pilar('tienda', 'Tienda', 'fa-store', ['tienda'], { lema: 'Tu estilo en la liga' }),
];
export const PILARES = FX.reparto ? PILARES_REPARTO : PILARES_ANTES;
/** Pilar al que pertenece una página (por su `active`), o null (Central, cuenta, etc.). */
export const esDe = (n, active) => n.id === active || n.tambien?.includes(active);
export const pilarDe = (active) => PILARES.find((p) => p.items.some((n) => esDe(n, active))) ?? null;

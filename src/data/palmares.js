// Contenido del Palmarés (1° Edición). Las clases de color están completas para que Tailwind las detecte.
export const PODIO = [
  { copa: 'Copa Galaxy', dt: 'FRALEX', club: 'FC Barcelona', sigla: 'FCB',
    card: 'border-t border-l border-silver-400/40 p-4 shadow-[0_0_15px_rgba(156,163,175,0.1)]',
    icon: 'text-3xl text-silver-300 mb-2 drop-shadow-[0_0_10px_rgba(156,163,175,0.5)]', label: 'text-[12px] text-silver-400', rule: 'border-silver-500/30',
    badge: 'from-blue-800 to-red-800 border-silver-300 text-white', clubCls: 'text-silver-300' },
  { copa: 'Campeón de Liga', dt: 'AXEL', club: 'Real Madrid', sigla: 'RMA', gold: true,
    card: 'border border-gold-400 p-5 shadow-[0_0_25px_rgba(245,158,11,0.2)] relative overflow-hidden',
    icon: 'text-4xl text-gold-400 mb-2 animate-glow', label: 'text-[12px] bg-black/50 border border-gold-500/40 px-2 py-0.5 rounded text-gold-400', rule: 'border-gold-500/40',
    badge: 'from-gray-100 to-gray-400 border-gold-400 text-black', clubCls: 'text-gold-300' },
  { copa: 'Supercopa', dt: 'ARENS', club: 'Man. City', sigla: 'MCI',
    card: 'border-t border-r border-bronze-400/40 p-4 shadow-[0_0_15px_rgba(205,127,50,0.1)]',
    icon: 'text-3xl text-bronze-400 mb-2 drop-shadow-[0_0_10px_rgba(205,127,50,0.5)]', label: 'text-[12px] text-bronze-400', rule: 'border-bronze-500/30',
    badge: 'from-cyan-600 to-blue-900 border-bronze-300 text-white', clubCls: 'text-bronze-300' },
];

export const TABS = [
  { id: 'pizarra', label: 'Pizarra (DT)', icon: 'fa-chess-knight', border: 'border-purple-500',
    titulo: 'Galardones de Pizarra (Director Técnico)', sub: 'Premios al ingenio, la defensa y el estilo de juego del usuario real.',
    grid: 'grid-cols-1 md:grid-cols-2 lg:grid-cols-4', kind: 'award',
    items: [
      { icon: 'fa-chess-knight', t: 'El Táctico', s: 'Mejor DT Global', who: 'MORGADO', d: 'Llevó a un club menor al Top 4.', box: 'border-purple-500/40', chip: 'bg-purple-600/20 text-purple-400', name: 'text-purple-400' },
      { icon: 'fa-shield-halved', t: 'El Muro', s: 'Mejor Defensa Manual', who: 'ROBERTO', d: 'Solo 8 goles recibidos en la fase regular.', box: 'border-blue-500/40', chip: 'bg-blue-600/20 text-blue-400', name: 'text-blue-400' },
      { icon: 'fa-wand-magic-sparkles', t: 'Jogo Bonito', s: 'Fútbol Champaña', who: 'FRALEX', d: '62% de posesión promedio.', box: 'border-yellow-500/40', chip: 'bg-yellow-600/20 text-yellow-400', name: 'text-yellow-400' },
      { icon: 'fa-seedling', t: 'Revelación', s: 'Rookie del Año', who: 'EDWIN', d: 'El debutante revelación.', box: 'border-ok/40', chip: 'bg-ok/20 text-ok', name: 'text-ok' },
    ] },
  { id: 'comunidad', label: 'Comunidad', icon: 'fa-server', border: 'border-pink-500',
    titulo: 'Infraestructura y Comunidad', sub: 'El soporte técnico, el fair play y el folklore del servidor de Discord.',
    grid: 'grid-cols-1 md:grid-cols-3', kind: 'community',
    items: [
      { icon: 'fa-server', t: 'Host de Oro', s: 'Mejor Conexión', who: 'FRALEX', box: 'border-cyan-500/40', ico: 'text-cyan-400', name: 'text-cyan-400' },
      { icon: 'fa-handshake', t: 'Caballero del Mando', s: 'Premio Fair Play', who: 'JACK', box: 'border-emerald-500/40', ico: 'text-emerald-400', name: 'text-emerald-400' },
      { icon: 'fa-tv', t: 'El VAR de Cobre', s: 'El Más Quejón', who: 'JEFFERSON', box: 'border-orange-500/40', ico: 'text-orange-400', name: 'text-orange-400' },
    ] },
  { id: 'olimpo', label: 'Olimpo PES', icon: 'fa-star', border: 'border-galaxy-400',
    titulo: 'El Olimpo Virtual (Fichas de PES)', sub: 'Los jugadores dentro de la cancha que rompieron todas las estadísticas.',
    grid: 'grid-cols-1 md:grid-cols-2 lg:grid-cols-4', kind: 'olimpo',
    items: [
      { icon: 'fa-star', t: 'Balón de Oro', who: 'VINI JR.', extra: '(Axel)', box: 'border-gold-500/30', ring: 'border-gold-400', col: 'text-gold-400' },
      { icon: 'fa-shoe-prints', t: 'Bota de Oro', who: 'LEWANDOWSKI', extra: '(24G)', box: 'border-galaxy-400/30', ring: 'border-galaxy-400', col: 'text-galaxy-400' },
      { icon: 'fa-hand', t: 'Guante de Oro', who: 'EDERSON', extra: '(12V)', box: 'border-gray-300/30', ring: 'border-gray-300', col: 'text-gray-300' },
      { icon: 'fa-hat-wizard', t: 'El Mago', who: 'DE BRUYNE', extra: '(18A)', box: 'border-pink-500/30', ring: 'border-pink-400', col: 'text-pink-400' },
    ] },
  { id: 'records', label: 'Récords', icon: 'fa-medal', border: 'border-red-500',
    titulo: 'Muro de Récords Absolutos', sub: 'Las marcas históricas globales de la liga.',
    grid: 'grid-cols-1 md:grid-cols-2 lg:grid-cols-4', kind: 'record',
    items: [
      { t: 'Mayor Goleada', v: '8 - 0', d: 'Fralex vs Morgado', col: 'text-red-500' },
      { t: 'Racha Invicta', v: '12', d: 'Axel (RMA)', col: 'text-emerald-400' },
      { t: 'Gol Más Rápido', v: '00:14"', d: 'Haaland (Arens)', col: 'text-galaxy-400' },
      { t: 'Rey de la Remontada', v: '3 - 4', d: 'Edwin (Min. 90+2)', col: 'text-orange-400' },
    ] },
];

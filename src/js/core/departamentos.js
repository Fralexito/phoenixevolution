// LOS DEPARTAMENTOS DEL DIARIO (lógica pura → probable con `npm test`).
// Cada noticia pertenece a un departamento: el que le da color, firma y sitio en la portada.
// Se detecta solo, mirando la etiqueta y el título; si nada encaja, manda la categoría.
// Para sumar un departamento: añádelo aquí (y, si hace falta, su regla en DETECTA). Nada más se toca.

/** @typedef {{id:string,nombre:string,bloque:string,color:string,firma:string,cubre:string,fuente:string,tono:'serio'|'urgente'|'joda',peso:number}} Departamento */

/** @type {Departamento[]} */
export const DEPARTAMENTOS = [
  // --- En la cancha ---
  { id: 'cronica', nombre: 'La Crónica', bloque: 'cancha', color: '#00e5ff', firma: 'La Crónica', cubre: 'Lo que pasó en cada fecha', fuente: 'Liga · Historial', tono: 'serio', peso: 90 },
  { id: 'envivo', nombre: 'En Vivo', bloque: 'cancha', color: '#ef4444', firma: 'En Vivo', cubre: 'Lo que se juega ahora mismo', fuente: 'En vivo · Salas', tono: 'urgente', peso: 88 },
  { id: 'previa', nombre: 'La Previa', bloque: 'cancha', color: '#00c06a', firma: 'La Previa', cubre: 'El partido que viene', fuente: 'Calendario · Liga', tono: 'serio', peso: 72 },
  { id: 'analista', nombre: 'El Analista', bloque: 'cancha', color: '#8000ff', firma: 'El Analista', cubre: 'Los números de la fecha', fuente: 'Ranking · Temporada', tono: 'serio', peso: 68 },
  { id: 'mesa', nombre: 'La Mesa', bloque: 'cancha', color: '#fb923c', firma: 'La Mesa', cubre: 'El ranking de poder', fuente: 'Ranking · Liga', tono: 'serio', peso: 64 },
  { id: 'duelos', nombre: 'Duelos', bloque: 'cancha', color: '#3b82f6', firma: 'Duelos', cubre: 'Retos y salas abiertas', fuente: 'Duelos · Mis partidos', tono: 'serio', peso: 58 },
  // --- Club y mercado ---
  { id: 'mercado', nombre: 'Mercado', bloque: 'club', color: '#22c55e', firma: 'Mercado', cubre: 'Fichajes de la Liga Máster', fuente: 'Liga Máster · Mercado', tono: 'serio', peso: 82 },
  { id: 'club', nombre: 'El Club', bloque: 'club', color: '#6366f1', firma: 'El Club', cubre: 'Plantillas, escudos y clubes', fuente: 'Mi club · Manager', tono: 'serio', peso: 56 },
  { id: 'vestuario', nombre: 'El Vestuario', bloque: 'club', color: '#e23b7a', firma: 'El Vestuario', cubre: 'Jugadores, cartas y medias', fuente: 'Jugadores · Fichas', tono: 'serio', peso: 54 },
  { id: 'escuela', nombre: 'La Escuela', bloque: 'club', color: '#14b8a6', firma: 'La Escuela', cubre: 'Guías para los que recién entran', fuente: 'Unirme · Ayuda', tono: 'serio', peso: 40 },
  // --- Competiciones ---
  { id: 'competiciones', nombre: 'Competiciones', bloque: 'competiciones', color: '#8b5cf6', firma: 'Competiciones', cubre: 'Torneos, copas y formatos', fuente: 'Torneos · Formatos', tono: 'serio', peso: 74 },
  { id: 'sudario', nombre: 'Sudario', bloque: 'competiciones', color: '#fbbf24', firma: 'Corresponsalía Sudario', cubre: 'Todo lo de la Liga Sudario', fuente: 'Divisiones Sudario', tono: 'serio', peso: 70 },
  { id: 'agenda', nombre: 'La Agenda', bloque: 'competiciones', color: '#f59e0b', firma: 'La Agenda', cubre: 'Qué se juega esta semana', fuente: 'Eventos · Calendario', tono: 'serio', peso: 52 },
  { id: 'vitrina', nombre: 'La Vitrina', bloque: 'competiciones', color: '#fde047', firma: 'La Vitrina', cubre: 'Campeones, premios y logros', fuente: 'Palmarés · Premios', tono: 'serio', peso: 60 },
  // --- Comunidad ---
  { id: 'plaza', nombre: 'La Plaza', bloque: 'comunidad', color: '#38bdf8', firma: 'La Plaza', cubre: 'Lo que se habla en el muro', fuente: 'Social · Comunidad', tono: 'serio', peso: 44 },
  { id: 'clanes', nombre: 'Clanes', bloque: 'comunidad', color: '#f87171', firma: 'Clanes', cubre: 'Guerras y fichajes de clanes', fuente: 'Clanes', tono: 'serio', peso: 50 },
  { id: 'cabina', nombre: 'La Cabina', bloque: 'comunidad', color: '#ec4899', firma: 'La Cabina', cubre: 'Creadores, clips y transmisiones', fuente: 'Creadores · Transmisión', tono: 'serio', peso: 46 },
  { id: 'tribuna', nombre: 'La Tribuna', bloque: 'comunidad', color: '#f97316', firma: 'La Tribuna', cubre: 'Memes, apodos y pura joda', fuente: 'La comunidad', tono: 'joda', peso: 20 },
  // --- La casa ---
  { id: 'direccion', nombre: 'Dirección', bloque: 'casa', color: '#e5e7eb', firma: 'La Dirección', cubre: 'Comunicados oficiales', fuente: 'Reglas · Panel', tono: 'serio', peso: 86 },
  { id: 'tribunal', nombre: 'Tribunal', bloque: 'casa', color: '#e23b2e', firma: 'Tribunal', cubre: 'Plazos, sanciones y avisos', fuente: 'Moderación · Auditoría', tono: 'urgente', peso: 84 },
  { id: 'taller', nombre: 'El Taller', bloque: 'casa', color: '#64748b', firma: 'El Taller', cubre: 'El parche Conmegol y sus guías', fuente: 'Parche · Phoenix Sync', tono: 'serio', peso: 48 },
  { id: 'tienda', nombre: 'La Tienda', bloque: 'casa', color: '#a855f7', firma: 'La Tienda', cubre: 'Novedades de la tienda', fuente: 'Tienda · Phoenix Link', tono: 'serio', peso: 38 },
  { id: 'archivo', nombre: 'El Archivo', bloque: 'casa', color: '#9ca3af', firma: 'El Archivo', cubre: 'Récords y memoria de la liga', fuente: 'Historial · Palmarés', tono: 'serio', peso: 36 },
  { id: 'maquinas', nombre: 'Sala de Máquinas', bloque: 'casa', color: '#0ea5e9', firma: 'Sala de Máquinas', cubre: 'Lo que cambia en la web', fuente: 'Rondas · Laboratorio', tono: 'serio', peso: 34 },
  { id: 'hosting', nombre: 'Hosting', bloque: 'casa', color: '#10b981', firma: 'Hosting', cubre: 'Quién presta PC y salas', fuente: 'Alquilar host · Salas', tono: 'serio', peso: 32 },
  { id: 'organizadores', nombre: 'Organizadores', bloque: 'casa', color: '#facc15', firma: 'Organizadores', cubre: 'Ayuda para quien arma ligas', fuente: 'Organizadores · Crear liga', tono: 'serio', peso: 30 },
];

export const BLOQUES = [
  { id: 'cancha', nombre: 'En la cancha' }, { id: 'club', nombre: 'Club y mercado' },
  { id: 'competiciones', nombre: 'Competiciones' }, { id: 'comunidad', nombre: 'Comunidad' }, { id: 'casa', nombre: 'La casa' },
];

const PORDEF = DEPARTAMENTOS.find((d) => d.id === 'cronica');
const MAPA = new Map(DEPARTAMENTOS.map((d) => [d.id, d]));
/** El departamento por su id (si no existe, La Crónica). */
export const departamento = (id) => MAPA.get(id) ?? PORDEF;
export const esJoda = (id) => departamento(id).tono === 'joda';
export const esUrgente = (id) => departamento(id).tono === 'urgente';

// Reglas de detección, en orden: la primera que encaje manda.
const DETECTA = [
  ['tribuna', /\b(meme|joda|tribuna|apodo|vacil[oó]n|shitpost)\b/i],
  ['tribunal', /\b(sanci[oó]n|sancionad|plazo|tribunal|falta(n)? (dos |el |los )?resultado|descalific|amonest)\b/i],
  ['mercado', /\b(fichaje|fichó|mercado|traspaso|se va al|refuerzo|millones|agente libre)\b/i],
  ['analista', /\b(analista|datos|n[uú]meros|promedio|estad[ií]stic)\b/i],
  ['mesa', /\b(ranking|poder|top \d)\b/i],
  ['previa', /\b(previa|se viene|lo que viene|choque del|duelo de la fecha \d+)\b/i],
  ['envivo', /\b(en vivo|ahora mismo|se est[aá] jugando|arranca ya)\b/i],
  ['competiciones', /\b(torneo|copa|competici[oó]n|formato|llave|inscripci)\b/i],
  ['agenda', /\b(agenda|calendario|horario|esta semana se juega)\b/i],
  ['vitrina', /\b(palmar[eé]s|premio|logro|campe[oó]n|trofeo|vitrina)\b/i],
  ['clanes', /\b(clan|clanes|barra)\b/i],
  ['cabina', /\b(transmisi|creador|clip|stream|highlight|cabina)\b/i],
  ['taller', /\b(parche|conmegol|instalaci|actualizaci|phoenix sync|sider)\b/i],
  ['tienda', /\b(tienda|gema|ascua|cosm[eé]tico|marco nuevo|pase)\b/i],
  ['hosting', /\b(host|hostear|conexi[oó]n|presta pc)\b/i],
  ['organizadores', /\b(organizador|crear liga|dirigir una liga)\b/i],
  ['escuela', /\b(gu[ií]a|tutorial|novato|c[oó]mo (jugar|entrar|unirse|funciona))\b/i],
  ['maquinas', /\b(web nueva|funci[oó]n nueva|laboratorio|ronda \d+)\b/i],
  ['archivo', /\b(archivo|hace un a[ñn]o|hist[oó]ric|memoria de la liga|r[eé]cord de la casa)\b/i],
  ['vestuario', /\b(jugador|carta|media \d|plantel|vestuario)\b/i],
  ['club', /\b(club|plantilla|escudo|presupuesto)\b/i],
  ['duelos', /\b(duelo|reto|sala)\b/i],
  ['plaza', /\b(comunidad|muro|chat general|bienvenida)\b/i],
  ['cronica', /\b(cr[oó]nica|fecha \d+|goleada|racha|remontada|matagigantes|susto)\b/i],
];
const PORCATEGORIA = { OFICIAL: 'direccion', TRIBUNAL: 'tribunal', TRIBUNA: 'tribuna', JORNADA: 'cronica' };

/** Departamento de una noticia: manda su `departamento` guardado; si no, se detecta por etiqueta y título. */
export function departamentoDe(n) {
  if (n?.departamento && MAPA.has(n.departamento)) return n.departamento;
  if (n?.liga === 'sudario') return 'sudario';
  const texto = `${n?.tag ?? ''} ${n?.titulo ?? ''}`;
  for (const [id, re] of DETECTA) if (re.test(texto)) return id;
  return PORCATEGORIA[n?.categoria] ?? 'cronica';
}

/** Departamentos que aparecen en una lista de noticias, en el orden del catálogo. */
export const departamentosPresentes = (lista) => {
  const ids = new Set(lista.map((n) => departamentoDe(n)));
  return DEPARTAMENTOS.filter((d) => ids.has(d.id));
};

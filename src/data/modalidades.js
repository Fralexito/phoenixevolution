// Catálogo de modalidades, reglas de ruleta, retos y noches temáticas. Texto plano editable; la lógica está en js/core/retos.js.
// tono: 'serio' | 'casual' | 'divertido'. Mínimo 12 px en pantalla (lo cuida el CSS).

export const MODALIDADES = Object.freeze([
  { id: '1v1', nombre: '1 contra 1', icono: 'fa-user', tono: 'serio', texto: 'El clásico: un mando contra otro.' },
  { id: '2v2', nombre: '2 contra 2 cooperativo', icono: 'fa-user-group', tono: 'divertido', texto: 'Dos personas, dos mandos, un equipo. Muy bueno en Parsec.' },
  { id: 'parejas', nombre: 'Parejas por turnos', icono: 'fa-people-arrows', tono: 'casual', texto: 'Primer tiempo juega uno, segundo tiempo el otro.' },
  { id: 'igualada', nombre: 'Plantilla igualada', icono: 'fa-scale-balanced', tono: 'serio', texto: 'Todos usan el mismo equipo: gana la habilidad.' },
  { id: 'handicap', nombre: 'Handicap', icono: 'fa-weight-hanging', tono: 'casual', texto: 'El mejor empieza 0-1 o juega con un equipo más flojo.' },
  { id: 'orocorto', nombre: 'Gol de oro', icono: 'fa-medal', tono: 'divertido', texto: 'Gana quien meta primero.' },
  { id: 'relampago', nombre: 'Partido relámpago', icono: 'fa-bolt', tono: 'casual', texto: 'Cinco minutos y listo: ideal para fases con mucha gente.' },
  { id: 'penales', nombre: 'Penales en serie', icono: 'fa-bullseye', tono: 'divertido', texto: 'Torneo solo de penales; dura diez minutos.' },
  { id: 'selecciones', nombre: 'Solo selecciones', icono: 'fa-flag', tono: 'casual', texto: 'Sin clubes: solo equipos nacionales.' },
  { id: 'draft', nombre: 'Draft', icono: 'fa-hand-pointer', tono: 'divertido', texto: 'Eligen jugadores por turnos y luego juegan con ese equipo.' },
]);

export const REGLAS_RULETA = Object.freeze([
  'Solo se puede marcar de cabeza',
  'Prohibido el tiro desde fuera del área',
  'Sin sustituciones',
  'Tu equipo es el peor valorado del juego',
  'Juegas con la mano izquierda',
  'Gol de oro: gana el primero que marque',
  'Partido de cinco minutos',
  'Solo pases cortos',
  'El perdedor elige el equipo de la revancha',
  'Cada gol vale el doble en el último minuto',
  'Obligatorio celebrar cada gol',
  'Defensa de tres: sin laterales',
]);

export const RETOS_DIARIOS = Object.freeze([
  { titulo: 'Gol de cabeza', texto: 'Mete un gol de cabeza en cualquier partido de hoy.', icono: 'fa-head-side-virus' },
  { titulo: 'Remontada', texto: 'Gana un partido que ibas perdiendo.', icono: 'fa-arrow-trend-up' },
  { titulo: 'Portería a cero', texto: 'Gana sin recibir gol.', icono: 'fa-shield' },
  { titulo: 'Gol de tiro libre', texto: 'Marca desde una falta.', icono: 'fa-bullseye' },
  { titulo: 'Triplete', texto: 'Mete tres goles en un mismo partido.', icono: 'fa-3' },
  { titulo: 'Racha de dos', texto: 'Gana dos partidos seguidos.', icono: 'fa-fire' },
  { titulo: 'Gol desde fuera del área', texto: 'Marca desde lejos con un tiro potente.', icono: 'fa-rocket' },
  { titulo: 'Empate heroico', texto: 'Empata un partido en el último minuto.', icono: 'fa-hourglass-end' },
  { titulo: 'Juego limpio', texto: 'Gana un partido sin tarjetas.', icono: 'fa-handshake' },
  { titulo: 'Reta a un nuevo', texto: 'Juega un partido contra alguien con quien nunca jugaste.', icono: 'fa-user-plus' },
]);

export const NOCHES_TEMATICAS = Object.freeze([
  { id: 'leyendas', nombre: 'Noche de Leyendas', texto: 'Solo cartas de jugadores históricos.', icono: 'fa-crown' },
  { id: 'feos', nombre: 'Noche de equipos feos', texto: 'Se juega con el club de camiseta más rara; el público vota.', icono: 'fa-shirt' },
  { id: 'ruleta', nombre: 'Noche de ruleta', texto: 'Antes de cada partido gira la ruleta y cae una regla distinta.', icono: 'fa-dice' },
  { id: 'revancha', nombre: 'Noche de revanchas', texto: 'Solo vale retar a quien te ganó esta semana.', icono: 'fa-rotate-left' },
  { id: 'intercambio', nombre: 'Intercambio de club', texto: 'Juegas con el equipo de otro DT y cuentas cómo te fue.', icono: 'fa-right-left' },
  { id: 'relampago', nombre: 'Noche relámpago', texto: 'Todo son partidos de cinco minutos.', icono: 'fa-bolt' },
]);

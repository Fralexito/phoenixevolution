// EL FÉNIX · portadas del diario chicha (ronda 351). La más reciente es la que se ve al entrar a Noticias.
// REGLA DE FRALEX: una portada por SEMANA (sale el lunes con el paquete de noticias). Solo hay «edición extra»
// si ese día pasa algo nuevo (resultados cargados, fichaje, escándalo). Para añadir una: copia un bloque y cámbialo.
//   tipo: 'semanal' | 'extra'      fecha: día en que sale (AAAA-MM-DD, hora de Lima)
//   tema: 'amarillo' | 'rojo' | 'negro' (colores de la portada)      noticia: slug de la noticia que abre «Leer»
//   local/visita: nombre que va bajo cada foto (si es un jugador, sale su cara del juego si existe)
//   Humor: con cariño. Nada que humille de verdad ni toque temas personales.
const BUFF = 'buff'; const NERF = 'nerf'; const FIX = 'fix';

export const PORTADAS = [
  {
    id: '2026-s42', tipo: 'semanal', semana: 42, fecha: '2026-10-13', tema: 'amarillo', noticia: null,
    franja: 'Nadie: … · La Galaxy: 0-0 · 0-0 · 0-0 · Los arqueros piden aumento',
    kicker: '¡Exclusivo! Fecha 11', logro: 'Candado de oro',
    titular: ['¡Se miraron', 'con cariño!'],
    local: 'Victor', visita: 'Beto', lvl: ['99', '97'], globos: ['“Yo vine a ganar, causa”', '“Yo también, pe”'],
    marcador: '0-0', marcadorPie: 'y la punta congelada',
    bajada: 'Victor y Beto jugaron 90 minutos de puro respeto y nadie metió ni las manos. La cima sigue igualita.',
    sticker: 'POV: eres arquero en la Galaxy y por fin te toca chambear',
    ampay: { titulo: 'Lo vieron entrenando en la sala de su rival', texto: 'Fuentes cercanas juran que Beto estudió las jugadas de Degox a las 3 a. m. Él dice que «solo estaba mirando».' },
    chismes: ['¿Quién le prestó el mando con drift a Jack? La verdad saldrá a la luz.', 'Un crack de la Galaxy le echó la culpa al lag… jugando de local.', 'Arens bailó tanto tras el 4-3 que se le cayó el Parsec.'],
    patch: [{ tipo: BUFF, t: 'Arqueros: ahora sí atajan.' }, { tipo: NERF, t: 'Delanteros: -80% de puntería.' }, { tipo: FIX, t: 'Arens ya no se cae en el minuto 90.' }],
    horoscopo: [{ signo: 'Leo', t: 'Hoy no culpes al lag; el lag eres tú.' }, { signo: 'Escorpio', t: 'Un 0-0 te persigue. Cambia de táctica, mi rey.' }],
  },
  {
    id: '2026-10-16-extra', tipo: 'extra', semana: 42, fecha: '2026-10-16', tema: 'rojo', noticia: null,
    franja: 'Se viene el lunes · Todos al Parsec · Se viene el lunes · Todos al Parsec',
    kicker: 'La previa que quema', logro: 'Invicto de temporada',
    titular: ['¡Duelo de', 'invictos!'],
    local: 'Beto', visita: 'Degox', lvl: ['97', '98'], globos: ['“Mi cancha, mis reglas”', '“Hablas mucho, ya veremos”'],
    marcador: '¿?', marcadorPie: 'lunes · fecha 12',
    bajada: 'Beto recibe a Degox: los dos sin perder en toda la edición. Uno se va a su jato con la cara roja.',
    sticker: 'Ese partido va a ser cine, mi king',
    ampay: { titulo: '¿Amistad o estrategia?', texto: 'Los captaron en la misma sala de Duelos, riéndose. ¿Pacto de no agresión? Ellos lo niegan todo.' },
    chismes: ['Fralex sigue sin superar el 9-0 de la fecha 1. Ya va a terapia de penales.', 'Morgado y Jack llevan tanto sin ganar que ya se mandan memes de apoyo.', 'Alguien de la liga dejó en visto a otro después de un «gg ez».'],
    patch: [{ tipo: BUFF, t: 'Beto: +10 de confianza de local.' }, { tipo: NERF, t: 'Degox: dos partidos menos, cero excusas.' }, { tipo: FIX, t: 'Se arregló el bug de los 0-0 (falta confirmar).' }],
    horoscopo: [{ signo: 'Géminis', t: 'Dos caras: una antes del partido y otra después.' }, { signo: 'Tauro', t: 'Hoy aguantas el rage quit. Bravazo.' }],
  },
  {
    id: '2026-s41', tipo: 'semanal', semana: 41, fecha: '2026-10-06', tema: 'negro', noticia: null,
    franja: 'Alerta roja en la Galaxy · Se buscan goles · Alerta roja en la Galaxy · Se buscan goles',
    kicker: 'El Analista lo confirma', logro: 'Sequía histórica',
    titular: ['¡Se acabaron', 'los goles!'],
    local: 'Antes', visita: 'Ahora', lvl: ['5,4', '1,9'], globos: ['“¿Y los goles?”', '“Se fueron por Yape”'],
    marcador: '5,4→1,9', marcadorPie: 'goles por partido',
    bajada: 'En dos fechas la liga pasó de partidos de básquet a puro candado. Seis ceros en once partidos.',
    sticker: 'Delanteros en modo ahorro de batería',
    ampay: { titulo: 'Delantero captado sin patear al arco', texto: 'Las cámaras lo grabaron 90 minutos dando pases para atrás. Pidió no revelar su nombre.' },
    chismes: ['Los arqueros ya piden aumento de sueldo… en ascuas.', 'Se dice que el 10-0 de Victor a Camilo tiene su propio altar.', 'Un jugador puso «skill issue» en su estado y lo borró a los 5 minutos.'],
    patch: [{ tipo: NERF, t: 'Goles: ahora son DLC de pago.' }, { tipo: BUFF, t: 'Defensas: modo muralla.' }, { tipo: FIX, t: 'Nada. Seguimos investigando.' }],
    horoscopo: [{ signo: 'Piscis', t: 'Hoy se te escapa el gol más fácil de tu vida.' }, { signo: 'Aries', t: 'Tu racha de derrotas termina… mañana, tal vez.' }],
  },
];

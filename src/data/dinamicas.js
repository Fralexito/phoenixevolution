// Catálogo de DINÁMICAS divertidas para torneos propios, castigos, títulos de broma y piezas para nombres épicos.
// Todo es texto editable: Fralex puede quitar o cambiar cualquier línea sin tocar la lógica (js/core/diversion.js).
// tono: 'serio' | 'casual' | 'divertido' · grupo: reglas | equipos | locuras | transmision | economia
// `guia` = cómo se explica a los jugadores (se muestra en la ficha de creación y en el torneo).

export const GRUPOS_DINAMICAS = Object.freeze([
  { id: 'reglas', nombre: 'Reglas del partido', icono: 'fa-scroll', texto: 'Cambian cómo se juega cada partido.' },
  { id: 'equipos', nombre: 'Equipos y plantillas', icono: 'fa-shirt', texto: 'Cambian con qué equipo juegas.' },
  { id: 'locuras', nombre: 'Locuras y bromas', icono: 'fa-face-grin-squint-tears', texto: 'Lo más pendejo, pero con cariño.' },
  { id: 'transmision', nombre: 'Para ver y transmitir', icono: 'fa-tv', texto: 'Hacen el torneo más espectacular.' },
  { id: 'economia', nombre: 'Puntos, apuestas y premios', icono: 'fa-coins', texto: 'Extras que dan emoción sin dinero real.' },
]);

export const DINAMICAS = Object.freeze([
  // ── Reglas del partido ──
  { id: 'gol-oro', grupo: 'reglas', nombre: 'Gol de oro', icono: 'fa-medal', tono: 'divertido', texto: 'Gana quien meta primero.', guia: 'El partido termina en cuanto alguien marca. Si pasan cinco minutos sin gol, se decide en penales.' },
  { id: 'relampago', grupo: 'reglas', nombre: 'Partido relámpago', icono: 'fa-bolt', tono: 'casual', texto: 'Cinco minutos y listo.', guia: 'Configuren el partido a 5 minutos reales. Si hay empate en una eliminatoria, penales.' },
  { id: 'mitad-gol', grupo: 'reglas', nombre: 'Solo cuenta de cabeza', icono: 'fa-head-side-virus', tono: 'divertido', texto: 'Solo valen los goles de cabeza.', guia: 'Un gol con el pie no cuenta y se anota en contra de quien lo meta si el rival lo reclama. Se ven mucho los centros.' },
  { id: 'sin-fuera-area', grupo: 'reglas', nombre: 'Prohibido tirar de lejos', icono: 'fa-ban', tono: 'casual', texto: 'Nada de remates desde fuera del área.', guia: 'Un gol desde fuera del área se anula de palabra. Obliga a combinar y a buscar espacios.' },
  { id: 'pase-corto', grupo: 'reglas', nombre: 'Solo pases cortos', icono: 'fa-arrows-left-right', tono: 'casual', texto: 'Prohibidos los pases largos.', guia: 'Nada de pelotazos ni pases largos al espacio. Si el rival ve uno, puede pedir que se repita la jugada.' },
  { id: 'doble-ultimo', grupo: 'reglas', nombre: 'Último minuto doble', icono: 'fa-2', tono: 'divertido', texto: 'Cada gol vale el doble al final.', guia: 'Desde el minuto 80, cada gol cuenta por dos. Hasta el último segundo hay partido.' },
  { id: 'sin-cambios', grupo: 'reglas', nombre: 'Sin sustituciones', icono: 'fa-user-lock', tono: 'serio', texto: 'Los mismos once todo el partido.', guia: 'No se puede cambiar a nadie, ni por lesión. Hay que cuidar la resistencia.' },
  { id: 'una-mano', grupo: 'reglas', nombre: 'A una mano', icono: 'fa-hand', tono: 'divertido', texto: 'Juegas con una sola mano.', guia: 'Cada jugador sostiene el mando con una mano (la que elija el rival en el sorteo). Es lento y muy gracioso.' },
  { id: 'sin-gritos', grupo: 'reglas', nombre: 'Silencio total', icono: 'fa-volume-xmark', tono: 'casual', texto: 'Nadie habla durante el partido.', guia: 'Prohibido hablar o escribir en el chat mientras se juega. Quien habla, regala un penal al rival.' },
  { id: 'celebrar', grupo: 'reglas', nombre: 'Celebración obligatoria', icono: 'fa-champagne-glasses', tono: 'divertido', texto: 'Cada gol se celebra con baile.', guia: 'Quien no celebre su gol pierde ese gol. Se vale lo que sea, mientras se vea la alegría.' },
  { id: 'mejor-de-3', grupo: 'reglas', nombre: 'Mejor de 3', icono: 'fa-3', tono: 'serio', texto: 'La llave se decide a tres partidos.', guia: 'Cada cruce se juega al mejor de tres. En la web se anota el marcador total de la serie (ejemplo: 2-1).' },
  { id: 'ida-vuelta-llave', grupo: 'reglas', nombre: 'Llave ida y vuelta', icono: 'fa-repeat', tono: 'serio', texto: 'Cada cruce se juega dos veces.', guia: 'Se suman los goles de los dos partidos. En la web se anota el global (ejemplo: 5-3) y, si empatan, penales.' },
  { id: 'penales-directo', grupo: 'reglas', nombre: 'Todo a penales', icono: 'fa-bullseye', tono: 'divertido', texto: 'Cada cruce se decide en una tanda.', guia: 'Nada de partido: tanda de cinco penales por lado. Dura dos minutos y es puro nervio.' },
  // ── Equipos y plantillas ──
  { id: 'misma-plantilla', grupo: 'equipos', nombre: 'Plantilla igualada', icono: 'fa-scale-balanced', tono: 'serio', texto: 'Todos usan el mismo equipo.', guia: 'El organizador elige un equipo y los dos juegan con él (en espejo). Gana la habilidad, no la plantilla.' },
  { id: 'equipo-sorteado', grupo: 'equipos', nombre: 'Equipo sorteado', icono: 'fa-dice', tono: 'divertido', texto: 'El destino elige tu equipo.', guia: 'Antes de cada partido, giren la ruleta de equipos o pidan a un amigo que elija uno al azar. No se vale repetir.' },
  { id: 'peor-equipo', grupo: 'equipos', nombre: 'El peor equipo', icono: 'fa-arrow-down-wide-short', tono: 'divertido', texto: 'Juegas con el equipo peor valorado.', guia: 'Cada uno busca el equipo con peor media. El que escoge el peor de verdad se gana el aplauso.' },
  { id: 'solo-selecciones', grupo: 'equipos', nombre: 'Solo selecciones', icono: 'fa-flag', tono: 'casual', texto: 'Sin clubes, solo países.', guia: 'Solo se pueden usar equipos nacionales. No se repite un país en el mismo torneo.' },
  { id: 'draft', grupo: 'equipos', nombre: 'Draft de jugadores', icono: 'fa-hand-pointer', tono: 'serio', texto: 'Se eligen jugadores por turnos.', guia: 'Por turnos (en serpiente) cada uno elige jugadores y arma su plantilla. Se juega con esa plantilla todo el torneo.' },
  { id: 'handicap', grupo: 'equipos', nombre: 'Handicap', icono: 'fa-weight-hanging', tono: 'casual', texto: 'El mejor da ventaja.', guia: 'Quien tenga más nivel empieza 0-1 abajo o juega con un equipo más flojo. Así los partidos se igualan.' },
  { id: 'intercambio', grupo: 'equipos', nombre: 'Cambio de mando', icono: 'fa-people-arrows', tono: 'divertido', texto: 'A mitad del partido se cambian de lugar.', guia: 'En el entretiempo, cada uno toma el equipo del rival tal como va el marcador. Hay que saber jugar de los dos lados.' },
  { id: 'parejas', grupo: 'equipos', nombre: 'Parejas por turnos', icono: 'fa-user-group', tono: 'casual', texto: 'Dos personas comparten un equipo.', guia: 'En cada pareja, uno juega el primer tiempo y el otro el segundo. En la web la pareja se anota con un solo nombre.' },
  // ── Locuras y bromas ──
  { id: 'castigo', grupo: 'locuras', nombre: 'Castigo al perdedor', icono: 'fa-skull', tono: 'divertido', texto: 'Quien pierde cumple un castigo sano.', guia: 'Después de cada derrota, la web propone un castigo de broma (cantar, hacer un meme, cambiar de foto…). Es voluntario y siempre sano.' },
  { id: 'ruleta-partido', grupo: 'locuras', nombre: 'Ruleta por partido', icono: 'fa-circle-notch', tono: 'divertido', texto: 'Cada partido trae una regla loca.', guia: 'La web asigna una regla extra distinta a cada partido. Todos la ven en el cruce y deben cumplirla.' },
  { id: 'sin-mirar', grupo: 'locuras', nombre: 'A ciegas', icono: 'fa-eye-slash', tono: 'divertido', texto: 'Se juega sin ver el marcador.', guia: 'Tapen el marcador con un papel o cinta. Nadie sabe cuánto va hasta el final.' },
  { id: 'mando-al-reves', grupo: 'locuras', nombre: 'Mando al revés', icono: 'fa-rotate', tono: 'divertido', texto: 'Los botones están cambiados.', guia: 'Reconfiguren los botones de forma extraña (por ejemplo, pase y tiro al revés). Prepárense para el caos.' },
  { id: 'comentarista', grupo: 'locuras', nombre: 'Comentarista obligado', icono: 'fa-microphone', tono: 'divertido', texto: 'Narras tus propias jugadas.', guia: 'Cada uno narra en voz alta lo que hace como si fuera un comentarista. Si se queda callado 20 segundos, el rival recibe un tiro libre.' },
  { id: 'gol-prohibido', grupo: 'locuras', nombre: 'Gol prohibido', icono: 'fa-circle-xmark', tono: 'divertido', texto: 'Un tipo de gol no vale.', guia: 'Antes del partido, el rival elige un tipo de gol que no cuenta (de penal, de tiro libre, de rebote…). No se puede repetir en el torneo.' },
  { id: 'doble-o-nada', grupo: 'locuras', nombre: 'Doble o nada', icono: 'fa-dice-two', tono: 'divertido', texto: 'El perdedor puede pedir revancha doble.', guia: 'Quien pierde puede pedir revancha en la que todo vale doble. Si vuelve a perder, paga el castigo doble.' },
  { id: 'pollo', grupo: 'locuras', nombre: 'Copa del pollo', icono: 'fa-drumstick-bite', tono: 'divertido', texto: 'El último lugar recibe un título de broma.', guia: 'Quien termine último se lleva el título de «pollo» con todos los honores. Es solo cariño.' },
  { id: 'sorpresa-final', grupo: 'locuras', nombre: 'Final sorpresa', icono: 'fa-gift', tono: 'divertido', texto: 'La final tiene una regla secreta.', guia: 'El organizador anuncia la regla de la final solo cuando los finalistas ya están sentados. Nadie puede prepararse.' },
  { id: 'cuentame-un-chiste', grupo: 'locuras', nombre: 'Chiste antes del partido', icono: 'fa-face-laugh', tono: 'divertido', texto: 'Los dos cuentan un chiste.', guia: 'Antes de cada partido, cada jugador cuenta un chiste. Si nadie se ríe, empieza perdiendo 0-1 (a criterio del organizador).' },
  { id: 'tanda-bromas', grupo: 'locuras', nombre: 'Tanda de retos', icono: 'fa-bullseye', tono: 'divertido', texto: 'Los empates se deciden con un reto absurdo.', guia: 'Si hay empate, en vez de penales se hace un reto (equilibrio, trabalenguas, adivinar un equipo). Lo elige el organizador.' },
  // ── Para ver y transmitir ──
  { id: 'transmitido', grupo: 'transmision', nombre: 'Final transmitida', icono: 'fa-tv', tono: 'casual', texto: 'La final se juega en directo.', guia: 'La final se transmite (Discord, Twitch o Parsec con espectadores). El enlace se pone en la descripción del torneo.' },
  { id: 'comentaristas', grupo: 'transmision', nombre: 'Comentaristas invitados', icono: 'fa-headset', tono: 'casual', texto: 'Dos amigos narran la final.', guia: 'Se eligen dos personas para narrar. Pueden ser jugadores ya eliminados, que además conocen a los finalistas.' },
  { id: 'prediccion', grupo: 'transmision', nombre: 'Quiniela del público', icono: 'fa-clipboard-list', tono: 'casual', texto: 'El público adivina quién gana.', guia: 'Antes de cada ronda, el público dice quién cree que gana. Quien más aciertos tenga se lleva un título simbólico.' },
  { id: 'mvp', grupo: 'transmision', nombre: 'MVP del torneo', icono: 'fa-star', tono: 'casual', texto: 'Se vota al mejor jugador.', guia: 'Al terminar, todos votan al MVP (no se puede votar a uno mismo). El organizador anota el nombre al cerrar el torneo.' },
  { id: 'resumen', grupo: 'transmision', nombre: 'Resumen en video', icono: 'fa-clapperboard', tono: 'casual', texto: 'Se publica un resumen del torneo.', guia: 'Guarden los mejores goles de cada ronda y publíquenlos en el muro. La mejor jugada gana un título.' },
  { id: 'pantalla-compartida', grupo: 'transmision', nombre: 'Pantalla compartida', icono: 'fa-display', tono: 'casual', texto: 'Cada partido se ve en vivo.', guia: 'Los jugadores comparten pantalla en una llamada para que los demás miren sus partidos mientras esperan.' },
  // ── Puntos, apuestas y premios ──
  { id: 'premio-simbolico', grupo: 'economia', nombre: 'Premio simbólico', icono: 'fa-trophy', tono: 'casual', texto: 'Se anuncia un premio sin dinero.', guia: 'Se define un premio simbólico (un rol en el servidor, un título, un cambio de apodo). Se anota en la descripción del torneo.' },
  { id: 'puntos-bonus', grupo: 'economia', nombre: 'Puntos bonus', icono: 'fa-plus', tono: 'casual', texto: 'Hay puntos extra por hazañas.', guia: 'El organizador da puntos extra por goles de cabeza, remontadas o porterías a cero. Se anotan aparte.' },
  { id: 'entrada-moneda', grupo: 'economia', nombre: 'Entrada con tokens', icono: 'fa-coins', tono: 'casual', texto: 'Se juega con tokens de la web.', guia: 'Cada jugador aporta tokens del sitio al inscribirse y el campeón se los lleva. Se gestiona entre ustedes (sin dinero real).' },
  { id: 'apuesta-amistosa', grupo: 'economia', nombre: 'Apuesta amistosa', icono: 'fa-handshake', tono: 'divertido', texto: 'Apuestas de broma entre amigos.', guia: 'Apuestas simbólicas (quien pierde paga un meme o un saludo). Nada de dinero real.' },
  { id: 'logro-dorado', grupo: 'economia', nombre: 'Logro dorado', icono: 'fa-award', tono: 'casual', texto: 'Un logro especial para el campeón.', guia: 'El campeón recibe un título propio que el organizador inventa (por ejemplo «Rey de la Copa del Pollo»).' },
  { id: 'racha-premiada', grupo: 'economia', nombre: 'Racha premiada', icono: 'fa-fire', tono: 'casual', texto: 'Las rachas dan puntos.', guia: 'Cada victoria seguida suma un punto de racha. Quien llegue a cinco se lleva un título.' },
]);

export const dinamicaPorId = (id) => DINAMICAS.find((d) => d.id === id) ?? null;

export const CASTIGOS = Object.freeze([
  'Cantar una canción en el chat de voz.',
  'Poner de foto de perfil al campeón durante un día.',
  'Hacer un meme del partido y publicarlo en el muro.',
  'Narrar el siguiente partido como comentarista.',
  'Decir «el mejor soy yo» en voz alta con cara seria.',
  'Escribir un poema de dos líneas sobre el rival.',
  'Jugar el siguiente partido con el mando al revés los primeros cinco minutos.',
  'Hacer el baile del gol en cámara.',
  'Contar un chiste malo (de verdad malo).',
  'Elegir el equipo de la revancha para el rival.',
  'Llamarse «Pollito» en el chat durante una hora.',
  'Dar un halago sincero al ganador.',
  'Imitar a un comentarista famoso durante un minuto.',
  'Mostrar su peor jugada del torneo.',
  'Hablar solo con refranes en el siguiente partido.',
  'Describir su derrota como si fuera una película.',
  'Aplaudir al rival de pie.',
  'Decir un trabalenguas sin equivocarse.',
  'Pagar un «café virtual»: escribir un agradecimiento al organizador.',
  'Poner una frase épica del ganador en su biografía por un día.',
]);

export const TITULOS_BROMA = Object.freeze([
  'Rey del Autogol', 'Maestro del Pase Atrás', 'El Muro Imposible', 'Doctor Penal', 'Señor Remontada', 'El Eterno Segundo',
  'Campeón del Mando Roto', 'La Pesadilla del Portero', 'Cazador de Faltas', 'El Que Nunca Pierde (excepto hoy)', 'Mago del Gol de Rebote',
  'El Defensa Poeta', 'Capitán Cabeza', 'Duende del Área', 'Leyenda del Empate', 'El Pollo de Oro', 'Rey de la Última Hora', 'Señor Tiro Libre',
]);

export const PIEZAS_NOMBRE = Object.freeze({
  prefijo: ['Copa', 'Gran Torneo', 'Liga', 'Desafío', 'Batalla', 'Mundialito', 'Supercopa', 'Noche', 'Duelo', 'Cumbre', 'Choque', 'Festival'],
  adjetivo: ['del Pollo Veloz', 'del Mando Roto', 'de las Leyendas', 'del Penal Eterno', 'de la Chancha Dorada', 'del Último Minuto', 'de los Valientes',
    'del Gol Fantasma', 'de la Ruleta Loca', 'de los Cracks', 'del Tiro Libre', 'de la Gran Remontada', 'del Rey de la Colina', 'del Café Frío', 'de Phoenix'],
});

export const DESCRIPCIONES_BASE = Object.freeze([
  'Torneo entre amigos. Se juega con buena onda y se respetan los horarios.',
  'Ven, juega y diviértete. Los resultados los anotamos aquí mismo.',
  'Sin presión: lo importante es pasarla bien. El campeón se lleva un título.',
  'Torneo serio con reglas claras. Cualquier duda, pregunta al organizador.',
]);

// Cómo funciona cada formato, para mostrarlo en la ficha y en el torneo. `ojo` = lo que más confunde.
export const GUIAS_FORMATOS = Object.freeze({
  eliminacion: {
    pasos: ['Se arman los cruces de dos en dos.', 'Quien gana pasa a la siguiente ronda; quien pierde sale.', 'Si hay un empate se elige quién pasa (por penales o a criterio del organizador).', 'Se sigue hasta la final.'],
    ejemplo: '8 jugadores → 4 partidos, luego 2 (semifinales) y 1 (final): 7 partidos en total.',
    ojo: 'Si el número de jugadores no es potencia de 2, los mejor ubicados descansan en la primera ronda («pasa directo»).',
  },
  doble: {
    pasos: ['Todos empiezan en la llave de ganadores.', 'Quien pierde baja a la llave de repechaje, no sale.', 'Quien pierde dos veces sale del torneo.', 'El campeón de ganadores y el del repechaje se enfrentan en la Gran Final.'],
    ejemplo: '8 jugadores → 14 partidos aproximadamente. Es largo, pero muy justo.',
    ojo: 'Solo funciona con 4, 8, 16 o 32 jugadores.',
  },
  liguilla: {
    pasos: ['Todos juegan contra todos una vez, repartidos en fechas.', 'Victoria 3 puntos, empate 1, derrota 0.', 'Si hay empate de puntos se mira el duelo directo, la diferencia de goles y los goles a favor.', 'Primero de la tabla = campeón.'],
    ejemplo: '6 jugadores → 5 fechas de 3 partidos = 15 partidos.',
    ojo: 'Con número impar, cada fecha uno descansa.',
  },
  idavuelta: {
    pasos: ['Igual que la liguilla, pero cada pareja juega dos veces (ida y vuelta).', 'La vuelta invierte quién es local.', 'La tabla se cuenta igual: 3, 1 y 0 puntos.'],
    ejemplo: '6 jugadores → 10 fechas = 30 partidos.',
    ojo: 'Es largo; úsalo para ligas de varias semanas.',
  },
  grupos: {
    pasos: ['Los jugadores se reparten en grupos parejos.', 'Dentro de cada grupo se juega una liguilla.', 'Pasan los 2 primeros de cada grupo.', 'Los clasificados juegan una eliminatoria hasta la final.', 'Cuando termine la fase de grupos, el organizador pulsa «Cerrar grupos» y los cruces se llenan solos.'],
    ejemplo: '12 jugadores → 4 grupos de 3 + 8 clasificados a cuartos.',
    ojo: 'Mientras no se cierren los grupos, los cruces de playoffs dirán «1.º del Grupo A» y similares.',
  },
  suizo: {
    pasos: ['Todos juegan todas las rondas: nadie se elimina.', 'La primera ronda es al azar; las siguientes juntan a gente con los mismos puntos.', 'No se repite rival mientras sea posible.', 'Al final gana quien más puntos tenga.', 'Cuando termine una ronda, el organizador pulsa «Siguiente ronda».'],
    ejemplo: '16 jugadores → 4 rondas de 8 partidos.',
    ojo: 'Con número impar, uno descansa cada ronda y suma una victoria.',
  },
  colina: {
    pasos: ['El campeón espera en el trono.', 'El primero de la cola lo reta.', 'Quien gana se queda (o sube); quien pierde va al final de la cola.', 'Al llegar a la racha máxima se gana una corona y se cede el trono.', 'Gana quien tenga más coronas al terminar el tiempo acordado.'],
    ejemplo: 'Racha máxima 3: ganas 3 seguidas = 1 corona y te sientas.',
    ojo: 'Es perfecto para noches de amigos con una sola sala abierta.',
  },
  escalera: {
    pasos: ['Todos empiezan en una escalera ordenada.', 'Puedes retar a alguien que esté hasta 3 puestos arriba.', 'Si ganas, cambian de puesto; si pierdes, todo igual.', 'No termina nunca: el organizador decide cuándo cerrar y el primero es campeón.'],
    ejemplo: 'Estás 5.º y retas al 3.º: si ganas, tú subes al 3.º y él baja al 5.º.',
    ojo: 'Cada reto lo anota quien lo juega; el organizador puede corregir cualquier cosa.',
  },
  circuito: {
    pasos: ['Se juegan varias fechas sueltas (cada una puede tener su formato).', 'Al final de cada fecha, el organizador anota el orden de llegada.', 'Cada puesto da puntos: 25, 18, 15, 12, 10, 8, 6, 4, 2, 1.', 'La tabla general suma todos los puntos.'],
    ejemplo: 'Ganas la fecha 1 (25) y quedas 3.º en la 2 (15): llevas 40 puntos.',
    ojo: 'Cada fecha se anota completa de una sola vez.',
  },
  libre: {
    pasos: ['Tú decides todo: añades los partidos que quieras, cuando quieras.', 'Cada partido tiene local, visitante y marcador.', 'La web arma la tabla automáticamente (3, 1 y 0 puntos).', 'Cierra el torneo cuando quieras y elige al campeón.'],
    ejemplo: 'Ideal para formatos inventados: «liga de los viernes», «reto de los 3 amigos», etc.',
    ojo: 'Aquí no hay cruces automáticos: tú eres el árbitro.',
  },
});

export const LEYENDA_ESTADOS = Object.freeze([
  { id: 'inscripcion', nombre: 'Inscripción', icono: 'fa-door-open', texto: 'Se pueden apuntar jugadores. Todavía no empezó.' },
  { id: 'en_curso', nombre: 'En curso', icono: 'fa-play', texto: 'Ya empezó. Se anotan resultados.' },
  { id: 'terminado', nombre: 'Terminado', icono: 'fa-trophy', texto: 'Ya hay campeón. Queda de recuerdo.' },
  { id: 'cancelado', nombre: 'Cancelado', icono: 'fa-ban', texto: 'El organizador o el staff lo cerró.' },
]);

export const LEYENDA_VISIBILIDAD = Object.freeze([
  { id: 'publico', nombre: 'Público', texto: 'Sale en la lista y cualquiera puede apuntarse.' },
  { id: 'enlace', nombre: 'Solo con enlace', texto: 'No sale en la lista; entra quien tenga el enlace.' },
  { id: 'privado', nombre: 'Privado', texto: 'Solo lo ve el organizador y los inscritos que él añada.' },
]);

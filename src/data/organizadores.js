// PÁGINA «ORGANIZADORES» — todo el texto vive aquí; edítalo sin tocar la página. Un campo vacío ('') simplemente no se muestra.
// OJO: los textos de propósito, motivación, visión e historia son un BORRADOR escrito con lo que se sabe del proyecto (comunidad competitiva de
// eFootball PES 2021 y SP Football Life 2026, partidas remotas con Parsec/Smash Soda, torneos en CopaFácil, comunidad en Discord). Reemplázalos por la
// historia real (fechas, anécdotas, frases propias) cuando quieras: no se inventó ningún dato personal de los impulsores.
export const ORG = {
  titulo: ['QUIÉNES', 'SOMOS'],
  lema: 'Una comunidad hecha por jugadores, para jugadores.',
  proposito: 'Dar a la comunidad un lugar serio y divertido donde competir: ligas con reglas claras, tablas al día, historial de cada jugador y un espacio propio donde todo eso viva junto.',
  motivacion: 'Las ganas de jugar fútbol de verdad contra rivales de verdad. Cada partida remota, cada fecha y cada título merecen quedar registrados, y cada jugador —sea el más destacado o el que recién empieza— merece sentirse parte.',
  vision: 'Convertir Phoenix Evolution Series en el epicentro de la comunidad: varias divisiones con ascensos y descensos, torneos y copas por temporada, y una red social competitiva donde la historia de cada jugador nunca se pierda.',
  historia: [
    'Todo empezó con una idea simple: jugar mejor organizados. Lo que nació como la Phoenix Evolution Society y la Galaxy League fue reuniendo a más jugadores, partido a partido, usando Parsec y Smash Soda para jugar a distancia, CopaFácil para gestionar los torneos y Discord como casa de la comunidad.',
    'Con el tiempo la comunidad creció y la idea evolucionó: ya no bastaba con una liga. Hacía falta una plataforma propia, con perfiles, estadísticas, historial, noticias y un sistema de divisiones. De esa evolución nace Phoenix Evolution Series.',
  ],
  hitos: [
    { t: 'Phoenix Evolution Society', d: 'El primer paso: reunir a la comunidad para jugar de forma organizada.' },
    { t: 'Galaxy League', d: 'La competición oficial, con tabla, fechas y resultados.' },
    { t: 'Phoenix Evolution Series', d: 'La evolución: plataforma propia, perfiles, historial y, próximamente, divisiones y copa interdivisional.' },
  ],
  valores: [
    { icono: 'fa-handshake', t: 'Juego limpio', d: 'Competir con respeto, ganes o pierdas.' },
    { icono: 'fa-users', t: 'Comunidad', d: 'Nadie se queda afuera: todos tienen su lugar.' },
    { icono: 'fa-list-check', t: 'Orden', d: 'Reglas claras, resultados al día, datos verificables.' },
    { icono: 'fa-rocket', t: 'Evolución', d: 'Mejorar siempre: cada temporada mejor que la anterior.' },
  ],
  // Los tres impulsores. `nombre` debe coincidir con el nombre o apodo del jugador en la base para enlazar su perfil automáticamente.
  impulsores: [
    { nombre: 'Fralex', rol: 'Impulsor principal', principal: true, bio: 'Principal impulsor de Phoenix Evolution: la idea, el proyecto y el empuje del día a día.', frase: '' },
    { nombre: 'Jack', rol: 'Co-impulsor', principal: false, bio: '', frase: '' },
    { nombre: 'Hugo', rol: 'Co-impulsor', principal: false, bio: '', frase: '' },
  ],
};

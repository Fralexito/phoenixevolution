// Contenido de la página «Unirme a la liga» (guía de entrada). Edita los textos aquí; la página los pinta sola.
// Cada paso: icon (Font Awesome), titulo, texto y, opcional, `enlace` { href, texto, externo } (href relativo = página de este sitio) o `accion: 'registro'` (abre «Crear cuenta»).
export const UNIRME = {
  titulo: ['Únete a la', 'liga'],
  lema: 'De cero a tu primer partido en cinco pasos.',
  pasos: [
    { icon: 'fa-brands fa-discord', titulo: 'Entra al Discord', texto: 'Ahí viven los avisos, se pactan las partidas y se arman los torneos. Es el punto de encuentro de toda la comunidad.', enlace: { href: 'DISCORD', texto: 'Unirme al Discord', externo: true } },
    { icon: 'fa-solid fa-user-plus', titulo: 'Crea tu cuenta en la web', texto: 'Con tu cuenta tienes perfil, reputación, tu ficha de jugador y acceso a la Sala de Duelos.', accion: 'registro' },
    { icon: 'fa-solid fa-id-card', titulo: 'Arma tu ficha de jugador', texto: 'Tu carta con estadísticas es tu presentación ante los rivales y los organizadores.', enlace: { href: 'database/', texto: 'Ir a Jugadores' } },
    { icon: 'fa-solid fa-tower-broadcast', titulo: 'Prepara tu conexión de juego', texto: 'Las partidas remotas se juegan con Parsec. Instálalo y crea tu cuenta; si vas a recibir a un rival, pide al staff en Discord la guía del host (Smash Soda).', enlace: { href: 'https://parsec.app', texto: 'Descargar Parsec', externo: true } },
    { icon: 'fa-solid fa-gamepad', titulo: 'Pacta tu primer partido', texto: 'Publica un reto o acepta uno abierto en la Sala de Duelos. Tus resultados alimentan tu reputación y la tabla.', enlace: { href: 'duelos/', texto: 'Ir a la Sala de Duelos' } },
  ],
  preguntas: [
    { p: '¿Cuánto cuesta entrar?', r: 'Crear la cuenta y jugar partidas es gratis. Los torneos pueden tener sus propias reglas: revisa los avisos en Discord.' },
    { p: '¿Qué necesito para jugar?', r: 'Un PC o equipo compatible con Parsec, buena conexión y el juego de la liga (PES 2021 o SP Football Life 2026 según la competición).' },
    { p: '¿Cómo sé cuándo juego?', r: 'El calendario de cada liga está en la página Liga y en Central. Los cruces y horarios se coordinan entre rivales por Discord.' },
    { p: '¿Y si tengo un problema?', r: 'Escribe al staff en Discord o usa el reporte de la web: toda disputa se revisa con calma y se registra.' },
  ],
};

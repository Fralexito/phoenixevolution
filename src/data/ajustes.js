// CATÁLOGO DE AJUSTES: la ÚNICA fuente de verdad. La página /ajustes/, la validación y el valor por defecto salen de aquí.
// Para añadir un ajuste: agrégalo a una sección (clave única, tipo, defecto, opciones) y haz que el CSS/JS lo lea como `data-aj-<clave-en-kebab>` en <html>.
// tipo 'switch' = true/false · tipo 'opciones' = uno de `opciones` (el valor siempre es texto).

// `grupo` = bloque de la página /ajustes/ (ver GRUPOS_AJUSTES). `muestra` en una opción = color o degradado que se dibuja como muestra.
// 19-oct-2026 (Fralex: «super personalizable… cada ajuste en su respectiva agrupación»): «Accesibilidad» se partió en «Texto y lectura» y
// «Movimiento y efectos», y llegan «Diseño y navegación», fondo, esquinas, letra, ancho, barra de abajo, contactos y transiciones. Las claves viejas no cambian.
export const GRUPOS_AJUSTES = [
  { id: 'personaliza', titulo: 'Personaliza tu web', texto: 'Colores, fondo, letra y cómo se mueve todo' },
  { id: 'contenido', titulo: 'Contenido', texto: 'Cartas, tablas, avisos y horarios' },
  { id: 'privacidad', titulo: 'Privacidad y datos', texto: 'Qué recuerda este navegador y qué puedes llevarte' },
];

export const SECCIONES = [
  { id: 'apariencia', grupo: 'personaliza', vista: true, titulo: 'Apariencia', icono: 'fa-palette', texto: 'Color de acento, fondo, neón y esquinas.', ajustes: [
    { clave: 'acento', tipo: 'opciones', etiqueta: 'Color de acento', ayuda: 'El color de botones, títulos, bordes y detalles de toda la web.', defecto: 'cian',
      opciones: [{ valor: 'cian', etiqueta: 'Cian', muestra: '#00e5ff' }, { valor: 'violeta', etiqueta: 'Violeta', muestra: '#c084fc' }, { valor: 'azul', etiqueta: 'Azul', muestra: '#60a5fa' },
        { valor: 'verde', etiqueta: 'Verde', muestra: '#34d399' }, { valor: 'dorado', etiqueta: 'Dorado', muestra: '#fbbf24' }, { valor: 'rosa', etiqueta: 'Rosa', muestra: '#f472b6' }, { valor: 'rojo', etiqueta: 'Rojo', muestra: '#fb7185' }] },
    { clave: 'fondo', tipo: 'opciones', etiqueta: 'Fondo de la web', ayuda: 'Galaxia lleva las nubes de color de siempre; Negro puro ahorra batería en pantallas OLED.', defecto: 'galaxia',
      opciones: [{ valor: 'galaxia', etiqueta: 'Galaxia', muestra: 'radial-gradient(circle at 25% 60%, #3b1a6e, transparent 60%), radial-gradient(circle at 80% 30%, #0b4a5a, transparent 55%), #08051a' },
        { valor: 'sobrio', etiqueta: 'Sobrio', muestra: '#0b0a1a' }, { valor: 'negro', etiqueta: 'Negro puro', muestra: '#000' }] },
    { clave: 'neon', tipo: 'opciones', etiqueta: 'Brillo neón', ayuda: 'Suave quita el resplandor de los títulos.', defecto: 'normal', opciones: [{ valor: 'normal', etiqueta: 'Con brillo' }, { valor: 'suave', etiqueta: 'Suave' }] },
    { clave: 'esquinas', tipo: 'opciones', etiqueta: 'Esquinas', ayuda: 'Redondeadas y amables, o rectas y más «de torneo».', defecto: 'redondas', opciones: [{ valor: 'redondas', etiqueta: 'Redondeadas' }, { valor: 'rectas', etiqueta: 'Rectas' }] },
  ] },
  { id: 'texto', grupo: 'personaliza', vista: true, titulo: 'Texto y lectura', icono: 'fa-universal-access', texto: 'Tamaño, letra, contraste y enlaces.', ajustes: [
    { clave: 'escala', tipo: 'opciones', etiqueta: 'Tamaño del texto', ayuda: 'Agranda o reduce toda la web.', defecto: '100', opciones: [{ valor: '90', etiqueta: 'Pequeño' }, { valor: '100', etiqueta: 'Normal' }, { valor: '115', etiqueta: 'Grande' }, { valor: '130', etiqueta: 'Muy grande' }] },
    { clave: 'letra', tipo: 'opciones', etiqueta: 'Letra de los títulos', ayuda: 'Phoenix es la letra deportiva de siempre; Simple usa la misma letra del texto, más fácil de leer.', defecto: 'phoenix', opciones: [{ valor: 'phoenix', etiqueta: 'Phoenix' }, { valor: 'simple', etiqueta: 'Simple' }] },
    { clave: 'contraste', tipo: 'opciones', etiqueta: 'Contraste', ayuda: 'Alto aclara textos grises y marca más los bordes.', defecto: 'normal', opciones: [{ valor: 'normal', etiqueta: 'Normal' }, { valor: 'alto', etiqueta: 'Alto' }] },
    { clave: 'subrayado', tipo: 'switch', etiqueta: 'Subrayar enlaces del texto', ayuda: 'Más fácil distinguir qué se puede pulsar.', defecto: false },
    { clave: 'foco', tipo: 'switch', etiqueta: 'Resaltar el foco del teclado', ayuda: 'Contorno grueso al navegar con Tab.', defecto: false },
  ] },
  { id: 'movimiento', grupo: 'personaliza', titulo: 'Movimiento y efectos', icono: 'fa-wand-magic-sparkles', texto: 'Animaciones y transiciones entre páginas.', ajustes: [
    { clave: 'movimiento', tipo: 'opciones', etiqueta: 'Animaciones', ayuda: '«Según el sistema» respeta la opción de tu dispositivo.', defecto: 'sistema', opciones: [{ valor: 'sistema', etiqueta: 'Según el sistema' }, { valor: 'normal', etiqueta: 'Siempre activas' }, { valor: 'reducido', etiqueta: 'Reducidas' }] },
    { clave: 'transiciones', tipo: 'switch', etiqueta: 'Transición al cambiar de página', ayuda: 'El fundido suave entre una página y otra.', defecto: true },
  ] },
  { id: 'navegacion', grupo: 'personaliza', titulo: 'Diseño y navegación', icono: 'fa-table-columns', texto: 'Ancho de la página y qué barras se ven.', ajustes: [
    { clave: 'ancho', tipo: 'opciones', etiqueta: 'Ancho de la página', ayuda: 'En pantallas grandes: Amplio aprovecha más espacio a los lados.', defecto: 'normal', opciones: [{ valor: 'normal', etiqueta: 'Normal' }, { valor: 'amplio', etiqueta: 'Amplio' }] },
    { clave: 'barraInferior', tipo: 'switch', etiqueta: 'Barra de abajo en el celular', ayuda: 'Inicio · Social · Mi club · Jugar · Yo. Si la apagas, todo queda en el menú.', defecto: true },
    { clave: 'contactos', tipo: 'switch', etiqueta: 'Columna de contactos en PC', ayuda: 'Tus amigos en línea a la derecha (pantallas grandes, con sesión).', defecto: true },
  ] },
  { id: 'cartas', grupo: 'contenido', vista: true, titulo: 'Jugadores y cartas', icono: 'fa-id-card', texto: 'Cómo se ven y se mueven las cartas.', ajustes: [
    // Ronda 254: el «reflejo» de siempre aburría (Fralex). Ahora hay varios efectos sutiles al pasar el mouse; «Sorpresa» le da a cada jugador el suyo.
    { clave: 'cartasEfecto', tipo: 'opciones', etiqueta: 'Efecto al pasar el mouse', ayuda: 'Todos son sutiles. «Sorpresa» le da a cada jugador su propio efecto.', defecto: 'sorpresa',
      opciones: [{ valor: 'sorpresa', etiqueta: 'Sorpresa (uno distinto por jugador)' }, { valor: 'reflejo', etiqueta: 'Reflejo suave' }, { valor: 'foco', etiqueta: 'Luz que sigue al mouse' },
        { valor: 'borde', etiqueta: 'Borde que se enciende' }, { valor: 'holo', etiqueta: 'Tornasol' }, { valor: 'ninguno', etiqueta: 'Ninguno' }] },
    { clave: 'cartasInclinacion', tipo: 'switch', etiqueta: 'Inclinación 3D de la carta ampliada', ayuda: 'Solo con mouse: la réplica sigue el cursor.', defecto: true },
    { clave: 'cartasInsignia', tipo: 'switch', etiqueta: 'Insignia de división (L1 / L2)', ayuda: 'La etiqueta en la esquina de cada carta.', defecto: true },
  ] },
  { id: 'liga', grupo: 'contenido', vista: true, titulo: 'Liga y temporada', icono: 'fa-trophy', texto: 'Cómo se leen las tablas.', ajustes: [
    { clave: 'ligaZonas', tipo: 'switch', etiqueta: 'Colorear zonas de la tabla', ayuda: 'Copa, ascenso y descenso con su franja de color.', defecto: true },
    { clave: 'ligaCompacta', tipo: 'switch', etiqueta: 'Tablas compactas', ayuda: 'Filas más bajas: caben más jugadores sin bajar.', defecto: false },
  ] },
  { id: 'notificaciones', grupo: 'contenido', vista: true, titulo: 'Notificaciones y en vivo', icono: 'fa-bell', texto: 'El panel «En vivo» y la barra de última hora.', ajustes: [
    { clave: 'vivo', tipo: 'switch', etiqueta: 'Mostrar panel «En vivo»', ayuda: 'Los avisos flotantes de abajo en pantalla.', defecto: true },
    { clave: 'vivoDuracion', tipo: 'opciones', etiqueta: 'Duración de cada aviso', ayuda: 'Cuánto tarda en desvanecerse.', defecto: '22', opciones: [{ valor: '10', etiqueta: '10 segundos' }, { valor: '22', etiqueta: '22 segundos' }, { valor: '40', etiqueta: '40 segundos' }] },
    { clave: 'vivoRetos', tipo: 'switch', etiqueta: 'Avisos de retos aceptados', ayuda: '«X aceptó el reto de Y».', defecto: true },
    { clave: 'vivoRadar', tipo: 'switch', etiqueta: 'Avisos de radar', ayuda: '«X activó el radar».', defecto: true },
    { clave: 'ticker', tipo: 'switch', etiqueta: 'Barra de última hora', ayuda: 'La franja de noticias de arriba.', defecto: true },
    { clave: 'tickerVel', tipo: 'opciones', etiqueta: 'Velocidad de la barra', ayuda: 'Qué tan rápido pasan las noticias.', defecto: 'normal', opciones: [{ valor: 'lenta', etiqueta: 'Lenta' }, { valor: 'normal', etiqueta: 'Normal' }, { valor: 'rapida', etiqueta: 'Rápida' }] },
  ] },
  { id: 'privacidad', grupo: 'privacidad', vista: true, titulo: 'Privacidad', icono: 'fa-user-shield', texto: 'Qué recuerda este navegador. Nada de esto sale de tu equipo.', ajustes: [
    { clave: 'vivoHistorial', tipo: 'switch', etiqueta: 'Guardar el historial de «En vivo»', ayuda: 'Solo el del día de hoy; se vacía solo al cambiar de día. Se abre en otra pestaña con el botón «Historial».', defecto: true },
    { clave: 'recordarZoom', tipo: 'switch', etiqueta: 'Recordar el zoom de Jugadores', ayuda: 'El tamaño de las cartas que elegiste.', defecto: true },
  ], acciones: [
    { id: 'borrar-historial-vivo', etiqueta: 'Borrar historial de hoy de «En vivo»', icono: 'fa-eraser' },
    { id: 'restablecer-vivo-pos', etiqueta: 'Devolver «En vivo» a su sitio', icono: 'fa-arrows-up-down-left-right' },
    { id: 'borrar-zoom', etiqueta: 'Olvidar el zoom guardado', icono: 'fa-magnifying-glass-minus' },
  ] },
  { id: 'cuenta', titulo: 'Cuenta', icono: 'fa-user', texto: 'Tu perfil y tu sesión.', ajustes: [], cuenta: true },
  { id: 'idioma', grupo: 'contenido', vista: true, titulo: 'Idioma y región', icono: 'fa-globe', texto: 'Cómo se muestran las horas.', ajustes: [
    { clave: 'idioma', tipo: 'opciones', etiqueta: 'Idioma', ayuda: 'Por ahora la web solo existe en español.', defecto: 'es', opciones: [{ valor: 'es', etiqueta: 'Español' }] },
    { clave: 'hora', tipo: 'opciones', etiqueta: 'Formato de hora', ayuda: 'Se aplica a avisos en vivo, duelos y notificaciones.', defecto: '24', opciones: [{ valor: '24', etiqueta: '24 horas (18:30)' }, { valor: '12', etiqueta: '12 horas (6:30 p. m.)' }] },
    { clave: 'zona', tipo: 'opciones', etiqueta: 'Zona horaria', ayuda: 'Automática usa la de tu dispositivo.', defecto: 'auto', opciones: [
      { valor: 'auto', etiqueta: 'Automática (mi dispositivo)' }, { valor: 'America/Lima', etiqueta: 'Lima (Perú)' }, { valor: 'America/Bogota', etiqueta: 'Bogotá (Colombia)' },
      { valor: 'America/Mexico_City', etiqueta: 'Ciudad de México' }, { valor: 'America/Santiago', etiqueta: 'Santiago (Chile)' }, { valor: 'America/Argentina/Buenos_Aires', etiqueta: 'Buenos Aires (Argentina)' }, { valor: 'Europe/Madrid', etiqueta: 'Madrid (España)' }] },
  ] },
  { id: 'datos', grupo: 'privacidad', vista: true, titulo: 'Datos', icono: 'fa-database', texto: 'Copia, traslada o limpia tus ajustes.', ajustes: [], acciones: [
    { id: 'exportar', etiqueta: 'Exportar mis ajustes', icono: 'fa-file-export' },
    { id: 'importar', etiqueta: 'Importar ajustes', icono: 'fa-file-import' },
    { id: 'restablecer', etiqueta: 'Restablecer ajustes', icono: 'fa-rotate-left' },
    { id: 'borrar-local', etiqueta: 'Borrar todos los datos locales', icono: 'fa-trash', peligro: true },
  ] },
];

// ESTILOS RÁPIDOS (19-oct-2026): con un toque cambian varios ajustes a la vez. Solo tocan lo visual; lo demás queda como lo tengas.
export const ESTILOS = [
  { id: 'phoenix', titulo: 'Phoenix', texto: 'El de siempre', muestra: 'linear-gradient(135deg, #00e5ff, #7c3aed)', ajustes: { acento: 'cian', fondo: 'galaxia', neon: 'normal', esquinas: 'redondas', letra: 'phoenix', contraste: 'normal' } },
  { id: 'torneo', titulo: 'Torneo', texto: 'Dorado y esquinas rectas', muestra: 'linear-gradient(135deg, #fbbf24, #7c2d12)', ajustes: { acento: 'dorado', fondo: 'sobrio', neon: 'normal', esquinas: 'rectas', letra: 'phoenix', contraste: 'normal' } },
  { id: 'minimal', titulo: 'Minimalista', texto: 'Sin brillo, fondo liso', muestra: 'linear-gradient(135deg, #60a5fa, #0b0a1a)', ajustes: { acento: 'azul', fondo: 'sobrio', neon: 'suave', esquinas: 'redondas', letra: 'simple', contraste: 'normal' } },
  { id: 'oled', titulo: 'Nocturno', texto: 'Negro puro, ahorra batería', muestra: 'linear-gradient(135deg, #c084fc, #000)', ajustes: { acento: 'violeta', fondo: 'negro', neon: 'suave', esquinas: 'redondas', letra: 'phoenix', contraste: 'normal' } },
  { id: 'lectura', titulo: 'Lectura cómoda', texto: 'Texto grande y más contraste', muestra: 'linear-gradient(135deg, #34d399, #0b0a1a)', ajustes: { acento: 'verde', fondo: 'sobrio', neon: 'suave', letra: 'simple', contraste: 'alto', escala: '115', subrayado: true } },
];

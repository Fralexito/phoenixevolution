// CATÁLOGO DE AJUSTES: la ÚNICA fuente de verdad. La página /ajustes/, la validación y el valor por defecto salen de aquí.
// Para añadir un ajuste: agrégalo a una sección (clave única, tipo, defecto, opciones) y haz que el CSS/JS lo lea como `data-aj-<clave-en-kebab>` en <html>.
// tipo 'switch' = true/false · tipo 'opciones' = uno de `opciones` (el valor siempre es texto).

export const SECCIONES = [
  { id: 'apariencia', vista: true, titulo: 'Apariencia y temas', icono: 'fa-palette', texto: 'El color de acento y la intensidad del neón.', ajustes: [
    { clave: 'acento', tipo: 'opciones', etiqueta: 'Color de acento', ayuda: 'Cambia el cian neón por otro color en botones, títulos y bordes.', defecto: 'cian',
      opciones: [{ valor: 'cian', etiqueta: 'Cian (original)' }, { valor: 'violeta', etiqueta: 'Violeta' }, { valor: 'dorado', etiqueta: 'Dorado' }, { valor: 'verde', etiqueta: 'Verde' }, { valor: 'rojo', etiqueta: 'Rojo' }] },
    { clave: 'neon', tipo: 'opciones', etiqueta: 'Intensidad del neón', ayuda: 'Suave quita el resplandor de los títulos.', defecto: 'normal', opciones: [{ valor: 'normal', etiqueta: 'Normal' }, { valor: 'suave', etiqueta: 'Suave' }] },
  ] },
  { id: 'cartas', vista: true, titulo: 'Jugadores y cartas', icono: 'fa-id-card', texto: 'Cómo se ven y se mueven las cartas.', ajustes: [
    { clave: 'cartasBrillo', tipo: 'switch', etiqueta: 'Brillo sobre las cartas', ayuda: 'El destello que cruza la carta.', defecto: true },
    { clave: 'cartasInclinacion', tipo: 'switch', etiqueta: 'Inclinación 3D de la carta ampliada', ayuda: 'Solo con mouse: la réplica sigue el cursor.', defecto: true },
    { clave: 'cartasInsignia', tipo: 'switch', etiqueta: 'Insignia de división (L1 / L2)', ayuda: 'La etiqueta en la esquina de cada carta.', defecto: true },
  ] },
  { id: 'liga', vista: true, titulo: 'Liga y temporada', icono: 'fa-trophy', texto: 'Cómo se leen las tablas.', ajustes: [
    { clave: 'ligaZonas', tipo: 'switch', etiqueta: 'Colorear zonas de la tabla', ayuda: 'Copa, ascenso y descenso con su franja de color.', defecto: true },
    { clave: 'ligaCompacta', tipo: 'switch', etiqueta: 'Tablas compactas', ayuda: 'Filas más bajas: caben más jugadores sin bajar.', defecto: false },
  ] },
  { id: 'notificaciones', vista: true, titulo: 'Notificaciones y en vivo', icono: 'fa-bell', texto: 'El panel «En vivo» y la barra de última hora.', ajustes: [
    { clave: 'vivo', tipo: 'switch', etiqueta: 'Mostrar panel «En vivo»', ayuda: 'Los avisos flotantes de abajo en pantalla.', defecto: true },
    { clave: 'vivoDuracion', tipo: 'opciones', etiqueta: 'Duración de cada aviso', ayuda: 'Cuánto tarda en desvanecerse.', defecto: '22', opciones: [{ valor: '10', etiqueta: '10 segundos' }, { valor: '22', etiqueta: '22 segundos' }, { valor: '40', etiqueta: '40 segundos' }] },
    { clave: 'vivoRetos', tipo: 'switch', etiqueta: 'Avisos de retos aceptados', ayuda: '«X aceptó el reto de Y».', defecto: true },
    { clave: 'vivoRadar', tipo: 'switch', etiqueta: 'Avisos de radar', ayuda: '«X activó el radar».', defecto: true },
    { clave: 'ticker', tipo: 'switch', etiqueta: 'Barra de última hora', ayuda: 'La franja de noticias de arriba.', defecto: true },
    { clave: 'tickerVel', tipo: 'opciones', etiqueta: 'Velocidad de la barra', ayuda: 'Qué tan rápido pasan las noticias.', defecto: 'normal', opciones: [{ valor: 'lenta', etiqueta: 'Lenta' }, { valor: 'normal', etiqueta: 'Normal' }, { valor: 'rapida', etiqueta: 'Rápida' }] },
  ] },
  { id: 'privacidad', vista: true, titulo: 'Privacidad', icono: 'fa-user-shield', texto: 'Qué recuerda este navegador. Nada de esto sale de tu equipo.', ajustes: [
    { clave: 'vivoHistorial', tipo: 'switch', etiqueta: 'Guardar el historial de «En vivo»', ayuda: 'Solo el del día de hoy; se vacía solo al cambiar de día. Se abre en otra pestaña con el botón «Historial».', defecto: true },
    { clave: 'recordarZoom', tipo: 'switch', etiqueta: 'Recordar el zoom de Jugadores', ayuda: 'El tamaño de las cartas que elegiste.', defecto: true },
  ], acciones: [
    { id: 'borrar-historial-vivo', etiqueta: 'Borrar historial de hoy de «En vivo»', icono: 'fa-eraser' },
    { id: 'restablecer-vivo-pos', etiqueta: 'Devolver «En vivo» a su sitio', icono: 'fa-arrows-up-down-left-right' },
    { id: 'borrar-zoom', etiqueta: 'Olvidar el zoom guardado', icono: 'fa-magnifying-glass-minus' },
  ] },
  { id: 'cuenta', titulo: 'Cuenta', icono: 'fa-user', texto: 'Tu perfil y tu sesión.', ajustes: [], cuenta: true },
  { id: 'idioma', vista: true, titulo: 'Idioma y región', icono: 'fa-globe', texto: 'Cómo se muestran las horas.', ajustes: [
    { clave: 'idioma', tipo: 'opciones', etiqueta: 'Idioma', ayuda: 'Por ahora la web solo existe en español.', defecto: 'es', opciones: [{ valor: 'es', etiqueta: 'Español' }] },
    { clave: 'hora', tipo: 'opciones', etiqueta: 'Formato de hora', ayuda: 'Se aplica a avisos en vivo, duelos y notificaciones.', defecto: '24', opciones: [{ valor: '24', etiqueta: '24 horas (18:30)' }, { valor: '12', etiqueta: '12 horas (6:30 p. m.)' }] },
    { clave: 'zona', tipo: 'opciones', etiqueta: 'Zona horaria', ayuda: 'Automática usa la de tu dispositivo.', defecto: 'auto', opciones: [
      { valor: 'auto', etiqueta: 'Automática (mi dispositivo)' }, { valor: 'America/Lima', etiqueta: 'Lima (Perú)' }, { valor: 'America/Bogota', etiqueta: 'Bogotá (Colombia)' },
      { valor: 'America/Mexico_City', etiqueta: 'Ciudad de México' }, { valor: 'America/Santiago', etiqueta: 'Santiago (Chile)' }, { valor: 'America/Argentina/Buenos_Aires', etiqueta: 'Buenos Aires (Argentina)' }, { valor: 'Europe/Madrid', etiqueta: 'Madrid (España)' }] },
  ] },
  { id: 'accesibilidad', vista: true, titulo: 'Accesibilidad', icono: 'fa-universal-access', texto: 'Comodidad de lectura y movimiento.', ajustes: [
    { clave: 'movimiento', tipo: 'opciones', etiqueta: 'Animaciones', ayuda: '«Según el sistema» respeta la opción de tu dispositivo.', defecto: 'sistema', opciones: [{ valor: 'sistema', etiqueta: 'Según el sistema' }, { valor: 'normal', etiqueta: 'Siempre activas' }, { valor: 'reducido', etiqueta: 'Reducidas' }] },
    { clave: 'escala', tipo: 'opciones', etiqueta: 'Tamaño del texto', ayuda: 'Agranda o reduce toda la web.', defecto: '100', opciones: [{ valor: '90', etiqueta: 'Pequeño (90 %)' }, { valor: '100', etiqueta: 'Normal (100 %)' }, { valor: '115', etiqueta: 'Grande (115 %)' }, { valor: '130', etiqueta: 'Muy grande (130 %)' }] },
    { clave: 'contraste', tipo: 'opciones', etiqueta: 'Contraste', ayuda: 'Alto aclara textos grises y marca más los bordes.', defecto: 'normal', opciones: [{ valor: 'normal', etiqueta: 'Normal' }, { valor: 'alto', etiqueta: 'Alto' }] },
    { clave: 'subrayado', tipo: 'switch', etiqueta: 'Subrayar enlaces del texto', ayuda: 'Más fácil distinguir qué se puede pulsar.', defecto: false },
    { clave: 'foco', tipo: 'switch', etiqueta: 'Resaltar el foco del teclado', ayuda: 'Contorno grueso al navegar con Tab.', defecto: false },
  ] },
  { id: 'datos', vista: true, titulo: 'Datos', icono: 'fa-database', texto: 'Copia, traslada o limpia tus ajustes.', ajustes: [], acciones: [
    { id: 'exportar', etiqueta: 'Exportar mis ajustes', icono: 'fa-file-export' },
    { id: 'importar', etiqueta: 'Importar ajustes', icono: 'fa-file-import' },
    { id: 'restablecer', etiqueta: 'Restablecer ajustes', icono: 'fa-rotate-left' },
    { id: 'borrar-local', etiqueta: 'Borrar todos los datos locales', icono: 'fa-trash', peligro: true },
  ] },
];

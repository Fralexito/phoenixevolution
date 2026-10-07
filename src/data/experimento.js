// INTERRUPTORES del experimento de diseño «más dinámico». Cada uno es independiente: pon false y esa mejora desaparece (reconstruye la web).
//   transiciones → fundido suave al cambiar de página (CSS puro, solo navegadores que lo soportan)
//   reveal       → los bloques aparecen con un deslizamiento suave al hacer scroll
//   esqueletos   → siluetas que brillan mientras cargan los datos (en vez de «Cargando…»)
//   rachas       → panel «En racha» en Central
//   compartir    → botón «Compartir» (tarjeta-imagen de la fecha en Central y de la campaña en el perfil)
//   visita       → aviso «novedades desde tu última visita» en Central
//   social       → sección «Social» (portada social: historias, publicar y feed de todos) en el menú principal. Pon false y desaparece del menú (la página sigue existiendo)
//   dopamina     → capa «dopamínica»: botones que se hunden al presionar, tarjetas que se levantan y brillan con el mouse, ráfaga de emojis al reaccionar/publicar, anillos de historias que giran, entrada escalonada del feed. Pon false y todo vuelve a como estaba (la web se reconstruye)
//   contactos    → columna de amigos en línea a la derecha (PC ≥ 1280 px), botón «Chats» en pantallas menores y ventanitas de chat abajo en cualquier página. Pon false y desaparece (Mensajes sigue igual)
//   tickerVivo   → la barra «Última hora» mezcla, junto a las noticias, la actividad real de la comunidad (partidos en juego, salas abiertas, retos esperando, resultados de la semana). Pon false y vuelve a solo noticias
//   vitrina      → jerarquía tipo transmisión: el primer reto del radar se muestra como «Destacado» (más grande, borde animado). Pon false y todas las tarjetas vuelven a ser iguales
//   barraLateral → barra lateral izquierda estilo red social (solo PC ≥ 1280 px): atajos, ligas y amigos. Pon false y desaparece por completo
export const FX = { transiciones: true, reveal: true, esqueletos: true, rachas: true, visita: true, compartir: true, barraLateral: true, social: true, dopamina: true, contactos: true, tickerVivo: true, vitrina: true };

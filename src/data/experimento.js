// INTERRUPTORES del experimento de diseño «más dinámico». Cada uno es independiente: pon false y esa mejora desaparece (reconstruye la web).
//   transiciones → fundido suave al cambiar de página (CSS puro, solo navegadores que lo soportan)
//   reveal       → los bloques aparecen con un deslizamiento suave al hacer scroll
//   esqueletos   → siluetas que brillan mientras cargan los datos (en vez de «Cargando…»)
//   rachas       → panel «En racha» en Central
//   compartir    → botón «Compartir» (tarjeta-imagen de la fecha en Central y de la campaña en el perfil)
//   visita       → aviso «novedades desde tu última visita» en Central
//   social       → sección «Social» (portada social: historias, publicar y feed de todos) en el menú principal. Pon false y desaparece del menú (la página sigue existiendo)
//   barraLateral → barra lateral izquierda estilo red social (solo PC ≥ 1280 px): atajos, ligas y amigos. Pon false y desaparece por completo
export const FX = { transiciones: true, reveal: true, esqueletos: true, rachas: true, visita: true, compartir: true, barraLateral: true, social: true };

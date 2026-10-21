# Informe del 16-oct-2026: React, herramientas, radar FIFA y orden visual

Para FRALEX y para cualquier IA que continúe. Rondas 340–344 (rama `borrador`).

## 1. ¿React sí o no? (decisión)
- La web es Astro + JavaScript puro. **Decisión: no migrar todo a React.** Se usa React solo como «isla» en pantallas muy interactivas o en vivo. La regla está en `CLAUDE.md` («Cuándo React y cuándo JavaScript»).
- Opciones evaluadas: (a) quedarse; (b) parcial con islas; (c) completo. Completo = reescribir 51 páginas + 496 tests, 2–4 semanas sin funciones nuevas, y web más pesada. Parcial = riesgo bajo y es el camino hacia el completo si algún día hace falta.
- Un clon del repositorio para replicar en React es posible, pero la copia se desactualiza mientras la otra cuenta sigue cambiando la web; si se hace, congelar la web actual o aplicar cada cambio en las dos.
- Lo «premium» visual no depende de React: depende del pulido (animaciones, espaciado, tipografía, rapidez). Las librerías de componentes famosas (Aceternity, Magic UI, shadcn) son solo React.
- **Primera isla (ronda 340):** `src/islas/CentroPartido.jsx` en `/laboratorio/` (sin enlace en el menú), datos inventados; lógica en `src/js/core/competicion/centroPartido.js` + test. Instalados `react`, `react-dom`, `@astrojs/react`. Las demás páginas NO cargan React.

## 2. Herramientas investigadas
Leídas en sus páginas: GSAP (gratis, plugins incluidos, ~27 KB), Anime.js (MIT, ~6 KB), brackets-viewer.js (llaves de torneo en JS puro: eliminación simple/doble y todos contra todos; licencia sin confirmar), Pagefind (buscador estático), vistas de transición de Astro, Subfont (tipografías más ligeras), Aceternity UI (React; premium ~$199 de por vida).
Por conocimiento general, sin verificar hoy: Lenis, Auto-Animate, Driver.js, Rive, Lottie, Howler/Tone.js, SortableJS/dnd-kit, Konva/Pixi, Three.js, ECharts/D3.
Pendientes elegidos por el usuario: llaves de torneo (brackets-viewer), sonidos (Howler), celebración al ganar (Lottie/Rive), alineación arrastrable (SortableJS). Ya instalados de antes: Fuse.js, Floating UI, uPlot, confeti, Lenis (scroll suave).

## 3. Radar «estilo FIFA» (ronda 341)
- Ficha del jugador de la comunidad (`/jugador/?id=…`): hexágono de 6 ejes (Ataque, Creación, Técnica, Defensa, Presión, Mentalidad = `core/jugadores/estilo.js`), número de color por nivel, lista con barras, «Media de ejes», y al tocar/pasar el mouse por un eje se ve de qué stats sale.
- Archivos: `core/jugadores/radarFifa.js` (+`tests/radarFifa.test.mjs`), `features/radarFifa.js`, estilos al final de `styles/perfilJugador.css`, bandera `FX.radarFifa`.
- Límite: los futbolistas de la Liga Máster (`/futbolista/`) solo tienen «media»; para darles radar hacen falta las 14 stats por jugador.
- Bug hallado en la prueba y corregido: con mouse el hover marcaba el eje y el clic lo desmarcaba.

## 4. Revisión visual de las 51 páginas (PC 1280 y celular 390, sin sesión y sin datos reales)
Sin desbordes horizontales ni texto menor a 12 px. Hallazgos y qué se hizo (ronda 344):
1. Dos estilos de cabecera mezclados (tarjeta de vidrio vs gran título con degradado y esquinas), incluso dentro de «Competiciones». **Hecho:** Historial, Jugadores, Noticias y Configuración pasan al estilo tarjeta (mismo tamaño 36,8 px). **Regla acordada:** gran título solo para portadas/información (Competiciones, Formatos, Torneos, Temporada, Únete, Quiénes somos, Divisiones); tarjeta para el resto. Pendiente de decidir: Social/Comunidad sin título visible (se dejó así por el scroll), textos legales (30 px).
2. Celular con demasiado «marco» antes del contenido: **Hecho:** el «Explora» del pie se oculta con la barra inferior (se mantiene si el Panel añadió enlaces propios).
3. Tiras de secciones cortadas en celular: **Hecho:** desvanecido en el borde con más contenido y la pestaña activa se centra (`features/tirasDeslizables.js`).
4. Las páginas con sesión y datos reales (Jugadores, Duelos, Perfil, Liga) no se pudieron juzgar completas (Supabase bloqueado desde las pruebas).

## 5. Norma nueva de anotaciones
Desde el 16-oct-2026: anotaciones e informes importantes **solo a GitHub** (`docs/`, `MAPA.md`, `REGISTRO.md`) porque no hay Drive disponible. Cuando vuelva Drive, subir también todo a Drive (incluidos estos informes). Ya no se escriben docs nuevos en el proyecto de claude.ai.

# Reorganización del código · 18 oct 2026

Los 122 módulos de lógica pura que estaban sueltos en `src/js/core/` ahora están en 7 carpetas por tema. Se hizo con `git mv` (el historial se conserva) y con `tools/reorganizar/mover-modulos.mjs`, que reescribió las 1.059 rutas de `import` y las menciones en comentarios y documentos (431 archivos). Comprobado: 624 pruebas, `npm run build` y las 57 páginas cargando sus 437 módulos sin un solo error de ruta.

**No cambió nada de lo que hace la web**: solo dónde vive cada archivo. `src/js/features/`, `src/js/pages/`, `src/data/` y `src/styles/` siguen igual.

## Si trabajas en una rama o carpeta anterior a este cambio

1. Fusiona `borrador` en tu rama (Git reconoce los movimientos).
2. Si alguno de TUS archivos nuevos importa `core/<algo>.js` con la ruta vieja, ejecuta:
   `node tools/reorganizar/mover-modulos.mjs tools/reorganizar/mapa-core.json --solo-rutas`
   (reescribe rutas sin mover nada). Luego `npm test` y `npm run build`.
3. Para módulos nuevos de lógica pura: créalos dentro de la carpeta de su tema (abajo), no sueltos en `core/`.

## Dónde está cada módulo ahora

### `src/js/core/sistema/` — Base del sitio: conexión con Supabase, sesión, roles, ajustes, diálogos, avisos, buscador, escudos, avatares

`ajustes.js` · `auditoria.js` · `avatar.js` · `avisos.js` · `barraLateral.js` · `buscador.js` · `config.js` · `contador.js` · `crop.js` · `density.js` · `dialogo.js` · `dock.js` · `dom.js` · `edad.js` · `escudos.js` · `fisico.js` · `image.js` · `inclinacion.js` · `modal.js` · `notifs.js` · `pestanas.js` · `rendimiento.js` · `roles.js` · `rules.js` · `session.js` · `sitio.js` · `staffUi.js` · `supabase.js` · `toast.js` · `vacio.js`

### `src/js/core/jugadores/` — Jugadores: estadísticas, comparar, ranking, búsqueda, perfil, historial, reputación, logros

`compare.js` · `destacados.js` · `estilo.js` · `historial.js` · `logros.js` · `participaciones.js` · `perfil.js` · `radarFifa.js` · `ranking.js` · `replica.js` · `reputacion.js` · `search.js` · `stats.js`

### `src/js/core/competicion/` — Ligas, torneos, duelos y partidos: formatos, tablas, en vivo, salas, conexión, hosts, retos, premios

`campoVivo.js` · `central.js` · `centroPartido.js` · `conexion.js` · `crearLiga.js` · `diversion.js` · `enganche.js` · `espectadores.js` · `formatos.js` · `golesPartido.js` · `hostCatalogo.js` · `hostExtras.js` · `hostsCatalogo.js` · `ligaStats.js` · `ligaVivo.js` · `live.js` · `liveFiltro.js` · `misPartidos.js` · `partidosGlobal.js` · `premios.js` · `proximoPartido.js` · `pulso.js` · `rankingComunidad.js` · `resultado.js` · `retos.js` · `salas.js` · `schedule.js` · `tabla.js` · `tarjetaResultado.js` · `teams.js` · `temporada.js` · `torneos.js`

### `src/js/core/comunidad/` — Chat, clanes, muro, historias, clips, red social, encuestas, eventos, moderación, IA de ayuda

`ayudaIA.js` · `bandejaIA.js` · `chat.js` · `chatFlotante.js` · `chatGeneral.js` · `clan.js` · `clips.js` · `compartir.js` · `encuesta.js` · `evento.js` · `feed.js` · `feedSocial.js` · `historias.js` · `moderacion.js` · `muro.js` · `red.js` · `social.js` · `sonidosChat.js` · `videoSubida.js`

### `src/js/core/portada/` — Portada y noticias: diario, crónicas, plantillas, titulares, ticker, última hora

`afiche.js` · `cronica.js` · `departamentos.js` · `diario.js` · `inicio.js` · `noticias.js` · `noticiasLienzo.js` · `noticiaSocial.js` · `noticiasPlantillas.js` · `pase.js` · `portadas.js` · `tickerVivo.js` · `titulares.js` · `ultimaHora.js` · `ventanas.js`

### `src/js/core/economia/` — Economía: ascuas/gemas, recompensas, Phoenix Pass

`economia.js` · `ganarAscuas.js` · `phoenix-pass.js`

### `src/js/core/pes/` — Conexión con el juego (Phoenix Link/Sync): cambios oficiales, fichas, Liga Máster, clubes y plantillas PES, buzón, vestuario

`buzon.js` · `cambiosOficiales.js` · `clubesPes.js` · `fichaJuego.js` · `fichasCampos.js` · `ligaMasterPc.js` · `linkVersiones.js` · `sync.js` · `traspasosReales.js` · `vestuario.js`


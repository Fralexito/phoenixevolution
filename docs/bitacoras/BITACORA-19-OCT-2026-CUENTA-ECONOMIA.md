# Bitácora e informe · Cuenta ECONOMÍA (chat «D:\Frank\IA\CLAUDE») · 19 de octubre de 2026

Para la **otra cuenta** (o cualquier IA o persona) que continúe. Escrito para entender **todo lo que se hizo el 19-oct** sin haber visto el chat.
Complementa `REGISTRO.md` (una línea por cambio, la más nueva al final) y la guía de uso `docs/guias/GUIA-NOVEDADES-19-OCT-2026.md`.
Bitácoras anteriores: `docs/bitacoras/BITACORA-16-OCT-2026-CUENTA-ECONOMIA.md`, `REVISION-GENERAL-18-OCT.md`.

> **Norma de Fralex:** todo se anota en GitHub. **Drive sigue pendiente** (no hay acceso): cuando vuelva, copiar esta bitácora y la guía a la carpeta de Drive «Phoenix Link — Guías y logros» (ver §9).

---

## 0. Cómo retomar en 5 minutos

1. Repo de la web: `C:\dev\pes-liga-automatica`, rama **`borrador`** (se publica sola en la vista previa).
2. Vista previa: **https://fralexito.github.io/phoenixevolution/fase-beta-1-0/** — la cinta de abajo a la izquierda dice la versión, p. ej. «FASE BETA 1.5.0 · 19 oct 14:02».
3. Lee el final de `REGISTRO.md`, este archivo y `docs/guias/GUIA-NOVEDADES-19-OCT-2026.md`.
4. Comprobaciones antes de cada subida (todas deben pasar):
   ```bash
   npm test                 # 639 pruebas, 0 fallos (al cierre del 19-oct)
   npm run build            # 57 páginas
   npm run test:paginas     # abre las 57 páginas en Chrome: 57/57
   C:/Users/WinterOS/.claude/skills/impeccable/scripts/impeccable.cmd detect --json <archivos>   # detector de diseño
   ```
5. **Versión beta:** en CADA subida, sube `VERSION_BETA` en `src/data/versionWeb.js` (cambio normal: último número; algo grande: el del medio). Ver §3.
6. **Migraciones de esta cuenta hoy:** 131, 132, 133, 134, 135 y 135b (todas aplicadas). La siguiente libre es la **136** (mira antes el final de `REGISTRO.md` por si otra cuenta la tomó).
7. Para ver todo con datos y actividad aunque la base esté vacía: añade **`?demo=1`** a cualquier página (ver §4).

---

## 1. Quién es Fralex y cómo trabajar con él (recordatorio)

- **Todo en español**, frases simples, poco texto técnico; **SÍ/NO primero**. Lo pidió tres veces el 19-oct.
- Quiere todo **«dinámico, estético, visual, muy animado, interactivo, fresco, novedoso, premium y profesional»**, pero también **limpio, ordenado, minimalista y entendible** («no entiendo qué es cada cosa» = falla de diseño).
- **No pedirle pruebas dentro del juego** (pausa desde el 15-oct). Probar con el navegador automático y datos simulados.
- **Lo que la IA no pueda ejecutar → SQL listo para pegar** en el SQL Editor de Supabase.
- **Nunca** cambiar ajustes de seguridad por él; borrar cosas irreversibles solo con su permiso.
- **Phoenix Link:** mejorar dentro de su diseño, subir `kVersion` en cada cambio, compilar sin `--force`. Hoy **no se tocó Link** (todo fue web + base de datos).
- Cada cambio: **verificar en celular (390 px) y PC (1440 px)**, anotar en `REGISTRO.md`, commit con rutas explícitas y push a `borrador`.

---

## 2. Resumen del día (orden cronológico)

| Hora (Lima) | Commit | Qué |
|---|---|---|
| 00:11 | `cd7c281` | Noticias sin saltos al cargar + prueba que abre las 57 páginas en Chrome (`npm run test:paginas`, también en GitHub Actions) |
| 00:11 | `f33473d` | **Migración 131**: foto vieja de jugadores a una copia privada (reversible) |
| 00:37 | `0147b31` | Rendimiento: 14 CSS de página fuera de `global.css` (713 → 562 KB comunes) y título de portada visible desde el inicio |
| 00:46 | `c5dccee` | Informe de velocidad con números finales |
| 01:05 | `f8d768a` | **Migración 132**: borrar la copia vieja `backup_20261003` (con permiso de Fralex) |
| 01:24 | `c001a1e` | Social con distribución de foro en tres columnas (estructura tipo Reddit, identidad Phoenix) |
| 01:51 | `ffc962f` | Social: respuestas en el feed, ordenar, nuevas en vivo, a quién seguir, atajos J/K |
| 07:35 | `1f9fb5b` | Menú por importancia: Mi club primero; barra inferior con Mi club al centro |
| 07:46 | `cb20228` | Mi club como ecosistema propio («El Estadio») |
| 07:52 | `865f512` | Inicio por importancia: banda «Tu club» |
| 08:17 | `fb4b37e` | Celular más fluido (sin saltos en Inicio y Mi club) |
| 08:35 | `2c0ffd7` | Mi club: secciones en orden de uso + guía «Cómo funciona» |
| 08:56 | `a32fc76` | Mi club: vista Cancha, «Administrar la liga» en 3 pasos |
| 09:10 | `7d32794` | Mi club sin controles viejos; «Mi partida de PES» explicada |
| 09:34 | `ba1db08` | Red de enlaces del celular ordenada en grupos |
| 09:49 | `7bdc207` | Red de enlaces sin repetir la barra de abajo |
| 10:10 | `53d6d1b` | Configuración al estilo de Meta |
| 10:28 | `6a4a33c` | Configuración premium: 30 ajustes, estilos rápidos |
| 10:48 | `fd0d8be` | Publicar como red social + **migración 133** |
| 11:02 | `63af9c2` | Salas de Phoenix Link: tarjetas vivas y «Entrando a la sala» |
| 11:14 | `eed86ee` | Salas en vivo: marcador real, cronómetro, conectados, ¡GOL! (**migración 134**) |
| 11:23 | `7aaad4e` | Mi perfil vivo: «Así te ven», medidor de perfil |
| 11:28 | `e8aa4d3` | País en lista desplegable con banderas SVG |
| 11:42 | `a3e1f46` | Perfil público dinámico |
| 11:57 | `f395542` | **Modo demostración** (datos simulados con actividad) |
| 12:09 | `028b3a2` | Social: muro minimalista |
| 12:14 | `734b64b` | Modo demostración: historias, chat general, notificaciones |
| 12:23 | `1d70c18` | Chat: pestañas Amigos | General (PC y celular) |
| 12:33 | `4416e25` | Publicar: cada opción con nombre y explicación |
| 12:39 | `c3b7c54` | **Beta 1.0.1**: número de versión en la cinta |
| 12:48 | `560c0af` | **Beta 1.1.0**: regla de versiones |
| 13:10 | `e66a03d` | **Beta 1.2.0**: «Lanzar reto» como asistente por pasos |
| 13:33 | `57a2a40` | **Beta 1.3.0**: portada con «Ahora en Phoenix» |
| 13:40 | `f37e82a` | **Beta 1.3.1**: entrar a una sala desde Android |
| 13:48 | `c1ad81c` | **Beta 1.4.0**: tablas de liga visuales |
| 14:02 | `3cfb4e3` | **Beta 1.5.0**: Social fase 1 (red social completa) |
| 14:17 | `e45a5d8` | **Beta 1.5.1**: esta bitácora y la guía paso a paso |
| 14:40 | (ver REGISTRO) | **Beta 1.6.0**: Social fase 2 (**migraciones 135 y 135b**) |
| 15:15 | (ver REGISTRO) | **Beta 1.7.0**: **Jugadas** (feed vertical de videos, **migración 136**) + la beta abre con la demostración encendida |
| 15:58 | (ver REGISTRO) | **Beta 1.8.0**: web más ligera (cinta, scroll, animaciones, estrellas, iconos), Jugadas como Reels (botón + deslizar), eliminar en Social y Jugadas |
| 16:03 | (ver REGISTRO) | **Beta 1.8.1**: Social más aireado (publicaciones separadas, columna izquierda angosta) |
| 16:26 | (ver REGISTRO) | **Beta 1.8.2**: logo de la página en «Phoenix Social» y logo FL26 de Football Life |
| 16:33 | (ver REGISTRO) | **Beta 1.9.0**: Social con personalidad (saludo, pulso, acentos de fuego, final del feed) y recargar sutil |
| 16:55 | (ver REGISTRO) | **Beta 1.9.1**: logos de los 5 juegos en Social (los más recientes) |
| 17:15 | (ver REGISTRO) | **Beta 1.10.0**: auditoría completa de Social (errores, redundancias, inconsistencias) |
| 17:22 | (ver REGISTRO) | **Beta 1.10.1**: Social menos saturado |
| 17:27 | (ver REGISTRO) | **Beta 1.10.2**: Social como en la 1.10.0, sin saludo ni días de racha |
| 17:36 | (ver REGISTRO) | **Beta 1.10.3**: Mi club, cancha de la plantilla sin líneas encima de los jugadores |
| 17:48 | (ver REGISTRO) | **Beta 1.11.0**: stickers en los comentarios (**migración 137**) |
| 18:05 | (ver REGISTRO) | **Beta 1.12.0**: interruptor Demo/Real y stickers desde las apps de WhatsApp/Telegram (**migración 138**) |
| 18:22 | (ver REGISTRO) | **Beta 1.12.1**: la rueda del mouse baja las columnas de Social (y cualquier zona con scroll propio) |

(Los textos completos de cada cambio, con archivos y pruebas, están en `REGISTRO.md`, líneas del 2026-10-19 «Cuenta ECONOMÍA».)

---

## 3. Reglas NUEVAS para todas las sesiones (importante)

1. **Versión beta en cada subida** — `src/data/versionWeb.js`:
   - cambio normal → `1.5.0` → `1.5.1`;
   - algo grande terminado (sección rehecha o sistema nuevo) → `1.5.3` → `1.6.0`;
   - la cinta «Fase beta» (Layout.astro) muestra la versión y la hora de Lima en que se compiló; la URL `/fase-beta-1-0/` **no** cambia.
   - Historia: 1.0.1 cinta con número · 1.1.0 muro minimalista, demo, chat dual, publicar descriptivo · 1.2.0 Lanzar reto por pasos · 1.3.0 portada «Ahora en Phoenix» · 1.3.1 Android · 1.4.0 tablas de liga · 1.5.0 Social fase 1 · 1.5.1 documentación · 1.6.0 Social fase 2 · 1.7.0 Jugadas y demostración visible en la beta · 1.8.0 rendimiento, Jugadas como Reels y eliminar.
2. **Nada de `html:has(…)` ni `body:has(…)` en CSS** (hacía recalcular toda la página ~15 veces al cargar). Poner una marca en `<html>` desde el JS (`data-ticker-oculto`, `data-duelos-plegado`, `data-reto-asistente`…).
3. **Iconos recortados**: si usas un icono «fa-…» o «ph-…» nuevo, ejecuta `node tools/iconos/recortar-iconos.mjs` y sube `src/styles/iconos/*`. Si el icono de Font Awesome no tiene equivalente fino en `src/data/iconosFinos.js`, **añádelo** (si no, con «Sin íconos web» se oculta o sale como cuadro). Hoy se añadieron: `icons→smiley-wink`, `circle-notch`, `caret-up`, `caret-down`.
4. **CSS por página**: 14 CSS salieron de `global.css`; cada página los importa DESPUÉS de Layout. Si una página nueva usa clases de uno de ellos, impórtalo ahí. CSS nuevos de hoy por página: `perfilPublico.css` (perfil), `retoAsistente.css` (duelos), `ahoraPortada.css` (inicio), `ligaTabla.css` (liga), `publicar.css` y `socialHilo.css` (social), `configuracion.css` (ajustes), `miClubEstadio.css` (manager). Globales nuevos: `salasVivo.css`, `publicacionExtras.css`, `modoDemo.css`.
5. **Columnas de rejilla**: hijos de una rejilla necesitan `min-width: 0` o `grid-template-columns: minmax(0, 1fr)` (hoy dos desbordes en celular se debían a eso: Fichajes y el feed de Social). Ojo también con `col-span-2` en una rejilla de una columna: crea una columna fantasma (pasó en el asistente de reto).
6. **Modo demostración**: lo inventado tiene ids ≥ 900 000 000 (y uuid `00000000-0000-4000-8000-9000…`); cualquier acción sobre ellos se «acepta» sin escribir. Si agregas un sistema nuevo que lee con `supabase.rpc`, puedes simularlo en `src/js/features/demo/simulador.js` (`SIMULADAS`).
7. **Probar sin escribir en la base**: scripts de puppeteer del scratchpad (ver §7) simulan sesión y bloquean escrituras.

---

## 4. Modo demostración (sistema nuevo)

**Para qué:** ver cada sistema funcionando con datos y actividad aunque la base esté vacía (pedido: «por ahora en la página simula datos y actividad para ver cómo funcionaría cada sistema»).

**Cómo se enciende / apaga:**
- Configuración → «Notificaciones y en vivo» → **«Modo demostración»** (interruptor; recarga sola), o
- añadir **`?demo=1`** a la dirección (`?demo=0` para salir), o el botón **«Salir»** de la píldora amarilla de abajo a la izquierda.
- Es **por navegador** (se guarda en `pes-ajustes-v1`, clave `demo`). No toca la base.

**Piezas:**
- `src/js/core/sistema/modoDemo.js` — decide si está activo (`demoActivo()`, `window.__pxDemo`) y `salirDeDemo()`.
- `src/js/core/sistema/supabase.js` — si está activo, envuelve `supabase.rpc` (y `.from('notificaciones')`) y carga `features/demo/simulador.js` con `import()`; apagado no carga nada.
- `src/js/features/demo/simulador.js` — datos que cambian con el tiempo (desde que abriste la pestaña):
  - **salas en vivo** (`salas_en_vivo`, `radar_salas`): 3–4 salas, partido de 90' cada 9 minutos reales, goles, ping de conectados que varía, una sala que aparece y desaparece; entrar reserva puesto sin enlace (no abre Parsec hacia nadie);
  - **última hora** (`ticker_comunidad`);
  - **muro** (`muro_comunidad/siguiendo/destacado`, `muro_extras_de`, `buscar_publicaciones`): publicación nueva cada 75 s con #etiquetas, fondos y «se siente…», reacciones que suben; reaccionar se marca pero no se guarda;
  - **historias** (`historias_recientes`): una persona más cada 2 min;
  - **chat general** (`chat_global_listar/enviar`): mensaje cada 12 s; lo que escribes sale como «Tú» y no se envía;
  - **campana** (tabla `notificaciones`): aviso nuevo cada 90 s; marcar leída/descartar funcionan;
  - **estadísticas/ELO** de perfiles sin datos (`estadisticas_de`, `elo_de`).
- `src/js/features/demo/aviso.js` + `src/styles/modoDemo.css` — la píldora «Modo demostración · Datos simulados con actividad · lo que hagas sobre ellos no se guarda · Salir».

**Límites:** lo real que hagas estando en demo (publicar de verdad, editar tu perfil…) SÍ se guarda. Las salas solo se ven con sesión (igual que con datos reales). Aún no se simulan: tablas de liga, Tienda, mensajes privados.

---

## 5. Detalle por área

### 5.1 Rendimiento (madrugada)
- Lighthouse móvil antes: inicio 35, tienda 20, noticias 11; TBT hasta 5,9 s; CLS hasta 0,53.
- `boot.js`: lo que no hace falta para ver la página arranca y **se descarga después** (`requestIdleCallback` + `import()`): JS común 88 → 46 KB.
- Fuentes de iconos recortadas (`tools/iconos/recortar-iconos.mjs`): ~220 KB menos por visita.
- Fuera los `:has()` sobre html/body: recálculo de estilos al cargar Inicio 13 s → 4,4 s (móvil lento simulado).
- 14 CSS de página fuera de `global.css` (713 → 562 KB), comprobado con 0 diferencias de estilo calculado en 20 páginas.
- Consulta de los 3 mejores jugadores 207 KB → <1 KB (`core/jugadores/columnas.js`, sin la columna `foto`).
- **Migración 131**: la foto vieja guardada como texto (269 KB) → `private.jugadores_foto_respaldo`. **Migración 132**: borrada la copia `backup_20261003` (solo 5 fichas de prueba).
- Nueva prueba `npm run test:paginas` (`tools/humo/abrir-paginas.mjs`): abre las 57 páginas y falla si hay error de JS, archivo que no carga o página en blanco. Va en `.github/workflows/pruebas.yml`.

### 5.2 Sala de fichajes y Centro de control
- Sala de fichajes: campos manuales plegados, logos de liga actuales (`public/ligas/*.png`), DT en grande, grandes de cada liga primero (`ordenarPorPrestigio`).
- Sala también en el Modo Mánager (`features/mercado/salaMercado.js`) **con límites** (solo lectura + los mismos botones de ofertar).
- **/control/** (staff): tarjetas de pendientes por área con semáforo de plazos 24/48/72 h, «Hoy toca», herramientas por rol. `core/sistema/centroControl.js` + pruebas. **Pendiente: probar con sesión de staff real.**

### 5.3 Reestructuración por importancia
- Menú: **Mi club primero** (dorado), Comunidad, Jugar, Competiciones, Jugadores. «Central» → «Inicio»; «Mercado» → «Conectar juego». Barra inferior del celular: Inicio · Social · **MI CLUB** (centro) · Jugar · Yo.
- **Mi club = «El Estadio»** (`/manager/`): luces de estadio, la página se tiñe con el color del escudo (`features/miClub/estadio.js`), barra propia Resumen · Plantilla · Fichajes · Mi partida de PES · Diario (+ Administrar la liga para staff) · «?». Guía «Cómo funciona Mi club» en 3 pasos. Vista **Cancha**. «Explorar el mercado» de 12 en 12. «Vestuario del juego» → **«Mi partida de PES»** con dibujo Tu PES ⇄ Phoenix Sync ⇄ esta pantalla.
- Inicio: banda **«Tu club»** (con club / sin club / visitante) y las 4 ventanas por importancia.
- **Red de enlaces** (menú lateral del celular): grupos que se abren uno a la vez; en celular no repite lo de la barra inferior (`BARRA_INFERIOR` en `data/site.js`).

### 5.4 Configuración (`/ajustes/`)
- Forma de «Configuración y privacidad» de Meta: buscador sin tildes, tarjeta de cuenta, grupos de filas; en celular la sección entra desde la derecha.
- 30 ajustes en 3 grupos (`data/ajustes.js`), estilos rápidos (Phoenix, Torneo, Minimalista, Nocturno, Lectura cómoda), contador de cambios, restablecer por sección, «Guardado».
- Sin parpadeo: el script temprano de Layout escribe todos los `data-aj-*` antes de pintar.
- Nuevo ajuste **«Modo demostración»** (§4).

### 5.5 Social (`/social/`)
- **Estructura**: tres columnas en PC (feeds y juegos · feed · comunidad), una en celular. Reacciones e historias se mantuvieron por decisión de Fralex.
- **Más vida**: respuestas dentro del feed, ordenar, «N publicaciones nuevas», a quién seguir, atajos J/K/R/C/N, volver arriba, «Leer más».
- **Muro minimalista**: una sola barra pegada con cristal (pestañas con pastilla + botón «Ordenar y filtrar» con punto), «Publicar» en una línea, menú «⋯» (guardar, reportar, ocultar, **retar a duelo**), pie en una fila.
- **Publicar** (`features/muro/compositor.js`, **migración 133**: `muro_publicaciones.extra` con fondo, sentimiento y fotos extra; `muro_publicar_completo`, `muro_extras_de`): fondos de color, «cómo te sientes», hasta 4 fotos o 1 video, enlace, encuesta, duelo, juego, emojis, @ y #, anillo de caracteres, borrador, pegar/arrastrar. Después: **cada opción con nombre y frase**, motivo cuando no se puede, resumen «Vas a publicar: …», opción **Historia**.
- **Fase 1 de «red social completa» (1.5.0)**:
  - **#etiquetas** clicables (`textoAHTML` en `core/comunidad/muro.js`, una sola pasada con enlaces y @menciones) → `/social/?tag=X` (usa `buscar_publicaciones`), cabecera con «Quitar».
  - **Tendencias** (`etiquetasDe`): columna derecha en PC, cápsulas en celular.
  - **Doble toque / doble clic** = 🔥 con llamarada y vibración (con «menos movimiento» no hay llamarada, la reacción sí).
  - **Reacciones Phoenix** al mantener pulsado «Reaccionar» o con 😊: 🔥 Fuego · ⚽ Golazo · 🧤 Atajada · 🤝 GG · 🐐 Crack · 😂 Risa (la base acepta cualquier emoji: `CHECK tipo ~ '^[^ -~]{1,16}$'`).
  - **Visor de fotos** a pantalla completa (`features/social/gestos.js`).
  - **Retar a duelo** desde el menú ⋯ → `/duelos/?retar=<id>`.
  - **Tirar hacia abajo** para recargar (celular).
  - Pruebas: `tests/etiquetas.test.mjs` (4).

### 5.5b Social, fase 2 (1.6.0) — migraciones 135 y 135b
- **Base de datos (135, aditiva)**: `muro_publicaciones.compartida_de`; tablas `muro_respuesta_likes` y `muro_vistas` (RLS sin políticas: solo por funciones); funciones `muro_compartir` (mismas reglas que publicar: ≤1000 letras, 10 por hora; compartir algo compartido apunta a la ORIGINAL; avisa al autor con el aviso nuevo `MURO_COMPARTIDA`, que amplía la lista de tipos permitidos), `muro_like_respuesta` / `muro_likes_respuestas`, `muro_registrar_vistas` (1 por persona; las propias no cuentan; sin sesión no cuenta), `muro_social_de` (vistas, veces compartida y la original solo si quien mira puede ver el muro de su autor; si no → `no_disponible`), `muro_reacciones_de` (sin bloqueados), `mi_racha_social` (días seguidos con publicación/respuesta/reacción, hora de Lima).
- **135b**: al probar en la base apareció que compartir SIN comentario chocaba con la regla `muro_publicaciones_contenido_ok` y que borrar la original iba a fallar (la compartida quedaba vacía y sin referencia). Arreglo: columna fija `es_compartida` y la regla acepta «contenido O es compartida».
- **Prueba en la base** (dos usuarios simulados, todo deshecho al final): cadena → original, «me gusta» on/off, vistas 1 por persona, reacciones, racha 1 día, 2 avisos, sin sesión ve lo público, borrar la original deja «no disponible».
- **Web** (`features/social/fase2.js` nuevo, `features/muro/api.js`, `features/muro/pieSocial.js`, `pages/social.js`, `socialHilo.css`): ventana **Compartir** (en tu muro con comentario, o fuera); la **original dentro** de la compartida; pie con **veces compartida** (↻) y **vistas** (👁); el total de reacciones abre **quién reaccionó** por pestañas de emoji; **«me gusta» en respuestas** (❤️); **tarjeta rápida** al tocar cara o nombre (bandera, club con escudo, lema, duelos, Seguir, Retar, Ver perfil); **vistas** que se cuentan al verse 1 s; **racha 🔥 N** en la barra (dice «¡hoy!» si aún no hiciste nada hoy).
- **Modo demo**: todo lo anterior simulado (compartir queda solo en la pestaña).
- Arreglos tras probar: en celular la fila de acciones y la barra se compactan (antes 432 px en 390); iconos nuevos en `iconosFinos.js` (retweet, eye, eye-slash, arrow-up-from-bracket, spinner).

### 5.6 Chat
- Columna de contactos (PC) y hoja «Chats» (celular): pestañas **Amigos | General** (`features/chatFlotante/general.js`): el chat general en pequeño, pide mensajes cada 6 s solo mientras se ve.

### 5.7 Phoenix Link en la web (sin tocar Link)
- **Tarjetas de sala vivas** (`features/salas/tarjetas.js`, `styles/salasVivo.css`): estado con latido, anfitrión VS rival, mandos, señal en 4 barras, entrada en cascada.
- **«Entrando a la sala»** (`features/salas/entrar.js`): Reservando tu puesto → Abriendo Parsec → ¡Dentro!; plan B si Parsec no abre.
- **Migración 134**: `salas.en_partida_desde` + disparador; `private.tarjeta_sala` suma rival.avatar_url, en_partida_desde, marcador (`liga_vivo` ≤ 5 min) y conectados (`muestras_calidad` ≤ 2 min). La tarjeta muestra marcador y minuto, cronómetro, caras de conectados y ¡GOL!.
- **Android (1.3.1)**: ver §6.

### 5.8 Perfil
- «Mi perfil» vivo (`features/perfilVivo.js`): tarjeta «Así te ven» en vivo, medidor «Perfil al N %», club con sugerencias y escudo, «Guardar N cambios».
- País en **lista desplegable con banderas SVG** (`data/banderas.js`, 23 países).
- **Perfil público** (`js/pages/perfil.js`, `styles/perfilPublico.css`): luces de estadio, bandera y escudo, cifras que cuentan, «Duelos» con anillo y barra G/E/P, pestañas deslizantes.

### 5.9 Duelos — «Lanzar reto» por pasos (1.2.0)
- `features/duelos/asistente.js` + `styles/retoAsistente.css`: el formulario de siempre (`form.js` sin cambios) se mueve a una ventana con 4 pasos **Rival · Equipos · Hora · Sala** y un **boleto** final con «Emitir reto».
- Rival en tarjetas con cara, «en línea» y «tiene host»; no deja avanzar sin rival o con hora inválida.
- Todo «Lanzar reto», el radar y `?retar=` abren la ventana.

### 5.10 Inicio — «Ahora en Phoenix» (1.3.0)
- `features/portada/ahora.js` + `styles/ahoraPortada.css`: salas en juego (con sesión), historias de hoy y lo más reaccionado; se oculta si no hay nada (hoy con datos reales está oculta; con `?demo=1` llena).

### 5.11 Liga — tablas visuales (1.4.0)
- `pages/liga.astro` + `styles/ligaTabla.css`: ▲▼ puestos ganados o perdidos desde la fecha anterior, corona del líder, «Últimos 5» como fichas (la más reciente destacada), zonas con brillo, en celular la tabla entra sin deslizar. `tablaViva.js` ya no borra ▲▼ al reordenar.

### 5.12 Jugadas — feed vertical de videos (1.7.0) — migración 136
Pedido de Fralex: «una especie de reels o feed, shorts estilo TikTok, YouTube e Instagram, pero quiero que tenga identidad propia».
- **Base (136_jugadas.sql, aplicada y probada):** usa los clips que ya existían (`muro_clips`, migraciones 025/027/032) y les añade `categoria`. Tablas nuevas `jugadas_reacciones` (1 por persona, cualquier emoji) y `jugadas_vistas` (1 por persona, las propias no cuentan), con RLS sin políticas (solo por funciones). Funciones: `jugadas_feed(categoria, orden, antes, desplazamiento, limite)` → `{items, hay_mas}` (orden «recientes» por id o «top» = más reacciones de los últimos 7 días), `jugada_publicar` (mismas reglas que `clip_publicar`: ≤ 80 letras, 10 por hora, video propio o enlace de YouTube/TikTok/Kick/Twitch), `jugada_reaccionar` (mismo emoji otra vez = quitar; máx. 60 por minuto), `jugadas_registrar_vista`. Respeta la privacidad del muro y los bloqueos. Cómo deshacer: en la cabecera del archivo.
- **Página `/jugadas/`** (`pages/jugadas.astro`, `js/pages/jugadas.js`, `styles/jugadas.css`):
  - pantalla completa, una jugada por pantalla; se pasa deslizando (o ↑ ↓, j/k, rueda, flechas en PC). En PC es un marco vertical 9:16 con la portada desenfocada de fondo;
  - **solo se reproduce el video que se ve**: los videos propios se pausan al salir; YouTube carga el reproductor SOLO en la jugada activa (las demás muestran la miniatura) y llena el marco recortando los lados como un short. TikTok/Kick/Twitch muestran una tarjeta «Ver en…» (no permiten incrustar en vertical);
  - **identidad Phoenix**: categoría futbolera con su color (⚽ Golazo · 🧤 Atajada · ✨ Skill · 🔁 Remontada · 😂 Fail), **doble toque = 🔥 con llamarada**, **mantener pulsado el fuego = reacciones Phoenix** (Fuego, Golazo, Atajada, GG, Crack, Risa), el **Calorímetro** (termómetro de fuego: cuánto fuego tiene esa jugada frente a las demás del feed), **Retar** al autor (abre el asistente de Duelos con él elegido), tocar el autor abre su tarjeta rápida (fase 2);
  - pestañas: Para ti · Top semana · Golazos · Atajadas · Skills · Remontadas · Fails (quedan en la dirección: `?ver=fail`);
  - «Subir» abre una hoja en 3 pasos: tipo de jugada → video (archivo de hasta 15 s o enlace) → título y juego;
  - carga infinita (10 en 10) y la vista se cuenta a los 2 s de verla. En Jugadas se esconden la barra de abajo y la cinta «en vivo» (inmersivo; se sale con ←).
- **Accesos:** círculo «Jugadas» con anillo de fuego, primero en la fila de historias de Social; «Tu espacio» (Social); barra lateral → Comunidad; menú de cuenta (grupo Social); la pestaña «Social» de la barra de abajo se ilumina en Jugadas.
- **Demostración:** `demo/simulador.js` trae 24 jugadas inventadas (los 3 videos de `data/demo.js`) cuyas reacciones y vistas suben con el tiempo; reaccionar y publicar en demo no escriben nada, y el video que elijas en demo no se sube (se ve solo en tu navegador).

### 5.13 La demostración se ve sola en la beta (1.7.0)
Pedido de Fralex: «necesito que en la página misma se me muestre la simulación de todas las actividades, para ver cómo se vería».
- `core/sistema/modoDemo.js`: en la **vista previa** (`PUBLIC_PREVIEW`) la demostración viene **encendida la primera vez** que alguien abre la beta (marca `pes-demo-beta-v1` en el navegador). Si la apagas («Salir» o Configuración) queda apagada. `?demo=1` / `?demo=0` siguen funcionando. **La web oficial no cambia.**

### 5.14 Rendimiento: «siento la web más pesada» (1.8.0)
**Cómo se midió** (para repetirlo): navegador de prueba con la página QUIETA 4 s, métricas de Chrome (CPU, recálculos de estilo, layouts) y el perfilador; scripts en el scratchpad (`medir.mjs`, `aislar*.mjs`, `bucles.mjs`, `perfilar.mjs`). Ojo: `?demo=1` y `?demo=0` cambian mucho el resultado.
| Página (celular, demo encendida) | Antes | Después |
|---|---|---|
| Duelos | 2574 ms | 22 ms |
| Social | 1094 ms | 18 ms |
| Liga | ~3300 ms | 69 ms |
| Perfil | ~960 ms | 132 ms |
| Inicio | ~3350 ms | ~2400 ms (casi todo dibujo de capas que en un aparato real hace la tarjeta gráfica; el trabajo de la página bajó a ~25 ms) |

**Qué fallaba y qué se hizo:**
1. **La cinta «Última hora»** (`features/ticker.js`): JavaScript movía CADA noticia 60 veces por segundo en todas las páginas. Ahora las noticias van quietas dentro de una «pista» que avanza con Web Animations (la mueve la tarjeta gráfica); JavaScript solo revisa 4 veces por segundo si cabe otra noticia. Pausa, arrastre y botones ‹ › siguen igual.
2. **Scroll suave de PC** (`features/scrollSuave.js`, Lenis): su bucle corría siempre y frenaba en 1,05 s (sensación «pesada»). Ahora solo corre mientras te desplazas y frena en 0,7 s.
3. **Animaciones infinitas caras**: 10 latidos/brillos animaban `box-shadow`, `text-shadow` o `filter` (se repintan en cada cuadro). Pasaron a `transform`/`opacity` (aro que crece en un `::after`, resplandor que se enciende con opacidad). El peor era el **punto del aviso «Modo demostración»**, presente en todas las páginas con la demo encendida. Lista: `pxd-late`, `ah-late`, `mcx-late`, `sv-llama`, `sv-vs`, `sxr-latido`, `pcw-aura`, `brilla`, `nt-late` (neón de noticias, ahora fijo), `cmp-glow` (fijo). Quedan 7 «caras» pero solo corren un momento (esqueletos de carga), al pasar el mouse o en pantallas poco usadas.
4. **Estrellas de la portada** (`features/estrellas.js`): medían la portada en cada cuadro (forzaba recalcular la página) y pedían cuadros en cada refresco aunque dibujaran 30. Ahora usan la posición guardada, esperan con un temporizador, y en celular van a ~24 fps y resolución 1.
5. **Iconos**: `fontawesome.min.css` traía ~2.000 nombres en CADA página. `tools/iconos/recortar-iconos.mjs` genera `styles/iconos/fontawesome.recortado.css` con los 281 usados (el CSS global bajó de 606 a 566 KB). **Si un icono nuevo sale en blanco: ejecutar ese script.**
- Pendiente para otra ronda: el CSS global sigue siendo grande (≈566 KB, 110 KB comprimido) porque carga los estilos de todas las secciones; separarlo por página es un trabajo más largo.

### 5.15 Jugadas como los Reels (1.8.0)
Pedido: «no pongas ahí las jugadas, quería algo como en Instagram, que dándole click en el botón o jalando hacia un lado cargue la parte de reels».
- Fuera el círculo de Jugadas de las historias y el enlace de «Tu espacio».
- **Botón «Jugadas»** (naranja, con claqueta) en la barra pegada del muro de Social; en celular solo el icono.
- **Deslizar con el dedo**: hacia la izquierda en Social abre Jugadas; hacia la derecha en Jugadas vuelve a Social. Mientras arrastras asoma una pastilla con el destino (se pone naranja cuando ya basta); un tirón rápido también vale. No se activa sobre cosas que se deslizan en horizontal (historias, pestañas, carruseles), campos de texto ni diálogos, ni en los bordes de la pantalla (gestos del sistema).
- **Transición**: la página sale hacia el lado del gesto y la nueva entra por el otro (`styles/deslizar.css`; `pagereveal` + tipos de transición de vista). Jugadas se precarga al abrir Social.
- Código: `features/social/gestos.js` → `montarDeslizarA(zona, { lado, url, etiqueta, icono })` y `marcarDesliza(lado)`.

### 5.16 Eliminar publicaciones y comentarios (1.8.0)
Pedido: «verifica la opción de eliminar post o comentarios».
- **Lo que se encontró**: la base SÍ lo permitía (`muro_borrar`: el autor o el admin; `muro_borrar_respuesta`: el autor de la respuesta, el dueño de la publicación o el admin; `muro_respuestas_de` ya devolvía `puedo_borrar`), y en **tu perfil** ya se podía. Pero en **Social** no había ningún botón para hacerlo.
- **Ahora**: «Eliminar» (rojo, con papelera) en el menú ⋯ de tus publicaciones (el admin lo ve en todas) y «Eliminar» bajo cada respuesta que puedes borrar. Siempre pregunta antes. En **Jugadas**, «Eliminar» en el riel de tus propios videos (`clip_borrar`, que ya existía).

### 5.17 Social más aireado (1.8.1)
- Pedido: «cada publicación un poquito más separada» y «esa barra abarca demasiado espacio, ponla más al lado izquierdo».
- `styles/socialHilo.css`: 14 px entre publicaciones (antes 1 px), línea divisoria a la mitad, más relleno; en vista Compacta 6 px. Columna izquierda de 15rem a 12,5rem con botones más compactos; en PC grande queda pegada al borde izquierdo y el muro se centra en su espacio.
- Visto de paso, sin tocar: con sesión iniciada, a 1024 px la cabecera se desborda ~136 px a la derecha (nombre + menú). Pendiente.

### 5.18 Logos en Social (1.8.2)
- Tarjeta «Phoenix Social»: el logo de la página (`public/logo.webp`) en vez de la llama.
- Juegos: `data/muroEstilo.js` → `LOGOS_JUEGO` (archivo por juego en `public/juegos/`); si un archivo falta o no carga, se ve la letra de siempre. Hoy solo **Football Life** (`sp-football-life.png`, la placa «FL26» recortada de la imagen que dio Fralex).
- **Hecho en 1.9.1** (Fralex: «sí, descárgalos, pero los más recientes»): de Wikimedia Commons (dominio público), recortados a 64 px: PES 2021 Season Update (`pes2021.png`), FIFA 23 —el último FIFA— (`fifa23.png`), FC 26 (`ea-sports-fc-26.png`) y eFootball 2026 (`efootball-2026.png`). Para cambiar uno: reemplazar el archivo en `public/juegos/` o la ruta en `LOGOS_JUEGO`.

### 5.19 Social con personalidad + recargar (1.9.0)
- Pedido: «un poco más de personalidad» y «un botón de recargar sutil… y también para subir hasta arriba rápidamente».
- **Saludo** arriba del muro según la hora, con tu nombre (naranja), una frase Phoenix del día (rotan 7) y el pulso «N publicaciones hoy · M jugadores activos».
- **Acentos de fuego** (naranja→rosa, como Jugadas y la racha) en la pestaña activa y en lo elegido de la columna izquierda.
- **Final del feed**: logo de Phoenix, «Estás al día 🔥», botones Publicar algo y Recargar.
- **Recargar**: ↻ discreto en la barra pegada; el botón flotante (aparece al bajar 500 px) sube y recarga; el del final también. El icono gira mientras carga y se pone verde al terminar.

### 5.20 Auditoría completa de Social (1.10.0)
Pedido: «verifica función por función y apartado por apartado y corrige todo, con redundancias y todo». Se hizo en dos frentes: un agente leyó el código (social.astro, social.js, socialHilo.css, tarjeta, pie, fase 2, gestos) y yo recorrí cada control en el navegador (390 y 1440, demo y real).
- **Errores corregidos (12)**: filtros que se cerraban solos; una carga vieja apagaba la nueva; la #etiqueta bloqueaba pestañas y juegos; aviso de nuevas con etiqueta; punto de filtros; paleta que quedaba abierta; recargar sin limpiar hilos; atajos con ventanas abiertas; tecla N; acción del feed vacío según vista/sesión; plurales; accesibilidad (aria-busy, botones en vez de href="#", aria-current único).
- **Demostración**: publicaciones de varios juegos (el filtro ya hace algo), quitar reacción, responder/borrar respuesta, seguir a inventados sin error, sin «Retar» a inventados.
- **Redundancias quitadas**: cifras y botón «Crear publicación» de la tarjeta Phoenix Social, «Juegos con más movimiento», «Más reacciones» en Ordenar, «Recargar» del final; una sola función de recarga para ↻, flotante, aviso de nuevas y tirar hacia abajo; «Tu espacio» reducido (Mi muro, Guardados, Buscar jugadores) y solo con sesión.
- **Unificado**: color de «elegido» = fuego (`--sxr-on`), azul solo para enlaces/foco; textos («Todos los juegos», «Crear publicación»); alturas de la barra (2,5rem PC, 2,25rem celular); radios 99px; columnas pegadas a la misma altura; en celular la racha va en el saludo.
- **CSS**: reglas duplicadas o pisadas fusionadas y muertas borradas; copia de antes en el scratchpad de la sesión.

### 5.21 Social menos saturado (1.10.1)
Pedido: «la estoy sintiendo saturada… solo mejora un poco eso». Ninguna función fuera; menos cosas compitiendo: saludo en dos líneas (pulso y racha como texto), racha fuera de la barra, «Jugadas» discreto, íconos del compositor en gris, logos atenuados, sin fila de Tendencias en celular, tarjeta Phoenix sin párrafo, 3 en «Lo más reaccionado», atajos en una línea al pie.

### 5.22 Social como estaba, sin saludo ni días (1.10.2)
Fralex prefirió el aspecto de la 1.10.0: se deshizo la 1.10.1 y se quitaron el saludo con el nombre y los días de racha. Queda arriba la frase del día y el pulso de la comunidad.

### 5.23 Mi club: la cancha de la plantilla (1.10.3)
Las marcas del campo (línea del medio, círculo central, áreas) iban fijas y tapaban jugadores y títulos. Ahora la línea del medio separa Mediocampo y Defensas con un punto central, y las áreas son bajitas. El foco de la ficha es un aro dorado en la cara (antes un recuadro cuadrado). Archivo: `styles/miClubEstadio.css`.

### 5.24 Stickers en los comentarios (1.11.0) — migración 137
Pedido: «haz todos los comentarios que tengan stickers, e incluso pueda subir stickers de WhatsApp y TikTok».
- **Base (137_stickers.sql, aplicada y probada)**: bucket «stickers» (1 MB; .webp de WhatsApp —también animados—, GIF/PNG de TikTok); columna `muro_respuestas.sticker`; responder solo con sticker; «Mis stickers» (máx. 60, se pueden guardar los de otros).
- **Pack Phoenix** (`data/stickers.js`): 12 stickers dibujados en la web (¡GOLAZO!, ¡QUÉ ATAJADA!, GG, ¿REVANCHA?, CRACK, ¡VAR!, ¡ROBADO!, ¡ERA PENAL!, ¡LAG!, EN LLAMAS, TE FALTA CALLE, JAJAJA). Añadir uno = una línea en ese archivo.
- **Cómo se usa**: en la caja «Escribe una respuesta…» (Social y perfiles) está el botón de stickers → pestañas Phoenix / Mis stickers → tocar uno lo envía al instante. «Subir sticker» acepta el archivo del sticker (en WhatsApp Web: clic derecho sobre el sticker → Guardar imagen; en el celular, compartirlo o guardarlo como archivo) o pegarlo con Ctrl+V. Sobre un sticker ajeno aparece ＋ para guardarlo.
- Los animados se suben tal cual (sin re-codificar) para que sigan animados.

### 5.25 Interruptor Demo/Real y stickers desde otras apps (1.12.0) — migración 138
- **Demo/Real**: en la beta la píldora de abajo a la izquierda está siempre: «Modo demostración · Ver datos reales» o «Datos reales · Ver demo». La elección se recuerda en el navegador. En la web oficial solo aparece si la demo está encendida.
- **Stickers desde las apps de stickers (Android)**: con Phoenix instalada como app, sale en «Compartir» de Sticker.ly, Sticker Maker, etc. (`share_target` del manifiesto + `sw.js`) y lo compartido llega a **/stickers-recibir/**, que lo guarda en «Mis stickers».
- **Paquetes .wastickers/.zip**: se abren en el navegador (`core/sistema/zip.js`, sin librerías) y se suben todos sus stickers.
- **Telegram**: .webp (estáticos) y .webm (video; migración 138). Los .tgs (animados Lottie) todavía no.
- **Límites**: iPhone no deja a las webs recibir lo compartido (allí: guardar en Archivos y subir). Máx. 1 MB por sticker, 100 archivos y 60 en «Mis stickers».

---

## 6. Parsec en Android (pregunta de Fralex)

- **Sí se puede unir desde Android**: la app oficial de Parsec para Android se conecta como invitado (no puede hostear).
- **Phoenix Link lo detecta igual que a cualquier invitado**: los invitados llegan por el SDK de Parsec sin importar el aparato; salen en «conectados» con su ping y el anfitrión le da el mando.
- **Condición**: un **mando** (Bluetooth o USB). Parsec llama «experimental» a su app de Android y dice que funciona mejor con mando; no documenta controles táctiles en pantalla.
- **Sin confirmar**: si la app de Android abre directamente el enlace `parsec://` de la web. Por eso, en Android, «Entrando a la sala» (1.3.1): avisa del mando, pone primero la **invitación web** y «Descargar» lleva a Google Play (`tv.parsec.client`).
- Fuentes: <https://support.parsec.app/hc/en-us/articles/32381582866452-Install-Parsec-App-on-Android> · <https://parsec.app/blog/link-sharing-for-gaming-over-the-internet-with-friends-e97769822373>
- **Prueba definitiva**: con un celular Android real (cuando Fralex quiera; no es urgente ni se le pide).

---

## 7. Cómo se probó (para repetirlo)

- Scripts de puppeteer en el scratchpad de la sesión (`C:\Temp\claude\D--Frank-IA-CLAUDE\7b44792d-…\scratchpad\perfil\`), con Edge sin ventana:
  - el encabezado de `miClubInteractivo.mjs` (primeras 46 líneas) sirve la carpeta `dist/`, **simula una sesión** (usuario de prueba con rol admin), rehace las lecturas a Supabase con la clave pública y **bloquea toda escritura**;
  - uso: `node script.mjs C:/dev/pes-liga-automatica/dist 390 844 carpeta/prefijo` (celular) y `… 1440 900 …` (PC);
  - con `?demo=1` se prueba con actividad simulada; con `p.emulateMediaFeatures([{name:'prefers-reduced-motion', value:'no-preference'}])` se ven las animaciones (el navegador de pruebas trae «menos movimiento»).
- Cada cambio se miró en capturas de celular y PC, se midió el ancho (sin desborde horizontal) y se revisaron errores de consola.

---

## 8. Pendientes y decisiones abiertas

1. ~~Social fase 2~~ **hecha (1.6.0)**. Ideas para una fase 3: avisos de «me gusta» en respuestas, encuestas y duelos dentro de compartidas, «Para ti» (orden por interés), menciones con autocompletar en respuestas.
2. **Modo demo**: simular tablas de liga, Tienda y mensajes privados.
3. **Quitar controles «arcaicos»** del resto del sitio (listas largas, barras de desplazamiento, selectores viejos) — ya hecho en Mi club y Social.
4. **Velocidad en celular**: volver a medir con Lighthouse tras las animaciones nuevas.
5. **Centro de control**: probar con sesión de staff real.
6. **Seguridad (lo hace Fralex)**: activar «Leaked password protection» en Supabase.
7. Frase de una ficha de usuario que sale en la portada (dato del usuario; no se tocó).
8. Fralex mejorará Inicio más adelante («me encanta mucho como está… lo mejoraré a futuro»).

---

## 9. Para copiar a Drive cuando vuelva el acceso

- Esta bitácora (`docs/bitacoras/BITACORA-19-OCT-2026-CUENTA-ECONOMIA.md`).
- La guía de uso (`docs/guias/GUIA-NOVEDADES-19-OCT-2026.md`).
- Carpeta de destino: «Phoenix Link — Guías y logros».

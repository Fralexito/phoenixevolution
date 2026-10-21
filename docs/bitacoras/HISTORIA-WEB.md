# Web Phoenix Evolution · Historia y bitácora completa (4 al 21-oct-2026)

Todo lo que pasó en la web, en orden:
- el historial de rondas (MAPA-HISTORIAL);
- las bitácoras de cada cuenta del 16, 19 y 21-oct, con cómo se probó, los errores y los pendientes;
- las revisiones generales del 18 y del 21-oct;
- el informe de seguridad del 21-oct.

**Para retomar hoy:** lee primero `docs/guias/GUIA-WEB.md` (parte «Base para continuar») y el final de `REGISTRO.md`. Este documento es la historia completa: sirve para entender por qué algo es como es y qué errores ya se cometieron.

> **Cómo está hecho este documento:** junta, **completos y sin recortar**, 12 documentos que antes estaban sueltos (reorganización del 21-oct-2026, por pedido de Fralex: «cada documento por tema y que tenga absolutamente completo»). Cada parte dice de qué archivo viene. Los originales siguen intactos en la carpeta `_archivo/` y en el historial de git. **Desde ahora, lo nuevo de este tema se AÑADE aquí** como una parte más, con: qué se logró, paso a paso para replicarlo, errores e intentos fallidos, cosas a tener en cuenta, y cómo comprobar y revertir.

## Índice

- [Parte 1 · MAPA · historial de rondas antiguas](#parte-1-mapa-historial-de-rondas-antiguas) — origen `docs/bitacoras/MAPA-HISTORIAL.md` (01e6efc 2026-10-18)
- [Parte 2 · Bitácora e informe · Cuenta ECONOMÍA (chat «D:\Frank\IA\CLAUDE») · 14 al 16 de octubre de 2026](#parte-2-bitacora-e-informe-cuenta-economia-chat-dfrankiaclaude-14-al-16-de-octubre-de-2026) — origen `docs/bitacoras/BITACORA-16-OCT-2026-CUENTA-ECONOMIA.md` (801bae3 2026-10-18)
- [Parte 3 · Bitácora e informe · Cuenta Opus · 13 al 16 de octubre de 2026](#parte-3-bitacora-e-informe-cuenta-opus-13-al-16-de-octubre-de-2026) — origen `docs/bitacoras/BITACORA-16-OCT-2026-CUENTA-OPUS.md` (01e6efc 2026-10-18)
- [Parte 4 · Bitácora del 16-oct-2026 · cuenta WEB (Sonnet) — para que la otra cuenta retome](#parte-4-bitacora-del-16-oct-2026-cuenta-web-sonnet-para-que-la-otra-cuenta-retome) — origen `docs/bitacoras/BITACORA-16-OCT-2026-CUENTA-WEB.md` (801bae3 2026-10-18)
- [Parte 5 · Informe del 16-oct-2026: React, herramientas, radar FIFA y orden visual](#parte-5-informe-del-16-oct-2026-react-herramientas-radar-fifa-y-orden-visual) — origen `docs/bitacoras/INFORME-16-OCT-2026-REACT-HERRAMIENTAS-Y-ORDEN-VISUAL.md` (801bae3 2026-10-18)
- [Parte 6 · Traspaso · Noticias como diario (16-oct-2026, cuenta Opus)](#parte-6-traspaso-noticias-como-diario-16-oct-2026-cuenta-opus) — origen `docs/bitacoras/TRASPASO-NOTICIAS-DIARIO-16-OCT-2026.md` (801bae3 2026-10-18)
- [Parte 7 · Revisión general del proyecto · 18 oct 2026 (cuenta ECONOMÍA, 2.ª cuenta)](#parte-7-revision-general-del-proyecto-18-oct-2026-cuenta-economia-2-cuenta) — origen `docs/bitacoras/REVISION-GENERAL-18-OCT.md` (c5dccee 2026-10-19)
- [Parte 8 · Bitácora e informe · Cuenta ECONOMÍA (chat «D:\Frank\IA\CLAUDE») · 19 de octubre de 2026](#parte-8-bitacora-e-informe-cuenta-economia-chat-dfrankiaclaude-19-de-octubre-de-2026) — origen `docs/bitacoras/BITACORA-19-OCT-2026-CUENTA-ECONOMIA.md` (abc31fa 2026-10-19)
- [Parte 9 · Bitácora e informe · Hilo «Decisiones pendientes de la web» · 21 de octubre de 2026](#parte-9-bitacora-e-informe-hilo-decisiones-pendientes-de-la-web-21-de-octubre-de-2026) — origen `docs/bitacoras/BITACORA-21-OCT-2026-HILO-DECISIONES-WEB.md` (a467545 2026-10-21)
- [Parte 10 · Bitácora e informe · Hilo «Revisión completa» (proyecto Phoenix Evolution Web & APP) · 21 de octubre de 2026](#parte-10-bitacora-e-informe-hilo-revision-completa-proyecto-phoenix-evolution-web-app-21-de-octubre-de-2026) — origen `docs/bitacoras/BITACORA-21-OCT-2026-CUENTA-GENERAL.md` (a75cf94 2026-10-21)
- [Parte 11 · Informe de revisión completa — Phoenix Evolution (21-oct-2026)](#parte-11-informe-de-revision-completa-phoenix-evolution-21-oct-2026) — origen `docs/bitacoras/INFORME-REVISION-GENERAL-21-OCT-2026.md` (b04701e 2026-10-21)
- [Parte 12 · Informe de seguridad y de cambios sin commit — 21-oct-2026](#parte-12-informe-de-seguridad-y-de-cambios-sin-commit-21-oct-2026) — origen `docs/bitacoras/INFORME-SEGURIDAD-21-OCT-2026.md` (d6b926a 2026-10-21)

---

## Parte 1 · MAPA · historial de rondas antiguas

> Origen: `docs/bitacoras/MAPA-HISTORIAL.md` · último cambio 01e6efc 2026-10-18 · 191307 bytes. Copia íntegra.

Archivo (ronda 295). Aquí está lo que antes vivía en `MAPA.md`: los cambios iniciales y las rondas 6 a 250. **No se borró nada**, solo se movió para que `MAPA.md` sea corto y fácil de leer.
Lo reciente (ronda 251 en adelante) y el resumen «RETOMAR» siguen en `MAPA.md`.

### Cambios de la ronda "borrador" (cabecera, ticker, estado)
- **Estado unificado en Duelos**: un solo selector `Inactivo · Activo · Radar` (`#seg-estado`). Cada nivel incluye al anterior:
  Inactivo = `perfiles.acepta_retos_azar=false` · Activo = `true` · Radar = Activo + Presence (solo en la sesión).
  Código: `src/js/pages/duelos.js` (`nivelActual`, `setNivel`, `applyRadar`, `paintEstado`).
- **Ticker "Última hora"**: se esconde al bajar y vuelve al subir. Lógica en `src/js/features/ticker.js`; el CSS solo alterna `data-oculto` (`layout.css`).
- **Cabecera**: el menú va pegado a la derecha (`ml-auto`), así que el logo expandido (solo ≥1360px con mouse) no lo mueve.
- **Redes**: `SOCIALS` en `src/data/site.js` (Discord y TikTok con enlace; Kick y YouTube pendientes). Íconos con trazo SVG propio en `SocialIcon.astro`.
- **Registro**: el campo se llama "Nombre de usuario / apodo". La clave interna sigue siendo `gamertag` porque así la lee el trigger `handle_new_user`.

### Ronda "identidad y Duelos compacto"
- **Identidad (perfiles)**: `username` = @ único elegido por la persona (verificación en vivo: `features/handleCheck.js`);
  `nombre_display` = apodo visible. El registro envía `usuario` y `apodo`; el trigger `handle_new_user` los guarda
  (migración `005_perfil_identidad.sql`, ya aplicada). Nombres reservados (admin, staff…) bloqueados en BD y en el cliente.
- **Avatares**: `core/avatar.js` es el ÚNICO lugar que dibuja un avatar. `avatar_url` puede ser foto https, `preset:<id>` (12 avatares
  propios, se añaden con una línea en `PRESETS`) o vacío (inicial). Al iniciar sesión, si el perfil no tiene foto se copia la de Discord/Google
  (`core/session.js → syncProviderAvatar`).
- **Controles**: `features/formControls.js` (interruptor y selector segmentado) para no repetir HTML. Perfil → pestaña "Sistema Host" los usa.
- **Duelos en 2 columnas**: formulario a la izquierda, "Mis partidos / Retos en el radar" a la derecha con pestañas. En móvil se alterna
  "Lanzar reto" / "Partidos" (`#seg-vista`). `duelos/#mis-partidos` abre directo esa pestaña.

### Ticker "Última hora" (velocidad y ancho)
- Velocidad en píxeles por segundo, no en segundos fijos: `VEL_PC` (110) y `VEL_MOVIL` (55) en `src/js/features/ticker.js`. Para cambiarla, edita esas dos constantes.
- El texto va repetido (mínimo 2 copias; el JS añade más si la pantalla es muy ancha) para que el bucle no deje huecos.
- La etiqueta "ÚLTIMA HORA" es más angosta en celular (`Ticker.astro`).

### Ronda 6 — Identidad con cooldown, bienvenida, Duelos sin pestañas, menú
- **@usuario**: solo cambia 1 vez cada 14 días. Regla real en la BD (`supabase/migrations/006_*`, trigger `perfiles_antes_de_actualizar`); la web solo avisa (`cooldownInfo` en `core/rules.js`). Mientras `perfil_completo = false` el @ se elige libre.
- **Bienvenida** (`features/welcome.js`): se muestra a quien tenga `perfil_completo = false` (Discord/Google y correo sin formulario). «Lo haré después» la oculta durante esa sesión del navegador. Comparte selector de foto con «Mi perfil» (`features/avatarPicker.js`). Países en `src/data/paises.js`.
- **Duelos**: sin pestañas. `#col-mis` (Mis partidos) y `#col-radar` (Retos en el radar) siempre visibles: lado a lado en ≥1280px, uno bajo otro en pantallas medianas, y en móvil dentro de la vista «Partidos».
- **Menú de 3 rayas**: en PC (≥1024px) solo existe con sesión (`html[data-sesion]`, regla en `components.css`) y solo muestra «Mi cuenta». En móvil queda el menú completo.
- **Login en localhost**: Supabase solo vuelve a URLs permitidas. Dashboard → Authentication → URL Configuration → Redirect URLs: añadir `http://localhost:4321/**` y `https://fralexito.github.io/phoenixevolution/**`. Si falta la de localhost, te manda al Site URL (la web publicada = `main`).

### Ronda 7 — Host nuevo + vista previa en internet
- **Sistema Host**: juego `PES 2021 | SP Football Life` (migración 007). Parche solo con PES 2021; con SP aparece «Versión (opcional)» 25/26/27/Otra (`host_sp_version`); velocidad en 5 grupos −50/100/300/500/+500 (`SPEED_BUCKETS`, valores antiguos se agrupan con `speedBucket`); nota libre `host_notas` (≤300).
- **Vista previa**: `.github/workflows/deploy.yml` publica `main` en `/phoenixevolution/` y `borrador` en `/phoenixevolution/borrador/` (con `noindex`). Requiere una vez: Settings → Environments → github-pages → Deployment branches → añadir `borrador`. Y en Supabase → Redirect URLs: `https://fralexito.github.io/phoenixevolution/borrador/**`.

### Ronda 8 — Ficha de jugador interactiva + Duelos móvil
- **Formulario de jugador** (`features/playerForm.js`): foto a la derecha del nombre, posición en botones, cada estadística con − / + (mantener pulsado repite), deslizador y número en color. **OVR** automático (promedio, `core/stats.js`); si lo mueves queda «Manual» hasta «Volver a automático». **Leyenda dinámica** fija arriba con la explicación breve de cada stat (`src/data/stats.js`, único lugar para editar los textos).
- **Duelos en móvil**: botones «Lanzar reto» y «Mis partidos» abren/cierran su sección (una a la vez, ninguna al entrar); «Retos en el radar» siempre visible debajo. PC sin cambios.

### Ronda 9 — Ficha en 2 columnas, descripción, comparador y pulso en vivo (demo)
- **Ficha de jugador**: stats en 2 columnas, botón «Ver completa» (lista de las 14 + OVR), frase opcional y **descripción** (`jugadores.descripcion`, migración 008, ≤600).
- **Comparador** (`features/compare.js`, cálculos en `core/compare.js`): en Jugadores, botón «Comparar» o la balanza de cada tarjeta (máx. 2). Radar superpuesto (escala 40–99), barras enfrentadas, resumen y textos.
- **Pulso en vivo** (`features/liveFeed.js`, `core/live.js`): mensajes sutiles abajo a la izquierda; botón «En vivo» para silenciar (se recuerda). Con `LIVE_DEMO = true` simula eventos con nombres ficticios (rotulados «demo», lista en `data/liveDemo.js`). Para conectar actividad real: disparar `window.dispatchEvent(new CustomEvent('live:evento', { detail: {...} }))` y poner `LIVE_DEMO = false`.

### Ronda 10 — Posiciones con color, comparador por equipos, ajustes de pulso y ticker
- **Posiciones** (`src/data/posiciones.js`, única fuente): 4 grupos con color (Portero amarillo, Defensa azul, Centrocampista verde, Delantero rojo; EI/ED cuentan como delanteros, como LWF/RWF en PES). Nombre completo al pasar el mouse o tocar (línea bajo los botones); el color también se usa en la insignia de la tarjeta y en el comparador.
- **Stats** más compactas (~60px por stat en vez de ~118px).
- **Comparador por equipos** (`features/compare.js` + `core/compare.js`): 2 a 8 jugadores en Equipo A / Equipo B (máx. 4 cada uno; 3 vs 2, 4 vs 3…), se compara el PROMEDIO de cada equipo (radar + barras). Vista «Todos»: tabla con cada jugador y el mejor valor subrayado.
- **Pulso en vivo**: en PC abajo a la derecha (móvil igual que antes). **Ticker**: más separación entre noticias y 40 px/s en celular.

### Ronda 11 — Menos carga visual
- **Posiciones**: solo las letras llevan color (el resto del botón/insignia es el estándar); sin mini leyenda.
- **Comparación 1 vs 1** (`features/compare.js`): vuelve el diseño de la ronda 9 (dos selectores, cabecera, resumen); radar / estadísticas / perfil van en pestañas para bajar menos. **Comparación masiva** (`features/compareMasivo.js`): botón aparte; resultado en mini secciones (Resumen · Radar · Estadísticas · Tabla), una abierta a la vez.
- **Última hora**: una noticia a la vez cruza la barra (75 px/s en PC, 32 en celular) y hay una pausa (2.5 s / 2 s) antes de la siguiente. Se pausa al pasar el mouse o tocar.

### Ronda 12 — Tarjetas con foto grande, buscador en comparadores, pulso con hora e historial
- **Tarjeta de jugador** (`features/playerCard.js`, usada en Jugadores y Destacados): foto grande arriba (5:4), OVR y posición sobre la foto; la insignia de posición vuelve a letra + recuadro del color del grupo. En el formulario de crear jugador solo las letras llevan color. Las fotos nuevas se guardan a 512 px (las antiguas de 256 px se verán algo borrosas hasta volver a subirlas).
- **Editar/borrar**: botón sutil «⋯» en la esquina de la foto (solo admin) que abre un mini menú.
- **Buscador por nombre** (`features/playerPicker.js`, `core/search.js`) en el comparador 1 vs 1 y en «Añadir jugador» de la masiva (sin acentos ni mayúsculas).
- **Pulso en vivo**: hasta 5 mensajes a la vez en PC (2 en móvil), cada uno con hora exacta HH:MM:SS, y botón «Historial» con las últimas 2 horas (máx. 200; se guarda en el navegador y sobrevive a cambiar de página). Silenciar solo oculta los mensajes; el historial se sigue llenando.

### Ronda 13 — Recortador de fotos de jugador
- Al elegir una foto se abre el **recortador** (`features/photoCropper.js`, geometría pura en `core/crop.js`): arrastrar para mover, rueda / deslizador / botones / pellizco para el zoom, flechas del teclado, «Ajustar» para volver al encuadre inicial. La imagen siempre cubre el marco (sin huecos). **Vista previa** = la tarjeta real con el mismo encuadre. Esc o «Cancelar» cierran solo el recortador.
- Se guarda un JPEG 5:4 (hasta 800×640) recortado de la imagen ORIGINAL, igual que la foto de la tarjeta. «Reencuadrar» reabre el recortador (con la foto recién elegida o descargando la ya guardada).

### Ronda 14 — Foto por detrás de la tarjeta + 2 tarjetas por fila en celular
- **La tarjeta no cambia de tamaño.** La foto es ahora una capa detrás de todo el contenido (`playerCard.js`). El recortador ofrece el largo: **Normal 5:4** (solo la zona superior), **Media 1:1** (llega al nombre) y **Larga 4:5** (por defecto en fotos nuevas: baja hasta las estadísticas, con degradado para que se lean). Marco y vista previa usan exactamente esa proporción.
- Se guarda en `jugadores.foto_aspecto` (migración `009`); las fotos antiguas quedan en Normal. «Reencuadrar» recuerda la elección.
- **Celular**: 2 tarjetas por fila (Jugadores y Destacados), tipografía y márgenes compactos, frase oculta en móvil. PC sin cambios de tamaño.

### Ronda 15 — Zoom, apodo, un solo «Comparar», ticker continuo, leyenda
- **Zoom de tarjetas** (`core/density.js` + `pages/database.js`): el control −/+ elige el TAMAÑO de tarjeta (ancho mínimo); la cuadrícula `auto-fill` decide sola cuántas caben y las reparte parejas, así que se adapta a cualquier pantalla o giro. Celular 4 tamaños (hasta ~4 por fila), PC 8 (hasta ~10 por fila). − aleja (caben más), + acerca. También Ctrl + rueda sobre la lista en PC. Se recuerda por tipo de pantalla. La tarjeta escala sola con container queries (`components.css`).
- **Apodo** (`jugadores.apodo`, migración `010`, máx. 24): campo opcional, aparece junto al nombre y la búsqueda lo encuentra.
- **Comparar**: un solo botón; abre 1 vs 1 con la mini opción «Masiva»; en la masiva hay «1 vs 1» para volver. Con 3+ marcados abre directo la masiva.
- **Última hora**: flujo continuo con hueco mínimo (90 px PC / 56 px celular); pueden coincidir varias.
- **Leyenda de stats** (ⓘ sutil sobre la lista) · **Duelos** con más margen lateral.

### Ronda 16 — Búsqueda avanzada, físico, pulso movible
- **Búsqueda avanzada** (botón «Avanzada», `features/advancedSearch.js` + `core/ranking.js`): eliges una o varias stats (o la media) y la lista se reordena al instante por el **promedio de las elegidas** (puesto #1, #2…; empates comparten puesto). «Mínimo en cada stat» exige que todas lleguen a ese valor; «Top 3/5/10/Todos». Respeta el filtro de equipo y el buscador. Cada tarjeta muestra bajo ella los valores de las stats elegidas.
- **Físico opcional** (migración `011`: `altura_cm` 120–230, `peso_kg` 35–160, `pie` Derecho/Izquierdo): campos en el formulario; se ven en la tarjeta cuando hay ancho suficiente.
- **Pulso en vivo movible** (`core/dock.js`, `features/liveDock.js`): asa ⋮⋮ para arrastrarlo a cualquier parte; doble clic o Esc lo restablece; flechas del teclado lo mueven. Se pega al lado más cercano (así se adapta al girar/redimensionar), los mensajes e historial crecen hacia el lado con más espacio, y se recuerda en el navegador.

### Ronda 17 — Parche/versión en el pulso, búsqueda avanzada compacta
- **Pulso en vivo**: el juego se muestra como «PES 21 (Dream Patch)» o «SP Football Life 26» (`etiquetaJuego` en `core/rules.js`; el evento lleva `juego` + `parche`/`version`). Sin parche o versión, solo el nombre del juego.
- **Sistema host**: el parche de PES 2021 se elige entre Dream Patch, Conmegol Patch, VirtuaRED, Sudamerican Patch y Gogosz Patch (`PARCHES_PES`), o «Otro» para escribirlo a mano; tocar el elegido lo quita.
- **Búsqueda avanzada** más compacta (chips pequeños, mínimo y Top en una sola fila, ancho máximo en PC).
- **Físico más visible** (el peso se retiró después: nadie debe sentirse obligado a darlo): altura y pie dominante se muestran como chips cian entre el nombre y las stats (`pc-fis` / `pc-chip` en `playerCard.js`), solo con lo que exista y ocultos únicamente en tarjetas diminutas. Las tarjetas de una misma fila ahora tienen la misma altura.

### Ronda 18 — Central reorganizada (EXPERIMENTO)
- **Volver a la versión anterior de Central**: está respaldada en la rama `central-base-v1` (estado exacto antes del experimento). Para restaurarla basta con traer `src/pages/index.astro`, `src/js/pages/central.js` y los estilos «Central» de `components.css` de esa rama.
- Orden nuevo: portada única compacta (botones según sesión) → **pulso de la comunidad** (4 conteos reales: fichas, jugadores registrados, hosts, retos abiertos; `—` si falla la lectura) → **Central de Partidos** con el Partido Destacado dentro y pestañas Próximos/Resultados + Posiciones y XI al costado (XI plegado en celular) → Jugadores destacados (carrusel en celular) → Highlights compacto sin imágenes externas → invitación a Discord.
- Lógica pura en `core/central.js` (`cifra`, `partirPartidos`). Partidos, tabla, XI y partido destacado siguen siendo datos demo (`data/demo.js`).
- Efecto: página de celular ~2.750 px frente a ~4.100 px.
- **Ajustes de la Ronda 18**: la portada recupera la foto del espacio exterior que se acerca despacio al pasar el mouse. Los botones son dos y el principal depende de la sesión (sin cuenta: «Crear cuenta»; con cuenta: «Sala de Duelos»); «Jugadores» se quitó porque ya está en el menú. Highlights vuelve a tamaño grande (16:9) con zoom al pasar el mouse, más una lista «Más clips» al costado (`DEMO_CLIPS` en `data/demo.js`; debajo en celular).
- **Banner de liga** (`data/ligas.js`): vuelve «Competición activa · GALAXY LEAGUE · Pro Evolution Soccer» con la foto del espacio y su zoom. Para no competir con la portada, esta pasó a hablar de la plataforma («PHOENIX EVOLUTION SERIES», sin foto) y el banner presenta la liga. Para sumar una liga nueva se agrega un objeto a `LIGAS` (estado `activa` o `proxima`, título, juego, botones); con 1 liga el banner ocupa todo el ancho, con varias la primera es grande y el resto comparte la fila. Pendiente a futuro: que Central de Partidos/Posiciones se filtren por liga.

### Ronda 19 — Editor de stats y portada única

**Editor de stats (`features/playerForm.js`, `core/stats.js`)**
- Cada valor se puede escribir a mano (solo dígitos, 1–99), con flechas ↑/↓ (±1) y Enter para confirmar.
- Escribir la **media (OVR)** reparte las stats con `distribuirMedia`: parte de la "forma" guardada (diferencias entre stats) y desplaza todo por igual hasta que el promedio sea exacto. Así subir y bajar la media no deforma al jugador.
- Botón **Al azar** (`aleatorias`): genera stats con ruido de ±10 alrededor de la media, y la media final queda exacta. Cada clic da una combinación nueva.

**Portada (`pages/index.astro`)**
- Hero y banner de liga se fusionaron en UNO: la primera liga de `data/ligas.js` es la portada (foto del espacio con zoom al pasar el mouse).
- Las demás ligas, cuando existan, salen como tarjetas compactas en "Otras competiciones".
- Botones: sin sesión → Crear cuenta + Sala de Duelos; con sesión → Sala de Duelos + Partidos y posiciones.
- Para volver a la base anterior: rama `central-base-v1`.

### Ronda 20 — Podio de destacados
- `core/central.js` → `ordenPodio` (2.º | 1.º | 3.º, sin huecos si hay menos de 3). Probado en `tests/pure.test.mjs`.
- `pages/central.js` pinta cada carta dentro de `.podio-slot` (sin números de puesto visibles; `data-puesto` y el `aria-label` los conservan). Mouse: agranda por CSS (`:hover`). Toque/Enter: alterna `.podio-up` (una sola carta agrandada; tocar fuera la baja).
- Tamaño: cartas de ≈15,5 rem (como «Jugadores»). `.podio-slot` queda quieto (recibe el mouse) y `.podio-in` hace el zoom: 1.º `--z1:1.1`, 2.º `--z2:1.075`, 3.º `--z3:1.05` en 1,6 s con curva pareja (`cubic-bezier(.45,0,.55,1)`). Borde de color fijo (`--glow`): 1.º dorado, 2.º cian, 3.º magenta, sin destello. Celular: 1.07/1.055/1.04, tres a todo el ancho.
### Ronda 21 — Página Liga
- `pages/liga.astro` (data-driven con `data/ligas.js`): portada de la liga, cómo funciona, ficha (campos vacíos → «Por definir»), parches reconocidos (`PARCHES_PES`). Botón «Fixture y tabla en CopaFácil» aparece solo si `copafacil` tiene enlace. NAV: nueva entrada «Liga».
- CopaFácil sigue siendo la fuente oficial; sin API pública confirmada no hay conexión automática. Siguiente fase posible: tablas reales en Supabase (espejo).

### Ronda 22 — Resultados de la liga (espejo, base)
- `data/ligaResultados.js`: clubes y resultados fecha por fecha copiados de CopaFácil (fechas 1 a 9 cargadas; partidos sin jugar = gl/gv null). `core/tabla.js` → `calcularTabla` (3-1-0; desempate: enfrentamiento directo entre los empatados (puntos → dif. → goles, recursivo) → dif. de goles total → goles a favor → nombre). Verificado fila por fila contra la tabla real de CopaFácil (test «coincide fila por fila»). Aún no se muestra en la web.

### Ronda 23 — Página Liga completa con historial
- Datos: `data/ligaResultados.js` → `EDICIONES[idLiga]` = lista de ediciones (`id, nombre, estado 'en_curso'|'finalizada', campeon, fase, formato, participantes, clubes, fechas, aviso`). Para archivar una edición: `estado:'finalizada'` + `campeon`; para abrir otra: agregar un objeto (idealmente en su propio archivo de fechas).
- Cálculo (puro, probado): `core/tabla.js` (tabla + desempate directo, igual a CopaFácil) y `core/ligaStats.js` (`resumenFecha/Edicion`, `estadoFecha`, `fechaActual`, `forma`, `mayoresGoleadas`, `ranking`).
- (Central vuelve a su portada original de la base «EL CIRCO MÁXIMO…»; la ficha de cada liga vive solo en Liga, y Central muestra tarjetas de ligas solo si hay más de una.)
- Liga en PC: tabla (izquierda) y resultados por fecha (derecha, fija al hacer scroll) en la misma fila; las columnas de la tabla se adaptan al ancho (GF/GC desde 2xl, Forma desde xl). En celular van una debajo de otra.
- `pages/liga.astro` pinta todo al construir: cifras, tabla con forma (últimos 5), mejor ataque/defensa, mayores goleadas, resultados por fecha, historial de ediciones, cómo funciona, ficha y parches. `js/pages/liga.js` solo cambia de edición (select) y de fecha.
- Cada resultado nuevo = agregar/editar el partido en `FECHAS` (gl/gv null = sin jugar). Mantener la prueba «coincide fila por fila con CopaFácil» actualizada con la tabla real del momento.

### Ronda 24 — Noticias (BD + editor + Discord)
- Tabla `noticias` (migración 012) con RLS: lectura pública de publicadas, escritura solo admin. Bucket `noticias` para portadas.
- `core/noticias.js` (lógica pura), `core/cronica.js` (crónica automática por plantillas), `features/noticiasAdmin.js` (editor), `pages/noticias.js` (página; si la BD falla usa `data/noticias.js`).
- Enlace por noticia: `noticias/?n=<slug>`. Filtro de liga aparece con 2+ ligas en las noticias.
- Edge function `notificar-discord` (solo admin); requiere el secreto `DISCORD_WEBHOOK_URL` en Supabase.

### Ronda 25 — Perfil público de jugador (experimento)
- Rama `base-v2`: copia de seguridad del estado anterior a esta ronda.
- Página `jugador/?id=<id>` (`pages/jugador.js`): carta, datos y campaña en cada edición de liga donde aparece (puesto, KPIs, resultados, próximos, contra cada rival). Lógica pura en `core/perfil.js` (tests).
- El jugador se vincula con la liga por nombre/apodo (sin tildes ni mayúsculas).
- Botón «Ver perfil» (icono de carnet) en cada carta de Jugadores. Títulos: pendiente hasta que Palmarés tenga datos reales.
- Perfil ampliado (migración 013): `biografia`, `ciudad`, `miembro_desde`, `estilo_juego`, `logros` (uno por línea) y `redes` (jsonb). Se editan en la ficha (sección plegable «Perfil público», solo admin). Redes validadas en `core/perfil.js` (solo usuario o https://; Discord se muestra como texto).
- Análisis de juego en el perfil (botón «Ver análisis de juego»): mapa de calor aproximado, radar de estilo + fortalezas/a mejorar y rendimiento real de liga (puntos acumulados). Lógica pura en `core/estilo.js` y `core/perfil.js`. El mapa y el radar son APROXIMADOS (posición + stats), no seguimiento real.
- Botón «Editar ficha» dentro del perfil (solo admin): abre el mismo formulario de Jugadores y recarga el perfil al guardar.

### Ronda 26 — Jugadores: que nadie quede abajo (experimento)
- Botón propio «Editar biografía» en el perfil (`features/perfilEditor.js`); el formulario de la ficha ya no lleva esos campos.
- Más presencia visual: apodo (pastilla con brillo), club, posición, altura y pie en cartas y en el encabezado del perfil.
- Jugadores: reconocimientos (`features/reconocimientos.js`: de la fecha, en forma, revelación + voto de la semana, migración 014 `votos_semana`), vistas Todos / Por estilo / Por nivel, selector de orden (media, forma, goleador, antigüedad, A–Z, aleatorio). Lógica en `core/destacados.js` (niveles: Élite ≥88, Estrellas ≥83, Titulares ≥77, Promesas).
- Carta: crece suave al pasar el mouse; al hacer clic se destaca y las demás se difuminan (Esc / clic fuera lo quita).
- Historial y títulos en el perfil (migración 015 `participaciones`): ediciones anteriores con club, puesto, título (Campeón/Subcampeón…) y premios; la edición en curso sale sola de los datos de la liga. Lógica en `core/historial.js`; botón «Editar historial» (solo admin) abre `features/historialEditor.js`.

- **Equipos en MAYÚSCULAS (ronda 26):** los nombres de club se muestran siempre en mayúsculas (CSS `uppercase` + `.toUpperCase()` en cronica, filtros y formularios); al guardar un club nuevo se almacena ya en mayúsculas.
- **Carta destacada = réplica (ronda 27):** al hacer clic, la carta original NO se mueve (queda atenuada); `pages/database.js` crea una réplica fija (`.pcw-replica`) que viaja al centro, crece hasta 1.6× (1.25× en celular, siempre dentro de la pantalla), con aura e inclinación 3D con el mouse. Sin mover el scroll. Se cierra con clic, Esc o clic fuera.
- **Barra «Última hora» solo arriba (ronda 28):** ya no reaparece al subir un poco; se ve completa solo cerca del tope (`features/ticker.js`, `data-oculto`). En PC se esconde al bajar; en celular queda una versión sutil (sin etiqueta, texto pequeño translúcido, deja pasar los toques) bajo la cabecera (`styles/layout.css`).
- **Stats de la carta (ronda 29):** la sigla (ATQ, FIN…) y su número van pegados (antes en extremos opuestos de la columna); las dos columnas se centran en la caja (`.pc-stats` en `styles/components.css`).
- **Sistema de divisiones BETA (ronda 30):** dos divisiones (Primera/Segunda), ascensos/descensos y Copa Interdivisional.
  - `data/temporada.js`: configuración (`SISTEMA`: divisiones, valores iniciales, resultados de la copa) y tabla de EJEMPLO de Segunda (`DEMO_SEGUNDA`, nombres genéricos, rotulada «Datos de ejemplo»). Cómo activar la Segunda real: ver comentario del archivo.
  - `core/temporada.js` (puro, 4 tests): `zonasDivision`, `resolverAscensos` (suben = bajan), `clasificadosCopa` (cabezas de serie), `ordenCuadro`, `construirCopa` (byes si no es potencia de 2, penales), `normalizarConfig`.
  - `pages/temporada.astro` + `js/pages/temporada.js` (ruta `/temporada/`): controles +/− que recalculan todo; tablas con zonas, «si la temporada terminara hoy» y cuadro de la copa. Liga: filas de la tabla coloreadas (copa/descenso) con leyenda y enlace a Temporada.
  - Sin enlace en el menú principal a propósito (beta): se llega desde la página Liga.
- **Filtros liga · torneo · temporada y club histórico (ronda 31):** migración 016 (`participaciones.torneo/temporada` + tabla `copa_resultados`, ya aplicada). `core/participaciones.js` (puro, tests): `construirIndice` mezcla la tabla `participaciones` con las ediciones de la web (el jugador se enlaza por nombre/apodo; torneo y temporada se deducen de «Apertura 2025» si faltan), `filtrarJugadores`, `divisionActual`. En Jugadores: panel plegable «Liga · Torneo · Temporada»; buscar un club incluye a quien lo eligió alguna vez y cada carta muestra etiquetas «CLUB · liga · torneo · año»; insignia L1/L2 en la carta. El editor de historial pide torneo y temporada. `EDICIONES[...]` lleva `torneo` y `temporada`.
- **Resultados de la copa en Supabase (ronda 31):** `/temporada/` lee `copa_resultados` y el admin edita cada cruce (botón «Resultado»; goles, penales si hay empate). Validación pura `validarResultadoCopa`.
- **Página Organizadores (ronda 32):** `/organizadores/` (enlace en el pie de página). Contenido en `data/organizadores.js` (propósito, motivación, visión, historia, hitos, valores, impulsores Fralex/Jack/Hugo; campo vacío = no se muestra). Textos en BORRADOR: sin datos personales inventados. `js/pages/organizadores.js` enlaza a cada impulsor con su perfil de jugador si existe.
- **Carta más compacta y premium (ronda 33):** zona de foto más baja (1.7), stats en 3 columnas (2 en tarjetas angostas), club y apodo en una fila, menos relleno → ~19 % menos alto (488→395 px a 286 px de ancho). Acabado por nivel (`data-nivel`: Élite oro con borde de foil, Estrellas cian, Titulares violeta), cifra con degradado, brillo que cruza al pasar el mouse (`.pc-sheen`). `features/playerCard.js` + final de `styles/components.css`.
- **En vivo con nombres reales (ronda 34):** la simulación del Pulso en vivo usa los jugadores reales de la liga (`data/liveDemo.js` lee `CLUBES`); los eventos siguen siendo inventados y salen rotulados «demo».
- **Ajuste de compactación + tamaño predeterminado (ronda 35):** la carta quedó a medio camino (~430 px de alto a 286 de ancho; antes 488, compacta 395): foto 1.3, 3 columnas de stats con más aire. Botón «Predeterminado» (y Ctrl+0) en Jugadores restablece el tamaño de tarjetas (`nivelPorDefecto` en `core/density.js`; se deshabilita si ya está en ese tamaño).
- **«Apertura 2026» → «1° Edición» (ronda 36):** la edición en curso se llama `1° Edición` (id `edicion-1`, torneo `1° Edición`, temporada 2026) en Liga, filtros, Palmarés, noticia demo y ticker. Las noticias ya publicadas en Supabase con el texto anterior no se tocan automáticamente.
- **Barra de leyenda y zoom (ronda 37):** botón «Leyenda de stats» con texto e icono ? (píldora cian) y grupo de zoom (− · Predeterminado · +) separado de las tarjetas y de la barra de vistas.
- **Parche renombrado (ronda 38):** «Conmebol Patch» → «Conmegol Patch» (`core/rules.js` PARCHES_PES y simulación En vivo). Retos ya guardados en Supabase con el nombre antiguo conservan su texto.
- **Barra discreta (ronda 39):** leyenda de stats y zoom pasan a la misma fila de Vista/Orden, a la derecha y más pequeños (sin fila propia).
- **Mercado (ronda 40):** el título de la página pasa de «Mercado de Pases» a «Mercado de Fichajes».
- **Quiénes somos más visible + impulsores equilibrados (ronda 41):** enlace en forma de píldora en el pie y entrada propia en el menú de celular (`NAV_EXTRA` en `data/site.js`, sin saturar la cabecera de PC). Los tres impulsores van en tarjetas iguales (Fralex apenas destacado: borde más brillante y un poco más arriba) con un texto que dice que la iniciativa se construyó de la mano de los tres y que Jack y Hugo son igual de relevantes (`impulsoresIntro` en `data/organizadores.js`).
- **Impulsores con papeles complementarios (ronda 42):** Fralex = «Idea y organización»; Jack y Hugo = «Alma de la comunidad» (mueven y entretienen a la gente, de la mano). Tarjetas idénticas, sin destacar a nadie; la introducción dice que los tres son igual de importantes. Todo en `data/organizadores.js`.
- **Impulsores, versión elegante (ronda 43):** orden Jack · Hugo · Fralex. Jack = «La cara de la comunidad» (con un brillo sutil), Hugo = «Mano a mano con Jack», Fralex = «Detrás de escena». Tarjetas con tipografía espaciada, rol en versalitas y descripción breve (`data/organizadores.js` + `pages/organizadores.astro`).
- **Última hora arrastrable en PC (ronda 44):** con el mouse se puede arrastrar para retroceder/avanzar (se frena en la noticia más antigua conservada, ~900 px de historia), botones ‹ › al pasar el mouse, y al sacar el mouse sigue sola (`features/ticker.js`, `Ticker.astro`, `layout.css`). En táctil solo pausa.
- **Quiénes somos (ronda 44):** textos mínimos; Fralex un poquito por encima (centro, ligeramente elevado) y Jack casi igual (a su izquierda), Hugo al otro lado (`destaque`/`orden` en `data/organizadores.js`).
- **Quiénes somos (ronda 45):** Fralex y Jack = «Impulsor de todo» (en ese orden, Fralex apenas más elevado), Hugo = «Co-impulsor».
- **Fotos en Quiénes somos (ronda 46):** cada impulsor usa su foto de la sección Jugadores si la tiene (`foto_url`/`foto`); si no, queda su inicial. Hugo la muestra apenas la tenga cargada; Fralex y Jack cuando suban la suya.
- **Sin la palabra «impulsor» (ronda 47):** roles Fundador (Fralex, Jack) y Co-fundador (Hugo); título de sección «Las personas detrás»; pie «conoce al equipo». Editable en `data/organizadores.js`.
- **Insignia de división (ronda 48):** separada del borde (0.7rem/0.8rem) y, al pasar el mouse o en la réplica, se expande hacia la izquierda mostrando el nombre completo («L1 Primera División»). Oculta el texto en zoom denso.
- **Perfil con tarjeta alta (ronda 49):** `playerCardHTML(p, i, { largo: true })` restituye en el perfil las proporciones altas de antes (foto 5:4, stats en 2 columnas); Jugadores sigue con la compacta (`.pc-largo` en `styles/components.css`).
- **Logo de la cabecera más adentro (ronda 50):** el escudo y «PES» se separan del borde izquierdo (`Header.astro`: pl-6 móvil / pl-12 PC; antes pegado a ~16-24 px).
- **Última hora con huecos irregulares (ronda 51):** cada noticia trae su propio hueco de salida entre 0.5× y 2.5× el base (`huecoIrregular` en `features/ticker.js`), para que no se vea simétrica.
- **Campanita (ronda 52):** se separa un poco más a la izquierda del botón de perfil (`mr-2 sm:mr-3` en `features/navbar.js`).
- **Ronda Configuración completa (ronda 53):** `/ajustes/` con 9 secciones generadas desde UN catálogo (`data/ajustes.js`): Apariencia (color de acento, neón), Jugadores y cartas (brillo, inclinación 3D, insignia L1/L2), Liga (zonas, tablas compactas), Notificaciones/en vivo (panel, duración, tipos, barra de última hora y su velocidad), Privacidad (historial en vivo, recordar zoom + borrar), Cuenta (perfil/sesión), Idioma y región (hora 12/24 y zona horaria en avisos, duelos y notificaciones), Accesibilidad (animaciones según sistema, tamaño de texto, contraste, subrayado, foco), Datos (exportar/importar/restablecer/borrar). Lógica pura `core/ajustes.js` (validación, región, import/export, tests); `features/ajustes.js` escribe `data-aj-*` en `<html>` y el CSS (`layout.css`) los lee. Se guardan en el navegador (`pes-ajustes-v1`), no en la cuenta. Menú lateral: Configuración + Salir al fondo; también en el menú del avatar.
- **Mis partidos (ronda 54):** solo **Agendados** (ACEPTADO/EN_JUEGO) e **Historial** (FINALIZADO, últimos 50, `loadHistorial` en `features/duelos/data.js`). Los retos aún sin aceptar (BUSCANDO) e invitaciones pasan al bloque «Tus retos pendientes» dentro de Retos en el radar (para poder cancelarlos). Lógica pura en `core/misPartidos.js`.
- **Pulso en la portada (ronda 55):** las 4 cifras (fichas, registrados, hosts, retos abiertos) pasaron de ser una franja suelta a la portada «El show máximo», bajo los botones (`pages/index.astro`; los ids `pulso-*` no cambian).
- **Ajustes compactos con vista previa (ronda 56):** `/ajustes/` pasa a pestañas (una sección a la vez) y cada sección lleva una vista previa en vivo (`features/ajustesVista.js`): cartas reales, tabla con zonas, avisos «En vivo» + barra de última hora a la velocidad elegida, reloj con zona/formato, texto/enlace/foco, datos guardados. Los paneles usan id `panel-<sección>` para que `#seccion` no haga saltar la página.
- **Portada a pantalla completa (ronda 57):** la portada de Central mide el alto de la primera pantalla y las 4 cifras ocupan todo el ancho al pie de ella (`pages/index.astro`).
- **Portada en celular más compacta (ronda 58):** en móvil la portada ya no fuerza el alto de pantalla y arranca con menos margen superior; la altura completa queda solo desde `sm` (`pages/index.astro`).
- **Clic con carta ampliada (ronda 59):** si hay una carta ampliada, un clic en otra carta solo la minimiza; hace falta un segundo clic para ampliar la nueva (`pages/database.js`, handler de `#players-container`).
- **Portada más arriba (ronda 60):** menos margen superior (`sm:pt-6`) y alto `calc(100svh-9.5rem)`, para que el título y las 4 cifras suban y las cifras no queden pegadas al borde inferior en pantallas bajas.
- **Portada, ajuste fino (ronda 61):** la portada vuelve a ocupar toda la primera pantalla (`sm:min-h-[calc(100svh-7rem)]`) con `sm:pb-14` y `sm:pt-6`: cifras un poco más arriba que al inicio, pero ya no tanto como en la ronda 60.
- **Portada en celular = PC (ronda 62):** también en móvil la portada ocupa toda la primera pantalla (`min-h-[calc(100svh-7rem)]`, `pt-6`, `pb-8`); si el contenido es más alto que la pantalla (móviles bajos) crece sin cortarse.
- **Barra de última hora más baja en celular (ronda 63):** `h-8` en móvil (`h-11` desde `sm`) en `Ticker.astro`; la portada usa `calc(100svh-6.1rem)` en móvil para seguir ocupando justo la primera pantalla.
- **Central de Partidos con datos reales (ronda 64):** ya no usa `DEMO_MATCHES`/`DEMO_TABLE`. Lee la edición en curso de `data/ligaResultados.js` (la misma fuente que Liga): **Próximos** = primera fecha con partidos sin jugar; **Resultados** = las 2 últimas fechas con marcadores (ganador en negrita); **Posiciones** = `calcularTabla` real (PJ y PTS, DT + club en mayúsculas); **Partido destacado** = el cruce pendiente entre los mejor ubicados de la tabla, con escudo-monograma (`data/clubesVisual.js`). Lógica pura en `core/central.js` (`jornadasCentral`, `partidoDestacado`, `visualClub`, con tests). Sigue siendo demo: XI ideal y Highlights. Al cargar más resultados en `ligaResultados.js`, Central se actualiza solo.
- **Portada de celular sin pasarse (ronda 65):** en móvil se compactan el título (1.85rem), el texto, los botones (lado a lado) y las 4 cifras (`components.css`, `max-width:639px`) para que todo quepa en la primera pantalla desde 360×640. Desde `sm` no cambia nada.
- **Zoom del navegador libre en Jugadores (ronda 66):** se quitan los atajos Ctrl + rueda y Ctrl + 0 que cambiaban el tamaño de las cartas; ahora el zoom del navegador (mouse o pellizco) no toca el diseño de las cartas. El tamaño de cartas se cambia solo con los botones −/+/Predeterminado.
- **Comparador 1 vs 1 en modo «duelo» (ronda 67):** `features/compare.js` + estilos `.cmp-*` en `components.css`. Tarjetas de luchador (foto con aura, media general grande, mejor estadística, corona al líder, destello), insignia VS pulsante, marcador con conteo animado y tira cian·empates·magenta, radar que se dibuja con brillo, puntos por estadística (más grandes donde gana) y siglas coloreadas por ganador, barras que se llenan con chip de ventaja. La entrada animada corre solo al cambiar la pareja; respeta el ajuste de animaciones (`hayMovimientoReducido`). La comparación masiva (`compareMasivo.js`) no se tocó.
- **Comparador más compacto (ronda 68):** luchadores en formato bajo (foto + media en una fila), marcador y veredicto en menos líneas, radar más pequeño con leyenda en una línea y menos relleno en el modal; el duelo completo con radar cabe en pantallas de ~780 px de alto (`compare.js`, `.cmp-*`).
- **Duelos más compacto en altura (ronda 69):** cabecera más baja, formulario con menos aire (etiquetas, botones y campos de 2.25rem), «¿Quién hostea?» y «Plataforma» en la misma fila, ayudas más cortas (`pages/duelos.astro`, `features/duelos/form.js`, bloque al final de `components.css`). El botón «Emitir reto» queda dentro de la primera pantalla en PC (1280×800); a 1920×950 la página entera cabe sin scroll. En celular el formulario baja de ~690 a ~550 px.
- **Ronda 70** — «Mis partidos» ahora es su propia página `/mis-partidos/` (agendados, historial, historial con cada rival: duelos con `rivalesDeDuelos` + liga con `contraRivales`); se quitó de Duelos (queda un enlace «Mis partidos (n)» en el radar). Enlaces del menú, avatar y Configuración actualizados. Duelos: tamaño por defecto 1v1, presets 2v2/3v3/4v4 y un enlace sutil «personalizar» que abre los contadores (se abre solo si el tamaño no es un preset). Tests: 86.
- **Ronda 71** — Duelos/Tamaño: se quitó el botón 1v1 (es el valor por defecto; volver a tocar un formato lo regresa a 1v1). Fila: 2v2 · 3v3 · 4v4 · «Personalizar» (sutil, borde punteado) y los contadores Mi equipo/Rival quedan siempre visibles.
- **Ronda 72** — Duelos: se quitó el enlace «Mis partidos» del encabezado del radar (queda como antes: título + Actualizar). Mis partidos se abre desde el menú de cuenta.
- **Ronda 73** — Duelos/Tamaño: enlace «volver a 1v1» (solo aparece si el tamaño no es 1v1) para regresar al valor por defecto sin usar las flechas.
- **Ronda 74** — Duelos/Tamaño: «Restablecer a 1 vs 1» pasa a ser un botón de ancho completo con icono y borde cian (aparece solo si el tamaño no es 1v1).
- **Ronda 75** — Social, fase 1 (solo base de datos, SIN aplicar): `supabase/migrations/017_amigos.sql` define amistades (solicitud + aceptación), seguidores, bloqueos y privacidad social, todo mediante funciones RPC con permisos por fila. Plan acordado: Amigos → Chat privado (1 a 1 y grupos) → Espectadores (el retador elige: con aprobación / solo amigos / cualquiera / apagado). La migración quedó cancelada al aplicarla y está pendiente de aprobación.
- **Ronda 76** — Social, fase 1 (interfaz): página `/amigos/` con pestañas Amigos · Solicitudes · Buscar · Seguidores · Siguiendo · Bloqueados · Privacidad (`pages/amigos.js`, `features/amigos/api.js` = RPC, `core/red.js` = lógica pura, 4 tests nuevos → 90). Enlaces en el menú de cuenta y en el avatar; las notificaciones de amistad/seguidor llevan a /amigos/. **Necesita aplicar la migración 017 en Supabase** (se probó con datos simulados; sin la migración la página mostrará error al cargar).
- **Ronda 77** — Social, fase 2 (chat privado): `supabase/migrations/018_chat_privado.sql` (conversaciones directas y grupos, miembros, mensajes, reportes; reglas de privacidad y bloqueo en el servidor; límites 1000 caracteres, 20 mensajes/min, grupos hasta 20 personas; borrar mensaje vacía el texto; Realtime) — **PENDIENTE de ejecutar en Supabase**. Interfaz: `/mensajes/` (`pages/mensajes.js`, `features/chat/api.js`, `core/chat.js` con 5 tests → 95): lista de chats con no leídos, sala en vivo, nuevo chat directo/grupo, gestión de grupo (agregar/quitar/salir), silenciar, borrar, reportar; `/mensajes/?con=<id>` abre un directo; botón «Mensaje» en Amigos; enlaces en menú de cuenta y avatar.
- **Ronda 78** — Social, fase 3 (espectadores): `supabase/migrations/019_espectadores.sql` — modo por reto (APAGADO · APROBACION · AMIGOS · CUALQUIERA, por defecto APAGADO) + cupos 1–20, tabla `reto_espectadores`, funciones (configurar/pedir/responder/quitar/salir, `enlace_espectador`, `partidos_en_vivo` pública sin enlaces, `mis_salas`), notificaciones nuevas — **PENDIENTE de ejecutar en Supabase**. Interfaz: `/en-vivo/` («Salas en vivo»: partidos para mirar + gestión de mis partidos), selector «Espectadores» en el formulario de Duelos, enlaces en menú de cuenta/avatar, notificaciones → /en-vivo/. El enlace de Parsec/Smash Soda solo se entrega a espectadores aprobados; el host acepta dentro de la app. 3 tests nuevos → 98.
- **Ronda 79** — Host: juegos EXTRA (eFootball y FIFA) con versión y parche/mod, discretos y opcionales en un desplegable «Otros juegos que hosteo» dentro de Sistema Host (perfil). Los principales siguen siendo PES 2021 y SP Football Life. `supabase/migrations/020_host_extras.sql` (columna `host_extras` jsonb, máx. 2, ≤400 caracteres, sin < >) **ya aplicada**; `core/hostExtras.js` (sanitizado, 2 tests → 100). Por ahora solo se guarda y edita en el perfil; no se muestra en otras pantallas.
- **Ronda 80** — Menú del avatar distinto al lateral: el lateral (Mi cuenta) conserva TODAS las secciones; el avatar pasa a ser un panel rápido: cabecera (nombre y @usuario), filas «Sin leer» y «Solicitudes» (solo si hay pendientes, con contador) y Mi perfil · Configuración · Salir. Punto rojo en el avatar cuando hay algo pendiente (`features/pendientes.js`, refresco cada 60 s y al leer/responder). Corregido el estilo (mayúsculas) inconsistente de las filas del menú.
- **Ronda 81** — Duelos: la zona derecha vuelve a dividirse en dos columnas: «Retos que lanzaste» (tus retos pendientes, con aviso cuando no hay) y «Retos en el radar» (los de otros), en PC ancho; en móvil, una bajo otra. Quitado el bloque «Tus retos pendientes» que iba dentro del radar.
- **Ronda 82** — Menú lateral en celular más ligero: «Explorar» y «Mi cuenta» pasan de lista larga a fichas de 2 columnas (icono arriba, nombre abajo); Configuración y Salir lado a lado; cabecera y redes con menos relleno. En PC (solo Mi cuenta) sigue siendo la lista vertical de siempre; la compactación por altura queda solo para PC. Comprobado 390×780 sin scroll, 360×640 con scroll leve.
- ronda 83: demo «En vivo» incluye EA FC 27/26, FIFA 23 (Realism Mod / Legacy Mod) y eFootball 2027 (Option File); etiquetaJuego los formatea con el mod entre paréntesis.
- ronda 84: menú móvil (3 rayas) vuelve a la lista de siempre y sin «Mi cuenta»; en móvil esos accesos (Mis partidos, Salas en vivo, Mensajes, Amigos) van en el menú de la foto de perfil, en cuadrícula pequeña. En PC no cambia.
- ronda 85: «En vivo»: el historial es SOLO del día (se vacía al cambiar de día) y se abre en otra pestaña (/historial-en-vivo/, botón «Historial»); sin asa: el botón «En vivo» se mueve manteniéndolo pulsado (táctil 0,35 s; ratón: mantener y mover); restablecer posición en Ajustes. Al guardar se relee el almacenamiento para que varias pestañas no se pisen.
- ronda 86: MURO fase 1 (migración 021 aplicada): página /perfil/?u=<usuario> con banner (8 presets), color de acento, lema, bio/chips/host; publicaciones de texto (publicar, editar, borrar, fijar 1), «cargar más»; privacidad del muro (público / solo amigos; «quién responde» ya se guarda para la fase 2). RPC: perfil_publico, muro_de, muro_publicar/editar/borrar/fijar, muro_guardar_estilo/privacidad. Entrada «Mi muro» en el menú de cuenta; nombres en Amigos enlazan al perfil.
- ronda 87: MURO fase 2 (migración 022 aplicada y probada en la BD con rollback): respuestas (500 car., máx. 20/h, aviso MURO_RESPUESTA al dueño), reacciones 🔥🤝👏😂❤️ (una por persona; tocar la misma la quita), permiso «quién responde» (todos/amigos/nadie) que rige respuestas y reacciones; el dueño siempre puede en su muro; borrar respuesta: autor, dueño del muro o staff; respuestas de bloqueados se ocultan. RPC: muro_respuestas_de, muro_responder, muro_borrar_respuesta, muro_reaccionar; muro_de y perfil_publico ampliadas.
- ronda 88: MURO fase 3 (migración 023 PENDIENTE de ejecutar por el usuario; MCP la canceló 2 veces): fotos en publicaciones y banner propio (bucket público «muro», carpeta por usuario, máx. 1,5 MB, el navegador reduce a 1200/1600 px), enlaces de video YouTube (miniatura que carga el reproductor al tocar) / TikTok / Kick / Twitch (tarjeta con enlace). La BD solo acepta fotos de TU carpeta y videos de esos 4 sitios. Texto opcional si hay foto o video. Al borrar una publicación propia se limpia el archivo del Storage.
- ronda 89: historial «En vivo»: búsqueda avanzada (palabras, jugador:/juego:/parche:/formato:/tipo:/hora:19-21, -exclusión, "frase") + filtros (tipo, jugador, juego, formato, desde/hasta, origen demo/real, orden) con conteos y «Limpiar»; cada nombre enlaza a /perfil/?u=<usuario> (usa quienUser/rivalUser si el evento lo trae). Lógica pura en core/liveFiltro.js.
- ronda 90: historial «En vivo» en PC: filtros a la izquierda (fijos al hacer scroll) e historial a la derecha; en móvil, filtros arriba.
- ronda 91: MURO fase 4 (migración 024 PENDIENTE de ejecutar por el usuario; MCP la canceló): adjuntar un duelo verificado a una publicación (tarjeta armada en el servidor: solo duelos en los que participaste, aceptados/en juego/finalizados; nombres ocultos si hay bloqueo; sin marcador porque la BD de retos aún no lo guarda). Pestaña «Muro» en el análisis de la ficha del jugador (solo si la ficha está vinculada: campo «Cuenta vinculada (@usuario)» nuevo en el formulario de ficha, solo admin). HTML compartido en features/muro/render.js.
- ronda 92: MURO fases 5-7 (migración 025 PENDIENTE de ejecutar por el usuario). **Historias** de 24 h (foto + texto + enlace de video; anillo en el avatar, visor con barras de progreso, toque izq./der., mantener = pausa; «ya vista» solo en el navegador), **archivo** de 30 días y **destacadas** (carpetas de historias que no caducan; máx. 8). **Clips** estilo reels en una pestaña del perfil (cuadrícula vertical + visor con scroll-snap; YouTube se reproduce embebido, TikTok/Kick/Twitch abren su enlace). Botones **«Ver su carta»** (perfil_publico ahora devuelve `ficha_id`) y **«Retar a duelo»** (`/duelos/?retar=<id>` abre «Lanzar reto» con ese rival). Si la migración falta, el perfil sigue funcionando sin historias/clips. Archivos: core/historias.js (puro, 6 tests nuevos → 113), features/muro/visor.js, api.js, pages/perfil.js, pages/duelos.js.
- ronda 93: MURO ajustes (migración 026 PENDIENTE de ejecutar por el usuario). «Publicar» solo icono en móvil. **Reacciones con cualquier emoji**: botón «+» con paleta de 40; en la BD `tipo` ahora ES el emoji (las 5 claves antiguas se convierten); las reacciones se ordenan de más a menos votada (claves antiguas suman a su emoji). Botones de **cambiar foto de perfil** (ventana con el mismo selector de Mi perfil) y **cambiar banner** (sube y guarda al instante) en el propio muro. **Hosting múltiple**: panel «Hosting» con varios juegos y varios parches/versiones por juego (+ «otro» a mano, máx. 5 juegos × 8 opciones) y interruptor «mostrar en mi perfil» (si está oculto, `perfil_publico` no devuelve ningún dato de host a los demás). Nuevo: core/hostCatalogo.js (puro), RPC `muro_guardar_host`, columnas `host_catalogo`/`host_visible`. El modal «Mi perfil» → Sistema Host ya NO edita juego/parche/versión/extras (se editan en el muro; las columnas antiguas quedan solo para precargar el panel). Tests: 116.
- ronda 94: MURO video, segmentos, compartir y Comunidad (migración 027 PENDIENTE de ejecutar por el usuario). **Ventanas flotantes** para crear historia y gestionar destacadas (`historiasUI.js`). **Videos propios** (≤ 15 s, ≤ 10 MB, mp4/webm/mov; bucket `muro-video`, máx. 3 por persona, por el 1 GB gratis de Supabase) en publicaciones, historias y clips; se validan en el navegador (`videoSubida.js`, `media.js`) y en la BD (`private.video_propio`, solo de este proyecto); al borrar, el servidor devuelve los archivos y la web los limpia del Storage. **Compartir** (publicación, clip, perfil): menú nativo o copiar enlace (`compartir.js`, `#p-<id>`/`#c-<id>`). **Segmentos por juego** opcionales (PES, SP, FIFA, EA FC, eFootball) con chips de filtro en el muro y en clips, y página **/comunidad/** (feed global con filtro, enlazada discreta en menú y pie). Corregido: `api.js` había perdido las funciones de 025/026 (lo detectó la prueba en navegador). Pruebas: 119 puras + navegador PC/móvil con mocks.
- ronda 96: migración 027 verificada en la BD (bucket `muro-video` 10 MB, 3 políticas, columna `juego`, 9 funciones con permisos correctos). Nuevo flujo `.github/workflows/keep-alive.yml`: consulta mínima a Supabase cada 3 días para que el plan gratuito no se pause (solo corre desde `main`; hasta «Subelo» solo se puede lanzar a mano).
- ronda 97: videos en Cloudflare R2 (parte 1: código listo, FALTAN los datos del usuario y la migración 028). `cloudflare/worker-videos.js` (Worker sin dependencias: valida sesión con Supabase Auth, tipo/peso/3 por persona, escribe en R2 por binding `VIDEOS`, borra solo en la carpeta propia, CORS cerrado a `ALLOWED_ORIGINS`) + `tests/worker-videos.test.mjs` (6 pruebas con R2 y Supabase simulados). Web: `config.js` `VIDEO_WORKER_URL` (vacío = sigue usando Supabase Storage), `api.subirVideo/quitarArchivo` hablan con el Worker, `archivoDeUrl` y proveedor `propio` reconocen `pub-<32 hex>.r2.dev`. Guía en `cloudflare/GUIA.md`. Límites siguen en 15 s, 10 MB, 3 videos.
- ronda 98: migración 028 (PENDIENTE de ejecutar por el usuario): `private.video_propio` acepta también el host exacto de su bucket R2 (`pub-4b6fbf5944a44d8391ccadff7dc09968.r2.dev`). Falta que el usuario cree el Worker y me pase su URL (`…workers.dev`) para fijar `VIDEO_WORKER_URL`.
- ronda 99: página Amigos: cada fila (amigos, solicitudes, buscar, seguidores…) tiene ahora un botón visible **Muro** que abre su perfil; antes solo se podía entrar pulsando el nombre, que no era evidente. (Respuesta a: no encontraba cómo entrar al muro de un amigo.)
- ronda 100: SOCIAL, revisión completa de lo que no se encontraba o no explicaba por qué fallaba. **Causa raíz** de que no saliera «Muro»/foto en Amigos y Mensajes: `loadPerfiles()` (duelos/data.js) no pedía `username` ni `avatar_url` (columnas públicas por grant) → ahora sí (la ronda 99 por sí sola no funcionaba). Perfil de otra persona: botones según MI relación (`core/red.accionesSociales`: Mensaje · Agregar amigo / Solicitud enviada·cancelar / Aceptar·Rechazar / Amigos ✓ · Seguir/Siguiendo · Bloquear), antes «Agregar» salía siempre; el candado de «solo amigos» explica el motivo y ofrece Agregar/Aceptar; sin sesión indica cómo entrar. Mensajes: si el servidor rechaza el chat (privacidad/bloqueo) aparece una tarjeta que lo explica con «Enviar solicitud» / «Aceptar su solicitud» / «Ver su perfil»; resultados de Nuevo chat con insignia de relación; «Ver su perfil y muro» en la cabecera del chat; autores y miembros de grupo son enlaces; textos vacíos con enlace a Amigos. Pruebas: 127 puras + navegador PC y móvil (sesión y RPC simulados).
- ronda 101: **Chat que se quedaba en «Cargando…»** (toast «No se pudieron cargar los mensajes»). Causa raíz: las políticas RLS de `mensajes_privados`/`conversaciones`/`conv_miembros` llaman a `private.es_miembro()`, y la migración 018 le había quitado EXECUTE a `authenticated`; las políticas se evalúan con el rol del usuario ⇒ «permission denied for function es_miembro» al LEER (enviar funcionaba porque va por RPC security definer). Mismo fallo latente en `private.es_lider_reto()` (política de `reto_espectadores`). Migración 029: dos GRANT EXECUTE a `authenticated` (seguro: funciones booleanas security definer en schema `private`, no expuesto por la API). **Ya aplicada en la base real** y verificada con un test en rollback como `authenticated` (mensajes=3, conversaciones=1, miembros=2, espectadores=0 sin error).
- ronda 102: Cloudflare R2 activado en el sitio: `VIDEO_WORKER_URL` por defecto = `https://phoenix-videos.phoenixevolutionseries.workers.dev` (config.js). El usuario dejó el Worker implementado con binding `VIDEOS`→`phoenix-videos` y 6 variables (verificado por captura: el Worker rechaza con 403 «Origen no permitido» sin cabecera Origin). **Falta que el usuario ejecute la migración 028** (si no, la base rechaza las URLs r2.dev) y pruebe una subida real desde `/borrador/`. Desde el entorno de Claude no se puede llegar a workers.dev (proxy), la prueba extremo a extremo la hace el usuario.
- ronda 103: SEGURIDAD fase 1 — **roles de staff + auditoría**. Roles: jugador < ayudante < moderador < admin, más **árbitro** (antes «comisario»; solo Tribunal). Migración `030_roles_staff_y_auditoria.sql` (**pendiente de ejecutar por el usuario en el SQL Editor**): CHECK de 5 roles, funciones `es_arbitro/es_moderador/es_staff`, políticas por tabla (insertar/editar = moderador+, **borrar = solo admin**), `noticias_lectura` deja ver borradores a moderadores, chat/feed cerrados a lectura directa, `auditoria_staff` inmutable (triggers bloquean UPDATE/DELETE/TRUNCATE) alimentada por `auditar_cambio` en 13 tablas, `asignar_rol` (solo admin, motivo obligatorio, no te quitas el rol a ti mismo) + `proteger_rol` como defensa en profundidad, RPC `auditoria_listar`/`auditoria_resumen` (admin ve todo, moderador solo lo suyo). Frontend: `core/roles.js` (permisos `can()`), `core/auditoria.js` (frases legibles), página `/auditoria/` (resumen por persona, línea de tiempo con filtros y detalle antes/después, panel «Equipo y roles» para admin), enlace de menú solo para staff, botón **Ocultar** en noticias, `borrarFilas` avisa si el borrado fue denegado (RLS devuelve 0 filas sin error). **Impacto cruzado:** botones de borrar solo para admin; nombres reservados ampliados (ayudante, arbitro, auditoria). Verificado: 147 tests, build y navegador (jugador denegado, moderador, admin, XSS escapado, móvil sin desbordes, aviso si falta la migración).
- ronda 104: SEGURIDAD fase 2 — **límites de ritmo**. Inventario: ya había límites dentro de funciones (mensajes 20/min, muro 10/h, respuestas 20/h, historias 15/día, clips 10/h, solicitudes pendientes ≤ 30). Huecos cubiertos en `031_limites_de_ritmo.sql` (**pendiente de ejecutar por el usuario**): trigger genérico `private.limitar_ritmo(columna, máx, ventana, mensaje)` BEFORE INSERT (exentos moderador+ y sesiones sin usuario) en retos 10/h, reacciones 120/h, seguir 60/h, reportes de chat 20/h, crear conversaciones 10/h, solicitudes de amistad 30/h, mensajes 300/h; tope de **5 retos abiertos** (BUSCANDO); tope de **300 fotos** por persona en el bucket `muro` vía `private.cuenta_fotos_muro` (security definer + GRANT a authenticated: una política que consulta su propia tabla da «infinite recursion»). 5 índices nuevos para que el conteo sea instantáneo. Probado en PGlite (24 comprobaciones, idempotente) y columnas/políticas verificadas contra la base real. **Límite honesto:** el intento rechazado hace rollback, así que NO queda registrado en la base (eso lo cubrirá la tabla de sanciones/alertas de las fases 3-4). Pendiente fuera de código: límites de registro/login en Supabase Auth (panel) y límites por usuario en el Worker de videos.
- ronda 105: SEGURIDAD fase 3 (parte BD) — **reportes, moderación y sanciones**, `032_reportes_moderacion_sanciones.sql` (**pendiente de ejecutar por el usuario; requiere la 031, ya aplicada**). Tablas `reportes` (6 tipos, foto del contenido al reportar, 1 reporte abierto por persona y objetivo) y `sanciones` (advertencia · suspensión 1-30 días · baneo); columna `oculto` en publicaciones/respuestas/clips/historias; RPC `reportar`, `reportes_listar` (ayudante+), `reporte_resolver` y `moderar_ocultar` y `sancionar` (moderador+, solo a rango estrictamente menor), `sancion_levantar` (baneo solo admin), `mi_sancion`, `sanciones_de`. **Candado:** trigger `zy_bloqueo_sancion` (BEFORE INSERT) en 11 tablas + política de Storage: una cuenta suspendida/baneada puede LEER pero no escribir, por cualquier vía. Todo queda en la auditoría 030 y avisa a la persona (notificación `MODERACION`). **Impacto cruzado:** reescribe 5 lectores del muro (`muro_de`, `muro_comunidad`, `clips_de`, `historias_de`, `muro_respuestas_de`) para esconder lo oculto; `reportar_mensaje` (botón del chat) ahora escribe en `reportes` (los reportes viejos de `reportes_chat` se migran); `core/auditoria.js` conoce las tablas nuevas. Probado en PGlite (74 comprobaciones, idempotente) y prerrequisitos verificados en la base real. **Falta (UI, siguiente paso):** botones «Reportar», página `/moderacion/`, aviso a la cuenta suspendida. Límites conocidos: una suspensión no bloquea editar ni aceptar solicitudes recibidas; el Worker de videos aún no consulta sanciones.
- ronda 106: SEGURIDAD fase 3 (parte web) — **interfaz de reportes, moderación y aviso de sanción** (la BD, 032, ya está aplicada). Módulos nuevos: `core/moderacion.js` (reglas puras: motivos, tipos, validadores, rangos, textos de sanción), `features/moderacion/{api,vista,acciones,aviso}.js` (RPC · HTML puro · modales · banner) y página `/moderacion/` (`pages/moderacion.astro` + `js/pages/moderacion.js`: pestañas abiertos/resueltos/descartados, «Cargar más» por id, resolver/descartar, ocultar/mostrar, sancionar, historial y levantar). Botones **Reportar** (todos con sesión) en perfil (cuenta, publicaciones, respuestas, historias, clips), comunidad y chat; **Ocultar/Sancionar** solo si `can(...)`. El `prompt()` del chat se sustituyó por el modal. Banner `#aviso-sancion` (consulta `mi_sancion`, caché 60 s en sessionStorage). Impacto cruzado: el menú pasó de un único permiso a **permiso por enlace** (`staff:` en `ACCOUNT_NAV`; Moderación = `verReportes`, Auditoría = `verAuditoria`); `features/chat/api.js` perdió su `reportar` (ahora delega en `moderacion/api.js`). El navegador solo muestra/oculta botones: la BD decide. Verificado con Playwright (jugador/ayudante/moderador/admin, PC y móvil 390 px, XSS, errores de BD en modal) y 159 tests.
- ronda 107: OLA A (1/2) — **menciones @usuario + preferencias de avisos**, `033_menciones_y_preferencias_de_avisos.sql` (**pendiente de ejecutar por el usuario; requiere 031 y 032, ya aplicadas**). BD: se **cuelgan triggers** de `muro_publicaciones`/`muro_respuestas` (no se reescribió ninguna función del muro): `private.extraer_menciones` (máx. 5, formato `@[A-Za-z0-9_]{1,20}`, no cuenta «correo@sitio.com»), `private.procesar_menciones` (respeta bloqueos, privacidad del muro y contenido oculto; anti-acoso: máx. 5 avisos/hora del mismo autor al mismo destino; tabla cerrada `menciones` con UNIQUE para que editar no vuelva a avisar; si algo falla la publicación se guarda igual). Avisos: tipo `MENCION`, columna `notificaciones.enlace` (solo rutas relativas, validada por CHECK), tabla cerrada `notif_preferencias` + trigger BEFORE INSERT `a_preferencias` en `notificaciones` que descarta lo apagado (cubre TODOS los orígenes de avisos, incluidos los antiguos) y RPC `mis_preferencias_notif`/`guardar_preferencia_notif`; categorías duelos/social/muro/menciones (moderación = «sistema», no se apaga). Web: `core/avisos.js` (reglas puras, `enlaceAvisoSeguro`), `features/avisos/api.js`, pestaña **Avisos** en `/amigos/`, `textoAHTML` ahora enlaza `@usuario` en la misma pasada que las URLs (una @ dentro de una URL no es mención; admite `urlPerfil` inyectado), la campana usa `enlace` (formato `#p-<id>` ya soportado por perfil) con reintento SIN esa columna si la 033 no está aplicada. Impacto cruzado: la campana y la pestaña degradan con mensaje claro si falta la 033. Verificado: 36 comprobaciones SQL en PGlite (idempotente), 165 tests, Playwright (PC/móvil, XSS, enlace malicioso ignorado, error al guardar revierte el interruptor). Límite conocido: el aviso lleva a la publicación solo si está entre las 20 más recientes del muro (si no, aviso amable).
- ronda 108: OLA A (2/2) — **guardados, búsqueda, sugerencias «a quién seguir» y autocompletado de @**, `034_guardados_busqueda_y_sugerencias.sql` (**pendiente de ejecutar por el usuario; requiere 031, 032 y 033**; activa la extensión `pg_trgm`). BD: ayudantes `private.item_publicacion`/`item_clip` (mismo formato que `muro_comunidad`: lo oculto, bloqueado o de muro privado devuelve null); tabla cerrada `guardados` (máx. 500, ritmo 120/h, se limpia al borrar la publicación/clip por trigger) y RPC `guardar_contenido`, `guardados_de`, `guardados_listar` (lo no visible se omite en silencio y reaparece si vuelve a ser visible); búsqueda `buscar_personas` (nombre o @usuario, comodines LIKE escapados, sin bloqueos) y `buscar_publicaciones` (texto completo en español con stemming, índice GIN; **bug cazado en pruebas**: el `row_number()` se calculaba antes del OFFSET y la 2.ª página salía vacía); `sugerencias_seguir` (puntaje explicable: 3·amigos en común + 2·seguidos por mis seguidos + club + país + actividad; respeta `ver_amigos='nadie'`; excluye amigos, seguidos, pendientes, bloqueos y descartados) + `sugerencia_descartar`. Web: `core/social.js` (puro), `features/social/{api,guardados,mencionAuto}.js`, tarjeta compartida `features/muro/tarjeta.js` (extraída de comunidad.js; la usan /comunidad/, /guardados/ y /buscar/), páginas `/guardados/` y `/buscar/` (+ enlaces en «Mi cuenta»), marcador en publicaciones (comunidad, perfil) y en el visor de clips, autocompletado de `@` en el compositor y en las respuestas (`data-menciones`). **Bug cazado en navegador**: con el selector abierto, Enter también enviaba la respuesta a medias → el selector ahora consume Enter/Tab/flechas/Escape en fase de captura con stopPropagation. Impacto cruzado: comunidad.js pasó a usar la tarjeta compartida (mismo comportamiento + botón guardar); todo degrada con mensaje claro si falta la 034 (marcadores no se muestran, páginas dicen «falta aplicar la migración 034»). Verificado: ≈60 comprobaciones SQL en PGlite (idempotente), 169 tests, ≈60 de Playwright (PC/móvil, XSS, errores de BD, sin sesión, paginación y tope de 100). Límites: sin tolerancia a erratas en la búsqueda de personas (solo «contiene»); la búsqueda exige sesión; sin edad no hay filtro de menores (pendiente de decisión del usuario).
- **ronda 109 · Ola B1 · Insignias y logros.** Migración `035_insignias_y_logros.sql`: catálogo en tabla (`logros_catalogo`, 18 logros, metas editables sin tocar código) + `logros_usuario`; `private.metricas_logros`/`evaluar_logros` (otorga y avisa solo lo NUEVO; relleno inicial silencioso); triggers AFTER a prueba de fallos en publicaciones, clips, seguidores, amistades y duelos→FINALIZADO; RPC `mis_logros()` (con progreso, y evalúa antigüedad al abrir) y `logros_de(usuario)` (respeta privacidad del muro); aviso `LOGRO` + categoría «logros» apagable. Web: `core/logros.js`, `features/logros/api.js`, página `/logros/`, franja de insignias en el perfil, icono en la campana, nav «Logros». Límite honesto: los duelos no guardan marcador → no hay logros de victorias; el host no cuenta como duelo jugado. Pruebas: PGlite `run35` (28 casos), 175 tests, Playwright t109.
- **ronda 110 · Ola B1b · Marcador confirmado por ambos líderes + estadísticas + logros de victorias.** Migración `036_marcador_confirmado_y_estadisticas.sql` (**pendiente de ejecutar por el usuario; requiere 035, ya aplicada**): tabla cerrada `resultados_duelo` (PROPUESTO→CONFIRMADO/DISPUTADO, máx. 3 intentos, luego moderación), RPC `proponer_resultado`, `responder_resultado`, `resolver_resultado_staff` (auditado), `resultado_de_reto`, `mis_resultados_pendientes`, `estadisticas_de`; helpers `lado_en_reto`/`jugadores_de_reto` (el host no juega; quien SALIÓ no cuenta); al confirmar sube `perfiles.partidos_jugados` y evalúa logros; 4 logros nuevos (victorias, «palabra de jugador») → catálogo = 22; avisos RESULTADO_PROPUESTO/CONFIRMADO/DISPUTADO. Web: `core/resultado.js`, `features/resultados/{api,panel}.js`, panel «Marcadores por confirmar» en /mis-partidos/, franja de estadísticas en el perfil, iconos en la campana. **Pendiente:** pantalla de moderación para `resolver_resultado_staff` (hoy solo existe la RPC). Pruebas: PGlite `run36` (≈45 casos), 180 tests, Playwright t110.
- **ronda 111 · MENORES (1/2) · fecha de nacimiento y categoría de edad.** Migración `037_edad_y_cuentas_de_menores.sql` (**pendiente de ejecutar por el usuario; requiere 030, 032 y 035**): tabla cerrada `edades` (la fecha NO la lee nadie), helpers `private.edad_de/categoria_edad/es_menor` (sin declarar = tratado como menor), RPC `mi_edad_estado`, `declarar_nacimiento` (una sola vez; <13 → baneo del sistema reutilizando el candado de la 032), `corregir_nacimiento_staff` (solo admin, motivo, auditado SIN la fecha exacta; levanta el baneo por edad si corrige a ≥13). Web: `core/edad.js`, `features/edad.js` (ventana NO cerrable a toda cuenta sin fecha; <13 → mensaje + cierre de sesión; si la función no existe o falla la red NO bloquea a nadie), cableado en `boot.js`. Límite: edad declarada, no verificada. **Pendiente: 038 = aplicar las restricciones a menores** (mensajes solo con amigos, búsqueda/sugerencias, muro por defecto). Pruebas: PGlite `run37` (35 casos, bordes de cumpleaños), 185 tests, Playwright t111.
- **ronda 112 · MENORES (2/2) · restricciones por edad.** Migración `038_restricciones_de_menores.sql` (**pendiente de ejecutar por el usuario; requiere 037, ya aplicada**). Helpers `private.es_staff_id`, `separados_por_edad` (menor vs no‑menor sin amistad, staff exento), `oculto_por_edad`. Reglas: `puede_escribir_a` ampliada (chats/grupos), trigger `zy_edad` en `mensajes_privados` (corta chats ya existentes) y en `amistades` (un adulto no pide amistad a un menor; el menor sí a un adulto), `puede_ver_muro` (muro de menor = amigos/él/staff), `buscar_personas` y `sugerencias_seguir` (copias exactas de la 034 + 1 condición). Errores genéricos (no revelan edad). Duelos NO cambian. Sin cambios de web (los mensajes del servidor ya se muestran). Límites: perfil_publico de un menor aún muestra su ficha por enlace directo (club/país); el menor puede aceptar a adultos que le pidan; la edad es declarada. Pruebas: PGlite `run38` (≈30 casos).
- **ronda 113 · Interruptor «Opciones de staff».** Pedido del usuario: botón para mostrar u ocultar las opciones de staff. `core/staffUi.js` (puro, almacén inyectado; clave `pes-staff-ui`, por defecto visibles; valor corrupto → visibles), `core/session.js` (`rolReal`, `tieneRolStaff`, `setStaffVisible`; `rolActual()` devuelve «jugador» con las opciones ocultas, así TODO lo que usa `can()/isAdmin()` —menús, botones de moderar, páginas de staff— se oculta a la vez y se repinta por `emit()`), botón en el menú del avatar (solo si la cuenta es de staff de verdad) con aviso. Solo cambia lo que se MUESTRA en ese navegador: la BD sigue decidiendo permisos. Pruebas: 188 tests, Playwright t112.
- **ronda 114 · Cola de «Marcadores en disputa» para el staff.** Migración `039_marcadores_en_disputa_para_staff.sql` (**pendiente de ejecutar por el usuario; requiere 036**): RPC de solo lectura `resultados_disputados(limite)` (solo moderador/admin; agotados primero). Web: `features/resultados/staffPanel.js` (+ `disputados()` en api.js), sección en `/moderacion/` con modal «Decidir marcador» (motivo ≥5, goles 0‑30; reutiliza `resolver_resultado_staff` de la 036, auditado). Un ayudante no ve la cola (la BD exige moderador). **038 verificada en vivo** (helpers, triggers `zy_edad` ×2, funciones reescritas). Pruebas: PGlite `run39`, 188 tests, Playwright t113.
- **ronda 115 · Ola B3 · Encuestas en el muro.** Migración `040_encuestas.sql` (**pendiente de ejecutar por el usuario; requiere 038, ya aplicada**): tablas cerradas `encuestas`/`encuesta_opciones`/`encuesta_votos`; una encuesta ES una publicación (se crea con `muro_publicar`: mismas reglas, 10/h, menciones, reportes, ocultar), 2‑4 opciones (≤40 car.), 1‑7 días, 1 voto cambiable mientras esté abierta, resultados visibles al votar/cerrar/ser autor; `crear_encuesta`, `votar_encuesta`, `encuestas_de(ids)` (respeta `puede_ver_muro`, oculto, bloqueos y menores); candado de sanciones + límites (5 encuestas/día, 120 votos/h). Web: `core/encuesta.js`, `features/encuestas/{api,estado,crearUI}.js` (un solo oyente global de votos; no invasivo: las encuestas se piden aparte por ids, como los guardados), integrada en la tarjeta compartida (comunidad/guardados/buscar) y en el muro del perfil + botón «Encuesta» en el composer. Sin la migración las publicaciones se ven igual. Pruebas: PGlite `run40` (≈33 casos), 193 tests, Playwright t114.
- **ronda 116 · Ola B4 · Feed «Siguiendo» y «Destacado».** Migración `041_feed_siguiendo_y_destacado.sql` (**pendiente de ejecutar por el usuario**): RPC `muro_siguiendo` (gente que sigues + amigos, cursor por id) y `muro_destacado` (puntuación = reactores distintos + 2×respondedores distintos, dividido entre (horas+2)^1.5; tus propias reacciones no cuentan; máx. 2 por autor; paginación por desplazamiento hasta 100). Web: `core/feed.js` (puro), `muro/api.js`, `/comunidad/` con pestañas Recientes/Siguiendo/Destacado (`?v=`), guardia contra respuestas viejas, Siguiendo exige sesión sin llamar al servidor. Pruebas: `feed.test.mjs`, `run41.mjs` (19 casos), Playwright t115.
- **ronda 117 · Ola B · Eventos de la comunidad.** Migración `042_eventos_de_comunidad.sql` (**pendiente de ejecutar por el usuario; requiere 030–036 y pg_cron**): tablas cerradas `eventos` y `evento_interesados`; RPC `crear_evento`/`editar_evento`/`cancelar_evento` (solo moderador/admin, auditadas con las acciones crear/editar/ocultar), `marcar_interes_evento`, `eventos_lista` (pública; solo cuenta interesados, nunca quiénes). Recordatorio: trabajo `recordar-eventos` de pg_cron (cada minuto, `private.recordar_eventos`) avisa 1 h antes a quien marcó «Avísame»; marca antes de avisar (sin duplicados) y tolera fallos con WARNING. Cambiar la hora rearma recordatorios y avisa; cancelar avisa. **Impacto cruzado:** tipo de aviso `EVENTO` y categoría apagable «eventos» (rehechas `categoria_notif`, `mis_preferencias_notif`, `guardar_preferencia_notif`; la restricción de tipos conserva los 25 anteriores). Web: `core/evento.js` (puro; hora de Lima fija -05:00), `features/eventos/api.js`, `pages/eventos.js` + `eventos.astro` (Próximos/Pasados, «Me interesa», casilla de recordatorio, formulario de staff con edición y cancelación con motivo sin diálogos), permiso `gestionarEventos`, enlace «Eventos» en el menú, icono/destino del aviso, categoría en Configuración, tabla «eventos» en la auditoría. Detectado al probar: la auditoría solo admite crear/editar/borrar/ocultar/rol/sancion/sistema; la comparación de hora en editar es por minuto (el formulario no trabaja con segundos). Pruebas: `evento.test.mjs` (8), `run42.mjs` (60 casos), Playwright t116 (23).
- **ronda 118 · «Eventos» en el menú de cuenta.** El enlace solo estaba en el menú de celular y el pie de página, y en PC no se encontraba. Ahora hay una entrada «Eventos» en `ACCOUNT_NAV` (junto a Logros). Verificado en navegador: el admin abre el menú, ve «Eventos» y llega al formulario «Nuevo evento».
- **ronda 119 · Cartas pequeñas: la réplica ahora se abre completa (Jugadores y Destacados en celular).** Causa: el CSS oculta stats y club en cartas < 135 px (`@container`), y la réplica antigua solo escalaba la carta pequeña, así que seguía sin stats (zoom mínimo de «Jugadores»; podio de «Jugadores Destacados» ≈ 106 px en celular). Arreglo: la réplica se reconstruye con ancho «normal» (celular 176 px, PC 250 px) centrada sobre la carta, nace con el tamaño de la original, viaja al centro (hasta 1,25×/1,6×) y vuelve al cerrar. Código: `core/replica.js` (geometría pura), `features/replicaCarta.js` (DOM, compartido), `pages/database.js` (usa el módulo; se eliminó la copia incrustada), `pages/central.js` (el podio abre réplica solo si la carta mide < 176 px; en PC se conserva el zoom CSS). Se permite encoger la réplica hasta 0,5× si no cabe (antes se salía de pantalla). Atenuado de la carta del podio (`.podio-origen`). Pruebas: `replica.test.mjs` (8), Playwright t118 (29 comprobaciones: celular y PC, zoom mínimo, 14 stats, cabe en pantalla, cerrar con toque/Esc/fuera, podio PC sin cambios).
- **ronda 120 · Un toque fuera de la carta solo la minimiza.** Pedido del usuario (celular): con la carta ampliada, tocar fuera no debe activar lo que hay debajo. `features/replicaCarta.js` crea un fondo transparente a pantalla completa (`.pcw-replica-fondo`, z-index 69, bajo la carta y sobre el encabezado y los botones) que absorbe el toque (`preventDefault` + `stopPropagation`) y solo cierra la réplica; se quita al empezar a cerrar para que la pantalla responda de inmediato. Efecto colateral deliberado: tocar OTRA carta con una abierta solo minimiza (hace falta un segundo toque para abrir la nueva), igual que ya pasaba en «Jugadores» con el mouse. Pruebas Playwright t118/t119: tocar el enlace «Todos», la campana, el botón «+» del zoom y otra carta con la réplica abierta solo la minimiza; tras cerrar, todo vuelve a responder.
- **ronda 121 · Ola B5 · Clanes (migración 043 + `/clanes/`).** Clan = grupo permanente (nombre 3–24, etiqueta [ABC], descripción, capitán), una sola pertenencia por persona, 2–15 miembros. Solo ADULTOS fundan, son capitán/subcapitán o votan; los menores pueden ser miembros si no hay separación por edad (038) ni bloqueo con ningún miembro. Ingreso por invitación (capitán/subcapitán) o solicitud (la aceptan ellos). Capitán que se va o borra su cuenta → votación de 48 h entre adultos con ≥5 días en el clan (un voto cambiable por persona; empate → más antiguo; cierre anticipado con MÁS del 70 % de los adultos; sin votos → subcapitán adulto, si no el adulto más antiguo; un solo adulto → capitán al instante; sin adultos → clan disuelto). Destitución: pedido de >70 % de los adultos abre la misma votación (sin votos, el capitán sigue). Capitanía también se puede ceder directamente. Moderación (moderador/admin): ocultar clan y sacar gente, ambos auditados. Aviso tipo CLAN (categoría «social»). Cron `procesar-clanes` cada minuto (cierra votaciones vencidas y repara clanes sin capitán). Web: `core/clan.js` (puro), `features/clanes/api.js`, `pages/clanes.js`+`clanes.astro`, chip [ETIQUETA] en el perfil, entrada «Clanes» en menú, permiso `gestionarClanes`, `tests/clan.test.mjs`. Prueba PGlite `run43.mjs` (todo OK) y 220 pruebas del proyecto. **Falta que el usuario pegue 043 en el SQL Editor.** Fuera de alcance: chat de clan, estadísticas por clan, duelos clan vs clan.
- **ronda 122 · Ola C (1/5) · Valoraciones post-partido y reputación (migración 044).** Tras un duelo con marcador CONFIRMADO (plazo 14 días) puedes valorar a quienes jugaron en el bando contrario (no al host ni a tu bando): 1–5 estrellas + etiquetas (positivas: puntual, buena_conexion, deportivo · negativas: lag, abandono, insultos; 1–2★ exigen etiqueta negativa, 4–5★ no admiten negativas). Anti-abuso: valoración CIEGA (cuenta cuando el otro también valora, o a los 3 días), peso 1/n para la n-ésima valoración de la misma persona hacia la misma, tope 40/día, sancionados bloqueados, moderación puede ver y anular (auditado 'borrar'/'valoraciones'). Puntaje bayesiano (5·4.0 + Σpeso·★)/(5 + Σpeso); niveles nuevo (<3 valoraciones, sin número) · novato · confiable (≥3.8) · veterano (≥4.4 y ≥8) · leyenda (≥4.7 y ≥20). Se calcula al leer (sin tabla resumen: no hay nada que desincronizar). Visible para quien puede ver el muro. Web: `core/reputacion.js` (puro), `features/valoraciones/{api,panel}.js`, bloque «Valora a tus rivales» en Mis partidos, sello de nivel en el perfil, `tests/reputacion.test.mjs`. PGlite `run44.mjs` OK. Pendiente: pegar 044 en Supabase. Sin hacer: ejes separados (puntualidad/host) — hoy van como etiquetas; UI de moderación para anular (la RPC existe).
- **ronda 123 · Botón de moderación para valoraciones.** Migración 044 aplicada y verificada en Supabase. En el perfil de otra persona, moderador/admin (permiso `moderarValoraciones`) ve «Valoraciones»: modal con las últimas 50 recibidas (autor, estrellas, etiquetas) y botón «Anular» con motivo obligatorio (auditado). `features/valoraciones/staff.js`. Sigue sin hacer: separar puntualidad/host como ejes propios.
- **ronda 124 · Ola C (2/5) · Tarjeta de resultado para compartir (solo web, sin migración).** En «Mis partidos» → historial, cada partido terminado tiene «Tarjeta de resultado»: pide a la BD el marcador (`resultado_de_reto`), y solo si está CONFIRMADO dibuja una imagen 1080×1080 (canvas) con VICTORIA/EMPATE/DERROTA desde TU lado, marcador, bandos, formato, plataforma y fecha; la comparte con el menú del sistema (celular) o la descarga. `core/tarjetaResultado.js` (puro: textos/colores), `features/resultados/tarjeta.js` (dibujo y compartir), `cardHistorial(r, id, {tarjeta})`, `tests/tarjetaResultado.test.mjs`. El dibujo en canvas no se probó visualmente (solo la lógica pura y la compilación). El perfil competitivo ya existía (estadísticas 036 + reputación 044).
- **ronda 125 · Ola C (3/5) · «En el radar ahora» en Comunidad (solo web).** El radar de presencia (Realtime Presence, estados libre / esperando rival / en partida) ya existía dentro de Duelos y ya cubría la búsqueda de rival; faltaba verlo fuera. `features/presence.js` + `observarPresence()` (mirar sin aparecer), tarjeta en `/comunidad/` solo con sesión, con botón «Retar» a `duelos/?retar=<id>` (enlace que ya existía). El estado `ocupado` ahora se llama «En partida». Presence sigue siendo cosmético (lo declara cada cliente; la BD decide permisos). No se probó con dos sesiones reales.
- **ronda 126 · Ola C (4/5) · Temporadas mensuales, dos rankings y retos semanales (migración 045 + `/ranking/`).** Temporada = mes calendario en Lima (UTC-05 fijo); semana = lunes–domingo. Ranking COMPETITIVO: solo marcadores CONFIRMADOS del mes, victoria 3 / empate 1, desempate dif. goles → goles a favor → menos partidos. Ranking de RETOS: suma de puntos de retos semanales cobrados en el mes. Catálogo fijo (`private.catalogo_retos_semanales`): jugar3 (30), rivales2 (30), ganar2 (40), valorar2 (20); el progreso se calcula al leer desde datos reales; `cobrar_reto_semanal` es explícito, 1 vez por reto y semana (advisory lock contra doble clic), solo la semana en curso. Rankings solo muestran a quien puede verse su muro. Tabla cerrada `retos_semanales_cobros`. Web: `core/rankingComunidad.js` (puro), `features/ranking/api.js`, `pages/ranking.js`+`ranking.astro` (pestañas Competitivo/Retos, selector de 6 meses, panel de retos con barra y «Cobrar»), entrada «Ranking» en menú, `tests/rankingComunidad.test.mjs`. PGlite `run45.mjs` OK. Pendiente: pegar 045 en Supabase. Riesgo conocido: dos amigos pueden fabricar partidos confirmados entre sí; lo mitiga «rivales distintos» pero no lo impide (se podría limitar partidos contados por pareja/día). Sin premios en tokens todavía.
- **ronda 127 · Ola C (5/5) · Puente con Discord por webhook (migración 046 + 046b).** Sin bot: la URL del webhook vive en Supabase Vault (secreto `discord_webhook`; solo se acepta `https://discord.com/api/webhooks/<id>/<token>`), se envía con `pg_net`. (1) RESUMEN DIARIO a las 08:00 Lima (cron `resumen-discord`, 13:00 UTC): partidos confirmados ayer, top 3 competitivo del mes, eventos de las próximas 24 h; si no hay nada, se omite. (2) AVISO al crear un evento (trigger `zz_discord_evento`). Sin menciones (`allowed_mentions` vacío), texto limpiado, solo datos públicos, una vez por (tipo, clave) en `discord_envios` (cerrada), y un fallo de Discord nunca bloquea la acción. Sin configurar no hace nada. Probar desde el SQL Editor: `select private.discord_probar();`. `046b_configurar_discord.sql` es la única línea que el usuario edita (su URL). PGlite `run46.mjs` OK con stubs de net/vault. Sin interfaz web (todo por SQL). Pendiente: el usuario crea el webhook y lo configura. REGLA DEL USUARIO (05/10): los .sql que se le envían van SOLO con código, sin comentarios ni anotaciones (se envían copias limpias; los archivos del repo conservan comentarios).
- **ronda 128 · Fase 5 · Respaldos y vigilancia de uso (migración 047 + `respaldo.yml` + `RESPALDOS.md`).** El proyecto está en plan GRATUITO (sin copias automáticas). (a) Flujo `.github/workflows/respaldo.yml`: cada domingo `pg_dump` (cliente PG 17) de los esquemas `public` y `auth` → verificado con `pg_restore --list` → CIFRADO con gpg AES-256 (el repo es público) → artefacto 90 días. Necesita secretos `SUPABASE_DB_URL` (Session pooler, IPv4) y `BACKUP_PASSPHRASE`; probar con «Run workflow»; los cron de GitHub solo corren desde `main`. No cubre Storage, config del panel ni Vault. Guía de restauración en `RESPALDOS.md`. NO se pudo probar el flujo aquí (solo YAML válido). (b) Migración 047: `private.vigilar_uso()` diario 08:30 Lima (cron `vigilar-uso`): mide base de datos (500 MB) y archivos (1 GB) y avisa por Discord al 70 % («atención») y 90 % («crítico»), una vez por día y nivel; reutiliza `discord_envios` (constraint ampliada con tipo 'uso'). PGlite `run47.mjs` OK. Pendiente del usuario: pegar 047, crear los 2 secretos en GitHub y probar el flujo.
- **ronda 129 · Cierre de exposición: país y club de menores (migración 048).** `perfiles` es legible por anon (tabla con SELECT completo) y `perfil_publico`/búsquedas devolvían `club_favorito` y `pais_codigo` también de menores. Se arregló en el ORIGEN: trigger `zy_sin_datos_de_menor` en perfiles (menor 13–17 o bloqueado <13 ⇒ ambos campos NULL en cualquier alta/cambio), trigger `zz_limpiar_perfil_de_menor` en edades (al declarar/corregir edad como menor se borran) y limpieza única de los existentes. Quien NO ha declarado edad conserva sus datos (residual conocido: no se puede saber). Aviso en el formulario de perfil. PGlite `run48.mjs` OK. Pendiente: pegar 048. Sigue abierto: el resto de columnas de `perfiles` (p. ej. `rol`, `puede_hostear`) también son legibles por anon; si se quisiera cerrar, habría que migrar lecturas a RPC.
- **ronda 130 · Decisiones del panel de Supabase (sin código).** (a) «Leaked password protection» es solo del plan Pro: NO aplicable en el plan gratuito; se descarta hasta que se pase a Pro. (b) Contraseña mínima y límites de intentos (Rate Limits): el usuario decidió DEJAR los valores por defecto (mínimo 8 en el formulario de registro). Riesgo conocido: el correo integrado del plan gratuito permite muy pocos correos por hora; si se exige confirmación de correo y hay un pico de registros, algunos no recibirían el suyo. Los avisos del asesor de seguridad (funciones `security definer` ejecutables, tablas con RLS sin políticas) son por diseño. Webhook de Discord: pendiente, lo hará el usuario más adelante (línea en `046b_configurar_discord.sql`). Secretos de GitHub `SUPABASE_DB_URL` y `BACKUP_PASSPHRASE`: creados por el usuario; falta probar el flujo `respaldo.yml` a mano tras publicar en `main`.

- **ronda 131** · Economía (1/3, 2/3 y 3/3 con `051_pagos_con_dinero_real.sql`: órdenes, términos, acreditación idempotente, reembolso/disputa, interruptor apagado; esqueleto `supabase/functions/pago-webhook`): `049_economia_tokens_y_xp.sql` (XP, niveles, billetera de tokens con libro idempotente, reglas de ganancia con tope diario, pago automático por partidos/valoraciones/retos semanales) y `050_tienda_virtual.sql` (catálogo cosmético con estilo validado, inventario, compra atómica, equipar uno por categoría, admin auditado). Probadas en PGlite; sin aplicar en vivo aún.

- **ronda 132** · Web de la economía: `core/economia.js` (puro, estilos saneados), `features/economia/api.js`, página `/tienda/` (cartera, catálogo, inventario, cómo ganar, compra de tokens con términos, historial, panel admin), nivel/título/marco/color de clan en el perfil, permiso `administrarTienda`, auditoría, `ECONOMIA.md`, 241 pruebas.

- **ronda 133** · Fin de los cuadros del navegador: `core/dialogo.js` (`confirmar`, `pedirTexto`, con el diseño del sitio, z-index 2000) reemplaza los 21 `confirm/prompt` de historias, visor, compartir, mensajes, amigos, perfil, base de datos, en vivo, ajustes, clanes y tienda. Regla: **nunca** usar `window.confirm/prompt/alert`.

- **ronda 134** · Rediseño de Central (reversible: etiqueta `pre-rediseno-central`, o `git revert` del commit): barra única con la fecha, «Tu próximo partido» (si hay sesión y juegas), destacado con escudos flotantes y botón, tarjetas de partido con escudo y estado, Posiciones top 5 + tu fila con barras (sin scroll interno), XI bajo los partidos, entradas animadas (`features/reveal.js`, respeta «reducir movimiento»), cifras del pulso que cuentan. Lógica pura probada: `partidoDe`, `recorteTabla`, `pasoCuenta`.

- **ronda 135** · Portada «viva» (reversible con `git revert`; punto anterior: etiqueta `pre-rediseno-central`): `core/inicio.js` (saludo, pasos de bienvenida con progreso regalado, anillo), `features/carrusel.js` (scroll-snap, flechas, puntos, teclado, avance automático que se pausa con mouse/foco/pestaña oculta/reducir movimiento), `features/inicio/{espacio,ahora,tienda}.js` y `pages/inicio.js`. Orden nuevo: portada → **Tu espacio** (visita: camino de bienvenida 1/6 ya regalado + CTA; con sesión: nivel, tokens, retos semanales, siguiente paso) → **Pasa ahora** (carrusel: evento, noticia, retos abiertos + invitaciones fijas) → Competiciones → Central de partidos (sin el XI) → **Lo mejor de la fecha** (Top 3 / XI ideal con pestañas) → **Vitrina de la tienda** (carrusel) → Highlights → Discord. Todo con tiempo máximo de espera y fallos silenciosos.

- **ronda 136** · Jerarquía visual de la portada: hero en dos columnas (mensaje + CTA único según sesión + 4 cifras a la izquierda; tarjeta «Hoy en la Galaxy» a la derecha con partido destacado, próximo evento con cuenta atrás y líderes de la tabla), cabeceras de sección unificadas (`.sec-head` + icono), navegación pegada con marca de la sección actual (`features/inicio/navegacion.js`, mide la parte visible de la cabecera porque la cinta de «Última hora» se esconde al bajar), más aire entre bloques.

- **ronda 137** · Navegación por secciones (decisiones del usuario: móvil = menú hamburguesa ordenado; Noticias = visibles en Inicio vía «Pasa ahora» y su página dentro de Comunidad): `data/site.js` define `SECCIONES` (Inicio · Jugar · Liga · Comunidad · Tienda) con `seccionDe` y `rutaDeSeccion`; cabecera de PC con desplegables (CSS puro: hover y foco), menú móvil como acordeón por sección, `components/SubNav.astro` con pestañas de la sección en cada página, «Mi cuenta» reducida a perfil, muro, logros, guardados, ajustes y staff. Nombres en español (Central→Inicio, Duelos→Sala de duelos, Database→Jugadores). Para añadir una página: UNA línea en `items` de su sección.

- **ronda 138** — Encontrabilidad: lanzador «¿Qué quieres hacer?» (8 baldosas con avisos vivos de retos/evento) bajo el hero de la portada; se quitó la barra `#sec-nav` de la portada; buscador global (lupa en cabecera, tecla `/` o Ctrl+K): páginas por nombre/sinónimo (`core/buscador.js`, con test) + personas. Retroceso: `git revert` de este commit.

- **ronda 139** — Vuelta a la identidad original: la portada (`index.astro`, `pages/central.js`) se restauró tal cual estaba antes del rediseño (tag `pre-rediseno-central`). Se conservan el menú de 5 secciones y el buscador global. Se quitaron lanzador, carruseles y tarjeta Hoy (la versión anterior sigue en el commit 2433b97).

- **ronda 141** — Se quitó «Explora la Galaxy» (revert de e961cb3): la portada queda con el diseño base original, con lupa y menú de 5 secciones. Probadas 3 variantes (cinta/fichas/contadores ampliados) solo en pantalla, sin publicar.

- **ronda 142** — Navegación devuelta al menú anterior (cabecera + hamburguesa, sin las 5 secciones ni SubNav); se conserva la lupa/buscador global (ahora indexa NAV, NAV_EXTRA y Mi cuenta). Para reponer las 5 secciones: commit 394f2f9.

- **ronda 143** — Liga: (1) selector de liga arriba (Galaxy League | Nueva liga; una a la vez, el enlace `#liga-…` recuerda; para volver basta pulsar Galaxy League) — la «Nueva liga» es un borrador en `data/ligas.js` (`enCentral:false`, no sale en Central); (2) tabla más compacta (filas bajas, club en la misma línea, GF/GC solo en pantallas muy anchas); (3) columna «Últimos» navegable: flechas, rueda o arrastre del ratón recorren todos los partidos anteriores (`historial()` en `core/ligaStats.js`, con test), tooltip con fecha/marcador/rival. Retroceso: revertir este commit.

- **ronda 144** — Liga: tabla devuelta a su tamaño original (se conserva la columna «Últimos» navegable, ahora con contador «4–8/8»). «Resultados» muestra «X de 22 fechas» + barra de progreso (`totalFechas()` deducido del formato, con test) y el selector dice «Fecha 8 de 22». Diseño más sutil e interactivo: selector de liga con piedra deslizante, filas que entran escalonadas, tarjetas que reaccionan, y tocar un jugador de la tabla resalta sus partidos en Resultados (con chip para quitarlo).

- **ronda 145** — Liga Sudario (reemplaza a «Nueva liga», id `sudario`, `enCentral:false`): 12 jugadores en `EDICIONES.sudario` (campo `jugadores`, sin fechas por ahora; `nombreEnEdicion` lo lee), clubes propios, tabla con ceros y «Fechas por confirmar». Separada de la Galaxy (otra edición/tabla/clubes). 9 fichas nuevas creadas en la base (media 80, todas las stats 80): Benyamin, Brochas, Jordan, Mauri, José Reyes, Julio Cesar, Joao, Spidercat, Sudario17. Beto, Morgado y Victor ya existían (no se duplicaron). Pendiente: fechas/resultados cuando el usuario los tenga.

- **ronda 146** — Escudos reales de clubes: `core/escudos.js` (`escudoDe`/`escudoHTML`, alias de nombres, test) con imágenes de crests.football-data.org; se muestran en la carta del jugador, perfil, comparador y tabla de Liga. Si la imagen no carga queda el escudito genérico. Pendiente recomendado: alojar los PNG en `/public/escudos/` (cambiar BASE_URL). Los escudos son marcas de cada club: uso/permisos son responsabilidad del usuario.

- **ronda 147** — Liga › Resultados: cada partido lleva los escudos de ambos clubes junto a los nombres, y sobre la lista de cada fecha hay una tira de una sola línea con todos los escudos de esa fecha (con el nombre al pasar el cursor).

- **ronda 148** — Noticias: CATÁLOGO DE PLANTILLAS. 22 tarjetas + 4 destacadas + 6 diseños de lector (`core/noticiasPlantillas.js` catálogo y motor, `features/noticias/tarjetas.js` dibujo, `features/noticias/catalogo.js` galería con vista previa, CSS `.nt-*`/`.nl-*`). Cada noticia guarda `plantilla` + `estilo` (acento, forma, brillo, animación, letra, lectura) — migración 052 YA aplicada en la base. Modo «auto»: elige y rota diseños para que no se repitan (no repite plantilla en 3 seguidas ni mismo color+forma en dos). Admin: botón «Catálogo de diseños» en Noticias, «Rediseñar» en el lector y «Elegir diseño» en el editor; «Sorprenderme» genera un estilo al azar. Para sumar una plantilla: entrada en TARJETAS + dibujo en tarjetas.js (el test avisa si falta). Si una imagen falla se muestra degradado.

- **ronda 149** — Texto de juego en Liga: Galaxy League = «Pro Evolution Soccer (Conmegol Patch)»; Liga Sudario = «SP Football Life 26» (`juego` en `data/ligas.js`).

- **ronda 150** — Jugadores: con una carta ampliada, un clic sobre ella abre la biografía del jugador (`jugador/?id=`); clic en el fondo, Esc o clic en otra carta siguen cerrándola. Opción `alClicCarta` en `features/replicaCarta.js` (solo Jugadores la usa; el podio de Central no cambia).

- **ronda 151** — Texto del parche corregido: se llama «Conmegol» (no «Conmebol»). No volver a «corregirlo».

- **ronda 152** — Galaxy League fecha 9: Axel 0–3 Arens (el usuario pidió «victoria de Arens 3-0 sobre Arens»; el único rival de Arens en la fecha 9 es Axel, así que se cargó contra Axel).

- **ronda 153** — Quiénes somos: roles Fralex = CEO, Jack = Presidente, Hugo = Vicepresidente (se quitó «Fundador»), con descripciones más profesionales (`data/organizadores.js`).
- **ronda 154** — Liga Sudario: zonas de ascenso/descenso/copa y sistema de divisiones PROPIO (`SISTEMAS_LIGA` en `data/temporada.js`, `zonasLiga` en `core/temporada.js`; no se mezcla con Galaxy). Perfil de jugador: sección de campaña rediseñada (escudos del club y de cada rival, barra de avance, G-E-P y goles en barras, tarjetas por rival, insignia de zona).
- **ronda 155** — Inicio: se oculta «XI ideal de la fecha» (era solo demo). `central.js` ya no falla si falta el bloque; para volver a mostrarlo, restaurar `#xi-det` en `index.astro`.
- **ronda 156** — Liga: la etiqueta del selector ahora dice «Ligas activas».
- **ronda 157** — Liga: al elegir Sudario la página cambia a paleta azul + dorado (`html[data-tema]` puesto por `liga.js` y por el script de arranque; variables `--color-galaxy-*` remapeadas en `components.css`). Galaxy conserva cian/púrpura.
- **ronda 158** — Liga: chips «Sede» y «Organizador» en la portada de cada liga (Galaxy: Perú / Jack; Sudario: España / Sudario17 — SUPUESTO, confirmar). El organizador enlaza a su carta (`jugador/?id=`) buscándolo en Jugadores por nombre/apodo (`liga.js`).
- **ronda 159** — Sudario: se quita la zona de ascenso (`suben: 0` en `SISTEMAS_LIGA`; Div. 2 aún no existe) y la leyenda enlaza a la nueva página `/sudario-divisiones/` (estática, tema azul/dorado: escalera de divisiones, tabla con zonas copa/descenso). Incompleta a propósito.
- **ronda 160** — Liga: el organizador pasa de chip pequeño a insignia grande `.liga-org` (ícono, etiqueta, nombre grande, brillo al pasar el cursor; dorada en Sudario).
- **ronda 161** — Páginas de divisiones (`/temporada/` Galaxy y `/sudario-divisiones/`): selector «Ligas activas» (componente `SelectorDivisiones.astro`) para saltar de una a otra.
- **ronda 162** — Liga: organizador, sede, edición y jugadores van en UNA sola fila alineada al centro (antes eran dos filas desparejas); insignia del organizador un poco más compacta.
- **ronda 163** — Páginas de divisiones: flecha ← «volver al inicio de la liga» y el nombre de la liga activa en el selector también vuelve a su liga (`/liga/#liga-<id>`); el otro nombre sigue yendo a las divisiones de esa liga.
- **ronda 164** — Central: escudos reales en el partido destacado (reemplazan la sigla de color si el club se conoce), en cada partido de Próximos/Resultados y en la tabla de Posiciones (`central.js`, con `escudoHTML`).
- **ronda 165** — Central: nueva pestaña «Por fecha» (selector F1…Fn con flechas): resultados y estadísticas de esa fecha (goles, promedio, empates, mayor goleada), tabla «Tras la fecha N» con ▲▼ de movimiento (aside) y partido destacado de esa fecha. Destacado automático (jugada: más goles; pendiente: mejor ubicados) y EDITABLE por moderador/admin (botón «Editar» + nota ≤140; «Volver al automático»). Tabla nueva `partido_destacado` (migración 053, aplicada en vivo; RLS `private.es_moderador()`). Lógica pura en `core/central.js` (`tablaTrasFecha`, `movimientosTabla`, `estadisticasFecha`, `destacadoAutomatico/Final`) con test.
- **ronda 166** — Central: el selector de fechas («Por fecha») pasa a la cabecera, entre el título «Central de partidos» y las pestañas, como píldora ‹ FECHA N › con flechas y estado (jugada/por jugar; en celular baja a una fila propia).
- **ronda 167 · EXPERIMENTO «más dinámico»** (todo reversible; cada pieza = un commit propio, se deshace con `git revert <hash>`, y además hay interruptores en `src/data/experimento.js`):
  1) *Escudos locales*: `ESCUDOS_LOCALES` en `core/escudos.js` (false = internet, true = `/public/escudos/`) + flujo `.github/workflows/escudos.yml` que los descarga SOLO en `borrador` y lo activa. Para volver atrás: ponerlo en false.
  2) *Transiciones entre páginas* (CSS `@view-transition`), *aparición al hacer scroll* (`features/reveal.js`) y *esqueletos de carga* (`.esqueleto`): interruptores `transiciones`, `reveal`, `esqueletos`.
  3) *Rachas* y *novedades desde tu última visita* en Central: interruptores `rachas`, `visita`.
  (Rachas y novedades ya hechos: `rachas()` y `resultadosNuevos()` en `core/central.js`, con test. En «Próximos» el destacado automático ahora es un partido por jugar.)
  NO hecho aún: imágenes de portada (Unsplash) propias; cabecera común en todas las secciones.
- **ronda 168 · MINISECCIONES plegables** (preferencia del usuario: evitar scroll excesivo → lo poco relevante va detrás de un clic). Componente `components/Plegable.astro` (`<details>` nativo, estilos `.plegable` en components.css). Aplicado en: Inicio → «Highlights de la jornada»; Quiénes somos → «Cómo surgió la idea» y «Lo que nos mueve»; Temporada → «Reglas de la simulación», «Si la temporada terminara hoy» y «Copa Interdivisional» (se quitaron los títulos repetidos que pintaba `temporada.js`). Regla para lo que se construya después: contenido secundario o largo = `Plegable` cerrado.
- **ronda 169 · MARKETING: tarjetas para compartir** (experimento, interruptor `FX.compartir`): imagen 1080×1350 dibujada en canvas con escudos locales. «Compartir fecha» en Central (pestaña Por fecha) y «Compartir mi campaña» en el perfil del jugador (tema azul/dorado en Sudario). Ventana con Compartir (menú del celular), Descargar y Copiar texto; todo en el navegador, no sube nada. Archivos: `core/compartir.js` (datos, con test), `features/compartir.js` (dibujo/ventana). Estrategias siguientes sugeridas: ritual semanal (resumen/XI de la fecha), invitar con premio de tokens, bot de Discord.
- **ronda 170 · PUBLICADO a `main`** (el usuario dijo «Publícalo»): todo lo de `borrador` desde la ronda 041 hasta la 169. PWA (manifest/íconos primero; service worker/offline y tiendas después, cuando el diseño se asiente).

- **ronda 171 · «Pulso de la liga» (inspirado en pesbul.eu, hecho a nuestra manera)**: (1) `core/pulso.js` puro (+ `tests/pulso.test.mjs`, 8 pruebas): `estadoLiga`, `selloPartido`, `calcularElo` (base 1000, K 32, factor de goles tipo Elo de selecciones, cambios por fecha calculados con los puntos del inicio de la fecha → no depende del orden), `clubesMasUsados`, `indiceLiga`/`buscarEnLiga`. (2) Central: franja `#estado-liga` («Galaxy League · Fecha N en juego · x de y · % de la temporada», enlaza a Liga); sello «Oficial / Pendiente» en cada partido de «Por fecha» y «Resultados» (Oficial = marcador cargado desde CopaFácil por el staff); minisección plegada «Rankings de la liga» (ELO con ▲▼ de la última fecha + clubes más usados). (3) Página nueva `/unirme/` (guía de 5 pasos + FAQ plegable; textos en `data/unirme.js`), enlace en el hero, en `NAV_EXTRA` (menú/buscador) y en el footer. (4) Footer: fila «Explora» con accesos rápidos + botón de apoyo voluntario que SOLO aparece si se rellena `APOYO.href` en `data/site.js` (vacío por ahora; la pasarela de pagos sigue diferida). (5) Buscador global: sección «En la liga» (ligas, fechas, DT y clubes; carga perezosa al abrirlo). **Decisiones:** el ELO es complementario a la tabla (no la reemplaza); «Fecha en juego» = primera fecha con partidos pendientes (puede haber adelantados en la siguiente); no existe estado «en juego» por partido porque no hay dato fiable. **No copiado a propósito:** estética de PESBUL, su logo/textos, derivar todo a Discord. Verificado: 263 tests OK, build 30 páginas, capturas PC y móvil sin errores de consola. Pendiente: confirmar textos de `/unirme/` (la guía de Smash Soda se deriva al staff; no hay enlace oficial verificado) y publicar a `main` cuando el usuario diga «Súbelo».

- **ronda 172 · selector «Ligas activas» sobre la imagen**: en `pages/liga.astro` la barra ya no es una franja suelta encima de la portada; flota (`.liga-flota`, absoluta, con fondo difuminado) sobre la imagen de cada liga (Galaxy y Sudario comparten la misma barra). El hero gana `pt-28` en móvil para que la barra no tape el sello. Verificado en PC y móvil (en el sandbox la foto de fondo no carga: es externa).

- **ronda 173 · «Plataforma viva» (rondas A+B+C del análisis de PESBUL, con nuestra estética)**. **A:** rangos por ELO (`RANGOS`/`rangoElo`/`progresoRango` en `core/pulso.js`: Bronce <925 · Plata 925 · Oro 1025 · Platino 1100 · Diamante 1175; todos parten de 1000 = Plata; sin partidos no hay rango) con insignia en el ranking ELO y barra de progreso en el perfil (`features/rango.js`); estados especiales de partido vía campo opcional `estado: 'aplazado'|'wo'|'incidencia'` en `data/ligaResultados.js` (un estado que contradice los datos se ignora; aplazado = sin marcador y NO cuenta como jugado; wo/incidencia llevan marcador y cuentan) con sellos propios; barra de anclas pegajosa en Central (`.anclas`, abre las minisecciones plegadas al saltar); franja de estado con ping del servidor (se mide con la primera consulta del pulso); footer con tagline «Hecho por jugadores · Impulsado por la comunidad» y «Web en línea · actualizada el <fecha de compilación>». **B:** `/competiciones/` (una tarjeta por liga con su propia paleta: Sudario azul/dorado vía `[data-liga-tema]`; tarjeta honesta «Más competiciones · Próximamente») y `/historial/` (todos los partidos de todas las ligas; filtros liga/estado/texto, «fecha N» exacta, 15 por página, filtros en la URL; lógica en `core/partidosGlobal.js`). Ambas en `NAV_EXTRA` (menú, buscador, footer). **C:** detalle de partido con goles, minuto y asistencias: tabla `partido_goles` (migración **054, YA APLICADA en Supabase**; RLS lectura pública / escritura `private.es_moderador()`; ojo: se identifica con liga+edición+fecha+local+visitante porque las ediciones se llaman igual en ambas ligas), validación y rankings puros en `core/golesPartido.js`, modal `features/detallePartido.js` (cualquiera lo ve; el staff con `editarLiga` carga/borra goles con `confirmar`, nada de ventanas nativas), clic en cualquier partido de Central o del historial, y ranking de Goleadores/Asistentes en «Rankings de la liga» (solo aparece si hay goles cargados; los autogoles no cuentan). **Decisiones:** `lado` = a quién suma el gol en el marcador (en un autogol el goleador es del rival); asistente no permitido en penal/autogol; la revisión compara goles cargados vs marcador oficial y avisa si faltan o sobran. **No verificado en sandbox:** carga real de goles y el editor del staff (necesitan Supabase/sesión); el detalle sale con cabecera inmediata y goles al responder la red. Verificado: 267 tests OK, build 32 páginas, PC y móvil sin errores de consola. **Pendiente:** el staff debe cargar goles partido a partido para que aparezcan goleadores; barra lateral izquierda estilo Facebook (opinión dada, a decidir); publicar a `main` cuando diga «Súbelo».

- **ronda 174 · ELO solo para amistosos + barra lateral izquierda (experimento)**. **ELO:** por decisión del usuario NO se usa en la liga oficial (se quitó de Central y del perfil de campaña de `jugador.js`); ahora mide solo los duelos 1v1 con marcador CONFIRMADO por ambos líderes (Sala de Duelos). Migración **055 (YA APLICADA)**: `private.calcular_elo()` (misma fórmula que `calcularElo` en `core/pulso.js`; verificada con un caso: A 2-0 B → 1024/976, suma constante), `public.ranking_elo(p_limite)` y `public.elo_de(p_usuario)`, ambas respetando `puede_ver_muro` y sin ningún dato sensible. Hoy no hay duelos confirmados, así que el ranking sale vacío hasta que se jueguen. UI: pestaña **ELO** en `/ranking/` (con rangos Bronce→Diamante y explicación) y rango + barra de progreso en la franja de estadísticas del perfil (`perfil.js`, `S.elo`). Los **rangos se mantienen** (decisión del usuario). Central ahora tiene «Clubes y goleadores» (sin ELO). Ojo con el nombre: «Rango S» es de reputación/fair play; «Rango Oro» es de ELO (cosas distintas). **Barra lateral** (`FX.barraLateral` en `data/experimento.js`; pon `false` y desaparece todo): `components/BarraLateral.astro` + `features/barraLateral.js` + `core/barraLateral.js` (puro, con tests) + CSS `.barra-*`. Solo ≥1280 px: iconos plegados, se abre con mouse/teclado, botón «Fijar abierta» (se recuerda en localStorage); secciones Atajos · Ligas (con su paleta) · Mi cuenta (solo con sesión) · Amigos (hasta 8, punto verde si están en el radar de Duelos; es información cosmética de presencia). `presence.js`: `startPresence` ahora reemplaza un canal solo-observador (para que la barra no impida aparecer en el radar de Duelos). Verificado: 269 tests OK, build 32 páginas, capturas PC (plegada/abierta/fijada, tema Galaxy y Sudario), tablet y móvil sin barra, sin errores de consola. **No verificado en sandbox:** lista de amigos real y puntos de conexión (necesitan sesión/Supabase; se probó con datos simulados solo para la captura). **Pendiente:** ver cómo se siente la barra en uso real; decidir si queda o se quita; publicar a `main` cuando diga «Súbelo».
- **ronda 175 · sección «Social» (etapa 1)**. Pedido del usuario: una portada tipo red social (Facebook/Instagram/TikTok) con lo que publican todos, en la zona principal del menú (casi como un inicio), **aparte** de `/comunidad/` (que queda intacta). **Qué es:** `src/pages/social.astro` + `js/pages/social.js` → fila de historias (círculos con anillo Galaxy/Sudario; abre el visor de siempre) · compositor plegable (texto, foto/video por archivo o enlace, juego) · pestañas Recientes/Siguiendo/Destacado · filtro por juego dentro de un Plegable cerrado · feed con scroll infinito y pie de acciones (reaccionar de un toque + paleta de 16 emojis, responder = lleva al hilo del perfil, compartir). **Reutiliza** todo lo existente del muro (RPC `muro_comunidad/siguiendo/destacado/reaccionar/publicar`, `historia_publicar`, moderación, guardados, menciones, encuestas, límites de menores). **Nuevo:** `core/feedSocial.js` (puro, con `tests/feedSocial.test.mjs`), `features/muro/pieSocial.js`, `features/muro/compositor.js`; `tarjeta.js` acepta `opciones.pie` (opcional; /comunidad/ no cambia); `api.js` suma `historiasRecientes` y `misReacciones`. **BD (aplicadas en vivo):** `056_historias_recientes.sql` (`historias_recientes(p_limite)`: autores con historias vigentes, respeta privacidad/edad/ocultas) y `057_mis_reacciones.sql` (`mis_reacciones(p_ids)`: mis emojis por publicación). **Interruptor:** `FX.social` en `data/experimento.js` (false = sale del menú; la página sigue existiendo). Social va 2.º en `NAV` y en los atajos de la barra lateral. Buscador: sinónimos «red social, historias, feed…». **Pendiente (etapas 2 y 3):** visor vertical «Reels» a pantalla completa; respuestas dentro de la tarjeta (hoy el botón lleva al hilo en el muro); etiquetas #, explorar/tendencias; comprimir más las fotos si el Storage FREE (1 GB) se llena. **Verificado:** 274 pruebas OK, 33 páginas; capturas con datos simulados en PC y celular, Galaxy y Sudario, sin desbordes; reaccionar/paleta/pestañas probados. **No verificable en el sandbox:** subida real de archivos y datos reales (no hay red a Supabase).
- **ronda 176 · correcciones de la auditoría Impeccable (P1/P2 objetivos)**. Sin tocar la identidad (cian/púrpura, Sudario azul/dorado, gradiente, glass, mayúsculas con tracking: se mantienen a propósito). **Hecho:** (1) `/liga/`, `/sudario-divisiones/` y `temporada.js`: la tabla de posiciones queda en un contenedor `overflow-x-auto` (antes desbordaba a 471 px en celular de 390). (2) Pestañas `role="tab"` usan `aria-selected` en vez de `aria-pressed` (eventos, ranking, clanes, tienda, perfil, jugador + sus JS); `.adv-chip[aria-selected='true']` comparte estilo con `[aria-pressed='true']`; el selector de vista del catálogo de noticias pasa a `role="group"` (no tenía pestañas). (3) Contraste: `.forma-cont` y `.nt-foot` de #6b7280 a #9ca3af; chip activo ya no fuerza texto cian sobre fondo azul (queda blanco); estado vacío de Duelos en gray-400. (6) Regiones con scroll enfocables por teclado (`role="region"`, `tabindex="0"`, `aria-label`): tablas, escudos de Liga y panel de Central. (8) Curva con rebote `cubic-bezier(.3,1.6,.5,1)` sustituida por ease-out `(.22,1,.36,1)`. **Verificado:** 274 pruebas OK, 33 páginas, barrido axe en 40 vistas: de 8 rutas con fallos a 1 (`.nt-sello` de Noticias, color de acento por noticia, pendiente). **Pendiente (requiere visto bueno con antes/después):** subir texto menor a 12 px y objetivos táctiles menores a 24/44 px.
- **ronda 177 · texto mínimo 12 px + pie de página + CLAUDE.md**. Pedido: aceptar subir el texto pequeño tras ver el antes/después. **Texto:** todas las clases `text-[8|9|10|11px]` y `text-[.6rem]` pasan a `text-[12px]` (~535 usos) y toda regla CSS `font-size`/`font` menor a .75rem pasa a .75rem; medido en celular: 0 de 1989 textos por debajo de 12 px, sin desbordes horizontales en 40 vistas. **Pie:** `Footer.astro` con `pb-14` para que los botones flotantes «Historial» y «En vivo» no tapen el © en celular. **Nuevo `CLAUDE.md`** en la raíz (reglas de ramas, entorno, identidad, reglas del usuario) para que cualquier sesión nueva, en la nube o en su computadora, las herede. **Verificado:** 274 pruebas OK, 33 páginas. **Pendiente:** objetivos táctiles menores a 24/44 px; sello de Noticias (`.nt-sello`, color de acento por noticia).
- **ronda 178 · capa «dopamina» (movimiento táctil y juguetón, reversible)**. Pedido: lo más atractivo, dinámico e interactivo posible, sin perder identidad; revertible. **Interruptor:** `FX.dopamina` en `data/experimento.js` → atributo `html[data-fx-dopamina]`; con `false` (y reconstruir) todo vuelve a como estaba. **Archivos nuevos:** `styles/dopamina.css` (importado al final de `global.css`, todo acotado al atributo) y `js/features/dopamina.js` (`initDopamina`, `rafaga`, `salto`, `entrada`; arranca en `boot.js`). **Qué hace:** (1) botones, chips, pestañas, tarjetas-botón se hunden al presionar (`scale(.96)`, 140 ms); (2) ondulación al pulsar `.btn-primary`; (3) solo con mouse: tarjetas (partidos, tienda, publicaciones…) se elevan y una luz cian/dorada sigue el cursor; (4) en pantallas táctiles los hover con movimiento se anulan (no se «pegan»); (5) Social: entrada escalonada de las tarjetas (45 ms entre ellas, máx. 8; al cargar más solo se animan las nuevas); (6) Social: el anillo de historias nuevas gira (conic-gradient, usa los tokens de cada tema); (7) reaccionar: el emoji salta y sale una ráfaga de 7 partículas; publicar: ráfaga de 14 (🔥✨⚽🏆). **Limpieza Emil:** 2 `transition: all` sustituidos por propiedades exactas; 5 variantes de curva unificadas en `cubic-bezier(.22,1,.36,1)`; tokens `--ease-out`, `--ease-pop` (rebote leve solo en celebraciones), `--dur-press`. Todo con `prefers-reduced-motion`, solo `transform`/`opacity`, partículas con WAAPI y auto-limpieza. **Verificado:** 274 pruebas OK, 33 páginas, ráfaga (7 partículas, 0 a los 900 ms), anillo `dp-gira`, entrada escalonada y sin desbordes en PC y celular; barrido axe: 2 de 40 (solo `.nt-sello`). **Pendiente:** acortar las ~88 transiciones de interfaz >300 ms, menús que crecen desde su botón, animar contadores/podio si el usuario lo quiere.
- **ronda 179 · efectos visibles a primera vista (ampliación de dopamina)**. Motivo: tras la 178 el usuario dijo «no veo que cambió nada»: casi todo era de interacción (presionar, hover, reaccionar) y una página quieta se veía igual. **Añadido (misma bandera `FX.dopamina`):** (8) brillo que cruza `.btn-primary` y `.hero-cta-p` cada 4,6 s (pseudo `::after`, solo `transform`); (9) entrada escalonada (55 ms) de tarjetas (`.match-card`, `.liga-partido`, `.item-tienda`, `.lanza`, `.cat-item`, `.pulse-tile`, `a.slide-card`, `.liga-org`) cuando su sección aparece o llegan datos; usa `animation-fill-mode: backwards` (con `both` pisaría hover/tilt para siempre); (10) solo con mouse: inclinación 3D (±9°) de esas tarjetas siguiendo el cursor (`--rx/--ry` desde `features/dopamina.js`, atributo `data-tilt`). **Verificado en Chromium:** animación `dp-brillo` activa en Home y Liga, `dp-tarjeta` en tarjetas, `matrix3d` al pasar el mouse, sin desbordes; 274 pruebas OK. **Nota de despliegue:** el sandbox no llega a github.io; el push a `borrador` dispara `deploy.yml` (tarda 1–3 min) y conviene recargar sin caché en `/borrador/`. Falso positivo conocido del barrido axe en Central/PC (`button[data-v=proximos]`): aparece solo si se mide durante una transición.
- **ronda 180 · barra lateral moderna (sin scroll nativo)**. Queja del usuario: la barra izquierda «se ve anticuada» (captura con una barra de scroll blanca gruesa). **Causa:** `.barra-lat` tenía `scrollbar-width: thin`; esa propiedad estándar desactiva los estilos `::-webkit-scrollbar` y el navegador dibuja su barra nativa clara (visible solo cuando la ventana es baja y el contenido desborda). **Arreglo:** la barra ahora es una cápsula flotante (`left:.55rem`, `bottom:.8rem`, radio 1.25rem, cristal con blur, borde cian tenue, sombra), sin barra de scroll (`scrollbar-width:none`; el scroll sigue con rueda/touch/teclado) y con los bordes difuminados por `mask-image` para sugerir que hay más; al expandirse suma un resplandor cian. `main`/`footer` suben su `padding-left` a 4.9rem (15.9rem fijada) por el margen nuevo. **Global:** `base.css` fija `scrollbar-width: thin` + `scrollbar-color` galaxy-600/transparente en `html`, así todos los scrolls del sitio son finos y oscuros (los `-webkit-` quedan de respaldo). **Verificado:** pantalla corta (520 px de alto, rail desborda 591>387) sin barra visible; expandida al hover; 274 pruebas, 33 páginas, sin desbordes.
- **ronda 181 · indicador de scroll propio en la barra lateral**. Pedido: sin la barra nativa blanca, pero con «una pequeña barra de desplazamiento». **Qué es:** `montarIndicador(rail)` en `features/barraLateral.js` crea un elemento sticky de alto 0 (`.barra-ind`) con una barrita de 3 px (`.barra-ind-th`) pegada al borde derecho de la cápsula; su alto y posición salen de `clientHeight/scrollHeight/scrollTop` (solo `transform`), se recalculan en `scroll`, `ResizeObserver`, `MutationObserver` (cuando llegan los amigos) y `resize`. Visible al 50 % si la barra desborda, al 100 % al pasar el mouse o al desplazar (900 ms); oculta si todo cabe. `aria-hidden`, `pointer-events: none` (solo informa; no se arrastra). Usa `--color-galaxy-400` (cian en Galaxy, dorado en Sudario). Si falla, el `try/catch` deja la barra funcionando sin indicador. **Verificado:** a 520 px de alto la barrita viaja de y=14 a y=135 al desplazar y se oculta a 900 px; 274 pruebas, 33 páginas.
- **ronda 182 · «auditoría de atractivo» aplicada (count-up, estados vacíos, podio, aurora, celebraciones)**. Pedido: «analiza mi página al máximo según las skills… super atractiva y atrapante» → informe (capturas PC/móvil de Home, Liga, Social, Ranking, Tienda, Eventos) y luego «aplica todo eso». **Hecho:** (1) *Count-up* de los 4 contadores de Home: `core/contador.js` (lógica pura: `suavizar`, `duracionPara`, `valorEn`; ease-out exponencial, 600–1400 ms, valor inválido → `null` = se queda «—») + `contarHasta(el, n)` en `features/dopamina.js` (rAF; sin efecto/reduced-motion escribe el valor directo); `pages/central.js` lo usa en `contar()`. (2) *Móvil:* el hero de Home lleva `pb-16` para que los botones flotantes «Historial / En vivo» no tapen las tarjetas de cifras. (3) *Estados vacíos con personalidad:* `core/vacio.js` → `vacioHTML(texto,{icono,titulo,accion,error})` (escapa todo; icono validado `^fa-…$`), estilo `.vacio-vivo` en `components.css`, icono que flota en `dopamina.css`; aplicado en Tienda, Clanes, Buscar, Ranking (con botón «Ir a la Sala de Duelos») y el error del feed de Social (`error:true`, `role=alert`). Quedan ~28 vacíos antiguos sueltos por otras páginas (migrar poco a poco). (4) *Hero de Home vivo:* `.hero-aurora` (3 manchas cian/púrpura que derivan 17–23 s, solo `transform`, tras `FX.dopamina`). (5) *Liga:* `<aside class="liga-podio">` en la cabecera (≥1024 px) con el top 3 de la edición (escudo, PJ/G/E/P, puntos), calculado al construir con la misma tabla; entra escalonado. (6) *Celebraciones:* `rafaga()` al cobrar un reto (Ranking) y al comprar un objeto (Tienda). **Verificado en Chromium:** aurora con 3 animaciones, 3 filas de podio, 1 vacío en Ranking, sin errores de página; 281 pruebas (+7), 33 páginas. **No verificable en el entorno de IA:** datos reales (Supabase no alcanzable → contadores en «—»), sensación del mouse, despliegue en github.io.

- **ronda 183 · barrita de la barra lateral arrastrable y quieta**. Queja: la barrita no servía y «se esconde muy rápido» al acercar el puntero. **Causa:** estaba en el borde derecho de la cápsula; al pasar el mouse la cápsula se expande de 4 a 15 rem y la barrita se iba con ella; además tenía `pointer-events: none` (solo informaba). **Arreglo:** pasa al borde **izquierdo** (ese borde no se mueve al expandirse), se puede **arrastrar** (pointer events con captura, `touch-action: none`, zona de agarre invisible de 14 px), engorda a 5 px al pasar encima o arrastrar, y tarda 1,5 s en atenuarse. Sigue oculta si todo cabe y con `try/catch`.

- **ronda 184 · migración 058: salas Smash Soda (capa de datos, sin aplicar)**. Fase 2.1 del módulo 2 (`claude/modulo2-salas-arquitectura.md`). Decisiones de Fralex: abrir salas requiere aprobación de staff; visibilidad por defecto «amigos». **Impacto cruzado evitado:** `perfiles.puede_hostear` ya era el interruptor «Puedo ser host» de Duelos (lo pone el usuario), así que NO se reutiliza: el permiso nuevo es `perfiles.host_aprobado` (blindado por trigger: solo staff/backend; staff queda aprobado de entrada). Tablas: `codigos_emparejamiento` (sin políticas), `dispositivos_host`, `salas` (+`limite_espectadores` 4, una viva por PC, en Realtime), `salas_enlace` (ver ≠ entrar), `eventos_sala` (+tipo `caida`), `muestras_calidad`, `calidad_host_resumen`, `cuentas_parsec` (declarada → verificada). El cliente solo LEE por RLS; escribe por RPC (`generar_codigo_emparejamiento`, `revocar_dispositivo`, `renombrar_dispositivo`, `vincular_parsec`, `desvincular_parsec`, `configurar_sala`, `staff_aprobar_host`, `staff_cerrar_sala`, `staff_quitar_parsec`); la app escribe solo vía Edge Function (service_role). pg_cron: `salas-caidas` (cada min, 3 min sin latido), `salas-purga` (diaria, muestras 14 d), `salas-calidad` (cada hora, mediana/p95).

- **ronda 185 · Edge Function `phoenix` (API /v1 para Smash Soda) + contrato**. Fase 2.2. Desplegada (versión 1, `verify_jwt=false`: autentica con token de dispositivo `phx_…`, solo se guarda su SHA-256). URL base `…/functions/v1/phoenix/v1/`. Rutas: `GET config`, `POST emparejar`, `sala/abrir` (reabre la sala viva de la PC; devuelve lista de roles del reto: lado A mandos 1…n, espectadores/staff `pad_limit 0`), `sala/latido` (mín. 10 s; guarda muestras; verifica cuentas Parsec), `sala/cerrar` (idempotente), `eventos` (lotes ≤50, idempotentes por `clave`, un evento malo no tumba el lote). 19 códigos de error estables con `reintentable`. Lógica pura en `supabase/functions/phoenix/_lib/nucleo.js` (8 pruebas en `tests/phoenix-api.test.mjs`). Contrato completo en `docs/web-pes-link/contrato-v1.md` y en el proyecto (`claude/contrato-v1.md`). **Verificado en real** (vía pg_net): config 200, código falso 404 `CODIGO_NO_ENCONTRADO`, sin token 401 `TOKEN_FALTANTE`, token falso 401 `TOKEN_INVALIDO`, ruta rara 404. Falta probar el camino feliz completo (necesita un código generado desde la web: fase 3).

- **ronda 186 · tabla de Liga Sudario cargada sin fechas (`tablaOficial`)**. Pedido: actualizar la tabla con la imagen oficial del organizador, sin resultados por fecha. **Hecho:** `tablaOficial` en la edición de Sudario (`data/ligaResultados.js`) + `tablaEdicion(ed)` en `core/tabla.js` (usa la tabla oficial si existe; si no, calcula desde `fechas`; filas inválidas se descartan). Aplicado en Liga, Competiciones, Sudario-divisiones y Temporada. **Ojo:** la imagen trae 2 filas que no cuadran (Joao 0-1-4 = 1 pt pero dice 2; Julio Cesar 5 PJ pero G+E+P = 2 y 1 pt sin empates): se copiaron tal cual. Cuando haya fechas, borrar `tablaOficial`. 289 pruebas, 33 páginas.

- **ronda 186 · ampliación módulo 2: avisos al abrir sala, builds oficiales, control remoto (migración 059 + función phoenix v1.1.0, SIN desplegar hasta aplicar la 059)**. (1) `salas` + `publicar_en_pagina` (false = la sala se trata como privada salvo host/staff/reto), `avisar_amigos_host`, `avisar_amigos_jugadores`, `anunciar_discord`, `avisos_enviados`. `sistema_avisar_sala` (solo service_role): una vez por sala, anti-spam 30 min por host, recorta por quién puede ver la sala (`private.ve_sala`), bloqueos, «mostrar conexión» de cada jugador y la nueva categoría de avisos **«salas»** (tipo `SALA_ABIERTA`); Discord solo si sala pública, publicada y sin reto (tipo de envío `sala`). (2) `builds_oficiales` (huella SHA-256, versión, activo) + cabecera `X-Phoenix-Build`; errores `BUILD_NO_OFICIAL`, `BUILD_DESACTIVADO`, `VERSION_DESACTIVADA`; exigencia apagada (`exigir_build=false`) hasta registrar el primer build. Límite honesto documentado: la huella la reporta la app (frena errores, no atacantes). (3) `phoenix_config` (versión mín./recomendada, exigir_build, intervalos, interruptores; la función relee cada ≤60 s con frenos fijos) y `dispositivos_host.suspendido` (reversible) → `DISPOSITIVO_SUSPENDIDO`; `config` acepta token y devuelve `estado {app, build, dispositivo}`. RPC staff: `staff_registrar_build`, `staff_build_activo`, `staff_suspender_dispositivo`, `staff_config_phoenix`. Núcleo: `fusionarConfig`, `evaluarBuild` (10 pruebas). Tipos verificados con `deno check`. Contrato 1.1.0 en `docs/web-pes-link/contrato-v1.md` y proyecto. **Impacto en la web (paso 3):** la pantalla de preferencias de avisos debe mostrar la categoría «Salas».

- **ronda 187 · producto Phoenix Soda: instalador con código, perfiles de reglas, organizaciones (migración 060 + función phoenix v1.2.0, SIN desplegar hasta aplicar la 060; la 059 ya está aplicada)**. Fuente: `claude/smash-soda-producto.md`. (1) `codigos_instalacion` (`XXXX-XXXX`, 24 h, un uso, máx. 3/día; `generar_codigo_instalacion` solo hosts verificados) + `fuente_versiones` (staff publica versión/ruta/sha256) + bucket **privado** `fuente-phoenix` (sin políticas: solo service_role). Ruta `POST /v1/instalar`: canje atómico (`sistema_canjear_instalacion`) → URL firmada 15 min de la versión activa más alta; si la firma falla, el código se libera. (2) `perfiles_reglas` (3 globales sembrados con los campos de la tabla de modos + perfiles de torneo por organización; forma validada por `private.reglas_validas`); `salas` + `modo`, `organizacion`, `torneo_privado`, `perfil_reglas`, `reglas` (copia congelada). `sala/abrir` acepta `modo`/`torneo_privado_id` y devuelve `reglas` y `marca`; oficial exige reto y host neutral; `latido` devuelve modo/reglas (cambian en caliente). (3) `organizaciones` (marca, licencia desde/hasta, `al_vencer` amistoso|bloquear), `org_miembros` (dueño/staff/host), `torneos_privados`; RLS aísla por organización (salas de org solo las ven sus miembros, host y staff Phoenix). pg_cron `salas-licencias` (cada hora) degrada o cierra salas de licencias vencidas. RPC: `admin_guardar_org`, `org_guardar_miembro`, `org_guardar_marca`, `org_guardar_perfil_reglas`, `org_guardar_torneo`, `staff_guardar_perfil_global`, `staff_publicar_fuente`, `staff_fuente_activa`, `org_licencia_vigente`. Núcleo: `codigoInstalacion`, `marcaDe` (12 pruebas). Contrato 1.2.0 (secciones 11 instalador y 12 reglas). **Decisión por defecto:** host de organización también debe estar verificado por Phoenix.

- **ronda 188 · pruebas de conexión (migración 061 + función phoenix v1.3.0) + lógica web del pre-chequeo, SIN pantallas (el usuario hará un rediseño total antes)**. Fuente: `claude/smash-soda-producto.md` §5. Tabla única `pruebas_conexion` (tipos `autodiagnostico_host`, `prechequeo_web`, `prueba_sala`; Realtime; RLS: el medido, el host, staff y gestores de la organización; purga a 90 días). Semáforo con regla única en la BD (`private.semaforo`: manda la peor métrica) y umbrales opcionales `reglas.semaforo` por perfil (sembrados: amistoso 60/100, torneo 50/90, oficial 40/80). RPC web: `guardar_prechequeo` (máx. 20/h), `historial_ping_par` (agregados del par host↔jugador: muestras 14 d + pruebas en sala 90 d; solo el jugador, el host o staff). Rutas nuevas: `GET /v1/eco` (CORS + Timing-Allow-Origin, 60/min por IP, no toca la BD), `POST /v1/diagnostico` (sugiere bitrate total = 70 % de la subida y límite de espectadores), `POST /v1/sala/prueba` (semáforo + retraso sugerido = RTT/2, aplicado solo hasta `reglas.retraso_host_ms`, que pasa a ser el máximo permitido). Web: `core/conexion.js` (estadísticas, percentil, umbrales, semáforo; 5 pruebas) y `features/conexion/prechequeo.js` (`medirPrechequeo` con calentamiento + Resource Timing, `guardarPrechequeo`, `historialPar`, `escucharPruebasSala`). Contrato 1.3.0 (§13–16). **Límite honesto:** el pre-chequeo del navegador mide tu internet contra Supabase, no el camino hasta el host.

- **ronda 189 · función phoenix v1.3.0 DESPLEGADA (versión 2) y probada de punta a punta en real** (vía pg_net desde la BD): `emparejar` 200 (token entregado), `sala/abrir` 200 (modo amistoso, reglas con semáforo, avisos `NO_PUBLICADA`), `diagnostico` 200 (verde; sugerencias 21 000 kbps / 1 espectador), `latido` 200 (1 muestra guardada; devuelve modo y reglas), `sala/prueba` 200 (72 ms → ámbar; retraso sugerido 36, aplicar 0), `sala/cerrar` 200 (eventos abrir+cerrar), `config` 200 con estado y perfiles, `eco` 200, `instalar` con código falso 404. **Fallo encontrado y arreglado:** `sistema_semaforo` no era security definer y service_role no puede usar el esquema `private` → 500 en diagnóstico/prueba; migración **062** (aplicada por MCP). Lección: toda función `public.sistema_*` que llame a `private.*` debe ser security definer. Pendiente: borrar los datos de la prueba (PC «PC de prueba (Claude)» `0f9cfad2…`, su sala cerrada y 2 pruebas de conexión; el borrado automático fue cancelado).

- **ronda 190 · «mejor host para el par» (063, aplicada) + capa de datos web de salas (sin pantallas) + categoría de avisos «Salas»**. `mejores_hosts(a, b, neutral, perfil, límite)`: hosts aprobados que hostearon a ambos (muestras 14 d), ordenados por justicia (1º el peor de los dos pings, 2º la diferencia), sin bloqueos, con semáforo y si tiene sala abierta; solo los jugadores del par o staff. Web: `core/salas.js` (salud de sala viva/inestable >90 s/en partido, orden de la lista, aplicar cambios Realtime, formatos; 4 pruebas), `features/salas/api.js` (salas vivas + Realtime, enlace solo si puedo entrar, configurar sala, código de PC, dispositivos, código de instalación, cuenta Parsec, mejores hosts), `features/salas/staff.js` (hosts, salas, dispositivos, eventos, builds, config remota, fuentes, perfiles, organizaciones, calidad). `core/avisos.js` + categoría **«Salas abiertas»** (visible ya en Avisos). **Verificado en la BD simulando sesión** (transacción revertida): `guardar_prechequeo` → verde, `historial_ping_par` → sin_datos, `generar_codigo_instalacion` → código, `mejores_hosts` → lista vacía (aún sin partidos). 304 pruebas, 33 páginas.

- **ronda 191 · chat flotante estilo red social (FX.contactos): columna de contactos + ventanitas de chat en cualquier página**. Pedido: «barra de amigos activos siempre visible» y abrir/ver mensajes desde la pantalla principal, aparte de /mensajes/. **Fisura resuelta:** «en línea» solo existía en el radar de Duelos → nueva presencia de TODO el sitio `features/enLinea.js` (canal Realtime `sitio-en-linea`; si el jugador apagó «Mostrar mi conexión» solo mira, no se anuncia; cosmético, nunca para permisos; 1 conexión por pestaña). **PC ≥ 1280 px:** columna fija a la derecha (cápsula de cristal como la izquierda): buscador, «En línea · n», amigos (en línea primero, luego con no leídos, luego por nombre), grupos, contadores; plegable a solo avatares (se recuerda). La barra izquierda oculta su lista de amigos (ya no se duplica). **< 1280 px:** botón «Chats» (con contador) junto a «Historial/En vivo» que abre una hoja con la misma lista. **Ventanitas:** abajo a la derecha; caben 1–3 según el ancho real libre (`core/chatFlotante.js`); al pasar el límite la más antigua se minimiza a burbuja; minimizar/cerrar/abrir en Mensajes; enviar con Enter (Shift+Enter = salto), mensaje «enviando…» inmediato y «No se envió · Reintentar/Quitar» si falla; borrador protegido al cerrar (diálogo propio); marca leído al enfocar/ver; un mensaje nuevo abre burbuja sola (no si el chat está silenciado). En móvil, el chat abierto ocupa la pantalla. La web recarga al navegar: las ventanas se recuerdan en sessionStorage y se restauran. «Historial/En vivo» se corre para no quedar tapado. En /mensajes/ no hay ventanitas (los contactos llevan a la conversación de la página). Evento global `chat:abrir` ({ usuario }) para abrir un chat desde cualquier botón. Script en línea en `<head>` marca `data-sesion` antes de pintar (sin salto de diseño). Archivos: `core/chatFlotante.js` (8 pruebas), `features/enLinea.js`, `features/chatFlotante/{datos,contactos,ventanas,index}.js`, `styles/chatFlotante.css`. **Verificado en Chromium con sesión simulada** (PC 1440, celular 390: columna, ventana, burbuja, hoja y chat a pantalla completa). 312 pruebas, 33 páginas. No verificable aquí: tiempo real y presencia reales (Supabase no alcanzable desde el entorno de IA).

- **ronda 192 · campana de notificaciones «con vida» (misma estética)**. Pedido: «está bien pero muy básica, dale más vida e interactividad, sin cambiar identidad ni estética». Sin migración: la RLS de la 003 ya deja leer, marcar (`leida`) y borrar los avisos propios. **Campana:** se balancea al llegar un aviso (más amplio + onda cian si es urgente: reto directo, invitación, sala lista, aviso final, confirmar, disputa); el contador salta al subir; brillo suave mientras hay sin leer; `aria-label` con el número. **Panel** (mismo fondo/tarjetas `notif-item`/acento cian; ancho 416 px en ≥ 640 px): etiqueta «N nuevas», marcar todas, acceso a preferencias (`amigos/?tab=avisos`, ahora Amigos abre la pestaña desde la URL), filtros Todas / No leídas / Duelos / Social / Otros con contador por categoría (rueda del mouse los desliza; degradado solo si desbordan), grupos Hoy / Ayer / Esta semana / Anteriores (zona horaria del usuario), «hace 5 min» (se refresca cada minuto), icono en círculo con color por categoría (cian duelos/salas, violeta social, ámbar logros, verde eventos, rojo moderación), punto cian en los no leídos, mensaje en 2 líneas. **Por aviso:** marcar leída/no leída y descartar (botón al pasar el mouse, tecla Supr o deslizando con el dedo) con barra «Deshacer» 5 s (el borrado real ocurre después, o al salir de la página). «Ver avisos anteriores» (paginación por fecha). Teclado: flechas, Esc. Entrada en cascada al abrir/filtrar; un aviso nuevo con el panel abierto entra con destello. Sincroniza entre pestañas (UPDATE/DELETE en tiempo real). Lógica pura `core/notifs.js` (espejo de `private.categoria_notif`; 7 pruebas). Verificado en Chromium (PC 1440 y celular 390 con avisos simulados). 319 pruebas, 33 páginas.

- **ronda 193 · /v1 para Phoenix Soda: salas visibles, presencia de amigos, invitar y ETag (migración 064 + función phoenix v1.4.0, SIN desplegar hasta aplicar la 064)**. `invitaciones_sala` (2 h; da permiso de VER y ENTRAR aunque la sala sea privada; políticas web `salas_leer` y `salas_enlace_leer` rehechas con la invitación). Reglas de visibilidad replicadas con usuario explícito para la función (`private.ve_sala_de`, `entra_sala_de`, `es_staff_de`, `miembro_org`). `sistema_salas_para` (orden: invitado, amigos, con plazas, recientes; calidad del host con semáforo; enlace solo si puede entrar). `presencia_app` + `sistema_presencia` + `sistema_presencia_amigos_completa` (estado deducido: host de sala viva / invitado en muestras < 2 min / latido de app < 150 s / desconectado; «mostrar conexión» apagado = siempre desconectado; sala_id solo si la puede ver). `sistema_invitar` (sala propia viva, amigos sin bloqueo, 1 cada 2 min por amigo y sala, 15 cada 10 min; aviso web nuevo **INVITACION_SALA**, categoría «salas», enlace al chat con el host). Rutas: `GET /v1/salas`, `POST /v1/presencia`, `GET /v1/presencia/amigos`, `POST /v1/invitar`; **ETag** (`huellaContenido` FNV-1a 64 que ignora campos volátiles; `If-None-Match` o `?etag=` → 304 sin cuerpo). Error `NO_SON_AMIGOS`. Contrato 1.4.0 (§17–21) con tabla de COSTE: sondear solo con la ventana visible o se pasa del plan FREE. Campana: icono e «urgente» para la invitación. 321 pruebas.

- Ronda 194: Edge Function phoenix desplegada v1.4.0 (versión 3): /v1/salas, /v1/presencia, /v1/presencia/amigos, /v1/invitar con ETag/304. Verificado en vivo: config 200 v1.4.0, rutas nuevas 401 TOKEN_FALTANTE sin token.

- Ronda 195: migración 065 (aplicada y probada en transacción revertida): dos monedas (ascuas = billeteras.saldo, se ganan y se apuestan; gemas = billeteras.gemas, se compran, solo tienda) y retos 1v1 con pozo en ascuas (apuestas_reto; apostar_en_reto/aceptar_apuesta/rechazar_apuesta; liquidación por trigger en resultados_duelo; devolución al cancelar; staff_revisar/anular; comisión 5 % ≤500 y 10 % >500; >2000 por jugador = revisión del staff; 18+, 7 días, 3 partidos; todo en economia_config). economia.js normaliza gemas/en_garantia.

- Ronda 196: migración 066 (aplicada por MCP): apuestas en saltos de 50 (mínimo 50) y comisión redondeada hacia arriba a múltiplos de 10 (private.comision_monto) → el premio siempre termina en 0.

- Ronda 197: §6 de smash-soda-producto: migración 067 (aplicada y probada: acepta_espectadores, salas.rival, salas_espectadores, enlace solo con rol, radar_salas/salas_en_vivo/aceptar_sala/ver_sala/dejar_sala, sistema_roles_sala) + Edge Function v1.5.0 desplegada (versión 4) + tarjetas en Duelos («Retos en el radar») y En vivo (features/salas/tarjetas.js) + contrato §22.

- Ronda 198: página /mis-salas/ «Phoenix Soda» (menú Mi cuenta): vincular Parsec, mis salas abiertas (rival y espectadores), mis PCs para hosts (código de vinculación, código de instalación, renombrar, desvincular). pages/misSalas.js.

- Ronda 199 (prueba de dinamismo, reversible por interruptor): FX.tickerVivo (la barra «Última hora» mezcla actividad real: RPC ticker_comunidad, migración 068 aplicada por MCP; core/tickerVivo.js) y FX.vitrina (primer reto del radar = «Destacado» con borde animado, solo CSS). Para deshacer: poner false en src/data/experimento.js.

- Ronda 200 (fase 2.4): Mi perfil → pestaña «Smash Soda» (features/salas/vincularPC.js, compartido con /mis-salas/): código de 6 dígitos para /v1/emparejar, código de instalación, PCs vinculadas (renombrar/desvincular). Moderación → sección «Hosts Phoenix Soda» (features/salas/panelStaff.js): aprobar/quitar host_aprobado, suspender/reactivar/revocar PCs.

- Ronda 201 (enganche, migración 070 por MCP): mi_racha (racha diaria + meta en Duelos y Ahora), perfil_historia (bloque «Historia» en el muro: G-E-P, forma, rival frecuente, mejor victoria), ranking_semanal (reinicia lunes 00:00 Lima), cron resumen-semanal (domingo 18:00 Lima, aviso LOGRO). Página nueva /ahora/ «Ahora mismo». Tarjetas de sala con chips + detalles (069). Nombre visible de la app en site.js NOMBRE_APP.

- Ronda 202: migración 071 (pendiente de aplicar por el usuario): creadores verificados (/creadores/, solicitar, «Estoy en vivo», staff verifica en Moderación) y alquiler de host verificado (ofertas_host, alquileres_host; pago por fuera o gemas en garantía: se pagan al host cuando el cliente confirma, se devuelven al rechazar/cancelar). Botón «Alquilar host» en el encabezado del radar de Duelos (modal, features/alquiler.js); oferta del host en /mis-salas/.

- Ronda 203: 072 (aviso a seguidores + Discord al marcar En vivo) y 073 (sistema_perfiles_parsec; ticker con creadores en vivo pulsables) aplicadas por el usuario. Edge Function phoenix v1.6.0 desplegada (versión 5): POST /v1/perfiles. Contrato §23.

- Ronda 204 (limpieza): LIVE_DEMO=false (el pulso ya no inventa eventos), Highlights de Central ocultos (FX.highlightsDemo=false, eran clips de ejemplo + Unsplash), carta-experimento fuera del sitio (_carta-experimento.astro), pulso «En vivo» más discreto (Historial solo ícono; en celular un mensaje y solo los botones a la derecha). Inicio: portada sin altura forzada, título en 2 líneas «…DE / LA GALAXY LEAGUE». Palmarés con vitrina (FX.palmaresVitrina). Contexto completo en claude/ESTADO-ACTUAL.md.

- Ronda 205: títulos de Liga/Organizadores/Competiciones/Historial unificados (text-4xl sm:5xl md:6xl, como Central); Duelos: «Lanzar reto» plegable en PC (botón Ocultar → radar a todo el ancho + botón grande «Lanzar reto»; se recuerda en localStorage pe.duelos.formPlegado).

- Ronda 206 (Cuenta B): marcador de la fecha 9 cargado a pedido de Fralex: Hugo 2-3 Victor (`data/ligaResultados.js`). Efecto en la tabla: Victor 27 pts (9 PJ, 60 GF, 6 GC), Hugo 6 pts (9 PJ, 13 GF, 22 GC); Victor y Degox empatan en 6 goles en contra (el desempate de `ranking` es alfabético, sale Degox primero). Se ajustaron las 2 pruebas de `tests/pure.test.mjs` que tenían la tabla escrita a mano (331/331 pasan, build 39 páginas). Solo `borrador`; `main` no se toca.

- Ronda 207 (Cuenta B): pantalla del staff para los traspasos reales (Capa 1) dentro de Liga Máster → Centro de control: crear ventanas (Verano 2026…), marcarlas abierta/cerrada/aplicada, cargar y quitar movimientos (traspaso, cesión, llega libre, retiro). Sin migración nueva: usa las tablas `lm_ventanas_reales` y `lm_traspasos_reales` de la 084 (la RLS solo deja escribir al staff). Archivos: `src/js/core/traspasosReales.js` (validación pura), `src/js/pages/managerTraspasosReales.js`, sección en `src/pages/manager.astro`, `tests/traspasosReales.test.mjs`. Por ahora los movimientos solo se guardan: ningún endpoint de Mercado los entrega todavía. Se corrigieron también los datos viejos de RETOMAR (siguiente ronda, número de pruebas y páginas).

- Ronda 208 (Cuenta B): `/mercado/v1/liga/cambios` ahora trae por cada cambio los campos opcionales `monto`, `sueldo`, `clausula`, `fin_contrato` (AAAA-MM-DD) y `dorsal` (migración 094: 5 columnas nuevas en `lm_cambios_liga`, `lm_traspasar` los guarda y `lm_cambios_desde` los entrega; la Edge Function no cambió). Hoy se rellenan `monto` y `dorsal`; sueldo, cláusula y fin de contrato salen `null` hasta que la web guarde contratos. Contrato en `docs/web-pes-link/mercado-api.md`.
- Ronda 209 (Cuenta B): sección **«Mi club»** (`/mi-club/`, vestuario) conectada con Phoenix Mercado. Migración 095 (tablas `vestuario_club/jugador/cambio` con RLS, bucket privado `vestuario`, RPC `vestuario_guardar_cambios`, funciones `sistema_vestuario_*`). Edge Function `mercado` v11 con `/v1/vestuario/subir|cambios|aplicado`. Pantalla en `src/pages/mi-club.astro`, `js/pages/miClub.js`, lógica pura `js/core/vestuario.js` (+ `tests/vestuario.test.mjs`), estilos `styles/miClub.css`. Contrato en `docs/web-pes-link/mercado-api.md`. PENDIENTE: probar los endpoints con un token real de Phoenix Mercado y ver la pantalla con un club subido.
- Ronda 212 (Cuenta B): **Buzón del juego** (avisos web → PES 2021 en vivo vía Phoenix Link). Migración 096 (`juego_avisos`, `juego_avisos_entregas`, RLS, RPC `enviar_aviso_juego`, `staff_enviar_aviso_juego`, `sistema_buzon_*`). Edge Function `phoenix` v10, `version_api` 1.7.0: `GET /v1/juego/buzon` (ETag/304) y `POST /v1/juego/buzon/entregado`; config `intervalos.sondeo_buzon_seg` (15, mín. 5) e `interruptores.buzon_juego`. Contrato §25 en `docs/web-pes-link/contrato-v1.md` (con coste de cuota). Web: tarjeta «Mandar aviso a mi juego» en `/mi-club/` y «Aviso global» en Moderación (`js/features/buzon.js`, `js/core/buzon.js`, `tests/buzon.test.mjs`, permiso `avisarJuego`). PENDIENTE: pruebas con curl y token de prueba (no se pueden desde el servidor de Claude) y que Phoenix Link lo consuma.
- Ronda 213 (Cuenta B): por decisión de Fralex el programa de PC «Phoenix Mercado» pasa a llamarse **«Phoenix Sync»**. Cambiados solo los textos visibles y comentarios de `src/` (Mi club, Mercado, Manager, Legal, equivalencias). NO cambian: la sección «Mercado» de fichajes, la función `mercado`, las rutas `/functions/v1/mercado/v1/...` ni `X-Mercado-Version`.
- Ronda 214 (Cuenta B): **Formatos de torneo**. Página `/formatos/` (menú Competir): generador de 9 formatos (eliminatoria, doble, liguilla, ida y vuelta, grupos+playoffs, suizo, rey de la colina, escalera, circuito), reto del día/semanal, noche de la semana y ruleta de reglas. Motor puro `js/core/formatos.js` y `js/core/retos.js` (22 tests nuevos), datos en `data/modalidades.js`, estilos `styles/formatos.css`. Guía `docs/liga-y-torneos/FORMATOS.md` y PDF `docs/liga-y-torneos/Formatos-Phoenix-Evolution.pdf`. PENDIENTE: guardar torneos en BD (inscripción, resultados, avance de llave).

- Ronda 210-211 (Cuenta B): diseño aprobado de Mi club aplicado (commit aparte, revertible) y botón «Conectar» de Duelos/Salas que abre Parsec directo (parsec://peer_id=…&secret=…) con la invitación web de respaldo. Sin probar con Parsec real.

- Ronda 215 (Cuenta B): **Torneos propios** (migración 097, aplicada por MCP en 5 partes). Cualquier usuario crea su torneo con una ficha (nombre, formato de 10, cupo, visibilidad, dinámicas, premio, reglas, enlace) en `/torneos/` y lo juega en `/torneo/?id=N`: inscripción (con cuenta o por nombre), empezar (cruces con `core/formatos.js`), resultados por organizador o jugadores, avance automático de llaves en la BD (`tl_propagar`), cierre de grupos, suizo ronda a ronda, colina/escalera/circuito con estado JSON, cierre y campeón. Catálogo de +45 dinámicas divertidas con guía (`data/dinamicas.js`), ruleta por partido y castigos (`core/diversion.js`). Staff: Moderación → «Torneos propios» (pausar, topes, ocultar/cancelar; permiso `gestionarTorneos`). Archivos: `core/torneos.js`, `core/diversion.js`, `features/torneos/{api,guia,staff}.js`, `pages/{torneos,torneo}.astro` + js, `styles/torneos.css`, `tests/torneos.test.mjs`; `formatos.js` suma `sinTope`. Docs: `docs/liga-y-torneos/TORNEOS-LIBRES.md` y el informe maestro `docs/liga-y-torneos/PLAN-TORNEOS-LIBRES.md`. 384 pruebas, 43 páginas. PENDIENTE: probar con cuentas reales en /fase-beta/; avisos al Buzón, llave visual, realtime, palmarés al coronar (ver informe maestro §E). Migraciones hasta 097; siguiente libre **098**.

- Ronda 216 (Cuenta B): Phoenix Sync compartido (fichajes entre PCs + interruptor de autorización solo admin). Migración **098** aplicada por MCP (098a tablas, 098b permisos, 098c RPC web, 098d RPC API, 098e archivo entero, 098f arreglo de auditoría, 098g índices); también se corrigió la auditoría de 097 (acciones permitidas). Tablas `sync_grupos`, `sync_miembros`, `sync_config` (+historial), `sync_operaciones`, `sync_aplicaciones`, `sync_option_versiones` y bucket privado `sync-option`; modo por defecto `autorizacion`, cambio solo por RPC de admin. Probado en la BD con transacción deshecha: el miembro no cambia el modo (ni por RPC ni por UPDATE), ajeno no ve nada, publicar repetido = una fila, `desde` devuelve solo nuevas, ciclo pendiente→aplicada, aviso en el Buzón. Advisors: nada nuevo (solo el aviso conocido de RPC `authenticated` en 4 funciones que validan rol por dentro) y se añadieron 6 índices. Código de la Edge Function listo en el repo (`version_api` 1.8.0: `/v1/sync/config` GET/PUT, `/v1/sync/operaciones` GET/POST, `/v1/sync/operaciones/aplicada`, `/v1/sync/option` GET/POST, `/v1/sync/option/listo`; `autenticarSync` sin exigir host aprobado) pero **PENDIENTE-DEPLOY** (no desplegada; la función en producción sigue en v10 / 1.7.0). Contrato §26. Web: página `/phoenix-sync/` (tarjeta del interruptor solo admin con leyenda y aviso, fichajes con estado por miembro y leyenda de iconos, permisos por miembro, crear grupo para admin del sitio) + enlace desde Mercado. Archivos: `supabase/migrations/098_sync_compartido.sql`, `supabase/functions/phoenix/{index.ts,_lib/nucleo.js}`, `src/js/core/sync.js`, `src/js/features/sync/api.js`, `src/js/pages/phoenix-sync.js`, `src/pages/phoenix-sync.astro`, `src/styles/sync.css`, `tests/sync.test.mjs`, `tests/phoenix-api.test.mjs`, `docs/web-pes-link/contrato-v1.md`, `docs/web-pes-link/SYNC-COMPARTIDO.md`. Pruebas 395, páginas 44.

- Ronda 217 (Cuenta B): Chat general compartido con Phoenix Link. No existía un chat global activo en la web (solo la tabla vieja y vacía `mensajes_chat`, cerrada en la 030): se REUTILIZÓ. Migración **099** aplicada por MCP (099a tabla/columnas/política, 099b lógica, 099c RPC, 099d política corregida): RPC web `chat_global_listar/enviar/borrar` y RPC de API `chat_api_listar/enviar`. Reglas: 1–300 caracteres, 1 mensaje/segundo, sancionados no escriben, menores de 13 no, menores de 18 y mayores se ven por separado (staff ve todo), borrado por mod deja `borrado=true` y texto vacío (original en `auditoria_staff`). Probado en la BD con transacción deshecha. Edge Function (`version_api` 1.9.0): `GET/POST /v1/chat/global` con ETag/304, `borrados`, errores `MENSAJE_INVALIDO` 400, `CUENTA_SANCIONADA` 403, `CHAT_PAUSADO` 503, interruptor `chat_global`, intervalo `sondeo_chat_seg` — **PENDIENTE-DEPLOY** (producción sigue en v10 / 1.7.0; el despliegue v11 llevará 1.8.0 + 1.9.0 juntos). Contrato §27. Web: página `/chat-general/` (lista, enviar, borrar para mod, leyenda) en el pilar Comunidad y en Mensajes. Además: el buscador de personas de Phoenix Sync ahora acepta pedazos del usuario o nombre y deja elegir. Archivos: `supabase/migrations/099_chat_general.sql`, `supabase/functions/phoenix/*`, `src/js/core/chatGeneral.js`, `src/js/features/chatGeneral/api.js`, `src/js/pages/chat-general.js`, `src/pages/chat-general.astro`, `src/styles/chatgen.css`, `tests/chatGeneral.test.mjs`, `docs/comunidad/CHAT-GENERAL.md`. Pruebas 404, páginas 45.

#### Ronda 218 — Anti-spam del chat general
- Un mensaje cada **3 s** por persona (web y Link, misma función `private.chat_poner`; migración 099e). `reintentar_en` = segundos que faltan. Edge: `frenar` 1/3 s. Web: botón con cuenta atrás. Pendiente-deploy junto con v11.

- Despliegue (Cuenta B, 09-10-2026): Edge Function `phoenix` **v11** subida por MCP (verify_jwt=false, 1.9.0: Phoenix Sync + chat general + anti-spam 3 s). Comprobada contra el repo (idéntica salvo rayas decorativas). Sin pruebas con curl (el shell no llega a Supabase). Ya NO está PENDIENTE-DEPLOY; sigue PENDIENTE-WEB.

#### Ronda 219 — Anti-spam configurable por el admin
- Tabla `chat_ajustes` (espera_seg 0–60, defecto 3), RPC `chat_global_ajustar` (solo admin, auditada), migración 099f/099g aplicadas por MCP. Web: panel «Ajustes del chat» en /chat-general/ (solo admin) y botón con cuenta atrás según `espera_seg`. API: GET /v1/chat/global añade `espera_seg`. Edge **v12 desplegada** por MCP (freno 1/1 s de cortesía; comprobada contra el repo). Tests 405, 45 páginas. Siguiente migración libre: 100.

#### Ronda 223 — Pruebas arregladas tras la ronda 221
- `tests/pure.test.mjs`: se actualizaron los valores esperados de 3 pruebas que todavía tenían los datos de antes de jugarse fecha 8 y fecha 9. Tabla: Beto 24 pts, Degox 21 (8 pj), Jeremi 11. Estado de fecha: fecha 8 «jugada», fecha 9 «en_juego». Fecha actual: 9. Mejor defensa: Victor 6 goles, Degox 7. Crónica fecha 8: 6 partidos y 28 goles. Código de la lógica sin cambios. `npm test`: 410 de 410. `npm run build`: 45 páginas. Pendiente: confirmar con CopaFácil.

#### Ronda 221 — Resultados Galaxy League: fechas 8 y 9
- Marcadores cargados en `src/data/ligaResultados.js` (solo datos, sin migración ni cambios de BD): fecha 8 Degox 0–1 Jeremi y Beto 2–0 Morgado; fecha 9 Jeremi 0–6 Beto. Hugo 2–3 Víctor, Camilo 4–1 Jack y Axel 0–3 Arens ya estaban. Quedan sin jugar en fecha 9: Roberto–Degox y Fralex–Morgado. Pruebas: el archivo se carga bien (fecha 8: 6 jugados; fecha 9: 4 jugados). Se subió a `borrador` (FASE BETA).

#### Ronda 220 — «Última hora» para Phoenix Link (API 1.10.0)
- Migración **100** (aplicada por MCP como 100a/100b): tabla `noticias_ultima_hora` (texto ≤200, nivel info/importante/urgente, enlace https opcional, expira 1 h–7 días, máx. 5 vigentes), RPC `uh_crear`/`uh_cerrar` (moderador/admin, auditadas) y `noticias_api_ultima_hora` (service_role).
- Edge: `GET /v1/noticias/ultima-hora` (ETag, freno 1/30 s), interruptor `noticias`, intervalo `sondeo_noticias_seg` (mín. 60). Contrato §28 (v1.10.0). Web: tarjeta «Última hora en Phoenix Link» en Moderación (`core/ultimaHora.js`, `features/ultimaHora.js`). Tests 410. Edge **v13 DESPLEGADA** (10-10-2026, por MCP, verificada idéntica al repo; noticia de prueba id 8, info, 24 h). PENDIENTE-WEB. Siguiente ronda = 221; siguiente migración libre = 101.

#### Ronda 222 — Rendimiento: refresco de «Ahora» en pausa con la pestaña oculta
- `src/js/pages/ahora.js`: las cifras (cada 30 s) ya no se piden con la pestaña oculta y se refrescan al volver. Visualmente idéntico. NO se recortó Font Awesome: los íconos de insignias/tienda se guardan en la BD (`fa-…` libre), un subset los haría desaparecer. Aviso: 3 pruebas (`pure.test.mjs`: tabla CopaFácil, ligaStats, crónica) fallan desde la ronda 221 (datos nuevos de resultados); no son de esta ronda.

#### Ronda 223 — Arreglo: «Aprobar host» fallaba (migración 101)
- Error en pantalla: `violates check constraint "auditoria_staff_accion_check"`. `staff_aprobar_host` auditaba con `aprobar_host`/`quitar_host`, acciones que `auditoria_staff` no admite. Ahora audita como `rol` (texto «Host aprobado/retirado · nombre»). Aplicada por MCP y probada con transacción revertida. Siguiente migración libre = 102. (Ojo: la otra cuenta ya usó «ronda 221» y su propia numeración; esta ronda se llama 223 aquí.)

#### Ronda 224 — Liga automática en la web (marcador en vivo, validación por staff/árbitro, reclamos)
- Junta en `borrador` la rama `liga-automatica`: migraciones 102/102b, ya aplicadas, y Edge Function `liga` v2 (goleador `j` y en propia `pp` en los goles). Documento: `docs/liga-y-torneos/LIGA-AUTOMATICA.md`.
- **Marcador EN VIVO** (`components/MarcadorVivo.astro` + `js/features/liga/vivo.js`) en Central (encima de la Central de Partidos) y en Salas en vivo:
  - Realtime sobre `liga_vivo`;
  - oficial (con fecha) o amistoso, minuto y tiempo, goles con goleador («34′ MESSI», «80′ ARAUJO (p.p.)»);
  - efecto de gol con la capa dopamina;
  - «Final» 30 s al terminar;
  - oculto si no hay partidos.
- **Moderación › Liga · resultados por validar** (`js/pages/moderacionLiga.js`, permiso `verReportes` = `private.es_staff`): disputas y propuestos con Confirmar / Corregir y confirmar / En disputa, goles con minuto y goleador, reclamo, resumen del Phoenix Doctor (solo informativo) y designar árbitro (también en «Próximos partidos»).
- **Mis partidos** (`js/pages/misPartidosLiga.js`): «Partidos que arbitras» (árbitro designado: valida aunque el host sea otro) y «Mis partidos oficiales» (los que llegaron por Link, con «Reclamar»). Ambos ocultos si no hay nada.
- **Liga:** al abrir, pide los resultados CONFIRMADOS de la base (`js/features/liga/tablaViva.js`). Si hay alguno que `ligaResultados.js` aún no tiene, recalcula con `calcularTabla`, la misma fórmula con enfrentamiento directo (por eso no se usa la vista `liga_tabla`, que no lo tiene), y actualiza puntos, orden, zonas y el marcador. Hoy la base y la web coinciden: no cambia nada.
- Lógica pura en `core/ligaVivo.js`; pruebas en `tests/ligaVivo.test.mjs` (6 nuevas, 416 en total). Estilos en `styles/ligaVivo.css`.
- **Probado contra la base real:**
  - fila de prueba en `liga_vivo` (insertar, gol, borrar), luego quitada;
  - funciones 102 en una transacción deshecha: jugador no valida ni designa (42501); el staff designa; el árbitro corrige 3-1 → confirmado/origen staff; el DT reclama → disputa; un no DT no reclama (42501).
- Partidos contra la CPU: la web no guarda `partida_fin` en ninguna tabla y el ranking sale de los duelos, así que nunca cuentan. Si algún día se guarda el historial de Link, filtrar `datos.contra_ia`.

#### Ronda 225 — En qué parte del juego están (pantalla) en el marcador en vivo
- Migración **103** (aplicada por MCP): `liga_vivo.pantalla` (`menu | equipos | ajustes | cargando | saliendo | en_juego | descanso | pausa | final`, opcional). Edge Function `liga` **v3** (1.2.0) la acepta.
- Viene de **Phoenix Referee** (el Lua de Sider, antes «phoenix_estadio»), que escribe `pantalla.json` también fuera del partido. Phoenix Link la manda, y con los lados ya elegidos en Link manda el «en vivo» ANTES del pitazo (`fase: previa`).
- Tarjeta en vivo:
  - el estado dice «Eligiendo equipos», «Ajustes del partido», «Cargando el partido», «Saliendo al campo», «34′ · 2.º tiempo», «67′ · En pausa», «Descanso» o «Final» (`core/ligaVivo.js` `textoEstado`);
  - antes del pitazo muestra «VS» en vez de 0-0.
- Pruebas: 417 (1 nueva). Build OK.
- Pendiente, en investigación con una sesión de prueba en el juego: distinguir «viendo estrategia» y «pausa haciendo formación».

#### Ronda 226 — Páginas ordenadas por importancia (solo organización; sin colores ni estilos nuevos)
Pedido de Fralex: el contenido se sentía «regado» (todo con el mismo peso). Se hizo con la skill **Impeccable** (`/impeccable layout`), que ahora vive en el repo en `.claude/skills/impeccable/` (no se publica: es solo para la IA). Regla aplicada: una cosa principal arriba, grupos con poco espacio por dentro y mucho espacio entre grupos, lo secundario plegado.
- **Inicio** (`index.astro`): portada más baja; anclas primero (siguen pegadas en toda la página); grupo «Ahora en la liga» = estado de la fecha + en vivo + Central de Partidos (título más grande) + Posiciones completa (ya no se corta en el 6.º); «En racha» pasó al plegable «Estadísticas de la liga» junto a clubes y goleadores; Jugadores destacados con título un paso menor. En celular los 5 accesos de la portada van de a 2 y sin la línea pequeña (`components.css`, `.acciones-hero`).
- **Duelos**: el formulario se ordena en «lo básico» (a quién, tamaño, cuándo) y «Detalles de la sala» (host, plataforma, espectadores). La columna derecha es una sola: primero «Retos en el radar», debajo «Retos que lanzaste». Los botones Alquilar host/Actualizar van juntos.
- **Liga**: portada compacta (la tabla se ve antes); «Líder» se oculta en PC porque el podio ya lo muestra (en celular sigue); selector de edición con su etiqueta, pegado a la tabla; título de la tabla más grande; la explicación larga va en «¿Cómo se lee la tabla?» (plegable).
- **Mercado**: cabecera corta; «Vincular» + «Mis reportes» primero; los 3 pasos pasan a la sección «Cómo funciona»; el enlace a Phoenix Sync va dentro de «Vincular»; Staff al final.
- **Perfil** (`js/pages/perfil.js` → `pintar`): 3 grupos: cabecera (+ sus paneles de ajuste) · «Resumen» = estadísticas + logros + Historia (en PC a 2 columnas si hay Historia; `.pf-resumen` en `pages.css`) · «Muro» = historias + Publicaciones/Clips.
- **Mis partidos**: «Pendientes de ti» (valorar + confirmar marcadores + arbitrar; el grupo no ocupa espacio si está vacío, `.mp-pendientes`) → «Agendados» (lo principal) al lado de «Resultados» (oficiales + historial) → «Contra cada rival» en plegable.
- No tocado: barra lateral, ticker, Red de enlaces, barra derecha, botones de historial/En vivo, estilo de las cápsulas, `tokens.css`.
- **Propuestas pendientes de decisión (no aplicadas):** (A) menú en los 4 mundos: Competir · Salas (Duelos, Ahora mismo, Phoenix Link) · Mi equipo (Liga Máster, Mercado, Mi club) · Social; (B) reordenar las 8 pestañas de Competir; (C) pestañas Publicaciones/Clips del perfil con el estilo cápsula.
- Pruebas: `npm test` 417/417, build 45 páginas, escaneo de Impeccable sin hallazgos. Perfil, Mis partidos y Mercado solo se vieron sin sesión (el entorno de la IA no llega a Supabase).
#### Ronda 227 — PRUEBA: portada con los 4 mundos y «Unirme» como camino (FX.portada)
- Todo detrás de la bandera nueva **`FX.portada`** (`data/experimento.js`). `false` = portada y «Unirme» exactamente como antes. Fralex lo pidió «solo como prueba».
- Portada (`pages/index.astro`, solo dentro de `FX.limpio`):
  - Título nuevo «BIENVENIDO A LA / GALAXY» (Fralex descartó «Socializa. Compite. Juega. Dirige.») (2.ª línea con el degradado cian→púrpura); las palabras entran una tras otra (respeta `prefers-reduced-motion`). Frase nueva sin tecnicismos.
  - «¿Qué quieres hacer?» visible otra vez, con 4 pestañas cápsula (mismo estilo que `.pilar-tabs-lista`; nombres elegidos por Fralex): **Zona Social · Competencia · Duelos · Mi Club**. Cada una muestra 3 accesos (lista `MUNDOS`). Abre en «Duelos». Teclado: flechas, Inicio, Fin. En celular ≤430 px se ocultan los íconos de las pestañas para que entren las 4 (texto sigue en 12 px).
  - Cierre «¿Listo para entrar a la Galaxy?» grande con aurora: «Crear mi cuenta» (abre el registro; con sesión pasa a «Ir a mi perfil»), «Entrar al Discord» y enlace a la guía.
- «Unirme» (`pages/unirme.astro`): chips «5 pasos · Gratis», los pasos unidos por una línea, pasos 1 y 2 destacados (borde cian y número relleno), «Crear mi cuenta» relleno púrpura. Textos sin cambios.
- Archivos nuevos: `styles/portada.css`, `js/features/mundos.js`, `js/core/pestanas.js`, `tests/pestanas.test.mjs`. Sin cambios en colores, barras, ticker ni otras páginas.
- Pruebas: 419 (2 nuevas). Build 45 páginas. Revisado en capturas a 1440, 390 y 360 px.

#### Ronda 228 — PRUEBA: portada «palco VIP» (FX.elite)
- Bandera nueva **`FX.elite`** (`data/experimento.js`), ENCIMA de `FX.portada`. `false` = vuelve la portada de la ronda 227 tal cual (comprobado en el build). Fralex: «haz toda tu propuesta, si no me gusta volvemos a la anterior».
- **Pase en la portada** (`aside.vitrina`): en PC va a la derecha del título (inclinado en 3D, brillo holográfico que sigue al mouse); en celular, horizontal y compacto bajo la frase.
  - Sin sesión: «Líder de la Galaxy» (se calcula al construir desde `ligaResultados.js`, así sale al instante). Si su ficha en `jugadores` tiene foto (nombre o apodo igual), se pone la foto y su media.
  - Con sesión: «Pase de miembro»: número de miembro (= cuentas creadas hasta la suya, `perfiles.created_at`), puesto, puntos y próximo rival si juega la Galaxy; foto de su ficha (`jugadores.perfil_id`) o avatar o inicial; «Miembro desde mes año». La etiqueta de arriba dice «Bienvenido de vuelta, <nombre>». Al cerrar sesión vuelve el pase del líder.
- **Campeones vigentes**: franja dorada al inicio del contenido con el podio de `data/palmares.js` (`PODIO`); el de liga va en oro. Enlace a Palmarés.
- **Menos brillo**: sin la mancha de luz central, aurora más tenue, etiqueta sin resplandor, luz de estadio arriba.
- **Entrada tipo transmisión**: un haz de luz cruza la portada 1 vez al día (`localStorage` `pes-intro-dia`); nunca con «menos movimiento».
- El título ajusta su tamaño al ancho de su columna (container query), para no partirse en 3 líneas con la columna de contactos abierta.
- Archivos: `styles/elite.css`, `js/features/elite.js`, `js/core/pase.js`, `tests/pase.test.mjs`, `pages/index.astro`, `styles/global.css`, `data/experimento.js`.
- Pruebas: 423 (4 nuevas). Build 45 páginas. Revisado a 1440 (con y sin columna de contactos) y 390 px, como visitante y con una sesión simulada.

#### Ronda 229 — PRUEBA: portada «transmisión» (FX.transmision)
- Bandera nueva **`FX.transmision`** (`data/experimento.js`), ENCIMA de `FX.elite`. `false` = vuelve la portada de la ronda 228 (pase del líder / de miembro). Comprobado en el build. Fralex: «que no parezca IA, que transmita emoción, minimalista y muy dinámica».
- **Titulares reales que rotan** (`js/core/titulares.js`, con pruebas): salen de `ligaResultados.js` al construir la web. Hoy: «Bienvenido a la Galaxy», «Victor sigue invicto. ¿Quién lo baja?», «Victor le metió 9 a Roberto. Goleada en la fecha 8.», «Beto ganó sus últimos 8. Viene encendido.», «Solo 3 puntos separan al primero del segundo.». Se actualizan solos al cargar resultados.
- Cada titular trae **el marcador que lo respalda** (escudos, resultado o VS, «Fecha N · Final/Próximo») con el escudo del protagonista grande y tenue detrás. «La cima» muestra 1.º y 2.º con sus puntos.
- **Movimiento con sentido**: las palabras entran de abajo y salen hacia arriba; el marcador entra después; los goles suben uno tras otro. **Barritas de progreso** (como historias): marcan cuándo cambia, se pueden tocar, y las ya vistas quedan marcadas. Botón de pausa. Se pausa con el mouse encima, con el foco del teclado y con la pestaña oculta. Con «menos movimiento» (sistema o ajuste de la web) no rota sola.
- **Línea de estado** arriba: «Galaxy League · fecha 9 en juego» con punto verde que late (solo si la fecha está en juego). Con sesión: «Hola, Fralex · 10.º · próximo: Morgado».
- **Accesos en texto** (sin tarjetas): título, flecha y línea fina que se dibuja al pasar el mouse. «¿Qué quieres hacer?» en tipografía normal (sin etiqueta en mayúsculas).
- **Video de fondo opcional**: `data/portada.js` (`clip`, `poster`, `segundos`). Archivo en `public/portada/`. Solo en pantallas ≥ 768 px y sin «menos movimiento».
- Archivos: `js/core/titulares.js`, `tests/titulares.test.mjs`, `js/features/transmision.js`, `styles/transmision.css`, `data/portada.js`, `pages/index.astro`, `styles/global.css`, `data/experimento.js`.
- Pruebas: 426 (3 nuevas). Build 45 páginas. Revisado a 1440 y 390 px, como visitante y con sesión simulada; avance automático y pausa probados.

#### Ronda 230 — PRUEBA: menos «factor IA», estilo EA FC (FX.estiloFC)
- Bandera nueva **`FX.estiloFC`**, ENCIMA de `FX.transmision`. `false` = vuelve la portada de la ronda 229. Comprobado en el build.
- Fralex dio permiso para reducir lo que delata a la IA aunque toque la identidad, y nombró EA FC como referencia. Solo cambian estilos (`styles/estilofc.css`) y una clase:
  - sin manchas de luz (aurora) ni luz de estadio: fondo oscuro plano;
  - degradado cian→púrpura SOLO en «Galaxy» (clase `tx-l2-marca` del titular de bienvenida); el resto del acento es cian liso;
  - titulares en letra normal (no mayúsculas), apretados; nombres del marcador y accesos también en letra normal;
  - marcador y «Campeones vigentes» planos, sin vidrio ni brillo, con esquina cortada en diagonal y barra lateral (cian / dorada);
  - una diagonal fina de fondo SOLO detrás del marcador (PC);
  - la parte de abajo (¿Qué quieres hacer?, pestañas, accesos, cifras) alineada al mismo borde izquierdo que el titular (`.portada-abajo`).
- Las pestañas cápsula no cambian de estilo (solo se alinean a la izquierda).
- Nuevo en `data/portada.js`: `imagen` = captura real de un partido como fondo tenue cuando no hay video.
- Pruebas 426. Build 45. Revisado a 1440 y 390 px.

#### Ronda 231 — PRUEBA: portada «un solo escenario» (FX.escenario)
- Bandera nueva **`FX.escenario`**, encima de `FX.transmision`. `false` = vuelve la portada de la ronda 229 (transmisión). `FX.estiloFC` (ronda 230) quedó en `false`: a Fralex no le convenció.
- Prioridades de Fralex (para SIEMPRE): **dinamismo total, suavidad, animaciones visuales y cero desorden visual**.
- En pantalla solo 3 cosas: **titular real** (mismos de `core/titulares.js`), **marcador** en una sola línea sin caja, y los **4 mundos** (cápsulas). Las cifras de la comunidad bajan al contenido, bajo «Campeones vigentes».
- Movimiento (una sola curva `cubic-bezier(.22,1,.36,1)`):
  - el titular «enfoca»: cada palabra pasa de borrosa a nítida; el que sale se desenfoca hacia arriba;
  - la **luz de fondo** toma los 2 colores del club del protagonista (`data/clubesVisual.js`) y cambia suave (variables CSS registradas con `@property`); en la bienvenida, cian y púrpura;
  - los **goles giran** como un reloj hasta su número;
  - una **línea fina** marca el tiempo (6 s, `data/portada.js`) con los colores del club; tocarla pausa; flechas ← → cambian; en celular se desliza con el dedo;
  - los **4 mundos se despliegan** en el mismo lugar (cajón con `grid-template-rows`); Escape cierra;
  - al bajar, la portada **se aleja** (animación ligada al scroll, solo navegadores compatibles).
- Con sesión: la bienvenida dice «Hola de nuevo, <nombre>».
- Pausa con mouse sobre el titular, foco de teclado, pestaña oculta. Nada se mueve con «menos movimiento».
- Archivos: `js/features/escenario.js`, `styles/escenario.css`, `pages/index.astro`, `styles/global.css`, `data/experimento.js`.
- Pruebas 426. Build 45. Revisado a 1440 y 390 px y grabado un video de 24 s.

#### Ronda 232 — PRUEBA: portada «las 4 ventanas» (FX.ventanas)
- Bandera nueva **`FX.ventanas`**, encima de `FX.escenario`. `false` = vuelve la portada de la ronda 231. Comprobado en el build.
- Fralex: la 231 era «muy simplista» y «no deberíamos enfocarnos en un solo jugador». Objetivo: que todos tengan protagonismo, con dinamismo y cero desorden.
- Portada: saludo «Bienvenido a la Galaxy» (con sesión: «Hola de nuevo, <nombre>») + «Esto está pasando ahora en la comunidad.» + **4 ventanas iguales**, una por mundo, siempre en el mismo lugar (4 columnas en PC, 2×2 en celular). Cada una es un enlace a su sección.
  - **Zona Social** (púrpura): publicaciones del muro de la comunidad (`muro_comunidad`), con foto del autor y «hace X».
  - **Competencia** (dorado): TODOS los resultados de la última fecha jugada + lo que falta de la fecha en curso (al construir, desde `ligaResultados.js`).
  - **Duelos** (cian): retos abiertos (`retos_matchmaking` en BUSCANDO): «<nombre> busca rival».
  - **Mi Club** (verde): movimientos del mercado de la Liga Máster (`lm_movimientos`, liga galaxy).
  - Sin datos, cada una muestra un texto amable («Nadie espera rival ahora · Crea el primer reto»).
- Movimiento: las ventanas entran una tras otra; lo de adentro cambia **una ventana por turno** cada 2,8 s (como tableros de aeropuerto), con desenfoque suave; la luz del mundo late al cambiar; al pasar el mouse la ventana sube y su luz se enciende. Pausa con mouse encima, teclado y pestaña oculta. Nada con «menos movimiento».
- Lógica pura en `js/core/ventanas.js` (con pruebas); carga y turnos en `js/features/ventanas.js`; estilos en `styles/ventanas.css` (reusa la luz y la curva de `escenario.css`).
- Datos reales hoy (12 oct): Zona Social = publicaciones de prueba de Fralex; Duelos = ninguno abierto; Mi Club = movimientos «Demo …».
- Pruebas 429 (3 nuevas). Build 45. Revisado a 1440 y 390 px con esos datos; video de 20 s.

#### Ronda 233 — PRUEBA: las 4 ventanas con 3D y movimiento por etapas (FX.ventanas3d)
- Fralex eligió «las 4 ventanas» (ronda 232) como portada y pidió «más movimiento, sensación 3D, que cada sensación se sienta progresiva».
- Bandera nueva **`FX.ventanas3d`** (encima de `FX.ventanas`). `false` = las 4 ventanas planas de la 232. Comprobado en el build.
- Todo por capas (`styles/ventanas3d.css`):
  - **Entrada**: título enfoca → las ventanas se levantan en 3D una tras otra (inclinadas, desde abajo y desenfocadas) → encabezado → contenido → se enciende la luz del mundo → recién a los ~3,4 s empieza la rotación.
  - **Cambio**: el contenido gira como un tablero de aeropuerto (sale hacia arriba, entra desde abajo) y una luz del color del mundo recorre el borde de esa ventana (`@property --vt-ang`).
  - **Mouse** (solo con mouse): toda la escena se inclina un poco hacia el mouse (±2°/±3°); la ventana bajo el mouse sube, se inclina más (±6°/±7°), su brillo sigue al mouse y sus capas se separan (paralaje: ícono y foto flotan más que el texto). Un solo `requestAnimationFrame` por cuadro (`profundidad()` en `js/features/ventanas.js`).
  - **Reposo**: la escena se balancea apenas (16 s); se detiene con el mouse encima.
  - **Scroll**: la portada se inclina hacia atrás y se aleja (animación ligada al scroll, navegadores compatibles).
- HTML: `.vt-escena` envuelve la cuadrícula (da la perspectiva); clase `vt-3d` en `.vt`.
- Nada se mueve con «menos movimiento». Pruebas 429. Build 45. Revisado a 1440 y 390 px; video de 39 s.

#### Ronda 234 — PRUEBA: ventanas interactivas, cielo 3D y «Galaxy» con volumen (FX.interactivo)
- Fralex: «más animación, más diseño 3D, más cosas interactivas, pero sin llegar a ser aturdidor». Dijo que piensa aplicar esta estética a toda la página (pendiente: se hará página por página, con su OK).
- Bandera nueva **`FX.interactivo`** (encima de `FX.ventanas3d`). `false` = vuelve la ronda 233. Comprobado en el build.
- **Regla anti-mareo**: solo UNA cosa se mueve sola a la vez (el turno de las ventanas); el cielo es lentísimo; todo lo demás responde a la persona.
- **Ventanas con 2 caras**: tocar (clic, Enter o dedo) la da vuelta en 3D; el dorso muestra los 3 accesos de ese mundo (lista `MUNDOS`). Solo una dada vuelta a la vez; Escape, «×» o tocar fuera la vuelven. Con teclado el foco va al primer enlace del dorso y regresa al volver (caras con `inert`). La dada vuelta no rota. La flecha del encabezado sigue llevando directo a la sección (en celular se oculta). Con «menos movimiento» las caras cambian con fundido, sin girar.
- **Destello** del color del mundo desde el punto tocado; la ventana se «hunde» un poco al presionar (`scale` con `:has(.vt-girar:active)`).
- **Cielo de estrellas en 3D** (`js/features/estrellas.js`, canvas): 90 estrellas en PC / 45 en celular en 3 capas, paralaje con el mouse y con el scroll, una estrella fugaz cada ~14 s. Se detiene si no se ve o la pestaña está oculta; quieto con «menos movimiento».
- **«Galaxy» con volumen**: capas de sombra de la paleta (`drop-shadow` con `color-mix` de tokens) y se inclina con el mouse.
- **Arreglo** (también afectaba a la 233): al inclinarse una ventana, parte quedaba «detrás» del plano de la cuadrícula y el clic lo recibía la cuadrícula. Ahora `.vt-grid` no recibe clics y `.vt-v` sí.
- Archivos: `styles/ventanasplus.css`, `js/features/estrellas.js`, `js/features/ventanas.js` (caras, destello, «Galaxy»), `styles/ventanas3d.css`, `pages/index.astro`, `styles/global.css`, `data/experimento.js`.
- Pruebas 429. Build 45. Probado: clic, teclado, Escape, toque en celular; revisado a 1440 y 390 px; video de 34 s.

#### Ronda 235 — PRUEBA: ventanas sin íconos «muy IA» (FX.sinIconos, skill taste)
- Fralex pidió quitar los íconos que se ven «muy IA», usando la skill taste.
- Bandera nueva **`FX.sinIconos`** (encima de `FX.interactivo`). `false` = vuelve la ronda 234. Comprobado en el build.
- Fuera (criterio taste): el cuadradito de color con ícono junto al nombre de cada ventana (frente y dorso), los íconos de relleno cuando no hay foto (control de juego, escudo genérico) y el iconito de «girar».
- Quedan: lo REAL (fotos de personas, escudos de clubes; en Mi Club, el escudo del club de destino si tiene `escudo_url`) y lo FUNCIONAL (flecha a la sección, ×).
- El color de cada mundo pasa a una rayita fina junto al nombre, que se estira al pasar el mouse o al dar vuelta la ventana. Nombres en letra normal (no mayúsculas espaciadas). Títulos de las ventanas un poco más grandes.
- Font Awesome se mantiene para la flecha y la × (es la familia de íconos de todo el sitio; taste pide una sola familia por proyecto).
- Archivos: `styles/sinIconos.css`, `js/features/ventanas.js` (sin ícono de relleno; escudo real en Mi Club), `pages/index.astro`, `styles/global.css`, `data/experimento.js`.
- Pruebas 429. Build 45. Revisado a 1440 y 390 px; clic, teclado y toque siguen funcionando.
#### Ronda 236 — Campo 2D en vivo dentro de «En vivo» (chat LINK, con permiso de Fralex)
- Edge **liga 1.3.0**: ruta `POST /v1/liga/campo` (Link ≥ 0.2.21, interruptor «Campo en vivo en la web»). NO escribe en la base: valida (`j` ≤ 30 fichas, `b`, `posesion`, `t`, `fase`) y reenvía por Realtime Broadcast al canal público de solo lectura `campo:<sala_id>`, evento `campo`. Máx. 2/s por sala; no gasta el cupo de 60/min del dispositivo.
- Web: al pulsar una tarjeta de «En vivo ahora» (o Enter/Espacio) se despliega el tablero en el mismo sitio: campo 2D (SVG con interpolación, un solo requestAnimationFrame), posesión A/B, tanda de penales y avisos («El campo en vivo no está activado en esta sala», «Sin datos…», «Partido terminado»). En la página En vivo el primer partido sale ya desplegado. Solo hay suscripción con el tablero abierto.
- `fase` (Link 0.2.29): `repeticion` / `otro` / `pausa` ponen la etiqueta REPETICIÓN / SIN LECTURA EN VIVO / PAUSA sobre el campo (en repetición Link congela las últimas posiciones buenas).
- A = equipo que estaba a la izquierda en el primer saque visto por Link; en el tablero A = local y B = visita con nota «colores aproximados».
- Archivos: `supabase/functions/liga/index.ts`, `src/js/core/campoVivo.js` (+ `tests/campoVivo.test.mjs`), `src/js/features/liga/campoVivo.js`, `vivo.js`, `MarcadorVivo.astro` (prop `tablero`), `ligaVivo.css`, `docs/liga-y-torneos/LIGA-AUTOMATICA.md`.
- **Colores de camiseta (Link 0.2.30, Edge 1.3.1):** el mensaje `campo` puede traer `c:["#rrggbb","#rrggbb"]` (A, B) sacado del nombre del equipo que da el juego; el tablero pinta fichas, leyenda, barra de posesión y tanda con esos colores (árbitros siguen amarillos). Sin `c` (equipo desconocido o Link viejo) se usan cian y violeta.
- Pruebas: 435. Build OK. Probado en el navegador con mensajes simulados por Realtime real.

#### Ronda 237 — «Viendo desde la web» y entrar a la sala desde el tablero (chat LINK, con permiso de Fralex)
- Migración **104** (aplicada por MCP): tabla `liga_mirando(sala_id, usuario, nombre, visto)`. Con sesión, el tablero avisa cada ~30 s (upsert propio; RLS: solo tu fila, y solo si la sala tiene marcador en `liga_vivo`); el nombre lo pone el servidor desde `perfiles.nombre_display` (trigger `private.liga_mirando_fijar`), no se puede falsear. Al cerrar el tablero se borra la fila. Sin sesión no se registra nadie.
- Edge **liga 1.4.0**: `GET /v1/liga/mirando?sala_id=` (token de Link; solo de su sala) → `{mirando:[nombres]}` de los últimos 90 s. Link lo pide cada ~10 s y lo enseña en Gente («Viendo desde la web: …») y lo anuncia una vez por persona en el chat de la sala («X está viendo el partido desde la web.»).
- Tablero: botón **Entrar a la sala** (lee `salas_enlace` por RLS: solo si la sala es visible para ti; abre el enlace de Parsec; el host te acepta como espectador) y panel «Estadísticas del partido» (posesión; disparos, córners y tarjetas cuando Link los pueda leer).

#### Ronda 238 — Campo en vivo más rápido y con poseedor del balón (chat LINK, con permiso de Fralex)
- Edge **liga 1.5.0**: `POST /v1/liga/campo` acepta `p` (índice en `j` de quien lleva el balón, -1 = libre) y `ts` (hora de la lectura en la PC del host, ms); hasta 6 mensajes/s por sala; la autenticación se guarda en caché (60 s la PC, 30 s la sala) para no hacer 3 consultas por mensaje (una PC revocada puede seguir mandando posiciones hasta 60 s).
- Link (0.2.37) manda 1 mensaje/s y **4/s si alguien mira con sesión** (liga_mirando). El tablero ajusta el suavizado al ritmo de llegada (≈ medio intervalo, 60–500 ms) y marca con un **halo** a quien lleva el balón. Con `?diag` en la URL, el tablero enseña mensajes/s y retraso desde la lectura.
- Pruebas: 436. Build OK.

#### Ronda 239 — Estadísticas del partido en el tablero (derivadas del campo; chat LINK, con permiso de Fralex)
- Edge **liga 1.6.0**: `POST /v1/liga/campo` acepta `est` = pares [A, B] de `pos` (posesión %), `pas` (pases completados), `per`/`rec` (pérdidas/recuperaciones), `tir`/`pue` (tiros / a puerta), `cor`, `ban` (saques de banda), `met` (saques de puerta).
- Link (0.2.38) las calcula con las posiciones y el poseedor del balón (aproximadas: el juego no las da). El tablero las enseña en una tabla bajo el campo. Faltas, tarjetas, cambios y asistencias NO están (no se pueden leer del juego todavía).
- Pruebas: 437. Build OK.

#### Ronda 240 — Arreglo: el texto de las ventanas ya no se encima al cambiar
- Fralex: al cambiar el contenido de una ventana de la portada, el texto nuevo aparecía antes de que el viejo se fuera y se veían encimados unos milisegundos.
- Causa: el que salía y el que entraba se animaban a la vez (~0,5 s cada uno).
- Arreglo (solo CSS, `styles/ventanas3d.css` y `styles/ventanas.css`): ahora van EN TURNOS. El que sale se apaga en ~0,18 s; el que entra espera ~0,2 s y recién ahí aparece.
- Medido en el navegador cada 30 ms: 0 momentos con los dos visibles. Pruebas 437. Build 45.

#### Ronda 241 — Las ventanas cambian con un desplazamiento hacia arriba (cinta)
- Fralex: tras la ronda 240 seguía viendo el texto encimado y pidió «una especie de desplazamiento hacia arriba cuando va a cambiar algo».
- Ahora el cambio es una **cinta**: el contenido actual sube y sale por arriba, y el siguiente sube pegado desde abajo. Se quitaron el giro (3D) y el fundido.
- Cómo se garantiza que no se enciman: cada elemento ocupa toda la altura de la caja (`align-self: stretch`), así los dos miden lo mismo y se mueven exactamente 100 %; la caja recorta lo que sale (`overflow: clip`). Son **animaciones** (no transiciones) que arrancan en el mismo cuadro: `data-sale` y el nuevo `data-entra` (los pone y quita `js/features/ventanas.js`). Con transiciones el que entraba arrancaba ~0,15 s tarde.
- Medido cada 25 ms: el borde de arriba del nuevo coincide con el de abajo del viejo en todo momento (diferencia ≤ 1 px por redondeo).
- Archivos: `styles/ventanas.css`, `styles/ventanas3d.css` (sin las reglas de giro), `js/features/ventanas.js`. Pruebas 437. Build 45.

#### Ronda 242 — CAPA 3D EN TODA LA WEB (FX.prof3d)
- Fralex: «quiero algo súper completo y dinámico, movimiento 3D en todos lados». Eligió: **todas las páginas** y **fuerte pero ordenado** (nada se mueve solo; todo responde a la persona).
- Bandera nueva **`FX.prof3d`** → `html[data-fx-3d]` (Layout). `false` = la web como antes. Comprobado en el build.
- Piezas:
  1. **Al bajar**: las secciones (`[data-reveal]` de `features/reveal.js`) aparecen levantándose en 3D (desde abajo, inclinadas, desenfocadas); sus tarjetas se levantan una tras otra (demoras de `dopamina.css`). En «Unirme», los pasos del camino también.
  2. **Al salir por arriba**: la cabecera de cada página (`main > header`, menos la portada) y las secciones se inclinan hacia atrás y se alejan (animación ligada al scroll). Se excluyen secciones con elementos sticky (`:has(.sticky, [class*=sticky], .anclas)`).
  3. **Mouse** (`js/features/prof3d.js`, lógica en `js/core/inclinacion.js` con pruebas): tarjetas y paneles (`.glass-panel`, `.liga-partido`, `.player-card`, `.match-card`, `.liga-card`, `.accion`, `.campeones`, …) se inclinan hacia el mouse; ±8° lo chico, ±1–2° lo ancho. Un listener, un cálculo por cuadro. Solo dentro de `<main>`; fuera las 4 ventanas de la portada, las pestañas cápsula, ventanas emergentes y `[data-no3d]`; no se inclina el panel donde estás escribiendo.
  4. **Presionar**: se hunde un poco.
  5. **Cambio de página**: View Transition en 3D (la vieja se aleja, la nueva llega desde cerca).
- Protegido sin tocar: cabecera, ticker, barras laterales, Red de enlaces, botones de historial/En vivo (todo fuera de `<main>`) y el estilo de las pestañas cápsula.
- «Menos movimiento» (sistema o ajustes): todo quieto y visible.
- Revisado en 9 páginas (portada, liga, duelos, database, noticias, tienda, unirme, torneos, palmarés): 0 errores; la mancha borrosa junto al logo al bajar es el ticker escondiéndose (igual sin la capa).
- Archivos: `styles/prof3d.css`, `js/features/prof3d.js`, `js/core/inclinacion.js`, `tests/inclinacion.test.mjs`, `js/boot.js`, `layouts/Layout.astro`, `styles/global.css`, `data/experimento.js`, `CLAUDE.md`. Pruebas 439. Build 45.

#### Ronda 243 — «Ajustes → Animaciones» ahora manda sobre Windows (la capa 3D no se veía)
- Fralex no veía nada de la capa 3D. Revisado en el navegador de su propia PC: la versión nueva SÍ estaba publicada, pero su **Windows tiene las animaciones apagadas** (`prefers-reduced-motion: reduce`), y con «Animaciones: Según el sistema» la web apagaba todo.
- Además había un fallo: elegir **«Siempre activas»** no encendía todo, porque gran parte del CSS (y 4 archivos JS) le preguntaba directamente al sistema operativo.
- Arreglo:
  - `tools/movimiento-postcss.mjs` (plugin de PostCSS en `astro.config.mjs`, con pruebas en `tests/movimientoPostcss.test.mjs`): al construir, cada `@media (prefers-reduced-motion: reduce)` pasa a `:root[data-aj-mov-efectivo='reducido'] …` y cada `no-preference` a `:root:not([data-aj-mov-efectivo='reducido']) …`. 210 reglas convertidas; 0 preguntas directas al sistema en el CSS final.
  - Script corto en `Layout.astro` que pone `data-aj-mov-efectivo` ANTES de pintar (mismo criterio que `core/ajustes.js`) y salta la transición entre páginas si está «reducido» (antes lo hacía un `@media` dentro de `@view-transition`).
  - `reveal.js`, `dopamina.js`, `notifications.js`: leen el atributo en vez de `matchMedia`.
- Comprobado simulando Windows sin animaciones: «Según el sistema» → todo quieto (correcto); «Siempre activas» → 3D, inclinación y ventanas en movimiento; «Reducidas» → quieto.
- Regla nueva en `CLAUDE.md`. Pruebas 442. Build 45.

#### Ronda 244 — Las tablas se mueven más sutil
- Fralex (con captura de la tabla de posiciones): «el movimiento de la tabla sea más sutil».
- Todo panel que contiene una tabla (`table` o `role="table"`) va en **modo suave** (`data-p3-suave`):
  - inclinación con el mouse: máx. **0,8°** (antes ~2,8° en la tabla de Liga); se levanta solo 1 px, más lento y sin borde encendido;
  - al aparecer: menos giro (4°) y sin desenfoque; al salir por arriba: casi nada (2°).
- Las tarjetas chicas (partidos, jugadores) siguen igual.
- Archivos: `js/core/inclinacion.js` (opción `suave`, `MAX_SUAVE`), `tests/inclinacion.test.mjs`, `js/features/prof3d.js`, `styles/prof3d.css`. Medido en Liga: esquina de la tabla = 0,71°. Pruebas 443. Build 45.

#### Ronda 245 — Arreglo: las flechas de «Últimos» (y otros botones chicos) ya no pierden el clic
- Fralex: no podía mover la racha «Últimos» de la tabla con las flechas.
- Causa (capa 3D, ronda 242): al presionar, CUALQUIER panel con `[data-p3]` se «hundía» (`scale(.985)`); en un panel grande eso corría varios píxeles los botones chicos cerca del borde entre `mousedown` y `mouseup`, y el clic se perdía. En la ronda 244 ya no pasaba en paneles con tabla, pero el mismo fallo podía darse en otros paneles con botones.
- Arreglo (`styles/prof3d.css`): el «hundirse» solo en tarjetas que son ellas mismas un botón o enlace (`:is(a, button, [role="button"])[data-p3]:active`). Se quitó la regla de presión del modo suave.
- Medido en Liga: la flecha se mueve 0 px mientras se presiona; el clic avanza la racha (5–9 → 3–7). Probado también en el navegador de la PC de Fralex. Pruebas 443. Build 45.

#### Ronda 246 — Repaso de la portada con la skill taste (FX.pulido)
- Fralex invocó /taste sin más indicación: se revisó la portada actual (4 ventanas) contra la lista de «señales de IA» de taste.
- Bien de partida: sin íconos de relleno, sin rayas largas en textos, un solo punto «·» por línea, identidad cian/púrpura intacta (protegida en CLAUDE.md).
- Arreglado tras `FX.pulido`: (1) las cifras del pulso ya no muestran «—» mientras cargan (barrita quieta) y la que no se puede leer se oculta; si fallan todas, la línea desaparece (`js/pages/central.js`, `ocultarCifra`); (2) esa línea flotaba sola entre dos huecos de 64 px: ahora queda a 24 px de «Campeones vigentes», como su pie; (3) en celular el texto chico de cada ventana usa 2 líneas en vez de cortarse con «…» (`styles/pulido.css`).
- Pendiente de Fralex: rayitas de color junto al nombre de cada ventana (quitar / línea arriba / solo al interactuar). Pruebas 443. Build 45.

#### Ronda 247 — Reparto del menú en 3 grupos por tipo (FX.reparto)
- Pedido de Fralex (/taste): «clasifica cada sección en grupos que correspondan a su tipo, 3 básicamente, prioriza el orden visual». Primero el reparto; juntar páginas repetidas queda para después, con su OK.
- `data/site.js`: `PILARES` = 3 grupos con bloques (`conBloques`): **Competir** (La liga: Liga, Competiciones, Torneos, Formatos · Récords: Historial, Palmarés, Ranking, Jugadores) · **Jugar** (Partidos: Duelos, En vivo, Phoenix Link · Tu club: Liga Máster, Mercado adoptado, Mi club) · **Comunidad** (Conversar: Social, Chat general, Noticias · Grupos y extras: Clanes, Creadores, Eventos, Tienda). La Tienda deja de ser un pilar aparte. Lo personal sigue en «Mi cuenta». Direcciones sin cambios.
- `Header.astro` (desplegable con títulos de bloque), `PilarTabs.astro` (rayita entre bloques; cápsulas sin cambio de estilo), `Sidebar.astro` (celular: títulos de bloque), `styles/reparto.css`. Bloque impar: la última sección ocupa todo el ancho.
- `FX.reparto=false` vuelve a los 4 pilares. Pruebas 443. Build 45.

#### Ronda 248 — Red de enlaces y barra lateral siguen el mismo reparto (FX.reparto)
- Fralex mandó capturas de la «Red de enlaces» y la barra lateral: mezclaban grupos («Comunidad» con Torneos/Formatos/Ranking; «En vivo y comunidad» con todo) y repetían el menú. Pidió reorganizar todo, «solo hazlo».
- `data/site.js`: con `FX.reparto`, «Red de enlaces» = solo lo tuyo: **Tú** (Mi perfil, Mi muro, Logros, Guardados, Mensajes, Amigos) · **Tu juego** (Mis partidos, Phoenix Link, Liga Máster, Mi club) · Staff. Lo público queda en los 3 grupos del menú (arriba en PC; al inicio del panel en celular) y sigue en el buscador (`menu: false`).
- `BarraLateral.astro`: **Jugar ahora** (Duelos, En vivo, Phoenix Link) · **Competir** (Galaxy League, Liga Sudario, Ranking) · **Comunidad** (Chat general, Creadores, Eventos) · Mi cuenta · Amigos.
- `styles/reparto.css`: cuadrículas sin huecos (4 → 2×2, 2 → 2 columnas). Pruebas 443. Build 45.

#### Ronda 249 — Ventana «Mi perfil» mejor ordenada (FX.perfilNuevo)
- Fralex: «organiza mucho mejor esto pero mantén las opciones y la organización que yo le puse». Mismas 4 pestañas (Identidad, Social, Sistema Host, Phoenix Soda) y mismos campos e IDs (la lógica de guardar no cambia).
- `features/profile.js`: título + pestañas cápsula fijos arriba; tarjeta con foto + apodo/@usuario que se actualizan al escribir (`avatarPickerHTML` acepta `cabecera`); bloques con título (Cómo te ven / De dónde eres · Sobre ti / Dónde encontrarte · Tu conexión / Qué hosteas); campos en pares desde 560 px; íconos en Discord y stream; contador 0/280 en la biografía; Phoenix Soda con aviso en recuadro; «Guardar cambios» fijo abajo; ventana más ancha. `styles/perfil2.css`.
- Probado con sesión simulada en PC y celular. Pruebas 443. Build 45.

#### Ronda 250 — Una sola sección «Competiciones» (FX.reparto)
- Pedido de Fralex: «una sola sección llamada competiciones donde estén ligas, torneos, palmarés, formatos y crear ligas».
- `data/site.js`: el grupo «Competir» pasa a llamarse **Competiciones**: bloque *Compite* = Ligas (Liga + página de copas oficiales, que se ilumina como «Ligas») · Torneos · Palmarés · Formatos · **Crear liga o torneo** (`torneos/#crear`, abre la ficha directo; `js/pages/torneos.js`) · bloque *Estadísticas* = Historial · Ranking · Jugadores. `pilar()` admite entradas sueltas (objeto) para acciones como «Crear».
- Barra lateral: título «Competiciones». «Crear» con borde punteado (`reparto.css`). Pruebas 443. Build 45.

---

## Parte 2 · Bitácora e informe · Cuenta ECONOMÍA (chat «D:\Frank\IA\CLAUDE») · 14 al 16 de octubre de 2026

> Origen: `docs/bitacoras/BITACORA-16-OCT-2026-CUENTA-ECONOMIA.md` · último cambio 801bae3 2026-10-18 · 15780 bytes. Copia íntegra.

Para la **otra cuenta** (o cualquier IA) que continúe. Escrito para entender el contexto sin haber visto el chat.
Complementa `docs/bitacoras/BITACORA-16-OCT-2026-CUENTA-OPUS.md` (caras, IA en la web, migraciones 116–118). Lo más nuevo siempre está al final de `REGISTRO.md`.

> **Norma de Fralex (16-oct):** todo se anota en GitHub. **No tiene acceso a Drive por ahora**; cuando lo recupere hay que **copiar también a Drive** lo de la sección 7. No olvidar.

---

### 0. Cómo retomar en 5 minutos
1. `git fetch && git pull --rebase origin borrador` en `Fralexito/phoenixevolution` (si falta algún paquete: `npm install`).
2. Lee `CLAUDE.md`, el final de `REGISTRO.md` y este archivo.
3. Vista previa publicada (fase beta): **`https://fralexito.github.io/phoenixevolution/fase-beta-1-0/tienda/`**. (La URL `/fase-beta/` NO existe; es `fase-beta-1-0`.)
4. Estado de la economía en la base (Supabase `fiibiyijojkxqlsrhcil`, Galaxy League):
   ```sql
   select (select valor from economia_config where clave='pagos_activos') pagos_activos,
          (select count(*) from economia_alertas where not resuelta) alertas_abiertas,
          (select count(*) from private.economia_diferencias()) diferencias_libro;
   ```
   Esperado hoy: `false`, `0`, `0`.
5. Pruebas: `node --test tests/*.test.mjs` (485 pasan, 0 fallos) · `npm run build` (49 páginas).
6. **Migraciones:** las de esta cuenta son 108–113 (aplicadas). Otras cuentas usaron 114 (sitio_ajustes), 116–118. Antes de crear una nueva, mira el final de `REGISTRO.md` y escribe «RESERVADO N».

### 1. Quién es Fralex y cómo trabajar con él
- Español muy simple, poco texto, ejemplos sencillos. **SÍ/NO primero**, sin exagerar. Sabe poco de programación.
- **Lo que no pueda ejecutar la IA se le da como SQL listo para pegar en el SQL Editor de Supabase** (pedido explícito del 16-oct).
- **PAUSA de pruebas dentro del juego** (15-oct, «es mucho estrés»): no pedirle partidos ni pruebas en vivo; solo Ghidra, documentos y libro.
- Mejorar Phoenix Link **dentro de su diseño**, nunca rehacerlo (es un fork de Smash Soda; Mandos, puestos grandes y panel del anfitrión son su alma).
- Los repos de Link y overlay **son públicos**: no empujar a GitHub hasta que los ponga en privado (solo commit local).
- Todo debe funcionar en **cualquier PC y parche**, no solo el de Fralex (regla 5c de COORDINACION.md).

### 2. Sistema de monedas virtuales (lo principal de hoy)
Plan de fases: `docs/economia/PLAN-MONEDAS-VIRTUALES.md`. Diseño de recargas: `docs/economia/DISENO-RECARGAS.md`. **Seguridad: `docs/economia/SEGURIDAD-ECONOMIA.md`** (modelo de amenazas, runbook, lista antes de activar pagos).

#### Decisiones de Fralex
- Dos monedas **separadas** que no se cambian entre sí: **ascuas** (se ganan jugando; las apuestas son solo en ascuas) y **gemas** (se compran con dinero; 1 gema = S/ 0,10; referencia 1 gema = 5 ascuas).
- Empezar con pago **manual** (Yape / Plin / transferencia con revisión del administrador); pasarelas nacionales e internacionales más adelante. Vende como **persona** (aún no tiene RUC).
- Paquetes: `gemas_100` (S/ 10), `gemas_300` (S/ 27), `gemas_700` (S/ 55). Por ahora **sin números reales** de Yape/Plin ni pagos activos: «solo quiero experimentar y ver qué tal se ve».
- «Se va a manejar dinero real» → construir **todo el sistema de seguridad y verificación**.

#### Migraciones (todas aplicadas y probadas en la base real)
| N.º | Qué hace |
|---|---|
| 108 | Precio por moneda (`precio_ascuas`/`precio_gemas`), `comprar_item(p_item,p_moneda)`, `tienda_lista` con ambos precios, `admin_set_precios_item`, `economia_auditar` / `private.economia_diferencias`. |
| 109 | Recargas manuales: `pagos_metodos`, `pagos_manuales`, funciones de orden/comprobante/revisión, bucket privado `comprobantes-pago`. |
| 110 | Paquetes nuevos (100/300/700) y `admin_metodos_pago`. |
| 111 | Integridad: libro `movimientos_tokens` de solo lectura (trigger), máquina de estados de `ordenes_pago`, historial de comprobantes borrados, bitácora `economia_config_log`, permisos mínimos. |
| 112 | Controles de riesgo: `private.admin_seguro` (MFA opcional con `admin_exige_mfa`), `private.pago_banderas`, `crear_orden_metodo` con límites, `enviar_comprobante_manual(p_orden,p_referencia,p_comprobante_path,p_nombre_pagador)`, `admin_resolver_pago_manual(...,p_monto_confirmado)`. |
| 113 | Vigilancia cada 10 min (`private.economia_revisar`), tabla `economia_alertas`, `admin_alertas`, `admin_resolver_alerta`, `admin_economia_revisar_ya`, **freno de emergencia** (apaga `pagos_activos` ante una alerta crítica), `admin_set_pagos_activos` exige 0 críticas; tareas pg_cron `economia_revisar_cada_10_min` y `economia_expirar_ordenes`. |

#### Límites configurados (`economia_config`)
Tope diario por persona S/ 200 · global S/ 2000 · cuenta nueva (7 días) ≤ S/ 30 por orden · ≤ 3 pendientes · ≥ 3 rechazos/semana bloquea · desde S/ 100 el admin escribe el monto recibido · vencimiento manual 24 h · `alerta_ascuas_dia` 400 · `alerta_ordenes_dia` 6 · `pagos_activos=false` · `admin_exige_mfa=false`.

#### Interfaz (tienda)
Archivos: `src/pages/tienda.astro`, `src/js/pages/tienda.js`, `src/js/features/economia/{api,demo,recargas}.js`, `src/js/core/economia/economia.js`.
- Jugador: precios en dos monedas, pestaña **Comprar gemas** (método → orden → pagar → subir captura + código + **nombre de quien pagó**).
- Administrador (pestaña **Administrar**, visible con el permiso `administrarTienda`; el rol `admin` en `perfiles`): Vigilancia del dinero (alertas, «Revisar ahora»), Pagos por revisar (con banderas y doble confirmación de monto), Métodos de pago, Precios por moneda, Auditoría.
- Modo demostración (solo desarrollo): `api.esDemo()`; los contratos del demo están en `demo.js`.

#### Pruebas
- JS: `tests/economia.test.mjs` (12) dentro de la suite de 485.
- SQL (se deshacen solas, terminan con `TODO_OK_REVERTIDO`): `supabase/tests/111_integridad_test.sql`, `113_vigilancia_test.sql`. `108_...` ok. **`109_...` está OBSOLETA** (la 112 cambió el contrato). **Falta guardar las pruebas de la 112** (se ejecutaron contra la base pero no quedaron como archivo).

### 3. Lo que sigue (pendiente de la economía)
**De Fralex** (todo lo que sea SQL se le da listo para pegar):
- Activar MFA en su cuenta admin y luego `update public.economia_config set valor='true' where clave='admin_exige_mfa';`
- Activar «Leaked password protection» y MFA en Supabase Auth.
- Poner en privado los repos de Link y overlay.
- Cargar su número real de Yape/Plin (desde el panel o `update public.pagos_metodos set datos = jsonb_build_object('yape','NÚMERO','titular','NOMBRE'), activo = true where clave='manual_yape';`) y **probar un pago real pequeño**.
- Abogado (términos de compra) y contador (RUC/comprobantes).
- Encender los pagos **solo desde el panel Administrar** (en el SQL Editor el chequeo de admin no lo reconoce).

**De la IA:**
1. Escribir `supabase/tests/112_riesgo_test.sql` (límites, banderas, nombre de pagador, doble confirmación, captura única) y reescribir o borrar la 109.
2. Fase siguiente del plan: pasarela (Mercado Pago/otras) con `pago-webhook` firmado (HMAC) — ver `docs/economia/DISENO-RECARGAS.md`. El esqueleto `interpretar()` lanza «no implementado» a propósito.
3. Retos con pozo/apuestas con gemas: **no abrir** sin revisión legal (Perú). Los regalos de TikTok no se mezclan con gemas.

### 4. Gotchas técnicos (ahorran horas)
- Patrón seguro de prueba: migración + bloque `DO` que termina en `RAISE EXCEPTION 'TODO_OK_REVERTIDO'` (todo se deshace). `execute_sql` y `apply_migration` funcionan en esta cuenta (necesitan `project_id`).
- plpgsql: `IF x > CASE … END THEN` falla (usar variable); `texto[] || 'x'` falla (usar `array_append`); evita nombres de variable iguales a columnas.
- `auditoria_staff_accion_check` solo admite `crear/editar/borrar/ocultar/rol/sancion/sistema`.
- El libro es inmutable: para probar, todo dentro de transacción deshecha.
- Si dos cuentas trabajan a la vez, `git pull --rebase` antes de empujar; `REGISTRO.md` solo se añade (en un conflicto se conservan ambos lados).

### 5. Otros frentes de este chat (resumen; el detalle está en el libro local, ver sección 7)
#### PES 2021 · cancha, 4v4 y N contra N (ingeniería inversa)
- Objetivo de Fralex: descifrar todo PES 2021; campo de tamaño arbitrario y partidos **N contra N elegibles** (2v2…6v6, 4v4 estilo FIFA Street con portero).
- Hallado: control de tamaño de campo (estructura de floats en memoria; el «fuera» y la posición del portero la leen), máquina de estados `SetState` (+0x6EEBB0) = `match::anime::ActionManager` con estados con nombre, Ghidra con análisis completo del exe recortado.
- Pruebas de **tarjetas rojas** (5 partidos) para hallar el contador de jugadores en campo. Regla clave: **con menos de 7 jugadores un equipo termina el partido** → hay que desactivarla para N<7 (buscar la comparación contra 7).
- Lectura de `Judge`, `InplayDemoContact`, `Injury`: resultado negativo para el 4v4 (aún no se encontró el sitio exacto).
- **Pausa de pruebas en el juego** desde el 15-oct. Siguiente (solo estático): localizar el contador de jugadores y la comparación contra 7 con Ghidra/xrefs; módulo Sider con eventos personalizados.

#### Phoenix Link (C++, repo `smash-soda-fork`, carpeta `_phoenix-link`)
- Versión actual **0.2.90** (`SmashSoda/phoenix/PhoenixBuild.h`, `kVersion`; se sube en cada cambio). Compilar con `cmake --build`, **nunca** `COMPILAR_PHOENIX.bat --force` (borra lo no commiteado).
- Cambio de hoy: pestaña **«SONIDOS CHAT»** (cambio mínimo; se decidió NO simplificar la interfaz sin saber qué confunde: se pidieron 3 cosas concretas).
- Sync es un pilar con sección propia en la UI (nunca dentro de Ajustes). `sider.ini` solo se toca con el instalador. Base de datos Phoenix-DB = copia **provisional**; cambio con `sync-publicar-oficial --base`.

#### Experimento TikTok (solo experimento, reversible)
- `_phoenix-link/tools/tiktok-experimento/` (sin git): marcador/capa vertical de directo. No está conectado a gemas ni a dinero.

#### Pendiente del libro
- Los avances del 15-16 oct (rojas, regla de 7, pausa, economía) están en `LIBRO_PERSONAL` local (`00_BITACORA_VIVA.md` y `cap_13_diario_15_a_16_oct.md`).

### 6. Estado de los demás hilos (otras sesiones de este chat)
- «Caras de jugadores PES: continuar»: se buscó rastro de un trabajo de caras previo y **no existe** (último cambio de `Faces` el 28-ago-2026, jugador 1631). El trabajo real de caras lo hizo la cuenta Opus (ver su bitácora y `docs/web-pes-link/MINIFACES.md`). Falta que Fralex diga qué quiere hacer con las caras.

### 7. Pendiente de copiar a Drive (cuando Fralex vuelva a tener acceso)
Carpeta «Phoenix Link — Guías y logros» (y la del libro, id `1t5Cg5sc1gdP7ege8nVc07Oyma0lJqmwJ`):
- `docs/economia/PLAN-MONEDAS-VIRTUALES.md`, `docs/economia/DISENO-RECARGAS.md`, `docs/economia/SEGURIDAD-ECONOMIA.md`, este archivo.
- Libro personal local: `D:\Frank\Games_\PRUEBA_CANCHA\informes\LIBRO_PERSONAL\` (`00_BITACORA_VIVA.md` actualizada y `cap_13_diario_15_a_16_oct.md` nuevo). Estado de la subida anterior: `_estado_subida_drive.md` (unidad `H:` no montada).
- Borrar a mano en Drive los 4 documentos «[TRUNCADO — NO USAR]» (ver `_estado_subida_drive.md`).

---

### 8. ACTUALIZACIÓN (16-oct, tarde): estado al cerrar esta cuenta

#### Hecho desde la sección 7
- **Economía Fase A** (migración 119): rarezas, 16 objetos, paquetes Chispa 50/S5 · Brasa 110/S10 · Llama 300/S25 · Fénix 650/S50, bono de primera compra +50 %.
- **Fase B** (120): racha diaria, primer partido, misiones semanales, logros (todo en ascuas). Informe: `docs/economia/ECONOMIA-FASE-B.md`.
- **Fase C** (121): efectos de carta, banners, sonidos de chat. Informe: `docs/economia/ECONOMIA-FASE-C.md`.
- **Fase D** (122): pasarela Mercado Pago (webhook firmado, `pago-crear`, `pago-conciliar`), método `mercadopago` INACTIVO. Informe: `docs/economia/ECONOMIA-FASE-D.md`; guía simple para Fralex: `docs/economia/GUIA-PASARELA.md`.
- **Fase E** (123): Phoenix Pass (Temporada 1 «Despegue», empieza el 17-oct) y marca «torneo premium». Informe: `docs/economia/ECONOMIA-FASE-E.md`; diseño y 7 preguntas: `docs/economia/DISENO-PASS-Y-ORGANIZADORES.md`.
- **MFA:** pantalla en Tienda → Administrar → «Seguridad de tu cuenta». Fralex pidió quitar la exigencia: `admin_exige_mfa` debe quedar en `false` (verificar con una consulta; la pantalla sigue disponible).
- Estado verificado: `pagos_activos=false`, 0 alertas, 0 diferencias, 550 pruebas, 53 páginas.
- Plan completo y precios propuestos: `docs/economia/DISENO-ECONOMIA-COMPLETA.md`.

#### Decisiones de Fralex (16-oct)
- Solo cosmético y comodidad; sin ventaja en el juego ni azar de pago. Las gemas NO se retiran ni se cambian por ascuas.
- Apuestas entre jugadores: **solo con ascuas** (sin dinero). Las apuestas con dinero real NO se construyen (requieren licencia de Mincetur con garantía de millones de soles; cifras sin confirmar, ver abogado). Se evaluó: ser afiliado de una casa autorizada (futuro, sin prisa) y torneos con cuota fija y premio prefijado (competencia de habilidad; falta confirmar con abogado).
- Pagos reales a un grupo pequeño: «dentro de un mes más o menos», PERO antes hace falta empresa y RUC (ver abajo).
- Lo que la IA no pueda ejecutar se entrega como SQL listo para pegar en el SQL Editor.
- Anotar todo en GitHub; sin Drive por ahora (copiar a Drive cuando vuelva).

#### Prerrequisitos legales antes de cobrar dinero real (resumen de una investigación con Gemini, SIN verificar por un abogado)
1. Constituir una empresa (S.A.C. o E.I.R.L.) y sacar RUC; régimen MYPE Tributario (el contador decide). Cobrar muchas ventas en un Yape personal sin RUC es riesgo.
2. Libro de Reclamaciones virtual visible en la portada, sin iniciar sesión.
3. Casilla obligatoria antes de pagar: entrega inmediata de gemas y pérdida del derecho de retracto.
4. Precios en soles con IGV incluido; boletas electrónicas.
5. Consentimiento (casilla no premarcada) para datos personales, política de privacidad, aviso de que el chat se modera; inscribir el banco de datos ante la autoridad de protección de datos; conservar comprobantes 5 años.
6. Aviso de que las ascuas no tienen valor en dinero y no se transfieren.
7. Revisar el uso de escudos, nombres y fotos de clubes y jugadores reales (cartas, Liga Máster) y el riesgo de PES 2021 (Konami) y del parche de comunidad.
8. Las pasarelas prohíben apuestas sin licencia: no mezclar.
Los cambios 2, 3, 4, 5 y 6 se pueden construir ya en la web.

#### Pendiente (para la cuenta que continúe)
- Fralex debe responder las 7 preguntas de `docs/economia/DISENO-PASS-Y-ORGANIZADORES.md` (pase 150 gemas, temporada 60 días/30 niveles, torneo premium 300 gemas, propinas solo en ascuas, patrocinios, overlay TikTok, 7 días de gracia). Si no responde, queda lo propuesto.
- Construir los cambios legales de la web (puntos 2–6 de arriba) y revisar imágenes de clubes.
- Pruebas SQL de la migración 112 (`supabase/tests/112_riesgo_test.sql`) y reescribir/borrar la 109.
- Diseñar el «torneo con inscripción» (cuota fija, premio prefijado) para llevar al abogado.
- Fralex: abogado, contador, empresa/RUC, secretos de Mercado Pago (guía), leaked password protection, repos de Link/overlay en privado, Drive.
- Siguiente migración libre: **124**. Antes de usarla, mirar el final de `REGISTRO.md` y escribir «RESERVADO 124».

---

## Parte 3 · Bitácora e informe · Cuenta Opus · 13 al 16 de octubre de 2026

> Origen: `docs/bitacoras/BITACORA-16-OCT-2026-CUENTA-OPUS.md` · último cambio 01e6efc 2026-10-18 · 9854 bytes. Copia íntegra.

Para la **otra cuenta** (o cualquier IA) que continúe el trabajo. Está escrito para entender el contexto sin haber visto el chat.
Lo más nuevo siempre está al final de `REGISTRO.md`. El detalle técnico de cada ronda está en `MAPA.md` (busca «Ronda 3xx (cuenta Opus»).

---

### 0. Cómo retomar en 5 minutos
1. `git fetch && git pull --rebase origin borrador` en `Fralexito/phoenixevolution` (si dice «cannot find @astrojs/react» o «@phosphor-icons»: `npm install`).
2. Lee `CLAUDE.md`, el final de `REGISTRO.md` (busca la línea **TRASPASO** del 16-oct) y este archivo.
3. Comprueba en Supabase si FRALEX ya pegó el SQL pendiente (sección 3):
   `select to_regclass('public.ia_propuestas') bandeja, to_regclass('public.ia_chat_uso') chat, (select count(*) from cron.job where jobname='limpiar-registro-cron') limpieza;`
4. **Siguiente número libre:** migración **119** · ronda **347** (antes de usarlos, mira el final de `REGISTRO.md` y escribe «RESERVADO N»: las dos cuentas trabajan a la vez y ya chocamos 3 veces de numeración).
5. Pruebas: `npm test` (≈500 pasan, 0 fallos) · `PES_BASE=/ npm run build` (≈53 páginas).

### 1. Quién es FRALEX y cómo trabajar con él
- Se le llama **FRALEX** (nunca su nombre oficial). Español, muy simple, espaciado, ejemplos sencillos, sin dar nada por sentado, cerrar con una pregunta.
- Le cuesta la terminología nueva; si hay números o símbolos seguidos se marea. Mejor pocas cosas por mensaje.
- Nunca pedirle secretos en el chat (claves, contraseñas).
- **Si Supabase no deja aplicar algo (`apply_migration` sale «cancelled»), pasarle el SQL sin comentarios** y él lo pega en el SQL Editor. En esta sesión `apply_migration` se canceló SIEMPRE; `execute_sql` sí funciona para consultas y `update` pequeños; `deploy_edge_function` sí funciona.
- **Anotaciones (norma 16-oct):** todo lo importante va a GitHub (`docs/`, `MAPA.md`, `REGISTRO.md`). No tiene Drive por ahora; cuando vuelva, copiar también a Drive (lista en la sección 6).
- **Anotar SIEMPRE** para que la otra cuenta entienda el contexto: bitácora, informe y línea en el registro (pedido explícito del 16-oct).
- Le gusta avanzar en pasos pequeños donde vea un logro. Para cosas grandes quiere un **informe aparte del plan** antes (ver `docs/comunidad/PLAN-IA-WEB.md` como ejemplo).

### 2. Qué se hizo (en orden)

#### 13-oct · Liga Máster y fotos (rondas 265–293, resumen)
- Premios, perfil de jugador premium (275), Mi club galáctico (278), Liga Máster unificada con Mi club (280), sincronización automática juego→web del lado de la web (migración 106).
- 314 jugadores **temporales** reales en los 12 clubes (`lm_jugadores`), con valores de mercado reales y medias por jerarquía (81 élite a mano + fórmula). Ficha `/futbolista/?id=` para todos.
- Fotos de Wikipedia/Commons con carrusel automático en loop (284–289; arreglo clave: Wikipedia sirve desde `thumb.wikimedia.org`).
- Vista Grandes/Compactas, filtros por línea, orden y lupas de tamaño en las cartas (290–292). «2da división» junto a Liga Sudario (293). Contactos separados En línea/Desconectados (286).

#### 16-oct · Caras del juego (rondas 338–339) → guía completa en `docs/web-pes-link/MINIFACES.md`
- Con la PC de FRALEX enlazada (solo lectura) se sacaron las **minifaces del parche Conmegol** (orden del juego: livecpk `Logos` > `dt80_*` > `dt14_all`), se cruzaron con `Player.bin` y se **mejoraron con Real-ESRGAN x2**.
- 254 caras en `public/minifaces/<pes_id>.webp`; lista en `src/data/minifaces.js`; mandan sobre Wikipedia en las cartas y son la 1.ª foto de la ficha.
- **Se guardó `pes_id` en 308 jugadores** de `lm_jugadores`. ⚠️ Ya **no** borrar los jugadores con `pes_id is null` antes de importar el catálogo: el import (`sistema_lm_importar`) los actualiza por `(liga, pes_id)` sin cambiarles el club.
- Herramientas: `tools/minifaces/cpk.py` (lector de .cpk, solo lectura) y `tools/minifaces/mejorar.py`.
- Copia de trabajo que quedó en la PC: `D:\Frank\Games_\Conmegol Patch\_phoenix_web_minifaces\minifaces.zip` (se puede borrar).

#### 16-oct · Prompt del sistema de datos web ↔ PES (ronda 343)
- `docs/web-pes-link/PROMPT-SISTEMA-DATOS-WEB-PES.md`: encargo en 6 fases (F0–F5) para que el chat de Phoenix Sync haga que estadísticas/datos viajen juego→web y web→juego (con aprobación del staff, copias, hash igual en todas las PCs). FRALEX lo iba a pegar en Claude Code del programa.

#### 16-oct · Base de datos: limpieza del registro de cron (ronda 342, migración 116)
- `cron.job_run_details` crecía ~5.600 filas/día (~30 MB/mes; ya 12 MB = lo más pesado de la base) porque 4 tareas corren cada minuto. La migración 116 borra lo de más de 7 días y agenda `limpiar-registro-cron` (04:23 Lima). **Pendiente que FRALEX pegue el SQL.**
- Estado de la base al revisar: 39 MB de 500 MB, 0,65 MB de storage, 3 usuarios. Advisors de seguridad: sin errores; avisos: activar «leaked password protection» (lo hace FRALEX en el panel) y revisar 33 funciones SECURITY DEFINER ejecutables por anon.

#### 16-oct · IA en la web (ronda 345) → plan y guía en `docs/comunidad/PLAN-IA-WEB.md`
Principio: **la IA prepara, FRALEX o un moderador aprueba**. La IA nunca toca dinero/gemas, sanciones ni borra.
1. **Bandeja de aprobación** `/bandeja-ia/` (grupo Staff, permiso `bandejaIA` = moderador/admin). Migración **117**: `ia_propuestas`, `ia_resumenes`, `ia_bandeja()`, `ia_revisar()` (aprobar noticia = publicarla; rechazar = queda borrador). Nadie escribe propuestas desde la web.
2. **Redacción IA v2**: la tarea programada «Redacción IA Phoenix» (`trig_015J8uKVSgYhWkSXE1P8FRZx`, 9:54 a. m. Lima) ahora escribe con picardía SOLO deportiva, hace noticias de fichajes (`lm_movimientos` 48 h), deja cada borrador en la bandeja, hasta 3 avisos/día y un resumen diario. Si la bandeja no existe aún, solo hace borradores y avisa.
3. **Chat de ayuda** `/ayuda-ia/` (FX.ayudaIA): Edge Function `ayuda-ia` **desplegada** (v2, verify_jwt=false, comprueba la sesión dentro). Sin herramientas, límites 15/persona/día y 300/día (migración **118**: `ia_chat_uso`, `ia_chat_turno` solo service_role). Sin la clave `ANTHROPIC_API_KEY` en Secrets dice «todavía no está activa».
- Revisión de seguridad independiente: nada alto ni medio; 2 detalles bajos arreglados.

### 3. Pendientes de FRALEX (lo que él tiene que hacer)
| # | Qué | Dónde | Estado |
|---|---|---|---|
| 1 | Pegar el SQL de las migraciones **116 + 117 + 118** (sin comentarios) | Supabase → SQL Editor → Run | ✅ **HECHO 16-oct 08:46** (verificado: tablas, 3 funciones y 2 tareas nuevas; registro de cron bajó de 67.252 a 42.802 filas) |
| 2 | **Paso B:** clave del chat (`ANTHROPIC_API_KEY`) con límite de gasto mensual | console.anthropic.com → Supabase → Edge Functions → Secrets | Pidió que se le recuerde: tarea programada `trig_01U25BkMjL7LVdWejUJhYgSg` el **lunes 19-oct 10:00 Lima** |
| 3 | Activar «leaked password protection» | Supabase → Authentication | Pendiente desde antes |
| 4 | Pegar el prompt `docs/web-pes-link/PROMPT-SISTEMA-DATOS-WEB-PES.md` en el chat de Phoenix Sync | Claude Code del programa | Lo iba a hacer |
| 5 | Copiar a Drive los docs del 16-oct cuando vuelva a tener Drive | Drive | Ver sección 6 |
| 6 | Al terminar de iniciar sesión en Supabase: tenía 2 cuentas (GitHub vs correo); la buena es la que muestra la organización «Phoenix Evolution Series» | supabase.com | Resuelto («ya está») |

### 4. Pendientes técnicos (para la cuenta que siga)
- Cuando FRALEX pegue el SQL: comprobar la bandeja (`select * from ia_propuestas`), mirar el primer resumen tras las 9:54 y revisar la ejecución de la tarea programada.
- Catálogo real del parche (F1 del prompt de datos): reemplazará los datos temporales de `lm_jugadores` actualizando por `pes_id`.
- 56 jugadores sin miniface (canteranos/fichajes que el parche no trae) y 6 sin cruce (Marli Salmon, Andre Harriman-Annous, Filip Pavić, David Santos Daiber, Tynan Thompson, Cassiano Kiala).
- Ideas recomendadas a FRALEX y aún no hechas: copias de seguridad semanales de la base (el plan FREE no tiene backups y se pausa a la semana sin actividad), resultados automáticos desde el juego, «huella» del parche antes de cada partido, instalador de 1 clic, una sola cuenta para web/Link/Sync.
- Ofrecido y no confirmado: interruptor de admin entre fichajes automáticos y autorizados (necesitaría migración nueva).

### 5. Datos técnicos útiles
- Supabase `fiibiyijojkxqlsrhcil` (org «Phoenix Evolution Series», proyecto «Galaxy League», sa-east-1).
- Permisos SQL: `private.es_moderador()` (moderador/admin), `private.es_staff()` (ayudante+), `private.es_admin()`. Borradores de `noticias` solo los lee un admin por RLS.
- Tareas pg_cron: 14 (+2 nuevas con 116/118). Cuatro corren cada minuto (procesar-retos, recordar-eventos, procesar-clanes, salas-caidas).
- Formatos del juego (Conmegol 27): `.bin` = WESYS 16 B + zlib; Player.bin 312 B/registro (pid +8, nombre +251); Team.bin 1.532 B (id +0, nombre +368); PlayerAssignment 16 B (id, pid, equipo, flags). Detalle en `docs/web-pes-link/MINIFACES.md` y `docs/web-pes-link/PROMPT-SISTEMA-DATOS-WEB-PES.md`.
- El sandbox de la nube NO llega a `*.supabase.co` ni a `github.io` por red (usar el conector MCP de Supabase; las capturas con Playwright se hacen con datos simulados).

### 6. Lista para copiar a Drive (cuando FRALEX vuelva a tenerlo)
`docs/web-pes-link/MINIFACES.md` · `docs/web-pes-link/PROMPT-SISTEMA-DATOS-WEB-PES.md` · `docs/comunidad/PLAN-IA-WEB.md` · este archivo · `docs/bitacoras/INFORME-16-OCT-2026-REACT-HERRAMIENTAS-Y-ORDEN-VISUAL.md` (de la otra cuenta).

---

## Parte 4 · Bitácora del 16-oct-2026 · cuenta WEB (Sonnet) — para que la otra cuenta retome

> Origen: `docs/bitacoras/BITACORA-16-OCT-2026-CUENTA-WEB.md` · último cambio 801bae3 2026-10-18 · 4812 bytes. Copia íntegra.

Complementa `docs/bitacoras/BITACORA-16-OCT-2026-CUENTA-OPUS.md` (migraciones 116–118, IA, caras). Aquí: rondas 340–347 de la cuenta WEB. Rama `borrador` = vista previa privada «FASE BETA 1.0» (`/phoenixevolution/fase-beta-1-0/`); son lo mismo, solo cambia el nombre. `main` (web oficial) NO tiene nada de esto; sale solo con «Súbelo»/«Publícalo».

### Cómo retomar (3 pasos)
1. `git pull --rebase origin borrador`, leer el final de `REGISTRO.md` y `CLAUDE.md`.
2. `npm test` (506 pasan, 0 fallos) y `npm run build` (53 páginas) para confirmar el punto de partida.
3. Elegir pendiente de la lista de abajo. Siguiente ronda libre: **348** (mirar MAPA.md; los números chocan a menudo entre cuentas).

### Qué se hizo hoy
- **R340 · React (isla de prueba):** `src/islas/CentroPartido.jsx` en `/laboratorio/` (sin enlace en el menú, datos inventados). Lógica en `core/competicion/centroPartido.js` + test. Regla fija en `CLAUDE.md`: web = JS puro; React solo como isla en pantallas muy interactivas.
- **R341 · Radar estilo FIFA** en la ficha de jugador de la comunidad (`core/jugadores/radarFifa.js`, `features/radarFifa.js`, bandera `FX.radarFifa`, estilos `.rf*` en `perfilJugador.css`). Los futbolistas de Liga Máster no tienen radar: faltan las 14 stats.
- **R344 · Orden visual** (51 páginas revisadas en PC y celular): cabeceras en tarjeta `glass-panel` en Historial, Jugadores, Noticias y Configuración; en celular se oculta el «Explora» del pie si hay barra inferior; tiras de pestañas con desvanecido y pestaña activa centrada (`features/tirasDeslizables.js`).
- **R346 · Modo ligero automático** para celulares lentos (`core/sistema/rendimiento.js`, `features/modoLigero.js`, `styles/modoLigero.css`): detecta por señales o midiendo tirones; apaga 3D/efectos/blur; dura 14 días; «Ajustes → Animaciones → Siempre activas» lo anula. **No probado en un celular real**: si no se activa, afinar la sensibilidad.
- **R347 · Anti-lag** (pedido: «revisa residuos que causan lag, optimiza sin perder nada»): escudos `.escudo` pausados fuera de pantalla (`features/pausaFueraDePantalla.js`, atributo `data-fuera`); pulso del `.estado-punto` con transform/opacity en `::after` (antes box-shadow); estrellas de la portada ~30 fps y dpr máx 1,5 en celular. Mediciones en el sandbox muy ruidosas (no hay antes/después fiable).
- **Informes:** `docs/bitacoras/INFORME-16-OCT-2026-REACT-HERRAMIENTAS-Y-ORDEN-VISUAL.md`, `docs/economia/INVESTIGACION-DISENO-APUESTAS-Y-GAMING.md`.

### Diagnóstico de rendimiento (para seguir con R348+)
- CSS ≈ 657 KB, solo 22–25 % usado por página. Fuentes de iconos: Phosphor 147 KB + FontAwesome 136 KB, ambas cargadas.
- ~42 animaciones infinitas en inicio/liga (escudos, punto de estado, otras con box-shadow que repintan).
- Ideas pendientes: recortar fuentes de iconos (usar solo los glifos de `data/iconosFinos.js` + usos directos `ph-`; woff2), quitar CSS sin usar con cuidado, `content-visibility:auto` en secciones largas de Liga, revisar otros `@keyframes` que no sean transform/opacity.
- Trampa de build: `backdrop-filter` sin prefijo se pierde si `-webkit-backdrop-filter` no va ANTES en la misma regla.

### Pendientes
- **Consejos que FRALEX pidió recordarle después:** llaves de torneo (brackets-viewer), sonidos (Howler), celebración al ganar (Lottie/Rive), alineación arrastrable (SortableJS), títulos de Social/Comunidad y Legal, radar para Liga Máster, inicio personalizado, franja de aliados.
- **Alquilar:** expirar solicitudes sin respuesta a las 48 h (requiere SQL), valoraciones del anfitrión, horarios, notificaciones con enlace, disputa de no-show. **Duelos:** confeti/ELO animado, sugerencia de rivales.
- Configurar en Supabase Auth la Redirect URL de la vista previa; pruebas con sesión real por FRALEX (el sandbox no llega a Supabase).
- Los pendientes de FRALEX de la bitácora Opus (paso B ANTHROPIC_API_KEY, leaked password protection) siguen vigentes.

### Norma de anotaciones (desde 16-oct-2026)
FRALEX no tiene Drive por ahora: todo se guarda SOLO en GitHub (`docs/`, `MAPA.md`, `REGISTRO.md`); no escribir docs nuevos en el proyecto de claude.ai. **Cuando FRALEX vuelva a tener Drive, subir también a Drive todo lo de `docs/` (incluidos estos informes y bitácoras). No olvidar.**

### Reglas de FRALEX (recordatorio)
Español, respuestas cortas y simples, definir términos desde cero, cerrar con pregunta de confirmación; sin ventanas nativas; texto ≥12 px; parche «Conmegol»; SQL sin comentarios; nunca pedir secretos; no tocar `SmashSoda/` ni `PhoenixSync/`; identidad Galaxy cian+púrpura / Sudario azul+dorado; «nada se mueve solo, todo responde a la persona».

---

## Parte 5 · Informe del 16-oct-2026: React, herramientas, radar FIFA y orden visual

> Origen: `docs/bitacoras/INFORME-16-OCT-2026-REACT-HERRAMIENTAS-Y-ORDEN-VISUAL.md` · último cambio 801bae3 2026-10-18 · 4453 bytes. Copia íntegra.

Para FRALEX y para cualquier IA que continúe. Rondas 340–344 (rama `borrador`).

### 1. ¿React sí o no? (decisión)
- La web es Astro + JavaScript puro. **Decisión: no migrar todo a React.** Se usa React solo como «isla» en pantallas muy interactivas o en vivo. La regla está en `CLAUDE.md` («Cuándo React y cuándo JavaScript»).
- Opciones evaluadas: (a) quedarse; (b) parcial con islas; (c) completo. Completo = reescribir 51 páginas + 496 tests, 2–4 semanas sin funciones nuevas, y web más pesada. Parcial = riesgo bajo y es el camino hacia el completo si algún día hace falta.
- Un clon del repositorio para replicar en React es posible, pero la copia se desactualiza mientras la otra cuenta sigue cambiando la web; si se hace, congelar la web actual o aplicar cada cambio en las dos.
- Lo «premium» visual no depende de React: depende del pulido (animaciones, espaciado, tipografía, rapidez). Las librerías de componentes famosas (Aceternity, Magic UI, shadcn) son solo React.
- **Primera isla (ronda 340):** `src/islas/CentroPartido.jsx` en `/laboratorio/` (sin enlace en el menú), datos inventados; lógica en `src/js/core/competicion/centroPartido.js` + test. Instalados `react`, `react-dom`, `@astrojs/react`. Las demás páginas NO cargan React.

### 2. Herramientas investigadas
Leídas en sus páginas: GSAP (gratis, plugins incluidos, ~27 KB), Anime.js (MIT, ~6 KB), brackets-viewer.js (llaves de torneo en JS puro: eliminación simple/doble y todos contra todos; licencia sin confirmar), Pagefind (buscador estático), vistas de transición de Astro, Subfont (tipografías más ligeras), Aceternity UI (React; premium ~$199 de por vida).
Por conocimiento general, sin verificar hoy: Lenis, Auto-Animate, Driver.js, Rive, Lottie, Howler/Tone.js, SortableJS/dnd-kit, Konva/Pixi, Three.js, ECharts/D3.
Pendientes elegidos por el usuario: llaves de torneo (brackets-viewer), sonidos (Howler), celebración al ganar (Lottie/Rive), alineación arrastrable (SortableJS). Ya instalados de antes: Fuse.js, Floating UI, uPlot, confeti, Lenis (scroll suave).

### 3. Radar «estilo FIFA» (ronda 341)
- Ficha del jugador de la comunidad (`/jugador/?id=…`): hexágono de 6 ejes (Ataque, Creación, Técnica, Defensa, Presión, Mentalidad = `core/jugadores/estilo.js`), número de color por nivel, lista con barras, «Media de ejes», y al tocar/pasar el mouse por un eje se ve de qué stats sale.
- Archivos: `core/jugadores/radarFifa.js` (+`tests/radarFifa.test.mjs`), `features/radarFifa.js`, estilos al final de `styles/perfilJugador.css`, bandera `FX.radarFifa`.
- Límite: los futbolistas de la Liga Máster (`/futbolista/`) solo tienen «media»; para darles radar hacen falta las 14 stats por jugador.
- Bug hallado en la prueba y corregido: con mouse el hover marcaba el eje y el clic lo desmarcaba.

### 4. Revisión visual de las 51 páginas (PC 1280 y celular 390, sin sesión y sin datos reales)
Sin desbordes horizontales ni texto menor a 12 px. Hallazgos y qué se hizo (ronda 344):
1. Dos estilos de cabecera mezclados (tarjeta de vidrio vs gran título con degradado y esquinas), incluso dentro de «Competiciones». **Hecho:** Historial, Jugadores, Noticias y Configuración pasan al estilo tarjeta (mismo tamaño 36,8 px). **Regla acordada:** gran título solo para portadas/información (Competiciones, Formatos, Torneos, Temporada, Únete, Quiénes somos, Divisiones); tarjeta para el resto. Pendiente de decidir: Social/Comunidad sin título visible (se dejó así por el scroll), textos legales (30 px).
2. Celular con demasiado «marco» antes del contenido: **Hecho:** el «Explora» del pie se oculta con la barra inferior (se mantiene si el Panel añadió enlaces propios).
3. Tiras de secciones cortadas en celular: **Hecho:** desvanecido en el borde con más contenido y la pestaña activa se centra (`features/tirasDeslizables.js`).
4. Las páginas con sesión y datos reales (Jugadores, Duelos, Perfil, Liga) no se pudieron juzgar completas (Supabase bloqueado desde las pruebas).

### 5. Norma nueva de anotaciones
Desde el 16-oct-2026: anotaciones e informes importantes **solo a GitHub** (`docs/`, `MAPA.md`, `REGISTRO.md`) porque no hay Drive disponible. Cuando vuelva Drive, subir también todo a Drive (incluidos estos informes). Ya no se escriben docs nuevos en el proyecto de claude.ai.

---

## Parte 6 · Traspaso · Noticias como diario (16-oct-2026, cuenta Opus)

> Origen: `docs/bitacoras/TRASPASO-NOTICIAS-DIARIO-16-OCT-2026.md` · último cambio 801bae3 2026-10-18 · 4170 bytes. Copia íntegra.

Para la IA que continúe la charla. Todo esto ya está hecho y empujado a la rama `borrador`.

### 1. Qué se construyó (ronda 349 + dos arreglos)

La página de Noticias pasó a ser **un diario con departamentos**. Bandera: `FX.diario` en `src/data/experimento.js` (ponla en `false` y vuelve la grilla de antes).

| Archivo | Qué hace |
|---|---|
| `src/js/core/portada/departamentos.js` | Catálogo de **24 departamentos** (color, firma, voz, de qué parte de la web se alimenta) + `departamentoDe()`. Detecta **primero por la etiqueta** y recién después por el título. |
| `src/js/core/portada/diario.js` | `ordenDelDia()` baraja la portada con semilla de la fecha + 5 reglas; `armarPortada()` arma afiche, primera plana, últimas, resto y joda. Si hay orden manual del staff, ese manda. |
| `src/js/core/portada/afiche.js` | Decide **qué** va en el afiche del día: tipo, color del día, grito corto, palabra resaltada, marcador, inicial. |
| `src/js/features/noticias/afiche.js` | Dibuja el afiche en HTML y lo exporta a **PNG con canvas** (3:4 y 9:16) + `navigator.share` en celular. |
| `src/js/features/noticias/diario.js` | Pinta la portada corta y conecta los botones de descarga. |
| `src/styles/diario.css` | Estilos (`.af-*`, `.dia-*`). Ojo: dentro del afiche se anula `main[data-sia] h2`, que ponía los títulos en fila. |
| `tests/diario.test.mjs` | 15 pruebas del núcleo. |

**Las 5 reglas del orden** (en `diario.js`): manda lo más fuerte del día · la joda siempre va después de lo serio · nada repetido al lado · lo urgente (Tribunal/En vivo) nunca al final · el orden manual del staff gana al azar.

Se conserva TODO lo anterior: Acomodar (GridStack), catálogo de diseños, lienzo libre y editor.

Estado: **565 pruebas en verde**, build de 53 páginas, probado en PC (1394 px de alto, poco scroll) y celular, y descargando las dos portadas.

### 2. Contenido publicado hoy

Se publicaron **8 noticias** (las primeras del diario): crónicas de las fechas 10 y 11, El Analista, Ranking de poder, Previa de la fecha 12, aviso del Tribunal, El Archivo y una de La Tribuna. Las 8 propuestas quedaron `aprobada` en `ia_propuestas`.

La historia: la liga pasó de **5,4 goles por partido** (hasta la F9) a **1,9** en las fechas 10 y 11, con seis 0-0. Victor 29 pts, Beto 26, Degox 23 con dos partidos menos; Victor y Degox son los únicos invictos.

### 3. Regla nueva de FRALEX

**Las noticias son semanales.** El paquete sale los lunes, o cualquier día en que FRALEX cargue datos nuevos (resultados, fichajes) o lo pida. Ya está metida en la tarea programada «Redacción IA Phoenix» (versión 3), que sigue corriendo todos los días a las 9:54 de Lima para vigilar y dejar el resumen.

### 4. Lo que falta (en orden)

1. **Reacciones, encuestas y comentarios** en las noticias. Necesita migración nueva (reservar el número en `REGISTRO.md` primero) con sus tablas y RLS, y el front.
2. **Página propia de cada noticia** (`/noticia/<slug>`) para compartir por WhatsApp con vista previa.
3. **El taller del staff**: plantillas de contenido por departamento al crear una noticia nueva, y «Sorpréndeme» para toda la portada.
4. Probar el afiche en un celular real y revisar el vertical 9:16 (queda bastante aire en el medio cuando la nota es corta).
5. Aviso pendiente en la bandeja: los borradores viejos de la fecha 8 nombran a «Roberto», que ya no está en la lista de clubes (ese club ahora es de Maurisgame).

### 5. Pregunta abierta para FRALEX

¿Los lunes la Redacción publica directo, o sigue dejando todo como borrador en la Bandeja IA para que él o un moderador aprueben? Hoy publicó porque él lo pidió en el chat.

### 6. Boceto aprobado

El diseño se aprobó en un lienzo de Claude (10 pantallas: portada, afiche y su descarga, zona de joda, los 24 departamentos, el taller del staff, el azar con reglas, otro día, las 3 formas de leer, las portadas que se dibujan solas e interactivo). Si hace falta volver a verlo, pídeselo a FRALEX: está en sus Artifacts como «Noticias Phoenix — boceto diario».

---

## Parte 7 · Revisión general del proyecto · 18 oct 2026 (cuenta ECONOMÍA, 2.ª cuenta)

> Origen: `docs/bitacoras/REVISION-GENERAL-18-OCT.md` · último cambio c5dccee 2026-10-19 · 8112 bytes. Copia íntegra.

Pedido de Fralex: «revisa todo mi repositorio y base de datos y todo, y optimiza totalmente todo… no pares hasta que haga una reorganización y optimización completa».
Esto es lo que se revisó, lo que se arregló y lo que se dejó a propósito (con el motivo). Las migraciones y los archivos mencionados están en este repositorio.

### 1. Base de datos (Supabase `fiibiyijojkxqlsrhcil`)

Se leyeron los avisos de seguridad y de rendimiento de Supabase (`get_advisors`).

**Arreglado (migración 129, aplicada y comprobada):**
- `sitio_guardar` y `sitio_mover` (panel del sitio) ya no las puede llamar quien no ha iniciado sesión; dentro ya exigían ser admin.
- Política `ia_chat_uso_propio`: `auth.uid()` ahora va como `(select auth.uid())` (se evalúa una vez por consulta, no por fila).
- `private.vestuario_validar_cambio`: `search_path` fijo (la función no lee tablas, sin riesgo).

**Dejado a propósito:**
| Aviso | Por qué no se toca |
|---|---|
| 329 funciones `SECURITY DEFINER` ejecutables por `authenticated` | Es el diseño: la web habla con la base por RPC y cada función comprueba sesión y rol dentro. Las de dinero ya se cerraron a mano (migraciones 111, 113, 119, 125, 127). |
| 36 funciones de lectura para `anon` | Rankings, perfil público, tienda, ticker, etc.: se ven sin iniciar sesión. Revisado nombre por nombre: ninguna escribe. |
| 64 tablas con RLS y sin política | Solo las usa el servidor o las funciones; sin política = nadie más entra (es lo seguro). |
| 97 claves foráneas sin índice, 50 índices sin uso | La tabla más grande tiene 482 filas. Crear índices ahora solo encarece las escrituras; se revisa cuando una tabla pase de unos miles de filas. |
| 8 tablas con varias políticas de lectura | Mejora mínima y riesgo de cambiar quién ve qué; se hará con pruebas cuando haga falta. |
| Esquema `backup_20261003` (4 tablas sin clave primaria) | Es una copia de seguridad del 3-oct. Se puede borrar cuando Fralex lo decida. |

**Solo lo puede hacer Fralex:** en Supabase → Authentication → Passwords, activar «Leaked password protection» (aviso `auth_leaked_password_protection`). Es un interruptor del panel, no de SQL.

### 2. Repositorio web (Astro + Tailwind + JS)

- 371 archivos JS, 72 páginas, 53 hojas de estilo. `npm audit` (producción): 0 vulnerabilidades. Pruebas: 624 pasan. `npm run build`: sin errores.
- **Archivos que parecían sin uso y NO se borran:** `core/competicion/centroPartido.js` (lo prueba `tests/centroPartido.test.mjs`), `features/carrusel.js` y `styles/mundos.css` (se cargan según `data/experimento.js`), `core/portada/inicio.js` y `features/conexion/prechequeo.js` (apagados por interruptor). Borrar sin saberlo habría roto pruebas o funciones apagadas.
- **Dependencias que parecen sin uso y se quedan:** `@phosphor-icons/web` (lo carga `global.css` para los iconos finos) y `react-dom` (lo exige `@astrojs/react`).
- **Peso:** hoja de estilos principal 760 KB (137 KB comprimida) y supabase 212 KB (53 KB). Es aceptable y se guarda en caché; reducirla pide una auditoría visual página por página (la hace la sesión «Pasada visual premium»), no un borrado a ciegas.
- Sin `console.log` olvidados. 39 marcas TODO/FIXME (pendientes anotados, ninguno bloquea).

### 3. Orden de ramas y carpetas de trabajo

- Ya fusionadas en `borrador` (se pueden retirar sus carpetas de trabajo sin perder nada): `econ-fase-b`, `econ-fase-c`, `econ-fase-d`, `econ-fase-e`, `ws-amistosos-web`, `ws-stats-web`, `liga-automatica`.
- Con trabajo sin fusionar (NO retirar): `rediseno`, `ws-actualizar-web`, `ws-lm-web`.
- Hay 10 carpetas de trabajo de Git abiertas (`git worktree list`).

### 4. Por qué no se movieron ni renombraron archivos

Hay varias sesiones editando el mismo repositorio a la vez (visual, Link, Sync, economía). Mover o renombrar archivos en masa rompe sus cambios sin subir y las rutas que usan los documentos (`MAPA.md`, `REGISTRO.md`). Una reorganización de carpetas pide un momento sin sesiones abiertas, un plan por fases y la prueba de que todo compila después de cada fase.

### 5. Siguientes pasos propuestos (en este orden)

1. ✅ HECHO (18-oct): retiradas las carpetas de trabajo de econ-fase-b/c/d/e, ws-amistosos-web y ws-stats-web (sin cambios pendientes). Las ramas se conservan; se recrean con `git worktree add <ruta> <rama>`.
2. Auditoría de CSS por página (la «Pasada visual premium» ya mira las 4-5 más usadas).
3. Revisar índices y políticas duplicadas cuando alguna tabla supere unos miles de filas.
4. Reorganización de carpetas por fases (con las sesiones paradas).

### 6. Segunda tanda (18-oct, noche) — lo que se terminó

- **Código:** `src/js/core/` reorganizado en 7 carpetas por tema (detalle y cómo adaptar una rama vieja: `docs/trabajo-en-equipo/REORGANIZACION-CODIGO-18-OCT.md`). 624 pruebas, build y las 57 páginas cargando sus 437 módulos sin errores.
- **Base de datos:** migración 130 (políticas RLS sin duplicar en 6 tablas, misma seguridad). Ya no quedan avisos de seguridad o rendimiento «WARN» propios del diseño de tablas; solo los informativos de índices.
- **CSS:** medido. De 588 KB de CSS propio, solo ~12 KB son reglas cuyas clases no aparecen en ningún archivo (la mayoría de uPlot, que las crea la librería). No vale la pena borrar a ciegas; lo que más pesaría menos sería cargar el CSS por página en vez de todo en `global.css`, y eso se hará junto a la pasada visual (hay estilos compartidos entre páginas, como el campo de fútbol).
- **Carpetas de trabajo:** web solo con `borrador` y `pes-rediseno` (propuesta de portada del 9-oct, sin fusionar a propósito). Link y Sync solo con sus dos carpetas principales; retiradas ws-actualizar-link, ws-amistosos-link, ws-lm-link, ws-lm-sync, ws-stats-link y ws-stats-sync (todo su contenido ya estaba en rediseño-phoenix-portal / mercado-fase0; ramas conservadas).
- **Sin tocar a propósito:** las carpetas principales de Link (`_phoenix-link`, 4 archivos sin subir) y Sync (`smash-soda-fork`, 13 archivos sin subir) tienen trabajo en curso de otras sesiones.

### 7. Velocidad de carga (18/19-oct, noche)

Medido con Lighthouse móvil (Edge, sin caché) sobre la web publicada en `borrador`.

| Página | Nota antes | Nota después | Qué pesaba |
|---|---|---|---|
| Cambios oficiales | 39 | 67 | JS de arranque |
| Tienda | 20 | 66 | JS de arranque |
| Noticias | 11 | 60 | JS de arranque + chat flotante + salto al mostrarse (CLS 0,14 → 0,04) |
| Inicio | 35 (llegó a 20) | 49–62 | salto (CLS 0,36 → 0), :has() en html/body, foto de 207 KB, CSS común 713 → 562 KB, título visible desde el inicio |

Segunda tanda (19-oct): CSS partido por página (14 archivos fuera de global.css, comparado elemento por elemento en 20 páginas: 0 diferencias),
Noticias sin saltos, listas de jugadores sin la columna `foto` (migración 131), y `tools/humo/abrir-paginas.mjs` (abre las 57 páginas en cada subida).

Arreglos (commits 2c58153, 0e78171, 007fe2b):
- `src/js/boot.js`: lo que no hace falta para VER la página (cinta, en vivo, buscador, efectos, chat flotante…) arranca en `requestIdleCallback`; cada pieza va envuelta para que un error no tumbe las demás.
- Chat flotante, cinta y `hoyLima`: menos trabajo por repintado.
- `main { min-height: 100vh }`: el pie ya no salta.
- Fuentes de iconos recortadas (`tools/iconos/recortar-iconos.mjs`): ~220 KB menos por visita. **Si añades un icono nuevo, vuelve a ejecutar el script y sube lo que genera.** Iconos que vienen de la base de datos → `tools/iconos/extra.txt`.
- Luces de la portada (`escenario.css`) ancladas a la pantalla, no a la altura de la portada.

Siguiente, si se quiere más: el script de `Layout.astro` sigue siendo lo más pesado (~0,5 s de CPU en móvil lento); dividirlo por página es el próximo paso grande.

- Reglas `html:has(…)` / `body:has(…)` eliminadas (commit 0ccfbc0): hacían recalcular toda la página con cualquier cambio. La prueba `tests/cssRendimiento.test.mjs` impide volver a escribirlas.

---

## Parte 8 · Bitácora e informe · Cuenta ECONOMÍA (chat «D:\Frank\IA\CLAUDE») · 19 de octubre de 2026

> Origen: `docs/bitacoras/BITACORA-19-OCT-2026-CUENTA-ECONOMIA.md` · último cambio abc31fa 2026-10-19 · 41848 bytes. Copia íntegra.

Para la **otra cuenta** (o cualquier IA o persona) que continúe. Escrito para entender **todo lo que se hizo el 19-oct** sin haber visto el chat.
Complementa `REGISTRO.md` (una línea por cambio, la más nueva al final) y la guía de uso `docs/guias/GUIA-NOVEDADES-19-OCT-2026.md`.
Bitácoras anteriores: `docs/bitacoras/BITACORA-16-OCT-2026-CUENTA-ECONOMIA.md`, `REVISION-GENERAL-18-OCT.md`.

> **Norma de Fralex:** todo se anota en GitHub. **Drive sigue pendiente** (no hay acceso): cuando vuelva, copiar esta bitácora y la guía a la carpeta de Drive «Phoenix Link — Guías y logros» (ver §9).

---

### 0. Cómo retomar en 5 minutos

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

### 1. Quién es Fralex y cómo trabajar con él (recordatorio)

- **Todo en español**, frases simples, poco texto técnico; **SÍ/NO primero**. Lo pidió tres veces el 19-oct.
- Quiere todo **«dinámico, estético, visual, muy animado, interactivo, fresco, novedoso, premium y profesional»**, pero también **limpio, ordenado, minimalista y entendible** («no entiendo qué es cada cosa» = falla de diseño).
- **No pedirle pruebas dentro del juego** (pausa desde el 15-oct). Probar con el navegador automático y datos simulados.
- **Lo que la IA no pueda ejecutar → SQL listo para pegar** en el SQL Editor de Supabase.
- **Nunca** cambiar ajustes de seguridad por él; borrar cosas irreversibles solo con su permiso.
- **Phoenix Link:** mejorar dentro de su diseño, subir `kVersion` en cada cambio, compilar sin `--force`. Hoy **no se tocó Link** (todo fue web + base de datos).
- Cada cambio: **verificar en celular (390 px) y PC (1440 px)**, anotar en `REGISTRO.md`, commit con rutas explícitas y push a `borrador`.

---

### 2. Resumen del día (orden cronológico)

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
| 18:31 | (ver REGISTRO) | **Beta 1.13.0**: visor de fotos con estilo Instagram y estilo Facebook |

(Los textos completos de cada cambio, con archivos y pruebas, están en `REGISTRO.md`, líneas del 2026-10-19 «Cuenta ECONOMÍA».)

---

### 3. Reglas NUEVAS para todas las sesiones (importante)

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

### 4. Modo demostración (sistema nuevo)

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

### 5. Detalle por área

#### 5.1 Rendimiento (madrugada)
- Lighthouse móvil antes: inicio 35, tienda 20, noticias 11; TBT hasta 5,9 s; CLS hasta 0,53.
- `boot.js`: lo que no hace falta para ver la página arranca y **se descarga después** (`requestIdleCallback` + `import()`): JS común 88 → 46 KB.
- Fuentes de iconos recortadas (`tools/iconos/recortar-iconos.mjs`): ~220 KB menos por visita.
- Fuera los `:has()` sobre html/body: recálculo de estilos al cargar Inicio 13 s → 4,4 s (móvil lento simulado).
- 14 CSS de página fuera de `global.css` (713 → 562 KB), comprobado con 0 diferencias de estilo calculado en 20 páginas.
- Consulta de los 3 mejores jugadores 207 KB → <1 KB (`core/jugadores/columnas.js`, sin la columna `foto`).
- **Migración 131**: la foto vieja guardada como texto (269 KB) → `private.jugadores_foto_respaldo`. **Migración 132**: borrada la copia `backup_20261003` (solo 5 fichas de prueba).
- Nueva prueba `npm run test:paginas` (`tools/humo/abrir-paginas.mjs`): abre las 57 páginas y falla si hay error de JS, archivo que no carga o página en blanco. Va en `.github/workflows/pruebas.yml`.

#### 5.2 Sala de fichajes y Centro de control
- Sala de fichajes: campos manuales plegados, logos de liga actuales (`public/ligas/*.png`), DT en grande, grandes de cada liga primero (`ordenarPorPrestigio`).
- Sala también en el Modo Mánager (`features/mercado/salaMercado.js`) **con límites** (solo lectura + los mismos botones de ofertar).
- **/control/** (staff): tarjetas de pendientes por área con semáforo de plazos 24/48/72 h, «Hoy toca», herramientas por rol. `core/sistema/centroControl.js` + pruebas. **Pendiente: probar con sesión de staff real.**

#### 5.3 Reestructuración por importancia
- Menú: **Mi club primero** (dorado), Comunidad, Jugar, Competiciones, Jugadores. «Central» → «Inicio»; «Mercado» → «Conectar juego». Barra inferior del celular: Inicio · Social · **MI CLUB** (centro) · Jugar · Yo.
- **Mi club = «El Estadio»** (`/manager/`): luces de estadio, la página se tiñe con el color del escudo (`features/miClub/estadio.js`), barra propia Resumen · Plantilla · Fichajes · Mi partida de PES · Diario (+ Administrar la liga para staff) · «?». Guía «Cómo funciona Mi club» en 3 pasos. Vista **Cancha**. «Explorar el mercado» de 12 en 12. «Vestuario del juego» → **«Mi partida de PES»** con dibujo Tu PES ⇄ Phoenix Sync ⇄ esta pantalla.
- Inicio: banda **«Tu club»** (con club / sin club / visitante) y las 4 ventanas por importancia.
- **Red de enlaces** (menú lateral del celular): grupos que se abren uno a la vez; en celular no repite lo de la barra inferior (`BARRA_INFERIOR` en `data/site.js`).

#### 5.4 Configuración (`/ajustes/`)
- Forma de «Configuración y privacidad» de Meta: buscador sin tildes, tarjeta de cuenta, grupos de filas; en celular la sección entra desde la derecha.
- 30 ajustes en 3 grupos (`data/ajustes.js`), estilos rápidos (Phoenix, Torneo, Minimalista, Nocturno, Lectura cómoda), contador de cambios, restablecer por sección, «Guardado».
- Sin parpadeo: el script temprano de Layout escribe todos los `data-aj-*` antes de pintar.
- Nuevo ajuste **«Modo demostración»** (§4).

#### 5.5 Social (`/social/`)
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

#### 5.5b Social, fase 2 (1.6.0) — migraciones 135 y 135b
- **Base de datos (135, aditiva)**: `muro_publicaciones.compartida_de`; tablas `muro_respuesta_likes` y `muro_vistas` (RLS sin políticas: solo por funciones); funciones `muro_compartir` (mismas reglas que publicar: ≤1000 letras, 10 por hora; compartir algo compartido apunta a la ORIGINAL; avisa al autor con el aviso nuevo `MURO_COMPARTIDA`, que amplía la lista de tipos permitidos), `muro_like_respuesta` / `muro_likes_respuestas`, `muro_registrar_vistas` (1 por persona; las propias no cuentan; sin sesión no cuenta), `muro_social_de` (vistas, veces compartida y la original solo si quien mira puede ver el muro de su autor; si no → `no_disponible`), `muro_reacciones_de` (sin bloqueados), `mi_racha_social` (días seguidos con publicación/respuesta/reacción, hora de Lima).
- **135b**: al probar en la base apareció que compartir SIN comentario chocaba con la regla `muro_publicaciones_contenido_ok` y que borrar la original iba a fallar (la compartida quedaba vacía y sin referencia). Arreglo: columna fija `es_compartida` y la regla acepta «contenido O es compartida».
- **Prueba en la base** (dos usuarios simulados, todo deshecho al final): cadena → original, «me gusta» on/off, vistas 1 por persona, reacciones, racha 1 día, 2 avisos, sin sesión ve lo público, borrar la original deja «no disponible».
- **Web** (`features/social/fase2.js` nuevo, `features/muro/api.js`, `features/muro/pieSocial.js`, `pages/social.js`, `socialHilo.css`): ventana **Compartir** (en tu muro con comentario, o fuera); la **original dentro** de la compartida; pie con **veces compartida** (↻) y **vistas** (👁); el total de reacciones abre **quién reaccionó** por pestañas de emoji; **«me gusta» en respuestas** (❤️); **tarjeta rápida** al tocar cara o nombre (bandera, club con escudo, lema, duelos, Seguir, Retar, Ver perfil); **vistas** que se cuentan al verse 1 s; **racha 🔥 N** en la barra (dice «¡hoy!» si aún no hiciste nada hoy).
- **Modo demo**: todo lo anterior simulado (compartir queda solo en la pestaña).
- Arreglos tras probar: en celular la fila de acciones y la barra se compactan (antes 432 px en 390); iconos nuevos en `iconosFinos.js` (retweet, eye, eye-slash, arrow-up-from-bracket, spinner).

#### 5.6 Chat
- Columna de contactos (PC) y hoja «Chats» (celular): pestañas **Amigos | General** (`features/chatFlotante/general.js`): el chat general en pequeño, pide mensajes cada 6 s solo mientras se ve.

#### 5.7 Phoenix Link en la web (sin tocar Link)
- **Tarjetas de sala vivas** (`features/salas/tarjetas.js`, `styles/salasVivo.css`): estado con latido, anfitrión VS rival, mandos, señal en 4 barras, entrada en cascada.
- **«Entrando a la sala»** (`features/salas/entrar.js`): Reservando tu puesto → Abriendo Parsec → ¡Dentro!; plan B si Parsec no abre.
- **Migración 134**: `salas.en_partida_desde` + disparador; `private.tarjeta_sala` suma rival.avatar_url, en_partida_desde, marcador (`liga_vivo` ≤ 5 min) y conectados (`muestras_calidad` ≤ 2 min). La tarjeta muestra marcador y minuto, cronómetro, caras de conectados y ¡GOL!.
- **Android (1.3.1)**: ver §6.

#### 5.8 Perfil
- «Mi perfil» vivo (`features/perfilVivo.js`): tarjeta «Así te ven» en vivo, medidor «Perfil al N %», club con sugerencias y escudo, «Guardar N cambios».
- País en **lista desplegable con banderas SVG** (`data/banderas.js`, 23 países).
- **Perfil público** (`js/pages/perfil.js`, `styles/perfilPublico.css`): luces de estadio, bandera y escudo, cifras que cuentan, «Duelos» con anillo y barra G/E/P, pestañas deslizantes.

#### 5.9 Duelos — «Lanzar reto» por pasos (1.2.0)
- `features/duelos/asistente.js` + `styles/retoAsistente.css`: el formulario de siempre (`form.js` sin cambios) se mueve a una ventana con 4 pasos **Rival · Equipos · Hora · Sala** y un **boleto** final con «Emitir reto».
- Rival en tarjetas con cara, «en línea» y «tiene host»; no deja avanzar sin rival o con hora inválida.
- Todo «Lanzar reto», el radar y `?retar=` abren la ventana.

#### 5.10 Inicio — «Ahora en Phoenix» (1.3.0)
- `features/portada/ahora.js` + `styles/ahoraPortada.css`: salas en juego (con sesión), historias de hoy y lo más reaccionado; se oculta si no hay nada (hoy con datos reales está oculta; con `?demo=1` llena).

#### 5.11 Liga — tablas visuales (1.4.0)
- `pages/liga.astro` + `styles/ligaTabla.css`: ▲▼ puestos ganados o perdidos desde la fecha anterior, corona del líder, «Últimos 5» como fichas (la más reciente destacada), zonas con brillo, en celular la tabla entra sin deslizar. `tablaViva.js` ya no borra ▲▼ al reordenar.

#### 5.12 Jugadas — feed vertical de videos (1.7.0) — migración 136
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

#### 5.13 La demostración se ve sola en la beta (1.7.0)
Pedido de Fralex: «necesito que en la página misma se me muestre la simulación de todas las actividades, para ver cómo se vería».
- `core/sistema/modoDemo.js`: en la **vista previa** (`PUBLIC_PREVIEW`) la demostración viene **encendida la primera vez** que alguien abre la beta (marca `pes-demo-beta-v1` en el navegador). Si la apagas («Salir» o Configuración) queda apagada. `?demo=1` / `?demo=0` siguen funcionando. **La web oficial no cambia.**

#### 5.14 Rendimiento: «siento la web más pesada» (1.8.0)
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

#### 5.15 Jugadas como los Reels (1.8.0)
Pedido: «no pongas ahí las jugadas, quería algo como en Instagram, que dándole click en el botón o jalando hacia un lado cargue la parte de reels».
- Fuera el círculo de Jugadas de las historias y el enlace de «Tu espacio».
- **Botón «Jugadas»** (naranja, con claqueta) en la barra pegada del muro de Social; en celular solo el icono.
- **Deslizar con el dedo**: hacia la izquierda en Social abre Jugadas; hacia la derecha en Jugadas vuelve a Social. Mientras arrastras asoma una pastilla con el destino (se pone naranja cuando ya basta); un tirón rápido también vale. No se activa sobre cosas que se deslizan en horizontal (historias, pestañas, carruseles), campos de texto ni diálogos, ni en los bordes de la pantalla (gestos del sistema).
- **Transición**: la página sale hacia el lado del gesto y la nueva entra por el otro (`styles/deslizar.css`; `pagereveal` + tipos de transición de vista). Jugadas se precarga al abrir Social.
- Código: `features/social/gestos.js` → `montarDeslizarA(zona, { lado, url, etiqueta, icono })` y `marcarDesliza(lado)`.

#### 5.16 Eliminar publicaciones y comentarios (1.8.0)
Pedido: «verifica la opción de eliminar post o comentarios».
- **Lo que se encontró**: la base SÍ lo permitía (`muro_borrar`: el autor o el admin; `muro_borrar_respuesta`: el autor de la respuesta, el dueño de la publicación o el admin; `muro_respuestas_de` ya devolvía `puedo_borrar`), y en **tu perfil** ya se podía. Pero en **Social** no había ningún botón para hacerlo.
- **Ahora**: «Eliminar» (rojo, con papelera) en el menú ⋯ de tus publicaciones (el admin lo ve en todas) y «Eliminar» bajo cada respuesta que puedes borrar. Siempre pregunta antes. En **Jugadas**, «Eliminar» en el riel de tus propios videos (`clip_borrar`, que ya existía).

#### 5.17 Social más aireado (1.8.1)
- Pedido: «cada publicación un poquito más separada» y «esa barra abarca demasiado espacio, ponla más al lado izquierdo».
- `styles/socialHilo.css`: 14 px entre publicaciones (antes 1 px), línea divisoria a la mitad, más relleno; en vista Compacta 6 px. Columna izquierda de 15rem a 12,5rem con botones más compactos; en PC grande queda pegada al borde izquierdo y el muro se centra en su espacio.
- Visto de paso, sin tocar: con sesión iniciada, a 1024 px la cabecera se desborda ~136 px a la derecha (nombre + menú). Pendiente.

#### 5.18 Logos en Social (1.8.2)
- Tarjeta «Phoenix Social»: el logo de la página (`public/logo.webp`) en vez de la llama.
- Juegos: `data/muroEstilo.js` → `LOGOS_JUEGO` (archivo por juego en `public/juegos/`); si un archivo falta o no carga, se ve la letra de siempre. Hoy solo **Football Life** (`sp-football-life.png`, la placa «FL26» recortada de la imagen que dio Fralex).
- **Hecho en 1.9.1** (Fralex: «sí, descárgalos, pero los más recientes»): de Wikimedia Commons (dominio público), recortados a 64 px: PES 2021 Season Update (`pes2021.png`), FIFA 23 —el último FIFA— (`fifa23.png`), FC 26 (`ea-sports-fc-26.png`) y eFootball 2026 (`efootball-2026.png`). Para cambiar uno: reemplazar el archivo en `public/juegos/` o la ruta en `LOGOS_JUEGO`.

#### 5.19 Social con personalidad + recargar (1.9.0)
- Pedido: «un poco más de personalidad» y «un botón de recargar sutil… y también para subir hasta arriba rápidamente».
- **Saludo** arriba del muro según la hora, con tu nombre (naranja), una frase Phoenix del día (rotan 7) y el pulso «N publicaciones hoy · M jugadores activos».
- **Acentos de fuego** (naranja→rosa, como Jugadas y la racha) en la pestaña activa y en lo elegido de la columna izquierda.
- **Final del feed**: logo de Phoenix, «Estás al día 🔥», botones Publicar algo y Recargar.
- **Recargar**: ↻ discreto en la barra pegada; el botón flotante (aparece al bajar 500 px) sube y recarga; el del final también. El icono gira mientras carga y se pone verde al terminar.

#### 5.20 Auditoría completa de Social (1.10.0)
Pedido: «verifica función por función y apartado por apartado y corrige todo, con redundancias y todo». Se hizo en dos frentes: un agente leyó el código (social.astro, social.js, socialHilo.css, tarjeta, pie, fase 2, gestos) y yo recorrí cada control en el navegador (390 y 1440, demo y real).
- **Errores corregidos (12)**: filtros que se cerraban solos; una carga vieja apagaba la nueva; la #etiqueta bloqueaba pestañas y juegos; aviso de nuevas con etiqueta; punto de filtros; paleta que quedaba abierta; recargar sin limpiar hilos; atajos con ventanas abiertas; tecla N; acción del feed vacío según vista/sesión; plurales; accesibilidad (aria-busy, botones en vez de href="#", aria-current único).
- **Demostración**: publicaciones de varios juegos (el filtro ya hace algo), quitar reacción, responder/borrar respuesta, seguir a inventados sin error, sin «Retar» a inventados.
- **Redundancias quitadas**: cifras y botón «Crear publicación» de la tarjeta Phoenix Social, «Juegos con más movimiento», «Más reacciones» en Ordenar, «Recargar» del final; una sola función de recarga para ↻, flotante, aviso de nuevas y tirar hacia abajo; «Tu espacio» reducido (Mi muro, Guardados, Buscar jugadores) y solo con sesión.
- **Unificado**: color de «elegido» = fuego (`--sxr-on`), azul solo para enlaces/foco; textos («Todos los juegos», «Crear publicación»); alturas de la barra (2,5rem PC, 2,25rem celular); radios 99px; columnas pegadas a la misma altura; en celular la racha va en el saludo.
- **CSS**: reglas duplicadas o pisadas fusionadas y muertas borradas; copia de antes en el scratchpad de la sesión.

#### 5.21 Social menos saturado (1.10.1)
Pedido: «la estoy sintiendo saturada… solo mejora un poco eso». Ninguna función fuera; menos cosas compitiendo: saludo en dos líneas (pulso y racha como texto), racha fuera de la barra, «Jugadas» discreto, íconos del compositor en gris, logos atenuados, sin fila de Tendencias en celular, tarjeta Phoenix sin párrafo, 3 en «Lo más reaccionado», atajos en una línea al pie.

#### 5.22 Social como estaba, sin saludo ni días (1.10.2)
Fralex prefirió el aspecto de la 1.10.0: se deshizo la 1.10.1 y se quitaron el saludo con el nombre y los días de racha. Queda arriba la frase del día y el pulso de la comunidad.

#### 5.23 Mi club: la cancha de la plantilla (1.10.3)
Las marcas del campo (línea del medio, círculo central, áreas) iban fijas y tapaban jugadores y títulos. Ahora la línea del medio separa Mediocampo y Defensas con un punto central, y las áreas son bajitas. El foco de la ficha es un aro dorado en la cara (antes un recuadro cuadrado). Archivo: `styles/miClubEstadio.css`.

#### 5.24 Stickers en los comentarios (1.11.0) — migración 137
Pedido: «haz todos los comentarios que tengan stickers, e incluso pueda subir stickers de WhatsApp y TikTok».
- **Base (137_stickers.sql, aplicada y probada)**: bucket «stickers» (1 MB; .webp de WhatsApp —también animados—, GIF/PNG de TikTok); columna `muro_respuestas.sticker`; responder solo con sticker; «Mis stickers» (máx. 60, se pueden guardar los de otros).
- **Pack Phoenix** (`data/stickers.js`): 12 stickers dibujados en la web (¡GOLAZO!, ¡QUÉ ATAJADA!, GG, ¿REVANCHA?, CRACK, ¡VAR!, ¡ROBADO!, ¡ERA PENAL!, ¡LAG!, EN LLAMAS, TE FALTA CALLE, JAJAJA). Añadir uno = una línea en ese archivo.
- **Cómo se usa**: en la caja «Escribe una respuesta…» (Social y perfiles) está el botón de stickers → pestañas Phoenix / Mis stickers → tocar uno lo envía al instante. «Subir sticker» acepta el archivo del sticker (en WhatsApp Web: clic derecho sobre el sticker → Guardar imagen; en el celular, compartirlo o guardarlo como archivo) o pegarlo con Ctrl+V. Sobre un sticker ajeno aparece ＋ para guardarlo.
- Los animados se suben tal cual (sin re-codificar) para que sigan animados.

#### 5.25 Interruptor Demo/Real y stickers desde otras apps (1.12.0) — migración 138
- **Demo/Real**: en la beta la píldora de abajo a la izquierda está siempre: «Modo demostración · Ver datos reales» o «Datos reales · Ver demo». La elección se recuerda en el navegador. En la web oficial solo aparece si la demo está encendida.
- **Stickers desde las apps de stickers (Android)**: con Phoenix instalada como app, sale en «Compartir» de Sticker.ly, Sticker Maker, etc. (`share_target` del manifiesto + `sw.js`) y lo compartido llega a **/stickers-recibir/**, que lo guarda en «Mis stickers».
- **Paquetes .wastickers/.zip**: se abren en el navegador (`core/sistema/zip.js`, sin librerías) y se suben todos sus stickers.
- **Telegram**: .webp (estáticos) y .webm (video; migración 138). Los .tgs (animados Lottie) todavía no.
- **Límites**: iPhone no deja a las webs recibir lo compartido (allí: guardar en Archivos y subir). Máx. 1 MB por sticker, 100 archivos y 60 en «Mis stickers».

#### 5.26 Visor de fotos: estilo Instagram y estilo Facebook (1.13.0)
Al tocar una foto en Social se abre el visor; arriba hay un botón **Instagram | Facebook** que cambia el estilo y se recuerda.
- **Instagram**: foto a pantalla completa en negro, autor arriba, puntitos, 🔥 y 💬 abajo con el texto; doble toque = 🔥; deslizar de lado = otra foto; deslizar hacia abajo o tocar el fondo = cerrar.
- **Facebook**: foto a la izquierda con flechas y contador; a la derecha (abajo en celular) autor, texto, reacciones, respuestas y caja para responder sin salir.
- Archivo: `js/features/social/visorFotos.js` (estilos `.gxv` en socialHilo.css).

---

### 6. Parsec en Android (pregunta de Fralex)

- **Sí se puede unir desde Android**: la app oficial de Parsec para Android se conecta como invitado (no puede hostear).
- **Phoenix Link lo detecta igual que a cualquier invitado**: los invitados llegan por el SDK de Parsec sin importar el aparato; salen en «conectados» con su ping y el anfitrión le da el mando.
- **Condición**: un **mando** (Bluetooth o USB). Parsec llama «experimental» a su app de Android y dice que funciona mejor con mando; no documenta controles táctiles en pantalla.
- **Sin confirmar**: si la app de Android abre directamente el enlace `parsec://` de la web. Por eso, en Android, «Entrando a la sala» (1.3.1): avisa del mando, pone primero la **invitación web** y «Descargar» lleva a Google Play (`tv.parsec.client`).
- Fuentes: <https://support.parsec.app/hc/en-us/articles/32381582866452-Install-Parsec-App-on-Android> · <https://parsec.app/blog/link-sharing-for-gaming-over-the-internet-with-friends-e97769822373>
- **Prueba definitiva**: con un celular Android real (cuando Fralex quiera; no es urgente ni se le pide).

---

### 7. Cómo se probó (para repetirlo)

- Scripts de puppeteer en el scratchpad de la sesión (`C:\Temp\claude\D--Frank-IA-CLAUDE\7b44792d-…\scratchpad\perfil\`), con Edge sin ventana:
  - el encabezado de `miClubInteractivo.mjs` (primeras 46 líneas) sirve la carpeta `dist/`, **simula una sesión** (usuario de prueba con rol admin), rehace las lecturas a Supabase con la clave pública y **bloquea toda escritura**;
  - uso: `node script.mjs C:/dev/pes-liga-automatica/dist 390 844 carpeta/prefijo` (celular) y `… 1440 900 …` (PC);
  - con `?demo=1` se prueba con actividad simulada; con `p.emulateMediaFeatures([{name:'prefers-reduced-motion', value:'no-preference'}])` se ven las animaciones (el navegador de pruebas trae «menos movimiento»).
- Cada cambio se miró en capturas de celular y PC, se midió el ancho (sin desborde horizontal) y se revisaron errores de consola.

---

### 8. Pendientes y decisiones abiertas

1. ~~Social fase 2~~ **hecha (1.6.0)**. Ideas para una fase 3: avisos de «me gusta» en respuestas, encuestas y duelos dentro de compartidas, «Para ti» (orden por interés), menciones con autocompletar en respuestas.
2. **Modo demo**: simular tablas de liga, Tienda y mensajes privados.
3. **Quitar controles «arcaicos»** del resto del sitio (listas largas, barras de desplazamiento, selectores viejos) — ya hecho en Mi club y Social.
4. **Velocidad en celular**: volver a medir con Lighthouse tras las animaciones nuevas.
5. **Centro de control**: probar con sesión de staff real.
6. **Seguridad (lo hace Fralex)**: activar «Leaked password protection» en Supabase.
7. Frase de una ficha de usuario que sale en la portada (dato del usuario; no se tocó).
8. Fralex mejorará Inicio más adelante («me encanta mucho como está… lo mejoraré a futuro»).

---

### 9. Para copiar a Drive cuando vuelva el acceso

- Esta bitácora (`docs/bitacoras/BITACORA-19-OCT-2026-CUENTA-ECONOMIA.md`).
- La guía de uso (`docs/guias/GUIA-NOVEDADES-19-OCT-2026.md`).
- Carpeta de destino: «Phoenix Link — Guías y logros».

---

## Parte 9 · Bitácora e informe · Hilo «Decisiones pendientes de la web» · 21 de octubre de 2026

> Origen: `docs/bitacoras/BITACORA-21-OCT-2026-HILO-DECISIONES-WEB.md` · último cambio a467545 2026-10-21 · 10547 bytes. Copia íntegra.

Para cualquier persona o IA que continúe. Explica **todo lo que se hizo el 21-oct en la web** sin haber visto el chat.
Complementa `REGISTRO.md` (una línea por cambio, la más nueva al final), `MAPA.md` (rondas 362 y 363) y la guía de uso `docs/guias/GUIA-NOVEDADES-21-OCT-2026.md`.
Bitácora anterior: `docs/bitacoras/BITACORA-19-OCT-2026-CUENTA-ECONOMIA.md`.

> **Norma de Fralex (20 y 21-oct):** todo se anota en GitHub **y** en Drive (carpeta «Phoenix Link — Guías y logros», Google Docs numerados «NN · Título (fecha)»). Resolver todo sin preguntar salvo lo importante.

---

### 0. Cómo retomar en 5 minutos

1. Repo de la web: `Fralexito/phoenixevolution`, rama **`borrador`** (se publica sola en la vista previa **https://fralexito.github.io/phoenixevolution/fase-beta-1-0/**). En la PC: `C:\dev\pes-liga-automatica`.
2. Versión al cierre: **beta 1.15.1** (`src/data/versionWeb.js`). En cada subida se sube `VERSION_BETA`.
3. Comprobaciones antes de cada subida (todas deben pasar):
   ```bash
   npm test               # 648 pruebas, 0 fallos (al cierre del 21-oct)
   npm run build          # 60 páginas
   npm run test:paginas   # abre las 60 páginas en Chrome: 60/60
   ```
   En la nube de Claude: `CHROME_PATH=/opt/pw-browsers/chromium npm run test:paginas`.
4. **Migraciones de hoy:** **139** (patrocinadores), aplicada y probada. La siguiente libre es la **140** (mira antes el final de `REGISTRO.md`).
5. Nada se subió a `main` (web oficial): hace falta que Fralex diga «Súbelo» o «Publícalo».

---

### 1. Qué decidió Fralex

El 21-oct se le presentaron 10 preguntas pendientes de tres hilos (pase = hilo 13, pasada visual = hilo 14, caras = hilo 8). Respondió «SÍ a todo» (lo recomendado) y luego, para el pase, eligió «Las dos cosas».

| # | Pregunta | Respuesta |
|---|---|---|
| 1 | ¿El pase cuesta 150 gemas (≈ S/ 13,60)? | SÍ |
| 2 | ¿Temporada de 60 días y 30 niveles? | SÍ |
| 3 | ¿Torneo premium a 300 gemas? | SÍ |
| 4 | ¿Propinas solo con ascuas? | SÍ |
| 5 | ¿Lista de patrocinadores? | Primero «no por ahora», luego **SÍ** (hecha) |
| 6 | ¿Overlay de TikTok de pago? | Primero «no por ahora», luego **SÍ** (hecho como overlay del torneo premium) |
| 7 | ¿7 días de gracia para reclamar premios? | SÍ |
| 8 | ¿Siguiente página de la pasada visual? | **Jugadores** (hecha) |
| 9 | ¿Quitar las etiquetas pequeñas sobre los títulos? | NO (son parte de la identidad Galaxy) |
| 10 | ¿Qué hacer con los 60 jugadores sin cara? | Subir solo los recortes buenos (subidos 8) |

Las preguntas 1–4 y 7 ya eran lo que hacía la migración 123: no cambió código. Quedó anotado en `docs/economia/DISENO-PASS-Y-ORGANIZADORES.md` §6.

---

### 2. Resumen del día

| Ronda | Commit | Versión | Qué |
|---|---|---|---|
| 362 | `fe13a15` | 1.14.0 | Jugadores con panel lateral (posición y equipo) y vista «Lista» |
| 363 | `5a12066` | 1.15.0 | Patrocinadores, overlay de transmisión para torneos premium, 8 caras nuevas |
| 363 | `4632a43` | 1.15.0 | Registro de la migración 139 (aplicación parcial) |
| 363b | `b770e13` | 1.15.1 | 139 completa; «Quitar» patrocinador = archivar; prueba de páginas sin falsos fallos; esta bitácora y la guía |

---

### 3. Detalle por área

#### 3.1 Jugadores con panel lateral (ronda 362, bandera `FX.jugadoresRiel`)
- **Qué se ve:** en PC (≥ 1024 px) una columna fija a la izquierda con «Posición» (Todas, Porteros, Defensas, Medios, Delanteros, cada una con su punto de color: portero dorado, defensa azul, medio verde, delantero rojo, de `data/posiciones.js`) y «Equipo», cada opción con cuántos jugadores tiene. En celular solo las posiciones, como fichas que se deslizan de lado. Vista nueva **«Lista»**: una fila por jugador (número, posición con color, nombre y apodo, club, media y balanza para comparar; tocar la fila abre el perfil).
- **Cómo funciona:** `features/jugadoresRiel.js` arma el panel y mueve `#carrusel-zona` y `#players-container` a una rejilla de dos columnas. No filtra por su cuenta: avisa a `pages/database.js` (`alGrupo`, `alClub`); el equipo usa el mismo desplegable de la barra (`#player-filter-select`), que en PC se oculta pero sigue mandando. Las cuentas salen de `core/jugadores/riel.js` (`contarPorGrupo`, `contarPorClub`, `filtrarGrupo`) con `tests/riel.test.mjs`.
- **Estilos:** `styles/jugadoresRiel.css` (importado en `global.css`). Movimiento 160–280 ms con `cubic-bezier(.22,1,.36,1)`, hover solo con mouse, filas que entran escalonadas solo con animaciones activas.
- **Apagar:** `FX.jugadoresRiel = false` en `src/data/experimento.js`.

#### 3.2 Patrocinadores (ronda 363, migración 139)
- **Idea:** un patrocinador paga a Fralex **fuera** de la tienda (Yape, transferencia). La web solo muestra su logo con «Patrocinado por» en un torneo o un clan. No pasa por gemas.
- **Base de datos** (`supabase/migrations/139_patrocinios.sql`): tabla `patrocinios` (tipo torneo/clan, número del torneo o clan, nombre, logo https, web https, desde, hasta, activo, nota privada, archivado). RLS: el público solo lee los vigentes (activo y dentro de las fechas) y **sin la nota** (permiso por columnas); nadie escribe desde el navegador. RPC solo admin (`private.es_admin()`): `patrocinios_admin_listar`, `patrocinio_guardar` (crea o edita; comprueba que el torneo o clan exista), `patrocinio_borrar` (**archiva**: deja de verse, la fila queda como historial del acuerdo).
- **Web:** Moderación → sección «Patrocinadores» (`features/patrociniosAdmin.js`, solo admin). Tira «Patrocinado por» en la cabecera de `/torneo/` y en `/clanes/` (`features/patrocinios.js`: las páginas dejan `<div data-patro="torneo:12">` y `rellenarPatrocinios()` lo llena; si falla, no muestra nada). Validación en `core/economia/patrocinios.js` (`tests/patrocinios.test.mjs`). Estilos `styles/patrocinios.css`.
- **Riesgos anotados en el diseño:** nada de alcohol, apuestas o contenido no apto para menores; Fralex aprueba cada logo y anota el acuerdo en la nota.

#### 3.3 Overlay de transmisión para torneos premium (ronda 363)
- **Qué es:** la página `/overlay-torneo/?id=N` (sin menú, fondo transparente, vertical 9:16) para usar como **fuente de navegador** de 1080 × 1920 en OBS o TikTok LIVE Studio. Muestra nombre del torneo, progreso, último resultado en grande (con destello cuando cambia), los 3 próximos partidos, el campeón y el patrocinador. Se actualiza cada 15 s. Opciones: `?tema=sudario` (azul y dorado), `?demo=1` (datos de ejemplo).
- **Quién lo usa:** solo torneos con la marca premium (300 gemas, migración 123). El enlace con botón «Copiar» sale en «Opciones del organizador» del torneo premium. No hay cobro nuevo.
- **Archivos:** `src/pages/overlay-torneo.astro`, `js/pages/overlayTorneo.js`, `styles/overlayTorneo.css`, lógica `core/competicion/overlay.js` (`resumenOverlay`, `marcadorTexto`) con `tests/overlay.test.mjs`.
- **No toca** el experimento de marcador en vivo de Link (`tiktok-experimento`, solo lectura).

#### 3.4 Caras de jugadores que no tienen cara en el juego (hilo 8)
- Origen: carpeta de notas de la sesión de caras en la PC de Fralex, `C:\Temp\claude\D--Frank-IA-CLAUDE\195dabc8-c824-4363-8128-9c859256ce4d\scratchpad\caras` (`out\` = 23 recortes PNG 320 px, `lista.json` = jugador de cada índice, `fotos.json` = autor y licencia, `hoja_out.jpg` = hoja de contacto, `recortar.py` = el script del recorte).
- Se eligieron a ojo los 8 recortes de frente y limpios: Alisson Becker (230161), Conor Bradley (146461), Jonas Urbig (174911), Max Dowman (178082), Mika Godts (159204), Myles Lewis-Skelly (159437), Rico Lewis (157391), Rodrigo Mendoza (159248). Los otros 15 se descartaron (de perfil, borrosos o cortados).
- Se guardaron como `public/minifaces/<pes_id>.webp` (calidad 88) y se añadieron a `MINIFACES` en `src/data/minifaces.js`. **Licencias CC BY / CC BY-SA de Wikimedia Commons:** `MINIFACES_FOTO` guarda autor, licencia y página; la carta (título al pasar el mouse) y la ficha `/futbolista/` nombran al autor.

#### 3.5 Prueba de páginas sin falsos fallos
- `tools/humo/abrir-paginas.mjs` marcaba como fallo `/mi-club/` y `/comunidad/` de vez en cuando: son redirecciones y el navegador cancela la descarga de una fuente al irse (`net::ERR_ABORTED`). Ahora se ignora ese caso. Resultado: 60/60.

---

### 4. Cómo se probó
- `npm test`: 648 de 648. `npm run build`: 60 páginas. `npm run test:paginas`: 60/60.
- Jugadores y el overlay se vieron con capturas automáticas (Chrome sin pantalla) en 1440 × 900, 390 × 844 y 540 × 960, con datos de prueba (la nube de Claude no llega a Supabase desde el navegador).
- Migración 139 probada dentro de la base con una transacción que se deshace sola: crear, editar, torneo/clan inexistente rechazado, anónimo no puede listar, quitar = desaparece de la lista → **TODO_OK REVERTIDO**. Permisos: anónimo ve `nombre` pero no `nota`; nadie puede insertar directo; anónimo no puede ejecutar las RPC. Avisos de seguridad: solo el informativo de siempre (funciones SECURITY DEFINER que comprueban el rol por dentro).

### 5. Trampas encontradas (para la próxima IA)
- **Conector MCP de Supabase:** una sentencia `DELETE` dentro del SQL hace que el conector pida confirmación y se cuelgue a los 60 s (no queda nada a medias). Solución: aplicar por partes y, si hace falta borrar, archivar con `update` o entregar el SQL a Fralex.
- **Mock de Supabase en capturas:** las respuestas simuladas necesitan cabeceras CORS (`access-control-allow-origin: *`) y responder al `OPTIONS`; si no, la página dice «No se pudo cargar».

### 6. Pendientes
- Que Fralex vea en la vista previa: Jugadores (panel y Lista), el overlay (`/overlay-torneo/?demo=1`) y la sección Patrocinadores.
- Llaves de pantalla completa, estadísticas y página propia del torneo premium: siguientes fases del diseño.
- Pasar a `main` solo con «Súbelo».

### 7. En Drive (subido y comprobado el 21-oct, carpeta «Phoenix Link — Guías y logros»)
- Esta bitácora → «Web · Bitácora 21-oct-2026: decisiones, Jugadores, patrocinadores, overlay y caras» — https://docs.google.com/document/d/1hkB3U7hWIXxgL4EbDSLrvTjrb5_whNREGb1dBKtE-Q4/edit
- La guía → «Web · Guía de novedades (21-oct-2026)» — https://docs.google.com/document/d/1rQFpnipoxhVMoDp2EEBgO7fQl43vaQxEJ4_sIWnhM7g/edit

---

## Parte 10 · Bitácora e informe · Hilo «Revisión completa» (proyecto Phoenix Evolution Web & APP) · 21 de octubre de 2026

> Origen: `docs/bitacoras/BITACORA-21-OCT-2026-CUENTA-GENERAL.md` · último cambio a75cf94 2026-10-21 · 9275 bytes. Copia íntegra.

Esta bitácora es para la **otra cuenta**, o para cualquier IA o persona que continúe el trabajo. Está escrita para entender **todo lo que se hizo el 21-oct** sin haber visto el chat.

Complementa `REGISTRO.md` (una línea por cambio) y estos dos documentos del mismo día:
- `docs/bitacoras/INFORME-REVISION-GENERAL-21-OCT-2026.md`: la revisión de Drive, GitHub y Supabase.
- `docs/guias/GUIA-RETOMAR-PROYECTO-21-OCT-2026.md`: la base para continuar.
- Lo de la web de ese día (1.14.0 → 1.15.1, migración 139) lo documentó su propio hilo. No se duplica aquí:
  - `docs/bitacoras/BITACORA-21-OCT-2026-HILO-DECISIONES-WEB.md`;
  - `docs/guias/GUIA-NOVEDADES-21-OCT-2026.md` (copias en Drive, «Phoenix Link — Guías y logros»).
- Lo de los mandos 9+ de ese día está en el libro: `PRUEBA_CANCHA\informes\LIBRO_PERSONAL\cap_60_k_estrategia_mas_mandos.md` y `00_BITACORA_VIVA.md`.

> **Norma de Fralex (20-oct, repetida el 21-oct):** todo va a GitHub **y** a Drive, «tal cual lo estaba haciendo», para que «cualquier humano o IA pueda replicar todo a la perfección».

---

### 0. Cómo retomar en 5 minutos

1. Lee `docs/guias/GUIA-RETOMAR-PROYECTO-21-OCT-2026.md`. Trae las reglas, los 5 límites, el estado de cada frente y el orden de pasos.
2. La memoria de Claude está en `C:\Users\WinterOS\.claude\projects\D--Frank-IA-CLAUDE\memory\` (37 archivos, índice `MEMORY.md`). Solo se carga sola si la sesión se abre en `D:\Frank\IA\CLAUDE`.
3. El paquete para proyectos de claude.ai está en `D:\Frank\IA\CLAUDE\para-proyecto`. Se regenera con `ACTUALIZAR_PARA_PROYECTO.ps1`. Hay una copia comprimida en la biblioteca del proyecto: `para-proyecto-21-oct-2026.zip`.
4. Drive se sube con **Google Drive para escritorio**. Se abre con `C:\Program Files\Google\Drive File Stream\133.0.2.0\GoogleDriveFS.exe` y monta la unidad `H:` (la cuenta de Google de Fralex). Luego se copian los archivos a `H:\Mi unidad\…`.

---

### 1. Qué se hizo hoy (en orden)

| Hora (Lima) | Qué | Dónde / commit | Estado |
|---|---|---|---|
| 14:20 | **Revisión completa en solo lectura** de Drive, los 4 repos de GitHub (ramas, issues, PRs, releases) y Supabase (tablas, RPC, funciones edge, migraciones, avisos) | `docs/bitacoras/INFORME-REVISION-GENERAL-21-OCT-2026.md` | HECHO |
| 14:30 | **Lectura de todas las memorias** de Claude y de los `CLAUDE.md` de cada repo, más la base para continuar | `docs/guias/GUIA-RETOMAR-PROYECTO-21-OCT-2026.md` | HECHO |
| 14:33 | (otro hilo) **Link 0.3.41–0.3.44 commiteado**: hasta 16 puestos (experimental) y arreglo de «no se podía vincular la cuenta» | `Fralexito/smash-soda-fork` rama `plan-ux`, `06a673d` | HECHO |
| 14:38 | Corregida la norma de informes de la web: ahora van a GitHub **y** a Drive | `CLAUDE.md`, `a7f1aa4` (rama `borrador`) | HECHO |
| 14:40 | **Corregidas 5 memorias**: los 4 repos son públicos, se permite el push, Link va en `plan-ux`, la regla «sin git push» quedó superada y se quitó un duplicado de `MEMORY.md` | carpeta de memoria (fuera de git) | HECHO |
| 14:45 | Corregidos `CONTEXTO_PHOENIX.md` (37 cambios sin commit y copia vieja `C:\dev\pes-rediseno`), `contexto/SUPABASE.md` (406 funciones), `contexto/HILOS.md` (overlay sin release) y los capítulos 02 y 04 del libro (regla de push, `App-galaxy-` vacío) | `D:\Frank\IA\CLAUDE`, `LIBRO_PERSONAL` | HECHO |
| 14:52 | Guías de Link y Sync al día: rama `plan-ux`, Sync en vez de Mercado, y compilar con `cmake`, nunca con `COMPILAR_PHOENIX.bat` | `plan-ux` `8c444f0`; `mercado-fase0` `c522386` → `053eb84` | HECHO (ver §3, error corregido) |
| 14:57 | Paquete `para-proyecto` puesto al día y subido comprimido a la biblioteca del proyecto | `para-proyecto-21-oct-2026.zip` | HECHO |
| 14:46–15:12 | (hilo de la web, en la nube) Beta **1.14.0** (Jugadores con panel lateral y vista Lista), **1.15.0** (patrocinadores, overlay de torneo premium y 8 caras nuevas) y ronda 363: migración **139** completa (139a, 139b, 139c); luego 1.15.1 | `fe13a15`, `5a12066`, `4632a43` (hilo «Decisiones pendientes de la web»; ya en `borrador`) | HECHO en su hilo |
| 15:15 | Esta bitácora, el informe y la guía en GitHub, y **subida a Drive de todo lo pendiente desde el 15-oct** | este commit y Drive (§4) | HECHO |

---

### 2. Estado de cada frente al cierre (comprobado)

- **Web:**
  - `borrador` está en la **Beta 1.15.0** (ronda 363, patrocinadores y caras nuevas, del hilo «Decisiones pendientes de la web»), más los documentos de hoy.
  - Migración 139 aplicada completa por el hilo de la web (139a, 139b y 139c por MCP) y probada; ya no hay que pegar nada. Luego subió a la **Beta 1.15.1**.
  - `main` sigue en la ronda 275 (13-oct).
- **Link:** 0.3.44 subida (`06a673d`). Ya no depende solo de esta PC.
- **Mandos 9–16 en PES:**
  - Módulo Sider `phoenix_mandos_fase1.lua` v0.9.14, punto seguro (`modulo_sider\RESPALDO_v0.9.14_punto_seguro_20261020.lua`).
  - La pantalla de lados funciona y los mandos 9+ ya tienen ranura y jugador, pero el jugador no se mueve.
  - Hipótesis: falta el «número de usuario local» de la ranura (desplazamiento 0x180).
  - Está preparada la prueba `prueba_usuario7.ps1`, que es reversible con `-Deshacer`. Falta la prueba en vivo de Fralex.
- **Sync:** `mercado-fase0` al día (phoenix.lua v0.18c).
- **Supabase:**
  - Datos: 42 MB, 3 usuarios, 185 tablas con RLS y 10 funciones edge.
  - Migraciones: 125 registradas hasta la 138, más la 139 (en 3 partes: 139a, 139b, 139c) aplicada hoy por el hilo de la web.
  - Avisos: sin novedades frente al 21-oct de `contexto/SUPABASE.md`.

---

### 3. Errores del día y cómo se corrigieron

- **Guía de Sync pisada (14:52):**
  - Qué pasó: se copió la `CLAUDE.md` y la `COORDINACION.md` de Link sobre las de Sync, creyendo que eran iguales. No lo eran: la de Sync tiene secciones propias (nombre Phoenix Sync, buzón de recarga, pedidos a Link). Quedó en el commit `c522386`.
  - Cómo se corrigió: en el siguiente commit (`053eb84`) se restauró la versión de Sync con `git checkout c522386~1 --` y se aplicaron solo los cambios puntuales. No se perdió nada.
  - **Lección:** antes de copiar un archivo entre ramas, comparar con `cmp`. Que tengan el mismo nombre no quiere decir que tengan el mismo contenido.
- **Rutas con barras perdidas:**
  - Qué pasó: al editar con `sed` o `node -e` desde Bash, las `\` de rutas Windows desaparecieron (por ejemplo, `C:devpes-rediseno`).
  - Cómo se corrigió: con el editor de archivos.
  - **Lección:** para rutas de Windows usar la herramienta Edit o Write, no `sed` ni `node -e` desde Bash.
- **El control de permisos** bloqueó primero la edición de las guías de Link (carpeta de otro hilo) y el script `ACTUALIZAR_PARA_PROYECTO.ps1`, que borra y recrea la carpeta. Se resolvió así:
  - Las guías se editaron cuando Fralex dijo «corrige todo».
  - El paquete se actualizó copiando archivo por archivo.

---

### 4. Drive: qué se subió hoy

Unidad `H:\Mi unidad` (Google Drive para escritorio, la cuenta de Google de Fralex). Se copió lo siguiente:

| Carpeta de Drive | Qué lleva | Archivos |
|---|---|---|
| `Phoenix Link — Guías y logros\LIBRO PERSONAL — …\Originales (.md) — capítulos completos` | Todo el libro al día (capítulos 01–95, cap_15 nuevo, cap_60_j/k/l, cap_62, bitácora viva, `LIBRO_PERSONAL_COMPLETO.md`) | 79 |
| `Phoenix Link — Guías y logros\Respaldo GitHub y PC — 21-oct-2026\web` | `CLAUDE.md`, `MAPA.md`, `REGISTRO.md`, todo `docs/` y las migraciones `supabase/migrations/*.sql` | 189 |
| `…\Respaldo GitHub y PC — 21-oct-2026\link` | `CLAUDE.md`, `COORDINACION.md`, `REGISTRO-LINK.md` y todo `docs/` de Link (`plan-ux`) | 77 |
| `…\Respaldo GitHub y PC — 21-oct-2026\investigacion-pes` | Informes 01–12 de PES, `INFORME_FINAL`, manual M00–M17, investigaciones I01–I06 y Gemini | 45 |
| `…\Respaldo GitHub y PC — 21-oct-2026\modulo-sider-mandos` | Módulo de mandos 9+ (`phoenix_mandos_fase1.lua` y respaldos), guía y herramientas `.ps1` | 17 |
| `…\Respaldo GitHub y PC — 21-oct-2026\contexto-claude-para-proyecto` | El paquete `para-proyecto` completo (memorias, contexto, HILOS, SUPABASE, INFORMES) | 65 |
| `Phoenix Mercado — Base de conocimiento PES 2021\Respaldo GitHub — 21-oct-2026 (Sync)` | `CLAUDE.md`, `COORDINACION.md` y todos los `.md` de `PhoenixSync/` (`mercado-fase0`) | 78 |

Antes de subir se revisó que ningún documento tuviera claves (`sb_secret_`, `service_role` o el sello de la beta). No se encontró ninguna.

---

### 5. Decisiones pendientes de Fralex

1. **Apuestas y dinero real: RESUELTO el mismo 21-oct** con la migración 140 «ascuas solo gratis» (lo comprado ya no puede llegar a un pozo). Ver `docs/economia/BITACORA-DINERO-APUESTAS-Y-LEGAL.md`. Antes de los pagos reales solo falta la revisión legal y los términos de Parsec y Steam.
2. **Repos públicos:** decidir si se pasan a privados. Los 4 lo son.
3. **Seguridad del panel (lo cambia él):** «Leaked password protection» y `admin_exige_mfa`.
4. **Mandos 9+:** la prueba en vivo con la fila 13.
5. **Web:** decidir cuándo «Publícalo» (`borrador` → `main`). La 139 ya está aplicada.

---

## Parte 11 · Informe de revisión completa — Phoenix Evolution (21-oct-2026)

> Origen: `docs/bitacoras/INFORME-REVISION-GENERAL-21-OCT-2026.md` · último cambio b04701e 2026-10-21 · 10944 bytes. Copia íntegra.

Solo lectura: no se editó, no se hizo commit, no se ejecutó SQL que escriba y no se tocó ningún ajuste.
Fuentes: GitHub (API pública), git local en `C:\dev`, Supabase (MCP, proyecto `fiibiyijojkxqlsrhcil`), Google Drive (conector) y el paquete `D:\Frank\IA\CLAUDE\para-proyecto`.

**Accesos:** todos los conectores respondieron. No hace falta que des ningún acceso nuevo. La PC no tiene `gh` instalado, así que GitHub se leyó por la API pública. Eso funcionó porque **los 4 repos son públicos**.

---

### 1. Resumen en 6 líneas

1. **Web:** sana. La rama `borrador` está en la Beta 1.13.0 (`abc31fa`), al día con GitHub, con la CI de pruebas y el despliegue a Pages en verde (19-oct).
2. **Link:** sigue sin commit. Hay 37 cambios sin subir en `plan-ux` (29 archivos modificados y 8 nuevos, con `kVersion` = 0.3.44). Ese commit lo lleva otro hilo.
3. **Sync:** al día. La rama `mercado-fase0` (`3305aee`, 18-oct) coincide con GitHub.
4. **Supabase:** sano y pequeño (42 MB, 3 usuarios). Tiene 185 tablas, todas con RLS, 10 funciones edge activas, 125 migraciones registradas (hasta la 138) y 16 tareas cron. No hay avisos nuevos frente a lo que dice el paquete.
5. **Drive:** al día solo hasta el 15-oct. El 21-oct se añadieron 6 respaldos (16–21 oct). Falta todo lo de Link 0.3.41–0.3.44 y el módulo de mandos v0.9.x.
6. **Riesgo principal:** los 4 repos son públicos, no solo 2 como dice la memoria. Además, la economía tiene apuestas con comisión en la base, y eso choca con «nada de apuestas con dinero real» el día que se activen los pagos.

---

### 2. Qué hay en cada sitio

#### GitHub (Fralexito)
| Repo | Visibilidad | Rama por defecto | Ramas | Issues / PRs / releases | Último push |
|---|---|---|---|---|---|
| `smash-soda-fork` (Link + Sync) | **Pública** | `master` | 14: `plan-ux` (0.3.40, 19-oct), `mercado-fase0` (18-oct), `rediseño-phoenix-portal` (0.3.20), `experimental-html`, `wip-link-interfaz-web`, 2 respaldos del 08-oct y 5 `respaldo/ws-*` (18-oct) | 0 / 0 / 0. Tags: `antes-plan-ux-0.3.20` y `antes-pasada-visual-0.3.34` | 19-oct |
| `phoenixevolution` (web) | **Pública** | `main` (`f62bffa`, 13-oct) | 10: `borrador` (1.13.0), `main`, `liga-automatica`, `rediseno`, `base-v2`, `central-base-v1` y 4 `respaldo/ws-*` | 0 / 0 / 0. CI de pruebas y Pages en verde | 19-oct |
| `phoenix-overlay` | **Pública** | `main` (`30470fe`, 13-oct) | 1 | 0 / 0 / **0 releases y 0 tags** | 16-oct |
| `App-galaxy-` | **Pública** | `main` | — | **Repo vacío** (sin archivos) | 12-oct |

- `main` de la web va 6 días por detrás de `borrador`. Se publicó por última vez en la ronda 275.
- Las 9 ramas `respaldo/ws-*` son trabajo «a medias» del 18-oct. Siguen en GitHub y nadie las ha integrado ni cerrado.
- El archivo secreto `PhoenixBetaSello.h` está bien ignorado (`.gitignore:403`) y no aparece entre los archivos subidos. La rama local `respaldo-antes-de-quitar-sello` existe solo en local, y así debe seguir.

#### Git local (`C:\dev`)
| Carpeta | Rama | Estado |
|---|---|---|
| `pes-liga-automatica` | `borrador` | Al día con origin. Solo `.impeccable/` sin seguimiento |
| `smash-soda-fork` (raíz) | `mercado-fase0` | Al día. Solo logs y carpetas de compilación sin seguimiento |
| `smash-soda-fork\_phoenix-link` | `plan-ux` | Al día con origin, pero con **37 cambios sin commit** (0.3.41–0.3.44) |
| `pes-rediseno` (worktree) | `rediseno` | **2 commits por detrás** de origin y sin uso desde el 10-oct |
| `phoenix-overlay` | `main` | Al día. Solo `icon-viejo.ico.bak` |

#### Supabase («Galaxy League», sa-east-1, Postgres 17, ACTIVE_HEALTHY)
- Hay 185 tablas en `public`, todas con RLS. También hay 406 funciones en `public` (405 `SECURITY DEFINER`) y 12 buckets (6 públicos: avatars, fichas, noticias, muro, muro-video, stickers).
- Las tablas con más filas son `muestras_calidad` (524), `lm_jugadores` (314) y `eventos_sala` (196). Hay solo 3 usuarios.
- **Funciones edge (10, todas ACTIVE):**
  - `phoenix` (v13), `mercado` (v12), `liga` (v9), `notificar-discord` (v5), `directos` (v4), `traspasos` (v2) y `ayuda-ia` (v2).
  - `pago-crear`, `pago-webhook` y `pago-conciliar`, todas en v1.
  - Todas tienen `verify_jwt=false` salvo `notificar-discord` y `pago-crear`. Es lo esperado, porque Link y PES no usan sesión.
- **Migraciones:** hay 125 registradas, de la 001 a la `138_stickers_telegram`, frente a 137 `.sql` en el repo. El desfase ya está documentado (`REGISTRO_DESFASES.md`). La siguiente libre es la 139.
- **Cron (16, todos activos):** retos, clanes, eventos y salas-caídas corren cada minuto. Directos de Twitch, cada 5 min. Economía, cada 10 y cada 15 min. Además hay resúmenes de Discord, purgas y limpiezas.
- **Economía (`economia_config`):**
  - Pagos: `pagos_activos=false` y `pasarela_modo=prueba`. Hay 0 órdenes, 0 pagos manuales y 0 apuestas.
  - Seguridad del panel admin: `admin_exige_mfa=false`.
- **Avisos de seguridad:**
  - WARN: falta activar «Leaked password protection».
  - WARN: 41 funciones `SECURITY DEFINER` ejecutables por `anon` y 345 por `authenticated`.
  - INFO: 69 tablas con RLS pero sin políticas.
  - Todo esto coincide con `contexto/SUPABASE.md §7`. No hay nada nuevo.
- **Avisos de rendimiento (solo INFO):** 96 claves foráneas sin índice y 53 índices sin usar. También coincide con el paquete.

#### Google Drive (todo en la cuenta de Google de Fralex)
| Carpeta | Contenido | Última modificación |
|---|---|---|
| Phoenix Link — Guías y logros | 39 docs: guías 01–31 (Link, mandos, cancha), guías beta 1 y 2, prompt Gemini y 2 respaldos Link 16–21 oct. Algunas guías están marcadas [VIEJA] o [Resumen antiguo] | 21-oct (respaldos) / 15-oct (contenido) |
| └ LIBRO PERSONAL v1 | 58 elementos: capítulos «LP · cap_…», versión Word y 2 respaldos web 16–21 oct | 21-oct / 15-oct |
| └ Manual PES 2021 | 19 docs (M00–M17 y resumen de una página) | 15-oct |
| Phoenix Mercado — Base de conocimiento PES 2021 | Liga Máster, barras de crecimiento, Sider, ConmeGOL 26/27, notas WEB por ronda (hasta la 242) y 2 respaldos Sync 16–21 oct | 21-oct (respaldos) / 12-oct (contenido) |
| (suelto) | `SiderModMenu-v1.2.zip` | 18-oct |

En Drive no aparece «0.3.44» ni `phoenix_mandos_fase1`. El respaldo de Link llega hasta antes de los mandos 9+.

---

### 3. Estado real de cada frente

| Frente | Estado real (comprobado) | Bloqueo |
|---|---|---|
| Web | Beta 1.13.0 publicada en la vista previa (Pages en verde). `main` sigue en la ronda 275 (13-oct) | Ninguno. Decidir cuándo pasar `borrador` a `main` |
| Link | Hay 0.3.44 en local sin commit (37 cambios). En GitHub está la 0.3.40 | Tu visto bueno al commit (lo lleva otro hilo) |
| Mandos 9–16 (Sider) | v0.9.x en local. Los mandos 9+ se ven pero el jugador no se mueve | Tu prueba en vivo («listo» en su hilo) |
| Sync | `mercado-fase0` al día (phoenix.lua v0.18c) | Prueba real de fichajes (hilo 4) |
| Overlay | Código al día. **No hay ninguna release publicada** | Reempaquetar si se quiere distribuir |
| App Galaxy | Repo vacío | No hay trabajo |
| Economía | Montada (fases A–E) con pagos apagados y en modo prueba | Ver riesgos |

---

### 4. Lo desactualizado en el paquete `para-proyecto`

1. **`memoria/no-subir-a-github-publico.md`** dice que solo Link y overlay son públicos. En realidad **también lo son `phoenixevolution` (web) y `App-galaxy-`**.
2. **`pes/cap_02_reglas_trampas_y_lecciones.md` regla 10** dice «No `git push` mientras sean públicos». Eso contradice la memoria del 16-oct, que ya autorizó el push. También nombra el archivo `phoenix-dueno.flag`, que ya se cambió por estar filtrado.
3. **`CONTEXTO_PHOENIX.md` §3** dice «13 archivos sin commit en Link». Ahora son **37** (29 modificados y 8 nuevos).
4. **`contexto/HILOS.md` línea 287** dice que `phoenix-overlay` tiene el tag `v1.0.0-beta1` con un zip. En GitHub **no hay tags ni releases** en ese repo.
5. **`CONTEXTO_PHOENIX.md` §1** no lista `C:\dev\phoenix-overlay` ni el worktree `C:\dev\pes-rediseno`, que está 2 commits atrasado. Tampoco lo marca como copia vieja.
6. **`contexto/SUPABASE.md` §1** habla de «≈396 RPC públicas». Hoy hay **406 funciones** en `public`. Es un cambio menor.
7. **`pes/cap_04_mapa_de_rutas_y_servicios.md`** cita `App-galaxy-` como repo sin aclarar que está vacío.
8. Lo demás coincide: versiones (1.13.0 y 0.3.44), ramas, la migración 138, los avisos de Supabase y la lista de Drive en `INFORMES.md`.

---

### 5. Riesgos

1. **Apuestas y dinero real (límite que no se flexibiliza).**
   - La base tiene apuestas entre jugadores con comisión del 5–10 % (`apuestas_reto`, `apostar_en_reto`, `aceptar_apuesta`, `apuesta_*` en `economia_config`).
   - También tiene recargas que compran monedas con dinero real (`recarga_*` en céntimos, pasarela `pago-*`).
   - Hoy no pasa nada, porque los pagos están apagados y hay 0 apuestas. Pero si se activan los pagos con las apuestas encendidas, se estaría apostando con algo comprado con dinero real. Conviene decidir antes: o se separan las monedas de apuesta de las compradas, o se apagan las apuestas.
2. **Los 4 repos son públicos.** Cualquier `.md` con datos de la economía, la seguridad o la llave de la beta queda a la vista. Hasta ahora el sello está bien protegido.
3. **Link 0.3.41–0.3.44 solo existe en esta PC.** Son 37 cambios sin commit. Si el disco falla, se pierden. Hay que hacer el commit y el push cuanto antes, desde el hilo que lo lleva.
4. **Seguridad del panel (decides tú):**
   - «Leaked password protection» está desactivada.
   - `admin_exige_mfa=false`: el panel admin no exige verificación en dos pasos.
5. **Ramas viejas acumuladas:** 9 `respaldo/ws-*`, `wip-link-interfaz-web`, `experimental-html` y otras. Hay riesgo de confundirse al retomar trabajo.
6. **Drive va 6 días por detrás** en todo lo de mandos y Link UX.

---

### 6. Siguientes pasos recomendados (en orden)

1. Dar el visto bueno al commit y push de Link 0.3.44 en su hilo. Es lo que más protege el trabajo.
2. Decidir qué pasa con las apuestas antes de poner `pagos_activos=true`.
3. Decidir si quieres hacer privados los repos. Si es así, se hace en GitHub → Settings → General → Danger Zone → Change visibility. Si no, al menos `App-galaxy-`, que está vacío, se puede borrar o hacer privado.
4. Activar «Leaked password protection» en Supabase → Authentication y, si quieres, poner `admin_exige_mfa`. Son cambios tuyos.
5. Corregir los 7 puntos de la sección 4 con `ACTUALIZAR_PARA_PROYECTO.ps1` y retocar a mano la memoria y `cap_02`.
6. Cuando termine lo de los mandos, subir a Drive Link 0.3.41–0.3.44, el módulo de mandos v0.9.x y los docs de la web posteriores al 15-oct.
7. Más adelante: limpiar las ramas `respaldo/*` ya integradas y pasar la web de `borrador` a `main` cuando des la orden de «Publícalo».

---

## Parte 12 · Informe de seguridad y de cambios sin commit — 21-oct-2026

> Origen: `docs/bitacoras/INFORME-SEGURIDAD-21-OCT-2026.md` · último cambio d6b926a 2026-10-21 · 13880 bytes. Copia íntegra.

Hilo «Seguridad y cambios sin commit» (puntos 4 y 7 de la revisión general). Todo lo que se dice aquí se comprobó el 21-oct-2026 entre las 15:30 y las 16:30 (Lima).

### 1. Resumen en 6 líneas

1. **NO hay claves filtradas** en los 4 repos públicos ni en su historial completo.
2. **Supabase está bien protegido**: ningún aviso grave. Se añadió RLS a las 2 tablas de `private` (migración 141).
3. Se quitó el correo personal de Fralex de 2 documentos públicos (queda en el autor de 4 commits antiguos, ver §2.3).
4. **Fralex debe hacer 2 cosas a mano** (son ajustes de seguridad): activar los 2 pasos en sus cuentas y, si el plan lo permite, la protección de contraseñas filtradas (§4).
5. Entorno de pruebas recomendado: **un segundo proyecto Supabase gratis** (0 USD) (§5).
6. Nuevo script `tools/revisar-sin-commit.ps1` para que no se acumulen cambios sin commit (§6).

### 2. Repos públicos de GitHub

Los 4 repos de `Fralexito` son públicos: `phoenixevolution` (675 commits, 11 ramas), `smash-soda-fork` (801 commits, 14 ramas), `phoenix-overlay` (40 commits) y `App-galaxy-` (vacío, 0 commits).

#### 2.1 Cómo se revisó
Se clonó una copia espejo de cada repo (todas las ramas) y un script leyó **todos los archivos de todas las versiones del historial** (4.983 + 8.411 + 464 archivos distintos). Buscó: claves JWT de Supabase (y decodificó su rol), `sb_secret_`, `service_role`, tokens de GitHub, claves de Anthropic/OpenAI, Stripe, AWS, Google, Slack, webhooks y tokens de Discord, claves privadas, URLs de Postgres con contraseña, asignaciones `password=`/`token=`, archivos `.env`, `.pem`, `.key`, bases de datos, correos, teléfonos de Perú, DNI, números de cuenta y documentos (PDF, Word, Excel, CSV, ZIP).

#### 2.2 Resultado
| Qué | Resultado |
|---|---|
| Claves secretas (service_role, sb_secret, tokens) | **Ninguna** en ningún commit |
| Clave de Supabase en la web | Solo `sb_publishable_…` (pública por diseño, la protege el RLS) |
| La palabra `service_role` | Solo en documentación y migraciones que explican que **no** se debe usar en el cliente |
| `TOKEN = 'aaa.bbb.ccc'` | Valor falso de una prueba (`tests/worker-videos.test.mjs`) |
| `Token="6595b64144ccf1df"` en phoenix-overlay | Es el identificador estándar de Microsoft en el manifiesto de Windows, no un secreto |
| Teléfonos, DNI, cuentas bancarias | Ninguno (el único número parecido es un tamaño de archivo en una huella de PES) |
| Documentos | 3 PDF: `Formatos-Phoenix-Evolution.pdf` y 2 copias de `base-conocimiento-PES21.pdf`. Son documentación del proyecto, no privados |

#### 2.3 Correo personal
- Aparecía `frankchoy11` en 3 líneas de 2 documentos de hoy (`BITACORA-21-OCT-2026-CUENTA-GENERAL.md` e `INFORME-REVISION-GENERAL-21-OCT-2026.md`). **Corregido** con un commit nuevo («la cuenta de Google de Fralex»).
- También figura como **autor de 4 commits antiguos** (1 en phoenixevolution y 3 en phoenix-overlay). Quitarlo exige reescribir el historial, que es irreversible y rompe los clones de los otros hilos. **Recomendación: no reescribir**; el riesgo es bajo (es un correo, no una clave). Para el futuro, en GitHub → Settings → Emails, activar «Keep my email addresses private» y «Block command line pushes that expose my email» (ajuste de cuenta: lo hace Fralex).

### 3. Supabase (`fiibiyijojkxqlsrhcil`)

#### 3.1 Avisos de seguridad
| Aviso | Cantidad | Qué significa | Decisión |
|---|---|---|---|
| RLS activo sin políticas | 69 tablas | Es **a propósito**: nadie las lee directo, todo pasa por funciones RPC | Correcto, no se toca |
| Funciones SECURITY DEFINER que puede llamar `anon` | 41 | Todas son de **solo lectura pública** (rankings, perfiles públicos, muro, tienda, clave pública del mercado) | Revisadas: correcto |
| Funciones SECURITY DEFINER que puede llamar un usuario con sesión | 348 | Es la arquitectura del proyecto (la web solo escribe por RPC) | Revisadas las 46 de `admin_*`/`staff_*`: **todas** comprueban `es_moderador()`/`es_admin()` antes de actuar |
| Protección de contraseñas filtradas apagada | 1 | Supabase no compara las contraseñas con la lista de HaveIBeenPwned | **Ajuste de seguridad: lo hace Fralex** (§4) |

#### 3.2 Comprobaciones extra (no salen en los avisos)
- Ninguna función `sistema_*` (las que usan Link y las Edge Functions con la clave de servicio) se puede llamar desde la web. ✅
- Todas las funciones SECURITY DEFINER tienen `search_path` fijo. ✅
- Ninguna tabla de `public` tiene RLS apagado. ✅
- Ninguna política de escritura es `true` (abierta a todos). Las de escritura exigen ser el dueño de la fila o moderador/admin/árbitro. ✅
- `perfiles`: el usuario solo puede editar columnas inofensivas (nombre, bio, avatar…). **`rol` no está entre ellas** y además lo protegen los disparadores `trg_proteger_rol` y `zz_auditoria_rol`. ✅
- Almacenamiento: los buckets públicos solo aceptan imágenes o vídeo con límite de tamaño; `comprobantes-pago`, `option-files`, `sync-option`, `vestuario`, `link-versiones` y `fuente-phoenix` son privados. ✅
- **Las 2 tablas de `private`** (`mercado_claves` y `jugadores_foto_respaldo`) no tenían RLS. No eran accesibles (sin permisos y `private` no está en la API), pero se les puso RLS como segunda barrera → **migración 141** (`supabase/migrations/141_rls_tablas_private.sql`). Comprobado después: `mercado_clave_publica()` sigue funcionando.

#### 3.3 Avisos de rendimiento
Solo avisos informativos, ninguno de nivel «WARN»:
- **97 claves foráneas sin índice.** Casi todas son columnas de auditoría (`revisado_por`, `creado_por`…) que no se consultan. Con el tráfico actual no afecta. No se añaden 97 índices a ciegas: se añadirá el índice concreto si una pantalla se vuelve lenta.
- **54 índices sin usar.** La web aún tiene poco uso real, así que la estadística no es fiable. **No se borra ninguno** antes del lanzamiento.

### 4. Lo que tiene que hacer Fralex (ajustes de seguridad, Claude no los toca)

**A. Verificación en dos pasos (gratis, unos 5 minutos cada una). Prioridad alta.**
1. **Supabase**: https://supabase.com/dashboard/account/security → «Multi-Factor Authentication» → «Add new app» → escanea el QR con Google Authenticator (o similar) → escribe el código de 6 cifras.
2. **GitHub**: https://github.com/settings/security → «Two-factor authentication» → «Enable» → app de autenticación → guarda los códigos de recuperación en un lugar seguro (nunca en un repo).
3. **Google** (cuenta de Drive y correo): https://myaccount.google.com/signinoptions/twosv → «Activar».
4. **Cloudflare** (aloja la web): https://dash.cloudflare.com/profile/authentication → «Two-Factor Authentication».

**B. Protección de contraseñas filtradas.**
Supabase → proyecto → **Authentication** → **Sign In / Providers** (en algunas versiones del panel está en **Attack Protection**) → **Email** → activar **«Prevent use of leaked passwords»** → Save.
Ojo: Supabase solo la ofrece en el **plan Pro**. Si el interruptor sale bloqueado, el proyecto está en el plan gratis y no se puede activar sin pagar.

### 5. Entorno de pruebas antes de producción (lo más barato)

Hoy todo lo que se aplica en Supabase va directo a producción (no hay rama de pruebas).

| Opción | Coste | Ventajas | Inconvenientes |
|---|---|---|---|
| **A. 2.º proyecto Supabase gratis (recomendada)** | **0 USD** | El plan gratis permite 2 proyectos activos. Se le aplican las mismas migraciones y la vista previa (`/fase-beta-1-0/`) puede apuntar a él | Se pausa tras 7 días sin uso (se reactiva con un clic). Hay que aplicarle las migraciones también |
| B. Supabase en local con la CLI y Docker | 0 USD | Copia completa en la PC, sin internet | Docker pesa (2-4 GB de RAM); exige instalar Docker Desktop y la CLI |
| C. Ramas de Supabase (Branching) | Plan Pro (~25 USD/mes) + ~0,32 USD/día por rama | Cada cambio se prueba en una copia automática | Es de pago |

**Recomendación: A.** Pasos cuando Fralex lo apruebe (crear el proyecto es una acción que él debe autorizar):
1. Crear el proyecto `phoenix-pruebas` en el plan gratis, en la misma organización y región que producción.
2. Aplicarle las migraciones del repo en orden (Claude puede hacerlo con la herramienta de Supabase).
3. Poner su URL y su clave publicable en las variables de la vista previa de Cloudflare (`PUBLIC_SUPABASE_URL` y la clave), no en el código.
4. Costumbre: toda migración nueva se prueba primero en `phoenix-pruebas`; si va bien, se aplica a producción.

### 6. Costumbre contra los cambios sin commit

Script nuevo: `tools/revisar-sin-commit.ps1` (solo **lee**; no hace commit, no borra, no cambia de rama ni permisos).

```powershell
powershell -ExecutionPolicy Bypass -File C:\dev\pes-liga-automatica\tools\revisar-sin-commit.ps1
```

- Recorre los 6 clones: `pes-liga-automatica`, `pes-rediseno`, `smash-soda-fork`, `phoenix-overlay` y las 2 copias de `D:\Frank\IA\CLAUDE`.
- Por cada uno dice: rama, cambios sin commit **reales**, cambios de **ruido** (logs de compilación, `build-*`, `.bak`, `.claude/`, `COMPILAR_PHOENIX.bat`), commits sin subir y la antigüedad del cambio más viejo.
- Verde = todo en orden; amarillo = hay algo pendiente de hoy; **rojo** = hay cambios reales de 1 día o más (sale con código 1).
- Opción `-Respaldar`: guarda una **foto** de los cambios en una rama **local** `respaldo/sin-commit-AAAA-MM-DD` usando `git stash create` (no toca la carpeta de trabajo ni la pila de stash, y no sube nada a GitHub).

**Costumbre:** cada hilo lo ejecuta **al empezar y al cerrar** cada avance. Si sale en rojo algo de otro hilo, no se toca: se avisa a ese hilo. Queda escrito en `CLAUDE.md` (web) y en `D:\Frank\IA\CLAUDE\CLAUDE.md`.

Estado al 21-oct-2026 16:30: ningún repo en rojo. `smash-soda-fork` tiene 13 archivos de ruido (logs de compilación de Link y carpetas `build-*`). **Sugerencia para el hilo de Link**: añadir `log_*.txt`, `build-mercado/`, `build-sync/` y `_mis_cambios/` a su `.gitignore`.

### 7. Paso a paso para repetir esta revisión (otra IA o persona)

1. **Ver qué repos son públicos**: `https://api.github.com/repos/Fralexito/<repo>` → campo `private`. Listar ramas con `/branches`.
2. **Copia espejo de cada repo** en una carpeta temporal (no en los clones de trabajo): `git clone --mirror https://github.com/Fralexito/<repo>.git`.
3. **Escanear todo el historial**: listar todos los objetos con `git rev-list --all --objects`, quedarse con los blobs (`git cat-file --batch-check`) y leerlos en lotes con `git cat-file --batch`, buscando con expresiones regulares los patrones del §2.1. Las claves JWT se decodifican (parte central en base64url) para ver su `role`: `anon` es pública, `service_role` sería una filtración grave.
4. **Datos personales y documentos**: `git grep` en la punta de cada rama (teléfonos, DNI, cuentas) y `git rev-list --all --objects | grep -iE "\.(pdf|docx|xlsx|csv|zip)$"`.
5. **Supabase**: `get_advisors` (seguridad y rendimiento) y después estas consultas en SQL, que los avisos no cubren: funciones `sistema_*` ejecutables por `anon`/`authenticated` (`has_function_privilege`), funciones SECURITY DEFINER sin `search_path`, tablas de `public` sin RLS, políticas de escritura con `true`, columnas que `authenticated` puede actualizar en `perfiles` (`information_schema.column_privileges`), buckets de Storage y las tablas de `private`.
6. Corregir lo que sea código **con migración** (`apply_migration` + archivo en `supabase/migrations/`). Comprobar después que lo que usa esas tablas sigue funcionando.
7. Lo que sea **ajuste de seguridad** (Auth, MFA, contraseñas filtradas) no lo toca Claude: se le dan los pasos a Fralex.

### 8. Errores y tropiezos de esta sesión (para no repetirlos)

| Tropiezo | Qué pasó | Solución |
|---|---|---|
| No hay Python | `python` en Windows abre la Microsoft Store | Usar `node` para los scripts |
| No hay `gh` en la consola Bash | No se podía consultar GitHub con la CLI | API pública de GitHub con `fetch` desde node |
| No hay gitleaks ni trufflehog | Sin escáner de secretos instalado (instalar = descargar, requiere permiso) | Script propio en node que lee todos los blobs del historial |
| La salida de `get_advisors` era enorme (195 KB) | No cabía en la conversación | Guardarla en archivo y resumirla con un script (agrupar por tipo de aviso) |
| **Choque de número de migración** | Otro hilo creó `140_ascuas_solo_gratis.sql` a la vez que se aplicaba `140_rls_tablas_private` | Se renumeró el archivo a `141_…` (en Supabase sigue registrada como `140_rls_tablas_private`). **Lección: justo antes de crear el archivo, volver a hacer `ls supabase/migrations` y `git fetch`; si dos hilos trabajan en la base a la vez, avisar al coordinador del número que se va a usar** |
| Acentos rotos en el script `.ps1` | Windows PowerShell 5.1 lee los `.ps1` sin BOM como ANSI | Guardar el `.ps1` en UTF-8 **con BOM** |
| `sed` no cambió la expresión del script | El escapado de `\.` y `|` entre bash y sed falló en silencio | Usar la herramienta de edición exacta y comprobar con `grep` después de cada cambio |
| `COMPILAR_PHOENIX.bat` salía como cambio «real» sin commit | Es un archivo que a propósito no se versiona | Añadido a la lista de ruido del script |

### 9. Qué se cambió (para replicarlo)
- Supabase: migración 141 (en remoto se llama `140_rls_tablas_private`; archivo `141_rls_tablas_private.sql`).
- `docs/bitacoras/BITACORA-21-OCT-2026-CUENTA-GENERAL.md` e `INFORME-REVISION-GENERAL-21-OCT-2026.md`: correo sustituido.
- `tools/revisar-sin-commit.ps1`: nuevo.
- `CLAUDE.md` (web) y `D:\Frank\IA\CLAUDE\CLAUDE.md`: costumbre del script.
- No se reescribió historial ni se cambió la visibilidad de ningún repo.

---

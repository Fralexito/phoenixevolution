# MAPA del proyecto (tu brújula)

## Flujo en una línea
Tú abres una página → `Layout.astro` pone cabecera/menú/pie → el archivo de la página (`src/pages/X.astro`) pone su contenido → su lógica (`src/js/pages/X.js`) habla con Supabase usando los cimientos (`src/js/core`) y las funciones (`src/js/features`).

```
src/
├─ layouts/Layout.astro      ← cabecera + ticker + menú + pie (UNA sola vez)
├─ components/               ← las piezas de ese layout (Header, Ticker, Sidebar, Footer)
├─ pages/                    ← CÓMO SE VE cada página (index, noticias, database, duelos, palmares, mercado)
├─ js/pages/                 ← QUÉ HACE cada página (mismo nombre que su página)
├─ js/features/              ← funciones reutilizables: login, perfil, campana, tarjeta de jugador…
├─ js/core/                  ← cimientos: conexión a Supabase, sesión, avisos, fechas  (casi nunca se toca)
├─ data/                     ← textos editables: noticias, palmarés, redes, ticker
└─ styles/                   ← colores y estilos (tokens.css = la paleta, un solo lugar)
```

## ¿Dónde toco para…?
| Quiero… | Edito… |
|---|---|
| Cambiar cabecera, menú o pie | `src/components/` |
| Ticker "Última hora" o redes | `src/data/site.js` |
| Añadir/cambiar una noticia | `src/data/noticias.js` |
| Premios del Palmarés | `src/data/palmares.js` |
| Un color o la fuente | `src/styles/tokens.css` |
| Agregar una sección al menú «Mi cuenta» (tras iniciar sesión) | `ACCOUNT_NAV` en `src/data/site.js` (1 línea) |
| Agregar una página pública al menú | `NAV` en `src/data/site.js` (1 línea) |
| Cambiar el límite de jugadores o los minutos de confirmación | `src/js/core/rules.js` **y** la BD (cada valor dice `[BD]`) |
| Probar que la BD sigue bien tras un cambio | pegar `supabase/tests/004_equipos_simulacion.sql` en el SQL Editor |
| Cómo se ve una página | `src/pages/<pagina>.astro` |
| Qué hace una página | `src/js/pages/<pagina>.js` |

## Reglas de oro (para que no se rompa)
1. La cabecera/menú/pie solo existen en `Layout.astro` y `components/`. Nunca se copian a otra página.
2. Los colores solo se definen en `tokens.css`.
3. Lo importante (seguridad, aceptar retos) vive en Supabase, no en el navegador. Así la futura app usa lo mismo.
4. Todo texto que viene de la base de datos pasa por `escapeHTML` antes de mostrarse.
5. Antes de subir cambios: `npm run build` y `npm test` deben terminar sin errores.

## Duelos v2 en una imagen
```
Formulario ──insert──► retos_matchmaking ──trigger──► notificaciones ──Realtime──► campana + holograma
                              ▲                                 ▲
Botones (aceptar, rechazar,   │ RPC (la BD valida TODO)         │ pg_cron cada minuto:
cancelar, finalizar,          │                                 │ recordatorio T-30, aviso T-15,
confirmar, publicar enlace) ──┘                                 └ cancela solo a T-10 si falta confirmar
Radar (Presence): solo muestra quién está libre/ocupado; es cosmético, no da permisos.
```
- Archivos: `src/pages/duelos.astro` (vista) y `src/js/pages/duelos.js` (orquestador, ~140 líneas). La lógica está partida en `src/js/features/duelos/`:
  `data.js` (leer datos) · `cards.js` (tarjetas, equipos y cupos) · `form.js` (formulario) · `actions.js` (llamadas a la BD) · `invite.js` (ventana para invitar).
  Aparte: `features/notifications.js` (campana), `features/holo.js` (holograma), `features/presence.js` (radar), `core/rules.js` (constantes que deben coincidir con la BD), `core/teams.js` y `core/schedule.js` (lógica pura con pruebas).
- Equipos: un reto es Equipo A (líder = retador) vs Equipo B (líder = quien acepta), máx. 8 jugadores. Los demás entran por invitación o por cupo libre (si el reto es público).
- La base de datos ya tiene todo aplicado (`supabase/migrations/003`, `003b` y `004`). **No los vuelvas a ejecutar.**


## Cambios de la ronda "borrador" (cabecera, ticker, estado)
- **Estado unificado en Duelos**: un solo selector `Inactivo · Activo · Radar` (`#seg-estado`). Cada nivel incluye al anterior:
  Inactivo = `perfiles.acepta_retos_azar=false` · Activo = `true` · Radar = Activo + Presence (solo en la sesión).
  Código: `src/js/pages/duelos.js` (`nivelActual`, `setNivel`, `applyRadar`, `paintEstado`).
- **Ticker "Última hora"**: se esconde al bajar y vuelve al subir. Lógica en `src/js/features/ticker.js`; el CSS solo alterna `data-oculto` (`layout.css`).
- **Cabecera**: el menú va pegado a la derecha (`ml-auto`), así que el logo expandido (solo ≥1360px con mouse) no lo mueve.
- **Redes**: `SOCIALS` en `src/data/site.js` (Discord y TikTok con enlace; Kick y YouTube pendientes). Íconos con trazo SVG propio en `SocialIcon.astro`.
- **Registro**: el campo se llama "Nombre de usuario / apodo". La clave interna sigue siendo `gamertag` porque así la lee el trigger `handle_new_user`.

## Ronda "identidad y Duelos compacto"
- **Identidad (perfiles)**: `username` = @ único elegido por la persona (verificación en vivo: `features/handleCheck.js`);
  `nombre_display` = apodo visible. El registro envía `usuario` y `apodo`; el trigger `handle_new_user` los guarda
  (migración `005_perfil_identidad.sql`, ya aplicada). Nombres reservados (admin, staff…) bloqueados en BD y en el cliente.
- **Avatares**: `core/avatar.js` es el ÚNICO lugar que dibuja un avatar. `avatar_url` puede ser foto https, `preset:<id>` (12 avatares
  propios, se añaden con una línea en `PRESETS`) o vacío (inicial). Al iniciar sesión, si el perfil no tiene foto se copia la de Discord/Google
  (`core/session.js → syncProviderAvatar`).
- **Controles**: `features/formControls.js` (interruptor y selector segmentado) para no repetir HTML. Perfil → pestaña "Sistema Host" los usa.
- **Duelos en 2 columnas**: formulario a la izquierda, "Mis partidos / Retos en el radar" a la derecha con pestañas. En móvil se alterna
  "Lanzar reto" / "Partidos" (`#seg-vista`). `duelos/#mis-partidos` abre directo esa pestaña.

## Ticker "Última hora" (velocidad y ancho)
- Velocidad en píxeles por segundo, no en segundos fijos: `VEL_PC` (110) y `VEL_MOVIL` (55) en `src/js/features/ticker.js`. Para cambiarla, edita esas dos constantes.
- El texto va repetido (mínimo 2 copias; el JS añade más si la pantalla es muy ancha) para que el bucle no deje huecos.
- La etiqueta "ÚLTIMA HORA" es más angosta en celular (`Ticker.astro`).

## Ronda 6 — Identidad con cooldown, bienvenida, Duelos sin pestañas, menú
- **@usuario**: solo cambia 1 vez cada 14 días. Regla real en la BD (`supabase/migrations/006_*`, trigger `perfiles_antes_de_actualizar`); la web solo avisa (`cooldownInfo` en `core/rules.js`). Mientras `perfil_completo = false` el @ se elige libre.
- **Bienvenida** (`features/welcome.js`): se muestra a quien tenga `perfil_completo = false` (Discord/Google y correo sin formulario). «Lo haré después» la oculta durante esa sesión del navegador. Comparte selector de foto con «Mi perfil» (`features/avatarPicker.js`). Países en `src/data/paises.js`.
- **Duelos**: sin pestañas. `#col-mis` (Mis partidos) y `#col-radar` (Retos en el radar) siempre visibles: lado a lado en ≥1280px, uno bajo otro en pantallas medianas, y en móvil dentro de la vista «Partidos».
- **Menú de 3 rayas**: en PC (≥1024px) solo existe con sesión (`html[data-sesion]`, regla en `components.css`) y solo muestra «Mi cuenta». En móvil queda el menú completo.
- **Login en localhost**: Supabase solo vuelve a URLs permitidas. Dashboard → Authentication → URL Configuration → Redirect URLs: añadir `http://localhost:4321/**` y `https://fralexito.github.io/phoenixevolution/**`. Si falta la de localhost, te manda al Site URL (la web publicada = `main`).

## Ronda 7 — Host nuevo + vista previa en internet
- **Sistema Host**: juego `PES 2021 | SP Football Life` (migración 007). Parche solo con PES 2021; con SP aparece «Versión (opcional)» 25/26/27/Otra (`host_sp_version`); velocidad en 5 grupos −50/100/300/500/+500 (`SPEED_BUCKETS`, valores antiguos se agrupan con `speedBucket`); nota libre `host_notas` (≤300).
- **Vista previa**: `.github/workflows/deploy.yml` publica `main` en `/phoenixevolution/` y `borrador` en `/phoenixevolution/borrador/` (con `noindex`). Requiere una vez: Settings → Environments → github-pages → Deployment branches → añadir `borrador`. Y en Supabase → Redirect URLs: `https://fralexito.github.io/phoenixevolution/borrador/**`.

## Ronda 8 — Ficha de jugador interactiva + Duelos móvil
- **Formulario de jugador** (`features/playerForm.js`): foto a la derecha del nombre, posición en botones, cada estadística con − / + (mantener pulsado repite), deslizador y número en color. **OVR** automático (promedio, `core/stats.js`); si lo mueves queda «Manual» hasta «Volver a automático». **Leyenda dinámica** fija arriba con la explicación breve de cada stat (`src/data/stats.js`, único lugar para editar los textos).
- **Duelos en móvil**: botones «Lanzar reto» y «Mis partidos» abren/cierran su sección (una a la vez, ninguna al entrar); «Retos en el radar» siempre visible debajo. PC sin cambios.

## Ronda 9 — Ficha en 2 columnas, descripción, comparador y pulso en vivo (demo)
- **Ficha de jugador**: stats en 2 columnas, botón «Ver completa» (lista de las 14 + OVR), frase opcional y **descripción** (`jugadores.descripcion`, migración 008, ≤600).
- **Comparador** (`features/compare.js`, cálculos en `core/compare.js`): en Jugadores, botón «Comparar» o la balanza de cada tarjeta (máx. 2). Radar superpuesto (escala 40–99), barras enfrentadas, resumen y textos.
- **Pulso en vivo** (`features/liveFeed.js`, `core/live.js`): mensajes sutiles abajo a la izquierda; botón «En vivo» para silenciar (se recuerda). Con `LIVE_DEMO = true` simula eventos con nombres ficticios (rotulados «demo», lista en `data/liveDemo.js`). Para conectar actividad real: disparar `window.dispatchEvent(new CustomEvent('live:evento', { detail: {...} }))` y poner `LIVE_DEMO = false`.

## Ronda 10 — Posiciones con color, comparador por equipos, ajustes de pulso y ticker
- **Posiciones** (`src/data/posiciones.js`, única fuente): 4 grupos con color (Portero amarillo, Defensa azul, Centrocampista verde, Delantero rojo; EI/ED cuentan como delanteros, como LWF/RWF en PES). Nombre completo al pasar el mouse o tocar (línea bajo los botones); el color también se usa en la insignia de la tarjeta y en el comparador.
- **Stats** más compactas (~60px por stat en vez de ~118px).
- **Comparador por equipos** (`features/compare.js` + `core/compare.js`): 2 a 8 jugadores en Equipo A / Equipo B (máx. 4 cada uno; 3 vs 2, 4 vs 3…), se compara el PROMEDIO de cada equipo (radar + barras). Vista «Todos»: tabla con cada jugador y el mejor valor subrayado.
- **Pulso en vivo**: en PC abajo a la derecha (móvil igual que antes). **Ticker**: más separación entre noticias y 40 px/s en celular.

## Ronda 11 — Menos carga visual
- **Posiciones**: solo las letras llevan color (el resto del botón/insignia es el estándar); sin mini leyenda.
- **Comparación 1 vs 1** (`features/compare.js`): vuelve el diseño de la ronda 9 (dos selectores, cabecera, resumen); radar / estadísticas / perfil van en pestañas para bajar menos. **Comparación masiva** (`features/compareMasivo.js`): botón aparte; resultado en mini secciones (Resumen · Radar · Estadísticas · Tabla), una abierta a la vez.
- **Última hora**: una noticia a la vez cruza la barra (75 px/s en PC, 32 en celular) y hay una pausa (2.5 s / 2 s) antes de la siguiente. Se pausa al pasar el mouse o tocar.

## Ronda 12 — Tarjetas con foto grande, buscador en comparadores, pulso con hora e historial
- **Tarjeta de jugador** (`features/playerCard.js`, usada en Jugadores y Destacados): foto grande arriba (5:4), OVR y posición sobre la foto; la insignia de posición vuelve a letra + recuadro del color del grupo. En el formulario de crear jugador solo las letras llevan color. Las fotos nuevas se guardan a 512 px (las antiguas de 256 px se verán algo borrosas hasta volver a subirlas).
- **Editar/borrar**: botón sutil «⋯» en la esquina de la foto (solo admin) que abre un mini menú.
- **Buscador por nombre** (`features/playerPicker.js`, `core/search.js`) en el comparador 1 vs 1 y en «Añadir jugador» de la masiva (sin acentos ni mayúsculas).
- **Pulso en vivo**: hasta 5 mensajes a la vez en PC (2 en móvil), cada uno con hora exacta HH:MM:SS, y botón «Historial» con las últimas 2 horas (máx. 200; se guarda en el navegador y sobrevive a cambiar de página). Silenciar solo oculta los mensajes; el historial se sigue llenando.

## Ronda 13 — Recortador de fotos de jugador
- Al elegir una foto se abre el **recortador** (`features/photoCropper.js`, geometría pura en `core/crop.js`): arrastrar para mover, rueda / deslizador / botones / pellizco para el zoom, flechas del teclado, «Ajustar» para volver al encuadre inicial. La imagen siempre cubre el marco (sin huecos). **Vista previa** = la tarjeta real con el mismo encuadre. Esc o «Cancelar» cierran solo el recortador.
- Se guarda un JPEG 5:4 (hasta 800×640) recortado de la imagen ORIGINAL, igual que la foto de la tarjeta. «Reencuadrar» reabre el recortador (con la foto recién elegida o descargando la ya guardada).

## Ronda 14 — Foto por detrás de la tarjeta + 2 tarjetas por fila en celular
- **La tarjeta no cambia de tamaño.** La foto es ahora una capa detrás de todo el contenido (`playerCard.js`). El recortador ofrece el largo: **Normal 5:4** (solo la zona superior), **Media 1:1** (llega al nombre) y **Larga 4:5** (por defecto en fotos nuevas: baja hasta las estadísticas, con degradado para que se lean). Marco y vista previa usan exactamente esa proporción.
- Se guarda en `jugadores.foto_aspecto` (migración `009`); las fotos antiguas quedan en Normal. «Reencuadrar» recuerda la elección.
- **Celular**: 2 tarjetas por fila (Jugadores y Destacados), tipografía y márgenes compactos, frase oculta en móvil. PC sin cambios de tamaño.

## Ronda 15 — Zoom, apodo, un solo «Comparar», ticker continuo, leyenda
- **Zoom de tarjetas** (`core/density.js` + `pages/database.js`): el control −/+ elige el TAMAÑO de tarjeta (ancho mínimo); la cuadrícula `auto-fill` decide sola cuántas caben y las reparte parejas, así que se adapta a cualquier pantalla o giro. Celular 4 tamaños (hasta ~4 por fila), PC 8 (hasta ~10 por fila). − aleja (caben más), + acerca. También Ctrl + rueda sobre la lista en PC. Se recuerda por tipo de pantalla. La tarjeta escala sola con container queries (`components.css`).
- **Apodo** (`jugadores.apodo`, migración `010`, máx. 24): campo opcional, aparece junto al nombre y la búsqueda lo encuentra.
- **Comparar**: un solo botón; abre 1 vs 1 con la mini opción «Masiva»; en la masiva hay «1 vs 1» para volver. Con 3+ marcados abre directo la masiva.
- **Última hora**: flujo continuo con hueco mínimo (90 px PC / 56 px celular); pueden coincidir varias.
- **Leyenda de stats** (ⓘ sutil sobre la lista) · **Duelos** con más margen lateral.

## Ronda 16 — Búsqueda avanzada, físico, pulso movible
- **Búsqueda avanzada** (botón «Avanzada», `features/advancedSearch.js` + `core/ranking.js`): eliges una o varias stats (o la media) y la lista se reordena al instante por el **promedio de las elegidas** (puesto #1, #2…; empates comparten puesto). «Mínimo en cada stat» exige que todas lleguen a ese valor; «Top 3/5/10/Todos». Respeta el filtro de equipo y el buscador. Cada tarjeta muestra bajo ella los valores de las stats elegidas.
- **Físico opcional** (migración `011`: `altura_cm` 120–230, `peso_kg` 35–160, `pie` Derecho/Izquierdo): campos en el formulario; se ven en la tarjeta cuando hay ancho suficiente.
- **Pulso en vivo movible** (`core/dock.js`, `features/liveDock.js`): asa ⋮⋮ para arrastrarlo a cualquier parte; doble clic o Esc lo restablece; flechas del teclado lo mueven. Se pega al lado más cercano (así se adapta al girar/redimensionar), los mensajes e historial crecen hacia el lado con más espacio, y se recuerda en el navegador.

## Ronda 17 — Parche/versión en el pulso, búsqueda avanzada compacta
- **Pulso en vivo**: el juego se muestra como «PES 21 (Dream Patch)» o «SP Football Life 26» (`etiquetaJuego` en `core/rules.js`; el evento lleva `juego` + `parche`/`version`). Sin parche o versión, solo el nombre del juego.
- **Sistema host**: el parche de PES 2021 se elige entre Dream Patch, Conmebol Patch, VirtuaRED, Sudamerican Patch y Gogosz Patch (`PARCHES_PES`), o «Otro» para escribirlo a mano; tocar el elegido lo quita.
- **Búsqueda avanzada** más compacta (chips pequeños, mínimo y Top en una sola fila, ancho máximo en PC).
- **Físico más visible** (el peso se retiró después: nadie debe sentirse obligado a darlo): altura y pie dominante se muestran como chips cian entre el nombre y las stats (`pc-fis` / `pc-chip` en `playerCard.js`), solo con lo que exista y ocultos únicamente en tarjetas diminutas. Las tarjetas de una misma fila ahora tienen la misma altura.

## Ronda 18 — Central reorganizada (EXPERIMENTO)
- **Volver a la versión anterior de Central**: está respaldada en la rama `central-base-v1` (estado exacto antes del experimento). Para restaurarla basta con traer `src/pages/index.astro`, `src/js/pages/central.js` y los estilos «Central» de `components.css` de esa rama.
- Orden nuevo: portada única compacta (botones según sesión) → **pulso de la comunidad** (4 conteos reales: fichas, jugadores registrados, hosts, retos abiertos; `—` si falla la lectura) → **Central de Partidos** con el Partido Destacado dentro y pestañas Próximos/Resultados + Posiciones y XI al costado (XI plegado en celular) → Jugadores destacados (carrusel en celular) → Highlights compacto sin imágenes externas → invitación a Discord.
- Lógica pura en `core/central.js` (`cifra`, `partirPartidos`). Partidos, tabla, XI y partido destacado siguen siendo datos demo (`data/demo.js`).
- Efecto: página de celular ~2.750 px frente a ~4.100 px.
- **Ajustes de la Ronda 18**: la portada recupera la foto del espacio exterior que se acerca despacio al pasar el mouse. Los botones son dos y el principal depende de la sesión (sin cuenta: «Crear cuenta»; con cuenta: «Sala de Duelos»); «Jugadores» se quitó porque ya está en el menú. Highlights vuelve a tamaño grande (16:9) con zoom al pasar el mouse, más una lista «Más clips» al costado (`DEMO_CLIPS` en `data/demo.js`; debajo en celular).
- **Banner de liga** (`data/ligas.js`): vuelve «Competición activa · GALAXY LEAGUE · Pro Evolution Soccer» con la foto del espacio y su zoom. Para no competir con la portada, esta pasó a hablar de la plataforma («PHOENIX EVOLUTION SERIES», sin foto) y el banner presenta la liga. Para sumar una liga nueva se agrega un objeto a `LIGAS` (estado `activa` o `proxima`, título, juego, botones); con 1 liga el banner ocupa todo el ancho, con varias la primera es grande y el resto comparte la fila. Pendiente a futuro: que Central de Partidos/Posiciones se filtren por liga.

## Ronda 19 — Editor de stats y portada única

**Editor de stats (`features/playerForm.js`, `core/stats.js`)**
- Cada valor se puede escribir a mano (solo dígitos, 1–99), con flechas ↑/↓ (±1) y Enter para confirmar.
- Escribir la **media (OVR)** reparte las stats con `distribuirMedia`: parte de la "forma" guardada (diferencias entre stats) y desplaza todo por igual hasta que el promedio sea exacto. Así subir y bajar la media no deforma al jugador.
- Botón **Al azar** (`aleatorias`): genera stats con ruido de ±10 alrededor de la media, y la media final queda exacta. Cada clic da una combinación nueva.

**Portada (`pages/index.astro`)**
- Hero y banner de liga se fusionaron en UNO: la primera liga de `data/ligas.js` es la portada (foto del espacio con zoom al pasar el mouse).
- Las demás ligas, cuando existan, salen como tarjetas compactas en "Otras competiciones".
- Botones: sin sesión → Crear cuenta + Sala de Duelos; con sesión → Sala de Duelos + Partidos y posiciones.
- Para volver a la base anterior: rama `central-base-v1`.

## Ronda 20 — Podio de destacados
- `core/central.js` → `ordenPodio` (2.º | 1.º | 3.º, sin huecos si hay menos de 3). Probado en `tests/pure.test.mjs`.
- `pages/central.js` pinta cada carta dentro de `.podio-slot` (sin números de puesto visibles; `data-puesto` y el `aria-label` los conservan). Mouse: agranda por CSS (`:hover`). Toque/Enter: alterna `.podio-up` (una sola carta agrandada; tocar fuera la baja).
- Tamaño: cartas de ≈15,5 rem (como «Jugadores»). `.podio-slot` queda quieto (recibe el mouse) y `.podio-in` hace el zoom: 1.º `--z1:1.1`, 2.º `--z2:1.075`, 3.º `--z3:1.05` en 1,6 s con curva pareja (`cubic-bezier(.45,0,.55,1)`). Borde de color fijo (`--glow`): 1.º dorado, 2.º cian, 3.º magenta, sin destello. Celular: 1.07/1.055/1.04, tres a todo el ancho.
## Ronda 21 — Página Liga
- `pages/liga.astro` (data-driven con `data/ligas.js`): portada de la liga, cómo funciona, ficha (campos vacíos → «Por definir»), parches reconocidos (`PARCHES_PES`). Botón «Fixture y tabla en CopaFácil» aparece solo si `copafacil` tiene enlace. NAV: nueva entrada «Liga».
- CopaFácil sigue siendo la fuente oficial; sin API pública confirmada no hay conexión automática. Siguiente fase posible: tablas reales en Supabase (espejo).

## Ronda 22 — Resultados de la liga (espejo, base)
- `data/ligaResultados.js`: clubes y resultados fecha por fecha copiados de CopaFácil (fechas 1 a 9 cargadas; partidos sin jugar = gl/gv null). `core/tabla.js` → `calcularTabla` (3-1-0; desempate: enfrentamiento directo entre los empatados (puntos → dif. → goles, recursivo) → dif. de goles total → goles a favor → nombre). Verificado fila por fila contra la tabla real de CopaFácil (test «coincide fila por fila»). Aún no se muestra en la web.

## Ronda 23 — Página Liga completa con historial
- Datos: `data/ligaResultados.js` → `EDICIONES[idLiga]` = lista de ediciones (`id, nombre, estado 'en_curso'|'finalizada', campeon, fase, formato, participantes, clubes, fechas, aviso`). Para archivar una edición: `estado:'finalizada'` + `campeon`; para abrir otra: agregar un objeto (idealmente en su propio archivo de fechas).
- Cálculo (puro, probado): `core/tabla.js` (tabla + desempate directo, igual a CopaFácil) y `core/ligaStats.js` (`resumenFecha/Edicion`, `estadoFecha`, `fechaActual`, `forma`, `mayoresGoleadas`, `ranking`).
- (Central vuelve a su portada original de la base «EL CIRCO MÁXIMO…»; la ficha de cada liga vive solo en Liga, y Central muestra tarjetas de ligas solo si hay más de una.)
- Liga en PC: tabla (izquierda) y resultados por fecha (derecha, fija al hacer scroll) en la misma fila; las columnas de la tabla se adaptan al ancho (GF/GC desde 2xl, Forma desde xl). En celular van una debajo de otra.
- `pages/liga.astro` pinta todo al construir: cifras, tabla con forma (últimos 5), mejor ataque/defensa, mayores goleadas, resultados por fecha, historial de ediciones, cómo funciona, ficha y parches. `js/pages/liga.js` solo cambia de edición (select) y de fecha.
- Cada resultado nuevo = agregar/editar el partido en `FECHAS` (gl/gv null = sin jugar). Mantener la prueba «coincide fila por fila con CopaFácil» actualizada con la tabla real del momento.

## Ronda 24 — Noticias (BD + editor + Discord)
- Tabla `noticias` (migración 012) con RLS: lectura pública de publicadas, escritura solo admin. Bucket `noticias` para portadas.
- `core/noticias.js` (lógica pura), `core/cronica.js` (crónica automática por plantillas), `features/noticiasAdmin.js` (editor), `pages/noticias.js` (página; si la BD falla usa `data/noticias.js`).
- Enlace por noticia: `noticias/?n=<slug>`. Filtro de liga aparece con 2+ ligas en las noticias.
- Edge function `notificar-discord` (solo admin); requiere el secreto `DISCORD_WEBHOOK_URL` en Supabase.

## Ronda 25 — Perfil público de jugador (experimento)
- Rama `base-v2`: copia de seguridad del estado anterior a esta ronda.
- Página `jugador/?id=<id>` (`pages/jugador.js`): carta, datos y campaña en cada edición de liga donde aparece (puesto, KPIs, resultados, próximos, contra cada rival). Lógica pura en `core/perfil.js` (tests).
- El jugador se vincula con la liga por nombre/apodo (sin tildes ni mayúsculas).
- Botón «Ver perfil» (icono de carnet) en cada carta de Jugadores. Títulos: pendiente hasta que Palmarés tenga datos reales.
- Perfil ampliado (migración 013): `biografia`, `ciudad`, `miembro_desde`, `estilo_juego`, `logros` (uno por línea) y `redes` (jsonb). Se editan en la ficha (sección plegable «Perfil público», solo admin). Redes validadas en `core/perfil.js` (solo usuario o https://; Discord se muestra como texto).
- Análisis de juego en el perfil (botón «Ver análisis de juego»): mapa de calor aproximado, radar de estilo + fortalezas/a mejorar y rendimiento real de liga (puntos acumulados). Lógica pura en `core/estilo.js` y `core/perfil.js`. El mapa y el radar son APROXIMADOS (posición + stats), no seguimiento real.
- Botón «Editar ficha» dentro del perfil (solo admin): abre el mismo formulario de Jugadores y recarga el perfil al guardar.

## Ronda 26 — Jugadores: que nadie quede abajo (experimento)
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

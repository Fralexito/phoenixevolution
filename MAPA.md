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

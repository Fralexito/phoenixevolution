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
| Cambiar el límite de jugadores o los minutos de confirmación | `src/js/core/sistema/rules.js` **y** la BD (cada valor dice `[BD]`) |
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
  Aparte: `features/notifications.js` (campana), `features/holo.js` (holograma), `features/presence.js` (radar), `core/sistema/rules.js` (constantes que deben coincidir con la BD), `core/competicion/teams.js` y `core/competicion/schedule.js` (lógica pura con pruebas).
- Equipos: un reto es Equipo A (líder = retador) vs Equipo B (líder = quien acepta), máx. 8 jugadores. Los demás entran por invitación o por cupo libre (si el reto es público).
- La base de datos ya tiene todo aplicado (`supabase/migrations/003`, `003b` y `004`). **No los vuelvas a ejecutar.**


### Ronda 349 — Noticias como un diario con departamentos (FX.diario)
- Fralex: la página de noticias no le gustaba, se bajaba mucho y quedaban huecos; quería algo divertido tipo diario deportivo, con departamentos como una redacción de verdad, orden impredecible y la portada del día descargable para los grupos. Boceto aprobado antes de construir.
- **Departamentos (`core/portada/departamentos.js`)**: 24 secciones con su color, firma, voz y de qué parte de la web se alimentan (La Crónica, El Analista, La Mesa, La Previa, En Vivo, Duelos, Mercado, El Club, El Vestuario, La Escuela, Competiciones, Sudario, La Agenda, La Vitrina, La Plaza, Clanes, La Cabina, La Tribuna, Dirección, Tribunal, El Taller, La Tienda, El Archivo, Sala de Máquinas, Hosting, Organizadores). `departamentoDe()` lo detecta solo por etiqueta/título/liga; una noticia puede traer su `departamento` fijo. Los filtros de arriba ahora son departamentos.
- **Orden del día (`core/portada/diario.js`)**: la portada se baraja cada día con semilla de la fecha (mismo día = mismo orden para todos) y cumple 5 reglas: manda lo más fuerte del día · la joda siempre después de lo serio · nada repetido al lado · lo urgente (Tribunal/En vivo) nunca enterrado · si el staff acomodó a mano (orden manual), su orden manda y el azar no lo toca.
- **Afiche del día (`core/portada/afiche.js` + `features/noticias/afiche.js`)**: portada tipo diario deportivo dibujada sola con la noticia principal (antetítulo, grito corto con una palabra resaltada, marcador, inicial del protagonista, dos titulares más y la web impresa). Un color por día (6 rotan) salvo Tribunal (rojo), Tribuna (naranja) y Dirección (blanco). Se descarga como PNG dibujado en canvas (3:4 para el grupo y 9:16 para el estado) y usa `navigator.share` en celular si existe.
- **Portada corta a propósito (`features/noticias/diario.js` + `styles/diario.css`)**: una pantalla con afiche + primera plana + «Lo último», y otra con «Lo demás del día» (6 tarjetas parejas y «Ver más») y la banda de la Zona de joda. Sin huecos: el titular del afiche se agranda según el largo de la línea.
- Se conserva TODO lo de antes: Acomodar (GridStack), el catálogo de diseños, el lienzo libre y el editor. Si hay lienzo guardado, manda el lienzo. Se apaga con `FX.diario = false`.
- OJO: dentro del afiche se anula `main[data-sia] h2` (ponía los títulos en fila y partía el titular).
- Probado en PC y celular con la vista previa construida (sin desbordes) y descargando las dos portadas. Pruebas 565 OK, build 53 páginas.

### Ronda 350 — Galaxy League: la tabla de la Fase 1 ya coincide con la tabla oficial que mandó Fralex
- Fralex mandó una foto de cómo debe quedar la tabla de la Galaxy League (puntos, partidos ganados/empatados/perdidos, goles y diferencia) y pidió que la página quede exactamente así, calculando qué resultados lo explican (él no lleva el conteo oficial).
- Encontré los cambios que hacían falta: 4 partidos que se dieron por jugados en realidad se anulan (no suman nada) y 6 partidos pendientes en realidad fueron empates 0-0. Aplicado primero en Supabase (`liga_partidos`, tabla real que valida el staff) y luego reflejado en `src/data/ligaResultados.js` (la web construye la tabla desde este archivo; Supabase solo la actualiza EN VIVO si el partido ya existe ahí con el mismo nombre).
- De paso quedó al día el cambio de nombre **Roberto → Maurisgame** (pedido en una sesión anterior) en este mismo archivo: no se había copiado todavía y sin eso la tabla en vivo no iba a casar los nombres.
- Verificado corriendo la función real de la tabla (`core/competicion/tabla.js`) contra el archivo editado: puntos, ganados, empatados, perdidos, goles a favor/contra y diferencia quedan IGUAL a la foto de Fralex, en los 12 equipos.
- Única diferencia que queda: la columna «partidos jugados (J)» no calza para 3 equipos (Degox, Maurisgame, Jeremi) porque la foto original ya tenía ese número inconsistente con sus propios G+E+P — no es algo que este cambio rompió, es un dato que ya venía raro en la imagen.

## Historial antiguo
- Los cambios iniciales y las rondas 6 a 250 se archivaron en **`docs/bitacoras/HISTORIA-WEB.md («MAPA-HISTORIAL»)`** (ronda 295). Aquí quedan la ronda 251 en adelante y «RETOMAR».

### Ronda 251 — «Mi perfil»: menos scroll, Sistema Host plegable y Phoenix Link explicado (FX.perfilNuevo)
- Fralex: la «biografía táctica» no se entendía; Sistema Host mareaba (muchas opciones de primera y mucho scroll); Phoenix Soda ahora se llama **Phoenix Link** y no se entendía cómo funciona; pidió más dinamismo y 3D sin exagerar.
- `NOMBRE_APP` = «Phoenix Link» (site.js) + textos fijos en moderación, portada y misSalas.
- Social: «Biografía» con explicación y ejemplo (mismo campo `bio`).
- Sistema Host: si «Puedo ser host» está apagado, no se muestra nada más; encendido, 2 tarjetas plegables (Tu conexión · Qué hosteas) con resumen («500 Mbps · Ambos»), solo una abierta a la vez (`<details name>`).
- Phoenix Link (`salas/vincularPC.js`, opción `pasos`): 3 pasos en tarjetas (Instala · Genera tu código · Escríbelo en la app) y «Tus PCs»; si ya hay PCs, salen primero y los pasos quedan en «Vincular otra PC». La página /mis-salas/ sigue con la vista de antes.
- Fuera de Identidad, la tarjeta de foto se achica a una línea. Movimiento: pestaña nueva y lo que se despliega llegan con un giro 3D corto; tarjetas se levantan un poco al pasar el mouse. Arreglo: en celular nada se sale por el costado.
- Probado con sesión y perfil de host simulados (PC y celular). Pruebas 443. Build 45.

### Ronda 252 — «Jugadores» casi principal + carruseles (FX.carruseles)
- Fralex: la zona de jugadores (cartas y estadísticas) es de lo más relevante; pidió hacerla fácil de encontrar y más carruseles. «Hazlo todo».
- Menú: «Jugadores» con botón propio (Competiciones · Jugadores · Jugar · Comunidad); sale de «Estadísticas». Barra lateral: Jugadores en el bloque Competiciones.
- Portada: sección **Cartas de la Galaxy** justo bajo las 4 ventanas: carrusel 3D (la carta del centro de frente, las de los costados giran; ligado al desplazamiento de la fila, nada se mueve solo), las 16 de mayor media, toque → perfil del jugador, botón «Ver todas las cartas». Reemplaza «Jugadores destacados» (oculto con la bandera; el ancla «Jugadores» apunta a la nueva sección). `js/pages/central.js` → `renderCartas`.
- Componente nuevo `js/features/carruseles.js` + `styles/carruseles.css` (`[data-carrusel]`, `="3d"` para la versión con giro): flechas, dedo, arrastre con mouse, teclas ← →, bordes que se desvanecen; se monta solo también en listas que se pintan después. OJO: `features/carrusel.js` (con avance automático) es OTRO componente y sigue igual.
- Carruseles también en **Creadores** (`#cr-lista`) y en **Resultados** del perfil de jugador. No se puso en Palmarés (solo 3 trofeos) ni en Noticias (choca con «Acomodar»).
- ARREGLO IMPORTANTE (afecta a toda la web): lightningcss fundía `animation` + `animation-timeline: view()` en un shorthand inválido y TODAS las animaciones ligadas al scroll se perdían en producción (salida 3D de prof3d, alejarse de las ventanas, etc.). `tools/movimiento-postcss.mjs` ahora envuelve el valor en `var(--pes-tl, …)` (`protegerTimeline`, con prueba).
- Pruebas 444. Build 45.

### Ronda 253 — La portada vuelve al podio de 3; el carrusel pasa a Jugadores
- Fralex: le gustaba más la portada de antes (solo los 3 mejores/destacados). El carrusel le sirve como otra forma de ver las cartas dentro de Jugadores.
- Portada: vuelve «Jugadores destacados» (podio de 3). «Cartas de la Galaxy» queda tras `FX.cartasPortada` = false.
- Jugadores (`database.astro`/`database.js`): 4.ª vista **Carrusel** junto a Todos · Por estilo · Por nivel; usa el «Ordenar por» elegido y los filtros; toca una carta → su perfil. En modo Avanzada se ve la cuadrícula de siempre.
- Se mantiene: botón «Jugadores» en el menú, carruseles de Creadores y del perfil, arreglo de animaciones de scroll. Pruebas 444. Build 45.

### Ronda 254 — Carrusel recto y efectos sutiles en las cartas
- Fralex: no le gustó la inclinación de las cartas del carrusel; el reflejo al pasar el mouse aburría (siempre igual); pidió más sutil u otras opciones de efecto, sutiles.
- Carrusel (`styles/carruseles.css`): cartas rectas; las de los costados solo se achican un poco y se apagan.
- Efectos (`styles/cartasEfecto.css`, `js/features/cartasEfecto.js`): misma capa `.pc-sheen` con 4 efectos sutiles: Reflejo suave (más tenue y lento), Luz que sigue al mouse, Borde que se enciende (color del nivel), Tornasol. Ajuste nuevo **Ajustes → Jugadores y cartas → «Efecto al pasar el mouse»** (`cartasEfecto`, reemplaza el interruptor «Brillo»): Sorpresa (por defecto: cada jugador su efecto fijo, `efectoDe` en playerCard.js según su id) · uno de los 4 · Ninguno.
- Pruebas 444. Build 45.

### Ronda 255 — Toque premium en las páginas que faltaban (FX.premium) + «Ligas» vuelve a la vista en tarjetas
- Fralex: «aplica tu toque premium al resto de páginas que faltan (no a las que están super bien)». Auditoría con capturas de 29 páginas: las de cabecera grande (Competiciones, Formatos, Historial, Torneos, Quiénes somos, Temporada, Divisiones, Palmarés, Noticias) ya estaban bien; las de cuenta/comunidad tenían cabecera chica y un aviso gris de «Inicia sesión».
- `styles/premium.css` (html[data-fx-premium], sin tocar el HTML de cada página): toda `main header.glass-panel` con h1 → más aire, título grande, ícono en placa con luz, línea de acento arriba, brillo suave del color del tema (sale de --color-galaxy-*, vale para Sudario). Afecta a ~20 páginas (Amigos, Mensajes, Buscar, Guardados, Logros, Clanes, Eventos, Creadores, Chat general, Tienda, Ranking, Ahora mismo, Salas en vivo, Phoenix Link, Phoenix Sync, Mi club…).
- `js/features/premium.js`: los paneles cuyo único texto es «Inicia sesión para…» pasan a tarjeta con candado + Entrar / Crear cuenta (abre el modal de acceso); se rearma si la página reescribe el aviso.
- Fralex preguntó dónde quedó «Ligas activas en cuadrados» (página /competiciones/): en el menú, «Ligas» ahora abre esa vista en tarjetas (`competiciones>liga`).
- Pruebas 444. Build 45.

### Ronda 256 — Menos scroll y más orden en las páginas que faltaban (FX.ordenado)
- Fralex (/taste): reorganizar las secciones que faltan, priorizando el menor scroll posible, orden visual y dinamismo.
- Se midió el alto de 29 páginas (en pantallas). Las largas eran Quiénes somos, Temporada, Divisiones Sudario, Formatos, Ligas, Historial, Palmarés y Noticias.
- `styles/ordenado.css`: cabeceras grandes centradas (Ligas, Formatos, Historial, Torneos, Quiénes somos) más bajas y alineadas a la izquierda; `.desliza-movil` = en celular las filas de tarjetas se deslizan de lado (Quiénes somos: pilares y personas; Temporada y Divisiones: «Cómo funciona»; Formatos: retos de hoy); «Más competiciones» pasa de bloque de 300 px a franja; Historial en 2 columnas en PC.
- /competiciones/ se titula **Ligas activas** (igual que en el menú).
- Resultado (pantallas de alto): Quiénes somos en celular 3,7 → 2,2; Ligas en PC 1,2 → 0,9; Historial en PC ≈ mitad de alto de lista. Las páginas con sesión (Tienda, Clanes, Amigos…) no se pudieron medir con datos reales desde aquí.
- Pruebas 444. Build 45.

### Ronda 257 — «Ligas» y «Ligas activas» por separado
- Fralex: no quería que «Ligas» y «Ligas activas» fueran lo mismo. Ahora son dos entradas en Competiciones › Compite: **Ligas** (`liga/`, tabla, fechas y resultados) y **Ligas activas** (`competiciones/`, todas las ligas en tarjetas). Cada una se ilumina sola en las pestañas. El bloque queda con 6 entradas (cuadrícula pareja, sin huecos).
- Pruebas 444. Build 45.

### Ronda 258 — El «marco» de todas las páginas (FX.marco)
- Fralex: mejorar la distribución general; la barra izquierda, la Red de enlaces y los botones Historial/En vivo NO se quitan ni cambian: solo se mejoran y redistribuyen.
- `styles/marco.css` + `js/features/marco.js`: (A) mismo ancho en todas las páginas (80rem, como Inicio); (B) barra izquierda sin huecos entre grupos cuando está cerrada, ícono que reacciona, se oculta el bloque Amigos si está vacío, sube cuando el ticker se esconde; (C) ticker 2,25rem y, además de esconderse al bajar (ya existía, ticker.js), vuelve en cuanto subes un poco (`data-cab-compacta`); (D) Historial + En vivo en una cápsula de vidrio; (E) pie: aviso legal plegado («Aviso legal y marcas»), 11 px → 12 px; (F) Red de enlaces: cuadros más bajos, en grupos de 2 columnas ícono al lado del texto, texto mínimo 12 px.
- Pruebas 444. Build 45.

### Ronda 259 — Sala de Duelos sin tanto scroll y más premium (FX.duelosPro)
- Fralex: la distribución y el diseño de Duelos le gustan, pero hay mucho scroll; será de las secciones más usadas, quiere que se sienta premium.
- `js/features/duelosPro.js` (lo llama `pages/duelos.js`) + `styles/duelosPro.css`: «En el radar» y «Que lanzaste» pasan a pestañas cápsula con contador (copian `cnt-radar`/`cnt-pend`), en la misma fila que «Alquilar host» y «Actualizar»; al emitir un reto se abre «Que lanzaste» (evento `duelos:creado`). PC ancha: tarjetas de reto de a dos. PC: el formulario «Lanzar reto» queda pegado a la vista (sticky, se ajusta cuando el ticker se esconde). Celular: los retos se deslizan de lado. Cabecera con acabado premium y brillo en «Emitir reto».
- Medido con 5 retos de prueba: PC ≈ 1,6 pantallas (antes las dos listas apiladas); celular 2,7 → 1,05 pantallas.
- Pruebas 444. Build 45.

### Ronda 260 — Formulario «Lanzar reto» más simple, sin perder opciones (FX.duelosPro)
- Fralex: ¿se puede hacer más simple sin perder funcionalidad y más premium? «Haz lo que mejor consideres».
- `js/features/formRetoSimple.js` (lo llama duelosPro.js) + sección 6 de `styles/duelosPro.css`. La lógica de `features/duelos/form.js` no cambia:
  - Tamaño en una fila «1v1 · 2v2 · 3v3 · 4v4 · Otro» (chip 1v1 nuevo; «Personalizar» → «Otro»); contadores A/B, «Total…» solo con «Otro» (o si el tamaño ya es personalizado); «Volver a 1v1» sobra (lo hace el chip 1v1).
  - «Detalles de la sala» plegado en una línea («Yo tengo host · Parsec · Sin espectadores») con [Cambiar] / [Listo].
  - El resumen va como segunda línea del botón «Emitir reto» (boleto); ayuda de «¿Cuándo?» solo si no es «Ya».
- Alto del formulario: ~640 px → ~417 px. Pruebas 444. Build 45.

### Ronda 261 — «Lanzar reto» siempre empieza plegado
- Fralex: mejor que el formulario esté siempre replegado y se despliegue solo cuando se quiera emitir un reto.
- `duelosPro.js`: en PC `#duelos-grid` arranca con `data-plegado` (ignora lo recordado en el navegador) → se ve el botón grande «Lanzar reto» y las listas a todo el ancho; al tocarlo se abre el formulario; tras emitir (`duelos:creado`) se vuelve a plegar. En celular ya era así. Botón con brillo al pasar el mouse y entrada suave del formulario (`duelosPro.css` §7).
- Pruebas 444. Build 45.

### Ronda 262 — Duelos: la cabecera aprovecha el espacio
- Fralex: sobraba espacio arriba (racha, cabecera y botón «Lanzar reto» en tres filas). Las pestañas En el radar / Que lanzaste se quedan igual.
- `duelosPro.js`: mueve `#racha-diaria` dentro de la cabecera (píldora bajo la descripción), `#btn-abrir-form` bajo «Tu estado» (PC, solo con el formulario plegado) y `#seg-vista` (celular) también a la cabecera. `duelosPro.css` §8: estilos de la píldora y de los botones. Se ahorran dos filas completas.
- Pruebas 444. Build 45.

### Ronda 263 — Jugadores con una sola barra de herramientas (FX.jugadoresBarra)
- Fralex: «hazlo, lo revertiré si no me gusta». Antes de la primera carta había 5 bloques de controles.
- `js/features/jugadoresBarra.js` (lo llama `pages/database.js`) mueve los MISMOS controles (mismos ids, misma lógica): cabecera = título · Comparar · buscador; barra cápsula = vista (Todos/Estilo/Nivel/Carrusel) · Ordenar · Equipo · **Filtros** (Liga/Torneo/Temporada, panel que se abre bajo la barra y se cierra al tocar fuera) · Avanzada · Leyenda · Tamaño. En PC cabe en una línea («Ordenar por», «Predeterminado» y «Leyenda» como ícono/selector). Reconocimientos se queda debajo.
- `styles/jugadoresBarra.css`. Revertir: `FX.jugadoresBarra = false`.
- Pruebas 444. Build 45.

### Ronda 264 — Jugadores «pro» (FX.jugadoresPro, encima de jugadoresBarra)
- Fralex: «corrige todito eso, el mejor trabajo profesional y premium».
- (1) La barra de herramientas se queda pegada arriba al bajar en PC (sube cuando el ticker se esconde; en celular no, taparía las cartas). (2) Cartas sin foto: iniciales con el color de la posición + escudo del club grande y tenue (`playerCard.js` → `sinFotoHTML`, vale en toda la web). (3) Reconocimientos con el nombre del premio («De la fecha: Beto», «En forma», «Revelación», «De la semana: vota tú»). (4) Cabecera en una línea con «N jugadores» (cuenta lo que se ve). (5) Botones comparar/perfil de la carta aparecen al pasar el mouse (si está marcada, se quedan). (6) Celular: Comparar como ícono junto al buscador, barra deslizable, título de Reconocimientos como ícono.
- `styles/jugadoresBarra.css` (sección ronda 264), `features/jugadoresBarra.js`, `features/reconocimientos.js`. Revertir: `FX.jugadoresPro = false` (o también `jugadoresBarra`).
- Pruebas 444. Build 45.

## Ronda 265 — Sección propia «Premios» (FX.premios)
- Pedido de Fralex: los reconocimientos eran pocos y genéricos; muchos y concretos, en sección propia.
- `core/competicion/premios.js` (+6 tests): premios calculados solos con los resultados. De la fecha: La Paliza, Pichichi de la fecha, Matagigantes, Partidazo. De la edición (mín. 3 partidos): El que manda, El Cañonero, La Muralla, En llamas, Imparable, El Cerrojo, Dominante, Rey del Empate, Revelación, Goleada histórica, El partido del año. Sin datos suficientes, no sale el premio.
- Página `/premios/` (`pages/premios.astro`, `js/pages/premios.js`, `styles/premios.css`): trofeos con el color de cada premio, el primero de la fecha en grande, pestañas por liga, voto «MVP de la afición» al costado (`montarVotoSemana`).
- Menú: «Jugadores» ahora tiene pestañas Jugadores · Premios. En la franja de reconocimientos de Jugadores, enlace «Ver todos los premios».
- false = sin enlace ni pestaña (la página queda sin enlazar).

## Ronda 266 — Premios con orden visual
- Pedido de Fralex: «orden y organización visual» en /premios/.
- Malla fija de 4 columnas en PC (3 tablet, 2 chica): todas las tarjetas del mismo alto, cifra y texto alineados (detalle fijo a 2 líneas, unidades cortas: «recibe por partido», «vallas invictas»).
- «Esta semana» = premios de la fecha + voto «MVP de la afición» en la misma fila (el primero crece para no dejar huecos).
- «De toda la edición» agrupada en 4 familias con rótulo: La tabla · Ataque · Defensa · Rachas; cada caja ocupa tantas columnas como premios y se acomodan sin huecos.
- Celular: una columna con tarjetas en fila (ícono + premio + persona a la izquierda, cifra grande a la derecha).

## Ronda 267 — Premios: orden + variedad (FX.premiosVariedad)
- Pedido de Fralex: «orden y variedad a la vez». Se mantiene la malla y las familias (ronda 266); cambia cómo se muestra cada cifra.
- Goleadas y partidos → marcador de estadio (dos casillas). Rachas → una bolita por partido. Matagigantes → salto de puesto «8.º » 4.º» (el gigante tachado). Revelación → barra de rendimiento. El que manda → borde y corona dorada. Muralla/Cerrojo → escudo/candado grande de fondo.
- false = todas las cifras iguales como en la ronda 266.

## Ronda 268 — Premios como «Muro de galería» (FX.premiosGaleria)
- Fralex quería más variedad pero «como una galería»; eligió entre 3 estilos (muro, vitrina, álbum) el **Muro de galería**.
- `core/competicion/premios.js` → `tamanosMuro(n)`: tamaños de cuadro (grande 2×2, ancho 2×1, alto 1×2, chico, franja) que llenan filas de 4 sin huecos (+1 test). El más importante (peso) va grande.
- Cada cuadro: ícono gigante de fondo y etiqueta de su familia (Ataque, Defensa…). Grande = foto y cifra enormes; ancho = cifra a la derecha; alto = retrato centrado; chico = lo justo.
- «Esta semana»: La Paliza grande + Matagigantes y voto MVP como cuadros anchos. En celular/tablet, 2 columnas.
- false = malla por familias (ronda 267). Siguen activas las cifras con forma propia (marcador, bolitas, salto de puesto).

## Ronda 269 — Premios sin rastro de IA (FX.premiosSinIA)
- Pedido de Fralex: «quita cualquier rastro de factor IA». Mismo criterio que sinIconos (ronda 235).
- Fuera: cuadraditos de color con ícono, íconos gigantes de fondo, halos/brillos, un color distinto por tarjeta (ahora un solo acento: cian Galaxy / dorado Sudario), etiquetas en píldora, cajitas brillantes del marcador, animación en cascada, ícono del título y la frase de tres partes de la cabecera.
- Queda: fotos, escudos reales (sin foto, el escudo del club en vez de iniciales de colores), números, tipografía y el borde lateral de acento de la identidad. Se mantiene el muro de galería.
- false = como la ronda 268.

## Ronda 270 — Gráficos de los premios con JS (FX.premiosGraficos)
- Pedido de Fralex: «usa JS para hacer todos los gráficos». `js/features/premiosGraficos.js` dibuja SVG a mano (sin librerías), al ancho real de cada tarjeta (ResizeObserver).
- Barras de goles por partido (Cañonero) y goles recibidos (Muralla), con el máximo marcado; Cerrojo = vallas invictas como puntos y el resto en gris; tira de resultados (ganó = cuadro lleno, empató = borde, perdió = rayita) con la racha encendida (En Llamas, Imparable, Rey del Empate); línea del puesto en la tabla fecha a fecha (El que manda, Dominante, Revelación, Matagigantes).
- Al pasar el mouse o tocar: globito con fecha, rival y resultado. Crecen/se trazan una vez al aparecer (respeta Animaciones reducidas). Un solo acento + grises; la forma también lleva el dato (no solo el color).
- `core/competicion/premios.js`: `historialJugador`, `puestosPorFecha` (+1 test).

## Ronda 271 — Premios vuelve a su look original (ronda 265)
- Fralex: «se ve muy técnico, incluso como estaba originalmente me gustó más». Se restauran `pages/premios.astro`, `js/pages/premios.js` y `styles/premios.css` tal como quedaron en la ronda 265 (tarjetas de colores con su ícono, brillo suave, voto MVP al costado).
- Retiradas las banderas premiosVariedad, premiosGaleria, premiosSinIA y premiosGraficos y el archivo `features/premiosGraficos.js` (siguen en el historial de git: commits de las rondas 267–270). En `core/competicion/premios.js` quedan las funciones `tamanosMuro`, `historialJugador`, `puestosPorFecha` (con test) por si se reutilizan.
- NUEVA REGLA de Fralex: usar JavaScript u otros lenguajes/recursos que aporten mucho a la web, siempre que no la sobrecarguen ni afecten el rendimiento. Lección: lo visual debe seguir el estilo vivo de la web (colores, brillo), no verse «técnico».

## Ronda 272 — Premios: el voto MVP sale de la sala de trofeos
- Fralex: el voto «rompe con el orden de sala». Sale del costado de «De toda la edición» y va en su propia franja al final («Vota tú · MVP de la afición»); en PC queda en una sola fila (título | ranking | elegir y votar).
- Así los trofeos de la edición quedan en una malla limpia de 4 por fila en PC.

## Ronda 273 — Menú de arriba: el clic abre y cierra (pilares)
- Antes, tras el clic el desplegable se quedaba abierto (el botón conservaba el foco). Ahora el clic ALTERNA: si se ve, lo cierra y suelta el foco; si no, lo abre. Al sacar el mouse vuelve a abrirse con hover. En táctil funciona por toque (abrir/cerrar).
- Archivos: `src/js/features/pilares.js`, `src/styles/components.css` (`.pilar[data-cerrado]`). Sin BD. Probado en navegador real (hover, clic, clic, clic, salir y volver) y 452 tests OK.

## Ronda 274 — Traspasos en vivo entre Phoenix Link (migración 105, Edge Function «traspasos»)
Un anfitrión hace un traspaso en Editar de PES y lo guarda; su Link publica un lote «jugador → equipo» y el Link de cada amigo que lo sigue (con un código de 8 caracteres) lo aplica sobre su propia base. Función **aparte** de «liga» (un fallo aquí no toca el marcador en vivo ni el campo 2D), tablas `liga_traspasos`, `liga_traspasos_codigos`, `liga_traspasos_seguidores` (RLS sin permisos: solo la función). Probado de punta a punta contra la web real (29 comprobaciones, dispositivo temporal ya borrado). Contrato y rutas: `docs/web-pes-link/WEB-PES-LINK.md («TRASPASOS-EN-VIVO»)`. Falta que Phoenix Link use las rutas (chat LINK). Sin cambios de pantalla en la web.

## Ronda 275 — Perfil de jugador con orden y elegancia (FX.perfilJugadorPro)
- Pedido de Fralex: reorganizar el perfil de jugador con orden visual, elegancia y sensación premium. Mismos datos y acciones; `render2()` y `seccionEdicion2()` en `js/pages/jugador.js`, estilos en `styles/perfilJugador.css`.
- Cabecera: línea fina con escudo + club + posición, nombre grande, apodo como firma (texto con degradado, sin píldora), y una «ficha técnica» de un solo estilo (Media · Posición · Altura · Pie · En la tabla) que reemplaza las 5 etiquetas de colores. Se quitó la etiqueta «PERFIL DE JUGADOR».
- Los 3 botones de edición (solo staff) van juntos en un menú «Editar» (Ficha y stats · Biografía y redes · Historial y títulos).
- Pestañas cápsula: Temporada · Análisis · Trayectoria (se recuerda con #analisis / #trayectoria en la dirección; flechas del teclado). El análisis ya no necesita un botón aparte.
- Campaña de cada edición más compacta: ficha de una línea (Puesto · Puntos · Jugados · Goles · Diferencia), barra de avance, una sola barra G/E/P, 4 resultados y 4 próximos con «Ver N más», «Contra cada rival» plegado. Compartir campaña como botón redondo.
- Historial: los contadores en 0 quedan apagados. PC: 2,2 → 1,65 pantallas; celular: 4,5 → 3,2.

## Ronda 276 — Perfil de jugador vivo y futbolístico (FX.perfilJugadorVivo)
- Pedido de Fralex: «más técnico, más vivo y más futbolístico, muy dinámico». Bloque «scouting» bajo la cabecera (js/pages/jugador.js: scoutingHTML, miniCancha, animarScout; estilos al final de perfilJugador.css):
  - En la cancha: mini cancha SVG con césped a franjas, zonas de calor (core/jugadores/estilo.js mapaCalor) y la ficha de su posición; al pasar el mouse por cada tercio, el % de juego ahí.
  - Atributos: los 6 ejes en barras con color de nivel tipo FC (cian 85+, verde 78+, lima 70+, amarillo 62+, naranja); globito con las stats que forman cada eje. Arquetipos arriba (Finalizador, Muro defensivo…).
  - Forma: últimos 5 como bolitas + palabra (En racha / Al alza / Irregular / Mala racha).
- Barras, números, calor y bolitas se animan UNA vez al cargar (hayMovimientoReducido respetado). Nada se mueve solo después.

## Ronda 277 — Perfil de jugador: vuelve el diseño de la ronda 275
- Fralex: «me gustaba el diseño anterior». FX.perfilJugadorVivo = false (el bloque scouting queda en el código, apagado). Queda el perfil ordenado de la ronda 275.

## Ronda 278 — Mi club galáctico (FX.miClubGalaxia)
- Pedido de Fralex: Mi club con diseño distribuido, premium, innovador y galáctico. `src/pages/mi-club.astro` (rama nueva tras la bandera, mismos ids que usa miClub.js) + estilos al final de `styles/miClub.css`.
- Cabecera: cielo estrellado (solo gradientes), órbitas SVG con 2 lunas (giran un poco solo al pasar el mouse), insignia-camiseta con degradado cian→púrpura, título en degradado y chip de estado en vivo: Sin sesión / Esperando tu club / Club conectado (miClub.js pone data-estado).
- Sin club: «Misión de lanzamiento» en 3 pasos como planetas unidos por una órbita (Abrir Phoenix Sync → Subir mi club → Editar y jugar) con botones «Vincular mi PC» y «Ver la Liga Máster»; al lado, vista previa (maqueta) del vestuario. Sin sesión: tarjeta con Entrar / Crear cuenta. Sudario: azul + dorado.
- Con club: el vestuario sigue igual que antes.

## Ronda 279 — Liga Máster galáctica (FX.ligaMasterGalaxia)
- Pedido de Fralex: mejorar también el diseño de Liga Máster, misma familia que Mi club (ronda 278). `pages/manager.astro` (rama tras bandera, mismos ids), `js/pages/manager.js`, estilos al final de `styles/pages.css` (todo dentro de `.lmg`; reutiliza `.mcg-*` de miClub.css).
- Cabecera con estrellas, órbitas e insignia (DT); chip de la ventana de fichajes en vivo (abierta/cerrada); tu club y sus 4 cifras dentro de la cabecera.
- «Elige tu club»: escudos en un anillo orbital (gira un poco al pasar el mouse), presupuesto y cuántos jugadores tiene cada club con su mejor media (nueva consulta pintarPlanteles). Sin sesión: tarjeta Entrar / Crear cuenta. Textos de la Liga Máster a 12 px mínimo.
- Plantilla, Mercado, Oficina, Movimientos y el centro de control del staff funcionan igual.

## Ronda 280 — Liga Máster y Mi club unificados en «Mi club» (FX.clubUnificado)
- Fralex: «¿qué sentido tiene tener Liga Máster y Mi club? Mejor unificar», con toque fino, elegante, dinámico y premium.
- /manager/ es ahora «Mi club»: una cabecera (chips: ventana de fichajes + estado de Phoenix Sync) y dos modos tipo tarjeta-interruptor: «Carrera de DT» (elegir club, plantilla, mercado, oficina, movimientos, staff — manager.js) y «Vestuario del juego» (antes /mi-club/: misión de 3 pasos, vestuario, aviso a mi juego — miClub.js y buzon.js cargados por `js/features/clubUnificado.js`). Modo en la dirección: #vestuario.
- /mi-club/ redirige a /manager/#vestuario (así funcionan los enlaces viejos y lo que diga Phoenix Sync). Menú: un solo botón «Mi club» (manager adopta mercado y miclub); miclub fuera del panel de cuenta.
- Las secciones de los modos no usan la aparición al bajar (quedaban invisibles un momento al cambiar de modo).

## Ronda 281 — Fichajes del juego aplicados solos (migración 106, PENDIENTE de pegar)
- Fralex: «ya empieza» (parte web de docs/web-pes-link/WEB-PES-LINK.md («SYNC-AUTOMATICO»)). Archivo `supabase/migrations/106_lm_fichajes_desde_juego.sql`:
  - disparador en `mercado_reportes`: los cambios `jugador_equipo` se aplican solos si la ventana está abierta y quien reporta es el DT de un lado y el otro es CPU/libre (o es staff); si no, quedan para el staff. Tipo nuevo `juego` en `lm_movimientos` (+ `origen_reporte`, `revertido_en`).
  - `mercado_revisar` al aprobar aplica lo que faltaba; `lm_staff_revertir(p_mov)` deshace un movimiento (jugador y dinero).
  - `sistema_lm_importar` casa equipos del catálogo con los 12 clubes ya creados por nombre normalizado (no los duplica).
- Web: «Movimientos» muestra «Desde el juego» y, para el staff, botón Revertir (manager.js lee `select('*')` para funcionar antes y después de la 106).
- El MCP canceló el apply_migration: el SQL (sin comentarios) se entregó a Fralex para pegarlo en el SQL Editor.

## Ronda 283 — Valores reales y ficha de cada futbolista de la Liga Máster
- Fralex: «ponles valoraciones de dinero de la vida real y haz la ficha de perfil de todos».
- Datos (sin migración): `lm_jugadores.valor` y `altura` de los 314 temporales con el valor de mercado real de oct-2026 (footballtransfers.com/fotmob «Estimated Transfer Value», unos pocos de soccerway/prensa citando Transfermarkt). 308 con valor real; los 6 sin dato conservan el de la regla. Ej.: Lamine Yamal €226 M, Olise €198 M, Cubarsí €186 M, Haaland €159 M.
- Página nueva `/futbolista/?id=` (`pages/futbolista.astro`, `js/pages/futbolista.js`, estilos `.fb-*` en perfilJugador.css): carta con media, posición, escudo y valor; cabecera estilo perfil (club · posición, nombre, ficha Media · Posición · Edad · Altura · Dorsal · País); botón Fichar / Hacer oferta (mismos RPC que Mi club, respeta ventana y sesión); historial de traspasos; compañeros de club. Nota de «ficha temporal» si no tiene pes_id.
- En Mi club, el nombre de cada carta (plantilla y mercado) abre su ficha.

## Ronda 284 — Fotos reales de los futbolistas (Wikipedia / Commons)
- Fralex: «falta su foto real». `js/features/fotoFutbolista.js`: en el navegador busca el artículo del jugador en la API de Wikipedia (CORS origin=*) y usa su imagen principal; PageImages solo da imágenes LIBRES de Wikimedia Commons, por eso se puede mostrar con crédito («Foto: Wikipedia · Wikimedia Commons»). Solo se aceptan URLs de upload.wikimedia.org.
- Ligero: máx. 3 consultas a la vez, solo las cartas que entran en pantalla (IntersectionObserver), resultado recordado 14 días en localStorage (con try/catch). Sin foto → queda el icono/escudo de siempre. Sin migración.
- Mi club: foto redonda chiquita en cada carta (plantilla y mercado). /futbolista/: foto grande en la carta con mini escudo y crédito.
- Riesgo conocido: si el buscador acierta mal o el jugador no tiene foto libre (canteranos), se ve el icono; no se puede verificar desde el entorno de pruebas (sin internet), revisar en la FASE BETA.

## Ronda 274 — «Fase beta» pasa a «Fase beta 1.0»
- La vista previa privada ahora vive en `/phoenixevolution/fase-beta-1-0/` (antes `/fase-beta/`) y la cinta dice «FASE BETA 1.0». Cambiado en `deploy.yml`, `astro.config.mjs`, `Layout.astro`, CLAUDE.md y docs. La carpeta vieja `/fase-beta/` deja de publicarse al desplegar. Las rondas antiguas de MAPA/REGISTRO conservan el nombre viejo (historial).
- **Pendiente de Fralex:** en Supabase Auth → URL Configuration añadir `https://fralexito.github.io/phoenixevolution/fase-beta-1-0/**` (para iniciar sesión en la vista previa).

## Ronda 275 — PUBLICADO a main (orden «Publícalo», 13-oct-2026)
- `main` avanzó (fast-forward) de 42bccd6 a 4883ebc: entran las 131 rondas acumuladas de `borrador` (hasta la 274). Tests 457/457 y build 47 páginas antes de subir. BD al día (migraciones hasta 106; la 106 la pegó Fralex en el SQL Editor).
- Desde ahora la vista previa es `/fase-beta-1-0/` y `borrador` y `main` quedan iguales.

## Ronda 294 — «Crear mi liga»: creación rápida (etapa 1)
- Página nueva `/crear-liga/` (solo staff por ahora, decisión de Fralex): 3 pasos (nombre · tipo · jugadores) con 4 tarjetas (Liga, Copa, Grupos + copa, Suizo) y un resumen en vivo («con 8 jugadores se juegan 28 partidos»). Todo lo completo va plegado: «Personalizar» (visibilidad, yo juego, ida y vuelta, 3.er puesto, grupos, premio, descripción) y dentro «Avanzado» (fecha, enlace, reglas, dinámicas, sorteo, jugadores que reportan, más jugadores del recomendado).
- Crea un torneo propio con la misma RPC `torneo_crear` de /torneos/ (tabla `torneos_libres`): SIN base de datos nueva y SIN cambios en lo que ya funcionaba. Marca `config.origen = 'crear-liga'`. Tras crear, lleva a `/torneo/?id=…`.
- OJO: el límite «solo staff» es de pantalla; la RPC sigue permitiendo crear torneos a cualquiera desde /torneos/ (ya era así). Si se quiere blindar en servidor, es una migración aparte.
- Archivos: `src/pages/crear-liga.astro`, `src/js/pages/crearLiga.js`, `src/js/core/competicion/crearLiga.js` (+ `tests/crearLiga.test.mjs`, 9 pruebas), `src/styles/crearLiga.css`, `global.css`. Probado en navegador real. 466 tests OK, 48 páginas.
- Pendiente (etapas 2–4 del plan): plantillas guardadas, enlace de invitación, desempates/puntos configurables, ligas automáticas con Phoenix Link; y enlazar la página desde el menú (hoy solo por URL `/crear-liga/`).

## Ronda 295 — Correcciones tras la auditoría (orden de Fralex: «corrige todos esos errores»)
- **Hecho (seguro):** (a) migración **107**: `torneo_crear` rechaza con `SOLO_STAFF` si la config trae `origen='crear-liga'` y no es moderador/admin; /torneos/ NO cambia. Probado con transacción revertida (jugador+crear-liga rechazado · jugador+torneo normal OK · admin OK). La pantalla `/crear-liga/` ahora usa `puede(rolReal(),'editarLiga')`, igual que el servidor. (b) `MAPA.md` pasó de 1006 a 326 líneas: lo antiguo está en `docs/bitacoras/HISTORIA-WEB.md («MAPA-HISTORIAL»)`, sin borrar nada. (c) Regla del número de ronda en `docs/liga-y-torneos/REGLAS-ECOSISTEMA.md`.
- **Decidido NO tocar (riesgo mayor que el beneficio):** los 19 `select('*')`. Los que pesan son de `jugadores` (las cartas usan casi todas las columnas); `manager.js` es intencional (funciona antes y después de la 106).
- **Pendiente, necesita OK de Fralex porque podría cambiar cómo se ve:** limpiar las 7 capas de la portada (elite · transmisión · escenario · ventanas · ventanas3d · ventanasplus · sinIconos) y repartir el CSS (564 KB para todas las páginas). Plan: comparar capturas antes/después de las 47 páginas y solo seguir si salen idénticas.
- Datos duplicados (`ligaResultados.js` y la BD): tema aparte, grande.

### Ronda 350 (cuenta Opus, borrador): Noticias con reacciones, encuestas y comentarios (FX.noticiasSocial, migración 124)
- Decisiones de FRALEX: 5 emojis (🔥 😂 😮 👏 💀), uno por persona y noticia (tocar el mismo lo quita); encuestas del staff o de la Redacción IA (las de la IA llegan apagadas y se abren al aprobarlas en /bandeja-ia/); comentarios directos, pero también listados en /bandeja-ia/ para eliminarlos.
- Base (124): tablas noticias_reacciones, noticias_encuestas, noticias_votos, noticias_comentarios, cerradas (todo por RPC security definer, patrón del muro 022). Sancionados no participan (032) y límites de ritmo (031: 120 reacciones/h, 60 votos/h, 5 comentarios/2 min y 40/h). Los % de la encuesta solo se ven tras votar. Eliminar comentario = ocultar (autor o moderador). ia_propuestas suma tipo «encuesta» + encuesta_id; ia_revisar (117) se rehace igual + abre la encuesta al aprobar.
- Web: core/portada/noticiaSocial.js (+7 pruebas), features/noticias/social.js (dentro del lector, antes de los botones; comentarios plegados), styles/noticiaSocial.css; Bandeja IA: tipo «Encuesta» y caja plegable «Comentarios de noticias» (aislada: si la 124 falta, el resto de la bandeja sigue).
- Probado: SQL en transacción deshecha (TODO_OK_REVERTIDO, supabase/tests/124_noticias_social_test.sql); visual en PC y celular con datos simulados (0 errores, 0 textos <12 px). 572 pruebas, build 53. PENDIENTE: FRALEX pega el SQL; avisar a la tarea «Redacción IA Phoenix» cómo proponer encuestas (necesita su aprobación).

### Ronda 351 (cuenta Opus, borrador): Noticias nueva — EL FÉNIX (diario chicha) + zona seria + lector de página completa (FX.noticiasV2)
- Pedido de FRALEX: rediseño total; arriba un diario «chicha»/farándula tipo diario popular peruano pero gamer (humor peruano, TikTok, shitpost, con cariño), descargable para mandar a grupos; abajo lo serio. Diseño aprobado en el lienzo «Noticias Phoenix — rediseño total» (Claude Design).
- REGLA: una portada POR SEMANA (sale el lunes con el paquete); «edición extra» solo si ese día pasa algo nuevo. Portadas en src/data/portadas.js (core/portada/portadas.js + tests/portadas.test.mjs).
- EL FÉNIX (features/noticias/fenix.js): portada con ampay, La Lechuza del Parsec, patch notes, horóscopo gamer, cupón, logro, escudos de los clubes como «fotos»; ediciones (Extra / Esta semana / Semana 41); descarga PNG con html-to-image (post y 9:16) + compartir del celular; WhatsApp; copiar para Discord; álbum de cupones (solo en el navegador).
- Zona seria (features/noticias/zonaSeria.js): marcadores de la última fecha + top 3, primera plana, 2 destacadas, Lo último, Secciones en 5 bloques, resto y La Tribuna al final.
- Lector (features/noticias/lector.js): página completa con ?n=<slug>, Volver, reacciones/encuesta/comentarios (ronda 350), tabla y «Sigue leyendo»; staff: editar/ocultar/eliminar.
- Lo anterior NO se borró: se ve con ?clasica=1 (botón «Vista clásica · acomodar» para el staff) o con FX.noticiasV2=false. Si la vista nueva falla al cargar, cae sola a la clásica.
- Letras nuevas alojadas en la web: @fontsource anton, oswald, permanent-marker, press-start-2p. 577 pruebas, build 53, revisado en PC y celular con datos simulados (0 errores, 0 textos <12 px, descarga PNG ok).

## RETOMAR EN UNA CONVERSACIÓN NUEVA (resumen de estado · ronda 209)
> **Actualización 2026-10-25 (dos cuentas):** el estado vivo de TODO Phoenix (web, Link, Sync, mandos de PES) y qué cuenta lleva cada frente está en **`TRASPASO.md`** (raíz). Web: beta **1.16.1**, ronda 367, migraciones hasta **143** aplicadas (siguiente **144**), nada a medias; pendiente de Fralex: crear la liga real y mandar el enlace.
> **Actualización 2026-10-16 (cuenta WEB):** rondas 340–347 (React isla, radar FIFA, orden visual, modo ligero, anti-lag) y pendientes en **`docs/bitacoras/HISTORIA-WEB.md («BITACORA-16-OCT-2026-CUENTA-WEB»)`**; siguiente ronda 348.
> **Actualización 2026-10-16 (cuenta Opus):** esta sección es vieja. Para el estado actual leer **`docs/bitacoras/HISTORIA-WEB.md («BITACORA-16-OCT-2026-CUENTA-OPUS»)`** (cómo retomar, qué se hizo 13–16 oct, pendientes de FRALEX, siguiente migración 119 / ronda 347) y la última línea **TRASPASO** de `REGISTRO.md`.
> **Actualización 2026-10-08 (Cuenta A):** hay dos cuentas trabajando a la vez. Leer primero el final de `REGISTRO.md` (bitácora, solo se añade) y `docs/liga-y-torneos/REGLAS-ECOSISTEMA.md` §7. Estado real de la BD: migraciones hasta **089** aplicadas (hay choque de números 088/089 entre cuentas: ver `supabase/migrations/REGISTRO_DESFASES.md`); siguiente libre **100** (hechas hasta la 099; 097 = torneos propios, 098 = Phoenix Sync compartido, 099 = chat general). Nuevo en `borrador` sin publicar: Liga Máster / Modo Mánager (078–089), Mercado (Edge Function `mercado` v10), páginas `/legal/*`, privacidad en Configuración y Moderación, manifest/OG. Economía al día en `ECONOMIA.md`. La línea «Estado de la BD: migraciones 001–057» de abajo está desactualizada.

**Qué es:** web de «Phoenix Evolution Series» (ligas Galaxy League y Liga Sudario). Astro estático + Tailwind 4 + Supabase JS v2, Node 22. Repo `Fralexito/phoenixevolution` (público). Oficial: `https://fralexito.github.io/phoenixevolution/` (rama `main`); vista previa privada «FASE BETA»: `/fase-beta/` (rama `borrador`; la URL `/borrador/` se retiró el 8 oct 2026 porque se compartía sin permiso). Supabase `fiibiyijojkxqlsrhcil` (plan FREE). Usuario «Fralex» (admin, Lima UTC-05:00, español, poco conocimiento de programación).

**Reglas fijas (no romperlas):**
1. Trabajar SOLO en `borrador`. Pasar a `main` solo cuando el usuario diga «Súbelo» o «Publícalo» (última vez: ronda 170, `main` = `borrador`).
2. Cada cambio: bullet «ronda N» aquí (siguiente = **218**; insertar antes de esta sección y subir el número del título), commit con los trailers `Co-Authored-By: Claude Sonnet 5.5 <noreply@anthropic.com>` y `Claude-Session: https://claude.ai/code/session_01XJLbLGoQ9XiGmigfbBXx7Q`, y push a `borrador`. Antes de empujar: `git pull --rebase origin borrador` (el flujo de escudos de GitHub también escribe ahí).
3. Pruebas: `npm test` (404 pasan) y `npm run build` (45 páginas). Capturas con Playwright solo si el cambio es visual y grande.
4. SQL grande por el conector de Supabase se cancela: entregar el `.sql` con SendUserFile. SQL/DDL pequeño por `execute_sql` sí funciona.
5. Preferencias del usuario (literales o casi): SQL entregado SIN comentarios ni anotaciones («código puro»); jamás ventanas nativas `confirm/prompt/alert` (usar `core/sistema/dialogo.js`); el parche se llama **«Conmegol»** (nunca «Conmebol»); nunca pedirle secretos en el chat; respuestas cortas («modo ligero»); **evitar el scroll excesivo: lo secundario o largo va en minisecciones plegables (`components/Plegable.astro`) cerradas**; no perder la identidad visual (cian/púrpura en Galaxy, azul/dorado en Sudario); cierre de cada intervención con una pregunta para que parafrasee (instrucciones del proyecto).
6. La responsabilidad legal de la monetización y del uso de escudos es del usuario.

**Estado de ramas (8 oct 2026, noche):** `main` = web oficial (última publicación: ronda 170 + cambio del despliegue a `/fase-beta/`). `borrador` = rama de trabajo, se publica en la vista previa privada **`/phoenixevolution/fase-beta/`** (la URL `/borrador/` se retiró). En `borrador` y SIN publicar: rondas 171–206 + todo lo de la Cuenta A (Liga Máster 078–089, Mercado, legal/privacidad, menú por pilares, rendimiento, 092–093). Publicar solo con «Súbelo».

**Rondas 171–182 en una frase cada una:** auditoría con axe de 40 vistas (solo queda `.nt-sello` por contraste: color de acento por noticia) · `role=tab` con `aria-selected` · tablas con región enfocable · todo texto ≥12 px (0 de 1989 por debajo) · curvas unificadas `cubic-bezier(.22,1,.36,1)` y fuera `transition: all` · `CLAUDE.md` en la raíz del repo (reglas + movimiento) · capa **dopamina** (`styles/dopamina.css` + `features/dopamina.js`, detrás de `FX.dopamina`): botones que se hunden al pulsar, ondulación, brillo en botones principales, tarjetas que entran escalonadas, inclinación 3D y luz que sigue al mouse (solo mouse), anillo giratorio de historias nuevas, ráfagas de emojis al reaccionar/publicar · barra lateral izquierda como cápsula flotante sin scrollbar nativo, con indicador fino propio (`montarIndicador`) · ronda 182 (arriba).

**Cómo se trabajó con las skills (criterio acordado):** Emil Kowalski = reglas de movimiento (frecuencia, <300 ms en UI, solo transform/opacity, press scale .96, hover solo con mouse, springs solo en lo celebratorio). Taste = solo guardarraíles de rendimiento y accesibilidad (su estética choca con la identidad: no se adopta). Impeccable = auditoría y calidad (`audit`/`polish`); sus prohibiciones (texto con degradado, glass, bordes laterales, etiquetas en mayúsculas) se IGNORAN a propósito porque son la identidad del usuario. Prioridad del usuario: «lo más atractivo, animado y dopamínico posible, sin perder identidad; si no me gusta lo revierto» → todo lo nuevo cuelga de una bandera en `data/experimento.js`.

**Próximos pasos propuestos (de la auditoría de atractivo, por orden):** (a) hero con protagonista visual real (foto/estadio propio o carta del líder; hoy solo aurora + texto) · (b) jerarquía tipográfica: demasiadas etiquetas en mayúsculas con tracking, ninguna destaca · (c) imágenes propias en noticias/tienda/jugadores (las pone el usuario) · (d) migrar los ~28 vacíos antiguos a `vacioHTML` · (e) podio animado también en Ranking y confeti al subir de puesto · (f) objetivos táctiles <44 px y `.nt-sello` · (g) acortar ~88 transiciones >300 ms · (h) menús con origen en el disparador · (i) opcional: `/impeccable init` (PRODUCT.md) y auditoría `design-motion-principles` de la capa dopamina.

**Entorno de la IA (sandbox):** sin acceso a Supabase ni a github.io (los contadores salen «—» y hay «Failed to fetch» en capturas: no es un error real). Pruebas visuales con Playwright (`/home/claude/.npm-global/lib/node_modules/playwright/index.mjs`, chromium `/opt/pw-browsers/chromium`): compilar con `PES_BASE=/ npm run build`, servir `dist` con `python3 -m http.server 4399`. Plantilla de commit/flujo: ver regla 2.

**Pregunta de continuidad que quedó abierta:** el usuario preguntó varias veces si «ya es hora de pasar a Claude Code»; respuesta dada: esta sesión YA corre sobre Claude Code en su repo; mudarse solo cambia dónde corre (app de escritorio «Link to this computer» + `npm run dev` local para ver cambios en segundos). Pendiente que decida. También quedó pendiente que parafrasee: ¿por qué el hero pesa más que otro hover? y con qué punto seguir.

**Estado de la BD:** migraciones hasta **096** aplicadas (090/091 = copias de las 088/089 de permisos y legal que se aplicaron por MCP sin archivo). Siguiente libre: **097** (reservar en `REGISTRO.md`). Detalle de desfases: `supabase/migrations/REGISTRO_DESFASES.md`. La bitácora viva es `REGISTRO.md` (léela antes que esta sección).

**Hecho reciente (rondas 121–170), todo publicado:** buscador global; menú original de hamburguesa; página Liga con selector «Ligas activas» (Galaxy / Sudario), tablas con escudos, racha «Últimos» navegable, totales de fechas; **Liga Sudario** (12 jugadores, sin fechas aún, tema azul/dorado, sede España, organizador Sudario17 = SUPUESTO, zonas copa/descenso, ascenso en 0 hasta que exista la Div. 2, página `/sudario-divisiones/`); Galaxy (sede Perú, organizador Jack); páginas de divisiones con selector y flecha de retroceso; Quiénes somos con CEO/Presidente/Vicepresidente; Noticias con catálogo de 32 plantillas; perfil de jugador con campaña rediseñada y escudos; **Central**: pestaña «Por fecha» (tabla con ▲▼, estadísticas), partido destacado editable (staff), «En racha», aviso de novedades; **experimento** «más dinámico» con interruptores en `src/data/experimento.js` (transiciones, reveal, esqueletos, rachas, visita, compartir); **tarjetas para compartir** (`core/comunidad/compartir.js`, `features/compartir.js`); escudos alojados en `/public/escudos/` (`ESCUDOS_LOCALES = true`; para volver a internet ponerlo en false); XI ideal oculto en Inicio (era demo).

**Pendiente / ideas acordadas:**
- PWA (aprobado el plan, aún sin hacer): primero manifest + íconos + botón «Instalar» (sin service worker); offline/notificaciones y tiendas (Play 25 USD, Apple 99 USD/año; ojo con pagos in-app y escudos) más adelante.
- Marketing: ritual semanal (resumen/XI de la fecha), invitar con premio de tokens, bot de Discord.
- Cargar las fechas 1–11 de Sudario cuando el usuario las dé; completar fotos/datos de 3 jugadores de Sudario.
- Confirmar el organizador de Sudario (hoy Sudario17 es una suposición).
- Imágenes de portada (Unsplash) propias; cabecera común en todas las secciones; aplicar «Plegable» donde falte (p. ej. Liga: portada muy alta).
- Aplazado por el usuario: webhook y bot de Discord, pasarela de pago, pruebas de clanes/etiqueta.
- Antiguo backlog (ver rondas anteriores): B5 Clanes, Ola C, copias de seguridad/alertas (fase 5), tareas del panel de Supabase.

**Decisiones y por qué (para no repetir discusiones):**
- *Sudario separada de Galaxy:* el usuario pidió que «no se mezclen». Por eso tiene su propia edición, su propio sistema (`SISTEMAS_LIGA`) y su propia página de divisiones; Galaxy sigue con `SISTEMA` (Primera/Segunda).
- *Ascenso de Sudario en 0:* el usuario pidió quitar «Zona de ascenso» porque la Div. 2 de Sudario no existe aún; la página de divisiones es «incompleta a propósito». Se reactiva cambiando `suben` en `data/temporada.js`.
- *Tema azul/dorado solo en Sudario:* el usuario quiso que al cambiar de liga cambie la estética, sin perder la identidad cian/púrpura de Galaxy. Se hace con `html[data-tema]` y variables CSS (reversible).
- *Navegación original (hamburguesa) y portada original:* el usuario rechazó rediseños que «perdían la identidad». Regla: mejorar sin cambiar la identidad base.
- *Minisecciones plegables:* el usuario quiere evitar el scroll excesivo; lo secundario va detrás de un clic.
- *Experimento reversible:* todo lo «dinámico» tiene interruptores en `data/experimento.js` y cada pieza es un commit propio, porque el usuario pidió poder deshacerlo.
- *Escudos propios:* las imágenes externas pueden fallar; se alojan en `/public/escudos/` (descarga automática por GitHub Actions solo en `borrador`).
- *«Conmegol»:* es el nombre real del parche; nunca «corregirlo».
- *PWA por etapas:* manifest primero; service worker/offline después, para que nadie vea versiones viejas mientras se itera.

**Visión del usuario (en sus palabras):** _pendiente de dictar; completar cuando la dé._

**Mapa rápido de archivos:** `src/data/` (ligas, ligaResultados, temporada, experimento, organizadores) · `src/js/core/` (lógica pura con test: tabla, ligaStats, central, compartir, escudos, temporada) · `src/js/features/` · `src/js/pages/` · `src/pages/*.astro` · `src/styles/components.css` · `supabase/migrations/` · `.github/workflows/` (deploy, escudos, respaldo, keep-alive).

### Ronda 296 (cuenta WEB, borrador): menú en 5 puertas (Competiciones · Jugadores · Jugar · Mi club · Comunidad). Mi club sale de Jugar; Premios pasa a Competiciones; «Unirme a la liga» y «Crear mi liga» (solo staff) en Competiciones; «Quiénes somos» en Comunidad. Barra lateral de iconos apagada (FX.barraLateral=false, reversible) y pie «Explora» = las mismas 5 puertas. URLs sin cambios. site.js, Header/PilarTabs (data-solo-staff), pilares.js, Footer, experimento.js. Tests 466/0, build 48.

### Ronda 297 (cuenta WEB, borrador): cada puerta con su mundo — Jugadores violeta, Jugar rosa, Mi club verde, Comunidad naranja; Competiciones conserva el cian de Galaxy (+ dorado). Brillo de ambiente y pestañas por mundo (styles/mundos.css, main[data-mundo] desde Layout). Se apaga con Sudario o con acento elegido en Ajustes. Arreglo: textos del menú sin partirse en 2 líneas. Tests 466/0, build 48.

### Ronda 298 (cuenta WEB, borrador): vuelve la barra lateral izquierda (FX.barraLateral=true), por pedido de Fralex; era un error apagarla.

### Ronda 299 (cuenta WEB, borrador): se apagan los colores por mundo (ronda 297) porque a Fralex no le gustaron. styles/mundos.css queda guardado sin importar; para volver a probarlo, re-añadir su @import en global.css.

### Ronda 300 (cuenta WEB, borrador): menú sin botones repetidos. «Crear» es UN solo botón (staff ve Crear mi liga; el resto, torneos/#crear; data-no-staff). «Ligas activas» → «Todas las ligas». Formatos queda dentro de Torneos (pestaña adoptada). Mi cuenta sin Mi club ni Phoenix Link (ya están en sus puertas). Páginas siguen todas alcanzables. Elegido por Fralex: estilo C «Pro e-sports» (lienzo de 3 estilos) para el rediseño; aún sin aplicar. Tests 466/0, build 48.

### Ronda 301 (cuenta WEB, borrador): rediseño de FORMA «Pro e-sports» (opción C del lienzo; SIN cambiar colores): esquinas rectas, botones/pestañas/etiquetas inclinados, barra de acento izquierda en tarjetas, podio con esquina cortada. styles/estiloPro.css tras FX.estiloPro (data-fx-pro en <html>). Primera capa: faltan Portada (tarjetas), Duelos, Perfil, etc. Tests 466/0, build 48.

### Ronda 302 (cuenta WEB, borrador): Competiciones simplificada: el desplegable pasa de 8 botones a 3 GRUPOS (Ligas · Torneos · Campeones) y las pestañas de abajo muestran solo las páginas del grupo actual (Ligas: Ligas/Todas las ligas/Unirme · Torneos: Torneos/Crear (Formatos adoptado) · Campeones: Palmarés/Premios/Historial/Ranking). Bloques con compacto:true en site.js; Header y PilarTabs lo entienden. Todas las páginas siguen alcanzables. Tests 466/0, build 48.

### Ronda 303 (cuenta WEB, borrador): PRUEBA «sin huella de IA» SOLO en Liga: sin brillos de neón, título con color liso (sin degradado), tarjetas planas (sin desenfoque), sin manchas de luz del titular. styles/sinIA.css con main[data-activa='liga'] (Layout pone data-activa). Si gusta: añadir más páginas; si no: borrar el @import en global.css. Tests 466/0, build 48.

### Ronda 304 (cuenta WEB, borrador): toque gaming/e-sports SOLO en Liga, sin brillos: rayas diagonales y esquinas tipo «mira» en el titular, raya cian bajo él, títulos de sección con bloque inclinado, podio con cabecera subrayada, tabla con cabecera marcada y filas alternas. En styles/sinIA.css (main[data-activa='liga'] section > header). Tests 466/0, build 48.

### Ronda 305 (cuenta WEB, borrador): EQUILIBRIO identidad Galaxy + e-sports en Liga: vuelven degradado cian→púrpura del título, halo suave solo en el título, cristal oscuro con borde púrpura y capas de luz del titular; se quedan formas inclinadas, rayas diagonales, esquinas mira, títulos con bloque, tabla marcada; siguen sin neón en botones/chips/podio. styles/sinIA.css. Tests 466/0, build 48.

### Ronda 306 (cuenta WEB, borrador): el estilo equilibrado (e-sports + identidad Galaxy, sin neón en botones/chips) ya en casi todo el sitio. Layout pone data-sia en <main>, salvo páginas cuya identidad depende de brillos/degradados/cartas: central, database, tienda, palmares, premios, logros, duelos, envivo, ahora y perfil (lista SIN_IA_NO en Layout.astro). Para excluir/incluir una página: editar esa lista. styles/sinIA.css. Tests 466/0, build 48.

### Ronda 307 (cuenta WEB, borrador): vuelven los Highlights en la portada (FX.highlightsDemo=true) con 3 videos REALES de YouTube de PES 2021 como modelo (Terry F.C., MJ7, PES LEGEND; ids comprobados con oEmbed). Visor grande + lista; el video carga solo al tocar (youtube-nocookie). Datos en data/demo.js (DEMO_CLIPS, solo cambiar ids), lógica features/highlights.js. Tests 466/0, build 48.

### Ronda 308 (cuenta WEB, borrador): el desplegable del menú ya no se sale de la pantalla por la izquierda en ventanas angostas: pilares.js lo corre hacia adentro lo justo (variable --desp, margen 8 px) al abrir y al cambiar el tamaño. components.css. Tests 466/0, build 48.

### Ronda 309 (cuenta WEB, borrador): el desplegable de Competiciones (3 grupos) ya no deja hueco a la derecha: panel angosto de 1 columna (clase pilar-panel-chico en Header + components.css). Tests 466/0, build 48.

### Ronda 310 (cuenta WEB, borrador): barra lateral izquierda en 4 grupos, lo más usado primero: Comunidad (Noticias · Social · Chat general) · Jugar (Duelos · En vivo · Mi club) · Competir (Galaxy League · Liga Sudario · Torneos · Ranking) · Mi cuenta (Mi muro · Mensajes · Amigos) + amigos en línea. Salen de la barra Phoenix Link, Creadores, Eventos, Jugadores y Mis partidos (siguen en el menú de arriba / Mi cuenta). BarraLateral.astro. Tests 466/0, build 48.

### Ronda 311 (cuenta WEB, borrador): las 4 ventanas de la portada ya no giran; cada una = vista en vivo + UN botón grande (Ir al muro, Ver tabla, Retar a alguien, Entrar a mi club) + atajos chicos con icono. Social suma Noticias y muestra la última noticia primero. Botón principal editable en PRINCIPAL (index.astro). Tests 466 OK, build 48 páginas.

### Ronda 312 (cuenta WEB, borrador): prueba de 3 diseños en la portada: Social = mosaico de iconos, Competencia = una grande y dos chicas, Duelos y Mi Club = vista en vivo. Se cambia en VISTA (index.astro). Tests 466 OK, build 48.

### Ronda 313 (cuenta WEB, borrador): vuelve el giro de las 4 ventanas (toca y gira, atrás = todas las acciones) manteniendo los nuevos diseños al frente. Tests 466 OK, build 48.

### Ronda 314 (cuenta WEB, borrador): el frente de las 4 ventanas vuelve a ser simple (solo lo en vivo); los diseños nuevos (mosaico, grande, botón+atajos) salen AL GIRAR. Tests 466 OK, build 48.

### Ronda 315 (cuenta WEB, borrador): PANEL DEL SITIO /panel/ (solo admin): portada (mostrar/ocultar y ordenar las 4 ventanas, diseño al girar, botón grande, atajos añadidos, título y frase), menú de arriba y barra lateral (quitar/poner botones), con Guardar · Deshacer · Rehacer · Volver al original. Base: migración 108 (sitio_ajustes + historial, RPC sitio_estado/guardar/mover) — PENDIENTE de pegar en Supabase (el MCP se canceló). core/sistema/sitio.js + test, features/sitioAplicar.js (boot). Tests 473 OK, build 49.

### Ronda 316 (cuenta WEB, borrador): Panel del sitio VISUAL: la portada se edita como lienzo (ventanas que se arrastran, ojo para ocultar, flechas, clic para editar con dibujitos de cada diseño); menú de arriba y barra lateral como botones que se tocan (se tachan al ocultar). Vista en vivo al cambiar. Probado con sesión admin simulada. moverA() en core/sistema/sitio.js + test. Tests 474 OK, build 49.

### Ronda 317 (cuenta WEB, borrador): Panel más ordenado: 3 pestañas grandes (Portada · Menú de arriba · Barra lateral), ayuda de una línea por pestaña, editor de la ventana en columna lateral fija, botones del menú con su icono y nombre limpio. Tests 474 OK, build 49.

### Ronda 318 (cuenta WEB, borrador): FX.sinIconosWeb: se quitan los iconos decorativos de TODA la web (los pegados a un texto; js/features/sinIconosWeb.js + styles/sinIconosWeb.css). Quedan flechas, chevrones, ✕, ✓, + y botones solo-icono. Barra lateral: monograma de 2 letras en vez de icono. Se apaga con FX.sinIconosWeb=false. Tests 474 OK, build 49.

### Ronda 319 (cuenta WEB, borrador): librerías nuevas: sortablejs (arrastrar en el panel con mouse y dedo), motion (animación del editor del panel), canvas-confetti (features/celebrar.js, al guardar el panel; FX.confeti), uplot (features/grafico.js pintarLinea, listo; aún sin usar en ninguna página), lenis (scrollSuave.js, FX.scrollSuave=false por defecto), PWA (public/sw.js + offline.html + features/pwa.js; FX.pwa). Probado: arrastre, guardar con confeti, service worker registrado. Tests 474 OK, build 49.

### Ronda 320 (cuenta WEB, borrador): (1) Gráfico «Evolución de puntos (los 4 primeros)» en Liga (uPlot, plegable cerrado; core/ligaStats.evolucionPuntos + 2 tests; estilos en styles/uplot.css). (2) Iconos: se cambian los iconos genéricos Font Awesome por Phosphor LIGHT (trazo fino) con la tabla data/iconosFinos.js (~190 equivalencias); los sin equivalencia pegados a texto se ocultan; arrows/✕/✓ se quedan. Barra lateral con iconos finos otra vez (monograma solo de respaldo). Tests 476 OK, build 49.

### Ronda 321 (cuenta WEB, borrador): librerías Fuse.js (buscador tolera errores de escritura) y Floating UI (el menú de pilares no se sale de la pantalla). Gráficos nuevos: «Goles por fecha» en Liga (uPlot barras, plegable cerrado; core/ligaStats.golesPorFecha + test) y «Gráfico de los 8 primeros» en Ranking (barras, plegable). Pendiente: gráfico en perfil de jugador.

### Ronda 322 (cuenta WEB, borrador): iconos Phosphor pasan de Light a Bold (más presencia); cambio en styles/global.css y features/sinIconosWeb.js. Si aún se ven suaves: probar 'fill'.

### Ronda 323 (cuenta WEB, borrador): iconos Phosphor pasan de Bold a Fill (rellenos). Para volver: cambiar 'fill' por 'bold' en styles/global.css y 'ph-fill' por 'ph-bold' en features/sinIconosWeb.js.

### Ronda 324 (cuenta WEB, borrador): iconos vuelven a Bold y ganan presencia (tamaño 1.2em + trazo extra .35px en styles/sinIconosWeb.css).

### Ronda 325 (cuenta WEB, borrador): el estilo «sin huella de IA» ahora cubre también database, tienda, palmares, premios, logros, envivo y ahora (solo quedan fuera la portada y Duelos, que tienen diseño propio). Revisado: perfil de jugador ya tenía gráficos (barra G/E/P, goles, tendencia) y el menú ya está agrupado (Competiciones/Jugar/Comunidad).

### Ronda 326 (cuenta WEB, borrador): clips de portada aceptan Twitch (slug del clip) y Kick (canal) además de YouTube: core/comunidad/clips.js (+test), highlights.js e index.astro. Los clips de YouTube de ejemplo siguen y la sección sigue oculta (FX.highlightsDemo) hasta que Fralex dé sus clips reales.

### Ronda 327 (cuenta WEB, borrador): Panel con 2 pestañas nuevas: «Textos» (cambia el título h1 de cada página; vacío = original) y «Enlaces» (hasta 4 botones nuevos en la barra lateral y el pie). core/sistema/sitio.js (textos, enlaces + test), sitioAplicar.js, panel.js. No hace falta migración (la config es jsonb). Nota: del h1 solo se cambia el último trozo de texto, así palabras con degradado anteriores (p. ej. «Galaxy») se mantienen.

### Ronda 328 (cuenta WEB, borrador): barra fija inferior SOLO en celular (Inicio, Liga, Duelos, Mi club, Yo), patrón de apps de apuestas. components/BarraInferior.astro + styles/barraInferior.css + FX.barraInferior. El botón «En vivo» y el chat suben para no taparse.

### Ronda 329 (cuenta WEB, borrador): «Tu próximo partido» fijo (cupón de apuestas): core/competicion/proximoPartido.js (+test), features/proximoPartido.js, FX.proximoPartido. Solo con sesión y partido ACEPTADO/EN_JUEGO; oculto en Duelos y Mis partidos. NO probado con sesión real (solo la parte visual). Hora local ya existía en Duelos (regionAhora).

### Ronda 330 (cuenta WEB, borrador): «Empieza en 3 pasos» en la portada solo para quien no tiene sesión (features/primerosPasos.js; estilos en styles/barraInferior.css). Pendiente de las ideas de apuestas/gaming: franja de aliados (no hay datos), inicio personalizado con sesión, números con color suave, cartera.

### Ronda 331 (cuenta WEB, borrador): números en vivo con destello suave verde/rojo (features/numerosVivos.js, marca data-vivo-num; puesto en las cifras del pulso de la portada). Para usarlo en otro número: añadir data-vivo-num al elemento.

### Ronda 332 (cuenta WEB, borrador): revisión de las 49 páginas en PC (1280) y celular (390): 0 errores JS, 0 archivos rotos, 0 desbordes horizontales. Corregido texto <12 px (text-[9/10/11px]→12px en .astro/.js, pilar-tabs-tit, vit-torneo, vit-ayuda, mg-chip, <small> con mínimo 12px, pc-k/pc-apodo). Limitación: en el entorno de pruebas Supabase está bloqueado, así que NO se probó nada con datos reales ni con sesión (salen «Failed to fetch»).

### Ronda 333 (cuenta WEB, borrador): scroll suave (Lenis) ENCENDIDO (FX.scrollSuave = true). Solo con mouse; apagado con Animaciones→Reducidas. Probado: la rueda avanza con inercia (155 px a los 80 ms, 600 px al final), sin errores. Para apagarlo: scrollSuave: false en data/experimento.js.

### Ronda 334 (cuenta WEB, borrador): Duelos: (1) «Tu próximo partido» arriba con la tarjeta completa y sus botones (usa core/proximoPartido; #tu-partido/#tp-card), (2) cifras en vivo (retos abiertos · en juego · tuyos) con destello, (3) vacío útil con botón «Lanzar reto», (4) «Alquilar host» y «Actualizar» con texto también en celular. El formulario YA tenía modo rápido (duelosPro, «Detalles de la sala · Cambiar»): se probó un plegable propio y se revirtió por duplicado. NO probado con retos reales (Supabase bloqueado en pruebas). Pendiente: confeti/ELO animado tras ganar, rivales sugeridos por ELO.

### Ronda 335 (cuenta WEB, borrador): choque de numeración: mi migración del panel era 108_sitio_ajustes.sql y la otra cuenta creó 108_economia…; renombrada a 114_sitio_ajustes.sql (solo el archivo del repo; en la base ya estaba aplicada, no hay que volver a ejecutarla). Mensaje del panel actualizado.

### Ronda 336 (cuenta WEB, borrador): NUEVA página /alquilar-host/ («Alquilar host», active=hosts, pilar Jugar > Partidos): catálogo de hosts con buscador, filtro por juego, «acepta gemas», orden (ping/precio/alquileres), tarjeta con avatar, juegos, software, Mbps, ping coloreado, precios (S/ y 💎), notas, CONTACTO con botón Copiar y solicitud de alquiler; pestañas «Mis alquileres» y «Ofrecer mi host» (la oferta ahora guarda el campo contacto, antes se enviaba null). core/competicion/hostsCatalogo.js (+test), features/alquiler.js exporta formSolicitud/accionAlquiler/enviarSolicitud. El botón de Duelos es ahora un enlace a la página (el modal antiguo ya no se usa). Probado con sesión y datos SIMULADOS (3 hosts); la base real no se pudo leer. El contacto lo ve cualquier usuario con sesión (RLS de ofertas_host).

### Ronda 337 (cuenta WEB, borrador): Alquilar host tras simular un alquiler completo. Arreglado: (1) CONTACTO PRIVADO: solo lo recibe el cliente cuando el host acepta (migración 115_alquiler_contacto_privado.sql: revoke select en ofertas_host + columnas públicas, mi_oferta_host(), mis_alquileres con otro_id/otro_username/contacto) — EL USUARIO DEBE EJECUTARLA en Supabase; (2) total estimado en vivo en el formulario; (3) fecha con min/max; (4) «Escribir mensaje» y «Ver perfil» en Mis alquileres; (5) aviso «choca con otro alquiler» para el host; (6) «Ofrecer mi host» avisa si aún no eres host aprobado; (7) plural hora/horas. Pendientes (necesitan SQL o más trabajo): caducar solicitudes sin respuesta a las 48 h, valoraciones del host, horarios disponibles, avisos que lleven a la página.
### Ronda 338 (cuenta Opus, borrador): PREPARACIÓN minifaces del parche Conmegol en las cartas de Mi club (pedido de Fralex: que la foto de la carta sea su miniface del juego, mejorada). Nuevo `tools/minifaces/mejorar.py`: lee .dds/.png, agranda x4 con Real-ESRGAN x4plus (pesos BSD-3 de GitHub, sin basicsr; alpha con Lanczos) y guarda .webp de 256 px. Probado en la nube: ~5 s por cara (CPU). FALTA: los archivos del parche (minifaces + Player.bin para casar ID ↔ nombre); este chat no estaba enlazado a la PC.
### Ronda 339 (cuenta Opus, borrador): MINIFACES DEL JUEGO en Mi club y en la ficha del futbolista. Fuente: parche Conmegol de la PC de Fralex (solo lectura, enlazado por el puente). Prioridad = la del juego: livecpk `Logos/common/render/symbol/player` (3.704) > download/dt80_700…100 > Data/dt14_all (Konami). `tools/minifaces/cpk.py` = lector .cpk (tablas @UTF, cifrado XOR, CRILAYLA) sin modificar nada. Cruce nombre web ↔ Player.bin (nombre en +251, pid en +8; Team.bin nombre +368; PlayerAssignment 16 B: id, pid, equipo, flags); con duplicados gana el que tiene cara 3D en livecpk Faces + equipo de club. 308/314 cruzados → **pes_id guardado en lm_jugadores** (ojo: ya NO borrar «pes_id is null» antes de importar el catálogo; el import actualiza estas filas). 254 con cara → mejoradas con Real-ESRGAN **x2plus** (~3 s/cara; quita el borde blanco del alpha) → `public/minifaces/<pes_id>.webp` 320 px (4,9 MB) + lista `src/data/minifaces.js`. `minifaceUrl()` en fotoFutbolista.js: si hay cara del juego manda sobre Wikipedia en las cartas (`data-pes`, `.con-miniface`) y es la 1.ª foto del carrusel de la ficha (`img.es-mini`, crédito «Cara del juego»), con las de Wikipedia detrás. Nota temporal de la ficha ahora depende de `fuente`. Sin cara (56): canteranos/fichajes nuevos que el parche no trae; 6 sin cruce (Salmon, Harriman-Annous, Pavić, Santos Daiber, T. Thompson, C. Kiala). En la PC quedó `Conmegol Patch\_phoenix_web_minifaces\minifaces.zip` (copia de trabajo, se puede borrar).

### Ronda 340 (cuenta WEB, borrador): PRIMERA ISLA DE REACT (prueba). Instalados @astrojs/react, react, react-dom (integración en astro.config.mjs). Página /laboratorio/ (sin enlace en el menú) con `src/islas/CentroPartido.jsx`: barra de minuto, marcador, jugadas, estadísticas y alineaciones con datos INVENTADOS. Lógica sin React en `src/js/core/competicion/centroPartido.js` (+ tests/centroPartido.test.mjs). Regla «Cuándo React y cuándo JavaScript» escrita en CLAUDE.md. 490 pruebas ok, build de 51 páginas, 0 errores JS, sin desborde en PC/celular. Las demás páginas NO cargan React. Pendiente: que Fralex la pruebe y decida si sigue con más islas.

### Ronda 341 (cuenta WEB, borrador): RADAR «ESTILO FIFA» en la ficha del jugador (/jugador/?id=…). Hexágono grande con los 6 ejes (Ataque, Creación, Técnica, Defensa, Presión, Mentalidad = los mismos de core/jugadores/estilo.js), números de colores por nivel, lista con barras y «Media de ejes». Toca o pasa el mouse por un eje y se ve de qué stats sale. Lógica pura en `core/jugadores/radarFifa.js` (+ tests/radarFifa.test.mjs), pantalla en `features/radarFifa.js`, estilos al final de `styles/perfilJugador.css`, bandera `FX.radarFifa` (false = vuelve a verse solo el radar pequeño de Análisis). Los futbolistas de la Liga Máster (/futbolista/) NO lo llevan: solo tienen «media», no las 14 stats. Probado con ficha inventada en PC y celular: 496 pruebas ok, build de 51 páginas, 0 errores JS, sin desborde. Arreglado en la prueba: con mouse el hover marcaba el eje y el clic lo desmarcaba. NO probado con fichas reales (Supabase bloqueado en pruebas).
### Ronda 342 (cuenta Opus, borrador): migración `116_limpiar_registro_cron.sql`: el registro de pg_cron (`cron.job_run_details`) crecía ~5.600 filas/día (~30 MB/mes, ya 12 MB = lo más pesado de la base) porque 4 tareas corren cada minuto. Borra lo de más de 7 días y agenda la tarea diaria `limpiar-registro-cron` (09:23 UTC = 04:23 Lima). `apply_migration` fue cancelado → se le entregó el SQL a Fralex para pegarlo en el SQL Editor; verificar con `select jobname from cron.job where jobname='limpiar-registro-cron'`.
### Ronda 343 (cuenta Opus, borrador): documentos en GitHub: `docs/web-pes-link/WEB-PES-LINK.md («MINIFACES»)` (guía completa de las minifaces: fuentes, formato de los .bin, cruce, herramientas, cómo repetirlo) y `docs/web-pes-link/WEB-PES-LINK.md («PROMPT-SISTEMA-DATOS-WEB-PES»)` (prompt para que Claude Code haga la sincronización de datos web ↔ PES en 6 fases). REGLA NUEVA de Fralex (16-oct): anotaciones y avances importantes SOLO a GitHub por ahora (no tiene Drive); cuando vuelva a tener Drive, copiar todo allí también. PENDIENTE DRIVE: estos dos documentos + informes desde el 16-oct.

### Ronda 344 (cuenta WEB, borrador): ORDEN VISUAL tras revisar las 51 páginas en PC y celular. (1) Cabeceras en estilo tarjeta (glass-panel, 36,8 px) en Historial, Jugadores (database), Noticias y Configuración; regla: gran título con degradado solo en portadas/información. (2) En celular (con barra inferior) se oculta el «Explora» del pie, salvo que el Panel haya añadido enlaces propios (`[data-enlace-extra]`). (3) Tiras `.pilar-tabs`: desvanecido en el borde con más contenido y la pestaña activa se centra (`features/tirasDeslizables.js`, cargado desde boot.js). 496 pruebas ok, build de 51 páginas, 0 errores JS, sin desborde. Norma nueva en CLAUDE.md: anotaciones solo a GitHub por ahora (Drive cuando vuelva). Informe completo: docs/bitacoras/HISTORIA-WEB.md («INFORME-16-OCT-2026-REACT-HERRAMIENTAS-Y-ORDEN-VISUAL»); la investigación de apuestas/gaming se copió a docs/. Pendiente: Social/Comunidad sin título visible y textos legales (decidir), revisar con datos reales.
### Ronda 345 (cuenta Opus, borrador): IA EN LA WEB · Parte 1 BANDEJA DE APROBACIÓN (plan: `docs/comunidad/COMUNIDAD.md («PLAN-IA-WEB»)`). Migración `117_ia_bandeja.sql`: tablas `ia_propuestas` (tipo noticia|aviso, prioridad 1-3, estado pendiente/aprobada/rechazada, noticia_id único) e `ia_resumenes` (un texto por día), RLS solo lectura para moderador/admin y NADIE escribe desde la web (solo la tarea programada con permisos de servidor); `ia_bandeja(p_historial)` entrega propuestas + noticia completa (los borradores solo los lee un admin por RLS) y `ia_revisar(id, aprobar, motivo)` exige moderador/admin, anota quién/cuándo y si es noticia la PUBLICA (rechazar = sigue borrador). Página `/bandeja-ia/` (grupo Staff, permiso `bandejaIA` en core/sistema/roles.js): resumen del día arriba, tarjetas con prioridad y ✅/❌ (avisos: Entendido/Descartar), historial y guía plegados. Lógica pura `core/comunidad/bandejaIA.js` (texto seguro sin HTML inyectado) con test. `apply_migration` cancelado → SQL para Fralex.
### Ronda 345b (cuenta Opus, borrador): IA EN LA WEB · Parte 2 y 3. (2) Tarea programada «Redacción IA Phoenix» (trig_015J8uKVSgYhWkSXE1P8FRZx, 9:54 Lima) actualizada a v2: tono pícaro SOLO deportivo y ligero (nunca sobre la persona, sin frases inventadas), noticias de fichajes desde `lm_movimientos` 48 h (slug `ia-fichaje-<id>` o `ia-mercado-<fecha>` si >3), cada borrador → `ia_propuestas`, avisos (máx. 3/día) y `ia_resumenes` diario; si la bandeja no existe, sigue haciendo borradores y avisa. (3) CHAT DE AYUDA: Edge Function `ayuda-ia` DESPLEGADA (verify_jwt=false, comprueba la sesión dentro; CORS POST/OPTIONS) — sin herramientas ni acceso a datos, prompt de sistema con reglas (no da gemas, no pide contraseñas, no opina de personas), máx. 8 mensajes, 450 tokens, modelo `IA_MODELO` (por defecto claude-haiku-5-5); límites `IA_MAX_USUARIO`=15/día y `IA_MAX_TOTAL`=300/día con `ia_chat_turno` (migración `118_ia_chat_uso.sql`, solo service_role; limpieza diaria 30 días). Sin `ANTHROPIC_API_KEY` en los secretos responde NO_CONFIGURADO. Página `/ayuda-ia/` (FX.ayudaIA, grupo Comunidad, sugerencias, «te quedan N preguntas», abre el login si no hay sesión). Lógica `core/comunidad/ayudaIA.js` con test. FALTA: Fralex pega el SQL 116+117+118 y pone la clave en Secrets.

### Ronda 346 (cuenta WEB, borrador): MODO LIGERO AUTOMÁTICO para celulares lentos (pedido de Fralex: «solo si el celular tiene problemas de rendimiento»). `core/sistema/rendimiento.js` (puro, +tests/rendimiento.test.mjs), `features/modoLigero.js`, `styles/modoLigero.css`, arranque desde boot.js. Decide así: (1) señales fuertes (ahorro de datos, ≤ 2 GB de memoria, red 2G) → ligero ya; (2) si no, mide los cuadros mientras la persona DESLIZA la página y, si 1 de cada 4 tarda > 34 ms, lo activa. «Ligero» = cuenta como «Animaciones: reducidas» (apaga 3D/efectos) + se quita el fondo borroso (backdrop-filter) y los paneles quedan más sólidos. Se guarda 14 días en `pes-rend-ligero` y se aplica antes del primer pintado (script del <head> en Layout.astro). «Ajustes → Animaciones → Siempre activas» lo anula; «Reducidas» ya elegido no lo necesita. `movimientoReducido(a, sistema, ligero)` recibe el 3.er dato. Aviso (toast) una vez al activarse. TRAMPA de la build: el minificador solo conserva el `backdrop-filter` sin prefijo si el `-webkit-backdrop-filter` va ANTES en la misma regla. Probado en celular simulado: rápido → no se activa; CPU 8× más lenta → se activa; ahorro de datos → se activa; «Siempre activas» → no; 501 pruebas ok, build de 51 páginas. NO probado en un celular real: Fralex debe abrir la web de prueba en el suyo (si no se activa solo, desliza un rato la página).

### Ronda 347 (cuenta WEB, borrador): ANTI-LAG celular (sin perder nada visual). (1) Escudos flotantes: se pausan fuera de pantalla (`features/pausaFueraDePantalla.js`, `[data-fuera]`). (2) Punto «estado» ahora pulsa con transform/opacity en un pseudo-elemento (antes box-shadow, que repinta). (3) Estrellas de la portada a ~30 fps y dpr máx 1,5 en celular. Pendiente: recortar fuentes de iconos (Phosphor+FA) y CSS sin usar. 506 tests OK, build 53 páginas.

### Ronda 348 (cuenta WEB, borrador): ARREGLO — la lista de Contactos/Chats volvía sola al inicio. Cada aviso en vivo repintaba la lista con innerHTML y el scroll se reiniciaba. Ahora `repintar()` en `features/chatFlotante/contactos.js` conserva el scroll y no toca el DOM si el HTML no cambió. 506 tests OK.

### Ronda 352 (sesión Liga Máster 127, borrador): Liga Máster de cada PC desde el formulario único (migración 127)
- Tipos `dinero` y `valor` encendidos (solo destino Liga Máster). Fichaje con destino lm/ambos: bloque `lm` con usuario, partida, monto, sueldo, cláusula, fin de contrato y dorsal.
- Disparador sobre `pes_cambios`: cada cambio con parte LM (fichaje, dinero, valor, stats/info) se traduce al canal `lm_pc_cambios` y queda `estado_lm = publicado` (o `error` + motivo). Anular = deshacer en cada partida.
- Edge Function `mercado`: `GET /v1/liga/cambios?ambito=pc` (firmado Ed25519) y `POST /v1/liga/aplicado-pc` (historial `lm_pc_partidas` / `lm_pc_resultados` + `pes_eventos` destino lm).
- Formulario: `src/js/features/cambios/ligaMaster.js` (registra dinero y valor; exporta `camposLmFichaje` y `pintarHistorialLM`), lógica pura `core/pes/ligaMasterPc.js` (+ tests/ligaMasterPc.test.mjs 6/6). Falta que la página de la 125 lo importe.
- Contrato: docs/web-pes-link/CONTRATO-WEB-PES.md §2 (fichaje·LM, dinero, valor, stats lm) y §3b «Cómo lo hace la 127». PC: PhoenixSync 0.2.1 `lm-sincronizar` (rama mercado-fase0).

### Ronda 362 (hilo «Decisiones pendientes de la web», borrador): Beta 1.14.0 · Jugadores con panel lateral + decisiones del pase
- Fralex (21-oct) respondió «SÍ a todo» a lo recomendado. **Pase:** 1 SÍ · 2 SÍ · 3 SÍ · 4 SÍ · 5 NO por ahora (patrocinadores) · 6 NO por ahora (overlay TikTok de pago) · 7 SÍ; anotado en `docs/economia/ECONOMIA.md («DISENO-PASS-Y-ORGANIZADORES»)` §6; el código de la 123 ya era eso. **Etiquetas pequeñas sobre los títulos:** se quedan (identidad). **Siguiente página de la pasada visual:** Jugadores.
- `FX.jugadoresRiel`: panel lateral como la Sala de fichajes. PC (≥ 1024 px): columna pegada a la izquierda con «Posición» (Todas / Porteros / Defensas / Medios / Delanteros, punto con el color de la línea) y «Equipo», cada uno con su número; el desplegable de equipo de la barra se oculta pero sigue mandando (el panel lo cambia). Celular: solo las posiciones, como fichas deslizables. Vista nueva **«Lista»** (una fila por jugador: n.º, posición con color, nombre y apodo, club, media y balanza para comparar; tocar la fila abre el perfil). Archivos: `core/jugadores/riel.js` (+ `tests/riel.test.mjs`), `features/jugadoresRiel.js`, `styles/jugadoresRiel.css`, `pages/database.js`, `pages/database.astro`. Sin BD.
- 642 pruebas OK, build 59 páginas; prueba de páginas 57–58/59 (fallos sueltos en /comunidad y /mi-club por una fuente que se corta al redirigir, no por este cambio). Visto con datos de prueba en 1440 y 390 px.
- Caras (hilo 8): decidido subir solo los 7 u 8 recortes buenos; los recortes están en las notas de otra sesión en la PC de Fralex, falta la ruta.

### Ronda 363 (hilo «Decisiones pendientes de la web», borrador): Beta 1.15.0 · patrocinadores, overlay de torneo premium y 8 caras
- Fralex eligió «Las dos cosas»: preguntas 5 y 6 del pase pasan a SÍ.
- **Patrocinadores** (migración **139** `139_patrocinios.sql`: la TABLA ya está aplicada por MCP como 139a; las 3 funciones (139b) se colgaban en el conector y se entregaron a Fralex para el SQL Editor): tabla `patrocinios` (torneo/clan, logo https, web, desde/hasta, activo, nota privada) con RLS: el público lee solo los vigentes y sin la nota; escribe solo el admin por RPC `patrocinio_guardar` / `patrocinio_borrar`; `patrocinios_admin_listar` le da todo. Web: sección «Patrocinadores» en Moderación (`features/patrociniosAdmin.js`, solo admin), tira «Patrocinado por» en la cabecera del torneo y en los clanes (`features/patrocinios.js`, `styles/patrocinios.css`; sin tabla no muestra nada). Lógica `core/economia/patrocinios.js` (+ `tests/patrocinios.test.mjs`).
- **Overlay de transmisión** `/overlay-torneo/?id=N` (página suelta sin menú, fondo transparente, 9:16): último resultado grande con destello al cambiar, próximos 3, progreso, campeón, patrocinador; cada 15 s; `?tema=sudario`, `?demo=1`. Solo si el torneo es premium (`torneo_premium`, lectura pública). Enlace y botón Copiar en «Opciones del organizador» del torneo premium. Lógica `core/competicion/overlay.js` (+ `tests/overlay.test.mjs`).
- **Caras (hilo 8):** 8 recortes buenos de fotos libres de Wikimedia (Alisson, Conor Bradley, Jonas Urbig, Max Dowman, Mika Godts, Myles Lewis-Skelly, Rico Lewis, Rodrigo Mendoza) en `public/minifaces/`, añadidos a `MINIFACES`; `MINIFACES_FOTO` guarda autor, licencia y página, y la carta y la ficha nombran al autor (CC BY / BY-SA). Los otros 15 recortes se descartaron. Origen: carpeta de notas de la sesión de caras en la PC de Fralex.
- 648 pruebas OK, build 60 páginas.

### Ronda 363b (hilo «Decisiones pendientes de la web», borrador): Beta 1.15.1 · migración 139 completa y documentación
- 139 aplicada entera por MCP en 3 partes (139a tabla + RLS, 139b `patrocinios_admin_listar` + `patrocinio_guardar`, 139c columna `archivado` + `patrocinio_borrar` que ARCHIVA). Probada en la base (TODO_OK REVERTIDO). El `DELETE` en la función hacía colgar el conector. «Borrar» en Moderación pasa a «Quitar» (archiva).
- `tools/humo/abrir-paginas.mjs` ignora `net::ERR_ABORTED` (redirecciones de /mi-club/ y /comunidad/): 60/60.
- Bitácora `docs/bitacoras/HISTORIA-WEB.md («BITACORA-21-OCT-2026-HILO-DECISIONES-WEB»)` y guía `docs/guias/GUIA-WEB.md («GUIA-NOVEDADES-21-OCT-2026»)`, enlazadas en `docs/INDICE.md`; copia en Drive («Phoenix Link — Guías y logros»).

### Ronda 364 (hilo «Dinero, apuestas y riesgo legal», borrador): Beta 1.15.2 · ascuas solo gratis
- Auditoría de dinero real: pagos apagados, 0 órdenes, 0 gemas, 0 pozos; hueco soles → gemas → pase premium → ascuas → pozo. Informe `docs/economia/AUDITORIA-DINERO-Y-APUESTAS-21-OCT-2026.md`.
- Migración 140 (aplicada por MCP, probada en transacción deshecha 11/11): premios premium en ascuas → 18 objetos; premium repetido sin compensación; trigger `trg_libro_ascuas_solo_gratis` (ascuas solo de fuentes gratis, pozos solo ascuas, compras con dinero solo gemas); alquiler de host solo pago por fuera.
- Web: `pase.js` (mensaje «Ya tenías…»), `pase-demo.js`, `alquiler.js` (sin gemas). 648/648 pruebas, build OK.
- `docs/economia/RIESGOS-LEGALES.md`: apuestas en Perú, venta de gemas, Konami/PES, caras/parches, Parsec (no es asesoría legal).
- Documentación unificada (regla de Fralex: pocos documentos largos): auditoría + riesgos legales → `docs/economia/BITACORA-DINERO-APUESTAS-Y-LEGAL.md` (paso a paso, errores, medidas).

### Ronda 365 (hilo «Noche de liga real con amigos», borrador): Beta 1.16.0 · Liga de amigos
- La liga oficial (la única que recibe resultados de Link) se crea, se inscribe y genera calendario desde la web; tabla desde `liga_tabla` con Realtime. Migración 142; `src/pages/liga-amigos.astro`, `src/js/pages/ligaAmigos.js`. Documento único con guía para amigos, guion de la noche y qué medir: `docs/liga-y-torneos/NOCHE-DE-LIGA-CON-AMIGOS.md`.

### Ronda 366 (mismo hilo, borrador): Beta 1.16.1 · un solo creador de ligas y torneos
- El staff hace OFICIAL una liga todos contra todos de /torneos/ y pasa a la Liga de amigos con sus inscritos (migración 143, `torneo.js`, `torneos/api.js`); las casuales siguen con resultados a mano.
- Migraciones 142 y 143 APLICADAS por MCP y probadas en transacción deshecha (crear, inscribir, calendario, hacer oficial, finalizar); base limpia. Siguiente migración libre: **144**.
- Pendiente de Fralex: web › Competiciones › Ligas › Liga de amigos › «Crear una liga» › «Copiar enlace» y mandarlo a sus amigos (guía en NOCHE-DE-LIGA-CON-AMIGOS.md, sección 2).

### Ronda 367 (hilo «Trabajar a la par con otra cuenta», borrador): solo documentación · dos cuentas de Claude
- Nuevo cuaderno compartido `TRASPASO.md` (raíz) con reglas, candados por frente, mapa de carpetas de la PC y estado de cada hilo; revisor de solo lectura `tools/traspaso-cuentas.ps1` (sin probar en Windows). Detalle y paso a paso: `docs/trabajo-en-equipo/TRABAJO-EN-EQUIPO.md` (parte 5). `VERSION_BETA` sin cambio (1.16.1).

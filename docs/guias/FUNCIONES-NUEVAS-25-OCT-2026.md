# Funciones nuevas del 25-oct-2026 (Cuenta 2) · guía, cómo funcionan y cómo se probaron

Pedido de Fralex: «Hazlo todo, todas las ideas… blinda todos los escenarios posibles». Orden elegido por él («lo más rápido primero»):
1. Tutorial de bienvenida · 2. Calendario personal · 3. Estado de los hosts · 4. MVP del partido · 5. Goleadores automáticos ·
6. Prode (exacto 10, ganador 3, tope 100/semana, solo ascuas gratis) · 7. Clan contra clan · 8. Draft en vivo (Liga Máster y torneos).
Base de datos: se intenta aplicar; si Supabase cancela el permiso, el SQL queda para que Fralex lo pegue (migraciones reservadas 146–152).
Cada parte se AÑADE aquí al terminarla: qué es, cómo se usa, piezas, blindaje (qué puede salir mal y qué se hizo) y cómo se probó.

Herramienta de pruebas visuales (nube): Chromium de `@sparticuz/chromium@131` (npm, trae el navegador dentro; los demás caminos de
descarga están bloqueados por el proxy) en `/tmp/chromium`. `CHROME_PATH=/tmp/chromium npm run test:paginas` funciona con él.

---

## 1. Tutorial de bienvenida (beta 1.19.0 · sin base de datos)

**Qué es:** un recorrido de ~1 minuto (7 pasos: bienvenida, Mi club, Jugar, Comunidad, Competiciones, Buscar, Avisos y cierre) que
ilumina los botones reales de la página. Sale solo **la primera vez** que alguien abre la portada en ese navegador.
**Repetirlo:** Configuración → Datos → «Ver el tutorial otra vez», o `?tutorial=1` en cualquier página.

**Piezas:** `src/js/core/sistema/tutorial.js` (pasos y reglas puras) + `tests/tutorial.test.mjs` · `src/js/features/tutorial.js`
(pantalla) · `src/styles/tutorial.css` · arranque en `src/js/boot.js` (código descargado aparte y después de pintar) ·
acción `tutorial` en `src/data/ajustes.js` y `src/js/pages/ajustes.js`. Clave del navegador: `pes-tutorial-v1` (`visto`/`saltado`).

**Blindaje (qué podía salir mal → qué se hizo):**
- Un botón no existe (sin sesión no hay campana) u está oculto → ese paso se salta; cada paso prueba el selector de PC y el de celular.
- Un selector raro lanza error → se prueba el siguiente; si casi no queda nada, no se abre.
- Hay otra ventana abierta (bienvenida, registro, menú lateral) → espera hasta ~18 s y si sigue, no molesta (sale otro día).
- Cambio de tamaño, giro o scroll → se reacomoda (requestAnimationFrame); la tarjeta nunca se sale de la pantalla (arriba, abajo o centrada).
- El elemento está fuera de la vista → se desplaza hasta él (sin animación con «menos movimiento»).
- «Menos movimiento» → sin transiciones. Teclado: Esc cierra, ← → Enter navegan, el foco no sale de la tarjeta y vuelve a donde estaba.
- Modo privado (no se puede guardar) → funciona igual; solo no recuerda que ya se vio. Dentro de un iframe → nunca arranca.
- Cualquier error al abrir → se cierra limpio y lo registra en la consola.
- La sombra gigante (`box-shadow` de 9999 px) para oscurecer **no se dibujaba** en Chromium: se cambió por una capa SVG con un
  «agujero» (`fill-rule: evenodd`), que funciona en todos.

**Cómo se probó:** `npm test` (4 pruebas nuevas), build, 61/61 páginas, y capturas reales en 390×844 y 1440×900: arranca solo,
avanza con flechas, ilumina el botón correcto en cada tamaño, y Esc lo cierra y guarda `saltado`.

---

## 2. Calendario personal (beta 1.20.0 · sin base de datos)

**Qué es:** botón «Añadir a mi calendario» en **Mis partidos** (duelos agendados con hora), en cada **evento** próximo y en la
**ficha de un torneo** con fecha de inicio. Abre una ventana con un botón de **Google Calendar** por cada partido y
**«Descargar (.ics)»**: un archivo que abre el calendario del celular o de la PC. Cada uno trae un **aviso 30 minutos antes**.

**Piezas:** `src/js/core/sistema/calendario.js` (archivo .ics y enlace de Google, puro) + `tests/calendario.test.mjs` (6 pruebas) ·
`src/js/features/calendario.js` (ventana y descarga) · `src/styles/calendario.css` · botones en `src/pages/mis-partidos.astro` +
`src/js/pages/misPartidos.js`, `src/js/pages/eventos.js` y `src/js/pages/torneo.js`.

**Blindaje:**
- Horas en UTC (`Z`) → sirven en cualquier zona horaria; el calendario de cada uno las muestra en su hora.
- Identificador fijo por partido (`duelo-7@phoenixevolution`) → añadirlo dos veces actualiza el mismo evento, no lo duplica.
- Textos con comas, punto y coma, saltos de línea, comillas o emojis → escapados; líneas plegadas a 75 bytes sin partir caracteres.
- Partidos sin hora fija o que ya pasaron → no se añaden y se dice cuántos («No se añadieron: 1 sin hora fija y 1 ya pasó.»).
- Nada válido → aviso, no ventana vacía. Solo enlaces `https` en el archivo.
- iPhone: se comparte el archivo (abre Calendario); si el navegador no deja descargar, plan B con un enlace `data:` y, si
  tampoco, aviso de usar Google. Cancelar el menú de compartir no muestra error.
- Mis partidos: la variable con los agendados se declara arriba (antes podía usarse antes de existir y romper la página).

**Cómo se probó:** 6 pruebas puras; en el navegador real, la página Eventos con un evento simulado (título con «», comas y
punto y coma, descripción con salto de línea): la ventana sale, el enlace de Google es correcto y el `.ics` descargado tiene
`UID`, `DTSTART`/`DTEND` en UTC, el texto escapado y el `VALARM` de 30 min.

---

## 3. Estado de los hosts (beta 1.21.0 · migración 146 APLICADA)

**Qué es:** nueva sección en **Salas en vivo** con cada host aprobado que tiene Phoenix Link: **Sala abierta**, **En partida**,
**Encendido** o **Apagado (visto hace X)**, su región y su **ping típico** (mediana de los últimos 7 días, con semáforo:
menos de 60 ms bien, menos de 110 regular, más = alto). Se actualiza sola cada minuto.

**Piezas:** `supabase/migrations/146_estado_hosts.sql` (función `hosts_estado()`, solo lectura, sin tablas nuevas) ·
`src/js/core/comunidad/estadoHosts.js` + `tests/estadoHosts.test.mjs` (4 pruebas) · `src/js/features/salas/estadoHosts.js` ·
sección `#bloque-hosts` en `src/pages/en-vivo.astro`, conectada en `src/js/pages/enVivo.js`.

**Cómo sabe si está encendido:** Phoenix Link actualiza `dispositivos_host.ultimo_uso` en cada llamada → encendido si fue
hace menos de 5 min; la sala cuenta si su latido tiene menos de 3 min (igual que el resto de Salas en vivo).

**Blindaje / privacidad:** solo hosts aprobados o staff; nunca sale el token ni el nombre de la PC; «visto» redondeado a 5 min;
apagados hace más de 30 días no salen; ping solo con 5 muestras o más; si hay bloqueo entre tú y el host, no te sale;
sesión obligatoria; tope 100. En la web: sin sesión no pide nada; si la base no tuviera la 146, la sección se oculta sola;
otros fallos → mensaje con «Reintentar»; no se encima un pedido sobre otro.

**Cómo se probó:** 4 pruebas puras; la función se ejecutó en la base real como admin (devolvió el host de Hugo, apagado,
visto redondeado, sin ping por falta de muestras); la página carga sin errores y sin sesión la sección queda oculta.

---

## 4. MVP del partido (beta 1.22.0 · migración 147 APLICADA)

**Qué es:** cuando un duelo tiene el marcador **confirmado**, se abre 48 h una votación al mejor jugador. Votan los jugadores
y los espectadores aprobados; se vota a un jugador del duelo, nunca a uno mismo; el voto se puede cambiar mientras siga abierta.
Al cerrar, el más votado es el **MVP**; si hay empate arriba, no hay MVP. En el perfil sale «MVP ×N» junto a los duelos.

**Piezas:** `supabase/migrations/147_mvp_partido.sql` (tabla `partido_mvp_votos`; `mvp_votar`, `mvp_de`, `mvp_pendientes`,
`mvp_total_de`) · `src/js/core/competicion/mvp.js` + `tests/mvp.test.mjs` (4 pruebas) · `src/js/features/resultados/mvp.js` ·
sección `#bloque-mvp` en `src/pages/mis-partidos.astro` · contador en `src/js/pages/perfil.js`.

**Blindaje:** tabla cerrada (solo funciones); la BD valida quién vota, a quién y el plazo; un 1v1 sin espectadores NO abre
votación (siempre sería 1-1); los conteos solo se ven al cerrar (nadie se sube al carro); un voto por persona y partido;
sin migración o sin sesión el panel no aparece; botones bloqueados mientras se envía (no hay doble voto).

**Cómo se probó:** 4 pruebas puras; prueba en seco en la base real (`supabase/tests/147_mvp_partido_test.sql`, 13 casos, OK,
nada guardado); 61/61 páginas arrancan.

---

## 5. Goleadores automáticos (beta 1.23.0 · migración 148 ESCRITA, SIN APLICAR · Edge Function `goles` SIN DESPLEGAR)

**Qué es:** sección **«Goleadores de los duelos»** en `/ranking/`: futbolistas con más goles y asistencias (últimos 30 días o
siempre), con los goles que **manda Phoenix Link** al terminar un duelo jugado en su sala. Nadie los escribe a mano.

**Por qué no se aplicó:** Supabase pidió permiso para la 148 y se canceló → regla de Fralex: no se reintenta; él la pega a mano.
Mientras falte, la sección se oculta sola (la web no se rompe). La parte de Link (leer goles del juego) es de la cuenta con el
candado de Link: el contrato está en `docs/web-pes-link/CONTRATO-GOLES-LINK.md`.

**Piezas:** `supabase/migrations/148_goleadores_link.sql` (tabla `duelo_goles`; `sistema_duelo_goles_link` solo service_role;
`goleadores_comunidad`, `goles_de_duelo`) · `supabase/functions/goles/index.ts` (POST `/v1/goles/duelo`) ·
`src/js/core/competicion/goleadoresLink.js` + `tests/goleadoresLink.test.mjs` (3 pruebas) · `src/js/features/ranking/goleadores.js` ·
sección `#rk-goleadores` en `src/pages/ranking.astro`.

**Blindaje:** solo cuentan duelos con marcador **confirmado** por los dos líderes **y** cuyos goles cuadran con ese marcador
(un Link con fallo no ensucia la tabla); Link solo puede mandar goles de un duelo jugado en una sala de **esa** PC; se valida
3 veces (Link → Edge Function → BD) antes de borrar nada; reenviar reemplaza (idempotente); máx. 40 goles; nombres limpios
y sin `< >`; los autogoles no suman al goleador; interruptor del staff `phoenix_config.goles_link`.

---

## 6. Prode (beta 1.24.0 · migración 149 ESCRITA, SIN APLICAR)

**Qué es:** página nueva **/prode/** (menú Comunidad). Adivinas el marcador de los duelos agendados. **Entrar es gratis: no se
pone nada en juego** (no es apuesta). Marcador exacto = **10 ascuas**, ganador o empate acertado = **3**. Tope **100 ascuas por
semana** (lunes a domingo, hora de Lima). Se paga solo cuando los dos líderes confirman el marcador. Ranking de la semana por puntos.

**Por qué no se aplicó:** Supabase pidió permiso y se canceló → Fralex la pega a mano. Sin la 149 la página dice «llega muy pronto».

**Piezas:** `supabase/migrations/149_prode.sql` (tabla `prode_pronosticos`; `prode_pronosticar`, `prode_tablero`,
`prode_ranking_semana`; trigger `zz_prode_liquidar` en `resultados_duelo`) · `src/js/core/competicion/prode.js` +
`tests/prode.test.mjs` (4 pruebas) · `src/pages/prode.astro` + `src/js/pages/prode.js` · entrada en `src/data/site.js`.

**Blindaje:** respeta la regla 140 (ascuas solo gratis: tipo `ganado`, fuente `prode`); no puedes pronosticar un duelo donde
juegas o eres host; se cierra al empezar el duelo; clave única por pronóstico → nunca se paga dos veces; tope semanal sobre lo
ya pagado; si el prode falla, **nunca** impide confirmar un marcador (el trigger atrapa el error y deja un aviso); interruptor
del staff `phoenix_config.prode = false`; tabla cerrada por RLS.

---

## 7. Clan contra clan (beta 1.25.0 · migración 150 APLICADA)

**Qué es:** en **/clanes/**, el capitán o subcapitán reta a otro clan a una **serie al mejor de 1, 3, 5 o 7**, con plazo de
7 a 30 días. El otro clan tiene 7 días para aceptar. **Se cuenta sola:** valen los primeros N duelos 1v1 con marcador
confirmado entre un miembro de cada clan, jugados después de aceptar y antes del plazo. Gana el duelo quien hizo más goles
(empate = nadie suma). Gana la serie quien llega a la mayoría; si vence el plazo, quien tenga más puntos (igual = empate).
Sin clan se ven las últimas series de la comunidad.

**Piezas:** `supabase/migrations/150_clan_contra_clan.sql` (tabla `clan_series`; `clan_serie_proponer`, `clan_serie_responder`,
`clan_serie_cancelar`, `clan_series_de`) · `supabase/tests/150_clan_contra_clan_test.sql` · `src/js/core/comunidad/clanSeries.js`
+ `tests/clanSeries.test.mjs` (3 pruebas) · `src/js/features/clanes/series.js` · sección `#cl-series` en `src/pages/clanes.astro`.

**Blindaje:** solo líderes; no retarse a sí mismo; una serie viva por pareja de clanes y máx. 3 por clan; **solo cuentan
jugadores que ya estaban en el clan cuando se creó el duelo** (nada de fichar refuerzos al final); un duelo cuenta para una sola
serie; una serie aceptada no se cancela (solo el staff); propuestas caducan solas a los 7 días (sin cron: se calcula al leer).

**Cómo se probó:** 3 pruebas puras; prueba en seco en la base real (13 casos, OK, nada guardado); página en navegador sin errores.

---

## 8. Draft en vivo (beta 1.26.0 · migración 151 APLICADA)

**Qué es:** página nueva **/draft/** (menú Jugar). Elección **por turnos con reloj**, en orden fijo o **serpiente** (1-2-3, 3-2-1…).
Un solo motor para dos usos:
- **Liga Máster:** el staff lo crea (entran todos los clubes aprobados con DT). Cada DT elige un **agente libre**; el jugador pasa a su
  club y queda en `lm_movimientos` con tipo `draft` (para el option file, como cualquier fichaje). Si el club está lleno, su turno se salta.
- **Torneos:** el organizador escribe la lista de equipos (botón «Draft de equipos» en la ficha del torneo) y cada inscrito con cuenta
  elige con cuál juega.
Si a alguien se le acaba el tiempo, **el sistema elige por él** (Liga Máster: el libre de más media; torneo: la primera opción libre).
El organizador puede empezar, pausar (congela el reloj), reanudar y cancelar (lo ya elegido se queda).

**Piezas:** `supabase/migrations/151_draft_en_vivo.sql` (tablas `drafts`, `draft_participantes`, `draft_opciones`, `draft_picks`;
`draft_crear_lm`, `draft_crear_torneo`, `draft_control`, `draft_elegir`, `draft_estado`, `draft_disponibles`, `drafts_lista`) ·
`supabase/tests/151_draft_en_vivo_test.sql` · `src/js/core/competicion/draft.js` + `tests/draft.test.mjs` (4 pruebas) ·
`src/pages/draft.astro` + `src/js/pages/draft.js` · enlace en `src/js/pages/torneo.js` · entrada en `src/data/site.js`.

**Blindaje:** solo elige quien tiene el turno; un jugador/equipo no se elige dos veces (índices únicos) y la fila del draft se bloquea
al elegir → dos pantallas a la vez no rompen nada; un draft vivo por liga o torneo; el jugador debe seguir libre al elegirlo;
**sin cron**: el reloj se revisa cada vez que alguien mira (la sala pregunta cada 3 s) y los turnos vencidos se resuelven en cadena;
el reloj de la pantalla se corrige con la hora del servidor; confirmación antes de elegir; aviso «¡Te toca!» en la pestaña.

**Cómo se probó:** 4 pruebas puras; prueba en seco en la base real (18 casos, OK, nada guardado); sala en navegador con sesión
y datos simulados (390 px): reloj, «¡Te toca!», lista para elegir y tablero sin errores.

---

## 9. Avisos de las funciones nuevas (beta 1.27.0 · migración 152 ESCRITA, SIN APLICAR)

**Campana** (cada persona; respeta lo que apaga en Amigos → Avisos): **DRAFT** «¡Te toca elegir!» (categoría Duelos) · **MVP**
«Vota al MVP del partido» a jugadores y espectadores al confirmarse el duelo (Logros) · **PRODE** «Ganaste N ascuas» (Logros) ·
**CLAN** reto recibido (líderes del clan retado), aceptado o rechazado (líderes del que retó).
**Discord** (canal de la comunidad, solo con el webhook configurado — `select vault.create_secret('URL', 'discord_webhook');`):
empieza un draft · se acepta una serie entre clanes · resumen semanal del prode (lunes 9:00 Lima, top 5).

**Piezas:** `supabase/migrations/152_avisos_funciones_nuevas.sql` (tipos nuevos, `private.aviso_nuevo`, disparadores `zz_draft_avisos`,
`zz_clan_serie_avisos`, `zz_mvp_avisos`, `zz_prode_avisos`, tarea `prode-resumen-semana`) · iconos y destinos en
`src/js/features/notifications.js` · categorías en `src/js/core/sistema/notifs.js` + `tests/notifsTipos.test.mjs`.

**Blindaje:** ningún aviso puede romper la acción que lo dispara (cada disparador atrapa sus errores); en las cadenas de turnos
vencidos del draft no se avisa a quien ya perdió el turno; Discord nunca repite un mensaje (clave única); textos limpiados sin
menciones; si la 149 (prode) no está, la parte del prode se salta sola. El webhook de Discord **aún no está configurado**.

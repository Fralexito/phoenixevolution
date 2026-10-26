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

---

> **Actualización 13:50 (Lima):** con el permiso de Fralex se aplicaron **145, 148, 149 y 152** (y la nueva 153) y se desplegaron las
> Edge Functions **`torneos`** y **`goles`**. Pruebas en seco en la base real: 145 (15 casos), 148 (7), 149 (8: pagó 10 ascuas una sola
> vez), 152 (avisos de MVP, prode y draft). Todo lo marcado arriba como «SIN APLICAR» ya está activo.
> Cambio técnico para que Supabase no pida el permiso aparte: `create or replace trigger` en vez de `drop trigger`, y en goleadores
> los envíos repetidos marcan los goles viejos como `vigente = false` en vez de borrarlos.

---

## 10. Ficha de rivalidad (beta 1.28.0 · migración 153 APLICADA)

**Qué es:** página **/rivalidad/?a=…&b=…**: «A vs B» con victorias, empates, barra de dominio, goles totales, racha actual, mayor
goleada de cada uno, primer y último duelo y los 10 últimos partidos. Se entra desde el perfil de otra persona (botón **Rivalidad**)
o desde **Mis partidos → tus rivales de duelos**.
**Piezas:** `supabase/migrations/153_rivalidad.sql` (`public.rivalidad`, solo lectura) · `src/js/core/competicion/rivalidad.js` +
`tests/rivalidad.test.mjs` · `src/pages/rivalidad.astro` + `src/js/pages/rivalidad.js` · enlaces en `perfil.js` y `misPartidos.js`.
**Blindaje:** respeta la privacidad de los DOS perfiles (privado o bloqueo → no se ve); solo duelos confirmados en lados opuestos;
ids inválidos o iguales → mensaje claro; el botón no sale en tu propio perfil ni si lo bloqueaste.
**Probado:** 3 pruebas puras; prueba en seco en la base real (5 casos); página en el navegador con datos simulados.

---

## 11. Temporadas con premios (beta 1.29.0 · migración 154 APLICADA)

**Qué es:** cada mes (hora de Lima) es una temporada del ranking **competitivo**. El **día 1 a las 00:10** se cierra sola la anterior:
se guarda el top 10 y se reparten **ascuas gratis** (🥇 300 · 🥈 200 · 🥉 100 · 4.º–10.º 30) e **insignias** (Campeón, Subcampeón, Tercero,
Top 10) que salen en el perfil. Aviso en la campana a cada premiado y mensaje al canal de Discord (si el webhook está puesto).
En /ranking/: caja «Premios de la temporada» con los días que faltan y los campeones anteriores.
**Piezas:** `supabase/migrations/154_temporadas_premios.sql` (tablas `temporadas_cierre`, `temporada_premios`; `private.cerrar_temporada`,
`staff_cerrar_temporada`, `temporadas_historial`, `insignias_temporada_de`; tarea `cerrar-temporada`) · `supabase/tests/154_…` ·
`src/js/core/competicion/temporadas.js` + `tests/temporadas.test.mjs` · `src/js/features/ranking/temporadas.js` · insignias en `perfil.js`.
**Blindaje:** solo cuentan quienes jugaron **3+ duelos confirmados**; con menos de **4** jugadores así no hay premios (nadie se reparte
el podio entre amigos); cerrar dos veces no paga dos veces (clave única por mes y por pago); ascuas solo gratis (regla 140);
el mes en curso no se puede cerrar; los perfiles privados cobran pero su nombre no se muestra; el staff puede cerrar a mano si el cron falla.
**Probado:** 2 pruebas puras; prueba en seco en la base real con un 4.º usuario temporal (8 casos, OK); caja en navegador.

---

## 12. Repeticiones y «Mejor gol de la semana» (beta 1.30.0 · migraciones 155 y 156 APLICADAS)

**Qué es:** en **Mis partidos → historial**, cada duelo terminado tiene el botón **Repeticiones**: los jugadores o el host pegan el enlace
del partido completo o de un gol (con minuto). Página nueva **/repeticiones/** («Mejor gol», menú Jugar → Juegos de la comunidad):
los goles subidos esta semana compiten; 1 voto por persona y semana (se puede cambiar; no el propio) y se muestra el ganador anterior.
**Piezas:** `supabase/migrations/155_repeticiones.sql` (`duelo_repeticiones`, `mejor_gol_votos`; `repeticion_agregar`, `repeticion_ocultar`,
`repeticiones_de`, `mejor_gol_votar`, `mejor_gol_semana`) · `src/js/core/competicion/repeticiones.js` + `tests/repeticiones.test.mjs` ·
`src/js/features/resultados/repeticiones.js` (ventana) · `src/pages/repeticiones.astro` + `src/js/pages/repeticiones.js` · botón en `features/duelos/cards.js`.
**Blindaje:** solo enlaces https de sitios de video conocidos (validado en la web y en la BD; nada de `javascript:` ni comillas);
máx. 6 por persona y duelo; enlace repetido rechazado; los videos NO se incrustan (se abren en su sitio con `noopener`);
nadie borra: se oculta; privacidad de todos los jugadores del duelo respetada.

**Arreglo de seguridad (156):** en SQL, `yo = host_id` con host vacío da NULO, y `if not (… or NULO …)` dejaba pasar a un ajeno.
Afectaba a `resultado_de_reto` (036: un ajeno podía ver el marcador propuesto de un duelo sin host), `goles_de_duelo` (148) y las
repeticiones (155). Se corrigió con `coalesce(…, false)` y se comprobó en la base real que ahora un ajeno no ve nada.
**Probado:** pruebas puras; prueba en seco 155+156 (12 casos, OK); página y ventana en el navegador.

---

## 13. Modo espectador mejorado: sala en vivo (beta 1.31.0 · migración 157 APLICADA)

**Qué es:** página **/sala-vivo/?reto=…** de cada duelo aceptado o en juego: **chat** para jugadores, host, espectadores aprobados y staff,
y **predicción** «¿quién gana?» (lado A, empate o lado B) solo para los espectadores, con barra de porcentajes; al confirmarse el
marcador muestra quién ganó y cuántos acertaron. **Sin premio** (no es apuesta). Se entra desde **Salas en vivo → Chat y predicción**
y desde la tarjeta del duelo agendado (**Sala en vivo: chat y predicción**).
**Piezas:** `supabase/migrations/157_espectador_mejorado.sql` (`reto_chat`, `reto_predicciones`; `sala_chat_enviar`, `sala_en_vivo`,
`sala_prediccion`, `sala_chat_ocultar`) · `src/js/core/competicion/salaVivo.js` + `tests/salaVivo.test.mjs` · `src/pages/sala-vivo.astro`
+ `src/js/pages/salaVivo.js` · enlaces en `features/duelos/cards.js` y `pages/enVivo.js`.
**Blindaje:** mismas reglas que el chat general (sancionados y cuentas bloqueadas no escriben; **menores y adultos no se leen entre sí**,
el staff ve todo); 1 mensaje cada 3 s y máx. 60 por persona y duelo; textos escapados (probado con `<b>`); el host o un moderador
ocultan (nada se borra); el chat cierra 2 h después del partido; la predicción cierra al haber marcador; un ajeno no ve nada;
la pantalla pide solo los mensajes nuevos cada 3 s. Página marcada `noindex`.
**Probado:** 2 pruebas puras; 2 pruebas en seco en la base real (OK); página en el navegador con datos simulados.

## 14. Ficha del partido de Phoenix Link 0.3.51 (beta 1.32.0 · migración 160 APLICADA · función `liga` 1.7.0 desplegada)
**Qué es:** pedido de Link (smash-soda-fork `docs/PEDIDOS-A-LA-WEB.md`, Parte 15). Con el módulo opcional `phoenix_sonda.lua`, Link manda
cómo se configuró el partido: estadio, clima, hora, estación, duración, dificultad, prórroga, penales y cambios; además los minutos añadidos
y la tanda de penales. **Si el host no tiene la sonda, no llega nada y todo sigue igual que antes.**
**Dónde se ve:**
- **Marcador en vivo** (Inicio, En vivo, Ahora): «90+3′ · 2.º tiempo», «Penales 4-3» y una línea «Estadio n.º 12 · Lluvia · De noche · 10 min».
- **Duelos:** «Ficha del partido» en la ventana Repeticiones (Mis partidos) y en la Sala en vivo cuando el duelo terminó.
- **Moderación › Liga:** la ficha en cada resultado y, si no coincide con las reglas de la edición, un aviso amarillo **«Revisar»** con lo distinto
  («Duración: se jugó con 10 min; la edición pide 8 min»). **Nunca se rechaza solo:** el staff decide.
- **Moderación › Liga › «Reglas del partido por edición»:** el staff fija duración, dificultad, cambios, prórroga y penales. Vacío = no se controla.
**Códigos de Sider** (se traducen en `core/competicion/fichaPartido.js`): clima 0 despejado · 1 lluvia · 2 nieve; hora 0 día · 1 noche;
estación 0 verano · 1 invierno. Un código desconocido se muestra «código X» (no se inventa). El estadio es un número; si Link manda
`estadio_nombre`, se usa ese. La dificultad se compara como número (el que da Sider).
**Piezas:** `supabase/migrations/160_ficha_partido.sql` (columnas `liga_vivo.anadido/pk_local/pk_visita/ficha`, `liga_ediciones.reglas_partido`;
`private.ficha_limpia`, `private.ficha_revisar`, `private.partida_fin_de_sala`; `public.sistema_ficha_liga` solo service_role;
`public.ficha_de_duelo`; `public.staff_liga_reglas_partido`) · `supabase/functions/liga/index.ts` 1.7.0 · `core/competicion/fichaPartido.js`
+ `tests/fichaPartido.test.mjs` · `features/liga/reglasPartido.js` · `features/resultados/fichaDuelo.js` · cambios en `ligaVivo.js`, `liga/vivo.js`,
`liga/validar.js`, `resultados/repeticiones.js`, `pages/salaVivo.js`, `pages/moderacion.astro`.
**Blindaje:** la ficha se limpia dos veces (función `liga` y base): solo 11 claves conocidas, valores simples, textos de 60 letras como máximo;
`liga_vivo.ficha` máx. 1 KB; añadido 0–30; reglas validadas en la base; solo moderadores fijan reglas; la ficha de un duelo respeta la misma
privacidad que sus repeticiones.
**Probado:** 4 pruebas puras + 1 de `ligaVivo`; 2 pruebas en seco en la base real (`supabase/tests/160_ficha_partido_test.sql`, OK);
capturas en celular de la sala en vivo, el marcador en vivo y Moderación con datos simulados. **Falta:** probarlo con la sonda instalada en PES
y un partido real (lo dice el pedido de Link).

## 15. Optimización de la tarde (beta 1.32.0)
- **Social:** los 4 datos extra del feed (mis reacciones, encuestas, vistas y guardados) se piden **a la vez** y no uno tras otro. Medido con
  internet lento simulado: el primer contenido aparece ~0,6 s antes (5,6 s → 5,0 s; con sesión gana más). Las ventanas de historias se
  descargan al primer toque.
- **Estilos:** 5 hojas que solo usaba una página salieron del CSS global (transmision, estilofc y escenario → Inicio; jugadoresRiel → Base
  de datos; noticiaSocial → Noticias y Bandeja IA). CSS global: 100 KB → 94 KB comprimido. **Verificado:** capturas de las 69 páginas
  (celular y PC) antes y después, comparadas píxel a píxel: sin cambios (solo el reloj y el ping de la cabecera).
- **No se movieron** (documentado para no romper): `salasVivo`, `jugadoresBarra`, `portada`, `elite` y los bloques de Mánager/Mi club de
  `pages.css`, porque otras hojas globales o funciones de todas las páginas usan sus clases y cambiaría el orden de la cascada.
- **Iconos:** iconos nuevos de la ficha añadidos al recorte de Font Awesome y a los iconos finos (`data/iconosFinos.js`).

## 16. Estilos para probar: Champions · Neón · EA FC · Mezcla (beta 1.33.0 · fase 1 «sistema base»)
**Qué es:** pedido de Fralex («que cada cosa sea estética, dinámica, divertida, premium…»). Fase 1 = el **sistema base**: los mismos
componentes en toda la web (botones, paneles, campos, etiquetas, chips, pestañas, plegables, ventanas, avisos, esqueletos, menú) con
4 estilos para elegir, y movimiento **medio** (responde al tocar, pasar el mouse y enfocar; nada se mueve solo mientras lees).
**Cómo probar:** abrir cualquier página con `?estilo=champions`, `?estilo=neon`, `?estilo=fc` o `?estilo=mezcla`. Aparece abajo a la
izquierda el **probador** para cambiar en vivo; la ✕ lo cierra y el estilo elegido se queda (se recuerda en ese navegador).
`?estilo=actual` vuelve al diseño de siempre. **Sin elegir, la web se ve exactamente igual que antes.**
**Los 4 estilos:**
- **Champions:** noche azul marino, botón principal plateado en cápsula, oro para lo elegido y el foco, letras condensadas (Oswald), movimiento lento.
- **Neón:** el Galaxy de siempre con más energía: bordes que se encienden, botón con brillo, luz que sigue al mouse en los paneles.
- **EA FC:** negro carbón, un solo acento verde lima, esquinas rectas, botones inclinados, transiciones rápidas.
- **Mezcla:** base sobria de transmisión y el cian neón solo en lo importante (botón principal, foco, elegido).
**Movimiento:** brillo que cruza el botón principal al pasar el mouse; botones que se hunden al tocar; paneles que se levantan 2 px;
línea de la pestaña elegida que entra deslizando; ventanas y avisos que aparecen subiendo; anillo de foco del color del tema.
Con «Animaciones reducidas» (celular o Configuración) todo cambia sin movimiento.
**Cómo funciona por dentro:** `styles/temas.css` (todo bajo `<html data-estilo>`; **no** `data-tema`, que ya usan Galaxy/Sudario) +
`js/features/temas.js` (probador y luz del mouse) + script en la cabecera de `Layout.astro` (pone el estilo antes de pintar: sin
parpadeo) + interruptor `FX.temas`. Para que los estilos lleguen a TODO, los colores de marca escritos a mano en 262 líneas de CSS
(`rgb(0 229 255 …)`, `#00e5ff`, `rgb(128 0 255 …)`, `#8000ff`) pasaron a `var(--color-galaxy-400/600, <el mismo color>)`: mismo color
por defecto. **Verificado:** capturas de las 69 páginas (celular y PC) antes y después, píxel a píxel: iguales, salvo Divisiones de Sudario,
donde una franja que quedaba cian ahora sale dorada como el resto de Sudario.
**Arreglo incluido:** en la 1.32.0 los iconos de la ficha se añadieron al mapa global de iconos finos y aparecieron iconos que antes
estaban ocultos en Duelos y Formatos (y la Liga se ensanchaba 4 px). Se quitó del mapa global; la ficha usa `data-ico-keep`.
**Siguiente fase (cuando Fralex elija estilo):** pasar el estilo elegido a las piezas propias de cada página (portada, tarjetas de duelo,
ranking, perfil, Mi club) y retirar las capas viejas que ya no hagan falta.

## 17. Capa «vivo»: la web con movimiento de verdad (beta 1.34.0 · solo con un estilo elegido)
**Por qué:** Fralex vio la 1.33.0 y dijo «¿solo cambiaste colores?». Tenía razón. Esta capa agrega lo dinámico y divertido.
**Qué hace (solo con `?estilo=…`; sin estilo no existe):**
- **Celebración a pantalla completa** al confirmar un marcador («¡Confirmado!») o cobrar un reto («¡Reto cobrado! +N puntos»): destello,
  texto grande que cae, la página tiembla un instante y confeti. Se prueba con el botón **«✨ Probar efecto»** del probador.
- **¡GOL!** como sello sobre la tarjeta del marcador en vivo cuando entra un gol.
- **Números que cuentan solos** (puntos, ELO, cifras en letra de marcador) al aparecer o al cambiar de pestaña, y «golpean» cuando cambian.
- **Brillo holográfico** en cartas de jugador, duelo y tienda que sigue al mouse.
- **Luces de estadio** detrás de todo: dos focos grandes y borrosos que se mueven muy lento.
- **Barra de luz** que barre la base de la cabecera de cada página al entrar (estilo transmisión).
- **Cambio de página tipo consola:** la página sale hacia la izquierda y la nueva entra desde la derecha.
- **Sonidos opcionales** (apagados): clic, gol y logro, sintetizados en el navegador (sin archivos). Botón «Sonido» del probador.
**Probado y descartado:** la entrada en cascada de los bloques por JS: el código llega cuando la página ya se ve y producía un parpadeo.
**Seguridad:** el contenido siempre está visible; solo se mueven transform/opacidad/filtros; con «Animaciones reducidas» no se mueve nada;
modo ligero → fondo quieto. Piezas: `styles/vivo.css`, `js/features/vivo.js` (se descarga solo con estilo elegido), eventos
`pes:logro` y `pes:gol` (en `resultados/panel.js`, `pages/ranking.js` y `liga/vivo.js`). El fondo de la página pasa a `<html>` con un estilo
elegido (el body transparente) para que las luces se vean.
**Verificado:** videos de Ranking (Champions, EA FC, Mezcla) y Torneos (Neón); sin estilo, capturas iguales a las de antes.

## 18. Tres muestras de la portada rediseñada (beta 1.35.0 · `/demo/`)
**Por qué:** Fralex: «no veo gran cosa» → pidió ver cada idea «como algo aparte». En vez de ramas (cada rama necesita su propia
publicación), son **páginas aparte** dentro de la beta: se abren con un link, no tocan la portada real y se borran fácil.
**Links (beta):** `/fase-beta-1-0/demo/` (elegir) · `/demo/juego/` · `/demo/tv/` · `/demo/app/`. Todas `noindex`.
- **Videojuego:** fondo de estadio con haces de luz y la cancha en perspectiva; título enorme (Anton); menú de 4 tarjetas inclinadas
  que se llenan de lima (se recorre con las flechas del teclado); carta del líder con los colores de su club que se inclina en 3D con
  brillo; resultados como fichas deslizables; clasificación tipo juego.
- **TV:** rótulo «En directo» con reloj de Lima; título que entra como gráfico de televisión; marcadores tipo «score bug»; tabla de
  estudio con puestos de clasificación en oro; datos de la temporada como rótulos inferiores; próxima fecha; cinta de resultados que corre.
- **App:** clara (a propósito, para que se note la diferencia); cambio Galaxy/Sudario; tarjeta del líder; pestañas Partidos · Tabla ·
  Datos con indicador que se desliza; fechas que se recorren con flechas o deslizando el dedo; forma (V/E/D) en la tabla; atajos.
**Datos:** reales, de `data/ligaResultados.js`, con `js/core/portada/demoDatos.js` (tabla, última y próxima fecha, cifras, mayor
goleada, mejor ataque y defensa; `tests/demoDatos.test.mjs`).
**Movimiento:** solo transform/opacidad/recorte; con «Animaciones reducidas» todo queda quieto.
**Siguiente:** Fralex elige una (o mezcla partes) y esa dirección se lleva a la portada real y luego al resto de páginas.
- **Muestra 4 · `/demo/phoenix/` (beta 1.35.1):** Fralex: «me gustó mucho el de videojuego, pero siento que pierde identidad». Misma estructura
  del videojuego con lo que hace reconocible a la web: galaxia de estrellas en dos capas (profundidad) y nebulosa que respira, el **fénix**
  del logo grande y casi transparente detrás, **cian #00e5ff y púrpura #8000ff**, letra **Rajdhani** (la de toda la web), el logo junto al
  título y el brillo neón; menú que se llena de púrpura a cian; carta del líder con marco degradado cian→púrpura.

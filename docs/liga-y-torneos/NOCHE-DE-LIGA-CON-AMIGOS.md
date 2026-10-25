# Noche de liga real con amigos: guía completa, guion y bitácora

Documento único del frente «primera noche de liga real» (empezado el 21-oct-2026). Se amplía aquí mismo cada vez que se logre algo relevante. No se crean documentos sueltos para este tema.

**Objetivo.** Congelar funciones nuevas unas 2 semanas y lograr una noche de liga de punta a punta con 4 a 6 amigos:
1. Se inscriben en la web.
2. Juegan con Phoenix Link por Parsec.
3. Hay fichajes con Sync.
4. El resultado vuelve solo a la web.

> **25-oct-2026:** la página `/liga-amigos/` ahora se llama **«Liga oficial»** (la dirección no cambió). Las ligas que crea la gente en Torneos son las **casuales** y su creador puede pedir que sean oficiales (migración 144, ver `LIGA-Y-TORNEOS.md` parte 5).

**Índice**
1. Estado y qué falta
2. Guía de una página para los amigos (para copiar y mandar)
3. Lista del anfitrión (Fralex)
4. Guion de la noche, minuto a minuto
5. Qué medir
6. Cómo está hecho (paso a paso para replicarlo)
7. Errores, hallazgos e intentos fallidos
8. Cosas a tener en cuenta (y 8b: siguiente paso, un solo creador)
9. Historial de este documento

---

## 1. Estado y qué falta

| Pieza | Estado al 21-oct-2026 |
|---|---|
| Inscripción en la web | **Hecho y en Supabase** (página `/liga-amigos/`, migraciones 142 y 143 aplicadas y probadas el 21-oct). |
| Calendario | **Hecho en código**: botón «Generar calendario y empezar» (todos contra todos, sorteado). |
| Tabla en la web | **Hecho en código**: `/liga-amigos/` lee la vista `liga_tabla` y se refresca sola (Realtime). |
| Partido por Parsec con Link | Funciona desde hace semanas en 1v1 con amigos. **Link 0.3.45 se cuelga al cargar en la PC de Fralex**: lo arregla el hilo «1 · Link». Hasta entonces, usar la última versión que abra bien. |
| Resultado de Link a la web | Código completo desde la 102. **Nunca probado de punta a punta con amigos reales**: esta noche es la prueba. |
| Vincular la cuenta en Link 0.3.44+ | El arreglo existe, pero solo se probó con un código falso. Primer paso de la noche. |
| Fichajes con Sync | Funcionan sobre la base de la PC del anfitrión, pero no se han probado con una liga real. Se dejan para el final de la noche (opcional). |
| Instalador para amigos | **No hace falta para jugar**: los amigos solo usan Parsec. El instalador (Setup .exe) solo es necesario si un amigo va a ser anfitrión. Se reempaqueta cuando Link deje de colgarse. |

---

## 2. Guía de una página para los amigos

> Copia esta sección tal cual y mándala por WhatsApp o Discord.

**Noche de liga Phoenix: lo que necesitas (10 minutos, una sola vez)**

1. **Crea tu cuenta en la web:** https://fralexito.github.io/phoenixevolution/ › botón de cuenta › «Registrarme». Confirma el correo si te lo pide.
2. **Si la web enseña salas o chats inventados**, es el modo demostración: pulsa «Salir» en el aviso de demo.
3. **Inscríbete en la liga:** abre el enlace que te paso (es de la página «Liga oficial») y pulsa **Inscribirme**. Si quieres, escribe el club con el que juegas. Tu nombre en la liga es tu nombre visible de la web.
4. **Instala Parsec** (gratis): https://parsec.app. Crea tu cuenta de Parsec.
5. **Conecta tu mando** (Xbox, PlayStation o genérico) **antes** de entrar a la sala.
6. **El día de la liga:** abre el enlace de la sala que te mando. Pulsa un botón del mando y te sientas solo.
7. **No necesitas** PES, el parche, Phoenix Link ni Sync. Todo corre en la PC del anfitrión.

**Durante la noche**
- En PES, cada uno elige su equipo con su mando.
- No pulses Start para pausar: está bloqueado en los partidos oficiales.
- Al terminar, el resultado sube solo a la web. El anfitrión lo valida y la tabla se actualiza en «Liga oficial».
- Si un resultado está mal: en la web, **Mis partidos › Mis partidos oficiales › Reclamar**.

**Si no puedes entrar a la sala**
- Revisa que Parsec esté abierto y con sesión iniciada.
- Prueba por cable en vez de wifi.
- Si nunca conecta, es probable que tu compañía de internet use CGNAT. Avísale al anfitrión.

---

## 3. Lista del anfitrión (Fralex)

**Una vez, días antes**
1. Aplicar en Supabase la migración 142 y después la 143 (SQL Editor › pegar cada archivo › Run; en ese orden).
2. En la web: Competiciones › Ligas › **Liga de amigos** › «Crear una liga» (nombre y, si quieres, ida y vuelta) › **Copiar enlace** › mándalo junto con la sección 2.
3. Comprueba que tu cuenta está aprobada como host y que el interruptor de resultados de liga está encendido:
   ```sql
   select host_aprobado from public.perfiles where id = '<tu id>';
   select * from public.phoenix_config;   -- liga_resultados debe ser true
   ```
4. **Vincular Link con tu cuenta.** En la web: Mi perfil › vincular PC › código de 6 cifras. En Link: SYNC › MI JUEGO › «Tu cuenta de la liga» › escribe el código › **CONECTAR**. Este es el primer punto que nunca se probó en real con la 0.3.44+: si falla, copia el mensaje exacto.
5. En Link: SYNC › Módulos del juego, **con PES cerrado**, instala `phoenix_referee.lua` y `phoenix.lua`. En `sider.ini` debe estar `match-stats.enabled = 1`.
6. Haz un partido de prueba **contra un amigo** (no contra la CPU: contra la máquina nunca se envía).

**Antes de cada partido (lo más fácil de olvidar)**
1. Link › Partido › **PARTIDO OFICIAL** › elige el partido del calendario. Si no lo eliges, el partido cuenta como amistoso y **no sube nada**.
2. Si juegas tú: activa **«Contarme como jugador»** o juega con tu mando de Link en tu puesto. Si no, tu lado cuenta como CPU y el resultado no se envía.
3. Los lados: el lado A es el local del calendario. Si en PES quedan al revés, usa «invertir lados» en Link antes del pitazo.

**Después de cada partido**
- En la web: Moderación › Liga › **Validar** (o el botón «Validar resultados» de la Liga de amigos).
- Link solo muestra los partidos hasta la fecha siguiente a la última con algo confirmado. **Valida cada fecha antes de jugar la siguiente.**

---

## 4. Guion de la noche, minuto a minuto (4 a 6 amigos)

| Hora | Qué pasa | Quién | Listo si… |
|---|---|---|---|
| −2 días | Crear la liga, mandar el enlace y la guía | Fralex | Todos inscritos en la web |
| −1 día | Generar el calendario | Fralex | Aparece en Link › PARTIDO OFICIAL |
| 0:00 | Abrir Link y PES, abrir la sala (INICIO › JUGAR CON UN AMIGO), mandar el enlace | Fralex | Sala abierta |
| 0:05 | Entran los amigos, cada uno pulsa un botón y se sienta | Amigos | Todos con puesto y ping en verde o naranja |
| 0:10 | Partido de calentamiento sin PARTIDO OFICIAL (5 min por tiempo) | Todos | Los mandos responden y la imagen va fluida |
| 0:20 | **Fecha 1**: elegir PARTIDO OFICIAL, jugar, terminar | Los 2 de turno | Link dice «Resultado enviado a la web» |
| +1 min | Validar en la web | Fralex | La tabla cambia sola en «Liga oficial» |
| … | Repetir por cada partido y fecha | | |
| Final | (Opcional) un fichaje con Sync y comprobar que se ve en PES | Fralex | El jugador aparece en el nuevo club |
| Cierre | Encuesta rápida de 3 preguntas por WhatsApp (sección 5) | Todos | Respuestas anotadas aquí |

Con 4 jugadores son 3 fechas y 6 partidos; con 6 jugadores, 5 fechas y 15 partidos. Con partidos de 10 minutos, 4 jugadores cabe en una noche; con 6, conviene ida sola y partidos de 6 a 8 minutos, o dos noches.

---

## 5. Qué medir

Anótalo durante la noche en la tabla de abajo (sección 9) para saber si el sistema está listo.

| Medida | Cómo | Meta |
|---|---|---|
| Inscripción sin ayuda | Cuántos amigos se inscribieron solos con la guía | 100 % |
| Tiempo de entrada a la sala | Desde que mandas el enlace hasta que todos tienen puesto | < 10 min |
| Ping y fluidez | Ping de cada uno en la sala; ¿hubo cortes? | Verde o naranja, 0 cortes |
| Resultados que subieron solos | Partidos con «Resultado enviado» ÷ partidos jugados | 100 % |
| Resultados correctos | Marcador de la web = marcador real | 100 % |
| Tiempo hasta la tabla | Desde el pitazo final hasta verlo en «Liga oficial» (con tu validación) | < 2 min |
| Olvidos del anfitrión | Veces que faltó elegir PARTIDO OFICIAL o «Contarme» | 0 |
| Fallos y cuelgues | Link, PES, Sider o Parsec | 0 |
| Fichaje con Sync (opcional) | ¿Se vio el cambio en PES? | Sí |
| Encuesta | 1) ¿Volverías a jugar? 2) ¿Qué te costó? 3) ¿Qué mejorarías? | — |

---

## 6. Cómo está hecho (paso a paso para replicarlo)

### 6.1 Base de datos: migración 142 (`supabase/migrations/142_liga_amigos.sql`)
Usa las tablas de la liga oficial (migración 102), que son las únicas que reciben resultados de Link: `liga_ediciones`, `liga_participantes`, `liga_partidos` y la vista `liga_tabla`. Solo añade, no borra nada:
- **Estado nuevo `inscripcion`** en `liga_ediciones` y columnas `creador` e `ida_vuelta`. La función «liga» (la que consulta Link) solo mira las ediciones `en_curso`, así que una liga en inscripción no aparece en Link.
- `staff_liga_crear(nombre, ida_vuelta)`: crea `amigos:<slug>-AAMMDD-HHMMSS` en inscripción. Solo staff.
- `liga_inscribirse(edicion, club)`: inscribe al usuario con su nombre visible (si se repite, le añade « 2», « 3»…). Máximo 12. Rechaza cuentas sancionadas.
- `liga_salir(edicion)`: solo mientras la inscripción esté abierta.
- `staff_liga_iniciar(edicion)`: baraja a los inscritos y arma el calendario todos contra todos con el **método del círculo**. El primero queda fijo y el resto gira una posición por fecha. Con número impar se añade un hueco y quien cae con él descansa. Con ida y vuelta, la segunda vuelta repite las fechas con local y visitante cambiados. Después pasa la liga a `en_curso`.
- `staff_liga_finalizar(edicion)`: solo ligas `amigos`; la Galaxy no se toca.
- La validación de resultados **no cambia**: Link propone, el staff o el árbitro designado confirma y los DT reclaman.

Se comprobó la fórmula del círculo fuera de la base con 3 a 7 jugadores: nadie juega dos veces en la misma fecha, no hay cruces repetidos y salen n·(n−1)/2 partidos.

**Cómo aplicarla:** Supabase › SQL Editor › pegar el archivo completo › Run. Es segura de repetir porque usa `if not exists` y `create or replace`.

### 6.2 Web: página `/liga-amigos/`
- `src/pages/liga-amigos.astro` y `src/js/pages/ligaAmigos.js`.
- Enlazada en el menú Competiciones › Ligas (`src/data/site.js`).
- El staff ve «Crear una liga». Cada liga muestra:
  - mientras está en inscripción: los inscritos y los botones Inscribirme o Salir;
  - una vez en juego: la tabla de `liga_tabla` y las fechas con el estado de cada partido.
- Con `?liga=<id>` la página baja directamente a esa liga; eso es lo que copia «Copiar enlace».
- Se refresca sola cuando cambia un partido (Realtime de `liga_partidos`, ya activado en la 102).

### 6.3 Link (sin cambios en esta ronda)
Recorrido que ya existía, revisado en el código:
1. `phoenix_referee.lua` escribe `content\phoenix\estado.json` cada segundo.
2. El árbitro de Link ve `fase=final` y llama a `ligaResultado` (`SmashSoda/phoenix/web/Arbitro.cpp`).
3. El resultado entra en una cola guardada en disco y se envía con `POST /functions/v1/liga/v1/liga/resultado`.
4. La web lo deja «propuesto».
- **Sin red:** reintenta cada 30 s.
- **Error 4xx:** descarta el resultado y lo muestra en el chat.

---

## 7. Errores, hallazgos e intentos fallidos

- **La liga oficial no se podía crear desde la web.** La Galaxy entró con SQL fijo (`102b`). Los torneos propios (migración 097) sí tienen inscripción, pero son otro sistema y Link no les manda resultados. Se descartó conectar Link a los torneos propios porque había que tocar Link (congelado) y la Edge Function. Era más barato abrir la liga oficial a la web.
- **La página `/liga/` no sirve para ligas nuevas:** lee la lista fija `data/ligaResultados.js`, no la base. Por eso la tabla de la liga de amigos va en su propia página y lee `liga_tabla` directamente.
- **El anfitrión jugando podía contar como CPU.** Si Fralex juega sin «Contarme como jugador» ni mando de Link en su puesto, su lado queda como «CPU». Un partido contra la máquina nunca se envía (`Arbitro.cpp`, `contraIa`).
- **Link solo ofrece la fecha siguiente a la última confirmada** (`supabase/functions/liga/index.ts`, `partidos`). Por eso hay que validar al momento. No se cambió para no desplegar la Edge Function durante la congelación.
- **Los amigos no necesitan ser «host aprobado»:** solo hace falta para vincular una PC con Link. Quien solo juega por Parsec necesita una cuenta en la web y nada más.
- **El zip de la beta (0.2.71) y el `.bat` rápido están desfasados**: el último Setup es la 0.3.20. La beta caduca el **15-nov-2026** (`kCaduca` en `PhoenixBuild.h`). Al reempaquetar conviene moverla al 31-dic-2026.
- **Link 0.3.45 se cuelga en la pantalla de carga** en la PC de Fralex (21-oct). Lo revisa el hilo «1 · Link». No se compiló ni empaquetó nada hasta que se resuelva.
- **Desfase de `phoenix.lua`:** Link lleva la 0.18b y Sync tiene la 0.18c con un pedido a Link sin hacer. No afecta a los resultados (eso es `phoenix_referee.lua`).

---

## 8. Cosas a tener en cuenta

- **Experimental: no usarlo esa noche.** Más de 8 puestos, Campo 2D en la web, ficha de jugador, sala clasificatoria y traspasos de amigos a mitad de la liga.
- **Red del anfitrión:** al menos 10 Mbps de subida y por cable. Cierra Steam y las descargas.
- **Si PES no abre tras un cierre**, revisa si `sider.exe` quedó colgado.
- **Si un resultado sale mal**, el staff lo corrige al validar (puede fijar el marcador) o lo marca en disputa.
- **Revocar un Link** (si un instalador se filtra): `docs/BETA-PRIVADA.md` del repo de Link.

---

## 8b. Siguiente paso, después de la noche: un solo creador de ligas y torneos

Fralex lo pidió el 21-oct-2026: «que sea un solo creador de ligas y torneos pero que yo pueda escoger cuáles son oficiales y cuales son así casuales de cualquier personaje».

Plan:
- Cualquier usuario crea su liga o torneo desde el creador de `/torneos/` (migración 097), como hoy. Esos son los **casuales**: los resultados se cargan a mano.
- El staff (Fralex) tiene un botón **«Hacer oficial»** en cualquier liga o torneo. Al pulsarlo, se copia a la liga oficial (`liga_ediciones`, `liga_participantes` y `liga_partidos`, las mismas tablas de la Liga de amigos) con sus inscritos y su calendario. Desde ese momento Phoenix Link manda los resultados solo y el staff los valida.
- La página «Liga oficial» pasa a ser la vista de las ligas oficiales de ese creador único.
- No se empieza durante la congelación, porque los torneos de eliminación directa exigen cambios en Link (llaves) y en la función «liga». Las ligas «todos contra todos» sí pueden hacerse oficiales sin tocar Link.

**Paso 1, hecho el 21-oct-2026 (beta 1.16.1; migración 143, pendiente de aplicar después de la 142):**
- `staff_torneo_hacer_oficial(torneo)` toma una liga creada en `/torneos/` con formato «Liga» o «Ida y vuelta» que siga en inscripción. La copia a `liga_ediciones` (`amigos:t<id>-<nombre>`) con sus inscritos, cada uno con su cuenta si la tiene.
- El torneo casual queda con la inscripción cerrada y guarda en `meta.oficial` el id de la edición.
- En la página del torneo (`src/js/pages/torneo.js`), el staff ve el botón «Hacer oficial (resultados por Phoenix Link)». Una vez oficial, todos ven el aviso «Liga oficial» con el enlace a la Liga de amigos, y el panel de inscripción del torneo desaparece.
- **Cómo se usa:** cualquiera crea su liga en Torneos › Crear. Si Fralex la quiere oficial, entra al torneo y pulsa «Hacer oficial». Después, en la Liga de amigos, pulsa «Generar calendario y empezar».
- **Límite conocido:** el organizador casual podría volver a abrir la inscripción del torneo desde «Editar». Quien se apunte ahí no entra en la liga oficial. Para evitarlo, los amigos deben inscribirse en la Liga de amigos.
- **Paso 2 (después de la congelación):** torneos por llaves oficiales, que exigen cambios en Link, y quitar el formulario «Crear una liga» de la Liga de amigos para que quede un único creador.

## 9. Historial de este documento

| Fecha | Qué se logró | Notas de la noche (medidas de la sección 5) |
|---|---|---|
| 21-oct-2026 | Revisión de todo el recorrido. Migración 142 y página «Liga oficial». Guía para amigos y guion de la noche. | Aún sin jugar. |
| 21-oct-2026 | Un solo creador, paso 1: botón «Hacer oficial» en las ligas de /torneos/ (migración 143). Ninguna de las dos migraciones está aplicada todavía: Fralex las pega desde su PC. El instalador nuevo queda en espera porque Fralex decidió no mover la caducidad por ahora. | — |
| 21-oct-2026 (noche) | Migraciones 142 y 143 aplicadas por Claude (Fralex añadió el permiso `apply_migration` en su settings.json) y probadas en una transacción que se deshizo: crear, bloqueo a no-staff, inscribirse, calendario, tabla, hacer oficial y finalizar. La base quedó limpia. | — |

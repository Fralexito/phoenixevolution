# Web ↔ PES ↔ Link · Sistema de datos, Sync automático y compartido, traspasos en vivo, minicaras y traspaso del 17-oct

Cómo habla la web con el juego (a través de Link y Sync):
- el sistema de datos;
- Sync automático y compartido;
- los traspasos en vivo;
- las minicaras;
- el traspaso de los frentes 125–128 del 17-oct.

Se quedan aparte los contratos, porque el código los cita: `contrato-v1.md` (Link), `CONTRATO-WEB-PES.md` (cambios oficiales) y `mercado-api.md` (Sync).

> **Cómo está hecho este documento:** junta, **completos y sin recortar**, 6 documentos que antes estaban sueltos (reorganización del 21-oct-2026, por pedido de Fralex: «cada documento por tema y que tenga absolutamente completo»). Cada parte dice de qué archivo viene. Los originales siguen intactos en la carpeta `_archivo/` y en el historial de git. **Desde ahora, lo nuevo de este tema se AÑADE aquí** como una parte más, con: qué se logró, paso a paso para replicarlo, errores e intentos fallidos, cosas a tener en cuenta, y cómo comprobar y revertir.

## Índice

- [Parte 1 · Prompt para Claude Code · Sincronizar DATOS de jugadores web ↔ PES 2021 (Conmegol)](#parte-1-prompt-para-claude-code-sincronizar-datos-de-jugadores-web-pes-2021-conmegol) — origen `docs/web-pes-link/PROMPT-SISTEMA-DATOS-WEB-PES.md` (801bae3 2026-10-18)
- [Parte 2 · Phoenix Sync compartido — guía (ronda 216)](#parte-2-phoenix-sync-compartido-guia-ronda-216) — origen `docs/web-pes-link/SYNC-COMPARTIDO.md` (01e6efc 2026-10-18)
- [Parte 3 · Phoenix Sync automático (plan · ronda 281)](#parte-3-phoenix-sync-automatico-plan-ronda-281) — origen `docs/web-pes-link/SYNC-AUTOMATICO.md` (01e6efc 2026-10-18)
- [Parte 4 · Traspasos en vivo entre Phoenix Link (Edge Function «traspasos» + migración 105)](#parte-4-traspasos-en-vivo-entre-phoenix-link-edge-function-traspasos-migracion-105) — origen `docs/web-pes-link/TRASPASOS-EN-VIVO.md` (01e6efc 2026-10-18)
- [Parte 5 · Minifaces del juego en la web (rondas 338–339 · 16-oct-2026)](#parte-5-minifaces-del-juego-en-la-web-rondas-338339-16-oct-2026) — origen `docs/web-pes-link/MINIFACES.md` (f63fa82 2026-10-18)
- [Parte 6 · Traspaso 17-oct-2026 · Web ↔ PES (para continuar con la otra cuenta)](#parte-6-traspaso-17-oct-2026-web-pes-para-continuar-con-la-otra-cuenta) — origen `docs/web-pes-link/TRASPASO-17-OCT-WEB-PES.md` (01e6efc 2026-10-18)

---

## Parte 1 · Prompt para Claude Code · Sincronizar DATOS de jugadores web ↔ PES 2021 (Conmegol)

> Origen: `docs/web-pes-link/PROMPT-SISTEMA-DATOS-WEB-PES.md` · último cambio 801bae3 2026-10-18 · 7015 bytes. Copia íntegra.

Escrito el 16-oct-2026 tras la ronda 339 (minifaces + pes_id cruzado en 308 jugadores). Pegar tal cual en Claude Code (chat del programa Phoenix Sync / Link). Copia también en el Proyecto de Claude: `claude/prompt-sistema-datos-web-pes.md`.

---

## Encargo: sincronizar DATOS de jugadores entre la web Phoenix Evolution y el PES 2021 (Conmegol)

Soy FRALEX. Explícame todo en español, muy simple y paso a paso (tengo poca experiencia programando).
Cierra cada respuesta con una pregunta para confirmar que entendí. Nunca me pidas secretos en el chat.

### Objetivo
Hoy solo los FICHAJES viajan de la web al juego. Quiero que también viajen los DATOS del jugador
(estadísticas, habilidades, posiciones, edad, estatura, dorsal…), en las dos direcciones:
1. Juego → web: la web muestra los datos reales de mi parche (no los temporales).
2. Web → juego: si el staff aprueba un cambio en la web, se aplica en el PES de TODAS las PCs de la liga.

### Contexto (ya verificado, no lo reinventes)
- Repos: web `Fralexito/phoenixevolution` (rama `borrador`; lee MAPA.md «RETOMAR», el final de REGISTRO.md y docs/liga-y-torneos/REGLAS-ECOSISTEMA.md §7: dos cuentas trabajan a la vez). Programa: `Fralexito/smash-soda-fork`, módulo `PhoenixSync/` (lee `PhoenixSync/base-conocimiento/16-PLAYER-BIN-FICHA-COMPLETA.md`).
- Supabase `fiibiyijojkxqlsrhcil` (plan FREE). Tablas: `lm_jugadores` (ya tiene `pes_id` en 308 jugadores, cruzados el 16-oct con el Player.bin real), `lm_clubes` (12 clubes, sin `pes_team_id` aún), `lm_movimientos`, `lm_config`, `mercado_reportes`. Funciones: `sistema_lm_importar(liga, datos)` (actualiza por (liga, pes_id) SIN cambiar el club: respeta los fichajes de la Liga Máster), `private.lm_aplicar_reporte`, `lm_staff_revertir`.
- Endpoints que ya existen: `GET /mercado/v1/liga/cambios?desde=<version>` (firmado Ed25519), `POST /mercado/v1/catalogo` (solo token de staff), `POST /mercado/v1/reportes` y `/reportes/lote`.
- Juego: `D:\Frank\Games_\Conmegol Patch\`. Base de datos en `download\CGP_database.cpk` → `common/etc/pesdb/{Player,Team,PlayerAssignment}.bin`. Phoenix Link escribe una base propia en `SiderAddons\livecpk\Phoenix-DB\common\etc\pesdb\` (tapa a la del .cpk). `SiderAddons\_apartado-parche26-20261013\` es la base vieja del 26: NO usarla.
- Lector de .cpk de solo lectura ya hecho: `phoenixevolution/tools/minifaces/cpk.py` (tablas @UTF, XOR, CRILAYLA). Guía: `docs/web-pes-link/MINIFACES.md`.
- Formato (confirmado en Conmegol 27):
  - `.bin` = cabecera WESYS de 16 B + zlib.
  - Player.bin: 29.997 registros × 312 B; pid u32 en +8; nombre UTF-8 en +251.
  - Campos por bits: el registro es un entero little-endian, campo = (reg >> bit) & máscara; las estadísticas usan 6 bits y el valor que muestra el juego es el crudo + 40.
  - Bits de stats: ataque 370, control 281, regate 352, conservación 416, pase raso 263, bombeado 402, finalización 396, cabeceo 288, balón parado 250, efecto 332, velocidad 306, aceleración 344, equilibrio 376, contacto 390, salto 294, resistencia 338, defensa 275, recuperación 312, agresividad 384, potencia 358.
  - Portero: despejar 269, cobertura 300, reflejos 320, actitud 326, atajar 364.
  - Pie malo 454/462, forma 438, lesiones 458. Posiciones (2 bits: 0=C 1=B 2=A): PT 350, DFC 468, LI 318, LD 474, MCD 414, MC 456, MI 466, MD 460, MO 464, EI 472, ED 476, SD 478, DC 470.
  - Habilidades/COM: bits 480–531 (unas 45 resueltas; ver el archivo 16).
  - Team.bin: registros de 1.532 B; id en +0; nombre en +368.
  - PlayerAssignment.bin: registros de 16 B = (id, pid, equipo, flags).

### Reglas de seguridad (obligatorias)
- NUNCA escribir sobre archivos originales del parche. Trabajar siempre sobre COPIAS, con respaldo fechado y suma sha256 antes y después.
- Nada de escribir en memoria del juego ni tocar el .exe.
- Cada cambio de datos: pasa por aprobación del staff, queda auditado (quién, cuándo, valor antes → después) y se puede revertir.
- Todas las PCs de la liga deben terminar con los MISMOS datos. El programa verifica un hash de la base aplicada y avisa si una PC queda distinta (es para jugar online justo por Parsec).
- No copiar medias de otros juegos. La media se calcula desde las estadísticas del propio juego; propón la fórmula y yo la apruebo.
- Migraciones: reserva el número en REGISTRO.md ANTES de crearla, archivo en `supabase/migrations/`. El SQL que me pases para pegar va SIN comentarios.
- En la web: trabajar solo en `borrador`; tras cada cambio, ronda en MAPA.md, línea en REGISTRO.md, commit, `git pull --rebase` y push. A `main` solo cuando yo diga «Súbelo».
- Anotaciones y avances importantes: subirlos a GitHub (por ahora no hay Drive; cuando vuelva, copiarlos también a Drive).

### Fases (para al final de cada una, enséñame el resultado y espera mi «sí»)
**F0 · Reconocimiento (solo lectura).** Confirma rutas, formato y que el mapa de bits coincide en Conmegol 27 con 5 jugadores conocidos (Mbappé, Haaland, Yamal, Pedri, Courtois): yo comparo con la pantalla del juego.

**F1 · Juego → web (catálogo completo).** Phoenix Sync lee la base REAL que usa el juego (Phoenix-DB si existe; si no, el .cpk) y sube por `POST /catalogo` los jugadores de los equipos de la liga con todos los campos. La web casa los 12 clubes por nombre y completa su `pes_team_id`. Solo sube si cambió el hash. Muestra en la ficha del futbolista las estadísticas reales, en el diseño actual.

**F2 · Prueba segura de escritura.** En una COPIA: cambiar 1 valor de 1 jugador (por ejemplo, velocidad de un suplente +1), reempaquetar el .bin (WESYS + zlib), ponerlo en la Phoenix-DB de prueba y que yo lo vea en el PES. Luego restaurar. Documenta exactamente qué pasó.

**F3 · Web: cambios con aprobación.** Tabla nueva (por ejemplo `lm_cambios_datos`: jugador, campo, antes, después, propuesto_por, estado, aprobado_por, version) con RLS: solo el staff propone y aprueba. Panel simple en Mi club/Staff, sin ventanas nativas (usar `core/sistema/dialogo.js`), texto mínimo 12 px. Cada aprobación sube la versión de la liga.

**F4 · Web → juego en todas las PCs.** Phoenix Sync baja los cambios aprobados (endpoint firmado, por versión), reconstruye la Phoenix-DB desde la base original + TODOS los cambios en orden (idempotente: si se aplica dos veces, queda igual), verifica el hash, guarda respaldo y muestra «Datos actualizados ✓ (versión N)». Botón para volver a la versión anterior.

**F5 · Pruebas de punta a punta.** Dos PCs (o simuladas): cambio aprobado en la web → aparece en ambas; reversión → vuelve en ambas; reporte repetido → no duplica. Escribe la guía en `PhoenixSync/base-conocimiento/` y en `docs/` de la web.

### Al empezar
Lee los archivos citados, dime en 5 líneas simples qué entendiste y qué vas a hacer en F0, y pregúntame lo que no esté claro antes de tocar nada.

---

## Parte 2 · Phoenix Sync compartido — guía (ronda 216)

> Origen: `docs/web-pes-link/SYNC-COMPARTIDO.md` · último cambio 01e6efc 2026-10-18 · 1905 bytes. Copia íntegra.

**Qué es:** dos o más PCs comparten sus fichajes. La web es el buzón: guarda cada fichaje (no el archivo entero) y qué PC lo aplicó.

**Camino de un fichaje:** PC que ficha → Phoenix Sync publica (`POST /v1/sync/operaciones`) → las otras PCs lo bajan (`GET /v1/sync/operaciones?desde=`) → lo aplican con respaldo → informan (`POST …/aplicada`) → Phoenix Link avisa en el juego (Buzón).

**Interruptor (solo admin del grupo):** `automatico` = se aplica solo; `autorizacion` = cada PC pulsa Aplicar. Un grupo nuevo nace en `autorizacion`. Si un cliente no puede leerlo, asume `autorizacion`. Cada cambio queda en `sync_config_historial` (quién, cuándo, de → a). Se cambia desde `/phoenix-sync/` o con `PUT /v1/sync/config`.

**Cómo empezar (FRALEX):** 1) entra a `/phoenix-sync/` con tu cuenta admin del sitio → «Crear grupo» (quedas como admin del grupo). 2) añade a tu amigo por su usuario de la web. 3) deja el modo en «Con autorización» o pásalo a «Automático» para pruebas. 4) cada PC necesita su token `phx_…` (emparejar con código desde la web).

**Tablas (RLS activa, solo lectura desde el navegador; se escribe por RPC):** `sync_grupos`, `sync_miembros`, `sync_config`, `sync_config_historial`, `sync_operaciones`, `sync_aplicaciones`, `sync_option_versiones` + bucket privado `sync-option`.

**Límites (plan FREE):** 60 operaciones/hora por usuario, 6 archivos/hora, 8 MB por archivo, 3 versiones guardadas, 1 llamada cada 5 s por ruta.

**Nota para el emparejado:** emparejar una PC (`/v1/emparejar`) todavía exige que la cuenta esté aprobada como host. Si el amigo no es host aprobado, el staff debe aprobarlo en la web para que pueda vincular su PC.

**Estado:** BD lista y probada. La Edge Function con las rutas `/v1/sync/*` está en el repo pero **no desplegada** (PENDIENTE-DEPLOY).

---

## Parte 3 · Phoenix Sync automático (plan · ronda 281)

> Origen: `docs/web-pes-link/SYNC-AUTOMATICO.md` · último cambio 01e6efc 2026-10-18 · 2824 bytes. Copia íntegra.

Pedido de Fralex (13-oct-2026): «quiero que sea automático: así será cuando se hagan los fichajes desde el juego, desde el Sync».
Este documento es el **traspaso** para el chat de Phoenix Sync / Mercado (programa de PC) y para la cuenta WEB.

### Lo que ya está listo en la web
| Dirección | Cómo | Estado |
|---|---|---|
| Web → juego | `GET /mercado/v1/liga/cambios?desde=<version>` (firmado Ed25519). El programa aplica los fichajes hechos en la web. | ✅ listo |
| Juego → web (catálogo) | `POST /mercado/v1/catalogo` (solo token de staff). Sube equipos y jugadores del parche con `pes_id`, `pes_team_id`, `media`, etc. | ✅ listo, hoy es manual |
| Juego → web (cambios) | `POST /mercado/v1/reportes` y `/reportes/lote`: diferencias antes/después de jugar (`jugador_equipo`, `campo`, `dinero_lm`). | ✅ listo, hoy el staff aprueba a mano |

Estado de la base al escribir esto: 12 `lm_clubes` reales (Arsenal, Chelsea, Liverpool, Man City, Man United, Bayern Múnich, FC Barcelona, Real Madrid, Atlético de Madrid, Inter, AC Milan, PSG) **sin `pes_team_id`** y **0** `lm_jugadores`. Los datos Demo se borraron.

### Lo que falta para que sea automático

#### 1. Catálogo automático (programa)
- Al abrir Phoenix Sync en la PC de un **staff**, leer el option file / parche «Conmegol», calcular un hash del catálogo y, si cambió desde la última subida, llamar solo a `POST /catalogo` (en lotes si es grande).
- Enviar `pes_team_id` de cada equipo. **Primera subida:** la web debe casar los 12 clubes existentes por nombre (ver punto 3) para no duplicarlos.

#### 2. Fichajes del juego automáticos (programa)
- Al terminar una sesión (o al detectar que el option file cambió), calcular los cambios `jugador_equipo` y mandarlos por `/reportes/lote` con `id_cliente` (evita duplicados si se reintenta).
- Mostrar en el programa: «Fichaje enviado a la web ✓».

#### 3. Aplicación automática en la web (cuenta WEB · necesita migración, RESERVAR número antes)
- Función `lm_aplicar_reporte_auto(reporte_id)`: si el reporte viene del dispositivo del **DT dueño del club** (o de staff) y la ventana está abierta, mueve el jugador en `lm_jugadores`, anota `lm_movimientos` (tipo `juego`) y `lm_club_libro` si hay monto; si no cumple, queda «pendiente» para el staff como hoy.
- Casar clubes en `lm_importar`: si llega un equipo con `pes_team_id` y ya existe un club con el mismo nombre (normalizado) sin `pes_team_id`, **completar** ese club en vez de crear otro.
- Historial y botón «Revertir» para el staff (antifraude).

### Reglas
- Nunca pedir ni guardar secretos en chats; los tokens viven cifrados en la PC (DPAPI).
- Toda migración con su archivo en `supabase/migrations/` y línea en `REGISTRO.md`.

---

## Parte 4 · Traspasos en vivo entre Phoenix Link (Edge Function «traspasos» + migración 105)

> Origen: `docs/web-pes-link/TRASPASOS-EN-VIVO.md` · último cambio 01e6efc 2026-10-18 · 4543 bytes. Copia íntegra.

Ronda 274 · cuenta LINK (chat principal de Link, con permiso de Fralex) · 12-oct-2026 · rama `borrador`.

### Qué es
Un anfitrión hace un traspaso en **Editar** de PES y lo **guarda**. Su Phoenix Link lo convierte en un *lote* de cambios «jugador → equipo» y lo publica aquí. El Phoenix Link de cada amigo que **sigue** a ese anfitrión lo recoge y lo aplica sobre **su propia base** (Link no copia bases de nadie). Solo viajan ids y nombres de jugador y de equipo: ningún dato personal.

### Dónde vive
- Función **aparte** `traspasos` (`supabase/functions/traspasos/index.ts`, `verify_jwt = false`, versión 1). Se hizo aparte de «liga» a propósito: un fallo aquí no puede tocar el marcador en vivo ni el campo 2D.
- Tablas (migración 105, RLS activado y **sin permisos** para `anon`/`authenticated`: solo accede la función con `service_role`):
  - `liga_traspasos` (lotes: `seq` creciente global, `anfitrion`, `lote`, `huella`, `creado`, `autor`, `parche`, `base_huella`, `cambios` jsonb de 1 a 60 elementos, `recibido`; único por `(anfitrion, lote)`).
  - `liga_traspasos_codigos` (un código de 8 caracteres por anfitrión).
  - `liga_traspasos_seguidores` (quién sigue a quién).
- Retención: 30 días y los últimos 200 lotes por anfitrión (limpieza al publicar).

### Autenticación
`Authorization: Bearer phx_…` (token de dispositivo de Phoenix Link, el mismo de «liga»).
- **Anfitrión** (publicar y pedir código): dispositivo de un perfil **host aprobado** (o staff).
- **Amigo** (recoger, seguir, dejar, siguiendo): **cualquier dispositivo vinculado** (no hace falta ser host).
- El interruptor del staff `liga_resultados = false` pausa todo (503 `LIGA_PAUSADA`), como en «liga».

### Rutas (base `https://fiibiyijojkxqlsrhcil.supabase.co/functions/v1/traspasos/v1`)
Respuestas: `{ ok: true, … }` o `{ ok: false, codigo, mensaje, reintentable, reintentar_en? }`.

| Ruta | Quién | Cuerpo / parámetros | Respuesta |
|---|---|---|---|
| `POST /traspasos` | anfitrión | lote `{ id (24 hex), huella (64 hex), creado (ISO), autor≤40, parche≤60, base_huella≤64, cambios[1–60] }`; cada cambio `{ jugador_id>0, jugador≤48, desde_id≥0, desde≤48, hasta_id>0, hasta≤48 }` | `{ seq, repetido }` (idempotente por `(anfitrión, id)`); 12/min por dispositivo; máx. 32 KB |
| `GET /traspasos?desde=<seq>&limite=<1–50>` | amigo | — | `{ lotes:[{ seq, id, anfitrion (nombre), anfitrion_id, huella, creado, autor, parche, base_huella, cambios }], ultimo_seq }` en orden creciente de `seq`; trae los de los anfitriones que **sigue** y los propios; 40/min |
| `POST /traspasos/codigo` | anfitrión | `{ rotar?: boolean }` | `{ codigo, seguidores:[{ nombre }] }`; `rotar` invalida el anterior (quien ya sigue, sigue) |
| `POST /traspasos/seguir` | amigo | `{ codigo, prueba?: boolean }` | `{ anfitrion, anfitrion_id }`; seguirse a uno mismo exige `prueba: true`; máx. 100 seguidores; 10/min (frena adivinar códigos) |
| `POST /traspasos/dejar` | amigo | `{ anfitrion_id }` | `{}` |
| `GET /traspasos/siguiendo` | amigo | — | `{ sigo:[{ anfitrion_id, nombre }], me_siguen:[{ nombre }] }` |

Errores propios: `CODIGO_INVALIDO` (404), `SEGUIR_A_UNO_MISMO` (409). Los de siempre: `TOKEN_FALTANTE/INVALIDO/REVOCADO`, `DISPOSITIVO_SUSPENDIDO`, `HOST_NO_AUTORIZADO`, `CAMPO_INVALIDO`, `DEMASIADOS_INTENTOS` (429), `RUTA_NO_EXISTE` (404), `METODO_NO_PERMITIDO` (405), `LIGA_PAUSADA` (503).

### Probado (12-oct-2026, contra la web real, con un dispositivo temporal ya borrado)
29 comprobaciones de punta a punta: código estable y rotación (el viejo deja de valer, el nuevo vale en minúsculas), seguirse a uno mismo (409) y en prueba, código inexistente o mal formado (404), publicar, repetir el mismo lote (idempotente), orden por `seq`, `desde` y `limite`, nombres con acentos y emoji, los 60 cambios, validaciones (id, huella, fecha, 0 y 61 cambios, id de jugador no numérico) y token inventado (401). Sin token: 401 en todas las rutas; ruta desconocida 404; método erróneo 405. Los avisos de seguridad de Supabase sobre las tablas nuevas: solo el informativo «RLS activado sin políticas», que es el diseño buscado.

### Qué falta
Que Phoenix Link use estas rutas (lo hace el chat LINK: transporte «web» por defecto y la carpeta como alternativa). Esta web no tiene todavía pantalla para esto: no hace falta; el enlace entre anfitrión y amigo se hace desde Phoenix Link con el código de 8 caracteres.

---

## Parte 5 · Minifaces del juego en la web (rondas 338–339 · 16-oct-2026)

> Origen: `docs/web-pes-link/MINIFACES.md` · último cambio f63fa82 2026-10-18 · 5307 bytes. Copia íntegra.

Guía para humanos y para otra IA que quiera repetirlo. Qué se hizo, con qué archivos y cómo volver a hacerlo cuando el parche cambie.

### 1. Qué se logró
- Las cartas de **Mi club** (Plantilla y Mercado) muestran la **misma cara que el jugador tiene en el PES** (parche Conmegol), agrandada y mejorada.
- En la **ficha del futbolista** (`/futbolista/?id=`) esa cara es la **1.ª foto del carrusel**; las de Wikipedia van detrás.
- Cada jugador de la web quedó **conectado con su número del juego** (`lm_jugadores.pes_id`, 308 de 314). Es el «DNI común» web ↔ juego que usarán Phoenix Sync y el catálogo.

### 2. De dónde salen las caras (orden de prioridad del juego)
Carpeta del juego: `D:\Frank\Games_\Conmegol Patch\`. Ruta interna de una miniface: `common/render/symbol/player/<pid>.dds`.
1. **livecpk de Sider** `SiderAddons\livecpk\Logos\common\render\symbol\player\` (3.704 caras, 180×180). Es la que manda (Sider carga las carpetas sueltas antes que los .cpk).
2. `download\dt80_700E … dt80_100E_x64.cpk` (parche; mayor número = más prioridad).
3. `Data\dt14_all.cpk` (base de Konami, 14.672 caras de 128×128).
- `livecpk\Leyendas` tiene caras pero **no** está en `sider.ini`: no se usa.
- `content\miniface_server\MiniFaces\National` son versiones de selección: no se usan para clubes.

### 3. Cómo se sabe qué número es de quién
Base de datos del juego: `download\CGP_database.cpk` → `common/etc/pesdb/`.
- Todos los `.bin`: cabecera WESYS de 16 B + zlib.
- **Player.bin**: 29.997 registros × 312 B; pid (u32 LE) en +8; nombre UTF-8 en +251.
- **Team.bin**: 1.532 B por equipo; id en +0; nombre en +368.
- **PlayerAssignment.bin**: 16 B por fila = (id, pid, equipo, flags).
- Cruce por nombre normalizado (sin tildes; «-» = espacio). Si falla: mismas palabras en otro orden («Min-Jae Kim»), apellido + inicial («K. Tsimikas»), nombre corto en un club de la web («Gabriel»).
- Si un nombre aparece repetido (versión de club, de selección, clásica…), gana el que tiene **cara 3D** en `livecpk\Faces\…\face\real\<pid>` + equipo de club + miniface.
- Descartados a mano por cruce dudoso: Tynan Thompson, Cassiano Kiala. Sin jugador en el juego: Marli Salmon, Andre Harriman-Annous, Filip Pavić, David Santos Daiber.

### 4. Herramientas (en el repo)
- `tools/minifaces/cpk.py`: lector **de solo lectura** de .cpk de CRI (tablas @UTF, cifrado XOR, CRILAYLA). `python3 cpk.py listar <cpk> [filtro]` / `sacar <cpk> <ruta> <salida>`.
- `tools/minifaces/mejorar.py`: agranda con **Real-ESRGAN** (pesos BSD-3 de github.com/xinntao/Real-ESRGAN/releases). Con `RealESRGAN_x2plus.pth` tarda ~3 s por cara en CPU; con x4plus ~25 s. Rellena el color de los bordes transparentes (quita el halo blanco) y la transparencia se agranda con Lanczos. Salida `.webp` de 320 px.
  `python3 tools/minifaces/mejorar.py <entrada> <salida> --pesos RealESRGAN_x2plus.pth --px 320` (necesita `torch` y `pillow`).
- **`tools/minifaces/suavizar.py` (ronda 340, la que se usa ahora):** pedido de Fralex, las caras con Real-ESRGAN se veían "muy retocadas con IA" (ojos sobreafilados, piel de cera) y el pelo mal recortado. Agranda con Lanczos + afilado leve (sin red neuronal) y rehace el contorno: color del borde = color del interior (sin halo), transparencia alisada y supermuestreada x2 (borde con antialiasing, sin escalera), motas sueltas fuera. Entrada: las .dds originales (180 px de `livecpkLogos`, 128 px de `dt14`); salida `.webp` 320 px. `python3 tools/minifaces/suavizar.py <entrada> <salida>` (necesita `pillow numpy opencv-python-headless`). `mejorar.py` queda solo como referencia: no usar para las caras finales.

### 5. En la web
- Caras: `public/minifaces/<pes_id>.webp` (254 archivos, 4,9 MB; las sirve GitHub Pages, no gastan Supabase).
- Lista de las que existen: `src/data/minifaces.js` (`MINIFACES`, un Set de pes_id).
- `minifaceUrl(pesId)` en `src/js/features/fotoFutbolista.js`: si hay cara del juego, manda sobre Wikipedia.
  - Cartas: `<span class="mg-foto" data-pes="…">` → `.con-miniface` (fondo del color de la línea).
  - Ficha: `img.es-mini` (contain sobre degradado), crédito «Cara del juego · parche Conmegol».
- Test: `tests/fotoFutbolista.test.mjs` («minifaces del juego…»).

### 6. Cómo repetirlo cuando el parche cambie
1. Enlazar el chat con la PC y dar acceso a `D:\Frank\Games_\Conmegol Patch` (solo lectura).
2. Listar caras de las 3 fuentes con `cpk.py` y la carpeta Logos.
3. Sacar Player/Team/PlayerAssignment de `CGP_database.cpk` y cruzar (los jugadores con `pes_id` ya están cruzados: usar ese número directo).
4. Juntar las .dds originales en una carpeta y correr `suavizar.py` (ya no hace falta nube ni GPU), copiar a `public/minifaces/<pid>.webp` y regenerar `src/data/minifaces.js`.
5. `npm test`, build, ronda en MAPA.md, push a `borrador`.

### 7. Pendiente
- 56 jugadores sin cara (canteranos y fichajes nuevos que el parche no trae): siguen con foto de Wikipedia.
- Copia de trabajo en la PC: `Conmegol Patch\_phoenix_web_minifaces\minifaces.zip` (se puede borrar).
- Cuando Fralex vuelva a tener Drive: copiar esta guía y el prompt `docs/web-pes-link/PROMPT-SISTEMA-DATOS-WEB-PES.md` a Drive.

---

## Parte 6 · Traspaso 17-oct-2026 · Web ↔ PES (para continuar con la otra cuenta)

> Origen: `docs/web-pes-link/TRASPASO-17-OCT-WEB-PES.md` · último cambio 01e6efc 2026-10-18 · 6452 bytes. Copia íntegra.

Fralex pidió: «sube todo a GitHub rápido para no dejar a medias; ya usaré mi otra cuenta para avanzar».
Las 4 sesiones de trabajo se cortaron por el **límite de uso** (vuelve a las 9:10 pm, hora de Lima). Todo su trabajo está en GitHub.

### Qué es cada frente
Un solo formulario en la web («Cambios oficiales»): cada cambio va a **base normal (amistosos)**, **Liga Máster** o **las dos**, llega solo a cada PC y cada PC informa el resultado al **registro de usuarios**.
Contrato: `docs/web-pes-link/CONTRATO-WEB-PES.md` v1 (en este repo, rama `rediseño-phoenix-portal`, y en la web `docs/`, rama `borrador`).

| Frente | Migración | Estado | Dónde está |
|---|---|---|---|
| Amistosos + registro + formulario único (BASE) | 125 | Contrato publicado. Link 0.3.19 y web (formulario, registro) **subidos a las ramas principales**. Faltaban rutas de la función web y terminar el seguimiento automático del canal oficial en Link (según la sesión de estadísticas) | Link `rediseño-phoenix-portal` (5ae6b2b) · web `borrador` (6b384ad) · respaldo `respaldo/ws-amistosos-*` |
| Estadísticas e información | 126 | **Hecho y subido**: Link 0.3.18 aplica stats/info en el Player.bin de Phoenix-DB; web con migración 126, formulario, historial y deshacer; pruebas en verde. Falta: rutas de la sesión BASE y probar en un PES real | web `borrador` (9d4ee85) · respaldo `respaldo/ws-stats-*` |
| Liga Máster | 127 | **A medias** (Sync: CambiosLM, PartidasLM, LigaMasterWeb, pruebas lm127; web: migración 127 y panel) | `respaldo/ws-lm-sync`, `respaldo/ws-lm-link` (repo Link) · `respaldo/ws-lm-web` (repo web) |
| Botón ACTUALIZAR (auto-actualización de Link) | 128 | **A medias** (Link: actualizador y EMPAQUETAR-RELEASE.ps1; web: migración 128, página link-versiones, pruebas) | `respaldo/ws-actualizar-link` (repo Link) · `respaldo/ws-actualizar-web` (repo web) |

Las ramas `respaldo/*` llevan un commit «RESPALDO (a medias)»: **no están terminadas ni probadas enteras**. No se han unido a las ramas principales a propósito.

### SQL de Supabase (todavía NO pegado)
Orden obligatorio: **125 → 126 → 127**; la **128** va aparte, en cualquier momento. Cada una trae su prueba `supabase/tests/12X_*_test.sql`.
- 125 y 126: en `borrador` (terminadas por sus sesiones; revisar antes de pegar).
- 127 y 128: solo en sus ramas `respaldo/*` (a medias: **no pegar** hasta terminarlas).

### Cómo seguir (otra cuenta)
1. `git fetch origin` en los dos repos.
2. Para cada frente a medias: `git worktree add C:\dev\ws-<nombre> respaldo/<rama>` y continuar leyendo su commit de respaldo y el contrato.
3. Al terminar: pasar los cambios a la rama principal (`git pull --rebase origin <rama>` + `git push origin HEAD:<rama>`), subir kVersion y anotar en `REGISTRO-LINK.md` / `REGISTRO.md`.
4. Nunca subir `SmashSoda/phoenix/PhoenixBetaSello.h`.

### Lo último de Link en esta cuenta (antes de los frentes)
0.3.12–0.3.16 (traspasos sin papel; aprobar al enviar y al recibir; «Mantener mis fichajes en mi juego»: los fichajes propios van a la Phoenix-DB y no se pierden al cerrar PES). Falta probar en el PES de Fralex: la primera vez con PES cerrado para crear Phoenix-DB y la línea del sider.ini.

---

### ACTUALIZACIÓN 18-oct (segunda cuenta): 125 y 126 ya aplicadas y verificadas
- **Migración 125 aplicada** en la base y su prueba `supabase/tests/125_pes_cambios_test.sql` pasó entera contra la base real (se deshace sola: `TODO_OK_REVERTIDO`).
- **Migración 126 aplicada** y su prueba `126_pes_estadisticas_test.sql` también pasó entera.
- **Fallo de seguridad corregido (125b):** `pes_registrar_informe` quedaba ejecutable por cualquier usuario con sesión (permiso por defecto de Supabase). Ahora solo la ejecuta el servidor (service role). Está añadido al final del archivo de la 125 (idempotente).
- **Función `traspasos` desplegada (versión 2):** ya existen `GET /v1/cambios` y `POST /v1/pc/informe` (antes daban 404). Las rutas viejas siguen igual (comprobado: sin token piden token, ruta desconocida da 404, método malo da 405). Código: `supabase/functions/traspasos/index.ts`.
- Web: 592 pruebas pasan y compila (55 páginas). Toda función `pes_*` que llama la web existe en la base.
- **Siguen SIN aplicar:** 127 (Liga Máster) y 128 (botón ACTUALIZAR): a medias en sus ramas `respaldo/*`.
- **Falta probar en un PES real** (Fralex): un fichaje oficial desde la web hasta el PC de un amigo (Link 0.3.19 con «Recibir los cambios oficiales») y que el resultado aparezca en «Usuarios en PES».

---

### ACTUALIZACIÓN 18-oct (tarde): los 4 frentes están TERMINADOS y verificados
| Frente | Base de datos | Web | Link / Sync |
|---|---|---|---|
| 125 amistosos + registro + formulario | aplicada, prueba pasa | subida | Link 0.3.19 → incluido en 0.3.20 |
| 126 estadísticas e información | aplicada, prueba pasa | subida | Link 0.3.18 → incluido en 0.3.20 |
| 127 Liga Máster | aplicada, prueba pasa (+ permisos corregidos) | subida | Sync `mercado-fase0` (864acd0): lm127 68/68 con partida real, regresión 211/211 y 246/246 |
| 128 botón ACTUALIZAR | aplicada, prueba pasa | subida (`/link-versiones/`) | Link 0.3.20 (91f6635): actualizacion_test 42/42, compilado |

- **Edge Functions desplegadas:** `traspasos` v2 y `mercado` v12 (rutas nuevas vivas; las viejas intactas).
- **Seguridad:** `pes_registrar_informe`, `lm_pc_cambios_desde`, `lm_pc_informe` y las funciones `sistema_link_*` solo las ejecuta el servidor (los permisos por defecto de Supabase dejaban EXECUTE a cualquier usuario con sesión: corregido y comprobado).
- **Para repartir una versión nueva de Link:** `powershell -ExecutionPolicy Bypass -File tools\EMPAQUETAR-RELEASE.ps1 -Subir -Notas "…"` (en el repo Link) y publicarla en `/link-versiones/`. Cada Link la ve en menos de 1 hora.
- **Los Link ya repartidos (0.2.x–0.3.19) no tienen el actualizador:** instalar `PhoenixLink-Setup-0.3.20.exe` a mano UNA vez.
- **Sigue sin probarse en un PES real (solo Fralex):** un fichaje oficial de la web al PC de un amigo; una actualización real de Link; un cambio de Liga Máster en una partida real (probado solo con COPIA de una ranura).
- Los «stat» de Liga Máster quedan PENDIENTES hasta conectar el motor de estadísticas de LM.
- Las ramas `respaldo/*` ya no hacen falta (todo su trabajo está en las ramas principales); no se borraron.

---

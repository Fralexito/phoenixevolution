# Prompt para Claude Code · Sincronizar DATOS de jugadores web ↔ PES 2021 (Conmegol)

Escrito el 16-oct-2026 tras la ronda 339 (minifaces + pes_id cruzado en 308 jugadores). Pegar tal cual en Claude Code (chat del programa Phoenix Sync / Link). Copia también en el Proyecto de Claude: `claude/prompt-sistema-datos-web-pes.md`.

---

# Encargo: sincronizar DATOS de jugadores entre la web Phoenix Evolution y el PES 2021 (Conmegol)

Soy FRALEX. Explícame todo en español, muy simple y paso a paso (tengo poca experiencia programando).
Cierra cada respuesta con una pregunta para confirmar que entendí. Nunca me pidas secretos en el chat.

## Objetivo
Hoy solo los FICHAJES viajan de la web al juego. Quiero que también viajen los DATOS del jugador
(estadísticas, habilidades, posiciones, edad, estatura, dorsal…), en las dos direcciones:
1. Juego → web: la web muestra los datos reales de mi parche (no los temporales).
2. Web → juego: si el staff aprueba un cambio en la web, se aplica en el PES de TODAS las PCs de la liga.

## Contexto (ya verificado, no lo reinventes)
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

## Reglas de seguridad (obligatorias)
- NUNCA escribir sobre archivos originales del parche. Trabajar siempre sobre COPIAS, con respaldo fechado y suma sha256 antes y después.
- Nada de escribir en memoria del juego ni tocar el .exe.
- Cada cambio de datos: pasa por aprobación del staff, queda auditado (quién, cuándo, valor antes → después) y se puede revertir.
- Todas las PCs de la liga deben terminar con los MISMOS datos. El programa verifica un hash de la base aplicada y avisa si una PC queda distinta (es para jugar online justo por Parsec).
- No copiar medias de otros juegos. La media se calcula desde las estadísticas del propio juego; propón la fórmula y yo la apruebo.
- Migraciones: reserva el número en REGISTRO.md ANTES de crearla, archivo en `supabase/migrations/`. El SQL que me pases para pegar va SIN comentarios.
- En la web: trabajar solo en `borrador`; tras cada cambio, ronda en MAPA.md, línea en REGISTRO.md, commit, `git pull --rebase` y push. A `main` solo cuando yo diga «Súbelo».
- Anotaciones y avances importantes: subirlos a GitHub (por ahora no hay Drive; cuando vuelva, copiarlos también a Drive).

## Fases (para al final de cada una, enséñame el resultado y espera mi «sí»)
**F0 · Reconocimiento (solo lectura).** Confirma rutas, formato y que el mapa de bits coincide en Conmegol 27 con 5 jugadores conocidos (Mbappé, Haaland, Yamal, Pedri, Courtois): yo comparo con la pantalla del juego.

**F1 · Juego → web (catálogo completo).** Phoenix Sync lee la base REAL que usa el juego (Phoenix-DB si existe; si no, el .cpk) y sube por `POST /catalogo` los jugadores de los equipos de la liga con todos los campos. La web casa los 12 clubes por nombre y completa su `pes_team_id`. Solo sube si cambió el hash. Muestra en la ficha del futbolista las estadísticas reales, en el diseño actual.

**F2 · Prueba segura de escritura.** En una COPIA: cambiar 1 valor de 1 jugador (por ejemplo, velocidad de un suplente +1), reempaquetar el .bin (WESYS + zlib), ponerlo en la Phoenix-DB de prueba y que yo lo vea en el PES. Luego restaurar. Documenta exactamente qué pasó.

**F3 · Web: cambios con aprobación.** Tabla nueva (por ejemplo `lm_cambios_datos`: jugador, campo, antes, después, propuesto_por, estado, aprobado_por, version) con RLS: solo el staff propone y aprueba. Panel simple en Mi club/Staff, sin ventanas nativas (usar `core/sistema/dialogo.js`), texto mínimo 12 px. Cada aprobación sube la versión de la liga.

**F4 · Web → juego en todas las PCs.** Phoenix Sync baja los cambios aprobados (endpoint firmado, por versión), reconstruye la Phoenix-DB desde la base original + TODOS los cambios en orden (idempotente: si se aplica dos veces, queda igual), verifica el hash, guarda respaldo y muestra «Datos actualizados ✓ (versión N)». Botón para volver a la versión anterior.

**F5 · Pruebas de punta a punta.** Dos PCs (o simuladas): cambio aprobado en la web → aparece en ambas; reversión → vuelve en ambas; reporte repetido → no duplica. Escribe la guía en `PhoenixSync/base-conocimiento/` y en `docs/` de la web.

## Al empezar
Lee los archivos citados, dime en 5 líneas simples qué entendiste y qué vas a hacer en F0, y pregúntame lo que no esté claro antes de tocar nada.

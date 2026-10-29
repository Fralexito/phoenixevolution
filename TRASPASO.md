# TRASPASO entre cuentas de Claude (léelo SIEMPRE al empezar y al terminar)

Fralex trabaja Phoenix con **dos cuentas de Claude a la par** (cuando a una se le acaban los tokens, sigue en la otra). Este archivo es el **cuaderno compartido** entre las dos: aquí cada cuenta deja escrito dónde se quedó, y la otra lo lee al entrar. Vive en GitHub (`Fralexito/phoenixevolution`, rama `borrador`, raíz del repo) porque es lo único que las dos cuentas ven igual. En la PC está en `C:\dev\pes-liga-automatica\TRASPASO.md` (después de `git pull`).

- **Cuenta 1** = la cuenta de siempre (proyecto «Phoenix Evolution Web & APP», con los hilos 1 a 8).
- **Cuenta 2** = la cuenta nueva que Fralex abrió el 24-oct-2026.

> Si lees esto y no sabes qué cuenta eres: mira el primer mensaje del proyecto (dice «Eres la Cuenta 1» o «Eres la Cuenta 2») o pregúntale a Fralex en una línea.

---

## 1. Las 4 reglas (cortas)

1. **Al EMPEZAR** (o al volver después de que trabajó la otra cuenta): haz el paso 2 completo antes de tocar nada.
2. **Al TERMINAR, al cambiar de cuenta o cuando queden pocos tokens**: escribe una entrada en la sección 8 (plantilla abajo), haz commit y `git push`. Una sesión que no escribe su entrada deja a la otra a ciegas. Si los tokens se acaban de golpe, la otra cuenta reconstruye con el paso 2 (por eso funciona igual).
3. **Un frente, una cuenta.** Antes de trabajar en un frente (Web, Link, Sync, PES/mandos, Supabase…), mira la tabla de candados (sección 4). Si lo tiene la otra cuenta, no lo toques: pregunta a Fralex. Al tomarlo, pon tu cuenta en la tabla y empuja; al soltarlo, ponlo «libre».
4. **Nada importante solo en la cabeza o solo en la PC.** Todo el código va a GitHub con commit. Lo que vive solo en la PC (módulos de Sider, PRUEBA_CANCHA, instaladores) se anota en la entrada con su ruta y versión.

Las reglas de siempre siguen igual (`para-proyecto/00_LEEME_PRIMERO.md` y `CLAUDE.md` de cada repo): español, simple, SÍ/NO primero, un paso a la vez, y los **5 límites** (no borrar trabajo ajeno sin commit, no compilar Link con `COMPILAR_PHOENIX.bat`, no tocar ajustes de seguridad, nada de apuestas con dinero real, pedir permiso antes de descargar o de algo irreversible).

---

## 2. Al EMPEZAR: cómo saber qué hizo la otra cuenta (paso a paso)

**A. Desde la nube (Claude Code web, con los repos clonados):**
1. En cada repo: `git fetch origin` y cámbiate a la rama de trabajo con `git pull --rebase`:
   - `phoenixevolution` → `borrador` · `smash-soda-fork` → `plan-ux` (Link) y `mercado-fase0` (Sync) · `phoenix-overlay` → `main`.
2. Lee la **última entrada** de la sección 8 de este archivo.
3. Mira qué entró desde esa entrada. La «marca» de cada entrada es la fecha y hora; con eso:
   `git log --since="AAAA-MM-DD HH:MM" --format="%h %ad %an %s" --date=iso origin/<rama>` en cada repo y rama de arriba.
   Si sale algo que la entrada no menciona, la otra cuenta no llegó a escribirla: léelo con `git show` y cuéntaselo a Fralex en una línea.
4. Lee el final de `REGISTRO.md` (web) y de `REGISTRO-LINK.md` (Link, rama `plan-ux`) si vas a tocar ese frente.
5. Revisa la tabla de candados (sección 4).

**B. Desde la PC de Fralex (si el hilo tiene acceso a la PC):** además de lo anterior, ejecuta el revisor, que solo LEE:
```
powershell -ExecutionPolicy Bypass -File C:\dev\pes-liga-automatica\tools\traspaso-cuentas.ps1
```
Hace `git fetch` (no `pull`), y por cada repo de la PC dice: rama, archivos sin commit, commits sin subir y los commits nuevos desde la última entrada de este archivo. Luego lista los archivos que cambiaron **fuera de git** desde esa fecha en las carpetas del juego y de investigación (módulos de Sider, PRUEBA_CANCHA, instaladores, hub). Con `-Desde "2026-10-24 11:40"` se fuerza otra fecha.

---

## 3. Al TERMINAR: plantilla de entrada

Copia esto al **final** de la sección 8 (solo se añade; nunca se edita ni se borra lo de otros):

```
### AAAA-MM-DD HH:MM (Lima) · Cuenta N · <tema en pocas palabras>
- Hecho: qué se logró (con versiones: web beta X, Link X, módulo mandos vX).
- Commits/ramas: repo@rama hash — qué es. (o «ninguno»)
- Solo en la PC (sin git): rutas y versión de lo que cambió. (o «nada»)
- Supabase: migraciones aplicadas / SQL entregado sin aplicar / número reservado. (o «nada»)
- A medias: en qué punto exacto quedó y qué falta.
- Esperando a Fralex: la prueba o decisión que tiene pendiente (con las palabras exactas que se le pidieron).
- Siguiente paso: lo primero que debe hacer quien entre.
- Candados: qué frentes tomé / solté.
```

Luego: `git add TRASPASO.md && git commit -m "Traspaso: Cuenta N, <tema>" && git pull --rebase origin borrador && git push origin borrador`.

---

## 4. Candados: quién trabaja cada frente ahora

Cambia solo tu fila al tomar o soltar. «libre» = cualquiera puede tomarlo.

| Frente | Dónde | Lo tiene | Desde |
|---|---|---|---|
| Web (Astro) | `phoenixevolution@borrador` · PC `C:\dev\pes-liga-automatica` | libre | 2026-10-25 |
| Phoenix Link (C++) | `smash-soda-fork@plan-ux` · PC `C:\dev\smash-soda-fork\_phoenix-link` | **Cuenta 1** (hilo 1: integrar el paquete de mandos cuando el coordinador avise) | 2026-10-21 |
| Phoenix Sync / Mercado | `smash-soda-fork@mercado-fase0` · PC `C:\dev\smash-soda-fork` | libre | — |
| PES: mandos 9–16 (módulo Sider) | PC `D:\Frank\Games_\PRUEBA_CANCHA\modulo_sider` + `Conmegol Patch\SiderAddons\modules` | **Cuenta 1** (hilo 4; necesita la PC conectada: la Cuenta 2 por navegador no puede tocarlo) — siguiente: pantalla Local/Visitante nativa de 16 | 2026-10-21 |
| PES: modo street | PC `D:\Frank\Games_\PRUEBA_CANCHA` (solo lectura/Ghidra) | libre — en espera hasta acabar la pantalla nativa de 16 | — |
| Supabase (migraciones) | proyecto `fiibiyijojkxqlsrhcil` | libre — **aplicadas hasta 161** (`161_duelos_16_jugadores.sql` aplicada por Fralex el 28-oct); siguiente libre: **162** | 2026-10-28 |
| Overlay | `phoenix-overlay@main` | libre | — |
| Documentación / Drive | `docs/` de cada repo · `D:\Frank\IA\CLAUDE\RESPALDAR_A_DRIVE.ps1` | libre (el respaldo a Drive solo se corre en la PC) | — |
| **PC / PES en uso** | la PC de Fralex (PES, Sider, Ghidra, `SiderAddons`) | **Cuenta 1 · hilo modo street** (Core 0.4.94: pruebas en PES e instalaciones en `SiderAddons\phoenix_core`) — quien la tome escribe aquí su nombre y la hora, y la suelta al terminar | 2026-10-29 00:23 UTC |

**Juego (PES) y Sider:** solo una cuenta a la vez puede pedir pruebas en el juego o instalar módulos, porque es una sola PC y un solo PES. Si la otra cuenta tiene un candado de PES, no instales nada en `SiderAddons`.

---

## 4b. Reglas entre agentes (Claude Cuenta 1, Claude Cuenta 2 y Google Antigravity)

Desde el 28-oct-2026 trabajan sobre el mismo proyecto **tres agentes**: **Claude Cuenta 1**, **Claude Cuenta 2** y **Google Antigravity** (Gemini; Fralex lo usa para algunas tareas, y ya dejó entradas aquí). Estas reglas valen para los tres, sin excepciones, y se suman a las 4 reglas de la sección 1 y a los 5 límites.

1. **Un dueño por frente.** Mira la tabla de candados (sección 4) antes de empezar. Si el frente tiene dueño, no lo toques: pide a Fralex que te lo pase. Al tomarlo, escribe tu nombre (`Cuenta 1`, `Cuenta 2` o `Antigravity`) y la fecha en la tabla y haz push antes de tocar código; al soltarlo, ponlo «libre».
2. **Leer antes de empezar.** Haz `git pull --rebase` (o `git fetch`) y lee la **última entrada** de la sección 8. Si hay commits nuevos que ninguna entrada menciona, léelos con `git show` antes de seguir.
3. **Una rama propia por agente.** Trabaja en `agente/<quien>-<tema>` (ej. `cuenta2/rediseno-web`, `antigravity/duelos-16`). **Nunca dos agentes en la misma rama**, y nadie empuja a `main` ni a `borrador` sin pasar por un PR que Fralex apruebe. **Única excepción:** las entradas nuevas de este `TRASPASO.md` (solo se añaden al final de la sección 8, y se hace `git pull --rebase` antes del push).
4. **Al terminar: entrada nueva y push.** Escribe la entrada de la plantilla (sección 3) y empuja, aunque solo hayas avanzado un poco. Quien no escribe su entrada deja a los otros a ciegas.
5. **Solo un agente toca la PC o PES a la vez.** Es una sola PC y un solo PES. Antes de abrir PES, instalar módulos en `SiderAddons`, correr scripts de mandos o usar Ghidra/x64dbg, pon tu nombre en la fila **«PC / PES en uso»**; si ya tiene a alguien, espera o pregunta a Fralex. Suelta la fila al terminar. Quien no está en la fila **no cierra PES ni mata `sider.exe`**.
6. **Migraciones de Supabase con número reservado.** Antes de crear un `.sql`, reserva el número en la fila «Supabase» de la tabla (ej. «162 reservada por Antigravity») y empuja. Nadie usa un número reservado por otro. Ningún agente cambia ajustes de seguridad del panel.
7. **No editar archivos bloqueados.** Si una carpeta o archivo figura en un candado ajeno, no lo edites, ni «un arreglito». Pide el cambio en una entrada o en `docs/PEDIDOS-A-LA-WEB.md` (web) / el pedido que corresponda, y el dueño lo hace.
8. **Los compartidos van con cuidado.** `TRASPASO.md` solo se añade; `REGISTRO.md`, `MAPA.md` y `src/data/versionWeb.js` (la versión beta) los toca solo el dueño del frente Web. Quien cambia código de la web sube `VERSION_BETA` y anota el cambio en su entrada.
9. **Antigravity en particular.** No tiene la memoria de Claude: lo primero que lee es este archivo y `para-proyecto/00_LEEME_PRIMERO.md`. No compila Link con `COMPILAR_PHOENIX.bat`, no borra nada sin commit y no sube claves ni tokens a ningún sitio.
10. **Conflicto o duda: para y avisa.** Si dos agentes tocaron lo mismo, el que lo nota no resuelve a ciegas: lo cuenta a Fralex en una línea y espera.

---

## 5. Carpetas de la PC de Fralex (mapa completo)

| Qué | Carpeta |
|---|---|
| **Web** (Astro + Supabase), rama `borrador` | `C:\dev\pes-liga-automatica` — su `.git` real está en `C:\dev\pes-rediseno`: **NUNCA borrar `C:\dev\pes-rediseno`** |
| **Phoenix Link** (C++), rama `plan-ux` | `C:\dev\smash-soda-fork\_phoenix-link` (worktree). Compilar: `cmake --build C:\dev\smash-soda-fork\_phoenix-link\build --config Release --parallel`. **Nunca `COMPILAR_PHOENIX.bat`** (borra lo sin commit) |
| Link compilado | `C:\dev\smash-soda-fork\_phoenix-link\x64\Release` |
| **Phoenix Sync / Mercado**, rama `mercado-fase0` | `C:\dev\smash-soda-fork` (raíz) |
| Overlay | `C:\dev\phoenix-overlay` |
| Instaladores de las betas | `C:\dev\phoenix-beta2-dist` |
| **PES 2021 + parche «Conmegol»** | `D:\Frank\Games_\Conmegol Patch` |
| Sider: configuración (solo la toca el instalador de Link, con PES cerrado) | `D:\Frank\Games_\Conmegol Patch\SiderAddons\sider.ini` |
| Sider: módulos instalados (`phoenix*.lua` + copias `.vXX`) | `D:\Frank\Games_\Conmegol Patch\SiderAddons\modules` |
| Sider: datos del parche (solo lectura) | `D:\Frank\Games_\Conmegol Patch\SiderAddons\livecpk` |
| **Investigación PES** (Ghidra, módulos, informes) | `D:\Frank\Games_\PRUEBA_CANCHA` |
| Módulo de mandos 9–16 y respaldos | `D:\Frank\Games_\PRUEBA_CANCHA\modulo_sider` |
| Paquete suelto de mandos (zip por versión) | `D:\Frank\Games_\PRUEBA_CANCHA\paquetes\phoenix_mandos_9a16\` |
| Proyecto Ghidra completo | `D:\Frank\Games_\PRUEBA_CANCHA\copias\ghidra_proyecto_completo` |
| Libro personal (bitácora viva + capítulos) | `D:\Frank\Games_\PRUEBA_CANCHA\informes\LIBRO_PERSONAL` |
| Hub de Claude (índice maestro, scripts de respaldo y del paquete) | `D:\Frank\IA\CLAUDE` (`INDICE_MAESTRO.md`, `RESPALDAR_A_DRIVE.ps1`, `ACTUALIZAR_PARA_PROYECTO.ps1`) |
| Memoria de Claude Code en la PC | `C:\Users\WinterOS\.claude\projects\D--Frank-IA-CLAUDE\memory` |
| Kit de traspaso entre cuentas | `C:\dev\TRASPASO-CUENTAS` (copia local de lo que hay en la carpeta del proyecto `traspaso-cuentas/`) |

⚠️ Copias VIEJAS de la web, no trabajar en ellas ni borrarlas sin permiso: `D:\Frank\IA\CLAUDE\phoenixevolution` y `D:\Frank\IA\CLAUDE\pes-borrador`.

Carpetas de la PC ya aprobadas para Claude (Cuenta 1): `D:\Frank\Games_\Conmegol Patch` (por defecto), `C:\dev`, `C:\dev\pes-liga-automatica`, `D:\SP2026`, `D:\Users\Alexander\Documents\KONAMI`. La Cuenta 2 tiene que aprobarlas otra vez la primera vez que las use (Fralex solo pulsa «Permitir»).

---

## 6. Dónde está cada cosa (documentos que mandan)

- **Paquete de contexto** para un proyecto nuevo: carpeta `para-proyecto/` (portada `00_LEEME_PRIMERO.md`). Fichas de cada hilo: `para-proyecto/contexto/HILOS.md`.
- **Web:** `MAPA.md` (sección RETOMAR), `REGISTRO.md` (una línea por cambio), `docs/liga-y-torneos/REGLAS-ECOSISTEMA.md` §7.
- **Link:** rama `plan-ux`: `docs/RETOMAR-LINK.md`, final de `REGISTRO-LINK.md`, `docs/MANDOS.md`.
- **Sync:** rama `mercado-fase0`: `CLAUDE.md`, `COORDINACION.md`.
- **PES:** `D:\Frank\Games_\PRUEBA_CANCHA\informes\LIBRO_PERSONAL\00_BITACORA_VIVA.md` (copia en `para-proyecto/pes/`).
- **Supabase:** `para-proyecto/contexto/SUPABASE.md`; migraciones en `supabase/migrations/` de la web.

---

## 7. Montar la Cuenta 2 (una sola vez)

El kit está en la carpeta del proyecto `traspaso-cuentas/` y en la PC en `C:\dev\TRASPASO-CUENTAS`. Pasos para Fralex, uno a la vez:
1. En la otra cuenta, crea un proyecto nuevo (mismo nombre: «Phoenix Evolution Web & APP»).
2. En sus instrucciones pega el texto de `INSTRUCCIONES-DEL-PROYECTO.txt`.
3. Añade los 4 repos de GitHub (`Fralexito/smash-soda-fork`, `phoenixevolution`, `phoenix-overlay`, `App-galaxy-`) y conecta GitHub con tu mismo usuario `Fralexito` si lo pide.
4. Sube como archivo del proyecto el zip `para-proyecto-24-oct-2026.zip`.
5. Pega como primer mensaje el texto de `PRIMER-MENSAJE.txt`.
6. (Solo cuando haga falta la PC) acepta el permiso de carpeta que pida.

Conectores opcionales en la Cuenta 2 (solo si un trabajo los necesita): Supabase y Google Drive. Nunca se pegan claves en el chat.

---

## 8. Entradas (solo se AÑADEN; la más nueva al final)

### 2026-10-24 11:40 (Lima) · Cuenta 1 · Arranque del sistema de dos cuentas
- **Hecho:** creado este `TRASPASO.md`, el revisor `tools/traspaso-cuentas.ps1`, la regla en `para-proyecto/00_LEEME_PRIMERO.md`, en `docs/liga-y-torneos/REGLAS-ECOSISTEMA.md` §7 y en la memoria del proyecto; kit para la Cuenta 2 en la carpeta del proyecto `traspaso-cuentas/` (instrucciones, primer mensaje y `para-proyecto-24-oct-2026.zip`).
- **Commits/ramas (estado de cada rama al escribir esto):** `phoenixevolution@borrador` 8b0a57f + el commit de este archivo · `smash-soda-fork@plan-ux` ac2f680 · `smash-soda-fork@mercado-fase0` 5bd051a · `phoenix-overlay@main` 30470fe · `App-galaxy-` vacío.
- **Solo en la PC (sin git):** módulo de mandos **v0.9.40** instalado en `SiderAddons\modules` (hilo 4, instalado el 23-oct ~22:38 Lima); zips por versión en `PRUEBA_CANCHA\paquetes\phoenix_mandos_9a16\`. La PC estaba desconectada al escribir esto: el kit local `C:\dev\TRASPASO-CUENTAS` se copia en cuanto vuelva a conectarse (ver «Siguiente paso»).
- **Supabase:** 139 a 143 aplicadas y probadas (22-oct). Siguiente libre **144**. Nada entregado sin aplicar.
- **Estado de cada frente:**
  - **Web:** beta **1.16.1**, ronda 366, todo en `borrador`, nada a medias. «Liga de amigos» y «Hacer oficial» funcionando. Vista previa: https://fralexito.github.io/phoenixevolution/fase-beta-1-0/
  - **Primera noche de liga real (hilo 8):** listo del lado de Claude. **Le toca a Fralex:** web › Competiciones › Ligas › Liga de amigos › «Crear una liga» › «Copiar enlace», y mandarlo a sus amigos con la guía `docs/liga-y-torneos/NOCHE-DE-LIGA-CON-AMIGOS.md` sección 2. Instalador nuevo de Link: en espera de su decisión.
  - **Mandos 9–16 (hilo 4):** v0.9.40 corrige que el ○ del mando 16 llega a PES como botón 1 (no 2). **Esperando a Fralex:** «Cierra PES, ábrelo de nuevo y prueba con el mando 16: pausa › Local/Visitante › ○. Luego di si volvió». Ya funcionan capitán con L3, anfitrión F5/F6 y L2/R2. Decidido por Fralex: romper el tope de 8 puestos de los menús → 16 (quizá 22), y que los mandos 9+ sean idénticos a los 2–8 (inventario en Ghidra en curso). Falta la barra de potencia de los mandos 9+. Truco mientras tanto: pausar con un mando del 1 al 8.
  - **Modo street con menos jugadores:** viable con «roja invisible» + quitar la regla de «menos de 7 termina el partido». Solo investigación estática; empieza cuando acaben los mandos y Fralex dé permiso para leer `PRUEBA_CANCHA` (ya dijo que sí en principio).
  - **Seguridad (hilo 6):** en pausa. Pendiente: Supabase de pruebas (staging) y que **Fralex mismo** active 2FA y la protección de contraseñas filtradas (Claude no toca ajustes de seguridad).
  - **Link (hilo 1):** vincular cuenta y Sync, terminado. Regla: solo un hilo/cuenta edita Link a la vez (candado de la sección 4).
  - Diferido por Fralex: webhook/bot de Discord, pasarela de pago, pruebas de clanes. Antes de pagos reales: abogado + términos de Parsec/Steam.
- **A medias:** nada de código. Falta copiar el kit a la PC y actualizar el `00_LEEME_PRIMERO.md` original del hub `D:\Frank\IA\CLAUDE` (el script `ACTUALIZAR_PARA_PROYECTO.ps1` regenera el paquete desde ahí y pisaría la regla nueva).
- **Siguiente paso:** quien entre con la PC conectada: (1) copiar `traspaso-cuentas/` a `C:\dev\TRASPASO-CUENTAS`; (2) añadir al `00_LEEME_PRIMERO.md` del hub la sección «Dos cuentas» (igual que la de `para-proyecto/`); (3) seguir con el frente que Fralex pida, respetando los candados.
- **Candados:** todo libre. Si Fralex sigue los mandos o el modo street en la Cuenta 2, esa cuenta toma el candado y la Cuenta 1 deja de tocarlo (sus hilos 4 y «modo street» quedan en pausa hasta que el candado vuelva).

### 2026-10-24 11:58 (Lima) · Cuenta 1 · Kit copiado a la PC
- Hecho: kit en `C:\dev\TRASPASO-CUENTAS` (LEEME-KIT, instrucciones, primer mensaje, copia de este archivo y el revisor `traspaso-cuentas.ps1`). Sección «Dos cuentas» añadida al `00_LEEME_PRIMERO.md` del hub y de `D:\Frank\IA\CLAUDE\para-proyecto`. `ACTUALIZAR_PARA_PROYECTO.ps1` ahora también copia `TRASPASO.md` al paquete. Respaldos de lo que había: `*.antes-24-oct.*` en el hub.
- Solo en la PC (sin git): lo de arriba.
- A medias: la copia de la web en la PC (`C:\dev\pes-liga-automatica`) aún no tiene este archivo: hace falta un `git pull` ahí (desde la nube no se puede correr git en la PC). El revisor `.ps1` no se pudo probar en Windows; la primera cuenta que lo use en la PC, que lo compruebe.
- Siguiente paso: Fralex monta la Cuenta 2 con `C:\dev\TRASPASO-CUENTAS\LEEME-KIT.txt`.
- Candados: sin cambios (todo libre).

### 2026-10-25 00:55 (Lima) · Cuenta 1 · Cierre antes de pasar a la Cuenta 2
Fralex sigue ahora en la Cuenta 2 porque a la Cuenta 1 se le acaban los tokens. Lo que sigue es el estado de TODO al cerrar.
- **Hecho hoy:**
  - Mandos 9–16 en PES: módulo **v0.9.58** CONFIRMADO por Fralex (nombres, L2/R2, □, ○, jugar con su usuario, «Tipo de cursor» y barra de potencia también en 13–16, «Usuario N»). Paquete instalable sin Link: `D:\Frank\Games_\PRUEBA_CANCHA\paquetes\phoenix_mandos_9a16_v0.9.58.zip`.
  - Documentación subida a GitHub: Link `plan-ux` e25e1a6 (Parte 13 de `docs/MANDOS.md`, `docs/libro-pes/` con bitácora viva, cap. 60 k, 60 n y 62/90 al día, y `paquetes/phoenix_mandos_9a16/` con módulo, instalador y LEEME) y web `borrador` (este cierre, `docs/trabajo-en-equipo/TRABAJO-EN-EQUIPO.md` parte 5, `MAPA.md` rondas 365–367, `docs/INDICE.md`).
- **Commits/ramas:** `phoenixevolution@borrador` (este cierre encima de 5ba8db7) · `smash-soda-fork@plan-ux` e25e1a6 · `smash-soda-fork@mercado-fase0` 5bd051a (sin cambios) · `phoenix-overlay@main` 30470fe (sin cambios) · `App-galaxy-` vacío.
- **Solo en la PC (sin git):** módulo vivo `SiderAddons\modules\phoenix_mandos_fase1.lua` v0.9.58 y respaldos `RESPALDO_v0.9.*.lua` en `PRUEBA_CANCHA\modulo_sider`; zips por versión en `PRUEBA_CANCHA\paquetes`; los `.raw` de la réplica de pantalla (≈9 MB, no se suben: salen de pantallas de PES); el libro completo en `PRUEBA_CANCHA\informes\LIBRO_PERSONAL` (el original manda sobre la copia de `docs/libro-pes/`).
- **Web:** beta **1.16.1**, ronda 367 (solo documentación), migraciones hasta **143** aplicadas, siguiente **144**. Nada a medias. **Verificado:** los documentos de la web de la PC (`C:\dev\pes-liga-automatica`) son idénticos a los de GitHub; a la PC solo le faltan los cambios de documentación de las Cuentas 1/2 de esta semana → hace falta `git pull` allí.
- **Estado de cada hilo:**
  - **1 · Link:** vincular cuenta y Sync, terminado (0.3.4x). Espera a que el coordinador avise para integrar el paquete de mandos v0.9.58 en el instalador de Link (copiar `modules\phoenix_mandos_fase1.lua`, `content\phoenix\lados_replica\` y `livecpk\PhoenixMandos\`; en `sider.ini`: `luajit.ext.enabled=1`, `overlay.enabled=1`, `cpk.root=".\livecpk\PhoenixMandos"` primero y `lua.module="phoenix_mandos_fase1.lua"` último). **No verificado:** si en `C:\dev\smash-soda-fork\_phoenix-link` hay commits o cambios sin subir (GitHub `plan-ux` no tenía commits de código desde el 21-oct); correr `tools\revisar-sin-commit.ps1` antes de trabajar en Link.
  - **2 · Carpetas y permisos, 3 · Web (pase, jugadores, caras), 5 · Documentación, 7 · Dinero y apuestas:** terminados.
  - **4 · Mandos 9–16:** v0.9.58 confirmado (arriba). **Siguiente (26-oct):** pantalla Local/Visitante **nativa de 16 filas** dentro de PES (hoy es una réplica encima); diseño en `docs/libro-pes/cap_60_n_diseno_16_asientos.md`. Riesgo conocido: crear dibujos nuevos dentro de PES puede cerrar el juego al empezar o terminar un partido; si pasa, el HUD de 16 se desactiva.
  - **6 · Seguridad y repos públicos:** en pausa, espera a Fralex: activar él mismo 2FA y la protección de contraseñas filtradas, y decidir el Supabase de pruebas (staging). Claude no toca ajustes de seguridad.
  - **8 · Primera noche de liga real:** listo del lado de Claude. **Espera a Fralex:** web › Competiciones › Ligas › Liga de amigos › «Crear una liga» › «Copiar enlace» y mandarlo a sus amigos (guía en `docs/liga-y-torneos/NOCHE-DE-LIGA-CON-AMIGOS.md`, sección 2). Instalador nuevo de Link: en espera de su decisión.
  - **Modo street con menos jugadores:** viable (roja invisible + quitar la regla de «menos de 7 termina el partido»). Solo investigación estática; empieza al acabar la pantalla nativa de 16 y con permiso para leer `PRUEBA_CANCHA`.
- **A medias:** la pantalla Local/Visitante nativa de 16 (sin empezar). Drive: **pendiente de correr en la PC** `D:\Frank\IA\CLAUDE\RESPALDAR_A_DRIVE.ps1` (desde la nube no se puede). Antes, `git pull` en `C:\dev\pes-liga-automatica` para que el respaldo lleve lo nuevo.
- **Esperando a Fralex:** (1) crear la liga real y mandar el enlace; (2) en la PC: `git pull` en la web y luego `RESPALDAR_A_DRIVE.ps1`; (3) 2FA y contraseñas filtradas; (4) si la v0.9.58 cierra PES al empezar o terminar un partido, avisar.
- **Siguiente paso para quien entre (Cuenta 2, desde el navegador):** web, Link-docs y Sync se pueden llevar desde allí; lo del juego (mandos, modo street) necesita la PC y lo lleva la Cuenta 1 o una sesión local con acceso a `D:\Frank\Games_\PRUEBA_CANCHA`. Lo más útil ahora: preguntarle a Fralex qué frente quiere, tomar el candado en la tabla y empezar.
- **Candados:** Link y «PES: mandos» quedan con la Cuenta 1 (ver tabla). Todo lo demás, libre.

### 2026-10-25 01:12 (Lima) · Cuenta 2 · Liga de amigos → «Liga Phoenix»
- Hecho: web beta **1.16.2**. Solo cambia el texto visible («Liga de amigos» → «Liga Phoenix»); la dirección `/liga-amigos/`, los id, la base y los comentarios del código siguen igual. npm test y build (61 páginas) en verde.
- Commits/ramas: `phoenixevolution@borrador` (este commit).
- Solo en la PC (sin git): nada. · Supabase: nada (siguiente libre 144).
- Pendiente: la guía `docs/liga-y-torneos/NOCHE-DE-LIGA-CON-AMIGOS.md` todavía dice «Liga de amigos» en el texto para los amigos; actualizar si Fralex lo pide.
- Candados: tomé y solté Web (queda libre).

### 2026-10-25 01:13 (Lima) · Cuenta 2 · «Liga Phoenix» → «Liga casual»
- Hecho: web beta **1.16.3**, solo texto visible. Dirección `/liga-amigos/` igual. 648 pruebas y build en verde.
- Candados: Web libre.

### 2026-10-25 01:22 (Lima) · Cuenta 2 · Nombre final: «Liga oficial»
- Hecho: web beta **1.16.4**. `/liga-amigos/` se muestra como «Liga oficial» (dirección igual). Decisión de Fralex: **casual = Torneos** (cualquiera crea, los encargados anotan a mano); **oficial = resultados automáticos con el Lua/Link**. Idea futura: automático como función premium. Guía NOCHE-DE-LIGA actualizada.
- Candados: Web libre.

### 2026-10-25 01:35 (Lima) · Cuenta 1 · Drive y PC al día
- Hecho: Fralex corrió en la PC `git pull` en `C:\dev\pes-liga-automatica` (ya tiene `TRASPASO.md` y todo hasta c84f74e) y `RESPALDAR_A_DRIVE.ps1` (331 archivos a «Respaldo automático (GitHub y PC) — no editar»). La Cuenta 2 ya trabajó (beta **1.16.4**, «Liga oficial», reserva de la migración **144**): la entrada de cierre de arriba decía beta 1.16.1; **manda 1.16.4**.
- A medias: en la PC, `C:\dev\smash-soda-fork\_phoenix-link` aún no tiene e25e1a6 (Parte 13 de MANDOS.md, libro-pes, paquete): hace falta `git pull` allí y repetir el respaldo a Drive.
- Candados: sin cambios.
### 2026-10-25 01:40 (Lima) · Cuenta 2 · Pedir que una liga casual sea oficial (144)
- **Hecho:** web beta **1.17.0**, ronda 368. Regla de Fralex: **casual** = Torneos (cualquiera crea; el creador anota a mano) · **oficial** = `/liga-amigos/`, que ahora se muestra como **«Liga oficial»** (Phoenix Link sube los resultados solo). Nuevo: el creador de una liga casual todos contra todos pulsa «Pedir que sea oficial»; el staff acepta (se llama a la 143) o rechaza con motivo; aviso `LIGA_OFICIAL` en la campana; lista en Moderación › Torneos propios y tarjeta en `/control/`.
- **Commits/ramas:** `phoenixevolution@borrador` (este commit). Link, Sync y overlay sin cambios.
- **Solo en la PC (sin git):** nada.
- **Supabase:** **144 APLICADA** y probada (12 casos, `supabase/tests/144_solicitudes_oficial_test.sql` → TODO_OK_REVERTIDO antes y después). Siguiente libre **145**.
- **A medias:** nada de código. `npm run test:paginas` no se pudo correr en la nube (sin Chrome): lo corre GitHub al subir.
- **Esperando a Fralex:** probar con sesión real: con una cuenta de jugador crear en Torneos una liga «Todos contra todos» → «Pedir que sea oficial» → con la cuenta admin mirar la campana, `/control/` y Moderación → Aceptar o Rechazar. Idea suya sin hacer: resultados automáticos como **función premium** para ligas no oficiales (esperar a que lo pida).
- **Siguiente paso:** quien entre, leer `docs/liga-y-torneos/LIGA-Y-TORNEOS.md` parte 5 si va a tocar ligas/torneos.
- **Candados:** solté Web y Supabase (libres). Link y «PES: mandos» siguen con la Cuenta 1.

### 2026-10-25 05:40 (Lima) · Cuenta 2 · Resultados automáticos en torneos (camino B) — 145 SIN APLICAR
- **Hecho:** web beta **1.18.0**, ronda 369. Decisión de Fralex: los resultados automáticos con Phoenix Link no son solo para ligas, también torneos oficiales, copas rápidas, etc. → **camino B**: Link llenará los partidos de Torneos directamente. Torneo **premium** → confirma el organizador; **oficial** (dentro de Torneos) → confirma el staff. «Pedir que sea oficial» vale ya para cualquier formato automático (llaves, doble, todos contra todos, ida y vuelta, grupos, suizo).
- **Commits/ramas:** `phoenixevolution@borrador` (este commit).
- **Supabase:** **145 escrita y probada en seco (15 casos, TODO_OK_REVERTIDO) pero NO APLICADA** — el permiso de Supabase se canceló dos veces. **Función `torneos` NO desplegada.** La web degrada sola (sin la 145 se comporta como la 1.17.0). Siguiente libre **146**.
- **A medias / siguiente paso (quien tenga permiso en Supabase):** (1) aplicar `supabase/migrations/145_torneos_resultados_link.sql`; (2) correr `supabase/tests/145_torneos_resultados_link_test.sql` → TODO_OK_REVERTIDO; (3) desplegar `supabase/functions/torneos` con `verify_jwt=false`. Pasos en `docs/liga-y-torneos/LIGA-Y-TORNEOS.md` parte 6 §4.
- **Para la Cuenta 1 (candado de Link) — fase 3:** implementar en Phoenix Link `GET /v1/torneos/partidos` y `POST /v1/torneos/resultado` según `docs/web-pes-link/CONTRATO-TORNEOS-LINK.md`. Ojo: `goles_a/goles_b` son del lado a/b del partido, no local/visitante del juego.
- **Esperando a Fralex:** aceptar el permiso de Supabase (o pegar él el SQL de la 145 en el SQL Editor).
- **Candados:** solté Web y Supabase.

### 2026-10-25 13:20 (Lima) · Cuenta 2 · Las 8 funciones nuevas (opción C) — beta 1.26.0
- **Hecho:** rondas 370–377, betas **1.19.0 → 1.26.0**: (1) tutorial de bienvenida · (2) calendario personal (.ics y Google) · (3) estado de los hosts en Salas en vivo · (4) MVP del partido · (5) goleadores automáticos desde Link · (6) prode gratis (/prode/) · (7) clan contra clan · (8) draft en vivo (/draft/, Liga Máster y torneos). Todo explicado, con blindaje y pruebas, en **`docs/guias/FUNCIONES-NUEVAS-25-OCT-2026.md`**.
- **Commits/ramas:** `phoenixevolution@borrador` (rondas 370–377). Nada en `main`. Link, Sync y overlay sin cambios.
- **Supabase:** APLICADAS y probadas en seco: **146** (hosts), **147** (MVP), **150** (clan contra clan), **151** (draft). **SIN APLICAR** (Supabase canceló el permiso): **145**, **148**, **149** → todo junto en `docs/sql-pendiente/PEGAR-PENDIENTES.sql` con instrucciones en `docs/sql-pendiente/LEEME.md`. Sus pruebas en seco: `supabase/tests/145_…`, `148_…`, `149_…` (las de 148 y 149 aún no se ejecutaron). Edge Functions **`torneos`** y **`goles`** escritas, **sin desplegar** (verify_jwt = false).
- **La web degrada sola** sin 145/148/149: goleadores se oculta, prode dice «llega muy pronto», torneos se comporta como 1.17.0.
- **Para la Cuenta 1 (candado de Link):** además de la fase 3 de torneos, Link puede mandar los goles de cada duelo según `docs/web-pes-link/CONTRATO-GOLES-LINK.md` (POST `/v1/goles/duelo`).
- **Esperando a Fralex:** pegar el SQL pendiente y desplegar `torneos` y `goles`; probar con sesión real: prode, MVP (necesita un duelo confirmado con 3+ participantes), clan contra clan y un draft de prueba.
- **Candados:** solté Web y Supabase (libres). Link y «PES: mandos» siguen con la Cuenta 1.

### 2026-10-25 14:30 (Lima) · Cuenta 2 · Optimización — beta 1.31.1 (commit 9ae4c4d, CI verde)
- **Hecho:** migración 158 (110 índices de claves foráneas) APLICADA; service worker con tope (400 archivos, 80 páginas, solo respuestas OK, caché `pes-v3`).
- **Pendiente de Fralex:** pegar la 159 (`limpieza_diaria`) en el SQL Editor; ya se le dio el SQL. Si confirma que la corrió: marcarla APLICADA en el archivo, LEEME, esta tabla y REGISTRO.
- **Candados:** todos libres. Siguiente migración libre: **160**. Rama `borrador`; nada en `main`.

### 2026-10-25 14:20 (Lima) · Cuenta 2 · Lanzamiento, Supabase al día y 4 funciones más — beta 1.31.0
- **Hecho:** rondas 378–384 (betas 1.26.1 → 1.31.0): revisión de lanzamiento; avisos en campana y Discord; pulido; **ficha de rivalidad**
  (/rivalidad/), **temporadas con premios** (cierre mensual automático), **repeticiones + mejor gol** (/repeticiones/), **sala en vivo**
  con chat y predicción (/sala-vivo/). Detalle en `docs/guias/FUNCIONES-NUEVAS-25-OCT-2026.md` (partes 9–13).
- **Supabase:** TODO aplicado y probado en seco: 145–157. Edge Functions `torneos` y `goles` desplegadas (verify_jwt = false).
  **Lección:** el conector pide un permiso aparte (que se cancelaba) si el SQL tiene `delete from` o `drop trigger` → usar
  `create or replace trigger` y columnas `vigente/oculto` en vez de borrar.
- **Arreglo de seguridad (156):** `yo = host_id` con host NULO dejaba pasar a ajenos en `resultado_de_reto` (036), `goles_de_duelo`,
  repeticiones y prode. Corregido con `coalesce(…, false)`. **Para quien escriba SQL nuevo: nunca comparar con columnas que pueden ser NULL
  dentro de `if not (…)` sin `coalesce`.**
- **Pendiente de Fralex (opcional):** webhook de Discord (`select vault.create_secret('URL', 'discord_webhook');`), protección de
  contraseñas filtradas y 2FA del staff (seguridad: lo hace él). Probar con cuentas reales.
- **Para la Cuenta 1 (Link):** contratos `docs/web-pes-link/CONTRATO-TORNEOS-LINK.md` y `CONTRATO-GOLES-LINK.md` (las dos rutas ya están en línea).
- **Candados:** Web y Supabase libres.

### 2026-10-28 03:00 (Lima) · Gemini (Antigravity) · Sala de Duelos hasta 16 jugadores (8v8) + Liga Oficial con escudos y WhatsApp — beta 1.43.0
- **Hecho:** web beta **1.43.0** (ronda 402) en `borrador` (`/fase-beta-1-0/`):
  1. **Sala de Duelos (`/duelos/`):** tope ampliado de 8 a **16 jugadores** (`MAX_PLAYERS = 16`, `MAX_TEAM = 15` en `rules.js`); botones rápidos `1v1`, `2v2`, `3v3`, `4v4`, `5v5`, `8v8` y `Personalizar`/`Otro`; radar vacío ahora ofrece también «Agendar hora» y «Salas en vivo»; aviso claro en `duelos/actions.js` si aún no se pegó el SQL 161.
  2. **Liga Oficial (`/liga-amigos/`):** muestra el escudo real del club (`escudoHTML`) en los inscritos y en la tabla (`liga_tabla`), resalta tu propia fila y tus partidos («Tu partido»), resalta en negrita al ganador de cada cruce, añade botón «Invitar amigos» por WhatsApp y sube los 3 textos de `11px` a `12px`.
  3. **Pruebas:** `npm test` **720/720** en verde y `npm run build` OK.
- **Supabase:** migración **161 APLICADA** por Fralex el 28-oct (`supabase/migrations/161_duelos_16_jugadores.sql` + `supabase/tests/161_duelos_16_jugadores_test.sql`). Siguiente migración libre: **162**.
- **Solo en la PC (sin git):** `C:\dev\pes-liga-automatica` actualizada con `git pull --ff-only` y sincronizada con `origin/borrador`.
- **Candados:** todos libres (Web y Supabase libres). Siguiente migración libre: **162**.

### 2026-10-28 15:15 (Lima) · Gemini (Antigravity) · Arreglo enlace 404 en «Salas jugando» de Duelos — beta 1.43.1
- **Hecho:** ronda 403, beta **1.43.1**: en `src/components/rediseno/JugarRd.astro` las tarjetas de «Salas jugando» usaban `new URL('en-vivo/', document.baseURI).pathname`, que dentro de `/duelos/` abría `/duelos/en-vivo/` (404). Ahora usan `${import.meta.env.BASE_URL}en-vivo/`.
- **Candados:** todos libres. Siguiente migración libre: **162**.

### 2026-10-27 15:30 (Lima) · Cuenta 2 · Rediseño completo en rama aparte (rediseno-web)
- **Hecho:** rama `rediseno-web` (copia de borrador) publicada en `/phoenixevolution/fase-rediseno/`. `deploy.yml` de borrador la compila
  si existe (si falla, lo demás se publica igual). Para publicar un cambio de esa rama: `gh workflow run deploy.yml --ref borrador`.
  OJO: ya existía una rama vieja `rediseno` (ronda ~223); NO se tocó.
- **En la rama:** fases 1 y 2 del plan (sistema base estilo Champions con identidad Phoenix, menú de 5 destinos, iconos propios «Corte»,
  Inicio nuevo). Detalle en `REDISENO.md` de esa rama. Nada pasa a borrador/main sin «Súbelo».
- **Candados:** Web: el rediseño lo lleva la Cuenta 2 en `rediseno-web`; `borrador` libre. Siguiente migración: **161**.

### 2026-10-27 00:20 (Lima) · Cuenta 2 · Jerarquía visual de la portada (pedido de Frank) — betas 1.39.0 → 1.40.0
- **Hecho:** rondas 397–401, una por paso (botón principal, título/altura, Mi Club primero, un solo ancho, títulos en 3 niveles). Detalle en
  FUNCIONES-NUEVAS (sección «Portada con jerarquía visual»). Capturas enviadas para que Frank apruebe; cada paso es un commit aparte (se puede revertir solo).
- **Candados:** todos libres. Siguiente migración: **161**.

### 2026-10-26 01:40 (Lima) · Cuenta 2 · Tarjetas de Jugadores fluidas — beta 1.38.1
- **Hecho:** halo de `.pcw-replica::before` sin `filter: blur` ni escala; modo foco sin `blur(3px)` y escudos pausados. ~2× más fluido al abrir/cerrar.
- **Candados:** todos libres. Siguiente migración: **161**.

### 2026-10-26 01:10 (Lima) · Cuenta 2 · Fuera los 4 estilos de prueba — beta 1.38.0
- **Hecho:** borrados temas.css, vivo.css, temas.js y vivo.js (y su script de cabecera, `FX.temas`, eventos `pes:logro`/`pes:gol`). Fralex eligió
  los botones y cartas de juego; eso se queda. Ojo: el `data-estilo` de los botones de Configuración es otra función y sigue.
- **Candados:** todos libres. Siguiente migración: **161**.

### 2026-10-26 (Lima) · Cuenta 2 · Jugadores más fluido — beta 1.37.2
- **Hecho:** luces de estadio de `vivo.css` quietas y sin `filter: blur` (moverlas recalculaba cada cuadro los ~37 `backdrop-filter` de Jugadores).
  Regla: no animar nada detrás de paneles con `backdrop-filter`.
- **Candados:** todos libres. Siguiente migración: **161**.

### 2026-10-25 23:55 (Lima) · Cuenta 2 · Botones y cartas de juego en toda la web — beta 1.37.0
- **Hecho:** `data-prueba-juego` viene puesto por defecto (`?prueba=no` lo quita). Arreglos de celulares chicos en `styles/responsivo.css`
  (si encuentras otro desborde, agrégalo ahí con un comentario de qué arregla). `main.flex-grow { overflow-x: clip }`.
- **Candados:** todos libres. Siguiente migración: **161**.

### 2026-10-25 23:20 (Lima) · Cuenta 2 · PRUEBA botones y cartas de juego — beta 1.36.0
- **Hecho (experimental):** `?prueba=juego` → `<html data-prueba-juego>`. Botones que se llenan (portada, menú, barra lateral, listas) y carta
  grande (`core/sistema/cartaJuego.js`, pura y probada) en ranking, portada, MVP, campeón de temporada y mejor gol. Fralex dijo: «todo es
  experimental, no es diseño definitivo». Las muestras de `/demo/` siguen ahí.
- **Candados:** todos libres. Siguiente migración: **161**.

### 2026-10-25 22:20 (Lima) · Cuenta 2 · Tres muestras de portada — beta 1.35.0
- **Hecho:** `/demo/` con 3 portadas rediseñadas desde cero (juego, tv, app), páginas aparte y `noindex`. La portada real no cambió.
- **Esperando:** que Fralex elija dirección. **Candados:** todos libres. Siguiente migración: **161**.

### 2026-10-25 21:00 (Lima) · Cuenta 2 · Capa «vivo» — beta 1.34.0
- **Hecho:** `styles/vivo.css` + `js/features/vivo.js` (solo con `?estilo=…`). Para celebrar algo nuevo desde cualquier página:
  `dispatchEvent(new CustomEvent('pes:logro', { detail: { titulo, sub } }))`; para el sello de gol: `pes:gol` con `{ card }`.
- **Candados:** todos libres. Siguiente migración: **161**.

### 2026-10-25 20:45 (Lima) · Cuenta 2 · Estilos para probar — beta 1.33.0
- **Hecho:** fase 1 del rediseño («sistema base»): `styles/temas.css` + `js/features/temas.js`; 4 estilos con `?estilo=champions|neon|fc|mezcla`
  (probador abajo a la izquierda). Atributo `<html data-estilo>` (NO `data-tema`: ese es Galaxy/Sudario). Sin estilo elegido = web igual que antes
  (verificado con capturas de las 69 páginas). Colores de marca del CSS a `var(--color-galaxy-400/600, <mismo color>)`: **si escribes CSS nuevo,
  usa las variables, no `#00e5ff` a mano**, para que los estilos lo alcancen.
- **Esperando:** que Fralex elija estilo; después, fase 2 = aplicarlo a las piezas propias de cada página.
- **Candados:** todos libres. Siguiente migración: **161**.

### 2026-10-25 19:45 (Lima) · Cuenta 2 · Ficha del partido (pedido de Link 0.3.51) + optimización — beta 1.32.0
- **Hecho (web):** pedido Parte 15 de Link: migración **160** APLICADA y probada en seco; función `liga` **1.7.0** desplegada (guarda `anadido`,
  `pk_local/pk_visita` y `ficha` en `liga_vivo`; en `resultado` copia la ficha del último `partida_fin` de la sala a `detalle.ficha` y las
  diferencias con `liga_ediciones.reglas_partido` a `detalle.revisar` — nunca rechaza). Se ve en el marcador en vivo, en los duelos
  (Repeticiones y Sala en vivo) y en Moderación › Liga (aviso «Revisar» + formulario «Reglas del partido por edición»).
- **Para la cuenta de Link:** el pedido de la Parte 15 está **hecho del lado de la web**; falta la prueba con la sonda instalada en PES y un
  partido real. Si Link cambia los nombres de los campos de la ficha, avisar (la web solo acepta: estadio, estadio_nombre, clima, hora,
  estacion, duracion, dificultad, prorroga, penales, cambios, zona). Anotarlo en `docs/PEDIDOS-A-LA-WEB.md` de smash-soda-fork (esta sesión
  no tiene permiso de escritura en ese repositorio).
- **Optimización:** Social pide sus 4 extras en paralelo; 5 hojas CSS salieron del global (100 → 94 KB), verificado con capturas píxel a píxel.
- **Candados:** todos libres. Siguiente migración: **161**. Rama `borrador`; nada en `main`.

### 2026-10-25 16:50 (Lima) · Cuenta 1 · Migración 159 aplicada y pedido nuevo de Link 0.3.51
- **Supabase:** la **159** (`limpieza_diaria`, tarea `limpieza-diaria` a las 04:40 Lima) quedó **APLICADA y verificada** el 25-oct (Fralex pegó el SQL; función y tarea activas). Siguiente migración libre: **160**. La fila de Supabase de la tabla de candados todavía dice «159 sin aplicar»: corregirla al tocar el archivo.
- **Pedido nuevo de Link 0.3.51** (en `smash-soda-fork`, `docs/PEDIDOS-A-LA-WEB.md`, Parte 15): Link ahora manda `ficha` (estadio, clima, hora, estacion, duracion, dificultad, prorroga, penales, cambios, zona) y `juego.anadido` en `partida_fin`, y `anadido`, `pk_local`/`pk_visita` y `ficha` en `liga/vivo`. Hoy la función de la web los ignora: hay que guardarlos y mostrarlos.
- **Commits:** solo este `TRASPASO.md`. Web y Link sin otros cambios míos.
- **Candados:** sin cambios (Web y Supabase libres).

### 2026-10-28 16:45 (Lima) · Cuenta 1 · Estado de hoy de cada frente, respaldo a Drive y reglas entre agentes
- **Hecho:**
  - **Reglas nuevas:** sección **4b «Reglas entre agentes»** (Cuenta 1, Cuenta 2 y Google Antigravity) y fila «PC / PES en uso» en la tabla de candados. **Léelas antes de tocar nada.**
  - **Drive:** respaldo completo en «Phoenix — Respaldo completo» (Core, Lua, módulos, herramientas propias y descargadas, MCP, docs y datos grandes) y copia de informes, bitácoras y guías en «Phoenix — Informes y traspaso 28-oct» (ver Solo en la PC).
- **Estado de cada frente (todo en PAUSA por falta de crédito):**
  - **PES: modo street (Phoenix Core 0.4.94):** panel F9/F10/F11 hecho; reloj 45→90 **sin probar**; final nativo **experimental y apagado**. Copias estables: `SiderAddons\phoenix_core\street_estable_*`.
  - **PES: mandos 9–16 (módulo Sider v0.9.62):** `D:\Frank\Games_\PRUEBA_CANCHA\modulo_sider` y `SiderAddons\modules`.
  - **Phoenix Link 0.3.55:** rama `plan-ux`; pedidos de la web en `docs/PEDIDOS-A-LA-WEB.md` de smash-soda-fork.
  - **MCP phoenix-pes v0.2:** `D:\Frank\IA\CLAUDE\pes-mcp` (guía: `GUIA-MCP-PES.md`).
  - **Phoenix Online v0.1:** `D:\Frank\IA\CLAUDE\pes-online`; 14 pruebas pasan; **falta la prueba real** con dos PCs. Ojo: ahí hay una llave (`nclmio_key.bin`); no se sube a Drive ni a git.
  - **Web:** beta **1.43.1**; Supabase aplicado hasta la **161**, siguiente libre: **162**. Antigravity (Gemini) ya dejó dos entradas el 28-oct (Duelos hasta 16, enlace 404).
- **Commits/ramas:** `phoenixevolution@borrador` — este `TRASPASO.md` (solo documentación).
- **Solo en la PC (sin git):** todo lo de PES/Sider/MCP/Online de arriba. Copia en `para-proyecto/TRASPASO.md` (hub) y en Drive.
- **Supabase:** nada nuevo.
- **A medias:** reloj 45→90 de street sin probar; prueba real de Phoenix Online; mandos 9+ aún sin confirmar movimiento en partido.
- **Esperando a Fralex:** crédito/cuenta para seguir, y avisar quién toma cada frente (con Antigravity incluido).
- **Siguiente paso:** quien entre lee la sección 4b, hace `git pull --rebase`, toma su candado y su rama, y retoma por el frente que Fralex indique.
- **Candados:** sin cambios (los de PES y Link siguen con Cuenta 1 pero en pausa; Web libre).

### 2026-10-28 17:15 (Lima) · Antigravity (Gemini) · Phoenix Link 0.3.56: 8v8 manual, relevo en caliente (UI + combo Mando 1), limpieza 9–16 y barra de partido en Puestos
- **Hecho:** Con autorización expresa de Fralex tras pasar Cuenta 1 a pausa por falta de crédito, se aplicaron las 4 mejoras acordadas en **Phoenix Link 0.3.56**:
  1. **Propuesta A — 8v8 en `PARTIDO › Armar a mano`:** `SmashSoda/phoenix/web/ui/js/vistas/partido.js` (`ArmarManual` y `Columna` suben de 4 a 8 jugadores por lado con contador `N/8`), `SmashSoda/phoenix/web/AccionesPartidoWeb.cpp` (`lado()` acepta `1..8` jugadores) y `SmashSoda/phoenix/web/Arbitro.cpp` (`armarLadosSegunMandos` acepta hasta 8 por lado).
  2. **Propuesta B — Relevo en caliente al caerse alguien a mitad de partido + combo del Mando 1 (completa el pendiente de la 0.3.55):**
     - En `SmashSoda/phoenix/web/ui/js/vistas/puestos.js` (`Fila`), cuando hay un partido en juego o pausado y un puesto de Equipo A o B queda libre por caída de un titular, la fila se resalta en ámbar y muestra botones `⚡ Relevo en 1 clic` con quien reconectó o está en `Mirando` (`mandos.asignar` / `mandos.tomar`).
     - En `SmashSoda/phoenix/web/Arbitro.cpp` (`tickArbitro`), pulsar **L3 + R3 + Select (Back)** (`0x0040 | 0x0080 | 0x0020`) en el mando físico del anfitrión (`botonesMandoPropio`) reasigna al instante el primer puesto libre del equipo incompleto (priorizando al titular que reconectó en `espectadores()`, o al primer suplente en `Mirando`) mediante `AccionesSala::asignarConectando` y lo anuncia en el chat con `mensajeDelBot`.
  3. **Propuesta C — Limpieza visual de puestos 09–16 en `MANDOS › PUESTOS`:** en `SmashSoda/phoenix/web/ui/js/vistas/puestos.js`, se quitó el cartel amarillo de 2 líneas repetido en cada fila 09–16 y se reemplazó por una sola pastilla `MANDOS 9–16 · MÓDULO SIDER` en la cabecera `JUGANDO` más un chip corto `EXTRA` en cada fila.
  4. **Propuesta D — Barra rápida `PARTIDO EN SALA` en `MANDOS › PUESTOS`:** componente `BarraPartidoEnSala` en `SmashSoda/phoenix/web/ui/js/vistas/puestos.js` arriba de `JUGANDO` que permite alternar entre `AMISTOSO`, `LIGA OFICIAL` y `TORNEO`, elegir el partido oficial (`partido.oficial` / `partido.torneo`), ver `✓ VINCULADO AL ACTA` y copiar el enlace de la sala (`sala.copiarEnlace`) sin salir de `MANDOS › PUESTOS`.
- **Commits/ramas:** `smash-soda-fork@plan-ux` (Link `0.3.56`) y `phoenixevolution@borrador` (este `TRASPASO.md`).
- **Solo en la PC (sin git):** `C:\dev\smash-soda-fork\_phoenix-link\x64\Release\PhoenixLink.exe` compilado en `0.3.56` con `cmake --build` y `ui\` actualizada junto al `.exe`.
- **Supabase:** nada nuevo (aplicadas hasta la **161**; siguiente libre: **162**).
- **A medias:** nada en Link `0.3.56`; todo compilado y sincronizado.
- **Esperando a Fralex:** probar `PhoenixLink.exe` `0.3.56` en sala real (barra de partido en Puestos, armado 8v8 y combo `L3+R3+Select` en partido).
- **Siguiente paso:** cualquier cuenta de Claude (Cuenta 1 o Cuenta 2) que retome Link solo debe hacer `git pull --rebase origin plan-ux` y verá el commit de la `0.3.56` y la fila en `REGISTRO-LINK.md`.
- **Candados:** Link vuelve a quedar libre / disponible para Cuenta 1 o Cuenta 2.

### 2026-10-28 20:45 (Lima) · Antigravity (Gemini) · Phoenix Link 0.3.57: Rediseño «Minimalismo Táctico» y reorganización visual (Sala, Mandos y Partido)
- **Hecho:** Con autorización de Fralex, se aplicó y compiló el rediseño estético y de arquitectura visual **Phoenix Link 0.3.57 («Minimalismo Táctico»)**:
  1. **Cápsula Unificada de Estado en la Barra Superior (`app.js`, `app.css`):** Las 3 pastillas sueltas (`SALA`, `WEB`, `JUEGO`) se unificaron en una sola cápsula interactiva (`.capsula-estado`: `🟢 SALA (N/M) | 🟢 WEB | 🟢 PES 2021`), conservando clic, tooltip y destello en cada segmento.
  2. **Jerarquía Visual de la Gestalt (`app.css`):** Las tarjetas estándar (`.cut`) usan glassmorphism redondeado (`16px`, borde sutil `rgba(255,255,255,.09)`, `backdrop-filter: blur(12px)`), mientras que las tarjetas protagonistas (`.cut.heroe`, `.cut.vivo`) conservan el borde luminoso degradado.
  3. **Carga Cognitiva Cero en `<QueHago>` (`vistas/quehago.js`):** La franja superior ya no se muestra cuando todo está normal; solo aparece cuando hay un aviso real (`warn`/`bad`) o un botón de acción pendiente, liberando ~56 px verticales en todas las vistas.
  4. **Reestructuración de `SALA › RESUMEN` (`vistas/sala.js`):** Con la sala abierta se eliminó la franja repetida `FranjaJuego` superior y se integró una barra de **4 controles rápidos en 1 clic** dentro de `Heroe` (`VISIBILIDAD`, `PLAZAS EN SALA`, `JUEGO Y PARCHE`, `CALIDAD STREAM`) más globo compacto `?` (`.help-dot`).
  5. **Reestructuración de `MANDOS › PUESTOS` (`vistas/puestos.js`, `vistas/mandos.js`, `grupos.js`):**
     - **Formación en 1 clic (`1V1`, `2V2`, `3V3`, `4V4`, `8V8`)** y botón compacto **`⚡ SENTADO AUTO: TODOS / AMIGOS / NO`** integrados en la barra de herramientas (quitando la tarjeta apilada `AjustesSentado` superior).
     - **Mini-mando en vivo (`MiniMandoFila` / `.mini-pad`)** integrado directamente dentro de cada fila ocupada (`01`..`16`) a ~30 Hz mediante `oirVivo`, mostrando sticks/botones pulsados ahora mismo y brillo en el avatar, con clic directo al mapeo.
     - **`OrdenPes` plegado en 1 sola línea** al pie (`🟢 ORDEN EN PES · ✓ PUESTO N = JUGADOR N · Máx: 8/16 puestos · [⚙ CONFIGURAR (8–16) ▾]`) para que toda la pantalla `MANDOS › PUESTOS` quepa sin hacer scroll.
  6. **Centro Táctico Unificado en `PARTIDO › MARCADOR` (`vistas/partido.js`):** `CampoTacticoIntegrado` muestra la **Cancha 2D en Vivo (`CampoSvg`)** con posesión y tiros en una rejilla de 2 columnas junto a `PartidoOficial` y `TorneoYDuelo` debajo del marcador.
- **Commits/ramas:** `smash-soda-fork@plan-ux` (Link `0.3.57`) y `phoenixevolution@borrador` (este `TRASPASO.md`).
- **Solo en la PC (sin git):** `C:\dev\smash-soda-fork\_phoenix-link\x64\Release\PhoenixLink.exe` compilado en `0.3.57` con `cmake --build` y `ui\` sincronizada en `x64\Release\ui\`.
- **Supabase:** nada nuevo (aplicadas hasta la **161**; siguiente libre: **162**).
- **A medias:** nada; `0.3.57` compilada y lista.
- **Esperando a Fralex:** abrir o recargar `PhoenixLink.exe` `0.3.57` para probar el nuevo diseño «Minimalismo Táctico».
- **Siguiente paso:** cualquier cuenta de Claude (Cuenta 1 o Cuenta 2) que retome Link solo debe hacer `git pull --rebase origin plan-ux`.
- **Candados:** Link queda libre / disponible para Cuenta 1 o Cuenta 2.

### 2026-10-28 21:15 (Lima) · Antigravity (Gemini) · Phoenix Link 0.3.58: arreglos de la 0.3.57 (8V8, colores vivos, Sala compacta)
- **Hecho:** (1) 8V8 sin error «visitante debe estar entre 1 y 7» (`AccionesMandosWeb.cpp`, `AccionesSalaWeb.cpp` ahora 1..15; `vistas/puestos.js` `aplicarFormacion` sube puestos y mandos a 16 y asigna el 8.º de cada equipo con `mandos.equipo`). (2) Paleta viva original restaurada en `.cut` (`css/app.css`). (3) `SALA › RESUMEN` con sala abierta: se quitan las cajas altas, controles rápidos en fila compacta y `FranjaJuego` fina arriba (`vistas/sala.js`, `css/app.css`).
- **Commits/ramas:** `smash-soda-fork@plan-ux` (Link `0.3.58`) y `phoenixevolution@borrador` (este archivo).
- **Solo en la PC (sin git):** `PhoenixLink.exe` `0.3.58` compilado con `cmake --build` y `ui\` sincronizada en `x64\Release\ui\`. Si Link estaba abierto, el anterior quedó como `PhoenixLink.old.exe`.
- **Supabase:** nada nuevo (siguiente libre: **162**).
- **A medias:** nada.
- **Esperando a Frank:** cerrar y abrir `PhoenixLink.exe` `0.3.58` y confirmar 8V8, colores y Sala abierta.
- **Siguiente paso:** quien retome Link: `git pull --rebase origin plan-ux`.
- **Candados:** Link libre.

### 2026-10-28 22:50 (Lima) · Antigravity (Gemini) · Phoenix Link 0.3.58 (ui): SALA unificada en 3 núcleos tácticos
- **Hecho:** Fase 2 de rediseño aplicada en `SALA` (aprobada por Frank en `propuesta_sala_3nucleos.md`). Se unificaron las 10 pestañas fragmentadas en 3 núcleos semánticos y directos:
  1. `PANEL DE SALA` (`id: "panel"`): enlace con copia rápida, tiempo en vivo, resumen de pings de invitados, puestos en juego y franja de juego.
  2. `INVITADOS Y ROLES` (`id: "gente"`): barra de conteo rápido (conectados, jugando vs mirando), silenciar chat en 1 clic y expulsar a todos; tarjetas completas de invitados separando jugadores con mando vs espectadores con dropdown para dar mando; panel derecho con Actividad en Vivo y Seguridad Rápida (visibilidad, espectadores, entrada directa Parsec).
  3. `RED Y TRANSMISIÓN` (`id: "transmision"`): calidad de imagen (presets Ligero/Equilibrado/Máxima, selector FPS 30/60/120/144, auto-ancho), selector de pantalla/audio, Semáforo Phoenix, Diagnóstico del PC y resumen de Última Partida.
- **Commits/ramas:** `smash-soda-fork@plan-ux` commits `7d0c90a` y `3871c26`. Sincronizado en `x64\Release\ui\` sin necesidad de recompilar el exe.
- **Supabase:** nada nuevo.
- **A medias:** nada; Fase 2 terminada.
- **Esperando a Frank:** cambiar de pestaña en Link o abrirlo para ver los 3 núcleos de SALA.
- **Siguiente paso:** Fase 3 (unificar `AJUSTES` en 2 paneles: General y Conexión/Avanzado).
- **Candados:** Link libre.

### 2026-10-28 23:18 (Lima) · Antigravity (Gemini) · Phoenix Link 0.3.58 (ui): AJUSTES en 2 paneles tácticos y PARTIDO unificado
- **Hecho:** Fase 3 de rediseño aplicada en `AJUSTES` y corrección de navegación en `grupos.js`:
  1. **Pastillas de `PARTIDO` (`grupos.js`):** Se eliminó la pestaña duplicada `[ CAMPO 2D ]` y se unificó con `[ MARCADOR ]` en una sola pastilla limpia `[ MARCADOR Y CAMPO ]` más `[ HISTORIAL ]`.
  2. **`AJUSTES` unificado en 2 paneles (`ajustes.js`, `grupos.js`):**
     - **`GENERAL Y SISTEMA` (`id: "general"`):** Lo fundamental (idioma y sentado automático), selector de tema (Galaxy vs Liga B), bot del chat y sonidos de chat (`!sfx`, volumen, cooldown, avisos de entrada).
     - **`INTERFAZ Y OVERLAY` (`id: "overlay"`):** Overlay sobre el juego (selector de monitor, tema, posiciones y atajos), entrada y seguridad (desactivar botón Guía, auto-index mandos, bloqueo IP/VPN), avisos de ventana, herramientas de interfaz (tutorial, bienvenida, recargar) y servidor WebSocket/registros de desarrollo.
  3. **Botón «En reposo» (`puestos.js`):** Eliminado definitivamente de cada fila de puestos.
- **Commits/ramas:** `smash-soda-fork@plan-ux` commits `cffeb71`, `762c30c`, `c428687` y `cc8b511`. Sincronizado en `x64\Release\ui\` sin recompilar.
- **Supabase:** nada nuevo.
- **A medias:** nada; Fases 1, 2 y 3 concluidas.
- **Esperando a Frank:** probar la navegación de Phoenix Link.
- **Candados:** Link libre.

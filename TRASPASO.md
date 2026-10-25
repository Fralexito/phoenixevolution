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
| Supabase (migraciones) | proyecto `fiibiyijojkxqlsrhcil` | libre — **todas aplicadas hasta 154** (145–154 el 25-oct, probadas en seco); Edge Functions `torneos` y `goles` desplegadas; siguiente libre: **155** | 2026-10-25 |
| Overlay | `phoenix-overlay@main` | libre | — |
| Documentación / Drive | `docs/` de cada repo · `D:\Frank\IA\CLAUDE\RESPALDAR_A_DRIVE.ps1` | libre (el respaldo a Drive solo se corre en la PC) | — |

**Juego (PES) y Sider:** solo una cuenta a la vez puede pedir pruebas en el juego o instalar módulos, porque es una sola PC y un solo PES. Si la otra cuenta tiene un candado de PES, no instales nada en `SiderAddons`.

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


# Base para continuar Phoenix Evolution desde este proyecto (21-oct-2026)

Este documento resume lo que leí: las 37 memorias de Claude de Phoenix, la memoria de Alfaro VIP, los `CLAUDE.md` y `COORDINACION.md` de cada repo, el paquete `para-proyecto`, Drive, GitHub y Supabase. Todo se hizo en solo lectura. El detalle técnico de la revisión está en `INFORME-REVISION-PHOENIX-21-OCT-2026.md`.

---

## 1. Dónde está la memoria de Claude

| Carpeta | Qué tiene |
|---|---|
| `C:\Users\WinterOS\.claude\projects\D--Frank-IA-CLAUDE\memory\` | **Las 37 memorias de Phoenix** (índice `MEMORY.md`). Es idéntica a la copia `para-proyecto/memoria/` |
| `...\D--Frank-IA-Proyectos-IA-Claude-ALFARO-VIP\memory\` | 2 memorias de **otro proyecto** (barbería Alfaro VIP: Vercel y Supabase `xzuktrhakteddmpfdgne`, en la misma organización de Supabase que Galaxy League). No hay que tocarlo desde aquí |
| Las otras ~13 carpetas de `projects\` | Vacías (sesiones sueltas sin memoria) |

**Importante:** las memorias solo se cargan solas si la sesión se abre en `D:\Frank\IA\CLAUDE`. En este proyecto hay que leerlas a mano o apoyarse en este resumen.

---

## 2. Cómo quiere Fralex que se trabaje

**Forma de responder**
- Siempre en español sencillo, con SÍ/NO primero y sin exagerar.
- El avance se mide contra el objetivo total, no contra el último paso.
- Respuestas cortas. Hay que explicar sin jerga, porque Fralex tiene poca experiencia programando.
- Las reglas son costumbres por defecto: se adaptan al tamaño del pedido y, si se salta una, se dice en una línea.

**Los 5 límites que nunca se flexibilizan**
1. No borrar ni sobrescribir trabajo sin commit de otro hilo.
2. No compilar Link con `COMPILAR_PHOENIX.bat`, porque borra lo no commiteado. Se usa `cmake --build C:\dev\smash-soda-fork\_phoenix-link\build --config Release --parallel`.
3. No cambiar ajustes de seguridad (panel de Supabase, Auth, claves).
4. Nada de apuestas con dinero real.
5. Pedir permiso antes de descargar algo o de hacer algo irreversible.

**Costumbres por frente**

- **Web** (`C:\dev\pes-liga-automatica`, rama `borrador`)
  - Subir `VERSION_BETA` en `src/data/versionWeb.js`: +1 al último número en un cambio normal, +1 al del medio en uno grande.
  - Anotar cada cambio en `REGISTRO.md`, con la ronda en `MAPA.md`. Cada día de trabajo lleva bitácora en `docs/bitacoras` y guía en `docs/guias`.
  - Antes de un commit: `npm test`, `npm run build` y `npm run test:paginas`.
  - Pasar a `main` solo cuando él diga «Súbelo» o «Publícalo».
  - Nada de ventanas nativas, texto de 12 px como mínimo y no tocar la identidad Galaxy (cian y púrpura) ni la Sudario (azul y dorado).
  - El parche se llama «Conmegol» y no hay que «corregirlo».
  - React solo como isla.
- **Link** (worktree `_phoenix-link`, rama `plan-ux`)
  - Subir `kVersion` en `PhoenixBuild.h` en cada cambio.
  - Mejorar dentro del diseño actual, que es un fork de Smash Soda con el estilo Galaxy. Nunca rehacerlo desde cero (ya rechazó dos rediseños).
  - Sync tiene sección propia y nunca va dentro de Ajustes.
  - Link solo toca `sider.ini` con su instalador «Módulos del juego» y con PES cerrado.
  - Todo debe funcionar en cualquier PC y parche: detectar por evidencia, no por rutas fijas.
- **Sync** (raíz de `smash-soda-fork`, rama `mercado-fase0`)
  - Phoenix-DB es una base **provisional** (copia de olmosjr23). No hay que dar por fijos sus IDs.
- **PES**
  - Dentro del juego solo se aceptan réplicas exactas de sus menús, hechas con píxeles reales.
  - Si PES no abre tras un cierre, hay que cerrar el `sider.exe` que quedó colgado.
  - Las pruebas en vivo se hacen solo cuando él las ofrece.
  - Hay que blindar contra fallos y probar fuera del juego antes de entregar.
  - Todo hallazgo de REA o Ghidra se guarda en `cap_62` del libro.
- **GitHub y Drive**
  - Se puede hacer push aunque los repos sean públicos (autorizado el 16-oct).
  - Nunca subir `PhoenixBetaSello.h` ni la rama `respaldo-antes-de-quitar-sello`.
  - Desde el 20-oct todo va a GitHub **y** a Drive. Lo viejo se sube a Drive cuando él dé por terminados los mandos extra.
- **Supabase**
  - Lo que Claude no pueda ejecutar se le da a Fralex como SQL listo para pegar en el SQL Editor.
  - Cada migración va por `apply_migration` y además como archivo `NNN_*.sql` en el repo. La siguiente libre es la 139.
- **Hilos**
  - Cada hilo lleva prefijo de prioridad: 0 principal, 1 en curso, 2 por probar, 3 web y 4 archivo.
  - Se renombra según su rumbo.
  - Si otro hilo ya trabaja un tema, el pedido se le pasa a ese hilo.

**Su objetivo de fondo:**
- Descifrar todo PES 2021, sin límite de tiempo. Hoy va por menos del 1 %.
- Tener un modo configurable de N contra N con cancha pequeña, tipo FIFA Street.
- Llegar a más de 8 humanos.
- Construir un ecosistema propio: web ⇄ Link ⇄ Sync ⇄ PES.

---

## 3. Estado real de cada frente (comprobado hoy)

| Frente | Estado | Siguiente paso |
|---|---|---|
| **Web** | Beta 1.13.0 (`abc31fa`) en `borrador`, en GitHub y con la CI en verde. `main` sigue en la ronda 275 (13-oct). Economía A–E montada con los pagos **apagados** y en modo prueba | Cuando lo pidas: «Publícalo» (`borrador` → `main`) |
| **Link** | 0.3.44 **sin commit** (37 cambios: conexión de cuenta arreglada y puestos 9–16). En GitHub está la 0.3.40 | Tu visto bueno al commit y al push (lo lleva otro hilo) |
| **Mandos 9–16 en PES** | Módulo Sider v0.9.x: la pantalla de lados funciona, pero el jugador 9+ no se mueve. Hipótesis: falta el «número de usuario local». Tope 16 por ViGEm | Tu prueba en vivo: partido con la fila 13 en un lado y decir «listo» en su hilo |
| **Sync** | `mercado-fase0` al día (phoenix.lua v0.18c). Los frentes 125–128 están terminados y aplicados | Probar fichajes en un PES real |
| **Cancha / FIFA Street** | Cancha 30×20 lograda (lógica y dibujo). Pendientes: portería dibujada, N contra N y la regla de «mínimo 7 jugadores» | Retomar cuando quieras (análisis en Ghidra, sin pruebas en vivo) |
| **Overlay** | Código al día. **No hay release publicada** | Reempaquetar si se va a repartir |
| **App Galaxy** | Repo vacío | — |
| **Supabase** | Sano: 42 MB, 3 usuarios, 185 tablas con RLS, 10 funciones edge, 16 tareas cron | Ver riesgos |
| **Drive** | Al día hasta el 15-oct, más 6 respaldos del 21-oct. Faltan mandos 9+ y Link 0.3.41–0.3.44 | Subir todo cuando termine lo de los mandos |

---

## 4. Lo que está desactualizado y conviene corregir

**En las memorias**
1. `no-subir-a-github-publico` dice que solo Link y overlay son públicos. **Los 4 repos lo son.**
2. `drive-pendiente-solo-github` dice «no empujar Link/overlay a públicos sin visto bueno». Eso contradice el permiso del 16-oct.
3. `documentar-logros-github-drive` habla de la rama `rediseño-phoenix-portal`. Hoy Link va en `plan-ux`.
4. `pes-cancha-modo-street-prototipo-a` dice «sin git push». Ya está superado.
5. `MEMORY.md` tiene repetida la línea «Responder siempre en español».

**En los archivos de los repos**
6. `pes-liga-automatica/CLAUDE.md` dice «subir SOLO a GitHub, no hay Drive». Desde el 20-oct va a GitHub y Drive.
7. `smash-soda-fork/CLAUDE.md` y `COORDINACION.md` dicen que el frente LINK está en la rama `rediseño-phoenix-portal` y lo llaman «Mercado». Hoy son `plan-ux` y Sync. También presentan `COMPILAR_PHOENIX.bat` como la forma normal de compilar.

**En el paquete `para-proyecto`**
8. `REGISTRO-LINK.md` no tiene la línea de la 0.3.44.
9. Hay 7 puntos más (13 → 37 cambios sin commit, el tag del overlay que no existe, la regla 10 de `cap_02`, etc.). Están en la sección 4 del informe.

Todo esto se arregla en un solo paso de documentación cuando lo autorices. No lo toqué porque la tarea era de solo lectura.

---

## 5. Riesgos a decidir

1. **Apuestas y dinero real.** Existen apuestas entre jugadores con comisión y recargas con dinero real. Hoy están en 0 y con los pagos apagados. Hay que separar las monedas de apuesta de las compradas, o apagar las apuestas, antes de encender `pagos_activos`.
2. **Repos públicos.** Hay que decidir si se pasan a privados (GitHub → Settings → Change visibility).
3. **Seguridad del panel (lo cambias tú).** Activar «Leaked password protection» y la verificación en dos pasos para el admin (`admin_exige_mfa`).
4. **Link 0.3.44 vive solo en esta PC.** Si no se hace el commit, se puede perder.

---

## 6. Orden recomendado para seguir

1. Hacer el commit y push de Link 0.3.44, desde su hilo y con tu visto bueno.
2. Hacer la prueba en vivo de mandos 9+ cuando quieras («listo»).
3. Decidir sobre las apuestas y los repos públicos.
4. Corregir las memorias y los `CLAUDE.md` desactualizados (sección 4) y regenerar `para-proyecto` con `ACTUALIZAR_PARA_PROYECTO.ps1`.
5. Al cerrar lo de los mandos: subir todo a Drive y, después, retomar la cancha y el N contra N.

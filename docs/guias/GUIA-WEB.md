# Web Phoenix Evolution · Guía completa: cómo retomar el proyecto y cómo usar todo lo nuevo

Guía paso a paso para Fralex, para los testers y para cualquier IA:
- primero, la base para continuar todo el proyecto: reglas, límites, estado de cada frente y orden de pasos;
- después, cómo usar cada novedad de la web, del 19 y del 21-oct.

Las novedades nuevas se añaden aquí como una parte más.

> **Cómo está hecho este documento:** junta, **completos y sin recortar**, 3 documentos que antes estaban sueltos (reorganización del 21-oct-2026, por pedido de Fralex: «cada documento por tema y que tenga absolutamente completo»). Cada parte dice de qué archivo viene. Los originales siguen intactos en la carpeta `_archivo/` y en el historial de git. **Desde ahora, lo nuevo de este tema se AÑADE aquí** como una parte más, con: qué se logró, paso a paso para replicarlo, errores e intentos fallidos, cosas a tener en cuenta, y cómo comprobar y revertir.

## Índice

- [Parte 1 · Base para continuar Phoenix Evolution desde este proyecto (21-oct-2026)](#parte-1-base-para-continuar-phoenix-evolution-desde-este-proyecto-21-oct-2026) — origen `docs/guias/GUIA-RETOMAR-PROYECTO-21-OCT-2026.md` (a75cf94 2026-10-21)
- [Parte 2 · Guía paso a paso · Todo lo nuevo de la web (19 de octubre de 2026)](#parte-2-guia-paso-a-paso-todo-lo-nuevo-de-la-web-19-de-octubre-de-2026) — origen `docs/guias/GUIA-NOVEDADES-19-OCT-2026.md` (e732012 2026-10-19)
- [Parte 3 · Guía de novedades de la web · 21 de octubre de 2026](#parte-3-guia-de-novedades-de-la-web-21-de-octubre-de-2026) — origen `docs/guias/GUIA-NOVEDADES-21-OCT-2026.md` (b770e13 2026-10-21)

---

## Parte 1 · Base para continuar Phoenix Evolution desde este proyecto (21-oct-2026)

> Origen: `docs/guias/GUIA-RETOMAR-PROYECTO-21-OCT-2026.md` · último cambio a75cf94 2026-10-21 · 9359 bytes. Copia íntegra.

Este documento resume lo que leí: las 37 memorias de Claude de Phoenix, la memoria de Alfaro VIP, los `CLAUDE.md` y `COORDINACION.md` de cada repo, el paquete `para-proyecto`, Drive, GitHub y Supabase. Todo se hizo en solo lectura. El detalle técnico de la revisión está en `INFORME-REVISION-PHOENIX-21-OCT-2026.md`.

---

### 1. Dónde está la memoria de Claude

| Carpeta | Qué tiene |
|---|---|
| `C:\Users\WinterOS\.claude\projects\D--Frank-IA-CLAUDE\memory\` | **Las 37 memorias de Phoenix** (índice `MEMORY.md`). Es idéntica a la copia `para-proyecto/memoria/` |
| `...\D--Frank-IA-Proyectos-IA-Claude-ALFARO-VIP\memory\` | 2 memorias de **otro proyecto** (barbería Alfaro VIP: Vercel y Supabase `xzuktrhakteddmpfdgne`, en la misma organización de Supabase que Galaxy League). No hay que tocarlo desde aquí |
| Las otras ~13 carpetas de `projects\` | Vacías (sesiones sueltas sin memoria) |

**Importante:** las memorias solo se cargan solas si la sesión se abre en `D:\Frank\IA\CLAUDE`. En este proyecto hay que leerlas a mano o apoyarse en este resumen.

---

### 2. Cómo quiere Fralex que se trabaje

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
  - Cada migración va por `apply_migration` y además como archivo `NNN_*.sql` en el repo. La siguiente libre es la 140 (la 139, patrocinadores, quedó aplicada el 21-oct).
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

### 3. Estado real de cada frente (comprobado hoy)

| Frente | Estado | Siguiente paso |
|---|---|---|
| **Web** | Beta 1.15.1 en `borrador` al cierre del 21-oct (1.14.0 Jugadores con panel lateral; 1.15.0 patrocinadores, overlay de torneo premium y 8 caras; 1.15.1 migración 139 completa y probada; detalle en `docs/bitacoras/BITACORA-21-OCT-2026-HILO-DECISIONES-WEB.md`), en GitHub. `main` sigue en la ronda 275 (13-oct). Economía A–E montada con los pagos **apagados** y en modo prueba | Cuando lo pidas: «Publícalo» (`borrador` → `main`) |
| **Link** | 0.3.44 **sin commit** (37 cambios: conexión de cuenta arreglada y puestos 9–16). En GitHub está la 0.3.40 | Tu visto bueno al commit y al push (lo lleva otro hilo) |
| **Mandos 9–16 en PES** | Módulo Sider v0.9.x: la pantalla de lados funciona, pero el jugador 9+ no se mueve. Hipótesis: falta el «número de usuario local». Tope 16 por ViGEm | Tu prueba en vivo: partido con la fila 13 en un lado y decir «listo» en su hilo |
| **Sync** | `mercado-fase0` al día (phoenix.lua v0.18c). Los frentes 125–128 están terminados y aplicados | Probar fichajes en un PES real |
| **Cancha / FIFA Street** | Cancha 30×20 lograda (lógica y dibujo). Pendientes: portería dibujada, N contra N y la regla de «mínimo 7 jugadores» | Retomar cuando quieras (análisis en Ghidra, sin pruebas en vivo) |
| **Overlay** | Código al día. **No hay release publicada** | Reempaquetar si se va a repartir |
| **App Galaxy** | Repo vacío | — |
| **Supabase** | Sano: 42 MB, 3 usuarios, 185 tablas con RLS, 10 funciones edge, 16 tareas cron | Ver riesgos |
| **Drive** | Al día hasta el 15-oct, más 6 respaldos del 21-oct. Faltan mandos 9+ y Link 0.3.41–0.3.44 | Subir todo cuando termine lo de los mandos |

---

### 4. Lo que está desactualizado y conviene corregir

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

### 5. Riesgos a decidir

1. **Apuestas y dinero real: RESUELTO el 21-oct.** La migración 140 «ascuas solo gratis» hace que lo comprado con dinero ya no pueda llegar a un pozo de apuestas (`docs/economia/BITACORA-DINERO-APUESTAS-Y-LEGAL.md`). Antes de encender los pagos reales solo falta la revisión legal y los términos de Parsec y Steam.
2. **Repos públicos.** Hay que decidir si se pasan a privados (GitHub → Settings → Change visibility).
3. **Seguridad del panel (lo cambias tú).** Activar «Leaked password protection» y la verificación en dos pasos para el admin (`admin_exige_mfa`).
4. **Link 0.3.44 vive solo en esta PC.** Si no se hace el commit, se puede perder.

---

### 6. Orden recomendado para seguir

1. Hacer el commit y push de Link 0.3.44, desde su hilo y con tu visto bueno.
2. Hacer la prueba en vivo de mandos 9+ cuando quieras («listo»).
3. Decidir sobre las apuestas y los repos públicos.
4. Corregir las memorias y los `CLAUDE.md` desactualizados (sección 4) y regenerar `para-proyecto` con `ACTUALIZAR_PARA_PROYECTO.ps1`.
5. Al cerrar lo de los mandos: subir todo a Drive y, después, retomar la cancha y el N contra N.

---

## Parte 2 · Guía paso a paso · Todo lo nuevo de la web (19 de octubre de 2026)

> Origen: `docs/guias/GUIA-NOVEDADES-19-OCT-2026.md` · último cambio e732012 2026-10-19 · 11946 bytes. Copia íntegra.

Para **Fralex** y para cualquiera que use o pruebe la web. Explica **cómo se usa** cada cosa nueva, en pocas palabras.
Lo técnico (archivos, migraciones, pruebas) está en `docs/bitacoras/BITACORA-19-OCT-2026-CUENTA-ECONOMIA.md`.

Vista previa: **https://fralexito.github.io/phoenixevolution/fase-beta-1-0/**

---

### 1. ¿Qué versión estoy viendo?

1. Mira la cinta de **abajo a la izquierda**: dice, por ejemplo, **«FASE BETA 1.5.0 · 19 oct 14:02»**.
2. El número sube con cada cambio:
   - el **último** número sube en cada cambio pequeño (1.5.0 → 1.5.1);
   - el **del medio** sube cuando se termina algo grande (1.5.3 → 1.6.0).
3. La hora es cuándo se generó esa versión. Si no ves la hora nueva, recarga la página.

---

### 2. Modo demostración (ver todo funcionando con datos de ejemplo)

Sirve para ver cómo se ve cada sistema **con actividad**, aunque todavía no haya partidos ni publicaciones de verdad.

**Encenderlo (cualquiera de estas formas):**
- Configuración → **Notificaciones y en vivo** → interruptor **«Modo demostración»**.
- O añade **`?demo=1`** al final de la dirección, por ejemplo `…/fase-beta-1-0/social/?demo=1`.

**Qué verás:**
- Una píldora amarilla abajo a la izquierda: **«Modo demostración»**.
- **En vivo / Duelos / Ahora**: salas con marcador que avanza, minutos y ¡GOL!.
- **Social**: publicaciones nuevas cada poco, reacciones que suben, historias, #etiquetas y tendencias.
- **Campana**: avisos nuevos cada minuto y medio.
- **Chat general**: mensajes nuevos cada 12 segundos (lo que escribas sale como «Tú» y no se envía).
- **Inicio**: la sección «Ahora en Phoenix» llena.

**Apagarlo:** botón **«Salir»** de la píldora, o el mismo interruptor, o `?demo=0`.

**Importante:** lo que hagas sobre cosas inventadas no se guarda. Lo que hagas sobre cosas reales (tu perfil, publicar de verdad) sí se guarda.

---

### 3. Inicio

- Arriba, tu saludo y las 4 ventanas (Mi Club primero).
- Debajo, la banda dorada **«Tu club»**: tu escudo, presupuesto, ofertas y atajos (si no tienes club, te invita a elegir uno).
- **«Ahora en Phoenix»** (nuevo): tres filas que se deslizan de lado:
  1. **Salas en juego**: quién juega contra quién, marcador y minuto (necesitas haber entrado con tu cuenta).
  2. **Historias de hoy**: toca una para ir a Social.
  3. **Lo más reaccionado en Social**: toca una para abrir la publicación.
- Si no hay nada que mostrar, esta sección no aparece.

---

### 4. Mi club («El Estadio»)

1. Entra desde **Mi club** (menú, o el botón dorado del centro de la barra de abajo en el celular).
2. Barra de arriba: **Resumen · Plantilla · Fichajes · Mi partida de PES · Diario** (y **Administrar la liga** si eres staff). El **«?»** abre la guía «Cómo funciona Mi club».
3. **Plantilla**: vista **Cancha** (todo el equipo en una pantalla, por líneas) o **Cartas**. Ordena con los botones Media · Valor · Edad · A-Z.
4. **Fichajes**: la sala de fichajes, **Tus ofertas** y **Explorar el mercado** (buscador, de 12 en 12, «Ver más»).
5. **Mi partida de PES**: es el club de **tu PES en tu PC** (con Phoenix Sync), no el club de la web.

---

### 5. Social

#### 5.1 Moverte por el muro
- Arriba: **Recientes · Siguiendo · Destacado**.
- El botón **⚙ (Ordenar y filtrar)**: ordenar (Nuevos, Más reacciones, Más comentados), elegir juego y la vista (Amplia o Compacta). Si cambiaste algo, el botón muestra un **puntito**.
- **Tendencias**: las #etiquetas más usadas (en el celular, debajo de la barra; en PC, a la derecha). Tócalas para ver solo esas publicaciones.
- En el celular, **tira hacia abajo** desde arriba del todo para recargar.

#### 5.2 Reaccionar (con estilo Phoenix)
- **Toca «Reaccionar»** → 🔥.
- **Doble toque** (o doble clic) sobre una publicación → 🔥 con una llamarada.
- **Mantén pulsado «Reaccionar»** (o toca 😊) → reacciones Phoenix:
  **🔥 Fuego · ⚽ Golazo · 🧤 Atajada · 🤝 GG · 🐐 Crack · 😂 Risa**, y debajo más emojis.
- Toca tu misma reacción otra vez para quitarla.

#### 5.3 Otras acciones de cada publicación
- **💬** abre las respuestas ahí mismo; puedes responder sin salir.
- **Compartir** copia o comparte el enlace.
- Menú **⋯**: **Guardar**, **Retar a duelo** (te lleva a «Lanzar reto» con esa persona ya elegida), **Reportar** (y **Ocultar** si eres moderador).
- Toca una **foto** para verla en grande; desliza para pasar a la siguiente; Esc o tocar fuera para cerrar.
- Toca una **#etiqueta** para ver todas las publicaciones con ella; «Quitar» para volver.

#### 5.3b Lo nuevo de la fase 2 (versión 1.6.0)
- **Compartir en tu muro**: toca **↻** en una publicación → «En tu muro» (añade un comentario si quieres) → **Compartir en mi muro**. La publicación de la otra persona aparece dentro de la tuya y a ella le llega un aviso. «Fuera de Phoenix» envía o copia el enlace.
- **↻ con número**: cuántas veces la compartieron. **👁 con número**: cuántas personas la vieron.
- **¿Quién reaccionó?**: toca los emojis con el número (a la derecha del pie). Hay pestañas por emoji.
- **❤️ en las respuestas**: toca el corazón para dar «me gusta» a una respuesta.
- **Tarjeta rápida**: toca la cara o el nombre de alguien → ves su país, club, lema y duelos, y puedes **Seguir**, **Retar** o **Ver perfil**.
- **Racha 🔥**: arriba, junto a ⚙, ves cuántos días seguidos llevas activo en Social. Si dice **«¡hoy!»**, reacciona, responde o publica hoy para no perderla.

#### 5.4 Publicar
1. Toca **«¿Qué está pasando?»**.
2. Escribe. Debajo, **«Añade a tu publicación»**: cada opción dice qué hace:
   - **Foto o video** (hasta 4 fotos o 1 video) · **Encuesta** · **Cómo estás** · **Fondo de color** · **Video o directo** (YouTube, TikTok, Kick, Twitch) · **Duelo jugado** · **Juego** · **Emojis** · **Mencionar (@)** · **Etiqueta (#)** · **Historia** (dura 24 h).
3. Si una opción no se puede usar, te dice **por qué** (por ejemplo «No va con encuesta»).
4. Abajo verás **«Vas a publicar: …»** con el resumen.
5. Toca **Publicar** (en PC también Ctrl + Enter). Si cierras sin publicar, el borrador se guarda solo.

---

### 6. Chat (amigos y general en el mismo lugar)

- **PC**: la columna de la derecha tiene arriba **Amigos | General**. Elige una.
- **Celular**: toca el botón **💬 Chats** del panel flotante de abajo a la derecha → misma elección **Amigos | General**.
- La web recuerda cuál elegiste.

---

### 7. Duelos — Lanzar un reto (paso a paso)

1. Toca **«Lanzar reto»**. Se abre una ventana con 4 pasos.
2. **Rival**: «A toda la red» (cualquiera puede aceptarlo) o «A un jugador» (elígelo en las tarjetas; ves si está en línea y si tiene host).
3. **Equipos**: 1v1, 2v2, 3v3, 4v4 u Otro; en equipos puedes invitar amigos.
4. **Hora**: Ya · 15 min · 30 min · 1 hora · Otra hora.
5. **Sala**: «Yo tengo host» o «Necesito host», plataforma y espectadores.
6. Revisa el **boleto** (resumen) y toca **«Emitir reto»**.
- Si falta algo, la ventana te dice qué (por ejemplo «Elige a tu rival para seguir»).

---

### 8. Salas de Phoenix Link (En vivo)

- Cada sala muestra si está **esperando rival**, **rival listo** o **en partido**, con el marcador, el minuto y quién está conectado.
- Toca **«Ver el partido»** o **«Jugar»**: la web reserva tu puesto y **abre Parsec**. Si no se abre, te da otras opciones (abrir de nuevo, invitación web, descargar Parsec).

#### Desde un celular Android
- **Sí se puede** entrar con la app de Parsec para Android, y Phoenix Link te ve como a cualquier jugador.
- **Conecta un mando** (Bluetooth o USB) antes de entrar: la pantalla táctil no sirve para jugar PES.
- Si Parsec no se abre solo, usa **«Invitación web»**; si no tienes la app, el botón te lleva a **Google Play**.

---

### 9. Liga — cómo leer la tabla

- **▲ 2 / ▼ 1**: cuántos puestos subió o bajó desde la fecha anterior (– = mismo puesto).
- **Corona**: el líder.
- **Últimos 5**: verde = ganó, amarillo = empató, rojo = perdió; el de la derecha (más grande) es el más reciente. Pasa el dedo o el mouse para ver el marcador.
- **Colores de la franja izquierda**: zona de copa y zona de descenso.

---

### 10. Perfil

- **Mi perfil** (editar): a la derecha ves **«Así te ven»** cambiando mientras escribes; el anillo **«Perfil al N %»** te dice qué falta; el país se elige en una **lista con banderas**; el botón dice **«Guardar N cambios»**.
- **Perfil público**: cifras que cuentan, duelos con anillo de efectividad y barra de ganados/empates/perdidos, bandera y escudo.

---

### 11. Configuración

- Arriba, el **buscador** encuentra cualquier opción.
- **Estilos rápidos**: Phoenix, Torneo, Minimalista, Nocturno, Lectura cómoda (un toque cambia varias cosas).
- Cada sección tiene **«Restablecer»**. Cada cambio se guarda solo (sale «Guardado»).

---

### 12. Jugadas — los videos de la comunidad en vertical

1. Entra desde **Social** con el botón naranja **«Jugadas»** (la claqueta, en la barra de arriba del muro) o **desliza el dedo hacia la izquierda** en cualquier parte del muro, como los Reels de Instagram. También está en el menú.
2. **Desliza hacia arriba** para pasar a la siguiente jugada (en PC: flechas ↑ ↓ o la rueda del ratón). Solo suena/se mueve la que estás viendo.
3. **Toca dos veces** el video para darle 🔥. **Mantén pulsado** el botón de fuego para elegir otra reacción (Golazo, Atajada, GG, Crack, Risa).
4. El **termómetro** debajo del fuego es el **Calorímetro**: mientras más lleno, más fuego tiene esa jugada comparada con las demás.
5. **Retar** te lleva a lanzarle un duelo al autor. **Compartir** copia o comparte el enlace. El altavoz activa el sonido (en PC también la tecla **M**).
6. Arriba eliges qué ver: **Para ti** (lo nuevo), **Top semana** (lo que más fuego tuvo en 7 días) o una categoría (Golazos, Atajadas, Skills, Remontadas, Fails).
7. **Subir** (botón naranja): elige el tipo de jugada, el video (archivo de tu celular o PC de hasta 15 segundos, o un enlace de YouTube/TikTok/Kick/Twitch) y ponle título y juego.
8. Para volver a Social, **desliza hacia la derecha** o toca la flecha **←** de arriba a la izquierda.
9. Si el video es tuyo, en la columna derecha aparece **Eliminar** (pregunta antes).

**Modo demostración:** la beta ahora abre con la demostración encendida la primera vez, así ves todo con actividad. El aviso amarillo «Modo demostración · Salir» la apaga; lo que hagas sobre lo simulado no se guarda.

---

### 13. Eliminar publicaciones y respuestas

- **Tu publicación**: toca **⋯** arriba a la derecha → **Eliminar** (en rojo). Te pregunta antes; se borra para todos con sus respuestas y reacciones.
- **Una respuesta**: debajo de la respuesta aparece **Eliminar** si es tuya o si está en una publicación tuya.
- Los administradores pueden eliminar cualquiera.

### 14. La web más ligera (1.8.0)

La cinta de «Última hora», el desplazamiento suave, los puntos que laten y las estrellas de Inicio gastaban procesador aunque no tocaras nada. Ahora casi no gastan: la web debería sentirse más fluida y el celular calentarse menos. Si notas alguna página lenta, di cuál y en qué aparato.

---

### 15. Recargar y subir en Social

- El **↻** junto a «Jugadas», en la barra de arriba del muro, trae las publicaciones nuevas.
- Al bajar aparece un **botón redondo** abajo a la derecha: te sube arriba y recarga a la vez.
- Al final del muro también hay **Recargar** (y **Publicar algo**).
- Mientras carga, el icono gira; al terminar se pone verde.

---

### 16. Si algo no se ve bien

1. Mira la versión de la cinta (paso 1) y recarga.
2. Prueba con `?demo=1` para ver si es por falta de datos.
3. Avisa qué página, qué ves y en qué aparato (celular o PC).

---

## Parte 3 · Guía de novedades de la web · 21 de octubre de 2026

> Origen: `docs/guias/GUIA-NOVEDADES-21-OCT-2026.md` · último cambio b770e13 2026-10-21 · 2893 bytes. Copia íntegra.

Para Fralex y los testers. Paso a paso y en palabras simples. Versión de la vista previa: **beta 1.15.1** (la ves en la cinta de abajo a la izquierda).
Vista previa: https://fralexito.github.io/phoenixevolution/fase-beta-1-0/

---

### 1. Jugadores: panel lateral y vista Lista
1. Entra a **Jugadores** (menú de arriba).
2. **En PC:** a la izquierda tienes un panel.
   - **Posición:** toca «Porteros», «Defensas», «Medios» o «Delanteros» para ver solo esos. El punto de color es el de cada línea. «Todas» quita el filtro.
   - **Equipo:** toca un equipo para ver solo sus jugadores. El número de la derecha dice cuántos hay.
3. **En el celular:** las posiciones salen como botones encima de las cartas; deslízalos de lado. El equipo se elige en el desplegable de la barra.
4. **Vista Lista:** en la barra, toca **«Lista»**. Sale una fila por jugador con su posición, club y media. Toca la fila para abrir su perfil, o la balanza para compararlo.
5. Para volver a las cartas, toca **«Todos»**.

### 2. Patrocinadores (solo el admin)
1. Entra a **Moderación** con tu cuenta de admin. Baja hasta **«Patrocinadores»**.
2. Elige **Torneo** o **Clan** y escribe su número (el del enlace: `/torneo/?id=12` → 12).
3. Escribe el nombre del patrocinador, pega el enlace de su **logo** (debe empezar con `https://`) y, si quieres, el de su web.
4. Elige desde qué día y (opcional) hasta qué día se muestra. Usa la **nota privada** para anotar el precio o el acuerdo: nadie más la ve.
5. Pulsa **Guardar**. En la página del torneo o del clan aparece «Patrocinado por» con el logo.
6. **Editar:** pulsa «Editar» en la lista, cambia y guarda. **Pausar:** quita el check «Activo». **Quitar:** deja de verse y queda guardado como historial.
- Revisa que el logo sea apto para menores (nada de alcohol ni apuestas).

### 3. Overlay de transmisión (torneos premium)
1. Abre tu torneo y hazlo **premium** en «Opciones del organizador» (300 gemas, una sola vez).
2. En el mismo lugar sale **«Overlay de transmisión»** con un enlace. Pulsa **Copiar**.
3. En **OBS** o **TikTok LIVE Studio**: añade una fuente **«Navegador»**, pega el enlace y pon **ancho 1080 y alto 1920**.
4. Listo: muestra el último resultado, los próximos partidos y el campeón. Se actualiza solo cada 15 segundos cuando anotas resultados en la web.
- **Para probar sin torneo:** abre `/overlay-torneo/?demo=1`.
- **Liga Sudario:** añade `&tema=sudario` al final del enlace para los colores azul y dorado.

### 4. Caras nuevas
- 8 jugadores que no tenían cara en el juego ahora muestran una foto recortada (Alisson, Conor Bradley, Urbig, Dowman, Godts, Lewis-Skelly, Rico Lewis y Mendoza).
- Son fotos libres de Wikimedia: en la ficha del futbolista sale el nombre del autor, como pide la licencia.

---

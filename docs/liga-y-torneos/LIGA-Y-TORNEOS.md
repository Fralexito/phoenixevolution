# Web Phoenix Evolution · Liga automática, formatos y torneos libres

Cómo funcionan la liga automática (con Link) y los formatos de competición, y el plan y la construcción de los torneos libres.

Se dejan aparte, porque son documentos vivos de una sola pieza:
- `REGLAS-ECOSISTEMA.md`, la norma;
- `NOCHE-DE-LIGA-CON-AMIGOS.md`, la guía, el guion y la bitácora de la noche de liga real.

> **Cómo está hecho este documento:** junta, **completos y sin recortar**, 4 documentos que antes estaban sueltos (reorganización del 21-oct-2026, por pedido de Fralex: «cada documento por tema y que tenga absolutamente completo»). Cada parte dice de qué archivo viene. Los originales siguen intactos en la carpeta `_archivo/` y en el historial de git. **Desde ahora, lo nuevo de este tema se AÑADE aquí** como una parte más, con: qué se logró, paso a paso para replicarlo, errores e intentos fallidos, cosas a tener en cuenta, y cómo comprobar y revertir.

## Índice

- [Parte 1 · Formatos de torneo (ronda 214)](#parte-1-formatos-de-torneo-ronda-214) — origen `docs/liga-y-torneos/FORMATOS.md` (801bae3 2026-10-18)
- [Parte 2 · Liga automática: calendario oficial, resultados del juego y marcador en vivo](#parte-2-liga-automatica-calendario-oficial-resultados-del-juego-y-marcador-en-vivo) — origen `docs/liga-y-torneos/LIGA-AUTOMATICA.md` (01e6efc 2026-10-18)
- [Parte 3 · Informe maestro · «La mejor web para organizar torneos» (informe aparte del de cada ronda)](#parte-3-informe-maestro-la-mejor-web-para-organizar-torneos-informe-aparte-del-de-cada-ronda) — origen `docs/liga-y-torneos/PLAN-TORNEOS-LIBRES.md` (01e6efc 2026-10-18)
- [Parte 4 · Torneos propios (ronda 215 · migración 097)](#parte-4-torneos-propios-ronda-215-migracion-097) — origen `docs/liga-y-torneos/TORNEOS-LIBRES.md` (801bae3 2026-10-18)
- [Parte 5 · Casual u oficial, y pedir que una liga sea oficial (ronda 368 · migración 144)](#parte-5-casual-u-oficial-y-pedir-que-una-liga-sea-oficial-ronda-368-migracion-144) — escrita el 25-oct-2026 (Cuenta 2)

---

## Parte 1 · Formatos de torneo (ronda 214)

> Origen: `docs/liga-y-torneos/FORMATOS.md` · último cambio 801bae3 2026-10-18 · 1478 bytes. Copia íntegra.

Página `/formatos/` (menú Competir → Formatos). Todo se calcula en el navegador; **no hay base de datos todavía**.

| Pieza | Archivo |
|---|---|
| Motor de formatos (puro, con tests) | `src/js/core/competicion/formatos.js` · `tests/formatos.test.mjs` |
| Retos, ruleta, noche de la semana (puro) | `src/js/core/competicion/retos.js` · `tests/retos.test.mjs` |
| Textos editables (modalidades, reglas, retos, noches) | `src/data/modalidades.js` |
| Página y pantalla | `src/pages/formatos.astro` · `src/js/pages/formatos.js` · `src/styles/formatos.css` |
| Guía en PDF con la identidad de la liga | `docs/liga-y-torneos/Formatos-Phoenix-Evolution.pdf` |

### Formatos
`eliminacion`, `doble` (4/8/16/32), `liguilla`, `idavuelta`, `grupos`, `suizo`, `colina`, `escalera`, `circuito`.

- Un «slot» es un nombre, `null` (descanso), `{ganadorDe:id}`, `{perdedorDe:id}` o `{puesto:{grupo,pos}}`: así la llave se arma sin conocer los resultados.
- Sorteo reproducible (`mezclar(lista, semilla)`); siembra clásica (`ordenSemillas`).
- Suizo: `emparejarSuizo` evita repetir rival; si es imposible, repite y avisa (`repetidos: true`).
- Reto del día: cambia a medianoche de Perú (UTC-5).

### Siguiente fase (pendiente)
Tablas en Supabase (torneo, inscritos, partidos), inscripción con cupos, carga de resultados y avance automático de la llave, ascensos/descensos, avisos al juego con el Buzón (migración 097+).

---

## Parte 2 · Liga automática: calendario oficial, resultados del juego y marcador en vivo

> Origen: `docs/liga-y-torneos/LIGA-AUTOMATICA.md` · último cambio 01e6efc 2026-10-18 · 5339 bytes. Copia íntegra.

**Aplicado en Supabase el 11-oct-2026**, con autorización de Fralex («autorizo supabase»). Lo hizo el chat LINK (Claude).
- Rama de este repo: `liga-automatica`, sacada de `borrador`. Para publicar las páginas hay que juntarla con `borrador`.
- En Phoenix Link: rama `rediseño-phoenix-portal` (smash-soda-fork).

### Qué hay en la base de datos (migraciones 102 y 102b, solo añaden)
| Objeto | Para qué |
|---|---|
| `liga_ediciones` | Cada liga o torneo y su edición: `galaxy:edicion-1`, «Galaxy League · 1° Edición 2026». |
| `liga_participantes` | Los DT de la edición, con su club y su cuenta de la web si la tienen (hoy Fralex y Hugo). |
| `liga_partidos` | El calendario oficial. Galaxy: 22 fechas y 132 partidos (52 jugados, cargados desde `ligaResultados.js`). |
| `liga_vivo` | Marcador en vivo: una fila por sala mientras dura el partido. Tiene **Realtime**. |
| `liga_tabla` (vista) | Tabla de posiciones calculada solo con resultados **confirmados**. Coincide con la de la web (Victor 27 pts…). |
| `liga_resolver_resultado(id, aceptar, goles_l?, goles_v?)` | **Validar** un resultado: solo el **staff** o el **árbitro designado** de ese partido. |
| `liga_reclamar_resultado(id, motivo)` | Un DT del partido pide revisión: pasa a «disputa». |
| `liga_designar_arbitro(id, usuario)` | El staff designa (o quita) el árbitro de un partido. |

**Estados de un partido:**
- `pendiente`: sin jugar.
- `propuesto`: llegó del juego por Phoenix Link.
- `confirmado`: lo validó el staff o el árbitro designado.
- `disputa`: hay un reclamo, o dos envíos que no coinciden.
- `anulado`.

**Regla de Fralex:** el resultado lo valida el staff o el árbitro designado, **nunca el host**, porque puede ser un host neutral. Los DT solo pueden reclamar.

### Edge Function `liga` (v1, `verify_jwt = false`, token de PC `phx_…` como `phoenix`)
URL base: `https://fiibiyijojkxqlsrhcil.supabase.co/functions/v1/liga/v1/liga/…`

| Ruta | Qué hace |
|---|---|
| `GET /partidos` | Partidos por jugar: la fecha en curso, los atrasados, en disputa o ya enviados. Trae `mio` y los `parsec` de cada DT. |
| `POST /vivo` | `{sala_id, partido_id?, local, visitante, goles_local, goles_visita, minuto, periodo, fase, goles[]}` → upsert en `liga_vivo`. Con `{terminado:true}` borra la fila. Máximo 30 por minuto. |
| `POST /campo` | `{sala_id, v:1, j:[[x,z,eq],…≤30], b:[x,z,y]|null, equipos, posesion?:[A,B], fase?:"vivo"|"repeticion"|"otro"|"pausa", c?:["#rrggbb","#rrggbb"] (colores de camiseta de A y B), est?:{pos,pas,per,rec,tir,pue,cor,ban,met: [A,B]} (estadísticas derivadas de Link ≥ 0.2.38), p?:int (poseedor del balón: índice en j, -1 libre), ts?:ms (hora de la lectura), t?:{l:[[eq,gol],…],e,listo,vuelo}}` → **no escribe en la base**: Realtime Broadcast al canal `campo:<sala_id>` (evento `campo`, público de solo lectura). Máximo 2 por segundo por sala; Link manda ≤ 1/s. Metros, centro = (0,0), x ±52,5, z ±34; `eq` 0 = A (izquierda en el primer saque), 1 = B, 2 = árbitros, -1 = sin equipo. |
| `GET /mirando?sala_id=` | → `{mirando:[nombres]}`: quién ve el partido de esa sala desde la web (últimos 90 s; tabla `liga_mirando`, migración 104). Solo para el host dueño de la sala. |
| `POST /resultado` | `{partido_id, goles_local, goles_visita, completo:true, juego{goles, pk_*, nombre_*}, sala_id?, doctor?}` → `propuesto`. Repetir lo mismo no cambia nada; si llega uno distinto, pasa a `disputa`. Ya confirmado → 409. |

**Interruptor del staff:** `phoenix_config` → `liga_resultados = false` (o `integracion = false`) responde `LIGA_PAUSADA`.

### Cómo llega un resultado
1. El host (cualquiera aprobado; puede ser neutral) abre la sala en Phoenix Link y, en **Partido › En vivo › Partido oficial**, elige la fecha. El DT **local** del calendario va en el lado **Local**.
2. `phoenix_estadio.lua` (en el juego) da el marcador. Link manda el **marcador en vivo** cuando hay un gol, cambia la fase o pasan 5 minutos de juego. Los amistosos se mandan solo si la sala no es privada.
3. Al final (con `completo:true` del juego), Link envía el **resultado**. Si no hay internet, lo guarda en `phoenix-liga-resultados.json` y lo reintenta.
4. El staff o el árbitro designado lo **valida** y la tabla se actualiza sola (vista `liga_tabla`).

### Hecho en la web (ronda 224, rama borrador)
- Marcador en vivo (Central y Salas en vivo), panel del staff en Moderación, «Partidos que arbitras» y «Mis partidos oficiales» con «Reclamar» en Mis partidos, y la Liga actualizada con los resultados confirmados. Detalle en `MAPA.md`, ronda 224.

### Pendiente (web) — versión original, ya hecha en la ronda 224
- **Páginas:**
  - marcador en vivo (suscripción Realtime a `liga_vivo`) en Inicio y En vivo;
  - panel del staff para validar, designar árbitro y ver disputas;
  - botón «Reclamar» para los DT;
  - que Liga lea `liga_tabla` en vez de `ligaResultados.js`.
- **Mientras tanto:** `ligaResultados.js` sigue siendo la fuente de las páginas. Los resultados nuevos validados se cargan en las dos partes hasta el cambio.
- **Phoenix Doctor:** por ahora solo informativo. El campo `doctor` del resultado se guarda pero no se exige.

---

## Parte 3 · Informe maestro · «La mejor web para organizar torneos» (informe aparte del de cada ronda)

> Origen: `docs/liga-y-torneos/PLAN-TORNEOS-LIBRES.md` · último cambio 01e6efc 2026-10-18 · 2879 bytes. Copia íntegra.

Pedido de Fralex (9 oct 2026): torneos libres para todos, la web más completa posible, muchas dinámicas divertidas (hasta las más absurdas), guía interna en cada cosa, y este informe de todo lo que se va a implementar. Esta lista es el plan completo; la columna Estado dice qué ya existe.

### A. Base
| Pieza | Estado |
|---|---|
| Tablas y RPC de torneos propios (097) | HECHO (aplicada y probada con transacción revertida) |
| Interruptor y topes del staff, ocultar/cancelar, bitácora | HECHO |
| Lógica pura: planes, tablas, grupos, suizo, circuito, campeón | HECHO (12 pruebas nuevas) |

### B. Pantallas
| Pieza | Estado |
|---|---|
| `/torneos/` lista con filtros + ficha de creación | HECHO |
| `/torneo/?id=` detalle: inscripción, cruces, resultados, tablas | HECHO |
| Panel del staff en Moderación | HECHO |
| Guías «¿Cómo funciona?» por formato y por dinámica, leyenda de estados | HECHO |

### C. Formatos jugables (10)
Eliminatoria, doble, liguilla, ida y vuelta, grupos + playoffs, suizo, rey de la colina, escalera, circuito, libre. HECHO.

### D. Dinámicas (más de 45, 5 familias)
Reglas del partido (13) · Equipos y plantillas (8) · Locuras y bromas (12) · Para ver y transmitir (6) · Puntos, apuestas y premios (6). Con efecto automático: ruleta por partido y castigo al perdedor. El resto se muestra como guía. HECHO. Generadores: nombre épico de torneo, castigos (20), títulos de broma (18).

### E. Siguiente (propuesto, aún NO hecho)
1. Avisos automáticos (Buzón del juego y campana) cuando te toca jugar o cambia tu cruce.
2. Llave visual con líneas (árbol) en vez de columnas.
3. Realtime en el detalle (ahora refresca cada 30 s).
4. Al coronar: palmarés, logros y racha de campeón automáticos.
5. Torneos por clan y de «equipos» con capitán.
6. Quiniela del público con tokens simbólicos.
7. Calendario con recordatorios y hora de cada partido.
8. Plantillas guardadas («clonar mi torneo anterior») y torneos recurrentes semanales.
9. Reglas de desempate configurables y puntos propios (ahora 3/1/0).
10. Exportar el torneo (imagen o PDF) para compartir.
11. Reportes de torneos por la comunidad y reputación de organizadores.
12. Ranking global de organizadores y de campeones.

### F. Límites actuales (conscientes)
Tope de partidos por llamada 2000 · cupo máx. 256 (ajustable) · 50 torneos activos por usuario (ajustable) · quien anota un resultado lo hace bajo palabra: el organizador y el staff pueden corregir y todo queda en la bitácora.

### G. Cómo se prueba
`npm test` (384 pasan) · `npm run build` (43 páginas) · pruebas SQL con transacción revertida · capturas Galaxy y Sudario con datos simulados. Falta probar con cuentas reales en /fase-beta-1-0/.

---

## Parte 4 · Torneos propios (ronda 215 · migración 097)

> Origen: `docs/liga-y-torneos/TORNEOS-LIBRES.md` · último cambio 801bae3 2026-10-18 · 4073 bytes. Copia íntegra.

Cualquier usuario con sesión crea su torneo en `/torneos/` (botón «Crear mi torneo») y lo juega en `/torneo/?id=N`.
Casi sin límites: el staff los vigila desde Moderación → «Torneos propios».

### Qué puede hacer el organizador
- **Ficha** (5 bloques): nombre (botón «Sorpréndeme» inventa uno), formato (10), gente y fechas (cupo, visibilidad, inicio, ¿juego yo?, ¿anotan los jugadores?, ¿sorteo?), dinámicas divertidas (más de 45, cada una con «¿Cómo funciona?») y extras (premio, reglas propias, enlace de sala/transmisión).
- **Formatos**: eliminatoria, doble, liguilla, ida y vuelta, grupos + playoffs, suizo, rey de la colina, escalera, circuito y **Libre** (el organizador añade los partidos que quiera).
- **Inscripción**: los usuarios se apuntan solos; el organizador añade nombres a mano (sin cuenta) y quita gente, hasta que empiece.
- **Empezar**: la web arma los cruces con `core/competicion/formatos.js` y los guarda con `torneo_iniciar`. «Permitir más jugadores de lo recomendado» quita los topes del formato (máx. 2000 partidos por llamada).
- **Resultados**: el organizador o los dos jugadores del cruce (si está marcado). En eliminatorias, si hay empate se elige quién pasa. El avance (ganador/perdedor al siguiente cruce) lo hace la base de datos sola. No se puede corregir un resultado si el siguiente partido ya se jugó.
- **Grupos**: cuando un grupo termina, «Cerrar grupos» llena los cruces de playoffs con los puestos.
- **Suizo**: «Armar ronda N» empareja por puntos sin repetir rival; el descanso cuenta como victoria.
- **Colina / escalera / circuito**: el estado vive en `estado_juego` (JSON) y se guarda con `torneo_estado_guardar` (en colina y escalera también pueden los inscritos).
- **Cerrar**: «Cerrar torneo y coronar» (campeón sugerido editable) o «Cancelar».

### Dinámicas con efecto en pantalla
- `ruleta-partido`: cada cruce muestra una regla distinta (determinista por torneo y cruce; `core/competicion/diversion.js`).
- `castigo`: tras jugarse, se muestra un castigo sano para el perdedor.
- El resto de dinámicas se muestran con su guía en el torneo («Dinámicas de este torneo»); las reglas las cumplen y vigilan los jugadores.

### Base de datos (097)
Tablas: `torneos_libres_config` (fila única: `habilitado`, `max_activos_por_usuario` 50, `max_jugadores` 256), `torneos_libres`, `torneos_libres_inscritos`, `torneos_libres_partidos`, `torneos_libres_eventos` (bitácora).
Lectura por RLS (público sin sesión si no está oculto ni privado); escritura solo por RPC: `torneo_crear`, `torneo_editar`, `torneo_inscribirse`, `torneo_salir`, `torneo_agregar_jugador`, `torneo_quitar_jugador`, `torneo_iniciar`, `torneo_agregar_partidos`, `torneo_fijar_cruces`, `torneo_resultado`, `torneo_resultado_quitar`, `torneo_estado_guardar`, `torneo_cerrar`, `torneo_cancelar`, `staff_torneo_moderar`, `staff_torneos_config`.
No hay borrados: «retirado», «oculto» y «cancelado» conservan la evidencia. Cuentas sancionadas no pueden crear ni inscribirse.

### Cómo apretar o quitar límites (Fralex)
- Moderación → Torneos propios: pausar la creación, tope de torneos activos por usuario y de jugadores por torneo.
- Ocultar (con motivo), mostrar o cancelar cualquier torneo.
- Para quitar la función entera: sacar `torneos` de `NAV` en `src/data/site.js` (la tabla puede quedarse).

### Archivos
`src/js/core/competicion/torneos.js` (lógica pura) · `src/js/core/competicion/diversion.js` · `src/data/dinamicas.js` (catálogo y guías, editable) · `src/js/features/torneos/{api,guia,staff}.js` · `src/pages/{torneos,torneo}.astro` · `src/js/pages/{torneos,torneo}.js` · `src/styles/torneos.css` · `tests/torneos.test.mjs`.

### Pendiente / ideas
Avisos al Buzón del juego cuando te toca jugar · Realtime en el detalle (hoy refresca cada 30 s) · llave visual con líneas · palmarés y logros automáticos al coronar · torneos por clanes · apuestas con tokens (requiere decisión legal).

---

---

## Parte 5 · Casual u oficial, y pedir que una liga sea oficial (ronda 368 · migración 144)

> Escrita el 25-oct-2026 por la **Cuenta 2**, a pedido de Fralex. Web beta **1.17.0**. Migración **144 aplicada y probada**.

### 1. La regla (decisión de Fralex, 25-oct)

> «Yo quiero que los demás puedan crear sus ligas pero los resultados serán ingresados manualmente por los encargados de dicha liga; solo cuando es oficial, el Lua leerá los resultados y los subirá automáticamente.» · «Si alguien crea una liga casual puede solicitar al staff hacerla oficial y el staff debe aceptarlo.» · Idea a futuro: «o en todo caso eso lo haré una función premium».

| Tipo | Página | Quién la crea | Quién pone los resultados |
|---|---|---|---|
| **Casual** | `/torneos/` y `/torneo/?id=N` | Cualquiera | El creador, a mano |
| **Oficial** | `/liga-amigos/` (se muestra como **«Liga oficial»**) | El staff (o al aceptar un pedido) | Phoenix Link / el Lua, solo |

- Nombre: la página `/liga-amigos/` se llamó «Liga de amigos» → «Liga Phoenix» (1.16.2) → «Liga casual» (1.16.3) → **«Liga oficial» (1.16.4, definitivo)**. Solo cambió el texto visible; la dirección, los id y la base siguen iguales. Motivo: «Liga de amigos» sonaba a casual y es justo lo contrario.
- **Idea pendiente (no hecha):** resultados automáticos con Link como **beneficio premium** para ligas no oficiales (encajaría en el «torneo premium» de la 123). Hace falta que Fralex lo pida.

### 2. Cómo funciona el pedido (lo que ve cada uno)

1. **El creador** de una liga casual **todos contra todos** (`liguilla` o `idavuelta`) que siga **en inscripción** ve en su página una caja «Liga casual» con el botón **«Pedir que sea oficial»**. Puede añadir una nota (hasta 300 letras).
2. **Todo el staff** (ayudante, moderador, admin) recibe un aviso **LIGA_OFICIAL** que lleva a la liga.
3. **El staff** responde desde **la página de la liga** (caja azul «X pide que sea oficial» con Aceptar / Rechazar) **o** desde **Moderación › Torneos propios › Pedidos para hacer oficial**. En `/control/` hay una tarjeta «Ligas que piden ser oficiales» (plazo 48 h).
   - **Aceptar** → se llama a la 143 (`staff_torneo_hacer_oficial`): la liga pasa a Liga oficial con sus inscritos. Al creador le llega «¡Tu liga ya es oficial!».
   - **Rechazar** → motivo obligatorio (5–300 letras). Al creador le llega «Tu liga sigue siendo casual» con el motivo. Puede volver a pedirlo **a las 24 h**.
4. **El creador** puede **retirar** su pedido mientras está pendiente (y volver a pedir sin esperar).
5. Casos automáticos (disparador): si el staff pulsa el botón directo «Hacer oficial», el pedido se marca **aceptado** y se avisa igual; si la liga empieza, se cancela o se oculta, el pedido pasa a **cancelada**.
6. Las ligas por **llaves** (eliminación, grupos, suizo…) **no** se pueden pedir: Phoenix Link aún no las entiende.

### 3. Piezas (para replicarlo o tocarlo)

| Pieza | Archivo |
|---|---|
| Base | `supabase/migrations/144_solicitudes_liga_oficial.sql` (cabecera con cómo deshacer) |
| Prueba de la base (12 casos, se deshace sola: «TODO_OK_REVERTIDO») | `supabase/tests/144_solicitudes_oficial_test.sql` |
| Reglas puras (qué mostrar) + pruebas | `src/js/core/competicion/solicitudOficial.js` · `tests/solicitudOficial.test.mjs` |
| Llamadas a la base | `src/js/features/torneos/api.js` (`solicitarOficial`, `cancelarSolicitudOficial`, `solicitudOficialDe`, `staffSolicitudesOficial`, `staffResolverSolicitud`) |
| Página de la liga | `src/js/pages/torneo.js` (`oficialHTML`, `pedidoCreadorHTML`, `pedidoStaffHTML`, `pedirOficial`, `resolverPedido`) · estilos `.to-oficial-pedido` en `src/styles/torneos.css` |
| Moderación | `src/pages/moderacion.astro` (`#tls-oficial`) · `src/js/features/torneos/staff.js` (`pintarPedidos`) |
| Centro de control | `src/js/pages/control.js` (tarjeta `oficial-pedidos`) · `PLAZOS.oficial = 48` en `src/js/core/sistema/centroControl.js` |
| Campana | `LIGA_OFICIAL` en `src/js/features/notifications.js` (icono) y `src/js/core/sistema/notifs.js` (categoría «sistema», espejo de `private.categoria_notif`) |

**Base de datos (144):** tabla cerrada `torneo_solicitudes_oficial` (RLS sin políticas; solo por funciones; un único pedido pendiente por liga). Funciones: `torneo_solicitar_oficial`, `torneo_cancelar_solicitud_oficial`, `torneo_solicitud_oficial_de` (solo creador y staff), `staff_solicitudes_oficial`, `staff_solicitud_oficial_resolver`; privadas `tl_avisar_staff_solicitud` y `tl_solicitud_sync` (disparador `zz_solicitud_oficial_sync`). Aviso nuevo `LIGA_OFICIAL` (la lista de tipos solo crece) en categoría **sistema** (no se apaga). El rechazo queda en la auditoría del staff.

### 4. Cómo se probó

- Prueba en seco (migración + 12 casos en una transacción deshecha) y otra vez contra la base real tras aplicarla: **TODO_OK_REVERTIDO** las dos veces; comprobado después que no quedó ninguna liga de prueba.
- `npm test` 653/653 · `npm run build` OK. La prueba que abre todas las páginas (`npm run test:paginas`) **no se pudo correr en la nube** (sin Chrome); la corre GitHub en `pruebas.yml` al subir.
- **No probado con sesión real en el navegador.** Para probarlo (Fralex): con una cuenta de jugador, crea en Torneos una liga «Todos contra todos» → «Pedir que sea oficial» → con tu cuenta de admin, mira la campana, `/control/` y Moderación → Aceptar o Rechazar.

### 5. Errores y trampas

- En PL/pgSQL, una variable con el **mismo nombre que una columna** (`nota`, `motivo`) da «ambiguo». Se usaron `v_nota` y `v_motivo` (mismo fallo que la 109).
- El enlace de los avisos solo acepta rutas simples (`notificaciones_enlace_ok`): por eso el aviso lleva a `torneo/?id=N` y no al id de la edición oficial (lleva «:»). La página del torneo ya enlaza a su Liga oficial.
- El conector MCP de Supabase se cuelga con `DELETE`: la prueba no borra nada; se deshace con un error a propósito al final.


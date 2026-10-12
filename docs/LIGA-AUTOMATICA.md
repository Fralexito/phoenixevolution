# Liga automática: calendario oficial, resultados del juego y marcador en vivo

**Aplicado en Supabase el 11-oct-2026**, con autorización de Fralex («autorizo supabase»). Lo hizo el chat LINK (Claude).
- Rama de este repo: `liga-automatica`, sacada de `borrador`. Para publicar las páginas hay que juntarla con `borrador`.
- En Phoenix Link: rama `rediseño-phoenix-portal` (smash-soda-fork).

## Qué hay en la base de datos (migraciones 102 y 102b, solo añaden)
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

## Edge Function `liga` (v1, `verify_jwt = false`, token de PC `phx_…` como `phoenix`)
URL base: `https://fiibiyijojkxqlsrhcil.supabase.co/functions/v1/liga/v1/liga/…`

| Ruta | Qué hace |
|---|---|
| `GET /partidos` | Partidos por jugar: la fecha en curso, los atrasados, en disputa o ya enviados. Trae `mio` y los `parsec` de cada DT. |
| `POST /vivo` | `{sala_id, partido_id?, local, visitante, goles_local, goles_visita, minuto, periodo, fase, goles[]}` → upsert en `liga_vivo`. Con `{terminado:true}` borra la fila. Máximo 30 por minuto. |
| `POST /campo` | `{sala_id, v:1, j:[[x,z,eq],…≤30], b:[x,z,y]|null, equipos, posesion?:[A,B], fase?:"vivo"|"repeticion"|"otro"|"pausa", c?:["#rrggbb","#rrggbb"] (colores de camiseta de A y B), p?:int (poseedor del balón: índice en j, -1 libre), ts?:ms (hora de la lectura), t?:{l:[[eq,gol],…],e,listo,vuelo}}` → **no escribe en la base**: Realtime Broadcast al canal `campo:<sala_id>` (evento `campo`, público de solo lectura). Máximo 2 por segundo por sala; Link manda ≤ 1/s. Metros, centro = (0,0), x ±52,5, z ±34; `eq` 0 = A (izquierda en el primer saque), 1 = B, 2 = árbitros, -1 = sin equipo. |
| `GET /mirando?sala_id=` | → `{mirando:[nombres]}`: quién ve el partido de esa sala desde la web (últimos 90 s; tabla `liga_mirando`, migración 104). Solo para el host dueño de la sala. |
| `POST /resultado` | `{partido_id, goles_local, goles_visita, completo:true, juego{goles, pk_*, nombre_*}, sala_id?, doctor?}` → `propuesto`. Repetir lo mismo no cambia nada; si llega uno distinto, pasa a `disputa`. Ya confirmado → 409. |

**Interruptor del staff:** `phoenix_config` → `liga_resultados = false` (o `integracion = false`) responde `LIGA_PAUSADA`.

## Cómo llega un resultado
1. El host (cualquiera aprobado; puede ser neutral) abre la sala en Phoenix Link y, en **Partido › En vivo › Partido oficial**, elige la fecha. El DT **local** del calendario va en el lado **Local**.
2. `phoenix_estadio.lua` (en el juego) da el marcador. Link manda el **marcador en vivo** cuando hay un gol, cambia la fase o pasan 5 minutos de juego. Los amistosos se mandan solo si la sala no es privada.
3. Al final (con `completo:true` del juego), Link envía el **resultado**. Si no hay internet, lo guarda en `phoenix-liga-resultados.json` y lo reintenta.
4. El staff o el árbitro designado lo **valida** y la tabla se actualiza sola (vista `liga_tabla`).

## Hecho en la web (ronda 224, rama borrador)
- Marcador en vivo (Central y Salas en vivo), panel del staff en Moderación, «Partidos que arbitras» y «Mis partidos oficiales» con «Reclamar» en Mis partidos, y la Liga actualizada con los resultados confirmados. Detalle en `MAPA.md`, ronda 224.

## Pendiente (web) — versión original, ya hecha en la ronda 224
- **Páginas:**
  - marcador en vivo (suscripción Realtime a `liga_vivo`) en Inicio y En vivo;
  - panel del staff para validar, designar árbitro y ver disputas;
  - botón «Reclamar» para los DT;
  - que Liga lea `liga_tabla` en vez de `ligaResultados.js`.
- **Mientras tanto:** `ligaResultados.js` sigue siendo la fuente de las páginas. Los resultados nuevos validados se cargan en las dos partes hasta el cambio.
- **Phoenix Doctor:** por ahora solo informativo. El campo `doctor` del resultado se guarda pero no se exige.

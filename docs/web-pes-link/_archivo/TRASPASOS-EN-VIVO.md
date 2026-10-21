# Traspasos en vivo entre Phoenix Link (Edge Function «traspasos» + migración 105)

Ronda 274 · cuenta LINK (chat principal de Link, con permiso de Fralex) · 12-oct-2026 · rama `borrador`.

## Qué es
Un anfitrión hace un traspaso en **Editar** de PES y lo **guarda**. Su Phoenix Link lo convierte en un *lote* de cambios «jugador → equipo» y lo publica aquí. El Phoenix Link de cada amigo que **sigue** a ese anfitrión lo recoge y lo aplica sobre **su propia base** (Link no copia bases de nadie). Solo viajan ids y nombres de jugador y de equipo: ningún dato personal.

## Dónde vive
- Función **aparte** `traspasos` (`supabase/functions/traspasos/index.ts`, `verify_jwt = false`, versión 1). Se hizo aparte de «liga» a propósito: un fallo aquí no puede tocar el marcador en vivo ni el campo 2D.
- Tablas (migración 105, RLS activado y **sin permisos** para `anon`/`authenticated`: solo accede la función con `service_role`):
  - `liga_traspasos` (lotes: `seq` creciente global, `anfitrion`, `lote`, `huella`, `creado`, `autor`, `parche`, `base_huella`, `cambios` jsonb de 1 a 60 elementos, `recibido`; único por `(anfitrion, lote)`).
  - `liga_traspasos_codigos` (un código de 8 caracteres por anfitrión).
  - `liga_traspasos_seguidores` (quién sigue a quién).
- Retención: 30 días y los últimos 200 lotes por anfitrión (limpieza al publicar).

## Autenticación
`Authorization: Bearer phx_…` (token de dispositivo de Phoenix Link, el mismo de «liga»).
- **Anfitrión** (publicar y pedir código): dispositivo de un perfil **host aprobado** (o staff).
- **Amigo** (recoger, seguir, dejar, siguiendo): **cualquier dispositivo vinculado** (no hace falta ser host).
- El interruptor del staff `liga_resultados = false` pausa todo (503 `LIGA_PAUSADA`), como en «liga».

## Rutas (base `https://fiibiyijojkxqlsrhcil.supabase.co/functions/v1/traspasos/v1`)
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

## Probado (12-oct-2026, contra la web real, con un dispositivo temporal ya borrado)
29 comprobaciones de punta a punta: código estable y rotación (el viejo deja de valer, el nuevo vale en minúsculas), seguirse a uno mismo (409) y en prueba, código inexistente o mal formado (404), publicar, repetir el mismo lote (idempotente), orden por `seq`, `desde` y `limite`, nombres con acentos y emoji, los 60 cambios, validaciones (id, huella, fecha, 0 y 61 cambios, id de jugador no numérico) y token inventado (401). Sin token: 401 en todas las rutas; ruta desconocida 404; método erróneo 405. Los avisos de seguridad de Supabase sobre las tablas nuevas: solo el informativo «RLS activado sin políticas», que es el diseño buscado.

## Qué falta
Que Phoenix Link use estas rutas (lo hace el chat LINK: transporte «web» por defecto y la carpeta como alternativa). Esta web no tiene todavía pantalla para esto: no hace falta; el enlace entre anfitrión y amigo se hace desde Phoenix Link con el código de 8 caracteres.

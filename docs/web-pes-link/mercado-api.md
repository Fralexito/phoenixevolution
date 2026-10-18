# API «Mercado» v0.1 (programa de PC Phoenix Mercado → web)

Base: `https://fiibiyijojkxqlsrhcil.supabase.co/functions/v1/mercado/v1/`
Todas las respuestas: `{ "ok": true, "version_api": "...", "datos": {...} }` o `{ "ok": false, "error": { "codigo": "..." }, "solicitud_id": "..." }`.
Cabeceras del programa: `Authorization: Bearer <token>` (salvo /vincular y /eco) y `X-Mercado-Version: 0.1.0`.

**Tokens aceptados**
- `pml_…` — «código manager» (de `/vincular`). Vale para todo.
- Token de **Phoenix Link** (el de `/phoenix/v1/emparejar`, `phx_…`). Se busca por la misma huella SHA-256 en los dispositivos de Phoenix Link; respeta revocado (`TOKEN_REVOCADO`) y suspendido (`DISPOSITIVO_SUSPENDIDO`).
  Si el usuario (Mercado → «Exigir código manager») o el staff (global) lo exigen, `/option/actual` y `/reportes` responden `CODIGO_MANAGER_REQUERIDO` (403) con ese token; `/yo` sigue funcionando.

| Método | Ruta | Cuerpo | Respuesta (`datos`) |
|---|---|---|---|
| GET | `/eco` | — | `{ ok, version_api, hora }` (probar conexión) |
| POST | `/vincular` | `{ codigo: "ABCD2345", nombre_pc?: "PC de Juan" }` | `{ token: "pml_…", dispositivo_id, usuario: { id, nombre } }` |
| GET | `/yo` | — | `{ usuario: { id, nombre, avatar_url }, dispositivo_id }` |
| GET | `/option/actual` | — | `{ version, sha256, tamano, notas, publicado, url, expira_en_seg }` |
| POST | `/reportes` | `{ option_version, hash_antes, hash_despues, resumen, cambios: [ ... ] }` | `{ id, estado: "pendiente", created_at }` |
| POST | `/catalogo` (staff) | `{ equipos:[{pes_team_id,nombre}], jugadores:[{pes_id,nombre,pes_team_id,posicion,media,edad,nacionalidad,fecha_nac,altura,dorsal,valor}] }` | `{ equipos, jugadores }` (equipos entran sin aprobar). **Obligatorios:** `pes_id`, `nombre`. **Opcionales:** `pes_team_id`, `posicion`, `edad`, `nacionalidad`, `altura`, `peso`, `dorsal`, `media`, `valor`, `fecha_nac`, `fuente` (`option`|`parche`), `habilidades` (objeto o arreglo, máx. ~4 KB), `otros_equipos` (arreglo, p. ej. su selección). Formato inválido o campos desconocidos se ignoran sin error. Al reimportar, un campo ausente conserva lo que ya tenía la web (p. ej. el `valor` que fijó el staff). |
| GET | `/fichajes` (`?todos=1`) | — | `{ fichajes:[{ id, tipo, phoenix_id, pes_id, jugador, de_pes_team_id, a_pes_team_id, a_club, monto, aplicado_en, fecha }] }` — pendientes por defecto; `a_pes_team_id: null` = agente libre |
| POST | `/fichajes/aplicados` (staff) | `{ ids:[1,2,3] }` | `{ marcados }` — tras generar el option file oficial |
| GET | `/huella` (`?liga=galaxy`, `&texto=1` para depurar) | — | `{ liga, algoritmo: "sha256", huella, clubes, jugadores, calculada[, texto] }` |
| GET | `/reportes` | — | `{ reportes: [ { id, option_version, resumen, estado, motivo, created_at, revisado_en } ] }` |

## Flujo
1. El jugador entra a la web → **Mercado → Vincular programa** → recibe un código de 8 caracteres (vale 10 min, un solo uso).
2. El programa llama a `/vincular` con ese código y **guarda el token** (cifrado con DPAPI de Windows). El token no caduca; se revoca desde la web.
3. `/option/actual` da la URL temporal (5 min). Descargar → calcular **SHA-256** del archivo → debe ser igual a `sha256`. Si no coincide: no instalar.
4. Antes de jugar: guardar copia + hash (`hash_antes`). Después: leer de nuevo, calcular diferencias y mandar `/reportes`.
5. El staff aprueba o rechaza en la web; el programa consulta `/reportes` para mostrar el estado.

## Formato sugerido de cada elemento de `cambios`
```json
{ "tipo": "jugador_equipo", "jugador_id": 12345, "jugador": "Nombre", "de": { "equipo_id": 101, "equipo": "Club A" }, "a": { "equipo_id": 202, "equipo": "Club B" } }
{ "tipo": "campo", "entidad": "jugador", "id": 12345, "campo": "dorsal", "de": 9, "a": 10 }
{ "tipo": "dinero_lm", "de": 1500000, "a": 1250000 }
```
Libre mientras sea un arreglo JSON (máx. 2000 elementos, ~200 KB). La web muestra `tipo`, `de` → `a` y el resto como texto.

## Errores
`TOKEN_FALTANTE` · `TOKEN_INVALIDO` · `TOKEN_REVOCADO` (volver a vincular) · `CODIGO_NO_ENCONTRADO` · `CODIGO_USADO` · `CODIGO_VENCIDO` · `SIN_OPTION_FILE` (el staff aún no publicó uno) · `DEMASIADOS_INTENTOS` (+ `reintentar_en` seg) · `DATOS_INVALIDOS` (+ `campo`) · `DISPOSITIVO_SUSPENDIDO` · `CODIGO_MANAGER_REQUERIDO` · `NO_AUTORIZADO` (ruta de staff) · `ERROR_INTERNO`.

## Huella de plantillas (anti-trampa)
Texto canónico (Mercado debe generarlo **idéntico** desde el option file y la tabla de equivalencias):
- Una línea por club con ≥1 jugador: `<clave_club>:<phoenix_id>,<phoenix_id>,…`
- `clave_club` = `pes_team_id`; si el club no tiene, `c<id_club_web>`.
- `phoenix_id` en orden numérico ascendente. Líneas ordenadas por `clave_club` como **texto** (orden byte a byte, p. ej. `"100" < "21" < "c5"`).
- Líneas unidas con `\n`, sin salto final. UTF-8 → **SHA-256 hex en minúsculas**. Agentes libres no cuentan.
`POST /reportes` acepta además `huella_plantillas_antes` y `huella_plantillas_despues`; la web guarda junto a ellas la huella esperada de ese momento.

## Firma de la lista oficial (Ed25519)
- `GET /clave-publica` (sin token) → `{ clave_id, algoritmo: "Ed25519", publica }` (base64, 32 bytes). **Incrustarla en Mercado**; si llega otro `clave_id`, no confiar.
- `GET /plantillas?liga=galaxy` → `{ contenido, firma, clave_id, algoritmo }`.
  1. Verificar Ed25519(`publica`, bytes UTF-8 de `contenido` tal cual, `firma` base64).
  2. Solo si es válida: `JSON.parse(contenido)` → `{ liga, generado, huella, clubes:[{ clave, pes_team_id, club, jugadores:[{ phoenix_id, pes_id }] }] }`.
  3. `huella` debe coincidir con la que Mercado calcula (formato canónico de arriba).
- La clave privada la genera y guarda el propio servidor (nunca sale de él).

## Correcciones automáticas y envíos atrasados
- `POST /correcciones` `{ correcciones:[{ id_cliente (uuid), phoenix_id?, pes_id?, jugador?, cambio:{campo, de, a, …}, huella_antes?, huella_despues?, hora_local ("2026-10-07T23:05:00-05:00"), atrasado? }] }` (1–500)
  → `{ recibidas, duplicadas, rechazadas:[{ indice, campo }] }`
- `POST /reportes/lote` `{ reportes:[{ id_cliente, …campos de /reportes… }] }` (1–100) → `{ recibidos, duplicados, rechazados }`
- **Idempotente:** Mercado genera un `id_cliente` (UUID v4) por evento y lo guarda en su cola local; al reconectarse reenvía la cola. Lo repetido cuenta como `duplicadas` y no se guarda dos veces. Se pueden borrar de la cola los que vuelvan como `recibidas` o `duplicadas`; los `rechazadas` traen el campo inválido.

## Versión de liga (sincronización incremental)
- Cada traspaso cerrado, en **una sola transacción**: cambia el club, `version_liga += 1` y se guarda en `lm_cambios_liga` (`version, phoenix_id, pes_id, club_desde, club_hacia, club_desde_pes, club_hacia_pes, tipo` y, desde 2026-10-08 (migración 094), los opcionales `monto, sueldo, clausula, fin_contrato, dorsal`).
- Phoenix Link recibe `version_liga` en la respuesta de `/phoenix/v1/presencia` y `/phoenix/v1/sala/latido`. Si es mayor que la última aplicada → pedir cambios.
- `GET /liga/cambios?desde=<version>` → **firmado** igual que `/plantillas`. `contenido = { liga, desde, version_actual, generado, cambios:[…] }` (máx. 1000; si quedan más, repetir con `desde` = última `version` recibida). Aplicar en orden de `version`.
- **Campos opcionales de cada cambio (2026-10-08, migración 094; solo añadidos, formato y firma intactos):** `monto` (entero, euros que paga el club que ficha; `null` si el jugador queda libre), `sueldo` (entero, sueldo anual del contrato nuevo en euros), `clausula` (entero, cláusula de rescisión en euros), `fin_contrato` (texto `"AAAA-MM-DD"`) y `dorsal` (entero 1–99). Siempre vienen en el JSON; sin dato valen `null`. Hoy la web rellena `monto` y `dorsal` (el de la ficha del jugador en la web); `sueldo`, `clausula` y `fin_contrato` van en `null` hasta que la web guarde contratos. Los cambios anteriores a la 094 tienen los cinco en `null`. Los programas deben ignorar campos desconocidos y aceptar `null`.
- `POST /liga/aplicado { version, huella_plantillas }` → `{ version_actual, al_dia, coincide }`. `coincide` = la huella reportada es igual a la esperada (solo se compara si `version` = `version_actual`; si no, `null`).

### Mi club (vestuario) — migración 095, Edge Function v11
Mismo token (`Authorization: Bearer pml_…`, modo manager). Solo ves y tocas los clubes de TU usuario (si no: `CLUB_NO_ENCONTRADO`, 404).
- `POST /vestuario/subir { pes_team_id, nombre, partida, fecha_partida, finanzas, jugadores:[{ pid, orden, ficha }], imagenes:{ "<pid>"|"escudo": png_base64 } }` → `{ club_id, jugadores, imagenes, imagenes_fallidas }`. Reemplaza la foto del club (mismo usuario + `pes_team_id` = mismo club) y NO borra los cambios pendientes. Cuerpo máx. 12 MB; hasta 80 jugadores; cada PNG ≤ 160 000 caracteres base64 (miniface 180×180). Un jugador que ya no viene en la lista queda `vigente = false`.
- `GET /vestuario/cambios?club=<id>&desde=<version>` → FIRMADO `{ contenido, firma, clave_id, algoritmo }` (misma clave Ed25519 y mismo sobre que `/liga/cambios`). `contenido` = `{ club_id, desde, version_actual, cambios:[{ version, pid, campo, valor }], generado }`. Solo cambios `pendiente`; máx. 1000 por respuesta (repetir con `desde=<último version>`).
- `POST /vestuario/aplicado { club_id, resultados:[{ version, estado:"aplicado"|"rechazado", motivo }] }` → `{ actualizados, ignorados, version_actual }`. «aplicado» también actualiza la ficha guardada en la web; «rechazado» guarda el motivo (máx. 200) y la web se lo enseña al jugador.
- Nombres de `campo`: `habilidades.<x>` (40–99), `portero.<pt_a..pt_e>` (40–99), `posiciones.<PT|DFC|LI|LD|MCD|MC|MI|MD|MO|EI|ED|SD|DC>` (0–2), `dorsal` (1–99), `edad` (15–50), `altura` (150–210), `peso` (40–130), `posicion` (código), `liga_master.sueldo` y `liga_master.valor` (0–400 000 000). Lo listado en `ficha.bloqueados` no se puede editar. La web valida esto en el servidor.

- `/plantillas` incluye ahora `version_liga` dentro de `contenido` (sirve como punto de partida tras una instalación limpia).

## Clubes CPU y agentes libres
- **Club CPU** = club sin DT (`dueno` nulo). Todo equipo del juego que entra al universo de la liga (catálogo + aprobado) es CPU hasta que un DT lo elige. No tiene presupuesto.
- **Agente libre** = jugador sin club (`club_hacia` / `club_id` nulo).
- DT→CPU y CPU→DT generan cambios de liga igual que DT↔DT (misma `version_liga`).
- **Tope de plantilla: 40.** Un traspaso a un club lleno se rechaza con `PLANTILLA_LLENA`.

## Equivalencias entre parches (2026-10-08, migración 089)

### `POST /v1/equivalencias` (staff, token manager si se exige)
Informe de emparejamiento. **Máx. 3000 filas por llamada** (jugadores + clubes): mandar en lotes. Idempotente.
```json
{ "formato": "phoenix-mercado/emparejamiento@0.1", "perfil_parche": "conmegol-26",
  "clubes":    [{ "phoenix_id": 12, "pes_id_local": 101, "estado": "automatico", "puntaje": 92, "metodo": "id+plantilla" }],
  "jugadores": [{ "phoenix_id": 5501, "pes_id_local": 40213, "estado": "automatico", "puntaje": 98, "metodo": "id+datos" },
                { "phoenix_id": 5502, "estado": "revisar", "candidatos": [{ "pes_id_local": 40300, "nombre": "J. Pérez", "puntaje": 61 }] },
                { "phoenix_id": 5503, "estado": "sin_candidato" }] }
```
- `phoenix_id` = `lm_jugadores.id` (clubes: `lm_clubes.id`). `perfil_parche`: `[A-Za-z0-9._-]{1,60}`.
- `estado`: `automatico` | `revisar` | `sin_candidato`. **`confirmado` solo lo pone el staff** (si llega, se trata como `revisar`).
- En `revisar`/`sin_candidato` el `pes_id_local` no se reserva: se guarda dentro de `candidatos` (`sugerido: true`).
- Una fila confirmada por el staff **nunca** se pisa con un informe nuevo.
- Si dos `phoenix_id` reclaman el mismo `pes_id_local` → ambos quedan en `revisar` (candidato con `conflicto_con`).
- `phoenix_id` que no existe en la web → se ignora y se cuenta.
- Campos desconocidos se ignoran (en candidatos se guardan tal cual, máx. ~8 KB por fila).

Respuesta: `{ perfil_parche, clubes:{guardados, conservados_confirmados, conflictos, ignorados, ignorados_muestra}|null, jugadores:{…}|null }`.

### `GET /v1/equivalencias?perfil_parche=…&tipo=jugadores|clubes&desde=<id>`
Solo filas `automatico` y `confirmado`. Páginas de 5000; repetir con `desde=siguiente` hasta `siguiente: null`.
`{ filas:[{ id, phoenix_id, pes_id_local, estado }], siguiente }`

Revisión del staff en la web: Modo Mánager → Centro de control → «Equivalencias entre parches».

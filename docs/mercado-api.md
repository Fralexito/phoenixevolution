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
- Cada traspaso cerrado, en **una sola transacción**: cambia el club, `version_liga += 1` y se guarda en `lm_cambios_liga` (`version, phoenix_id, pes_id, club_desde, club_hacia, club_desde_pes, club_hacia_pes, tipo`).
- Phoenix Link recibe `version_liga` en la respuesta de `/phoenix/v1/presencia` y `/phoenix/v1/sala/latido`. Si es mayor que la última aplicada → pedir cambios.
- `GET /liga/cambios?desde=<version>` → **firmado** igual que `/plantillas`. `contenido = { liga, desde, version_actual, generado, cambios:[…] }` (máx. 1000; si quedan más, repetir con `desde` = última `version` recibida). Aplicar en orden de `version`.
- `POST /liga/aplicado { version, huella_plantillas }` → `{ version_actual, al_dia, coincide }`. `coincide` = la huella reportada es igual a la esperada (solo se compara si `version` = `version_actual`; si no, `null`).
- `/plantillas` incluye ahora `version_liga` dentro de `contenido` (sirve como punto de partida tras una instalación limpia).

## Clubes CPU y agentes libres
- **Club CPU** = club sin DT (`dueno` nulo). Todo equipo del juego que entra al universo de la liga (catálogo + aprobado) es CPU hasta que un DT lo elige. No tiene presupuesto.
- **Agente libre** = jugador sin club (`club_hacia` / `club_id` nulo).
- DT→CPU y CPU→DT generan cambios de liga igual que DT↔DT (misma `version_liga`).
- **Tope de plantilla: 40.** Un traspaso a un club lleno se rechaza con `PLANTILLA_LLENA`.

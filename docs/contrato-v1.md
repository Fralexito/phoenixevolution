# Contrato API `/v1` · Smash Soda ↔ Phoenix (versión 1.0.0)

Fuente única para el cliente C++ (`PhoenixLink` en `Fralexito/smash-soda-fork`). Si algo de aquí cambia, sube `version_api` y avisa al chat de Smash Soda.
Implementación: `supabase/functions/phoenix/` (repo `phoenixevolution`, rama `borrador`). Desplegada el 6 oct 2026 (versión 1 de la función).

## 0. Reglas generales

| Tema | Regla |
|---|---|
| URL base | `https://fiibiyijojkxqlsrhcil.supabase.co/functions/v1/phoenix` |
| Transporte | HTTPS, `Content-Type: application/json; charset=utf-8`, cuerpo ≤ 64 KB |
| Autenticación | Todas las rutas salvo `emparejar` y `config`: cabecera `Authorization: Bearer phx_…` (token de dispositivo) |
| Versión de la app | Enviar siempre `X-Phoenix-Version: 7.0.4` (versión de Smash Soda). Si es menor que `version_app_min` → `APP_DESACTUALIZADA` |
| No hace falta | `apikey` ni JWT de Supabase |
| Sobre de éxito | `{ "ok": true, …campos de la ruta…, "solicitud_id": "uuid" }`, HTTP 200 |
| Sobre de error | `{ "ok": false, "codigo": "MAYUSCULAS", "mensaje": "texto para humanos", "reintentable": bool, "solicitud_id": "uuid", "campo"?: "…", "reintentar_en"?: seg }` |
| Decidir por | **`codigo`** (estable). `mensaje` puede cambiar de redacción: solo para mostrar o loguear |
| Fechas | ISO 8601 UTC (`2026-10-06T19:00:00.000Z`) |
| IDs Parsec | Texto de solo dígitos (`"12345678"`); también se acepta número |
| Cabeceras de respuesta | `x-request-id` (= `solicitud_id`); `retry-after` cuando hay `reintentar_en` |
| Timeout del cliente | 5 s por petición |

### Política de reintentos (obligatoria para no trabar el juego ni saturar el plan FREE)
- `reintentable: true` (solo `DEMASIADOS_INTENTOS` y `ERROR_INTERNO`) o error de red/timeout → reintentar con espera exponencial + fluctuación: 2 s, 4 s, 8 s… tope `intervalos.reintento_max_seg` (300 s). Si viene `reintentar_en`, esperar al menos eso.
- `reintentable: false` → **no reintentar la misma petición**. Actuar según la tabla de la sección 8.
- Eventos: reintentar el lote completo es seguro (idempotencia por `clave`).

## 1. `GET /v1/config` (sin token)
Leer al arrancar y cada 30 min. Si falla, usar los últimos valores guardados o estos por defecto.

Respuesta:
```json
{
  "ok": true,
  "version_api": "1.0.0",
  "version_app_min": "7.0.4",
  "version_app_recomendada": "7.0.4",
  "intervalos": { "latido_seg": 30, "latido_min_seg": 10, "eventos_lote_max": 50, "eventos_envio_seg": 15, "ping_vivo_seg": 4, "reintento_max_seg": 300 },
  "interruptores": { "integracion": true, "muestras_calidad": true, "ping_en_vivo": false, "roles_reto": true },
  "limites": { "invitados_max": 16, "nombre_pc_max": 40, "enlace_max": 500, "datos_evento_bytes": 4096 },
  "servidor_hora": "2026-10-06T19:00:00.000Z",
  "solicitud_id": "…"
}
```
- `interruptores.integracion = false` → la app deja de llamar a todo salvo `config` (interruptor de emergencia).
- `muestras_calidad = false` → mandar latidos sin `invitados`.
- `ping_en_vivo` y `roles_reto` → reservados para las fases 2.5 y 2.6; hoy solo informativos.

## 2. `POST /v1/emparejar` (sin token)
El usuario genera en la web un código de 6 dígitos (vale 10 min, un solo uso) y lo escribe en la app.

Petición:
```json
{ "codigo": "123456", "nombre_pc": "PC de la sala", "version_app": "7.0.4" }
```
| Campo | Tipo | Obligatorio | Regla |
|---|---|---|---|
| `codigo` | texto | sí | 6 dígitos; se ignoran espacios y guiones |
| `nombre_pc` | texto | no | ≤ 40; por defecto `"Mi PC"` |
| `version_app` | texto | no | si es menor que la mínima → `APP_DESACTUALIZADA` |

Respuesta:
```json
{ "ok": true, "token": "phx_…(43 car.)", "dispositivo_id": "uuid", "usuario": { "id": "uuid", "nombre": "Fralex" } }
```
- El `token` se entrega **una sola vez**: guardarlo cifrado con **DPAPI** (ámbito usuario de Windows). El servidor solo guarda su huella SHA-256; si se pierde, hay que volver a vincular.
- Errores posibles: `CODIGO_INVALIDO`, `CODIGO_NO_ENCONTRADO`, `CODIGO_VENCIDO`, `CODIGO_USADO`, `HOST_NO_AUTORIZADO`, `APP_DESACTUALIZADA`, `DEMASIADOS_INTENTOS` (10 intentos / 10 min por IP), `JSON_INVALIDO`, `CAMPO_INVALIDO`.

## 3. `POST /v1/sala/abrir` (token)
Llamar cuando el host empieza a hostear (o al reiniciar la app con la sala aún abierta: **si la PC ya tiene una sala viva, se reabre la misma** y vuelve `reabierta: true` con el mismo `sala_id`).

Petición:
```json
{
  "juego": "eFootball PES 2021", "parche": "Conmegol", "region": "Lima",
  "plazas_total": 4, "visibilidad": "amigos", "limite_espectadores": 4,
  "enlace": "https://parsec.gg/g/…", "reto_id": 123
}
```
| Campo | Tipo | Obligatorio | Regla |
|---|---|---|---|
| `plazas_total` | entero | **sí** | 1–16 |
| `juego`, `parche` | texto | no | ≤ 60 |
| `region` | texto | no | ≤ 40 |
| `visibilidad` | texto | no | `publica` \| `amigos` \| `privada`; por defecto `amigos` |
| `limite_espectadores` | entero | no | 0–16; por defecto 4 |
| `enlace` | texto | no | debe empezar por `https://`, ≤ 500. Solo lo ven quienes pueden entrar |
| `reto_id` | entero | no | reto en estado ACEPTADO/EN_JUEGO del que esta cuenta es host (o jugador si el reto no tiene host fijo) |

Respuesta:
```json
{
  "ok": true, "sala_id": "uuid", "reabierta": false, "estado": "abierta",
  "visibilidad": "amigos", "limite_espectadores": 4, "latido_seg": 30,
  "roles": {
    "modo": "reto",
    "jugadores": [
      { "usuario_id": "uuid", "nombre": "Kaiser", "parsec_id": "111", "lado": "A", "mando": 1 },
      { "usuario_id": "uuid", "nombre": "Mirko",  "parsec_id": null,  "lado": "B", "mando": 2 }
    ],
    "espectadores": [
      { "usuario_id": "uuid", "nombre": "Ana", "parsec_id": "333", "rol": "espectador", "pad_limit": 0 },
      { "usuario_id": "uuid", "nombre": "Jack", "parsec_id": null, "rol": "staff", "pad_limit": 0 }
    ]
  }
}
```
- Sin `reto_id` → `roles = { "modo": "libre", "jugadores": [], "espectadores": [] }`: la app se comporta como hoy.
- `modo: "reto"`: el lado A recibe mandos 1…n y el lado B los siguientes. Todo espectador/staff tiene `pad_limit: 0` (nunca juega).
- `parsec_id: null` = ese jugador aún no vinculó su cuenta Parsec en la web; la app no puede reconocerlo automáticamente (decidir en fase 2.6 qué hacer: p. ej. pedir confirmación al host).
- Errores: `TOKEN_*`, `HOST_NO_AUTORIZADO`, `APP_DESACTUALIZADA`, `CAMPO_INVALIDO`, `RETO_NO_VALIDO`, `DEMASIADOS_INTENTOS`, `ERROR_INTERNO`.

## 4. `POST /v1/sala/latido` (token)
Cada `latido_seg` (30 s). Nunca más seguido que `latido_min_seg` (10 s): si no, `DEMASIADOS_INTENTOS`. El **primer** latido se manda ≥ 10 s después de `abrir`.

Petición:
```json
{
  "sala_id": "uuid", "estado": "en_partida", "plazas_libres": 2,
  "enlace": "https://parsec.gg/g/…",
  "invitados": [
    { "parsec_id": "111", "nombre": "Kaiser", "ping_ms": 38, "fast_rts": 120, "slow_rts": 2, "bitrate_kbps": 9000 }
  ]
}
```
| Campo | Tipo | Obligatorio | Regla |
|---|---|---|---|
| `sala_id` | uuid | sí | de esta misma PC |
| `estado` | texto | sí | `abierta` \| `en_partida` |
| `plazas_libres` | entero | sí | 0–16 |
| `enlace` | texto | no | solo si cambió |
| `invitados` | lista | no | ≤ 16; duplicados por `parsec_id` se ignoran |
| `invitados[].parsec_id` | texto dígitos | sí | |
| `invitados[].nombre` | texto | no | ≤ 60 |
| `invitados[].ping_ms` | entero | no | 0–10000 (`ParsecMetrics.networkLatency`); sin ping no se guarda muestra |
| `invitados[].fast_rts`, `slow_rts`, `bitrate_kbps` | entero ≥ 0 | no | |

Respuesta: `{ "ok": true, "estado": "en_partida", "latido_seg": 30, "servidor_hora": "…" }`
- Si la respuesta trae otro `latido_seg`, usar ese desde el siguiente latido.
- `SALA_CERRADA` → la sala murió en el servidor (3 min sin latido, cierre desde la web o permiso retirado). Si el host sigue hosteando: llamar a `abrir` de nuevo.
- `SALA_NO_ENCONTRADA` → olvidar ese `sala_id` y llamar a `abrir`.
- Efecto lateral: si un invitado coincide con una cuenta Parsec «declarada» de alguien con rol en el reto de esa sala, pasa a «verificada».

## 5. `POST /v1/sala/cerrar` (token)
Al dejar de hostear o al cerrar la app. Es idempotente.

Petición: `{ "sala_id": "uuid", "motivo": "texto opcional ≤ 120" }`
Respuesta: `{ "ok": true, "ya_cerrada": false, "estado": "cerrada" }` (o `ya_cerrada: true` con el estado que tenía: `cerrada` o `caida`).
Si la app se cierra sin poder avisar, el servidor la marca `caida` a los 3 min sin latido.

## 6. `POST /v1/eventos` (token)
Lotes de hasta 50 eventos, cada `eventos_envio_seg` (15 s) o al llenarse el lote. Guardar en cola en disco si no hay red.

Petición:
```json
{
  "sala_id": "uuid",
  "eventos": [
    { "clave": "7f3c…-0001", "tipo": "entra", "ocurrido": "2026-10-06T19:00:00Z", "actor_parsec": "111", "datos": { "nombre": "Kaiser" } }
  ]
}
```
| Campo | Regla |
|---|---|
| `clave` | 8–80 caracteres, **única para siempre** (recomendado: UUID v4 generado al crear el evento). Reenviar la misma clave no duplica |
| `tipo` | `entra`, `sale`, `desconexion`, `reconexion`, `expulsion`, `cambio_mando`, `partida_inicio`, `partida_fin`, `pausa`, `plazas_ampliadas`, `espera_rechazada` (`abrir`, `cerrar` y `caida` los genera el servidor: no enviarlos) |
| `ocurrido` | ISO 8601; si falta o está fuera de [−7 días, +5 min] se usa la hora del servidor |
| `actor_parsec` | opcional, dígitos |
| `datos` | objeto opcional, ≤ 4 KB en JSON |

`datos` sugeridos por tipo (libres, pero mejor así):
| Tipo | `datos` |
|---|---|
| `entra` / `sale` | `{ "nombre": "…" }` |
| `desconexion` / `reconexion` | `{ "segundos_fuera": 12 }` (en reconexión) |
| `expulsion` | `{ "motivo": "no_listado" \| "manual" \| "ban" }` |
| `cambio_mando` | `{ "mando": 2, "de": "111", "a": "222" }` |
| `partida_inicio` / `partida_fin` / `pausa` | `{ "marcador": "2-1" }` opcional |
| `plazas_ampliadas` / `espera_rechazada` | `{ "nombre": "…", "limite": 4 }` |

Respuesta:
```json
{ "ok": true, "aceptados": 3, "duplicados": 1, "rechazados": [ { "clave": "abc", "codigo": "CAMPO_INVALIDO", "campo": "clave", "mensaje": "…" } ] }
```
- Un evento malo **no** tumba el lote: va en `rechazados` y no se reintenta. Los aceptados y duplicados ya pueden borrarse de la cola.
- Más de 50 → `LOTE_DEMASIADO_GRANDE` (todo el lote; partirlo).

## 7. Catálogo de errores

| `codigo` | HTTP | Reintentable | Qué hace la app |
|---|---|---|---|
| `JSON_INVALIDO` | 400 | no | Bug del cliente: loguear y descartar |
| `CAMPO_INVALIDO` | 422 | no | Bug del cliente: loguear `campo` y descartar |
| `RUTA_NO_EXISTE` | 404 | no | Bug del cliente |
| `METODO_NO_PERMITIDO` | 405 | no | Bug del cliente |
| `TOKEN_FALTANTE` | 401 | no | Pedir vincular la PC |
| `TOKEN_INVALIDO` | 401 | no | Borrar token guardado y pedir vincular |
| `TOKEN_REVOCADO` | 401 | no | Borrar token, avisar «Esta PC fue desvinculada desde la web» |
| `HOST_NO_AUTORIZADO` | 403 | no | Pausar integración y avisar; reintentar solo cuando el usuario lo pida |
| `APP_DESACTUALIZADA` | 426 | no | Pausar integración, sugerir actualizar |
| `CODIGO_INVALIDO` | 400 | no | Pedir 6 dígitos |
| `CODIGO_NO_ENCONTRADO` | 404 | no | «Código incorrecto» |
| `CODIGO_VENCIDO` | 410 | no | «Genera otro en la web» |
| `CODIGO_USADO` | 410 | no | «Genera otro en la web» |
| `DEMASIADOS_INTENTOS` | 429 | **sí** | Esperar `reintentar_en` |
| `SALA_NO_ENCONTRADA` | 404 | no | Olvidar `sala_id`; `abrir` si sigue hosteando |
| `SALA_CERRADA` | 409 | no | `abrir` de nuevo si sigue hosteando |
| `RETO_NO_VALIDO` | 422 | no | Abrir sin `reto_id` o avisar al host |
| `LOTE_DEMASIADO_GRANDE` | 413 | no | Partir el lote |
| `ERROR_INTERNO` | 500 | **sí** | Espera exponencial |
| (red / timeout / 502–504) | — | **sí** | Espera exponencial |

## 8. Ciclo de vida típico
1. Arranque → `GET config`. Sin token → esperar a que el usuario vincule (`emparejar`).
2. Host empieza a hostear → `abrir` → guardar `sala_id` y `roles`.
3. Cada 30 s → `latido`. Cada 15 s (si hay) → `eventos`.
4. Deja de hostear → `cerrar`. Si la app muere, el servidor marca `caida` a los 3 min.

## 9. Garantías del servidor
- Una sola sala viva por PC. Visibilidad por defecto `amigos`. El enlace solo lo leen quienes pueden entrar (RLS).
- Solo hosts aprobados por staff obtienen token y abren salas; si el staff retira el permiso, la sala se cierra y el siguiente latido recibe `SALA_CERRADA` / `HOST_NO_AUTORIZADO`.
- Logs estructurados por `solicitud_id`: al reportar un fallo, incluir ese id.

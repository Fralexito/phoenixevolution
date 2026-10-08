# Contrato API `/v1` · Smash Soda ↔ Phoenix (versión 1.6.0)

Fuente única para el cliente C++ (`PhoenixLink` en `Fralexito/smash-soda-fork`). Si algo de aquí cambia, sube `version_api` y avisa al chat de Smash Soda.
Implementación: `supabase/functions/phoenix/` (repo `phoenixevolution`, rama `borrador`). v1.0.0 desplegada el 6 oct 2026; **v1.1.0** (preferencias de aviso, builds oficiales, control remoto) requiere la migración 059.

**Cambios 1.6.0 (compatibles, requieren migración 073):** nueva ruta `POST /v1/perfiles` (sección 23): nombre, avatar y carta de jugador por `parsec_id`.

**Cambios 1.5.0 (compatibles, requieren migración 067):** `sala/abrir` acepta `acepta_espectadores`; `sala/abrir` y `sala/latido` devuelven la **lista de roles viva** (`roles` + `roles_etag`), que ahora incluye al **rival que aceptó en el radar** (mando 2) y a los **espectadores que entraron con «Ver»** (`pad_limit 0`); nueva ruta `POST /v1/sala/soltar_rival`. El enlace de una sala solo se entrega a quien tiene rol (sección 22).

**Cambios 1.4.0 (compatibles, requieren migración 064):** `GET /v1/salas`, `POST /v1/presencia`, `GET /v1/presencia/amigos`, `POST /v1/invitar` (secciones 17–20); sondeo barato con **ETag** (sección 21); error `NO_SON_AMIGOS`; intervalos `presencia_seg`, `sondeo_salas_seg`, `sondeo_amigos_seg` en `config`.

**Cambios 1.3.0 (compatibles, requieren migración 061):** rutas `POST /v1/diagnostico` (autodiagnóstico del host), `POST /v1/sala/prueba` (prueba real en sala) y `GET /v1/eco` (solo navegador); campo `semaforo` en las reglas (sección 12); `retraso_host_ms` pasa a significar **retraso máximo permitido**.

**Cambios 1.2.0 (compatibles hacia atrás, requieren migración 060):** ruta nueva `POST /v1/instalar` (instalador); `sala/abrir` acepta `modo` y `torneo_privado_id` y devuelve `modo`, `reglas`, `marca`; `latido` devuelve `modo` y `reglas` (pueden cambiar en caliente); `config` devuelve `perfiles` y `organizaciones`; 7 errores nuevos (sección 7). Sin `modo`, todo funciona como antes (amistoso).

**Cambios 1.1.0:** cabecera `X-Phoenix-Build`; 4 campos booleanos nuevos en `sala/abrir` (+ `preferencias` y `avisos` en la respuesta); `config` acepta token opcional y devuelve `exigir_build` y `estado`; 4 errores nuevos (`DISPOSITIVO_SUSPENDIDO`, `BUILD_NO_OFICIAL`, `BUILD_DESACTIVADO`, `VERSION_DESACTIVADA`). Una app 1.0.0 sigue funcionando mientras `exigir_build` sea `false`.

## 0. Reglas generales

| Tema | Regla |
|---|---|
| URL base | `https://fiibiyijojkxqlsrhcil.supabase.co/functions/v1/phoenix` |
| Transporte | HTTPS, `Content-Type: application/json; charset=utf-8`, cuerpo ≤ 64 KB |
| Autenticación | Todas las rutas salvo `emparejar` y `config`: cabecera `Authorization: Bearer phx_…` (token de dispositivo) |
| Versión de la app | Enviar siempre `X-Phoenix-Version: 7.0.4` (versión de Smash Soda). Si es menor que `version_app_min` → `APP_DESACTUALIZADA` |
| Huella del build | Enviar siempre `X-Phoenix-Build: <sha256 hex del SmashSoda.exe en ejecución, 64 car. minúsculas>` (calcularla una vez al arrancar). Ver sección 9 |
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
- `reintentable: false` → **no reintentar la misma petición**. Actuar según la tabla de la sección 7.
- Eventos: reintentar el lote completo es seguro (idempotencia por `clave`).

## 1. `GET /v1/config` (token opcional)
Leer al arrancar y cada 30 min (y siempre tras un error `BUILD_*`, `VERSION_DESACTIVADA` o `DISPOSITIVO_SUSPENDIDO`). Mandar `Authorization`, `X-Phoenix-Version` y `X-Phoenix-Build` si se tienen: entonces responde también el estado de esa PC y ese build. **Nunca** devuelve error por el token: lo informa en `estado.dispositivo`. Si falla, usar los últimos valores guardados o estos por defecto.

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
  "exigir_build": false,
  "perfiles": [ { "id": 1, "clave": "amistoso", "nombre": "Amistoso", "version": 1, "organizacion_id": null, "reglas": { "…": "ver sección 12" } } ],
  "organizaciones": [ { "id": "uuid", "nombre": "Copa Andina", "rol": "host", "licencia_vigente": true, "al_vencer": "amistoso",
                        "marca": { "tipo": "organizacion", "nombre": "Copa Andina", "logo_url": "https://…", "color_primario": "#112233", "color_secundario": "#445566" },
                        "torneos_en_curso": [ { "id": 7, "nombre": "Apertura", "perfil_reglas_id": 12 } ] } ],
  "estado": { "app": "al_dia", "build": "oficial", "dispositivo": "activo" },
  "servidor_hora": "2026-10-06T19:00:00.000Z",
  "solicitud_id": "…"
}
```
- `interruptores.integracion = false` → la app deja de llamar a todo salvo `config` (interruptor de emergencia).
- `muestras_calidad = false` → mandar latidos sin `invitados`.
- `estado.app`: `al_dia` | `actualizable` (por debajo de la recomendada: sugerir actualizar) | `desactualizada` (por debajo de la mínima: pausar) | `sin_dato`.
- `estado.build`: `oficial` | `sin_verificar` (huella no registrada y no se exige) | `no_oficial` (no registrada y se exige: pausar) | `desactivado` | `version_desactivada` | `huella_invalida` | `sin_dato`.
- `estado.dispositivo`: `activo` | `suspendido` (pausar; el staff puede reactivarla) | `revocado` (borrar token) | `desconocido` (borrar token) | `sin_token`.
- Intervalos e interruptores los puede cambiar el staff desde la web (tabla `phoenix_config`) sin redesplegar ni recompilar; la función los relee cada ≤ 60 s. Frenos fijos: `latido_seg` ≥ 10 y `latido_min_seg` ≥ 5.
- `perfiles`: siempre los 3 globales (`amistoso`, `torneo_privado`, `oficial`); con token, además los perfiles propios de las organizaciones del usuario. `organizaciones`: solo con token y solo las del usuario (vacío si no pertenece a ninguna). Sirven para que el host elija modo/torneo antes de abrir.
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
  "enlace": "https://parsec.gg/g/…", "reto_id": 123, "modo": "amistoso", "torneo_privado_id": null,
  "publicar_en_pagina": true, "avisar_amigos_host": true, "avisar_amigos_jugadores": false, "anunciar_discord": false
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
| `publicar_en_pagina` | bool | no | por defecto `true`. `false` = la sala no aparece en «Salas en vivo»: solo la ven el host, staff y los roles del reto |
| `avisar_amigos_host` | bool | no | por defecto `false`. Notifica a los amigos del host que **puedan ver** la sala |
| `avisar_amigos_jugadores` | bool | no | por defecto `false`. Solo salas de reto: notifica a los amigos de cada jugador (salvo jugadores con «mostrar conexión» apagado) |
| `anunciar_discord` | bool | no | por defecto `false`. Solo se publica si la sala es `publica`, publicada y **sin reto**; si no, se ignora (`avisos.discord = "NO_PUBLICA"`) |
| `reto_id` | entero | no | reto en estado ACEPTADO/EN_JUEGO del que esta cuenta es host (o jugador si el reto no tiene host fijo). En modo `oficial` es obligatorio y el host **no** puede ser jugador |
| `modo` | texto | no | `amistoso` (por defecto) \| `torneo_privado` \| `oficial` |
| `torneo_privado_id` | entero | solo `torneo_privado` | torneo en curso de una organización de la que el host es miembro (dueño/staff/host) |

Respuesta:
```json
{
  "ok": true, "sala_id": "uuid", "reabierta": false, "estado": "abierta",
  "visibilidad": "amigos", "limite_espectadores": 4, "latido_seg": 30,
  "modo": "torneo_privado", "modo_pedido": "torneo_privado", "aviso_modo": null,
  "reglas": { "perfil_id": 12, "nombre": "Reglas Apertura", "version": 3, "host": "hosts_organizacion", "modo_competitivo": "opcional", "…": "ver sección 12" },
  "marca": { "tipo": "organizacion", "nombre": "Copa Andina", "logo_url": "https://…", "color_primario": "#112233", "color_secundario": "#445566" },
  "organizacion_id": "uuid", "torneo_privado_id": 7,
  "preferencias": { "publicar_en_pagina": true, "avisar_amigos_host": true, "avisar_amigos_jugadores": false, "anunciar_discord": false },
  "avisos": { "enviado": true, "amigos_host": 5, "amigos_jugadores": 0, "discord": "NO_PEDIDO", "anti_spam": false },
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
- **Modo efectivo**: `modo` puede diferir de `modo_pedido`. Hoy solo ocurre si la licencia de la organización venció y esta eligió degradar: `modo: "amistoso"`, `aviso_modo: "licencia_vencida_degradada"`, sin organización. Si eligió bloquear → error `LICENCIA_VENCIDA`.
- **La app aplica `reglas` tal cual** (no tiene reglas fijas) y pinta Glass con `marca`. `marca.tipo`: `phoenix` | `organizacion` | `liga` (este último trae `tema: "galaxy"`).
- **Avisos según reglas**: solo si `reglas.notificaciones = "host"` se usan las 4 preferencias; si no, `avisos = { "enviado": false, "motivo": "LAS_DECIDE_ORGANIZADOR" | "AUTOMATICAS_DE_LIGA" }`.
- **Avisos** (los envía el servidor, no la app): una sola vez por sala; reabrir la misma sala no vuelve a avisar (`avisos = { "enviado": false, "motivo": "YA_AVISADA" }`). Si el mismo host avisó hace < 30 min, se omiten los avisos a amigos (`anti_spam: true`). Cada destinatario puede apagar la categoría «Salas» en sus avisos. Un fallo de avisos **nunca** impide abrir la sala (`motivo: "ERROR"`). Valores de `avisos.discord`: `NO_PEDIDO`, `NO_PUBLICA`, `ENVIADO`, `DUPLICADO`, `SIN_CONFIGURAR`, `ERROR`.
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

Respuesta: `{ "ok": true, "estado": "en_partida", "latido_seg": 30, "modo": "amistoso", "reglas": { …campos de la sección 12… }, "servidor_hora": "…" }`
- `modo` y `reglas` pueden **cambiar en caliente** (cada hora el servidor revisa licencias: una sala de organización vencida pasa a `amistoso` o se cierra). Si `modo` cambió respecto a lo que la app aplica, aplicar las nuevas `reglas` desde ese momento. Aquí `reglas` viene sin `perfil_id`/`nombre`/`version`.
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
| `CODIGO_INVALIDO` | 400 | no | Formato incorrecto (emparejar: 6 dígitos; instalar: `XXXX-XXXX`) |
| `CODIGO_NO_ENCONTRADO` | 404 | no | «Código incorrecto» |
| `CODIGO_VENCIDO` | 410 | no | «Genera otro en la web» |
| `CODIGO_USADO` | 410 | no | «Genera otro en la web» |
| `DEMASIADOS_INTENTOS` | 429 | **sí** | Esperar `reintentar_en` |
| `SALA_NO_ENCONTRADA` | 404 | no | Olvidar `sala_id`; `abrir` si sigue hosteando |
| `SALA_CERRADA` | 409 | no | `abrir` de nuevo si sigue hosteando |
| `DISPOSITIVO_SUSPENDIDO` | 403 | no | Pausar integración; consultar `config` cada 30 min (el staff puede reactivarla) |
| `BUILD_NO_OFICIAL` | 403 | no | Pausar; avisar «descarga el Smash Soda oficial» |
| `BUILD_DESACTIVADO` | 403 | no | Pausar; avisar «este build fue retirado» |
| `VERSION_DESACTIVADA` | 403 | no | Pausar; sugerir actualizar |
| `SIN_VERSION_PUBLICADA` | 503 | no | Instalador: «aún no hay versión publicada, avisa al staff» |
| `MODO_NO_VALIDO` | 422 | no | Falta/sobra `reto_id` o `torneo_privado_id` para ese modo (ver `campo`) |
| `TORNEO_NO_VALIDO` | 422 | no | Elegir otro torneo (no existe o no está en curso) |
| `ORG_NO_AUTORIZADO` | 403 | no | El host no es miembro de esa organización |
| `LICENCIA_VENCIDA` | 403 | no | Avisar al host; abrir como amistoso si quiere |
| `HOST_NO_NEUTRAL` | 403 | no | En oficial el host no puede jugar: otro host debe abrir |
| `NO_SON_AMIGOS` | 403 | no | Solo se invita a amigos sin bloqueos: quitar la opción de invitar a esa persona |
| `RETO_NO_VALIDO` | 422 | no | Abrir sin `reto_id` o avisar al host |
| `LOTE_DEMASIADO_GRANDE` | 413 | no | Partir el lote |
| `ERROR_INTERNO` | 500 | **sí** | Espera exponencial |
| (red / timeout / 502–504) | — | **sí** | Espera exponencial |

## 8. Ciclo de vida típico
1. Arranque → `GET config`. Sin token → esperar a que el usuario vincule (`emparejar`).
2. Host empieza a hostear → `abrir` → guardar `sala_id` y `roles`.
3. Cada 30 s → `latido`. Cada 15 s (si hay) → `eventos`.
4. Deja de hostear → `cerrar`. Si la app muere, el servidor marca `caida` a los 3 min.

## 9. Builds oficiales y control remoto
- **Huella**: SHA-256 del archivo `SmashSoda.exe` que se está ejecutando, en hex minúsculas. El chat de Smash Soda publica la huella de cada release y el staff la registra en la web (Panel staff → Builds).
- **Orden de comprobación** (en `emparejar` y en toda ruta con token): build desactivado → versión con todos sus builds desactivados → si `exigir_build = true`, huella no registrada o ausente.
- **Desactivar una versión** = desactivar todos sus builds (`VERSION_DESACTIVADA`), o subir `version_app_min` (`APP_DESACTUALIZADA`).
- **Desactivar una PC** = suspenderla (reversible, `DISPOSITIVO_SUSPENDIDO`) o revocarla (definitivo, `TOKEN_REVOCADO`). Suspender o revocar cierra su sala viva.
- `exigir_build` empieza en `false` y solo se activa cuando el primer build oficial esté registrado.
- **Límite honesto**: la huella la calcula la propia app; un build manipulado podría enviar la de uno oficial. Esto evita builds viejos o no oficiales usados por error, no a un atacante decidido. La protección real sigue siendo token por PC + host aprobado por staff + revocación.

## 10. Garantías del servidor
- Una sola sala viva por PC. Visibilidad por defecto `amigos`. El enlace solo lo leen quienes pueden entrar (RLS).
- Solo hosts aprobados por staff obtienen token y abren salas; si el staff retira el permiso, la sala se cierra y el siguiente latido recibe `SALA_CERRADA` / `HOST_NO_AUTORIZADO`.
- Logs estructurados por `solicitud_id`: al reportar un fallo, incluir ese id.

## 11. `POST /v1/instalar` (sin token) — lo usa `PhoenixSetup.bat`
El host verificado genera en la web (Perfil → Instalar Phoenix Soda) un código `XXXX-XXXX` válido 24 h y de **un solo uso** (máx. 3 por día). El instalador lo canjea:

Petición: `{ "codigo": "K7PQ-2ZXM" }` (mayúsculas/minúsculas y separadores indiferentes; alfabeto sin `I`, `L`, `O`, `0`, `1`).

Respuesta:
```json
{ "ok": true, "url": "https://…/storage/v1/object/sign/fuente-phoenix/…?token=…", "expira_en_seg": 900,
  "version": "7.0.4", "sha256": "64 hex del ZIP", "notas": "texto o null", "nombre_archivo": "phoenix-soda-7.0.4.zip" }
```
- La URL es **temporal (15 min)** y apunta a un bucket privado; descargar con `GET` normal (curl/PowerShell). Tras descargar, **verificar que el SHA-256 del ZIP coincide con `sha256`**; si no, borrar y abortar.
- Se entrega siempre la versión activa más alta publicada por el staff.
- Errores: `CODIGO_INVALIDO`, `CODIGO_NO_ENCONTRADO`, `CODIGO_USADO`, `CODIGO_VENCIDO`, `HOST_NO_AUTORIZADO`, `SIN_VERSION_PUBLICADA`, `DEMASIADOS_INTENTOS` (5 / 10 min por IP), `ERROR_INTERNO` (en ese caso el código **no** se consume: reintentar).
- Límite honesto: quien descarga el código fuente puede compartirlo. El canje deja registro (usuario, versión, IP); la puerta real para usar salas Phoenix sigue siendo el emparejamiento con host verificado.

## 12. Perfiles de reglas (campo `reglas`)
| Campo | Valores | Amistoso | Torneo privado | Oficial |
|---|---|---|---|---|
| `host` | `cualquier_verificado` \| `hosts_organizacion` \| `neutral` | cualquier_verificado | hosts_organizacion | neutral |
| `modo_competitivo` (Puppet + HidHide) | `opcional` \| `obligatorio` \| `desactivado` \| `no_aplica` | opcional | opcional (lo cambia el organizador) | no_aplica |
| `retraso_host_ms` | 0–500: **máximo** retraso al host que el perfil permite aplicar (0 = no se aplica) | 0 | 0 (configurable) | 0 |
| `deteccion_partido` (inicio/fin) | `opcional` \| `activa` \| `obligatoria` | opcional | activa | obligatoria |
| `captura` | bool | false | true | true |
| `verificacion_parche` | `aviso` \| `lista` \| `huella_oficial` | aviso | lista | huella_oficial |
| `parches_permitidos` | lista de nombres (≤ 30) | [] | [] (los define el organizador) | ["Conmegol"] |
| `pausas` | `libres` \| `limitadas` | libres | limitadas | limitadas |
| `pausas_max` | 0–20 | 0 | 2 | 2 |
| `pausa_max_seg` | 0–1800 | 0 | 180 | 180 |
| `anti_trampa` | `registro` \| `alertas_organizador` \| `alertas_staff` | registro | alertas_organizador | alertas_staff |
| `marca` | `phoenix` \| `organizacion` \| `liga` | phoenix | organizacion | liga |
| `notificaciones` | `host` \| `organizador` \| `automaticas` | host | organizador | automaticas |
| `semaforo` (opcional) | objeto con `ping_verde_ms`, `ping_ambar_ms`, `jitter_verde_ms`, `jitter_ambar_ms`, `perdida_verde_pct`, `perdida_ambar_pct` | 60 / 100 · 10 / 25 · 1 / 3 | 50 / 90 · 8 / 20 · 0,5 / 2 | 40 / 80 · 6 / 15 · 0,5 / 1,5 |

- Los valores de la tabla son los **por defecto**; el staff de Phoenix puede editar los globales y cada organización crea sus propios perfiles de torneo (nunca puede usar `neutral` ni `alertas_staff`, y su `marca`/`notificaciones` quedan fijas en `organizacion`/`organizador`).
- Campos desconocidos: ignorarlos (se podrán añadir campos sin subir versión mayor).
- `pausas = libres` → `pausas_max`/`pausa_max_seg` no aplican (vienen en 0).

## 13. Semáforo de conexión (regla única)
Cada métrica presente se compara con su par de umbrales del perfil: `≤ verde` → verde, `≤ ámbar` → ámbar, `> ámbar` → rojo. **Manda la peor.** Sin ninguna métrica → `sin_datos`. Si el perfil no trae `semaforo`, se usan 60/100 ms, 10/25 ms, 1/3 %. La regla vive en la base (`private.semaforo`); la app no la recalcula: muestra el `semaforo` que devuelve el servidor. En rojo, Glass debe proponer otro host (o uno neutral).

## 14. `POST /v1/diagnostico` (token) — autodiagnóstico del host
Antes de abrir sala (y cuando el host lo pida). La app mide contra sus servidores de referencia.
```json
{ "latencia_ms": 18.5, "jitter_ms": 2.1, "perdida_pct": 0, "subida_kbps": 30000, "bajada_kbps": 200000,
  "muestras": 20, "duracion_seg": 15, "referencia": "speedtest:lima-1", "jugadores_esperados": 2, "sala_id": null }
```
| Campo | Obligatorio | Regla |
|---|---|---|
| `latencia_ms` | sí | número 0–10000 (mediana) |
| `subida_kbps` | sí | entero 0–10 000 000 |
| `jitter_ms`, `perdida_pct`, `bajada_kbps`, `muestras`, `duracion_seg`, `referencia` (≤ 80) | no | |
| `jugadores_esperados` | no | 1–8, por defecto 2 |
| `sala_id` | no | si se manda, el semáforo usa las reglas de esa sala; si no, las de amistoso |

Respuesta:
```json
{ "ok": true, "id": 123, "semaforo": "verde", "umbrales": { "ping_verde_ms": 60, "…": "…" },
  "sugerencias": { "bitrate_total_kbps": 21000, "limite_espectadores": 1, "alcanza_para_jugadores": true } }
```
- `sugerencias`: 70 % de la subida (tope 50 000 kbps) como `encoderMaxBitrate` total; ~8 000 kbps por jugador y ~3 000 por espectador. La app las aplica sola salvo que el host las cambie. `alcanza_para_jugadores: false` = avisar al host que su subida no da para una imagen buena.

## 15. `POST /v1/sala/prueba` (token) — prueba real en sala
Con el jugador conectado por Parsec ~10 s antes del partido. Es la medición **exacta** (camino real host↔jugador).
```json
{ "sala_id": "uuid", "parsec_id": "111", "latencia_ms": 42.0, "p95_ms": 55.0, "jitter_ms": 4.2, "perdida_pct": 0.3,
  "bitrate_kbps": 9000, "muestras": 40, "duracion_seg": 10 }
```
`sala_id`, `parsec_id` y `latencia_ms` obligatorios; el resto opcional (mismos rangos que la sección 14).

Respuesta:
```json
{ "ok": true, "id": 124, "usuario_id": "uuid o null", "semaforo": "ambar", "umbrales": { "…": "…" },
  "retraso": { "sugerido_ms": 21, "permitido_ms": 0, "aplicar_ms": 0 } }
```
- `retraso.sugerido_ms` = mitad del ping del jugador (tope 250). `aplicar_ms` = mínimo entre lo sugerido y `reglas.retraso_host_ms`: **la app solo aplica `aplicar_ms`**; en amistoso viene 0 (no se aplica).
- `usuario_id: null` = ese `parsec_id` no está vinculado a ningún perfil (la prueba se guarda igual, sin dueño).
- El jugador ve el resultado al instante en la web (Realtime). Sala cerrada → `SALA_CERRADA`.

## 16. `GET /v1/eco` (sin token) — solo para navegadores
Lo usa la web para el pre-chequeo del jugador (≈ 14 llamadas por chequeo, máx. 60/min por IP). Responde `{ "ok": true, "t": 1791313521069, "solicitud_id": "…" }` con CORS abierto y `Timing-Allow-Origin: *`. **La app no lo usa.**

## 17. `GET /v1/salas` (token) — salas que ve el dueño de esta PC
Mismas reglas que la web: visibilidad (pública / amigos / privada), publicada o no, organización, reto, bloqueos e **invitaciones vigentes**. Sondear cada `intervalos.sondeo_salas_seg` (25 s) con ETag (sección 21).

Respuesta:
```json
{ "ok": true, "etag": "W/\"9f2c1a…\"", "sondeo_seg": 25,
  "salas": [ {
    "sala_id": "uuid", "soy_host": false, "invitado": true,
    "host": { "id": "uuid", "nombre": "Kaiser", "avatar_url": "https://… o preset:fenix o null", "amigo": true },
    "juego": "eFootball PES 2021", "parche": "Conmegol", "region": "Lima", "modo": "amistoso", "visibilidad": "amigos",
    "estado": "abierta", "salud": "viva", "plazas_total": 4, "plazas_libres": 2, "limite_espectadores": 4,
    "abierta_en": "…", "reto_id": null, "organizacion_id": null,
    "calidad": { "ping_mediana_ms": 38, "ping_p95_ms": 61, "perdida_pct": 0.4, "muestras": 812, "semaforo": "verde" },
    "enlace": "https://parsec.gg/g/… o null" } ] }
```
- Orden: primero donde **estoy invitado**, luego las de **amigos**, luego con plazas libres, luego las más nuevas. Máx. 100.
- `salud`: `viva` | `en_partida` | `inestable` (sin latido > 90 s). `calidad` = histórico del host (14 días; `null` si aún no hay muestras), con el semáforo según las reglas de esa sala.
- `enlace` solo viene si este usuario puede **entrar** (no basta con ver). `avatar_url` puede ser `preset:<id>` (avatar predefinido de la web): mostrar la inicial.

## 18. `POST /v1/presencia` (token) — latido de presencia de la app
Cada `intervalos.presencia_seg` (60 s) mientras la app esté abierta, aunque no hostee.
Petición: `{ "estado": "disponible", "sala_id": null }` — `estado`: `disponible` | `ausente` | `en_sala` | `en_partida`; `sala_id` opcional (debe ser una sala de esta PC).
Respuesta: `{ "ok": true, "estado": "disponible", "siguiente_seg": 60 }`.
- Si la app deja de enviarlo 150 s, el usuario pasa a desconectado. **No hace falta avisar al cerrar.**
- `en_sala` / `en_partida` de un host se deducen solos de su sala viva: la app puede mandar `disponible` siempre.

## 19. `GET /v1/presencia/amigos` (token) — estado de cada amigo
Sondear cada `intervalos.sondeo_amigos_seg` (30 s) con ETag (el campo `desde` NO cambia el ETag).
```json
{ "ok": true, "etag": "W/\"…\"", "sondeo_seg": 30,
  "amigos": [ { "usuario_id": "uuid", "nombre": "Mirko", "avatar_url": null, "estado": "en_partida", "sala_id": "uuid o null", "desde": "…" } ] }
```
- `estado`, de más a menos activo (y así viene ordenado): `en_partida` · `en_sala` · `disponible` · `ausente` · `desconectado`.
- Cómo se decide (servidor): hostea una sala viva → `en_sala`/`en_partida`; aparece como invitado en las muestras de una sala viva (últimos 2 min) → `en_sala`/`en_partida`; latido de su app < 150 s → lo que mandó; si no → `desconectado`.
- `sala_id` solo si este usuario puede **ver** esa sala; si no, `null` (y si estaba «en sala» se muestra `disponible`, para no revelar salas ajenas).
- Privacidad: quien apagó «Mostrar mi conexión» aparece siempre `desconectado`. Bloqueados no aparecen.
- **Límite honesto:** quien está solo en la **web** (sin la app ni sala) figura `desconectado` aquí: la presencia de la web vive en el navegador, no en el servidor.

## 20. `POST /v1/invitar` (token) — invitar a un amigo a la sala de esta PC
Petición: `{ "usuario_id": "uuid del amigo", "sala_id": "uuid de mi sala viva" }`
Respuesta: `{ "ok": true, "invitacion_id": 12, "notificado": true, "expira": "…" }`
- Efecto: el amigo puede **ver y entrar** a esa sala durante **2 h** (aunque sea privada o de amigos) y la ve primero en su `GET /v1/salas` con `invitado: true`. En la web recibe el aviso **«Te invitan a jugar»** en la campana (categoría «Salas»).
- `notificado: false` = el amigo apagó los avisos de «Salas»: la invitación existe igual (la verá en Phoenix Soda y en la web de salas).
- Reinvitar renueva las 2 h. Límites: mismo amigo y sala, 1 cada 2 min; máx. 15 invitaciones cada 10 min por host → `DEMASIADOS_INTENTOS` (`reintentar_en`).
- Errores: `SALA_NO_ENCONTRADA`, `SALA_CERRADA`, `NO_SON_AMIGOS`, `DEMASIADOS_INTENTOS`, `CAMPO_INVALIDO`, `TOKEN_*`.

## 21. Sondeo barato con ETag (rutas 17 y 19)
1. La respuesta trae `etag` (en el cuerpo y en la cabecera `ETag`), p. ej. `W/"9f2c1a0b77e1d034"`.
2. En el siguiente sondeo, enviar `If-None-Match: <ese etag>` (o `?etag=<ese etag>` si la librería HTTP no deja poner la cabecera).
3. Si nada relevante cambió → **HTTP 304 sin cuerpo**: conservar la lista anterior. Si cambió → 200 con datos y `etag` nuevo.
- El ETag ignora lo que cambia a cada rato sin importar (el `desde` de la presencia; la hora del latido de las salas no se envía).
- Tras un error o reinicio de la app, sondear sin `If-None-Match`.
- **Coste (importante):** un 304 sigue siendo UNA llamada a la función (cuenta para la cuota del plan FREE: 500 k llamadas/mes en total), solo que sin cuerpo. Por host: salas cada 25 s + amigos cada 30 s + presencia cada 60 s ≈ 7 800 llamadas/día si la app está abierta todo el día.
  | Escenario (10 hosts) | Llamadas/mes | ¿Cabe en FREE con el latido (~216 k)? |
  |---|---|---|
  | App abierta 24 h | ≈ 2,3 M | No |
  | App abierta 6 h/día | ≈ 580 k | No |
  | 6 h/día y sondeo **solo con la ventana visible** (≈ ⅓ del tiempo) | ≈ 195 k | Sí (≈ 410 k en total) |
  Regla para la app: **sondear salas y amigos solo con la ventana de Phoenix Soda visible** (minimizada = pausa; al volver, sondeo inmediato). Si aun así aprieta, el staff sube `sondeo_salas_seg` / `sondeo_amigos_seg` desde `phoenix_config` sin recompilar.

## 22. Abrir sala → «Retos en el radar» y «Salas en vivo» (1.5.0 · migración 067)

### Qué envía la app al abrir (`POST /v1/sala/abrir`)
| Campo | Tipo | Por defecto | Nota |
|---|---|---|---|
| `visibilidad` | `publica` · `amigos` · `privada` | `amigos` | |
| `acepta_espectadores` | bool | `true` | **nuevo**. `false` = nunca sale en «Salas en vivo» |
| `limite_espectadores` | 0–16 | 4 | 0 equivale a no aceptar espectadores |
| `modo` | `amistoso` · `torneo_privado` · `oficial` | `amistoso` | solo `amistoso` sin `reto_id` aparece en el radar |
| `juego`, `parche`, `region` | texto | — | se muestran en las tarjetas |

### Dónde aparece la sala en la web
| Condición | «Retos en el radar» (Duelos) | «Salas en vivo» |
|---|---|---|
| `publica` · amistosa · sin reto · **sin rival** · estado `abierta` | ✅ con botón **Aceptar** | si acepta espectadores |
| Ya tiene rival, o estado `en_partida` | ❌ sale del radar | ✅ si acepta espectadores |
| `amigos` | lo mismo, pero **solo la ven los amigos del host** | ídem |
| `privada` | ❌ nunca | ❌ nunca (solo entran invitados o roles del reto) |
| `cerrar`, o **sin latido 3 min** (pasa a `caida`) | ❌ | ❌ |

Las listas también descartan salas con latido de más de 3 min aunque el cron aún no las haya marcado.

### Aceptar y Ver (los hace la web, no la app)
- **Aceptar** (radar): el usuario queda en `salas.rival` y es el **jugador 2 (mando 2)**. Si dos aceptan a la vez, gana el primero; el segundo ve «Alguien aceptó antes que tú». El host recibe el aviso «Tienes rival».
- **Ver** (en vivo): el usuario queda registrado como **espectador** (respetando `limite_espectadores`) y recibe el enlace.
- **El enlace solo se entrega a quien tiene rol**: host, rival, espectador registrado, invitado (§20), jugador o espectador aprobado del reto, staff o miembro de la organización. Quien solo «ve» la tarjeta no puede leerlo directamente: tiene que pasar por Aceptar o Ver, y así **siempre queda en la lista de roles**.
- Si alguien entra por Parsec sin estar en la lista, la puerta de mandos lo trata como espectador (no juega). La lista sirve para ponerle nombre y reservar el mando 2.

### Lista de roles que descarga la app
Llega en la respuesta de `sala/abrir` y en **cada** `sala/latido` (así la app se entera en ≤ 30 s de que alguien aceptó o entró a mirar):
```json
"roles": {
  "modo": "sala",
  "jugadores": [
    { "usuario_id": "…host…",  "nombre": "Kaiser", "parsec_id": "1234567", "lado": "A", "mando": 1 },
    { "usuario_id": "…rival…", "nombre": "Mirko",  "parsec_id": "7654321", "lado": "B", "mando": 2 }
  ],
  "espectadores": [
    { "usuario_id": "…", "nombre": "Lucho", "parsec_id": "5550001", "rol": "espectador", "pad_limit": 0 }
  ]
},
"roles_etag": "W/\"9f2c…\""
```
- Sin rival todavía: `jugadores` trae solo al host.
- Sala con `reto_id`: `modo` = `"reto"` y los jugadores salen del reto (como antes); los espectadores que entraron con «Ver» se suman al final.
- `parsec_id` puede ser `null` si el usuario no vinculó Parsec: la app debe esperar a que entre y emparejarlo por nombre, o tratarlo como espectador.
- **`roles_etag`**: si no cambió desde el latido anterior, la app puede saltarse reaplicar la lista.

### `POST /v1/sala/soltar_rival` (token) — el host libera el puesto de rival
Cuerpo `{ "sala_id": "uuid" }`. Quita al rival; si la sala sigue `abierta`, **vuelve a aparecer en el radar**. Respuesta: `{ ok, roles, roles_etag }`. Errores: `SALA_NO_ENCONTRADA`, `SALA_CERRADA`. (Desde la web, el propio rival puede bajarse con «Dejar sala».)

### Lo que la app debe hacer
1. Enviar `acepta_espectadores` y `limite_espectadores` al abrir.
2. Mandar `estado: "en_partida"` en el latido al empezar el partido (así sale del radar).
3. Aplicar `roles` de cada latido: reservar el mando 2 al `parsec_id` del rival y `pad_limit 0` a los espectadores.
4. Cerrar la sala con `sala/cerrar` al terminar (si no, desaparece sola a los 3 min sin latido).

## 23. `POST /v1/perfiles` (token) — tarjetas de jugador por parsec_id (1.6.0 · migración 073)
Para que la app muestre nombre, avatar y carta de quien está en la sala. Mismo token y cabeceras que `sala/latido`.

**Cuerpo:** `{ "parsec_ids": [123456, 789012] }` — números o textos de dígitos, **máx. 16**; los repetidos se ignoran.

**Respuesta 200:**
```json
{ "ok": true, "perfiles": [
  { "parsec_id": 123456, "usuario_id": "uuid", "nombre": "Mirko", "avatar_url": "https://…", "actualizado": "2026-10-07T07:00:00Z",
    "carta": { "media": 87, "posicion": "DC", "club": "Galaxy FC", "escudo_url": null, "rareza": "oro", "pais": "PE",
               "apodo": "El Mago", "foto_url": "https://…", "pie": "Derecho",
               "stats": { "rit": 90, "tir": 85, "pas": 80, "reg": 88, "def": 40, "fis": 75 } } }
] }
```
- Los `parsec_id` **sin cuenta vinculada no aparecen**. Se usa el mismo `parsec_id` de `cuentas_parsec` que va en los roles.
- `carta` es `null` si el usuario no tiene ficha en «Jugadores». Si tiene varias, se usa la de mayor media.
- **Origen de cada campo** (tabla `jugadores`): `media` = `ovr`; `stats` = `pac`→`rit`, `sho`→`tir`, `pas`→`pas`, `dri`→`reg`, `def`→`def`, `phy`→`fis`. `pais` sale del perfil (`pais_codigo`).
- **`rareza` se calcula** porque no existe en la base: `leyenda` ≥ 90, `oro` ≥ 75, `plata` ≥ 65, si no `bronce`.
- **`escudo_url` siempre es `null` por ahora**: los clubes son texto libre y no tienen escudo guardado.
- `avatar_url` es la URL pública del perfil (puede ser de Discord, Google o Storage público). No se redimensiona: la app debe escalarla.
- `actualizado` es la fecha más reciente entre la creación del perfil y la de la ficha (no hay marca de edición en `perfiles`).
- **Campos extra** que también existen en la ficha y no se envían (dímelo si los quieres): `descripcion`, `biografia`, `altura_cm`, `peso_kg`, `estilo_juego`, `ciudad`, `redes` y las stats detalladas `atq, fin, pot, efe, cor, cre, pre, pos, ant, men`.

**Errores:** `401` (`TOKEN_FALTANTE` / `TOKEN_INVALIDO` / `TOKEN_REVOCADO`), `422 CAMPO_INVALIDO` (no es lista, más de 16 o un id no numérico), `429 DEMASIADOS_INTENTOS` si se llama más de **1 vez cada 5 s** por PC (`retry-after` indica cuánto esperar).

## §24 · version_liga en latidos (aditivo)
Las respuestas de `POST /v1/presencia` y `POST /v1/sala/latido` incluyen `version_liga` (entero o `null` si no se pudo leer): versión actual de la Liga Máster de la Galaxy League. Si es mayor que la última que la PC aplicó, pedir `GET /mercado/v1/liga/cambios?desde=<última>` (ver docs/mercado-api.md). Ningún otro campo cambió.

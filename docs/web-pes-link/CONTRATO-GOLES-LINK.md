# Contrato · Goles automáticos de Phoenix Link en los duelos (web ↔ Link)

> Función nueva 5/8 (25-oct-2026, Cuenta 2). Base: migración **148** (`supabase/migrations/148_goleadores_link.sql`)
> y Edge Function **`goles`** (`supabase/functions/goles/index.ts`). **Estado: escrito, SIN APLICAR NI DESPLEGAR** — falta que
> Fralex pegue la 148 y despliegue `goles` con `verify_jwt = false`. Mientras tanto, la web oculta la sección sola.
> La parte de Link (leer los goles del juego y llamar a esta ruta) la hace la cuenta que tenga el candado de Link.

## Qué hace
Al terminar un **duelo** jugado en una sala de Phoenix Link (`salas.reto_id` = ese duelo), Link manda la lista de goles.
La web arma **«Goleadores de los duelos»** en `/ranking/` (goles y asistencias por futbolista, últimos 30 días o siempre).

## Ruta
`POST https://fiibiyijojkxqlsrhcil.supabase.co/functions/v1/goles/v1/goles/duelo`
Cabecera: `Authorization: Bearer phx_…` (el mismo token de la PC que usan «phoenix», «liga» y «torneos»).

```json
{
  "reto_id": 123,
  "completo": true,
  "version_link": "7.1.0",
  "goles": [
    { "lado": "A", "goleador": "L. Messi", "minuto": 12, "asistente": "Di María" },
    { "lado": "B", "goleador": "H. Kane", "minuto": 55, "tipo": "penal" },
    { "lado": "A", "goleador": "R. Dias", "minuto": 80, "tipo": "en_contra" }
  ]
}
```

| Campo | Regla |
|---|---|
| `lado` | `A` = retador y su equipo, `B` = rival. Es a quién se le **anota** el gol (en un autogol, al rival del que lo hizo). |
| `goleador` / `asistente` | 1–60 caracteres, sin `<` ni `>`. Espacios de más se limpian. Asistente solo en `tipo: "gol"`. |
| `minuto` | entero 0–130. |
| `tipo` | `gol` (por defecto), `penal` o `en_contra`. Los autogoles no suman al goleador. |
| `completo` | debe ser `true` (el juego confirmó que el partido llegó al final). |
| máx. | 40 goles. Cuerpo máx. 32 KB. 10 envíos por minuto por PC. |

Respuesta OK: `{ ok: true, guardados, cuadra, marcador_confirmado, solicitud_id }`.
**Reenviar es seguro:** reemplaza los goles anteriores de ese duelo.

## Cuándo cuentan
Solo si el marcador del duelo está **CONFIRMADO** por los dos líderes **y** los goles por lado coinciden con ese marcador.
Si Link manda antes de que confirmen, se guardan y empiezan a contar solos cuando el marcador se confirme y cuadre.
`cuadra: false` no es error: significa que (todavía) no suman.

## Errores (`{ ok:false, codigo, mensaje, reintentable, campo? }`)
`TOKEN_FALTANTE` / `TOKEN_INVALIDO` / `TOKEN_REVOCADO` (401) · `DISPOSITIVO_SUSPENDIDO` / `HOST_NO_AUTORIZADO` (403) ·
`DUELO_NO_ES_DE_ESTA_SALA` (403: el duelo no se jugó en una sala de esta PC en las últimas 12 h) · `DUELO_NO_ENCONTRADO` (404) ·
`DUELO_NO_JUGADO` / `PARTIDO_INCOMPLETO` (409) · `CAMPO_INVALIDO` / `JSON_INVALIDO` (400, con `campo`) ·
`DEMASIADOS_INTENTOS` (429, `retry-after`) · `GOLES_PAUSADOS` (503: el staff puso `phoenix_config.goles_link = false`) · `ERROR_INTERNO` (500).
Reintentar solo si `reintentable: true`.

## Para la web
Lectura con sesión: `goleadores_comunidad(p_dias, p_limite)` y `goles_de_duelo(p_reto)` (jugadores, host, espectadores aprobados, staff).
Lógica pura y validación espejo: `src/js/core/competicion/goleadoresLink.js` (+ `tests/goleadoresLink.test.mjs`).

# Contrato Web ↔ Phoenix Link · Resultados automáticos en TORNEOS (v1 · migración 145)

> Escrito el 25-oct-2026 por la **Cuenta 2**, a pedido de Fralex («no solo las ligas serán premium, también torneos oficiales, campeonatos rápidos…» → camino B).
> **Para quien tenga el candado de Phoenix Link** (hoy la Cuenta 1, rama `plan-ux`). La parte web y de base de datos (fases 1 y 2) ya está hecha.
> Mientras Link no use esto, **nada cambia para nadie**: los torneos se siguen anotando a mano.

## 0. En una frase

Igual que `/v1/liga/partidos` + `/v1/liga/resultado` para la Liga oficial, pero para los torneos de `/torneos/` que son **premium** (pagaron con gemas) u **oficiales** (los aprobó el staff). Función nueva y aparte: **`torneos`**. La función `liga` **no cambia**.

## 1. Conexión

- Base: `https://fiibiyijojkxqlsrhcil.supabase.co/functions/v1/torneos/v1/…`
- Mismo token que ya usa Link: `Authorization: Bearer phx_…` (dispositivo vinculado de un host aprobado o staff).
- Respuestas: `{ "ok": true, …, "solicitud_id": "…" }` o `{ "ok": false, "codigo": "…", "mensaje": "…", "reintentable": bool, "reintentar_en"?: s }`.
- Límites: 60 peticiones/min por PC; `resultado` 10/min por PC.
- Interruptor del staff: `phoenix_config.torneos_resultados = false` → `TORNEOS_PAUSADOS` (503, reintentable).

## 2. `GET /v1/torneos/partidos`

Partidos por jugar de los torneos **en curso** con permiso automático y formato soportado.

```json
{ "ok": true, "partidos": [
  { "torneo_id": 12, "torneo": "Copa Relámpago", "formato": "eliminacion", "permiso": "premium",
    "clave": "r1-2", "ronda": "Cuartos", "grupo": null, "orden": 2, "eliminatoria": true, "estado": "pendiente",
    "a": { "nombre": "Ana", "parsec": ["123456"], "mio": false },
    "b": { "nombre": "Beto", "parsec": [], "mio": true } }
] }
```

- `estado`: `pendiente` (sin propuesta) · `propuesto` · `disputa` (ya llegó un marcador; si mandas otro distinto pasa a disputa).
- `parsec`: ids de Parsec declarados por la cuenta de ese jugador (puede venir vacío si el jugador no tiene cuenta o no declaró Parsec).
- `mio`: ese lado es la cuenta dueña de esta PC.
- Formatos soportados: `eliminacion`, `doble`, `liguilla`, `idavuelta`, `grupos`, `suizo`. (`colina`, `escalera`, `circuito`, `libre`: todavía no.)

**Cómo elegir el partido de la sala (recomendado, igual que con la liga):**
1. Cruza los Parsec conectados a la sala con `a.parsec` / `b.parsec`. Si un único partido coincide con los dos lados (o con uno y el otro es `mio`), es ese.
2. Si hay varios o ninguno, que el host lo elija en la interfaz de Link de la lista (mostrar `torneo · ronda · A vs B`).
3. Recuerda cuál quedó elegido para esa sala hasta que llegue el final del partido.

## 3. `POST /v1/torneos/resultado`

```json
{ "torneo_id": 12, "clave": "r1-2", "goles_a": 1, "goles_b": 1, "completo": true,
  "juego": { "pk_a": 4, "pk_b": 3, "nombre_a": "Real Madrid", "nombre_b": "Barcelona" },
  "sala_id": "uuid-de-la-sala-o-null", "version_link": "0.3.50" }
```

- **`goles_a` es del lado `a`** del partido (el de la lista), no necesariamente del equipo local del juego: Link debe traducir local/visitante a a/b según quién jugó con qué mando.
- `completo: true` solo si el juego llegó al final (si no → `PARTIDO_INCOMPLETO`).
- `juego.pk_a` / `pk_b`: penales, si los hubo. En una eliminatoria empatada definen quién pasa; si no vienen, decide quien confirma.
- Respuesta: `{ "ok": true, "estado": "propuesto" | "disputa", "repetido": bool }`. Mandar dos veces lo mismo es seguro (`repetido: true`).
- **Nunca confirma el host.** Queda «por confirmar» en la web: en un torneo **premium** lo confirma el organizador; en uno **oficial**, el staff. Les llega un aviso en la campana.

## 4. Errores que puede devolver

| Código | HTTP | Qué hacer en Link |
|---|---|---|
| `TOKEN_FALTANTE` / `TOKEN_INVALIDO` / `TOKEN_REVOCADO` | 401 | Pedir volver a vincular |
| `DISPOSITIVO_SUSPENDIDO` / `HOST_NO_AUTORIZADO` | 403 | Avisar al host; no reintentar |
| `TORNEOS_PAUSADOS` | 503 | Reintentar más tarde |
| `TORNEO_SIN_PERMISO` | 403 | El torneo dejó de ser premium/oficial: avisar «anótalo a mano en la web» |
| `FORMATO_NO_SOPORTADO`, `TORNEO_NO_EN_CURSO`, `CRUCE_SIN_DEFINIR`, `YA_JUGADO` | 409 | No reintentar; refrescar la lista |
| `PARTIDO_NO_ENCONTRADO`, `TORNEO_NO_ENCONTRADO` | 404 | Refrescar la lista |
| `CAMPO_INVALIDO`, `MARCADOR_INVALIDO`, `JSON_INVALIDO` | 400 | Error de Link: registrar y no reintentar |
| `PARTIDO_INCOMPLETO` | 409 | No mandar hasta el final |
| `DEMASIADOS_INTENTOS` | 429 | Esperar `reintentar_en` s |

## 5. Lo que ya está hecho (no tocar sin avisar)

- Base (`supabase/migrations/145_torneos_resultados_link.sql`): `torneo_resultados_link` (propuestas), `torneo_resultados_auto` (oficiales), `sistema_torneo_partidos_link`, `sistema_torneo_resultado_link` (solo `service_role`), `torneo_resultado_link_resolver` (web). Prueba: `supabase/tests/145_torneos_resultados_link_test.sql`.
- Función `supabase/functions/torneos/index.ts` (desplegar con `verify_jwt = false`).
- Web: `/torneo/?id=N` muestra «Link: 2 – 1 · por confirmar» en el partido y la caja «Resultados de Phoenix Link por confirmar» (`#res-link`).

## 6. Cómo probar de punta a punta (cuando Link lo tenga)

1. En la web, crea un torneo de **eliminación** con 2 jugadores, hazlo **premium** (o que el staff lo haga oficial) y empiézalo.
2. En Link: `GET /v1/torneos/partidos` debe traer el partido.
3. Juega el partido en PES por Parsec; al final Link manda `POST /v1/torneos/resultado`.
4. En la web, el organizador (o el staff) ve el aviso → «Confirmar» → el cuadro avanza.

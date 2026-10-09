# Reglas del ecosistema Phoenix Evolution (leer ANTES de tocar nada)

Aplica a todos los chats/agentes: web+base de datos, Phoenix Link, Phoenix Mercado.
Principio del dueño: **«Si algo se rompe o deja de funcionar por un cambio, mejor no lo hagas.»**

## 1. Quién es dueño de qué
| Pieza | Dueño | Fuente de verdad |
|---|---|---|
| Web (Astro) y base de datos (Supabase: tablas, RPC, RLS, Edge Functions) | chat «Pagina WEB» | `supabase/migrations/`, este repo |
| Phoenix Link (C++, salas, host) | chat de Smash Soda / Phoenix Link | `docs/contrato-v1.md` |
| Phoenix Mercado (option file, Liga Máster en el juego) | chat de Mercado (se integrará a Phoenix Link) | `docs/mercado-api.md` |

Un chat que no es dueño **no cambia** la pieza: entrega un prompt al dueño.

## 2. Contratos (no romperlos)
- Un endpoint, campo o código de error publicado **no se borra ni cambia de significado**. Solo se añaden campos opcionales.
- Si un cambio rompe compatibilidad: nueva versión (`/v2/...`), la vieja sigue viva hasta que el programa se actualice.
- Todo cambio en un endpoint se anota en el contrato correspondiente **en el mismo commit**, con fecha.
- Los programas deben ignorar campos desconocidos (así la web puede añadir sin romperlos).

## 3. Base de datos
- Migraciones numeradas y solo hacia adelante (`0XX_nombre.sql`). Nunca editar una ya aplicada: se crea otra.
- Toda tabla con RLS. Escrituras solo por RPC `security definer` con validación en servidor. Funciones `sistema_*` solo service_role.
- Nunca confiar en valores del cliente para precio, dinero, XP, tokens, resultado, permisos o propiedad.
- Dinero del club: cada cambio de `lm_clubes.presupuesto` queda en `lm_club_libro` (automático por trigger). Una función nueva que mueva dinero debe fijar el motivo: `perform set_config('lm.motivo','<motivo>',true);`
- Tokens: `movimientos_tokens` con `clave` única (idempotente). XP: `xp_movimientos`.

## 4. Modelo de entidades (no duplicar)
- **Usuario** = `perfiles` (identidad única en todo el ecosistema).
- **Club de Liga Máster** = `lm_clubes` (entidad oficial de club). `equipos`/`transferencias` son del sistema antiguo de divisiones: vacíos, **no usar para nada nuevo**.
- **Futbolista del juego** = `lm_jugadores`. Ojo: la tabla `jugadores` son **personas de la comunidad** (fichas), no futbolistas.
- **Liga / Temporada** = `ligas` / `temporadas` (la tabla oficial vive en CopaFácil).

## 5. Antes de publicar
- Trabajo en rama `borrador`. A `main` solo cuando el dueño dice «Súbelo».
- Tests (`npm test`) y build deben pasar. Revisar que Central, Liga, Duelos y Mánager cargan.
- Un commit de otro chat que rompa algo se revierte primero y se discute después.

## 7. Protocolo de dos cuentas (A y B trabajan a la vez)
- Al empezar: `git fetch` + `git pull --rebase origin borrador` y leer el final de `REGISTRO.md`.
- Antes de usar un número de migración o de ronda: revisar el último en `REGISTRO.md`, `MAPA.md` y Supabase (`list_migrations` **y** existencia de tablas, porque lo pegado a mano no aparece en la lista). Escribir primero una línea «RESERVADO N» en `REGISTRO.md` y empujarla.
- Toda migración aplicada (por MCP o a mano) debe tener su archivo en `supabase/migrations/` en el mismo commit. Nada de cambios solo en la base.
- Después de cada cambio: UNA línea en `REGISTRO.md` (formato al inicio del archivo). Solo se añade; nunca se edita ni se borra.
- Si algo queda a medias, escribir exactamente en qué punto y qué falta.
- Si cambia el estado general, actualizar también RETOMAR en `MAPA.md`.

## 6. Registro de cambios importantes
Añadir aquí una línea por cambio que afecte a otra pieza:
- 2026-10-08 · `lm_club_libro` (088): historial del dinero de cada club. No cambia ningún endpoint.
- 2026-10-08 · `/mercado/v1/liga/cambios` (094): cada cambio añade `monto, sueldo, clausula, fin_contrato, dorsal` (opcionales, `null` si no hay dato). No cambia nada existente. Contrato en `docs/mercado-api.md`.
- 2026-10-08 · Equivalencias (089): `mercado_equivalencias(_clubes)` + `POST/GET /mercado/v1/equivalencias` (nuevos, no cambian nada existente). Contrato en `docs/mercado-api.md`.

# SQL pendiente para Fralex (25-oct-2026)

La web ya está lista para estas tres funciones, pero **la base todavía no las tiene** porque Supabase pidió permiso y se canceló.
Mientras falten, la web **no se rompe**: esas secciones se ocultan o dicen «llega muy pronto».

## Paso 1 · Pegar el SQL (2 minutos)
1. Abre Supabase → tu proyecto → **SQL Editor** → **New query**.
2. Copia y pega **todo** `docs/sql-pendiente/PEGAR-PENDIENTES.sql` → **Run**.
3. Debe decir *Success*. Es seguro correrlo dos veces.

| Migración | Qué activa |
|---|---|
| 145 | Resultados automáticos de Phoenix Link en torneos oficiales y premium |
| 148 | Goleadores automáticos de los duelos (sección en /ranking/) |
| 149 | Prode (página /prode/) |
| 152 | Avisos en la campana (te toca en el draft, vota al MVP, ganaste en el prode, retos de clan) y mensajes al canal de Discord |

## Paso 1b · Activar los mensajes a Discord (opcional, 1 minuto)
En Discord: canal → Editar canal → Integraciones → Webhooks → Nuevo webhook → Copiar URL. En Supabase → SQL Editor:
```
select vault.create_secret('PEGA_AQUI_LA_URL_DEL_WEBHOOK', 'discord_webhook');
```
Sin esto todo funciona igual; solo no se publica nada en Discord (resumen diario, eventos, draft, clan contra clan, prode semanal).

## Paso 2 · Comprobar (opcional, recomendado)
Pega y corre cada prueba: `supabase/tests/145_torneos_resultados_link_test.sql`, `148_goleadores_link_test.sql`, `149_prode_test.sql`.
Si sale el error **`TODO_OK_REVERTIDO`**, está todo bien (es a propósito: así no guarda nada).

## Paso 3 · Subir las Edge Functions (las «puertas» que usa Phoenix Link)
`torneos` y `goles`, las dos con **verify_jwt = false** (Link entra con el token de su PC, no con sesión):
```
supabase functions deploy torneos --no-verify-jwt
supabase functions deploy goles --no-verify-jwt
```
(o pídeselo a Claude en una sesión donde aceptes el permiso de Supabase).

## Ya aplicadas (no hay que hacer nada)
146 estado de hosts · 147 MVP · 150 clan contra clan · 151 draft en vivo.

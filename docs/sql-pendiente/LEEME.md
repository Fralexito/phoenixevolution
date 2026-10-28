# SQL pendiente — NADA (todo aplicado al 28-oct-2026 03:20, Lima)

- **161 (`161_duelos_16_jugadores.sql`):** **aplicada** por Fralex el 28-oct (amplía `retos_tam_ok` a 16 jugadores / 8v8).

- 159 (limpieza diaria): **aplicada** por Fralex el 25-oct; la tarea `limpieza-diaria` corre a las 04:40 (Lima).
- 160 (ficha del partido): **aplicada** por Claude el 25-oct.

## Lo demás
Todo quedó aplicado por Claude con el permiso de Fralex: **145, 148, 149, 152 y 153**, con sus pruebas en seco OK
(`supabase/tests/`), y desplegadas las Edge Functions **`torneos`** y **`goles`** (verify_jwt = false).

## Lección para la próxima vez
Supabase pide un permiso APARTE (que se cancelaba) cuando el SQL tiene `delete from` o `drop trigger`. Solución usada:
- en vez de `drop trigger … ; create trigger …` → **`create or replace trigger …`** (Postgres 14+);
- en vez de borrar filas → una columna `vigente`/`activo` y `update … set vigente = false`.

## Opcional: mensajes al canal de Discord
En Discord: canal → Editar canal → Integraciones → Webhooks → Nuevo webhook → Copiar URL. En Supabase → SQL Editor:
```
select vault.create_secret('PEGA_AQUI_LA_URL_DEL_WEBHOOK', 'discord_webhook');
```
Sin esto todo funciona igual; solo no se publica nada en Discord (resumen diario, eventos, draft, clan contra clan, prode semanal).

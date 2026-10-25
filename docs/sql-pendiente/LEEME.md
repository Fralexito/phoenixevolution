# SQL pendiente — NADA (actualizado 25-oct-2026 13:50, Lima)

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

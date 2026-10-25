# SQL pendiente — solo la 159 (actualizado 25-oct-2026 14:25, Lima)

## Pendiente: 159 · limpieza automática diaria
Supabase canceló el permiso (esta sí borra filas viejas). Para activarla: Supabase → **SQL Editor** → pegar todo
`supabase/migrations/159_limpieza_automatica.sql` → **Run**. Es seguro correrla dos veces.
Qué borra cada día: goles de Link reemplazados (>30 días), chat de duelos viejos (>90 días), chat y repeticiones ocultos (>180 días),
predicciones de duelos viejos (>180 días) y el registro de tareas programadas (>3 días; hoy es la tabla más grande, ~10 MB).
Nunca toca resultados, votos, ascuas ni dinero.

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

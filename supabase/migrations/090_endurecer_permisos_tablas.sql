-- 090 · Copia en el repo de la migración aplicada por MCP el 2026-10-08 como «088_endurecer_permisos_tablas» (otra cuenta).
-- Ya está aplicada en Supabase: NO volver a ejecutar (es inocua si se ejecuta).
revoke insert, update, delete, truncate, references, trigger on all tables in schema public from anon;
revoke truncate, references, trigger on all tables in schema public from authenticated;

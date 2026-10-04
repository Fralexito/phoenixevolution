-- 003b — Ajustes que se aplicaron DESPUÉS de 003 (ya están en tu Supabase; este archivo es solo el registro).
-- Es idempotente: si lo ejecutas de nuevo no rompe nada. Lee primero 003_duelos_v2.sql.

-- 1) Reto directo público/privado.
alter table public.retos_matchmaking add column if not exists directo_publico boolean not null default false;

-- 2) Quién ve qué (reemplaza la política de lectura de 003).
alter policy retos_select on public.retos_matchmaking using (
  (destinatario_id is null and not requiere_host)
  or (destinatario_id is not null and directo_publico)
  or retador_id = (select auth.uid()) or rival_id = (select auth.uid()) or destinatario_id = (select auth.uid())
  or (destinatario_id is null and requiere_host and private.puede_hostear((select auth.uid())))
  or private.es_admin()
);

-- 3) Visitantes sin sesión pueden evaluar la política de lectura (si no, "permission denied for function es_admin").
grant usage on schema private to anon;
grant execute on function private.es_admin() to anon;
grant execute on function private.es_comisario() to anon;

-- 4) Endurecimiento: el cliente no necesita estos permisos por defecto de Supabase.
revoke truncate, references, trigger on public.retos_matchmaking, public.retos_conexion, public.notificaciones from anon, authenticated;
revoke delete on public.retos_matchmaking from authenticated;

-- 5) Políticas antiguas: quedaron inertes (condición false). Si quieres borrarlas del todo, ejecútalo TÚ en el SQL Editor:
--    drop policy if exists retos_update_retador on public.retos_matchmaking;
--    drop policy if exists conexion_insert_retador on public.retos_conexion;
--    drop policy if exists conexion_update_retador on public.retos_conexion;

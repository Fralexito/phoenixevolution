-- 020 · Juegos EXTRA que un host puede ofrecer (eFootball, FIFA), con versión y parche/mod. Mínimo y opcional:
-- los principales siguen siendo PES 2021 y SP Football Life (columnas host_juego / host_parche / host_sp_version, sin cambios).
-- Formato: [{"juego":"eFootball","version":"2025","mod":"..."}] (máx. 2 entradas, ≤ 400 caracteres en total, sin < ni >).
alter table public.perfiles add column if not exists host_extras jsonb not null default '[]'::jsonb;

do $$ begin
  if not exists (select 1 from pg_constraint where conname = 'perfiles_host_extras_ok') then
    alter table public.perfiles add constraint perfiles_host_extras_ok check (
      jsonb_typeof(host_extras) = 'array' and jsonb_array_length(host_extras) <= 2
      and char_length(host_extras::text) <= 400 and host_extras::text !~ '[<>]');
  end if;
end $$;

-- Los permisos de `perfiles` son por columna: la nueva necesita su grant explícito.
grant select (host_extras) on public.perfiles to anon, authenticated;
grant update (host_extras) on public.perfiles to authenticated;

-- 007 · Sistema Host: juego sin año fijo, versión opcional de SP Football Life y nota libre.
-- · host_juego: 'PES 2021' | 'SP Football Life' (antes 'SP Football Life 2026').
-- · host_sp_version: año opcional de SP Football Life ('25', '26', '27' o texto libre ≤ 20).
-- · host_notas: aclaración opcional sobre el host (≤ 300).
alter table public.perfiles
  add column if not exists host_sp_version text,
  add column if not exists host_notas text;

alter table public.perfiles drop constraint if exists perfiles_host_juego_ok;
-- Quien ya tenía «SP Football Life 2026» conserva esa información como versión «26».
update public.perfiles set host_juego = 'SP Football Life', host_sp_version = '26' where host_juego = 'SP Football Life 2026';

alter table public.perfiles
  add constraint perfiles_host_juego_ok check (host_juego in ('PES 2021', 'SP Football Life')),
  add constraint perfiles_sp_version_ok check (host_sp_version is null or (char_length(host_sp_version) between 1 and 20 and host_sp_version !~ '[<>]')),
  add constraint perfiles_host_notas_ok check (host_notas is null or (char_length(host_notas) <= 300 and host_notas !~ '[<>]'));

-- Los permisos de `perfiles` son por columna: las nuevas necesitan su grant explícito.
grant select (host_sp_version, host_notas) on public.perfiles to anon, authenticated;
grant update (host_sp_version, host_notas) on public.perfiles to authenticated;

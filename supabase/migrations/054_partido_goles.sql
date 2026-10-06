-- Detalle de cada partido: goles con minuto, goleador y asistente. Lectura pública; escriben moderadores y admin (mismo patrón que partido_destacado).
-- `lado` = a quién se le ANOTA el gol en el marcador ('l' local, 'v' visitante); en un autogol el goleador es del rival pero el gol suma a `lado`.
-- Se identifica el partido con (liga, edicion, fecha, local, visitante) porque las ediciones se llaman igual en ligas distintas.
create table if not exists public.partido_goles (
  id bigint generated always as identity primary key,
  liga text not null check (char_length(liga) between 1 and 40 and liga !~ '[<>]'),
  edicion text not null check (char_length(edicion) between 1 and 60 and edicion !~ '[<>]'),
  fecha smallint not null check (fecha between 1 and 99),
  local text not null check (char_length(local) between 1 and 60 and local !~ '[<>]'),
  visitante text not null check (char_length(visitante) between 1 and 60 and visitante !~ '[<>]'),
  lado text not null check (lado in ('l', 'v')),
  goleador text not null check (char_length(goleador) between 1 and 60 and goleador !~ '[<>]'),
  minuto smallint not null check (minuto between 0 and 130),
  asistente text check (asistente is null or (char_length(asistente) between 1 and 60 and asistente !~ '[<>]')),
  tipo text not null default 'gol' check (tipo in ('gol', 'penal', 'en_contra')),
  created_at timestamptz not null default now(),
  check (asistente is null or tipo = 'gol')
);
create index if not exists partido_goles_partido_idx on public.partido_goles (liga, edicion, fecha, local, visitante);
alter table public.partido_goles enable row level security;
create policy partido_goles_lectura on public.partido_goles for select to anon, authenticated using (true);
create policy partido_goles_escritura on public.partido_goles for all to authenticated using (private.es_moderador()) with check (private.es_moderador());
grant select on public.partido_goles to anon, authenticated;
grant insert, update, delete on public.partido_goles to authenticated;

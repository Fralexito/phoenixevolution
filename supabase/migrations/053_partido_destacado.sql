-- Partido destacado por fecha, elegido a mano (si no hay fila, la web calcula uno automático). Lectura pública; escriben moderadores y admin.
create table if not exists public.partido_destacado (
  edicion text not null check (char_length(edicion) between 1 and 60 and edicion !~ '[<>]'),
  fecha smallint not null check (fecha between 1 and 99),
  local text not null check (char_length(local) between 1 and 60 and local !~ '[<>]'),
  visitante text not null check (char_length(visitante) between 1 and 60 and visitante !~ '[<>]'),
  nota text check (nota is null or (char_length(nota) <= 140 and nota !~ '[<>]')),
  updated_at timestamptz not null default now(),
  primary key (edicion, fecha)
);
alter table public.partido_destacado enable row level security;
create policy partido_destacado_lectura on public.partido_destacado for select to anon, authenticated using (true);
create policy partido_destacado_escritura on public.partido_destacado for all to authenticated using (private.es_moderador()) with check (private.es_moderador());
grant select on public.partido_destacado to anon, authenticated;
grant insert, update, delete on public.partido_destacado to authenticated;

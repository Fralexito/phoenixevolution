-- Historial de participación del jugador en ligas anteriores: club, puesto final, título y premios. Lectura pública; escribe solo el admin.
create table if not exists public.participaciones (
  id uuid primary key default gen_random_uuid(),
  jugador_id uuid not null references public.jugadores(id) on delete cascade,
  liga text not null check (char_length(liga) between 1 and 60 and liga !~ '[<>]'),
  edicion text not null check (char_length(edicion) between 1 and 60 and edicion !~ '[<>]'),
  periodo date,                                                              -- inicio aproximado (solo para ordenar)
  club text check (club is null or (char_length(club) between 1 and 60 and club !~ '[<>]')),
  puesto smallint check (puesto is null or puesto between 1 and 99),
  titulo text check (titulo is null or (char_length(titulo) between 1 and 60 and titulo !~ '[<>]')),   -- p. ej. «Campeón», «Subcampeón»
  premios text check (premios is null or (char_length(premios) <= 300 and premios !~ '[<>]')),        -- uno por línea
  created_at timestamptz not null default now()
);
create index if not exists participaciones_jugador_idx on public.participaciones (jugador_id, periodo desc);
alter table public.participaciones enable row level security;
create policy participaciones_lectura on public.participaciones for select to anon, authenticated using (true);
create policy participaciones_admin_escritura on public.participaciones for all to authenticated using (private.es_admin()) with check (private.es_admin());
grant select on public.participaciones to anon, authenticated;
grant insert, update, delete on public.participaciones to authenticated;

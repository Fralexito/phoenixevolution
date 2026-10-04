-- «Jugador de la semana»: un voto por usuario y por semana (semana = lunes, hora de Lima). El conteo es público; quién votó, no.
create table if not exists public.votos_semana (
  id uuid primary key default gen_random_uuid(),
  semana date not null,
  jugador_id uuid not null references public.jugadores(id) on delete cascade,
  votante_id uuid not null default auth.uid() references auth.users(id) on delete cascade,
  created_at timestamptz not null default now(),
  constraint votos_semana_unico unique (semana, votante_id)
);
create index if not exists votos_semana_semana_idx on public.votos_semana (semana, jugador_id);
alter table public.votos_semana enable row level security;
-- Cada quien ve solo SUS votos (el conteo público sale por la función de abajo).
create policy votos_propios_lectura on public.votos_semana for select to authenticated using (votante_id = (select auth.uid()));
-- Solo se puede votar en la semana actual y a nombre propio.
create policy votos_propios_insertar on public.votos_semana for insert to authenticated
  with check (votante_id = (select auth.uid()) and semana = (date_trunc('week', now() at time zone 'America/Lima'))::date);
create policy votos_propios_borrar on public.votos_semana for delete to authenticated
  using (votante_id = (select auth.uid()) and semana = (date_trunc('week', now() at time zone 'America/Lima'))::date);
grant select, insert, delete on public.votos_semana to authenticated;
-- Conteo público por semana (no revela votantes).
create or replace function public.conteo_votos_semana(p_semana date)
returns table (jugador_id uuid, votos bigint) language sql stable security definer set search_path = '' as $$
  select v.jugador_id, count(*)::bigint from public.votos_semana v where v.semana = p_semana group by v.jugador_id order by 2 desc limit 10;
$$;
revoke all on function public.conteo_votos_semana(date) from public;
grant execute on function public.conteo_votos_semana(date) to anon, authenticated;

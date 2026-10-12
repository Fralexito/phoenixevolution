-- Ronda 237 (chat LINK): quién está mirando un partido en vivo DESDE LA WEB (tablero del campo 2D en «En vivo»).
-- La web (usuario con sesión) avisa cada ~30 s mientras tiene el tablero abierto; Phoenix Link lo lee por la Edge Function «liga»
-- (GET /v1/liga/mirando) y lo enseña en la sala («{nombre} está viendo desde la web»). Los visitantes sin sesión no se registran.
-- El nombre lo pone el servidor desde el perfil (no se puede falsear) y «visto» siempre es la hora del servidor.
create table if not exists public.liga_mirando (
  sala_id uuid not null references public.salas (id) on delete cascade,
  usuario uuid not null references public.perfiles (id) on delete cascade,
  nombre text not null default '',
  visto timestamptz not null default now(),
  primary key (sala_id, usuario)
);
create index if not exists liga_mirando_visto_idx on public.liga_mirando (visto);

create or replace function private.liga_mirando_fijar() returns trigger
language plpgsql security definer set search_path = '' as $$
begin
  new.nombre := left(coalesce((select p.nombre_display from public.perfiles p where p.id = new.usuario), 'Jugador'), 40);
  new.visto := now();
  return new;
end
$$;
revoke all on function private.liga_mirando_fijar() from public, anon, authenticated;
drop trigger if exists liga_mirando_fijar_t on public.liga_mirando;
create trigger liga_mirando_fijar_t before insert or update on public.liga_mirando
  for each row execute function private.liga_mirando_fijar();

alter table public.liga_mirando enable row level security;
drop policy if exists liga_mirando_propio_leer on public.liga_mirando;
create policy liga_mirando_propio_leer on public.liga_mirando for select to authenticated using (usuario = (select auth.uid()));
drop policy if exists liga_mirando_propio_alta on public.liga_mirando;
create policy liga_mirando_propio_alta on public.liga_mirando for insert to authenticated
  with check (usuario = (select auth.uid()) and exists (select 1 from public.liga_vivo v where v.sala_id = liga_mirando.sala_id));
drop policy if exists liga_mirando_propio_cambiar on public.liga_mirando;
create policy liga_mirando_propio_cambiar on public.liga_mirando for update to authenticated
  using (usuario = (select auth.uid())) with check (usuario = (select auth.uid()));
drop policy if exists liga_mirando_propio_borrar on public.liga_mirando;
create policy liga_mirando_propio_borrar on public.liga_mirando for delete to authenticated using (usuario = (select auth.uid()));
grant select, insert, update, delete on public.liga_mirando to authenticated;

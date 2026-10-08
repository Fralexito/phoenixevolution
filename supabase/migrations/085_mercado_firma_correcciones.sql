-- 085 · Firma Ed25519 de la lista oficial de plantillas + correcciones automáticas de Mercado + envíos atrasados.
--
-- Clave de firma: la genera la propia Edge Function «mercado» la primera vez (WebCrypto Ed25519) y la guarda aquí.
-- La privada vive SOLO en el servidor (esquema private, sin acceso de anon/authenticated; se lee por una función
-- reservada a service_role). Phoenix Mercado lleva la pública (GET /v1/clave-publica) incrustada.
create table if not exists private.mercado_claves (
  id text primary key,                       -- huella corta de la pública (p. ej. «k1a2b3c4d»)
  privada_pkcs8 text not null,               -- base64
  publica_raw text not null,                 -- base64 (32 bytes)
  activa boolean not null default true,
  created_at timestamptz not null default now()
);
create unique index if not exists mercado_claves_una_activa on private.mercado_claves (activa) where activa;
revoke all on private.mercado_claves from public, anon, authenticated;

create or replace function public.sistema_mercado_clave() returns jsonb
language sql stable security definer set search_path = private as $$
  select jsonb_build_object('id', id, 'privada', privada_pkcs8, 'publica', publica_raw) from private.mercado_claves where activa limit 1;
$$;
create or replace function public.sistema_mercado_guardar_clave(p_id text, p_privada text, p_publica text) returns jsonb
language plpgsql security definer set search_path = private as $$
begin
  -- si otra instancia ya creó una, se usa esa (evita dos claves activas)
  if exists (select 1 from private.mercado_claves where activa) then return public.sistema_mercado_clave(); end if;
  insert into private.mercado_claves (id, privada_pkcs8, publica_raw) values (p_id, p_privada, p_publica);
  return public.sistema_mercado_clave();
end $$;
create or replace function public.mercado_clave_publica() returns jsonb
language sql stable security definer set search_path = private as $$
  select jsonb_build_object('clave_id', id, 'algoritmo', 'Ed25519', 'publica', publica_raw) from private.mercado_claves where activa limit 1;
$$;
revoke all on function public.sistema_mercado_clave() from public, anon, authenticated;
revoke all on function public.sistema_mercado_guardar_clave(text, text, text) from public, anon, authenticated;
grant execute on function public.sistema_mercado_clave() to service_role;
grant execute on function public.sistema_mercado_guardar_clave(text, text, text) to service_role;
grant execute on function public.mercado_clave_publica() to anon, authenticated, service_role;

-- Lista oficial de plantillas (lo que se firma): clubes con pes_team_id y sus jugadores (phoenix_id + pes_id).
create or replace function public.lm_plantillas(p_liga text) returns jsonb
language sql stable security definer set search_path = public as $$
  select coalesce(jsonb_agg(jsonb_build_object('clave', clave, 'pes_team_id', pes_team_id, 'club', nombre, 'jugadores', jugadores) order by clave collate "C"), '[]'::jsonb)
  from (
    select coalesce(c.pes_team_id::text, 'c' || c.id) as clave, c.pes_team_id, c.nombre,
           jsonb_agg(jsonb_build_object('phoenix_id', j.id, 'pes_id', j.pes_id) order by j.id) as jugadores
    from lm_jugadores j join lm_clubes c on c.id = j.club_id
    where j.liga = p_liga group by c.id, c.pes_team_id, c.nombre
  ) x;
$$;
grant execute on function public.lm_plantillas(text) to service_role, authenticated;

-- Correcciones automáticas que hace Mercado (cuando el option file local no coincide con la lista firmada).
create table if not exists public.mercado_correcciones (
  id bigserial primary key,
  usuario uuid not null references auth.users(id) on delete cascade,
  origen text not null default 'manager' check (origen in ('manager', 'link')),
  dispositivo uuid,                                         -- mercado_dispositivos.id o dispositivos_host.id según origen
  id_cliente uuid not null,                                 -- lo genera Mercado: reenviar es seguro (no duplica)
  liga text not null default 'galaxy',
  phoenix_id bigint, pes_id int,
  jugador text check (char_length(jugador) <= 80),
  cambio jsonb not null check (jsonb_typeof(cambio) = 'object' and pg_column_size(cambio) <= 2000),   -- p. ej. {campo:"equipo", de:101, a:202}
  huella_antes text check (huella_antes ~ '^[0-9a-f]{64}$'),
  huella_despues text check (huella_despues ~ '^[0-9a-f]{64}$'),
  hora_local text check (char_length(hora_local) <= 40),     -- tal cual la PC (ISO-8601 con zona)
  ocurrido timestamptz,                                       -- hora_local convertida, si es válida
  recibido timestamptz not null default now(),
  atrasado boolean not null default false,                    -- llegó en un envío diferido
  unique (usuario, id_cliente)
);
create index if not exists mercado_correcciones_fecha on public.mercado_correcciones (recibido desc);
alter table public.mercado_correcciones enable row level security;
drop policy if exists mcorr_lee on public.mercado_correcciones;
create policy mcorr_lee on public.mercado_correcciones for select to authenticated using (usuario = auth.uid() or private.es_moderador());

-- Reportes: id_cliente para que el reenvío de atrasados no duplique.
alter table public.mercado_reportes add column if not exists id_cliente uuid;
alter table public.mercado_reportes add column if not exists atrasado boolean not null default false;
alter table public.mercado_reportes drop constraint if exists mercado_reportes_cliente;
alter table public.mercado_reportes add constraint mercado_reportes_cliente unique (usuario, id_cliente);   -- NULLs no chocan entre sí

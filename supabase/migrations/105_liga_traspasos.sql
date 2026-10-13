-- Ronda 274 (chat LINK, con permiso de Fralex): traspasos en vivo entre Phoenix Link.
-- El anfitrión hace un traspaso en Editar de PES y lo guarda; su Link publica un «lote» de cambios jugador→equipo.
-- El Link de cada amigo que lo SIGUE lo recoge (Edge Function «liga», rutas /v1/liga/traspasos*) y lo aplica sobre SU propia base.
-- Solo viajan cambios {jugador, equipo origen, equipo destino}: ningún dato personal ni ninguna base de datos.
-- Todo el acceso es por la Edge Function con service_role: las tablas no tienen políticas ni permisos para anon/authenticated.
create table if not exists public.liga_traspasos (
  seq bigint generated always as identity primary key,
  anfitrion uuid not null references public.perfiles (id) on delete cascade,
  lote text not null check (lote ~ '^[0-9a-f]{24}$'),
  huella text not null check (huella ~ '^[0-9a-f]{64}$'),
  creado timestamptz not null,
  autor text not null default '',
  parche text not null default '',
  base_huella text not null default '',
  cambios jsonb not null check (jsonb_typeof(cambios) = 'array' and jsonb_array_length(cambios) between 1 and 60),
  recibido timestamptz not null default now(),
  unique (anfitrion, lote)
);
create index if not exists liga_traspasos_anfitrion_seq_idx on public.liga_traspasos (anfitrion, seq);
create index if not exists liga_traspasos_recibido_idx on public.liga_traspasos (recibido);

-- Código corto que el anfitrión comparte para que un amigo lo siga (se puede rotar; quien ya sigue, sigue).
create table if not exists public.liga_traspasos_codigos (
  anfitrion uuid primary key references public.perfiles (id) on delete cascade,
  codigo text not null unique check (codigo ~ '^[A-Z2-9]{8}$'),
  creado timestamptz not null default now()
);

-- Quién sigue a quién (solo reciben los lotes de los anfitriones que siguen).
create table if not exists public.liga_traspasos_seguidores (
  anfitrion uuid not null references public.perfiles (id) on delete cascade,
  seguidor uuid not null references public.perfiles (id) on delete cascade,
  desde timestamptz not null default now(),
  primary key (anfitrion, seguidor)
);
create index if not exists liga_traspasos_seguidores_seguidor_idx on public.liga_traspasos_seguidores (seguidor);

alter table public.liga_traspasos enable row level security;
alter table public.liga_traspasos_codigos enable row level security;
alter table public.liga_traspasos_seguidores enable row level security;
revoke all on public.liga_traspasos from anon, authenticated;
revoke all on public.liga_traspasos_codigos from anon, authenticated;
revoke all on public.liga_traspasos_seguidores from anon, authenticated;

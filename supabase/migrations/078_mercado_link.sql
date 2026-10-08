-- 078 · Mercado ↔ juego («Phoenix Mercado», programa de PC en pruebas; luego se integra a Phoenix Link).
-- Piezas:
--   1) mercado_option_files: versiones del option file OFICIAL (EDIT00000000) que sube el staff. Una sola marcada «actual».
--   2) mercado_codigos / mercado_dispositivos: vincular el programa a la cuenta (código de un uso → token «pml_…»).
--      Separado de dispositivos_host (Phoenix Soda) a propósito: aquí puede vincular CUALQUIER jugador, no solo hosts.
--   3) mercado_reportes: cambios que el programa detecta entre «antes» y «después» de jugar → el staff aprueba o rechaza.
-- Escrituras de la web: por RPC. Escrituras del programa: Edge Function «mercado» (service_role, funciones sistema_*).

-- ───────── 1) Option files oficiales ─────────
create table if not exists public.mercado_option_files (
  id bigserial primary key,
  version text not null unique check (version ~ '^[A-Za-z0-9._-]{1,40}$'),
  ruta text not null check (char_length(ruta) <= 200),          -- ruta dentro del bucket privado «option-files»
  sha256 text not null check (sha256 ~ '^[0-9a-f]{64}$'),       -- huella del archivo: el programa la compara para saber que no fue alterado
  tamano bigint not null check (tamano > 0 and tamano <= 50000000),
  notas text check (char_length(notas) <= 1000),
  actual boolean not null default false,
  creado_por uuid references auth.users(id) on delete set null,
  created_at timestamptz not null default now()
);
create unique index if not exists mercado_option_files_una_actual on public.mercado_option_files (actual) where actual;
alter table public.mercado_option_files enable row level security;
drop policy if exists mof_lectura on public.mercado_option_files;
create policy mof_lectura on public.mercado_option_files for select to authenticated using (true);
drop policy if exists mof_staff_insert on public.mercado_option_files;
create policy mof_staff_insert on public.mercado_option_files for insert to authenticated with check (private.es_moderador());

insert into storage.buckets (id, name, public) values ('option-files', 'option-files', false) on conflict (id) do nothing;
drop policy if exists option_files_staff_sube on storage.objects;
create policy option_files_staff_sube on storage.objects for insert to authenticated with check (bucket_id = 'option-files' and private.es_moderador());
drop policy if exists option_files_staff_lee on storage.objects;
create policy option_files_staff_lee on storage.objects for select to authenticated using (bucket_id = 'option-files' and private.es_moderador());

-- Staff: marcar una versión como la oficial vigente.
create or replace function public.mercado_publicar_option(p_id bigint) returns void
language plpgsql security definer set search_path = public as $$
begin
  if not private.es_moderador() then raise exception 'NO_AUTORIZADO'; end if;
  if not exists (select 1 from mercado_option_files where id = p_id) then raise exception 'NO_EXISTE'; end if;
  update mercado_option_files set actual = false where actual and id <> p_id;
  update mercado_option_files set actual = true where id = p_id;
end $$;
revoke all on function public.mercado_publicar_option(bigint) from public, anon;
grant execute on function public.mercado_publicar_option(bigint) to authenticated;

-- ───────── 2) Vincular el programa ─────────
create table if not exists public.mercado_codigos (
  id bigserial primary key,
  usuario uuid not null references auth.users(id) on delete cascade,
  codigo_huella text not null unique,
  expira timestamptz not null,
  usado timestamptz,
  created_at timestamptz not null default now()
);
alter table public.mercado_codigos enable row level security;   -- sin políticas: solo vía funciones

create table if not exists public.mercado_dispositivos (
  id uuid primary key default gen_random_uuid(),
  usuario uuid not null references auth.users(id) on delete cascade,
  huella_token text not null unique,
  nombre text not null default 'Mi PC' check (char_length(nombre) <= 40),
  version_app text check (char_length(version_app) <= 20),
  revocado boolean not null default false,
  ultimo_uso timestamptz,
  created_at timestamptz not null default now()
);
alter table public.mercado_dispositivos enable row level security;
drop policy if exists mdisp_propios on public.mercado_dispositivos;
create policy mdisp_propios on public.mercado_dispositivos for select to authenticated using (usuario = auth.uid() or private.es_moderador());

-- Web: genera un código de 8 caracteres (válido 10 min). Se guarda solo su huella (sha256), nunca el código.
create or replace function public.mercado_generar_codigo() returns jsonb
language plpgsql security definer set search_path = public, extensions as $$
declare v_codigo text; v_alfabeto text := 'ABCDEFGHJKLMNPQRSTUVWXYZ23456789'; i int;
begin
  if auth.uid() is null then raise exception 'SIN_SESION'; end if;
  if (select count(*) from mercado_codigos where usuario = auth.uid() and created_at > now() - interval '10 minutes') >= 5 then raise exception 'DEMASIADOS_INTENTOS'; end if;
  v_codigo := '';
  for i in 1..8 loop v_codigo := v_codigo || substr(v_alfabeto, 1 + floor(random() * length(v_alfabeto))::int, 1); end loop;
  insert into mercado_codigos (usuario, codigo_huella, expira) values (auth.uid(), encode(digest(v_codigo, 'sha256'), 'hex'), now() + interval '10 minutes');
  return jsonb_build_object('codigo', v_codigo, 'expira', now() + interval '10 minutes');
end $$;
revoke all on function public.mercado_generar_codigo() from public, anon;
grant execute on function public.mercado_generar_codigo() to authenticated;

create or replace function public.mercado_revocar_dispositivo(p_id uuid) returns void
language plpgsql security definer set search_path = public as $$
begin
  update mercado_dispositivos set revocado = true where id = p_id and (usuario = auth.uid() or private.es_moderador());
  if not found then raise exception 'NO_EXISTE'; end if;
end $$;
revoke all on function public.mercado_revocar_dispositivo(uuid) from public, anon;
grant execute on function public.mercado_revocar_dispositivo(uuid) to authenticated;

-- ───────── 3) Reportes de cambios ─────────
create table if not exists public.mercado_reportes (
  id bigserial primary key,
  usuario uuid not null references auth.users(id) on delete cascade,
  dispositivo uuid references public.mercado_dispositivos(id) on delete set null,
  option_version text check (char_length(option_version) <= 40),
  hash_antes text check (hash_antes ~ '^[0-9a-f]{64}$'),
  hash_despues text check (hash_despues ~ '^[0-9a-f]{64}$'),
  resumen text check (char_length(resumen) <= 500),
  cambios jsonb not null default '[]'::jsonb check (jsonb_typeof(cambios) = 'array' and pg_column_size(cambios) <= 200000),
  estado text not null default 'pendiente' check (estado in ('pendiente', 'aprobado', 'rechazado')),
  motivo text check (char_length(motivo) <= 500),
  revisado_por uuid references auth.users(id) on delete set null,
  revisado_en timestamptz,
  created_at timestamptz not null default now()
);
create index if not exists mercado_reportes_pend on public.mercado_reportes (estado, created_at desc);
alter table public.mercado_reportes enable row level security;
drop policy if exists mrep_lectura on public.mercado_reportes;
create policy mrep_lectura on public.mercado_reportes for select to authenticated using (usuario = auth.uid() or private.es_moderador());

create or replace function public.mercado_revisar(p_id bigint, p_aprobar boolean, p_motivo text default null) returns void
language plpgsql security definer set search_path = public as $$
declare v_usuario uuid;
begin
  if not private.es_moderador() then raise exception 'NO_AUTORIZADO'; end if;
  update mercado_reportes set estado = case when p_aprobar then 'aprobado' else 'rechazado' end,
         motivo = nullif(left(coalesce(p_motivo, ''), 500), ''), revisado_por = auth.uid(), revisado_en = now()
   where id = p_id and estado = 'pendiente' returning usuario into v_usuario;
  if v_usuario is null then raise exception 'NO_PENDIENTE'; end if;
end $$;
revoke all on function public.mercado_revisar(bigint, boolean, text) from public, anon;
grant execute on function public.mercado_revisar(bigint, boolean, text) to authenticated;

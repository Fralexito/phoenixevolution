-- 128 · Auto-actualización de Phoenix Link
-- -----------------------------------------------------------------------------------------------------------------
-- Fralex sube una versión con un comando (tools/EMPAQUETAR-RELEASE.ps1 -Subir, repo smash-soda-fork): queda NO publicada.
-- La publica (o la retira) desde /link-versiones/. Cada Link pregunta cada ~1 h por la función «mercado»
-- (GET /functions/v1/mercado/v1/link/actualizacion) con su token de PC y recibe un manifiesto firmado con Ed25519
-- (la misma clave de la 085) + una URL firmada de 10 min para bajar el zip del bucket PRIVADO «link-versiones».
-- Link comprueba firma y sha256 antes de instalar; si la versión nueva no arranca, vuelve sola a la anterior.
-- Pegar entero en el SQL Editor (proyecto fiibiyijojkxqlsrhcil). Se puede volver a pegar: no rompe nada.

-- ─── 1) Versiones ───────────────────────────────────────────────────────────────────────────────────────────────────
create table if not exists public.link_versiones (
  id bigint generated always as identity primary key,
  version text not null unique check (version ~ '^[0-9]{1,4}\.[0-9]{1,4}\.[0-9]{1,4}$'),
  orden int[] generated always as (string_to_array(version, '.')::int[]) stored,   -- para comparar 0.3.9 < 0.3.16
  etapa text not null default '' check (char_length(etapa) <= 20),
  archivo text not null check (archivo ~ '^v[0-9.]+/PhoenixLink-[A-Za-z0-9._-]{1,80}\.zip$'),   -- ruta dentro del bucket
  sha256 text not null check (sha256 ~ '^[0-9a-f]{64}$'),
  tamano bigint not null check (tamano between 1 and 52428800),                       -- 50 MB (límite de Storage)
  notas text not null default '' check (char_length(notas) <= 2000),
  obligatoria boolean not null default false,
  subida boolean not null default false,       -- el servidor comprobó que el zip está en el bucket y su sha256 cuadra
  publicada boolean not null default false,
  publicada_en timestamptz,
  retirada_en timestamptz,
  creada timestamptz not null default now(),
  creada_por uuid references public.perfiles (id) on delete set null,
  constraint link_versiones_publicar_subida check (not publicada or subida)
);
alter table public.link_versiones enable row level security;
drop policy if exists link_versiones_staff_lee on public.link_versiones;
create policy link_versiones_staff_lee on public.link_versiones for select to authenticated using (private.es_staff());
revoke insert, update, delete, truncate, references, trigger on public.link_versiones from anon, authenticated;

-- ─── 2) Qué versión tiene cada PC (la escribe la función «mercado» cuando Link pregunta o informa) ─────────────────
create table if not exists public.link_instalaciones (
  dispositivo uuid primary key references public.dispositivos_host (id) on delete cascade,
  usuario uuid not null references public.perfiles (id) on delete cascade,
  version text not null check (char_length(version) <= 20),
  ultimo_contacto timestamptz not null default now(),
  intento_version text check (char_length(intento_version) <= 20),
  intento_estado text check (intento_estado in ('descargando', 'instalando', 'instalada', 'fallo', 'restaurada')),
  intento_detalle text check (char_length(intento_detalle) <= 300),
  intento_en timestamptz
);
create index if not exists link_instalaciones_usuario_idx on public.link_instalaciones (usuario);
alter table public.link_instalaciones enable row level security;
drop policy if exists link_instalaciones_leer on public.link_instalaciones;
create policy link_instalaciones_leer on public.link_instalaciones for select to authenticated
  using (usuario = (select auth.uid()) or private.es_staff());
revoke insert, update, delete, truncate, references, trigger on public.link_instalaciones from anon, authenticated;

-- ─── 3) Bucket privado: sin políticas para anon/authenticated (solo la función, con service_role) ─────────────────
insert into storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
values ('link-versiones', 'link-versiones', false, 52428800, array['application/zip', 'application/x-zip-compressed', 'application/octet-stream'])
on conflict (id) do update set public = false, file_size_limit = excluded.file_size_limit, allowed_mime_types = excluded.allowed_mime_types;

-- ─── 4) Funciones del servidor (solo service_role: las llama la función «mercado») ─────────────────────────────────
-- Registrar una versión nueva (NO publicada). Solo si quien la sube es admin.
create or replace function public.sistema_link_version_registrar(p_usuario uuid, p_version text, p_etapa text, p_sha256 text,
  p_tamano bigint, p_notas text, p_obligatoria boolean) returns jsonb
language plpgsql security definer set search_path = '' as $$
declare v public.link_versiones;
begin
  if not exists (select 1 from public.perfiles where id = p_usuario and rol = 'admin') then raise exception 'NO_AUTORIZADO'; end if;
  select * into v from public.link_versiones where version = p_version;
  if found then
    -- Repetir la subida de la MISMA versión solo se permite mientras no esté publicada (p. ej. se cortó el envío).
    if v.publicada then raise exception 'VERSION_YA_PUBLICADA'; end if;
    update public.link_versiones set etapa = coalesce(p_etapa, ''), sha256 = p_sha256, tamano = p_tamano, notas = coalesce(p_notas, ''),
      obligatoria = coalesce(p_obligatoria, false), subida = false, creada = now(), creada_por = p_usuario
      where id = v.id returning * into v;
  else
    insert into public.link_versiones (version, etapa, archivo, sha256, tamano, notas, obligatoria, creada_por)
    values (p_version, coalesce(p_etapa, ''), 'v' || p_version || '/PhoenixLink-' || p_version || '.zip', p_sha256, p_tamano,
      coalesce(p_notas, ''), coalesce(p_obligatoria, false), p_usuario)
    returning * into v;
  end if;
  return jsonb_build_object('id', v.id, 'version', v.version, 'archivo', v.archivo);
end $$;

create or replace function public.sistema_link_version_subida(p_usuario uuid, p_id bigint) returns jsonb
language plpgsql security definer set search_path = '' as $$
declare v public.link_versiones;
begin
  if not exists (select 1 from public.perfiles where id = p_usuario and rol = 'admin') then raise exception 'NO_AUTORIZADO'; end if;
  update public.link_versiones set subida = true where id = p_id returning * into v;
  if not found then raise exception 'VERSION_NO_EXISTE'; end if;
  return jsonb_build_object('id', v.id, 'version', v.version, 'subida', true, 'publicada', v.publicada);
end $$;

-- Link pregunta: anota su versión y devuelve la última PUBLICADA más nueva que la suya (o null).
-- «obligatoria» = true si CUALQUIER versión publicada entre la suya y la última lo es (no se salta una obligatoria).
create or replace function public.sistema_link_ultima(p_dispositivo uuid, p_usuario uuid, p_version text) returns jsonb
language plpgsql security definer set search_path = '' as $$
declare v public.link_versiones; mia int[]; oblig boolean;
begin
  if p_version !~ '^[0-9]{1,4}\.[0-9]{1,4}\.[0-9]{1,4}$' then raise exception 'DATOS_INVALIDOS'; end if;
  mia := string_to_array(p_version, '.')::int[];
  insert into public.link_instalaciones (dispositivo, usuario, version, ultimo_contacto) values (p_dispositivo, p_usuario, p_version, now())
  on conflict (dispositivo) do update set usuario = excluded.usuario, version = excluded.version, ultimo_contacto = now();
  select * into v from public.link_versiones where publicada and subida and orden > mia order by orden desc limit 1;
  if not found then return null; end if;
  select coalesce(bool_or(obligatoria), false) into oblig from public.link_versiones where publicada and subida and orden > mia;
  return jsonb_build_object('id', v.id, 'version', v.version, 'etapa', v.etapa, 'archivo', v.archivo, 'sha256', v.sha256,
    'tamano', v.tamano, 'notas', v.notas, 'obligatoria', oblig, 'publicada_en', v.publicada_en);
end $$;

create or replace function public.sistema_link_informe(p_dispositivo uuid, p_usuario uuid, p_version text, p_estado text, p_detalle text) returns void
language plpgsql security definer set search_path = '' as $$
begin
  insert into public.link_instalaciones (dispositivo, usuario, version, intento_version, intento_estado, intento_detalle, intento_en)
  values (p_dispositivo, p_usuario, '?', p_version, p_estado, left(p_detalle, 300), now())
  on conflict (dispositivo) do update set intento_version = excluded.intento_version, intento_estado = excluded.intento_estado,
    intento_detalle = excluded.intento_detalle, intento_en = now(), ultimo_contacto = now();
end $$;

revoke all on function public.sistema_link_version_registrar(uuid, text, text, text, bigint, text, boolean) from public, anon, authenticated;
revoke all on function public.sistema_link_version_subida(uuid, bigint) from public, anon, authenticated;
revoke all on function public.sistema_link_ultima(uuid, uuid, text) from public, anon, authenticated;
revoke all on function public.sistema_link_informe(uuid, uuid, text, text, text) from public, anon, authenticated;
grant execute on function public.sistema_link_version_registrar(uuid, text, text, text, bigint, text, boolean) to service_role;
grant execute on function public.sistema_link_version_subida(uuid, bigint) to service_role;
grant execute on function public.sistema_link_ultima(uuid, uuid, text) to service_role;
grant execute on function public.sistema_link_informe(uuid, uuid, text, text, text) to service_role;

-- ─── 5) Panel de admin (/link-versiones/) ───────────────────────────────────────────────────────────────────────────
-- Lista de versiones con cuántas PCs tiene cada una (staff lee; solo admin cambia).
create or replace function public.link_versiones_panel() returns jsonb
language plpgsql stable security definer set search_path = '' as $$
begin
  if not private.es_staff() then raise exception 'NO_AUTORIZADO'; end if;
  return jsonb_build_object(
    'versiones', coalesce((select jsonb_agg(jsonb_build_object('id', v.id, 'version', v.version, 'etapa', v.etapa, 'sha256', v.sha256,
        'tamano', v.tamano, 'notas', v.notas, 'obligatoria', v.obligatoria, 'subida', v.subida, 'publicada', v.publicada,
        'publicada_en', v.publicada_en, 'retirada_en', v.retirada_en, 'creada', v.creada,
        'pcs', (select count(*) from public.link_instalaciones i where i.version = v.version)) order by v.orden desc)
      from public.link_versiones v), '[]'::jsonb),
    'pcs', coalesce((select jsonb_agg(jsonb_build_object('dispositivo', i.dispositivo, 'pc', d.nombre,
        'usuario', coalesce(p.nombre_display, p.username, 'Jugador'), 'version', i.version, 'ultimo_contacto', i.ultimo_contacto,
        'intento_version', i.intento_version, 'intento_estado', i.intento_estado, 'intento_detalle', i.intento_detalle, 'intento_en', i.intento_en)
        order by i.ultimo_contacto desc)
      from public.link_instalaciones i join public.dispositivos_host d on d.id = i.dispositivo left join public.perfiles p on p.id = i.usuario
      where d.revocado is null), '[]'::jsonb),
    'es_admin', private.es_admin());
end $$;

-- Publicar / retirar. Retirar no borra nada: las PCs que ya la tienen se quedan con ella; las demás dejan de verla.
create or replace function public.link_version_publicar(p_id bigint, p_publicar boolean) returns jsonb
language plpgsql security definer set search_path = '' as $$
declare v public.link_versiones;
begin
  if not private.es_admin() then raise exception 'NO_AUTORIZADO'; end if;
  select * into v from public.link_versiones where id = p_id for update;
  if not found then raise exception 'VERSION_NO_EXISTE'; end if;
  if p_publicar and not v.subida then raise exception 'ZIP_NO_SUBIDO: el zip de esta versión todavía no llegó entero al servidor'; end if;
  update public.link_versiones set publicada = p_publicar,
    publicada_en = case when p_publicar then now() else publicada_en end,
    retirada_en = case when p_publicar then null else now() end
    where id = p_id returning * into v;
  return jsonb_build_object('id', v.id, 'version', v.version, 'publicada', v.publicada);
end $$;

create or replace function public.link_version_obligatoria(p_id bigint, p_obligatoria boolean) returns jsonb
language plpgsql security definer set search_path = '' as $$
declare v public.link_versiones;
begin
  if not private.es_admin() then raise exception 'NO_AUTORIZADO'; end if;
  update public.link_versiones set obligatoria = p_obligatoria where id = p_id returning * into v;
  if not found then raise exception 'VERSION_NO_EXISTE'; end if;
  return jsonb_build_object('id', v.id, 'version', v.version, 'obligatoria', v.obligatoria);
end $$;

create or replace function public.link_version_notas(p_id bigint, p_notas text) returns jsonb
language plpgsql security definer set search_path = '' as $$
declare v public.link_versiones;
begin
  if not private.es_admin() then raise exception 'NO_AUTORIZADO'; end if;
  update public.link_versiones set notas = coalesce(p_notas, '') where id = p_id returning * into v;
  if not found then raise exception 'VERSION_NO_EXISTE'; end if;
  return jsonb_build_object('id', v.id, 'version', v.version, 'notas', v.notas);
end $$;

revoke all on function public.link_versiones_panel() from public, anon;
revoke all on function public.link_version_publicar(bigint, boolean) from public, anon;
revoke all on function public.link_version_obligatoria(bigint, boolean) from public, anon;
revoke all on function public.link_version_notas(bigint, text) from public, anon;
grant execute on function public.link_versiones_panel() to authenticated;
grant execute on function public.link_version_publicar(bigint, boolean) to authenticated;
grant execute on function public.link_version_obligatoria(bigint, boolean) to authenticated;
grant execute on function public.link_version_notas(bigint, text) to authenticated;

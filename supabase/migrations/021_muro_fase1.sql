-- 021 · MURO de jugadores · FASE 1 (publicaciones de texto + estilo del perfil + privacidad de quién lo ve). Depende de 017 (amistades, bloqueos, privacidad_social).
-- Principio (igual que Amigos y Chat): las tablas NO se leen ni escriben directo desde el navegador. TODO pasa por funciones RPC
-- `security definer` que validan reglas (sesión, dueño, bloqueos, privacidad). RLS queda activada y sin permisos → nadie se salta las funciones.
-- Fases siguientes: 2 respuestas + reacciones + «quién responde», 3 fotos y enlaces de video, 4 adjuntar duelos.

-- 1) Estilo del perfil (público): banner, color de acento y lema. El banner admite un preset («preset:nebulosa») o, en la fase 3, una foto https.
alter table public.perfiles add column if not exists muro_banner text;
alter table public.perfiles add column if not exists muro_acento text;
alter table public.perfiles add column if not exists muro_lema   text;
do $$ begin
  if not exists (select 1 from pg_constraint where conname = 'perfiles_muro_estilo_ok') then
    alter table public.perfiles add constraint perfiles_muro_estilo_ok check (
      (muro_banner is null or muro_banner ~ '^preset:[a-z0-9-]{1,30}$' or (muro_banner ~ '^https://' and char_length(muro_banner) <= 300))
      and (muro_acento is null or muro_acento ~ '^#[0-9a-fA-F]{6}$')
      and (muro_lema is null or (char_length(muro_lema) <= 80 and muro_lema !~ '[<>]')));
  end if;
end $$;
-- Permisos de `perfiles` son POR COLUMNA: lectura pública; la escritura solo la hace la RPC muro_guardar_estilo (no se da update).
grant select (muro_banner, muro_acento, muro_lema) on public.perfiles to anon, authenticated;

-- 2) Quién puede ver mi muro y (fase 2) quién puede responder.
alter table public.privacidad_social add column if not exists muro_ver text not null default 'PUBLICO' check (muro_ver in ('PUBLICO','AMIGOS'));
alter table public.privacidad_social add column if not exists muro_responder text not null default 'TODOS' check (muro_responder in ('TODOS','AMIGOS','NADIE'));

-- 3) Publicaciones.
create table if not exists public.muro_publicaciones (
  id bigint generated always as identity primary key,
  autor_id uuid not null references auth.users(id) on delete cascade,
  texto text not null check (char_length(texto) between 1 and 1000),
  fijada boolean not null default false,
  created_at timestamptz not null default now(),
  editada_at timestamptz
);
create index if not exists muro_publicaciones_autor_idx on public.muro_publicaciones (autor_id, id desc);
create unique index if not exists muro_una_fijada_idx on public.muro_publicaciones (autor_id) where fijada;   -- máximo 1 publicación fijada por muro
alter table public.muro_publicaciones enable row level security;
revoke all on public.muro_publicaciones from anon, authenticated;

-- 4) Ayudante interno: ¿puede `p_yo` (null = visitante) ver el muro de `p_dueno`?
create or replace function private.puede_ver_muro(p_dueno uuid, p_yo uuid) returns boolean
language plpgsql stable security definer set search_path = '' as $$
declare modo text;
begin
  if p_yo is not null and p_yo = p_dueno then return true; end if;
  if p_yo is not null and private.hay_bloqueo(p_yo, p_dueno) then return false; end if;
  modo := coalesce((select muro_ver from public.privacidad_social where usuario_id = p_dueno), 'PUBLICO');
  if modo = 'PUBLICO' then return true; end if;
  return p_yo is not null and private.son_amigos(p_yo, p_dueno);
end $$;
revoke all on function private.puede_ver_muro(uuid, uuid) from public, anon, authenticated;

-- 5) LECTURA (visitantes y con sesión): ficha pública de un jugador por su @usuario. null si no existe o hay bloqueo (no se revela cuál).
create or replace function public.perfil_publico(p_usuario text) returns jsonb
language plpgsql stable security definer set search_path = '' as $$
declare yo uuid := (select auth.uid()); p public.perfiles%rowtype; priv public.privacidad_social%rowtype;
begin
  select * into p from public.perfiles where lower(username) = lower(trim(coalesce(p_usuario, '')));
  if not found then return null; end if;
  if yo is not null and yo <> p.id and private.hay_bloqueo(yo, p.id) then return null; end if;
  select * into priv from public.privacidad_social where usuario_id = p.id;
  return jsonb_build_object(
    'id', p.id, 'username', p.username, 'nombre_display', p.nombre_display, 'avatar_url', p.avatar_url, 'bio', p.bio,
    'club_favorito', p.club_favorito, 'pais_codigo', p.pais_codigo, 'posicion_preferida', p.posicion_preferida, 'pie_habil', p.pie_habil,
    'puede_hostear', p.puede_hostear, 'software_host', p.software_host, 'host_juego', p.host_juego, 'host_parche', p.host_parche,
    'host_sp_version', p.host_sp_version, 'host_extras', p.host_extras, 'stream_url', p.stream_url,
    'reputacion_puntos', p.reputacion_puntos, 'rango_fairplay', p.rango_fairplay, 'partidos_jugados', p.partidos_jugados,
    'muro_banner', p.muro_banner, 'muro_acento', p.muro_acento, 'muro_lema', p.muro_lema, 'created_at', p.created_at,
    'soy_yo', yo is not null and yo = p.id,
    'puede_ver_muro', private.puede_ver_muro(p.id, yo),
    'muro_ver', case when yo = p.id then coalesce(priv.muro_ver, 'PUBLICO') end,           -- mis ajustes solo me los devuelvo a mí
    'muro_responder', case when yo = p.id then coalesce(priv.muro_responder, 'TODOS') end);
end $$;

-- 6) LECTURA: publicaciones de un muro (la fijada primero; paginación por id: pasa el id de la última que ya tienes).
create or replace function public.muro_de(p_usuario uuid, p_antes bigint default null, p_limite integer default 20) returns jsonb
language plpgsql stable security definer set search_path = '' as $$
declare yo uuid := (select auth.uid()); n integer := least(greatest(coalesce(p_limite, 20), 1), 50); filas jsonb; mas boolean;
begin
  if not private.puede_ver_muro(p_usuario, yo) then return jsonb_build_object('visible', false, 'items', '[]'::jsonb, 'hay_mas', false); end if;
  -- Se piden n+1 filas solo para saber si quedan más; la sobrante no se devuelve. La fijada solo viaja en la primera página.
  with t as (
    select m.id, m.texto, m.fijada, m.created_at, m.editada_at,
           row_number() over (order by (case when p_antes is null then m.fijada else false end) desc, m.id desc) as rn
    from public.muro_publicaciones m
    where m.autor_id = p_usuario and (p_antes is null or (m.id < p_antes and not m.fijada))
    order by (case when p_antes is null then m.fijada else false end) desc, m.id desc limit n + 1)
  select coalesce(jsonb_agg(jsonb_build_object('id', id, 'texto', texto, 'fijada', fijada, 'created_at', created_at, 'editada_at', editada_at) order by rn) filter (where rn <= n), '[]'::jsonb),
         count(*) > n into filas, mas from t;
  return jsonb_build_object('visible', true, 'hay_mas', mas, 'items', filas);
end $$;

-- 7) ESCRITURA (solo con sesión; todo sobre MI muro).
create or replace function public.muro_publicar(p_texto text) returns bigint
language plpgsql security definer set search_path = '' as $$
declare yo uuid := private.uid_requerido(); t text := trim(coalesce(p_texto, '')); nuevo bigint;
begin
  if char_length(t) < 1 then raise exception 'Escribe algo para publicar.'; end if;
  if char_length(t) > 1000 then raise exception 'Máximo 1000 caracteres.'; end if;
  if (select count(*) from public.muro_publicaciones where autor_id = yo and created_at > now() - interval '1 hour') >= 10 then
    raise exception 'Estás publicando muy rápido: máximo 10 por hora.';
  end if;
  insert into public.muro_publicaciones (autor_id, texto) values (yo, t) returning id into nuevo;
  return nuevo;
end $$;

create or replace function public.muro_editar(p_id bigint, p_texto text) returns void
language plpgsql security definer set search_path = '' as $$
declare yo uuid := private.uid_requerido(); t text := trim(coalesce(p_texto, ''));
begin
  if char_length(t) < 1 or char_length(t) > 1000 then raise exception 'El texto debe tener entre 1 y 1000 caracteres.'; end if;
  update public.muro_publicaciones set texto = t, editada_at = now() where id = p_id and autor_id = yo;
  if not found then raise exception 'No encontré esa publicación en tu muro.'; end if;
end $$;

create or replace function public.muro_borrar(p_id bigint) returns void
language plpgsql security definer set search_path = '' as $$
declare yo uuid := private.uid_requerido();
begin
  delete from public.muro_publicaciones where id = p_id and (autor_id = yo or private.es_admin());   -- el staff puede quitar contenido
  if not found then raise exception 'No encontré esa publicación.'; end if;
end $$;

create or replace function public.muro_fijar(p_id bigint, p_fijar boolean) returns void
language plpgsql security definer set search_path = '' as $$
declare yo uuid := private.uid_requerido();
begin
  if not exists (select 1 from public.muro_publicaciones where id = p_id and autor_id = yo) then raise exception 'No encontré esa publicación en tu muro.'; end if;
  if p_fijar then update public.muro_publicaciones set fijada = false where autor_id = yo and fijada; end if;   -- solo una fijada a la vez
  update public.muro_publicaciones set fijada = coalesce(p_fijar, false) where id = p_id and autor_id = yo;
end $$;

create or replace function public.muro_guardar_estilo(p_banner text, p_acento text, p_lema text) returns void
language plpgsql security definer set search_path = '' as $$
declare yo uuid := private.uid_requerido();
begin
  update public.perfiles set muro_banner = nullif(trim(coalesce(p_banner, '')), ''), muro_acento = nullif(trim(coalesce(p_acento, '')), ''),
    muro_lema = nullif(trim(regexp_replace(coalesce(p_lema, ''), '[<>]', '', 'g')), '') where id = yo;
end $$;   -- formato inválido: lo rechaza el CHECK perfiles_muro_estilo_ok

create or replace function public.muro_guardar_privacidad(p_ver text, p_responder text) returns void
language plpgsql security definer set search_path = '' as $$
declare yo uuid := private.uid_requerido();
begin
  insert into public.privacidad_social (usuario_id, muro_ver, muro_responder) values (yo, p_ver, p_responder)
  on conflict (usuario_id) do update set muro_ver = excluded.muro_ver, muro_responder = excluded.muro_responder, updated_at = now();
end $$;   -- valores fuera de lista: los rechaza el CHECK de la tabla

do $$ declare f text; begin
  foreach f in array array['perfil_publico(text)','muro_de(uuid,bigint,integer)'] loop
    execute format('revoke all on function public.%s from public', f);
    execute format('grant execute on function public.%s to anon, authenticated', f);
  end loop;
  foreach f in array array['muro_publicar(text)','muro_editar(bigint,text)','muro_borrar(bigint)','muro_fijar(bigint,boolean)','muro_guardar_estilo(text,text,text)','muro_guardar_privacidad(text,text)'] loop
    execute format('revoke all on function public.%s from public, anon', f);
    execute format('grant execute on function public.%s to authenticated', f);
  end loop;
end $$;

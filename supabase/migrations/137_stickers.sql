-- 137 · STICKERS en los comentarios (19-oct-2026, Fralex: «haz todos los comentarios que tengan stickers, e incluso pueda subir stickers de WhatsApp y TikTok»).
-- ADITIVA salvo dos cambios compatibles: muro_responder acepta un 3.er parámetro opcional (p_sticker) y el check del texto deja responder SOLO con sticker.
--   · Bucket «stickers» (público, 1 MB, webp/png/gif): los de WhatsApp son .webp (también animados) y los de TikTok suelen ser GIF/PNG.
--     Cada uno sube SOLO a su carpeta (<uid>/…), máx. 100 archivos, y no si está sancionado (como el bucket «muro»).
--   · muro_respuestas.sticker: 'phx:<id>' (pack Phoenix incorporado, se dibuja en la web) o la URL pública de un archivo del bucket «stickers».
--   · stickers_usuario: «Mis stickers» (máx. 60). Se puede guardar uno propio o el de otra persona (como en WhatsApp). RLS sin políticas: solo por funciones.
--   · mis_stickers(), sticker_guardar(url), sticker_quitar(id); muro_respuestas_de devuelve también «sticker».
-- Deshacer: drop function public.sticker_quitar(bigint), public.sticker_guardar(text), public.mis_stickers(); drop table public.stickers_usuario;
--   recrear muro_responder(bigint, text) y muro_respuestas_de sin sticker (migración 022 / 135); alter table public.muro_respuestas drop column sticker;
--   volver al check original (char_length(texto) between 1 and 500); borrar las políticas stickers_* y el bucket «stickers».

-- Bucket
insert into storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
values ('stickers', 'stickers', true, 1048576, array['image/webp', 'image/png', 'image/gif'])
on conflict (id) do nothing;

create or replace function private.cuenta_stickers(p_uid uuid) returns integer
language sql stable security definer set search_path = '' as $$
  select count(*)::int from storage.objects where bucket_id = 'stickers' and (storage.foldername(name))[1] = p_uid::text;
$$;
revoke all on function private.cuenta_stickers(uuid) from public, anon;
grant execute on function private.cuenta_stickers(uuid) to authenticated;

drop policy if exists stickers_insert_propio on storage.objects;
create policy stickers_insert_propio on storage.objects for insert to authenticated
  with check (bucket_id = 'stickers' and (storage.foldername(name))[1] = (select auth.uid())::text
    and private.cuenta_stickers((select auth.uid())) < 100 and not private.esta_sancionado((select auth.uid())));
drop policy if exists stickers_delete_propio on storage.objects;
create policy stickers_delete_propio on storage.objects for delete to authenticated
  using (bucket_id = 'stickers' and (storage.foldername(name))[1] = (select auth.uid())::text);
drop policy if exists stickers_select_propio on storage.objects;
create policy stickers_select_propio on storage.objects for select to authenticated
  using (bucket_id = 'stickers' and (storage.foldername(name))[1] = (select auth.uid())::text);

-- ¿Sticker válido? Del pack Phoenix (phx:<id>) o un archivo del bucket «stickers» (de cualquier persona: se pueden reenviar los guardados).
create or replace function private.sticker_valido(p_valor text) returns boolean
language sql immutable set search_path = '' as $$
  select p_valor ~ '^phx:[a-z0-9-]{2,24}$'
      or p_valor ~ '^https://fiibiyijojkxqlsrhcil\.supabase\.co/storage/v1/object/public/stickers/[0-9a-f-]{36}/[A-Za-z0-9._-]{1,80}$';
$$;

-- Respuestas con sticker
alter table public.muro_respuestas add column if not exists sticker text check (sticker is null or private.sticker_valido(sticker));
alter table public.muro_respuestas drop constraint if exists muro_respuestas_texto_check;
alter table public.muro_respuestas add constraint muro_respuestas_texto_check
  check (char_length(texto) <= 500 and (char_length(texto) >= 1 or sticker is not null));

drop function if exists public.muro_responder(bigint, text);
create or replace function public.muro_responder(p_publicacion bigint, p_texto text, p_sticker text default null) returns bigint
language plpgsql security definer set search_path = '' as $$
declare yo uuid := private.uid_requerido(); t text := trim(coalesce(p_texto, '')); s text := nullif(trim(coalesce(p_sticker, '')), ''); dueno uuid; nuevo bigint;
begin
  select autor_id into dueno from public.muro_publicaciones where id = p_publicacion;
  if dueno is null then raise exception 'Esa publicación ya no existe.'; end if;
  if not private.puede_responder_muro(dueno, yo) then raise exception 'No puedes responder en este muro.'; end if;
  if s is not null and not private.sticker_valido(s) then raise exception 'Ese sticker no es válido.'; end if;
  if char_length(t) > 500 or (char_length(t) < 1 and s is null) then raise exception 'La respuesta debe tener entre 1 y 500 caracteres (o un sticker).'; end if;
  if (select count(*) from public.muro_respuestas where autor_id = yo and created_at > now() - interval '1 hour') >= 20 then raise exception 'Estás respondiendo muy rápido: máximo 20 por hora.'; end if;
  insert into public.muro_respuestas (publicacion_id, autor_id, texto, sticker) values (p_publicacion, yo, t, s) returning id into nuevo;
  if dueno <> yo then perform private.notificar(dueno, 'MURO_RESPUESTA', 'Respondieron en tu muro', private.nombre(yo) || ': ' || case when t = '' then 'envió un sticker' else left(t, 80) end); end if;
  return nuevo;
end $$;
revoke all on function public.muro_responder(bigint, text, text) from public, anon;
grant execute on function public.muro_responder(bigint, text, text) to authenticated;

-- Las respuestas traen su sticker (mismo cuerpo que antes + «sticker»)
create or replace function public.muro_respuestas_de(p_publicacion bigint, p_limite integer default 50) returns jsonb
language plpgsql stable security definer set search_path = '' as $$
declare yo uuid := (select auth.uid()); dueno uuid;
begin
  select autor_id into dueno from public.muro_publicaciones where id = p_publicacion and not oculto;
  if dueno is null or not private.puede_ver_muro(dueno, yo) then return '[]'::jsonb; end if;
  return coalesce((select jsonb_agg(jsonb_build_object('id', r.id, 'autor_id', r.autor_id, 'texto', r.texto, 'sticker', r.sticker, 'created_at', r.created_at,
      'nombre_display', pf.nombre_display, 'username', pf.username, 'avatar_url', pf.avatar_url,
      'puedo_borrar', yo is not null and (r.autor_id = yo or dueno = yo or private.es_admin())) order by r.id)
    from (select * from public.muro_respuestas where publicacion_id = p_publicacion and not oculto order by id limit least(greatest(coalesce(p_limite, 50), 1), 100)) r
    join public.perfiles pf on pf.id = r.autor_id
    where yo is null or not private.hay_bloqueo(yo, r.autor_id)), '[]'::jsonb);
end $$;

-- «Mis stickers»
create table if not exists public.stickers_usuario (
  id bigint generated always as identity primary key,
  usuario_id uuid not null references auth.users(id) on delete cascade,
  url text not null check (private.sticker_valido(url) and url !~ '^phx:'),
  created_at timestamptz not null default now(),
  unique (usuario_id, url)
);
alter table public.stickers_usuario enable row level security;
revoke all on public.stickers_usuario from anon, authenticated;

create or replace function public.mis_stickers() returns jsonb
language sql stable security definer set search_path = '' as $$
  select coalesce(jsonb_agg(jsonb_build_object('id', s.id, 'url', s.url) order by s.id desc), '[]'::jsonb)
  from public.stickers_usuario s where s.usuario_id = (select auth.uid());
$$;

create or replace function public.sticker_guardar(p_url text) returns bigint
language plpgsql security definer set search_path = '' as $$
declare yo uuid := private.uid_requerido(); u text := trim(coalesce(p_url, '')); nuevo bigint;
begin
  if u ~ '^phx:' or not private.sticker_valido(u) then raise exception 'Ese sticker no es válido.'; end if;
  select id into nuevo from public.stickers_usuario where usuario_id = yo and url = u;
  if nuevo is not null then return nuevo; end if;
  if (select count(*) from public.stickers_usuario where usuario_id = yo) >= 60 then raise exception 'Ya tienes 60 stickers: quita alguno para guardar otro.'; end if;
  insert into public.stickers_usuario (usuario_id, url) values (yo, u) returning id into nuevo;
  return nuevo;
end $$;

create or replace function public.sticker_quitar(p_id bigint) returns void
language plpgsql security definer set search_path = '' as $$
declare yo uuid := private.uid_requerido();
begin
  delete from public.stickers_usuario where id = p_id and usuario_id = yo;
end $$;

revoke all on function public.mis_stickers(), public.sticker_guardar(text), public.sticker_quitar(bigint) from public, anon;
grant execute on function public.mis_stickers(), public.sticker_guardar(text), public.sticker_quitar(bigint) to authenticated;

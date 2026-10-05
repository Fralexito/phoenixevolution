-- 027 · MURO: (1) subir VIDEOS propios (historias, clips y publicaciones) · (2) SEGMENTO por juego (opcional) · (3) feed «Comunidad» filtrable por juego. Depende de 021-026.
-- Video propio: bucket PÚBLICO `muro-video`, máx. 10 MB, solo mp4/webm/mov. El navegador además exige ≤ 15 s. Solo se sube/borra en TU carpeta y como máximo
--   3 videos a la vez por persona (así nadie llena el almacenamiento). Las RPC aceptan enlaces de YouTube/TikTok/Kick/Twitch O un video de TU carpeta de ese bucket.
-- Segmento: pes · sp (SP Football Life) · fifa · eafc · efootball. null = general.

-- 1) Bucket y permisos de Storage.
insert into storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
values ('muro-video', 'muro-video', true, 10485760, array['video/mp4','video/webm','video/quicktime'])
on conflict (id) do update set public = true, file_size_limit = 10485760, allowed_mime_types = array['video/mp4','video/webm','video/quicktime'];

drop policy if exists muro_video_select_propio on storage.objects;
drop policy if exists muro_video_insert_propio on storage.objects;
drop policy if exists muro_video_delete_propio on storage.objects;
create policy muro_video_select_propio on storage.objects for select to authenticated
  using (bucket_id = 'muro-video' and (storage.foldername(name))[1] = ((select auth.uid()))::text);
create policy muro_video_insert_propio on storage.objects for insert to authenticated
  with check (bucket_id = 'muro-video' and (storage.foldername(name))[1] = ((select auth.uid()))::text
    and (select count(*) from storage.objects o where o.bucket_id = 'muro-video' and (storage.foldername(o.name))[1] = ((select auth.uid()))::text) < 3);
create policy muro_video_delete_propio on storage.objects for delete to authenticated
  using (bucket_id = 'muro-video' and (storage.foldername(name))[1] = ((select auth.uid()))::text);

-- ¿`p_url` es un video del bucket `muro-video` dentro de la carpeta de `p_uid`?
create or replace function private.video_propio(p_url text, p_uid uuid) returns boolean
language sql immutable set search_path = '' as $$
  select p_url ~ ('^https://fiibiyijojkxqlsrhcil\.supabase\.co/storage/v1/object/public/muro-video/' || p_uid::text || '/[A-Za-z0-9._-]{1,80}$')
$$;
revoke all on function private.video_propio(text, uuid) from public, anon, authenticated;

-- Endurecimiento: las fotos propias también deben venir de ESTE proyecto (antes bastaba cualquier dominio con esa ruta, lo que permitía enlazar un servidor ajeno como «foto»).
create or replace function private.imagen_propia(p_url text, p_uid uuid) returns boolean
language sql immutable set search_path = '' as $$
  select p_url ~ ('^https://fiibiyijojkxqlsrhcil\.supabase\.co/storage/v1/object/public/muro/' || p_uid::text || '/[A-Za-z0-9._-]{1,80}$')
$$;
revoke all on function private.imagen_propia(text, uuid) from public, anon, authenticated;

-- URLs de archivos propios (foto y/o video subido) de una fila, para que el navegador limpie el Storage al borrar.
create or replace function private.archivos_propios(p_imagen text, p_video text, p_uid uuid) returns jsonb
language sql immutable set search_path = '' as $$
  select coalesce(jsonb_agg(u), '[]'::jsonb) from unnest(array[p_imagen, case when private.video_propio(p_video, p_uid) then p_video end]) as u where u is not null
$$;
revoke all on function private.archivos_propios(text, text, uuid) from public, anon, authenticated;

-- (Nota: el host fijo de arriba es el de este proyecto de Supabase.)

-- 2) Segmento por juego en publicaciones y clips.
alter table public.muro_publicaciones add column if not exists juego text;
alter table public.muro_clips add column if not exists juego text;
alter table public.muro_publicaciones drop constraint if exists muro_publicaciones_juego_ok;
alter table public.muro_clips drop constraint if exists muro_clips_juego_ok;
alter table public.muro_publicaciones add constraint muro_publicaciones_juego_ok check (juego is null or juego in ('pes','sp','fifa','eafc','efootball'));
alter table public.muro_clips add constraint muro_clips_juego_ok check (juego is null or juego in ('pes','sp','fifa','eafc','efootball'));
create index if not exists muro_publicaciones_juego_idx on public.muro_publicaciones (juego, id desc) where juego is not null;

-- Los enlaces de video guardados ahora pueden ser también de nuestro Storage (siguen siendo https y ≤ 300 caracteres: los CHECK existentes ya lo cubren).

-- 3) PUBLICAR: cambian las firmas (parámetro p_juego), se reemplazan las funciones.
drop function if exists public.muro_publicar(text, text, text, integer);
create or replace function public.muro_publicar(p_texto text, p_imagen text default null, p_video text default null, p_reto integer default null, p_juego text default null) returns bigint
language plpgsql security definer set search_path = '' as $$
declare yo uuid := private.uid_requerido(); t text := trim(coalesce(p_texto, '')); img text := nullif(trim(coalesce(p_imagen, '')), ''); vid text := nullif(trim(coalesce(p_video, '')), ''); j text := nullif(trim(coalesce(p_juego, '')), ''); nuevo bigint;
begin
  if char_length(t) > 1000 then raise exception 'Máximo 1000 caracteres.'; end if;
  if char_length(t) < 1 and img is null and vid is null and p_reto is null then raise exception 'Escribe algo, sube una foto o un video, pega un enlace de video o adjunta un duelo.'; end if;
  if img is not null and not private.imagen_propia(img, yo) then raise exception 'Esa foto no es válida: súbela desde aquí.'; end if;
  if vid is not null and not (private.video_valido(vid) or private.video_propio(vid, yo)) then raise exception 'Video no válido: sube un archivo desde aquí o usa un enlace de YouTube, TikTok, Kick o Twitch.'; end if;
  if j is not null and j not in ('pes','sp','fifa','eafc','efootball') then raise exception 'Juego no válido.'; end if;
  if p_reto is not null and not private.reto_compartible(p_reto, yo) then raise exception 'Solo puedes adjuntar duelos en los que participaste (aceptados o finalizados).'; end if;
  if (select count(*) from public.muro_publicaciones where autor_id = yo and created_at > now() - interval '1 hour') >= 10 then
    raise exception 'Estás publicando muy rápido: máximo 10 por hora.';
  end if;
  insert into public.muro_publicaciones (autor_id, texto, imagen_url, video_url, reto_id, juego) values (yo, t, img, vid, p_reto, j) returning id into nuevo;
  return nuevo;
end $$;

-- BORRAR publicación: ahora devuelve la LISTA de archivos propios a limpiar (foto y/o video subido) o [] si la borró un admin.
drop function if exists public.muro_borrar(bigint);
create or replace function public.muro_borrar(p_id bigint) returns jsonb
language plpgsql security definer set search_path = '' as $$
declare yo uuid := private.uid_requerido(); img text; vid text; autor uuid;
begin
  delete from public.muro_publicaciones where id = p_id and (autor_id = yo or private.es_admin()) returning imagen_url, video_url, autor_id into img, vid, autor;
  if not found then raise exception 'No encontré esa publicación.'; end if;
  return case when autor = yo then private.archivos_propios(img, vid, yo) else '[]'::jsonb end;
end $$;

-- LEER muro: filtro opcional por juego; cada publicación trae su `juego` y la respuesta trae `juegos` (los segmentos que este muro usa).
drop function if exists public.muro_de(uuid, bigint, integer);
create or replace function public.muro_de(p_usuario uuid, p_antes bigint default null, p_limite integer default 20, p_juego text default null) returns jsonb
language plpgsql stable security definer set search_path = '' as $$
declare yo uuid := (select auth.uid()); n integer := least(greatest(coalesce(p_limite, 20), 1), 50); filas jsonb; mas boolean; usados jsonb; j text := nullif(trim(coalesce(p_juego, '')), '');
begin
  if not private.puede_ver_muro(p_usuario, yo) then return jsonb_build_object('visible', false, 'items', '[]'::jsonb, 'hay_mas', false, 'juegos', '[]'::jsonb); end if;
  select coalesce(jsonb_agg(distinct juego), '[]'::jsonb) into usados from public.muro_publicaciones where autor_id = p_usuario and juego is not null;
  with t as (
    select m.id, m.texto, m.imagen_url, m.video_url, m.juego, m.fijada, m.created_at, m.editada_at,
           case when m.reto_id is null then null else private.reto_resumen(m.reto_id, yo) end as reto,
           (select count(*) from public.muro_respuestas r where r.publicacion_id = m.id) as respuestas,
           (select coalesce(jsonb_object_agg(x.tipo, x.c), '{}'::jsonb) from (select tipo, count(*) as c from public.muro_reacciones where publicacion_id = m.id group by tipo) x) as reacciones,
           (select tipo from public.muro_reacciones where publicacion_id = m.id and usuario_id = yo) as mia,
           row_number() over (order by (case when p_antes is null then m.fijada else false end) desc, m.id desc) as rn
    from public.muro_publicaciones m
    where m.autor_id = p_usuario and (p_antes is null or (m.id < p_antes and not m.fijada)) and (j is null or m.juego = j)
    order by (case when p_antes is null then m.fijada else false end) desc, m.id desc limit n + 1)
  select coalesce(jsonb_agg(jsonb_build_object('id', id, 'texto', texto, 'imagen_url', imagen_url, 'video_url', video_url, 'juego', juego, 'reto', reto, 'fijada', fijada, 'created_at', created_at, 'editada_at', editada_at,
           'respuestas', respuestas, 'reacciones', reacciones, 'mia', mia) order by rn) filter (where rn <= n), '[]'::jsonb),
         count(*) > n into filas, mas from t;
  return jsonb_build_object('visible', true, 'hay_mas', mas, 'items', filas, 'juegos', usados);
end $$;

-- 4) HISTORIAS: el video puede ser subido; al purgar/borrar se devuelven también los videos propios.
create or replace function public.historia_publicar(p_texto text default '', p_imagen text default null, p_video text default null) returns jsonb
language plpgsql security definer set search_path = '' as $$
declare yo uuid := private.uid_requerido(); t text := trim(regexp_replace(coalesce(p_texto, ''), '[<>]', '', 'g')); img text := nullif(trim(coalesce(p_imagen, '')), ''); vid text := nullif(trim(coalesce(p_video, '')), ''); nuevo bigint; viejas jsonb;
begin
  if char_length(t) > 200 then raise exception 'Máximo 200 caracteres en una historia.'; end if;
  if char_length(t) < 1 and img is null and vid is null then raise exception 'Sube una foto o un video, pega un enlace o escribe algo.'; end if;
  if img is not null and not private.imagen_propia(img, yo) then raise exception 'Esa foto no es válida: súbela desde aquí.'; end if;
  if vid is not null and not (private.video_valido(vid) or private.video_propio(vid, yo)) then raise exception 'Video no válido: sube un archivo desde aquí o usa un enlace de YouTube, TikTok, Kick o Twitch.'; end if;
  if (select count(*) from public.muro_historias where autor_id = yo and created_at > now() - interval '24 hours') >= 15 then raise exception 'Máximo 15 historias cada 24 horas.'; end if;
  with b as (delete from public.muro_historias where autor_id = yo and destacada_id is null and created_at < now() - interval '30 days' returning imagen_url, video_url)
    select coalesce(jsonb_agg(u), '[]'::jsonb) into viejas from b cross join lateral unnest(array[b.imagen_url, case when private.video_propio(b.video_url, yo) then b.video_url end]) as u where u is not null;
  insert into public.muro_historias (autor_id, texto, imagen_url, video_url) values (yo, t, img, vid) returning id into nuevo;
  return jsonb_build_object('id', nuevo, 'purgadas', viejas);
end $$;

drop function if exists public.historia_borrar(bigint);
create or replace function public.historia_borrar(p_id bigint) returns jsonb
language plpgsql security definer set search_path = '' as $$
declare yo uuid := private.uid_requerido(); img text; vid text; autor uuid;
begin
  delete from public.muro_historias where id = p_id and (autor_id = yo or private.es_admin()) returning imagen_url, video_url, autor_id into img, vid, autor;
  if not found then raise exception 'No encontré esa historia.'; end if;
  return case when autor = yo then private.archivos_propios(img, vid, yo) else '[]'::jsonb end;
end $$;

-- 5) CLIPS: video subido o enlace + segmento opcional; leer trae `juego` y `juegos`.
drop function if exists public.clip_publicar(text, text);
create or replace function public.clip_publicar(p_titulo text, p_video text, p_juego text default null) returns bigint
language plpgsql security definer set search_path = '' as $$
declare yo uuid := private.uid_requerido(); t text := trim(regexp_replace(coalesce(p_titulo, ''), '[<>]', '', 'g')); vid text := nullif(trim(coalesce(p_video, '')), ''); j text := nullif(trim(coalesce(p_juego, '')), ''); nuevo bigint;
begin
  if char_length(t) > 80 then raise exception 'El título admite máximo 80 caracteres.'; end if;
  if vid is null or not (private.video_valido(vid) or private.video_propio(vid, yo)) then raise exception 'Sube un video o pega un enlace de YouTube, TikTok, Kick o Twitch.'; end if;
  if j is not null and j not in ('pes','sp','fifa','eafc','efootball') then raise exception 'Juego no válido.'; end if;
  if (select count(*) from public.muro_clips where autor_id = yo) >= 60 then raise exception 'Máximo 60 clips: borra alguno para añadir otro.'; end if;
  if (select count(*) from public.muro_clips where autor_id = yo and created_at > now() - interval '1 hour') >= 10 then raise exception 'Estás subiendo muy rápido: máximo 10 clips por hora.'; end if;
  insert into public.muro_clips (autor_id, titulo, video_url, juego) values (yo, t, vid, j) returning id into nuevo;
  return nuevo;
end $$;

drop function if exists public.clip_borrar(bigint);
create or replace function public.clip_borrar(p_id bigint) returns jsonb
language plpgsql security definer set search_path = '' as $$
declare yo uuid := private.uid_requerido(); vid text; autor uuid;
begin
  delete from public.muro_clips where id = p_id and (autor_id = yo or private.es_admin()) returning video_url, autor_id into vid, autor;
  if not found then raise exception 'No encontré ese clip.'; end if;
  return case when autor = yo then private.archivos_propios(null, vid, yo) else '[]'::jsonb end;
end $$;

drop function if exists public.clips_de(uuid, bigint, integer);
create or replace function public.clips_de(p_usuario uuid, p_antes bigint default null, p_limite integer default 24) returns jsonb
language plpgsql stable security definer set search_path = '' as $$
declare yo uuid := (select auth.uid()); n integer := least(greatest(coalesce(p_limite, 24), 1), 50); filas jsonb; mas boolean; usados jsonb;
begin
  if not private.puede_ver_muro(p_usuario, yo) then return jsonb_build_object('visible', false, 'items', '[]'::jsonb, 'hay_mas', false, 'juegos', '[]'::jsonb); end if;
  select coalesce(jsonb_agg(distinct juego), '[]'::jsonb) into usados from public.muro_clips where autor_id = p_usuario and juego is not null;
  with t as (select c.id, c.titulo, c.video_url, c.juego, c.created_at, row_number() over (order by c.id desc) as rn
             from public.muro_clips c where c.autor_id = p_usuario and (p_antes is null or c.id < p_antes) order by c.id desc limit n + 1)
  select coalesce(jsonb_agg(jsonb_build_object('id', id, 'titulo', titulo, 'video_url', video_url, 'juego', juego, 'created_at', created_at) order by rn) filter (where rn <= n), '[]'::jsonb), count(*) > n into filas, mas from t;
  return jsonb_build_object('visible', true, 'hay_mas', mas, 'items', filas, 'juegos', usados);
end $$;

-- 6) COMUNIDAD: publicaciones de TODOS los muros que quien mira puede ver (respeta «solo amigos» y bloqueos), filtrables por juego. Paginación por id.
create or replace function public.muro_comunidad(p_juego text default null, p_antes bigint default null, p_limite integer default 20) returns jsonb
language plpgsql stable security definer set search_path = '' as $$
declare yo uuid := (select auth.uid()); n integer := least(greatest(coalesce(p_limite, 20), 1), 40); j text := nullif(trim(coalesce(p_juego, '')), ''); filas jsonb; mas boolean;
begin
  if j is not null and j not in ('pes','sp','fifa','eafc','efootball') then raise exception 'Juego no válido.'; end if;
  with t as (
    select m.id, m.texto, m.imagen_url, m.video_url, m.juego, m.created_at, m.autor_id,
           case when m.reto_id is null then null else private.reto_resumen(m.reto_id, yo) end as reto,
           (select count(*) from public.muro_respuestas r where r.publicacion_id = m.id) as respuestas,
           (select coalesce(jsonb_object_agg(x.tipo, x.c), '{}'::jsonb) from (select tipo, count(*) as c from public.muro_reacciones where publicacion_id = m.id group by tipo) x) as reacciones,
           row_number() over (order by m.id desc) as rn
    from public.muro_publicaciones m
    where (p_antes is null or m.id < p_antes) and (j is null or m.juego = j) and private.puede_ver_muro(m.autor_id, yo)
    order by m.id desc limit n + 1)
  select coalesce(jsonb_agg(jsonb_build_object('id', t.id, 'texto', t.texto, 'imagen_url', t.imagen_url, 'video_url', t.video_url, 'juego', t.juego, 'reto', t.reto, 'created_at', t.created_at,
           'respuestas', t.respuestas, 'reacciones', t.reacciones,
           'autor', jsonb_build_object('id', pf.id, 'username', pf.username, 'nombre_display', pf.nombre_display, 'avatar_url', pf.avatar_url)) order by t.rn) filter (where t.rn <= n), '[]'::jsonb),
         count(*) > n into filas, mas from t join public.perfiles pf on pf.id = t.autor_id;
  return jsonb_build_object('hay_mas', mas, 'items', filas);
end $$;

-- 7) Permisos.
do $$ declare f text; begin
  foreach f in array array['muro_de(uuid,bigint,integer,text)','clips_de(uuid,bigint,integer)','muro_comunidad(text,bigint,integer)'] loop
    execute format('revoke all on function public.%s from public', f);
    execute format('grant execute on function public.%s to anon, authenticated', f);
  end loop;
  foreach f in array array['muro_publicar(text,text,text,integer,text)','muro_borrar(bigint)','historia_publicar(text,text,text)','historia_borrar(bigint)','clip_publicar(text,text,text)','clip_borrar(bigint)'] loop
    execute format('revoke all on function public.%s from public, anon', f);
    execute format('grant execute on function public.%s to authenticated', f);
  end loop;
end $$;

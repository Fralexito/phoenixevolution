-- 023 · MURO · FASE 3: fotos (banner propio y foto en publicaciones) y enlaces de video. Depende de 021 y 022.
-- Fotos: bucket PÚBLICO `muro` (cualquiera ve las fotos del muro, igual que avatars). Solo se puede SUBIR/BORRAR dentro de tu propia carpeta `<tu-uid>/…`,
-- máx. 1,5 MB y solo JPEG/PNG/WebP (lo exige el bucket). El navegador además las reduce a ~1200 px antes de subirlas.
-- Las RPC aceptan SOLO URLs de ese bucket y de TU carpeta → nadie puede enlazar imágenes externas ni fotos de otra persona.
-- Video: solo enlaces https de YouTube, TikTok, Kick o Twitch (sin subir video: pesa demasiado y es un riesgo de moderación).

insert into storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
values ('muro', 'muro', true, 1572864, array['image/jpeg','image/png','image/webp'])
on conflict (id) do update set public = true, file_size_limit = 1572864, allowed_mime_types = array['image/jpeg','image/png','image/webp'];

drop policy if exists muro_select_propio on storage.objects;
drop policy if exists muro_insert_propio on storage.objects;
drop policy if exists muro_delete_propio on storage.objects;
create policy muro_select_propio on storage.objects for select to authenticated
  using (bucket_id = 'muro' and (storage.foldername(name))[1] = ((select auth.uid()))::text);
create policy muro_insert_propio on storage.objects for insert to authenticated
  with check (bucket_id = 'muro' and (storage.foldername(name))[1] = ((select auth.uid()))::text);
create policy muro_delete_propio on storage.objects for delete to authenticated
  using (bucket_id = 'muro' and (storage.foldername(name))[1] = ((select auth.uid()))::text);

-- Publicaciones: foto y/o video opcionales; el texto puede quedar vacío si hay foto o video.
alter table public.muro_publicaciones add column if not exists imagen_url text;
alter table public.muro_publicaciones add column if not exists video_url text;
alter table public.muro_publicaciones drop constraint if exists muro_publicaciones_texto_check;
alter table public.muro_publicaciones drop constraint if exists muro_publicaciones_contenido_ok;
alter table public.muro_publicaciones add constraint muro_publicaciones_contenido_ok check (
  char_length(texto) <= 1000 and (char_length(texto) >= 1 or imagen_url is not null or video_url is not null)
  and (imagen_url is null or (imagen_url ~ '^https://' and char_length(imagen_url) <= 300))
  and (video_url is null or (video_url ~ '^https://' and char_length(video_url) <= 300)));

-- ¿`p_url` es un enlace de video permitido?
create or replace function private.video_valido(p_url text) returns boolean
language sql immutable set search_path = '' as $$
  select p_url ~* '^https://(www\.|m\.)?(youtube\.com/(watch\?v=|shorts/|live/)|youtu\.be/|tiktok\.com/|vm\.tiktok\.com/|kick\.com/|twitch\.tv/|clips\.twitch\.tv/)[^\s<>"'']{1,200}$'
$$;
revoke all on function private.video_valido(text) from public, anon, authenticated;

-- ¿`p_url` es una foto del bucket `muro` dentro de la carpeta de `p_uid`?
create or replace function private.imagen_propia(p_url text, p_uid uuid) returns boolean
language sql immutable set search_path = '' as $$
  select p_url ~ ('^https://[a-z0-9.-]+/storage/v1/object/public/muro/' || p_uid::text || '/[A-Za-z0-9._-]{1,80}$')
$$;
revoke all on function private.imagen_propia(text, uuid) from public, anon, authenticated;

-- Las firmas cambian (parámetros nuevos / valor devuelto): se reemplazan las funciones.
drop function if exists public.muro_publicar(text);
drop function if exists public.muro_borrar(bigint);

create or replace function public.muro_publicar(p_texto text, p_imagen text default null, p_video text default null) returns bigint
language plpgsql security definer set search_path = '' as $$
declare yo uuid := private.uid_requerido(); t text := trim(coalesce(p_texto, '')); img text := nullif(trim(coalesce(p_imagen, '')), ''); vid text := nullif(trim(coalesce(p_video, '')), ''); nuevo bigint;
begin
  if char_length(t) > 1000 then raise exception 'Máximo 1000 caracteres.'; end if;
  if char_length(t) < 1 and img is null and vid is null then raise exception 'Escribe algo, sube una foto o pega un enlace de video.'; end if;
  if img is not null and not private.imagen_propia(img, yo) then raise exception 'Esa foto no es válida: súbela desde aquí.'; end if;
  if vid is not null and not private.video_valido(vid) then raise exception 'Solo se aceptan enlaces de YouTube, TikTok, Kick o Twitch.'; end if;
  if (select count(*) from public.muro_publicaciones where autor_id = yo and created_at > now() - interval '1 hour') >= 10 then
    raise exception 'Estás publicando muy rápido: máximo 10 por hora.';
  end if;
  insert into public.muro_publicaciones (autor_id, texto, imagen_url, video_url) values (yo, t, img, vid) returning id into nuevo;
  return nuevo;
end $$;

-- Editar solo cambia el texto (la foto/video no se cambian: se borra y se publica de nuevo). El texto puede quedar vacío si hay foto o video.
create or replace function public.muro_editar(p_id bigint, p_texto text) returns void
language plpgsql security definer set search_path = '' as $$
declare yo uuid := private.uid_requerido(); t text := trim(coalesce(p_texto, ''));
begin
  if char_length(t) > 1000 then raise exception 'Máximo 1000 caracteres.'; end if;
  update public.muro_publicaciones set texto = t, editada_at = now()
   where id = p_id and autor_id = yo and (char_length(t) >= 1 or imagen_url is not null or video_url is not null);
  if not found then raise exception 'No pude editar: revisa que la publicación sea tuya y no quede vacía.'; end if;
end $$;

-- Devuelve la URL de la foto borrada para que el navegador limpie el archivo del Storage (si la borró su dueño; SQL no puede borrar archivos).
create or replace function public.muro_borrar(p_id bigint) returns text
language plpgsql security definer set search_path = '' as $$
declare yo uuid := private.uid_requerido(); img text; autor uuid;
begin
  delete from public.muro_publicaciones where id = p_id and (autor_id = yo or private.es_admin()) returning imagen_url, autor_id into img, autor;
  if not found then raise exception 'No encontré esa publicación.'; end if;
  return case when autor = yo then img end;
end $$;

-- Estilo: el banner puede ser preset o una foto SUBIDA POR MÍ (carpeta propia del bucket muro).
create or replace function public.muro_guardar_estilo(p_banner text, p_acento text, p_lema text) returns void
language plpgsql security definer set search_path = '' as $$
declare yo uuid := private.uid_requerido(); b text := nullif(trim(coalesce(p_banner, '')), '');
begin
  if b is not null and b ~ '^https://' and not private.imagen_propia(b, yo) then raise exception 'Ese banner no es válido: súbelo desde aquí.'; end if;
  update public.perfiles set muro_banner = b, muro_acento = nullif(trim(coalesce(p_acento, '')), ''),
    muro_lema = nullif(trim(regexp_replace(coalesce(p_lema, ''), '[<>]', '', 'g')), '') where id = yo;
end $$;

-- muro_de: ahora también devuelve foto y video de cada publicación.
create or replace function public.muro_de(p_usuario uuid, p_antes bigint default null, p_limite integer default 20) returns jsonb
language plpgsql stable security definer set search_path = '' as $$
declare yo uuid := (select auth.uid()); n integer := least(greatest(coalesce(p_limite, 20), 1), 50); filas jsonb; mas boolean;
begin
  if not private.puede_ver_muro(p_usuario, yo) then return jsonb_build_object('visible', false, 'items', '[]'::jsonb, 'hay_mas', false); end if;
  with t as (
    select m.id, m.texto, m.imagen_url, m.video_url, m.fijada, m.created_at, m.editada_at,
           (select count(*) from public.muro_respuestas r where r.publicacion_id = m.id) as respuestas,
           (select coalesce(jsonb_object_agg(x.tipo, x.c), '{}'::jsonb) from (select tipo, count(*) as c from public.muro_reacciones where publicacion_id = m.id group by tipo) x) as reacciones,
           (select tipo from public.muro_reacciones where publicacion_id = m.id and usuario_id = yo) as mia,
           row_number() over (order by (case when p_antes is null then m.fijada else false end) desc, m.id desc) as rn
    from public.muro_publicaciones m
    where m.autor_id = p_usuario and (p_antes is null or (m.id < p_antes and not m.fijada))
    order by (case when p_antes is null then m.fijada else false end) desc, m.id desc limit n + 1)
  select coalesce(jsonb_agg(jsonb_build_object('id', id, 'texto', texto, 'imagen_url', imagen_url, 'video_url', video_url, 'fijada', fijada, 'created_at', created_at, 'editada_at', editada_at,
           'respuestas', respuestas, 'reacciones', reacciones, 'mia', mia) order by rn) filter (where rn <= n), '[]'::jsonb),
         count(*) > n into filas, mas from t;
  return jsonb_build_object('visible', true, 'hay_mas', mas, 'items', filas);
end $$;

revoke all on function public.muro_publicar(text, text, text), public.muro_borrar(bigint) from public, anon;
grant execute on function public.muro_publicar(text, text, text), public.muro_borrar(bigint) to authenticated;

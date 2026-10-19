-- 133 · Publicar como en una red social (19-oct-2026, Fralex: «que la sección para publicar sea más personalizable y con más libertad…
--       agarra todas las características de otras redes sociales»). Aditiva: nada existente cambia de forma.
--   · muro_publicaciones.extra (jsonb, opcional): { fondo, sentimiento, fotos[] } — fondo de color para textos cortos (Facebook),
--     «cómo te sientes / qué haces» (Facebook) y hasta 3 fotos más además de imagen_url (carrusel de Instagram).
--   · muro_publicar_completo(...) = muro_publicar (MISMAS reglas: límite por hora, juego, foto propia…) + guarda el extra ya saneado.
--   · muro_extras_de(ids[]) = el extra de las publicaciones que puedes ver (el feed lo pide aparte, igual que encuestas_de).
--   · muro_borrar ahora también devuelve las fotos extra propias, para limpiarlas del Storage.
-- Deshacer: drop function public.muro_extras_de(bigint[]); drop function public.muro_publicar_completo(text,text,text,integer,text,jsonb);
--           drop function private.muro_extra_limpio(jsonb,uuid); restaurar muro_borrar de 027; alter table public.muro_publicaciones drop column extra;

alter table public.muro_publicaciones add column if not exists extra jsonb;

-- Deja solo lo permitido: ids cortos (a-z, 0-9, guion) y fotos que sean TUYAS en el bucket «muro» (máx. 3). Si no queda nada, null.
create or replace function private.muro_extra_limpio(p_extra jsonb, p_uid uuid) returns jsonb
language plpgsql immutable set search_path to '' as $$
declare r jsonb := '{}'::jsonb; f text; fotos jsonb := '[]'::jsonb;
begin
  if p_extra is null or jsonb_typeof(p_extra) <> 'object' then return null; end if;
  if coalesce(p_extra->>'fondo', '') ~ '^[a-z0-9-]{1,24}$' then r := r || jsonb_build_object('fondo', p_extra->>'fondo'); end if;
  if coalesce(p_extra->>'sentimiento', '') ~ '^[a-z0-9-]{1,24}$' then r := r || jsonb_build_object('sentimiento', p_extra->>'sentimiento'); end if;
  if jsonb_typeof(p_extra->'fotos') = 'array' then
    for f in select x from jsonb_array_elements_text(p_extra->'fotos') as x limit 3 loop
      if private.imagen_propia(f, p_uid) then fotos := fotos || to_jsonb(f); end if;
    end loop;
    if jsonb_array_length(fotos) > 0 then r := r || jsonb_build_object('fotos', fotos); end if;
  end if;
  return case when r = '{}'::jsonb then null else r end;
end $$;

create or replace function public.muro_publicar_completo(p_texto text, p_imagen text default null, p_video text default null, p_reto integer default null,
  p_juego text default null, p_extra jsonb default null) returns bigint
language plpgsql security definer set search_path to '' as $$
declare yo uuid := private.uid_requerido(); nuevo bigint; ex jsonb := private.muro_extra_limpio(p_extra, yo);
begin
  if ex ? 'fotos' and nullif(trim(coalesce(p_imagen, '')), '') is null then raise exception 'Las fotos extra van junto a una foto principal.'; end if;
  nuevo := public.muro_publicar(p_texto, p_imagen, p_video, p_reto, p_juego);
  if ex is not null then update public.muro_publicaciones set extra = ex where id = nuevo and autor_id = yo; end if;
  return nuevo;
end $$;

create or replace function public.muro_extras_de(p_publicaciones bigint[]) returns jsonb
language sql stable security definer set search_path to '' as $$
  select coalesce(jsonb_object_agg(m.id::text, m.extra), '{}'::jsonb)
  from public.muro_publicaciones m
  where m.id = any ((coalesce(p_publicaciones, '{}'::bigint[]))[1:200]) and m.extra is not null and not m.oculto
    and private.puede_ver_muro(m.autor_id, (select auth.uid()))
$$;

create or replace function public.muro_borrar(p_id bigint) returns jsonb
language plpgsql security definer set search_path to '' as $$
declare yo uuid := private.uid_requerido(); img text; vid text; autor uuid; ex jsonb;
begin
  delete from public.muro_publicaciones where id = p_id and (autor_id = yo or private.es_admin()) returning imagen_url, video_url, autor_id, extra into img, vid, autor, ex;
  if not found then raise exception 'No encontré esa publicación.'; end if;
  if autor <> yo then return '[]'::jsonb; end if;
  return private.archivos_propios(img, vid, yo)
    || coalesce((select jsonb_agg(f) from jsonb_array_elements_text(coalesce(ex->'fotos', '[]'::jsonb)) as f where private.imagen_propia(f, yo)), '[]'::jsonb);
end $$;

revoke all on function public.muro_publicar_completo(text, text, text, integer, text, jsonb) from public, anon;
grant execute on function public.muro_publicar_completo(text, text, text, integer, text, jsonb) to authenticated;
grant execute on function public.muro_extras_de(bigint[]) to anon, authenticated;

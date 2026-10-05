-- 026 · MURO: (1) reacciones con CUALQUIER emoji de la paleta · (2) hosting con VARIOS juegos y parches + interruptor «mostrar en mi perfil». Depende de 021-025.

-- 1) REACCIONES. Antes: 5 claves fijas ('fuego', 'gg'…). Ahora el `tipo` ES el emoji. Las reacciones que ya existían se convierten.
alter table public.muro_reacciones drop constraint if exists muro_reacciones_tipo_check;
update public.muro_reacciones set tipo = case tipo when 'fuego' then '🔥' when 'gg' then '🤝' when 'aplauso' then '👏' when 'risa' then '😂' when 'corazon' then '❤️' else tipo end
  where tipo in ('fuego','gg','aplauso','risa','corazon');
-- Un emoji = 1 a 16 caracteres que NO sean ASCII imprimible (así no caben letras, números ni < > & " ').
alter table public.muro_reacciones add constraint muro_reacciones_tipo_check check (tipo ~ '^[^ -~]{1,16}$');

create or replace function public.muro_reaccionar(p_publicacion bigint, p_tipo text) returns text
language plpgsql security definer set search_path = '' as $$
declare yo uuid := private.uid_requerido(); dueno uuid; previa text; t text := trim(coalesce(p_tipo, ''));
begin
  if t !~ '^[^ -~]{1,16}$' then raise exception 'Elige un emoji de la lista.'; end if;
  select autor_id into dueno from public.muro_publicaciones where id = p_publicacion;
  if dueno is null then raise exception 'Esa publicación ya no existe.'; end if;
  if not private.puede_responder_muro(dueno, yo) then raise exception 'No puedes reaccionar en este muro.'; end if;
  select tipo into previa from public.muro_reacciones where publicacion_id = p_publicacion and usuario_id = yo;
  if previa = t then delete from public.muro_reacciones where publicacion_id = p_publicacion and usuario_id = yo; return null; end if;
  insert into public.muro_reacciones (publicacion_id, usuario_id, tipo) values (p_publicacion, yo, t)
  on conflict (publicacion_id, usuario_id) do update set tipo = excluded.tipo, created_at = now();
  return t;
end $$;
revoke all on function public.muro_reaccionar(bigint, text) from public, anon;
grant execute on function public.muro_reaccionar(bigint, text) to authenticated;

-- 2) HOSTING. host_catalogo = [{"juego":"PES 2021","opciones":["Dream Patch","VirtuaRED"]}, {"juego":"SP Football Life","opciones":["26","27"]}, …]
--    (máx. 5 juegos, 8 opciones por juego). host_visible = mostrar el hosting en mi perfil público.
--    Las columnas antiguas (host_juego, host_parche, host_sp_version, host_extras) NO se borran: la web las usa solo para precargar el catálogo la primera vez.
alter table public.perfiles add column if not exists host_catalogo jsonb not null default '[]'::jsonb;
alter table public.perfiles add column if not exists host_visible boolean not null default true;
do $$ begin
  if not exists (select 1 from pg_constraint where conname = 'perfiles_host_catalogo_ok') then
    alter table public.perfiles add constraint perfiles_host_catalogo_ok check (
      jsonb_typeof(host_catalogo) = 'array' and jsonb_array_length(host_catalogo) <= 5 and char_length(host_catalogo::text) <= 1500 and host_catalogo::text !~ '[<>]');
  end if;
end $$;
grant select (host_catalogo, host_visible) on public.perfiles to anon, authenticated;   -- la escritura solo la hace muro_guardar_host (no hay grant de update)

-- Guarda mi hosting: plataforma, catálogo (se REARMA aquí: solo juegos conocidos, sin repetir, opciones limpias) y visibilidad.
create or replace function public.muro_guardar_host(p_software text, p_catalogo jsonb, p_visible boolean) returns jsonb
language plpgsql security definer set search_path = '' as $$
declare yo uuid := private.uid_requerido(); soft text := coalesce(nullif(trim(p_software), ''), 'Ambos'); limpio jsonb := '[]'::jsonb; j jsonb; nombre text; ops jsonb; o jsonb; txt text;
        juegos text[] := array['PES 2021','SP Football Life','eFootball','FIFA','EA FC']; vistos text[] := '{}';
begin
  if soft not in ('Ambos','Smash Soda','Parsec') then raise exception 'Plataforma no válida.'; end if;
  if p_catalogo is null or jsonb_typeof(p_catalogo) <> 'array' then raise exception 'Formato de hosting no válido.'; end if;
  for j in select * from jsonb_array_elements(p_catalogo) loop
    nombre := j->>'juego';
    if nombre is null or not (nombre = any(juegos)) or nombre = any(vistos) then continue; end if;
    vistos := vistos || nombre; ops := '[]'::jsonb;
    if jsonb_typeof(j->'opciones') = 'array' then
      for o in select * from jsonb_array_elements(j->'opciones') loop
        if jsonb_typeof(o) <> 'string' then continue; end if;
        txt := left(trim(regexp_replace(o #>> '{}', '[<>]', '', 'g')), 40);
        if char_length(txt) >= 1 and not ops @> to_jsonb(txt) and jsonb_array_length(ops) < 8 then ops := ops || to_jsonb(txt); end if;
      end loop;
    end if;
    limpio := limpio || jsonb_build_object('juego', nombre, 'opciones', ops);
  end loop;
  update public.perfiles set software_host = soft, host_catalogo = limpio, host_visible = coalesce(p_visible, true) where id = yo;
  return limpio;
end $$;
revoke all on function public.muro_guardar_host(text, jsonb, boolean) from public, anon;
grant execute on function public.muro_guardar_host(text, jsonb, boolean) to authenticated;

-- 3) Perfil público: devuelve el catálogo y la visibilidad. Si el dueño ocultó su hosting, los demás NO reciben ningún dato de host (solo él).
create or replace function public.perfil_publico(p_usuario text) returns jsonb
language plpgsql stable security definer set search_path = '' as $$
declare yo uuid := (select auth.uid()); p public.perfiles%rowtype; priv public.privacidad_social%rowtype; ver boolean;
begin
  select * into p from public.perfiles where lower(username) = lower(trim(coalesce(p_usuario, '')));
  if not found then return null; end if;
  if yo is not null and yo <> p.id and private.hay_bloqueo(yo, p.id) then return null; end if;
  select * into priv from public.privacidad_social where usuario_id = p.id;
  ver := p.host_visible or (yo is not null and yo = p.id);
  return jsonb_build_object(
    'id', p.id, 'username', p.username, 'nombre_display', p.nombre_display, 'avatar_url', p.avatar_url, 'bio', p.bio,
    'club_favorito', p.club_favorito, 'pais_codigo', p.pais_codigo, 'posicion_preferida', p.posicion_preferida, 'pie_habil', p.pie_habil,
    'puede_hostear', p.puede_hostear and ver, 'software_host', case when ver then p.software_host end, 'host_juego', case when ver then p.host_juego end,
    'host_parche', case when ver then p.host_parche end, 'host_sp_version', case when ver then p.host_sp_version end,
    'host_extras', case when ver then p.host_extras else '[]'::jsonb end, 'host_catalogo', case when ver then p.host_catalogo else '[]'::jsonb end,
    'host_visible', p.host_visible, 'stream_url', p.stream_url,
    'reputacion_puntos', p.reputacion_puntos, 'rango_fairplay', p.rango_fairplay, 'partidos_jugados', p.partidos_jugados,
    'muro_banner', p.muro_banner, 'muro_acento', p.muro_acento, 'muro_lema', p.muro_lema, 'created_at', p.created_at,
    'ficha_id', (select j.id::text from public.jugadores j where j.perfil_id = p.id limit 1),
    'soy_yo', yo is not null and yo = p.id,
    'puede_ver_muro', private.puede_ver_muro(p.id, yo),
    'puede_responder', private.puede_responder_muro(p.id, yo),
    'muro_ver', case when yo = p.id then coalesce(priv.muro_ver, 'PUBLICO') end,
    'muro_responder', case when yo = p.id then coalesce(priv.muro_responder, 'TODOS') end);
end $$;

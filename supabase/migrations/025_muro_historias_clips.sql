-- 025 · MURO · FASES 5-7: HISTORIAS (24 h), DESTACADAS, CLIPS (estilo reels) y enlace a la CARTA. Depende de 021-024.
-- Mismo principio que el resto: tablas cerradas (RLS activada, sin permisos); TODO pasa por funciones `security definer`.
--  · Historia: foto (bucket `muro`, carpeta propia) y/o enlace de video y/o texto corto. Se ve 24 h. Pasado ese tiempo desaparece del perfil
--    público, pero sigue en TU «archivo» (30 días) para poder destacarla. Una historia dentro de una destacada no caduca.
--  · Destacada: carpeta con título (máx. 24). Máx. 8 por perfil y 30 historias en cada una.
--  · Clip: enlace de video (YouTube/TikTok/Kick/Twitch) con título. Máx. 60 por perfil.
--  · Quién ve todo esto = quien puede ver tu muro (private.puede_ver_muro): respeta «solo amigos» y bloqueos.

-- 1) Destacadas (se crean antes porque las historias las referencian).
create table if not exists public.muro_destacadas (
  id bigint generated always as identity primary key,
  autor_id uuid not null references auth.users(id) on delete cascade,
  titulo text not null check (char_length(titulo) between 1 and 24 and titulo !~ '[<>]'),
  created_at timestamptz not null default now()
);
create index if not exists muro_destacadas_autor_idx on public.muro_destacadas (autor_id, id);

-- 2) Historias.
create table if not exists public.muro_historias (
  id bigint generated always as identity primary key,
  autor_id uuid not null references auth.users(id) on delete cascade,
  texto text not null default '' check (char_length(texto) <= 200 and texto !~ '[<>]'),
  imagen_url text check (imagen_url is null or (imagen_url ~ '^https://' and char_length(imagen_url) <= 300)),
  video_url text check (video_url is null or (video_url ~ '^https://' and char_length(video_url) <= 300)),
  destacada_id bigint references public.muro_destacadas(id) on delete set null,
  created_at timestamptz not null default now(),
  expira_at timestamptz not null default now() + interval '24 hours',
  constraint muro_historias_contenido_ok check (char_length(texto) >= 1 or imagen_url is not null or video_url is not null)
);
create index if not exists muro_historias_autor_idx on public.muro_historias (autor_id, id desc);

-- 3) Clips.
create table if not exists public.muro_clips (
  id bigint generated always as identity primary key,
  autor_id uuid not null references auth.users(id) on delete cascade,
  titulo text not null default '' check (char_length(titulo) <= 80 and titulo !~ '[<>]'),
  video_url text not null check (video_url ~ '^https://' and char_length(video_url) <= 300),
  created_at timestamptz not null default now()
);
create index if not exists muro_clips_autor_idx on public.muro_clips (autor_id, id desc);

alter table public.muro_destacadas enable row level security;
alter table public.muro_historias enable row level security;
alter table public.muro_clips enable row level security;
revoke all on public.muro_destacadas, public.muro_historias, public.muro_clips from anon, authenticated;

-- 4) Perfil público: ahora también devuelve `ficha_id` (la carta del jugador vinculada a esta cuenta, o null).
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
    'ficha_id', (select j.id::text from public.jugadores j where j.perfil_id = p.id limit 1),
    'soy_yo', yo is not null and yo = p.id,
    'puede_ver_muro', private.puede_ver_muro(p.id, yo),
    'puede_responder', private.puede_responder_muro(p.id, yo),
    'muro_ver', case when yo = p.id then coalesce(priv.muro_ver, 'PUBLICO') end,
    'muro_responder', case when yo = p.id then coalesce(priv.muro_responder, 'TODOS') end);
end $$;

-- 5) HISTORIAS · lectura. Visitantes: las vigentes (24 h) o las que están en una destacada. Dueño: además su archivo (30 días).
--    Devuelve { visible, historias:[...vigentes], destacadas:[{id,titulo,historias:[...]}], archivo:[...solo dueño] }.
create or replace function public.historias_de(p_usuario uuid) returns jsonb
language plpgsql stable security definer set search_path = '' as $$
declare yo uuid := (select auth.uid()); soy boolean := yo is not null and yo = p_usuario; vigentes jsonb; dest jsonb; arch jsonb;
begin
  if not private.puede_ver_muro(p_usuario, yo) then return jsonb_build_object('visible', false, 'historias', '[]'::jsonb, 'destacadas', '[]'::jsonb, 'archivo', '[]'::jsonb); end if;
  select coalesce(jsonb_agg(jsonb_build_object('id', h.id, 'texto', h.texto, 'imagen_url', h.imagen_url, 'video_url', h.video_url, 'created_at', h.created_at, 'expira_at', h.expira_at, 'destacada_id', h.destacada_id) order by h.id), '[]'::jsonb)
    into vigentes from public.muro_historias h where h.autor_id = p_usuario and h.expira_at > now();
  select coalesce(jsonb_agg(jsonb_build_object('id', d.id, 'titulo', d.titulo, 'historias', coalesce((
      select jsonb_agg(jsonb_build_object('id', h.id, 'texto', h.texto, 'imagen_url', h.imagen_url, 'video_url', h.video_url, 'created_at', h.created_at) order by h.id)
      from public.muro_historias h where h.destacada_id = d.id), '[]'::jsonb)) order by d.id), '[]'::jsonb)
    into dest from public.muro_destacadas d where d.autor_id = p_usuario;
  if soy then
    select coalesce(jsonb_agg(jsonb_build_object('id', h.id, 'texto', h.texto, 'imagen_url', h.imagen_url, 'video_url', h.video_url, 'created_at', h.created_at, 'destacada_id', h.destacada_id) order by h.id desc), '[]'::jsonb)
      into arch from public.muro_historias h where h.autor_id = yo and h.expira_at <= now() and h.destacada_id is null;
  else arch := '[]'::jsonb; end if;
  return jsonb_build_object('visible', true, 'historias', vigentes, 'destacadas', dest, 'archivo', arch);
end $$;

-- 6) HISTORIAS · escritura (solo sobre lo mío).
-- Devuelve { id, purgadas:[urls] }: al publicar se borran mis historias de más de 30 días que no están destacadas; el navegador limpia sus fotos del Storage.
create or replace function public.historia_publicar(p_texto text default '', p_imagen text default null, p_video text default null) returns jsonb
language plpgsql security definer set search_path = '' as $$
declare yo uuid := private.uid_requerido(); t text := trim(regexp_replace(coalesce(p_texto, ''), '[<>]', '', 'g')); img text := nullif(trim(coalesce(p_imagen, '')), ''); vid text := nullif(trim(coalesce(p_video, '')), ''); nuevo bigint; viejas jsonb;
begin
  if char_length(t) > 200 then raise exception 'Máximo 200 caracteres en una historia.'; end if;
  if char_length(t) < 1 and img is null and vid is null then raise exception 'Sube una foto, pega un enlace de video o escribe algo.'; end if;
  if img is not null and not private.imagen_propia(img, yo) then raise exception 'Esa foto no es válida: súbela desde aquí.'; end if;
  if vid is not null and not private.video_valido(vid) then raise exception 'Solo se aceptan enlaces de YouTube, TikTok, Kick o Twitch.'; end if;
  if (select count(*) from public.muro_historias where autor_id = yo and created_at > now() - interval '24 hours') >= 15 then raise exception 'Máximo 15 historias cada 24 horas.'; end if;
  with b as (delete from public.muro_historias where autor_id = yo and destacada_id is null and created_at < now() - interval '30 days' returning imagen_url)
    select coalesce(jsonb_agg(imagen_url) filter (where imagen_url is not null), '[]'::jsonb) into viejas from b;
  insert into public.muro_historias (autor_id, texto, imagen_url, video_url) values (yo, t, img, vid) returning id into nuevo;
  return jsonb_build_object('id', nuevo, 'purgadas', viejas);
end $$;

-- Borra una historia mía. Devuelve la URL de su foto (para limpiar el Storage), salvo que otra publicación del muro la use.
create or replace function public.historia_borrar(p_id bigint) returns text
language plpgsql security definer set search_path = '' as $$
declare yo uuid := private.uid_requerido(); img text;
begin
  delete from public.muro_historias where id = p_id and (autor_id = yo or private.es_admin()) returning case when autor_id = yo then imagen_url end into img;
  if not found then raise exception 'No encontré esa historia.'; end if;
  return img;
end $$;

-- 7) DESTACADAS.
-- Crea una destacada con título y las historias elegidas (solo mías). Máx. 8 destacadas y 30 historias por destacada.
create or replace function public.destacada_crear(p_titulo text, p_historias bigint[]) returns bigint
language plpgsql security definer set search_path = '' as $$
declare yo uuid := private.uid_requerido(); t text := trim(regexp_replace(coalesce(p_titulo, ''), '[<>]', '', 'g')); nueva bigint; n integer;
begin
  if char_length(t) < 1 or char_length(t) > 24 then raise exception 'El título debe tener entre 1 y 24 caracteres.'; end if;
  if (select count(*) from public.muro_destacadas where autor_id = yo) >= 8 then raise exception 'Máximo 8 destacadas.'; end if;
  if coalesce(array_length(p_historias, 1), 0) < 1 then raise exception 'Elige al menos una historia.'; end if;
  if array_length(p_historias, 1) > 30 then raise exception 'Máximo 30 historias por destacada.'; end if;
  insert into public.muro_destacadas (autor_id, titulo) values (yo, t) returning id into nueva;
  update public.muro_historias set destacada_id = nueva where autor_id = yo and id = any(p_historias);
  get diagnostics n = row_count;
  if n < 1 then raise exception 'Esas historias no son tuyas o ya no existen.'; end if;
  return nueva;
end $$;

-- Añade historias mías a una destacada mía (máx. 30 en total).
create or replace function public.destacada_agregar(p_destacada bigint, p_historias bigint[]) returns void
language plpgsql security definer set search_path = '' as $$
declare yo uuid := private.uid_requerido(); n integer;
begin
  if not exists (select 1 from public.muro_destacadas where id = p_destacada and autor_id = yo) then raise exception 'No encontré esa destacada.'; end if;
  if (select count(*) from public.muro_historias where destacada_id = p_destacada) + coalesce(array_length(p_historias, 1), 0) > 30 then raise exception 'Máximo 30 historias por destacada.'; end if;
  update public.muro_historias set destacada_id = p_destacada where autor_id = yo and id = any(p_historias);
  get diagnostics n = row_count;
  if n < 1 then raise exception 'Esas historias no son tuyas o ya no existen.'; end if;
end $$;

-- Quita una historia de su destacada (vuelve al archivo; si ya caducó, desaparecerá del perfil).
create or replace function public.destacada_quitar_historia(p_historia bigint) returns void
language plpgsql security definer set search_path = '' as $$
declare yo uuid := private.uid_requerido();
begin
  update public.muro_historias set destacada_id = null where id = p_historia and autor_id = yo;
  if not found then raise exception 'No encontré esa historia.'; end if;
end $$;

-- Renombra una destacada mía.
create or replace function public.destacada_renombrar(p_id bigint, p_titulo text) returns void
language plpgsql security definer set search_path = '' as $$
declare yo uuid := private.uid_requerido(); t text := trim(regexp_replace(coalesce(p_titulo, ''), '[<>]', '', 'g'));
begin
  if char_length(t) < 1 or char_length(t) > 24 then raise exception 'El título debe tener entre 1 y 24 caracteres.'; end if;
  update public.muro_destacadas set titulo = t where id = p_id and autor_id = yo;
  if not found then raise exception 'No encontré esa destacada.'; end if;
end $$;

-- Borra una destacada mía; sus historias vuelven al archivo (no se pierden).
create or replace function public.destacada_borrar(p_id bigint) returns void
language plpgsql security definer set search_path = '' as $$
declare yo uuid := private.uid_requerido();
begin
  delete from public.muro_destacadas where id = p_id and autor_id = yo;
  if not found then raise exception 'No encontré esa destacada.'; end if;
end $$;

-- 8) CLIPS.
create or replace function public.clips_de(p_usuario uuid, p_antes bigint default null, p_limite integer default 24) returns jsonb
language plpgsql stable security definer set search_path = '' as $$
declare yo uuid := (select auth.uid()); n integer := least(greatest(coalesce(p_limite, 24), 1), 50); filas jsonb; mas boolean;
begin
  if not private.puede_ver_muro(p_usuario, yo) then return jsonb_build_object('visible', false, 'items', '[]'::jsonb, 'hay_mas', false); end if;
  with t as (select c.id, c.titulo, c.video_url, c.created_at, row_number() over (order by c.id desc) as rn
             from public.muro_clips c where c.autor_id = p_usuario and (p_antes is null or c.id < p_antes) order by c.id desc limit n + 1)
  select coalesce(jsonb_agg(jsonb_build_object('id', id, 'titulo', titulo, 'video_url', video_url, 'created_at', created_at) order by rn) filter (where rn <= n), '[]'::jsonb), count(*) > n into filas, mas from t;
  return jsonb_build_object('visible', true, 'hay_mas', mas, 'items', filas);
end $$;

create or replace function public.clip_publicar(p_titulo text, p_video text) returns bigint
language plpgsql security definer set search_path = '' as $$
declare yo uuid := private.uid_requerido(); t text := trim(regexp_replace(coalesce(p_titulo, ''), '[<>]', '', 'g')); vid text := nullif(trim(coalesce(p_video, '')), ''); nuevo bigint;
begin
  if char_length(t) > 80 then raise exception 'El título admite máximo 80 caracteres.'; end if;
  if vid is null or not private.video_valido(vid) then raise exception 'Pega un enlace de YouTube, TikTok, Kick o Twitch.'; end if;
  if (select count(*) from public.muro_clips where autor_id = yo) >= 60 then raise exception 'Máximo 60 clips: borra alguno para añadir otro.'; end if;
  if (select count(*) from public.muro_clips where autor_id = yo and created_at > now() - interval '1 hour') >= 10 then raise exception 'Estás subiendo muy rápido: máximo 10 clips por hora.'; end if;
  insert into public.muro_clips (autor_id, titulo, video_url) values (yo, t, vid) returning id into nuevo;
  return nuevo;
end $$;

create or replace function public.clip_borrar(p_id bigint) returns void
language plpgsql security definer set search_path = '' as $$
declare yo uuid := private.uid_requerido();
begin
  delete from public.muro_clips where id = p_id and (autor_id = yo or private.es_admin());
  if not found then raise exception 'No encontré ese clip.'; end if;
end $$;

-- 9) Permisos: lectura para todos (la propia función aplica privacidad y bloqueos); escritura solo con sesión.
do $$ declare f text; begin
  foreach f in array array['historias_de(uuid)','clips_de(uuid,bigint,integer)'] loop
    execute format('revoke all on function public.%s from public', f);
    execute format('grant execute on function public.%s to anon, authenticated', f);
  end loop;
  foreach f in array array['historia_publicar(text,text,text)','historia_borrar(bigint)','destacada_crear(text,bigint[])','destacada_agregar(bigint,bigint[])',
                           'destacada_quitar_historia(bigint)','destacada_renombrar(bigint,text)','destacada_borrar(bigint)','clip_publicar(text,text)','clip_borrar(bigint)'] loop
    execute format('revoke all on function public.%s from public, anon', f);
    execute format('grant execute on function public.%s to authenticated', f);
  end loop;
end $$;

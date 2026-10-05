-- 024 · MURO · FASE 4: adjuntar un DUELO verificado a una publicación. Depende de 021-023 y de 003 (retos_matchmaking, reto_participantes).
-- El duelo NO lo escribe el usuario: la tarjeta (rival, formato, plataforma, estado, fecha) se arma EN EL SERVIDOR desde la tabla de retos,
-- así nadie puede inventar un partido. Solo puedes adjuntar duelos en los que participaste (retador, rival, host o jugador del equipo)
-- y que estén ACEPTADO, EN_JUEGO o FINALIZADO. Si hay bloqueo entre quien mira y un jugador del duelo, su nombre se oculta («Jugador»).
-- (La BD de retos aún no guarda marcadores, por eso la tarjeta no muestra goles: no se muestra nada que no esté verificado.)

alter table public.muro_publicaciones add column if not exists reto_id integer references public.retos_matchmaking(id) on delete cascade;
alter table public.muro_publicaciones drop constraint if exists muro_publicaciones_contenido_ok;
alter table public.muro_publicaciones add constraint muro_publicaciones_contenido_ok check (
  char_length(texto) <= 1000 and (char_length(texto) >= 1 or imagen_url is not null or video_url is not null or reto_id is not null)
  and (imagen_url is null or (imagen_url ~ '^https://' and char_length(imagen_url) <= 300))
  and (video_url is null or (video_url ~ '^https://' and char_length(video_url) <= 300)));

-- Persona para mostrar: nombre y @usuario (o «Jugador» sin datos si hay bloqueo con quien mira).
create or replace function private.persona_json(p_uid uuid, p_yo uuid) returns jsonb
language sql stable security definer set search_path = '' as $$
  select case when p_uid is null then null
              when p_yo is not null and p_uid <> p_yo and private.hay_bloqueo(p_yo, p_uid) then jsonb_build_object('nombre', 'Jugador')
              else (select jsonb_build_object('id', id, 'nombre', nombre_display, 'username', username) from public.perfiles where id = p_uid) end
$$;
revoke all on function private.persona_json(uuid, uuid) from public, anon, authenticated;

-- Tarjeta pública de un duelo (solo datos de la tabla de retos).
create or replace function private.reto_resumen(p_reto integer, p_yo uuid) returns jsonb
language sql stable security definer set search_path = '' as $$
  select jsonb_build_object('id', r.id, 'estado', r.estado, 'plataforma', r.plataforma, 'tam_a', r.tam_a, 'tam_b', r.tam_b,
    'fecha', coalesce(r.cerrado_at, r.fecha_programada, r.aceptado_at, r.created_at),
    'retador', private.persona_json(r.retador_id, p_yo), 'rival', private.persona_json(coalesce(r.rival_id, r.destinatario_id), p_yo))
  from public.retos_matchmaking r where r.id = p_reto
$$;
revoke all on function private.reto_resumen(integer, uuid) from public, anon, authenticated;

-- ¿`p_uid` participó en el duelo y está en un estado que se puede compartir?
create or replace function private.reto_compartible(p_reto integer, p_uid uuid) returns boolean
language sql stable security definer set search_path = '' as $$
  select p_uid is not null and exists (select 1 from public.retos_matchmaking r where r.id = p_reto and r.estado in ('ACEPTADO','EN_JUEGO','FINALIZADO')
    and (p_uid in (r.retador_id, r.rival_id, r.host_id) or private.es_participante(r.id, p_uid)))
$$;
revoke all on function private.reto_compartible(integer, uuid) from public, anon, authenticated;

-- Mis duelos que puedo adjuntar (los 20 más recientes).
create or replace function public.muro_mis_partidos() returns jsonb
language plpgsql stable security definer set search_path = '' as $$
declare yo uuid := private.uid_requerido();
begin
  return coalesce((select jsonb_agg(private.reto_resumen(t.id, yo) order by t.f desc) from (
    select r.id, coalesce(r.cerrado_at, r.fecha_programada, r.aceptado_at, r.created_at) as f from public.retos_matchmaking r
    where private.reto_compartible(r.id, yo) order by f desc limit 20) t), '[]'::jsonb);
end $$;

-- Cambia la firma (parámetro nuevo p_reto).
drop function if exists public.muro_publicar(text, text, text);
create or replace function public.muro_publicar(p_texto text, p_imagen text default null, p_video text default null, p_reto integer default null) returns bigint
language plpgsql security definer set search_path = '' as $$
declare yo uuid := private.uid_requerido(); t text := trim(coalesce(p_texto, '')); img text := nullif(trim(coalesce(p_imagen, '')), ''); vid text := nullif(trim(coalesce(p_video, '')), ''); nuevo bigint;
begin
  if char_length(t) > 1000 then raise exception 'Máximo 1000 caracteres.'; end if;
  if char_length(t) < 1 and img is null and vid is null and p_reto is null then raise exception 'Escribe algo, sube una foto, pega un enlace de video o adjunta un duelo.'; end if;
  if img is not null and not private.imagen_propia(img, yo) then raise exception 'Esa foto no es válida: súbela desde aquí.'; end if;
  if vid is not null and not private.video_valido(vid) then raise exception 'Solo se aceptan enlaces de YouTube, TikTok, Kick o Twitch.'; end if;
  if p_reto is not null and not private.reto_compartible(p_reto, yo) then raise exception 'Solo puedes adjuntar duelos en los que participaste (aceptados o finalizados).'; end if;
  if (select count(*) from public.muro_publicaciones where autor_id = yo and created_at > now() - interval '1 hour') >= 10 then
    raise exception 'Estás publicando muy rápido: máximo 10 por hora.';
  end if;
  insert into public.muro_publicaciones (autor_id, texto, imagen_url, video_url, reto_id) values (yo, t, img, vid, p_reto) returning id into nuevo;
  return nuevo;
end $$;

-- muro_de: cada publicación trae además la tarjeta del duelo adjunto (o null).
create or replace function public.muro_de(p_usuario uuid, p_antes bigint default null, p_limite integer default 20) returns jsonb
language plpgsql stable security definer set search_path = '' as $$
declare yo uuid := (select auth.uid()); n integer := least(greatest(coalesce(p_limite, 20), 1), 50); filas jsonb; mas boolean;
begin
  if not private.puede_ver_muro(p_usuario, yo) then return jsonb_build_object('visible', false, 'items', '[]'::jsonb, 'hay_mas', false); end if;
  with t as (
    select m.id, m.texto, m.imagen_url, m.video_url, m.fijada, m.created_at, m.editada_at,
           case when m.reto_id is null then null else private.reto_resumen(m.reto_id, yo) end as reto,
           (select count(*) from public.muro_respuestas r where r.publicacion_id = m.id) as respuestas,
           (select coalesce(jsonb_object_agg(x.tipo, x.c), '{}'::jsonb) from (select tipo, count(*) as c from public.muro_reacciones where publicacion_id = m.id group by tipo) x) as reacciones,
           (select tipo from public.muro_reacciones where publicacion_id = m.id and usuario_id = yo) as mia,
           row_number() over (order by (case when p_antes is null then m.fijada else false end) desc, m.id desc) as rn
    from public.muro_publicaciones m
    where m.autor_id = p_usuario and (p_antes is null or (m.id < p_antes and not m.fijada))
    order by (case when p_antes is null then m.fijada else false end) desc, m.id desc limit n + 1)
  select coalesce(jsonb_agg(jsonb_build_object('id', id, 'texto', texto, 'imagen_url', imagen_url, 'video_url', video_url, 'reto', reto, 'fijada', fijada, 'created_at', created_at, 'editada_at', editada_at,
           'respuestas', respuestas, 'reacciones', reacciones, 'mia', mia) order by rn) filter (where rn <= n), '[]'::jsonb),
         count(*) > n into filas, mas from t;
  return jsonb_build_object('visible', true, 'hay_mas', mas, 'items', filas);
end $$;

revoke all on function public.muro_publicar(text, text, text, integer), public.muro_mis_partidos() from public, anon;
grant execute on function public.muro_publicar(text, text, text, integer), public.muro_mis_partidos() to authenticated;

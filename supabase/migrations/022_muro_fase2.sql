-- 022 · MURO · FASE 2: respuestas, reacciones y el permiso «quién puede responder». Depende de 021 (muro) y 017 (amistades, bloqueos).
-- Mismas reglas de siempre: tablas cerradas (RLS sin permisos), todo por funciones RPC `security definer`.
-- «Quién responde» (privacidad_social.muro_responder: TODOS / AMIGOS / NADIE) rige para responder Y reaccionar. El dueño del muro siempre puede responder en el suyo.

create table if not exists public.muro_respuestas (
  id bigint generated always as identity primary key,
  publicacion_id bigint not null references public.muro_publicaciones(id) on delete cascade,
  autor_id uuid not null references auth.users(id) on delete cascade,
  texto text not null check (char_length(texto) between 1 and 500),
  created_at timestamptz not null default now()
);
create index if not exists muro_respuestas_pub_idx on public.muro_respuestas (publicacion_id, id);

create table if not exists public.muro_reacciones (
  publicacion_id bigint not null references public.muro_publicaciones(id) on delete cascade,
  usuario_id uuid not null references auth.users(id) on delete cascade,
  tipo text not null check (tipo in ('fuego','gg','aplauso','risa','corazon')),
  created_at timestamptz not null default now(),
  primary key (publicacion_id, usuario_id)          -- una reacción por persona y publicación (se puede cambiar o quitar)
);
alter table public.muro_respuestas enable row level security;
alter table public.muro_reacciones enable row level security;
revoke all on public.muro_respuestas, public.muro_reacciones from anon, authenticated;

alter table public.notificaciones drop constraint if exists notificaciones_tipo_check;
alter table public.notificaciones add constraint notificaciones_tipo_check check (tipo in (
  'RETO_DIRECTO','RETO_HOST','RETO_ACEPTADO','RETO_RECHAZADO','SALA_LISTA','CONFIRMAR_PARTIDO','AVISO_FINAL','PARTIDO_CONFIRMADO',
  'PARTIDO_CANCELADO','RETO_EXPIRADO','INVITACION_RETO','UNION_RETO','SALIO_RETO','AMISTAD_SOLICITUD','AMISTAD_ACEPTADA','SEGUIDOR_NUEVO',
  'ESPECTADOR_SOLICITUD','ESPECTADOR_APROBADO','MURO_RESPUESTA'));

-- ¿Puede `p_yo` responder/reaccionar en el muro de `p_dueno`? (visitante = null → no)
create or replace function private.puede_responder_muro(p_dueno uuid, p_yo uuid) returns boolean
language plpgsql stable security definer set search_path = '' as $$
declare modo text;
begin
  if p_yo is null then return false; end if;
  if p_yo = p_dueno then return true; end if;
  if not private.puede_ver_muro(p_dueno, p_yo) then return false; end if;      -- incluye el bloqueo
  modo := coalesce((select muro_responder from public.privacidad_social where usuario_id = p_dueno), 'TODOS');
  if modo = 'TODOS' then return true; end if;
  if modo = 'AMIGOS' then return private.son_amigos(p_yo, p_dueno); end if;
  return false;
end $$;
revoke all on function private.puede_responder_muro(uuid, uuid) from public, anon, authenticated;

-- perfil_publico: ahora también dice si YO puedo responder/reaccionar en ese muro.
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
    'puede_responder', private.puede_responder_muro(p.id, yo),
    'muro_ver', case when yo = p.id then coalesce(priv.muro_ver, 'PUBLICO') end,
    'muro_responder', case when yo = p.id then coalesce(priv.muro_responder, 'TODOS') end);
end $$;

-- muro_de: cada publicación trae el número de respuestas, el conteo de reacciones por tipo y MI reacción.
create or replace function public.muro_de(p_usuario uuid, p_antes bigint default null, p_limite integer default 20) returns jsonb
language plpgsql stable security definer set search_path = '' as $$
declare yo uuid := (select auth.uid()); n integer := least(greatest(coalesce(p_limite, 20), 1), 50); filas jsonb; mas boolean;
begin
  if not private.puede_ver_muro(p_usuario, yo) then return jsonb_build_object('visible', false, 'items', '[]'::jsonb, 'hay_mas', false); end if;
  with t as (
    select m.id, m.texto, m.fijada, m.created_at, m.editada_at,
           (select count(*) from public.muro_respuestas r where r.publicacion_id = m.id) as respuestas,
           (select coalesce(jsonb_object_agg(x.tipo, x.c), '{}'::jsonb) from (select tipo, count(*) as c from public.muro_reacciones where publicacion_id = m.id group by tipo) x) as reacciones,
           (select tipo from public.muro_reacciones where publicacion_id = m.id and usuario_id = yo) as mia,
           row_number() over (order by (case when p_antes is null then m.fijada else false end) desc, m.id desc) as rn
    from public.muro_publicaciones m
    where m.autor_id = p_usuario and (p_antes is null or (m.id < p_antes and not m.fijada))
    order by (case when p_antes is null then m.fijada else false end) desc, m.id desc limit n + 1)
  select coalesce(jsonb_agg(jsonb_build_object('id', id, 'texto', texto, 'fijada', fijada, 'created_at', created_at, 'editada_at', editada_at,
           'respuestas', respuestas, 'reacciones', reacciones, 'mia', mia) order by rn) filter (where rn <= n), '[]'::jsonb),
         count(*) > n into filas, mas from t;
  return jsonb_build_object('visible', true, 'hay_mas', mas, 'items', filas);
end $$;

-- Respuestas de una publicación (con nombre y foto de quien responde). Se ocultan las de personas con bloqueo hacia/desde mí.
create or replace function public.muro_respuestas_de(p_publicacion bigint, p_limite integer default 50) returns jsonb
language plpgsql stable security definer set search_path = '' as $$
declare yo uuid := (select auth.uid()); dueno uuid;
begin
  select autor_id into dueno from public.muro_publicaciones where id = p_publicacion;
  if dueno is null or not private.puede_ver_muro(dueno, yo) then return '[]'::jsonb; end if;
  return coalesce((select jsonb_agg(jsonb_build_object('id', r.id, 'autor_id', r.autor_id, 'texto', r.texto, 'created_at', r.created_at,
      'nombre_display', pf.nombre_display, 'username', pf.username, 'avatar_url', pf.avatar_url,
      'puedo_borrar', yo is not null and (r.autor_id = yo or dueno = yo or private.es_admin())) order by r.id)
    from (select * from public.muro_respuestas where publicacion_id = p_publicacion order by id limit least(greatest(coalesce(p_limite, 50), 1), 100)) r
    join public.perfiles pf on pf.id = r.autor_id
    where yo is null or not private.hay_bloqueo(yo, r.autor_id)), '[]'::jsonb);
end $$;

create or replace function public.muro_responder(p_publicacion bigint, p_texto text) returns bigint
language plpgsql security definer set search_path = '' as $$
declare yo uuid := private.uid_requerido(); t text := trim(coalesce(p_texto, '')); dueno uuid; nuevo bigint;
begin
  select autor_id into dueno from public.muro_publicaciones where id = p_publicacion;
  if dueno is null then raise exception 'Esa publicación ya no existe.'; end if;
  if not private.puede_responder_muro(dueno, yo) then raise exception 'No puedes responder en este muro.'; end if;
  if char_length(t) < 1 or char_length(t) > 500 then raise exception 'La respuesta debe tener entre 1 y 500 caracteres.'; end if;
  if (select count(*) from public.muro_respuestas where autor_id = yo and created_at > now() - interval '1 hour') >= 20 then
    raise exception 'Estás respondiendo muy rápido: máximo 20 por hora.';
  end if;
  insert into public.muro_respuestas (publicacion_id, autor_id, texto) values (p_publicacion, yo, t) returning id into nuevo;
  if dueno <> yo then perform private.notificar(dueno, 'MURO_RESPUESTA', 'Respondieron en tu muro', private.nombre(yo) || ': ' || left(t, 80)); end if;
  return nuevo;
end $$;

create or replace function public.muro_borrar_respuesta(p_id bigint) returns void
language plpgsql security definer set search_path = '' as $$
declare yo uuid := private.uid_requerido();
begin
  delete from public.muro_respuestas r using public.muro_publicaciones m
   where r.id = p_id and m.id = r.publicacion_id and (r.autor_id = yo or m.autor_id = yo or private.es_admin());   -- quien la escribió, el dueño del muro o el staff
  if not found then raise exception 'No encontré esa respuesta.'; end if;
end $$;

-- Reaccionar: si ya tenías ESA reacción, se quita; si tenías otra, se cambia. Devuelve mi reacción final (null = ninguna).
create or replace function public.muro_reaccionar(p_publicacion bigint, p_tipo text) returns text
language plpgsql security definer set search_path = '' as $$
declare yo uuid := private.uid_requerido(); dueno uuid; previa text;
begin
  select autor_id into dueno from public.muro_publicaciones where id = p_publicacion;
  if dueno is null then raise exception 'Esa publicación ya no existe.'; end if;
  if not private.puede_responder_muro(dueno, yo) then raise exception 'No puedes reaccionar en este muro.'; end if;
  select tipo into previa from public.muro_reacciones where publicacion_id = p_publicacion and usuario_id = yo;
  if previa = p_tipo then delete from public.muro_reacciones where publicacion_id = p_publicacion and usuario_id = yo; return null; end if;
  insert into public.muro_reacciones (publicacion_id, usuario_id, tipo) values (p_publicacion, yo, p_tipo)
  on conflict (publicacion_id, usuario_id) do update set tipo = excluded.tipo, created_at = now();   -- tipo inválido: lo rechaza el CHECK
  return p_tipo;
end $$;

do $$ declare f text; begin
  execute 'revoke all on function public.muro_respuestas_de(bigint,integer) from public';
  execute 'grant execute on function public.muro_respuestas_de(bigint,integer) to anon, authenticated';
  foreach f in array array['muro_responder(bigint,text)','muro_borrar_respuesta(bigint)','muro_reaccionar(bigint,text)'] loop
    execute format('revoke all on function public.%s from public, anon', f);
    execute format('grant execute on function public.%s to authenticated', f);
  end loop;
end $$;

-- 135 · SOCIAL, FASE 2 (19-oct-2026, Fralex: «Comienza la fase 2» de «métele todo lo que tiene una red social»).
-- ADITIVA: no cambia ni borra nada que ya exista. Todo pasa por funciones SECURITY DEFINER con las MISMAS reglas de visibilidad
-- (private.puede_ver_muro, bloqueos) y de ritmo que publicar. Las tablas nuevas tienen RLS sin políticas: solo se tocan por estas funciones.
--   1. Compartir en tu muro (con comentario opcional): muro_publicaciones.compartida_de + public.muro_compartir.
--   2. «Me gusta» en las respuestas: public.muro_respuesta_likes + muro_like_respuesta / muro_likes_respuestas.
--   3. Vistas por publicación (1 por persona): public.muro_vistas + muro_registrar_vistas.
--   4. Datos sociales de varias publicaciones en una sola llamada: public.muro_social_de (vistas, veces compartida, la original).
--   5. Quién reaccionó: public.muro_reacciones_de.
--   6. Racha de actividad: public.mi_racha_social (días seguidos publicando, respondiendo o reaccionando; hora de Lima).
--   7. Aviso nuevo MURO_COMPARTIDA (se AMPLÍA la lista de tipos permitidos de notificaciones).
-- Deshacer (en este orden):
--   drop function public.mi_racha_social(); drop function public.muro_reacciones_de(bigint, integer);
--   drop function public.muro_social_de(bigint[]); drop function public.muro_registrar_vistas(bigint[]);
--   drop function public.muro_likes_respuestas(bigint[]); drop function public.muro_like_respuesta(bigint);
--   drop function public.muro_compartir(bigint, text);
--   drop table public.muro_vistas; drop table public.muro_respuesta_likes;
--   alter table public.muro_publicaciones drop column compartida_de;
--   (y volver a poner notificaciones_tipo_check sin 'MURO_COMPARTIDA', tras borrar los avisos de ese tipo).

-- 1 · Compartir ─────────────────────────────────────────────────────────────────────────────
alter table public.muro_publicaciones add column if not exists compartida_de bigint references public.muro_publicaciones(id) on delete set null;
create index if not exists muro_publicaciones_compartida_idx on public.muro_publicaciones (compartida_de) where compartida_de is not null;

-- 2 · «Me gusta» en respuestas ─────────────────────────────────────────────────────────────────
create table if not exists public.muro_respuesta_likes (
  respuesta_id bigint not null references public.muro_respuestas(id) on delete cascade,
  usuario_id uuid not null references auth.users(id) on delete cascade,
  created_at timestamptz not null default now(),
  primary key (respuesta_id, usuario_id)
);
create index if not exists muro_respuesta_likes_usuario_idx on public.muro_respuesta_likes (usuario_id);
alter table public.muro_respuesta_likes enable row level security;
revoke all on public.muro_respuesta_likes from anon, authenticated;

-- 3 · Vistas ───────────────────────────────────────────────────────────────────────────────────
create table if not exists public.muro_vistas (
  publicacion_id bigint not null references public.muro_publicaciones(id) on delete cascade,
  usuario_id uuid not null references auth.users(id) on delete cascade,
  created_at timestamptz not null default now(),
  primary key (publicacion_id, usuario_id)
);
create index if not exists muro_vistas_usuario_idx on public.muro_vistas (usuario_id);
alter table public.muro_vistas enable row level security;
revoke all on public.muro_vistas from anon, authenticated;

-- 7 · Tipo de aviso nuevo (la lista solo CRECE) ─────────────────────────────────────────────────
alter table public.notificaciones drop constraint if exists notificaciones_tipo_check;
alter table public.notificaciones add constraint notificaciones_tipo_check check (tipo = any (array[
  'RETO_DIRECTO','RETO_HOST','RETO_ACEPTADO','RETO_RECHAZADO','SALA_LISTA','CONFIRMAR_PARTIDO','AVISO_FINAL','PARTIDO_CONFIRMADO',
  'PARTIDO_CANCELADO','RETO_EXPIRADO','INVITACION_RETO','UNION_RETO','SALIO_RETO','AMISTAD_SOLICITUD','AMISTAD_ACEPTADA','SEGUIDOR_NUEVO',
  'ESPECTADOR_SOLICITUD','ESPECTADOR_APROBADO','MURO_RESPUESTA','MODERACION','MENCION','LOGRO','RESULTADO_PROPUESTO','RESULTADO_CONFIRMADO',
  'RESULTADO_DISPUTADO','EVENTO','CLAN','SALA_ABIERTA','INVITACION_SALA','APUESTA','ALQUILER','MERCADO',
  'MURO_COMPARTIDA']::text[]));

-- 1 · muro_compartir: mismas reglas que muro_publicar (≤1000 letras, 10 por hora) + ver la original.
-- Compartir algo ya compartido apunta a la ORIGINAL (no se encadenan). Avisa al autor original (con enlace a la nueva).
create or replace function public.muro_compartir(p_publicacion bigint, p_texto text default null) returns bigint
language plpgsql security definer set search_path = '' as $$
declare yo uuid := private.uid_requerido(); t text := trim(coalesce(p_texto, '')); raiz bigint; dueno uuid; juego text; nuevo bigint; usu text;
begin
  select coalesce(m.compartida_de, m.id) into raiz from public.muro_publicaciones m where m.id = p_publicacion and not m.oculto;
  if raiz is null then raise exception 'Esa publicación ya no existe.'; end if;
  select m.autor_id, m.juego into dueno, juego from public.muro_publicaciones m where m.id = raiz and not m.oculto;
  if dueno is null then raise exception 'La publicación original ya no está disponible.'; end if;
  if not private.puede_ver_muro(dueno, yo) then raise exception 'No puedes compartir esta publicación.'; end if;
  if char_length(t) > 1000 then raise exception 'Máximo 1000 caracteres.'; end if;
  if (select count(*) from public.muro_publicaciones where autor_id = yo and created_at > now() - interval '1 hour') >= 10 then
    raise exception 'Estás publicando muy rápido: máximo 10 por hora.';
  end if;
  insert into public.muro_publicaciones (autor_id, texto, juego, compartida_de) values (yo, t, juego, raiz) returning id into nuevo;
  if dueno <> yo then
    select username into usu from public.perfiles where id = yo;
    insert into public.notificaciones (usuario_id, tipo, titulo, mensaje, enlace)
    values (dueno, 'MURO_COMPARTIDA', 'Compartieron tu publicación', left(private.nombre(yo) || ' la compartió en su muro' || case when t <> '' then ': ' || t else '.' end, 300),
            case when usu ~ '^[A-Za-z0-9_]{1,30}$' then 'perfil/?u=' || usu || '#p-' || nuevo else null end);
  end if;
  return nuevo;
end $$;

-- 2 · «Me gusta» en una respuesta (alterna: si ya estaba, lo quita). → { mio, total }
create or replace function public.muro_like_respuesta(p_respuesta bigint) returns jsonb
language plpgsql security definer set search_path = '' as $$
declare yo uuid := private.uid_requerido(); dueno uuid; autor uuid; ya boolean;
begin
  select m.autor_id, r.autor_id into dueno, autor from public.muro_respuestas r join public.muro_publicaciones m on m.id = r.publicacion_id
  where r.id = p_respuesta and not r.oculto and not m.oculto;
  if dueno is null then raise exception 'Esa respuesta ya no existe.'; end if;
  if not private.puede_ver_muro(dueno, yo) or private.hay_bloqueo(yo, autor) then raise exception 'No puedes reaccionar a esta respuesta.'; end if;
  ya := exists (select 1 from public.muro_respuesta_likes where respuesta_id = p_respuesta and usuario_id = yo);
  if ya then delete from public.muro_respuesta_likes where respuesta_id = p_respuesta and usuario_id = yo;
  else
    if (select count(*) from public.muro_respuesta_likes where usuario_id = yo and created_at > now() - interval '1 minute') >= 60 then
      raise exception 'Vas muy rápido: espera un momento.';
    end if;
    insert into public.muro_respuesta_likes (respuesta_id, usuario_id) values (p_respuesta, yo) on conflict do nothing;
  end if;
  return jsonb_build_object('mio', not ya, 'total', (select count(*) from public.muro_respuesta_likes where respuesta_id = p_respuesta));
end $$;

-- 2b · «Me gusta» de varias respuestas → { "<id>": { n, mio } } (solo las que puedes ver).
create or replace function public.muro_likes_respuestas(p_respuestas bigint[]) returns jsonb
language sql stable security definer set search_path = '' as $$
  select coalesce(jsonb_object_agg(r.id::text, jsonb_build_object(
    'n', (select count(*) from public.muro_respuesta_likes l where l.respuesta_id = r.id),
    'mio', (select auth.uid()) is not null and exists (select 1 from public.muro_respuesta_likes l where l.respuesta_id = r.id and l.usuario_id = (select auth.uid())))), '{}'::jsonb)
  from public.muro_respuestas r join public.muro_publicaciones m on m.id = r.publicacion_id
  where r.id = any ((coalesce(p_respuestas, '{}'::bigint[]))[1:200]) and not r.oculto and not m.oculto
    and private.puede_ver_muro(m.autor_id, (select auth.uid()))
$$;

-- 3 · Registrar vistas (una por persona y publicación; las propias no cuentan; sin sesión no se cuenta).
create or replace function public.muro_registrar_vistas(p_publicaciones bigint[]) returns void
language plpgsql security definer set search_path = '' as $$
declare yo uuid := (select auth.uid());
begin
  if yo is null then return; end if;
  insert into public.muro_vistas (publicacion_id, usuario_id)
  select m.id, yo from public.muro_publicaciones m
  where m.id = any ((coalesce(p_publicaciones, '{}'::bigint[]))[1:60]) and not m.oculto and m.autor_id <> yo
    and private.puede_ver_muro(m.autor_id, yo)
  on conflict do nothing;
end $$;

-- 4 · Datos sociales de varias publicaciones → { "<id>": { vistas, compartidas, original } }.
-- original: la publicación compartida (autor, texto, foto, video, fecha) SOLO si quien mira puede ver el muro de su autor;
-- si no puede o ya no existe → { "no_disponible": true }.
create or replace function public.muro_social_de(p_publicaciones bigint[]) returns jsonb
language sql stable security definer set search_path = '' as $$
  with yo as (select (select auth.uid()) as id),
  pubs as (
    select m.* from public.muro_publicaciones m, yo
    where m.id = any ((coalesce(p_publicaciones, '{}'::bigint[]))[1:200]) and not m.oculto and private.puede_ver_muro(m.autor_id, yo.id)
  )
  select coalesce(jsonb_object_agg(p.id::text, jsonb_build_object(
    'vistas', (select count(*) from public.muro_vistas v where v.publicacion_id = p.id),
    'compartidas', (select count(*) from public.muro_publicaciones c where c.compartida_de = p.id and not c.oculto),
    'original', case
      when p.compartida_de is null then null
      when o.id is null or o.oculto or not private.puede_ver_muro(o.autor_id, (select id from yo)) then jsonb_build_object('no_disponible', true)
      else jsonb_build_object('id', o.id, 'texto', o.texto, 'imagen_url', o.imagen_url, 'video_url', o.video_url, 'juego', o.juego, 'created_at', o.created_at, 'extra', o.extra,
        'autor', jsonb_build_object('id', pf.id, 'username', pf.username, 'nombre_display', pf.nombre_display, 'avatar_url', pf.avatar_url))
    end)), '{}'::jsonb)
  from pubs p
  left join public.muro_publicaciones o on o.id = p.compartida_de
  left join public.perfiles pf on pf.id = o.autor_id
$$;

-- 5 · Quién reaccionó → [ { tipo, cuando, usuario:{ id, username, nombre_display, avatar_url } } ] (sin bloqueados; máx. 100).
create or replace function public.muro_reacciones_de(p_publicacion bigint, p_limite integer default 50) returns jsonb
language plpgsql stable security definer set search_path = '' as $$
declare yo uuid := (select auth.uid()); dueno uuid;
begin
  select autor_id into dueno from public.muro_publicaciones where id = p_publicacion and not oculto;
  if dueno is null or not private.puede_ver_muro(dueno, yo) then return '[]'::jsonb; end if;
  return coalesce((select jsonb_agg(jsonb_build_object('tipo', x.tipo, 'cuando', x.created_at,
      'usuario', jsonb_build_object('id', pf.id, 'username', pf.username, 'nombre_display', pf.nombre_display, 'avatar_url', pf.avatar_url)) order by x.created_at desc)
    from (select * from public.muro_reacciones where publicacion_id = p_publicacion order by created_at desc limit least(greatest(coalesce(p_limite, 50), 1), 100)) x
    join public.perfiles pf on pf.id = x.usuario_id
    where yo is null or not private.hay_bloqueo(yo, x.usuario_id)), '[]'::jsonb);
end $$;

-- 6 · Racha: días seguidos (hora de Lima) con al menos una publicación, respuesta o reacción. Cuenta hasta hoy o ayer.
--     → { dias, hoy } (hoy = ya hiciste algo hoy). Sin sesión → { dias: 0, hoy: false }. Sin tablas temporales (función STABLE).
create or replace function public.mi_racha_social() returns jsonb
language plpgsql stable security definer set search_path = '' as $$
declare yo uuid := (select auth.uid()); dia date := (now() at time zone 'America/Lima')::date; dias date[]; n int := 0; hoy boolean;
begin
  if yo is null then return jsonb_build_object('dias', 0, 'hoy', false); end if;
  select coalesce(array_agg(distinct d), '{}') into dias from (
    select (created_at at time zone 'America/Lima')::date d from public.muro_publicaciones where autor_id = yo and created_at > now() - interval '120 days'
    union select (created_at at time zone 'America/Lima')::date from public.muro_respuestas where autor_id = yo and created_at > now() - interval '120 days'
    union select (created_at at time zone 'America/Lima')::date from public.muro_reacciones where usuario_id = yo and created_at > now() - interval '120 days'
  ) t;
  hoy := dia = any (dias);
  if not hoy then dia := dia - 1; end if;
  while dia = any (dias) loop n := n + 1; dia := dia - 1; end loop;
  return jsonb_build_object('dias', n, 'hoy', hoy);
end $$;

-- Permisos: leer lo social se puede sin cuenta (respetando la privacidad); escribir, solo con cuenta.
revoke all on function public.muro_compartir(bigint, text), public.muro_like_respuesta(bigint), public.muro_likes_respuestas(bigint[]),
  public.muro_registrar_vistas(bigint[]), public.muro_social_de(bigint[]), public.muro_reacciones_de(bigint, integer), public.mi_racha_social() from public, anon;
grant execute on function public.muro_likes_respuestas(bigint[]), public.muro_social_de(bigint[]), public.muro_reacciones_de(bigint, integer) to anon, authenticated;
grant execute on function public.muro_compartir(bigint, text), public.muro_like_respuesta(bigint), public.muro_registrar_vistas(bigint[]), public.mi_racha_social() to authenticated;

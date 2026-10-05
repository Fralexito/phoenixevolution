-- 034 · OLA A (2/2) · GUARDADOS, BÚSQUEDA y SUGERENCIAS «a quién seguir». Depende de 017 (amistades/seguidores/bloqueos), 021-027 (muro), 031 (ritmo), 032 (oculto).
-- Principios de siempre: tablas cerradas (RLS sin permisos) y todo por funciones RPC `security definer`; lo oculto/bloqueado/privado NUNCA aparece en una búsqueda ni en un guardado.
-- Los ítems de publicación salen con el MISMO formato que `muro_comunidad`, así la web reutiliza el pintado que ya existe.

create extension if not exists pg_trgm with schema extensions;       -- acelera «contiene» (ILIKE '%ana%') en nombres y @usuarios

-- ─── 1) Ayudantes internos ─────────────────────────────────────────────────────────────────────────────────────
-- Una publicación completa tal como la ve `p_yo` (null = visitante). null si no existe, está oculta, hay bloqueo o su muro es privado para esa persona.
create or replace function private.item_publicacion(p_id bigint, p_yo uuid) returns jsonb
language sql stable security definer set search_path = '' as $$
  select jsonb_build_object('id', m.id, 'texto', m.texto, 'imagen_url', m.imagen_url, 'video_url', m.video_url, 'juego', m.juego,
    'reto', case when m.reto_id is null then null else private.reto_resumen(m.reto_id, p_yo) end, 'created_at', m.created_at,
    'respuestas', (select count(*) from public.muro_respuestas r where r.publicacion_id = m.id and not r.oculto),
    'reacciones', (select coalesce(jsonb_object_agg(x.tipo, x.c), '{}'::jsonb) from (select tipo, count(*) as c from public.muro_reacciones where publicacion_id = m.id group by tipo) x),
    'autor', jsonb_build_object('id', pf.id, 'username', pf.username, 'nombre_display', pf.nombre_display, 'avatar_url', pf.avatar_url))
  from public.muro_publicaciones m join public.perfiles pf on pf.id = m.autor_id
  where m.id = p_id and not m.oculto and private.puede_ver_muro(m.autor_id, p_yo)
$$;
revoke all on function private.item_publicacion(bigint, uuid) from public, anon, authenticated;

create or replace function private.item_clip(p_id bigint, p_yo uuid) returns jsonb
language sql stable security definer set search_path = '' as $$
  select jsonb_build_object('id', c.id, 'titulo', c.titulo, 'video_url', c.video_url, 'juego', c.juego, 'created_at', c.created_at,
    'autor', jsonb_build_object('id', pf.id, 'username', pf.username, 'nombre_display', pf.nombre_display, 'avatar_url', pf.avatar_url))
  from public.muro_clips c join public.perfiles pf on pf.id = c.autor_id
  where c.id = p_id and not c.oculto and private.puede_ver_muro(c.autor_id, p_yo)
$$;
revoke all on function private.item_clip(bigint, uuid) from public, anon, authenticated;

-- ─── 2) GUARDADOS (marcadores privados: solo tú los ves) ───────────────────────────────────────────────────────
create table if not exists public.guardados (
  usuario_id uuid not null references auth.users(id) on delete cascade,
  tipo text not null check (tipo in ('publicacion','clip')),
  objetivo_id bigint not null,
  created_at timestamptz not null default now(),
  primary key (usuario_id, tipo, objetivo_id)
);
create index if not exists guardados_orden_idx on public.guardados (usuario_id, created_at desc);
alter table public.guardados enable row level security;
revoke all on public.guardados from anon, authenticated;

drop trigger if exists zz_limite_ritmo on public.guardados;
create trigger zz_limite_ritmo before insert on public.guardados
  for each row execute function private.limitar_ritmo('usuario_id', '120', '1 hour', 'Estás guardando muy rápido: espera un rato.');

-- Si se borra la publicación/clip, se borran los guardados que apuntaban a ella.
create or replace function private.trg_guardados_limpiar() returns trigger
language plpgsql security definer set search_path = '' as $$
begin
  delete from public.guardados where tipo = tg_argv[0] and objetivo_id = old.id;
  return null;
end $$;
revoke all on function private.trg_guardados_limpiar() from public, anon, authenticated;
drop trigger if exists guardados_baja on public.muro_publicaciones;
create trigger guardados_baja after delete on public.muro_publicaciones for each row execute function private.trg_guardados_limpiar('publicacion');
drop trigger if exists guardados_baja on public.muro_clips;
create trigger guardados_baja after delete on public.muro_clips for each row execute function private.trg_guardados_limpiar('clip');

-- Guardar / quitar. Devuelve el estado FINAL (true = queda guardado). Quitar siempre se permite; guardar exige poder VER el contenido.
create or replace function public.guardar_contenido(p_tipo text, p_id bigint, p_guardar boolean default true) returns boolean
language plpgsql security definer set search_path = '' as $$
declare yo uuid := private.uid_requerido(); visible boolean;
begin
  if p_tipo is null or p_tipo not in ('publicacion','clip') then raise exception 'Solo se pueden guardar publicaciones y clips.'; end if;
  if p_id is null then raise exception 'No se sabe qué guardar. Recarga la página.'; end if;
  if p_guardar is false then
    delete from public.guardados where usuario_id = yo and tipo = p_tipo and objetivo_id = p_id;
    return false;
  end if;
  visible := case p_tipo when 'publicacion' then private.item_publicacion(p_id, yo) is not null else private.item_clip(p_id, yo) is not null end;
  if not visible then raise exception 'Ese contenido ya no está disponible.'; end if;
  if not exists (select 1 from public.guardados where usuario_id = yo and tipo = p_tipo and objetivo_id = p_id)
     and (select count(*) from public.guardados where usuario_id = yo) >= 500 then
    raise exception 'Llegaste al máximo de 500 guardados: quita alguno para guardar más.';
  end if;
  insert into public.guardados (usuario_id, tipo, objetivo_id) values (yo, p_tipo, p_id) on conflict do nothing;
  return true;
end $$;

-- De estos ids (máx. 100), ¿cuáles tengo guardados? Sirve para pintar el marcador en cualquier lista sin tocar las funciones del muro.
create or replace function public.guardados_de(p_tipo text, p_ids bigint[]) returns bigint[]
language sql stable security definer set search_path = '' as $$
  select coalesce(array_agg(g.objetivo_id), '{}'::bigint[]) from public.guardados g
  where g.usuario_id = (select auth.uid()) and g.tipo = p_tipo and g.objetivo_id = any ((coalesce(p_ids, '{}'::bigint[]))[1:100])
$$;

-- Mis guardados, del más reciente al más antiguo. Lo que ya no es visible (oculto, bloqueo, muro privado) se omite en silencio.
-- `siguiente` = marca de tiempo para pedir la página siguiente (se calcula sobre lo LEÍDO, no sobre lo visible, para no perder elementos).
create or replace function public.guardados_listar(p_antes timestamptz default null, p_limite integer default 20) returns jsonb
language plpgsql stable security definer set search_path = '' as $$
declare yo uuid := private.uid_requerido(); n integer := least(greatest(coalesce(p_limite, 20), 1), 40); filas jsonb; mas boolean; sig timestamptz;
begin
  with g as (select tipo, objetivo_id, created_at, row_number() over (order by created_at desc, objetivo_id desc) as rn
             from public.guardados where usuario_id = yo and (p_antes is null or created_at < p_antes) order by created_at desc, objetivo_id desc limit n + 1),
       t as (select g.*, case when g.rn > n then null when g.tipo = 'publicacion' then private.item_publicacion(g.objetivo_id, yo) else private.item_clip(g.objetivo_id, yo) end as item from g)
  select coalesce(jsonb_agg(jsonb_build_object('tipo', tipo, 'guardado_at', created_at, 'item', item) order by rn) filter (where rn <= n and item is not null), '[]'::jsonb),
         coalesce(bool_or(rn > n), false), (select max(created_at) from (select created_at from t where rn <= n order by rn desc limit 1) z)
    into filas, mas, sig from t;
  return jsonb_build_object('items', filas, 'hay_mas', mas, 'siguiente', sig);
end $$;

-- ─── 3) BÚSQUEDA ───────────────────────────────────────────────────────────────────────────────────────────────
create index if not exists perfiles_username_trgm_idx on public.perfiles using gin (username extensions.gin_trgm_ops);
create index if not exists perfiles_nombre_trgm_idx on public.perfiles using gin (nombre_display extensions.gin_trgm_ops);
-- Búsqueda de texto en ESPAÑOL (entiende plurales y conjugaciones: «partidos» encuentra «partido»). Solo publicaciones no ocultas.
create index if not exists muro_pub_fts_idx on public.muro_publicaciones using gin (to_tsvector('spanish', texto)) where not oculto;
create index if not exists muro_pub_reciente_idx on public.muro_publicaciones (created_at desc) where not oculto;

-- Personas por nombre o @usuario (con o sin @). Sin bloqueos en ningún sentido. Primero coincidencia exacta, luego «empieza por», luego «contiene».
create or replace function public.buscar_personas(p_q text, p_limite integer default 20) returns jsonb
language plpgsql stable security definer set search_path = '' as $$
declare yo uuid := private.uid_requerido(); q text := regexp_replace(lower(trim(coalesce(p_q, ''))), '^@', ''); n integer := least(greatest(coalesce(p_limite, 20), 1), 30); esc text; res jsonb;
begin
  if char_length(q) < 2 then raise exception 'Escribe al menos 2 letras.'; end if;
  if char_length(q) > 40 then raise exception 'La búsqueda es demasiado larga (máx. 40 caracteres).'; end if;
  esc := replace(replace(replace(q, '\', '\\'), '%', '\%'), '_', '\_');            -- los comodines que escriba la persona se toman literalmente
  select coalesce(jsonb_agg(x.fila order by x.o1 desc, x.o2 desc, x.o3 desc, x.nombre, x.username), '[]'::jsonb) into res from (
    select jsonb_build_object('id', p.id, 'username', p.username, 'nombre_display', p.nombre_display, 'avatar_url', p.avatar_url, 'rol', p.rol,
             'club_favorito', p.club_favorito, 'pais_codigo', p.pais_codigo) as fila,
           (lower(p.username) = q) as o1, (p.username ilike esc || '%') as o2, (p.nombre_display ilike esc || '%') as o3, p.nombre_display as nombre, p.username
    from public.perfiles p
    where p.id <> yo and (p.username ilike '%' || esc || '%' or p.nombre_display ilike '%' || esc || '%') and not private.hay_bloqueo(yo, p.id)
    order by (lower(p.username) = q) desc, (p.username ilike esc || '%') desc, (p.nombre_display ilike esc || '%') desc, p.nombre_display, p.username
    limit n) x;
  return res;
end $$;

-- Publicaciones por texto. Paginación por desplazamiento (máx. 100) porque el orden es por relevancia, no por fecha.
create or replace function public.buscar_publicaciones(p_q text, p_desplazamiento integer default 0, p_limite integer default 20) returns jsonb
language plpgsql stable security definer set search_path = '' as $$
declare yo uuid := private.uid_requerido(); q text := trim(coalesce(p_q, '')); n integer := least(greatest(coalesce(p_limite, 20), 1), 30);
        d integer := least(greatest(coalesce(p_desplazamiento, 0), 0), 100); tsq tsquery; filas jsonb; mas boolean;
begin
  if char_length(q) < 2 then raise exception 'Escribe al menos 2 letras.'; end if;
  if char_length(q) > 80 then raise exception 'La búsqueda es demasiado larga (máx. 80 caracteres).'; end if;
  tsq := websearch_to_tsquery('spanish', q);
  if tsq is null or tsq::text = '' then return jsonb_build_object('items', '[]'::jsonb, 'hay_mas', false); end if;      -- solo palabras vacías («de», «el»…)
  -- OJO: el número de fila se calcula DESPUÉS de aplicar limit/offset (si no, en la 2.ª página «rn» empezaría en d+1 y todo se descartaría).
  with s as (select m.id, ts_rank(to_tsvector('spanish', m.texto), tsq) as r
             from public.muro_publicaciones m
             where not m.oculto and to_tsvector('spanish', m.texto) @@ tsq and private.puede_ver_muro(m.autor_id, yo)
             order by r desc, m.id desc limit n + 1 offset d),
       t as (select s.id, row_number() over (order by s.r desc, s.id desc) as rn from s)
  select coalesce(jsonb_agg(private.item_publicacion(t.id, yo) order by t.rn) filter (where t.rn <= n), '[]'::jsonb), count(*) > n into filas, mas from t;
  return jsonb_build_object('items', filas, 'hay_mas', mas);
end $$;

-- ─── 4) SUGERENCIAS «a quién seguir» ───────────────────────────────────────────────────────────────────────────
-- Puntaje = 3·(amigos en común) + 2·(seguidos por gente que sigo) + 1 (mismo club) + 1 (mismo país) + actividad reciente (máx. 3). Explicable, sin «caja negra».
-- Privacidad: si mi amigo oculta su lista de amigos (ver_amigos = 'nadie'), sus amistades NO cuentan como «amigos en común».
create table if not exists public.sugerencias_descartadas (
  usuario_id uuid not null references auth.users(id) on delete cascade,
  descartado_id uuid not null references auth.users(id) on delete cascade,
  created_at timestamptz not null default now(),
  primary key (usuario_id, descartado_id)
);
alter table public.sugerencias_descartadas enable row level security;
revoke all on public.sugerencias_descartadas from anon, authenticated;
drop trigger if exists zz_limite_ritmo on public.sugerencias_descartadas;
create trigger zz_limite_ritmo before insert on public.sugerencias_descartadas
  for each row execute function private.limitar_ritmo('usuario_id', '100', '1 hour', 'Descartaste muchas sugerencias seguidas: espera un rato.');

create or replace function public.sugerencia_descartar(p_usuario uuid) returns void
language plpgsql security definer set search_path = '' as $$
declare yo uuid := private.uid_requerido();
begin
  if p_usuario is null or p_usuario = yo or not exists (select 1 from public.perfiles where id = p_usuario) then raise exception 'Esa persona no existe.'; end if;
  insert into public.sugerencias_descartadas (usuario_id, descartado_id) values (yo, p_usuario) on conflict do nothing;
end $$;

create or replace function public.sugerencias_seguir(p_limite integer default 10) returns jsonb
language plpgsql stable security definer set search_path = '' as $$
declare yo uuid := private.uid_requerido(); n integer := least(greatest(coalesce(p_limite, 10), 1), 20); mi_club text; mi_pais text; res jsonb;
begin
  select club_favorito, pais_codigo into mi_club, mi_pais from public.perfiles where id = yo;
  with
  amigos as (select case when a.usuario_a = yo then a.usuario_b else a.usuario_a end as id from public.amistades a where a.estado = 'ACEPTADA' and yo in (a.usuario_a, a.usuario_b)),
  sigo as (select seguido_id as id from public.seguidores where seguidor_id = yo),
  excl as (
    select yo as id
    union select id from amigos
    union select id from sigo
    union select case when a.usuario_a = yo then a.usuario_b else a.usuario_a end from public.amistades a where a.estado = 'PENDIENTE' and yo in (a.usuario_a, a.usuario_b)
    union select bloqueado_id from public.bloqueos where bloqueador_id = yo
    union select bloqueador_id from public.bloqueos where bloqueado_id = yo
    union select descartado_id from public.sugerencias_descartadas where usuario_id = yo),
  comunes as (
    select case when a.usuario_a = f.id then a.usuario_b else a.usuario_a end as id, count(*) as c
    from amigos f join public.amistades a on a.estado = 'ACEPTADA' and f.id in (a.usuario_a, a.usuario_b)
    where coalesce((select ps.ver_amigos from public.privacidad_social ps where ps.usuario_id = f.id), 'amigos') <> 'nadie'
    group by 1),
  de_seguidos as (select s.seguido_id as id, count(*) as c from public.seguidores s where s.seguidor_id in (select id from sigo) group by 1),
  activos as (select autor_id as id, max(created_at) as ultimo, count(*) as posts from public.muro_publicaciones where created_at > now() - interval '30 days' and not oculto group by 1),
  pool as (
    select id from comunes
    union select id from de_seguidos
    union (select id from activos order by ultimo desc limit 100)
    union (select id from public.perfiles where (mi_club is not null and club_favorito = mi_club) or (mi_pais is not null and pais_codigo = mi_pais) limit 150)),
  puntuados as (
    select p.id, p.username, p.nombre_display, p.avatar_url, p.club_favorito, coalesce(c.c, 0) as n_amigos, coalesce(d.c, 0) as n_seg,
           (mi_club is not null and p.club_favorito = mi_club) as mismo_club, (mi_pais is not null and p.pais_codigo = mi_pais) as mismo_pais, a.ultimo, coalesce(a.posts, 0) as posts
    from pool join public.perfiles p on p.id = pool.id
    left join comunes c on c.id = p.id left join de_seguidos d on d.id = p.id left join activos a on a.id = p.id
    where p.id not in (select id from excl)),
  ordenados as (
    select *, (3 * n_amigos + 2 * n_seg + (case when mismo_club then 1 else 0 end) + (case when mismo_pais then 1 else 0 end) + least(posts, 3)) as puntaje
    from puntuados order by puntaje desc, ultimo desc nulls last, id limit n)
  select coalesce(jsonb_agg(jsonb_build_object('id', id, 'username', username, 'nombre_display', nombre_display, 'avatar_url', avatar_url,
      'motivo', case when n_amigos > 0 then n_amigos || ' amigo' || (case when n_amigos > 1 then 's' else '' end) || ' en común'
                     when n_seg > 0 then 'Lo siguen ' || n_seg || ' persona' || (case when n_seg > 1 then 's' else '' end) || ' que sigues'
                     when mismo_club then 'Mismo club favorito'
                     when mismo_pais then 'Del mismo país'
                     when posts > 0 then 'Activo en la comunidad'
                     else 'Nuevo en la comunidad' end) order by puntaje desc, ultimo desc nulls last, id), '[]'::jsonb)
    into res from ordenados;
  return res;
end $$;

-- ─── 5) Permisos ───────────────────────────────────────────────────────────────────────────────────────────────
revoke all on function public.guardar_contenido(text, bigint, boolean), public.guardados_de(text, bigint[]), public.guardados_listar(timestamptz, integer),
  public.buscar_personas(text, integer), public.buscar_publicaciones(text, integer, integer), public.sugerencia_descartar(uuid), public.sugerencias_seguir(integer) from public, anon;
grant execute on function public.guardar_contenido(text, bigint, boolean), public.guardados_de(text, bigint[]), public.guardados_listar(timestamptz, integer),
  public.buscar_personas(text, integer), public.buscar_publicaciones(text, integer, integer), public.sugerencia_descartar(uuid), public.sugerencias_seguir(integer) to authenticated;

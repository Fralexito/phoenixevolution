-- 136 · JUGADAS: el feed vertical de videos de Phoenix (19-oct-2026, Fralex: «una especie de reels o feed, shorts estilo TikTok, YouTube
-- e Instagram, pero con identidad propia»). Usa los clips que ya existen (public.muro_clips, migraciones 025/027/032).
-- ADITIVA: no cambia ni borra nada. Tablas nuevas con RLS sin políticas (solo por estas funciones). Misma privacidad que el muro (private.puede_ver_muro).
--   · muro_clips.categoria: golazo · atajada · skill · remontada · fail · otro (opcional).
--   · jugadas_reacciones / jugadas_vistas: reacciones (1 por persona, cualquier emoji) y vistas (1 por persona; las propias no cuentan).
--   · jugadas_feed(categoria, orden, antes, desplazamiento, limite): el feed global. orden 'recientes' (por id) o 'top' (más reacciones de los últimos 7 días).
--   · jugada_publicar: las MISMAS reglas que clip_publicar + categoría.
--   · jugada_reaccionar (alterna; mismo emoji otra vez = quitar) y jugadas_registrar_vista.
-- Deshacer: drop function public.jugadas_registrar_vista(bigint), public.jugada_reaccionar(bigint, text), public.jugada_publicar(text, text, text, text),
--           public.jugadas_feed(text, text, bigint, integer, integer); drop table public.jugadas_vistas, public.jugadas_reacciones;
--           alter table public.muro_clips drop column categoria;

alter table public.muro_clips add column if not exists categoria text
  check (categoria is null or categoria in ('golazo', 'atajada', 'skill', 'remontada', 'fail', 'otro'));
create index if not exists muro_clips_categoria_idx on public.muro_clips (categoria, id desc) where not oculto;

create table if not exists public.jugadas_reacciones (
  clip_id bigint not null references public.muro_clips(id) on delete cascade,
  usuario_id uuid not null references auth.users(id) on delete cascade,
  tipo text not null check (tipo ~ '^[^ -~]{1,16}$'),
  created_at timestamptz not null default now(),
  primary key (clip_id, usuario_id)
);
create index if not exists jugadas_reacciones_usuario_idx on public.jugadas_reacciones (usuario_id);
alter table public.jugadas_reacciones enable row level security;
revoke all on public.jugadas_reacciones from anon, authenticated;

create table if not exists public.jugadas_vistas (
  clip_id bigint not null references public.muro_clips(id) on delete cascade,
  usuario_id uuid not null references auth.users(id) on delete cascade,
  created_at timestamptz not null default now(),
  primary key (clip_id, usuario_id)
);
create index if not exists jugadas_vistas_usuario_idx on public.jugadas_vistas (usuario_id);
alter table public.jugadas_vistas enable row level security;
revoke all on public.jugadas_vistas from anon, authenticated;

-- Feed → { items: [ { id, titulo, video_url, juego, categoria, created_at, autor{}, reacciones{emoji:n}, total, mia, vistas } ], hay_mas }
create or replace function public.jugadas_feed(p_categoria text default null, p_orden text default 'recientes', p_antes bigint default null,
  p_desplazamiento integer default 0, p_limite integer default 12) returns jsonb
language plpgsql stable security definer set search_path = '' as $$
declare yo uuid := (select auth.uid()); n integer := least(greatest(coalesce(p_limite, 12), 1), 30); d integer := least(greatest(coalesce(p_desplazamiento, 0), 0), 300);
  cat text := nullif(trim(coalesce(p_categoria, '')), ''); top boolean := coalesce(p_orden, '') = 'top'; filas jsonb; mas boolean;
begin
  if cat is not null and cat not in ('golazo', 'atajada', 'skill', 'remontada', 'fail', 'otro') then raise exception 'Categoría no válida.'; end if;
  with base as (
    select c.*, (select count(*) from public.jugadas_reacciones r where r.clip_id = c.id and (not top or r.created_at > now() - interval '7 days')) as puntos
    from public.muro_clips c
    where not c.oculto and (cat is null or c.categoria = cat) and (top or p_antes is null or c.id < p_antes)
      and private.puede_ver_muro(c.autor_id, yo) and (yo is null or not private.hay_bloqueo(yo, c.autor_id))
  ), ord as (
    select b.*, row_number() over (order by case when top then b.puntos end desc nulls last, b.id desc) as rn from base b
  ), pag as (
    select * from ord where rn > (case when top then d else 0 end) and rn <= (case when top then d else 0 end) + n + 1
  )
  select coalesce(jsonb_agg(jsonb_build_object('id', p.id, 'titulo', p.titulo, 'video_url', p.video_url, 'juego', p.juego, 'categoria', p.categoria, 'created_at', p.created_at,
      'autor', jsonb_build_object('id', pf.id, 'username', pf.username, 'nombre_display', pf.nombre_display, 'avatar_url', pf.avatar_url),
      'reacciones', (select coalesce(jsonb_object_agg(x.tipo, x.c), '{}'::jsonb) from (select tipo, count(*) c from public.jugadas_reacciones where clip_id = p.id group by tipo) x),
      'total', (select count(*) from public.jugadas_reacciones where clip_id = p.id),
      'mia', (select tipo from public.jugadas_reacciones where clip_id = p.id and usuario_id = yo),
      'vistas', (select count(*) from public.jugadas_vistas where clip_id = p.id)) order by p.rn)
    filter (where p.rn <= (case when top then d else 0 end) + n), '[]'::jsonb),
    count(*) > n
  into filas, mas
  from pag p join public.perfiles pf on pf.id = p.autor_id;
  return jsonb_build_object('items', filas, 'hay_mas', coalesce(mas, false));
end $$;

-- Publicar una jugada: clip_publicar (mismas reglas: ≤80 letras, video propio o enlace válido, 60 máx., 10 por hora) + categoría.
create or replace function public.jugada_publicar(p_titulo text, p_video text, p_juego text default null, p_categoria text default null) returns bigint
language plpgsql security definer set search_path = '' as $$
declare yo uuid := private.uid_requerido(); cat text := nullif(trim(coalesce(p_categoria, '')), ''); nuevo bigint;
begin
  if cat is not null and cat not in ('golazo', 'atajada', 'skill', 'remontada', 'fail', 'otro') then raise exception 'Categoría no válida.'; end if;
  nuevo := public.clip_publicar(p_titulo, p_video, p_juego);
  if cat is not null then update public.muro_clips set categoria = cat where id = nuevo and autor_id = yo; end if;
  return nuevo;
end $$;

-- Reaccionar a una jugada (igual que en el muro: mismo emoji otra vez = quitar). → emoji final o null
create or replace function public.jugada_reaccionar(p_clip bigint, p_tipo text) returns text
language plpgsql security definer set search_path = '' as $$
declare yo uuid := private.uid_requerido(); dueno uuid; previa text; t text := trim(coalesce(p_tipo, ''));
begin
  if t !~ '^[^ -~]{1,16}$' then raise exception 'Elige un emoji de la lista.'; end if;
  select autor_id into dueno from public.muro_clips where id = p_clip and not oculto;
  if dueno is null then raise exception 'Esa jugada ya no existe.'; end if;
  if not private.puede_ver_muro(dueno, yo) or private.hay_bloqueo(yo, dueno) then raise exception 'No puedes reaccionar a esta jugada.'; end if;
  if (select count(*) from public.jugadas_reacciones where usuario_id = yo and created_at > now() - interval '1 minute') >= 60 then raise exception 'Vas muy rápido: espera un momento.'; end if;
  select tipo into previa from public.jugadas_reacciones where clip_id = p_clip and usuario_id = yo;
  if previa = t then delete from public.jugadas_reacciones where clip_id = p_clip and usuario_id = yo; return null; end if;
  insert into public.jugadas_reacciones (clip_id, usuario_id, tipo) values (p_clip, yo, t)
  on conflict (clip_id, usuario_id) do update set tipo = excluded.tipo, created_at = now();
  return t;
end $$;

-- Vista (1 por persona; las propias no cuentan; sin sesión no hace nada).
create or replace function public.jugadas_registrar_vista(p_clip bigint) returns void
language plpgsql security definer set search_path = '' as $$
declare yo uuid := (select auth.uid());
begin
  if yo is null then return; end if;
  insert into public.jugadas_vistas (clip_id, usuario_id)
  select c.id, yo from public.muro_clips c where c.id = p_clip and not c.oculto and c.autor_id <> yo and private.puede_ver_muro(c.autor_id, yo)
  on conflict do nothing;
end $$;

revoke all on function public.jugadas_feed(text, text, bigint, integer, integer), public.jugada_publicar(text, text, text, text),
  public.jugada_reaccionar(bigint, text), public.jugadas_registrar_vista(bigint) from public, anon;
grant execute on function public.jugadas_feed(text, text, bigint, integer, integer) to anon, authenticated;
grant execute on function public.jugada_publicar(text, text, text, text), public.jugada_reaccionar(bigint, text), public.jugadas_registrar_vista(bigint) to authenticated;

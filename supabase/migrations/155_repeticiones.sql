-- 155 · Repetición del partido + «Mejor gol de la semana» (25-oct-2026, Cuenta 2).
-- ESTADO: APLICADA el 25-oct-2026; con el arreglo de nulos de la 156. Prueba: supabase/tests/155_repeticiones_test.sql.
-- Los jugadores (o el host) de un duelo TERMINADO pegan el enlace de la repetición: el partido completo o un gol (con su minuto).
-- Los goles de la semana (lunes a domingo, hora de Lima) compiten por «Mejor gol de la semana»: cada persona tiene 1 voto por semana
-- (lo puede cambiar) y no puede votar su propio gol.
-- Blindaje:
--   · Solo enlaces https de sitios de video conocidos (YouTube, Twitch, Kick, Streamable, Medal, Google Drive, Facebook, TikTok) o el
--     almacenamiento de esta web. Nada de javascript:, http: ni sitios raros. Máx. 300 caracteres.
--   · Máx. 6 repeticiones por persona y duelo. Título sin < >. Minuto 0–130 (solo en goles).
--   · Nadie borra: se OCULTA (el autor o un moderador) → sin DELETE. Votos: tabla cerrada, un voto por persona y semana (clave única).
--   · Ver repeticiones: hay que poder ver el muro de todos los jugadores del duelo (perfiles privados o bloqueos → no se ven).
create table if not exists public.duelo_repeticiones (
  id bigint generated always as identity primary key,
  reto_id integer not null references public.retos_matchmaking (id) on delete cascade,
  autor uuid not null references public.perfiles (id) on delete cascade,
  url text not null check (char_length(url) between 12 and 300 and url ~ '^https://'),
  tipo text not null default 'completo' check (tipo in ('completo', 'gol')),
  titulo text check (titulo is null or (char_length(titulo) <= 80 and titulo !~ '[<>]')),
  minuto smallint check (minuto is null or minuto between 0 and 130),
  creado timestamptz not null default now(),
  oculto boolean not null default false,
  check (tipo = 'gol' or minuto is null)
);
create index if not exists duelo_repeticiones_reto_idx on public.duelo_repeticiones (reto_id) where not oculto;
create index if not exists duelo_repeticiones_goles_idx on public.duelo_repeticiones (creado desc) where tipo = 'gol' and not oculto;
create table if not exists public.mejor_gol_votos (
  usuario uuid not null references public.perfiles (id) on delete cascade,
  semana date not null,
  repeticion_id bigint not null references public.duelo_repeticiones (id) on delete cascade,
  votado timestamptz not null default now(),
  primary key (usuario, semana)
);
create index if not exists mejor_gol_votos_rep_idx on public.mejor_gol_votos (repeticion_id);
alter table public.duelo_repeticiones enable row level security;
alter table public.mejor_gol_votos enable row level security;
revoke all on public.duelo_repeticiones, public.mejor_gol_votos from anon, authenticated;

create or replace function private.url_video_ok(p_url text) returns boolean
language sql immutable set search_path = '' as $$
  select coalesce(p_url, '') ~* '^https://([a-z0-9-]+\.)*(youtube\.com|youtu\.be|twitch\.tv|kick\.com|streamable\.com|medal\.tv|drive\.google\.com|facebook\.com|fb\.watch|tiktok\.com|fiibiyijojkxqlsrhcil\.supabase\.co)(/[^\s<>"'']*)?$'
$$;
-- Semana de Lima (lunes) de un instante.
create or replace function private.semana_lima(t timestamptz default now()) returns date
language sql stable set search_path = '' as $$ select (date_trunc('week', t at time zone 'America/Lima'))::date $$;
-- ¿Puedo ver el duelo (todos sus jugadores me dejan ver su muro)?
create or replace function private.puedo_ver_duelo(p_reto integer, p_yo uuid) returns boolean
language sql stable security definer set search_path = '' as $$
  select not exists (select 1 from private.jugadores_de_reto(p_reto) j where not private.puede_ver_muro(j.usuario_id, p_yo))
$$;
revoke all on function private.url_video_ok(text), private.semana_lima(timestamptz), private.puedo_ver_duelo(integer, uuid) from public, anon, authenticated;

create or replace function public.repeticion_agregar(p_reto integer, p_url text, p_tipo text default 'completo', p_titulo text default null, p_minuto integer default null)
returns bigint language plpgsql security definer set search_path = '' as $$
declare v_yo uuid := private.uid_requerido(); r public.retos_matchmaking; v_id bigint; v_url text := btrim(coalesce(p_url, '')); v_tit text := nullif(btrim(coalesce(p_titulo, '')), '');
begin
  select * into r from public.retos_matchmaking where id = p_reto;
  if not found then raise exception 'Ese duelo no existe.' using errcode = 'P0001'; end if;
  if not (private.lado_en_reto(p_reto, v_yo) is not null or coalesce(r.host_id = v_yo, false)) then raise exception 'Solo los jugadores o el host del duelo suben su repetición.' using errcode = '42501'; end if;
  if r.estado::text <> 'FINALIZADO' then raise exception 'Primero tiene que terminar el duelo.' using errcode = 'P0001'; end if;
  if coalesce(p_tipo, '') not in ('completo', 'gol') then raise exception 'Tipo no válido.' using errcode = '22023'; end if;
  if char_length(v_url) > 300 or not private.url_video_ok(v_url) then
    raise exception 'Pega un enlace https de YouTube, Twitch, Kick, Streamable, Medal, Google Drive, Facebook o TikTok.' using errcode = '22023'; end if;
  if v_tit is not null and (char_length(v_tit) > 80 or v_tit ~ '[<>]') then raise exception 'El título: máximo 80 caracteres, sin < ni >.' using errcode = '22023'; end if;
  if p_tipo = 'gol' and p_minuto is not null and p_minuto not between 0 and 130 then raise exception 'El minuto va de 0 a 130.' using errcode = '22023'; end if;
  if (select count(*) from public.duelo_repeticiones where reto_id = p_reto and autor = v_yo and not oculto) >= 6 then
    raise exception 'Ya subiste 6 repeticiones de este duelo.' using errcode = 'P0001'; end if;
  if exists (select 1 from public.duelo_repeticiones where reto_id = p_reto and url = v_url and not oculto) then
    raise exception 'Ese enlace ya está en este duelo.' using errcode = '23505'; end if;
  insert into public.duelo_repeticiones (reto_id, autor, url, tipo, titulo, minuto)
  values (p_reto, v_yo, v_url, p_tipo, v_tit, case when p_tipo = 'gol' then p_minuto end) returning id into v_id;
  return v_id;
end $$;

create or replace function public.repeticion_ocultar(p_id bigint) returns void
language plpgsql security definer set search_path = '' as $$
declare v_yo uuid := private.uid_requerido();
begin
  update public.duelo_repeticiones set oculto = true where id = p_id and not oculto and (autor = v_yo or private.es_moderador());
  if not found then raise exception 'No puedes quitar esa repetición.' using errcode = '42501'; end if;
end $$;

create or replace function public.repeticiones_de(p_reto integer) returns jsonb
language plpgsql stable security definer set search_path = '' as $$
declare v_yo uuid := (select auth.uid()); r public.retos_matchmaking;
begin
  select * into r from public.retos_matchmaking where id = p_reto;
  if not found or not private.puedo_ver_duelo(p_reto, v_yo) then return jsonb_build_object('visible', false, 'items', '[]'::jsonb); end if;
  return jsonb_build_object('visible', true,
    'puedo_subir', v_yo is not null and r.estado::text = 'FINALIZADO' and (private.lado_en_reto(p_reto, v_yo) is not null or coalesce(r.host_id = v_yo, false)),
    'items', coalesce((select jsonb_agg(jsonb_build_object('id', d.id, 'url', d.url, 'tipo', d.tipo, 'titulo', d.titulo, 'minuto', d.minuto, 'creado', d.creado,
        'autor', private.nombre(d.autor), 'mio', d.autor = v_yo,
        'votos', (select count(*) from public.mejor_gol_votos v where v.repeticion_id = d.id)) order by d.tipo, d.minuto nulls last, d.id)
      from public.duelo_repeticiones d where d.reto_id = p_reto and not d.oculto), '[]'::jsonb));
end $$;

-- Votar el mejor gol de ESTA semana (cambiar el voto vale; no el propio).
create or replace function public.mejor_gol_votar(p_rep bigint) returns jsonb
language plpgsql security definer set search_path = '' as $$
declare v_yo uuid := private.uid_requerido(); d public.duelo_repeticiones; v_sem date := private.semana_lima();
begin
  select * into d from public.duelo_repeticiones where id = p_rep and not oculto;
  if not found or d.tipo <> 'gol' then raise exception 'Ese gol no existe.' using errcode = 'P0001'; end if;
  if private.semana_lima(d.creado) <> v_sem then raise exception 'Solo se votan goles subidos esta semana.' using errcode = 'P0001'; end if;
  if d.autor = v_yo then raise exception 'No puedes votar tu propio gol.' using errcode = '22023'; end if;
  if not private.puedo_ver_duelo(d.reto_id, v_yo) then raise exception 'No puedes ver ese duelo.' using errcode = '42501'; end if;
  insert into public.mejor_gol_votos (usuario, semana, repeticion_id) values (v_yo, v_sem, p_rep)
    on conflict (usuario, semana) do update set repeticion_id = excluded.repeticion_id, votado = now();
  return jsonb_build_object('ok', true);
end $$;

-- Candidatos de esta semana + ganador de la semana pasada.
create or replace function public.mejor_gol_semana() returns jsonb
language plpgsql stable security definer set search_path = '' as $$
declare v_yo uuid := (select auth.uid()); v_sem date := private.semana_lima();
begin
  return jsonb_build_object('semana', v_sem,
    'mi_voto', (select repeticion_id from public.mejor_gol_votos where usuario = v_yo and semana = v_sem),
    'goles', coalesce((select jsonb_agg(x order by (x ->> 'votos')::int desc, (x ->> 'id')::bigint desc) from (
        select jsonb_build_object('id', d.id, 'url', d.url, 'titulo', d.titulo, 'minuto', d.minuto, 'reto_id', d.reto_id, 'autor', private.nombre(d.autor), 'mio', d.autor = v_yo,
          'votos', (select count(*) from public.mejor_gol_votos v where v.repeticion_id = d.id and v.semana = v_sem)) x
        from public.duelo_repeticiones d
        where d.tipo = 'gol' and not d.oculto and private.semana_lima(d.creado) = v_sem and private.puedo_ver_duelo(d.reto_id, v_yo)
        order by d.id desc limit 40) t), '[]'::jsonb),
    'ganador_anterior', (select jsonb_build_object('id', d.id, 'url', d.url, 'titulo', d.titulo, 'autor', private.nombre(d.autor), 'votos', c.n)
        from (select repeticion_id, count(*) n from public.mejor_gol_votos where semana = v_sem - 7 group by repeticion_id order by count(*) desc, min(votado) limit 1) c
        join public.duelo_repeticiones d on d.id = c.repeticion_id
        where not d.oculto and private.puedo_ver_duelo(d.reto_id, v_yo)));
end $$;

revoke all on function public.repeticion_agregar(integer, text, text, text, integer), public.repeticion_ocultar(bigint), public.repeticiones_de(integer),
  public.mejor_gol_votar(bigint), public.mejor_gol_semana() from public, anon;
grant execute on function public.repeticion_agregar(integer, text, text, text, integer), public.repeticion_ocultar(bigint), public.mejor_gol_votar(bigint) to authenticated;
grant execute on function public.repeticiones_de(integer), public.mejor_gol_semana() to anon, authenticated;

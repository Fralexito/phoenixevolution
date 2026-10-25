-- 148 · Goleadores automáticos (función nueva 5/8, 25-oct-2026). Phoenix Link manda los goles (futbolista, minuto, asistencia)
-- ESTADO: APLICADA el 25-oct-2026 13:50 (Lima) y probada en seco (supabase/tests/). Sin DELETE ni DROP TRIGGER: usa «create or replace trigger» (los borrados piden un permiso aparte que se cancelaba).
-- de un DUELO que se jugó en su sala; la web arma la tabla de goleadores de la comunidad y la de cada jugador.
-- Entrada: public.sistema_duelo_goles_link (solo service_role → la llama la Edge Function «goles», ver CONTRATO-GOLES-LINK.md).
-- Blindaje:
--   · Solo cuenta un duelo si su marcador está CONFIRMADO por los dos líderes y los goles de Link CUADRAN con ese marcador
--     (si no cuadran, se guardan pero no suman: el marcador humano manda). Así un Link con fallo no ensucia la tabla.
--   · Link solo puede mandar goles de un duelo atado a una sala de ESE dispositivo (salas.reto_id) → nadie inventa goles ajenos.
--   · Reenviar es seguro: los goles anteriores de ese duelo quedan «no vigentes» y valen los nuevos (idempotente). Máximo 40 goles, nombres sin < >.
--   · Nombres de futbolista normalizados (espacios, mayúsculas) para que «Messi» y « messi » sumen juntos.
--   · Tabla cerrada por RLS; lectura solo por funciones con sesión.
create table if not exists public.duelo_goles (
  id bigint generated always as identity primary key,
  reto_id integer not null references public.retos_matchmaking (id) on delete cascade,
  lado text not null check (lado in ('A', 'B')),        -- a quién se le ANOTA el gol (en un autogol, al rival del que lo hizo)
  goleador text not null check (char_length(goleador) between 1 and 60 and goleador !~ '[<>]'),
  minuto smallint not null check (minuto between 0 and 130),
  asistente text check (asistente is null or (char_length(asistente) between 1 and 60 and asistente !~ '[<>]')),
  tipo text not null default 'gol' check (tipo in ('gol', 'penal', 'en_contra')),
  dispositivo uuid references public.dispositivos_host (id) on delete set null,
  creado timestamptz not null default now(),
  vigente boolean not null default true,      -- reenviar marca los anteriores como no vigentes (no se borra nada)
  check (asistente is null or tipo = 'gol')
);
create index if not exists duelo_goles_reto_idx on public.duelo_goles (reto_id) where vigente;
alter table public.duelo_goles enable row level security;
revoke all on public.duelo_goles from anon, authenticated;

create or replace function private.nombre_futbolista(t text) returns text
language sql immutable set search_path = '' as $$ select nullif(btrim(regexp_replace(coalesce(t, ''), '\s+', ' ', 'g')), '') $$;

-- Duelos cuyos goles de Link valen: marcador confirmado y los goles por lado coinciden.
create or replace function private.duelos_goles_validos() returns table (reto_id integer)
language sql stable security definer set search_path = '' as $$
  select g.reto_id from public.duelo_goles g join public.resultados_duelo r on r.reto_id = g.reto_id and r.estado = 'CONFIRMADO'
  where g.vigente
  group by g.reto_id, r.goles_a, r.goles_b
  having count(*) filter (where g.lado = 'A') = r.goles_a and count(*) filter (where g.lado = 'B') = r.goles_b
$$;
revoke all on function private.nombre_futbolista(text), private.duelos_goles_validos() from public, anon, authenticated;

-- ── Entrada desde Link (service_role) ─────────────────────────────────────────────────────────────────────
create or replace function public.sistema_duelo_goles_link(p_dispositivo uuid, p_reto integer, p_goles jsonb) returns jsonb
language plpgsql security definer set search_path = '' as $$
declare v_g jsonb; v_n integer := 0; v_nombre text; v_asist text; v_tipo text;
begin
  if p_goles is null or jsonb_typeof(p_goles) <> 'array' then raise exception 'CAMPO_INVALIDO goles debe ser una lista'; end if;
  if jsonb_array_length(p_goles) > 40 then raise exception 'CAMPO_INVALIDO demasiados goles (máx. 40)'; end if;
  if not exists (select 1 from public.dispositivos_host d where d.id = p_dispositivo and d.revocado is null) then raise exception 'TOKEN_REVOCADO'; end if;
  if not exists (select 1 from public.retos_matchmaking r where r.id = p_reto) then raise exception 'DUELO_NO_ENCONTRADO'; end if;
  if not exists (select 1 from public.salas s where s.reto_id = p_reto and s.dispositivo = p_dispositivo and s.abierta_en > now() - interval '12 hours') then
    raise exception 'DUELO_NO_ES_DE_ESTA_SALA'; end if;
  if exists (select 1 from public.retos_matchmaking r where r.id = p_reto and r.estado::text not in ('EN_JUEGO', 'FINALIZADO')) then raise exception 'DUELO_NO_JUGADO'; end if;
  -- validar todo ANTES de borrar nada
  for v_g in select * from jsonb_array_elements(p_goles) loop
    if jsonb_typeof(v_g) <> 'object' or coalesce(v_g ->> 'lado', '') not in ('A', 'B') then raise exception 'CAMPO_INVALIDO lado'; end if;
    v_nombre := private.nombre_futbolista(v_g ->> 'goleador');
    if v_nombre is null or char_length(v_nombre) > 60 or v_nombre ~ '[<>]' then raise exception 'CAMPO_INVALIDO goleador'; end if;
    if coalesce(v_g ->> 'minuto', '') !~ '^\d{1,3}$' or (v_g ->> 'minuto')::integer > 130 then raise exception 'CAMPO_INVALIDO minuto'; end if;
    v_tipo := coalesce(v_g ->> 'tipo', 'gol');
    if v_tipo not in ('gol', 'penal', 'en_contra') then raise exception 'CAMPO_INVALIDO tipo'; end if;
    v_asist := private.nombre_futbolista(v_g ->> 'asistente');
    if v_asist is not null and (v_tipo <> 'gol' or char_length(v_asist) > 60 or v_asist ~ '[<>]') then raise exception 'CAMPO_INVALIDO asistente'; end if;
  end loop;
  update public.duelo_goles set vigente = false where reto_id = p_reto and vigente;
  for v_g in select * from jsonb_array_elements(p_goles) loop
    v_tipo := coalesce(v_g ->> 'tipo', 'gol');
    insert into public.duelo_goles (reto_id, lado, goleador, minuto, asistente, tipo, dispositivo)
    values (p_reto, v_g ->> 'lado', private.nombre_futbolista(v_g ->> 'goleador'), (v_g ->> 'minuto')::smallint,
      case when v_tipo = 'gol' then private.nombre_futbolista(v_g ->> 'asistente') end, v_tipo, p_dispositivo);
    v_n := v_n + 1;
  end loop;
  return jsonb_build_object('guardados', v_n,
    'cuadra', exists (select 1 from private.duelos_goles_validos() x where x.reto_id = p_reto),
    'marcador_confirmado', exists (select 1 from public.resultados_duelo r where r.reto_id = p_reto and r.estado = 'CONFIRMADO'));
end $$;
revoke all on function public.sistema_duelo_goles_link(uuid, integer, jsonb) from public, anon, authenticated;
grant execute on function public.sistema_duelo_goles_link(uuid, integer, jsonb) to service_role;

-- ── Lectura (con sesión) ──────────────────────────────────────────────────────────────────────────────────
-- Tabla de la comunidad: futbolistas con más goles (sin autogoles) y asistencias en duelos válidos. p_dias null = siempre.
create or replace function public.goleadores_comunidad(p_dias integer default 30, p_limite integer default 10) returns jsonb
language plpgsql stable security definer set search_path = '' as $$
declare v_desde timestamptz := case when p_dias is null then '-infinity'::timestamptz else now() - make_interval(days => greatest(1, least(p_dias, 3650))) end;
  v_lim integer := greatest(1, least(coalesce(p_limite, 10), 50)); v_g jsonb; v_a jsonb; v_duelos integer;
begin
  perform private.uid_requerido();
  with ok as (select v.reto_id from private.duelos_goles_validos() v join public.retos_matchmaking r on r.id = v.reto_id
              where coalesce(r.cerrado_at, r.created_at) >= v_desde),
  g as (select lower(goleador) k, min(goleador) nombre, count(*) n from public.duelo_goles where vigente and reto_id in (select reto_id from ok) and tipo <> 'en_contra' group by 1),
  a as (select lower(asistente) k, min(asistente) nombre, count(*) n from public.duelo_goles where vigente and reto_id in (select reto_id from ok) and asistente is not null group by 1)
  select (select coalesce(jsonb_agg(jsonb_build_object('nombre', nombre, 'goles', n) order by n desc, nombre), '[]'::jsonb) from (select * from g order by n desc, nombre limit v_lim) x),
         (select coalesce(jsonb_agg(jsonb_build_object('nombre', nombre, 'asistencias', n) order by n desc, nombre), '[]'::jsonb) from (select * from a order by n desc, nombre limit v_lim) x),
         (select count(*) from ok)
    into v_g, v_a, v_duelos;
  return jsonb_build_object('goleadores', v_g, 'asistentes', v_a, 'duelos', v_duelos, 'dias', p_dias);
end $$;

-- Goles de un duelo (para quien puede ver su resultado: jugadores, host, staff).
create or replace function public.goles_de_duelo(p_reto integer) returns jsonb
language plpgsql stable security definer set search_path = '' as $$
declare v_yo uuid := (select auth.uid()); r public.retos_matchmaking;
begin
  if v_yo is null then return null; end if;
  select * into r from public.retos_matchmaking where id = p_reto;
  if not found then return null; end if;
  if not (private.lado_en_reto(p_reto, v_yo) is not null or v_yo = r.host_id or private.es_moderador()
          or exists (select 1 from public.reto_espectadores e where e.reto_id = p_reto and e.usuario_id = v_yo and e.estado = 'APROBADO')) then return null; end if;
  return jsonb_build_object('reto_id', p_reto,
    'cuadra', exists (select 1 from private.duelos_goles_validos() x where x.reto_id = p_reto),
    'goles', (select coalesce(jsonb_agg(jsonb_build_object('lado', lado, 'goleador', goleador, 'minuto', minuto, 'asistente', asistente, 'tipo', tipo) order by minuto, id), '[]'::jsonb)
              from public.duelo_goles where reto_id = p_reto and vigente));
end $$;

revoke all on function public.goleadores_comunidad(integer, integer), public.goles_de_duelo(integer) from public, anon;
grant execute on function public.goleadores_comunidad(integer, integer), public.goles_de_duelo(integer) to authenticated;

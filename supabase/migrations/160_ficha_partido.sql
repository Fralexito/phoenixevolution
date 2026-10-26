-- 160 · Ficha del partido de Phoenix Link 0.3.51 (25-oct-2026, Cuenta 2). Pedido: smash-soda-fork docs/PEDIDOS-A-LA-WEB.md, Parte 15.
-- ESTADO: APLICADA el 25-oct-2026 y probada en seco (supabase/tests/160_ficha_partido_test.sql).
-- Qué llega desde Link 0.3.51 (con el módulo opcional phoenix_sonda.lua):
--   · partida_fin (eventos_sala.datos): «ficha» {estadio, estadio_nombre?, clima, hora, estacion, duracion, dificultad, prorroga, penales,
--     cambios, zona} (valores tal cual los da Sider) y juego.anadido (minutos añadidos del último periodo).
--   · POST /liga/v1/liga/vivo: anadido, pk_local / pk_visita (solo si hubo tanda) y ficha.
-- Qué hace esta migración:
--   1) liga_vivo: columnas nuevas anadido, pk_local, pk_visita, ficha (la Edge Function «liga» las guarda; la tarjeta muestra «45+3′» y los penales).
--   2) liga_ediciones.reglas_partido: lo que el staff exige en esa edición (duración, dificultad, prórroga, penales, cambios). Vacío = sin control.
--   3) private.ficha_limpia: solo campos conocidos y valores simples (nada de objetos ni textos largos) → nadie mete basura por la ficha.
--   4) private.ficha_revisar: compara la ficha con las reglas → lista de diferencias. ANTI-TRAMPAS SIN CASTIGO: solo marca el partido
--      para que el staff lo mire; nunca lo rechaza solo (lo pidió Link: la sonda es nueva y los códigos de Sider pueden variar).
--   5) public.sistema_ficha_liga (solo service_role): la usa la Edge Function «liga» al recibir el resultado → detalle.ficha y detalle.revisar.
--   6) public.ficha_de_duelo: ficha del último partido terminado en la sala de un duelo (mismas reglas de privacidad que las repeticiones).
--   7) public.staff_liga_reglas_partido: el staff fija las reglas de una edición.
-- Si no hay ficha (sonda no instalada), todo sigue igual que antes. Sin DELETE ni DROP TRIGGER.

-- 1) Marcador en vivo
alter table public.liga_vivo add column if not exists anadido smallint not null default 0;
alter table public.liga_vivo add column if not exists pk_local smallint;
alter table public.liga_vivo add column if not exists pk_visita smallint;
alter table public.liga_vivo add column if not exists ficha jsonb;
alter table public.liga_vivo drop constraint if exists liga_vivo_anadido_check;
alter table public.liga_vivo add constraint liga_vivo_anadido_check check (anadido between 0 and 30);
alter table public.liga_vivo drop constraint if exists liga_vivo_pk_check;
alter table public.liga_vivo add constraint liga_vivo_pk_check check ((pk_local is null or pk_local between 0 and 99) and (pk_visita is null or pk_visita between 0 and 99));
alter table public.liga_vivo drop constraint if exists liga_vivo_ficha_check;
alter table public.liga_vivo add constraint liga_vivo_ficha_check check (ficha is null or (jsonb_typeof(ficha) = 'object' and pg_column_size(ficha) <= 1024));

-- 2) Reglas del partido por edición
alter table public.liga_ediciones add column if not exists reglas_partido jsonb not null default '{}'::jsonb;

create or replace function private.reglas_partido_validas(r jsonb) returns boolean
language sql immutable set search_path = '' as $$
  select jsonb_typeof(r) = 'object'
    and not exists (select 1 from jsonb_object_keys(r) k where k not in ('duracion', 'dificultad', 'prorroga', 'penales', 'cambios'))
    and (not r ? 'duracion'   or (jsonb_typeof(r -> 'duracion') = 'number'   and (r ->> 'duracion') ~ '^\d+$'   and (r ->> 'duracion')::int between 1 and 60))
    and (not r ? 'dificultad' or (jsonb_typeof(r -> 'dificultad') = 'number' and (r ->> 'dificultad') ~ '^\d+$' and (r ->> 'dificultad')::int between 0 and 10))
    and (not r ? 'cambios'    or (jsonb_typeof(r -> 'cambios') = 'number'    and (r ->> 'cambios') ~ '^\d+$'    and (r ->> 'cambios')::int between 0 and 12))
    and (not r ? 'prorroga'   or jsonb_typeof(r -> 'prorroga') = 'boolean')
    and (not r ? 'penales'    or jsonb_typeof(r -> 'penales') = 'boolean')
$$;
alter table public.liga_ediciones drop constraint if exists liga_ediciones_reglas_partido_check;
alter table public.liga_ediciones add constraint liga_ediciones_reglas_partido_check check (private.reglas_partido_validas(reglas_partido));

-- 3) Ficha limpia: claves conocidas, valores número / booleano / texto corto. Objeto vacío → null.
create or replace function private.ficha_limpia(f jsonb) returns jsonb
language sql immutable set search_path = '' as $$
  select case when jsonb_typeof(f) <> 'object' then null else nullif((
    select coalesce(jsonb_object_agg(k, v), '{}'::jsonb) from jsonb_each(f) e(k, v)
    where k in ('estadio', 'estadio_nombre', 'clima', 'hora', 'estacion', 'duracion', 'dificultad', 'prorroga', 'penales', 'cambios', 'zona')
      and (jsonb_typeof(v) in ('number', 'boolean') or (jsonb_typeof(v) = 'string' and char_length(v #>> '{}') between 1 and 60))), '{}'::jsonb) end
$$;

-- 4) Diferencias entre la ficha y las reglas: [{campo, regla, partido}]. Prórroga y penales: número ≠ 0 = sí.
create or replace function private.ficha_revisar(r jsonb, f jsonb) returns jsonb
language sql immutable set search_path = '' as $$
  with ff as (select private.ficha_limpia(f) f),
  c as (
    select k, r -> k regla, (select f -> k from ff) partido from unnest(array['duracion', 'dificultad', 'cambios', 'prorroga', 'penales']) k
    where coalesce(jsonb_typeof(r), '') = 'object' and r ? k and (select f from ff) ? k
  ),
  d as (
    select k, regla, partido from c
    where case when k in ('prorroga', 'penales') then
                 (case jsonb_typeof(partido) when 'boolean' then (partido #>> '{}')::boolean
                                             when 'number' then (partido #>> '{}')::numeric <> 0 end) is distinct from (regla #>> '{}')::boolean
               else jsonb_typeof(partido) <> 'number' or (partido #>> '{}')::numeric <> (regla #>> '{}')::numeric end
  )
  select coalesce((select jsonb_agg(jsonb_build_object('campo', k, 'regla', regla, 'partido', partido) order by k) from d), '[]'::jsonb)
$$;
revoke all on function private.reglas_partido_validas(jsonb), private.ficha_limpia(jsonb), private.ficha_revisar(jsonb, jsonb) from public, anon, authenticated;

-- Último partido terminado de una sala (el completo primero; si no, el más reciente).
create or replace function private.partida_fin_de_sala(p_sala uuid, p_desde timestamptz default '-infinity') returns jsonb
language sql stable security definer set search_path = '' as $$
  select e.datos from public.eventos_sala e
  where e.sala_id = p_sala and e.tipo = 'partida_fin' and e.ocurrido >= p_desde
  order by (e.datos ->> 'cierre') = 'completo' desc nulls last, e.ocurrido desc limit 1
$$;
revoke all on function private.partida_fin_de_sala(uuid, timestamptz) from public, anon, authenticated;

-- 5) Para la Edge Function «liga» (resultado): ficha + diferencias con las reglas de la edición del partido.
create or replace function public.sistema_ficha_liga(p_sala uuid, p_partido bigint) returns jsonb
language plpgsql stable security definer set search_path = '' as $$
declare d jsonb; v_reglas jsonb; v_ficha jsonb;
begin
  if p_sala is null then return jsonb_build_object('ficha', null, 'anadido', null, 'revisar', '[]'::jsonb); end if;
  d := private.partida_fin_de_sala(p_sala, now() - interval '3 hours');
  v_ficha := private.ficha_limpia(d -> 'ficha');
  select e.reglas_partido into v_reglas from public.liga_partidos p join public.liga_ediciones e on e.id = p.edicion_id where p.id = p_partido;
  return jsonb_build_object('ficha', v_ficha,
    'anadido', case when (d #>> '{juego,anadido}') ~ '^\d{1,2}$' then (d #>> '{juego,anadido}')::int end,
    'revisar', case when v_ficha is null then '[]'::jsonb else private.ficha_revisar(coalesce(v_reglas, '{}'::jsonb), v_ficha) end);
end $$;
revoke all on function public.sistema_ficha_liga(uuid, bigint) from public, anon, authenticated;
grant execute on function public.sistema_ficha_liga(uuid, bigint) to service_role;

-- 6) Ficha de un duelo (página de repeticiones y sala en vivo). Visible si puedes ver el muro de todos sus jugadores.
create or replace function public.ficha_de_duelo(p_reto integer) returns jsonb
language plpgsql stable security definer set search_path = '' as $$
declare v_yo uuid := (select auth.uid()); d jsonb;
begin
  if not exists (select 1 from public.retos_matchmaking where id = p_reto) or not private.puedo_ver_duelo(p_reto, v_yo) then return null; end if;
  select private.partida_fin_de_sala(s.id) into d from public.salas s
  where s.reto_id = p_reto and exists (select 1 from public.eventos_sala e where e.sala_id = s.id and e.tipo = 'partida_fin')
  order by s.abierta_en desc limit 1;
  if d is null then return null; end if;
  return jsonb_build_object('ficha', private.ficha_limpia(d -> 'ficha'),
    'anadido', case when (d #>> '{juego,anadido}') ~ '^\d{1,2}$' then (d #>> '{juego,anadido}')::int end,
    'penales_a', case when (d #>> '{juego,penales_a}') ~ '^\d{1,2}$' then (d #>> '{juego,penales_a}')::int end,
    'penales_b', case when (d #>> '{juego,penales_b}') ~ '^\d{1,2}$' then (d #>> '{juego,penales_b}')::int end,
    'duracion_seg', case when (d ->> 'duracion_seg') ~ '^\d{1,6}$' then (d ->> 'duracion_seg')::int end);
end $$;
revoke all on function public.ficha_de_duelo(integer) from public;
grant execute on function public.ficha_de_duelo(integer) to anon, authenticated;

-- 7) Staff: reglas del partido de una edición ({} = sin control).
create or replace function public.staff_liga_reglas_partido(p_edicion text, p_reglas jsonb) returns jsonb
language plpgsql security definer set search_path = '' as $$
declare v_r jsonb := coalesce(p_reglas, '{}'::jsonb);
begin
  perform private.uid_requerido();
  if not private.es_moderador() then raise exception 'Solo el staff fija las reglas del partido.' using errcode = '42501'; end if;
  if not private.reglas_partido_validas(v_r) then
    raise exception 'Reglas no válidas: duración 1–60, dificultad 0–10, cambios 0–12, prórroga y penales sí/no.' using errcode = '22023'; end if;
  update public.liga_ediciones set reglas_partido = v_r where id = p_edicion;
  if not found then raise exception 'Esa edición no existe.' using errcode = 'P0001'; end if;
  return jsonb_build_object('ok', true, 'reglas', v_r);
end $$;
revoke all on function public.staff_liga_reglas_partido(text, jsonb) from public, anon;
grant execute on function public.staff_liga_reglas_partido(text, jsonb) to authenticated;

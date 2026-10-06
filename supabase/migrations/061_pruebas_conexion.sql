-- 061 · MÓDULO 2 · PRUEBAS DE CONEXIÓN (justicia antes del partido). Fuente: claude/smash-soda-producto.md §5. Contrato: claude/contrato-v1.md v1.3.0.
-- Tres niveles, una sola tabla (pruebas_conexion):
--   · autodiagnostico_host  → lo manda la app (POST /v1/diagnostico) antes de abrir sala: subida/latencia/jitter/pérdida del host.
--   · prechequeo_web        → lo mide el navegador del jugador contra GET /v1/eco (varias muestras, mediana) y lo guarda por RPC. ESTIMACIÓN.
--   · prueba_sala           → la manda la app (POST /v1/sala/prueba) tras 10 s del jugador conectado por Parsec: el camino real. EXACTA.
-- Semáforo: umbrales por perfil de reglas (reglas.semaforo); si un perfil no los trae, se usan los por defecto de abajo.
-- Historial de un par host↔jugador: muestras_calidad (14 días) + pruebas en sala (90 días), solo agregados y solo para ese par o staff.

-- ─── 1) Umbrales del semáforo en los perfiles de reglas (campo opcional, validado si viene) ─────────────────────────────
create or replace function private.semaforo_valido(s jsonb) returns boolean
language sql immutable set search_path = '' as $$
  select s is null or (
    jsonb_typeof(s) = 'object'
    and jsonb_typeof(s -> 'ping_verde_ms') = 'number' and jsonb_typeof(s -> 'ping_ambar_ms') = 'number'
    and jsonb_typeof(s -> 'jitter_verde_ms') = 'number' and jsonb_typeof(s -> 'jitter_ambar_ms') = 'number'
    and jsonb_typeof(s -> 'perdida_verde_pct') = 'number' and jsonb_typeof(s -> 'perdida_ambar_pct') = 'number'
    and (s ->> 'ping_verde_ms')::numeric between 1 and 1000 and (s ->> 'ping_ambar_ms')::numeric > (s ->> 'ping_verde_ms')::numeric
    and (s ->> 'jitter_verde_ms')::numeric between 0 and 500 and (s ->> 'jitter_ambar_ms')::numeric > (s ->> 'jitter_verde_ms')::numeric
    and (s ->> 'perdida_verde_pct')::numeric between 0 and 100 and (s ->> 'perdida_ambar_pct')::numeric > (s ->> 'perdida_verde_pct')::numeric
    and (s ->> 'ping_ambar_ms')::numeric <= 2000 and (s ->> 'jitter_ambar_ms')::numeric <= 1000 and (s ->> 'perdida_ambar_pct')::numeric <= 100)
$$;

create or replace function private.reglas_validas(r jsonb) returns boolean
language sql immutable set search_path = '' as $$
  select jsonb_typeof(r) = 'object'
    and r ->> 'host' in ('cualquier_verificado', 'hosts_organizacion', 'neutral')
    and r ->> 'modo_competitivo' in ('opcional', 'obligatorio', 'desactivado', 'no_aplica')
    and jsonb_typeof(r -> 'retraso_host_ms') = 'number' and (r ->> 'retraso_host_ms')::numeric between 0 and 500
    and r ->> 'deteccion_partido' in ('opcional', 'activa', 'obligatoria')
    and jsonb_typeof(r -> 'captura') = 'boolean'
    and r ->> 'verificacion_parche' in ('aviso', 'lista', 'huella_oficial')
    and jsonb_typeof(coalesce(r -> 'parches_permitidos', '[]'::jsonb)) = 'array'
    and jsonb_array_length(coalesce(r -> 'parches_permitidos', '[]'::jsonb)) <= 30
    and r ->> 'pausas' in ('libres', 'limitadas')
    and jsonb_typeof(r -> 'pausas_max') = 'number' and (r ->> 'pausas_max')::numeric between 0 and 20
    and jsonb_typeof(r -> 'pausa_max_seg') = 'number' and (r ->> 'pausa_max_seg')::numeric between 0 and 1800
    and r ->> 'anti_trampa' in ('registro', 'alertas_organizador', 'alertas_staff')
    and r ->> 'marca' in ('phoenix', 'organizacion', 'liga')
    and r ->> 'notificaciones' in ('host', 'organizador', 'automaticas')
    and private.semaforo_valido(r -> 'semaforo')
$$;

update public.perfiles_reglas set version = version + 1, actualizado = now(), reglas = reglas || jsonb_build_object('semaforo',
  case clave
    when 'amistoso' then '{"ping_verde_ms":60,"ping_ambar_ms":100,"jitter_verde_ms":10,"jitter_ambar_ms":25,"perdida_verde_pct":1,"perdida_ambar_pct":3}'::jsonb
    when 'torneo_privado' then '{"ping_verde_ms":50,"ping_ambar_ms":90,"jitter_verde_ms":8,"jitter_ambar_ms":20,"perdida_verde_pct":0.5,"perdida_ambar_pct":2}'::jsonb
    else '{"ping_verde_ms":40,"ping_ambar_ms":80,"jitter_verde_ms":6,"jitter_ambar_ms":15,"perdida_verde_pct":0.5,"perdida_ambar_pct":1.5}'::jsonb
  end)
where organizacion is null and not (reglas ? 'semaforo');

-- Umbrales efectivos de un perfil (o de una sala): los del perfil, o los por defecto.
create or replace function private.umbrales(p_reglas jsonb) returns jsonb
language sql immutable set search_path = '' as $$
  select coalesce(case when private.semaforo_valido(p_reglas -> 'semaforo') then p_reglas -> 'semaforo' end,
    '{"ping_verde_ms":60,"ping_ambar_ms":100,"jitter_verde_ms":10,"jitter_ambar_ms":25,"perdida_verde_pct":1,"perdida_ambar_pct":3}'::jsonb)
$$;

-- Color: cada métrica presente se compara con su umbral; manda la peor. Sin ninguna métrica → 'sin_datos'.
create or replace function private.semaforo(p_umbrales jsonb, p_ping numeric, p_jitter numeric, p_perdida numeric) returns text
language sql immutable set search_path = '' as $$
  with m(v, verde, ambar) as (values
    (p_ping, (p_umbrales ->> 'ping_verde_ms')::numeric, (p_umbrales ->> 'ping_ambar_ms')::numeric),
    (p_jitter, (p_umbrales ->> 'jitter_verde_ms')::numeric, (p_umbrales ->> 'jitter_ambar_ms')::numeric),
    (p_perdida, (p_umbrales ->> 'perdida_verde_pct')::numeric, (p_umbrales ->> 'perdida_ambar_pct')::numeric))
  select case
    when count(v) = 0 then 'sin_datos'
    when bool_or(v > ambar) then 'rojo'
    when bool_or(v > verde) then 'ambar'
    else 'verde' end
  from m
$$;
revoke all on function private.semaforo_valido(jsonb), private.umbrales(jsonb), private.semaforo(jsonb, numeric, numeric, numeric) from public, anon;
grant execute on function private.semaforo_valido(jsonb), private.umbrales(jsonb), private.semaforo(jsonb, numeric, numeric, numeric) to authenticated;

-- ─── 2) Tabla única de pruebas ──────────────────────────────────────────────────────────────────────────────────────────
create table if not exists public.pruebas_conexion (
  id bigint generated always as identity primary key,
  tipo text not null check (tipo in ('autodiagnostico_host', 'prechequeo_web', 'prueba_sala')),
  usuario uuid references public.perfiles (id) on delete cascade,     -- quién fue medido (host en autodiagnóstico; jugador en las otras)
  host uuid references public.perfiles (id) on delete cascade,        -- host de la sala (null en pre-chequeo sin sala)
  sala_id uuid references public.salas (id) on delete set null,
  dispositivo uuid references public.dispositivos_host (id) on delete set null,
  actor_parsec text check (actor_parsec ~ '^[0-9]{1,20}$'),
  latencia_ms numeric(7, 1) check (latencia_ms between 0 and 10000),  -- mediana
  p95_ms numeric(7, 1) check (p95_ms between 0 and 10000),
  jitter_ms numeric(7, 1) check (jitter_ms between 0 and 5000),
  perdida_pct numeric(5, 2) check (perdida_pct between 0 and 100),
  subida_kbps integer check (subida_kbps between 0 and 10000000),
  bajada_kbps integer check (bajada_kbps between 0 and 10000000),
  bitrate_kbps integer check (bitrate_kbps between 0 and 1000000),
  muestras smallint check (muestras between 1 and 1000),
  duracion_seg smallint check (duracion_seg between 1 and 600),
  referencia text check (char_length(referencia) <= 80),
  semaforo text not null default 'sin_datos' check (semaforo in ('verde', 'ambar', 'rojo', 'sin_datos')),
  detalles jsonb not null default '{}'::jsonb check (pg_column_size(detalles) <= 4096),
  creada timestamptz not null default now()
);
create index if not exists pruebas_conexion_usuario_idx on public.pruebas_conexion (usuario, creada desc);
create index if not exists pruebas_conexion_par_idx on public.pruebas_conexion (host, usuario, creada desc) where tipo = 'prueba_sala';
create index if not exists pruebas_conexion_sala_idx on public.pruebas_conexion (sala_id) where sala_id is not null;
create index if not exists pruebas_conexion_creada_idx on public.pruebas_conexion (creada);

alter table public.pruebas_conexion enable row level security;
drop policy if exists pruebas_conexion_leer on public.pruebas_conexion;
create policy pruebas_conexion_leer on public.pruebas_conexion for select to authenticated
  using (usuario = (select auth.uid()) or host = (select auth.uid()) or private.es_staff()
         or (sala_id is not null and exists (select 1 from public.salas s where s.id = sala_id and s.organizacion is not null and private.gestiona_org(s.organizacion))));
revoke all on public.pruebas_conexion from anon, authenticated;
grant select on public.pruebas_conexion to authenticated;
do $$ begin
  if not exists (select 1 from pg_publication_tables where pubname = 'supabase_realtime' and tablename = 'pruebas_conexion') then
    alter publication supabase_realtime add table public.pruebas_conexion;     -- el jugador ve llegar su prueba en sala al instante
  end if;
end $$;

-- ─── 3) RPC web ─────────────────────────────────────────────────────────────────────────────────────────────────────────
-- 3.1 Guardar el pre-chequeo del navegador (máx. 20 por hora). Devuelve el semáforo según las reglas de la sala (si hay).
create or replace function public.guardar_prechequeo(p_latencia numeric, p_jitter numeric, p_perdida numeric, p_muestras integer,
  p_referencia text, p_sala uuid default null, p_detalles jsonb default '{}'::jsonb) returns jsonb
language plpgsql security definer set search_path = '' as $$
declare yo uuid := private.uid_requerido(); s public.salas%rowtype; u jsonb; color text; nuevo bigint;
begin
  if (select count(*) from public.pruebas_conexion where usuario = yo and tipo = 'prechequeo_web' and creada > now() - interval '1 hour') >= 20 then
    raise exception 'Hiciste muchas pruebas seguidas: espera un rato.' using errcode = 'P0001';
  end if;
  if p_sala is not null then
    select * into s from public.salas where id = p_sala;
    if not found then raise exception 'Sala no encontrada.' using errcode = 'P0002'; end if;
    if not (s.host = yo or private.es_staff() or (s.organizacion is not null and private.rol_en_org(s.organizacion) is not null)
            or (s.organizacion is null and private.puede_ver_sala(s.host, case when s.publicar_en_pagina then s.visibilidad else 'privada' end, s.reto_id))) then
      raise exception 'Sala no encontrada.' using errcode = 'P0002';
    end if;
  end if;
  u := private.umbrales(s.reglas);
  color := private.semaforo(u, p_latencia, p_jitter, p_perdida);
  insert into public.pruebas_conexion (tipo, usuario, host, sala_id, latencia_ms, jitter_ms, perdida_pct, muestras, referencia, semaforo, detalles)
  values ('prechequeo_web', yo, s.host, p_sala, round(p_latencia, 1), round(p_jitter, 1), round(p_perdida, 2), p_muestras, left(p_referencia, 80), color,
          coalesce(p_detalles, '{}'::jsonb))
  returning id into nuevo;
  return jsonb_build_object('id', nuevo, 'semaforo', color, 'umbrales', u);
end $$;

-- 3.2 Historial real de un par host↔jugador (agregados, 14 días de muestras + 90 días de pruebas en sala).
-- Solo pueden pedirlo: el propio jugador, el host, o staff. Devuelve también el semáforo con los umbrales del perfil pedido.
create or replace function public.historial_ping_par(p_host uuid, p_jugador uuid default null, p_perfil text default 'amistoso') returns jsonb
language plpgsql stable security definer set search_path = '' as $$
declare yo uuid := private.uid_requerido(); j uuid := coalesce(p_jugador, yo); u jsonb; m record; p record;
begin
  if not (yo = j or yo = p_host or private.es_staff()) then raise exception 'Solo el jugador, el host o staff pueden ver este historial.' using errcode = '42501'; end if;
  u := private.umbrales((select reglas from public.perfiles_reglas where clave = p_perfil and organizacion is null));
  select count(*) n, percentile_cont(0.5) within group (order by ping_ms) mediana, percentile_cont(0.95) within group (order by ping_ms) p95,
         round(100.0 * sum(slow_rts) / nullif(sum(coalesce(fast_rts, 0) + coalesce(slow_rts, 0)), 0), 2) perdida, max(tomada) ultima
    into m from public.muestras_calidad where host = p_host and usuario = j and ping_ms is not null and tomada > now() - interval '14 days';
  select count(*) n, percentile_cont(0.5) within group (order by latencia_ms) mediana, avg(jitter_ms) jitter, avg(perdida_pct) perdida, max(creada) ultima
    into p from public.pruebas_conexion where tipo = 'prueba_sala' and host = p_host and usuario = j and creada > now() - interval '90 days';
  return jsonb_build_object(
    'muestras', jsonb_build_object('n', m.n, 'ping_mediana_ms', round(m.mediana::numeric, 1), 'ping_p95_ms', round(m.p95::numeric, 1), 'perdida_pct', m.perdida, 'ultima', m.ultima),
    'pruebas_sala', jsonb_build_object('n', p.n, 'ping_mediana_ms', round(p.mediana::numeric, 1), 'jitter_ms', round(p.jitter, 1), 'perdida_pct', round(p.perdida, 2), 'ultima', p.ultima),
    'semaforo', private.semaforo(u, coalesce(round(p.mediana::numeric, 1), round(m.mediana::numeric, 1)), round(p.jitter, 1), coalesce(round(p.perdida, 2), m.perdida)),
    'umbrales', u);
end $$;

revoke all on function public.guardar_prechequeo(numeric, numeric, numeric, integer, text, uuid, jsonb), public.historial_ping_par(uuid, uuid, text) from public, anon;
grant execute on function public.guardar_prechequeo(numeric, numeric, numeric, integer, text, uuid, jsonb), public.historial_ping_par(uuid, uuid, text) to authenticated;

-- 3.3 Solo backend: semáforo con umbrales de unas reglas (lo usa la Edge Function para responder a la app).
create or replace function public.sistema_semaforo(p_reglas jsonb, p_ping numeric, p_jitter numeric, p_perdida numeric) returns jsonb
language sql immutable set search_path = '' as $$
  select jsonb_build_object('semaforo', private.semaforo(private.umbrales(p_reglas), p_ping, p_jitter, p_perdida), 'umbrales', private.umbrales(p_reglas))
$$;
revoke all on function public.sistema_semaforo(jsonb, numeric, numeric, numeric) from public, anon, authenticated;
grant execute on function public.sistema_semaforo(jsonb, numeric, numeric, numeric) to service_role;

-- ─── 4) Retención: pruebas > 90 días se purgan con el resto (purga diaria de la 058) ─────────────────────────────────────
create or replace function private.purgar_salas() returns void
language plpgsql security definer set search_path = '' as $$
begin
  delete from public.muestras_calidad where tomada < now() - interval '14 days';
  delete from public.codigos_emparejamiento where expira < now() - interval '1 day';
  delete from public.pruebas_conexion where creada < now() - interval '90 days';
end $$;

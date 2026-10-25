-- 149 · Prode (función nueva 6/8, 25-oct-2026). Juego de PRONÓSTICOS sobre los duelos agendados de la comunidad.
-- ESTADO: escrita, NO APLICADA (Supabase canceló el permiso el 25-oct-2026). Fralex la pega a mano en el SQL Editor.
-- Entrar es GRATIS: no se pone nada en juego (no es apuesta). Premio en ascuas GRATIS (regla 140: tipo «ganado»).
-- Puntos: marcador exacto 10 · ganador (o empate) acertado 3 · nada 0. Tope: 100 ascuas por semana (lunes a domingo, hora de Lima).
-- Blindaje:
--   · No puedes pronosticar un duelo en el que juegas o eres host (no hay conflicto de interés).
--   · Se cierra al empezar: solo duelos ACEPTADO con fecha futura (o sin fecha mientras sigan ACEPTADO). Cambiar el pronóstico vale hasta el cierre.
--   · Se liquida SOLO cuando el marcador queda CONFIRMADO por los dos líderes (o lo resuelve el staff): un trigger lo hace una vez.
--   · El premio usa una clave única por pronóstico → nunca se paga dos veces aunque el trigger corra de nuevo.
--   · El tope semanal se calcula sobre lo ya pagado por el prode esa semana; si se llena, los puntos cuentan en el ranking pero no dan ascuas.
--   · Tabla cerrada por RLS; todo por funciones. Interruptor del staff: phoenix_config «prode» = false pausa pronósticos y premios.
create table if not exists public.prode_pronosticos (
  reto_id integer not null references public.retos_matchmaking (id) on delete cascade,
  usuario uuid not null references public.perfiles (id) on delete cascade,
  goles_a smallint not null check (goles_a between 0 and 30),
  goles_b smallint not null check (goles_b between 0 and 30),
  creado timestamptz not null default now(),
  actualizado timestamptz not null default now(),
  puntos smallint check (puntos in (0, 3, 10)),
  ascuas smallint check (ascuas between 0 and 10),
  liquidado timestamptz,
  primary key (reto_id, usuario)
);
create index if not exists prode_usuario_idx on public.prode_pronosticos (usuario, liquidado desc);
create index if not exists prode_liquidado_idx on public.prode_pronosticos (liquidado) where liquidado is not null;
alter table public.prode_pronosticos enable row level security;
revoke all on public.prode_pronosticos from anon, authenticated;

create or replace function private.prode_activo() returns boolean
language sql stable security definer set search_path = '' as $$
  select not exists (select 1 from public.phoenix_config c where c.clave = 'prode' and c.valor = 'false'::jsonb)
$$;
create or replace function private.prode_semana(t timestamptz default now()) returns timestamptz
language sql stable set search_path = '' as $$ select (date_trunc('week', t at time zone 'America/Lima')) at time zone 'America/Lima' $$;
create or replace function private.prode_puntos(pa integer, pb integer, ra integer, rb integer) returns integer
language sql immutable set search_path = '' as $$
  select case when pa = ra and pb = rb then 10 when sign(pa - pb) = sign(ra - rb) then 3 else 0 end
$$;
-- ¿Se puede pronosticar este duelo? (sin contar quién pregunta)
create or replace function private.prode_abierto(p_reto integer) returns boolean
language sql stable security definer set search_path = '' as $$
  select exists (select 1 from public.retos_matchmaking r where r.id = p_reto and r.estado::text = 'ACEPTADO' and r.rival_id is not null
    and (r.fecha_programada is null or r.fecha_programada > now()))
$$;
revoke all on function private.prode_activo(), private.prode_semana(timestamptz), private.prode_puntos(integer, integer, integer, integer), private.prode_abierto(integer) from public, anon, authenticated;

-- ── Liquidar (trigger sobre resultados_duelo) ───────────────────────────────────────────────────────────────
create or replace function private.prode_liquidar() returns trigger
language plpgsql security definer set search_path = '' as $$
declare p record; v_pts integer; v_pagado integer; v_dar integer; v_semana timestamptz := private.prode_semana();
begin
  if new.estado <> 'CONFIRMADO' or (tg_op = 'UPDATE' and old.estado = 'CONFIRMADO' and old.goles_a = new.goles_a and old.goles_b = new.goles_b) then return new; end if;
  for p in select * from public.prode_pronosticos where reto_id = new.reto_id and liquidado is null for update loop
    v_pts := private.prode_puntos(p.goles_a, p.goles_b, new.goles_a, new.goles_b);
    v_dar := 0;
    if v_pts > 0 and private.prode_activo() then
      select coalesce(sum(x.ascuas), 0) into v_pagado from public.prode_pronosticos x
       where x.usuario = p.usuario and x.liquidado >= v_semana;
      v_dar := greatest(0, least(v_pts, 100 - v_pagado));
      if v_dar > 0 then
        perform private.registrar_movimiento(p.usuario, v_dar, 'ganado', 'prode', 'reto:' || new.reto_id, 'prode:' || new.reto_id || ':' || p.usuario, 'ascuas');
      end if;
    end if;
    update public.prode_pronosticos set puntos = v_pts, ascuas = v_dar, liquidado = now() where reto_id = p.reto_id and usuario = p.usuario;
  end loop;
  return new;
exception when others then
  -- Un fallo del prode NUNCA debe impedir confirmar un marcador: se registra y se sigue (quedan sin liquidar y se pueden reintentar).
  raise warning 'prode_liquidar reto %: %', new.reto_id, sqlerrm;
  return new;
end $$;
revoke all on function private.prode_liquidar() from public, anon, authenticated;
drop trigger if exists zz_prode_liquidar on public.resultados_duelo;
create trigger zz_prode_liquidar after insert or update of estado, goles_a, goles_b on public.resultados_duelo
  for each row execute function private.prode_liquidar();

-- ── Público (con sesión) ────────────────────────────────────────────────────────────────────────────────────
create or replace function public.prode_pronosticar(p_reto integer, p_goles_a integer, p_goles_b integer) returns jsonb
language plpgsql security definer set search_path = '' as $$
declare v_yo uuid := private.uid_requerido(); r public.retos_matchmaking;
begin
  if not private.prode_activo() then raise exception 'El prode está en pausa por el staff.' using errcode = 'P0001'; end if;
  if p_goles_a is null or p_goles_b is null or p_goles_a not between 0 and 30 or p_goles_b not between 0 and 30 then
    raise exception 'Los goles deben ser números entre 0 y 30.' using errcode = '22023'; end if;
  select * into r from public.retos_matchmaking where id = p_reto;
  if not found then raise exception 'Ese duelo no existe.' using errcode = 'P0001'; end if;
  if not private.prode_abierto(p_reto) then raise exception 'Ese duelo ya no acepta pronósticos (empezó o no está agendado).' using errcode = 'P0001'; end if;
  if private.lado_en_reto(p_reto, v_yo) is not null or r.host_id = v_yo then raise exception 'No puedes pronosticar un duelo en el que juegas o eres host.' using errcode = '42501'; end if;
  insert into public.prode_pronosticos (reto_id, usuario, goles_a, goles_b) values (p_reto, v_yo, p_goles_a, p_goles_b)
    on conflict (reto_id, usuario) do update set goles_a = excluded.goles_a, goles_b = excluded.goles_b, actualizado = now()
    where public.prode_pronosticos.liquidado is null;
  return jsonb_build_object('ok', true);
end $$;

-- Duelos para pronosticar + mis últimos resultados + mi semana.
create or replace function public.prode_tablero() returns jsonb
language plpgsql stable security definer set search_path = '' as $$
declare v_yo uuid := private.uid_requerido(); v_semana timestamptz := private.prode_semana();
begin
  return jsonb_build_object(
    'activo', private.prode_activo(),
    'semana_desde', v_semana, 'semana_hasta', v_semana + interval '7 days',
    'tope', 100,
    'ganado_semana', (select coalesce(sum(ascuas), 0) from public.prode_pronosticos where usuario = v_yo and liquidado >= v_semana),
    'puntos_semana', (select coalesce(sum(puntos), 0) from public.prode_pronosticos where usuario = v_yo and liquidado >= v_semana),
    'abiertos', (select coalesce(jsonb_agg(jsonb_build_object('reto_id', r.id, 'fecha', r.fecha_programada,
        'a', jsonb_build_object('id', r.retador_id, 'nombre', private.nombre(r.retador_id)),
        'b', jsonb_build_object('id', r.rival_id, 'nombre', private.nombre(r.rival_id)),
        'tam_a', r.tam_a, 'tam_b', r.tam_b,
        'pronosticos', (select count(*) from public.prode_pronosticos x where x.reto_id = r.id),
        'mio', (select jsonb_build_object('a', x.goles_a, 'b', x.goles_b) from public.prode_pronosticos x where x.reto_id = r.id and x.usuario = v_yo),
        'puedo', private.lado_en_reto(r.id, v_yo) is null and r.host_id is distinct from v_yo)
        order by r.fecha_programada nulls last, r.id), '[]'::jsonb)
      from (select * from public.retos_matchmaking r where r.estado::text = 'ACEPTADO' and r.rival_id is not null
              and (r.fecha_programada is null or r.fecha_programada > now())
              and not private.hay_bloqueo(r.retador_id, v_yo) and not private.hay_bloqueo(r.rival_id, v_yo)
            order by r.fecha_programada nulls last, r.id limit 40) r),
    'mios', (select coalesce(jsonb_agg(jsonb_build_object('reto_id', x.reto_id, 'a', x.goles_a, 'b', x.goles_b,
        'res_a', d.goles_a, 'res_b', d.goles_b, 'puntos', x.puntos, 'ascuas', x.ascuas, 'liquidado', x.liquidado,
        'nombre_a', private.nombre(r.retador_id), 'nombre_b', private.nombre(r.rival_id), 'estado', r.estado::text)
        order by coalesce(x.liquidado, x.actualizado) desc), '[]'::jsonb)
      from (select * from public.prode_pronosticos where usuario = v_yo order by coalesce(liquidado, actualizado) desc limit 20) x
      join public.retos_matchmaking r on r.id = x.reto_id
      left join public.resultados_duelo d on d.reto_id = x.reto_id and d.estado = 'CONFIRMADO'));
end $$;

-- Ranking de la semana (puntos, no ascuas): top 10.
create or replace function public.prode_ranking_semana() returns jsonb
language sql stable security definer set search_path = '' as $$
  select coalesce(jsonb_agg(jsonb_build_object('id', t.usuario, 'nombre', private.nombre(t.usuario), 'puntos', t.pts, 'exactos', t.exactos) order by t.pts desc, t.exactos desc, t.primero), '[]'::jsonb)
  from (select usuario, sum(puntos) pts, count(*) filter (where puntos = 10) exactos, min(liquidado) primero
        from public.prode_pronosticos where liquidado >= private.prode_semana() and puntos > 0 and private.uid_requerido() is not null
        group by usuario order by sum(puntos) desc, count(*) filter (where puntos = 10) desc, min(liquidado) limit 10) t
$$;

revoke all on function public.prode_pronosticar(integer, integer, integer), public.prode_tablero(), public.prode_ranking_semana() from public, anon;
grant execute on function public.prode_pronosticar(integer, integer, integer), public.prode_tablero(), public.prode_ranking_semana() to authenticated;

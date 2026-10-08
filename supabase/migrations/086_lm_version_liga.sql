-- 086 · Versión de liga + historial de cambios (para que Mercado/Phoenix Link apliquen solo lo nuevo).
-- Cada traspaso cerrado, EN LA MISMA TRANSACCIÓN: cambia el club, sube lm_config.version_liga y escribe lm_cambios_liga.
alter table public.lm_config add column if not exists version_liga bigint not null default 0;

create table if not exists public.lm_cambios_liga (
  liga text not null references public.lm_config(liga),
  version bigint not null,
  phoenix_id bigint not null,
  pes_id int,
  club_desde bigint, club_hacia bigint,                 -- ids de club en la web (null = agente libre)
  club_desde_pes int, club_hacia_pes int,               -- pes_team_id en ese momento (lo que usa el option file)
  tipo text not null,
  created_at timestamptz not null default now(),
  primary key (liga, version)
);
alter table public.lm_cambios_liga enable row level security;
drop policy if exists lmcl_cambios_lee on public.lm_cambios_liga;
create policy lmcl_cambios_lee on public.lm_cambios_liga for select using (true);

-- Lo que cada PC reporta haber aplicado.
create table if not exists public.lm_aplicados (
  id bigserial primary key,
  usuario uuid not null references auth.users(id) on delete cascade,
  origen text not null check (origen in ('manager', 'link')),
  dispositivo uuid,
  liga text not null,
  version bigint not null,
  huella_plantillas text check (huella_plantillas ~ '^[0-9a-f]{64}$'),
  huella_esperada text,                      -- solo si version = versión actual de la liga en ese momento
  coincide boolean,                          -- null = no comparable (versión vieja)
  created_at timestamptz not null default now()
);
create index if not exists lm_aplicados_usuario on public.lm_aplicados (usuario, created_at desc);
alter table public.lm_aplicados enable row level security;
drop policy if exists lmap_lee on public.lm_aplicados;
create policy lmap_lee on public.lm_aplicados for select to authenticated using (usuario = auth.uid() or private.es_moderador());

-- Traspaso: igual que 084 + versión e historial, todo dentro de la misma función (= misma transacción).
create or replace function private.lm_traspasar(p_jugador bigint, p_a bigint, p_monto bigint, p_tipo text, p_desde_esperado bigint default -1) returns void
language plpgsql security definer set search_path = public as $$
declare v_j lm_jugadores; v_cfg lm_config; v_n int; v_ver bigint;
begin
  select * into v_j from lm_jugadores where id = p_jugador for update;
  if v_j.id is null then raise exception 'JUGADOR_NO_EXISTE'; end if;
  if p_desde_esperado is distinct from -1 and v_j.club_id is distinct from p_desde_esperado then raise exception 'JUGADOR_NO_DISPONIBLE'; end if;
  if v_j.club_id is not distinct from p_a then raise exception 'YA_ES_TUYO'; end if;
  select * into v_cfg from lm_config where liga = v_j.liga;
  if p_a is not null then
    perform 1 from lm_clubes where id = p_a for update;
    select count(*) into v_n from lm_jugadores where club_id = p_a;
    if v_n >= v_cfg.max_plantilla then raise exception 'PLANTILLA_LLENA'; end if;
    update lm_clubes set presupuesto = presupuesto - p_monto where id = p_a;
  end if;
  if v_j.club_id is not null then update lm_clubes set presupuesto = presupuesto + p_monto where id = v_j.club_id; end if;
  update lm_jugadores set club_id = p_a where id = p_jugador;
  insert into lm_movimientos (liga, jugador_id, de_club, a_club, monto, tipo) values (v_j.liga, p_jugador, v_j.club_id, p_a, p_monto, p_tipo);
  update lm_ofertas set estado = 'vencida', resuelta_en = now() where jugador_id = p_jugador and estado = 'pendiente';
  -- versión de la liga (el UPDATE bloquea la fila: dos traspasos simultáneos obtienen versiones distintas y consecutivas)
  update lm_config set version_liga = version_liga + 1 where liga = v_j.liga returning version_liga into v_ver;
  insert into lm_cambios_liga (liga, version, phoenix_id, pes_id, club_desde, club_hacia, club_desde_pes, club_hacia_pes, tipo)
  values (v_j.liga, v_ver, p_jugador, v_j.pes_id, v_j.club_id, p_a,
          (select pes_team_id from lm_clubes where id = v_j.club_id), (select pes_team_id from lm_clubes where id = p_a), p_tipo);
exception when check_violation then raise exception 'PRESUPUESTO_INSUFICIENTE';
end $$;

-- Cambios posteriores a una versión (para la Edge Function, que los firma).
create or replace function public.lm_cambios_desde(p_liga text, p_desde bigint, p_limite int default 1000) returns jsonb
language sql stable security definer set search_path = public as $$
  select jsonb_build_object('liga', p_liga, 'desde', p_desde,
    'version_actual', (select version_liga from lm_config where liga = p_liga),
    'cambios', coalesce((select jsonb_agg(jsonb_build_object('version', version, 'phoenix_id', phoenix_id, 'pes_id', pes_id,
        'club_desde', club_desde, 'club_hacia', club_hacia, 'club_desde_pes', club_desde_pes, 'club_hacia_pes', club_hacia_pes, 'tipo', tipo, 'fecha', created_at) order by version)
      from (select * from lm_cambios_liga where liga = p_liga and version > p_desde order by version limit greatest(1, least(p_limite, 5000))) c), '[]'::jsonb));
$$;
grant execute on function public.lm_cambios_desde(text, bigint, int) to service_role, authenticated;

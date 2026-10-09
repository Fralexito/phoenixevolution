-- 094 · /mercado/v1/liga/cambios: campos OPCIONALES por cambio (monto, sueldo, clausula, fin_contrato, dorsal).
-- Solo añade columnas y claves. No cambia la firma, el formato ni ningún campo existente. Sin dato = null.
-- Partimos de lm_traspasar tal como está en la base (versión 087: clubes CPU sin presupuesto), no de la 086.
alter table public.lm_cambios_liga
  add column if not exists monto bigint check (monto >= 0),
  add column if not exists sueldo bigint check (sueldo >= 0),
  add column if not exists clausula bigint check (clausula >= 0),
  add column if not exists fin_contrato date,
  add column if not exists dorsal int check (dorsal between 1 and 99);

create or replace function private.lm_traspasar(p_jugador bigint, p_a bigint, p_monto bigint, p_tipo text, p_desde_esperado bigint default -1) returns void
language plpgsql security definer set search_path = public as $$
declare v_j lm_jugadores; v_cfg lm_config; v_n int; v_ver bigint; v_dest lm_clubes; v_orig lm_clubes;
begin
  select * into v_j from lm_jugadores where id = p_jugador for update;
  if v_j.id is null then raise exception 'JUGADOR_NO_EXISTE'; end if;
  if p_desde_esperado is distinct from -1 and v_j.club_id is distinct from p_desde_esperado then raise exception 'JUGADOR_NO_DISPONIBLE'; end if;
  if v_j.club_id is not distinct from p_a then raise exception 'YA_ES_TUYO'; end if;
  select * into v_cfg from lm_config where liga = v_j.liga;
  if p_a is not null then
    select * into v_dest from lm_clubes where id = p_a for update;
    select count(*) into v_n from lm_jugadores where club_id = p_a;
    if v_n >= v_cfg.max_plantilla then raise exception 'PLANTILLA_LLENA'; end if;
    if v_dest.dueno is not null then update lm_clubes set presupuesto = presupuesto - p_monto where id = p_a; end if;
  end if;
  if v_j.club_id is not null then
    select * into v_orig from lm_clubes where id = v_j.club_id;
    if v_orig.dueno is not null then update lm_clubes set presupuesto = presupuesto + p_monto where id = v_j.club_id; end if;
  end if;
  update lm_jugadores set club_id = p_a where id = p_jugador;
  insert into lm_movimientos (liga, jugador_id, de_club, a_club, monto, tipo) values (v_j.liga, p_jugador, v_j.club_id, p_a, p_monto, p_tipo);
  update lm_ofertas set estado = 'vencida', resuelta_en = now() where jugador_id = p_jugador and estado = 'pendiente';
  update lm_config set version_liga = version_liga + 1 where liga = v_j.liga returning version_liga into v_ver;
  -- monto: lo que paga el club que ficha (null si el jugador queda libre). dorsal: el que figura en la ficha del jugador.
  -- sueldo, clausula y fin_contrato: la web aún no guarda contratos; quedan en null hasta que haya dato.
  insert into lm_cambios_liga (liga, version, phoenix_id, pes_id, club_desde, club_hacia, club_desde_pes, club_hacia_pes, tipo, monto, dorsal)
  values (v_j.liga, v_ver, p_jugador, v_j.pes_id, v_j.club_id, p_a, v_orig.pes_team_id, v_dest.pes_team_id, p_tipo,
          case when p_a is null then null else p_monto end, v_j.dorsal);
exception when check_violation then raise exception 'PRESUPUESTO_INSUFICIENTE';
end $$;

create or replace function public.lm_cambios_desde(p_liga text, p_desde bigint, p_limite int default 1000) returns jsonb
language sql stable security definer set search_path = public as $$
  select jsonb_build_object('liga', p_liga, 'desde', p_desde,
    'version_actual', (select version_liga from lm_config where liga = p_liga),
    'cambios', coalesce((select jsonb_agg(jsonb_build_object('version', version, 'phoenix_id', phoenix_id, 'pes_id', pes_id,
        'club_desde', club_desde, 'club_hacia', club_hacia, 'club_desde_pes', club_desde_pes, 'club_hacia_pes', club_hacia_pes, 'tipo', tipo, 'fecha', created_at,
        'monto', monto, 'sueldo', sueldo, 'clausula', clausula, 'fin_contrato', to_char(fin_contrato, 'YYYY-MM-DD'), 'dorsal', dorsal) order by version)
      from (select * from lm_cambios_liga where liga = p_liga and version > p_desde order by version limit greatest(1, least(p_limite, 5000))) c), '[]'::jsonb));
$$;

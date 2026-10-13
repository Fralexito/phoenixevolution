-- 106 · Fichajes hechos EN EL JUEGO que llegan solos a la Liga Máster de la web (ronda 281).
-- Pedido de Fralex: «quiero que sea automático: cuando se hagan los fichajes desde el juego, desde el Sync».
-- Plan completo: docs/SYNC-AUTOMATICO.md
--
-- Cómo funciona:
--  · Phoenix Sync manda POST /mercado/v1/reportes con cambios { tipo:'jugador_equipo', jugador_id:<pes_id>, de:{equipo_id}, a:{equipo_id|null} }.
--  · Al guardarse el reporte, un disparador intenta aplicarlo SOLO si: la ventana está abierta y quien reporta es el DT de uno de los dos
--    clubes y el otro es de la CPU o agente libre (o quien reporta es staff). Lo que no cumple queda «pendiente» para el staff, como antes.
--  · Cuando el staff aprueba un reporte (mercado_revisar), se aplica lo que faltaba.
--  · El staff puede revertir un movimiento con lm_staff_revertir.
--  · Al importar el catálogo, un equipo con el mismo nombre que un club ya creado SIN pes_team_id completa ese club (no se duplica).

-- 1) Nuevos tipos y marcas en el diario de fichajes
alter table public.lm_movimientos drop constraint if exists lm_movimientos_tipo_check;
alter table public.lm_movimientos add constraint lm_movimientos_tipo_check check (tipo = any (array['compra', 'libre', 'liberado', 'staff', 'juego']));
alter table public.lm_movimientos add column if not exists origen_reporte bigint references public.mercado_reportes(id) on delete set null;
alter table public.lm_movimientos add column if not exists revertido_en timestamptz;
create index if not exists lm_movimientos_origen_reporte_idx on public.lm_movimientos (origen_reporte);

-- 2) Nombre normalizado de un club (minúsculas, sin tildes ni signos) para casar el catálogo con clubes ya creados
create or replace function private.lm_nombre_norm(p text) returns text language sql immutable set search_path = '' as $$
  select regexp_replace(translate(lower(coalesce(p, '')), 'áàäâéèëêíìïîóòöôúùüûñç', 'aaaaeeeeiiiioooouuuunc'), '[^a-z0-9]', '', 'g')
$$;

-- 3) Aplica los cambios «jugador_equipo» de un reporte. p_forzar = true cuando lo aprueba el staff (sin reglas de ventana ni de dueño).
create or replace function private.lm_aplicar_reporte(p_reporte bigint, p_forzar boolean default false)
returns jsonb language plpgsql security definer set search_path = 'public' as $$
declare
  v_rep mercado_reportes; c jsonb; v_j lm_jugadores; v_dest lm_clubes; v_orig lm_clubes; v_cfg lm_config;
  v_staff boolean; v_a_pes int; v_ok int := 0; v_ya int := 0; v_total int := 0; v_saltos jsonb := '[]'::jsonb; v_mov bigint;
begin
  select * into v_rep from mercado_reportes where id = p_reporte;
  if v_rep.id is null then return jsonb_build_object('error', 'REPORTE_NO_EXISTE'); end if;
  select * into v_cfg from lm_config where liga = 'galaxy';
  v_staff := coalesce(private.es_staff_id(v_rep.usuario), false);
  for c in select * from jsonb_array_elements(v_rep.cambios) loop
    continue when c->>'tipo' is distinct from 'jugador_equipo';
    v_total := v_total + 1;
    select * into v_j from lm_jugadores where liga = 'galaxy' and pes_id = nullif(c->>'jugador_id', '')::int;
    if v_j.id is null then v_saltos := v_saltos || jsonb_build_object('pes_id', c->>'jugador_id', 'motivo', 'JUGADOR_DESCONOCIDO'); continue; end if;
    v_a_pes := nullif(c->'a'->>'equipo_id', '')::int;
    v_dest := null;
    if v_a_pes is not null then
      select * into v_dest from lm_clubes where liga = 'galaxy' and pes_team_id = v_a_pes limit 1;
      if v_dest.id is null then v_saltos := v_saltos || jsonb_build_object('pes_id', v_j.pes_id, 'motivo', 'CLUB_DESCONOCIDO'); continue; end if;
    end if;
    if v_j.club_id is not distinct from v_dest.id then v_ya := v_ya + 1; continue; end if;   -- ya estaba así (p. ej. reporte repetido)
    select * into v_orig from lm_clubes where id = v_j.club_id;
    if not p_forzar then
      if not coalesce(v_cfg.ventana_abierta, false) then v_saltos := v_saltos || jsonb_build_object('pes_id', v_j.pes_id, 'motivo', 'VENTANA_CERRADA'); continue; end if;
      if not v_staff and not (
           (v_orig.dueno = v_rep.usuario and (v_dest.id is null or v_dest.dueno is null))
        or (v_dest.dueno = v_rep.usuario and (v_orig.id is null or v_orig.dueno is null))) then
        v_saltos := v_saltos || jsonb_build_object('pes_id', v_j.pes_id, 'motivo', 'NECESITA_STAFF'); continue;
      end if;
    end if;
    begin
      perform set_config('lm.motivo', 'traspaso', true); perform set_config('lm.ref', 'reporte:' || p_reporte, true);
      perform private.lm_traspasar(v_j.id, v_dest.id, greatest(coalesce(nullif(c->>'monto', '')::bigint, 0), 0), 'juego', v_j.club_id);
      select max(id) into v_mov from lm_movimientos where jugador_id = v_j.id;
      update lm_movimientos set origen_reporte = p_reporte where id = v_mov;
      v_ok := v_ok + 1;
    exception when others then
      v_saltos := v_saltos || jsonb_build_object('pes_id', v_j.pes_id, 'motivo', left(sqlerrm, 60));
    end;
  end loop;
  return jsonb_build_object('total', v_total, 'aplicados', v_ok, 'ya_estaban', v_ya, 'saltados', v_saltos);
end $$;
revoke all on function private.lm_aplicar_reporte(bigint, boolean) from public, anon, authenticated;

-- 4) Disparador: al llegar un reporte, intenta aplicarlo solo. Nunca impide que el reporte se guarde.
create or replace function private.lm_reporte_auto() returns trigger language plpgsql security definer set search_path = 'public' as $$
declare r jsonb; v_pend int;
begin
  begin
    r := private.lm_aplicar_reporte(new.id, false);
    if coalesce((r->>'total')::int, 0) = 0 then return null; end if;            -- no trae fichajes: el staff lo revisa como siempre
    v_pend := jsonb_array_length(r->'saltados');
    if v_pend = 0 then
      update mercado_reportes set estado = 'aprobado', revisado_en = now(),
             motivo = format('Aplicado automáticamente: %s fichaje(s) desde el juego.', (r->>'aplicados')::int + (r->>'ya_estaban')::int)
       where id = new.id and estado = 'pendiente';
    elsif (r->>'aplicados')::int > 0 then
      update mercado_reportes set motivo = left(format('Aplicados %s de %s automáticamente; el resto espera al staff: %s', r->>'aplicados', r->>'total', r->'saltados'), 500)
       where id = new.id;
    end if;
  exception when others then
    raise warning '[lm_reporte_auto] reporte %: %', new.id, sqlerrm;
  end;
  return null;
end $$;
drop trigger if exists lm_reporte_auto on public.mercado_reportes;
create trigger lm_reporte_auto after insert on public.mercado_reportes for each row execute function private.lm_reporte_auto();

-- 5) El staff aprueba un reporte → se aplica lo que faltaba
create or replace function public.mercado_revisar(p_id bigint, p_aprobar boolean, p_motivo text default null)
returns void language plpgsql security definer set search_path = 'public' as $$
declare v_usuario uuid;
begin
  if not private.es_moderador() then raise exception 'NO_AUTORIZADO'; end if;
  update mercado_reportes set estado = case when p_aprobar then 'aprobado' else 'rechazado' end,
         motivo = nullif(left(coalesce(p_motivo, ''), 500), ''), revisado_por = auth.uid(), revisado_en = now()
   where id = p_id and estado = 'pendiente' returning usuario into v_usuario;
  if v_usuario is null then raise exception 'NO_PENDIENTE'; end if;
  if p_aprobar then perform private.lm_aplicar_reporte(p_id, true); end if;
end $$;

-- 6) Revertir un movimiento (staff): el jugador vuelve a su club anterior y el dinero se devuelve
create or replace function public.lm_staff_revertir(p_mov bigint) returns jsonb language plpgsql security definer set search_path = 'public' as $$
declare m lm_movimientos; v_j lm_jugadores;
begin
  if not private.es_moderador() then raise exception 'NO_AUTORIZADO'; end if;
  select * into m from lm_movimientos where id = p_mov for update;
  if m.id is null then raise exception 'MOVIMIENTO_NO_EXISTE'; end if;
  if m.revertido_en is not null then raise exception 'YA_REVERTIDO'; end if;
  select * into v_j from lm_jugadores where id = m.jugador_id;
  if v_j.club_id is distinct from m.a_club then raise exception 'JUGADOR_YA_CAMBIO'; end if;
  perform set_config('lm.motivo', 'reversion_staff', true); perform set_config('lm.ref', 'mov:' || p_mov, true);
  perform private.lm_traspasar(m.jugador_id, m.de_club, m.monto, 'staff', m.a_club);
  update lm_movimientos set revertido_en = now() where id = p_mov;
  return jsonb_build_object('ok', true);
end $$;
revoke all on function public.lm_staff_revertir(bigint) from public, anon;
grant execute on function public.lm_staff_revertir(bigint) to authenticated;

-- 7) Importar catálogo: casar equipos con clubes ya creados por nombre (si ese club aún no tiene pes_team_id)
create or replace function public.sistema_lm_importar(p_liga text, p_datos jsonb)
returns jsonb language plpgsql security definer set search_path = 'public' as $$
declare e jsonb; j jsonb; v_n_eq int := 0; v_n_j int := 0; v_peso int; v_fuente text; v_hab jsonb; v_otros jsonb; v_pes int; v_club bigint;
begin
  for e in select * from jsonb_array_elements(coalesce(p_datos->'equipos', '[]')) loop
    v_pes := nullif(e->>'pes_team_id', '')::int; v_club := null;
    if v_pes is not null then select id into v_club from lm_clubes where liga = p_liga and pes_team_id = v_pes limit 1; end if;
    if v_club is null then
      select id into v_club from lm_clubes where liga = p_liga and pes_team_id is null and private.lm_nombre_norm(nombre) = private.lm_nombre_norm(e->>'nombre') limit 1;
      if v_club is not null then update lm_clubes set pes_team_id = v_pes where id = v_club; end if;
    end if;
    if v_club is null then
      insert into lm_clubes (liga, nombre, pes_team_id, aprobado) values (p_liga, left(e->>'nombre', 60), v_pes, false)
      on conflict (liga, nombre) do update set pes_team_id = excluded.pes_team_id;
    end if;
    v_n_eq := v_n_eq + 1;
  end loop;
  for j in select * from jsonb_array_elements(coalesce(p_datos->'jugadores', '[]')) loop
    v_peso := case when jsonb_typeof(j->'peso') = 'number' and (j->>'peso')::numeric between 30 and 150 then (j->>'peso')::numeric::int end;
    v_fuente := case when j->>'fuente' in ('option', 'parche') then j->>'fuente' end;
    v_hab := case when jsonb_typeof(j->'habilidades') in ('object', 'array') and pg_column_size(j->'habilidades') <= 4000 then j->'habilidades' end;
    v_otros := case when jsonb_typeof(j->'otros_equipos') in ('object', 'array') and pg_column_size(j->'otros_equipos') <= 2000 then j->'otros_equipos' end;
    insert into lm_jugadores (liga, pes_id, nombre, posicion, media, edad, nacionalidad, fecha_nac, altura, dorsal, valor, club_id, peso, fuente, habilidades, otros_equipos)
    values (p_liga, (j->>'pes_id')::int, left(j->>'nombre', 80), left(j->>'posicion', 10), nullif(j->>'media', '')::int, nullif(j->>'edad', '')::int,
            left(j->>'nacionalidad', 60), nullif(j->>'fecha_nac', '')::date, nullif(j->>'altura', '')::int, nullif(j->>'dorsal', '')::int,
            coalesce(nullif(j->>'valor', '')::bigint, 0),
            (select id from lm_clubes where liga = p_liga and pes_team_id = (j->>'pes_team_id')::int limit 1),
            v_peso, v_fuente, v_hab, v_otros)
    on conflict (liga, pes_id) do update set
      nombre = excluded.nombre,
      posicion = coalesce(excluded.posicion, lm_jugadores.posicion),
      media = coalesce(excluded.media, lm_jugadores.media),
      edad = coalesce(excluded.edad, lm_jugadores.edad),
      nacionalidad = coalesce(excluded.nacionalidad, lm_jugadores.nacionalidad),
      fecha_nac = coalesce(excluded.fecha_nac, lm_jugadores.fecha_nac),
      altura = coalesce(excluded.altura, lm_jugadores.altura),
      dorsal = coalesce(excluded.dorsal, lm_jugadores.dorsal),
      peso = coalesce(excluded.peso, lm_jugadores.peso),
      fuente = coalesce(excluded.fuente, lm_jugadores.fuente),
      habilidades = coalesce(excluded.habilidades, lm_jugadores.habilidades),
      otros_equipos = coalesce(excluded.otros_equipos, lm_jugadores.otros_equipos),
      valor = case when nullif(j->>'valor', '') is null then lm_jugadores.valor else excluded.valor end;
    v_n_j := v_n_j + 1;
  end loop;
  return jsonb_build_object('equipos', v_n_eq, 'jugadores', v_n_j);
end $$;
revoke all on function public.sistema_lm_importar(text, jsonb) from public, anon, authenticated;

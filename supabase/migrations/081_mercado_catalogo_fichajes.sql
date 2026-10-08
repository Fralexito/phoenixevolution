-- 081 · Rutas del programa para el Modo Mánager: subir catálogo (staff) y bajar/marcar fichajes.
-- sistema_* = solo service_role (Edge Function «mercado»), que ya verificó quién llama.
create or replace function public.sistema_lm_importar(p_liga text, p_datos jsonb) returns jsonb
language plpgsql security definer set search_path = public as $$
declare e jsonb; j jsonb; v_n_eq int := 0; v_n_j int := 0;
begin
  for e in select * from jsonb_array_elements(coalesce(p_datos->'equipos', '[]')) loop
    insert into lm_clubes (liga, nombre, pes_team_id, aprobado) values (p_liga, left(e->>'nombre', 60), (e->>'pes_team_id')::int, false)
    on conflict (liga, nombre) do update set pes_team_id = excluded.pes_team_id;
    v_n_eq := v_n_eq + 1;
  end loop;
  for j in select * from jsonb_array_elements(coalesce(p_datos->'jugadores', '[]')) loop
    insert into lm_jugadores (liga, pes_id, nombre, posicion, media, edad, nacionalidad, fecha_nac, altura, dorsal, valor, club_id)
    values (p_liga, (j->>'pes_id')::int, left(j->>'nombre', 80), left(j->>'posicion', 10), (j->>'media')::int, (j->>'edad')::int,
            left(j->>'nacionalidad', 60), (j->>'fecha_nac')::date, (j->>'altura')::int, (j->>'dorsal')::int, coalesce((j->>'valor')::bigint, 0),
            (select id from lm_clubes where liga = p_liga and pes_team_id = (j->>'pes_team_id')::int limit 1))
    on conflict (liga, pes_id) do update set nombre = excluded.nombre, posicion = excluded.posicion, media = excluded.media, edad = excluded.edad,
            nacionalidad = excluded.nacionalidad, fecha_nac = excluded.fecha_nac, altura = excluded.altura, dorsal = excluded.dorsal, valor = excluded.valor;
    v_n_j := v_n_j + 1;
  end loop;
  return jsonb_build_object('equipos', v_n_eq, 'jugadores', v_n_j);
end $$;
revoke all on function public.sistema_lm_importar(text, jsonb) from public, anon, authenticated;
grant execute on function public.sistema_lm_importar(text, jsonb) to service_role;

-- La versión de la web (staff con sesión) reutiliza la misma lógica.
create or replace function public.lm_importar(p_liga text, p_datos jsonb) returns jsonb
language plpgsql security definer set search_path = public as $$
begin
  if not private.es_moderador() then raise exception 'NO_AUTORIZADO'; end if;
  return public.sistema_lm_importar(p_liga, p_datos);
end $$;

-- Fichajes para el programa: jugador (pes_id) y club destino (pes_team_id; null = agente libre).
create or replace function public.sistema_lm_fichajes(p_liga text, p_pendientes boolean) returns jsonb
language sql stable security definer set search_path = public as $$
  select coalesce(jsonb_agg(jsonb_build_object('id', m.id, 'tipo', m.tipo, 'phoenix_id', j.id, 'pes_id', j.pes_id, 'jugador', j.nombre,
           'de_pes_team_id', cd.pes_team_id, 'a_pes_team_id', ca.pes_team_id, 'a_club', ca.nombre, 'monto', m.monto,
           'aplicado_en', m.aplicado_en, 'fecha', m.created_at) order by m.created_at), '[]'::jsonb)
  from lm_movimientos m join lm_jugadores j on j.id = m.jugador_id
  left join lm_clubes cd on cd.id = m.de_club left join lm_clubes ca on ca.id = m.a_club
  where m.liga = p_liga and (not p_pendientes or m.aplicado_en is null);
$$;
revoke all on function public.sistema_lm_fichajes(text, boolean) from public, anon, authenticated;
grant execute on function public.sistema_lm_fichajes(text, boolean) to service_role;

create or replace function public.sistema_lm_marcar_aplicados(p_liga text, p_ids bigint[]) returns int
language sql security definer set search_path = public as $$
  with u as (update lm_movimientos set aplicado_en = now() where liga = p_liga and id = any(p_ids) and aplicado_en is null returning 1)
  select count(*)::int from u;
$$;
revoke all on function public.sistema_lm_marcar_aplicados(text, bigint[]) from public, anon, authenticated;
grant execute on function public.sistema_lm_marcar_aplicados(text, bigint[]) to service_role;

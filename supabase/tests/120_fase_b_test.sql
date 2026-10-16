-- Pruebas de la migración 120 (racha diaria, primer partido del día, misiones semanales, premios de logros). Se deshacen solas: debe terminar con «TODO_OK_REVERTIDO».
-- Los usuarios de prueba se crean dentro de la misma transacción (también se deshacen).
do $$
declare u1 uuid := gen_random_uuid(); u2 uuid := gen_random_uuid(); u3 uuid := gen_random_uuid(); u4 uuid := gen_random_uuid();
        hoy date := (now() at time zone 'America/Lima')::date; r jsonb; s0 int; s1 int; n int; m record; rid int; ra uuid; rb uuid; t text;
begin
  insert into auth.users (id, email, aud, role) select x, x::text || '@prueba.local', 'authenticated', 'authenticated' from unnest(array[u1, u2, u3, u4]) x;

  -- T1 · primera reclamación: +5, racha 1; reclamar otra vez el mismo día falla
  perform set_config('request.jwt.claims', json_build_object('sub', u1, 'role', 'authenticated')::text, true); perform set_config('request.jwt.claim.sub', u1::text, true);
  r := public.reclamar_racha_diaria();
  if (r->>'racha')::int <> 1 or (r->>'ascuas')::int <> 5 then raise exception 'T1 racha inicial: %', r; end if;
  select saldo into s1 from billeteras where usuario_id = u1; if s1 <> 5 then raise exception 'T1 saldo %', s1; end if;
  begin perform public.reclamar_racha_diaria(); raise exception 'T2 debía fallar'; exception when others then if sqlerrm not like 'Ya reclamaste tu racha%' then raise; end if; end;
  select saldo into s1 from billeteras where usuario_id = u1; if s1 <> 5 then raise exception 'T2 doble cobro: %', s1; end if;

  -- T3 · racha de ayer 2 => hoy 3: +5 +10 extra
  insert into racha_diaria (usuario_id, racha, mejor, ultimo_dia) values (u2, 2, 2, hoy - 1);
  perform set_config('request.jwt.claims', json_build_object('sub', u2, 'role', 'authenticated')::text, true); perform set_config('request.jwt.claim.sub', u2::text, true);
  r := public.reclamar_racha_diaria();
  if (r->>'racha')::int <> 3 or (r->>'ascuas')::int <> 15 or (r->>'bono')::int <> 10 then raise exception 'T3 día 3: %', r; end if;

  -- T4 · racha de ayer 6 => hoy 7: +5 +40 extra
  insert into racha_diaria (usuario_id, racha, mejor, ultimo_dia) values (u3, 6, 6, hoy - 1);
  perform set_config('request.jwt.claims', json_build_object('sub', u3, 'role', 'authenticated')::text, true); perform set_config('request.jwt.claim.sub', u3::text, true);
  r := public.reclamar_racha_diaria();
  if (r->>'racha')::int <> 7 or (r->>'ascuas')::int <> 45 then raise exception 'T4 día 7: %', r; end if;
  select saldo into s1 from billeteras where usuario_id = u3; if s1 <> 45 then raise exception 'T4 saldo %', s1; end if;

  -- T5 · si falta un día la racha vuelve a 1 (último día = hace 3 días, racha 5); la lectura ya la muestra en 0
  insert into racha_diaria (usuario_id, racha, mejor, ultimo_dia) values (u4, 5, 5, hoy - 3);
  perform set_config('request.jwt.claims', json_build_object('sub', u4, 'role', 'authenticated')::text, true); perform set_config('request.jwt.claim.sub', u4::text, true);
  r := public.mis_ascuas_extra();
  if (r->'racha'->>'actual')::int <> 0 or (r->'racha'->>'mejor')::int <> 5 then raise exception 'T5 lectura: %', r->'racha'; end if;
  r := public.reclamar_racha_diaria();
  if (r->>'racha')::int <> 1 or (r->>'ascuas')::int <> 5 then raise exception 'T5 reinicio: %', r; end if;
  select mejor into n from racha_diaria where usuario_id = u4; if n <> 5 then raise exception 'T5 la mejor racha no se pierde: %', n; end if;

  -- T6 · misiones: 3 por semana, 60–100 ascuas; sin progreso no se puede reclamar; con progreso se cobra una sola vez
  select count(*) into n from private.catalogo_misiones(private.lunes_lima(now())); if n <> 3 then raise exception 'T6 misiones: %', n; end if;
  select count(*) into n from private.catalogo_misiones(private.lunes_lima(now())) where ascuas not between 60 and 100; if n <> 0 then raise exception 'T6 ascuas fuera de 60–100'; end if;
  select * into m from private.catalogo_misiones(private.lunes_lima(now())) order by orden limit 1;
  begin perform public.reclamar_mision(m.clave); raise exception 'T6 debía fallar sin progreso'; exception when others then if sqlerrm not like 'Aún no cumples%' then raise; end if; end;
  begin perform public.reclamar_mision('no_existe'); raise exception 'T6b debía fallar'; exception when others then if sqlerrm not like 'Esa misión no%' then raise; end if; end;
  execute 'create or replace function private.progreso_mision(p_usuario uuid, p_metrica text, p_desde timestamptz) returns integer language sql as $f$ select 999 $f$';   -- se deshace con la transacción
  select saldo into s0 from billeteras where usuario_id = u4;
  n := public.reclamar_mision(m.clave); if n <> m.ascuas then raise exception 'T7 misión: % <> %', n, m.ascuas; end if;
  select saldo into s1 from billeteras where usuario_id = u4; if s1 <> s0 + m.ascuas then raise exception 'T7 saldo %', s1; end if;
  begin perform public.reclamar_mision(m.clave); raise exception 'T7b debía fallar'; exception when others then if sqlerrm not like 'Ya reclamaste esta misión%' then raise; end if; end;
  r := public.mis_ascuas_extra();
  if jsonb_array_length(r->'misiones'->'items') <> 3 or (r->'misiones'->'items'->0->>'cobrado')::boolean is not true then raise exception 'T7c lectura misiones: %', r->'misiones'; end if;

  -- T8 · logros: solo si la medalla ya se obtuvo; tope de 200 ascuas al día
  perform set_config('request.jwt.claims', json_build_object('sub', u2, 'role', 'authenticated')::text, true); perform set_config('request.jwt.claim.sub', u2::text, true);
  begin perform public.reclamar_logro('fundador'); raise exception 'T8 debía fallar sin medalla'; exception when others then if sqlerrm not like 'Aún no consigues%' then raise; end if; end;
  insert into logros_usuario (usuario_id, logro_id) values (u2, 'fundador'), (u2, 'primer_duelo');
  select saldo into s0 from billeteras where usuario_id = u2;
  n := public.reclamar_logro('fundador'); if n <> 200 then raise exception 'T8 fundador %', n; end if;
  begin perform public.reclamar_logro('fundador'); raise exception 'T8b debía fallar'; exception when others then if sqlerrm not like 'Ya reclamaste este logro%' then raise; end if; end;
  begin perform public.reclamar_logro('primer_duelo'); raise exception 'T8c debía fallar por tope'; exception when others then if sqlerrm not like 'Hoy ya reclamaste%' then raise; end if; end;
  select saldo into s1 from billeteras where usuario_id = u2; if s1 <> s0 + 200 then raise exception 'T8 saldo %', s1; end if;
  r := public.mis_ascuas_extra();
  if (r->'logros'->>'usado_hoy')::int <> 200 or not exists (select 1 from jsonb_array_elements(r->'logros'->'items') e where e->>'clave' = 'primer_duelo' and (e->>'cobrable')::boolean) then raise exception 'T8d lectura logros: %', r->'logros'->>'usado_hoy'; end if;

  -- T9 · primer partido del día: lo recibe cada jugador una sola vez al día (reto real; se deshace)
  select retador_id, rival_id, id into ra, rb, rid from retos_matchmaking where rival_id is not null and retador_id is not null and not exists (select 1 from resultados_duelo x where x.reto_id = retos_matchmaking.id) limit 1;
  if rid is not null then
    insert into resultados_duelo (reto_id, goles_a, goles_b, estado, propuesto_por) values (rid, 2, 1, 'CONFIRMADO', ra);
    select count(*) into n from movimientos_tokens where usuario_id in (ra, rb) and fuente = 'primer_partido_dia' and created_at > now() - interval '1 minute'; if n <> 2 then raise exception 'T9 primer partido: % movimientos (esperado 2)', n; end if;
    if private.otorgar(ra, 'primer_partido_dia', hoy::text) then raise exception 'T9b el segundo otorgamiento del día debía rechazarse'; end if;
    select count(*) into n from movimientos_tokens where usuario_id in (ra, rb) and fuente = 'primer_partido_dia' and created_at > now() - interval '1 minute'; if n <> 2 then raise exception 'T9b se duplicó: %', n; end if;
  end if;

  -- T10 · el libro cuadra, la alerta cubre el máximo teórico y nada queda abierto a anon
  select count(*) into n from private.economia_diferencias(); if n <> 0 then raise exception 'T10 libro descuadrado: %', n; end if;
  if coalesce(private.config('alerta_ascuas_dia'), '0')::int < 725 then raise exception 'T10 alerta_ascuas_dia debe cubrir 725: %', private.config('alerta_ascuas_dia'); end if;
  foreach t in array array['public.reclamar_racha_diaria()', 'public.reclamar_mision(text)', 'public.reclamar_logro(text)', 'public.mis_ascuas_extra()'] loop
    if has_function_privilege('anon', t, 'execute') then raise exception 'T10 anon puede ejecutar %', t; end if;
    if not has_function_privilege('authenticated', t, 'execute') then raise exception 'T10 authenticated no puede ejecutar %', t; end if;
  end loop;
  if has_table_privilege('authenticated', 'public.racha_diaria', 'select') or has_table_privilege('authenticated', 'public.misiones_cobros', 'select') or has_table_privilege('authenticated', 'public.logros_cobros', 'select') then raise exception 'T10 tablas abiertas'; end if;
  raise exception 'TODO_OK_REVERTIDO';
end $$;

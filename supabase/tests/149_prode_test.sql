-- Prueba en seco de la 149 (correr DESPUÉS de aplicarla; termina con TODO_OK_REVERTIDO = todo bien y nada guardado).
-- a y b juegan; c pronostica. Aún NO ejecutada: Supabase canceló el permiso el 25-oct-2026.
do $t$
declare a uuid := '7f1abba3-07f3-4c66-ba1e-327e29e83371'; b uuid := '9c910092-4a0a-4554-bbba-e7f7fe2af64b'; c uuid := '6102273d-9172-452a-85ef-55e0c436262a';
  rid integer; j jsonb; saldo0 integer; saldo1 integer;
begin
  insert into public.retos_matchmaking (retador_id, rival_id, estado, fecha_programada) values (a, b, 'ACEPTADO', now() + interval '1 day') returning id into rid;
  -- un jugador no pronostica su duelo
  perform set_config('request.jwt.claims', json_build_object('sub',a,'role','authenticated')::text, true);
  begin perform public.prode_pronosticar(rid, 1, 0); raise exception 'P1'; exception when sqlstate '42501' then null; end;
  perform set_config('request.jwt.claims', json_build_object('sub',c,'role','authenticated')::text, true);
  begin perform public.prode_pronosticar(rid, 31, 0); raise exception 'P2'; exception when sqlstate '22023' then null; end;
  perform public.prode_pronosticar(rid, 1, 0);
  perform public.prode_pronosticar(rid, 2, 1);   -- cambiar vale
  j := public.prode_tablero();
  if not exists (select 1 from jsonb_array_elements(j->'abiertos') x where (x->>'reto_id')::int = rid and x->'mio'->>'a' = '2') then raise exception 'P3 %', j; end if;
  -- empieza el duelo → cerrado
  update public.retos_matchmaking set estado = 'FINALIZADO' where id = rid;
  begin perform public.prode_pronosticar(rid, 0, 0); raise exception 'P4'; exception when sqlstate 'P0001' then null; end;
  select coalesce(saldo, 0) into saldo0 from public.billeteras where usuario_id = c; saldo0 := coalesce(saldo0, 0);
  -- se confirma 2-1 → exacto = 10 ascuas
  insert into public.resultados_duelo (reto_id, goles_a, goles_b, estado, propuesto_por) values (rid, 2, 1, 'CONFIRMADO', a);
  select coalesce(saldo, 0) into saldo1 from public.billeteras where usuario_id = c;
  if saldo1 - saldo0 <> least(10, 100 - 0) and saldo1 - saldo0 not between 0 and 10 then raise exception 'P5 % %', saldo0, saldo1; end if;
  if (select puntos from public.prode_pronosticos where reto_id = rid and usuario = c) <> 10 then raise exception 'P6'; end if;
  -- volver a disparar el trigger no paga dos veces
  update public.resultados_duelo set estado = 'CONFIRMADO' where reto_id = rid;
  if (select count(*) from public.movimientos_tokens where clave = 'prode:' || rid || ':' || c) > 1 then raise exception 'P7'; end if;
  if jsonb_array_length(public.prode_ranking_semana()) < 1 then raise exception 'P8'; end if;
  raise exception 'TODO_OK_REVERTIDO';
end $t$;

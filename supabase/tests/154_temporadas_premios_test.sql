-- Prueba en seco de la 154 (TODO_OK_REVERTIDO = todo bien, nada guardado). Ejecutada el 25-oct-2026 en la base real: OK.
-- Crea un 4.º usuario temporal, 6 duelos en septiembre 2026 (todos contra todos), y comprueba: mes en curso no se cierra · cierre
-- con premios · el campeón cobra 300 ascuas una sola vez · el 4.º queda 4.º · cerrar dos veces = YA_CERRADA · historial con 4 · aviso.
do $t$
declare u uuid[] := array['7f1abba3-07f3-4c66-ba1e-327e29e83371','9c910092-4a0a-4554-bbba-e7f7fe2af64b','6102273d-9172-452a-85ef-55e0c436262a', gen_random_uuid()]::uuid[];
  i int; k int; rid integer; r text; s0 int; s1 int; n int;
begin
  insert into auth.users (id, aud, role, email, created_at, updated_at) values (u[4], 'authenticated', 'authenticated', 'zz-prueba-' || u[4] || '@x.y', now(), now());
  if not exists (select 1 from public.perfiles where id = u[4]) then insert into public.perfiles (id, username) values (u[4], 'zzprueba' || substr(u[4]::text, 1, 6)); end if;
  for i in 1..4 loop for k in i+1..4 loop
    insert into public.retos_matchmaking (retador_id, rival_id, estado) values (u[i], u[k], 'FINALIZADO') returning id into rid;
    insert into public.resultados_duelo (reto_id, goles_a, goles_b, estado, propuesto_por) values (rid, 2, 0, 'CONFIRMADO', u[i]);
    update public.resultados_duelo set updated_at = timestamptz '2026-09-15 12:00:00-05' where reto_id = rid;
  end loop; end loop;
  select coalesce(saldo, 0) into s0 from public.billeteras where usuario_id = u[1]; s0 := coalesce(s0, 0);
  if private.cerrar_temporada(date '2026-10-01') <> 'MES_EN_CURSO' then raise exception 'T1'; end if;
  r := private.cerrar_temporada(date '2026-09-10'); if r <> 'CERRADA' then raise exception 'T2 %', r; end if;
  select saldo into s1 from public.billeteras where usuario_id = u[1]; if s1 - s0 <> 300 then raise exception 'T3 saldo % -> %', s0, s1; end if;
  if (select puesto from public.temporada_premios where mes = '2026-09-01' and usuario = u[4]) <> 4 then raise exception 'T4'; end if;
  if private.cerrar_temporada(date '2026-09-30') <> 'YA_CERRADA' then raise exception 'T5'; end if;
  select count(*) into n from public.movimientos_tokens where clave = 'temporada:2026-09:' || u[1]; if n <> 1 then raise exception 'T6'; end if;
  if jsonb_array_length((public.temporadas_historial(5)) -> 0 -> 'podio') <> 4 then raise exception 'T7'; end if;
  if (select count(*) from public.notificaciones where tipo = 'LOGRO' and usuario_id = u[1] and titulo like '%Campeón%') <> 1 then raise exception 'T8'; end if;
  raise exception 'TODO_OK_REVERTIDO';
end $t$;

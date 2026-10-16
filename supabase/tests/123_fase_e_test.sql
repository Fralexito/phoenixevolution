-- Pruebas de la migración 123 (Phoenix Pass y torneo premium). SE DESHACEN SOLAS: el bloque termina con un error a propósito; debe acabar con «TODO_OK_REVERTIDO».
-- Cubre: temporada aún cerrada, estado público, nivel por XP de la temporada, reclamo único (gratis y premium), compra única del pase con gemas e idempotencia del libro,
-- objeto exclusivo (no se vende, sí llega al inventario), compensación si ya lo tenía, límites del administrador (gemas de regreso < precio, sin temporadas cruzadas),
-- torneo premium (solo el creador, una vez, con gemas) y que el libro siga cuadrando (0 diferencias).
do $t$
declare us uuid := gen_random_uuid(); otro uuid := gen_random_uuid(); adm uuid; tp uuid; j jsonb; n integer; g0 integer; a0 integer; tid bigint; it bigint;
begin
  insert into auth.users (id, email) values (us, 'prueba-pase@example.invalid'), (otro, 'prueba-pase2@example.invalid');
  perform set_config('request.jwt.claim.sub', us::text, true);
  perform set_config('request.jwt.claims', json_build_object('sub', us, 'role', 'authenticated')::text, true);
  select id into tp from public.pase_temporadas where clave = 'despegue';
  if tp is null then raise exception 'T0 falta la temporada «despegue»'; end if;

  -- T1: antes del inicio no hay temporada abierta (si ya empezó en la vida real, se mueve el inicio dentro de esta transacción)
  update public.pase_temporadas set inicia = now() + interval '2 days', termina = now() + interval '62 days' where id = tp;
  j := public.pase_estado();
  if j -> 'temporada' <> 'null'::jsonb or j -> 'proxima' is null or j -> 'proxima' = 'null'::jsonb then raise exception 'T1 temporada cerrada: %', j; end if;
  begin perform public.pase_comprar(); raise exception 'T1b dejó comprar sin temporada'; exception when others then if sqlerrm like 'T1b%' then raise; end if; end;

  -- T2: abierta, estado público (sin sesión no hay parte personal) y con 60 premios (30 niveles × 2 pistas)
  update public.pase_temporadas set inicia = now() - interval '1 day', termina = now() + interval '59 days' where id = tp;
  perform set_config('request.jwt.claim.sub', '', true); perform set_config('request.jwt.claims', '', true);
  j := public.pase_estado();
  if jsonb_array_length(j -> 'recompensas') <> 60 or j -> 'yo' <> 'null'::jsonb then raise exception 'T2 estado público: %', left(j::text, 200); end if;
  perform set_config('request.jwt.claim.sub', us::text, true);
  perform set_config('request.jwt.claims', json_build_object('sub', us, 'role', 'authenticated')::text, true);

  -- T3: el nivel sale de la XP DENTRO de la temporada (la XP vieja no cuenta)
  insert into public.xp_movimientos (usuario_id, puntos, fuente, clave, created_at) values (us, 900, 'partido_jugado', 't123-vieja', now() - interval '5 days');
  insert into public.xp_movimientos (usuario_id, puntos, fuente, clave) values (us, 250, 'partido_jugado', 't123-a');
  j := public.pase_estado();
  if (j #>> '{yo,nivel}')::int <> 2 or (j #>> '{yo,xp}')::int <> 250 or (j #>> '{yo,xp_en_nivel}')::int <> 50 then raise exception 'T3 nivel por XP: %', j -> 'yo'; end if;

  -- T4: reclamar la pista gratis una sola vez; el nivel 3 aún no
  select coalesce(saldo, 0) into a0 from public.billeteras where usuario_id = us; a0 := coalesce(a0, 0);
  j := public.pase_reclamar(1, 'gratis');
  select saldo into n from public.billeteras where usuario_id = us;
  if n <> a0 + 40 or j ->> 'tipo' <> 'ascuas' then raise exception 'T4a ascuas del nivel 1: % -> %', a0, n; end if;
  begin perform public.pase_reclamar(1, 'gratis'); raise exception 'T4b reclamó dos veces'; exception when others then if sqlerrm like 'T4b%' then raise; end if; end;
  begin perform public.pase_reclamar(3, 'gratis'); raise exception 'T4c reclamó un nivel que no alcanzó'; exception when others then if sqlerrm like 'T4c%' then raise; end if; end;

  -- T5: la pista premium exige el pase; comprar sin gemas falla
  begin perform public.pase_reclamar(1, 'premium'); raise exception 'T5a premium sin pase'; exception when others then if sqlerrm like 'T5a%' then raise; end if; end;
  begin perform public.pase_comprar(); raise exception 'T5b compró sin gemas'; exception when others then if sqlerrm like 'T5b%' then raise; end if; end;

  -- T6: compra única con gemas: −150 en el libro, una sola vez, y la clave idempotente evita el doble cobro
  perform private.registrar_movimiento(us, 400, 'ajuste_admin', 'test', 't123', 't123-gemas-' || us::text, 'gemas');
  select gemas into g0 from public.billeteras where usuario_id = us;
  j := public.pase_comprar();
  select gemas into n from public.billeteras where usuario_id = us;
  if n <> g0 - 150 or (j ->> 'gemas')::int <> n then raise exception 'T6a cobro del pase: % -> %', g0, n; end if;
  begin perform public.pase_comprar(); raise exception 'T6b compró dos veces'; exception when others then if sqlerrm like 'T6b%' then raise; end if; end;
  select count(*) into n from public.movimientos_tokens where clave = 'pase:' || us::text || ':' || tp::text and delta = -150 and tipo = 'compra_pase';
  if n <> 1 then raise exception 'T6c el libro debe tener 1 cobro, tiene %', n; end if;
  if private.registrar_movimiento(us, -150, 'compra_pase', 'pase', 'x', 'pase:' || us::text || ':' || tp::text, 'gemas') is not null then raise exception 'T6d la clave repetida debe devolver null'; end if;

  -- T7: premios premium: ascuas (nv1), gemas (nv3 con XP) y objeto exclusivo (nv5): llega al inventario, no se vende
  select coalesce(saldo, 0) into a0 from public.billeteras where usuario_id = us;
  perform public.pase_reclamar(1, 'premium');
  select saldo into n from public.billeteras where usuario_id = us;
  if n <> a0 + 60 then raise exception 'T7a premium nv1: % -> %', a0, n; end if;
  insert into public.xp_movimientos (usuario_id, puntos, fuente, clave) values (us, 300, 'partido_jugado', 't123-b');   -- 550 XP = nivel 5
  select gemas into g0 from public.billeteras where usuario_id = us;
  perform public.pase_reclamar(3, 'premium');
  select gemas into n from public.billeteras where usuario_id = us;
  if n <> g0 + 10 then raise exception 'T7b gemas de regreso: % -> %', g0, n; end if;
  j := public.pase_reclamar(5, 'premium');
  if j ->> 'tipo' <> 'item' or not exists (select 1 from public.inventario i join public.tienda_items t on t.id = i.item_id where i.usuario_id = us and t.clave = 'marco_pase_despegue') then raise exception 'T7c objeto exclusivo: %', j; end if;
  select id into it from public.tienda_items where clave = 'marco_pase_fenix';
  begin perform public.comprar_item(it, 'gemas'); raise exception 'T7d se pudo comprar un exclusivo'; exception when others then if sqlerrm like 'T7d%' then raise; end if; end;
  if exists (select 1 from jsonb_array_elements(public.tienda_lista()) x where x ->> 'clave' like '%_pase_%') then raise exception 'T7e un exclusivo del pase salió en la tienda'; end if;

  -- T8: si ya tenía el objeto del premio, se compensa con 100 ascuas (nv10 gratis = Marco Hielo)
  insert into public.xp_movimientos (usuario_id, puntos, fuente, clave) values (us, 500, 'partido_jugado', 't123-c');   -- 1050 XP = nivel 10
  insert into public.inventario (usuario_id, item_id, categoria, precio_pagado) select us, id, categoria, 0 from public.tienda_items where clave = 'marco_hielo';
  select saldo into a0 from public.billeteras where usuario_id = us;
  j := public.pase_reclamar(10, 'gratis');
  select saldo into n from public.billeteras where usuario_id = us;
  if (j ->> 'compensado')::boolean is not true or n <> a0 + 100 then raise exception 'T8 compensación: % %', j, n; end if;

  -- T9: la pista gratis nunca da gemas y las gemas de regreso son menores que el precio (como administrador)
  select id into adm from public.perfiles where rol = 'admin' limit 1;
  if adm is not null then
    perform set_config('request.jwt.claim.sub', adm::text, true);
    perform set_config('request.jwt.claims', json_build_object('sub', adm, 'role', 'authenticated')::text, true);
    begin perform public.admin_pase_recompensa(tp, 1, 'gratis', 'gemas', 5, null); raise exception 'T9a gemas en pista gratis'; exception when others then if sqlerrm like 'T9a%' then raise; end if; end;
    begin perform public.admin_pase_recompensa(tp, 2, 'premium', 'gemas', 100, null); raise exception 'T9b gemas de regreso >= precio'; exception when others then if sqlerrm like 'T9b%' then raise; end if; end;
    begin perform public.admin_pase_recompensa(tp, 1, 'premium', null, null, null); raise exception 'T9c borró un premio ya reclamado'; exception when others then if sqlerrm like 'T9c%' then raise; end if; end;
    begin perform public.admin_pase_temporada(null, 'cruzada', 'Temporada cruzada', now(), now() + interval '10 days', 30, 100, 150, true); raise exception 'T9d temporadas cruzadas'; exception when others then if sqlerrm like 'T9d%' then raise; end if; end;
    begin perform public.admin_pase_temporada(tp, 'despegue', 'Temporada 1', now() - interval '3 days', now() + interval '59 days', 30, 100, 150, true); raise exception 'T9e cambió el inicio con compras'; exception when others then if sqlerrm like 'T9e%' then raise; end if; end;
    perform set_config('request.jwt.claim.sub', us::text, true);
    perform set_config('request.jwt.claims', json_build_object('sub', us, 'role', 'authenticated')::text, true);
  end if;
  begin perform public.admin_pase_recompensa(tp, 1, 'premium', 'ascuas', 5000, null); raise exception 'T9f un jugador editó el pase'; exception when others then if sqlerrm like 'T9f%' then raise; end if; end;

  -- T10: torneo premium: solo el creador, una vez, con gemas
  insert into public.torneos_libres (creador, nombre, formato) values (us, 'Torneo de prueba 123', 'eliminacion') returning id into tid;
  j := public.torneo_premium_info(tid);
  if (j ->> 'puede')::boolean is not true or (j ->> 'precio_gemas')::int <> 300 or (j ->> 'premium')::boolean then raise exception 'T10a info: %', j; end if;
  perform private.registrar_movimiento(us, 500, 'ajuste_admin', 'test', 't123', 't123-gemas2-' || us::text, 'gemas');
  select gemas into g0 from public.billeteras where usuario_id = us;
  perform public.torneo_hacer_premium(tid);
  select gemas into n from public.billeteras where usuario_id = us;
  if n <> g0 - 300 or not exists (select 1 from public.torneo_premium where torneo_id = tid) then raise exception 'T10b cobro del torneo premium: % -> %', g0, n; end if;
  begin perform public.torneo_hacer_premium(tid); raise exception 'T10c premium dos veces'; exception when others then if sqlerrm like 'T10c%' then raise; end if; end;
  if (public.torneo_premium_info(tid) ->> 'premium')::boolean is not true then raise exception 'T10d info debe decir premium'; end if;
  insert into public.torneos_libres (creador, nombre, formato) values (us, 'Torneo ajeno 123', 'eliminacion') returning id into tid;
  perform set_config('request.jwt.claim.sub', otro::text, true);
  perform set_config('request.jwt.claims', json_build_object('sub', otro, 'role', 'authenticated')::text, true);
  begin perform public.torneo_hacer_premium(tid); raise exception 'T10e otra persona hizo premium un torneo ajeno'; exception when others then if sqlerrm like 'T10e%' then raise; end if; end;
  perform set_config('request.jwt.claim.sub', us::text, true);
  perform set_config('request.jwt.claims', json_build_object('sub', us, 'role', 'authenticated')::text, true);

  -- T11: el libro sigue cuadrando con las billeteras
  select count(*) into n from private.economia_diferencias();
  if n <> 0 then raise exception 'T11 libro descuadrado: % diferencia(s)', n; end if;

  raise exception 'TODO_OK_REVERTIDO';
end $t$;

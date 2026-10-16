-- Pruebas de la migración 108 (economía Fase 1). SE DESHACEN SOLAS: el bloque termina con un error a propósito, así no queda nada guardado.
-- Cómo correrlas: pegar este archivo entero en el SQL Editor de Supabase (o con execute_sql). Debe terminar con:
--   ERROR: PRUEBAS(se deshace todo): T1 ok;T2 ok;T3 ok;T4 ok;T5 ok;T6 ok;T7 ok;T8 ok;T9 ok;T10 ok;T11 ok;
-- Si aparece «FALLO» en alguna, no uses la economía hasta corregirla.
-- Cubre: precio por moneda, compra con gemas y con ascuas, moneda_pagada, doble compra, saldo insuficiente, objeto que no se vende en una
-- moneda, idempotencia del libro, auditoría (0 diferencias), disparador de precios y reembolso que deja saldo negativo.
do $t$
declare uid uuid := gen_random_uuid(); r text := ''; v jsonb; i1 bigint; i2 bigint; z bigint; n integer; mp text; pa integer; pg integer; s0 integer;
begin
  insert into auth.users (id, email) values (uid, 'prueba-economia@example.invalid');
  perform set_config('request.jwt.claim.sub', uid::text, true);
  perform set_config('request.jwt.claims', json_build_object('sub', uid, 'role', 'authenticated')::text, true);
  perform private.registrar_movimiento(uid, 1000, 'ajuste_admin', 'test', 't1', 't-asc-' || uid::text, 'ascuas');
  perform private.registrar_movimiento(uid, 100, 'ajuste_admin', 'test', 't2', 't-gem-' || uid::text, 'gemas');
  select id into i1 from public.tienda_items where nombre = 'Estratega';
  select id into i2 from public.tienda_items where nombre = 'Marco Fuego';
  select precio_ascuas, precio_gemas into pa, pg from public.tienda_items where id = i1;
  r := r || case when pa = 80 and pg = 16 then 'T1 ok;' else 'T1 FALLO(' || coalesce(pa::text,'?') || '/' || coalesce(pg::text,'?') || ');' end;
  v := public.comprar_item(i1, 'gemas');
  select moneda_pagada into mp from public.inventario where usuario_id = uid and item_id = i1;
  r := r || case when (v->>'gemas')::int = 84 and (v->>'saldo')::int = 1000 and mp = 'gemas' then 'T2 ok;' else 'T2 FALLO(' || v::text || ',' || coalesce(mp,'?') || ');' end;
  begin perform public.comprar_item(i1, 'ascuas'); r := r || 'T3 FALLO;';
  exception when others then r := r || case when sqlerrm like 'Ya tienes%' then 'T3 ok;' else 'T3 FALLO(' || sqlerrm || ');' end; end;
  v := public.comprar_item(i2, 'ascuas');
  select moneda_pagada into mp from public.inventario where usuario_id = uid and item_id = i2;
  r := r || case when (v->>'saldo')::int = 880 and (v->>'gemas')::int = 84 and mp = 'ascuas' then 'T4 ok;' else 'T4 FALLO(' || v::text || ');' end;
  insert into public.tienda_items (clave, nombre, descripcion, categoria, precio, nivel_min, stock, estilo, activo)
    select 'zz_test', 'ZZ test', descripcion, categoria, 99999, 1, null, estilo, true from public.tienda_items where id = i1 returning id into z;
  begin perform public.comprar_item(z, 'ascuas'); r := r || 'T5 FALLO;';
  exception when others then r := r || case when sqlerrm like 'Saldo insuficiente%' then 'T5 ok;' else 'T5 FALLO(' || sqlerrm || ');' end; end;
  update public.tienda_items set precio_ascuas = null where id = z;
  begin perform public.comprar_item(z, 'ascuas'); r := r || 'T6 FALLO;';
  exception when others then r := r || case when sqlerrm like '%no se vende con%' then 'T6 ok;' else 'T6 FALLO(' || sqlerrm || ');' end; end;
  select saldo into s0 from public.billeteras where usuario_id = uid;
  perform private.registrar_movimiento(uid, 5, 'ajuste_admin', 'test', 't1b', 't-asc-' || uid::text, 'ascuas');
  r := r || case when (select saldo from public.billeteras where usuario_id = uid) = s0 then 'T7 ok;' else 'T7 FALLO;' end;
  select count(*) into n from private.economia_diferencias();
  r := r || case when n = 0 then 'T8 ok;' else 'T8 FALLO(' || n || ' diferencias);' end;
  update public.tienda_items set precio = 50 where id = z;
  select precio_ascuas, precio_gemas into pa, pg from public.tienda_items where id = z;
  r := r || case when pa = 50 and pg = 10 then 'T9 ok;' else 'T9 FALLO(' || coalesce(pa::text,'?') || '/' || coalesce(pg::text,'?') || ');' end;
  perform private.registrar_movimiento(uid, -5000, 'reembolso', 'test', 'rb', 't-reemb-' || uid::text, 'ascuas');
  begin perform public.comprar_item(z, 'ascuas'); r := r || 'T10 FALLO;';
  exception when others then r := r || case when sqlerrm like 'Saldo insuficiente%' then 'T10 ok;' else 'T10 FALLO(' || sqlerrm || ');' end; end;
  select count(*) into n from private.economia_diferencias();
  r := r || case when n = 0 then 'T11 ok;' else 'T11 FALLO(' || n || ');' end;
  raise exception 'PRUEBAS(se deshace todo): %', r;
end $t$;

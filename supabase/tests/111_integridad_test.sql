-- Pruebas de la migración 111 (libro inmutable, estados de orden, bitácora). Se deshacen solas: debe terminar con «TODO_OK_REVERTIDO».
do $$
declare us uuid; oid uuid; mid bigint; n int;
begin
  select id into us from auth.users limit 1;
  if us is null then raise exception 'Hace falta al menos un usuario'; end if;
  -- libro: no se edita ni se borra
  perform private.registrar_movimiento(us, 5, 'ajuste_admin', 'prueba', 'p1', 'prueba111:' || gen_random_uuid()::text, 'gemas');
  select id into mid from public.movimientos_tokens where fuente = 'prueba' order by id desc limit 1;
  begin update public.movimientos_tokens set delta = 999 where id = mid; raise exception 'FALLO libro update'; exception when others then if sqlerrm like 'FALLO%' then raise; end if; end;
  begin delete from public.movimientos_tokens where id = mid; raise exception 'FALLO libro delete'; exception when others then if sqlerrm like 'FALLO%' then raise; end if; end;
  -- órdenes: monto fijo y estados válidos
  insert into public.ordenes_pago (usuario_id, paquete_id, tokens, monto_centimos, moneda, estado)
    select us, p.id, p.tokens, p.precio_centimos, p.moneda, 'PENDIENTE' from public.paquetes_tokens p limit 1 returning id into oid;
  begin update public.ordenes_pago set monto_centimos = 1 where id = oid; raise exception 'FALLO monto'; exception when others then if sqlerrm like 'FALLO%' then raise; end if; end;
  update public.ordenes_pago set estado = 'EXPIRADA' where id = oid;
  begin update public.ordenes_pago set estado = 'PAGADA' where id = oid; raise exception 'FALLO estado final'; exception when others then if sqlerrm like 'FALLO%' then raise; end if; end;
  begin delete from public.ordenes_pago where id = oid; raise exception 'FALLO borrar orden'; exception when others then if sqlerrm like 'FALLO%' then raise; end if; end;
  -- bitácora de configuración
  update public.economia_config set valor = valor || '' where clave = 'pagos_activos';
  select count(*) into n from public.economia_config_log;
  update public.economia_config set valor = (case when valor = 'true' then 'false' else valor end) where clave = 'pagos_activos';
  raise exception 'TODO_OK_REVERTIDO';
end $$;

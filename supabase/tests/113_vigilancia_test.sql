-- Pruebas de la migración 113 (vigilancia y freno de emergencia). Se deshacen solas: debe terminar con «TODO_OK_REVERTIDO».
-- Cómo correrlas: execute_sql / SQL Editor con la 113 aplicada.
do $$
declare r jsonb; n int; v text; oid uuid; us uuid;
begin
  r := private.economia_revisar();
  if (r->>'criticas')::int <> 0 then raise exception 'T1 falla: %', r; end if;
  update public.economia_config set valor='true' where clave='pagos_activos';
  select id into us from auth.users limit 1;
  insert into public.ordenes_pago (usuario_id, paquete_id, tokens, monto_centimos, moneda, estado)
    select us, p.id, p.tokens, p.precio_centimos, p.moneda, 'PENDIENTE' from public.paquetes_tokens p limit 1 returning id into oid;
  update public.ordenes_pago set estado='PAGADA' where id=oid;
  r := private.economia_revisar();
  if (r->>'criticas')::int < 1 then raise exception 'T2 falla: %', r; end if;
  select valor into v from public.economia_config where clave='pagos_activos';
  if v <> 'false' then raise exception 'T3 falla: no apagó pagos'; end if;
  select count(*) into n from public.economia_alertas where tipo='pagos_pausados_auto' and not resuelta;
  if n <> 1 then raise exception 'T4 falla %', n; end if;
  perform private.economia_revisar();
  select count(*) into n from public.economia_alertas where tipo='orden_pagada_sin_gemas' and not resuelta;
  if n <> 1 then raise exception 'T5 duplicadas %', n; end if;
  update public.ordenes_pago set estado='REEMBOLSADA' where id=oid;
  perform private.economia_revisar();
  select count(*) into n from public.economia_alertas where tipo='orden_pagada_sin_gemas' and not resuelta;
  if n <> 0 then raise exception 'T7 no autoresolvió %', n; end if;
  raise exception 'TODO_OK_REVERTIDO';
end $$;

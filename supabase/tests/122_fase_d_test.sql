-- Prueba de la migración 122 (pasarela). Se ejecuta en una transacción que SIEMPRE se deshace: termina en RAISE EXCEPTION 'TODO_OK_REVERTIDO'.
-- Correr en el SQL Editor de Supabase (rol postgres). Si algo falla, el mensaje dice qué prueba falló.
-- La firma HMAC se prueba aparte (tests/pasarelaMercadoPago.test.mjs); aquí se prueba lo que ocurre DESPUÉS de verificarla.
do $$
declare u uuid; pq public.paquetes_tokens; o1 uuid; o2 uuid; o3 uuid; r jsonb; est text; mov integer; ref1 text := 'TEST-PAY-1'; ref2 text := 'TEST-PAY-2'; c jsonb;
begin
  select id into u from public.perfiles limit 1;
  select * into pq from public.paquetes_tokens where activo order by precio_centimos limit 1;
  if u is null or pq.id is null then raise exception 'Faltan datos base (perfil o paquete).'; end if;

  -- 0) El método existe, es pasarela, está INACTIVO; los pagos siguen apagados; permisos cerrados.
  if not exists (select 1 from public.pagos_metodos where clave = 'mercadopago' and tipo = 'pasarela' and not activo) then raise exception 'T0a método mercadopago mal'; end if;
  if private.config('pagos_activos') <> 'false' then raise exception 'T0b pagos_activos debería seguir en false'; end if;
  if has_function_privilege('anon', 'public.pasarela_procesar(text,text,text,text,text,text,integer,text,boolean,text)', 'execute')
     or has_function_privilege('authenticated', 'public.pasarela_procesar(text,text,text,text,text,text,integer,text,boolean,text)', 'execute')
     or not has_function_privilege('service_role', 'public.pasarela_procesar(text,text,text,text,text,text,integer,text,boolean,text)', 'execute') then raise exception 'T0c permisos de pasarela_procesar mal'; end if;
  if has_table_privilege('authenticated', 'public.pagos_eventos', 'select') then raise exception 'T0d pagos_eventos legible por jugadores'; end if;

  insert into public.ordenes_pago (usuario_id, paquete_id, tokens, monto_centimos, moneda, metodo, proveedor) values (u, pq.id, pq.tokens, pq.precio_centimos, pq.moneda, 'mercadopago', 'mercadopago') returning id into o1;
  insert into public.ordenes_pago (usuario_id, paquete_id, tokens, monto_centimos, moneda, metodo, proveedor) values (u, pq.id, pq.tokens, pq.precio_centimos, pq.moneda, 'mercadopago', 'mercadopago') returning id into o2;
  insert into public.ordenes_pago (usuario_id, paquete_id, tokens, monto_centimos, moneda, metodo, proveedor) values (u, pq.id, pq.tokens, pq.precio_centimos, pq.moneda, 'manual_yape', 'yape') returning id into o3;

  -- 1) Firma incorrecta: se registra y no se procesa.
  r := public.pasarela_rechazo('mercadopago', 'req-1', 'Firma no coincide');
  if r ->> 'resultado' <> 'firma_invalida' then raise exception 'T1 firma inválida: %', r; end if;
  if not exists (select 1 from public.pagos_eventos where request_id = 'req-1' and not firma_valida and resultado = 'firma_invalida') then raise exception 'T1b no se registró'; end if;

  -- 2) Pago correcto: acredita y deja el aviso registrado.
  r := public.pasarela_procesar('mercadopago', ref1, 'approved', 'req-2', o1::text, 'pagado', pq.precio_centimos, pq.moneda, false, 'prueba');
  if r ->> 'resultado' <> 'acreditada' then raise exception 'T2 acreditar: %', r; end if;
  select estado into est from public.ordenes_pago where id = o1;
  if est <> 'PAGADA' then raise exception 'T2b la orden quedó %', est; end if;
  select count(*) into mov from public.movimientos_tokens where referencia = o1::text and tipo = 'compra_dinero';
  if mov <> 1 then raise exception 'T2c movimientos de compra: %', mov; end if;

  -- 3) Aviso duplicado (mismo pago y mismo estado): no acredita otra vez.
  r := public.pasarela_procesar('mercadopago', ref1, 'approved', 'req-3', o1::text, 'pagado', pq.precio_centimos, pq.moneda, false, 'prueba');
  if r ->> 'resultado' <> 'duplicado' then raise exception 'T3 duplicado: %', r; end if;
  select count(*) into mov from public.movimientos_tokens where referencia = o1::text and tipo = 'compra_dinero';
  if mov <> 1 then raise exception 'T3b gemas duplicadas: %', mov; end if;

  -- 4) Monto distinto: no acredita, alerta crítica, la orden sigue pendiente.
  r := public.pasarela_procesar('mercadopago', ref2, 'approved', 'req-4', o2::text, 'pagado', pq.precio_centimos - 100, pq.moneda, false, 'prueba');
  if r ->> 'resultado' <> 'monto_distinto' then raise exception 'T4 monto distinto: %', r; end if;
  select estado into est from public.ordenes_pago where id = o2;
  if est <> 'PENDIENTE' then raise exception 'T4b orden %', est; end if;
  if not exists (select 1 from public.economia_alertas where tipo = 'pasarela_pago_no_acreditado' and clave = ref2 and nivel = 'critica') then raise exception 'T4c sin alerta'; end if;

  -- 5) Reembolso total: descuenta las gemas y marca la orden.
  r := public.pasarela_procesar('mercadopago', ref1, 'refunded', 'req-5', o1::text, 'reembolsado', pq.precio_centimos, pq.moneda, false, 'prueba');
  if r ->> 'resultado' <> 'revertida' then raise exception 'T5 reembolso: %', r; end if;
  select estado into est from public.ordenes_pago where id = o1;
  if est <> 'REEMBOLSADA' then raise exception 'T5b orden %', est; end if;
  select coalesce(sum(delta), 0) into mov from public.movimientos_tokens where referencia = o1::text and moneda = 'gemas';
  if mov <> 0 then raise exception 'T5c las gemas no cuadran a cero: %', mov; end if;

  -- 6) Orden desconocida (uuid inexistente, texto que no es uuid, y orden de OTRO método).
  r := public.pasarela_procesar('mercadopago', 'TEST-PAY-9', 'approved', 'req-6', gen_random_uuid()::text, 'pagado', 1000, 'PEN', false, 'prueba');
  if r ->> 'resultado' <> 'orden_desconocida' then raise exception 'T6 orden desconocida: %', r; end if;
  r := public.pasarela_procesar('mercadopago', 'TEST-PAY-10', 'approved', 'req-6b', 'no-es-uuid', 'pagado', 1000, 'PEN', false, 'prueba');
  if r ->> 'resultado' <> 'orden_desconocida' then raise exception 'T6b texto no uuid: %', r; end if;
  r := public.pasarela_procesar('mercadopago', 'TEST-PAY-11', 'approved', 'req-6c', o3::text, 'pagado', pq.precio_centimos, pq.moneda, false, 'prueba');
  if r ->> 'resultado' <> 'orden_desconocida' then raise exception 'T6c orden manual: %', r; end if;
  select estado into est from public.ordenes_pago where id = o3;
  if est <> 'PENDIENTE' then raise exception 'T6d orden manual %', est; end if;

  -- 7) Modo equivocado: aviso de producción en modo prueba (y al revés) no acredita.
  r := public.pasarela_procesar('mercadopago', 'TEST-PAY-12', 'approved', 'req-7', o2::text, 'pagado', pq.precio_centimos, pq.moneda, true, 'prueba');
  if r ->> 'resultado' <> 'modo_incorrecto' then raise exception 'T7 modo: %', r; end if;
  r := public.pasarela_procesar('mercadopago', 'TEST-PAY-13', 'approved', 'req-7b', o2::text, 'pagado', pq.precio_centimos, pq.moneda, false, 'produccion');
  if r ->> 'resultado' <> 'modo_incorrecto' then raise exception 'T7b modo: %', r; end if;

  -- 8) Estado sin efecto («pendiente») y reembolso parcial (solo alerta).
  r := public.pasarela_procesar('mercadopago', 'TEST-PAY-14', 'pending', 'req-8', o2::text, null, null, null, false, 'prueba');
  if r ->> 'resultado' <> 'ignorado' then raise exception 'T8 ignorado: %', r; end if;
  r := public.pasarela_procesar('mercadopago', 'TEST-PAY-15', 'approved', 'req-8b', o2::text, 'reembolso_parcial', pq.precio_centimos, pq.moneda, false, 'prueba');
  if r ->> 'resultado' <> 'reembolso_parcial' then raise exception 'T8b parcial: %', r; end if;

  -- 9) Pago aprobado tras vencer la orden: no acredita y avisa.
  update public.ordenes_pago set estado = 'EXPIRADA' where id = o2;
  r := public.pasarela_procesar('mercadopago', 'TEST-PAY-16', 'approved', 'req-9', o2::text, 'pagado', pq.precio_centimos, pq.moneda, false, 'prueba');
  if r ->> 'resultado' <> 'estado_invalido' then raise exception 'T9 orden vencida: %', r; end if;

  -- 10) El registro de avisos es inmutable.
  begin update public.pagos_eventos set resultado = 'ignorado' where request_id = 'req-2'; raise exception 'T10 se pudo editar'; exception when sqlstate '42501' then null; end;
  begin delete from public.pagos_eventos where request_id = 'req-2'; raise exception 'T10b se pudo borrar'; exception when sqlstate '42501' then null; end;

  -- 11) Cobro: una orden de otro método no puede cobrarse por pasarela; el enlace guardado debe ser de Mercado Pago.
  begin perform public.pasarela_orden_para_cobro(o3, u); raise exception 'T11 una orden manual se pudo cobrar'; exception when others then if sqlerrm <> 'La orden no es de Mercado Pago.' then raise exception 'T11: %', sqlerrm; end if; end;
  r := public.pasarela_orden_para_cobro(o2, u) ; -- o2 está EXPIRADA: debe fallar
  raise exception 'T11b una orden vencida se pudo cobrar';
exception when others then
  if sqlerrm = 'La orden ya no está pendiente.' then
    begin perform public.pasarela_guardar_checkout(gen_random_uuid(), 'https://evil.example.com/pay', 'x'); raise exception 'T11c enlace ajeno aceptado';
    exception when others then if sqlerrm <> 'Enlace de pago no válido.' then raise exception 'T11c: %', sqlerrm; end if; end;
    -- 12) Conciliación: si el total del proveedor no coincide con las órdenes, queda 'diferencia' y alerta crítica.
    c := public.pasarela_conciliar('mercadopago', (now() at time zone 'America/Lima')::date, 12345, 1, 0, '{}'::jsonb);
    if c ->> 'estado' <> 'diferencia' then raise exception 'T12 conciliación: %', c; end if;
    raise exception 'TODO_OK_REVERTIDO';
  end if;
  raise;
end $$;

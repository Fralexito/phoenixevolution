-- Pruebas de la migración 119 (paquetes, bono de primera compra, rarezas y ediciones limitadas). Se deshacen solas: debe terminar con «TODO_OK_REVERTIDO».
do $$
declare us uuid; pk bigint; o1 uuid; o2 uuid; g0 int; g1 int; r text; n int; j jsonb;
begin
  select id into us from auth.users limit 1;
  select coalesce(gemas,0) into g0 from billeteras where usuario_id = us; g0 := coalesce(g0,0);
  select id into pk from paquetes_tokens where clave='gemas_chispa';
  insert into ordenes_pago (usuario_id, paquete_id, tokens, monto_centimos, moneda, estado) values (us, pk, 50, 500, 'PEN', 'PENDIENTE') returning id into o1;
  r := public.procesar_pago_evento('pagado', o1, 'manual', 'T1', 500, 'PEN', 'x');
  select gemas into g1 from billeteras where usuario_id = us;
  if g1 <> g0 + 75 then raise exception 'T1 bono: % -> % (esperado +75)', g0, g1; end if;
  insert into ordenes_pago (usuario_id, paquete_id, tokens, monto_centimos, moneda, estado) values (us, pk, 50, 500, 'PEN', 'PENDIENTE') returning id into o2;
  perform public.procesar_pago_evento('pagado', o2, 'manual', 'T2', 500, 'PEN', 'y');
  select gemas into n from billeteras where usuario_id = us;
  if n <> g1 + 50 then raise exception 'T2 segundo pago no debe llevar bono: % -> %', g1, n; end if;
  perform public.procesar_pago_evento('reembolsado', o1, 'manual', null, null, null, null);
  select gemas into n from billeteras where usuario_id = us;
  if n <> g1 + 50 - 75 then raise exception 'T3 reembolso debe quitar compra y bono: %', n; end if;
  select count(*) into n from private.economia_diferencias();
  if n <> 0 then raise exception 'T4 libro descuadrado: %', n; end if;
  j := public.paquetes_lista();
  if jsonb_array_length(j->'paquetes') <> 4 or (j->>'bono_primera_pct')::int <> 50 then raise exception 'T5 paquetes: %', j; end if;
  select jsonb_array_length(public.tienda_lista()) into n;
  if n <> 39 then raise exception 'T6 la tienda tiene % objetos (esperado 39: 28 de la Fase A + 11 de la Fase C)', n; end if;
  update tienda_items set limitada_hasta = now() - interval '1 hour' where clave='marco_halloween';
  select jsonb_array_length(public.tienda_lista()) into n;
  if n <> 38 then raise exception 'T7 una edición terminada debe ocultarse: %', n; end if;
  raise exception 'TODO_OK_REVERTIDO';
end $$;

-- OBSOLETA desde la migración 112: enviar_comprobante_manual ahora pide 4 argumentos, captura real en storage y perfil completo. Se conserva como referencia; las pruebas vigentes son 111_integridad_test.sql y 113_vigilancia_test.sql.
-- Pruebas de la migración 109 (recargas: pago manual). SE DESHACEN SOLAS (el bloque termina con un error a propósito).
-- Cómo correrlas: aplicar antes la 109 y pegar este archivo entero en el SQL Editor (o con execute_sql). Debe terminar con:
--   ERROR: PRUEBAS109(se deshace todo): A ok;B ok;C ok;D ok;E ok;F ok;G ok;H ok;I ok;J1 ok;J2 ok;K ok;L ok;M ok;N ok;
-- Si aparece «FALLO», no actives los pagos hasta corregirlo. (Para probar ANTES de aplicar, pega primero el SQL de la migración y luego este bloque.)
do $t$
declare u1 uuid := gen_random_uuid(); a1 uuid := gen_random_uuid(); r text := ''; v jsonb; o1 uuid; o2 uuid; o3 uuid; o4 uuid; pk bigint; g0 integer; g1 integer; res text; est text; n integer;
begin
  insert into auth.users (id, email) values (u1, 'u1-recargas@example.invalid'), (a1, 'a1-recargas@example.invalid');
  update public.perfiles set rol = 'admin' where id = a1;
  insert into public.edades (usuario_id, nacimiento, declarada_at) values (u1, date '1990-01-01', now());
  insert into public.aceptaciones_legales (usuario_id, documento, version) values (u1, 'terminos_compra', private.config('version_terminos'));
  update public.economia_config set valor = 'true' where clave = 'pagos_activos';
  update public.pagos_metodos set activo = true, datos = '{"yape":"999999999"}'::jsonb where clave = 'manual_yape';
  select id into pk from public.paquetes_tokens where clave = 'gemas_300';
  perform set_config('request.jwt.claim.sub', u1::text, true); perform set_config('request.jwt.claims', json_build_object('sub', u1, 'role', 'authenticated')::text, true);
  -- A: un método inactivo no se puede usar
  begin perform public.crear_orden_metodo(pk, 'manual_plin'); r := r || 'A FALLO;';
  exception when others then r := r || case when sqlerrm like '%no está disponible%' then 'A ok;' else 'A FALLO(' || sqlerrm || ');' end; end;
  -- B: crear orden manual (monto fijado por el servidor, con vencimiento)
  v := public.crear_orden_metodo(pk, 'manual_yape'); o1 := (v->>'orden')::uuid;
  r := r || case when (v->>'monto_centimos')::int = 2700 and v->>'tipo' = 'manual' and (v->>'expira_at') is not null then 'B ok;' else 'B FALLO(' || v::text || ');' end;
  -- C: código de operación inválido
  begin perform public.enviar_comprobante_manual(o1, 'ab', null); r := r || 'C FALLO;';
  exception when others then r := r || case when sqlerrm like '%código de operación solo%' then 'C ok;' else 'C FALLO(' || sqlerrm || ');' end; end;
  -- D: imagen de otra persona
  begin perform public.enviar_comprobante_manual(o1, 'OP123456', gen_random_uuid()::text || '/x.png'); r := r || 'D FALLO;';
  exception when others then r := r || case when sqlerrm like '%imagen del comprobante no es válida%' then 'D ok;' else 'D FALLO(' || sqlerrm || ');' end; end;
  -- E: envío válido y no se puede reenviar mientras se revisa
  perform public.enviar_comprobante_manual(o1, 'OP123456', u1::text || '/o1.png');
  begin perform public.enviar_comprobante_manual(o1, 'OP999999', null); r := r || 'E FALLO;';
  exception when others then r := r || case when sqlerrm like '%espera la revisión%' then 'E ok;' else 'E FALLO(' || sqlerrm || ');' end; end;
  -- F: una persona normal no puede revisar pagos
  begin perform public.admin_resolver_pago_manual(o1, true, null); r := r || 'F FALLO;';
  exception when others then r := r || case when sqlerrm like 'Solo el administrador%' then 'F ok;' else 'F FALLO(' || sqlerrm || ');' end; end;
  -- G: el mismo código de operación (aunque cambie mayúsculas) no se puede usar en otra orden
  v := public.crear_orden_metodo(pk, 'manual_yape'); o2 := (v->>'orden')::uuid;
  begin perform public.enviar_comprobante_manual(o2, 'op123456', null); r := r || 'G FALLO;';
  exception when others then r := r || case when sqlerrm like '%ya fue usado%' then 'G ok;' else 'G FALLO(' || sqlerrm || ');' end; end;
  -- H: el administrador aprueba → gemas acreditadas una sola vez
  perform set_config('request.jwt.claim.sub', a1::text, true); perform set_config('request.jwt.claims', json_build_object('sub', a1, 'role', 'authenticated')::text, true);
  g0 := coalesce((select gemas from public.billeteras where usuario_id = u1), 0);
  res := public.admin_resolver_pago_manual(o1, true, 'ok');
  g1 := coalesce((select gemas from public.billeteras where usuario_id = u1), 0);
  select estado into est from public.ordenes_pago where id = o1;
  r := r || case when res = 'acreditada' and g1 = g0 + 300 and est = 'PAGADA' then 'H ok;' else 'H FALLO(' || coalesce(res, '?') || ',' || g0 || '>' || g1 || ',' || coalesce(est, '?') || ');' end;
  -- I: no se puede aprobar dos veces
  begin perform public.admin_resolver_pago_manual(o1, true, null); r := r || 'I FALLO;';
  exception when others then r := r || case when sqlerrm like '%ya fue revisado%' then 'I ok;' else 'I FALLO(' || sqlerrm || ');' end; end;
  -- J: rechazar exige motivo; rechazo deja la orden FALLIDA y no da gemas
  perform set_config('request.jwt.claim.sub', u1::text, true); perform set_config('request.jwt.claims', json_build_object('sub', u1, 'role', 'authenticated')::text, true);
  perform public.enviar_comprobante_manual(o2, 'OP777777', null);
  perform set_config('request.jwt.claim.sub', a1::text, true); perform set_config('request.jwt.claims', json_build_object('sub', a1, 'role', 'authenticated')::text, true);
  begin perform public.admin_resolver_pago_manual(o2, false, 'x'); r := r || 'J1 FALLO;';
  exception when others then r := r || case when sqlerrm like '%motivo del rechazo%' then 'J1 ok;' else 'J1 FALLO(' || sqlerrm || ');' end; end;
  res := public.admin_resolver_pago_manual(o2, false, 'No llegó el pago');
  select estado into est from public.ordenes_pago where id = o2;
  r := r || case when est = 'FALLIDA' and coalesce((select gemas from public.billeteras where usuario_id = u1), 0) = g1 then 'J2 ok;' else 'J2 FALLO(' || coalesce(est, '?') || ');' end;
  -- K: tras un rechazo el código de operación queda libre
  perform set_config('request.jwt.claim.sub', u1::text, true); perform set_config('request.jwt.claims', json_build_object('sub', u1, 'role', 'authenticated')::text, true);
  v := public.crear_orden_metodo(pk, 'manual_yape'); o3 := (v->>'orden')::uuid;
  begin perform public.enviar_comprobante_manual(o3, 'OP777777', null); r := r || 'K ok;';
  exception when others then r := r || 'K FALLO(' || sqlerrm || ');'; end;
  -- L: vencimiento: la orden sin comprobante expira; la que está en revisión no
  v := public.crear_orden_metodo(pk, 'manual_yape'); o4 := (v->>'orden')::uuid;
  update public.ordenes_pago set expira_at = now() - interval '1 hour' where id in (o3, o4);
  n := public.expirar_ordenes_pendientes();
  r := r || case when n = 1 and (select estado from public.ordenes_pago where id = o4) = 'EXPIRADA' and (select estado from public.ordenes_pago where id = o3) = 'PENDIENTE' then 'L ok;' else 'L FALLO(' || n || ');' end;
  -- M: tope diario de recargas
  update public.economia_config set valor = '3000' where clave = 'recarga_tope_diario_centimos';
  begin perform public.crear_orden_metodo(pk, 'manual_yape'); r := r || 'M FALLO;';
  exception when others then r := r || case when sqlerrm like '%tope diario%' then 'M ok;' else 'M FALLO(' || sqlerrm || ');' end; end;
  -- N: el libro sigue cuadrando con las billeteras
  select count(*) into n from private.economia_diferencias();
  r := r || case when n = 0 then 'N ok;' else 'N FALLO(' || n || ');' end;
  raise exception 'PRUEBAS109(se deshace todo): %', r;
end $t$;

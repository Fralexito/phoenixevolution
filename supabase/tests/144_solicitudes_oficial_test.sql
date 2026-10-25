-- Prueba de la migración 144 (solicitudes para hacer oficial una liga). Requiere 097, 142, 143 y 144 aplicadas.
-- Corre en el SQL Editor (o por MCP) dentro de UNA transacción y termina SIEMPRE con un error a propósito:
--   · «TODO_OK_REVERTIDO» = todas las pruebas pasaron y no quedó nada guardado;
--   · cualquier otro mensaje = la prueba que falló (tampoco queda nada guardado).
-- Usa las cuentas que existan: un admin (staff) y dos jugadores (creador y extraño). Sin DELETE (el conector MCP se cuelga con DELETE).
do $prueba$
declare
  adm uuid; cre uuid; otro uuid; t1 bigint; t2 bigint; t3 bigint; t4 bigint; s bigint; eid text; j jsonb; n int;
begin
  select id into adm from public.perfiles where rol = 'admin' order by id limit 1;
  select id into cre from public.perfiles where rol = 'jugador' order by id limit 1;
  select id into otro from public.perfiles where rol = 'jugador' and id <> cre order by id limit 1;
  if adm is null or cre is null or otro is null then raise exception 'FALTAN CUENTAS: hacen falta 1 admin y 2 jugadores'; end if;

  -- Ligas de prueba (insertadas directo, sin pasar por torneo_crear).
  insert into public.torneos_libres (creador, nombre, formato, estado) values (cre, 'Prueba 144 liga A', 'liguilla', 'inscripcion') returning id into t1;
  insert into public.torneos_libres (creador, nombre, formato, estado) values (cre, 'Prueba 144 liga B', 'idavuelta', 'inscripcion') returning id into t2;
  insert into public.torneos_libres (creador, nombre, formato, estado) values (cre, 'Prueba 144 liga C', 'liguilla', 'inscripcion') returning id into t3;
  insert into public.torneos_libres (creador, nombre, formato, estado) values (cre, 'Prueba 144 llaves', 'eliminacion', 'inscripcion') returning id into t4;
  insert into public.torneos_libres_inscritos (torneo_id, usuario, nombre) values (t1, cre, 'Creador 144'), (t1, otro, 'Otro 144');

  -- P1 · un extraño no puede pedir
  perform set_config('request.jwt.claims', json_build_object('sub', otro, 'role', 'authenticated')::text, true);
  begin perform public.torneo_solicitar_oficial(t1, null); raise exception 'P1 FALLA: un extraño pudo pedir';
  exception when insufficient_privilege then null; end;

  -- P2 · el creador pide; al staff le llega el aviso
  perform set_config('request.jwt.claims', json_build_object('sub', cre, 'role', 'authenticated')::text, true);
  s := public.torneo_solicitar_oficial(t1, 'Somos 6 y queremos la liga con Link');
  select count(*) into n from public.notificaciones where usuario_id = adm and tipo = 'LIGA_OFICIAL' and enlace = 'torneo/?id=' || t1;
  if n <> 1 then raise exception 'P2 FALLA: el staff no recibió el aviso (%)', n; end if;

  -- P3 · no se puede pedir dos veces
  begin perform public.torneo_solicitar_oficial(t1, null); raise exception 'P3 FALLA: dos pedidos pendientes';
  exception when unique_violation then null; end;

  -- P4 · el creador ve su pedido; un extraño no
  j := public.torneo_solicitud_oficial_de(t1);
  if j ->> 'estado' <> 'pendiente' then raise exception 'P4 FALLA: el creador no ve su pedido (%)', j; end if;
  perform set_config('request.jwt.claims', json_build_object('sub', otro, 'role', 'authenticated')::text, true);
  if public.torneo_solicitud_oficial_de(t1) is not null then raise exception 'P4 FALLA: un extraño ve el pedido'; end if;

  -- P5 · un jugador no ve la lista del staff
  begin perform * from public.staff_solicitudes_oficial(); raise exception 'P5 FALLA: un jugador ve la lista';
  exception when insufficient_privilege then null; end;

  -- P6 · el staff rechaza: sin motivo no; con motivo sí, y le avisa al creador
  perform set_config('request.jwt.claims', json_build_object('sub', adm, 'role', 'authenticated')::text, true);
  select count(*) into n from public.staff_solicitudes_oficial() x where x.id = s;
  if n <> 1 then raise exception 'P6 FALLA: el staff no ve el pedido en su lista'; end if;
  begin perform public.staff_solicitud_oficial_resolver(s, false, 'no'); raise exception 'P6 FALLA: rechazo sin motivo';
  exception when others then if sqlerrm like 'P6 FALLA%' then raise; end if; end;
  perform public.staff_solicitud_oficial_resolver(s, false, 'Faltan reglas en la descripción');
  select count(*) into n from public.notificaciones where usuario_id = cre and tipo = 'LIGA_OFICIAL' and titulo = 'Tu liga sigue siendo casual';
  if n <> 1 then raise exception 'P6 FALLA: el creador no recibió el rechazo'; end if;
  begin perform public.staff_solicitud_oficial_resolver(s, false, 'Otra vez el motivo'); raise exception 'P6 FALLA: se resolvió dos veces';
  exception when others then if sqlerrm like 'P6 FALLA%' then raise; end if; end;

  -- P7 · tras un rechazo hay que esperar 24 h
  perform set_config('request.jwt.claims', json_build_object('sub', cre, 'role', 'authenticated')::text, true);
  begin perform public.torneo_solicitar_oficial(t1, null); raise exception 'P7 FALLA: se pudo pedir al instante tras el rechazo';
  exception when others then if sqlerrm like 'P7 FALLA%' then raise; end if; end;
  update public.torneo_solicitudes_oficial set resuelto_en = now() - interval '25 hours' where id = s;

  -- P8 · pasadas 24 h sí puede; y puede retirar el pedido y volver a pedir sin esperar
  s := public.torneo_solicitar_oficial(t1, null);
  perform public.torneo_cancelar_solicitud_oficial(t1);
  if (select estado from public.torneo_solicitudes_oficial where id = s) <> 'cancelada' then raise exception 'P8 FALLA: no se retiró'; end if;
  s := public.torneo_solicitar_oficial(t1, null);

  -- P9 · el staff acepta: la liga pasa a la Liga oficial con sus 2 inscritos y el creador recibe el aviso
  perform set_config('request.jwt.claims', json_build_object('sub', adm, 'role', 'authenticated')::text, true);
  eid := public.staff_solicitud_oficial_resolver(s, true, null);
  if eid is null or (select meta ->> 'oficial' from public.torneos_libres where id = t1) is distinct from eid then raise exception 'P9 FALLA: la liga no pasó a oficial'; end if;
  if (select estado from public.torneo_solicitudes_oficial where id = s) <> 'aceptada' then raise exception 'P9 FALLA: el pedido no quedó aceptado'; end if;
  select count(*) into n from public.liga_participantes where edicion_id = eid;
  if n <> 2 then raise exception 'P9 FALLA: pasaron % inscritos (esperaba 2)', n; end if;
  select count(*) into n from public.notificaciones where usuario_id = cre and titulo = '¡Tu liga ya es oficial!';
  if n <> 1 then raise exception 'P9 FALLA: el creador no recibió el aviso de aceptada (%)', n; end if;

  -- P10 · si el staff pulsa «Hacer oficial» directo, el pedido pendiente se marca aceptado solo
  perform set_config('request.jwt.claims', json_build_object('sub', cre, 'role', 'authenticated')::text, true);
  s := public.torneo_solicitar_oficial(t2, null);
  perform set_config('request.jwt.claims', json_build_object('sub', adm, 'role', 'authenticated')::text, true);
  perform public.staff_torneo_hacer_oficial(t2);
  if (select estado from public.torneo_solicitudes_oficial where id = s) <> 'aceptada' then raise exception 'P10 FALLA: el botón directo no cerró el pedido'; end if;

  -- P11 · si la liga se cancela, el pedido pendiente pasa a «cancelada»
  perform set_config('request.jwt.claims', json_build_object('sub', cre, 'role', 'authenticated')::text, true);
  s := public.torneo_solicitar_oficial(t3, null);
  update public.torneos_libres set estado = 'cancelado' where id = t3;
  if (select estado from public.torneo_solicitudes_oficial where id = s) <> 'cancelada' then raise exception 'P11 FALLA: el pedido siguió pendiente'; end if;

  -- P12 · una liga por llaves no se puede pedir
  begin perform public.torneo_solicitar_oficial(t4, null); raise exception 'P12 FALLA: se pidió una liga por llaves';
  exception when others then if sqlerrm like 'P12 FALLA%' then raise; end if; end;

  raise exception 'TODO_OK_REVERTIDO';
end $prueba$;

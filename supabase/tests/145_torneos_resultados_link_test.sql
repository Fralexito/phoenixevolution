-- Prueba de la migración 145 (resultados automáticos con Phoenix Link en torneos). Requiere 097, 123, 143, 144 y 145.
-- Corre en UNA transacción y termina SIEMPRE con un error a propósito: «TODO_OK_REVERTIDO» = todo pasó y no quedó nada guardado;
-- cualquier otro mensaje = la prueba que falló. Usa 1 admin y 2 jugadores existentes. Sin borrados (el conector MCP se cuelga con ellos).
do $prueba$
declare
  adm uuid; cre uuid; otro uuid; dev uuid := gen_random_uuid();
  te bigint; te2 bigint; tl bigint; tg bigint; tc bigint; s bigint; r bigint; j jsonb; n int; v text;
begin
  select id into adm from public.perfiles where rol = 'admin' order by id limit 1;
  select id into cre from public.perfiles where rol = 'jugador' order by id limit 1;
  select id into otro from public.perfiles where rol = 'jugador' and id <> cre order by id limit 1;
  if adm is null or cre is null or otro is null then raise exception 'FALTAN CUENTAS: hacen falta 1 admin y 2 jugadores'; end if;

  -- Torneos de prueba
  insert into public.torneos_libres (creador, nombre, formato, estado) values (cre, 'Prueba 145 llaves', 'eliminacion', 'en_curso') returning id into te;
  insert into public.torneos_libres (creador, nombre, formato, estado) values (cre, 'Prueba 145 llaves 2', 'eliminacion', 'en_curso') returning id into te2;
  insert into public.torneos_libres (creador, nombre, formato, estado) values (cre, 'Prueba 145 casual', 'liguilla', 'en_curso') returning id into tl;
  insert into public.torneos_libres (creador, nombre, formato, estado) values (cre, 'Prueba 145 grupos', 'grupos', 'inscripcion') returning id into tg;
  insert into public.torneos_libres (creador, nombre, formato, estado) values (cre, 'Prueba 145 colina', 'colina', 'inscripcion') returning id into tc;
  insert into public.torneos_libres_inscritos (torneo_id, usuario, nombre) values (te, cre, 'Creador 145'), (te, otro, 'Otro 145');
  insert into public.torneos_libres_partidos (torneo_id, clave, ronda, orden, a_nombre, b_nombre, eliminatoria)
  values (te, 'f1', 'Final', 1, 'Creador 145', 'Otro 145', true), (te2, 'f1', 'Final', 1, 'Creador 145', 'Otro 145', true),
         (tl, 'r1-1', 'Fecha 1', 1, 'Creador 145', 'Otro 145', false);

  -- P1 · un torneo casual (sin premium ni oficial) no acepta resultados de Link
  begin perform public.sistema_torneo_resultado_link(dev, cre, tl, 'r1-1', 1, 0); raise exception 'P1 FALLA: casual aceptó resultado de Link';
  exception when others then if sqlerrm not like 'TORNEO_SIN_PERMISO%' then raise; end if; end;

  -- P2 · premium → permiso automático 'premium'
  insert into public.torneo_premium (torneo_id, comprado_por, gemas_pagadas) values (te, cre, 300), (te2, cre, 300);
  if private.tl_auto(te) is distinct from 'premium' then raise exception 'P2 FALLA: el premium no da permiso'; end if;

  -- P3 · Link ve el partido pendiente, con «mio» para el host que juega
  j := public.sistema_torneo_partidos_link(cre);
  select count(*) into n from jsonb_array_elements(j -> 'partidos') x where (x ->> 'torneo_id')::bigint = te and x ->> 'clave' = 'f1' and (x -> 'a' ->> 'mio')::boolean;
  if n <> 1 then raise exception 'P3 FALLA: Link no ve el partido (%)', j; end if;
  select count(*) into n from jsonb_array_elements(j -> 'partidos') x where (x ->> 'torneo_id')::bigint = tl;
  if n <> 0 then raise exception 'P3 FALLA: Link ve un torneo casual'; end if;

  -- P4 · empate en llaves con penales 4-3 → propuesto con ganador «a»; aviso al organizador
  j := public.sistema_torneo_resultado_link(dev, adm, te, 'f1', 1, 1, 4, 3, null, '{"version_link":"0.3.50"}'::jsonb);
  if j ->> 'estado' <> 'propuesto' then raise exception 'P4 FALLA: %', j; end if;
  select id into r from public.torneo_resultados_link where torneo_id = te and clave = 'f1' and estado = 'propuesto';
  if (select ganador from public.torneo_resultados_link where id = r) is distinct from 'a' then raise exception 'P4 FALLA: ganador por penales mal'; end if;
  select count(*) into n from public.notificaciones where usuario_id = cre and tipo = 'RESULTADO_PROPUESTO' and enlace = 'torneo/?id=' || te || '#res-link';
  if n <> 1 then raise exception 'P4 FALLA: el organizador no recibió el aviso (%)', n; end if;

  -- P5 · el mismo marcador otra vez = repetido; uno distinto = disputa
  j := public.sistema_torneo_resultado_link(dev, adm, te, 'f1', 1, 1, 4, 3);
  if not (j ->> 'repetido')::boolean then raise exception 'P5 FALLA: no detectó repetido'; end if;
  j := public.sistema_torneo_resultado_link(dev, adm, te, 'f1', 2, 0);
  if j ->> 'estado' <> 'disputa' then raise exception 'P5 FALLA: no pasó a disputa'; end if;

  -- P6 · la web ve la propuesta viva (sin sesión, torneo público)
  perform set_config('request.jwt.claims', '{}', true);
  select count(*) into n from public.torneo_resultados_link_de(te);
  if n <> 1 then raise exception 'P6 FALLA: la web no ve la propuesta (%)', n; end if;

  -- P7 · un jugador que no organiza no puede confirmar un premium
  perform set_config('request.jwt.claims', json_build_object('sub', otro, 'role', 'authenticated')::text, true);
  begin perform public.torneo_resultado_link_resolver(r, true); raise exception 'P7 FALLA: confirmó un extraño';
  exception when insufficient_privilege then null; end;

  -- P8 · el organizador confirma: el cuadro queda jugado 2-0 con ganador «a»
  perform set_config('request.jwt.claims', json_build_object('sub', cre, 'role', 'authenticated')::text, true);
  v := public.torneo_resultado_link_resolver(r, true);
  if v is distinct from 'a' then raise exception 'P8 FALLA: ganador %', v; end if;
  if not exists (select 1 from public.torneos_libres_partidos where torneo_id = te and clave = 'f1' and jugado and ga = 2 and gb = 0 and ganador = 'a') then raise exception 'P8 FALLA: el cuadro no cambió'; end if;
  if (select estado from public.torneo_resultados_link where id = r) <> 'confirmado' then raise exception 'P8 FALLA: no quedó confirmado'; end if;

  -- P9 · si el organizador anota a mano, la propuesta pasa a «reemplazado»
  perform public.sistema_torneo_resultado_link(dev, adm, te2, 'f1', 3, 1);
  perform public.torneo_resultado(te2, 'f1', 0, 2);
  if (select estado from public.torneo_resultados_link where torneo_id = te2 and clave = 'f1' order by id desc limit 1) <> 'reemplazado' then raise exception 'P9 FALLA: no se marcó reemplazado'; end if;

  -- P10 · un partido ya jugado no acepta más resultados de Link
  begin perform public.sistema_torneo_resultado_link(dev, adm, te2, 'f1', 1, 0); raise exception 'P10 FALLA: aceptó un partido jugado';
  exception when others then if sqlerrm not like 'YA_JUGADO%' then raise; end if; end;

  -- P11 · pedir oficial en GRUPOS (no liga): el staff acepta → oficial dentro de Torneos
  s := public.torneo_solicitar_oficial(tg, null);
  perform set_config('request.jwt.claims', json_build_object('sub', adm, 'role', 'authenticated')::text, true);
  v := public.staff_solicitud_oficial_resolver(s, true, null);
  if v <> 'oficial' or private.tl_auto(tg) is distinct from 'oficial' then raise exception 'P11 FALLA: no quedó oficial (%)', v; end if;
  if (select estado from public.torneo_solicitudes_oficial where id = s) <> 'aceptada' then raise exception 'P11 FALLA: pedido no aceptado'; end if;
  select count(*) into n from public.notificaciones where usuario_id = cre and titulo = '¡Tu torneo ya es oficial!';
  if n <> 1 then raise exception 'P11 FALLA: sin aviso al creador'; end if;

  -- P12 · en un oficial avisa al staff y confirma el staff (no el organizador)
  update public.torneos_libres set estado = 'en_curso' where id = tg;
  insert into public.torneos_libres_partidos (torneo_id, clave, ronda, grupo, orden, a_nombre, b_nombre, eliminatoria) values (tg, 'g1-1', 'Fecha 1', 'A', 1, 'Creador 145', 'Otro 145', false);
  perform public.sistema_torneo_resultado_link(dev, cre, tg, 'g1-1', 1, 1);
  select id into r from public.torneo_resultados_link where torneo_id = tg and clave = 'g1-1';
  select count(*) into n from public.notificaciones where usuario_id = adm and tipo = 'RESULTADO_PROPUESTO' and enlace = 'torneo/?id=' || tg || '#res-link';
  if n <> 1 then raise exception 'P12 FALLA: el staff no recibió el aviso'; end if;
  perform set_config('request.jwt.claims', json_build_object('sub', cre, 'role', 'authenticated')::text, true);
  begin perform public.torneo_resultado_link_resolver(r, true); raise exception 'P12 FALLA: el organizador confirmó un oficial';
  exception when insufficient_privilege then null; end;
  perform set_config('request.jwt.claims', json_build_object('sub', adm, 'role', 'authenticated')::text, true);
  perform public.torneo_resultado_link_resolver(r, true);
  if not exists (select 1 from public.torneos_libres_partidos where torneo_id = tg and clave = 'g1-1' and jugado and ganador is null) then raise exception 'P12 FALLA: empate de grupos mal guardado'; end if;

  -- P13 · rechazar una propuesta deja el partido sin tocar
  insert into public.torneos_libres_partidos (torneo_id, clave, ronda, grupo, orden, a_nombre, b_nombre, eliminatoria) values (tg, 'g1-2', 'Fecha 1', 'A', 2, 'Otro 145', 'Creador 145', false);
  perform public.sistema_torneo_resultado_link(dev, cre, tg, 'g1-2', 5, 0);
  select id into r from public.torneo_resultados_link where torneo_id = tg and clave = 'g1-2';
  perform public.torneo_resultado_link_resolver(r, false, null, 'El marcador no fue ese');
  if (select estado from public.torneo_resultados_link where id = r) <> 'rechazado' then raise exception 'P13 FALLA: no quedó rechazado'; end if;
  if exists (select 1 from public.torneos_libres_partidos where torneo_id = tg and clave = 'g1-2' and jugado) then raise exception 'P13 FALLA: el rechazo tocó el cuadro'; end if;

  -- P14 · el staff quita el permiso oficial; y un formato no automático no se puede hacer oficial
  perform public.staff_torneo_resultados_auto(tg, false);
  if private.tl_auto(tg) is not null then raise exception 'P14 FALLA: el permiso sigue activo'; end if;
  begin perform public.staff_torneo_resultados_auto(tc, true); raise exception 'P14 FALLA: colina quedó oficial';
  exception when others then if sqlerrm like 'P14 FALLA%' then raise; end if; end;

  -- P15 · la web normal (authenticated) no puede llamar a las funciones de Link
  if has_function_privilege('authenticated', 'public.sistema_torneo_resultado_link(uuid, uuid, bigint, text, int, int, int, int, uuid, jsonb)', 'execute')
     or has_function_privilege('anon', 'public.sistema_torneo_partidos_link(uuid)', 'execute') then raise exception 'P15 FALLA: la web puede llamar a Link'; end if;

  raise exception 'TODO_OK_REVERTIDO';
end $prueba$;

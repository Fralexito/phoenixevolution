-- Prueba de la 125. Corre DESPUÉS de la migración, dentro de la misma transacción, y termina con una excepción
-- «TODO_OK_REVERTIDO» para que NADA quede guardado. Si algo falla, el mensaje dice qué prueba.
do $$
declare
  adm uuid := (select id from public.perfiles where rol = 'admin' order by id limit 1);
  jug uuid := (select id from public.perfiles where rol = 'jugador' order by id limit 1);
  otro uuid := (select id from public.perfiles where rol = 'jugador' order by id offset 1 limit 1);
  disp uuid; disp_otro uuid;
  r jsonb; c1 uuid; c2 uuid; c3 uuid; t text; l public.liga_traspasos; cam public.pes_cambios;
  como_usuario constant text := 'select set_config(''role'', ''authenticated'', true), set_config(''request.jwt.claims'', json_build_object(''sub'', $1::text, ''role'', ''authenticated'')::text, true)';
  como_servidor constant text := 'select set_config(''role'', ''postgres'', true), set_config(''request.jwt.claims'', '''', true)';
begin
  if adm is null or jug is null or otro is null then raise exception 'FALTAN_DATOS (hace falta 1 admin y 2 jugadores)'; end if;
  insert into public.dispositivos_host (usuario, huella_token, nombre) values (jug, 'prueba125-' || gen_random_uuid(), 'PC prueba 125') returning id into disp;
  insert into public.dispositivos_host (usuario, huella_token, nombre) values (otro, 'prueba125-' || gen_random_uuid(), 'PC otro 125') returning id into disp_otro;

  -- 0) Id sintético: estable, en rango, sin distinguir mayúsculas
  if public.pes_id_sintetico('Lamine Yamal') <> public.pes_id_sintetico('  lamine yamal ') then raise exception 'P0 sintetico estable'; end if;
  if public.pes_id_sintetico('Lamine Yamal') not between 90000000 and 99999998 then raise exception 'P0 sintetico rango'; end if;

  -- 1) Un jugador NO puede crear cambios
  execute como_usuario using jug;
  begin perform public.pes_cambio_crear('fichaje', 'base', '{"jugador":"A","desde":"B","hasta":"C"}'); raise exception 'P1 jugador creó cambio';
  exception when others then if sqlerrm not like '%NO_AUTORIZADO%' then raise; end if; end;

  -- 2) Admin: fichaje a la base normal solo con nombres → lote OFICIAL con la huella de Link
  execute como_usuario using adm;
  r := public.pes_cambio_crear('fichaje', 'base', '{"jugador":"Lamine Yamal","desde":"FC Barcelona","hasta":"Arsenal FC"}', 'prueba');
  c1 := (r->>'id')::uuid;
  if r->>'estado_base' <> 'publicado' or r->>'estado_lm' <> 'no_aplica' or (r->>'base_seq') is null then raise exception 'P2 estados %', r; end if;
  execute como_servidor;
  select * into l from public.liga_traspasos where cambio = c1;
  if not found or not l.oficial or l.base_huella <> '' or l.autor <> 'Phoenix (oficial)' then raise exception 'P2 lote oficial'; end if;
  if l.lote <> left(private.pes_sha('oficial|' || c1), 24) then raise exception 'P2 id de lote'; end if;
  t := (l.cambios->0->>'jugador_id') || '|' || (l.cambios->0->>'desde_id') || '|' || (l.cambios->0->>'hasta_id') || '|Lamine Yamal|FC Barcelona|Arsenal FC' || E'\n';
  if l.huella <> encode(extensions.digest(convert_to(t, 'UTF8'), 'sha256'), 'hex') then raise exception 'P2 huella distinta a la de Link'; end if;
  if (l.cambios->0->>'jugador_id')::int <> public.pes_id_sintetico('Lamine Yamal') or (l.cambios->0->>'hasta_id')::int < 90000000 then raise exception 'P2 ids sinteticos'; end if;
  select * into cam from public.pes_cambios where id = c1;
  if cam.firma <> private.pes_firma(cam.id, cam.version, cam.tipo, cam.destino, cam.datos) then raise exception 'P2 firma'; end if;
  if cam.base_lote <> l.lote or cam.base_seq <> l.seq or cam.autor <> adm then raise exception 'P2 enlaces'; end if;

  -- 3) «Las dos»: un solo cambio, base publicada y Liga Máster pendiente; ids reales se respetan; agente libre = desde_id 0
  execute como_usuario using adm;
  r := public.pes_cambio_crear('fichaje', 'ambos', '{"jugador_id":162114,"jugador":"Kai Havertz","desde":"","hasta_id":102,"hasta":"Arsenal FC","lm":{"jugador_id":"57","club_id":3}}');
  c2 := (r->>'id')::uuid;
  if r->>'estado_base' <> 'publicado' or r->>'estado_lm' <> 'pendiente' then raise exception 'P3 estados %', r; end if;
  if (r->'datos'->>'jugador_id')::int <> 162114 or (r->'datos'->>'desde_id')::int <> 0 or (r->'datos'->'lm'->>'jugador_id')::int <> 57 then raise exception 'P3 datos %', r->'datos'; end if;
  execute como_servidor;
  if (select count(*) from public.pes_cambios where id = c2) <> 1 then raise exception 'P3 un solo registro'; end if;

  -- 4) Solo Liga Máster: no hay lote en el canal de traspasos
  execute como_usuario using adm;
  r := public.pes_cambio_crear('fichaje', 'lm', '{"jugador":"Pedri","desde":"FC Barcelona","hasta":"Real Madrid"}');
  c3 := (r->>'id')::uuid;
  if r->>'estado_base' <> 'no_aplica' or r->>'estado_lm' <> 'pendiente' then raise exception 'P4 estados'; end if;
  execute como_servidor;
  if exists (select 1 from public.liga_traspasos where cambio = c3) then raise exception 'P4 lote de mas'; end if;

  -- 5) Tipos y destinos: apagado / destino no permitido / datos malos
  execute como_usuario using adm;
  begin perform public.pes_cambio_crear('stats', 'base', '{"x":1}'); raise exception 'P5 tipo apagado aceptado';
  exception when others then if sqlerrm not like '%TIPO_NO_VALIDO%' then raise; end if; end;
  execute como_servidor; update public.pes_tipos_cambio set activo = true where tipo = 'dinero'; execute como_usuario using adm;
  begin perform public.pes_cambio_crear('dinero', 'base', '{"club_id":1,"monto":5}'); raise exception 'P5 destino no permitido aceptado';
  exception when others then if sqlerrm not like '%DESTINO_NO_PERMITIDO%' then raise; end if; end;
  r := public.pes_cambio_crear('dinero', 'lm', '{"club_id":1,"monto":5}');
  if r->>'estado_base' <> 'no_aplica' or r->>'estado_lm' <> 'pendiente' then raise exception 'P5 tipo de otro motor'; end if;
  begin perform public.pes_cambio_crear('fichaje', 'base', '{"jugador":"X","desde":"Arsenal FC","hasta":"arsenal fc"}'); raise exception 'P5 mismo equipo';
  exception when others then if sqlerrm not like '%DATOS_NO_VALIDOS:mismo_equipo%' then raise; end if; end;
  begin perform public.pes_cambio_crear('fichaje', 'base', jsonb_build_object('jugador', repeat('Ñ', 25), 'desde', 'A', 'hasta', 'B')); raise exception 'P5 nombre de 50 bytes';
  exception when others then if sqlerrm not like '%DATOS_NO_VALIDOS:jugador%' then raise; end if; end;
  begin perform public.pes_cambio_crear('fichaje', 'xx', '{"jugador":"A","desde":"B","hasta":"C"}'); raise exception 'P5 destino raro';
  exception when others then if sqlerrm not like '%DESTINO_NO_PERMITIDO%' then raise; end if; end;

  -- 6) Informe de un PC: alta, resultado, repetido (no duplica), desconocido (ignorado), cambio de resultado, cambio de versión
  execute como_servidor;
  r := public.pes_registrar_informe(disp, jug, jsonb_build_object('link_version', '0.3.17', 'link_build', 317, 'parche', 'ConmeGOL 26', 'base_huella', 'a1b2c3d4e5f6',
         'juego', true, 'resultados', jsonb_build_array(jsonb_build_object('cambio_id', c1, 'destino', 'base', 'resultado', 'aplicado', 'jugadores', 1, 'cuando', now()))));
  if (r->>'guardados')::int <> 1 or (r->>'ignorados')::int <> 0 then raise exception 'P6 alta %', r; end if;
  if (select count(*) from public.pes_eventos where dispositivo = disp and tipo = 'contacto') <> 1 then raise exception 'P6 contacto inicial'; end if;
  r := public.pes_registrar_informe(disp, jug, jsonb_build_object('link_version', '0.3.17', 'parche', 'ConmeGOL 26', 'base_huella', 'a1b2c3d4e5f6',
         'resultados', jsonb_build_array(jsonb_build_object('cambio_id', c1, 'destino', 'base', 'resultado', 'aplicado'),
                                         jsonb_build_object('cambio_id', gen_random_uuid(), 'destino', 'base', 'resultado', 'aplicado'),
                                         jsonb_build_object('cambio_id', c1, 'destino', 'raro', 'resultado', 'aplicado'), '"basura"'::jsonb)));
  if (r->>'guardados')::int <> 0 or (r->>'ignorados')::int <> 3 then raise exception 'P6 repetido/ignorados %', r; end if;
  if (select count(*) from public.pes_eventos where dispositivo = disp and tipo = 'contacto') <> 1 then raise exception 'P6 contacto repetido sin cambios'; end if;
  r := public.pes_registrar_informe(disp, jug, jsonb_build_object('link_version', '0.3.18', 'parche', 'ConmeGOL 26', 'base_huella', 'a1b2c3d4e5f6',
         'resultados', jsonb_build_array(jsonb_build_object('cambio_id', c1, 'destino', 'base', 'resultado', 'saltado', 'motivo', 'No encontré a «Lamine Yamal»'))));
  if (r->>'guardados')::int <> 1 then raise exception 'P6 cambio de resultado'; end if;
  if (select count(*) from public.pes_eventos where dispositivo = disp and tipo = 'contacto') <> 2 then raise exception 'P6 contacto al subir version'; end if;
  if (select aplicados || '/' || saltados || '/' || informes || '/' || link_version from public.pes_pcs where dispositivo = disp) <> '1/1/3/0.3.18' then raise exception 'P6 contadores'; end if;
  begin perform public.pes_registrar_informe(disp_otro, jug, '{}'); raise exception 'P6 dispositivo ajeno aceptado';
  exception when others then if sqlerrm not like '%DISPOSITIVO_NO_VALIDO%' then raise; end if; end;
  perform public.pes_registrar_informe(disp_otro, otro, '{"link_version":"0.3.16"}');

  -- 7) RLS: el jugador ve SOLO lo suyo y nada de los cambios; el staff ve todo
  execute como_usuario using jug;
  if (select count(*) from public.pes_cambios) <> 0 then raise exception 'P7 jugador ve cambios'; end if;
  if (select count(*) from public.pes_pcs) <> (select count(*) from public.pes_pcs where usuario = jug) then raise exception 'P7 jugador ve PCs ajenas'; end if;
  if exists (select 1 from public.pes_eventos where usuario <> jug) then raise exception 'P7 jugador ve eventos ajenos'; end if;
  if jsonb_array_length(public.pes_pcs_lista()) < 1 or exists (select 1 from jsonb_array_elements(public.pes_pcs_lista()) e where (e->>'usuario')::uuid <> jug) then raise exception 'P7 lista del jugador'; end if;
  if jsonb_array_length(public.pes_pc_historial(disp_otro)) <> 0 then raise exception 'P7 historial ajeno visible'; end if;
  if jsonb_array_length(public.pes_pc_historial(disp)) < 3 then raise exception 'P7 historial propio'; end if;
  begin perform public.pes_cambios_historial(); raise exception 'P7 jugador vio historial';
  exception when others then if sqlerrm not like '%NO_AUTORIZADO%' then raise; end if; end;
  begin insert into public.pes_cambios (tipo, destino, datos, firma, estado_base, estado_lm) values ('fichaje', 'base', '{}', repeat('a', 64), 'pendiente', 'no_aplica'); raise exception 'P7 insert directo';
  exception when insufficient_privilege then null; end;
  execute como_usuario using adm;
  if (select count(*) from public.pes_pcs where dispositivo in (disp, disp_otro)) <> 2 then raise exception 'P7 staff no ve PCs'; end if;
  r := public.pes_cambios_historial(10);
  if (select (e->'resultados'->>'base:saltado')::int from jsonb_array_elements(r) e where (e->>'id')::uuid = c1) is distinct from 1 then raise exception 'P7 resumen de resultados %', r->0; end if;
  if exists (select 1 from jsonb_array_elements(r) e where e ? 'firma') then raise exception 'P7 historial enseña firma'; end if;

  -- 8) Marcar la parte de un motor
  r := public.pes_cambio_marcar(c2, 'lm', 'tomado', 'lm-v1');
  execute como_servidor;
  if (select estado_lm || '|' || lm_ref from public.pes_cambios where id = c2) <> 'tomado|lm-v1' then raise exception 'P8 marcar lm'; end if;
  perform public.pes_cambio_marcar(c2, 'lm', 'publicado', null);   -- el servidor (SQL Editor / service role) también puede
  begin perform public.pes_cambio_marcar(c1, 'lm', 'tomado'); raise exception 'P8 marcó lm en un cambio solo base';
  exception when others then if sqlerrm not like '%CAMBIO_NO_ENCONTRADO%' then raise; end if; end;
  execute como_usuario using jug;
  begin perform public.pes_cambio_marcar(c2, 'lm', 'error'); raise exception 'P8 jugador marcó';
  exception when others then if sqlerrm not like '%NO_AUTORIZADO%' then raise; end if; end;

  -- 9) Anular: el lote oficial sale del canal; el cambio queda en el historial
  execute como_usuario using adm;
  r := public.pes_cambio_anular(c1, 'me equivoqué');
  if (r->>'lotes_retirados')::int <> 1 then raise exception 'P9 lote no retirado'; end if;
  execute como_servidor;
  if (select estado from public.pes_cambios where id = c1) <> 'anulado' then raise exception 'P9 estado'; end if;
  execute como_usuario using adm;
  begin perform public.pes_cambio_anular(c1); raise exception 'P9 anular dos veces';
  exception when others then if sqlerrm not like '%CAMBIO_NO_ENCONTRADO%' then raise; end if; end;

  raise exception 'TODO_OK_REVERTIDO';
end $$;

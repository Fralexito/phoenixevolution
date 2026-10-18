-- Prueba de la 128. Corre DESPUÉS de la migración y termina con una excepción «TODO_OK_REVERTIDO» para que NADA quede guardado.
-- Si algo falla, el mensaje dice qué prueba. Usa versiones 900.x.x para no chocar con las reales.
do $$
declare
  adm uuid := (select id from public.perfiles where rol = 'admin' order by id limit 1);
  jug uuid := (select id from public.perfiles where rol = 'jugador' order by id limit 1);
  disp uuid; j jsonb; v1 bigint; v2 bigint; v3 bigint; v4 bigint; n int;
  como_usuario constant text := 'select set_config(''role'', ''authenticated'', true), set_config(''request.jwt.claims'', json_build_object(''sub'', $1::text, ''role'', ''authenticated'')::text, true)';
  como_servidor constant text := 'select set_config(''role'', ''service_role'', true)';
begin
  if adm is null or jug is null then raise exception 'FALTAN_DATOS'; end if;
  insert into public.dispositivos_host (usuario, huella_token, nombre) values (jug, 'prueba128-' || gen_random_uuid(), 'PC prueba 128') returning id into disp;

  -- 1) Registrar: solo admin; queda NO publicada y NO subida
  execute como_servidor;
  begin perform public.sistema_link_version_registrar(jug, '900.0.1', 'beta 2', repeat('a', 64), 1000, 'x', false); raise exception 'P1 jugador registró';
  exception when others then if sqlerrm not like '%NO_AUTORIZADO%' then raise; end if; end;
  v1 := (public.sistema_link_version_registrar(adm, '900.0.1', 'beta 2', repeat('a', 64), 1000, 'Arreglos', false)->>'id')::bigint;
  if (select publicada or subida from public.link_versiones where id = v1) then raise exception 'P1 nació publicada o subida'; end if;
  if (select archivo from public.link_versiones where id = v1) <> 'v900.0.1/PhoenixLink-900.0.1.zip' then raise exception 'P1 ruta'; end if;
  begin perform public.sistema_link_version_registrar(adm, '900.1', '', repeat('a', 64), 1000, '', false); raise exception 'P1 versión mal escrita aceptada';
  exception when check_violation then null; end;
  begin perform public.sistema_link_version_registrar(adm, '900.0.9', '', 'ABC', 1000, '', false); raise exception 'P1 sha malo aceptado';
  exception when check_violation then null; end;

  -- 2) No se ve hasta estar subida y publicada
  j := public.sistema_link_ultima(disp, jug, '900.0.0');   if j is not null then raise exception 'P2 se ve sin publicar'; end if;
  execute como_usuario using adm;
  begin perform public.link_version_publicar(v1, true); raise exception 'P2 publicó sin zip';
  exception when others then if sqlerrm not like '%ZIP_NO_SUBIDO%' then raise; end if; end;
  execute como_servidor;
  perform public.sistema_link_version_subida(adm, v1);
  execute como_usuario using adm;
  perform public.link_version_publicar(v1, true);
  execute como_servidor;
  j := public.sistema_link_ultima(disp, jug, '900.0.0');
  if j->>'version' <> '900.0.1' or (j->>'obligatoria')::boolean then raise exception 'P2 última %', j; end if;
  if (select version from public.link_instalaciones where dispositivo = disp) <> '900.0.0' then raise exception 'P2 no anotó la versión de la PC'; end if;
  j := public.sistema_link_ultima(disp, jug, '900.0.1');   if j is not null then raise exception 'P2 ofrece la misma versión'; end if;

  -- 3) Orden numérico (900.0.10 > 900.0.9) y obligatoria «arrastrada»
  v2 := (public.sistema_link_version_registrar(adm, '900.0.9', '', repeat('b', 64), 1000, 'Obligatoria', true)->>'id')::bigint;
  v3 := (public.sistema_link_version_registrar(adm, '900.0.10', '', repeat('c', 64), 1000, 'Normal', false)->>'id')::bigint;
  perform public.sistema_link_version_subida(adm, v2); perform public.sistema_link_version_subida(adm, v3);
  execute como_usuario using adm;
  perform public.link_version_publicar(v2, true); perform public.link_version_publicar(v3, true);
  execute como_servidor;
  j := public.sistema_link_ultima(disp, jug, '900.0.1');
  if j->>'version' <> '900.0.10' then raise exception 'P3 orden numérico: %', j->>'version'; end if;
  if not (j->>'obligatoria')::boolean then raise exception 'P3 no arrastró la obligatoria 900.0.9'; end if;
  j := public.sistema_link_ultima(disp, jug, '900.0.9');
  if j->>'version' <> '900.0.10' or (j->>'obligatoria')::boolean then raise exception 'P3 desde 900.0.9 %', j; end if;

  -- 4) Retirar: deja de ofrecerse; publicada no se puede volver a subir
  execute como_usuario using adm;
  perform public.link_version_publicar(v3, false);
  execute como_servidor;
  j := public.sistema_link_ultima(disp, jug, '900.0.9');   if j is not null then raise exception 'P4 retirada sigue ofreciéndose'; end if;
  begin perform public.sistema_link_version_registrar(adm, '900.0.9', '', repeat('d', 64), 1000, '', false); raise exception 'P4 re-subió una publicada';
  exception when others then if sqlerrm not like '%VERSION_YA_PUBLICADA%' then raise; end if; end;
  -- re-subir una NO publicada sí (se cortó el envío): vuelve a «no subida»
  v4 := (public.sistema_link_version_registrar(adm, '900.0.10', '', repeat('e', 64), 2000, 'Otra vez', false)->>'id')::bigint;
  if v4 <> v3 or (select subida from public.link_versiones where id = v3) then raise exception 'P4 re-subida'; end if;

  -- 5) Informe de la PC
  perform public.sistema_link_informe(disp, jug, '900.0.9', 'restaurada', 'No arrancó: volvió a la anterior');
  if (select intento_estado from public.link_instalaciones where dispositivo = disp) <> 'restaurada' then raise exception 'P5 informe'; end if;
  begin perform public.sistema_link_informe(disp, jug, '900.0.9', 'inventado', ''); raise exception 'P5 estado inválido aceptado';
  exception when check_violation then null; end;

  -- 6) Permisos: el jugador no ve versiones, no publica, no abre el panel; sí ve su PC
  execute como_usuario using jug;
  select count(*) into n from public.link_versiones;       if n <> 0 then raise exception 'P6 jugador ve versiones'; end if;
  select count(*) into n from public.link_instalaciones where dispositivo = disp;   if n <> 1 then raise exception 'P6 jugador no ve su PC'; end if;
  begin perform public.link_version_publicar(v1, false); raise exception 'P6 jugador publicó';
  exception when others then if sqlerrm not like '%NO_AUTORIZADO%' then raise; end if; end;
  begin perform public.link_versiones_panel(); raise exception 'P6 jugador abrió el panel';
  exception when others then if sqlerrm not like '%NO_AUTORIZADO%' then raise; end if; end;
  begin insert into public.link_versiones (version, archivo, sha256, tamano) values ('900.9.9', 'v900.9.9/PhoenixLink-900.9.9.zip', repeat('f', 64), 1); raise exception 'P6 jugador insertó';
  exception when insufficient_privilege then null; end;
  begin perform public.sistema_link_ultima(disp, jug, '900.0.0'); raise exception 'P6 jugador llamó a función del servidor';
  exception when insufficient_privilege then null; end;

  -- 7) Panel del admin: versiones con su conteo de PCs
  execute como_usuario using adm;
  j := public.link_versiones_panel();
  if not (j->>'es_admin')::boolean then raise exception 'P7 es_admin'; end if;
  if (select count(*) from jsonb_array_elements(j->'versiones') e where e->>'version' like '900.0.%') <> 3 then raise exception 'P7 versiones'; end if;
  if not exists (select 1 from jsonb_array_elements(j->'pcs') e where (e->>'dispositivo')::uuid = disp and e->>'intento_estado' = 'restaurada') then raise exception 'P7 pcs'; end if;
  perform public.link_version_obligatoria(v1, true); perform public.link_version_notas(v1, 'Notas nuevas');
  if (select not obligatoria or notas <> 'Notas nuevas' from public.link_versiones where id = v1) then raise exception 'P7 editar'; end if;

  raise exception 'TODO_OK_REVERTIDO';
end $$;

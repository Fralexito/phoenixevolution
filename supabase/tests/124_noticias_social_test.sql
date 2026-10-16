-- Prueba de la 124. Corre DESPUÉS de la migración, dentro de la misma transacción, y termina con una excepción
-- «TODO_OK_REVERTIDO» para que NADA quede guardado. Si algo falla, el mensaje dice qué prueba.
do $$
declare
  adm uuid := (select id from public.perfiles where rol = 'admin' order by id limit 1);
  jug uuid := (select id from public.perfiles where rol = 'jugador' order by id limit 1);
  nid uuid := (select id from public.noticias where publicada order by publicada_en desc limit 1);
  r text; s jsonb; enc bigint; com bigint; prop bigint; ok boolean;
  como_usuario constant text := 'select set_config(''role'', ''authenticated'', true), set_config(''request.jwt.claims'', json_build_object(''sub'', $1::text, ''role'', ''authenticated'')::text, true)';
begin
  if adm is null or jug is null or nid is null then raise exception 'FALTAN_DATOS'; end if;

  -- 1) Reacciones: poner, cambiar, quitar
  execute como_usuario using jug;
  r := public.noticia_reaccionar(nid, 'fuego');      if r <> 'fuego' then raise exception 'P1 poner'; end if;
  r := public.noticia_reaccionar(nid, 'risa');       if r <> 'risa' then raise exception 'P1 cambiar'; end if;
  s := public.noticia_social(nid);                   if s->>'mi_reaccion' <> 'risa' or (s->'reacciones'->>'risa')::int < 1 then raise exception 'P1 leer'; end if;
  r := public.noticia_reaccionar(nid, 'risa');       if r is not null then raise exception 'P1 quitar'; end if;
  begin perform public.noticia_reaccionar(nid, 'pulgar'); raise exception 'P1 tipo invalido aceptado';
  exception when check_violation then null; end;

  -- 2) Encuesta: el jugador no puede crearla; el admin sí
  begin perform public.noticia_encuesta_guardar(nid, '¿Quién gana?', '["A","B"]', true); raise exception 'P2 jugador creó encuesta';
  exception when others then if sqlerrm not like '%NO_AUTORIZADO%' then raise; end if; end;
  execute como_usuario using adm;
  enc := public.noticia_encuesta_guardar(nid, '¿Quién gana la fecha 12?', '["Victor","Beto"," ","Degox"]', true);
  s := public.noticia_social(nid);
  if jsonb_array_length(s->'encuesta'->'opciones') <> 3 then raise exception 'P2 opciones vacías no se limpiaron'; end if;

  -- 3) Votar: sin ver % antes, una sola vez, opción válida
  execute como_usuario using jug;
  s := public.noticia_social(nid);                   if s->'encuesta'->'votos' <> 'null'::jsonb then raise exception 'P3 porcentajes visibles antes de votar'; end if;
  begin perform public.noticia_votar(enc, 7::smallint); raise exception 'P3 opción inválida aceptada';
  exception when others then if sqlerrm not like '%opción válida%' then raise; end if; end;
  perform public.noticia_votar(enc, 1::smallint);
  s := public.noticia_social(nid);                   if (s->'encuesta'->'votos'->>1)::int < 1 or (s->'encuesta'->>'mi_voto')::int <> 1 then raise exception 'P3 conteo'; end if;
  begin perform public.noticia_votar(enc, 0::smallint); raise exception 'P3 votó dos veces';
  exception when others then if sqlerrm not like '%Ya votaste%' then raise; end if; end;
  -- con votos, el admin ya no puede cambiar las opciones
  execute como_usuario using adm;
  begin perform public.noticia_encuesta_guardar(nid, '¿Otra pregunta?', '["X","Y"]', true); raise exception 'P3 cambió opciones con votos';
  exception when others then if sqlerrm not like '%Ya tiene votos%' then raise; end if; end;

  -- 4) Comentarios: comentar, otro no lo borra, el moderador sí, desaparece de la lista
  execute como_usuario using jug;
  com := public.noticia_comentar(nid, '  ¡Golazo!  ');
  s := public.noticia_social(nid);                   if s->'comentarios'->0->>'texto' <> '¡Golazo!' or not (s->'comentarios'->0->>'mio')::boolean then raise exception 'P4 comentar'; end if;
  begin perform public.noticia_comentar(nid, '   '); raise exception 'P4 comentario vacío aceptado';
  exception when others then if sqlerrm not like '%Escribe algo%' then raise; end if; end;
  execute como_usuario using adm;
  if not exists (select 1 from public.noticias_comentarios_recientes(10) x where x.id = com) then raise exception 'P4 no sale en moderación'; end if;
  perform public.noticia_borrar_comentario(com);
  s := public.noticia_social(nid);
  if exists (select 1 from jsonb_array_elements(s->'comentarios') e where (e->>'id')::bigint = com) then raise exception 'P4 sigue visible'; end if;

  -- 5) Encuesta propuesta por la IA (la IA entra sin sesión de usuario): llega apagada y se enciende al aprobar
  perform set_config('role', 'postgres', true); perform set_config('request.jwt.claims', '', true);
  delete from public.noticias_encuestas where noticia_id = nid;
  insert into public.noticias_encuestas (noticia_id, pregunta, opciones, activa, origen) values (nid, '¿Vuelven los goles?', '["Sí","No"]', false, 'ia') returning id into enc;
  insert into public.ia_propuestas (tipo, titulo, encuesta_id) values ('encuesta', 'Encuesta para la previa', enc) returning id into prop;
  execute como_usuario using jug;
  s := public.noticia_social(nid);                   if s->'encuesta' <> 'null'::jsonb then raise exception 'P5 encuesta apagada visible al jugador'; end if;
  execute como_usuario using adm;
  perform public.ia_revisar(prop, true, null);
  perform set_config('role', 'postgres', true);
  select activa into ok from public.noticias_encuestas where id = enc; if not ok then raise exception 'P5 no se encendió al aprobar'; end if;
  raise exception 'TODO_OK_REVERTIDO';
end $$;

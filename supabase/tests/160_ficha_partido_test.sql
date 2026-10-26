-- Prueba en seco de la 160 (TODO_OK_REVERTIDO = todo bien, nada guardado). Ejecutada el 25-oct-2026 en la base real: OK (2 bloques).
-- Bloque 1: ficha_limpia quita claves raras, objetos y textos largos · ficha_revisar marca solo lo distinto (duración 10≠8, prórroga 0≠sí)
--   y nada si no hay reglas o coinciden · reglas_partido_validas · un jugador no fija reglas, el admin sí (y no con valores malos) ·
--   sistema_ficha_liga lee el último partida_fin de la sala (anadido 3, 2 diferencias) · liga_vivo rechaza anadido 40.
-- Bloque 2: ficha_de_duelo de una sala atada a un duelo → ficha limpia, anadido 2, duración 700 s; duelo inexistente → null.
do $$
declare f jsonb; r jsonb; ed text; pid bigint; jug uuid; adm uuid; s uuid; x jsonb;
begin
  f := private.ficha_limpia(('{"estadio":12,"clima":1,"hora":1,"estacion":0,"duracion":10,"dificultad":4,"prorroga":0,"penales":1,"cambios":5,"zona":"EXHIBITION","malo":"x","obj":{"a":1},"estadio_nombre":"' || repeat('x',70) || '"}')::jsonb);
  if f ? 'malo' or f ? 'obj' or f ? 'estadio_nombre' or (f->>'estadio')::int <> 12 then raise exception 'limpia mal: %', f; end if;
  if private.ficha_limpia('{"malo":1}') is not null or private.ficha_limpia('[1]') is not null then raise exception 'vacia no null'; end if;
  r := private.ficha_revisar('{"duracion":8,"prorroga":true,"penales":true}', f);
  if jsonb_array_length(r) <> 2 or r->0->>'campo' <> 'duracion' or r->1->>'campo' <> 'prorroga' then raise exception 'revisar mal: %', r; end if;
  if jsonb_array_length(private.ficha_revisar('{}', f)) <> 0 then raise exception 'sin reglas debe ser vacio'; end if;
  if jsonb_array_length(private.ficha_revisar('{"duracion":10,"dificultad":4}', f)) <> 0 then raise exception 'iguales debe ser vacio'; end if;
  if private.reglas_partido_validas('{"duracion":"10"}') or private.reglas_partido_validas('{"otra":1}') or private.reglas_partido_validas('{"duracion":0}')
     or not private.reglas_partido_validas('{"duracion":10,"prorroga":false,"cambios":5}') then raise exception 'validas mal'; end if;
  select id into jug from public.perfiles where id::text like '7f1abba3%';
  select id into adm from public.perfiles where id::text like '9c910092%';
  select p.id, p.edicion_id into pid, ed from public.liga_partidos p limit 1;
  perform set_config('request.jwt.claims', json_build_object('sub', jug, 'role', 'authenticated')::text, true);
  begin perform public.staff_liga_reglas_partido(ed, '{"duracion":10}'); raise exception 'NO_STAFF_PASO';
  exception when others then if sqlerrm = 'NO_STAFF_PASO' then raise; end if; end;
  perform set_config('request.jwt.claims', json_build_object('sub', adm, 'role', 'authenticated')::text, true);
  begin perform public.staff_liga_reglas_partido(ed, '{"duracion":"x"}'); raise exception 'MALA_PASO';
  exception when others then if sqlerrm = 'MALA_PASO' then raise; end if; end;
  perform public.staff_liga_reglas_partido(ed, '{"duracion":8,"prorroga":true}');
  select sala_id into s from public.eventos_sala where tipo='partida_fin' limit 1;
  insert into public.eventos_sala (sala_id, tipo, datos, ocurrido, clave_idempotencia)
  values (s, 'partida_fin', jsonb_build_object('cierre','completo','ficha', f || '{"malo":1}', 'juego', '{"anadido":3,"penales_a":4,"penales_b":3}'::jsonb), now(), 'prueba160-' || gen_random_uuid());
  x := public.sistema_ficha_liga(s, pid);
  if (x->>'anadido')::int <> 3 or x->'ficha' ? 'malo' or jsonb_array_length(x->'revisar') <> 2 then raise exception 'sistema mal: %', x; end if;
  if public.sistema_ficha_liga(gen_random_uuid(), pid)->'ficha' <> 'null'::jsonb then raise exception 'sala vacia mal'; end if;
  begin insert into public.liga_vivo (sala_id, anadido) values (s, 40); raise exception 'ANADIDO_PASO';
  exception when others then if sqlerrm = 'ANADIDO_PASO' then raise; end if; end;
  raise exception 'TODO_OK_REVERTIDO';
end $$;

do $$
declare s uuid; rt int; x jsonb;
begin
  select id into s from public.salas order by abierta_en desc limit 1;
  select id into rt from public.retos_matchmaking order by id desc limit 1;
  update public.salas set reto_id = rt where id = s;
  insert into public.eventos_sala (sala_id, tipo, datos, ocurrido, clave_idempotencia)
  values (s, 'partida_fin', '{"cierre":"completo","ficha":{"clima":1,"hora":1,"x":2},"juego":{"anadido":2,"penales_a":0,"penales_b":0},"duracion_seg":700}', now(), 'prueba160b-' || gen_random_uuid());
  perform set_config('request.jwt.claims', '', true);
  x := public.ficha_de_duelo(rt);
  if private.puedo_ver_duelo(rt, null) then
    if x is null or (x->>'anadido')::int <> 2 or x->'ficha' ? 'x' or (x->>'duracion_seg')::int <> 700 then raise exception 'mal %', x; end if;
  end if;
  if public.ficha_de_duelo(-5) is not null then raise exception 'inexistente'; end if;
  raise exception 'TODO_OK_REVERTIDO %', x;
end $$;

-- Prueba de la 126. Corre DESPUÉS de la 125 y la 126, dentro de la misma transacción, y termina con una excepción
-- «TODO_OK_REVERTIDO» para que NADA quede guardado. Si algo falla, el mensaje dice qué prueba.
do $$
declare
  adm uuid := (select id from public.perfiles where rol = 'admin' order by id limit 1);
  jug uuid := (select id from public.perfiles where rol = 'jugador' order by id limit 1);
  disp uuid; dueno uuid;
  r jsonb; c1 jsonb; c2 jsonb; c3 jsonb; u jsonb; x public.pes_cambios;
  como_usuario constant text := 'select set_config(''role'', ''authenticated'', true), set_config(''request.jwt.claims'', json_build_object(''sub'', $1::text, ''role'', ''authenticated'')::text, true)';
begin
  if adm is null or jug is null then raise exception 'FALTAN_DATOS'; end if;
  if (select count(*) from public.pes_fichas_campos) <> 46 then raise exception 'P0 catálogo: no son 46 campos'; end if;
  if not (select activo from public.pes_tipos_cambio where tipo = 'stats') or not (select activo from public.pes_tipos_cambio where tipo = 'info') then raise exception 'P0 tipos apagados'; end if;

  -- 1) Un jugador normal no puede crear ni leer
  execute como_usuario using jug;
  begin perform public.pes_cambio_crear('stats', 'base', '{"jugador_id":162114,"jugador":"Lamine Yamal","valores":{"velocidad":95}}'); raise exception 'P1 jugador creó';
  exception when others then if sqlerrm not like '%NO_AUTORIZADO%' then raise; end if; end;
  begin perform public.pes_fichas_historial(); raise exception 'P1 jugador leyó historial';
  exception when others then if sqlerrm not like '%NO_AUTORIZADO%' then raise; end if; end;
  if not exists (select 1 from public.pes_fichas_campos) then raise exception 'P1 catálogo no visible'; end if;

  -- 2) Crear: base queda publicado al instante; ambos deja LM pendiente
  execute como_usuario using adm;
  c1 := public.pes_cambio_crear('stats', 'base', '{"jugador_id":162114,"jugador":"Lamine Yamal","valores":{"velocidad":85,"finalizacion":88}}', 'prueba 126');
  select * into x from public.pes_cambios where id = (c1->>'id')::uuid;
  if x.estado_base <> 'publicado' or x.base_ref <> 'v1/cambios' or x.estado_lm <> 'no_aplica' then raise exception 'P2 estados base: % %', x.estado_base, x.estado_lm; end if;
  c3 := public.pes_cambio_crear('info', 'ambos', '{"jugador":"Lamine Yamal","valores":{"pos_dc":2,"altura":181,"pie_malo_uso":4}}');
  select * into x from public.pes_cambios where id = (c3->>'id')::uuid;
  if x.estado_base <> 'publicado' or x.estado_lm <> 'pendiente' then raise exception 'P2 estados ambos'; end if;

  -- 3) Datos malos: campo de otro tipo, fuera de rango, decimal, clave rara, sin jugador, sin valores, id en texto
  begin perform public.pes_cambio_crear('stats', 'base', '{"jugador":"X","valores":{"pos_dc":2}}'); raise exception 'P3 campo info en stats';
  exception when others then if sqlerrm not like '%DATOS_NO_VALIDOS:campo%' then raise; end if; end;
  begin perform public.pes_cambio_crear('stats', 'base', '{"jugador":"X","valores":{"velocidad":100}}'); raise exception 'P3 rango';
  exception when others then if sqlerrm not like '%DATOS_NO_VALIDOS:valor%' then raise; end if; end;
  begin perform public.pes_cambio_crear('info', 'base', '{"jugador":"X","valores":{"altura":181.5}}'); raise exception 'P3 decimal';
  exception when others then if sqlerrm not like '%DATOS_NO_VALIDOS:valor%' then raise; end if; end;
  begin perform public.pes_cambio_crear('stats', 'base', '{"jugador":"X","valores":{"velocidad":90},"hack":1}'); raise exception 'P3 clave rara';
  exception when others then if sqlerrm not like '%DATOS_NO_VALIDOS%' then raise; end if; end;
  begin perform public.pes_cambio_crear('stats', 'base', '{"valores":{"velocidad":90}}'); raise exception 'P3 sin jugador';
  exception when others then if sqlerrm not like '%DATOS_NO_VALIDOS:jugador%' then raise; end if; end;
  begin perform public.pes_cambio_crear('stats', 'base', '{"jugador":"X","valores":{}}'); raise exception 'P3 sin valores';
  exception when others then if sqlerrm not like '%DATOS_NO_VALIDOS:valores_vacios%' then raise; end if; end;
  begin perform public.pes_cambio_crear('stats', 'base', '{"jugador_id":"162114","jugador":"X","valores":{"velocidad":90}}'); raise exception 'P3 id texto';
  exception when others then if sqlerrm not like '%DATOS_NO_VALIDOS:jugador_id%' then raise; end if; end;

  -- 4) Vigente: el segundo cambio pisa al primero (en base)
  c2 := public.pes_cambio_crear('stats', 'base', '{"jugador_id":162114,"jugador":"Lamine Yamal","valores":{"velocidad":95},"antes":{"velocidad":85}}');
  r := public.pes_fichas_vigentes(162114, null);
  if (r->'base'->'velocidad'->>'valor')::int <> 95 or (r->'base'->'finalizacion'->>'valor')::int <> 88 then raise exception 'P4 vigente %', r; end if;
  if (r->'base'->'altura'->>'valor')::int <> 181 or (r->'lm'->'altura'->>'valor')::int <> 181 or r->'lm' ? 'velocidad' then raise exception 'P4 lados %', r; end if;
  r := public.pes_fichas_vigentes(null, '  lamine yamal ');
  if (r->'base'->'velocidad'->>'valor')::int <> 95 then raise exception 'P4 por nombre'; end if;

  -- 5) Deshacer el segundo: vuelve a 85, el original queda anulado
  u := public.pes_fichas_deshacer((c2->>'id')::uuid);
  if (u->'datos'->'valores'->>'velocidad')::int <> 85 or (u->'datos'->'antes'->>'velocidad')::int <> 95 or u->'datos'->>'deshace' <> c2->>'id' then raise exception 'P5 datos %', u; end if;
  if (select estado from public.pes_cambios where id = (c2->>'id')::uuid) <> 'anulado' then raise exception 'P5 original no anulado'; end if;
  r := public.pes_fichas_vigentes(162114, null);
  if (r->'base'->'velocidad'->>'valor')::int <> 85 then raise exception 'P5 vigente %', r; end if;
  begin perform public.pes_fichas_deshacer((c2->>'id')::uuid); raise exception 'P5 deshacer dos veces';
  exception when others then if sqlerrm not like '%YA_DESHECHO%' then raise; end if; end;

  -- 6) Deshacer sin cambio anterior: el valor vuelve al de la base (null)
  u := public.pes_fichas_deshacer((c3->>'id')::uuid);
  if u->'datos'->'valores'->'pos_dc' <> 'null'::jsonb or u->>'estado_lm' <> 'pendiente' then raise exception 'P6 %', u; end if;
  r := public.pes_fichas_vigentes(null, 'Lamine Yamal');
  if r->'base'->'pos_dc'->'valor' <> 'null'::jsonb then raise exception 'P6 vigente'; end if;

  -- 7) Un jugador normal no puede deshacer
  execute como_usuario using jug;
  begin perform public.pes_fichas_deshacer((c1->>'id')::uuid); raise exception 'P7 jugador deshizo';
  exception when others then if sqlerrm not like '%NO_AUTORIZADO%' then raise; end if; end;

  -- 8) Historial: quién, cuándo, antes → después y resultados por PC (si hay un PC registrado en dispositivos_host)
  select id, usuario into disp, dueno from public.dispositivos_host order by id limit 1;
  if disp is not null then
    perform set_config('role', 'postgres', true); perform set_config('request.jwt.claims', '', true);
    perform public.pes_registrar_informe(disp, dueno, jsonb_build_object('link_version', '0.3.18', 'parche', 'Prueba', 'base_huella', 'abcdef123456',
      'resultados', jsonb_build_array(jsonb_build_object('cambio_id', c1->>'id', 'destino', 'base', 'resultado', 'aplicado', 'motivo', 'velocidad 90→85', 'jugadores', 1))));
  end if;
  execute como_usuario using adm;
  r := public.pes_fichas_historial(10, null, 'lamine');
  if jsonb_array_length(r) < 5 then raise exception 'P8 historial corto %', jsonb_array_length(r); end if;
  if (r->0->>'seq')::bigint < (r->1->>'seq')::bigint then raise exception 'P8 orden'; end if;
  if disp is not null and not exists (select 1 from jsonb_array_elements(r) e, jsonb_array_elements(e->'pcs') p
                                       where e->>'id' = c1->>'id' and p->>'motivo' = 'velocidad 90→85') then raise exception 'P8 resultado del PC'; end if;
  raise exception 'TODO_OK_REVERTIDO';
end $$;

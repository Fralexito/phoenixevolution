-- Prueba en seco de la 148 (correr DESPUÉS de aplicarla; termina con TODO_OK_REVERTIDO = todo bien y nada guardado).
-- Cambia a y b por dos perfiles reales (b = cualquier otro). Aún NO ejecutada: Supabase canceló el permiso el 25-oct-2026.
do $t$
declare a uuid := '7f1abba3-07f3-4c66-ba1e-327e29e83371'; b uuid := '9c910092-4a0a-4554-bbba-e7f7fe2af64b';
  rid integer; dev uuid; j jsonb;
begin
  insert into public.retos_matchmaking (retador_id, rival_id, estado) values (a, b, 'FINALIZADO') returning id into rid;
  insert into public.dispositivos_host (usuario, huella_token, nombre) values (a, 'prueba-zz-' || rid, 'PC prueba') returning id into dev;
  begin perform public.sistema_duelo_goles_link(dev, rid, '[]'); raise exception 'G1 sin sala'; exception when others then if sqlerrm not like 'DUELO_NO_ES_DE_ESTA_SALA%' then raise; end if; end;
  insert into public.salas (host, dispositivo, estado, reto_id) values (a, dev, 'cerrada', rid);
  begin perform public.sistema_duelo_goles_link(dev, rid, '[{"lado":"C","goleador":"x","minuto":1}]'); raise exception 'G2'; exception when others then if sqlerrm not like 'CAMPO_INVALIDO lado%' then raise; end if; end;
  begin perform public.sistema_duelo_goles_link(dev, rid, '[{"lado":"A","goleador":"x","minuto":"9x"}]'); raise exception 'G3'; exception when others then if sqlerrm not like 'CAMPO_INVALIDO minuto%' then raise; end if; end;
  j := public.sistema_duelo_goles_link(dev, rid, '[{"lado":"A","goleador":" Messi ","minuto":10,"asistente":"Di María"},{"lado":"A","goleador":"messi","minuto":50},{"lado":"B","goleador":"Kane","minuto":80,"tipo":"penal"}]');
  if (j->>'guardados')::int <> 3 or (j->>'cuadra')::boolean then raise exception 'G4 %', j; end if;
  insert into public.resultados_duelo (reto_id, goles_a, goles_b, estado, propuesto_por) values (rid, 2, 1, 'CONFIRMADO', a);
  perform set_config('request.jwt.claims', json_build_object('sub',a,'role','authenticated')::text, true);
  j := public.goleadores_comunidad(null, 10);
  if (j->>'duelos')::int < 1 or not exists (select 1 from jsonb_array_elements(j->'goleadores') x where x->>'nombre' ilike 'messi' and (x->>'goles')::int >= 2) then raise exception 'G5 %', j; end if;
  -- reenviar reemplaza; si no cuadra deja de contar
  j := public.sistema_duelo_goles_link(dev, rid, '[{"lado":"A","goleador":"Messi","minuto":10}]');
  if (j->>'cuadra')::boolean then raise exception 'G6'; end if;
  if (public.goles_de_duelo(rid)->>'cuadra')::boolean or jsonb_array_length(public.goles_de_duelo(rid)->'goles') <> 1 then raise exception 'G7'; end if;
  raise exception 'TODO_OK_REVERTIDO';
end $t$;

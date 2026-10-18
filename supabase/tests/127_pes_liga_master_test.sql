-- Prueba de la 127. Corre DESPUÉS de las migraciones 125 y 127, dentro de la misma transacción, y termina con la excepción
-- «TODO_OK_REVERTIDO» para que NADA quede guardado. Si algo falla, el mensaje dice qué prueba.
do $$
declare
  adm uuid := (select id from public.perfiles where rol = 'admin' order by id limit 1);
  jug uuid := (select id from public.perfiles where rol = 'jugador' order by id limit 1);
  otro uuid := (select id from public.perfiles where rol = 'jugador' order by id offset 1 limit 1);
  disp uuid; r jsonb; c_f uuid; c_n uuid; c_d uuid; c_v uuid; c_bad uuid; c_lmid uuid; v_f bigint; v_d bigint; v_x bigint; t text;
  lmj bigint; lmj_pes int;
  como_usuario constant text := 'select set_config(''role'', ''authenticated'', true), set_config(''request.jwt.claims'', json_build_object(''sub'', $1::text, ''role'', ''authenticated'')::text, true)';
  como_servidor constant text := 'select set_config(''role'', ''postgres'', true), set_config(''request.jwt.claims'', '''', true)';
begin
  if adm is null or jug is null or otro is null then raise exception 'FALTAN_DATOS (hace falta 1 admin y 2 jugadores)'; end if;
  insert into public.dispositivos_host (usuario, huella_token, nombre) values (jug, 'prueba127-' || gen_random_uuid(), 'PC prueba 127') returning id into disp;
  select id, pes_id into lmj, lmj_pes from public.lm_jugadores where pes_id between 1 and 89999999 order by id limit 1;

  -- 1) Tipos encendidos, solo destino lm
  if (select count(*) from public.pes_tipos_cambio where tipo in ('dinero', 'valor') and activo and destinos = array['lm']) <> 2 then raise exception 'P1 tipos'; end if;

  -- 2) Fichaje a las dos con ids reales y condiciones de LM → base publicada y LM publicada en el canal
  execute como_usuario using adm;
  r := public.pes_cambio_crear('fichaje', 'ambos', jsonb_build_object('jugador', 'Lamine Yamal', 'jugador_id', 162114, 'desde', 'FC Barcelona', 'desde_id', 101,
         'hasta', 'Arsenal FC', 'hasta_id', 102, 'lm', jsonb_build_object('monto', 25000000, 'sueldo', 150, 'dorsal', 19, 'fin_contrato', '2028-06-30', 'partida', 'xx')), 'p127');
  c_f := (r->>'id')::uuid;
  execute como_servidor;
  select estado_lm into t from public.pes_cambios where id = c_f;
  if t <> 'publicado' then raise exception 'P2 estado_lm %', t; end if;
  select version into v_f from public.lm_pc_cambios where cambio = c_f and tipo = 'traspaso';
  if v_f is null or (select lm_ref from public.pes_cambios where id = c_f) <> 'lm-v' || v_f then raise exception 'P2 lm_ref'; end if;
  select datos into r from public.lm_pc_cambios where version = v_f;
  if (r->>'pes_id')::int <> 162114 or (r->>'club_desde_pes')::int <> 101 or (r->>'club_hacia_pes')::int <> 102 or (r->>'monto')::bigint <> 25000000 or (r->>'dorsal')::int <> 19
     or r ? 'sueldo' or r->>'fin_contrato' <> '2028-06-30' then raise exception 'P2 datos LM %', r; end if;   -- sueldo 150 (no múltiplo de 100) y partida «xx» se descartan
  if (select usuario from public.lm_pc_cambios where version = v_f) is not null then raise exception 'P2 debería ir a todos'; end if;

  -- 3) Fichaje solo con nombres → LM en error (no hay id de PES); con el id de la web de LM sí se resuelve
  execute como_usuario using adm;
  r := public.pes_cambio_crear('fichaje', 'lm', '{"jugador":"Nadie Conocido","desde":"Club A","hasta":"Club B"}');
  c_n := (r->>'id')::uuid;
  execute como_servidor;
  select estado_lm || '|' || lm_ref into t from public.pes_cambios where id = c_n;
  if t <> 'error|LM_SIN_ID_PES:jugador' then raise exception 'P3 sin id: %', t; end if;
  if exists (select 1 from public.lm_pc_cambios where cambio = c_n) then raise exception 'P3 publicó sin id'; end if;
  if lmj is not null then
    execute como_usuario using adm;
    r := public.pes_cambio_crear('fichaje', 'lm', jsonb_build_object('jugador', 'Por id de la web', 'desde', 'Club A', 'hasta', 'Club B', 'hasta_id', 555,
           'lm', jsonb_build_object('jugador_id', lmj, 'usuario', jug, 'partida', 'ML0000000B:555')));
    c_lmid := (r->>'id')::uuid;
    execute como_servidor;
    if (select estado_lm from public.pes_cambios where id = c_lmid) <> 'publicado' then raise exception 'P3 por lm.jugador_id'; end if;
    if (select (datos->>'pes_id')::int from public.lm_pc_cambios where cambio = c_lmid) <> lmj_pes then raise exception 'P3 pes_id resuelto'; end if;
    if (select usuario::text || '|' || partida from public.lm_pc_cambios where cambio = c_lmid) <> jug::text || '|ML0000000B:555' then raise exception 'P3 a quién'; end if;
  end if;

  -- 4) Dinero: necesita usuario e importes válidos
  execute como_usuario using adm;
  begin perform public.pes_cambio_crear('dinero', 'ambos', '{"presupuesto":1000000}'); raise exception 'P4 dinero a la base';
  exception when others then if sqlerrm not like '%DESTINO_NO_PERMITIDO%' then raise; end if; end;
  r := public.pes_cambio_crear('dinero', 'lm', '{"presupuesto":1000000}');
  execute como_servidor;
  if (select estado_lm || '|' || lm_ref from public.pes_cambios where id = (r->>'id')::uuid) <> 'error|LM_FALTA_USUARIO' then raise exception 'P4 sin usuario'; end if;
  execute como_usuario using adm;
  r := public.pes_cambio_crear('dinero', 'lm', jsonb_build_object('usuario', jug, 'presupuesto', 150));
  c_bad := (r->>'id')::uuid;
  execute como_servidor;
  if (select estado_lm || '|' || lm_ref from public.pes_cambios where id = c_bad) <> 'error|LM_IMPORTE_NO_VALIDO:presupuesto' then raise exception 'P4 importe'; end if;
  execute como_usuario using adm;
  r := public.pes_cambio_crear('dinero', 'lm', jsonb_build_object('usuario', jug, 'presupuesto', 250000000, 'tope_salarial', 90000000));
  c_d := (r->>'id')::uuid;
  execute como_servidor;
  select version into v_d from public.lm_pc_cambios where cambio = c_d;
  if v_d is null or (select datos from public.lm_pc_cambios where version = v_d) <> '{"presupuesto":250000000,"tope_salarial":90000000}'::jsonb
     or (select usuario from public.lm_pc_cambios where version = v_d) <> jug then raise exception 'P4 dinero publicado'; end if;

  -- 5) Valor
  execute como_usuario using adm;
  r := public.pes_cambio_crear('valor', 'lm', '{"jugador":"Lamine Yamal","jugador_id":162114,"valor":180000000}');
  c_v := (r->>'id')::uuid;
  execute como_servidor;
  if (select datos->>'valor' from public.lm_pc_cambios where cambio = c_v) <> '180000000' then raise exception 'P5 valor'; end if;

  -- 6) Canal: cada usuario ve lo de todos + lo suyo, en orden y con el formato del PC
  r := public.lm_pc_cambios_desde(jug, 0);
  if r->>'formato' <> 'phoenix-lm/cambios-1' or not exists (select 1 from jsonb_array_elements(r->'cambios') e where (e->>'version')::bigint = v_d) then raise exception 'P6 jug no ve su dinero'; end if;
  if (r->'cambios'->0->>'cambio_id') is null then raise exception 'P6 sin cambio_id'; end if;
  r := public.lm_pc_cambios_desde(otro, 0);
  if exists (select 1 from jsonb_array_elements(r->'cambios') e where (e->>'version')::bigint = v_d) then raise exception 'P6 otro ve el dinero de jug'; end if;
  if not exists (select 1 from jsonb_array_elements(r->'cambios') e where (e->>'version')::bigint = v_f) then raise exception 'P6 otro no ve el fichaje global'; end if;
  if (select count(*) from jsonb_array_elements(public.lm_pc_cambios_desde(jug, v_f)->'cambios') e where (e->>'version')::bigint <= v_f) <> 0 then raise exception 'P6 desde'; end if;

  -- 7) RLS: cada uno lee solo lo suyo
  execute como_usuario using otro;
  if (select count(*) from public.lm_pc_cambios where usuario = jug) <> 0 then raise exception 'P7 otro lee lo de jug'; end if;
  begin perform public.lm_pc_cambios_desde(otro, 0); raise exception 'P7 usuario llamó al canal';
  exception when others then if sqlerrm not like '%permission denied%' then raise; end if; end;
  begin perform public.lm_pc_tomar_pendientes(); raise exception 'P7 usuario tomó pendientes';
  exception when others then if sqlerrm not like '%NO_AUTORIZADO%' then raise; end if; end;

  -- 8) Informe del PC de jug: partida + resultados + registro de usuarios (destino lm)
  execute como_servidor;
  r := public.lm_pc_informe(jug, disp, 'link', jsonb_build_object('formato', 'phoenix-lm/aplicado-1', 'partidas', jsonb_build_array(jsonb_build_object(
         'partida', 'ML0000000B:555', 'ranura', 'ML0000000B', 'club_pes', 555, 'club_nombre', 'Mi Club', 'fecha_partida', '2026-08-21', 'version_aplicada', v_d,
         'resultados', jsonb_build_array(
            jsonb_build_object('version', v_f, 'estado', 'aplicado', 'antes', jsonb_build_object('club_pes', 101), 'despues', jsonb_build_object('club_pes', 102)),
            jsonb_build_object('version', v_d, 'estado', 'rechazado', 'motivo', 'El tope salarial no cubre los sueldos'),
            jsonb_build_object('version', 999999, 'estado', 'aplicado'))))));
  if (r->>'partidas')::int <> 1 or (r->>'guardados')::int <> 2 or (r->>'ignorados')::int <> 1 then raise exception 'P8 informe %', r; end if;
  if (select count(*) from public.pes_eventos where dispositivo = disp and destino = 'lm') <> 2 then raise exception 'P8 pes_eventos'; end if;
  if (select resultado from public.pes_eventos where dispositivo = disp and cambio = c_d and destino = 'lm') <> 'error' then raise exception 'P8 rechazado → error'; end if;
  -- repetir el mismo informe no añade nada
  r := public.lm_pc_informe(jug, disp, 'link', jsonb_build_object('formato', 'phoenix-lm/aplicado-1', 'partidas', jsonb_build_array(jsonb_build_object(
         'partida', 'ML0000000B:555', 'version_aplicada', v_d, 'resultados', jsonb_build_array(jsonb_build_object('version', v_f, 'estado', 'aplicado'))))));
  if (r->>'guardados')::int <> 0 or (select count(*) from public.lm_pc_resultados where usuario = jug) <> 2 then raise exception 'P8 repetido'; end if;
  -- otro no puede informar de un cambio que era solo para jug
  r := public.lm_pc_informe(otro, gen_random_uuid(), 'manager', jsonb_build_object('formato', 'phoenix-lm/aplicado-1', 'partidas', jsonb_build_array(jsonb_build_object(
         'partida', 'ML00000001:7', 'resultados', jsonb_build_array(jsonb_build_object('version', v_d, 'estado', 'aplicado'))))));
  if (r->>'ignorados')::int <> 1 or (r->>'guardados')::int <> 0 then raise exception 'P8 otro informó lo de jug'; end if;
  begin perform public.lm_pc_informe(jug, disp, 'link', '{"formato":"otro"}'); raise exception 'P8 formato';
  exception when others then if sqlerrm not like '%INFORME_NO_VALIDO%' then raise; end if; end;

  -- 9) Anular = deshacer en cada partida
  execute como_usuario using adm;
  perform public.pes_cambio_anular(c_f, 'deshacer prueba');
  execute como_servidor;
  select version into v_x from public.lm_pc_cambios where cambio = c_f and tipo = 'deshacer';
  if v_x is null or (select (datos->>'deshace')::bigint from public.lm_pc_cambios where version = v_x) <> v_f then raise exception 'P9 deshacer'; end if;
  r := public.lm_pc_cambios_desde(otro, 0);
  if exists (select 1 from jsonb_array_elements(r->'cambios') e where (e->>'version')::bigint = v_f) then raise exception 'P9 un PC nuevo aún recibe el anulado'; end if;
  if not exists (select 1 from jsonb_array_elements(r->'cambios') e where (e->>'version')::bigint = v_x) then raise exception 'P9 el deshacer no está en el canal'; end if;
  r := public.lm_pc_informe(jug, disp, 'link', jsonb_build_object('formato', 'phoenix-lm/aplicado-1', 'partidas', jsonb_build_array(jsonb_build_object(
         'partida', 'ML0000000B:555', 'resultados', jsonb_build_array(jsonb_build_object('version', v_x, 'estado', 'aplicado', 'antes', jsonb_build_object('deshace', v_f)))))));
  if (select resultado from public.pes_eventos where dispositivo = disp and cambio = c_f and destino = 'lm' order by id desc limit 1) <> 'deshecho' then raise exception 'P9 deshecho en el registro'; end if;

  -- 10) Historial y partidas: el dueño ve lo suyo, otro nada, el staff todo
  execute como_usuario using jug;
  r := public.lm_pc_historial();
  if jsonb_array_length(r) <> 3 or exists (select 1 from jsonb_array_elements(r) e where (e->>'usuario')::uuid <> jug) then raise exception 'P10 historial jug %', jsonb_array_length(r); end if;
  if jsonb_array_length(public.lm_pc_partidas_lista()) <> 1 then raise exception 'P10 partidas jug'; end if;
  execute como_usuario using otro;
  if jsonb_array_length(public.lm_pc_historial(jug)) <> 0 then raise exception 'P10 otro ve el historial de jug'; end if;
  execute como_usuario using adm;
  if jsonb_array_length(public.lm_pc_historial(jug)) <> 3 or jsonb_array_length(public.lm_pc_partidas_lista()) < 2 then raise exception 'P10 staff'; end if;

  -- 11) Stats con destino lm (forma de la 126): viajan al canal como «stat»; su «deshacer» llega por la anulación, no dos veces
  if exists (select 1 from public.pes_tipos_cambio where tipo = 'stats' and activo) then
    execute como_usuario using adm;
    r := public.pes_cambio_crear('stats', 'lm', jsonb_build_object('jugador', 'Lamine Yamal', 'jugador_id', 162114, 'valores', jsonb_build_object('velocidad', 95),
           'lm', jsonb_build_object('usuario', jug)));
    c_v := (r->>'id')::uuid;
    execute como_servidor;
    select * into r from (select to_jsonb(l) as j from public.lm_pc_cambios l where l.cambio = c_v) z;
    if (select tipo || '|' || (datos->>'pes_id') || '|' || (datos->>'clase') || '|' || usuario::text from public.lm_pc_cambios where cambio = c_v)
       <> 'stat|162114|stats|' || jug::text then raise exception 'P11 stat en el canal'; end if;
    if (select datos->'valores'->>'velocidad' from public.lm_pc_cambios where cambio = c_v) <> '95' then raise exception 'P11 valores'; end if;
    execute como_usuario using adm;
    perform public.pes_cambio_anular(c_v, 'deshacer stats');
    r := public.pes_cambio_crear('stats', 'lm', jsonb_build_object('jugador', 'Lamine Yamal', 'jugador_id', 162114, 'valores', jsonb_build_object('velocidad', null),
           'deshace', c_v));
    execute como_servidor;
    if (select estado_lm || '|' || lm_ref from public.pes_cambios where id = (r->>'id')::uuid) <> 'publicado|lm-por-anulacion' then raise exception 'P11 deshacer de la 126'; end if;
    if exists (select 1 from public.lm_pc_cambios where cambio = (r->>'id')::uuid) then raise exception 'P11 publicado dos veces'; end if;
    if not exists (select 1 from public.lm_pc_cambios where cambio = c_v and tipo = 'deshacer') then raise exception 'P11 sin deshacer'; end if;
  end if;

  raise exception 'TODO_OK_REVERTIDO';
end $$;

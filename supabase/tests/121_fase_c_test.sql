-- Pruebas de la migración 121 (efectos de carta, banners, sonidos de chat). Se deshacen solas: debe terminar con «TODO_OK_REVERTIDO».
do $$
declare us uuid; n int; j jsonb; it bigint;
begin
  -- T1: las 11 piezas nuevas existen y los legendarios nuevos son solo gemas
  select count(*) into n from public.tienda_items where categoria in ('efecto_carta', 'banner', 'sonido_chat');
  if n <> 11 then raise exception 'T1 objetos nuevos: % (esperado 11)', n; end if;
  select count(*) into n from public.tienda_items where categoria in ('efecto_carta', 'banner', 'sonido_chat') and rareza = 'legendario' and precio_ascuas is not null;
  if n <> 0 then raise exception 'T2 un legendario nuevo se vende con ascuas'; end if;
  select count(*) into n from public.tienda_items where categoria in ('efecto_carta', 'banner', 'sonido_chat') and precio_gemas is null;
  if n <> 0 then raise exception 'T3 todo objeto nuevo debe tener precio en gemas'; end if;
  -- T4: lista blanca de estilos (nada de CSS libre ni URLs)
  if private.estilo_valido('efecto_carta', '{"efecto":"rojo"}') then raise exception 'T4a efecto fuera de la lista'; end if;
  if private.estilo_valido('efecto_carta', '{"efecto":"dorado","css":"x"}') then raise exception 'T4b clave extra'; end if;
  if private.estilo_valido('banner', '{"patron":"degradado"}') then raise exception 'T4c banner sin color'; end if;
  if private.estilo_valido('banner', '{"patron":"url(x)","color":"#000000"}') then raise exception 'T4d patrón libre'; end if;
  if private.estilo_valido('banner', '{"patron":"puntos","color":"red"}') then raise exception 'T4e color no hex'; end if;
  if private.estilo_valido('sonido_chat', '{"sonido":"https://x.com/a.mp3"}') then raise exception 'T4f URL como sonido'; end if;
  if private.estilo_valido('sonido_chat', '{"sonido":"snd_otro"}') then raise exception 'T4g sonido fuera del catálogo'; end if;
  if not private.estilo_valido('sonido_chat', '{"sonido":"snd_pop_burbuja"}') or not private.estilo_valido('banner', '{"patron":"rejilla","color":"#0a0f2c","color2":"#00e5ff"}') then raise exception 'T4h estilo bueno rechazado'; end if;
  if not private.estilo_valido('marco', '{"color":"#ff6a00"}') then raise exception 'T4i los marcos de antes dejaron de valer'; end if;
  -- T5: el check de la tabla rechaza una categoría inventada y un estilo fuera de lista
  begin
    insert into public.tienda_items (clave, nombre, descripcion, categoria, precio, estilo, precio_gemas) values ('prueba_cat_mala', 'Prueba mala', 'x', 'otra', 1, '{"color":"#000000"}', 1);
    raise exception 'T5 aceptó una categoría inventada';
  exception when check_violation then null; end;
  begin
    insert into public.tienda_items (clave, nombre, descripcion, categoria, precio, estilo, precio_gemas) values ('prueba_estilo_malo', 'Prueba mala', 'x', 'efecto_carta', 1, '{"efecto":"fuego"}', 1);
    raise exception 'T5b aceptó un efecto fuera de la lista';
  exception when check_violation then null; end;
  -- T6: la tienda lista los 39 objetos (28 + 11)
  select jsonb_array_length(public.tienda_lista()) into n;
  if n <> 39 then raise exception 'T6 la tienda tiene % objetos (esperado 39)', n; end if;
  -- T7: efectos_carta_de devuelve solo lo equipado de quien deja verse
  select u.id into us from auth.users u where private.categoria_edad(u.id) <> 'menor' and coalesce((select muro_ver from public.privacidad_social where usuario_id = u.id), 'PUBLICO') = 'PUBLICO' limit 1;
  if us is null then raise exception 'T7 sin usuario de prueba'; end if;
  select id into it from public.tienda_items where clave = 'efecto_dorado';
  insert into public.inventario (usuario_id, item_id, categoria, precio_pagado, moneda_pagada, equipado) values (us, it, 'efecto_carta', 0, null, true)
    on conflict (usuario_id, item_id) do update set equipado = true;
  j := public.efectos_carta_de(array[us, gen_random_uuid()]);
  if j ->> us::text is distinct from 'dorado' or (select count(*) from jsonb_object_keys(j)) <> 1 then raise exception 'T7 efectos_carta_de: %', j; end if;
  if public.efectos_carta_de(null) <> '{}'::jsonb or public.efectos_carta_de(array[]::uuid[]) <> '{}'::jsonb then raise exception 'T7b vacío debe dar {}'; end if;
  -- T8: equipamiento_de ya incluye la categoría nueva sin tocar nada
  if public.equipamiento_de(us) -> 'efecto_carta' ->> 'clave' is distinct from 'efecto_dorado' then raise exception 'T8 equipamiento_de: %', public.equipamiento_de(us); end if;
  -- T9: seguridad de la función nueva (nada para PUBLIC)
  if has_function_privilege('public', 'public.efectos_carta_de(uuid[])', 'execute') then raise exception 'T9 PUBLIC no debe ejecutar efectos_carta_de'; end if;
  -- T10: el libro sigue cuadrado
  select count(*) into n from private.economia_diferencias();
  if n <> 0 then raise exception 'T10 libro descuadrado: %', n; end if;
  raise exception 'TODO_OK_REVERTIDO';
end $$;

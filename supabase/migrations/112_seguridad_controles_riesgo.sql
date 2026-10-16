-- 112 · SEGURIDAD DEL DINERO (2/3) · Controles de riesgo y verificación del pagador. Depende de 109, 110 y 111. Plan: docs/SEGURIDAD-ECONOMIA.md.
-- Todo es configurable en economia_config (cada cambio queda en economia_config_log). Los valores iniciales son prudentes: se pueden relajar con la experiencia.

-- 1) Configuración ---------------------------------------------------------------------------------------------------------------
insert into public.economia_config (clave, valor) values
  ('recarga_tope_global_diario_centimos', '200000'),      -- S/ 2 000 entre todas las personas por día (freno de exposición)
  ('recarga_cuenta_nueva_dias', '7'),                     -- una cuenta es «nueva» durante estos días
  ('recarga_cuenta_nueva_tope_centimos', '3000'),         -- S/ 30 por orden mientras la cuenta sea nueva
  ('recarga_rechazos_max_semana', '3'),                   -- con 3 comprobantes rechazados en 7 días se pausa a esa persona
  ('recarga_max_pendientes', '3'),                        -- órdenes abiertas a la vez por persona
  ('recarga_alerta_monto_centimos', '10000'),             -- desde S/ 100: bandera «monto alto» para el revisor
  ('recarga_confirmar_monto_desde_centimos', '10000'),    -- desde S/ 100 el administrador debe escribir el monto para aprobar
  ('admin_exige_mfa', 'false')                            -- 'true' = las acciones de dinero exigen verificación en dos pasos (aal2)
on conflict (clave) do nothing;

-- 2) Administrador seguro (verificación en dos pasos opcional) ---------------------------------------------------------------------
create or replace function private.admin_seguro() returns boolean
language plpgsql stable security definer set search_path = '' as $$
begin
  if not private.es_admin() then return false; end if;
  if coalesce(private.config('admin_exige_mfa'), 'false') = 'true' and coalesce(auth.jwt() ->> 'aal', 'aal1') <> 'aal2' then
    raise exception 'Para esta acción necesitas la verificación en dos pasos (MFA) activada en tu cuenta de administrador.' using errcode = '42501';
  end if;
  return true;
end $$;
revoke all on function private.admin_seguro() from public, anon, authenticated;

-- 3) Datos de verificación del pago -----------------------------------------------------------------------------------------------
alter table public.pagos_manuales add column if not exists nombre_pagador text check (nombre_pagador is null or char_length(btrim(nombre_pagador)) between 3 and 80);
alter table public.pagos_manuales add column if not exists captura_etag text;
create index if not exists pagos_manuales_etag_idx on public.pagos_manuales (captura_etag) where captura_etag is not null;

-- 4) Banderas de riesgo para el revisor ---------------------------------------------------------------------------------------------
create or replace function private.pago_banderas(p_orden uuid) returns text[]
language plpgsql stable security definer set search_path = '' as $$
declare o public.ordenes_pago; pm public.pagos_manuales; r text[] := '{}'; v_creada timestamptz; v_n integer;
begin
  select * into o from public.ordenes_pago where id = p_orden; if not found then return r; end if;
  select * into pm from public.pagos_manuales where orden_id = p_orden;
  select created_at into v_creada from public.perfiles where id = o.usuario_id;
  if v_creada is not null and v_creada > now() - make_interval(days => coalesce(nullif(private.config('recarga_cuenta_nueva_dias'), '')::integer, 7)) then r := array_append(r, 'cuenta_nueva'); end if;
  if not exists (select 1 from public.ordenes_pago x where x.usuario_id = o.usuario_id and x.estado = 'PAGADA' and x.id <> o.id) then r := array_append(r, 'primera_compra'); end if;
  if o.monto_centimos >= coalesce(nullif(private.config('recarga_alerta_monto_centimos'), '')::integer, 10000) then r := array_append(r, 'monto_alto'); end if;
  select count(*) into v_n from public.ordenes_pago x where x.usuario_id = o.usuario_id and x.created_at >= now() - interval '24 hours';
  if v_n >= 3 then r := array_append(r, 'varias_ordenes_24h'); end if;
  if exists (select 1 from public.ordenes_pago x where x.usuario_id = o.usuario_id and x.estado in ('REEMBOLSADA', 'DISPUTADA')) then r := array_append(r, 'reembolsos_previos'); end if;
  if (private.sancion_vigente(o.usuario_id)).id is not null then r := array_append(r, 'sancion_activa'); end if;
  if pm.orden_id is not null and pm.comprobante_path is null then r := array_append(r, 'sin_captura'); end if;
  if exists (select 1 from public.pagos_manuales_historial h where h.datos ->> 'usuario_id' = o.usuario_id::text)
     or exists (select 1 from public.pagos_manuales x where x.usuario_id = o.usuario_id and x.estado = 'rechazado' and x.orden_id <> p_orden) then r := array_append(r, 'rechazos_previos'); end if;
  return r;
end $$;
revoke all on function private.pago_banderas(uuid) from public, anon, authenticated;

-- 5) Crear la orden: ahora con los controles de riesgo --------------------------------------------------------------------------------
create or replace function public.crear_orden_metodo(p_paquete bigint, p_metodo text) returns jsonb
language plpgsql security definer set search_path = '' as $$
declare yo uuid := private.uid_requerido(); p public.paquetes_tokens; m public.pagos_metodos; oid uuid; v_exp timestamptz;
        v_tope integer; v_hoy integer; v_dia timestamptz; v_creada timestamptz; v_dias integer; v_n integer;
begin
  if coalesce(private.config('pagos_activos'), 'false') <> 'true' then raise exception 'Las compras con dinero real aún no están activas.'; end if;
  if private.categoria_edad(yo) <> 'adulto' then raise exception 'Solo las personas mayores de 18 años, con fecha de nacimiento declarada, pueden comprar con dinero real.'; end if;
  if not exists (select 1 from public.aceptaciones_legales where usuario_id = yo and documento = 'terminos_compra' and version = private.config('version_terminos')) then
    raise exception 'Primero debes aceptar los términos de compra.'; end if;
  if (private.sancion_vigente(yo)).id is not null then raise exception 'Tu cuenta tiene una sanción activa.'; end if;
  select created_at into v_creada from public.perfiles where id = yo;
  if not coalesce((select perfil_completo from public.perfiles where id = yo), false) then raise exception 'Completa tu perfil antes de comprar.'; end if;
  select * into m from public.pagos_metodos where clave = p_metodo and activo;
  if not found then raise exception 'Ese método de pago no está disponible.'; end if;
  select * into p from public.paquetes_tokens where id = p_paquete and activo;
  if not found then raise exception 'Ese paquete no está disponible.'; end if;
  if p.precio_centimos < m.minimo_centimos then raise exception 'Con este método el mínimo es S/ %.', to_char(m.minimo_centimos / 100.0, 'FM999990.00'); end if;
  if m.maximo_centimos is not null and p.precio_centimos > m.maximo_centimos then raise exception 'Con este método el máximo es S/ %.', to_char(m.maximo_centimos / 100.0, 'FM999990.00'); end if;
  -- cuentas nuevas: tope por orden
  v_dias := coalesce(nullif(private.config('recarga_cuenta_nueva_dias'), '')::integer, 7);
  if v_creada is not null and v_creada > now() - make_interval(days => v_dias)
     and p.precio_centimos > coalesce(nullif(private.config('recarga_cuenta_nueva_tope_centimos'), '')::integer, 3000) then
    raise exception 'Las cuentas nuevas pueden recargar hasta S/ % por orden durante los primeros % días.',
      to_char(coalesce(nullif(private.config('recarga_cuenta_nueva_tope_centimos'), '')::integer, 3000) / 100.0, 'FM999990.00'), v_dias; end if;
  -- demasiadas órdenes abiertas
  select count(*) into v_n from public.ordenes_pago where usuario_id = yo and estado = 'PENDIENTE' and (expira_at is null or expira_at > now());
  if v_n >= coalesce(nullif(private.config('recarga_max_pendientes'), '')::integer, 3) then raise exception 'Tienes demasiadas recargas pendientes. Termina una o espera a que venzan.'; end if;
  if (select count(*) from public.ordenes_pago where usuario_id = yo and estado = 'PENDIENTE' and created_at > now() - interval '1 hour') >= 5 then
    raise exception 'Tienes demasiadas órdenes pendientes. Espera un rato.'; end if;
  -- comprobantes rechazados recientemente
  select (select count(*) from public.pagos_manuales x where x.usuario_id = yo and x.estado = 'rechazado' and x.revisado_at > now() - interval '7 days')
       + (select count(*) from public.pagos_manuales_historial h where h.datos ->> 'usuario_id' = yo::text and (h.datos ->> 'revisado_at')::timestamptz > now() - interval '7 days') into v_n;
  if v_n >= coalesce(nullif(private.config('recarga_rechazos_max_semana'), '')::integer, 3) then raise exception 'Tuviste varios comprobantes rechazados esta semana. Escribe al staff para revisar tu caso.'; end if;
  -- topes de exposición: por persona y global, por día de Lima
  v_dia := date_trunc('day', now() at time zone 'America/Lima') at time zone 'America/Lima';
  v_tope := coalesce(nullif(private.config('recarga_tope_diario_centimos'), '')::integer, 20000);
  select coalesce(sum(monto_centimos), 0) into v_hoy from public.ordenes_pago where usuario_id = yo and created_at >= v_dia and estado in ('PENDIENTE', 'PAGADA');
  if v_hoy + p.precio_centimos > v_tope then raise exception 'Superas el tope diario de recargas.'; end if;
  select coalesce(sum(monto_centimos), 0) into v_hoy from public.ordenes_pago where created_at >= v_dia and estado in ('PENDIENTE', 'PAGADA');
  if v_hoy + p.precio_centimos > coalesce(nullif(private.config('recarga_tope_global_diario_centimos'), '')::integer, 200000) then
    raise exception 'Las recargas de hoy llegaron al límite. Inténtalo mañana.'; end if;
  v_exp := case when m.tipo = 'manual' then now() + make_interval(hours => coalesce(nullif(private.config('recarga_horas_vencimiento_manual'), '')::integer, 24)) end;
  insert into public.ordenes_pago (usuario_id, paquete_id, tokens, monto_centimos, moneda, metodo, expira_at, proveedor)
  values (yo, p.id, p.tokens, p.precio_centimos, p.moneda, m.clave, v_exp, m.proveedor) returning id into oid;
  return jsonb_build_object('orden', oid, 'monto_centimos', p.precio_centimos, 'moneda', p.moneda, 'gemas', p.tokens, 'metodo', m.clave,
    'tipo', m.tipo, 'instrucciones', m.instrucciones, 'datos', m.datos, 'expira_at', v_exp);
end $$;
revoke all on function public.crear_orden_metodo(bigint, text) from public, anon;
grant execute on function public.crear_orden_metodo(bigint, text) to authenticated;

-- 6) Enviar comprobante: exige captura REAL, nombre de quien pagó y no acepta capturas repetidas ------------------------------------
drop function if exists public.enviar_comprobante_manual(uuid, text, text);
create or replace function public.enviar_comprobante_manual(p_orden uuid, p_referencia text, p_comprobante_path text, p_nombre_pagador text) returns void
language plpgsql security definer set search_path = '' as $$
declare yo uuid := private.uid_requerido(); o public.ordenes_pago; m public.pagos_metodos; ref text := btrim(coalesce(p_referencia, '')); nom text := btrim(coalesce(p_nombre_pagador, '')); v_etag text;
begin
  select * into o from public.ordenes_pago where id = p_orden and usuario_id = yo for update;
  if not found then raise exception 'Esa orden no existe.'; end if;
  select * into m from public.pagos_metodos where clave = o.metodo;
  if m.tipo is distinct from 'manual' then raise exception 'Esta orden no es de pago manual.'; end if;
  if o.estado <> 'PENDIENTE' then raise exception 'Esta orden ya no está pendiente.'; end if;
  if o.expira_at is not null and o.expira_at < now() then raise exception 'Esta orden venció. Crea una nueva.'; end if;
  if ref !~ '^[A-Za-z0-9-]{4,40}$' then raise exception 'El código de operación solo lleva letras, números y guiones (4 a 40 caracteres).'; end if;
  if char_length(nom) < 3 or char_length(nom) > 80 then raise exception 'Escribe el nombre de quien hizo el pago, como aparece en la constancia (3 a 80 letras).'; end if;
  if p_comprobante_path is null then raise exception 'Adjunta la captura del pago.'; end if;
  if left(p_comprobante_path, 37) <> yo::text || '/' or char_length(p_comprobante_path) > 200 then raise exception 'La imagen del comprobante no es válida.'; end if;
  if not exists (select 1 from storage.objects so where so.bucket_id = 'comprobantes-pago' and so.name = p_comprobante_path) then raise exception 'La captura no se subió bien. Súbela de nuevo.'; end if;
  select so.metadata ->> 'eTag' into v_etag from storage.objects so where so.bucket_id = 'comprobantes-pago' and so.name = p_comprobante_path;
  if v_etag is not null and exists (select 1 from public.pagos_manuales x where x.captura_etag = v_etag and x.orden_id <> o.id and x.estado <> 'rechazado') then
    raise exception 'Esa captura ya se usó en otro pago.'; end if;
  if exists (select 1 from public.pagos_manuales where orden_id = o.id and estado = 'en_revision') then raise exception 'Ya enviaste el comprobante; espera la revisión.'; end if;
  delete from public.pagos_manuales where orden_id = o.id and estado = 'rechazado';
  insert into public.pagos_manuales (orden_id, usuario_id, referencia, comprobante_path, nombre_pagador, captura_etag) values (o.id, yo, ref, p_comprobante_path, nom, v_etag);
exception when unique_violation then raise exception 'Ese código de operación ya fue usado.';
end $$;
revoke all on function public.enviar_comprobante_manual(uuid, text, text, text) from public, anon;
grant execute on function public.enviar_comprobante_manual(uuid, text, text, text) to authenticated;

-- 7) Cola del administrador con banderas, y aprobar con doble confirmación para montos altos ---------------------------------------
create or replace function public.admin_pagos_manuales(p_estado text default 'en_revision') returns jsonb
language plpgsql stable security definer set search_path = '' as $$
declare v_umbral integer := coalesce(nullif(private.config('recarga_confirmar_monto_desde_centimos'), '')::integer, 10000);
begin
  if not private.es_admin() then raise exception 'Solo el administrador puede ver los pagos manuales.'; end if;
  return coalesce((select jsonb_agg(jsonb_build_object('orden', o.id, 'usuario', pf.username, 'usuario_id', o.usuario_id, 'metodo', o.metodo, 'monto_centimos', o.monto_centimos,
            'moneda', o.moneda, 'gemas', o.tokens, 'referencia', pm.referencia, 'nombre_pagador', pm.nombre_pagador, 'comprobante_path', pm.comprobante_path, 'estado', pm.estado,
            'nota', pm.nota, 'enviado', pm.created_at, 'revisado_at', pm.revisado_at, 'banderas', to_jsonb(private.pago_banderas(o.id)), 'confirmar_monto', o.monto_centimos >= v_umbral) order by pm.created_at)
    from public.pagos_manuales pm join public.ordenes_pago o on o.id = pm.orden_id left join public.perfiles pf on pf.id = o.usuario_id
    where pm.estado = p_estado), '[]'::jsonb);
end $$;
revoke all on function public.admin_pagos_manuales(text) from public, anon;
grant execute on function public.admin_pagos_manuales(text) to authenticated;

drop function if exists public.admin_resolver_pago_manual(uuid, boolean, text);
create or replace function public.admin_resolver_pago_manual(p_orden uuid, p_aprobar boolean, p_nota text default null, p_monto_confirmado integer default null) returns text
language plpgsql security definer set search_path = '' as $$
declare pm public.pagos_manuales; o public.ordenes_pago; v_nota text := nullif(btrim(coalesce(p_nota, '')), ''); res text;
        v_umbral integer := coalesce(nullif(private.config('recarga_confirmar_monto_desde_centimos'), '')::integer, 10000);
begin
  if not private.admin_seguro() then raise exception 'Solo el administrador puede revisar pagos.'; end if;
  select * into pm from public.pagos_manuales where orden_id = p_orden for update;
  if not found then raise exception 'Ese pago no existe.'; end if;
  if pm.estado <> 'en_revision' then raise exception 'Ese pago ya fue revisado.'; end if;
  select * into o from public.ordenes_pago where id = p_orden;
  if p_aprobar and o.monto_centimos >= v_umbral and p_monto_confirmado is distinct from o.monto_centimos then
    raise exception 'Para aprobar un pago de este monto debes confirmar el monto exacto que recibiste.'; end if;
  if p_aprobar then
    res := public.procesar_pago_evento('pagado', o.id, 'manual', pm.referencia, o.monto_centimos, o.moneda, 'manual:' || pm.referencia);
    update public.pagos_manuales set estado = 'aprobado', revisado_por = (select auth.uid()), revisado_at = now(), nota = left(v_nota, 300) where orden_id = p_orden;
  else
    if char_length(coalesce(v_nota, '')) < 5 then raise exception 'Escribe el motivo del rechazo (mínimo 5 letras).'; end if;
    res := public.procesar_pago_evento('fallido', o.id, 'manual', pm.referencia, o.monto_centimos, o.moneda, null);
    update public.pagos_manuales set estado = 'rechazado', revisado_por = (select auth.uid()), revisado_at = now(), nota = left(v_nota, 300) where orden_id = p_orden;
  end if;
  perform private.auditar_moderacion('editar', 'pagos_manuales', p_orden::text, 'Pago manual ' || o.metodo,
    jsonb_build_object('decision', case when p_aprobar then 'aprobado' else 'rechazado' end, 'monto_centimos', o.monto_centimos, 'referencia', pm.referencia, 'nombre_pagador', pm.nombre_pagador,
      'banderas', to_jsonb(private.pago_banderas(o.id)), 'resultado', res), coalesce(v_nota, 'Revisión de pago manual'));
  return res;
end $$;
revoke all on function public.admin_resolver_pago_manual(uuid, boolean, text, integer) from public, anon;
grant execute on function public.admin_resolver_pago_manual(uuid, boolean, text, integer) to authenticated;

-- 8) Acciones del administrador que mueven dinero: exigen MFA si está activada --------------------------------------------------
create or replace function public.admin_set_pagos_activos(p_activo boolean) returns void
language plpgsql security definer set search_path = '' as $$
begin
  if not private.admin_seguro() then raise exception 'Solo el administrador puede activar los pagos.'; end if;
  if coalesce(p_activo, false) then
    if not exists (select 1 from public.pagos_metodos m where m.activo and m.datos <> '{}'::jsonb) then
      raise exception 'No se pueden activar los pagos: ningún método activo tiene datos de pago (número o cuenta).'; end if;
    if exists (select 1 from private.economia_diferencias()) then
      raise exception 'No se pueden activar los pagos: la auditoría encontró diferencias entre el libro y las billeteras.'; end if;
  end if;
  update public.economia_config set valor = case when coalesce(p_activo, false) then 'true' else 'false' end, updated_at = now() where clave = 'pagos_activos';
  perform private.auditar_moderacion('sistema', 'economia_config', 'pagos_activos', 'Pagos con dinero real', jsonb_build_object('activo', coalesce(p_activo, false)), 'Interruptor de pagos');
end $$;
revoke all on function public.admin_set_pagos_activos(boolean) from public, anon;
grant execute on function public.admin_set_pagos_activos(boolean) to authenticated;

create or replace function public.admin_ajustar_tokens(p_usuario uuid, p_delta integer, p_motivo text, p_moneda text default 'ascuas') returns integer
language plpgsql security definer set search_path = '' as $$
declare mot text := btrim(coalesce(p_motivo, '')); s integer; v_max integer := case when p_moneda = 'gemas' then 5000 else 100000 end;
begin
  if not private.admin_seguro() then raise exception 'Solo el administrador puede ajustar tokens.'; end if;
  if p_moneda not in ('ascuas', 'gemas') then raise exception 'Moneda desconocida.'; end if;
  if char_length(mot) < 5 then raise exception 'Escribe el motivo (mínimo 5 letras).'; end if;
  if p_delta is null or p_delta = 0 or abs(p_delta) > v_max then
    raise exception 'El ajuste debe ser distinto de cero y de máximo % %.', v_max, p_moneda; end if;
  perform private.registrar_movimiento(p_usuario, p_delta, 'ajuste_admin', 'admin', left(mot, 120), 'ajuste:' || gen_random_uuid()::text, p_moneda);
  select case when p_moneda = 'gemas' then gemas else saldo end into s from public.billeteras where usuario_id = p_usuario;
  perform private.auditar_moderacion('editar', 'billeteras', p_usuario::text, 'Saldo de ' || private.nombre(p_usuario),
    jsonb_build_object('delta', p_delta, 'moneda', p_moneda, 'saldo', s), mot);
  return s;
end $$;
revoke all on function public.admin_ajustar_tokens(uuid, integer, text, text) from public, anon;
grant execute on function public.admin_ajustar_tokens(uuid, integer, text, text) to authenticated;

create or replace function public.admin_guardar_metodo(p_clave text, p_nombre text, p_tipo text, p_activo boolean, p_orden integer, p_minimo integer, p_maximo integer,
  p_instrucciones text, p_datos jsonb) returns void
language plpgsql security definer set search_path = '' as $$
begin
  if not private.admin_seguro() then raise exception 'Solo el administrador puede editar los métodos de pago.'; end if;
  insert into public.pagos_metodos (clave, nombre, tipo, activo, orden, minimo_centimos, maximo_centimos, instrucciones, datos)
  values (p_clave, btrim(p_nombre), p_tipo, coalesce(p_activo, false), coalesce(p_orden, 100), coalesce(p_minimo, 0), p_maximo, p_instrucciones, coalesce(p_datos, '{}'::jsonb))
  on conflict (clave) do update set nombre = excluded.nombre, tipo = excluded.tipo, activo = excluded.activo, orden = excluded.orden, minimo_centimos = excluded.minimo_centimos,
    maximo_centimos = excluded.maximo_centimos, instrucciones = excluded.instrucciones, datos = excluded.datos;
  perform private.auditar_moderacion('editar', 'pagos_metodos', p_clave, btrim(p_nombre), jsonb_build_object('activo', p_activo, 'minimo', p_minimo, 'maximo', p_maximo, 'datos_cambiados', coalesce(p_datos, '{}'::jsonb) <> '{}'::jsonb), 'Método de pago');
end $$;
revoke all on function public.admin_guardar_metodo(text, text, text, boolean, integer, integer, integer, text, jsonb) from public, anon;
grant execute on function public.admin_guardar_metodo(text, text, text, boolean, integer, integer, integer, text, jsonb) to authenticated;

create or replace function public.admin_set_precios_item(p_id bigint, p_precio_ascuas integer, p_precio_gemas integer) returns void
language plpgsql security definer set search_path = '' as $$
declare t public.tienda_items;
begin
  if not private.admin_seguro() then raise exception 'Solo el administrador puede cambiar los precios.'; end if;
  if p_precio_ascuas is null and p_precio_gemas is null then raise exception 'El objeto necesita precio en al menos una moneda.'; end if;
  if coalesce(p_precio_ascuas, 0) < 0 or coalesce(p_precio_gemas, 0) < 0 then raise exception 'Los precios no pueden ser negativos.'; end if;
  update public.tienda_items set precio_ascuas = p_precio_ascuas, precio_gemas = p_precio_gemas, precio = coalesce(p_precio_ascuas, precio)
   where id = p_id returning * into t;
  if not found then raise exception 'El objeto no existe.'; end if;
  perform private.auditar_moderacion('editar', 'tienda_items', p_id::text, t.nombre, jsonb_build_object('precio_ascuas', p_precio_ascuas, 'precio_gemas', p_precio_gemas), 'Precios por moneda');
end $$;
revoke all on function public.admin_set_precios_item(bigint, integer, integer) from public, anon;
grant execute on function public.admin_set_precios_item(bigint, integer, integer) to authenticated;

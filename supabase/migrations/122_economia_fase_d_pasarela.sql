-- 122 · ECONOMÍA Fase D · pasarela de pago (Mercado Pago, Checkout Pro). Diseño: docs/DISENO-RECARGAS.md · guía: docs/GUIA-PASARELA.md.
-- No activa pagos: `pagos_activos` sigue como esté y el método nuevo nace INACTIVO. No toca el flujo manual (crear_orden_metodo, enviar_comprobante_manual, admin_resolver_pago_manual).
-- Las gemas se siguen acreditando SOLO en public.procesar_pago_evento; aquí se añade el registro de avisos, la idempotencia, la conciliación y el puente seguro para la Edge Function.

-- 1) Método nuevo (inactivo) y configuración ----------------------------------------------------------------------------------------------
insert into public.pagos_metodos (clave, nombre, tipo, proveedor, activo, orden, minimo_centimos, maximo_centimos, comision_pct, comision_fija_centimos, instrucciones, datos)
values ('mercadopago', 'Tarjeta, Yape y más (Mercado Pago)', 'pasarela', 'mercadopago', false, 5, 1000, null, 0, 0,
        'Pagas en la página segura de Mercado Pago. Las gemas llegan solas cuando se confirma el pago.', '{}'::jsonb)
on conflict (clave) do nothing;

-- pasarela_modo: 'prueba' solo acepta avisos de pruebas (live_mode=false); 'produccion' solo acepta avisos reales (live_mode=true).
insert into public.economia_config (clave, valor) values ('pasarela_modo', 'prueba'), ('pasarela_vence_minutos', '60')
on conflict (clave) do nothing;

-- 2) Registro de TODOS los avisos recibidos (inmutable) ----------------------------------------------------------------------------------
create table if not exists public.pagos_eventos (
  id bigint generated always as identity primary key,
  proveedor text not null check (proveedor ~ '^[a-z0-9_]{2,30}$'),
  pago_ref text check (pago_ref is null or char_length(pago_ref) <= 80),
  estado_proveedor text check (estado_proveedor is null or char_length(estado_proveedor) <= 40),
  request_id text check (request_id is null or char_length(request_id) <= 80),
  orden_id uuid references public.ordenes_pago (id),
  firma_valida boolean not null,
  live_mode boolean,
  evento text check (evento is null or evento in ('pagado', 'fallido', 'reembolsado', 'disputado', 'disputa_ganada', 'reembolso_parcial')),
  monto_centimos integer,
  moneda text check (moneda is null or char_length(moneda) <= 8),
  resultado text not null check (resultado in ('acreditada', 'ya_acreditada', 'fallida', 'revertida', 'restituida', 'sin_cambio', 'duplicado', 'firma_invalida',
                                               'orden_desconocida', 'monto_distinto', 'estado_invalido', 'ignorado', 'modo_incorrecto', 'reembolso_parcial', 'error')),
  detalle text check (detalle is null or char_length(detalle) <= 500),
  clave_idem text unique,
  created_at timestamptz not null default now()
);
create index if not exists pagos_eventos_orden_idx on public.pagos_eventos (orden_id);
create index if not exists pagos_eventos_reciente_idx on public.pagos_eventos (proveedor, created_at desc);
alter table public.pagos_eventos enable row level security;
revoke all on public.pagos_eventos from public, anon, authenticated;
grant select, insert on public.pagos_eventos to service_role;

create or replace function private.pagos_eventos_inmutable() returns trigger language plpgsql security definer set search_path = '' as $$
begin raise exception 'El registro de avisos de pago es de solo lectura.' using errcode = '42501'; end $$;
drop trigger if exists pagos_eventos_inmutable on public.pagos_eventos;
create trigger pagos_eventos_inmutable before update or delete on public.pagos_eventos for each row execute function private.pagos_eventos_inmutable();

-- 3) Conciliación diaria -----------------------------------------------------------------------------------------------------------------
create table if not exists public.pagos_conciliaciones (
  id bigint generated always as identity primary key,
  proveedor text not null,
  fecha date not null,
  total_proveedor_centimos integer not null,
  total_ordenes_centimos integer not null,
  diferencia_centimos integer not null,
  ordenes_revisadas integer not null default 0,
  ordenes_con_diferencia integer not null default 0,
  estado text not null check (estado in ('ok', 'diferencia')),
  detalle jsonb not null default '{}'::jsonb check (pg_column_size(detalle) <= 8000),
  created_at timestamptz not null default now(),
  unique (proveedor, fecha)
);
alter table public.pagos_conciliaciones enable row level security;
revoke all on public.pagos_conciliaciones from public, anon, authenticated;
grant select, insert, update on public.pagos_conciliaciones to service_role;

-- 4) Puente seguro (solo service_role) ---------------------------------------------------------------------------------------------------
create or replace function private.pasarela_solo_servicio() returns void language plpgsql security definer set search_path = '' as $$
begin
  if coalesce(auth.role(), '') <> 'service_role' and current_user not in ('postgres', 'supabase_admin') then
    raise exception 'Solo el servidor puede usar esta función.' using errcode = '42501';
  end if;
end $$;
revoke all on function private.pasarela_solo_servicio() from public, anon, authenticated;

-- ¿Se superó el límite de velocidad? (120 avisos por minuto por proveedor)
create or replace function private.pasarela_saturada(p_proveedor text) returns boolean language sql security definer set search_path = '' as $$
  select (select count(*) from public.pagos_eventos where proveedor = p_proveedor and created_at > now() - interval '1 minute') >= 120
$$;
revoke all on function private.pasarela_saturada(text) from public, anon, authenticated;

-- Aviso con firma inválida o incompleta: se registra (si no hay saturación) y no se procesa nada.
create or replace function public.pasarela_rechazo(p_proveedor text, p_request_id text, p_detalle text)
returns jsonb language plpgsql security definer set search_path = '' as $$
begin
  perform private.pasarela_solo_servicio();
  if private.pasarela_saturada(p_proveedor) then return jsonb_build_object('resultado', 'limite'); end if;
  insert into public.pagos_eventos (proveedor, request_id, firma_valida, resultado, detalle)
  values (p_proveedor, left(p_request_id, 80), false, 'firma_invalida', left(p_detalle, 500));
  return jsonb_build_object('resultado', 'firma_invalida');
end $$;

-- Procesa un aviso YA VERIFICADO (firma correcta y estado confirmado contra la API del proveedor). Todo en una transacción.
-- p_evento: pagado | fallido | reembolsado | disputado | disputa_ganada | reembolso_parcial | null (estado sin efecto, p. ej. «pendiente»).
create or replace function public.pasarela_procesar(
  p_proveedor text, p_pago_ref text, p_estado_proveedor text, p_request_id text, p_orden text, p_evento text,
  p_monto_centimos integer, p_moneda text, p_live boolean, p_modo text)
returns jsonb language plpgsql security definer set search_path = '' as $$
declare v_orden uuid; o public.ordenes_pago; v_res text; v_clave text; v_det text;
begin
  perform private.pasarela_solo_servicio();
  if private.pasarela_saturada(p_proveedor) then return jsonb_build_object('resultado', 'limite'); end if;
  v_clave := p_proveedor || ':' || coalesce(p_pago_ref, '?') || ':' || coalesce(p_estado_proveedor, '?');
  begin v_orden := p_orden::uuid; exception when others then v_orden := null; end;
  if v_orden is not null then select * into o from public.ordenes_pago where id = v_orden; end if;

  -- Modo: un aviso de pruebas jamás acredita en producción, ni al revés.
  if p_live is distinct from (coalesce(p_modo, 'prueba') = 'produccion') then
    v_res := 'modo_incorrecto'; v_det := 'live_mode=' || coalesce(p_live::text, 'null') || ' pero pasarela_modo=' || coalesce(p_modo, 'null');
  elsif p_evento is null then
    v_res := 'ignorado'; v_det := 'Estado sin efecto: ' || coalesce(p_estado_proveedor, '?');
  elsif exists (select 1 from public.pagos_eventos where clave_idem = v_clave) then
    v_res := 'duplicado'; v_det := 'Aviso ya procesado.';
  elsif o.id is null then
    v_res := 'orden_desconocida'; v_det := 'Referencia sin orden: ' || left(coalesce(p_orden, ''), 60);
  elsif o.metodo is distinct from 'mercadopago' then
    v_res := 'orden_desconocida'; v_det := 'La orden no es de este método de pago.';
  elsif p_evento = 'reembolso_parcial' then
    v_res := 'reembolso_parcial'; v_det := 'Reembolso parcial: requiere revisión manual.';
  else
    begin
      v_res := public.procesar_pago_evento(p_evento, o.id, p_proveedor, p_pago_ref, p_monto_centimos, p_moneda, left('mp:' || coalesce(p_pago_ref, ''), 100));
      v_det := null;
    exception when others then
      v_res := case when sqlerrm like 'El monto o la moneda%' then 'monto_distinto' when sqlerrm like 'La orden está en estado%' then 'estado_invalido' else 'error' end;
      v_det := left(sqlerrm, 300);
    end;
  end if;

  -- Alertas: todo lo que implique dinero recibido sin gemas (o gemas sin dinero) se revisa a mano.
  if v_res in ('monto_distinto', 'estado_invalido') then
    perform private.economia_alertar('critica', 'pasarela_pago_no_acreditado', coalesce(p_pago_ref, v_clave),
      'Mercado Pago confirmó un pago que NO se pudo acreditar (' || v_res || '). Revisar y, si corresponde, reembolsar en Mercado Pago.',
      jsonb_build_object('orden', v_orden, 'pago', p_pago_ref, 'monto_centimos', p_monto_centimos, 'detalle', v_det));
  elsif v_res = 'orden_desconocida' and p_evento = 'pagado' then
    perform private.economia_alertar('alta', 'pasarela_orden_desconocida', coalesce(p_pago_ref, v_clave),
      'Llegó un pago aprobado de Mercado Pago sin orden válida.', jsonb_build_object('pago', p_pago_ref, 'monto_centimos', p_monto_centimos, 'detalle', v_det));
  elsif v_res = 'reembolso_parcial' then
    perform private.economia_alertar('alta', 'pasarela_reembolso_parcial', coalesce(p_pago_ref, v_clave),
      'Hubo un reembolso parcial en Mercado Pago. Las gemas no se tocan solas: decide qué hacer.', jsonb_build_object('orden', v_orden, 'pago', p_pago_ref));
  elsif v_res = 'revertida' then
    perform private.economia_alertar('media', 'pasarela_reversa', coalesce(p_pago_ref, v_clave),
      'Se revirtió una compra por reembolso o disputa.', jsonb_build_object('orden', v_orden, 'pago', p_pago_ref, 'evento', p_evento));
  end if;

  -- Registro: la clave de idempotencia solo se fija para resultados definitivos (un error se puede reintentar).
  begin
    insert into public.pagos_eventos (proveedor, pago_ref, estado_proveedor, request_id, orden_id, firma_valida, live_mode, evento, monto_centimos, moneda, resultado, detalle, clave_idem)
    values (p_proveedor, left(p_pago_ref, 80), left(p_estado_proveedor, 40), left(p_request_id, 80), o.id, true, p_live, p_evento, p_monto_centimos, left(p_moneda, 8), v_res, v_det,
            case when v_res in ('acreditada', 'ya_acreditada', 'fallida', 'revertida', 'restituida', 'sin_cambio', 'reembolso_parcial') then v_clave end);
  exception when unique_violation then
    insert into public.pagos_eventos (proveedor, pago_ref, estado_proveedor, request_id, orden_id, firma_valida, live_mode, evento, monto_centimos, moneda, resultado, detalle)
    values (p_proveedor, left(p_pago_ref, 80), left(p_estado_proveedor, 40), left(p_request_id, 80), o.id, true, p_live, p_evento, p_monto_centimos, left(p_moneda, 8), 'duplicado', 'Aviso simultáneo.');
    v_res := 'duplicado';
  end;
  return jsonb_build_object('resultado', v_res, 'orden', o.id);
end $$;

-- «pago-crear» pide aquí los datos del cobro: monto, moneda y dueño salen SIEMPRE de la base, nunca del navegador.
create or replace function public.pasarela_orden_para_cobro(p_orden uuid, p_usuario uuid)
returns jsonb language plpgsql security definer set search_path = '' as $$
declare o public.ordenes_pago; p public.paquetes_tokens; v_min integer;
begin
  perform private.pasarela_solo_servicio();
  select * into o from public.ordenes_pago where id = p_orden and usuario_id = p_usuario for update;
  if not found then raise exception 'Orden no encontrada.'; end if;
  if o.metodo is distinct from 'mercadopago' then raise exception 'La orden no es de Mercado Pago.'; end if;
  if o.estado <> 'PENDIENTE' then raise exception 'La orden ya no está pendiente.'; end if;
  select * into p from public.paquetes_tokens where id = o.paquete_id;
  v_min := coalesce(nullif(private.config('pasarela_vence_minutos'), '')::integer, 60);
  if o.expira_at is not null and o.expira_at < now() then raise exception 'La orden ya venció.'; end if;
  if o.expira_at is null then update public.ordenes_pago set expira_at = now() + make_interval(mins => v_min), actualizada_at = now() where id = o.id returning * into o; end if;
  return jsonb_build_object('orden', o.id, 'monto_centimos', o.monto_centimos, 'moneda', o.moneda, 'gemas', o.tokens, 'titulo', coalesce(p.nombre, 'Gemas'),
                            'expira_at', o.expira_at, 'checkout_url', o.checkout_url, 'modo', coalesce(private.config('pasarela_modo'), 'prueba'));
end $$;

create or replace function public.pasarela_guardar_checkout(p_orden uuid, p_url text, p_preferencia text)
returns void language plpgsql security definer set search_path = '' as $$
begin
  perform private.pasarela_solo_servicio();
  if p_url !~ '^https://[a-z0-9.-]+\.(mercadopago|mercadolibre)\.[a-z.]+/' then raise exception 'Enlace de pago no válido.'; end if;
  update public.ordenes_pago set checkout_url = p_url, proveedor_ref = coalesce(proveedor_ref, left(p_preferencia, 120)), actualizada_at = now()
   where id = p_orden and estado = 'PENDIENTE' and metodo = 'mercadopago';
end $$;

-- Conciliación: «pago-conciliar» trae el total que confirma Mercado Pago de las órdenes pagadas ese día.
create or replace function public.pasarela_ordenes_dia(p_fecha date)
returns jsonb language plpgsql security definer set search_path = '' as $$
begin
  perform private.pasarela_solo_servicio();
  return coalesce((select jsonb_agg(jsonb_build_object('orden', o.id, 'pago', o.proveedor_ref, 'monto_centimos', o.monto_centimos, 'moneda', o.moneda))
    from public.ordenes_pago o
   where o.metodo = 'mercadopago' and o.estado = 'PAGADA' and (o.pagada_at at time zone 'America/Lima')::date = p_fecha), '[]'::jsonb);
end $$;

-- Red de seguridad: órdenes con enlace de pago que siguen pendientes (por si un aviso nunca llegó).
create or replace function public.pasarela_pendientes_antiguas(p_minutos integer)
returns jsonb language plpgsql security definer set search_path = '' as $$
begin
  perform private.pasarela_solo_servicio();
  return coalesce((select jsonb_agg(jsonb_build_object('orden', o.id, 'monto_centimos', o.monto_centimos, 'moneda', o.moneda))
    from public.ordenes_pago o
   where o.metodo = 'mercadopago' and o.estado = 'PENDIENTE' and o.checkout_url is not null
     and o.created_at < now() - make_interval(mins => greatest(p_minutos, 5)) and o.created_at > now() - interval '7 days'), '[]'::jsonb);
end $$;

create or replace function public.pasarela_conciliar(p_proveedor text, p_fecha date, p_total_proveedor integer, p_revisadas integer, p_con_diferencia integer, p_detalle jsonb)
returns jsonb language plpgsql security definer set search_path = '' as $$
declare v_ord integer; v_dif integer; v_est text;
begin
  perform private.pasarela_solo_servicio();
  select coalesce(sum(monto_centimos), 0) into v_ord from public.ordenes_pago
   where metodo = 'mercadopago' and estado = 'PAGADA' and (pagada_at at time zone 'America/Lima')::date = p_fecha;
  v_dif := p_total_proveedor - v_ord;
  v_est := case when v_dif = 0 and coalesce(p_con_diferencia, 0) = 0 then 'ok' else 'diferencia' end;
  insert into public.pagos_conciliaciones (proveedor, fecha, total_proveedor_centimos, total_ordenes_centimos, diferencia_centimos, ordenes_revisadas, ordenes_con_diferencia, estado, detalle)
  values (p_proveedor, p_fecha, p_total_proveedor, v_ord, v_dif, coalesce(p_revisadas, 0), coalesce(p_con_diferencia, 0), v_est, coalesce(p_detalle, '{}'::jsonb))
  on conflict (proveedor, fecha) do update set total_proveedor_centimos = excluded.total_proveedor_centimos, total_ordenes_centimos = excluded.total_ordenes_centimos,
    diferencia_centimos = excluded.diferencia_centimos, ordenes_revisadas = excluded.ordenes_revisadas, ordenes_con_diferencia = excluded.ordenes_con_diferencia,
    estado = excluded.estado, detalle = excluded.detalle, created_at = now();
  if v_est = 'diferencia' then
    perform private.economia_alertar('critica', 'pasarela_conciliacion', p_proveedor || ':' || p_fecha::text,
      'La conciliación de ' || p_fecha::text || ' no cuadra (diferencia S/ ' || to_char(v_dif / 100.0, 'FM999990.00') || ', ' || coalesce(p_con_diferencia, 0) || ' órdenes con diferencia).',
      jsonb_build_object('fecha', p_fecha, 'diferencia_centimos', v_dif));
  end if;
  return jsonb_build_object('estado', v_est, 'diferencia_centimos', v_dif, 'total_ordenes_centimos', v_ord);
end $$;

-- Permisos: solo el servidor (service_role) puede llamar estas funciones.
do $$ declare f text; begin
  foreach f in array array[
    'public.pasarela_rechazo(text,text,text)',
    'public.pasarela_procesar(text,text,text,text,text,text,integer,text,boolean,text)',
    'public.pasarela_orden_para_cobro(uuid,uuid)', 'public.pasarela_guardar_checkout(uuid,text,text)',
    'public.pasarela_ordenes_dia(date)', 'public.pasarela_pendientes_antiguas(integer)',
    'public.pasarela_conciliar(text,date,integer,integer,integer,jsonb)'] loop
    execute format('revoke all on function %s from public, anon, authenticated', f);
    execute format('grant execute on function %s to service_role', f);
  end loop;
end $$;

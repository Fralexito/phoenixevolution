-- 113 · SEGURIDAD DEL DINERO (3/3) · Vigilancia automática, alertas y freno de emergencia. Depende de 108-112. Plan: docs/SEGURIDAD-ECONOMIA.md.
-- Cada 10 minutos `private.economia_revisar()` comprueba que el libro cuadre con las billeteras, que cada pago tenga sus gemas y cada gema su pago, y busca
-- ajustes o ganancias raras. Si encuentra algo CRÍTICO, apaga los pagos sola (freno de emergencia) y deja una alerta para el administrador.

-- 1) Alertas --------------------------------------------------------------------------------------------------------------------
create table if not exists public.economia_alertas (
  id bigint generated always as identity primary key,
  creada_at timestamptz not null default now(),
  nivel text not null check (nivel in ('critica', 'alta', 'media', 'info')),
  tipo text not null,
  clave text not null default 'global',
  mensaje text not null,
  detalle jsonb not null default '{}'::jsonb,
  resuelta boolean not null default false,
  resuelta_at timestamptz, resuelta_por uuid, nota text check (nota is null or char_length(nota) <= 300)
);
create unique index if not exists economia_alertas_abierta_unica on public.economia_alertas (tipo, clave) where not resuelta;
alter table public.economia_alertas enable row level security;
revoke all on public.economia_alertas from anon, authenticated;

insert into public.economia_config (clave, valor) values ('alerta_ascuas_dia', '400'), ('alerta_ordenes_dia', '6') on conflict (clave) do nothing;

create or replace function private.economia_alertar(p_nivel text, p_tipo text, p_clave text, p_mensaje text, p_detalle jsonb default '{}'::jsonb) returns void
language sql security definer set search_path = '' as $$
  insert into public.economia_alertas (nivel, tipo, clave, mensaje, detalle) values (p_nivel, p_tipo, p_clave, p_mensaje, coalesce(p_detalle, '{}'::jsonb)) on conflict do nothing
$$;
revoke all on function private.economia_alertar(text, text, text, text, jsonb) from public, anon, authenticated;

create or replace function private.economia_autoresolver(p_tipo text, p_clave text default 'global') returns void
language sql security definer set search_path = '' as $$
  update public.economia_alertas set resuelta = true, resuelta_at = now(), nota = 'Se resolvió sola: la comprobación ya no falla.' where tipo = p_tipo and clave = p_clave and not resuelta
$$;
revoke all on function private.economia_autoresolver(text, text) from public, anon, authenticated;

-- 2) La revisión ------------------------------------------------------------------------------------------------------------------
create or replace function private.economia_revisar() returns jsonb
language plpgsql security definer set search_path = '' as $$
declare n integer; v_criticas integer := 0; v_expiradas integer; v_dia timestamptz := date_trunc('day', now() at time zone 'America/Lima') at time zone 'America/Lima'; u record;
        v_tope integer := coalesce(nullif(private.config('recarga_tope_global_diario_centimos'), '')::integer, 200000); v_hoy integer;
begin
  v_expiradas := public.expirar_ordenes_pendientes();
  -- (a) el libro debe cuadrar con las billeteras
  select count(*) into n from private.economia_diferencias();
  if n > 0 then v_criticas := v_criticas + 1; perform private.economia_alertar('critica', 'libro_descuadrado', 'global', 'El libro de movimientos no cuadra con ' || n || ' billetera(s).', jsonb_build_object('diferencias', n));
  else perform private.economia_autoresolver('libro_descuadrado'); end if;
  -- (b) toda orden pagada debe tener sus gemas en el libro
  select count(*) into n from public.ordenes_pago o where o.estado = 'PAGADA' and not exists (select 1 from public.movimientos_tokens m where m.clave = 'pago:' || o.id::text);
  if n > 0 then v_criticas := v_criticas + 1; perform private.economia_alertar('critica', 'orden_pagada_sin_gemas', 'global', n || ' orden(es) figuran como pagadas pero no tienen gemas en el libro.', jsonb_build_object('ordenes', n));
  else perform private.economia_autoresolver('orden_pagada_sin_gemas'); end if;
  -- (c) toda compra de gemas debe venir de una orden real
  select count(*) into n from public.movimientos_tokens m where m.tipo = 'compra_dinero'
     and not exists (select 1 from public.ordenes_pago o where m.clave = 'pago:' || o.id::text and o.estado in ('PAGADA', 'REEMBOLSADA', 'DISPUTADA'));
  if n > 0 then v_criticas := v_criticas + 1; perform private.economia_alertar('critica', 'gemas_sin_orden', 'global', n || ' compra(s) de gemas no tienen una orden de pago válida.', jsonb_build_object('movimientos', n));
  else perform private.economia_autoresolver('gemas_sin_orden'); end if;
  -- (d) billeteras negativas
  select count(*) into n from public.billeteras where saldo < 0 or gemas < 0;
  if n > 0 then perform private.economia_alertar('media', 'billeteras_negativas', 'global', n || ' billetera(s) con saldo negativo (reembolso o disputa).', jsonb_build_object('billeteras', n));
  else perform private.economia_autoresolver('billeteras_negativas'); end if;
  -- (e) pagos esperando revisión más de 24 horas
  select count(*) into n from public.pagos_manuales where estado = 'en_revision' and created_at < now() - interval '24 hours';
  if n > 0 then perform private.economia_alertar('media', 'pagos_sin_revisar', 'global', n || ' pago(s) llevan más de 24 horas esperando tu revisión.', jsonb_build_object('pagos', n));
  else perform private.economia_autoresolver('pagos_sin_revisar'); end if;
  -- (f) gemas creadas a mano por el administrador en las últimas 24 horas (siempre se avisa: es dinero «sin pago»)
  select count(*) into n from public.movimientos_tokens where tipo = 'ajuste_admin' and moneda = 'gemas' and delta > 0 and created_at > now() - interval '24 hours';
  if n > 0 then perform private.economia_alertar('alta', 'ajuste_gemas', to_char(v_dia, 'YYYY-MM-DD'), n || ' ajuste(s) manual(es) que regalan gemas en las últimas 24 horas. Comprueba que fueron intencionales.', jsonb_build_object('ajustes', n)); end if;
  -- (g) ganancias de ascuas fuera de lo normal por persona
  for u in select usuario_id, sum(delta) s from public.movimientos_tokens where tipo = 'ganado' and moneda = 'ascuas' and created_at > now() - interval '24 hours'
           group by usuario_id having sum(delta) > coalesce(nullif(private.config('alerta_ascuas_dia'), '')::integer, 400) loop
    perform private.economia_alertar('alta', 'ganancia_ascuas', u.usuario_id::text || ':' || to_char(v_dia, 'YYYY-MM-DD'), 'Una persona ganó ' || u.s || ' ascuas en 24 horas (lo normal es mucho menos).', jsonb_build_object('usuario', u.usuario_id, 'ascuas', u.s));
  end loop;
  -- (h) demasiadas órdenes de una persona
  for u in select usuario_id, count(*) c from public.ordenes_pago where created_at > now() - interval '24 hours'
           group by usuario_id having count(*) >= coalesce(nullif(private.config('alerta_ordenes_dia'), '')::integer, 6) loop
    perform private.economia_alertar('media', 'muchas_ordenes', u.usuario_id::text || ':' || to_char(v_dia, 'YYYY-MM-DD'), 'Una persona creó ' || u.c || ' órdenes de recarga en 24 horas.', jsonb_build_object('usuario', u.usuario_id, 'ordenes', u.c));
  end loop;
  -- (i) cerca del tope global del día
  select coalesce(sum(monto_centimos), 0) into v_hoy from public.ordenes_pago where created_at >= v_dia and estado in ('PENDIENTE', 'PAGADA');
  if v_hoy >= v_tope * 0.8 then perform private.economia_alertar('info', 'cerca_del_tope', to_char(v_dia, 'YYYY-MM-DD'), 'Las recargas de hoy ya llevan el ' || round(100.0 * v_hoy / v_tope) || ' % del tope diario global.', jsonb_build_object('centimos', v_hoy, 'tope', v_tope)); end if;
  -- FRENO DE EMERGENCIA: algo crítico apaga los pagos y deja constancia
  if v_criticas > 0 and coalesce(private.config('pagos_activos'), 'false') = 'true' then
    update public.economia_config set valor = 'false', updated_at = now() where clave = 'pagos_activos';
    perform private.economia_alertar('critica', 'pagos_pausados_auto', to_char(now() at time zone 'America/Lima', 'YYYY-MM-DD HH24:MI'), 'Los pagos se apagaron solos porque la vigilancia encontró un problema crítico. Revisa las alertas antes de volver a activarlos.', jsonb_build_object('criticas', v_criticas));
  end if;
  return jsonb_build_object('criticas', v_criticas, 'ordenes_expiradas', v_expiradas, 'revisado', now());
end $$;
revoke all on function private.economia_revisar() from public, anon, authenticated;

-- 3) Lo que ve y hace el administrador ---------------------------------------------------------------------------------------------------
create or replace function public.admin_alertas(p_resueltas boolean default false) returns jsonb
language plpgsql stable security definer set search_path = '' as $$
begin
  if not private.es_admin() then raise exception 'Solo el administrador puede ver las alertas.'; end if;
  return coalesce((select jsonb_agg(to_jsonb(a) order by (a.nivel = 'critica') desc, a.creada_at desc) from (select * from public.economia_alertas where resuelta = p_resueltas order by creada_at desc limit 100) a), '[]'::jsonb);
end $$;
revoke all on function public.admin_alertas(boolean) from public, anon;
grant execute on function public.admin_alertas(boolean) to authenticated;

create or replace function public.admin_resolver_alerta(p_id bigint, p_nota text) returns void
language plpgsql security definer set search_path = '' as $$
declare v_nota text := btrim(coalesce(p_nota, ''));
begin
  if not private.admin_seguro() then raise exception 'Solo el administrador puede resolver alertas.'; end if;
  if char_length(v_nota) < 5 then raise exception 'Escribe qué comprobaste o corregiste (mínimo 5 letras).'; end if;
  update public.economia_alertas set resuelta = true, resuelta_at = now(), resuelta_por = (select auth.uid()), nota = left(v_nota, 300) where id = p_id and not resuelta;
  if not found then raise exception 'Esa alerta no existe o ya estaba resuelta.'; end if;
  perform private.auditar_moderacion('editar', 'economia_alertas', p_id::text, 'Alerta de la economía', jsonb_build_object('nota', left(v_nota, 300)), 'Alerta resuelta');
end $$;
revoke all on function public.admin_resolver_alerta(bigint, text) from public, anon;
grant execute on function public.admin_resolver_alerta(bigint, text) to authenticated;

create or replace function public.admin_economia_revisar_ya() returns jsonb
language plpgsql security definer set search_path = '' as $$
begin
  if not private.es_admin() then raise exception 'Solo el administrador puede lanzar la revisión.'; end if;
  return private.economia_revisar();
end $$;
revoke all on function public.admin_economia_revisar_ya() from public, anon;
grant execute on function public.admin_economia_revisar_ya() to authenticated;

-- Encender los pagos exige además cero alertas críticas sin resolver ------------------------------------------------------------------
create or replace function public.admin_set_pagos_activos(p_activo boolean) returns void
language plpgsql security definer set search_path = '' as $$
begin
  if not private.admin_seguro() then raise exception 'Solo el administrador puede activar los pagos.'; end if;
  if coalesce(p_activo, false) then
    if not exists (select 1 from public.pagos_metodos m where m.activo and m.datos <> '{}'::jsonb) then
      raise exception 'No se pueden activar los pagos: ningún método activo tiene datos de pago (número o cuenta).'; end if;
    if exists (select 1 from private.economia_diferencias()) then
      raise exception 'No se pueden activar los pagos: la auditoría encontró diferencias entre el libro y las billeteras.'; end if;
    if exists (select 1 from public.economia_alertas where nivel = 'critica' and not resuelta) then
      raise exception 'No se pueden activar los pagos: hay alertas críticas sin resolver.'; end if;
  end if;
  update public.economia_config set valor = case when coalesce(p_activo, false) then 'true' else 'false' end, updated_at = now() where clave = 'pagos_activos';
  perform private.auditar_moderacion('sistema', 'economia_config', 'pagos_activos', 'Pagos con dinero real', jsonb_build_object('activo', coalesce(p_activo, false)), 'Interruptor de pagos');
end $$;
revoke all on function public.admin_set_pagos_activos(boolean) from public, anon;
grant execute on function public.admin_set_pagos_activos(boolean) to authenticated;

-- 4) Tareas programadas ---------------------------------------------------------------------------------------------------------------
select cron.unschedule(jobid) from cron.job where jobname in ('economia_revisar_cada_10_min', 'economia_expirar_ordenes');
select cron.schedule('economia_revisar_cada_10_min', '*/10 * * * *', 'select private.economia_revisar()');
select cron.schedule('economia_expirar_ordenes', '*/15 * * * *', 'select public.expirar_ordenes_pendientes()');

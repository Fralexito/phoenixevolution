-- 111 · SEGURIDAD DEL DINERO (1/3) · Integridad: permisos mínimos, libro inmutable, máquina de estados de las órdenes y bitácora de la configuración.
-- Plan: docs/SEGURIDAD-ECONOMIA.md. Depende de 049, 051, 065, 109.
-- Idea: aunque alguien (o un error) llegue a ejecutar SQL directo, el libro de movimientos NO se puede reescribir, una orden pagada NO cambia de monto ni de dueño,
-- y cada cambio de configuración deja huella. Las correcciones se hacen con movimientos nuevos (reembolso, ajuste), nunca editando el pasado.

-- 1) Permisos mínimos --------------------------------------------------------------------------------------------------------
-- apuestas_reto: solo se LEE (la seguridad por filas decide qué filas); escribir solo mediante las funciones del reto.
revoke all on public.apuestas_reto from anon;
revoke insert, update, delete, truncate, references, trigger on public.apuestas_reto from authenticated;
grant select on public.apuestas_reto to authenticated;
-- Tablas de dinero: cerradas a anon y authenticated (ya lo estaban; se reafirma para que no se pierda en un cambio futuro).
revoke all on public.billeteras, public.movimientos_tokens, public.ordenes_pago, public.pagos_manuales, public.pagos_metodos, public.paquetes_tokens,
  public.tienda_items, public.inventario, public.economia_config, public.economia_reglas, public.xp_totales, public.xp_movimientos, public.aceptaciones_legales
  from anon, authenticated;

-- 2) Libro de movimientos inmutable --------------------------------------------------------------------------------------------
create or replace function private.libro_inmutable() returns trigger language plpgsql security definer set search_path = '' as $$
begin
  -- Única excepción: el borrado en cascada cuando se elimina la cuenta de la persona (el padre ya no existe).
  if tg_op = 'DELETE' and not exists (select 1 from auth.users u where u.id = old.usuario_id) then return old; end if;
  raise exception 'El libro de movimientos es de solo lectura: corrige con un movimiento nuevo (reembolso o ajuste).' using errcode = '42501';
end $$;
revoke all on function private.libro_inmutable() from public, anon, authenticated;
drop trigger if exists trg_libro_no_modificar on public.movimientos_tokens;
create trigger trg_libro_no_modificar before update or delete on public.movimientos_tokens for each row execute function private.libro_inmutable();
drop trigger if exists trg_libro_no_truncar on public.movimientos_tokens;
create trigger trg_libro_no_truncar before truncate on public.movimientos_tokens for each statement execute function private.libro_inmutable();

-- 3) Órdenes de pago: datos fijos y estados permitidos ---------------------------------------------------------------------------
--   PENDIENTE → PAGADA | FALLIDA | EXPIRADA | CANCELADA      FALLIDA → PAGADA (el pago llegó tarde)
--   PAGADA → REEMBOLSADA | DISPUTADA                          DISPUTADA → PAGADA (disputa ganada) | REEMBOLSADA
--   EXPIRADA, CANCELADA y REEMBOLSADA son finales.
create or replace function private.orden_pago_guardia() returns trigger language plpgsql security definer set search_path = '' as $$
begin
  if tg_op = 'DELETE' then raise exception 'Las órdenes de pago no se borran.' using errcode = '42501'; end if;
  if new.usuario_id is distinct from old.usuario_id or new.paquete_id is distinct from old.paquete_id or new.tokens is distinct from old.tokens
     or new.monto_centimos is distinct from old.monto_centimos or new.moneda is distinct from old.moneda or new.created_at is distinct from old.created_at then
    raise exception 'Una orden de pago no puede cambiar de dueño, paquete, monto ni moneda.' using errcode = '42501';
  end if;
  if old.metodo is not null and new.metodo is distinct from old.metodo then raise exception 'El método de pago de una orden no se cambia.' using errcode = '42501'; end if;
  if new.estado is distinct from old.estado and not (
       (old.estado = 'PENDIENTE' and new.estado in ('PAGADA', 'FALLIDA', 'EXPIRADA', 'CANCELADA'))
    or (old.estado = 'FALLIDA' and new.estado = 'PAGADA')
    or (old.estado = 'PAGADA' and new.estado in ('REEMBOLSADA', 'DISPUTADA'))
    or (old.estado = 'DISPUTADA' and new.estado in ('PAGADA', 'REEMBOLSADA'))) then
    raise exception 'Cambio de estado no permitido: % → %.', old.estado, new.estado using errcode = '42501';
  end if;
  return new;
end $$;
revoke all on function private.orden_pago_guardia() from public, anon, authenticated;
drop trigger if exists trg_orden_pago_guardia on public.ordenes_pago;
create trigger trg_orden_pago_guardia before update or delete on public.ordenes_pago for each row execute function private.orden_pago_guardia();

-- 4) Pagos manuales: decisiones finales y nada se borra sin dejar copia ------------------------------------------------------------
create table if not exists public.pagos_manuales_historial (
  id bigint generated always as identity primary key,
  orden_id uuid not null,
  datos jsonb not null,
  borrado_at timestamptz not null default now()
);
alter table public.pagos_manuales_historial enable row level security;
revoke all on public.pagos_manuales_historial from anon, authenticated;

create or replace function private.pago_manual_guardia() returns trigger language plpgsql security definer set search_path = '' as $$
begin
  if tg_op = 'DELETE' then
    if old.estado <> 'rechazado' then raise exception 'Solo se puede reemplazar un comprobante ya rechazado.' using errcode = '42501'; end if;
    insert into public.pagos_manuales_historial (orden_id, datos) values (old.orden_id, to_jsonb(old));
    return old;
  end if;
  if new.orden_id is distinct from old.orden_id or new.usuario_id is distinct from old.usuario_id or new.referencia is distinct from old.referencia
     or new.created_at is distinct from old.created_at then
    raise exception 'Un comprobante no puede cambiar de orden, de dueño ni de código de operación.' using errcode = '42501';
  end if;
  if new.estado is distinct from old.estado and old.estado <> 'en_revision' then
    raise exception 'La decisión sobre un pago ya tomada no se cambia.' using errcode = '42501';
  end if;
  return new;
end $$;
revoke all on function private.pago_manual_guardia() from public, anon, authenticated;
drop trigger if exists trg_pago_manual_guardia on public.pagos_manuales;
create trigger trg_pago_manual_guardia before update or delete on public.pagos_manuales for each row execute function private.pago_manual_guardia();

-- 5) Bitácora de la configuración del dinero (quién cambió qué y cuándo) ----------------------------------------------------------------
create table if not exists public.economia_config_log (
  id bigint generated always as identity primary key,
  clave text not null, valor_anterior text, valor_nuevo text,
  quien uuid, cuando timestamptz not null default now()
);
alter table public.economia_config_log enable row level security;
revoke all on public.economia_config_log from anon, authenticated;
create or replace function private.economia_config_bitacora() returns trigger language plpgsql security definer set search_path = '' as $$
begin
  if tg_op = 'INSERT' or new.valor is distinct from old.valor then
    insert into public.economia_config_log (clave, valor_anterior, valor_nuevo, quien)
    values (new.clave, case when tg_op = 'UPDATE' then old.valor end, new.valor, (select auth.uid()));
  end if;
  return new;
end $$;
revoke all on function private.economia_config_bitacora() from public, anon, authenticated;
drop trigger if exists trg_economia_config_bitacora on public.economia_config;
create trigger trg_economia_config_bitacora after insert or update on public.economia_config for each row execute function private.economia_config_bitacora();

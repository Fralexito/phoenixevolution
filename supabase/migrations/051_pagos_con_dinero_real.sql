-- 051 · ECONOMÍA (3/3) · COMPRA DE TOKENS CON DINERO REAL. Depende de 049 (registrar_movimiento) y 048 (categoria_edad).
-- Flujo: el adulto acepta los términos → crea una ORDEN (PENDIENTE) → paga en la pasarela → la pasarela avisa a la Edge Function `pago-webhook` (firma verificada) → esa función llama a `procesar_pago_evento` con la clave de servicio → se acreditan los tokens UNA sola vez.
-- Interruptor maestro `pagos_activos` (apagado de fábrica): mientras esté apagado nadie puede crear órdenes.
-- Sin retiro de dinero, sin transferencias entre personas: el dinero solo compra tokens y los tokens solo compran cosméticos.
-- Reembolso o contracargo: se descuentan los tokens (el saldo puede quedar negativo y bloquea compras hasta que se compense con ganancias o con otra compra).

create table if not exists public.economia_config (clave text primary key, valor text not null, updated_at timestamptz not null default now());
insert into public.economia_config (clave, valor) values ('pagos_activos', 'false'), ('version_terminos', '1') on conflict (clave) do nothing;

create table if not exists public.paquetes_tokens (
  id bigint generated always as identity primary key,
  clave text not null unique check (clave ~ '^[a-z0-9_]{3,40}$'),
  nombre text not null check (char_length(nombre) between 3 and 40),
  tokens integer not null check (tokens between 1 and 1000000),
  precio_centimos integer not null check (precio_centimos between 100 and 100000000),
  moneda text not null default 'PEN' check (moneda ~ '^[A-Z]{3}$'),
  activo boolean not null default true,
  created_at timestamptz not null default now()
);
insert into public.paquetes_tokens (clave, nombre, tokens, precio_centimos) values
  ('pack_100', '100 tokens', 100, 500), ('pack_550', '550 tokens', 550, 2500), ('pack_1200', '1200 tokens', 1200, 5000) on conflict (clave) do nothing;

create table if not exists public.ordenes_pago (
  id uuid primary key default gen_random_uuid(),
  usuario_id uuid not null references auth.users(id) on delete restrict,
  paquete_id bigint not null references public.paquetes_tokens(id),
  tokens integer not null, monto_centimos integer not null, moneda text not null,
  estado text not null default 'PENDIENTE' check (estado in ('PENDIENTE', 'PAGADA', 'FALLIDA', 'REEMBOLSADA', 'DISPUTADA')),
  proveedor text, proveedor_ref text, comprobante_ref text,
  created_at timestamptz not null default now(), pagada_at timestamptz, actualizada_at timestamptz not null default now()
);
create unique index if not exists ordenes_proveedor_ref_idx on public.ordenes_pago (proveedor, proveedor_ref) where proveedor_ref is not null;
create index if not exists ordenes_usuario_idx on public.ordenes_pago (usuario_id, created_at desc);

create table if not exists public.aceptaciones_legales (
  usuario_id uuid not null references auth.users(id) on delete cascade,
  documento text not null check (documento in ('terminos_compra')),
  version text not null, aceptado_at timestamptz not null default now(),
  primary key (usuario_id, documento, version)
);
alter table public.economia_config enable row level security; alter table public.paquetes_tokens enable row level security;
alter table public.ordenes_pago enable row level security; alter table public.aceptaciones_legales enable row level security;
revoke all on public.economia_config, public.paquetes_tokens, public.ordenes_pago, public.aceptaciones_legales from anon, authenticated;

create or replace function private.config(p_clave text) returns text language sql stable security definer set search_path = '' as $$
  select valor from public.economia_config where clave = p_clave $$;
revoke all on function private.config(text) from public, anon, authenticated;

-- ─── Lectura ─────────────────────────────────────────────────────────────────────────────────────
create or replace function public.paquetes_lista() returns jsonb
language plpgsql stable security definer set search_path = '' as $$
declare yo uuid := (select auth.uid()); v text := private.config('version_terminos');
begin
  return jsonb_build_object(
    'pagos_activos', coalesce(private.config('pagos_activos'), 'false') = 'true',
    'version_terminos', v,
    'terminos_aceptados', yo is not null and exists (select 1 from public.aceptaciones_legales where usuario_id = yo and documento = 'terminos_compra' and version = v),
    'edad', case when yo is null then null else private.categoria_edad(yo) end,
    'paquetes', coalesce((select jsonb_agg(jsonb_build_object('id', id, 'clave', clave, 'nombre', nombre, 'tokens', tokens, 'precio_centimos', precio_centimos, 'moneda', moneda) order by precio_centimos) from public.paquetes_tokens where activo), '[]'::jsonb));
end $$;

create or replace function public.mis_ordenes(p_limite integer default 20) returns jsonb
language plpgsql stable security definer set search_path = '' as $$
declare yo uuid := private.uid_requerido();
begin
  return coalesce((select jsonb_agg(to_jsonb(o) order by o.created_at desc) from (
    select o.id, p.nombre as paquete, o.tokens, o.monto_centimos, o.moneda, o.estado, o.created_at, o.pagada_at
    from public.ordenes_pago o join public.paquetes_tokens p on p.id = o.paquete_id where o.usuario_id = yo order by o.created_at desc limit greatest(1, least(coalesce(p_limite, 20), 50))) o), '[]'::jsonb);
end $$;

-- ─── Términos y creación de orden ────────────────────────────────────────────────────────────────
create or replace function public.aceptar_terminos_compra() returns void
language plpgsql security definer set search_path = '' as $$
declare yo uuid := private.uid_requerido();
begin
  if private.categoria_edad(yo) <> 'adulto' then raise exception 'Solo las personas mayores de 18 años, con fecha de nacimiento declarada, pueden comprar con dinero real.'; end if;
  insert into public.aceptaciones_legales (usuario_id, documento, version) values (yo, 'terminos_compra', private.config('version_terminos')) on conflict do nothing;
end $$;

create or replace function public.crear_orden(p_paquete bigint) returns jsonb
language plpgsql security definer set search_path = '' as $$
declare yo uuid := private.uid_requerido(); p public.paquetes_tokens; oid uuid;
begin
  if coalesce(private.config('pagos_activos'), 'false') <> 'true' then raise exception 'Las compras con dinero real aún no están activas.'; end if;
  if private.categoria_edad(yo) <> 'adulto' then raise exception 'Solo las personas mayores de 18 años, con fecha de nacimiento declarada, pueden comprar con dinero real.'; end if;
  if not exists (select 1 from public.aceptaciones_legales where usuario_id = yo and documento = 'terminos_compra' and version = private.config('version_terminos')) then raise exception 'Primero debes aceptar los términos de compra.'; end if;
  if (private.sancion_vigente(yo)).id is not null then raise exception 'Tu cuenta tiene una sanción activa.'; end if;
  select * into p from public.paquetes_tokens where id = p_paquete and activo;
  if not found then raise exception 'Ese paquete no está disponible.'; end if;
  if (select count(*) from public.ordenes_pago where usuario_id = yo and estado = 'PENDIENTE' and created_at > now() - interval '1 hour') >= 5 then raise exception 'Tienes demasiadas órdenes pendientes. Espera un rato.'; end if;
  insert into public.ordenes_pago (usuario_id, paquete_id, tokens, monto_centimos, moneda) values (yo, p.id, p.tokens, p.precio_centimos, p.moneda) returning id into oid;
  return jsonb_build_object('orden', oid, 'monto_centimos', p.precio_centimos, 'moneda', p.moneda, 'tokens', p.tokens);
end $$;

-- ─── Evento de la pasarela (SOLO clave de servicio; lo llama la Edge Function tras verificar la firma) ───
-- p_evento: pagado | fallido | reembolsado | disputado | disputa_ganada. Idempotente: repetir el aviso no repite el efecto.
create or replace function public.procesar_pago_evento(p_evento text, p_orden uuid, p_proveedor text, p_proveedor_ref text, p_monto_centimos integer, p_moneda text, p_comprobante text) returns text
language plpgsql security definer set search_path = '' as $$
declare o public.ordenes_pago;
begin
  select * into o from public.ordenes_pago where id = p_orden for update;
  if not found then raise exception 'Orden desconocida.'; end if;
  if p_evento = 'pagado' then
    if o.estado = 'PAGADA' then return 'ya_acreditada'; end if;
    if o.estado not in ('PENDIENTE', 'FALLIDA') then raise exception 'La orden está en estado % y no puede acreditarse.', o.estado; end if;
    if p_monto_centimos is distinct from o.monto_centimos or p_moneda is distinct from o.moneda then raise exception 'El monto o la moneda no coinciden con la orden.'; end if;
    perform private.registrar_movimiento(o.usuario_id, o.tokens, 'compra_dinero', coalesce(p_proveedor, 'pasarela'), o.id::text, 'pago:' || o.id::text);
    update public.ordenes_pago set estado = 'PAGADA', proveedor = p_proveedor, proveedor_ref = p_proveedor_ref, comprobante_ref = p_comprobante, pagada_at = now(), actualizada_at = now() where id = o.id;
    perform private.notificar(o.usuario_id, 'LOGRO', 'Compra acreditada', 'Se añadieron ' || o.tokens || ' tokens a tu billetera.');
    return 'acreditada';
  elsif p_evento = 'fallido' then
    if o.estado = 'PENDIENTE' then update public.ordenes_pago set estado = 'FALLIDA', actualizada_at = now() where id = o.id; end if;
    return 'fallida';
  elsif p_evento in ('reembolsado', 'disputado') then
    if o.estado not in ('PAGADA') then return 'sin_cambio'; end if;
    perform private.registrar_movimiento(o.usuario_id, -o.tokens, 'reembolso', coalesce(o.proveedor, 'pasarela'), o.id::text, 'reversa:' || o.id::text);
    update public.ordenes_pago set estado = case p_evento when 'reembolsado' then 'REEMBOLSADA' else 'DISPUTADA' end, actualizada_at = now() where id = o.id;
    perform private.notificar(o.usuario_id, 'LOGRO', 'Compra revertida', 'Se descontaron ' || o.tokens || ' tokens por un reembolso o disputa.');
    return 'revertida';
  elsif p_evento = 'disputa_ganada' then
    if o.estado <> 'DISPUTADA' then return 'sin_cambio'; end if;
    perform private.registrar_movimiento(o.usuario_id, o.tokens, 'devolucion', coalesce(o.proveedor, 'pasarela'), o.id::text, 'disputa_ganada:' || o.id::text);
    update public.ordenes_pago set estado = 'PAGADA', actualizada_at = now() where id = o.id;
    return 'restituida';
  end if;
  raise exception 'Evento desconocido: %', p_evento;
end $$;

-- ─── Administración ──────────────────────────────────────────────────────────────────────────────
create or replace function public.admin_economia_resumen() returns jsonb
language plpgsql stable security definer set search_path = '' as $$
begin
  if not private.es_admin() then raise exception 'Solo el administrador puede ver el resumen económico.'; end if;
  return jsonb_build_object(
    'pagos_activos', coalesce(private.config('pagos_activos'), 'false') = 'true',
    'tokens_en_circulacion', coalesce((select sum(saldo) from public.billeteras), 0),
    'billeteras_negativas', (select count(*) from public.billeteras where saldo < 0),
    'ordenes', coalesce((select jsonb_object_agg(estado, n) from (select estado, count(*) n from public.ordenes_pago group by estado) x), '{}'::jsonb),
    'ingresos_centimos', coalesce((select sum(monto_centimos) from public.ordenes_pago where estado = 'PAGADA'), 0),
    'ultimas', coalesce((select jsonb_agg(to_jsonb(u)) from (select o.id, private.nombre(o.usuario_id) as usuario, o.tokens, o.monto_centimos, o.moneda, o.estado, o.created_at from public.ordenes_pago o order by o.created_at desc limit 20) u), '[]'::jsonb));
end $$;

create or replace function public.admin_set_pagos_activos(p_activo boolean) returns void
language plpgsql security definer set search_path = '' as $$
begin
  if not private.es_admin() then raise exception 'Solo el administrador puede activar los pagos.'; end if;
  update public.economia_config set valor = case when coalesce(p_activo, false) then 'true' else 'false' end, updated_at = now() where clave = 'pagos_activos';
  perform private.auditar_moderacion('sistema', 'economia_config', 'pagos_activos', 'Pagos con dinero real', jsonb_build_object('activo', coalesce(p_activo, false)), 'Interruptor de pagos');
end $$;

create or replace function public.admin_guardar_paquete(p_id bigint, p_clave text, p_nombre text, p_tokens integer, p_precio_centimos integer, p_moneda text, p_activo boolean) returns bigint
language plpgsql security definer set search_path = '' as $$
declare v_id bigint := p_id;
begin
  if not private.es_admin() then raise exception 'Solo el administrador puede editar paquetes.'; end if;
  if v_id is null then
    insert into public.paquetes_tokens (clave, nombre, tokens, precio_centimos, moneda, activo) values (p_clave, btrim(p_nombre), p_tokens, p_precio_centimos, coalesce(p_moneda, 'PEN'), coalesce(p_activo, true)) returning paquetes_tokens.id into v_id;
    perform private.auditar_moderacion('crear', 'paquetes_tokens', v_id::text, btrim(p_nombre), jsonb_build_object('tokens', p_tokens, 'precio', p_precio_centimos), 'Nuevo paquete');
  else
    update public.paquetes_tokens set nombre = btrim(p_nombre), tokens = p_tokens, precio_centimos = p_precio_centimos, moneda = coalesce(p_moneda, moneda), activo = coalesce(p_activo, true) where paquetes_tokens.id = v_id;
    if not found then raise exception 'El paquete no existe.'; end if;
    perform private.auditar_moderacion('editar', 'paquetes_tokens', v_id::text, btrim(p_nombre), jsonb_build_object('tokens', p_tokens, 'precio', p_precio_centimos, 'activo', p_activo), 'Cambio de paquete');
  end if;
  return v_id;
exception when unique_violation then raise exception 'Ya existe un paquete con esa clave.';
end $$;

-- ─── Permisos ────────────────────────────────────────────────────────────────────────────────────
revoke all on function public.paquetes_lista(), public.mis_ordenes(integer), public.aceptar_terminos_compra(), public.crear_orden(bigint),
  public.procesar_pago_evento(text, uuid, text, text, integer, text, text), public.admin_economia_resumen(), public.admin_set_pagos_activos(boolean),
  public.admin_guardar_paquete(bigint, text, text, integer, integer, text, boolean) from public, anon, authenticated;
grant execute on function public.paquetes_lista() to anon, authenticated;
grant execute on function public.mis_ordenes(integer), public.aceptar_terminos_compra(), public.crear_orden(bigint), public.admin_economia_resumen(), public.admin_set_pagos_activos(boolean),
  public.admin_guardar_paquete(bigint, text, text, integer, integer, text, boolean) to authenticated;
do $$ begin
  if exists (select 1 from pg_roles where rolname = 'service_role') then
    grant execute on function public.procesar_pago_evento(text, uuid, text, text, integer, text, text) to service_role;
  end if;
end $$;

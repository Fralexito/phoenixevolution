-- 109 · RECARGAS (R1) · Pago manual (Yape / Plin / transferencia) con cola de revisión del administrador.
-- Diseño: docs/DISENO-RECARGAS.md. Depende de 051 (ordenes_pago, procesar_pago_evento) y 108.
-- Principios: los pagos siguen apagados mientras `pagos_activos` sea 'false'. Las gemas SOLO se acreditan a través de procesar_pago_evento (idempotente).
-- El monto lo fija el servidor (paquete). Comprobantes en un bucket privado. Todo cerrado: solo funciones. Preparado para añadir pasarelas
-- (tarjeta, Yape, PagoEfectivo, internacionales) sin tocar esta lógica: cada método nuevo es una fila de `pagos_metodos` + un adaptador.

-- 1) Métodos de pago ------------------------------------------------------------------------------------------------------
create table if not exists public.pagos_metodos (
  clave text primary key check (clave ~ '^[a-z0-9_]{3,40}$'),
  nombre text not null check (char_length(nombre) between 2 and 60),
  tipo text not null check (tipo in ('pasarela', 'efectivo', 'manual')),
  proveedor text,
  activo boolean not null default false,
  orden integer not null default 100,
  minimo_centimos integer not null default 0 check (minimo_centimos >= 0),
  maximo_centimos integer check (maximo_centimos is null or maximo_centimos >= minimo_centimos),
  comision_pct numeric(5, 2) not null default 0 check (comision_pct >= 0),
  comision_fija_centimos integer not null default 0 check (comision_fija_centimos >= 0),
  instrucciones text check (instrucciones is null or char_length(instrucciones) <= 600),
  datos jsonb not null default '{}'::jsonb check (jsonb_typeof(datos) = 'object' and pg_column_size(datos) <= 2000),
  created_at timestamptz not null default now()
);
alter table public.pagos_metodos enable row level security;
revoke all on public.pagos_metodos from anon, authenticated;

insert into public.pagos_metodos (clave, nombre, tipo, proveedor, activo, orden, minimo_centimos, instrucciones) values
  ('manual_yape', 'Yape (pago manual)', 'manual', 'yape', false, 10, 500, 'Yapea el monto exacto, luego sube la captura y escribe el código de operación. Un administrador lo revisa.'),
  ('manual_plin', 'Plin (pago manual)', 'manual', 'plin', false, 20, 500, 'Paga con Plin el monto exacto, luego sube la captura y escribe el código de operación.'),
  ('manual_transferencia', 'Transferencia bancaria (pago manual)', 'manual', 'banco', false, 30, 1000, 'Transfiere el monto exacto, luego sube el comprobante y escribe el número de operación.')
on conflict (clave) do nothing;

insert into public.economia_config (clave, valor) values ('recarga_tope_diario_centimos', '20000'), ('recarga_horas_vencimiento_manual', '24')
on conflict (clave) do nothing;

-- 2) Órdenes: estados nuevos y columnas ------------------------------------------------------------------------------------
alter table public.ordenes_pago drop constraint if exists ordenes_pago_estado_check;
alter table public.ordenes_pago add constraint ordenes_pago_estado_check
  check (estado in ('PENDIENTE', 'PAGADA', 'FALLIDA', 'REEMBOLSADA', 'DISPUTADA', 'EXPIRADA', 'CANCELADA'));
alter table public.ordenes_pago add column if not exists metodo text references public.pagos_metodos (clave);
alter table public.ordenes_pago add column if not exists expira_at timestamptz;
alter table public.ordenes_pago add column if not exists checkout_url text;
alter table public.ordenes_pago add column if not exists cip text;

-- 3) Pagos manuales ------------------------------------------------------------------------------------------------------------
create table if not exists public.pagos_manuales (
  orden_id uuid primary key references public.ordenes_pago (id) on delete restrict,
  usuario_id uuid not null references auth.users (id) on delete restrict,
  referencia text not null check (char_length(referencia) between 4 and 40),
  comprobante_path text,
  estado text not null default 'en_revision' check (estado in ('en_revision', 'aprobado', 'rechazado')),
  revisado_por uuid references auth.users (id),
  revisado_at timestamptz,
  nota text check (nota is null or char_length(nota) <= 300),
  created_at timestamptz not null default now()
);
create unique index if not exists pagos_manuales_referencia_unica on public.pagos_manuales (lower(referencia)) where estado <> 'rechazado';
alter table public.pagos_manuales enable row level security;
revoke all on public.pagos_manuales from anon, authenticated;

-- 4) Lo que ve el jugador -----------------------------------------------------------------------------------------------------
create or replace function public.pagos_metodos_lista() returns jsonb
language plpgsql stable security definer set search_path = '' as $$
begin
  perform private.uid_requerido();
  return coalesce((select jsonb_agg(jsonb_build_object('clave', m.clave, 'nombre', m.nombre, 'tipo', m.tipo, 'minimo_centimos', m.minimo_centimos,
            'maximo_centimos', m.maximo_centimos, 'instrucciones', m.instrucciones, 'datos', m.datos) order by m.orden, m.clave)
    from public.pagos_metodos m where m.activo), '[]'::jsonb);
end $$;
revoke all on function public.pagos_metodos_lista() from public, anon;
grant execute on function public.pagos_metodos_lista() to authenticated;

create or replace function public.crear_orden_metodo(p_paquete bigint, p_metodo text) returns jsonb
language plpgsql security definer set search_path = '' as $$
declare yo uuid := private.uid_requerido(); p public.paquetes_tokens; m public.pagos_metodos; oid uuid; v_exp timestamptz; v_tope integer; v_hoy integer;
begin
  if coalesce(private.config('pagos_activos'), 'false') <> 'true' then raise exception 'Las compras con dinero real aún no están activas.'; end if;
  if private.categoria_edad(yo) <> 'adulto' then raise exception 'Solo las personas mayores de 18 años, con fecha de nacimiento declarada, pueden comprar con dinero real.'; end if;
  if not exists (select 1 from public.aceptaciones_legales where usuario_id = yo and documento = 'terminos_compra' and version = private.config('version_terminos')) then
    raise exception 'Primero debes aceptar los términos de compra.'; end if;
  if (private.sancion_vigente(yo)).id is not null then raise exception 'Tu cuenta tiene una sanción activa.'; end if;
  select * into m from public.pagos_metodos where clave = p_metodo and activo;
  if not found then raise exception 'Ese método de pago no está disponible.'; end if;
  select * into p from public.paquetes_tokens where id = p_paquete and activo;
  if not found then raise exception 'Ese paquete no está disponible.'; end if;
  if p.precio_centimos < m.minimo_centimos then raise exception 'Con este método el mínimo es S/ %.', to_char(m.minimo_centimos / 100.0, 'FM999990.00'); end if;
  if m.maximo_centimos is not null and p.precio_centimos > m.maximo_centimos then raise exception 'Con este método el máximo es S/ %.', to_char(m.maximo_centimos / 100.0, 'FM999990.00'); end if;
  if (select count(*) from public.ordenes_pago where usuario_id = yo and estado = 'PENDIENTE' and created_at > now() - interval '1 hour') >= 5 then
    raise exception 'Tienes demasiadas órdenes pendientes. Espera un rato.'; end if;
  v_tope := coalesce(nullif(private.config('recarga_tope_diario_centimos'), '')::integer, 20000);
  select coalesce(sum(monto_centimos), 0) into v_hoy from public.ordenes_pago
   where usuario_id = yo and created_at >= date_trunc('day', now() at time zone 'America/Lima') at time zone 'America/Lima' and estado in ('PENDIENTE', 'PAGADA');
  if v_hoy + p.precio_centimos > v_tope then raise exception 'Superas el tope diario de recargas.'; end if;
  v_exp := case when m.tipo = 'manual' then now() + make_interval(hours => coalesce(nullif(private.config('recarga_horas_vencimiento_manual'), '')::integer, 24)) end;
  insert into public.ordenes_pago (usuario_id, paquete_id, tokens, monto_centimos, moneda, metodo, expira_at, proveedor)
  values (yo, p.id, p.tokens, p.precio_centimos, p.moneda, m.clave, v_exp, m.proveedor) returning id into oid;
  return jsonb_build_object('orden', oid, 'monto_centimos', p.precio_centimos, 'moneda', p.moneda, 'gemas', p.tokens, 'metodo', m.clave,
    'tipo', m.tipo, 'instrucciones', m.instrucciones, 'datos', m.datos, 'expira_at', v_exp);
end $$;
revoke all on function public.crear_orden_metodo(bigint, text) from public, anon;
grant execute on function public.crear_orden_metodo(bigint, text) to authenticated;

create or replace function public.enviar_comprobante_manual(p_orden uuid, p_referencia text, p_comprobante_path text default null) returns void
language plpgsql security definer set search_path = '' as $$
declare yo uuid := private.uid_requerido(); o public.ordenes_pago; m public.pagos_metodos; ref text := btrim(coalesce(p_referencia, ''));
begin
  select * into o from public.ordenes_pago where id = p_orden and usuario_id = yo for update;
  if not found then raise exception 'Esa orden no existe.'; end if;
  select * into m from public.pagos_metodos where clave = o.metodo;
  if m.tipo is distinct from 'manual' then raise exception 'Esta orden no es de pago manual.'; end if;
  if o.estado <> 'PENDIENTE' then raise exception 'Esta orden ya no está pendiente.'; end if;
  if o.expira_at is not null and o.expira_at < now() then raise exception 'Esta orden venció. Crea una nueva.'; end if;
  if ref !~ '^[A-Za-z0-9-]{4,40}$' then raise exception 'El código de operación solo lleva letras, números y guiones (4 a 40 caracteres).'; end if;
  if p_comprobante_path is not null and (left(p_comprobante_path, 37) <> yo::text || '/' or char_length(p_comprobante_path) > 200) then raise exception 'La imagen del comprobante no es válida.'; end if;
  if exists (select 1 from public.pagos_manuales where orden_id = o.id and estado = 'en_revision') then raise exception 'Ya enviaste el comprobante; espera la revisión.'; end if;
  delete from public.pagos_manuales where orden_id = o.id and estado = 'rechazado';
  insert into public.pagos_manuales (orden_id, usuario_id, referencia, comprobante_path) values (o.id, yo, ref, p_comprobante_path);
exception when unique_violation then raise exception 'Ese código de operación ya fue usado.';
end $$;
revoke all on function public.enviar_comprobante_manual(uuid, text, text) from public, anon;
grant execute on function public.enviar_comprobante_manual(uuid, text, text) to authenticated;

create or replace function public.mis_pagos_manuales() returns jsonb
language plpgsql stable security definer set search_path = '' as $$
declare yo uuid := private.uid_requerido();
begin
  return coalesce((select jsonb_agg(jsonb_build_object('orden', o.id, 'metodo', o.metodo, 'monto_centimos', o.monto_centimos, 'gemas', o.tokens, 'estado_orden', o.estado,
            'expira_at', o.expira_at, 'creada', o.created_at, 'comprobante', pm.estado, 'nota', pm.nota) order by o.created_at desc)
    from public.ordenes_pago o left join public.pagos_manuales pm on pm.orden_id = o.id
    where o.usuario_id = yo and o.metodo in (select clave from public.pagos_metodos where tipo = 'manual')), '[]'::jsonb);
end $$;
revoke all on function public.mis_pagos_manuales() from public, anon;
grant execute on function public.mis_pagos_manuales() to authenticated;

-- 5) Gestión del administrador ------------------------------------------------------------------------------------------------
create or replace function public.admin_pagos_manuales(p_estado text default 'en_revision') returns jsonb
language plpgsql stable security definer set search_path = '' as $$
begin
  if not private.es_admin() then raise exception 'Solo el administrador puede ver los pagos manuales.'; end if;
  return coalesce((select jsonb_agg(jsonb_build_object('orden', o.id, 'usuario', pf.username, 'usuario_id', o.usuario_id, 'metodo', o.metodo, 'monto_centimos', o.monto_centimos,
            'moneda', o.moneda, 'gemas', o.tokens, 'referencia', pm.referencia, 'comprobante_path', pm.comprobante_path, 'estado', pm.estado, 'nota', pm.nota, 'enviado', pm.created_at,
            'revisado_at', pm.revisado_at) order by pm.created_at)
    from public.pagos_manuales pm join public.ordenes_pago o on o.id = pm.orden_id left join public.perfiles pf on pf.id = o.usuario_id
    where pm.estado = p_estado), '[]'::jsonb);
end $$;
revoke all on function public.admin_pagos_manuales(text) from public, anon;
grant execute on function public.admin_pagos_manuales(text) to authenticated;

create or replace function public.admin_resolver_pago_manual(p_orden uuid, p_aprobar boolean, p_nota text default null) returns text
language plpgsql security definer set search_path = '' as $$
declare pm public.pagos_manuales; o public.ordenes_pago; v_nota text := nullif(btrim(coalesce(p_nota, '')), ''); res text;
begin
  if not private.es_admin() then raise exception 'Solo el administrador puede revisar pagos.'; end if;
  select * into pm from public.pagos_manuales where orden_id = p_orden for update;
  if not found then raise exception 'Ese pago no existe.'; end if;
  if pm.estado <> 'en_revision' then raise exception 'Ese pago ya fue revisado.'; end if;
  select * into o from public.ordenes_pago where id = p_orden;
  if p_aprobar then
    res := public.procesar_pago_evento('pagado', o.id, 'manual', pm.referencia, o.monto_centimos, o.moneda, 'manual:' || pm.referencia);
    update public.pagos_manuales set estado = 'aprobado', revisado_por = (select auth.uid()), revisado_at = now(), nota = left(v_nota, 300) where orden_id = p_orden;
  else
    if char_length(coalesce(v_nota, '')) < 5 then raise exception 'Escribe el motivo del rechazo (mínimo 5 letras).'; end if;
    res := public.procesar_pago_evento('fallido', o.id, 'manual', pm.referencia, o.monto_centimos, o.moneda, null);
    update public.pagos_manuales set estado = 'rechazado', revisado_por = (select auth.uid()), revisado_at = now(), nota = left(v_nota, 300) where orden_id = p_orden;
  end if;
  perform private.auditar_moderacion('editar', 'pagos_manuales', p_orden::text, 'Pago manual ' || o.metodo,
    jsonb_build_object('decision', case when p_aprobar then 'aprobado' else 'rechazado' end, 'monto_centimos', o.monto_centimos, 'referencia', pm.referencia, 'resultado', res), coalesce(v_nota, 'Revisión de pago manual'));
  return res;
end $$;
revoke all on function public.admin_resolver_pago_manual(uuid, boolean, text) from public, anon;
grant execute on function public.admin_resolver_pago_manual(uuid, boolean, text) to authenticated;

create or replace function public.admin_guardar_metodo(p_clave text, p_nombre text, p_tipo text, p_activo boolean, p_orden integer, p_minimo integer, p_maximo integer,
  p_instrucciones text, p_datos jsonb) returns void
language plpgsql security definer set search_path = '' as $$
begin
  if not private.es_admin() then raise exception 'Solo el administrador puede editar los métodos de pago.'; end if;
  insert into public.pagos_metodos (clave, nombre, tipo, activo, orden, minimo_centimos, maximo_centimos, instrucciones, datos)
  values (p_clave, btrim(p_nombre), p_tipo, coalesce(p_activo, false), coalesce(p_orden, 100), coalesce(p_minimo, 0), p_maximo, p_instrucciones, coalesce(p_datos, '{}'::jsonb))
  on conflict (clave) do update set nombre = excluded.nombre, tipo = excluded.tipo, activo = excluded.activo, orden = excluded.orden, minimo_centimos = excluded.minimo_centimos,
    maximo_centimos = excluded.maximo_centimos, instrucciones = excluded.instrucciones, datos = excluded.datos;
  perform private.auditar_moderacion('editar', 'pagos_metodos', p_clave, btrim(p_nombre), jsonb_build_object('activo', p_activo, 'minimo', p_minimo, 'maximo', p_maximo), 'Método de pago');
end $$;
revoke all on function public.admin_guardar_metodo(text, text, text, boolean, integer, integer, integer, text, jsonb) from public, anon;
grant execute on function public.admin_guardar_metodo(text, text, text, boolean, integer, integer, integer, text, jsonb) to authenticated;

-- 6) Vencimiento de órdenes manuales sin comprobante (para pg_cron o el servicio) --------------------------------------------
create or replace function public.expirar_ordenes_pendientes() returns integer
language plpgsql security definer set search_path = '' as $$
declare n integer;
begin
  update public.ordenes_pago o set estado = 'EXPIRADA', actualizada_at = now()
   where o.estado = 'PENDIENTE' and o.expira_at is not null and o.expira_at < now()
     and not exists (select 1 from public.pagos_manuales pm where pm.orden_id = o.id and pm.estado in ('en_revision', 'aprobado'));
  get diagnostics n = row_count;
  return n;
end $$;
revoke all on function public.expirar_ordenes_pendientes() from public, anon, authenticated;
grant execute on function public.expirar_ordenes_pendientes() to service_role;

-- 7) Comprobantes: bucket privado, cada persona sube y ve solo lo suyo; el administrador lo ve todo --------------------------
insert into storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
values ('comprobantes-pago', 'comprobantes-pago', false, 3145728, array['image/jpeg', 'image/png', 'image/webp'])
on conflict (id) do nothing;
drop policy if exists comprobantes_subir on storage.objects;
create policy comprobantes_subir on storage.objects for insert to authenticated
  with check (bucket_id = 'comprobantes-pago' and (storage.foldername(name))[1] = (select auth.uid())::text);
drop policy if exists comprobantes_leer on storage.objects;
create policy comprobantes_leer on storage.objects for select to authenticated
  using (bucket_id = 'comprobantes-pago' and ((storage.foldername(name))[1] = (select auth.uid())::text or private.es_admin()));

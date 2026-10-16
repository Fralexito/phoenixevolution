-- 119 · ECONOMÍA Fase A · rarezas, objetos épicos/legendarios/limitados, paquetes 50/110/300/650 y bono de primera compra. Plan: docs/DISENO-ECONOMIA-COMPLETA.md.
-- Reglas: solo cosmético; lo exclusivo (legendario y limitado) solo con gemas; el bono se da una sola vez por persona y se revierte con el reembolso de esa orden.

-- 1) Rareza y ediciones limitadas ------------------------------------------------------------------------------------------------
alter table public.tienda_items add column if not exists rareza text not null default 'comun' check (rareza in ('comun', 'raro', 'epico', 'legendario'));
alter table public.tienda_items add column if not exists limitada_hasta timestamptz;
update public.tienda_items set rareza = case when coalesce(precio_gemas, 0) <= 30 then 'comun' else 'raro' end where rareza = 'comun';

-- 2) Objetos nuevos (solo categorías que la web ya sabe dibujar) --------------------------------------------------------------------------
insert into public.tienda_items (clave, nombre, descripcion, categoria, precio, nivel_min, estilo, rareza, precio_ascuas, precio_gemas, stock, limitada_hasta) values
  ('marco_aurora_boreal', 'Marco Aurora Boreal', 'Luces del norte alrededor de tu avatar.', 'marco', 750, 6, '{"color":"#7cffcb","color2":"#7a5cff"}', 'epico', 750, 150, null, null),
  ('marco_galaxia', 'Marco Galaxia', 'Magenta y cian como una galaxia en giro.', 'marco', 1000, 8, '{"color":"#ff3dc8","color2":"#00e5ff"}', 'epico', 1000, 200, null, null),
  ('fondo_nebulosa', 'Fondo Nebulosa', 'Violetas profundos y rosa estelar.', 'fondo', 800, 6, '{"color":"#2b1055","color2":"#d53369"}', 'epico', 800, 160, null, null),
  ('fondo_oceano', 'Fondo Océano', 'Azules limpios de mar abierto.', 'fondo', 800, 6, '{"color":"#00c6ff","color2":"#0072ff"}', 'epico', 800, 160, null, null),
  ('insignia_cometa', 'Insignia Cometa', 'Para quien pasa dejando estela.', 'insignia', 600, 6, '{"icono":"fa-meteor","color":"#7aa2ff"}', 'epico', 600, 120, null, null),
  ('insignia_dragon', 'Insignia Dragón', 'Fuerza y fuego en tu perfil.', 'insignia', 900, 8, '{"icono":"fa-dragon","color":"#ff5a36"}', 'epico', 900, 180, null, null),
  ('titulo_leyenda', 'Leyenda', 'Un título que se gana el respeto.', 'titulo', 1100, 8, '{"texto":"Leyenda","color":"#ffc828"}', 'epico', 1100, 220, null, null),
  ('clan_esmeralda', 'Etiqueta esmeralda', 'Verde brillante para tu clan.', 'color_clan', 700, 6, '{"color":"#19e68c"}', 'epico', 700, 140, null, null),
  ('marco_supernova', 'Marco Supernova', 'Blanco y oro: la explosión de una estrella.', 'marco', 2000, 10, '{"color":"#ffffff","color2":"#ffc828"}', 'legendario', null, 400, null, null),
  ('fondo_agujero_negro', 'Fondo Agujero Negro', 'Negro absoluto con borde violeta.', 'fondo', 1750, 10, '{"color":"#000000","color2":"#7a00ff"}', 'legendario', null, 350, null, null),
  ('insignia_fenix_real', 'Insignia Fénix Real', 'La llama que renace.', 'insignia', 2500, 12, '{"icono":"fa-fire-flame-curved","color":"#ff7a18"}', 'legendario', null, 500, null, null),
  ('titulo_inmortal', 'Inmortal', 'Reservado para los que no caen.', 'titulo', 3000, 12, '{"texto":"Inmortal","color":"#ff3dc8"}', 'legendario', null, 600, null, null),
  ('clan_diamante', 'Etiqueta diamante', 'Un azul hielo casi blanco para tu clan.', 'color_clan', 1500, 10, '{"color":"#b9f2ff"}', 'legendario', null, 300, null, null),
  ('marco_halloween', 'Marco Halloween', 'Edición limitada de octubre y noviembre.', 'marco', 750, 1, '{"color":"#ff7a00","color2":"#7a00ff"}', 'epico', null, 150, null, timestamptz '2026-11-30 23:59:59-05'),
  ('insignia_fantasma', 'Insignia Fantasma', 'Edición limitada de octubre y noviembre.', 'insignia', 600, 1, '{"icono":"fa-ghost","color":"#ff7a00"}', 'epico', null, 120, null, timestamptz '2026-11-30 23:59:59-05'),
  ('titulo_fundador', 'Fundador', 'Solo 100 existen: los primeros de la beta.', 'titulo', 1250, 1, '{"texto":"Fundador","color":"#ffc828"}', 'legendario', null, 250, 100, timestamptz '2026-12-31 23:59:59-05')
on conflict (clave) do nothing;

-- 3) Paquetes de gemas ----------------------------------------------------------------------------------------------------------------
update public.paquetes_tokens set activo = false where clave in ('gemas_100', 'gemas_300', 'gemas_700');
insert into public.paquetes_tokens (clave, nombre, tokens, precio_centimos, moneda, activo) values
  ('gemas_chispa', 'Chispa', 50, 500, 'PEN', true), ('gemas_brasa', 'Brasa', 110, 1000, 'PEN', true),
  ('gemas_llama', 'Llama', 300, 2500, 'PEN', true), ('gemas_fenix', 'Fénix', 650, 5000, 'PEN', true)
on conflict (clave) do update set nombre = excluded.nombre, tokens = excluded.tokens, precio_centimos = excluded.precio_centimos, activo = true;

-- 4) Bono de primera compra -----------------------------------------------------------------------------------------------------------
insert into public.economia_config (clave, valor) values ('bono_primera_compra_pct', '50') on conflict (clave) do nothing;
do $$ declare n text; begin
  select conname into n from pg_constraint where conrelid = 'public.movimientos_tokens'::regclass and contype = 'c' and pg_get_constraintdef(oid) like '%compra_tienda%';
  if n is not null then execute format('alter table public.movimientos_tokens drop constraint %I', n); end if;
end $$;
alter table public.movimientos_tokens add constraint movimientos_tokens_tipo_check check (tipo in ('ganado', 'compra_tienda', 'compra_dinero', 'reembolso', 'ajuste_admin', 'devolucion', 'apuesta_garantia', 'apuesta_premio', 'apuesta_devolucion',
  'alquiler_garantia', 'alquiler_pago', 'alquiler_devolucion', 'bono_primera_compra'));

create or replace function public.procesar_pago_evento(p_evento text, p_orden uuid, p_proveedor text, p_proveedor_ref text, p_monto_centimos integer, p_moneda text, p_comprobante text) returns text
language plpgsql security definer set search_path = '' as $$
declare o public.ordenes_pago; v_pct integer; v_bono integer := 0; v_delta integer;
begin
  select * into o from public.ordenes_pago where id = p_orden for update;
  if not found then raise exception 'Orden desconocida.'; end if;
  if p_evento = 'pagado' then
    if o.estado = 'PAGADA' then return 'ya_acreditada'; end if;
    if o.estado not in ('PENDIENTE', 'FALLIDA') then raise exception 'La orden está en estado % y no puede acreditarse.', o.estado; end if;
    if p_monto_centimos is distinct from o.monto_centimos or p_moneda is distinct from o.moneda then raise exception 'El monto o la moneda no coinciden con la orden.'; end if;
    perform private.registrar_movimiento(o.usuario_id, o.tokens, 'compra_dinero', coalesce(p_proveedor, 'pasarela'), o.id::text, 'pago:' || o.id::text, 'gemas');
    v_pct := coalesce(nullif(private.config('bono_primera_compra_pct'), '')::integer, 0);
    if v_pct > 0 and not exists (select 1 from public.ordenes_pago x where x.usuario_id = o.usuario_id and x.id <> o.id and x.estado in ('PAGADA', 'REEMBOLSADA', 'DISPUTADA')) then
      v_bono := (o.tokens * v_pct) / 100;
      if v_bono > 0 then perform private.registrar_movimiento(o.usuario_id, v_bono, 'bono_primera_compra', 'bono', o.id::text, 'bono1:' || o.usuario_id::text, 'gemas'); end if;
    end if;
    update public.ordenes_pago set estado = 'PAGADA', proveedor = p_proveedor, proveedor_ref = p_proveedor_ref, comprobante_ref = p_comprobante, pagada_at = now(), actualizada_at = now() where id = o.id;
    perform private.notificar(o.usuario_id, 'LOGRO', 'Compra acreditada', 'Se añadieron ' || o.tokens || ' gemas a tu billetera' || case when v_bono > 0 then ' (+' || v_bono || ' de bono de primera compra).' else '.' end);
    return 'acreditada';
  elsif p_evento = 'fallido' then
    if o.estado = 'PENDIENTE' then update public.ordenes_pago set estado = 'FALLIDA', actualizada_at = now() where id = o.id; end if;
    return 'fallida';
  elsif p_evento in ('reembolsado', 'disputado') then
    if o.estado not in ('PAGADA') then return 'sin_cambio'; end if;
    perform private.registrar_movimiento(o.usuario_id, -o.tokens, 'reembolso', coalesce(o.proveedor, 'pasarela'), o.id::text, 'reversa:' || o.id::text, 'gemas');
    select delta into v_delta from public.movimientos_tokens where tipo = 'bono_primera_compra' and referencia = o.id::text and moneda = 'gemas' limit 1;
    if v_delta is not null then perform private.registrar_movimiento(o.usuario_id, -v_delta, 'reembolso', 'bono', o.id::text, 'reversa_bono:' || o.id::text, 'gemas'); end if;
    update public.ordenes_pago set estado = case p_evento when 'reembolsado' then 'REEMBOLSADA' else 'DISPUTADA' end, actualizada_at = now() where id = o.id;
    perform private.notificar(o.usuario_id, 'LOGRO', 'Compra revertida', 'Se descontaron ' || (o.tokens + coalesce(v_delta, 0)) || ' gemas por un reembolso o disputa.');
    return 'revertida';
  elsif p_evento = 'disputa_ganada' then
    if o.estado <> 'DISPUTADA' then return 'sin_cambio'; end if;
    perform private.registrar_movimiento(o.usuario_id, o.tokens, 'devolucion', coalesce(o.proveedor, 'pasarela'), o.id::text, 'disputa_ganada:' || o.id::text, 'gemas');
    select delta into v_delta from public.movimientos_tokens where tipo = 'bono_primera_compra' and referencia = o.id::text and moneda = 'gemas' limit 1;
    if v_delta is not null then perform private.registrar_movimiento(o.usuario_id, v_delta, 'devolucion', 'bono', o.id::text, 'disputa_ganada_bono:' || o.id::text, 'gemas'); end if;
    update public.ordenes_pago set estado = 'PAGADA', actualizada_at = now() where id = o.id;
    return 'restituida';
  end if;
  raise exception 'Evento desconocido: %', p_evento;
end $$;
revoke all on function public.procesar_pago_evento(text, uuid, text, text, integer, text, text) from public, anon, authenticated;
grant execute on function public.procesar_pago_evento(text, uuid, text, text, integer, text, text) to service_role;

create or replace function public.paquetes_lista() returns jsonb
language plpgsql stable security definer set search_path = '' as $$
declare yo uuid := (select auth.uid()); v text := private.config('version_terminos'); v_pct integer := coalesce(nullif(private.config('bono_primera_compra_pct'), '')::integer, 0);
begin
  return jsonb_build_object(
    'pagos_activos', coalesce(private.config('pagos_activos'), 'false') = 'true',
    'version_terminos', v,
    'terminos_aceptados', yo is not null and exists (select 1 from public.aceptaciones_legales where usuario_id = yo and documento = 'terminos_compra' and version = v),
    'edad', case when yo is null then null else private.categoria_edad(yo) end,
    'bono_primera_pct', v_pct,
    'bono_disponible', v_pct > 0 and (yo is null or not exists (select 1 from public.ordenes_pago x where x.usuario_id = yo and x.estado in ('PAGADA', 'REEMBOLSADA', 'DISPUTADA'))),
    'paquetes', coalesce((select jsonb_agg(jsonb_build_object('id', id, 'clave', clave, 'nombre', nombre, 'tokens', tokens, 'precio_centimos', precio_centimos, 'moneda', moneda) order by precio_centimos) from public.paquetes_tokens where activo), '[]'::jsonb));
end $$;
revoke all on function public.paquetes_lista() from public;
grant execute on function public.paquetes_lista() to anon, authenticated;

-- 5) Tienda: rareza y edición limitada; no se vende una edición terminada ------------------------------------------------------------------------
create or replace function public.tienda_lista() returns jsonb
language plpgsql stable security definer set search_path = '' as $$
declare yo uuid := (select auth.uid());
begin
  return coalesce((select jsonb_agg(jsonb_build_object('id', t.id, 'clave', t.clave, 'nombre', t.nombre, 'descripcion', t.descripcion, 'categoria', t.categoria, 'precio', t.precio,
            'precio_ascuas', t.precio_ascuas, 'precio_gemas', t.precio_gemas, 'rareza', t.rareza, 'limitada_hasta', t.limitada_hasta,
            'nivel_min', t.nivel_min, 'stock', t.stock, 'agotado', t.stock is not null and t.stock = 0, 'estilo', t.estilo,
            'tengo', i.item_id is not null, 'equipado', coalesce(i.equipado, false)) order by t.categoria, t.precio, t.id)
    from public.tienda_items t left join public.inventario i on i.item_id = t.id and i.usuario_id = yo
    where t.activo and (t.limitada_hasta is null or t.limitada_hasta > now() or i.item_id is not null)), '[]'::jsonb);
end $$;
revoke all on function public.tienda_lista() from public;
grant execute on function public.tienda_lista() to anon, authenticated;

create or replace function public.comprar_item(p_item bigint, p_moneda text default 'ascuas') returns jsonb
language plpgsql security definer set search_path = '' as $$
declare yo uuid := private.uid_requerido(); t public.tienda_items; x bigint; b public.billeteras; v_precio integer;
begin
  if p_moneda not in ('ascuas', 'gemas') then raise exception 'Elige pagar con ascuas o con gemas.'; end if;
  select * into t from public.tienda_items where id = p_item and activo for update;
  if not found then raise exception 'Ese objeto no está disponible.'; end if;
  if t.limitada_hasta is not null and t.limitada_hasta <= now() then raise exception 'Esta edición limitada ya terminó.'; end if;
  v_precio := case p_moneda when 'gemas' then t.precio_gemas else t.precio_ascuas end;
  if v_precio is null then raise exception 'Este objeto no se vende con %.', p_moneda; end if;
  if exists (select 1 from public.inventario where usuario_id = yo and item_id = t.id) then raise exception 'Ya tienes este objeto.'; end if;
  select coalesce(xp, 0) into x from public.xp_totales where usuario_id = yo;
  if private.nivel_de_xp(coalesce(x, 0)) < t.nivel_min then raise exception 'Necesitas nivel % para comprar esto.', t.nivel_min; end if;
  if t.stock is not null and t.stock <= 0 then raise exception 'Este objeto está agotado.'; end if;
  if v_precio > 0 then
    perform private.registrar_movimiento(yo, -v_precio, 'compra_tienda', 'tienda', t.clave, 'tienda:' || yo::text || ':' || t.id::text, p_moneda);
  end if;
  if t.stock is not null then update public.tienda_items set stock = stock - 1 where id = t.id; end if;
  insert into public.inventario (usuario_id, item_id, categoria, precio_pagado, moneda_pagada)
  values (yo, t.id, t.categoria, v_precio, case when v_precio > 0 then p_moneda end);
  select * into b from public.billeteras where usuario_id = yo;
  return jsonb_build_object('saldo', coalesce(b.saldo, 0), 'gemas', coalesce(b.gemas, 0), 'moneda', p_moneda, 'precio', v_precio, 'objeto', t.nombre);
end $$;
revoke all on function public.comprar_item(bigint, text) from public, anon;
grant execute on function public.comprar_item(bigint, text) to authenticated;

create or replace function public.admin_set_rareza(p_id bigint, p_rareza text, p_limitada_hasta timestamptz default null) returns void
language plpgsql security definer set search_path = '' as $$
begin
  if not private.es_admin() then raise exception 'Solo el administrador puede editar la tienda.'; end if;
  if p_rareza not in ('comun', 'raro', 'epico', 'legendario') then raise exception 'Rareza no válida.'; end if;
  update public.tienda_items set rareza = p_rareza, limitada_hasta = p_limitada_hasta where id = p_id;
  if not found then raise exception 'Ese objeto no existe.'; end if;
  perform private.auditar_moderacion('editar', 'tienda_items', p_id::text, 'Rareza de objeto', jsonb_build_object('rareza', p_rareza, 'limitada_hasta', p_limitada_hasta), 'Rareza y edición limitada');
end $$;
revoke all on function public.admin_set_rareza(bigint, text, timestamptz) from public, anon;
grant execute on function public.admin_set_rareza(bigint, text, timestamptz) to authenticated;

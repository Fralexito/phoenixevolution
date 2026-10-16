-- 108 · ECONOMÍA Fase 1 · Precio por moneda (ascuas / gemas), moneda pagada en el inventario y auditoría del libro.
-- Plan: docs/PLAN-MONEDAS-VIRTUALES.md (Fase 1). Depende de 049, 050, 065.
-- Compatible hacia atrás: `tienda_items.precio` se conserva (= precio en ascuas) y `comprar_item(bigint, text)` mantiene su firma.
-- Regla de conversión inicial: 1 gema = 5 ascuas (redondeo hacia arriba, mínimo 1). El admin puede cambiar cada objeto.

-- 1) Precio por moneda ------------------------------------------------------------------------------------------------
alter table public.tienda_items add column if not exists precio_ascuas integer check (precio_ascuas is null or precio_ascuas >= 0);
alter table public.tienda_items add column if not exists precio_gemas  integer check (precio_gemas  is null or precio_gemas  >= 0);

update public.tienda_items
   set precio_ascuas = precio,
       precio_gemas  = case when precio = 0 then 0 else greatest(1, ceil(precio / 5.0)::integer) end
 where precio_ascuas is null and precio_gemas is null;

do $$ begin
  alter table public.tienda_items add constraint tienda_items_alguna_moneda check (precio_ascuas is not null or precio_gemas is not null);
exception when duplicate_object then null; end $$;

-- Si algo antiguo (admin_guardar_item) cambia solo `precio`, los precios por moneda lo siguen; si es un objeto nuevo sin ellos, se rellenan.
create or replace function private.tienda_items_precios() returns trigger language plpgsql set search_path = '' as $$
begin
  if tg_op = 'INSERT' then
    if new.precio_ascuas is null and new.precio_gemas is null then
      new.precio_ascuas := new.precio;
      new.precio_gemas  := case when new.precio = 0 then 0 else greatest(1, ceil(new.precio / 5.0)::integer) end;
    end if;
  elsif new.precio is distinct from old.precio
        and new.precio_ascuas is not distinct from old.precio_ascuas
        and new.precio_gemas  is not distinct from old.precio_gemas then
    new.precio_ascuas := new.precio;
    new.precio_gemas  := case when new.precio = 0 then 0 else greatest(1, ceil(new.precio / 5.0)::integer) end;
  end if;
  return new;
end $$;
revoke all on function private.tienda_items_precios() from public, anon, authenticated;
drop trigger if exists trg_tienda_items_precios on public.tienda_items;
create trigger trg_tienda_items_precios before insert or update on public.tienda_items for each row execute function private.tienda_items_precios();

-- 2) Moneda pagada en el inventario -----------------------------------------------------------------------------------
alter table public.inventario add column if not exists moneda_pagada text check (moneda_pagada is null or moneda_pagada in ('ascuas', 'gemas'));
update public.inventario i set moneda_pagada = m.moneda
  from public.movimientos_tokens m
 where i.moneda_pagada is null and m.clave = 'tienda:' || i.usuario_id::text || ':' || i.item_id::text;

-- 3) Comprar: el precio depende de la moneda elegida ------------------------------------------------------------------
create or replace function public.comprar_item(p_item bigint, p_moneda text default 'ascuas') returns jsonb
language plpgsql security definer set search_path = '' as $$
declare yo uuid := private.uid_requerido(); t public.tienda_items; x bigint; b public.billeteras; v_precio integer;
begin
  if p_moneda not in ('ascuas', 'gemas') then raise exception 'Elige pagar con ascuas o con gemas.'; end if;
  select * into t from public.tienda_items where id = p_item and activo for update;
  if not found then raise exception 'Ese objeto no está disponible.'; end if;
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

-- 4) La lista de la tienda manda los dos precios ----------------------------------------------------------------------
create or replace function public.tienda_lista() returns jsonb
language plpgsql stable security definer set search_path = '' as $$
declare yo uuid := (select auth.uid());
begin
  return coalesce((select jsonb_agg(jsonb_build_object('id', t.id, 'clave', t.clave, 'nombre', t.nombre, 'descripcion', t.descripcion, 'categoria', t.categoria, 'precio', t.precio,
            'precio_ascuas', t.precio_ascuas, 'precio_gemas', t.precio_gemas,
            'nivel_min', t.nivel_min, 'stock', t.stock, 'agotado', t.stock is not null and t.stock = 0, 'estilo', t.estilo,
            'tengo', i.item_id is not null, 'equipado', coalesce(i.equipado, false)) order by t.categoria, t.precio, t.id)
    from public.tienda_items t left join public.inventario i on i.item_id = t.id and i.usuario_id = yo where t.activo), '[]'::jsonb);
end $$;
revoke all on function public.tienda_lista() from public;
grant execute on function public.tienda_lista() to anon, authenticated;

-- 5) El admin fija los precios por moneda (con auditoría) --------------------------------------------------------------
create or replace function public.admin_set_precios_item(p_id bigint, p_precio_ascuas integer, p_precio_gemas integer) returns void
language plpgsql security definer set search_path = '' as $$
declare t public.tienda_items;
begin
  if not private.es_admin() then raise exception 'Solo el administrador puede cambiar los precios.'; end if;
  if p_precio_ascuas is null and p_precio_gemas is null then raise exception 'El objeto necesita precio en al menos una moneda.'; end if;
  if coalesce(p_precio_ascuas, 0) < 0 or coalesce(p_precio_gemas, 0) < 0 then raise exception 'Los precios no pueden ser negativos.'; end if;
  update public.tienda_items set precio_ascuas = p_precio_ascuas, precio_gemas = p_precio_gemas, precio = coalesce(p_precio_ascuas, precio)
   where id = p_id returning * into t;
  if not found then raise exception 'El objeto no existe.'; end if;
  perform private.auditar_moderacion('editar', 'tienda_items', p_id::text, t.nombre, jsonb_build_object('precio_ascuas', p_precio_ascuas, 'precio_gemas', p_precio_gemas), 'Precios por moneda');
end $$;
revoke all on function public.admin_set_precios_item(bigint, integer, integer) from public, anon;
grant execute on function public.admin_set_precios_item(bigint, integer, integer) to authenticated;

-- 6) Auditoría del libro: la suma de movimientos debe igualar a cada billetera ------------------------------------------
create or replace function private.economia_diferencias() returns table (usuario_id uuid, moneda text, billetera integer, libro bigint)
language sql stable security definer set search_path = '' as $$
  with libro as (select m.usuario_id, m.moneda, sum(m.delta)::bigint s from public.movimientos_tokens m group by 1, 2),
       bil as (select b.usuario_id, 'ascuas'::text moneda, b.saldo s from public.billeteras b
               union all select b.usuario_id, 'gemas'::text, b.gemas from public.billeteras b)
  select coalesce(bil.usuario_id, libro.usuario_id), coalesce(bil.moneda, libro.moneda), coalesce(bil.s, 0), coalesce(libro.s, 0)
    from bil full join libro on libro.usuario_id = bil.usuario_id and libro.moneda = bil.moneda
   where coalesce(bil.s, 0)::bigint <> coalesce(libro.s, 0)
$$;
revoke all on function private.economia_diferencias() from public, anon, authenticated;

create or replace function public.economia_auditar() returns jsonb
language plpgsql stable security definer set search_path = '' as $$
declare n integer; filas jsonb;
begin
  if not private.es_admin() then raise exception 'Solo el administrador puede auditar la economía.'; end if;
  select count(*), coalesce(jsonb_agg(jsonb_build_object('usuario', d.usuario_id, 'moneda', d.moneda, 'billetera', d.billetera, 'libro', d.libro)), '[]'::jsonb)
    into n, filas from (select * from private.economia_diferencias() limit 50) d;
  return jsonb_build_object('ok', n = 0, 'diferencias', n, 'detalle', filas,
    'ascuas_en_circulacion', (select coalesce(sum(saldo), 0) from public.billeteras),
    'gemas_en_circulacion', (select coalesce(sum(gemas), 0) from public.billeteras),
    'revisado', now());
end $$;
revoke all on function public.economia_auditar() from public, anon;
grant execute on function public.economia_auditar() to authenticated;

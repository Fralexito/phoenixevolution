-- 050 · ECONOMÍA (2/3) · TIENDA VIRTUAL, INVENTARIO Y EQUIPAMIENTO. Depende de 049 (registrar_movimiento, nivel_de_xp).
-- Solo COSMÉTICOS: ningún objeto cambia quién gana un partido. Categorías: marco (del avatar), titulo (bajo el nombre), fondo (del perfil), color_clan (de tu etiqueta), insignia.
-- El «estilo» de cada objeto es datos puros (colores #RRGGBB, un texto corto, un icono fa-…): la base valida las claves permitidas y la web los pinta sin aceptar CSS libre.
-- Comprar es ATÓMICO (una transacción): bloqueo de fila del objeto y de la billetera, cobro en el libro, stock y entrega al inventario o nada. Un solo objeto equipado por categoría.
-- Cerrado (sin acceso directo): todo por funciones. El admin gestiona el catálogo (auditado).

-- ─── 1) Validación del estilo ────────────────────────────────────────────────────────────────────
create or replace function private.estilo_valido(p_categoria text, p_estilo jsonb) returns boolean
language plpgsql immutable set search_path = '' as $$
declare k text; v jsonb; permitidas text[];
begin
  if p_estilo is null or jsonb_typeof(p_estilo) <> 'object' then return false; end if;
  permitidas := case p_categoria when 'marco' then array['color', 'color2'] when 'fondo' then array['color', 'color2'] when 'color_clan' then array['color']
                                 when 'titulo' then array['texto', 'color'] when 'insignia' then array['icono', 'color'] else array[]::text[] end;
  for k, v in select * from jsonb_each(p_estilo) loop
    if not (k = any (permitidas)) or jsonb_typeof(v) <> 'string' then return false; end if;
    if k in ('color', 'color2') and (v #>> '{}') !~ '^#[0-9a-fA-F]{6}$' then return false; end if;
    if k = 'texto' and (v #>> '{}') !~ '^[A-Za-zÁÉÍÓÚÜÑáéíóúüñ0-9 .!¡¿?-]{2,24}$' then return false; end if;
    if k = 'icono' and (v #>> '{}') !~ '^fa-[a-z0-9-]{2,30}$' then return false; end if;
  end loop;
  return case p_categoria when 'marco' then p_estilo ? 'color' when 'fondo' then p_estilo ? 'color' when 'color_clan' then p_estilo ? 'color' when 'titulo' then p_estilo ? 'texto' when 'insignia' then p_estilo ? 'icono' else false end;
end $$;
revoke all on function private.estilo_valido(text, jsonb) from public, anon, authenticated;

-- ─── 2) Tablas ───────────────────────────────────────────────────────────────────────────────────
create table if not exists public.tienda_items (
  id bigint generated always as identity primary key,
  clave text not null unique check (clave ~ '^[a-z0-9_]{3,40}$'),
  nombre text not null check (char_length(nombre) between 3 and 40),
  descripcion text not null default '' check (char_length(descripcion) <= 200),
  categoria text not null check (categoria in ('marco', 'titulo', 'fondo', 'color_clan', 'insignia')),
  precio integer not null check (precio between 0 and 1000000),
  nivel_min integer not null default 1 check (nivel_min between 1 and 100),
  stock integer check (stock is null or stock >= 0),
  estilo jsonb not null default '{}'::jsonb,
  activo boolean not null default true,
  created_at timestamptz not null default now(),
  constraint tienda_estilo_valido check (private.estilo_valido(categoria, estilo))
);
create table if not exists public.inventario (
  usuario_id uuid not null references auth.users(id) on delete cascade,
  item_id bigint not null references public.tienda_items(id) on delete restrict,
  categoria text not null,
  precio_pagado integer not null check (precio_pagado >= 0),
  equipado boolean not null default false,
  comprado_at timestamptz not null default now(),
  primary key (usuario_id, item_id)
);
create unique index if not exists inventario_un_equipado_idx on public.inventario (usuario_id, categoria) where equipado;
alter table public.tienda_items enable row level security; alter table public.inventario enable row level security;
revoke all on public.tienda_items, public.inventario from anon, authenticated;

insert into public.tienda_items (clave, nombre, descripcion, categoria, precio, nivel_min, estilo) values
  ('marco_fuego',    'Marco Fuego',     'Un aro de llamas alrededor de tu avatar.',        'marco',      120, 1, '{"color":"#ff6a00","color2":"#ffc828"}'),
  ('marco_hielo',    'Marco Hielo',     'Frío y limpio, para mentes tranquilas.',          'marco',      120, 1, '{"color":"#00e5ff","color2":"#7aa2ff"}'),
  ('marco_dorado',   'Marco Dorado',    'Solo para quienes ya han recorrido camino.',      'marco',      400, 5, '{"color":"#ffc828","color2":"#fff2a8"}'),
  ('titulo_estratega', 'Estratega',     'Un título discreto bajo tu nombre.',              'titulo',      80, 1, '{"texto":"Estratega","color":"#00e5ff"}'),
  ('titulo_imparable', 'Imparable',     'Para quien no se detiene.',                       'titulo',     150, 3, '{"texto":"Imparable","color":"#ff3dc8"}'),
  ('titulo_fenix',   'Fénix',           'Resurgir también es ganar.',                      'titulo',     300, 5, '{"texto":"Fénix","color":"#ffc828"}'),
  ('fondo_aurora',   'Fondo Aurora',    'Un degradado de aurora para tu perfil.',          'fondo',      200, 2, '{"color":"#2a0a5e","color2":"#00e5ff"}'),
  ('fondo_brasas',   'Fondo Brasas',    'Tonos cálidos de brasa encendida.',               'fondo',      200, 2, '{"color":"#3a0d0d","color2":"#ff6a00"}'),
  ('color_clan_rojo','Etiqueta roja',   'Tu etiqueta de clan en rojo fénix.',              'color_clan',  60, 1, '{"color":"#ff4d6d"}'),
  ('color_clan_oro', 'Etiqueta dorada', 'Tu etiqueta de clan en oro.',                     'color_clan', 100, 3, '{"color":"#ffc828"}'),
  ('insignia_corona','Corona',          'Una pequeña corona junto a tu nombre.',           'insignia',   250, 4, '{"icono":"fa-crown","color":"#ffc828"}'),
  ('insignia_rayo',  'Rayo',            'Un rayo para los de ritmo rápido.',               'insignia',   150, 2, '{"icono":"fa-bolt","color":"#00e5ff"}')
on conflict (clave) do nothing;

-- ─── 3) Lectura ──────────────────────────────────────────────────────────────────────────────────
-- Catálogo activo (público). Con sesión, marca lo que ya tienes y lo equipado.
create or replace function public.tienda_lista() returns jsonb
language plpgsql stable security definer set search_path = '' as $$
declare yo uuid := (select auth.uid());
begin
  return coalesce((select jsonb_agg(jsonb_build_object('id', t.id, 'clave', t.clave, 'nombre', t.nombre, 'descripcion', t.descripcion, 'categoria', t.categoria, 'precio', t.precio,
            'nivel_min', t.nivel_min, 'stock', t.stock, 'agotado', t.stock is not null and t.stock = 0, 'estilo', t.estilo,
            'tengo', i.item_id is not null, 'equipado', coalesce(i.equipado, false)) order by t.categoria, t.precio, t.id)
    from public.tienda_items t left join public.inventario i on i.item_id = t.id and i.usuario_id = yo where t.activo), '[]'::jsonb);
end $$;

create or replace function public.mi_inventario() returns jsonb
language plpgsql stable security definer set search_path = '' as $$
declare yo uuid := private.uid_requerido();
begin
  return coalesce((select jsonb_agg(jsonb_build_object('id', t.id, 'clave', t.clave, 'nombre', t.nombre, 'categoria', t.categoria, 'estilo', t.estilo, 'equipado', i.equipado, 'comprado', i.comprado_at) order by t.categoria, i.comprado_at desc)
    from public.inventario i join public.tienda_items t on t.id = i.item_id where i.usuario_id = yo), '[]'::jsonb);
end $$;

-- Lo que alguien lleva puesto (para pintar su perfil). Lo ve quien puede ver su muro.
create or replace function public.equipamiento_de(p_usuario uuid) returns jsonb
language plpgsql stable security definer set search_path = '' as $$
declare yo uuid := (select auth.uid());
begin
  if p_usuario is null or not private.puede_ver_muro(p_usuario, yo) then return '{}'::jsonb; end if;
  return coalesce((select jsonb_object_agg(i.categoria, jsonb_build_object('clave', t.clave, 'nombre', t.nombre, 'estilo', t.estilo))
    from public.inventario i join public.tienda_items t on t.id = i.item_id where i.usuario_id = p_usuario and i.equipado), '{}'::jsonb);
end $$;

-- ─── 4) Comprar y equipar ────────────────────────────────────────────────────────────────────────
create or replace function public.comprar_item(p_item bigint) returns jsonb
language plpgsql security definer set search_path = '' as $$
declare yo uuid := private.uid_requerido(); t public.tienda_items; x bigint; s integer;
begin
  select * into t from public.tienda_items where id = p_item and activo for update;
  if not found then raise exception 'Ese objeto no está disponible.'; end if;
  if exists (select 1 from public.inventario where usuario_id = yo and item_id = t.id) then raise exception 'Ya tienes este objeto.'; end if;
  select coalesce(xp, 0) into x from public.xp_totales where usuario_id = yo;
  if private.nivel_de_xp(coalesce(x, 0)) < t.nivel_min then raise exception 'Necesitas nivel % para comprar esto.', t.nivel_min; end if;
  if t.stock is not null and t.stock <= 0 then raise exception 'Este objeto está agotado.'; end if;
  if t.precio > 0 then perform private.registrar_movimiento(yo, -t.precio, 'compra_tienda', 'tienda', t.clave, 'tienda:' || yo::text || ':' || t.id::text); end if;
  if t.stock is not null then update public.tienda_items set stock = stock - 1 where id = t.id; end if;
  insert into public.inventario (usuario_id, item_id, categoria, precio_pagado) values (yo, t.id, t.categoria, t.precio);
  select coalesce(saldo, 0) into s from public.billeteras where usuario_id = yo;
  return jsonb_build_object('saldo', coalesce(s, 0), 'objeto', t.nombre);
end $$;

create or replace function public.equipar_item(p_item bigint, p_equipar boolean) returns void
language plpgsql security definer set search_path = '' as $$
declare yo uuid := private.uid_requerido(); i public.inventario;
begin
  select * into i from public.inventario where usuario_id = yo and item_id = p_item for update;
  if not found then raise exception 'Ese objeto no está en tu inventario.'; end if;
  if coalesce(p_equipar, true) then
    update public.inventario set equipado = false where usuario_id = yo and categoria = i.categoria and equipado and item_id <> p_item;
    update public.inventario set equipado = true where usuario_id = yo and item_id = p_item;
  else
    update public.inventario set equipado = false where usuario_id = yo and item_id = p_item;
  end if;
end $$;

-- ─── 5) Administración del catálogo (solo admin; auditada) ───────────────────────────────────────
create or replace function public.admin_tienda_items() returns jsonb
language plpgsql stable security definer set search_path = '' as $$
begin
  if not private.es_admin() then raise exception 'Solo el administrador puede ver el catálogo completo.'; end if;
  return coalesce((select jsonb_agg(to_jsonb(t) order by t.categoria, t.precio, t.id) from public.tienda_items t), '[]'::jsonb);
end $$;

create or replace function public.admin_guardar_item(p_id bigint, p_clave text, p_nombre text, p_descripcion text, p_categoria text, p_precio integer, p_nivel_min integer, p_stock integer, p_estilo jsonb, p_activo boolean) returns bigint
language plpgsql security definer set search_path = '' as $$
declare v_id bigint := p_id;
begin
  if not private.es_admin() then raise exception 'Solo el administrador puede editar la tienda.'; end if;
  if not private.estilo_valido(p_categoria, p_estilo) then raise exception 'El estilo no es válido para esa categoría (colores #RRGGBB, texto corto, icono fa-…).'; end if;
  if v_id is null then
    insert into public.tienda_items (clave, nombre, descripcion, categoria, precio, nivel_min, stock, estilo, activo)
    values (p_clave, btrim(p_nombre), btrim(coalesce(p_descripcion, '')), p_categoria, p_precio, coalesce(p_nivel_min, 1), p_stock, p_estilo, coalesce(p_activo, true)) returning tienda_items.id into v_id;
    perform private.auditar_moderacion('crear', 'tienda_items', v_id::text, btrim(p_nombre), jsonb_build_object('precio', p_precio, 'categoria', p_categoria), 'Nuevo objeto de la tienda');
  else
    update public.tienda_items set nombre = btrim(p_nombre), descripcion = btrim(coalesce(p_descripcion, '')), precio = p_precio, nivel_min = coalesce(p_nivel_min, 1), stock = p_stock, estilo = p_estilo, activo = coalesce(p_activo, true)
     where tienda_items.id = v_id and categoria = p_categoria;
    if not found then raise exception 'El objeto no existe (la categoría no se puede cambiar).'; end if;
    perform private.auditar_moderacion('editar', 'tienda_items', v_id::text, btrim(p_nombre), jsonb_build_object('precio', p_precio, 'activo', p_activo, 'stock', p_stock), 'Cambio en la tienda');
  end if;
  return v_id;
exception when unique_violation then raise exception 'Ya existe un objeto con esa clave.';
end $$;

-- ─── 6) Permisos ─────────────────────────────────────────────────────────────────────────────────
revoke all on function public.tienda_lista(), public.mi_inventario(), public.equipamiento_de(uuid), public.comprar_item(bigint), public.equipar_item(bigint, boolean), public.admin_tienda_items(),
  public.admin_guardar_item(bigint, text, text, text, text, integer, integer, integer, jsonb, boolean) from public, anon, authenticated;
grant execute on function public.mi_inventario(), public.comprar_item(bigint), public.equipar_item(bigint, boolean), public.admin_tienda_items(),
  public.admin_guardar_item(bigint, text, text, text, text, integer, integer, integer, jsonb, boolean) to authenticated;
grant execute on function public.tienda_lista(), public.equipamiento_de(uuid) to anon, authenticated;

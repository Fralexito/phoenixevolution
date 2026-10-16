-- 123 · ECONOMÍA Fase E · Phoenix Pass (pase de temporada) y marca «torneo premium». Diseño: docs/DISENO-PASS-Y-ORGANIZADORES.md.
-- Reglas: solo cosmético y comodidad; el pase se compra UNA vez por temporada con gemas (no hay cobro automático); la pista gratis nunca da gemas;
-- todo movimiento de dinero virtual pasa por private.registrar_movimiento con clave idempotente (el libro es inmutable).

-- 1) Tipos nuevos del libro (se lee la lista actual y se AÑADEN los nuestros: así no pisa lo que añadan las otras fases) ---------------------
do $$
declare d text; lista text[]; t text;
begin
  select pg_get_constraintdef(oid) into d from pg_constraint where conrelid = 'public.movimientos_tokens'::regclass and conname = 'movimientos_tokens_tipo_check';
  select coalesce(array_agg(m[1]), array[]::text[]) into lista from regexp_matches(coalesce(d, ''), '''([a-z_]+)''::text', 'g') as m;
  foreach t in array array['compra_pase', 'recompensa_pase', 'torneo_premium'] loop
    if not (t = any (lista)) then lista := lista || t; end if;
  end loop;
  alter table public.movimientos_tokens drop constraint if exists movimientos_tokens_tipo_check;
  execute format('alter table public.movimientos_tokens add constraint movimientos_tokens_tipo_check check (tipo = any (%L::text[]))', lista);
end $$;

-- 2) Ajustes -------------------------------------------------------------------------------------------------------------------------
insert into public.economia_config (clave, valor) values ('torneo_premium_gemas', '300'), ('pase_gracia_dias', '7') on conflict (clave) do nothing;

-- 3) Tablas ----------------------------------------------------------------------------------------------------------------------------
create table if not exists public.pase_temporadas (
  id uuid primary key default gen_random_uuid(),
  clave text not null unique check (clave ~ '^[a-z0-9_-]{2,30}$'),
  nombre text not null check (char_length(nombre) between 3 and 60),
  inicia timestamptz not null,
  termina timestamptz not null,
  niveles integer not null default 30 check (niveles between 1 and 100),
  xp_por_nivel integer not null default 100 check (xp_por_nivel between 10 and 5000),
  precio_gemas integer not null default 150 check (precio_gemas between 50 and 1000),
  activa boolean not null default true,
  created_at timestamptz not null default now(),
  check (termina > inicia)
);

create table if not exists public.pase_recompensas (
  temporada_id uuid not null references public.pase_temporadas (id) on delete cascade,
  nivel integer not null check (nivel >= 1),
  pista text not null check (pista in ('gratis', 'premium')),
  tipo text not null check (tipo in ('ascuas', 'gemas', 'item')),
  cantidad integer check (cantidad is null or cantidad between 1 and 5000),
  item_id bigint references public.tienda_items (id) on delete restrict,
  primary key (temporada_id, nivel, pista),
  check ((tipo = 'item' and item_id is not null and cantidad is null) or (tipo <> 'item' and item_id is null and cantidad is not null)),
  check (tipo <> 'gemas' or (pista = 'premium' and cantidad <= 200))
);

create table if not exists public.pase_compras (
  usuario_id uuid not null references auth.users (id) on delete cascade,
  temporada_id uuid not null references public.pase_temporadas (id) on delete restrict,
  gemas_pagadas integer not null check (gemas_pagadas > 0),
  movimiento_id bigint,
  created_at timestamptz not null default now(),
  primary key (usuario_id, temporada_id)
);

create table if not exists public.pase_reclamos (
  usuario_id uuid not null references auth.users (id) on delete cascade,
  temporada_id uuid not null references public.pase_temporadas (id) on delete restrict,
  nivel integer not null,
  pista text not null check (pista in ('gratis', 'premium')),
  tipo text not null check (tipo in ('ascuas', 'gemas', 'item')),
  cantidad integer,
  item_id bigint,
  created_at timestamptz not null default now(),
  primary key (usuario_id, temporada_id, nivel, pista)
);

create table if not exists public.torneo_premium (
  torneo_id bigint primary key references public.torneos_libres (id) on delete cascade,
  comprado_por uuid not null references auth.users (id) on delete cascade,
  gemas_pagadas integer not null check (gemas_pagadas > 0),
  movimiento_id bigint,
  created_at timestamptz not null default now()
);

-- RLS cerrada: nadie escribe desde el navegador; solo leen lo público o lo propio
alter table public.pase_temporadas enable row level security;
alter table public.pase_recompensas enable row level security;
alter table public.pase_compras enable row level security;
alter table public.pase_reclamos enable row level security;
alter table public.torneo_premium enable row level security;
revoke all on public.pase_temporadas, public.pase_recompensas, public.pase_compras, public.pase_reclamos, public.torneo_premium from public, anon, authenticated;
grant select on public.pase_temporadas, public.pase_recompensas to anon, authenticated;
grant select on public.pase_compras, public.pase_reclamos to authenticated;
grant select (torneo_id, created_at) on public.torneo_premium to anon, authenticated;
create policy pase_temporadas_lee on public.pase_temporadas for select to anon, authenticated using (true);
create policy pase_recompensas_lee on public.pase_recompensas for select to anon, authenticated using (true);
create policy pase_compras_lee on public.pase_compras for select to authenticated using (usuario_id = (select auth.uid()));
create policy pase_reclamos_lee on public.pase_reclamos for select to authenticated using (usuario_id = (select auth.uid()));
create policy torneo_premium_lee on public.torneo_premium for select to anon, authenticated
  using (exists (select 1 from public.torneos_libres t where t.id = torneo_id));   -- hereda la visibilidad del torneo (no filtra privados)

-- 4) Ayudas privadas -------------------------------------------------------------------------------------------------------------------
create or replace function private.pase_vigente() returns public.pase_temporadas
language sql stable security definer set search_path = '' as $$
  select * from public.pase_temporadas where activa and inicia <= now() order by inicia desc limit 1
$$;

create or replace function private.pase_xp(p_usuario uuid, p_t public.pase_temporadas) returns integer
language sql stable security definer set search_path = '' as $$
  select coalesce(sum(puntos), 0)::integer from public.xp_movimientos where usuario_id = p_usuario and created_at >= p_t.inicia and created_at < p_t.termina
$$;

create or replace function private.pase_nivel(p_xp integer, p_t public.pase_temporadas) returns integer
language sql immutable set search_path = '' as $$
  select least(p_t.niveles, greatest(0, p_xp) / p_t.xp_por_nivel)
$$;

create or replace function private.pase_sin_solape() returns trigger
language plpgsql set search_path = '' as $$
begin
  if new.activa and exists (select 1 from public.pase_temporadas o where o.id <> new.id and o.activa and tstzrange(o.inicia, o.termina) && tstzrange(new.inicia, new.termina)) then
    raise exception 'Esa temporada se cruza en fechas con otra temporada activa.';
  end if;
  return new;
end $$;
drop trigger if exists trg_pase_sin_solape on public.pase_temporadas;
create trigger trg_pase_sin_solape before insert or update on public.pase_temporadas for each row execute function private.pase_sin_solape();

-- 5) Estado del pase (público; la parte personal solo con sesión) -----------------------------------------------------------------
create or replace function public.pase_estado() returns jsonb
language plpgsql stable security definer set search_path = '' as $$
declare yo uuid := (select auth.uid()); t public.pase_temporadas; gracia integer := coalesce(nullif(private.config('pase_gracia_dias'), '')::integer, 7);
        xp integer := 0; niv integer := 0; prem boolean := false; rec jsonb; prox jsonb;
begin
  select jsonb_build_object('nombre', nombre, 'inicia', inicia, 'termina', termina) into prox from public.pase_temporadas where activa and inicia > now() order by inicia limit 1;
  select * into t from private.pase_vigente();
  if t.id is null or now() >= t.termina + make_interval(days => gracia) then return jsonb_build_object('temporada', null, 'proxima', prox); end if;
  if yo is not null then
    xp := private.pase_xp(yo, t); niv := private.pase_nivel(xp, t);
    prem := exists (select 1 from public.pase_compras c where c.usuario_id = yo and c.temporada_id = t.id);
  end if;
  select coalesce(jsonb_agg(jsonb_build_object('nivel', r.nivel, 'pista', r.pista, 'tipo', r.tipo, 'cantidad', r.cantidad,
           'item', case when i.id is null then null else jsonb_build_object('id', i.id, 'clave', i.clave, 'nombre', i.nombre, 'categoria', i.categoria, 'rareza', i.rareza, 'estilo', i.estilo) end,
           'reclamada', c.nivel is not null) order by r.nivel, r.pista), '[]'::jsonb) into rec
    from public.pase_recompensas r left join public.tienda_items i on i.id = r.item_id
    left join public.pase_reclamos c on c.usuario_id = yo and c.temporada_id = r.temporada_id and c.nivel = r.nivel and c.pista = r.pista
   where r.temporada_id = t.id;
  return jsonb_build_object('temporada', jsonb_build_object('id', t.id, 'clave', t.clave, 'nombre', t.nombre, 'inicia', t.inicia, 'termina', t.termina, 'niveles', t.niveles,
             'xp_por_nivel', t.xp_por_nivel, 'precio_gemas', t.precio_gemas, 'en_gracia', now() >= t.termina, 'gracia_dias', gracia),
           'recompensas', rec, 'proxima', prox,
           'yo', case when yo is null then null else jsonb_build_object('xp', xp, 'nivel', niv, 'xp_en_nivel', case when niv >= t.niveles then 0 else xp - niv * t.xp_por_nivel end, 'tengo_premium', prem) end);
end $$;
revoke all on function public.pase_estado() from public;
grant execute on function public.pase_estado() to anon, authenticated;

-- 6) Comprar el pase (una vez por temporada, con gemas) -------------------------------------------------------------------------
create or replace function public.pase_comprar() returns jsonb
language plpgsql security definer set search_path = '' as $$
declare yo uuid := private.uid_requerido(); t public.pase_temporadas; mov bigint; g integer;
begin
  select * into t from private.pase_vigente();
  if t.id is null or now() >= t.termina then raise exception 'Ahora no hay una temporada abierta para comprar el pase.'; end if;
  if exists (select 1 from public.pase_compras where usuario_id = yo and temporada_id = t.id) then raise exception 'Ya tienes el pase de esta temporada.'; end if;
  mov := private.registrar_movimiento(yo, -t.precio_gemas, 'compra_pase', 'pase', t.clave, 'pase:' || yo::text || ':' || t.id::text, 'gemas');
  if mov is null then raise exception 'Ya tienes el pase de esta temporada.'; end if;   -- la clave ya estaba en el libro: no se cobra dos veces
  insert into public.pase_compras (usuario_id, temporada_id, gemas_pagadas, movimiento_id) values (yo, t.id, t.precio_gemas, mov);
  select gemas into g from public.billeteras where usuario_id = yo;
  return jsonb_build_object('temporada', t.nombre, 'precio', t.precio_gemas, 'gemas', coalesce(g, 0));
end $$;
revoke all on function public.pase_comprar() from public, anon;
grant execute on function public.pase_comprar() to authenticated;

-- 7) Reclamar un premio (una vez por nivel y pista) ----------------------------------------------------------------------------
create or replace function public.pase_reclamar(p_nivel integer, p_pista text) returns jsonb
language plpgsql security definer set search_path = '' as $$
declare yo uuid := private.uid_requerido(); t public.pase_temporadas; r public.pase_recompensas; it public.tienda_items; gracia integer := coalesce(nullif(private.config('pase_gracia_dias'), '')::integer, 7);
        n integer; compensado boolean := false; clave text; nombre text;
begin
  if p_pista not in ('gratis', 'premium') then raise exception 'Pista desconocida.'; end if;
  select * into t from private.pase_vigente();
  if t.id is null or now() >= t.termina + make_interval(days => gracia) then raise exception 'No hay una temporada abierta para reclamar.'; end if;
  if p_nivel is null or p_nivel < 1 or p_nivel > t.niveles then raise exception 'Ese nivel no existe.'; end if;
  if private.pase_nivel(private.pase_xp(yo, t), t) < p_nivel then raise exception 'Todavía no llegas al nivel %.', p_nivel; end if;
  select * into r from public.pase_recompensas where temporada_id = t.id and nivel = p_nivel and pista = p_pista;
  if not found then raise exception 'Ese nivel no tiene premio en esa pista.'; end if;
  if p_pista = 'premium' and not exists (select 1 from public.pase_compras where usuario_id = yo and temporada_id = t.id) then raise exception 'Necesitas el pase premium para este premio.'; end if;
  insert into public.pase_reclamos (usuario_id, temporada_id, nivel, pista, tipo, cantidad, item_id) values (yo, t.id, p_nivel, p_pista, r.tipo, r.cantidad, r.item_id) on conflict do nothing;
  get diagnostics n = row_count;
  if n = 0 then raise exception 'Ya reclamaste este premio.'; end if;
  clave := 'pase:r:' || yo::text || ':' || t.id::text || ':' || p_nivel::text || ':' || p_pista;
  if r.tipo = 'item' then
    select * into it from public.tienda_items where id = r.item_id;
    nombre := it.nombre;
    if exists (select 1 from public.inventario where usuario_id = yo and item_id = it.id) then   -- ya lo tenía: se compensa con ascuas
      perform private.registrar_movimiento(yo, 100, 'recompensa_pase', 'pase', t.clave || ':' || p_nivel::text || ':' || p_pista, clave, 'ascuas');
      update public.pase_reclamos set tipo = 'ascuas', cantidad = 100, item_id = null where usuario_id = yo and temporada_id = t.id and nivel = p_nivel and pista = p_pista;
      compensado := true;
    else
      insert into public.inventario (usuario_id, item_id, categoria, precio_pagado, moneda_pagada) values (yo, it.id, it.categoria, 0, null);
    end if;
  else
    perform private.registrar_movimiento(yo, r.cantidad, 'recompensa_pase', 'pase', t.clave || ':' || p_nivel::text || ':' || p_pista, clave, case r.tipo when 'gemas' then 'gemas' else 'ascuas' end);
  end if;
  return jsonb_build_object('tipo', case when compensado then 'ascuas' else r.tipo end, 'cantidad', case when compensado then 100 else r.cantidad end, 'objeto', nombre, 'compensado', compensado);
end $$;
revoke all on function public.pase_reclamar(integer, text) from public, anon;
grant execute on function public.pase_reclamar(integer, text) to authenticated;

-- 8) Administración del pase (solo administrador, queda en la auditoría) ----------------------------------------------------------
create or replace function public.admin_pase_temporada(p_id uuid, p_clave text, p_nombre text, p_inicia timestamptz, p_termina timestamptz,
                                                         p_niveles integer, p_xp_por_nivel integer, p_precio_gemas integer, p_activa boolean) returns uuid
language plpgsql security definer set search_path = '' as $$
declare v uuid; ant public.pase_temporadas; gemas integer;
begin
  if not private.admin_seguro() then raise exception 'Solo el administrador puede editar el pase.'; end if;
  if p_id is not null then
    select * into ant from public.pase_temporadas where id = p_id for update;
    if not found then raise exception 'Esa temporada no existe.'; end if;
    if (exists (select 1 from public.pase_compras where temporada_id = p_id) or exists (select 1 from public.pase_reclamos where temporada_id = p_id))
       and (ant.inicia <> p_inicia or ant.niveles <> p_niveles or ant.xp_por_nivel <> p_xp_por_nivel) then
      raise exception 'Ya hay compras o premios reclamados: no se pueden cambiar el inicio, los niveles ni la XP por nivel.';
    end if;
    select coalesce(sum(cantidad), 0) into gemas from public.pase_recompensas where temporada_id = p_id and tipo = 'gemas';
    if gemas >= p_precio_gemas then raise exception 'Las gemas de regreso (%) deben ser menores que el precio del pase.', gemas; end if;
    if exists (select 1 from public.pase_recompensas where temporada_id = p_id and nivel > p_niveles) then raise exception 'Hay premios en niveles mayores al nuevo total de niveles.'; end if;
    update public.pase_temporadas set clave = p_clave, nombre = p_nombre, inicia = p_inicia, termina = p_termina, niveles = p_niveles, xp_por_nivel = p_xp_por_nivel, precio_gemas = p_precio_gemas, activa = p_activa where id = p_id;
    v := p_id;
  else
    insert into public.pase_temporadas (clave, nombre, inicia, termina, niveles, xp_por_nivel, precio_gemas, activa) values (p_clave, p_nombre, p_inicia, p_termina, p_niveles, p_xp_por_nivel, p_precio_gemas, p_activa) returning id into v;
  end if;
  perform private.auditar_moderacion('editar', 'pase_temporadas', v::text, p_nombre, jsonb_build_object('precio_gemas', p_precio_gemas, 'niveles', p_niveles, 'activa', p_activa), 'Temporada del pase');
  return v;
end $$;
revoke all on function public.admin_pase_temporada(uuid, text, text, timestamptz, timestamptz, integer, integer, integer, boolean) from public, anon;
grant execute on function public.admin_pase_temporada(uuid, text, text, timestamptz, timestamptz, integer, integer, integer, boolean) to authenticated;

-- p_tipo = null borra el premio (si nadie lo reclamó). p_item_clave: un objeto que ya exista en tienda_items.
create or replace function public.admin_pase_recompensa(p_temporada uuid, p_nivel integer, p_pista text, p_tipo text, p_cantidad integer, p_item_clave text) returns void
language plpgsql security definer set search_path = '' as $$
declare t public.pase_temporadas; it bigint; gemas integer;
begin
  if not private.admin_seguro() then raise exception 'Solo el administrador puede editar el pase.'; end if;
  select * into t from public.pase_temporadas where id = p_temporada;
  if not found then raise exception 'Esa temporada no existe.'; end if;
  if p_nivel < 1 or p_nivel > t.niveles then raise exception 'El nivel debe estar entre 1 y %.', t.niveles; end if;
  if p_pista not in ('gratis', 'premium') then raise exception 'Pista desconocida.'; end if;
  if p_tipo is null then
    if exists (select 1 from public.pase_reclamos where temporada_id = p_temporada and nivel = p_nivel and pista = p_pista) then raise exception 'Alguien ya reclamó este premio: no se puede borrar.'; end if;
    delete from public.pase_recompensas where temporada_id = p_temporada and nivel = p_nivel and pista = p_pista;
  else
    if p_tipo not in ('ascuas', 'gemas', 'item') then raise exception 'Tipo de premio desconocido.'; end if;
    if p_tipo = 'item' then
      select id into it from public.tienda_items where clave = p_item_clave;
      if it is null then raise exception 'Ese objeto no existe en la tienda.'; end if;
    end if;
    if p_tipo = 'gemas' then
      if p_pista <> 'premium' then raise exception 'La pista gratis no puede dar gemas.'; end if;
      select coalesce(sum(cantidad), 0) into gemas from public.pase_recompensas where temporada_id = p_temporada and tipo = 'gemas' and not (nivel = p_nivel and pista = p_pista);
      if gemas + p_cantidad >= t.precio_gemas then raise exception 'Las gemas de regreso deben sumar menos que el precio del pase (%).', t.precio_gemas; end if;
    end if;
    insert into public.pase_recompensas (temporada_id, nivel, pista, tipo, cantidad, item_id)
    values (p_temporada, p_nivel, p_pista, p_tipo, case when p_tipo = 'item' then null else p_cantidad end, it)
    on conflict (temporada_id, nivel, pista) do update set tipo = excluded.tipo, cantidad = excluded.cantidad, item_id = excluded.item_id;
  end if;
  perform private.auditar_moderacion('editar', 'pase_recompensas', p_temporada::text || ':' || p_nivel::text || ':' || p_pista, t.nombre, jsonb_build_object('tipo', p_tipo, 'cantidad', p_cantidad, 'item', p_item_clave), 'Premio del pase');
end $$;
revoke all on function public.admin_pase_recompensa(uuid, integer, text, text, integer, text) from public, anon;
grant execute on function public.admin_pase_recompensa(uuid, integer, text, text, integer, text) to authenticated;

-- 9) Torneo premium ---------------------------------------------------------------------------------------------------------------------
create or replace function public.torneo_premium_info(p_torneo bigint) returns jsonb
language plpgsql stable security definer set search_path = '' as $$
declare yo uuid := (select auth.uid()); t public.torneos_libres; precio integer := coalesce(nullif(private.config('torneo_premium_gemas'), '')::integer, 300);
        prem boolean; motivo text;
begin
  select * into t from public.torneos_libres where id = p_torneo and (not oculto or private.es_moderador());
  if not found then return jsonb_build_object('existe', false); end if;
  prem := exists (select 1 from public.torneo_premium where torneo_id = p_torneo);
  motivo := case when prem then 'Este torneo ya es premium.' when yo is null or t.creador <> yo then 'Solo el organizador puede hacerlo premium.'
                 when t.estado not in ('inscripcion', 'en_curso') then 'Solo se puede en torneos en inscripción o en curso.' end;
  return jsonb_build_object('existe', true, 'premium', prem, 'precio_gemas', precio, 'puede', motivo is null, 'motivo', motivo);
end $$;
revoke all on function public.torneo_premium_info(bigint) from public;
grant execute on function public.torneo_premium_info(bigint) to anon, authenticated;

create or replace function public.torneo_hacer_premium(p_torneo bigint) returns jsonb
language plpgsql security definer set search_path = '' as $$
declare yo uuid := private.uid_requerido(); t public.torneos_libres; precio integer := coalesce(nullif(private.config('torneo_premium_gemas'), '')::integer, 300); mov bigint; g integer;
begin
  select * into t from public.torneos_libres where id = p_torneo for update;
  if not found or t.oculto then raise exception 'No encontramos ese torneo.'; end if;
  if t.creador <> yo then raise exception 'Solo el organizador puede hacer premium este torneo.'; end if;
  if private.esta_sancionado(yo) then raise exception 'Tu cuenta está sancionada.'; end if;
  if t.estado not in ('inscripcion', 'en_curso') then raise exception 'Solo se puede en torneos en inscripción o en curso.'; end if;
  if exists (select 1 from public.torneo_premium where torneo_id = p_torneo) then raise exception 'Este torneo ya es premium.'; end if;
  if precio <= 0 then raise exception 'El torneo premium no está disponible ahora.'; end if;
  mov := private.registrar_movimiento(yo, -precio, 'torneo_premium', 'torneo', p_torneo::text, 'torneoprem:' || p_torneo::text, 'gemas');
  if mov is null then raise exception 'Este torneo ya es premium.'; end if;
  insert into public.torneo_premium (torneo_id, comprado_por, gemas_pagadas, movimiento_id) values (p_torneo, yo, precio, mov);
  perform private.tl_evento(p_torneo, 'premium', jsonb_build_object('gemas', precio));
  select gemas into g from public.billeteras where usuario_id = yo;
  return jsonb_build_object('torneo', t.nombre, 'precio', precio, 'gemas', coalesce(g, 0));
end $$;
revoke all on function public.torneo_hacer_premium(bigint) from public, anon;
grant execute on function public.torneo_hacer_premium(bigint) to authenticated;

-- 10) Primera temporada «Despegue» (60 días, 30 niveles, 100 XP por nivel, 150 gemas) -------------------------------------------------
-- Objetos exclusivos del pase: inactivos = no salen en la tienda ni se pueden comprar; solo llegan al inventario por el pase.
insert into public.tienda_items (clave, nombre, descripcion, categoria, precio, nivel_min, estilo, rareza, precio_ascuas, precio_gemas, stock, activo) values
  ('marco_pase_despegue', 'Marco Despegue', 'Exclusivo del Phoenix Pass: Temporada 1.', 'marco', 0, 1, '{"color":"#00e5ff","color2":"#ffc828"}', 'epico', null, 999, null, false),
  ('fondo_pase_despegue', 'Fondo Despegue', 'Exclusivo del Phoenix Pass: Temporada 1.', 'fondo', 0, 1, '{"color":"#0b1a3a","color2":"#00e5ff"}', 'epico', null, 999, null, false),
  ('insignia_pase_despegue', 'Insignia Cohete', 'Exclusiva del Phoenix Pass: Temporada 1.', 'insignia', 0, 1, '{"icono":"fa-rocket","color":"#00e5ff"}', 'epico', null, 999, null, false),
  ('titulo_pase_piloto', 'Piloto T1', 'Exclusivo del Phoenix Pass: Temporada 1.', 'titulo', 0, 1, '{"texto":"Piloto T1","color":"#00e5ff"}', 'epico', null, 999, null, false),
  ('clan_pase_despegue', 'Etiqueta Despegue', 'Exclusiva del Phoenix Pass: Temporada 1.', 'color_clan', 0, 1, '{"color":"#00e5ff"}', 'epico', null, 999, null, false),
  ('marco_pase_fenix', 'Marco Fénix del Pase', 'Premio final del Phoenix Pass: Temporada 1.', 'marco', 0, 1, '{"color":"#ffc828","color2":"#ff3dc8"}', 'legendario', null, 999, null, false)
on conflict (clave) do nothing;

insert into public.pase_temporadas (clave, nombre, inicia, termina, niveles, xp_por_nivel, precio_gemas, activa)
values ('despegue', 'Temporada 1 · Despegue', timestamptz '2026-10-17 00:00:00-05', timestamptz '2026-12-16 00:00:00-05', 30, 100, 150, true)
on conflict (clave) do nothing;

-- Pista gratis: ascuas (40/80/120 por tramo de 10 niveles) y un objeto común existente en los niveles 10, 20 y 30
insert into public.pase_recompensas (temporada_id, nivel, pista, tipo, cantidad, item_id)
select t.id, n, 'gratis', case when n in (10, 20, 30) then 'item' else 'ascuas' end,
       case when n in (10, 20, 30) then null else 40 * (1 + (n - 1) / 10) end,
       case n when 10 then (select id from public.tienda_items where clave = 'marco_hielo')
              when 20 then (select id from public.tienda_items where clave = 'titulo_imparable')
              when 30 then (select id from public.tienda_items where clave = 'insignia_rayo') end
  from public.pase_temporadas t, generate_series(1, 30) n where t.clave = 'despegue'
on conflict do nothing;

-- Pista premium: objeto exclusivo cada 5 niveles, 10 gemas de regreso (6 veces = 60) y 60 ascuas en el resto
insert into public.pase_recompensas (temporada_id, nivel, pista, tipo, cantidad, item_id)
select t.id, n, 'premium',
       case when n in (5, 10, 15, 20, 25, 30) then 'item' when n in (3, 8, 13, 18, 23, 28) then 'gemas' else 'ascuas' end,
       case when n in (5, 10, 15, 20, 25, 30) then null when n in (3, 8, 13, 18, 23, 28) then 10 else 60 end,
       case n when 5 then (select id from public.tienda_items where clave = 'marco_pase_despegue')
              when 10 then (select id from public.tienda_items where clave = 'fondo_pase_despegue')
              when 15 then (select id from public.tienda_items where clave = 'insignia_pase_despegue')
              when 20 then (select id from public.tienda_items where clave = 'titulo_pase_piloto')
              when 25 then (select id from public.tienda_items where clave = 'clan_pase_despegue')
              when 30 then (select id from public.tienda_items where clave = 'marco_pase_fenix') end
  from public.pase_temporadas t, generate_series(1, 30) n where t.clave = 'despegue'
on conflict do nothing;

-- 140 · Ascuas solo gratis: nada comprado con dinero puede acabar en un reto con pozo. Informe: docs/economia/AUDITORIA-DINERO-Y-APUESTAS-21-OCT-2026.md.
-- Cierra el puente soles → gemas → Phoenix Pass premium → ascuas → pozo, y quita el pago con gemas entre personas (alquiler de host).
-- No borra datos: al aplicarla había 0 compras del pase, 0 alquileres y 0 pozos.

-- 1) Pista premium del pase: sus premios en ascuas pasan a ser objetos cosméticos (comunes y raros primero, luego épicos) --------------
with libres as (
  select i.id, row_number() over (order by case i.rareza when 'comun' then 1 when 'raro' then 2 else 3 end, i.precio_gemas, i.id) n
    from public.tienda_items i
   where i.rareza in ('comun', 'raro', 'epico') and i.limitada_hasta is null
     and not exists (select 1 from public.pase_recompensas r where r.item_id = i.id)
), premios as (
  select temporada_id, nivel, row_number() over (partition by temporada_id order by nivel) n
    from public.pase_recompensas where pista = 'premium' and tipo = 'ascuas'
)
update public.pase_recompensas r set tipo = 'item', cantidad = null, item_id = l.id
  from premios p join libres l on l.n = p.n
 where r.temporada_id = p.temporada_id and r.nivel = p.nivel and r.pista = 'premium';

-- Lo que no tenga objeto libre (no debería quedar ninguno) se elimina solo si nadie lo reclamó; si alguien lo reclamó, la restricción de abajo falla y la migración se detiene.
delete from public.pase_recompensas r where r.pista = 'premium' and r.tipo = 'ascuas'
   and not exists (select 1 from public.pase_reclamos c where c.temporada_id = r.temporada_id and c.nivel = r.nivel and c.pista = r.pista);

alter table public.pase_recompensas drop constraint if exists pase_premium_sin_ascuas;
alter table public.pase_recompensas add constraint pase_premium_sin_ascuas check (tipo <> 'ascuas' or pista = 'gratis');

-- 2) Reclamar: en la pista premium un objeto repetido ya no se compensa con ascuas ------------------------------------------------------
create or replace function public.pase_reclamar(p_nivel integer, p_pista text)
 returns jsonb language plpgsql security definer set search_path to ''
as $function$
declare yo uuid := private.uid_requerido(); t public.pase_temporadas; r public.pase_recompensas; it public.tienda_items; gracia integer := coalesce(nullif(private.config('pase_gracia_dias'), '')::integer, 7);
        n integer; compensado boolean := false; repetido boolean := false; clave text; nombre text;
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
    if exists (select 1 from public.inventario where usuario_id = yo and item_id = it.id) then
      if p_pista = 'gratis' then
        perform private.registrar_movimiento(yo, 100, 'recompensa_pase', 'pase', t.clave || ':' || p_nivel::text || ':' || p_pista, clave, 'ascuas');
        update public.pase_reclamos set tipo = 'ascuas', cantidad = 100, item_id = null where usuario_id = yo and temporada_id = t.id and nivel = p_nivel and pista = p_pista;
        compensado := true;
      else
        repetido := true;
      end if;
    else
      insert into public.inventario (usuario_id, item_id, categoria, precio_pagado, moneda_pagada) values (yo, it.id, it.categoria, 0, null);
    end if;
  else
    perform private.registrar_movimiento(yo, r.cantidad, 'recompensa_pase', 'pase', t.clave || ':' || p_nivel::text || ':' || p_pista, clave, case r.tipo when 'gemas' then 'gemas' else 'ascuas' end);
  end if;
  return jsonb_build_object('tipo', case when compensado then 'ascuas' else r.tipo end, 'cantidad', case when compensado then 100 else r.cantidad end, 'objeto', nombre, 'compensado', compensado, 'repetido', repetido);
end $function$;

-- 3) Candado del libro: las ascuas solo entran por fuentes gratis; los pozos y las compras con dinero no cambian de moneda -------------
create or replace function private.libro_ascuas_solo_gratis() returns trigger
 language plpgsql set search_path to ''
as $function$
begin
  if new.tipo in ('apuesta_garantia', 'apuesta_premio', 'apuesta_devolucion') and new.moneda <> 'ascuas' then
    raise exception 'Los retos con pozo solo usan ascuas.';
  end if;
  if new.tipo in ('compra_dinero', 'bono_primera_compra') and new.moneda <> 'gemas' then
    raise exception 'Lo comprado con dinero solo puede ser gemas.';
  end if;
  if new.moneda = 'ascuas' and new.delta > 0 then
    if new.tipo not in ('ganado', 'ajuste_admin', 'apuesta_premio', 'apuesta_devolucion', 'recompensa_pase') then
      raise exception 'Las ascuas solo se ganan gratis (tipo % no permitido).', new.tipo;
    end if;
    if new.tipo = 'recompensa_pase' and coalesce(new.referencia, '') !~ ':gratis$' then
      raise exception 'Solo la pista gratis del pase puede dar ascuas.';
    end if;
  end if;
  return new;
end $function$;
revoke all on function private.libro_ascuas_solo_gratis() from public, anon, authenticated;

drop trigger if exists trg_libro_ascuas_solo_gratis on public.movimientos_tokens;
create trigger trg_libro_ascuas_solo_gratis before insert on public.movimientos_tokens
  for each row execute function private.libro_ascuas_solo_gratis();

-- 4) Alquiler de host: solo pago por fuera (nadie gana gemas de otra persona) ---------------------------------------------------------
update public.ofertas_host set acepta_gemas = false, gemas_hora = null, gemas_partido = null where acepta_gemas or gemas_hora is not null or gemas_partido is not null;

create or replace function private.alquiler_sin_gemas() returns trigger
 language plpgsql set search_path to ''
as $function$
begin
  if tg_table_name = 'ofertas_host' then
    new.acepta_gemas := false; new.gemas_hora := null; new.gemas_partido := null;
  elsif new.pago = 'gemas' then
    raise exception 'El alquiler con gemas ya no está disponible: acuerden el pago por fuera.';
  end if;
  return new;
end $function$;
revoke all on function private.alquiler_sin_gemas() from public, anon, authenticated;

drop trigger if exists trg_oferta_sin_gemas on public.ofertas_host;
create trigger trg_oferta_sin_gemas before insert or update on public.ofertas_host for each row execute function private.alquiler_sin_gemas();
drop trigger if exists trg_alquiler_sin_gemas on public.alquileres_host;
create trigger trg_alquiler_sin_gemas before insert on public.alquileres_host for each row execute function private.alquiler_sin_gemas();

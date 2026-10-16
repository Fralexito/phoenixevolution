-- 121 · ECONOMÍA Fase C · tres categorías nuevas de cosméticos: efecto_carta, banner y sonido_chat. Plan: docs/DISENO-ECONOMIA-COMPLETA.md §5 y §7.
-- Reglas: solo cosmético (nada de ventaja ni azar de pago); estilos SOLO por lista blanca (valores fijos o colores #RRGGBB; nunca CSS libre ni URLs);
-- legendarios y limitados solo con gemas. tienda_lista, equipamiento_de, comprar y equipar ya son genéricos por categoría y no cambian.

-- 1) Categorías permitidas ---------------------------------------------------------------------------------------------------------
alter table public.tienda_items drop constraint if exists tienda_items_categoria_check;
alter table public.tienda_items add constraint tienda_items_categoria_check
  check (categoria in ('marco', 'titulo', 'fondo', 'color_clan', 'insignia', 'efecto_carta', 'banner', 'sonido_chat'));

-- 2) Estilo válido: lista blanca por categoría ---------------------------------------------------------------------------------------
create or replace function private.estilo_valido(p_categoria text, p_estilo jsonb) returns boolean
language plpgsql immutable set search_path = '' as $$
declare k text; v jsonb; permitidas text[];
begin
  if p_estilo is null or jsonb_typeof(p_estilo) <> 'object' then return false; end if;
  permitidas := case p_categoria when 'marco' then array['color', 'color2'] when 'fondo' then array['color', 'color2'] when 'color_clan' then array['color']
                                 when 'titulo' then array['texto', 'color'] when 'insignia' then array['icono', 'color']
                                 when 'efecto_carta' then array['efecto'] when 'banner' then array['patron', 'color', 'color2']
                                 when 'sonido_chat' then array['sonido'] else array[]::text[] end;
  for k, v in select * from jsonb_each(p_estilo) loop
    if not (k = any (permitidas)) or jsonb_typeof(v) <> 'string' then return false; end if;
    if k in ('color', 'color2') and (v #>> '{}') !~ '^#[0-9a-fA-F]{6}$' then return false; end if;
    if k = 'texto' and (v #>> '{}') !~ '^[A-Za-zÁÉÍÓÚÜÑáéíóúüñ0-9 .!¡¿?-]{2,24}$' then return false; end if;
    if k = 'icono' and (v #>> '{}') !~ '^fa-[a-z0-9-]{2,30}$' then return false; end if;
    if k = 'efecto' and (v #>> '{}') not in ('holografico', 'dorado', 'aurora') then return false; end if;
    if k = 'patron' and (v #>> '{}') not in ('degradado', 'diagonal', 'rejilla', 'puntos') then return false; end if;
    if k = 'sonido' and (v #>> '{}') not in ('snd_campana_cristal', 'snd_pop_burbuja', 'snd_moneda_dorada', 'snd_gol_estadio') then return false; end if;
  end loop;
  return case p_categoria when 'marco' then p_estilo ? 'color' when 'fondo' then p_estilo ? 'color' when 'color_clan' then p_estilo ? 'color'
                          when 'titulo' then p_estilo ? 'texto' when 'insignia' then p_estilo ? 'icono'
                          when 'efecto_carta' then p_estilo ? 'efecto' when 'banner' then (p_estilo ? 'color' and p_estilo ? 'patron')
                          when 'sonido_chat' then p_estilo ? 'sonido' else false end;
end $$;

-- 3) Objetos nuevos (precios por rareza, §5: común 12–30 · raro 40–80 · épico 120–250 · legendario 300–600 gemas; ascuas = gemas × 5 si se permiten) --
insert into public.tienda_items (clave, nombre, descripcion, categoria, precio, nivel_min, estilo, rareza, precio_ascuas, precio_gemas, stock, limitada_hasta) values
  ('efecto_holografico', 'Efecto holográfico', 'Tu carta brilla con reflejos de arcoíris al mirarla.', 'efecto_carta', 350, 4, '{"efecto":"holografico"}', 'raro', 350, 70, null, null),
  ('efecto_dorado', 'Efecto dorado', 'Un brillo de oro recorre tu carta.', 'efecto_carta', 800, 6, '{"efecto":"dorado"}', 'epico', 800, 160, null, null),
  ('efecto_aurora', 'Efecto aurora', 'Luces verdes y violetas que ondulan sobre tu carta.', 'efecto_carta', 1600, 10, '{"efecto":"aurora"}', 'legendario', null, 320, null, null),
  ('banner_atardecer', 'Banner Atardecer', 'Degradado de naranja a rosa para tu perfil.', 'banner', 120, 1, '{"patron":"degradado","color":"#ff7a18","color2":"#ff3dc8"}', 'comun', 120, 24, null, null),
  ('banner_medianoche', 'Banner Medianoche', 'Rayas diagonales azul noche.', 'banner', 250, 4, '{"patron":"diagonal","color":"#0b1a4a","color2":"#3a5bff"}', 'raro', 250, 50, null, null),
  ('banner_rejilla_neon', 'Banner Rejilla Neón', 'Una rejilla cian sobre fondo oscuro, estilo galaxia.', 'banner', 650, 6, '{"patron":"rejilla","color":"#0a0f2c","color2":"#00e5ff"}', 'epico', 650, 130, null, null),
  ('banner_estelar', 'Banner Estelar', 'Un campo de estrellas doradas sobre el vacío.', 'banner', 1750, 10, '{"patron":"puntos","color":"#05040f","color2":"#ffc828"}', 'legendario', null, 350, null, null),
  ('sonido_campana_cristal', 'Sonido Campana de cristal', 'Un tintineo limpio al llegar un mensaje tuyo.', 'sonido_chat', 75, 1, '{"sonido":"snd_campana_cristal"}', 'comun', 75, 15, null, null),
  ('sonido_pop_burbuja', 'Sonido Pop de burbuja', 'Un «pop» suave y corto.', 'sonido_chat', 100, 1, '{"sonido":"snd_pop_burbuja"}', 'comun', 100, 20, null, null),
  ('sonido_moneda_dorada', 'Sonido Moneda dorada', 'El clic de una moneda de oro.', 'sonido_chat', 225, 4, '{"sonido":"snd_moneda_dorada"}', 'raro', 225, 45, null, null),
  ('sonido_gol_estadio', 'Sonido Gol de estadio', 'Un rugido de hinchada cada vez que hablas.', 'sonido_chat', 600, 6, '{"sonido":"snd_gol_estadio"}', 'epico', 600, 120, null, null)
on conflict (clave) do nothing;

-- 4) Efectos de carta de varias personas a la vez (para pintar listas de cartas con una sola llamada) ---------------------------------
-- Devuelve {usuario_id: 'holografico'|'dorado'|'aurora'} solo de quien lo tiene equipado y deja verse (misma regla que equipamiento_de).
create or replace function public.efectos_carta_de(p_usuarios uuid[]) returns jsonb
language plpgsql stable security definer set search_path = '' as $$
declare yo uuid := (select auth.uid());
begin
  if p_usuarios is null or cardinality(p_usuarios) = 0 then return '{}'::jsonb; end if;
  return coalesce((select jsonb_object_agg(i.usuario_id::text, t.estilo ->> 'efecto')
    from public.inventario i join public.tienda_items t on t.id = i.item_id
    where i.equipado and i.categoria = 'efecto_carta' and i.usuario_id = any (p_usuarios[1:100]) and private.puede_ver_muro(i.usuario_id, yo)), '{}'::jsonb);
end $$;
revoke all on function public.efectos_carta_de(uuid[]) from public;
grant execute on function public.efectos_carta_de(uuid[]) to anon, authenticated;

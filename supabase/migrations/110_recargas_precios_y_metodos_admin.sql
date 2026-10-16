-- 110 · RECARGAS · Precios acordados (1 gema = S/ 0,10, más gemas por sol en los paquetes grandes) y listado completo de métodos para el administrador.
-- Los paquetes antiguos (pack_100, pack_550, pack_1200) se DESACTIVAN, no se borran: las órdenes viejas siguen apuntando a ellos.
-- Depende de 051 (paquetes_tokens) y 109 (pagos_metodos).

insert into public.paquetes_tokens (clave, nombre, tokens, precio_centimos, moneda, activo) values
  ('gemas_100', '100 gemas', 100, 1000, 'PEN', true),
  ('gemas_300', '300 gemas', 300, 2700, 'PEN', true),
  ('gemas_700', '700 gemas', 700, 5500, 'PEN', true)
on conflict (clave) do nothing;

update public.paquetes_tokens set activo = false where clave in ('pack_100', 'pack_550', 'pack_1200');

create or replace function public.admin_metodos_pago() returns jsonb
language plpgsql stable security definer set search_path = '' as $$
begin
  if not private.es_admin() then raise exception 'Solo el administrador puede ver todos los métodos de pago.'; end if;
  return coalesce((select jsonb_agg(to_jsonb(m) order by m.orden, m.clave) from public.pagos_metodos m), '[]'::jsonb);
end $$;
revoke all on function public.admin_metodos_pago() from public, anon;
grant execute on function public.admin_metodos_pago() to authenticated;

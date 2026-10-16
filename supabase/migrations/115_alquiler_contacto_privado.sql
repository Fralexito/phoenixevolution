-- Alquiler de host: el CONTACTO del host ya no lo lee cualquiera; solo lo recibe el cliente cuando el host acepta (o después de completar).
-- 1) Quitar la lectura directa de ofertas_host y dejar solo las columnas públicas (sin «contacto»).
revoke select on public.ofertas_host from authenticated;
grant select (host, activa, precio_hora_centimos, precio_partido_centimos, acepta_gemas, gemas_hora, gemas_partido, notas, actualizada) on public.ofertas_host to authenticated;

-- 2) «Mi oferta»: cada host lee su propia fila completa (incluye contacto) por esta función.
create or replace function public.mi_oferta_host() returns jsonb
language sql stable security definer set search_path = '' as $$
  select to_jsonb(o) from public.ofertas_host o where o.host = (select auth.uid())
$$;
revoke all on function public.mi_oferta_host() from public, anon;
grant execute on function public.mi_oferta_host() to authenticated;

-- 3) «Mis alquileres»: añade id y usuario de la otra persona (para enlazar al chat y al perfil) y el contacto del host SOLO al cliente con alquiler ACEPTADO o COMPLETADO.
create or replace function public.mis_alquileres() returns jsonb
language sql stable security definer set search_path = '' as $$
  select coalesce(jsonb_agg(jsonb_build_object('id', a.id, 'soy_host', a.host = (select auth.uid()),
    'otro', private.nombre(case when a.host = (select auth.uid()) then a.cliente else a.host end),
    'otro_id', case when a.host = (select auth.uid()) then a.cliente else a.host end,
    'otro_username', (select p.username from public.perfiles p where p.id = case when a.host = (select auth.uid()) then a.cliente else a.host end),
    'contacto', case when a.cliente = (select auth.uid()) and a.estado in ('ACEPTADO', 'COMPLETADO') then (select o.contacto from public.ofertas_host o where o.host = a.host) end,
    'modalidad', a.modalidad, 'cantidad', a.cantidad, 'fecha', a.fecha, 'pago', a.pago, 'monto_centimos', a.monto_centimos, 'monto_gemas', a.monto_gemas,
    'mensaje', a.mensaje, 'estado', a.estado, 'creado', a.creado) order by a.creado desc), '[]'::jsonb)
  from public.alquileres_host a where (select auth.uid()) in (a.host, a.cliente) and a.creado > now() - interval '90 days'
$$;

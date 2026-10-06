-- 062 · Arreglo: public.sistema_semaforo (la usa la Edge Function con service_role) llamaba a private.umbrales/private.semaforo
-- sin ser security definer; service_role no tiene permiso sobre el esquema private → /v1/diagnostico y /v1/sala/prueba daban 500.
-- Aplicada directamente por MCP el 6 oct 2026.
create or replace function public.sistema_semaforo(p_reglas jsonb, p_ping numeric, p_jitter numeric, p_perdida numeric) returns jsonb
language sql stable security definer set search_path = '' as $$
  select jsonb_build_object('semaforo', private.semaforo(private.umbrales(p_reglas), p_ping, p_jitter, p_perdida), 'umbrales', private.umbrales(p_reglas))
$$;
revoke all on function public.sistema_semaforo(jsonb, numeric, numeric, numeric) from public, anon, authenticated;
grant execute on function public.sistema_semaforo(jsonb, numeric, numeric, numeric) to service_role;

-- 039 · Cola de marcadores en disputa para el staff. Depende de 036 (resultados_duelo, resolver_resultado_staff) y 030/032 (roles, es_moderador).
-- Solo LEE: la decisión sigue siendo public.resolver_resultado_staff (con motivo y auditoría).
-- Primero salen los que agotaron los 3 intentos (nadie puede ya resolverlos salvo moderación), luego los demás, del más antiguo al más reciente.
create or replace function public.resultados_disputados(p_limite integer default 30) returns jsonb
language plpgsql stable security definer set search_path = '' as $$
declare yo uuid := private.uid_requerido(); n integer := least(greatest(coalesce(p_limite, 30), 1), 50);
begin
  if not private.es_moderador() then raise exception 'No tienes permiso para ver los marcadores en disputa.' using errcode = '42501'; end if;
  return coalesce((select jsonb_agg(f.fila order by f.agotado desc, f.updated_at, f.reto_id) from (
    select x.reto_id, x.updated_at, (x.intentos >= 3) as agotado,
      jsonb_build_object('reto_id', x.reto_id, 'goles_a', x.goles_a, 'goles_b', x.goles_b, 'intentos', x.intentos, 'agotado', x.intentos >= 3, 'updated_at', x.updated_at,
        'cerrado_at', r.cerrado_at,
        'retador', jsonb_build_object('id', r.retador_id, 'nombre', private.nombre(r.retador_id)),
        'rival', jsonb_build_object('id', r.rival_id, 'nombre', private.nombre(r.rival_id))) as fila
    from public.resultados_duelo x join public.retos_matchmaking r on r.id = x.reto_id
    where x.estado = 'DISPUTADO' order by (x.intentos >= 3) desc, x.updated_at, x.reto_id limit n) f), '[]'::jsonb);
end $$;
revoke all on function public.resultados_disputados(integer) from public, anon;
grant execute on function public.resultados_disputados(integer) to authenticated;

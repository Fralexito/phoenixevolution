-- 063 · MÓDULO 2 · «Mejor host para el par» (smash-soda-producto.md §5: en rojo, proponer otro host o uno neutral).
-- Con las muestras reales de ping (14 días) busca hosts aprobados que hayan hosteado a AMBOS jugadores y los ordena por JUSTICIA:
--   1) el peor de los dos pings (nadie debe jugar con lag alto) y 2) la diferencia entre ambos (que el host no favorezca a uno).
-- Solo agregados; lo piden los dos jugadores o staff. Con p_neutral = true se excluye a los propios jugadores como host.
create or replace function public.mejores_hosts(p_jugador_a uuid, p_jugador_b uuid, p_neutral boolean default false,
  p_perfil text default 'amistoso', p_limite integer default 5) returns jsonb
language plpgsql stable security definer set search_path = '' as $$
declare yo uuid := private.uid_requerido(); u jsonb; res jsonb;
begin
  if p_jugador_a is null or p_jugador_b is null or p_jugador_a = p_jugador_b then raise exception 'Indica dos jugadores distintos.' using errcode = '22023'; end if;
  if not (yo in (p_jugador_a, p_jugador_b) or private.es_staff()) then raise exception 'Solo los jugadores del par o staff.' using errcode = '42501'; end if;
  u := private.umbrales((select reglas from public.perfiles_reglas where clave = p_perfil and organizacion is null));
  with pings as (
    select m.host, m.usuario, percentile_cont(0.5) within group (order by m.ping_ms) mediana, count(*) n
    from public.muestras_calidad m
    where m.usuario in (p_jugador_a, p_jugador_b) and m.ping_ms is not null and m.tomada > now() - interval '14 days'
    group by m.host, m.usuario
  ), par as (
    select a.host, a.mediana ping_a, b.mediana ping_b, a.n + b.n n
    from pings a join pings b on a.host = b.host and a.usuario = p_jugador_a and b.usuario = p_jugador_b
  ), candidatos as (
    select p.*, greatest(p.ping_a, p.ping_b) peor, abs(p.ping_a - p.ping_b) diferencia
    from par p join public.perfiles h on h.id = p.host
    where (h.host_aprobado or h.rol in ('ayudante', 'moderador', 'admin'))
      and not (p_neutral and p.host in (p_jugador_a, p_jugador_b))
      and not private.hay_bloqueo(p.host, p_jugador_a) and not private.hay_bloqueo(p.host, p_jugador_b)
  )
  select coalesce(jsonb_agg(jsonb_build_object(
      'host', c.host, 'nombre', private.nombre(c.host),
      'ping_a_ms', round(c.ping_a::numeric, 1), 'ping_b_ms', round(c.ping_b::numeric, 1),
      'peor_ms', round(c.peor::numeric, 1), 'diferencia_ms', round(c.diferencia::numeric, 1), 'muestras', c.n,
      'semaforo', private.semaforo(u, round(c.peor::numeric, 1), null, null),
      'sala_abierta', exists (select 1 from public.salas s where s.host = c.host and s.estado in ('abierta', 'en_partida')))
      order by c.peor, c.diferencia), '[]'::jsonb)
    into res
  from (select * from candidatos order by peor, diferencia limit greatest(1, least(coalesce(p_limite, 5), 20))) c;
  return jsonb_build_object('hosts', res, 'umbrales', u, 'ventana_dias', 14);
end $$;
revoke all on function public.mejores_hosts(uuid, uuid, boolean, text, integer) from public, anon;
grant execute on function public.mejores_hosts(uuid, uuid, boolean, text, integer) to authenticated;

-- 153 · Ficha de rivalidad «A vs B» (25-oct-2026, Cuenta 2). Solo LECTURA: una función, sin tablas.
-- Duelos con marcador CONFIRMADO donde A y B jugaron en lados OPUESTOS (1v1 o en equipo). Todo desde el punto de vista de A.
-- Blindaje / privacidad: hay que poder ver el muro de los DOS (private.puede_ver_muro: perfiles privados o bloqueos → no visible);
--   A y B distintos; tope de 10 últimos partidos en el detalle; sin sesión también funciona para perfiles públicos (como estadisticas_de).
create or replace function public.rivalidad(p_a uuid, p_b uuid) returns jsonb
language plpgsql stable security definer set search_path = '' as $$
declare v_yo uuid := (select auth.uid()); v_res jsonb;
begin
  if p_a is null or p_b is null or p_a = p_b then return jsonb_build_object('visible', false, 'motivo', 'Elige dos jugadores distintos.'); end if;
  if not exists (select 1 from public.perfiles where id = p_a) or not exists (select 1 from public.perfiles where id = p_b) then
    return jsonb_build_object('visible', false, 'motivo', 'Ese jugador no existe.'); end if;
  if not (private.puede_ver_muro(p_a, v_yo) and private.puede_ver_muro(p_b, v_yo)) then
    return jsonb_build_object('visible', false, 'motivo', 'Uno de los dos tiene su perfil privado.'); end if;
  with p as (
    select x.reto_id, coalesce(r.cerrado_at, x.updated_at) fecha, r.tam_a, r.tam_b,
      case ja.lado when 'A' then x.goles_a else x.goles_b end ga,
      case ja.lado when 'A' then x.goles_b else x.goles_a end gb
    from public.resultados_duelo x
    join public.retos_matchmaking r on r.id = x.reto_id
    join lateral private.jugadores_de_reto(x.reto_id) ja on ja.usuario_id = p_a
    join lateral private.jugadores_de_reto(x.reto_id) jb on jb.usuario_id = p_b and jb.lado <> ja.lado
    where x.estado = 'CONFIRMADO'
  ), o as (select *, row_number() over (order by fecha desc, reto_id desc) n from p),
  racha as (   -- resultado de los últimos partidos seguidos con el mismo signo
    select (select sign(ga - gb) from o where n = 1) s,
           coalesce((select min(n) - 1 from o where sign(ga - gb) <> (select sign(ga - gb) from o where n = 1)), (select count(*) from o)) largo
  )
  select jsonb_build_object('visible', true,
    'a', jsonb_build_object('id', p_a, 'nombre', private.nombre(p_a), 'avatar_url', (select avatar_url from public.perfiles where id = p_a)),
    'b', jsonb_build_object('id', p_b, 'nombre', private.nombre(p_b), 'avatar_url', (select avatar_url from public.perfiles where id = p_b)),
    'jugados', (select count(*) from o),
    'gana_a', (select count(*) from o where ga > gb), 'empates', (select count(*) from o where ga = gb), 'gana_b', (select count(*) from o where gb > ga),
    'goles_a', (select coalesce(sum(ga), 0) from o), 'goles_b', (select coalesce(sum(gb), 0) from o),
    'mayor_a', (select jsonb_build_object('ga', ga, 'gb', gb, 'fecha', fecha) from o where ga > gb order by ga - gb desc, ga desc, fecha desc limit 1),
    'mayor_b', (select jsonb_build_object('ga', ga, 'gb', gb, 'fecha', fecha) from o where gb > ga order by gb - ga desc, gb desc, fecha desc limit 1),
    'racha', (select case when s is null then null else jsonb_build_object('quien', case s when 1 then 'a' when -1 then 'b' else 'empate' end, 'largo', largo) end from racha),
    'primero', (select min(fecha) from o), 'ultimo', (select max(fecha) from o),
    'ultimos', (select coalesce(jsonb_agg(jsonb_build_object('reto_id', reto_id, 'fecha', fecha, 'ga', ga, 'gb', gb, 'equipos', coalesce(tam_a, 1) > 1 or coalesce(tam_b, 1) > 1) order by n), '[]'::jsonb) from o where n <= 10))
  into v_res;
  return v_res;
end $$;
revoke all on function public.rivalidad(uuid, uuid) from public;
grant execute on function public.rivalidad(uuid, uuid) to anon, authenticated;

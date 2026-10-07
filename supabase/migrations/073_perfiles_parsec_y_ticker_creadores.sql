-- 073 · (a) /v1/perfiles: tarjetas de jugador por parsec_id para Phoenix Soda. (b) Ticker: creadores en vivo con su enlace.
create or replace function public.sistema_perfiles_parsec(p_ids text[]) returns jsonb
language sql stable security definer set search_path = '' as $$
  select coalesce(jsonb_agg(jsonb_build_object(
    'parsec_id', c.parsec_id, 'usuario_id', c.usuario, 'nombre', private.nombre(c.usuario), 'avatar_url', p.avatar_url,
    'actualizado', greatest(p.created_at, j.created_at),
    'carta', case when j.id is null then null else jsonb_build_object(
      'media', j.ovr, 'posicion', j.posicion, 'club', j.club, 'escudo_url', null,
      'rareza', case when j.ovr >= 90 then 'leyenda' when j.ovr >= 75 then 'oro' when j.ovr >= 65 then 'plata' else 'bronce' end,
      'pais', p.pais_codigo, 'apodo', j.apodo, 'foto_url', coalesce(j.foto_url, j.foto), 'pie', j.pie,
      'stats', jsonb_build_object('rit', j.pac, 'tir', j.sho, 'pas', j.pas, 'reg', j.dri, 'def', j.def, 'fis', j.phy)) end)), '[]'::jsonb)
  from public.cuentas_parsec c join public.perfiles p on p.id = c.usuario
  left join lateral (select * from public.jugadores x where x.perfil_id = c.usuario order by x.ovr desc nulls last limit 1) j on true
  where c.parsec_id = any (p_ids[1:16])
$$;
revoke all on function public.sistema_perfiles_parsec(text[]) from public, anon, authenticated;
grant execute on function public.sistema_perfiles_parsec(text[]) to service_role;

create or replace function public.ticker_comunidad() returns jsonb
language sql stable security definer set search_path = '' as $$
  select jsonb_build_object(
    'resultados', coalesce((select jsonb_agg(x order by x->>'cuando' desc) from (
        select jsonb_build_object('a', private.nombre(r.retador_id), 'b', private.nombre(r.rival_id), 'ga', d.goles_a, 'gb', d.goles_b, 'cuando', d.updated_at) x
        from public.resultados_duelo d join public.retos_matchmaking r on r.id = d.reto_id
        where d.estado = 'CONFIRMADO' and r.rival_id is not null and d.updated_at > now() - interval '7 days'
        order by d.updated_at desc limit 12) t), '[]'::jsonb),
    'retos_abiertos', (select count(*) from public.retos_matchmaking where estado = 'BUSCANDO'),
    'en_juego', (select count(*) from public.retos_matchmaking where estado in ('ACEPTADO', 'EN_JUEGO')),
    'salas_vivas', (select count(*) from public.salas where estado in ('abierta', 'en_partida') and visibilidad = 'publica' and latido > now() - interval '3 minutes'),
    'creadores_en_vivo', coalesce((select jsonb_agg(jsonb_build_object('nombre', private.nombre(c.usuario), 'titulo', c.titulo_live,
        'url', coalesce(c.enlace_live, (select value from jsonb_each_text(c.plataformas) limit 1))) order by c.en_vivo_desde desc)
      from public.creadores c where c.verificado and c.en_vivo and c.en_vivo_desde > now() - interval '6 hours'), '[]'::jsonb))
$$;

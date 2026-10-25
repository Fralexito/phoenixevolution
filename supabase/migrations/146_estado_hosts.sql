-- 146 · Estado de los hosts (función nueva 3/8, 25-oct-2026). Solo LECTURA: una función nueva, ninguna tabla nueva.
-- Muestra qué PCs con Phoenix Link están encendidas, su ping típico y si tienen sala abierta. Sale en «Salas en vivo».
-- Fuentes que ya existen: dispositivos_host.ultimo_uso (Link lo actualiza en CADA llamada, ver functions/phoenix),
-- salas.latido (vivo si < 3 min, igual que salas_en_vivo) y muestras_calidad (ping de los últimos 7 días).
-- Blindaje / privacidad:
--   · Solo hosts APROBADOS (o staff) con al menos un dispositivo sin revocar. Nunca sale el token ni el nombre de la PC.
--   · «Visto» redondeado a 5 minutos (no se puede vigilar a alguien al minuto). Los desconectados hace > 30 días no salen.
--   · Ping solo con 5 muestras o más (con menos, es ruido) y como mediana (un pico no lo arruina).
--   · Si hay bloqueo entre tú y el host, ese host no te sale. La sala solo se enlaza si TÚ puedes verla (ve_sala_de).
--   · Tope de 100 filas; sesión obligatoria.
create or replace function public.hosts_estado() returns jsonb
language plpgsql stable security definer set search_path = '' as $$
declare v_yo uuid := private.uid_requerido(); v_res jsonb;
begin
  with disp as (
    select d.usuario, max(d.ultimo_uso) visto, (array_agg(d.version_app order by d.ultimo_uso desc nulls last))[1] version_app
    from public.dispositivos_host d where d.revocado is null group by d.usuario
  ), vivas as (
    select distinct on (s.host) s.host, s.id, s.estado, s.region, s.juego, s.visibilidad
    from public.salas s
    where s.estado in ('preparando', 'abierta', 'en_partida') and s.latido > now() - interval '3 minutes'
    order by s.host, (s.estado = 'en_partida') desc, s.abierta_en desc
  ), pings as (
    select m.host, percentile_cont(0.5) within group (order by m.ping_ms) mediana, count(*) n,
      (array_agg(m.region order by m.tomada desc) filter (where m.region is not null))[1] region
    from public.muestras_calidad m
    where m.ping_ms is not null and m.tomada > now() - interval '7 days' group by m.host
  ), filas as (
    select p.id, p.avatar_url, d.visto, d.version_app, v.id sala_id, v.estado sala_estado, v.juego, v.visibilidad,
      coalesce(v.region, g.region) region, g.mediana, coalesce(g.n, 0) n,
      case when v.estado = 'en_partida' then 'en_partida'
           when v.id is not null then 'sala_abierta'
           when d.visto > now() - interval '5 minutes' then 'conectado'
           else 'desconectado' end estado
    from public.perfiles p
    join disp d on d.usuario = p.id
    left join vivas v on v.host = p.id
    left join pings g on g.host = p.id
    where (p.host_aprobado or p.rol in ('ayudante', 'moderador', 'admin'))
      and (v.id is not null or d.visto > now() - interval '30 days')
      and (p.id = v_yo or not private.hay_bloqueo(p.id, v_yo))
  )
  select coalesce(jsonb_agg(jsonb_build_object(
      'host', jsonb_build_object('id', f.id, 'nombre', private.nombre(f.id), 'avatar_url', f.avatar_url),
      'estado', f.estado,
      'visto', case when f.visto is null then null else to_timestamp(floor(extract(epoch from f.visto) / 300) * 300) end,
      'version_app', f.version_app, 'region', f.region, 'juego', f.juego,
      'ping_ms', case when f.n >= 5 then round(f.mediana::numeric) end, 'muestras', f.n,
      'sala_id', case when f.sala_id is not null and private.ve_sala_de(v_yo, f.sala_id) then f.sala_id end)
      order by case f.estado when 'sala_abierta' then 0 when 'en_partida' then 1 when 'conectado' then 2 else 3 end,
               f.visto desc nulls last), '[]'::jsonb)
    into v_res
  from (select * from filas order by case estado when 'desconectado' then 1 else 0 end, visto desc nulls last limit 100) f;
  return jsonb_build_object('hosts', v_res, 'generado', now());
end $$;
revoke all on function public.hosts_estado() from public, anon;
grant execute on function public.hosts_estado() to authenticated;

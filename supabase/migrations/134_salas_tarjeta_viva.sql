-- 134 · Tarjeta de sala VIVA (19-oct-2026, Fralex: «haz lo que quedó pendiente con el LINK… dinamismo, estética»).
-- Lo «pendiente» ya existía por dentro: el marcador en vivo (liga_vivo, Sider → /v1/liga/vivo), el resultado propuesto (/v1/liga/resultado)
-- y quién está en la sala (muestras_calidad, que Phoenix Link manda en cada latido). Faltaba que la tarjeta de sala lo enseñe.
-- Aditiva, SIN tocar Phoenix Link ni la Edge Function:
--   · salas.en_partida_desde + disparador: cuándo empezó el partido (para el cronómetro de la tarjeta).
--   · private.tarjeta_sala suma: rival.avatar_url, en_partida_desde, marcador (liga_vivo de los últimos 5 min) y conectados
--     (lo que Link informó en los últimos 2 min: total y, de quienes tienen cuenta en la web, nombre, foto y ping; de los demás solo el número).
-- Deshacer: restaurar private.tarjeta_sala de la migración 067; drop trigger salas_marca_partida on public.salas;
--           drop function private.salas_marca_partida(); alter table public.salas drop column en_partida_desde; drop index public.muestras_calidad_sala_tomada.

alter table public.salas add column if not exists en_partida_desde timestamptz;

create or replace function private.salas_marca_partida() returns trigger
language plpgsql set search_path to '' as $$
begin
  if new.estado = 'en_partida' and old.estado is distinct from 'en_partida' then new.en_partida_desde := now();
  elsif new.estado is distinct from 'en_partida' then new.en_partida_desde := null;
  end if;
  return new;
end $$;
drop trigger if exists salas_marca_partida on public.salas;
create trigger salas_marca_partida before update of estado on public.salas for each row execute function private.salas_marca_partida();

create index if not exists muestras_calidad_sala_tomada on public.muestras_calidad (sala_id, tomada desc);

create or replace function private.tarjeta_sala(s public.salas, p public.perfiles, p_uid uuid) returns jsonb
language sql stable security definer set search_path to '' as $$
  select jsonb_build_object('sala_id', s.id, 'mia', s.host = p_uid, 'estado', s.estado, 'modo', s.modo,
    'juego', s.juego, 'parche', s.parche, 'region', s.region, 'visibilidad', s.visibilidad, 'reto_id', s.reto_id, 'abierta_en', s.abierta_en,
    'plazas_libres', s.plazas_libres, 'plazas_total', s.plazas_total,
    'acepta_espectadores', s.acepta_espectadores, 'limite_espectadores', s.limite_espectadores,
    'espectadores', (select count(*) from public.salas_espectadores e where e.sala_id = s.id),
    'soy_espectador', exists (select 1 from public.salas_espectadores e where e.sala_id = s.id and e.usuario = p_uid),
    'host', jsonb_build_object('id', s.host, 'nombre', private.nombre(s.host), 'avatar_url', p.avatar_url, 'amigo', private.son_amigos(p_uid, s.host)),
    'rival', case when s.rival is null then null else jsonb_build_object('id', s.rival, 'nombre', private.nombre(s.rival),
      'avatar_url', (select r.avatar_url from public.perfiles r where r.id = s.rival)) end,
    'semaforo', private.semaforo_para(p_uid, s.id),
    'en_partida_desde', s.en_partida_desde,
    'marcador', (select jsonb_build_object('local', v.local, 'visitante', v.visitante, 'goles_local', v.goles_local, 'goles_visita', v.goles_visita,
        'minuto', v.minuto, 'fase', v.fase, 'actualizado', v.actualizado)
      from public.liga_vivo v where v.sala_id = s.id and v.actualizado > now() - interval '5 minutes'),
    'conectados', (select jsonb_build_object('total', count(*),
        'jugadores', coalesce((jsonb_agg(jsonb_build_object('nombre', private.nombre(x.usuario), 'avatar_url', pf.avatar_url, 'ping_ms', x.ping_ms)
          order by x.ping_ms nulls last) filter (where x.usuario is not null)), '[]'::jsonb))
      from (select distinct on (m.actor_parsec) m.actor_parsec, m.usuario, m.ping_ms from public.muestras_calidad m
            where m.sala_id = s.id and m.tomada > now() - interval '2 minutes' order by m.actor_parsec, m.tomada desc limit 16) x
      left join public.perfiles pf on pf.id = x.usuario))
$$;

-- 156 · Arreglo de seguridad: comparaciones con host_id NULO (25-oct-2026, Cuenta 2; encontrado probando la 155).
-- ESTADO: APLICADA el 25-oct-2026 y probada (un ajeno ya no ve el marcador ni los goles ni sube repeticiones en duelos sin host).
-- En SQL, «yo = r.host_id» con host_id NULO da NULO (no «falso»). Dentro de «if not (A or yo = host or B)», si A y B son falsos,
-- el resultado es NULO → «if NULO» no entra → la función seguía como si tuvieras permiso. Afectaba:
--   · public.resultado_de_reto (036): alguien ajeno podía ver el marcador propuesto de un duelo SIN host (dato menor, pero no debía).
--   · public.goles_de_duelo (148): igual, los goles de Link de un duelo sin host.
--   · public.repeticion_agregar / repeticiones_de (155): un ajeno podía subir repeticiones a un duelo sin host.
-- Arreglo: coalesce(yo = host_id, false). Mismo comportamiento para todos los demás casos. Solo «create or replace».
create or replace function public.resultado_de_reto(p_reto_id integer) returns jsonb
language plpgsql stable security definer set search_path = '' as $$
declare yo uuid := (select auth.uid()); r public.retos_matchmaking; ex public.resultados_duelo;
begin
  if yo is null then return null; end if;
  select * into r from public.retos_matchmaking where id = p_reto_id;
  if not found then return null; end if;
  if not (private.lado_en_reto(p_reto_id, yo) is not null or coalesce(yo = r.host_id, false) or private.es_moderador()) then return null; end if;
  select * into ex from public.resultados_duelo where reto_id = p_reto_id;
  return jsonb_build_object('reto_id', p_reto_id, 'finalizado', r.estado::text = 'FINALIZADO', 'existe', found,
    'goles_a', ex.goles_a, 'goles_b', ex.goles_b, 'estado', ex.estado, 'propuesto_por', ex.propuesto_por, 'intentos', ex.intentos,
    'soy_lider', yo in (r.retador_id, r.rival_id), 'lado', private.lado_en_reto(p_reto_id, yo),
    'puedo_responder', found and ex.estado = 'PROPUESTO' and ex.propuesto_por <> yo and yo in (r.retador_id, r.rival_id),
    'puedo_proponer', r.estado::text = 'FINALIZADO' and r.rival_id is not null and yo in (r.retador_id, r.rival_id)
      and (not found or (ex.estado = 'DISPUTADO' and ex.intentos < 3)),
    'agotado', found and ex.estado = 'DISPUTADO' and ex.intentos >= 3);
end $$;


create or replace function public.goles_de_duelo(p_reto integer) returns jsonb
language plpgsql stable security definer set search_path = '' as $$
declare v_yo uuid := (select auth.uid()); r public.retos_matchmaking;
begin
  if v_yo is null then return null; end if;
  select * into r from public.retos_matchmaking where id = p_reto;
  if not found then return null; end if;
  if not (private.lado_en_reto(p_reto, v_yo) is not null or coalesce(v_yo = r.host_id, false) or private.es_moderador()
          or exists (select 1 from public.reto_espectadores e where e.reto_id = p_reto and e.usuario_id = v_yo and e.estado = 'APROBADO')) then return null; end if;
  return jsonb_build_object('reto_id', p_reto,
    'cuadra', exists (select 1 from private.duelos_goles_validos() x where x.reto_id = p_reto),
    'goles', (select coalesce(jsonb_agg(jsonb_build_object('lado', lado, 'goleador', goleador, 'minuto', minuto, 'asistente', asistente, 'tipo', tipo) order by minuto, id), '[]'::jsonb)
              from public.duelo_goles where reto_id = p_reto and vigente));
end $$;

create or replace function public.repeticion_agregar(p_reto integer, p_url text, p_tipo text default 'completo', p_titulo text default null, p_minuto integer default null)
returns bigint language plpgsql security definer set search_path = '' as $$
declare v_yo uuid := private.uid_requerido(); r public.retos_matchmaking; v_id bigint; v_url text := btrim(coalesce(p_url, '')); v_tit text := nullif(btrim(coalesce(p_titulo, '')), '');
begin
  select * into r from public.retos_matchmaking where id = p_reto;
  if not found then raise exception 'Ese duelo no existe.' using errcode = 'P0001'; end if;
  if not (private.lado_en_reto(p_reto, v_yo) is not null or coalesce(r.host_id = v_yo, false)) then raise exception 'Solo los jugadores o el host del duelo suben su repetición.' using errcode = '42501'; end if;
  if r.estado::text <> 'FINALIZADO' then raise exception 'Primero tiene que terminar el duelo.' using errcode = 'P0001'; end if;
  if coalesce(p_tipo, '') not in ('completo', 'gol') then raise exception 'Tipo no válido.' using errcode = '22023'; end if;
  if char_length(v_url) > 300 or not private.url_video_ok(v_url) then
    raise exception 'Pega un enlace https de YouTube, Twitch, Kick, Streamable, Medal, Google Drive, Facebook o TikTok.' using errcode = '22023'; end if;
  if v_tit is not null and (char_length(v_tit) > 80 or v_tit ~ '[<>]') then raise exception 'El título: máximo 80 caracteres, sin < ni >.' using errcode = '22023'; end if;
  if p_tipo = 'gol' and p_minuto is not null and p_minuto not between 0 and 130 then raise exception 'El minuto va de 0 a 130.' using errcode = '22023'; end if;
  if (select count(*) from public.duelo_repeticiones where reto_id = p_reto and autor = v_yo and not oculto) >= 6 then
    raise exception 'Ya subiste 6 repeticiones de este duelo.' using errcode = 'P0001'; end if;
  if exists (select 1 from public.duelo_repeticiones where reto_id = p_reto and url = v_url and not oculto) then
    raise exception 'Ese enlace ya está en este duelo.' using errcode = '23505'; end if;
  insert into public.duelo_repeticiones (reto_id, autor, url, tipo, titulo, minuto)
  values (p_reto, v_yo, v_url, p_tipo, v_tit, case when p_tipo = 'gol' then p_minuto end) returning id into v_id;
  return v_id;
end $$;

create or replace function public.repeticiones_de(p_reto integer) returns jsonb
language plpgsql stable security definer set search_path = '' as $$
declare v_yo uuid := (select auth.uid()); r public.retos_matchmaking;
begin
  select * into r from public.retos_matchmaking where id = p_reto;
  if not found or not private.puedo_ver_duelo(p_reto, v_yo) then return jsonb_build_object('visible', false, 'items', '[]'::jsonb); end if;
  return jsonb_build_object('visible', true,
    'puedo_subir', v_yo is not null and r.estado::text = 'FINALIZADO' and (private.lado_en_reto(p_reto, v_yo) is not null or coalesce(r.host_id = v_yo, false)),
    'items', coalesce((select jsonb_agg(jsonb_build_object('id', d.id, 'url', d.url, 'tipo', d.tipo, 'titulo', d.titulo, 'minuto', d.minuto, 'creado', d.creado,
        'autor', private.nombre(d.autor), 'mio', d.autor = v_yo,
        'votos', (select count(*) from public.mejor_gol_votos v where v.repeticion_id = d.id)) order by d.tipo, d.minuto nulls last, d.id)
      from public.duelo_repeticiones d where d.reto_id = p_reto and not d.oculto), '[]'::jsonb));
end $$;

create or replace function public.prode_pronosticar(p_reto integer, p_goles_a integer, p_goles_b integer) returns jsonb
language plpgsql security definer set search_path = '' as $$
declare v_yo uuid := private.uid_requerido(); r public.retos_matchmaking;
begin
  if not private.prode_activo() then raise exception 'El prode está en pausa por el staff.' using errcode = 'P0001'; end if;
  if p_goles_a is null or p_goles_b is null or p_goles_a not between 0 and 30 or p_goles_b not between 0 and 30 then
    raise exception 'Los goles deben ser números entre 0 y 30.' using errcode = '22023'; end if;
  select * into r from public.retos_matchmaking where id = p_reto;
  if not found then raise exception 'Ese duelo no existe.' using errcode = 'P0001'; end if;
  if not private.prode_abierto(p_reto) then raise exception 'Ese duelo ya no acepta pronósticos (empezó o no está agendado).' using errcode = 'P0001'; end if;
  if private.lado_en_reto(p_reto, v_yo) is not null or coalesce(r.host_id = v_yo, false) then raise exception 'No puedes pronosticar un duelo en el que juegas o eres host.' using errcode = '42501'; end if;
  insert into public.prode_pronosticos (reto_id, usuario, goles_a, goles_b) values (p_reto, v_yo, p_goles_a, p_goles_b)
    on conflict (reto_id, usuario) do update set goles_a = excluded.goles_a, goles_b = excluded.goles_b, actualizado = now()
    where public.prode_pronosticos.liquidado is null;
  return jsonb_build_object('ok', true);
end $$;

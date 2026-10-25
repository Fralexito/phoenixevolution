-- 147 · MVP del partido (función nueva 4/8, 25-oct-2026). Duelos (retos_matchmaking) con marcador CONFIRMADO.
-- Quién vota: los jugadores del duelo y los espectadores APROBADOS. A quién: a un jugador del duelo, nunca a sí mismo.
-- Cuándo: hasta 48 h después de confirmarse el marcador (se puede cambiar el voto mientras siga abierto).
-- Resultado: el más votado es el MVP; si hay EMPATE en el primer puesto no hay MVP (evita el 1-1 automático de un 1v1).
-- Para que tenga sentido se exige al menos 3 votantes posibles (un 1v1 sin espectadores no abre votación).
-- Blindaje: votos cerrados por RLS (solo RPC); los conteos se muestran SOLO al cerrar (nadie se sube al carro);
--   se valida que el votado sea jugador y el votante tenga derecho EN LA BD, no en la web; perfil borrado → sus votos se van.
create table if not exists public.partido_mvp_votos (
  reto_id integer not null references public.retos_matchmaking (id) on delete cascade,
  votante uuid not null references public.perfiles (id) on delete cascade,
  votado uuid not null references public.perfiles (id) on delete cascade,
  creado timestamptz not null default now(),
  primary key (reto_id, votante),
  check (votante <> votado)
);
create index if not exists partido_mvp_votos_votado_idx on public.partido_mvp_votos (votado);
alter table public.partido_mvp_votos enable row level security;
revoke all on public.partido_mvp_votos from anon, authenticated;

-- Duelo con votación válida: marcador confirmado → { cierra, votantes, jugadores }. null si no aplica.
create or replace function private.mvp_info(p_reto integer) returns jsonb
language sql stable security definer set search_path = '' as $$
  with base as (select x.updated_at confirmado from public.resultados_duelo x where x.reto_id = p_reto and x.estado = 'CONFIRMADO'),
  jug as (select distinct usuario_id u from private.jugadores_de_reto(p_reto)),
  esp as (select e.usuario_id u from public.reto_espectadores e where e.reto_id = p_reto and e.estado = 'APROBADO' and e.usuario_id not in (select u from jug))
  select case when (select count(*) from jug) >= 2 and (select count(*) from jug) + (select count(*) from esp) >= 3 then
    jsonb_build_object('cierra', b.confirmado + interval '48 hours',
      'jugadores', (select coalesce(jsonb_agg(u), '[]'::jsonb) from jug),
      'votantes', (select coalesce(jsonb_agg(u), '[]'::jsonb) from (select u from jug union select u from esp) t)) end
  from base b
$$;

-- MVP de un duelo ya cerrado (null si sigue abierto, empate o sin votos).
create or replace function private.mvp_ganador(p_reto integer) returns uuid
language sql stable security definer set search_path = '' as $$
  with c as (select v.votado, count(*) n from public.partido_mvp_votos v where v.reto_id = p_reto group by v.votado),
  top as (select votado, n, rank() over (order by n desc) rk from c)
  select case when (select count(*) from top where rk = 1) = 1 then (select votado from top where rk = 1) end
  where (private.mvp_info(p_reto) ->> 'cierra')::timestamptz <= now()
$$;
revoke all on function private.mvp_info(integer), private.mvp_ganador(integer) from public, anon, authenticated;

create or replace function public.mvp_votar(p_reto integer, p_votado uuid) returns jsonb
language plpgsql security definer set search_path = '' as $$
declare v_yo uuid := private.uid_requerido(); v_info jsonb;
begin
  v_info := private.mvp_info(p_reto);
  if v_info is null then raise exception 'Este partido no tiene votación de MVP (falta el marcador confirmado o hay muy pocos participantes).' using errcode = 'P0001'; end if;
  if (v_info ->> 'cierra')::timestamptz <= now() then raise exception 'La votación de MVP de este partido ya cerró.' using errcode = 'P0001'; end if;
  if not (v_info -> 'votantes') ? v_yo::text then raise exception 'Solo los jugadores y espectadores aprobados de este partido pueden votar.' using errcode = '42501'; end if;
  if p_votado is null or not (v_info -> 'jugadores') ? p_votado::text then raise exception 'Solo puedes votar a un jugador de este partido.' using errcode = '22023'; end if;
  if p_votado = v_yo then raise exception 'No puedes votarte a ti mismo.' using errcode = '22023'; end if;
  insert into public.partido_mvp_votos (reto_id, votante, votado) values (p_reto, v_yo, p_votado)
    on conflict (reto_id, votante) do update set votado = excluded.votado, creado = now();
  return jsonb_build_object('ok', true, 'cierra', v_info ->> 'cierra');
end $$;

-- Estado de la votación para quien mira. Conteos solo al cerrar.
create or replace function public.mvp_de(p_reto integer) returns jsonb
language plpgsql stable security definer set search_path = '' as $$
declare v_yo uuid := (select auth.uid()); v_info jsonb; v_abierta boolean; v_ganador uuid;
begin
  v_info := private.mvp_info(p_reto);
  if v_info is null then return null; end if;
  v_abierta := (v_info ->> 'cierra')::timestamptz > now();
  if not v_abierta then v_ganador := private.mvp_ganador(p_reto); end if;
  return jsonb_build_object('reto_id', p_reto, 'abierta', v_abierta, 'cierra', v_info ->> 'cierra',
    'puedo_votar', v_abierta and v_yo is not null and (v_info -> 'votantes') ? v_yo::text,
    'mi_voto', (select v.votado from public.partido_mvp_votos v where v.reto_id = p_reto and v.votante = v_yo),
    'votos_total', (select count(*) from public.partido_mvp_votos v where v.reto_id = p_reto),
    'votantes_total', jsonb_array_length(v_info -> 'votantes'),
    'mvp', case when v_ganador is null then null else jsonb_build_object('id', v_ganador, 'nombre', private.nombre(v_ganador)) end,
    'candidatos', (select coalesce(jsonb_agg(jsonb_build_object('id', j.u, 'nombre', private.nombre(j.u),
        'votos', case when v_abierta then null else (select count(*) from public.partido_mvp_votos v where v.reto_id = p_reto and v.votado = j.u) end)
        order by private.nombre(j.u)), '[]'::jsonb)
      from (select (jsonb_array_elements_text(v_info -> 'jugadores'))::uuid u) j));
end $$;

-- Mis votaciones abiertas (para el panel de Mis partidos). Últimos 3 días, tope 20.
create or replace function public.mvp_pendientes() returns jsonb
language plpgsql stable security definer set search_path = '' as $$
declare v_yo uuid := private.uid_requerido();
begin
  return coalesce((select jsonb_agg(public.mvp_de(x.reto_id) order by x.updated_at desc) from (
      select d.reto_id, d.updated_at from public.resultados_duelo d
      where d.estado = 'CONFIRMADO' and d.updated_at > now() - interval '48 hours'
        and (exists (select 1 from private.jugadores_de_reto(d.reto_id) j where j.usuario_id = v_yo)
             or exists (select 1 from public.reto_espectadores e where e.reto_id = d.reto_id and e.usuario_id = v_yo and e.estado = 'APROBADO'))
      order by d.updated_at desc limit 20) x
    where public.mvp_de(x.reto_id) is not null), '[]'::jsonb);
end $$;

-- Cuántas veces fue MVP alguien (perfil). Público para usuarios con sesión.
create or replace function public.mvp_total_de(p_usuario uuid) returns integer
language sql stable security definer set search_path = '' as $$
  select count(*)::integer from (select distinct v.reto_id from public.partido_mvp_votos v where v.votado = p_usuario) r
  where private.mvp_ganador(r.reto_id) = p_usuario
$$;

revoke all on function public.mvp_votar(integer, uuid), public.mvp_de(integer), public.mvp_pendientes(), public.mvp_total_de(uuid) from public, anon;
grant execute on function public.mvp_votar(integer, uuid), public.mvp_de(integer), public.mvp_pendientes(), public.mvp_total_de(uuid) to authenticated;

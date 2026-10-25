-- 150 · Clan contra clan (función nueva 7/8, 25-oct-2026). Series entre dos clanes «al mejor de N» duelos (1, 3, 5 o 7).
-- Cómo se cuenta (AUTOMÁTICO, sin cargar nada a mano): desde que el rival ACEPTA y hasta el plazo, cuentan los primeros N duelos 1v1
-- con marcador CONFIRMADO entre un miembro del clan A y uno del clan B. Gana el duelo quien hizo más goles; el empate no da punto.
-- Gana la serie quien llegue primero a la mayoría (N/2 + 1) o, al vencer el plazo, quien tenga más puntos (igual = empate).
-- Blindaje:
--   · Solo capitán o subcapitán proponen, aceptan, rechazan o cancelan. Un clan no se reta a sí mismo.
--   · Una sola serie viva entre los mismos dos clanes; máx. 3 series vivas por clan.
--   · Los jugadores deben estar en el clan desde ANTES de que se creara el duelo (nadie ficha a un «refuerzo» de último minuto).
--   · Un duelo cuenta una sola vez y solo para su serie (la más antigua aceptada entre esos clanes).
--   · Propuestas sin respuesta caducan a los 7 días; el estado se calcula al leer (no depende de un cron).
--   · Tablas cerradas por RLS; todo por funciones.
create table if not exists public.clan_series (
  id bigint generated always as identity primary key,
  clan_a bigint not null references public.clanes (id) on delete cascade,
  clan_b bigint not null references public.clanes (id) on delete cascade,
  mejor_de smallint not null check (mejor_de in (1, 3, 5, 7)),
  plazo_dias smallint not null default 14 check (plazo_dias between 1 and 30),
  estado text not null default 'propuesta' check (estado in ('propuesta', 'aceptada', 'rechazada', 'cancelada')),
  propuesta_por uuid references public.perfiles (id) on delete set null,
  respondida_por uuid references public.perfiles (id) on delete set null,
  mensaje text check (mensaje is null or (char_length(mensaje) <= 140 and mensaje !~ '[<>]')),
  creada timestamptz not null default now(),
  aceptada timestamptz,
  check (clan_a <> clan_b)
);
create index if not exists clan_series_a_idx on public.clan_series (clan_a, creada desc);
create index if not exists clan_series_b_idx on public.clan_series (clan_b, creada desc);
alter table public.clan_series enable row level security;
revoke all on public.clan_series from anon, authenticated;

create or replace function private.clan_lider(p_uid uuid, p_clan bigint) returns boolean
language sql stable security definer set search_path = '' as $$
  select exists (select 1 from public.clan_miembros m where m.usuario_id = p_uid and m.clan_id = p_clan and m.rol in ('capitan', 'subcapitan'))
$$;

-- Duelos que cuentan para una serie aceptada (los primeros N, en orden de confirmación).
create or replace function private.clan_serie_duelos(p_serie bigint) returns table (reto_id integer, punto_a smallint, punto_b smallint, confirmado timestamptz)
language sql stable security definer set search_path = '' as $$
  with s as (select * from public.clan_series where id = p_serie and estado = 'aceptada'),
  cand as (
    select r.id, d.updated_at conf,
      case when ma.clan_id = s.clan_a then d.goles_a else d.goles_b end ga,
      case when ma.clan_id = s.clan_a then d.goles_b else d.goles_a end gb
    from s
    join public.retos_matchmaking r on r.created_at >= s.aceptada and r.created_at <= s.aceptada + make_interval(days => s.plazo_dias)
    join public.resultados_duelo d on d.reto_id = r.id and d.estado = 'CONFIRMADO'
    join public.clan_miembros ma on ma.usuario_id = r.retador_id and ma.desde <= r.created_at
    join public.clan_miembros mb on mb.usuario_id = r.rival_id and mb.desde <= r.created_at
    where coalesce(r.tam_a, 1) = 1 and coalesce(r.tam_b, 1) = 1
      and ((ma.clan_id = s.clan_a and mb.clan_id = s.clan_b) or (ma.clan_id = s.clan_b and mb.clan_id = s.clan_a))
      -- el duelo es de la serie aceptada MÁS ANTIGUA entre estos clanes que lo cubre (un duelo, una serie)
      and not exists (select 1 from public.clan_series o where o.estado = 'aceptada' and o.id <> s.id and o.aceptada < s.aceptada
                        and least(o.clan_a, o.clan_b) = least(s.clan_a, s.clan_b) and greatest(o.clan_a, o.clan_b) = greatest(s.clan_a, s.clan_b)
                        and r.created_at <= o.aceptada + make_interval(days => o.plazo_dias))
  )
  select c.id, (c.ga > c.gb)::integer::smallint, (c.gb > c.ga)::integer::smallint, c.conf
  from cand c, s order by c.conf, c.id limit (select mejor_de from s)
$$;

-- Estado completo de una serie (lo que ve todo el mundo).
create or replace function private.clan_serie_json(p_serie bigint) returns jsonb
language plpgsql stable security definer set search_path = '' as $$
declare s public.clan_series; v_pa integer := 0; v_pb integer := 0; v_jug integer := 0; v_maj integer; v_estado text; v_fin timestamptz; v_ganador bigint; v_duelos jsonb;
begin
  select * into s from public.clan_series where id = p_serie;
  if not found then return null; end if;
  v_maj := s.mejor_de / 2 + 1;
  v_estado := s.estado;
  if s.estado = 'propuesta' and s.creada < now() - interval '7 days' then v_estado := 'caducada'; end if;
  if s.estado = 'aceptada' then
    v_fin := s.aceptada + make_interval(days => s.plazo_dias);
    select coalesce(sum(punto_a), 0), coalesce(sum(punto_b), 0), count(*),
           coalesce(jsonb_agg(jsonb_build_object('reto_id', reto_id, 'punto_a', punto_a, 'punto_b', punto_b, 'confirmado', confirmado) order by confirmado), '[]'::jsonb)
      into v_pa, v_pb, v_jug, v_duelos from private.clan_serie_duelos(p_serie);
    if v_pa >= v_maj then v_estado := 'terminada'; v_ganador := s.clan_a;
    elsif v_pb >= v_maj then v_estado := 'terminada'; v_ganador := s.clan_b;
    elsif v_jug >= s.mejor_de or now() > v_fin then v_estado := 'terminada';
      v_ganador := case when v_pa > v_pb then s.clan_a when v_pb > v_pa then s.clan_b end;
    else v_estado := 'en_juego'; end if;
  end if;
  return jsonb_build_object('id', s.id, 'estado', v_estado, 'mejor_de', s.mejor_de, 'plazo_dias', s.plazo_dias, 'mensaje', s.mensaje,
    'creada', s.creada, 'aceptada', s.aceptada, 'termina', v_fin, 'mayoria', v_maj,
    'a', (select jsonb_build_object('id', c.id, 'nombre', c.nombre, 'etiqueta', c.etiqueta) from public.clanes c where c.id = s.clan_a),
    'b', (select jsonb_build_object('id', c.id, 'nombre', c.nombre, 'etiqueta', c.etiqueta) from public.clanes c where c.id = s.clan_b),
    'puntos_a', v_pa, 'puntos_b', v_pb, 'jugados', v_jug, 'ganador', v_ganador, 'duelos', coalesce(v_duelos, '[]'::jsonb));
end $$;
revoke all on function private.clan_lider(uuid, bigint), private.clan_serie_duelos(bigint), private.clan_serie_json(bigint) from public, anon, authenticated;

-- ── Acciones (capitán o subcapitán) ───────────────────────────────────────────────────────────────────────
create or replace function public.clan_serie_proponer(p_rival bigint, p_mejor_de integer, p_plazo_dias integer default 14, p_mensaje text default null) returns bigint
language plpgsql security definer set search_path = '' as $$
declare v_yo uuid := private.uid_requerido(); v_mio bigint := private.clan_de(v_yo); v_id bigint; v_msg text := nullif(btrim(coalesce(p_mensaje, '')), '');
begin
  if v_mio is null or not private.clan_lider(v_yo, v_mio) then raise exception 'Solo el capitán o el subcapitán de un clan puede retar a otro clan.' using errcode = '42501'; end if;
  if p_rival is null or p_rival = v_mio then raise exception 'Elige otro clan.' using errcode = '22023'; end if;
  if not exists (select 1 from public.clanes c where c.id = p_rival and not c.oculto) then raise exception 'Ese clan no existe.' using errcode = 'P0001'; end if;
  if p_mejor_de not in (1, 3, 5, 7) then raise exception 'La serie debe ser al mejor de 1, 3, 5 o 7.' using errcode = '22023'; end if;
  if p_plazo_dias is null or p_plazo_dias not between 1 and 30 then raise exception 'El plazo debe ser de 1 a 30 días.' using errcode = '22023'; end if;
  if v_msg is not null and (char_length(v_msg) > 140 or v_msg ~ '[<>]') then raise exception 'El mensaje: máximo 140 caracteres, sin < ni >.' using errcode = '22023'; end if;
  if exists (select 1 from public.clan_series s where least(s.clan_a, s.clan_b) = least(v_mio, p_rival) and greatest(s.clan_a, s.clan_b) = greatest(v_mio, p_rival)
             and ((s.estado = 'propuesta' and s.creada > now() - interval '7 days') or (private.clan_serie_json(s.id) ->> 'estado') = 'en_juego')) then
    raise exception 'Ya hay una serie pendiente o en juego entre estos dos clanes.' using errcode = 'P0001'; end if;
  if (select count(*) from public.clan_series s where v_mio in (s.clan_a, s.clan_b)
        and ((s.estado = 'propuesta' and s.creada > now() - interval '7 days') or (private.clan_serie_json(s.id) ->> 'estado') = 'en_juego')) >= 3 then
    raise exception 'Tu clan ya tiene 3 series pendientes o en juego.' using errcode = 'P0001'; end if;
  insert into public.clan_series (clan_a, clan_b, mejor_de, plazo_dias, propuesta_por, mensaje) values (v_mio, p_rival, p_mejor_de, p_plazo_dias, v_yo, v_msg) returning id into v_id;
  return v_id;
end $$;

create or replace function public.clan_serie_responder(p_serie bigint, p_aceptar boolean) returns jsonb
language plpgsql security definer set search_path = '' as $$
declare v_yo uuid := private.uid_requerido(); s public.clan_series;
begin
  select * into s from public.clan_series where id = p_serie for update;
  if not found then raise exception 'Esa serie no existe.' using errcode = 'P0001'; end if;
  if not private.clan_lider(v_yo, s.clan_b) then raise exception 'Solo el capitán o el subcapitán del clan retado puede responder.' using errcode = '42501'; end if;
  if s.estado <> 'propuesta' or s.creada < now() - interval '7 days' then raise exception 'Esa propuesta ya no está pendiente.' using errcode = 'P0001'; end if;
  update public.clan_series set estado = case when p_aceptar then 'aceptada' else 'rechazada' end, respondida_por = v_yo,
    aceptada = case when p_aceptar then now() end where id = p_serie;
  return private.clan_serie_json(p_serie);
end $$;

-- Cancelar: quien propuso, mientras siga «propuesta»; una serie aceptada no se cancela (quedaría a medias).
create or replace function public.clan_serie_cancelar(p_serie bigint) returns void
language plpgsql security definer set search_path = '' as $$
declare v_yo uuid := private.uid_requerido(); s public.clan_series;
begin
  select * into s from public.clan_series where id = p_serie for update;
  if not found then raise exception 'Esa serie no existe.' using errcode = 'P0001'; end if;
  if not (private.clan_lider(v_yo, s.clan_a) or private.es_moderador()) then raise exception 'Solo los líderes del clan que retó (o el staff) pueden cancelarla.' using errcode = '42501'; end if;
  if s.estado <> 'propuesta' and not private.es_moderador() then raise exception 'Solo se cancela una propuesta que aún no fue aceptada.' using errcode = 'P0001'; end if;
  update public.clan_series set estado = 'cancelada', respondida_por = v_yo where id = p_serie;
end $$;

-- ── Lectura ───────────────────────────────────────────────────────────────────────────────────────────────
-- Series de un clan (todas) o, sin clan, las últimas de la comunidad. Incluye si YO puedo responder/cancelar.
create or replace function public.clan_series_de(p_clan bigint default null, p_limite integer default 20) returns jsonb
language plpgsql stable security definer set search_path = '' as $$
declare v_yo uuid := (select auth.uid());
begin
  return coalesce((select jsonb_agg(private.clan_serie_json(s.id) || jsonb_build_object(
      'puedo_responder', v_yo is not null and s.estado = 'propuesta' and s.creada > now() - interval '7 days' and private.clan_lider(v_yo, s.clan_b),
      'puedo_cancelar', v_yo is not null and s.estado = 'propuesta' and s.creada > now() - interval '7 days' and private.clan_lider(v_yo, s.clan_a))
      order by s.creada desc)
    from (select * from public.clan_series s where (p_clan is null or p_clan in (s.clan_a, s.clan_b))
            and (p_clan is not null or s.estado = 'aceptada')
          order by s.creada desc limit greatest(1, least(coalesce(p_limite, 20), 50))) s), '[]'::jsonb);
end $$;

revoke all on function public.clan_serie_proponer(bigint, integer, integer, text), public.clan_serie_responder(bigint, boolean),
  public.clan_serie_cancelar(bigint), public.clan_series_de(bigint, integer) from public, anon;
grant execute on function public.clan_serie_proponer(bigint, integer, integer, text), public.clan_serie_responder(bigint, boolean),
  public.clan_serie_cancelar(bigint), public.clan_series_de(bigint, integer) to authenticated;
grant execute on function public.clan_series_de(bigint, integer) to anon;

-- 055 · ELO de los partidos AMISTOSOS (Sala de Duelos). Depende de 036 (resultados_duelo confirmados) y 045 (patrón de rankings públicos).
-- Solo cuentan duelos 1v1 con marcador CONFIRMADO por ambos líderes (nunca la liga oficial, que se gestiona en CopaFácil). Los duelos por equipos no puntúan.
-- Misma fórmula que src/js/core/pulso.js → calcularElo: base 1000, K = 32, factor por diferencia de goles (1 → 1, 2 → 1.5, 3 → 1.75, 4+ → 1.75 + (d-3)/8).
-- Se calcula en orden cronológico de confirmación. Lo que se muestra respeta la privacidad del muro (puede_ver_muro), igual que ranking_competitivo.

create or replace function private.calcular_elo() returns table (uid uuid, elo integer, jugados integer, delta integer)
language plpgsql stable security definer set search_path = '' as $$
declare
  r record; ka text; kb text; ra numeric; rb numeric; ea numeric; real_a numeric; d numeric; dif integer;
  e jsonb := '{}'::jsonb; n jsonb := '{}'::jsonb; u jsonb := '{}'::jsonb;
begin
  for r in
    select m.retador_id as a, m.rival_id as b, x.goles_a, x.goles_b
      from public.resultados_duelo x join public.retos_matchmaking m on m.id = x.reto_id
     where x.estado = 'CONFIRMADO' and m.retador_id is not null and m.rival_id is not null and m.retador_id <> m.rival_id
       and not exists (select 1 from public.reto_participantes rp where rp.reto_id = x.reto_id and rp.estado = 'CONFIRMADO' and rp.equipo in ('A', 'B'))
     order by x.updated_at, x.reto_id
  loop
    ka := r.a::text; kb := r.b::text;
    ra := coalesce((e ->> ka)::numeric, 1000); rb := coalesce((e ->> kb)::numeric, 1000);
    ea := 1 / (1 + power(10, (rb - ra) / 400));
    real_a := case when r.goles_a > r.goles_b then 1 when r.goles_a < r.goles_b then 0 else 0.5 end;
    dif := abs(r.goles_a - r.goles_b);
    d := 32 * (case when dif <= 1 then 1 when dif = 2 then 1.5 else 1.75 + (dif - 3) / 8.0 end) * (real_a - ea);
    e := jsonb_set(jsonb_set(e, array[ka], to_jsonb(ra + d)), array[kb], to_jsonb(rb - d));
    n := jsonb_set(jsonb_set(n, array[ka], to_jsonb(coalesce((n ->> ka)::integer, 0) + 1)), array[kb], to_jsonb(coalesce((n ->> kb)::integer, 0) + 1));
    u := jsonb_set(jsonb_set(u, array[ka], to_jsonb(d)), array[kb], to_jsonb(-d));
  end loop;
  return query select k.key::uuid, round((k.value #>> '{}')::numeric)::integer, (n ->> k.key)::integer, round(coalesce((u ->> k.key)::numeric, 0))::integer from jsonb_each(e) k;
end $$;
revoke all on function private.calcular_elo() from public, anon, authenticated;

-- Ranking ELO público (solo personas cuyo muro puedes ver).
create or replace function public.ranking_elo(p_limite integer default 50) returns jsonb
language plpgsql stable security definer set search_path = '' as $$
declare yo uuid := (select auth.uid()); n integer := least(greatest(coalesce(p_limite, 50), 1), 100);
begin
  return coalesce((select jsonb_agg(jsonb_build_object('pos', f.pos, 'usuario_id', f.uid, 'username', f.username, 'nombre', f.nombre, 'avatar_url', f.avatar_url, 'elo', f.elo, 'jugados', f.jugados, 'delta', f.delta) order by f.pos)
    from (select row_number() over (order by c.elo desc, c.jugados desc, c.uid) as pos, c.uid, c.elo, c.jugados, c.delta, p.username, p.nombre_display as nombre, p.avatar_url
            from private.calcular_elo() c join public.perfiles p on p.id = c.uid
           where private.puede_ver_muro(c.uid, yo)
           order by 1 limit n) f), '[]'::jsonb);
end $$;

-- ELO de una persona (para su perfil). {visible:false} si no puedes ver su muro; elo null si aún no juega amistosos confirmados.
create or replace function public.elo_de(p_usuario uuid) returns jsonb
language plpgsql stable security definer set search_path = '' as $$
declare yo uuid := (select auth.uid()); c record;
begin
  if p_usuario is null or not private.puede_ver_muro(p_usuario, yo) then return jsonb_build_object('visible', false); end if;
  select * into c from private.calcular_elo() x where x.uid = p_usuario;
  if not found then return jsonb_build_object('visible', true, 'elo', null, 'jugados', 0, 'delta', 0); end if;
  return jsonb_build_object('visible', true, 'elo', c.elo, 'jugados', c.jugados, 'delta', c.delta);
end $$;

revoke all on function public.ranking_elo(integer), public.elo_de(uuid) from public, anon, authenticated;
grant execute on function public.ranking_elo(integer), public.elo_de(uuid) to anon, authenticated;

-- 154 · Temporadas con premios (25-oct-2026, Cuenta 2). Cada mes (hora de Lima) es una temporada del ranking COMPETITIVO
-- ESTADO: APLICADA el 25-oct-2026 y probada en seco (supabase/tests/154_temporadas_premios_test.sql, 8 casos). Tarea «cerrar-temporada» programada.
-- (duelos con marcador confirmado: victoria 3, empate 1 — la misma regla de ranking_competitivo, 045). El día 1 a las 00:10 (Lima)
-- se CIERRA sola la temporada anterior: se guarda el podio y el top 10, se reparten ascuas GRATIS e insignias, y se avisa.
-- Premios: 1.º 300 · 2.º 200 · 3.º 100 · 4.º a 10.º 30 ascuas. Insignias: «Campeón», «Subcampeón», «Tercero», «Top 10» del mes.
-- Blindaje:
--   · Solo cuenta quien jugó al menos 3 duelos confirmados ese mes; si hay menos de 4 personas así, la temporada se cierra SIN premios
--     (evita que dos amigos se repartan el podio solos).
--   · Cerrar dos veces no paga dos veces: la temporada tiene clave única y cada pago su clave en el libro (temporada:AAAA-MM:usuario).
--   · Regla 140: ascuas solo gratis (tipo «ganado», fuente «temporada»). Nunca gemas.
--   · El cierre no depende de la privacidad del muro (los perfiles privados también cobran), pero la LECTURA pública sí la respeta.
--   · Sin DELETE ni DROP TRIGGER (create or replace). Si falla un pago, se registra el error y la temporada no queda a medias
--     (todo en una transacción: o se cierra entera o no se cierra).
create table if not exists public.temporadas_cierre (
  mes date primary key check (mes = date_trunc('month', mes)::date),
  cerrada timestamptz not null default now(),
  participantes integer not null default 0,
  con_premios boolean not null default false
);
create table if not exists public.temporada_premios (
  mes date not null references public.temporadas_cierre (mes) on delete cascade,
  usuario uuid not null references public.perfiles (id) on delete cascade,
  puesto smallint not null check (puesto between 1 and 10),
  puntos integer not null, jugados integer not null, victorias integer not null, gf integer not null, gc integer not null,
  ascuas integer not null default 0 check (ascuas >= 0),
  primary key (mes, usuario)
);
create index if not exists temporada_premios_usuario_idx on public.temporada_premios (usuario, mes desc);
alter table public.temporadas_cierre enable row level security;
alter table public.temporada_premios enable row level security;
revoke all on public.temporadas_cierre, public.temporada_premios from anon, authenticated;

create or replace function private.premio_temporada(p_puesto integer) returns integer
language sql immutable set search_path = '' as $$ select case p_puesto when 1 then 300 when 2 then 200 when 3 then 100 else 30 end $$;
create or replace function private.insignia_temporada(p_puesto integer) returns text
language sql immutable set search_path = '' as $$ select case p_puesto when 1 then 'Campeón' when 2 then 'Subcampeón' when 3 then 'Tercero' else 'Top 10' end $$;

-- Cierra un mes ya terminado (p_mes = cualquier día del mes). → 'CERRADA' | 'YA_CERRADA' | 'SIN_PREMIOS' | 'MES_EN_CURSO'.
create or replace function private.cerrar_temporada(p_mes date) returns text
language plpgsql security definer set search_path = '' as $$
declare v_mes date := date_trunc('month', p_mes)::date; ini timestamptz; fin timestamptz; v_n integer; v_tabla jsonb; e jsonb; v_pos integer; v_uid uuid; v_podio text := '';
begin
  ini := (v_mes::timestamp + interval '5 hours') at time zone 'UTC';       -- 00:00 Lima
  fin := ini + interval '1 month';
  if fin > now() then return 'MES_EN_CURSO'; end if;
  insert into public.temporadas_cierre (mes) values (v_mes) on conflict do nothing;
  if not found then return 'YA_CERRADA'; end if;
  select coalesce(jsonb_agg(jsonb_build_object('pos', pos, 'uid', uid, 'jugados', jugados, 'v', v, 'gf', gf, 'gc', gc, 'pts', pts) order by pos), '[]'::jsonb) into v_tabla
  from (select row_number() over (order by t.pts desc, (t.gf - t.gc) desc, t.gf desc, t.jugados asc, t.uid) pos, t.*
        from (select j.usuario_id uid, count(*)::int jugados, count(*) filter (where g_pro > g_contra)::int v, sum(g_pro)::int gf, sum(g_contra)::int gc,
                     (3 * count(*) filter (where g_pro > g_contra) + count(*) filter (where g_pro = g_contra))::int pts
                from (select case jd.lado when 'A' then x.goles_a else x.goles_b end g_pro, case jd.lado when 'A' then x.goles_b else x.goles_a end g_contra, jd.usuario_id
                        from public.resultados_duelo x join lateral private.jugadores_de_reto(x.reto_id) jd on true
                       where x.estado = 'CONFIRMADO' and x.updated_at >= ini and x.updated_at < fin) j
               where exists (select 1 from public.perfiles p where p.id = j.usuario_id)
               group by j.usuario_id having count(*) >= 3) t) z;
  v_n := jsonb_array_length(v_tabla);
  update public.temporadas_cierre set participantes = v_n, con_premios = v_n >= 4 where mes = v_mes;
  if v_n < 4 then return 'SIN_PREMIOS'; end if;
  for e in select x from jsonb_array_elements(v_tabla) x where (x ->> 'pos')::int <= 10 loop
    v_pos := (e ->> 'pos')::int; v_uid := (e ->> 'uid')::uuid;
    insert into public.temporada_premios (mes, usuario, puesto, puntos, jugados, victorias, gf, gc, ascuas)
    values (v_mes, v_uid, v_pos, (e ->> 'pts')::int, (e ->> 'jugados')::int, (e ->> 'v')::int, (e ->> 'gf')::int, (e ->> 'gc')::int, private.premio_temporada(v_pos));
    perform private.registrar_movimiento(v_uid, private.premio_temporada(v_pos), 'ganado', 'temporada', to_char(v_mes, 'YYYY-MM'),
      'temporada:' || to_char(v_mes, 'YYYY-MM') || ':' || v_uid, 'ascuas');
    perform private.aviso_nuevo(v_uid, 'LOGRO', '🏆 ' || private.insignia_temporada(v_pos) || ' de ' || to_char(v_mes, 'MM/YYYY'),
      'Terminaste ' || v_pos || '.º en el ranking competitivo del mes. Ganaste ' || private.premio_temporada(v_pos) || ' ascuas y la insignia «' || private.insignia_temporada(v_pos) || '».', 'ranking/');
    if v_pos <= 3 then v_podio := v_podio || v_pos || '. ' || private.discord_limpio(private.nombre(v_uid)) || ' — ' || (e ->> 'pts') || E' pts\n'; end if;
  end loop;
  perform private.discord_enviar('temporada', to_char(v_mes, 'YYYY-MM'), jsonb_build_object('embeds', jsonb_build_array(jsonb_build_object(
    'title', '🏆 Cerró la temporada ' || to_char(v_mes, 'MM/YYYY'), 'url', private.url_sitio() || 'ranking/', 'color', 16766720,
    'description', v_podio || E'\n' || v_n || ' jugadores con 3+ duelos confirmados. ¡Empieza una temporada nueva!'))));
  return 'CERRADA';
end $$;
revoke all on function private.cerrar_temporada(date), private.premio_temporada(integer), private.insignia_temporada(integer) from public, anon, authenticated;

alter table public.discord_envios drop constraint if exists discord_envios_tipo_check;
alter table public.discord_envios add constraint discord_envios_tipo_check check (tipo in ('resumen', 'evento', 'prueba', 'uso', 'sala', 'en_vivo',
  'draft', 'clan_serie', 'prode_semana', 'temporada'));

-- Staff: cerrar a mano un mes pasado (por si el cron falló). Idempotente.
create or replace function public.staff_cerrar_temporada(p_mes date) returns text
language plpgsql security definer set search_path = '' as $$
begin
  perform private.uid_requerido();
  if not private.es_moderador() then raise exception 'Solo el staff cierra temporadas.' using errcode = '42501'; end if;
  return private.cerrar_temporada(p_mes);
end $$;

-- Lectura: temporadas cerradas con su podio (respeta la privacidad del muro en los nombres).
create or replace function public.temporadas_historial(p_limite integer default 12) returns jsonb
language sql stable security definer set search_path = '' as $$
  select coalesce(jsonb_agg(jsonb_build_object('mes', c.mes, 'participantes', c.participantes, 'con_premios', c.con_premios,
      'podio', (select coalesce(jsonb_agg(jsonb_build_object('puesto', t.puesto, 'puntos', t.puntos, 'ascuas', t.ascuas,
                  'usuario', case when private.puede_ver_muro(t.usuario, (select auth.uid())) then jsonb_build_object('id', t.usuario, 'nombre', private.nombre(t.usuario),
                    'username', (select username from public.perfiles where id = t.usuario)) end) order by t.puesto), '[]'::jsonb)
                from public.temporada_premios t where t.mes = c.mes and t.puesto <= 10))
      order by c.mes desc), '[]'::jsonb)
  from (select * from public.temporadas_cierre order by mes desc limit greatest(1, least(coalesce(p_limite, 12), 36))) c
$$;

-- Insignias de temporada de una persona (perfil).
create or replace function public.insignias_temporada_de(p_usuario uuid) returns jsonb
language sql stable security definer set search_path = '' as $$
  select case when not private.puede_ver_muro(p_usuario, (select auth.uid())) then '[]'::jsonb else
    coalesce((select jsonb_agg(jsonb_build_object('mes', t.mes, 'puesto', t.puesto, 'insignia', private.insignia_temporada(t.puesto)) order by t.mes desc, t.puesto)
              from public.temporada_premios t where t.usuario = p_usuario), '[]'::jsonb) end
$$;

revoke all on function public.staff_cerrar_temporada(date), public.temporadas_historial(integer), public.insignias_temporada_de(uuid) from public, anon;
grant execute on function public.staff_cerrar_temporada(date) to authenticated;
grant execute on function public.temporadas_historial(integer), public.insignias_temporada_de(uuid) to anon, authenticated;

-- Día 1 de cada mes a las 05:10 UTC (00:10 Lima): cerrar el mes anterior.
select cron.schedule('cerrar-temporada', '10 5 1 * *', $$select private.cerrar_temporada((now() at time zone 'America/Lima' - interval '1 day')::date)$$);

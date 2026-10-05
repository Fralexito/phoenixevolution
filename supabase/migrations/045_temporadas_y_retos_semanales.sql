-- 045 · OLA C (3/5) · TEMPORADAS MENSUALES + DOS RANKINGS + RETOS SEMANALES. Depende de 036 (resultados_duelo, jugadores_de_reto), 044 (valoraciones).
-- Temporada = un MES calendario en hora de Lima (UTC-05:00 fija). Semana = lunes a domingo, también en hora de Lima.
-- Ranking COMPETITIVO: solo duelos con marcador CONFIRMADO por ambos líderes dentro de la temporada. Puntos: victoria 3, empate 1. Desempate: diferencia de goles, goles a favor, menos partidos.
-- Ranking de RETOS: suma de los puntos de los retos semanales COBRADOS durante la temporada.
-- Retos semanales: catálogo fijo (abajo); el progreso se calcula al leer desde datos reales; cobrar es una acción explícita, una sola vez por reto y semana,
--   y solo en la semana en curso. Todo por funciones (tabla de cobros cerrada). Los rankings solo muestran a quien puede verse su muro (mismo criterio que perfil/estadísticas).

-- ─── 1) Tabla de cobros ─────────────────────────────────────────────────────────────────────────────
create table if not exists public.retos_semanales_cobros (
  usuario_id uuid not null references auth.users(id) on delete cascade,
  semana date not null,                       -- lunes de esa semana (Lima)
  clave text not null,
  puntos integer not null check (puntos > 0),
  created_at timestamptz not null default now(),
  primary key (usuario_id, semana, clave)
);
create index if not exists retos_cobros_fecha_idx on public.retos_semanales_cobros (created_at);
alter table public.retos_semanales_cobros enable row level security;
revoke all on public.retos_semanales_cobros from anon, authenticated;

-- ─── 2) Tiempo (Lima fija) ──────────────────────────────────────────────────────────────────────────
-- Inicio (instante UTC) del mes de Lima que contiene p_ts, y de la semana (lunes) que contiene p_ts.
create or replace function private.inicio_mes_lima(p_ts timestamptz) returns timestamptz
language sql immutable set search_path = '' as $$ select (date_trunc('month', (p_ts at time zone 'UTC') - interval '5 hours') + interval '5 hours') at time zone 'UTC' $$;
create or replace function private.inicio_semana_lima(p_ts timestamptz) returns timestamptz
language sql immutable set search_path = '' as $$ select (date_trunc('week', (p_ts at time zone 'UTC') - interval '5 hours') + interval '5 hours') at time zone 'UTC' $$;
-- Fecha (día de Lima) del lunes de la semana de p_ts.
create or replace function private.lunes_lima(p_ts timestamptz) returns date
language sql immutable set search_path = '' as $$ select date_trunc('week', (p_ts at time zone 'UTC') - interval '5 hours')::date $$;
revoke all on function private.inicio_mes_lima(timestamptz), private.inicio_semana_lima(timestamptz), private.lunes_lima(timestamptz) from public, anon, authenticated;

-- ─── 3) Catálogo de retos semanales ─────────────────────────────────────────────────────────────────
create or replace function private.catalogo_retos_semanales() returns table (clave text, titulo text, descripcion text, meta integer, puntos integer, orden integer)
language sql immutable set search_path = '' as $$
  select * from (values
    ('jugar3',   'Calentando motores', 'Juega 3 partidos con marcador confirmado esta semana.', 3, 30, 1),
    ('rivales2', 'Cara nueva',         'Juega contra 2 rivales distintos esta semana.',          2, 30, 2),
    ('ganar2',   'Racha ganadora',     'Gana 2 partidos confirmados esta semana.',               2, 40, 3),
    ('valorar2', 'Buen deportista',    'Valora a 2 rivales después de jugar.',                   2, 20, 4)
  ) as t(clave, titulo, descripcion, meta, puntos, orden)
$$;
revoke all on function private.catalogo_retos_semanales() from public, anon, authenticated;

-- Progreso de una persona en un reto durante la semana que empieza en p_desde (7 días).
create or replace function private.progreso_reto(p_usuario uuid, p_clave text, p_desde timestamptz) returns integer
language plpgsql stable security definer set search_path = '' as $$
declare hasta timestamptz := p_desde + interval '7 days'; n integer := 0;
begin
  if p_clave in ('jugar3', 'rivales2', 'ganar2') then
    if p_clave = 'jugar3' then
      select count(*) into n from public.resultados_duelo x join lateral private.jugadores_de_reto(x.reto_id) j on j.usuario_id = p_usuario where x.estado = 'CONFIRMADO' and x.updated_at >= p_desde and x.updated_at < hasta;
    elsif p_clave = 'ganar2' then
      select count(*) into n from public.resultados_duelo x join lateral private.jugadores_de_reto(x.reto_id) j on j.usuario_id = p_usuario
       where x.estado = 'CONFIRMADO' and x.updated_at >= p_desde and x.updated_at < hasta and ((j.lado = 'A' and x.goles_a > x.goles_b) or (j.lado = 'B' and x.goles_b > x.goles_a));
    else
      select count(distinct op.usuario_id) into n from public.resultados_duelo x
        join lateral private.jugadores_de_reto(x.reto_id) j on j.usuario_id = p_usuario join lateral private.jugadores_de_reto(x.reto_id) op on op.lado <> j.lado
       where x.estado = 'CONFIRMADO' and x.updated_at >= p_desde and x.updated_at < hasta;
    end if;
  elsif p_clave = 'valorar2' then
    select count(*) into n from public.valoraciones where de_id = p_usuario and created_at >= p_desde and created_at < hasta;
  end if;
  return coalesce(n, 0);
end $$;
revoke all on function private.progreso_reto(uuid, text, timestamptz) from public, anon, authenticated;

-- ─── 4) Mis retos semanales y cobro ─────────────────────────────────────────────────────────────────
create or replace function public.mis_retos_semanales() returns jsonb
language plpgsql stable security definer set search_path = '' as $$
declare yo uuid := private.uid_requerido(); ini timestamptz := private.inicio_semana_lima(now()); lunes date := private.lunes_lima(now()); pts integer;
begin
  select coalesce(sum(puntos), 0) into pts from public.retos_semanales_cobros where usuario_id = yo and created_at >= private.inicio_mes_lima(now());
  return jsonb_build_object('semana_inicio', ini, 'semana_fin', ini + interval '7 days', 'puntos_temporada', pts,
    'retos', coalesce((select jsonb_agg(jsonb_build_object('clave', c.clave, 'titulo', c.titulo, 'descripcion', c.descripcion, 'meta', c.meta, 'puntos', c.puntos,
                'progreso', least(p.n, c.meta), 'cobrado', exists (select 1 from public.retos_semanales_cobros b where b.usuario_id = yo and b.semana = lunes and b.clave = c.clave),
                'cobrable', p.n >= c.meta and not exists (select 1 from public.retos_semanales_cobros b where b.usuario_id = yo and b.semana = lunes and b.clave = c.clave)) order by c.orden)
               from private.catalogo_retos_semanales() c cross join lateral (select private.progreso_reto(yo, c.clave, ini) n) p), '[]'::jsonb));
end $$;

create or replace function public.cobrar_reto_semanal(p_clave text) returns integer
language plpgsql security definer set search_path = '' as $$
declare yo uuid := private.uid_requerido(); c record; ini timestamptz := private.inicio_semana_lima(now()); lunes date := private.lunes_lima(now()); n integer;
begin
  select * into c from private.catalogo_retos_semanales() where clave = p_clave;
  if not found then raise exception 'Ese reto no existe.'; end if;
  perform pg_advisory_xact_lock(hashtextextended('reto-semanal:' || yo::text, 0));      -- evita cobrar dos veces con dos clics a la vez
  if exists (select 1 from public.retos_semanales_cobros where usuario_id = yo and semana = lunes and clave = c.clave) then raise exception 'Ya cobraste este reto esta semana.'; end if;
  n := private.progreso_reto(yo, c.clave, ini);
  if n < c.meta then raise exception 'Aún no cumples este reto (% de %).', n, c.meta; end if;
  insert into public.retos_semanales_cobros (usuario_id, semana, clave, puntos) values (yo, lunes, c.clave, c.puntos);
  return c.puntos;
end $$;

-- ─── 5) Rankings ────────────────────────────────────────────────────────────────────────────────────
-- Normaliza el mes pedido: nulo = el actual; no se aceptan meses futuros ni anteriores a 2024.
create or replace function private.mes_valido(p_mes date) returns timestamptz
language plpgsql stable set search_path = '' as $$
declare ini timestamptz := case when p_mes is null then private.inicio_mes_lima(now()) else ((date_trunc('month', p_mes)::timestamp + interval '5 hours') at time zone 'UTC') end;
begin
  if ini > now() or ini < timestamptz '2024-01-01 00:00:00+00' then raise exception 'Esa temporada no existe.'; end if;
  return ini;
end $$;
revoke all on function private.mes_valido(date) from public, anon, authenticated;

-- Ranking COMPETITIVO del mes (público; solo filas de personas cuyo muro puedes ver).
create or replace function public.ranking_competitivo(p_mes date default null, p_limite integer default 50) returns jsonb
language plpgsql stable security definer set search_path = '' as $$
declare ini timestamptz := private.mes_valido(p_mes); fin timestamptz; yo uuid := (select auth.uid()); n integer := least(greatest(coalesce(p_limite, 50), 1), 100);
begin
  fin := ini + interval '1 month';
  return coalesce((select jsonb_agg(jsonb_build_object('pos', f.pos, 'usuario_id', f.uid, 'username', f.username, 'nombre', f.nombre, 'avatar_url', f.avatar_url, 'jugados', f.jugados, 'victorias', f.v, 'empates', f.e, 'derrotas', f.d, 'gf', f.gf, 'gc', f.gc, 'puntos', f.pts) order by f.pos)
    from (select row_number() over (order by t.pts desc, (t.gf - t.gc) desc, t.gf desc, t.jugados asc, t.uid) as pos, t.*, p.username, p.nombre_display as nombre, p.avatar_url
          from (select j.usuario_id as uid, count(*)::int jugados,
                       count(*) filter (where g_pro > g_contra)::int v, count(*) filter (where g_pro = g_contra)::int e, count(*) filter (where g_pro < g_contra)::int d,
                       sum(g_pro)::int gf, sum(g_contra)::int gc, (3 * count(*) filter (where g_pro > g_contra) + count(*) filter (where g_pro = g_contra))::int pts
                  from (select x.reto_id, case jd.lado when 'A' then x.goles_a else x.goles_b end g_pro, case jd.lado when 'A' then x.goles_b else x.goles_a end g_contra, jd.usuario_id
                          from public.resultados_duelo x join lateral private.jugadores_de_reto(x.reto_id) jd on true
                         where x.estado = 'CONFIRMADO' and x.updated_at >= ini and x.updated_at < fin) j
                 group by j.usuario_id) t
          join public.perfiles p on p.id = t.uid
          where private.puede_ver_muro(t.uid, yo)
          order by 1 limit n) f), '[]'::jsonb);
end $$;

-- Ranking de RETOS del mes (puntos de retos semanales cobrados).
create or replace function public.ranking_retos(p_mes date default null, p_limite integer default 50) returns jsonb
language plpgsql stable security definer set search_path = '' as $$
declare ini timestamptz := private.mes_valido(p_mes); fin timestamptz; yo uuid := (select auth.uid()); n integer := least(greatest(coalesce(p_limite, 50), 1), 100);
begin
  fin := ini + interval '1 month';
  return coalesce((select jsonb_agg(jsonb_build_object('pos', f.pos, 'usuario_id', f.uid, 'username', f.username, 'nombre', f.nombre, 'avatar_url', f.avatar_url, 'retos', f.retos, 'puntos', f.pts) order by f.pos)
    from (select row_number() over (order by t.pts desc, t.retos desc, t.uid) as pos, t.*, p.username, p.nombre_display as nombre, p.avatar_url
          from (select b.usuario_id as uid, count(*)::int retos, sum(b.puntos)::int pts from public.retos_semanales_cobros b where b.created_at >= ini and b.created_at < fin group by b.usuario_id) t
          join public.perfiles p on p.id = t.uid
          where private.puede_ver_muro(t.uid, yo)
          order by 1 limit n) f), '[]'::jsonb);
end $$;

-- ─── 6) Permisos ────────────────────────────────────────────────────────────────────────────────────
revoke all on function public.mis_retos_semanales(), public.cobrar_reto_semanal(text), public.ranking_competitivo(date, integer), public.ranking_retos(date, integer) from public, anon, authenticated;
grant execute on function public.mis_retos_semanales(), public.cobrar_reto_semanal(text) to authenticated;
grant execute on function public.ranking_competitivo(date, integer), public.ranking_retos(date, integer) to anon, authenticated;

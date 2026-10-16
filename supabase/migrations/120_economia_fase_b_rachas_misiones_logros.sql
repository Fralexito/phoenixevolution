-- 120 · ECONOMÍA FASE B · racha diaria, primer partido del día, misiones semanales y premios de logros (solo ascuas, gratis).
-- Reutiliza lo que ya existe: private.registrar_movimiento (tipo 'ganado', clave única => reintentar nunca duplica), private.otorgar + economia_reglas,
--   private.progreso_reto (conteos semanales) y el sistema de logros de la migración 035/036 (logros_catalogo / logros_usuario / private.metricas_logros).
-- Todo cerrado (RLS sin políticas, sin grants a anon/authenticated en tablas); solo funciones SECURITY DEFINER con search_path vacío. Las gemas no se tocan.
-- Los días y semanas se miden en hora de Lima (America/Lima).
-- Máximo teórico de ascuas en un día de Lima: 205 (lo de antes) + 45 (racha 5+40) + 5 (primer partido) + 270 (misiones, peor semana) + 200 (tope diario de logros) = 725
--   => alerta_ascuas_dia sube de 400 a 800 (solo si seguía en el valor por defecto 400).

-- ─── 1) Tablas y columnas ────────────────────────────────────────────────────────────────────────
create table if not exists public.racha_diaria (
  usuario_id uuid primary key references auth.users(id) on delete cascade,
  racha integer not null default 0 check (racha >= 0),
  mejor integer not null default 0 check (mejor >= 0),
  ultimo_dia date,
  updated_at timestamptz not null default now()
);
create table if not exists public.misiones_cobros (
  usuario_id uuid not null references auth.users(id) on delete cascade,
  semana date not null,
  clave text not null check (clave ~ '^[a-z0-9_]{3,40}$'),
  ascuas integer not null check (ascuas > 0),
  created_at timestamptz not null default now(),
  primary key (usuario_id, semana, clave)
);
create table if not exists public.logros_cobros (
  usuario_id uuid not null references auth.users(id) on delete cascade,
  logro_id text not null check (logro_id ~ '^[a-z0-9_]{2,40}$'),
  ascuas integer not null check (ascuas > 0),
  created_at timestamptz not null default now(),
  primary key (usuario_id, logro_id)
);
create index if not exists logros_cobros_dia_idx on public.logros_cobros (usuario_id, created_at);
alter table public.racha_diaria enable row level security;
alter table public.misiones_cobros enable row level security;
alter table public.logros_cobros enable row level security;
revoke all on public.racha_diaria, public.misiones_cobros, public.logros_cobros from anon, authenticated;

-- Premio en ascuas de cada logro (0 = sin premio). Se puede ajustar por SQL sin tocar código.
alter table public.logros_catalogo add column if not exists ascuas integer not null default 0 check (ascuas between 0 and 200);
update public.logros_catalogo c set ascuas = v.a from (values
  ('primer_duelo', 20), ('duelista_10', 40), ('duelista_50', 150), ('anfitrion_1', 20), ('anfitrion_10', 120),
  ('primera_publicacion', 20), ('cronista', 50), ('primer_clip', 20), ('director', 60),
  ('conectado', 20), ('sociable', 50), ('popular', 60), ('referente', 150), ('aplaudido', 50), ('ovacion', 150),
  ('carnet_listo', 20), ('veterano', 80), ('fundador', 200),
  ('primera_victoria', 30), ('ganador_10', 80), ('ganador_50', 200), ('fair_play_10', 60)
) v(id, a) where c.id = v.id and c.ascuas = 0;

-- Regla editable por el administrador (mismo mecanismo que partido_jugado): +5 ascuas y +5 XP, una sola vez al día.
insert into public.economia_reglas (fuente, descripcion, xp, tokens, tope_diario) values
  ('primer_partido_dia', 'Jugar tu primer partido confirmado del día', 5, 5, 1)
on conflict (fuente) do nothing;

-- La vigilancia avisa por encima de 800 ascuas en 24 h (antes 400). Solo si nadie lo cambió a mano.
update public.economia_config set valor = '800', updated_at = now() where clave = 'alerta_ascuas_dia' and valor = '400';

-- ─── 2) Misiones semanales: 3 por semana, rotan entre 6 ────────────────────────────────────────────────────
-- Métrica: partidos | ganados | rivales | valoraciones (se miden con private.progreso_reto, que ya cuenta la semana de Lima)
create or replace function private.catalogo_misiones(p_lunes date) returns table (clave text, titulo text, descripcion text, meta integer, ascuas integer, metrica text, orden integer)
language sql immutable set search_path = '' as $$
  with pool(i, clave, titulo, descripcion, meta, ascuas, metrica) as (values
    (0, 'm_partidos10', 'Diez partidos',       'Juega 10 partidos con marcador confirmado esta semana.',  10,  80, 'partidos'),
    (1, 'm_rivales3',   'Tres rivales',        'Juega con 3 rivales distintos esta semana.',               3,  60, 'rivales'),
    (2, 'm_valorar5',   'Buen compañero',      'Valora a 5 rivales después de jugar.',                     5,  60, 'valoraciones'),
    (3, 'm_ganar4',     'Cuatro victorias',    'Gana 4 partidos con marcador confirmado esta semana.',     4,  90, 'ganados'),
    (4, 'm_rivales5',   'Cinco rivales',       'Juega con 5 rivales distintos esta semana.',               5, 100, 'rivales'),
    (5, 'm_partidos15', 'Maratón de partidos', 'Juega 15 partidos con marcador confirmado esta semana.',  15,  90, 'partidos')
  ), w as (select (((p_lunes - date '2026-01-05') / 7) * 2) as base)
  select p.clave, p.titulo, p.descripcion, p.meta, p.ascuas, p.metrica, (k.o + 1)::integer
  from w cross join generate_series(0, 2) k(o) join pool p on p.i = (((w.base + k.o) % 6) + 6) % 6
$$;
revoke all on function private.catalogo_misiones(date) from public, anon, authenticated;

create or replace function private.progreso_mision(p_usuario uuid, p_metrica text, p_desde timestamptz) returns integer
language sql stable security definer set search_path = '' as $$
  select private.progreso_reto(p_usuario, case p_metrica when 'partidos' then 'jugar3' when 'ganados' then 'ganar2' when 'rivales' then 'rivales2' when 'valoraciones' then 'valorar2' end, p_desde)
$$;
revoke all on function private.progreso_mision(uuid, text, timestamptz) from public, anon, authenticated;

-- ─── 3) Primer partido del día (automático, mismo mecanismo que partido_jugado) ───────────────────────────────
create or replace function private.economia_primer_partido() returns trigger
language plpgsql security definer set search_path = '' as $$
declare j record; hoy text := ((now() at time zone 'America/Lima')::date)::text;
begin
  if new.estado = 'CONFIRMADO' and (tg_op = 'INSERT' or old.estado is distinct from 'CONFIRMADO') then
    for j in select usuario_id from private.jugadores_de_reto(new.reto_id) loop
      perform private.otorgar(j.usuario_id, 'primer_partido_dia', hoy);
    end loop;
  end if;
  return new;
exception when others then
  raise warning '[economia] primer_partido %: %', new.reto_id, sqlerrm; return new;
end $$;
revoke all on function private.economia_primer_partido() from public, anon, authenticated;
drop trigger if exists zz_economia_b on public.resultados_duelo;
create trigger zz_economia_b after insert or update on public.resultados_duelo for each row execute function private.economia_primer_partido();

-- ─── 4) Reclamar ────────────────────────────────────────────────────────────────────────────────
-- Racha diaria: +5 ascuas por día; día 3 del ciclo +10 extra; día 7 del ciclo +40 extra (el ciclo se repite cada 7 días). Si falta un día (hora de Lima), vuelve a 1.
create or replace function public.reclamar_racha_diaria() returns jsonb
language plpgsql security definer set search_path = '' as $$
declare yo uuid := private.uid_requerido(); hoy date := (now() at time zone 'America/Lima')::date; r public.racha_diaria; n integer; ciclo integer; bono integer;
begin
  perform pg_advisory_xact_lock(hashtextextended('racha:' || yo::text, 0));
  select * into r from public.racha_diaria where usuario_id = yo;
  if found and r.ultimo_dia = hoy then raise exception 'Ya reclamaste tu racha de hoy. Vuelve mañana.'; end if;
  n := case when found and r.ultimo_dia = hoy - 1 then r.racha + 1 else 1 end;
  ciclo := ((n - 1) % 7) + 1;
  bono := case ciclo when 3 then 10 when 7 then 40 else 0 end;
  insert into public.racha_diaria (usuario_id, racha, mejor, ultimo_dia) values (yo, n, n, hoy)
    on conflict (usuario_id) do update set racha = n, mejor = greatest(public.racha_diaria.mejor, n), ultimo_dia = hoy, updated_at = now();
  perform private.registrar_movimiento(yo, 5, 'ganado', 'racha_diaria', hoy::text, 'racha:' || yo::text || ':' || hoy::text);
  if bono > 0 then perform private.registrar_movimiento(yo, bono, 'ganado', 'racha_bono', hoy::text, 'racha_bono:' || yo::text || ':' || hoy::text); end if;
  return jsonb_build_object('racha', n, 'ciclo', ciclo, 'ascuas', 5 + bono, 'bono', bono);
end $$;

create or replace function public.reclamar_mision(p_clave text) returns integer
language plpgsql security definer set search_path = '' as $$
declare yo uuid := private.uid_requerido(); lunes date := private.lunes_lima(now()); ini timestamptz := private.inicio_semana_lima(now()); m record; n integer;
begin
  select * into m from private.catalogo_misiones(lunes) c where c.clave = p_clave;
  if not found then raise exception 'Esa misión no está activa esta semana.'; end if;
  perform pg_advisory_xact_lock(hashtextextended('mision:' || yo::text, 0));
  if exists (select 1 from public.misiones_cobros where usuario_id = yo and semana = lunes and clave = m.clave) then raise exception 'Ya reclamaste esta misión esta semana.'; end if;
  n := private.progreso_mision(yo, m.metrica, ini);
  if n < m.meta then raise exception 'Aún no cumples esta misión (% de %).', n, m.meta; end if;
  insert into public.misiones_cobros (usuario_id, semana, clave, ascuas) values (yo, lunes, m.clave, m.ascuas);
  perform private.registrar_movimiento(yo, m.ascuas, 'ganado', 'mision', m.clave, 'mision:' || yo::text || ':' || lunes::text || ':' || m.clave);
  return m.ascuas;
end $$;

-- Premio de un logro ya obtenido (medalla en logros_usuario). Tope: 200 ascuas de logros por día (hora de Lima); lo demás se reclama otro día.
create or replace function public.reclamar_logro(p_id text) returns integer
language plpgsql security definer set search_path = '' as $$
declare yo uuid := private.uid_requerido(); l public.logros_catalogo; hoy integer;
begin
  select * into l from public.logros_catalogo where id = p_id and activo;
  if not found or l.ascuas <= 0 then raise exception 'Ese logro no tiene premio.'; end if;
  perform pg_advisory_xact_lock(hashtextextended('logro:' || yo::text, 0));
  if exists (select 1 from public.logros_cobros where usuario_id = yo and logro_id = l.id) then raise exception 'Ya reclamaste este logro.'; end if;
  if not exists (select 1 from public.logros_usuario where usuario_id = yo and logro_id = l.id) then raise exception 'Aún no consigues este logro.'; end if;
  select coalesce(sum(ascuas), 0) into hoy from public.logros_cobros where usuario_id = yo and created_at >= private.inicio_dia_lima(now());
  if hoy + l.ascuas > 200 then raise exception 'Hoy ya reclamaste muchos logros (máximo 200 ascuas al día). Vuelve mañana.'; end if;
  insert into public.logros_cobros (usuario_id, logro_id, ascuas) values (yo, l.id, l.ascuas);
  perform private.registrar_movimiento(yo, l.ascuas, 'ganado', 'logro', l.id, 'logro:' || yo::text || ':' || l.id);
  return l.ascuas;
end $$;

-- ─── 5) Lectura para la pestaña «Cómo ganar» ───────────────────────────────────────────────────────────
create or replace function public.mis_ascuas_extra() returns jsonb
language plpgsql stable security definer set search_path = '' as $$
declare yo uuid := private.uid_requerido(); hoy date := (now() at time zone 'America/Lima')::date; lunes date := private.lunes_lima(now()); ini timestamptz := private.inicio_semana_lima(now());
        r public.racha_diaria; actual integer := 0; hecha boolean := false; sig integer; ciclo_sig integer; met jsonb; usado integer;
begin
  select * into r from public.racha_diaria where usuario_id = yo;
  if found then hecha := r.ultimo_dia = hoy; actual := case when r.ultimo_dia >= hoy - 1 then r.racha else 0 end; end if;
  sig := actual + 1;                                                    -- racha que tendrás al reclamar (si ya reclamaste hoy: la de mañana)
  ciclo_sig := ((sig - 1) % 7) + 1;
  met := private.metricas_logros(yo);
  select coalesce(sum(ascuas), 0) into usado from public.logros_cobros where usuario_id = yo and created_at >= private.inicio_dia_lima(now());
  return jsonb_build_object(
    'racha', jsonb_build_object('actual', actual, 'mejor', coalesce(r.mejor, 0), 'reclamada_hoy', hecha, 'siguiente', sig, 'ciclo_siguiente', ciclo_sig,
       'ascuas_siguiente', 5 + case ciclo_sig when 3 then 10 when 7 then 40 else 0 end),
    'primer_partido', jsonb_build_object('ascuas', coalesce((select tokens from public.economia_reglas where fuente = 'primer_partido_dia' and activa), 0),
       'ganado_hoy', exists (select 1 from public.movimientos_tokens where clave = 'ganado:' || yo::text || ':primer_partido_dia:' || hoy::text)),
    'misiones', jsonb_build_object('semana_fin', ini + interval '7 days', 'items', coalesce((
       select jsonb_agg(jsonb_build_object('clave', c.clave, 'titulo', c.titulo, 'descripcion', c.descripcion, 'meta', c.meta, 'ascuas', c.ascuas, 'progreso', least(p.n, c.meta),
         'cobrado', b.clave is not null, 'cobrable', p.n >= c.meta and b.clave is null) order by c.orden)
       from private.catalogo_misiones(lunes) c cross join lateral (select private.progreso_mision(yo, c.metrica, ini) n) p
       left join public.misiones_cobros b on b.usuario_id = yo and b.semana = lunes and b.clave = c.clave), '[]'::jsonb)),
    'logros', jsonb_build_object('tope_dia', 200, 'usado_hoy', usado, 'items', coalesce((
       select jsonb_agg(jsonb_build_object('clave', c.id, 'titulo', c.nombre, 'descripcion', c.descripcion, 'icono', c.icono, 'nivel', c.nivel, 'meta', c.objetivo, 'ascuas', c.ascuas,
         'progreso', least(coalesce((met ->> c.metrica)::integer, 0), c.objetivo), 'obtenido', lu.logro_id is not null, 'cobrado', b.logro_id is not null,
         'cobrable', lu.logro_id is not null and b.logro_id is null) order by c.ascuas, c.orden)
       from public.logros_catalogo c left join public.logros_usuario lu on lu.usuario_id = yo and lu.logro_id = c.id
       left join public.logros_cobros b on b.usuario_id = yo and b.logro_id = c.id where c.activo and c.ascuas > 0), '[]'::jsonb)));
end $$;

-- ─── 6) Permisos ─────────────────────────────────────────────────────────────────────────────────
revoke all on function public.reclamar_racha_diaria(), public.reclamar_mision(text), public.reclamar_logro(text), public.mis_ascuas_extra() from public, anon;
grant execute on function public.reclamar_racha_diaria(), public.reclamar_mision(text), public.reclamar_logro(text), public.mis_ascuas_extra() to authenticated;

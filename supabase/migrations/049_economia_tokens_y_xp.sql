-- 049 · ECONOMÍA (1/3) · LIBRO DE TOKENS, XP Y NIVELES. Depende de 036 (resultados_duelo), 044 (valoraciones), 045 (retos_semanales_cobros).
-- Principio: el saldo NUNCA se edita a mano. Cada cambio es una línea inmutable en `movimientos_tokens` (con clave de idempotencia única: reintentar jamás duplica),
--   y `billeteras` es solo la suma, actualizada en la misma transacción bajo bloqueo de fila. Entero sin decimales.
-- XP (experiencia) y tokens son cosas distintas: el XP solo sube (prestigio/nivel); los tokens se gastan. Nivel n exige 50·n·(n-1) XP acumulados.
-- Ganancias automáticas (todas idempotentes y con tope diario): partido confirmado, reto semanal cobrado, valoración enviada. Reglas editables por admin.
-- Todo cerrado (sin acceso directo): solo funciones. Tokens sin valor monetario: no hay retiro ni transferencia entre usuarios.

-- ─── 1) Tablas ───────────────────────────────────────────────────────────────────────────────────
create table if not exists public.billeteras (
  usuario_id uuid primary key references auth.users(id) on delete cascade,
  saldo integer not null default 0,
  updated_at timestamptz not null default now()
);
create table if not exists public.movimientos_tokens (
  id bigint generated always as identity primary key,
  usuario_id uuid not null references auth.users(id) on delete cascade,
  delta integer not null check (delta <> 0),
  tipo text not null check (tipo in ('ganado', 'compra_tienda', 'compra_dinero', 'reembolso', 'ajuste_admin', 'devolucion')),
  fuente text,
  referencia text,
  clave text not null unique,
  saldo_despues integer not null,
  created_at timestamptz not null default now()
);
create index if not exists movimientos_usuario_idx on public.movimientos_tokens (usuario_id, id desc);

create table if not exists public.xp_movimientos (
  id bigint generated always as identity primary key,
  usuario_id uuid not null references auth.users(id) on delete cascade,
  puntos integer not null check (puntos > 0),
  fuente text not null,
  clave text not null,
  created_at timestamptz not null default now(),
  unique (usuario_id, clave)
);
create index if not exists xp_movimientos_dia_idx on public.xp_movimientos (usuario_id, fuente, created_at);
create table if not exists public.xp_totales (
  usuario_id uuid primary key references auth.users(id) on delete cascade,
  xp bigint not null default 0 check (xp >= 0)
);
create table if not exists public.economia_reglas (
  fuente text primary key check (fuente ~ '^[a-z0-9_]{3,40}$'),
  descripcion text not null,
  xp integer not null default 0 check (xp between 0 and 1000),
  tokens integer not null default 0 check (tokens between 0 and 1000),
  tope_diario integer check (tope_diario is null or tope_diario between 1 and 100),
  activa boolean not null default true
);
alter table public.billeteras enable row level security; alter table public.movimientos_tokens enable row level security;
alter table public.xp_movimientos enable row level security; alter table public.xp_totales enable row level security; alter table public.economia_reglas enable row level security;
revoke all on public.billeteras, public.movimientos_tokens, public.xp_movimientos, public.xp_totales, public.economia_reglas from anon, authenticated;

insert into public.economia_reglas (fuente, descripcion, xp, tokens, tope_diario) values
  ('partido_jugado',    'Jugar un partido con marcador confirmado',      20, 10, 5),
  ('partido_ganado',    'Ganar un partido con marcador confirmado',      15,  5, 5),
  ('valoracion_enviada', 'Valorar a un rival después de jugar',            5,  2, 5),
  ('reto_jugar3',       'Cobrar el reto semanal «Calentando motores»',   30, 30, null),
  ('reto_rivales2',     'Cobrar el reto semanal «Cara nueva»',           30, 30, null),
  ('reto_ganar2',       'Cobrar el reto semanal «Racha ganadora»',       40, 40, null),
  ('reto_valorar2',     'Cobrar el reto semanal «Buen deportista»',      20, 20, null)
on conflict (fuente) do nothing;

-- ─── 2) Ayudantes ────────────────────────────────────────────────────────────────────────────────
create or replace function private.inicio_dia_lima(p_ts timestamptz) returns timestamptz
language sql immutable set search_path = '' as $$ select (date_trunc('day', (p_ts at time zone 'UTC') - interval '5 hours') + interval '5 hours') at time zone 'UTC' $$;
create or replace function private.nivel_de_xp(p_xp bigint) returns integer
language sql immutable set search_path = '' as $$ select floor((1 + sqrt(1 + greatest(coalesce(p_xp, 0), 0) / 12.5)) / 2)::integer $$;
create or replace function private.xp_para_nivel(p_nivel integer) returns bigint
language sql immutable set search_path = '' as $$ select (50 * greatest(p_nivel, 1) * (greatest(p_nivel, 1) - 1))::bigint $$;
revoke all on function private.inicio_dia_lima(timestamptz), private.nivel_de_xp(bigint), private.xp_para_nivel(integer) from public, anon, authenticated;

-- Única puerta para mover tokens. Devuelve el id del movimiento, o NULL si esa clave ya existía (idempotente). Un saldo no puede quedar negativo salvo en reembolsos.
create or replace function private.registrar_movimiento(p_usuario uuid, p_delta integer, p_tipo text, p_fuente text, p_referencia text, p_clave text) returns bigint
language plpgsql security definer set search_path = '' as $$
declare s integer; nuevo integer; id bigint;
begin
  if p_delta is null or p_delta = 0 then raise exception 'El movimiento no puede ser cero.'; end if;
  insert into public.billeteras (usuario_id) values (p_usuario) on conflict do nothing;
  select saldo into s from public.billeteras where usuario_id = p_usuario for update;
  if exists (select 1 from public.movimientos_tokens where clave = p_clave) then return null; end if;
  nuevo := s + p_delta;
  if nuevo < 0 and p_delta < 0 and p_tipo <> 'reembolso' then raise exception 'Saldo insuficiente.'; end if;
  insert into public.movimientos_tokens (usuario_id, delta, tipo, fuente, referencia, clave, saldo_despues) values (p_usuario, p_delta, p_tipo, p_fuente, p_referencia, p_clave, nuevo) returning movimientos_tokens.id into id;
  update public.billeteras set saldo = nuevo, updated_at = now() where usuario_id = p_usuario;
  return id;
end $$;
revoke all on function private.registrar_movimiento(uuid, integer, text, text, text, text) from public, anon, authenticated;

-- Otorga lo que dicte la regla de `p_fuente` (XP + tokens), una sola vez por (persona, clave) y respetando el tope diario. Nunca lanza.
create or replace function private.otorgar(p_usuario uuid, p_fuente text, p_clave text) returns boolean
language plpgsql security definer set search_path = '' as $$
declare r public.economia_reglas; hoy integer; antes integer; despues integer; nuevo bigint; k text := p_fuente || ':' || p_clave;
begin
  select * into r from public.economia_reglas where fuente = p_fuente and activa;
  if not found or (r.xp = 0 and r.tokens = 0) then return false; end if;
  if r.tope_diario is not null then
    select count(*) into hoy from public.xp_movimientos where usuario_id = p_usuario and fuente = p_fuente and created_at >= private.inicio_dia_lima(now());
    if hoy >= r.tope_diario then return false; end if;
  end if;
  if r.xp > 0 then
    select coalesce(xp, 0) into antes from public.xp_totales where usuario_id = p_usuario; antes := coalesce(antes, 0);
    insert into public.xp_movimientos (usuario_id, puntos, fuente, clave) values (p_usuario, r.xp, p_fuente, k) on conflict (usuario_id, clave) do nothing returning id into nuevo;
    if nuevo is null then return false; end if;
    insert into public.xp_totales (usuario_id, xp) values (p_usuario, r.xp) on conflict (usuario_id) do update set xp = public.xp_totales.xp + r.xp;
    despues := antes + r.xp;
    if private.nivel_de_xp(despues) > private.nivel_de_xp(antes) then
      perform private.notificar(p_usuario, 'LOGRO', '¡Subiste de nivel!', 'Ahora eres nivel ' || private.nivel_de_xp(despues) || '.');
    end if;
  end if;
  if r.tokens > 0 then perform private.registrar_movimiento(p_usuario, r.tokens, 'ganado', p_fuente, p_clave, 'ganado:' || p_usuario::text || ':' || k); end if;
  return true;
exception when others then
  raise warning '[economia] otorgar % %: %', p_fuente, p_clave, sqlerrm; return false;
end $$;
revoke all on function private.otorgar(uuid, text, text) from public, anon, authenticated;

-- ─── 3) Fuentes automáticas (jamás rompen la acción original) ─────────────────────────────────────────────────
create or replace function private.economia_por_resultado() returns trigger
language plpgsql security definer set search_path = '' as $$
declare j record; gano boolean;
begin
  if new.estado = 'CONFIRMADO' and (tg_op = 'INSERT' or old.estado is distinct from 'CONFIRMADO') then
    for j in select usuario_id, lado from private.jugadores_de_reto(new.reto_id) loop
      perform private.otorgar(j.usuario_id, 'partido_jugado', 'reto' || new.reto_id);
      gano := (j.lado = 'A' and new.goles_a > new.goles_b) or (j.lado = 'B' and new.goles_b > new.goles_a);
      if gano then perform private.otorgar(j.usuario_id, 'partido_ganado', 'reto' || new.reto_id); end if;
    end loop;
  end if;
  return new;
exception when others then
  raise warning '[economia] por_resultado %: %', new.reto_id, sqlerrm; return new;
end $$;
drop trigger if exists zz_economia on public.resultados_duelo;
create trigger zz_economia after insert or update on public.resultados_duelo for each row execute function private.economia_por_resultado();

create or replace function private.economia_por_reto_semanal() returns trigger
language plpgsql security definer set search_path = '' as $$
begin
  perform private.otorgar(new.usuario_id, 'reto_' || new.clave, new.semana::text);
  return new;
exception when others then
  raise warning '[economia] por_reto_semanal: %', sqlerrm; return new;
end $$;
drop trigger if exists zz_economia on public.retos_semanales_cobros;
create trigger zz_economia after insert on public.retos_semanales_cobros for each row execute function private.economia_por_reto_semanal();

create or replace function private.economia_por_valoracion() returns trigger
language plpgsql security definer set search_path = '' as $$
begin
  perform private.otorgar(new.de_id, 'valoracion_enviada', new.id::text);
  return new;
exception when others then
  raise warning '[economia] por_valoracion: %', sqlerrm; return new;
end $$;
drop trigger if exists zz_economia on public.valoraciones;
create trigger zz_economia after insert on public.valoraciones for each row execute function private.economia_por_valoracion();
revoke all on function private.economia_por_resultado(), private.economia_por_reto_semanal(), private.economia_por_valoracion() from public, anon, authenticated;

-- ─── 4) Lectura ──────────────────────────────────────────────────────────────────────────────────
create or replace function public.mi_economia() returns jsonb
language plpgsql stable security definer set search_path = '' as $$
declare yo uuid := private.uid_requerido(); x bigint; n integer; s integer;
begin
  select coalesce(xp, 0) into x from public.xp_totales where usuario_id = yo; x := coalesce(x, 0); n := private.nivel_de_xp(x);
  select coalesce(saldo, 0) into s from public.billeteras where usuario_id = yo; s := coalesce(s, 0);
  return jsonb_build_object('saldo', s, 'xp', x, 'nivel', n, 'xp_nivel', private.xp_para_nivel(n), 'xp_siguiente', private.xp_para_nivel(n + 1));
end $$;

create or replace function public.mis_movimientos(p_limite integer default 30, p_antes bigint default null) returns jsonb
language plpgsql stable security definer set search_path = '' as $$
declare yo uuid := private.uid_requerido(); n integer := least(greatest(coalesce(p_limite, 30), 1), 100);
begin
  return coalesce((select jsonb_agg(jsonb_build_object('id', m.id, 'delta', m.delta, 'tipo', m.tipo, 'fuente', m.fuente, 'saldo', m.saldo_despues, 'cuando', m.created_at) order by m.id desc)
    from (select * from public.movimientos_tokens where usuario_id = yo and (p_antes is null or id < p_antes) order by id desc limit n) m), '[]'::jsonb);
end $$;

create or replace function public.xp_de(p_usuario uuid) returns jsonb
language plpgsql stable security definer set search_path = '' as $$
declare yo uuid := (select auth.uid()); x bigint;
begin
  if p_usuario is null or not private.puede_ver_muro(p_usuario, yo) then return jsonb_build_object('visible', false); end if;
  select coalesce(xp, 0) into x from public.xp_totales where usuario_id = p_usuario; x := coalesce(x, 0);
  return jsonb_build_object('visible', true, 'nivel', private.nivel_de_xp(x), 'xp', x);
end $$;

create or replace function public.reglas_economia() returns jsonb
language sql stable security definer set search_path = '' as $$
  select coalesce(jsonb_agg(jsonb_build_object('fuente', fuente, 'descripcion', descripcion, 'xp', xp, 'tokens', tokens, 'tope_diario', tope_diario) order by fuente), '[]'::jsonb) from public.economia_reglas where activa
$$;

-- ─── 5) Administración (solo admin; auditada) ────────────────────────────────────────────────────
create or replace function public.admin_ajustar_tokens(p_usuario uuid, p_delta integer, p_motivo text) returns integer
language plpgsql security definer set search_path = '' as $$
declare mot text := btrim(coalesce(p_motivo, '')); mov bigint; s integer;
begin
  if not private.es_admin() then raise exception 'Solo el administrador puede ajustar tokens.'; end if;
  if char_length(mot) < 5 then raise exception 'Escribe el motivo (mínimo 5 letras).'; end if;
  if p_delta is null or p_delta = 0 or abs(p_delta) > 100000 then raise exception 'El ajuste debe ser distinto de cero y de máximo 100000.'; end if;
  mov := private.registrar_movimiento(p_usuario, p_delta, 'ajuste_admin', 'admin', left(mot, 120), 'ajuste:' || gen_random_uuid()::text);
  select saldo into s from public.billeteras where usuario_id = p_usuario;
  perform private.auditar_moderacion('editar', 'billeteras', p_usuario::text, 'Saldo de ' || private.nombre(p_usuario), jsonb_build_object('delta', p_delta, 'saldo', s), mot);
  return s;
end $$;

create or replace function public.admin_guardar_regla(p_fuente text, p_xp integer, p_tokens integer, p_tope integer, p_activa boolean) returns void
language plpgsql security definer set search_path = '' as $$
declare r public.economia_reglas;
begin
  if not private.es_admin() then raise exception 'Solo el administrador puede cambiar las reglas.'; end if;
  select * into r from public.economia_reglas where fuente = p_fuente;
  if not found then raise exception 'Esa fuente no existe.'; end if;
  update public.economia_reglas set xp = coalesce(p_xp, xp), tokens = coalesce(p_tokens, tokens), tope_diario = p_tope, activa = coalesce(p_activa, activa) where fuente = p_fuente;
  perform private.auditar_moderacion('editar', 'economia_reglas', p_fuente, 'Regla ' || p_fuente, jsonb_build_object('xp', p_xp, 'tokens', p_tokens, 'tope', p_tope, 'activa', p_activa), 'Cambio de regla de economía');
end $$;

-- ─── 6) Permisos ─────────────────────────────────────────────────────────────────────────────────
revoke all on function public.mi_economia(), public.mis_movimientos(integer, bigint), public.xp_de(uuid), public.reglas_economia(), public.admin_ajustar_tokens(uuid, integer, text), public.admin_guardar_regla(text, integer, integer, integer, boolean) from public, anon, authenticated;
grant execute on function public.mi_economia(), public.mis_movimientos(integer, bigint), public.admin_ajustar_tokens(uuid, integer, text), public.admin_guardar_regla(text, integer, integer, integer, boolean) to authenticated;
grant execute on function public.xp_de(uuid), public.reglas_economia() to anon, authenticated;

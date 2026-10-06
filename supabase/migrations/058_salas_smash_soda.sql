-- 058 · MÓDULO 2 · SALAS SMASH SODA ↔ PHOENIX (capa de datos).
-- Diseño: claude/modulo2-salas-arquitectura.md · Contrato de la app: claude/contrato-v1.md (fase 2.2).
-- Quién escribe qué:
--   · La app (Smash Soda) NUNCA toca la BD directo: habla con la Edge Function /v1, que usa service_role (salta RLS).
--   · La web solo LEE por RLS y ESCRIBE por RPC (funciones security definer que validan reglas).
-- Decisiones confirmadas por Fralex (6 oct 2026): (a) abrir salas requiere aprobación de staff; (b) visibilidad por defecto «amigos».
-- Nota de impacto cruzado: perfiles.puede_hostear YA EXISTE y es el interruptor «Puedo ser host» de Duelos (lo pone el propio
-- usuario). No se toca. El permiso NUEVO de salas es perfiles.host_aprobado (solo staff lo cambia).

-- ─── 1) Permiso de host para salas ──────────────────────────────────────────────────────────────────────────────────────
alter table public.perfiles add column if not exists host_aprobado boolean not null default false;
update public.perfiles set host_aprobado = true where rol in ('ayudante', 'moderador', 'admin');

-- Blindaje: aunque la política perfiles_update_propio deja editar el propio perfil, host_aprobado solo lo cambia staff
-- (o el backend con service_role, donde auth.uid() es nulo).
create or replace function private.trg_host_aprobado_blindado() returns trigger
language plpgsql security definer set search_path = '' as $$
begin
  if new.host_aprobado is distinct from old.host_aprobado and (select auth.uid()) is not null and not private.es_staff() then
    raise exception 'Solo el staff puede aprobar hosts.' using errcode = '42501';
  end if;
  return new;
end $$;
revoke all on function private.trg_host_aprobado_blindado() from public, anon, authenticated;
drop trigger if exists host_aprobado_blindado on public.perfiles;
create trigger host_aprobado_blindado before update of host_aprobado on public.perfiles
  for each row execute function private.trg_host_aprobado_blindado();

create or replace function private.puede_abrir_salas(p_uid uuid) returns boolean
language sql stable security definer set search_path = '' as $$
  select coalesce((select p.host_aprobado or p.rol in ('ayudante', 'moderador', 'admin') from public.perfiles p where p.id = p_uid), false)
$$;
revoke all on function private.puede_abrir_salas(uuid) from public, anon, authenticated;

-- ─── 2) Capa 1 · Emparejamiento del dispositivo (como vincular una TV) ──────────────────────────────────────────────────
-- Solo se guarda la HUELLA SHA-256 del código y del token: si alguien lee la tabla, no puede usarlos.
create table if not exists public.codigos_emparejamiento (
  id bigint generated always as identity primary key,
  usuario uuid not null references public.perfiles (id) on delete cascade,
  codigo_huella text not null unique,
  expira timestamptz not null,
  usado timestamptz,
  intentos smallint not null default 0,
  creado timestamptz not null default now()
);
create index if not exists codigos_emparejamiento_usuario_idx on public.codigos_emparejamiento (usuario, creado desc);
alter table public.codigos_emparejamiento enable row level security;   -- sin políticas: nadie lo lee desde el cliente

create table if not exists public.dispositivos_host (
  id uuid primary key default gen_random_uuid(),
  usuario uuid not null references public.perfiles (id) on delete cascade,
  huella_token text not null unique,
  nombre text not null default 'Mi PC' check (char_length(nombre) between 1 and 40),
  version_app text,
  creado timestamptz not null default now(),
  ultimo_uso timestamptz,
  revocado timestamptz
);
create index if not exists dispositivos_host_usuario_idx on public.dispositivos_host (usuario) where revocado is null;
alter table public.dispositivos_host enable row level security;
drop policy if exists dispositivos_host_leer on public.dispositivos_host;
create policy dispositivos_host_leer on public.dispositivos_host for select to authenticated
  using (usuario = (select auth.uid()) or private.es_staff());

-- ─── 3) Capa 2 · Salas ──────────────────────────────────────────────────────────────────────────────────────────────────
create table if not exists public.salas (
  id uuid primary key default gen_random_uuid(),
  host uuid not null references public.perfiles (id) on delete cascade,
  dispositivo uuid not null references public.dispositivos_host (id) on delete cascade,
  estado text not null default 'preparando' check (estado in ('preparando', 'abierta', 'en_partida', 'cerrada', 'caida')),
  visibilidad text not null default 'amigos' check (visibilidad in ('publica', 'amigos', 'privada', 'torneo')),
  juego text check (char_length(juego) <= 60),
  parche text check (char_length(parche) <= 60),
  region text check (char_length(region) <= 40),
  plazas_total smallint not null default 4 check (plazas_total between 1 and 16),
  plazas_libres smallint not null default 4 check (plazas_libres between 0 and 16),
  limite_espectadores smallint not null default 4 check (limite_espectadores between 0 and 16),
  latido timestamptz not null default now(),
  abierta_en timestamptz not null default now(),
  cerrada_en timestamptz,
  reto_id integer references public.retos_matchmaking (id) on delete set null,
  partida_id bigint,          -- reservado para «partidas confirmadas» (aún no existe la tabla)
  torneo_id bigint            -- reservado para torneos automáticos
);
create index if not exists salas_vivas_idx on public.salas (latido) where estado in ('preparando', 'abierta', 'en_partida');
create index if not exists salas_host_idx on public.salas (host, abierta_en desc);
create index if not exists salas_reto_idx on public.salas (reto_id) where reto_id is not null;
-- Una sola sala viva por dispositivo (el diseño admite varias por host en el futuro, no por PC).
create unique index if not exists salas_una_viva_por_dispositivo on public.salas (dispositivo) where estado in ('preparando', 'abierta', 'en_partida');

-- ¿Quién VE la sala? (ver ≠ entrar). Sala de reto: ignora la visibilidad.
create or replace function private.puede_ver_sala(p_host uuid, p_visibilidad text, p_reto integer) returns boolean
language sql stable security definer set search_path = '' as $$
  select case
    when (select auth.uid()) is null then false
    when p_host = (select auth.uid()) or private.es_staff() then true
    when p_reto is not null then
      exists (select 1 from private.jugadores_de_reto(p_reto) j where j.usuario_id = (select auth.uid()))
      or exists (select 1 from public.reto_espectadores e where e.reto_id = p_reto and e.usuario_id = (select auth.uid()) and e.estado = 'APROBADO')
    when p_visibilidad in ('publica', 'torneo') then not private.hay_bloqueo(p_host, (select auth.uid()))
    when p_visibilidad = 'amigos' then private.son_amigos(p_host, (select auth.uid()))
    else false
  end
$$;
revoke all on function private.puede_ver_sala(uuid, text, integer) from public, anon;
grant execute on function private.puede_ver_sala(uuid, text, integer) to authenticated;

alter table public.salas enable row level security;
drop policy if exists salas_leer on public.salas;
create policy salas_leer on public.salas for select to authenticated
  using (private.puede_ver_sala(host, visibilidad, reto_id));

-- El enlace vive APARTE con su propia regla: solo quien puede ENTRAR lo lee.
-- Hoy «entrar» = «ver» salvo en torneo (solo jugadores del reto/staff/host); se separa para poder endurecerlo sin tocar salas.
create table if not exists public.salas_enlace (
  sala_id uuid primary key references public.salas (id) on delete cascade,
  enlace text not null check (enlace ~ '^https://' and char_length(enlace) <= 500),
  actualizado timestamptz not null default now()
);
alter table public.salas_enlace enable row level security;
drop policy if exists salas_enlace_leer on public.salas_enlace;
create policy salas_enlace_leer on public.salas_enlace for select to authenticated
  using (exists (
    select 1 from public.salas s
    where s.id = sala_id and s.estado in ('preparando', 'abierta', 'en_partida')
      and private.puede_ver_sala(s.host, s.visibilidad, s.reto_id)
      and (s.visibilidad <> 'torneo' or s.host = (select auth.uid()) or private.es_staff()
           or exists (select 1 from private.jugadores_de_reto(s.reto_id) j where j.usuario_id = (select auth.uid())))
  ));

-- ─── 4) Capa 3 · Eventos (libro: solo se agrega) ────────────────────────────────────────────────────────────────────────
create table if not exists public.eventos_sala (
  id bigint generated always as identity primary key,
  sala_id uuid not null references public.salas (id) on delete cascade,
  tipo text not null check (tipo in ('abrir', 'cerrar', 'entra', 'sale', 'desconexion', 'reconexion', 'expulsion', 'cambio_mando',
                                     'partida_inicio', 'partida_fin', 'pausa', 'plazas_ampliadas', 'espera_rechazada', 'caida')),
  actor_parsec text,
  usuario uuid references public.perfiles (id) on delete set null,
  datos jsonb not null default '{}'::jsonb check (pg_column_size(datos) <= 4096),
  ocurrido timestamptz not null default now(),
  recibido timestamptz not null default now(),
  clave_idempotencia text not null unique check (char_length(clave_idempotencia) between 8 and 80)
);
create index if not exists eventos_sala_sala_idx on public.eventos_sala (sala_id, ocurrido);
alter table public.eventos_sala enable row level security;
drop policy if exists eventos_sala_leer on public.eventos_sala;
create policy eventos_sala_leer on public.eventos_sala for select to authenticated
  using (exists (
    select 1 from public.salas s where s.id = sala_id
      and (s.host = (select auth.uid()) or private.es_staff()
           or (s.reto_id is not null and exists (select 1 from private.jugadores_de_reto(s.reto_id) j where j.usuario_id = (select auth.uid()))))
  ));

-- ─── 5) Capa 4 · Calidad ────────────────────────────────────────────────────────────────────────────────────────────────
create table if not exists public.muestras_calidad (
  id bigint generated always as identity primary key,
  sala_id uuid not null references public.salas (id) on delete cascade,
  host uuid not null references public.perfiles (id) on delete cascade,
  region text,
  actor_parsec text not null,
  usuario uuid references public.perfiles (id) on delete set null,
  ping_ms integer check (ping_ms between 0 and 10000),
  fast_rts integer check (fast_rts >= 0),
  slow_rts integer check (slow_rts >= 0),
  bitrate_kbps integer check (bitrate_kbps >= 0),
  tomada timestamptz not null default now()
);
create index if not exists muestras_calidad_host_idx on public.muestras_calidad (host, tomada desc);
create index if not exists muestras_calidad_tomada_idx on public.muestras_calidad (tomada);
alter table public.muestras_calidad enable row level security;
drop policy if exists muestras_calidad_leer on public.muestras_calidad;
create policy muestras_calidad_leer on public.muestras_calidad for select to authenticated
  using (host = (select auth.uid()) or private.es_staff());

-- Resumen público por host y región (mediana y p95 de los últimos 14 días). Lo recalcula pg_cron cada hora.
create table if not exists public.calidad_host_resumen (
  host uuid not null references public.perfiles (id) on delete cascade,
  region text not null default '',
  muestras integer not null,
  ping_mediana integer,
  ping_p95 integer,
  perdida_pct numeric(5, 2),
  actualizado timestamptz not null default now(),
  primary key (host, region)
);
alter table public.calidad_host_resumen enable row level security;
drop policy if exists calidad_host_resumen_leer on public.calidad_host_resumen;
create policy calidad_host_resumen_leer on public.calidad_host_resumen for select to authenticated using (true);

-- ─── 6) Capa 5 · Cuenta Parsec ↔ perfil ─────────────────────────────────────────────────────────────────────────────────
-- El jugador DECLARA su ID de Parsec en la web; pasa a «verificada» la primera vez que la app lo ve entrar a una sala
-- estando él en la lista de roles (lo marca la Edge Function). Un ID Parsec pertenece a un solo perfil.
create table if not exists public.cuentas_parsec (
  usuario uuid primary key references public.perfiles (id) on delete cascade,
  parsec_id text not null unique check (parsec_id ~ '^[0-9]{1,20}$'),
  nombre_parsec text check (char_length(nombre_parsec) <= 60),
  estado text not null default 'declarada' check (estado in ('declarada', 'verificada')),
  declarada_en timestamptz not null default now(),
  verificada_en timestamptz
);
alter table public.cuentas_parsec enable row level security;
drop policy if exists cuentas_parsec_leer on public.cuentas_parsec;
create policy cuentas_parsec_leer on public.cuentas_parsec for select to authenticated
  using (usuario = (select auth.uid()) or private.es_staff());

-- ─── 7) Permisos de tabla: el cliente solo lee; toda escritura va por RPC o por la Edge Function ────────────────────────
revoke all on public.codigos_emparejamiento, public.dispositivos_host, public.salas, public.salas_enlace, public.eventos_sala,
              public.muestras_calidad, public.calidad_host_resumen, public.cuentas_parsec from anon, authenticated;
grant select on public.dispositivos_host, public.salas, public.salas_enlace, public.eventos_sala,
                public.muestras_calidad, public.calidad_host_resumen, public.cuentas_parsec to authenticated;

-- ─── 8) RPC de la web ───────────────────────────────────────────────────────────────────────────────────────────────────
-- 8.1 Generar código de 6 dígitos (10 min). Anula los anteriores sin usar. Máx. 6 por hora.
create or replace function public.generar_codigo_emparejamiento() returns jsonb
language plpgsql security definer set search_path = '' as $$
declare yo uuid := private.uid_requerido(); codigo text; vence timestamptz := now() + interval '10 minutes';
begin
  if not private.puede_abrir_salas(yo) then raise exception 'Tu cuenta aún no está aprobada como host por el staff.' using errcode = '42501'; end if;
  if (select count(*) from public.codigos_emparejamiento where usuario = yo and creado > now() - interval '1 hour') >= 6 then
    raise exception 'Generaste muchos códigos: espera un rato.' using errcode = 'P0001';
  end if;
  update public.codigos_emparejamiento set expira = now() where usuario = yo and usado is null and expira > now();
  loop
    codigo := lpad((('x' || encode(extensions.gen_random_bytes(4), 'hex'))::bit(32)::bigint % 1000000)::text, 6, '0');
    begin
      insert into public.codigos_emparejamiento (usuario, codigo_huella, expira)
      values (yo, encode(extensions.digest(codigo, 'sha256'), 'hex'), vence);
      exit;
    exception when unique_violation then null;   -- choque improbable con un código viejo: se genera otro
    end;
  end loop;
  return jsonb_build_object('codigo', codigo, 'expira', vence);
end $$;

-- 8.2 Revocar un dispositivo (el dueño o staff). Cierra su sala viva.
create or replace function public.revocar_dispositivo(p_dispositivo uuid) returns void
language plpgsql security definer set search_path = '' as $$
declare yo uuid := private.uid_requerido(); d public.dispositivos_host%rowtype;
begin
  select * into d from public.dispositivos_host where id = p_dispositivo;
  if not found or (d.usuario <> yo and not private.es_staff()) then raise exception 'Dispositivo no encontrado.' using errcode = 'P0002'; end if;
  update public.dispositivos_host set revocado = coalesce(revocado, now()) where id = p_dispositivo;
  update public.salas set estado = 'cerrada', cerrada_en = now() where dispositivo = p_dispositivo and estado in ('preparando', 'abierta', 'en_partida');
  if d.usuario <> yo then
    perform private.auditar_moderacion('revocar_dispositivo', 'dispositivos_host', p_dispositivo::text, d.nombre, null, null);
  end if;
end $$;

-- 8.3 Renombrar un dispositivo propio.
create or replace function public.renombrar_dispositivo(p_dispositivo uuid, p_nombre text) returns void
language plpgsql security definer set search_path = '' as $$
declare yo uuid := private.uid_requerido();
begin
  update public.dispositivos_host set nombre = left(btrim(p_nombre), 40)
  where id = p_dispositivo and usuario = yo and revocado is null and char_length(btrim(p_nombre)) > 0;
  if not found then raise exception 'Dispositivo no encontrado.' using errcode = 'P0002'; end if;
end $$;

-- 8.4 Declarar / quitar mi cuenta Parsec.
create or replace function public.vincular_parsec(p_parsec_id text, p_nombre text default null) returns text
language plpgsql security definer set search_path = '' as $$
declare yo uuid := private.uid_requerido(); pid text := btrim(coalesce(p_parsec_id, ''));
begin
  if pid !~ '^[0-9]{1,20}$' then raise exception 'El ID de Parsec son solo números.' using errcode = '22023'; end if;
  if exists (select 1 from public.cuentas_parsec where parsec_id = pid and usuario <> yo) then
    raise exception 'Ese ID de Parsec ya está vinculado a otro jugador. Si es tuyo, avisa al staff.' using errcode = '23505';
  end if;
  insert into public.cuentas_parsec (usuario, parsec_id, nombre_parsec) values (yo, pid, left(btrim(p_nombre), 60))
  on conflict (usuario) do update set
    parsec_id = excluded.parsec_id, nombre_parsec = excluded.nombre_parsec,
    estado = case when public.cuentas_parsec.parsec_id = excluded.parsec_id then public.cuentas_parsec.estado else 'declarada' end,
    verificada_en = case when public.cuentas_parsec.parsec_id = excluded.parsec_id then public.cuentas_parsec.verificada_en end,
    declarada_en = now();
  return (select estado from public.cuentas_parsec where usuario = yo);
end $$;

create or replace function public.desvincular_parsec() returns void
language plpgsql security definer set search_path = '' as $$
begin delete from public.cuentas_parsec where usuario = private.uid_requerido(); end $$;

-- 8.5 El host ajusta visibilidad y límite de espectadores de su sala viva.
create or replace function public.configurar_sala(p_sala uuid, p_visibilidad text default null, p_limite smallint default null) returns void
language plpgsql security definer set search_path = '' as $$
declare yo uuid := private.uid_requerido();
begin
  if p_visibilidad is not null and p_visibilidad not in ('publica', 'amigos', 'privada') then
    raise exception 'Visibilidad no válida.' using errcode = '22023';   -- «torneo» solo la pone el sistema
  end if;
  update public.salas set visibilidad = coalesce(p_visibilidad, visibilidad), limite_espectadores = coalesce(p_limite, limite_espectadores)
  where id = p_sala and (host = yo or private.es_staff()) and estado in ('preparando', 'abierta', 'en_partida') and visibilidad <> 'torneo';
  if not found then raise exception 'Sala no encontrada o ya cerrada.' using errcode = 'P0002'; end if;
end $$;

-- 8.6 Staff: aprobar / quitar host, cerrar una sala, resolver una cuenta Parsec en disputa.
create or replace function public.staff_aprobar_host(p_usuario uuid, p_aprobado boolean, p_motivo text default null) returns void
language plpgsql security definer set search_path = '' as $$
begin
  perform private.uid_requerido();
  if not private.es_staff() then raise exception 'Solo staff.' using errcode = '42501'; end if;
  update public.perfiles set host_aprobado = p_aprobado where id = p_usuario;
  if not found then raise exception 'Usuario no encontrado.' using errcode = 'P0002'; end if;
  if not p_aprobado then
    update public.salas set estado = 'cerrada', cerrada_en = now() where host = p_usuario and estado in ('preparando', 'abierta', 'en_partida');
  end if;
  perform private.auditar_moderacion(case when p_aprobado then 'aprobar_host' else 'quitar_host' end, 'perfiles', p_usuario::text,
                                     private.nombre(p_usuario), jsonb_build_object('host_aprobado', p_aprobado), p_motivo);
  perform private.notificar(p_usuario, 'MODERACION',
    case when p_aprobado then 'Ya puedes abrir salas' else 'Permiso de host retirado' end,
    case when p_aprobado then 'El staff aprobó tu cuenta como host. Vincula tu PC desde tu perfil.' else coalesce(p_motivo, 'El staff retiró tu permiso para abrir salas.') end);
end $$;

create or replace function public.staff_cerrar_sala(p_sala uuid, p_motivo text default null) returns void
language plpgsql security definer set search_path = '' as $$
begin
  perform private.uid_requerido();
  if not private.es_staff() then raise exception 'Solo staff.' using errcode = '42501'; end if;
  update public.salas set estado = 'cerrada', cerrada_en = now() where id = p_sala and estado in ('preparando', 'abierta', 'en_partida');
  if not found then raise exception 'Sala no encontrada o ya cerrada.' using errcode = 'P0002'; end if;
  perform private.auditar_moderacion('cerrar_sala', 'salas', p_sala::text, 'Sala cerrada por staff', null, p_motivo);
end $$;

create or replace function public.staff_quitar_parsec(p_usuario uuid, p_motivo text default null) returns void
language plpgsql security definer set search_path = '' as $$
begin
  perform private.uid_requerido();
  if not private.es_staff() then raise exception 'Solo staff.' using errcode = '42501'; end if;
  delete from public.cuentas_parsec where usuario = p_usuario;
  perform private.auditar_moderacion('quitar_parsec', 'cuentas_parsec', p_usuario::text, private.nombre(p_usuario), null, p_motivo);
end $$;

revoke all on function public.generar_codigo_emparejamiento(), public.revocar_dispositivo(uuid), public.renombrar_dispositivo(uuid, text),
  public.vincular_parsec(text, text), public.desvincular_parsec(), public.configurar_sala(uuid, text, smallint),
  public.staff_aprobar_host(uuid, boolean, text), public.staff_cerrar_sala(uuid, text), public.staff_quitar_parsec(uuid, text)
  from public, anon;
grant execute on function public.generar_codigo_emparejamiento(), public.revocar_dispositivo(uuid), public.renombrar_dispositivo(uuid, text),
  public.vincular_parsec(text, text), public.desvincular_parsec(), public.configurar_sala(uuid, text, smallint),
  public.staff_aprobar_host(uuid, boolean, text), public.staff_cerrar_sala(uuid, text), public.staff_quitar_parsec(uuid, text)
  to authenticated;

-- ─── 9) Mantenimiento automático (pg_cron) ──────────────────────────────────────────────────────────────────────────────
-- 9.1 Salas caídas: sin latido 3 min → «caida» + evento en el libro. Cada minuto.
create or replace function private.marcar_salas_caidas() returns integer
language plpgsql security definer set search_path = '' as $$
declare n integer;
begin
  with caidas as (
    update public.salas set estado = 'caida', cerrada_en = now()
    where estado in ('preparando', 'abierta', 'en_partida') and latido < now() - interval '3 minutes'
    returning id, latido
  )
  insert into public.eventos_sala (sala_id, tipo, datos, ocurrido, clave_idempotencia)
  select id, 'caida', jsonb_build_object('ultimo_latido', latido), now(), 'caida-' || id::text from caidas
  on conflict (clave_idempotencia) do nothing;
  get diagnostics n = row_count;
  return n;
end $$;

-- 9.2 Purga diaria: muestras > 14 días, códigos vencidos > 1 día.
create or replace function private.purgar_salas() returns void
language plpgsql security definer set search_path = '' as $$
begin
  delete from public.muestras_calidad where tomada < now() - interval '14 days';
  delete from public.codigos_emparejamiento where expira < now() - interval '1 day';
end $$;

-- 9.3 Resumen de calidad por host/región (cada hora). Pérdida ≈ slow_rts / (fast_rts + slow_rts).
create or replace function private.resumir_calidad() returns void
language plpgsql security definer set search_path = '' as $$
begin
  insert into public.calidad_host_resumen (host, region, muestras, ping_mediana, ping_p95, perdida_pct, actualizado)
  select host, coalesce(region, ''), count(*),
         percentile_cont(0.5) within group (order by ping_ms)::integer,
         percentile_cont(0.95) within group (order by ping_ms)::integer,
         round(100.0 * sum(slow_rts) / nullif(sum(coalesce(fast_rts, 0) + coalesce(slow_rts, 0)), 0), 2),
         now()
  from public.muestras_calidad where tomada > now() - interval '14 days' and ping_ms is not null
  group by host, coalesce(region, '')
  on conflict (host, region) do update set muestras = excluded.muestras, ping_mediana = excluded.ping_mediana,
    ping_p95 = excluded.ping_p95, perdida_pct = excluded.perdida_pct, actualizado = excluded.actualizado;
  delete from public.calidad_host_resumen r
  where not exists (select 1 from public.muestras_calidad m where m.host = r.host and coalesce(m.region, '') = r.region and m.tomada > now() - interval '14 days');
end $$;

revoke all on function private.marcar_salas_caidas(), private.purgar_salas(), private.resumir_calidad() from public, anon, authenticated;

select cron.schedule('salas-caidas', '* * * * *', 'select private.marcar_salas_caidas()');
select cron.schedule('salas-purga', '17 4 * * *', 'select private.purgar_salas()');
select cron.schedule('salas-calidad', '7 * * * *', 'select private.resumir_calidad()');

-- ─── 10) Tiempo real: la web escucha cambios en salas (RLS se aplica también a Realtime) ────────────────────────────────
do $$ begin
  if not exists (select 1 from pg_publication_tables where pubname = 'supabase_realtime' and tablename = 'salas') then
    alter publication supabase_realtime add table public.salas;
  end if;
end $$;

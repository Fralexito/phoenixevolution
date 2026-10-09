-- 097 · «Torneos propios»: cualquier usuario crea su torneo (ficha con formato y opciones libres) y lo juega con inscripciones,
-- resultados y avance automático de llaves. Casi sin límites: el staff los vigila y puede ocultar/cancelar o apretar los topes
-- desde torneos_libres_config. No hay borrados duros (retirado / oculto / cancelado) para que el staff conserve la evidencia.
-- Aplicada por partes (A tablas, B permisos, C ayudas, D funciones de jugadores, E funciones de partidos, F staff).

-- ── A) Tablas ─────────────────────────────────────────────────────────────────────────────────────────────────────────
create table if not exists public.torneos_libres_config (
  id int primary key default 1 check (id = 1),
  habilitado boolean not null default true,
  max_activos_por_usuario int not null default 50 check (max_activos_por_usuario >= 0),
  max_jugadores int not null default 256 check (max_jugadores between 2 and 2048),
  actualizado_en timestamptz not null default now()
);
insert into public.torneos_libres_config (id) values (1) on conflict do nothing;

create table if not exists public.torneos_libres (
  id bigint generated always as identity primary key,
  creador uuid not null references public.perfiles (id) on delete cascade,
  nombre text not null check (char_length(btrim(nombre)) between 3 and 80),
  descripcion text check (descripcion is null or char_length(descripcion) <= 2000),
  formato text not null check (formato in ('eliminacion', 'doble', 'liguilla', 'idavuelta', 'grupos', 'suizo', 'colina', 'escalera', 'circuito', 'libre')),
  config jsonb not null default '{}'::jsonb,
  estado text not null default 'inscripcion' check (estado in ('inscripcion', 'en_curso', 'terminado', 'cancelado')),
  visibilidad text not null default 'publico' check (visibilidad in ('publico', 'enlace', 'privado')),
  inscripcion_abierta boolean not null default true,
  cupo int check (cupo is null or cupo between 2 and 2048),
  inicia timestamptz,
  meta jsonb not null default '{}'::jsonb,
  estado_juego jsonb not null default '{}'::jsonb,
  campeon text check (campeon is null or char_length(campeon) <= 60),
  oculto boolean not null default false,
  motivo_oculto text,
  creado_en timestamptz not null default now(),
  actualizado_en timestamptz not null default now()
);
create index if not exists torneos_libres_lista on public.torneos_libres (creado_en desc) where not oculto;
create index if not exists torneos_libres_creador on public.torneos_libres (creador, creado_en desc);

create table if not exists public.torneos_libres_inscritos (
  id bigint generated always as identity primary key,
  torneo_id bigint not null references public.torneos_libres (id) on delete cascade,
  usuario uuid references public.perfiles (id) on delete set null,
  nombre text not null check (char_length(btrim(nombre)) between 1 and 40),
  semilla int,
  retirado boolean not null default false,
  creado_en timestamptz not null default now()
);
create unique index if not exists torneos_libres_insc_nombre on public.torneos_libres_inscritos (torneo_id, lower(nombre)) where not retirado;
create unique index if not exists torneos_libres_insc_usuario on public.torneos_libres_inscritos (torneo_id, usuario) where usuario is not null and not retirado;
create index if not exists torneos_libres_insc_usuario_idx on public.torneos_libres_inscritos (usuario) where usuario is not null;

create table if not exists public.torneos_libres_partidos (
  id bigint generated always as identity primary key,
  torneo_id bigint not null references public.torneos_libres (id) on delete cascade,
  clave text not null check (char_length(clave) between 1 and 40),
  ronda text not null default '' check (char_length(ronda) <= 60),
  grupo text check (grupo is null or char_length(grupo) <= 20),
  orden int not null default 0,
  a_slot jsonb,
  b_slot jsonb,
  a_nombre text,
  b_nombre text,
  ga int check (ga is null or ga between 0 and 999),
  gb int check (gb is null or gb between 0 and 999),
  ganador text check (ganador in ('a', 'b')),
  jugado boolean not null default false,
  eliminatoria boolean not null default false,
  jugado_en timestamptz,
  reportado_por uuid references public.perfiles (id) on delete set null,
  unique (torneo_id, clave)
);
create index if not exists torneos_libres_partidos_torneo on public.torneos_libres_partidos (torneo_id, orden);

create table if not exists public.torneos_libres_eventos (
  id bigint generated always as identity primary key,
  torneo_id bigint not null references public.torneos_libres (id) on delete cascade,
  usuario uuid references public.perfiles (id) on delete set null,
  tipo text not null,
  detalle jsonb not null default '{}'::jsonb,
  creado_en timestamptz not null default now()
);
create index if not exists torneos_libres_eventos_torneo on public.torneos_libres_eventos (torneo_id, creado_en desc);

-- ── B) Permisos: se lee con RLS; se escribe solo por las funciones ───────────────────────────────────────────────────
alter table public.torneos_libres_config enable row level security;
alter table public.torneos_libres enable row level security;
alter table public.torneos_libres_inscritos enable row level security;
alter table public.torneos_libres_partidos enable row level security;
alter table public.torneos_libres_eventos enable row level security;

create or replace function private.tl_inscrito(p_id bigint) returns boolean
language sql stable security definer set search_path = '' as $$
  select exists (select 1 from public.torneos_libres_inscritos i where i.torneo_id = p_id and i.usuario = (select auth.uid()) and not i.retirado);
$$;
revoke all on function private.tl_inscrito(bigint) from public;
grant execute on function private.tl_inscrito(bigint) to anon, authenticated;

create policy torneos_libres_config_lee on public.torneos_libres_config for select to anon, authenticated using (true);
create policy torneos_libres_lee on public.torneos_libres for select to anon, authenticated
  using (
    (not oculto and visibilidad <> 'privado')
    or creador = (select auth.uid())
    or private.es_staff()
    or private.tl_inscrito(id)
  );
create policy torneos_libres_insc_lee on public.torneos_libres_inscritos for select to anon, authenticated
  using (exists (select 1 from public.torneos_libres t where t.id = torneo_id));
create policy torneos_libres_partidos_lee on public.torneos_libres_partidos for select to anon, authenticated
  using (exists (select 1 from public.torneos_libres t where t.id = torneo_id));
create policy torneos_libres_eventos_lee on public.torneos_libres_eventos for select to authenticated
  using (private.es_staff() or exists (select 1 from public.torneos_libres t where t.id = torneo_id and t.creador = (select auth.uid())));

revoke all on public.torneos_libres_config, public.torneos_libres, public.torneos_libres_inscritos, public.torneos_libres_partidos, public.torneos_libres_eventos from anon, authenticated;
grant select on public.torneos_libres_config, public.torneos_libres, public.torneos_libres_inscritos, public.torneos_libres_partidos to anon, authenticated;
grant select on public.torneos_libres_eventos to authenticated;

-- ── C) Ayudas internas ───────────────────────────────────────────────────────────────────────────────────────────────
create or replace function private.tl_gestiona(p_id bigint) returns boolean
language sql stable security definer set search_path = '' as $$
  select exists (select 1 from public.torneos_libres t where t.id = p_id and t.creador = (select auth.uid())) or private.es_moderador();
$$;

create or replace function private.tl_evento(p_id bigint, p_tipo text, p_detalle jsonb) returns void
language sql security definer set search_path = '' as $$
  insert into public.torneos_libres_eventos (torneo_id, usuario, tipo, detalle) values (p_id, (select auth.uid()), p_tipo, coalesce(p_detalle, '{}'::jsonb));
$$;

create or replace function private.tl_nombre_de(p_id bigint, p_slot jsonb) returns text
language plpgsql stable security definer set search_path = '' as $$
declare v_ref text := coalesce(p_slot ->> 'ganadorDe', p_slot ->> 'perdedorDe'); v_p public.torneos_libres_partidos;
begin
  if v_ref is null then return null; end if;
  select * into v_p from public.torneos_libres_partidos where torneo_id = p_id and clave = v_ref;
  if not found or not v_p.jugado or v_p.ganador is null then return null; end if;
  if p_slot ? 'ganadorDe' then return case v_p.ganador when 'a' then v_p.a_nombre else v_p.b_nombre end; end if;
  return case v_p.ganador when 'a' then v_p.b_nombre else v_p.a_nombre end;
end $$;

create or replace function private.tl_propagar(p_id bigint) returns void
language plpgsql security definer set search_path = '' as $$
declare r public.torneos_libres_partidos; v_nom text; v_cambio boolean := true; v_vueltas int := 0;
begin
  while v_cambio and v_vueltas < 40 loop
    v_cambio := false; v_vueltas := v_vueltas + 1;
    for r in select * from public.torneos_libres_partidos where torneo_id = p_id and (jsonb_typeof(a_slot) = 'object' or jsonb_typeof(b_slot) = 'object') loop
      if jsonb_typeof(r.a_slot) = 'object' and (r.a_slot ? 'ganadorDe' or r.a_slot ? 'perdedorDe') then
        v_nom := private.tl_nombre_de(p_id, r.a_slot);
        if v_nom is distinct from r.a_nombre then update public.torneos_libres_partidos set a_nombre = v_nom where id = r.id; v_cambio := true; end if;
      end if;
      if jsonb_typeof(r.b_slot) = 'object' and (r.b_slot ? 'ganadorDe' or r.b_slot ? 'perdedorDe') then
        v_nom := private.tl_nombre_de(p_id, r.b_slot);
        if v_nom is distinct from r.b_nombre then update public.torneos_libres_partidos set b_nombre = v_nom where id = r.id; v_cambio := true; end if;
      end if;
    end loop;
  end loop;
end $$;

create or replace function private.tl_insertar_partidos(p_id bigint, p_partidos jsonb) returns int
language plpgsql security definer set search_path = '' as $$
declare e jsonb; v_n int := 0; v_fila int; v_a jsonb; v_b jsonb;
begin
  if p_partidos is null or jsonb_typeof(p_partidos) <> 'array' then raise exception 'PARTIDOS_INVALIDOS'; end if;
  if jsonb_array_length(p_partidos) > 2000 then raise exception 'PARTIDOS_INVALIDOS: demasiados'; end if;
  for e in select value from jsonb_array_elements(p_partidos) loop
    v_a := case when jsonb_typeof(e -> 'a') in ('string', 'object') then e -> 'a' else null end;
    v_b := case when jsonb_typeof(e -> 'b') in ('string', 'object') then e -> 'b' else null end;
    insert into public.torneos_libres_partidos (torneo_id, clave, ronda, grupo, orden, a_slot, b_slot, a_nombre, b_nombre, eliminatoria)
    values (p_id, left(e ->> 'clave', 40), left(coalesce(e ->> 'ronda', ''), 60), left(e ->> 'grupo', 20), coalesce((e ->> 'orden')::int, 0), v_a, v_b,
      case when jsonb_typeof(v_a) = 'string' then left(v_a #>> '{}', 60) end, case when jsonb_typeof(v_b) = 'string' then left(v_b #>> '{}', 60) end,
      coalesce((e ->> 'eliminatoria')::boolean, false))
    on conflict (torneo_id, clave) do nothing;
    get diagnostics v_fila = row_count; v_n := v_n + v_fila;
  end loop;
  return v_n;
end $$;

revoke all on function private.tl_gestiona(bigint), private.tl_evento(bigint, text, jsonb), private.tl_nombre_de(bigint, jsonb), private.tl_propagar(bigint), private.tl_insertar_partidos(bigint, jsonb) from public, anon;
grant execute on function private.tl_gestiona(bigint) to authenticated, anon;
grant usage on schema private to anon, authenticated;

-- ── D) Crear, editar y jugadores ─────────────────────────────────────────────────────────────────────────────────────
create or replace function public.torneo_crear(p_nombre text, p_formato text, p_config jsonb default '{}'::jsonb, p_descripcion text default null,
  p_visibilidad text default 'publico', p_cupo int default null, p_inicia timestamptz default null, p_juega boolean default true) returns bigint
language plpgsql security definer set search_path = '' as $$
declare v_uid uuid := auth.uid(); v_cfg public.torneos_libres_config; v_id bigint; v_nom text;
begin
  if v_uid is null then raise exception 'NO_AUTORIZADO'; end if;
  if private.esta_sancionado(v_uid) then raise exception 'CUENTA_SANCIONADA'; end if;
  select * into v_cfg from public.torneos_libres_config where id = 1;
  if not v_cfg.habilitado and not private.es_moderador() then raise exception 'TORNEOS_PAUSADOS: el staff pausó la creación de torneos'; end if;
  if (select count(*) from public.torneos_libres where creador = v_uid and estado in ('inscripcion', 'en_curso') and not oculto) >= v_cfg.max_activos_por_usuario and not private.es_moderador() then
    raise exception 'DEMASIADOS_TORNEOS: ya tienes % torneos activos', v_cfg.max_activos_por_usuario;
  end if;
  if p_cupo is not null and p_cupo > v_cfg.max_jugadores then raise exception 'CUPO_INVALIDO: máximo %', v_cfg.max_jugadores; end if;
  if jsonb_typeof(coalesce(p_config, '{}'::jsonb)) <> 'object' or octet_length(coalesce(p_config, '{}'::jsonb)::text) > 20000 then raise exception 'CONFIG_INVALIDA'; end if;
  insert into public.torneos_libres (creador, nombre, descripcion, formato, config, visibilidad, cupo, inicia)
  values (v_uid, btrim(p_nombre), nullif(btrim(coalesce(p_descripcion, '')), ''), p_formato, coalesce(p_config, '{}'::jsonb), coalesce(p_visibilidad, 'publico'), p_cupo, p_inicia)
  returning id into v_id;
  if p_juega then
    select coalesce(nombre_display, username, 'Jugador') into v_nom from public.perfiles where id = v_uid;
    insert into public.torneos_libres_inscritos (torneo_id, usuario, nombre) values (v_id, v_uid, left(v_nom, 40));
  end if;
  perform private.tl_evento(v_id, 'crear', jsonb_build_object('formato', p_formato));
  return v_id;
end $$;

create or replace function public.torneo_editar(p_id bigint, p_nombre text, p_descripcion text, p_config jsonb, p_visibilidad text, p_cupo int, p_inscripcion_abierta boolean, p_inicia timestamptz default null) returns void
language plpgsql security definer set search_path = '' as $$
declare v_max int;
begin
  if (select auth.uid()) is null or not private.tl_gestiona(p_id) then raise exception 'NO_AUTORIZADO'; end if;
  select max_jugadores into v_max from public.torneos_libres_config where id = 1;
  if p_cupo is not null and p_cupo > v_max then raise exception 'CUPO_INVALIDO: máximo %', v_max; end if;
  if jsonb_typeof(coalesce(p_config, '{}'::jsonb)) <> 'object' or octet_length(coalesce(p_config, '{}'::jsonb)::text) > 20000 then raise exception 'CONFIG_INVALIDA'; end if;
  update public.torneos_libres set nombre = btrim(p_nombre), descripcion = nullif(btrim(coalesce(p_descripcion, '')), ''), config = coalesce(p_config, config),
    visibilidad = coalesce(p_visibilidad, visibilidad), cupo = p_cupo, inscripcion_abierta = coalesce(p_inscripcion_abierta, inscripcion_abierta), inicia = p_inicia, actualizado_en = now()
  where id = p_id and estado in ('inscripcion', 'en_curso');
  if not found then raise exception 'TORNEO_NO_EDITABLE'; end if;
  perform private.tl_evento(p_id, 'editar', '{}'::jsonb);
end $$;

create or replace function public.torneo_inscribirse(p_id bigint) returns void
language plpgsql security definer set search_path = '' as $$
declare v_uid uuid := auth.uid(); v_t public.torneos_libres; v_nom text; v_cupo int; v_n int;
begin
  if v_uid is null then raise exception 'NO_AUTORIZADO'; end if;
  if private.esta_sancionado(v_uid) then raise exception 'CUENTA_SANCIONADA'; end if;
  select * into v_t from public.torneos_libres where id = p_id;
  if not found or v_t.oculto then raise exception 'TORNEO_NO_ENCONTRADO'; end if;
  if v_t.estado <> 'inscripcion' or not v_t.inscripcion_abierta then raise exception 'INSCRIPCION_CERRADA'; end if;
  v_cupo := coalesce(v_t.cupo, (select max_jugadores from public.torneos_libres_config where id = 1));
  select count(*) into v_n from public.torneos_libres_inscritos where torneo_id = p_id and not retirado;
  if v_n >= v_cupo then raise exception 'TORNEO_LLENO'; end if;
  if exists (select 1 from public.torneos_libres_inscritos where torneo_id = p_id and usuario = v_uid and not retirado) then raise exception 'YA_INSCRITO'; end if;
  select coalesce(nombre_display, username, 'Jugador') into v_nom from public.perfiles where id = v_uid;
  insert into public.torneos_libres_inscritos (torneo_id, usuario, nombre) values (p_id, v_uid, left(v_nom, 40));
  perform private.tl_evento(p_id, 'inscribirse', jsonb_build_object('nombre', v_nom));
end $$;

create or replace function public.torneo_salir(p_id bigint) returns void
language plpgsql security definer set search_path = '' as $$
declare v_uid uuid := auth.uid();
begin
  if v_uid is null then raise exception 'NO_AUTORIZADO'; end if;
  if not exists (select 1 from public.torneos_libres where id = p_id and estado = 'inscripcion') then raise exception 'TORNEO_YA_EMPEZO'; end if;
  update public.torneos_libres_inscritos set retirado = true where torneo_id = p_id and usuario = v_uid and not retirado;
  perform private.tl_evento(p_id, 'salir', '{}'::jsonb);
end $$;

create or replace function public.torneo_agregar_jugador(p_id bigint, p_nombre text, p_usuario uuid default null) returns void
language plpgsql security definer set search_path = '' as $$
declare v_nom text := left(btrim(coalesce(p_nombre, '')), 40); v_t public.torneos_libres;
begin
  if (select auth.uid()) is null or not private.tl_gestiona(p_id) then raise exception 'NO_AUTORIZADO'; end if;
  select * into v_t from public.torneos_libres where id = p_id;
  if not found or v_t.estado <> 'inscripcion' then raise exception 'TORNEO_YA_EMPEZO'; end if;
  if char_length(v_nom) < 1 then raise exception 'NOMBRE_INVALIDO'; end if;
  if (select count(*) from public.torneos_libres_inscritos where torneo_id = p_id and not retirado) >= coalesce(v_t.cupo, (select max_jugadores from public.torneos_libres_config where id = 1)) then raise exception 'TORNEO_LLENO'; end if;
  insert into public.torneos_libres_inscritos (torneo_id, usuario, nombre) values (p_id, p_usuario, v_nom);
  perform private.tl_evento(p_id, 'agregar_jugador', jsonb_build_object('nombre', v_nom));
end $$;

create or replace function public.torneo_quitar_jugador(p_id bigint, p_inscrito bigint) returns void
language plpgsql security definer set search_path = '' as $$
begin
  if (select auth.uid()) is null or not private.tl_gestiona(p_id) then raise exception 'NO_AUTORIZADO'; end if;
  if not exists (select 1 from public.torneos_libres where id = p_id and estado = 'inscripcion') then raise exception 'TORNEO_YA_EMPEZO'; end if;
  update public.torneos_libres_inscritos set retirado = true where id = p_inscrito and torneo_id = p_id;
  perform private.tl_evento(p_id, 'quitar_jugador', jsonb_build_object('inscrito', p_inscrito));
end $$;

-- ── E) Partidos: iniciar, resultado, cruces, estado de juego, cerrar ────────────────────────────────────────────────
create or replace function public.torneo_iniciar(p_id bigint, p_partidos jsonb default '[]'::jsonb, p_meta jsonb default '{}'::jsonb, p_estado jsonb default '{}'::jsonb) returns int
language plpgsql security definer set search_path = '' as $$
declare v_n int;
begin
  if (select auth.uid()) is null or not private.tl_gestiona(p_id) then raise exception 'NO_AUTORIZADO'; end if;
  if not exists (select 1 from public.torneos_libres where id = p_id and estado = 'inscripcion') then raise exception 'TORNEO_YA_EMPEZO'; end if;
  if (select count(*) from public.torneos_libres_inscritos where torneo_id = p_id and not retirado) < 2 then raise exception 'FALTAN_JUGADORES: mínimo 2'; end if;
  if octet_length(coalesce(p_meta, '{}'::jsonb)::text) > 200000 or octet_length(coalesce(p_estado, '{}'::jsonb)::text) > 200000 then raise exception 'ESTADO_GRANDE'; end if;
  v_n := private.tl_insertar_partidos(p_id, p_partidos);
  update public.torneos_libres set estado = 'en_curso', inscripcion_abierta = false, meta = coalesce(p_meta, '{}'::jsonb), estado_juego = coalesce(p_estado, '{}'::jsonb), actualizado_en = now() where id = p_id;
  perform private.tl_propagar(p_id);
  perform private.tl_evento(p_id, 'iniciar', jsonb_build_object('partidos', v_n));
  return v_n;
end $$;

create or replace function public.torneo_agregar_partidos(p_id bigint, p_partidos jsonb) returns int
language plpgsql security definer set search_path = '' as $$
declare v_n int;
begin
  if (select auth.uid()) is null or not private.tl_gestiona(p_id) then raise exception 'NO_AUTORIZADO'; end if;
  if not exists (select 1 from public.torneos_libres where id = p_id and estado = 'en_curso') then raise exception 'TORNEO_NO_EN_CURSO'; end if;
  v_n := private.tl_insertar_partidos(p_id, p_partidos);
  perform private.tl_propagar(p_id);
  perform private.tl_evento(p_id, 'agregar_partidos', jsonb_build_object('partidos', v_n));
  return v_n;
end $$;

create or replace function public.torneo_fijar_cruces(p_id bigint, p_cruces jsonb) returns int
language plpgsql security definer set search_path = '' as $$
declare e jsonb; v_n int := 0; v_fila int;
begin
  if (select auth.uid()) is null or not private.tl_gestiona(p_id) then raise exception 'NO_AUTORIZADO'; end if;
  if jsonb_typeof(p_cruces) <> 'array' then raise exception 'CRUCES_INVALIDOS'; end if;
  for e in select value from jsonb_array_elements(p_cruces) loop
    update public.torneos_libres_partidos set a_nombre = left(e ->> 'a', 60), b_nombre = left(e ->> 'b', 60)
    where torneo_id = p_id and clave = e ->> 'clave' and not jugado;
    get diagnostics v_fila = row_count; v_n := v_n + v_fila;
  end loop;
  perform private.tl_propagar(p_id);
  perform private.tl_evento(p_id, 'fijar_cruces', jsonb_build_object('cruces', v_n));
  return v_n;
end $$;

create or replace function public.torneo_resultado(p_id bigint, p_clave text, p_ga int, p_gb int, p_ganador text default null) returns void
language plpgsql security definer set search_path = '' as $$
declare v_uid uuid := auth.uid(); v_t public.torneos_libres; v_p public.torneos_libres_partidos; v_g text; v_ok boolean;
begin
  if v_uid is null then raise exception 'NO_AUTORIZADO'; end if;
  select * into v_t from public.torneos_libres where id = p_id;
  if not found then raise exception 'TORNEO_NO_ENCONTRADO'; end if;
  if v_t.estado <> 'en_curso' then raise exception 'TORNEO_NO_EN_CURSO'; end if;
  select * into v_p from public.torneos_libres_partidos where torneo_id = p_id and clave = p_clave for update;
  if not found then raise exception 'PARTIDO_NO_ENCONTRADO'; end if;
  if v_p.a_nombre is null or v_p.b_nombre is null then raise exception 'CRUCE_SIN_DEFINIR'; end if;
  v_ok := private.tl_gestiona(p_id);
  if not v_ok and coalesce((v_t.config ->> 'reportan_jugadores')::boolean, true) then
    v_ok := exists (select 1 from public.torneos_libres_inscritos i where i.torneo_id = p_id and not i.retirado and i.usuario = v_uid and lower(i.nombre) in (lower(v_p.a_nombre), lower(v_p.b_nombre)));
  end if;
  if not v_ok then raise exception 'NO_AUTORIZADO'; end if;
  if p_ga is null or p_gb is null or p_ga < 0 or p_gb < 0 or p_ga > 999 or p_gb > 999 then raise exception 'MARCADOR_INVALIDO'; end if;
  if p_ga > p_gb then v_g := 'a'; elsif p_gb > p_ga then v_g := 'b';
  elsif v_p.eliminatoria then
    if p_ganador in ('a', 'b') then v_g := p_ganador; else raise exception 'EMPATE_SIN_GANADOR: en eliminatoria elige quién pasa'; end if;
  else v_g := null; end if;
  if v_p.jugado and v_g is distinct from v_p.ganador and exists (
    select 1 from public.torneos_libres_partidos d where d.torneo_id = p_id and d.jugado
      and (d.a_slot ->> 'ganadorDe' = p_clave or d.a_slot ->> 'perdedorDe' = p_clave or d.b_slot ->> 'ganadorDe' = p_clave or d.b_slot ->> 'perdedorDe' = p_clave)
  ) then raise exception 'YA_AVANZO: el siguiente partido ya se jugó; corrígelo primero'; end if;
  update public.torneos_libres_partidos set ga = p_ga, gb = p_gb, ganador = v_g, jugado = true, jugado_en = now(), reportado_por = v_uid where id = v_p.id;
  perform private.tl_propagar(p_id);
  perform private.tl_evento(p_id, 'resultado', jsonb_build_object('clave', p_clave, 'ga', p_ga, 'gb', p_gb, 'ganador', v_g));
end $$;

create or replace function public.torneo_resultado_quitar(p_id bigint, p_clave text) returns void
language plpgsql security definer set search_path = '' as $$
declare v_p public.torneos_libres_partidos;
begin
  if (select auth.uid()) is null or not private.tl_gestiona(p_id) then raise exception 'NO_AUTORIZADO'; end if;
  select * into v_p from public.torneos_libres_partidos where torneo_id = p_id and clave = p_clave for update;
  if not found then raise exception 'PARTIDO_NO_ENCONTRADO'; end if;
  if exists (
    select 1 from public.torneos_libres_partidos d where d.torneo_id = p_id and d.jugado
      and (d.a_slot ->> 'ganadorDe' = p_clave or d.a_slot ->> 'perdedorDe' = p_clave or d.b_slot ->> 'ganadorDe' = p_clave or d.b_slot ->> 'perdedorDe' = p_clave)
  ) then raise exception 'YA_AVANZO: el siguiente partido ya se jugó; corrígelo primero'; end if;
  update public.torneos_libres_partidos set ga = null, gb = null, ganador = null, jugado = false, jugado_en = null, reportado_por = null where id = v_p.id;
  perform private.tl_propagar(p_id);
  perform private.tl_evento(p_id, 'resultado_quitar', jsonb_build_object('clave', p_clave));
end $$;

create or replace function public.torneo_estado_guardar(p_id bigint, p_estado jsonb, p_detalle text default null) returns void
language plpgsql security definer set search_path = '' as $$
declare v_uid uuid := auth.uid(); v_t public.torneos_libres; v_ok boolean;
begin
  if v_uid is null then raise exception 'NO_AUTORIZADO'; end if;
  select * into v_t from public.torneos_libres where id = p_id;
  if not found or v_t.estado <> 'en_curso' then raise exception 'TORNEO_NO_EN_CURSO'; end if;
  if p_estado is null or jsonb_typeof(p_estado) <> 'object' or octet_length(p_estado::text) > 200000 then raise exception 'ESTADO_INVALIDO'; end if;
  v_ok := private.tl_gestiona(p_id);
  if not v_ok and v_t.formato in ('escalera', 'colina') and coalesce((v_t.config ->> 'reportan_jugadores')::boolean, true) then
    v_ok := exists (select 1 from public.torneos_libres_inscritos i where i.torneo_id = p_id and i.usuario = v_uid and not i.retirado);
  end if;
  if not v_ok then raise exception 'NO_AUTORIZADO'; end if;
  update public.torneos_libres set estado_juego = p_estado, actualizado_en = now() where id = p_id;
  perform private.tl_evento(p_id, 'estado', jsonb_build_object('detalle', left(coalesce(p_detalle, ''), 200)));
end $$;

create or replace function public.torneo_cerrar(p_id bigint, p_campeon text default null) returns void
language plpgsql security definer set search_path = '' as $$
begin
  if (select auth.uid()) is null or not private.tl_gestiona(p_id) then raise exception 'NO_AUTORIZADO'; end if;
  update public.torneos_libres set estado = 'terminado', campeon = nullif(left(btrim(coalesce(p_campeon, '')), 60), ''), inscripcion_abierta = false, actualizado_en = now() where id = p_id and estado = 'en_curso';
  if not found then raise exception 'TORNEO_NO_EN_CURSO'; end if;
  perform private.tl_evento(p_id, 'cerrar', jsonb_build_object('campeon', p_campeon));
end $$;

create or replace function public.torneo_cancelar(p_id bigint) returns void
language plpgsql security definer set search_path = '' as $$
begin
  if (select auth.uid()) is null or not private.tl_gestiona(p_id) then raise exception 'NO_AUTORIZADO'; end if;
  update public.torneos_libres set estado = 'cancelado', inscripcion_abierta = false, actualizado_en = now() where id = p_id and estado in ('inscripcion', 'en_curso');
  if not found then raise exception 'TORNEO_NO_EDITABLE'; end if;
  perform private.tl_evento(p_id, 'cancelar', '{}'::jsonb);
end $$;

-- ── F) Staff: ocultar / mostrar / cancelar y topes globales ──────────────────────────────────────────────────────────
create or replace function public.staff_torneo_moderar(p_id bigint, p_accion text, p_motivo text default null) returns void
language plpgsql security definer set search_path = '' as $$
declare v_t public.torneos_libres;
begin
  if (select auth.uid()) is null or not private.es_moderador() then raise exception 'NO_AUTORIZADO'; end if;
  select * into v_t from public.torneos_libres where id = p_id;
  if not found then raise exception 'TORNEO_NO_ENCONTRADO'; end if;
  if p_accion = 'ocultar' then update public.torneos_libres set oculto = true, motivo_oculto = left(btrim(coalesce(p_motivo, '')), 300), actualizado_en = now() where id = p_id;
  elsif p_accion = 'mostrar' then update public.torneos_libres set oculto = false, motivo_oculto = null, actualizado_en = now() where id = p_id;
  elsif p_accion = 'cancelar' then update public.torneos_libres set estado = 'cancelado', inscripcion_abierta = false, actualizado_en = now() where id = p_id;
  else raise exception 'ACCION_INVALIDA'; end if;
  perform private.auditar_moderacion('torneo_' || p_accion, 'torneos_libres', p_id::text, v_t.nombre, '{}'::jsonb, p_motivo);
  perform private.tl_evento(p_id, 'staff_' || p_accion, jsonb_build_object('motivo', p_motivo));
end $$;

create or replace function public.staff_torneos_config(p_habilitado boolean, p_max_activos int, p_max_jugadores int) returns void
language plpgsql security definer set search_path = '' as $$
begin
  if (select auth.uid()) is null or not private.es_moderador() then raise exception 'NO_AUTORIZADO'; end if;
  update public.torneos_libres_config set habilitado = coalesce(p_habilitado, habilitado), max_activos_por_usuario = coalesce(p_max_activos, max_activos_por_usuario),
    max_jugadores = coalesce(p_max_jugadores, max_jugadores), actualizado_en = now() where id = 1;
  perform private.auditar_moderacion('torneos_config', 'torneos_libres_config', '1', 'Topes de torneos propios',
    jsonb_build_object('habilitado', p_habilitado, 'max_activos', p_max_activos, 'max_jugadores', p_max_jugadores), null);
end $$;

revoke execute on function public.torneo_crear(text, text, jsonb, text, text, int, timestamptz, boolean), public.torneo_editar(bigint, text, text, jsonb, text, int, boolean, timestamptz),
  public.torneo_inscribirse(bigint), public.torneo_salir(bigint), public.torneo_agregar_jugador(bigint, text, uuid), public.torneo_quitar_jugador(bigint, bigint),
  public.torneo_iniciar(bigint, jsonb, jsonb, jsonb), public.torneo_agregar_partidos(bigint, jsonb), public.torneo_fijar_cruces(bigint, jsonb),
  public.torneo_resultado(bigint, text, int, int, text), public.torneo_resultado_quitar(bigint, text), public.torneo_estado_guardar(bigint, jsonb, text),
  public.torneo_cerrar(bigint, text), public.torneo_cancelar(bigint), public.staff_torneo_moderar(bigint, text, text), public.staff_torneos_config(boolean, int, int) from public, anon;
grant execute on function public.torneo_crear(text, text, jsonb, text, text, int, timestamptz, boolean), public.torneo_editar(bigint, text, text, jsonb, text, int, boolean, timestamptz),
  public.torneo_inscribirse(bigint), public.torneo_salir(bigint), public.torneo_agregar_jugador(bigint, text, uuid), public.torneo_quitar_jugador(bigint, bigint),
  public.torneo_iniciar(bigint, jsonb, jsonb, jsonb), public.torneo_agregar_partidos(bigint, jsonb), public.torneo_fijar_cruces(bigint, jsonb),
  public.torneo_resultado(bigint, text, int, int, text), public.torneo_resultado_quitar(bigint, text), public.torneo_estado_guardar(bigint, jsonb, text),
  public.torneo_cerrar(bigint, text), public.torneo_cancelar(bigint), public.staff_torneo_moderar(bigint, text, text), public.staff_torneos_config(boolean, int, int) to authenticated;

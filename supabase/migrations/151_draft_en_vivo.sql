-- 151 · Draft en vivo (función nueva 8/8, 25-oct-2026). Un solo motor para dos usos:
--   · Liga Máster («lm»): el staff arma el draft con los clubes; por turnos, cada DT elige un AGENTE LIBRE (lm_jugadores.club_id null)
--     y el jugador pasa a su club (queda en lm_movimientos con tipo «draft», para el option file como cualquier fichaje).
--   · Torneos («torneo»): el organizador carga una lista de equipos (p. ej. selecciones o clubes de PES) y cada inscrito elige con cuál juega.
-- Turnos: orden fijo o «serpiente» (1-2-3, 3-2-1…). Cada turno tiene un reloj; si se acaba, el sistema elige solo:
--   Liga Máster → el libre de más media (y más valor); torneo → la primera opción libre de la lista.
-- Sin cron: el reloj se revisa cada vez que alguien mira el draft (las pantallas preguntan cada pocos segundos).
-- Blindaje:
--   · Solo staff crea/arranca/pausa/cancela un draft de Liga Máster; en torneos, el creador del torneo o el staff.
--   · Solo elige quien tiene el turno; un jugador/equipo no se elige dos veces (índices únicos); el número de elección es único → no hay
--     dos picks en el mismo turno aunque dos pantallas lleguen a la vez (fila del draft bloqueada con FOR UPDATE).
--   · Liga Máster: el jugador debe seguir libre al elegirlo y el club no puede pasar del tope de plantilla (si está lleno, su turno se salta).
--   · Pausar congela el reloj (al reanudar se le devuelve el tiempo que le quedaba).
--   · Si se acaban las opciones, el draft termina solo. Tablas cerradas por RLS; todo por funciones.
alter table public.lm_movimientos drop constraint if exists lm_movimientos_tipo_check;
alter table public.lm_movimientos add constraint lm_movimientos_tipo_check check (tipo = any (array['compra', 'libre', 'liberado', 'staff', 'juego', 'draft']));

create table if not exists public.drafts (
  id bigint generated always as identity primary key,
  ambito text not null check (ambito in ('lm', 'torneo')),
  liga text references public.lm_config (liga) on delete cascade,
  torneo_id bigint references public.torneos_libres (id) on delete cascade,
  titulo text not null check (char_length(btrim(titulo)) between 3 and 80 and titulo !~ '[<>]'),
  estado text not null default 'preparando' check (estado in ('preparando', 'en_vivo', 'pausado', 'terminado', 'cancelado')),
  rondas smallint not null check (rondas between 1 and 30),
  segundos_turno smallint not null default 90 check (segundos_turno between 15 and 600),
  serpiente boolean not null default true,
  turno integer not null default 0 check (turno >= 0),
  turno_desde timestamptz,
  restante_pausa integer,
  creado_por uuid references public.perfiles (id) on delete set null,
  creado timestamptz not null default now(),
  iniciado timestamptz,
  terminado timestamptz,
  check ((ambito = 'lm' and liga is not null and torneo_id is null) or (ambito = 'torneo' and torneo_id is not null and liga is null))
);
create index if not exists drafts_vivos_idx on public.drafts (estado) where estado in ('preparando', 'en_vivo', 'pausado');
create unique index if not exists drafts_un_vivo_por_torneo on public.drafts (torneo_id) where torneo_id is not null and estado in ('preparando', 'en_vivo', 'pausado');
create unique index if not exists drafts_un_vivo_por_liga on public.drafts (liga) where liga is not null and estado in ('preparando', 'en_vivo', 'pausado');

create table if not exists public.draft_participantes (
  draft_id bigint not null references public.drafts (id) on delete cascade,
  orden smallint not null check (orden between 0 and 63),
  usuario uuid references public.perfiles (id) on delete set null,
  club_id bigint references public.lm_clubes (id) on delete cascade,
  nombre text not null check (char_length(btrim(nombre)) between 1 and 60 and nombre !~ '[<>]'),
  primary key (draft_id, orden)
);
create unique index if not exists draft_part_usuario on public.draft_participantes (draft_id, usuario) where usuario is not null;
create unique index if not exists draft_part_club on public.draft_participantes (draft_id, club_id) where club_id is not null;

create table if not exists public.draft_opciones (
  id bigint generated always as identity primary key,
  draft_id bigint not null references public.drafts (id) on delete cascade,
  nombre text not null check (char_length(btrim(nombre)) between 1 and 60 and nombre !~ '[<>]')
);
create unique index if not exists draft_opc_nombre on public.draft_opciones (draft_id, lower(nombre));

create table if not exists public.draft_picks (
  draft_id bigint not null references public.drafts (id) on delete cascade,
  n integer not null check (n >= 0),
  orden smallint not null,
  lm_jugador_id bigint references public.lm_jugadores (id) on delete set null,
  opcion_id bigint references public.draft_opciones (id) on delete set null,
  nombre text not null,
  auto boolean not null default false,
  saltado boolean not null default false,
  por uuid references public.perfiles (id) on delete set null,
  creado timestamptz not null default now(),
  primary key (draft_id, n)
);
create unique index if not exists draft_pick_lm on public.draft_picks (draft_id, lm_jugador_id) where lm_jugador_id is not null;
create unique index if not exists draft_pick_opc on public.draft_picks (draft_id, opcion_id) where opcion_id is not null;

alter table public.drafts enable row level security;
alter table public.draft_participantes enable row level security;
alter table public.draft_opciones enable row level security;
alter table public.draft_picks enable row level security;
revoke all on public.drafts, public.draft_participantes, public.draft_opciones, public.draft_picks from anon, authenticated;

-- ── Ayudantes ─────────────────────────────────────────────────────────────────────────────────────────────
create or replace function private.draft_gestor(p_uid uuid, d public.drafts) returns boolean
language sql stable security definer set search_path = '' as $$
  select p_uid is not null and (private.es_moderador()
    or (d.ambito = 'torneo' and exists (select 1 from public.torneos_libres t where t.id = d.torneo_id and t.creador = p_uid)))
$$;

-- Quién elige en la elección n (orden del participante).
create or replace function private.draft_orden_de(p_n integer, p_participantes integer, p_serpiente boolean) returns integer
language sql immutable set search_path = '' as $$
  select case when p_participantes <= 0 then null
    when p_serpiente and (p_n / p_participantes) % 2 = 1 then p_participantes - 1 - (p_n % p_participantes)
    else p_n % p_participantes end
$$;

-- Hace UNA elección (manual o automática). Devuelve false si no quedaban opciones (el draft termina).
create or replace function private.draft_elegir(d public.drafts, p_orden integer, p_lm bigint, p_opcion bigint, p_auto boolean, p_por uuid) returns boolean
language plpgsql security definer set search_path = '' as $$
declare v_part public.draft_participantes; v_nombre text; v_cfg public.lm_config; v_n integer; v_lm bigint := p_lm; v_op bigint := p_opcion;
begin
  select * into v_part from public.draft_participantes where draft_id = d.id and orden = p_orden;
  if d.ambito = 'lm' then
    select * into v_cfg from public.lm_config where liga = d.liga;
    select count(*) into v_n from public.lm_jugadores where club_id = v_part.club_id;
    if v_n >= v_cfg.max_plantilla then   -- club lleno: se salta el turno (queda anotado)
      insert into public.draft_picks (draft_id, n, orden, nombre, auto, saltado, por) values (d.id, d.turno, p_orden, 'Turno saltado: plantilla llena', true, true, p_por);
      return true;
    end if;
    if v_lm is null then
      select j.id into v_lm from public.lm_jugadores j where j.liga = d.liga and j.club_id is null
        and not exists (select 1 from public.draft_picks p where p.draft_id = d.id and p.lm_jugador_id = j.id)
        order by j.media desc nulls last, j.valor desc, j.id limit 1;
      if v_lm is null then return false; end if;
    end if;
    update public.lm_jugadores set club_id = v_part.club_id where id = v_lm and liga = d.liga and club_id is null returning nombre into v_nombre;
    if v_nombre is null then raise exception 'Ese jugador ya no está libre.' using errcode = 'P0001'; end if;
    insert into public.lm_movimientos (liga, jugador_id, de_club, a_club, monto, tipo) values (d.liga, v_lm, null, v_part.club_id, 0, 'draft');
    insert into public.draft_picks (draft_id, n, orden, lm_jugador_id, nombre, auto, por) values (d.id, d.turno, p_orden, v_lm, v_nombre, p_auto, p_por);
  else
    if v_op is null then
      select o.id into v_op from public.draft_opciones o where o.draft_id = d.id
        and not exists (select 1 from public.draft_picks p where p.draft_id = d.id and p.opcion_id = o.id) order by o.id limit 1;
      if v_op is null then return false; end if;
    end if;
    select nombre into v_nombre from public.draft_opciones where id = v_op and draft_id = d.id;
    if v_nombre is null then raise exception 'Esa opción no es de este draft.' using errcode = '22023'; end if;
    insert into public.draft_picks (draft_id, n, orden, opcion_id, nombre, auto, por) values (d.id, d.turno, p_orden, v_op, v_nombre, p_auto, p_por);
  end if;
  return true;
end $$;

-- Avanza los turnos vencidos (elección automática). Bloquea la fila del draft. Tope de vueltas = total de elecciones.
create or replace function private.draft_avanzar(p_draft bigint) returns void
language plpgsql security definer set search_path = '' as $$
declare d public.drafts; v_p integer; v_total integer; v_vueltas integer := 0; v_ok boolean;
begin
  select * into d from public.drafts where id = p_draft for update;
  if not found or d.estado <> 'en_vivo' then return; end if;
  select count(*) into v_p from public.draft_participantes where draft_id = d.id;
  v_total := v_p * d.rondas;
  while d.estado = 'en_vivo' and d.turno < v_total and d.turno_desde + make_interval(secs => d.segundos_turno) <= now() and v_vueltas < v_total loop
    v_vueltas := v_vueltas + 1;
    v_ok := private.draft_elegir(d, private.draft_orden_de(d.turno, v_p, d.serpiente), null, null, true, null);
    if not v_ok then
      update public.drafts set estado = 'terminado', terminado = now() where id = d.id; return;
    end if;
    -- el siguiente turno arranca cuando venció el anterior (no «ahora»), así varios vencidos se resuelven en cadena
    update public.drafts set turno = turno + 1, turno_desde = d.turno_desde + make_interval(secs => d.segundos_turno) where id = d.id returning * into d;
  end loop;
  if d.turno >= v_total and d.estado = 'en_vivo' then update public.drafts set estado = 'terminado', terminado = now() where id = d.id; end if;
end $$;

create or replace function private.draft_json(p_draft bigint, p_yo uuid) returns jsonb
language plpgsql stable security definer set search_path = '' as $$
declare d public.drafts; v_p integer; v_total integer; v_turno_de integer; v_mi_orden integer;
begin
  select * into d from public.drafts where id = p_draft;
  if not found then return null; end if;
  select count(*) into v_p from public.draft_participantes where draft_id = d.id;
  v_total := v_p * d.rondas;
  v_turno_de := case when d.estado in ('en_vivo', 'pausado') and d.turno < v_total then private.draft_orden_de(d.turno, v_p, d.serpiente) end;
  select orden into v_mi_orden from public.draft_participantes where draft_id = d.id and usuario = p_yo;
  return jsonb_build_object('id', d.id, 'ambito', d.ambito, 'liga', d.liga, 'torneo_id', d.torneo_id, 'titulo', d.titulo, 'estado', d.estado,
    'rondas', d.rondas, 'segundos_turno', d.segundos_turno, 'serpiente', d.serpiente, 'turno', d.turno, 'total', v_total,
    'ronda', case when v_p > 0 then d.turno / v_p + 1 end,
    'turno_de', v_turno_de, 'mi_orden', v_mi_orden, 'me_toca', v_turno_de is not null and v_turno_de = v_mi_orden and d.estado = 'en_vivo',
    'vence', case when d.estado = 'en_vivo' then d.turno_desde + make_interval(secs => d.segundos_turno) end,
    'restante_pausa', d.restante_pausa, 'ahora', now(),
    'soy_gestor', private.draft_gestor(p_yo, d),
    'participantes', (select coalesce(jsonb_agg(jsonb_build_object('orden', x.orden, 'nombre', x.nombre, 'usuario', x.usuario, 'club_id', x.club_id) order by x.orden), '[]'::jsonb)
                      from public.draft_participantes x where x.draft_id = d.id),
    'picks', (select coalesce(jsonb_agg(jsonb_build_object('n', p.n, 'orden', p.orden, 'nombre', p.nombre, 'auto', p.auto, 'saltado', p.saltado,
                'lm_jugador_id', p.lm_jugador_id, 'opcion_id', p.opcion_id) order by p.n), '[]'::jsonb) from public.draft_picks p where p.draft_id = d.id));
end $$;
revoke all on function private.draft_gestor(uuid, public.drafts), private.draft_orden_de(integer, integer, boolean),
  private.draft_elegir(public.drafts, integer, bigint, bigint, boolean, uuid), private.draft_avanzar(bigint), private.draft_json(bigint, uuid) from public, anon, authenticated;

-- ── Crear y manejar (gestor) ──────────────────────────────────────────────────────────────────────────────
-- Liga Máster: participantes = clubes aprobados con DT, en el orden que se pasa (o el de la lista si p_clubes es null).
create or replace function public.draft_crear_lm(p_titulo text, p_rondas integer, p_segundos integer default 90, p_serpiente boolean default true,
  p_clubes bigint[] default null, p_liga text default 'galaxy') returns bigint
language plpgsql security definer set search_path = '' as $$
declare v_yo uuid := private.uid_requerido(); v_id bigint; v_n integer;
begin
  if not private.es_moderador() then raise exception 'Solo el staff arma un draft de Liga Máster.' using errcode = '42501'; end if;
  if not exists (select 1 from public.lm_config where liga = p_liga) then raise exception 'Esa liga no existe.' using errcode = '22023'; end if;
  insert into public.drafts (ambito, liga, titulo, rondas, segundos_turno, serpiente, creado_por)
  values ('lm', p_liga, btrim(coalesce(p_titulo, '')), p_rondas, coalesce(p_segundos, 90), coalesce(p_serpiente, true), v_yo) returning id into v_id;
  insert into public.draft_participantes (draft_id, orden, usuario, club_id, nombre)
  select v_id, (row_number() over (order by coalesce(array_position(p_clubes, c.id), 1000), c.id) - 1)::smallint, c.dueno, c.id, left(c.nombre, 60)
    from public.lm_clubes c where c.liga = p_liga and c.aprobado and c.dueno is not null and (p_clubes is null or c.id = any (p_clubes));
  get diagnostics v_n = row_count;
  if v_n < 2 then raise exception 'Hacen falta al menos 2 clubes con DT.' using errcode = 'P0001'; end if;
  if v_n > 64 then raise exception 'Máximo 64 participantes.' using errcode = 'P0001'; end if;
  return v_id;
exception when unique_violation then raise exception 'Ya hay un draft sin terminar en esta liga.' using errcode = 'P0001';
end $$;

-- Torneo: participantes = inscritos con cuenta (orden por semilla o inscripción, o el que se pasa); opciones = lista de equipos.
create or replace function public.draft_crear_torneo(p_torneo bigint, p_titulo text, p_opciones text[], p_segundos integer default 60,
  p_serpiente boolean default false, p_orden uuid[] default null) returns bigint
language plpgsql security definer set search_path = '' as $$
declare v_yo uuid := private.uid_requerido(); t public.torneos_libres; v_id bigint; v_n integer; v_o integer;
begin
  select * into t from public.torneos_libres where id = p_torneo;
  if not found then raise exception 'Ese torneo no existe.' using errcode = 'P0001'; end if;
  if not (t.creador = v_yo or private.es_moderador()) then raise exception 'Solo el organizador del torneo (o el staff) arma su draft.' using errcode = '42501'; end if;
  if t.estado not in ('inscripcion', 'en_curso') then raise exception 'El torneo ya terminó o fue cancelado.' using errcode = 'P0001'; end if;
  insert into public.drafts (ambito, torneo_id, titulo, rondas, segundos_turno, serpiente, creado_por)
  values ('torneo', p_torneo, btrim(coalesce(p_titulo, '')), 1, coalesce(p_segundos, 60), coalesce(p_serpiente, false), v_yo) returning id into v_id;
  insert into public.draft_participantes (draft_id, orden, usuario, nombre)
  select v_id, (row_number() over (order by coalesce(array_position(p_orden, i.usuario), 1000), i.semilla nulls last, i.creado_en, i.id) - 1)::smallint, i.usuario, left(i.nombre, 60)
    from public.torneos_libres_inscritos i where i.torneo_id = p_torneo and not i.retirado and i.usuario is not null;
  get diagnostics v_n = row_count;
  if v_n < 2 then raise exception 'Hacen falta al menos 2 inscritos con cuenta.' using errcode = 'P0001'; end if;
  if v_n > 64 then raise exception 'Máximo 64 participantes.' using errcode = 'P0001'; end if;
  insert into public.draft_opciones (draft_id, nombre)
  select distinct on (lower(btrim(x))) v_id, btrim(x) from unnest(coalesce(p_opciones, '{}')) x
   where char_length(btrim(x)) between 1 and 60 and btrim(x) !~ '[<>]' order by lower(btrim(x));
  get diagnostics v_o = row_count;
  if v_o < v_n then raise exception 'Necesitas al menos tantos equipos (%) como participantes (%).', v_o, v_n using errcode = 'P0001'; end if;
  if v_o > 300 then raise exception 'Máximo 300 equipos.' using errcode = 'P0001'; end if;
  return v_id;
exception when unique_violation then raise exception 'Ya hay un draft sin terminar en este torneo.' using errcode = 'P0001';
end $$;

-- p_accion: 'iniciar' | 'pausar' | 'reanudar' | 'cancelar'
create or replace function public.draft_control(p_draft bigint, p_accion text) returns jsonb
language plpgsql security definer set search_path = '' as $$
declare v_yo uuid := private.uid_requerido(); d public.drafts; v_rest integer;
begin
  select * into d from public.drafts where id = p_draft for update;
  if not found then raise exception 'Ese draft no existe.' using errcode = 'P0001'; end if;
  if not private.draft_gestor(v_yo, d) then raise exception 'Solo quien organiza el draft puede manejarlo.' using errcode = '42501'; end if;
  if p_accion = 'iniciar' then
    if d.estado <> 'preparando' then raise exception 'El draft ya empezó.' using errcode = 'P0001'; end if;
    update public.drafts set estado = 'en_vivo', iniciado = now(), turno_desde = now() where id = d.id;
  elsif p_accion = 'pausar' then
    if d.estado <> 'en_vivo' then raise exception 'Solo se pausa un draft en vivo.' using errcode = 'P0001'; end if;
    perform private.draft_avanzar(d.id);  -- primero resolver lo vencido
    select * into d from public.drafts where id = p_draft;
    if d.estado = 'en_vivo' then
      v_rest := greatest(5, ceil(extract(epoch from (d.turno_desde + make_interval(secs => d.segundos_turno) - now())))::integer);
      update public.drafts set estado = 'pausado', restante_pausa = v_rest where id = d.id;
    end if;
  elsif p_accion = 'reanudar' then
    if d.estado <> 'pausado' then raise exception 'El draft no está en pausa.' using errcode = 'P0001'; end if;
    update public.drafts set estado = 'en_vivo', restante_pausa = null,
      turno_desde = now() - make_interval(secs => d.segundos_turno - coalesce(d.restante_pausa, d.segundos_turno)) where id = d.id;
  elsif p_accion = 'cancelar' then
    if d.estado in ('terminado', 'cancelado') then raise exception 'El draft ya terminó.' using errcode = 'P0001'; end if;
    -- lo ya elegido se queda (son fichajes reales en Liga Máster); solo se detiene
    update public.drafts set estado = 'cancelado', terminado = now() where id = d.id;
  else raise exception 'Acción desconocida.' using errcode = '22023'; end if;
  return private.draft_json(p_draft, v_yo);
end $$;

-- ── Elegir (quien tiene el turno) ─────────────────────────────────────────────────────────────────────────
create or replace function public.draft_elegir(p_draft bigint, p_lm_jugador bigint default null, p_opcion bigint default null) returns jsonb
language plpgsql security definer set search_path = '' as $$
declare v_yo uuid := private.uid_requerido(); d public.drafts; v_p integer; v_orden integer; v_mio integer; v_ok boolean;
begin
  perform private.draft_avanzar(p_draft);
  select * into d from public.drafts where id = p_draft for update;
  if not found then raise exception 'Ese draft no existe.' using errcode = 'P0001'; end if;
  if d.estado <> 'en_vivo' then raise exception 'El draft no está en vivo.' using errcode = 'P0001'; end if;
  select count(*) into v_p from public.draft_participantes where draft_id = d.id;
  v_orden := private.draft_orden_de(d.turno, v_p, d.serpiente);
  select orden into v_mio from public.draft_participantes where draft_id = d.id and usuario = v_yo;
  if v_mio is null or v_mio <> v_orden then raise exception 'No es tu turno.' using errcode = '42501'; end if;
  if d.ambito = 'lm' and p_lm_jugador is null then raise exception 'Elige un jugador.' using errcode = '22023'; end if;
  if d.ambito = 'torneo' and p_opcion is null then raise exception 'Elige un equipo.' using errcode = '22023'; end if;
  if d.ambito = 'lm' and exists (select 1 from public.draft_picks p where p.draft_id = d.id and p.lm_jugador_id = p_lm_jugador) then raise exception 'Ese jugador ya fue elegido.' using errcode = 'P0001'; end if;
  if d.ambito = 'torneo' and exists (select 1 from public.draft_picks p where p.draft_id = d.id and p.opcion_id = p_opcion) then raise exception 'Ese equipo ya fue elegido.' using errcode = 'P0001'; end if;
  v_ok := private.draft_elegir(d, v_orden, case when d.ambito = 'lm' then p_lm_jugador end, case when d.ambito = 'torneo' then p_opcion end, false, v_yo);
  update public.drafts set turno = turno + 1, turno_desde = now() where id = d.id;
  if d.turno + 1 >= v_p * d.rondas then update public.drafts set estado = 'terminado', terminado = now() where id = d.id; end if;
  return private.draft_json(p_draft, v_yo);
end $$;

-- ── Leer ──────────────────────────────────────────────────────────────────────────────────────────────────
-- Estado en vivo (avanza los turnos vencidos antes de responder). Por eso NO es «stable».
create or replace function public.draft_estado(p_draft bigint) returns jsonb
language plpgsql security definer set search_path = '' as $$
begin
  perform private.draft_avanzar(p_draft);
  return private.draft_json(p_draft, (select auth.uid()));
end $$;

-- Lo que se puede elegir ahora (libres de la liga o equipos del torneo), con búsqueda. Tope 60.
create or replace function public.draft_disponibles(p_draft bigint, p_buscar text default null, p_posicion text default null) returns jsonb
language plpgsql stable security definer set search_path = '' as $$
declare d public.drafts; v_q text := nullif(btrim(coalesce(p_buscar, '')), '');
begin
  select * into d from public.drafts where id = p_draft;
  if not found then return '[]'::jsonb; end if;
  if d.ambito = 'lm' then
    return coalesce((select jsonb_agg(jsonb_build_object('id', j.id, 'nombre', j.nombre, 'posicion', j.posicion, 'media', j.media, 'edad', j.edad, 'valor', j.valor) order by j.media desc nulls last, j.valor desc, j.id)
      from (select * from public.lm_jugadores j where j.liga = d.liga and j.club_id is null
              and not exists (select 1 from public.draft_picks p where p.draft_id = d.id and p.lm_jugador_id = j.id)
              and (v_q is null or j.nombre ilike '%' || replace(replace(v_q, '%', ''), '_', '') || '%')
              and (p_posicion is null or j.posicion = p_posicion)
            order by j.media desc nulls last, j.valor desc, j.id limit 60) j), '[]'::jsonb);
  end if;
  return coalesce((select jsonb_agg(jsonb_build_object('id', o.id, 'nombre', o.nombre) order by o.nombre)
    from public.draft_opciones o where o.draft_id = d.id
      and not exists (select 1 from public.draft_picks p where p.draft_id = d.id and p.opcion_id = o.id)
      and (v_q is null or o.nombre ilike '%' || replace(replace(v_q, '%', ''), '_', '') || '%')), '[]'::jsonb);
end $$;

-- Drafts recientes (vivos primero). Con p_torneo, solo los de ese torneo.
create or replace function public.drafts_lista(p_torneo bigint default null) returns jsonb
language sql stable security definer set search_path = '' as $$
  select coalesce(jsonb_agg(jsonb_build_object('id', d.id, 'ambito', d.ambito, 'titulo', d.titulo, 'estado', d.estado, 'torneo_id', d.torneo_id,
      'creado', d.creado, 'participantes', (select count(*) from public.draft_participantes x where x.draft_id = d.id))
      order by (d.estado in ('en_vivo', 'pausado', 'preparando')) desc, d.creado desc), '[]'::jsonb)
  from (select * from public.drafts d where (p_torneo is null or d.torneo_id = p_torneo) order by d.creado desc limit 30) d
$$;

revoke all on function public.draft_crear_lm(text, integer, integer, boolean, bigint[], text), public.draft_crear_torneo(bigint, text, text[], integer, boolean, uuid[]),
  public.draft_control(bigint, text), public.draft_elegir(bigint, bigint, bigint), public.draft_estado(bigint), public.draft_disponibles(bigint, text, text),
  public.drafts_lista(bigint) from public, anon;
grant execute on function public.draft_crear_lm(text, integer, integer, boolean, bigint[], text), public.draft_crear_torneo(bigint, text, text[], integer, boolean, uuid[]),
  public.draft_control(bigint, text), public.draft_elegir(bigint, bigint, bigint), public.draft_estado(bigint), public.draft_disponibles(bigint, text, text),
  public.drafts_lista(bigint) to authenticated;

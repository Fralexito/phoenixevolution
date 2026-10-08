-- 079 · Modo Mánager (Liga Máster de la web). Opcional y por jugador: cada usuario decide si activa su carrera de DT.
-- Ver claude/liga-master-plan.md. Arranca solo con la Galaxy League (columna `liga` lista para Sudario).
--
--   lm_clubes      clubes del PES aprobados por el staff. dueno = DT (usuario) o null (club de la IA / libre para elegir).
--   lm_jugadores   catálogo con Phoenix ID estable (id). Se llena importando el JSON que exporta el programa de PC.
--                  pes_id = ID del jugador en el parche oficial (la tabla de equivalencias multi-parche llegará después).
--   lm_ofertas     ofertas de compra entre clubes.
--   lm_movimientos historial de traspasos; aplicado_en = cuándo entró a un option file oficial.
--   lm_config      presupuesto inicial y si la ventana de fichajes está abierta (una fila por liga).
-- Reglas de dinero, ventana y dueño se validan SOLO en funciones security definer (la web no escribe tablas directo).

create table if not exists public.lm_config (
  liga text primary key default 'galaxy',
  ventana_abierta boolean not null default false,
  presupuesto_inicial bigint not null default 50000000 check (presupuesto_inicial >= 0),
  max_plantilla int not null default 30 check (max_plantilla between 11 and 60),
  updated_at timestamptz not null default now()
);
insert into public.lm_config (liga) values ('galaxy') on conflict do nothing;
alter table public.lm_config enable row level security;
drop policy if exists lmc_lee on public.lm_config;
create policy lmc_lee on public.lm_config for select using (true);

create table if not exists public.lm_clubes (
  id bigserial primary key,
  liga text not null default 'galaxy' references public.lm_config(liga),
  nombre text not null check (char_length(nombre) between 2 and 60),
  escudo_url text check (escudo_url is null or escudo_url ~ '^https://'),
  pes_team_id int,                                   -- ID del equipo en el parche oficial
  aprobado boolean not null default true,            -- el staff decide qué clubes entran al modo
  dueno uuid unique references auth.users(id) on delete set null,   -- un DT = un club (unique)
  presupuesto bigint not null default 0 check (presupuesto >= 0),
  created_at timestamptz not null default now(),
  unique (liga, nombre)
);
alter table public.lm_clubes enable row level security;
drop policy if exists lmcl_lee on public.lm_clubes;
create policy lmcl_lee on public.lm_clubes for select using (true);

create table if not exists public.lm_jugadores (
  id bigserial primary key,                          -- Phoenix ID: nunca cambia aunque cambie el parche
  liga text not null default 'galaxy' references public.lm_config(liga),
  pes_id int,
  nombre text not null check (char_length(nombre) between 1 and 80),
  posicion text check (char_length(posicion) <= 10),
  media int check (media between 1 and 99),
  edad int check (edad between 10 and 60),
  nacionalidad text check (char_length(nacionalidad) <= 60),
  fecha_nac date,
  altura int check (altura between 120 and 230),
  dorsal int check (dorsal between 1 and 99),
  valor bigint not null default 0 check (valor >= 0),
  club_id bigint references public.lm_clubes(id) on delete set null,   -- null = agente libre
  unique (liga, pes_id)
);
create index if not exists lm_jugadores_club on public.lm_jugadores (club_id);
create index if not exists lm_jugadores_nombre on public.lm_jugadores (liga, lower(nombre));
alter table public.lm_jugadores enable row level security;
drop policy if exists lmj_lee on public.lm_jugadores;
create policy lmj_lee on public.lm_jugadores for select using (true);

create table if not exists public.lm_ofertas (
  id bigserial primary key,
  jugador_id bigint not null references public.lm_jugadores(id) on delete cascade,
  club_comprador bigint not null references public.lm_clubes(id) on delete cascade,
  club_vendedor bigint references public.lm_clubes(id) on delete cascade,
  monto bigint not null check (monto >= 0),
  estado text not null default 'pendiente' check (estado in ('pendiente', 'aceptada', 'rechazada', 'cancelada', 'vencida')),
  mensaje text check (char_length(mensaje) <= 200),
  created_at timestamptz not null default now(),
  resuelta_en timestamptz
);
create index if not exists lm_ofertas_vend on public.lm_ofertas (club_vendedor, estado);
create index if not exists lm_ofertas_comp on public.lm_ofertas (club_comprador, estado);
alter table public.lm_ofertas enable row level security;
drop policy if exists lmo_lee on public.lm_ofertas;
create policy lmo_lee on public.lm_ofertas for select to authenticated using (
  exists (select 1 from lm_clubes c where c.dueno = auth.uid() and c.id in (club_comprador, club_vendedor)) or private.es_moderador());

create table if not exists public.lm_movimientos (
  id bigserial primary key,
  liga text not null default 'galaxy',
  jugador_id bigint not null references public.lm_jugadores(id) on delete cascade,
  de_club bigint references public.lm_clubes(id) on delete set null,
  a_club bigint references public.lm_clubes(id) on delete set null,
  monto bigint not null default 0,
  tipo text not null check (tipo in ('compra', 'libre', 'liberado', 'staff')),
  aplicado_en timestamptz,          -- cuando entró en un option file oficial
  created_at timestamptz not null default now()
);
create index if not exists lm_mov_fecha on public.lm_movimientos (liga, created_at desc);
alter table public.lm_movimientos enable row level security;
drop policy if exists lmm_lee on public.lm_movimientos;
create policy lmm_lee on public.lm_movimientos for select using (true);

-- Tipo de notificación nuevo.
do $$ declare v_def text; begin
  select pg_get_constraintdef(oid) into v_def from pg_constraint where conrelid = 'public.notificaciones'::regclass and contype = 'c' and pg_get_constraintdef(oid) like '%RETO_DIRECTO%';
  if v_def is not null and v_def not like '%MERCADO%' then
    execute (select 'alter table public.notificaciones drop constraint ' || quote_ident(conname) from pg_constraint where conrelid = 'public.notificaciones'::regclass and contype = 'c' and pg_get_constraintdef(oid) like '%RETO_DIRECTO%');
    execute 'alter table public.notificaciones add constraint notificaciones_tipo_check check (' || replace(regexp_replace(v_def, '^CHECK \((.*)\)$', '\1'), '''ALQUILER''::text]', '''ALQUILER''::text, ''MERCADO''::text]') || ')';
  end if;
end $$;

-- ───────── Funciones ─────────
create or replace function private.lm_mi_club() returns public.lm_clubes
language sql stable security definer set search_path = public as $$ select * from lm_clubes where dueno = auth.uid() $$;

-- Activar mi carrera: elijo un club aprobado y libre de la liga. Recibe el presupuesto inicial.
create or replace function public.lm_activar(p_club bigint) returns jsonb
language plpgsql security definer set search_path = public as $$
declare v_club lm_clubes; v_cfg lm_config;
begin
  if auth.uid() is null then raise exception 'SIN_SESION'; end if;
  if exists (select 1 from lm_clubes where dueno = auth.uid()) then raise exception 'YA_TIENES_CLUB'; end if;
  select * into v_club from lm_clubes where id = p_club for update;
  if v_club.id is null or not v_club.aprobado then raise exception 'CLUB_NO_DISPONIBLE'; end if;
  if v_club.dueno is not null then raise exception 'CLUB_OCUPADO'; end if;
  select * into v_cfg from lm_config where liga = v_club.liga;
  update lm_clubes set dueno = auth.uid(), presupuesto = v_cfg.presupuesto_inicial where id = p_club;
  return jsonb_build_object('club', p_club, 'presupuesto', v_cfg.presupuesto_inicial);
end $$;

-- Dejar mi club (vuelve a la IA; los jugadores se quedan en el club).
create or replace function public.lm_abandonar() returns void
language plpgsql security definer set search_path = public as $$
begin
  update lm_ofertas set estado = 'cancelada', resuelta_en = now() where estado = 'pendiente'
     and (club_comprador = (private.lm_mi_club()).id or club_vendedor = (private.lm_mi_club()).id);
  update lm_clubes set dueno = null where dueno = auth.uid();
  if not found then raise exception 'SIN_CLUB'; end if;
end $$;

-- Traspaso interno (lo usan las demás funciones): mueve jugador y dinero, deja historial.
create or replace function private.lm_traspasar(p_jugador bigint, p_a bigint, p_monto bigint, p_tipo text) returns void
language plpgsql security definer set search_path = public as $$
declare v_j lm_jugadores; v_cfg lm_config; v_n int;
begin
  select * into v_j from lm_jugadores where id = p_jugador for update;
  select * into v_cfg from lm_config where liga = v_j.liga;
  if p_a is not null then
    select count(*) into v_n from lm_jugadores where club_id = p_a;
    if v_n >= v_cfg.max_plantilla then raise exception 'PLANTILLA_LLENA'; end if;
    update lm_clubes set presupuesto = presupuesto - p_monto where id = p_a;   -- check presupuesto >= 0 frena si no alcanza
  end if;
  if v_j.club_id is not null then update lm_clubes set presupuesto = presupuesto + p_monto where id = v_j.club_id; end if;
  update lm_jugadores set club_id = p_a where id = p_jugador;
  insert into lm_movimientos (liga, jugador_id, de_club, a_club, monto, tipo) values (v_j.liga, p_jugador, v_j.club_id, p_a, p_monto, p_tipo);
  update lm_ofertas set estado = 'vencida', resuelta_en = now() where jugador_id = p_jugador and estado = 'pendiente';
exception when check_violation then raise exception 'PRESUPUESTO_INSUFICIENTE';
end $$;

-- Ofertar por un jugador. Agente libre o club de la IA: se cierra al instante (precio = valor). Club de otro DT: queda pendiente.
create or replace function public.lm_ofertar(p_jugador bigint, p_monto bigint, p_mensaje text default null) returns jsonb
language plpgsql security definer set search_path = public as $$
declare v_mio lm_clubes; v_j lm_jugadores; v_vend lm_clubes; v_cfg lm_config; v_id bigint;
begin
  v_mio := private.lm_mi_club(); if v_mio.id is null then raise exception 'SIN_CLUB'; end if;
  select * into v_cfg from lm_config where liga = v_mio.liga;
  if not v_cfg.ventana_abierta then raise exception 'VENTANA_CERRADA'; end if;
  select * into v_j from lm_jugadores where id = p_jugador;
  if v_j.id is null or v_j.liga <> v_mio.liga then raise exception 'JUGADOR_NO_EXISTE'; end if;
  if v_j.club_id = v_mio.id then raise exception 'YA_ES_TUYO'; end if;
  if p_monto < 0 or p_monto > v_mio.presupuesto then raise exception 'PRESUPUESTO_INSUFICIENTE'; end if;
  if v_j.club_id is not null then select * into v_vend from lm_clubes where id = v_j.club_id; end if;
  if v_j.club_id is null or v_vend.dueno is null then
    if p_monto < v_j.valor then raise exception 'OFERTA_BAJA'; end if;
    perform private.lm_traspasar(p_jugador, v_mio.id, v_j.valor, case when v_j.club_id is null then 'libre' else 'compra' end);
    return jsonb_build_object('estado', 'cerrada', 'monto', v_j.valor);
  end if;
  if exists (select 1 from lm_ofertas where jugador_id = p_jugador and club_comprador = v_mio.id and estado = 'pendiente') then raise exception 'YA_OFERTASTE'; end if;
  insert into lm_ofertas (jugador_id, club_comprador, club_vendedor, monto, mensaje) values (p_jugador, v_mio.id, v_vend.id, p_monto, left(p_mensaje, 200)) returning id into v_id;
  insert into notificaciones (usuario_id, tipo, titulo, mensaje, enlace)
  values (v_vend.dueno, 'MERCADO', 'Oferta por ' || left(v_j.nombre, 80), format('%s ofrece %s por %s', v_mio.nombre, to_char(p_monto, 'FM999G999G999'), v_j.nombre), 'manager/#oficina');
  return jsonb_build_object('estado', 'pendiente', 'oferta', v_id);
end $$;

-- Responder una oferta recibida (aceptar = traspaso inmediato).
create or replace function public.lm_responder(p_oferta bigint, p_aceptar boolean) returns void
language plpgsql security definer set search_path = public as $$
declare v_o lm_ofertas; v_mio lm_clubes; v_cfg lm_config;
begin
  v_mio := private.lm_mi_club();
  select * into v_o from lm_ofertas where id = p_oferta for update;
  if v_o.id is null or v_o.club_vendedor is distinct from v_mio.id then raise exception 'NO_AUTORIZADO'; end if;
  if v_o.estado <> 'pendiente' then raise exception 'YA_RESUELTA'; end if;
  if not p_aceptar then update lm_ofertas set estado = 'rechazada', resuelta_en = now() where id = p_oferta; return; end if;
  select * into v_cfg from lm_config where liga = v_mio.liga;
  if not v_cfg.ventana_abierta then raise exception 'VENTANA_CERRADA'; end if;
  if not exists (select 1 from lm_jugadores where id = v_o.jugador_id and club_id = v_mio.id) then raise exception 'YA_NO_ES_TUYO'; end if;
  update lm_ofertas set estado = 'aceptada', resuelta_en = now() where id = p_oferta;
  perform private.lm_traspasar(v_o.jugador_id, v_o.club_comprador, v_o.monto, 'compra');
end $$;

create or replace function public.lm_cancelar_oferta(p_oferta bigint) returns void
language plpgsql security definer set search_path = public as $$
begin
  update lm_ofertas set estado = 'cancelada', resuelta_en = now()
   where id = p_oferta and estado = 'pendiente' and club_comprador = (private.lm_mi_club()).id;
  if not found then raise exception 'NO_AUTORIZADO'; end if;
end $$;

-- Liberar a un jugador propio (queda agente libre; sin cobro).
create or replace function public.lm_liberar(p_jugador bigint) returns void
language plpgsql security definer set search_path = public as $$
begin
  if not exists (select 1 from lm_jugadores where id = p_jugador and club_id = (private.lm_mi_club()).id) then raise exception 'NO_AUTORIZADO'; end if;
  if not (select ventana_abierta from lm_config where liga = (private.lm_mi_club()).liga) then raise exception 'VENTANA_CERRADA'; end if;
  perform private.lm_traspasar(p_jugador, null, 0, 'liberado');
end $$;

-- ───────── Staff ─────────
create or replace function public.lm_staff_config(p_liga text, p_ventana boolean, p_presupuesto bigint, p_max int) returns void
language plpgsql security definer set search_path = public as $$
begin
  if not private.es_moderador() then raise exception 'NO_AUTORIZADO'; end if;
  update lm_config set ventana_abierta = p_ventana, presupuesto_inicial = p_presupuesto, max_plantilla = p_max, updated_at = now() where liga = p_liga;
end $$;

-- Importar el catálogo exportado por el programa: { equipos:[{pes_team_id,nombre}], jugadores:[{pes_id,nombre,pes_team_id,posicion,media,edad,nacionalidad,fecha_nac,altura,dorsal,valor}] }
-- Crea/actualiza clubes y jugadores por pes_id. NO mueve a jugadores que ya cambiaron de club por el mercado.
create or replace function public.lm_importar(p_liga text, p_datos jsonb) returns jsonb
language plpgsql security definer set search_path = public as $$
declare e jsonb; j jsonb; v_n_eq int := 0; v_n_j int := 0;
begin
  if not private.es_moderador() then raise exception 'NO_AUTORIZADO'; end if;
  for e in select * from jsonb_array_elements(coalesce(p_datos->'equipos', '[]')) loop
    insert into lm_clubes (liga, nombre, pes_team_id, aprobado) values (p_liga, left(e->>'nombre', 60), (e->>'pes_team_id')::int, false)
    on conflict (liga, nombre) do update set pes_team_id = excluded.pes_team_id;
    v_n_eq := v_n_eq + 1;
  end loop;
  for j in select * from jsonb_array_elements(coalesce(p_datos->'jugadores', '[]')) loop
    insert into lm_jugadores (liga, pes_id, nombre, posicion, media, edad, nacionalidad, fecha_nac, altura, dorsal, valor, club_id)
    values (p_liga, (j->>'pes_id')::int, left(j->>'nombre', 80), left(j->>'posicion', 10), (j->>'media')::int, (j->>'edad')::int,
            left(j->>'nacionalidad', 60), (j->>'fecha_nac')::date, (j->>'altura')::int, (j->>'dorsal')::int, coalesce((j->>'valor')::bigint, 0),
            (select id from lm_clubes where liga = p_liga and pes_team_id = (j->>'pes_team_id')::int limit 1))
    on conflict (liga, pes_id) do update set nombre = excluded.nombre, posicion = excluded.posicion, media = excluded.media, edad = excluded.edad,
            nacionalidad = excluded.nacionalidad, fecha_nac = excluded.fecha_nac, altura = excluded.altura, dorsal = excluded.dorsal, valor = excluded.valor;
    v_n_j := v_n_j + 1;
  end loop;
  return jsonb_build_object('equipos', v_n_eq, 'jugadores', v_n_j);
end $$;

create or replace function public.lm_staff_club(p_id bigint, p_aprobado boolean, p_presupuesto bigint default null) returns void
language plpgsql security definer set search_path = public as $$
begin
  if not private.es_moderador() then raise exception 'NO_AUTORIZADO'; end if;
  update lm_clubes set aprobado = p_aprobado, presupuesto = coalesce(p_presupuesto, presupuesto) where id = p_id;
end $$;

do $$ declare f text; begin
  foreach f in array array['lm_activar(bigint)', 'lm_abandonar()', 'lm_ofertar(bigint,bigint,text)', 'lm_responder(bigint,boolean)', 'lm_cancelar_oferta(bigint)',
    'lm_liberar(bigint)', 'lm_staff_config(text,boolean,bigint,int)', 'lm_importar(text,jsonb)', 'lm_staff_club(bigint,boolean,bigint)'] loop
    execute format('revoke all on function public.%s from public, anon', f);
    execute format('grant execute on function public.%s to authenticated', f);
  end loop;
end $$;

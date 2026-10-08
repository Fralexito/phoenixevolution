-- 084 · Liga Máster: integridad de pertenencia, Capa 1 (traspasos reales) y huella de plantillas.
--
-- (1) Pertenencia jugador→club. En este modelo la pertenencia vive en lm_jugadores.club_id y cada fila ES el
--     Phoenix ID dentro de su liga (id). La restricción UNIQUE (liga, id) hace explícito que un jugador solo puede
--     estar en UN club por liga. Además, los traspasos se hacen en una sola transacción con bloqueo de fila
--     (SELECT … FOR UPDATE) y verificación del club de origen ESPERADO: si dos DT fichan al mismo jugador a la vez,
--     el segundo recibe JUGADOR_NO_DISPONIBLE en vez de «robárselo» al primero.
alter table public.lm_jugadores drop constraint if exists lm_jugadores_liga_phoenix_unico;
alter table public.lm_jugadores add constraint lm_jugadores_liga_phoenix_unico unique (liga, id);

drop function if exists private.lm_traspasar(bigint, bigint, bigint, text);
create or replace function private.lm_traspasar(p_jugador bigint, p_a bigint, p_monto bigint, p_tipo text, p_desde_esperado bigint default -1) returns void
language plpgsql security definer set search_path = public as $$
declare v_j lm_jugadores; v_cfg lm_config; v_n int;
begin
  select * into v_j from lm_jugadores where id = p_jugador for update;          -- bloquea al jugador hasta terminar
  if v_j.id is null then raise exception 'JUGADOR_NO_EXISTE'; end if;
  -- -1 = no verificar; null = debe estar libre; n = debe seguir en el club n
  if p_desde_esperado is distinct from -1 and v_j.club_id is distinct from p_desde_esperado then raise exception 'JUGADOR_NO_DISPONIBLE'; end if;
  if v_j.club_id is not distinct from p_a then raise exception 'YA_ES_TUYO'; end if;
  select * into v_cfg from lm_config where liga = v_j.liga;
  if p_a is not null then
    perform 1 from lm_clubes where id = p_a for update;                         -- bloquea el club comprador (presupuesto)
    select count(*) into v_n from lm_jugadores where club_id = p_a;
    if v_n >= v_cfg.max_plantilla then raise exception 'PLANTILLA_LLENA'; end if;
    update lm_clubes set presupuesto = presupuesto - p_monto where id = p_a;   -- check presupuesto >= 0
  end if;
  if v_j.club_id is not null then update lm_clubes set presupuesto = presupuesto + p_monto where id = v_j.club_id; end if;
  update lm_jugadores set club_id = p_a where id = p_jugador;
  insert into lm_movimientos (liga, jugador_id, de_club, a_club, monto, tipo) values (v_j.liga, p_jugador, v_j.club_id, p_a, p_monto, p_tipo);
  update lm_ofertas set estado = 'vencida', resuelta_en = now() where jugador_id = p_jugador and estado = 'pendiente';
exception when check_violation then raise exception 'PRESUPUESTO_INSUFICIENTE';
end $$;

-- Ofertar: el cierre instantáneo verifica que el jugador SIGA donde estaba cuando se leyó.
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
    perform private.lm_traspasar(p_jugador, v_mio.id, v_j.valor, case when v_j.club_id is null then 'libre' else 'compra' end, v_j.club_id);
    return jsonb_build_object('estado', 'cerrada', 'monto', v_j.valor);
  end if;
  if exists (select 1 from lm_ofertas where jugador_id = p_jugador and club_comprador = v_mio.id and estado = 'pendiente') then raise exception 'YA_OFERTASTE'; end if;
  insert into lm_ofertas (jugador_id, club_comprador, club_vendedor, monto, mensaje) values (p_jugador, v_mio.id, v_vend.id, p_monto, left(p_mensaje, 200)) returning id into v_id;
  insert into notificaciones (usuario_id, tipo, titulo, mensaje, enlace)
  values (v_vend.dueno, 'MERCADO', 'Oferta por ' || left(v_j.nombre, 80), format('%s ofrece %s por %s', v_mio.nombre, to_char(p_monto, 'FM999G999G999'), v_j.nombre), 'manager/#oficina');
  return jsonb_build_object('estado', 'pendiente', 'oferta', v_id);
end $$;

-- Responder: la oferta se bloquea y el traspaso exige que el jugador siga en el club vendedor.
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
  update lm_ofertas set estado = 'aceptada', resuelta_en = now() where id = p_oferta;
  perform private.lm_traspasar(v_o.jugador_id, v_o.club_comprador, v_o.monto, 'compra', v_mio.id);
end $$;

create or replace function public.lm_liberar(p_jugador bigint) returns void
language plpgsql security definer set search_path = public as $$
declare v_mio lm_clubes;
begin
  v_mio := private.lm_mi_club(); if v_mio.id is null then raise exception 'SIN_CLUB'; end if;
  if not (select ventana_abierta from lm_config where liga = v_mio.liga) then raise exception 'VENTANA_CERRADA'; end if;
  perform private.lm_traspasar(p_jugador, null, 0, 'liberado', v_mio.id);
end $$;

-- (2) CAPA 1 · Traspasos reales (mundo real), por ventana. Solo staff. Separado de lm_movimientos (Capa 2).
create table if not exists public.lm_ventanas_reales (
  id bigserial primary key,
  nombre text not null check (char_length(nombre) between 2 and 60),   -- p. ej. «Verano 2026»
  estado text not null default 'abierta' check (estado in ('abierta', 'cerrada', 'aplicada')),
  notas text check (char_length(notas) <= 500),
  creado_por uuid references auth.users(id) on delete set null,
  created_at timestamptz not null default now()
);
create table if not exists public.lm_traspasos_reales (
  id bigserial primary key,
  ventana_id bigint not null references public.lm_ventanas_reales(id) on delete cascade,
  pes_id int not null,                           -- jugador en el option file base (Capa 1 es la misma para todas las ligas)
  jugador text not null check (char_length(jugador) <= 80),
  de_pes_team_id int,                            -- null = venía libre
  a_pes_team_id int,                             -- null = queda libre
  tipo text not null default 'traspaso' check (tipo in ('traspaso', 'cesion', 'libre', 'retiro')),
  nota text check (char_length(nota) <= 200),
  creado_por uuid references auth.users(id) on delete set null,
  created_at timestamptz not null default now(),
  unique (ventana_id, pes_id)                    -- un jugador, un movimiento por ventana
);
alter table public.lm_ventanas_reales enable row level security;
alter table public.lm_traspasos_reales enable row level security;
do $$ declare t text; begin
  foreach t in array array['lm_ventanas_reales', 'lm_traspasos_reales'] loop
    execute format('drop policy if exists %1$s_lee on public.%1$s', t);
    execute format('create policy %1$s_lee on public.%1$s for select using (true)', t);
    execute format('drop policy if exists %1$s_staff on public.%1$s', t);
    execute format('create policy %1$s_staff on public.%1$s for all to authenticated using (private.es_moderador()) with check (private.es_moderador())', t);
  end loop;
end $$;

-- (3) HUELLA DE PLANTILLAS esperada de una liga.
-- Formato canónico (Mercado debe calcularlo IGUAL):
--   · una línea por club que tenga ≥1 jugador:  <clave_club>:<phoenix_id>,<phoenix_id>,…
--   · clave_club = pes_team_id; si el club no tiene pes_team_id, «c<id_del_club>»
--   · phoenix_ids en orden numérico ascendente; líneas ordenadas por clave_club (texto, orden C/byte)
--   · líneas unidas con «\n» (sin salto final), texto UTF-8 → SHA-256 en hexadecimal minúsculas
--   · los agentes libres no entran
create or replace function public.lm_huella_texto(p_liga text) returns text
language sql stable security definer set search_path = public as $$
  select coalesce(string_agg(linea, E'\n' order by clave collate "C"), '')
  from (
    select coalesce(c.pes_team_id::text, 'c' || c.id) as clave,
           coalesce(c.pes_team_id::text, 'c' || c.id) || ':' || string_agg(j.id::text, ',' order by j.id) as linea
    from lm_jugadores j join lm_clubes c on c.id = j.club_id
    where j.liga = p_liga
    group by c.id, c.pes_team_id
  ) x;
$$;
create or replace function public.lm_huella(p_liga text) returns jsonb
language sql stable security definer set search_path = public, extensions as $$
  select jsonb_build_object('liga', p_liga, 'algoritmo', 'sha256',
    'huella', encode(extensions.digest(public.lm_huella_texto(p_liga), 'sha256'), 'hex'),
    'clubes', (select count(distinct club_id) from lm_jugadores where liga = p_liga and club_id is not null),
    'jugadores', (select count(*) from lm_jugadores where liga = p_liga and club_id is not null),
    'calculada', now());
$$;
grant execute on function public.lm_huella(text) to anon, authenticated, service_role;
grant execute on function public.lm_huella_texto(text) to authenticated, service_role;

-- Reportes de Mercado: huella de plantillas que vio el programa antes/después + si coincidía con la esperada.
alter table public.mercado_reportes add column if not exists huella_plantillas_antes text check (huella_plantillas_antes ~ '^[0-9a-f]{64}$');
alter table public.mercado_reportes add column if not exists huella_plantillas_despues text check (huella_plantillas_despues ~ '^[0-9a-f]{64}$');
alter table public.mercado_reportes add column if not exists huella_esperada text check (huella_esperada ~ '^[0-9a-f]{64}$');

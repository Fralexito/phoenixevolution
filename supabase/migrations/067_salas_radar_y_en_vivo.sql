-- 067 · Abrir sala → «Retos en el radar» y «Salas en vivo» (smash-soda-producto.md §6).
-- · acepta_espectadores (la app lo envía al abrir).
-- · Sala pública/amigos, amistosa, sin reto y sin rival → tarjeta en el radar. Aceptar = queda como rival (mando 2 en la lista de roles).
-- · Sala con espectadores → tarjeta en «En vivo»; «Ver» registra al usuario como espectador (pad_limit 0) y le entrega el enlace.
-- · Privada: no se lista nunca (solo entra quien tiene invitación o rol). Sin latido 3 min → 'caida' (cron salas-caidas, ya existente).
-- · El enlace ya NO se lee con solo «ver» la sala: hay que tener un rol (host, staff, invitado, jugador del reto, rival, espectador
--   registrado, miembro de la organización). Así nadie entra sin quedar en la lista de roles que descarga la app.

alter table public.salas add column if not exists acepta_espectadores boolean not null default true;
alter table public.salas add column if not exists rival uuid references auth.users(id);
alter table public.salas add column if not exists rival_desde timestamptz;
do $$ begin
  alter table public.salas add constraint salas_rival_no_host check (rival is null or rival <> host);
exception when duplicate_object then null; end $$;

create table if not exists public.salas_espectadores (
  sala_id uuid not null references public.salas(id) on delete cascade,
  usuario uuid not null references auth.users(id) on delete cascade,
  entro   timestamptz not null default now(),
  primary key (sala_id, usuario)
);
alter table public.salas_espectadores enable row level security;
drop policy if exists salas_espectadores_leer on public.salas_espectadores;
create policy salas_espectadores_leer on public.salas_espectadores for select to authenticated using (
  usuario = (select auth.uid()) or (select private.es_staff())
  or exists (select 1 from public.salas s where s.id = sala_id and s.host = (select auth.uid()))
);
grant select on public.salas_espectadores to authenticated;

do $$ declare c text; begin
  select conname into c from pg_constraint where conrelid = 'public.eventos_sala'::regclass and contype = 'c' and pg_get_constraintdef(oid) like '%cambio_mando%';
  if c is not null then execute format('alter table public.eventos_sala drop constraint %I', c); end if;
end $$;
alter table public.eventos_sala add constraint eventos_sala_tipo_check check (tipo in ('abrir', 'cerrar', 'entra', 'sale', 'desconexion', 'reconexion',
  'expulsion', 'cambio_mando', 'partida_inicio', 'partida_fin', 'pausa', 'plazas_ampliadas', 'espera_rechazada', 'caida', 'rival'));

create index if not exists salas_radar_idx on public.salas (estado, latido) where rival is null and reto_id is null;

-- ¿p_uid tiene un rol en la sala? (y por tanto puede tener el enlace)
create or replace function private.tiene_rol_sala(p_uid uuid, p_sala uuid) returns boolean
language sql stable security definer set search_path = '' as $$
  select coalesce((select s.estado in ('preparando', 'abierta', 'en_partida') and p_uid is not null and (
      s.host = p_uid or s.rival = p_uid or private.es_staff_de(p_uid) or private.invitado_a(p_uid, s.id)
      or exists (select 1 from public.salas_espectadores e where e.sala_id = s.id and e.usuario = p_uid)
      or (s.reto_id is not null and (exists (select 1 from private.jugadores_de_reto(s.reto_id) j where j.usuario_id = p_uid)
                                   or exists (select 1 from public.reto_espectadores x where x.reto_id = s.reto_id and x.usuario_id = p_uid and x.estado = 'APROBADO')))
      or (s.organizacion is not null and private.miembro_org(p_uid, s.organizacion)))
    from public.salas s where s.id = p_sala), false)
$$;

-- entra_sala_de (usada por /v1/salas para dar el enlace) pasa a exigir rol.
create or replace function private.entra_sala_de(p_uid uuid, p_sala uuid) returns boolean
language sql stable security definer set search_path = '' as $$
  select private.tiene_rol_sala(p_uid, p_sala)
$$;

drop policy if exists salas_enlace_leer on public.salas_enlace;
create policy salas_enlace_leer on public.salas_enlace for select to authenticated
  using (private.tiene_rol_sala((select auth.uid()), sala_id));

-- Semáforo para un espectador/rival concreto: historial real del par (≥ 3 muestras, 30 días) o, si no hay, calidad general del host.
create or replace function private.semaforo_para(p_uid uuid, p_sala uuid) returns jsonb
language sql stable security definer set search_path = '' as $$
  with s as (select * from public.salas where id = p_sala),
  par as (select count(*) n, percentile_cont(0.5) within group (order by m.ping_ms) mediana
            from public.muestras_calidad m, s where m.host = s.host and m.usuario = p_uid and m.tomada > now() - interval '30 days'),
  gen as (select c.ping_mediana, c.perdida_pct from public.calidad_host_resumen c, s where c.host = s.host
           order by (c.region = coalesce(s.region, '')) desc, c.muestras desc limit 1)
  select case
    when (select n from par) >= 3 then jsonb_build_object('fuente', 'par', 'ping_ms', round((select mediana from par)::numeric),
      'color', private.semaforo(private.umbrales((select reglas from s)), (select mediana from par)::numeric, null, null))
    when exists (select 1 from gen) then jsonb_build_object('fuente', 'host', 'ping_ms', (select ping_mediana from gen),
      'color', private.semaforo(private.umbrales((select reglas from s)), (select ping_mediana from gen), null, (select perdida_pct from gen)))
    else jsonb_build_object('fuente', 'sin_datos', 'ping_ms', null, 'color', 'sin_datos') end
$$;

-- Núcleo único (web y app): unirse como 'rival' o 'espectador'. Devuelve {rol, enlace} o {error: CODIGO}.
create or replace function private.unirse_sala(p_uid uuid, p_sala uuid, p_como text) returns jsonb
language plpgsql security definer set search_path = '' as $$
declare s public.salas; n integer; enl text;
begin
  if p_uid is null then return jsonb_build_object('error', 'SIN_PERMISO'); end if;
  if p_como not in ('rival', 'espectador') then return jsonb_build_object('error', 'CAMPO_INVALIDO'); end if;
  select * into s from public.salas where id = p_sala for update;
  if not found then return jsonb_build_object('error', 'SALA_NO_ENCONTRADA'); end if;
  if s.estado not in ('preparando', 'abierta', 'en_partida') or s.latido < now() - interval '3 minutes' then return jsonb_build_object('error', 'SALA_CERRADA'); end if;
  select enlace into enl from public.salas_enlace where sala_id = s.id;

  if s.host = p_uid then return jsonb_build_object('rol', 'host', 'enlace', enl); end if;
  if s.rival = p_uid then return jsonb_build_object('rol', 'rival', 'enlace', enl); end if;
  if p_como = 'espectador' and exists (select 1 from public.salas_espectadores where sala_id = s.id and usuario = p_uid) then
    return jsonb_build_object('rol', 'espectador', 'enlace', enl);
  end if;

  if not private.ve_sala_de(p_uid, s.id) or s.visibilidad in ('privada', 'torneo') and not private.tiene_rol_sala(p_uid, s.id) then
    return jsonb_build_object('error', 'SIN_PERMISO');
  end if;

  if p_como = 'rival' then
    if s.estado <> 'abierta' or s.reto_id is not null or s.modo <> 'amistoso' or s.rival is not null then return jsonb_build_object('error', 'SALA_OCUPADA'); end if;
    update public.salas set rival = p_uid, rival_desde = now() where id = s.id;
    delete from public.salas_espectadores where sala_id = s.id and usuario = p_uid;
    insert into public.eventos_sala (sala_id, tipo, usuario, datos, ocurrido, clave_idempotencia)
    values (s.id, 'rival', p_uid, '{}'::jsonb, now(), 'rival-' || s.id || '-' || p_uid) on conflict (clave_idempotencia) do nothing;
    perform private.notificar(s.host, 'RETO_ACEPTADO', 'Tienes rival', private.nombre(p_uid) || ' aceptó tu reto' || coalesce(' de ' || s.juego, '') || '. Ya está en tu lista como jugador 2.', null, null);
    return jsonb_build_object('rol', 'rival', 'enlace', enl);
  end if;

  if not s.acepta_espectadores or s.limite_espectadores = 0 then return jsonb_build_object('error', 'SIN_ESPECTADORES'); end if;
  select count(*) into n from public.salas_espectadores where sala_id = s.id;
  if n >= s.limite_espectadores then return jsonb_build_object('error', 'CUPO_LLENO'); end if;
  insert into public.salas_espectadores (sala_id, usuario) values (s.id, p_uid) on conflict do nothing;
  return jsonb_build_object('rol', 'espectador', 'enlace', enl);
end $$;

-- El rival se retira (vuelve al radar) · el host lo suelta desde la app.
create or replace function private.soltar_rival(p_sala uuid) returns void
language sql security definer set search_path = '' as $$
  update public.salas set rival = null, rival_desde = null where id = p_sala
$$;

-- Lista de roles de una sala sin reto (host = mando 1, rival = mando 2) + espectadores registrados. La consume la Edge Function.
create or replace function public.sistema_roles_sala(p_sala uuid) returns jsonb
language sql stable security definer set search_path = '' as $$
  select jsonb_build_object(
    'host', jsonb_build_object('usuario_id', s.host, 'nombre', private.nombre(s.host), 'parsec_id', (select parsec_id from public.cuentas_parsec where usuario = s.host)),
    'rival', case when s.rival is null then null else
      jsonb_build_object('usuario_id', s.rival, 'nombre', private.nombre(s.rival), 'parsec_id', (select parsec_id from public.cuentas_parsec where usuario = s.rival)) end,
    'espectadores', coalesce((select jsonb_agg(jsonb_build_object('usuario_id', e.usuario, 'nombre', private.nombre(e.usuario),
                        'parsec_id', (select parsec_id from public.cuentas_parsec where usuario = e.usuario)) order by e.entro)
                      from public.salas_espectadores e where e.sala_id = s.id), '[]'::jsonb))
  from public.salas s where s.id = p_sala
$$;

-- ── Web ────────────────────────────────────────────────────────────────────────────────────────────────────────────
create or replace function public.radar_salas() returns jsonb
language sql stable security definer set search_path = '' as $$
  select coalesce(jsonb_agg(j order by mia desc, amigo desc, abierta desc), '[]'::jsonb) from (
    select s.host = (select auth.uid()) mia, private.son_amigos((select auth.uid()), s.host) amigo, s.abierta_en abierta,
      jsonb_build_object('sala_id', s.id, 'mia', s.host = (select auth.uid()),
        'host', jsonb_build_object('id', s.host, 'nombre', private.nombre(s.host), 'avatar_url', p.avatar_url, 'amigo', private.son_amigos((select auth.uid()), s.host)),
        'juego', s.juego, 'parche', s.parche, 'region', s.region, 'visibilidad', s.visibilidad, 'abierta_en', s.abierta_en,
        'acepta_espectadores', s.acepta_espectadores, 'semaforo', private.semaforo_para((select auth.uid()), s.id)) j
    from public.salas s join public.perfiles p on p.id = s.host
    where s.estado = 'abierta' and s.rival is null and s.reto_id is null and s.modo = 'amistoso' and s.organizacion is null
      and s.visibilidad in ('publica', 'amigos') and s.publicar_en_pagina and s.latido > now() - interval '3 minutes'
      and private.ve_sala_de((select auth.uid()), s.id)
    limit 60) x
$$;

create or replace function public.salas_en_vivo() returns jsonb
language sql stable security definer set search_path = '' as $$
  select coalesce(jsonb_agg(j order by en_partida desc, abierta desc), '[]'::jsonb) from (
    select s.estado = 'en_partida' en_partida, s.abierta_en abierta,
      jsonb_build_object('sala_id', s.id, 'estado', s.estado, 'juego', s.juego, 'parche', s.parche, 'region', s.region,
        'visibilidad', s.visibilidad, 'reto_id', s.reto_id, 'abierta_en', s.abierta_en,
        'host', jsonb_build_object('id', s.host, 'nombre', private.nombre(s.host), 'avatar_url', p.avatar_url),
        'rival', case when s.rival is null then null else jsonb_build_object('id', s.rival, 'nombre', private.nombre(s.rival)) end,
        'espectadores', (select count(*) from public.salas_espectadores e where e.sala_id = s.id), 'limite_espectadores', s.limite_espectadores,
        'soy_espectador', exists (select 1 from public.salas_espectadores e where e.sala_id = s.id and e.usuario = (select auth.uid())),
        'semaforo', private.semaforo_para((select auth.uid()), s.id)) j
    from public.salas s join public.perfiles p on p.id = s.host
    where s.estado in ('abierta', 'en_partida') and s.acepta_espectadores and s.limite_espectadores > 0
      and s.visibilidad in ('publica', 'amigos') and s.publicar_en_pagina and s.latido > now() - interval '3 minutes'
      and private.ve_sala_de((select auth.uid()), s.id)
    limit 60) x
$$;

create or replace function public.aceptar_sala(p_sala uuid) returns jsonb
language plpgsql security definer set search_path = '' as $$
declare r jsonb := private.unirse_sala(private.uid_requerido(), p_sala, 'rival');
begin
  if r ? 'error' then raise exception '%', r ->> 'error' using errcode = 'P0001'; end if;
  return r;
end $$;

create or replace function public.ver_sala(p_sala uuid) returns jsonb
language plpgsql security definer set search_path = '' as $$
declare r jsonb := private.unirse_sala(private.uid_requerido(), p_sala, 'espectador');
begin
  if r ? 'error' then raise exception '%', r ->> 'error' using errcode = 'P0001'; end if;
  return r;
end $$;

-- El rival se baja (la sala vuelve al radar si sigue abierta).
create or replace function public.dejar_sala(p_sala uuid) returns void
language plpgsql security definer set search_path = '' as $$
declare yo uuid := private.uid_requerido();
begin
  update public.salas set rival = null, rival_desde = null where id = p_sala and rival = yo and estado = 'abierta';
  delete from public.salas_espectadores where sala_id = p_sala and usuario = yo;
end $$;

-- ── App (service_role) ─────────────────────────────────────────────────────────────────────────────────────────────
create or replace function public.sistema_unirse_sala(p_usuario uuid, p_sala uuid, p_como text) returns jsonb
language sql security definer set search_path = '' as $$ select private.unirse_sala(p_usuario, p_sala, p_como) $$;
create or replace function public.sistema_soltar_rival(p_sala uuid) returns void
language sql security definer set search_path = '' as $$ select private.soltar_rival(p_sala) $$;

revoke all on function private.tiene_rol_sala(uuid, uuid), private.semaforo_para(uuid, uuid), private.unirse_sala(uuid, uuid, text), private.soltar_rival(uuid) from public, anon;
grant execute on function private.tiene_rol_sala(uuid, uuid) to authenticated;
revoke all on function public.radar_salas(), public.salas_en_vivo(), public.aceptar_sala(uuid), public.ver_sala(uuid), public.dejar_sala(uuid) from public, anon;
grant execute on function public.radar_salas(), public.salas_en_vivo(), public.aceptar_sala(uuid), public.ver_sala(uuid), public.dejar_sala(uuid) to authenticated;
revoke all on function public.sistema_unirse_sala(uuid, uuid, text), public.sistema_soltar_rival(uuid), public.sistema_roles_sala(uuid) from public, anon, authenticated;
grant execute on function public.sistema_unirse_sala(uuid, uuid, text), public.sistema_soltar_rival(uuid), public.sistema_roles_sala(uuid) to service_role;

-- 019 · ESPECTADORES de partidos (entrar al mismo Parsec / Smash Soda solo para ver). Depende de 003 (retos), 017 (amigos, bloqueos).
-- El retador (o el host) decide por reto:
--   APAGADO     → nadie puede pedir ver (por defecto: privacidad primero)
--   APROBACION  → cualquiera con sesión pide y un líder aprueba
--   AMIGOS      → entran directo solo los amigos de alguno de los jugadores (retador, rival o host)
--   CUALQUIERA  → entra directo cualquiera con sesión
-- El enlace de conexión sigue siendo PRIVADO: solo lo recibe quien está APROBADO, vía enlace_espectador().
-- Nota: la entrada final a Parsec/Smash Soda la controla el host dentro de esas apps; aquí se gestiona el permiso y la entrega del enlace.

alter table public.retos_matchmaking add column if not exists espectadores_modo text not null default 'APAGADO'
  check (espectadores_modo in ('APAGADO','APROBACION','AMIGOS','CUALQUIERA'));
alter table public.retos_matchmaking add column if not exists espectadores_max smallint not null default 4
  check (espectadores_max between 1 and 20);

create table if not exists public.reto_espectadores (
  reto_id integer not null references public.retos_matchmaking(id) on delete cascade,
  usuario_id uuid not null references auth.users(id) on delete cascade,
  estado text not null check (estado in ('PENDIENTE','APROBADO','RECHAZADO')),
  created_at timestamptz not null default now(),
  respondida_at timestamptz,
  primary key (reto_id, usuario_id)
);
create index if not exists reto_espectadores_usuario_idx on public.reto_espectadores (usuario_id);

alter table public.notificaciones drop constraint if exists notificaciones_tipo_check;
alter table public.notificaciones add constraint notificaciones_tipo_check check (tipo in (
  'RETO_DIRECTO','RETO_HOST','RETO_ACEPTADO','RETO_RECHAZADO','SALA_LISTA','CONFIRMAR_PARTIDO','AVISO_FINAL','PARTIDO_CONFIRMADO',
  'PARTIDO_CANCELADO','RETO_EXPIRADO','INVITACION_RETO','UNION_RETO','SALIO_RETO','AMISTAD_SOLICITUD','AMISTAD_ACEPTADA','SEGUIDOR_NUEVO',
  'ESPECTADOR_SOLICITUD','ESPECTADOR_APROBADO'));

-- Ayudantes internos
create or replace function private.es_lider_reto(p_reto integer, p_uid uuid) returns boolean
language sql stable security definer set search_path = '' as $$
  select p_uid is not null and exists (select 1 from public.retos_matchmaking where id = p_reto and (retador_id = p_uid or host_id = p_uid))
$$;
revoke all on function private.es_lider_reto(integer, uuid) from public, anon, authenticated;

create or replace function private.aprobados(p_reto integer) returns integer
language sql stable security definer set search_path = '' as $$
  select count(*)::integer from public.reto_espectadores where reto_id = p_reto and estado = 'APROBADO'
$$;
revoke all on function private.aprobados(integer) from public, anon, authenticated;

-- '' si `p_uid` puede pedir ver el partido; si no, el motivo (texto listo para mostrar).
create or replace function private.motivo_no_ver(p_reto integer, p_uid uuid) returns text
language plpgsql stable security definer set search_path = '' as $$
declare r public.retos_matchmaking%rowtype;
begin
  if p_uid is null then return 'Inicia sesión para pedir entrar.'; end if;
  select * into r from public.retos_matchmaking where id = p_reto;
  if not found or r.estado not in ('ACEPTADO','EN_JUEGO') then return 'Este partido no está disponible.'; end if;
  if r.espectadores_modo = 'APAGADO' then return 'Este partido no acepta espectadores.'; end if;
  if p_uid in (r.retador_id, r.rival_id, r.host_id) or private.es_participante(p_reto, p_uid) then return 'Ya participas en este partido.'; end if;
  if private.hay_bloqueo(p_uid, r.retador_id) or private.hay_bloqueo(p_uid, r.rival_id) or private.hay_bloqueo(p_uid, r.host_id) then return 'No puedes ver este partido.'; end if;
  if r.espectadores_modo = 'AMIGOS' and not (private.son_amigos(p_uid, r.retador_id) or private.son_amigos(p_uid, r.rival_id) or private.son_amigos(p_uid, r.host_id)) then
    return 'Solo los amigos de los jugadores pueden ver este partido.';
  end if;
  return '';
end $$;
revoke all on function private.motivo_no_ver(integer, uuid) from public, anon, authenticated;

alter table public.reto_espectadores enable row level security;
revoke all on public.reto_espectadores from anon, authenticated;
grant select on public.reto_espectadores to authenticated;
create policy espectadores_lectura on public.reto_espectadores for select to authenticated using (
  usuario_id = (select auth.uid()) or private.es_lider_reto(reto_id, (select auth.uid())) or private.es_admin());

-- ───────── Funciones (RPC) ─────────
create or replace function public.configurar_espectadores(p_reto integer, p_modo text, p_max integer default 4) returns void
language plpgsql security definer set search_path = '' as $$
declare yo uuid := private.uid_requerido(); r public.retos_matchmaking%rowtype;
begin
  if p_modo not in ('APAGADO','APROBACION','AMIGOS','CUALQUIERA') then raise exception 'Modo de espectadores no válido.'; end if;
  select * into r from public.retos_matchmaking where id = p_reto for update;
  if not found or not private.es_lider_reto(p_reto, yo) then raise exception 'Solo el retador o el host pueden cambiar esto.'; end if;
  if r.estado not in ('BUSCANDO','ACEPTADO','EN_JUEGO') then raise exception 'Este partido ya terminó.'; end if;
  update public.retos_matchmaking set espectadores_modo = p_modo, espectadores_max = greatest(1, least(coalesce(p_max, 4), 20)) where id = p_reto;
  if p_modo = 'APAGADO' then delete from public.reto_espectadores where reto_id = p_reto; end if;   -- apagar = nadie se queda mirando
end $$;

create or replace function public.pedir_ver(p_reto integer) returns text
language plpgsql security definer set search_path = '' as $$
declare yo uuid := private.uid_requerido(); r public.retos_matchmaking%rowtype; msg text; e public.reto_espectadores%rowtype; nuevo text; l uuid;
begin
  msg := private.motivo_no_ver(p_reto, yo);
  if msg <> '' then raise exception '%', msg; end if;
  select * into r from public.retos_matchmaking where id = p_reto for update;
  select * into e from public.reto_espectadores where reto_id = p_reto and usuario_id = yo;
  if found then
    if e.estado in ('APROBADO','PENDIENTE') then return e.estado; end if;
    if e.respondida_at > now() - interval '1 hour' then raise exception 'Tu solicitud fue rechazada. Podrás intentarlo más tarde.'; end if;
  end if;
  nuevo := case r.espectadores_modo when 'APROBACION' then 'PENDIENTE' else 'APROBADO' end;
  if nuevo = 'APROBADO' and private.aprobados(p_reto) >= r.espectadores_max then raise exception 'La sala de espectadores está llena.'; end if;
  insert into public.reto_espectadores (reto_id, usuario_id, estado, respondida_at) values (p_reto, yo, nuevo, case when nuevo = 'APROBADO' then now() end)
    on conflict (reto_id, usuario_id) do update set estado = excluded.estado, created_at = now(), respondida_at = excluded.respondida_at;
  if nuevo = 'PENDIENTE' then
    for l in select distinct x from unnest(array[r.retador_id, r.host_id]) x where x is not null loop
      perform private.notificar(l, 'ESPECTADOR_SOLICITUD', 'Quieren ver tu partido', private.nombre(yo) || ' pide entrar como espectador.', r.id);
    end loop;
  end if;
  return nuevo;
end $$;

create or replace function public.responder_espectador(p_reto integer, p_usuario uuid, p_acepta boolean) returns void
language plpgsql security definer set search_path = '' as $$
declare yo uuid := private.uid_requerido(); r public.retos_matchmaking%rowtype;
begin
  select * into r from public.retos_matchmaking where id = p_reto for update;
  if not found or not private.es_lider_reto(p_reto, yo) then raise exception 'Solo el retador o el host pueden responder.'; end if;
  if not exists (select 1 from public.reto_espectadores where reto_id = p_reto and usuario_id = p_usuario and estado = 'PENDIENTE') then raise exception 'Esa solicitud ya no existe.'; end if;
  if p_acepta and private.aprobados(p_reto) >= r.espectadores_max then raise exception 'La sala de espectadores está llena.'; end if;
  update public.reto_espectadores set estado = case when p_acepta then 'APROBADO' else 'RECHAZADO' end, respondida_at = now() where reto_id = p_reto and usuario_id = p_usuario;
  if p_acepta then perform private.notificar(p_usuario, 'ESPECTADOR_APROBADO', 'Puedes ver el partido', 'Te aceptaron como espectador. Abre «Salas en vivo» para obtener el enlace.', r.id); end if;
end $$;

create or replace function public.quitar_espectador(p_reto integer, p_usuario uuid) returns void
language plpgsql security definer set search_path = '' as $$
declare yo uuid := private.uid_requerido();
begin
  if not private.es_lider_reto(p_reto, yo) then raise exception 'Solo el retador o el host pueden quitar espectadores.'; end if;
  update public.reto_espectadores set estado = 'RECHAZADO', respondida_at = now() where reto_id = p_reto and usuario_id = p_usuario;
end $$;

create or replace function public.salir_espectador(p_reto integer) returns void
language plpgsql security definer set search_path = '' as $$
declare yo uuid := private.uid_requerido();
begin delete from public.reto_espectadores where reto_id = p_reto and usuario_id = yo; end $$;

-- Enlace de conexión para espectadores APROBADOS (el único camino para que un espectador lo vea).
create or replace function public.enlace_espectador(p_reto integer) returns jsonb
language plpgsql stable security definer set search_path = '' as $$
declare yo uuid := private.uid_requerido(); r public.retos_matchmaking%rowtype; c public.retos_conexion%rowtype;
begin
  select * into r from public.retos_matchmaking where id = p_reto;
  if not found or r.estado not in ('ACEPTADO','EN_JUEGO') or r.espectadores_modo = 'APAGADO'
     or not exists (select 1 from public.reto_espectadores where reto_id = p_reto and usuario_id = yo and estado = 'APROBADO')
     or private.hay_bloqueo(yo, r.retador_id) or private.hay_bloqueo(yo, r.host_id) then
    raise exception 'No tienes acceso a este partido.';
  end if;
  select * into c from public.retos_conexion where reto_id = p_reto;
  if not found then raise exception 'Aún no hay enlace: el host lo publicará pronto.'; end if;
  return jsonb_build_object('link', c.link, 'detalle', c.detalle);
end $$;

-- Lista pública de partidos que aceptan espectadores (solo los que el retador abrió a propósito). Sin enlaces.
create or replace function public.partidos_en_vivo() returns jsonb
language plpgsql stable security definer set search_path = '' as $$
declare yo uuid := (select auth.uid());
begin
  return coalesce((select jsonb_agg(x order by (x->>'estado') desc, (x->>'id')::int desc) from (
    select jsonb_build_object(
      'id', r.id, 'estado', r.estado, 'plataforma', r.plataforma, 'tam_a', r.tam_a, 'tam_b', r.tam_b, 'modalidad', r.modalidad, 'fecha', r.fecha_programada,
      'modo', r.espectadores_modo, 'max', r.espectadores_max, 'aprobados', private.aprobados(r.id),
      'retador_id', r.retador_id, 'rival_id', r.rival_id, 'host_id', r.host_id,
      'jugadores', coalesce((select jsonb_agg(distinct p.usuario_id) from public.reto_participantes p where p.reto_id = r.id and p.estado <> 'SALIO'), '[]'::jsonb),
      'mi_estado', (select e.estado from public.reto_espectadores e where e.reto_id = r.id and e.usuario_id = yo),
      'motivo', nullif(private.motivo_no_ver(r.id, yo), '')
    ) as x
    from public.retos_matchmaking r where r.estado in ('ACEPTADO','EN_JUEGO') and r.espectadores_modo <> 'APAGADO') t), '[]'::jsonb);
end $$;

-- Mis partidos como retador/host con su configuración y solicitudes.
create or replace function public.mis_salas() returns jsonb
language plpgsql stable security definer set search_path = '' as $$
declare yo uuid := private.uid_requerido();
begin
  return coalesce((select jsonb_agg(x order by (x->>'id')::int desc) from (
    select jsonb_build_object(
      'id', r.id, 'estado', r.estado, 'plataforma', r.plataforma, 'tam_a', r.tam_a, 'tam_b', r.tam_b,
      'modo', r.espectadores_modo, 'max', r.espectadores_max,
      'retador_id', r.retador_id, 'rival_id', r.rival_id, 'host_id', r.host_id,
      'espectadores', coalesce((select jsonb_agg(jsonb_build_object('usuario_id', e.usuario_id, 'estado', e.estado) order by e.created_at) from public.reto_espectadores e where e.reto_id = r.id), '[]'::jsonb)
    ) as x
    from public.retos_matchmaking r where (r.retador_id = yo or r.host_id = yo) and r.estado in ('BUSCANDO','ACEPTADO','EN_JUEGO')) t), '[]'::jsonb);
end $$;

do $$ declare f text; begin
  foreach f in array array['configurar_espectadores(integer,text,integer)','pedir_ver(integer)','responder_espectador(integer,uuid,boolean)','quitar_espectador(integer,uuid)',
    'salir_espectador(integer)','enlace_espectador(integer)','partidos_en_vivo()','mis_salas()'] loop
    execute format('revoke all on function public.%s from public, anon', f);
    execute format('grant execute on function public.%s to authenticated', f);
  end loop;
end $$;
grant execute on function public.partidos_en_vivo() to anon;   -- la vitrina de partidos abiertos la puede ver cualquiera

do $$ begin
  if not exists (select 1 from pg_publication_tables where pubname = 'supabase_realtime' and tablename = 'reto_espectadores') then
    alter publication supabase_realtime add table public.reto_espectadores;
  end if;
end $$;

-- 003_duelos_v2: retos directos, sistema Host, confirmación previa, notificaciones y expiración automática.
-- Principio: TODA mutación de un reto pasa por funciones (RPC) con reglas; el navegador ya no escribe estados.

create extension if not exists pg_cron;

-- ───────────── Helpers privados ─────────────
create or replace function private.puede_hostear(p_uid uuid) returns boolean
language sql stable security definer set search_path = '' as $$
  select coalesce((select puede_hostear from public.perfiles where id = p_uid), false)
$$;
revoke all on function private.puede_hostear(uuid) from public;
grant execute on function private.puede_hostear(uuid) to anon, authenticated;

create or replace function private.nombre(p_uid uuid) returns text
language sql stable security definer set search_path = '' as $$
  select coalesce((select nombre_display from public.perfiles where id = p_uid), 'Jugador')
$$;
revoke all on function private.nombre(uuid) from public;

-- ───────────── Columnas nuevas ─────────────
alter table public.retos_matchmaking
  add column if not exists destinatario_id uuid references public.perfiles(id) on delete cascade,
  add column if not exists host_id uuid references public.perfiles(id) on delete set null,
  add column if not exists aceptado_at timestamptz,
  add column if not exists cerrado_at timestamptz,
  add column if not exists confirmo_retador_at timestamptz,
  add column if not exists confirmo_rival_at timestamptz,
  add column if not exists recordatorio_at timestamptz,
  add column if not exists aviso_final_at timestamptz,
  add column if not exists motivo_cierre text;

update public.retos_matchmaking set requiere_host = false where requiere_host is null;
alter table public.retos_matchmaking
  alter column requiere_host set default false,
  alter column requiere_host set not null;

alter table public.retos_matchmaking drop constraint if exists retos_estado_ok;
alter table public.retos_matchmaking add constraint retos_estado_ok check (estado::text in
  ('BUSCANDO','ACEPTADO','EN_JUEGO','FINALIZADO','CANCELADO','EXPIRADO','RECHAZADO'));
alter table public.retos_matchmaking
  add constraint retos_destinatario_ok check (destinatario_id is null or destinatario_id <> retador_id),
  add constraint retos_host_ok check (host_id is null or host_id = retador_id or host_id = rival_id),
  add constraint retos_motivo_ok check (motivo_cierre is null or motivo_cierre in
    ('RECHAZADO','CANCELADO_RETADOR','CANCELADO_RIVAL','NO_CONFIRMADO','EXPIRADO','AUTO'));

create index if not exists retos_destinatario_idx on public.retos_matchmaking(destinatario_id) where destinatario_id is not null;
create index if not exists retos_retador_idx on public.retos_matchmaking(retador_id);
create index if not exists retos_host_idx on public.retos_matchmaking(host_id) where host_id is not null;
create index if not exists retos_cron_idx on public.retos_matchmaking(estado, modalidad, fecha_programada);

alter table public.retos_conexion drop constraint if exists retos_conexion_link_check;
alter table public.retos_conexion add constraint retos_conexion_link_check
  check (link ~ '^(https://|parsec://|steam://)' and char_length(link) <= 300);
alter table public.retos_conexion add column if not exists detalle text check (detalle is null or char_length(detalle) <= 100);

-- ───────────── Notificaciones ─────────────
create table if not exists public.notificaciones (
  id bigint generated always as identity primary key,
  usuario_id uuid not null references public.perfiles(id) on delete cascade,
  tipo text not null check (tipo in ('RETO_DIRECTO','RETO_HOST','RETO_ACEPTADO','RETO_RECHAZADO','SALA_LISTA',
    'CONFIRMAR_PARTIDO','AVISO_FINAL','PARTIDO_CONFIRMADO','PARTIDO_CANCELADO','RETO_EXPIRADO')),
  titulo text not null check (char_length(titulo) <= 120),
  mensaje text not null check (char_length(mensaje) <= 300),
  reto_id integer references public.retos_matchmaking(id) on delete cascade,
  fecha_ref timestamptz,
  leida boolean not null default false,
  created_at timestamptz not null default now()
);
create index if not exists notif_usuario_idx on public.notificaciones(usuario_id, created_at desc);
create index if not exists notif_reto_idx on public.notificaciones(reto_id) where reto_id is not null;
alter table public.notificaciones enable row level security;
revoke all on public.notificaciones from anon, authenticated;
grant select, delete on public.notificaciones to authenticated;
grant update (leida) on public.notificaciones to authenticated;
drop policy if exists notif_select_propia on public.notificaciones;
drop policy if exists notif_update_propia on public.notificaciones;
drop policy if exists notif_delete_propia on public.notificaciones;
create policy notif_select_propia on public.notificaciones for select to authenticated using (usuario_id = (select auth.uid()));
create policy notif_update_propia on public.notificaciones for update to authenticated
  using (usuario_id = (select auth.uid())) with check (usuario_id = (select auth.uid()));
create policy notif_delete_propia on public.notificaciones for delete to authenticated using (usuario_id = (select auth.uid()));
do $$ begin
  if not exists (select 1 from pg_publication_tables where pubname='supabase_realtime' and tablename='notificaciones') then
    alter publication supabase_realtime add table public.notificaciones;
  end if;
end $$;

create or replace function private.notificar(p_usuario uuid, p_tipo text, p_titulo text, p_mensaje text,
  p_reto integer default null, p_fecha timestamptz default null) returns void
language sql security definer set search_path = '' as $$
  insert into public.notificaciones(usuario_id, tipo, titulo, mensaje, reto_id, fecha_ref)
  values (p_usuario, p_tipo, p_titulo, p_mensaje, p_reto, p_fecha)
$$;
revoke all on function private.notificar(uuid,text,text,text,integer,timestamptz) from public, anon, authenticated;

-- ───────────── Validación al crear un reto ─────────────
create or replace function private.validar_reto_insert() returns trigger
language plpgsql security definer set search_path = '' as $$
begin
  if new.destinatario_id is not null and not exists (select 1 from public.perfiles where id = new.destinatario_id) then
    raise exception 'El jugador retado no existe' using errcode = 'P0001';
  end if;
  if not new.requiere_host and not private.puede_hostear(new.retador_id) then
    raise exception 'Activa "Soy Host" en tu perfil, o marca que necesitas que otro jugador hostee' using errcode = 'P0001';
  end if;
  if new.requiere_host and new.destinatario_id is not null and not private.puede_hostear(new.destinatario_id) then
    raise exception 'Ese jugador no tiene Host activo' using errcode = 'P0001';
  end if;
  if new.modalidad = 'PROGRAMADO' then
    if new.fecha_programada < now() + interval '30 minutes' then
      raise exception 'Un partido programado debe ser al menos 30 minutos en el futuro' using errcode = 'P0001';
    end if;
    if new.fecha_programada > now() + interval '30 days' then
      raise exception 'Solo puedes programar hasta 30 días' using errcode = 'P0001';
    end if;
  elsif new.fecha_programada is not null
        and (new.fecha_programada < now() - interval '1 minute' or new.fecha_programada > now() + interval '2 hours') then
    raise exception 'La hora estimada debe estar dentro de las próximas 2 horas' using errcode = 'P0001';
  end if;
  return new;
end $$;
revoke all on function private.validar_reto_insert() from public, anon, authenticated;
drop trigger if exists trg_validar_reto on public.retos_matchmaking;
create trigger trg_validar_reto before insert on public.retos_matchmaking
  for each row execute function private.validar_reto_insert();

-- Notifica al destinatario (directo) o a TODOS los que tienen Host (si el emisor necesita host).
create or replace function private.notificar_reto_nuevo() returns trigger
language plpgsql security definer set search_path = '' as $$
declare v_nombre text := private.nombre(new.retador_id);
begin
  if new.destinatario_id is not null then
    perform private.notificar(new.destinatario_id, 'RETO_DIRECTO', 'Te retaron a un duelo',
      v_nombre || ' te reta por ' || new.plataforma, new.id, new.fecha_programada);
  elsif new.requiere_host then
    insert into public.notificaciones(usuario_id, tipo, titulo, mensaje, reto_id, fecha_ref)
    select p.id, 'RETO_HOST', 'Reto que necesita un Host',
           v_nombre || ' busca un host para jugar por ' || new.plataforma, new.id, new.fecha_programada
    from public.perfiles p where p.puede_hostear and p.id <> new.retador_id;
  end if;
  return new;
end $$;
revoke all on function private.notificar_reto_nuevo() from public, anon, authenticated;
drop trigger if exists trg_notificar_reto on public.retos_matchmaking;
create trigger trg_notificar_reto after insert on public.retos_matchmaking
  for each row execute function private.notificar_reto_nuevo();

-- ───────────── RLS de retos ─────────────
drop policy if exists "Lectura retos" on public.retos_matchmaking;
drop policy if exists retos_insert_propio on public.retos_matchmaking;
drop policy if exists retos_update_retador on public.retos_matchmaking;
drop policy if exists retos_select on public.retos_matchmaking;

create policy retos_select on public.retos_matchmaking for select to anon, authenticated using (
  (destinatario_id is null and not requiere_host)                                   -- abiertos: todos
  or retador_id = (select auth.uid()) or rival_id = (select auth.uid())
  or destinatario_id = (select auth.uid())                                          -- directos: solo el retado
  or (destinatario_id is null and requiere_host and private.puede_hostear((select auth.uid())))  -- piden host: solo hosts
  or private.es_admin()
);
create policy retos_insert_propio on public.retos_matchmaking for insert to authenticated with check (
  retador_id = (select auth.uid()) and rival_id is null and estado::text = 'BUSCANDO'
  and host_id is null and aceptado_at is null and cerrado_at is null
  and confirmo_retador_at is null and confirmo_rival_at is null
  and recordatorio_at is null and aviso_final_at is null and motivo_cierre is null
);
revoke update on public.retos_matchmaking from anon, authenticated;
revoke update (estado) on public.retos_matchmaking from anon, authenticated;

drop policy if exists conexion_insert_retador on public.retos_conexion;
drop policy if exists conexion_update_retador on public.retos_conexion;
revoke insert, update, delete on public.retos_conexion from anon, authenticated;

-- ───────────── RPC (única vía de cambio) ─────────────
create or replace function public.aceptar_reto(p_reto_id integer) returns public.retos_matchmaking
language plpgsql security definer set search_path = '' as $$
declare v_uid uuid := auth.uid(); v public.retos_matchmaking;
begin
  if v_uid is null then raise exception 'Debes iniciar sesión' using errcode = '28000'; end if;
  select * into v from public.retos_matchmaking where id = p_reto_id for update;
  if not found or v.estado::text <> 'BUSCANDO' or v.rival_id is not null or v.retador_id = v_uid
     or (v.destinatario_id is not null and v.destinatario_id <> v_uid) then
    raise exception 'El reto ya no está disponible o es tuyo' using errcode = 'P0001';
  end if;
  if v.requiere_host and not private.puede_hostear(v_uid) then
    raise exception 'Este reto necesita un jugador con Host activo' using errcode = 'P0001';
  end if;
  if v.modalidad = 'PROGRAMADO' and v.fecha_programada < now() + interval '15 minutes' then
    raise exception 'Es muy tarde para aceptar este partido' using errcode = 'P0001';
  end if;
  update public.retos_matchmaking
     set rival_id = v_uid, estado = 'ACEPTADO', aceptado_at = now(),
         host_id = case when v.requiere_host then v_uid else v.retador_id end
   where id = p_reto_id returning * into v;
  perform private.notificar(v.retador_id, 'RETO_ACEPTADO', '¡Reto aceptado!',
    private.nombre(v_uid) || ' aceptó tu reto. ' ||
    case when v.host_id = v_uid then 'Él/ella será el host.' else 'Tú eres el host: publica el enlace de conexión.' end,
    v.id, v.fecha_programada);
  return v;
end $$;

create or replace function public.rechazar_reto(p_reto_id integer) returns public.retos_matchmaking
language plpgsql security definer set search_path = '' as $$
declare v_uid uuid := auth.uid(); v public.retos_matchmaking;
begin
  if v_uid is null then raise exception 'Debes iniciar sesión' using errcode = '28000'; end if;
  update public.retos_matchmaking set estado = 'RECHAZADO', motivo_cierre = 'RECHAZADO', cerrado_at = now()
   where id = p_reto_id and estado::text = 'BUSCANDO' and destinatario_id = v_uid returning * into v;
  if not found then raise exception 'Solo puedes rechazar retos dirigidos a ti que sigan pendientes' using errcode = 'P0001'; end if;
  perform private.notificar(v.retador_id, 'RETO_RECHAZADO', 'Reto rechazado', private.nombre(v_uid) || ' rechazó tu reto.', v.id);
  return v;
end $$;

create or replace function public.cancelar_reto(p_reto_id integer) returns public.retos_matchmaking
language plpgsql security definer set search_path = '' as $$
declare v_uid uuid := auth.uid(); v public.retos_matchmaking; v_otro uuid;
begin
  if v_uid is null then raise exception 'Debes iniciar sesión' using errcode = '28000'; end if;
  update public.retos_matchmaking
     set estado = 'CANCELADO', cerrado_at = now(),
         motivo_cierre = case when retador_id = v_uid then 'CANCELADO_RETADOR' else 'CANCELADO_RIVAL' end
   where id = p_reto_id and estado::text in ('BUSCANDO','ACEPTADO','EN_JUEGO') and v_uid in (retador_id, rival_id)
   returning * into v;
  if not found then raise exception 'No puedes cancelar este reto' using errcode = 'P0001'; end if;
  v_otro := case when v.retador_id = v_uid then v.rival_id else v.retador_id end;
  if v_otro is not null then
    perform private.notificar(v_otro, 'PARTIDO_CANCELADO', 'Partido cancelado',
      private.nombre(v_uid) || ' canceló el partido.', v.id, v.fecha_programada);
  end if;
  return v;
end $$;

create or replace function public.finalizar_reto(p_reto_id integer) returns public.retos_matchmaking
language plpgsql security definer set search_path = '' as $$
declare v_uid uuid := auth.uid(); v public.retos_matchmaking;
begin
  if v_uid is null then raise exception 'Debes iniciar sesión' using errcode = '28000'; end if;
  update public.retos_matchmaking set estado = 'FINALIZADO', cerrado_at = now()
   where id = p_reto_id and estado::text in ('ACEPTADO','EN_JUEGO') and v_uid in (retador_id, rival_id) returning * into v;
  if not found then raise exception 'No puedes finalizar este reto' using errcode = 'P0001'; end if;
  return v;
end $$;

create or replace function public.confirmar_partido(p_reto_id integer) returns public.retos_matchmaking
language plpgsql security definer set search_path = '' as $$
declare v_uid uuid := auth.uid(); v public.retos_matchmaking;
begin
  if v_uid is null then raise exception 'Debes iniciar sesión' using errcode = '28000'; end if;
  select * into v from public.retos_matchmaking where id = p_reto_id for update;
  if not found or v_uid not in (v.retador_id, v.rival_id) then raise exception 'Reto no encontrado' using errcode = 'P0001'; end if;
  if v.modalidad <> 'PROGRAMADO' or v.estado::text not in ('ACEPTADO','EN_JUEGO') then
    raise exception 'Este partido no requiere confirmación' using errcode = 'P0001';
  end if;
  if now() < v.fecha_programada - interval '30 minutes' then
    raise exception 'La confirmación se abre 30 minutos antes del partido' using errcode = 'P0001';
  end if;
  if now() > v.fecha_programada - interval '10 minutes' then
    raise exception 'La ventana de confirmación ya cerró' using errcode = 'P0001';
  end if;
  update public.retos_matchmaking
     set confirmo_retador_at = case when retador_id = v_uid then coalesce(confirmo_retador_at, now()) else confirmo_retador_at end,
         confirmo_rival_at   = case when rival_id   = v_uid then coalesce(confirmo_rival_at,   now()) else confirmo_rival_at   end
   where id = p_reto_id returning * into v;
  if v.confirmo_retador_at is not null and v.confirmo_rival_at is not null then
    perform private.notificar(v.retador_id, 'PARTIDO_CONFIRMADO', 'Partido confirmado', 'Ambos confirmaron. ¡A jugar!', v.id, v.fecha_programada);
    perform private.notificar(v.rival_id,   'PARTIDO_CONFIRMADO', 'Partido confirmado', 'Ambos confirmaron. ¡A jugar!', v.id, v.fecha_programada);
  end if;
  return v;
end $$;

create or replace function public.publicar_enlace(p_reto_id integer, p_link text, p_detalle text default null)
returns public.retos_matchmaking
language plpgsql security definer set search_path = '' as $$
declare v_uid uuid := auth.uid(); v public.retos_matchmaking; v_otro uuid; v_link text := btrim(p_link);
begin
  if v_uid is null then raise exception 'Debes iniciar sesión' using errcode = '28000'; end if;
  if v_link !~ '^(https://|parsec://|steam://)' or char_length(v_link) > 300 then
    raise exception 'El enlace debe empezar con https://, parsec:// o steam://' using errcode = 'P0001';
  end if;
  select * into v from public.retos_matchmaking where id = p_reto_id for update;
  if not found or v.host_id is distinct from v_uid or v.estado::text not in ('ACEPTADO','EN_JUEGO') then
    raise exception 'Solo el host de un reto aceptado puede publicar el enlace' using errcode = 'P0001';
  end if;
  insert into public.retos_conexion(reto_id, link, detalle) values (p_reto_id, v_link, nullif(btrim(coalesce(p_detalle,'')), ''))
  on conflict (reto_id) do update set link = excluded.link, detalle = excluded.detalle;
  if v.modalidad = 'AHORA' then
    update public.retos_matchmaking set estado = 'EN_JUEGO' where id = p_reto_id returning * into v;
  end if;
  v_otro := case when v.retador_id = v_uid then v.rival_id else v.retador_id end;
  perform private.notificar(v_otro, 'SALA_LISTA', 'Sala lista', private.nombre(v_uid) || ' publicó el enlace de conexión.', v.id, v.fecha_programada);
  return v;
end $$;

do $$ declare f text; begin
  foreach f in array array['aceptar_reto(integer)','rechazar_reto(integer)','cancelar_reto(integer)','finalizar_reto(integer)',
                           'confirmar_partido(integer)','publicar_enlace(integer,text,text)'] loop
    execute format('revoke all on function public.%s from public, anon', f);
    execute format('grant execute on function public.%s to authenticated', f);
  end loop;
end $$;

-- ───────────── Proceso automático (cada minuto) ─────────────
create or replace function private.procesar_retos() returns void
language plpgsql security definer set search_path = '' as $$
begin
  -- a) Retos sin aceptar que ya vencieron
  with u as (update public.retos_matchmaking set estado = 'EXPIRADO', motivo_cierre = 'EXPIRADO', cerrado_at = now()
    where estado::text = 'BUSCANDO' and (
      (modalidad = 'PROGRAMADO' and fecha_programada < now())
      or (modalidad = 'AHORA' and coalesce(fecha_programada + interval '30 minutes', created_at + interval '60 minutes') < now()))
    returning id, retador_id, fecha_programada)
  insert into public.notificaciones(usuario_id, tipo, titulo, mensaje, reto_id, fecha_ref)
  select retador_id, 'RETO_EXPIRADO', 'Tu reto expiró', 'Nadie lo aceptó a tiempo.', id, fecha_programada from u;

  -- b) Se abre la ventana de confirmación (30 min antes)
  with u as (update public.retos_matchmaking set recordatorio_at = now()
    where estado::text in ('ACEPTADO','EN_JUEGO') and modalidad = 'PROGRAMADO' and recordatorio_at is null
      and fecha_programada - interval '30 minutes' <= now() and fecha_programada - interval '10 minutes' > now()
    returning id, retador_id, rival_id, fecha_programada)
  insert into public.notificaciones(usuario_id, tipo, titulo, mensaje, reto_id, fecha_ref)
  select v.uid, 'CONFIRMAR_PARTIDO', 'Confirma tu partido',
         'Tu partido es pronto. Confirma que sigue en pie o se cancelará.', u.id, u.fecha_programada
  from u cross join lateral (values (u.retador_id), (u.rival_id)) v(uid);

  -- c) Último aviso (15 min antes) solo a quien aún no confirmó
  with u as (update public.retos_matchmaking set aviso_final_at = now()
    where estado::text in ('ACEPTADO','EN_JUEGO') and modalidad = 'PROGRAMADO' and aviso_final_at is null
      and fecha_programada - interval '15 minutes' <= now() and fecha_programada - interval '10 minutes' > now()
      and (confirmo_retador_at is null or confirmo_rival_at is null)
    returning id, retador_id, rival_id, fecha_programada, confirmo_retador_at, confirmo_rival_at)
  insert into public.notificaciones(usuario_id, tipo, titulo, mensaje, reto_id, fecha_ref)
  select v.uid, 'AVISO_FINAL', '¡Última llamada para confirmar!',
         'Si no confirmas en pocos minutos, el partido se cancela.', u.id, u.fecha_programada
  from u cross join lateral (values (u.retador_id, u.confirmo_retador_at), (u.rival_id, u.confirmo_rival_at)) v(uid, c)
  where v.c is null;

  -- d) Cancelación por falta de confirmación (10 min antes)
  with u as (update public.retos_matchmaking set estado = 'CANCELADO', motivo_cierre = 'NO_CONFIRMADO', cerrado_at = now()
    where estado::text in ('ACEPTADO','EN_JUEGO') and modalidad = 'PROGRAMADO'
      and fecha_programada - interval '10 minutes' <= now()
      and (confirmo_retador_at is null or confirmo_rival_at is null)
    returning id, retador_id, rival_id, fecha_programada, confirmo_retador_at, confirmo_rival_at)
  insert into public.notificaciones(usuario_id, tipo, titulo, mensaje, reto_id, fecha_ref)
  select v.uid, 'PARTIDO_CANCELADO', 'Partido cancelado',
         case when v.c is null then 'No confirmaste a tiempo, por eso el partido se canceló.'
              else 'Tu rival no confirmó a tiempo, por eso el partido se canceló.' end, u.id, u.fecha_programada
  from u cross join lateral (values (u.retador_id, u.confirmo_retador_at), (u.rival_id, u.confirmo_rival_at)) v(uid, c);

  -- e) Partidos que nadie cerró (8 h) y limpieza de notificaciones viejas (30 días)
  update public.retos_matchmaking set estado = 'FINALIZADO', motivo_cierre = 'AUTO', cerrado_at = now()
   where estado::text in ('ACEPTADO','EN_JUEGO') and coalesce(fecha_programada, aceptado_at, created_at) + interval '8 hours' < now();
  delete from public.notificaciones where created_at < now() - interval '30 days';
end $$;
revoke all on function private.procesar_retos() from public, anon, authenticated;

select cron.unschedule(jobid) from cron.job where jobname = 'procesar-retos';
select cron.schedule('procesar-retos', '* * * * *', 'select private.procesar_retos()');

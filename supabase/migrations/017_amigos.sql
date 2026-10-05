-- 017 · AMIGOS, SEGUIDORES, BLOQUEOS y PRIVACIDAD SOCIAL (base del chat privado y del permiso de espectadores).
-- Principio: las tablas NO se escriben directo desde el navegador; todo pasa por funciones (RPC) que validan las reglas.
-- Lectura: cada quien ve solo lo suyo (RLS). Quien es bloqueado nunca se entera (los mensajes de error son genéricos).

-- 1) Amistades. El par se guarda ordenado (usuario_a < usuario_b) para que no haya duplicados A→B / B→A.
create table if not exists public.amistades (
  id bigint generated always as identity primary key,
  usuario_a uuid not null references auth.users(id) on delete cascade,
  usuario_b uuid not null references auth.users(id) on delete cascade,
  solicitante uuid not null references auth.users(id) on delete cascade,
  estado text not null default 'PENDIENTE' check (estado in ('PENDIENTE','ACEPTADA','RECHAZADA')),
  created_at timestamptz not null default now(),
  respondida_at timestamptz,
  constraint amistades_par_ordenado check (usuario_a < usuario_b),
  constraint amistades_solicitante_valido check (solicitante in (usuario_a, usuario_b)),
  constraint amistades_unico unique (usuario_a, usuario_b)
);
create index if not exists amistades_b_idx on public.amistades (usuario_b);

-- 2) Seguidores (unilateral, sin aceptación).
create table if not exists public.seguidores (
  seguidor_id uuid not null references auth.users(id) on delete cascade,
  seguido_id uuid not null references auth.users(id) on delete cascade,
  created_at timestamptz not null default now(),
  primary key (seguidor_id, seguido_id),
  constraint seguidores_no_a_si_mismo check (seguidor_id <> seguido_id)
);
create index if not exists seguidores_seguido_idx on public.seguidores (seguido_id);

-- 3) Bloqueos (solo los ve quien bloquea).
create table if not exists public.bloqueos (
  bloqueador_id uuid not null references auth.users(id) on delete cascade,
  bloqueado_id uuid not null references auth.users(id) on delete cascade,
  created_at timestamptz not null default now(),
  primary key (bloqueador_id, bloqueado_id),
  constraint bloqueos_no_a_si_mismo check (bloqueador_id <> bloqueado_id)
);
create index if not exists bloqueos_bloqueado_idx on public.bloqueos (bloqueado_id);

-- 4) Privacidad social (una fila por usuario; si no existe se usan los valores por defecto).
create table if not exists public.privacidad_social (
  usuario_id uuid primary key references auth.users(id) on delete cascade,
  quien_solicita text not null default 'todos' check (quien_solicita in ('todos','nadie')),
  quien_escribe  text not null default 'amigos' check (quien_escribe in ('nadie','amigos','amigos_y_seguidores','todos')),
  ver_amigos     text not null default 'amigos' check (ver_amigos in ('nadie','amigos','todos')),
  mostrar_conexion boolean not null default true,
  updated_at timestamptz not null default now()
);

alter table public.amistades enable row level security;
alter table public.seguidores enable row level security;
alter table public.bloqueos enable row level security;
alter table public.privacidad_social enable row level security;
revoke all on public.amistades, public.seguidores, public.bloqueos, public.privacidad_social from anon, authenticated;
grant select on public.amistades, public.seguidores, public.bloqueos, public.privacidad_social to authenticated;
drop policy if exists amistades_propias on public.amistades;
drop policy if exists seguidores_propios on public.seguidores;
drop policy if exists bloqueos_propios on public.bloqueos;
drop policy if exists privacidad_propia on public.privacidad_social;
create policy amistades_propias on public.amistades for select to authenticated using ((select auth.uid()) in (usuario_a, usuario_b));
create policy seguidores_propios on public.seguidores for select to authenticated using ((select auth.uid()) in (seguidor_id, seguido_id));
create policy bloqueos_propios on public.bloqueos for select to authenticated using (bloqueador_id = (select auth.uid()));
create policy privacidad_propia on public.privacidad_social for select to authenticated using (usuario_id = (select auth.uid()));

-- 5) Notificaciones nuevas.
alter table public.notificaciones drop constraint if exists notificaciones_tipo_check;
alter table public.notificaciones add constraint notificaciones_tipo_check check (tipo in (
  'RETO_DIRECTO','RETO_HOST','RETO_ACEPTADO','RETO_RECHAZADO','SALA_LISTA','CONFIRMAR_PARTIDO','AVISO_FINAL','PARTIDO_CONFIRMADO',
  'PARTIDO_CANCELADO','RETO_EXPIRADO','INVITACION_RETO','UNION_RETO','SALIO_RETO','AMISTAD_SOLICITUD','AMISTAD_ACEPTADA','SEGUIDOR_NUEVO'));

-- 6) Ayudantes internos (no expuestos al navegador).
create or replace function private.hay_bloqueo(p_x uuid, p_y uuid) returns boolean
language sql stable security definer set search_path = '' as $$
  select exists (select 1 from public.bloqueos where (bloqueador_id = p_x and bloqueado_id = p_y) or (bloqueador_id = p_y and bloqueado_id = p_x))
$$;
revoke all on function private.hay_bloqueo(uuid, uuid) from public, anon, authenticated;

create or replace function private.son_amigos(p_x uuid, p_y uuid) returns boolean
language sql stable security definer set search_path = '' as $$
  select exists (select 1 from public.amistades where usuario_a = least(p_x, p_y) and usuario_b = greatest(p_x, p_y) and estado = 'ACEPTADA')
$$;
revoke all on function private.son_amigos(uuid, uuid) from public, anon, authenticated;

create or replace function private.uid_requerido() returns uuid
language plpgsql stable set search_path = '' as $$
declare v uuid := (select auth.uid());
begin
  if v is null then raise exception 'Inicia sesión para continuar.' using errcode = '28000'; end if;
  return v;
end $$;
revoke all on function private.uid_requerido() from public, anon, authenticated;

-- 7) Funciones públicas (RPC). Todas exigen sesión y validan reglas.
create or replace function public.solicitar_amistad(p_destino uuid) returns text
language plpgsql security definer set search_path = '' as $$
declare yo uuid := private.uid_requerido(); a uuid := least(yo, p_destino); b uuid := greatest(yo, p_destino); f public.amistades%rowtype; pend integer;
begin
  if p_destino is null or p_destino = yo then raise exception 'Elige a otra persona.'; end if;
  if not exists (select 1 from public.perfiles where id = p_destino) then raise exception 'Ese jugador no existe.'; end if;
  -- Bloqueo en cualquier sentido: mensaje genérico para no revelar quién bloqueó a quién.
  if private.hay_bloqueo(yo, p_destino) then raise exception 'No se pudo enviar la solicitud.'; end if;
  select * into f from public.amistades where usuario_a = a and usuario_b = b for update;
  if found then
    if f.estado = 'ACEPTADA' then raise exception 'Ya son amigos.'; end if;
    if f.estado = 'PENDIENTE' and f.solicitante = yo then raise exception 'Ya enviaste una solicitud.'; end if;
    if f.estado = 'PENDIENTE' then   -- la otra persona ya te la había enviado: se aceptan mutuamente
      update public.amistades set estado = 'ACEPTADA', respondida_at = now() where id = f.id;
      perform private.notificar(p_destino, 'AMISTAD_ACEPTADA', 'Nuevo amigo', private.nombre(yo) || ' aceptó tu solicitud de amistad.');
      return 'ACEPTADA';
    end if;
    if f.estado = 'RECHAZADA' and f.respondida_at > now() - interval '7 days' then raise exception 'Debes esperar unos días antes de volver a enviarla.'; end if;
  end if;
  if coalesce((select quien_solicita from public.privacidad_social where usuario_id = p_destino), 'todos') = 'nadie' then
    raise exception 'Esta persona no recibe solicitudes de amistad.';
  end if;
  select count(*) into pend from public.amistades where solicitante = yo and estado = 'PENDIENTE';
  if pend >= 30 then raise exception 'Tienes demasiadas solicitudes pendientes (máx. 30).'; end if;
  insert into public.amistades (usuario_a, usuario_b, solicitante, estado) values (a, b, yo, 'PENDIENTE')
    on conflict (usuario_a, usuario_b) do update set solicitante = yo, estado = 'PENDIENTE', created_at = now(), respondida_at = null;
  perform private.notificar(p_destino, 'AMISTAD_SOLICITUD', 'Solicitud de amistad', private.nombre(yo) || ' quiere ser tu amigo.');
  return 'PENDIENTE';
end $$;

create or replace function public.responder_amistad(p_otro uuid, p_acepta boolean) returns void
language plpgsql security definer set search_path = '' as $$
declare yo uuid := private.uid_requerido(); f public.amistades%rowtype;
begin
  select * into f from public.amistades where usuario_a = least(yo, p_otro) and usuario_b = greatest(yo, p_otro) and estado = 'PENDIENTE' and solicitante = p_otro for update;
  if not found then raise exception 'Esa solicitud ya no existe.'; end if;
  update public.amistades set estado = case when p_acepta then 'ACEPTADA' else 'RECHAZADA' end, respondida_at = now() where id = f.id;
  if p_acepta then perform private.notificar(p_otro, 'AMISTAD_ACEPTADA', 'Nuevo amigo', private.nombre(yo) || ' aceptó tu solicitud de amistad.'); end if;
end $$;

create or replace function public.cancelar_solicitud(p_otro uuid) returns void
language plpgsql security definer set search_path = '' as $$
declare yo uuid := private.uid_requerido();
begin
  delete from public.amistades where usuario_a = least(yo, p_otro) and usuario_b = greatest(yo, p_otro) and estado = 'PENDIENTE' and solicitante = yo;
end $$;

create or replace function public.eliminar_amigo(p_otro uuid) returns void
language plpgsql security definer set search_path = '' as $$
declare yo uuid := private.uid_requerido();
begin
  delete from public.amistades where usuario_a = least(yo, p_otro) and usuario_b = greatest(yo, p_otro) and estado = 'ACEPTADA';
end $$;

create or replace function public.seguir(p_otro uuid) returns void
language plpgsql security definer set search_path = '' as $$
declare yo uuid := private.uid_requerido(); n integer;
begin
  if p_otro is null or p_otro = yo then raise exception 'Elige a otra persona.'; end if;
  if not exists (select 1 from public.perfiles where id = p_otro) then raise exception 'Ese jugador no existe.'; end if;
  if private.hay_bloqueo(yo, p_otro) then raise exception 'No se pudo seguir a esta persona.'; end if;
  insert into public.seguidores (seguidor_id, seguido_id) values (yo, p_otro) on conflict do nothing;
  get diagnostics n = row_count;
  if n > 0 then perform private.notificar(p_otro, 'SEGUIDOR_NUEVO', 'Nuevo seguidor', private.nombre(yo) || ' empezó a seguirte.'); end if;
end $$;

create or replace function public.dejar_de_seguir(p_otro uuid) returns void
language plpgsql security definer set search_path = '' as $$
declare yo uuid := private.uid_requerido();
begin delete from public.seguidores where seguidor_id = yo and seguido_id = p_otro; end $$;

create or replace function public.bloquear(p_otro uuid) returns void
language plpgsql security definer set search_path = '' as $$
declare yo uuid := private.uid_requerido();
begin
  if p_otro is null or p_otro = yo then raise exception 'Elige a otra persona.'; end if;
  if not exists (select 1 from public.perfiles where id = p_otro) then raise exception 'Ese jugador no existe.'; end if;
  insert into public.bloqueos (bloqueador_id, bloqueado_id) values (yo, p_otro) on conflict do nothing;
  -- Bloquear corta toda relación: amistad (en cualquier estado) y seguimientos en ambos sentidos.
  delete from public.amistades where usuario_a = least(yo, p_otro) and usuario_b = greatest(yo, p_otro);
  delete from public.seguidores where (seguidor_id = yo and seguido_id = p_otro) or (seguidor_id = p_otro and seguido_id = yo);
end $$;

create or replace function public.desbloquear(p_otro uuid) returns void
language plpgsql security definer set search_path = '' as $$
declare yo uuid := private.uid_requerido();
begin delete from public.bloqueos where bloqueador_id = yo and bloqueado_id = p_otro; end $$;

create or replace function public.guardar_privacidad(p_solicita text, p_escribe text, p_ver_amigos text, p_conexion boolean) returns void
language plpgsql security definer set search_path = '' as $$
declare yo uuid := private.uid_requerido();
begin
  insert into public.privacidad_social (usuario_id, quien_solicita, quien_escribe, ver_amigos, mostrar_conexion, updated_at)
  values (yo, p_solicita, p_escribe, p_ver_amigos, coalesce(p_conexion, true), now())
  on conflict (usuario_id) do update set quien_solicita = excluded.quien_solicita, quien_escribe = excluded.quien_escribe,
    ver_amigos = excluded.ver_amigos, mostrar_conexion = excluded.mostrar_conexion, updated_at = now();
end $$;   -- valores fuera de lista: los rechaza el CHECK de la tabla

-- Mi red completa en una sola lectura (ids; los nombres salen de perfiles en el navegador).
create or replace function public.mi_red() returns jsonb
language plpgsql stable security definer set search_path = '' as $$
declare yo uuid := private.uid_requerido();
begin
  return jsonb_build_object(
    'amigos',     coalesce((select jsonb_agg(case when usuario_a = yo then usuario_b else usuario_a end) from public.amistades where estado = 'ACEPTADA' and yo in (usuario_a, usuario_b)), '[]'::jsonb),
    'recibidas',  coalesce((select jsonb_agg(solicitante order by created_at desc) from public.amistades where estado = 'PENDIENTE' and yo in (usuario_a, usuario_b) and solicitante <> yo), '[]'::jsonb),
    'enviadas',   coalesce((select jsonb_agg(case when usuario_a = yo then usuario_b else usuario_a end order by created_at desc) from public.amistades where estado = 'PENDIENTE' and solicitante = yo), '[]'::jsonb),
    'siguiendo',  coalesce((select jsonb_agg(seguido_id) from public.seguidores where seguidor_id = yo), '[]'::jsonb),
    'seguidores', coalesce((select jsonb_agg(seguidor_id) from public.seguidores where seguido_id = yo), '[]'::jsonb),
    'bloqueados', coalesce((select jsonb_agg(bloqueado_id) from public.bloqueos where bloqueador_id = yo), '[]'::jsonb),
    'privacidad', coalesce((select to_jsonb(p) - 'usuario_id' - 'updated_at' from public.privacidad_social p where usuario_id = yo),
                           jsonb_build_object('quien_solicita','todos','quien_escribe','amigos','ver_amigos','amigos','mostrar_conexion',true))
  );
end $$;

-- Amigos de otra persona, respetando SU privacidad (para su perfil). Devuelve [] si no te corresponde verlos.
create or replace function public.amigos_de(p_usuario uuid) returns jsonb
language plpgsql stable security definer set search_path = '' as $$
declare yo uuid := private.uid_requerido(); modo text;
begin
  if private.hay_bloqueo(yo, p_usuario) then return '[]'::jsonb; end if;
  modo := coalesce((select ver_amigos from public.privacidad_social where usuario_id = p_usuario), 'amigos');
  if not (yo = p_usuario or modo = 'todos' or (modo = 'amigos' and private.son_amigos(yo, p_usuario))) then return '[]'::jsonb; end if;
  return coalesce((select jsonb_agg(case when usuario_a = p_usuario then usuario_b else usuario_a end) from public.amistades where estado = 'ACEPTADA' and p_usuario in (usuario_a, usuario_b)), '[]'::jsonb);
end $$;

do $$ declare f text; begin
  foreach f in array array['solicitar_amistad(uuid)','responder_amistad(uuid,boolean)','cancelar_solicitud(uuid)','eliminar_amigo(uuid)','seguir(uuid)',
    'dejar_de_seguir(uuid)','bloquear(uuid)','desbloquear(uuid)','guardar_privacidad(text,text,text,boolean)','mi_red()','amigos_de(uuid)'] loop
    execute format('revoke all on function public.%s from public, anon', f);
    execute format('grant execute on function public.%s to authenticated', f);
  end loop;
end $$;

do $$ begin
  if not exists (select 1 from pg_publication_tables where pubname = 'supabase_realtime' and tablename = 'amistades') then
    alter publication supabase_realtime add table public.amistades;
  end if;
end $$;

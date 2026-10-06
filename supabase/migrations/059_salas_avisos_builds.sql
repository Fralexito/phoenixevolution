-- 059 · MÓDULO 2 · AMPLIACIÓN: avisos al abrir sala, builds oficiales y control remoto desde /v1/config. Depende de 058.
-- Contrato para la app: claude/contrato-v1.md (v1.1.0). Toda escritura de la app sigue pasando por la Edge Function «phoenix».
--
-- 1) Preferencias del host por sala: publicar_en_pagina, avisar_amigos_host, avisar_amigos_jugadores, anunciar_discord.
--    Quién recibe el aviso SIEMPRE se recorta por: quién puede ver la sala (visibilidad + bloqueos) y la preferencia de avisos
--    de cada destinatario (nueva categoría «salas»). Los jugadores con «mostrar conexión» apagado no se anuncian a sus amigos.
--    Discord solo si la sala es pública Y publicada (si no, sería filtrar una sala de amigos a un canal abierto).
-- 2) builds_oficiales: huellas SHA-256 de los .exe oficiales. Se exige solo cuando phoenix_config.exigir_build = true.
--    OJO (honestidad técnica): la huella la calcula y la envía la propia app; un build modificado podría mentir. Esto frena
--    builds viejos/no oficiales usados por error, no a un atacante decidido. La seguridad real sigue siendo token + host aprobado.
-- 3) phoenix_config (clave → valor) para cambiar versión mínima, intervalos o interruptores sin redesplegar; y
--    dispositivos_host.suspendido para apagar una PC concreta de forma reversible (revocar = definitivo).

-- ─── 1) Preferencias de aviso por sala ──────────────────────────────────────────────────────────────────────────────────
alter table public.salas
  add column if not exists publicar_en_pagina boolean not null default true,
  add column if not exists avisar_amigos_host boolean not null default false,
  add column if not exists avisar_amigos_jugadores boolean not null default false,
  add column if not exists anunciar_discord boolean not null default false,
  add column if not exists avisos_enviados timestamptz;

-- Una sala NO publicada se trata como «privada» para todos salvo host, staff y roles del reto.
drop policy if exists salas_leer on public.salas;
create policy salas_leer on public.salas for select to authenticated
  using (private.puede_ver_sala(host, case when publicar_en_pagina then visibilidad else 'privada' end, reto_id));

drop policy if exists salas_enlace_leer on public.salas_enlace;
create policy salas_enlace_leer on public.salas_enlace for select to authenticated
  using (exists (
    select 1 from public.salas s
    where s.id = sala_id and s.estado in ('preparando', 'abierta', 'en_partida')
      and private.puede_ver_sala(s.host, case when s.publicar_en_pagina then s.visibilidad else 'privada' end, s.reto_id)
      and (s.visibilidad <> 'torneo' or s.host = (select auth.uid()) or private.es_staff()
           or exists (select 1 from private.jugadores_de_reto(s.reto_id) j where j.usuario_id = (select auth.uid())))
  ));

-- Nueva categoría de avisos «salas» (el usuario puede apagarla en Mi perfil → Avisos) y nuevo tipo SALA_ABIERTA.
alter table public.notif_preferencias drop constraint if exists notif_preferencias_categoria_check;
alter table public.notif_preferencias add constraint notif_preferencias_categoria_check
  check (categoria in ('duelos','social','muro','menciones','logros','eventos','salas'));

alter table public.notificaciones drop constraint if exists notificaciones_tipo_check;
alter table public.notificaciones add constraint notificaciones_tipo_check check (tipo in (
  'RETO_DIRECTO','RETO_HOST','RETO_ACEPTADO','RETO_RECHAZADO','SALA_LISTA','CONFIRMAR_PARTIDO','AVISO_FINAL','PARTIDO_CONFIRMADO',
  'PARTIDO_CANCELADO','RETO_EXPIRADO','INVITACION_RETO','UNION_RETO','SALIO_RETO','AMISTAD_SOLICITUD','AMISTAD_ACEPTADA','SEGUIDOR_NUEVO',
  'ESPECTADOR_SOLICITUD','ESPECTADOR_APROBADO','MURO_RESPUESTA','MODERACION','MENCION','LOGRO','RESULTADO_PROPUESTO','RESULTADO_CONFIRMADO',
  'RESULTADO_DISPUTADO','EVENTO','CLAN','SALA_ABIERTA'));

create or replace function private.categoria_notif(p_tipo text) returns text
language sql immutable set search_path = '' as $$
  select case
    when p_tipo in ('AMISTAD_SOLICITUD','AMISTAD_ACEPTADA','SEGUIDOR_NUEVO','CLAN') then 'social'
    when p_tipo = 'MURO_RESPUESTA' then 'muro'
    when p_tipo = 'MENCION' then 'menciones'
    when p_tipo = 'LOGRO' then 'logros'
    when p_tipo = 'EVENTO' then 'eventos'
    when p_tipo = 'SALA_ABIERTA' then 'salas'
    when p_tipo = 'MODERACION' then 'sistema'
    else 'duelos' end
$$;

create or replace function public.mis_preferencias_notif() returns jsonb
language sql stable security definer set search_path = '' as $$
  select jsonb_object_agg(c, coalesce((select p.activa from public.notif_preferencias p where p.usuario_id = (select auth.uid()) and p.categoria = c), true))
  from unnest(array['duelos','social','muro','menciones','logros','eventos','salas']) as c
$$;

create or replace function public.guardar_preferencia_notif(p_categoria text, p_activa boolean) returns void
language plpgsql security definer set search_path = '' as $$
declare yo uuid := private.uid_requerido();
begin
  if p_categoria is null or p_categoria not in ('duelos','social','muro','menciones','logros','eventos','salas') then raise exception 'Categoría de aviso no válida.'; end if;
  if p_activa is null then raise exception 'Indica si quieres recibir estos avisos o no.'; end if;
  insert into public.notif_preferencias (usuario_id, categoria, activa) values (yo, p_categoria, p_activa)
  on conflict (usuario_id, categoria) do update set activa = excluded.activa, updated_at = now();
end $$;

-- Discord: nuevo tipo de envío «sala» (una vez por sala).
alter table public.discord_envios drop constraint if exists discord_envios_tipo_check;
alter table public.discord_envios add constraint discord_envios_tipo_check check (tipo in ('resumen', 'evento', 'prueba', 'uso', 'sala'));

-- ¿Puede este usuario ver esta sala? (versión con usuario explícito, para decidir a quién avisar; misma regla que puede_ver_sala).
create or replace function private.ve_sala(p_uid uuid, p_host uuid, p_visibilidad text, p_reto integer) returns boolean
language sql stable security definer set search_path = '' as $$
  select case
    when p_uid is null then false
    when p_uid = p_host then true
    when private.hay_bloqueo(p_host, p_uid) then false
    when p_reto is not null then
      exists (select 1 from private.jugadores_de_reto(p_reto) j where j.usuario_id = p_uid)
      or exists (select 1 from public.reto_espectadores e where e.reto_id = p_reto and e.usuario_id = p_uid and e.estado = 'APROBADO')
    when p_visibilidad in ('publica', 'torneo') then true
    when p_visibilidad = 'amigos' then private.son_amigos(p_host, p_uid)
    else false
  end
$$;
revoke all on function private.ve_sala(uuid, uuid, text, integer) from public, anon, authenticated;

-- Avisos al abrir: una sola vez por sala y, para amigos, máximo una tanda cada 30 min por host (anti-spam).
-- Lo llama SOLO la Edge Function (service_role). Devuelve un resumen para la respuesta de /v1/sala/abrir.
create or replace function public.sistema_avisar_sala(p_sala uuid) returns jsonb
language plpgsql security definer set search_path = '' as $$
declare s public.salas%rowtype; nombre_host text; vis text; n_host integer := 0; n_jug integer := 0; disc text := 'NO_PEDIDO';
        reciente boolean; titulo text; texto text;
begin
  update public.salas set avisos_enviados = now() where id = p_sala and avisos_enviados is null returning * into s;
  if not found then return jsonb_build_object('enviado', false, 'motivo', 'YA_AVISADA'); end if;
  if not s.publicar_en_pagina then return jsonb_build_object('enviado', false, 'motivo', 'NO_PUBLICADA'); end if;
  vis := s.visibilidad; nombre_host := private.nombre(s.host);
  select exists (select 1 from public.salas o where o.host = s.host and o.id <> s.id and o.avisos_enviados > now() - interval '30 minutes') into reciente;
  titulo := 'Sala abierta';
  texto := nombre_host || ' abrió sala' || coalesce(' · ' || s.juego, '') || coalesce(' (' || s.parche || ')', '') || '.';

  if s.avisar_amigos_host and not reciente then
    with dest as (
      select case when a.usuario_a = s.host then a.usuario_b else a.usuario_a end u
      from public.amistades a where a.estado = 'ACEPTADA' and (a.usuario_a = s.host or a.usuario_b = s.host)
    ), ok as (
      insert into public.notificaciones (usuario_id, tipo, titulo, mensaje, reto_id, enlace)
      select d.u, 'SALA_ABIERTA', titulo, texto, s.reto_id, 'salas/' from dest d
      where private.ve_sala(d.u, s.host, vis, s.reto_id)
      returning 1
    ) select count(*) into n_host from ok;
  end if;

  if s.avisar_amigos_jugadores and s.reto_id is not null and not reciente then
    with jug as (
      select j.usuario_id u from private.jugadores_de_reto(s.reto_id) j
      where coalesce((select p.mostrar_conexion from public.privacidad_social p where p.usuario_id = j.usuario_id), true)
    ), dest as (
      select distinct case when a.usuario_a = j.u then a.usuario_b else a.usuario_a end u, j.u jugador
      from jug j join public.amistades a on a.estado = 'ACEPTADA' and (a.usuario_a = j.u or a.usuario_b = j.u)
    ), ok as (
      insert into public.notificaciones (usuario_id, tipo, titulo, mensaje, reto_id, enlace)
      select distinct on (d.u) d.u, 'SALA_ABIERTA', 'Tu amigo va a jugar', private.nombre(d.jugador) || ' juega en la sala de ' || nombre_host || '.', s.reto_id, 'salas/'
      from dest d
      where d.u <> s.host and d.u not in (select x.u from jug x)
        and not (s.avisar_amigos_host and private.son_amigos(s.host, d.u))        -- ya avisado por la tanda del host
        and not private.hay_bloqueo(d.jugador, d.u)
      order by d.u
      returning 1
    ) select count(*) into n_jug from ok;
  end if;

  if s.anunciar_discord then
    if vis = 'publica' and s.reto_id is null then
      disc := private.discord_enviar('sala', s.id::text, jsonb_build_object('embeds', jsonb_build_array(jsonb_build_object(
        'title', '🎮 Sala abierta · ' || private.discord_limpio(nombre_host),
        'description', private.discord_limpio(coalesce(s.juego, 'Partida'), 60) || coalesce(' · ' || private.discord_limpio(s.parche, 40), '')
                       || coalesce(' · ' || private.discord_limpio(s.region, 40), '') || E'\nPlazas: ' || s.plazas_total,
        'url', private.url_sitio() || 'salas/', 'color', 49407))));
    else
      disc := 'NO_PUBLICA';
    end if;
  end if;
  return jsonb_build_object('enviado', true, 'amigos_host', n_host, 'amigos_jugadores', n_jug, 'discord', disc, 'anti_spam', reciente);
end $$;
revoke all on function public.sistema_avisar_sala(uuid) from public, anon, authenticated;
grant execute on function public.sistema_avisar_sala(uuid) to service_role;

-- ─── 2) Builds oficiales ────────────────────────────────────────────────────────────────────────────────────────────────
create table if not exists public.builds_oficiales (
  id bigint generated always as identity primary key,
  huella_sha256 text not null unique check (huella_sha256 ~ '^[0-9a-f]{64}$'),
  version text not null check (version ~ '^[0-9]+(\.[0-9]+){1,3}$'),
  activo boolean not null default true,
  nota text check (char_length(nota) <= 200),
  creado timestamptz not null default now(),
  creado_por uuid references public.perfiles (id) on delete set null
);
alter table public.builds_oficiales enable row level security;
drop policy if exists builds_oficiales_staff on public.builds_oficiales;
create policy builds_oficiales_staff on public.builds_oficiales for select to authenticated using (private.es_staff());

-- ─── 3) Configuración remota y suspensión de dispositivos ───────────────────────────────────────────────────────────────
create table if not exists public.phoenix_config (
  clave text primary key check (clave in ('version_app_min', 'version_app_recomendada', 'exigir_build', 'intervalos', 'interruptores')),
  valor jsonb not null,
  actualizado timestamptz not null default now(),
  actualizado_por uuid references public.perfiles (id) on delete set null
);
alter table public.phoenix_config enable row level security;
drop policy if exists phoenix_config_staff on public.phoenix_config;
create policy phoenix_config_staff on public.phoenix_config for select to authenticated using (private.es_staff());
insert into public.phoenix_config (clave, valor) values ('exigir_build', 'false'::jsonb) on conflict (clave) do nothing;

alter table public.dispositivos_host
  add column if not exists suspendido timestamptz,
  add column if not exists motivo_suspension text check (char_length(motivo_suspension) <= 200);

revoke all on public.builds_oficiales, public.phoenix_config from anon, authenticated;
grant select on public.builds_oficiales, public.phoenix_config to authenticated;

-- ─── 4) RPC de staff ────────────────────────────────────────────────────────────────────────────────────────────────────
create or replace function public.staff_registrar_build(p_huella text, p_version text, p_nota text default null) returns bigint
language plpgsql security definer set search_path = '' as $$
declare h text := lower(btrim(coalesce(p_huella, ''))); nuevo bigint;
begin
  perform private.uid_requerido();
  if not private.es_staff() then raise exception 'Solo staff.' using errcode = '42501'; end if;
  if h !~ '^[0-9a-f]{64}$' then raise exception 'La huella SHA-256 son 64 caracteres hexadecimales.' using errcode = '22023'; end if;
  insert into public.builds_oficiales (huella_sha256, version, nota, creado_por) values (h, btrim(p_version), left(btrim(p_nota), 200), (select auth.uid()))
  on conflict (huella_sha256) do update set version = excluded.version, nota = excluded.nota, activo = true
  returning id into nuevo;
  perform private.auditar_moderacion('registrar_build', 'builds_oficiales', nuevo::text, btrim(p_version), jsonb_build_object('huella', h), null);
  return nuevo;
end $$;

-- Activa/desactiva un build concreto (p_id) o TODOS los de una versión (p_version).
create or replace function public.staff_build_activo(p_activo boolean, p_id bigint default null, p_version text default null) returns integer
language plpgsql security definer set search_path = '' as $$
declare n integer;
begin
  perform private.uid_requerido();
  if not private.es_staff() then raise exception 'Solo staff.' using errcode = '42501'; end if;
  if p_id is null and p_version is null then raise exception 'Indica un build o una versión.' using errcode = '22023'; end if;
  update public.builds_oficiales set activo = p_activo where (p_id is not null and id = p_id) or (p_id is null and version = btrim(p_version));
  get diagnostics n = row_count;
  perform private.auditar_moderacion(case when p_activo then 'activar_build' else 'desactivar_build' end, 'builds_oficiales',
                                     coalesce(p_id::text, p_version), coalesce(p_version, 'build ' || p_id), null, null);
  return n;
end $$;

create or replace function public.staff_suspender_dispositivo(p_dispositivo uuid, p_suspender boolean, p_motivo text default null) returns void
language plpgsql security definer set search_path = '' as $$
begin
  perform private.uid_requerido();
  if not private.es_staff() then raise exception 'Solo staff.' using errcode = '42501'; end if;
  update public.dispositivos_host set suspendido = case when p_suspender then now() end,
         motivo_suspension = case when p_suspender then left(btrim(p_motivo), 200) end
  where id = p_dispositivo;
  if not found then raise exception 'Dispositivo no encontrado.' using errcode = 'P0002'; end if;
  if p_suspender then
    update public.salas set estado = 'cerrada', cerrada_en = now() where dispositivo = p_dispositivo and estado in ('preparando', 'abierta', 'en_partida');
  end if;
  perform private.auditar_moderacion(case when p_suspender then 'suspender_dispositivo' else 'reactivar_dispositivo' end,
                                     'dispositivos_host', p_dispositivo::text, 'Dispositivo', null, p_motivo);
end $$;

create or replace function public.staff_config_phoenix(p_clave text, p_valor jsonb) returns void
language plpgsql security definer set search_path = '' as $$
begin
  perform private.uid_requerido();
  if not private.es_staff() then raise exception 'Solo staff.' using errcode = '42501'; end if;
  if p_clave in ('version_app_min', 'version_app_recomendada') and (jsonb_typeof(p_valor) <> 'string' or (p_valor #>> '{}') !~ '^[0-9]+(\.[0-9]+){1,3}$') then
    raise exception 'La versión debe ser como 7.0.4.' using errcode = '22023';
  end if;
  if p_clave = 'exigir_build' and jsonb_typeof(p_valor) <> 'boolean' then raise exception 'exigir_build es true o false.' using errcode = '22023'; end if;
  if p_clave in ('intervalos', 'interruptores') and jsonb_typeof(p_valor) <> 'object' then raise exception 'Debe ser un objeto.' using errcode = '22023'; end if;
  insert into public.phoenix_config (clave, valor, actualizado, actualizado_por) values (p_clave, p_valor, now(), (select auth.uid()))
  on conflict (clave) do update set valor = excluded.valor, actualizado = now(), actualizado_por = excluded.actualizado_por;
  perform private.auditar_moderacion('config_phoenix', 'phoenix_config', p_clave, p_clave, jsonb_build_object('valor', p_valor), null);
end $$;

revoke all on function public.staff_registrar_build(text, text, text), public.staff_build_activo(boolean, bigint, text),
  public.staff_suspender_dispositivo(uuid, boolean, text), public.staff_config_phoenix(text, jsonb) from public, anon;
grant execute on function public.staff_registrar_build(text, text, text), public.staff_build_activo(boolean, bigint, text),
  public.staff_suspender_dispositivo(uuid, boolean, text), public.staff_config_phoenix(text, jsonb) to authenticated;

-- 071 · Panel de creadores (verificados por staff) + alquiler de host verificado (pago por fuera o con gemas en garantía).

-- ── Creadores ──────────────────────────────────────────────────────────────────────────────────────────────────────
create table if not exists public.creadores (
  usuario        uuid primary key references auth.users(id) on delete cascade,
  verificado     boolean not null default false,
  plataformas    jsonb not null default '{}'::jsonb,
  juegos         text[] not null default '{}',
  descripcion    text check (descripcion is null or char_length(descripcion) <= 300),
  en_vivo        boolean not null default false,
  en_vivo_desde  timestamptz,
  titulo_live    text check (titulo_live is null or char_length(titulo_live) <= 120),
  enlace_live    text check (enlace_live is null or enlace_live ~ '^https://'),
  solicitado_at  timestamptz not null default now(),
  verificado_por uuid references auth.users(id),
  verificado_at  timestamptz
);
alter table public.creadores enable row level security;
drop policy if exists creadores_leer on public.creadores;
create policy creadores_leer on public.creadores for select to anon, authenticated
  using (verificado or usuario = (select auth.uid()) or (select private.es_staff()));
grant select on public.creadores to anon, authenticated;

create or replace function private.plataformas_validas(p jsonb) returns jsonb
language sql immutable set search_path = '' as $$
  select coalesce(jsonb_object_agg(k, v), '{}'::jsonb) from jsonb_each_text(coalesce(p, '{}'::jsonb)) e(k, v)
  where k in ('twitch', 'youtube', 'kick', 'tiktok', 'facebook') and v ~ '^https://[^\s<>"]{4,200}$'
$$;

create or replace function public.solicitar_creador(p_plataformas jsonb, p_juegos text[], p_descripcion text) returns void
language plpgsql security definer set search_path = '' as $$
declare yo uuid := private.uid_requerido(); pl jsonb := private.plataformas_validas(p_plataformas);
begin
  if pl = '{}'::jsonb then raise exception 'Agrega al menos un canal (enlace https de Twitch, YouTube, Kick, TikTok o Facebook).'; end if;
  insert into public.creadores (usuario, plataformas, juegos, descripcion)
  values (yo, pl, coalesce(p_juegos[1:5], '{}'), left(nullif(btrim(p_descripcion), ''), 300))
  on conflict (usuario) do update set plataformas = excluded.plataformas, juegos = excluded.juegos, descripcion = excluded.descripcion;
end $$;

create or replace function public.creador_en_vivo(p_en_vivo boolean, p_titulo text default null, p_enlace text default null) returns void
language plpgsql security definer set search_path = '' as $$
declare yo uuid := private.uid_requerido();
begin
  if not exists (select 1 from public.creadores where usuario = yo and verificado) then raise exception 'Solo creadores verificados por el staff.'; end if;
  if p_enlace is not null and p_enlace !~ '^https://' then raise exception 'El enlace del directo debe empezar con https://'; end if;
  update public.creadores set en_vivo = p_en_vivo, en_vivo_desde = case when p_en_vivo then now() end,
    titulo_live = case when p_en_vivo then left(nullif(btrim(p_titulo), ''), 120) end, enlace_live = case when p_en_vivo then p_enlace end
  where usuario = yo;
end $$;

create or replace function public.staff_verificar_creador(p_usuario uuid, p_verificado boolean, p_motivo text default null) returns void
language plpgsql security definer set search_path = '' as $$
begin
  if not private.es_staff() then raise exception 'Solo staff.' using errcode = '42501'; end if;
  update public.creadores set verificado = p_verificado, verificado_por = (select auth.uid()), verificado_at = now(),
    en_vivo = case when p_verificado then en_vivo else false end where usuario = p_usuario;
  if not found then raise exception 'Ese usuario no ha solicitado ser creador.'; end if;
  perform private.notificar(p_usuario, 'LOGRO', case when p_verificado then '¡Eres creador verificado!' else 'Verificación de creador retirada' end,
    case when p_verificado then 'Ya apareces en el panel de creadores. Marca «En vivo» cuando transmitas.' else coalesce(left(p_motivo, 200), 'El staff retiró tu verificación.') end, null, null);
  perform private.auditar_moderacion('editar', 'creadores', p_usuario::text, 'Creador ' || private.nombre(p_usuario), jsonb_build_object('verificado', p_verificado), coalesce(p_motivo, ''));
end $$;

-- Lista pública: en vivo primero (un directo marcado hace más de 6 h se da por terminado).
create or replace function public.creadores_lista() returns jsonb
language sql stable security definer set search_path = '' as $$
  select coalesce(jsonb_agg(j order by vivo desc, desde desc nulls last, nombre), '[]'::jsonb) from (
    select (c.en_vivo and c.en_vivo_desde > now() - interval '6 hours') vivo, c.en_vivo_desde desde, private.nombre(c.usuario) nombre,
      jsonb_build_object('id', c.usuario, 'nombre', private.nombre(c.usuario), 'username', p.username, 'avatar_url', p.avatar_url,
        'plataformas', c.plataformas, 'juegos', c.juegos, 'descripcion', c.descripcion,
        'en_vivo', c.en_vivo and c.en_vivo_desde > now() - interval '6 hours', 'en_vivo_desde', c.en_vivo_desde,
        'titulo_live', c.titulo_live, 'enlace_live', c.enlace_live) j
    from public.creadores c join public.perfiles p on p.id = c.usuario where c.verificado) x
$$;

-- ── Alquiler de host ───────────────────────────────────────────────────────────────────────────────────────────────
create table if not exists public.ofertas_host (
  host                    uuid primary key references auth.users(id) on delete cascade,
  activa                  boolean not null default true,
  precio_hora_centimos    integer check (precio_hora_centimos is null or precio_hora_centimos between 0 and 100000),
  precio_partido_centimos integer check (precio_partido_centimos is null or precio_partido_centimos between 0 and 100000),
  acepta_gemas            boolean not null default false,
  gemas_hora              integer check (gemas_hora is null or gemas_hora between 1 and 100000),
  gemas_partido           integer check (gemas_partido is null or gemas_partido between 1 and 100000),
  contacto                text check (contacto is null or char_length(contacto) <= 120),
  notas                   text check (notas is null or char_length(notas) <= 300),
  actualizada             timestamptz not null default now()
);
alter table public.ofertas_host enable row level security;
drop policy if exists ofertas_host_leer on public.ofertas_host;
create policy ofertas_host_leer on public.ofertas_host for select to authenticated using (true);
grant select on public.ofertas_host to authenticated;

create table if not exists public.alquileres_host (
  id          bigint generated always as identity primary key,
  host        uuid not null references auth.users(id),
  cliente     uuid not null references auth.users(id),
  modalidad   text not null check (modalidad in ('horas', 'partidos')),
  cantidad    smallint not null check (cantidad between 1 and 24),
  fecha       timestamptz not null,
  pago        text not null check (pago in ('externo', 'gemas')),
  monto_centimos integer,
  monto_gemas integer,
  mensaje     text check (mensaje is null or char_length(mensaje) <= 300),
  estado      text not null default 'SOLICITADO' check (estado in ('SOLICITADO', 'ACEPTADO', 'RECHAZADO', 'CANCELADO', 'COMPLETADO')),
  creado      timestamptz not null default now(),
  respondido  timestamptz,
  completado  timestamptz,
  check (host <> cliente)
);
create index if not exists alquileres_host_host_idx on public.alquileres_host (host, estado);
create index if not exists alquileres_host_cliente_idx on public.alquileres_host (cliente, estado);
alter table public.alquileres_host enable row level security;
drop policy if exists alquileres_leer on public.alquileres_host;
create policy alquileres_leer on public.alquileres_host for select to authenticated
  using ((select auth.uid()) in (host, cliente) or (select private.es_staff()));
grant select on public.alquileres_host to authenticated;

alter table public.movimientos_tokens drop constraint if exists movimientos_tokens_tipo_check;
alter table public.movimientos_tokens add constraint movimientos_tokens_tipo_check check (tipo in
  ('ganado', 'compra_tienda', 'compra_dinero', 'reembolso', 'ajuste_admin', 'devolucion', 'apuesta_garantia', 'apuesta_premio', 'apuesta_devolucion',
   'alquiler_garantia', 'alquiler_pago', 'alquiler_devolucion'));

do $$ declare c text; begin
  select conname into c from pg_constraint where conrelid = 'public.notificaciones'::regclass and contype = 'c' and pg_get_constraintdef(oid) like '%RETO_DIRECTO%';
  if c is not null then execute format('alter table public.notificaciones drop constraint %I', c); end if;
end $$;
alter table public.notificaciones add constraint notificaciones_tipo_check check (tipo in
  ('RETO_DIRECTO', 'RETO_HOST', 'RETO_ACEPTADO', 'RETO_RECHAZADO', 'SALA_LISTA', 'CONFIRMAR_PARTIDO', 'AVISO_FINAL', 'PARTIDO_CONFIRMADO',
   'PARTIDO_CANCELADO', 'RETO_EXPIRADO', 'INVITACION_RETO', 'UNION_RETO', 'SALIO_RETO', 'AMISTAD_SOLICITUD', 'AMISTAD_ACEPTADA',
   'SEGUIDOR_NUEVO', 'ESPECTADOR_SOLICITUD', 'ESPECTADOR_APROBADO', 'MURO_RESPUESTA', 'MODERACION', 'MENCION', 'LOGRO',
   'RESULTADO_PROPUESTO', 'RESULTADO_CONFIRMADO', 'RESULTADO_DISPUTADO', 'EVENTO', 'CLAN', 'SALA_ABIERTA', 'INVITACION_SALA', 'APUESTA', 'ALQUILER'));

create or replace function public.guardar_oferta_host(p_activa boolean, p_precio_hora integer, p_precio_partido integer,
  p_acepta_gemas boolean, p_gemas_hora integer, p_gemas_partido integer, p_contacto text, p_notas text) returns void
language plpgsql security definer set search_path = '' as $$
declare yo uuid := private.uid_requerido();
begin
  if not exists (select 1 from public.perfiles where id = yo and host_aprobado) then raise exception 'Solo los hosts verificados por el staff pueden alquilar su host.'; end if;
  if p_precio_hora is null and p_precio_partido is null and not (p_acepta_gemas and (p_gemas_hora is not null or p_gemas_partido is not null)) then
    raise exception 'Pon al menos un precio (por hora o por partido).';
  end if;
  insert into public.ofertas_host (host, activa, precio_hora_centimos, precio_partido_centimos, acepta_gemas, gemas_hora, gemas_partido, contacto, notas, actualizada)
  values (yo, p_activa, p_precio_hora, p_precio_partido, p_acepta_gemas, case when p_acepta_gemas then p_gemas_hora end, case when p_acepta_gemas then p_gemas_partido end,
          left(nullif(btrim(p_contacto), ''), 120), left(nullif(btrim(p_notas), ''), 300), now())
  on conflict (host) do update set activa = excluded.activa, precio_hora_centimos = excluded.precio_hora_centimos, precio_partido_centimos = excluded.precio_partido_centimos,
    acepta_gemas = excluded.acepta_gemas, gemas_hora = excluded.gemas_hora, gemas_partido = excluded.gemas_partido,
    contacto = excluded.contacto, notas = excluded.notas, actualizada = now();
end $$;

-- Hosts en alquiler: verificados, oferta activa, con calidad y juegos.
create or replace function public.hosts_en_alquiler() returns jsonb
language sql stable security definer set search_path = '' as $$
  select coalesce(jsonb_agg(j order by (j ->> 'ping_ms')::numeric nulls last), '[]'::jsonb) from (
    select jsonb_build_object('host', o.host, 'nombre', private.nombre(o.host), 'username', p.username, 'avatar_url', p.avatar_url,
      'precio_hora_centimos', o.precio_hora_centimos, 'precio_partido_centimos', o.precio_partido_centimos,
      'acepta_gemas', o.acepta_gemas, 'gemas_hora', o.gemas_hora, 'gemas_partido', o.gemas_partido, 'notas', o.notas,
      'juegos', p.host_catalogo, 'software', p.software_host, 'ancho_banda_mbps', p.ancho_banda_mbps,
      'ping_ms', (select c.ping_mediana from public.calidad_host_resumen c where c.host = o.host order by c.muestras desc limit 1),
      'completados', (select count(*) from public.alquileres_host a where a.host = o.host and a.estado = 'COMPLETADO')) j
    from public.ofertas_host o join public.perfiles p on p.id = o.host
    where o.activa and p.host_aprobado and not private.hay_bloqueo(o.host, (select auth.uid()))) x
$$;

create or replace function public.solicitar_alquiler(p_host uuid, p_modalidad text, p_cantidad integer, p_fecha timestamptz, p_pago text, p_mensaje text) returns jsonb
language plpgsql security definer set search_path = '' as $$
declare yo uuid := private.uid_requerido(); o public.ofertas_host; cent integer; gem integer; id_ bigint;
begin
  select * into o from public.ofertas_host where host = p_host and activa;
  if not found or not exists (select 1 from public.perfiles where id = p_host and host_aprobado) then raise exception 'Ese host no está disponible para alquiler.'; end if;
  if p_host = yo then raise exception 'No puedes alquilarte a ti mismo.'; end if;
  if private.hay_bloqueo(p_host, yo) then raise exception 'Ese host no está disponible para alquiler.'; end if;
  if p_modalidad not in ('horas', 'partidos') or p_cantidad is null or p_cantidad not between 1 and 24 then raise exception 'Elige horas o partidos (entre 1 y 24).'; end if;
  if p_fecha is null or p_fecha < now() - interval '10 minutes' or p_fecha > now() + interval '60 days' then raise exception 'Elige una fecha entre hoy y los próximos 60 días.'; end if;
  if (select count(*) from public.alquileres_host where cliente = yo and estado = 'SOLICITADO') >= 5 then raise exception 'Tienes demasiadas solicitudes pendientes.'; end if;
  cent := p_cantidad * case when p_modalidad = 'horas' then o.precio_hora_centimos else o.precio_partido_centimos end;
  if p_pago = 'gemas' then
    if not o.acepta_gemas then raise exception 'Este host no acepta gemas.'; end if;
    gem := p_cantidad * case when p_modalidad = 'horas' then o.gemas_hora else o.gemas_partido end;
    if gem is null then raise exception 'Este host no tiene precio en gemas para esa modalidad.'; end if;
  elsif p_pago = 'externo' then
    if cent is null then raise exception 'Este host no tiene precio para esa modalidad.'; end if;
  else raise exception 'Elige cómo pagar.'; end if;
  insert into public.alquileres_host (host, cliente, modalidad, cantidad, fecha, pago, monto_centimos, monto_gemas, mensaje)
  values (p_host, yo, p_modalidad, p_cantidad, p_fecha, p_pago, cent, gem, left(nullif(btrim(p_mensaje), ''), 300)) returning id into id_;
  if gem is not null then
    perform private.registrar_movimiento(yo, -gem, 'alquiler_garantia', 'alquiler', 'alquiler' || id_, 'alq_gar:' || id_, 'gemas');
  end if;
  perform private.notificar(p_host, 'ALQUILER', 'Te quieren alquilar el host',
    private.nombre(yo) || ' pide ' || p_cantidad || case when p_modalidad = 'horas' then ' hora(s)' else ' partido(s)' end || ' · ' ||
    case when gem is not null then gem || ' gemas' else 'S/ ' || to_char(cent / 100.0, 'FM9990.00') || ' (pago por fuera)' end, null, null);
  return jsonb_build_object('id', id_, 'monto_centimos', cent, 'monto_gemas', gem);
end $$;

create or replace function private.devolver_alquiler(a public.alquileres_host) returns void
language plpgsql security definer set search_path = '' as $$
begin
  if a.pago = 'gemas' and a.monto_gemas is not null then
    perform private.registrar_movimiento(a.cliente, a.monto_gemas, 'alquiler_devolucion', 'alquiler', 'alquiler' || a.id, 'alq_dev:' || a.id, 'gemas');
  end if;
end $$;

create or replace function public.responder_alquiler(p_id bigint, p_aceptar boolean) returns void
language plpgsql security definer set search_path = '' as $$
declare yo uuid := private.uid_requerido(); a public.alquileres_host;
begin
  select * into a from public.alquileres_host where id = p_id and host = yo for update;
  if not found or a.estado <> 'SOLICITADO' then raise exception 'Esa solicitud ya no está pendiente.'; end if;
  update public.alquileres_host set estado = case when p_aceptar then 'ACEPTADO' else 'RECHAZADO' end, respondido = now() where id = p_id;
  if not p_aceptar then perform private.devolver_alquiler(a); end if;
  perform private.notificar(a.cliente, 'ALQUILER', case when p_aceptar then 'Alquiler aceptado' else 'Alquiler rechazado' end,
    private.nombre(yo) || case when p_aceptar then ' aceptó tu alquiler. Coordinen el horario por mensajes.' else ' no puede esta vez.' || case when a.pago = 'gemas' then ' Tus gemas volvieron a tu billetera.' else '' end end, null, null);
end $$;

-- Cancelar: el cliente mientras esté pendiente o aceptado (antes de la fecha); el host si está aceptado. Siempre devuelve las gemas.
create or replace function public.cancelar_alquiler(p_id bigint) returns void
language plpgsql security definer set search_path = '' as $$
declare yo uuid := private.uid_requerido(); a public.alquileres_host;
begin
  select * into a from public.alquileres_host where id = p_id and yo in (host, cliente) for update;
  if not found or a.estado not in ('SOLICITADO', 'ACEPTADO') then raise exception 'Ese alquiler ya no se puede cancelar.'; end if;
  update public.alquileres_host set estado = 'CANCELADO', respondido = now() where id = p_id;
  perform private.devolver_alquiler(a);
  perform private.notificar(case when yo = a.host then a.cliente else a.host end, 'ALQUILER', 'Alquiler cancelado', private.nombre(yo) || ' canceló el alquiler.', null, null);
end $$;

-- Completar: lo confirma el cliente (o el staff). Con gemas, se le pagan al host.
create or replace function public.completar_alquiler(p_id bigint) returns void
language plpgsql security definer set search_path = '' as $$
declare yo uuid := private.uid_requerido(); a public.alquileres_host;
begin
  select * into a from public.alquileres_host where id = p_id for update;
  if not found or a.estado <> 'ACEPTADO' or not (yo = a.cliente or private.es_staff()) then raise exception 'Solo quien alquiló puede confirmar que el servicio se cumplió.'; end if;
  update public.alquileres_host set estado = 'COMPLETADO', completado = now() where id = p_id;
  if a.pago = 'gemas' and a.monto_gemas is not null then
    perform private.registrar_movimiento(a.host, a.monto_gemas, 'alquiler_pago', 'alquiler', 'alquiler' || a.id, 'alq_pago:' || a.id, 'gemas');
  end if;
  perform private.notificar(a.host, 'ALQUILER', 'Alquiler completado', private.nombre(a.cliente) || ' confirmó el servicio' || case when a.pago = 'gemas' then '. Recibiste ' || a.monto_gemas || ' gemas.' else '.' end, null, null);
end $$;

create or replace function public.mis_alquileres() returns jsonb
language sql stable security definer set search_path = '' as $$
  select coalesce(jsonb_agg(jsonb_build_object('id', a.id, 'soy_host', a.host = (select auth.uid()),
    'otro', private.nombre(case when a.host = (select auth.uid()) then a.cliente else a.host end),
    'modalidad', a.modalidad, 'cantidad', a.cantidad, 'fecha', a.fecha, 'pago', a.pago, 'monto_centimos', a.monto_centimos, 'monto_gemas', a.monto_gemas,
    'mensaje', a.mensaje, 'estado', a.estado, 'creado', a.creado) order by a.creado desc), '[]'::jsonb)
  from public.alquileres_host a where (select auth.uid()) in (a.host, a.cliente) and a.creado > now() - interval '90 days'
$$;

revoke all on function public.solicitar_creador(jsonb, text[], text), public.creador_en_vivo(boolean, text, text), public.staff_verificar_creador(uuid, boolean, text),
  public.guardar_oferta_host(boolean, integer, integer, boolean, integer, integer, text, text), public.hosts_en_alquiler(),
  public.solicitar_alquiler(uuid, text, integer, timestamptz, text, text), public.responder_alquiler(bigint, boolean), public.cancelar_alquiler(bigint),
  public.completar_alquiler(bigint), public.mis_alquileres() from public, anon;
grant execute on function public.solicitar_creador(jsonb, text[], text), public.creador_en_vivo(boolean, text, text), public.staff_verificar_creador(uuid, boolean, text),
  public.guardar_oferta_host(boolean, integer, integer, boolean, integer, integer, text, text), public.hosts_en_alquiler(),
  public.solicitar_alquiler(uuid, text, integer, timestamptz, text, text), public.responder_alquiler(bigint, boolean), public.cancelar_alquiler(bigint),
  public.completar_alquiler(bigint), public.mis_alquileres() to authenticated;
grant execute on function public.creadores_lista() to anon, authenticated;
revoke all on function private.devolver_alquiler(public.alquileres_host), private.plataformas_validas(jsonb) from public, anon, authenticated;

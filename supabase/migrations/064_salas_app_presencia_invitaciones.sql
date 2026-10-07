-- 064 · MÓDULO 2 · Para Phoenix Soda: lista de salas visibles, presencia de amigos e invitaciones. Contrato: claude/contrato-v1.md v1.4.0.
-- La app NO tiene sesión de Supabase (usa token de PC): la Edge Function llama a estas funciones `sistema_*` con el usuario dueño
-- de la PC. Por eso las reglas de visibilidad se REPLICAN aquí con el usuario explícito (misma lógica que las políticas RLS).
-- Piezas:
--   1) invitaciones_sala: el host invita a un amigo → ese amigo puede VER y ENTRAR a esa sala durante 2 h (aunque sea privada).
--   2) presencia_app: latido de la app (disponible/ausente). El estado de un amigo se DEDUCE: hostea sala viva → en_sala/en_partida;
--      aparece en muestras de una sala viva (últimos 2 min) → en_sala/en_partida como invitado; latido < 150 s → disponible/ausente;
--      si no → desconectado. Quien apagó «Mostrar mi conexión» se ve SIEMPRE desconectado.
--   3) Aviso web nuevo INVITACION_SALA (categoría «salas», se puede apagar).

-- ─── 1) Invitaciones ────────────────────────────────────────────────────────────────────────────────────────────────────
create table if not exists public.invitaciones_sala (
  id bigint generated always as identity primary key,
  sala_id uuid not null references public.salas (id) on delete cascade,
  invitado uuid not null references public.perfiles (id) on delete cascade,
  invitado_por uuid not null references public.perfiles (id) on delete cascade,
  creada timestamptz not null default now(),
  expira timestamptz not null default now() + interval '2 hours',
  unique (sala_id, invitado)
);
create index if not exists invitaciones_sala_invitado_idx on public.invitaciones_sala (invitado, expira desc);
alter table public.invitaciones_sala enable row level security;
drop policy if exists invitaciones_sala_leer on public.invitaciones_sala;
create policy invitaciones_sala_leer on public.invitaciones_sala for select to authenticated
  using (invitado = (select auth.uid()) or invitado_por = (select auth.uid()) or private.es_staff());
revoke all on public.invitaciones_sala from anon, authenticated;
grant select on public.invitaciones_sala to authenticated;

create or replace function private.invitado_a(p_uid uuid, p_sala uuid) returns boolean
language sql stable security definer set search_path = '' as $$
  select exists (select 1 from public.invitaciones_sala i where i.sala_id = p_sala and i.invitado = p_uid and i.expira > now())
$$;
revoke all on function private.invitado_a(uuid, uuid) from public, anon;
grant execute on function private.invitado_a(uuid, uuid) to authenticated;

-- Las políticas de la web suman la invitación vigente (ver y entrar).
drop policy if exists salas_leer on public.salas;
create policy salas_leer on public.salas for select to authenticated
  using (
    private.invitado_a((select auth.uid()), id) or
    case when organizacion is not null
      then host = (select auth.uid()) or private.es_staff() or private.rol_en_org(organizacion) is not null
      else private.puede_ver_sala(host, case when publicar_en_pagina then visibilidad else 'privada' end, reto_id)
    end);

drop policy if exists salas_enlace_leer on public.salas_enlace;
create policy salas_enlace_leer on public.salas_enlace for select to authenticated
  using (exists (
    select 1 from public.salas s
    where s.id = sala_id and s.estado in ('preparando', 'abierta', 'en_partida')
      and (private.invitado_a((select auth.uid()), s.id) or
           case when s.organizacion is not null
             then s.host = (select auth.uid()) or private.es_staff() or private.rol_en_org(s.organizacion) is not null
             else private.puede_ver_sala(s.host, case when s.publicar_en_pagina then s.visibilidad else 'privada' end, s.reto_id)
                  and (s.visibilidad <> 'torneo' or s.host = (select auth.uid()) or private.es_staff()
                       or exists (select 1 from private.jugadores_de_reto(s.reto_id) j where j.usuario_id = (select auth.uid())))
           end)
  ));

-- ─── 2) Las mismas reglas con usuario EXPLÍCITO (para la Edge Function, que no tiene auth.uid()) ──────────────────────
create or replace function private.es_staff_de(p_uid uuid) returns boolean
language sql stable security definer set search_path = '' as $$
  select exists (select 1 from public.perfiles p where p.id = p_uid and p.rol in ('ayudante', 'moderador', 'admin'))
$$;

create or replace function private.miembro_org(p_uid uuid, p_org uuid) returns boolean
language sql stable security definer set search_path = '' as $$
  select exists (select 1 from public.org_miembros m where m.organizacion = p_org and m.usuario = p_uid)
$$;

-- ¿p_uid VE la sala? (= política salas_leer).
create or replace function private.ve_sala_de(p_uid uuid, p_sala uuid) returns boolean
language sql stable security definer set search_path = '' as $$
  select coalesce((select
    private.invitado_a(p_uid, s.id) or s.host = p_uid or private.es_staff_de(p_uid) or
    case when s.organizacion is not null then private.miembro_org(p_uid, s.organizacion)
         else private.ve_sala(p_uid, s.host, case when s.publicar_en_pagina then s.visibilidad else 'privada' end, s.reto_id) end
  from public.salas s where s.id = p_sala), false)
$$;

-- ¿p_uid puede ENTRAR (leer el enlace)? (= política salas_enlace_leer).
create or replace function private.entra_sala_de(p_uid uuid, p_sala uuid) returns boolean
language sql stable security definer set search_path = '' as $$
  select coalesce((select s.estado in ('preparando', 'abierta', 'en_partida') and (
    private.invitado_a(p_uid, s.id) or s.host = p_uid or private.es_staff_de(p_uid) or
    case when s.organizacion is not null then private.miembro_org(p_uid, s.organizacion)
         else private.ve_sala(p_uid, s.host, case when s.publicar_en_pagina then s.visibilidad else 'privada' end, s.reto_id)
              and (s.visibilidad <> 'torneo' or exists (select 1 from private.jugadores_de_reto(s.reto_id) j where j.usuario_id = p_uid)) end)
  from public.salas s where s.id = p_sala), false)
$$;
revoke all on function private.es_staff_de(uuid), private.miembro_org(uuid, uuid), private.ve_sala_de(uuid, uuid), private.entra_sala_de(uuid, uuid) from public, anon, authenticated;

-- ─── 3) Lista de salas para la app ──────────────────────────────────────────────────────────────────────────────────────
create or replace function public.sistema_salas_para(p_usuario uuid) returns jsonb
language sql stable security definer set search_path = '' as $$
  select coalesce(jsonb_agg(x.j order by x.invitado desc, x.amigo desc, (x.j ->> 'plazas_libres')::int > 0 desc, x.abierta desc), '[]'::jsonb)
  from (
    select private.invitado_a(p_usuario, s.id) invitado, private.son_amigos(p_usuario, s.host) amigo, s.abierta_en abierta,
      jsonb_build_object(
        'sala_id', s.id, 'soy_host', s.host = p_usuario, 'invitado', private.invitado_a(p_usuario, s.id),
        'host', jsonb_build_object('id', s.host, 'nombre', private.nombre(s.host), 'avatar_url', p.avatar_url, 'amigo', private.son_amigos(p_usuario, s.host)),
        'juego', s.juego, 'parche', s.parche, 'region', s.region, 'modo', s.modo, 'visibilidad', s.visibilidad, 'estado', s.estado,
        'salud', case when s.latido < now() - interval '90 seconds' then 'inestable' when s.estado = 'en_partida' then 'en_partida' else 'viva' end,
        'plazas_total', s.plazas_total, 'plazas_libres', s.plazas_libres, 'limite_espectadores', s.limite_espectadores,
        'abierta_en', s.abierta_en, 'reto_id', s.reto_id, 'organizacion_id', s.organizacion,
        'calidad', (select jsonb_build_object('ping_mediana_ms', c.ping_mediana, 'ping_p95_ms', c.ping_p95, 'perdida_pct', c.perdida_pct, 'muestras', c.muestras,
                      'semaforo', private.semaforo(private.umbrales(s.reglas), c.ping_mediana, null, c.perdida_pct))
                    from public.calidad_host_resumen c where c.host = s.host order by (c.region = coalesce(s.region, '')) desc, c.muestras desc limit 1),
        'enlace', case when private.entra_sala_de(p_usuario, s.id) then (select e.enlace from public.salas_enlace e where e.sala_id = s.id) end) j
    from public.salas s join public.perfiles p on p.id = s.host
    where s.estado in ('preparando', 'abierta', 'en_partida') and private.ve_sala_de(p_usuario, s.id)
    limit 100
  ) x
$$;

-- ─── 4) Presencia de la app y estado de amigos ──────────────────────────────────────────────────────────────────────────
create table if not exists public.presencia_app (
  usuario uuid primary key references public.perfiles (id) on delete cascade,
  estado text not null check (estado in ('disponible', 'ausente', 'en_sala', 'en_partida')),
  sala_id uuid references public.salas (id) on delete set null,
  dispositivo uuid references public.dispositivos_host (id) on delete set null,
  actualizado timestamptz not null default now()
);
alter table public.presencia_app enable row level security;
drop policy if exists presencia_app_leer on public.presencia_app;
create policy presencia_app_leer on public.presencia_app for select to authenticated using (usuario = (select auth.uid()) or private.es_staff());
revoke all on public.presencia_app from anon, authenticated;
grant select on public.presencia_app to authenticated;

create or replace function public.sistema_presencia(p_usuario uuid, p_estado text, p_sala uuid, p_dispositivo uuid) returns void
language sql security definer set search_path = '' as $$
  insert into public.presencia_app (usuario, estado, sala_id, dispositivo, actualizado) values (p_usuario, p_estado, p_sala, p_dispositivo, now())
  on conflict (usuario) do update set estado = excluded.estado, sala_id = excluded.sala_id, dispositivo = excluded.dispositivo, actualizado = now()
$$;

-- Estado de cada amigo de p_usuario (orden: en partido, en sala, disponible, ausente, desconectado; luego nombre).
create or replace function public.sistema_presencia_amigos(p_usuario uuid) returns jsonb
language sql stable security definer set search_path = '' as $$
  with amigos as (
    select case when a.usuario_a = p_usuario then a.usuario_b else a.usuario_a end id
    from public.amistades a where a.estado = 'ACEPTADA' and (a.usuario_a = p_usuario or a.usuario_b = p_usuario)
  ), visibles as (
    select am.id from amigos am
    where not private.hay_bloqueo(p_usuario, am.id)
      and coalesce((select pr.mostrar_conexion from public.privacidad_social pr where pr.usuario_id = am.id), true)
  ), como_host as (
    select distinct on (s.host) s.host id, s.id sala, s.estado, s.latido desde from public.salas s
    where s.host in (select id from visibles) and s.estado in ('preparando', 'abierta', 'en_partida') order by s.host, s.latido desc
  ), como_invitado as (
    select distinct on (m.usuario) m.usuario id, s.id sala, s.estado, m.tomada desde from public.muestras_calidad m join public.salas s on s.id = m.sala_id
    where m.usuario in (select id from visibles) and m.tomada > now() - interval '2 minutes' and s.estado in ('abierta', 'en_partida') order by m.usuario, m.tomada desc
  ), estados as (
    select v.id,
      coalesce(case when h.estado = 'en_partida' then 'en_partida' when h.id is not null then 'en_sala' end,
               case when g.estado = 'en_partida' then 'en_partida' when g.id is not null then 'en_sala' end,
               case when pa.actualizado > now() - interval '150 seconds' then pa.estado end,
               'desconectado') estado,
      coalesce(h.sala, g.sala) sala, coalesce(h.desde, g.desde, case when pa.actualizado > now() - interval '150 seconds' then pa.actualizado end) desde
    from visibles v
    left join como_host h on h.id = v.id left join como_invitado g on g.id = v.id left join public.presencia_app pa on pa.usuario = v.id
  )
  select coalesce(jsonb_agg(jsonb_build_object(
      'usuario_id', e.id, 'nombre', private.nombre(e.id), 'avatar_url', p.avatar_url,
      'estado', case when e.estado in ('en_sala', 'en_partida') and e.sala is null then 'disponible' else e.estado end,
      'sala_id', case when e.sala is not null and private.ve_sala_de(p_usuario, e.sala) then e.sala end, 'desde', e.desde)
    order by array_position(array['en_partida', 'en_sala', 'disponible', 'ausente', 'desconectado'], e.estado), private.nombre(e.id)), '[]'::jsonb)
  from estados e join public.perfiles p on p.id = e.id
$$;

-- Lista COMPLETA: los amigos que apagaron «Mostrar mi conexión» se añaden como «desconectado» (la lista está completa sin revelar nada).
create or replace function public.sistema_presencia_amigos_completa(p_usuario uuid) returns jsonb
language sql stable security definer set search_path = '' as $$
  select public.sistema_presencia_amigos(p_usuario) || coalesce((
    select jsonb_agg(jsonb_build_object('usuario_id', am.id, 'nombre', private.nombre(am.id), 'avatar_url', p.avatar_url, 'estado', 'desconectado', 'sala_id', null, 'desde', null)
      order by private.nombre(am.id))
    from (select case when a.usuario_a = p_usuario then a.usuario_b else a.usuario_a end id
          from public.amistades a where a.estado = 'ACEPTADA' and (a.usuario_a = p_usuario or a.usuario_b = p_usuario)) am
    join public.perfiles p on p.id = am.id
    where not private.hay_bloqueo(p_usuario, am.id)
      and not coalesce((select pr.mostrar_conexion from public.privacidad_social pr where pr.usuario_id = am.id), true)), '[]'::jsonb)
$$;

-- ─── 5) Invitar a un amigo a la sala del host ───────────────────────────────────────────────────────────────────────────
alter table public.notificaciones drop constraint if exists notificaciones_tipo_check;
alter table public.notificaciones add constraint notificaciones_tipo_check check (tipo in (
  'RETO_DIRECTO','RETO_HOST','RETO_ACEPTADO','RETO_RECHAZADO','SALA_LISTA','CONFIRMAR_PARTIDO','AVISO_FINAL','PARTIDO_CONFIRMADO',
  'PARTIDO_CANCELADO','RETO_EXPIRADO','INVITACION_RETO','UNION_RETO','SALIO_RETO','AMISTAD_SOLICITUD','AMISTAD_ACEPTADA','SEGUIDOR_NUEVO',
  'ESPECTADOR_SOLICITUD','ESPECTADOR_APROBADO','MURO_RESPUESTA','MODERACION','MENCION','LOGRO','RESULTADO_PROPUESTO','RESULTADO_CONFIRMADO',
  'RESULTADO_DISPUTADO','EVENTO','CLAN','SALA_ABIERTA','INVITACION_SALA'));

create or replace function private.categoria_notif(p_tipo text) returns text
language sql immutable set search_path = '' as $$
  select case
    when p_tipo in ('AMISTAD_SOLICITUD','AMISTAD_ACEPTADA','SEGUIDOR_NUEVO','CLAN') then 'social'
    when p_tipo = 'MURO_RESPUESTA' then 'muro'
    when p_tipo = 'MENCION' then 'menciones'
    when p_tipo = 'LOGRO' then 'logros'
    when p_tipo = 'EVENTO' then 'eventos'
    when p_tipo in ('SALA_ABIERTA', 'INVITACION_SALA') then 'salas'
    when p_tipo = 'MODERACION' then 'sistema'
    else 'duelos' end
$$;

-- → { ok, invitacion_id, notificado } o { error: CODIGO }. Reglas: la sala es de ESTA PC y está viva; son amigos; sin bloqueos;
-- máx. 15 invitaciones por host cada 10 min; reinvitar al mismo amigo a la misma sala antes de 2 min = DEMASIADOS_INTENTOS.
-- Reinvitar renueva la vigencia (2 h). El aviso web respeta la preferencia «Salas» del invitado (trigger de la 033).
create or replace function public.sistema_invitar(p_host uuid, p_dispositivo uuid, p_sala uuid, p_invitado uuid) returns jsonb
language plpgsql security definer set search_path = '' as $$
declare s public.salas%rowtype; prev public.invitaciones_sala%rowtype; iid bigint; n integer;
begin
  select * into s from public.salas where id = p_sala and dispositivo = p_dispositivo;
  if not found then return jsonb_build_object('error', 'SALA_NO_ENCONTRADA'); end if;
  if s.estado not in ('preparando', 'abierta', 'en_partida') then return jsonb_build_object('error', 'SALA_CERRADA'); end if;
  if p_invitado = p_host or not private.son_amigos(p_host, p_invitado) or private.hay_bloqueo(p_host, p_invitado) then
    return jsonb_build_object('error', 'NO_SON_AMIGOS');
  end if;
  select count(*) into n from public.invitaciones_sala where invitado_por = p_host and creada > now() - interval '10 minutes';
  select * into prev from public.invitaciones_sala where sala_id = p_sala and invitado = p_invitado;
  if n >= 15 or (prev.id is not null and prev.creada > now() - interval '2 minutes') then return jsonb_build_object('error', 'DEMASIADOS_INTENTOS'); end if;
  insert into public.invitaciones_sala (sala_id, invitado, invitado_por) values (p_sala, p_invitado, p_host)
  on conflict (sala_id, invitado) do update set creada = now(), expira = now() + interval '2 hours', invitado_por = excluded.invitado_por
  returning id into iid;
  insert into public.notificaciones (usuario_id, tipo, titulo, mensaje, reto_id, enlace)
  values (p_invitado, 'INVITACION_SALA', 'Te invitan a jugar',
          private.nombre(p_host) || ' te invita a su sala' || coalesce(' · ' || s.juego, '') || coalesce(' (' || s.parche || ')', '') || '. Pídele el enlace o ábrelo en Phoenix Soda.',
          s.reto_id, 'mensajes/?con=' || p_host::text);
  get diagnostics n = row_count;           -- 0 si el invitado apagó los avisos de «Salas» (el trigger lo descarta sin error)
  return jsonb_build_object('ok', true, 'invitacion_id', iid, 'notificado', n > 0, 'expira', now() + interval '2 hours');
end $$;

-- Invitaciones vigentes que recibió p_usuario (para la app del invitado si también es host).
create or replace function public.sistema_mis_invitaciones(p_usuario uuid) returns jsonb
language sql stable security definer set search_path = '' as $$
  select coalesce(jsonb_agg(jsonb_build_object('invitacion_id', i.id, 'sala_id', i.sala_id, 'de', jsonb_build_object('id', i.invitado_por, 'nombre', private.nombre(i.invitado_por)),
      'juego', s.juego, 'parche', s.parche, 'expira', i.expira, 'enlace', (select e.enlace from public.salas_enlace e where e.sala_id = s.id)) order by i.creada desc), '[]'::jsonb)
  from public.invitaciones_sala i join public.salas s on s.id = i.sala_id
  where i.invitado = p_usuario and i.expira > now() and s.estado in ('preparando', 'abierta', 'en_partida')
$$;

revoke all on function public.sistema_salas_para(uuid), public.sistema_presencia(uuid, text, uuid, uuid), public.sistema_presencia_amigos(uuid),
  public.sistema_presencia_amigos_completa(uuid), public.sistema_invitar(uuid, uuid, uuid, uuid), public.sistema_mis_invitaciones(uuid) from public, anon, authenticated;
grant execute on function public.sistema_salas_para(uuid), public.sistema_presencia(uuid, text, uuid, uuid), public.sistema_presencia_amigos(uuid),
  public.sistema_presencia_amigos_completa(uuid), public.sistema_invitar(uuid, uuid, uuid, uuid), public.sistema_mis_invitaciones(uuid) to service_role;

-- Limpieza: invitaciones vencidas hace más de 1 día (en la purga diaria de la 058/061).
create or replace function private.purgar_salas() returns void
language plpgsql security definer set search_path = '' as $$
begin
  delete from public.muestras_calidad where tomada < now() - interval '14 days';
  delete from public.codigos_emparejamiento where expira < now() - interval '1 day';
  delete from public.pruebas_conexion where creada < now() - interval '90 days';
  delete from public.invitaciones_sala where expira < now() - interval '1 day';
end $$;

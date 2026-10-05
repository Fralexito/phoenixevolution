-- 036 · OLA B (2/5, adelantada) · MARCADOR CONFIRMADO POR AMBOS LÍDERES + ESTADÍSTICAS + LOGROS DE VICTORIAS. Depende de 030-035 y de los duelos (retos_matchmaking, reto_participantes).
-- Regla de oro: un resultado solo cuenta si los DOS líderes están de acuerdo (nadie puede inflar sus estadísticas solo).
--   Líder A = retador · Líder B = quien aceptó (rival). Los jugadores de equipo cuentan según su equipo.
-- Flujo: duelo FINALIZADO → un líder PROPONE goles → el otro CONFIRMA o DISPUTA → si disputa, puede contraproponer (máx. 3 intentos) o decide un moderador.
-- Cada tabla va cerrada (sin acceso directo): todo por funciones. El host NO cuenta como jugador.

-- ─── 1) Tabla ──────────────────────────────────────────────────────────────────────────────────────────────────
create table if not exists public.resultados_duelo (
  reto_id integer primary key references public.retos_matchmaking(id) on delete cascade,
  goles_a smallint not null check (goles_a between 0 and 30),
  goles_b smallint not null check (goles_b between 0 and 30),
  estado text not null default 'PROPUESTO' check (estado in ('PROPUESTO','CONFIRMADO','DISPUTADO')),
  propuesto_por uuid not null references auth.users(id),
  intentos smallint not null default 1 check (intentos between 1 and 3),
  confirmado_por uuid references auth.users(id),
  resuelto_por_staff boolean not null default false,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);
create index if not exists resultados_duelo_estado_idx on public.resultados_duelo (estado, updated_at desc);
alter table public.resultados_duelo enable row level security;
revoke all on public.resultados_duelo from anon, authenticated;

-- ─── 2) Avisos nuevos (categoría «duelos») ─────────────────────────────────────────────────────────────────────
alter table public.notificaciones drop constraint if exists notificaciones_tipo_check;
alter table public.notificaciones add constraint notificaciones_tipo_check check (tipo in (
  'RETO_DIRECTO','RETO_HOST','RETO_ACEPTADO','RETO_RECHAZADO','SALA_LISTA','CONFIRMAR_PARTIDO','AVISO_FINAL','PARTIDO_CONFIRMADO','PARTIDO_CANCELADO',
  'RETO_EXPIRADO','INVITACION_RETO','UNION_RETO','SALIO_RETO','AMISTAD_SOLICITUD','AMISTAD_ACEPTADA','SEGUIDOR_NUEVO','ESPECTADOR_SOLICITUD',
  'ESPECTADOR_APROBADO','MURO_RESPUESTA','MODERACION','MENCION','LOGRO','RESULTADO_PROPUESTO','RESULTADO_CONFIRMADO','RESULTADO_DISPUTADO'));

-- ─── 3) Ayudantes ──────────────────────────────────────────────────────────────────────────────────────────────
-- Lado de una persona en un duelo: 'A' (retador y su equipo), 'B' (rival y su equipo) o NULL (no juega; el host tampoco).
create or replace function private.lado_en_reto(p_reto integer, p_uid uuid) returns text
language sql stable security definer set search_path = '' as $$
  select case
    when r.retador_id = p_uid then 'A'
    when r.rival_id = p_uid then 'B'
    else (select rp.equipo from public.reto_participantes rp where rp.reto_id = r.id and rp.usuario_id = p_uid and rp.estado = 'CONFIRMADO' and rp.equipo in ('A','B') limit 1)
  end from public.retos_matchmaking r where r.id = p_reto
$$;
revoke all on function private.lado_en_reto(integer, uuid) from public, anon, authenticated;

-- Todos los jugadores de un duelo con su lado (para avisos, estadísticas y logros).
create or replace function private.jugadores_de_reto(p_reto integer) returns table (usuario_id uuid, lado text)
language sql stable security definer set search_path = '' as $$
  select x.u, x.l from (
    select r.retador_id u, 'A'::text l from public.retos_matchmaking r where r.id = p_reto
    union select r.rival_id, 'B' from public.retos_matchmaking r where r.id = p_reto
    union select rp.usuario_id, rp.equipo from public.reto_participantes rp where rp.reto_id = p_reto and rp.estado = 'CONFIRMADO' and rp.equipo in ('A','B')
  ) x where x.u is not null
$$;
revoke all on function private.jugadores_de_reto(integer) from public, anon, authenticated;

-- ─── 4) Proponer / confirmar / disputar ────────────────────────────────────────────────────────────────────────
-- Proponer un marcador (o contraproponer tras una disputa). Solo un LÍDER y solo con el duelo ya FINALIZADO.
create or replace function public.proponer_resultado(p_reto_id integer, p_goles_a integer, p_goles_b integer) returns jsonb
language plpgsql security definer set search_path = '' as $$
declare yo uuid := private.uid_requerido(); r public.retos_matchmaking; ex public.resultados_duelo; otro uuid;
begin
  if p_goles_a is null or p_goles_b is null or p_goles_a not between 0 and 30 or p_goles_b not between 0 and 30 then raise exception 'Los goles deben ser números entre 0 y 30.'; end if;
  select * into r from public.retos_matchmaking where id = p_reto_id;
  if not found or r.estado::text <> 'FINALIZADO' then raise exception 'Solo se puede registrar el marcador de un duelo finalizado.'; end if;
  if r.rival_id is null or yo not in (r.retador_id, r.rival_id) then
    raise exception 'Solo los líderes del duelo (retador y rival) pueden registrar el marcador.'; end if;
  select * into ex from public.resultados_duelo where reto_id = p_reto_id for update;
  if found then
    if ex.estado = 'CONFIRMADO' then raise exception 'Este resultado ya fue confirmado y no se puede cambiar.'; end if;
    if ex.estado = 'PROPUESTO' and ex.propuesto_por <> yo then raise exception 'Hay una propuesta esperando tu respuesta: confírmala o discútela.'; end if;
    if ex.intentos >= 3 then raise exception 'Se agotaron los intentos: un moderador decidirá el resultado.'; end if;
    update public.resultados_duelo set goles_a = p_goles_a, goles_b = p_goles_b, estado = 'PROPUESTO', propuesto_por = yo, intentos = ex.intentos + 1, updated_at = now() where reto_id = p_reto_id;
  else
    insert into public.resultados_duelo (reto_id, goles_a, goles_b, propuesto_por) values (p_reto_id, p_goles_a, p_goles_b, yo);
  end if;
  otro := case when yo = r.retador_id then r.rival_id else r.retador_id end;
  perform private.notificar(otro, 'RESULTADO_PROPUESTO', 'Confirma el marcador', private.nombre(yo) || ' propone ' || p_goles_a || ' - ' || p_goles_b || ' (retador - rival). Confírmalo o discútelo.', p_reto_id);
  return public.resultado_de_reto(p_reto_id);
end $$;

-- Responder a la propuesta del otro líder: confirmar (true) o disputar (false).
create or replace function public.responder_resultado(p_reto_id integer, p_confirmar boolean) returns jsonb
language plpgsql security definer set search_path = '' as $$
declare yo uuid := private.uid_requerido(); r public.retos_matchmaking; ex public.resultados_duelo; j record;
begin
  if p_confirmar is null then raise exception 'Indica si confirmas o disputas el resultado.'; end if;
  select * into r from public.retos_matchmaking where id = p_reto_id;
  if not found or r.rival_id is null or yo not in (r.retador_id, r.rival_id) then raise exception 'Solo los líderes del duelo pueden responder al marcador.'; end if;
  select * into ex from public.resultados_duelo where reto_id = p_reto_id for update;
  if not found or ex.estado <> 'PROPUESTO' then raise exception 'No hay ninguna propuesta pendiente de respuesta.'; end if;
  if ex.propuesto_por = yo then raise exception 'No puedes responder a tu propia propuesta: espera al otro líder.'; end if;
  if p_confirmar then
    update public.resultados_duelo set estado = 'CONFIRMADO', confirmado_por = yo, updated_at = now() where reto_id = p_reto_id;
    perform private.notificar(ex.propuesto_por, 'RESULTADO_CONFIRMADO', 'Marcador confirmado', 'Se confirmó ' || ex.goles_a || ' - ' || ex.goles_b || ' y ya cuenta en tus estadísticas.', p_reto_id);
  else
    update public.resultados_duelo set estado = 'DISPUTADO', updated_at = now() where reto_id = p_reto_id;
    perform private.notificar(ex.propuesto_por, 'RESULTADO_DISPUTADO', 'Marcador disputado', private.nombre(yo) || ' no está de acuerdo con ' || ex.goles_a || ' - ' || ex.goles_b || '. Pueden proponer otro (hasta ' || (3 - ex.intentos) || ' intentos más) o pedir a un moderador.', p_reto_id);
  end if;
  return public.resultado_de_reto(p_reto_id);
end $$;

-- Un moderador decide una disputa (o un resultado agotado). Queda en la auditoría.
create or replace function public.resolver_resultado_staff(p_reto_id integer, p_goles_a integer, p_goles_b integer, p_motivo text) returns jsonb
language plpgsql security definer set search_path = '' as $$
declare yo uuid := private.uid_requerido(); ex public.resultados_duelo; mot text := btrim(coalesce(p_motivo, '')); j record;
begin
  if not private.es_moderador() then raise exception 'No tienes permiso para resolver resultados.'; end if;
  if char_length(mot) < 5 then raise exception 'Escribe el motivo de tu decisión (mínimo 5 letras).'; end if;
  if p_goles_a is null or p_goles_b is null or p_goles_a not between 0 and 30 or p_goles_b not between 0 and 30 then raise exception 'Los goles deben ser números entre 0 y 30.'; end if;
  select * into ex from public.resultados_duelo where reto_id = p_reto_id for update;
  if not found or ex.estado <> 'DISPUTADO' then raise exception 'Solo se pueden resolver resultados disputados.'; end if;
  update public.resultados_duelo set goles_a = p_goles_a, goles_b = p_goles_b, estado = 'CONFIRMADO', confirmado_por = yo, resuelto_por_staff = true, updated_at = now() where reto_id = p_reto_id;
  perform private.auditar_moderacion('editar', 'resultados_duelo', p_reto_id::text, 'Resultado de duelo #' || p_reto_id, jsonb_build_object('marcador', jsonb_build_array(ex.goles_a || '-' || ex.goles_b, p_goles_a || '-' || p_goles_b)), mot);
  for j in select usuario_id from private.jugadores_de_reto(p_reto_id) loop
    perform private.notificar(j.usuario_id, 'RESULTADO_CONFIRMADO', 'Marcador resuelto por moderación', 'Se fijó ' || p_goles_a || ' - ' || p_goles_b || '. Motivo: ' || left(mot, 150), p_reto_id);
  end loop;
  return public.resultado_de_reto(p_reto_id);
end $$;

-- ─── 5) Lectura ────────────────────────────────────────────────────────────────────────────────────────────────
-- Estado del marcador de un duelo (lo ven quienes juegan, el host y moderación). → null si no existe o no puedes verlo.
create or replace function public.resultado_de_reto(p_reto_id integer) returns jsonb
language plpgsql stable security definer set search_path = '' as $$
declare yo uuid := (select auth.uid()); r public.retos_matchmaking; ex public.resultados_duelo;
begin
  if yo is null then return null; end if;
  select * into r from public.retos_matchmaking where id = p_reto_id;
  if not found then return null; end if;
  if not (private.lado_en_reto(p_reto_id, yo) is not null or yo = r.host_id or private.es_moderador()) then return null; end if;
  select * into ex from public.resultados_duelo where reto_id = p_reto_id;
  return jsonb_build_object('reto_id', p_reto_id, 'finalizado', r.estado::text = 'FINALIZADO', 'existe', found,
    'goles_a', ex.goles_a, 'goles_b', ex.goles_b, 'estado', ex.estado, 'propuesto_por', ex.propuesto_por, 'intentos', ex.intentos,
    'soy_lider', yo in (r.retador_id, r.rival_id), 'lado', private.lado_en_reto(p_reto_id, yo),
    'puedo_responder', found and ex.estado = 'PROPUESTO' and ex.propuesto_por <> yo and yo in (r.retador_id, r.rival_id),
    'puedo_proponer', r.estado::text = 'FINALIZADO' and r.rival_id is not null and yo in (r.retador_id, r.rival_id)
      and (not found or (ex.estado = 'DISPUTADO' and ex.intentos < 3)),
    'agotado', found and ex.estado = 'DISPUTADO' and ex.intentos >= 3);
end $$;

-- Mis duelos con marcador por resolver (para el aviso «tienes N marcadores pendientes»).
create or replace function public.mis_resultados_pendientes() returns jsonb
language plpgsql stable security definer set search_path = '' as $$
declare yo uuid := private.uid_requerido();
begin
  return coalesce((select jsonb_agg(jsonb_build_object('reto_id', r.id, 'estado', coalesce(x.estado, 'SIN_MARCADOR'), 'goles_a', x.goles_a, 'goles_b', x.goles_b, 'intentos', x.intentos, 'propuesto_por', x.propuesto_por,
            'me_toca', (x.estado = 'PROPUESTO' and x.propuesto_por <> yo) or (x.estado is null) or (x.estado = 'DISPUTADO' and x.intentos < 3 and x.propuesto_por <> yo)) order by r.cerrado_at desc nulls last)
    from public.retos_matchmaking r left join public.resultados_duelo x on x.reto_id = r.id
    where r.estado::text = 'FINALIZADO' and r.rival_id is not null and yo in (r.retador_id, r.rival_id)
      and r.cerrado_at > now() - interval '30 days' and coalesce(x.estado, 'SIN_MARCADOR') <> 'CONFIRMADO'), '[]'::jsonb);
end $$;

-- Estadísticas de una persona (solo duelos con marcador CONFIRMADO). Las ve quien puede ver su muro.
create or replace function public.estadisticas_de(p_usuario uuid) returns jsonb
language plpgsql stable security definer set search_path = '' as $$
declare yo uuid := (select auth.uid()); e record;
begin
  if p_usuario is null or not private.puede_ver_muro(p_usuario, yo) then return jsonb_build_object('visible', false); end if;
  select count(*)::int jugados,
         count(*) filter (where g_pro > g_contra)::int victorias, count(*) filter (where g_pro = g_contra)::int empates, count(*) filter (where g_pro < g_contra)::int derrotas,
         coalesce(sum(g_pro), 0)::int gf, coalesce(sum(g_contra), 0)::int gc into e
  from (select case jd.lado when 'A' then x.goles_a else x.goles_b end g_pro, case jd.lado when 'A' then x.goles_b else x.goles_a end g_contra
        from public.resultados_duelo x join lateral private.jugadores_de_reto(x.reto_id) jd on jd.usuario_id = p_usuario where x.estado = 'CONFIRMADO') t;
  return jsonb_build_object('visible', true, 'jugados', e.jugados, 'victorias', e.victorias, 'empates', e.empates, 'derrotas', e.derrotas, 'gf', e.gf, 'gc', e.gc,
    'efectividad', case when e.jugados > 0 then round((e.victorias * 3 + e.empates)::numeric * 100 / (e.jugados * 3)) else null end);
end $$;

-- ─── 6) Al confirmarse: sube «partidos_jugados» y se evalúan logros ───────────────────────────────────────────
create or replace function private.trg_resultado_confirmado() returns trigger
language plpgsql security definer set search_path = '' as $$
declare j record;
begin
  if new.estado = 'CONFIRMADO' and old.estado is distinct from 'CONFIRMADO' then
    for j in select usuario_id from private.jugadores_de_reto(new.reto_id) loop
      begin update public.perfiles set partidos_jugados = coalesce(partidos_jugados, 0) + 1 where id = j.usuario_id; exception when others then raise warning '[resultado] partidos_jugados %: %', j.usuario_id, sqlerrm; end;
      perform private.evaluar_logros(j.usuario_id);
    end loop;
  end if;
  return null;
exception when others then raise warning '[resultado] reto %: %', new.reto_id, sqlerrm; return null;
end $$;
revoke all on function private.trg_resultado_confirmado() from public, anon, authenticated;
drop trigger if exists resultado_confirmado on public.resultados_duelo;
create trigger resultado_confirmado after update of estado on public.resultados_duelo for each row execute function private.trg_resultado_confirmado();

-- ─── 7) Logros de victorias (se amplía el catálogo y la medición de 035) ───────────────────────────────────────
alter table public.logros_catalogo drop constraint if exists logros_catalogo_metrica_check;
alter table public.logros_catalogo add constraint logros_catalogo_metrica_check check (metrica in ('duelos','anfitrion','posts','clips','amigos','seguidores','reacciones','dias','perfil_completo','victorias','resultados'));
insert into public.logros_catalogo (id, categoria, nombre, descripcion, icono, nivel, metrica, objetivo, orden) values
  ('primera_victoria', 'duelos', 'Primera victoria', 'Gana un duelo con marcador confirmado.',       'fa-medal',       'bronce', 'victorias', 1,  13),
  ('ganador_10',       'duelos', 'Ganador',          'Gana 10 duelos con marcador confirmado.',     'fa-crown',       'plata',  'victorias', 10, 14),
  ('ganador_50',       'duelos', 'Imparable',        'Gana 50 duelos con marcador confirmado.',     'fa-ranking-star','oro',    'victorias', 50, 15),
  ('fair_play_10',     'duelos', 'Palabra de jugador','Cierra 10 duelos con el marcador confirmado por ambos.', 'fa-handshake', 'plata', 'resultados', 10, 16)
on conflict (id) do nothing;

create or replace function private.metricas_logros(p_uid uuid) returns jsonb
language sql stable security definer set search_path = '' as $$
  select jsonb_build_object(
    'duelos', (select count(*) from public.retos_matchmaking r where r.estado::text = 'FINALIZADO'
                 and (r.retador_id = p_uid or r.rival_id = p_uid
                      or exists (select 1 from public.reto_participantes rp where rp.reto_id = r.id and rp.usuario_id = p_uid and rp.estado = 'CONFIRMADO'))),
    'anfitrion', (select count(*) from public.retos_matchmaking r where r.estado::text = 'FINALIZADO' and r.host_id = p_uid),
    'posts', (select count(*) from public.muro_publicaciones m where m.autor_id = p_uid and not m.oculto),
    'clips', (select count(*) from public.muro_clips c where c.autor_id = p_uid and not c.oculto),
    'amigos', (select count(*) from public.amistades a where a.estado = 'ACEPTADA' and p_uid in (a.usuario_a, a.usuario_b)),
    'seguidores', (select count(*) from public.seguidores s where s.seguido_id = p_uid),
    'reacciones', (select count(*) from public.muro_reacciones x join public.muro_publicaciones m on m.id = x.publicacion_id where m.autor_id = p_uid and x.usuario_id <> p_uid and not m.oculto),
    'dias', coalesce((select floor(extract(epoch from (now() - pf.created_at)) / 86400)::int from public.perfiles pf where pf.id = p_uid), 0),
    'perfil_completo', coalesce((select case when pf.perfil_completo then 1 else 0 end from public.perfiles pf where pf.id = p_uid), 0),
    'resultados', (select count(*) from public.resultados_duelo x join lateral private.jugadores_de_reto(x.reto_id) jd on jd.usuario_id = p_uid where x.estado = 'CONFIRMADO' and not x.resuelto_por_staff),
    'victorias', (select count(*) from public.resultados_duelo x join lateral private.jugadores_de_reto(x.reto_id) jd on jd.usuario_id = p_uid
                   where x.estado = 'CONFIRMADO' and ((jd.lado = 'A' and x.goles_a > x.goles_b) or (jd.lado = 'B' and x.goles_b > x.goles_a))))
$$;
revoke all on function private.metricas_logros(uuid) from public, anon, authenticated;

-- ─── 8) Permisos ───────────────────────────────────────────────────────────────────────────────────────────────
revoke all on function public.proponer_resultado(integer, integer, integer), public.responder_resultado(integer, boolean), public.resolver_resultado_staff(integer, integer, integer, text),
  public.resultado_de_reto(integer), public.mis_resultados_pendientes() from public, anon;
revoke all on function public.estadisticas_de(uuid) from public;
grant execute on function public.proponer_resultado(integer, integer, integer), public.responder_resultado(integer, boolean), public.resolver_resultado_staff(integer, integer, integer, text),
  public.resultado_de_reto(integer), public.mis_resultados_pendientes() to authenticated;
grant execute on function public.estadisticas_de(uuid) to anon, authenticated;

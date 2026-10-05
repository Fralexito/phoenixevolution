-- 032 · REPORTES, MODERACIÓN Y SANCIONES. Seguridad, fase 3.
-- Depende de: 017 (amistades, bloqueos), 018 (chat), 021-027 (muro), 030 (roles/auditoría) y 031 (límites).
-- Idempotente: se puede ejecutar varias veces.
--
-- MAPA DE LA MIGRACIÓN (de arriba hacia abajo):
--   1. «oculto» en publicaciones, respuestas, clips e historias (el moderador OCULTA, no borra: se puede revertir).
--   2. Tabla `reportes` unificada (usuario, publicación, respuesta, clip, historia, mensaje). Guarda una FOTO del contenido
--      al reportar, para que si lo borran o lo editan el moderador siga viendo qué se denunció.
--   3. Tabla `sanciones` (advertencia · suspensión temporal · baneo) + «candado»: un trigger BEFORE INSERT impide que una
--      cuenta sancionada escriba, SEA CUAL SEA la vía (web, función o petición manipulada).
--   4. Funciones (RPC): reportar · reportes_listar · reporte_resolver · moderar_ocultar · sancionar · sancion_levantar ·
--      mi_sancion · sanciones_de. Las acciones de moderación quedan en la auditoría (030) y avisan a la persona afectada.
--   5. Las 5 funciones que LEEN contenido del muro se reescriben para ocultar lo que tenga «oculto».
--
-- REGLA DE RANGOS (igual que core/roles.js en el navegador; aquí es la que manda): jugador 0 · ayudante/árbitro 1 ·
-- moderador 2 · admin 3. Solo se actúa sobre alguien de rango ESTRICTAMENTE menor. Un baneo solo lo levanta un admin.

-- ─── 1) Columna «oculto» ────────────────────────────────────────────────────────────────────────────────────────────
alter table public.muro_publicaciones add column if not exists oculto boolean not null default false, add column if not exists oculto_motivo text;
alter table public.muro_respuestas    add column if not exists oculto boolean not null default false, add column if not exists oculto_motivo text;
alter table public.muro_clips         add column if not exists oculto boolean not null default false, add column if not exists oculto_motivo text;
alter table public.muro_historias     add column if not exists oculto boolean not null default false, add column if not exists oculto_motivo text;

-- ─── 2) Reportes ────────────────────────────────────────────────────────────────────────────────────────────────────
create table if not exists public.reportes (
  id           bigint generated always as identity primary key,
  reportante_id uuid not null references auth.users(id) on delete cascade,
  tipo         text not null check (tipo in ('usuario', 'publicacion', 'respuesta', 'clip', 'historia', 'mensaje')),
  objetivo_id  text not null check (char_length(objetivo_id) between 1 and 64),
  acusado_id   uuid references auth.users(id) on delete set null,          -- autor del contenido (o la persona reportada)
  motivo       text not null check (motivo in ('spam', 'acoso', 'inapropiado', 'suplantacion', 'trampas', 'otro')),
  detalle      text not null default '' check (char_length(detalle) <= 500),
  contenido    jsonb not null default '{}'::jsonb,                          -- foto del contenido en el momento del reporte
  estado       text not null default 'abierto' check (estado in ('abierto', 'resuelto', 'descartado')),
  resuelto_por uuid references auth.users(id) on delete set null,
  resuelto_at  timestamptz,
  resolucion   text check (resolucion is null or char_length(resolucion) <= 500),
  created_at   timestamptz not null default now()
);
-- Una persona no puede tener dos reportes ABIERTOS sobre lo mismo (evita el «clic repetido»).
create unique index if not exists reportes_abierto_unico on public.reportes (reportante_id, tipo, objetivo_id) where estado = 'abierto';
create index if not exists reportes_estado_idx on public.reportes (estado, id desc);
create index if not exists reportes_objetivo_idx on public.reportes (tipo, objetivo_id);
create index if not exists reportes_acusado_idx on public.reportes (acusado_id);
create index if not exists reportes_reportante_idx on public.reportes (reportante_id, created_at desc);
alter table public.reportes enable row level security;
revoke all on public.reportes from anon, authenticated;               -- todo pasa por funciones

-- ─── 3) Sanciones ───────────────────────────────────────────────────────────────────────────────────────────────────
create table if not exists public.sanciones (
  id              bigint generated always as identity primary key,
  usuario_id      uuid not null references auth.users(id) on delete cascade,
  tipo            text not null check (tipo in ('advertencia', 'suspension', 'baneo')),
  motivo          text not null check (char_length(btrim(motivo)) between 3 and 500),
  hasta           timestamptz,                                              -- solo suspensiones; el baneo no caduca
  creada_por      uuid references auth.users(id) on delete set null,
  reporte_id      bigint references public.reportes(id) on delete set null,
  created_at      timestamptz not null default now(),
  levantada_at    timestamptz,
  levantada_por   uuid references auth.users(id) on delete set null,
  levantada_motivo text,
  constraint sanciones_hasta_ok check ((tipo = 'suspension' and hasta is not null) or (tipo <> 'suspension' and hasta is null))
);
create index if not exists sanciones_usuario_idx on public.sanciones (usuario_id, created_at desc);
create index if not exists sanciones_activas_idx on public.sanciones (usuario_id) where levantada_at is null and tipo in ('suspension', 'baneo');
alter table public.sanciones enable row level security;
revoke all on public.sanciones from anon, authenticated;

-- Notificación nueva para avisar de moderación (se conserva la lista actual y se añade MODERACION).
alter table public.notificaciones drop constraint if exists notificaciones_tipo_check;
alter table public.notificaciones add constraint notificaciones_tipo_check check (tipo in (
  'RETO_DIRECTO','RETO_HOST','RETO_ACEPTADO','RETO_RECHAZADO','SALA_LISTA','CONFIRMAR_PARTIDO','AVISO_FINAL','PARTIDO_CONFIRMADO','PARTIDO_CANCELADO',
  'RETO_EXPIRADO','INVITACION_RETO','UNION_RETO','SALIO_RETO','AMISTAD_SOLICITUD','AMISTAD_ACEPTADA','SEGUIDOR_NUEVO','ESPECTADOR_SOLICITUD',
  'ESPECTADOR_APROBADO','MURO_RESPUESTA','MODERACION'));

-- ─── 3b) Ayudantes internos ─────────────────────────────────────────────────────────────────────────────────────────
create or replace function private.rango(p_uid uuid) returns integer
language sql stable security definer set search_path = '' as $$
  select case coalesce((select rol from public.perfiles where id = p_uid), 'jugador')
           when 'admin' then 3 when 'moderador' then 2 when 'ayudante' then 1 when 'arbitro' then 1 else 0 end
$$;
revoke all on function private.rango(uuid) from public, anon, authenticated;

-- Sanción vigente más fuerte de una persona (baneo > suspensión más larga). No devuelve nada si no tiene.
create or replace function private.sancion_vigente(p_uid uuid) returns public.sanciones
language sql stable security definer set search_path = '' as $$
  select s.* from public.sanciones s
  where s.usuario_id = p_uid and s.tipo in ('suspension', 'baneo') and s.levantada_at is null and (s.hasta is null or s.hasta > now())
  order by (s.tipo = 'baneo') desc, s.hasta desc nulls first limit 1
$$;
revoke all on function private.sancion_vigente(uuid) from public, anon, authenticated;

create or replace function private.texto_sancion(s public.sanciones) returns text
language sql stable set search_path = '' as $$
  select case when s.tipo = 'baneo' then 'Tu cuenta está baneada.' else 'Tu cuenta está suspendida hasta el ' || to_char(s.hasta at time zone 'America/Lima', 'DD/MM/YYYY HH24:MI') || ' (hora de Lima).' end
         || ' Motivo: ' || s.motivo
$$;
revoke all on function private.texto_sancion(public.sanciones) from public, anon, authenticated;

-- Las políticas de Storage se ejecutan con el rol de quien sube: esta función SÍ necesita EXECUTE (lección de la 029).
create or replace function private.esta_sancionado(p_uid uuid) returns boolean
language sql stable security definer set search_path = '' as $$
  select exists (select 1 from public.sanciones s where s.usuario_id = p_uid and s.tipo in ('suspension', 'baneo') and s.levantada_at is null and (s.hasta is null or s.hasta > now()))
$$;
revoke all on function private.esta_sancionado(uuid) from public, anon;
grant execute on function private.esta_sancionado(uuid) to authenticated;

-- Registro en la auditoría inalterable (030) a nombre de quien ejecuta la acción.
create or replace function private.auditar_moderacion(p_accion text, p_tabla text, p_registro text, p_titulo text, p_cambios jsonb, p_motivo text) returns void
language plpgsql security definer set search_path = '' as $$
declare yo uuid := (select auth.uid());
begin
  insert into public.auditoria_staff (actor_id, actor_rol, accion, tabla, registro_id, titulo, cambios, motivo)
  values (yo, (select rol from public.perfiles where id = yo), p_accion, p_tabla, p_registro, p_titulo, coalesce(p_cambios, '{}'::jsonb), p_motivo);
end $$;
revoke all on function private.auditar_moderacion(text, text, text, text, jsonb, text) from public, anon, authenticated;

-- ─── 3c) El candado: una cuenta sancionada no puede ESCRIBIR (leer sí) ───────────────────────────────────────────────
create or replace function private.bloquear_sancionados() returns trigger
language plpgsql security definer set search_path = '' as $$
declare autor uuid := nullif(to_jsonb(new) ->> tg_argv[0], '')::uuid; s public.sanciones;
begin
  if autor is null or (select auth.uid()) is null then return new; end if;     -- sin usuario (SQL Editor): no aplica
  s := private.sancion_vigente(autor);
  if s.id is not null then raise exception '%', private.texto_sancion(s) using errcode = 'P0001'; end if;
  return new;
end $$;
revoke all on function private.bloquear_sancionados() from public, anon, authenticated;

-- Nombre «zy_…» para que corra ANTES que los límites de ritmo («zz_…») y de cualquier otro trigger.
do $$
declare r record;
begin
  for r in select * from (values
    ('muro_publicaciones', 'autor_id'), ('muro_respuestas', 'autor_id'), ('muro_reacciones', 'usuario_id'), ('muro_clips', 'autor_id'),
    ('muro_historias', 'autor_id'), ('mensajes_privados', 'autor_id'), ('amistades', 'solicitante'), ('seguidores', 'seguidor_id'),
    ('retos_matchmaking', 'retador_id'), ('conversaciones', 'creador_id'), ('reportes', 'reportante_id')
  ) as v(tabla, col)
  loop
    execute format('drop trigger if exists zy_bloqueo_sancion on public.%I', r.tabla);
    execute format('create trigger zy_bloqueo_sancion before insert on public.%I for each row execute function private.bloquear_sancionados(%L)', r.tabla, r.col);
  end loop;
end $$;
-- Reportar tampoco debe poder inundarse.
drop trigger if exists zz_limite_ritmo on public.reportes;
create trigger zz_limite_ritmo before insert on public.reportes
  for each row execute function private.limitar_ritmo('reportante_id', '15', '1 hour', 'Has enviado muchos reportes seguidos: espera un rato.');

-- Subir fotos al muro también queda bloqueado para sancionados (se conserva el tope de 300 de la 031).
drop policy if exists muro_insert_propio on storage.objects;
create policy muro_insert_propio on storage.objects for insert to authenticated
  with check (
    bucket_id = 'muro' and (storage.foldername(name))[1] = ((select auth.uid()))::text
    and private.cuenta_fotos_muro((select auth.uid())) < 300
    and not private.esta_sancionado((select auth.uid()))
  );

-- ─── 4) Funciones públicas (RPC) ────────────────────────────────────────────────────────────────────────────────────
-- 4.1 Reportar (cualquier persona con sesión).
create or replace function public.reportar(p_tipo text, p_objetivo text, p_motivo text, p_detalle text default '') returns bigint
language plpgsql security definer set search_path = '' as $$
declare
  yo uuid := private.uid_requerido(); obj text := btrim(coalesce(p_objetivo, '')); det text := btrim(regexp_replace(coalesce(p_detalle, ''), '[<>]', '', 'g'));
  acusado uuid; foto jsonb; nuevo bigint; num bigint; conv uuid;
begin
  if p_tipo not in ('usuario', 'publicacion', 'respuesta', 'clip', 'historia', 'mensaje') then raise exception 'Tipo de reporte no válido.'; end if;
  if p_motivo not in ('spam', 'acoso', 'inapropiado', 'suplantacion', 'trampas', 'otro') then raise exception 'Elige un motivo para el reporte.'; end if;
  if char_length(det) > 500 then raise exception 'El detalle admite máximo 500 caracteres.'; end if;
  if p_tipo = 'usuario' then
    if obj !~ '^[0-9a-fA-F-]{36}$' then raise exception 'Esa cuenta no existe.'; end if;
    select id, jsonb_build_object('username', username, 'nombre_display', nombre_display) into acusado, foto from public.perfiles where id = obj::uuid;
  else
    if obj !~ '^[0-9]{1,18}$' then raise exception 'Ese contenido ya no existe.'; end if;
    num := obj::bigint;
    if p_tipo = 'publicacion' then
      select autor_id, jsonb_build_object('texto', texto, 'imagen_url', imagen_url, 'video_url', video_url) into acusado, foto
        from public.muro_publicaciones where id = num and not oculto and private.puede_ver_muro(autor_id, yo);
    elsif p_tipo = 'respuesta' then
      select r.autor_id, jsonb_build_object('texto', r.texto, 'publicacion_id', r.publicacion_id) into acusado, foto
        from public.muro_respuestas r join public.muro_publicaciones m on m.id = r.publicacion_id
        where r.id = num and not r.oculto and private.puede_ver_muro(m.autor_id, yo);
    elsif p_tipo = 'clip' then
      select c.autor_id, jsonb_build_object('titulo', c.titulo, 'video_url', c.video_url) into acusado, foto
        from public.muro_clips c where c.id = num and not c.oculto and private.puede_ver_muro(c.autor_id, yo);
    elsif p_tipo = 'historia' then
      select h.autor_id, jsonb_build_object('texto', h.texto, 'imagen_url', h.imagen_url, 'video_url', h.video_url) into acusado, foto
        from public.muro_historias h where h.id = num and not h.oculto and private.puede_ver_muro(h.autor_id, yo);
    else   -- mensaje: solo se puede reportar un mensaje de una conversación en la que se participa
      select m.conversacion_id into conv from public.mensajes_privados m where m.id = num;
      if conv is null or not private.es_miembro(conv, yo) then raise exception 'Ese mensaje no existe.'; end if;
      select m.autor_id, jsonb_build_object('texto', m.texto, 'conversacion_id', m.conversacion_id) into acusado, foto
        from public.mensajes_privados m where m.id = num and not m.eliminado;
    end if;
  end if;
  if acusado is null then raise exception 'Ese contenido ya no existe o no puedes verlo.'; end if;
  if acusado = yo then raise exception 'No puedes reportarte a ti mismo.'; end if;
  insert into public.reportes (reportante_id, tipo, objetivo_id, acusado_id, motivo, detalle, contenido)
  values (yo, p_tipo, obj, acusado, p_motivo, det, coalesce(foto, '{}'::jsonb))
  on conflict (reportante_id, tipo, objetivo_id) where estado = 'abierto' do nothing
  returning id into nuevo;
  if nuevo is null then raise exception 'Ya reportaste esto: el equipo lo está revisando.'; end if;
  return nuevo;
end $$;

-- 4.1b El botón de reportar del chat (018) ahora alimenta la tabla unificada. Firma y comportamiento hacia la web: iguales.
create or replace function public.reportar_mensaje(p_mensaje bigint, p_motivo text) returns void
language plpgsql security definer set search_path = '' as $$
begin
  perform public.reportar('mensaje', p_mensaje::text, 'otro', btrim(coalesce(p_motivo, '')));
end $$;

-- Reportes que ya existían en la tabla vieja pasan a la nueva (una sola vez; si el mensaje ya no existe se omite).
insert into public.reportes (reportante_id, tipo, objetivo_id, acusado_id, motivo, detalle, contenido, created_at)
select rc.reportante_id, 'mensaje', rc.mensaje_id::text, mp.autor_id, 'otro', left(rc.motivo, 500),
       jsonb_build_object('texto', mp.texto, 'conversacion_id', mp.conversacion_id), rc.created_at
from public.reportes_chat rc join public.mensajes_privados mp on mp.id = rc.mensaje_id
where not mp.eliminado
on conflict (reportante_id, tipo, objetivo_id) where estado = 'abierto' do nothing;

-- 4.2 Listar reportes (ayudante o superior). Incluye cuántos reportes abiertos hay sobre lo mismo y si la persona ya tiene sanción.
create or replace function public.reportes_listar(p_estado text default 'abierto', p_antes bigint default null, p_limite integer default 30) returns jsonb
language plpgsql stable security definer set search_path = '' as $$
declare n integer := least(greatest(coalesce(p_limite, 30), 1), 60); est text := case when p_estado in ('abierto', 'resuelto', 'descartado') then p_estado else 'abierto' end;
begin
  if not private.es_staff() then raise exception 'No tienes permiso para ver los reportes.' using errcode = '42501'; end if;
  return coalesce((select jsonb_agg(x order by (x ->> 'id')::bigint desc) from (
    select jsonb_build_object(
      'id', r.id, 'tipo', r.tipo, 'objetivo_id', r.objetivo_id, 'motivo', r.motivo, 'detalle', r.detalle, 'contenido', r.contenido,
      'estado', r.estado, 'resolucion', r.resolucion, 'resuelto_at', r.resuelto_at, 'created_at', r.created_at,
      'reportante', jsonb_build_object('id', rp.id, 'username', rp.username, 'nombre_display', rp.nombre_display),
      'acusado', jsonb_build_object('id', ac.id, 'username', ac.username, 'nombre_display', ac.nombre_display, 'avatar_url', ac.avatar_url, 'rol', ac.rol),
      'resuelto_por', (select jsonb_build_object('username', rs.username, 'nombre_display', rs.nombre_display) from public.perfiles rs where rs.id = r.resuelto_por),
      'mismos', (select count(*) from public.reportes o where o.tipo = r.tipo and o.objetivo_id = r.objetivo_id and o.estado = 'abierto'),
      'sancion_vigente', (select jsonb_build_object('tipo', sv.tipo, 'hasta', sv.hasta) from private.sancion_vigente(r.acusado_id) sv where sv.id is not null),
      'oculto', case r.tipo
        when 'publicacion' then (select m.oculto from public.muro_publicaciones m where m.id = r.objetivo_id::bigint)
        when 'respuesta' then (select m.oculto from public.muro_respuestas m where m.id = r.objetivo_id::bigint)
        when 'clip' then (select m.oculto from public.muro_clips m where m.id = r.objetivo_id::bigint)
        when 'historia' then (select m.oculto from public.muro_historias m where m.id = r.objetivo_id::bigint)
        else null end
    ) as x, r.id as rid
    from public.reportes r
    left join public.perfiles rp on rp.id = r.reportante_id
    left join public.perfiles ac on ac.id = r.acusado_id
    where r.estado = est and (p_antes is null or r.id < p_antes)
    order by r.id desc limit n) t), '[]'::jsonb);
end $$;

-- 4.3 Resolver o descartar (moderador o superior). Cierra TODOS los reportes abiertos sobre el mismo contenido.
create or replace function public.reporte_resolver(p_id bigint, p_estado text, p_resolucion text default '') returns integer
language plpgsql security definer set search_path = '' as $$
declare yo uuid := private.uid_requerido(); r public.reportes; res text := btrim(regexp_replace(coalesce(p_resolucion, ''), '[<>]', '', 'g')); cerrados integer;
begin
  if not private.es_moderador() then raise exception 'No tienes permiso para resolver reportes.' using errcode = '42501'; end if;
  if p_estado not in ('resuelto', 'descartado') then raise exception 'Estado no válido.'; end if;
  if char_length(res) > 500 then raise exception 'La nota admite máximo 500 caracteres.'; end if;
  select * into r from public.reportes where id = p_id;
  if not found then raise exception 'Ese reporte no existe.'; end if;
  update public.reportes set estado = p_estado, resuelto_por = yo, resuelto_at = now(), resolucion = nullif(res, '')
   where tipo = r.tipo and objetivo_id = r.objetivo_id and estado = 'abierto';
  get diagnostics cerrados = row_count;
  perform private.auditar_moderacion('editar', 'reportes', p_id::text, 'Reporte #' || p_id || ' (' || r.tipo || ')',
    jsonb_build_object('estado', jsonb_build_array('abierto', p_estado), 'reportes_cerrados', jsonb_build_array(null, cerrados)), nullif(res, ''));
  return cerrados;
end $$;

-- 4.4 Ocultar / mostrar contenido (moderador o superior; no sobre alguien de su mismo rango o mayor).
create or replace function public.moderar_ocultar(p_tipo text, p_id bigint, p_ocultar boolean, p_motivo text) returns void
language plpgsql security definer set search_path = '' as $$
declare yo uuid := private.uid_requerido(); mot text := btrim(regexp_replace(coalesce(p_motivo, ''), '[<>]', '', 'g')); autor uuid; ya boolean; titulo text;
begin
  if not private.es_moderador() then raise exception 'No tienes permiso para moderar contenido.' using errcode = '42501'; end if;
  if char_length(mot) < 3 then raise exception 'Escribe un motivo (mínimo 3 caracteres): queda en la auditoría.'; end if;
  if char_length(mot) > 300 then raise exception 'El motivo admite máximo 300 caracteres.'; end if;
  if p_tipo = 'publicacion' then select autor_id, oculto, 'Publicación #' || id into autor, ya, titulo from public.muro_publicaciones where id = p_id;
  elsif p_tipo = 'respuesta' then select autor_id, oculto, 'Respuesta #' || id into autor, ya, titulo from public.muro_respuestas where id = p_id;
  elsif p_tipo = 'clip' then select autor_id, oculto, 'Clip #' || id into autor, ya, titulo from public.muro_clips where id = p_id;
  elsif p_tipo = 'historia' then select autor_id, oculto, 'Historia #' || id into autor, ya, titulo from public.muro_historias where id = p_id;
  else raise exception 'Tipo de contenido no válido.'; end if;
  if autor is null then raise exception 'Ese contenido ya no existe.'; end if;
  if private.rango(autor) >= private.rango(yo) then raise exception 'No puedes moderar contenido de alguien de tu mismo nivel o superior.' using errcode = '42501'; end if;
  if ya = p_ocultar then return; end if;
  if p_tipo = 'publicacion' then update public.muro_publicaciones set oculto = p_ocultar, oculto_motivo = case when p_ocultar then mot end where id = p_id;
  elsif p_tipo = 'respuesta' then update public.muro_respuestas set oculto = p_ocultar, oculto_motivo = case when p_ocultar then mot end where id = p_id;
  elsif p_tipo = 'clip' then update public.muro_clips set oculto = p_ocultar, oculto_motivo = case when p_ocultar then mot end where id = p_id;
  else update public.muro_historias set oculto = p_ocultar, oculto_motivo = case when p_ocultar then mot end where id = p_id; end if;
  perform private.auditar_moderacion('ocultar', 'muro_' || case p_tipo when 'publicacion' then 'publicaciones' when 'respuesta' then 'respuestas' when 'clip' then 'clips' else 'historias' end,
    p_id::text, titulo, jsonb_build_object('oculto', jsonb_build_array(ya, p_ocultar)), mot);
  if p_ocultar then
    perform private.notificar(autor, 'MODERACION', 'Contenido ocultado', 'El equipo ocultó una de tus publicaciones. Motivo: ' || mot);
  end if;
end $$;

-- 4.5 Sancionar (moderador o superior; solo a rangos MENORES; no a uno mismo).
create or replace function public.sancionar(p_usuario uuid, p_tipo text, p_dias integer, p_motivo text, p_reporte bigint default null) returns bigint
language plpgsql security definer set search_path = '' as $$
declare yo uuid := private.uid_requerido(); mot text := btrim(regexp_replace(coalesce(p_motivo, ''), '[<>]', '', 'g')); fin timestamptz; nuevo bigint; nombre text; aviso text;
begin
  if not private.es_moderador() then raise exception 'No tienes permiso para sancionar.' using errcode = '42501'; end if;
  if p_usuario = yo then raise exception 'No puedes sancionarte a ti mismo.'; end if;
  select coalesce(nombre_display, username) into nombre from public.perfiles where id = p_usuario;
  if nombre is null then raise exception 'Esa cuenta no existe.'; end if;
  if private.rango(p_usuario) >= private.rango(yo) then raise exception 'No puedes sancionar a alguien de tu mismo nivel o superior.' using errcode = '42501'; end if;
  if p_tipo not in ('advertencia', 'suspension', 'baneo') then raise exception 'Tipo de sanción no válido.'; end if;
  if char_length(mot) < 3 then raise exception 'Escribe un motivo (mínimo 3 caracteres): la persona lo verá y queda en la auditoría.'; end if;
  if char_length(mot) > 500 then raise exception 'El motivo admite máximo 500 caracteres.'; end if;
  if p_tipo = 'suspension' then
    if p_dias is null or p_dias not between 1 and 30 then raise exception 'Una suspensión dura entre 1 y 30 días.'; end if;
    fin := now() + make_interval(days => p_dias);
  end if;
  insert into public.sanciones (usuario_id, tipo, motivo, hasta, creada_por, reporte_id) values (p_usuario, p_tipo, mot, fin, yo, p_reporte) returning id into nuevo;
  perform private.auditar_moderacion('sancion', 'sanciones', nuevo::text, nombre,
    jsonb_build_object('tipo', jsonb_build_array(null, p_tipo), 'hasta', jsonb_build_array(null, fin)), mot);
  aviso := case p_tipo when 'advertencia' then 'Recibiste una advertencia del equipo.' when 'baneo' then 'Tu cuenta fue baneada.'
           else 'Tu cuenta fue suspendida ' || p_dias || ' día(s): puedes leer pero no publicar ni escribir.' end;
  perform private.notificar(p_usuario, 'MODERACION', case p_tipo when 'advertencia' then 'Advertencia' when 'baneo' then 'Cuenta baneada' else 'Cuenta suspendida' end, aviso || ' Motivo: ' || mot);
  if p_reporte is not null then
    update public.reportes set estado = 'resuelto', resuelto_por = yo, resuelto_at = now(), resolucion = 'Sanción aplicada: ' || p_tipo
     where tipo = (select tipo from public.reportes where id = p_reporte) and objetivo_id = (select objetivo_id from public.reportes where id = p_reporte) and estado = 'abierto';
  end if;
  return nuevo;
end $$;

-- 4.6 Levantar una sanción (suspensión: moderador+ con rango mayor; baneo: solo admin).
create or replace function public.sancion_levantar(p_id bigint, p_motivo text) returns void
language plpgsql security definer set search_path = '' as $$
declare yo uuid := private.uid_requerido(); mot text := btrim(regexp_replace(coalesce(p_motivo, ''), '[<>]', '', 'g')); s public.sanciones; nombre text;
begin
  if not private.es_moderador() then raise exception 'No tienes permiso para levantar sanciones.' using errcode = '42501'; end if;
  if char_length(mot) < 3 then raise exception 'Escribe un motivo (mínimo 3 caracteres): queda en la auditoría.'; end if;
  select * into s from public.sanciones where id = p_id;
  if not found then raise exception 'Esa sanción no existe.'; end if;
  if s.levantada_at is not null then raise exception 'Esa sanción ya estaba levantada.'; end if;
  if s.tipo = 'baneo' and not private.es_admin() then raise exception 'Solo un administrador puede levantar un baneo.' using errcode = '42501'; end if;
  if private.rango(s.usuario_id) >= private.rango(yo) then raise exception 'No puedes actuar sobre alguien de tu mismo nivel o superior.' using errcode = '42501'; end if;
  update public.sanciones set levantada_at = now(), levantada_por = yo, levantada_motivo = mot where id = p_id;
  select coalesce(nombre_display, username) into nombre from public.perfiles where id = s.usuario_id;
  perform private.auditar_moderacion('sancion', 'sanciones', p_id::text, nombre,
    jsonb_build_object('estado', jsonb_build_array(s.tipo, 'levantada')), mot);
  if s.tipo <> 'advertencia' then perform private.notificar(s.usuario_id, 'MODERACION', 'Sanción levantada', 'Tu cuenta vuelve a estar activa. Nota del equipo: ' || mot); end if;
end $$;

-- 4.7 La propia persona consulta SU estado (para mostrarle un aviso claro en la web).
create or replace function public.mi_sancion() returns jsonb
language plpgsql stable security definer set search_path = '' as $$
declare yo uuid := (select auth.uid()); s public.sanciones;
begin
  if yo is null then return null; end if;
  s := private.sancion_vigente(yo);
  if s.id is null then return null; end if;
  return jsonb_build_object('tipo', s.tipo, 'hasta', s.hasta, 'motivo', s.motivo, 'desde', s.created_at);
end $$;

-- 4.8 Historial de sanciones de una persona (ayudante o superior).
create or replace function public.sanciones_de(p_usuario uuid) returns jsonb
language plpgsql stable security definer set search_path = '' as $$
begin
  if not private.es_staff() then raise exception 'No tienes permiso para ver sanciones.' using errcode = '42501'; end if;
  return coalesce((select jsonb_agg(jsonb_build_object('id', s.id, 'tipo', s.tipo, 'motivo', s.motivo, 'hasta', s.hasta, 'created_at', s.created_at,
      'creada_por', (select coalesce(p.nombre_display, p.username) from public.perfiles p where p.id = s.creada_por),
      'vigente', s.levantada_at is null and (s.tipo = 'baneo' or (s.tipo = 'suspension' and s.hasta > now())),
      'levantada_at', s.levantada_at, 'levantada_motivo', s.levantada_motivo) order by s.id desc)
    from public.sanciones s where s.usuario_id = p_usuario), '[]'::jsonb);
end $$;

-- Permisos de las funciones públicas: solo con sesión (cada una vuelve a comprobar el rol por dentro).
do $$ declare f text; begin
  foreach f in array array['reportar(text,text,text,text)','reportar_mensaje(bigint,text)','reportes_listar(text,bigint,integer)','reporte_resolver(bigint,text,text)',
                           'moderar_ocultar(text,bigint,boolean,text)','sancionar(uuid,text,integer,text,bigint)','sancion_levantar(bigint,text)','mi_sancion()','sanciones_de(uuid)'] loop
    execute format('revoke all on function public.%s from public, anon', f);
    execute format('grant execute on function public.%s to authenticated', f);
  end loop;
end $$;

-- ─── 5) Las funciones que LEEN el muro ahora ocultan lo marcado «oculto» (misma lógica de siempre + el filtro) ─────────
create or replace function public.muro_de(p_usuario uuid, p_antes bigint default null, p_limite integer default 20, p_juego text default null) returns jsonb
language plpgsql stable security definer set search_path = '' as $$
declare yo uuid := (select auth.uid()); n integer := least(greatest(coalesce(p_limite, 20), 1), 50); filas jsonb; mas boolean; usados jsonb; j text := nullif(trim(coalesce(p_juego, '')), '');
begin
  if not private.puede_ver_muro(p_usuario, yo) then return jsonb_build_object('visible', false, 'items', '[]'::jsonb, 'hay_mas', false, 'juegos', '[]'::jsonb); end if;
  select coalesce(jsonb_agg(distinct juego), '[]'::jsonb) into usados from public.muro_publicaciones where autor_id = p_usuario and juego is not null and not oculto;
  with t as (
    select m.id, m.texto, m.imagen_url, m.video_url, m.juego, m.fijada, m.created_at, m.editada_at,
           case when m.reto_id is null then null else private.reto_resumen(m.reto_id, yo) end as reto,
           (select count(*) from public.muro_respuestas r where r.publicacion_id = m.id and not r.oculto) as respuestas,
           (select coalesce(jsonb_object_agg(x.tipo, x.c), '{}'::jsonb) from (select tipo, count(*) as c from public.muro_reacciones where publicacion_id = m.id group by tipo) x) as reacciones,
           (select tipo from public.muro_reacciones where publicacion_id = m.id and usuario_id = yo) as mia,
           row_number() over (order by (case when p_antes is null then m.fijada else false end) desc, m.id desc) as rn
    from public.muro_publicaciones m
    where m.autor_id = p_usuario and not m.oculto and (p_antes is null or (m.id < p_antes and not m.fijada)) and (j is null or m.juego = j)
    order by (case when p_antes is null then m.fijada else false end) desc, m.id desc limit n + 1)
  select coalesce(jsonb_agg(jsonb_build_object('id', id, 'texto', texto, 'imagen_url', imagen_url, 'video_url', video_url, 'juego', juego, 'reto', reto, 'fijada', fijada, 'created_at', created_at, 'editada_at', editada_at,
           'respuestas', respuestas, 'reacciones', reacciones, 'mia', mia) order by rn) filter (where rn <= n), '[]'::jsonb),
         count(*) > n into filas, mas from t;
  return jsonb_build_object('visible', true, 'hay_mas', mas, 'items', filas, 'juegos', usados);
end $$;

create or replace function public.muro_comunidad(p_juego text default null, p_antes bigint default null, p_limite integer default 20) returns jsonb
language plpgsql stable security definer set search_path = '' as $$
declare yo uuid := (select auth.uid()); n integer := least(greatest(coalesce(p_limite, 20), 1), 40); j text := nullif(trim(coalesce(p_juego, '')), ''); filas jsonb; mas boolean;
begin
  if j is not null and j not in ('pes','sp','fifa','eafc','efootball') then raise exception 'Juego no válido.'; end if;
  with t as (
    select m.id, m.texto, m.imagen_url, m.video_url, m.juego, m.created_at, m.autor_id,
           case when m.reto_id is null then null else private.reto_resumen(m.reto_id, yo) end as reto,
           (select count(*) from public.muro_respuestas r where r.publicacion_id = m.id and not r.oculto) as respuestas,
           (select coalesce(jsonb_object_agg(x.tipo, x.c), '{}'::jsonb) from (select tipo, count(*) as c from public.muro_reacciones where publicacion_id = m.id group by tipo) x) as reacciones,
           row_number() over (order by m.id desc) as rn
    from public.muro_publicaciones m
    where not m.oculto and (p_antes is null or m.id < p_antes) and (j is null or m.juego = j) and private.puede_ver_muro(m.autor_id, yo)
    order by m.id desc limit n + 1)
  select coalesce(jsonb_agg(jsonb_build_object('id', t.id, 'texto', t.texto, 'imagen_url', t.imagen_url, 'video_url', t.video_url, 'juego', t.juego, 'reto', t.reto, 'created_at', t.created_at,
           'respuestas', t.respuestas, 'reacciones', t.reacciones,
           'autor', jsonb_build_object('id', pf.id, 'username', pf.username, 'nombre_display', pf.nombre_display, 'avatar_url', pf.avatar_url)) order by t.rn) filter (where t.rn <= n), '[]'::jsonb),
         count(*) > n into filas, mas from t join public.perfiles pf on pf.id = t.autor_id;
  return jsonb_build_object('hay_mas', mas, 'items', filas);
end $$;

create or replace function public.clips_de(p_usuario uuid, p_antes bigint default null, p_limite integer default 24) returns jsonb
language plpgsql stable security definer set search_path = '' as $$
declare yo uuid := (select auth.uid()); n integer := least(greatest(coalesce(p_limite, 24), 1), 50); filas jsonb; mas boolean; usados jsonb;
begin
  if not private.puede_ver_muro(p_usuario, yo) then return jsonb_build_object('visible', false, 'items', '[]'::jsonb, 'hay_mas', false, 'juegos', '[]'::jsonb); end if;
  select coalesce(jsonb_agg(distinct juego), '[]'::jsonb) into usados from public.muro_clips where autor_id = p_usuario and juego is not null and not oculto;
  with t as (select c.id, c.titulo, c.video_url, c.juego, c.created_at, row_number() over (order by c.id desc) as rn
             from public.muro_clips c where c.autor_id = p_usuario and not c.oculto and (p_antes is null or c.id < p_antes) order by c.id desc limit n + 1)
  select coalesce(jsonb_agg(jsonb_build_object('id', id, 'titulo', titulo, 'video_url', video_url, 'juego', juego, 'created_at', created_at) order by rn) filter (where rn <= n), '[]'::jsonb), count(*) > n into filas, mas from t;
  return jsonb_build_object('visible', true, 'items', filas, 'hay_mas', mas, 'juegos', usados);
end $$;

create or replace function public.historias_de(p_usuario uuid) returns jsonb
language plpgsql stable security definer set search_path = '' as $$
declare yo uuid := (select auth.uid()); soy boolean := yo is not null and yo = p_usuario; vigentes jsonb; dest jsonb; arch jsonb;
begin
  if not private.puede_ver_muro(p_usuario, yo) then return jsonb_build_object('visible', false, 'historias', '[]'::jsonb, 'destacadas', '[]'::jsonb, 'archivo', '[]'::jsonb); end if;
  select coalesce(jsonb_agg(jsonb_build_object('id', h.id, 'texto', h.texto, 'imagen_url', h.imagen_url, 'video_url', h.video_url, 'created_at', h.created_at, 'expira_at', h.expira_at, 'destacada_id', h.destacada_id) order by h.id), '[]'::jsonb)
    into vigentes from public.muro_historias h where h.autor_id = p_usuario and h.expira_at > now() and not h.oculto;
  select coalesce(jsonb_agg(jsonb_build_object('id', d.id, 'titulo', d.titulo, 'historias', coalesce((
      select jsonb_agg(jsonb_build_object('id', h.id, 'texto', h.texto, 'imagen_url', h.imagen_url, 'video_url', h.video_url, 'created_at', h.created_at) order by h.id)
      from public.muro_historias h where h.destacada_id = d.id and not h.oculto), '[]'::jsonb)) order by d.id), '[]'::jsonb)
    into dest from public.muro_destacadas d where d.autor_id = p_usuario;
  if soy then
    select coalesce(jsonb_agg(jsonb_build_object('id', h.id, 'texto', h.texto, 'imagen_url', h.imagen_url, 'video_url', h.video_url, 'created_at', h.created_at, 'destacada_id', h.destacada_id) order by h.id desc), '[]'::jsonb)
      into arch from public.muro_historias h where h.autor_id = yo and h.expira_at <= now() and h.destacada_id is null and not h.oculto;
  else arch := '[]'::jsonb; end if;
  return jsonb_build_object('visible', true, 'historias', vigentes, 'destacadas', dest, 'archivo', arch);
end $$;

create or replace function public.muro_respuestas_de(p_publicacion bigint, p_limite integer default 50) returns jsonb
language plpgsql stable security definer set search_path = '' as $$
declare yo uuid := (select auth.uid()); dueno uuid;
begin
  select autor_id into dueno from public.muro_publicaciones where id = p_publicacion and not oculto;
  if dueno is null or not private.puede_ver_muro(dueno, yo) then return '[]'::jsonb; end if;
  return coalesce((select jsonb_agg(jsonb_build_object('id', r.id, 'autor_id', r.autor_id, 'texto', r.texto, 'created_at', r.created_at,
      'nombre_display', pf.nombre_display, 'username', pf.username, 'avatar_url', pf.avatar_url,
      'puedo_borrar', yo is not null and (r.autor_id = yo or dueno = yo or private.es_admin())) order by r.id)
    from (select * from public.muro_respuestas where publicacion_id = p_publicacion and not oculto order by id limit least(greatest(coalesce(p_limite, 50), 1), 100)) r
    join public.perfiles pf on pf.id = r.autor_id
    where yo is null or not private.hay_bloqueo(yo, r.autor_id)), '[]'::jsonb);
end $$;

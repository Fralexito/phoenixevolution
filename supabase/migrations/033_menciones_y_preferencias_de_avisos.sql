-- 033 · OLA A (1/2) · MENCIONES @usuario y PREFERENCIAS DE AVISOS. Depende de 017 (bloqueos), 021-027 (muro), 031 (ritmo), 032 (oculto).
-- Idea central: NO se reescriben las funciones del muro (ya tienen 4-5 versiones). Se «cuelgan» triggers de las tablas:
--   · publicar / responder / editar → trigger AFTER → busca @usuario en el texto → crea la mención y el aviso.
--   · cualquier INSERT en `notificaciones` (de cualquier origen) → trigger BEFORE → si la persona apagó esa categoría, no se guarda.
-- Si algo de menciones falla, la publicación se guarda igual (el error queda como WARNING en el log de Postgres).

-- ─── 1) Notificaciones: tipo MENCION + columna «enlace» (a dónde lleva el aviso) ───────────────────────────────
alter table public.notificaciones drop constraint if exists notificaciones_tipo_check;
alter table public.notificaciones add constraint notificaciones_tipo_check check (tipo in (
  'RETO_DIRECTO','RETO_HOST','RETO_ACEPTADO','RETO_RECHAZADO','SALA_LISTA','CONFIRMAR_PARTIDO','AVISO_FINAL','PARTIDO_CONFIRMADO','PARTIDO_CANCELADO',
  'RETO_EXPIRADO','INVITACION_RETO','UNION_RETO','SALIO_RETO','AMISTAD_SOLICITUD','AMISTAD_ACEPTADA','SEGUIDOR_NUEVO','ESPECTADOR_SOLICITUD',
  'ESPECTADOR_APROBADO','MURO_RESPUESTA','MODERACION','MENCION'));

-- Solo rutas RELATIVAS de la propia web (nada de https://, javascript: ni //): evita redirecciones a sitios ajenos.
alter table public.notificaciones add column if not exists enlace text;
alter table public.notificaciones drop constraint if exists notificaciones_enlace_ok;
alter table public.notificaciones add constraint notificaciones_enlace_ok check (
  enlace is null or (char_length(enlace) <= 200 and enlace ~ '^[a-z0-9][a-z0-9_/.-]*(\?[A-Za-z0-9_=&.-]*)?(#[A-Za-z0-9_-]*)?$'));

-- ─── 2) Categorías de aviso y preferencias ─────────────────────────────────────────────────────────────────────
-- duelos = retos, partidos, salas y espectadores · social = amistades y seguidores · muro = respuestas · menciones · sistema = moderación (no se apaga).
create or replace function private.categoria_notif(p_tipo text) returns text
language sql immutable set search_path = '' as $$
  select case
    when p_tipo in ('AMISTAD_SOLICITUD','AMISTAD_ACEPTADA','SEGUIDOR_NUEVO') then 'social'
    when p_tipo = 'MURO_RESPUESTA' then 'muro'
    when p_tipo = 'MENCION' then 'menciones'
    when p_tipo = 'MODERACION' then 'sistema'
    else 'duelos' end
$$;
revoke all on function private.categoria_notif(text) from public, anon, authenticated;

create table if not exists public.notif_preferencias (
  usuario_id uuid not null references auth.users(id) on delete cascade,
  categoria text not null check (categoria in ('duelos','social','muro','menciones')),
  activa boolean not null default true,
  updated_at timestamptz not null default now(),
  primary key (usuario_id, categoria)
);
alter table public.notif_preferencias enable row level security;
revoke all on public.notif_preferencias from anon, authenticated;       -- tabla cerrada: solo por las funciones de abajo

-- Barrera ÚNICA: todo aviso (retos, amistades, muro, menciones…) pasa por aquí; si la categoría está apagada, no se guarda.
create or replace function private.respetar_preferencias_notif() returns trigger
language plpgsql security definer set search_path = '' as $$
declare cat text := private.categoria_notif(new.tipo);
begin
  if cat <> 'sistema' and exists (select 1 from public.notif_preferencias where usuario_id = new.usuario_id and categoria = cat and not activa) then
    return null;                                                       -- BEFORE INSERT devolviendo NULL = «no insertar» (sin error)
  end if;
  return new;
end $$;
revoke all on function private.respetar_preferencias_notif() from public, anon, authenticated;
drop trigger if exists a_preferencias on public.notificaciones;
create trigger a_preferencias before insert on public.notificaciones for each row execute function private.respetar_preferencias_notif();

create or replace function public.mis_preferencias_notif() returns jsonb
language sql stable security definer set search_path = '' as $$
  select jsonb_object_agg(c, coalesce((select p.activa from public.notif_preferencias p where p.usuario_id = (select auth.uid()) and p.categoria = c), true))
  from unnest(array['duelos','social','muro','menciones']) as c
$$;

create or replace function public.guardar_preferencia_notif(p_categoria text, p_activa boolean) returns void
language plpgsql security definer set search_path = '' as $$
declare yo uuid := private.uid_requerido();
begin
  if p_categoria is null or p_categoria not in ('duelos','social','muro','menciones') then raise exception 'Categoría de aviso no válida.'; end if;
  if p_activa is null then raise exception 'Indica si quieres recibir estos avisos o no.'; end if;
  insert into public.notif_preferencias (usuario_id, categoria, activa) values (yo, p_categoria, p_activa)
  on conflict (usuario_id, categoria) do update set activa = excluded.activa, updated_at = now();
end $$;

-- (Sin límite de ritmo: la tabla tiene como máximo 4 filas por persona y cada guardado es un upsert de una fila: no hay nada que inundar.)

-- ─── 3) Menciones ──────────────────────────────────────────────────────────────────────────────────────────────
create table if not exists public.menciones (
  id bigint generated always as identity primary key,
  tipo text not null check (tipo in ('publicacion','respuesta')),
  objetivo_id bigint not null,
  autor_id uuid not null references auth.users(id) on delete cascade,
  mencionado_id uuid not null references auth.users(id) on delete cascade,
  created_at timestamptz not null default now(),
  constraint menciones_unica unique (tipo, objetivo_id, mencionado_id)     -- editar un texto no vuelve a avisar a quien ya fue mencionado
);
create index if not exists menciones_pareja_idx on public.menciones (autor_id, mencionado_id, created_at);
create index if not exists menciones_mencionado_idx on public.menciones (mencionado_id, id desc);
alter table public.menciones enable row level security;
revoke all on public.menciones from anon, authenticated;

-- «@ana» → 'ana'. Formato = el de los @usuario (letras, números, _; máx. 20). Máximo 5 por texto: más sería spam.
-- La mención debe empezar el texto o ir tras un carácter que no sea letra/número/_/@ (así «correo@sitio.com» NO cuenta).
create or replace function private.extraer_menciones(p_texto text) returns text[]
language sql immutable set search_path = '' as $$
  select coalesce(array_agg(u order by u), '{}'::text[]) from (
    select distinct lower(r.m[1]) as u
    from regexp_matches(coalesce(p_texto, ''), '(?:^|[^A-Za-z0-9_@])@([A-Za-z0-9_]{1,20})', 'g') as r(m)
    order by 1 limit 5) x
$$;
revoke all on function private.extraer_menciones(text) from public, anon, authenticated;

-- p_dueno = dueño del muro donde está el texto (para respetar su privacidad: si el muro es «solo amigos», no se avisa a quien no puede verlo).
create or replace function private.procesar_menciones(p_tipo text, p_id bigint, p_autor uuid, p_texto text, p_dueno uuid) returns void
language plpgsql security definer set search_path = '' as $$
declare nombres text[] := private.extraer_menciones(p_texto); r record; filas integer; autor text; enlace text; dueno_user text;
begin
  if cardinality(nombres) = 0 then return; end if;
  autor := private.nombre(p_autor);
  select username into dueno_user from public.perfiles where id = p_dueno;
  enlace := 'perfil/?u=' || coalesce(dueno_user, '') || case when p_tipo = 'publicacion' then '#p-' || p_id::text else '' end;
  if enlace !~ '^[a-z0-9][a-z0-9_/.-]*(\?[A-Za-z0-9_=&.-]*)?(#[A-Za-z0-9_-]*)?$' then enlace := null; end if;
  for r in select id from public.perfiles where lower(username) = any (nombres) loop
    continue when r.id = p_autor;                                           -- no te avisas a ti mismo
    continue when private.hay_bloqueo(p_autor, r.id);                       -- bloqueos en cualquier sentido: silencio total
    continue when not private.puede_ver_muro(p_dueno, r.id);                -- privacidad del muro: no se filtra contenido
    insert into public.menciones (tipo, objetivo_id, autor_id, mencionado_id) values (p_tipo, p_id, p_autor, r.id) on conflict do nothing;
    get diagnostics filas = row_count;
    continue when filas = 0;                                                -- ya estaba mencionada en este texto
    -- Anti-acoso: la misma persona no puede avisar a la misma otra más de 5 veces por hora (se registra, pero no suena).
    continue when (select count(*) from public.menciones where autor_id = p_autor and mencionado_id = r.id and created_at > now() - interval '1 hour') > 5;
    insert into public.notificaciones (usuario_id, tipo, titulo, mensaje, enlace)
    values (r.id, 'MENCION', 'Te mencionaron', left(autor || ': ' || regexp_replace(left(p_texto, 120), '\s+', ' ', 'g'), 300), enlace);
  end loop;
end $$;
revoke all on function private.procesar_menciones(text, bigint, uuid, text, uuid) from public, anon, authenticated;

create or replace function private.trg_menciones_publicacion() returns trigger
language plpgsql security definer set search_path = '' as $$
begin
  if not new.oculto then perform private.procesar_menciones('publicacion', new.id, new.autor_id, new.texto, new.autor_id); end if;
  return null;
exception when others then
  raise warning '[menciones] publicacion %: %', new.id, sqlerrm;            -- jamás impedir que la publicación se guarde
  return null;
end $$;
revoke all on function private.trg_menciones_publicacion() from public, anon, authenticated;

create or replace function private.trg_menciones_respuesta() returns trigger
language plpgsql security definer set search_path = '' as $$
declare dueno uuid;
begin
  if not new.oculto then
    select autor_id into dueno from public.muro_publicaciones where id = new.publicacion_id;
    if dueno is not null then perform private.procesar_menciones('respuesta', new.id, new.autor_id, new.texto, dueno); end if;
  end if;
  return null;
exception when others then
  raise warning '[menciones] respuesta %: %', new.id, sqlerrm;
  return null;
end $$;
revoke all on function private.trg_menciones_respuesta() from public, anon, authenticated;

-- Al borrar el texto, se borran sus menciones (no quedan filas huérfanas).
create or replace function private.trg_menciones_limpiar() returns trigger
language plpgsql security definer set search_path = '' as $$
begin
  delete from public.menciones where tipo = tg_argv[0] and objetivo_id = old.id;
  return null;
end $$;
revoke all on function private.trg_menciones_limpiar() from public, anon, authenticated;

drop trigger if exists menciones_alta on public.muro_publicaciones;
drop trigger if exists menciones_edicion on public.muro_publicaciones;
drop trigger if exists menciones_baja on public.muro_publicaciones;
create trigger menciones_alta after insert on public.muro_publicaciones for each row execute function private.trg_menciones_publicacion();
create trigger menciones_edicion after update of texto on public.muro_publicaciones for each row when (old.texto is distinct from new.texto) execute function private.trg_menciones_publicacion();
create trigger menciones_baja after delete on public.muro_publicaciones for each row execute function private.trg_menciones_limpiar('publicacion');

drop trigger if exists menciones_alta on public.muro_respuestas;
drop trigger if exists menciones_baja on public.muro_respuestas;
create trigger menciones_alta after insert on public.muro_respuestas for each row execute function private.trg_menciones_respuesta();
create trigger menciones_baja after delete on public.muro_respuestas for each row execute function private.trg_menciones_limpiar('respuesta');

-- ─── 4) Permisos de las funciones públicas ─────────────────────────────────────────────────────────────────────
revoke all on function public.mis_preferencias_notif(), public.guardar_preferencia_notif(text, boolean) from public, anon;
grant execute on function public.mis_preferencias_notif(), public.guardar_preferencia_notif(text, boolean) to authenticated;

-- ─── 5) Auditoría: nada que registrar (las preferencias y menciones son datos de la propia persona, no acciones de staff). ───

-- 030 · ROLES DEL STAFF, PERMISOS DEL MODERADOR Y REGISTRO DE AUDITORÍA INALTERABLE.
-- Depende de 018/029 (helpers en schema `private`). Es idempotente: se puede ejecutar más de una vez.
--
-- QUÉ CAMBIA (resumen para humanos):
--   1. Roles: jugador < ayudante < moderador < admin, más «árbitro» (antes «comisario», rol aparte para disputas de partidos).
--   2. El moderador puede CREAR y EDITAR lo principal de la liga, pero NO BORRAR (solo el admin borra). Ligas y temporadas: el moderador solo edita.
--   3. Cada cambio en las tablas de la liga y cada cambio de rol queda en `auditoria_staff`: quién, qué, antes y después. Nadie puede editarla ni borrarla.
--   4. El rol solo cambia con la función `asignar_rol` (solo admin, con motivo obligatorio).
--   5. Limpieza: las 2 tablas muertas dejan de ser legibles sin sesión y el Tribunal pasa a ser solo para el staff.
--
-- LECCIÓN DEL BUG DEL CHAT (029): las políticas RLS se evalúan con el rol de quien consulta, así que TODA función `private.*` usada en una
-- política necesita EXECUTE para `anon` y `authenticated`. Por eso cada helper nuevo termina con su GRANT.

-- ═════════ 1 · ROLES ═════════
alter table public.perfiles drop constraint if exists perfiles_rol_ok;
update public.perfiles set rol = 'arbitro' where rol = 'comisario';
alter table public.perfiles add constraint perfiles_rol_ok
  check (rol in ('jugador', 'arbitro', 'ayudante', 'moderador', 'admin'));

-- Nombres de usuario reservados: ahora también los de los roles nuevos. (Se busca la restricción por su contenido, no por su nombre.)
do $$
declare c text;
begin
  for c in select conname from pg_constraint
           where conrelid = 'public.perfiles'::regclass and contype = 'c' and pg_get_constraintdef(oid) ilike '%''root''%'
  loop execute format('alter table public.perfiles drop constraint %I', c); end loop;
end $$;
alter table public.perfiles add constraint perfiles_username_reservado
  check (username <> all (array['admin','administrador','moderador','ayudante','arbitro','auditoria','soporte','staff','comisario','oficial','phoenix','phoenixevolution','galaxyleague','sistema','root']));

-- «comisario» → «árbitro». Se RENOMBRA la función (no se recrea) para que las 3 políticas que ya la usan sigan apuntando a ella.
do $$ begin
  if exists (select 1 from pg_proc where oid = to_regprocedure('private.es_comisario()')) then
    alter function private.es_comisario() rename to es_arbitro;
  end if;
end $$;
create or replace function private.es_arbitro() returns boolean
language sql stable security definer set search_path = '' as $$
  select exists (select 1 from public.perfiles p where p.id = (select auth.uid()) and p.rol in ('admin', 'arbitro'));
$$;

create or replace function private.es_moderador() returns boolean
language sql stable security definer set search_path = '' as $$
  select exists (select 1 from public.perfiles p where p.id = (select auth.uid()) and p.rol in ('moderador', 'admin'));
$$;

create or replace function private.es_staff() returns boolean
language sql stable security definer set search_path = '' as $$
  select exists (select 1 from public.perfiles p where p.id = (select auth.uid()) and p.rol in ('ayudante', 'moderador', 'admin'));
$$;

revoke all on function private.es_arbitro(), private.es_moderador(), private.es_staff() from public;
grant execute on function private.es_arbitro(), private.es_moderador(), private.es_staff() to anon, authenticated;

do $$ begin
  if exists (select 1 from pg_policies where policyname = 'auditoria_comisario_escritura' and tablename = 'auditoria_tribunal') then
    alter policy auditoria_comisario_escritura on public.auditoria_tribunal rename to auditoria_arbitro_escritura; end if;
  if exists (select 1 from pg_policies where policyname = 'reportes_comisario_gestion' and tablename = 'reportes_fallos') then
    alter policy reportes_comisario_gestion on public.reportes_fallos rename to reportes_arbitro_gestion; end if;
end $$;

-- Al registrarse nadie puede quedarse con un nombre de rol (lista idéntica a la restricción de arriba).
create or replace function public.handle_new_user() returns trigger
language plpgsql security definer set search_path = '' as $$
declare
  m        jsonb := coalesce(new.raw_user_meta_data, '{}'::jsonb);
  v_mail   text  := split_part(coalesce(new.email, ''), '@', 1);
  v_apodo  text;
  v_full   text;
  v_base   text;
  v_user   text;
  v_avatar text;
  v_reserv text[] := array['admin','administrador','moderador','ayudante','arbitro','auditoria','soporte','staff','comisario','oficial','phoenix','phoenixevolution','galaxyleague','sistema','root'];
  n int := 0;
begin
  if exists (select 1 from public.perfiles where id = new.id) then return new; end if;
  v_apodo := nullif(trim(regexp_replace(coalesce(
      nullif(m->>'apodo', ''), nullif(m->>'gamertag', ''), nullif(m #>> '{custom_claims,global_name}', ''),
      nullif(m->>'full_name', ''), nullif(m->>'name', ''), nullif(v_mail, ''), ''), '[<>]', '', 'g')), '');
  v_full := lower(regexp_replace(coalesce(nullif(m->>'usuario', ''), v_apodo, 'jugador'), '[^a-zA-Z0-9_]', '', 'g'));
  if v_full = '' then v_full := 'jugador'; end if;
  v_base := left(v_full, 16);
  v_user := left(v_full, 20);
  if v_user = any (v_reserv) then v_user := v_user || 'x'; v_base := left(v_full, 15) || 'x'; end if;
  v_avatar := coalesce(nullif(m->>'avatar_url', ''), nullif(m->>'picture', ''), '');
  if v_avatar !~ '^https://' or char_length(v_avatar) > 300 then v_avatar := ''; end if;
  loop
    begin
      insert into public.perfiles (id, username, nombre_display, avatar_url, perfil_completo)
      values (new.id, v_user, left(coalesce(v_apodo, v_user), 30), v_avatar, nullif(m->>'usuario', '') is not null);
      exit;
    exception when unique_violation then
      n := n + 1; if n > 50 then raise; end if;
      v_user := v_base || n::text;
    end;
  end loop;
  return new;
end $$;

-- ═════════ 2 · PERMISOS DEL MODERADOR EN LAS TABLAS DE LA LIGA ═════════
-- Antes: una sola política «ALL» para admin (incluía borrar). Ahora se separa en tres:
--   crear  → moderador o admin        editar → moderador o admin        borrar → SOLO admin
-- (ligas y temporadas: crear también es solo admin.)
do $$
declare t text;
begin
  foreach t in array array['jugadores','equipos','eventos_partido','grupos_divisiones','partidos','partidos_torneo',
                           'participaciones','transferencias','copa_resultados','contratos_plantilla','noticias','ligas','temporadas']
  loop
    execute format('drop policy if exists %I on public.%I', t || '_admin_escritura', t);
    execute format('drop policy if exists %I on public.%I', t || '_staff_insert', t);
    execute format('drop policy if exists %I on public.%I', t || '_staff_update', t);
    execute format('drop policy if exists %I on public.%I', t || '_admin_delete', t);
    execute format('create policy %I on public.%I for insert to authenticated with check (%s)', t || '_staff_insert', t,
                   case when t in ('ligas', 'temporadas') then 'private.es_admin()' else 'private.es_moderador()' end);
    execute format('create policy %I on public.%I for update to authenticated using (private.es_moderador()) with check (private.es_moderador())', t || '_staff_update', t);
    execute format('create policy %I on public.%I for delete to authenticated using (private.es_admin())', t || '_admin_delete', t);
  end loop;
end $$;

-- Los borradores de noticias los ve el staff que puede editarlas.
drop policy if exists noticias_lectura on public.noticias;
create policy noticias_lectura on public.noticias for select to anon, authenticated
  using (publicada or private.es_moderador());

-- ═════════ 3 · LIMPIEZA Y CIERRE DE LECTURAS ═════════
-- Tribunal: solo staff y árbitros (hoy 0 filas; se abrirá al público más adelante si hace falta).
drop policy if exists "Lectura auditoria" on public.auditoria_tribunal;
drop policy if exists auditoria_tribunal_lectura on public.auditoria_tribunal;
create policy auditoria_tribunal_lectura on public.auditoria_tribunal for select to authenticated
  using (private.es_staff() or private.es_arbitro());
revoke select on public.auditoria_tribunal from anon;

-- Tablas de una versión anterior: vacías, sin uso en el código y legibles sin sesión. Se cierran del todo (no se borran).
drop policy if exists "Lectura chat" on public.mensajes_chat;
drop policy if exists "Lectura feed" on public.publicaciones_feed;
revoke all on public.mensajes_chat, public.publicaciones_feed from anon, authenticated;

-- Reportes de chat: los lee quien reportó o cualquier miembro del staff (antes: solo el texto 'admin' pegado a mano).
drop policy if exists reportes_lectura on public.reportes_chat;
create policy reportes_lectura on public.reportes_chat for select to authenticated
  using (reportante_id = (select auth.uid()) or private.es_staff());

-- ═════════ 4 · REGISTRO DE AUDITORÍA (INALTERABLE) ═════════
create table if not exists public.auditoria_staff (
  id          bigint generated always as identity primary key,
  momento     timestamptz not null default now(),
  actor_id    uuid,                                  -- null = hecho desde el editor SQL / sistema
  actor_rol   text,                                  -- el rol que tenía EN ESE MOMENTO
  accion      text not null check (accion in ('crear', 'editar', 'borrar', 'ocultar', 'rol', 'sancion', 'sistema')),
  tabla       text not null,
  registro_id text,
  titulo      text,                                  -- nombre legible del registro (jugador, noticia…)
  cambios     jsonb not null default '{}'::jsonb,    -- { campo: [antes, después] }
  motivo      text
);
create index if not exists auditoria_staff_momento on public.auditoria_staff (momento desc);
create index if not exists auditoria_staff_actor on public.auditoria_staff (actor_id, momento desc);
create index if not exists auditoria_staff_tabla on public.auditoria_staff (tabla, momento desc);
alter table public.auditoria_staff enable row level security;   -- sin políticas: nadie la toca directamente
revoke all on public.auditoria_staff from anon, authenticated;

-- Candado: ni UPDATE, ni DELETE, ni TRUNCATE (ni siquiera desde la web de Supabase sin desactivar el trigger a propósito).
create or replace function private.auditoria_inmutable() returns trigger
language plpgsql set search_path = '' as $$
begin raise exception 'El registro de auditoría no se puede modificar ni borrar.' using errcode = 'P0001'; end $$;
drop trigger if exists auditoria_no_modificar on public.auditoria_staff;
create trigger auditoria_no_modificar before update or delete on public.auditoria_staff
  for each row execute function private.auditoria_inmutable();
drop trigger if exists auditoria_no_vaciar on public.auditoria_staff;
create trigger auditoria_no_vaciar before truncate on public.auditoria_staff
  for each statement execute function private.auditoria_inmutable();

-- Recorta valores enormes (fotos en base64, textos largos) para que el registro sea ligero.
create or replace function private.recortar(j jsonb) returns jsonb
language sql immutable set search_path = '' as $$
  select case when j is null then 'null'::jsonb
              when length(j::text) > 300 then to_jsonb(left(j #>> '{}', 300) || '… (recortado)')
              else j end;
$$;

-- Trigger genérico: se engancha a cada tabla de la liga. Argumento 0 = columna con el nombre legible del registro (o '').
create or replace function private.auditar_cambio() returns trigger
language plpgsql security definer set search_path = '' as $$
declare
  v_old jsonb; v_new jsonb; v_row jsonb; v_cambios jsonb := '{}'::jsonb; k text;
  v_accion text; v_actor uuid := (select auth.uid()); v_rol text; v_id text;
begin
  if tg_op = 'INSERT' then
    v_accion := 'crear'; v_row := to_jsonb(new);
    for k in select jsonb_object_keys(v_row) loop
      continue when k in ('id', 'created_at', 'updated_at') or v_row -> k = 'null'::jsonb;
      v_cambios := v_cambios || jsonb_build_object(k, jsonb_build_array('null'::jsonb, private.recortar(v_row -> k)));
    end loop;
  elsif tg_op = 'DELETE' then
    v_accion := 'borrar'; v_row := to_jsonb(old);
    for k in select jsonb_object_keys(v_row) loop
      continue when k in ('id', 'created_at', 'updated_at') or v_row -> k = 'null'::jsonb;
      v_cambios := v_cambios || jsonb_build_object(k, jsonb_build_array(private.recortar(v_row -> k), 'null'::jsonb));
    end loop;
  else
    v_accion := 'editar'; v_old := to_jsonb(old); v_new := to_jsonb(new); v_row := v_new;
    for k in select jsonb_object_keys(v_new) loop
      continue when k in ('created_at', 'updated_at');
      if (v_new -> k) is distinct from (v_old -> k) then
        v_cambios := v_cambios || jsonb_build_object(k, jsonb_build_array(private.recortar(v_old -> k), private.recortar(v_new -> k)));
      end if;
    end loop;
    if v_cambios = '{}'::jsonb then return new; end if;          -- solo cambió la hora de modificación: no es noticia
    if (v_old ->> 'publicada') = 'true' and (v_new ->> 'publicada') = 'false' then v_accion := 'ocultar'; end if;
  end if;

  v_id := coalesce(v_row ->> 'id', nullif(concat_ws('/', v_row ->> 'temporada', v_row ->> 'cruce'), ''));
  select p.rol into v_rol from public.perfiles p where p.id = v_actor;
  insert into public.auditoria_staff (actor_id, actor_rol, accion, tabla, registro_id, titulo, cambios)
  values (v_actor, v_rol, v_accion, tg_table_name, v_id, nullif(v_row ->> nullif(tg_argv[0], ''), ''), v_cambios);
  return coalesce(new, old);
end $$;

do $$
declare par text[]; t text; col text;
begin
  foreach par slice 1 in array array[
    array['jugadores','nombre'], array['equipos','nombre'], array['eventos_partido','tipo_evento'], array['grupos_divisiones','nombre'],
    array['partidos',''], array['partidos_torneo',''], array['participaciones','titulo'], array['transferencias',''],
    array['copa_resultados','cruce'], array['contratos_plantilla','rol_plantilla'], array['noticias','titulo'],
    array['ligas','nombre'], array['temporadas','nombre']]
  loop
    t := par[1]; col := par[2];
    execute format('drop trigger if exists zz_auditoria on public.%I', t);
    execute format('create trigger zz_auditoria after insert or update or delete on public.%I for each row execute function private.auditar_cambio(%L)', t, col);
  end loop;
end $$;

-- ═════════ 5 · CAMBIO DE ROL: SOLO POR `asignar_rol` Y SIEMPRE AUDITADO ═════════
-- Defensa extra: aunque algún día se abriera por error la columna `rol` a los usuarios, este trigger lo rechaza.
create or replace function private.proteger_rol() returns trigger
language plpgsql set search_path = '' as $$
begin
  if new.rol is distinct from old.rol
     and (select auth.uid()) is not null
     and coalesce(current_setting('app.rol_autorizado', true), '') <> '1' then
    raise exception 'El rol solo se cambia con la función asignar_rol.' using errcode = '42501';
  end if;
  return new;
end $$;
drop trigger if exists trg_proteger_rol on public.perfiles;
create trigger trg_proteger_rol before update of rol on public.perfiles
  for each row execute function private.proteger_rol();

create or replace function private.auditar_rol() returns trigger
language plpgsql security definer set search_path = '' as $$
declare v_actor uuid := (select auth.uid()); v_rol text;
begin
  select p.rol into v_rol from public.perfiles p where p.id = v_actor;
  insert into public.auditoria_staff (actor_id, actor_rol, accion, tabla, registro_id, titulo, cambios, motivo)
  values (v_actor, v_rol, 'rol', 'perfiles', new.id::text, coalesce(nullif(new.nombre_display, ''), new.username),
          jsonb_build_object('rol', jsonb_build_array(to_jsonb(old.rol), to_jsonb(new.rol))),
          nullif(current_setting('app.rol_motivo', true), ''));
  return new;
end $$;
drop trigger if exists zz_auditoria_rol on public.perfiles;
create trigger zz_auditoria_rol after update of rol on public.perfiles
  for each row when (old.rol is distinct from new.rol) execute function private.auditar_rol();

create or replace function public.asignar_rol(p_usuario uuid, p_rol text, p_motivo text default null) returns void
language plpgsql security definer set search_path = '' as $$
declare yo uuid := private.uid_requerido(); v_viejo text;
begin
  if not private.es_admin() then raise exception 'Solo un administrador puede cambiar roles.'; end if;
  if p_rol is null or p_rol not in ('jugador', 'arbitro', 'ayudante', 'moderador', 'admin') then raise exception 'Ese rol no existe.'; end if;
  if btrim(coalesce(p_motivo, '')) = '' then raise exception 'Escribe un motivo: queda guardado en la auditoría.'; end if;
  if p_usuario = yo and p_rol <> 'admin' then
    raise exception 'No puedes quitarte tu propio rol de administrador (te quedarías sin acceso). Pídeselo a otra cuenta admin.';
  end if;
  select p.rol into v_viejo from public.perfiles p where p.id = p_usuario;
  if not found then raise exception 'Esa cuenta no existe.'; end if;
  if v_viejo = p_rol then return; end if;
  perform set_config('app.rol_autorizado', '1', true);
  perform set_config('app.rol_motivo', left(btrim(p_motivo), 300), true);
  update public.perfiles set rol = p_rol where id = p_usuario;
end $$;

-- ═════════ 6 · LECTURA DE LA AUDITORÍA (por funciones; la tabla está cerrada) ═════════
-- Admin: ve todo. Moderador: solo lo suyo. Ayudante y demás: nada.
create or replace function public.auditoria_listar(
  p_actor uuid default null, p_tabla text default null, p_accion text default null,
  p_desde timestamptz default null, p_hasta timestamptz default null, p_antes bigint default null, p_limite integer default 50
) returns jsonb
language plpgsql stable security definer set search_path = '' as $$
declare yo uuid := private.uid_requerido(); v_admin boolean := private.es_admin(); v_lim integer := least(greatest(coalesce(p_limite, 50), 1), 100);
begin
  if not private.es_moderador() then raise exception 'No tienes permiso para ver la auditoría.'; end if;
  return coalesce((
    select jsonb_agg(to_jsonb(t) order by t.id desc) from (
      select a.id, a.momento, a.actor_id, a.actor_rol, a.accion, a.tabla, a.registro_id, a.titulo, a.cambios, a.motivo,
             p.username as actor_username, p.nombre_display as actor_nombre, p.avatar_url as actor_avatar
      from public.auditoria_staff a left join public.perfiles p on p.id = a.actor_id
      where (v_admin or a.actor_id = yo)
        and (p_actor is null or a.actor_id = p_actor)
        and (p_tabla is null or a.tabla = p_tabla)
        and (p_accion is null or a.accion = p_accion)
        and (p_desde is null or a.momento >= p_desde)
        and (p_hasta is null or a.momento < p_hasta)
        and (p_antes is null or a.id < p_antes)
      order by a.id desc limit v_lim) t), '[]'::jsonb);
end $$;

create or replace function public.auditoria_resumen(p_dias integer default 7) returns jsonb
language plpgsql stable security definer set search_path = '' as $$
declare yo uuid := private.uid_requerido(); v_admin boolean := private.es_admin();
        v_dias integer := least(greatest(coalesce(p_dias, 7), 1), 90); v_desde timestamptz;
begin
  if not private.es_moderador() then raise exception 'No tienes permiso para ver la auditoría.'; end if;
  v_desde := now() - make_interval(days => v_dias);
  return jsonb_build_object(
    'dias', v_dias,
    'personas', coalesce((
      select jsonb_agg(to_jsonb(t) order by t.total desc) from (
        select a.actor_id, p.username, p.nombre_display, p.avatar_url, p.rol,
               count(*) as total,
               count(*) filter (where a.accion = 'crear') as creadas,
               count(*) filter (where a.accion = 'editar') as editadas,
               count(*) filter (where a.accion = 'ocultar') as ocultadas,
               count(*) filter (where a.accion = 'borrar') as borradas,
               count(*) filter (where a.accion in ('rol', 'sancion')) as sanciones_o_roles,
               max(a.momento) as ultima
        from public.auditoria_staff a left join public.perfiles p on p.id = a.actor_id
        where a.momento >= v_desde and (v_admin or a.actor_id = yo)
        group by a.actor_id, p.username, p.nombre_display, p.avatar_url, p.rol) t), '[]'::jsonb),
    'por_dia', coalesce((
      select jsonb_agg(jsonb_build_object('dia', d.dia, 'total', d.total) order by d.dia) from (
        select (a.momento at time zone 'America/Lima')::date as dia, count(*) as total
        from public.auditoria_staff a
        where a.momento >= v_desde and (v_admin or a.actor_id = yo)
        group by 1) d), '[]'::jsonb));
end $$;

revoke all on function public.asignar_rol(uuid, text, text) from public, anon;
revoke all on function public.auditoria_listar(uuid, text, text, timestamptz, timestamptz, bigint, integer) from public, anon;
revoke all on function public.auditoria_resumen(integer) from public, anon;
grant execute on function public.asignar_rol(uuid, text, text) to authenticated;
grant execute on function public.auditoria_listar(uuid, text, text, timestamptz, timestamptz, bigint, integer) to authenticated;
grant execute on function public.auditoria_resumen(integer) to authenticated;

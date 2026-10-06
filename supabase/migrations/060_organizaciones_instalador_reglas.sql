-- 060 · MÓDULO 2 · PRODUCTO: instalador con código, perfiles de reglas por sala y organizaciones (multi-organizador).
-- Diseño: claude/smash-soda-producto.md · Contrato para la app/instalador: claude/contrato-v1.md (v1.2.0).
-- Piezas:
--   1) codigos_instalacion + fuente_versiones + bucket privado «fuente-phoenix»: un host verificado genera un código de un solo uso;
--      el instalador lo canjea en /v1/instalar por una URL firmada y temporal del ZIP del código fuente. Nadie más lee el bucket.
--   2) perfiles_reglas: amistoso / torneo_privado / oficial (globales de Phoenix) + variantes por organización para sus torneos.
--      La app NO tiene reglas fijas: aplica las que recibe en /v1/config y en /v1/sala/abrir.
--   3) organizaciones (+ miembros con rol, marca, licencia con vigencia, torneos privados). RLS: cada organización solo ve lo suyo;
--      el staff de Phoenix ve todo. Al vencer la licencia, sus salas pasan a «amistoso» o se bloquean (lo decide la organización).
-- Decisión por defecto (cambiable): un host de organización TAMBIÉN debe estar verificado por Phoenix (host_aprobado);
-- la organización decide quién de los suyos hostea sus torneos, Phoenix decide quién recibe el software.

-- ─── 1) Organizaciones ──────────────────────────────────────────────────────────────────────────────────────────────────
create table if not exists public.organizaciones (
  id uuid primary key default gen_random_uuid(),
  nombre text not null check (char_length(nombre) between 2 and 60),
  slug text not null unique check (slug ~ '^[a-z0-9][a-z0-9-]{1,38}[a-z0-9]$'),
  logo_url text check (logo_url ~ '^https://' and char_length(logo_url) <= 500),
  color_primario text not null default '#00e5ff' check (color_primario ~ '^#[0-9a-fA-F]{6}$'),
  color_secundario text not null default '#7c3aed' check (color_secundario ~ '^#[0-9a-fA-F]{6}$'),
  licencia_desde date,
  licencia_hasta date,
  al_vencer text not null default 'amistoso' check (al_vencer in ('amistoso', 'bloquear')),
  activa boolean not null default true,
  creada timestamptz not null default now(),
  check (licencia_hasta is null or licencia_desde is null or licencia_hasta >= licencia_desde)
);

create table if not exists public.org_miembros (
  organizacion uuid not null references public.organizaciones (id) on delete cascade,
  usuario uuid not null references public.perfiles (id) on delete cascade,
  rol text not null check (rol in ('dueno', 'staff', 'host')),
  agregado timestamptz not null default now(),
  agregado_por uuid references public.perfiles (id) on delete set null,
  primary key (organizacion, usuario)
);
create index if not exists org_miembros_usuario_idx on public.org_miembros (usuario);

-- ¿Licencia vigente hoy (hora de Lima)? Sin fechas = vigente mientras esté activa (organizaciones internas/de prueba).
create or replace function private.org_vigente(p_org uuid) returns boolean
language sql stable security definer set search_path = '' as $$
  select coalesce((select o.activa
      and (o.licencia_desde is null or o.licencia_desde <= (now() at time zone 'America/Lima')::date)
      and (o.licencia_hasta is null or o.licencia_hasta >= (now() at time zone 'America/Lima')::date)
    from public.organizaciones o where o.id = p_org), false)
$$;

-- Rol del usuario actual en una organización (null si no es miembro).
create or replace function private.rol_en_org(p_org uuid) returns text
language sql stable security definer set search_path = '' as $$
  select m.rol from public.org_miembros m where m.organizacion = p_org and m.usuario = (select auth.uid())
$$;
create or replace function private.gestiona_org(p_org uuid) returns boolean
language sql stable security definer set search_path = '' as $$
  select private.es_staff() or coalesce(private.rol_en_org(p_org) in ('dueno', 'staff'), false)
$$;
revoke all on function private.org_vigente(uuid), private.rol_en_org(uuid), private.gestiona_org(uuid) from public, anon;
grant execute on function private.puede_abrir_salas(uuid) to authenticated;   -- la usa la política de fuente_versiones (058 la había cerrado)
grant execute on function private.org_vigente(uuid), private.rol_en_org(uuid), private.gestiona_org(uuid) to authenticated;

alter table public.organizaciones enable row level security;
drop policy if exists organizaciones_leer on public.organizaciones;
create policy organizaciones_leer on public.organizaciones for select to authenticated
  using (private.es_staff() or private.rol_en_org(id) is not null);

alter table public.org_miembros enable row level security;
drop policy if exists org_miembros_leer on public.org_miembros;
create policy org_miembros_leer on public.org_miembros for select to authenticated
  using (private.es_staff() or private.rol_en_org(organizacion) is not null);

-- ─── 2) Perfiles de reglas ──────────────────────────────────────────────────────────────────────────────────────────────
-- Campos = tabla de modos de smash-soda-producto.md §3. Se valida la forma en private.reglas_validas.
create or replace function private.reglas_validas(r jsonb) returns boolean
language sql immutable set search_path = '' as $$
  select jsonb_typeof(r) = 'object'
    and r ->> 'host' in ('cualquier_verificado', 'hosts_organizacion', 'neutral')
    and r ->> 'modo_competitivo' in ('opcional', 'obligatorio', 'desactivado', 'no_aplica')
    and jsonb_typeof(r -> 'retraso_host_ms') = 'number' and (r ->> 'retraso_host_ms')::numeric between 0 and 500
    and r ->> 'deteccion_partido' in ('opcional', 'activa', 'obligatoria')
    and jsonb_typeof(r -> 'captura') = 'boolean'
    and r ->> 'verificacion_parche' in ('aviso', 'lista', 'huella_oficial')
    and jsonb_typeof(coalesce(r -> 'parches_permitidos', '[]'::jsonb)) = 'array'
    and jsonb_array_length(coalesce(r -> 'parches_permitidos', '[]'::jsonb)) <= 30
    and r ->> 'pausas' in ('libres', 'limitadas')
    and jsonb_typeof(r -> 'pausas_max') = 'number' and (r ->> 'pausas_max')::numeric between 0 and 20
    and jsonb_typeof(r -> 'pausa_max_seg') = 'number' and (r ->> 'pausa_max_seg')::numeric between 0 and 1800
    and r ->> 'anti_trampa' in ('registro', 'alertas_organizador', 'alertas_staff')
    and r ->> 'marca' in ('phoenix', 'organizacion', 'liga')
    and r ->> 'notificaciones' in ('host', 'organizador', 'automaticas')
$$;

create table if not exists public.perfiles_reglas (
  id bigint generated always as identity primary key,
  clave text not null check (clave in ('amistoso', 'torneo_privado', 'oficial')),
  organizacion uuid references public.organizaciones (id) on delete cascade,   -- null = perfil global de Phoenix
  nombre text not null check (char_length(nombre) between 2 and 60),
  reglas jsonb not null check (private.reglas_validas(reglas)),
  version integer not null default 1,
  actualizado timestamptz not null default now()
);
create unique index if not exists perfiles_reglas_global_uni on public.perfiles_reglas (clave) where organizacion is null;
create index if not exists perfiles_reglas_org_idx on public.perfiles_reglas (organizacion) where organizacion is not null;
alter table public.perfiles_reglas enable row level security;
drop policy if exists perfiles_reglas_leer on public.perfiles_reglas;
create policy perfiles_reglas_leer on public.perfiles_reglas for select to authenticated
  using (organizacion is null or private.es_staff() or private.rol_en_org(organizacion) is not null);

insert into public.perfiles_reglas (clave, nombre, reglas) values
  ('amistoso', 'Amistoso', '{"host":"cualquier_verificado","modo_competitivo":"opcional","retraso_host_ms":0,"deteccion_partido":"opcional","captura":false,"verificacion_parche":"aviso","parches_permitidos":[],"pausas":"libres","pausas_max":0,"pausa_max_seg":0,"anti_trampa":"registro","marca":"phoenix","notificaciones":"host"}'),
  ('torneo_privado', 'Torneo privado', '{"host":"hosts_organizacion","modo_competitivo":"opcional","retraso_host_ms":0,"deteccion_partido":"activa","captura":true,"verificacion_parche":"lista","parches_permitidos":[],"pausas":"limitadas","pausas_max":2,"pausa_max_seg":180,"anti_trampa":"alertas_organizador","marca":"organizacion","notificaciones":"organizador"}'),
  ('oficial', 'Oficial Phoenix', '{"host":"neutral","modo_competitivo":"no_aplica","retraso_host_ms":0,"deteccion_partido":"obligatoria","captura":true,"verificacion_parche":"huella_oficial","parches_permitidos":["Conmegol"],"pausas":"limitadas","pausas_max":2,"pausa_max_seg":180,"anti_trampa":"alertas_staff","marca":"liga","notificaciones":"automaticas"}')
on conflict do nothing;

-- ─── 3) Torneos privados de una organización ────────────────────────────────────────────────────────────────────────────
create table if not exists public.torneos_privados (
  id bigint generated always as identity primary key,
  organizacion uuid not null references public.organizaciones (id) on delete cascade,
  nombre text not null check (char_length(nombre) between 2 and 80),
  perfil_reglas bigint references public.perfiles_reglas (id) on delete set null,   -- null = perfil global «torneo_privado»
  estado text not null default 'borrador' check (estado in ('borrador', 'en_curso', 'finalizado', 'cancelado')),
  inicia date,
  termina date,
  creado timestamptz not null default now(),
  check (termina is null or inicia is null or termina >= inicia)
);
create index if not exists torneos_privados_org_idx on public.torneos_privados (organizacion);
alter table public.torneos_privados enable row level security;
drop policy if exists torneos_privados_leer on public.torneos_privados;
create policy torneos_privados_leer on public.torneos_privados for select to authenticated
  using (private.es_staff() or private.rol_en_org(organizacion) is not null);

-- ─── 4) Salas: modo, organización y torneo ──────────────────────────────────────────────────────────────────────────────
alter table public.salas
  add column if not exists modo text not null default 'amistoso' check (modo in ('amistoso', 'torneo_privado', 'oficial')),
  add column if not exists organizacion uuid references public.organizaciones (id) on delete set null,
  add column if not exists torneo_privado bigint references public.torneos_privados (id) on delete set null,
  add column if not exists perfil_reglas bigint references public.perfiles_reglas (id) on delete set null,
  add column if not exists reglas jsonb;                     -- copia congelada de las reglas al abrir (para disputas)
create index if not exists salas_org_idx on public.salas (organizacion) where organizacion is not null;

-- Aislamiento: una sala de organización solo la ven sus miembros (además de host y staff Phoenix), sea cual sea la visibilidad.
drop policy if exists salas_leer on public.salas;
create policy salas_leer on public.salas for select to authenticated
  using (
    case when organizacion is not null
      then host = (select auth.uid()) or private.es_staff() or private.rol_en_org(organizacion) is not null
      else private.puede_ver_sala(host, case when publicar_en_pagina then visibilidad else 'privada' end, reto_id)
    end);

drop policy if exists salas_enlace_leer on public.salas_enlace;
create policy salas_enlace_leer on public.salas_enlace for select to authenticated
  using (exists (
    select 1 from public.salas s
    where s.id = sala_id and s.estado in ('preparando', 'abierta', 'en_partida')
      and case when s.organizacion is not null
            then s.host = (select auth.uid()) or private.es_staff() or private.rol_en_org(s.organizacion) is not null
            else private.puede_ver_sala(s.host, case when s.publicar_en_pagina then s.visibilidad else 'privada' end, s.reto_id)
                 and (s.visibilidad <> 'torneo' or s.host = (select auth.uid()) or private.es_staff()
                      or exists (select 1 from private.jugadores_de_reto(s.reto_id) j where j.usuario_id = (select auth.uid())))
          end
  ));

drop policy if exists eventos_sala_leer on public.eventos_sala;
create policy eventos_sala_leer on public.eventos_sala for select to authenticated
  using (exists (
    select 1 from public.salas s where s.id = sala_id
      and (s.host = (select auth.uid()) or private.es_staff()
           or (s.organizacion is not null and private.gestiona_org(s.organizacion))
           or (s.reto_id is not null and exists (select 1 from private.jugadores_de_reto(s.reto_id) j where j.usuario_id = (select auth.uid()))))
  ));

-- ─── 5) Instalador: versiones del código fuente + códigos de instalación + bucket privado ────────────────────────────────
insert into storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
values ('fuente-phoenix', 'fuente-phoenix', false, 209715200, array['application/zip', 'application/x-zip-compressed', 'application/octet-stream'])
on conflict (id) do update set public = false;
-- Sin políticas en storage.objects para este bucket: ni anon ni authenticated pueden leer/subir; solo service_role
-- (la Edge Function firma URLs temporales) y el panel de Supabase.

create table if not exists public.fuente_versiones (
  id bigint generated always as identity primary key,
  version text not null unique check (version ~ '^[0-9]+(\.[0-9]+){1,3}$'),
  ruta_objeto text not null check (ruta_objeto ~ '^[A-Za-z0-9._/-]{1,200}$' and ruta_objeto !~ '\.\.'),
  sha256 text not null check (sha256 ~ '^[0-9a-f]{64}$'),
  notas text check (char_length(notas) <= 500),
  activa boolean not null default true,
  publicada timestamptz not null default now(),
  publicada_por uuid references public.perfiles (id) on delete set null
);
alter table public.fuente_versiones enable row level security;
drop policy if exists fuente_versiones_leer on public.fuente_versiones;
create policy fuente_versiones_leer on public.fuente_versiones for select to authenticated
  using (private.es_staff() or private.puede_abrir_salas((select auth.uid())));

create table if not exists public.codigos_instalacion (
  id bigint generated always as identity primary key,
  usuario uuid not null references public.perfiles (id) on delete cascade,
  codigo_huella text not null unique,
  expira timestamptz not null,
  usado timestamptz,
  version_entregada text,
  ip_canje text,
  creado timestamptz not null default now()
);
create index if not exists codigos_instalacion_usuario_idx on public.codigos_instalacion (usuario, creado desc);
alter table public.codigos_instalacion enable row level security;
drop policy if exists codigos_instalacion_leer on public.codigos_instalacion;
create policy codigos_instalacion_leer on public.codigos_instalacion for select to authenticated
  using (usuario = (select auth.uid()) or private.es_staff());

-- ─── 6) Permisos de tabla ───────────────────────────────────────────────────────────────────────────────────────────────
revoke all on public.organizaciones, public.org_miembros, public.perfiles_reglas, public.torneos_privados,
              public.fuente_versiones, public.codigos_instalacion from anon, authenticated;
grant select on public.organizaciones, public.org_miembros, public.perfiles_reglas, public.torneos_privados,
                public.fuente_versiones to authenticated;
grant select (id, usuario, expira, usado, version_entregada, creado) on public.codigos_instalacion to authenticated;

-- ─── 7) RPC ─────────────────────────────────────────────────────────────────────────────────────────────────────────────
-- 7.1 Host verificado: código de instalación (XXXX-XXXX, 24 h, un solo uso). Máx. 3 por día.
create or replace function public.generar_codigo_instalacion() returns jsonb
language plpgsql security definer set search_path = '' as $$
declare yo uuid := private.uid_requerido(); alfabeto text := 'ABCDEFGHJKMNPQRSTUVWXYZ23456789'; b bytea; c text; vence timestamptz := now() + interval '24 hours';
begin
  if not private.puede_abrir_salas(yo) then raise exception 'Solo hosts verificados por el staff pueden instalar Phoenix Soda.' using errcode = '42501'; end if;
  if (select count(*) from public.codigos_instalacion where usuario = yo and creado > now() - interval '1 day') >= 3 then
    raise exception 'Ya generaste 3 códigos hoy: usa el último o espera.' using errcode = 'P0001';
  end if;
  update public.codigos_instalacion set expira = now() where usuario = yo and usado is null and expira > now();
  loop
    b := extensions.gen_random_bytes(8); c := '';
    for i in 0..7 loop c := c || substr(alfabeto, (get_byte(b, i) % 31) + 1, 1); end loop;
    c := substr(c, 1, 4) || '-' || substr(c, 5, 4);
    begin
      insert into public.codigos_instalacion (usuario, codigo_huella, expira) values (yo, encode(extensions.digest(c, 'sha256'), 'hex'), vence);
      exit;
    exception when unique_violation then null;
    end;
  end loop;
  return jsonb_build_object('codigo', c, 'expira', vence);
end $$;

-- 7.2 Staff Phoenix: publicar / retirar una versión del código fuente (el ZIP se sube antes al bucket desde el panel de Supabase).
create or replace function public.staff_publicar_fuente(p_version text, p_ruta text, p_sha256 text, p_notas text default null) returns bigint
language plpgsql security definer set search_path = '' as $$
declare nuevo bigint;
begin
  perform private.uid_requerido();
  if not private.es_staff() then raise exception 'Solo staff.' using errcode = '42501'; end if;
  insert into public.fuente_versiones (version, ruta_objeto, sha256, notas, publicada_por)
  values (btrim(p_version), btrim(p_ruta), lower(btrim(p_sha256)), left(btrim(p_notas), 500), (select auth.uid()))
  on conflict (version) do update set ruta_objeto = excluded.ruta_objeto, sha256 = excluded.sha256, notas = excluded.notas, activa = true, publicada = now()
  returning id into nuevo;
  perform private.auditar_moderacion('publicar_fuente', 'fuente_versiones', nuevo::text, btrim(p_version), jsonb_build_object('ruta', p_ruta), null);
  return nuevo;
end $$;

create or replace function public.staff_fuente_activa(p_version text, p_activa boolean) returns void
language plpgsql security definer set search_path = '' as $$
begin
  perform private.uid_requerido();
  if not private.es_staff() then raise exception 'Solo staff.' using errcode = '42501'; end if;
  update public.fuente_versiones set activa = p_activa where version = btrim(p_version);
  if not found then raise exception 'Versión no encontrada.' using errcode = 'P0002'; end if;
  perform private.auditar_moderacion(case when p_activa then 'activar_fuente' else 'retirar_fuente' end, 'fuente_versiones', p_version, p_version, null, null);
end $$;

-- 7.3 Staff Phoenix: organizaciones y licencias.
create or replace function public.admin_guardar_org(p_id uuid, p_nombre text, p_slug text, p_dueno uuid default null,
  p_licencia_desde date default null, p_licencia_hasta date default null, p_al_vencer text default 'amistoso', p_activa boolean default true) returns uuid
language plpgsql security definer set search_path = '' as $$
declare oid uuid := p_id;
begin
  perform private.uid_requerido();
  if not private.es_staff() then raise exception 'Solo staff de Phoenix.' using errcode = '42501'; end if;
  if oid is null then
    insert into public.organizaciones (nombre, slug, licencia_desde, licencia_hasta, al_vencer, activa)
    values (btrim(p_nombre), lower(btrim(p_slug)), p_licencia_desde, p_licencia_hasta, p_al_vencer, p_activa) returning id into oid;
  else
    update public.organizaciones set nombre = btrim(p_nombre), slug = lower(btrim(p_slug)), licencia_desde = p_licencia_desde,
      licencia_hasta = p_licencia_hasta, al_vencer = p_al_vencer, activa = p_activa where id = oid;
    if not found then raise exception 'Organización no encontrada.' using errcode = 'P0002'; end if;
  end if;
  if p_dueno is not null then
    insert into public.org_miembros (organizacion, usuario, rol, agregado_por) values (oid, p_dueno, 'dueno', (select auth.uid()))
    on conflict (organizacion, usuario) do update set rol = 'dueno';
  end if;
  perform private.auditar_moderacion('guardar_org', 'organizaciones', oid::text, btrim(p_nombre),
    jsonb_build_object('licencia_desde', p_licencia_desde, 'licencia_hasta', p_licencia_hasta, 'al_vencer', p_al_vencer, 'activa', p_activa), null);
  return oid;
end $$;

-- 7.4 Dueño/staff de la organización (o staff Phoenix): miembros, marca, torneos y su perfil de reglas.
create or replace function public.org_guardar_miembro(p_org uuid, p_usuario uuid, p_rol text) returns void
language plpgsql security definer set search_path = '' as $$
declare mi_rol text;
begin
  perform private.uid_requerido();
  if not private.gestiona_org(p_org) then raise exception 'No gestionas esta organización.' using errcode = '42501'; end if;
  mi_rol := private.rol_en_org(p_org);
  if p_rol is not null and p_rol not in ('staff', 'host', 'dueno') then raise exception 'Rol no válido.' using errcode = '22023'; end if;
  if (p_rol = 'dueno' or exists (select 1 from public.org_miembros where organizacion = p_org and usuario = p_usuario and rol = 'dueno'))
     and not private.es_staff() and mi_rol is distinct from 'dueno' then
    raise exception 'Solo el dueño puede tocar a otro dueño.' using errcode = '42501';
  end if;
  if p_rol is null then
    delete from public.org_miembros where organizacion = p_org and usuario = p_usuario;
  else
    insert into public.org_miembros (organizacion, usuario, rol, agregado_por) values (p_org, p_usuario, p_rol, (select auth.uid()))
    on conflict (organizacion, usuario) do update set rol = excluded.rol;
  end if;
  if not exists (select 1 from public.org_miembros where organizacion = p_org and rol = 'dueno') then
    raise exception 'La organización debe conservar al menos un dueño.' using errcode = 'P0001';
  end if;
end $$;

create or replace function public.org_guardar_marca(p_org uuid, p_logo_url text, p_color_primario text, p_color_secundario text) returns void
language plpgsql security definer set search_path = '' as $$
begin
  perform private.uid_requerido();
  if not private.gestiona_org(p_org) then raise exception 'No gestionas esta organización.' using errcode = '42501'; end if;
  update public.organizaciones set logo_url = nullif(btrim(p_logo_url), ''), color_primario = coalesce(p_color_primario, color_primario),
         color_secundario = coalesce(p_color_secundario, color_secundario) where id = p_org;
end $$;

create or replace function public.org_guardar_perfil_reglas(p_org uuid, p_id bigint, p_nombre text, p_reglas jsonb) returns bigint
language plpgsql security definer set search_path = '' as $$
declare rid bigint := p_id; r jsonb;
begin
  perform private.uid_requerido();
  if not private.gestiona_org(p_org) then raise exception 'No gestionas esta organización.' using errcode = '42501'; end if;
  r := p_reglas || jsonb_build_object('marca', 'organizacion', 'notificaciones', 'organizador');   -- marca y avisos siempre de la organización
  if not private.reglas_validas(r) then raise exception 'Reglas con campos faltantes o valores no permitidos.' using errcode = '22023'; end if;
  if r ->> 'host' = 'neutral' or r ->> 'anti_trampa' = 'alertas_staff' then
    raise exception 'Ese valor está reservado para partidos oficiales de Phoenix.' using errcode = '22023';
  end if;
  if rid is null then
    insert into public.perfiles_reglas (clave, organizacion, nombre, reglas) values ('torneo_privado', p_org, btrim(p_nombre), r) returning id into rid;
  else
    update public.perfiles_reglas set nombre = btrim(p_nombre), reglas = r, version = version + 1, actualizado = now()
    where id = rid and organizacion = p_org;
    if not found then raise exception 'Perfil no encontrado.' using errcode = 'P0002'; end if;
  end if;
  return rid;
end $$;

create or replace function public.org_guardar_torneo(p_org uuid, p_id bigint, p_nombre text, p_perfil bigint, p_estado text, p_inicia date, p_termina date) returns bigint
language plpgsql security definer set search_path = '' as $$
declare tid bigint := p_id;
begin
  perform private.uid_requerido();
  if not private.gestiona_org(p_org) then raise exception 'No gestionas esta organización.' using errcode = '42501'; end if;
  if p_perfil is not null and not exists (select 1 from public.perfiles_reglas where id = p_perfil and organizacion = p_org) then
    raise exception 'Ese perfil de reglas no es de esta organización.' using errcode = '22023';
  end if;
  if tid is null then
    insert into public.torneos_privados (organizacion, nombre, perfil_reglas, estado, inicia, termina)
    values (p_org, btrim(p_nombre), p_perfil, coalesce(p_estado, 'borrador'), p_inicia, p_termina) returning id into tid;
  else
    update public.torneos_privados set nombre = btrim(p_nombre), perfil_reglas = p_perfil, estado = coalesce(p_estado, estado), inicia = p_inicia, termina = p_termina
    where id = tid and organizacion = p_org;
    if not found then raise exception 'Torneo no encontrado.' using errcode = 'P0002'; end if;
  end if;
  return tid;
end $$;

-- 7.5 Staff Phoenix: editar un perfil global (amistoso / torneo_privado / oficial).
create or replace function public.staff_guardar_perfil_global(p_clave text, p_reglas jsonb) returns void
language plpgsql security definer set search_path = '' as $$
begin
  perform private.uid_requerido();
  if not private.es_staff() then raise exception 'Solo staff.' using errcode = '42501'; end if;
  if not private.reglas_validas(p_reglas) then raise exception 'Reglas con campos faltantes o valores no permitidos.' using errcode = '22023'; end if;
  update public.perfiles_reglas set reglas = p_reglas, version = version + 1, actualizado = now() where clave = p_clave and organizacion is null;
  if not found then raise exception 'Perfil global no encontrado.' using errcode = 'P0002'; end if;
  perform private.auditar_moderacion('perfil_global', 'perfiles_reglas', p_clave, p_clave, p_reglas, null);
end $$;

revoke all on function public.generar_codigo_instalacion(), public.staff_publicar_fuente(text, text, text, text), public.staff_fuente_activa(text, boolean),
  public.admin_guardar_org(uuid, text, text, uuid, date, date, text, boolean), public.org_guardar_miembro(uuid, uuid, text),
  public.org_guardar_marca(uuid, text, text, text), public.org_guardar_perfil_reglas(uuid, bigint, text, jsonb),
  public.org_guardar_torneo(uuid, bigint, text, bigint, text, date, date), public.staff_guardar_perfil_global(text, jsonb) from public, anon;
grant execute on function public.generar_codigo_instalacion(), public.staff_publicar_fuente(text, text, text, text), public.staff_fuente_activa(text, boolean),
  public.admin_guardar_org(uuid, text, text, uuid, date, date, text, boolean), public.org_guardar_miembro(uuid, uuid, text),
  public.org_guardar_marca(uuid, text, text, text), public.org_guardar_perfil_reglas(uuid, bigint, text, jsonb),
  public.org_guardar_torneo(uuid, bigint, text, bigint, text, date, date), public.staff_guardar_perfil_global(text, jsonb) to authenticated;

-- 7.6 Solo backend (Edge Function): canje atómico del código de instalación → usuario + versión a entregar.
create or replace function public.sistema_canjear_instalacion(p_huella text, p_ip text) returns jsonb
language plpgsql security definer set search_path = '' as $$
declare c public.codigos_instalacion%rowtype; f public.fuente_versiones%rowtype;
begin
  select * into c from public.codigos_instalacion where codigo_huella = p_huella for update;
  if not found then return jsonb_build_object('error', 'CODIGO_NO_ENCONTRADO'); end if;
  if c.usado is not null then return jsonb_build_object('error', 'CODIGO_USADO'); end if;
  if c.expira <= now() then return jsonb_build_object('error', 'CODIGO_VENCIDO'); end if;
  if not private.puede_abrir_salas(c.usuario) then return jsonb_build_object('error', 'HOST_NO_AUTORIZADO'); end if;
  select * into f from public.fuente_versiones where activa order by string_to_array(version, '.')::int[] desc limit 1;
  if not found then return jsonb_build_object('error', 'SIN_VERSION_PUBLICADA'); end if;
  update public.codigos_instalacion set usado = now(), version_entregada = f.version, ip_canje = left(p_ip, 60) where id = c.id;
  return jsonb_build_object('usuario', c.usuario, 'version', f.version, 'ruta', f.ruta_objeto, 'sha256', f.sha256, 'notas', f.notas);
end $$;
revoke all on function public.sistema_canjear_instalacion(text, text) from public, anon, authenticated;
grant execute on function public.sistema_canjear_instalacion(text, text) to service_role;

-- 7.7 Licencia vigente (para la web y la Edge Function).
create or replace function public.org_licencia_vigente(p_org uuid) returns boolean
language sql stable security definer set search_path = '' as $$ select private.org_vigente(p_org) $$;
revoke all on function public.org_licencia_vigente(uuid) from public, anon;
grant execute on function public.org_licencia_vigente(uuid) to authenticated, service_role;

-- ─── 8) Licencias vencidas con salas vivas (cada hora): «bloquear» cierra; «amistoso» degrada a reglas de amistoso ──────
create or replace function private.aplicar_licencias() returns integer
language plpgsql security definer set search_path = '' as $$
declare n integer := 0; k integer; amistoso public.perfiles_reglas%rowtype;
begin
  select * into amistoso from public.perfiles_reglas where clave = 'amistoso' and organizacion is null;
  update public.salas s set estado = 'cerrada', cerrada_en = now()
  from public.organizaciones o
  where s.organizacion = o.id and s.estado in ('preparando', 'abierta', 'en_partida') and o.al_vencer = 'bloquear' and not private.org_vigente(o.id);
  get diagnostics k = row_count; n := n + k;
  update public.salas s set modo = 'amistoso', organizacion = null, torneo_privado = null, perfil_reglas = amistoso.id, reglas = amistoso.reglas
  from public.organizaciones o
  where s.organizacion = o.id and s.estado in ('preparando', 'abierta', 'en_partida') and o.al_vencer = 'amistoso' and not private.org_vigente(o.id);
  get diagnostics k = row_count; n := n + k;
  return n;
end $$;
revoke all on function private.aplicar_licencias() from public, anon, authenticated;
select cron.schedule('salas-licencias', '11 * * * *', 'select private.aplicar_licencias()');

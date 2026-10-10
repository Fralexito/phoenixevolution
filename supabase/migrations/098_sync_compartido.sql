-- 098 · «Phoenix Sync compartido»: fichajes entre PCs de un grupo + interruptor de autorización (solo admin).
-- La web es el buzón: guarda operaciones (fichajes) y el estado que informa cada PC. NO resuelve conflictos.
-- Nada se borra (miembro.activo, versiones «archivada»). Todo se escribe por RPC; las tablas solo se leen por RLS.
-- Aplicada por partes: A tablas · B ayudas, RLS y permisos · C RPC de la web · D RPC de la API (service_role) · E archivo entero (Storage).
-- Auditoría: auditoria_staff solo admite acciones crear/editar/borrar/ocultar/rol/sancion/sistema; el detalle va en título y cambios.
-- Modos: 'automatico' (se aplica solo) · 'autorizacion' (cada PC aprueba). Valor por defecto de un grupo nuevo: 'autorizacion'.

-- ── A) Tablas ─────────────────────────────────────────────────────────────────────────────────────────────────────────
create table if not exists public.sync_grupos (
  id uuid primary key default gen_random_uuid(),
  nombre text not null check (char_length(btrim(nombre)) between 3 and 60),
  ultimo_seq bigint not null default 0,
  creado_por uuid references public.perfiles (id) on delete set null,
  creado_en timestamptz not null default now()
);
create table if not exists public.sync_miembros (
  grupo_id uuid not null references public.sync_grupos (id) on delete cascade,
  usuario_id uuid not null references public.perfiles (id) on delete cascade,
  rol text not null default 'miembro' check (rol in ('admin', 'publica', 'miembro')),
  puede_aplicar boolean not null default true,
  activo boolean not null default true,
  creado_en timestamptz not null default now(),
  primary key (grupo_id, usuario_id)
);
create index if not exists sync_miembros_usuario on public.sync_miembros (usuario_id) where activo;
create table if not exists public.sync_config (
  grupo_id uuid primary key references public.sync_grupos (id) on delete cascade,
  modo text not null default 'autorizacion' check (modo in ('automatico', 'autorizacion')),
  actualizado_por uuid references public.perfiles (id) on delete set null,
  actualizado_en timestamptz not null default now()
);
create table if not exists public.sync_config_historial (
  id bigint generated always as identity primary key,
  grupo_id uuid not null references public.sync_grupos (id) on delete cascade,
  modo_anterior text,
  modo_nuevo text not null,
  por uuid references public.perfiles (id) on delete set null,
  en timestamptz not null default now()
);
create index if not exists sync_config_historial_grupo on public.sync_config_historial (grupo_id, en desc);
create table if not exists public.sync_operaciones (
  id uuid primary key,
  grupo_id uuid not null references public.sync_grupos (id) on delete cascade,
  seq bigint not null,
  tipo text not null default 'fichaje' check (tipo in ('fichaje')),
  jugador_id int not null check (jugador_id between 0 and 9999999),
  equipo_origen int not null check (equipo_origen between 0 and 9999999),
  equipo_destino int not null check (equipo_destino between 0 and 9999999),
  autor_usuario_id uuid references public.perfiles (id) on delete set null,
  base_seq bigint not null default 0 check (base_seq >= 0),
  sha256_resultado text check (sha256_resultado is null or sha256_resultado ~ '^[0-9a-f]{64}$'),
  resumen text check (resumen is null or char_length(resumen) <= 200),
  parche text check (parche is null or char_length(parche) <= 60),
  huella_bd text check (huella_bd is null or char_length(huella_bd) <= 128),
  formato int check (formato is null or formato between 0 and 100000),
  creado_en timestamptz not null default now(),
  unique (grupo_id, seq)
);
create index if not exists sync_operaciones_grupo on public.sync_operaciones (grupo_id, seq desc);
create table if not exists public.sync_aplicaciones (
  op_id uuid not null references public.sync_operaciones (id) on delete cascade,
  usuario_id uuid not null references public.perfiles (id) on delete cascade,
  dispositivo_id uuid references public.dispositivos_host (id) on delete set null,
  estado text not null default 'pendiente' check (estado in ('pendiente', 'aplicada', 'conflicto', 'omitida', 'rechazada', 'incompatible')),
  motivo text check (motivo is null or char_length(motivo) <= 300),
  actualizado_en timestamptz not null default now(),
  primary key (op_id, usuario_id)
);
create index if not exists sync_aplicaciones_usuario on public.sync_aplicaciones (usuario_id, estado);
create table if not exists public.sync_option_versiones (
  id uuid primary key default gen_random_uuid(),
  grupo_id uuid not null references public.sync_grupos (id) on delete cascade,
  autor uuid references public.perfiles (id) on delete set null,
  sha256 text not null check (sha256 ~ '^[0-9a-f]{64}$'),
  tamano int not null check (tamano between 1 and 8388608),
  resumen text check (resumen is null or char_length(resumen) <= 200),
  parche text check (parche is null or char_length(parche) <= 60),
  huella_bd text check (huella_bd is null or char_length(huella_bd) <= 128),
  estado text not null default 'subiendo' check (estado in ('subiendo', 'lista', 'archivada')),
  ruta_storage text not null,
  creado_en timestamptz not null default now()
);
create index if not exists sync_option_versiones_grupo on public.sync_option_versiones (grupo_id, creado_en desc);

-- ── B) Ayudas, RLS y permisos ────────────────────────────────────────────────────────────────────────────────────────
create or replace function private.sync_es_admin_sitio(p_uid uuid) returns boolean
language sql stable security definer set search_path = '' as $$
  select exists (select 1 from public.perfiles p where p.id = p_uid and p.rol = 'admin');
$$;
create or replace function private.sync_rol(p_grupo uuid, p_uid uuid) returns text
language sql stable security definer set search_path = '' as $$
  select case
    when private.sync_es_admin_sitio(p_uid) and exists (select 1 from public.sync_grupos g where g.id = p_grupo) then 'admin'
    else (select m.rol from public.sync_miembros m where m.grupo_id = p_grupo and m.usuario_id = p_uid and m.activo)
  end;
$$;
create or replace function private.sync_miembro(p_grupo uuid) returns boolean
language sql stable security definer set search_path = '' as $$
  select private.sync_rol(p_grupo, (select auth.uid())) is not null;
$$;
create or replace function private.sync_admin(p_grupo uuid) returns boolean
language sql stable security definer set search_path = '' as $$
  select private.sync_rol(p_grupo, (select auth.uid())) = 'admin';
$$;
revoke all on function private.sync_es_admin_sitio(uuid), private.sync_rol(uuid, uuid) from public, anon, authenticated;
revoke all on function private.sync_miembro(uuid), private.sync_admin(uuid) from public, anon;
grant execute on function private.sync_miembro(uuid), private.sync_admin(uuid) to authenticated;

alter table public.sync_grupos enable row level security;
alter table public.sync_miembros enable row level security;
alter table public.sync_config enable row level security;
alter table public.sync_config_historial enable row level security;
alter table public.sync_operaciones enable row level security;
alter table public.sync_aplicaciones enable row level security;
alter table public.sync_option_versiones enable row level security;

create policy sync_grupos_lee on public.sync_grupos for select to authenticated using (private.sync_miembro(id));
create policy sync_miembros_lee on public.sync_miembros for select to authenticated using (private.sync_miembro(grupo_id));
create policy sync_config_lee on public.sync_config for select to authenticated using (private.sync_admin(grupo_id));
create policy sync_config_historial_lee on public.sync_config_historial for select to authenticated using (private.sync_admin(grupo_id));
create policy sync_operaciones_lee on public.sync_operaciones for select to authenticated using (private.sync_miembro(grupo_id));
create policy sync_aplicaciones_lee on public.sync_aplicaciones for select to authenticated
  using (exists (select 1 from public.sync_operaciones o where o.id = op_id and private.sync_miembro(o.grupo_id)));
create policy sync_option_versiones_lee on public.sync_option_versiones for select to authenticated using (private.sync_miembro(grupo_id));

revoke all on public.sync_grupos, public.sync_miembros, public.sync_config, public.sync_config_historial, public.sync_operaciones, public.sync_aplicaciones, public.sync_option_versiones from anon, authenticated;
grant select on public.sync_grupos, public.sync_miembros, public.sync_config, public.sync_config_historial, public.sync_operaciones, public.sync_aplicaciones, public.sync_option_versiones to authenticated;

-- ── C) RPC de la web (sesión del usuario) ────────────────────────────────────────────────────────────────────────────
create or replace function private.sync_poner_modo(p_grupo uuid, p_uid uuid, p_modo text) returns jsonb
language plpgsql security definer set search_path = '' as $$
declare v_ant text;
begin
  if p_modo not in ('automatico', 'autorizacion') then return jsonb_build_object('error', 'CAMPO_INVALIDO'); end if;
  select modo into v_ant from public.sync_config where grupo_id = p_grupo;
  insert into public.sync_config (grupo_id, modo, actualizado_por, actualizado_en) values (p_grupo, p_modo, p_uid, now())
    on conflict (grupo_id) do update set modo = excluded.modo, actualizado_por = excluded.actualizado_por, actualizado_en = excluded.actualizado_en;
  if v_ant is distinct from p_modo then
    insert into public.sync_config_historial (grupo_id, modo_anterior, modo_nuevo, por) values (p_grupo, v_ant, p_modo, p_uid);
  end if;
  return jsonb_build_object('ok', true, 'modo', p_modo, 'anterior', v_ant);
end $$;
revoke all on function private.sync_poner_modo(uuid, uuid, text) from public, anon, authenticated;

create or replace function public.sync_grupo_crear(p_nombre text) returns uuid
language plpgsql security definer set search_path = '' as $$
declare v_uid uuid := auth.uid(); v_id uuid;
begin
  if v_uid is null or not private.sync_es_admin_sitio(v_uid) then raise exception 'NO_AUTORIZADO'; end if;
  insert into public.sync_grupos (nombre, creado_por) values (btrim(p_nombre), v_uid) returning id into v_id;
  insert into public.sync_miembros (grupo_id, usuario_id, rol, puede_aplicar) values (v_id, v_uid, 'admin', true);
  perform private.sync_poner_modo(v_id, v_uid, 'autorizacion');
  return v_id;
end $$;

create or replace function public.sync_config_cambiar(p_grupo uuid, p_modo text) returns void
language plpgsql security definer set search_path = '' as $$
declare v_uid uuid := auth.uid(); r jsonb;
begin
  if v_uid is null or private.sync_rol(p_grupo, v_uid) is distinct from 'admin' then raise exception 'NO_AUTORIZADO'; end if;
  r := private.sync_poner_modo(p_grupo, v_uid, p_modo);
  if r ? 'error' then raise exception 'CAMPO_INVALIDO'; end if;
  perform private.auditar_moderacion('editar', 'sync_config', p_grupo::text, 'Phoenix Sync · modo de aplicación', jsonb_build_object('de', r -> 'anterior', 'a', p_modo), null);
end $$;

create or replace function public.sync_miembro_poner(p_grupo uuid, p_usuario uuid, p_rol text, p_puede_aplicar boolean default true) returns void
language plpgsql security definer set search_path = '' as $$
declare v_uid uuid := auth.uid();
begin
  if v_uid is null or private.sync_rol(p_grupo, v_uid) is distinct from 'admin' then raise exception 'NO_AUTORIZADO'; end if;
  if p_rol not in ('admin', 'publica', 'miembro') then raise exception 'CAMPO_INVALIDO'; end if;
  if not exists (select 1 from public.perfiles where id = p_usuario) then raise exception 'USUARIO_NO_ENCONTRADO'; end if;
  insert into public.sync_miembros (grupo_id, usuario_id, rol, puede_aplicar, activo) values (p_grupo, p_usuario, p_rol, coalesce(p_puede_aplicar, true), true)
    on conflict (grupo_id, usuario_id) do update set rol = excluded.rol, puede_aplicar = excluded.puede_aplicar, activo = true;
  perform private.auditar_moderacion('editar', 'sync_miembros', p_grupo::text, 'Phoenix Sync · miembro añadido o cambiado', jsonb_build_object('usuario', p_usuario, 'rol', p_rol, 'aplica', p_puede_aplicar), null);
end $$;

create or replace function public.sync_miembro_quitar(p_grupo uuid, p_usuario uuid) returns void
language plpgsql security definer set search_path = '' as $$
declare v_uid uuid := auth.uid();
begin
  if v_uid is null or private.sync_rol(p_grupo, v_uid) is distinct from 'admin' then raise exception 'NO_AUTORIZADO'; end if;
  if p_usuario = v_uid then raise exception 'NO_PUEDES_QUITARTE'; end if;
  update public.sync_miembros set activo = false where grupo_id = p_grupo and usuario_id = p_usuario;
  perform private.auditar_moderacion('editar', 'sync_miembros', p_grupo::text, 'Phoenix Sync · miembro quitado', jsonb_build_object('usuario', p_usuario), null);
end $$;

revoke execute on function public.sync_grupo_crear(text), public.sync_config_cambiar(uuid, text), public.sync_miembro_poner(uuid, uuid, text, boolean), public.sync_miembro_quitar(uuid, uuid) from public, anon;
grant execute on function public.sync_grupo_crear(text), public.sync_config_cambiar(uuid, text), public.sync_miembro_poner(uuid, uuid, text, boolean), public.sync_miembro_quitar(uuid, uuid) to authenticated;

-- ── D) RPC de la API (solo service_role: las llama la Edge Function «phoenix»; devuelven {error:CODIGO} o {ok:true,…}) ─────
create or replace function public.sync_api_config_leer(p_usuario uuid, p_grupo uuid) returns jsonb
language plpgsql stable security definer set search_path = '' as $$
declare c public.sync_config;
begin
  if private.sync_rol(p_grupo, p_usuario) is null then return jsonb_build_object('error', 'GRUPO_NO_ENCONTRADO'); end if;
  select * into c from public.sync_config where grupo_id = p_grupo;
  return jsonb_build_object('ok', true, 'modo', coalesce(c.modo, 'autorizacion'), 'actualizado_por', c.actualizado_por, 'actualizado_en', c.actualizado_en, 'tu_rol', private.sync_rol(p_grupo, p_usuario));
end $$;

create or replace function public.sync_api_config_poner(p_usuario uuid, p_grupo uuid, p_modo text) returns jsonb
language plpgsql security definer set search_path = '' as $$
declare v_rol text := private.sync_rol(p_grupo, p_usuario);
begin
  if v_rol is null then return jsonb_build_object('error', 'GRUPO_NO_ENCONTRADO'); end if;
  if v_rol <> 'admin' then return jsonb_build_object('error', 'SIN_PERMISO'); end if;
  return private.sync_poner_modo(p_grupo, p_usuario, p_modo) || jsonb_build_object('actualizado_por', p_usuario, 'actualizado_en', now());
end $$;

create or replace function public.sync_api_publicar(p_usuario uuid, p_grupo uuid, p_op jsonb) returns jsonb
language plpgsql security definer set search_path = '' as $$
declare v_rol text := private.sync_rol(p_grupo, p_usuario); v_id uuid; v_ex public.sync_operaciones; v_seq bigint; v_modo text; v_nom text; v_txt text; v_res text;
begin
  if v_rol is null then return jsonb_build_object('error', 'GRUPO_NO_ENCONTRADO'); end if;
  if v_rol not in ('admin', 'publica') then return jsonb_build_object('error', 'SIN_PERMISO'); end if;
  begin v_id := (p_op ->> 'op_id')::uuid; exception when others then return jsonb_build_object('error', 'OPERACION_INVALIDA'); end;
  if v_id is null then return jsonb_build_object('error', 'OPERACION_INVALIDA'); end if;
  select * into v_ex from public.sync_operaciones where id = v_id;
  if found then
    if v_ex.grupo_id <> p_grupo then return jsonb_build_object('error', 'OPERACION_INVALIDA'); end if;
    return jsonb_build_object('ok', true, 'op_id', v_id, 'seq', v_ex.seq, 'repetida', true);
  end if;
  if (select count(*) from public.sync_operaciones where autor_usuario_id = p_usuario and creado_en > now() - interval '1 hour') >= 60 then
    return jsonb_build_object('error', 'LIMITE_EXCEDIDO', 'reintentar_en', 60);
  end if;
  update public.sync_grupos set ultimo_seq = ultimo_seq + 1 where id = p_grupo returning ultimo_seq into v_seq;
  v_res := nullif(btrim(regexp_replace(coalesce(p_op ->> 'resumen', ''), '[[:cntrl:]]', ' ', 'g')), '');
  insert into public.sync_operaciones (id, grupo_id, seq, tipo, jugador_id, equipo_origen, equipo_destino, autor_usuario_id, base_seq, sha256_resultado, resumen, parche, huella_bd, formato)
  values (v_id, p_grupo, v_seq, 'fichaje', (p_op ->> 'jugador_id')::int, (p_op ->> 'equipo_origen')::int, (p_op ->> 'equipo_destino')::int, p_usuario,
    coalesce((p_op ->> 'base_seq')::bigint, 0), nullif(p_op ->> 'sha256_resultado', ''), v_res, nullif(p_op ->> 'parche', ''), nullif(p_op ->> 'huella_bd', ''), (p_op ->> 'formato')::int);
  insert into public.sync_aplicaciones (op_id, usuario_id, estado, motivo)
    select v_id, m.usuario_id, case when m.usuario_id = p_usuario then 'aplicada' else 'pendiente' end, case when m.usuario_id = p_usuario then 'autor' end
    from public.sync_miembros m where m.grupo_id = p_grupo and m.activo and (m.puede_aplicar or m.rol = 'admin' or m.usuario_id = p_usuario)
    on conflict do nothing;
  insert into public.sync_aplicaciones (op_id, usuario_id, estado, motivo) values (v_id, p_usuario, 'aplicada', 'autor') on conflict do nothing;
  select coalesce(modo, 'autorizacion') into v_modo from public.sync_config where grupo_id = p_grupo;
  select coalesce(nombre_display, username, 'Alguien') into v_nom from public.perfiles where id = p_usuario;
  v_txt := left(case when coalesce(v_modo, 'autorizacion') = 'automatico' then 'Fichaje nuevo de ' || v_nom || ': ' || coalesce(v_res, 'sin detalle')
                     else 'Fichaje pendiente de aplicar (de ' || v_nom || '): ' || coalesce(v_res, 'sin detalle') end, 600);
  insert into public.juego_avisos (usuario_id, texto, tipo, creado_por)
    select m.usuario_id, v_txt, 'sistema', p_usuario from public.sync_miembros m
    where m.grupo_id = p_grupo and m.activo and m.usuario_id <> p_usuario and (m.puede_aplicar or m.rol = 'admin');
  return jsonb_build_object('ok', true, 'op_id', v_id, 'seq', v_seq, 'repetida', false);
end $$;

create or replace function public.sync_api_listar(p_usuario uuid, p_grupo uuid, p_desde bigint default 0, p_limite int default 100) returns jsonb
language plpgsql stable security definer set search_path = '' as $$
declare v_modo text; v_ult bigint; v_ops jsonb;
begin
  if private.sync_rol(p_grupo, p_usuario) is null then return jsonb_build_object('error', 'GRUPO_NO_ENCONTRADO'); end if;
  select coalesce(modo, 'autorizacion') into v_modo from public.sync_config where grupo_id = p_grupo;
  select ultimo_seq into v_ult from public.sync_grupos where id = p_grupo;
  select coalesce(jsonb_agg(x order by (x ->> 'seq')::bigint), '[]'::jsonb) into v_ops from (
    select jsonb_build_object('op_id', o.id, 'seq', o.seq, 'tipo', o.tipo, 'jugador_id', o.jugador_id, 'equipo_origen', o.equipo_origen, 'equipo_destino', o.equipo_destino,
      'autor', o.autor_usuario_id, 'autor_nombre', (select coalesce(p.nombre_display, p.username) from public.perfiles p where p.id = o.autor_usuario_id),
      'base_seq', o.base_seq, 'sha256_resultado', o.sha256_resultado, 'resumen', o.resumen, 'parche', o.parche, 'huella_bd', o.huella_bd, 'formato', o.formato,
      'creado_en', o.creado_en, 'mi_estado', a.estado, 'mi_motivo', a.motivo) as x
    from public.sync_operaciones o left join public.sync_aplicaciones a on a.op_id = o.id and a.usuario_id = p_usuario
    where o.grupo_id = p_grupo and o.seq > greatest(coalesce(p_desde, 0), 0) order by o.seq limit greatest(1, least(coalesce(p_limite, 100), 100))
  ) t;
  return jsonb_build_object('ok', true, 'modo', coalesce(v_modo, 'autorizacion'), 'ultimo_seq', coalesce(v_ult, 0), 'operaciones', v_ops);
end $$;

create or replace function public.sync_api_aplicada(p_usuario uuid, p_dispositivo uuid, p_resultados jsonb) returns jsonb
language plpgsql security definer set search_path = '' as $$
declare e jsonb; v_op uuid; v_est text; v_n int := 0; v_desc int := 0; v_g uuid;
begin
  if p_resultados is null or jsonb_typeof(p_resultados) <> 'array' then return jsonb_build_object('error', 'CAMPO_INVALIDO'); end if;
  for e in select value from jsonb_array_elements(p_resultados) loop
    begin v_op := (e ->> 'op_id')::uuid; exception when others then v_op := null; end;
    v_est := e ->> 'estado';
    if v_op is null or v_est not in ('aplicada', 'conflicto', 'omitida', 'rechazada', 'incompatible') then v_desc := v_desc + 1; continue; end if;
    select grupo_id into v_g from public.sync_operaciones where id = v_op;
    if v_g is null or private.sync_rol(v_g, p_usuario) is null then v_desc := v_desc + 1; continue; end if;
    insert into public.sync_aplicaciones (op_id, usuario_id, dispositivo_id, estado, motivo, actualizado_en)
    values (v_op, p_usuario, p_dispositivo, v_est, nullif(left(btrim(coalesce(e ->> 'motivo', '')), 300), ''), now())
    on conflict (op_id, usuario_id) do update set estado = excluded.estado, motivo = excluded.motivo, dispositivo_id = excluded.dispositivo_id, actualizado_en = excluded.actualizado_en;
    v_n := v_n + 1;
  end loop;
  return jsonb_build_object('ok', true, 'actualizadas', v_n, 'descartadas', v_desc);
end $$;

revoke execute on function public.sync_api_config_leer(uuid, uuid), public.sync_api_config_poner(uuid, uuid, text), public.sync_api_publicar(uuid, uuid, jsonb),
  public.sync_api_listar(uuid, uuid, bigint, int), public.sync_api_aplicada(uuid, uuid, jsonb) from public, anon, authenticated;
grant execute on function public.sync_api_config_leer(uuid, uuid), public.sync_api_config_poner(uuid, uuid, text), public.sync_api_publicar(uuid, uuid, jsonb),
  public.sync_api_listar(uuid, uuid, bigint, int), public.sync_api_aplicada(uuid, uuid, jsonb) to service_role;

-- ── E) Archivo entero (EDIT00000000): versiones + bucket privado ────────────────────────────────────────────────────
insert into storage.buckets (id, name, public, file_size_limit) values ('sync-option', 'sync-option', false, 8388608) on conflict (id) do nothing;

create or replace function public.sync_api_option_crear(p_usuario uuid, p_grupo uuid, p_d jsonb) returns jsonb
language plpgsql security definer set search_path = '' as $$
declare v_rol text := private.sync_rol(p_grupo, p_usuario); v_id uuid := gen_random_uuid();
begin
  if v_rol is null then return jsonb_build_object('error', 'GRUPO_NO_ENCONTRADO'); end if;
  if v_rol not in ('admin', 'publica') then return jsonb_build_object('error', 'SIN_PERMISO'); end if;
  if (select count(*) from public.sync_option_versiones where autor = p_usuario and creado_en > now() - interval '1 hour') >= 6 then
    return jsonb_build_object('error', 'LIMITE_EXCEDIDO', 'reintentar_en', 300);
  end if;
  insert into public.sync_option_versiones (id, grupo_id, autor, sha256, tamano, resumen, parche, huella_bd, ruta_storage)
  values (v_id, p_grupo, p_usuario, p_d ->> 'sha256', (p_d ->> 'tamano')::int, nullif(left(btrim(coalesce(p_d ->> 'resumen', '')), 200), ''), nullif(p_d ->> 'parche', ''), nullif(p_d ->> 'huella_bd', ''), p_grupo::text || '/' || v_id::text || '.bin');
  return jsonb_build_object('ok', true, 'id', v_id, 'ruta', p_grupo::text || '/' || v_id::text || '.bin');
end $$;

create or replace function public.sync_api_option_listo(p_usuario uuid, p_id uuid) returns jsonb
language plpgsql security definer set search_path = '' as $$
declare v public.sync_option_versiones; v_viejas jsonb;
begin
  select * into v from public.sync_option_versiones where id = p_id;
  if not found or v.autor is distinct from p_usuario then return jsonb_build_object('error', 'OPTION_NO_ENCONTRADA'); end if;
  update public.sync_option_versiones set estado = 'lista' where id = p_id and estado = 'subiendo';
  with viejas as (
    select id, ruta_storage from public.sync_option_versiones where grupo_id = v.grupo_id and estado = 'lista' order by creado_en desc offset 3
  ), marcadas as (
    update public.sync_option_versiones s set estado = 'archivada' from viejas where s.id = viejas.id returning viejas.ruta_storage
  )
  select coalesce(jsonb_agg(ruta_storage), '[]'::jsonb) into v_viejas from marcadas;
  return jsonb_build_object('ok', true, 'id', p_id, 'archivadas', v_viejas);
end $$;

create or replace function public.sync_api_option_ultima(p_usuario uuid, p_grupo uuid) returns jsonb
language plpgsql stable security definer set search_path = '' as $$
declare v public.sync_option_versiones;
begin
  if private.sync_rol(p_grupo, p_usuario) is null then return jsonb_build_object('error', 'GRUPO_NO_ENCONTRADO'); end if;
  select * into v from public.sync_option_versiones where grupo_id = p_grupo and estado = 'lista' order by creado_en desc limit 1;
  if not found then return jsonb_build_object('error', 'OPTION_NO_ENCONTRADA'); end if;
  return jsonb_build_object('ok', true, 'id', v.id, 'sha256', v.sha256, 'tamano', v.tamano, 'resumen', v.resumen, 'parche', v.parche, 'huella_bd', v.huella_bd, 'autor', v.autor, 'creado_en', v.creado_en, 'ruta', v.ruta_storage);
end $$;

revoke execute on function public.sync_api_option_crear(uuid, uuid, jsonb), public.sync_api_option_listo(uuid, uuid), public.sync_api_option_ultima(uuid, uuid) from public, anon, authenticated;
grant execute on function public.sync_api_option_crear(uuid, uuid, jsonb), public.sync_api_option_listo(uuid, uuid), public.sync_api_option_ultima(uuid, uuid) to service_role;

-- ── F) Índices de claves foráneas (avisos de rendimiento) ───────────────────────────────────────────────────────────
create index if not exists sync_aplicaciones_dispositivo on public.sync_aplicaciones (dispositivo_id) where dispositivo_id is not null;
create index if not exists sync_config_actualizado_por on public.sync_config (actualizado_por) where actualizado_por is not null;
create index if not exists sync_config_historial_por on public.sync_config_historial (por) where por is not null;
create index if not exists sync_grupos_creado_por on public.sync_grupos (creado_por) where creado_por is not null;
create index if not exists sync_operaciones_autor on public.sync_operaciones (autor_usuario_id);
create index if not exists sync_option_versiones_autor on public.sync_option_versiones (autor) where autor is not null;

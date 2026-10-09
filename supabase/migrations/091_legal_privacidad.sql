-- 091 · Copia en el repo de las migraciones aplicadas por MCP el 2026-10-08 como «089_cumplimiento_legal_y_derechos_datos»
-- y «089_legal_privacidad» (otra cuenta). Este archivo es el ESTADO FINAL vigente (la segunda reemplazó a la primera).
-- Ya está aplicada en Supabase: NO volver a ejecutar salvo para reconstruir la base desde cero.
alter table public.aceptaciones_legales drop constraint if exists aceptaciones_legales_documento_check;
alter table public.aceptaciones_legales add constraint aceptaciones_legales_documento_check check (documento in ('terminos_compra', 'terminos_privacidad', 'autorizacion_tutor'));
insert into public.economia_config (clave, valor) values ('version_legal', '1') on conflict (clave) do nothing;

create table if not exists public.solicitudes_privacidad (
  id bigint generated always as identity primary key,
  usuario_id uuid references auth.users(id) on delete set null,
  tipo text not null check (tipo in ('acceso', 'rectificacion', 'eliminacion', 'oposicion', 'baja')),
  detalle text check (detalle is null or char_length(detalle) <= 1000),
  estado text not null default 'pendiente' check (estado in ('pendiente', 'en_proceso', 'resuelta', 'rechazada')),
  nota_staff text check (nota_staff is null or char_length(nota_staff) <= 1000),
  created_at timestamptz not null default now(),
  resuelta_at timestamptz
);
create index if not exists solicitudes_privacidad_usuario_idx on public.solicitudes_privacidad (usuario_id, created_at desc);
create index if not exists solicitudes_privacidad_estado_idx on public.solicitudes_privacidad (estado, created_at);
alter table public.solicitudes_privacidad enable row level security;
revoke all on public.solicitudes_privacidad from anon, authenticated;

create or replace function public.mi_aceptacion_legal() returns jsonb
language plpgsql stable security definer set search_path = '' as $$
declare yo uuid := private.uid_requerido(); v text;
begin
  select valor into v from public.economia_config where clave = 'version_legal';
  return jsonb_build_object('version', v, 'categoria', private.categoria_edad(yo),
    'aceptada', exists (select 1 from public.aceptaciones_legales where usuario_id = yo and documento = 'terminos_privacidad' and version = v),
    'tutor', exists (select 1 from public.aceptaciones_legales where usuario_id = yo and documento = 'autorizacion_tutor' and version = v));
end $$;

create or replace function public.aceptar_documentos_legales(p_tutor boolean default false) returns jsonb
language plpgsql security definer set search_path = '' as $$
declare yo uuid := private.uid_requerido(); v text; cat text;
begin
  select valor into v from public.economia_config where clave = 'version_legal';
  cat := private.categoria_edad(yo);
  if cat = 'bloqueado' then raise exception 'Tu cuenta no puede continuar.'; end if;
  if cat = 'menor' and not coalesce(p_tutor, false) then
    raise exception 'Si tienes menos de 18 años necesitas la autorización de tu madre, padre o tutor.';
  end if;
  insert into public.aceptaciones_legales (usuario_id, documento, version) values (yo, 'terminos_privacidad', v) on conflict do nothing;
  if cat = 'menor' then
    insert into public.aceptaciones_legales (usuario_id, documento, version) values (yo, 'autorizacion_tutor', v) on conflict do nothing;
  end if;
  return jsonb_build_object('ok', true, 'version', v);
end $$;

create or replace function public.solicitar_derecho(p_tipo text, p_detalle text default null) returns jsonb
language plpgsql security definer set search_path = '' as $$
declare yo uuid := private.uid_requerido(); t text := lower(coalesce(p_tipo, '')); d text := nullif(btrim(coalesce(p_detalle, '')), ''); nid bigint;
begin
  if t not in ('acceso', 'rectificacion', 'eliminacion', 'oposicion', 'baja') then raise exception 'Tipo de solicitud no válido.'; end if;
  if d is not null and char_length(d) > 1000 then raise exception 'El detalle es muy largo (máximo 1000 caracteres).'; end if;
  if exists (select 1 from public.solicitudes_privacidad where usuario_id = yo and tipo = t and estado in ('pendiente', 'en_proceso')) then
    raise exception 'Ya tienes una solicitud abierta de este tipo. Te responderemos en cuanto la revisemos.';
  end if;
  insert into public.solicitudes_privacidad (usuario_id, tipo, detalle) values (yo, t, d) returning id into nid;
  return jsonb_build_object('id', nid, 'estado', 'pendiente');
end $$;

create or replace function public.mis_solicitudes_privacidad() returns jsonb
language plpgsql stable security definer set search_path = '' as $$
declare yo uuid := private.uid_requerido();
begin
  return coalesce((select jsonb_agg(jsonb_build_object('id', s.id, 'tipo', s.tipo, 'estado', s.estado, 'creada', s.created_at, 'resuelta', s.resuelta_at, 'nota', s.nota_staff) order by s.created_at desc)
    from public.solicitudes_privacidad s where s.usuario_id = yo), '[]'::jsonb);
end $$;

create or replace function public.exportar_mis_datos() returns jsonb
language plpgsql stable security definer set search_path = '' as $$
declare yo uuid := private.uid_requerido();
begin
  return jsonb_build_object(
    'generado_en', now(),
    'correo', (select email from auth.users where id = yo),
    'perfil', (select to_jsonb(p) from public.perfiles p where p.id = yo),
    'jugador', coalesce((select jsonb_agg(to_jsonb(j)) from public.jugadores j where j.perfil_id = yo), '[]'::jsonb),
    'fecha_nacimiento', (select e.nacimiento from public.edades e where e.usuario_id = yo),
    'billetera', (select to_jsonb(b) from public.billeteras b where b.usuario_id = yo),
    'movimientos_tokens', coalesce((select jsonb_agg(to_jsonb(m)) from (select * from public.movimientos_tokens where usuario_id = yo order by id desc limit 5000) m), '[]'::jsonb),
    'inventario', coalesce((select jsonb_agg(to_jsonb(i)) from public.inventario i where i.usuario_id = yo), '[]'::jsonb),
    'logros', coalesce((select jsonb_agg(to_jsonb(l)) from public.logros_usuario l where l.usuario_id = yo), '[]'::jsonb),
    'publicaciones_muro', coalesce((select jsonb_agg(to_jsonb(x)) from (select * from public.muro_publicaciones where autor_id = yo order by id desc limit 5000) x), '[]'::jsonb),
    'clips', coalesce((select jsonb_agg(to_jsonb(c)) from (select * from public.muro_clips where autor_id = yo order by id desc limit 5000) c), '[]'::jsonb),
    'mensajes_enviados', coalesce((select jsonb_agg(to_jsonb(q)) from (select * from public.mensajes_privados where autor_id = yo order by id desc limit 5000) q), '[]'::jsonb),
    'notificaciones', coalesce((select jsonb_agg(to_jsonb(n)) from (select * from public.notificaciones where usuario_id = yo order by id desc limit 5000) n), '[]'::jsonb),
    'participaciones_en_retos', coalesce((select jsonb_agg(to_jsonb(r)) from public.reto_participantes r where r.usuario_id = yo), '[]'::jsonb),
    'aceptaciones_legales', coalesce((select jsonb_agg(to_jsonb(a)) from public.aceptaciones_legales a where a.usuario_id = yo), '[]'::jsonb),
    'solicitudes_privacidad', coalesce((select jsonb_agg(to_jsonb(s)) from public.solicitudes_privacidad s where s.usuario_id = yo), '[]'::jsonb));
end $$;

create or replace function public.staff_solicitudes_privacidad(p_estado text default null) returns jsonb
language plpgsql stable security definer set search_path = '' as $$
begin
  if not private.es_staff() then raise exception 'Solo el staff puede ver esto.' using errcode = '42501'; end if;
  return coalesce((select jsonb_agg(jsonb_build_object('id', s.id, 'usuario', s.usuario_id, 'tipo', s.tipo, 'detalle', s.detalle, 'estado', s.estado, 'creada', s.created_at, 'nota', s.nota_staff) order by s.created_at)
    from public.solicitudes_privacidad s where p_estado is null or s.estado = p_estado), '[]'::jsonb);
end $$;

create or replace function public.staff_resolver_solicitud_privacidad(p_id bigint, p_estado text, p_nota text default null) returns void
language plpgsql security definer set search_path = '' as $$
begin
  if not private.es_staff() then raise exception 'Solo el staff puede hacer esto.' using errcode = '42501'; end if;
  if p_estado not in ('en_proceso', 'resuelta', 'rechazada') then raise exception 'Estado no válido.'; end if;
  update public.solicitudes_privacidad set estado = p_estado, nota_staff = nullif(left(btrim(coalesce(p_nota, '')), 1000), ''),
    resuelta_at = case when p_estado in ('resuelta', 'rechazada') then now() else null end where id = p_id;
  if not found then raise exception 'No existe esa solicitud.'; end if;
end $$;

revoke all on function public.mi_aceptacion_legal(), public.aceptar_documentos_legales(boolean), public.solicitar_derecho(text, text), public.mis_solicitudes_privacidad(), public.exportar_mis_datos(), public.staff_solicitudes_privacidad(text), public.staff_resolver_solicitud_privacidad(bigint, text, text) from public, anon;
grant execute on function public.mi_aceptacion_legal(), public.aceptar_documentos_legales(boolean), public.solicitar_derecho(text, text), public.mis_solicitudes_privacidad(), public.exportar_mis_datos(), public.staff_solicitudes_privacidad(text), public.staff_resolver_solicitud_privacidad(bigint, text, text) to authenticated;

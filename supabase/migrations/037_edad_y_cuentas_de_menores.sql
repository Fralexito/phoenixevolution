-- 037 · MENORES (1/2) · FECHA DE NACIMIENTO Y CATEGORÍA DE EDAD. Depende de 030 (staff/auditoría), 032 (sanciones) y 035 (avisos).
-- Qué hace: guarda la fecha de nacimiento en una tabla CERRADA (nadie la lee: ni otros jugadores ni el propio navegador) y expone solo la CATEGORÍA.
--   · menos de 13 años → la cuenta queda bloqueada con un «baneo» del sistema (reutiliza el candado de la 032; un administrador puede levantarlo si hubo un error).
--   · 13 a 17 años → «menor»: la 038 aplicará las restricciones (mensajes, búsqueda, muro).
--   · 18 o más → «adulto».
--   · SIN DECLARAR → se trata como menor (por seguridad) hasta que la persona declare su fecha; la web se la exige al entrar.
-- La fecha se declara UNA sola vez: cambiarla es la forma obvia de saltarse las restricciones, así que solo un administrador puede corregirla (con motivo y auditoría).
-- Límite honesto: es una edad DECLARADA, no verificada.

create table if not exists public.edades (
  usuario_id uuid primary key references auth.users(id) on delete cascade,
  nacimiento date not null check (nacimiento >= date '1900-01-01'),
  declarada_at timestamptz not null default now(),
  corregida_por uuid references auth.users(id) on delete set null
);
alter table public.edades enable row level security;
revoke all on public.edades from anon, authenticated;                 -- cerrada: solo por las funciones de abajo

-- ─── Ayudantes (solo servidor) ─────────────────────────────────────────────────────────────────────────────────
create or replace function private.edad_de(p_uid uuid) returns integer
language sql stable security definer set search_path = '' as $$
  select date_part('year', age(current_date, e.nacimiento))::integer from public.edades e where e.usuario_id = p_uid
$$;
revoke all on function private.edad_de(uuid) from public, anon, authenticated;

-- 'sin_declarar' | 'bloqueado' (<13) | 'menor' (13-17) | 'adulto' (18+)
create or replace function private.categoria_edad(p_uid uuid) returns text
language sql stable security definer set search_path = '' as $$
  select case when e is null then 'sin_declarar' when e < 13 then 'bloqueado' when e < 18 then 'menor' else 'adulto' end from (select private.edad_de(p_uid) as e) t
$$;
revoke all on function private.categoria_edad(uuid) from public, anon, authenticated;

-- ¿Aplican las restricciones de menores? Verdadero para menores Y para quien aún no declaró (la 038 lo usa).
create or replace function private.es_menor(p_uid uuid) returns boolean
language sql stable security definer set search_path = '' as $$
  select private.categoria_edad(p_uid) <> 'adulto'
$$;
revoke all on function private.es_menor(uuid) from public, anon, authenticated;

-- ─── Lectura: MI estado (nunca devuelve la fecha) ──────────────────────────────────────────────────────────────
create or replace function public.mi_edad_estado() returns jsonb
language plpgsql stable security definer set search_path = '' as $$
declare yo uuid := private.uid_requerido(); c text := private.categoria_edad(yo);
begin
  return jsonb_build_object('declarada', c <> 'sin_declarar', 'categoria', c, 'restringido', c <> 'adulto', 'bloqueada', c = 'bloqueado');
end $$;

-- ─── Declarar la fecha (una sola vez) ──────────────────────────────────────────────────────────────────────────
create or replace function public.declarar_nacimiento(p_fecha date) returns jsonb
language plpgsql security definer set search_path = '' as $$
declare yo uuid := private.uid_requerido(); edad integer;
begin
  if p_fecha is null then raise exception 'Escribe tu fecha de nacimiento.'; end if;
  if p_fecha > current_date or p_fecha < date '1900-01-01' then raise exception 'Esa fecha de nacimiento no es válida.'; end if;
  if exists (select 1 from public.edades where usuario_id = yo) then raise exception 'Tu fecha de nacimiento ya fue registrada y no se puede cambiar. Si hubo un error, pide ayuda al equipo.'; end if;
  if not exists (select 1 from public.perfiles where id = yo) then raise exception 'Tu perfil aún no existe: vuelve a iniciar sesión.'; end if;
  insert into public.edades (usuario_id, nacimiento) values (yo, p_fecha);
  edad := date_part('year', age(current_date, p_fecha))::integer;
  if edad < 13 and not exists (select 1 from public.sanciones where usuario_id = yo and tipo = 'baneo' and levantada_at is null) then
    insert into public.sanciones (usuario_id, tipo, motivo, creada_por) values (yo, 'baneo', 'Edad mínima: 13 años. Si hubo un error al escribir tu fecha, contacta al equipo.', null);
  end if;
  return public.mi_edad_estado();
end $$;

-- ─── Corrección por un ADMINISTRADOR (error de dedo, o menor que mintió) ───────────────────────────────────────
create or replace function public.corregir_nacimiento_staff(p_usuario uuid, p_fecha date, p_motivo text) returns jsonb
language plpgsql security definer set search_path = '' as $$
declare yo uuid := private.uid_requerido(); mot text := btrim(regexp_replace(coalesce(p_motivo, ''), '[<>]', '', 'g')); antes date; edad integer; nombre text; s record;
begin
  if not private.es_admin() then raise exception 'Solo un administrador puede corregir una fecha de nacimiento.' using errcode = '42501'; end if;
  if char_length(mot) < 5 then raise exception 'Escribe el motivo (mínimo 5 caracteres): queda en la auditoría.'; end if;
  if p_fecha is null or p_fecha > current_date or p_fecha < date '1900-01-01' then raise exception 'Esa fecha de nacimiento no es válida.'; end if;
  select coalesce(nombre_display, username) into nombre from public.perfiles where id = p_usuario;
  if nombre is null then raise exception 'Esa cuenta no existe.'; end if;
  select nacimiento into antes from public.edades where usuario_id = p_usuario;
  insert into public.edades (usuario_id, nacimiento, corregida_por) values (p_usuario, p_fecha, yo)
  on conflict (usuario_id) do update set nacimiento = excluded.nacimiento, corregida_por = yo;
  edad := date_part('year', age(current_date, p_fecha))::integer;
  if edad >= 13 then                                                   -- ya cumple el mínimo: se levanta el baneo automático por edad
    for s in select id from public.sanciones where usuario_id = p_usuario and tipo = 'baneo' and levantada_at is null and motivo like 'Edad mínima: 13 años.%' loop
      update public.sanciones set levantada_at = now(), levantada_por = yo, levantada_motivo = 'Fecha de nacimiento corregida: ' || mot where id = s.id;
    end loop;
  elsif not exists (select 1 from public.sanciones where usuario_id = p_usuario and tipo = 'baneo' and levantada_at is null) then
    insert into public.sanciones (usuario_id, tipo, motivo, creada_por) values (p_usuario, 'baneo', 'Edad mínima: 13 años. Si hubo un error al escribir tu fecha, contacta al equipo.', yo);
  end if;
  perform private.auditar_moderacion('editar', 'edades', p_usuario::text, nombre,
    jsonb_build_object('categoria_edad', jsonb_build_array(case when antes is null then 'sin_declarar' else 'declarada' end, private.categoria_edad(p_usuario))), mot);   -- la fecha exacta NO se escribe en la auditoría
  return jsonb_build_object('categoria', private.categoria_edad(p_usuario));
end $$;

-- ─── Permisos ──────────────────────────────────────────────────────────────────────────────────────────────────
revoke all on function public.mi_edad_estado(), public.declarar_nacimiento(date), public.corregir_nacimiento_staff(uuid, date, text) from public, anon;
grant execute on function public.mi_edad_estado(), public.declarar_nacimiento(date), public.corregir_nacimiento_staff(uuid, date, text) to authenticated;

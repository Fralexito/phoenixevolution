-- 139 · Patrocinadores de torneos y clanes (ronda 363). Diseño: docs/economia/DISENO-PASS-Y-ORGANIZADORES.md §3.
-- El patrocinador paga a Fralex FUERA de la tienda (no pasa por gemas). Aquí solo se guarda qué logo se muestra, dónde y hasta cuándo.
-- Solo el administrador escribe (RPC). El público lee los vigentes sin la nota privada.

create table if not exists public.patrocinios (
  id bigint generated always as identity primary key,
  tipo text not null check (tipo in ('torneo', 'clan')),
  objetivo_id bigint not null,
  nombre text not null check (char_length(btrim(nombre)) between 1 and 80),
  logo_url text check (logo_url is null or (logo_url ~ '^https://' and char_length(logo_url) <= 500)),
  enlace text check (enlace is null or (enlace ~ '^https://' and char_length(enlace) <= 500)),
  desde date not null default current_date,
  hasta date,
  activo boolean not null default true,
  nota text check (nota is null or char_length(nota) <= 1000),
  creado_por uuid references auth.users (id) on delete set null,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  archivado boolean not null default false,
  check (hasta is null or hasta >= desde)
);
create index if not exists patrocinios_objetivo on public.patrocinios (tipo, objetivo_id) where activo;

-- RLS: el público ve solo los vigentes y sin la nota (permiso por columnas); nadie escribe desde el navegador
alter table public.patrocinios enable row level security;
revoke all on public.patrocinios from public, anon, authenticated;
grant select (id, tipo, objetivo_id, nombre, logo_url, enlace, desde, hasta) on public.patrocinios to anon, authenticated;
create policy patrocinios_lee on public.patrocinios for select to anon, authenticated
  using (activo and desde <= current_date and (hasta is null or hasta >= current_date));

-- Admin: lista completa (con nota y vencidos; sin los archivados)
create or replace function public.patrocinios_admin_listar() returns jsonb
language plpgsql stable security definer set search_path = '' as $$
begin
  if not private.es_admin() then raise exception 'Solo el administrador.'; end if;
  return coalesce((select jsonb_agg(to_jsonb(p) - 'creado_por' - 'archivado' order by p.activo desc, p.desde desc, p.id desc) from public.patrocinios p where not p.archivado), '[]'::jsonb);
end $$;

-- Admin: crear (p_id null) o editar
create or replace function public.patrocinio_guardar(p_id bigint, p_tipo text, p_objetivo bigint, p_nombre text, p_logo text, p_enlace text,
  p_desde date, p_hasta date, p_activo boolean, p_nota text) returns bigint
language plpgsql security definer set search_path = '' as $$
declare nuevo bigint;
begin
  if not private.es_admin() then raise exception 'Solo el administrador.'; end if;
  if p_tipo not in ('torneo', 'clan') then raise exception 'Tipo desconocido.'; end if;
  if p_tipo = 'torneo' and not exists (select 1 from public.torneos_libres where id = p_objetivo) then raise exception 'Ese torneo no existe.'; end if;
  if p_tipo = 'clan' and not exists (select 1 from public.clanes where id = p_objetivo) then raise exception 'Ese clan no existe.'; end if;
  if p_id is null then
    insert into public.patrocinios (tipo, objetivo_id, nombre, logo_url, enlace, desde, hasta, activo, nota, creado_por)
    values (p_tipo, p_objetivo, btrim(p_nombre), nullif(btrim(p_logo), ''), nullif(btrim(p_enlace), ''),
      coalesce(p_desde, current_date), p_hasta, coalesce(p_activo, true), nullif(btrim(p_nota), ''), (select auth.uid()))
    returning id into nuevo;
    return nuevo;
  end if;
  update public.patrocinios set tipo = p_tipo, objetivo_id = p_objetivo, nombre = btrim(p_nombre),
    logo_url = nullif(btrim(p_logo), ''), enlace = nullif(btrim(p_enlace), ''), desde = coalesce(p_desde, desde), hasta = p_hasta,
    activo = coalesce(p_activo, activo), nota = nullif(btrim(p_nota), ''), updated_at = now()
  where id = p_id;
  if not found then raise exception 'Ese patrocinio no existe.'; end if;
  return p_id;
end $$;

-- Admin: «quitar» = archivar (deja de verse en la web y en la lista del admin, pero la fila queda como historial del acuerdo).
-- Nota de aplicación (21-oct-2026): por el conector MCP se aplicó en 3 partes (139a tabla, 139b listar+guardar, 139c archivado+quitar);
-- una sentencia DELETE dentro de la función hacía que el conector pidiera confirmación y se colgara. Este archivo es el resultado final.
create or replace function public.patrocinio_borrar(p_id bigint) returns void
language plpgsql security definer set search_path = '' as $$
begin
  if not private.es_admin() then raise exception 'Solo el administrador.'; end if;
  update public.patrocinios set archivado = true, activo = false, updated_at = now() where id = p_id;
end $$;

revoke all on function public.patrocinios_admin_listar(), public.patrocinio_guardar(bigint, text, bigint, text, text, text, date, date, boolean, text), public.patrocinio_borrar(bigint) from public, anon;
grant execute on function public.patrocinios_admin_listar(), public.patrocinio_guardar(bigint, text, bigint, text, text, text, date, date, boolean, text), public.patrocinio_borrar(bigint) to authenticated;

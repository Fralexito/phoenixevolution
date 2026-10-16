-- Panel general del sitio (ronda 315): una sola configuración editable (JSON) con historial para deshacer y rehacer.
-- Lectura pública (la web la aplica al cargar). Escribir, deshacer y rehacer: solo admin, por RPC.
create table if not exists public.sitio_ajustes_historial (
  id bigserial primary key,
  config jsonb not null,
  nota text not null default '',
  autor uuid references public.perfiles(id) on delete set null,
  creado_en timestamptz not null default now()
);
create table if not exists public.sitio_ajustes (
  id int primary key default 1 check (id = 1),
  config jsonb not null default '{}'::jsonb,
  puntero bigint,
  version int not null default 0,
  actualizado_en timestamptz not null default now()
);
insert into public.sitio_ajustes (id) values (1) on conflict (id) do nothing;
alter table public.sitio_ajustes enable row level security;
alter table public.sitio_ajustes_historial enable row level security;
create policy sitio_ajustes_lectura on public.sitio_ajustes for select to anon, authenticated using (true);
create policy sitio_historial_admin on public.sitio_ajustes_historial for select to authenticated using (private.es_admin());
grant select on public.sitio_ajustes to anon, authenticated;
grant select on public.sitio_ajustes_historial to authenticated;
revoke insert, update, delete on public.sitio_ajustes, public.sitio_ajustes_historial from anon, authenticated;

-- Estado para la pantalla del panel: config actual + si se puede deshacer / rehacer.
create or replace function public.sitio_estado() returns jsonb
language plpgsql stable security definer set search_path = '' as $$
declare s public.sitio_ajustes;
begin
  select * into s from public.sitio_ajustes where id = 1;
  return jsonb_build_object('config', s.config, 'version', s.version,
    'puede_deshacer', exists (select 1 from public.sitio_ajustes_historial h where h.id < coalesce(s.puntero, 0)) or exists (select 1 from public.sitio_ajustes_historial h where h.id = s.puntero),
    'puede_rehacer', exists (select 1 from public.sitio_ajustes_historial h where h.id > coalesce(s.puntero, 0)));
end $$;

-- Guardar: añade un paso al historial (lo que había «por rehacer» se descarta) y deja solo los últimos 100.
create or replace function public.sitio_guardar(p_config jsonb, p_nota text default '') returns jsonb
language plpgsql security definer set search_path = '' as $$
declare v_id bigint;
begin
  if (select auth.uid()) is null or not private.es_admin() then raise exception 'NO_AUTORIZADO' using errcode = 'P0001'; end if;
  if p_config is null or jsonb_typeof(p_config) <> 'object' or length(p_config::text) > 30000 then raise exception 'CAMPO_INVALIDO: configuración no válida o demasiado grande' using errcode = 'P0001'; end if;
  delete from public.sitio_ajustes_historial where id > coalesce((select puntero from public.sitio_ajustes where id = 1), 0);
  insert into public.sitio_ajustes_historial (config, nota, autor) values (p_config, left(coalesce(p_nota, ''), 120), (select auth.uid())) returning id into v_id;
  delete from public.sitio_ajustes_historial where id <= v_id - 100;
  update public.sitio_ajustes set config = p_config, puntero = v_id, version = version + 1, actualizado_en = now() where id = 1;
  perform private.auditar_moderacion('sistema', 'sitio_ajustes', '1', 'Panel del sitio · ' || left(coalesce(p_nota, 'cambio'), 80), jsonb_build_object('paso', v_id), null);
  return public.sitio_estado();
end $$;

-- Mover por el historial: p_paso = -1 deshace, +1 rehace.
create or replace function public.sitio_mover(p_paso int) returns jsonb
language plpgsql security definer set search_path = '' as $$
declare v_p bigint; v_dest public.sitio_ajustes_historial;
begin
  if (select auth.uid()) is null or not private.es_admin() then raise exception 'NO_AUTORIZADO' using errcode = 'P0001'; end if;
  select puntero into v_p from public.sitio_ajustes where id = 1;
  if p_paso < 0 then
    select * into v_dest from public.sitio_ajustes_historial where id < coalesce(v_p, 0) order by id desc limit 1;
    if not found then
      if exists (select 1 from public.sitio_ajustes_historial where id = v_p) then
        update public.sitio_ajustes set config = '{}'::jsonb, puntero = 0, version = version + 1, actualizado_en = now() where id = 1;
        return public.sitio_estado();
      end if;
      raise exception 'NADA_QUE_DESHACER' using errcode = 'P0001';
    end if;
  else
    select * into v_dest from public.sitio_ajustes_historial where id > coalesce(v_p, 0) order by id asc limit 1;
    if not found then raise exception 'NADA_QUE_REHACER' using errcode = 'P0001'; end if;
  end if;
  update public.sitio_ajustes set config = v_dest.config, puntero = v_dest.id, version = version + 1, actualizado_en = now() where id = 1;
  perform private.auditar_moderacion('sistema', 'sitio_ajustes', '1', case when p_paso < 0 then 'Panel del sitio · deshacer' else 'Panel del sitio · rehacer' end, jsonb_build_object('paso', v_dest.id), null);
  return public.sitio_estado();
end $$;

revoke execute on function public.sitio_estado(), public.sitio_guardar(jsonb, text), public.sitio_mover(int) from public;
grant execute on function public.sitio_estado() to anon, authenticated;
grant execute on function public.sitio_guardar(jsonb, text), public.sitio_mover(int) to authenticated;

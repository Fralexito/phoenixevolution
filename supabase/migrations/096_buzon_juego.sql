-- 096 · «Buzón del juego»: avisos de la web que Phoenix Link escribe en avisos.txt de PES 2021 (módulo Sider phoenix.lua).
-- Aplicada por partes (A, B, C) porque el MCP cancela bloques grandes. No toca nada existente. Config (sondeo_buzon_seg, buzon_juego)
-- va dentro de las claves ya permitidas de phoenix_config: intervalos / interruptores (ver _lib/nucleo.js).

-- ── A) Tablas ─────────────────────────────────────────────────────────────────────────────────────────────────────────
create table if not exists public.juego_avisos (
  id bigint generated always as identity primary key,
  usuario_id uuid references public.perfiles (id) on delete cascade,            -- destinatario (null = aviso global del staff)
  dispositivo_id uuid references public.dispositivos_host (id) on delete cascade, -- null = todas las PCs vinculadas del usuario
  global boolean not null default false,
  texto text not null check (char_length(texto) between 1 and 600),
  tipo text not null default 'aviso' check (tipo in ('aviso', 'partido', 'liga', 'sistema')),
  creado_por uuid references public.perfiles (id) on delete set null,
  creado_en timestamptz not null default now(),
  expira_en timestamptz not null default now() + interval '24 hours',
  entregado_en timestamptz,                                                      -- primera vez que alguna PC lo escribió en el juego
  check ((global and usuario_id is null and dispositivo_id is null) or (not global and usuario_id is not null))
);
create table if not exists public.juego_avisos_entregas (
  aviso_id bigint not null references public.juego_avisos (id) on delete cascade,
  dispositivo_id uuid not null references public.dispositivos_host (id) on delete cascade,
  entregado_en timestamptz not null default now(),
  primary key (aviso_id, dispositivo_id)
);
create index if not exists juego_avisos_usuario on public.juego_avisos (usuario_id, creado_en desc);
create index if not exists juego_avisos_pendientes on public.juego_avisos (creado_en desc) where entregado_en is null;
create index if not exists juego_avisos_globales on public.juego_avisos (creado_en desc) where global;
create index if not exists juego_avisos_autor on public.juego_avisos (creado_por, creado_en desc);

-- Permisos (parte A2): solo lectura y borrar lo propio; escribir va por los RPC de abajo.
alter table public.juego_avisos enable row level security;
alter table public.juego_avisos_entregas enable row level security;
create policy juego_avisos_lee on public.juego_avisos for select to authenticated
  using (usuario_id = (select auth.uid()) or private.es_staff());
create policy juego_avisos_borra on public.juego_avisos for delete to authenticated
  using (usuario_id = (select auth.uid()) and not global);
revoke all on public.juego_avisos, public.juego_avisos_entregas from anon, authenticated;
grant select on public.juego_avisos to authenticated;
grant delete on public.juego_avisos to authenticated;
create index if not exists juego_avisos_entregas_disp on public.juego_avisos_entregas (dispositivo_id);

-- ── B) Enviar avisos (web) ────────────────────────────────────────────────────────────────────────────────────────────
create or replace function private.buzon_texto(p_texto text) returns text
language plpgsql immutable set search_path = '' as $$
declare t text := btrim(replace(coalesce(p_texto, ''), E'\r', ''));
begin
  if char_length(t) < 1 or char_length(t) > 600 then raise exception 'AVISO_INVALIDO: el texto debe tener entre 1 y 600 caracteres'; end if;
  if regexp_replace(t, E'\n', '', 'g') ~ '[[:cntrl:]]' then raise exception 'AVISO_INVALIDO: caracteres no permitidos'; end if;
  if array_length(string_to_array(t, E'\n'), 1) > 8 then raise exception 'AVISO_INVALIDO: máximo 8 líneas'; end if;
  return t;
end $$;

-- Usuario: manda un aviso a su juego (todas sus PCs, o una). Máx. 20 por hora.
create or replace function public.enviar_aviso_juego(p_texto text, p_dispositivo uuid default null) returns bigint
language plpgsql security definer set search_path = '' as $$
declare v_uid uuid := auth.uid(); v_txt text; v_id bigint;
begin
  if v_uid is null then raise exception 'NO_AUTORIZADO'; end if;
  v_txt := private.buzon_texto(p_texto);
  if p_dispositivo is not null and not exists (select 1 from public.dispositivos_host where id = p_dispositivo and usuario = v_uid and revocado is null) then
    raise exception 'DISPOSITIVO_NO_ENCONTRADO';
  end if;
  if (select count(*) from public.juego_avisos where creado_por = v_uid and creado_en > now() - interval '1 hour') >= 20 then
    raise exception 'DEMASIADOS_AVISOS: máximo 20 por hora';
  end if;
  insert into public.juego_avisos (usuario_id, dispositivo_id, texto, tipo, creado_por) values (v_uid, p_dispositivo, v_txt, 'aviso', v_uid) returning id into v_id;
  return v_id;
end $$;

-- Staff (moderador/admin): aviso a un usuario o global a todas las PCs.
create or replace function public.staff_enviar_aviso_juego(p_texto text, p_tipo text default 'sistema', p_usuario uuid default null, p_global boolean default false) returns bigint
language plpgsql security definer set search_path = '' as $$
declare v_uid uuid := auth.uid(); v_txt text; v_id bigint;
begin
  if v_uid is null or not private.es_moderador() then raise exception 'NO_AUTORIZADO'; end if;
  v_txt := private.buzon_texto(p_texto);
  if p_tipo not in ('aviso', 'partido', 'liga', 'sistema') then raise exception 'AVISO_INVALIDO: tipo'; end if;
  if p_global then
    insert into public.juego_avisos (usuario_id, global, texto, tipo, creado_por) values (null, true, v_txt, p_tipo, v_uid) returning id into v_id;
  else
    if p_usuario is null then raise exception 'AVISO_INVALIDO: falta el destinatario'; end if;
    insert into public.juego_avisos (usuario_id, texto, tipo, creado_por) values (p_usuario, v_txt, p_tipo, v_uid) returning id into v_id;
  end if;
  return v_id;
end $$;

revoke execute on function public.enviar_aviso_juego(text, uuid) from public, anon;
grant execute on function public.enviar_aviso_juego(text, uuid) to authenticated;
revoke execute on function public.staff_enviar_aviso_juego(text, text, uuid, boolean) from public, anon;
grant execute on function public.staff_enviar_aviso_juego(text, text, uuid, boolean) to authenticated;

-- ── C) Para la Edge Function «phoenix» (solo service_role) ────────────────────────────────────────────────────────────
-- Lista (máx. 10, del más nuevo al más viejo) de los avisos vigentes de esta PC, con su entrega por PC.
create or replace function public.sistema_buzon_listar(p_usuario uuid, p_dispositivo uuid, p_limite int default 10) returns jsonb
language sql stable security definer set search_path = '' as $$
  select coalesce(jsonb_agg(jsonb_build_object('id', x.id, 'texto', x.texto, 'tipo', x.tipo, 'creado_en', x.creado_en, 'global', x.global, 'entregado_en', x.entregado_en) order by x.creado_en desc, x.id desc), '[]'::jsonb)
  from (
    select a.id, a.texto, a.tipo, a.creado_en, a.global, e.entregado_en
    from public.juego_avisos a
    left join public.juego_avisos_entregas e on e.aviso_id = a.id and e.dispositivo_id = p_dispositivo
    where a.expira_en > now() and (a.global or (a.usuario_id = p_usuario and (a.dispositivo_id is null or a.dispositivo_id = p_dispositivo)))
    order by a.creado_en desc, a.id desc
    limit greatest(1, least(coalesce(p_limite, 10), 10))
  ) x;
$$;

-- Marca como entregados (idempotente) solo los avisos que esa PC podía ver. Devuelve cuántos.
create or replace function public.sistema_buzon_entregado(p_usuario uuid, p_dispositivo uuid, p_ids bigint[]) returns int
language plpgsql security definer set search_path = '' as $$
declare v_ids bigint[]; v_n int;
begin
  select coalesce(array_agg(a.id), '{}') into v_ids from public.juego_avisos a
  where a.id = any (p_ids) and a.expira_en > now() and (a.global or (a.usuario_id = p_usuario and (a.dispositivo_id is null or a.dispositivo_id = p_dispositivo)));
  v_n := coalesce(array_length(v_ids, 1), 0);
  if v_n = 0 then return 0; end if;
  insert into public.juego_avisos_entregas (aviso_id, dispositivo_id) select unnest(v_ids), p_dispositivo on conflict do nothing;
  update public.juego_avisos set entregado_en = now() where id = any (v_ids) and entregado_en is null;
  return v_n;
end $$;

revoke execute on function public.sistema_buzon_listar(uuid, uuid, int) from public, anon, authenticated;
revoke execute on function public.sistema_buzon_entregado(uuid, uuid, bigint[]) from public, anon, authenticated;
grant execute on function public.sistema_buzon_listar(uuid, uuid, int) to service_role;
grant execute on function public.sistema_buzon_entregado(uuid, uuid, bigint[]) to service_role;

-- 099 · CHAT GENERAL (compartido entre la web y Phoenix Link). REUTILIZA la tabla vieja y vacía public.mensajes_chat (cerrada en la 030).
-- Reglas: el usuario escribe solo por RPC (nadie inserta/borra directo); sancionados y bloqueados por edad no escriben; 1 mensaje/segundo;
-- los menores (13-17) y los mayores solo se ven entre sí (igual que el chat privado); el staff ve y es visto por todos.
-- Un mod que borra deja la fila con borrado=true y el texto vacío (el original queda en auditoria_staff): así se ve «eliminado» en web y en Link.

-- ── A) Tabla: columnas nuevas, límites, índices y lectura por RLS ──────────────────────────────────────────────────────
alter table public.mensajes_chat
  add column if not exists borrado boolean not null default false,
  add column if not exists borrado_por uuid references public.perfiles(id) on delete set null,
  add column if not exists borrado_en timestamptz,
  add column if not exists grupo_edad text not null default 'adulto',
  add column if not exists autor_staff boolean not null default false;
alter table public.mensajes_chat add constraint mensajes_chat_grupo_edad_check check (grupo_edad in ('menor', 'adulto'));
alter table public.mensajes_chat add constraint mensajes_chat_texto_check check (borrado or char_length(btrim(mensaje)) between 1 and 300);
alter table public.mensajes_chat alter column created_at set not null;
create index if not exists mensajes_chat_autor_reciente on public.mensajes_chat (autor_id, created_at desc);
create index if not exists mensajes_chat_borrado_por on public.mensajes_chat (borrado_por) where borrado_por is not null;
alter table public.mensajes_chat enable row level security;

create or replace function private.chat_grupo_de(p_uid uuid) returns text
language sql stable security definer set search_path = '' as $$ select case when private.categoria_edad(p_uid) = 'menor' then 'menor' else 'adulto' end $$;
revoke all on function private.chat_grupo_de(uuid) from public, anon, authenticated;

create or replace function private.chat_visible(p_grupo text, p_staff boolean) returns boolean
language sql stable security definer set search_path = '' as $$
  select private.es_staff_id((select auth.uid())) or coalesce(p_staff, false) or p_grupo = private.chat_grupo_de((select auth.uid()))
$$;
revoke all on function private.chat_visible(text, boolean) from public, anon;
grant execute on function private.chat_visible(text, boolean) to authenticated;
create policy chat_global_lectura on public.mensajes_chat for select to authenticated using (private.chat_visible(grupo_edad, autor_staff));
grant select on public.mensajes_chat to authenticated;

-- ── B) Lógica común (la usan la web y la API) ──────────────────────────────────────────────────────────────────────────
create or replace function private.chat_poner(p_uid uuid, p_texto text) returns jsonb
language plpgsql security definer set search_path = '' as $$
declare t text; s public.sanciones; p public.perfiles; v_id int; v_ult timestamptz; v_n int; v_staff boolean; v_cat text;
begin
  select * into p from public.perfiles where id = p_uid;
  if p_uid is null or not found then return jsonb_build_object('error', 'SIN_PERMISO'); end if;
  t := btrim(regexp_replace(coalesce(p_texto, ''), '[[:space:][:cntrl:]]+', ' ', 'g'));
  if t = '' then return jsonb_build_object('error', 'MENSAJE_INVALIDO', 'campo', 'texto', 'mensaje', 'Escribe algo antes de enviar.'); end if;
  if char_length(t) > 300 then return jsonb_build_object('error', 'MENSAJE_INVALIDO', 'campo', 'texto', 'mensaje', 'El mensaje admite hasta 300 caracteres.'); end if;
  s := private.sancion_vigente(p_uid);
  if s.id is not null then return jsonb_build_object('error', 'CUENTA_SANCIONADA', 'mensaje', private.texto_sancion(s)); end if;
  v_cat := private.categoria_edad(p_uid);
  if v_cat = 'bloqueado' then return jsonb_build_object('error', 'SIN_PERMISO'); end if;
  v_staff := p.rol in ('moderador', 'admin');
  select max(created_at) into v_ult from public.mensajes_chat where autor_id = p_uid;
  if v_ult is not null and now() - v_ult < interval '1 second' then return jsonb_build_object('error', 'LIMITE_EXCEDIDO', 'reintentar_en', 1); end if;
  if not v_staff then
    select count(*) into v_n from public.mensajes_chat where autor_id = p_uid and created_at > now() - interval '1 hour';
    if v_n >= 200 then return jsonb_build_object('error', 'LIMITE_EXCEDIDO', 'reintentar_en', 60); end if;
  end if;
  insert into public.mensajes_chat (autor_id, username, mensaje, grupo_edad, autor_staff)
  values (p_uid, coalesce(p.nombre_display, p.username, 'Jugador'), t, case when v_cat = 'menor' then 'menor' else 'adulto' end, v_staff)
  returning id into v_id;
  return jsonb_build_object('ok', true, 'id', v_id, 'creado_en', now());
end $$;

create or replace function private.chat_listar(p_uid uuid, p_desde bigint, p_limite int) returns jsonb
language plpgsql stable security definer set search_path = '' as $$
declare v_staff boolean := private.es_staff_id(p_uid); v_grupo text := private.chat_grupo_de(p_uid);
  v_lim int := greatest(1, least(coalesce(p_limite, 50), 100)); v_desde bigint := greatest(coalesce(p_desde, 0), 0); v_msgs jsonb; v_borr jsonb;
begin
  select coalesce(jsonb_agg(x order by (x ->> 'id')::bigint), '[]'::jsonb) into v_msgs from (
    select jsonb_build_object('id', m.id, 'usuario_id', m.autor_id, 'nombre', coalesce(pf.nombre_display, pf.username, m.username),
      'texto', m.mensaje, 'creado_en', m.created_at, 'rol', coalesce(pf.rol, 'jugador')) as x
    from (select * from public.mensajes_chat c where c.id > v_desde and not c.borrado and (v_staff or c.autor_staff or c.grupo_edad = v_grupo)
          order by case when v_desde = 0 then -c.id else c.id end limit v_lim) m
    left join public.perfiles pf on pf.id = m.autor_id) t;
  select coalesce(jsonb_agg(c.id order by c.id), '[]'::jsonb) into v_borr from public.mensajes_chat c
    where c.borrado and c.id > (select greatest(coalesce(max(id), 0) - 200, 0) from public.mensajes_chat) and (v_staff or c.autor_staff or c.grupo_edad = v_grupo);
  return jsonb_build_object('ok', true, 'mensajes', v_msgs, 'borrados', v_borr);
end $$;
revoke all on function private.chat_poner(uuid, text), private.chat_listar(uuid, bigint, int) from public, anon, authenticated;

-- ── C) RPC de la web (sesión del usuario) ──────────────────────────────────────────────────────────────────────────────
create or replace function public.chat_global_listar(p_desde bigint default 0, p_limite int default 50) returns jsonb
language plpgsql stable security definer set search_path = '' as $$
begin
  if (select auth.uid()) is null then raise exception 'NO_AUTORIZADO' using errcode = 'P0001'; end if;
  return private.chat_listar((select auth.uid()), p_desde, p_limite);
end $$;

create or replace function public.chat_global_enviar(p_texto text) returns jsonb
language plpgsql security definer set search_path = '' as $$
declare r jsonb;
begin
  if (select auth.uid()) is null then raise exception 'NO_AUTORIZADO' using errcode = 'P0001'; end if;
  r := private.chat_poner((select auth.uid()), p_texto);
  if r ? 'error' then raise exception '%: %', r ->> 'error', coalesce(r ->> 'mensaje', r ->> 'error') using errcode = 'P0001'; end if;
  return r;
end $$;

create or replace function public.chat_global_borrar(p_id bigint, p_motivo text default null) returns void
language plpgsql security definer set search_path = '' as $$
declare m public.mensajes_chat;
begin
  if not private.es_moderador() then raise exception 'NO_AUTORIZADO' using errcode = 'P0001'; end if;
  select * into m from public.mensajes_chat where id = p_id;
  if not found then raise exception 'MENSAJE_NO_ENCONTRADO' using errcode = 'P0001'; end if;
  if m.borrado then return; end if;
  update public.mensajes_chat set borrado = true, mensaje = '', borrado_por = (select auth.uid()), borrado_en = now() where id = p_id;
  perform private.auditar_moderacion('borrar', 'mensajes_chat', p_id::text, 'Chat general · mensaje borrado', jsonb_build_object('autor', m.autor_id, 'texto', m.mensaje), nullif(btrim(coalesce(p_motivo, '')), ''));
end $$;

revoke execute on function public.chat_global_listar(bigint, int), public.chat_global_enviar(text), public.chat_global_borrar(bigint, text) from public, anon;
grant execute on function public.chat_global_listar(bigint, int), public.chat_global_enviar(text), public.chat_global_borrar(bigint, text) to authenticated;

-- ── D) RPC de la API (solo service_role: las llama la Edge Function «phoenix»; devuelven {error:CODIGO} o {ok:true,…}) ─────
create or replace function public.chat_api_listar(p_usuario uuid, p_desde bigint default 0, p_limite int default 50) returns jsonb
language sql stable security definer set search_path = '' as $$ select private.chat_listar(p_usuario, p_desde, p_limite) $$;

create or replace function public.chat_api_enviar(p_usuario uuid, p_texto text) returns jsonb
language sql security definer set search_path = '' as $$ select private.chat_poner(p_usuario, p_texto) $$;

revoke execute on function public.chat_api_listar(uuid, bigint, int), public.chat_api_enviar(uuid, text) from public, anon, authenticated;
grant execute on function public.chat_api_listar(uuid, bigint, int), public.chat_api_enviar(uuid, text) to service_role;

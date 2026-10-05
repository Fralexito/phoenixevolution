-- 018 · CHAT PRIVADO (1 a 1 y grupos). Depende de 017 (amigos, bloqueos, privacidad).
-- Reglas de privacidad aplicadas EN EL SERVIDOR (no solo en la pantalla):
--  · Mensaje directo: respeta «quién puede escribirme» del destinatario y los bloqueos.
--  · Grupo: solo se invita a quien su propia privacidad permitiría que le escribas. Cualquiera puede salir cuando quiera.
--  · Mensajes: solo los ven los miembros (RLS). Se pueden borrar (el texto se vacía) y reportar. Límite: 1000 caracteres y 20 mensajes/minuto.
-- Las tablas no se escriben desde el navegador: todo pasa por funciones (RPC).

create table if not exists public.conversaciones (
  id uuid primary key default gen_random_uuid(),
  tipo text not null check (tipo in ('DIRECTO','GRUPO')),
  nombre text check (nombre is null or char_length(btrim(nombre)) between 1 and 40),
  creador_id uuid references auth.users(id) on delete set null,
  par_a uuid references auth.users(id) on delete cascade,
  par_b uuid references auth.users(id) on delete cascade,
  created_at timestamptz not null default now(),
  ultimo_mensaje_at timestamptz not null default now(),
  constraint conv_directo_valido check (tipo <> 'DIRECTO' or (par_a is not null and par_b is not null and par_a < par_b and nombre is null)),
  constraint conv_grupo_valido check (tipo <> 'GRUPO' or (par_a is null and par_b is null and nombre is not null)),
  constraint conv_directo_unico unique (par_a, par_b)
);

create table if not exists public.conv_miembros (
  conversacion_id uuid not null references public.conversaciones(id) on delete cascade,
  usuario_id uuid not null references auth.users(id) on delete cascade,
  rol text not null default 'MIEMBRO' check (rol in ('ADMIN','MIEMBRO')),
  silenciado boolean not null default false,
  ultimo_leido_at timestamptz not null default now(),
  unido_at timestamptz not null default now(),
  primary key (conversacion_id, usuario_id)
);
create index if not exists conv_miembros_usuario_idx on public.conv_miembros (usuario_id);

create table if not exists public.mensajes_privados (
  id bigint generated always as identity primary key,
  conversacion_id uuid not null references public.conversaciones(id) on delete cascade,
  autor_id uuid references auth.users(id) on delete set null,
  texto text not null,
  eliminado boolean not null default false,
  created_at timestamptz not null default now(),
  constraint mp_texto_valido check ((eliminado and texto = '') or (not eliminado and char_length(btrim(texto)) between 1 and 1000))
);
create index if not exists mp_conv_idx on public.mensajes_privados (conversacion_id, id desc);
create index if not exists mp_autor_reciente_idx on public.mensajes_privados (autor_id, created_at desc);

create table if not exists public.reportes_chat (
  id bigint generated always as identity primary key,
  mensaje_id bigint not null references public.mensajes_privados(id) on delete cascade,
  reportante_id uuid not null references auth.users(id) on delete cascade,
  motivo text not null check (char_length(btrim(motivo)) between 3 and 300),
  created_at timestamptz not null default now(),
  constraint reportes_chat_unico unique (mensaje_id, reportante_id)
);

-- Ayudantes internos
create or replace function private.es_miembro(p_conv uuid, p_uid uuid) returns boolean
language sql stable security definer set search_path = '' as $$
  select exists (select 1 from public.conv_miembros where conversacion_id = p_conv and usuario_id = p_uid)
$$;
revoke all on function private.es_miembro(uuid, uuid) from public, anon, authenticated;

create or replace function private.es_admin_conv(p_conv uuid, p_uid uuid) returns boolean
language sql stable security definer set search_path = '' as $$
  select exists (select 1 from public.conv_miembros where conversacion_id = p_conv and usuario_id = p_uid and rol = 'ADMIN')
$$;
revoke all on function private.es_admin_conv(uuid, uuid) from public, anon, authenticated;

-- ¿Puede `p_yo` iniciar contacto con `p_otro` según la privacidad de `p_otro`? (también decide quién puede invitar a un grupo)
create or replace function private.puede_escribir_a(p_yo uuid, p_otro uuid) returns boolean
language plpgsql stable security definer set search_path = '' as $$
declare modo text;
begin
  if p_yo is null or p_otro is null or p_yo = p_otro or private.hay_bloqueo(p_yo, p_otro) then return false; end if;
  modo := coalesce((select quien_escribe from public.privacidad_social where usuario_id = p_otro), 'amigos');
  return case modo
    when 'todos' then true
    when 'amigos' then private.son_amigos(p_yo, p_otro)
    when 'amigos_y_seguidores' then private.son_amigos(p_yo, p_otro) or exists (select 1 from public.seguidores where seguidor_id = p_yo and seguido_id = p_otro)
    else false end;
end $$;
revoke all on function private.puede_escribir_a(uuid, uuid) from public, anon, authenticated;

-- Lectura: solo miembros.
alter table public.conversaciones enable row level security;
alter table public.conv_miembros enable row level security;
alter table public.mensajes_privados enable row level security;
alter table public.reportes_chat enable row level security;
revoke all on public.conversaciones, public.conv_miembros, public.mensajes_privados, public.reportes_chat from anon, authenticated;
grant select on public.conversaciones, public.conv_miembros, public.mensajes_privados, public.reportes_chat to authenticated;
create policy conv_lectura on public.conversaciones for select to authenticated using (private.es_miembro(id, (select auth.uid())));
create policy miembros_lectura on public.conv_miembros for select to authenticated using (private.es_miembro(conversacion_id, (select auth.uid())));
create policy mensajes_lectura on public.mensajes_privados for select to authenticated using (private.es_miembro(conversacion_id, (select auth.uid())));
create policy reportes_lectura on public.reportes_chat for select to authenticated using (
  reportante_id = (select auth.uid()) or exists (select 1 from public.perfiles where id = (select auth.uid()) and rol = 'admin'));

-- ───────── Funciones (RPC) ─────────
create or replace function public.abrir_directo(p_otro uuid) returns uuid
language plpgsql security definer set search_path = '' as $$
declare yo uuid := private.uid_requerido(); a uuid := least(yo, p_otro); b uuid := greatest(yo, p_otro); v uuid;
begin
  if p_otro is null or p_otro = yo then raise exception 'Elige a otra persona.'; end if;
  if not exists (select 1 from public.perfiles where id = p_otro) then raise exception 'Ese jugador no existe.'; end if;
  select id into v from public.conversaciones where par_a = a and par_b = b;
  if v is null then
    if not private.puede_escribir_a(yo, p_otro) then raise exception 'No puedes enviarle mensajes a esta persona.'; end if;
    insert into public.conversaciones (tipo, creador_id, par_a, par_b) values ('DIRECTO', yo, a, b) returning id into v;
  elsif private.hay_bloqueo(yo, p_otro) then raise exception 'No puedes enviarle mensajes a esta persona.';
  end if;
  insert into public.conv_miembros (conversacion_id, usuario_id) values (v, yo) on conflict do nothing;
  insert into public.conv_miembros (conversacion_id, usuario_id) values (v, p_otro) on conflict do nothing;
  return v;
end $$;

create or replace function public.crear_grupo(p_nombre text, p_miembros uuid[]) returns uuid
language plpgsql security definer set search_path = '' as $$
declare yo uuid := private.uid_requerido(); v uuid; u uuid; ids uuid[]; propios integer;
begin
  if char_length(btrim(coalesce(p_nombre, ''))) not between 1 and 40 then raise exception 'El nombre del grupo debe tener entre 1 y 40 caracteres.'; end if;
  select coalesce(array_agg(distinct x), '{}') into ids from unnest(coalesce(p_miembros, '{}')) x where x is not null and x <> yo;
  if coalesce(array_length(ids, 1), 0) < 1 then raise exception 'Elige al menos a una persona.'; end if;
  if array_length(ids, 1) > 19 then raise exception 'Un grupo admite hasta 20 personas.'; end if;
  select count(*) into propios from public.conversaciones where tipo = 'GRUPO' and creador_id = yo;
  if propios >= 20 then raise exception 'Has creado demasiados grupos (máx. 20).'; end if;
  foreach u in array ids loop
    if not private.puede_escribir_a(yo, u) then raise exception 'No puedes agregar a % al grupo (su privacidad no lo permite).', coalesce(private.nombre(u), 'una persona'); end if;
  end loop;
  insert into public.conversaciones (tipo, nombre, creador_id) values ('GRUPO', btrim(p_nombre), yo) returning id into v;
  insert into public.conv_miembros (conversacion_id, usuario_id, rol) values (v, yo, 'ADMIN');
  insert into public.conv_miembros (conversacion_id, usuario_id) select v, x from unnest(ids) x;
  return v;
end $$;

create or replace function public.agregar_a_grupo(p_conv uuid, p_usuario uuid) returns void
language plpgsql security definer set search_path = '' as $$
declare yo uuid := private.uid_requerido();
begin
  if not exists (select 1 from public.conversaciones where id = p_conv and tipo = 'GRUPO') then raise exception 'Ese grupo no existe.'; end if;
  if not private.es_admin_conv(p_conv, yo) then raise exception 'Solo los administradores del grupo pueden agregar gente.'; end if;
  if (select count(*) from public.conv_miembros where conversacion_id = p_conv) >= 20 then raise exception 'El grupo está lleno (máx. 20).'; end if;
  if not private.puede_escribir_a(yo, p_usuario) then raise exception 'No puedes agregar a esa persona (su privacidad no lo permite).'; end if;
  insert into public.conv_miembros (conversacion_id, usuario_id) values (p_conv, p_usuario) on conflict do nothing;
end $$;

create or replace function public.expulsar_de_grupo(p_conv uuid, p_usuario uuid) returns void
language plpgsql security definer set search_path = '' as $$
declare yo uuid := private.uid_requerido();
begin
  if not private.es_admin_conv(p_conv, yo) then raise exception 'Solo los administradores del grupo pueden quitar gente.'; end if;
  if p_usuario = yo then raise exception 'Para irte del grupo usa «Salir».'; end if;
  delete from public.conv_miembros where conversacion_id = p_conv and usuario_id = p_usuario;
end $$;

create or replace function public.salir_de_conversacion(p_conv uuid) returns void
language plpgsql security definer set search_path = '' as $$
declare yo uuid := private.uid_requerido(); t text; restantes integer;
begin
  select tipo into t from public.conversaciones where id = p_conv;
  if t is null or not private.es_miembro(p_conv, yo) then return; end if;
  delete from public.conv_miembros where conversacion_id = p_conv and usuario_id = yo;
  if t = 'GRUPO' then
    select count(*) into restantes from public.conv_miembros where conversacion_id = p_conv;
    if restantes = 0 then delete from public.conversaciones where id = p_conv;
    elsif not exists (select 1 from public.conv_miembros where conversacion_id = p_conv and rol = 'ADMIN') then
      update public.conv_miembros set rol = 'ADMIN' where (conversacion_id, usuario_id) = (p_conv, (select usuario_id from public.conv_miembros where conversacion_id = p_conv order by unido_at limit 1));
    end if;
  end if;
end $$;

create or replace function public.enviar_mensaje(p_conv uuid, p_texto text) returns bigint
language plpgsql security definer set search_path = '' as $$
declare yo uuid := private.uid_requerido(); t text := btrim(coalesce(p_texto, '')); c public.conversaciones%rowtype; otro uuid; v bigint; recientes integer;
begin
  if char_length(t) not between 1 and 1000 then raise exception 'El mensaje debe tener entre 1 y 1000 caracteres.'; end if;
  select * into c from public.conversaciones where id = p_conv;
  if not found or not private.es_miembro(p_conv, yo) then raise exception 'No perteneces a esta conversación.'; end if;
  select count(*) into recientes from public.mensajes_privados where autor_id = yo and created_at > now() - interval '1 minute';
  if recientes >= 20 then raise exception 'Vas muy rápido: espera unos segundos.'; end if;
  if c.tipo = 'DIRECTO' then
    otro := case when c.par_a = yo then c.par_b else c.par_a end;
    if private.hay_bloqueo(yo, otro) then raise exception 'No se pudo enviar el mensaje.'; end if;
    insert into public.conv_miembros (conversacion_id, usuario_id) values (p_conv, otro) on conflict do nothing;   -- si la otra persona había ocultado el chat, reaparece
  end if;
  insert into public.mensajes_privados (conversacion_id, autor_id, texto) values (p_conv, yo, t) returning id into v;
  update public.conversaciones set ultimo_mensaje_at = now() where id = p_conv;
  update public.conv_miembros set ultimo_leido_at = now() where conversacion_id = p_conv and usuario_id = yo;
  return v;
end $$;

create or replace function public.borrar_mensaje(p_id bigint) returns void
language plpgsql security definer set search_path = '' as $$
declare yo uuid := private.uid_requerido();
begin update public.mensajes_privados set eliminado = true, texto = '' where id = p_id and autor_id = yo; end $$;

create or replace function public.marcar_leido(p_conv uuid) returns void
language plpgsql security definer set search_path = '' as $$
declare yo uuid := private.uid_requerido();
begin update public.conv_miembros set ultimo_leido_at = now() where conversacion_id = p_conv and usuario_id = yo; end $$;

create or replace function public.silenciar_conversacion(p_conv uuid, p_silenciar boolean) returns void
language plpgsql security definer set search_path = '' as $$
declare yo uuid := private.uid_requerido();
begin update public.conv_miembros set silenciado = coalesce(p_silenciar, false) where conversacion_id = p_conv and usuario_id = yo; end $$;

create or replace function public.reportar_mensaje(p_mensaje bigint, p_motivo text) returns void
language plpgsql security definer set search_path = '' as $$
declare yo uuid := private.uid_requerido(); conv uuid;
begin
  select conversacion_id into conv from public.mensajes_privados where id = p_mensaje;
  if conv is null or not private.es_miembro(conv, yo) then raise exception 'Ese mensaje no existe.'; end if;
  insert into public.reportes_chat (mensaje_id, reportante_id, motivo) values (p_mensaje, yo, btrim(coalesce(p_motivo, ''))) on conflict do nothing;
end $$;

create or replace function public.mis_conversaciones() returns jsonb
language plpgsql stable security definer set search_path = '' as $$
declare yo uuid := private.uid_requerido();
begin
  return coalesce((select jsonb_agg(x order by x->>'ultimo_at' desc) from (
    select jsonb_build_object(
      'id', c.id, 'tipo', c.tipo, 'nombre', c.nombre,
      'otro_id', case when c.tipo = 'DIRECTO' then case when c.par_a = yo then c.par_b else c.par_a end end,
      'miembros', (select count(*) from public.conv_miembros k where k.conversacion_id = c.id),
      'es_admin', m.rol = 'ADMIN', 'silenciado', m.silenciado, 'ultimo_at', c.ultimo_mensaje_at,
      'ultimo', (select jsonb_build_object('autor', ms.autor_id, 'texto', case when ms.eliminado then null else left(ms.texto, 120) end, 'at', ms.created_at)
                 from public.mensajes_privados ms where ms.conversacion_id = c.id order by ms.id desc limit 1),
      'no_leidos', (select count(*) from public.mensajes_privados ms where ms.conversacion_id = c.id and ms.created_at > m.ultimo_leido_at and ms.autor_id is distinct from yo and not ms.eliminado)
    ) as x
    from public.conversaciones c join public.conv_miembros m on m.conversacion_id = c.id and m.usuario_id = yo) t), '[]'::jsonb);
end $$;

do $$ declare f text; begin
  foreach f in array array['abrir_directo(uuid)','crear_grupo(text,uuid[])','agregar_a_grupo(uuid,uuid)','expulsar_de_grupo(uuid,uuid)','salir_de_conversacion(uuid)',
    'enviar_mensaje(uuid,text)','borrar_mensaje(bigint)','marcar_leido(uuid)','silenciar_conversacion(uuid,boolean)','reportar_mensaje(bigint,text)','mis_conversaciones()'] loop
    execute format('revoke all on function public.%s from public, anon', f);
    execute format('grant execute on function public.%s to authenticated', f);
  end loop;
end $$;

do $$ declare t text; begin
  foreach t in array array['mensajes_privados','conv_miembros'] loop
    if not exists (select 1 from pg_publication_tables where pubname = 'supabase_realtime' and tablename = t) then
      execute format('alter publication supabase_realtime add table public.%I', t);
    end if;
  end loop;
end $$;

-- 095 · «Mi club» (vestuario): editar desde la web la ficha de los jugadores de MI equipo de Liga Máster de PES 2021.
-- El PC (Phoenix Mercado) sube el club y las fichas; la web crea cambios PENDIENTES; el PC los baja (firmados), los aplica al juego y confirma.
-- Cada usuario solo ve lo suyo; el staff ve todo. Toda escritura va por función (la web) o por service_role (la Edge Function mercado).
-- No toca fichajes, /liga/cambios ni el catálogo.
-- Se aplicó por MCP en tres partes (095, 095b, 095c) por el tamaño; este archivo es la suma de las tres.

-- ==== PARTE 1 · tablas, permisos, bucket ====
create table if not exists public.vestuario_club (
  id bigserial primary key,
  usuario_id uuid not null references auth.users(id) on delete cascade,
  pes_team_id int not null check (pes_team_id between 1 and 99999),
  nombre text not null check (char_length(nombre) between 1 and 80),
  partida text check (char_length(partida) <= 80),                 -- p. ej. «ranura 1»
  fecha_partida text check (char_length(fecha_partida) <= 40),     -- tal como la manda el PC
  finanzas jsonb not null default '{}'::jsonb check (jsonb_typeof(finanzas) = 'object'),
  escudo_url text,                                                 -- ruta dentro del bucket «vestuario»
  version_cambios bigint not null default 0,                       -- contador creciente por club (versión de vestuario_cambio)
  subido_en timestamptz not null default now(),
  unique (usuario_id, pes_team_id)                                 -- subir otra vez el mismo club lo reemplaza
);

create table if not exists public.vestuario_jugador (
  id bigserial primary key,
  club_id bigint not null references public.vestuario_club(id) on delete cascade,
  pid int not null check (pid > 0),                                -- pes_id
  orden int not null default 0,
  ficha jsonb not null check (jsonb_typeof(ficha) = 'object'),     -- tal como la sube el PC (incluye «bloqueados»)
  foto_url text,                                                   -- ruta dentro del bucket «vestuario»
  vigente boolean not null default true,                           -- false = ya no venía en la última subida (se conserva por sus cambios)
  actualizado_en timestamptz not null default now(),
  unique (club_id, pid)
);

create table if not exists public.vestuario_cambio (
  id bigserial primary key,
  club_id bigint not null references public.vestuario_club(id) on delete cascade,   -- redundante a propósito: acelera «cambios del club desde la versión N»
  jugador_id bigint not null references public.vestuario_jugador(id) on delete cascade,
  campo text not null check (char_length(campo) between 1 and 60),                  -- «habilidades.velocidad», «dorsal», «posiciones.MO», «liga_master.sueldo»…
  valor jsonb not null,
  estado text not null default 'pendiente' check (estado in ('pendiente', 'aplicado', 'rechazado')),
  creado_en timestamptz not null default now(),
  aplicado_en timestamptz,
  motivo_rechazo text check (char_length(motivo_rechazo) <= 200),
  version bigint not null,
  unique (club_id, version)
);
create index if not exists vestuario_club_usuario on public.vestuario_club (usuario_id);
create index if not exists vestuario_cambio_jugador on public.vestuario_cambio (jugador_id, estado);

alter table public.vestuario_club enable row level security;
alter table public.vestuario_jugador enable row level security;
alter table public.vestuario_cambio enable row level security;
-- Solo lectura para usuarios. El subselect sobre vestuario_club ya filtra por su propia RLS (lo tuyo; el staff, todo).
drop policy if exists vestuario_club_lee on public.vestuario_club;
create policy vestuario_club_lee on public.vestuario_club for select to authenticated
  using (usuario_id = (select auth.uid()) or private.es_moderador());
drop policy if exists vestuario_jugador_lee on public.vestuario_jugador;
create policy vestuario_jugador_lee on public.vestuario_jugador for select to authenticated
  using (club_id in (select id from public.vestuario_club));
drop policy if exists vestuario_cambio_lee on public.vestuario_cambio;
create policy vestuario_cambio_lee on public.vestuario_cambio for select to authenticated
  using (club_id in (select id from public.vestuario_club));
revoke all on public.vestuario_club, public.vestuario_jugador, public.vestuario_cambio from anon, authenticated;
grant select on public.vestuario_club, public.vestuario_jugador, public.vestuario_cambio to authenticated;

-- Bucket PRIVADO: minifaces y escudo (PNG). Ruta: <usuario_id>/<club_id>/<pid|escudo>.png. Solo escribe service_role (la Edge Function).
insert into storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
values ('vestuario', 'vestuario', false, 204800, array['image/png']) on conflict (id) do nothing;
drop policy if exists vestuario_img_lee on storage.objects;
create policy vestuario_img_lee on storage.objects for select to authenticated
  using (bucket_id = 'vestuario' and ((storage.foldername(name))[1] = (select auth.uid())::text or private.es_moderador()));

-- ==== PARTE 2 · validación en servidor y guardado desde la web ====
-- Solo se pueden tocar estos campos, con estos rangos. El campo debe existir en la ficha y no estar en ficha.bloqueados.
create or replace function private.vestuario_validar_cambio(p_ficha jsonb, p_campo text, p_valor jsonb) returns void
language plpgsql as $$
declare v_min numeric; v_max numeric; v_n numeric;
begin
  if p_campo ~ '^habilidades\.[a-z][a-z0-9_]{1,29}$' or p_campo ~ '^portero\.[a-z][a-z0-9_]{1,29}$' then v_min := 40; v_max := 99;
  elsif p_campo = 'dorsal' then v_min := 1; v_max := 99;
  elsif p_campo = 'edad' then v_min := 15; v_max := 50;
  elsif p_campo = 'altura' then v_min := 150; v_max := 210;
  elsif p_campo = 'peso' then v_min := 40; v_max := 130;
  elsif p_campo ~ '^posiciones\.(PT|DFC|LI|LD|MCD|MC|MI|MD|MO|EI|ED|SD|DC)$' then v_min := 0; v_max := 2;
  elsif p_campo in ('liga_master.sueldo', 'liga_master.valor') then v_min := 0; v_max := 400000000;
  elsif p_campo = 'posicion' then
    if jsonb_typeof(p_valor) <> 'string' or not ((p_valor #>> '{}') = any (array['PT','DFC','LI','LD','MCD','MC','MI','MD','MO','EI','ED','SD','DC'])) then raise exception 'VALOR_INVALIDO:%', p_campo; end if;
  else raise exception 'CAMPO_NO_EDITABLE:%', p_campo;
  end if;
  if jsonb_typeof(p_ficha->'bloqueados') = 'array' and (p_ficha->'bloqueados') ? p_campo then raise exception 'CAMPO_BLOQUEADO:%', p_campo; end if;
  if (p_ficha #> string_to_array(p_campo, '.')) is null then raise exception 'CAMPO_NO_EXISTE:%', p_campo; end if;
  if v_min is not null then
    if jsonb_typeof(p_valor) <> 'number' then raise exception 'VALOR_INVALIDO:%', p_campo; end if;
    v_n := (p_valor #>> '{}')::numeric;
    if v_n <> trunc(v_n) or v_n < v_min or v_n > v_max then raise exception 'VALOR_INVALIDO:%', p_campo; end if;
  end if;
end $$;

-- Guardar los cambios de UN jugador. p_cambios = [{campo, valor}, …] es el conjunto COMPLETO deseado: lo que falta se descarta
-- (lista vacía = «Volver a los datos del juego»). Lo igual al juego no se guarda. Solo el dueño del club.
create or replace function public.vestuario_guardar_cambios(p_jugador bigint, p_cambios jsonb) returns jsonb
language plpgsql security definer set search_path = public as $$
declare v_uid uuid := auth.uid(); v_j vestuario_jugador; v_c vestuario_club; it jsonb; v_campos text[] := '{}'; v_ver bigint; v_n int := 0; v_old jsonb;
begin
  if v_uid is null then raise exception 'NO_AUTORIZADO'; end if;
  select * into v_j from vestuario_jugador where id = p_jugador;
  if v_j.id is null then raise exception 'JUGADOR_NO_EXISTE'; end if;
  select * into v_c from vestuario_club where id = v_j.club_id for update;
  if v_c.usuario_id is distinct from v_uid then raise exception 'NO_AUTORIZADO'; end if;
  if p_cambios is null or jsonb_typeof(p_cambios) <> 'array' then raise exception 'DATOS_INVALIDOS'; end if;
  if jsonb_array_length(p_cambios) > 80 then raise exception 'DEMASIADOS_CAMBIOS'; end if;
  for it in select * from jsonb_array_elements(p_cambios) loop
    if jsonb_typeof(it) <> 'object' or jsonb_typeof(it->'campo') <> 'string' or not (it ? 'valor') then raise exception 'DATOS_INVALIDOS'; end if;
    perform private.vestuario_validar_cambio(v_j.ficha, it->>'campo', it->'valor');
    if (v_j.ficha #> string_to_array(it->>'campo', '.')) is distinct from (it->'valor') then
      v_campos := v_campos || (it->>'campo');
      select valor into v_old from vestuario_cambio where jugador_id = p_jugador and estado = 'pendiente' and campo = it->>'campo';
      if v_old is not distinct from (it->'valor') then continue; end if;      -- ya estaba pendiente igual: se conserva su versión
      delete from vestuario_cambio where jugador_id = p_jugador and estado = 'pendiente' and campo = it->>'campo';
      update vestuario_club set version_cambios = version_cambios + 1 where id = v_c.id returning version_cambios into v_ver;
      insert into vestuario_cambio (club_id, jugador_id, campo, valor, version) values (v_c.id, p_jugador, it->>'campo', it->'valor', v_ver);
      v_n := v_n + 1;
    end if;
  end loop;
  delete from vestuario_cambio where jugador_id = p_jugador and estado = 'pendiente' and not (campo = any (v_campos));
  return jsonb_build_object('guardados', v_n,
    'pendientes', (select count(*) from vestuario_cambio where jugador_id = p_jugador and estado = 'pendiente'),
    'version_actual', (select version_cambios from vestuario_club where id = v_c.id));
end $$;
revoke execute on function public.vestuario_guardar_cambios(bigint, jsonb) from public, anon;
grant execute on function public.vestuario_guardar_cambios(bigint, jsonb) to authenticated;

-- ==== PARTE 3 · funciones solo para la Edge Function (service_role) ====
-- Subir/reemplazar un club y sus fichas. NO borra cambios pendientes. Los jugadores que ya no vienen quedan vigente = false.
create or replace function public.sistema_vestuario_subir(p_usuario uuid, p_pes_team_id int, p_nombre text, p_partida text, p_fecha text, p_finanzas jsonb, p_jugadores jsonb) returns jsonb
language plpgsql security definer set search_path = public as $$
declare v_id bigint; j jsonb; v_pids int[] := '{}';
begin
  insert into vestuario_club (usuario_id, pes_team_id, nombre, partida, fecha_partida, finanzas, subido_en)
  values (p_usuario, p_pes_team_id, p_nombre, p_partida, p_fecha, coalesce(p_finanzas, '{}'::jsonb), now())
  on conflict (usuario_id, pes_team_id) do update
    set nombre = excluded.nombre, partida = excluded.partida, fecha_partida = excluded.fecha_partida, finanzas = excluded.finanzas, subido_en = now()
  returning id into v_id;
  for j in select * from jsonb_array_elements(p_jugadores) loop
    insert into vestuario_jugador (club_id, pid, orden, ficha, actualizado_en)
    values (v_id, (j->>'pid')::int, coalesce((j->>'orden')::int, 0), j->'ficha', now())
    on conflict (club_id, pid) do update set orden = excluded.orden, ficha = excluded.ficha, vigente = true, actualizado_en = now();
    v_pids := v_pids || (j->>'pid')::int;
  end loop;
  update vestuario_jugador set vigente = false where club_id = v_id and vigente and not (pid = any (v_pids));
  return jsonb_build_object('club_id', v_id, 'jugadores', coalesce(array_length(v_pids, 1), 0));
end $$;

-- Rutas de las imágenes ya subidas al bucket: { "escudo": ruta, "<pid>": ruta, … }
create or replace function public.sistema_vestuario_fotos(p_club bigint, p_fotos jsonb) returns void
language plpgsql security definer set search_path = public as $$
begin
  if p_fotos ? 'escudo' then update vestuario_club set escudo_url = p_fotos->>'escudo' where id = p_club; end if;
  update vestuario_jugador j set foto_url = f.value
  from jsonb_each_text(p_fotos) f
  where j.club_id = p_club and j.pid = (case when f.key ~ '^[0-9]{1,9}$' then f.key::int end);
end $$;

-- Cambios PENDIENTES del club con versión > p_desde (para firmar en la Edge Function).
create or replace function public.sistema_vestuario_cambios(p_club bigint, p_desde bigint, p_limite int default 1000) returns jsonb
language sql stable security definer set search_path = public as $$
  select jsonb_build_object('club_id', p_club, 'desde', p_desde,
    'version_actual', (select version_cambios from vestuario_club where id = p_club),
    'cambios', coalesce((select jsonb_agg(jsonb_build_object('version', c.version, 'pid', j.pid, 'campo', c.campo, 'valor', c.valor) order by c.version)
      from (select * from vestuario_cambio where club_id = p_club and estado = 'pendiente' and version > p_desde order by version limit greatest(1, least(p_limite, 1000))) c
      join vestuario_jugador j on j.id = c.jugador_id), '[]'::jsonb));
$$;

-- El PC informa qué aplicó o rechazó. Al aplicar, la ficha de la web se actualiza (hasta que el PC suba la ficha real).
create or replace function public.sistema_vestuario_aplicado(p_club bigint, p_resultados jsonb) returns jsonb
language plpgsql security definer set search_path = public as $$
declare r jsonb; v_c vestuario_cambio; v_ok int := 0; v_skip int := 0;
begin
  for r in select * from jsonb_array_elements(p_resultados) loop
    select * into v_c from vestuario_cambio where club_id = p_club and version = (r->>'version')::bigint and estado = 'pendiente' for update;
    if v_c.id is null then v_skip := v_skip + 1; continue; end if;
    if r->>'estado' = 'aplicado' then
      update vestuario_cambio set estado = 'aplicado', aplicado_en = now() where id = v_c.id;
      update vestuario_jugador set ficha = jsonb_set(ficha, string_to_array(v_c.campo, '.'), v_c.valor, false), actualizado_en = now() where id = v_c.jugador_id;
    else
      update vestuario_cambio set estado = 'rechazado', aplicado_en = now(), motivo_rechazo = left(coalesce(r->>'motivo', ''), 200) where id = v_c.id;
    end if;
    v_ok := v_ok + 1;
  end loop;
  return jsonb_build_object('actualizados', v_ok, 'ignorados', v_skip, 'version_actual', (select version_cambios from vestuario_club where id = p_club));
end $$;

revoke execute on function public.sistema_vestuario_subir(uuid, int, text, text, text, jsonb, jsonb) from public, anon, authenticated;
revoke execute on function public.sistema_vestuario_fotos(bigint, jsonb) from public, anon, authenticated;
revoke execute on function public.sistema_vestuario_cambios(bigint, bigint, int) from public, anon, authenticated;
revoke execute on function public.sistema_vestuario_aplicado(bigint, jsonb) from public, anon, authenticated;
grant execute on function public.sistema_vestuario_subir(uuid, int, text, text, text, jsonb, jsonb) to service_role;
grant execute on function public.sistema_vestuario_fotos(bigint, jsonb) to service_role;
grant execute on function public.sistema_vestuario_cambios(bigint, bigint, int) to service_role;
grant execute on function public.sistema_vestuario_aplicado(bigint, jsonb) to service_role;

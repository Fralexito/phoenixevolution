-- 127 · WEB ↔ PES · LIGA MÁSTER (sesión 127, 17-oct-2026). Contrato: docs/CONTRATO-WEB-PES.md v1 §2 y §3b.
-- Va DESPUÉS de la 125 (usa pes_cambios, pes_tipos_cambio, pes_eventos). Idempotente (se puede volver a pegar).
--   · Enciende los tipos «dinero» y «valor» (solo destino lm).
--   · Cada cambio con parte Liga Máster (fichaje / dinero / valor / stats) se traduce AL CREARSE a una fila de
--     public.lm_pc_cambios (canal firmado GET /mercado/v1/liga/cambios?ambito=pc) y se marca estado_lm = publicado.
--     Si no se puede traducir (falta el id de PES, importe raro…) queda estado_lm = error con el motivo en lm_ref.
--   · Anular un cambio (pes_cambio_anular) = deshacer: se publica un «deshacer» y cada PC vuelve a dejar lo de antes.
--   · Cada PC informa por partida (POST /mercado/v1/liga/aplicado-pc): lm_pc_partidas + lm_pc_resultados (historial)
--     y, si es un PC con Phoenix Link, también pes_eventos (registro de usuarios de la 125) con destino «lm».

-- ─── 1) Tipos ────────────────────────────────────────────────────────────────────────────────────────────────────────
insert into public.pes_tipos_cambio (tipo, etiqueta, destinos, motor, activo) values
  ('dinero', 'Dinero de un club (Liga Máster)', array['lm'], 'motor 127', true),
  ('valor', 'Valor de un jugador (Liga Máster)', array['lm'], 'motor 127', true)
on conflict (tipo) do update set etiqueta = excluded.etiqueta, destinos = excluded.destinos, motor = excluded.motor, activo = true;

/** Euros válidos para el juego (múltiplo de 100, de 100 € a 40.000 millones) o null. */
create or replace function private.lm_euros(p jsonb) returns bigint
language sql immutable set search_path = '' as $$
  select case when jsonb_typeof(p) = 'number' and (p::text) ~ '^[0-9]{3,11}$' and (p::text)::bigint between 100 and 40000000000
              and (p::text)::bigint % 100 = 0 then (p::text)::bigint end;
$$;

/** Id de PES real (< 90.000.000) o null. */
create or replace function private.lm_id_real(p jsonb) returns int
language sql immutable set search_path = '' as $$
  select case when (p #>> '{}') ~ '^[0-9]{1,8}$' and (p #>> '{}')::bigint between 1 and 89999999 then (p #>> '{}')::int end;
$$;

-- ─── 2) Fichaje: la parte «lm» acepta también a quién va y las condiciones (la parte base no cambia) ──────────────────
-- Igual que en la 125 salvo el bloque «lm»: además de jugador_id y club_id guarda usuario, partida, monto, sueldo,
-- clausula, fin_contrato y dorsal (todos opcionales). Si la 125 se vuelve a pegar, volver a pegar también esta.
create or replace function private.pes_fichaje_normalizar(p jsonb) returns jsonb
language plpgsql immutable set search_path = '' as $$
declare
  j text; d text; h text; jid bigint; did bigint; hid bigint; lm jsonb; x jsonb;
  limpiar constant text := '[\u0001-\u001f\u007f]';
begin
  if p is null or jsonb_typeof(p) <> 'object' then raise exception 'DATOS_NO_VALIDOS:datos'; end if;
  j := btrim(regexp_replace(coalesce(p->>'jugador', ''), limpiar, '', 'g'));
  d := btrim(regexp_replace(coalesce(p->>'desde', ''), limpiar, '', 'g'));
  h := btrim(regexp_replace(coalesce(p->>'hasta', ''), limpiar, '', 'g'));
  if j = '' or octet_length(j) > 48 then raise exception 'DATOS_NO_VALIDOS:jugador'; end if;
  if h = '' or octet_length(h) > 48 then raise exception 'DATOS_NO_VALIDOS:hasta'; end if;
  if octet_length(d) > 48 then raise exception 'DATOS_NO_VALIDOS:desde'; end if;
  begin
    jid := nullif(p->>'jugador_id', '')::bigint; did := nullif(p->>'desde_id', '')::bigint; hid := nullif(p->>'hasta_id', '')::bigint;
  exception when others then raise exception 'DATOS_NO_VALIDOS:ids';
  end;
  if jid is not null and (jid < 1 or jid > 99999999) then raise exception 'DATOS_NO_VALIDOS:jugador_id'; end if;
  if hid is not null and (hid < 1 or hid > 99999999) then raise exception 'DATOS_NO_VALIDOS:hasta_id'; end if;
  if did is not null and (did < 0 or did > 99999999) then raise exception 'DATOS_NO_VALIDOS:desde_id'; end if;
  jid := coalesce(jid, public.pes_id_sintetico(j));
  hid := coalesce(hid, public.pes_id_sintetico(h));
  did := case when d = '' then 0 else coalesce(nullif(did, 0), public.pes_id_sintetico(d)) end;
  if did = hid or (d <> '' and lower(d) = lower(h)) then raise exception 'DATOS_NO_VALIDOS:mismo_equipo'; end if;
  x := p->'lm';
  lm := case when jsonb_typeof(x) = 'object' then jsonb_strip_nulls(jsonb_build_object(
          'jugador_id', case when (x->>'jugador_id') ~ '^[0-9]{1,12}$' then (x->>'jugador_id')::bigint end,
          'club_id', case when (x->>'club_id') ~ '^[0-9]{1,12}$' then (x->>'club_id')::bigint end,
          'usuario', case when (x->>'usuario') ~* '^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$' then lower(x->>'usuario') end,
          'partida', case when (x->>'partida') ~ '^ML[0-9A-Fa-f]{8}:[0-9]{1,9}$' then x->>'partida' end,
          'monto', private.lm_euros(x->'monto'), 'sueldo', private.lm_euros(x->'sueldo'), 'clausula', private.lm_euros(x->'clausula'),
          'fin_contrato', case when (x->>'fin_contrato') ~ '^20[0-9]{2}-[01][0-9]-[0-3][0-9]$' then x->>'fin_contrato' end,
          'dorsal', case when (x->>'dorsal') ~ '^[0-9]{1,2}$' and (x->>'dorsal')::int between 1 and 99 then (x->>'dorsal')::int end)) end;
  return jsonb_strip_nulls(jsonb_build_object('jugador_id', jid, 'jugador', j, 'desde_id', did, 'desde', d, 'hasta_id', hid, 'hasta', h,
    'lm', case when lm = '{}'::jsonb then null else lm end));
end $$;

-- ─── 3) Canal de Liga Máster para los PCs ────────────────────────────────────────────────────────────────────────────
create table if not exists public.lm_pc_cambios (
  version bigint generated always as identity primary key,
  cambio uuid not null references public.pes_cambios (id) on delete cascade,
  tipo text not null check (tipo in ('traspaso', 'dinero', 'valor', 'stat', 'deshacer')),
  usuario uuid references auth.users (id) on delete cascade,                 -- null = todas las partidas de todos
  partida text check (partida ~ '^ML[0-9A-Fa-f]{8}:[0-9]{1,9}$'),              -- null = todas las del usuario
  datos jsonb not null check (jsonb_typeof(datos) = 'object' and pg_column_size(datos) < 8000),
  creado timestamptz not null default now(),
  unique (cambio, tipo)
);
create index if not exists lm_pc_cambios_usuario_idx on public.lm_pc_cambios (usuario, version);
alter table public.lm_pc_cambios enable row level security;
revoke all on public.lm_pc_cambios from anon, authenticated;
grant select on public.lm_pc_cambios to authenticated;
drop policy if exists lm_pc_cambios_leer on public.lm_pc_cambios;
create policy lm_pc_cambios_leer on public.lm_pc_cambios for select to authenticated using (usuario = (select auth.uid()) or private.es_moderador());

/** Traduce un cambio oficial a una fila del canal LM: { tipo, usuario, partida, datos }. null = no es de este motor. Lanza LM_… si no se puede. */
create or replace function private.lm_pc_traducir(c public.pes_cambios) returns jsonb
language plpgsql stable set search_path = '' as $$
declare d jsonb := c.datos; x jsonb := coalesce(c.datos->'lm', '{}'::jsonb); pid int; hasta int; desde int; u uuid; part text; v jsonb;
begin
  u := case when coalesce(x->>'usuario', d->>'usuario') ~* '^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$' then coalesce(x->>'usuario', d->>'usuario')::uuid end;
  part := coalesce(x->>'partida', d->>'partida');
  if part is not null and part !~ '^ML[0-9A-Fa-f]{8}:[0-9]{1,9}$' then raise exception 'LM_PARTIDA_NO_VALIDA'; end if;
  if part is not null and u is null then raise exception 'LM_PARTIDA_SIN_USUARIO'; end if;
  if u is not null and not exists (select 1 from auth.users where id = u) then raise exception 'LM_USUARIO_NO_EXISTE'; end if;

  if c.tipo = 'fichaje' then
    pid := coalesce(private.lm_id_real(d->'jugador_id'),
                    (select j.pes_id from public.lm_jugadores j where j.id = (x->>'jugador_id')::bigint and j.pes_id between 1 and 89999999));
    hasta := coalesce(private.lm_id_real(d->'hasta_id'),
                      (select k.pes_team_id from public.lm_clubes k where k.id = (x->>'club_id')::bigint and k.pes_team_id between 1 and 89999999));
    desde := coalesce(private.lm_id_real(d->'desde_id'), 0);
    if pid is null then raise exception 'LM_SIN_ID_PES:jugador'; end if;
    if hasta is null then raise exception 'LM_SIN_ID_PES:club_destino'; end if;
    v := jsonb_strip_nulls(jsonb_build_object('pes_id', pid, 'club_desde_pes', desde, 'club_hacia_pes', hasta,
           'jugador', d->>'jugador', 'club_desde', coalesce(d->>'desde', ''), 'club_hacia', d->>'hasta',
           'monto', x->'monto', 'sueldo', x->'sueldo', 'clausula', x->'clausula', 'fin_contrato', x->'fin_contrato', 'dorsal', x->'dorsal'));
    return jsonb_build_object('tipo', 'traspaso', 'usuario', u, 'partida', part, 'datos', v);

  elsif c.tipo = 'dinero' then
    if u is null then raise exception 'LM_FALTA_USUARIO'; end if;
    if d ? 'presupuesto' and private.lm_euros(d->'presupuesto') is null then raise exception 'LM_IMPORTE_NO_VALIDO:presupuesto'; end if;
    if d ? 'tope_salarial' and private.lm_euros(d->'tope_salarial') is null then raise exception 'LM_IMPORTE_NO_VALIDO:tope_salarial'; end if;
    if private.lm_euros(d->'presupuesto') is null and private.lm_euros(d->'tope_salarial') is null then raise exception 'LM_SIN_IMPORTE'; end if;
    return jsonb_build_object('tipo', 'dinero', 'usuario', u, 'partida', part, 'datos', jsonb_strip_nulls(jsonb_build_object(
      'presupuesto', private.lm_euros(d->'presupuesto'), 'tope_salarial', private.lm_euros(d->'tope_salarial'))));

  elsif c.tipo = 'valor' then
    pid := coalesce(private.lm_id_real(d->'jugador_id'),
                    (select j.pes_id from public.lm_jugadores j where j.id = (x->>'jugador_id')::bigint and j.pes_id between 1 and 89999999));
    if pid is null then raise exception 'LM_SIN_ID_PES:jugador'; end if;
    if private.lm_euros(d->'valor') is null then raise exception 'LM_IMPORTE_NO_VALIDO:valor'; end if;
    return jsonb_build_object('tipo', 'valor', 'usuario', u, 'partida', part,
      'datos', jsonb_build_object('pes_id', pid, 'jugador', coalesce(d->>'jugador', ''), 'valor', private.lm_euros(d->'valor')));

  elsif c.tipo in ('stats', 'info') then
    -- La forma la define la 126 (valores, antes, deshace); aquí solo se transporta con el pes_id. El PC la pasa al motor de stats de LM.
    pid := coalesce(private.lm_id_real(d->'jugador_id'),
                    (select j.pes_id from public.lm_jugadores j where j.id = (x->>'jugador_id')::bigint and j.pes_id between 1 and 89999999));
    if pid is null then raise exception 'LM_SIN_ID_PES:jugador'; end if;
    return jsonb_build_object('tipo', 'stat', 'usuario', u, 'partida', part,
      'datos', (d - 'lm' - 'usuario' - 'partida' - 'deshace') || jsonb_build_object('pes_id', pid, 'clase', c.tipo));
  end if;
  return null;
end $$;

/** Publica la parte Liga Máster de UN cambio (si es de este motor). Nunca lanza: si falla, deja estado_lm = error. */
create or replace function private.lm_pc_publicar(p_id uuid) returns text
language plpgsql security definer set search_path = '' as $$
declare c public.pes_cambios; t jsonb; v bigint;
begin
  select * into c from public.pes_cambios where id = p_id for update;
  if not found or c.estado <> 'activo' or c.estado_lm <> 'pendiente' then return null; end if;
  -- Un «deshacer» de la 126 (stats/info con deshace = otro cambio) ya llega a la Liga Máster por la anulación de ese cambio
  -- (disparador de abajo): no se publica dos veces.
  if c.tipo in ('stats', 'info') and c.datos ? 'deshace' then
    update public.pes_cambios set estado_lm = 'publicado', lm_ref = 'lm-por-anulacion', actualizado = now() where id = c.id;
    return 'publicado';
  end if;
  begin
    t := private.lm_pc_traducir(c);
    if t is null then return null; end if;
    insert into public.lm_pc_cambios (cambio, tipo, usuario, partida, datos)
    values (c.id, t->>'tipo', (t->>'usuario')::uuid, t->>'partida', t->'datos')
    on conflict (cambio, tipo) do update set datos = excluded.datos
    returning version into v;
    update public.pes_cambios set estado_lm = 'publicado', lm_ref = 'lm-v' || v, actualizado = now() where id = c.id;
    return 'publicado';
  exception when others then
    update public.pes_cambios set estado_lm = 'error', lm_ref = left(sqlerrm, 120), actualizado = now() where id = c.id;
    return 'error';
  end;
end $$;

create or replace function private.lm_pc_al_crear() returns trigger
language plpgsql security definer set search_path = '' as $$
begin
  if new.estado = 'activo' and new.estado_lm = 'pendiente' then perform private.lm_pc_publicar(new.id); end if;
  return null;
end $$;
drop trigger if exists pes_cambios_lm_127 on public.pes_cambios;
create trigger pes_cambios_lm_127 after insert on public.pes_cambios for each row execute function private.lm_pc_al_crear();

/** Anular = deshacer en cada partida: un «deshacer» por cada fila publicada de ese cambio. */
create or replace function private.lm_pc_al_anular() returns trigger
language plpgsql security definer set search_path = '' as $$
begin
  if old.estado = 'activo' and new.estado = 'anulado' then
    insert into public.lm_pc_cambios (cambio, tipo, usuario, partida, datos)
    select x.cambio, 'deshacer', x.usuario, x.partida, jsonb_build_object('deshace', x.version)
      from public.lm_pc_cambios x where x.cambio = new.id and x.tipo <> 'deshacer'
    on conflict (cambio, tipo) do nothing;
  end if;
  return null;
end $$;
drop trigger if exists pes_cambios_lm_127_anular on public.pes_cambios;
create trigger pes_cambios_lm_127_anular after update of estado on public.pes_cambios for each row execute function private.lm_pc_al_anular();

/** Recoge los pendientes que no pasaron por el disparador (creados antes de esta migración). Admin o servidor. */
create or replace function public.lm_pc_tomar_pendientes() returns jsonb
language plpgsql security definer set search_path = '' as $$
declare r record; n_pub int := 0; n_err int := 0; e text;
begin
  if not (private.pes_es_admin() or (auth.uid() is null and coalesce(auth.role(), '') in ('service_role', ''))) then raise exception 'NO_AUTORIZADO'; end if;
  for r in select id from public.pes_cambios where estado = 'activo' and estado_lm = 'pendiente' order by seq loop
    e := private.lm_pc_publicar(r.id);
    if e = 'publicado' then n_pub := n_pub + 1; elsif e = 'error' then n_err := n_err + 1; end if;
  end loop;
  return jsonb_build_object('publicados', n_pub, 'errores', n_err);
end $$;

/** Contenido del canal para UN usuario (lo firma la Edge Function «mercado»). Formato phoenix-lm/cambios-1 (PhoenixSync/core/CambiosLM.h). */
create or replace function public.lm_pc_cambios_desde(p_usuario uuid, p_desde bigint, p_limite int default 500) returns jsonb
language sql stable security definer set search_path = '' as $$
  select jsonb_build_object('formato', 'phoenix-lm/cambios-1', 'desde', p_desde,
    'version_actual', coalesce((select max(version) from public.lm_pc_cambios), 0),
    'cambios', coalesce((select jsonb_agg(x.datos || jsonb_build_object('version', x.version, 'tipo', x.tipo, 'partida', x.partida, 'cambio_id', x.cambio) order by x.version)
      from (select l.* from public.lm_pc_cambios l join public.pes_cambios c on c.id = l.cambio
             where l.version > p_desde and (l.usuario is null or l.usuario = p_usuario)
               and (l.tipo = 'deshacer' or c.estado = 'activo')
             order by l.version limit least(greatest(coalesce(p_limite, 500), 1), 1000)) x), '[]'::jsonb));
$$;

-- ─── 4) Partidas de cada PC e historial de resultados ───────────────────────────────────────────────────────────────
create table if not exists public.lm_pc_partidas (
  id bigint generated always as identity primary key,
  usuario uuid not null references auth.users (id) on delete cascade,
  dispositivo uuid not null,                                                   -- dispositivos_host.id (Link) o mercado_dispositivos.id (Sync)
  origen text not null check (origen in ('link', 'manager')),
  partida text not null check (partida ~ '^ML[0-9A-Fa-f]{8}:[0-9]{1,9}$'),
  club_pes int, club_nombre text check (char_length(club_nombre) <= 80),
  fecha_partida text check (char_length(fecha_partida) <= 10),
  version_aplicada bigint not null default 0,
  huella text check (huella ~ '^[0-9a-f]{64}$'),
  error text check (char_length(error) <= 200),
  primer_contacto timestamptz not null default now(),
  actualizado timestamptz not null default now(),
  unique (usuario, dispositivo, partida)
);
create table if not exists public.lm_pc_resultados (
  id bigint generated always as identity primary key,
  partida_id bigint not null references public.lm_pc_partidas (id) on delete cascade,
  usuario uuid not null references auth.users (id) on delete cascade,
  version bigint not null references public.lm_pc_cambios (version) on delete cascade,
  cambio uuid not null references public.pes_cambios (id) on delete cascade,
  estado text not null check (estado in ('aplicado', 'rechazado', 'pendiente', 'sin_efecto')),
  motivo text not null default '' check (char_length(motivo) <= 200),
  antes jsonb not null default '{}'::jsonb check (jsonb_typeof(antes) = 'object' and pg_column_size(antes) < 2000),
  despues jsonb not null default '{}'::jsonb check (jsonb_typeof(despues) = 'object' and pg_column_size(despues) < 2000),
  creado timestamptz not null default now()
);
create index if not exists lm_pc_resultados_ultimo_idx on public.lm_pc_resultados (partida_id, version, id desc);
create index if not exists lm_pc_resultados_usuario_idx on public.lm_pc_resultados (usuario, id desc);
create index if not exists lm_pc_resultados_cambio_idx on public.lm_pc_resultados (cambio);
alter table public.lm_pc_partidas enable row level security;
alter table public.lm_pc_resultados enable row level security;
revoke all on public.lm_pc_partidas, public.lm_pc_resultados from anon, authenticated;
grant select on public.lm_pc_partidas, public.lm_pc_resultados to authenticated;
drop policy if exists lm_pc_partidas_leer on public.lm_pc_partidas;
create policy lm_pc_partidas_leer on public.lm_pc_partidas for select to authenticated using (usuario = (select auth.uid()) or private.es_moderador());
drop policy if exists lm_pc_resultados_leer on public.lm_pc_resultados;
create policy lm_pc_resultados_leer on public.lm_pc_resultados for select to authenticated using (usuario = (select auth.uid()) or private.es_moderador());

/** Informe de un PC (lo llama la Edge Function «mercado» con service role). Formato phoenix-lm/aplicado-1 (PartidasLM.h). */
create or replace function public.lm_pc_informe(p_usuario uuid, p_dispositivo uuid, p_origen text, p_informe jsonb) returns jsonb
language plpgsql security definer set search_path = '' as $$
declare
  p jsonb; r jsonb; v_pid bigint; v_ver bigint; v_cambio uuid; v_tipo text; v_est text; v_ult text; v_res text;
  guardados int := 0; ignorados int := 0; partidas int := 0; es_link boolean;
  limpiar constant text := '[\u0001-\u001f\u007f]';
begin
  if p_usuario is null or p_dispositivo is null or p_origen is null or p_origen not in ('link', 'manager') or jsonb_typeof(p_informe) is distinct from 'object'
     or p_informe->>'formato' is distinct from 'phoenix-lm/aplicado-1' or jsonb_typeof(p_informe->'partidas') is distinct from 'array' then raise exception 'INFORME_NO_VALIDO'; end if;
  es_link := p_origen = 'link' and exists (select 1 from public.dispositivos_host where id = p_dispositivo and usuario = p_usuario);
  for p in select e from jsonb_array_elements(p_informe->'partidas') with ordinality as t(e, o) where o <= 20 loop
    if jsonb_typeof(p) <> 'object' or coalesce(p->>'partida', '') !~ '^ML[0-9A-Fa-f]{8}:[0-9]{1,9}$' then ignorados := ignorados + 1; continue; end if;
    insert into public.lm_pc_partidas as x (usuario, dispositivo, origen, partida, club_pes, club_nombre, fecha_partida, version_aplicada, huella, error)
    values (p_usuario, p_dispositivo, p_origen, p->>'partida',
            case when (p->>'club_pes') ~ '^[0-9]{1,9}$' then (p->>'club_pes')::int end,
            left(btrim(regexp_replace(coalesce(p->>'club_nombre', ''), limpiar, '', 'g')), 80),
            case when (p->>'fecha_partida') ~ '^[0-9]{4}-[0-9]{2}-[0-9]{2}$' then p->>'fecha_partida' end,
            case when (p->>'version_aplicada') ~ '^[0-9]{1,15}$' then (p->>'version_aplicada')::bigint else 0 end,
            case when (p->>'huella') ~ '^[0-9a-f]{64}$' then p->>'huella' end,
            nullif(left(btrim(regexp_replace(coalesce(p->>'error', ''), limpiar, '', 'g')), 200), ''))
    on conflict (usuario, dispositivo, partida) do update set origen = excluded.origen, club_pes = excluded.club_pes, club_nombre = excluded.club_nombre,
      fecha_partida = excluded.fecha_partida, version_aplicada = greatest(x.version_aplicada, excluded.version_aplicada),
      huella = coalesce(excluded.huella, x.huella), error = excluded.error, actualizado = now()
    returning id into v_pid;
    partidas := partidas + 1;
    if jsonb_typeof(p->'resultados') is distinct from 'array' then continue; end if;
    for r in select e from jsonb_array_elements(p->'resultados') with ordinality as t(e, o) where o <= 100 loop
      v_ver := case when jsonb_typeof(r) = 'object' and (r->>'version') ~ '^[0-9]{1,15}$' then (r->>'version')::bigint end;
      v_est := r->>'estado'; v_cambio := null; v_tipo := null;
      select l.cambio, l.tipo into v_cambio, v_tipo from public.lm_pc_cambios l where l.version = v_ver and (l.usuario is null or l.usuario = p_usuario);
      if v_cambio is null or v_est is null or v_est not in ('aplicado', 'rechazado', 'pendiente', 'sin_efecto') then ignorados := ignorados + 1; continue; end if;
      v_ult := null;
      select z.estado into v_ult from public.lm_pc_resultados z where z.partida_id = v_pid and z.version = v_ver order by z.id desc limit 1;
      if v_ult is not distinct from v_est then continue; end if;   -- mismo resultado de antes: no se repite
      insert into public.lm_pc_resultados (partida_id, usuario, version, cambio, estado, motivo, antes, despues)
      values (v_pid, p_usuario, v_ver, v_cambio, v_est,
              left(btrim(regexp_replace(coalesce(r->>'motivo', ''), limpiar, '', 'g')), 200),
              case when jsonb_typeof(r->'antes') = 'object' and pg_column_size(r->'antes') < 2000 then r->'antes' else '{}'::jsonb end,
              case when jsonb_typeof(r->'despues') = 'object' and pg_column_size(r->'despues') < 2000 then r->'despues' else '{}'::jsonb end);
      guardados := guardados + 1;
      -- Registro de usuarios de la 125 (solo PCs con Link: pes_eventos cuelga de dispositivos_host).
      if es_link then
        v_res := case when v_tipo = 'deshacer' and v_est = 'aplicado' then 'deshecho'
                      when v_est = 'aplicado' then 'aplicado' when v_est = 'sin_efecto' then 'ya_estaba'
                      when v_est = 'pendiente' then 'pendiente' else 'error' end;
        if not exists (select 1 from (select e.resultado from public.pes_eventos e where e.dispositivo = p_dispositivo and e.cambio = v_cambio
                                        and e.destino = 'lm' and e.tipo = 'resultado' order by e.id desc limit 1) u where u.resultado = v_res) then
          insert into public.pes_eventos (dispositivo, usuario, tipo, cambio, destino, resultado, motivo, cuando, detalle)
          values (p_dispositivo, p_usuario, 'resultado', v_cambio, 'lm', v_res,
                  left(btrim(regexp_replace(coalesce(r->>'motivo', ''), limpiar, '', 'g')), 200), now(), jsonb_build_object('partida', p->>'partida'));
        end if;
      end if;
    end loop;
  end loop;
  return jsonb_build_object('partidas', partidas, 'guardados', guardados, 'ignorados', ignorados);
end $$;

/** Partidas LM vistas por los PCs (para elegir a quién va un cambio). Staff ve todas; cada usuario las suyas. */
create or replace function public.lm_pc_partidas_lista() returns jsonb
language sql stable security definer set search_path = '' as $$
  select coalesce(jsonb_agg(jsonb_build_object('id', p.id, 'usuario', p.usuario,
           'usuario_nombre', coalesce(nullif(pf.nombre_display, ''), pf.username, 'Jugador'), 'partida', p.partida, 'club_pes', p.club_pes,
           'club_nombre', p.club_nombre, 'fecha_partida', p.fecha_partida, 'version_aplicada', p.version_aplicada, 'error', p.error,
           'actualizado', p.actualizado) order by p.actualizado desc), '[]'::jsonb)
  from public.lm_pc_partidas p left join public.perfiles pf on pf.id = p.usuario
  where p.usuario = (select auth.uid()) or private.es_moderador();
$$;

/** Historial de Liga Máster (resultado de cada cambio en cada partida, con el cambio). Staff todo; cada usuario lo suyo. */
create or replace function public.lm_pc_historial(p_usuario uuid default null, p_limite int default 100) returns jsonb
language sql stable security definer set search_path = '' as $$
  select coalesce(jsonb_agg(jsonb_build_object('id', r.id, 'creado', r.creado, 'estado', r.estado, 'motivo', r.motivo, 'antes', r.antes, 'despues', r.despues,
           'version', r.version, 'tipo_lm', l.tipo, 'partida', p.partida, 'club_nombre', p.club_nombre, 'usuario', r.usuario,
           'usuario_nombre', coalesce(nullif(pf.nombre_display, ''), pf.username, 'Jugador'),
           'cambio', jsonb_build_object('id', c.id, 'seq', c.seq, 'tipo', c.tipo, 'destino', c.destino, 'datos', c.datos, 'estado', c.estado))
         order by r.id desc), '[]'::jsonb)
  from (select * from public.lm_pc_resultados z
         where (z.usuario = (select auth.uid()) or private.es_moderador()) and (p_usuario is null or z.usuario = p_usuario)
         order by z.id desc limit least(greatest(coalesce(p_limite, 100), 1), 500)) r
  join public.lm_pc_partidas p on p.id = r.partida_id
  join public.lm_pc_cambios l on l.version = r.version
  join public.pes_cambios c on c.id = r.cambio
  left join public.perfiles pf on pf.id = r.usuario;
$$;

revoke all on function private.lm_euros(jsonb), private.lm_id_real(jsonb), private.lm_pc_traducir(public.pes_cambios), private.lm_pc_publicar(uuid),
  private.lm_pc_al_crear(), private.lm_pc_al_anular() from public;
revoke all on function public.lm_pc_tomar_pendientes(), public.lm_pc_partidas_lista(), public.lm_pc_historial(uuid, int) from public, anon;
grant execute on function public.lm_pc_tomar_pendientes(), public.lm_pc_partidas_lista(), public.lm_pc_historial(uuid, int) to authenticated;
-- Endurecimiento (18-oct): estas dos SOLO las ejecuta el servidor. Los permisos por defecto de Supabase dejaban EXECUTE a «authenticated»:
-- cualquier usuario con sesión habría podido leer los cambios de otro (p_usuario) o falsear informes de un PC.
revoke all on function public.lm_pc_cambios_desde(uuid, bigint, int), public.lm_pc_informe(uuid, uuid, text, jsonb) from public, anon, authenticated;
grant execute on function public.lm_pc_tomar_pendientes(), public.lm_pc_cambios_desde(uuid, bigint, int), public.lm_pc_informe(uuid, uuid, text, jsonb) to service_role;

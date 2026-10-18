-- 125 · WEB ↔ PES · AMISTOSOS + REGISTRO DE USUARIOS (sesión BASE, 17-oct-2026, con permiso de Fralex).
-- Contrato: docs/CONTRATO-WEB-PES.md (v1). Resumen:
--   · public.pes_cambios        → cada cambio oficial hecho en la web (un solo registro aunque vaya a base y a Liga Máster).
--   · public.pes_tipos_cambio   → catálogo de tipos (fichaje, stats, info, dinero, valor…): las migraciones 126 y 127 encienden los suyos.
--   · liga_traspasos.oficial    → la parte «base normal» de un fichaje viaja como lote del canal OFICIAL de traspasos (lo siguen todos los Link).
--   · public.pes_pcs / pes_eventos → registro de cada PC con Phoenix Link (versión, parche, base, último contacto) e historial de resultados.
-- Escribir: solo por funciones. Leer: staff todo, cada usuario lo suyo. Idempotente (se puede volver a pegar).

-- ─── 0) Ayudantes ────────────────────────────────────────────────────────────────────────────────────────────────────
create or replace function private.pes_es_admin() returns boolean
language sql stable security definer set search_path = '' as $$
  select exists (select 1 from public.perfiles p where p.id = (select auth.uid()) and p.rol = 'admin');
$$;
revoke all on function private.pes_es_admin() from public;
grant execute on function private.pes_es_admin() to authenticated, service_role;

/** sha256 en hex de un texto (bytes UTF-8). */
create or replace function private.pes_sha(p text) returns text
language sql immutable set search_path = '' as $$
  select encode(extensions.digest(convert_to(p, 'UTF8'), 'sha256'), 'hex');
$$;

/** Un booleano de un JSON (si falta o no es booleano, el valor por defecto). */
create or replace function private.pes_bool(p jsonb, p_def boolean) returns boolean
language sql immutable set search_path = '' as $$
  select case when jsonb_typeof(p) = 'boolean' then p::text::boolean else p_def end;
$$;

/** Id «sintético» para un nombre sin id de PES conocido: 90.000.000 + (28 bits del sha256 del nombre en minúsculas) mod 9.999.999.
    Ids ≥ 90.000.000 = «no es un id real, aplícalo por nombre» (contrato §2). */
create or replace function public.pes_id_sintetico(p_nombre text) returns int
language sql immutable security definer set search_path = '' as $$
  select 90000000 + ((('x' || substr(private.pes_sha(lower(btrim(coalesce(p_nombre, '')))), 1, 7))::bit(28)::int) % 9999999);
$$;
grant execute on function public.pes_id_sintetico(text) to authenticated, service_role;

/** La misma huella que Link (huellaDeCambios): una línea «jugador_id|desde_id|hasta_id|jugador|desde|hasta\n» por cambio. */
create or replace function private.pes_huella_lote(p_cambios jsonb) returns text
language sql immutable set search_path = '' as $$
  select private.pes_sha(coalesce(string_agg(
    (c->>'jugador_id') || '|' || (c->>'desde_id') || '|' || (c->>'hasta_id') || '|' || (c->>'jugador') || '|' || (c->>'desde') || '|' || (c->>'hasta') || E'\n',
    '' order by o), ''))
  from jsonb_array_elements(p_cambios) with ordinality as t(c, o);
$$;

/** Firma de integridad de un cambio (contrato §1). */
create or replace function private.pes_firma(p_id uuid, p_version int, p_tipo text, p_destino text, p_datos jsonb) returns text
language sql immutable set search_path = '' as $$
  select private.pes_sha('pes-cambio|v' || p_version || '|' || p_id || '|' || p_tipo || '|' || p_destino || '|' || p_datos::text);
$$;

-- ─── 1) Catálogo de tipos ───────────────────────────────────────────────────────────────────────────────────────────
create table if not exists public.pes_tipos_cambio (
  tipo text primary key check (tipo ~ '^[a-z_]{3,30}$'),
  etiqueta text not null check (char_length(etiqueta) between 1 and 60),
  destinos text[] not null check (destinos <@ array['base', 'lm', 'ambos'] and cardinality(destinos) between 1 and 3),
  motor text not null default '' check (char_length(motor) <= 60),
  activo boolean not null default false,
  creado timestamptz not null default now()
);
insert into public.pes_tipos_cambio (tipo, etiqueta, destinos, motor, activo) values
  ('fichaje', 'Fichaje (jugador → equipo)', array['base', 'lm', 'ambos'], 'base: canal oficial (125) · lm: motor 127', true)
on conflict (tipo) do update set etiqueta = excluded.etiqueta, destinos = excluded.destinos, motor = excluded.motor, activo = true;
-- Reservados para 126 y 127: se crean apagados y NO se pisan si su migración ya corrió antes.
insert into public.pes_tipos_cambio (tipo, etiqueta, destinos, motor, activo) values
  ('stats', 'Estadísticas del jugador', array['base', 'lm', 'ambos'], 'motor 126', false),
  ('info', 'Información del jugador', array['base', 'lm', 'ambos'], 'motor 126', false),
  ('dinero', 'Dinero de un club (Liga Máster)', array['lm'], 'motor 127', false),
  ('valor', 'Valor de un jugador (Liga Máster)', array['lm'], 'motor 127', false)
on conflict (tipo) do nothing;
alter table public.pes_tipos_cambio enable row level security;
revoke all on public.pes_tipos_cambio from anon, authenticated;
grant select on public.pes_tipos_cambio to authenticated;
drop policy if exists pes_tipos_leer on public.pes_tipos_cambio;
create policy pes_tipos_leer on public.pes_tipos_cambio for select to authenticated using (true);

-- ─── 2) Cambios oficiales ───────────────────────────────────────────────────────────────────────────────────────────
create table if not exists public.pes_cambios (
  id uuid primary key default gen_random_uuid(),
  seq bigint generated always as identity unique,
  version int not null default 1 check (version between 1 and 99),
  tipo text not null references public.pes_tipos_cambio (tipo),
  destino text not null check (destino in ('base', 'lm', 'ambos')),
  datos jsonb not null check (jsonb_typeof(datos) = 'object' and pg_column_size(datos) < 16000),
  autor uuid references public.perfiles (id) on delete set null,
  autor_nombre text not null default '' check (char_length(autor_nombre) <= 60),
  creado timestamptz not null default now(),
  firma text not null check (firma ~ '^[0-9a-f]{64}$'),
  estado text not null default 'activo' check (estado in ('activo', 'anulado')),
  anulado_en timestamptz,
  anulado_por uuid references public.perfiles (id) on delete set null,
  motivo_anulacion text check (char_length(motivo_anulacion) <= 300),
  estado_base text not null check (estado_base in ('no_aplica', 'pendiente', 'publicado', 'error')),
  base_lote text check (base_lote ~ '^[0-9a-f]{24}$'),
  base_seq bigint,
  base_ref text check (char_length(base_ref) <= 120),
  estado_lm text not null check (estado_lm in ('no_aplica', 'pendiente', 'tomado', 'publicado', 'error')),
  lm_ref text check (char_length(lm_ref) <= 120),
  nota text check (char_length(nota) <= 300),
  actualizado timestamptz not null default now()
);
create index if not exists pes_cambios_lm_pend_idx on public.pes_cambios (seq) where estado = 'activo' and estado_lm = 'pendiente';
create index if not exists pes_cambios_base_pend_idx on public.pes_cambios (seq) where estado = 'activo' and estado_base = 'pendiente';
alter table public.pes_cambios enable row level security;
revoke all on public.pes_cambios from anon, authenticated;
grant select on public.pes_cambios to authenticated;
drop policy if exists pes_cambios_staff on public.pes_cambios;
create policy pes_cambios_staff on public.pes_cambios for select to authenticated using (private.es_moderador());

-- El canal oficial vive en la misma tabla de traspasos (mismo formato de lote que ya entiende Link).
alter table public.liga_traspasos add column if not exists oficial boolean not null default false;
alter table public.liga_traspasos add column if not exists cambio uuid references public.pes_cambios (id) on delete set null;
create index if not exists liga_traspasos_oficial_seq_idx on public.liga_traspasos (seq) where oficial;

-- ─── 3) Registro de PCs ─────────────────────────────────────────────────────────────────────────────────────────────
create table if not exists public.pes_pcs (
  dispositivo uuid primary key references public.dispositivos_host (id) on delete cascade,
  usuario uuid not null references public.perfiles (id) on delete cascade,
  link_version text not null default '' check (char_length(link_version) <= 20),
  link_build int not null default 0,
  parche text not null default '' check (char_length(parche) <= 60),
  base_huella text not null default '' check (base_huella = '' or base_huella ~ '^[0-9a-f]{6,64}$'),
  juego boolean not null default false,
  pes_abierto boolean not null default false,
  oficial boolean not null default true,
  recibir boolean not null default false,
  publicar boolean not null default false,
  informes int not null default 0,
  aplicados int not null default 0,
  saltados int not null default 0,
  errores int not null default 0,
  primer_contacto timestamptz not null default now(),
  ultimo_contacto timestamptz not null default now()
);
create index if not exists pes_pcs_usuario_idx on public.pes_pcs (usuario);
create index if not exists pes_pcs_contacto_idx on public.pes_pcs (ultimo_contacto desc);

create table if not exists public.pes_eventos (
  id bigint generated always as identity primary key,
  dispositivo uuid not null references public.dispositivos_host (id) on delete cascade,
  usuario uuid not null references public.perfiles (id) on delete cascade,
  tipo text not null check (tipo in ('contacto', 'resultado')),
  cambio uuid references public.pes_cambios (id) on delete cascade,
  destino text check (destino in ('base', 'lm')),
  resultado text check (resultado in ('aplicado', 'ya_estaba', 'parcial', 'saltado', 'error', 'deshecho', 'pendiente', 'por_aprobar', 'reemplazado')),
  motivo text not null default '' check (char_length(motivo) <= 200),
  jugadores int not null default 0 check (jugadores between 0 and 5000),
  cuando timestamptz,
  detalle jsonb not null default '{}'::jsonb check (jsonb_typeof(detalle) = 'object' and pg_column_size(detalle) < 4000),
  creado timestamptz not null default now(),
  check ((tipo = 'resultado') = (cambio is not null and destino is not null and resultado is not null))
);
create index if not exists pes_eventos_ultimo_idx on public.pes_eventos (dispositivo, cambio, destino, id desc) where tipo = 'resultado';
create index if not exists pes_eventos_usuario_idx on public.pes_eventos (usuario, id desc);
create index if not exists pes_eventos_cambio_idx on public.pes_eventos (cambio) where cambio is not null;

alter table public.pes_pcs enable row level security;
alter table public.pes_eventos enable row level security;
revoke all on public.pes_pcs from anon, authenticated;
revoke all on public.pes_eventos from anon, authenticated;
grant select on public.pes_pcs, public.pes_eventos to authenticated;
drop policy if exists pes_pcs_leer on public.pes_pcs;
create policy pes_pcs_leer on public.pes_pcs for select to authenticated using (usuario = (select auth.uid()) or private.es_moderador());
drop policy if exists pes_eventos_leer on public.pes_eventos;
create policy pes_eventos_leer on public.pes_eventos for select to authenticated using (usuario = (select auth.uid()) or private.es_moderador());

-- ─── 4) Crear / anular / marcar un cambio ───────────────────────────────────────────────────────────────────────────
/** Valida y completa los datos de un fichaje (contrato §2). Nombres ≤ 48 BYTES (Link los corta por bytes al leer: si no, la huella no cuadra). */
create or replace function private.pes_fichaje_normalizar(p jsonb) returns jsonb
language plpgsql immutable set search_path = '' as $$
declare
  j text; d text; h text; jid bigint; did bigint; hid bigint; lm jsonb;
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
  lm := case when jsonb_typeof(p->'lm') = 'object' then jsonb_strip_nulls(jsonb_build_object(
          'jugador_id', case when (p->'lm'->>'jugador_id') ~ '^[0-9]{1,12}$' then (p->'lm'->>'jugador_id')::bigint end,
          'club_id', case when (p->'lm'->>'club_id') ~ '^[0-9]{1,12}$' then (p->'lm'->>'club_id')::bigint end)) end;
  return jsonb_strip_nulls(jsonb_build_object('jugador_id', jid, 'jugador', j, 'desde_id', did, 'desde', d, 'hasta_id', hid, 'hasta', h,
    'lm', case when lm = '{}'::jsonb then null else lm end));
end $$;

create or replace function public.pes_cambio_crear(p_tipo text, p_destino text, p_datos jsonb, p_nota text default null)
returns jsonb language plpgsql security definer set search_path = '' as $$
declare
  yo uuid := auth.uid();
  t public.pes_tipos_cambio;
  v_id uuid := gen_random_uuid();
  v_datos jsonb := p_datos;
  v_seq bigint; v_lote text; v_cambios jsonb; v_base_seq bigint;
  v_eb text; v_el text; v_nombre text;
begin
  if yo is null or not private.pes_es_admin() then raise exception 'NO_AUTORIZADO'; end if;
  select * into t from public.pes_tipos_cambio where tipo = p_tipo;
  if not found or not t.activo then raise exception 'TIPO_NO_VALIDO'; end if;
  if p_destino is null or not (p_destino = any (t.destinos)) then raise exception 'DESTINO_NO_PERMITIDO'; end if;
  if p_datos is null or jsonb_typeof(p_datos) <> 'object' or pg_column_size(p_datos) >= 16000 then raise exception 'DATOS_NO_VALIDOS:datos'; end if;
  if p_tipo = 'fichaje' then v_datos := private.pes_fichaje_normalizar(p_datos); end if;
  v_eb := case when p_destino in ('base', 'ambos') then 'pendiente' else 'no_aplica' end;
  v_el := case when p_destino in ('lm', 'ambos') then 'pendiente' else 'no_aplica' end;
  select left(coalesce(nullif(nombre_display, ''), 'Staff'), 60) into v_nombre from public.perfiles where id = yo;

  insert into public.pes_cambios (id, version, tipo, destino, datos, autor, autor_nombre, firma, estado_base, estado_lm, nota)
  values (v_id, 1, p_tipo, p_destino, v_datos, yo, coalesce(v_nombre, 'Staff'), private.pes_firma(v_id, 1, p_tipo, p_destino, v_datos),
          v_eb, v_el, nullif(left(btrim(coalesce(p_nota, '')), 300), ''))
  returning seq into v_seq;

  -- Parte «base normal» de un fichaje: un lote del canal oficial de traspasos (formato de Link, aplicado por NOMBRES en cada PC).
  if p_tipo = 'fichaje' and v_eb = 'pendiente' then
    v_cambios := jsonb_build_array(jsonb_build_object(
      'jugador_id', (v_datos->>'jugador_id')::bigint, 'jugador', v_datos->>'jugador',
      'desde_id', (v_datos->>'desde_id')::bigint, 'desde', coalesce(v_datos->>'desde', ''),
      'hasta_id', (v_datos->>'hasta_id')::bigint, 'hasta', v_datos->>'hasta'));
    v_lote := left(private.pes_sha('oficial|' || v_id), 24);
    insert into public.liga_traspasos (anfitrion, lote, huella, creado, autor, parche, base_huella, cambios, oficial, cambio)
    values (yo, v_lote, private.pes_huella_lote(v_cambios), date_trunc('second', now()), 'Phoenix (oficial)', '', '', v_cambios, true, v_id)
    returning seq into v_base_seq;
    update public.pes_cambios set estado_base = 'publicado', base_lote = v_lote, base_seq = v_base_seq, actualizado = now() where id = v_id;
    v_eb := 'publicado';
  end if;
  return jsonb_build_object('id', v_id, 'seq', v_seq, 'estado_base', v_eb, 'estado_lm', v_el, 'base_seq', v_base_seq, 'datos', v_datos);
end $$;

create or replace function public.pes_cambio_anular(p_id uuid, p_motivo text default null)
returns jsonb language plpgsql security definer set search_path = '' as $$
declare v_borrados int;
begin
  if auth.uid() is null or not private.pes_es_admin() then raise exception 'NO_AUTORIZADO'; end if;
  update public.pes_cambios set estado = 'anulado', anulado_en = now(), anulado_por = auth.uid(),
         motivo_anulacion = nullif(left(btrim(coalesce(p_motivo, '')), 300), ''), actualizado = now()
   where id = p_id and estado = 'activo';
  if not found then raise exception 'CAMBIO_NO_ENCONTRADO'; end if;
  -- Los PCs que aún no lo bajaron ya no lo reciben. Lo ya aplicado se deshace con un cambio nuevo en sentido contrario.
  delete from public.liga_traspasos where cambio = p_id and oficial;
  get diagnostics v_borrados = row_count;
  return jsonb_build_object('id', p_id, 'estado', 'anulado', 'lotes_retirados', v_borrados);
end $$;

/** Un motor (126 stats/info en «base», 127 Liga Máster en «lm») marca su parte. Solo admin o el servidor (service role / SQL Editor). */
create or replace function public.pes_cambio_marcar(p_id uuid, p_lado text, p_estado text, p_ref text default null)
returns jsonb language plpgsql security definer set search_path = '' as $$
begin
  if not (private.pes_es_admin() or (auth.uid() is null and coalesce(auth.role(), '') in ('service_role', ''))) then raise exception 'NO_AUTORIZADO'; end if;
  if p_lado = 'lm' then
    if p_estado not in ('pendiente', 'tomado', 'publicado', 'error') then raise exception 'ESTADO_NO_VALIDO'; end if;
    update public.pes_cambios set estado_lm = p_estado, lm_ref = coalesce(left(p_ref, 120), lm_ref), actualizado = now()
     where id = p_id and estado_lm <> 'no_aplica';
  elsif p_lado = 'base' then
    if p_estado not in ('pendiente', 'publicado', 'error') then raise exception 'ESTADO_NO_VALIDO'; end if;
    update public.pes_cambios set estado_base = p_estado, base_ref = coalesce(left(p_ref, 120), base_ref), actualizado = now()
     where id = p_id and estado_base <> 'no_aplica';
  else raise exception 'LADO_NO_VALIDO';
  end if;
  if not found then raise exception 'CAMBIO_NO_ENCONTRADO'; end if;
  return jsonb_build_object('id', p_id, 'lado', p_lado, 'estado', p_estado);
end $$;

-- ─── 5) Informe de un PC (lo llama la Edge Function «traspasos» con service role) ──────────────────────────────────
create or replace function public.pes_registrar_informe(p_dispositivo uuid, p_usuario uuid, p_informe jsonb)
returns jsonb language plpgsql security definer set search_path = '' as $$
declare
  ant public.pes_pcs; nuevo boolean;
  v_ver text; v_build int; v_parche text; v_base text;
  r jsonb; v_cambio uuid; v_dest text; v_res text; v_ult text; v_cuando timestamptz;
  guardados int := 0; ignorados int := 0; n_ap int := 0; n_sa int := 0; n_er int := 0;
  limpiar constant text := '[\u0001-\u001f\u007f]';
begin
  if p_dispositivo is null or p_usuario is null or p_informe is null or jsonb_typeof(p_informe) <> 'object' then raise exception 'INFORME_NO_VALIDO'; end if;
  if not exists (select 1 from public.dispositivos_host where id = p_dispositivo and usuario = p_usuario) then raise exception 'DISPOSITIVO_NO_VALIDO'; end if;
  v_ver := left(regexp_replace(coalesce(p_informe->>'link_version', ''), '[^0-9A-Za-z._-]', '', 'g'), 20);
  v_build := case when (p_informe->>'link_build') ~ '^[0-9]{1,9}$' then (p_informe->>'link_build')::int else 0 end;
  v_parche := left(btrim(regexp_replace(coalesce(p_informe->>'parche', ''), limpiar, '', 'g')), 60);
  v_base := lower(coalesce(p_informe->>'base_huella', ''));
  if v_base !~ '^([0-9a-f]{6,64})?$' then v_base := ''; end if;

  select * into ant from public.pes_pcs where dispositivo = p_dispositivo for update;
  nuevo := not found;
  insert into public.pes_pcs as p (dispositivo, usuario, link_version, link_build, parche, base_huella, juego, pes_abierto, oficial, recibir, publicar, informes)
  values (p_dispositivo, p_usuario, v_ver, v_build, v_parche, v_base,
          private.pes_bool(p_informe->'juego', false), private.pes_bool(p_informe->'pes_abierto', false),
          private.pes_bool(p_informe->'oficial', true), private.pes_bool(p_informe->'recibir', false),
          private.pes_bool(p_informe->'publicar', false), 1)
  on conflict (dispositivo) do update set usuario = excluded.usuario, link_version = excluded.link_version, link_build = excluded.link_build,
    parche = excluded.parche, base_huella = excluded.base_huella, juego = excluded.juego, pes_abierto = excluded.pes_abierto,
    oficial = excluded.oficial, recibir = excluded.recibir, publicar = excluded.publicar, informes = p.informes + 1, ultimo_contacto = now();

  if nuevo or ant.link_version is distinct from v_ver or ant.parche is distinct from v_parche or ant.base_huella is distinct from v_base then
    insert into public.pes_eventos (dispositivo, usuario, tipo, detalle)
    values (p_dispositivo, p_usuario, 'contacto', jsonb_strip_nulls(jsonb_build_object('link_version', v_ver, 'link_build', v_build, 'parche', v_parche, 'base_huella', v_base,
      'antes', case when nuevo then null else jsonb_build_object('link_version', ant.link_version, 'parche', ant.parche, 'base_huella', ant.base_huella) end)));
  end if;

  if jsonb_typeof(p_informe->'resultados') = 'array' then
    for r in select e from jsonb_array_elements(p_informe->'resultados') with ordinality as t(e, o) where o <= 50 loop
      v_cambio := case when jsonb_typeof(r) = 'object' and (r->>'cambio_id') ~* '^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$' then (r->>'cambio_id')::uuid end;
      v_dest := r->>'destino'; v_res := r->>'resultado';
      if v_cambio is null or v_dest is null or v_dest not in ('base', 'lm') or v_res is null
         or v_res not in ('aplicado', 'ya_estaba', 'parcial', 'saltado', 'error', 'deshecho', 'pendiente', 'por_aprobar', 'reemplazado')
         or not exists (select 1 from public.pes_cambios where id = v_cambio) then
        ignorados := ignorados + 1; continue;
      end if;
      v_ult := null;
      select e.resultado into v_ult from public.pes_eventos e
       where e.dispositivo = p_dispositivo and e.cambio = v_cambio and e.destino = v_dest and e.tipo = 'resultado' order by e.id desc limit 1;
      if v_ult is not distinct from v_res then continue; end if;   -- mismo resultado de antes: no se repite en el historial
      begin v_cuando := (r->>'cuando')::timestamptz; exception when others then v_cuando := null; end;
      if v_cuando is not null and (v_cuando > now() + interval '1 day' or v_cuando < now() - interval '1 year') then v_cuando := null; end if;
      insert into public.pes_eventos (dispositivo, usuario, tipo, cambio, destino, resultado, motivo, jugadores, cuando)
      values (p_dispositivo, p_usuario, 'resultado', v_cambio, v_dest, v_res,
              left(btrim(regexp_replace(coalesce(r->>'motivo', ''), limpiar, '', 'g')), 200),
              case when (r->>'jugadores') ~ '^[0-9]{1,4}$' then least((r->>'jugadores')::int, 5000) else 0 end, v_cuando);
      guardados := guardados + 1;
      if v_res in ('aplicado', 'ya_estaba') then n_ap := n_ap + 1;
      elsif v_res in ('saltado', 'parcial') then n_sa := n_sa + 1;
      elsif v_res = 'error' then n_er := n_er + 1; end if;
    end loop;
  end if;
  if guardados > 0 then
    update public.pes_pcs set aplicados = aplicados + n_ap, saltados = saltados + n_sa, errores = errores + n_er where dispositivo = p_dispositivo;
  end if;
  return jsonb_build_object('guardados', guardados, 'ignorados', ignorados);
end $$;

-- ─── 6) Lecturas para las páginas ───────────────────────────────────────────────────────────────────────────────────
/** Historial de cambios con el recuento del ÚLTIMO resultado de cada PC por destino (para /cambios-oficiales/). Solo staff. */
create or replace function public.pes_cambios_historial(p_limite int default 50, p_antes bigint default null)
returns jsonb language plpgsql stable security definer set search_path = '' as $$
begin
  if not private.es_moderador() then raise exception 'NO_AUTORIZADO'; end if;
  return coalesce((
    select jsonb_agg(x order by (x->>'seq')::bigint desc) from (
      select (to_jsonb(c) - 'firma') || jsonb_build_object(
        'resultados', coalesce((
          select jsonb_object_agg(u.destino || ':' || u.resultado, u.n) from (
            select ult.destino, ult.resultado, count(*) as n from (
              select distinct on (e.dispositivo, e.destino) e.destino, e.resultado
                from public.pes_eventos e where e.cambio = c.id and e.tipo = 'resultado'
               order by e.dispositivo, e.destino, e.id desc) ult
            group by ult.destino, ult.resultado) u), '{}'::jsonb)) as x
      from public.pes_cambios c
      where p_antes is null or c.seq < p_antes
      order by c.seq desc
      limit least(greatest(coalesce(p_limite, 50), 1), 200)) s), '[]'::jsonb);
end $$;

/** PCs con su usuario y nombre de PC (para /usuarios-pes/). Staff ve todas; un usuario normal, las suyas. */
create or replace function public.pes_pcs_lista()
returns jsonb language sql stable security definer set search_path = '' as $$
  select coalesce(jsonb_agg(to_jsonb(p) || jsonb_build_object(
           'usuario_nombre', coalesce(nullif(pf.nombre_display, ''), pf.username, 'Jugador'), 'username', pf.username,
           'pc_nombre', d.nombre, 'revocado', d.revocado is not null) order by p.ultimo_contacto desc), '[]'::jsonb)
  from public.pes_pcs p
  join public.perfiles pf on pf.id = p.usuario
  join public.dispositivos_host d on d.id = p.dispositivo
  where p.usuario = (select auth.uid()) or private.es_moderador();
$$;

/** Historial de UNA PC (eventos + cambio al que se refieren). Staff o el dueño. */
create or replace function public.pes_pc_historial(p_dispositivo uuid, p_limite int default 100)
returns jsonb language sql stable security definer set search_path = '' as $$
  select coalesce(jsonb_agg(jsonb_build_object('id', e.id, 'tipo', e.tipo, 'creado', e.creado, 'cuando', e.cuando, 'destino', e.destino,
           'resultado', e.resultado, 'motivo', e.motivo, 'jugadores', e.jugadores, 'detalle', e.detalle,
           'cambio', case when c.id is null then null else jsonb_build_object('id', c.id, 'seq', c.seq, 'tipo', c.tipo, 'destino', c.destino, 'datos', c.datos, 'estado', c.estado) end)
         order by e.id desc), '[]'::jsonb)
  from (select * from public.pes_eventos where dispositivo = p_dispositivo order by id desc limit least(greatest(coalesce(p_limite, 100), 1), 500)) e
  left join public.pes_cambios c on c.id = e.cambio
  where exists (select 1 from public.pes_pcs p where p.dispositivo = p_dispositivo and (p.usuario = (select auth.uid()) or private.es_moderador()));
$$;

revoke all on function public.pes_cambio_crear(text, text, jsonb, text), public.pes_cambio_anular(uuid, text),
  public.pes_cambio_marcar(uuid, text, text, text), public.pes_registrar_informe(uuid, uuid, jsonb),
  public.pes_cambios_historial(int, bigint), public.pes_pcs_lista(), public.pes_pc_historial(uuid, int) from public, anon;
grant execute on function public.pes_cambio_crear(text, text, jsonb, text), public.pes_cambio_anular(uuid, text),
  public.pes_cambio_marcar(uuid, text, text, text), public.pes_cambios_historial(int, bigint), public.pes_pcs_lista(),
  public.pes_pc_historial(uuid, int) to authenticated;
grant execute on function public.pes_cambio_marcar(uuid, text, text, text), public.pes_registrar_informe(uuid, uuid, jsonb) to service_role;
revoke all on function private.pes_fichaje_normalizar(jsonb), private.pes_huella_lote(jsonb), private.pes_firma(uuid, int, text, text, jsonb), private.pes_sha(text), private.pes_bool(jsonb, boolean) from public;

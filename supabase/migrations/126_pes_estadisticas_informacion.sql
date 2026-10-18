-- 126 · WEB ↔ PES · ESTADÍSTICAS E INFORMACIÓN de jugadores (sesión web-pes-estadisticas, 17-oct-2026, con permiso de Fralex).
-- Va DESPUÉS de la 125 (usa pes_cambios, pes_tipos_cambio, pes_cambio_crear, pes_cambio_anular). Contrato: docs/CONTRATO-WEB-PES.md §2 «stats» e «info».
--   · public.pes_fichas_campos  → catálogo de campos editables (mismas claves y rangos que Phoenix Link, link/Fichas.cpp).
--   · Enciende los tipos «stats» e «info» (destinos base, lm, ambos).
--   · Trigger: valida los datos de esos tipos al crear el cambio y deja su parte «base» como publicada (los PCs la leen en GET /v1/cambios).
--   · pes_fichas_vigentes / pes_fichas_deshacer / pes_fichas_historial: valor vigente, deshacer y historial (quién, cuándo, antes → después).
-- Escribir: solo por funciones. Leer: staff. Idempotente (se puede volver a pegar).

-- ─── 1) Catálogo de campos ──────────────────────────────────────────────────────────────────────────────────────────
create table if not exists public.pes_fichas_campos (
  clave text primary key check (clave ~ '^[a-z_]{3,30}$'),
  tipo text not null check (tipo in ('stats', 'info')),
  grupo text not null check (grupo in ('campo', 'portero', 'pie_malo', 'estado', 'posicion', 'basico')),
  texto text not null check (char_length(texto) between 1 and 60),
  minimo int not null,
  maximo int not null,
  orden int not null default 0,
  check (minimo <= maximo)
);
insert into public.pes_fichas_campos (clave, tipo, grupo, texto, minimo, maximo, orden) values
  ('ataque', 'stats', 'campo', 'Actitud ofensiva', 40, 99, 1),
  ('control', 'stats', 'campo', 'Control del balón', 40, 99, 2),
  ('regate', 'stats', 'campo', 'Regate', 40, 99, 3),
  ('regate_ajustado', 'stats', 'campo', 'Conservación del balón', 40, 99, 4),
  ('pase_raso', 'stats', 'campo', 'Pase raso', 40, 99, 5),
  ('pase_bombeado', 'stats', 'campo', 'Pase bombeado', 40, 99, 6),
  ('finalizacion', 'stats', 'campo', 'Finalización', 40, 99, 7),
  ('cabezazo', 'stats', 'campo', 'Cabeceo', 40, 99, 8),
  ('balon_parado', 'stats', 'campo', 'Balón parado', 40, 99, 9),
  ('efecto', 'stats', 'campo', 'Efecto', 40, 99, 10),
  ('velocidad', 'stats', 'campo', 'Velocidad', 40, 99, 11),
  ('aceleracion', 'stats', 'campo', 'Aceleración', 40, 99, 12),
  ('equilibrio', 'stats', 'campo', 'Equilibrio', 40, 99, 13),
  ('contacto_fisico', 'stats', 'campo', 'Contacto físico', 40, 99, 14),
  ('salto', 'stats', 'campo', 'Salto', 40, 99, 15),
  ('resistencia', 'stats', 'campo', 'Resistencia', 40, 99, 16),
  ('defensa', 'stats', 'campo', 'Actitud defensiva', 40, 99, 17),
  ('recuperacion', 'stats', 'campo', 'Recuperación de balón', 40, 99, 18),
  ('agresividad', 'stats', 'campo', 'Agresividad', 40, 99, 19),
  ('potencia_tiro', 'stats', 'campo', 'Potencia de tiro', 40, 99, 20),
  ('pt_despejar', 'stats', 'portero', 'Despejar (portero)', 40, 99, 21),
  ('pt_cobertura', 'stats', 'portero', 'Cobertura (portero)', 40, 99, 22),
  ('pt_reflejos', 'stats', 'portero', 'Reflejos (portero)', 40, 99, 23),
  ('pt_actitud', 'stats', 'portero', 'Actitud de portero', 40, 99, 24),
  ('pt_atajar', 'stats', 'portero', 'Atajar (portero)', 40, 99, 25),
  ('pie_malo_uso', 'info', 'pie_malo', 'Uso del pie malo', 1, 4, 30),
  ('pie_malo_precision', 'info', 'pie_malo', 'Precisión del pie malo', 1, 4, 31),
  ('forma', 'info', 'estado', 'Forma (regularidad)', 1, 8, 32),
  ('resistencia_lesiones', 'info', 'estado', 'Resistencia a lesiones', 1, 3, 33),
  ('pos_pt', 'info', 'posicion', 'Posición PT', 0, 2, 40),
  ('pos_dfc', 'info', 'posicion', 'Posición DFC', 0, 2, 41),
  ('pos_li', 'info', 'posicion', 'Posición LI', 0, 2, 42),
  ('pos_ld', 'info', 'posicion', 'Posición LD', 0, 2, 43),
  ('pos_mcd', 'info', 'posicion', 'Posición MCD', 0, 2, 44),
  ('pos_mc', 'info', 'posicion', 'Posición MC', 0, 2, 45),
  ('pos_mi', 'info', 'posicion', 'Posición MI', 0, 2, 46),
  ('pos_md', 'info', 'posicion', 'Posición MD', 0, 2, 47),
  ('pos_mo', 'info', 'posicion', 'Posición MO', 0, 2, 48),
  ('pos_ei', 'info', 'posicion', 'Posición EI', 0, 2, 49),
  ('pos_ed', 'info', 'posicion', 'Posición ED', 0, 2, 50),
  ('pos_sd', 'info', 'posicion', 'Posición SD', 0, 2, 51),
  ('pos_dc', 'info', 'posicion', 'Posición DC', 0, 2, 52),
  ('altura', 'info', 'basico', 'Altura (cm)', 150, 210, 60),
  ('peso', 'info', 'basico', 'Peso (kg)', 45, 110, 61),
  ('edad', 'info', 'basico', 'Edad', 15, 45, 62),
  ('posicion_registrada', 'info', 'basico', 'Posición registrada', 0, 12, 63)
on conflict (clave) do update set tipo = excluded.tipo, grupo = excluded.grupo, texto = excluded.texto,
  minimo = excluded.minimo, maximo = excluded.maximo, orden = excluded.orden;
alter table public.pes_fichas_campos enable row level security;
revoke all on public.pes_fichas_campos from anon, authenticated;
grant select on public.pes_fichas_campos to authenticated;
drop policy if exists pes_fichas_campos_leer on public.pes_fichas_campos;
create policy pes_fichas_campos_leer on public.pes_fichas_campos for select to authenticated using (true);

-- ─── 2) Encender los tipos ──────────────────────────────────────────────────────────────────────────────────────────
insert into public.pes_tipos_cambio (tipo, etiqueta, destinos, motor, activo) values
  ('stats', 'Estadísticas del jugador', array['base', 'lm', 'ambos'], 'base: Player.bin de Phoenix-DB (Link, 126) · lm: motor 127', true),
  ('info', 'Información del jugador', array['base', 'lm', 'ambos'], 'base: Player.bin de Phoenix-DB (Link, 126) · lm: motor 127', true)
on conflict (tipo) do update set etiqueta = excluded.etiqueta, destinos = excluded.destinos, motor = excluded.motor, activo = true;

-- ─── 3) Validar los datos (contrato §2 «stats» / «info») ────────────────────────────────────────────────────────────
/** ¿Dos cambios hablan del mismo jugador? Por id real (< 90.000.000) o por nombre (sin mayúsculas ni espacios de más). */
create or replace function private.pes_fichas_mismo(a jsonb, b jsonb) returns boolean
language sql immutable set search_path = '' as $$
  select (coalesce((a->>'jugador_id')::bigint, 0) between 1 and 89999999 and (a->>'jugador_id')::bigint = coalesce((b->>'jugador_id')::bigint, 0))
      or lower(btrim(coalesce(a->>'jugador', ''))) = lower(btrim(coalesce(b->>'jugador', '')));
$$;

/** ¿Los destinos se tocan? (base/ambos o lm/ambos). */
create or replace function private.pes_destinos_cruzan(a text, b text) returns boolean
language sql immutable set search_path = '' as $$
  select a = b or a = 'ambos' or b = 'ambos';
$$;

create or replace function private.pes_fichas_validar(p_tipo text, p jsonb) returns void
language plpgsql stable set search_path = '' as $$
declare
  k text; v jsonb; c public.pes_fichas_campos; n int := 0;
  limpiar constant text := '[\u0001-\u001f\u007f]';
  j text;
begin
  if p is null or jsonb_typeof(p) <> 'object' then raise exception 'DATOS_NO_VALIDOS:datos'; end if;
  for k in select jsonb_object_keys(p) loop
    if k not in ('jugador_id', 'jugador', 'valores', 'antes', 'deshace', 'lm') then raise exception 'DATOS_NO_VALIDOS:%', k; end if;
  end loop;
  j := coalesce(p->>'jugador', '');
  if btrim(j) = '' or octet_length(j) > 48 or j <> btrim(regexp_replace(j, limpiar, '', 'g')) then raise exception 'DATOS_NO_VALIDOS:jugador'; end if;
  if p ? 'jugador_id' and not (jsonb_typeof(p->'jugador_id') = 'number' and (p->>'jugador_id') ~ '^[0-9]{1,8}$' and (p->>'jugador_id')::bigint >= 1) then
    raise exception 'DATOS_NO_VALIDOS:jugador_id';
  end if;
  if jsonb_typeof(p->'valores') is distinct from 'object' then raise exception 'DATOS_NO_VALIDOS:valores'; end if;
  for k, v in select * from jsonb_each(p->'valores') loop
    select * into c from public.pes_fichas_campos where clave = k;
    if not found or c.tipo <> p_tipo then raise exception 'DATOS_NO_VALIDOS:campo:%', k; end if;
    -- null = «vuelve al valor de la base» (lo usa el deshacer)
    if jsonb_typeof(v) <> 'null' and not (jsonb_typeof(v) = 'number' and v::text ~ '^-?[0-9]{1,4}$' and v::text::int between c.minimo and c.maximo) then
      raise exception 'DATOS_NO_VALIDOS:valor:%', k;
    end if;
    n := n + 1;
  end loop;
  if n = 0 then raise exception 'DATOS_NO_VALIDOS:valores_vacios'; end if;
  if p ? 'antes' then
    if jsonb_typeof(p->'antes') <> 'object' then raise exception 'DATOS_NO_VALIDOS:antes'; end if;
    for k, v in select * from jsonb_each(p->'antes') loop
      if not (p->'valores' ? k) or not (jsonb_typeof(v) = 'null' or (jsonb_typeof(v) = 'number' and v::text ~ '^-?[0-9]{1,4}$')) then raise exception 'DATOS_NO_VALIDOS:antes:%', k; end if;
    end loop;
  end if;
  if p ? 'deshace' and not coalesce(p->>'deshace', '') ~* '^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$' then raise exception 'DATOS_NO_VALIDOS:deshace'; end if;
  if p ? 'lm' and jsonb_typeof(p->'lm') <> 'object' then raise exception 'DATOS_NO_VALIDOS:lm'; end if;
end $$;

/** Al crear un cambio stats/info: valida (sin tocar los datos: la firma ya está calculada) y publica su parte «base». */
create or replace function private.pes_fichas_antes_de_crear() returns trigger
language plpgsql set search_path = '' as $$
begin
  perform private.pes_fichas_validar(new.tipo, new.datos);
  if new.estado_base = 'pendiente' then
    new.estado_base := 'publicado';
    new.base_ref := 'v1/cambios';   -- cada Link lo baja de GET /functions/v1/traspasos/v1/cambios?destino=base
  end if;
  return new;
end $$;
drop trigger if exists pes_fichas_antes_de_crear on public.pes_cambios;
create trigger pes_fichas_antes_de_crear before insert on public.pes_cambios
  for each row when (new.tipo in ('stats', 'info')) execute function private.pes_fichas_antes_de_crear();

-- ─── 4) Valor vigente, deshacer e historial ─────────────────────────────────────────────────────────────────────────
/** Lo que la web tiene puesto ahora para un jugador: { base: {campo: {valor, seq, id}}, lm: {...} }. valor null = el de la base. Solo staff. */
create or replace function public.pes_fichas_vigentes(p_jugador_id int default null, p_jugador text default null)
returns jsonb language plpgsql stable security definer set search_path = '' as $$
declare
  yo jsonb := jsonb_strip_nulls(jsonb_build_object('jugador_id', p_jugador_id, 'jugador', coalesce(p_jugador, '')));
  res jsonb := jsonb_build_object('base', '{}'::jsonb, 'lm', '{}'::jsonb);
  c record; k text; v jsonb; lado text;
begin
  if not private.es_moderador() then raise exception 'NO_AUTORIZADO'; end if;
  if p_jugador_id is null and btrim(coalesce(p_jugador, '')) = '' then raise exception 'FALTA_JUGADOR'; end if;
  for c in select id, seq, destino, datos from public.pes_cambios
            where estado = 'activo' and tipo in ('stats', 'info') and private.pes_fichas_mismo(datos, yo) order by seq loop
    for k, v in select * from jsonb_each(c.datos->'valores') loop
      foreach lado in array array['base', 'lm'] loop
        if private.pes_destinos_cruzan(c.destino, lado) then
          res := jsonb_set(res, array[lado, k], jsonb_build_object('valor', v, 'seq', c.seq, 'id', c.id));
        end if;
      end loop;
    end loop;
  end loop;
  return res;
end $$;

/** Deshace un cambio stats/info: crea uno nuevo que devuelve cada campo a lo que había antes (el cambio anterior de la web o, si no
    hubo, el valor de la base = null) y anula el original. Los campos que otro cambio posterior ya pisó no se tocan. Solo admin. */
create or replace function public.pes_fichas_deshacer(p_id uuid, p_motivo text default null)
returns jsonb language plpgsql security definer set search_path = '' as $$
declare
  c public.pes_cambios; k text; previo jsonb; restaurar jsonb := '{}'::jsonb; antes jsonb := '{}'::jsonb; nuevo jsonb;
begin
  if auth.uid() is null or not private.pes_es_admin() then raise exception 'NO_AUTORIZADO'; end if;
  select * into c from public.pes_cambios where id = p_id for update;
  if not found or c.tipo not in ('stats', 'info') then raise exception 'CAMBIO_NO_ENCONTRADO'; end if;
  if c.estado <> 'activo' then raise exception 'YA_DESHECHO'; end if;
  for k in select jsonb_object_keys(c.datos->'valores') loop
    if exists (select 1 from public.pes_cambios x where x.estado = 'activo' and x.tipo = c.tipo and x.seq > c.seq
                 and x.datos->'valores' ? k and private.pes_destinos_cruzan(x.destino, c.destino) and private.pes_fichas_mismo(x.datos, c.datos)) then
      continue;   -- un cambio posterior ya lo pisó: deshacer este no debe tocarlo
    end if;
    previo := (select x.datos->'valores'->k from public.pes_cambios x
                where x.estado = 'activo' and x.tipo = c.tipo and x.seq < c.seq and x.datos->'valores' ? k
                  and private.pes_destinos_cruzan(x.destino, c.destino) and private.pes_fichas_mismo(x.datos, c.datos)
                order by x.seq desc limit 1);
    restaurar := restaurar || jsonb_build_object(k, coalesce(previo, 'null'::jsonb));
    antes := antes || jsonb_build_object(k, c.datos->'valores'->k);
  end loop;
  if restaurar = '{}'::jsonb then raise exception 'NADA_QUE_DESHACER'; end if;
  nuevo := public.pes_cambio_crear(c.tipo, c.destino,
    jsonb_strip_nulls(jsonb_build_object('jugador_id', c.datos->'jugador_id', 'jugador', c.datos->>'jugador', 'lm', c.datos->'lm'))
      || jsonb_build_object('valores', restaurar, 'antes', antes, 'deshace', c.id::text),
    coalesce(nullif(left(btrim(coalesce(p_motivo, '')), 200), ''), 'Deshace el cambio #' || c.seq));
  perform public.pes_cambio_anular(c.id, 'Deshecho con el cambio #' || (nuevo->>'seq'));
  return nuevo;
end $$;

/** Historial de stats/info (quién, cuándo, antes → después) con el último resultado de cada PC. Solo staff. */
create or replace function public.pes_fichas_historial(p_limite int default 50, p_antes bigint default null, p_jugador text default null)
returns jsonb language plpgsql stable security definer set search_path = '' as $$
begin
  if not private.es_moderador() then raise exception 'NO_AUTORIZADO'; end if;
  return coalesce((
    select jsonb_agg(x order by (x->>'seq')::bigint desc) from (
      select jsonb_build_object('id', c.id, 'seq', c.seq, 'tipo', c.tipo, 'destino', c.destino, 'datos', c.datos,
        'autor_nombre', c.autor_nombre, 'creado', c.creado, 'estado', c.estado, 'anulado_en', c.anulado_en, 'motivo_anulacion', c.motivo_anulacion,
        'estado_base', c.estado_base, 'estado_lm', c.estado_lm, 'lm_ref', c.lm_ref, 'nota', c.nota,
        'pcs', coalesce((
          select jsonb_agg(jsonb_build_object('pc', d.nombre, 'usuario', coalesce(nullif(pf.nombre_display, ''), pf.username, 'Jugador'),
                   'destino', u.destino, 'resultado', u.resultado, 'motivo', u.motivo, 'cuando', coalesce(u.cuando, u.creado)) order by u.id desc)
            from (select distinct on (e.dispositivo, e.destino) e.* from public.pes_eventos e
                   where e.cambio = c.id and e.tipo = 'resultado' order by e.dispositivo, e.destino, e.id desc) u
            join public.dispositivos_host d on d.id = u.dispositivo
            join public.perfiles pf on pf.id = u.usuario), '[]'::jsonb)) as x
      from public.pes_cambios c
      where c.tipo in ('stats', 'info') and (p_antes is null or c.seq < p_antes)
        and (p_jugador is null or btrim(p_jugador) = '' or lower(c.datos->>'jugador') like '%' || lower(btrim(p_jugador)) || '%')
      order by c.seq desc
      limit least(greatest(coalesce(p_limite, 50), 1), 200)) s), '[]'::jsonb);
end $$;

revoke all on function public.pes_fichas_vigentes(int, text), public.pes_fichas_deshacer(uuid, text), public.pes_fichas_historial(int, bigint, text) from public, anon;
grant execute on function public.pes_fichas_vigentes(int, text), public.pes_fichas_deshacer(uuid, text), public.pes_fichas_historial(int, bigint, text) to authenticated;
revoke all on function private.pes_fichas_validar(text, jsonb), private.pes_fichas_mismo(jsonb, jsonb), private.pes_destinos_cruzan(text, text),
  private.pes_fichas_antes_de_crear() from public;

-- 089 · Equivalencias Phoenix ID ↔ ID local de cada parche (jugadores y clubes).
-- Las sube Phoenix Mercado (POST /mercado/v1/equivalencias, formato phoenix-mercado/emparejamiento@0.1) y el staff revisa lo dudoso.
-- Reglas:
--   · Una fila «confirmado» (decisión del staff) NUNCA la pisa un informe nuevo.
--   · pes_id_local solo se guarda en filas «automatico» o «confirmado». En «revisar» / «sin_candidato» va null
--     (las opciones viven en `candidatos`), así lo dudoso nunca bloquea un ID local.
--   · Si un informe asigna a un phoenix_id un pes_id_local que ya usa OTRO phoenix_id → ambas pasan a «revisar».
--   · phoenix_id que no existe en la web → se ignora y se cuenta (no rompe el lote).

do $$ declare t text; ref text; begin
  foreach t in array array['mercado_equivalencias', 'mercado_equivalencias_clubes'] loop
    ref := case t when 'mercado_equivalencias' then 'lm_jugadores' else 'lm_clubes' end;
    execute format($f$
      create table if not exists public.%1$I (
        id bigserial primary key,
        perfil_parche text not null check (perfil_parche ~ '^[A-Za-z0-9._-]{1,60}$'),
        phoenix_id bigint not null references public.%2$I(id) on delete cascade,
        pes_id_local int check (pes_id_local >= 0),
        estado text not null check (estado in ('automatico', 'revisar', 'sin_candidato', 'confirmado')),
        puntaje int check (puntaje between -1000 and 1000),
        metodo text check (char_length(metodo) <= 60),
        candidatos jsonb not null default '[]'::jsonb check (jsonb_typeof(candidatos) = 'array' and pg_column_size(candidatos) <= 8000),
        revisado_por uuid references auth.users(id) on delete set null,
        revisado_en timestamptz,
        actualizado timestamptz not null default now(),
        unique (perfil_parche, phoenix_id),
        unique (perfil_parche, pes_id_local),
        check (pes_id_local is null or estado in ('automatico', 'confirmado'))
      )$f$, t, ref);
    execute format('create index if not exists %1$s_estado on public.%1$I (perfil_parche, estado)', t);
    execute format('alter table public.%I enable row level security', t);
    execute format('drop policy if exists %1$s_staff on public.%1$I', t);
    execute format('create policy %1$s_staff on public.%1$I for select to authenticated using (private.es_moderador())', t);
  end loop;
end $$;

-- Tipo → tabla (solo dos valores permitidos: evita SQL dinámico con texto libre).
create or replace function private.eq_tabla(p_tipo text) returns text language sql immutable as $$
  select case p_tipo when 'jugadores' then 'mercado_equivalencias' when 'clubes' then 'mercado_equivalencias_clubes' end $$;

-- Programa (service_role): recibe un lote del informe.
create or replace function public.sistema_mercado_equivalencias(p_perfil text, p_tipo text, p_items jsonb)
returns jsonb language plpgsql security definer set search_path = public as $$
declare
  t text := private.eq_tabla(p_tipo); ref text := case p_tipo when 'jugadores' then 'lm_jugadores' else 'lm_clubes' end;
  it jsonb; v_pid bigint; v_pes int; v_estado text; v_cand jsonb; v_otro bigint; v_actual text;
  n_ok int := 0; n_conservados int := 0; n_ignorados int := 0; n_conflictos int := 0; ignorados jsonb := '[]';
begin
  if t is null then raise exception 'TIPO_INVALIDO'; end if;
  if p_perfil !~ '^[A-Za-z0-9._-]{1,60}$' then raise exception 'PERFIL_INVALIDO'; end if;
  for it in select * from jsonb_array_elements(p_items) loop
    v_pid := nullif(it->>'phoenix_id', '')::bigint;
    v_pes := nullif(it->>'pes_id_local', '')::int;
    v_estado := coalesce(it->>'estado', 'revisar');
    if v_estado = 'confirmado' or v_estado not in ('automatico', 'revisar', 'sin_candidato') then v_estado := 'revisar'; end if; -- solo el staff confirma
    v_cand := case when jsonb_typeof(it->'candidatos') = 'array' then it->'candidatos' else '[]' end;
    if pg_column_size(v_cand) > 8000 then v_cand := '[]'; end if;
    -- phoenix_id inexistente en la web
    execute format('select exists(select 1 from %I where id = $1)', ref) into strict v_actual using v_pid;
    if v_pid is null or v_actual = 'false' then n_ignorados := n_ignorados + 1;
      if jsonb_array_length(ignorados) < 50 then ignorados := ignorados || to_jsonb(v_pid); end if; continue; end if;
    -- decisión del staff: se respeta
    execute format('select estado from %I where perfil_parche = $1 and phoenix_id = $2', t) into v_actual using p_perfil, v_pid;
    if v_actual = 'confirmado' then n_conservados := n_conservados + 1; continue; end if;
    -- lo dudoso no reserva ID local: se guarda como candidato
    if v_estado <> 'automatico' then
      if v_pes is not null and not v_cand @> jsonb_build_array(jsonb_build_object('pes_id_local', v_pes)) then
        v_cand := v_cand || jsonb_build_array(jsonb_build_object('pes_id_local', v_pes, 'sugerido', true)); end if;
      v_pes := null;
    end if;
    -- choque de ID local con otro phoenix_id
    if v_pes is not null then
      execute format('select phoenix_id from %I where perfil_parche = $1 and pes_id_local = $2 and phoenix_id <> $3', t) into v_otro using p_perfil, v_pes, v_pid;
      if v_otro is not null then
        n_conflictos := n_conflictos + 1;
        execute format($u$update %I set estado = 'revisar', pes_id_local = null, actualizado = now(),
          candidatos = candidatos || jsonb_build_array(jsonb_build_object('pes_id_local', $3, 'conflicto_con', $4))
          where perfil_parche = $1 and phoenix_id = $2 and estado <> 'confirmado'$u$, t) using p_perfil, v_otro, v_pes, v_pid;
        execute format('select estado from %I where perfil_parche = $1 and phoenix_id = $2', t) into v_actual using p_perfil, v_otro;
        v_cand := v_cand || jsonb_build_array(jsonb_build_object('pes_id_local', v_pes, 'conflicto_con', v_otro, 'confirmado', v_actual = 'confirmado'));
        v_estado := 'revisar'; v_pes := null;
      end if;
    end if;
    execute format($i$insert into %I (perfil_parche, phoenix_id, pes_id_local, estado, puntaje, metodo, candidatos, actualizado)
      values ($1, $2, $3, $4, $5, $6, $7, now())
      on conflict (perfil_parche, phoenix_id) do update set pes_id_local = excluded.pes_id_local, estado = excluded.estado,
        puntaje = excluded.puntaje, metodo = excluded.metodo, candidatos = excluded.candidatos, actualizado = now(),
        revisado_por = null, revisado_en = null$i$, t)
      using p_perfil, v_pid, v_pes, v_estado, least(greatest(nullif(it->>'puntaje', '')::numeric, -1000), 1000)::int, left(it->>'metodo', 60), v_cand;
    n_ok := n_ok + 1;
  end loop;
  return jsonb_build_object('guardados', n_ok, 'conservados_confirmados', n_conservados, 'conflictos', n_conflictos,
                            'ignorados', n_ignorados, 'ignorados_muestra', ignorados);
end $$;
revoke all on function public.sistema_mercado_equivalencias(text, text, jsonb) from public, anon, authenticated;
grant execute on function public.sistema_mercado_equivalencias(text, text, jsonb) to service_role;

-- Staff: confirmar una equivalencia (elige el ID local). Si otro phoenix_id lo tenía en automático, pasa a «revisar».
create or replace function public.mercado_eq_confirmar(p_tipo text, p_id bigint, p_pes_id_local int)
returns void language plpgsql security definer set search_path = public as $$
declare t text := private.eq_tabla(p_tipo); v_perfil text; v_pid bigint; v_otro text;
begin
  if not private.es_moderador() then raise exception 'NO_AUTORIZADO'; end if;
  if t is null or p_pes_id_local is null or p_pes_id_local < 0 then raise exception 'DATOS_INVALIDOS'; end if;
  execute format('select perfil_parche, phoenix_id from %I where id = $1 for update', t) into v_perfil, v_pid using p_id;
  if v_perfil is null then raise exception 'NO_EXISTE'; end if;
  execute format('select estado from %I where perfil_parche = $1 and pes_id_local = $2 and id <> $3 for update', t) into v_otro using v_perfil, p_pes_id_local, p_id;
  if v_otro = 'confirmado' then raise exception 'PES_ID_YA_CONFIRMADO'; end if;
  if v_otro is not null then
    execute format($u$update %I set estado = 'revisar', pes_id_local = null, actualizado = now(),
      candidatos = candidatos || jsonb_build_array(jsonb_build_object('pes_id_local', $2, 'quitado_por_staff', true))
      where perfil_parche = $1 and pes_id_local = $2 and id <> $3$u$, t) using v_perfil, p_pes_id_local, p_id;
  end if;
  execute format($u$update %I set estado = 'confirmado', pes_id_local = $2, revisado_por = auth.uid(), revisado_en = now(), actualizado = now() where id = $1$u$, t)
    using p_id, p_pes_id_local;
  insert into auditoria_staff (actor_id, accion, tabla, registro_id, cambios)
  values (auth.uid(), 'mercado_equivalencia_confirmar', t, p_id::text, jsonb_build_object('perfil', v_perfil, 'phoenix_id', v_pid, 'pes_id_local', p_pes_id_local));
end $$;

-- Staff: marcar que no tiene equivalente en ese parche (o reabrir con p_reabrir = true).
create or replace function public.mercado_eq_sin_candidato(p_tipo text, p_id bigint, p_reabrir boolean default false)
returns void language plpgsql security definer set search_path = public as $$
declare t text := private.eq_tabla(p_tipo); n int;
begin
  if not private.es_moderador() then raise exception 'NO_AUTORIZADO'; end if;
  if t is null then raise exception 'DATOS_INVALIDOS'; end if;
  execute format($u$update %I set estado = case when $2 then 'revisar' else 'sin_candidato' end, pes_id_local = null,
    revisado_por = case when $2 then null else auth.uid() end, revisado_en = case when $2 then null else now() end, actualizado = now() where id = $1$u$, t)
    using p_id, p_reabrir;
  get diagnostics n = row_count; if n = 0 then raise exception 'NO_EXISTE'; end if;
  insert into auditoria_staff (actor_id, accion, tabla, registro_id, cambios)
  values (auth.uid(), case when p_reabrir then 'mercado_equivalencia_reabrir' else 'mercado_equivalencia_sin_candidato' end, t, p_id::text, '{}'::jsonb);
end $$;

-- Staff: resumen por parche para la pantalla.
create or replace function public.mercado_eq_resumen()
returns table (tipo text, perfil_parche text, estado text, total bigint) language sql security definer set search_path = public as $$
  select 'jugadores', perfil_parche, estado, count(*) from mercado_equivalencias where private.es_moderador() group by 2, 3
  union all
  select 'clubes', perfil_parche, estado, count(*) from mercado_equivalencias_clubes where private.es_moderador() group by 2, 3 $$;

revoke all on function public.mercado_eq_confirmar(text, bigint, int) from public, anon;
revoke all on function public.mercado_eq_sin_candidato(text, bigint, boolean) from public, anon;
revoke all on function public.mercado_eq_resumen() from public, anon;
grant execute on function public.mercado_eq_confirmar(text, bigint, int) to authenticated;
grant execute on function public.mercado_eq_sin_candidato(text, bigint, boolean) to authenticated;
grant execute on function public.mercado_eq_resumen() to authenticated;

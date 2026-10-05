-- 044 · OLA C (1/5) · VALORACIONES POST-PARTIDO Y REPUTACIÓN. Depende de 030-043 (resultados_duelo, retos_matchmaking, private.lado_en_reto).
-- Regla de oro: solo se puede valorar a alguien del BANDO CONTRARIO en un duelo cuyo marcador ya está CONFIRMADO (dentro de 14 días).
--   1–5 estrellas + etiquetas rápidas. Una valoración por persona y por duelo. Nadie ve valoraciones sueltas: solo el resumen.
-- Anti-abuso: (1) CIEGAS: una valoración solo cuenta cuando la otra persona también valoró, o pasados 3 días; (2) peso decreciente:
--   la n-ésima valoración de la misma persona hacia la misma persona pesa 1/n; (3) tope de 40 al día; (4) estrellas bajas exigen etiqueta
--   negativa y las altas no admiten etiquetas negativas; (5) moderación puede anular una valoración (auditado).
-- Puntaje bayesiano: (C·m + Σ peso·estrellas) / (C + Σ peso), con m = 4.0 y C = 5. Con menos de 3 valoraciones el perfil figura como «Nuevo».
-- Tabla cerrada (sin acceso directo): todo por funciones.

-- ─── 1) Tabla ───────────────────────────────────────────────────────────────────────────────────────
create table if not exists public.valoraciones (
  id bigint generated always as identity primary key,
  reto_id integer not null references public.retos_matchmaking(id) on delete cascade,
  de_id uuid not null references auth.users(id) on delete cascade,
  a_id uuid not null references auth.users(id) on delete cascade,
  estrellas smallint not null check (estrellas between 1 and 5),
  etiquetas text[] not null default '{}',
  created_at timestamptz not null default now(),
  unique (reto_id, de_id, a_id),
  check (de_id <> a_id)
);
create index if not exists valoraciones_a_idx on public.valoraciones (a_id, created_at);
create index if not exists valoraciones_de_idx on public.valoraciones (de_id, created_at);
alter table public.valoraciones enable row level security;
revoke all on public.valoraciones from anon, authenticated;

drop trigger if exists zy_bloqueo_sancion on public.valoraciones;
create trigger zy_bloqueo_sancion before insert on public.valoraciones for each row execute function private.bloquear_sancionados('de_id');
drop trigger if exists zz_limite_ritmo on public.valoraciones;
create trigger zz_limite_ritmo before insert on public.valoraciones for each row execute function private.limitar_ritmo('de_id', '40', '1 day', 'Máximo 40 valoraciones por día.');

-- ─── 2) Ayudantes ───────────────────────────────────────────────────────────────────────────────────
create or replace function private.etiquetas_positivas() returns text[] language sql immutable set search_path = '' as $$ select array['puntual', 'buena_conexion', 'deportivo'] $$;
create or replace function private.etiquetas_negativas() returns text[] language sql immutable set search_path = '' as $$ select array['lag', 'abandono', 'insultos'] $$;
revoke all on function private.etiquetas_positivas(), private.etiquetas_negativas() from public, anon, authenticated;

-- Valoraciones que ya CUENTAN (ciegas resueltas) con su peso 1/n por pareja (de → a).
create or replace function private.valoraciones_vigentes() returns table (id bigint, a_id uuid, de_id uuid, reto_id integer, estrellas smallint, etiquetas text[], peso numeric)
language sql stable security definer set search_path = '' as $$
  select v.id, v.a_id, v.de_id, v.reto_id, v.estrellas, v.etiquetas, 1.0 / row_number() over (partition by v.de_id, v.a_id order by v.created_at, v.id)
  from public.valoraciones v
  where v.created_at <= now() - interval '3 days'
     or exists (select 1 from public.valoraciones r where r.reto_id = v.reto_id and r.de_id = v.a_id and r.a_id = v.de_id)
$$;
revoke all on function private.valoraciones_vigentes() from public, anon, authenticated;

-- Resumen de reputación de una persona (sin comprobar permisos: uso interno).
create or replace function private.reputacion_calculo(p_usuario uuid) returns jsonb
language plpgsql stable security definer set search_path = '' as $$
declare n integer; sp numeric; sw numeric; puntaje numeric; nivel text; pos jsonb; neg jsonb;
begin
  select count(*), coalesce(sum(peso * estrellas), 0), coalesce(sum(peso), 0) into n, sp, sw from private.valoraciones_vigentes() where a_id = p_usuario;
  puntaje := round((5 * 4.0 + sp) / (5 + sw), 2);
  nivel := case when n < 3 then 'nuevo' when puntaje >= 4.7 and n >= 20 then 'leyenda' when puntaje >= 4.4 and n >= 8 then 'veterano' when puntaje >= 3.8 then 'confiable' else 'novato' end;
  select coalesce(jsonb_object_agg(t, c), '{}'::jsonb) into pos from (select e t, count(*)::int c from private.valoraciones_vigentes() x, unnest(x.etiquetas) e where x.a_id = p_usuario and e = any (private.etiquetas_positivas()) group by e) q;
  select coalesce(jsonb_object_agg(t, c), '{}'::jsonb) into neg from (select e t, count(*)::int c from private.valoraciones_vigentes() x, unnest(x.etiquetas) e where x.a_id = p_usuario and e = any (private.etiquetas_negativas()) group by e) q;
  return jsonb_build_object('visible', true, 'valoraciones', n, 'nivel', nivel, 'puntaje', case when n < 3 then null else puntaje end, 'positivas', pos, 'negativas', neg);
end $$;
revoke all on function private.reputacion_calculo(uuid) from public, anon, authenticated;

-- ─── 3) Valorar ─────────────────────────────────────────────────────────────────────────────────────
create or replace function public.valorar_rival(p_reto_id integer, p_usuario uuid, p_estrellas integer, p_etiquetas text[] default '{}') returns void
language plpgsql security definer set search_path = '' as $$
declare yo uuid := private.uid_requerido(); r public.retos_matchmaking; x public.resultados_duelo; et text[]; t text; hay_neg boolean; hay_pos boolean;
begin
  if p_usuario is null or p_usuario = yo then raise exception 'No puedes valorarte a ti mismo.'; end if;
  if p_estrellas is null or p_estrellas not between 1 and 5 then raise exception 'Las estrellas deben ser de 1 a 5.'; end if;
  select * into r from public.retos_matchmaking where id = p_reto_id;
  select * into x from public.resultados_duelo where reto_id = p_reto_id;
  if r.id is null or x.reto_id is null or x.estado <> 'CONFIRMADO' then raise exception 'Solo se valora un partido cuyo marcador ya está confirmado.'; end if;
  if x.updated_at < now() - interval '14 days' then raise exception 'El plazo para valorar este partido (14 días) ya terminó.'; end if;
  if private.lado_en_reto(p_reto_id, yo) is null or private.lado_en_reto(p_reto_id, p_usuario) is null or private.lado_en_reto(p_reto_id, yo) = private.lado_en_reto(p_reto_id, p_usuario) then
    raise exception 'Solo puedes valorar a quien jugó en el bando contrario.';
  end if;
  select coalesce(array_agg(distinct e), '{}') into et from unnest(coalesce(p_etiquetas, '{}')) e;
  if cardinality(et) > 4 then raise exception 'Máximo 4 etiquetas.'; end if;
  foreach t in array et loop
    if not (t = any (private.etiquetas_positivas()) or t = any (private.etiquetas_negativas())) then raise exception 'Etiqueta no válida: %.', t; end if;
  end loop;
  hay_neg := et && private.etiquetas_negativas(); hay_pos := et && private.etiquetas_positivas();
  if p_estrellas <= 2 and not hay_neg then raise exception 'Con 1 o 2 estrellas elige al menos una etiqueta que explique qué pasó.'; end if;
  if p_estrellas >= 4 and hay_neg then raise exception 'Con 4 o 5 estrellas no se pueden usar etiquetas negativas.'; end if;
  if p_estrellas <= 2 and hay_pos then raise exception 'Con 1 o 2 estrellas no se pueden usar etiquetas positivas.'; end if;
  begin
    insert into public.valoraciones (reto_id, de_id, a_id, estrellas, etiquetas) values (p_reto_id, yo, p_usuario, p_estrellas, et);
  exception when unique_violation then raise exception 'Ya valoraste a esta persona en este partido.';
  end;
end $$;

-- Mis valoraciones pendientes: rivales de duelos con marcador confirmado en los últimos 14 días a quienes aún no valoré.
create or replace function public.mis_valoraciones_pendientes() returns jsonb
language plpgsql stable security definer set search_path = '' as $$
declare yo uuid := private.uid_requerido();
begin
  return coalesce((select jsonb_agg(jsonb_build_object('reto_id', f.reto_id, 'usuario_id', f.usuario_id, 'username', f.username, 'nombre', f.nombre, 'avatar_url', f.avatar_url, 'cerrado_at', f.cuando) order by f.cuando desc)
    from (select x.reto_id, op.usuario_id, p.username, p.nombre_display as nombre, p.avatar_url, x.updated_at as cuando
          from public.resultados_duelo x
          join lateral private.jugadores_de_reto(x.reto_id) mi on mi.usuario_id = yo
          join lateral private.jugadores_de_reto(x.reto_id) op on op.lado <> mi.lado
          join public.perfiles p on p.id = op.usuario_id
          where x.estado = 'CONFIRMADO' and x.updated_at > now() - interval '14 days'
            and not exists (select 1 from public.valoraciones v where v.reto_id = x.reto_id and v.de_id = yo and v.a_id = op.usuario_id)
          order by x.updated_at desc limit 20) f), '[]'::jsonb);
end $$;

-- ─── 4) Lectura ─────────────────────────────────────────────────────────────────────────────────────
-- Reputación de una persona. La ve quien puede ver su muro (mismo criterio que las estadísticas). Nunca expone valoraciones sueltas.
create or replace function public.reputacion_de(p_usuario uuid) returns jsonb
language plpgsql stable security definer set search_path = '' as $$
declare yo uuid := (select auth.uid());
begin
  if p_usuario is null or not private.puede_ver_muro(p_usuario, yo) then return jsonb_build_object('visible', false); end if;
  return private.reputacion_calculo(p_usuario);
end $$;

-- ─── 5) Moderación (moderador/admin; auditada) ──────────────────────────────────────────────────────
create or replace function public.valoraciones_recibidas_staff(p_usuario uuid) returns jsonb
language plpgsql stable security definer set search_path = '' as $$
begin
  if not private.es_moderador() then raise exception 'Solo el equipo de moderación puede ver esto.'; end if;
  return coalesce((select jsonb_agg(jsonb_build_object('id', v.id, 'reto_id', v.reto_id, 'de', private.nombre(v.de_id), 'estrellas', v.estrellas, 'etiquetas', v.etiquetas, 'creada', v.created_at) order by v.created_at desc)
                   from (select * from public.valoraciones where a_id = p_usuario order by created_at desc limit 50) v), '[]'::jsonb);
end $$;

create or replace function public.anular_valoracion(p_id bigint, p_motivo text) returns void
language plpgsql security definer set search_path = '' as $$
declare mot text := btrim(coalesce(p_motivo, '')); v public.valoraciones;
begin
  if not private.es_moderador() then raise exception 'Solo el equipo de moderación puede anular valoraciones.'; end if;
  if char_length(mot) < 5 then raise exception 'Escribe el motivo (mínimo 5 letras).'; end if;
  select * into v from public.valoraciones where id = p_id for update;
  if not found then raise exception 'La valoración ya no existe.'; end if;
  delete from public.valoraciones where id = p_id;
  perform private.auditar_moderacion('borrar', 'valoraciones', p_id::text, 'Valoración a ' || private.nombre(v.a_id), jsonb_build_object('estrellas', v.estrellas, 'etiquetas', v.etiquetas), mot);
end $$;

-- ─── 6) Permisos ────────────────────────────────────────────────────────────────────────────────────
revoke all on function public.valorar_rival(integer, uuid, integer, text[]), public.mis_valoraciones_pendientes(), public.reputacion_de(uuid),
  public.valoraciones_recibidas_staff(uuid), public.anular_valoracion(bigint, text) from public, anon, authenticated;
grant execute on function public.valorar_rival(integer, uuid, integer, text[]), public.mis_valoraciones_pendientes(), public.valoraciones_recibidas_staff(uuid), public.anular_valoracion(bigint, text) to authenticated;
grant execute on function public.reputacion_de(uuid) to anon, authenticated;

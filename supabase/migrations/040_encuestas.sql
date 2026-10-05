-- 040 · OLA B (3/5) · ENCUESTAS EN EL MURO. Depende de 021 (muro), 031 (ritmo), 032 (oculto/sanciones), 034 (puede_ver_muro con edad en 038).
-- Una encuesta ES una publicación normal del muro (se crea con muro_publicar: mismas reglas, límite de 10/hora, menciones, reportes y moderación)
-- más una «ficha» con opciones y votos. Se borra o se oculta junto con su publicación.
-- Reglas: 2 a 4 opciones · dura 1 a 7 días · 1 voto por persona (se puede CAMBIAR mientras siga abierta) · no puedes votar si no puedes ver ese muro, si estás sancionado
-- o si hay bloqueo · los RESULTADOS se ven al votar, al cerrarse o si eres el autor (así nadie vota «por moda»).
-- Todo por funciones: las tablas están cerradas.

create table if not exists public.encuestas (
  id bigint generated always as identity primary key,
  publicacion_id bigint not null unique references public.muro_publicaciones(id) on delete cascade,
  creador_id uuid not null references auth.users(id) on delete cascade,
  cierra_at timestamptz not null,
  created_at timestamptz not null default now()
);
create table if not exists public.encuesta_opciones (
  id bigint generated always as identity primary key,
  encuesta_id bigint not null references public.encuestas(id) on delete cascade,
  orden smallint not null check (orden between 1 and 4),
  texto text not null check (char_length(texto) between 1 and 40),
  unique (encuesta_id, orden)
);
create table if not exists public.encuesta_votos (
  encuesta_id bigint not null references public.encuestas(id) on delete cascade,
  usuario_id uuid not null references auth.users(id) on delete cascade,
  opcion_id bigint not null references public.encuesta_opciones(id) on delete cascade,
  created_at timestamptz not null default now(),
  primary key (encuesta_id, usuario_id)
);
create index if not exists encuesta_votos_opcion_idx on public.encuesta_votos (opcion_id);
create index if not exists encuestas_creador_idx on public.encuestas (creador_id, created_at);
alter table public.encuestas enable row level security;
alter table public.encuesta_opciones enable row level security;
alter table public.encuesta_votos enable row level security;
revoke all on public.encuestas, public.encuesta_opciones, public.encuesta_votos from anon, authenticated;

-- Candado de sanciones (032) y límites de ritmo (031) en las tablas nuevas.
drop trigger if exists zy_bloqueo_sancion on public.encuestas;
create trigger zy_bloqueo_sancion before insert on public.encuestas for each row execute function private.bloquear_sancionados('creador_id');
drop trigger if exists zy_bloqueo_sancion on public.encuesta_votos;
create trigger zy_bloqueo_sancion before insert on public.encuesta_votos for each row execute function private.bloquear_sancionados('usuario_id');
drop trigger if exists zz_limite_ritmo on public.encuestas;
create trigger zz_limite_ritmo before insert on public.encuestas for each row execute function private.limitar_ritmo('creador_id', '5', '1 day', 'Máximo 5 encuestas por día: espera un poco.');
drop trigger if exists zz_limite_ritmo on public.encuesta_votos;
create trigger zz_limite_ritmo before insert on public.encuesta_votos for each row execute function private.limitar_ritmo('usuario_id', '120', '1 hour', 'Estás votando muy rápido: espera un rato.');

-- ─── Crear ─────────────────────────────────────────────────────────────────────────────────────────────────────
create or replace function public.crear_encuesta(p_pregunta text, p_opciones text[], p_dias integer default 3, p_juego text default null) returns bigint
language plpgsql security definer set search_path = '' as $$
declare yo uuid := private.uid_requerido(); preg text := btrim(coalesce(p_pregunta, '')); ops text[]; pub bigint; enc bigint; i integer;
begin
  if char_length(preg) < 3 or char_length(preg) > 280 then raise exception 'La pregunta debe tener entre 3 y 280 caracteres.'; end if;
  if p_dias is null or p_dias not between 1 and 7 then raise exception 'La encuesta dura entre 1 y 7 días.'; end if;
  select coalesce(array_agg(btrim(o) order by n), '{}') into ops from unnest(coalesce(p_opciones, '{}')) with ordinality as t(o, n) where char_length(btrim(coalesce(o, ''))) > 0;
  if coalesce(array_length(ops, 1), 0) not between 2 and 4 then raise exception 'Pon entre 2 y 4 opciones.'; end if;
  if exists (select 1 from unnest(ops) o where char_length(o) > 40) then raise exception 'Cada opción admite máximo 40 caracteres.'; end if;
  if (select count(distinct lower(o)) from unnest(ops) o) <> array_length(ops, 1) then raise exception 'Las opciones no pueden repetirse.'; end if;
  pub := public.muro_publicar(preg, null, null, null, p_juego);            -- mismas reglas que cualquier publicación (límite por hora, juego válido, sanciones…)
  insert into public.encuestas (publicacion_id, creador_id, cierra_at) values (pub, yo, now() + make_interval(days => p_dias)) returning id into enc;
  for i in 1 .. array_length(ops, 1) loop
    insert into public.encuesta_opciones (encuesta_id, orden, texto) values (enc, i, ops[i]);
  end loop;
  return pub;
end $$;

-- ─── Votar (o cambiar el voto mientras siga abierta) ───────────────────────────────────────────────────────────
create or replace function public.votar_encuesta(p_publicacion bigint, p_opcion bigint) returns jsonb
language plpgsql security definer set search_path = '' as $$
declare yo uuid := private.uid_requerido(); e public.encuestas; pub public.muro_publicaciones;
begin
  select * into pub from public.muro_publicaciones where id = p_publicacion;
  select * into e from public.encuestas where publicacion_id = p_publicacion;
  if not found or pub.oculto or not private.puede_ver_muro(pub.autor_id, yo) then raise exception 'Esa encuesta ya no está disponible.'; end if;
  if e.cierra_at <= now() then raise exception 'Esta encuesta ya cerró.'; end if;
  if not exists (select 1 from public.encuesta_opciones where id = p_opcion and encuesta_id = e.id) then raise exception 'Esa opción no pertenece a la encuesta.'; end if;
  insert into public.encuesta_votos (encuesta_id, usuario_id, opcion_id) values (e.id, yo, p_opcion)
  on conflict (encuesta_id, usuario_id) do update set opcion_id = excluded.opcion_id;
  return (public.encuestas_de(array[p_publicacion])) -> p_publicacion::text;
end $$;

-- ─── Leer: estado de las encuestas de estas publicaciones (a quien pueda verlas) ───────────────────────────────
-- → { "<id publicación>": { id, pregunta?, cierra_at, cerrada, mi_voto, total, resultados_visibles, opciones: [{id, texto, votos|null}] } }
create or replace function public.encuestas_de(p_publicaciones bigint[]) returns jsonb
language plpgsql stable security definer set search_path = '' as $$
declare yo uuid := (select auth.uid()); ids bigint[] := (select coalesce(array_agg(distinct x), '{}') from unnest(coalesce(p_publicaciones, '{}')) x where x is not null);
begin
  if coalesce(array_length(ids, 1), 0) > 100 then ids := ids[1:100]; end if;
  return coalesce((select jsonb_object_agg(f.pub::text, f.dato) from (
    select e.publicacion_id as pub, jsonb_build_object(
      'id', e.id, 'cierra_at', e.cierra_at, 'cerrada', e.cierra_at <= now(), 'soy_autor', yo is not null and yo = e.creador_id,
      'mi_voto', (select v.opcion_id from public.encuesta_votos v where v.encuesta_id = e.id and v.usuario_id = yo),
      'total', (select count(*) from public.encuesta_votos v where v.encuesta_id = e.id),
      'resultados_visibles', (e.cierra_at <= now() or (yo is not null and (yo = e.creador_id or exists (select 1 from public.encuesta_votos v where v.encuesta_id = e.id and v.usuario_id = yo)))),
      'opciones', (select jsonb_agg(jsonb_build_object('id', o.id, 'texto', o.texto,
          'votos', case when e.cierra_at <= now() or (yo is not null and (yo = e.creador_id or exists (select 1 from public.encuesta_votos v where v.encuesta_id = e.id and v.usuario_id = yo)))
                        then (select count(*) from public.encuesta_votos v where v.opcion_id = o.id) else null end) order by o.orden)
                   from public.encuesta_opciones o where o.encuesta_id = e.id)) as dato
    from public.encuestas e join public.muro_publicaciones m on m.id = e.publicacion_id
    where e.publicacion_id = any (ids) and not m.oculto and private.puede_ver_muro(m.autor_id, yo)) f), '{}'::jsonb);
end $$;

revoke all on function public.crear_encuesta(text, text[], integer, text), public.votar_encuesta(bigint, bigint) from public, anon;
grant execute on function public.crear_encuesta(text, text[], integer, text), public.votar_encuesta(bigint, bigint) to authenticated;
revoke all on function public.encuestas_de(bigint[]) from public;
grant execute on function public.encuestas_de(bigint[]) to anon, authenticated;

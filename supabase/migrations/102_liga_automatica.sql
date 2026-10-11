-- 102 · Liga automática: calendario oficial en la BD, resultados que llegan del juego por Phoenix Link,
--       validación por el staff o un árbitro designado, y marcador EN VIVO para la web (Realtime).
-- Hasta hoy los fixtures y resultados de la Galaxy League vivían solo en src/data/ligaResultados.js (copiados de CopaFácil).
-- SOLO AÑADE (tablas liga_*, vista liga_tabla, funciones liga_*): no toca nada existente.
--   · liga_ediciones / liga_participantes / liga_partidos: calendario oficial (cualquier liga o torneo) con estado por partido.
--   · Estados: pendiente (sin jugar) → propuesto (llegó del juego por Link) → confirmado | disputa | anulado.
--   · REGLA DE FRALEX (10/11-oct): el resultado lo valida el STAFF o el ÁRBITRO DESIGNADO del partido, nunca el host
--     (puede ser un host neutral) ni los DT. Los DT pueden RECLAMAR (pasa a «disputa»).
--   · Solo la Edge Function «liga» (service_role) propone resultados y escribe el marcador en vivo.
--   · liga_vivo: una fila por sala con partido en curso (minuto, goles…). Lectura pública + Realtime: la web se actualiza sola.
-- Hecho por el chat LINK (Claude) con autorización de Fralex («autorizo supabase», 11-oct-2026).
-- Documento: docs/LIGA-AUTOMATICA.md (repo web) y docs/PHOENIX-ESTADIO-ARBITRO.md (repo smash-soda-fork).

create table public.liga_ediciones (
  id         text primary key,                       -- 'galaxy:edicion-1'
  liga       text not null,                          -- id de data/ligas.js ('galaxy', 'sudario'…) o de un torneo
  edicion    text not null,                          -- id de la edición en EDICIONES ('edicion-1')
  nombre     text not null,
  estado     text not null default 'en_curso' check (estado in ('en_curso', 'finalizada')),
  creado     timestamptz not null default now(),
  unique (liga, edicion)
);

create table public.liga_participantes (
  edicion_id text not null references public.liga_ediciones(id) on delete cascade,
  nombre     text not null,                          -- nombre del DT tal como sale en la web ('Fralex')
  club       text,
  usuario    uuid references public.perfiles(id) on delete set null,   -- cuenta de la web (null = aún no tiene)
  primary key (edicion_id, nombre)
);
create index liga_participantes_usuario_idx on public.liga_participantes (usuario) where usuario is not null;

create table public.liga_partidos (
  id             bigint generated always as identity primary key,
  edicion_id     text not null references public.liga_ediciones(id) on delete cascade,
  fecha          smallint not null check (fecha between 1 and 99),
  local          text not null,
  visitante      text not null,
  goles_local    smallint check (goles_local between 0 and 99),
  goles_visita   smallint check (goles_visita between 0 and 99),
  estado         text not null default 'pendiente' check (estado in ('pendiente', 'propuesto', 'confirmado', 'disputa', 'anulado')),
  origen         text check (origen in ('copafacil', 'link', 'staff')),
  detalle        jsonb not null default '{}'::jsonb,  -- del juego: goles con minuto, penales, equipos, huella del Doctor, reclamo…
  arbitro        uuid references public.perfiles(id) on delete set null,   -- árbitro designado por el staff (opcional)
  sala_id        uuid references public.salas(id) on delete set null,
  dispositivo    uuid references public.dispositivos_host(id) on delete set null,
  propuesto_en   timestamptz,
  resuelto_por   uuid references public.perfiles(id) on delete set null,
  resuelto_en    timestamptz,
  unique (edicion_id, fecha, local, visitante),
  foreign key (edicion_id, local) references public.liga_participantes(edicion_id, nombre),
  foreign key (edicion_id, visitante) references public.liga_participantes(edicion_id, nombre),
  check (local <> visitante),
  check ((estado = 'pendiente') = (goles_local is null and goles_visita is null) or estado = 'anulado')
);
create index liga_partidos_pendientes_idx on public.liga_partidos (edicion_id, fecha) where estado in ('pendiente', 'disputa');
create index liga_partidos_arbitro_idx on public.liga_partidos (arbitro) where arbitro is not null;

-- Marcador en vivo: una fila por sala mientras dura el partido (la escribe la Edge Function «liga»; la borra al terminar).
create table public.liga_vivo (
  sala_id        uuid primary key references public.salas(id) on delete cascade,
  partido_id     bigint references public.liga_partidos(id) on delete set null,   -- null = partido libre (no oficial)
  local          text not null default '',
  visitante      text not null default '',
  goles_local    smallint not null default 0 check (goles_local between 0 and 99),
  goles_visita   smallint not null default 0 check (goles_visita between 0 and 99),
  minuto         smallint not null default 0 check (minuto between 0 and 200),
  periodo        smallint not null default 0 check (periodo between 0 and 5),
  fase           text not null default 'en_juego' check (fase in ('previa', 'en_juego', 'descanso', 'pausado', 'final')),
  goles          jsonb not null default '[]'::jsonb,  -- [{m, l:"l"|"v"}]
  actualizado    timestamptz not null default now()
);

-- Lectura pública (son datos de la liga, ya publicados en la web). Escribir: solo service_role y las funciones de abajo.
alter table public.liga_ediciones enable row level security;
alter table public.liga_participantes enable row level security;
alter table public.liga_partidos enable row level security;
alter table public.liga_vivo enable row level security;
create policy liga_ediciones_leer on public.liga_ediciones for select using (true);
create policy liga_participantes_leer on public.liga_participantes for select using (true);
create policy liga_partidos_leer on public.liga_partidos for select using (true);
create policy liga_vivo_leer on public.liga_vivo for select using (true);
revoke insert, update, delete on public.liga_ediciones, public.liga_participantes, public.liga_partidos, public.liga_vivo from anon, authenticated;

-- Realtime: la web recibe cada cambio del marcador en vivo y de los partidos sin consultar (sin coste por visitante).
alter publication supabase_realtime add table public.liga_vivo;
alter publication supabase_realtime add table public.liga_partidos;

-- Tabla de posiciones calculada solo con resultados confirmados (3 pts victoria, 1 empate).
create view public.liga_tabla with (security_invoker = true) as
with filas as (
  select edicion_id, local as nombre, goles_local as gf, goles_visita as gc from public.liga_partidos where estado = 'confirmado'
  union all
  select edicion_id, visitante, goles_visita, goles_local from public.liga_partidos where estado = 'confirmado'
)
select p.edicion_id, p.nombre, p.club,
       count(f.gf)::int                                   as pj,
       count(*) filter (where f.gf > f.gc)::int           as g,
       count(*) filter (where f.gf = f.gc)::int           as e,
       count(*) filter (where f.gf < f.gc)::int           as p,
       coalesce(sum(f.gf), 0)::int                        as gf,
       coalesce(sum(f.gc), 0)::int                        as gc,
       (coalesce(sum(f.gf), 0) - coalesce(sum(f.gc), 0))::int as dg,
       (3 * count(*) filter (where f.gf > f.gc) + count(*) filter (where f.gf = f.gc))::int as pts
from public.liga_participantes p
left join filas f on f.edicion_id = p.edicion_id and f.nombre = p.nombre
group by p.edicion_id, p.nombre, p.club;

-- VALIDAR un resultado: SOLO el staff o el árbitro designado de ese partido (nunca el host ni los DT).
-- p_aceptar = true → confirmado (con p_goles_* puede fijar el marcador final); false → disputa.
create or replace function public.liga_resolver_resultado(p_partido bigint, p_aceptar boolean,
                                                          p_goles_local smallint default null, p_goles_visita smallint default null)
returns text language plpgsql security definer set search_path = '' as $$
declare
  r public.liga_partidos%rowtype;
  uid uuid;
begin
  perform private.uid_requerido();
  uid := auth.uid();
  select * into r from public.liga_partidos where id = p_partido for update;
  if not found then raise exception 'Partido no encontrado.' using errcode = 'P0002'; end if;
  if not (private.es_staff() or (r.arbitro is not null and r.arbitro = uid)) then
    raise exception 'Solo el staff o el árbitro designado de este partido validan el resultado.' using errcode = '42501';
  end if;

  if p_aceptar then
    if p_goles_local is not null or p_goles_visita is not null then
      if p_goles_local is null or p_goles_visita is null or p_goles_local not between 0 and 99 or p_goles_visita not between 0 and 99 then
        raise exception 'Marcador inválido.' using errcode = '22023';
      end if;
      update public.liga_partidos set goles_local = p_goles_local, goles_visita = p_goles_visita, origen = 'staff' where id = p_partido;
    elsif r.goles_local is null then
      raise exception 'No hay marcador que confirmar: indica el resultado.' using errcode = '22023';
    end if;
    update public.liga_partidos set estado = 'confirmado', resuelto_por = uid, resuelto_en = now() where id = p_partido;
    perform private.auditar_moderacion('editar', 'liga_partidos', p_partido::text,
      'Resultado validado · ' || r.local || ' vs ' || r.visitante || ' (fecha ' || r.fecha || ')',
      jsonb_build_object('goles_local', coalesce(p_goles_local, r.goles_local), 'goles_visita', coalesce(p_goles_visita, r.goles_visita)), null);
    return 'confirmado';
  else
    update public.liga_partidos set estado = 'disputa', resuelto_por = uid, resuelto_en = now() where id = p_partido;
    return 'disputa';
  end if;
end $$;
revoke all on function public.liga_resolver_resultado(bigint, boolean, smallint, smallint) from public, anon;
grant execute on function public.liga_resolver_resultado(bigint, boolean, smallint, smallint) to authenticated;

-- RECLAMAR: uno de los dos DT (con cuenta vinculada) pide revisión de un resultado propuesto o confirmado → disputa.
create or replace function public.liga_reclamar_resultado(p_partido bigint, p_motivo text)
returns text language plpgsql security definer set search_path = '' as $$
declare
  r public.liga_partidos%rowtype;
  uid uuid;
begin
  perform private.uid_requerido();
  uid := auth.uid();
  select * into r from public.liga_partidos where id = p_partido for update;
  if not found then raise exception 'Partido no encontrado.' using errcode = 'P0002'; end if;
  if not exists (select 1 from public.liga_participantes lp
                 where lp.edicion_id = r.edicion_id and lp.nombre in (r.local, r.visitante) and lp.usuario = uid) then
    raise exception 'Solo los DT de este partido pueden reclamar.' using errcode = '42501';
  end if;
  if r.estado not in ('propuesto', 'confirmado') then raise exception 'Este partido no tiene un resultado que reclamar.' using errcode = '22023'; end if;
  update public.liga_partidos
     set estado = 'disputa',
         detalle = detalle || jsonb_build_object('reclamo', jsonb_build_object('por', uid, 'motivo', left(coalesce(p_motivo, ''), 300), 'en', now()))
   where id = p_partido;
  return 'disputa';
end $$;
revoke all on function public.liga_reclamar_resultado(bigint, text) from public, anon;
grant execute on function public.liga_reclamar_resultado(bigint, text) to authenticated;

-- DESIGNAR ÁRBITRO de un partido (o quitarlo con null): solo el staff.
create or replace function public.liga_designar_arbitro(p_partido bigint, p_arbitro uuid)
returns void language plpgsql security definer set search_path = '' as $$
begin
  perform private.uid_requerido();
  if not private.es_staff() then raise exception 'Solo el staff designa árbitros.' using errcode = '42501'; end if;
  update public.liga_partidos set arbitro = p_arbitro where id = p_partido;
  if not found then raise exception 'Partido no encontrado.' using errcode = 'P0002'; end if;
  perform private.auditar_moderacion('editar', 'liga_partidos', p_partido::text,
    case when p_arbitro is null then 'Árbitro retirado' else 'Árbitro designado · ' || coalesce(private.nombre(p_arbitro), '') end,
    jsonb_build_object('arbitro', p_arbitro), null);
end $$;
revoke all on function public.liga_designar_arbitro(bigint, uuid) from public, anon;
grant execute on function public.liga_designar_arbitro(bigint, uuid) to authenticated;

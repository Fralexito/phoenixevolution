-- 145 · Resultados AUTOMÁTICOS con Phoenix Link en TORNEOS (camino B, decisión de Fralex, 25-oct-2026).
-- ESTADO: APLICADA el 25-oct-2026 13:50 (Lima); prueba supabase/tests/145_torneos_resultados_link_test.sql OK (15 casos).
-- «Recuerda que no solo las ligas serán premium, también torneos oficiales, campeonatos rápidos y etc.» → «Sí, mejor B, hazlo».
--
-- Idea: hasta hoy Phoenix Link solo sabía subir resultados a la Liga oficial (102/142). Esto abre la MISMA tubería para los
-- torneos de /torneos/ (097), sin mudarlos de página:
--   · Un torneo recibe resultados de Link si tiene PERMISO AUTOMÁTICO:
--       - «premium»: el organizador lo hizo premium (torneo_premium, 123; 300 gemas por defecto);
--       - «oficial»: el staff lo aprobó (pedido 144 aceptado en un formato que no es liga, o el botón del staff).
--   · Formatos con partidos fijos: eliminacion, doble, liguilla, idavuelta, grupos, suizo. (colina, escalera, circuito y libre
--     guardan su estado de otra forma: quedan para después.)
--   · Link pide la lista (sistema_torneo_partidos_link) y al terminar entrega el marcador (sistema_torneo_resultado_link) por la
--     Edge Function «torneos» (supabase/functions/torneos). Queda PROPUESTO en torneo_resultados_link; si llegan dos marcadores
--     distintos, queda en DISPUTA. Nada cambia en el cuadro hasta que alguien lo CONFIRME:
--       - premium → el organizador (o un moderador); oficial → el staff.
--   · Si el organizador anota el resultado a mano, la propuesta pendiente pasa a «reemplazado» sola.
--   · Interruptor del staff: phoenix_config clave «torneos_resultados» = false → la Edge Function responde TORNEOS_PAUSADOS.
--   · Mientras Phoenix Link no se actualice (fase 3, la lleva quien tenga el candado de Link) NO cambia nada para nadie:
--     los resultados se siguen anotando a mano como siempre.
--
-- También amplía la 144: «Pedir que sea oficial» vale para cualquier formato automático. Las ligas (liguilla/idavuelta) siguen
-- pasando a «Liga oficial» (143, ya funciona con Link); el resto queda oficial DENTRO de Torneos (torneo_resultados_auto).
-- Las funciones de la 144 se reemplazan con la misma firma (create or replace): torneo_solicitar_oficial y
-- staff_solicitud_oficial_resolver.
--
-- Requiere 097, 123, 143 y 144. Contrato para Link: docs/web-pes-link/CONTRATO-TORNEOS-LINK.md.
--
-- Cómo DESHACER:
--   drop trigger if exists zz_tl_resultado_link_reemplazo on public.torneos_libres_partidos;
--   drop function if exists private.tl_resultado_link_reemplazo(), private.tl_formato_auto(text), private.tl_auto(bigint),
--     private.tl_aplicar_resultado(bigint, text, int, int, text, uuid, text), private.tl_avisar_gestores(bigint, text, text, text),
--     public.torneo_auto_de(bigint), public.torneo_resultados_link_de(bigint), public.torneo_resultado_link_resolver(bigint, boolean, text, text),
--     public.staff_torneo_resultados_auto(bigint, boolean), public.sistema_torneo_partidos_link(uuid),
--     public.sistema_torneo_resultado_link(uuid, uuid, bigint, text, int, int, int, int, uuid, jsonb);
--   drop table if exists public.torneo_resultados_link, public.torneo_resultados_auto;   (quitar un permiso oficial = activo = false)
--   y volver a aplicar torneo_solicitar_oficial / staff_solicitud_oficial_resolver de la 144.

-- ── 1. Tablas ────────────────────────────────────────────────────────────────────────────────────────────────────────
-- Torneos OFICIALES dentro de /torneos/ (el permiso «premium» sale de torneo_premium, no se copia aquí).
create table if not exists public.torneo_resultados_auto (
  torneo_id    bigint primary key references public.torneos_libres(id) on delete cascade,
  origen       text not null default 'oficial' check (origen = 'oficial'),
  activo       boolean not null default true,
  activado_por uuid references public.perfiles(id) on delete set null,
  activado_en  timestamptz not null default now()
);
create index if not exists torneo_resultados_auto_activado_por on public.torneo_resultados_auto (activado_por);
alter table public.torneo_resultados_auto enable row level security;
revoke all on public.torneo_resultados_auto from public, anon, authenticated;

-- Marcadores que entrega Phoenix Link, a la espera de confirmación.
create table if not exists public.torneo_resultados_link (
  id           bigint generated always as identity primary key,
  torneo_id    bigint not null references public.torneos_libres(id) on delete cascade,
  clave        text not null,
  ga           int  not null check (ga between 0 and 99),
  gb           int  not null check (gb between 0 and 99),
  ganador      text check (ganador is null or ganador in ('a', 'b')),
  estado       text not null default 'propuesto' check (estado in ('propuesto', 'disputa', 'confirmado', 'rechazado', 'reemplazado')),
  detalle      jsonb not null default '{}'::jsonb,
  dispositivo  uuid,
  sala_id      uuid,
  propuesto_en timestamptz not null default now(),
  resuelto_por uuid references public.perfiles(id) on delete set null,
  resuelto_en  timestamptz,
  motivo       text check (motivo is null or char_length(motivo) <= 300)
);
-- Una sola propuesta viva por partido.
create unique index if not exists torneo_resultados_link_una_viva on public.torneo_resultados_link (torneo_id, clave) where estado in ('propuesto', 'disputa');
create index if not exists torneo_resultados_link_torneo on public.torneo_resultados_link (torneo_id, id desc);
create index if not exists torneo_resultados_link_resuelto_por on public.torneo_resultados_link (resuelto_por);
alter table public.torneo_resultados_link enable row level security;
revoke all on public.torneo_resultados_link from public, anon, authenticated;

-- ── 2. Ayudantes privados ────────────────────────────────────────────────────────────────────────────────────────────
-- Formatos cuyos partidos viven en torneos_libres_partidos (los únicos que Link puede llenar).
create or replace function private.tl_formato_auto(p_formato text) returns boolean
language sql immutable set search_path = '' as $$
  select p_formato in ('eliminacion', 'doble', 'liguilla', 'idavuelta', 'grupos', 'suizo')
$$;

-- Permiso automático del torneo: 'oficial', 'premium' o null.
create or replace function private.tl_auto(p_id bigint) returns text
language sql stable security definer set search_path = '' as $$
  select case
    when exists (select 1 from public.torneo_resultados_auto a where a.torneo_id = p_id and a.activo) then 'oficial'
    when exists (select 1 from public.torneo_premium p where p.torneo_id = p_id) then 'premium'
  end
$$;
revoke all on function private.tl_auto(bigint) from public, anon, authenticated;

-- Aviso a quien confirma: el staff si es oficial; el organizador si es premium.
create or replace function private.tl_avisar_gestores(p_id bigint, p_titulo text, p_mensaje text, p_ancla text default '') returns void
language plpgsql security definer set search_path = '' as $$
declare v_creador uuid; v_enlace text := 'torneo/?id=' || p_id || coalesce(p_ancla, '');
begin
  if private.tl_auto(p_id) = 'oficial' then
    insert into public.notificaciones (usuario_id, tipo, titulo, mensaje, enlace)
    select p.id, 'RESULTADO_PROPUESTO', left(p_titulo, 120), left(p_mensaje, 300), v_enlace
      from public.perfiles p where p.rol in ('ayudante', 'moderador', 'admin') order by p.id limit 50;
  else
    select creador into v_creador from public.torneos_libres where id = p_id;
    if v_creador is not null then
      insert into public.notificaciones (usuario_id, tipo, titulo, mensaje, enlace)
      values (v_creador, 'RESULTADO_PROPUESTO', left(p_titulo, 120), left(p_mensaje, 300), v_enlace);
    end if;
  end if;
end $$;
revoke all on function private.tl_avisar_gestores(bigint, text, text, text) from public, anon, authenticated;

-- Escribe un resultado en el cuadro con las MISMAS reglas que torneo_resultado (097), pero sin exigir sesión del jugador:
-- lo llaman torneo_resultado_link_resolver (ya comprobó quién confirma). Devuelve el ganador final.
create or replace function private.tl_aplicar_resultado(p_id bigint, p_clave text, p_ga int, p_gb int, p_ganador text, p_quien uuid, p_origen text)
returns text language plpgsql security definer set search_path = '' as $$
declare v_t public.torneos_libres%rowtype; v_p public.torneos_libres_partidos%rowtype; v_g text;
begin
  select * into v_t from public.torneos_libres where id = p_id;
  if not found then raise exception 'TORNEO_NO_ENCONTRADO'; end if;
  if v_t.estado <> 'en_curso' then raise exception 'TORNEO_NO_EN_CURSO: el torneo ya no está en curso.'; end if;
  select * into v_p from public.torneos_libres_partidos where torneo_id = p_id and clave = p_clave for update;
  if not found then raise exception 'PARTIDO_NO_ENCONTRADO'; end if;
  if v_p.a_nombre is null or v_p.b_nombre is null then raise exception 'CRUCE_SIN_DEFINIR'; end if;
  if p_ga is null or p_gb is null or p_ga < 0 or p_gb < 0 or p_ga > 999 or p_gb > 999 then raise exception 'MARCADOR_INVALIDO'; end if;
  if p_ga > p_gb then v_g := 'a'; elsif p_gb > p_ga then v_g := 'b';
  elsif v_p.eliminatoria then
    if p_ganador in ('a', 'b') then v_g := p_ganador; else raise exception 'EMPATE_SIN_GANADOR: en eliminatoria elige quién pasa'; end if;
  else v_g := null; end if;
  if v_p.jugado and v_g is distinct from v_p.ganador and exists (
    select 1 from public.torneos_libres_partidos d where d.torneo_id = p_id and d.jugado
      and (d.a_slot ->> 'ganadorDe' = p_clave or d.a_slot ->> 'perdedorDe' = p_clave or d.b_slot ->> 'ganadorDe' = p_clave or d.b_slot ->> 'perdedorDe' = p_clave)
  ) then raise exception 'YA_AVANZO: el siguiente partido ya se jugó; corrígelo primero'; end if;
  update public.torneos_libres_partidos set ga = p_ga, gb = p_gb, ganador = v_g, jugado = true, jugado_en = now(), reportado_por = p_quien where id = v_p.id;
  perform private.tl_propagar(p_id);
  perform private.tl_evento(p_id, 'resultado', jsonb_build_object('clave', p_clave, 'ga', p_ga, 'gb', p_gb, 'ganador', v_g, 'origen', p_origen));
  return v_g;
end $$;
revoke all on function private.tl_aplicar_resultado(bigint, text, int, int, text, uuid, text) from public, anon, authenticated;

-- Si el resultado se anota por otra vía (a mano), la propuesta viva de ese partido queda «reemplazado».
create or replace function private.tl_resultado_link_reemplazo() returns trigger
language plpgsql security definer set search_path = '' as $$
begin
  if new.jugado and (not old.jugado or new.ga is distinct from old.ga or new.gb is distinct from old.gb or new.ganador is distinct from old.ganador) then
    update public.torneo_resultados_link set estado = 'reemplazado', resuelto_en = now(), motivo = 'Se anotó el resultado por otra vía.'
     where torneo_id = new.torneo_id and clave = new.clave and estado in ('propuesto', 'disputa');
  end if;
  return new;
end $$;
revoke all on function private.tl_resultado_link_reemplazo() from public, anon, authenticated;
create or replace trigger zz_tl_resultado_link_reemplazo after update of jugado, ga, gb, ganador on public.torneos_libres_partidos
  for each row execute function private.tl_resultado_link_reemplazo();

-- ── 3. Lectura para la web ───────────────────────────────────────────────────────────────────────────────────────────
-- Permiso automático de un torneo: { origen: 'oficial'|'premium'|null, formato_ok, en_curso }.
create or replace function public.torneo_auto_de(p_torneo bigint)
returns jsonb language sql stable security definer set search_path = '' as $$
  select jsonb_build_object('origen', private.tl_auto(t.id), 'formato_ok', private.tl_formato_auto(t.formato), 'en_curso', t.estado = 'en_curso')
    from public.torneos_libres t
   where t.id = p_torneo and (not t.oculto or private.es_moderador())
$$;
revoke all on function public.torneo_auto_de(bigint) from public;
grant execute on function public.torneo_auto_de(bigint) to anon, authenticated;

-- Propuestas vivas de Link de un torneo (para pintar «Link propuso 2-1» y la caja de confirmar). Sin datos del host.
create or replace function public.torneo_resultados_link_de(p_torneo bigint)
returns table (id bigint, clave text, ga int, gb int, ganador text, estado text, propuesto_en timestamptz, pk_a int, pk_b int)
language sql stable security definer set search_path = '' as $$
  select r.id, r.clave, r.ga, r.gb, r.ganador, r.estado, r.propuesto_en,
         nullif(r.detalle -> 'juego' ->> 'pk_a', '')::int, nullif(r.detalle -> 'juego' ->> 'pk_b', '')::int
    from public.torneo_resultados_link r
    join public.torneos_libres t on t.id = r.torneo_id
   where r.torneo_id = p_torneo and r.estado in ('propuesto', 'disputa')
     and (not t.oculto or private.es_moderador())
     and (t.visibilidad <> 'privado' or private.tl_gestiona(t.id) or private.tl_inscrito(t.id) or private.es_staff())
   order by r.id
$$;
revoke all on function public.torneo_resultados_link_de(bigint) from public;
grant execute on function public.torneo_resultados_link_de(bigint) to anon, authenticated;

-- ── 4. Confirmar o rechazar (organizador si es premium; staff si es oficial) ─────────────────────────────────────────
create or replace function public.torneo_resultado_link_resolver(p_id bigint, p_aceptar boolean, p_ganador text default null, p_motivo text default null)
returns text language plpgsql security definer set search_path = '' as $$
declare v_r public.torneo_resultados_link%rowtype; v_auto text; v_yo uuid; v_ok boolean; v_g text; v_motivo text;
begin
  v_yo := private.uid_requerido();
  select * into v_r from public.torneo_resultados_link where id = p_id for update;
  if not found then raise exception 'Resultado no encontrado.' using errcode = 'P0002'; end if;
  if v_r.estado not in ('propuesto', 'disputa') then raise exception 'Este resultado ya fue resuelto.' using errcode = '22023'; end if;
  v_auto := private.tl_auto(v_r.torneo_id);
  v_ok := case when v_auto = 'oficial' then private.es_staff() else private.tl_gestiona(v_r.torneo_id) end;
  if not v_ok then
    raise exception '%', case when v_auto = 'oficial' then 'En un torneo oficial confirma el staff.' else 'Solo el organizador confirma los resultados.' end using errcode = '42501';
  end if;

  if coalesce(p_aceptar, false) then
    -- Se marca primero (así el disparador de reemplazo no lo toca) y luego se escribe en el cuadro.
    update public.torneo_resultados_link set estado = 'confirmado', resuelto_por = v_yo, resuelto_en = now() where id = v_r.id;
    v_g := private.tl_aplicar_resultado(v_r.torneo_id, v_r.clave, v_r.ga, v_r.gb, coalesce(p_ganador, v_r.ganador), v_yo, 'link');
    if v_g is distinct from v_r.ganador then update public.torneo_resultados_link set ganador = v_g where id = v_r.id; end if;
    return v_g;
  end if;

  v_motivo := nullif(btrim(coalesce(p_motivo, '')), '');
  if v_motivo is not null and char_length(v_motivo) > 300 then raise exception 'El motivo puede tener hasta 300 letras.' using errcode = '22001'; end if;
  update public.torneo_resultados_link set estado = 'rechazado', resuelto_por = v_yo, resuelto_en = now(), motivo = v_motivo where id = v_r.id;
  perform private.tl_evento(v_r.torneo_id, 'resultado_link_rechazado', jsonb_build_object('clave', v_r.clave, 'ga', v_r.ga, 'gb', v_r.gb, 'motivo', v_motivo));
  return null;
end $$;
revoke all on function public.torneo_resultado_link_resolver(bigint, boolean, text, text) from public, anon;
grant execute on function public.torneo_resultado_link_resolver(bigint, boolean, text, text) to authenticated;

-- Staff: activar o quitar el permiso automático OFICIAL de un torneo (formatos automáticos). Queda en la auditoría.
create or replace function public.staff_torneo_resultados_auto(p_torneo bigint, p_activar boolean)
returns void language plpgsql security definer set search_path = '' as $$
declare v_t public.torneos_libres%rowtype; v_yo uuid;
begin
  v_yo := private.uid_requerido();
  if not private.es_staff() then raise exception 'Solo el staff hace oficial un torneo.' using errcode = '42501'; end if;
  select * into v_t from public.torneos_libres where id = p_torneo;
  if not found or v_t.oculto then raise exception 'Torneo no encontrado.' using errcode = 'P0002'; end if;
  if coalesce(p_activar, false) then
    if not private.tl_formato_auto(v_t.formato) then
      raise exception 'Este formato aún no recibe resultados de Phoenix Link (sí: llaves, doble eliminación, todos contra todos, ida y vuelta, grupos y suizo).' using errcode = '22023';
    end if;
    insert into public.torneo_resultados_auto (torneo_id, activado_por) values (p_torneo, v_yo)
      on conflict (torneo_id) do update set activo = true, activado_por = excluded.activado_por, activado_en = now();
    perform private.tl_evento(p_torneo, 'oficial_auto', '{}'::jsonb);
    perform private.auditar_moderacion('editar', 'torneos_libres', p_torneo::text, 'Torneo oficial (resultados por Phoenix Link) · ' || v_t.nombre, null, null);
  else
    update public.torneo_resultados_auto set activo = false, activado_por = v_yo, activado_en = now() where torneo_id = p_torneo and activo;
    if found then
      perform private.tl_evento(p_torneo, 'oficial_auto_quitado', '{}'::jsonb);
      perform private.auditar_moderacion('editar', 'torneos_libres', p_torneo::text, 'Quitado el permiso oficial · ' || v_t.nombre, null, null);
    end if;
  end if;
end $$;
revoke all on function public.staff_torneo_resultados_auto(bigint, boolean) from public, anon;
grant execute on function public.staff_torneo_resultados_auto(bigint, boolean) to authenticated;

-- ── 5. Para Phoenix Link (solo la Edge Function «torneos», con la clave de servicio) ─────────────────────────────────
-- Partidos por jugar de los torneos EN CURSO con permiso automático, con los Parsec de cada jugador (como /v1/liga/partidos).
create or replace function public.sistema_torneo_partidos_link(p_host uuid)
returns jsonb language sql stable security definer set search_path = '' as $$
  with ts as (
    select t.id, t.nombre, t.formato, private.tl_auto(t.id) as auto
      from public.torneos_libres t
     where t.estado = 'en_curso' and not t.oculto and private.tl_formato_auto(t.formato) and private.tl_auto(t.id) is not null
  ), ps as (
    select p.torneo_id, p.clave, p.ronda, p.grupo, p.orden, p.eliminatoria, p.a_nombre, p.b_nombre
      from public.torneos_libres_partidos p join ts on ts.id = p.torneo_id
     where not p.jugado and p.a_nombre is not null and p.b_nombre is not null
  ), jug as (
    select i.torneo_id, lower(i.nombre) as nom, i.usuario,
           coalesce((select jsonb_agg(c.parsec_id) from public.cuentas_parsec c where c.usuario = i.usuario), '[]'::jsonb) as parsec
      from public.torneos_libres_inscritos i join ts on ts.id = i.torneo_id
     where not i.retirado
  )
  select jsonb_build_object('partidos', coalesce(jsonb_agg(jsonb_build_object(
           'torneo_id', ts.id, 'torneo', ts.nombre, 'formato', ts.formato, 'permiso', ts.auto,
           'clave', ps.clave, 'ronda', ps.ronda, 'grupo', ps.grupo, 'orden', ps.orden, 'eliminatoria', ps.eliminatoria,
           'estado', coalesce((select r.estado from public.torneo_resultados_link r where r.torneo_id = ps.torneo_id and r.clave = ps.clave and r.estado in ('propuesto', 'disputa')), 'pendiente'),
           'a', jsonb_build_object('nombre', ps.a_nombre, 'parsec', coalesce(ja.parsec, '[]'::jsonb), 'mio', ja.usuario is not distinct from p_host and ja.usuario is not null),
           'b', jsonb_build_object('nombre', ps.b_nombre, 'parsec', coalesce(jb.parsec, '[]'::jsonb), 'mio', jb.usuario is not distinct from p_host and jb.usuario is not null)
         ) order by ts.id, ps.orden, ps.clave), '[]'::jsonb))
    from ps join ts on ts.id = ps.torneo_id
    left join jug ja on ja.torneo_id = ps.torneo_id and ja.nom = lower(ps.a_nombre)
    left join jug jb on jb.torneo_id = ps.torneo_id and jb.nom = lower(ps.b_nombre)
$$;
revoke all on function public.sistema_torneo_partidos_link(uuid) from public, anon, authenticated;
grant execute on function public.sistema_torneo_partidos_link(uuid) to service_role;

-- Entrega de un marcador por Phoenix Link. La Edge Function ya comprobó el token del dispositivo y que el host está aprobado.
-- Devuelve { estado: 'propuesto'|'disputa', repetido }. Errores con prefijo de código (los traduce la Edge Function).
create or replace function public.sistema_torneo_resultado_link(p_dispositivo uuid, p_host uuid, p_torneo bigint, p_clave text,
  p_ga int, p_gb int, p_pk_a int default null, p_pk_b int default null, p_sala uuid default null, p_detalle jsonb default '{}'::jsonb)
returns jsonb language plpgsql security definer set search_path = '' as $$
declare v_t public.torneos_libres%rowtype; v_p public.torneos_libres_partidos%rowtype; v_r public.torneo_resultados_link%rowtype;
        v_g text; v_estado text; v_det jsonb;
begin
  select * into v_t from public.torneos_libres where id = p_torneo;
  if not found or v_t.oculto then raise exception 'TORNEO_NO_ENCONTRADO'; end if;
  if private.tl_auto(p_torneo) is null then raise exception 'TORNEO_SIN_PERMISO: este torneo no es premium ni oficial.'; end if;
  if not private.tl_formato_auto(v_t.formato) then raise exception 'FORMATO_NO_SOPORTADO'; end if;
  if v_t.estado <> 'en_curso' then raise exception 'TORNEO_NO_EN_CURSO'; end if;
  select * into v_p from public.torneos_libres_partidos where torneo_id = p_torneo and clave = p_clave;
  if not found then raise exception 'PARTIDO_NO_ENCONTRADO'; end if;
  if v_p.a_nombre is null or v_p.b_nombre is null then raise exception 'CRUCE_SIN_DEFINIR'; end if;
  if v_p.jugado then raise exception 'YA_JUGADO'; end if;
  if p_ga is null or p_gb is null or p_ga not between 0 and 99 or p_gb not between 0 and 99 then raise exception 'MARCADOR_INVALIDO'; end if;

  -- Ganador sugerido: por goles; si empatan en una eliminatoria, por los penales del juego (si los hubo).
  v_g := case when p_ga > p_gb then 'a' when p_gb > p_ga then 'b'
              when v_p.eliminatoria and p_pk_a is not null and p_pk_b is not null and p_pk_a <> p_pk_b then case when p_pk_a > p_pk_b then 'a' else 'b' end
         end;
  v_det := jsonb_build_object('juego', coalesce(p_detalle, '{}'::jsonb) || jsonb_build_object('pk_a', p_pk_a, 'pk_b', p_pk_b, 'host', p_host));

  select * into v_r from public.torneo_resultados_link where torneo_id = p_torneo and clave = p_clave and estado in ('propuesto', 'disputa') for update;
  if found then
    if v_r.ga = p_ga and v_r.gb = p_gb and v_r.ganador is not distinct from v_g then
      return jsonb_build_object('estado', v_r.estado, 'repetido', true);   -- idempotente: la misma propuesta
    end if;
    update public.torneo_resultados_link
       set ga = p_ga, gb = p_gb, ganador = v_g, estado = 'disputa', propuesto_en = now(), dispositivo = p_dispositivo, sala_id = p_sala,
           detalle = v_det || jsonb_build_object('anterior', jsonb_build_object('ga', v_r.ga, 'gb', v_r.gb, 'ganador', v_r.ganador))
     where id = v_r.id;
    v_estado := 'disputa';
  else
    insert into public.torneo_resultados_link (torneo_id, clave, ga, gb, ganador, detalle, dispositivo, sala_id)
    values (p_torneo, p_clave, p_ga, p_gb, v_g, v_det, p_dispositivo, p_sala);
    v_estado := 'propuesto';
  end if;

  perform private.tl_evento(p_torneo, 'resultado_link', jsonb_build_object('clave', p_clave, 'ga', p_ga, 'gb', p_gb, 'estado', v_estado));
  perform private.tl_avisar_gestores(p_torneo,
    case when v_estado = 'disputa' then 'Phoenix Link mandó otro marcador' else 'Phoenix Link mandó un resultado' end,
    left(v_p.a_nombre || ' ' || p_ga || '–' || p_gb || ' ' || v_p.b_nombre || ' en «' || v_t.nombre || '». Confírmalo para que cuente.', 300),
    '#res-link');
  return jsonb_build_object('estado', v_estado, 'repetido', false);
end $$;
revoke all on function public.sistema_torneo_resultado_link(uuid, uuid, bigint, text, int, int, int, int, uuid, jsonb) from public, anon, authenticated;
grant execute on function public.sistema_torneo_resultado_link(uuid, uuid, bigint, text, int, int, int, int, uuid, jsonb) to service_role;

-- ── 6. 144 ampliada: «Pedir que sea oficial» para cualquier formato automático ─────────────────────────────────────────
create or replace function public.torneo_solicitar_oficial(p_torneo bigint, p_nota text default null)
returns bigint language plpgsql security definer set search_path = '' as $$
declare t public.torneos_libres%rowtype; yo uuid; nid bigint; ultimo timestamptz; v_nota text;
begin
  yo := private.uid_requerido();
  select * into t from public.torneos_libres where id = p_torneo for update;
  if not found or t.oculto then raise exception 'Torneo no encontrado.' using errcode = 'P0002'; end if;
  if t.creador is distinct from yo then raise exception 'Solo quien creó la liga puede pedir que sea oficial.' using errcode = '42501'; end if;
  if t.meta ? 'oficial' or exists (select 1 from public.torneo_resultados_auto a where a.torneo_id = p_torneo and a.activo) then
    raise exception 'Este torneo ya es oficial.' using errcode = '22023';
  end if;
  if not private.tl_formato_auto(t.formato) then
    raise exception 'Este formato aún no puede ser oficial (Phoenix Link no lo conoce todavía).' using errcode = '22023';
  end if;
  if t.estado <> 'inscripcion' then raise exception 'Solo se puede pedir antes de empezar.' using errcode = '22023'; end if;
  if exists (select 1 from public.torneo_solicitudes_oficial where torneo_id = p_torneo and estado = 'pendiente') then
    raise exception 'Ya hay un pedido pendiente para este torneo. El staff lo revisará pronto.' using errcode = '23505';
  end if;
  select max(resuelto_en) into ultimo from public.torneo_solicitudes_oficial where torneo_id = p_torneo and estado = 'rechazada';
  if ultimo is not null and ultimo > now() - interval '24 hours' then
    raise exception 'El staff rechazó el pedido hace poco. Revisa el motivo y vuelve a pedirlo en 24 horas.' using errcode = '22023';
  end if;
  v_nota := nullif(btrim(coalesce(p_nota, '')), '');
  if v_nota is not null and char_length(v_nota) > 300 then raise exception 'La nota puede tener hasta 300 letras.' using errcode = '22001'; end if;
  insert into public.torneo_solicitudes_oficial (torneo_id, solicitante, nota) values (p_torneo, yo, v_nota) returning id into nid;
  perform private.tl_evento(p_torneo, 'oficial_pedido', jsonb_build_object('solicitud', nid));
  perform private.tl_avisar_staff_solicitud(p_torneo, 'Piden hacer oficial un torneo',
    left('«' || t.nombre || '» quiere ser oficial.' || coalesce(' Nota: ' || v_nota, ''), 300));
  return nid;
end $$;

create or replace function public.staff_solicitud_oficial_resolver(p_id bigint, p_aceptar boolean, p_motivo text default null)
returns text language plpgsql security definer set search_path = '' as $$
declare s public.torneo_solicitudes_oficial%rowtype; t public.torneos_libres%rowtype; eid text; v_motivo text;
begin
  perform private.uid_requerido();
  if not private.es_staff() then raise exception 'Solo el staff resuelve los pedidos.' using errcode = '42501'; end if;
  select * into s from public.torneo_solicitudes_oficial where id = p_id for update;
  if not found then raise exception 'Pedido no encontrado.' using errcode = 'P0002'; end if;
  if s.estado <> 'pendiente' then raise exception 'Este pedido ya fue resuelto.' using errcode = '22023'; end if;
  select * into t from public.torneos_libres where id = s.torneo_id;
  if coalesce(p_aceptar, false) then
    if t.formato in ('liguilla', 'idavuelta') then
      -- Ligas: pasan a «Liga oficial» (143), que ya funciona con Link. El disparador de la 144 marca 'aceptada' y avisa.
      eid := public.staff_torneo_hacer_oficial(s.torneo_id);
      update public.torneo_solicitudes_oficial set estado = 'aceptada', resuelto_por = (select auth.uid()), resuelto_en = now()
       where id = s.id and estado = 'pendiente';
      return eid;
    end if;
    -- Otros formatos: quedan oficiales dentro de Torneos (resultados por Phoenix Link, los confirma el staff).
    perform public.staff_torneo_resultados_auto(s.torneo_id, true);
    update public.torneo_solicitudes_oficial set estado = 'aceptada', resuelto_por = (select auth.uid()), resuelto_en = now() where id = s.id;
    insert into public.notificaciones (usuario_id, tipo, titulo, mensaje, enlace)
    values (s.solicitante, 'LIGA_OFICIAL', '¡Tu torneo ya es oficial!',
            left('«' || t.nombre || '» ahora es oficial: Phoenix Link sube los resultados y el staff los confirma.', 300), 'torneo/?id=' || s.torneo_id);
    return 'oficial';
  end if;
  v_motivo := btrim(coalesce(p_motivo, ''));
  if char_length(v_motivo) < 5 then raise exception 'Escribe el motivo del rechazo (mínimo 5 letras): lo leerá quien lo pidió.' using errcode = '22023'; end if;
  if char_length(v_motivo) > 300 then raise exception 'El motivo puede tener hasta 300 letras.' using errcode = '22001'; end if;
  update public.torneo_solicitudes_oficial set estado = 'rechazada', motivo = v_motivo, resuelto_por = (select auth.uid()), resuelto_en = now()
   where id = s.id;
  insert into public.notificaciones (usuario_id, tipo, titulo, mensaje, enlace)
  values (s.solicitante, 'LIGA_OFICIAL', 'Tu torneo sigue siendo casual',
          left('El staff no aceptó hacer oficial «' || t.nombre || '». Motivo: ' || v_motivo, 300), 'torneo/?id=' || s.torneo_id);
  perform private.tl_evento(s.torneo_id, 'oficial_rechazado', jsonb_build_object('motivo', v_motivo));
  perform private.auditar_moderacion('editar', 'torneos_libres', s.torneo_id::text, 'Pedido de oficial rechazado · ' || t.nombre,
                                     jsonb_build_object('solicitud', s.id), v_motivo);
  return null;
end $$;

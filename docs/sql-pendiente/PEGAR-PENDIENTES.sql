-- ════════════════════════════════════════════════════════════════════════════════════════════════════
-- PARA FRALEX · pegar TODO este archivo en Supabase → SQL Editor → Run (25-oct-2026).
-- Contiene, en orden, las migraciones que la web ya espera pero que no se pudieron aplicar (el permiso se canceló):
--   145 resultados automáticos de Link en torneos · 148 goleadores automáticos · 149 prode · 152 avisos (campana y Discord).
-- Es seguro: cada parte usa «if not exists» / «create or replace»; correrlo dos veces no rompe nada.
-- Después: desplegar las Edge Functions «torneos» y «goles» con verify_jwt = false (ver docs/sql-pendiente/LEEME.md).
-- ════════════════════════════════════════════════════════════════════════════════════════════════════

-- ───────────── 145_torneos_resultados_link ─────────────
begin;
-- 145 · Resultados AUTOMÁTICOS con Phoenix Link en TORNEOS (camino B, decisión de Fralex, 25-oct-2026).
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
drop trigger if exists zz_tl_resultado_link_reemplazo on public.torneos_libres_partidos;
create trigger zz_tl_resultado_link_reemplazo after update of jugado, ga, gb, ganador on public.torneos_libres_partidos
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

commit;

-- ───────────── 148_goleadores_link ─────────────
begin;
-- 148 · Goleadores automáticos (función nueva 5/8, 25-oct-2026). Phoenix Link manda los goles (futbolista, minuto, asistencia)
-- ESTADO: escrita, NO APLICADA (Supabase canceló el permiso el 25-oct-2026). Fralex la pega a mano en el SQL Editor.
-- de un DUELO que se jugó en su sala; la web arma la tabla de goleadores de la comunidad y la de cada jugador.
-- Entrada: public.sistema_duelo_goles_link (solo service_role → la llama la Edge Function «goles», ver CONTRATO-GOLES-LINK.md).
-- Blindaje:
--   · Solo cuenta un duelo si su marcador está CONFIRMADO por los dos líderes y los goles de Link CUADRAN con ese marcador
--     (si no cuadran, se guardan pero no suman: el marcador humano manda). Así un Link con fallo no ensucia la tabla.
--   · Link solo puede mandar goles de un duelo atado a una sala de ESE dispositivo (salas.reto_id) → nadie inventa goles ajenos.
--   · Reenviar es seguro: reemplaza los goles de Link de ese duelo (idempotente). Máximo 40 goles, nombres sin < >.
--   · Nombres de futbolista normalizados (espacios, mayúsculas) para que «Messi» y « messi » sumen juntos.
--   · Tabla cerrada por RLS; lectura solo por funciones con sesión.
create table if not exists public.duelo_goles (
  id bigint generated always as identity primary key,
  reto_id integer not null references public.retos_matchmaking (id) on delete cascade,
  lado text not null check (lado in ('A', 'B')),        -- a quién se le ANOTA el gol (en un autogol, al rival del que lo hizo)
  goleador text not null check (char_length(goleador) between 1 and 60 and goleador !~ '[<>]'),
  minuto smallint not null check (minuto between 0 and 130),
  asistente text check (asistente is null or (char_length(asistente) between 1 and 60 and asistente !~ '[<>]')),
  tipo text not null default 'gol' check (tipo in ('gol', 'penal', 'en_contra')),
  dispositivo uuid references public.dispositivos_host (id) on delete set null,
  creado timestamptz not null default now(),
  check (asistente is null or tipo = 'gol')
);
create index if not exists duelo_goles_reto_idx on public.duelo_goles (reto_id);
alter table public.duelo_goles enable row level security;
revoke all on public.duelo_goles from anon, authenticated;

create or replace function private.nombre_futbolista(t text) returns text
language sql immutable set search_path = '' as $$ select nullif(btrim(regexp_replace(coalesce(t, ''), '\s+', ' ', 'g')), '') $$;

-- Duelos cuyos goles de Link valen: marcador confirmado y los goles por lado coinciden.
create or replace function private.duelos_goles_validos() returns table (reto_id integer)
language sql stable security definer set search_path = '' as $$
  select g.reto_id from public.duelo_goles g join public.resultados_duelo r on r.reto_id = g.reto_id and r.estado = 'CONFIRMADO'
  group by g.reto_id, r.goles_a, r.goles_b
  having count(*) filter (where g.lado = 'A') = r.goles_a and count(*) filter (where g.lado = 'B') = r.goles_b
$$;
revoke all on function private.nombre_futbolista(text), private.duelos_goles_validos() from public, anon, authenticated;

-- ── Entrada desde Link (service_role) ─────────────────────────────────────────────────────────────────────
create or replace function public.sistema_duelo_goles_link(p_dispositivo uuid, p_reto integer, p_goles jsonb) returns jsonb
language plpgsql security definer set search_path = '' as $$
declare v_g jsonb; v_n integer := 0; v_nombre text; v_asist text; v_tipo text;
begin
  if p_goles is null or jsonb_typeof(p_goles) <> 'array' then raise exception 'CAMPO_INVALIDO goles debe ser una lista'; end if;
  if jsonb_array_length(p_goles) > 40 then raise exception 'CAMPO_INVALIDO demasiados goles (máx. 40)'; end if;
  if not exists (select 1 from public.dispositivos_host d where d.id = p_dispositivo and d.revocado is null) then raise exception 'TOKEN_REVOCADO'; end if;
  if not exists (select 1 from public.retos_matchmaking r where r.id = p_reto) then raise exception 'DUELO_NO_ENCONTRADO'; end if;
  if not exists (select 1 from public.salas s where s.reto_id = p_reto and s.dispositivo = p_dispositivo and s.abierta_en > now() - interval '12 hours') then
    raise exception 'DUELO_NO_ES_DE_ESTA_SALA'; end if;
  if exists (select 1 from public.retos_matchmaking r where r.id = p_reto and r.estado::text not in ('EN_JUEGO', 'FINALIZADO')) then raise exception 'DUELO_NO_JUGADO'; end if;
  -- validar todo ANTES de borrar nada
  for v_g in select * from jsonb_array_elements(p_goles) loop
    if jsonb_typeof(v_g) <> 'object' or coalesce(v_g ->> 'lado', '') not in ('A', 'B') then raise exception 'CAMPO_INVALIDO lado'; end if;
    v_nombre := private.nombre_futbolista(v_g ->> 'goleador');
    if v_nombre is null or char_length(v_nombre) > 60 or v_nombre ~ '[<>]' then raise exception 'CAMPO_INVALIDO goleador'; end if;
    if coalesce(v_g ->> 'minuto', '') !~ '^\d{1,3}$' or (v_g ->> 'minuto')::integer > 130 then raise exception 'CAMPO_INVALIDO minuto'; end if;
    v_tipo := coalesce(v_g ->> 'tipo', 'gol');
    if v_tipo not in ('gol', 'penal', 'en_contra') then raise exception 'CAMPO_INVALIDO tipo'; end if;
    v_asist := private.nombre_futbolista(v_g ->> 'asistente');
    if v_asist is not null and (v_tipo <> 'gol' or char_length(v_asist) > 60 or v_asist ~ '[<>]') then raise exception 'CAMPO_INVALIDO asistente'; end if;
  end loop;
  delete from public.duelo_goles where reto_id = p_reto;
  for v_g in select * from jsonb_array_elements(p_goles) loop
    v_tipo := coalesce(v_g ->> 'tipo', 'gol');
    insert into public.duelo_goles (reto_id, lado, goleador, minuto, asistente, tipo, dispositivo)
    values (p_reto, v_g ->> 'lado', private.nombre_futbolista(v_g ->> 'goleador'), (v_g ->> 'minuto')::smallint,
      case when v_tipo = 'gol' then private.nombre_futbolista(v_g ->> 'asistente') end, v_tipo, p_dispositivo);
    v_n := v_n + 1;
  end loop;
  return jsonb_build_object('guardados', v_n,
    'cuadra', exists (select 1 from private.duelos_goles_validos() x where x.reto_id = p_reto),
    'marcador_confirmado', exists (select 1 from public.resultados_duelo r where r.reto_id = p_reto and r.estado = 'CONFIRMADO'));
end $$;
revoke all on function public.sistema_duelo_goles_link(uuid, integer, jsonb) from public, anon, authenticated;
grant execute on function public.sistema_duelo_goles_link(uuid, integer, jsonb) to service_role;

-- ── Lectura (con sesión) ──────────────────────────────────────────────────────────────────────────────────
-- Tabla de la comunidad: futbolistas con más goles (sin autogoles) y asistencias en duelos válidos. p_dias null = siempre.
create or replace function public.goleadores_comunidad(p_dias integer default 30, p_limite integer default 10) returns jsonb
language plpgsql stable security definer set search_path = '' as $$
declare v_desde timestamptz := case when p_dias is null then '-infinity'::timestamptz else now() - make_interval(days => greatest(1, least(p_dias, 3650))) end;
  v_lim integer := greatest(1, least(coalesce(p_limite, 10), 50)); v_g jsonb; v_a jsonb; v_duelos integer;
begin
  perform private.uid_requerido();
  with ok as (select v.reto_id from private.duelos_goles_validos() v join public.retos_matchmaking r on r.id = v.reto_id
              where coalesce(r.cerrado_at, r.created_at) >= v_desde),
  g as (select lower(goleador) k, min(goleador) nombre, count(*) n from public.duelo_goles where reto_id in (select reto_id from ok) and tipo <> 'en_contra' group by 1),
  a as (select lower(asistente) k, min(asistente) nombre, count(*) n from public.duelo_goles where reto_id in (select reto_id from ok) and asistente is not null group by 1)
  select (select coalesce(jsonb_agg(jsonb_build_object('nombre', nombre, 'goles', n) order by n desc, nombre), '[]'::jsonb) from (select * from g order by n desc, nombre limit v_lim) x),
         (select coalesce(jsonb_agg(jsonb_build_object('nombre', nombre, 'asistencias', n) order by n desc, nombre), '[]'::jsonb) from (select * from a order by n desc, nombre limit v_lim) x),
         (select count(*) from ok)
    into v_g, v_a, v_duelos;
  return jsonb_build_object('goleadores', v_g, 'asistentes', v_a, 'duelos', v_duelos, 'dias', p_dias);
end $$;

-- Goles de un duelo (para quien puede ver su resultado: jugadores, host, staff).
create or replace function public.goles_de_duelo(p_reto integer) returns jsonb
language plpgsql stable security definer set search_path = '' as $$
declare v_yo uuid := (select auth.uid()); r public.retos_matchmaking;
begin
  if v_yo is null then return null; end if;
  select * into r from public.retos_matchmaking where id = p_reto;
  if not found then return null; end if;
  if not (private.lado_en_reto(p_reto, v_yo) is not null or v_yo = r.host_id or private.es_moderador()
          or exists (select 1 from public.reto_espectadores e where e.reto_id = p_reto and e.usuario_id = v_yo and e.estado = 'APROBADO')) then return null; end if;
  return jsonb_build_object('reto_id', p_reto,
    'cuadra', exists (select 1 from private.duelos_goles_validos() x where x.reto_id = p_reto),
    'goles', (select coalesce(jsonb_agg(jsonb_build_object('lado', lado, 'goleador', goleador, 'minuto', minuto, 'asistente', asistente, 'tipo', tipo) order by minuto, id), '[]'::jsonb)
              from public.duelo_goles where reto_id = p_reto));
end $$;

revoke all on function public.goleadores_comunidad(integer, integer), public.goles_de_duelo(integer) from public, anon;
grant execute on function public.goleadores_comunidad(integer, integer), public.goles_de_duelo(integer) to authenticated;

commit;

-- ───────────── 149_prode ─────────────
begin;
-- 149 · Prode (función nueva 6/8, 25-oct-2026). Juego de PRONÓSTICOS sobre los duelos agendados de la comunidad.
-- ESTADO: escrita, NO APLICADA (Supabase canceló el permiso el 25-oct-2026). Fralex la pega a mano en el SQL Editor.
-- Entrar es GRATIS: no se pone nada en juego (no es apuesta). Premio en ascuas GRATIS (regla 140: tipo «ganado»).
-- Puntos: marcador exacto 10 · ganador (o empate) acertado 3 · nada 0. Tope: 100 ascuas por semana (lunes a domingo, hora de Lima).
-- Blindaje:
--   · No puedes pronosticar un duelo en el que juegas o eres host (no hay conflicto de interés).
--   · Se cierra al empezar: solo duelos ACEPTADO con fecha futura (o sin fecha mientras sigan ACEPTADO). Cambiar el pronóstico vale hasta el cierre.
--   · Se liquida SOLO cuando el marcador queda CONFIRMADO por los dos líderes (o lo resuelve el staff): un trigger lo hace una vez.
--   · El premio usa una clave única por pronóstico → nunca se paga dos veces aunque el trigger corra de nuevo.
--   · El tope semanal se calcula sobre lo ya pagado por el prode esa semana; si se llena, los puntos cuentan en el ranking pero no dan ascuas.
--   · Tabla cerrada por RLS; todo por funciones. Interruptor del staff: phoenix_config «prode» = false pausa pronósticos y premios.
create table if not exists public.prode_pronosticos (
  reto_id integer not null references public.retos_matchmaking (id) on delete cascade,
  usuario uuid not null references public.perfiles (id) on delete cascade,
  goles_a smallint not null check (goles_a between 0 and 30),
  goles_b smallint not null check (goles_b between 0 and 30),
  creado timestamptz not null default now(),
  actualizado timestamptz not null default now(),
  puntos smallint check (puntos in (0, 3, 10)),
  ascuas smallint check (ascuas between 0 and 10),
  liquidado timestamptz,
  primary key (reto_id, usuario)
);
create index if not exists prode_usuario_idx on public.prode_pronosticos (usuario, liquidado desc);
create index if not exists prode_liquidado_idx on public.prode_pronosticos (liquidado) where liquidado is not null;
alter table public.prode_pronosticos enable row level security;
revoke all on public.prode_pronosticos from anon, authenticated;

create or replace function private.prode_activo() returns boolean
language sql stable security definer set search_path = '' as $$
  select not exists (select 1 from public.phoenix_config c where c.clave = 'prode' and c.valor = 'false'::jsonb)
$$;
create or replace function private.prode_semana(t timestamptz default now()) returns timestamptz
language sql stable set search_path = '' as $$ select (date_trunc('week', t at time zone 'America/Lima')) at time zone 'America/Lima' $$;
create or replace function private.prode_puntos(pa integer, pb integer, ra integer, rb integer) returns integer
language sql immutable set search_path = '' as $$
  select case when pa = ra and pb = rb then 10 when sign(pa - pb) = sign(ra - rb) then 3 else 0 end
$$;
-- ¿Se puede pronosticar este duelo? (sin contar quién pregunta)
create or replace function private.prode_abierto(p_reto integer) returns boolean
language sql stable security definer set search_path = '' as $$
  select exists (select 1 from public.retos_matchmaking r where r.id = p_reto and r.estado::text = 'ACEPTADO' and r.rival_id is not null
    and (r.fecha_programada is null or r.fecha_programada > now()))
$$;
revoke all on function private.prode_activo(), private.prode_semana(timestamptz), private.prode_puntos(integer, integer, integer, integer), private.prode_abierto(integer) from public, anon, authenticated;

-- ── Liquidar (trigger sobre resultados_duelo) ───────────────────────────────────────────────────────────────
create or replace function private.prode_liquidar() returns trigger
language plpgsql security definer set search_path = '' as $$
declare p record; v_pts integer; v_pagado integer; v_dar integer; v_semana timestamptz := private.prode_semana();
begin
  if new.estado <> 'CONFIRMADO' or (tg_op = 'UPDATE' and old.estado = 'CONFIRMADO' and old.goles_a = new.goles_a and old.goles_b = new.goles_b) then return new; end if;
  for p in select * from public.prode_pronosticos where reto_id = new.reto_id and liquidado is null for update loop
    v_pts := private.prode_puntos(p.goles_a, p.goles_b, new.goles_a, new.goles_b);
    v_dar := 0;
    if v_pts > 0 and private.prode_activo() then
      select coalesce(sum(x.ascuas), 0) into v_pagado from public.prode_pronosticos x
       where x.usuario = p.usuario and x.liquidado >= v_semana;
      v_dar := greatest(0, least(v_pts, 100 - v_pagado));
      if v_dar > 0 then
        perform private.registrar_movimiento(p.usuario, v_dar, 'ganado', 'prode', 'reto:' || new.reto_id, 'prode:' || new.reto_id || ':' || p.usuario, 'ascuas');
      end if;
    end if;
    update public.prode_pronosticos set puntos = v_pts, ascuas = v_dar, liquidado = now() where reto_id = p.reto_id and usuario = p.usuario;
  end loop;
  return new;
exception when others then
  -- Un fallo del prode NUNCA debe impedir confirmar un marcador: se registra y se sigue (quedan sin liquidar y se pueden reintentar).
  raise warning 'prode_liquidar reto %: %', new.reto_id, sqlerrm;
  return new;
end $$;
revoke all on function private.prode_liquidar() from public, anon, authenticated;
drop trigger if exists zz_prode_liquidar on public.resultados_duelo;
create trigger zz_prode_liquidar after insert or update of estado, goles_a, goles_b on public.resultados_duelo
  for each row execute function private.prode_liquidar();

-- ── Público (con sesión) ────────────────────────────────────────────────────────────────────────────────────
create or replace function public.prode_pronosticar(p_reto integer, p_goles_a integer, p_goles_b integer) returns jsonb
language plpgsql security definer set search_path = '' as $$
declare v_yo uuid := private.uid_requerido(); r public.retos_matchmaking;
begin
  if not private.prode_activo() then raise exception 'El prode está en pausa por el staff.' using errcode = 'P0001'; end if;
  if p_goles_a is null or p_goles_b is null or p_goles_a not between 0 and 30 or p_goles_b not between 0 and 30 then
    raise exception 'Los goles deben ser números entre 0 y 30.' using errcode = '22023'; end if;
  select * into r from public.retos_matchmaking where id = p_reto;
  if not found then raise exception 'Ese duelo no existe.' using errcode = 'P0001'; end if;
  if not private.prode_abierto(p_reto) then raise exception 'Ese duelo ya no acepta pronósticos (empezó o no está agendado).' using errcode = 'P0001'; end if;
  if private.lado_en_reto(p_reto, v_yo) is not null or r.host_id = v_yo then raise exception 'No puedes pronosticar un duelo en el que juegas o eres host.' using errcode = '42501'; end if;
  insert into public.prode_pronosticos (reto_id, usuario, goles_a, goles_b) values (p_reto, v_yo, p_goles_a, p_goles_b)
    on conflict (reto_id, usuario) do update set goles_a = excluded.goles_a, goles_b = excluded.goles_b, actualizado = now()
    where public.prode_pronosticos.liquidado is null;
  return jsonb_build_object('ok', true);
end $$;

-- Duelos para pronosticar + mis últimos resultados + mi semana.
create or replace function public.prode_tablero() returns jsonb
language plpgsql stable security definer set search_path = '' as $$
declare v_yo uuid := private.uid_requerido(); v_semana timestamptz := private.prode_semana();
begin
  return jsonb_build_object(
    'activo', private.prode_activo(),
    'semana_desde', v_semana, 'semana_hasta', v_semana + interval '7 days',
    'tope', 100,
    'ganado_semana', (select coalesce(sum(ascuas), 0) from public.prode_pronosticos where usuario = v_yo and liquidado >= v_semana),
    'puntos_semana', (select coalesce(sum(puntos), 0) from public.prode_pronosticos where usuario = v_yo and liquidado >= v_semana),
    'abiertos', (select coalesce(jsonb_agg(jsonb_build_object('reto_id', r.id, 'fecha', r.fecha_programada,
        'a', jsonb_build_object('id', r.retador_id, 'nombre', private.nombre(r.retador_id)),
        'b', jsonb_build_object('id', r.rival_id, 'nombre', private.nombre(r.rival_id)),
        'tam_a', r.tam_a, 'tam_b', r.tam_b,
        'pronosticos', (select count(*) from public.prode_pronosticos x where x.reto_id = r.id),
        'mio', (select jsonb_build_object('a', x.goles_a, 'b', x.goles_b) from public.prode_pronosticos x where x.reto_id = r.id and x.usuario = v_yo),
        'puedo', private.lado_en_reto(r.id, v_yo) is null and r.host_id is distinct from v_yo)
        order by r.fecha_programada nulls last, r.id), '[]'::jsonb)
      from (select * from public.retos_matchmaking r where r.estado::text = 'ACEPTADO' and r.rival_id is not null
              and (r.fecha_programada is null or r.fecha_programada > now())
              and not private.hay_bloqueo(r.retador_id, v_yo) and not private.hay_bloqueo(r.rival_id, v_yo)
            order by r.fecha_programada nulls last, r.id limit 40) r),
    'mios', (select coalesce(jsonb_agg(jsonb_build_object('reto_id', x.reto_id, 'a', x.goles_a, 'b', x.goles_b,
        'res_a', d.goles_a, 'res_b', d.goles_b, 'puntos', x.puntos, 'ascuas', x.ascuas, 'liquidado', x.liquidado,
        'nombre_a', private.nombre(r.retador_id), 'nombre_b', private.nombre(r.rival_id), 'estado', r.estado::text)
        order by coalesce(x.liquidado, x.actualizado) desc), '[]'::jsonb)
      from (select * from public.prode_pronosticos where usuario = v_yo order by coalesce(liquidado, actualizado) desc limit 20) x
      join public.retos_matchmaking r on r.id = x.reto_id
      left join public.resultados_duelo d on d.reto_id = x.reto_id and d.estado = 'CONFIRMADO'));
end $$;

-- Ranking de la semana (puntos, no ascuas): top 10.
create or replace function public.prode_ranking_semana() returns jsonb
language sql stable security definer set search_path = '' as $$
  select coalesce(jsonb_agg(jsonb_build_object('id', t.usuario, 'nombre', private.nombre(t.usuario), 'puntos', t.pts, 'exactos', t.exactos) order by t.pts desc, t.exactos desc, t.primero), '[]'::jsonb)
  from (select usuario, sum(puntos) pts, count(*) filter (where puntos = 10) exactos, min(liquidado) primero
        from public.prode_pronosticos where liquidado >= private.prode_semana() and puntos > 0 and private.uid_requerido() is not null
        group by usuario order by sum(puntos) desc, count(*) filter (where puntos = 10) desc, min(liquidado) limit 10) t
$$;

revoke all on function public.prode_pronosticar(integer, integer, integer), public.prode_tablero(), public.prode_ranking_semana() from public, anon;
grant execute on function public.prode_pronosticar(integer, integer, integer), public.prode_tablero(), public.prode_ranking_semana() to authenticated;

commit;

-- ───────────── 152_avisos_funciones_nuevas ─────────────
begin;
-- 152 · Avisos de las funciones nuevas (25-oct-2026, Cuenta 2). Campana de la web + canal de Discord.
-- ESTADO: escrita, NO APLICADA (Supabase canceló el permiso el 25-oct-2026). Va en docs/sql-pendiente/PEGAR-145-148-149.sql, después de la 149.
-- Orden: aplicar DESPUÉS de 147, 149, 150 y 151. Si la 149 (prode) aún no está, la parte del prode se salta sola y se puede
-- volver a correr esta migración después (todo es «create or replace» / «if not exists»).
--
-- CAMPANA (cada persona; respeta las categorías que apaga en Amigos → Avisos):
--   · DRAFT  (categoría duelos):  «¡Te toca elegir!» cuando empieza tu turno en un draft en vivo.
--   · MVP    (categoría logros):  «Vota al MVP» a jugadores y espectadores cuando se confirma un duelo con votación.
--   · PRODE  (categoría logros):  «Ganaste N ascuas en el prode» al liquidarse un pronóstico con premio.
--   · CLAN   (categoría social, ya existía): reto de serie recibido (líderes del clan retado), aceptado o rechazado (líderes del que retó).
-- DISCORD (canal de la comunidad; solo si el webhook está configurado, ver 046b — si no, no hace nada y no da error):
--   · Empieza un draft en vivo · se acepta una serie entre clanes · resumen semanal del prode (lunes 9:00 Lima, top 5 de la semana anterior).
-- Blindaje: ningún aviso puede romper la acción que lo dispara (cada disparador atrapa sus errores y deja un warning);
--   Discord nunca repite el mismo mensaje (clave única en discord_envios); textos de usuario limpiados (sin menciones @everyone ni formato).

-- ── 1. Tipos nuevos ────────────────────────────────────────────────────────────────────────────────────────────────
alter table public.notificaciones drop constraint if exists notificaciones_tipo_check;
alter table public.notificaciones add constraint notificaciones_tipo_check check (tipo in (
  'RETO_DIRECTO','RETO_HOST','RETO_ACEPTADO','RETO_RECHAZADO','SALA_LISTA','CONFIRMAR_PARTIDO','AVISO_FINAL','PARTIDO_CONFIRMADO','PARTIDO_CANCELADO',
  'RETO_EXPIRADO','INVITACION_RETO','UNION_RETO','SALIO_RETO','AMISTAD_SOLICITUD','AMISTAD_ACEPTADA','SEGUIDOR_NUEVO','ESPECTADOR_SOLICITUD',
  'ESPECTADOR_APROBADO','MURO_RESPUESTA','MODERACION','MENCION','LOGRO','RESULTADO_PROPUESTO','RESULTADO_CONFIRMADO','RESULTADO_DISPUTADO',
  'EVENTO','CLAN','SALA_ABIERTA','INVITACION_SALA','APUESTA','ALQUILER','MERCADO','MURO_COMPARTIDA','LIGA_OFICIAL',
  'DRAFT','MVP','PRODE'));

create or replace function private.categoria_notif(p_tipo text) returns text
language sql immutable set search_path = '' as $$
  select case
    when p_tipo in ('AMISTAD_SOLICITUD','AMISTAD_ACEPTADA','SEGUIDOR_NUEVO','CLAN') then 'social'
    when p_tipo = 'MURO_RESPUESTA' then 'muro'
    when p_tipo = 'MENCION' then 'menciones'
    when p_tipo in ('LOGRO', 'MVP', 'PRODE') then 'logros'
    when p_tipo = 'EVENTO' then 'eventos'
    when p_tipo in ('SALA_ABIERTA', 'INVITACION_SALA') then 'salas'
    when p_tipo in ('MODERACION', 'LIGA_OFICIAL') then 'sistema'
    else 'duelos' end
$$;

alter table public.discord_envios drop constraint if exists discord_envios_tipo_check;
alter table public.discord_envios add constraint discord_envios_tipo_check check (tipo in ('resumen', 'evento', 'prueba', 'uso', 'sala', 'en_vivo',
  'draft', 'clan_serie', 'prode_semana'));

-- Aviso a una persona (si es nula, nada). Nunca lanza.
create or replace function private.aviso_nuevo(p_usuario uuid, p_tipo text, p_titulo text, p_mensaje text, p_enlace text) returns void
language plpgsql security definer set search_path = '' as $$
begin
  if p_usuario is null then return; end if;
  insert into public.notificaciones (usuario_id, tipo, titulo, mensaje, enlace) values (p_usuario, p_tipo, left(p_titulo, 120), left(p_mensaje, 300), p_enlace);
exception when others then raise warning '[aviso_nuevo] % %: %', p_tipo, p_usuario, sqlerrm;
end $$;
revoke all on function private.aviso_nuevo(uuid, text, text, text, text) from public, anon, authenticated;

-- ── 2. Draft: «te toca» + Discord al empezar ─────────────────────────────────────────────────────────────────────────
create or replace function private.draft_avisos() returns trigger
language plpgsql security definer set search_path = '' as $$
declare v_p integer; v_orden integer; v_u uuid; v_url text := private.url_sitio() || 'draft/?id=' || new.id;
begin
  if new.estado <> 'en_vivo' then return new; end if;
  if tg_op = 'UPDATE' and old.estado = 'en_vivo' and old.turno = new.turno then return new; end if;   -- nada cambió de turno
  -- solo si el turno sigue vivo de verdad (en las cadenas de turnos vencidos no se avisa a quien ya lo perdió)
  if new.turno_desde + make_interval(secs => new.segundos_turno) <= now() then return new; end if;
  select count(*) into v_p from public.draft_participantes where draft_id = new.id;
  if new.turno >= v_p * new.rondas then return new; end if;
  v_orden := private.draft_orden_de(new.turno, v_p, new.serpiente);
  select usuario into v_u from public.draft_participantes where draft_id = new.id and orden = v_orden;
  perform private.aviso_nuevo(v_u, 'DRAFT', '¡Te toca elegir!', left('Es tu turno en «' || new.titulo || '». Tienes ' || new.segundos_turno || ' segundos.', 300), 'draft/?id=' || new.id);
  if tg_op = 'UPDATE' and old.estado = 'preparando' then
    perform private.discord_enviar('draft', new.id::text, jsonb_build_object('embeds', jsonb_build_array(jsonb_build_object(
      'title', '📋 ¡Empezó un draft en vivo!', 'url', v_url, 'color', 16761095,
      'description', private.discord_limpio(new.titulo, 80) || ' · ' || v_p || ' participantes · ' || new.rondas || ' ronda(s) · ' || new.segundos_turno || ' s por turno',
      'footer', jsonb_build_object('text', case when new.ambito = 'lm' then 'Liga Máster' else 'Torneo' end)))));
  end if;
  return new;
exception when others then raise warning '[draft_avisos] draft %: %', new.id, sqlerrm; return new;
end $$;
revoke all on function private.draft_avisos() from public, anon, authenticated;
drop trigger if exists zz_draft_avisos on public.drafts;
create trigger zz_draft_avisos after update of estado, turno on public.drafts for each row execute function private.draft_avisos();

-- ── 3. Clan contra clan ──────────────────────────────────────────────────────────────────────────────────────────────
create or replace function private.clan_serie_avisos() returns trigger
language plpgsql security definer set search_path = '' as $$
declare v_a text; v_b text; v_l uuid;
begin
  select '[' || etiqueta || '] ' || nombre into v_a from public.clanes where id = new.clan_a;
  select '[' || etiqueta || '] ' || nombre into v_b from public.clanes where id = new.clan_b;
  if tg_op = 'INSERT' then
    for v_l in select usuario_id from public.clan_miembros where clan_id = new.clan_b and rol in ('capitan', 'subcapitan') loop
      perform private.aviso_nuevo(v_l, 'CLAN', 'Tu clan fue retado', left(v_a || ' reta a tu clan a una serie al mejor de ' || new.mejor_de || '. Tienes 7 días para responder.', 300), 'clanes/');
    end loop;
  elsif old.estado = 'propuesta' and new.estado in ('aceptada', 'rechazada') then
    for v_l in select usuario_id from public.clan_miembros where clan_id = new.clan_a and rol in ('capitan', 'subcapitan') loop
      perform private.aviso_nuevo(v_l, 'CLAN', case when new.estado = 'aceptada' then '¡Aceptaron tu reto!' else 'Rechazaron tu reto' end,
        left(v_b || case when new.estado = 'aceptada' then ' aceptó la serie. Desde ahora cuentan los duelos 1v1 confirmados entre los dos clanes.' else ' no aceptó la serie.' end, 300), 'clanes/');
    end loop;
    if new.estado = 'aceptada' then
      perform private.discord_enviar('clan_serie', new.id::text, jsonb_build_object('embeds', jsonb_build_array(jsonb_build_object(
        'title', '🛡️ Clan contra clan', 'url', private.url_sitio() || 'clanes/', 'color', 3447003,
        'description', private.discord_limpio(v_a, 40) || '  vs  ' || private.discord_limpio(v_b, 40) || E'\nAl mejor de ' || new.mejor_de || ' · ' || new.plazo_dias || ' días de plazo'))));
    end if;
  end if;
  return new;
exception when others then raise warning '[clan_serie_avisos] serie %: %', new.id, sqlerrm; return new;
end $$;
revoke all on function private.clan_serie_avisos() from public, anon, authenticated;
drop trigger if exists zz_clan_serie_avisos on public.clan_series;
create trigger zz_clan_serie_avisos after insert or update of estado on public.clan_series for each row execute function private.clan_serie_avisos();

-- ── 4. MVP: «vota al MVP» al confirmarse el duelo ────────────────────────────────────────────────────────────────────
create or replace function private.mvp_avisos() returns trigger
language plpgsql security definer set search_path = '' as $$
declare v_info jsonb; v_u text;
begin
  if new.estado <> 'CONFIRMADO' or (tg_op = 'UPDATE' and old.estado = 'CONFIRMADO') then return new; end if;
  v_info := private.mvp_info(new.reto_id);
  if v_info is null then return new; end if;
  for v_u in select jsonb_array_elements_text(v_info -> 'votantes') loop
    perform private.aviso_nuevo(v_u::uuid, 'MVP', 'Vota al MVP del partido', 'Elige al mejor jugador del duelo #' || new.reto_id || '. Tienes 48 horas.', 'mis-partidos/');
  end loop;
  return new;
exception when others then raise warning '[mvp_avisos] reto %: %', new.reto_id, sqlerrm; return new;
end $$;
revoke all on function private.mvp_avisos() from public, anon, authenticated;
drop trigger if exists zz_mvp_avisos on public.resultados_duelo;
create trigger zz_mvp_avisos after insert or update of estado on public.resultados_duelo for each row execute function private.mvp_avisos();

-- ── 5. Prode (solo si la 149 ya está aplicada) ───────────────────────────────────────────────────────────────────────
do $prode$
begin
  if to_regclass('public.prode_pronosticos') is null then
    raise notice '152: la tabla del prode (149) aún no existe; se salta la parte del prode. Vuelve a correr la 152 después de la 149.';
    return;
  end if;
  execute $f$
    create or replace function private.prode_avisos() returns trigger
    language plpgsql security definer set search_path = '' as $b$
    begin
      if new.liquidado is not null and old.liquidado is null and coalesce(new.ascuas, 0) > 0 then
        perform private.aviso_nuevo(new.usuario, 'PRODE', case when new.puntos = 10 then '¡Marcador exacto en el prode!' else '¡Acertaste en el prode!' end,
          'Ganaste ' || new.ascuas || ' ascuas por tu pronóstico del duelo #' || new.reto_id || '.', 'prode/');
      end if;
      return new;
    exception when others then raise warning '[prode_avisos] %: %', new.reto_id, sqlerrm; return new;
    end $b$;
  $f$;
  execute 'revoke all on function private.prode_avisos() from public, anon, authenticated';
  execute 'drop trigger if exists zz_prode_avisos on public.prode_pronosticos';
  execute 'create trigger zz_prode_avisos after update of liquidado on public.prode_pronosticos for each row execute function private.prode_avisos()';

  execute $f$
    create or replace function private.prode_resumen_semana() returns text
    language plpgsql security definer set search_path = '' as $b$
    declare v_desde timestamptz := private.prode_semana() - interval '7 days'; v_hasta timestamptz := private.prode_semana(); v_top text; v_n integer;
    begin
      select count(*) into v_n from public.prode_pronosticos where liquidado >= v_desde and liquidado < v_hasta;
      if v_n = 0 then return 'SIN_DATOS'; end if;
      select string_agg(pos || '. ' || private.discord_limpio(private.nombre(usuario)) || ' — ' || pts || ' pts', E'\n' order by pos) into v_top
        from (select usuario, sum(puntos) pts, row_number() over (order by sum(puntos) desc, count(*) filter (where puntos = 10) desc, min(liquidado)) pos
                from public.prode_pronosticos where liquidado >= v_desde and liquidado < v_hasta and puntos > 0 group by usuario) t where pos <= 5;
      return private.discord_enviar('prode_semana', to_char(v_desde, 'YYYY-MM-DD'), jsonb_build_object('embeds', jsonb_build_array(jsonb_build_object(
        'title', '🎯 Prode · mejores de la semana', 'url', private.url_sitio() || 'prode/', 'color', 16766720,
        'description', coalesce(v_top, 'Nadie sumó puntos esta semana.') || E'\n\n' || v_n || ' pronósticos jugados. ¡Esta semana empieza de cero!'))));
    end $b$;
  $f$;
  execute 'revoke all on function private.prode_resumen_semana() from public, anon, authenticated';
  -- lunes 9:00 Lima = 14:00 UTC
  perform cron.unschedule(jobid) from cron.job where jobname = 'prode-resumen-semana';
  perform cron.schedule('prode-resumen-semana', '0 14 * * 1', 'select private.prode_resumen_semana()');
end $prode$;

commit;

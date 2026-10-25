-- 144 · Solicitudes para hacer OFICIAL una liga casual (pedido de Fralex, 25-oct-2026).
-- «Yo quiero que los demás puedan crear sus ligas pero los resultados serán ingresados manualmente por los encargados de dicha
-- liga; solo cuando es oficial, el Lua leerá los resultados y los subirá automáticamente» + «si alguien crea una liga casual puede
-- solicitar al staff hacerla oficial y el staff debe aceptarlo para que proceda».
--
-- Cómo queda:
--   · Casual  = /torneos/ (097). Cualquiera la crea; el creador anota los resultados a mano.
--   · Oficial = /liga-amigos/ («Liga oficial», 142/143). Phoenix Link sube los resultados solo.
--   · NUEVO: el creador de una liga casual todos contra todos (liguilla / idavuelta) que siga en inscripción pulsa
--     «Pedir que sea oficial». El staff la ve en Moderación › Torneos propios y en /control/, y la ACEPTA (se llama a la 143
--     tal cual) o la RECHAZA con motivo. Al creador le llega un aviso LIGA_OFICIAL con enlace a su torneo.
--   · El staff puede seguir pulsando «Hacer oficial» directamente (143): si había un pedido pendiente, se marca aceptado solo.
--   · Si la liga deja la inscripción, se cancela o se oculta, el pedido pendiente pasa a «cancelada» solo.
--
-- Requiere 097, 142 y 143 aplicadas. SOLO AÑADE: 1 tabla cerrada (RLS sin políticas, todo por RPC), 5 funciones públicas,
-- 2 privadas, 1 disparador, 1 tipo de aviso nuevo (la lista de tipos solo crece) y su categoría ('sistema', no se apaga).
--
-- Cómo DESHACER (en este orden):
--   drop trigger if exists zz_solicitud_oficial_sync on public.torneos_libres;
--   drop function if exists private.tl_solicitud_sync() , private.tl_avisar_staff_solicitud(bigint, text, text),
--     public.torneo_solicitar_oficial(bigint, text), public.torneo_cancelar_solicitud_oficial(bigint),
--     public.torneo_solicitud_oficial_de(bigint), public.staff_solicitudes_oficial(text, int),
--     public.staff_solicitud_oficial_resolver(bigint, boolean, text);
--   drop table if exists public.torneo_solicitudes_oficial;
--   (dejar 'LIGA_OFICIAL' en la lista de tipos no molesta; quitarlo exige borrar antes los avisos de ese tipo)

-- ── 1. Tabla ─────────────────────────────────────────────────────────────────────────────────────────────────────────
create table if not exists public.torneo_solicitudes_oficial (
  id           bigint generated always as identity primary key,
  torneo_id    bigint not null references public.torneos_libres(id) on delete cascade,
  solicitante  uuid   not null references public.perfiles(id) on delete cascade,
  nota         text   check (nota is null or char_length(nota) <= 300),
  estado       text   not null default 'pendiente' check (estado in ('pendiente', 'aceptada', 'rechazada', 'cancelada')),
  motivo       text   check (motivo is null or char_length(motivo) <= 300),
  resuelto_por uuid   references public.perfiles(id) on delete set null,
  creado_en    timestamptz not null default now(),
  resuelto_en  timestamptz
);
-- Un solo pedido pendiente por liga.
create unique index if not exists torneo_solicitudes_oficial_una_pendiente on public.torneo_solicitudes_oficial (torneo_id) where estado = 'pendiente';
create index if not exists torneo_solicitudes_oficial_torneo on public.torneo_solicitudes_oficial (torneo_id, id desc);
create index if not exists torneo_solicitudes_oficial_solicitante on public.torneo_solicitudes_oficial (solicitante);
create index if not exists torneo_solicitudes_oficial_resuelto_por on public.torneo_solicitudes_oficial (resuelto_por);
alter table public.torneo_solicitudes_oficial enable row level security;
revoke all on public.torneo_solicitudes_oficial from public, anon, authenticated;

-- ── 2. Tipo de aviso nuevo (la lista solo crece) ─────────────────────────────────────────────────────────────────────
alter table public.notificaciones drop constraint if exists notificaciones_tipo_check;
alter table public.notificaciones add constraint notificaciones_tipo_check check (tipo = any (array[
  'RETO_DIRECTO','RETO_HOST','RETO_ACEPTADO','RETO_RECHAZADO','SALA_LISTA','CONFIRMAR_PARTIDO','AVISO_FINAL','PARTIDO_CONFIRMADO',
  'PARTIDO_CANCELADO','RETO_EXPIRADO','INVITACION_RETO','UNION_RETO','SALIO_RETO','AMISTAD_SOLICITUD','AMISTAD_ACEPTADA','SEGUIDOR_NUEVO',
  'ESPECTADOR_SOLICITUD','ESPECTADOR_APROBADO','MURO_RESPUESTA','MODERACION','MENCION','LOGRO','RESULTADO_PROPUESTO','RESULTADO_CONFIRMADO',
  'RESULTADO_DISPUTADO','EVENTO','CLAN','SALA_ABIERTA','INVITACION_SALA','APUESTA','ALQUILER','MERCADO','MURO_COMPARTIDA',
  'LIGA_OFICIAL']));

-- Copia exacta de la versión vigente + LIGA_OFICIAL → 'sistema' (no se apaga: es la respuesta del staff a un pedido tuyo).
-- ESPEJO en src/js/core/sistema/notifs.js (categoriaDe).
create or replace function private.categoria_notif(p_tipo text) returns text
language sql immutable set search_path = '' as $$
  select case
    when p_tipo in ('AMISTAD_SOLICITUD','AMISTAD_ACEPTADA','SEGUIDOR_NUEVO','CLAN') then 'social'
    when p_tipo = 'MURO_RESPUESTA' then 'muro'
    when p_tipo = 'MENCION' then 'menciones'
    when p_tipo = 'LOGRO' then 'logros'
    when p_tipo = 'EVENTO' then 'eventos'
    when p_tipo in ('SALA_ABIERTA', 'INVITACION_SALA') then 'salas'
    when p_tipo in ('MODERACION', 'LIGA_OFICIAL') then 'sistema'
    else 'duelos' end
$$;

-- ── 3. Ayudantes privados ────────────────────────────────────────────────────────────────────────────────────────────
-- Aviso a todo el staff (ayudante, moderador, admin; máx. 50) de que hay un pedido nuevo.
create or replace function private.tl_avisar_staff_solicitud(p_torneo bigint, p_titulo text, p_mensaje text) returns void
language sql security definer set search_path = '' as $$
  insert into public.notificaciones (usuario_id, tipo, titulo, mensaje, enlace)
  select p.id, 'LIGA_OFICIAL', left(p_titulo, 120), left(p_mensaje, 300), 'torneo/?id=' || p_torneo
    from public.perfiles p
   where p.rol in ('ayudante', 'moderador', 'admin') and p.id is distinct from (select auth.uid())
   order by p.id limit 50
$$;
revoke all on function private.tl_avisar_staff_solicitud(bigint, text, text) from public, anon, authenticated;

-- Disparador: mantiene los pedidos al día cuando la liga cambia por cualquier vía.
--   · pasa a oficial (143, desde el pedido o con el botón directo) → el pendiente queda 'aceptada' y se avisa al creador;
--   · sale de inscripción, se cancela o se oculta → el pendiente queda 'cancelada' (sin aviso: el creador ya lo sabe).
create or replace function private.tl_solicitud_sync() returns trigger
language plpgsql security definer set search_path = '' as $$
declare s public.torneo_solicitudes_oficial%rowtype;
begin
  select * into s from public.torneo_solicitudes_oficial where torneo_id = new.id and estado = 'pendiente' for update;
  if not found then return new; end if;
  if (new.meta ? 'oficial') and not (coalesce(old.meta, '{}'::jsonb) ? 'oficial') then
    update public.torneo_solicitudes_oficial set estado = 'aceptada', resuelto_por = (select auth.uid()), resuelto_en = now() where id = s.id;
    insert into public.notificaciones (usuario_id, tipo, titulo, mensaje, enlace)
    values (s.solicitante, 'LIGA_OFICIAL', '¡Tu liga ya es oficial!',
            left('«' || new.nombre || '» ahora es oficial: Phoenix Link sube los resultados solo. La inscripción y el calendario siguen en Liga oficial.', 300),
            'torneo/?id=' || new.id);
  elsif new.estado <> 'inscripcion' or new.oculto then
    update public.torneo_solicitudes_oficial set estado = 'cancelada', resuelto_en = now(),
           motivo = case when new.oculto then 'La liga fue ocultada.' else 'La liga ya no está en inscripción.' end
     where id = s.id;
  end if;
  return new;
end $$;
revoke all on function private.tl_solicitud_sync() from public, anon, authenticated;
drop trigger if exists zz_solicitud_oficial_sync on public.torneos_libres;
create trigger zz_solicitud_oficial_sync after update of meta, estado, oculto on public.torneos_libres
  for each row execute function private.tl_solicitud_sync();

-- ── 4. Funciones para el creador ─────────────────────────────────────────────────────────────────────────────────────
-- Pedir que la liga sea oficial. Solo el creador; mismas condiciones que la 143. Tras un rechazo, esperar 24 h.
create or replace function public.torneo_solicitar_oficial(p_torneo bigint, p_nota text default null)
returns bigint language plpgsql security definer set search_path = '' as $$
declare t public.torneos_libres%rowtype; yo uuid; nid bigint; ultimo timestamptz; v_nota text;
begin
  yo := private.uid_requerido();
  select * into t from public.torneos_libres where id = p_torneo for update;
  if not found or t.oculto then raise exception 'Torneo no encontrado.' using errcode = 'P0002'; end if;
  if t.creador is distinct from yo then raise exception 'Solo quien creó la liga puede pedir que sea oficial.' using errcode = '42501'; end if;
  if t.meta ? 'oficial' then raise exception 'Esta liga ya es oficial.' using errcode = '22023'; end if;
  if t.formato not in ('liguilla', 'idavuelta') then
    raise exception 'Por ahora solo las ligas todos contra todos pueden ser oficiales (Phoenix Link aún no conoce las llaves).' using errcode = '22023';
  end if;
  if t.estado <> 'inscripcion' then raise exception 'Solo se puede pedir antes de empezar la liga.' using errcode = '22023'; end if;
  if exists (select 1 from public.torneo_solicitudes_oficial where torneo_id = p_torneo and estado = 'pendiente') then
    raise exception 'Ya hay un pedido pendiente para esta liga. El staff lo revisará pronto.' using errcode = '23505';
  end if;
  select max(resuelto_en) into ultimo from public.torneo_solicitudes_oficial where torneo_id = p_torneo and estado = 'rechazada';
  if ultimo is not null and ultimo > now() - interval '24 hours' then
    raise exception 'El staff rechazó el pedido hace poco. Revisa el motivo y vuelve a pedirlo en 24 horas.' using errcode = '22023';
  end if;
  v_nota := nullif(btrim(coalesce(p_nota, '')), '');
  if v_nota is not null and char_length(v_nota) > 300 then raise exception 'La nota puede tener hasta 300 letras.' using errcode = '22001'; end if;

  insert into public.torneo_solicitudes_oficial (torneo_id, solicitante, nota) values (p_torneo, yo, v_nota) returning id into nid;
  perform private.tl_evento(p_torneo, 'oficial_pedido', jsonb_build_object('solicitud', nid));
  perform private.tl_avisar_staff_solicitud(p_torneo, 'Piden hacer oficial una liga',
    left('«' || t.nombre || '» quiere ser liga oficial.' || coalesce(' Nota: ' || v_nota, ''), 300));
  return nid;
end $$;
revoke all on function public.torneo_solicitar_oficial(bigint, text) from public, anon;
grant execute on function public.torneo_solicitar_oficial(bigint, text) to authenticated;

-- Retirar el pedido pendiente (solo el creador).
create or replace function public.torneo_cancelar_solicitud_oficial(p_torneo bigint)
returns void language plpgsql security definer set search_path = '' as $$
declare yo uuid; n int;
begin
  yo := private.uid_requerido();
  update public.torneo_solicitudes_oficial s set estado = 'cancelada', resuelto_en = now(), motivo = 'Retirado por quien lo pidió.'
   where s.torneo_id = p_torneo and s.estado = 'pendiente'
     and exists (select 1 from public.torneos_libres t where t.id = p_torneo and t.creador = yo);
  get diagnostics n = row_count;
  if n = 0 then raise exception 'No hay un pedido pendiente tuyo para esta liga.' using errcode = 'P0002'; end if;
  perform private.tl_evento(p_torneo, 'oficial_retirado', '{}'::jsonb);
end $$;
revoke all on function public.torneo_cancelar_solicitud_oficial(bigint) from public, anon;
grant execute on function public.torneo_cancelar_solicitud_oficial(bigint) to authenticated;

-- Último pedido de una liga (o null). Solo lo ven el creador y el staff.
create or replace function public.torneo_solicitud_oficial_de(p_torneo bigint)
returns jsonb language sql stable security definer set search_path = '' as $$
  select jsonb_build_object('id', s.id, 'estado', s.estado, 'nota', s.nota, 'motivo', s.motivo,
                            'creado_en', s.creado_en, 'resuelto_en', s.resuelto_en, 'solicitante', s.solicitante)
    from public.torneo_solicitudes_oficial s
    join public.torneos_libres t on t.id = s.torneo_id
   where s.torneo_id = p_torneo
     and (t.creador = (select auth.uid()) or private.es_staff())
   order by s.id desc limit 1
$$;
revoke all on function public.torneo_solicitud_oficial_de(bigint) from public, anon;
grant execute on function public.torneo_solicitud_oficial_de(bigint) to authenticated;

-- ── 5. Funciones para el staff ───────────────────────────────────────────────────────────────────────────────────────
-- Lista de pedidos (por defecto los pendientes, los más viejos primero).
create or replace function public.staff_solicitudes_oficial(p_estado text default 'pendiente', p_limite int default 50)
returns table (id bigint, torneo_id bigint, torneo text, formato text, estado_torneo text, inscritos int,
               solicitante uuid, solicitante_nombre text, nota text, estado text, motivo text, creado_en timestamptz, resuelto_en timestamptz)
language plpgsql stable security definer set search_path = '' as $$
begin
  if not private.es_staff() then raise exception 'Solo el staff ve los pedidos.' using errcode = '42501'; end if;
  return query
  select s.id, s.torneo_id, t.nombre, t.formato, t.estado,
         (select count(*)::int from public.torneos_libres_inscritos i where i.torneo_id = t.id and not i.retirado),
         s.solicitante, coalesce(nullif(p.nombre_display, ''), p.username, 'Jugador'),
         s.nota, s.estado, s.motivo, s.creado_en, s.resuelto_en
    from public.torneo_solicitudes_oficial s
    join public.torneos_libres t on t.id = s.torneo_id
    left join public.perfiles p on p.id = s.solicitante
   where p_estado is null or s.estado = p_estado
   order by case when s.estado = 'pendiente' then s.creado_en end asc nulls last, s.id desc
   limit greatest(1, least(coalesce(p_limite, 50), 200));
end $$;
revoke all on function public.staff_solicitudes_oficial(text, int) from public, anon;
grant execute on function public.staff_solicitudes_oficial(text, int) to authenticated;

-- Aceptar (llama a la 143: copia la liga y sus inscritos a la Liga oficial; el disparador marca 'aceptada' y avisa)
-- o rechazar (motivo obligatorio de 5 a 300 letras; se avisa al creador). Queda en la auditoría del staff.
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
    eid := public.staff_torneo_hacer_oficial(s.torneo_id);   -- valida formato/estado y lanza el error claro si ya no se puede
    -- Si la liga ya era oficial, la 143 no cambia la fila y el disparador no corre: se cierra aquí.
    update public.torneo_solicitudes_oficial set estado = 'aceptada', resuelto_por = (select auth.uid()), resuelto_en = now()
     where id = s.id and estado = 'pendiente';
    return eid;
  end if;

  v_motivo := btrim(coalesce(p_motivo, ''));
  if char_length(v_motivo) < 5 then raise exception 'Escribe el motivo del rechazo (mínimo 5 letras): lo leerá quien lo pidió.' using errcode = '22023'; end if;
  if char_length(v_motivo) > 300 then raise exception 'El motivo puede tener hasta 300 letras.' using errcode = '22001'; end if;
  update public.torneo_solicitudes_oficial set estado = 'rechazada', motivo = v_motivo, resuelto_por = (select auth.uid()), resuelto_en = now()
   where id = s.id;
  insert into public.notificaciones (usuario_id, tipo, titulo, mensaje, enlace)
  values (s.solicitante, 'LIGA_OFICIAL', 'Tu liga sigue siendo casual',
          left('El staff no aceptó hacer oficial «' || t.nombre || '». Motivo: ' || v_motivo, 300), 'torneo/?id=' || s.torneo_id);
  perform private.tl_evento(s.torneo_id, 'oficial_rechazado', jsonb_build_object('motivo', v_motivo));
  perform private.auditar_moderacion('editar', 'torneos_libres', s.torneo_id::text, 'Pedido de liga oficial rechazado · ' || t.nombre,
                                     jsonb_build_object('solicitud', s.id), v_motivo);
  return null;
end $$;
revoke all on function public.staff_solicitud_oficial_resolver(bigint, boolean, text) from public, anon;
grant execute on function public.staff_solicitud_oficial_resolver(bigint, boolean, text) to authenticated;

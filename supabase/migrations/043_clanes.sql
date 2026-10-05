-- 043 · OLA B (5/5) · CLANES. Depende de 017 (amistades/bloqueos), 030 (roles/auditoría), 031 (ritmo), 032 (sanciones), 033/035/036/042 (avisos), 037/038 (edad y separación de menores) y pg_cron (003).
-- Qué es: un grupo permanente de jugadores con nombre, etiqueta corta (ej. [PHX]), descripción y capitán. Una persona pertenece a UN solo clan. Tamaño: 2 a 15.
-- Reglas: crea un clan solo una persona ADULTA (con edad declarada); los menores pueden estar en un clan pero no dirigirlo ni votar; los menores solo entran si no están «separados» por edad
-- de ningún miembro (038: amigos sí) y nadie entra si hay un bloqueo con algún miembro. Se entra por invitación del capitán/subcapitán o por solicitud que ellos aceptan.
-- Capitanía: si el capitán se va o su cuenta se borra, se abre una VOTACIÓN de 48 h entre los miembros adultos con ≥ 5 días en el clan (voto cambiable, uno por persona).
--   · Gana quien tenga más votos; empate → el miembro más antiguo. Se cierra antes si alguien supera el 70 % de los votos posibles (adultos del clan).
--   · Sin votos: pasa al subcapitán adulto o, si no hay, al adulto más antiguo. Si solo queda UN adulto, es capitán al instante. Si no queda ningún adulto, el clan se disuelve.
--   · Destitución: si más del 70 % de los adultos del clan la piden, se abre la misma votación (el capitán actual también puede ser elegido; sin votos, sigue).
-- Seguridad ante fallos: los cambios de capitanía los hace una función idempotente (`clan_revisar`) que llama el disparador al salir alguien Y un trabajo de pg_cron cada minuto;
-- así un fallo puntual nunca deja un clan sin capitán ni sin votación. Todo por funciones: las tablas están cerradas.
-- Cambio cruzado (alerta): nuevo tipo de aviso CLAN (categoría «social», ya apagable). Se rehacen la restricción de tipos (conserva los 26 anteriores) y categoria_notif (conserva todo).
-- No existe un filtro de palabras ofensivas en la base: el staff puede ocultar un clan o expulsar a alguien (auditado).

create or replace function private.clan_max() returns integer language sql immutable set search_path = '' as $$ select 15 $$;

-- ─── 1) Tablas (cerradas) ────────────────────────────────────────────────────────────────────────────────────────
create table if not exists public.clanes (
  id bigint generated always as identity primary key,
  nombre text not null check (char_length(nombre) between 3 and 24),
  etiqueta text not null check (etiqueta ~ '^[A-Z0-9]{2,5}$'),
  descripcion text not null default '' check (char_length(descripcion) <= 200),
  creador_id uuid references auth.users(id) on delete set null,
  oculto boolean not null default false,
  created_at timestamptz not null default now()
);
create unique index if not exists clanes_nombre_uk on public.clanes (lower(nombre));
create unique index if not exists clanes_etiqueta_uk on public.clanes (etiqueta);
create table if not exists public.clan_miembros (
  clan_id bigint not null references public.clanes(id) on delete cascade,
  usuario_id uuid primary key references auth.users(id) on delete cascade,        -- una persona, un solo clan
  rol text not null default 'miembro' check (rol in ('capitan', 'subcapitan', 'miembro')),
  desde timestamptz not null default now()
);
create index if not exists clan_miembros_clan_idx on public.clan_miembros (clan_id);
create unique index if not exists clan_un_capitan on public.clan_miembros (clan_id) where rol = 'capitan';
create unique index if not exists clan_un_subcapitan on public.clan_miembros (clan_id) where rol = 'subcapitan';
create table if not exists public.clan_solicitudes (
  id bigint generated always as identity primary key,
  clan_id bigint not null references public.clanes(id) on delete cascade,
  usuario_id uuid not null references auth.users(id) on delete cascade,
  tipo text not null check (tipo in ('invitacion', 'solicitud')),
  created_at timestamptz not null default now(),
  unique (clan_id, usuario_id)
);
create index if not exists clan_solicitudes_usuario_idx on public.clan_solicitudes (usuario_id);
create table if not exists public.clan_votaciones (
  id bigint generated always as identity primary key,
  clan_id bigint not null references public.clanes(id) on delete cascade,
  motivo text not null check (motivo in ('vacante', 'destitucion')),
  abre_at timestamptz not null default now(),
  cierra_at timestamptz not null,
  estado text not null default 'ABIERTA' check (estado in ('ABIERTA', 'CERRADA')),
  ganador_id uuid references auth.users(id) on delete set null
);
create unique index if not exists clan_una_votacion_abierta on public.clan_votaciones (clan_id) where estado = 'ABIERTA';
create table if not exists public.clan_votos (
  votacion_id bigint not null references public.clan_votaciones(id) on delete cascade,
  votante_id uuid not null references auth.users(id) on delete cascade,
  candidato_id uuid not null references auth.users(id) on delete cascade,
  primary key (votacion_id, votante_id)
);
create table if not exists public.clan_destituciones (
  clan_id bigint not null references public.clanes(id) on delete cascade,
  usuario_id uuid not null references auth.users(id) on delete cascade,
  primary key (clan_id, usuario_id)
);
alter table public.clanes enable row level security;
alter table public.clan_miembros enable row level security;
alter table public.clan_solicitudes enable row level security;
alter table public.clan_votaciones enable row level security;
alter table public.clan_votos enable row level security;
alter table public.clan_destituciones enable row level security;
revoke all on public.clanes, public.clan_miembros, public.clan_solicitudes, public.clan_votaciones, public.clan_votos, public.clan_destituciones from anon, authenticated;

drop trigger if exists zy_bloqueo_sancion on public.clanes;
create trigger zy_bloqueo_sancion before insert on public.clanes for each row execute function private.bloquear_sancionados('creador_id');
drop trigger if exists zy_bloqueo_sancion on public.clan_votos;
create trigger zy_bloqueo_sancion before insert on public.clan_votos for each row execute function private.bloquear_sancionados('votante_id');
drop trigger if exists zz_limite_ritmo on public.clanes;
create trigger zz_limite_ritmo before insert on public.clanes for each row execute function private.limitar_ritmo('creador_id', '3', '1 day', 'Máximo 3 clanes por día.');
drop trigger if exists zz_limite_ritmo on public.clan_solicitudes;
create trigger zz_limite_ritmo before insert on public.clan_solicitudes for each row execute function private.limitar_ritmo('usuario_id', '30', '1 day', 'Demasiadas solicitudes o invitaciones hoy: espera un poco.');

-- ─── 2) Avisos: tipo CLAN (categoría «social») ─────────────────────────────────────────────────────────────────────
alter table public.notificaciones drop constraint if exists notificaciones_tipo_check;
alter table public.notificaciones add constraint notificaciones_tipo_check check (tipo in (
  'RETO_DIRECTO','RETO_HOST','RETO_ACEPTADO','RETO_RECHAZADO','SALA_LISTA','CONFIRMAR_PARTIDO','AVISO_FINAL','PARTIDO_CONFIRMADO','PARTIDO_CANCELADO',
  'RETO_EXPIRADO','INVITACION_RETO','UNION_RETO','SALIO_RETO','AMISTAD_SOLICITUD','AMISTAD_ACEPTADA','SEGUIDOR_NUEVO','ESPECTADOR_SOLICITUD',
  'ESPECTADOR_APROBADO','MURO_RESPUESTA','MODERACION','MENCION','LOGRO','RESULTADO_PROPUESTO','RESULTADO_CONFIRMADO','RESULTADO_DISPUTADO','EVENTO','CLAN'));
create or replace function private.categoria_notif(p_tipo text) returns text
language sql immutable set search_path = '' as $$
  select case
    when p_tipo in ('AMISTAD_SOLICITUD','AMISTAD_ACEPTADA','SEGUIDOR_NUEVO','CLAN') then 'social'
    when p_tipo = 'MURO_RESPUESTA' then 'muro'
    when p_tipo = 'MENCION' then 'menciones'
    when p_tipo = 'LOGRO' then 'logros'
    when p_tipo = 'EVENTO' then 'eventos'
    when p_tipo = 'MODERACION' then 'sistema'
    else 'duelos' end
$$;

-- ─── 3) Ayudantes internos ──────────────────────────────────────────────────────────────────────────────────────
create or replace function private.clan_de(p_uid uuid) returns bigint language sql stable security definer set search_path = '' as $$
  select clan_id from public.clan_miembros where usuario_id = p_uid $$;
create or replace function private.clan_rol(p_uid uuid) returns text language sql stable security definer set search_path = '' as $$
  select rol from public.clan_miembros where usuario_id = p_uid $$;
create or replace function private.es_adulto(p_uid uuid) returns boolean language sql stable security definer set search_path = '' as $$
  select private.categoria_edad(p_uid) = 'adulto' $$;
create or replace function private.clan_adultos(p_clan bigint) returns integer language sql stable security definer set search_path = '' as $$
  select count(*)::integer from public.clan_miembros m where m.clan_id = p_clan and private.es_adulto(m.usuario_id) $$;
-- Elegibles para ser capitán: adultos con al menos 5 días en el clan.
create or replace function private.clan_elegible(p_clan bigint, p_uid uuid) returns boolean language sql stable security definer set search_path = '' as $$
  select exists (select 1 from public.clan_miembros m where m.clan_id = p_clan and m.usuario_id = p_uid and m.desde <= now() - interval '5 days' and private.es_adulto(m.usuario_id)) $$;
-- ¿Puede esta persona estar en el mismo clan que todos sus miembros? (sin separación por edad ni bloqueos)
create or replace function private.clan_compatible(p_uid uuid, p_clan bigint) returns boolean language sql stable security definer set search_path = '' as $$
  select not exists (select 1 from public.clan_miembros m where m.clan_id = p_clan and (private.separados_por_edad(p_uid, m.usuario_id) or private.hay_bloqueo(p_uid, m.usuario_id))) $$;
create or replace function private.clan_votos_necesarios(p_adultos integer) returns integer language sql immutable set search_path = '' as $$
  select (p_adultos * 70) / 100 + 1 $$;                                   -- «más del 70 %»: floor(0,7·n) + 1

-- Aviso a todos los miembros de un clan (menos `p_excluir`).
create or replace function private.clan_avisar(p_clan bigint, p_titulo text, p_mensaje text, p_excluir uuid default null) returns void
language sql security definer set search_path = '' as $$
  insert into public.notificaciones (usuario_id, tipo, titulo, mensaje, enlace)
  select m.usuario_id, 'CLAN', left(p_titulo, 120), left(p_mensaje, 300), 'clanes/' from public.clan_miembros m
  where m.clan_id = p_clan and (p_excluir is null or m.usuario_id <> p_excluir) $$;
create or replace function private.clan_avisar_a(p_uid uuid, p_titulo text, p_mensaje text) returns void
language sql security definer set search_path = '' as $$
  insert into public.notificaciones (usuario_id, tipo, titulo, mensaje, enlace) values (p_uid, 'CLAN', left(p_titulo, 120), left(p_mensaje, 300), 'clanes/') $$;

-- Nueva capitanía: el capitán anterior pasa a miembro y quien gana pasa a capitán (primero se baja, luego se sube: hay un índice de «un solo capitán»).
create or replace function private.clan_poner_capitan(p_clan bigint, p_uid uuid) returns void
language plpgsql security definer set search_path = '' as $$
begin
  update public.clan_miembros set rol = 'miembro' where clan_id = p_clan and rol = 'capitan' and usuario_id <> p_uid;
  update public.clan_miembros set rol = 'capitan' where clan_id = p_clan and usuario_id = p_uid;
end $$;

-- Sin votos (o sin elegibles): subcapitán adulto, y si no hay, el adulto más antiguo.
create or replace function private.clan_reemplazo(p_clan bigint) returns uuid language sql stable security definer set search_path = '' as $$
  select m.usuario_id from public.clan_miembros m where m.clan_id = p_clan and private.es_adulto(m.usuario_id)
  order by (m.rol = 'subcapitan') desc, m.desde asc, m.usuario_id limit 1 $$;

create or replace function private.clan_abrir_votacion(p_clan bigint, p_motivo text) returns void
language plpgsql security definer set search_path = '' as $$
declare elegibles integer; g uuid;
begin
  if exists (select 1 from public.clan_votaciones where clan_id = p_clan and estado = 'ABIERTA') then return; end if;
  select count(*) into elegibles from public.clan_miembros m where m.clan_id = p_clan and private.clan_elegible(p_clan, m.usuario_id);
  if elegibles = 0 then                                                    -- nadie puede ser votado todavía: se asigna sin votación
    if p_motivo = 'vacante' then
      g := private.clan_reemplazo(p_clan);
      if g is not null then perform private.clan_poner_capitan(p_clan, g); perform private.clan_avisar(p_clan, 'Nuevo capitán', private.nombre(g) || ' es ahora el capitán del clan.'); end if;
    end if;
    return;
  end if;
  insert into public.clan_votaciones (clan_id, motivo, cierra_at) values (p_clan, p_motivo, now() + interval '48 hours');
  delete from public.clan_destituciones where clan_id = p_clan;
  perform private.clan_avisar(p_clan, case when p_motivo = 'vacante' then 'Elección de capitán' else 'Votación para destituir al capitán' end,
    'Hay una votación abierta por 48 horas: entra a Clanes y vota.');
end $$;

create or replace function private.clan_cerrar_votacion(p_id bigint) returns void
language plpgsql security definer set search_path = '' as $$
declare v public.clan_votaciones; g uuid; actual uuid;
begin
  select * into v from public.clan_votaciones where id = p_id and estado = 'ABIERTA' for update;
  if not found then return; end if;
  -- Solo cuentan votos de miembros adultos actuales hacia miembros adultos actuales (si alguien se fue durante la votación, su voto o su candidatura no cuentan).
  select t.candidato_id into g from (
    select vt.candidato_id, count(*) as n, min(mc.desde) as desde
      from public.clan_votos vt
      join public.clan_miembros mv on mv.usuario_id = vt.votante_id and mv.clan_id = v.clan_id and private.es_adulto(mv.usuario_id)
      join public.clan_miembros mc on mc.usuario_id = vt.candidato_id and mc.clan_id = v.clan_id and private.es_adulto(mc.usuario_id)
     where vt.votacion_id = v.id group by vt.candidato_id) t
   order by t.n desc, t.desde asc, t.candidato_id limit 1;
  select usuario_id into actual from public.clan_miembros where clan_id = v.clan_id and rol = 'capitan';
  if g is null then g := case when v.motivo = 'destitucion' then actual else private.clan_reemplazo(v.clan_id) end; end if;   -- sin votos: en destitución sigue el capitán
  if g is not null then perform private.clan_poner_capitan(v.clan_id, g); end if;
  update public.clan_votaciones set estado = 'CERRADA', ganador_id = g where id = v.id;
  if g is not null then
    perform private.clan_avisar(v.clan_id, 'Resultado de la votación', case when g = actual then private.nombre(g) || ' sigue como capitán del clan.' else private.nombre(g) || ' es el nuevo capitán del clan.' end);
  end if;
end $$;

-- Revisión idempotente del estado de capitanía de un clan (la llaman el disparador y el cron).
create or replace function private.clan_revisar(p_clan bigint) returns void
language plpgsql security definer set search_path = '' as $$
declare adultos integer; unico uuid;
begin
  if not exists (select 1 from public.clanes where id = p_clan) then return; end if;
  adultos := private.clan_adultos(p_clan);
  if adultos = 0 then                                                      -- sin adultos no puede haber capitán: el clan se disuelve
    perform private.clan_avisar(p_clan, 'Clan disuelto', 'El clan se disolvió porque no quedan miembros adultos.');
    delete from public.clanes where id = p_clan; return;
  end if;
  if exists (select 1 from public.clan_miembros where clan_id = p_clan and rol = 'capitan') then return; end if;
  if exists (select 1 from public.clan_votaciones where clan_id = p_clan and estado = 'ABIERTA') then return; end if;
  if adultos = 1 then
    select usuario_id into unico from public.clan_miembros where clan_id = p_clan and private.es_adulto(usuario_id) limit 1;
    perform private.clan_poner_capitan(p_clan, unico);
    perform private.clan_avisar(p_clan, 'Nuevo capitán', private.nombre(unico) || ' es ahora el capitán del clan.');
    return;
  end if;
  perform private.clan_abrir_votacion(p_clan, 'vacante');
end $$;

create or replace function private.clan_tras_salida() returns trigger
language plpgsql security definer set search_path = '' as $$
begin
  perform private.clan_revisar(old.clan_id);
  return null;
exception when others then
  raise warning 'clan_tras_salida falló (lo repara el cron): %', sqlerrm;
  return null;
end $$;
drop trigger if exists clan_tras_salida on public.clan_miembros;
create trigger clan_tras_salida after delete on public.clan_miembros for each row execute function private.clan_tras_salida();

-- Cron: cierra votaciones vencidas y repara clanes sin capitán. Tolerante: un error en un clan no frena a los demás.
create or replace function private.procesar_clanes() returns integer
language plpgsql security definer set search_path = '' as $$
declare r record; n integer := 0;
begin
  for r in select id from public.clan_votaciones where estado = 'ABIERTA' and cierra_at <= now() loop
    begin perform private.clan_cerrar_votacion(r.id); n := n + 1; exception when others then raise warning 'cerrar votación % falló: %', r.id, sqlerrm; end;
  end loop;
  for r in select c.id from public.clanes c where not exists (select 1 from public.clan_miembros m where m.clan_id = c.id and m.rol = 'capitan') loop
    begin perform private.clan_revisar(r.id); n := n + 1; exception when others then raise warning 'revisar clan % falló: %', r.id, sqlerrm; end;
  end loop;
  return n;
end $$;
revoke all on function private.clan_max(), private.clan_de(uuid), private.clan_rol(uuid), private.es_adulto(uuid), private.clan_adultos(bigint), private.clan_elegible(bigint, uuid),
  private.clan_compatible(uuid, bigint), private.clan_votos_necesarios(integer), private.clan_avisar(bigint, text, text, uuid), private.clan_avisar_a(uuid, text, text),
  private.clan_poner_capitan(bigint, uuid), private.clan_reemplazo(bigint), private.clan_abrir_votacion(bigint, text), private.clan_cerrar_votacion(bigint),
  private.clan_revisar(bigint), private.clan_tras_salida(), private.procesar_clanes() from public, anon, authenticated;
select cron.unschedule(jobid) from cron.job where jobname = 'procesar-clanes';
select cron.schedule('procesar-clanes', '* * * * *', 'select private.procesar_clanes()');

-- ─── 4) Crear, editar, entrar y salir ─────────────────────────────────────────────────────────────────────────
create or replace function public.crear_clan(p_nombre text, p_etiqueta text, p_descripcion text default '') returns bigint
language plpgsql security definer set search_path = '' as $$
declare yo uuid := private.uid_requerido(); n text := btrim(regexp_replace(coalesce(p_nombre, ''), '[<>]', '', 'g')); e text := upper(btrim(coalesce(p_etiqueta, '')));
        d text := btrim(regexp_replace(coalesce(p_descripcion, ''), '[<>]', '', 'g')); nuevo bigint;
begin
  if not private.es_adulto(yo) then raise exception 'Solo las personas adultas (con la edad declarada) pueden crear un clan.'; end if;
  if private.clan_de(yo) is not null then raise exception 'Ya perteneces a un clan: sal de él para crear otro.'; end if;
  if char_length(n) < 3 or char_length(n) > 24 then raise exception 'El nombre del clan debe tener entre 3 y 24 caracteres.'; end if;
  if e !~ '^[A-Z0-9]{2,5}$' then raise exception 'La etiqueta debe tener entre 2 y 5 letras o números (sin espacios).'; end if;
  if char_length(d) > 200 then raise exception 'La descripción admite máximo 200 caracteres.'; end if;
  begin
    insert into public.clanes (nombre, etiqueta, descripcion, creador_id) values (n, e, d, yo) returning id into nuevo;
  exception when unique_violation then raise exception 'Ese nombre o esa etiqueta ya está en uso.'; end;
  insert into public.clan_miembros (clan_id, usuario_id, rol) values (nuevo, yo, 'capitan');
  delete from public.clan_solicitudes where usuario_id = yo;
  return nuevo;
end $$;

create or replace function public.editar_clan(p_descripcion text) returns void
language plpgsql security definer set search_path = '' as $$
declare yo uuid := private.uid_requerido(); d text := btrim(regexp_replace(coalesce(p_descripcion, ''), '[<>]', '', 'g'));
begin
  if private.clan_rol(yo) is distinct from 'capitan' then raise exception 'Solo el capitán puede editar el clan.'; end if;
  if char_length(d) > 200 then raise exception 'La descripción admite máximo 200 caracteres.'; end if;
  update public.clanes set descripcion = d where id = private.clan_de(yo);
end $$;

create or replace function public.invitar_a_clan(p_usuario uuid) returns void
language plpgsql security definer set search_path = '' as $$
declare yo uuid := private.uid_requerido(); c bigint := private.clan_de(yo); cl public.clanes;
begin
  if c is null or private.clan_rol(yo) not in ('capitan', 'subcapitan') then raise exception 'Solo el capitán o el subcapitán pueden invitar.'; end if;
  if p_usuario is null or p_usuario = yo or not exists (select 1 from public.perfiles where id = p_usuario) then raise exception 'Esa persona no existe.'; end if;
  if private.clan_de(p_usuario) is not null then raise exception 'Esa persona ya está en un clan.'; end if;
  if (select count(*) from public.clan_miembros where clan_id = c) >= private.clan_max() then raise exception 'El clan está lleno (máximo %).', private.clan_max(); end if;
  if not private.clan_compatible(p_usuario, c) then raise exception 'No puedes invitar a esa persona a este clan.'; end if;
  select * into cl from public.clanes where id = c;
  begin insert into public.clan_solicitudes (clan_id, usuario_id, tipo) values (c, p_usuario, 'invitacion');
  exception when unique_violation then raise exception 'Ya hay una invitación o solicitud pendiente con esa persona.'; end;
  perform private.clan_avisar_a(p_usuario, 'Invitación a un clan', 'Te invitaron a unirte a «' || cl.nombre || '» [' || cl.etiqueta || '].');
end $$;

create or replace function public.solicitar_ingreso_clan(p_clan bigint) returns void
language plpgsql security definer set search_path = '' as $$
declare yo uuid := private.uid_requerido(); cl public.clanes; r record;
begin
  if private.clan_de(yo) is not null then raise exception 'Ya perteneces a un clan.'; end if;
  select * into cl from public.clanes where id = p_clan and not oculto;
  if not found then raise exception 'Ese clan no está disponible.'; end if;
  if (select count(*) from public.clan_miembros where clan_id = p_clan) >= private.clan_max() then raise exception 'El clan está lleno (máximo %).', private.clan_max(); end if;
  if not private.clan_compatible(yo, p_clan) then raise exception 'No puedes unirte a este clan.'; end if;
  begin insert into public.clan_solicitudes (clan_id, usuario_id, tipo) values (p_clan, yo, 'solicitud');
  exception when unique_violation then raise exception 'Ya hay una invitación o solicitud pendiente con este clan.'; end;
  for r in select usuario_id from public.clan_miembros where clan_id = p_clan and rol in ('capitan', 'subcapitan') loop
    perform private.clan_avisar_a(r.usuario_id, 'Solicitud para entrar al clan', private.nombre(yo) || ' quiere unirse a «' || cl.nombre || '».');
  end loop;
end $$;

-- Responder: la invitación la responde la persona invitada; la solicitud, el capitán o el subcapitán.
create or replace function public.responder_solicitud_clan(p_id bigint, p_acepta boolean) returns void
language plpgsql security definer set search_path = '' as $$
declare yo uuid := private.uid_requerido(); s public.clan_solicitudes; cl public.clanes;
begin
  if p_acepta is null then raise exception 'Indica si aceptas o rechazas.'; end if;
  select * into s from public.clan_solicitudes where id = p_id for update;
  if not found then raise exception 'Esa solicitud ya no existe.'; end if;
  select * into cl from public.clanes where id = s.clan_id;
  if s.tipo = 'invitacion' then
    if s.usuario_id <> yo then raise exception 'Esa invitación no es tuya.'; end if;
  else
    if private.clan_de(yo) is distinct from s.clan_id or private.clan_rol(yo) not in ('capitan', 'subcapitan') then raise exception 'No puedes responder esa solicitud.'; end if;
  end if;
  if not p_acepta then
    delete from public.clan_solicitudes where id = s.id;
    if s.tipo = 'solicitud' then perform private.clan_avisar_a(s.usuario_id, 'Solicitud rechazada', 'El clan «' || cl.nombre || '» no aceptó tu solicitud.'); end if;
    return;
  end if;
  if private.clan_de(s.usuario_id) is not null then delete from public.clan_solicitudes where id = s.id; raise exception 'Esa persona ya está en un clan.'; end if;
  if (select count(*) from public.clan_miembros where clan_id = s.clan_id) >= private.clan_max() then raise exception 'El clan está lleno (máximo %).', private.clan_max(); end if;
  if not private.clan_compatible(s.usuario_id, s.clan_id) then delete from public.clan_solicitudes where id = s.id; raise exception 'Ya no es posible unir a esa persona a este clan.'; end if;
  insert into public.clan_miembros (clan_id, usuario_id) values (s.clan_id, s.usuario_id);
  delete from public.clan_solicitudes where usuario_id = s.usuario_id;     -- al entrar a un clan se anulan sus demás solicitudes e invitaciones
  perform private.clan_avisar(s.clan_id, 'Nuevo miembro', private.nombre(s.usuario_id) || ' se unió al clan.', s.usuario_id);
  perform private.clan_avisar_a(s.usuario_id, 'Ya eres parte del clan', 'Te uniste a «' || cl.nombre || '» [' || cl.etiqueta || '].');
end $$;

create or replace function public.salir_del_clan() returns void
language plpgsql security definer set search_path = '' as $$
declare yo uuid := private.uid_requerido();
begin
  if private.clan_de(yo) is null then raise exception 'No perteneces a ningún clan.'; end if;
  delete from public.clan_destituciones where usuario_id = yo;
  delete from public.clan_miembros where usuario_id = yo;                  -- el disparador revisa la capitanía
end $$;

create or replace function public.expulsar_de_clan(p_usuario uuid) returns void
language plpgsql security definer set search_path = '' as $$
declare yo uuid := private.uid_requerido(); c bigint := private.clan_de(yo); rol_yo text := private.clan_rol(yo); rol_ot text; cl public.clanes;
begin
  if c is null or rol_yo not in ('capitan', 'subcapitan') then raise exception 'Solo el capitán o el subcapitán pueden expulsar.'; end if;
  if p_usuario is null or p_usuario = yo then raise exception 'Para irte del clan usa «Salir del clan».'; end if;
  select rol into rol_ot from public.clan_miembros where clan_id = c and usuario_id = p_usuario;
  if rol_ot is null then raise exception 'Esa persona no está en tu clan.'; end if;
  if rol_yo = 'subcapitan' and rol_ot <> 'miembro' then raise exception 'El subcapitán solo puede expulsar a miembros.'; end if;
  select * into cl from public.clanes where id = c;
  delete from public.clan_destituciones where usuario_id = p_usuario;
  delete from public.clan_miembros where usuario_id = p_usuario;
  perform private.clan_avisar_a(p_usuario, 'Saliste del clan', 'Fuiste expulsado de «' || cl.nombre || '».');
end $$;

create or replace function public.nombrar_subcapitan(p_usuario uuid) returns void
language plpgsql security definer set search_path = '' as $$
declare yo uuid := private.uid_requerido(); c bigint := private.clan_de(yo);
begin
  if c is null or private.clan_rol(yo) <> 'capitan' then raise exception 'Solo el capitán puede nombrar al subcapitán.'; end if;
  if p_usuario is null or p_usuario = yo or private.clan_de(p_usuario) is distinct from c then raise exception 'Esa persona no está en tu clan.'; end if;
  if not private.es_adulto(p_usuario) then raise exception 'El subcapitán debe ser una persona adulta.'; end if;
  update public.clan_miembros set rol = 'miembro' where clan_id = c and rol = 'subcapitan' and usuario_id <> p_usuario;
  update public.clan_miembros set rol = 'subcapitan' where clan_id = c and usuario_id = p_usuario;
  perform private.clan_avisar_a(p_usuario, 'Eres subcapitán', 'El capitán te nombró subcapitán del clan.');
end $$;

create or replace function public.ceder_capitania(p_usuario uuid) returns void
language plpgsql security definer set search_path = '' as $$
declare yo uuid := private.uid_requerido(); c bigint := private.clan_de(yo);
begin
  if c is null or private.clan_rol(yo) <> 'capitan' then raise exception 'Solo el capitán puede ceder el cargo.'; end if;
  if p_usuario is null or p_usuario = yo or private.clan_de(p_usuario) is distinct from c then raise exception 'Esa persona no está en tu clan.'; end if;
  if not private.es_adulto(p_usuario) then raise exception 'El capitán debe ser una persona adulta.'; end if;
  if exists (select 1 from public.clan_votaciones where clan_id = c and estado = 'ABIERTA') then raise exception 'Hay una votación abierta: espera su resultado.'; end if;
  perform private.clan_poner_capitan(c, p_usuario);
  perform private.clan_avisar(c, 'Nuevo capitán', private.nombre(p_usuario) || ' es ahora el capitán del clan.');
end $$;

-- ─── 5) Destitución y votación ──────────────────────────────────────────────────────────────────────────────────
create or replace function public.pedir_destitucion(p_pedir boolean) returns jsonb
language plpgsql security definer set search_path = '' as $$
declare yo uuid := private.uid_requerido(); c bigint := private.clan_de(yo); adultos integer; pedidos integer; nec integer;
begin
  if c is null or not private.es_adulto(yo) then raise exception 'Solo los miembros adultos del clan pueden pedir una destitución.'; end if;
  if p_pedir is null then raise exception 'Indica si pides o retiras la destitución.'; end if;
  if private.clan_rol(yo) = 'capitan' then raise exception 'El capitán no puede pedir su propia destitución: puede ceder el cargo.'; end if;
  if exists (select 1 from public.clan_votaciones where clan_id = c and estado = 'ABIERTA') then raise exception 'Ya hay una votación abierta.'; end if;
  if p_pedir then insert into public.clan_destituciones (clan_id, usuario_id) values (c, yo) on conflict do nothing;
  else delete from public.clan_destituciones where clan_id = c and usuario_id = yo; end if;
  adultos := private.clan_adultos(c); nec := private.clan_votos_necesarios(adultos);
  select count(*)::integer into pedidos from public.clan_destituciones d where d.clan_id = c and private.es_adulto(d.usuario_id) and private.clan_de(d.usuario_id) = c;
  if pedidos >= nec then perform private.clan_abrir_votacion(c, 'destitucion'); end if;
  return jsonb_build_object('pedidos', pedidos, 'necesarios', nec, 'yo_pedi', p_pedir);
end $$;

create or replace function public.votar_clan(p_candidato uuid) returns jsonb
language plpgsql security definer set search_path = '' as $$
declare yo uuid := private.uid_requerido(); c bigint := private.clan_de(yo); v public.clan_votaciones; top integer; adultos integer;
begin
  if c is null or not private.es_adulto(yo) then raise exception 'Solo los miembros adultos del clan pueden votar.'; end if;
  select * into v from public.clan_votaciones where clan_id = c and estado = 'ABIERTA' for update;
  if not found or v.cierra_at <= now() then raise exception 'No hay una votación abierta.'; end if;
  if p_candidato is null or not private.clan_elegible(c, p_candidato) then raise exception 'Esa persona no puede ser elegida (debe ser adulta y llevar al menos 5 días en el clan).'; end if;
  insert into public.clan_votos (votacion_id, votante_id, candidato_id) values (v.id, yo, p_candidato)
  on conflict (votacion_id, votante_id) do update set candidato_id = excluded.candidato_id;
  adultos := private.clan_adultos(c);
  select max(n)::integer into top from (select count(*) as n from public.clan_votos vt join public.clan_miembros mv on mv.usuario_id = vt.votante_id and mv.clan_id = c and private.es_adulto(mv.usuario_id)
                                         where vt.votacion_id = v.id group by vt.candidato_id) t;
  if coalesce(top, 0) >= private.clan_votos_necesarios(adultos) then perform private.clan_cerrar_votacion(v.id); return jsonb_build_object('cerrada', true); end if;
  return jsonb_build_object('cerrada', false);
end $$;

-- ─── 6) Lectura ──────────────────────────────────────────────────────────────────────────────────────────────────
-- Mi situación: si estoy en un clan → clan, miembros, solicitudes (solo capitán/subcapitán), votación y destitución; si no → mis invitaciones y solicitudes enviadas.
create or replace function public.mi_clan() returns jsonb
language plpgsql stable security definer set search_path = '' as $$
declare yo uuid := private.uid_requerido(); c bigint := private.clan_de(yo); mi text := private.clan_rol(yo); v public.clan_votaciones; adultos integer; nec integer; res jsonb;
begin
  if c is null then
    return jsonb_build_object('clan', null,
      'invitaciones', coalesce((select jsonb_agg(jsonb_build_object('id', s.id, 'clan_id', cl.id, 'nombre', cl.nombre, 'etiqueta', cl.etiqueta, 'miembros', (select count(*) from public.clan_miembros m where m.clan_id = cl.id)) order by s.created_at desc)
                                 from public.clan_solicitudes s join public.clanes cl on cl.id = s.clan_id where s.usuario_id = yo and s.tipo = 'invitacion' and not cl.oculto), '[]'::jsonb),
      'enviadas', coalesce((select jsonb_agg(jsonb_build_object('id', s.id, 'clan_id', cl.id, 'nombre', cl.nombre, 'etiqueta', cl.etiqueta) order by s.created_at desc)
                             from public.clan_solicitudes s join public.clanes cl on cl.id = s.clan_id where s.usuario_id = yo and s.tipo = 'solicitud'), '[]'::jsonb));
  end if;
  adultos := private.clan_adultos(c); nec := private.clan_votos_necesarios(adultos);
  select * into v from public.clan_votaciones where clan_id = c and estado = 'ABIERTA';
  res := jsonb_build_object(
    'clan', (select jsonb_build_object('id', cl.id, 'nombre', cl.nombre, 'etiqueta', cl.etiqueta, 'descripcion', cl.descripcion, 'oculto', cl.oculto) from public.clanes cl where cl.id = c),
    'mi_rol', mi, 'maximo', private.clan_max(), 'adultos', adultos,
    'miembros', coalesce((select jsonb_agg(jsonb_build_object('usuario_id', m.usuario_id, 'username', p.username, 'nombre', p.nombre_display, 'avatar_url', p.avatar_url, 'rol', m.rol, 'desde', m.desde,
                            'adulto', private.es_adulto(m.usuario_id), 'elegible', private.clan_elegible(c, m.usuario_id))
                            order by (m.rol = 'capitan') desc, (m.rol = 'subcapitan') desc, m.desde)
                          from public.clan_miembros m join public.perfiles p on p.id = m.usuario_id where m.clan_id = c), '[]'::jsonb),
    'solicitudes', case when mi in ('capitan', 'subcapitan') then coalesce((select jsonb_agg(jsonb_build_object('id', s.id, 'usuario_id', s.usuario_id, 'username', p.username, 'nombre', p.nombre_display, 'tipo', s.tipo) order by s.created_at)
                          from public.clan_solicitudes s join public.perfiles p on p.id = s.usuario_id where s.clan_id = c), '[]'::jsonb) else '[]'::jsonb end,
    'destitucion', jsonb_build_object('pedidos', (select count(*) from public.clan_destituciones d where d.clan_id = c), 'necesarios', nec, 'yo_pedi', exists (select 1 from public.clan_destituciones d where d.clan_id = c and d.usuario_id = yo)),
    'votacion', case when v.id is null then null else jsonb_build_object('id', v.id, 'motivo', v.motivo, 'cierra_at', v.cierra_at, 'necesarios', nec,
        'mi_voto', (select candidato_id from public.clan_votos where votacion_id = v.id and votante_id = yo),
        'candidatos', coalesce((select jsonb_agg(jsonb_build_object('usuario_id', m.usuario_id, 'username', p.username, 'nombre', p.nombre_display,
                                  'votos', (select count(*) from public.clan_votos vt join public.clan_miembros mv on mv.usuario_id = vt.votante_id and mv.clan_id = c and private.es_adulto(mv.usuario_id) where vt.votacion_id = v.id and vt.candidato_id = m.usuario_id))
                                  order by m.desde)
                                from public.clan_miembros m join public.perfiles p on p.id = m.usuario_id where m.clan_id = c and private.clan_elegible(c, m.usuario_id)), '[]'::jsonb)) end);
  return res;
end $$;

-- Explorar clanes (público). Búsqueda por nombre o etiqueta.
create or replace function public.clanes_lista(p_busqueda text default null, p_limite integer default 30) returns jsonb
language plpgsql stable security definer set search_path = '' as $$
declare q text := nullif(btrim(coalesce(p_busqueda, '')), ''); n integer := least(greatest(coalesce(p_limite, 30), 1), 50);
begin
  return coalesce((select jsonb_agg(f.dato order by f.miembros desc, f.id) from (
    select cl.id, (select count(*) from public.clan_miembros m where m.clan_id = cl.id) as miembros,
           jsonb_build_object('id', cl.id, 'nombre', cl.nombre, 'etiqueta', cl.etiqueta, 'descripcion', cl.descripcion,
             'miembros', (select count(*) from public.clan_miembros m where m.clan_id = cl.id),
             'capitan', (select p.username from public.clan_miembros m join public.perfiles p on p.id = m.usuario_id where m.clan_id = cl.id and m.rol = 'capitan'),
             'oculto', cl.oculto) as dato
      from public.clanes cl
     where (not cl.oculto or private.es_moderador()) and (q is null or cl.nombre ilike '%' || q || '%' or cl.etiqueta ilike q || '%')
     order by 2 desc, cl.id limit n) f), '[]'::jsonb);
end $$;

-- Clan de una persona (para la etiqueta en su perfil). Nulo si no tiene o si el clan está oculto.
create or replace function public.clan_de_usuario(p_usuario uuid) returns jsonb
language sql stable security definer set search_path = '' as $$
  select jsonb_build_object('id', cl.id, 'nombre', cl.nombre, 'etiqueta', cl.etiqueta, 'rol', m.rol)
  from public.clan_miembros m join public.clanes cl on cl.id = m.clan_id where m.usuario_id = p_usuario and not cl.oculto $$;

-- ─── 7) Moderación (moderador/admin; auditada) ────────────────────────────────────────────────────────────────────
create or replace function public.moderar_clan(p_clan bigint, p_oculto boolean, p_motivo text default null) returns void
language plpgsql security definer set search_path = '' as $$
declare yo uuid := private.uid_requerido(); cl public.clanes; m text := nullif(btrim(coalesce(p_motivo, '')), '');
begin
  if not private.es_moderador() then raise exception 'Solo el equipo de moderación puede hacer esto.'; end if;
  if p_oculto is null then raise exception 'Indica si ocultas o muestras el clan.'; end if;
  if p_oculto and (m is null or char_length(m) < 3) then raise exception 'Indica un motivo (mínimo 3 caracteres).'; end if;
  select * into cl from public.clanes where id = p_clan for update;
  if not found then raise exception 'Ese clan no existe.'; end if;
  update public.clanes set oculto = p_oculto where id = p_clan;
  perform private.auditar_moderacion(case when p_oculto then 'ocultar' else 'editar' end, 'clanes', p_clan::text, cl.nombre, jsonb_build_object('oculto', p_oculto), m);
  perform private.clan_avisar(p_clan, case when p_oculto then 'Tu clan fue ocultado' else 'Tu clan vuelve a ser visible' end, coalesce(m, 'El equipo de moderación revisó el clan.'));
end $$;

create or replace function public.moderar_expulsar_de_clan(p_usuario uuid, p_motivo text) returns void
language plpgsql security definer set search_path = '' as $$
declare yo uuid := private.uid_requerido(); c bigint := private.clan_de(p_usuario); cl public.clanes; m text := nullif(btrim(coalesce(p_motivo, '')), '');
begin
  if not private.es_moderador() then raise exception 'Solo el equipo de moderación puede hacer esto.'; end if;
  if m is null or char_length(m) < 3 then raise exception 'Indica un motivo (mínimo 3 caracteres).'; end if;
  if c is null then raise exception 'Esa persona no está en ningún clan.'; end if;
  select * into cl from public.clanes where id = c;
  delete from public.clan_destituciones where usuario_id = p_usuario;
  delete from public.clan_miembros where usuario_id = p_usuario;
  perform private.auditar_moderacion('editar', 'clan_miembros', p_usuario::text, cl.nombre, jsonb_build_object('expulsado', true), m);
  perform private.clan_avisar_a(p_usuario, 'Saliste del clan', 'El equipo de moderación te sacó de «' || cl.nombre || '». Motivo: ' || m);
end $$;

-- ─── 8) Permisos ──────────────────────────────────────────────────────────────────────────────────────────────────
revoke all on function public.crear_clan(text, text, text), public.editar_clan(text), public.invitar_a_clan(uuid), public.solicitar_ingreso_clan(bigint), public.responder_solicitud_clan(bigint, boolean),
  public.salir_del_clan(), public.expulsar_de_clan(uuid), public.nombrar_subcapitan(uuid), public.ceder_capitania(uuid), public.pedir_destitucion(boolean), public.votar_clan(uuid),
  public.mi_clan(), public.moderar_clan(bigint, boolean, text), public.moderar_expulsar_de_clan(uuid, text) from public, anon;
grant execute on function public.crear_clan(text, text, text), public.editar_clan(text), public.invitar_a_clan(uuid), public.solicitar_ingreso_clan(bigint), public.responder_solicitud_clan(bigint, boolean),
  public.salir_del_clan(), public.expulsar_de_clan(uuid), public.nombrar_subcapitan(uuid), public.ceder_capitania(uuid), public.pedir_destitucion(boolean), public.votar_clan(uuid),
  public.mi_clan(), public.moderar_clan(bigint, boolean, text), public.moderar_expulsar_de_clan(uuid, text) to authenticated;
revoke all on function public.clanes_lista(text, integer), public.clan_de_usuario(uuid) from public;
grant execute on function public.clanes_lista(text, integer), public.clan_de_usuario(uuid) to anon, authenticated;

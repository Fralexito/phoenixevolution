-- 035 · OLA B (1/5) · INSIGNIAS Y LOGROS. Depende de 017 (amistades/seguidores), 021-027 (muro), 031 (ritmo), 032 (oculto), 033 (avisos), duelos (retos_matchmaking, reto_participantes).
-- Idea: un CATÁLOGO en tabla (cambiar metas o añadir logros = una fila, sin tocar código) + una función que MIDE a la persona y otorga lo que cumple.
-- Se evalúa en los eventos reales (publicar, subir clip, ganar seguidor, aceptar amistad, finalizar duelo) y al abrir «Mis logros»; el aviso a la campana solo sale cuando es NUEVO.
-- Honestidad de datos: hoy los duelos NO guardan marcador, así que no hay logros de victorias; los de duelos cuentan duelos FINALIZADOS (los que alguien dio por jugados).

-- ─── 1) Catálogo y logros obtenidos ────────────────────────────────────────────────────────────────────────────
create table if not exists public.logros_catalogo (
  id text primary key check (id ~ '^[a-z0-9_]{2,40}$'),
  categoria text not null check (categoria in ('duelos','muro','social','cuenta')),
  nombre text not null check (char_length(nombre) between 2 and 40),
  descripcion text not null check (char_length(descripcion) between 2 and 160),
  icono text not null check (icono ~ '^fa-[a-z0-9-]{2,30}$'),
  nivel text not null check (nivel in ('bronce','plata','oro')),
  metrica text not null check (metrica in ('duelos','anfitrion','posts','clips','amigos','seguidores','reacciones','dias','perfil_completo')),
  objetivo integer not null check (objetivo >= 1),
  orden integer not null default 0,
  activo boolean not null default true
);
create table if not exists public.logros_usuario (
  usuario_id uuid not null references auth.users(id) on delete cascade,
  logro_id text not null references public.logros_catalogo(id) on delete cascade,
  obtenido_at timestamptz not null default now(),
  primary key (usuario_id, logro_id)
);
create index if not exists logros_usuario_logro_idx on public.logros_usuario (logro_id);
alter table public.logros_catalogo enable row level security;
alter table public.logros_usuario enable row level security;
revoke all on public.logros_catalogo, public.logros_usuario from anon, authenticated;       -- cerradas: solo por las funciones de abajo

insert into public.logros_catalogo (id, categoria, nombre, descripcion, icono, nivel, metrica, objetivo, orden) values
  ('primer_duelo',     'duelos', 'Primer duelo',        'Juega y finaliza tu primer duelo.',                         'fa-futbol',         'bronce', 'duelos',    1,   10),
  ('duelista_10',      'duelos', 'Duelista',            'Finaliza 10 duelos.',                                       'fa-bolt',           'plata',  'duelos',    10,  11),
  ('duelista_50',      'duelos', 'Leyenda de duelos',   'Finaliza 50 duelos.',                                       'fa-trophy',         'oro',    'duelos',    50,  12),
  ('anfitrion_1',      'duelos', 'Buen anfitrión',      'Ofrece tu conexión como host en un duelo finalizado.',      'fa-server',         'bronce', 'anfitrion', 1,   20),
  ('anfitrion_10',     'duelos', 'Pilar de la liga',    'Sé host en 10 duelos finalizados.',                         'fa-tower-broadcast','oro',    'anfitrion', 10,  21),
  ('primera_publicacion','muro', 'Primeras palabras',   'Publica por primera vez en tu muro.',                       'fa-pen',            'bronce', 'posts',     1,   30),
  ('cronista',         'muro',   'Cronista',            'Publica 25 veces en tu muro.',                              'fa-newspaper',      'plata',  'posts',     25,  31),
  ('primer_clip',      'muro',   'Primer clip',         'Sube tu primer clip.',                                      'fa-film',           'bronce', 'clips',     1,   40),
  ('director',         'muro',   'Director',            'Sube 10 clips.',                                            'fa-clapperboard',   'plata',  'clips',     10,  41),
  ('conectado',        'social', 'Conectado',           'Haz tu primera amistad.',                                   'fa-user-group',     'bronce', 'amigos',    1,   50),
  ('sociable',         'social', 'Sociable',            'Ten 10 amistades.',                                         'fa-users',          'plata',  'amigos',    10,  51),
  ('popular',          'social', 'Popular',             'Consigue 10 seguidores.',                                   'fa-heart',          'plata',  'seguidores',10,  52),
  ('referente',        'social', 'Referente',           'Consigue 50 seguidores.',                                   'fa-star',           'oro',    'seguidores',50,  53),
  ('aplaudido',        'social', 'Aplaudido',           'Recibe 25 reacciones en tus publicaciones.',                'fa-hands-clapping', 'plata',  'reacciones',25,  60),
  ('ovacion',          'social', 'Ovación',             'Recibe 200 reacciones en tus publicaciones.',               'fa-fire',           'oro',    'reacciones',200, 61),
  ('carnet_listo',     'cuenta', 'Carnet listo',        'Completa tu perfil.',                                       'fa-id-card',        'bronce', 'perfil_completo', 1, 70),
  ('veterano',         'cuenta', 'Veterano',            'Lleva 180 días en la comunidad.',                           'fa-hourglass-half', 'plata',  'dias',      180, 71),
  ('fundador',         'cuenta', 'Un año con nosotros', 'Lleva 365 días en la comunidad.',                           'fa-cake-candles',   'oro',    'dias',      365, 72)
on conflict (id) do nothing;                                                                 -- no pisa cambios hechos a mano al volver a ejecutar

-- ─── 2) Avisos: tipo LOGRO y categoría «logros» (se apaga igual que las demás) ─────────────────────────────────
alter table public.notificaciones drop constraint if exists notificaciones_tipo_check;
alter table public.notificaciones add constraint notificaciones_tipo_check check (tipo in (
  'RETO_DIRECTO','RETO_HOST','RETO_ACEPTADO','RETO_RECHAZADO','SALA_LISTA','CONFIRMAR_PARTIDO','AVISO_FINAL','PARTIDO_CONFIRMADO','PARTIDO_CANCELADO',
  'RETO_EXPIRADO','INVITACION_RETO','UNION_RETO','SALIO_RETO','AMISTAD_SOLICITUD','AMISTAD_ACEPTADA','SEGUIDOR_NUEVO','ESPECTADOR_SOLICITUD',
  'ESPECTADOR_APROBADO','MURO_RESPUESTA','MODERACION','MENCION','LOGRO'));
alter table public.notif_preferencias drop constraint if exists notif_preferencias_categoria_check;
alter table public.notif_preferencias add constraint notif_preferencias_categoria_check check (categoria in ('duelos','social','muro','menciones','logros'));

create or replace function private.categoria_notif(p_tipo text) returns text
language sql immutable set search_path = '' as $$
  select case
    when p_tipo in ('AMISTAD_SOLICITUD','AMISTAD_ACEPTADA','SEGUIDOR_NUEVO') then 'social'
    when p_tipo = 'MURO_RESPUESTA' then 'muro'
    when p_tipo = 'MENCION' then 'menciones'
    when p_tipo = 'LOGRO' then 'logros'
    when p_tipo = 'MODERACION' then 'sistema'
    else 'duelos' end
$$;

create or replace function public.mis_preferencias_notif() returns jsonb
language sql stable security definer set search_path = '' as $$
  select jsonb_object_agg(c, coalesce((select p.activa from public.notif_preferencias p where p.usuario_id = (select auth.uid()) and p.categoria = c), true))
  from unnest(array['duelos','social','muro','menciones','logros']) as c
$$;

create or replace function public.guardar_preferencia_notif(p_categoria text, p_activa boolean) returns void
language plpgsql security definer set search_path = '' as $$
declare yo uuid := private.uid_requerido();
begin
  if p_categoria is null or p_categoria not in ('duelos','social','muro','menciones','logros') then raise exception 'Categoría de aviso no válida.'; end if;
  if p_activa is null then raise exception 'Indica si quieres recibir estos avisos o no.'; end if;
  insert into public.notif_preferencias (usuario_id, categoria, activa) values (yo, p_categoria, p_activa)
  on conflict (usuario_id, categoria) do update set activa = excluded.activa, updated_at = now();
end $$;

-- ─── 3) Medir y otorgar ────────────────────────────────────────────────────────────────────────────────────────
-- Las métricas de una persona (todas con índices existentes). Lo oculto por moderación no cuenta.
create or replace function private.metricas_logros(p_uid uuid) returns jsonb
language sql stable security definer set search_path = '' as $$
  select jsonb_build_object(
    'duelos', (select count(*) from public.retos_matchmaking r where r.estado::text = 'FINALIZADO'
                 and (r.retador_id = p_uid or r.rival_id = p_uid
                      or exists (select 1 from public.reto_participantes rp where rp.reto_id = r.id and rp.usuario_id = p_uid and rp.estado = 'CONFIRMADO'))),
    'anfitrion', (select count(*) from public.retos_matchmaking r where r.estado::text = 'FINALIZADO' and r.host_id = p_uid),
    'posts', (select count(*) from public.muro_publicaciones m where m.autor_id = p_uid and not m.oculto),
    'clips', (select count(*) from public.muro_clips c where c.autor_id = p_uid and not c.oculto),
    'amigos', (select count(*) from public.amistades a where a.estado = 'ACEPTADA' and p_uid in (a.usuario_a, a.usuario_b)),
    'seguidores', (select count(*) from public.seguidores s where s.seguido_id = p_uid),
    'reacciones', (select count(*) from public.muro_reacciones x join public.muro_publicaciones m on m.id = x.publicacion_id where m.autor_id = p_uid and x.usuario_id <> p_uid and not m.oculto),
    'dias', coalesce((select floor(extract(epoch from (now() - pf.created_at)) / 86400)::int from public.perfiles pf where pf.id = p_uid), 0),
    'perfil_completo', coalesce((select case when pf.perfil_completo then 1 else 0 end from public.perfiles pf where pf.id = p_uid), 0))
$$;
revoke all on function private.metricas_logros(uuid) from public, anon, authenticated;

-- Otorga lo que cumple y aún no tiene. `p_silencioso` = sin aviso a la campana (relleno inicial). → cuántos logros NUEVOS.
create or replace function private.evaluar_logros(p_uid uuid, p_silencioso boolean default false) returns integer
language plpgsql security definer set search_path = '' as $$
declare m jsonb; r record; nuevos integer := 0; filas integer;
begin
  if p_uid is null or not exists (select 1 from public.perfiles where id = p_uid) then return 0; end if;
  m := private.metricas_logros(p_uid);
  for r in select c.id, c.nombre, c.descripcion from public.logros_catalogo c
           where c.activo and coalesce((m ->> c.metrica)::integer, 0) >= c.objetivo
             and not exists (select 1 from public.logros_usuario lu where lu.usuario_id = p_uid and lu.logro_id = c.id) loop
    insert into public.logros_usuario (usuario_id, logro_id) values (p_uid, r.id) on conflict do nothing;
    get diagnostics filas = row_count;
    if filas > 0 then
      nuevos := nuevos + 1;
      if not p_silencioso then
        insert into public.notificaciones (usuario_id, tipo, titulo, mensaje, enlace)
        values (p_uid, 'LOGRO', '¡Nuevo logro!', left(r.nombre || ': ' || r.descripcion, 300), 'logros/');
      end if;
    end if;
  end loop;
  return nuevos;
end $$;
revoke all on function private.evaluar_logros(uuid, boolean) from public, anon, authenticated;

-- Triggers: evalúan a la(s) persona(s) implicada(s). NUNCA impiden la acción original (si algo falla, queda un WARNING y se sigue).
create or replace function private.trg_logros_columna() returns trigger
language plpgsql security definer set search_path = '' as $$
declare uid uuid;
begin
  execute format('select ($1).%I', tg_argv[0]) into uid using new;
  perform private.evaluar_logros(uid);
  return null;
exception when others then
  raise warning '[logros] % (%): %', tg_table_name, tg_argv[0], sqlerrm;
  return null;
end $$;
revoke all on function private.trg_logros_columna() from public, anon, authenticated;

create or replace function private.trg_logros_amistad() returns trigger
language plpgsql security definer set search_path = '' as $$
begin
  if new.estado = 'ACEPTADA' then perform private.evaluar_logros(new.usuario_a); perform private.evaluar_logros(new.usuario_b); end if;
  return null;
exception when others then raise warning '[logros] amistad %: %', new.id, sqlerrm; return null;
end $$;
revoke all on function private.trg_logros_amistad() from public, anon, authenticated;

create or replace function private.trg_logros_duelo() returns trigger
language plpgsql security definer set search_path = '' as $$
declare u uuid;
begin
  if new.estado::text = 'FINALIZADO' and old.estado::text is distinct from 'FINALIZADO' then
    for u in select x from (select new.retador_id as x union select new.rival_id union select new.host_id
                            union select usuario_id from public.reto_participantes where reto_id = new.id and estado = 'CONFIRMADO') s where x is not null loop
      perform private.evaluar_logros(u);
    end loop;
  end if;
  return null;
exception when others then raise warning '[logros] duelo %: %', new.id, sqlerrm; return null;
end $$;
revoke all on function private.trg_logros_duelo() from public, anon, authenticated;

drop trigger if exists logros_alta on public.muro_publicaciones;
create trigger logros_alta after insert on public.muro_publicaciones for each row execute function private.trg_logros_columna('autor_id');
drop trigger if exists logros_alta on public.muro_clips;
create trigger logros_alta after insert on public.muro_clips for each row execute function private.trg_logros_columna('autor_id');
drop trigger if exists logros_alta on public.seguidores;
create trigger logros_alta after insert on public.seguidores for each row execute function private.trg_logros_columna('seguido_id');
drop trigger if exists logros_alta on public.amistades;
create trigger logros_alta after insert on public.amistades for each row when (new.estado = 'ACEPTADA') execute function private.trg_logros_amistad();
drop trigger if exists logros_cambio on public.amistades;
create trigger logros_cambio after update of estado on public.amistades for each row when (new.estado = 'ACEPTADA' and old.estado is distinct from 'ACEPTADA') execute function private.trg_logros_amistad();
drop trigger if exists logros_cambio on public.retos_matchmaking;
create trigger logros_cambio after update of estado on public.retos_matchmaking for each row when (new.estado::text = 'FINALIZADO' and old.estado::text is distinct from 'FINALIZADO') execute function private.trg_logros_duelo();

-- ─── 4) Lectura ────────────────────────────────────────────────────────────────────────────────────────────────
-- MIS logros con progreso (evalúa antes, por si algo ocurrió sin disparar trigger: p. ej. la antigüedad cumple días sola).
create or replace function public.mis_logros() returns jsonb
language plpgsql security definer set search_path = '' as $$
declare yo uuid := private.uid_requerido(); m jsonb; lista jsonb;
begin
  perform private.evaluar_logros(yo);
  m := private.metricas_logros(yo);
  select coalesce(jsonb_agg(jsonb_build_object('id', c.id, 'categoria', c.categoria, 'nombre', c.nombre, 'descripcion', c.descripcion, 'icono', c.icono, 'nivel', c.nivel,
           'objetivo', c.objetivo, 'progreso', least(coalesce((m ->> c.metrica)::integer, 0), c.objetivo), 'obtenido_at', lu.obtenido_at) order by c.orden, c.id), '[]'::jsonb)
    into lista from public.logros_catalogo c left join public.logros_usuario lu on lu.logro_id = c.id and lu.usuario_id = yo where c.activo;
  return jsonb_build_object('logros', lista, 'obtenidos', (select count(*) from public.logros_usuario lu join public.logros_catalogo c on c.id = lu.logro_id where lu.usuario_id = yo and c.activo), 'total', (select count(*) from public.logros_catalogo where activo));
end $$;

-- Los logros OBTENIDOS de otra persona (los ve quien puede ver su muro). Sin progreso: solo lo ya ganado.
create or replace function public.logros_de(p_usuario uuid) returns jsonb
language plpgsql stable security definer set search_path = '' as $$
declare yo uuid := (select auth.uid());
begin
  if p_usuario is null or not private.puede_ver_muro(p_usuario, yo) then return jsonb_build_object('visible', false, 'logros', '[]'::jsonb, 'obtenidos', 0); end if;
  return jsonb_build_object('visible', true,
    'logros', coalesce((select jsonb_agg(jsonb_build_object('id', c.id, 'nombre', c.nombre, 'descripcion', c.descripcion, 'icono', c.icono, 'nivel', c.nivel, 'categoria', c.categoria, 'obtenido_at', lu.obtenido_at)
                                         order by case c.nivel when 'oro' then 0 when 'plata' then 1 else 2 end, lu.obtenido_at desc)
                        from public.logros_usuario lu join public.logros_catalogo c on c.id = lu.logro_id where lu.usuario_id = p_usuario and c.activo), '[]'::jsonb),
    'obtenidos', (select count(*) from public.logros_usuario lu join public.logros_catalogo c on c.id = lu.logro_id where lu.usuario_id = p_usuario and c.activo));
end $$;

revoke all on function public.mis_logros(), public.logros_de(uuid) from public, anon;
grant execute on function public.mis_logros() to authenticated;
grant execute on function public.logros_de(uuid) to anon, authenticated;

-- ─── 5) Relleno inicial SILENCIOSO: quien ya cumple condiciones recibe sus logros sin llenar la campana de avisos ───
do $$ declare u uuid; begin
  for u in select id from public.perfiles loop perform private.evaluar_logros(u, true); end loop;
end $$;

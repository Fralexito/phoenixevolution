-- 042 · OLA B (4/5) · EVENTOS DE LA COMUNIDAD (torneos, noches de duelos, transmisiones…). Depende de 030 (roles/auditoría), 031 (ritmo), 032 (sanciones), 033/035/036 (avisos) y pg_cron (003).
-- Qué es: una CITA publicada por el staff (moderador/admin) con título, fecha/hora, juego y descripción. Cualquiera la ve (también sin cuenta).
-- Con cuenta puedes marcar «Me interesa» y, si quieres, «Avísame 1 hora antes»: un trabajo de pg_cron (cada minuto) mira las citas que empiezan pronto
-- y escribe el aviso en la campana usando el MISMO sistema de avisos de siempre (preferencias, enlace seguro, limpieza a 30 días).
-- Privacidad: solo se muestra CUÁNTAS personas están interesadas, nunca quiénes (así no se expone a menores ni a nadie).
-- Auditoría: se registra con las acciones que ya admite el registro inalterable (crear · editar · ocultar=cancelar), tabla «eventos».
-- Cambio cruzado (alerta): se añade el tipo de aviso EVENTO y la categoría «eventos» (apagable). Se rehacen categoria_notif, mis_preferencias_notif y guardar_preferencia_notif
-- conservando TODO lo anterior; el cliente (core/avisos.js) debe listar la categoría nueva (ya incluido en esta ronda).

-- ─── 1) Tablas (cerradas: solo por funciones) ──────────────────────────────────────────────────────────────────
create table if not exists public.eventos (
  id bigint generated always as identity primary key,
  creador_id uuid not null references auth.users(id) on delete cascade,
  titulo text not null check (char_length(titulo) between 3 and 80),
  descripcion text not null default '' check (char_length(descripcion) <= 500),
  juego text check (juego is null or juego in ('pes','sp','fifa','eafc','efootball')),
  inicia_at timestamptz not null,
  cancelado boolean not null default false,
  motivo_cancelacion text check (motivo_cancelacion is null or char_length(motivo_cancelacion) <= 200),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);
create index if not exists eventos_inicio_idx on public.eventos (inicia_at);
create table if not exists public.evento_interesados (
  evento_id bigint not null references public.eventos(id) on delete cascade,
  usuario_id uuid not null references auth.users(id) on delete cascade,
  recordar boolean not null default true,
  aviso_enviado boolean not null default false,
  created_at timestamptz not null default now(),
  primary key (evento_id, usuario_id)
);
create index if not exists evento_interesados_usuario_idx on public.evento_interesados (usuario_id);
alter table public.eventos enable row level security;
alter table public.evento_interesados enable row level security;
revoke all on public.eventos, public.evento_interesados from anon, authenticated;

drop trigger if exists zy_bloqueo_sancion on public.evento_interesados;
create trigger zy_bloqueo_sancion before insert on public.evento_interesados for each row execute function private.bloquear_sancionados('usuario_id');
drop trigger if exists zz_limite_ritmo on public.evento_interesados;
create trigger zz_limite_ritmo before insert on public.evento_interesados for each row execute function private.limitar_ritmo('usuario_id', '60', '1 hour', 'Estás marcando muy rápido: espera un rato.');
drop trigger if exists zz_limite_ritmo on public.eventos;
create trigger zz_limite_ritmo before insert on public.eventos for each row execute function private.limitar_ritmo('creador_id', '20', '1 day', 'Máximo 20 eventos por día.');

-- ─── 2) Avisos: tipo EVENTO + categoría «eventos» (se apaga igual que las demás) ───────────────────────────────
alter table public.notificaciones drop constraint if exists notificaciones_tipo_check;
alter table public.notificaciones add constraint notificaciones_tipo_check check (tipo in (
  'RETO_DIRECTO','RETO_HOST','RETO_ACEPTADO','RETO_RECHAZADO','SALA_LISTA','CONFIRMAR_PARTIDO','AVISO_FINAL','PARTIDO_CONFIRMADO','PARTIDO_CANCELADO',
  'RETO_EXPIRADO','INVITACION_RETO','UNION_RETO','SALIO_RETO','AMISTAD_SOLICITUD','AMISTAD_ACEPTADA','SEGUIDOR_NUEVO','ESPECTADOR_SOLICITUD',
  'ESPECTADOR_APROBADO','MURO_RESPUESTA','MODERACION','MENCION','LOGRO','RESULTADO_PROPUESTO','RESULTADO_CONFIRMADO','RESULTADO_DISPUTADO','EVENTO'));
alter table public.notif_preferencias drop constraint if exists notif_preferencias_categoria_check;
alter table public.notif_preferencias add constraint notif_preferencias_categoria_check check (categoria in ('duelos','social','muro','menciones','logros','eventos'));

create or replace function private.categoria_notif(p_tipo text) returns text
language sql immutable set search_path = '' as $$
  select case
    when p_tipo in ('AMISTAD_SOLICITUD','AMISTAD_ACEPTADA','SEGUIDOR_NUEVO') then 'social'
    when p_tipo = 'MURO_RESPUESTA' then 'muro'
    when p_tipo = 'MENCION' then 'menciones'
    when p_tipo = 'LOGRO' then 'logros'
    when p_tipo = 'EVENTO' then 'eventos'
    when p_tipo = 'MODERACION' then 'sistema'
    else 'duelos' end
$$;

create or replace function public.mis_preferencias_notif() returns jsonb
language sql stable security definer set search_path = '' as $$
  select jsonb_object_agg(c, coalesce((select p.activa from public.notif_preferencias p where p.usuario_id = (select auth.uid()) and p.categoria = c), true))
  from unnest(array['duelos','social','muro','menciones','logros','eventos']) as c
$$;

create or replace function public.guardar_preferencia_notif(p_categoria text, p_activa boolean) returns void
language plpgsql security definer set search_path = '' as $$
declare yo uuid := private.uid_requerido();
begin
  if p_categoria is null or p_categoria not in ('duelos','social','muro','menciones','logros','eventos') then raise exception 'Categoría de aviso no válida.'; end if;
  if p_activa is null then raise exception 'Indica si quieres recibir estos avisos o no.'; end if;
  insert into public.notif_preferencias (usuario_id, categoria, activa) values (yo, p_categoria, p_activa)
  on conflict (usuario_id, categoria) do update set activa = excluded.activa, updated_at = now();
end $$;

-- ─── 3) Crear / editar / cancelar (solo moderador y admin; todo queda en la auditoría) ──────────────────────────
create or replace function public.crear_evento(p_titulo text, p_inicia_at timestamptz, p_juego text default null, p_descripcion text default '') returns bigint
language plpgsql security definer set search_path = '' as $$
declare yo uuid := private.uid_requerido(); t text := btrim(regexp_replace(coalesce(p_titulo, ''), '[<>]', '', 'g')); d text := btrim(regexp_replace(coalesce(p_descripcion, ''), '[<>]', '', 'g'));
        j text := nullif(btrim(coalesce(p_juego, '')), ''); nuevo bigint;
begin
  if not private.es_moderador() then raise exception 'Solo el equipo de moderación puede crear eventos.'; end if;
  if char_length(t) < 3 or char_length(t) > 80 then raise exception 'El título debe tener entre 3 y 80 caracteres.'; end if;
  if char_length(d) > 500 then raise exception 'La descripción admite máximo 500 caracteres.'; end if;
  if j is not null and j not in ('pes','sp','fifa','eafc','efootball') then raise exception 'Juego no válido.'; end if;
  if p_inicia_at is null or p_inicia_at <= now() then raise exception 'La fecha del evento debe ser futura.'; end if;
  if p_inicia_at > now() + interval '1 year' then raise exception 'La fecha del evento no puede pasar de 1 año.'; end if;
  insert into public.eventos (creador_id, titulo, descripcion, juego, inicia_at) values (yo, t, d, j, p_inicia_at) returning id into nuevo;
  perform private.auditar_moderacion('crear', 'eventos', nuevo::text, t, jsonb_build_object('inicia_at', p_inicia_at, 'juego', j), null);
  return nuevo;
end $$;

-- Editar: si cambia la hora, los recordatorios ya enviados se rearman y los interesados reciben un aviso.
create or replace function public.editar_evento(p_id bigint, p_titulo text, p_inicia_at timestamptz, p_juego text default null, p_descripcion text default '') returns void
language plpgsql security definer set search_path = '' as $$
declare yo uuid := private.uid_requerido(); e public.eventos; t text := btrim(regexp_replace(coalesce(p_titulo, ''), '[<>]', '', 'g')); d text := btrim(regexp_replace(coalesce(p_descripcion, ''), '[<>]', '', 'g'));
        j text := nullif(btrim(coalesce(p_juego, '')), ''); cambio_hora boolean;
begin
  if not private.es_moderador() then raise exception 'Solo el equipo de moderación puede editar eventos.'; end if;
  select * into e from public.eventos where id = p_id for update;
  if not found or e.cancelado then raise exception 'Ese evento no existe o ya fue cancelado.'; end if;
  if char_length(t) < 3 or char_length(t) > 80 then raise exception 'El título debe tener entre 3 y 80 caracteres.'; end if;
  if char_length(d) > 500 then raise exception 'La descripción admite máximo 500 caracteres.'; end if;
  if j is not null and j not in ('pes','sp','fifa','eafc','efootball') then raise exception 'Juego no válido.'; end if;
  cambio_hora := date_trunc('minute', p_inicia_at) is distinct from date_trunc('minute', e.inicia_at);   -- el formulario trabaja por minutos: reenviar la misma hora NO cuenta como cambio
  if p_inicia_at is null or (cambio_hora and p_inicia_at <= now()) then raise exception 'La fecha del evento debe ser futura.'; end if;
  if p_inicia_at > now() + interval '1 year' then raise exception 'La fecha del evento no puede pasar de 1 año.'; end if;
  update public.eventos set titulo = t, descripcion = d, juego = j, inicia_at = case when cambio_hora then p_inicia_at else e.inicia_at end, updated_at = now() where id = p_id;
  perform private.auditar_moderacion('editar', 'eventos', p_id::text, t, jsonb_build_object('inicia_at', p_inicia_at, 'juego', j, 'cambio_hora', cambio_hora), null);
  if cambio_hora then
    update public.evento_interesados set aviso_enviado = false where evento_id = p_id;
    insert into public.notificaciones (usuario_id, tipo, titulo, mensaje, enlace)
    select i.usuario_id, 'EVENTO', 'Cambió la hora de un evento', left('«' || t || '» ahora es el ' || to_char(p_inicia_at at time zone 'America/Lima', 'DD/MM HH24:MI') || ' (hora de Lima).', 300), 'eventos/'
    from public.evento_interesados i where i.evento_id = p_id;
  end if;
end $$;

create or replace function public.cancelar_evento(p_id bigint, p_motivo text default null) returns void
language plpgsql security definer set search_path = '' as $$
declare yo uuid := private.uid_requerido(); e public.eventos; m text := nullif(btrim(regexp_replace(coalesce(p_motivo, ''), '[<>]', '', 'g')), '');
begin
  if not private.es_moderador() then raise exception 'Solo el equipo de moderación puede cancelar eventos.'; end if;
  if m is not null and char_length(m) > 200 then raise exception 'El motivo admite máximo 200 caracteres.'; end if;
  select * into e from public.eventos where id = p_id for update;
  if not found or e.cancelado then raise exception 'Ese evento no existe o ya fue cancelado.'; end if;
  update public.eventos set cancelado = true, motivo_cancelacion = m, updated_at = now() where id = p_id;
  perform private.auditar_moderacion('ocultar', 'eventos', p_id::text, e.titulo, '{}'::jsonb, m);
  insert into public.notificaciones (usuario_id, tipo, titulo, mensaje, enlace)
  select i.usuario_id, 'EVENTO', 'Evento cancelado', left('«' || e.titulo || '» fue cancelado.' || coalesce(' Motivo: ' || m, ''), 300), 'eventos/'
  from public.evento_interesados i where i.evento_id = p_id;
end $$;

-- ─── 4) Marcar «Me interesa» (y si quieres el recordatorio) ───────────────────────────────────────────────────
-- p_interesa=false quita tu marca. Si el evento ya empezó, ya terminó la ventana o fue cancelado, no se puede marcar.
create or replace function public.marcar_interes_evento(p_id bigint, p_interesa boolean, p_recordar boolean default true) returns jsonb
language plpgsql security definer set search_path = '' as $$
declare yo uuid := private.uid_requerido(); e public.eventos;
begin
  if p_interesa is null then raise exception 'Indica si te interesa o no.'; end if;
  select * into e from public.eventos where id = p_id;
  if not found or e.cancelado then raise exception 'Ese evento ya no está disponible.'; end if;
  if p_interesa then
    if e.inicia_at <= now() then raise exception 'Este evento ya empezó.'; end if;
    insert into public.evento_interesados (evento_id, usuario_id, recordar) values (p_id, yo, coalesce(p_recordar, true))
    on conflict (evento_id, usuario_id) do update set recordar = excluded.recordar,
      aviso_enviado = case when excluded.recordar and not public.evento_interesados.recordar then false else public.evento_interesados.aviso_enviado end;
  else
    delete from public.evento_interesados where evento_id = p_id and usuario_id = yo;
  end if;
  return jsonb_build_object('interesados', (select count(*) from public.evento_interesados where evento_id = p_id),
                            'mi_interes', p_interesa, 'mi_recordar', p_interesa and coalesce(p_recordar, true));
end $$;

-- ─── 5) Leer ───────────────────────────────────────────────────────────────────────────────────────────────
-- Próximos: lo que no ha empezado hace más de 3 h y no está cancelado (más cercano primero). Pasados: lo ya terminado, lo más reciente primero (máx. 30 días).
create or replace function public.eventos_lista(p_pasados boolean default false, p_limite integer default 30) returns jsonb
language plpgsql stable security definer set search_path = '' as $$
declare yo uuid := (select auth.uid()); n integer := least(greatest(coalesce(p_limite, 30), 1), 50);
begin
  return coalesce((select jsonb_agg(f.dato order by f.orden) from (
    select case when coalesce(p_pasados, false) then -extract(epoch from e.inicia_at) else extract(epoch from e.inicia_at) end as orden,
           jsonb_build_object('id', e.id, 'titulo', e.titulo, 'descripcion', e.descripcion, 'juego', e.juego, 'inicia_at', e.inicia_at,
             'cancelado', e.cancelado, 'motivo', e.motivo_cancelacion,
             'interesados', (select count(*) from public.evento_interesados i where i.evento_id = e.id),
             'mi_interes', yo is not null and exists (select 1 from public.evento_interesados i where i.evento_id = e.id and i.usuario_id = yo),
             'mi_recordar', yo is not null and exists (select 1 from public.evento_interesados i where i.evento_id = e.id and i.usuario_id = yo and i.recordar)) as dato
    from public.eventos e
    where case when coalesce(p_pasados, false)
               then e.inicia_at <= now() - interval '3 hours' and e.inicia_at > now() - interval '30 days'
               else e.inicia_at > now() - interval '3 hours' and not e.cancelado end
    order by 1 limit n) f), '[]'::jsonb);
end $$;

-- ─── 6) El recordatorio (pg_cron, cada minuto) ─────────────────────────────────────────────────────────────────
-- Una sola pasada: marca primero (update … returning) y avisa después, así un fallo no duplica avisos. Tolerante: ante cualquier error deja un WARNING y no rompe el cron.
create or replace function private.recordar_eventos() returns integer
language plpgsql security definer set search_path = '' as $$
declare n integer := 0;
begin
  with m as (
    update public.evento_interesados i set aviso_enviado = true
    from public.eventos e
    where e.id = i.evento_id and i.recordar and not i.aviso_enviado and not e.cancelado
      and e.inicia_at > now() and e.inicia_at <= now() + interval '1 hour'
    returning i.usuario_id, e.titulo, e.inicia_at),
  ins as (
    insert into public.notificaciones (usuario_id, tipo, titulo, mensaje, enlace)
    select m.usuario_id, 'EVENTO', 'Tu evento empieza pronto', left('«' || m.titulo || '» empieza a las ' || to_char(m.inicia_at at time zone 'America/Lima', 'HH24:MI') || ' (hora de Lima).', 300), 'eventos/'
    from m returning 1)
  select count(*) into n from ins;
  return n;
exception when others then
  raise warning 'recordar_eventos falló: %', sqlerrm;
  return 0;
end $$;
revoke all on function private.recordar_eventos() from public, anon, authenticated;

select cron.unschedule(jobid) from cron.job where jobname = 'recordar-eventos';
select cron.schedule('recordar-eventos', '* * * * *', 'select private.recordar_eventos()');

-- ─── 7) Permisos ───────────────────────────────────────────────────────────────────────────────────────────────
revoke all on function public.crear_evento(text, timestamptz, text, text), public.editar_evento(bigint, text, timestamptz, text, text), public.cancelar_evento(bigint, text),
  public.marcar_interes_evento(bigint, boolean, boolean) from public, anon;
grant execute on function public.crear_evento(text, timestamptz, text, text), public.editar_evento(bigint, text, timestamptz, text, text), public.cancelar_evento(bigint, text),
  public.marcar_interes_evento(bigint, boolean, boolean) to authenticated;
revoke all on function public.eventos_lista(boolean, integer) from public;
grant execute on function public.eventos_lista(boolean, integer) to anon, authenticated;

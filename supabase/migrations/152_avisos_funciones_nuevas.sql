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

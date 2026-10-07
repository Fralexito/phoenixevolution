-- 074 · Detección automática de directos (Twitch ahora; YouTube después). La Edge Function «directos» corre cada 5 min (pg_cron + pg_net),
-- consulta las plataformas y marca/desmarca en vivo SOLO a quienes marcó ella (fuente_live = 'auto'): nunca apaga un «Estoy en vivo» manual.
alter table public.creadores add column if not exists fuente_live text check (fuente_live in ('manual', 'auto'));

-- El núcleo del aviso (seguidores + Discord) pasa a una función privada que usan el botón y el detector.
create or replace function private.marcar_en_vivo(p_uid uuid, p_en_vivo boolean, p_titulo text, p_enlace text, p_fuente text) returns jsonb
language plpgsql security definer set search_path = '' as $$
declare c public.creadores; n integer := 0; d text := 'NO'; url text; tit text := left(nullif(btrim(p_titulo), ''), 120);
begin
  select * into c from public.creadores where usuario = p_uid and verificado for update;
  if not found then return jsonb_build_object('error', 'NO_VERIFICADO'); end if;
  if p_enlace is not null and p_enlace !~ '^https://' then return jsonb_build_object('error', 'ENLACE'); end if;
  update public.creadores set en_vivo = p_en_vivo, en_vivo_desde = case when p_en_vivo then coalesce(case when c.en_vivo then c.en_vivo_desde end, now()) end,
    titulo_live = case when p_en_vivo then tit end, enlace_live = case when p_en_vivo then p_enlace end,
    fuente_live = case when p_en_vivo then p_fuente end where usuario = p_uid;
  if p_en_vivo and not c.en_vivo and (c.en_vivo_desde is null or c.en_vivo_desde < now() - interval '2 hours') then
    url := coalesce(p_enlace, (select value from jsonb_each_text(c.plataformas) limit 1));
    select count(*) into n from public.seguidores s where s.seguido_id = p_uid and not private.hay_bloqueo(p_uid, s.seguidor_id);
    perform private.notificar(s.seguidor_id, 'EVENTO', '🔴 ' || left(private.nombre(p_uid), 60) || ' está en vivo',
              private.nombre(p_uid) || ' empezó a transmitir' || coalesce(': ' || tit, '') || '. Míralo en Creadores.', null, null)
      from public.seguidores s where s.seguido_id = p_uid and not private.hay_bloqueo(p_uid, s.seguidor_id);
    begin
      d := private.discord_enviar('en_vivo', p_uid::text || ':' || to_char(now(), 'YYYYMMDDHH24'), jsonb_build_object('embeds', jsonb_build_array(jsonb_build_object(
        'title', '🔴 ' || private.discord_limpio(private.nombre(p_uid), 60) || ' está en vivo', 'url', url, 'color', 15548997,
        'description', coalesce(private.discord_limpio(tit, 120), 'Pasa a verlo.')))));
    exception when others then raise warning '[en_vivo] discord: %', sqlerrm; d := 'ERROR'; end;
  end if;
  return jsonb_build_object('en_vivo', p_en_vivo, 'avisados', n, 'discord', d);
end $$;
revoke all on function private.marcar_en_vivo(uuid, boolean, text, text, text) from public, anon, authenticated;

create or replace function public.creador_en_vivo(p_en_vivo boolean, p_titulo text default null, p_enlace text default null) returns jsonb
language plpgsql security definer set search_path = '' as $$
declare r jsonb := private.marcar_en_vivo(private.uid_requerido(), p_en_vivo, p_titulo, p_enlace, 'manual');
begin
  if r ->> 'error' = 'NO_VERIFICADO' then raise exception 'Solo creadores verificados por el staff.'; end if;
  if r ->> 'error' = 'ENLACE' then raise exception 'El enlace del directo debe empezar con https://'; end if;
  return r;
end $$;

-- Lo que consulta el detector: creadores verificados con canal de Twitch, y su estado actual.
create or replace function public.sistema_creadores_twitch() returns jsonb
language sql stable security definer set search_path = '' as $$
  select coalesce(jsonb_agg(jsonb_build_object('usuario', c.usuario, 'login', lower(substring(c.plataformas ->> 'twitch' from 'twitch\.tv/([A-Za-z0-9_]{3,25})')),
    'en_vivo', c.en_vivo, 'fuente', c.fuente_live)), '[]'::jsonb)
  from public.creadores c where c.verificado and c.plataformas ? 'twitch' and c.plataformas ->> 'twitch' ~ 'twitch\.tv/[A-Za-z0-9_]{3,25}'
$$;
-- Aplica el resultado: enciende a los detectados; apaga solo a los que el detector había encendido y ya no transmiten.
create or replace function public.sistema_aplicar_directos(p_vivos jsonb) returns jsonb
language plpgsql security definer set search_path = '' as $$
declare v jsonb; enc integer := 0; apa integer := 0; ids uuid[] := '{}';
begin
  for v in select * from jsonb_array_elements(coalesce(p_vivos, '[]'::jsonb)) loop
    ids := ids || (v ->> 'usuario')::uuid;
    if not exists (select 1 from public.creadores where usuario = (v ->> 'usuario')::uuid and en_vivo) then
      perform private.marcar_en_vivo((v ->> 'usuario')::uuid, true, v ->> 'titulo', v ->> 'enlace', 'auto'); enc := enc + 1;
    end if;
  end loop;
  update public.creadores set en_vivo = false, en_vivo_desde = en_vivo_desde, titulo_live = null, enlace_live = null, fuente_live = null
   where en_vivo and fuente_live = 'auto' and not (usuario = any (ids)) and plataformas ? 'twitch';
  get diagnostics apa = row_count;
  return jsonb_build_object('encendidos', enc, 'apagados', apa);
end $$;
revoke all on function public.sistema_creadores_twitch(), public.sistema_aplicar_directos(jsonb) from public, anon, authenticated;
grant execute on function public.sistema_creadores_twitch(), public.sistema_aplicar_directos(jsonb) to service_role;
-- El cron (con el secreto) se entrega aparte al usuario, no se guarda en el repo.

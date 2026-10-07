alter table public.discord_envios drop constraint if exists discord_envios_tipo_check;
alter table public.discord_envios add constraint discord_envios_tipo_check check (tipo in ('resumen', 'evento', 'prueba', 'uso', 'sala', 'en_vivo'));
drop function if exists public.creador_en_vivo(boolean, text, text);
create function public.creador_en_vivo(p_en_vivo boolean, p_titulo text default null, p_enlace text default null) returns jsonb
language plpgsql security definer set search_path = '' as $$
declare yo uuid := private.uid_requerido(); c public.creadores; n integer := 0; d text := 'NO'; url text; tit text := left(nullif(btrim(p_titulo), ''), 120);
begin
  select * into c from public.creadores where usuario = yo and verificado for update;
  if not found then raise exception 'Solo creadores verificados por el staff.'; end if;
  if p_enlace is not null and p_enlace !~ '^https://' then raise exception 'El enlace del directo debe empezar con https://'; end if;
  update public.creadores set en_vivo = p_en_vivo, en_vivo_desde = case when p_en_vivo then coalesce(case when c.en_vivo then c.en_vivo_desde end, now()) end,
    titulo_live = case when p_en_vivo then tit end, enlace_live = case when p_en_vivo then p_enlace end where usuario = yo;
  if p_en_vivo and not c.en_vivo and (c.en_vivo_desde is null or c.en_vivo_desde < now() - interval '2 hours') then
    url := coalesce(p_enlace, (select value from jsonb_each_text(c.plataformas) limit 1));
    select count(*) into n from public.seguidores s where s.seguido_id = yo and not private.hay_bloqueo(yo, s.seguidor_id);
    perform private.notificar(s.seguidor_id, 'EVENTO', '🔴 ' || left(private.nombre(yo), 60) || ' está en vivo',
              private.nombre(yo) || ' empezó a transmitir' || coalesce(': ' || tit, '') || '. Míralo en Creadores.', null, null)
      from public.seguidores s where s.seguido_id = yo and not private.hay_bloqueo(yo, s.seguidor_id);
    begin
      d := private.discord_enviar('en_vivo', yo::text || ':' || to_char(now(), 'YYYYMMDDHH24'), jsonb_build_object('embeds', jsonb_build_array(jsonb_build_object(
        'title', '🔴 ' || private.discord_limpio(private.nombre(yo), 60) || ' está en vivo', 'url', url, 'color', 15548997,
        'description', coalesce(private.discord_limpio(tit, 120), 'Pasa a verlo.')))));
    exception when others then raise warning '[en_vivo] discord: %', sqlerrm; d := 'ERROR'; end;
  end if;
  return jsonb_build_object('en_vivo', p_en_vivo, 'avisados', n, 'discord', d);
end $$;
revoke all on function public.creador_en_vivo(boolean, text, text) from public, anon;
grant execute on function public.creador_en_vivo(boolean, text, text) to authenticated;

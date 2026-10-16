-- 107 · «Solo staff» de «Crear mi liga» también en el SERVIDOR (ronda 295).
-- Antes el límite estaba solo en la pantalla. Ahora torneo_crear rechaza (SOLO_STAFF) si la config trae origen = 'crear-liga' y quien llama
-- no es moderador/admin. Lo demás no cambia: /torneos/ sigue dejando crear torneos a cualquiera, con las mismas reglas de siempre.
-- Es la misma función de la 097 con UNA línea nueva (la de SOLO_STAFF). Los permisos de ejecución se conservan con create or replace.

create or replace function public.torneo_crear(p_nombre text, p_formato text, p_config jsonb default '{}'::jsonb, p_descripcion text default null,
  p_visibilidad text default 'publico', p_cupo int default null, p_inicia timestamptz default null, p_juega boolean default true) returns bigint
language plpgsql security definer set search_path = '' as $$
declare v_uid uuid := auth.uid(); v_cfg public.torneos_libres_config; v_id bigint; v_nom text;
begin
  if v_uid is null then raise exception 'NO_AUTORIZADO'; end if;
  if private.esta_sancionado(v_uid) then raise exception 'CUENTA_SANCIONADA'; end if;
  if coalesce(p_config ->> 'origen', '') = 'crear-liga' and not private.es_moderador() then raise exception 'SOLO_STAFF: por ahora solo el staff crea ligas desde «Crear mi liga»'; end if;
  select * into v_cfg from public.torneos_libres_config where id = 1;
  if not v_cfg.habilitado and not private.es_moderador() then raise exception 'TORNEOS_PAUSADOS: el staff pausó la creación de torneos'; end if;
  if (select count(*) from public.torneos_libres where creador = v_uid and estado in ('inscripcion', 'en_curso') and not oculto) >= v_cfg.max_activos_por_usuario and not private.es_moderador() then
    raise exception 'DEMASIADOS_TORNEOS: ya tienes % torneos activos', v_cfg.max_activos_por_usuario;
  end if;
  if p_cupo is not null and p_cupo > v_cfg.max_jugadores then raise exception 'CUPO_INVALIDO: máximo %', v_cfg.max_jugadores; end if;
  if jsonb_typeof(coalesce(p_config, '{}'::jsonb)) <> 'object' or octet_length(coalesce(p_config, '{}'::jsonb)::text) > 20000 then raise exception 'CONFIG_INVALIDA'; end if;
  insert into public.torneos_libres (creador, nombre, descripcion, formato, config, visibilidad, cupo, inicia)
  values (v_uid, btrim(p_nombre), nullif(btrim(coalesce(p_descripcion, '')), ''), p_formato, coalesce(p_config, '{}'::jsonb), coalesce(p_visibilidad, 'publico'), p_cupo, p_inicia)
  returning id into v_id;
  if p_juega then
    select coalesce(nombre_display, username, 'Jugador') into v_nom from public.perfiles where id = v_uid;
    insert into public.torneos_libres_inscritos (torneo_id, usuario, nombre) values (v_id, v_uid, left(v_nom, 40));
  end if;
  perform private.tl_evento(v_id, 'crear', jsonb_build_object('formato', p_formato));
  return v_id;
end $$;

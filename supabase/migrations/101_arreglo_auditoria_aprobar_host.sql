-- 101 · Arreglo: aprobar/quitar host fallaba con «violates check constraint auditoria_staff_accion_check».
-- Causa: staff_aprobar_host auditaba con las acciones 'aprobar_host' y 'quitar_host', que la tabla auditoria_staff no permite
-- (solo: crear, editar, borrar, ocultar, rol, sancion, sistema). Ahora audita como 'rol' (cambio de permisos) y el texto dice si fue aprobado o retirado.
-- Aplicada en BD por MCP el 10-10-2026.
create or replace function public.staff_aprobar_host(p_usuario uuid, p_aprobado boolean, p_motivo text default null)
returns void language plpgsql security definer set search_path = '' as $$
begin
  perform private.uid_requerido();
  if not private.es_staff() then raise exception 'Solo staff.' using errcode = '42501'; end if;
  update public.perfiles set host_aprobado = p_aprobado where id = p_usuario;
  if not found then raise exception 'Usuario no encontrado.' using errcode = 'P0002'; end if;
  if not p_aprobado then
    update public.salas set estado = 'cerrada', cerrada_en = now() where host = p_usuario and estado in ('preparando', 'abierta', 'en_partida');
  end if;
  perform private.auditar_moderacion('rol', 'perfiles', p_usuario::text,
                                     (case when p_aprobado then 'Host aprobado · ' else 'Host retirado · ' end) || coalesce(private.nombre(p_usuario), ''),
                                     jsonb_build_object('host_aprobado', p_aprobado), p_motivo);
  perform private.notificar(p_usuario, 'MODERACION',
    case when p_aprobado then 'Ya puedes abrir salas' else 'Permiso de host retirado' end,
    case when p_aprobado then 'El staff aprobó tu cuenta como host. Vincula tu PC desde tu perfil.' else coalesce(p_motivo, 'El staff retiró tu permiso para abrir salas.') end);
end $$;

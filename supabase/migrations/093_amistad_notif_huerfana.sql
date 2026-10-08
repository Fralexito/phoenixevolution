-- 093 · Si una solicitud de amistad desaparece (cancelada, bloqueo o amistad eliminada) mientras estaba PENDIENTE,
-- se borra su aviso «X quiere ser tu amigo» sin leer: antes quedaba en la campana apuntando a una solicitud que ya no existía.
create or replace function private.amistad_limpiar_aviso() returns trigger
language plpgsql security definer set search_path = '' as $$
declare v_destino uuid;
begin
  if old.estado <> 'PENDIENTE' then return old; end if;
  v_destino := case when old.solicitante = old.usuario_a then old.usuario_b else old.usuario_a end;
  delete from public.notificaciones
   where usuario_id = v_destino and tipo = 'AMISTAD_SOLICITUD' and not leida
     and mensaje = private.nombre(old.solicitante) || ' quiere ser tu amigo.';
  return old;
end $$;
drop trigger if exists amistades_limpiar_aviso on public.amistades;
create trigger amistades_limpiar_aviso after delete on public.amistades for each row execute function private.amistad_limpiar_aviso();

-- Limpieza de los avisos huérfanos que ya existen.
delete from public.notificaciones n
 where n.tipo = 'AMISTAD_SOLICITUD' and not n.leida
   and not exists (select 1 from public.amistades a
                    where a.estado = 'PENDIENTE' and n.usuario_id in (a.usuario_a, a.usuario_b) and a.solicitante <> n.usuario_id
                      and n.mensaje = private.nombre(a.solicitante) || ' quiere ser tu amigo.');

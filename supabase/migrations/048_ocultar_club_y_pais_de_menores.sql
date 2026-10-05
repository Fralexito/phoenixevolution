-- 048 · CIERRE DE EXPOSICIÓN: país y club favorito de MENORES. Depende de 037 (edades, categoria_edad).
-- Problema: `perfiles` es legible por cualquiera (anon incluido) y `perfil_publico`/búsquedas devuelven club_favorito y pais_codigo, también de menores de edad.
-- Solución en el ORIGEN (sin tocar lecturas ni el cliente): a quien la edad declarada marca como «menor» (13–17) o «bloqueado» (<13) NO se le guardan esos dos datos:
--   (1) trigger en perfiles: cualquier alta o cambio los deja en NULL; (2) trigger en edades: al declarar o corregir la edad, se borran si resulta menor;
--   (3) limpieza única de los menores que ya existen. Quien aún no declaró su edad conserva sus datos (no se puede saber); al declararla como menor se borran.
-- Efecto colateral deliberado: un menor que se vuelve adulto (corrección de staff) debe volver a escribir su país y club.

create or replace function private.ocultar_datos_de_menor() returns trigger
language plpgsql security definer set search_path = '' as $$
begin
  if private.categoria_edad(new.id) in ('menor', 'bloqueado') then new.club_favorito := null; new.pais_codigo := null; end if;
  return new;
end $$;
revoke all on function private.ocultar_datos_de_menor() from public, anon, authenticated;
drop trigger if exists zy_sin_datos_de_menor on public.perfiles;
create trigger zy_sin_datos_de_menor before insert or update of club_favorito, pais_codigo on public.perfiles for each row execute function private.ocultar_datos_de_menor();

create or replace function private.limpiar_perfil_de_menor() returns trigger
language plpgsql security definer set search_path = '' as $$
begin
  if private.categoria_edad(new.usuario_id) in ('menor', 'bloqueado') then
    update public.perfiles set club_favorito = null, pais_codigo = null where id = new.usuario_id and (club_favorito is not null or pais_codigo is not null);
  end if;
  return new;
exception when others then
  raise warning '[menores] limpiar_perfil_de_menor %: %', new.usuario_id, sqlerrm; return new;
end $$;
revoke all on function private.limpiar_perfil_de_menor() from public, anon, authenticated;
drop trigger if exists zz_limpiar_perfil_de_menor on public.edades;
create trigger zz_limpiar_perfil_de_menor after insert or update on public.edades for each row execute function private.limpiar_perfil_de_menor();

update public.perfiles set club_favorito = null, pais_codigo = null
 where (club_favorito is not null or pais_codigo is not null) and private.categoria_edad(id) in ('menor', 'bloqueado');

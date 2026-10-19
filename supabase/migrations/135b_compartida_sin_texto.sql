-- 135b · Compartir SIN comentario (19-oct-2026; arreglo de la 135 hallado al probarla en la base, antes de usarla en la web).
-- La regla muro_publicaciones_contenido_ok pedía texto o foto/video/duelo: una publicación compartida sin comentario no pasaba.
-- Además, si se borra la ORIGINAL, compartida_de pasa a null (on delete set null) y la compartida vacía quedaría inválida → el borrado fallaría.
-- Solución: marca fija es_compartida (no cambia aunque la original desaparezca) y la regla acepta «contenido O es compartida».
-- ADITIVA: nada existente cambia de valor (todas las filas actuales tienen es_compartida = false y ya cumplían la regla).
-- Deshacer: borrar antes las compartidas sin texto; restaurar la regla anterior (sin «or es_compartida»); drop column es_compartida;
--           y volver a crear muro_compartir de la 135 (sin es_compartida).

alter table public.muro_publicaciones add column if not exists es_compartida boolean not null default false;

alter table public.muro_publicaciones drop constraint if exists muro_publicaciones_contenido_ok;
alter table public.muro_publicaciones add constraint muro_publicaciones_contenido_ok check (
  char_length(texto) <= 1000
  and (char_length(texto) >= 1 or imagen_url is not null or video_url is not null or reto_id is not null or es_compartida)
  and (imagen_url is null or (imagen_url ~ '^https://' and char_length(imagen_url) <= 300))
  and (video_url is null or (video_url ~ '^https://' and char_length(video_url) <= 300))
);

create or replace function public.muro_compartir(p_publicacion bigint, p_texto text default null) returns bigint
language plpgsql security definer set search_path = '' as $$
declare yo uuid := private.uid_requerido(); t text := trim(coalesce(p_texto, '')); raiz bigint; dueno uuid; juego text; nuevo bigint; usu text;
begin
  select coalesce(m.compartida_de, m.id) into raiz from public.muro_publicaciones m where m.id = p_publicacion and not m.oculto;
  if raiz is null then raise exception 'Esa publicación ya no existe.'; end if;
  select m.autor_id, m.juego into dueno, juego from public.muro_publicaciones m where m.id = raiz and not m.oculto;
  if dueno is null then raise exception 'La publicación original ya no está disponible.'; end if;
  if not private.puede_ver_muro(dueno, yo) then raise exception 'No puedes compartir esta publicación.'; end if;
  if char_length(t) > 1000 then raise exception 'Máximo 1000 caracteres.'; end if;
  if (select count(*) from public.muro_publicaciones where autor_id = yo and created_at > now() - interval '1 hour') >= 10 then
    raise exception 'Estás publicando muy rápido: máximo 10 por hora.';
  end if;
  insert into public.muro_publicaciones (autor_id, texto, juego, compartida_de, es_compartida) values (yo, t, juego, raiz, true) returning id into nuevo;
  if dueno <> yo then
    select username into usu from public.perfiles where id = yo;
    insert into public.notificaciones (usuario_id, tipo, titulo, mensaje, enlace)
    values (dueno, 'MURO_COMPARTIDA', 'Compartieron tu publicación', left(private.nombre(yo) || ' la compartió en su muro' || case when t <> '' then ': ' || t else '.' end, 300),
            case when usu ~ '^[A-Za-z0-9_]{1,30}$' then 'perfil/?u=' || usu || '#p-' || nuevo else null end);
  end if;
  return nuevo;
end $$;

-- muro_social_de: una compartida cuya original se borró (compartida_de = null pero es_compartida) → original { no_disponible }.
create or replace function public.muro_social_de(p_publicaciones bigint[]) returns jsonb
language sql stable security definer set search_path = '' as $$
  with yo as (select (select auth.uid()) as id),
  pubs as (
    select m.* from public.muro_publicaciones m, yo
    where m.id = any ((coalesce(p_publicaciones, '{}'::bigint[]))[1:200]) and not m.oculto and private.puede_ver_muro(m.autor_id, yo.id)
  )
  select coalesce(jsonb_object_agg(p.id::text, jsonb_build_object(
    'vistas', (select count(*) from public.muro_vistas v where v.publicacion_id = p.id),
    'compartidas', (select count(*) from public.muro_publicaciones c where c.compartida_de = p.id and not c.oculto),
    'original', case
      when not p.es_compartida and p.compartida_de is null then null
      when o.id is null or o.oculto or not private.puede_ver_muro(o.autor_id, (select id from yo)) then jsonb_build_object('no_disponible', true)
      else jsonb_build_object('id', o.id, 'texto', o.texto, 'imagen_url', o.imagen_url, 'video_url', o.video_url, 'juego', o.juego, 'created_at', o.created_at, 'extra', o.extra,
        'autor', jsonb_build_object('id', pf.id, 'username', pf.username, 'nombre_display', pf.nombre_display, 'avatar_url', pf.avatar_url))
    end)), '{}'::jsonb)
  from pubs p
  left join public.muro_publicaciones o on o.id = p.compartida_de
  left join public.perfiles pf on pf.id = o.autor_id
$$;

revoke all on function public.muro_compartir(bigint, text), public.muro_social_de(bigint[]) from public, anon;
grant execute on function public.muro_social_de(bigint[]) to anon, authenticated;
grant execute on function public.muro_compartir(bigint, text) to authenticated;

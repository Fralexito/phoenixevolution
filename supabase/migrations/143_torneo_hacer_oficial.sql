-- 143 · Un solo creador de ligas y torneos (paso 1): el staff convierte una liga casual en OFICIAL.
-- Pedido de Fralex (21-oct-2026): «que sea un solo creador de ligas y torneos pero que yo pueda escoger cuáles son oficiales
-- y cuales son así casuales de cualquier personaje».
--   · Casual  = cualquier liga o torneo creado en /torneos/ (097). Resultados a mano, como siempre.
--   · Oficial = el staff pulsa «Hacer oficial» en una liga todos contra todos (formato 'liguilla' o 'idavuelta') que siga en
--     inscripción. Se copia a la liga oficial (102 + 142: liga_ediciones / liga_participantes) con sus inscritos; desde ahí
--     sigue la inscripción, el calendario (staff_liga_iniciar) y Phoenix Link manda los resultados solo.
--   · Los torneos por llaves (eliminación, grupos…) NO se pueden hacer oficiales todavía: Link solo conoce la liga oficial
--     (partidos con fecha) y no las llaves. Se deja para después de la congelación de 2 semanas.
-- Requiere la 142 aplicada. SOLO AÑADE una función; el torneo casual queda con la inscripción cerrada y en meta.oficial el id
-- de la edición, para que su página enlace a la Liga de amigos.

create or replace function public.staff_torneo_hacer_oficial(p_torneo bigint)
returns text language plpgsql security definer set search_path = '' as $$
declare
  t public.torneos_libres%rowtype;
  eid text;
  slug text;
  r record;
  nom text;
  n int;
begin
  perform private.uid_requerido();
  if not private.es_staff() then raise exception 'Solo el staff hace oficial una liga.' using errcode = '42501'; end if;
  select * into t from public.torneos_libres where id = p_torneo for update;
  if not found or t.oculto then raise exception 'Torneo no encontrado.' using errcode = 'P0002'; end if;
  if t.meta ? 'oficial' then return t.meta ->> 'oficial'; end if;
  if t.formato not in ('liguilla', 'idavuelta') then
    raise exception 'Por ahora solo las ligas todos contra todos pueden ser oficiales (Phoenix Link aún no conoce las llaves).' using errcode = '22023';
  end if;
  if t.estado <> 'inscripcion' then raise exception 'Solo se puede hacer oficial antes de empezar.' using errcode = '22023'; end if;

  slug := 't' || t.id || '-' || left(trim(both '-' from regexp_replace(lower(t.nombre), '[^a-z0-9]+', '-', 'g')), 30);
  eid := 'amigos:' || slug;
  insert into public.liga_ediciones (id, liga, edicion, nombre, estado, creador, ida_vuelta)
  values (eid, 'amigos', slug, left(btrim(t.nombre), 60), 'inscripcion', t.creador, t.formato = 'idavuelta');

  -- Los inscritos pasan tal cual (con su cuenta si la tienen); un nombre repetido recibe « 2», « 3»…
  for r in select usuario, nombre from public.torneos_libres_inscritos where torneo_id = p_torneo and not retirado order by id loop
    nom := left(btrim(r.nombre), 36); n := 1;
    if nom = '' then nom := 'Jugador'; end if;
    while exists (select 1 from public.liga_participantes where edicion_id = eid and nombre = nom) loop
      n := n + 1; nom := left(btrim(r.nombre), 36) || ' ' || n;
    end loop;
    insert into public.liga_participantes (edicion_id, nombre, usuario) values (eid, nom, r.usuario);
  end loop;

  update public.torneos_libres
     set meta = meta || jsonb_build_object('oficial', eid), inscripcion_abierta = false
   where id = p_torneo;
  perform private.tl_evento(p_torneo, 'oficial', jsonb_build_object('edicion', eid));
  perform private.auditar_moderacion('editar', 'torneos_libres', p_torneo::text, 'Hecho oficial · ' || t.nombre, jsonb_build_object('edicion', eid), null);
  return eid;
end $$;
revoke all on function public.staff_torneo_hacer_oficial(bigint) from public, anon;
grant execute on function public.staff_torneo_hacer_oficial(bigint) to authenticated;

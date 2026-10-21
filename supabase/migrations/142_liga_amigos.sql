-- 142 · Liga de amigos: crear una liga oficial desde la web, que la gente se inscriba con su cuenta y generar el calendario.
-- Hasta hoy la liga oficial (102: liga_ediciones / liga_participantes / liga_partidos), que es la ÚNICA que recibe los
-- resultados de Phoenix Link, solo se podía armar con SQL (la Galaxy entró así, 102b). Para la primera noche de liga real
-- con amigos (21-oct-2026) hace falta hacerlo desde la web: página /liga-amigos/.
-- SOLO AÑADE: un estado nuevo 'inscripcion' (la función «liga» solo mira 'en_curso', así que Link no ve ligas en inscripción),
-- dos columnas y cinco funciones. No toca la Galaxy ni la lógica de resultados (siguen igual: Link propone, el staff
-- o el árbitro designado valida, los DT reclaman).
--   · staff_liga_crear(nombre, ida_vuelta)      → nueva edición 'amigos:<slug>' en inscripción (solo staff).
--   · liga_inscribirse(edicion, club)           → el usuario se apunta con su nombre de la web (máx. 12).
--   · liga_salir(edicion)                       → se borra mientras siga la inscripción.
--   · staff_liga_iniciar(edicion)               → calendario todos contra todos (método del círculo) y pasa a 'en_curso'.
--   · staff_liga_finalizar(edicion)             → 'finalizada' (Link deja de ofrecer sus partidos).
-- Numerada 142 para no chocar con la 140/141 de otros hilos (economía).

alter table public.liga_ediciones drop constraint if exists liga_ediciones_estado_check;
alter table public.liga_ediciones add constraint liga_ediciones_estado_check
  check (estado in ('inscripcion', 'en_curso', 'finalizada'));
alter table public.liga_ediciones add column if not exists creador uuid references public.perfiles(id) on delete set null;
alter table public.liga_ediciones add column if not exists ida_vuelta boolean not null default false;

-- CREAR (solo staff). Devuelve el id de la edición.
create or replace function public.staff_liga_crear(p_nombre text, p_ida_vuelta boolean default false)
returns text language plpgsql security definer set search_path = '' as $$
declare
  uid uuid;
  nom text := btrim(coalesce(p_nombre, ''));
  slug text;
  eid text;
begin
  perform private.uid_requerido();
  uid := auth.uid();
  if not private.es_staff() then raise exception 'Solo el staff crea ligas oficiales.' using errcode = '42501'; end if;
  if length(nom) < 3 or length(nom) > 60 then raise exception 'El nombre debe tener entre 3 y 60 caracteres.' using errcode = '22023'; end if;
  slug := left(trim(both '-' from regexp_replace(lower(nom), '[^a-z0-9]+', '-', 'g')), 30);
  if slug = '' then slug := 'liga'; end if;
  slug := slug || '-' || to_char(now() at time zone 'America/Lima', 'YYMMDD-HH24MISS');
  eid := 'amigos:' || slug;
  insert into public.liga_ediciones (id, liga, edicion, nombre, estado, creador, ida_vuelta)
  values (eid, 'amigos', slug, nom, 'inscripcion', uid, coalesce(p_ida_vuelta, false));
  perform private.auditar_moderacion('editar', 'liga_ediciones', eid, 'Liga creada · ' || nom, jsonb_build_object('ida_vuelta', p_ida_vuelta), null);
  return eid;
end $$;
revoke all on function public.staff_liga_crear(text, boolean) from public, anon;
grant execute on function public.staff_liga_crear(text, boolean) to authenticated;

-- INSCRIBIRSE: con la cuenta de la web; el nombre del DT es el nombre visible del perfil (si se repite, se le añade un número).
create or replace function public.liga_inscribirse(p_edicion text, p_club text default null)
returns text language plpgsql security definer set search_path = '' as $$
declare
  uid uuid;
  ed public.liga_ediciones%rowtype;
  base text;
  nom text;
  n int := 1;
begin
  perform private.uid_requerido();
  uid := auth.uid();
  if private.esta_sancionado(uid) then raise exception 'Tu cuenta está sancionada.' using errcode = '42501'; end if;
  select * into ed from public.liga_ediciones where id = p_edicion for update;
  if not found then raise exception 'Liga no encontrada.' using errcode = 'P0002'; end if;
  if ed.estado <> 'inscripcion' then raise exception 'La inscripción de esta liga ya está cerrada.' using errcode = '22023'; end if;
  select nombre into nom from public.liga_participantes where edicion_id = p_edicion and usuario = uid;
  if found then return nom; end if;
  if (select count(*) from public.liga_participantes where edicion_id = p_edicion) >= 12 then
    raise exception 'La liga ya está llena (12 jugadores).' using errcode = '22023';
  end if;
  base := left(btrim(private.nombre(uid)), 36);
  if base = '' then base := 'Jugador'; end if;
  nom := base;
  while exists (select 1 from public.liga_participantes where edicion_id = p_edicion and nombre = nom) loop
    n := n + 1; nom := base || ' ' || n;
  end loop;
  insert into public.liga_participantes (edicion_id, nombre, club, usuario)
  values (p_edicion, nom, nullif(left(btrim(coalesce(p_club, '')), 40), ''), uid);
  return nom;
end $$;
revoke all on function public.liga_inscribirse(text, text) from public, anon;
grant execute on function public.liga_inscribirse(text, text) to authenticated;

-- SALIR (solo mientras siga la inscripción).
create or replace function public.liga_salir(p_edicion text)
returns void language plpgsql security definer set search_path = '' as $$
declare uid uuid;
begin
  perform private.uid_requerido();
  uid := auth.uid();
  if not exists (select 1 from public.liga_ediciones where id = p_edicion and estado = 'inscripcion') then
    raise exception 'Solo puedes salir mientras la inscripción está abierta.' using errcode = '22023';
  end if;
  delete from public.liga_participantes where edicion_id = p_edicion and usuario = uid;
end $$;
revoke all on function public.liga_salir(text) from public, anon;
grant execute on function public.liga_salir(text) to authenticated;

-- INICIAR: calendario todos contra todos y 'en_curso'. Método del círculo: el puesto 0 queda fijo y el resto gira una
-- posición por fecha; en cada fecha se cruzan el puesto i con el n-1-i. Con número impar se añade un hueco (null = descansa).
-- El orden de los jugadores se baraja. Con ida_vuelta, la segunda vuelta repite las fechas con local y visitante cambiados.
create or replace function public.staff_liga_iniciar(p_edicion text)
returns int language plpgsql security definer set search_path = '' as $$
declare
  ed public.liga_ediciones%rowtype;
  js text[];
  n int;
  rondas int;
  r int; i int;
  a text; b text; t text;
  total int := 0;
begin
  perform private.uid_requerido();
  if not private.es_staff() then raise exception 'Solo el staff inicia una liga.' using errcode = '42501'; end if;
  select * into ed from public.liga_ediciones where id = p_edicion for update;
  if not found then raise exception 'Liga no encontrada.' using errcode = 'P0002'; end if;
  if ed.estado <> 'inscripcion' then raise exception 'Esta liga ya empezó.' using errcode = '22023'; end if;
  select array_agg(nombre order by random()) into js from public.liga_participantes where edicion_id = p_edicion;
  n := coalesce(array_length(js, 1), 0);
  if n < 3 then raise exception 'Hacen falta al menos 3 inscritos (hay %).', n using errcode = '22023'; end if;
  if n % 2 = 1 then js := js || array[null::text]; n := n + 1; end if;
  rondas := n - 1;
  for r in 0 .. rondas - 1 loop
    for i in 0 .. n / 2 - 1 loop
      -- jugador en el puesto k durante la fecha r: k = 0 → js[1]; si no, js[((k - 1 + r) % (n - 1)) + 2]
      a := case when i = 0 then js[1] else js[((i - 1 + r) % (n - 1)) + 2] end;
      b := js[((n - 1 - i - 1 + r) % (n - 1)) + 2];
      if a is null or b is null then continue; end if;
      if i = 0 and r % 2 = 1 then t := a; a := b; b := t; end if;   -- el fijo alterna local y visita
      insert into public.liga_partidos (edicion_id, fecha, local, visitante) values (p_edicion, r + 1, a, b);
      total := total + 1;
      if ed.ida_vuelta then
        insert into public.liga_partidos (edicion_id, fecha, local, visitante) values (p_edicion, r + 1 + rondas, b, a);
        total := total + 1;
      end if;
    end loop;
  end loop;
  update public.liga_ediciones set estado = 'en_curso' where id = p_edicion;
  perform private.auditar_moderacion('editar', 'liga_ediciones', p_edicion, 'Liga iniciada · ' || ed.nombre || ' (' || total || ' partidos)', '{}'::jsonb, null);
  return total;
end $$;
revoke all on function public.staff_liga_iniciar(text) from public, anon;
grant execute on function public.staff_liga_iniciar(text) to authenticated;

-- FINALIZAR (Link deja de ofrecer sus partidos; la tabla queda como está). Solo ligas de amigos: la Galaxy no se toca.
create or replace function public.staff_liga_finalizar(p_edicion text)
returns void language plpgsql security definer set search_path = '' as $$
begin
  perform private.uid_requerido();
  if not private.es_staff() then raise exception 'Solo el staff cierra una liga.' using errcode = '42501'; end if;
  update public.liga_ediciones set estado = 'finalizada' where id = p_edicion and liga = 'amigos';
  if not found then raise exception 'Liga no encontrada.' using errcode = 'P0002'; end if;
end $$;
revoke all on function public.staff_liga_finalizar(text) from public, anon;
grant execute on function public.staff_liga_finalizar(text) to authenticated;

-- 038 · MENORES (2/2) · RESTRICCIONES POR EDAD. Depende de 017 (amigos), 018 (chat), 021 (muro), 034 (búsqueda/sugerencias) y 037 (edad).
-- Reglas (todas en el SERVIDOR; la web solo muestra lo que el servidor permite):
--   1. SEPARACIÓN: un menor (13-17) y quien NO es menor (adulto o sin declarar) que no sean AMIGOS no pueden: abrir chats ni crear grupos entre sí, escribirse
--      en chats ya existentes, ni encontrarse en la búsqueda de personas y las sugerencias «a quién seguir».
--   2. SOLICITUDES: un adulto no puede enviar solicitud de amistad a un menor (el menor SÍ puede enviarla a un adulto: decide él). Sin amistad no hay chat.
--   3. MURO: el muro de un menor solo lo ven sus amigos, él mismo y el staff (incluye publicaciones, clips e historias: todo pasa por puede_ver_muro).
--   4. EXENCIONES: el staff (moderador/admin) queda fuera de la separación para poder moderar y acompañar. Seguir a alguien sigue permitido (no revela nada: el muro es de amigos).
-- Mensajes de error genéricos: no revelan la edad ni la categoría de nadie.
-- NO cambia: duelos y partidos (son el núcleo de la liga), ni los chats donde ya son amigos.

-- ─── Ayudantes (solo servidor) ─────────────────────────────────────────────────────────────────────────────────
create or replace function private.es_staff_id(p_uid uuid) returns boolean
language sql stable security definer set search_path = '' as $$
  select exists (select 1 from public.perfiles p where p.id = p_uid and p.rol in ('moderador', 'admin'))
$$;
revoke all on function private.es_staff_id(uuid) from public, anon, authenticated;

-- ¿Hay que mantenerlos separados? (simétrica). Verdadero si uno es menor, el otro no, no son amigos y ninguno es staff.
create or replace function private.separados_por_edad(p_a uuid, p_b uuid) returns boolean
language plpgsql stable security definer set search_path = '' as $$
declare ca text; cb text;
begin
  if p_a is null or p_b is null or p_a = p_b then return false; end if;
  ca := private.categoria_edad(p_a); cb := private.categoria_edad(p_b);
  if (ca = 'menor') = (cb = 'menor') then return false; end if;                     -- los dos menores, o ninguno: no hay separación
  if private.es_staff_id(p_a) or private.es_staff_id(p_b) then return false; end if;
  return not private.son_amigos(p_a, p_b);
end $$;
revoke all on function private.separados_por_edad(uuid, uuid) from public, anon, authenticated;

-- ¿Oculto a `p_x` de las búsquedas de `p_yo`? Solo los menores se ocultan, y no a otros menores, a sus amigos ni al staff.
create or replace function private.oculto_por_edad(p_yo uuid, p_x uuid) returns boolean
language sql stable security definer set search_path = '' as $$
  select private.categoria_edad(p_x) = 'menor' and private.separados_por_edad(p_yo, p_x)
$$;
revoke all on function private.oculto_por_edad(uuid, uuid) from public, anon, authenticated;

-- ─── 1) Abrir chats y grupos: se amplía la regla central (la usan abrir_directo, crear_grupo y agregar_a_grupo) ──
create or replace function private.puede_escribir_a(p_yo uuid, p_otro uuid) returns boolean
language plpgsql stable security definer set search_path = '' as $$
declare modo text;
begin
  if p_yo is null or p_otro is null or p_yo = p_otro or private.hay_bloqueo(p_yo, p_otro) then return false; end if;
  if private.separados_por_edad(p_yo, p_otro) then return false; end if;
  modo := coalesce((select quien_escribe from public.privacidad_social where usuario_id = p_otro), 'amigos');
  return case modo
    when 'todos' then true
    when 'amigos' then private.son_amigos(p_yo, p_otro)
    when 'amigos_y_seguidores' then private.son_amigos(p_yo, p_otro) or exists (select 1 from public.seguidores where seguidor_id = p_yo and seguido_id = p_otro)
    else false end;
end $$;
revoke all on function private.puede_escribir_a(uuid, uuid) from public, anon, authenticated;

-- ─── 2) Chats YA existentes: se corta el envío entre un menor y un adulto que no son amigos ────────────────────
create or replace function private.trg_edad_mensaje() returns trigger
language plpgsql security definer set search_path = '' as $$
declare c public.conversaciones; otro uuid;
begin
  if new.autor_id is null or (select auth.uid()) is null then return new; end if;       -- sin usuario (SQL Editor / sistema): no aplica
  select * into c from public.conversaciones where id = new.conversacion_id;
  if found and c.tipo = 'DIRECTO' then
    otro := case when c.par_a = new.autor_id then c.par_b else c.par_a end;
    if private.separados_por_edad(new.autor_id, otro) then raise exception 'No se pudo enviar el mensaje.' using errcode = 'P0001'; end if;
  end if;
  return new;
end $$;
revoke all on function private.trg_edad_mensaje() from public, anon, authenticated;
drop trigger if exists zy_edad on public.mensajes_privados;
create trigger zy_edad before insert on public.mensajes_privados for each row execute function private.trg_edad_mensaje();

-- ─── 3) Solicitudes de amistad: un adulto no puede pedírsela a un menor ────────────────────────────────────────
create or replace function private.trg_edad_amistad() returns trigger
language plpgsql security definer set search_path = '' as $$
declare destino uuid;
begin
  if new.estado <> 'PENDIENTE' or (select auth.uid()) is null then return new; end if;
  destino := case when new.solicitante = new.usuario_a then new.usuario_b else new.usuario_a end;
  if private.categoria_edad(destino) = 'menor' and private.categoria_edad(new.solicitante) <> 'menor' and not private.es_staff_id(new.solicitante) then
    raise exception 'No se pudo enviar la solicitud.' using errcode = 'P0001';
  end if;
  return new;
end $$;
revoke all on function private.trg_edad_amistad() from public, anon, authenticated;
drop trigger if exists zy_edad on public.amistades;
create trigger zy_edad before insert on public.amistades for each row execute function private.trg_edad_amistad();

-- ─── 4) Muro: el de un menor, solo amigos / él / staff ──────────────────────────────────────────────────────────
create or replace function private.puede_ver_muro(p_dueno uuid, p_yo uuid) returns boolean
language plpgsql stable security definer set search_path = '' as $$
declare modo text;
begin
  if p_yo is not null and p_yo = p_dueno then return true; end if;
  if p_yo is not null and private.hay_bloqueo(p_yo, p_dueno) then return false; end if;
  if private.categoria_edad(p_dueno) = 'menor' then
    return p_yo is not null and (private.son_amigos(p_yo, p_dueno) or private.es_staff_id(p_yo));
  end if;
  modo := coalesce((select muro_ver from public.privacidad_social where usuario_id = p_dueno), 'PUBLICO');
  if modo = 'PUBLICO' then return true; end if;
  return p_yo is not null and private.son_amigos(p_yo, p_dueno);
end $$;
revoke all on function private.puede_ver_muro(uuid, uuid) from public, anon, authenticated;

-- ─── 5) Búsqueda de personas y sugerencias: los menores no aparecen ante quien no debe encontrarlos ─────────────
-- (copias EXACTAS de la 034 con una sola condición añadida: «and not private.oculto_por_edad(yo, p.id)»)
create or replace function public.buscar_personas(p_q text, p_limite integer default 20) returns jsonb
language plpgsql stable security definer set search_path = '' as $$
declare yo uuid := private.uid_requerido(); q text := regexp_replace(lower(trim(coalesce(p_q, ''))), '^@', ''); n integer := least(greatest(coalesce(p_limite, 20), 1), 30); esc text; res jsonb;
begin
  if char_length(q) < 2 then raise exception 'Escribe al menos 2 letras.'; end if;
  if char_length(q) > 40 then raise exception 'La búsqueda es demasiado larga (máx. 40 caracteres).'; end if;
  esc := replace(replace(replace(q, '\', '\\'), '%', '\%'), '_', '\_');            -- los comodines que escriba la persona se toman literalmente
  select coalesce(jsonb_agg(x.fila order by x.o1 desc, x.o2 desc, x.o3 desc, x.nombre, x.username), '[]'::jsonb) into res from (
    select jsonb_build_object('id', p.id, 'username', p.username, 'nombre_display', p.nombre_display, 'avatar_url', p.avatar_url, 'rol', p.rol,
             'club_favorito', p.club_favorito, 'pais_codigo', p.pais_codigo) as fila,
           (lower(p.username) = q) as o1, (p.username ilike esc || '%') as o2, (p.nombre_display ilike esc || '%') as o3, p.nombre_display as nombre, p.username
    from public.perfiles p
    where p.id <> yo and (p.username ilike '%' || esc || '%' or p.nombre_display ilike '%' || esc || '%') and not private.hay_bloqueo(yo, p.id) and not private.oculto_por_edad(yo, p.id)
    order by (lower(p.username) = q) desc, (p.username ilike esc || '%') desc, (p.nombre_display ilike esc || '%') desc, p.nombre_display, p.username
    limit n) x;
  return res;
end $$;

create or replace function public.sugerencias_seguir(p_limite integer default 10) returns jsonb
language plpgsql stable security definer set search_path = '' as $$
declare yo uuid := private.uid_requerido(); n integer := least(greatest(coalesce(p_limite, 10), 1), 20); mi_club text; mi_pais text; res jsonb;
begin
  select club_favorito, pais_codigo into mi_club, mi_pais from public.perfiles where id = yo;
  with
  amigos as (select case when a.usuario_a = yo then a.usuario_b else a.usuario_a end as id from public.amistades a where a.estado = 'ACEPTADA' and yo in (a.usuario_a, a.usuario_b)),
  sigo as (select seguido_id as id from public.seguidores where seguidor_id = yo),
  excl as (
    select yo as id
    union select id from amigos
    union select id from sigo
    union select case when a.usuario_a = yo then a.usuario_b else a.usuario_a end from public.amistades a where a.estado = 'PENDIENTE' and yo in (a.usuario_a, a.usuario_b)
    union select bloqueado_id from public.bloqueos where bloqueador_id = yo
    union select bloqueador_id from public.bloqueos where bloqueado_id = yo
    union select descartado_id from public.sugerencias_descartadas where usuario_id = yo),
  comunes as (
    select case when a.usuario_a = f.id then a.usuario_b else a.usuario_a end as id, count(*) as c
    from amigos f join public.amistades a on a.estado = 'ACEPTADA' and f.id in (a.usuario_a, a.usuario_b)
    where coalesce((select ps.ver_amigos from public.privacidad_social ps where ps.usuario_id = f.id), 'amigos') <> 'nadie'
    group by 1),
  de_seguidos as (select s.seguido_id as id, count(*) as c from public.seguidores s where s.seguidor_id in (select id from sigo) group by 1),
  activos as (select autor_id as id, max(created_at) as ultimo, count(*) as posts from public.muro_publicaciones where created_at > now() - interval '30 days' and not oculto group by 1),
  pool as (
    select id from comunes
    union select id from de_seguidos
    union (select id from activos order by ultimo desc limit 100)
    union (select id from public.perfiles where (mi_club is not null and club_favorito = mi_club) or (mi_pais is not null and pais_codigo = mi_pais) limit 150)),
  puntuados as (
    select p.id, p.username, p.nombre_display, p.avatar_url, p.club_favorito, coalesce(c.c, 0) as n_amigos, coalesce(d.c, 0) as n_seg,
           (mi_club is not null and p.club_favorito = mi_club) as mismo_club, (mi_pais is not null and p.pais_codigo = mi_pais) as mismo_pais, a.ultimo, coalesce(a.posts, 0) as posts
    from pool join public.perfiles p on p.id = pool.id
    left join comunes c on c.id = p.id left join de_seguidos d on d.id = p.id left join activos a on a.id = p.id
    where p.id not in (select id from excl) and not private.oculto_por_edad(yo, p.id)),
  ordenados as (
    select *, (3 * n_amigos + 2 * n_seg + (case when mismo_club then 1 else 0 end) + (case when mismo_pais then 1 else 0 end) + least(posts, 3)) as puntaje
    from puntuados order by puntaje desc, ultimo desc nulls last, id limit n)
  select coalesce(jsonb_agg(jsonb_build_object('id', id, 'username', username, 'nombre_display', nombre_display, 'avatar_url', avatar_url,
      'motivo', case when n_amigos > 0 then n_amigos || ' amigo' || (case when n_amigos > 1 then 's' else '' end) || ' en común'
                     when n_seg > 0 then 'Lo siguen ' || n_seg || ' persona' || (case when n_seg > 1 then 's' else '' end) || ' que sigues'
                     when mismo_club then 'Mismo club favorito'
                     when mismo_pais then 'Del mismo país'
                     when posts > 0 then 'Activo en la comunidad'
                     else 'Nuevo en la comunidad' end) order by puntaje desc, ultimo desc nulls last, id), '[]'::jsonb)
    into res from ordenados;
  return res;
end $$;

-- Los permisos de estas dos funciones NO cambian (create or replace conserva los existentes).

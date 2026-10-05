-- 041 · OLA B (4/5) · FEED «SIGUIENDO» Y «DESTACADO». Depende de 034 (private.item_publicacion), 038 (puede_ver_muro con edad) y las tablas del muro.
-- Solo LEE (no crea tablas). Mismo formato de ítem que muro_comunidad → la web reutiliza la tarjeta compartida.
--  · SIGUIENDO: publicaciones de las personas que sigues y de tus amistades aceptadas, de la más nueva a la más antigua (paginación por id).
--  · DESTACADO: lo que más se mueve AHORA. Puntaje = (reacciones + 2 × respuestas) de OTRAS personas, repartido por (horas de antigüedad + 2)^1.5:
--      · lo nuevo con interacción sube; lo viejo cae solo (decaimiento) · tus propias reacciones/respuestas no cuentan (no puedes autoimpulsarte)
--      · cuenta PERSONAS distintas, no clics repetidos · máx. 2 publicaciones por autor (nadie monopoliza) · exige ≥1 interacción de otra persona
--      · ventana 1 a 168 horas (por defecto 72). Paginación por desplazamiento, tope 100 (el orden por puntaje cambia con el tiempo: no hay cursor estable).
-- Respeta SIEMPRE: oculto por moderación, bloqueos, muros privados y la separación de menores (todo vía puede_ver_muro).

create or replace function public.muro_siguiendo(p_antes bigint default null, p_limite integer default 20) returns jsonb
language plpgsql stable security definer set search_path = '' as $$
declare yo uuid := private.uid_requerido(); n integer := least(greatest(coalesce(p_limite, 20), 1), 40); filas jsonb; mas boolean;
begin
  with autores as (
    select s.seguido_id as id from public.seguidores s where s.seguidor_id = yo
    union select case when a.usuario_a = yo then a.usuario_b else a.usuario_a end from public.amistades a where a.estado = 'ACEPTADA' and yo in (a.usuario_a, a.usuario_b)),
  s as (
    select m.id, row_number() over (order by m.id desc) as rn
    from public.muro_publicaciones m
    where m.autor_id in (select id from autores) and m.autor_id <> yo and not m.oculto and (p_antes is null or m.id < p_antes) and private.puede_ver_muro(m.autor_id, yo)
    order by m.id desc limit n + 1)
  select coalesce(jsonb_agg(private.item_publicacion(s.id, yo) order by s.rn) filter (where s.rn <= n), '[]'::jsonb), count(*) > n into filas, mas from s;
  return jsonb_build_object('hay_mas', mas, 'items', filas);
end $$;

create or replace function public.muro_destacado(p_horas integer default 72, p_desplazamiento integer default 0, p_limite integer default 20) returns jsonb
language plpgsql stable security definer set search_path = '' as $$
declare yo uuid := (select auth.uid()); n integer := least(greatest(coalesce(p_limite, 20), 1), 40); h integer := least(greatest(coalesce(p_horas, 72), 1), 168);
        d integer := least(greatest(coalesce(p_desplazamiento, 0), 0), 100); filas jsonb; mas boolean;
begin
  with c as (
    select m.id, m.autor_id, m.created_at,
      ((select count(distinct x.usuario_id) from public.muro_reacciones x where x.publicacion_id = m.id and x.usuario_id <> m.autor_id)
       + 2 * (select count(distinct r.autor_id) from public.muro_respuestas r where r.publicacion_id = m.id and r.autor_id <> m.autor_id and not r.oculto))::numeric as inter
    from public.muro_publicaciones m
    where not m.oculto and m.created_at > now() - make_interval(hours => h) and private.puede_ver_muro(m.autor_id, yo)),
  p as (
    select c.id, c.autor_id, c.inter / power(extract(epoch from (now() - c.created_at)) / 3600.0 + 2, 1.5) as puntaje from c where c.inter > 0),
  r as (
    select p.*, row_number() over (partition by p.autor_id order by p.puntaje desc, p.id desc) as rk from p),
  s as (
    select r.id, r.puntaje from r where r.rk <= 2 order by r.puntaje desc, r.id desc limit n + 1 offset d),
  t as (
    select s.id, row_number() over (order by s.puntaje desc, s.id desc) as rn from s)
  select coalesce(jsonb_agg(private.item_publicacion(t.id, yo) order by t.rn) filter (where t.rn <= n), '[]'::jsonb), count(*) > n into filas, mas from t;
  return jsonb_build_object('hay_mas', mas and d + n < 100, 'items', filas);
end $$;

revoke all on function public.muro_siguiendo(bigint, integer) from public, anon;
grant execute on function public.muro_siguiendo(bigint, integer) to authenticated;
revoke all on function public.muro_destacado(integer, integer, integer) from public;
grant execute on function public.muro_destacado(integer, integer, integer) to anon, authenticated;

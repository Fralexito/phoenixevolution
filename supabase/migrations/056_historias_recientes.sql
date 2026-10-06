-- 056 · HISTORIAS RECIENTES para la fila de historias de /social/ (solo lectura; no cambia tablas).
-- Devuelve los autores que tienen historias VIGENTES (24 h) que quien mira puede ver, el más reciente primero.
-- Reglas (las mismas que historias_de): private.puede_ver_muro (privacidad, bloqueos y separación por edad de menores) y se saltan las historias ocultas por moderación.
-- Forma: { items: [ { autor: {id, username, nombre_display, avatar_url}, ultima: id de su historia más nueva, historias: [ {id, texto, imagen_url, video_url, created_at, expira_at, destacada_id} ] } ] }
create or replace function public.historias_recientes(p_limite integer default 24) returns jsonb
language plpgsql stable security definer set search_path = '' as $$
declare yo uuid := (select auth.uid()); n integer := least(greatest(coalesce(p_limite, 24), 1), 40); filas jsonb;
begin
  with cand as (
    select h.autor_id, max(h.id) as ultima
    from public.muro_historias h
    where h.expira_at > now() and not coalesce(h.oculto, false)
    group by h.autor_id
    order by max(h.id) desc
    limit 80),
  vis as (
    select c.autor_id, c.ultima from cand c where private.puede_ver_muro(c.autor_id, yo) order by c.ultima desc limit n)
  select coalesce(jsonb_agg(jsonb_build_object(
      'autor', jsonb_build_object('id', pf.id, 'username', pf.username, 'nombre_display', pf.nombre_display, 'avatar_url', pf.avatar_url),
      'ultima', v.ultima,
      'historias', (select coalesce(jsonb_agg(jsonb_build_object('id', h.id, 'texto', h.texto, 'imagen_url', h.imagen_url, 'video_url', h.video_url,
                        'created_at', h.created_at, 'expira_at', h.expira_at, 'destacada_id', h.destacada_id) order by h.id), '[]'::jsonb)
                    from public.muro_historias h where h.autor_id = v.autor_id and h.expira_at > now() and not coalesce(h.oculto, false))
    ) order by v.ultima desc), '[]'::jsonb)
  into filas from vis v join public.perfiles pf on pf.id = v.autor_id;
  return jsonb_build_object('items', filas);
end $$;

revoke all on function public.historias_recientes(integer) from public, anon, authenticated;
grant execute on function public.historias_recientes(integer) to anon, authenticated;
